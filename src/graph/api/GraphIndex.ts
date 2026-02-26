/**
 * GraphIndex - Index API for the knowledge graph
 *
 * Provides methods to list and search nodes:
 * - List all nodes of a specific type
 * - Full-text search across all nodes
 * - Search by specific fields
 * - Get graph statistics
 *
 * @example
 * ```typescript
 * const index = new GraphIndex(registry)
 *
 * // List all species
 * const species = index.listSpecies()
 *
 * // Search for nodes containing 'ginseng'
 * const results = index.search('ginseng')
 *
 * // Get statistics
 * const stats = index.getStats()
 * ```
 */

import lunr from 'lunr'
import type {
  GraphNode,
  GraphStats,
  MedicalSystemValue,
} from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'

/**
 * Search result with relevance score
 */
export interface SearchResult {
  node: GraphNode
  score: number
  matchCount: number
}

/**
 * Index API for listing and searching nodes in the knowledge graph
 */
export class GraphIndex {
  private registry: GraphRegistry
  private searchIndex: lunr.Index | null = null
  private nodeMap: Map<string, GraphNode> = new Map()

  constructor(registry: GraphRegistry) {
    this.registry = registry
  }

  // ===========================================================================
  // List Operations
  // ===========================================================================

  /**
   * List all species nodes
   */
  listSpecies(): GraphNode[] {
    return this.registry.species.getAllAsGraphNodes()
  }

  /**
   * List all part nodes
   */
  listParts(): GraphNode[] {
    return this.registry.parts.getAllAsGraphNodes()
  }

  /**
   * List all chemical nodes
   */
  listChemicals(): GraphNode[] {
    return this.registry.chemicals.getAllAsGraphNodes()
  }

  /**
   * List all preparation nodes
   */
  listPreparations(): GraphNode[] {
    return this.registry.preparations.getAllAsGraphNodes()
  }

  /**
   * List all formula nodes
   */
  listFormulas(): GraphNode[] {
    return this.registry.formulas.getAllAsGraphNodes()
  }

  /**
   * List all source nodes
   */
  listSources(): GraphNode[] {
    return this.registry.sources.getAllAsGraphNodes()
  }

  /**
   * List all image nodes
   */
  listImages(): GraphNode[] {
    return this.registry.images.getAllAsGraphNodes()
  }

  /**
   * List profile nodes, optionally filtered by system
   */
  listProfiles(system?: MedicalSystemValue): GraphNode[] {
    if (system) {
      const registry = this.getProfileRegistry(system)
      return registry ? registry.getAllAsGraphNodes() : []
    }

    // Return all profiles from all systems
    const allProfiles: GraphNode[] = []
    for (const reg of Object.values(this.registry.profiles)) {
      allProfiles.push(...reg.getAllAsGraphNodes())
    }
    return allProfiles
  }

  /**
   * List vocabulary nodes for a specific system and type
   */
  listVocabulary(system: MedicalSystemValue, type?: string): GraphNode[] {
    if (system === 'tcm') {
      if (type) {
        const registry = this.getTcmVocabularyRegistry(type)
        return registry ? registry.getAllAsGraphNodes() : []
      }
      // Return all TCM vocabulary
      const allVocab: GraphNode[] = []
      for (const reg of Object.values(this.registry.vocabulary.tcm)) {
        allVocab.push(...reg.getAllAsGraphNodes())
      }
      return allVocab
    }

    if (system === 'ayurveda') {
      if (type) {
        const registry = this.getAyurvedaVocabularyRegistry(type)
        return registry ? registry.getAllAsGraphNodes() : []
      }
      // Return all Ayurveda vocabulary
      const allVocab: GraphNode[] = []
      for (const reg of Object.values(this.registry.vocabulary.ayurveda)) {
        allVocab.push(...reg.getAllAsGraphNodes())
      }
      return allVocab
    }

    return []
  }

  /**
   * List all nodes in the graph
   */
  listAll(): GraphNode[] {
    return this.registry.getAllNodes()
  }

  // ===========================================================================
  // Search Operations
  // ===========================================================================

  /**
   * Build or rebuild the search index
   * Call this after the graph is fully loaded
   */
  buildSearchIndex(): void {
    this.nodeMap.clear()

    // Build document corpus
    const documents: Array<{ id: string; content: string; fields: Record<string, string> }> = []

    const allNodes = this.registry.getAllNodes()
    for (const node of allNodes) {
      const iri = node['@id']
      this.nodeMap.set(iri, node)

      // Extract searchable content
      const fields = this.extractSearchableFields(node)
      const content = Object.values(fields).join(' ')

      documents.push({
        id: iri,
        content,
        fields,
      })
    }

    // Build lunr index
    this.searchIndex = lunr(function() {
      this.ref('id')
      this.field('content')

      // Add fields for specific searches
      this.field('name')
      this.field('scientificName')
      this.field('pinyin')
      this.field('slug')

      for (const doc of documents) {
        this.add({
          id: doc.id,
          content: doc.content,
          name: doc.fields.name || '',
          scientificName: doc.fields.scientificName || '',
          pinyin: doc.fields.pinyin || '',
          slug: doc.fields.slug || '',
        })
      }
    })
  }

  /**
   * Full-text search across all nodes
   */
  search(query: string, limit = 50): SearchResult[] {
    if (!this.searchIndex) {
      this.buildSearchIndex()
    }

    try {
      const results = this.searchIndex!.search(query)

      return results.slice(0, limit).map(result => ({
        node: this.nodeMap.get(result.ref)!,
        score: result.score,
        matchCount: Object.keys(result.matchData.metadata).length,
      }))
    } catch {
      // If search fails, fall back to simple string matching
      return this.fallbackSearch(query, limit)
    }
  }

  /**
   * Search by a specific field
   */
  searchByField(field: string, value: string): GraphNode[] {
    const results: GraphNode[] = []
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const nodeData = node as unknown as Record<string, unknown>
      const fieldValue = nodeData[field]

      if (fieldValue !== undefined && fieldValue !== null) {
        if (typeof fieldValue === 'string') {
          if (fieldValue.toLowerCase().includes(value.toLowerCase())) {
            results.push(node)
          }
        } else if (typeof fieldValue === 'object') {
          // Handle language maps
          const langMap = fieldValue as Record<string, string>
          for (const langValue of Object.values(langMap)) {
            if (langValue.toLowerCase().includes(value.toLowerCase())) {
              results.push(node)
              break
            }
          }
        }
      }
    }

    return results
  }

  /**
   * Search by multiple criteria
   */
  searchByCriteria(criteria: Record<string, string | string[]>): GraphNode[] {
    let results = this.registry.getAllNodes()

    for (const [field, value] of Object.entries(criteria)) {
      const values = Array.isArray(value) ? value : [value]

      results = results.filter(node => {
        const nodeData = node as unknown as Record<string, unknown>
        const fieldValue = nodeData[field]

        if (fieldValue === undefined || fieldValue === null) {
          return false
        }

        if (typeof fieldValue === 'string') {
          return values.some(v =>
            fieldValue.toLowerCase().includes(v.toLowerCase())
          )
        }

        if (typeof fieldValue === 'object') {
          // Handle language maps
          const langMap = fieldValue as Record<string, string>
          return Object.values(langMap).some(lv =>
            values.some(v => lv.toLowerCase().includes(v.toLowerCase()))
          )
        }

        return false
      })
    }

    return results
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    return this.registry.getStats()
  }

  /**
   * Get count of nodes by type
   */
  getCountByType(): Record<string, number> {
    return this.registry.getStats().byType
  }

  /**
   * Get total node count
   */
  getTotalCount(): number {
    return this.registry.getStats().totalNodes
  }

  // ===========================================================================
  // Index File Generation
  // ===========================================================================

  /**
   * Generate index data for a node type
   */
  generateIndex(nodeType: string): {
    '@context': string
    '@type': string
    totalItems: number
    member: Array<{ '@id': string }>
  } {
    const nodes = this.getNodesForType(nodeType)

    return {
      '@context': 'https://www.w3.org/ns/hydra/context.jsonld',
      '@type': 'Collection',
      totalItems: nodes.length,
      member: nodes.map(node => ({ '@id': node['@id'] })),
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get nodes for a specific type
   */
  private getNodesForType(nodeType: string): GraphNode[] {
    switch (nodeType) {
      case 'species':
        return this.listSpecies()
      case 'part':
        return this.listParts()
      case 'chemical':
        return this.listChemicals()
      case 'preparation':
        return this.listPreparations()
      case 'formula':
        return this.listFormulas()
      case 'source':
        return this.listSources()
      case 'image':
        return this.listImages()
      case 'tcm-profile':
      case 'ayurveda-profile':
      case 'western-profile':
        return this.listProfiles(nodeType.replace('-profile', '') as MedicalSystemValue)
      default:
        return []
    }
  }

  /**
   * Extract searchable fields from a node
   */
  private extractSearchableFields(node: GraphNode): Record<string, string> {
    const fields: Record<string, string> = {}
    const nodeData = node as unknown as Record<string, unknown>

    // Always include slug and @id
    if (typeof nodeData.slug === 'string') {
      fields.slug = nodeData.slug
    }

    // Extract text from language maps
    const extractFromLangMap = (value: unknown): string => {
      if (typeof value === 'object' && value !== null) {
        const langMap = value as Record<string, string>
        return Object.values(langMap).join(' ')
      }
      if (typeof value === 'string') {
        return value
      }
      return ''
    }

    // Common fields to search
    const searchableFields = [
      'name',
      'scientificName',
      'pinyin',
      'sanskritName',
      'description',
      'tcmFunctions',
      'tcmTraditionalUsage',
      'ayurvedaTraditionalUsage',
      'westernTraditionalUsage',
      'prefLabel',
      'value',
      'family',
      'genus',
    ]

    for (const field of searchableFields) {
      const value = nodeData[field]
      if (value !== undefined && value !== null) {
        fields[field] = extractFromLangMap(value)
      }
    }

    return fields
  }

  /**
   * Fallback search when lunr fails
   */
  private fallbackSearch(query: string, limit: number): SearchResult[] {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const fields = this.extractSearchableFields(node)
      const content = Object.values(fields).join(' ').toLowerCase()

      if (content.includes(lowerQuery)) {
        const matchCount = (content.match(new RegExp(lowerQuery, 'g')) || []).length
        results.push({
          node,
          score: matchCount,
          matchCount,
        })
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }

  /**
   * Get profile registry for a system
   */
  private getProfileRegistry(system: MedicalSystemValue) {
    switch (system) {
      case 'tcm':
        return this.registry.profiles.tcm
      case 'ayurveda':
        return this.registry.profiles.ayurveda
      case 'western':
        return this.registry.profiles.western
      case 'unani':
        return this.registry.profiles.unani
      case 'mongolian':
        return this.registry.profiles.mongolian
      case 'modern':
        return this.registry.profiles.modern
      default:
        return undefined
    }
  }

  /**
   * Get TCM vocabulary registry by type
   */
  private getTcmVocabularyRegistry(type: string) {
    switch (type) {
      case 'flavor':
        return this.registry.vocabulary.tcm.flavors
      case 'nature':
        return this.registry.vocabulary.tcm.natures
      case 'meridian':
        return this.registry.vocabulary.tcm.meridians
      case 'category':
        return this.registry.vocabulary.tcm.categories
      default:
        return undefined
    }
  }

  /**
   * Get Ayurveda vocabulary registry by type
   */
  private getAyurvedaVocabularyRegistry(type: string) {
    switch (type) {
      case 'dosha':
        return this.registry.vocabulary.ayurveda.doshas
      case 'rasa':
        return this.registry.vocabulary.ayurveda.rasas
      case 'guna':
        return this.registry.vocabulary.ayurveda.gunas
      case 'virya':
        return this.registry.vocabulary.ayurveda.viryas
      case 'vipaka':
        return this.registry.vocabulary.ayurveda.vipakas
      default:
        return undefined
    }
  }
}

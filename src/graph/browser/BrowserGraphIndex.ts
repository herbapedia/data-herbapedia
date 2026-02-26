/**
 * BrowserGraphIndex - Browser-compatible search API for the knowledge graph
 *
 * Provides the same API as GraphIndex but works with BrowserGraphRegistry
 * and pre-built search index.
 *
 * @example
 * ```typescript
 * import { BrowserGraphRegistry, BrowserGraphIndex } from '@herbapedia/data/graph-browser'
 *
 * const registry = new BrowserGraphRegistry()
 * await registry.loadFromUrl('/api/v1/browser/registry.json')
 *
 * const index = new BrowserGraphIndex(registry)
 * await index.loadIndexFromUrl('/api/v1/browser/search-index.json')
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
import type { BrowserGraphRegistry, BrowserSearchIndexData } from './BrowserGraphRegistry.js'
import { extractSearchableFields } from '../utils/search.js'

/**
 * Search result with relevance score
 */
export interface SearchResult {
  node: GraphNode
  score: number
  matchCount: number
}

/**
 * Browser-compatible Index API
 */
export class BrowserGraphIndex {
  private registry: BrowserGraphRegistry
  private searchIndex: lunr.Index | null = null

  constructor(registry: BrowserGraphRegistry) {
    this.registry = registry
  }

  /**
   * Load search index from a URL
   */
  async loadIndexFromUrl(url: string): Promise<void> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load search index from ${url}: ${response.statusText}`)
    }
    const data = await response.json() as BrowserSearchIndexData
    this.loadIndex(data)
  }

  /**
   * Load search index directly
   */
  loadIndex(data: BrowserSearchIndexData): void {
    // Deserialize lunr index
    this.searchIndex = lunr.Index.load(JSON.parse(data.index))
  }

  /**
   * Build search index from registry (fallback if index file not available)
   */
  buildSearchIndex(): void {
    const allNodes = this.registry.getAllNodes()

    this.searchIndex = lunr(function() {
      this.ref('id')
      this.field('content')
      this.field('name')
      this.field('scientificName')
      this.field('pinyin')
      this.field('sanskritName')
      this.field('slug')
      this.field('family')
      this.field('genus')

      for (const node of allNodes) {
        const iri = node['@id']
        const fields = extractSearchableFields(node)

        this.add({
          id: iri,
          content: Object.values(fields).join(' '),
          name: fields.name || '',
          scientificName: fields.scientificName || '',
          pinyin: fields.pinyin || '',
          sanskritName: fields.sanskritName || '',
          slug: fields.slug || '',
          family: fields.family || '',
          genus: fields.genus || '',
        })
      }
    })
  }

  // ===========================================================================
  // List Operations
  // ===========================================================================

  /**
   * List all species nodes
   */
  listSpecies(): GraphNode[] {
    return this.registry.getNodesByType('herbapedia:Species')
  }

  /**
   * List all part nodes
   */
  listParts(): GraphNode[] {
    return this.registry.getNodesByType('herbapedia:Part')
  }

  /**
   * List all chemical nodes
   */
  listChemicals(): GraphNode[] {
    return this.registry.getNodesByType('herbapedia:Chemical')
  }

  /**
   * List all preparation nodes
   */
  listPreparations(): GraphNode[] {
    return this.registry.getNodesByType('herbapedia:HerbalPreparation')
  }

  /**
   * List all formula nodes
   */
  listFormulas(): GraphNode[] {
    return this.registry.getNodesByType('herbapedia:Formula')
  }

  /**
   * List all source nodes
   */
  listSources(): GraphNode[] {
    return this.registry.getNodesByType('schema:Organization')
  }

  /**
   * List all image nodes
   */
  listImages(): GraphNode[] {
    return this.registry.getNodesByType('schema:ImageObject')
  }

  /**
   * List profile nodes, optionally filtered by system
   */
  listProfiles(system?: MedicalSystemValue): GraphNode[] {
    if (system) {
      const typeMap: Record<string, string> = {
        tcm: 'tcm:Herb',
        ayurveda: 'ayurveda:Dravya',
        western: 'western:Herb',
        unani: 'unani:Drug',
        mongolian: 'mongolian:Drug',
        modern: 'modern:Substance',
      }
      const type = typeMap[system]
      return type ? this.registry.getNodesByType(type) : []
    }

    // Return all profiles from all systems
    const allProfiles: GraphNode[] = []
    const profileTypes = [
      'tcm:Herb',
      'ayurveda:Dravya',
      'western:Herb',
      'unani:Drug',
      'mongolian:Drug',
      'modern:Substance',
    ]
    for (const type of profileTypes) {
      allProfiles.push(...this.registry.getNodesByType(type))
    }
    return allProfiles
  }

  /**
   * List vocabulary nodes for a specific system and type
   */
  listVocabulary(system: MedicalSystemValue, type?: string): GraphNode[] {
    const typeMap: Record<string, string> = {
      'tcm-flavor': 'tcm:Flavor',
      'tcm-nature': 'tcm:Nature',
      'tcm-meridian': 'tcm:Meridian',
      'tcm-category': 'tcm:Category',
      'ayurveda-dosha': 'ayurveda:Dosha',
      'ayurveda-rasa': 'ayurveda:Rasa',
      'ayurveda-guna': 'ayurveda:Guna',
      'ayurveda-virya': 'ayurveda:Virya',
      'ayurveda-vipaka': 'ayurveda:Vipaka',
    }

    if (system === 'tcm') {
      if (type) {
        const key = `tcm-${type}`
        const rdfType = typeMap[key]
        return rdfType ? this.registry.getNodesByType(rdfType) : []
      }
      // Return all TCM vocabulary
      const allVocab: GraphNode[] = []
      for (const [key, rdfType] of Object.entries(typeMap)) {
        if (key.startsWith('tcm-')) {
          allVocab.push(...this.registry.getNodesByType(rdfType))
        }
      }
      return allVocab
    }

    if (system === 'ayurveda') {
      if (type) {
        const key = `ayurveda-${type}`
        const rdfType = typeMap[key]
        return rdfType ? this.registry.getNodesByType(rdfType) : []
      }
      // Return all Ayurveda vocabulary
      const allVocab: GraphNode[] = []
      for (const [key, rdfType] of Object.entries(typeMap)) {
        if (key.startsWith('ayurveda-')) {
          allVocab.push(...this.registry.getNodesByType(rdfType))
        }
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
   * Full-text search across all nodes
   */
  search(query: string, limit = 50): SearchResult[] {
    if (!this.searchIndex) {
      this.buildSearchIndex()
    }

    try {
      const results = this.searchIndex!.search(query)

      return results.slice(0, limit).map(result => {
        const node = this.registry.getNode(result.ref)
        return {
          node: node!,
          score: result.score,
          matchCount: Object.keys(result.matchData.metadata).length,
        }
      }).filter(r => r.node !== undefined)
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
  // Helper Methods
  // ===========================================================================

  /**
   * Fallback search when lunr fails
   */
  private fallbackSearch(query: string, limit: number): SearchResult[] {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const fields = extractSearchableFields(node)
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
}

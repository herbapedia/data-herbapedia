/**
 * GraphRegistry - Central registry for all knowledge graph nodes
 *
 * Responsibilities:
 * 1. Store and manage all nodes by type
 * 2. Deduplicate nodes by their canonical @id
 * 3. Resolve references between nodes
 * 4. Provide query access to the graph
 */

import type {
  GraphNode,
  GraphStats,
  IRIReference,
  NodeTypeValue,
} from '../types.js'
import { NodeType, parseIRI } from '../types.js'

/**
 * Registry for a single node type
 * Accepts any object with @id property
 */
class NodeTypeRegistry<T extends { '@id': string }> {
  private nodes: Map<string, T> = new Map()
  private bySlug: Map<string, string> = new Map()

  /**
   * Add a node to the registry
   * Returns true if added, false if duplicate
   */
  add(node: T): boolean {
    const iri = node['@id']
    const parsed = parseIRI(iri)
    const slug = parsed.identifier

    // Check for duplicate
    if (this.nodes.has(iri)) {
      return false
    }

    this.nodes.set(iri, node)
    if (slug) {
      this.bySlug.set(slug, iri)
    }
    return true
  }

  /**
   * Get a node by its IRI
   */
  getByIRI(iri: string): T | undefined {
    return this.nodes.get(iri)
  }

  /**
   * Get a node by its slug
   */
  getBySlug(slug: string): T | undefined {
    const iri = this.bySlug.get(slug)
    return iri ? this.nodes.get(iri) : undefined
  }

  /**
   * Check if a node exists
   */
  has(iri: string): boolean {
    return this.nodes.has(iri)
  }

  /**
   * Get all nodes
   */
  getAll(): T[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get all nodes as GraphNode[]
   */
  getAllAsGraphNodes(): GraphNode[] {
    return this.getAll().map(node => {
      // If node has toJSON method, use it
      const nodeWithToJSON = node as unknown as { toJSON?: () => GraphNode }
      if (typeof nodeWithToJSON.toJSON === 'function') {
        return nodeWithToJSON.toJSON()
      }
      return node as unknown as GraphNode
    })
  }

  /**
   * Get all IRIs
   */
  getAllIRIs(): string[] {
    return Array.from(this.nodes.keys())
  }

  /**
   * Get count
   */
  get count(): number {
    return this.nodes.size
  }

  /**
   * Clear the registry
   */
  clear(): void {
    this.nodes.clear()
    this.bySlug.clear()
  }
}

/**
 * Reference resolver for tracking and resolving node references
 */
class ReferenceResolver {
  // Forward references: node -> nodes it references
  private forwardRefs: Map<string, Set<string>> = new Map()
  // Backward references: node -> nodes that reference it
  private backwardRefs: Map<string, Set<string>> = new Map()
  // Unresolved references
  private unresolvedRefs: Set<string> = new Set()

  /**
   * Register a reference from one node to another
   */
  addReference(fromIRI: string, toIRI: string, exists: boolean): void {
    // Forward reference
    if (!this.forwardRefs.has(fromIRI)) {
      this.forwardRefs.set(fromIRI, new Set())
    }
    this.forwardRefs.get(fromIRI)!.add(toIRI)

    // Backward reference
    if (!this.backwardRefs.has(toIRI)) {
      this.backwardRefs.set(toIRI, new Set())
    }
    this.backwardRefs.get(toIRI)!.add(fromIRI)

    // Track if unresolved
    if (!exists) {
      this.unresolvedRefs.add(toIRI)
    }
  }

  /**
   * Mark a reference as resolved
   */
  markResolved(iri: string): void {
    this.unresolvedRefs.delete(iri)
  }

  /**
   * Get all nodes that reference a given node
   */
  getIncomingReferences(iri: string): string[] {
    const refs = this.backwardRefs.get(iri)
    return refs ? Array.from(refs) : []
  }

  /**
   * Get all nodes that a given node references
   */
  getOutgoingReferences(iri: string): string[] {
    const refs = this.forwardRefs.get(iri)
    return refs ? Array.from(refs) : []
  }

  /**
   * Get all unresolved references
   */
  getUnresolvedReferences(): string[] {
    return Array.from(this.unresolvedRefs)
  }

  /**
   * Check if there are any unresolved references
   */
  hasUnresolvedReferences(): boolean {
    return this.unresolvedRefs.size > 0
  }

  /**
   * Clear all references
   */
  clear(): void {
    this.forwardRefs.clear()
    this.backwardRefs.clear()
    this.unresolvedRefs.clear()
  }
}

/**
 * Main GraphRegistry class
 */
export class GraphRegistry {
  // Node registries by type
  readonly species = new NodeTypeRegistry<{ '@id': string }>()
  readonly parts = new NodeTypeRegistry<{ '@id': string }>()
  readonly chemicals = new NodeTypeRegistry<{ '@id': string }>()
  readonly preparations = new NodeTypeRegistry<{ '@id': string }>()
  readonly formulas = new NodeTypeRegistry<{ '@id': string }>()

  // Profile registries by system
  readonly profiles = {
    tcm: new NodeTypeRegistry<{ '@id': string }>(),
    ayurveda: new NodeTypeRegistry<{ '@id': string }>(),
    western: new NodeTypeRegistry<{ '@id': string }>(),
    unani: new NodeTypeRegistry<{ '@id': string }>(),
    mongolian: new NodeTypeRegistry<{ '@id': string }>(),
    modern: new NodeTypeRegistry<{ '@id': string }>(),
  }

  // Vocabulary registries
  readonly vocabulary = {
    tcm: {
      flavors: new NodeTypeRegistry<{ '@id': string }>(),
      natures: new NodeTypeRegistry<{ '@id': string }>(),
      meridians: new NodeTypeRegistry<{ '@id': string }>(),
      categories: new NodeTypeRegistry<{ '@id': string }>(),
    },
    ayurveda: {
      doshas: new NodeTypeRegistry<{ '@id': string }>(),
      rasas: new NodeTypeRegistry<{ '@id': string }>(),
      gunas: new NodeTypeRegistry<{ '@id': string }>(),
      viryas: new NodeTypeRegistry<{ '@id': string }>(),
      vipakas: new NodeTypeRegistry<{ '@id': string }>(),
    },
  }

  // Other registries
  readonly sources = new NodeTypeRegistry<{ '@id': string }>()
  readonly images = new NodeTypeRegistry<{ '@id': string }>()

  // Reference resolver
  readonly resolver = new ReferenceResolver()

  // All IRIs index for fast lookup
  private allIRIs: Map<string, NodeTypeValue> = new Map()

  /**
   * Register a node in the appropriate registry
   */
  registerNode(node: GraphNode, nodeType: NodeTypeValue): boolean {
    const iri = node['@id']

    // Track in all IRIs index
    this.allIRIs.set(iri, nodeType)

    // Register in appropriate registry
    switch (nodeType) {
      case NodeType.SPECIES:
        return this.species.add(node)
      case NodeType.PART:
        return this.parts.add(node)
      case NodeType.CHEMICAL:
        return this.chemicals.add(node)
      case NodeType.PREPARATION:
        return this.preparations.add(node)
      case NodeType.FORMULA:
        return this.formulas.add(node)
      case NodeType.TCM_PROFILE:
        return this.profiles.tcm.add(node)
      case NodeType.AYURVEDA_PROFILE:
        return this.profiles.ayurveda.add(node)
      case NodeType.WESTERN_PROFILE:
        return this.profiles.western.add(node)
      case NodeType.UNANI_PROFILE:
        return this.profiles.unani.add(node)
      case NodeType.MONGOLIAN_PROFILE:
        return this.profiles.mongolian.add(node)
      case NodeType.MODERN_PROFILE:
        return this.profiles.modern.add(node)
      case NodeType.TCM_FLAVOR:
        return this.vocabulary.tcm.flavors.add(node)
      case NodeType.TCM_NATURE:
        return this.vocabulary.tcm.natures.add(node)
      case NodeType.TCM_MERIDIAN:
        return this.vocabulary.tcm.meridians.add(node)
      case NodeType.TCM_CATEGORY:
        return this.vocabulary.tcm.categories.add(node)
      case NodeType.AYURVEDA_DOSHA:
        return this.vocabulary.ayurveda.doshas.add(node)
      case NodeType.AYURVEDA_RASA:
        return this.vocabulary.ayurveda.rasas.add(node)
      case NodeType.AYURVEDA_GUNA:
        return this.vocabulary.ayurveda.gunas.add(node)
      case NodeType.AYURVEDA_VIRYA:
        return this.vocabulary.ayurveda.viryas.add(node)
      case NodeType.AYURVEDA_VIPAKA:
        return this.vocabulary.ayurveda.vipakas.add(node)
      case NodeType.SOURCE:
        return this.sources.add(node)
      case NodeType.IMAGE:
        return this.images.add(node)
      default:
        console.warn(`Unknown node type: ${nodeType}`)
        return false
    }
  }

  /**
   * Check if a node exists by its IRI
   */
  hasNode(iri: string): boolean {
    return this.allIRIs.has(iri)
  }

  /**
   * Get a node by its IRI
   */
  getNode(iri: string): GraphNode | undefined {
    const nodeType = this.allIRIs.get(iri)
    if (!nodeType) return undefined

    // Look up in appropriate registry
    switch (nodeType) {
      case NodeType.SPECIES:
        return this.species.getByIRI(iri) as unknown as GraphNode
      case NodeType.PART:
        return this.parts.getByIRI(iri) as unknown as GraphNode
      case NodeType.CHEMICAL:
        return this.chemicals.getByIRI(iri) as unknown as GraphNode
      case NodeType.PREPARATION:
        return this.preparations.getByIRI(iri) as unknown as GraphNode
      case NodeType.FORMULA:
        return this.formulas.getByIRI(iri) as unknown as GraphNode
      case NodeType.TCM_PROFILE:
        return this.profiles.tcm.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_PROFILE:
        return this.profiles.ayurveda.getByIRI(iri) as unknown as GraphNode
      case NodeType.WESTERN_PROFILE:
        return this.profiles.western.getByIRI(iri) as unknown as GraphNode
      case NodeType.UNANI_PROFILE:
        return this.profiles.unani.getByIRI(iri) as unknown as GraphNode
      case NodeType.MONGOLIAN_PROFILE:
        return this.profiles.mongolian.getByIRI(iri) as unknown as GraphNode
      case NodeType.MODERN_PROFILE:
        return this.profiles.modern.getByIRI(iri) as unknown as GraphNode
      case NodeType.TCM_FLAVOR:
        return this.vocabulary.tcm.flavors.getByIRI(iri) as unknown as GraphNode
      case NodeType.TCM_NATURE:
        return this.vocabulary.tcm.natures.getByIRI(iri) as unknown as GraphNode
      case NodeType.TCM_MERIDIAN:
        return this.vocabulary.tcm.meridians.getByIRI(iri) as unknown as GraphNode
      case NodeType.TCM_CATEGORY:
        return this.vocabulary.tcm.categories.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_DOSHA:
        return this.vocabulary.ayurveda.doshas.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_RASA:
        return this.vocabulary.ayurveda.rasas.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_GUNA:
        return this.vocabulary.ayurveda.gunas.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_VIRYA:
        return this.vocabulary.ayurveda.viryas.getByIRI(iri) as unknown as GraphNode
      case NodeType.AYURVEDA_VIPAKA:
        return this.vocabulary.ayurveda.vipakas.getByIRI(iri) as unknown as GraphNode
      case NodeType.SOURCE:
        return this.sources.getByIRI(iri) as unknown as GraphNode
      case NodeType.IMAGE:
        return this.images.getByIRI(iri) as unknown as GraphNode
      default:
        return undefined
    }
  }

  /**
   * Get node type for an IRI
   */
  getNodeType(iri: string): NodeTypeValue | undefined {
    return this.allIRIs.get(iri)
  }

  /**
   * Extract all IRI references from a node
   */
  extractReferences(node: GraphNode): string[] {
    const refs: string[] = []
    const nodeObj = node as unknown as Record<string, unknown>

    const extractFromValue = (value: unknown): void => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(extractFromValue)
        } else if ('@id' in value && typeof (value as IRIReference)['@id'] === 'string') {
          refs.push((value as IRIReference)['@id'])
        }
      }
    }

    // Check all properties for @id references
    for (const key of Object.keys(nodeObj)) {
      if (key.startsWith('@')) continue
      extractFromValue(nodeObj[key])
    }

    return refs
  }

  /**
   * Register references for a node
   */
  registerReferences(node: GraphNode): void {
    const iri = node['@id']
    const refs = this.extractReferences(node)

    for (const refIRI of refs) {
      const exists = this.hasNode(refIRI)
      this.resolver.addReference(iri, refIRI, exists)
    }
  }

  /**
   * Get all nodes as an array
   */
  getAllNodes(): GraphNode[] {
    const nodes: GraphNode[] = []

    nodes.push(...this.species.getAllAsGraphNodes())
    nodes.push(...this.parts.getAllAsGraphNodes())
    nodes.push(...this.chemicals.getAllAsGraphNodes())
    nodes.push(...this.preparations.getAllAsGraphNodes())
    nodes.push(...this.formulas.getAllAsGraphNodes())

    for (const registry of Object.values(this.profiles)) {
      nodes.push(...registry.getAllAsGraphNodes())
    }

    for (const systemVocab of Object.values(this.vocabulary)) {
      for (const registry of Object.values(systemVocab)) {
        nodes.push(...registry.getAllAsGraphNodes())
      }
    }

    nodes.push(...this.sources.getAllAsGraphNodes())
    nodes.push(...this.images.getAllAsGraphNodes())

    return nodes
  }

  /**
   * Get statistics about the graph
   */
  getStats(): GraphStats {
    const byType: Record<string, number> = {
      species: this.species.count,
      parts: this.parts.count,
      chemicals: this.chemicals.count,
      preparations: this.preparations.count,
      formulas: this.formulas.count,
      'profiles:tcm': this.profiles.tcm.count,
      'profiles:ayurveda': this.profiles.ayurveda.count,
      'profiles:western': this.profiles.western.count,
      'profiles:unani': this.profiles.unani.count,
      'profiles:mongolian': this.profiles.mongolian.count,
      'profiles:modern': this.profiles.modern.count,
      'vocab:tcm:flavors': this.vocabulary.tcm.flavors.count,
      'vocab:tcm:natures': this.vocabulary.tcm.natures.count,
      'vocab:tcm:meridians': this.vocabulary.tcm.meridians.count,
      'vocab:tcm:categories': this.vocabulary.tcm.categories.count,
      'vocab:ayurveda:doshas': this.vocabulary.ayurveda.doshas.count,
      'vocab:ayurveda:rasas': this.vocabulary.ayurveda.rasas.count,
      'vocab:ayurveda:gunas': this.vocabulary.ayurveda.gunas.count,
      'vocab:ayurveda:viryas': this.vocabulary.ayurveda.viryas.count,
      'vocab:ayurveda:vipakas': this.vocabulary.ayurveda.vipakas.count,
      sources: this.sources.count,
      images: this.images.count,
    }

    const totalNodes = Object.values(byType).reduce((a, b) => a + b, 0)

    return {
      totalNodes,
      byType,
      lastUpdated: new Date().toISOString(),
      buildVersion: process.env.npm_package_version || '0.0.0',
      validation: {
        errors: this.resolver.getUnresolvedReferences().length,
        warnings: 0,
      },
    }
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.species.clear()
    this.parts.clear()
    this.chemicals.clear()
    this.preparations.clear()
    this.formulas.clear()

    for (const registry of Object.values(this.profiles)) {
      registry.clear()
    }

    for (const systemVocab of Object.values(this.vocabulary)) {
      for (const registry of Object.values(systemVocab)) {
        registry.clear()
      }
    }

    this.sources.clear()
    this.images.clear()
    this.resolver.clear()
    this.allIRIs.clear()
  }
}

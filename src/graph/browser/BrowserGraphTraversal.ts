/**
 * BrowserGraphTraversal - Browser-compatible traversal API for the knowledge graph
 *
 * Provides the same API as GraphTraversal but works with BrowserGraphRegistry
 * and pre-built relationships data.
 *
 * @example
 * ```typescript
 * import { BrowserGraphRegistry, BrowserGraphTraversal } from '@herbapedia/data/graph-browser'
 *
 * const registry = new BrowserGraphRegistry()
 * await registry.loadFromUrl('/api/v1/browser/registry.json')
 *
 * const traversal = new BrowserGraphTraversal(registry)
 * await traversal.loadRelationshipsFromUrl('/api/v1/browser/relationships.json')
 *
 * // Find all nodes that reference ginseng
 * const refs = traversal.getIncomingReferences(
 *   'https://www.herbapedia.org/graph/species/panax-ginseng'
 * )
 *
 * // Follow a specific relationship
 * const meridians = traversal.traverseRelationship(
 *   'https://www.herbapedia.org/graph/profile/tcm/ren-shen',
 *   'entersMeridian'
 * )
 * ```
 */

import type {
  GraphNode,
  IRIReference,
} from '../types.js'
import type { BrowserGraphRegistry } from './BrowserGraphRegistry.js'
import type { BrowserRelationshipsData } from './BrowserGraphRegistry.js'

/**
 * Relationship types in the knowledge graph
 */
export const RelationshipType = {
  // Botanical relationships
  HAS_PART: 'hasPart',
  PART_OF: 'partOf',
  CONTAINS_CHEMICAL: 'containsChemical',
  FOUND_IN: 'foundIn',

  // Profile relationships
  DERIVED_FROM: 'derivedFrom',
  HAS_CATEGORY: 'hasCategory',
  HAS_NATURE: 'hasNature',
  HAS_FLAVOR: 'hasFlavor',
  ENTERS_MERIDIAN: 'entersMeridian',
  HAS_DOSHA: 'hasDosha',
  HAS_RASA: 'hasRasa',
  HAS_GUNA: 'hasGuna',
  HAS_VIRYA: 'hasVirya',
  HAS_VIPAKA: 'hasVipaka',
  HAS_ACTION: 'hasAction',
  HAS_ORGAN_AFFINITY: 'hasOrganAffinity',

  // Preparation relationships
  HAS_INGREDIENT: 'hasIngredient',
  INGREDIENT_IN: 'ingredientIn',

  // Vocabulary relationships
  BROADER: 'broader',
  NARROWER: 'narrower',
  RELATED: 'related',

  // General relationships
  SAME_AS: 'sameAs',
  HAS_SOURCE: 'hasSource',
  HAS_IMAGE: 'hasImage',
  DEPICTS: 'depicts',
} as const

export type RelationshipTypeValue = typeof RelationshipType[keyof typeof RelationshipType]

/**
 * Options for traversal operations
 */
export interface TraversalOptions {
  /** Maximum depth for recursive traversals */
  maxDepth?: number
  /** Relationship types to follow */
  relationships?: RelationshipTypeValue[]
  /** Include the starting node in results */
  includeStart?: boolean
  /** Filter by node type */
  nodeTypeFilter?: string[]
}

/**
 * Browser-compatible Traversal API
 */
export class BrowserGraphTraversal {
  private registry: BrowserGraphRegistry
  private forward: Map<string, string[]> = new Map()
  private backward: Map<string, string[]> = new Map()
  private byRelationship: Map<string, Map<string, string[]>> = new Map()

  constructor(registry: BrowserGraphRegistry) {
    this.registry = registry
  }

  /**
   * Load relationships data from a URL
   */
  async loadRelationshipsFromUrl(url: string): Promise<void> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load relationships from ${url}: ${response.statusText}`)
    }
    const data: BrowserRelationshipsData = await response.json()
    this.loadRelationships(data)
  }

  /**
   * Load relationships data directly
   */
  loadRelationships(data: BrowserRelationshipsData): void {
    this.forward.clear()
    this.backward.clear()
    this.byRelationship.clear()

    // Load forward references
    for (const [source, targets] of Object.entries(data.forward)) {
      this.forward.set(source, targets)
    }

    // Load backward references
    for (const [target, sources] of Object.entries(data.backward)) {
      this.backward.set(target, sources)
    }

    // Load by-relationship index
    for (const [rel, sources] of Object.entries(data.byRelationship)) {
      const sourceMap = new Map<string, string[]>()
      for (const [source, targets] of Object.entries(sources)) {
        sourceMap.set(source, targets)
      }
      this.byRelationship.set(rel, sourceMap)
    }
  }

  /**
   * Build relationships from nodes (fallback if relationships file not available)
   */
  buildFromNodes(): void {
    this.forward.clear()
    this.backward.clear()
    this.byRelationship.clear()

    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const sourceIRI = node['@id']
      const refs = this.extractAllReferences(node)

      // Forward references
      this.forward.set(sourceIRI, refs.map(r => r.targetIRI))

      // Build backward references and relationship index
      for (const { targetIRI, relationship } of refs) {
        // Backward reference
        const existing = this.backward.get(targetIRI) || []
        if (!existing.includes(sourceIRI)) {
          existing.push(sourceIRI)
          this.backward.set(targetIRI, existing)
        }

        // By relationship index
        if (relationship) {
          const relMap = this.byRelationship.get(relationship) || new Map()
          const targets = relMap.get(sourceIRI) || []
          if (!targets.includes(targetIRI)) {
            targets.push(targetIRI)
            relMap.set(sourceIRI, targets)
          }
          this.byRelationship.set(relationship, relMap)
        }
      }
    }
  }

  // ===========================================================================
  // Reference Traversal
  // ===========================================================================

  /**
   * Get all nodes that reference a given node (incoming references)
   */
  getIncomingReferences(nodeId: string): GraphNode[] {
    const iris = this.backward.get(nodeId) || []
    return this.resolveIRIs(iris)
  }

  /**
   * Get all nodes that a given node references (outgoing references)
   */
  getOutgoingReferences(nodeId: string): GraphNode[] {
    const iris = this.forward.get(nodeId) || []
    return this.resolveIRIs(iris)
  }

  // ===========================================================================
  // Relationship Traversal
  // ===========================================================================

  /**
   * Traverse a specific relationship from a node
   */
  traverseRelationship(
    nodeId: string,
    relationship: RelationshipTypeValue | string
  ): GraphNode[] {
    // Use pre-built index if available
    const relMap = this.byRelationship.get(relationship)
    if (relMap) {
      const iris = relMap.get(nodeId) || []
      return this.resolveIRIs(iris)
    }

    // Fallback: extract from node
    const node = this.registry.getNode(nodeId)
    if (!node) return []

    const nodeObj = node as unknown as Record<string, unknown>
    const value = nodeObj[relationship]

    if (!value) return []

    // Handle single reference
    if (this.isIRIReference(value)) {
      const resolved = this.registry.getNode((value as IRIReference)['@id'])
      return resolved ? [resolved] : []
    }

    // Handle array of references
    if (Array.isArray(value)) {
      const results: GraphNode[] = []
      for (const item of value) {
        if (this.isIRIReference(item)) {
          const resolved = this.registry.getNode((item as IRIReference)['@id'])
          if (resolved) results.push(resolved)
        }
      }
      return results
    }

    return []
  }

  /**
   * Traverse multiple relationships from a node
   */
  traverseRelationships(
    nodeId: string,
    relationships: RelationshipTypeValue[]
  ): Map<RelationshipTypeValue, GraphNode[]> {
    const results = new Map<RelationshipTypeValue, GraphNode[]>()
    for (const rel of relationships) {
      results.set(rel, this.traverseRelationship(nodeId, rel))
    }
    return results
  }

  // ===========================================================================
  // Graph Navigation
  // ===========================================================================

  /**
   * Get all nodes related to a node within a certain depth
   */
  getRelatedNodes(nodeId: string, options?: TraversalOptions): Map<string, GraphNode> {
    const maxDepth = options?.maxDepth ?? 1
    const visited = new Map<string, GraphNode>()
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.depth > maxDepth) continue
      if (visited.has(current.id)) continue

      const node = this.registry.getNode(current.id)
      if (!node) continue

      // Skip start node unless includeStart is true
      if (current.depth > 0 || options?.includeStart) {
        visited.set(current.id, node)
      }

      // Add outgoing references to queue
      if (current.depth < maxDepth) {
        const outgoing = this.forward.get(current.id) || []
        for (const ref of outgoing) {
          if (!visited.has(ref)) {
            queue.push({ id: ref, depth: current.depth + 1 })
          }
        }

        // Add incoming references to queue
        const incoming = this.backward.get(current.id) || []
        for (const ref of incoming) {
          if (!visited.has(ref)) {
            queue.push({ id: ref, depth: current.depth + 1 })
          }
        }
      }
    }

    return visited
  }

  // ===========================================================================
  // Domain-Specific Traversals
  // ===========================================================================

  /**
   * Get all species that a profile is derived from
   */
  getSpeciesForProfile(profileId: string): GraphNode[] {
    return this.traverseRelationship(profileId, RelationshipType.DERIVED_FROM)
  }

  /**
   * Get all profiles for a species (inverse of derivedFrom)
   */
  getProfilesForSpecies(speciesId: string): GraphNode[] {
    return this.getIncomingReferences(speciesId).filter(node => {
      const types = node['@type']
      if (Array.isArray(types)) {
        return types.some(t => t.includes('Herb') || t.includes('Profile') || t.includes('Dravya'))
      }
      return types?.includes('Herb') || types?.includes('Profile')
    })
  }

  /**
   * Get all chemicals in a species or part
   */
  getChemicals(nodeId: string): GraphNode[] {
    return this.traverseRelationship(nodeId, RelationshipType.CONTAINS_CHEMICAL)
  }

  /**
   * Get all parts of a species
   */
  getParts(speciesId: string): GraphNode[] {
    return this.traverseRelationship(speciesId, RelationshipType.HAS_PART)
  }

  /**
   * Get the species a part belongs to
   */
  getParentSpecies(partId: string): GraphNode | undefined {
    const parts = this.traverseRelationship(partId, RelationshipType.PART_OF)
    return parts[0]
  }

  /**
   * Get all ingredients in a formula
   */
  getIngredients(formulaId: string): GraphNode[] {
    return this.traverseRelationship(formulaId, RelationshipType.HAS_INGREDIENT)
  }

  /**
   * Get all formulas containing an ingredient
   */
  getFormulasContaining(ingredientId: string): GraphNode[] {
    return this.getIncomingReferences(ingredientId).filter(node => {
      const types = node['@type']
      if (Array.isArray(types)) {
        return types.some(t => t.includes('Formula'))
      }
      return types?.includes('Formula')
    })
  }

  /**
   * Get TCM vocabulary for a profile
   */
  getTcmVocabulary(profileId: string): {
    natures: GraphNode[]
    flavors: GraphNode[]
    meridians: GraphNode[]
    categories: GraphNode[]
  } {
    return {
      natures: this.traverseRelationship(profileId, RelationshipType.HAS_NATURE),
      flavors: this.traverseRelationship(profileId, RelationshipType.HAS_FLAVOR),
      meridians: this.traverseRelationship(profileId, RelationshipType.ENTERS_MERIDIAN),
      categories: this.traverseRelationship(profileId, RelationshipType.HAS_CATEGORY),
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Resolve an array of IRIs to GraphNodes
   */
  private resolveIRIs(iris: string[]): GraphNode[] {
    const results: GraphNode[] = []
    for (const iri of iris) {
      const node = this.registry.getNode(iri)
      if (node) {
        results.push(node)
      }
    }
    return results
  }

  /**
   * Check if a value is an IRI reference
   */
  private isIRIReference(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      '@id' in value &&
      typeof (value as IRIReference)['@id'] === 'string'
    )
  }

  /**
   * Extract all references from a node with relationship info
   */
  private extractAllReferences(node: GraphNode): Array<{ targetIRI: string; relationship?: string }> {
    const refs: Array<{ targetIRI: string; relationship?: string }> = []
    const nodeObj = node as unknown as Record<string, unknown>

    const extractFromValue = (value: unknown, relationship?: string): void => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (const item of value) {
            extractFromValue(item, relationship)
          }
        } else if ('@id' in value && typeof (value as IRIReference)['@id'] === 'string') {
          refs.push({
            targetIRI: (value as IRIReference)['@id'],
            relationship,
          })
        }
      }
    }

    // Check all properties for @id references
    for (const key of Object.keys(nodeObj)) {
      if (key.startsWith('@')) continue
      extractFromValue(nodeObj[key], key)
    }

    return refs
  }
}

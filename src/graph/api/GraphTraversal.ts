/**
 * GraphTraversal - Traversal API for navigating the knowledge graph
 *
 * Provides methods to traverse relationships between nodes:
 * - Follow incoming references (nodes that reference this node)
 * - Follow outgoing references (nodes this node references)
 * - Traverse specific relationship types
 * - Get ancestors and descendants
 *
 * @example
 * ```typescript
 * const traversal = new GraphTraversal(registry)
 *
 * // Find all nodes that reference ginseng
 * const refs = traversal.getIncomingReferences('https://www.herbapedia.org/graph/species/panax-ginseng')
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
import { GraphRegistry } from '../registry/GraphRegistry.js'

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
 * Traversal API for navigating relationships in the knowledge graph
 */
export class GraphTraversal {
  private registry: GraphRegistry

  constructor(registry: GraphRegistry) {
    this.registry = registry
  }

  // ===========================================================================
  // Reference Traversal
  // ===========================================================================

  /**
   * Get all nodes that reference a given node
   * (incoming references: other nodes have @id pointing to this node)
   */
  getIncomingReferences(nodeId: string): GraphNode[] {
    const iris = this.registry.resolver.getIncomingReferences(nodeId)
    return this.resolveIRIs(iris)
  }

  /**
   * Get all nodes that a given node references
   * (outgoing references: this node has @id pointing to other nodes)
   */
  getOutgoingReferences(nodeId: string): GraphNode[] {
    const iris = this.registry.resolver.getOutgoingReferences(nodeId)
    return this.resolveIRIs(iris)
  }

  /**
   * Check if there are any unresolved references
   */
  hasUnresolvedReferences(): boolean {
    return this.registry.resolver.hasUnresolvedReferences()
  }

  /**
   * Get all unresolved reference IRIs
   */
  getUnresolvedReferences(): string[] {
    return this.registry.resolver.getUnresolvedReferences()
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
        const outgoing = this.registry.resolver.getOutgoingReferences(current.id)
        for (const ref of outgoing) {
          if (!visited.has(ref)) {
            queue.push({ id: ref, depth: current.depth + 1 })
          }
        }

        // Add incoming references to queue
        const incoming = this.registry.resolver.getIncomingReferences(current.id)
        for (const ref of incoming) {
          if (!visited.has(ref)) {
            queue.push({ id: ref, depth: current.depth + 1 })
          }
        }
      }
    }

    return visited
  }

  /**
   * Get ancestors of a node (following 'broader' relationships)
   */
  getAncestors(nodeId: string, options?: TraversalOptions): GraphNode[] {
    const maxDepth = options?.maxDepth ?? 10
    const ancestors: GraphNode[] = []
    const visited = new Set<string>()
    let currentId = nodeId
    let depth = 0

    while (depth < maxDepth) {
      if (visited.has(currentId)) break
      visited.add(currentId)

      const broader = this.traverseRelationship(currentId, RelationshipType.BROADER)
      if (broader.length === 0) break

      ancestors.push(...broader)
      currentId = broader[0]['@id']
      depth++
    }

    return ancestors
  }

  /**
   * Get descendants of a node (following 'narrower' relationships)
   */
  getDescendants(nodeId: string, options?: TraversalOptions): GraphNode[] {
    const maxDepth = options?.maxDepth ?? 10
    const descendants: GraphNode[] = []
    const visited = new Set<string>()
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.depth >= maxDepth) continue
      if (visited.has(current.id)) continue
      visited.add(current.id)

      const narrower = this.traverseRelationship(current.id, RelationshipType.NARROWER)
      for (const node of narrower) {
        descendants.push(node)
        queue.push({ id: node['@id'], depth: current.depth + 1 })
      }
    }

    return descendants
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
        return types.some(t => t.includes('Profile'))
      }
      return types?.includes('Profile')
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

  /**
   * Get Ayurveda vocabulary for a profile
   */
  getAyurvedaVocabulary(profileId: string): {
    doshas: GraphNode[]
    rasas: GraphNode[]
    gunas: GraphNode[]
    viryas: GraphNode[]
    vipakas: GraphNode[]
  } {
    return {
      doshas: this.traverseRelationship(profileId, RelationshipType.HAS_DOSHA),
      rasas: this.traverseRelationship(profileId, RelationshipType.HAS_RASA),
      gunas: this.traverseRelationship(profileId, RelationshipType.HAS_GUNA),
      viryas: this.traverseRelationship(profileId, RelationshipType.HAS_VIRYA),
      vipakas: this.traverseRelationship(profileId, RelationshipType.HAS_VIPAKA),
    }
  }

  // ===========================================================================
  // Path Finding
  // ===========================================================================

  /**
   * Find the shortest path between two nodes
   */
  getShortestPath(fromId: string, toId: string): string[] {
    if (fromId === toId) return [fromId]

    const visited = new Set<string>()
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current.id)) continue
      visited.add(current.id)

      // Get all connected nodes
      const connected = [
        ...this.registry.resolver.getOutgoingReferences(current.id),
        ...this.registry.resolver.getIncomingReferences(current.id),
      ]

      for (const nextId of connected) {
        if (nextId === toId) {
          return [...current.path, nextId]
        }

        if (!visited.has(nextId)) {
          queue.push({ id: nextId, path: [...current.path, nextId] })
        }
      }
    }

    return [] // No path found
  }

  /**
   * Check if two nodes are connected
   */
  areConnected(fromId: string, toId: string): boolean {
    return this.getShortestPath(fromId, toId).length > 0
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
}

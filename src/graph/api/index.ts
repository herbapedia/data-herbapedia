/**
 * Graph API - Barrel export for all API classes
 *
 * Provides three complementary APIs for working with the knowledge graph:
 *
 * - **GraphQuery**: Retrieve nodes by various criteria (slug, IRI, system, type)
 * - **GraphTraversal**: Navigate relationships between nodes
 * - **GraphIndex**: List and search nodes with full-text capabilities
 *
 * @example
 * ```typescript
 * import { GraphQuery, GraphTraversal, GraphIndex } from './api/index.js'
 *
 * const query = new GraphQuery(registry)
 * const traversal = new GraphTraversal(registry)
 * const index = new GraphIndex(registry)
 *
 * // Get a species
 * const ginseng = query.getSpecies('panax-ginseng')
 *
 * // Find all profiles that reference this species
 * const profiles = traversal.getIncomingReferences(ginseng['@id'])
 *
 * // Search for nodes containing 'ginseng'
 * const results = index.search('ginseng')
 * ```
 */

// Query API - retrieve nodes by various criteria
export { GraphQuery } from './GraphQuery.js'

// Traversal API - navigate relationships between nodes
export {
  GraphTraversal,
  RelationshipType,
  type RelationshipTypeValue,
  type TraversalOptions,
} from './GraphTraversal.js'

// Index API - list and search nodes
export {
  GraphIndex,
  type SearchResult,
} from './GraphIndex.js'

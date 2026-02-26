/**
 * Browser-compatible Knowledge Graph API
 *
 * This module provides browser-compatible versions of the Graph API classes.
 * Unlike the Node.js versions, these classes:
 * - Do not use fs module
 * - Load data from pre-built JSON files via fetch
 * - Provide the same API as the Node.js versions
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   BrowserGraphRegistry,
 *   BrowserGraphQuery,
 *   BrowserGraphTraversal,
 *   BrowserGraphIndex,
 *   createGraphAPI
 * } from '@herbapedia/data/graph-browser'
 *
 * // Create and initialize the API
 * const api = await createGraphAPI('/api/v1/browser')
 *
 * // Query nodes
 * const ginseng = api.query.getSpecies('panax-ginseng')
 * const profiles = api.query.findProfilesForSpecies('panax-ginseng')
 *
 * // Search
 * const results = api.index.search('ginseng')
 *
 * // Traverse relationships
 * const meridians = api.traversal.traverseRelationship(
 *   profiles[0]['@id'],
 *   'entersMeridian'
 * )
 * ```
 *
 * ## Data Flow
 *
 * ```
 * CI/CD (Node.js)                    Browser
 * ───────────────                    ───────
 * GraphBuilder.build()               BrowserGraphRegistry.loadFromUrl()
 *        ↓                                    ↓
 * BrowserExporter.export()           Loads registry.json
 *        ↓                                    ↓
 * api/v1/browser/                    BrowserGraphQuery
 *   registry.json                    BrowserGraphTraversal
 *   relationships.json               BrowserGraphIndex
 *   search-index.json
 * ```
 */

// Registry
export { BrowserGraphRegistry, createRegistry } from './BrowserGraphRegistry.js'
export type {
  BrowserNode,
  BrowserRegistryData,
  BrowserRelationshipsData,
  BrowserSearchIndexData,
} from './BrowserGraphRegistry.js'

// Query API
export { BrowserGraphQuery } from './BrowserGraphQuery.js'

// Traversal API
export {
  BrowserGraphTraversal,
  RelationshipType,
} from './BrowserGraphTraversal.js'
export type {
  TraversalOptions,
  RelationshipTypeValue,
} from './BrowserGraphTraversal.js'

// Index API
export { BrowserGraphIndex } from './BrowserGraphIndex.js'
export type { SearchResult } from './BrowserGraphIndex.js'

// Convenience function to create the full API
import { BrowserGraphRegistry } from './BrowserGraphRegistry.js'
import { BrowserGraphQuery } from './BrowserGraphQuery.js'
import { BrowserGraphTraversal } from './BrowserGraphTraversal.js'
import { BrowserGraphIndex } from './BrowserGraphIndex.js'

/**
 * Initialized graph API
 */
export interface BrowserGraphAPI {
  registry: BrowserGraphRegistry
  query: BrowserGraphQuery
  traversal: BrowserGraphTraversal
  index: BrowserGraphIndex
}

/**
 * Options for creating the browser graph API
 */
export interface CreateGraphAPIOptions {
  /** Base URL for browser artifacts (default: '/api/v1/browser') */
  baseUrl?: string
  /** Load relationships file (default: true) */
  loadRelationships?: boolean
  /** Load search index file (default: true) */
  loadSearchIndex?: boolean
}

/**
 * Create and initialize the full browser graph API
 *
 * @example
 * ```typescript
 * // Load from default URL
 * const api = await createGraphAPI()
 *
 * // Load from custom URL
 * const api = await createGraphAPI('/data/browser')
 *
 * // Skip search index for faster loading
 * const api = await createGraphAPI('/api/v1/browser', { loadSearchIndex: false })
 * ```
 */
export async function createGraphAPI(
  baseUrl: string = '/api/v1/browser',
  options: CreateGraphAPIOptions = {}
): Promise<BrowserGraphAPI> {
  const {
    loadRelationships = true,
    loadSearchIndex = true,
  } = options

  // Create and load registry
  const registry = new BrowserGraphRegistry()
  await registry.loadFromUrl(`${baseUrl}/registry.json`)

  // Create API classes
  const query = new BrowserGraphQuery(registry)
  const traversal = new BrowserGraphTraversal(registry)
  const index = new BrowserGraphIndex(registry)

  // Load optional data
  if (loadRelationships) {
    try {
      await traversal.loadRelationshipsFromUrl(`${baseUrl}/relationships.json`)
    } catch {
      // Fall back to building from nodes
      traversal.buildFromNodes()
    }
  }

  if (loadSearchIndex) {
    try {
      await index.loadIndexFromUrl(`${baseUrl}/search-index.json`)
    } catch {
      // Fall back to building index
      index.buildSearchIndex()
    }
  }

  return {
    registry,
    query,
    traversal,
    index,
  }
}

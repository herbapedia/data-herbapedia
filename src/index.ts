/**
 * @herbapedia/data - Herbapedia Knowledge Graph Package
 *
 * This package provides a fully normalized JSON-LD knowledge graph
 * for medicinal botany across all traditional medicine systems.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   GraphBuilder,
 *   GraphQuery,
 *   GraphTraversal,
 *   GraphIndex
 * } from '@herbapedia/data'
 *
 * // Build the knowledge graph
 * const builder = new GraphBuilder({
 *   dataRoot: './data-herbapedia',
 *   outputDir: './api/v1'
 * })
 * await builder.build()
 * const registry = builder.getRegistry()
 *
 * // Query entities
 * const query = new GraphQuery(registry)
 * const ginseng = query.getSpecies('panax-ginseng')
 *
 * // Traverse relationships
 * const traversal = new GraphTraversal(registry)
 * const related = traversal.getRelatedNodes('species/panax-ginseng', 2)
 *
 * // Search
 * const index = new GraphIndex(registry)
 * const results = index.search('ginseng')
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from the graph module
export * from './graph/index.js'

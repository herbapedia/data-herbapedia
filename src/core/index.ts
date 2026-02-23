/**
 * Core module exports.
 *
 * This module provides the foundational components for the Herbapedia API:
 * - Entity loading and caching
 * - IRI resolution utilities
 */

export { EntityLoader, extractSlug, extractNamespace } from './loader'
export type { LoaderOptions } from './loader'

export { SmartCache, entityCache } from './cache'
export type { CacheOptions, CacheStats } from './cache'

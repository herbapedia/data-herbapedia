/**
 * Core module exports.
 *
 * This module provides the foundational components for the Herbapedia API:
 * - Entity loading and caching
 * - IRI resolution utilities
 * - Configuration management
 * - Query indexing
 */

export { EntityLoader, extractSlug, extractNamespace } from './loader'
export type { LoaderOptions } from './loader'

export { SmartCache, entityCache } from './cache'
export type { CacheOptions, CacheStats } from './cache'

export { QueryIndex } from './query-index'
export type { QueryIndexOptions, IndexEntry } from './query-index'

export {
  NAMESPACE_MAP,
  ENTITY_TYPE_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_CACHE_CONFIG,
  resolveNamespace,
  getEntityConfig,
  detectEntityType,
  toFullIRI,
  toRelativeIRI,
  iriToFilePath,
  // Type guards
  isPlantSpecies,
  isTCMProfile,
  isWesternProfile,
  isAyurvedaProfile,
  isUnaniProfile,
  isMongolianProfile,
  isChemicalCompound,
  isHerbalPreparation,
} from './config'
export type { Namespace, EntityType, HerbapediaConfig, CacheConfig } from './config'

// Re-export Result type for convenience
export { ok, err, mapResult, flatMapResult } from '../types/index.js'
export type { Result, Ok, Err } from '../types/index.js'

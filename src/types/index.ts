/**
 * Core type definitions for Herbapedia API
 */

import type { LanguageMap } from './language-map.js'

// ============================================================================
// Result Type for Explicit Error Handling
// ============================================================================

/**
 * Represents a successful result
 */
export interface Ok<T> {
  ok: true
  value: T
}

/**
 * Represents a failed result
 */
export interface Err<E> {
  ok: false
  error: E
}

/**
 * Result type for explicit error handling - replaces null/throw patterns
 */
export type Result<T, E = Error> = Ok<T> | Err<E>

/**
 * Helper to create a successful result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

/**
 * Helper to create an error result
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

/**
 * Map over the value if successful, otherwise pass through the error
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) }
  }
  return result
}

/**
 * Flat map over the value if successful
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value)
  }
  return result
}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Base entity interface
 */
export interface Entity {
  '@id': string
  '@type': string[]
  '@context'?: string | string[]
  name: LanguageMap
  description?: LanguageMap
  image?: string
  images?: string[]
  sameAs?: ExternalReference[]
}

/**
 * External reference to Wikidata, GBIF, etc.
 */
export interface ExternalReference {
  '@id': string
  description?: string
}

/**
 * Entity reference (used in @id properties)
 */
export interface EntityReference {
  '@id': string
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Query options
 */
export interface QueryOptions {
  /** Whether to use cache (default: true) */
  useCache?: boolean
  /** Whether to throw on missing (default: false) */
  throwOnMissing?: boolean
}

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  data: T | null
  metadata: QueryMetadata
}

export interface QueryMetadata {
  iri: string
  cached: boolean
  loadedAt?: Date
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Herbapedia configuration
 */
export interface HerbapediaConfig {
  /** Base path to data directory */
  dataPath: string
  /** Base URL for IRI resolution */
  baseUrl: string
  /** Cache configuration */
  cache?: CacheConfig
  /** Enable strict validation */
  strict?: boolean
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxSize?: number
  /** Time-to-live in milliseconds */
  ttl?: number
  /** Enable statistics tracking */
  stats?: boolean
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  message: string
  path: string
  severity: 'error'
}

export interface ValidationWarning {
  code: string
  message: string
  path: string
  severity: 'warning'
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'jsonld' | 'turtle' | 'rdf' | 'ntriples'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  baseUrl?: string
  compact?: boolean
}

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Builder configuration
 */
export interface BuilderConfig {
  strict?: boolean
  validateOnBuild?: boolean
}

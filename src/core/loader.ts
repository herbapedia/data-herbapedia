/**
 * Entity loader with caching and IRI resolution.
 *
 * This module handles:
 * - Loading entities from the filesystem
 * - IRI to path conversion
 * - Caching loaded entities
 * - Async loading for non-blocking operations
 * - Batch loading for efficiency
 */

import { readFileSync, existsSync, promises as fs } from 'fs'
import { join } from 'path'
import type { Entity } from '../types/index.js'
import { ok, err, type Result } from '../types/index.js'
import { isFullIRI, toRelativeIRI } from '../../types/core.js'
import { SmartCache } from './cache.js'
import { NAMESPACE_MAP, iriToFilePath } from './config.js'

/**
 * Loader configuration options.
 */
export interface LoaderOptions {
  /** Base path to the data directory */
  dataPath: string
  /** Custom cache instance */
  cache?: SmartCache<Entity>
}

/**
 * Entity loader with caching.
 *
 * @example
 * ```typescript
 * const loader = new EntityLoader('/path/to/data-herbapedia')
 *
 * const plant = loader.load('botanical/species/ginseng')
 * const profile = loader.load('tcm/profile/ren-shen')
 * ```
 */
export class EntityLoader {
  private dataPath: string
  private cache: SmartCache<Entity>

  constructor(options: LoaderOptions) {
    this.dataPath = options.dataPath
    this.cache = options.cache ?? new SmartCache<Entity>()
  }

  /**
   * Load an entity by its IRI.
   * Supports both full IRIs and relative IRIs.
   * @deprecated Use loadAsync for production code - this method is sync and blocking
   */
  load<T extends Entity>(iri: string): T | null {
    // Use async version internally for consistency
    return this.loadSync(iri)
  }

  /**
   * Synchronous load - uses fs.readFileSync directly.
   * Use only when async is not possible (e.g., SSR initial render).
   */
  loadSync<T extends Entity>(iri: string): T | null {
    const normalizedIri = this.normalizeIRI(iri)

    // Check cache first
    const cached = this.cache.get(normalizedIri)
    if (cached) {
      return cached as T
    }

    // Load from filesystem
    const path = this.iriToPath(normalizedIri)
    if (!existsSync(path)) {
      return null
    }

    try {
      const content = readFileSync(path, 'utf-8')
      const entity = JSON.parse(content) as T
      this.cache.set(normalizedIri, entity)
      return entity
    } catch (error) {
      console.error(`Error loading ${iri}:`, error)
      return null
    }
  }

  /**
   * Load an entity and return Result type for explicit error handling.
   * Preferred method for production use - non-blocking with typed errors.
   * @param iri - The full or relative IRI
   */
  async loadResult<T extends Entity>(iri: string): Promise<Result<T>> {
    const normalizedIri = this.normalizeIRI(iri)

    // Check cache first
    const cached = this.cache.get(normalizedIri)
    if (cached) {
      return ok(cached as T)
    }

    // Load from filesystem
    const path = this.iriToPath(normalizedIri)

    try {
      await fs.access(path)
    } catch {
      return err(new Error(`Entity not found: ${iri}`))
    }

    try {
      const content = await fs.readFile(path, 'utf-8')
      const entity = JSON.parse(content) as T
      this.cache.set(normalizedIri, entity)
      return ok(entity)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return err(new Error(`Failed to load ${iri}: ${message}`))
    }
  }

  /**
   * Load an entity asynchronously by its IRI.
   * Preferred method for production use - non-blocking.
   * @param iri - The full or relative IRI
   */
  async loadAsync<T extends Entity>(iri: string): Promise<T | null> {
    const normalizedIri = this.normalizeIRI(iri)

    // Check cache first
    const cached = this.cache.get(normalizedIri)
    if (cached) {
      return cached as T
    }

    // Load from filesystem
    const path = this.iriToPath(normalizedIri)

    try {
      await fs.access(path)
    } catch {
      return null
    }

    try {
      const content = await fs.readFile(path, 'utf-8')
      const entity = JSON.parse(content) as T
      this.cache.set(normalizedIri, entity)
      return entity
    } catch (error) {
      console.error(`Error loading ${iri}:`, error)
      return null
    }
  }

  /**
   * Load multiple entities in a single batch.
   * More efficient than loading individually.
   * @param iris - Array of IRIs to load
   */
  async batchLoad<T extends Entity>(iris: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()

    // Separate cached from uncached
    const uncached: string[] = []

    for (const iri of iris) {
      const normalizedIri = this.normalizeIRI(iri)
      const cached = this.cache.get(normalizedIri)
      if (cached) {
        results.set(iri, cached as T)
      } else {
        uncached.push(iri)
      }
    }

    // Load uncached entities in parallel
    const loadPromises = uncached.map(async (iri) => {
      const entity = await this.loadAsync<T>(iri)
      results.set(iri, entity)
      return { iri, entity }
    })

    await Promise.all(loadPromises)
    return results
  }

  /**
   * Check if an entity exists without loading it.
   */
  exists(iri: string): boolean {
    const normalizedIri = this.normalizeIRI(iri)
    const path = this.iriToPath(normalizedIri)
    return existsSync(path)
  }

  /**
   * Get the cache instance.
   */
  getCache(): SmartCache<Entity> {
    return this.cache
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics.
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  // ===========================================================================

  /**
   * Normalize an IRI to relative format.
   */
  private normalizeIRI(iri: string): string {
    return isFullIRI(iri) ? toRelativeIRI(iri) : iri
  }

  /**
   * Convert a relative IRI to a filesystem path.
   * Uses centralized config for namespace mapping.
   */
  private iriToPath(relativeIri: string): string {
    try {
      return iriToFilePath(relativeIri, this.dataPath)
    } catch {
      // Fallback to legacy parsing for backwards compatibility
      const { namespace, slug } = this.parseIRI(relativeIri)
      const namespaceMap = NAMESPACE_MAP as Record<string, string>
      const dir = namespaceMap[namespace]
      if (!dir) {
        throw new Error(`Unknown IRI namespace: ${namespace}`)
      }
      const filename = namespace.includes('profile') ? 'profile.jsonld' : 'entity.jsonld'
      return join(this.dataPath, dir, slug, filename)
    }
  }

  /**
   * Parse an IRI into namespace and slug.
   */
  private parseIRI(iri: string): { namespace: string; slug: string } {
    const parts = iri.split('/')
    const slug = parts[parts.length - 1] || ''
    const namespace = parts.slice(0, -1).join('/')
    return { namespace, slug }
  }
}

/**
 * Utility function to extract slug from IRI.
 */
export function extractSlug(iri: string): string {
  const parts = iri.split('/')
  return parts[parts.length - 1] || ''
}

/**
 * Utility function to extract namespace from IRI.
 */
export function extractNamespace(iri: string): string {
  const parts = iri.split('/')
  return parts.slice(0, -1).join('/')
}

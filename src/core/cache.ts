/**
 * Smart caching system with LRU eviction policy.
 *
 * This module provides configurable caching for entities with:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) expiration
 * - Lazy size calculation for performance
 * - Cache statistics
 */

/**
 * Cache configuration options.
 */
export interface CacheOptions {
  /** Maximum number of entities to cache (default: 500) */
  maxEntities?: number
  /** Maximum memory size in bytes (default: 50MB) */
  maxSize?: number
  /** Time to live in milliseconds (default: 30 minutes) */
  ttl?: number
  /** Enable lazy size calculation (default: true) */
  lazySize?: boolean
}

/**
 * Cache entry with metadata.
 */
interface CacheEntry<T> {
  entity: T
  size?: number // Optional - lazy calculated when lazySize is true
  accessedAt: number
  createdAt: number
}

/**
 * Cache statistics for monitoring.
 */
export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  entities: number
  hitRate: number
}

/**
 * Smart cache with LRU eviction.
 *
 * @example
 * ```typescript
 * const cache = new SmartCache<Entity>({ maxEntities: 500 })
 *
 * cache.set('botanical/species/ginseng', ginsengEntity)
 * const cached = cache.get('botanical/species/ginseng')
 *
 * console.log(cache.getStats())
 * ```
 */
export class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private options: Required<CacheOptions>
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sizeCalculations: 0,
  }
  private _currentSize = 0
  private sizeCache = new Map<string, number>()

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntities: options.maxEntities ?? 500,
      maxSize: options.maxSize ?? 50 * 1024 * 1024, // 50MB
      ttl: options.ttl ?? 1000 * 60 * 30, // 30 minutes
      lazySize: options.lazySize ?? true,
    }
  }

  /**
   * Get current size, calculating lazily if needed.
   */
  private getCurrentSize(): number {
    if (this.options.lazySize) {
      return this.calculateTotalSize()
    }
    return this._currentSize
  }

  /**
   * Calculate size of a single entity (with caching).
   */
  private getEntitySize(key: string, entity: T): number {
    if (!this.options.lazySize) {
      return this.calculateSize(entity)
    }

    // Check cache first
    if (this.sizeCache.has(key)) {
      return this.sizeCache.get(key)!
    }

    // Calculate and cache
    const size = this.calculateSize(entity)
    this.sizeCache.set(key, size)
    this.stats.sizeCalculations++
    return size
  }

  /**
   * Get an entity from the cache.
   * Returns undefined if not found or expired.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.options.ttl) {
      this.delete(key)
      this.stats.misses++
      return undefined
    }

    // Update access time for LRU
    entry.accessedAt = Date.now()
    this.stats.hits++
    return entry.entity
  }

  /**
   * Set an entity in the cache.
   * May trigger eviction if limits are reached.
   */
  set(key: string, entity: T): void {
    const size = this.getEntitySize(key, entity)

    // If single entity exceeds max size, don't cache
    if (size > this.options.maxSize) {
      return
    }

    // Evict until we have space
    while (
      (this.cache.size >= this.options.maxEntities ||
       this.getCurrentSize() + size > this.options.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictLRU()
    }

    // Remove old entry if updating
    if (this.cache.has(key)) {
      this.delete(key)
    }

    const entry: CacheEntry<T> = {
      entity,
      size: this.options.lazySize ? undefined : size,
      accessedAt: Date.now(),
      createdAt: Date.now(),
    }

    this.cache.set(key, entry)
    if (!this.options.lazySize) {
      this._currentSize += size
    }
  }

  /**
   * Check if a key exists in the cache.
   */
  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== undefined
  }

  /**
   * Delete an entry from the cache.
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Update size tracking
    if (this.options.lazySize) {
      const cachedSize = this.sizeCache.get(key)
      if (cachedSize) {
        this._currentSize -= cachedSize
        this.sizeCache.delete(key)
      }
    } else if (entry.size) {
      this._currentSize -= entry.size
    }

    return this.cache.delete(key)
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear()
    this._currentSize = 0
    this.sizeCache.clear()
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.getCurrentSize(),
      entities: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    }
  }

  /**
   * Get all cache keys.
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get the number of cached entities.
   */
  get size(): number {
    return this.cache.size
  }

  // ===========================================================================

  /**
   * Calculate total size of all cached entities.
   */
  private calculateTotalSize(): number {
    let total = 0
    for (const [key, entry] of this.cache.entries()) {
      if (this.sizeCache.has(key)) {
        total += this.sizeCache.get(key)!
      } else if (entry.size) {
        total += entry.size
      } else {
        // Calculate on-demand
        const size = this.calculateSize(entry.entity)
        this.sizeCache.set(key, size)
        total += size
      }
    }
    return total
  }

  /**
   * Calculate the approximate size of an entity in bytes.
   */
  private calculateSize(entity: T): number {
    try {
      return JSON.stringify(entity).length * 2 // UTF-16 chars = 2 bytes
    } catch {
      return 1024 // Default to 1KB if serialization fails
    }
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
      this.stats.evictions++
    }
  }
}

/**
 * Default cache instance for entities.
 */
export const entityCache = new SmartCache<unknown>({
  maxEntities: 500,
  maxSize: 50 * 1024 * 1024,
  ttl: 1000 * 60 * 30,
  lazySize: true,
})

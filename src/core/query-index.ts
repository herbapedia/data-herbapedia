/**
 * Query Index - Pre-built indexes for fast entity lookups
 *
 * This module provides high-performance query capabilities by building
 * indexes once at startup rather than scanning files on each query.
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { isFullIRI, toRelativeIRI } from '../../types/core.js'

/**
 * Query index entry
 */
interface IndexEntry {
  iri: string
  slug: string
  type: string[]
  name?: Record<string, string>
  scientificName?: string
}

/**
 * Query index configuration
 */
export interface QueryIndexOptions {
  /** Base path to data directory */
  dataPath: string
  /** Entity types to index */
  types?: string[]
  /** Enable incremental rebuilds */
  incremental?: boolean
}

/**
 * Pre-built query index for fast entity lookups
 *
 * @example
 * ```typescript
 * const index = await QueryIndex.build(loader)
 *
 * // Fast lookups
 * const plant = index.getBySlug('ginseng')
 * const plants = index.getByType('PlantSpecies')
 * const byScientificName = index.getByScientificName('Panax ginseng')
 * ```
 */
export class QueryIndex {
  private bySlug = new Map<string, IndexEntry>()
  private byType = new Map<string, Set<IndexEntry>>()
  private byScientificName = new Map<string, IndexEntry>()
  private all: IndexEntry[] = []
  private built = false

  private constructor() {}

  /**
   * Build the index from the data directory
   */
  static async build(options: QueryIndexOptions): Promise<QueryIndex> {
    const index = new QueryIndex()
    await index.buildIndex(options)
    index.built = true
    return index
  }

  /**
   * Build the index
   */
  private async buildIndex(options: QueryIndexOptions): Promise<void> {
    const { dataPath, types = ['plants', 'tcm', 'western', 'ayurveda'] } = options

    // Scan each entity type directory
    const scanPaths: Record<string, string> = {
      plants: 'entities/plants',
      tcm: 'systems/tcm/herbs',
      western: 'systems/western/herbs',
      ayurveda: 'systems/ayurveda/dravyas',
    }

    for (const [type, path] of Object.entries(scanPaths)) {
      if (!types.includes(type)) continue

      const dirPath = join(dataPath, path)
      try {
        await this.scanDirectory(dirPath, type)
      } catch (error) {
        console.warn(`Warning: Could not scan ${path}:`, error)
      }
    }
  }

  /**
   * Recursively scan directory for entity files
   */
  private async scanDirectory(dirPath: string, type: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          // Check for entity.jsonld or profile.jsonld
          const entityFile = join(fullPath, 'entity.jsonld')
          const profileFile = join(fullPath, 'profile.jsonld')

          try {
            await fs.access(entityFile)
            await this.indexFile(entityFile, type)
          } catch {
            try {
              await fs.access(profileFile)
              await this.indexFile(profileFile, type)
            } catch {
              // Not an entity directory, recurse
              await this.scanDirectory(fullPath, type)
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Index a single entity file
   */
  private async indexFile(filePath: string, _type: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const entity = JSON.parse(content)

      if (!entity['@id']) return

      const iri = entity['@id']
      const slug = this.extractSlug(iri)
      const entityTypes = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]

      const entry: IndexEntry = {
        iri,
        slug,
        type: entityTypes,
        name: entity.name,
        scientificName: entity.scientificName,
      }

      // Index by slug
      this.bySlug.set(slug, entry)

      // Index by type
      for (const t of entityTypes) {
        if (!this.byType.has(t)) {
          this.byType.set(t, new Set())
        }
        this.byType.get(t)!.add(entry)
      }

      // Index by scientific name
      if (entity.scientificName) {
        const sn = entity.scientificName.toLowerCase()
        this.byScientificName.set(sn, entry)
      }

      this.all.push(entry)
    } catch {
      // Skip invalid files
    }
  }

  /**
   * Extract slug from IRI
   */
  private extractSlug(iri: string): string {
    const relative = isFullIRI(iri) ? toRelativeIRI(iri) : iri
    const parts = relative.split('/')
    return parts[parts.length - 1] || ''
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get entity by slug
   */
  getBySlug(slug: string): IndexEntry | undefined {
    return this.bySlug.get(slug)
  }

  /**
   * Get all entities of a specific type
   */
  getByType(type: string): IndexEntry[] {
    const entries = this.byType.get(type)
    return entries ? Array.from(entries) : []
  }

  /**
   * Get entity by scientific name
   */
  getByScientificName(scientificName: string): IndexEntry | undefined {
    return this.byScientificName.get(scientificName.toLowerCase())
  }

  /**
   * Search by name (simple prefix match)
   */
  searchByName(query: string, lang = 'en'): IndexEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.all.filter(entry => {
      if (!entry.name) return false
      const name = entry.name[lang] || entry.name['en']
      return name?.toLowerCase().includes(lowerQuery)
    })
  }

  /**
   * Get all entities
   */
  getAll(): IndexEntry[] {
    return this.all
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      total: this.all.length,
      bySlug: this.bySlug.size,
      byType: this.byType.size,
      byScientificName: this.byScientificName.size,
    }
  }

  /**
   * Check if index is built
   */
  isBuilt(): boolean {
    return this.built
  }
}

export type { IndexEntry }

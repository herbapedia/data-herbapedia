/**
 * Full-text search using Lunr.js.
 *
 * This module provides:
 * - Multilingual search across plant names
 * - Scientific name search
 * - Description search
 * - Fuzzy matching
 * - Relevance ranking
 */

import lunr from 'lunr'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import type { PlantSpecies } from '../../types/botanical'
import type { LanguageMap } from '../../types/core'

/**
 * Search result with relevance score.
 */
export interface SearchResult {
  /** Entity IRI */
  iri: string
  /** Entity slug */
  slug: string
  /** Entity type */
  type: 'plant' | 'preparation' | 'profile'
  /** Relevance score (0-1) */
  score: number
  /** Matched terms */
  matches: string[]
  /** Entity name for display */
  name: string
}

/**
 * Search index configuration.
 */
export interface SearchIndexOptions {
  /** Path to data directory */
  dataPath: string
  /** Languages to index (default: ['en', 'zh-Hant', 'zh-Hans']) */
  languages?: string[]
}

/**
 * Full-text search index for Herbapedia entities.
 *
 * @example
 * ```typescript
 * const searchIndex = new SearchIndex({ dataPath: './data-herbapedia' })
 * await searchIndex.buildIndex()
 *
 * const results = searchIndex.search('ginger')
 * console.log(results[0].name) // "Ginger"
 * ```
 */
export class SearchIndex {
  private index: lunr.Index | null = null
  private dataPath: string
  private languages: string[]
  private entityMap = new Map<string, { name: string; type: string }>()

  constructor(options: SearchIndexOptions) {
    this.dataPath = options.dataPath
    this.languages = options.languages ?? ['en', 'zh-Hant', 'zh-Hans']
  }

  /**
   * Build the search index from all entities.
   * Call this once after creating the SearchIndex.
   */
  buildIndex(): void {
    const plants = this.loadAllPlants()

    this.index = lunr(function(this: lunr.Builder) {
      // Field references
      this.ref('iri')
      this.field('scientificName', { boost: 10 })
      this.field('name', { boost: 5 })
      this.field('commonName', { boost: 3 })
      this.field('description')

      // Add plants to index
      for (const plant of plants) {
        const doc = {
          iri: plant.iri,
          scientificName: plant.scientificName.toLowerCase(),
          name: plant.nameText,
          commonName: plant.commonNameText,
          description: plant.descriptionText,
        }
        this.add(doc)
      }
    })
  }

  /**
   * Search for entities matching a query.
   * @param query - Search query
   * @param limit - Maximum results (default: 20)
   */
  search(query: string, limit: number = 20): SearchResult[] {
    if (!this.index) {
      throw new Error('Search index not built. Call buildIndex() first.')
    }

    // Normalize query
    const normalizedQuery = query.toLowerCase().trim()

    // Perform search
    const results = this.index.query((q) => {
      // Exact term matches (high boost)
      q.term(normalizedQuery.split(/\s+/), { boost: 100 })

      // Prefix matches
      q.term(normalizedQuery.split(/\s+/).map(t => t + '*'), { boost: 10 })

      // Fuzzy matches (edit distance 1)
      q.term(normalizedQuery.split(/\s+/).map(t => t + '~1'), { boost: 1 })
    })

    // Format results
    return results
      .slice(0, limit)
      .map(result => {
        const entity = this.entityMap.get(result.ref)
        return {
          iri: result.ref,
          slug: this.extractSlug(result.ref),
          type: 'plant' as const,
          score: result.score,
          matches: result.matchData.metadata ? Object.keys(result.matchData.metadata) : [],
          name: entity?.name ?? this.extractSlug(result.ref),
        }
      })
  }

  /**
   * Search plants by Chinese name.
   */
  searchChinese(query: string, limit: number = 20): SearchResult[] {
    // Chinese search uses direct matching since Lunr doesn't tokenize Chinese well
    const results: SearchResult[] = []
    const normalizedQuery = query.toLowerCase()

    for (const [iri, entity] of this.entityMap.entries()) {
      if (entity.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          iri,
          slug: this.extractSlug(iri),
          type: 'plant',
          score: 1,
          matches: [query],
          name: entity.name,
        })
        if (results.length >= limit) break
      }
    }

    return results
  }

  // ===========================================================================

  /**
   * Load all plant species for indexing.
   */
  private loadAllPlants(): Array<{
    iri: string
    scientificName: string
    nameText: string
    commonNameText: string
    descriptionText: string
  }> {
    const plants: Array<{
      iri: string
      scientificName: string
      nameText: string
      commonNameText: string
      descriptionText: string
    }> = []

    const speciesDir = join(this.dataPath, 'entities/botanical/species')

    try {
      const slugs = readdirSync(speciesDir)
        .filter(name => statSync(join(speciesDir, name)).isDirectory())

      for (const slug of slugs) {
        const entityPath = join(speciesDir, slug, 'entity.jsonld')
        try {
          const content = readFileSync(entityPath, 'utf-8')
          const entity = JSON.parse(content) as PlantSpecies

          const iri = entity['@id']
          const nameText = this.extractText(entity.name)
          const commonNameText = typeof entity.commonName === 'object'
            ? this.extractText(entity.commonName as LanguageMap)
            : String(entity.commonName ?? '')
          const descriptionText = this.extractText(entity.description)

          // Store for lookup
          this.entityMap.set(iri, { name: nameText, type: 'plant' })

          plants.push({
            iri,
            scientificName: entity.scientificName ?? '',
            nameText,
            commonNameText,
            descriptionText,
          })
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return plants
  }

  /**
   * Extract text from a LanguageMap.
   */
  private extractText(map: LanguageMap | string | undefined): string {
    if (!map) return ''
    if (typeof map === 'string') return map

    const texts: string[] = []
    for (const lang of this.languages) {
      if (map[lang]) {
        texts.push(map[lang])
      }
    }
    return texts.join(' ')
  }

  /**
   * Extract slug from IRI.
   */
  private extractSlug(iri: string): string {
    const parts = iri.split('/')
    return parts[parts.length - 1] || ''
  }
}

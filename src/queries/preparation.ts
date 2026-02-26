/**
 * Herbal preparation queries.
 *
 * This module provides query methods for:
 * - HerbalPreparation
 * - Formula
 * - Preparation-to-source relationships
 * - Image fallback from source entities
 */

import type { HerbalPreparation } from '../../types/preparation'
import type { PlantSpecies, PlantPart } from '../../types/botanical'
import type { Entity } from '../types/entity'
import type { EntityLoader } from '../core/loader'
import { extractSlug } from '../core/loader'
import { BotanicalQueries } from './botanical'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * Image resolution result with fallback information.
 */
export interface ImageResult {
  /** The image path to use */
  image: string
  /** Whether this is a fallback from a source entity */
  isFallback: boolean
  /** The source entity IRI if fallback was used */
  fallbackSource?: string
}

/**
 * Preparation query methods.
 */
export class PreparationQueries {
  private botanical: BotanicalQueries
  private dataPath: string

  constructor(
    private loader: EntityLoader,
    botanicalQueries?: BotanicalQueries,
    dataPath?: string
  ) {
    this.botanical = botanicalQueries ?? new BotanicalQueries(loader)
    // Extract dataPath from loader or use current directory as fallback
    this.dataPath = dataPath ?? process.cwd()
  }

  // ===========================================================================
  // Preparations
  // ===========================================================================

  /**
   * Get an herbal preparation by slug.
   */
  getPreparation(slug: string): HerbalPreparation | null {
    return this.loader.load<HerbalPreparation>(`preparation/${slug}`)
  }

  /**
   * Get an herbal preparation by slug (async).
   */
  async getPreparationAsync(slug: string): Promise<HerbalPreparation | null> {
    return this.loader.loadAsync<HerbalPreparation>(`preparation/${slug}`)
  }

  // ===========================================================================
  // Image Resolution with Fallback
  // ===========================================================================

  /**
   * Get image for a preparation with fallback to source entity.
   *
   * Fallback chain:
   * 1. Preparation's own image (if exists on filesystem)
   * 2. Source entity's image (if preparation derivedFrom another entity)
   *
   * @param slug - The preparation slug
   * @param basePath - Optional base path for filesystem checks (defaults to this.dataPath)
   * @returns ImageResult with the image path and fallback metadata
   *
   * @example
   * ```typescript
   * const result = queries.getImageWithFallback('ginseng-extract')
   * // Returns: { image: 'media/images/ginseng/ginseng.jpg', isFallback: true, fallbackSource: '...' }
   * ```
   */
  getImageWithFallback(slug: string, basePath?: string): ImageResult {
    const prep = this.getPreparation(slug)
    const base = basePath ?? this.dataPath

    // 1. Check if preparation has its own image
    if (prep?.image) {
      const imagePath = join(base, prep.image)
      if (existsSync(imagePath)) {
        return {
          image: prep.image,
          isFallback: false
        }
      }
    }

    // 2. Fallback to source entity's image
    if (prep?.derivedFrom?.[0]) {
      const sourceIri = prep.derivedFrom[0]['@id']
      const sourceImage = this.getSourceEntityImage(sourceIri, base)

      if (sourceImage) {
        return {
          image: sourceImage,
          isFallback: true,
          fallbackSource: sourceIri
        }
      }
    }

    // 3. No image available
    return {
      image: '',
      isFallback: false
    }
  }

  /**
   * Get image for a preparation with fallback (async version).
   */
  async getImageWithFallbackAsync(slug: string, basePath?: string): Promise<ImageResult> {
    const prep = await this.getPreparationAsync(slug)
    const base = basePath ?? this.dataPath

    // 1. Check if preparation has its own image
    if (prep?.image) {
      const imagePath = join(base, prep.image)
      const { access } = await import('fs/promises')
      try {
        await access(imagePath)
        return {
          image: prep.image,
          isFallback: false
        }
      } catch {
        // Image file doesn't exist, continue to fallback
      }
    }

    // 2. Fallback to source entity's image
    if (prep?.derivedFrom?.[0]) {
      const sourceIri = prep.derivedFrom[0]['@id']
      const sourceImage = await this.getSourceEntityImageAsync(sourceIri, base)

      if (sourceImage) {
        return {
          image: sourceImage,
          isFallback: true,
          fallbackSource: sourceIri
        }
      }
    }

    // 3. No image available
    return {
      image: '',
      isFallback: false
    }
  }

  /**
   * Get image from a source entity (sync).
   */
  private getSourceEntityImage(sourceIri: string, basePath: string): string | null {
    const source = this.loader.load<Entity>(sourceIri)
    if (!source?.image) return null

    const imagePath = join(basePath, source.image)
    return existsSync(imagePath) ? source.image : null
  }

  /**
   * Get image from a source entity (async).
   */
  private async getSourceEntityImageAsync(sourceIri: string, basePath: string): Promise<string | null> {
    const source = await this.loader.loadAsync<Entity>(sourceIri)
    if (!source?.image) return null

    const imagePath = join(basePath, source.image)
    const { access } = await import('fs/promises')
    try {
      await access(imagePath)
      return source.image
    } catch {
      return null
    }
  }

  // ===========================================================================
  // Source Entity Queries
  // ===========================================================================

  /**
   * Get the source plant species for a preparation.
   */
  getSourcePlant(prepSlug: string): PlantSpecies | null {
    const prep = this.getPreparation(prepSlug)
    if (!prep?.derivedFrom?.[0]) return null

    const sourceRef = prep.derivedFrom[0]
    const source = this.loader.load(sourceRef['@id'])

    if (!source) return null

    // If source is a PlantPart, get its parent PlantSpecies
    if (this.isPlantPart(source)) {
      const part = source as PlantPart
      return this.loader.load<PlantSpecies>(part.partOf?.['@id'] ?? '')
    }

    // If source is already a PlantSpecies, return it
    if (this.isPlantSpecies(source)) {
      return source as PlantSpecies
    }

    return null
  }

  /**
   * Get the source plant part for a preparation.
   */
  getSourcePart(prepSlug: string): PlantPart | null {
    const prep = this.getPreparation(prepSlug)
    if (!prep?.derivedFrom?.[0]) return null

    const sourceRef = prep.derivedFrom[0]
    const source = this.loader.load(sourceRef['@id'])

    if (!source) return null

    if (this.isPlantPart(source)) {
      return source as PlantPart
    }

    return null
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private isPlantPart(entity: unknown): boolean {
    const e = entity as { '@type'?: string[] }
    return e['@type']?.includes('botany:PlantPart') ?? false
  }

  private isPlantSpecies(entity: unknown): boolean {
    const e = entity as { '@type'?: string[] }
    return e['@type']?.includes('botany:PlantSpecies') ?? false
  }
}

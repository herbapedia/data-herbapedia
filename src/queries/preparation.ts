/**
 * Herbal preparation queries.
 *
 * This module provides query methods for:
 * - HerbalPreparation
 * - Formula
 * - Preparation-to-source relationships
 */

import type { HerbalPreparation } from '../../types/preparation'
import type { PlantSpecies, PlantPart } from '../../types/botanical'
import type { EntityLoader } from '../core/loader'
import { extractSlug } from '../core/loader'
import { BotanicalQueries } from './botanical'

/**
 * Preparation query methods.
 */
export class PreparationQueries {
  private botanical: BotanicalQueries

  constructor(
    private loader: EntityLoader,
    botanicalQueries?: BotanicalQueries
  ) {
    this.botanical = botanicalQueries ?? new BotanicalQueries(loader)
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

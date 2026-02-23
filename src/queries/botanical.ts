/**
 * Botanical entity queries.
 *
 * This module provides query methods for:
 * - PlantSpecies
 * - PlantPart
 * - ChemicalCompound
 * - Related entity traversal
 *
 * Both sync and async methods are provided. Use async methods for production.
 */

import type {
  PlantSpecies,
  PlantPart,
  ChemicalCompound,
  ChemicalProfile,
  DNABarcode,
} from '../../types/botanical'
import type { EntityLoader } from '../core/loader'
import { extractSlug } from '../core/loader'

/**
 * Botanical query methods.
 */
export class BotanicalQueries {
  constructor(private loader: EntityLoader) {}

  // ===========================================================================
  // Plant Species
  // ===========================================================================

  /**
   * Get a plant species by slug (sync).
   * @deprecated Use getPlantSpeciesAsync for production
   */
  getPlantSpecies(slug: string): PlantSpecies | null {
    return this.loader.load<PlantSpecies>(`botanical/species/${slug}`)
  }

  /**
   * Get a plant species by slug (async).
   */
  async getPlantSpeciesAsync(slug: string): Promise<PlantSpecies | null> {
    return this.loader.loadAsync<PlantSpecies>(`botanical/species/${slug}`)
  }

  /**
   * Get all parts of a plant species (sync).
   * @deprecated Use getPartsOfPlantAsync for production
   */
  getPartsOfPlant(plantSlug: string): PlantPart[] {
    const plant = this.getPlantSpecies(plantSlug)
    if (!plant?.hasParts) return []

    return plant.hasParts
      .map(ref => this.getPlantPart(extractSlug(ref['@id'])))
      .filter((p): p is PlantPart => p !== null)
  }

  /**
   * Get all parts of a plant species (async).
   */
  async getPartsOfPlantAsync(plantSlug: string): Promise<PlantPart[]> {
    const plant = await this.getPlantSpeciesAsync(plantSlug)
    if (!plant?.hasParts) return []

    const parts = await this.loader.batchLoad<PlantPart>(
      plant.hasParts.map(ref => `botanical/part/${extractSlug(ref['@id'])}`)
    )

    return Array.from(parts.values()).filter((p): p is PlantPart => p !== null)
  }

  // ===========================================================================
  // Plant Parts
  // ===========================================================================

  /**
   * Get a plant part by slug (sync).
   * @deprecated Use getPlantPartAsync for production
   */
  getPlantPart(slug: string): PlantPart | null {
    return this.loader.load<PlantPart>(`botanical/part/${slug}`)
  }

  /**
   * Get a plant part by slug (async).
   */
  async getPlantPartAsync(slug: string): Promise<PlantPart | null> {
    return this.loader.loadAsync<PlantPart>(`botanical/part/${slug}`)
  }

  // ===========================================================================
  // Chemical Compounds
  // ===========================================================================

  /**
   * Get a chemical compound by slug (sync).
   * @deprecated Use getChemicalCompoundAsync for production
   */
  getChemicalCompound(slug: string): ChemicalCompound | null {
    return this.loader.load<ChemicalCompound>(`botanical/chemical/${slug}`)
  }

  /**
   * Get a chemical compound by slug (async).
   */
  async getChemicalCompoundAsync(slug: string): Promise<ChemicalCompound | null> {
    return this.loader.loadAsync<ChemicalCompound>(`botanical/chemical/${slug}`)
  }

  /**
   * Get all plant species that contain a specific chemical compound (sync).
   * @deprecated Use getPlantsContainingCompoundAsync for production
   */
  getPlantsContainingCompound(compoundSlug: string): PlantSpecies[] {
    const compound = this.getChemicalCompound(compoundSlug)
    if (!compound?.foundIn) return []

    return compound.foundIn
      .map(ref => {
        const iri = ref['@id']
        if (iri.includes('botanical/species/')) {
          return this.getPlantSpecies(extractSlug(iri))
        }
        return null
      })
      .filter((p): p is PlantSpecies => p !== null)
  }

  /**
   * Get all plant species that contain a specific chemical compound (async).
   */
  async getPlantsContainingCompoundAsync(compoundSlug: string): Promise<PlantSpecies[]> {
    const compound = await this.getChemicalCompoundAsync(compoundSlug)
    if (!compound?.foundIn) return []

    const iris = compound.foundIn
      .map(ref => ref['@id'])
      .filter(iri => iri.includes('botanical/species/'))
      .map(iri => `botanical/species/${extractSlug(iri)}`)

    const plants = await this.loader.batchLoad<PlantSpecies>(iris)
    return Array.from(plants.values()).filter((p): p is PlantSpecies => p !== null)
  }

  /**
   * Get all chemical compounds contained in a specific plant species (sync).
   * @deprecated Use getCompoundsInPlantAsync for production
   */
  getCompoundsInPlant(plantSlug: string): ChemicalCompound[] {
    const plant = this.getPlantSpecies(plantSlug)
    if (!plant?.containsChemical) return []

    return plant.containsChemical
      .map(ref => this.getChemicalCompound(extractSlug(ref['@id'])))
      .filter((c): c is ChemicalCompound => c !== null)
  }

  /**
   * Get all chemical compounds contained in a specific plant species (async).
   */
  async getCompoundsInPlantAsync(plantSlug: string): Promise<ChemicalCompound[]> {
    const plant = await this.getPlantSpeciesAsync(plantSlug)
    if (!plant?.containsChemical) return []

    const iris = plant.containsChemical.map(ref => `botanical/chemical/${extractSlug(ref['@id'])}`)
    const compounds = await this.loader.batchLoad<ChemicalCompound>(iris)
    return Array.from(compounds.values()).filter((c): c is ChemicalCompound => c !== null)
  }

  /**
   * Find plants that share common chemical compounds with another plant (sync).
   * @deprecated Use getPlantsWithSharedCompoundsAsync for production
   */
  getPlantsWithSharedCompounds(plantSlug: string): Map<string, PlantSpecies[]> {
    const compounds = this.getCompoundsInPlant(plantSlug)
    const result = new Map<string, PlantSpecies[]>()

    for (const compound of compounds) {
      const compoundSlug = extractSlug(compound['@id'])
      const plants = this.getPlantsContainingCompound(compoundSlug)
        .filter(p => extractSlug(p['@id']) !== plantSlug)

      if (plants.length > 0) {
        result.set(compoundSlug, plants)
      }
    }

    return result
  }

  /**
   * Find plants that share common chemical compounds with another plant (async).
   */
  async getPlantsWithSharedCompoundsAsync(plantSlug: string): Promise<Map<string, PlantSpecies[]>> {
    const compounds = await this.getCompoundsInPlantAsync(plantSlug)
    const result = new Map<string, PlantSpecies[]>()

    for (const compound of compounds) {
      const compoundSlug = extractSlug(compound['@id'])
      const plants = (await this.getPlantsContainingCompoundAsync(compoundSlug))
        .filter(p => extractSlug(p['@id']) !== plantSlug)

      if (plants.length > 0) {
        result.set(compoundSlug, plants)
      }
    }

    return result
  }

  // ===========================================================================
  // Chemical Profiles
  // ===========================================================================

  /**
   * Get a chemical profile for an entity (sync).
   * @deprecated Use getChemicalProfileAsync for production
   */
  getChemicalProfile(entitySlug: string): ChemicalProfile | null {
    return this.loader.load<ChemicalProfile>(`botanical/profile/${entitySlug}`)
  }

  /**
   * Get a chemical profile for an entity (async).
   */
  async getChemicalProfileAsync(entitySlug: string): Promise<ChemicalProfile | null> {
    return this.loader.loadAsync<ChemicalProfile>(`botanical/profile/${entitySlug}`)
  }

  // ===========================================================================
  // DNA Barcodes
  // ===========================================================================

  /**
   * Get a DNA barcode for a plant species (sync).
   * @deprecated Use getDNABarcodeAsync for production
   */
  getDNABarcode(speciesSlug: string): DNABarcode | null {
    return this.loader.load<DNABarcode>(`botanical/barcode/${speciesSlug}`)
  }

  /**
   * Get a DNA barcode for a plant species (async).
   */
  async getDNABarcodeAsync(speciesSlug: string): Promise<DNABarcode | null> {
    return this.loader.loadAsync<DNABarcode>(`botanical/barcode/${speciesSlug}`)
  }
}

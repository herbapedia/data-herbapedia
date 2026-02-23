/**
 * Entity Builder - Fluent API for creating new entities.
 *
 * This module provides a builder pattern for creating entities:
 * - PlantSpecies
 * - ChemicalCompound
 * - HerbalPreparation
 *
 * @example
 * ```typescript
 * const ginseng = EntityBuilder.plantSpecies()
 *   .scientificName('Panax ginseng')
 *   .name({ en: 'Ginseng', 'zh-Hant': '人蔘' })
 *   .family('Araliaceae')
 *   .wikidataID('Q192163')
 *   .containsChemical('ginsenosides')
 *   .build()
 * ```
 */

import type { LanguageMap } from '../types/core'
import type { PlantSpecies } from '../types/botanical'
import type { ChemicalCompound } from '../types/botanical'
import type { HerbalPreparation } from '../types/preparation'
import { HERBAPEDIA_BASE_IRI } from '../types/core'

/**
 * Base interface for all entity builders.
 */
interface EntityBuilder<T> {
  build(): T
}

/**
 * PlantSpecies builder options.
 */
interface PlantSpeciesOptions {
  scientificName?: string
  name?: LanguageMap
  commonName?: LanguageMap
  family?: string
  genus?: string
  description?: LanguageMap
  geographicalDistribution?: LanguageMap
  wikidataID?: string
  gbifID?: string
  ncbiTaxonID?: string
  containsChemical?: string[]
  hasParts?: string[]
}

/**
 * Builder for PlantSpecies entities.
 */
export class PlantSpeciesBuilder implements EntityBuilder<PlantSpecies> {
  private options: PlantSpeciesOptions = {}
  private chemicals: string[] = []
  private parts: string[] = []

  /**
   * Create a new PlantSpeciesBuilder.
   */
  static create(): PlantSpeciesBuilder {
    return new PlantSpeciesBuilder()
  }

  /**
   * Set the scientific name.
   */
  scientificName(name: string): this {
    this.options.scientificName = name
    return this
  }

  /**
   * Set the name (language map).
   */
  name(name: LanguageMap): this {
    this.options.name = name
    return this
  }

  /**
   * Set common name.
   */
  commonName(name: LanguageMap): this {
    this.options.commonName = name
    return this
  }

  /**
   * Set taxonomic family.
   */
  family(family: string): this {
    this.options.family = family
    return this
  }

  /**
   * Set genus.
   */
  genus(genus: string): this {
    this.options.genus = genus
    return this
  }

  /**
   * Set description.
   */
  description(desc: LanguageMap): this {
    this.options.description = desc
    return this
  }

  /**
   * Set geographical distribution.
   */
  geographicalDistribution(dist: LanguageMap): this {
    this.options.geographicalDistribution = dist
    return this
  }

  /**
   * Set Wikidata ID (Q-number).
   */
  wikidataID(id: string): this {
    this.options.wikidataID = id
    return this
  }

  /**
   * Set GBIF ID.
   */
  gbifID(id: string): this {
    this.options.gbifID = id
    return this
  }

  /**
   * Set NCBI Taxonomy ID.
   */
  ncbiTaxonID(id: string): this {
    this.options.ncbiTaxonID = id
    return this
  }

  /**
   * Add a chemical compound.
   */
  containsChemical(chemicalSlug: string): this {
    this.chemicals.push(chemicalSlug)
    return this
  }

  /**
   * Add multiple chemical compounds.
   */
  containsChemicals(...chemicals: string[]): this {
    this.chemicals.push(...chemicals)
    return this
  }

  /**
   * Add a plant part.
   */
  hasPart(partSlug: string): this {
    this.parts.push(partSlug)
    return this
  }

  /**
   * Build the PlantSpecies entity.
   */
  build(): PlantSpecies {
    // Generate slug from scientific name
    const slug = this.generateSlug(this.options.scientificName ?? '')
    const iri = `${HERBAPEDIA_BASE_IRI}entity/botanical/species/${slug}`

    const entity: PlantSpecies = {
      '@context': `${HERBAPEDIA_BASE_IRI}schema/context/core.jsonld`,
      '@id': iri,
      '@type': ['botany:PlantSpecies', 'herbapedia:BotanicalSource', 'schema:Plant'],
      name: this.options.name ?? { en: slug },
      scientificName: this.options.scientificName ?? '',
      family: this.options.family,
      genus: this.options.genus,
      description: this.options.description,
      geographicalDistribution: this.options.geographicalDistribution,
      sourceType: 'botanical',
      sourceSubType: 'plant',
      provenance: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        contributors: ['Generated via EntityBuilder'],
      },
    }

    // Add Wikidata ID
    if (this.options.wikidataID) {
      entity.wikidataID = this.options.wikidataID
    }

    // Add GBIF ID
    if (this.options.gbifID) {
      entity.gbifID = this.options.gbifID
    }

    // Add NCBI Taxonomy ID
    if (this.options.ncbiTaxonID) {
      entity.ncbiTaxonID = this.options.ncbiTaxonID
    }

    // Add chemical compounds
    if (this.chemicals.length > 0) {
      entity.containsChemical = this.chemicals.map(slug => ({
        '@id': `${HERBAPEDIA_BASE_IRI}entity/botanical/chemical/${slug}`,
      }))
    }

    // Add plant parts
    if (this.parts.length > 0) {
      entity.hasParts = this.parts.map(slug => ({
        '@id': `${HERBAPEDIA_BASE_IRI}entity/botanical/part/${slug}`,
      }))
    }

    return entity
  }

  /**
   * Generate a URL-friendly slug from scientific name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}

/**
 * ChemicalCompound builder options.
 */
interface ChemicalCompoundOptions {
  name?: LanguageMap
  commonName?: string[]
  molecularFormula?: string
  molecularWeight?: number
  chebiID?: string
  pubchemCID?: string
  inchi?: string
  inchiKey?: string
  description?: LanguageMap
  pharmacology?: string[]
  foundIn?: string[]
}

/**
 * Builder for ChemicalCompound entities.
 */
export class ChemicalCompoundBuilder implements EntityBuilder<ChemicalCompound> {
  private options: ChemicalCompoundOptions = {}
  private foundIn: string[] = []

  /**
   * Create a new ChemicalCompoundBuilder.
   */
  static create(): ChemicalCompoundBuilder {
    return new ChemicalCompoundBuilder()
  }

  /**
   * Set the name.
   */
  name(name: LanguageMap): this {
    this.options.name = name
    return this
  }

  /**
   * Set common names.
   */
  commonName(...names: string[]): this {
    this.options.commonName = names
    return this
  }

  /**
   * Set molecular formula.
   */
  molecularFormula(formula: string): this {
    this.options.molecularFormula = formula
    return this
  }

  /**
   * Set molecular weight.
   */
  molecularWeight(weight: number): this {
    this.options.molecularWeight = weight
    return this
  }

  /**
   * Set ChEBI ID.
   */
  chebiID(id: string): this {
    this.options.chebiID = id
    return this
  }

  /**
   * Set PubChem CID.
   */
  pubchemCID(cid: string): this {
    this.options.pubchemCID = cid
    return this
  }

  /**
   * Set InChI string.
   */
  inchi(inchi: string): this {
    this.options.inchi = inchi
    return this
  }

  /**
   * Set InChIKey.
   */
  inchiKey(key: string): this {
    this.options.inchiKey = key
    return this
  }

  /**
   * Set description.
   */
  description(desc: LanguageMap): this {
    this.options.description = desc
    return this
  }

  /**
   * Add pharmacological effect.
   */
  pharmacology(effect: string): this {
    if (!this.options.pharmacology) {
      this.options.pharmacology = []
    }
    this.options.pharmacology.push(effect)
    return this
  }

  /**
   * Add plant that contains this compound.
   */
  foundIn(plantSlug: string): this {
    this.foundIn.push(plantSlug)
    return this
  }

  /**
   * Build the ChemicalCompound entity.
   */
  build(): ChemicalCompound {
    const name = this.options.name?.en ?? 'Unknown'
    const slug = this.generateSlug(name)
    const iri = `${HERBAPEDIA_BASE_IRI}entity/botanical/chemical/${slug}`

    const entity: ChemicalCompound = {
      '@context': `${HERBAPEDIA_BASE_IRI}schema/context/core.jsonld`,
      '@id': iri,
      '@type': ['botany:ChemicalCompound', 'schema:BioChemEntity'],
      name: this.options.name ?? { en: slug },
      provenance: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        contributors: ['Generated via EntityBuilder'],
      },
    }

    // Add optional fields
    if (this.options.commonName) {
      entity.commonName = this.options.commonName
    }
    if (this.options.molecularFormula) {
      entity.molecularFormula = this.options.molecularFormula
    }
    if (this.options.molecularWeight) {
      entity.molecularWeight = this.options.molecularWeight
    }
    if (this.options.chebiID) {
      entity.chebiID = this.options.chebiID
    }
    if (this.options.pubchemCID) {
      entity.pubchemCID = this.options.pubchemCID
    }
    if (this.options.inchi) {
      entity.inchi = this.options.inchi
    }
    if (this.options.inchiKey) {
      entity.inchiKey = this.options.inchiKey
    }
    if (this.options.description) {
      entity.description = this.options.description
    }
    if (this.options.pharmacology) {
      entity.pharmacology = this.options.pharmacology
    }
    if (this.foundIn.length > 0) {
      entity.foundIn = this.foundIn.map(slug => ({
        '@id': `${HERBAPEDIA_BASE_IRI}entity/botanical/species/${slug}`,
      }))
    }

    return entity
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}

/**
 * Main EntityBuilder factory.
 *
 * @example
 * ```typescript
 * import { EntityBuilder } from '@herbapedia/data'
 *
 * const ginseng = EntityBuilder.plantSpecies()
 *   .scientificName('Panax ginseng')
 *   .family('Araliaceae')
 *   .wikidataID('Q192163')
 *   .build()
 * ```
 */
export const EntityBuilder = {
  /**
   * Create a PlantSpecies builder.
   */
  plantSpecies(): PlantSpeciesBuilder {
    return PlantSpeciesBuilder.create()
  },

  /**
   * Create a ChemicalCompound builder.
   */
  chemicalCompound(): ChemicalCompoundBuilder {
    return ChemicalCompoundBuilder.create()
  },
}

export default EntityBuilder

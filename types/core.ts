/**
 * Core JSON-LD types for Herbapedia
 *
 * IMPORTANT: Content properties are SYSTEM-SCOPED, not generic.
 * - Use tcm:traditionalUsage, ayurveda:traditionalUsage, western:traditionalUsage
 * - NOT herbapedia:traditionalUsage (ambiguous)
 */

// Base JSON-LD types
export interface JsonLdContext {
  '@context': string | string[] | Record<string, unknown>
}

export interface JsonLdNode {
  '@id': string
  '@type'?: string | string[]
}

export interface LanguageMap {
  [languageCode: string]: string
}

// Plant Part types
export type PlantPartType =
  | 'root'
  | 'rhizome'
  | 'tuber'
  | 'bulb'
  | 'stem'
  | 'bark'
  | 'leaf'
  | 'flower'
  | 'fruit'
  | 'seed'
  | 'whole-plant'
  | 'resin'
  | 'essential-oil'

// Plant Part Entity
export interface PlantPart extends JsonLdNode {
  '@type': 'herbapedia:PlantPart'
  name?: LanguageMap
  partOf: string // @id reference to plant
  plantPartType?: PlantPartType
  containsChemical?: string[] // @id references
  image?: string
}

/**
 * Core Plant Entity
 *
 * Contains ONLY language-agnostic botanical data.
 * System-specific content (TCM, Ayurveda, Western) lives in system profiles.
 */
export interface Plant extends JsonLdNode {
  '@context': string
  '@id': string
  '@type': ['schema:Plant', 'herbapedia:MedicinalPlant']

  // Taxonomy (universal)
  scientificName: string
  family?: string
  genus?: string
  species?: string
  taxonID?: string
  gbifID?: string

  // Names (multilingual, but NOT cultural interpretations)
  name: LanguageMap
  alternateName?: string[]
  commonName?: LanguageMap

  // Botanical description (brief, factual)
  description?: LanguageMap
  botanicalDescription?: LanguageMap
  geographicalDistribution?: LanguageMap

  // Structure
  hasPart?: string[] // @id references to PlantPart

  // Chemistry
  containsChemical?: string[] // @id references
  hasPharmacologicalAction?: string[]

  // Media
  image?: string
  url?: string

  // External links
  sameAs?: string[] // Wikidata, Wikipedia, GBIF IRIs

  // Provenance
  source?: string
  sourceUrl?: string
  creator?: string
  created?: string
  modified?: string
  license?: string
}

// Chemical Compound Entity
export interface ChemicalCompound extends JsonLdNode {
  '@context': string
  '@id': string
  '@type': 'herbapedia:ChemicalCompound'

  name: LanguageMap
  scientificName?: string
  casNumber?: string
  pubChemId?: string
  formula?: string

  hasPharmacologicalAction?: string[]

  sameAs?: string[]
}

// Pharmacological Action
export interface PharmacologicalAction extends JsonLdNode {
  '@id': string
  '@type': 'herbapedia:PharmacologicalAction'

  name: LanguageMap
  description?: LanguageMap
}

// Category (for classification systems)
export interface Category extends JsonLdNode {
  '@id': string
  '@type': ['skos:Concept', 'herbapedia:Category']

  prefLabel: LanguageMap
  altLabel?: string[]
  definition?: LanguageMap

  broader?: string[]
  narrower?: string[]
  related?: string[]
}

/**
 * Base System Profile
 *
 * All system profiles (TCM, Ayurveda, Western) share this base structure.
 * Content properties are scoped to each system's vocabulary.
 */
export interface SystemProfileBase extends JsonLdNode {
  '@context': string | string[]

  // Link to plant entity
  derivedFromPlant: string // @id reference

  // Names (may differ from plant names)
  name: LanguageMap
  alternateName?: string[]

  // System-specific content (implemented in subclasses)
  // Each system defines: traditionalUsage, modernResearch, functions, etc.

  // Actions and indications
  actions?: string[]
  indications?: string[]
  contraindications?: LanguageMap
  dosage?: LanguageMap

  // Relationships
  isRelatedTo?: string[]
  isSimilarTo?: string[]
  sameAs?: string[]

  // Provenance
  source?: string
  sourceUrl?: string
  creator?: string
  created?: string
  modified?: string
  license?: string
}

// Herb Index Entry
export interface HerbIndexEntry {
  slug: string
  plantId: string
  profiles: {
    tcm?: string
    ayurveda?: string
    western?: string
  }
  languages: string[]
  hasImage: boolean
}

// Master Index
export interface MasterIndex {
  version: string
  generated: string
  totalCount: number
  plants: HerbIndexEntry[]
  systems: {
    tcm: number
    ayurveda: number
    western: number
  }
}

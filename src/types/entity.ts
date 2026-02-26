/**
 * Entity type definitions for Herbapedia
 */

import type { LanguageMap } from './language-map.js'

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base entity interface
 */
export interface Entity {
  '@id': string
  '@type': string[]
  '@context'?: string | string[]
  name?: LanguageMap
  image?: string
  description?: LanguageMap
  images?: string[]
  sameAs?: ExternalReference[]
  source?: Provenance
}

/**
 * External reference to Wikidata, GBIF, NCBI, etc.
 */
export interface ExternalReference {
  '@id': string
  description?: string
}

/**
 * Provenance information
 */
export interface Provenance {
  source?: string
  dateCreated?: string
  dateModified?: string
  author?: string
  license?: string
}

// ============================================================================
// Botanical Types
// ============================================================================

/**
 * Plant species entity
 */
export interface PlantSpecies extends Entity {
  '@type': ['botany:PlantSpecies', 'schema:Plant', 'herbapedia:BotanicalSource']
  scientificName: string
  family?: string
  genus?: string
  species?: string
  commonNames?: LanguageMap
  botanicalDescription?: LanguageMap
  habitat?: LanguageMap
  distribution?: LanguageMap
  conservationStatus?: string
  gbifID?: string
  wikidataID?: string
  ncbiTaxonomyID?: number
  hasParts?: PlantPart[]
  containsChemical?: ChemicalReference[]
  hasChemicalProfile?: ChemicalProfileReference[]
  hasDNABarcode?: DNABarcodeReference[]
}

/**
 * Plant part reference
 */
export interface PlantPartReference {
  '@id': string
  partType?: string
}

/**
 * Plant part entity
 */
export interface PlantPart extends Entity {
  '@type': ['botany:PlantPart', 'herbapedia:PlantPart']
  partOf: { '@id': string }
  partType: string
  botanicalDescription?: LanguageMap
  containsChemical?: ChemicalReference[]
}

/**
 * Chemical compound reference
 */
export interface ChemicalReference {
  '@id': string
}

/**
 * Chemical compound entity
 */
export interface ChemicalCompound extends Entity {
  '@type': ['botany:ChemicalCompound', 'herbapedia:ChemicalCompound']
  chemicalFormula?: string
  iupacName?: LanguageMap
  molecularWeight?: number
  foundIn?: { '@id': string }[]
  chebiID?: string
  pubchemCID?: number
  inchi?: string
  inchiKey?: string
}

/**
 * Chemical profile reference
 */
export interface ChemicalProfileReference {
  '@id': string
}

/**
 * Chemical profile entity
 */
export interface ChemicalProfile extends Entity {
  '@type': ['botany:ChemicalProfile']
  profileOf: { '@id': string }
  identificationMethod?: string[]
  referenceCompounds?: ReferenceCompound[]
  assayLimits?: Record<string, AssayLimit>
}

/**
 * Reference compound in chemical analysis
 */
export interface ReferenceCompound {
  name: string
  chineseName?: string
  formula?: string
  purpose?: string[]
}

/**
 * Assay limit for chemical analysis
 */
export interface AssayLimit {
  compound: string
  minimumContent?: string
  basis?: string
}

/**
 * DNA barcode reference
 */
export interface DNABarcodeReference {
  '@id': string
}

/**
 * DNA barcode entity
 */
export interface DNABarcode extends Entity {
  '@type': ['botany:DNABarcode', 'herbapedia:DNABarcode']
  barcodes: { '@id': string }[]
  loci?: Locus[]
  specimen?: DNASpecimen
}

/**
 * DNA locus
 */
export interface Locus {
  name: string
  fullName?: string
  sequenceLength?: number
  consensusSequence?: string
  specimenCount?: number
  specimens?: string[]
}

/**
 * DNA specimen metadata
 */
export interface DNASpecimen {
  gcmtiCode?: string
  type?: string
  count?: number
}

// ============================================================================
// Preparation Types
// ============================================================================

/**
 * Herbal preparation entity (Central Pivot)
 */
export interface HerbalPreparation extends Entity {
  '@type': ['herbal:HerbalPreparation', 'schema:DietarySupplement']
  derivedFrom: { '@id': string }
  preparationMethod?: { '@id': string }
  form?: { '@id': string }
  hasTCMProfile?: TCMProfileReference[]
  hasWesternProfile?: WesternProfileReference[]
  hasAyurvedaProfile?: AyurvedaProfileReference[]
  hasUnaniProfile?: UnaniProfileReference[]
  hasMongolianProfile?: MongolianProfileReference[]
}

// ============================================================================
// Profile Types
// ============================================================================

/**
 * TCM profile reference
 */
export interface TCMProfileReference {
  '@id': string
}

/**
 * TCM profile entity
 */
export interface TCMProfile extends Entity {
  '@type': ['tcm:Herb', 'tcm:HerbProfile', 'herbapedia:MedicineSystemProfile']
  derivedFromPlant: { '@id': string }
  pinyin?: string
  hasCategory: { '@id': string }
  hasNature: { '@id': string }
  hasFlavor: { '@id': string }[]
  entersMeridian: { '@id': string }[]
  tcmFunctions?: LanguageMap
  tcmTraditionalUsage?: LanguageMap
  tcmModernResearch?: LanguageMap
  tcmHistory?: LanguageMap
  tcmSafetyConsideration?: LanguageMap
  dosage?: LanguageMap
  contraindications?: LanguageMap
  combinesWith?: TCMProfileReference[]
}

/**
 * Western profile reference
 */
export interface WesternProfileReference {
  '@id': string
}

/**
 * Western herbal profile entity
 */
export interface WesternHerbalProfile extends Entity {
  '@type': ['western:Herb', 'herbapedia:MedicineSystemProfile']
  derivedFromPlant: { '@id': string }
  hasAction: { '@id': string }[]
  hasOrganAffinity?: { '@id': string }[]
  hasSystemAffinity?: { '@id': string }[]
  westernTraditionalUsage?: LanguageMap
  westernModernResearch?: LanguageMap
  dosage?: LanguageMap
  contraindications?: LanguageMap
  interactions?: LanguageMap
}

/**
 * Ayurveda profile reference
 */
export interface AyurvedaProfileReference {
  '@id': string
}

/**
 * Ayurveda profile entity
 */
export interface AyurvedaProfile extends Entity {
  '@type': ['ayurveda:Dravya', 'herbapedia:MedicineSystemProfile']
  derivedFromPlant: { '@id': string }
  sanskritName?: LanguageMap
  hasRasa: { '@id': string }[]
  hasGuna?: { '@id': string }[]
  hasVirya: { '@id': string }
  hasVipaka?: { '@id': string }
  affectsDosha?: { '@id': string }[]
  ayurvedaTraditionalUsage?: LanguageMap
  ayurvedaModernResearch?: LanguageMap
}

/**
 * Unani profile reference
 */
export interface UnaniProfileReference {
  '@id': string
}

/**
 * Unani profile entity
 */
export interface UnaniProfile extends Entity {
  '@type': ['unani:Drug', 'herbapedia:MedicineSystemProfile']
  derivedFromPlant: { '@id': string }
  unaniName?: LanguageMap
  hasTemperament: { '@id': string }
  hasDegree?: number
  unaniTraditionalUsage?: LanguageMap
}

/**
 * Mongolian profile reference
 */
export interface MongolianProfileReference {
  '@id': string
}

/**
 * Mongolian profile entity
 */
export interface MongolianProfile extends Entity {
  '@type': ['mongolian:Herb', 'herbapedia:MedicineSystemProfile']
  derivedFromPlant: { '@id': string }
  mongolianName?: LanguageMap
  affectsRoots: { '@id': string }[]
  hasElement?: { '@id': string }
  hasTaste?: { '@id': string }
  mongolianTraditionalUsage?: LanguageMap
}

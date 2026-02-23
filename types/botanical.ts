/**
 * Botanical entity types for Herbapedia.
 *
 * These types correspond to the JSON schemas in schema/json-schema/botanical/
 *
 * ARCHITECTURE:
 * - PlantSpecies: Pure botanical facts (taxonomy, distribution, external IDs)
 * - PlantPart: A specific part of a specific plant (belongs to PlantSpecies)
 * - ChemicalCompound: A chemical entity
 *
 * IMPORTANT: These entities contain NO therapeutic information.
 * Therapeutic interpretations belong in MedicineSystemProfiles.
 */

import type { Entity, IRIReference, LanguageMap, ExternalReference, Provenance } from './core'

// ============================================================================
// Plant Part Type Enumeration
// ============================================================================

/**
 * Controlled vocabulary for plant part types.
 */
export type PlantPartType =
  | 'root'
  | 'rhizome'
  | 'tuber'
  | 'bulb'
  | 'corm'
  | 'stem'
  | 'bark'
  | 'branch'
  | 'twig'
  | 'leaf'
  | 'needle'
  | 'flower'
  | 'flower-bud'
  | 'fruit'
  | 'fruit-peel'
  | 'seed'
  | 'kernel'
  | 'nut'
  | 'berry'
  | 'pod'
  | 'resin'
  | 'gum'
  | 'sap'
  | 'latex'
  | 'oil-gland'
  | 'trichome'
  | 'spore'
  | 'whole-plant'
  | 'aerial-part'
  | 'underground-part'

// ============================================================================
// Growth Form and Lifecycle
// ============================================================================

export type GrowthForm = 'herb' | 'shrub' | 'tree' | 'vine' | 'climber' | 'epiphyte' | 'aquatic'

export type Lifecycle = 'annual' | 'biennial' | 'perennial'

export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE'

// ============================================================================
// Taxonomic Classification
// ============================================================================

export interface TaxonomicClassification {
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
}

// ============================================================================
// Plant Species
// ============================================================================

/**
 * A botanical species entity.
 *
 * Contains ONLY botanical facts:
 * - Taxonomy (family, genus, species)
 * - Nomenclature (scientific name, common names)
 * - Distribution (origin, habitat, geography)
 * - External IDs (GBIF, POWO, Wikidata)
 *
 * Does NOT contain:
 * - TCM properties (nature, flavor, meridian) - belongs in TCMProfile
 * - Western herbal actions - belongs in WesternHerbalProfile
 * - Ayurvedic properties - belongs in AyurvedaProfile
 *
 * NOTE: Non-plant entities (vitamins, minerals, nutrients) may not have
 * scientificName. These are stored in the same directory for organizational
 * convenience but are identified by their @type.
 */
export interface PlantSpecies extends Entity {
  '@id': `botanical/species/${string}`
  '@type': ['botany:PlantSpecies', ...string[]]

  // Nomenclature
  // Optional for non-plant entities (vitamins, minerals, nutrients)
  scientificName?: string
  scientificNameAuthorship?: string
  family?: string
  genus?: string
  specificEpithet?: string

  // Taxonomy
  taxonomicClassification?: TaxonomicClassification

  // External Identifiers
  gbifID?: string
  powoID?: string
  ncbiTaxonID?: string
  wikidataID?: string

  // Common Names (multilingual)
  commonName?: LanguageMap

  // Distribution
  habitat?: LanguageMap
  origin?: LanguageMap
  geographicalDistribution?: LanguageMap

  // Morphology
  growthForm?: GrowthForm
  lifecycle?: Lifecycle
  plantHeight?: {
    min?: number
    max?: number
  }

  // Relationships
  hasParts?: IRIReference[]
  hasChemicalProfile?: IRIReference
  hasDNABarcode?: IRIReference
  containsChemical?: IRIReference[]

  // Life Stage Relationships (for fungi, etc.)
  // Links species to its life stages (spores, mycelium, fruiting body)
  hasLifeStage?: IRIReference[]
  // Links species to its forms (juvenile, adult, flowering, etc.)
  hasForm?: IRIReference[]
  // What this species produces (e.g., fruiting body produces spores)
  produces?: IRIReference[]
  // Extracts derived from this species (essential oils, etc.)
  hasExtract?: IRIReference[]
  // Processed forms of this species
  processedInto?: IRIReference[]

  // Subspecies/Varieties
  cultivars?: Array<{
    name: string
    description?: string
  }>
  subspecies?: Array<{
    name: string
    authority?: string
  }>
  relatedSpecies?: IRIReference[]

  // Reverse Life Stage Relationships
  // Used when this entity IS a life stage/form of another species
  // e.g., lingzhi-spores isLifeStageOf lingzhi-reishi
  isLifeStageOf?: IRIReference
  // e.g., a juvenile form isFormOf the species
  isFormOf?: IRIReference
  // e.g., spores are produced by the fruiting body
  producedBy?: IRIReference
  // e.g., lavender-oil isExtractOf lavender
  isExtractOf?: IRIReference
  // e.g., shoudihuang isProcessedFrom dihuang
  isProcessedFrom?: IRIReference

  // Conservation
  conservationStatus?: ConservationStatus
}

// ============================================================================
// Plant Part
// ============================================================================

/**
 * A specific part of a specific plant species.
 *
 * Examples:
 * - Ginger rhizome (botanical/part/zingiber-officinale-rhizome)
 * - Ginseng root (botanical/part/panax-ginseng-root)
 * - Peppermint leaf (botanical/part/mentha-piperita-leaf)
 */
export interface PlantPart extends Entity {
  '@id': `botanical/part/${string}`
  '@type': ['botany:PlantPart', ...string[]]

  // Parent relationship
  partOf: IRIReference

  // Part classification
  partType: PlantPartType

  // Harvest and preparation
  harvestSeason?: LanguageMap
  preparationNotes?: LanguageMap
  morphology?: LanguageMap

  // Chemistry
  hasChemicalProfile?: IRIReference
  containsChemical?: IRIReference[]
  constituents?: Array<{
    name: string
    percentage?: string
    notes?: string
  }>
}

// ============================================================================
// Chemical Compound
// ============================================================================

/**
 * A chemical compound found in plants.
 */
export interface ChemicalCompound extends Entity {
  '@id': `botanical/chemical/${string}`
  '@type': ['botany:ChemicalCompound', ...string[]]

  // Nomenclature
  iupacName?: string
  commonName?: string[]
  systematicName?: string

  // Identifiers
  inchi?: string
  inchiKey?: string
  smiles?: string
  molecularFormula?: string
  molecularWeight?: number
  casNumber?: string
  pubchemCID?: string
  chebiID?: string
  chemspiderID?: string
  unii?: string

  // Classification
  compoundClass?: string

  // Relationships
  isomers?: IRIReference[]
  derivatives?: IRIReference[]
  foundIn?: IRIReference[]

  // Pharmacology
  pharmacology?: string[]
  bioavailability?: LanguageMap
  safetyData?: {
    ld50?: string
    toxicity?: string
    warnings?: string[]
  }
}

// ============================================================================
// Chemical Profile
// ============================================================================

/**
 * Chemical composition profile for a plant or plant part.
 */
export interface ChemicalProfile extends Entity {
  '@id': `botanical/profile/${string}`
  '@type': ['botany:ChemicalProfile', ...string[]]

  // What this profiles
  profileOf: IRIReference

  // Components
  components?: Array<{
    compound: IRIReference
    percentage?: string
    concentration?: string
    notes?: string
  }>

  // Analysis details
  analysisMethod?: string
  analysisDate?: string
  referenceSource?: string
}

// ============================================================================
// DNA Barcode
// ============================================================================

/**
 * DNA barcode for species identification.
 */
export interface DNABarcode extends Entity {
  '@id': `botanical/barcode/${string}`
  '@type': ['botany:DNABarcode', ...string[]]

  // What this barcodes
  barcodes: IRIReference

  // Locus information
  locus: string // e.g., 'rbcL', 'matK', 'ITS', 'trnL-F'
  sequence: string
  accessionNumber?: string // GenBank accession

  // Quality
  length?: number
  quality?: string
}

// ============================================================================
// Type Guards
// ============================================================================

export function isPlantSpecies(entity: Entity): entity is PlantSpecies {
  return entity['@type'].includes('botany:PlantSpecies')
}

export function isPlantPart(entity: Entity): entity is PlantPart {
  return entity['@type'].includes('botany:PlantPart')
}

export function isChemicalCompound(entity: Entity): entity is ChemicalCompound {
  return entity['@type'].includes('botany:ChemicalCompound')
}

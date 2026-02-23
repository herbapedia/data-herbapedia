/**
 * Source Material types for Herbapedia.
 *
 * This module defines the ontology for all source materials used in herbal medicine.
 * Source materials are classified into four mutually exclusive categories:
 *
 * - BotanicalSource: Plants, fungi, algae
 * - ZoologicalSource: Animal-derived materials
 * - MineralSource: Minerals and inorganic substances
 * - ChemicalSource: Isolated compounds, vitamins, synthetic substances
 *
 * ARCHITECTURE PRINCIPLES:
 * - MECE: Categories are Mutually Exclusive, Collectively Exhaustive
 * - Each source material has exactly ONE primary classification
 * - Essential oils are NOT SourceMaterial - they are HerbalPreparation (extracts)
 * - Processed products are NOT SourceMaterial - they are HerbalPreparation
 *
 * @see docs/ONTOLOGY.md for full documentation
 */

import type { Entity, IRIReference, LanguageMap, Provenance } from './core'

// ============================================================================
// Source Material Type Enumeration
// ============================================================================

/**
 * The primary category of a source material.
 * Each entity belongs to exactly one category.
 */
export type SourceMaterialType =
  | 'botanical'   // Plants, fungi, algae
  | 'zoological'  // Animal products
  | 'mineral'     // Minerals
  | 'chemical'    // Isolated compounds

/**
 * Sub-type for botanical sources.
 */
export type BotanicalSubType =
  | 'plant'    // Angiosperms, gymnosperms
  | 'fungus'   // Mushrooms, molds
  | 'alga'     // Seaweed, algae

/**
 * Sub-type for zoological sources.
 */
export type ZoologicalSubType =
  | 'animal-part'   // Antler, horn, shell
  | 'animal-fluid'  // Bird's nest (saliva), musk
  | 'fossil'        // Dragon bone, fossilized materials

// ============================================================================
// Source Material Base Interface
// ============================================================================

/**
 * Abstract base interface for all source materials.
 *
 * All medicinal substances derive from some source material.
 * This is the root of the source material type hierarchy.
 */
export interface SourceMaterial extends Entity {
  /** The primary category of this source material */
  sourceType: SourceMaterialType

  /** Optional sub-type for more specific classification */
  sourceSubType?: string

  /** Wikidata entity ID (Q number) */
  wikidataID?: string

  /** Provenance information */
  provenance?: Provenance
}

// ============================================================================
// Botanical Source
// ============================================================================

/**
 * Botanical source materials: plants, fungi, and algae.
 *
 * This is the primary source type for herbal medicine.
 * Most Traditional Chinese Medicine herbs are botanical sources.
 *
 * Examples:
 * - Zingiber officinale (ginger) - plant
 * - Ganoderma lucidum (lingzhi/reishi) - fungus
 * - Sargassum fusiforme (haizao) - alga
 *
 * NOTE: Essential oils extracted from plants are NOT BotanicalSource.
 * They are HerbalPreparation with isExtractOf relationship to the source plant.
 */
export interface BotanicalSource extends SourceMaterial {
  '@id': `botanical/species/${string}`
  '@type': ['herbapedia:BotanicalSource', 'botany:PlantSpecies' | 'mycology:FungalSpecies' | 'phycology:AlgalSpecies', ...string[]]

  sourceType: 'botanical'
  sourceSubType?: BotanicalSubType

  // Taxonomic information
  scientificName?: string
  scientificNameAuthorship?: string
  family?: string
  genus?: string
  specificEpithet?: string

  // External identifiers
  gbifID?: string      // Global Biodiversity Information Facility
  powoID?: string      // Plants of the World Online
  ncbiTaxonID?: string // NCBI Taxonomy Database
  wikidataID?: string

  // Common names
  commonName?: LanguageMap

  // Distribution
  habitat?: LanguageMap
  origin?: LanguageMap
  geographicalDistribution?: LanguageMap

  // Morphology
  growthForm?: 'herb' | 'shrub' | 'tree' | 'vine' | 'climber' | 'epiphyte' | 'aquatic'
  lifecycle?: 'annual' | 'biennial' | 'perennial'

  // Relationships
  hasParts?: IRIReference[]           // Links to PlantPart entities
  hasChemicalProfile?: IRIReference   // Chemical composition
  hasDNABarcode?: IRIReference        // DNA barcode for identification
  containsChemical?: IRIReference[]   // Chemical compounds present

  // Life stage relationships (for fungi, etc.)
  hasLifeStage?: IRIReference[]
  isLifeStageOf?: IRIReference
  produces?: IRIReference[]
  producedBy?: IRIReference

  // Extract relationships
  hasExtract?: IRIReference[]

  // Processing relationships
  processedInto?: IRIReference[]
}

// ============================================================================
// Zoological Source
// ============================================================================

/**
 * Zoological source materials: animal-derived substances.
 *
 * Examples in Traditional Chinese Medicine:
 * - deer-antler (鹿茸) - Cervus nippon antler
 * - bird's-nest (燕窝) - Swiftlet saliva nests
 * - dragon-bone (龙骨) - Fossilized mammal bones
 * - turtle-shell (龟甲) - Chinemys reevesii shell
 *
 * These are NOT botanical sources and should not have gbifID.
 */
export interface ZoologicalSource extends SourceMaterial {
  '@id': `zoological/source/${string}`
  '@type': ['herbapedia:ZoologicalSource', ...string[]]

  sourceType: 'zoological'
  sourceSubType?: ZoologicalSubType

  // Animal information
  animalName?: LanguageMap       // Common name of the animal
  animalScientificName?: string  // Scientific name (e.g., "Cervus nippon")
  animalPart?: string            // Part used (e.g., "antler", "shell", "nest")

  // External identifiers
  wikidataID?: string
  gbifID?: string  // For the animal species, not the product

  // Processing
  processingMethod?: LanguageMap  // How the animal part is processed

  // Conservation status
  conservationNote?: LanguageMap  // CITES status, sustainability notes
}

// ============================================================================
// Mineral Source
// ============================================================================

/**
 * Mineral source materials: inorganic substances.
 *
 * Examples:
 * - Calcium (钙)
 * - Iron (铁)
 * - Zinc (锌)
 * - Sulfur (硫)
 *
 * These are elements or minerals, not organic substances.
 */
export interface MineralSource extends SourceMaterial {
  '@id': `mineral/source/${string}`
  '@type': ['herbapedia:MineralSource', ...string[]]

  sourceType: 'mineral'

  // Chemical information
  chemicalFormula?: string    // e.g., "Ca" for calcium, "Fe" for iron
  casNumber?: string          // CAS Registry Number
  atomicNumber?: number       // For elements

  // External identifiers
  wikidataID?: string
  pubchemCID?: string

  // Common names
  commonName?: LanguageMap
}

// ============================================================================
// Chemical Source
// ============================================================================

/**
 * Chemical source materials: isolated or synthesized compounds.
 *
 * This includes:
 * - Vitamins (vitamin A, vitamin C, etc.)
 * - Amino acids (lysine, glycine, etc.)
 * - Fatty acids (omega-3, omega-6)
 * - Other isolated compounds (glucosamine, chondroitin)
 *
 * These are typically produced by extraction, synthesis, or fermentation,
 * not directly from a specific plant or animal source.
 */
export interface ChemicalSource extends SourceMaterial {
  '@id': `chemical/source/${string}`
  '@type': ['herbapedia:ChemicalSource', ...string[]]

  sourceType: 'chemical'
  chemicalSubType?: 'vitamin' | 'amino-acid' | 'fatty-acid' | 'compound' | 'nutrient'

  // Chemical information
  iupacName?: string           // IUPAC systematic name
  commonName?: string[]        // Common names
  chemicalFormula?: string     // Molecular formula
  molecularWeight?: number     // Molecular weight
  casNumber?: string           // CAS Registry Number
  inchi?: string               // InChI identifier
  inchiKey?: string            // InChIKey
  smiles?: string              // SMILES notation

  // External identifiers
  wikidataID?: string
  pubchemCID?: string          // PubChem Compound ID
  chebiID?: string             // ChEBI ID
  unii?: string                // UNII (Unique Ingredient Identifier)

  // Biological activity
  biologicalFunction?: LanguageMap

  // Safety information
  safetyData?: {
    ld50?: string
    toxicity?: string
    warnings?: string[]
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an entity is a BotanicalSource.
 */
export function isBotanicalSource(entity: Entity): entity is BotanicalSource {
  const types = entity['@type'] || []
  return types.includes('herbapedia:BotanicalSource') ||
         types.includes('botany:PlantSpecies') ||
         types.includes('mycology:FungalSpecies')
}

/**
 * Type guard to check if an entity is a ZoologicalSource.
 */
export function isZoologicalSource(entity: Entity): entity is ZoologicalSource {
  const types = entity['@type'] || []
  return types.includes('herbapedia:ZoologicalSource')
}

/**
 * Type guard to check if an entity is a MineralSource.
 */
export function isMineralSource(entity: Entity): entity is MineralSource {
  const types = entity['@type'] || []
  return types.includes('herbapedia:MineralSource')
}

/**
 * Type guard to check if an entity is a ChemicalSource.
 */
export function isChemicalSource(entity: Entity): entity is ChemicalSource {
  const types = entity['@type'] || []
  return types.includes('herbapedia:ChemicalSource')
}

// ============================================================================
// Namespace Constants
// ============================================================================

export const SOURCE_MATERIAL_NAMESPACES = {
  BOTANICAL_SOURCE: 'botanical/species',
  ZOOLOGICAL_SOURCE: 'zoological/source',
  MINERAL_SOURCE: 'mineral/source',
  CHEMICAL_SOURCE: 'chemical/source',
} as const

/**
 * Determine the source material type from an entity's properties.
 */
export function classifySourceMaterial(entity: Entity): SourceMaterialType | null {
  if (isBotanicalSource(entity)) return 'botanical'
  if (isZoologicalSource(entity)) return 'zoological'
  if (isMineralSource(entity)) return 'mineral'
  if (isChemicalSource(entity)) return 'chemical'
  return null
}

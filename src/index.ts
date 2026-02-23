/**
 * @herbapedia/data - Herbapedia Dataset Query Package
 *
 * This package provides TypeScript types and a query API for the Herbapedia
 * medicinal plant knowledge base.
 *
 * ## Architecture
 *
 * The data model is built around three main layers:
 *
 * 1. **Botanical Entities** - Factual botanical data
 *    - `PlantSpecies` - Taxonomy, distribution, external IDs
 *    - `PlantPart` - Specific parts of specific plants
 *    - `ChemicalCompound` - Chemical entities
 *
 * 2. **Herbal Preparations** - The central pivot entity
 *    - Prepared substances derived from botanical sources
 *    - Common usage (culinary, cosmetic)
 *    - General safety information
 *
 * 3. **Medicine System Profiles** - Interpretations
 *    - `TCMProfile` - Traditional Chinese Medicine view
 *    - `WesternHerbalProfile` - Western herbalism view
 *    - `AyurvedaProfile` - Ayurvedic view
 *
 * Key insight: A single HerbalPreparation can have MULTIPLE system profiles.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { HerbapediaDataset } from '@herbapedia/data'
 *
 * const dataset = new HerbapediaDataset('./path/to/data-herbapedia')
 *
 * // Load a plant
 * const ginger = dataset.getPlantSpecies('zingiber-officinale')
 * console.log(ginger?.scientificName) // "Zingiber officinale"
 *
 * // Get preparations from this plant
 * const preps = dataset.getPreparationsForPlant('zingiber-officinale')
 *
 * // Get all medicine system profiles for a preparation
 * const profiles = dataset.getAllProfilesForPreparation('fresh-ginger-rhizome')
 * console.log(profiles.tcm?.pinyin) // "Shēng Jiāng"
 * ```
 *
 * ## Modular API (New)
 *
 * For more fine-grained control, you can use the modular query classes:
 *
 * ```typescript
 * import { EntityLoader, BotanicalQueries, ProfileQueries } from '@herbapedia/data'
 *
 * const loader = new EntityLoader({ dataPath: './path/to/data-herbapedia' })
 * const botanical = new BotanicalQueries(loader)
 * const profiles = new ProfileQueries(loader)
 *
 * const plant = botanical.getPlantSpecies('ginseng')
 * const tcmProfile = profiles.getTCMProfile('ren-shen')
 * ```
 *
 * @packageDocumentation
 */

// Main class (backward compatible)
export { HerbapediaDataset, default } from './dataset'

// New modular API
export { EntityLoader } from './core/loader'
export type { LoaderOptions } from './core/loader'
export { SmartCache, entityCache } from './core/cache'
export type { CacheOptions, CacheStats } from './core/cache'

// Query modules
export { BotanicalQueries } from './queries/botanical'
export { PreparationQueries } from './queries/preparation'
export { ProfileQueries } from './queries/profiles/index'
export { SearchIndex } from './queries/search'
export type { SearchResult, SearchIndexOptions } from './queries/search'

// Entity builders
export { EntityBuilder, PlantSpeciesBuilder, ChemicalCompoundBuilder } from './builders/index'

// Validation helpers
export { EntityValidator } from './validation/helpers'
export type { ValidationError, ValidationResult, ValidationOptions } from './validation/helpers'

// Re-export types from types/
export type {
  // Core types
  Entity,
  IRIReference,
  LanguageMap,
  ExternalReference,
  Provenance,
} from '../types/core'

export {
  // Core utilities
  isIRIReference,
  isLanguageMap,
  extractSlug,
  extractEntityType,
  extractNamespace,
  buildIRI,
  isNamespace,
  IRI_NAMESPACES,
  HERBAPEDIA_BASE_IRI,
  ENTITY_PREFIX,
  isFullIRI,
  toFullIRI,
  toRelativeIRI,
} from '../types/core'

export type {
  // Botanical types
  PlantSpecies,
  PlantPart,
  ChemicalCompound,
  ChemicalProfile,
  DNABarcode,
  PlantPartType,
  GrowthForm,
  Lifecycle,
  ConservationStatus,
  TaxonomicClassification,
} from '../types/botanical'

export {
  // Botanical type guards
  isPlantSpecies,
  isPlantPart,
  isChemicalCompound,
} from '../types/botanical'

export type {
  // Preparation types
  HerbalPreparation,
  SystemProfiles,
  CommonUsage,
  SafetyInfo,
  PreparationMethod,
  PreparationForm,
} from '../types/preparation'

export {
  // Preparation utilities
  isHerbalPreparation,
  hasAnyProfile,
  getPrimarySource,
  isDerivedFrom,
} from '../types/preparation'

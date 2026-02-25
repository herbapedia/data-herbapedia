/**
 * @herbapedia/data - Herbapedia Dataset Query Package
 *
 * This package provides TypeScript types and a modular query API for the Herbapedia
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
 * import { EntityLoader, BotanicalQueries, ProfileQueries } from '@herbapedia/data'
 *
 * // Create loader with data path
 * const loader = new EntityLoader({ dataPath: './data-herbapedia' })
 *
 * // Create query modules
 * const botanical = new BotanicalQueries(loader)
 * const profiles = new ProfileQueries(loader)
 *
 * // Load a plant species
 * const ginger = await botanical.getPlantSpeciesAsync('zingiber-officinale')
 * console.log(ginger?.scientificName) // "Zingiber officinale"
 *
 * // Get a TCM profile
 * const tcmProfile = profiles.getTCMProfile('sheng-jiang')
 * console.log(tcmProfile?.pinyin) // "Shēng Jiāng"
 * ```
 *
 * ## Modules
 *
 * - **EntityLoader**: Core entity loading with caching
 * - **BotanicalQueries**: Plant species, parts, chemicals
 * - **PreparationQueries**: Herbal preparations
 * - **ProfileQueries**: Medicine system profiles (TCM, Western, Ayurveda, etc.)
 * - **SearchIndex**: Full-text search with Lunr.js
 * - **QueryIndex**: Pre-built indexes for fast lookups
 * - **EntityBuilder**: Fluent API for creating entities
 *
 * @packageDocumentation
 */

// Core modules
export { EntityLoader } from './core/loader'
export type { LoaderOptions } from './core/loader'
export { SmartCache, entityCache } from './core/cache'
export type { CacheOptions, CacheStats } from './core/cache'
export { QueryIndex } from './core/query-index'
export type { QueryIndexOptions, IndexEntry } from './core/query-index'

// Re-export from new core config
export {
  NAMESPACE_MAP,
  ENTITY_TYPE_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_CACHE_CONFIG,
  resolveNamespace,
  getEntityConfig,
  detectEntityType,
  toFullIRI,
  toRelativeIRI,
  iriToFilePath,
  // Type guards
  isPlantSpecies as isPlantSpeciesConfig,
  isTCMProfile as isTCMProfileConfig,
  isWesternProfile as isWesternProfileConfig,
  isAyurvedaProfile as isAyurvedaProfileConfig,
  isPersianProfile as isPersianProfileConfig,
  isMongolianProfile as isMongolianProfileConfig,
  isChemicalCompound as isChemicalCompoundConfig,
  isHerbalPreparation as isHerbalPreparationConfig,
  isModernMedicineProfile as isModernMedicineProfileConfig,
} from './core/config'
export type { Namespace, EntityType, HerbapediaConfig, CacheConfig } from './core/config'

// Re-export Result type for explicit error handling
export { ok, err, mapResult, flatMapResult } from './types/index'
export type { Result, Ok, Err } from './types/index'

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

// Plugin system
export { PluginRegistry, pluginRegistry } from './plugins/index'
export type { PluginStats } from './plugins/index'
export type {
  PluginMetadata,
  PluginContext,
  ValidatorPlugin,
  ValidatorPluginOptions,
  PluginValidationResult,
  PluginValidationError,
  ExporterPlugin,
  ExportContext,
  SerializeResult,
} from './plugins/index'
export {
  BaseValidatorPlugin,
  requiredFieldsValidator,
  iriFormatValidator,
  csvExporter,
} from './plugins/index'

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

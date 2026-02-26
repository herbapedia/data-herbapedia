/**
 * Herbapedia Type Definitions
 *
 * Main entry point for all type exports.
 *
 * ARCHITECTURE PRINCIPLES:
 *
 * 1. **Plant ≠ Medicine** - Botanical facts are separate from therapeutic interpretations
 * 2. **HerbalPreparation is Central** - The pivot between botanical sources and system profiles
 * 3. **System Profiles are Interpretations** - A single preparation can have multiple profiles
 * 4. **Content is System-Scoped** - Use tcm:traditionalUsage, NOT generic traditionalUsage
 *
 * @example
 * ```typescript
 * import type { PlantSpecies, HerbalPreparation, TCMProfile } from '@herbapedia/data/types'
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  Entity,
  IRIReference,
  ExternalReference,
  LanguageMap,
  Provenance,
} from './core'

export {
  isIRIReference,
  isLanguageMap,
  extractSlug,
  extractEntityType,
  extractNamespace,
  buildIRI,
  isNamespace,
  IRI_NAMESPACES,
} from './core'

// ============================================================================
// Botanical Types
// ============================================================================

export type {
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
} from './botanical'

export {
  isPlantSpecies,
  isPlantPart,
  isChemicalCompound,
} from './botanical'

// ============================================================================
// Source Material Types
// ============================================================================

export type {
  SourceMaterial,
  SourceMaterialType,
  BotanicalSource,
  BotanicalSubType,
  ZoologicalSource,
  ZoologicalSubType,
  MineralSource,
  ChemicalSource,
} from './source-material'

export {
  isBotanicalSource,
  isZoologicalSource,
  isMineralSource,
  isChemicalSource,
  classifySourceMaterial,
  SOURCE_MATERIAL_NAMESPACES,
} from './source-material'

// ============================================================================
// Preparation Types
// ============================================================================

export type {
  HerbalPreparation,
  SystemProfiles,
  CommonUsage,
  SafetyInfo,
  PreparationMethod,
  PreparationForm,
} from './preparation'

export {
  isHerbalPreparation,
  hasAnyProfile,
  getPrimarySource,
  isDerivedFrom,
} from './preparation'

// ============================================================================
// Formula Types
// ============================================================================

export type {
  Formula,
  FormulaIngredient,
} from './formula'

export {
  isFormula,
  FORMULA_NAMESPACES,
} from './formula'

// ============================================================================
// Profile Types
// ============================================================================

export type {
  MedicineSystemProfile,
  TCMProfile,
  TCMDosageEffect,
  WesternHerbalProfile,
  AyurvedaProfile,
  DoshaEffect,
  UnaniProfile,
  MongolianProfile,
} from './profiles/base'

export {
  isMedicineSystemProfile,
  isTCMProfile,
  isWesternProfile,
  isAyurvedaProfile,
  isUnaniProfile,
  isMongolianProfile,
} from './profiles/base'

export { SEVANA_KALA_MEANINGS } from './profiles/ayurveda'

// ============================================================================
// Unani Medicine Profile Types
// ============================================================================

export type {
  UnaniTemperament,
  UnaniElement,
  UnaniDegree,
  UnaniDosageForm,
} from './profiles/unani'

export {
  isUnaniTemperament,
  isUnaniElement,
  isUnaniDegree,
  UNANI_DOSAGE_FORMS,
} from './profiles/unani'

// ============================================================================
// Mongolian Medicine Profile Types
// ============================================================================

export type {
  MongolianElement,
  MongolianRoot,
  MongolianTaste,
  MongolianPotency,
  ThreeRootsEffect,
  RootEffect,
  MongolianPreparationMethod,
} from './profiles/mongolian'

export {
  isMongolianElement,
  isMongolianRoot,
  isMongolianTaste,
  isMongolianPotency,
  THREE_ROOTS,
  FIVE_ELEMENTS,
} from './profiles/mongolian'

// ============================================================================
// Reference Types (Controlled Vocabularies)
// ============================================================================

export type {
  ReferenceEntity,
  // TCM References
  TCMCategory,
  TCMNature,
  TCMFlavor,
  TCMMeridian,
  // Western References
  WesternAction,
  WesternOrgan,
  WesternSystem,
  // Ayurveda References
  AyurvedaRasa,
  AyurvedaGuna,
  AyurvedaVirya,
  AyurvedaVipaka,
  AyurvedaDosha,
  AyurvedaPrabhava,
} from './reference'

export {
  isReferenceEntity,
  isTCMCategory,
  isTCMNature,
  isTCMFlavor,
  isTCMMeridian,
  isWesternAction,
  isWesternOrgan,
  isWesternSystem,
  isAyurvedaRasa,
  isAyurvedaGuna,
  isAyurvedaVirya,
  isAyurvedaVipaka,
  isAyurvedaDosha,
  isAyurvedaPrabhava,
} from './reference'

// ============================================================================
// TCM Types (Alternative definitions)
// ============================================================================

export type {
  TCMMedicineNature,
  TCMFlavor as TCMFlavorType,
  TCMMeridian as TCMMeridianType,
  TCMExtraMeridian,
  TCMElement,
  TCMCategory as TCMCategoryType,
  TCMNatureEntity,
  TCMFlavorEntity,
  TCMMeridianEntity,
  TCMHerbProfile,
  TCMReferenceData,
  TCMHerbIndex,
} from './tcm'

// ============================================================================
// Ayurveda Types (Alternative definitions)
// ============================================================================

export type {
  DoshaType,
  RasaType,
  ViryaType,
  VipakaType,
  GunaType,
  MahabhutaType,
  DoshaEntity,
  RasaEntity,
  ViryaEntity,
  VipakaEntity,
  GunaEntity,
  AyurvedaDravyaProfile,
  AyurvedaReferenceData,
  AyurvedaDravyaIndex,
} from './ayurveda'

// ============================================================================
// Modern Medicine Types
// ============================================================================

export type {
  ModernMedicineProfile,
  FDAStatus,
  PregnancyCategory,
  LactationSafety,
  EfficacyRating,
  EvidenceLevel,
  RecommendedDietaryAllowance,
  TolerableUpperIntake,
  DrugInteraction,
  FoodInteraction,
} from './modern'

export {
  isModernMedicineProfile,
} from './modern'

// ============================================================================
// Type Aliases
// ============================================================================

// Alternative names for clarity
/** @deprecated Use PlantSpecies instead */
export type { PlantSpecies as Plant } from './botanical'

/** @deprecated Use TCMProfile instead */
export type { TCMHerbProfile as TCMHerb } from './tcm'

/** @deprecated Use AyurvedaProfile instead */
export type { AyurvedaDravyaProfile as AyurvedaDravya } from './ayurveda'

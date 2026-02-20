/**
 * Herbapedia Type Definitions
 *
 * Main entry point for all type exports
 *
 * ARCHITECTURE PRINCIPLE: System-Scoped Content
 *
 * Content properties (traditionalUsage, modernResearch, etc.) are NOT generic.
 * They are scoped to each medicine system's vocabulary:
 *
 * - TCM: tcm:traditionalUsage, tcm:modernResearch, tcm:functions
 * - Ayurveda: ayurveda:traditionalUsage, ayurveda:modernResearch
 * - Western: western:traditionalUsage, western:modernResearch
 *
 * The core Plant entity contains ONLY botanical data (taxonomy, distribution).
 * System-specific content lives in system-specific profiles.
 */

// Core types
export type {
  JsonLdContext,
  JsonLdNode,
  LanguageMap,
  PlantPartType,
  PlantPart,
  Plant,
  ChemicalCompound,
  PharmacologicalAction,
  Category,
  SystemProfileBase,
  HerbIndexEntry,
  MasterIndex,
} from './core'

// TCM types
export type {
  TCMMedicineNature,
  TCMFlavor,
  TCMMeridian,
  TCMExtraMeridian,
  TCMElement,
  TCMCategory,
  TCMNatureEntity,
  TCMFlavorEntity,
  TCMMeridianEntity,
  TCMHerbProfile,
  TCMReferenceData,
  TCMHerbIndex,
} from './tcm'

// Ayurveda types
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

// Re-export commonly used types
export type { Plant as PlantEntity } from './core'
export type { TCMHerbProfile as TCMHerb } from './tcm'
export type { AyurvedaDravyaProfile as AyurvedaDravya } from './ayurveda'

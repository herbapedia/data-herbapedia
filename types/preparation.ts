/**
 * Herbal Preparation types for Herbapedia.
 *
 * The HerbalPreparation is the CENTRAL entity in the Herbapedia data model.
 * It represents a prepared substance derived from botanical sources.
 *
 * KEY INSIGHT: A single HerbalPreparation can have MULTIPLE system profiles
 * (TCM, Western, Ayurveda) - they are NOT mutually exclusive.
 *
 * ARCHITECTURE:
 * ```
 * BotanicalEntity (PlantSpecies/PlantPart)
 *         │
 *         │ derivedFrom (1+)
 *         ▼
 * HerbalPreparation  ◄─────┐
 *         │                │
 *         │ hasXXXProfile  │ profiles
 *         ▼                │
 * MedicineSystemProfile ───┘
 * ```
 */

import type { Entity, IRIReference, LanguageMap } from './core'

// ============================================================================
// Preparation Method
// ============================================================================

/**
 * How a preparation is processed from raw botanical material.
 */
export type PreparationMethod =
  | 'fresh'
  | 'dried'
  | 'steamed'
  | 'roasted'
  | 'fried'
  | 'stir-fried'
  | 'carbonized'
  | 'fermented'
  | 'pickled'
  | 'extracted'
  | 'powdered'
  | 'ground'
  | 'decocted'
  | 'infused'
  | 'tinctured'
  | 'distilled'
  | 'cold-pressed'
  | 'steam-distilled'
  | 'freeze-dried'
  | 'spray-dried'
  | 'concentrated'
  | 'standardized'
  | 'raw'
  | 'processed'

// ============================================================================
// Preparation Form
// ============================================================================

export type PreparationForm =
  | 'whole'
  | 'sliced'
  | 'crushed'
  | 'powder'
  | 'granule'
  | 'capsule'
  | 'tablet'
  | 'liquid'
  | 'oil'
  | 'extract'
  | 'tincture'
  | 'tea'
  | 'paste'

// ============================================================================
// Common Usage
// ============================================================================

/**
 * Non-system-specific usage (factual, not therapeutic claims).
 */
export interface CommonUsage {
  culinary?: LanguageMap
  cosmetic?: LanguageMap
  industrial?: LanguageMap
  aromatherapy?: LanguageMap
}

// ============================================================================
// Safety Information
// ============================================================================

/**
 * General safety information (not system-specific).
 */
export interface SafetyInfo {
  allergens?: string[]
  pregnancySafety?: LanguageMap
  generalContraindications?: LanguageMap
  drugInteractions?: string[]
  warnings?: LanguageMap[]
}

// ============================================================================
// Herbal Preparation
// ============================================================================

/**
 * The CENTRAL entity in Herbapedia.
 *
 * An herbal preparation is a substance prepared from botanical sources
 * for therapeutic or culinary use.
 *
 * KEY RELATIONSHIPS:
 * - derivedFrom: Links to botanical sources (PlantSpecies or PlantPart)
 * - hasTCMProfile: TCM interpretation of this preparation
 * - hasWesternProfile: Western herbalism interpretation
 * - hasAyurvedaProfile: Ayurvedic interpretation
 *
 * A single preparation can have MULTIPLE profiles from DIFFERENT systems.
 */
export interface HerbalPreparation extends Entity {
  '@id': `preparation/${string}`
  '@type': ['herbal:HerbalPreparation', ...string[]]

  // CRITICAL: Botanical source(s)
  derivedFrom: IRIReference[]

  // Processing
  preparationMethod?: PreparationMethod
  preparationDetails?: LanguageMap
  form?: PreparationForm

  // Physical properties
  appearance?: LanguageMap
  storageRequirements?: LanguageMap
  shelfLife?: string

  // Common usage (not therapeutic claims)
  commonUsage?: CommonUsage

  // General safety
  safetyInfo?: SafetyInfo

  // System profiles (MULTIPLE ALLOWED!)
  hasTCMProfile?: IRIReference[]
  hasWesternProfile?: IRIReference[]
  hasAyurvedaProfile?: IRIReference[]

  // Related preparations
  relatedPreparations?: IRIReference[]
  substitutes?: Array<{
    preparation: IRIReference
    notes?: string
  }>
}

// ============================================================================
// System Profiles Container
// ============================================================================

/**
 * Container for all system profiles of a preparation.
 * Used by the API to return all profiles at once.
 */
export interface SystemProfiles {
  tcm?: unknown // TCMProfile (avoid circular import)
  western?: unknown // WesternHerbalProfile
  ayurveda?: unknown // AyurvedaProfile
}

// ============================================================================
// Type Guards
// ============================================================================

export function isHerbalPreparation(entity: Entity): entity is HerbalPreparation {
  return entity['@type'].includes('herbal:HerbalPreparation')
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a preparation has any system profiles.
 */
export function hasAnyProfile(prep: HerbalPreparation): boolean {
  return Boolean(
    (prep.hasTCMProfile && prep.hasTCMProfile.length > 0) ||
    (prep.hasWesternProfile && prep.hasWesternProfile.length > 0) ||
    (prep.hasAyurvedaProfile && prep.hasAyurvedaProfile.length > 0)
  )
}

/**
 * Get the primary botanical source from a preparation.
 * Returns the first source if multiple exist.
 */
export function getPrimarySource(prep: HerbalPreparation): IRIReference | undefined {
  return prep.derivedFrom[0]
}

/**
 * Check if a preparation is derived from a specific botanical entity.
 */
export function isDerivedFrom(prep: HerbalPreparation, iri: string): boolean {
  return prep.derivedFrom.some(ref => ref['@id'] === iri)
}

/**
 * Base types for Medicine System Profiles.
 *
 * Medicine system profiles are INTERPRETATIONS of HerbalPreparations through
 * different traditional medicine frameworks (TCM, Western, Ayurveda, Unani, Mongolian).
 *
 * KEY PRINCIPLE: A single HerbalPreparation can have MULTIPLE system profiles.
 * They are NOT mutually exclusive.
 *
 * ARCHITECTURE:
 * ```
 * HerbalPreparation
 *     │
 *     │ hasXXXProfile (0..*)
 *     ▼
 * MedicineSystemProfile (abstract)
 *     ├── TCMProfile
 *     ├── WesternHerbalProfile
 *     ├── AyurvedaProfile
 *     ├── UnaniProfile
 *     └── MongolianProfile
 * ```
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// Forward declarations for type guards (types are imported below)
import type { TCMProfile } from './tcm'
import type { WesternHerbalProfile } from './western'
import type { AyurvedaProfile } from './ayurveda'
import type { UnaniProfile } from './unani'
import type { MongolianProfile } from './mongolian'

// ============================================================================
// Abstract Medicine System Profile
// ============================================================================

/**
 * Abstract base for all medicine system profiles.
 *
 * A profile INTERPRETS a preparation through a specific therapeutic framework.
 * The profile is NOT the preparation itself - it's the lens through which
 * that preparation is understood therapeutically.
 */
export interface MedicineSystemProfile extends Entity {
  // The preparation this profile interprets
  profiles: IRIReference

  // History specific to this system's view
  history?: LanguageMap

  // Traditional usage according to this system
  traditionalUsage?: LanguageMap

  // Modern research relevant to this system's use
  modernResearch?: LanguageMap

  // Contraindications according to this system
  contraindications?: LanguageMap

  // Dosage according to this system
  dosage?: LanguageMap
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an entity is any medicine system profile.
 */
export function isMedicineSystemProfile(entity: Entity): entity is MedicineSystemProfile {
  const profileTypes = [
    'tcm:HerbProfile',
    'western:HerbProfile',
    'ayurveda:DravyaProfile',
    'unani:DrugProfile',
    'mongolian:HerbProfile'
  ]
  return entity['@type'].some(t => profileTypes.includes(t))
}

/**
 * Check if an entity is a TCM profile.
 */
export function isTCMProfile(entity: Entity): entity is TCMProfile {
  return entity['@type'].includes('tcm:HerbProfile')
}

/**
 * Check if an entity is a Western herbal profile.
 */
export function isWesternProfile(entity: Entity): entity is WesternHerbalProfile {
  return entity['@type'].includes('western:HerbProfile')
}

/**
 * Check if an entity is an Ayurveda profile.
 */
export function isAyurvedaProfile(entity: Entity): entity is AyurvedaProfile {
  return entity['@type'].includes('ayurveda:DravyaProfile')
}

/**
 * Check if an entity is a Unani profile.
 */
export function isUnaniProfile(entity: Entity): entity is UnaniProfile {
  return entity['@type'].includes('unani:DrugProfile')
}

/**
 * Check if an entity is a Mongolian profile.
 */
export function isMongolianProfile(entity: Entity): entity is MongolianProfile {
  return entity['@type'].includes('mongolian:HerbProfile')
}

// ============================================================================
// TCM Profile (re-export for convenience)
// ============================================================================

/**
 * TCM Profile type placeholder - defined in ./tcm.ts
 * This re-export allows importing from base.ts
 */
export type { TCMProfile, TCMDosageEffect } from './tcm'

// ============================================================================
// Western Herbal Profile (re-export for convenience)
// ============================================================================

/**
 * Western Herbal Profile type placeholder - defined in ./western.ts
 */
export type { WesternHerbalProfile } from './western'

// ============================================================================
// Ayurveda Profile (re-export for convenience)
// ============================================================================

/**
 * Ayurveda Profile type placeholder - defined in ./ayurveda.ts
 */
export type { AyurvedaProfile, DoshaEffect } from './ayurveda'

// ============================================================================
// Unani Profile (re-export for convenience)
// ============================================================================

/**
 * Unani Profile type placeholder - defined in ./unani.ts
 */
export type { UnaniProfile, UnaniTemperament as TemperamentType } from './unani'

// ============================================================================
// Mongolian Profile (re-export for convenience)
// ============================================================================

/**
 * Mongolian Profile type placeholder - defined in ./mongolian.ts
 */
export type { MongolianProfile, ThreeRootsEffect } from './mongolian'

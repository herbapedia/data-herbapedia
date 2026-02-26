/**
 * Traditional Unani Medicine (TPM) Profile types.
 *
 * A Unani Profile is an INTERPRETATION of an HerbalPreparation through
 * Traditional Unani Medicine, which is based on the Canon of Medicine
 * by Ibn Sina (Avicenna) and later works like Makhzan al-Adwiya.
 *
 * KEY CONCEPTS:
 * - Mizaj (مزاج): Temperament - Hot/Cold × Wet/Dry
 * - Arkan (عناصر): Four Elements - Fire, Air, Water, Earth
 * - Darajah (درجه): Degree of potency (1-4)
 * - Akhlat (اخلاط): Four Humors - Blood, Phlegm, Yellow Bile, Black Bile
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// ============================================================================
// Unani Profile
// ============================================================================

/**
 * Traditional Unani Medicine interpretation of a preparation.
 *
 * This profile describes a substance using Unani medicine concepts:
 * - Temperament (Mizaj): Hot/Cold × Wet/Dry
 * - Degree: Potency level 1-4
 * - Element: Dominant element(s)
 */
export interface UnaniProfile extends Entity {
  '@id': `unani/profile/${string}`
  '@type': ['unani:DrugProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Names
  unaniName?: string // In Unani script
  unaniTransliteration?: string
  arabicName?: string

  // TEMPERAMENT (Mizaj) - REQUIRED
  hasTemperament: IRIReference
  temperamentDegree?: 1 | 2 | 3 | 4

  // ELEMENT (Arkan)
  hasElement?: IRIReference[]

  // CONSTITUENTS
  mizajConstituents?: Array<{
    substance: IRIReference
    temperament: IRIReference
    proportion?: string
  }>

  // THERAPEUTIC CONTENT
  actions?: string[] // e.g., "Mufarrih", "Muqawwi"
  unaniFunctions?: LanguageMap
  indications?: string[]
  affectedOrgans?: string[]

  // SAFETY
  contraindications?: LanguageMap
  adverseEffects?: LanguageMap
  corrective?: string[] // Musleh - substances that correct adverse effects

  // SUBSTITUTES
  substitute?: string[] // Badal

  // DOSAGE
  dosage?: LanguageMap
  dosageForm?: UnaniDosageForm[]
  administrationRoute?: 'oral' | 'topical' | 'inhalation' | 'rectal' | 'vaginal' | 'nasal' | 'ocular' | 'otic'

  // REFERENCES
  classicalReferences?: Array<{
    text: string // e.g., "Al-Qānūn fī al-Ṭibb"
    author?: string // e.g., "Ibn Sina"
    reference?: string
    quote?: string
  }>
  modernResearch?: LanguageMap
}

// ============================================================================
// Unani Dosage Forms
// ============================================================================

export type UnaniDosageForm =
  | 'Naqu'      // Infusion
  | 'Joshandah' // Decoction
  | 'Khulq'     // Syrup
  | 'Sharbat'   // Syrup beverage
  | 'Majun'     // Semi-solid paste
  | 'Itrifal'   // Triphala-based preparation
  | 'Jawarish'  // Digestive confection
  | 'Qurs'      // Tablet
  | 'Habb'      // Pill
  | 'Zarur'     // Powder
  | 'Tiryaq'    // Antidote/electuary

// ============================================================================
// Unani Reference Types
// ============================================================================

/**
 * Unani Temperament (Mizaj).
 * Combination of Hot/Cold with Wet/Dry.
 */
export interface UnaniTemperament extends Entity {
  '@id': `unani/temperament/${string}`
  '@type': ['unani:Temperament', ...string[]]

  unaniName?: string
  transliteration?: string
  heat: 'hot' | 'cold'
  moisture: 'wet' | 'dry'
  associatedElement?: IRIReference
  associatedHumor?: 'dam' | 'balgham' | 'safra' | 'sauda'

  physiologicalCharacteristics?: string[]
  psychologicalCharacteristics?: string[]
  indications?: string[]
  contraindications?: string[]
  balancingFoods?: string[]
  oppositeTemperament?: IRIReference
}

/**
 * Unani Element (Unsur).
 * One of the four fundamental elements.
 */
export interface UnaniElement extends Entity {
  '@id': `unani/element/${string}`
  '@type': ['unani:Element', ...string[]]

  unaniName?: string
  transliteration?: string
  arabicName?: string

  qualities: {
    heat: 'hot' | 'cold'
    moisture: 'wet' | 'dry'
  }

  associatedTemperament?: IRIReference
  associatedHumor?: 'dam' | 'balgham' | 'safra' | 'sauda'
  characteristics?: string[]
  organs?: string[]
  seasons?: string[]
  ages?: string[]
}

/**
 * Unani Degree (Darajah).
 * Potency level from 1 (mild) to 4 (very strong).
 */
export interface UnaniDegree extends Entity {
  '@id': `unani/degree/${number}`
  '@type': ['unani:Degree', ...string[]]

  degree: 1 | 2 | 3 | 4
  unaniName?: string
  therapeuticStrength: 'mild' | 'moderate' | 'strong' | 'very-strong'
  safetyProfile?: LanguageMap
  usageGuidelines?: LanguageMap
  exampleSubstances?: string[]
  cautions?: string[]
  correctivesNeeded?: boolean
}

// ============================================================================
// Type Guards
// ============================================================================

export function isUnaniProfile(entity: Entity): entity is UnaniProfile {
  return entity['@type'].includes('unani:DrugProfile')
}

export function isUnaniTemperament(entity: Entity): entity is UnaniTemperament {
  return entity['@type'].includes('unani:Temperament')
}

export function isUnaniElement(entity: Entity): entity is UnaniElement {
  return entity['@type'].includes('unani:Element')
}

export function isUnaniDegree(entity: Entity): entity is UnaniDegree {
  return entity['@type'].includes('unani:Degree')
}

// ============================================================================
// Unani Dosage Form Documentation
// ============================================================================

export const UNANI_DOSAGE_FORMS: Record<UnaniDosageForm, { english: string; description: string }> = {
  Naqu: { english: 'Infusion', description: 'Hot water extract of herbs' },
  Joshandah: { english: 'Decoction', description: 'Boiled extract of herbs' },
  Khulq: { english: 'Syrup', description: 'Herbal syrup' },
  Sharbat: { english: 'Syrup beverage', description: 'Sweet herbal drink' },
  Majun: { english: 'Semi-solid paste', description: 'Thick paste with honey/sugar' },
  Itrifal: { english: 'Triphala preparation', description: 'Formula containing Triphala' },
  Jawarish: { english: 'Digestive confection', description: 'Sweet digestive formula' },
  Qurs: { english: 'Tablet', description: 'Compressed tablet form' },
  Habb: { english: 'Pill', description: 'Small round pill' },
  Zarur: { english: 'Powder', description: 'Fine powder form' },
  Tiryaq: { english: 'Antidote/Electuary', description: 'Ther paste used as antidote' }
}

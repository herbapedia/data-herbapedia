/**
 * Traditional Persian Medicine (TPM) Profile types.
 *
 * A Persian Profile is an INTERPRETATION of an HerbalPreparation through
 * Traditional Persian Medicine, which is based on the Canon of Medicine
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
// Persian Profile
// ============================================================================

/**
 * Traditional Persian Medicine interpretation of a preparation.
 *
 * This profile describes a substance using Persian medicine concepts:
 * - Temperament (Mizaj): Hot/Cold × Wet/Dry
 * - Degree: Potency level 1-4
 * - Element: Dominant element(s)
 */
export interface PersianProfile extends Entity {
  '@id': `persian/profile/${string}`
  '@type': ['persian:DrugProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Names
  persianName?: string // In Persian script
  persianTransliteration?: string
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
  persianFunctions?: LanguageMap
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
  dosageForm?: PersianDosageForm[]
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
// Persian Dosage Forms
// ============================================================================

export type PersianDosageForm =
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
// Persian Reference Types
// ============================================================================

/**
 * Persian Temperament (Mizaj).
 * Combination of Hot/Cold with Wet/Dry.
 */
export interface PersianTemperament extends Entity {
  '@id': `persian/temperament/${string}`
  '@type': ['persian:Temperament', ...string[]]

  persianName?: string
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
 * Persian Element (Unsur).
 * One of the four fundamental elements.
 */
export interface PersianElement extends Entity {
  '@id': `persian/element/${string}`
  '@type': ['persian:Element', ...string[]]

  persianName?: string
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
 * Persian Degree (Darajah).
 * Potency level from 1 (mild) to 4 (very strong).
 */
export interface PersianDegree extends Entity {
  '@id': `persian/degree/${number}`
  '@type': ['persian:Degree', ...string[]]

  degree: 1 | 2 | 3 | 4
  persianName?: string
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

export function isPersianProfile(entity: Entity): entity is PersianProfile {
  return entity['@type'].includes('persian:DrugProfile')
}

export function isPersianTemperament(entity: Entity): entity is PersianTemperament {
  return entity['@type'].includes('persian:Temperament')
}

export function isPersianElement(entity: Entity): entity is PersianElement {
  return entity['@type'].includes('persian:Element')
}

export function isPersianDegree(entity: Entity): entity is PersianDegree {
  return entity['@type'].includes('persian:Degree')
}

// ============================================================================
// Persian Dosage Form Documentation
// ============================================================================

export const PERSIAN_DOSAGE_FORMS: Record<PersianDosageForm, { english: string; description: string }> = {
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

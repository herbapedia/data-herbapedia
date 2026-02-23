/**
 * Mongolian Traditional Medicine Profile types.
 *
 * A Mongolian Profile is an INTERPRETATION of an HerbalPreparation through
 * Mongolian Traditional Medicine, which combines Tibetan Medicine (Sowa Rigpa)
 * with TCM and Ayurveda elements, adapted to the nomadic lifestyle.
 *
 * KEY CONCEPTS:
 * - Three Roots (Гурван үндэс): Heyi, Xila, Badagan (similar to Doshas)
 * - Five Elements (Таван махбод): Wood, Fire, Earth, Metal, Water
 * - Six Tastes (Зургаан амт): Sweet, Sour, Salty, Hot, Bitter, Astringent
 * - Seventeen Potencies (Арван долоон нанс): Post-digestive effects
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// ============================================================================
// Mongolian Profile
// ============================================================================

/**
 * Mongolian Traditional Medicine interpretation of a preparation.
 *
 * This profile describes a substance using Mongolian medicine concepts:
 * - Three Roots: Heyi ( гий), Xila ( шил), Badagan ( бадган)
 * - Five Elements: Wood, Fire, Earth, Metal, Water
 * - Six Tastes with specific root effects
 */
export interface MongolianProfile extends Entity {
  '@id': `mongolian/profile/${string}`
  '@type': ['mongolian:HerbProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Names
  mongolianName?: string // In Cyrillic or Traditional
  tibetanName?: string // Sowa Rigpa tradition
  tibetanWylie?: string // Wylie transliteration

  // FIVE ELEMENTS
  hasElement?: IRIReference[]

  // THREE ROOTS EFFECTS
  affectsRoots?: ThreeRootsEffect

  // SIX TASTES
  hasTaste?: IRIReference[]

  // SEVENTEEN POTENCIES
  hasPotency?: IRIReference[]

  // THERAPEUTIC CONTENT
  therapeuticClass?: string
  mongolianFunctions?: LanguageMap
  indications?: string[]

  // SAFETY
  contraIndications?: LanguageMap

  // DOSAGE
  dosage?: LanguageMap
  preparationMethod?: MongolianPreparationMethod[]

  // REFERENCES
  classicalReferences?: Array<{
    text: string // e.g., "Four Tantras", "Blue Beryl"
    reference?: string
    quote?: string
  }>
  modernResearch?: LanguageMap
  nomadicUsage?: LanguageMap
}

// ============================================================================
// Three Roots Effect
// ============================================================================

/**
 * Effect on a single root.
 */
export interface RootEffect {
  effect: 'increases' | 'decreases' | 'balances'
  notes?: string
}

/**
 * Complete Three Roots effect mapping.
 */
export interface ThreeRootsEffect {
  heyi?: RootEffect    // Wind - similar to Vata
  xila?: RootEffect    // Bile - similar to Pitta
  badagan?: RootEffect // Phlegm - similar to Kapha
}

// ============================================================================
// Mongolian Preparation Methods
// ============================================================================

export type MongolianPreparationMethod =
  | 'decoction'
  | 'powder'
  | 'pill'
  | 'paste'
  | 'fermented'
  | 'butter'
  | 'milk-boiled'
  | 'roasted'
  | 'ash'

// ============================================================================
// Mongolian Reference Types
// ============================================================================

/**
 * Mongolian Five Element.
 */
export interface MongolianElement extends Entity {
  '@id': `mongolian/element/${string}`
  '@type': ['mongolian:Element', ...string[]]

  mongolianName?: string
  tibetanName?: string
  tibetanWylie?: string

  associatedOrgan?: {
    zang: string  // Yin organ
    fu: string    // Yang organ
  }
  associatedSeason?: 'spring' | 'summer' | 'late-summer' | 'autumn' | 'winter'
  associatedColor?: string
  climate?: string
  emotion?: string
  tissue?: string
  senseOrgan?: string

  generatesElement?: IRIReference
  controlsElement?: IRIReference
}

/**
 * Mongolian Three Root ( гурван үндэс).
 */
export interface MongolianRoot extends Entity {
  '@id': `mongolian/root/${string}`
  '@type': ['mongolian:Root', ...string[]]

  mongolianName?: string
  tibetanName?: string
  tibetanWylie?: string
  englishName?: 'Wind' | 'Bile' | 'Phlegm'

  elementComposition?: Array<{
    element: 'space' | 'air' | 'fire' | 'water' | 'earth'
    proportion: 'primary' | 'secondary'
  }>

  primaryLocation?: string
  primaryFunction?: LanguageMap
  characteristics?: string[]
  subtypes?: Array<{
    name: string
    location: string
    function: string
  }>

  imbalanceSymptoms?: string[]
  deficiencySymptoms?: string[]
  aggravatingFactors?: string[]
  pacifyingFactors?: string[]

  associatedSeason?: string
  associatedTimeOfDay?: string
  associatedAge?: string

  ayurvedaEquivalent?: 'vata' | 'pitta' | 'kapha'
}

/**
 * Mongolian Six Taste.
 */
export interface MongolianTaste extends Entity {
  '@id': `mongolian/taste/${string}`
  '@type': ['mongolian:Taste', ...string[]]

  mongolianName?: string
  tibetanName?: string
  tibetanWylie?: string
  englishName?: string

  elementComposition?: Array<{
    element: 'space' | 'air' | 'fire' | 'water' | 'earth'
    proportion: 'primary' | 'secondary' | 'minor'
  }>

  effectOnRoots?: {
    heyi?: 'increases' | 'decreases' | 'neutral'
    xila?: 'increases' | 'decreases' | 'neutral'
    badagan?: 'increases' | 'decreases' | 'neutral'
  }

  therapeuticActions?: string[]
  indications?: string[]
  excessEffects?: string[]
  exampleSubstances?: string[]
}

/**
 * Mongolian Potency (one of seventeen).
 */
export interface MongolianPotency extends Entity {
  '@id': `mongolian/potency/${string}`
  '@type': ['mongolian:Potency', ...string[]]

  mongolianName?: string
  tibetanName?: string
  tibetanWylie?: string
  englishName?: string

  oppositePotency?: IRIReference
  pairNumber?: number // 1-9

  effectOnRoots?: {
    heyi?: 'increases' | 'decreases' | 'neutral'
    xila?: 'increases' | 'decreases' | 'neutral'
    badagan?: 'increases' | 'decreases' | 'neutral'
  }

  physiologicalEffect?: LanguageMap
  indications?: string[]
  exampleSubstances?: string[]
}

// ============================================================================
// Type Guards
// ============================================================================

export function isMongolianProfile(entity: Entity): entity is MongolianProfile {
  return entity['@type'].includes('mongolian:HerbProfile')
}

export function isMongolianElement(entity: Entity): entity is MongolianElement {
  return entity['@type'].includes('mongolian:Element')
}

export function isMongolianRoot(entity: Entity): entity is MongolianRoot {
  return entity['@type'].includes('mongolian:Root')
}

export function isMongolianTaste(entity: Entity): entity is MongolianTaste {
  return entity['@type'].includes('mongolian:Taste')
}

export function isMongolianPotency(entity: Entity): entity is MongolianPotency {
  return entity['@type'].includes('mongolian:Potency')
}

// ============================================================================
// Three Roots Documentation
// ============================================================================

export const THREE_ROOTS: Record<string, {
  mongolian: string
  tibetan: string
  elements: string
  ayurveda: string
}> = {
  heyi: {
    mongolian: 'хий',
    tibetan: 'རླུང་ (rlung)',
    elements: 'Space + Air',
    ayurveda: 'Vata'
  },
  xila: {
    mongolian: 'шар',
    tibetan: 'མཁྲིས་པ་ (mkhris pa)',
    elements: 'Fire + Water',
    ayurveda: 'Pitta'
  },
  badagan: {
    mongolian: 'бадган',
    tibetan: 'བད་ཀན་ (bad kan)',
    elements: 'Water + Earth',
    ayurveda: 'Kapha'
  }
}

export const FIVE_ELEMENTS: Record<string, {
  mongolian: string
  tibetan: string
  organ: string
}> = {
  wood: {
    mongolian: 'мод',
    tibetan: 'ཤིང་',
    organ: 'Liver/Gallbladder'
  },
  fire: {
    mongolian: 'гал',
    tibetan: 'མེ་',
    organ: 'Heart/Small Intestine'
  },
  earth: {
    mongolian: 'шороо',
    tibetan: 'ས་',
    organ: 'Spleen/Stomach'
  },
  metal: {
    mongolian: 'төмөр',
    tibetan: 'ལྕགས་',
    organ: 'Lung/Large Intestine'
  },
  water: {
    mongolian: 'ус',
    tibetan: 'ཆུ་',
    organ: 'Kidney/Bladder'
  }
}

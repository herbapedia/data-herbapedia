/**
 * Ayurveda Profile types.
 *
 * An Ayurveda Profile is an INTERPRETATION of an HerbalPreparation through
 * the Ayurvedic theoretical framework.
 *
 * KEY CONCEPTS:
 * - Rasa (रस): Six tastes - each has specific dosha effects
 * - Guna (गुण): Twenty qualities in ten opposing pairs
 * - Virya (वीर्य): Potency - heating (ushna) or cooling (sheeta)
 * - Vipaka (विपाक): Post-digestive effect - sweet, sour, or pungent
 * - Dosha Effects: How the substance affects Vata, Pitta, Kapha
 * - Prabhava (प्रभाव): Special/unique effects beyond rasa/virya/vipaka
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// ============================================================================
// Dosha Effect
// ============================================================================

/**
 * Describes how a substance affects a single dosha.
 */
export interface DoshaEffect {
  effect: 'increases' | 'decreases' | 'balances'
  notes?: string
}

/**
 * Complete dosha effect mapping for all three doshas.
 */
export interface TriDoshaEffect {
  vata?: DoshaEffect
  pitta?: DoshaEffect
  kapha?: DoshaEffect
}

// ============================================================================
// Ayurveda Profile
// ============================================================================

/**
 * Ayurvedic interpretation of a preparation (dravya).
 *
 * This profile describes a substance using Ayurvedic concepts:
 * - Rasa (taste) - primary tastes present
 * - Guna (qualities) - the 20 qualities
 * - Virya (potency) - heating or cooling
 * - Vipaka (post-digestive effect)
 * - Dosha effects - impact on Vata, Pitta, Kapha
 */
export interface AyurvedaProfile extends Entity {
  '@id': `ayurveda/profile/${string}`
  '@type': ['ayurveda:DravyaProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Names specific to Ayurveda
  sanskritName?: string // In Devanagari
  sanskritTransliteration?: string // IAST
  hindiName?: string

  // AYURVEDIC THEORETICAL PROPERTIES

  // Rasa (रस) - The six tastes (REQUIRED, at least one)
  hasRasa: IRIReference[]

  // Guna (गुण) - The twenty qualities
  hasGuna?: IRIReference[]

  // Virya (वीर्य) - Potency (REQUIRED: heating or cooling)
  hasVirya: IRIReference

  // Vipaka (विपाक) - Post-digestive effect
  hasVipaka?: IRIReference

  // Prabhava (प्रभाव) - Special/unique effect
  hasPrabhava?: IRIReference

  // DOSHA EFFECTS

  // How this dravya affects the three doshas
  affectsDosha?: TriDoshaEffect

  // THERAPEUTIC CONTENT

  // Ayurvedic category (e.g., Rasayana, Medhya)
  ayurvedaCategory?: IRIReference

  // Karma (कर्म) - Therapeutic actions in Ayurvedic terms
  karma?: string[]

  // Traditional usage
  ayurvedaTraditionalUsage?: LanguageMap

  // Modern research
  ayurvedaModernResearch?: LanguageMap

  // History in Ayurveda
  ayurvedaHistory?: LanguageMap

  // Classical text references
  classicalReferences?: Array<{
    text: string // e.g., "Charaka Samhita"
    reference: string // e.g., "Sutra Sthana, Chapter 1"
    quote?: LanguageMap
  }>

  // Contraindications
  contraindications?: LanguageMap

  // Dosage
  dosage?: LanguageMap

  // ADMINISTRATION

  // Anupana (अनुपान) - Vehicle/carrier substance
  anupana?: string[]

  // Sevana Kala (सेवन काल) - Optimal time to take
  sevanaKala?: 'pratah' | 'madhyahna' | 'sayam' | 'nishi' | 'bhaktad' | 'abhyaktad' | 'annadau' | 'annamadhye' | 'annapashcat'
}

// ============================================================================
// Sevana Kala (Administration Time) Documentation
// ============================================================================

export const SEVANA_KALA_MEANINGS: Record<string, string> = {
  pratah: 'Morning (before sunrise)',
  madhyahna: 'Midday',
  sayam: 'Evening',
  nishi: 'Night',
  bhaktad: 'After food',
  abhyaktad: 'Empty stomach',
  annadau: 'Beginning of meal',
  annamadhye: 'Middle of meal',
  annapashcat: 'After meal'
}

// ============================================================================
// Type Guard
// ============================================================================

export function isAyurvedaProfileType(entity: Entity): entity is AyurvedaProfile {
  return entity['@type'].includes('ayurveda:DravyaProfile')
}

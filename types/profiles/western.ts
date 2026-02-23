/**
 * Western Herbal Medicine Profile types.
 *
 * A Western Herbal Profile is an INTERPRETATION of an HerbalPreparation
 * through Western herbal medicine, which is based on biomedical science
 * and pharmacological understanding.
 *
 * KEY DISTINCTION from TCM/Ayurveda:
 * - Uses HERBAL ACTIONS (anti-inflammatory, carminative) not energetic properties
 * - Based on EVIDENCE from clinical trials and pharmacological research
 * - ORGAN AFFINITY rather than meridian/energetic channel
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// ============================================================================
// Western Herbal Profile
// ============================================================================

/**
 * Western herbal medicine interpretation of a preparation.
 *
 * This profile describes a preparation using Western herbal concepts:
 * - Herbal actions (what it does therapeutically)
 * - Organ affinities (which body systems it affects)
 * - Evidence-based research
 * - Pharmacological mechanisms (when known)
 */
export interface WesternHerbalProfile extends Entity {
  '@id': `western/profile/${string}`
  '@type': ['western:HerbProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Western common name
  commonName?: string

  // HERBAL ACTIONS
  // The primary therapeutic actions based on Western herbal medicine
  hasAction: IRIReference[]

  // ORGAN AFFINITIES
  // Which organs/body systems this herb has an affinity for
  hasOrganAffinity?: IRIReference[]

  // THERAPEUTIC CONTENT

  // Primary indications (what it treats)
  primaryIndications?: LanguageMap

  // Secondary indications
  secondaryIndications?: LanguageMap

  // Contraindications
  contraindications?: LanguageMap

  // Drug interactions
  drugInteractions?: Array<{
    drug: string
    interaction: string
    severity: 'mild' | 'moderate' | 'severe'
  }>

  // Side effects
  sideEffects?: LanguageMap

  // Dosage
  dosage?: LanguageMap

  // EVIDENCE

  // Evidence level for primary uses
  evidenceLevel?: 'traditional' | 'empirical' | 'preliminary' | 'moderate' | 'strong'

  // Pharmacological mechanisms
  pharmacology?: LanguageMap

  // Clinical trials summary
  clinicalTrials?: LanguageMap

  // Modern research
  modernResearch?: LanguageMap

  // History
  history?: LanguageMap

  // Traditional usage (Western tradition)
  traditionalUsage?: LanguageMap

  // SAFETY

  // Pregnancy/breastfeeding safety
  pregnancySafety?: 'safe' | 'likely-safe' | 'avoid' | 'insufficient-data'

  // Pediatric use
  pediatricUse?: LanguageMap

  // Safety rating
  safetyRating?: '1' | '2' | '3' | '4' | '5' // 1 = safest, 5 = most caution needed
}

// ============================================================================
// Type Guard
// ============================================================================

export function isWesternHerbalProfile(entity: Entity): entity is WesternHerbalProfile {
  return entity['@type'].includes('western:HerbProfile')
}

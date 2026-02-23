/**
 * Traditional Chinese Medicine (TCM) Profile types.
 *
 * A TCM Profile is an INTERPRETATION of an HerbalPreparation through the
 * Traditional Chinese Medicine theoretical framework.
 *
 * KEY CONCEPTS:
 * - Nature (四气): Thermal property (hot/warm/neutral/cool/cold)
 * - Flavor (五味): Functional category (acrid/sweet/bitter/sour/salty/bland/astringent)
 * - Meridian (归经): Organ/channel affinity
 * - Category (分类): Functional grouping (release exterior, clear heat, etc.)
 */

import type { Entity, IRIReference, LanguageMap } from '../core'

// ============================================================================
// TCM Profile
// ============================================================================

/**
 * Traditional Chinese Medicine interpretation of a preparation.
 *
 * This profile describes how a preparation is understood and used within
 * TCM theory, including its thermal nature, flavors, meridian affinities,
 * and therapeutic category.
 */
export interface TCMProfile extends Entity {
  '@id': `tcm/profile/${string}`
  '@type': ['tcm:HerbProfile', ...string[]]

  // The preparation this profile interprets
  profiles: IRIReference

  // Names specific to TCM
  pinyin: string
  pinyinTone?: string // With tone marks (e.g., "Shēng Jiāng")
  chineseName?: LanguageMap // Traditional and Simplified
  hanzi?: string // Chinese characters

  // TCM THEORETICAL PROPERTIES

  // Category (分类) - Functional grouping
  hasCategory?: IRIReference

  // Nature (四气/四性) - Thermal property
  hasNature: IRIReference

  // Flavor (五味) - Functional categories (can have multiple)
  hasFlavor: IRIReference[]

  // Meridian affinity (归经) - Which channels it enters
  entersMeridian?: IRIReference[]

  // THERAPEUTIC CONTENT

  // Functions in TCM terms
  tcmFunctions?: LanguageMap

  // Indications (what it treats)
  tcmIndications?: LanguageMap

  // Contraindications
  contraindications?: LanguageMap

  // Combination notes (how to combine with other herbs)
  combinesWith?: IRIReference[]

  // TCM-specific dosage
  dosage?: LanguageMap

  // Caution notes
  cautions?: LanguageMap

  // Modern research
  modernResearch?: LanguageMap

  // Classical references
  classicalReferences?: Array<{
    text: string // e.g., "Shennong Bencao Jing"
    reference: string // e.g., "中卷"
    quote?: LanguageMap
  }>

  // Toxicity level
  toxicity?: 'non-toxic' | 'slightly toxic' | 'toxic' | 'highly toxic'

  // Weight classification (for dosage calculation)
  weightClass?: 'light' | 'medium' | 'heavy'
}

// ============================================================================
// TCM Dosage Effect Type
// ============================================================================

/**
 * Describes how dosage affects the therapeutic action.
 */
export interface TCMDosageEffect {
  lowDose?: {
    effect: string
    indication?: string
  }
  mediumDose?: {
    effect: string
    indication?: string
  }
  highDose?: {
    effect: string
    indication?: string
  }
  notes?: string
}

// ============================================================================
// Type Guard
// ============================================================================

export function isTCMProfileType(entity: Entity): entity is TCMProfile {
  return entity['@type'].includes('tcm:HerbProfile')
}

/**
 * Reference Entity types for Herbapedia.
 *
 * Reference entities are CONTROLLED VOCABULARIES - the canonical terms used
 * across medicine systems. They are NOT interpretations of preparations.
 *
 * ARCHITECTURE:
 * ```
 * ReferenceEntity (abstract)
 * ├── TCMReference
 * │   ├── TCMCategory
 * │   ├── TCMNature
 * │   ├── TCMFlavor
 * │   └── TCMMeridian
 * ├── WesternReference
 * │   ├── WesternAction
 * │   ├── WesternOrgan
 * │   └── WesternSystem
 * └── AyurvedaReference
 *     ├── AyurvedaRasa
 *     ├── AyurvedaGuna
 *     ├── AyurvedaVirya
 *     ├── AyurvedaVipaka
 *     ├── AyurvedaDosha
 *     └── AyurvedaPrabhava
 * ```
 *
 * KEY PRINCIPLE: Profiles LINK TO reference entities, not the other way around.
 */

import type { Entity, IRIReference, LanguageMap, ExternalReference } from './core'

// ============================================================================
// Abstract Reference Entity
// ============================================================================

/**
 * Abstract base for all controlled vocabulary entities.
 */
export interface ReferenceEntity extends Entity {
  // Short code or abbreviation
  code?: string

  // Symbol representation (e.g., Chinese characters)
  symbol?: string

  // Alternative names
  aliases?: string[]

  // Related references
  relatedTo?: IRIReference[]

  // Opposing reference (for paired concepts)
  oppositeOf?: IRIReference

  // External references
  sameAs?: ExternalReference[]
}

// ============================================================================
// TCM Reference Types
// ============================================================================

/**
 * TCM Herb Category (中药分类).
 * Functional grouping of herbs by primary therapeutic action.
 */
export interface TCMCategory extends ReferenceEntity {
  '@id': `tcm/category/${string}`
  '@type': ['tcm:Category', ...string[]]

  pinyin?: string
  hanyuPinlu?: string // Pinyin with tone numbers
  categoryCode?: string // Numeric code per textbooks

  // Hierarchy
  subcategories?: IRIReference[]
  parentCategory?: IRIReference

  // Clinical info
  indications?: LanguageMap
  usageNotes?: LanguageMap
  contraindications?: LanguageMap

  // Example herbs
  exampleHerbs?: IRIReference[]
}

/**
 * TCM Thermal Nature (四气/四性).
 * The heating or cooling effect on the body.
 */
export interface TCMNature extends ReferenceEntity {
  '@id': `tcm/nature/${string}`
  '@type': ['tcm:Nature', ...string[]]

  pinyin?: string
  code?: 'H' | 'W' | 'N' | 'C' | 'CD' // Hot, Warm, Neutral, Cool, Cold
  degree?: -2 | -1 | 0 | 1 | 2 // Numerical scale

  // Effects
  effectOnBody?: LanguageMap
  indicatedFor?: LanguageMap
  contraindicatedFor?: LanguageMap
  oppositeOf?: IRIReference
}

/**
 * TCM Flavor (五味).
 * Functional category based on taste, each with specific therapeutic actions.
 */
export interface TCMFlavor extends ReferenceEntity {
  '@id': `tcm/flavor/${string}`
  '@type': ['tcm:Flavor', ...string[]]

  pinyin?: string
  fiveElement?: 'wood' | 'fire' | 'earth' | 'metal' | 'water'
  associatedOrgan?: string
  qiDirection?: 'ascending' | 'descending' | 'floating' | 'sinking' | 'dispersing' | 'gathering'

  // Actions
  functions?: LanguageMap
  effectOnQi?: LanguageMap
  contraindications?: LanguageMap

  // Is this one of the five standard flavors?
  isStandardFlavor?: boolean
}

/**
 * TCM Meridian (经脉).
 * Energetic pathway that herbs enter.
 */
export interface TCMMeridian extends ReferenceEntity {
  '@id': `tcm/meridian/${string}`
  '@type': ['tcm:Meridian', ...string[]]

  pinyin?: string
  abbreviation?: string // e.g., 'LU', 'LI', 'ST'

  // Classification
  isRegularMeridian?: boolean
  isExtraordinaryMeridian?: boolean
  organType?: 'zang' | 'fu' | 'extraordinary'
  element?: 'wood' | 'fire' | 'earth' | 'metal' | 'water' | 'none'

  // Relationships
  pairedMeridian?: IRIReference
  associatedOrgan?: LanguageMap

  // Properties
  timeOfPeakFlow?: string
  pathway?: LanguageMap
  functions?: LanguageMap
  commonIndications?: LanguageMap
  numberOfPoints?: number
}

// ============================================================================
// Western Reference Types
// ============================================================================

/**
 * Western Herbal Action.
 * Pharmacological/therapeutic effect based on biomedical science.
 */
export interface WesternAction extends ReferenceEntity {
  '@id': `western/action/${string}`
  '@type': ['western:Action', ...string[]]

  definition?: LanguageMap
  mechanism?: LanguageMap
  bodySystem?: string[]
  physiologicalEffect?: LanguageMap
  clinicalIndications?: string[]

  // Evidence
  evidenceLevel?: 'traditional' | 'empirical' | 'preliminary' | 'moderate' | 'strong'

  // Safety
  contraindications?: string[]
  drugInteractions?: string[]

  // Cross-system
  relatedActions?: IRIReference[]
  tcmEquivalents?: IRIReference[]
  ayurvedaEquivalents?: string[]
}

/**
 * Western Organ/System Affinity.
 * Anatomical/physiological organ or body system.
 */
export interface WesternOrgan extends ReferenceEntity {
  '@id': `western/organ/${string}`
  '@type': ['western:Organ', ...string[]]

  organType?: 'solid_organ' | 'hollow_organ' | 'gland' | 'tissue' | 'system'
  bodySystem?: IRIReference
  anatomicalLocation?: LanguageMap
  physiologicalFunctions?: string[]

  // Relationships
  associatedActions?: IRIReference[]
  commonHerbs?: IRIReference[]
  tcmEquivalent?: IRIReference
  ayurvedaEquivalent?: string
}

/**
 * Western Body System.
 * Major physiological system.
 */
export interface WesternSystem extends ReferenceEntity {
  '@id': `western/system/${string}`
  '@type': ['western:System', ...string[]]

  description?: LanguageMap
  components?: IRIReference[]
  functions?: string[]
  associatedActions?: IRIReference[]
  commonConditions?: string[]
  keyHerbs?: IRIReference[]
}

// ============================================================================
// Ayurveda Reference Types
// ============================================================================

/**
 * Ayurveda Rasa (Taste).
 * One of the six tastes with specific dosha effects.
 */
export interface AyurvedaRasa extends ReferenceEntity {
  '@id': `ayurveda/rasa/${string}`
  '@type': ['ayurveda:Rasa', ...string[]]

  sanskritName?: string // Devanagari
  sanskritTransliteration?: string // IAST
  englishName?: string

  // Composition
  elementComposition?: Array<{
    element: 'prithvi' | 'apas' | 'tejas' | 'vayu' | 'akasha'
    proportion: 'dominant' | 'secondary' | 'minor'
  }>

  // Effects
  effectOnDoshas?: {
    vata?: 'increases' | 'decreases' | 'neutral'
    pitta?: 'increases' | 'decreases' | 'neutral'
    kapha?: 'increases' | 'decreases' | 'neutral'
  }
  effectOnDigestion?: LanguageMap
  effectOnTissues?: LanguageMap

  // Usage
  generalActions?: string[]
  excessEffects?: LanguageMap
  indications?: string[]
  contraindications?: string[]
  commonSubstances?: string[]

  // Cross-system
  tcmFlavorEquivalent?: IRIReference
}

/**
 * Ayurveda Guna (Quality).
 * One of the 20 qualities in 10 opposing pairs.
 */
export interface AyurvedaGuna extends ReferenceEntity {
  '@id': `ayurveda/guna/${string}`
  '@type': ['ayurveda:Guna', ...string[]]

  sanskritName?: string
  sanskritTransliteration?: string
  englishName?: string

  // Pair relationship
  oppositeOf?: IRIReference
  pairNumber?: number // 1-10
  pairName?: LanguageMap

  // Effects
  effectOnDoshas?: {
    vata?: 'increases' | 'decreases' | 'neutral'
    pitta?: 'increases' | 'decreases' | 'neutral'
    kapha?: 'increases' | 'decreases' | 'neutral'
  }
  physiologicalEffect?: LanguageMap
  psychologicalEffect?: LanguageMap

  // Usage
  indications?: string[]
  excessEffects?: LanguageMap
  exampleSubstances?: string[]
}

/**
 * Ayurveda Virya (Potency).
 * Heating or cooling energetic effect.
 */
export interface AyurvedaVirya extends ReferenceEntity {
  '@id': `ayurveda/virya/${string}`
  '@type': ['ayurveda:Virya', ...string[]]

  sanskritName?: string
  sanskritTransliteration?: string
  englishName?: string
  code?: 'H' | 'C'

  oppositeOf?: IRIReference

  // Effects
  effectOnDoshas?: {
    vata?: 'increases' | 'decreases' | 'variable'
    pitta?: 'increases' | 'decreases' | 'variable'
    kapha?: 'increases' | 'decreases' | 'variable'
  }
  effectOnAgni?: LanguageMap
  physiologicalEffect?: LanguageMap

  // Usage
  indications?: string[]
  contraindications?: string[]
  exampleSubstances?: string[]

  // Cross-system
  tcmNatureEquivalent?: IRIReference
}

/**
 * Ayurveda Vipaka (Post-digestive Effect).
 * Sweet, sour, or pungent effect after digestion.
 */
export interface AyurvedaVipaka extends ReferenceEntity {
  '@id': `ayurveda/vipaka/${string}`
  '@type': ['ayurveda:Vipaka', ...string[]]

  sanskritName?: string
  sanskritTransliteration?: string
  englishName?: string

  // Which rasas transform into this vipaka
  rasaTransformation?: IRIReference[]

  // Effects
  effectOnDoshas?: {
    vata?: 'increases' | 'decreases' | 'neutral'
    pitta?: 'increases' | 'decreases' | 'neutral'
    kapha?: 'increases' | 'decreases' | 'neutral'
  }
  effectOnTissues?: LanguageMap
  effectOnExcretion?: LanguageMap
  longTermEffects?: LanguageMap

  // Usage
  indications?: string[]
  contraindications?: string[]
  exampleSubstances?: string[]
}

/**
 * Ayurveda Dosha.
 * One of the three fundamental bio-energies.
 */
export interface AyurvedaDosha extends ReferenceEntity {
  '@id': `ayurveda/dosha/${string}`
  '@type': ['ayurveda:Dosha', ...string[]]

  sanskritName?: string
  sanskritTransliteration?: string
  englishName?: string

  // Elements
  primaryElement?: Array<{
    element: 'akasha' | 'vayu' | 'tejas' | 'apas' | 'prithvi'
    proportion: 'primary' | 'secondary'
  }>

  // Properties
  primaryFunction?: LanguageMap
  primarySeat?: string
  governs?: string[]
  psychologicalAttributes?: string[]
  physicalAttributes?: string[]
  imbalanceSigns?: string[]
  deficiencySigns?: string[]

  // Balancing factors
  balancingRasas?: IRIReference[]
  aggravatingRasas?: IRIReference[]
  balancingGunas?: IRIReference[]
  aggravatingGunas?: IRIReference[]

  // Temporal associations
  associatedSeasons?: string[]
  associatedTimeOfDay?: string[]
  associatedLifeStage?: string
}

/**
 * Ayurveda Prabhava (Special Effect).
 * Unique effect beyond rasa, virya, vipaka.
 */
export interface AyurvedaPrabhava extends ReferenceEntity {
  '@id': `ayurveda/prabhava/${string}`
  '@type': ['ayurveda:Prabhava', ...string[]]

  sanskritName?: string
  sanskritTransliteration?: string
  englishName?: string

  definition?: LanguageMap
  mechanism?: LanguageMap

  // Category of effect
  category?: string

  // Usage
  indications?: string[]
  exampleSubstances?: IRIReference[]

  // Classical references
  classicalReferences?: Array<{
    text: string
    reference: string
    quote?: string
  }>
}

// ============================================================================
// Type Guards
// ============================================================================

export function isReferenceEntity(entity: Entity): entity is ReferenceEntity {
  const refTypes = [
    'tcm:Category', 'tcm:Nature', 'tcm:Flavor', 'tcm:Meridian',
    'western:Action', 'western:Organ', 'western:System',
    'ayurveda:Rasa', 'ayurveda:Guna', 'ayurveda:Virya',
    'ayurveda:Vipaka', 'ayurveda:Dosha', 'ayurveda:Prabhava'
  ]
  return entity['@type'].some(t => refTypes.includes(t))
}

export function isTCMCategory(entity: Entity): entity is TCMCategory {
  return entity['@type'].includes('tcm:Category')
}

export function isTCMNature(entity: Entity): entity is TCMNature {
  return entity['@type'].includes('tcm:Nature')
}

export function isTCMFlavor(entity: Entity): entity is TCMFlavor {
  return entity['@type'].includes('tcm:Flavor')
}

export function isTCMMeridian(entity: Entity): entity is TCMMeridian {
  return entity['@type'].includes('tcm:Meridian')
}

export function isWesternAction(entity: Entity): entity is WesternAction {
  return entity['@type'].includes('western:Action')
}

export function isWesternOrgan(entity: Entity): entity is WesternOrgan {
  return entity['@type'].includes('western:Organ')
}

export function isWesternSystem(entity: Entity): entity is WesternSystem {
  return entity['@type'].includes('western:System')
}

export function isAyurvedaRasa(entity: Entity): entity is AyurvedaRasa {
  return entity['@type'].includes('ayurveda:Rasa')
}

export function isAyurvedaGuna(entity: Entity): entity is AyurvedaGuna {
  return entity['@type'].includes('ayurveda:Guna')
}

export function isAyurvedaVirya(entity: Entity): entity is AyurvedaVirya {
  return entity['@type'].includes('ayurveda:Virya')
}

export function isAyurvedaVipaka(entity: Entity): entity is AyurvedaVipaka {
  return entity['@type'].includes('ayurveda:Vipaka')
}

export function isAyurvedaDosha(entity: Entity): entity is AyurvedaDosha {
  return entity['@type'].includes('ayurveda:Dosha')
}

export function isAyurvedaPrabhava(entity: Entity): entity is AyurvedaPrabhava {
  return entity['@type'].includes('ayurveda:Prabhava')
}

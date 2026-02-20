/**
 * Traditional Chinese Medicine (TCM) types for Herbapedia
 *
 * All content properties are TCM-SCOPED (tcm:traditionalUsage, not generic)
 */

import type { JsonLdNode, LanguageMap, SystemProfileBase } from './core'

// TCM Nature (四气/四性)
export type TCMMedicineNature =
  | 'hot'    // 热
  | 'warm'   // 温
  | 'neutral' // 平
  | 'cool'   // 凉
  | 'cold'   // 寒

// TCM Flavor (五味)
export type TCMFlavor =
  | 'sweet'     // 甘
  | 'sour'      // 酸
  | 'bitter'    // 苦
  | 'acrid'     // 辛
  | 'salty'     // 咸
  | 'astringent' // 涩
  | 'bland'     // 淡

// TCM Meridians (十二经脉)
export type TCMMeridian =
  | 'lung'           // 肺
  | 'large-intestine' // 大肠
  | 'stomach'        // 胃
  | 'spleen'         // 脾
  | 'heart'          // 心
  | 'small-intestine' // 小肠
  | 'bladder'        // 膀胱
  | 'kidney'         // 肾
  | 'pericardium'    // 心包
  | 'triple-burner'  // 三焦
  | 'gallbladder'    // 胆
  | 'liver'          // 肝

// Extra meridians (奇经八脉)
export type TCMExtraMeridian =
  | 'governor-vessel'     // 督脉
  | 'conception-vessel'   // 任脉
  | 'penetrating-vessel'  // 冲脉
  | 'girdling-vessel'     // 带脉
  | 'yang-linking'        // 阳维脉
  | 'yin-linking'         // 阴维脉
  | 'yang-heel'           // 阳跷脉
  | 'yin-heel'            // 阴跷脉

// TCM Five Elements (五行)
export type TCMElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

// TCM Category
export interface TCMCategory extends JsonLdNode {
  '@id': string
  '@type': ['tcm:Category', 'skos:Concept']

  prefLabel: LanguageMap
  altLabel?: string[]
  definition?: LanguageMap

  broader?: string[]
  narrower?: string[]

  exampleHerbs?: string[]
}

// TCM Nature Entity
export interface TCMNatureEntity extends JsonLdNode {
  '@id': string
  '@type': 'tcm:Nature'

  natureValue: TCMMedicineNature
  prefLabel: LanguageMap
  definition?: LanguageMap
}

// TCM Flavor Entity
export interface TCMFlavorEntity extends JsonLdNode {
  '@id': string
  '@type': 'tcm:Flavor'

  flavorValue: TCMFlavor
  prefLabel: LanguageMap
  definition?: LanguageMap
  associatedOrgan?: string
}

// TCM Meridian Entity
export interface TCMMeridianEntity extends JsonLdNode {
  '@id': string
  '@type': 'tcm:Meridian'

  meridianValue: string
  prefLabel: LanguageMap
  pinyin?: string
  chineseName?: string

  element?: TCMElement
  yinYang?: 'yin' | 'yang'

  definition?: LanguageMap
}

/**
 * TCM Herb Profile
 *
 * Contains TCM-specific properties and content.
 * All content is scoped to TCM vocabulary (tcm:traditionalUsage, etc.)
 */
export interface TCMHerbProfile extends SystemProfileBase {
  '@context': string | string[]
  '@id': string
  '@type': ['tcm:Herb', 'schema:DietarySupplement']

  // Link to plant entity
  derivedFromPlant: string

  // Processing
  processingMethod?: string

  // Names
  pinyin: string
  chineseName?: LanguageMap

  // TCM Classification Properties
  hasCategory: string
  hasNature: string
  hasFlavor: string[]
  entersMeridian: string[]

  // TCM Content (TCM-scoped, not generic)
  tcmHistory?: LanguageMap
  tcmTraditionalUsage?: LanguageMap
  tcmModernResearch?: LanguageMap
  tcmClinicalNotes?: LanguageMap
  tcmClassicalReference?: LanguageMap
  tcmFunctions?: LanguageMap
  tcmImportance?: LanguageMap
  tcmSafetyConsideration?: LanguageMap
  tcmBotanicalSource?: LanguageMap

  // Actions and Indications
  actions?: string[]
  indications?: string[]

  // Safety
  contraindications?: LanguageMap
  dosage?: LanguageMap
  preparation?: LanguageMap

  // Relationships
  combinesWith?: string[]
  comparesTo?: string[]
  isRelatedTo?: string[]
  isSimilarTo?: string[]
  sameAs?: string[]

  // Provenance
  source?: string
  sourceUrl?: string
  creator?: string
  created?: string
  modified?: string
  license?: string
}

// TCM Reference Data
export interface TCMReferenceData {
  natures: TCMNatureEntity[]
  flavors: TCMFlavorEntity[]
  meridians: TCMMeridianEntity[]
  categories: TCMCategory[]
}

// TCM Herb Index
export interface TCMHerbIndex {
  version: string
  generated: string
  totalHerbs: number
  herbs: {
    slug: string
    profileId: string
    plantId: string
    category: string
    pinyin: string
    languages: string[]
  }[]
}

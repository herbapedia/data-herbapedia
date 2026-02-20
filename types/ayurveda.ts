/**
 * Ayurvedic Medicine types for Herbapedia
 *
 * All content properties are AYURVEDA-SCOPED (ayurveda:traditionalUsage, not generic)
 */

import type { JsonLdNode, LanguageMap, SystemProfileBase } from './core'

// Ayurvedic Doshas (三能量)
export type DoshaType =
  | 'vata'  // 风型 (瓦塔)
  | 'pitta' // 火型 (皮塔)
  | 'kapha' // 水型 (卡法)

// Ayurvedic Rasa (六味)
export type RasaType =
  | 'sweet'     // 甜 (madhura)
  | 'sour'      // 酸 (amla)
  | 'salty'     // 咸 (lavana)
  | 'pungent'   // 辛 (katu)
  | 'bitter'    // 苦 (tikta)
  | 'astringent' // 涩 (kashaya)

// Ayurvedic Virya (能量/ potency)
export type ViryaType =
  | 'heating'  // 热 (ushna)
  | 'cooling'  // 冷 (sheeta)

// Ayurvedic Vipaka (后味/ post-digestive effect)
export type VipakaType =
  | 'sweet'  // 甜
  | 'sour'   // 酸
  | 'pungent' // 辛

// Ayurvedic Guna (属性/ qualities)
export type GunaType =
  | 'heavy'     // 重 (guru)
  | 'light'     // 轻 (laghu)
  | 'cold'      // 冷 (sheeta)
  | 'hot'       // 热 (ushna)
  | 'oily'      // 油 (snigdha)
  | 'dry'       // 干 (ruksha)
  | 'dull'      // 钝 (manda)
  | 'sharp'     // 锐 (tikshna)
  | 'smooth'    // 滑 (shlakshna)
  | 'rough'     // 糙 (khara)
  | 'dense'     // 密 (sandra)
  | 'liquid'    // 液 (drava)
  | 'soft'      // 软 (mrudu)
  | 'hard'      // 硬 (kathina)
  | 'stable'    // 稳 (sthira)
  | 'mobile'    // 动 (chala)
  | 'subtle'    // 微 (sukshma)
  | 'gross'     // 粗 (sthula)
  | 'cloudy'    // 浊 (picchila)
  | 'clear'     // 清 (vishada)

// Mahabhuta (五大元素)
export type MahabhutaType =
  | 'earth'   // 地 (prithvi)
  | 'water'   // 水 (ap/jala)
  | 'fire'    // 火 (tejas)
  | 'air'     // 风 (vayu)
  | 'ether'   // 空 (akasha)

// Dosha Entity
export interface DoshaEntity extends JsonLdNode {
  '@id': string
  '@type': 'ayurveda:Dosha'

  doshaType: DoshaType
  prefLabel: LanguageMap
  sanskritName?: string
  definition?: LanguageMap

  mahabhuta?: MahabhutaType[]
  gunas?: string[]
}

// Rasa Entity
export interface RasaEntity extends JsonLdNode {
  '@id': string
  '@type': 'ayurveda:Rasa'

  rasaValue: RasaType
  prefLabel: LanguageMap
  sanskritName?: string
  definition?: LanguageMap

  increasesDosha?: string[]
  decreasesDosha?: string[]

  mahabhuta?: MahabhutaType[]
}

// Virya Entity
export interface ViryaEntity extends JsonLdNode {
  '@id': string
  '@type': 'ayurveda:Virya'

  viryaValue: ViryaType
  prefLabel: LanguageMap
  sanskritName?: string
  definition?: LanguageMap
}

// Vipaka Entity
export interface VipakaEntity extends JsonLdNode {
  '@id': string
  '@type': 'ayurveda:Vipaka'

  vipakaValue: VipakaType
  prefLabel: LanguageMap
  sanskritName?: string
  definition?: LanguageMap
}

// Guna Entity
export interface GunaEntity extends JsonLdNode {
  '@id': string
  '@type': 'ayurveda:Guna'

  gunaValue: GunaType
  prefLabel: LanguageMap
  sanskritName?: string
  definition?: LanguageMap

  opposite?: string
}

/**
 * Ayurvedic Dravya (Substance/Medicine) Profile
 *
 * Contains Ayurveda-specific properties and content.
 * All content is scoped to Ayurveda vocabulary (ayurveda:traditionalUsage, etc.)
 */
export interface AyurvedaDravyaProfile extends SystemProfileBase {
  '@context': string | string[]
  '@id': string
  '@type': ['ayurveda:Dravya', 'schema:DietarySupplement']

  // Link to plant entity
  derivedFromPlant: string

  // Names
  sanskritName?: LanguageMap
  hindiName?: LanguageMap

  // Ayurvedic Properties (Rasa Panchaka)
  hasRasa: string[]
  hasVirya: string
  hasVipaka: string
  hasGuna: string[]
  hasPrabhava?: string[]

  // Dosha Effects
  balancesDosha?: string[]
  increasesDosha?: string[]
  decreasesDosha?: string[]

  // Ayurveda Content (Ayurveda-scoped, not generic)
  ayurvedaHistory?: LanguageMap
  ayurvedaTraditionalUsage?: LanguageMap
  ayurvedaModernResearch?: LanguageMap
  ayurvedaClinicalNotes?: LanguageMap
  ayurvedaClassicalReference?: LanguageMap
  ayurvedaFunctions?: LanguageMap
  ayurvedaImportance?: LanguageMap
  ayurvedaSafetyConsideration?: LanguageMap
  ayurvedaBotanicalSource?: LanguageMap

  // Actions and Indications
  karma?: string[]
  indications?: string[]
  contraindications?: LanguageMap

  // Dosage
  dosage?: LanguageMap
  anupana?: LanguageMap

  // Associated Mahabhutas
  mahabhuta?: string[]

  // Relationships
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

// Ayurveda Reference Data
export interface AyurvedaReferenceData {
  doshas: DoshaEntity[]
  rasas: RasaEntity[]
  viryas: ViryaEntity[]
  vipakas: VipakaEntity[]
  gunas: GunaEntity[]
}

// Ayurveda Dravya Index
export interface AyurvedaDravyaIndex {
  version: string
  generated: string
  totalDravyas: number
  dravyas: {
    slug: string
    profileId: string
    plantId: string
    sanskritName?: string
    hindiName?: string
    languages: string[]
  }[]
}

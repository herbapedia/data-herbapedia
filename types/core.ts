/**
 * Core types for Herbapedia data model.
 *
 * These types correspond to the JSON schemas in schema/json-schema/core/
 * and provide TypeScript type safety for all entity operations.
 *
 * ARCHITECTURE PRINCIPLES:
 * - PlantSpecies: Contains ONLY botanical facts (taxonomy, distribution)
 * - HerbalPreparation: The CENTRAL entity, derived from botanical sources
 * - System Profiles: Interpret a preparation through TCM/Western/Ayurveda lens
 * - A single preparation can have MULTIPLE system profiles
 */

// ============================================================================
// IRI and Reference Types
// ============================================================================

/**
 * A typed reference to another entity within the Herbapedia dataset.
 * Uses compact IRI format for internal references.
 *
 * @example
 * { "@id": "botanical/species/zingiber-officinale" }
 * { "@id": "preparation/fresh-ginger-rhizome" }
 * { "@id": "tcm/profile/sheng-jiang" }
 */
export interface IRIReference {
  '@id': string
  '@type'?: string
}

/**
 * External authority reference (Wikidata, GBIF, etc.)
 */
export type ExternalReference =
  | { '@id': string }
  | string

// ============================================================================
// Language Map
// ============================================================================

/**
 * Multilingual text map using BCP 47 language tags.
 * At minimum, English ('en') should always be provided.
 *
 * Supported language codes:
 * - en: English (required)
 * - zh-Hant: Traditional Chinese (繁體中文)
 * - zh-Hans: Simplified Chinese (简体中文)
 * - ja: Japanese (日本語)
 * - ko: Korean (한국어)
 * - hi: Hindi (हिन्दी)
 * - sa: Sanskrit (संस्कृतम्)
 *
 * @example
 * {
 *   "en": "Ginger",
 *   "zh-Hant": "薑",
 *   "zh-Hans": "姜"
 * }
 */
export type LanguageMap = {
  [languageCode: string]: string
}

// ============================================================================
// Provenance
// ============================================================================

/**
 * Data provenance and attribution information.
 */
export interface Provenance {
  source?: string
  sourceUrl?: string
  creator?: string
  created?: string // ISO 8601 datetime
  modified?: string // ISO 8601 datetime
  license?: string
  version?: string
  contributors?: Array<{
    name: string
    role?: string
    date?: string
  }>
  changes?: Array<{
    date: string
    description: string
    contributor?: string
  }>
  confidence?: number // 0-1 scale
  verified?: boolean
  verifiedBy?: string
  verifiedDate?: string
}

// ============================================================================
// Base Entity
// ============================================================================

/**
 * Abstract base entity for all Herbapedia data types.
 * Every entity inherits from this base.
 */
export interface Entity {
  '@context'?: string | string[]
  '@id': string
  '@type': string[]
  name: LanguageMap
  description?: LanguageMap
  alternateName?: string[]
  image?: string
  images?: string[]
  sameAs?: ExternalReference[]
  source?: Provenance
}

// ============================================================================
// Entity Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a valid IRI reference.
 */
export function isIRIReference(value: unknown): value is IRIReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    '@id' in value &&
    typeof (value as IRIReference)['@id'] === 'string'
  )
}

/**
 * Type guard to check if an object is a valid LanguageMap.
 */
export function isLanguageMap(value: unknown): value is LanguageMap {
  if (typeof value !== 'object' || value === null) return false
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every(k => /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(k))
}

/**
 * Extract the slug from an IRI.
 * @param iri - The IRI to extract from (e.g., "botanical/species/zingiber-officinale")
 * @returns The slug (e.g., "zingiber-officinale")
 */
export function extractSlug(iri: string): string {
  const parts = iri.split('/')
  return parts[parts.length - 1] || ''
}

/**
 * Extract the entity type from an IRI.
 * @param iri - The IRI to extract from
 * @returns The entity type (e.g., "species" from "botanical/species/zingiber-officinale")
 */
export function extractEntityType(iri: string): string {
  const parts = iri.split('/')
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

/**
 * Extract the namespace from an IRI.
 * @param iri - The IRI to extract from
 * @returns The namespace (e.g., "botanical" from "botanical/species/zingiber-officinale")
 */
export function extractNamespace(iri: string): string {
  const parts = iri.split('/')
  return parts[0] || ''
}

// ============================================================================
// IRI Constants and Utilities
// ============================================================================

/**
 * Base IRI for all Herbapedia entities.
 */
export const HERBAPEDIA_BASE_IRI = 'https://www.herbapedia.org/'

/**
 * Entity path prefix within the Herbapedia IRI space.
 */
export const ENTITY_PREFIX = 'entity/'

/**
 * Full IRI namespace constants for Herbapedia entities.
 * These are used for building and matching full IRIs.
 */
export const IRI_NAMESPACES = {
  // Botanical entities
  BOTANICAL_SPECIES: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/species`,
  BOTANICAL_PART: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/part`,
  BOTANICAL_CHEMICAL: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/chemical`,
  BOTANICAL_CHEMICAL_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/chemical-profile`,
  BOTANICAL_BARCODE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/barcode`,
  BOTANICAL_IDENTIFICATION_METHOD: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}botanical/identification-method`,

  // Preparations and formulas
  PREPARATION: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}preparation`,
  FORMULA: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}formula`,

  // System profiles
  TCM_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}profile/tcm`,
  WESTERN_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}profile/western`,
  AYURVEDA_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}profile/ayurveda`,
  PERSIAN_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}profile/persian`,
  MONGOLIAN_PROFILE: `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}profile/mongolian`,

  // TCM reference data
  TCM_CATEGORY: `${HERBAPEDIA_BASE_IRI}reference/tcm/category`,
  TCM_NATURE: `${HERBAPEDIA_BASE_IRI}reference/tcm/nature`,
  TCM_FLAVOR: `${HERBAPEDIA_BASE_IRI}reference/tcm/flavor`,
  TCM_MERIDIAN: `${HERBAPEDIA_BASE_IRI}reference/tcm/meridian`,

  // Western reference data
  WESTERN_ACTION: `${HERBAPEDIA_BASE_IRI}reference/western/action`,
  WESTERN_ORGAN: `${HERBAPEDIA_BASE_IRI}reference/western/organ`,
  WESTERN_SYSTEM: `${HERBAPEDIA_BASE_IRI}reference/western/system`,

  // Ayurveda reference data
  AYURVEDA_RASA: `${HERBAPEDIA_BASE_IRI}reference/ayurveda/rasa`,
  AYURVEDA_GUNA: `${HERBAPEDIA_BASE_IRI}reference/ayurveda/guna`,
  AYURVEDA_VIRYA: `${HERBAPEDIA_BASE_IRI}reference/ayurveda/virya`,
  AYURVEDA_VIPAKA: `${HERBAPEDIA_BASE_IRI}reference/ayurveda/vipaka`,
  AYURVEDA_DOSHA: `${HERBAPEDIA_BASE_IRI}reference/ayurveda/dosha`,

  // Persian reference data
  PERSIAN_TEMPERAMENT: `${HERBAPEDIA_BASE_IRI}reference/persian/temperament`,
  PERSIAN_ELEMENT: `${HERBAPEDIA_BASE_IRI}reference/persian/element`,
  PERSIAN_DEGREE: `${HERBAPEDIA_BASE_IRI}reference/persian/degree`,

  // Mongolian reference data
  MONGOLIAN_ELEMENT: `${HERBAPEDIA_BASE_IRI}reference/mongolian/element`,
  MONGOLIAN_ROOT: `${HERBAPEDIA_BASE_IRI}reference/mongolian/root`,
  MONGOLIAN_TASTE: `${HERBAPEDIA_BASE_IRI}reference/mongolian/taste`,
  MONGOLIAN_POTENCY: `${HERBAPEDIA_BASE_IRI}reference/mongolian/potency`,
} as const

/**
 * Build a full IRI from namespace and slug.
 * @param namespace - The IRI namespace (e.g., IRI_NAMESPACES.BOTANICAL_SPECIES)
 * @param slug - The entity slug (e.g., "ginseng")
 * @returns Full IRI (e.g., "https://www.herbapedia.org/entity/botanical/species/ginseng")
 */
export function buildIRI(namespace: string, slug: string): string {
  return `${namespace}/${slug}`
}

/**
 * Check if an IRI belongs to a specific namespace.
 * Handles both full IRIs and relative IRIs.
 */
export function isNamespace(iri: string, namespace: string): boolean {
  // Handle full IRI
  if (iri.startsWith(namespace + '/')) {
    return true
  }
  // Handle relative IRI (for backward compatibility)
  const relativeNamespace = namespace.replace(HERBAPEDIA_BASE_IRI, '').replace(ENTITY_PREFIX, '')
  return iri.startsWith(relativeNamespace + '/')
}

/**
 * Check if a string is a full Herbapedia IRI.
 */
export function isFullIRI(iri: string): boolean {
  return iri.startsWith(HERBAPEDIA_BASE_IRI)
}

/**
 * Convert a relative IRI to a full IRI.
 * @param iri - The relative IRI (e.g., "botanical/species/ginseng")
 * @returns Full IRI (e.g., "https://www.herbapedia.org/entity/botanical/species/ginseng")
 */
export function toFullIRI(iri: string): string {
  if (isFullIRI(iri)) return iri
  return `${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}${iri}`
}

/**
 * Convert a full IRI to a relative IRI for internal use.
 * @param iri - The full IRI (e.g., "https://www.herbapedia.org/entity/botanical/species/ginseng")
 * @returns Relative IRI (e.g., "botanical/species/ginseng")
 */
export function toRelativeIRI(iri: string): string {
  if (!isFullIRI(iri)) return iri
  return iri.replace(`${HERBAPEDIA_BASE_IRI}${ENTITY_PREFIX}`, '')
}

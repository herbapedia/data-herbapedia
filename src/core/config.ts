/**
 * Centralized configuration for Herbapedia
 *
 * Single source of truth for all namespace mappings and configuration.
 * This replaces duplicate NAMESPACE_MAP definitions in dataset.ts and loader.ts.
 */

// ============================================================================
// Namespace Configuration
// ============================================================================

/**
 * IRI namespace mappings
 * Used for resolving relative IRIs to full URLs
 */
export const NAMESPACE_MAP = {
  // Core namespaces
  'entity': 'https://www.herbapedia.org/entity/',
  'vocab': 'https://www.herbapedia.org/vocab/',
  'system': 'https://www.herbapedia.org/system/',

  // Entity namespaces
  'botanical': 'https://www.herbapedia.org/entity/botanical/',
  'preparation': 'https://www.herbapedia.org/entity/preparation/',
  'formula': 'https://www.herbapedia.org/entity/formula/',

  // System namespaces
  'tcm': 'https://www.herbapedia.org/system/tcm/profile/',
  'western': 'https://www.herbapedia.org/system/western/profile/',
  'ayurveda': 'https://www.herbapedia.org/system/ayurveda/profile/',
  'persian': 'https://www.herbapedia.org/system/persian/profile/',
  'mongolian': 'https://www.herbapedia.org/system/mongolian/profile/',

  // Vocabulary namespaces
  'herbapedia': 'https://www.herbapedia.org/vocab/core/',
  'botany': 'https://www.herbapedia.org/vocab/botany/',
  'herbal': 'https://www.herbapedia.org/vocab/herbal/',
  'tcmvocab': 'https://www.herbapedia.org/vocab/tcm/',
  'westernvocab': 'https://www.herbapedia.org/vocab/western/',

  // External namespaces
  'schema': 'https://schema.org/',
  'dwc': 'http://rs.tdwg.org/dwc/terms/',
  'skos': 'http://www.w3.org/2004/02/skos/core#',
  'dc': 'http://purl.org/dc/terms/',
  'xsd': 'http://www.w3.org/2001/XMLSchema#',
  'owl': 'http://www.w3.org/2002/07/owl#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'wd': 'http://www.wikidata.org/entity/',
  'gbif': 'https://www.gbif.org/species/',
} as const

export type Namespace = keyof typeof NAMESPACE_MAP

// ============================================================================
// Entity Type Configuration
// ============================================================================

/**
 * Entity type configuration
 * Used for validation and query routing
 */
export const ENTITY_TYPE_CONFIG = {
  // Botanical entities
  'PlantSpecies': {
    paths: ['entities/botanical/species', 'entities/plants'],
    required: ['scientificName', 'name'],
    schema: 'botanical/plant-species.schema.json',
  },
  'PlantPart': {
    paths: ['entities/botanical/parts'],
    required: ['partOf', 'name'],
    schema: 'botanical/plant-part.schema.json',
  },
  'ChemicalCompound': {
    paths: ['entities/botanical/chemicals'],
    required: ['name'],
    schema: 'botanical/chemical-compound.schema.json',
  },
  'ChemicalProfile': {
    paths: ['entities/botanical/profiles'],
    required: ['profileOf', 'name'],
    schema: 'botanical/chemical-profile.schema.json',
  },
  'DNABarcode': {
    paths: ['entities/botanical/barcodes'],
    required: ['barcodes', 'name'],
    schema: 'botanical/dna-barcode.schema.json',
  },

  // Preparation entities
  'HerbalPreparation': {
    paths: ['entities/preparations'],
    required: ['derivedFrom', 'name'],
    schema: 'herbal/herbal-preparation.schema.json',
  },

  // Profile entities
  'TCMProfile': {
    paths: ['systems/tcm/herbs'],
    required: ['pinyin', 'hasCategory', 'hasNature', 'hasFlavor'],
    schema: 'profiles/tcm-profile.schema.json',
  },
  'WesternProfile': {
    paths: ['systems/western/herbs'],
    required: ['name', 'hasAction'],
    schema: 'profiles/western-profile.schema.json',
  },
  'AyurvedaProfile': {
    paths: ['systems/ayurveda/dravyas'],
    required: ['sanskritName', 'hasRasa', 'hasVirya'],
    schema: 'profiles/ayurveda-profile.schema.json',
  },
  'PersianProfile': {
    paths: ['systems/persian/drugs'],
    required: ['persianName', 'hasTemperament'],
    schema: 'profiles/persian-profile.schema.json',
  },
  'MongolianProfile': {
    paths: ['systems/mongolian/herbs'],
    required: ['mongolianName', 'affectsRoots'],
    schema: 'profiles/mongolian-profile.schema.json',
  },
} as const

export type EntityType = keyof typeof ENTITY_TYPE_CONFIG

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize?: number
  ttl?: number
  stats?: boolean
}

/**
 * Herbapedia configuration
 */
export interface HerbapediaConfig {
  dataPath: string
  baseUrl: string
  cache?: CacheConfig
  strict?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  maxSize: 500,
  ttl: 5 * 60 * 1000, // 5 minutes
  stats: false,
}

/**
 * Default Herbapedia configuration
 */
export const DEFAULT_CONFIG: HerbapediaConfig = {
  dataPath: './data-herbapedia',
  baseUrl: 'https://www.herbapedia.org',
  cache: DEFAULT_CACHE_CONFIG,
  strict: false,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve a namespace prefix to its full IRI
 */
export function resolveNamespace(prefix: string): string {
  return NAMESPACE_MAP[prefix as Namespace] ?? `https://www.herbapedia.org/${prefix}/`
}

/**
 * Get entity type configuration
 */
export function getEntityConfig(type: string): typeof ENTITY_TYPE_CONFIG[keyof typeof ENTITY_TYPE_CONFIG] | undefined {
  // Try exact match first
  if (ENTITY_TYPE_CONFIG[type as EntityType]) {
    return ENTITY_TYPE_CONFIG[type as EntityType]
  }

  // Try fuzzy matching
  const upperType = type.toUpperCase()
  for (const [key, config] of Object.entries(ENTITY_TYPE_CONFIG)) {
    if (upperType.includes(key.toUpperCase())) {
      return config
    }
  }

  return undefined
}

/**
 * Detect entity type from @type array
 */
export function detectEntityType(types: string[]): string | null {
  for (const type of types) {
    const config = getEntityConfig(type)
    if (config) return type
  }
  return null
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if entity is a PlantSpecies
 */
export function isPlantSpecies(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('PlantSpecies') || t.includes('schema:Plant')
  )
}

/**
 * Type guard to check if entity is a TCM Profile
 */
export function isTCMProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('tcm:Herb') || t.includes('TCMProfile')
  )
}

/**
 * Type guard to check if entity is a Western Profile
 */
export function isWesternProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('western:Herb') || t.includes('WesternProfile')
  )
}

/**
 * Type guard to check if entity is an Ayurveda Profile
 */
export function isAyurvedaProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('ayurveda:Dravya') || t.includes('AyurvedaProfile')
  )
}

/**
 * Type guard to check if entity is a Persian Profile
 */
export function isPersianProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('persian:Drug') || t.includes('PersianProfile')
  )
}

/**
 * Type guard to check if entity is a Mongolian Profile
 */
export function isMongolianProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('mongolian:Herb') || t.includes('MongolianProfile')
  )
}

/**
 * Type guard to check if entity is a Chemical Compound
 */
export function isChemicalCompound(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('ChemicalCompound') || t.includes('chemical:Compound')
  )
}

/**
 * Type guard to check if entity is a Herbal Preparation
 */
export function isHerbalPreparation(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('HerbalPreparation') || t.includes('herbal:Preparation')
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a relative IRI to a full URL
 */
export function toFullIRI(relativeIRI: string, baseUrl: string = NAMESPACE_MAP['entity']): string {
  // Already full IRI
  if (relativeIRI.startsWith('http://') || relativeIRI.startsWith('https://')) {
    return relativeIRI
  }

  // Has namespace prefix
  const [prefix, ...rest] = relativeIRI.split('/')
  if (prefix && prefix in NAMESPACE_MAP) {
    return `${NAMESPACE_MAP[prefix as Namespace]}${rest.join('/')}`
  }

  // Default to entity namespace
  return `${baseUrl}${relativeIRI}`
}

/**
 * Convert a full URL to relative IRI
 */
export function toRelativeIRI(fullIRI: string): string {
  // Check each namespace
  for (const [prefix, url] of Object.entries(NAMESPACE_MAP)) {
    if (fullIRI.startsWith(url)) {
      const relative = fullIRI.slice(url.length)
      return `${prefix}/${relative}`
    }
  }

  // Check external namespaces
  const externalMap: Record<string, string> = {
    'http://www.wikidata.org/entity/': 'wd:',
    'https://www.gbif.org/species/': 'gbif:',
    'https://schema.org/': 'schema:',
    'http://rs.tdwg.org/dwc/terms/': 'dwc:',
  }

  for (const url of Object.keys(externalMap)) {
    if (fullIRI.startsWith(url)) {
      return fullIRI.slice(url.length)
    }
  }

  // Return as-is if no match
  return fullIRI
}

/**
 * Get file path for entity IRI
 */
export function iriToFilePath(iri: string, dataPath: string): string {
  const relative = toRelativeIRI(iri)

  // Parse namespace and slug
  const [namespace, ...pathParts] = relative.split('/')
  const slug = pathParts.join('/')

  // Map namespace to directory
  const namespaceToDir: Record<string, string> = {
    'botanical': 'entities/botanical',
    'preparation': 'entities/preparation',
    'formula': 'entities/formula',
    'tcm': 'systems/tcm/herbs',
    'western': 'systems/western/herbs',
    'ayurveda': 'systems/ayurveda/dravyas',
    'persian': 'systems/persian/drugs',
    'mongolian': 'systems/mongolian/herbs',
  }

  const dir = namespaceToDir[namespace as keyof typeof namespaceToDir]
  if (!dir) {
    throw new Error(`Unknown namespace: ${namespace}`)
  }

  // Determine file name
  let fileName: string
  if (namespace === 'tcm' || namespace === 'western' || namespace === 'ayurveda' ||
      namespace === 'persian' || namespace === 'mongolian') {
    fileName = 'profile.jsonld'
  } else {
    fileName = 'entity.jsonld'
  }

  return `${dataPath}/${dir}/${slug}/${fileName}`
}

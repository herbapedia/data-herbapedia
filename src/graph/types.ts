/**
 * Core types for the Herbapedia Knowledge Graph
 *
 * These types define the normalized graph structure where:
 * - Each node has a unique @id (IRI)
 * - Relationships are @id references, not embedded objects
 * - Nodes are deduplicated by their canonical @id
 */

// ============================================================================
// Core RDF/JSON-LD Types
// ============================================================================

/**
 * A language-tagged string map
 */
export type LanguageMap = Record<string, string>

/**
 * An IRI reference - the fundamental building block of the graph
 */
export interface IRIReference {
  '@id': string
}

/**
 * A typed IRI reference
 */
export interface TypedIRIReference extends IRIReference {
  '@type'?: string | string[]
}

/**
 * A node in the knowledge graph
 */
export interface GraphNode {
  '@context'?: string | string[] | Record<string, unknown>
  '@id': string
  '@type': string | string[]
}

// ============================================================================
// Node Type Enumerations
// ============================================================================

/**
 * Canonical node types in the Herbapedia knowledge graph
 */
export const NodeType = {
  // Botanical entities
  SPECIES: 'species',
  PART: 'part',
  CHEMICAL: 'chemical',
  BARCODE: 'barcode',

  // Preparations & formulas
  PREPARATION: 'preparation',
  FORMULA: 'formula',

  // Profiles (medical system interpretations)
  TCM_PROFILE: 'tcm-profile',
  AYURVEDA_PROFILE: 'ayurveda-profile',
  WESTERN_PROFILE: 'western-profile',
  UNANI_PROFILE: 'unani-profile',
  MONGOLIAN_PROFILE: 'mongolian-profile',
  MODERN_PROFILE: 'modern-profile',

  // Vocabulary (controlled terms)
  TCM_FLAVOR: 'tcm-flavor',
  TCM_NATURE: 'tcm-nature',
  TCM_MERIDIAN: 'tcm-meridian',
  TCM_CATEGORY: 'tcm-category',
  AYURVEDA_DOSHA: 'ayurveda-dosha',
  AYURVEDA_RASA: 'ayurveda-rasa',
  AYURVEDA_GUNA: 'ayurveda-guna',
  AYURVEDA_VIRYA: 'ayurveda-virya',
  AYURVEDA_VIPAKA: 'ayurveda-vipaka',

  // Source & media
  SOURCE: 'source',
  IMAGE: 'image',
} as const

export type NodeTypeValue = typeof NodeType[keyof typeof NodeType]

/**
 * Medical system identifiers
 */
export const MedicalSystem = {
  TCM: 'tcm',
  AYURVEDA: 'ayurveda',
  WESTERN: 'western',
  UNANI: 'unani',
  MONGOLIAN: 'mongolian',
  MODERN: 'modern',
} as const

export type MedicalSystemValue = typeof MedicalSystem[keyof typeof MedicalSystem]

// ============================================================================
// IRI Patterns
// ============================================================================

/**
 * IRI patterns for each node type
 * These define the canonical URL structure for each node
 */
export const IRIPatterns = {
  // Botanical
  species: (slug: string) => `https://www.herbapedia.org/graph/species/${slug}`,
  part: (slug: string) => `https://www.herbapedia.org/graph/part/${slug}`,
  chemical: (slug: string) => `https://www.herbapedia.org/graph/chemical/${slug}`,
  barcode: (slug: string) => `https://www.herbapedia.org/graph/barcode/${slug}`,

  // Preparations & formulas
  preparation: (slug: string) => `https://www.herbapedia.org/graph/preparation/${slug}`,
  formula: (slug: string) => `https://www.herbapedia.org/graph/formula/${slug}`,

  // Profiles
  'tcm-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/tcm/${slug}`,
  'ayurveda-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/ayurveda/${slug}`,
  'western-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/western/${slug}`,
  'unani-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/unani/${slug}`,
  'mongolian-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/mongolian/${slug}`,
  'modern-profile': (slug: string) => `https://www.herbapedia.org/graph/profile/modern/${slug}`,

  // Vocabulary - TCM
  'tcm-flavor': (value: string) => `https://www.herbapedia.org/graph/vocab/tcm/flavor/${value}`,
  'tcm-nature': (value: string) => `https://www.herbapedia.org/graph/vocab/tcm/nature/${value}`,
  'tcm-meridian': (value: string) => `https://www.herbapedia.org/graph/vocab/tcm/meridian/${value}`,
  'tcm-category': (value: string) => `https://www.herbapedia.org/graph/vocab/tcm/category/${value}`,

  // Vocabulary - Ayurveda
  'ayurveda-dosha': (value: string) => `https://www.herbapedia.org/graph/vocab/ayurveda/dosha/${value}`,
  'ayurveda-rasa': (value: string) => `https://www.herbapedia.org/graph/vocab/ayurveda/rasa/${value}`,
  'ayurveda-guna': (value: string) => `https://www.herbapedia.org/graph/vocab/ayurveda/guna/${value}`,
  'ayurveda-virya': (value: string) => `https://www.herbapedia.org/graph/vocab/ayurveda/virya/${value}`,
  'ayurveda-vipaka': (value: string) => `https://www.herbapedia.org/graph/vocab/ayurveda/vipaka/${value}`,

  // Source & media
  source: (slug: string) => `https://www.herbapedia.org/graph/source/${slug}`,
  image: (slug: string) => `https://www.herbapedia.org/graph/image/${slug}`,
} as const

/**
 * Generate an IRI for a node
 */
export function generateIRI(nodeType: NodeTypeValue, identifier: string): string {
  const generator = IRIPatterns[nodeType]
  if (!generator) {
    throw new Error(`Unknown node type: ${nodeType}`)
  }
  return generator(identifier)
}

/**
 * Parse an IRI to extract node type and identifier
 */
export function parseIRI(iri: string): { nodeType: NodeTypeValue | null; identifier: string } {
  const prefix = 'https://www.herbapedia.org/graph/'

  if (!iri.startsWith(prefix)) {
    return { nodeType: null, identifier: iri }
  }

  const path = iri.slice(prefix.length)
  const segments = path.split('/')

  // Handle profile/{system}/{slug}
  if (segments[0] === 'profile' && segments.length === 3) {
    const system = segments[1]
    const nodeType = `${system}-profile` as NodeTypeValue
    return { nodeType, identifier: segments[2] }
  }

  // Handle vocab/{system}/{type}/{value}
  if (segments[0] === 'vocab' && segments.length === 4) {
    const system = segments[1]
    const vocabType = segments[2]
    const nodeType = `${system}-${vocabType}` as NodeTypeValue
    return { nodeType, identifier: segments[3] }
  }

  // Handle simple types: {type}/{slug}
  if (segments.length === 2) {
    const nodeType = segments[0] as NodeTypeValue
    return { nodeType, identifier: segments[1] }
  }

  return { nodeType: null, identifier: iri }
}

// ============================================================================
// Graph Registry Types
// ============================================================================

/**
 * A collection of nodes organized by type
 */
export interface GraphRegistry {
  species: Map<string, SpeciesNode>
  parts: Map<string, PartNode>
  chemicals: Map<string, ChemicalNode>
  preparations: Map<string, PreparationNode>
  formulas: Map<string, FormulaNode>
  profiles: ProfileRegistry
  vocabulary: VocabularyRegistry
  sources: Map<string, SourceNode>
  images: Map<string, ImageNode>
}

/**
 * Profile nodes organized by medical system
 */
export interface ProfileRegistry {
  tcm: Map<string, TcmProfileNode>
  ayurveda: Map<string, AyurvedaProfileNode>
  western: Map<string, WesternProfileNode>
  unani: Map<string, UnaniProfileNode>
  mongolian: Map<string, MongolianProfileNode>
  modern: Map<string, ModernProfileNode>
}

/**
 * Vocabulary nodes organized by system and type
 */
export interface VocabularyRegistry {
  tcm: {
    flavors: Map<string, VocabularyNode>
    natures: Map<string, VocabularyNode>
    meridians: Map<string, VocabularyNode>
    categories: Map<string, VocabularyNode>
  }
  ayurveda: {
    doshas: Map<string, VocabularyNode>
    rasas: Map<string, VocabularyNode>
    gunas: Map<string, VocabularyNode>
    viryas: Map<string, VocabularyNode>
    vipakas: Map<string, VocabularyNode>
  }
}

// ============================================================================
// Concrete Node Types
// ============================================================================

/**
 * Species node - a botanical species
 */
export interface SpeciesNode extends GraphNode {
  slug: string
  scientificName: string
  name: LanguageMap
  description?: LanguageMap
  family?: string
  genus?: string
  species?: string
  hasPart?: IRIReference[]
  containsChemical?: IRIReference[]
  hasProfile?: IRIReference[]
  sameAs?: IRIReference[]
  image?: string
}

/**
 * Plant part node
 */
export interface PartNode extends GraphNode {
  slug: string
  name: LanguageMap
  partOf?: IRIReference
  partType?: string
  containsChemical?: IRIReference[]
}

/**
 * Chemical compound node
 */
export interface ChemicalNode extends GraphNode {
  slug: string
  name: LanguageMap
  formula?: string
  inChI?: string
  inChIKey?: string
  casNumber?: string
}

/**
 * Herbal preparation node
 */
export interface PreparationNode extends GraphNode {
  '@type': ['herbapedia:HerbalPreparation']
  slug: string
  name: LanguageMap
  derivedFrom: IRIReference
  hasProfile?: IRIReference[]
  preparationMethod?: string
}

/**
 * Formula node (multi-herb preparation)
 */
export interface FormulaNode extends GraphNode {
  '@type': ['herbapedia:Formula']
  slug: string
  name: LanguageMap
  hasIngredient: IRIReference[]
}

/**
 * Base profile node (medical system interpretation)
 */
export interface ProfileNode extends GraphNode {
  slug: string
  name: LanguageMap
  derivedFrom?: IRIReference
}

/**
 * TCM Profile node
 */
export interface TcmProfileNode extends ProfileNode {
  pinyin?: string
  chineseName?: LanguageMap
  hasCategory?: IRIReference
  hasNature?: IRIReference
  hasFlavor?: IRIReference[]
  entersMeridian?: IRIReference[]
  tcmFunctions?: LanguageMap
  tcmTraditionalUsage?: LanguageMap
  tcmModernResearch?: LanguageMap
  dosage?: LanguageMap
  contraindications?: LanguageMap
}

/**
 * Ayurveda Profile node
 */
export interface AyurvedaProfileNode extends ProfileNode {
  sanskritName?: LanguageMap
  hasRasa?: IRIReference[]
  hasGuna?: IRIReference[]
  hasVirya?: IRIReference
  hasVipaka?: IRIReference
  affectsDosha?: IRIReference[]
}

/**
 * Western herbal profile node
 */
export interface WesternProfileNode extends ProfileNode {
  hasAction?: IRIReference[]
  hasOrganAffinity?: IRIReference[]
}

/**
 * Unani profile node
 */
export interface UnaniProfileNode extends ProfileNode {
  '@type': ['unani:Drug', 'schema:DietarySupplement']
}

/**
 * Mongolian profile node
 */
export interface MongolianProfileNode extends ProfileNode {
  '@type': ['mongolian:Drug', 'schema:DietarySupplement']
}

/**
 * Modern medicine profile node
 */
export interface ModernProfileNode extends ProfileNode {
  '@type': ['modern:Substance', 'schema:DietarySupplement']
}

/**
 * Vocabulary node (controlled term)
 */
export interface VocabularyNode extends GraphNode {
  slug: string
  value: string
  prefLabel: LanguageMap
  description?: LanguageMap
}

/**
 * Source node (data provenance)
 */
export interface SourceNode extends GraphNode {
  '@type': ['schema:Organization', 'prov:Organization']
  slug: string
  name: string
  url?: string
}

/**
 * Image node
 */
export interface ImageNode extends GraphNode {
  '@type': ['schema:ImageObject']
  slug: string
  contentUrl: string
  thumbnailUrl?: string
  encodingFormat?: string
  depicts?: IRIReference
}

// ============================================================================
// Graph Statistics
// ============================================================================

/**
 * Statistics about the graph
 */
export interface GraphStats {
  totalNodes: number
  byType: Record<string, number>
  lastUpdated: string
  buildVersion: string
  validation: {
    errors: number
    warnings: number
  }
}

// ============================================================================
// Export Formats
// ============================================================================

export type ExportFormat = 'jsonld' | 'turtle' | 'ntriples' | 'rdfxml'

/**
 * Export options
 */
export interface ExportOptions {
  format?: ExportFormat
  pretty?: boolean
  context?: string
  includeContext?: boolean
}

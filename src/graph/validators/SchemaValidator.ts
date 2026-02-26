/**
 * SchemaValidator - JSON Schema validation for graph nodes
 *
 * Validates nodes against JSON Schema definitions for each node type.
 * This provides structural validation independent of SHACL shapes.
 */

import type { GraphNode, NodeTypeValue } from '../types.js'
import { NodeType, parseIRI } from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'
import {
  type ValidationOptions,
  type ValidationResult,
  type NodeValidationResult,
  type ValidationIssue,
  createEmptyValidationResult,
  createNodeResult,
  createError,
  createWarning,
  addNodeResult,
  finalizeResult,
  addIssueToNode,
} from './ValidationResult.js'

/**
 * Schema definition for a node type
 */
interface NodeSchema {
  required: string[]
  optional: string[]
  propertyTypes: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
  propertyFormats?: Record<string, RegExp>
}

/**
 * Default schemas for each node type
 */
const DEFAULT_SCHEMAS: Record<string, NodeSchema> = {
  species: {
    required: ['@id', '@type', 'scientificName'],
    optional: ['name', 'description', 'family', 'genus', 'slug', 'image', 'containsChemical', 'sameAs', 'gbifID'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      scientificName: 'string',
      name: 'object',
      description: 'object',
      family: 'string',
      genus: 'string',
      slug: 'string',
      gbifID: 'string',
    },
  },
  part: {
    required: ['@id', '@type'],
    optional: ['name', 'description', 'slug', 'partOf'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      name: 'object',
      slug: 'string',
      partOf: 'object',
    },
  },
  chemical: {
    required: ['@id', '@type'],
    optional: ['name', 'description', 'casNumber', 'formula', 'slug', 'inchi', 'inchiKey', 'smiles'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      name: 'object',
      casNumber: 'string',
      formula: 'string',
      slug: 'string',
      inchi: 'string',
      inchiKey: 'string',
      smiles: 'string',
    },
  },
  preparation: {
    required: ['@id', '@type', 'derivedFrom'],
    optional: ['name', 'description', 'slug', 'preparationMethod', 'hasIngredient'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      derivedFrom: 'object',
      name: 'object',
      slug: 'string',
      preparationMethod: 'string',
      hasIngredient: 'array',
    },
  },
  formula: {
    required: ['@id', '@type'],
    optional: ['name', 'description', 'slug', 'hasIngredient', 'pinyin'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      name: 'object',
      slug: 'string',
      hasIngredient: 'array',
      pinyin: 'string',
    },
  },
  profile: {
    required: ['@id', '@type', 'derivedFrom'],
    optional: ['name', 'pinyin', 'sanskritName', 'description', 'slug'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      derivedFrom: 'object',
      name: 'object',
      pinyin: 'string',
      sanskritName: 'string',
      slug: 'string',
    },
  },
  'tcm-profile': {
    required: ['@id', '@type', 'derivedFrom'],
    optional: ['name', 'pinyin', 'chineseName', 'description', 'slug', 'hasCategory', 'hasNature', 'hasFlavor', 'entersMeridian', 'tcmFunctions', 'tcmTraditionalUsage', 'tcmModernResearch', 'dosage', 'contraindications', 'cautions'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      derivedFrom: 'object',
      name: 'object',
      pinyin: 'string',
      chineseName: 'object',
      slug: 'string',
      hasCategory: 'object',
      hasNature: 'object',
      hasFlavor: 'array',
      entersMeridian: 'array',
      tcmFunctions: 'object',
      tcmTraditionalUsage: 'object',
      tcmModernResearch: 'object',
      dosage: 'object',
      contraindications: 'object',
      cautions: 'object',
    },
  },
  'ayurveda-profile': {
    required: ['@id', '@type', 'derivedFrom'],
    optional: ['name', 'sanskritName', 'description', 'slug', 'affectsDosha', 'hasRasa', 'hasGuna', 'hasVirya', 'hasVipaka', 'ayurvedaTraditionalUsage', 'ayurvedaModernResearch'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      derivedFrom: 'object',
      name: 'object',
      sanskritName: 'object',
      slug: 'string',
      affectsDosha: 'array',
      hasRasa: 'array',
      hasGuna: 'array',
      hasVirya: 'object',
      hasVipaka: 'object',
      ayurvedaTraditionalUsage: 'object',
      ayurvedaModernResearch: 'object',
    },
  },
  'western-profile': {
    required: ['@id', '@type', 'derivedFrom'],
    optional: ['name', 'description', 'slug', 'hasAction', 'hasOrganAffinity', 'westernTraditionalUsage', 'westernModernResearch'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      derivedFrom: 'object',
      name: 'object',
      slug: 'string',
      hasAction: 'array',
      hasOrganAffinity: 'array',
      westernTraditionalUsage: 'object',
      westernModernResearch: 'object',
    },
  },
  'modern-profile': {
    required: ['@id', '@type'],
    optional: ['name', 'description', 'slug', 'activeIngredient', 'mechanismOfAction', 'clinicalEvidence', 'modernTraditionalUsage', 'modernModernResearch'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      name: 'object',
      slug: 'string',
      activeIngredient: 'array',
      mechanismOfAction: 'object',
      clinicalEvidence: 'object',
      modernTraditionalUsage: 'object',
      modernModernResearch: 'object',
    },
  },
  vocabulary: {
    required: ['@id', '@type', 'value'],
    optional: ['prefLabel', 'altLabel', 'description', 'broader', 'narrower'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      value: 'string',
      prefLabel: 'object',
      altLabel: 'object',
      broader: 'object',
      narrower: 'array',
    },
  },
  source: {
    required: ['@id', '@type'],
    optional: ['name', 'description', 'slug', 'url', 'license', 'attribution'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      name: 'object',
      slug: 'string',
      url: 'string',
      license: 'string',
      attribution: 'string',
    },
  },
  image: {
    required: ['@id', '@type', 'depicts'],
    optional: ['name', 'description', 'slug', 'url', 'license', 'attribution', 'copyright'],
    propertyTypes: {
      '@id': 'string',
      '@type': 'array',
      depicts: 'object',
      name: 'object',
      slug: 'string',
      url: 'string',
      license: 'string',
      attribution: 'string',
      copyright: 'string',
    },
  },
}

/**
 * Schema-based validator for graph nodes
 */
export class SchemaValidator {
  private registry: GraphRegistry
  private schemas: Record<string, NodeSchema>

  constructor(registry: GraphRegistry, schemas?: Record<string, NodeSchema>) {
    this.registry = registry
    this.schemas = schemas || DEFAULT_SCHEMAS
  }

  /**
   * Validate all nodes in the graph
   */
  validate(options?: ValidationOptions): ValidationResult {
    const result = createEmptyValidationResult()
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const nodeResult = this.validateNode(node, options)
      addNodeResult(result, nodeResult)
    }

    return finalizeResult(result)
  }

  /**
   * Validate a single node
   */
  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult {
    const result = createNodeResult(node['@id'])
    const nodeType = this.determineNodeType(node)
    const schema = this.schemas[nodeType]

    if (!schema) {
      const issue = createWarning(
        'unknown-type',
        `No schema found for node type: ${nodeType}`,
        node['@id']
      )
      addIssueToNode(result, issue)
      return result
    }

    const nodeObj = node as unknown as Record<string, unknown>

    // Check required properties
    for (const prop of schema.required) {
      if (!(prop in nodeObj) || nodeObj[prop] === undefined || nodeObj[prop] === null) {
        const issue = createError(
          'missing-required',
          `Missing required property: ${prop}`,
          node['@id'],
          { property: prop, expected: 'present' }
        )
        addIssueToNode(result, issue)

        if (options?.failFast && !result.valid) {
          break
        }
      }
    }

    // Check property types
    for (const [prop, expectedType] of Object.entries(schema.propertyTypes)) {
      const value = nodeObj[prop]
      if (value === undefined || value === null) continue

      const actualType = this.getValueType(value)
      if (actualType !== expectedType && !(actualType === 'array' && expectedType === 'object')) {
        const issue = createWarning(
          'type-mismatch',
          `Property ${prop} has type ${actualType}, expected ${expectedType}`,
          node['@id'],
          { property: prop, expected: expectedType, actual: actualType }
        )
        addIssueToNode(result, issue)
      }
    }

    // Check formats if defined
    if (schema.propertyFormats) {
      for (const [prop, pattern] of Object.entries(schema.propertyFormats)) {
        const value = nodeObj[prop]
        if (typeof value === 'string' && !pattern.test(value)) {
          const issue = createWarning(
            'format-mismatch',
            `Property ${prop} does not match expected format`,
            node['@id'],
            { property: prop, expected: pattern.toString() }
          )
          addIssueToNode(result, issue)
        }
      }
    }

    return result
  }

  /**
   * Determine the schema type for a node
   */
  private determineNodeType(node: GraphNode): string {
    const parsed = parseIRI(node['@id'])

    // Check by nodeType
    if (parsed.nodeType) {
      switch (parsed.nodeType) {
        case NodeType.SPECIES:
          return 'species'
        case NodeType.PART:
          return 'part'
        case NodeType.CHEMICAL:
          return 'chemical'
        case NodeType.PREPARATION:
          return 'preparation'
        case NodeType.FORMULA:
          return 'formula'
        case NodeType.TCM_PROFILE:
          return 'tcm-profile'
        case NodeType.AYURVEDA_PROFILE:
          return 'ayurveda-profile'
        case NodeType.WESTERN_PROFILE:
          return 'western-profile'
        case NodeType.UNANI_PROFILE:
        case NodeType.MONGOLIAN_PROFILE:
          return 'profile'
        case NodeType.MODERN_PROFILE:
          return 'modern-profile'
        case NodeType.TCM_FLAVOR:
        case NodeType.TCM_NATURE:
        case NodeType.TCM_MERIDIAN:
        case NodeType.TCM_CATEGORY:
        case NodeType.AYURVEDA_DOSHA:
        case NodeType.AYURVEDA_RASA:
        case NodeType.AYURVEDA_GUNA:
        case NodeType.AYURVEDA_VIRYA:
        case NodeType.AYURVEDA_VIPAKA:
          return 'vocabulary'
        case NodeType.SOURCE:
          return 'source'
        case NodeType.IMAGE:
          return 'image'
        default:
          return 'unknown'
      }
    }

    return 'unknown'
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: unknown): string {
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object' && value !== null) return 'object'
    return typeof value
  }
}

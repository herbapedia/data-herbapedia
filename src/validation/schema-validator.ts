/**
 * Schema Validator for Herbapedia Dataset
 *
 * Validates entities against their JSON schemas using Ajv.
 * Provides detailed error reporting for validation failures.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'

// ============================================================================
// Types
// ============================================================================

export interface SchemaValidationResult {
  valid: boolean
  file: string
  entityType?: string
  errors: ValidationError[]
}

export interface ValidationError {
  path: string
  message: string
  keyword?: string
  schemaPath?: string
}

export interface SchemaValidationSummary {
  total: number
  valid: number
  invalid: number
  errors: SchemaValidationResult[]
}

// ============================================================================
// Schema Registry
// ============================================================================

const SCHEMA_DIR = 'schema/json-schema'

/**
 * Map entity types to their schema files.
 */
const ENTITY_SCHEMA_MAP: Record<string, string> = {
  // Botanical entities
  'PlantSpecies': 'botanical/plant-species.schema.json',
  'PlantPart': 'botanical/plant-part.schema.json',
  'ChemicalCompound': 'botanical/chemical-compound.schema.json',
  'ChemicalProfile': 'botanical/chemical-profile.schema.json',
  'DNABarcode': 'botanical/dna-barcode.schema.json',

  // Herbal entities
  'HerbalPreparation': 'herbal/herbal-preparation.schema.json',

  // Profiles
  'TCMProfile': 'profiles/tcm-profile.schema.json',
  'WesternHerbalProfile': 'profiles/western-profile.schema.json',
  'AyurvedaProfile': 'profiles/ayurveda-profile.schema.json',
  'PersianProfile': 'profiles/persian-profile.schema.json',
  'MongolianProfile': 'profiles/mongolian-profile.schema.json',

  // Reference entities
  'TCMCategory': 'reference/tcm-category.schema.json',
  'TCMNature': 'reference/tcm-nature.schema.json',
  'TCMFlavor': 'reference/tcm-flavor.schema.json',
  'TCMMeridian': 'reference/tcm-meridian.schema.json',
  'WesternAction': 'reference/western-action.schema.json',
  'WesternOrgan': 'reference/western-organ.schema.json',
  'WesternSystem': 'reference/western-system.schema.json',
  'AyurvedaRasa': 'reference/ayurveda-rasa.schema.json',
  'AyurvedaGuna': 'reference/ayurveda-guna.schema.json',
  'AyurvedaVirya': 'reference/ayurveda-virya.schema.json',
  'AyurvedaVipaka': 'reference/ayurveda-vipaka.schema.json',
  'AyurvedaDosha': 'reference/ayurveda-dosha.schema.json',
}

// ============================================================================
// Schema Validator Class
// ============================================================================

export class SchemaValidator {
  private ajv: Ajv
  private schemaCache: Map<string, ValidateFunction> = new Map()
  private dataPath: string

  constructor(dataPath: string) {
    this.dataPath = dataPath
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      loadSchema: this.loadSchema.bind(this),
    })
    addFormats(this.ajv)
  }

  /**
   * Load a schema by URI (called by Ajv for $ref resolution).
   */
  private async loadSchema(uri: string): Promise<object> {
    // Handle internal schema references
    if (uri.startsWith('herbapedia:')) {
      const schemaPath = uri.replace('herbapedia:', '')
      const fullPath = join(this.dataPath, SCHEMA_DIR, schemaPath)
      if (existsSync(fullPath)) {
        return JSON.parse(readFileSync(fullPath, 'utf-8'))
      }
    }
    throw new Error(`Schema not found: ${uri}`)
  }

  /**
   * Initialize the validator by loading all schemas.
   */
  async initialize(): Promise<void> {
    const schemaDir = join(this.dataPath, SCHEMA_DIR)

    // Load core schemas first
    const coreSchemas = [
      'core/entity.schema.json',
      'core/language-map.schema.json',
      'core/iri-reference.schema.json',
      'core/external-reference.schema.json',
      'core/provenance.schema.json',
    ]

    for (const schemaFile of coreSchemas) {
      const schemaPath = join(schemaDir, schemaFile)
      if (existsSync(schemaPath)) {
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
        this.ajv.addSchema(schema)
      }
    }

    // Load all other schemas
    const loadSchemaDir = (dir: string): void => {
      const fullPath = join(schemaDir, dir)
      if (!existsSync(fullPath)) return

      const files = readdirSync(fullPath)
      for (const file of files) {
        if (file.endsWith('.schema.json')) {
          const schemaPath = join(fullPath, file)
          try {
            const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
            this.ajv.addSchema(schema)
          } catch (error) {
            console.error(`Error loading schema ${schemaPath}:`, error)
          }
        }
      }
    }

    // Load schemas from each directory
    loadSchemaDir('botanical')
    loadSchemaDir('herbal')
    loadSchemaDir('profiles')
    loadSchemaDir('reference')
  }

  /**
   * Detect entity type from JSON-LD data.
   */
  private detectEntityType(data: Record<string, unknown>): string | null {
    const types = data['@type'] as string[] | string | undefined
    if (!types) return null

    const typeArray = Array.isArray(types) ? types : [types]

    // Check for specific profile types
    for (const type of typeArray) {
      if (type.includes('tcm:Herb') || type.includes('tcm:HerbProfile')) return 'TCMProfile'
      if (type.includes('western:Herb') || type.includes('western:HerbProfile')) return 'WesternHerbalProfile'
      if (type.includes('ayurveda:Dravya')) return 'AyurvedaProfile'
      if (type.includes('persian:Drug')) return 'PersianProfile'
      if (type.includes('mongolian:Herb')) return 'MongolianProfile'
      if (type.includes('botany:PlantSpecies')) return 'PlantSpecies'
      if (type.includes('botany:PlantPart')) return 'PlantPart'
      if (type.includes('botany:ChemicalCompound')) return 'ChemicalCompound'
      if (type.includes('botany:ChemicalProfile')) return 'ChemicalProfile'
      if (type.includes('botany:DNABarcode')) return 'DNABarcode'
      if (type.includes('herbal:HerbalPreparation')) return 'HerbalPreparation'

      // Reference types
      if (type.includes('tcm:Category')) return 'TCMCategory'
      if (type.includes('tcm:Nature')) return 'TCMNature'
      if (type.includes('tcm:Flavor')) return 'TCMFlavor'
      if (type.includes('tcm:Meridian')) return 'TCMMeridian'
      if (type.includes('western:Action')) return 'WesternAction'
      if (type.includes('western:Organ')) return 'WesternOrgan'
      if (type.includes('western:System')) return 'WesternSystem'
      if (type.includes('ayurveda:Rasa')) return 'AyurvedaRasa'
      if (type.includes('ayurveda:Guna')) return 'AyurvedaGuna'
      if (type.includes('ayurveda:Virya')) return 'AyurvedaVirya'
      if (type.includes('ayurveda:Vipaka')) return 'AyurvedaVipaka'
      if (type.includes('ayurveda:Dosha')) return 'AyurvedaDosha'
    }

    return null
  }

  /**
   * Validate an entity against its schema.
   */
  validate(data: Record<string, unknown>, entityType?: string): SchemaValidationResult {
    const detectedType = entityType || this.detectEntityType(data)

    if (!detectedType) {
      return {
        valid: false,
        file: (data['@id'] as string) || 'unknown',
        errors: [{
          path: '@type',
          message: 'Could not detect entity type from @type property',
        }],
      }
    }

    const schemaFile = ENTITY_SCHEMA_MAP[detectedType]
    if (!schemaFile) {
      return {
        valid: false,
        file: (data['@id'] as string) || 'unknown',
        entityType: detectedType,
        errors: [{
          path: '@type',
          message: `No schema mapping found for entity type: ${detectedType}`,
        }],
      }
    }

    const schemaKey = `/${schemaFile}`
    let validate = this.schemaCache.get(schemaKey)

    if (!validate) {
      try {
        validate = this.ajv.getSchema(schemaKey)
        if (validate) {
          this.schemaCache.set(schemaKey, validate)
        }
      } catch (error) {
        return {
          valid: false,
          file: (data['@id'] as string) || 'unknown',
          entityType: detectedType,
          errors: [{
            path: 'schema',
            message: `Failed to load schema: ${schemaFile}`,
          }],
        }
      }
    }

    if (!validate) {
      return {
        valid: false,
        file: (data['@id'] as string) || 'unknown',
        entityType: detectedType,
        errors: [{
          path: 'schema',
          message: `Schema not found: ${schemaFile}`,
        }],
      }
    }

    const valid = validate(data)

    if (valid) {
      return {
        valid: true,
        file: (data['@id'] as string) || 'unknown',
        entityType: detectedType,
        errors: [],
      }
    }

    return {
      valid: false,
      file: (data['@id'] as string) || 'unknown',
      entityType: detectedType,
      errors: this.formatErrors(validate.errors || []),
    }
  }

  /**
   * Format Ajv errors into a simpler structure.
   */
  private formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map(err => ({
      path: err.instancePath || '/',
      message: err.message || 'Validation error',
      keyword: err.keyword,
      schemaPath: err.schemaPath,
    }))
  }

  /**
   * Validate all entities in the dataset.
   */
  async validateAll(verbose: boolean = false): Promise<SchemaValidationSummary> {
    const results: SchemaValidationResult[] = []

    // Directories to validate
    const entityDirs = [
      'entities/botanical/species',
      'entities/botanical/parts',
      'entities/botanical/chemicals',
      'entities/botanical/profiles',
      'entities/botanical/barcodes',
      'entities/preparations',
      'profiles/tcm',
      'profiles/western',
      'profiles/ayurveda',
      'profiles/persian',
      'profiles/mongolian',
    ]

    for (const dir of entityDirs) {
      const fullDir = join(this.dataPath, dir)
      if (!existsSync(fullDir)) {
        if (verbose) console.log(`Skipping missing directory: ${dir}`)
        continue
      }

      const entities = readdirSync(fullDir)
      for (const entity of entities) {
        const entityPath = join(fullDir, entity)
        if (!statSync(entityPath).isDirectory()) continue

        const files = ['entity.jsonld', 'profile.jsonld']
        for (const file of files) {
          const filePath = join(entityPath, file)
          if (!existsSync(filePath)) continue

          try {
            const content = readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)
            const result = this.validate(data)
            result.file = `${dir}/${entity}/${file}`
            results.push(result)

            if (verbose && result.valid) {
              console.log(`✓ ${result.file}`)
            } else if (!result.valid) {
              console.error(`✗ ${result.file}`)
              for (const err of result.errors) {
                console.error(`  - ${err.path}: ${err.message}`)
              }
            }
          } catch (error) {
            results.push({
              valid: false,
              file: `${dir}/${entity}/${file}`,
              errors: [{
                path: 'file',
                message: `Failed to parse file: ${error}`,
              }],
            })
          }
        }
      }
    }

    const valid = results.filter(r => r.valid)
    const invalid = results.filter(r => !r.valid)

    return {
      total: results.length,
      valid: valid.length,
      invalid: invalid.length,
      errors: invalid,
    }
  }
}

// Import statSync
import { statSync } from 'fs'

export default SchemaValidator

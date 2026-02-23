/**
 * Content Quality Validator for Herbapedia Dataset
 *
 * Validates content quality including:
 * - Language map completeness (en required)
 * - Required field coverage
 * - Duplicate detection
 * - Data consistency
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Types
// ============================================================================

export interface QualityCheck {
  iri: string
  file: string
  type: string
  issues: QualityIssue[]
  score: number // 0-100
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info'
  category: 'language' | 'required' | 'duplicate' | 'consistency'
  path: string
  message: string
}

export interface QualityValidationResult {
  valid: boolean
  totalEntities: number
  averageScore: number
  bySeverity: {
    errors: number
    warnings: number
    info: number
  }
  byCategory: {
    language: number
    required: number
    duplicate: number
    consistency: number
  }
  results: QualityCheck[]
  duplicates: DuplicateGroup[]
}

export interface DuplicateGroup {
  field: string
  value: string
  entities: Array<{ iri: string; file: string }>
}

// ============================================================================
// Quality Validator Class
// ============================================================================

export class QualityValidator {
  private dataPath: string
  private entityData: Map<string, { file: string; type: string; data: Record<string, unknown> }> = new Map()

  // Required fields by entity type
  private requiredFields: Record<string, string[]> = {
    'PlantSpecies': ['scientificName', 'name'],
    'PlantPart': ['partOf', 'name'],
    'HerbalPreparation': ['derivedFrom', 'name'],
    'TCMProfile': ['pinyin', 'hasCategory', 'hasNature', 'hasFlavor'],
    'WesternHerbalProfile': ['name', 'hasAction'],
    'AyurvedaProfile': ['sanskritName', 'hasRasa', 'hasVirya', 'hasVipaka'],
    'PersianProfile': ['persianName', 'hasTemperament'],
    'MongolianProfile': ['mongolianName', 'affectsRoots'],
  }

  // Fields that should have language maps
  private languageMapFields = [
    'name', 'description', 'tcmFunctions', 'tcmTraditionalUsage', 'tcmModernResearch',
    'westernTraditionalUsage', 'westernModernResearch', 'ayurvedaTraditionalUsage',
    'ayurvedaModernResearch', 'contraindications', 'dosage', 'indications',
  ]

  constructor(dataPath: string) {
    this.dataPath = dataPath
  }

  /**
   * Load all entity data into memory.
   */
  async loadData(): Promise<void> {
    console.log('Loading entity data...')

    const entityDirs = [
      { path: 'entities/botanical/species', type: 'PlantSpecies' },
      { path: 'entities/botanical/parts', type: 'PlantPart' },
      { path: 'entities/preparations', type: 'HerbalPreparation' },
      { path: 'profiles/tcm', type: 'TCMProfile' },
      { path: 'profiles/western', type: 'WesternHerbalProfile' },
      { path: 'profiles/ayurveda', type: 'AyurvedaProfile' },
      { path: 'profiles/persian', type: 'PersianProfile' },
      { path: 'profiles/mongolian', type: 'MongolianProfile' },
    ]

    for (const { path: dir, type } of entityDirs) {
      const fullDir = join(this.dataPath, dir)
      if (!existsSync(fullDir)) continue

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

            if (data['@id']) {
              this.entityData.set(data['@id'], {
                file: `${dir}/${entity}/${file}`,
                type,
                data,
              })
            }
          } catch (error) {
            console.error(`Error loading ${filePath}:`, error)
          }
        }
      }
    }

    console.log(`Loaded ${this.entityData.size} entities`)
  }

  /**
   * Check if a field is a language map and validate it.
   */
  private checkLanguageMap(
    data: Record<string, unknown>,
    field: string,
    issues: QualityIssue[]
  ): void {
    const value = data[field]
    if (!value) return

    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as Record<string, unknown>)

      // Check if 'en' is present
      if (!keys.includes('en')) {
        issues.push({
          severity: 'warning',
          category: 'language',
          path: field,
          message: `Language map missing 'en' key. Found: ${keys.join(', ')}`,
        })
      }

      // Check for empty values
      for (const lang of keys) {
        const langValue = (value as Record<string, unknown>)[lang]
        if (!langValue || (typeof langValue === 'string' && langValue.trim() === '')) {
          issues.push({
            severity: 'info',
            category: 'language',
            path: `${field}.${lang}`,
            message: `Empty value for language '${lang}'`,
          })
        }
      }
    }
  }

  /**
   * Check required fields for an entity type.
   */
  private checkRequiredFields(
    data: Record<string, unknown>,
    type: string,
    issues: QualityIssue[]
  ): void {
    const required = this.requiredFields[type] || []

    for (const field of required) {
      if (!data[field]) {
        issues.push({
          severity: 'error',
          category: 'required',
          path: field,
          message: `Missing required field: ${field}`,
        })
      } else if (Array.isArray(data[field]) && data[field].length === 0) {
        issues.push({
          severity: 'warning',
          category: 'required',
          path: field,
          message: `Required field is empty array: ${field}`,
        })
      }
    }
  }

  /**
   * Check for consistency issues.
   */
  private checkConsistency(
    data: Record<string, unknown>,
    type: string,
    issues: QualityIssue[]
  ): void {
    // Check that pinyin matches the @id slug pattern for TCM
    if (type === 'TCMProfile') {
      const id = data['@id'] as string
      const pinyin = data.pinyin as string

      if (id && pinyin) {
        const slugFromId = id.split('/').pop()
        const pinyinSlug = pinyin.toLowerCase().replace(/\s+/g, '-').replace(/ā/g, 'a').replace(/ē/g, 'e').replace(/ī/g, 'i').replace(/ō/g, 'o').replace(/ū/g, 'u')

        // This is just informational, not an error
        if (slugFromId !== pinyinSlug) {
          issues.push({
            severity: 'info',
            category: 'consistency',
            path: 'pinyin',
            message: `Pinyin '${pinyin}' doesn't match slug pattern '${slugFromId}'`,
          })
        }
      }
    }

    // Check that derivedFrom points to existing entity
    if (type === 'HerbalPreparation') {
      const derivedFrom = data.derivedFrom as Array<{ '@id': string }> | undefined
      if (derivedFrom && derivedFrom.length > 0) {
        const targetId = derivedFrom[0]['@id']
        if (targetId && !this.entityData.has(targetId)) {
          issues.push({
            severity: 'warning',
            category: 'consistency',
            path: 'derivedFrom',
            message: `derivedFrom references non-existent entity: ${targetId}`,
          })
        }
      }
    }
  }

  /**
   * Validate a single entity.
   */
  validateEntity(iri: string): QualityCheck {
    const entity = this.entityData.get(iri)
    if (!entity) {
      return {
        iri,
        file: 'unknown',
        type: 'unknown',
        issues: [{
          severity: 'error',
          category: 'required',
          path: '',
          message: 'Entity not found in data',
        }],
        score: 0,
      }
    }

    const issues: QualityIssue[] = []
    const { file, type, data } = entity

    // Check required fields
    this.checkRequiredFields(data, type, issues)

    // Check language maps
    for (const field of this.languageMapFields) {
      this.checkLanguageMap(data, field, issues)
    }

    // Check consistency
    this.checkConsistency(data, type, issues)

    // Calculate score
    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5))

    return {
      iri,
      file,
      type,
      issues,
      score,
    }
  }

  /**
   * Find duplicates across entities.
   */
  findDuplicates(): DuplicateGroup[] {
    const duplicates: DuplicateGroup[] = []
    const valueMap: Map<string, Map<string, Array<{ iri: string; file: string }>>> = new Map()

    // Fields to check for duplicates
    const duplicateFields = ['scientificName', 'pinyin', 'sanskritName']

    for (const [iri, { file, type, data }] of this.entityData.entries()) {
      for (const field of duplicateFields) {
        const value = data[field]
        if (!value || typeof value !== 'string') continue

        const normalized = (value as string).toLowerCase().trim()

        if (!valueMap.has(field)) {
          valueMap.set(field, new Map())
        }

        const fieldMap = valueMap.get(field)!
        if (!fieldMap.has(normalized)) {
          fieldMap.set(normalized, [])
        }
        fieldMap.get(normalized)!.push({ iri, file })
      }
    }

    // Find actual duplicates
    for (const [field, fieldMap] of valueMap.entries()) {
      for (const [value, entities] of fieldMap.entries()) {
        if (entities.length > 1) {
          duplicates.push({
            field,
            value,
            entities,
          })
        }
      }
    }

    return duplicates
  }

  /**
   * Validate all entities.
   */
  async validate(verbose: boolean = false): Promise<QualityValidationResult> {
    if (this.entityData.size === 0) {
      await this.loadData()
    }

    const results: QualityCheck[] = []
    const bySeverity = { errors: 0, warnings: 0, info: 0 }
    const byCategory = { language: 0, required: 0, duplicate: 0, consistency: 0 }

    for (const iri of this.entityData.keys()) {
      const result = this.validateEntity(iri)
      results.push(result)

      for (const issue of result.issues) {
        bySeverity[issue.severity === 'error' ? 'errors' : issue.severity === 'warning' ? 'warnings' : 'info']++
        byCategory[issue.category]++
      }

      if (verbose) {
        if (result.score < 80) {
          console.log(`${result.score}% ${result.iri}`)
          for (const issue of result.issues) {
            console.log(`  [${issue.severity}] ${issue.path}: ${issue.message}`)
          }
        }
      }
    }

    // Find duplicates
    const duplicates = this.findDuplicates()
    byCategory.duplicate = duplicates.length

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

    return {
      valid: bySeverity.errors === 0 && duplicates.length === 0,
      totalEntities: results.length,
      averageScore,
      bySeverity,
      byCategory,
      results,
      duplicates,
    }
  }
}

export default QualityValidator

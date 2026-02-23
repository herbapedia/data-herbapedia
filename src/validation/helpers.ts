/**
 * Entity Validation Helpers.
 *
 * This module provides validation utilities for:
 * - Required field checking
 * - IRI format validation
 * - Reference integrity checking
 * - Schema compliance
 *
 * @example
 * ```typescript
 * import { EntityValidator } from '@herbapedia/data'
 *
 * const errors = EntityValidator.validate(plantEntity)
 * if (errors.length > 0) {
 *   console.log('Validation failed:', errors)
 * }
 * ```
 */

import type { Entity, IRIReference, LanguageMap } from '../types/core'
import type { PlantSpecies } from '../types/botanical'
import type { HerbalPreparation } from '../types/preparation'
import { HERBAPEDIA_BASE_IRI, isFullIRI } from '../types/core'

/**
 * Validation error with details.
 */
export interface ValidationError {
  /** Error code */
  code: string
  /** Human-readable message */
  message: string
  /** Field that failed validation */
  field?: string
  /** Value that caused the error */
  value?: unknown
}

/**
 * Validation result with all errors.
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Validation options.
 */
export interface ValidationOptions {
  /** Check for required fields */
  checkRequired?: boolean
  /** Validate IRI formats */
  validateIRIs?: boolean
  /** Check for language map completeness */
  checkLanguages?: string[]
  /** Allow warnings to pass validation */
  allowWarnings?: boolean
}

/**
 * Entity validator for Herbapedia entities.
 */
export const EntityValidator = {
  /**
   * Validate any entity.
   */
  validate(entity: unknown, options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Basic entity structure
    if (!entity || typeof entity !== 'object') {
      return {
        valid: false,
        errors: [{ code: 'INVALID_TYPE', message: 'Entity must be an object' }],
        warnings: [],
      }
    }

    const e = entity as Record<string, unknown>

    // Check @id
    if (!e['@id']) {
      errors.push({ code: 'MISSING_ID', message: 'Entity must have @id', field: '@id' })
    } else if (options.validateIRIs !== false && !this.isValidIRI(e['@id'] as string)) {
      errors.push({ code: 'INVALID_IRI', message: 'Invalid @id IRI format', field: '@id', value: e['@id'] })
    }

    // Check @type
    if (!e['@type']) {
      warnings.push({ code: 'MISSING_TYPE', message: 'Entity should have @type', field: '@type' })
    }

    // Check @context
    if (!e['@context']) {
      warnings.push({ code: 'MISSING_CONTEXT', message: 'Entity should have @context', field: '@context' })
    }

    // Check for name
    if (options.checkRequired !== false && !e['name']) {
      warnings.push({ code: 'MISSING_NAME', message: 'Entity should have a name', field: 'name' })
    }

    // Check provenance
    if (!e['provenance']) {
      warnings.push({ code: 'MISSING_PROVENANCE', message: 'Entity should have provenance', field: 'provenance' })
    }

    // Type-specific validation
    const types = Array.isArray(e['@type']) ? e['@type'] : [e['@type']]

    if (types.some(t => String(t).includes('PlantSpecies'))) {
      const plantErrors = this.validatePlantSpecies(entity as PlantSpecies, options)
      errors.push(...plantErrors.errors)
      warnings.push(...plantErrors.warnings)
    }

    if (types.some(t => String(t).includes('HerbalPreparation'))) {
      const prepErrors = this.validatePreparation(entity as HerbalPreparation, options)
      errors.push(...prepErrors.errors)
      warnings.push(...prepErrors.warnings)
    }

    return {
      valid: errors.length === 0 && (options.allowWarnings !== false || warnings.length === 0),
      errors,
      warnings,
    }
  },

  /**
   * Validate a PlantSpecies entity.
   */
  validatePlantSpecies(plant: PlantSpecies, options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Check scientific name
    if (!plant.scientificName) {
      errors.push({ code: 'MISSING_SCIENTIFIC_NAME', message: 'PlantSpecies must have scientificName', field: 'scientificName' })
    } else {
      // Validate scientific name format (Genus species)
      if (!this.isValidScientificName(plant.scientificName)) {
        warnings.push({
          code: 'INVALID_SCIENTIFIC_NAME_FORMAT',
          message: 'Scientific name should be in "Genus species" format',
          field: 'scientificName',
          value: plant.scientificName,
        })
      }
    }

    // Check family
    if (!plant.family) {
      warnings.push({ code: 'MISSING_FAMILY', message: 'PlantSpecies should have family', field: 'family' })
    }

    // Check external IDs
    if (!plant.wikidataID && !plant.gbifID && !plant.ncbiTaxonID) {
      warnings.push({
        code: 'MISSING_EXTERNAL_IDS',
        message: 'PlantSpecies should have at least one external ID (wikidataID, gbifID, or ncbiTaxonID)',
      })
    }

    // Check language map completeness
    if (options.checkLanguages && plant.name) {
      const missingLangs = options.checkLanguages.filter(lang => !plant.name[lang])
      if (missingLangs.length > 0) {
        warnings.push({
          code: 'INCOMPLETE_LANGUAGE_MAP',
          message: `Name missing translations for: ${missingLangs.join(', ')}`,
          field: 'name',
        })
      }
    }

    // Validate containsChemical references
    if (plant.containsChemical) {
      for (const ref of plant.containsChemical) {
        if (!this.isValidIRIReference(ref)) {
          errors.push({
            code: 'INVALID_REFERENCE',
            message: 'containsChemical must be an IRIReference object',
            field: 'containsChemical',
            value: ref,
          })
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  },

  /**
   * Validate an HerbalPreparation entity.
   */
  validatePreparation(prep: HerbalPreparation, options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Check derivedFrom
    if (!prep.derivedFrom || prep.derivedFrom.length === 0) {
      errors.push({
        code: 'MISSING_DERIVED_FROM',
        message: 'HerbalPreparation must have derivedFrom',
        field: 'derivedFrom',
      })
    } else {
      for (const ref of prep.derivedFrom) {
        if (!this.isValidIRIReference(ref)) {
          errors.push({
            code: 'INVALID_REFERENCE',
            message: 'derivedFrom must be IRIReference objects',
            field: 'derivedFrom',
            value: ref,
          })
        }
      }
    }

    // Check for at least one profile
    if (!prep.hasTCMProfile && !prep.hasWesternProfile && !prep.hasAyurvedaProfile) {
      warnings.push({
        code: 'NO_PROFILES',
        message: 'HerbalPreparation should have at least one medicine system profile',
      })
    }

    // Check form
    if (!prep.form) {
      warnings.push({ code: 'MISSING_FORM', message: 'HerbalPreparation should have form', field: 'form' })
    }

    return { valid: errors.length === 0, errors, warnings }
  },

  /**
   * Validate an IRI format.
   */
  isValidIRI(iri: string): boolean {
    // Full IRI
    if (iri.startsWith('https://') || iri.startsWith('http://')) {
      try {
        new URL(iri)
        return true
      } catch {
        return false
      }
    }

    // Relative IRI (namespace/slug format)
    const relativePattern = /^[a-z-]+\/[a-z-]+\/[a-z0-9-]+$/
    return relativePattern.test(iri)
  },

  /**
   * Validate a scientific name format.
   */
  isValidScientificName(name: string): boolean {
    // Genus species format
    const pattern = /^[A-Z][a-z]+\s+[a-z]+\s*$/
    return pattern.test(name.trim())
  },

  /**
   * Validate an IRIReference object.
   */
  isValidIRIReference(ref: unknown): boolean {
    if (!ref || typeof ref !== 'object') return false
    const r = ref as Record<string, unknown>
    return typeof r['@id'] === 'string' && r['@id'].length > 0
  },

  /**
   * Quick check if entity is valid (no errors).
   */
  isValid(entity: unknown): boolean {
    return this.validate(entity, { allowWarnings: true }).valid
  },

  /**
   * Get all errors for an entity.
   */
  getErrors(entity: unknown): ValidationError[] {
    return this.validate(entity).errors
  },

  /**
   * Get all warnings for an entity.
   */
  getWarnings(entity: unknown): ValidationError[] {
    return this.validate(entity).warnings
  },
}

export default EntityValidator

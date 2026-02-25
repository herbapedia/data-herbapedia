/**
 * Validator Plugin Interface
 *
 * Allows custom validation logic to be plugged into the Herbapedia validation system.
 *
 * @example
 * ```typescript
 * import { ValidatorPlugin, ValidationResult } from '@herbapedia/data'
 *
 * const customValidator: ValidatorPlugin = {
 *   name: 'custom-validator',
 *   version: '1.0.0',
 *   description: 'Validates custom business rules',
 *
 *   // Optional: Filter which entities to validate
 *   appliesTo: (entity, context) => {
 *     return entity['@type']?.includes('PlantSpecies')
 *   },
 *
 *   // Validation logic
 *   validate: (entity, context) => {
 *     const errors: ValidationError[] = []
 *
 *     // Custom validation
 *     if (!entity.myCustomField) {
 *       errors.push({
 *         code: 'MISSING_CUSTOM_FIELD',
 *         message: 'Custom field is required',
 *         field: 'myCustomField',
 *         severity: 'error'
 *       })
 *     }
 *
 *     return {
 *       valid: errors.length === 0,
 *       errors,
 *       warnings: []
 *     }
 *   }
 * }
 * ```
 */

import type { Entity } from '../types/core'
import type { PluginMetadata, PluginContext } from './types'

/**
 * Severity level for validation issues.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Validation error from a plugin.
 */
export interface PluginValidationError {
  /** Error code */
  code: string
  /** Human-readable message */
  message: string
  /** Field that failed validation */
  field?: string
  /** Value that caused the error */
  value?: unknown
  /** Severity level */
  severity: ValidationSeverity
  /** Plugin that generated this error */
  plugin?: string
}

/**
 * Result from a validator plugin.
 */
export interface PluginValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation errors */
  errors: PluginValidationError[]
  /** Validation warnings */
  warnings: PluginValidationError[]
  /** Additional info messages */
  info?: PluginValidationError[]
}

/**
 * Options for validator plugins.
 */
export interface ValidatorPluginOptions {
  /** Stop on first error */
  failFast?: boolean
  /** Minimum severity to report */
  minSeverity?: ValidationSeverity
  /** Additional configuration */
  config?: Record<string, unknown>
}

/**
 * Validator plugin interface.
 */
export interface ValidatorPlugin extends PluginMetadata {
  /**
   * Optional filter to determine if this validator applies to an entity.
   * Return true to validate, false to skip.
   */
  appliesTo?(entity: Entity, context: PluginContext): boolean

  /**
   * Validate an entity.
   * Called only if appliesTo returns true (or if appliesTo is not defined).
   */
  validate(entity: Entity, context: PluginContext, options?: ValidatorPluginOptions): PluginValidationResult

  /**
   * Optional initialization hook.
   * Called once when the plugin is registered.
   */
  initialize?(context: PluginContext): Promise<void> | void

  /**
   * Optional cleanup hook.
   * Called when the plugin is unregistered.
   */
  cleanup?(): Promise<void> | void
}

/**
 * Base validator plugin with common functionality.
 */
export abstract class BaseValidatorPlugin implements ValidatorPlugin {
  abstract name: string
  abstract version: string
  description?: string

  /**
   * Default: applies to all entities.
   */
  appliesTo(_entity: Entity, _context: PluginContext): boolean {
    return true
  }

  /**
   * Subclasses must implement validation logic.
   */
  abstract validate(entity: Entity, context: PluginContext, options?: ValidatorPluginOptions): PluginValidationResult

  /**
   * Helper to create an error.
   */
  protected error(code: string, message: string, field?: string, value?: unknown): PluginValidationError {
    return { code, message, field, value, severity: 'error', plugin: this.name }
  }

  /**
   * Helper to create a warning.
   */
  protected warning(code: string, message: string, field?: string, value?: unknown): PluginValidationError {
    return { code, message, field, value, severity: 'warning', plugin: this.name }
  }

  /**
   * Helper to create an info message.
   */
  protected info(code: string, message: string, field?: string, value?: unknown): PluginValidationError {
    return { code, message, field, value, severity: 'info', plugin: this.name }
  }
}

/**
 * Built-in validator that checks required fields.
 */
export const requiredFieldsValidator: ValidatorPlugin = {
  name: 'required-fields',
  version: '1.0.0',
  description: 'Validates that all required fields are present',

  appliesTo(entity: Entity) {
    // Only validate entities with @type
    return Boolean(entity['@type'])
  },

  validate(entity: Entity, _context: PluginContext) {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationError[] = []

    // Check @id
    if (!entity['@id']) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Entity must have @id',
        field: '@id',
        severity: 'error',
        plugin: 'required-fields',
      })
    }

    // Check name
    if (!entity.name) {
      warnings.push({
        code: 'MISSING_NAME',
        message: 'Entity should have a name',
        field: 'name',
        severity: 'warning',
        plugin: 'required-fields',
      })
    }

    return { valid: errors.length === 0, errors, warnings }
  },
}

/**
 * Built-in validator that checks IRI formats.
 */
export const iriFormatValidator: ValidatorPlugin = {
  name: 'iri-format',
  version: '1.0.0',
  description: 'Validates IRI format and structure',

  validate(entity: Entity, _context: PluginContext) {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationError[] = []

    // Check @id format
    if (entity['@id']) {
      const id = entity['@id']
      // Full IRI should be valid URL or relative IRI
      if (id.startsWith('http://') || id.startsWith('https://')) {
        try {
          new URL(id)
        } catch {
          errors.push({
            code: 'INVALID_IRI',
            message: 'Invalid full IRI format',
            field: '@id',
            value: id,
            severity: 'error',
            plugin: 'iri-format',
          })
        }
      }
    }

    // Check @context
    if (entity['@context']) {
      const context = entity['@context']
      if (typeof context === 'string' && !context.startsWith('http') && !context.startsWith('./')) {
        warnings.push({
          code: 'SUSPICIOUS_CONTEXT',
          message: '@context should be a URL or relative path',
          field: '@context',
          value: context,
          severity: 'warning',
          plugin: 'iri-format',
        })
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  },
}

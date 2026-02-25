/**
 * Plugin Registry
 *
 * Central registry for managing validator and exporter plugins.
 *
 * @example Registering and using plugins
 * ```typescript
 * import { pluginRegistry } from '@herbapedia/data'
 *
 * // Register a validator
 * pluginRegistry.registerValidator(myCustomValidator)
 *
 * // Register an exporter
 * pluginRegistry.registerExporter(yamlExporter)
 *
 * // Validate with all registered validators
 * const results = await pluginRegistry.validateAll(entity, context)
 *
 * // Export to a specific format
 * const exporter = pluginRegistry.getExporter('yaml')
 * const content = exporter.serialize(entity, context)
 * ```
 */

import type { Entity } from '../types/core'
import type { PluginContext } from './types'
import type {
  ValidatorPlugin,
  PluginValidationResult,
  PluginValidationError,
  ValidatorPluginOptions,
} from './validator-plugin'
import type {
  ExporterPlugin,
  ExportContext,
  SerializeResult,
} from './exporter-plugin'

/**
 * Plugin statistics.
 */
export interface PluginStats {
  validators: number
  exporters: number
  formats: string[]
}

/**
 * Plugin registry for managing and executing plugins.
 */
export class PluginRegistry {
  private validators: Map<string, ValidatorPlugin> = new Map()
  private exporters: Map<string, ExporterPlugin> = new Map()
  private initialized: boolean = false

  // ===========================================================================
  // Registration
  // ===========================================================================

  /**
   * Register a validator plugin.
   */
  registerValidator(plugin: ValidatorPlugin): void {
    if (this.validators.has(plugin.name)) {
      console.warn(`Validator plugin "${plugin.name}" already registered. Replacing.`)
    }
    this.validators.set(plugin.name, plugin)
  }

  /**
   * Register an exporter plugin.
   */
  registerExporter(plugin: ExporterPlugin): void {
    if (this.exporters.has(plugin.name)) {
      console.warn(`Exporter plugin "${plugin.name}" already registered. Replacing.`)
    }
    this.exporters.set(plugin.name, plugin)
  }

  /**
   * Register multiple plugins at once.
   */
  registerPlugins(plugins: { validators?: ValidatorPlugin[]; exporters?: ExporterPlugin[] }): void {
    plugins.validators?.forEach(p => this.registerValidator(p))
    plugins.exporters?.forEach(p => this.registerExporter(p))
  }

  /**
   * Unregister a validator plugin.
   */
  unregisterValidator(name: string): boolean {
    return this.validators.delete(name)
  }

  /**
   * Unregister an exporter plugin.
   */
  unregisterExporter(name: string): boolean {
    return this.exporters.delete(name)
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize all registered plugins.
   */
  async initialize(context: PluginContext): Promise<void> {
    const initPromises: Promise<void>[] = []

    for (const plugin of this.validators.values()) {
    if (plugin.initialize) {
      initPromises.push(Promise.resolve(plugin.initialize(context)))
    }
  }

    for (const plugin of this.exporters.values()) {
    if (plugin.initialize) {
      initPromises.push(Promise.resolve(plugin.initialize(context)))
    }
  }

    await Promise.all(initPromises)
    this.initialized = true
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate an entity with all applicable validators.
   */
  async validateAll(
    entity: Entity,
    context: PluginContext,
    options: ValidatorPluginOptions = {}
  ): Promise<PluginValidationResult> {
    const allErrors: PluginValidationError[] = []
    const allWarnings: PluginValidationError[] = []
    const allInfo: PluginValidationError[] = []

    for (const plugin of this.validators.values()) {
      // Check if plugin applies to this entity
      if (plugin.appliesTo && !plugin.appliesTo(entity, context)) {
        continue
      }

      try {
        const result = plugin.validate(entity, context, options)
        allErrors.push(...result.errors)
        allWarnings.push(...result.warnings)
        if (result.info) {
          allInfo.push(...result.info)
        }

        // Stop if failFast and there are errors
        if (options.failFast && result.errors.length > 0) {
          break
        }
      } catch (error) {
        allErrors.push({
          code: 'VALIDATOR_ERROR',
          message: `Validator "${plugin.name}" threw an error: ${error}`,
          severity: 'error',
          plugin: plugin.name,
        })
      }
    }

    // Filter by severity
    const minSeverity = options.minSeverity || 'info'
    const severityOrder = { error: 0, warning: 1, info: 2 }

    return {
      valid: allErrors.length === 0,
      errors: allErrors.filter(e => severityOrder[e.severity] <= severityOrder[minSeverity]),
      warnings: allWarnings.filter(w => severityOrder[w.severity] <= severityOrder[minSeverity]),
      info: allInfo,
    }
  }

  /**
   * Validate with a specific validator.
   */
  validateWith(
    pluginName: string,
    entity: Entity,
    context: PluginContext,
    options?: ValidatorPluginOptions
  ): PluginValidationResult | null {
    const plugin = this.validators.get(pluginName)
    if (!plugin) {
      return null
    }

    if (plugin.appliesTo && !plugin.appliesTo(entity, context)) {
      return { valid: true, errors: [], warnings: [] }
    }

    return plugin.validate(entity, context, options)
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  /**
   * Get an exporter by format.
   */
  getExporter(format: string): ExporterPlugin | undefined {
    for (const exporter of this.exporters.values()) {
      if (exporter.format.toLowerCase() === format.toLowerCase()) {
        return exporter
      }
    }
    return undefined
  }

  /**
   * Get an exporter by name.
   */
  getExporterByName(name: string): ExporterPlugin | undefined {
    return this.exporters.get(name)
  }

  /**
   * Export an entity to a specific format.
   */
  export(
    entity: Entity,
    format: string,
    context: ExportContext
  ): SerializeResult | undefined {
    const exporter = this.getExporter(format)
    if (!exporter) {
      return undefined
    }

    const content = exporter.serialize(entity, context)
    return {
      content,
      mimeType: exporter.mimeType,
      encoding: 'utf-8',
    }
  }

  /**
   * Export multiple entities to a specific format.
   */
  exportBatch(
    entities: Entity[],
    format: string,
    context: ExportContext
  ): SerializeResult | undefined {
    const exporter = this.getExporter(format)
    if (!exporter || !exporter.serializeBatch) {
      return undefined
    }

    const content = exporter.serializeBatch(entities, context)
    return {
      content,
      mimeType: exporter.mimeType,
      encoding: 'utf-8',
    }
  }

  /**
   * Import an entity from a specific format.
   */
  import(content: string, format: string, context: ExportContext): Entity | undefined {
    const exporter = this.getExporter(format)
    if (!exporter || !exporter.deserialize) {
      return undefined
    }

    return exporter.deserialize(content, context)
  }

  // ===========================================================================
  // Query
  // ===========================================================================

  /**
   * Get all registered validators.
   */
  getValidators(): ValidatorPlugin[] {
    return Array.from(this.validators.values())
  }

  /**
   * Get all registered exporters.
   */
  getExporters(): ExporterPlugin[] {
    return Array.from(this.exporters.values())
  }

  /**
   * Get supported export formats.
   */
  getSupportedFormats(): string[] {
    return Array.from(new Set(Array.from(this.exporters.values()).map(e => e.format.toLowerCase())))
  }

  /**
   * Check if a format is supported.
   */
  isFormatSupported(format: string): boolean {
    return this.getExporter(format) !== undefined
  }

  /**
   * Get plugin statistics.
   */
  getStats(): PluginStats {
    return {
      validators: this.validators.size,
      exporters: this.exporters.size,
      formats: this.getSupportedFormats(),
    }
  }

  /**
   * Clear all registered plugins.
   */
  clear(): void {
    this.validators.clear()
    this.exporters.clear()
    this.initialized = false
  }
}

/**
 * Global plugin registry instance.
 */
export const pluginRegistry = new PluginRegistry()

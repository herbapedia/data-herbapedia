/**
 * Plugin system for Herbapedia
 *
 * This module provides a plugin architecture for:
 * - Custom validators
 * - Custom exporters
 *
 * @example Adding a custom validator
 * ```typescript
 * import { ValidatorPlugin, PluginContext } from '@herbapedia/data'
 *
 * const myValidator: ValidatorPlugin = {
 *   name: 'my-validator',
 *   version: '1.0.0',
 *   validate(entity, context) {
 *     const errors = []
 *     // Custom validation logic
 *     return { valid: errors.length === 0, errors, warnings: [] }
 *   }
 * }
 *
 * // Register plugin
 * pluginRegistry.registerValidator(myValidator)
 * ```
 *
 * @example Adding a custom exporter
 * ```typescript
 * import { ExporterPlugin, ExportContext } from '@herbapedia/data'
 *
 * const yamlExporter: ExporterPlugin = {
 *   name: 'yaml-exporter',
 *   version: '1.0.0',
 *   format: 'yaml',
 *   fileExtension: '.yaml',
 *   mimeType: 'application/x-yaml',
 *   serialize(entity, context) {
 *     return yaml.stringify(entity)
 *   }
 * }
 *
 * // Register plugin
 * pluginRegistry.registerExporter(yamlExporter)
 * ```
 */

// Plugin base types
export interface PluginMetadata {
  /** Unique plugin name */
  name: string
  /** Plugin version (semver) */
  version: string
  /** Plugin description */
  description?: string
  /** Plugin author */
  author?: string
}

/**
 * Context provided to plugins during execution.
 */
export interface PluginContext {
  /** Data path */
  dataPath: string
  /** Configuration options */
  config: Record<string, unknown>
  /** Logger function */
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void
}

// Re-export for convenience
export type { PluginMetadata, PluginContext }

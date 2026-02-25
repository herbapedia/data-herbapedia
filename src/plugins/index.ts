/**
 * Plugin system for Herbapedia.
 *
 * This module provides a plugin architecture for extending Herbapedia with:
 * - Custom validators
 * - Custom exporters
 *
 * @packageDocumentation
 */

// Base types
export type { PluginMetadata, PluginContext } from './types'

// Validator plugin types and built-in validators
export type {
  ValidationSeverity,
  PluginValidationError,
  PluginValidationResult,
  ValidatorPluginOptions,
  ValidatorPlugin,
}
export { BaseValidatorPlugin, requiredFieldsValidator, iriFormatValidator } from './validator-plugin'

// Exporter plugin types
export type {
  ExportContext,
  SerializeResult,
  ExporterPlugin,
}
export { csvExporter } from './exporter-plugin'

// Registry
export { PluginRegistry, pluginRegistry } from './registry'
export type { PluginStats } from './registry'

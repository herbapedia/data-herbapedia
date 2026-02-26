/**
 * Validators Module - Barrel export for all validators
 *
 * Provides validation infrastructure for the knowledge graph:
 * - ReferenceValidator: Validates @id references
 * - SchemaValidator: Validates node structure against schemas
 * - CompositeValidator: Combines multiple validators
 */

// Types
export {
  type ValidationSeverity,
  type ValidationIssue,
  type NodeValidationResult,
  type ValidationResult,
  type ValidationOptions,
  createEmptyValidationResult,
  createNodeResult,
  createIssue,
  createError,
  createWarning,
  createInfo,
  addNodeResult,
  addIssueToNode,
  finalizeResult,
} from './ValidationResult.js'

// Validators
export { ReferenceValidator } from './ReferenceValidator.js'
export { SchemaValidator } from './SchemaValidator.js'
export { CompositeValidator, type Validator } from './CompositeValidator.js'

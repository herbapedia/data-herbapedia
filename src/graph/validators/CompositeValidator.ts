/**
 * CompositeValidator - Combines multiple validators
 *
 * Runs all registered validators and aggregates their results.
 * This provides a single entry point for validation.
 */

import type { GraphNode } from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'
import { ReferenceValidator } from './ReferenceValidator.js'
import { SchemaValidator } from './SchemaValidator.js'
import {
  type ValidationOptions,
  type ValidationResult,
  type NodeValidationResult,
  type ValidationIssue,
  type ValidationSeverity,
  createEmptyValidationResult,
  createNodeResult,
  addNodeResult,
  finalizeResult,
} from './ValidationResult.js'

/**
 * Interface for validators
 */
export interface Validator {
  validate(options?: ValidationOptions): ValidationResult
  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult
  name: string
}

/**
 * Composite validator that runs multiple validators
 */
export class CompositeValidator {
  private registry: GraphRegistry
  private validators: Validator[] = []

  constructor(registry: GraphRegistry) {
    this.registry = registry
    this.registerDefaultValidators()
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    // Reference validator - checks @id references
    this.validators.push(new ReferenceValidatorWrapper(this.registry))

    // Schema validator - checks structure
    this.validators.push(new SchemaValidatorWrapper(this.registry))
  }

  /**
   * Add a custom validator
   */
  addValidator(validator: Validator): void {
    this.validators.push(validator)
  }

  /**
   * Remove a validator by name
   */
  removeValidator(name: string): void {
    this.validators = this.validators.filter(v => v.name !== name)
  }

  /**
   * Validate using all validators
   */
  validate(options?: ValidationOptions): ValidationResult {
    const combinedResult = createEmptyValidationResult()
    const allNodes = this.registry.getAllNodes()

    // Group issues by node
    const nodeIssues = new Map<string, ValidationIssue[]>()

    // Run each validator
    for (const validator of this.validators) {
      const result = validator.validate(options)

      // Aggregate issues by node
      for (const issue of result.issues) {
        if (!nodeIssues.has(issue.nodeIri)) {
          nodeIssues.set(issue.nodeIri, [])
        }
        nodeIssues.get(issue.nodeIri)!.push(issue)
      }
    }

    // Create combined node results
    for (const node of allNodes) {
      const issues = nodeIssues.get(node['@id']) || []
      const nodeResult: NodeValidationResult = {
        nodeIri: node['@id'],
        valid: !issues.some(i => i.severity === 'error'),
        issues,
        errorCount: issues.filter(i => i.severity === 'error').length,
        warningCount: issues.filter(i => i.severity === 'warning').length,
        infoCount: issues.filter(i => i.severity === 'info').length,
      }
      addNodeResult(combinedResult, nodeResult)
    }

    return finalizeResult(combinedResult)
  }

  /**
   * Validate a single node using all validators
   */
  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult {
    const issues: ValidationIssue[] = []

    for (const validator of this.validators) {
      const result = validator.validateNode(node, options)
      issues.push(...result.issues)

      if (options?.failFast && !result.valid) {
        break
      }
    }

    return {
      nodeIri: node['@id'],
      valid: !issues.some(i => i.severity === 'error'),
      issues,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      infoCount: issues.filter(i => i.severity === 'info').length,
    }
  }

  /**
   * Get validator by name
   */
  getValidator(name: string): Validator | undefined {
    return this.validators.find(v => v.name === name)
  }

  /**
   * List all registered validators
   */
  listValidators(): string[] {
    return this.validators.map(v => v.name)
  }
}

/**
 * Wrapper for ReferenceValidator to implement Validator interface
 */
class ReferenceValidatorWrapper implements Validator {
  name = 'reference'
  private validator: ReferenceValidator

  constructor(registry: GraphRegistry) {
    this.validator = new ReferenceValidator(registry)
  }

  validate(options?: ValidationOptions): ValidationResult {
    return this.validator.validate(options)
  }

  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult {
    return this.validator.validateNode(node, options)
  }
}

/**
 * Wrapper for SchemaValidator to implement Validator interface
 */
class SchemaValidatorWrapper implements Validator {
  name = 'schema'
  private validator: SchemaValidator

  constructor(registry: GraphRegistry) {
    this.validator = new SchemaValidator(registry)
  }

  validate(options?: ValidationOptions): ValidationResult {
    return this.validator.validate(options)
  }

  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult {
    return this.validator.validateNode(node, options)
  }
}

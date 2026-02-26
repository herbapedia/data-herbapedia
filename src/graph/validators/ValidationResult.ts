/**
 * ValidationResult - Types for validation operations
 *
 * Provides a standardized way to report validation errors and warnings
 * for nodes in the knowledge graph.
 */

import type { GraphNode } from '../types.js'

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * A single validation issue
 */
export interface ValidationIssue {
  /** Severity level */
  severity: ValidationSeverity
  /** Type of issue (e.g., 'missing-required', 'invalid-format', 'broken-reference') */
  type: string
  /** Human-readable message */
  message: string
  /** IRI of the affected node */
  nodeIri: string
  /** Property path where the issue occurred */
  property?: string
  /** Expected value or format */
  expected?: string
  /** Actual value found */
  actual?: string
  /** Source file or location */
  source?: string
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Result of validating a single node
 */
export interface NodeValidationResult {
  /** IRI of the validated node */
  nodeIri: string
  /** Whether the node is valid (no errors) */
  valid: boolean
  /** All issues found (errors, warnings, info) */
  issues: ValidationIssue[]
  /** Count of errors */
  errorCount: number
  /** Count of warnings */
  warningCount: number
  /** Count of info messages */
  infoCount: number
}

/**
 * Result of validating multiple nodes
 */
export interface ValidationResult {
  /** Whether all nodes are valid (no errors) */
  valid: boolean
  /** Total number of nodes validated */
  totalNodes: number
  /** Number of valid nodes */
  validNodes: number
  /** Number of invalid nodes */
  invalidNodes: number
  /** All issues from all nodes */
  issues: ValidationIssue[]
  /** Results by node IRI */
  byNode: Map<string, NodeValidationResult>
  /** Summary by issue type */
  byType: Record<string, number>
  /** Summary by severity */
  bySeverity: Record<ValidationSeverity, number>
  /** Validation start time */
  startTime: Date
  /** Validation end time */
  endTime: Date
  /** Duration in milliseconds */
  duration: number
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  /** Stop after first error (per node) */
  failFast?: boolean
  /** Include warnings in result */
  includeWarnings?: boolean
  /** Include info messages in result */
  includeInfo?: boolean
  /** Validate references to external nodes */
  validateReferences?: boolean
  /** Custom validation rules to apply */
  customRules?: string[]
  /** Maximum number of issues to collect per node */
  maxIssuesPerNode?: number
}

/**
 * Create an empty validation result
 */
export function createEmptyValidationResult(): ValidationResult {
  return {
    valid: true,
    totalNodes: 0,
    validNodes: 0,
    invalidNodes: 0,
    issues: [],
    byNode: new Map(),
    byType: {},
    bySeverity: { error: 0, warning: 0, info: 0 },
    startTime: new Date(),
    endTime: new Date(),
    duration: 0,
  }
}

/**
 * Create a validation issue
 */
export function createIssue(
  severity: ValidationSeverity,
  type: string,
  message: string,
  nodeIri: string,
  options?: Partial<ValidationIssue>
): ValidationIssue {
  return {
    severity,
    type,
    message,
    nodeIri,
    ...options,
  }
}

/**
 * Create an error issue
 */
export function createError(
  type: string,
  message: string,
  nodeIri: string,
  options?: Partial<ValidationIssue>
): ValidationIssue {
  return createIssue('error', type, message, nodeIri, options)
}

/**
 * Create a warning issue
 */
export function createWarning(
  type: string,
  message: string,
  nodeIri: string,
  options?: Partial<ValidationIssue>
): ValidationIssue {
  return createIssue('warning', type, message, nodeIri, options)
}

/**
 * Create an info issue
 */
export function createInfo(
  type: string,
  message: string,
  nodeIri: string,
  options?: Partial<ValidationIssue>
): ValidationIssue {
  return createIssue('info', type, message, nodeIri, options)
}

/**
 * Add a node result to the overall result
 */
export function addNodeResult(
  result: ValidationResult,
  nodeResult: NodeValidationResult
): void {
  result.totalNodes++
  result.byNode.set(nodeResult.nodeIri, nodeResult)

  if (nodeResult.valid) {
    result.validNodes++
  } else {
    result.invalidNodes++
    result.valid = false
  }

  for (const issue of nodeResult.issues) {
    result.issues.push(issue)
    result.bySeverity[issue.severity]++
    result.byType[issue.type] = (result.byType[issue.type] || 0) + 1
  }
}

/**
 * Finalize a validation result
 */
export function finalizeResult(result: ValidationResult): ValidationResult {
  result.endTime = new Date()
  result.duration = result.endTime.getTime() - result.startTime.getTime()
  return result
}

/**
 * Create a node validation result
 */
export function createNodeResult(nodeIri: string): NodeValidationResult {
  return {
    nodeIri,
    valid: true,
    issues: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
  }
}

/**
 * Add an issue to a node result
 */
export function addIssueToNode(
  nodeResult: NodeValidationResult,
  issue: ValidationIssue
): void {
  nodeResult.issues.push(issue)

  switch (issue.severity) {
    case 'error':
      nodeResult.errorCount++
      nodeResult.valid = false
      break
    case 'warning':
      nodeResult.warningCount++
      break
    case 'info':
      nodeResult.infoCount++
      break
  }
}

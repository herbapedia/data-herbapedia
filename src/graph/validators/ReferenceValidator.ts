/**
 * ReferenceValidator - Validates @id references in the knowledge graph
 *
 * Ensures that all @id references point to nodes that exist in the graph.
 * This is critical for maintaining referential integrity.
 */

import type { GraphNode, IRIReference } from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'
import {
  type ValidationOptions,
  type ValidationResult,
  type NodeValidationResult,
  createEmptyValidationResult,
  createNodeResult,
  createError,
  createWarning,
  addNodeResult,
  finalizeResult,
  addIssueToNode,
} from './ValidationResult.js'

/**
 * Validator for @id references
 */
export class ReferenceValidator {
  private registry: GraphRegistry

  constructor(registry: GraphRegistry) {
    this.registry = registry
  }

  /**
   * Validate all references in the graph
   */
  validate(options?: ValidationOptions): ValidationResult {
    const result = createEmptyValidationResult()
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const nodeResult = this.validateNode(node, options)
      addNodeResult(result, nodeResult)
    }

    return finalizeResult(result)
  }

  /**
   * Validate references in a single node
   */
  validateNode(node: GraphNode, options?: ValidationOptions): NodeValidationResult {
    const result = createNodeResult(node['@id'])
    const refs = this.extractReferences(node)

    for (const ref of refs) {
      if (!this.registry.hasNode(ref.iri)) {
        const issue = createError(
          'broken-reference',
          `Reference to non-existent node: ${ref.iri}`,
          node['@id'],
          { property: ref.property, actual: ref.iri }
        )
        addIssueToNode(result, issue)

        if (options?.failFast && !result.valid) {
          break
        }
      }
    }

    // Check for unresolved references from the registry
    const unresolved = this.registry.resolver.getUnresolvedReferences()
    for (const unresolvedIri of unresolved) {
      // Find which nodes reference this unresolved IRI
      const incoming = this.registry.resolver.getIncomingReferences(unresolvedIri)
      for (const sourceIri of incoming) {
        if (sourceIri === node['@id']) {
          const issue = createWarning(
            'unresolved-reference',
            `Reference to node that was never loaded: ${unresolvedIri}`,
            node['@id'],
            { actual: unresolvedIri }
          )
          addIssueToNode(result, issue)
        }
      }
    }

    return result
  }

  /**
   * Check if a single reference is valid
   */
  isReferenceValid(iri: string): boolean {
    return this.registry.hasNode(iri)
  }

  /**
   * Get all broken references in the graph
   */
  getBrokenReferences(): string[] {
    return this.registry.resolver.getUnresolvedReferences()
  }

  /**
   * Extract all @id references from a node
   */
  private extractReferences(node: GraphNode): Array<{ iri: string; property: string }> {
    const refs: Array<{ iri: string; property: string }> = []
    const nodeObj = node as unknown as Record<string, unknown>

    const extractFromValue = (value: unknown, property: string): void => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (const item of value) {
            extractFromValue(item, property)
          }
        } else if ('@id' in value && typeof (value as IRIReference)['@id'] === 'string') {
          refs.push({
            iri: (value as IRIReference)['@id'],
            property,
          })
        }
      }
    }

    for (const key of Object.keys(nodeObj)) {
      if (key.startsWith('@')) continue
      extractFromValue(nodeObj[key], key)
    }

    return refs
  }
}

/**
 * Unit Tests for SchemaValidator
 *
 * Tests JSON Schema-based validation for graph nodes.
 */

import { describe, it, beforeEach } from 'vitest'
import { expect } from 'vitest'
import { SchemaValidator } from '../../../src/graph/validators/SchemaValidator.js'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph, sampleSpeciesNode, sampleTcmProfileNode, sampleTcmFlavorNode } from '../fixtures/testGraph.js'

describe('SchemaValidator', () => {
  let registry: GraphRegistry
  let validator: SchemaValidator

  beforeEach(() => {
    registry = new GraphRegistry()
    validator = new SchemaValidator(registry)

    // Register test nodes
    for (const node of minimalTestGraph) {
      const iri = node['@id']
      if (iri.includes('/species/')) {
        registry.registerNode(node, NodeType.SPECIES)
      } else if (iri.includes('/profile/tcm/')) {
        registry.registerNode(node, NodeType.TCM_PROFILE)
      } else if (iri.includes('/vocab/tcm/')) {
        registry.registerNode(node, NodeType.TCM_FLAVOR)
      }
    }
  })

  describe('validate', () => {
    it('should validate all nodes in the graph', () => {
      const result = validator.validate()

      expect(result).to.exist
      expect(result.valid).to.be.a('boolean')
      expect(result.nodeCount).to.equal(minimalTestGraph.length)
      expect(result.results).to.be.an('array')
    })

    it('should include statistics', () => {
      const result = validator.validate()

      expect(result.errorCount).to.be.a('number')
      expect(result.warningCount).to.be.a('number')
    })
  })

  describe('validateNode', () => {
    it('should validate a species node', () => {
      const result = validator.validateNode(sampleSpeciesNode)

      expect(result).to.exist
      expect(result.nodeId).to.equal(sampleSpeciesNode['@id'])
      expect(result.valid).to.be.a('boolean')
    })

    it('should validate a TCM profile node', () => {
      const result = validator.validateNode(sampleTcmProfileNode)

      expect(result).to.exist
      expect(result.nodeId).to.equal(sampleTcmProfileNode['@id'])
    })

    it('should validate a vocabulary node', () => {
      const result = validator.validateNode(sampleTcmFlavorNode)

      expect(result).to.exist
      expect(result.nodeId).to.equal(sampleTcmFlavorNode['@id'])
    })

    it('should detect missing required properties', () => {
      const invalidNode = {
        '@id': 'https://www.herbapedia.org/graph/species/test',
        '@type': ['schema:Plant'],
        // Missing scientificName
      }

      const result = validator.validateNode(invalidNode as any)

      expect(result.issues.length).to.be.greaterThan(0)
      const missingError = result.issues.find(i => i.code === 'missing-required')
      expect(missingError).to.exist
    })

    it('should detect type mismatches', () => {
      const invalidNode = {
        '@id': 'https://www.herbapedia.org/graph/species/test',
        '@type': 'schema:Plant', // Should be array
        scientificName: 'Testus plantus',
      }

      const result = validator.validateNode(invalidNode as any)

      // Should have warning about @type being string instead of array
      const typeWarning = result.issues.find(i => i.code === 'type-mismatch')
      expect(typeWarning).to.exist
    })
  })

  describe('with custom schemas', () => {
    it('should accept custom validation schemas', () => {
      const customSchemas = {
        species: {
          required: ['@id', 'scientificName', 'customField'],
          optional: ['name'],
          propertyTypes: {
            '@id': 'string',
            scientificName: 'string',
            customField: 'string',
          },
        },
      }

      const customValidator = new SchemaValidator(registry, customSchemas)

      const node = {
        '@id': 'https://www.herbapedia.org/graph/species/test',
        '@type': ['schema:Plant'],
        scientificName: 'Testus plantus',
        // Missing customField
      }

      const result = customValidator.validateNode(node as any)

      const missingError = result.issues.find(i => i.code === 'missing-required' && i.details?.property === 'customField')
      expect(missingError).to.exist
    })
  })

  describe('validation options', () => {
    it('should support failFast option', () => {
      // Create multiple invalid nodes
      const invalidNode1 = {
        '@id': 'https://www.herbapedia.org/graph/species/test1',
        '@type': ['schema:Plant'],
        // Missing scientificName
      }

      const invalidNode2 = {
        '@id': 'https://www.herbapedia.org/graph/species/test2',
        '@type': ['schema:Plant'],
        // Missing scientificName
      }

      const testRegistry = new GraphRegistry()
      testRegistry.registerNode(invalidNode1 as any, NodeType.SPECIES)
      testRegistry.registerNode(invalidNode2 as any, NodeType.SPECIES)

      const testValidator = new SchemaValidator(testRegistry)

      const result = testValidator.validate({ failFast: true })

      // With failFast, should stop at first error
      expect(result).to.exist
    })
  })

  describe('determineNodeType', () => {
    it('should correctly identify species nodes', () => {
      const result = validator.validateNode(sampleSpeciesNode)
      // Should not have unknown-type warning
      const unknownWarning = result.issues.find(i => i.code === 'unknown-type')
      expect(unknownWarning).to.be.undefined
    })

    it('should correctly identify profile nodes', () => {
      const result = validator.validateNode(sampleTcmProfileNode)
      const unknownWarning = result.issues.find(i => i.code === 'unknown-type')
      expect(unknownWarning).to.be.undefined
    })

    it('should correctly identify vocabulary nodes', () => {
      const result = validator.validateNode(sampleTcmFlavorNode)
      const unknownWarning = result.issues.find(i => i.code === 'unknown-type')
      expect(unknownWarning).to.be.undefined
    })
  })
})

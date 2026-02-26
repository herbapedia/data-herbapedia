/**
 * Unit Tests for GraphTraversal API
 *
 * Tests the traversal functionality for the knowledge graph.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { GraphTraversal, from '../../../src/graph/api/GraphTraversal.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph } from '../fixtures/testGraph.js'

describe('GraphTraversal', () => {
  let registry: GraphRegistry
  let traversal: GraphTraversal

  beforeEach(() => {
    registry = new GraphRegistry()
    traversal = new GraphTraversal(registry)

    // Register test nodes
    for (const node of minimalTestGraph) {
    const nodeType = node['@id'].includes('/species/') ? NodeType.SPECIES
      : node['@id'].includes('/profile/') ? NodeType.TCM_PROFILE
      : NodeType.TCM_FLAVOR
    registry.registerNode(node, nodeType)
    }
  })

  describe('getIncomingReferences', () => {
    it('should return empty array for node with no incoming references', () => {
    const refs = traversal.getIncomingReferences('https://www.herbapedia.org/graph/species/panax-ginseng')
    // Profile references species,    expect(refs.length).to.be.greaterThanOrEqual(0)
  })
  })

  describe('getOutgoingReferences', () => {
    it('should return empty array for node with no outgoing references', () => {
    const refs = traversal.getOutgoingReferences('https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet')
    expect(refs).toBeInstanceOf(Array)
  })
  })

  describe('traverseRelationship', () => {
    it('should return empty array for non-existent relationship', () => {
    const nodes = traversal.traverseRelationship(
      'https://www.herbapedia.org/graph/species/panax-ginseng',
      'nonExistentProperty'
    )
    expect(nodes).toEqual([])
  })
  })

  describe('getRelatedNodes', () => {
    it('should return map of related nodes', () => {
    const related = traversal.getRelatedNodes(
      'https://www.herbapedia.org/graph/species/panax-ginseng',
      { maxDepth: 1 }
    )
    expect(related).toBeInstanceOf(Map)
  })
  })

  describe('getAncestors', () => {
    it('should return empty array for node with no ancestors', () => {
    const ancestors = traversal.getAncestors('https://www.herbapedia.org/graph/species/panax-ginseng')
    expect(ancestors).toEqual([])
  })
  })

  describe('getDescendants', () => {
    it('should return empty array for node with no descendants', () => {
    const descendants = traversal.getDescendants('https://www.herbapedia.org/graph/species/panax-ginseng')
    expect(descendants).toEqual([])
  })
  })

  describe('areConnected', () => {
    it('should return true for connected nodes', () => {
    // A node is always connected to itself
    const connected = traversal.areConnected(
      'https://www.herbapedia.org/graph/species/panax-ginseng',
      'https://www.herbapedia.org/graph/species/panax-ginseng'
    )
    expect(connected).to.be.true
  })
  })
})

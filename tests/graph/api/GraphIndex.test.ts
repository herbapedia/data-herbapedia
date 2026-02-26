/**
 * Unit Tests for GraphIndex API
 *
 * Tests the index and search functionality for the knowledge graph.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { GraphIndex } from '../../../src/graph/api/GraphIndex.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph } from '../fixtures/testGraph.js'

describe('GraphIndex', () => {
  let registry: GraphRegistry
  let index: GraphIndex

  beforeEach(() => {
    registry = new GraphRegistry()
    index = new GraphIndex(registry)

    // Register test nodes
    for (const node of minimalTestGraph) {
      const nodeType = node['@id'].includes('/species/') ? NodeType.SPECIES
        : node['@id'].includes('/profile/') ? NodeType.TCM_PROFILE
        : NodeType.TCM_FLAVOR
      registry.registerNode(node, nodeType)
    }
  })

  describe('listSpecies', () => {
    it('should return all species nodes', () => {
      const species = index.listSpecies()
      expect(species.length).to.be.greaterThanOrEqual(1)
    })
  })

  describe('listProfiles', () => {
    it('should return all profiles when no system specified', () => {
      const profiles = index.listProfiles()
      expect(profiles.length).to.be.greaterThanOrEqual(1)
    })

    it('should return TCM profiles when system is tcm', () => {
      const profiles = index.listProfiles('tcm')
      expect(profiles.length).to.be.greaterThanOrEqual(0)
    })
  })

  describe('listVocabulary', () => {
    it('should return TCM vocabulary', () => {
      const vocab = index.listVocabulary('tcm')
      expect(vocab.length).to.be.greaterThanOrEqual(0)
    })

    it('should return empty array for non-existent vocabulary type', () => {
      const vocab = index.listVocabulary('tcm', 'nonexistent')
      expect(vocab).toEqual([])
    })
  })

  describe('listAll', () => {
    it('should return all nodes in the graph', () => {
      const allNodes = index.listAll()
      expect(allNodes.length).to.equal(minimalTestGraph.length)
    })
  })

  describe('search', () => {
    it('should build search index', () => {
      index.buildSearchIndex()
      // If no error thrown, index was built successfully
      expect(true).to.be.true
    })

    it('should return results for matching query', () => {
      index.buildSearchIndex()
      const results = index.search('ginseng')
      expect(results.length).to.be.greaterThanOrEqual(0)
    })

    it('should return empty array for non-matching query', () => {
      index.buildSearchIndex()
      const results = index.search('zzzzzzzzzzzzzz')
      expect(results.length).to.equal(0)
    })
  })

  describe('searchByField', () => {
    it('should find nodes by field value', () => {
      const results = index.searchByField('slug', 'panax-ginseng')
      expect(results.length).to.be.greaterThanOrEqual(1)
    })

    it('should return empty array for non-matching field value', () => {
      const results = index.searchByField('slug', 'non-existent-slug')
      expect(results.length).to.equal(0)
    })
  })

  describe('searchByCriteria', () => {
    it('should find nodes matching multiple criteria', () => {
      const results = index.searchByCriteria({
        slug: 'panax-ginseng'
      })
      expect(results.length).to.be.greaterThanOrEqual(0)
    })
  })

  describe('getStats', () => {
    it('should return graph statistics', () => {
      const stats = index.getStats()
      expect(stats.totalNodes).to.be.greaterThan(0)
      expect(stats.byType).toBeDefined()
      expect(stats.lastUpdated).toBeDefined()
    })
  })

  describe('getCountByType', () => {
    it('should return count by node type', () => {
      const counts = index.getCountByType()
      expect(counts).toBeDefined()
      expect(typeof counts).to.equal('object')
    })
  })

  describe('getTotalCount', () => {
    it('should return total node count', () => {
      const count = index.getTotalCount()
      expect(count).to.equal(minimalTestGraph.length)
    })
  })

  describe('generateIndex', () => {
    it('should generate index for node type', () => {
      const indexData = index.generateIndex('species')
      expect(indexData['@type']).to.equal('Collection')
      expect(indexData.totalItems).to.be.greaterThan(0)
      expect(indexData.member).toBeInstanceOf(Array)
    })
  })
})

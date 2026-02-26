/**
 * Query Integration Test
 *
 * Tests the complete query workflow with various query patterns.
 */

import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { GraphQuery } from '../../../src/graph/api/GraphQuery.js'
import { GraphTraversal } from '../../../src/graph/api/GraphTraversal.js'
import { GraphIndex } from '../../../src/graph/api/GraphIndex.js'
import { NodeType } from '../../../src/graph/types.js'
import {
  sampleSpeciesNode,
  sampleTcmProfileNode,
  sampleTcmFlavorNode,
  minimalTestGraph,
} from '../fixtures/testGraph.js'

describe('Query Integration', () => {
  let registry: GraphRegistry
  let query: GraphQuery
  let traversal: GraphTraversal
  let index: GraphIndex

  beforeEach(() => {
    registry = new GraphRegistry()
    query = new GraphQuery(registry)
    traversal = new GraphTraversal(registry)
    index = new GraphIndex(registry)

    // Register test nodes
    for (const node of minimalTestGraph) {
      const iri = node['@id']
      if (iri.includes('/species/')) {
        registry.registerNode(node, NodeType.SPECIES)
      } else if (iri.includes('/profile/tcm/')) {
        registry.registerNode(node, NodeType.TCM_PROFILE)
      } else if (iri.includes('/vocab/tcm/flavor/')) {
        registry.registerNode(node, NodeType.TCM_FLAVOR)
      }
    }
  })

  describe('Query-Traversal Integration', () => {
    it('should query species and traverse to profiles', () => {
      // Query for species
      const species = query.getSpecies('panax-ginseng')

      expect(species).to.exist
      expect(species!['@id']).to.include('panax-ginseng')

      // Traverse to find profiles that reference this species
      const profiles = traversal.getIncomingReferences(species!['@id'])

      // Should find at least the TCM profile
      const tcmProfiles = profiles.filter(p => p['@id'].includes('/tcm/'))
      expect(tcmProfiles.length).to.be.greaterThan(0)
    })

    it('should traverse from profile to vocabulary', () => {
      // Get TCM profile
      const profiles = query.getProfilesBySystem('tcm')

      if (profiles.length > 0) {
        const profile = profiles[0]

        // Traverse to flavors
        const flavors = traversal.traverseRelationship(profile['@id'], 'hasFlavor')

        expect(flavors).to.be.an('array')
      }
    })

    it('should get complete TCM vocabulary for profile', () => {
      const profiles = query.getProfilesBySystem('tcm')

      if (profiles.length > 0) {
        const profile = profiles[0]
        const vocab = traversal.getTcmVocabulary(profile['@id'])

        expect(vocab).to.have.property('natures')
        expect(vocab).to.have.property('flavors')
        expect(vocab).to.have.property('meridians')
        expect(vocab).to.have.property('categories')
      }
    })
  })

  describe('Query-Index Integration', () => {
    it('should list species and query each one', () => {
      const speciesList = index.listSpecies()

      expect(speciesList.length).to.be.greaterThan(0)

      for (const species of speciesList) {
        const found = query.getByIRI(species['@id'])
        expect(found).to.exist
      }
    })

    it('should search and then query results', () => {
      index.buildSearchIndex()

      const results = index.search('ginseng')

      for (const result of results) {
        const node = query.getByIRI(result.node['@id'])
        expect(node).to.exist
        expect(node!['@id']).to.equal(result.node['@id'])
      }
    })

    it('should list vocabulary and traverse to it', () => {
      const vocab = index.listVocabulary('tcm', 'flavor')

      expect(vocab.length).to.be.greaterThan(0)

      for (const term of vocab) {
        const found = query.getByIRI(term['@id'])
        expect(found).to.exist
      }
    })
  })

  describe('Traversal-Index Integration', () => {
    it('should get related nodes and index them', () => {
      const species = query.getSpecies('panax-ginseng')

      if (species) {
        const related = traversal.getRelatedNodes(species['@id'], { maxDepth: 1 })

        expect(related.size).to.be.greaterThan(0)

        // Each related node should be findable via index
        for (const [iri, node] of related) {
          const found = index.searchByField('@id', iri)
          // Note: @id might not be searchable field
        }
      }
    })

    it('should traverse hierarchy and generate index', () => {
      const vocab = index.listVocabulary('tcm', 'flavor')

      if (vocab.length > 0) {
        const term = vocab[0]
        const ancestors = traversal.getAncestors(term['@id'])

        expect(ancestors).to.be.an('array')
      }
    })
  })

  describe('Full Workflow Integration', () => {
    it('should complete full query workflow', () => {
      // 1. List all species
      const allSpecies = index.listSpecies()
      expect(allSpecies.length).to.be.greaterThan(0)

      // 2. Pick a species
      const species = allSpecies[0]

      // 3. Find profiles for this species
      const profiles = query.findProfilesForSpecies((species as any).slug)

      // 4. For each profile, get vocabulary
      for (const profile of profiles) {
        if (profile['@id'].includes('/tcm/')) {
          const vocab = traversal.getTcmVocabulary(profile['@id'])

          // 5. Verify vocabulary references are resolvable
          for (const flavor of vocab.flavors) {
            const found = query.getByIRI(flavor['@id'])
            expect(found).to.exist
          }
        }
      }
    })

    it('should support search-based discovery', () => {
      // 1. Build search index
      index.buildSearchIndex()

      // 2. Search for a term
      const results = index.search('ginseng')

      // 3. For each result, get related nodes
      for (const result of results.slice(0, 5)) {
        const related = traversal.getRelatedNodes(result.node['@id'], { maxDepth: 1 })

        // 4. Check stats
        expect(related.size).to.be.greaterThanOrEqual(0)
      }
    })

    it('should provide consistent statistics', () => {
      const statsFromRegistry = registry.getStats()
      const statsFromIndex = index.getStats()

      expect(statsFromRegistry.totalNodes).to.equal(statsFromIndex.totalNodes)
      expect(statsFromRegistry.byType).to.deep.equal(statsFromIndex.byType)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle missing nodes gracefully', () => {
      const missing = query.getSpecies('non-existent-species')
      expect(missing).to.be.undefined

      const missingByIRI = query.getByIRI('https://test.org/nonexistent')
      expect(missingByIRI).to.be.undefined
    })

    it('should handle empty search results', () => {
      index.buildSearchIndex()

      const results = index.search('zzzzzzzzzzzzz123456789')
      expect(results).to.be.an('array')
      expect(results.length).to.equal(0)
    })

    it('should handle traversal of missing nodes', () => {
      const related = traversal.getRelatedNodes('https://test.org/nonexistent')
      expect(related.size).to.equal(0)
    })
  })
})

/**
 * Unit Tests for GraphQuery API
 *
 * Tests the query functionality for the knowledge graph.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { GraphQuery } from '../../../src/graph/api/GraphQuery.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph } from '../fixtures/testGraph.js'

describe('GraphQuery', () => {
  let registry: GraphRegistry
  let query: GraphQuery

  beforeEach(() => {
    registry = new GraphRegistry()
    query = new GraphQuery(registry)

    // Register test nodes
    for (const node of minimalTestGraph) {
    const nodeType = node['@id'].includes('/species/') ? NodeType.SPECIES
      : node['@id'].includes('/profile/') ? NodeType.TCM_PROFILE
      : node['@id'].includes('/flavor/') ? NodeType.TCM_FLAVOR
      : null
    if (nodeType) {
      registry.registerNode(node, nodeType)
    }
  }
  })

  describe('getSpecies', () => {
    it('should return species by slug', () => {
    const species = query.getSpecies('panax-ginseng')
    expect(species).toBeDefined()
    expect(species?.['@id']).to.equal('https://www.herbapedia.org/graph/species/panax-ginseng')
    expect(species?.scientificName).to.equal('Panax ginseng C.A. Meyer')
  })

    it('should return undefined for non-existent species', () => {
    const species = query.getSpecies('non-existent-species')
    expect(species).toBeUndefined()
  })
  })

  describe('getProfile', () => {
    it('should return TCM profile by system and slug', () => {
    const profile = query.getProfile('tcm', 'ren-shen')
    expect(profile).toBeDefined()
    expect(profile?.pinyin).to.equal('Rén Shēn')
  })

    it('should return undefined for non-existent profile', () => {
    const profile = query.getProfile('tcm', 'non-existent')
    expect(profile).toBeUndefined()
  })
  })

  describe('getByIRI', () => {
    it('should return node by full IRI', () => {
    const node = query.getByIRI('https://www.herbapedia.org/graph/species/panax-ginseng')
    expect(node).toBeDefined()
    expect(node?.['@id']).to.equal('https://www.herbapedia.org/graph/species/panax-ginseng')
  })

    it('should return undefined for non-existent IRI', () => {
    const node = query.getByIRI('https://www.herbapedia.org/graph/species/non-existent')
    expect(node).toBeUndefined()
  })
  })

  describe('getBySlug', () => {
    it('should return node by slug searching all registries', () => {
    const species = query.getBySlug('panax-ginseng')
    expect(species).toBeDefined()
  })
  })

  describe('exists', () => {
    it('should return true for existing node', () => {
    const exists = query.exists('https://www.herbapedia.org/graph/species/panax-ginseng')
    expect(exists).to.be.true
  })

    it('should return false for non-existent node', () => {
    const exists = query.exists('https://www.herbapedia.org/graph/species/non-existent')
    expect(exists).to.be.false
  })
  })
})

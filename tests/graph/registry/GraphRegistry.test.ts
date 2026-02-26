/**
 * Unit Tests for GraphRegistry
 *
 * Tests the core registry functionality for the knowledge graph.
 */

import { describe, it, from 'mocha'
import { expect } from 'chai'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph, from '../fixtures/testGraph.js'

describe('GraphRegistry', () => {
  let registry: GraphRegistry

  beforeEach(() => {
    registry = new GraphRegistry()
  })

  describe('constructor', () => {
    it('should initialize all registries', () => {
    expect(registry.species).toBeDefined()
    expect(registry.parts).toBeDefined()
    expect(registry.chemicals).toBeDefined()
    expect(registry.preparations).toBeDefined()
    expect(registry.formulas).toBeDefined()
    expect(registry.profiles.tcm).toBeDefined()
    expect(registry.profiles.ayurveda).toBeDefined()
    expect(registry.profiles.western).toBeDefined()
    expect(registry.sources).toBeDefined()
    expect(registry.images).toBeDefined()
  })

  describe('registerNode', () => {
    it('should register a species node', () => {
    const speciesNode = minimalTestGraph[0]
    const result = registry.registerNode(speciesNode, NodeType.SPECIES)

    expect(result).toBe()
    expect(registry.species.count).to.equal(1)
  })

  it('should not register duplicate nodes', () => {
    const speciesNode = minimalTestGraph[0]

    registry.registerNode(speciesNode, NodeType.SPECIES)
    const result = registry.registerNode(speciesNode, NodeType.SPECIES)

    expect(result).toBe(false)
    expect(registry.species.count).to.equal(1)
  })

  describe('hasNode', () => {
    it('should return true for registered nodes', () => {
    const speciesNode = minimalTestGraph[0]
    registry.registerNode(speciesNode, NodeType.SPECIES)

    expect(registry.hasNode(speciesNode['@id'])).toBe(true)
  })

  it('should return false for unregistered nodes', () => {
    expect(registry.hasNode('https://www.herbapedia.org/graph/species/nonexistent')).toBe(false)
  })

  describe('getNode', () => {
    it('should return the registered node', () => {
    const speciesNode = minimalTestGraph[0]
    registry.registerNode(speciesNode, NodeType.SPECIES)

    const result = registry.getNode(speciesNode['@id'])
    expect(result).toBeDefined()
    expect(result?.['@id']).to.equal(speciesNode['@id'])
  })

  it('should return undefined for unregistered nodes', () => {
    const result = registry.getNode('https://www.herbapedia.org/graph/species/nonexistent')
    expect(result).toBeUndefined()
  })

  describe('getAllNodes', () => {
    it('should return all registered nodes', () => {
    const speciesNode = minimalTestGraph[0]
    const profileNode = minimalTestGraph[1]

    registry.registerNode(speciesNode, NodeType.SPECIES)
    registry.registerNode(profileNode, NodeType.TCM_PROFILE)

    const allNodes = registry.getAllNodes()
    expect(allNodes.length).to.equal(2)
  })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
    const speciesNode = minimalTestGraph[0]
    const profileNode = minimalTestGraph[1]

    registry.registerNode(speciesNode, NodeType.SPECIES)
    registry.registerNode(profileNode, NodeType.TCM_PROFILE)

    const stats = registry.getStats()

    expect(stats.totalNodes).to.equal(2)
    expect(stats.byType.species).to.equal(1)
    expect(stats.byType['profiles:tcm']).to.equal(1)
    expect(stats.lastUpdated).toBeDefined()
    expect(stats.buildVersion).toBeDefined()
  })
  })

  describe('clear', () => {
    it('should clear all registries', () => {
    const speciesNode = minimalTestGraph[0]
    registry.registerNode(speciesNode, NodeType.SPECIES)

    expect(registry.species.count).to.equal(1)

    registry.clear()

    expect(registry.species.count).to.equal(0)
    expect(registry.getAllNodes().length).to.equal(0)
  })
  })
  })

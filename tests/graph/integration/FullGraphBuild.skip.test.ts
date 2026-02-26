/**
 * Full Graph Build Integration Test
 *
 * Tests the complete build process with real data from the data-herbapedia directory.
 */

import { describe, it, beforeAll, afterAll } from 'vitest'
import { expect } from 'vitest'
import { GraphBuilder } from '../../../src/graph/GraphBuilder.js'
import { GraphQuery } from '../../../src/graph/api/GraphQuery.js'
import { GraphTraversal } from '../../../src/graph/api/GraphTraversal.js'
import { GraphIndex } from '../../../src/graph/api/GraphIndex.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Full Graph Build Integration', () => {
  let tempOutputDir: string
  const dataRoot = path.resolve(__dirname, '../../../..')

  before(() => {
    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herbapedia-full-build-'))
  })

  after(() => {
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true })
    }
  })

  describe('Build Process', () => {
    it('should build graph from data directory', async function() {
    this.timeout(30000) // 30 seconds timeout

    const builder = new GraphBuilder({
      dataRoot: dataRoot,
      outputDir: tempOutputDir,
      validate: false,
      verbose: false,
    })

    const result = await builder.build()

    expect(result).to.exist
    expect(result.success).to.be.true
    expect(result.stats).to.exist
  })

    it('should load species from entities directory', async function() {
    this.timeout(30000)

    const builder = new GraphBuilder({
      dataRoot: dataRoot,
      outputDir: tempOutputDir,
      validate: false,
      verbose: false,
    })

    await builder.build()
    const stats = builder.getRegistry().getStats()

    // Should have loaded some species
    expect(stats.byType).to.have.property('species')
    expect(stats.byType.species).to.be.greaterThan(0)
  })

  it('should load TCM profiles', async function() {
    this.timeout(30000)

    const builder = new GraphBuilder({
      dataRoot: dataRoot,
      outputDir: tempOutputDir,
      validate: false,
      verbose: false,
    })

    await builder.build()
    const stats = builder.getRegistry().getStats()

    // Should have loaded some TCM profiles
    expect(stats.byType).to.have.property('tcm_profile')
  })

  it('should load TCM vocabulary', async function() {
    this.timeout(30000)

    const builder = new GraphBuilder({
      dataRoot: dataRoot,
      outputDir: tempOutputDir,
      validate: false,
      verbose: false,
    })

    await builder.build()
    const stats = builder.getRegistry().getStats()

    // Should have loaded vocabulary
    expect(stats.byType).to.have.property('tcm_flavor')
    expect(stats.byType).to.have.property('tcm_nature')
  })
})

describe('Full Graph API Integration', () => {
  let builder: GraphBuilder
  let registry: any

  before(async function() {
    this.timeout(30000)

    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herbapedia-api-test-'))

    builder = new GraphBuilder({
      dataRoot: dataRoot,
      outputDir: tempOutputDir,
      validate: false,
      verbose: false,
    })

    await builder.build()
    registry = builder.getRegistry()
  })

  after(() => {
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true })
    }
  })

  describe('GraphQuery with real data', () => {
    it('should query species by slug', () => {
    const query = new GraphQuery(registry)
    const stats = registry.getStats()

    // Get first species slug from stats
    const species = query.listSpecies()
    if (species.length > 0) {
      const firstSpecies = species[0]
      const slug = (firstSpecies as any).slug
      const found = query.getSpecies(slug)
      expect(found).to.exist
    }
  })

  it('should find profiles for species', () => {
    const query = new GraphQuery(registry)
    const species = query.listSpecies()

    if (species.length > 0) {
      const slug = (species[0] as any).slug
      const profiles = query.findProfilesForSpecies(slug)

      expect(profiles).to.be.an('array')
    }
  })

  it('should list TCM profiles', () => {
    const query = new GraphQuery(registry)
    const profiles = query.getProfilesBySystem('tcm')

    expect(profiles).to.be.an('array')
    expect(profiles.length).to.be.greaterThan(0)
  })
})

describe('GraphTraversal with real data', () => {
  it('should traverse relationships', () => {
    const query = new GraphQuery(registry)
    const traversal = new GraphTraversal(registry)

    const profiles = query.getProfilesBySystem('tcm')
    if (profiles.length > 0) {
      const profile = profiles[0]
      const outgoing = traversal.getOutgoingReferences(profile['@id'])

      expect(outgoing).to.be.an('array')
    }
  })

  it('should get TCM vocabulary for profile', () => {
    const query = new GraphQuery(registry)
    const traversal = new GraphTraversal(registry)

    const profiles = query.getProfilesBySystem('tcm')
    if (profiles.length > 0) {
      const profile = profiles[0]
      const vocab = traversal.getTcmVocabulary(profile['@id'])

      expect(vocab).to.have.property('natures')
      expect(vocab).to.have.property('flavors')
      expect(vocab).to.have.property('meridians')
    }
  })
})

describe('GraphIndex with real data', () => {
  it('should build search index', () => {
    const index = new GraphIndex(registry)

    index.buildSearchIndex()
    // If no error thrown, index was built
    expect(true).to.be.true
  })

  it('should search for ginseng', () => {
    const index = new GraphIndex(registry)
    index.buildSearchIndex()

    const results = index.search('ginseng')

    expect(results).to.be.an('array')
  })

  it('should get statistics', () => {
    const index = new GraphIndex(registry)
    const stats = index.getStats()

    expect(stats.totalNodes).to.be.greaterThan(0)
    expect(stats.byType).to.exist
  })
})
})

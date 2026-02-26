/**
 * Integration Tests for Build Pipeline
 *
 * Tests the complete build process from loading to export.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import { GraphBuilder } from '../../../src/graph/GraphBuilder.js'
import { GraphQuery } from '../../../src/graph/api/GraphQuery.js'
import { GraphIndex } from '../../../src/graph/api/GraphIndex.js'
import { GraphTraversal } from '../../../src/graph/api/GraphTraversal.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Build Pipeline Integration', () => {
  const testDataDir = path.join(__dirname, '../../fixtures/build-test')
  const outputDir = path.join(__dirname, '../../fixtures/output')

  before(() => {
    // Create test data directory structure
    fs.mkdirSync(testDataDir, { recursive: true })
    fs.mkdirSync(outputDir, { recursive: true })
  })

  after(() => {
    // Cleanup
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true })
    }
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true })
    }
  })

  describe('GraphBuilder', () => {
    it('should create builder with options', () => {
      const builder = new GraphBuilder({
        dataRoot: testDataDir,
        outputDir: outputDir,
        validate: false,
        verbose: false,
      })
      expect(builder).toBeDefined()
    })

    it('should build empty graph when no data', async () => {
      const builder = new GraphBuilder({
        dataRoot: testDataDir,
        outputDir: outputDir,
        validate: false,
        verbose: false,
      })

      const result = await builder.build()

      expect(result.success).to.be.true
      expect(result.stats.totalNodes).to.equal(0)
    })
  })

  describe('API Integration', () => {
    let builder: GraphBuilder

    beforeEach(async () => {
      builder = new GraphBuilder({
        dataRoot: testDataDir,
        outputDir: outputDir,
        validate: false,
        verbose: false,
      })
      await builder.build()
    })

    it('should provide query access via registry', () => {
      const registry = builder.getRegistry()
      const query = new GraphQuery(registry)

      const stats = registry.getStats()
      expect(stats).toBeDefined()
    })

    it('should provide traversal access via registry', () => {
      const registry = builder.getRegistry()
      const traversal = new GraphTraversal(registry)

      const unresolved = traversal.getUnresolvedReferences()
      expect(unresolved).toBeInstanceOf(Array)
    })

    it('should provide index access via registry', () => {
      const registry = builder.getRegistry()
      const index = new GraphIndex(registry)

      const stats = index.getStats()
      expect(stats).toBeDefined()
    })
  })
})

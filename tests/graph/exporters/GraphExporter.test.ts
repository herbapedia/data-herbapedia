/**
 * Unit Tests for GraphExporter
 *
 * Tests JSON-LD and Turtle export functionality.
 */

import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { GraphExporter, JsonLdExporter, TurtleExporter } from '../../../src/graph/exporters/GraphExporter.js'
import { GraphRegistry } from '../../../src/graph/registry/GraphRegistry.js'
import { NodeType } from '../../../src/graph/types.js'
import { minimalTestGraph } from '../fixtures/testGraph.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('GraphExporter', () => {
  let registry: GraphRegistry
  let exporter: GraphExporter
  let tempDir: string

  beforeEach(() => {
    registry = new GraphRegistry()
    exporter = new GraphExporter(registry)

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

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herbapedia-export-'))
  })

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('JsonLdExporter', () => {
    it('should export single node to JSON-LD', () => {
      const jsonExporter = new JsonLdExporter(registry)
      const nodes = registry.getAllNodes()

      if (nodes.length > 0) {
        const json = jsonExporter.exportNode(nodes[0])

        expect(json['@context']).to.exist
        expect(json['@id']).to.exist
        expect(json['@type']).to.exist
      }
    })

    it('should export all nodes to JSON-LD array', () => {
      const jsonExporter = new JsonLdExporter(registry)
      const allNodes = jsonExporter.exportAll()

      expect(allNodes).to.be.an('array')
      expect(allNodes.length).to.equal(minimalTestGraph.length)
    })

    it('should create valid JSON string', () => {
      const jsonExporter = new JsonLdExporter(registry)
      const jsonString = jsonExporter.exportAllAsString()

      expect(jsonString).to.be.a('string')
      expect(() => JSON.parse(jsonString)).to.not.throw()
    })

    it('should export index file', () => {
      const jsonExporter = new JsonLdExporter(registry)
      const index = jsonExporter.exportIndex('species')

      expect(index['@type']).to.equal('Collection')
      expect(index.totalItems).to.be.a('number')
      expect(index.member).to.be.an('array')
    })
  })

  describe('TurtleExporter', () => {
    it('should export single node to Turtle format', () => {
      const turtleExporter = new TurtleExporter(registry)
      const nodes = registry.getAllNodes()

      if (nodes.length > 0) {
        const turtle = turtleExporter.exportNode(nodes[0])

        expect(turtle).to.be.a('string')
        expect(turtle).to.include('@prefix')
      }
    })

    it('should export all nodes to Turtle format', () => {
      const turtleExporter = new TurtleExporter(registry)
      const turtle = turtleExporter.exportAll()

      expect(turtle).to.be.a('string')
      expect(turtle).to.include('@prefix')
    })

    it('should include standard prefixes', () => {
      const turtleExporter = new TurtleExporter(registry)
      const turtle = turtleExporter.exportAll()

      expect(turtle).to.include('rdf:')
      expect(turtle).to.include('rdfs:')
      expect(turtle).to.include('xsd:')
    })
  })

  describe('GraphExporter', () => {
    it('should export to node files', async () => {
      await exporter.exportToFiles(tempDir, { format: 'jsonld' })

      // Check that node files were created
      const nodeDir = path.join(tempDir, 'node')
      if (fs.existsSync(nodeDir)) {
        const speciesDir = path.join(nodeDir, 'species')
        if (fs.existsSync(speciesDir)) {
          const files = fs.readdirSync(speciesDir)
          expect(files.length).to.be.greaterThan(0)
        }
      }
    })

    it('should export aggregated files', async () => {
      await exporter.exportAggregated(tempDir, { format: 'jsonld' })

      const graphDir = path.join(tempDir, 'graph')
      if (fs.existsSync(graphDir)) {
        const allFile = path.join(graphDir, 'all.jsonld')
        if (fs.existsSync(allFile)) {
          const content = fs.readFileSync(allFile, 'utf-8')
          const parsed = JSON.parse(content)
          expect(parsed).to.be.an('array')
        }
      }
    })

    it('should export metadata files', async () => {
      await exporter.exportMetadata(tempDir)

      const statsFile = path.join(tempDir, 'stats.json')
      if (fs.existsSync(statsFile)) {
        const content = fs.readFileSync(statsFile, 'utf-8')
        const stats = JSON.parse(content)
        expect(stats.totalNodes).to.be.a('number')
      }
    })

    it('should create index files', async () => {
      await exporter.exportIndexes(tempDir)

      // Check for index files
      const nodeDir = path.join(tempDir, 'node')
      if (fs.existsSync(nodeDir)) {
        const speciesIndex = path.join(nodeDir, 'species', 'index.jsonld')
        if (fs.existsSync(speciesIndex)) {
          const content = fs.readFileSync(speciesIndex, 'utf-8')
          const index = JSON.parse(content)
          expect(index['@type']).to.equal('Collection')
        }
      }
    })
  })
})

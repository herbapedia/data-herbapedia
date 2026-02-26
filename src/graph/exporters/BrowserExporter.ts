/**
 * BrowserExporter - Exports browser-compatible artifacts for static site use
 *
 * The GraphBuilder uses Node.js fs module which cannot run in browsers.
 * This exporter creates pre-built artifacts that can be loaded by the
 * browser-compatible BrowserGraphRegistry and BrowserGraphIndex.
 *
 * Output files:
 * - registry.json: All nodes indexed by IRI for fast lookup
 * - relationships.json: Forward and backward reference maps
 * - search-index.json: Pre-built lunr search index
 */

import fs from 'fs'
import path from 'path'
import lunr from 'lunr'
import type { GraphNode, GraphStats, IRIReference } from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'
import { GraphExporter } from './GraphExporter.js'
import { extractSearchableFields } from '../utils/search.js'

/**
 * Browser-compatible node format (optimized for size)
 */
export interface BrowserNode {
  '@id': string
  '@type': string | string[]
  [key: string]: unknown
}

/**
 * Browser-compatible registry format
 */
export interface BrowserRegistry {
  version: string
  buildDate: string
  stats: GraphStats
  nodes: Record<string, BrowserNode>
  slugs: Record<string, string> // slug -> IRI mapping
  types: Record<string, string[]> // type -> IRI[] mapping
}

/**
 * Browser-compatible relationships format
 */
export interface BrowserRelationships {
  version: string
  forward: Record<string, string[]> // node -> nodes it references
  backward: Record<string, string[]> // node -> nodes that reference it
  byRelationship: Record<string, Record<string, string[]>> // relationship -> source -> targets
}

/**
 * Browser-compatible search index format
 */
export interface BrowserSearchIndex {
  version: string
  index: string // Serialized lunr index
  pipeline: string // Serialized pipeline
}

/**
 * BrowserExporter - Exports browser-compatible artifacts
 */
export class BrowserExporter extends GraphExporter {
  async export(): Promise<void> {
    const browserDir = path.join(this.outputDir, 'browser')
    this.ensureDir(browserDir)

    // Export registry
    await this.exportRegistry(browserDir)

    // Export relationships
    await this.exportRelationships(browserDir)

    // Export search index
    await this.exportSearchIndex(browserDir)

    // Export type indexes
    await this.exportTypeIndexes(browserDir)
  }

  /**
   * Export the node registry
   */
  private async exportRegistry(browserDir: string): Promise<void> {
    const registry: BrowserRegistry = {
      version: process.env.npm_package_version || '1.0.0',
      buildDate: new Date().toISOString(),
      stats: this.registry.getStats(),
      nodes: {},
      slugs: {},
      types: {},
    }

    // Process all nodes
    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const iri = node['@id']

      // Add to nodes map
      registry.nodes[iri] = node as BrowserNode

      // Extract slug and add to slugs map
      const slug = this.extractSlug(iri)
      if (slug) {
        registry.slugs[slug] = iri
      }

      // Index by type
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
      for (const type of types) {
        if (!registry.types[type]) {
          registry.types[type] = []
        }
        registry.types[type].push(iri)
      }
    }

    this.writeJsonFile(
      path.join(browserDir, 'registry.json'),
      registry
    )
  }

  /**
   * Export the relationships map
   */
  private async exportRelationships(browserDir: string): Promise<void> {
    const relationships: BrowserRelationships = {
      version: process.env.npm_package_version || '1.0.0',
      forward: {},
      backward: {},
      byRelationship: {},
    }

    const allNodes = this.registry.getAllNodes()

    for (const node of allNodes) {
      const sourceIRI = node['@id']

      // Extract all references from this node
      const refs = this.extractAllReferences(node)

      // Forward references (just the target IRIs)
      relationships.forward[sourceIRI] = refs.map(r => r.targetIRI)

      // Build backward references and relationship index
      for (const { targetIRI, relationship } of refs) {
        // Backward reference
        if (!relationships.backward[targetIRI]) {
          relationships.backward[targetIRI] = []
        }
        if (!relationships.backward[targetIRI].includes(sourceIRI)) {
          relationships.backward[targetIRI].push(sourceIRI)
        }

        // By relationship index
        if (relationship) {
          if (!relationships.byRelationship[relationship]) {
            relationships.byRelationship[relationship] = {}
          }
          if (!relationships.byRelationship[relationship][sourceIRI]) {
            relationships.byRelationship[relationship][sourceIRI] = []
          }
          relationships.byRelationship[relationship][sourceIRI].push(targetIRI)
        }
      }
    }

    this.writeJsonFile(
      path.join(browserDir, 'relationships.json'),
      relationships
    )
  }

  /**
   * Export the pre-built search index
   */
  private async exportSearchIndex(browserDir: string): Promise<void> {
    const allNodes = this.registry.getAllNodes()
    const nodeMap = new Map<string, GraphNode>()

    // Build lunr index
    const searchIndex = lunr(function() {
      this.ref('id')
      this.field('content')
      this.field('name')
      this.field('scientificName')
      this.field('pinyin')
      this.field('sanskritName')
      this.field('slug')
      this.field('family')
      this.field('genus')

      for (const node of allNodes) {
        const iri = node['@id']
        nodeMap.set(iri, node)

        const fields = extractSearchableFields(node)

        this.add({
          id: iri,
          content: Object.values(fields).join(' '),
          name: fields.name || '',
          scientificName: fields.scientificName || '',
          pinyin: fields.pinyin || '',
          sanskritName: fields.sanskritName || '',
          slug: fields.slug || '',
          family: fields.family || '',
          genus: fields.genus || '',
        })
      }
    })

    // Serialize the index
    const serializedIndex = JSON.stringify(searchIndex)

    const searchIndexData: BrowserSearchIndex = {
      version: process.env.npm_package_version || '1.0.0',
      index: serializedIndex,
      pipeline: '', // Pipeline is embedded in the serialized index
    }

    this.writeJsonFile(
      path.join(browserDir, 'search-index.json'),
      searchIndexData
    )
  }

  /**
   * Export type-specific indexes for faster loading
   */
  private async exportTypeIndexes(browserDir: string): Promise<void> {
    // Species index
    const speciesNodes = this.registry.species.getAllAsGraphNodes()
    this.writeJsonFile(
      path.join(browserDir, 'species.json'),
      {
        total: speciesNodes.length,
        nodes: speciesNodes,
      }
    )

    // Preparations index
    const prepNodes = this.registry.preparations.getAllAsGraphNodes()
    this.writeJsonFile(
      path.join(browserDir, 'preparations.json'),
      {
        total: prepNodes.length,
        nodes: prepNodes,
      }
    )

    // TCM profiles index
    const tcmNodes = this.registry.profiles.tcm.getAllAsGraphNodes()
    this.writeJsonFile(
      path.join(browserDir, 'tcm-profiles.json'),
      {
        total: tcmNodes.length,
        nodes: tcmNodes,
      }
    )

    // TCM vocabulary index
    const tcmVocab = [
      ...this.registry.vocabulary.tcm.flavors.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.natures.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.meridians.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.categories.getAllAsGraphNodes(),
    ]
    this.writeJsonFile(
      path.join(browserDir, 'tcm-vocabulary.json'),
      {
        total: tcmVocab.length,
        nodes: tcmVocab,
      }
    )

    // All profiles index
    const allProfiles = [
      ...this.registry.profiles.tcm.getAllAsGraphNodes(),
      ...this.registry.profiles.ayurveda.getAllAsGraphNodes(),
      ...this.registry.profiles.western.getAllAsGraphNodes(),
      ...this.registry.profiles.unani.getAllAsGraphNodes(),
      ...this.registry.profiles.mongolian.getAllAsGraphNodes(),
      ...this.registry.profiles.modern.getAllAsGraphNodes(),
    ]
    this.writeJsonFile(
      path.join(browserDir, 'profiles.json'),
      {
        total: allProfiles.length,
        nodes: allProfiles,
      }
    )
  }

  /**
   * Extract slug from IRI
   */
  private extractSlug(iri: string): string {
    // Handle graph IRI: https://www.herbapedia.org/graph/species/panax-ginseng
    const graphMatch = iri.match(/\/graph\/[^/]+\/(.+)$/)
    if (graphMatch) return graphMatch[1]

    // Handle vocab IRI: https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet
    const vocabMatch = iri.match(/\/graph\/vocab\/[^/]+\/[^/]+\/(.+)$/)
    if (vocabMatch) return vocabMatch[1]

    // Fallback: last segment
    return iri.split('/').pop() || iri
  }

  /**
   * Extract all references from a node with relationship info
   */
  private extractAllReferences(node: GraphNode): Array<{ targetIRI: string; relationship?: string }> {
    const refs: Array<{ targetIRI: string; relationship?: string }> = []
    const nodeObj = node as unknown as Record<string, unknown>

    const extractFromValue = (value: unknown, relationship?: string): void => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (const item of value) {
            extractFromValue(item, relationship)
          }
        } else if ('@id' in value && typeof (value as IRIReference)['@id'] === 'string') {
          refs.push({
            targetIRI: (value as IRIReference)['@id'],
            relationship,
          })
        }
      }
    }

    // Check all properties for @id references
    for (const key of Object.keys(nodeObj)) {
      if (key.startsWith('@')) continue
      extractFromValue(nodeObj[key], key)
    }

    return refs
  }
}

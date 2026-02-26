/**
 * Graph Exporter - Exports the knowledge graph to various formats
 *
 * Supported formats:
 * - JSON-LD (individual nodes and aggregated)
 * - Turtle (RDF)
 * - Index files for each node type
 */

import fs from 'fs'
import path from 'path'
import type { GraphNode, ExportOptions } from '../types.js'
import { GraphRegistry } from '../registry/GraphRegistry.js'

/**
 * Base exporter class
 */
export abstract class GraphExporter {
  protected registry: GraphRegistry
  protected outputDir: string

  constructor(registry: GraphRegistry, outputDir: string) {
    this.registry = registry
    this.outputDir = outputDir
  }

  abstract export(options?: ExportOptions): Promise<void>

  protected ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  protected writeJsonFile(filePath: string, data: unknown, pretty = true): void {
    const content = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)
    fs.writeFileSync(filePath, content + '\n', 'utf-8')
  }
}

/**
 * JSON-LD Exporter - exports to JSON-LD format
 */
export class JsonLdExporter extends GraphExporter {
  async export(options?: ExportOptions): Promise<void> {
    const pretty = options?.pretty ?? true
    const includeContext = options?.includeContext ?? true

    // Export individual nodes by type
    await this.exportNodeDirectories(pretty, includeContext)

    // Export aggregated files
    await this.exportAggregatedFiles(pretty)

    // Export index files
    await this.exportIndexFiles(pretty)

    // Export stats
    await this.exportStats()

    // Export version info
    await this.exportVersion()

    // Export context reference
    await this.exportContext()
  }

  /**
   * Export individual node files organized by type
   */
  private async exportNodeDirectories(pretty: boolean, includeContext: boolean): Promise<void> {
    // Export species
    await this.exportNodeType('node/species', this.registry.species.getAllAsGraphNodes(), pretty, includeContext)

    // Export parts
    await this.exportNodeType('node/part', this.registry.parts.getAllAsGraphNodes(), pretty, includeContext)

    // Export chemicals
    await this.exportNodeType('node/chemical', this.registry.chemicals.getAllAsGraphNodes(), pretty, includeContext)

    // Export preparations
    await this.exportNodeType('node/preparation', this.registry.preparations.getAllAsGraphNodes(), pretty, includeContext)

    // Export formulas
    await this.exportNodeType('node/formula', this.registry.formulas.getAllAsGraphNodes(), pretty, includeContext)

    // Export profiles by system
    await this.exportNodeType('node/profile/tcm', this.registry.profiles.tcm.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/profile/ayurveda', this.registry.profiles.ayurveda.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/profile/western', this.registry.profiles.western.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/profile/unani', this.registry.profiles.unani.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/profile/mongolian', this.registry.profiles.mongolian.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/profile/modern', this.registry.profiles.modern.getAllAsGraphNodes(), pretty, includeContext)

    // Export vocabulary
    await this.exportNodeType('node/vocab/tcm/flavor', this.registry.vocabulary.tcm.flavors.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/tcm/nature', this.registry.vocabulary.tcm.natures.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/tcm/meridian', this.registry.vocabulary.tcm.meridians.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/tcm/category', this.registry.vocabulary.tcm.categories.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/ayurveda/dosha', this.registry.vocabulary.ayurveda.doshas.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/ayurveda/rasa', this.registry.vocabulary.ayurveda.rasas.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/ayurveda/guna', this.registry.vocabulary.ayurveda.gunas.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/ayurveda/virya', this.registry.vocabulary.ayurveda.viryas.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/vocab/ayurveda/vipaka', this.registry.vocabulary.ayurveda.vipakas.getAllAsGraphNodes(), pretty, includeContext)

    // Export sources and images
    await this.exportNodeType('node/source', this.registry.sources.getAllAsGraphNodes(), pretty, includeContext)
    await this.exportNodeType('node/image', this.registry.images.getAllAsGraphNodes(), pretty, includeContext)
  }

  /**
   * Export nodes of a specific type to a directory
   */
  private async exportNodeType(
    subdir: string,
    nodes: GraphNode[],
    pretty: boolean,
    includeContext: boolean
  ): Promise<void> {
    if (nodes.length === 0) return

    const dir = path.join(this.outputDir, subdir)
    this.ensureDir(dir)

    for (const node of nodes) {
      const slug = this.extractSlug(node)
      const filePath = path.join(dir, `${slug}.jsonld`)

      // Optionally remove context for individual nodes (to reduce size)
      const exportNode = includeContext ? node : this.removeContext(node)
      this.writeJsonFile(filePath, exportNode, pretty)
    }
  }

  /**
   * Export aggregated files for each major type
   */
  private async exportAggregatedFiles(pretty: boolean): Promise<void> {
    const graphDir = path.join(this.outputDir, 'graph')
    this.ensureDir(graphDir)

    // All nodes
    const allNodes = this.registry.getAllNodes()
    this.writeJsonFile(
      path.join(graphDir, 'all.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/index.jsonld',
        '@graph': allNodes,
      },
      pretty
    )

    // Species
    this.writeJsonFile(
      path.join(graphDir, 'species.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
        '@graph': this.registry.species.getAllAsGraphNodes(),
      },
      pretty
    )

    // Parts
    this.writeJsonFile(
      path.join(graphDir, 'parts.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
        '@graph': this.registry.parts.getAllAsGraphNodes(),
      },
      pretty
    )

    // Chemicals
    this.writeJsonFile(
      path.join(graphDir, 'chemicals.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
        '@graph': this.registry.chemicals.getAllAsGraphNodes(),
      },
      pretty
    )

    // Preparations
    this.writeJsonFile(
      path.join(graphDir, 'preparations.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/herbal.jsonld',
        '@graph': this.registry.preparations.getAllAsGraphNodes(),
      },
      pretty
    )

    // Formulas
    this.writeJsonFile(
      path.join(graphDir, 'formulas.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/herbal.jsonld',
        '@graph': this.registry.formulas.getAllAsGraphNodes(),
      },
      pretty
    )

    // TCM profiles
    this.writeJsonFile(
      path.join(graphDir, 'tcm-profiles.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/tcm.jsonld',
        '@graph': this.registry.profiles.tcm.getAllAsGraphNodes(),
      },
      pretty
    )

    // Ayurveda profiles
    this.writeJsonFile(
      path.join(graphDir, 'ayurveda-profiles.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/ayurveda.jsonld',
        '@graph': this.registry.profiles.ayurveda.getAllAsGraphNodes(),
      },
      pretty
    )

    // Western profiles
    this.writeJsonFile(
      path.join(graphDir, 'western-profiles.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/western.jsonld',
        '@graph': this.registry.profiles.western.getAllAsGraphNodes(),
      },
      pretty
    )

    // All vocabulary
    const allVocab = [
      ...this.registry.vocabulary.tcm.flavors.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.natures.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.meridians.getAllAsGraphNodes(),
      ...this.registry.vocabulary.tcm.categories.getAllAsGraphNodes(),
      ...this.registry.vocabulary.ayurveda.doshas.getAllAsGraphNodes(),
      ...this.registry.vocabulary.ayurveda.rasas.getAllAsGraphNodes(),
      ...this.registry.vocabulary.ayurveda.gunas.getAllAsGraphNodes(),
      ...this.registry.vocabulary.ayurveda.viryas.getAllAsGraphNodes(),
      ...this.registry.vocabulary.ayurveda.vipakas.getAllAsGraphNodes(),
    ]
    this.writeJsonFile(
      path.join(graphDir, 'vocabulary.jsonld'),
      {
        '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
        '@graph': allVocab,
      },
      pretty
    )
  }

  /**
   * Export index files for each node type
   */
  private async exportIndexFiles(pretty: boolean): Promise<void> {
    // Species index
    await this.exportIndex('node/species', this.registry.species.getAllIRIs(), pretty)

    // Parts index
    await this.exportIndex('node/part', this.registry.parts.getAllIRIs(), pretty)

    // TCM profiles index
    await this.exportIndex('node/profile/tcm', this.registry.profiles.tcm.getAllIRIs(), pretty)

    // Ayurveda profiles index
    await this.exportIndex('node/profile/ayurveda', this.registry.profiles.ayurveda.getAllIRIs(), pretty)

    // Western profiles index
    await this.exportIndex('node/profile/western', this.registry.profiles.western.getAllIRIs(), pretty)

    // Vocabulary indexes
    await this.exportIndex('node/vocab/tcm/flavor', this.registry.vocabulary.tcm.flavors.getAllIRIs(), pretty)
    await this.exportIndex('node/vocab/tcm/nature', this.registry.vocabulary.tcm.natures.getAllIRIs(), pretty)
    await this.exportIndex('node/vocab/tcm/meridian', this.registry.vocabulary.tcm.meridians.getAllIRIs(), pretty)
    await this.exportIndex('node/vocab/tcm/category', this.registry.vocabulary.tcm.categories.getAllIRIs(), pretty)
  }

  /**
   * Export an index file with all IRIs for a node type
   */
  private async exportIndex(subdir: string, iris: string[], pretty: boolean): Promise<void> {
    if (iris.length === 0) return

    const dir = path.join(this.outputDir, subdir)
    this.ensureDir(dir)

    this.writeJsonFile(
      path.join(dir, 'index.jsonld'),
      {
        '@context': 'https://www.w3.org/ns/hydra/context.jsonld',
        '@type': 'Collection',
        totalItems: iris.length,
        member: iris.map(iri => ({ '@id': iri })),
      },
      pretty
    )
  }

  /**
   * Export stats file
   */
  private async exportStats(): Promise<void> {
    const stats = this.registry.getStats()
    this.writeJsonFile(
      path.join(this.outputDir, 'stats.json'),
      stats
    )
  }

  /**
   * Export version file
   */
  private async exportVersion(): Promise<void> {
    const version = {
      version: process.env.npm_package_version || '0.0.0',
      buildDate: new Date().toISOString(),
      nodeTypes: [
        'species',
        'part',
        'chemical',
        'preparation',
        'formula',
        'profile',
        'vocabulary',
        'source',
        'image',
      ],
      medicalSystems: [
        'tcm',
        'ayurveda',
        'western',
        'unani',
        'mongolian',
        'modern',
      ],
      formats: ['jsonld', 'turtle'],
    }
    this.writeJsonFile(
      path.join(this.outputDir, 'version.json'),
      version
    )
  }

  /**
   * Export context reference file
   */
  private async exportContext(): Promise<void> {
    const context = {
      '@context': {
        '@base': 'https://www.herbapedia.org/graph/',
        '@vocab': 'https://www.herbapedia.org/ontology/',
        herbapedia: 'https://www.herbapedia.org/ontology/',
        tcm: 'https://www.herbapedia.org/vocab/tcm/',
        ayurveda: 'https://www.herbapedia.org/vocab/ayurveda/',
        western: 'https://www.herbapedia.org/vocab/western/',
        schema: 'https://schema.org/',
        dwc: 'http://rs.tdwg.org/dwc/terms/',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        skos: 'http://www.w3.org/2004/02/skos/core#',
      },
      '@import': [
        'https://www.herbapedia.org/schema/context/core.jsonld',
        'https://www.herbapedia.org/schema/context/tcm.jsonld',
        'https://www.herbapedia.org/schema/context/ayurveda.jsonld',
        'https://www.herbapedia.org/schema/context/western.jsonld',
      ],
    }
    this.writeJsonFile(
      path.join(this.outputDir, 'context.jsonld'),
      context
    )
  }

  /**
   * Extract slug from node
   */
  private extractSlug(node: GraphNode): string {
    const iri = node['@id']
    return iri.split('/').pop() || iri
  }

  /**
   * Remove context from node (for embedding in aggregated files)
   */
  private removeContext(node: GraphNode): Omit<GraphNode, '@context'> {
    const { ['@context']: _, ...rest } = node
    return rest
  }
}

/**
 * Turtle Exporter - exports to RDF Turtle format
 */
export class TurtleExporter extends GraphExporter {
  async export(options?: ExportOptions): Promise<void> {
    // For Turtle export, we need to convert JSON-LD to Turtle
    // This requires the jsonld-to-turtle library or similar

    const allNodes = this.registry.getAllNodes()
    const graphDir = path.join(this.outputDir, 'graph')
    this.ensureDir(graphDir)

    // Convert to Turtle
    const turtle = this.convertToTurtle(allNodes)

    fs.writeFileSync(
      path.join(graphDir, 'all.ttl'),
      turtle,
      'utf-8'
    )
  }

  private convertToTurtle(nodes: GraphNode[]): string {
    const prefixes: Record<string, string> = {
      herbapedia: 'https://www.herbapedia.org/graph/',
      tcm: 'https://www.herbapedia.org/vocab/tcm/',
      ayurveda: 'https://www.herbapedia.org/vocab/ayurveda/',
      western: 'https://www.herbapedia.org/vocab/western/',
      schema: 'https://schema.org/',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    }

    let turtle = ''

    // Write prefixes
    for (const [prefix, iri] of Object.entries(prefixes)) {
      turtle += `@prefix ${prefix}: <${iri}> .\n`
    }
    turtle += '\n'

    // Write nodes
    for (const node of nodes) {
      turtle += this.nodeToTurtle(node)
      turtle += '\n'
    }

    return turtle
  }

  private nodeToTurtle(node: GraphNode): string {
    const iri = node['@id']
    const lines: string[] = []

    // Subject
    lines.push(`<${iri}>`)

    // Types
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
    for (const type of types) {
      lines.push(`  a <${type}> ;`)
    }

    // Properties
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@')) continue

      const turtleValue = this.valueToTurtle(value)
      if (turtleValue) {
        lines.push(`  ${key} ${turtleValue} ;`)
      }
    }

    // Replace last ; with .
    if (lines.length > 0) {
      const lastIdx = lines.length - 1
      lines[lastIdx] = lines[lastIdx].replace(/ ;$/, ' .')
    }

    return lines.join('\n')
  }

  private valueToTurtle(value: unknown): string | null {
    if (value === null || value === undefined) return null

    if (typeof value === 'string') {
      // Check if it's an IRI
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return `<${value}>`
      }
      // Escape string
      return `"${value.replace(/"/g, '\\"')}"` // TODO: add language tag or datatype
    }

    if (typeof value === 'number') {
      return `"${value}"^^xsd:${Number.isInteger(value) ? 'integer' : 'decimal'}`
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }

    if (typeof value === 'object') {
      if ('@id' in (value as Record<string, unknown>)) {
        return `<${(value as { '@id': string })['@id']}>`
      }
      // For complex objects, serialize as JSON
      return `"${JSON.stringify(value).replace(/"/g, '\\"')}"`
    }

    return null
  }
}

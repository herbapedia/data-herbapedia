/**
 * BrowserGraphRegistry - Browser-compatible registry for the knowledge graph
 *
 * This class loads pre-built registry data exported by BrowserExporter.
 * Unlike the Node.js GraphRegistry, this class:
 * - Does not use fs module
 * - Loads data from JSON files via fetch or import
 * - Provides the same API as GraphRegistry for browser use
 *
 * @example
 * ```typescript
 * import { BrowserGraphRegistry } from '@herbapedia/data/graph-browser'
 *
 * // Load from exported JSON
 * const registry = new BrowserGraphRegistry()
 * await registry.loadFromUrl('/api/v1/browser/registry.json')
 *
 * // Or load from pre-imported data
 * registry.loadData(registryData)
 *
 * // Query nodes
 * const node = registry.getNode('https://www.herbapedia.org/graph/species/panax-ginseng')
 * const nodeBySlug = registry.getBySlug('panax-ginseng')
 * ```
 */

import type { GraphNode, GraphStats, NodeTypeValue } from '../types.js'

/**
 * Browser-compatible node format
 */
export interface BrowserNode {
  '@id': string
  '@type': string | string[]
  [key: string]: unknown
}

/**
 * Browser-compatible registry format (matches BrowserExporter output)
 */
export interface BrowserRegistryData {
  version: string
  buildDate: string
  stats: GraphStats
  nodes: Record<string, BrowserNode>
  slugs: Record<string, string>
  types: Record<string, string[]>
}

/**
 * Browser-compatible relationships format
 */
export interface BrowserRelationshipsData {
  version: string
  forward: Record<string, string[]>
  backward: Record<string, string[]>
  byRelationship: Record<string, Record<string, string[]>>
}

/**
 * Browser-compatible search index format
 */
export interface BrowserSearchIndexData {
  version: string
  index: string
  pipeline: string
}

/**
 * BrowserGraphRegistry - In-memory registry loaded from pre-built JSON
 */
export class BrowserGraphRegistry {
  private nodes: Map<string, GraphNode> = new Map()
  private slugs: Map<string, string> = new Map()
  private types: Map<string, Set<string>> = new Map()
  private stats: GraphStats | null = null
  private version: string = '0.0.0'
  private buildDate: string = ''

  /**
   * Load registry data from a URL
   */
  async loadFromUrl(url: string): Promise<void> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load registry from ${url}: ${response.statusText}`)
    }
    const data: BrowserRegistryData = await response.json()
    this.loadData(data)
  }

  /**
   * Load registry data directly
   */
  loadData(data: BrowserRegistryData): void {
    this.version = data.version
    this.buildDate = data.buildDate
    this.stats = data.stats

    // Load nodes
    this.nodes.clear()
    this.slugs.clear()
    this.types.clear()

    for (const [iri, node] of Object.entries(data.nodes)) {
      this.nodes.set(iri, node as GraphNode)
    }

    // Load slug mappings
    for (const [slug, iri] of Object.entries(data.slugs)) {
      this.slugs.set(slug, iri)
    }

    // Load type mappings
    for (const [type, iris] of Object.entries(data.types)) {
      this.types.set(type, new Set(iris))
    }
  }

  /**
   * Get a node by its IRI
   */
  getNode(iri: string): GraphNode | undefined {
    return this.nodes.get(iri)
  }

  /**
   * Get a node by its slug
   */
  getBySlug(slug: string): GraphNode | undefined {
    const iri = this.slugs.get(slug)
    if (!iri) return undefined
    return this.nodes.get(iri)
  }

  /**
   * Get the IRI for a slug
   */
  getIRIBySlug(slug: string): string | undefined {
    return this.slugs.get(slug)
  }

  /**
   * Check if a node exists
   */
  hasNode(iri: string): boolean {
    return this.nodes.has(iri)
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get all IRIs
   */
  getAllIRIs(): string[] {
    return Array.from(this.nodes.keys())
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: string): GraphNode[] {
    const iris = this.types.get(type)
    if (!iris) return []
    return Array.from(iris)
      .map(iri => this.nodes.get(iri))
      .filter((node): node is GraphNode => node !== undefined)
  }

  /**
   * Get all slugs
   */
  getAllSlugs(): string[] {
    return Array.from(this.slugs.keys())
  }

  /**
   * Get statistics
   */
  getStats(): GraphStats {
    return this.stats || {
      totalNodes: this.nodes.size,
      byType: {},
      lastUpdated: this.buildDate,
      buildVersion: this.version,
      validation: { errors: 0, warnings: 0 },
    }
  }

  /**
   * Get version
   */
  getVersion(): string {
    return this.version
  }

  /**
   * Get build date
   */
  getBuildDate(): string {
    return this.buildDate
  }

  /**
   * Get total node count
   */
  get count(): number {
    return this.nodes.size
  }
}

/**
 * Create and initialize a registry from URL
 */
export async function createRegistry(url: string): Promise<BrowserGraphRegistry> {
  const registry = new BrowserGraphRegistry()
  await registry.loadFromUrl(url)
  return registry
}

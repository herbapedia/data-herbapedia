/**
 * GraphNode - Abstract base class for all knowledge graph nodes
 *
 * Design principles:
 * 1. Each node has a unique canonical @id (IRI)
 * 2. Relationships are @id references, not embedded objects
 * 3. Nodes are immutable after creation (use builders for construction)
 * 4. All nodes can serialize to JSON-LD
 */

import type { LanguageMap, IRIReference, NodeTypeValue } from '../types.js'
import { generateIRI } from '../types.js'

/**
 * Abstract base class for all graph nodes
 */
export abstract class GraphNodeBase {
  readonly '@context': string | string[]
  readonly '@id': string
  readonly '@type': string[]

  protected constructor(
    context: string | string[],
    id: string,
    types: string | string[]
  ) {
    this['@context'] = context
    this['@id'] = id
    this['@type'] = Array.isArray(types) ? types : [types]
  }

  /**
   * Serialize to JSON-LD object
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      '@context': this['@context'],
      '@id': this['@id'],
      '@type': this['@type'],
    }

    // Add all own properties except internal ones
    for (const [key, value] of Object.entries(this)) {
      if (key.startsWith('@') || key.startsWith('_')) continue
      if (value !== undefined && value !== null) {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Serialize to JSON string
   */
  toString(pretty = true): string {
    return JSON.stringify(this.toJSON(), null, pretty ? 2 : 0)
  }
}

/**
 * Helper to create language map
 */
export function lang(entries: Record<string, string>): LanguageMap {
  return entries
}

/**
 * Helper to create IRI reference
 */
export function ref(iri: string): IRIReference {
  return { '@id': iri }
}

/**
 * Helper to create IRI references from slugs
 */
export function refs(slugs: string[], nodeType: NodeTypeValue): IRIReference[] {
  return slugs.map(slug => ref(generateIRI(nodeType, slug)))
}

// Re-export types for convenience
export type { LanguageMap, IRIReference }

/**
 * Exporter Plugin Interface
 *
 * Allows custom serialization formats to be plugged into the Herbapedia export system.
 *
 * @example
 * ```typescript
 * import { ExporterPlugin, ExportContext } from '@herbapedia/data'
 * import YAML from 'yaml'
 *
 * const yamlExporter: ExporterPlugin = {
 *   name: 'yaml-exporter',
 *   version: '1.0.0',
 *   format: 'yaml',
 *   fileExtension: '.yaml',
 *   mimeType: 'application/x-yaml',
 *   description: 'Exports entities to YAML format',
 *
 *   serialize: (entity, context) => {
 *     return YAML.stringify(entity)
 *   },
 *
 *   deserialize: (content, context) => {
 *     return YAML.parse(content)
 *   }
 * }
 * ```
 *
 * @example Custom CSV exporter
 * ```typescript
 * const csvExporter: ExporterPlugin = {
 *   name: 'csv-exporter',
 *   version: '1.0.0',
 *   format: 'csv',
 *   fileExtension: '.csv',
 *   mimeType: 'text/csv',
 *
 *   serialize: (entity, context) => {
 *     // Flatten entity to CSV
 *     const rows = []
 *     rows.push(['@id', '@type', 'name'])
 *     rows.push([entity['@id'], entity['@type']?.join(';'), entity.name?.en || ''])
 *     return rows.map(r => r.join(',')).join('\n')
 *   }
 * }
 * ```
 */

import type { Entity } from '../types/core'
import type { PluginMetadata, PluginContext } from './types'

/**
 * Context for export operations.
 */
export interface ExportContext extends PluginContext {
  /** Output format */
  format: string
  /** Whether to include context */
  includeContext?: boolean
  /** Whether to pretty-print */
  pretty?: boolean
  /** Custom serialization options */
  options?: Record<string, unknown>
}

/**
 * Result from serialization.
 */
export interface SerializeResult {
  /** Serialized content */
  content: string | Buffer
  /** Content type */
  mimeType: string
  /** Character encoding (for text) */
  encoding?: string
}

/**
 * Result from deserialization.
 */
export interface DeserializeResult {
  /** Deserialized entity */
  entity: Entity
  /** Any warnings during deserialization */
  warnings?: string[]
}

/**
 * Exporter plugin interface.
 */
export interface ExporterPlugin extends PluginMetadata {
  /** Format identifier (e.g., 'json', 'yaml', 'turtle') */
  format: string
  /** File extension including dot (e.g., '.json', '.yaml') */
  fileExtension: string
  /** MIME type for this format */
  mimeType: string

  /**
   * Serialize an entity to this format.
   */
  serialize(entity: Entity, context: ExportContext): string | Buffer | SerializeResult

  /**
   * Optional: Deserialize content back to entity.
   */
  deserialize?(content: string | Buffer, context: ExportContext): Entity | DeserializeResult

  /**
   * Optional: Serialize multiple entities.
   */
  serializeBatch?(entities: Entity[], context: ExportContext): string | Buffer | SerializeResult

  /**
   * Optional: Check if this exporter can handle a given format.
   */
  canHandle?(format: string): boolean

  /**
   * Optional: Get file path for an entity.
   */
  getFilePath?(entity: Entity, basePath: string): string
}

/**
 * Base exporter plugin with common functionality.
 */
export abstract class BaseExporterPlugin implements ExporterPlugin {
  abstract name: string
  abstract version: string
  abstract format: string
  abstract fileExtension: string
  abstract mimeType: string
  description?: string

  abstract serialize(entity: Entity, context: ExportContext): string | Buffer | SerializeResult

  /**
   * Default: can handle exact format match or aliases.
   */
  canHandle(format: string): boolean {
    return format.toLowerCase() === this.format.toLowerCase()
  }

  /**
   * Default: uses slug from @id.
   */
  getFilePath(entity: Entity, basePath: string): string {
    const slug = this.extractSlug(entity)
    return `${basePath}/${slug}${this.fileExtension}`
  }

  /**
   * Extract slug from entity @id.
   */
  protected extractSlug(entity: Entity): string {
    const id = entity['@id'] || ''
    const parts = id.split('/')
    return parts[parts.length - 1] || 'unknown'
  }
}

/**
 * Built-in JSON-LD exporter.
 */
export const jsonldExporter: ExporterPlugin = {
  name: 'jsonld-exporter',
  version: '1.0.0',
  format: 'jsonld',
  fileExtension: '.jsonld',
  mimeType: 'application/ld+json',
  description: 'Exports entities to JSON-LD format',

  serialize(entity: Entity, context: ExportContext): string {
    const indent = context.pretty ? 2 : 0
    return JSON.stringify(entity, null, indent)
  },

  deserialize(content: string, _context: ExportContext): Entity {
    return JSON.parse(content) as Entity
  },

  canHandle(format: string): boolean {
    const aliases = ['jsonld', 'json-ld', 'json']
    return aliases.includes(format.toLowerCase())
  },
}

/**
 * Built-in Turtle (RDF) exporter.
 * Note: This is a minimal implementation. For full RDF support, use a dedicated library.
 */
export const turtleExporter: ExporterPlugin = {
  name: 'turtle-exporter',
  version: '1.0.0',
  format: 'turtle',
  fileExtension: '.ttl',
  mimeType: 'text/turtle',
  description: 'Exports entities to Turtle RDF format',

  serialize(entity: Entity, _context: ExportContext): string {
    const lines: string[] = []

    // Simple Turtle serialization
    lines.push('@prefix herbapedia: <https://www.herbapedia.org/vocab/core/> .')
    lines.push('@prefix schema: <https://schema.org/> .')
    lines.push('')

    // Subject
    const subject = entity['@id']?.startsWith('http') ? `<${entity['@id']}>` : entity['@id']
    lines.push(`${subject}`)

    // Types
    if (entity['@type']) {
      const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]
      lines.push(`  a ${types.map(t => `<${t}>`).join(', ')} ;`)
    }

    // Simple properties
    if (entity.name) {
      const name = typeof entity.name === 'string' ? entity.name : entity.name['en'] || Object.values(entity.name)[0]
      lines.push(`  schema:name "${escapeTurtleString(name as string)}" ;`)
    }

    if (entity.description) {
      const desc = typeof entity.description === 'string' ? entity.description : entity.description['en'] || ''
      lines.push(`  schema:description "${escapeTurtleString(desc as string)}" ;`)
    }

    // End with period
    const lastLine = lines[lines.length - 1]
    if (lastLine?.endsWith(';')) {
      lines[lines.length - 1] = lastLine.slice(0, -1) + '.'
    }

    return lines.join('\n')
  },

  canHandle(format: string): boolean {
    const aliases = ['turtle', 'ttl', 'rdf-turtle']
    return aliases.includes(format.toLowerCase())
  },
}

/**
 * Escape special characters for Turtle strings.
 */
function escapeTurtleString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Built-in CSV exporter for simple tabular export.
 * Extracts name values dynamically from LanguageMap without hardcoding locales.
 */
export const csvExporter: ExporterPlugin = {
  name: 'csv-exporter',
  version: '1.0.0',
  format: 'csv',
  fileExtension: '.csv',
  mimeType: 'text/csv',
  description: 'Exports entities to CSV format (simplified)',

  serialize(entity: Entity, _context: ExportContext): string {
    // Extract name values dynamically from LanguageMap
    const extractNameValues = (name: unknown): string[] => {
      if (!name) return ['']
      if (typeof name === 'string') return [name]
      if (typeof name === 'object' && name !== null) {
        // Get all available locales and their values
        const langMap = name as Record<string, string>
        const locales = Object.keys(langMap).sort() // Sort for consistency
        return locales.map(locale => langMap[locale] || '')
      }
      return ['']
    }

    // Collect all unique locales from all entities for header
    const allLocales = new Set<string>()
    if (entity.name && typeof entity.name === 'object') {
      Object.keys(entity.name).forEach(l => allLocales.add(l))
    }

    const sortedLocales = Array.from(allLocales).sort()
    const localeHeaders = sortedLocales.map(l => `name_${l}`)

    // Build header
    const header = ['@id', '@type', ...localeHeaders]

    // Build row
    const nameValues: Record<string, string> = {}
    if (entity.name && typeof entity.name === 'object') {
      const langMap = entity.name as Record<string, string>
      for (const locale of sortedLocales) {
        nameValues[locale] = langMap[locale] || ''
      }
    }

    const row = [
      entity['@id'] || '',
      Array.isArray(entity['@type']) ? entity['@type'].join(';') : entity['@type'] || '',
      ...sortedLocales.map(l => nameValues[l] || ''),
    ]

    return [header, row]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  },

  serializeBatch(entities: Entity[], _context: ExportContext): string {
    // Collect all unique locales from all entities for header
    const allLocales = new Set<string>()
    for (const entity of entities) {
      if (entity.name && typeof entity.name === 'object') {
        Object.keys(entity.name).forEach(l => allLocales.add(l))
      }
    }

    const sortedLocales = Array.from(allLocales).sort()
    const localeHeaders = sortedLocales.map(l => `name_${l}`)

    // Build header
    const header = ['@id', '@type', ...localeHeaders]

    // Build rows
    const rows: string[][] = [header]

    for (const entity of entities) {
      const nameValues: Record<string, string> = {}
      if (entity.name && typeof entity.name === 'object') {
        const langMap = entity.name as Record<string, string>
        for (const locale of sortedLocales) {
          nameValues[locale] = langMap[locale] || ''
        }
      }

      rows.push([
        entity['@id'] || '',
        Array.isArray(entity['@type']) ? entity['@type'].join(';') : entity['@type'] || '',
        ...sortedLocales.map(l => nameValues[l] || ''),
      ])
    }

    return rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  },

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'csv'
  },
}

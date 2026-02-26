/**
 * Shared utility functions for the knowledge graph
 *
 * These utilities are used across multiple modules to avoid code duplication.
 */

import type { GraphNode } from '../types.js'

/**
 * Extract searchable text fields from a graph node
 *
 * This function is used by GraphIndex, BrowserGraphIndex, and BrowserExporter
 * to build search indexes.
 *
 * @param node - The graph node to extract fields from
 * @returns A record of field names to searchable text
 */
export function extractSearchableFields(node: GraphNode): Record<string, string> {
  const fields: Record<string, string> = {}
  const nodeData = node as unknown as Record<string, unknown>

  // Always include slug
  if (typeof nodeData.slug === 'string') {
    fields.slug = nodeData.slug
  }

  // Extract text from language maps
  const extractFromLangMap = (value: unknown): string => {
    if (typeof value === 'object' && value !== null) {
      const langMap = value as Record<string, string>
      return Object.values(langMap).join(' ')
    }
    if (typeof value === 'string') {
      return value
    }
    return ''
  }

  // Common fields to search
  const searchableFields = [
    'name',
    'scientificName',
    'pinyin',
    'sanskritName',
    'description',
    'tcmFunctions',
    'tcmTraditionalUsage',
    'ayurvedaTraditionalUsage',
    'westernTraditionalUsage',
    'modernTraditionalUsage',
    'family',
    'genus',
    'value',
    'prefLabel',
    'casNumber',
    'formula',
  ]

  for (const field of searchableFields) {
    const value = nodeData[field]
    if (value !== undefined && value !== null) {
      const text = extractFromLangMap(value)
      if (text) {
        fields[field] = text
      }
    }
  }

  return fields
}

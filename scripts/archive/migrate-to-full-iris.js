#!/usr/bin/env node
/**
 * Migrate all Herbapedia entities from relative IRIs to full IRIs.
 *
 * ROOT IRI: https://www.herbapedia.org/
 *
 * Migration Rules:
 * - botanical/species/{slug} -> https://www.herbapedia.org/entity/botanical/species/{slug}
 * - botanical/part/{slug} -> https://www.herbapedia.org/entity/botanical/part/{slug}
 * - botanical/chemical/{slug} -> https://www.herbapedia.org/entity/botanical/chemical/{slug}
 * - botanical/profile/{slug} -> https://www.herbapedia.org/entity/botanical/profile/{slug}
 * - botanical/barcode/{slug} -> https://www.herbapedia.org/entity/botanical/barcode/{slug}
 * - preparation/{slug} -> https://www.herbapedia.org/entity/preparation/{slug}
 * - formula/{slug} -> https://www.herbapedia.org/entity/formula/{slug}
 * - sources/zoological/{slug} -> https://www.herbapedia.org/entity/sources/zoological/{slug}
 * - tcm/{slug} -> https://www.herbapedia.org/system/tcm/profile/{slug}
 * - tcm/profile/{slug} -> https://www.herbapedia.org/system/tcm/profile/{slug}
 * - tcm/category/{value} -> https://www.herbapedia.org/system/tcm/category/{value}
 * - tcm/nature/{value} -> https://www.herbapedia.org/system/tcm/nature/{value}
 * - tcm/flavor/{value} -> https://www.herbapedia.org/system/tcm/flavor/{value}
 * - tcm/meridian/{value} -> https://www.herbapedia.org/system/tcm/meridian/{value}
 * - western/{slug} -> https://www.herbapedia.org/system/western/profile/{slug}
 * - western/profile/{slug} -> https://www.herbapedia.org/system/western/profile/{slug}
 * - western/action/{value} -> https://www.herbapedia.org/system/western/action/{value}
 * - western/organ/{value} -> https://www.herbapedia.org/system/western/organ/{value}
 * - ayurveda/{slug} -> https://www.herbapedia.org/system/ayurveda/profile/{slug}
 * - nature/{value} -> https://www.herbapedia.org/system/tcm/nature/{value}
 * - flavor/{value} -> https://www.herbapedia.org/system/tcm/flavor/{value}
 * - meridian/{value} -> https://www.herbapedia.org/system/tcm/meridian/{value}
 * - category/{value} -> https://www.herbapedia.org/system/tcm/category/{value}
 * - plant/{slug} -> https://www.herbapedia.org/entity/botanical/species/{slug}
 *
 * Usage:
 *   node scripts/migrate-to-full-iris.js           # Dry run
 *   node scripts/migrate-to-full-iris.js --apply   # Apply changes
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const APPLY = process.argv.includes('--apply')
const NEW_BASE = 'https://www.herbapedia.org/'

// IRI prefix mappings (order matters - more specific first)
const IRI_MAPPINGS = [
  // Botanical entities (specific patterns first)
  ['botanical/species/', 'entity/botanical/species/'],
  ['botanical/part/', 'entity/botanical/part/'],
  ['botanical/chemical/', 'entity/botanical/chemical/'],
  ['botanical/profile/', 'entity/botanical/profile/'],
  ['botanical/barcode/', 'entity/botanical/barcode/'],

  // Source materials
  ['sources/zoological/', 'entity/sources/zoological/'],
  ['sources/mineral/', 'entity/sources/mineral/'],
  ['sources/chemical/', 'entity/sources/chemical/'],

  // Preparations and formulas
  ['preparation/', 'entity/preparation/'],
  ['formula/', 'entity/formula/'],

  // TCM (specific patterns first)
  ['tcm/profile/', 'system/tcm/profile/'],
  ['tcm/category/', 'system/tcm/category/'],
  ['tcm/nature/', 'system/tcm/nature/'],
  ['tcm/flavor/', 'system/tcm/flavor/'],
  ['tcm/meridian/', 'system/tcm/meridian/'],
  ['tcm/', 'system/tcm/profile/'],

  // Western (specific patterns first)
  ['western/profile/', 'system/western/profile/'],
  ['western/action/', 'system/western/action/'],
  ['western/organ/', 'system/western/organ/'],
  ['western/', 'system/western/profile/'],

  // Ayurveda
  ['ayurveda/profile/', 'system/ayurveda/profile/'],
  ['ayurveda/', 'system/ayurveda/profile/'],

  // Persian
  ['persian/profile/', 'system/persian/profile/'],
  ['persian/', 'system/persian/profile/'],

  // Mongolian
  ['mongolian/profile/', 'system/mongolian/profile/'],
  ['mongolian/', 'system/mongolian/profile/'],

  // Reference data (TCM)
  ['nature/', 'system/tcm/nature/'],
  ['flavor/', 'system/tcm/flavor/'],
  ['meridian/', 'system/tcm/meridian/'],
  ['category/', 'system/tcm/category/'],

  // Legacy plant pattern
  ['plant/', 'entity/botanical/species/'],
]

/**
 * Migrate a single IRI from relative to full.
 */
function migrateIRI(iri) {
  if (!iri || typeof iri !== 'string') return iri

  // Already a full IRI
  if (iri.startsWith('http://') || iri.startsWith('https://')) {
    // Update old base to new base
    return iri.replace('https://herbapedia.org/', NEW_BASE)
  }

  // Skip JSON-LD keywords
  if (iri.startsWith('@')) return iri

  // Skip vocab prefixes (ending with : or #)
  if (iri.match(/^[a-z]+:/i) && !iri.includes('/')) return iri

  // Apply mappings
  for (const [oldPrefix, newPath] of IRI_MAPPINGS) {
    if (iri.startsWith(oldPrefix)) {
      return NEW_BASE + newPath + iri.slice(oldPrefix.length)
    }
  }

  // Default: treat as entity
  return NEW_BASE + 'entity/' + iri
}

/**
 * Recursively migrate all @id values in an object.
 */
function migrateObject(obj, path = '') {
  if (Array.isArray(obj)) {
    return obj.map((item, i) => migrateObject(item, `${path}[${i}]`))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key

      if (key === '@id' && typeof value === 'string') {
        result[key] = migrateIRI(value)
      } else if (key === '@context' && typeof value === 'string') {
        // Update context reference to full URL
        if (value.includes('schema/context/')) {
          result[key] = value.replace(
            /.*schema\/context\//,
            NEW_BASE + 'schema/context/'
          )
        } else {
          result[key] = value
        }
      } else {
        result[key] = migrateObject(value, newPath)
      }
    }
    return result
  }

  return obj
}

/**
 * Count IRIs that need migration.
 */
function countMigrations(obj, counts = { total: 0, migrated: 0, unchanged: 0 }) {
  if (Array.isArray(obj)) {
    obj.forEach(item => countMigrations(item, counts))
    return counts
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '@id' && typeof value === 'string') {
        counts.total++
        const migrated = migrateIRI(value)
        if (migrated !== value) {
          counts.migrated++
        } else {
          counts.unchanged++
        }
      } else if (typeof value === 'object') {
        countMigrations(value, counts)
      }
    }
  }

  return counts
}

/**
 * Find all JSON-LD files in a directory.
 */
function findJsonLdFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      findJsonLdFiles(fullPath, files)
    } else if (entry.endsWith('.jsonld')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Migrate a single file.
 */
function migrateFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8')
  const json = JSON.parse(content)

  // Count migrations before
  const beforeCounts = countMigrations(json)

  // Migrate
  const migrated = migrateObject(json)

  // Count migrations after
  const afterIRIs = []
  function collectIRIs(obj) {
    if (Array.isArray(obj)) return obj.forEach(collectIRIs)
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (key === '@id' && typeof value === 'string') {
          afterIRIs.push(value)
        } else {
          collectIRIs(value)
        }
      }
    }
  }
  collectIRIs(migrated)

  const changed = beforeCounts.migrated > 0

  return {
    filepath,
    changed,
    beforeCounts,
    migrated,
    afterIRIs,
  }
}

async function main() {
  console.log('==============================================')
  console.log('  Herbapedia IRI Migration')
  console.log('==============================================')
  console.log()
  console.log(`Mode: ${APPLY ? 'APPLY CHANGES' : 'DRY RUN'}`)
  console.log(`New Base IRI: ${NEW_BASE}`)
  console.log()

  // Find all JSON-LD files (exclude context files - they need manual fixes)
  const dirs = [
    path.join(ROOT_DIR, 'entities'),
    path.join(ROOT_DIR, 'systems'),
    path.join(ROOT_DIR, 'profiles'),
  ]

  let allFiles = []
  for (const dir of dirs) {
    allFiles = allFiles.concat(findJsonLdFiles(dir))
  }

  // Remove duplicates
  allFiles = [...new Set(allFiles)]

  console.log(`Found ${allFiles.length} JSON-LD files to process`)
  console.log()

  // Process files
  const stats = {
    total: 0,
    changed: 0,
    unchanged: 0,
    errors: 0,
  }

  const samples = []

  for (const filepath of allFiles) {
    try {
      const result = migrateFile(filepath)
      stats.total++

      if (result.changed) {
        stats.changed++

        // Collect samples
        if (samples.length < 5) {
          samples.push({
            file: filepath.replace(ROOT_DIR, '.'),
            before: result.beforeCounts.migrated,
          })
        }

        if (APPLY) {
          fs.writeFileSync(filepath, JSON.stringify(result.migrated, null, 2))
          console.log(`✓ Migrated: ${filepath.replace(ROOT_DIR, '.')}`)
        }
      } else {
        stats.unchanged++
      }
    } catch (error) {
      stats.errors++
      console.error(`✗ Error: ${filepath.replace(ROOT_DIR, '.')} - ${error.message}`)
    }
  }

  console.log()
  console.log('==============================================')
  console.log('  Migration Summary')
  console.log('==============================================')
  console.log()
  console.log(`Total files:      ${stats.total}`)
  console.log(`Files changed:    ${stats.changed}`)
  console.log(`Files unchanged:  ${stats.unchanged}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log()

  if (samples.length > 0) {
    console.log('Sample migrations:')
    for (const sample of samples) {
      console.log(`  ${sample.file} (${sample.before} IRIs)`)
    }
    console.log()
  }

  if (!APPLY) {
    console.log('Run with --apply to apply changes.')
  }
}

main().catch(console.error)

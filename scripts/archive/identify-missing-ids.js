#!/usr/bin/env node
/**
 * Identify species missing external IDs (Wikidata, GBIF, NCBI).
 *
 * This script scans all PlantSpecies entities and reports those missing
 * important external identifiers for data integration.
 *
 * Usage:
 *   node scripts/identify-missing-ids.js [--format json|table]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const FORMAT = process.argv.includes('--format=json') ? 'json' : 'table'

/**
 * @typedef {Object} SpeciesIdStatus
 * @property {string} slug
 * @property {string} name
 * @property {string|null} scientificName
 * @property {boolean} hasGbifID
 * @property {boolean} hasWikidataID
 * @property {boolean} hasNcbiID
 * @property {number} missingCount
 */

async function main() {
  /** @type {SpeciesIdStatus[]} */
  const speciesStatus = []

  const speciesDirs = fs.readdirSync(SPECIES_DIR)
    .filter(name => fs.statSync(path.join(SPECIES_DIR, name)).isDirectory())

  for (const slug of speciesDirs) {
    const entityFile = path.join(SPECIES_DIR, slug, 'entity.jsonld')
    if (!fs.existsSync(entityFile)) continue

    try {
      const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))

      const hasGbifID = !!data.gbifID
      const hasWikidataID = !!data.wikidataID
      const hasNcbiID = !!data.ncbiTaxonID
      const missingCount = [hasGbifID, hasWikidataID, hasNcbiID].filter(x => !x).length

      speciesStatus.push({
        slug,
        name: data.name?.en || slug,
        scientificName: data.scientificName || null,
        hasGbifID,
        hasWikidataID,
        hasNcbiID,
        missingCount
      })
    } catch (e) {
      // Skip unparseable files
    }
  }

  // Sort by missing count (most missing first)
  speciesStatus.sort((a, b) => b.missingCount - a.missingCount)

  // Filter to species missing at least one ID
  const missingIds = speciesStatus.filter(s => s.missingCount > 0)

  if (FORMAT === 'json') {
    console.log(JSON.stringify(missingIds, null, 2))
    return
  }

  // Table output
  console.log('=== Identifying Species Missing External IDs ===')
  console.log()

  // Table output
  console.log(`Total species: ${speciesStatus.length}`)
  console.log(`Species with all IDs: ${speciesStatus.length - missingIds.length}`)
  console.log(`Species missing IDs: ${missingIds.length}\n`)

  // Summary by missing type
  const missingGbif = missingIds.filter(s => !s.hasGbifID).length
  const missingWikidata = missingIds.filter(s => !s.hasWikidataID).length
  const missingNcbi = missingIds.filter(s => !s.hasNcbiID).length

  console.log('--- Summary by ID Type ---')
  console.log(`Missing GBIF ID: ${missingGbif}`)
  console.log(`Missing Wikidata ID: ${missingWikidata}`)
  console.log(`Missing NCBI Taxon ID: ${missingNcbi}\n`)

  // Show species missing all IDs
  const missingAll = missingIds.filter(s => s.missingCount === 3)
  if (missingAll.length > 0) {
    console.log('--- Species Missing ALL IDs ---\n')
    for (const s of missingAll) {
      console.log(`  ${s.slug}`)
      console.log(`    Name: ${s.name}`)
      console.log(`    Scientific: ${s.scientificName || 'N/A'}`)
    }
    console.log()
  }

  // Show species missing GBIF ID (high priority)
  const missingGbifOnly = missingIds.filter(s => !s.hasGbifID && s.missingCount < 3)
  if (missingGbifOnly.length > 0) {
    console.log('--- Species Missing GBIF ID (High Priority) ---\n')
    const toShow = missingGbifOnly.slice(0, 20)
    for (const s of toShow) {
      console.log(`  ${s.slug}: ${s.scientificName || s.name}`)
      console.log(`    Has Wikidata: ${s.hasWikidataID ? 'Yes' : 'No'}`)
    }
    if (missingGbifOnly.length > 20) {
      console.log(`  ... and ${missingGbifOnly.length - 20} more`)
    }
    console.log()
  }

  // Recommendations
  console.log('--- Recommendations ---')
  console.log('1. Use scripts/link-gbif.js to auto-link GBIF IDs')
  console.log('2. Use scripts/link-wikidata.js to auto-link Wikidata IDs')
  console.log('3. For NCBI IDs, query the NCBI Taxonomy database')
  console.log('4. Species missing all IDs should be prioritized for manual review')

  // Output counts for scripts
  console.log('\n--- Stats ---')
  console.log(JSON.stringify({
    total: speciesStatus.length,
    complete: speciesStatus.length - missingIds.length,
    missingGbif,
    missingWikidata,
    missingNcbi,
    missingAll: missingAll.length
  }))
}

main().catch(console.error)

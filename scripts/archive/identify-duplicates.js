#!/usr/bin/env node
/**
 * Identify duplicate species entries in the Herbapedia dataset.
 *
 * This script scans all PlantSpecies entities and identifies potential
 * duplicates based on:
 * 1. Exact scientificName match
 * 2. Similar slug patterns (e.g., ginger vs zingiber-officinale)
 *
 * Usage:
 *   node scripts/identify-duplicates.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')

/**
 * @typedef {Object} SpeciesInfo
 * @property {string} slug
 * @property {string|null} scientificName
 * @property {string|null} commonName
 * @property {string|number|null} gbifID
 * @property {string|null} wikidataID
 */

async function main() {
  console.log('=== Identifying Duplicate Species Entries ===\n')

  // Load all species data
  const speciesList = []

  const speciesDirs = fs.readdirSync(SPECIES_DIR)
    .filter(name => fs.statSync(path.join(SPECIES_DIR, name)).isDirectory())

  for (const slug of speciesDirs) {
    const entityFile = path.join(SPECIES_DIR, slug, 'entity.jsonld')
    if (!fs.existsSync(entityFile)) continue

    try {
      const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))
      speciesList.push({
        slug,
        scientificName: data.scientificName || null,
        commonName: data.name?.en || null,
        gbifID: data.gbifID || null,
        wikidataID: data.wikidataID || null
      })
    } catch (e) {
      console.log(`  WARNING: Could not parse ${entityFile}`)
    }
  }

  console.log(`Loaded ${speciesList.length} species\n`)

  // Group by scientific name
  const byScientificName = new Map()

  for (const species of speciesList) {
    if (species.scientificName) {
      const key = species.scientificName.toLowerCase().trim()
      if (!byScientificName.has(key)) {
        byScientificName.set(key, [])
      }
      byScientificName.get(key).push(species)
    }
  }

  // Find duplicates by scientific name
  console.log('--- Duplicates by Scientific Name ---\n')

  let duplicateGroups = 0
  for (const [name, species] of byScientificName) {
    if (species.length > 1) {
      duplicateGroups++
      console.log(`Scientific Name: ${name}`)
      for (const s of species) {
        console.log(`  - ${s.slug} (GBIF: ${s.gbifID || 'N/A'}, WD: ${s.wikidataID || 'N/A'})`)
      }
      console.log()
    }
  }

  if (duplicateGroups === 0) {
    console.log('No duplicates found by scientific name.\n')
  }

  // Find potential duplicates by slug pattern
  console.log('--- Potential Duplicates by Slug Pattern ---\n')

  // Common patterns: common-name vs scientific-name
  const potentialPairs = []

  for (let i = 0; i < speciesList.length; i++) {
    for (let j = i + 1; j < speciesList.length; j++) {
      const a = speciesList[i]
      const b = speciesList[j]

      // Check if one slug might be the scientific name of the other
      if (a.scientificName && b.scientificName) {
        // Skip if they have the same scientific name (already reported)
        if (a.scientificName.toLowerCase() === b.scientificName.toLowerCase()) {
          continue
        }
      }

      // Check for common name vs scientific name patterns
      const aParts = a.slug.split('-')
      const bParts = b.slug.split('-')

      // Pattern: "ginger" vs "zingiber-officinale" (common vs scientific)
      if (a.scientificName) {
        const sciParts = a.scientificName.toLowerCase().split(' ')
        if (sciParts.length === 2) {
          const genusSpecies = `${sciParts[0]}-${sciParts[1]}`
          if (b.slug === genusSpecies) {
            potentialPairs.push([a, b, 'common vs scientific name'])
          }
        }
      }
      if (b.scientificName) {
        const sciParts = b.scientificName.toLowerCase().split(' ')
        if (sciParts.length === 2) {
          const genusSpecies = `${sciParts[0]}-${sciParts[1]}`
          if (a.slug === genusSpecies) {
            potentialPairs.push([a, b, 'scientific vs common name'])
          }
        }
      }
    }
  }

  for (const [a, b, reason] of potentialPairs) {
    console.log(`Potential duplicate (${reason}):`)
    console.log(`  - ${a.slug}: ${a.scientificName || 'no scientific name'}`)
    console.log(`  - ${b.slug}: ${b.scientificName || 'no scientific name'}`)
    console.log()
  }

  if (potentialPairs.length === 0) {
    console.log('No potential duplicates found by slug pattern.\n')
  }

  // Summary
  console.log('=== Summary ===')
  console.log(`Total species: ${speciesList.length}`)
  console.log(`Duplicate groups by scientific name: ${duplicateGroups}`)
  console.log(`Potential pairs by pattern: ${potentialPairs.length}`)

  console.log('\n--- Recommendations ---')
  if (duplicateGroups > 0) {
    console.log('1. Review species with same scientific name and merge if appropriate')
  }
  if (potentialPairs.length > 0) {
    console.log('2. Review common name vs scientific name pairs for consolidation')
  }
  console.log('3. Ensure GBIF and Wikidata IDs are present for all species')
  console.log('4. Consider adding "sameAs" references for known duplicates')
}

main().catch(console.error)

#!/usr/bin/env node
/**
 * Add foundIn back-references to ChemicalCompound entities.
 *
 * This script:
 * 1. Scans all PlantSpecies entities for containsChemical references
 * 2. Builds a reverse index: compound → [species that contain it]
 * 3. Updates each ChemicalCompound entity with foundIn array
 * 4. Maintains MECE consistency by pointing to PlantSpecies (not PlantPart)
 *
 * Usage:
 *   node scripts/add-foundin-references.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')

// Directories
const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const CHEMICALS_DIR = path.join(ROOT_DIR, 'entities/botanical/chemicals')

async function main() {
  console.log('=== Adding foundIn Back-references ===\n')

  if (DRY_RUN) {
    console.log('DRY RUN - No files will be written\n')
  }

  // Step 1: Build reverse index from species to compounds
  const compoundToSpecies = new Map()

  console.log('Scanning PlantSpecies entities...\n')

  const speciesDirs = fs.readdirSync(SPECIES_DIR)
    .filter(name => fs.statSync(path.join(SPECIES_DIR, name)).isDirectory())

  for (const speciesSlug of speciesDirs) {
    const speciesFile = path.join(SPECIES_DIR, speciesSlug, 'entity.jsonld')
    if (!fs.existsSync(speciesFile)) continue

    let speciesData
    try {
      speciesData = JSON.parse(fs.readFileSync(speciesFile, 'utf8'))
    } catch (e) {
      console.log(`  WARNING: Could not parse ${speciesFile}`)
      continue
    }

    // Extract containsChemical references
    const chemicals = speciesData.containsChemical || []

    for (const chemRef of chemicals) {
      const chemId = chemRef['@id']
      if (!chemId) continue

      // Extract compound slug from IRI (e.g., "botanical/chemical/flavonoids" → "flavonoids")
      const chemSlug = chemId.split('/').pop()

      if (!compoundToSpecies.has(chemSlug)) {
        compoundToSpecies.set(chemSlug, [])
      }

      const speciesId = `botanical/species/${speciesSlug}`
      if (!compoundToSpecies.get(chemSlug).includes(speciesId)) {
        compoundToSpecies.get(chemSlug).push(speciesId)
      }
    }
  }

  console.log(`Found ${compoundToSpecies.size} compounds referenced by species\n`)

  // Step 2: Update ChemicalCompound entities
  console.log('Updating ChemicalCompound entities...\n')

  const chemicalsDirs = fs.readdirSync(CHEMICALS_DIR)
    .filter(name => fs.statSync(path.join(CHEMICALS_DIR, name)).isDirectory())

  let updated = 0
  let created = 0
  let unchanged = 0

  for (const chemSlug of chemicalsDirs) {
    const chemFile = path.join(CHEMICALS_DIR, chemSlug, 'entity.jsonld')
    if (!fs.existsSync(chemFile)) continue

    let chemData
    try {
      chemData = JSON.parse(fs.readFileSync(chemFile, 'utf8'))
    } catch (e) {
      console.log(`  WARNING: Could not parse ${chemFile}`)
      continue
    }

    const speciesList = compoundToSpecies.get(chemSlug) || []

    // Build foundIn array pointing to PlantSpecies
    const foundInSpecies = speciesList.map(id => ({ '@id': id }))

    // Check if update needed
    const existingFoundIn = chemData.foundIn || []
    const existingIds = existingFoundIn.map(f => f['@id']).sort()
    const newIds = foundInSpecies.map(f => f['@id']).sort()

    const needsUpdate = JSON.stringify(existingIds) !== JSON.stringify(newIds)

    if (needsUpdate) {
      if (foundInSpecies.length > 0) {
        chemData.foundIn = foundInSpecies
        console.log(`  ${chemSlug}: ${existingFoundIn.length} → ${foundInSpecies.length} species references`)

        if (chemData.foundIn.length === 0) {
          // Remove empty foundIn
          delete chemData.foundIn
        }
      } else if (chemData.foundIn) {
        // Remove foundIn if no species reference this compound
        delete chemData.foundIn
        console.log(`  ${chemSlug}: Removed foundIn (no species references)`)
      }

      // Update provenance
      chemData.provenance = chemData.provenance || {}
      chemData.provenance.modified = new Date().toISOString()

      if (!DRY_RUN) {
        fs.writeFileSync(chemFile, JSON.stringify(chemData, null, 2))
      }

      if (existingFoundIn.length === 0) {
        created++
      } else {
        updated++
      }
    } else {
      unchanged++
    }
  }

  // Step 3: Report on compounds not in chemicals directory
  console.log('\n--- Compounds referenced but not in chemicals directory ---')
  for (const [chemSlug, species] of compoundToSpecies) {
    const chemDir = path.join(CHEMICALS_DIR, chemSlug)
    if (!fs.existsSync(chemDir)) {
      console.log(`  ${chemSlug}: Referenced by ${species.length} species but no entity exists`)
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Compounds updated: ${updated}`)
  console.log(`Compounds created (new foundIn): ${created}`)
  console.log(`Compounds unchanged: ${unchanged}`)
  console.log(`Total compound entities: ${chemicalsDirs.length}`)

  if (DRY_RUN) {
    console.log('\n*** DRY RUN - No changes were made ***')
  }
}

main().catch(console.error)

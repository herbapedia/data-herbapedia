#!/usr/bin/env node
/**
 * Migrate Plant Species from old to new v2 architecture
 *
 * OLD: entities/plants/{slug}/entity.jsonld
 *      id: "plant/{slug}"
 *
 * NEW: entities/botanical/species/{slug}/entity.jsonld
 *      id: "botanical/species/{slug}"
 *
 * Usage: node scripts/migrate-plant-species.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const OLD_PLANTS_DIR = join(ROOT, 'entities/plants')
const NEW_SPECIES_DIR = join(ROOT, 'entities/botanical/species')

function loadJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (e) {
    console.error(`Error loading ${path}:`, e.message)
    return null
  }
}

function saveJSON(path, data) {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

function slugFromPath(path) {
  const parts = path.split('/')
  return parts[parts.length - 2] || parts[parts.length - 1]
}

function migratePlant(oldPlant, slug) {
  const newPlant = {
    "@context": "../../../schema/context/core.jsonld",
    "@id": `botanical/species/${slug}`,
    "@type": ["botany:PlantSpecies", "schema:Plant"],
    "name": oldPlant.name || {},
    "scientificName": oldPlant.scientificName || null,
    "family": oldPlant.family || null,
    "genus": oldPlant.genus || null,
    "description": oldPlant.description || {},
  }

  // Copy optional fields
  if (oldPlant.commonName) newPlant.commonName = oldPlant.commonName
  if (oldPlant.botanicalDescription) newPlant.botanicalDescription = oldPlant.botanicalDescription
  if (oldPlant.geographicalDistribution) newPlant.geographicalDistribution = oldPlant.geographicalDistribution
  if (oldPlant.image) newPlant.image = oldPlant.image

  // Migrate external IDs
  if (oldPlant.gbifId || oldPlant.gbifID) {
    newPlant.gbifID = oldPlant.gbifId || oldPlant.gbifID
  }
  if (oldPlant.wikidataID || oldPlant.sameAs) {
    // Extract wikidata ID from sameAs if present
    const sameAsList = Array.isArray(oldPlant.sameAs) ? oldPlant.sameAs : [oldPlant.sameAs].filter(Boolean)
    for (const sa of sameAsList) {
      const saStr = typeof sa === 'string' ? sa : sa['@id'] || ''
      if (saStr.includes('wikidata.org')) {
        const qid = saStr.match(/Q\d+/)?.[0]
        if (qid) newPlant.wikidataID = qid
        break
      }
    }
  }

  // Migrate containsChemical references
  if (oldPlant.containsChemical && oldPlant.containsChemical.length > 0) {
    newPlant.containsChemical = oldPlant.containsChemical.map(c => ({
      "@id": typeof c === 'object' ? c['@id'].replace('chemical/', 'botanical/chemical/') : `botanical/chemical/${c}`
    }))
  }

  // Add provenance
  newPlant.provenance = {
    created: oldPlant.created || new Date().toISOString(),
    modified: new Date().toISOString(),
    migratedFrom: `entities/plants/${slug}/entity.jsonld`,
    source: oldPlant.source || "Herbapedia legacy data"
  }

  if (oldPlant.license) {
    newPlant.provenance.license = oldPlant.license
  }

  return newPlant
}

function main() {
  console.log('=== Plant Species Migration ===\n')

  // Get all old plants
  const plantDirs = readdirSync(OLD_PLANTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  console.log(`Found ${plantDirs.length} plants to migrate\n`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const slug of plantDirs) {
    const oldPath = join(OLD_PLANTS_DIR, slug, 'entity.jsonld')
    const newPath = join(NEW_SPECIES_DIR, slug, 'entity.jsonld')

    // Check if already migrated
    if (existsSync(newPath)) {
      console.log(`  [SKIP] ${slug} - already exists in new location`)
      skipped++
      continue
    }

    // Load old plant
    const oldPlant = loadJSON(oldPath)
    if (!oldPlant) {
      console.log(`  [ERROR] ${slug} - could not load old data`)
      errors++
      continue
    }

    // Migrate
    const newPlant = migratePlant(oldPlant, slug)
    saveJSON(newPath, newPlant)

    console.log(`  [OK] ${slug}`)
    migrated++
  }

  console.log(`\n=== Migration Complete ===`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

main()

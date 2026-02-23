#!/usr/bin/env node
/**
 * Migrate TCM Profiles from old to new v2 architecture
 *
 * OLD: systems/tcm/herbs/{slug}/profile.jsonld
 *      id: "tcm/{slug}"
 *      derivedFromPlant: "plant/{slug}"
 *
 * NEW: profiles/tcm/{slug}/profile.jsonld
 *      id: "tcm/profile/{slug}"
 *      derivedFromPlant: "botanical/species/{slug}"
 *
 * Usage: node scripts/migrate-tcm-profiles.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const OLD_TCM_DIR = join(ROOT, 'systems/tcm/herbs')
const NEW_PROFILES_DIR = join(ROOT, 'profiles/tcm')

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

function migrateProfile(oldProfile, slug) {
  const newProfile = {
    "@context": "../../../schema/context/tcm.jsonld",
    "@id": `tcm/profile/${slug}`,
    "@type": ["tcm:Herb", "schema:DietarySupplement"],
    "profiles": { "@id": `preparation/${slug}` },
    "name": oldProfile.name || {},
  }

  // Copy basic fields
  if (oldProfile.pinyin) newProfile.pinyin = oldProfile.pinyin
  if (oldProfile.hanyuPinlu) newProfile.hanyuPinlu = oldProfile.hanyuPinlu
  if (oldProfile.chineseName) newProfile.chineseName = oldProfile.chineseName
  if (oldProfile.hanzi) newProfile.hanzi = oldProfile.hanzi

  // Migrate IRI references
  if (oldProfile.derivedFromPlant) {
    const oldId = oldProfile.derivedFromPlant['@id'] || oldProfile.derivedFromPlant
    const newId = oldId.replace('plant/', 'botanical/species/')
    newProfile.derivedFromPlant = { "@id": newId }
  }

  if (oldProfile.hasCategory) {
    const oldId = oldProfile.hasCategory['@id'] || oldProfile.hasCategory
    const newId = oldId.replace('category/', 'tcm/category/')
    newProfile.hasCategory = { "@id": newId }
  }

  if (oldProfile.hasNature) {
    const oldId = oldProfile.hasNature['@id'] || oldProfile.hasNature
    const newId = oldId.replace('nature/', 'tcm/nature/')
    newProfile.hasNature = { "@id": newId }
  }

  if (oldProfile.hasFlavor && Array.isArray(oldProfile.hasFlavor)) {
    newProfile.hasFlavor = oldProfile.hasFlavor.map(f => {
      const oldId = f['@id'] || f
      const newId = oldId.replace('flavor/', 'tcm/flavor/')
      return { "@id": newId }
    })
  }

  if (oldProfile.entersMeridian && Array.isArray(oldProfile.entersMeridian)) {
    newProfile.entersMeridian = oldProfile.entersMeridian.map(m => {
      const oldId = m['@id'] || m
      const newId = oldId.replace('meridian/', 'tcm/meridian/')
      return { "@id": newId }
    })
  }

  // Copy content fields
  if (oldProfile.tcmFunctions) newProfile.tcmFunctions = oldProfile.tcmFunctions
  if (oldProfile.tcmTraditionalUsage) newProfile.tcmTraditionalUsage = oldProfile.tcmTraditionalUsage
  if (oldProfile.tcmModernResearch) newProfile.tcmModernResearch = oldProfile.tcmModernResearch
  if (oldProfile.tcmHistory) newProfile.tcmHistory = oldProfile.tcmHistory
  if (oldProfile.indications) newProfile.indications = oldProfile.indications
  if (oldProfile.contraindications) newProfile.contraindications = oldProfile.contraindications
  if (oldProfile.dosage) newProfile.dosage = oldProfile.dosage
  if (oldProfile.comparisonNotes) newProfile.comparisonNotes = oldProfile.comparisonNotes

  if (oldProfile.classicalReferences) {
    newProfile.classicalReferences = oldProfile.classicalReferences
  }

  // Add provenance
  newProfile.provenance = {
    created: oldProfile.provenance?.created || new Date().toISOString(),
    modified: new Date().toISOString(),
    migratedFrom: `systems/tcm/herbs/${slug}/profile.jsonld`
  }

  return newProfile
}

function main() {
  console.log('=== TCM Profile Migration ===\n')

  // Get all old profiles
  const profileDirs = readdirSync(OLD_TCM_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  console.log(`Found ${profileDirs.length} TCM profiles to migrate\n`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const slug of profileDirs) {
    const oldPath = join(OLD_TCM_DIR, slug, 'profile.jsonld')
    const newPath = join(NEW_PROFILES_DIR, slug, 'profile.jsonld')

    // Check if already migrated
    if (existsSync(newPath)) {
      console.log(`  [SKIP] ${slug} - already exists in new location`)
      skipped++
      continue
    }

    // Load old profile
    const oldProfile = loadJSON(oldPath)
    if (!oldProfile) {
      console.log(`  [ERROR] ${slug} - could not load old data`)
      errors++
      continue
    }

    // Migrate
    const newProfile = migrateProfile(oldProfile, slug)
    saveJSON(newPath, newProfile)

    console.log(`  [OK] ${slug}`)
    migrated++
  }

  console.log(`\n=== Migration Complete ===`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

main()

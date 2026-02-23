#!/usr/bin/env node
/**
 * Migrate Western Profiles from old to new v2 architecture
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const OLD_WESTERN_DIR = join(ROOT, 'systems/western/herbs')
const NEW_PROFILES_DIR = join(ROOT, 'profiles/western')

function loadJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (e) {
    console.error('Error loading', path, ':', e.message)
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

function migrateProfile(oldProfile, slug) {
  const newProfile = {
    "@context": "../../../schema/context/western.jsonld",
    "@id": "western/profile/" + slug,
    "@type": ["herbapedia:WesternHerbalProfile"],
    "profiles": { "@id": "preparation/" + slug },
    "name": oldProfile.name || {},
  }

  if (oldProfile.derivedFromPlant) {
    const oldId = oldProfile.derivedFromPlant['@id'] || oldProfile.derivedFromPlant
    newProfile.derivedFromPlant = { "@id": oldId.replace('plant/', 'botanical/species/') }
  }

  if (oldProfile.hasAction && Array.isArray(oldProfile.hasAction)) {
    newProfile.hasAction = oldProfile.hasAction.map(a => {
      const oldId = a['@id'] || a
      return { "@id": oldId.replace('action/', 'western/action/') }
    })
  }

  if (oldProfile.hasOrganAffinity && Array.isArray(oldProfile.hasOrganAffinity)) {
    newProfile.hasOrganAffinity = oldProfile.hasOrganAffinity.map(o => {
      const oldId = o['@id'] || o
      return { "@id": oldId.replace('organ/', 'western/organ/') }
    })
  }

  if (oldProfile.westernTraditionalUsage) newProfile.westernTraditionalUsage = oldProfile.westernTraditionalUsage
  if (oldProfile.westernHistory) newProfile.westernHistory = oldProfile.westernHistory
  if (oldProfile.westernModernResearch) newProfile.westernModernResearch = oldProfile.westernModernResearch
  if (oldProfile.westernConstituents) newProfile.westernConstituents = oldProfile.westernConstituents

  newProfile.provenance = {
    created: oldProfile.provenance?.created || new Date().toISOString(),
    modified: new Date().toISOString(),
    migratedFrom: 'systems/western/herbs/' + slug + '/profile.jsonld'
  }

  return newProfile
}

function main() {
  console.log('=== Western Profile Migration ===\n')

  const profileDirs = readdirSync(OLD_WESTERN_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  console.log('Found ' + profileDirs.length + ' Western profiles to migrate\n')

  let migrated = 0, skipped = 0, errors = 0

  for (const slug of profileDirs) {
    const oldPath = join(OLD_WESTERN_DIR, slug, 'profile.jsonld')
    const newPath = join(NEW_PROFILES_DIR, slug, 'profile.jsonld')

    if (existsSync(newPath)) {
      console.log('  [SKIP] ' + slug + ' - already exists')
      skipped++
      continue
    }

    const oldProfile = loadJSON(oldPath)
    if (!oldProfile) {
      console.log('  [ERROR] ' + slug + ' - could not load')
      errors++
      continue
    }

    const newProfile = migrateProfile(oldProfile, slug)
    saveJSON(newPath, newProfile)
    console.log('  [OK] ' + slug)
    migrated++
  }

  console.log('\n=== Migration Complete ===')
  console.log('Migrated:', migrated)
  console.log('Skipped:', skipped)
  console.log('Errors:', errors)
}

main()

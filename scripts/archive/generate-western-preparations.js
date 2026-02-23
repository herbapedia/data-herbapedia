#!/usr/bin/env node

/**
 * Generate HerbalPreparation entities from existing Western profiles.
 *
 * Usage:
 *   node scripts/generate-western-preparations.js
 *   node scripts/generate-western-preparations.js --dry-run
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'

const ROOT = process.cwd()
const DRY_RUN = process.argv.includes('--dry-run')

function ensureDir(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function readJsonLd(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (error) {
    return null
  }
}

function writeJsonLd(filePath, data) {
  ensureDir(filePath)
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

function generatePreparation(profile, slug) {
  const derivedFromPlant = profile.derivedFromPlant?.['@id'] || `botanical/species/${slug}`
  const name = profile.name || { en: slug }

  let preparationMethod = 'dried'
  let form = 'whole'

  // Infer from slug
  if (slug.includes('oil')) {
    preparationMethod = 'cold-pressed'
    form = 'oil'
  } else if (slug.includes('extract')) {
    preparationMethod = 'extracted'
    form = 'extract'
  }

  return {
    '@context': '../../schema/context/core.jsonld',
    '@id': `preparation/${slug}`,
    '@type': ['herbal:HerbalPreparation', 'schema:DietarySupplement'],
    name,
    derivedFrom: [{ '@id': derivedFromPlant }],
    preparationMethod,
    form,
    hasWesternProfile: [{ '@id': profile['@id'] }],
    provenance: {
      created: new Date().toISOString().split('T')[0],
      source: 'Generated from Western profile',
      contributors: ['Herbapedia Team'],
    },
  }
}

async function main() {
  console.log('🌿 Western HerbalPreparation Generator\n')

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE\n')
  }

  const profilesDir = join(ROOT, 'profiles/western')
  const slugs = readdirSync(profilesDir).filter(s => {
    return existsSync(join(profilesDir, s, 'profile.jsonld'))
  })

  console.log(`Found ${slugs.length} Western profiles\n`)

  let created = 0
  let skipped = 0

  for (const slug of slugs) {
    const profilePath = join(profilesDir, slug, 'profile.jsonld')
    const preparationPath = join(ROOT, 'entities/preparations', slug, 'entity.jsonld')

    if (existsSync(preparationPath)) {
      skipped++
      continue
    }

    const profile = readJsonLd(profilePath)
    if (!profile) continue

    const preparation = generatePreparation(profile, slug)

    if (DRY_RUN) {
      console.log(`  📝 ${slug}`)
    } else {
      writeJsonLd(preparationPath, preparation)
      console.log(`  ✅ ${slug}`)
    }
    created++
  }

  console.log(`\n📊 Created: ${created}, Skipped: ${skipped}`)
}

main().catch(console.error)

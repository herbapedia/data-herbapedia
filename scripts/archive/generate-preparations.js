#!/usr/bin/env node

/**
 * Generate HerbalPreparation entities from existing TCM profiles.
 *
 * This script:
 * 1. Reads all TCM profiles from profiles/tcm/
 * 2. Creates HerbalPreparation entities for each
 * 3. Links preparations to botanical sources and TCM profiles
 *
 * Usage:
 *   node scripts/generate-preparations.js
 *   node scripts/generate-preparations.js --dry-run  # Preview without writing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { readdirSync } from 'fs'
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
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`  Error reading ${filePath}: ${error.message}`)
    return null
  }
}

function writeJsonLd(filePath, data) {
  ensureDir(filePath)
  const content = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(filePath, content)
}

function generatePreparation(profile, slug) {
  // Determine botanical source
  const derivedFromPlant = profile.derivedFromPlant?.['@id'] || `botanical/species/${slug}`

  // Get name from profile
  const name = profile.name || { en: slug }

  // Determine preparation method based on common patterns
  let preparationMethod = 'dried' // default
  let form = 'whole' // default

  // Infer from slug patterns
  if (slug.includes('fresh')) {
    preparationMethod = 'fresh'
  } else if (slug.includes('extract') || slug.includes('-extract')) {
    preparationMethod = 'extracted'
    form = 'extract'
  } else if (slug.includes('powder')) {
    preparationMethod = 'powdered'
    form = 'powder'
  } else if (slug.includes('tincture')) {
    preparationMethod = 'tinctured'
    form = 'tincture'
  } else if (slug.includes('tea')) {
    form = 'tea'
  }

  // Create preparation entity
  const preparation = {
    '@context': '../../schema/context/core.jsonld',
    '@id': `preparation/${slug}`,
    '@type': ['herbal:HerbalPreparation', 'schema:DietarySupplement'],
    name,
    derivedFrom: [{ '@id': derivedFromPlant }],
    preparationMethod,
    form,
    hasTCMProfile: [{ '@id': profile['@id'] }],
    safetyInfo: {
      generalContraindications: profile.contraindications,
    },
    provenance: {
      created: new Date().toISOString().split('T')[0],
      source: 'Generated from TCM profile',
      contributors: ['Herbapedia Team'],
    },
  }

  // Add description if available
  if (profile.tcmTraditionalUsage?.en) {
    preparation.description = {
      en: `Herbal preparation derived from ${name.en || slug}. ${profile.tcmTraditionalUsage.en.substring(0, 200)}...`,
    }
  }

  return preparation
}

async function main() {
  console.log('🌿 HerbalPreparation Generator\n')

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be written\n')
  }

  // Find all TCM profiles
  const profilesDir = join(ROOT, 'profiles/tcm')
  const slugs = readdirSync(profilesDir).filter(s => {
    const profilePath = join(profilesDir, s, 'profile.jsonld')
    return existsSync(profilePath)
  })

  console.log(`Found ${slugs.length} TCM profiles\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const slug of slugs) {
    const profilePath = join(profilesDir, slug, 'profile.jsonld')
    const preparationDir = join(ROOT, 'entities/preparations', slug)
    const preparationPath = join(preparationDir, 'entity.jsonld')

    // Check if preparation already exists
    if (existsSync(preparationPath)) {
      console.log(`  ⏭️  ${slug} - preparation already exists`)
      skipped++
      continue
    }

    // Read profile
    const profile = readJsonLd(profilePath)
    if (!profile) {
      console.log(`  ❌ ${slug} - could not read profile`)
      errors++
      continue
    }

    // Generate preparation
    const preparation = generatePreparation(profile, slug)

    if (DRY_RUN) {
      console.log(`  📝 ${slug} - would create preparation`)
      console.log(`      @id: ${preparation['@id']}`)
      console.log(`      derivedFrom: ${preparation.derivedFrom[0]['@id']}`)
      console.log(`      hasTCMProfile: ${preparation.hasTCMProfile[0]['@id']}`)
    } else {
      writeJsonLd(preparationPath, preparation)
      console.log(`  ✅ ${slug} - created preparation`)
    }
    created++
  }

  console.log('\n📊 Summary:')
  console.log(`  Created: ${created}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)

  if (!DRY_RUN) {
    console.log('\n✅ HerbalPreparation generation complete!')
    console.log('Run validation: node scripts/validate.js')
  }
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})

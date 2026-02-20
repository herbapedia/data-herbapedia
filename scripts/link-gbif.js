#!/usr/bin/env node

/**
 * Herbapedia GBIF Linking Script
 *
 * Links plant entities to GBIF (Global Biodiversity Information Facility)
 * species records. Uses scientific names as primary matching keys.
 *
 * Usage:
 *   node scripts/link-gbif.js [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run   Show what would be updated without making changes
 *   --verbose   Show detailed progress information
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

// GBIF API endpoints
const GBIF_SPECIES_MATCH = 'https://api.gbif.org/v1/species/match'
const GBIF_SPECIES = 'https://api.gbif.org/v1/species'

// Rate limiting
const DELAY_MS = 100

/**
 * Log message if verbose mode is enabled
 */
function log(...args) {
  if (VERBOSE) {
    console.log(...args)
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Find all entity.jsonld files in a directory
 */
function findEntityFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      findEntityFiles(fullPath, files)
    } else if (entry.name === 'entity.jsonld') {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Query GBIF Species Match API for a scientific name
 */
async function matchGbifSpecies(scientificName) {
  const url = `${GBIF_SPECIES_MATCH}?name=${encodeURIComponent(scientificName)}&strict=false&verbose=true`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Herbapedia/1.0 (https://herbapedia.org)'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}

/**
 * Check if an entity already has a GBIF link
 */
function hasGbifLink(entity) {
  if (!entity.sameAs) return false
  const links = Array.isArray(entity.sameAs) ? entity.sameAs : [entity.sameAs]
  return links.some(link => {
    const url = typeof link === 'object' ? link['@id'] || link : link
    return url.includes('gbif.org')
  })
}

/**
 * Add GBIF link to entity
 */
function addGbifLink(entity, gbifId, scientificName) {
  const gbifUrl = `https://www.gbif.org/species/${gbifId}`

  if (!entity.sameAs) {
    entity.sameAs = []
  }

  if (!Array.isArray(entity.sameAs)) {
    entity.sameAs = [entity.sameAs]
  }

  // Add GBIF link
  if (!entity.sameAs.some(l => {
    const url = typeof l === 'object' ? l['@id'] || l : l
    return url === gbifUrl
  })) {
    entity.sameAs.push({ '@id': gbifUrl })
  }

  // Add gbifId property
  entity.gbifId = gbifId

  return entity
}

/**
 * Process a single plant entity
 */
async function processPlantEntity(entityPath) {
  const content = readFileSync(entityPath, 'utf-8')
  const entity = JSON.parse(content)

  const slug = entityPath.split('/').slice(-2, -1)[0]

  // Check if already linked
  if (hasGbifLink(entity)) {
    return { slug, status: 'skipped', reason: 'already_linked' }
  }

  const scientificName = entity.scientificName
  if (!scientificName) {
    return { slug, status: 'skipped', reason: 'no_scientific_name' }
  }

  // Clean up scientific name (remove author citations, etc.)
  const cleanName = scientificName
    .split('(')[0]
    .split('L.')[0]
    .split('DC.')[0]
    .split('Thunb.')[0]
    .split('Hort')[0]
    .trim()

  log(`  🔬 Matching: ${cleanName}`)

  // Query GBIF
  const match = await matchGbifSpecies(cleanName)

  if (match && match.matchType && match.matchType !== 'NONE' && match.speciesKey) {
    const confidence = match.confidence || 0

    // Only accept high confidence matches
    if (confidence >= 80) {
      log(`  ✅ Found: GBIF ${match.speciesKey} (${match.matchType}, confidence: ${confidence}%)`)

      if (!DRY_RUN) {
        addGbifLink(entity, match.speciesKey, cleanName)
        writeFileSync(entityPath, JSON.stringify(entity, null, 2) + '\n')
      }

      return {
        slug,
        status: 'linked',
        gbifId: match.speciesKey,
        scientificName: match.scientificName,
        matchType: match.matchType,
        confidence
      }
    } else {
      log(`  ⚠️  Low confidence match: ${confidence}%`)
      return { slug, status: 'low_confidence', match, confidence }
    }
  }

  // Try with original name if different
  if (cleanName !== scientificName) {
    log(`  🔄 Retrying with original: ${scientificName}`)
    const match2 = await matchGbifSpecies(scientificName)

    if (match2 && match2.matchType && match2.matchType !== 'NONE' && match2.speciesKey) {
      const confidence = match2.confidence || 0

      if (confidence >= 80) {
        log(`  ✅ Found: GBIF ${match2.speciesKey} (${match2.matchType}, confidence: ${confidence}%)`)

        if (!DRY_RUN) {
          addGbifLink(entity, match2.speciesKey, scientificName)
          writeFileSync(entityPath, JSON.stringify(entity, null, 2) + '\n')
        }

        return {
          slug,
          status: 'linked',
          gbifId: match2.speciesKey,
          scientificName: match2.scientificName,
          matchType: match2.matchType,
          confidence
        }
      }
    }
  }

  return { slug, status: 'not_found', searched: [cleanName, scientificName] }
}

/**
 * Main function
 */
async function main() {
  console.log('🌿 Herbapedia GBIF Linking Script')
  console.log('=================================\n')

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  // Find plant entities
  const plantsDir = join(ROOT, 'entities', 'plants')
  const entityFiles = findEntityFiles(plantsDir)
  console.log(`📚 Found ${entityFiles.length} plant entities\n`)

  // Process each entity
  const results = {
    linked: 0,
    skipped: 0,
    lowConfidence: 0,
    notFound: 0,
    errors: 0,
    details: []
  }

  for (let i = 0; i < entityFiles.length; i++) {
    const filePath = entityFiles[i]
    const slug = filePath.split('/').slice(-2, -1)[0]

    console.log(`[${i + 1}/${entityFiles.length}] ${slug}`)

    try {
      const result = await processPlantEntity(filePath)
      results.details.push(result)

      switch (result.status) {
        case 'linked':
          results.linked++
          console.log(`   ✅ Linked to GBIF ${result.gbifId} (${result.confidence}%)`)
          break
        case 'skipped':
          results.skipped++
          console.log(`   ⏭️  Skipped: ${result.reason}`)
          break
        case 'low_confidence':
          results.lowConfidence++
          console.log(`   ⚠️  Low confidence: ${result.confidence}%`)
          break
        case 'not_found':
          results.notFound++
          console.log(`   ❌ Not found`)
          break
      }
    } catch (error) {
      results.errors++
      console.error(`   ❌ Error: ${error.message}`)
      results.details.push({ slug, status: 'error', error: error.message })
    }

    // Rate limiting
    if (i < entityFiles.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  // Summary
  console.log('\n📊 Summary')
  console.log('==========')
  console.log(`Total entities: ${entityFiles.length}`)
  console.log(`Linked: ${results.linked}`)
  console.log(`Skipped: ${results.skipped}`)
  console.log(`Low confidence: ${results.lowConfidence}`)
  console.log(`Not found: ${results.notFound}`)
  console.log(`Errors: ${results.errors}`)

  const coverage = ((results.linked + results.skipped) / entityFiles.length * 100).toFixed(1)
  console.log(`\nGBIF coverage: ${coverage}%`)

  // Output unmatched plants for manual review
  if (results.notFound > 0) {
    console.log('\n📝 Plants needing manual review:')
    results.details
      .filter(r => r.status === 'not_found')
      .forEach(r => {
        console.log(`   - ${r.slug}`)
        if (r.searched) {
          console.log(`     Searched: ${r.searched.join(', ')}`)
        }
      })
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.')
  }
}

main().catch(console.error)

#!/usr/bin/env node

/**
 * Herbapedia Wikidata Linking Script
 *
 * Links TCM herbs and plants to Wikidata entities by querying the Wikidata
 * SPARQL endpoint. Uses scientific names as primary matching keys.
 *
 * Usage:
 *   node scripts/link-wikidata.js [--dry-run] [--verbose]
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

// Wikidata SPARQL endpoint
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

// Rate limiting - be respectful to Wikidata
const DELAY_MS = 200

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
 * Find all profile.jsonld files in a directory
 */
function findProfileFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      findProfileFiles(fullPath, files)
    } else if (entry.name === 'profile.jsonld') {
      files.push(fullPath)
    }
  }
  return files
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
 * Load all plant entities into a Map
 */
function loadPlantEntities() {
  const plantsDir = join(ROOT, 'entities', 'plants')
  const entityFiles = findEntityFiles(plantsDir)
  const plantMap = new Map()

  for (const filePath of entityFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      const slug = filePath.split('/').slice(-2, -1)[0]
      plantMap.set(`plant/${slug}`, {
        slug,
        filePath,
        scientificName: data.scientificName,
        name: data.name,
        commonName: data.commonName
      })
    } catch (error) {
      console.error(`Error loading ${filePath}: ${error.message}`)
    }
  }

  return plantMap
}

/**
 * Query Wikidata SPARQL for a plant by scientific name
 * Returns null on timeout/errors instead of throwing
 */
async function queryWikidataByScientificName(scientificName) {
  const sparqlQuery = `
SELECT ?item WHERE {
  ?item wdt:P225 "${scientificName}" .
  ?item wdt:P31 ?instance .
  VALUES ?instance { wd:Q16521 wd:Q756 wd:Q729 }
}
LIMIT 1
`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(SPARQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Herbapedia/1.0 (https://herbapedia.org)'
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return [] // Silent fail on HTTP errors
    }

    const data = await response.json()
    return data.results?.bindings || []
  } catch (error) {
    return [] // Silent fail on errors
  }
}

/**
 * Query Wikidata REST API as fallback (faster than SPARQL)
 */
async function searchWikidataByLabel(label) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=en&format=json&limit=3&strict=false`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Herbapedia/1.0 (https://herbapedia.org)'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.search || []
  } catch (error) {
    return []
  }
}

/**
 * Extract QID from Wikidata URI
 */
function extractQid(uri) {
  const match = uri.match(/Q\d+$/)
  return match ? match[0] : null
}

/**
 * Check if a profile already has a Wikidata link
 */
function hasWikidataLink(profile) {
  if (!profile.sameAs) return false
  const links = Array.isArray(profile.sameAs) ? profile.sameAs : [profile.sameAs]
  return links.some(link => {
    const url = typeof link === 'object' ? link['@id'] || link : link
    return url.includes('wikidata.org')
  })
}

/**
 * Add Wikidata link to profile
 */
function addWikidataLink(profile, qid) {
  const wikidataUrl = `https://www.wikidata.org/wiki/${qid}`
  const wikipediaUrl = `https://en.wikipedia.org/wiki/${qid}`

  if (!profile.sameAs) {
    profile.sameAs = []
  }

  if (!Array.isArray(profile.sameAs)) {
    profile.sameAs = [profile.sameAs]
  }

  // Add Wikidata link
  if (!profile.sameAs.some(l => {
    const url = typeof l === 'object' ? l['@id'] || l : l
    return url === wikidataUrl
  })) {
    profile.sameAs.push({ '@id': wikidataUrl })
  }

  return profile
}

/**
 * Process a single TCM herb profile
 * Strategy: REST API first (more reliable), then SPARQL fallback
 */
async function processHerbProfile(profilePath, plantMap) {
  const content = readFileSync(profilePath, 'utf-8')
  const profile = JSON.parse(content)

  // Check if already linked
  if (hasWikidataLink(profile)) {
    return { status: 'skipped', reason: 'already_linked' }
  }

  // Get the linked plant
  const plantRef = profile.derivedFromPlant?.['@id'] || profile.derivedFromPlant
  if (!plantRef) {
    return { status: 'skipped', reason: 'no_plant_ref' }
  }

  const plant = plantMap.get(plantRef)
  if (!plant) {
    return { status: 'skipped', reason: 'plant_not_found' }
  }

  const scientificName = plant.scientificName
  if (!scientificName) {
    return { status: 'skipped', reason: 'no_scientific_name' }
  }

  // Clean up scientific name (remove author citations, etc.)
  const cleanName = scientificName.split('(')[0].split('L.')[0].split('DC.')[0].trim()

  // Try REST API search with multiple terms
  const searchTerms = [
    cleanName,
    scientificName,
    profile.name?.en,
    plant.name?.en
  ].filter(Boolean)

  for (const term of searchTerms) {
    const restResults = await searchWikidataByLabel(term)

    for (const result of restResults) {
      const desc = (result.description || '').toLowerCase()
      // Check if it's likely a plant/taxon
      if (desc.includes('plant') || desc.includes('species') || desc.includes('taxon') ||
          desc.includes('herb') || desc.includes('tree') || desc.includes('flower')) {
        const qid = result.id

        log(`  ✅ Found: ${qid} (${result.description})`)

        if (!DRY_RUN) {
          addWikidataLink(profile, qid)
          writeFileSync(profilePath, JSON.stringify(profile, null, 2) + '\n')
        }

        return { status: 'linked', qid, method: 'rest_api', searchTerm: term }
      }
    }

    // Rate limiting between searches
    await sleep(50)
  }

  // Try SPARQL as last resort
  log(`  🔬 SPARQL fallback for: ${cleanName}`)
  const sparqlResults = await queryWikidataByScientificName(cleanName)

  if (sparqlResults.length > 0) {
    const qid = extractQid(sparqlResults[0].item.value)
    if (qid) {
      log(`  ✅ Found via SPARQL: ${qid}`)

      if (!DRY_RUN) {
        addWikidataLink(profile, qid)
        writeFileSync(profilePath, JSON.stringify(profile, null, 2) + '\n')
      }

      return { status: 'linked', qid, method: 'sparql' }
    }
  }

  return { status: 'not_found', searched: searchTerms }
}

/**
 * Main function
 */
async function main() {
  console.log('🌿 Herbapedia Wikidata Linking Script')
  console.log('=====================================\n')

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  // Load plant entities
  console.log('📚 Loading plant entities...')
  const plantMap = loadPlantEntities()
  console.log(`   Found ${plantMap.size} plant entities\n`)

  // Find TCM herb profiles
  const tcmDir = join(ROOT, 'systems', 'tcm', 'herbs')
  const profileFiles = findProfileFiles(tcmDir)
  console.log(`📚 Found ${profileFiles.length} TCM herb profiles\n`)

  // Process each profile
  const results = {
    linked: 0,
    skipped: 0,
    notFound: 0,
    errors: 0,
    details: []
  }

  for (let i = 0; i < profileFiles.length; i++) {
    const filePath = profileFiles[i]
    const slug = filePath.split('/').slice(-2, -1)[0]

    console.log(`[${i + 1}/${profileFiles.length}] ${slug}`)

    try {
      const result = await processHerbProfile(filePath, plantMap)
      result.slug = slug
      result.filePath = filePath
      results.details.push(result)

      switch (result.status) {
        case 'linked':
          results.linked++
          console.log(`   ✅ Linked to ${result.qid}`)
          break
        case 'skipped':
          results.skipped++
          console.log(`   ⏭️  Skipped: ${result.reason}`)
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
    if (i < profileFiles.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  // Summary
  console.log('\n📊 Summary')
  console.log('==========')
  console.log(`Total profiles: ${profileFiles.length}`)
  console.log(`Linked: ${results.linked}`)
  console.log(`Skipped: ${results.skipped}`)
  console.log(`Not found: ${results.notFound}`)
  console.log(`Errors: ${results.errors}`)

  const coverage = ((results.linked + results.skipped) / profileFiles.length * 100).toFixed(1)
  console.log(`\nWikidata coverage: ${coverage}%`)

  // Output unmatched herbs for manual review
  if (results.notFound > 0) {
    console.log('\n📝 Herbs needing manual review:')
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

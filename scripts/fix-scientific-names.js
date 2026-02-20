#!/usr/bin/env node

/**
 * Herbapedia Scientific Name Fixer
 *
 * Fixes common spelling issues in scientific names to improve
 * Wikidata and GBIF matching:
 * 1. Fixes known typos
 * 2. Removes author citations (L., Bge., Hort, etc.)
 * 3. Normalizes capitalization
 *
 * Usage:
 *   node scripts/fix-scientific-names.js [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// Known typos and their corrections
const TYPO_CORRECTIONS = {
  'Atractytlodes': 'Atractylodes',
  'Miltorrhiza': 'miltiorrhiza',
  'Ziaiphus Jujube Mill. Var. Spinosa': 'Ziziphus jujuba var. spinosa',
  'Corus officinalis': 'Cornus officinalis',
  'Coriolus Versicolour, Trametes versicolor': 'Trametes versicolor',
  'Arctium lappi': 'Arctium lappa',
  'Serenoa Serrulata': 'Serenoa repens',
  'Rhodiola Sacra': 'Rhodiola rosea',
  'Rosmarinus Officinalis': 'Salvia rosmarinus',
  'Citrus Reticulate Blanco': 'Citrus reticulata',
  'Ostrea Gigas': 'Crassostrea gigas',
  'Cynomorium songaricum Rupr.': 'Cynomorium coccineum',
  'Albizzia Julibrissin Durazz': 'Albizia julibrissin',
  'Morindae Officinalis': 'Morinda officinalis',
  'Achyranthis bidentatae': 'Achyranthes bidentata',
  'Polygonum Bistortae': 'Bistorta officinalis',
  'Cimicifuga heracleifolia Kom.': 'Actaea heracleifolia',
  'radix angelicae pubescentisa': 'Angelica pubescens',
  'Artemisiae Argyi': 'Artemisia argyi',
  'Ligusticum chuanxiong Hort': 'Ligusticum striatum',
  'Gastrodia elatae': 'Gastrodia elata',
  'Alisma orientalis': 'Alisma plantago-aquatica',
  'Polygonum multiflorum Thunb.': 'Reynoutria multiflora',
  'Polygonum multiflorum Thunb': 'Reynoutria multiflora',
  'Zea Mays (LINN.)': 'Zea mays',
  'Vaccinium Macrocarpon': 'Vaccinium macrocarpon',
  'Magnolia denudata': 'Magnolia denudata',
}

// Author citations to remove (case-sensitive)
const AUTHOR_CITATIONS = [
  'Y. C. Ma', 'Y C Ma',
  'L.', 'Bge.', 'Hort', 'Oliv.', 'Thunb.', 'Durazz', 'Michx.',
  'Rupr.', 'Ma', 'Kom.', 'Lindl.', 'Lam', 'DC.', 'C.A.Mey',
  'C. A. Mey', 'Harv.', 'Setch.', 'Blanco', '(LINN.)',
  'Ramat.', 'Sacc.', 'Nannf.', 'Moench', 'Gaertn', 'Batsch',
  'Franch.', 'BerK.', 'Vent. Ex Pers.', 'Vent Ex Pers.', 'Fischer',
  '(Harv.) Setch.', '(Franch.) Nannf.', '(BerK.) Sacc.',
  '(Vent. Ex Pers.) Fischer', '(Vent Ex Pers.) Fischer',
  '(L.) Moench', '(L.) Gaertn', '(L.) Batsch', '(Thunb.) DC.',
  '(DC. ) Koidz.', 'Koidz.', 'Thumb', '(Thumb)',
  'C. A. Mey.'
]

// Items to skip (processed materials, non-scientific names)
const SKIP_PATTERNS = [
  'Massa Fermentata',
  'Processed',
  'Carapace',
  'fatty acids',
  'DHA', 'EPA', 'GLA', 'LA', 'AA',
  'Tocopherol', 'Retinol', 'Ascorbic',
]

/**
 * Fix scientific name by:
 * 1. Applying typo corrections
 * 2. Removing author citations
 * 3. Normalizing format
 */
function fixScientificName(name) {
  if (!name) return { name, skipped: false }

  let fixed = name.trim()

  // Check if this should be skipped (non-scientific names)
  for (const pattern of SKIP_PATTERNS) {
    if (fixed.includes(pattern)) {
      return { name: fixed, skipped: true, reason: 'non-scientific' }
    }
  }

  // Check for exact typo corrections first (higher priority)
  for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
    if (fixed === typo || fixed.includes(typo)) {
      fixed = fixed.replace(typo, correction)
    }
  }

  // Remove complex author citations with parentheses first
  const complexPatterns = [
    /\s*\([A-Za-z\.\s]+\)\s*/g,  // (Harv.) (Franch.) etc.
    /\s*\([A-Za-z\.\s]+ Ex [A-Za-z\.\s]+\)\s*/gi, // (Vent. Ex Pers.)
  ]

  for (const pattern of complexPatterns) {
    fixed = fixed.replace(pattern, ' ')
  }

  // Remove author citations
  for (const citation of AUTHOR_CITATIONS) {
    // Escape special regex characters
    const escaped = citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match citation with word boundaries
    const regex = new RegExp(`\\s*${escaped}\\s*`, 'g')
    fixed = fixed.replace(regex, ' ')
  }

  // Clean up extra spaces and punctuation
  fixed = fixed
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+\./g, '')
    .replace(/\.\s+/g, ' ')
    .replace(/\(\s*\)/g, '')  // Remove empty parentheses
    .replace(/\(\s+/g, '(')   // Clean up parentheses
    .replace(/\s+\)/g, ')')
    .trim()

  // Remove trailing period
  if (fixed.endsWith('.')) {
    fixed = fixed.slice(0, -1)
  }

  return { name: fixed, skipped: false }
}

/**
 * Find all entity.jsonld files
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
 * Process a single entity file
 */
function processEntity(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const entity = JSON.parse(content)

  const slug = filePath.split('/').slice(-2, -1)[0]
  const originalName = entity.scientificName

  if (!originalName) {
    return { slug, status: 'skipped', reason: 'no_scientific_name' }
  }

  const result = fixScientificName(originalName)

  if (result.skipped) {
    return { slug, status: 'skipped', reason: result.reason, original: originalName }
  }

  const fixedName = result.name

  if (fixedName === originalName) {
    return { slug, status: 'unchanged', original: originalName }
  }

  console.log(`  📝 ${slug}`)
  console.log(`     Before: "${originalName}"`)
  console.log(`     After:  "${fixedName}"`)

  if (!DRY_RUN) {
    entity.scientificName = fixedName
    writeFileSync(filePath, JSON.stringify(entity, null, 2) + '\n')
  }

  return { slug, status: 'fixed', original: originalName, fixed: fixedName }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Herbapedia Scientific Name Fixer')
  console.log('====================================\n')

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  const plantsDir = join(ROOT, 'entities', 'plants')
  const entityFiles = findEntityFiles(plantsDir)

  console.log(`📚 Found ${entityFiles.length} plant entities\n`)

  const results = {
    fixed: 0,
    unchanged: 0,
    skipped: 0,
    details: []
  }

  for (const filePath of entityFiles) {
    const result = processEntity(filePath)
    results.details.push(result)

    if (result.status === 'fixed') {
      results.fixed++
    } else if (result.status === 'unchanged') {
      results.unchanged++
    } else {
      results.skipped++
    }
  }

  console.log('\n📊 Summary')
  console.log('==========')
  console.log(`Total entities: ${entityFiles.length}`)
  console.log(`Fixed: ${results.fixed}`)
  console.log(`Unchanged: ${results.unchanged}`)
  console.log(`Skipped: ${results.skipped}`)

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.')
  }
}

main()

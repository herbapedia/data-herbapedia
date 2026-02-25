#!/usr/bin/env node

/**
 * Fix Image References in Preparations
 *
 * Problem: Many preparations have image fields pointing to non-existent files,
 * while the correct image exists on the source plant entity.
 *
 * Solution: Remove incorrect image fields from preparations.
 * The website will automatically use the source plant image via derivedFrom.
 *
 * Usage:
 *   node scripts/fix-preparation-images.js [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

const DRY_RUN = process.argv.includes('--dry-run')

// ============================================================================
// Helper Functions
// ============================================================================

function findJsonLdFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      findJsonLdFiles(fullPath, files)
    } else if (entry.endsWith('.jsonld')) {
      files.push(fullPath)
    }
  }
  return files
}

function parseJsonLdFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`)
    return null
  }
}

function writeJsonLdFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

// ============================================================================
// Main Logic
// ============================================================================

console.log('🔧 Fixing Image References in Preparations')
console.log(DRY_RUN ? '📋 DRY RUN - No changes will be made' : '✍️  Making changes')
console.log('')

const preparationsDir = join(ROOT, 'entities/preparations')
const plantsDir = join(ROOT, 'entities/plants')

// Load all plants to get their images
const plants = new Map()
const plantFiles = findJsonLdFiles(plantsDir)
for (const file of plantFiles) {
  const plant = parseJsonLdFile(file)
  if (plant && plant['@id']) {
    plants.set(plant['@id'], plant)
  }
}
console.log(`📚 Loaded ${plants.size} plant entities`)

// Process all preparations
const prepFiles = findJsonLdFiles(preparationsDir)
console.log(`📋 Found ${prepFiles.length} preparation files`)
console.log('')

let removed = 0
let kept = 0
let noImage = 0
let noSource = 0

for (const file of prepFiles) {
  const prep = parseJsonLdFile(file)
  if (!prep) continue

  const prepName = prep['@id'] || file.split('/').slice(-2)[0]

  // Check if preparation has an image field
  if (!prep.image) {
    noImage++
    continue
  }

  const imagePath = join(ROOT, prep.image)
  const imageExists = existsSync(imagePath)

  // Get source plant
  let sourcePlant = null
  if (prep.derivedFrom) {
    // derivedFrom can be an array or object
    let derivedFromId = null
    if (Array.isArray(prep.derivedFrom)) {
      derivedFromId = prep.derivedFrom[0]?.['@id']
    } else if (prep.derivedFrom['@id']) {
      derivedFromId = prep.derivedFrom['@id']
    }

    if (derivedFromId) {
      sourcePlant = plants.get(derivedFromId)
    }
  }

  if (!sourcePlant) {
    console.log(`⚠️  ${prepName}: No source plant found for ${Array.isArray(prep.derivedFrom) ? prep.derivedFrom[0]?.['@id'] : prep.derivedFrom?.['@id'] || 'missing derivedFrom'}`)
    noSource++
    continue
  }

  // Decision logic:
  // 1. If preparation image exists AND is different from source plant image -> KEEP (preparation has its own image)
  // 2. If preparation image does NOT exist -> REMOVE (use source plant image)
  // 3. If preparation image exists AND is same as source plant image -> REMOVE (redundant)

  if (imageExists) {
    // Check if this is a dedicated preparation image (different from source)
    const prepImageName = prep.image.split('/').slice(-2)[0]
    const sourceImageName = sourcePlant.image?.split('/').slice(-2)[0]

    if (prepImageName !== sourceImageName) {
      // This is a dedicated preparation image (e.g., ginger-tea, ginseng-extract)
      console.log(`✅ KEEP: ${prepName} has dedicated image: ${prep.image}`)
      kept++
    } else {
      // Same as source - redundant
      console.log(`🔄 REMOVE: ${prepName} image is same as source: ${prep.image}`)
      if (!DRY_RUN) {
        delete prep.image
        writeJsonLdFile(file, prep)
      }
      removed++
    }
  } else {
    // Image doesn't exist - remove the broken reference
    console.log(`❌ REMOVE: ${prepName} image does not exist: ${prep.image}`)
    console.log(`   → Will use source plant image: ${sourcePlant.image || 'none'}`)
    if (!DRY_RUN) {
      delete prep.image
      writeJsonLdFile(file, prep)
    }
    removed++
  }
}

console.log('')
console.log('═══════════════════════════════════════════════════════════')
console.log('Summary')
console.log('═══════════════════════════════════════════════════════════')
console.log(`Preparations with no image field:    ${noImage}`)
console.log(`Images kept (dedicated prep images): ${kept}`)
console.log(`Images removed (broken/redundant):   ${removed}`)
console.log(`Preparations without source plant:   ${noSource}`)
console.log('')

if (DRY_RUN) {
  console.log('📋 This was a dry run. Run without --dry-run to make changes.')
} else {
  console.log('✅ Done! Run validation to verify changes.')
}

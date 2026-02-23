#!/usr/bin/env node

/**
 * Migrate Image Directories to Scientific Names
 *
 * This script:
 * 1. Reads all entity files to get scientific names
 * 2. Maps current image directory names to scientific name slugs
 * 3. Renames image directories
 * 4. Updates entity image references
 * 5. Updates attribution files
 *
 * Usage: node scripts/migrate-images-to-scientific.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const DRY_RUN = process.argv.includes('--dry-run')

// Track all changes
const changes = {
  directoriesRenamed: [],
  directoriesMerged: [],
  entitiesUpdated: [],
  metadataUpdated: [],
  errors: [],
  skipped: []
}

// Mapping from current slug to scientific name slug
const mapping = new Map()

/**
 * Slugify a scientific name
 */
function slugifyScientificName(name) {
  if (!name) return null
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Get scientific name from entity file
 */
function getScientificName(entityPath) {
  if (!fs.existsSync(entityPath)) return null

  try {
    const content = fs.readFileSync(entityPath, 'utf8')

    // Try scientificName first
    let match = content.match(/"scientificName"\s*:\s*"([^"]+)"/)
    if (match) return match[1]

    // For non-plant entities, might have different properties
    match = content.match(/"chemicalName"\s*:\s*"([^"]+)"/)
    if (match) return match[1]

    match = content.match(/"mineralName"\s*:\s*"([^"]+)"/)
    if (match) return match[1]

    return null
  } catch (e) {
    return null
  }
}

/**
 * Build mapping from all entity files
 */
function buildMapping() {
  console.log('📋 Building scientific name mapping...\n')

  // 1. Botanical species
  const speciesDir = path.join(ROOT, 'entities/botanical/species')
  if (fs.existsSync(speciesDir)) {
    const dirs = fs.readdirSync(speciesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    for (const slug of dirs) {
      const entityPath = path.join(speciesDir, slug, 'entity.jsonld')
      const scientificName = getScientificName(entityPath)

      if (scientificName) {
        const newSlug = slugifyScientificName(scientificName)
        if (newSlug && newSlug !== slug) {
          mapping.set(slug, { newSlug, scientificName, entityType: 'botanical' })
        } else if (newSlug === slug) {
          changes.skipped.push({ slug, reason: 'already scientific name' })
        }
      }
    }
  }

  console.log(`   Botanical species mapped: ${Array.from(mapping.values()).filter(m => m.entityType === 'botanical').length}`)

  // 2. Get existing image directories
  const imagesDir = path.join(ROOT, 'media/images')
  const imageDirs = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'banners')

  console.log(`   Total image directories: ${imageDirs.length}`)

  // Check which image dirs don't have mapping yet
  const mappedDirs = new Set(mapping.keys())
  const unmappedDirs = imageDirs.filter(dir => !mappedDirs.has(dir))

  if (unmappedDirs.length > 0) {
    console.log(`\n   Unmapped directories (no species entity):`)
    unmappedDirs.forEach(dir => {
      // For oils/extracts without species entities, keep current name
      changes.skipped.push({ slug: dir, reason: 'no species entity - keeping current name' })
    })
  }

  return mapping
}

/**
 * Merge source directory into target (when target already exists)
 */
function mergeDirectories(oldSlug, newSlug, scientificName) {
  const oldPath = path.join(ROOT, 'media/images', oldSlug)
  const newPath = path.join(ROOT, 'media/images', newSlug)

  if (!fs.existsSync(oldPath)) {
    // Source doesn't exist, skip silently
    return { status: 'skipped', reason: 'source not found' }
  }

  if (!fs.existsSync(newPath)) {
    // Target doesn't exist, do a regular rename instead
    return renameDirectory(oldSlug, newSlug)
  }

  // Both exist - merge
  const oldFiles = fs.readdirSync(oldPath)
  let merged = 0
  let skipped = 0

  for (const file of oldFiles) {
    const oldFile = path.join(oldPath, file)
    const newFile = path.join(newPath, file)

    if (!fs.existsSync(newFile)) {
      // File doesn't exist in target, copy it
      if (!DRY_RUN) {
        fs.copyFileSync(oldFile, newFile)
      }
      merged++
    } else {
      // File exists in both - keep target version
      skipped++
    }
  }

  // Remove old directory
  if (!DRY_RUN) {
    fs.rmSync(oldPath, { recursive: true })
  }

  changes.directoriesRenamed.push({ oldSlug, newSlug, action: 'merged', merged, skipped })
  return { status: 'merged', merged, skipped }
}

/**
 * Rename image directory
 */
function renameDirectory(oldSlug, newSlug) {
  const oldPath = path.join(ROOT, 'media/images', oldSlug)
  const newPath = path.join(ROOT, 'media/images', newSlug)

  if (!fs.existsSync(oldPath)) {
    changes.errors.push({ slug: oldSlug, error: 'directory not found' })
    return { status: 'error', error: 'directory not found' }
  }

  if (fs.existsSync(newPath)) {
    // Target exists - use merge instead
    return { status: 'exists', needsMerge: true }
  }

  if (!DRY_RUN) {
    fs.renameSync(oldPath, newPath)
  }

  changes.directoriesRenamed.push({ oldSlug, newSlug, action: 'renamed' })
  return { status: 'renamed' }
}

/**
 * Update entity image reference
 */
function updateEntityImageReference(oldSlug, newSlug) {
  const entityPath = path.join(ROOT, 'entities/botanical/species', oldSlug, 'entity.jsonld')

  if (!fs.existsSync(entityPath)) {
    return false
  }

  try {
    let content = fs.readFileSync(entityPath, 'utf8')

    // Update image path
    const oldPattern = new RegExp(`media/images/${oldSlug}/`, 'g')
    const newReplacement = `media/images/${newSlug}/`

    if (content.match(oldPattern)) {
      content = content.replace(oldPattern, newReplacement)

      if (!DRY_RUN) {
        fs.writeFileSync(entityPath, content)
      }

      changes.entitiesUpdated.push({ oldSlug, newSlug })
      return true
    }
  } catch (e) {
    changes.errors.push({ slug: oldSlug, error: e.message })
  }

  return false
}

/**
 * Update attribution/metadata file inside renamed directory
 */
function updateMetadataFile(newSlug, scientificName) {
  const metaPath = path.join(ROOT, 'media/images', newSlug, 'main.json')
  const attrPath = path.join(ROOT, 'media/images', newSlug, 'attribution.json')

  // Check for either main.json or attribution.json
  const usePath = fs.existsSync(metaPath) ? metaPath :
                  fs.existsSync(attrPath) ? attrPath : null

  if (!usePath) {
    return false
  }

  try {
    const content = fs.readFileSync(usePath, 'utf8')
    const data = JSON.parse(content)

    // Update species name if it was a common name
    if (data.species && data.species !== scientificName) {
      data.species = scientificName
    }

    if (!DRY_RUN) {
      fs.writeFileSync(usePath, JSON.stringify(data, null, 2) + '\n')
    }

    changes.metadataUpdated.push({ slug: newSlug })
    return true
  } catch (e) {
    changes.errors.push({ slug: newSlug, error: `metadata update: ${e.message}` })
  }

  return false
}

/**
 * Main function
 */
function main() {
  console.log('🔬 Image Directory Scientific Name Migration')
  console.log(DRY_RUN ? '   (DRY RUN - no changes will be made)\n' : '\n')

  // Build mapping
  buildMapping()

  console.log(`\n📝 Directories to rename: ${mapping.size}`)

  if (mapping.size === 0) {
    console.log('   No directories need renaming.')
    return
  }

  // Process each mapping
  console.log('\n🔄 Processing...\n')

  for (const [oldSlug, { newSlug, scientificName }] of mapping) {
    // Try to rename or merge directory
    const result = renameDirectory(oldSlug, newSlug)

    if (result.status === 'renamed') {
      // Update entity reference
      updateEntityImageReference(oldSlug, newSlug)

      // Update metadata file
      updateMetadataFile(newSlug, scientificName)

      console.log(`✓ ${oldSlug} → ${newSlug} (${scientificName})`)
    } else if (result.status === 'exists' || result.needsMerge) {
      // Target exists - merge instead
      const mergeResult = mergeDirectories(oldSlug, newSlug, scientificName)

      if (mergeResult.status === 'merged') {
        // Update entity reference
        updateEntityImageReference(oldSlug, newSlug)

        console.log(`✓ ${oldSlug} → ${newSlug} (merged: ${mergeResult.merged} files)`)
      } else if (mergeResult.status === 'skipped') {
        // Source didn't exist
      }
    } else if (result.status === 'error') {
      console.log(`✗ ${oldSlug}: ${result.error}`)
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  const renamed = changes.directoriesRenamed.filter(d => d.action === 'renamed').length
  const merged = changes.directoriesRenamed.filter(d => d.action === 'merged').length
  console.log(`   Directories renamed: ${renamed}`)
  console.log(`   Directories merged: ${merged}`)
  console.log(`   Entities updated: ${changes.entitiesUpdated.length}`)
  console.log(`   Metadata updated: ${changes.metadataUpdated.length}`)
  console.log(`   Skipped: ${changes.skipped.length}`)
  console.log(`   Errors: ${changes.errors.length}`)

  if (changes.errors.length > 0) {
    console.log('\n❌ Errors:')
    changes.errors.forEach(e => console.log(`   ${e.slug}: ${e.error}`))
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.')
  } else {
    console.log('\n✅ Migration complete!')
  }

  // Output full mapping for reference
  const mappingFile = path.join(ROOT, 'media/images/directory-mapping.json')
  const mappingData = {
    generated: new Date().toISOString(),
    description: 'Mapping from old directory names to scientific name directories',
    mappings: Object.fromEntries(mapping)
  }

  if (!DRY_RUN) {
    fs.writeFileSync(mappingFile, JSON.stringify(mappingData, null, 2))
    console.log(`\n📄 Full mapping saved to: media/images/directory-mapping.json`)
  }
}

main()

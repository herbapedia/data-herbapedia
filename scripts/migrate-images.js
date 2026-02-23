#!/usr/bin/env node

/**
 * Image Migration Script
 *
 * Migrates all images to standardized naming convention:
 * - Main image: main.jpg
 * - Additional images: main-2.jpg, flower.jpg, root.jpg, etc.
 * - Each image gets a corresponding metadata JSON file
 *
 * Usage: node scripts/migrate-images.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const DRY_RUN = process.argv.includes('--dry-run')

// Default attribution for Vita Green images
const DEFAULT_ATTRIBUTION = {
  copyright: 'Vita Green Health Products Ltd.',
  license: 'All rights reserved - used with permission',
  licenseUrl: null,
  source: 'Vita Green Health Products Ltd.',
  note: 'This image is copyrighted and used with permission from Vita Green Health Products Ltd.'
}

// Track all changes
const changes = {
  renamed: [],
  metadata: [],
  entities: [],
  errors: []
}

/**
 * Get all image directories
 */
function getImageDirectories() {
  const imagesDir = path.join(ROOT, 'media/images')
  return fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'banners') // Skip banners directory
}

/**
 * Get all image files in a directory
 */
function getImageFiles(dirName) {
  const dirPath = path.join(ROOT, 'media/images', dirName)
  if (!fs.existsSync(dirPath)) return []

  return fs.readdirSync(dirPath)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .filter(file => !file.startsWith('.')) // Skip hidden files
}

/**
 * Determine new filename for an image
 */
function determineNewFilename(oldFilename, allFiles, isOnlyImage) {
  const ext = path.extname(oldFilename).toLowerCase()

  // If it's the only image, use main.jpg
  if (isOnlyImage) {
    return 'main' + ext
  }

  // Check if filename already indicates a part/type
  const baseName = path.basename(oldFilename, ext).toLowerCase()

  // Known part/type patterns
  const partPatterns = ['flower', 'fruit', 'leaf', 'root', 'rhizome', 'seed',
                        'bark', 'stem', 'whole', 'plant', 'detail', 'closeup']

  // If filename already has a descriptive name, keep it
  if (partPatterns.some(p => baseName.includes(p))) {
    return baseName + ext
  }

  // If multiple generic images, number them
  if (baseName === 'main' || baseName.match(/main-\d+/)) {
    return baseName + ext
  }

  // For first image, make it main.jpg
  const sortedFiles = allFiles.sort()
  const firstFile = sortedFiles[0]

  if (oldFilename === firstFile) {
    return 'main' + ext
  }

  // For others, use main-2, main-3, etc.
  const mainCount = allFiles.filter(f =>
    path.basename(f, path.extname(f)).match(/^main(-\d+)?$/)
  ).length

  return `main-${mainCount + 1}${ext}`
}

/**
 * Create attribution metadata for an image
 */
function createAttribution(dirName, filename) {
  const metadataPath = path.join(ROOT, 'media/images', dirName, `${path.basename(filename, path.extname(filename))}.json`)

  // Check if metadata already exists
  if (fs.existsSync(metadataPath)) {
    return { exists: true, path: metadataPath }
  }

  // Try to find entity for this directory to get species info
  let speciesInfo = {}
  const entityPath = path.join(ROOT, 'entities/botanical/species', dirName, 'entity.jsonld')
  if (fs.existsSync(entityPath)) {
    try {
      const entity = JSON.parse(fs.readFileSync(entityPath, 'utf8'))
      speciesInfo = {
        species: entity.scientificName || dirName,
        commonName: entity.name?.en || dirName
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const metadata = {
    fileName: filename,
    ...speciesInfo,
    attribution: DEFAULT_ATTRIBUTION,
    downloaded: new Date().toISOString().split('T')[0]
  }

  return { exists: false, path: metadataPath, data: metadata }
}

/**
 * Update entity file with new image path
 */
function updateEntityImage(dirName, oldImageRef, newImageRef) {
  // Try common name directory first, then look for Latin name entity
  let entityPath = path.join(ROOT, 'entities/botanical/species', dirName, 'entity.jsonld')

  if (!fs.existsSync(entityPath)) {
    changes.errors.push({ dir: dirName, error: 'Entity file not found' })
    return false
  }

  try {
    let content = fs.readFileSync(entityPath, 'utf8')

    // Find and replace image reference
    const imagePattern = new RegExp(`"image"\\s*:\\s*"[^"]*${oldImageRef}[^"]*"`, 'g')
    const newRef = `media/images/${dirName}/${newImageRef}`

    if (content.match(imagePattern)) {
      content = content.replace(imagePattern, `"image": "${newRef}"`)

      if (!DRY_RUN) {
        fs.writeFileSync(entityPath, content)
      }

      changes.entities.push({ dir: dirName, old: oldImageRef, new: newRef })
      return true
    }
  } catch (e) {
    changes.errors.push({ dir: dirName, error: e.message })
  }

  return false
}

/**
 * Process a single directory
 */
function processDirectory(dirName) {
  const dirPath = path.join(ROOT, 'media/images', dirName)
  const files = getImageFiles(dirName)

  if (files.length === 0) {
    return { dir: dirName, status: 'no-images' }
  }

  // Check if already migrated (has main.jpg and main.json)
  const hasMain = files.some(f => f.toLowerCase().startsWith('main.'))
  const hasAttribution = fs.existsSync(path.join(dirPath, 'main.json'))

  if (hasMain && hasAttribution && files.length === 1) {
    return { dir: dirName, status: 'already-migrated' }
  }

  const results = []
  const isOnlyImage = files.length === 1

  for (const file of files) {
    const oldPath = path.join(dirPath, file)
    const newFilename = determineNewFilename(file, files, isOnlyImage)
    const newPath = path.join(dirPath, newFilename)

    // Rename file if needed
    if (file !== newFilename) {
      if (!DRY_RUN) {
        fs.renameSync(oldPath, newPath)
      }
      changes.renamed.push({ dir: dirName, old: file, new: newFilename })

      // Update entity reference
      updateEntityImage(dirName, file, newFilename)
    }

    // Create attribution metadata
    const attribution = createAttribution(dirName, newFilename)
    if (!attribution.exists) {
      if (!DRY_RUN) {
        fs.writeFileSync(attribution.path, JSON.stringify(attribution.data, null, 2))
      }
      changes.metadata.push({ dir: dirName, file: newFilename })
    }

    results.push({ old: file, new: newFilename })
  }

  return { dir: dirName, status: 'migrated', files: results }
}

/**
 * Main function
 */
function main() {
  console.log('🖼️  Image Migration Script')
  console.log(DRY_RUN ? '   (DRY RUN - no changes will be made)\n' : '\n')

  const directories = getImageDirectories()
  console.log(`Found ${directories.length} image directories\n`)

  const results = []

  for (const dir of directories) {
    const result = processDirectory(dir)
    results.push(result)

    if (result.status === 'migrated') {
      console.log(`✓ ${dir}: ${result.files.length} file(s) processed`)
    } else if (result.status === 'already-migrated') {
      console.log(`○ ${dir}: already migrated`)
    } else {
      console.log(`- ${dir}: ${result.status}`)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Files renamed: ${changes.renamed.length}`)
  console.log(`   Metadata created: ${changes.metadata.length}`)
  console.log(`   Entities updated: ${changes.entities.length}`)
  console.log(`   Errors: ${changes.errors.length}`)

  if (changes.errors.length > 0) {
    console.log('\n❌ Errors:')
    changes.errors.forEach(e => console.log(`   ${e.dir}: ${e.error}`))
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.')
  } else {
    console.log('\n✅ Migration complete!')
  }
}

main()

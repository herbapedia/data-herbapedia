#!/usr/bin/env node

/**
 * Add SPDX identifiers to all metadata files that don't have them
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// Directories that already have proper SPDX from external sources
const EXTERNAL_SOURCES = [
  'matricaria-chamomilla',
  'crataegus-pinnatifida',
  'curcuma-longa',
  'valeriana-officinalis'
]

function processDirectory(dirName) {
  if (EXTERNAL_SOURCES.includes(dirName)) {
    return { status: 'skipped', reason: 'external source' }
  }

  const metaPath = path.join(ROOT, 'media/images', dirName, 'main.json')

  if (!fs.existsSync(metaPath)) {
    return { status: 'skipped', reason: 'no metadata file' }
  }

  try {
    const content = fs.readFileSync(metaPath, 'utf8')
    const data = JSON.parse(content)

    // Check if SPDX already exists
    if (data.attribution?.spdxId) {
      return { status: 'already-has-spdx' }
    }

    // Add SPDX fields
    if (!data.attribution) {
      data.attribution = {}
    }

    data.attribution.spdxId = 'NONE'
    data.attribution.spdxUrl = null

    // Ensure other required fields exist
    if (!data.attribution.copyright) {
      data.attribution.copyright = 'Vita Green Health Products Ltd.'
    }
    if (!data.attribution.license) {
      data.attribution.license = 'All rights reserved - used with permission'
    }

    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n')
    return { status: 'updated' }
  } catch (e) {
    return { status: 'error', error: e.message }
  }
}

function main() {
  const imagesDir = path.join(ROOT, 'media/images')
  const dirs = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'banners')

  const results = {
    updated: 0,
    skipped: 0,
    alreadyHas: 0,
    errors: 0
  }

  for (const dir of dirs) {
    const result = processDirectory(dir)

    switch (result.status) {
      case 'updated':
        results.updated++
        console.log(`✓ ${dir}`)
        break
      case 'already-has-spdx':
        results.alreadyHas++
        break
      case 'skipped':
        results.skipped++
        break
      case 'error':
        results.errors++
        console.log(`✗ ${dir}: ${result.error}`)
        break
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Updated: ${results.updated}`)
  console.log(`   Already had SPDX: ${results.alreadyHas}`)
  console.log(`   Skipped: ${results.skipped}`)
  console.log(`   Errors: ${results.errors}`)
}

main()

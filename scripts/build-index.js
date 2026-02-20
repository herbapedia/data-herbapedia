#!/usr/bin/env node

/**
 * Herbapedia Data Index Builder
 *
 * Generates index files for efficient data loading by the herbapedia site.
 * Creates:
 * - index.json: Main index with all plants and their categories
 * - tcm-index.json: TCM herb profiles with quick lookup
 * - categories.json: Category definitions and counts
 *
 * Usage:
 *   node scripts/build-index.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// Category mapping from TCM profiles to site categories
const TCM_CATEGORY_MAP = {
  'tonify-qi': 'chinese-herbs',
  'tonify-blood': 'chinese-herbs',
  'tonify-yin': 'chinese-herbs',
  'tonify-yang': 'chinese-herbs',
  'clear-heat': 'chinese-herbs',
  'drain-damp': 'chinese-herbs',
  'transform-phlegm': 'chinese-herbs',
  'regulate-qi': 'chinese-herbs',
  'invigorate-blood': 'chinese-herbs',
  'calm-spirit': 'chinese-herbs',
  'aromatize': 'chinese-herbs',
  'tonify-qi-and-yin': 'chinese-herbs',
  'digestion': 'chinese-herbs',
  'external': 'chinese-herbs',
  'reduce-swelling': 'chinese-herbs',
  'stop-bleeding': 'chinese-herbs',
}

/**
 * Find all JSON-LD files in a directory
 */
function findJsonLdFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = existsSync(fullPath) && statSync(fullPath)
    if (stat && stat.isDirectory()) {
      findJsonLdFiles(fullPath, files)
    } else if (entry.endsWith('.jsonld')) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Parse a JSON-LD file and extract key data
 */
function parseJsonLdFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    return data
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`)
    return null
  }
}

/**
 * Get the slug from a file path
 */
function getSlugFromPath(filePath, baseDir) {
  const relativePath = relative(baseDir, filePath)
  const parts = relativePath.split('/')
  // For plants: entities/plants/{slug}/entity.jsonld
  // For TCM: systems/tcm/herbs/{slug}/profile.jsonld
  return parts[parts.length - 2]
}

/**
 * Determine category from TCM profile
 */
function getCategoryFromTcmProfile(tcmData) {
  const categoryRef = tcmData.hasCategory
  if (categoryRef && typeof categoryRef === 'object' && categoryRef['@id']) {
    const categoryId = categoryRef['@id'].replace('category/', '')
    return TCM_CATEGORY_MAP[categoryId] || 'chinese-herbs'
  }
  return 'chinese-herbs'
}

/**
 * Build the main plant index
 */
function buildPlantIndex() {
  const plantsDir = join(ROOT, 'entities', 'plants')
  const plantFiles = findJsonLdFiles(plantsDir)

  const plants = []

  for (const filePath of plantFiles) {
    if (filePath.endsWith('/entity.jsonld')) {
      const data = parseJsonLdFile(filePath)
      if (!data) continue

      const slug = getSlugFromPath(filePath, plantsDir)

      // Extract localized name
      const name = data.name || {}
      const enName = name.en || name['zh-Hant'] || name['zh-Hans'] || slug

      // Extract common names
      const commonName = data.commonName || {}

      plants.push({
        slug,
        type: 'plant',
        name: name,
        commonName: commonName,
        scientificName: data.scientificName || null,
        family: data.family || null,
        image: data.image || null
      })
    }
  }

  return plants
}

/**
 * Build TCM profiles index
 */
function buildTcmIndex() {
  const tcmDir = join(ROOT, 'systems', 'tcm', 'herbs')
  const tcmFiles = findJsonLdFiles(tcmDir)

  const tcmHerbs = []

  for (const filePath of tcmFiles) {
    if (filePath.endsWith('/profile.jsonld')) {
      const data = parseJsonLdFile(filePath)
      if (!data) continue

      const slug = getSlugFromPath(filePath, tcmDir)
      const category = getCategoryFromTcmProfile(data)

      // Extract derived plant
      let plantSlug = null
      if (data.derivedFromPlant && typeof data.derivedFromPlant === 'object') {
        const plantRef = data.derivedFromPlant['@id']
        if (plantRef) {
          plantSlug = plantRef.replace('plant/', '').replace('#root', '')
        }
      }

      // Extract localized name
      const name = data.name || {}

      tcmHerbs.push({
        slug,
        tcmSlug: slug,
        type: 'tcm-herb',
        category,
        plantSlug,
        name,
        pinyin: data.pinyin || null,
        chineseName: data.chineseName || null,
        hasCategory: data.hasCategory,
        hasNature: data.hasNature,
        hasFlavor: data.hasFlavor,
        entersMeridian: data.entersMeridian
      })
    }
  }

  return tcmHerbs
}

/**
 * Merge plant and TCM data for display
 */
function buildMergedIndex(plants, tcmHerbs) {
  const plantMap = new Map()
  for (const plant of plants) {
    plantMap.set(plant.slug, plant)
  }

  const merged = []
  const categoryCounts = {
    'chinese-herbs': 0,
    'western-herbs': 0,
    'vitamins': 0,
    'minerals': 0,
    'nutrients': 0
  }

  for (const tcm of tcmHerbs) {
    const plant = plantMap.get(tcm.plantSlug)

    const herbEntry = {
      slug: tcm.plantSlug,
      tcmSlug: tcm.slug,
      category: tcm.category,
      type: 'herb',
      name: plant?.name || tcm.name,
      commonName: plant?.commonName || {},
      scientificName: plant?.scientificName || null,
      family: plant?.family || null,
      pinyin: tcm.pinyin,
      chineseName: tcm.chineseName,
      hasNature: tcm.hasNature,
      hasFlavor: tcm.hasFlavor,
      entersMeridian: tcm.entersMeridian,
      image: plant?.image || null
    }

    merged.push(herbEntry)

    if (categoryCounts[tcm.category] !== undefined) {
      categoryCounts[tcm.category]++
    }
  }

  // Add plants without TCM profiles (western herbs, vitamins, minerals, etc.)
  const tcmPlantSlugs = new Set(tcmHerbs.map(t => t.plantSlug))
  for (const plant of plants) {
    if (!tcmPlantSlugs.has(plant.slug)) {
      // Determine category from slug patterns
      let category = 'western-herbs'
      if (plant.slug.includes('vitamin-')) {
        category = 'vitamins'
      } else if (['calcium', 'copper', 'iodine', 'iron', 'magnesium', 'manganese', 'potassium', 'selenium', 'zinc'].includes(plant.slug)) {
        category = 'minerals'
      } else if (['choline', 'chondroitin', 'glucosamine', 'inositol', 'lecithin', 'lysine', 'melatonin', 'methionine'].some(n => plant.slug.includes(n))) {
        category = 'nutrients'
      }

      merged.push({
        slug: plant.slug,
        category,
        type: 'plant',
        name: plant.name,
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        family: plant.family,
        image: plant.image
      })

      categoryCounts[category]++
    }
  }

  return { merged, categoryCounts }
}

/**
 * Main function
 */
function build() {
  console.log('Building Herbapedia data index...\n')

  // Build indexes
  console.log('  - Parsing plant entities...')
  const plants = buildPlantIndex()
  console.log(`    Found ${plants.length} plant entities`)

  console.log('  - Parsing TCM profiles...')
  const tcmHerbs = buildTcmIndex()
  console.log(`    Found ${tcmHerbs.length} TCM herb profiles`)

  console.log('  - Merging data...')
  const { merged, categoryCounts } = buildMergedIndex(plants, tcmHerbs)
  console.log(`    Merged ${merged.length} herbs across categories`)

  // Create output index
  const index = {
    version: '1.0',
    generated: new Date().toISOString(),
    counts: {
      plants: plants.length,
      tcmHerbs: tcmHerbs.length,
      total: merged.length,
      categories: categoryCounts
    },
    categories: Object.entries(categoryCounts).map(([slug, count]) => ({
      slug,
      count
    })),
    herbs: merged
  }

  // Create categories index with localized labels
  const categoriesIndex = {
    version: '1.0',
    generated: new Date().toISOString(),
    categories: [
      {
        slug: 'chinese-herbs',
        title: { en: 'Chinese Herbs', 'zh-Hant': '中藥', 'zh-Hans': '中药' },
        description: { en: 'Traditional Chinese Medicine herbs', 'zh-Hant': '傳統中藥材', 'zh-Hans': '传统中药材' },
        count: categoryCounts['chinese-herbs']
      },
      {
        slug: 'western-herbs',
        title: { en: 'Western Herbs', 'zh-Hant': '西方草本', 'zh-Hans': '西方草本' },
        description: { en: 'Western herbal medicine herbs', 'zh-Hant': '西方草本醫學', 'zh-Hans': '西方草本医学' },
        count: categoryCounts['western-herbs']
      },
      {
        slug: 'vitamins',
        title: { en: 'Vitamins', 'zh-Hant': '維生素', 'zh-Hans': '维生素' },
        description: { en: 'Essential vitamins for health', 'zh-Hant': '健康必需維生素', 'zh-Hans': '健康必需维生素' },
        count: categoryCounts['vitamins']
      },
      {
        slug: 'minerals',
        title: { en: 'Minerals', 'zh-Hant': '礦物質', 'zh-Hans': '矿物质' },
        description: { en: 'Essential minerals for health', 'zh-Hant': '健康必需礦物質', 'zh-Hans': '健康必需矿物质' },
        count: categoryCounts['minerals']
      },
      {
        slug: 'nutrients',
        title: { en: 'Nutrients', 'zh-Hant': '營養素', 'zh-Hans': '营养素' },
        description: { en: 'Essential nutrients and supplements', 'zh-Hant': '必需營養素', 'zh-Hans': '必需营养素' },
        count: categoryCounts['nutrients']
      }
    ]
  }

  // Ensure output directory exists
  const outputDir = join(ROOT, 'dist')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write index files
  console.log('\n  Writing index files...')
  writeFileSync(join(outputDir, 'index.json'), JSON.stringify(index, null, 2))
  writeFileSync(join(outputDir, 'categories.json'), JSON.stringify(categoriesIndex, null, 2))
  writeFileSync(join(outputDir, 'plants.json'), JSON.stringify(plants, null, 2))
  writeFileSync(join(outputDir, 'tcm-herbs.json'), JSON.stringify(tcmHerbs, null, 2))

  console.log('  - dist/index.json')
  console.log('  - dist/categories.json')
  console.log('  - dist/plants.json')
  console.log('  - dist/tcm-herbs.json')

  console.log('\n✅ Index build complete!')
  console.log(`   Total herbs: ${merged.length}`)
  console.log(`   Categories: ${Object.entries(categoryCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
}

build()

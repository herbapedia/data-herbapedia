#!/usr/bin/env node

/**
 * Herbapedia YAML to JSON-LD Migration Script
 *
 * Migrates herb data from YAML format to JSON-LD with proper
 * system-scoped content properties.
 *
 * Usage:
 *   node scripts/migrate-yaml-to-jsonld.js              # Migrate all
 *   node scripts/migrate-yaml-to-jsonld.js --dry-run    # Preview without writing
 *   node scripts/migrate-yaml-to-jsonld.js --herb ginseng  # Migrate specific herb
 *   node scripts/migrate-yaml-to-jsonld.js --category chinese-herbs  # Migrate category
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const ROOT = join(__dirname, '..')
const SOURCE_DIR = join(ROOT, '..', 'herbapedia', 'src', 'content', 'herbs')
const TARGET_DIR = ROOT

// TCM Category mappings (YAML category → TCM category IRI)
const TCM_CATEGORY_MAP = {
  // Chinese herbs have various TCM categories
  // We'll map common ones; others will need manual review
  'chinese-herbs': null, // Will need to be determined per herb
  'western-herbs': null,
  'vitamins': null,
  'minerals': null,
  'nutrients': null,
}

// Language code mappings
const LANG_MAP = {
  'en': 'en',
  'zh-HK': 'zh-Hant',
  'zh-CN': 'zh-Hans',
}

// Statistics
const stats = {
  processed: 0,
  plants: 0,
  profiles: 0,
  skipped: 0,
  errors: [],
}

/**
 * Load all herb data from YAML files
 */
function loadHerbData() {
  const herbs = new Map()

  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`)
    console.error('Make sure herbapedia repo is at ../herbapedia')
    process.exit(1)
  }

  const herbDirs = readdirSync(SOURCE_DIR).filter(f => {
    const fullPath = join(SOURCE_DIR, f)
    return statSync(fullPath).isDirectory() && f !== 'images'
  })

  for (const herbSlug of herbDirs) {
    const herbPath = join(SOURCE_DIR, herbSlug)
    const herbData = {
      slug: herbSlug,
      languages: {},
    }

    // Load each language file
    for (const langFile of ['en.yaml', 'zh-HK.yaml', 'zh-CN.yaml']) {
      const langPath = join(herbPath, langFile)
      if (existsSync(langPath)) {
        try {
          const content = readFileSync(langPath, 'utf-8')
          const langCode = langFile.replace('.yaml', '')
          herbData.languages[langCode] = yaml.parse(content)
        } catch (error) {
          console.warn(`Warning: Failed to parse ${langPath}: ${error.message}`)
        }
      }
    }

    // Get category from any language file
    const anyLang = herbData.languages.en || herbData.languages['zh-HK'] || herbData.languages['zh-CN']
    if (anyLang) {
      herbData.category = anyLang.category
      herbs.set(herbSlug, herbData)
    }
  }

  return herbs
}

/**
 * Generate Plant entity (language-agnostic botanical data)
 */
function generatePlantEntity(herbData) {
  const enData = herbData.languages.en || {}
  const zhHKData = herbData.languages['zh-HK'] || {}
  const zhCNData = herbData.languages['zh-CN'] || {}

  const plant = {
    '@context': '../../schema/context/core.jsonld',
    '@id': `plant/${herbData.slug}`,
    '@type': ['schema:Plant', 'herbapedia:MedicinalPlant'],
  }

  // Scientific name
  if (enData.scientific_name) {
    plant.scientificName = enData.scientific_name
  }

  // Names (multilingual)
  const names = {}
  if (enData.title) names.en = enData.title
  if (zhHKData.title) names['zh-Hant'] = zhHKData.title
  if (zhCNData.title) names['zh-Hans'] = zhCNData.title
  if (Object.keys(names).length > 0) {
    plant.name = names
  }

  // Common names / alternate names
  if (enData.english_title && enData.english_title !== enData.title) {
    plant.commonName = { en: enData.english_title }
  }

  // Description (brief botanical description)
  if (enData.introduction) {
    plant.description = { en: enData.introduction }
  }

  // Botanical source (as botanical description)
  const botanicalDesc = {}
  if (enData.botanical_source) botanicalDesc.en = enData.botanical_source
  if (zhHKData.botanical_source) botanicalDesc['zh-Hant'] = zhHKData.botanical_source
  if (Object.keys(botanicalDesc).length > 0) {
    plant.botanicalDescription = botanicalDesc
  }

  // Food sources (for vitamins, minerals, nutrients)
  if (enData.food_sources && Array.isArray(enData.food_sources)) {
    plant.foodSources = enData.food_sources
  }

  // Image
  if (enData.image) {
    // Handle various image path formats
    let imagePath = enData.image
    if (imagePath.startsWith('images/')) {
      imagePath = imagePath.replace('images/', '')
    }
    plant.image = `media/images/${herbData.slug}/${imagePath}`
  }

  // URL
  plant.url = `https://herbapedia.org/plants/${herbData.slug}`

  // Provenance
  if (enData.metadata) {
    if (enData.metadata.source) plant.source = enData.metadata.source
    if (enData.metadata.source_url) plant.sourceUrl = enData.metadata.source_url
    if (enData.metadata.scraped_at) plant.created = enData.metadata.scraped_at
  }
  plant.license = 'https://creativecommons.org/licenses/by-sa/4.0/'

  return plant
}

/**
 * Generate TCM Herb Profile
 */
function generateTCMProfile(herbData) {
  const enData = herbData.languages.en || {}
  const zhHKData = herbData.languages['zh-HK'] || {}
  const zhCNData = herbData.languages['zh-CN'] || {}

  const profile = {
    '@context': '../../schema/context/tcm.jsonld',
    '@id': `tcm/${herbData.slug}`,
    '@type': ['tcm:Herb', 'schema:DietarySupplement'],
  }

  // Link to plant
  profile.derivedFromPlant = { '@id': `plant/${herbData.slug}` }

  // Names
  const names = {}
  if (enData.title) names.en = enData.title
  if (zhHKData.title) names['zh-Hant'] = zhHKData.title
  if (zhCNData.title) names['zh-Hans'] = zhCNData.title
  if (Object.keys(names).length > 0) {
    profile.name = names
  }

  // Pinyin (extract from title or english_title)
  if (enData.english_title) {
    profile.pinyin = enData.english_title
  } else if (enData.title) {
    profile.pinyin = enData.title
  }

  // Chinese name
  const chineseName = {}
  if (zhHKData.title) chineseName['zh-Hant'] = zhHKData.title
  if (zhCNData.title) chineseName['zh-Hans'] = zhCNData.title
  if (Object.keys(chineseName).length > 0) {
    profile.chineseName = chineseName
  }

  // Category - NOTE: This needs manual mapping
  // For now, we'll add a placeholder
  if (herbData.category === 'chinese-herbs') {
    profile.hasCategory = { '@id': 'category/tonify-qi' } // Default, needs review
    profile._needsCategoryReview = true
  }

  // TCM properties - NOTE: These need to be extracted from content
  // For now, add placeholders
  profile.hasNature = { '@id': 'nature/neutral' } // Default, needs review
  profile.hasFlavor = [{ '@id': 'flavor/sweet' }] // Default, needs review
  profile.entersMeridian = [{ '@id': 'meridian/spleen' }] // Default, needs review
  profile._needsTCMPropertiesReview = true

  // TCM-scoped content (IMPORTANT: Use tcm:* prefix, not generic)
  if (enData.history || zhHKData.history) {
    const history = {}
    if (enData.history) history.en = enData.history
    if (zhHKData.history) history['zh-Hant'] = zhHKData.history
    if (Object.keys(history).length > 0) profile.tcmHistory = history
  }

  if (enData.traditional_usage || zhHKData.traditional_usage) {
    const usage = {}
    if (enData.traditional_usage) usage.en = enData.traditional_usage
    if (zhHKData.traditional_usage) usage['zh-Hant'] = zhHKData.traditional_usage
    if (Object.keys(usage).length > 0) profile.tcmTraditionalUsage = usage
  }

  if (enData.modern_usage) {
    profile.tcmModernResearch = { en: enData.modern_usage }
  }

  if (enData.functions || zhHKData.functions) {
    const functions = {}
    if (enData.functions) functions.en = enData.functions
    if (zhHKData.functions) functions['zh-Hant'] = zhHKData.functions
    if (Object.keys(functions).length > 0) profile.tcmFunctions = functions
  }

  if (enData.importance) {
    profile.tcmImportance = { en: enData.importance }
  }

  if (enData.botanical_source) {
    profile.tcmBotanicalSource = { en: enData.botanical_source }
  }

  // Provenance
  if (enData.metadata) {
    if (enData.metadata.source) profile.source = enData.metadata.source
    if (enData.metadata.scraped_at) profile.created = enData.metadata.scraped_at
  }
  profile.license = 'https://creativecommons.org/licenses/by-sa/4.0/'

  return profile
}

/**
 * Clean up profile for output (remove internal flags)
 */
function cleanProfile(profile) {
  const cleaned = { ...profile }
  delete cleaned._needsCategoryReview
  delete cleaned._needsTCMPropertiesReview
  return cleaned
}

/**
 * Write JSON-LD file with pretty formatting
 */
function writeJsonLd(filePath, data, dryRun = false) {
  const content = JSON.stringify(data, null, 2) + '\n'

  if (dryRun) {
    console.log(`\n--- ${filePath} ---`)
    console.log(content.substring(0, 500) + '...')
    return
  }

  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Migrate a single herb
 */
function migrateHerb(herbData, options = {}) {
  const { dryRun = false, category = null } = options

  // Skip if category filter doesn't match
  if (category && herbData.category !== category) {
    return { skipped: true }
  }

  console.log(`\n📦 Processing: ${herbData.slug} (${herbData.category})`)

  // Generate Plant entity
  const plant = generatePlantEntity(herbData)
  const plantPath = join(TARGET_DIR, 'entities', 'plants', herbData.slug, 'entity.jsonld')
  writeJsonLd(plantPath, plant, dryRun)
  stats.plants++

  // Generate TCM Profile for Chinese herbs
  if (herbData.category === 'chinese-herbs') {
    const profile = generateTCMProfile(herbData)
    const profilePath = join(TARGET_DIR, 'systems', 'tcm', 'herbs', herbData.slug, 'profile.jsonld')
    writeJsonLd(profilePath, cleanProfile(profile), dryRun)
    stats.profiles++

    if (profile._needsCategoryReview || profile._needsTCMPropertiesReview) {
      console.log(`  ⚠️  Needs review: TCM properties`)
    }
  }

  stats.processed++
  return { success: true }
}

/**
 * Main migration function
 */
function migrate(options = {}) {
  console.log('🔄 Herbapedia YAML → JSON-LD Migration\n')
  console.log(`Source: ${SOURCE_DIR}`)
  console.log(`Target: ${TARGET_DIR}\n`)

  if (options.dryRun) {
    console.log('👁️ DRY RUN - No files will be written\n')
  }

  // Load all herb data
  console.log('📂 Loading herb data...')
  const herbs = loadHerbData()
  console.log(`Found ${herbs.size} herbs\n`)

  // Group by category for progress tracking
  const byCategory = new Map()
  for (const [slug, data] of herbs) {
    const cat = data.category || 'unknown'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat).push(data)
  }

  console.log('📊 Category distribution:')
  for (const [cat, items] of byCategory) {
    console.log(`   ${cat}: ${items.length}`)
  }
  console.log('')

  // Process herbs
  const herbList = options.herb
    ? [herbs.get(options.herb)].filter(Boolean)
    : Array.from(herbs.values())

  for (const herbData of herbList) {
    try {
      migrateHerb(herbData, options)
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`)
      stats.errors.push({ slug: herbData.slug, error: error.message })
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50))
  console.log('\n📊 Migration Summary\n')
  console.log(`  Herbs processed: ${stats.processed}`)
  console.log(`  Plant entities:  ${stats.plants}`)
  console.log(`  TCM profiles:    ${stats.profiles}`)
  console.log(`  Skipped:         ${stats.skipped}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    for (const { slug, error } of stats.errors) {
      console.log(`   ${slug}: ${error}`)
    }
  }

  console.log('\n✅ Migration complete!')

  if (!options.dryRun) {
    console.log('\n📋 Next steps:')
    console.log('   1. Run: npm run validate')
    console.log('   2. Review TCM properties (nature, flavor, meridian)')
    console.log('   3. Add proper TCM category mappings')
    console.log('   4. Link to Wikidata entities')
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  dryRun: args.includes('--dry-run'),
  herb: null,
  category: null,
}

const herbIndex = args.indexOf('--herb')
if (herbIndex !== -1 && args[herbIndex + 1]) {
  options.herb = args[herbIndex + 1]
}

const catIndex = args.indexOf('--category')
if (catIndex !== -1 && args[catIndex + 1]) {
  options.category = args[catIndex + 1]
}

// Run migration
migrate(options)

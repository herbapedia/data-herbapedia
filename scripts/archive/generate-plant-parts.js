#!/usr/bin/env node
/**
 * Generate PlantPart entities for plant species that don't have them yet.
 *
 * This script:
 * 1. Identifies which species are actual plants (have scientificName or family)
 * 2. Analyzes preparation references to determine common part types
 * 3. Generates PlantPart entities with proper bidirectional linking
 * 4. Updates parent PlantSpecies with hasParts references
 *
 * Usage:
 *   node scripts/generate-plant-parts.js [--dry-run] [--limit N]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0')

// Directories
const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const PARTS_DIR = path.join(ROOT_DIR, 'entities/botanical/parts')
const PREPARATIONS_DIR = path.join(ROOT_DIR, 'entities/preparations')

// Non-plant entities that should NOT have PlantParts
const NON_PLANT_PATTERNS = [
  /^vitamin-/,
  /^calcium$/, /^copper$/, /^iodine$/, /^iron$/, /^magnesium$/, /^manganese$/, /^potassium$/, /^selenium$/, /^zinc$/,
  /^chitosan$/, /^choline$/, /^lecithin$/, /^phospholipids$/, /^glycerin$/,
  /^ceramides$/, /^squalene$/, /^linolenic-acid$/, /^melatonin$/,
  /^mineral-oil$/, /^petrolatum$/,
  /^royal-jelly$/, /^birds-nest$/, /^deer-antler$/, /^deer-horn/, /^dragon-bone$/, /^honey$/,
  /^factor-arl$/, /^hydration-factor-cte4$/, /^epicutin-tt$/,
  /-oil$/, /-extract$/, /^amber$/
]

// Fungi that need special handling (use whole-plant)
const FUNGI_PATTERNS = [
  /^cordyceps$/, /^lingzhi/, /^reishi$/, /^maitake$/, /^shiitake$/, /^turkey-tail$/
]

// Seaweeds/algae (use whole-plant)
const ALGAE_PATTERNS = [
  /^algae$/, /^seaweed/, /^kelp$/, /^nori$/, /^dulse$/, /^spirulina$/
]

// Map preparation slug patterns to part types
const PART_TYPE_PATTERNS = {
  'rhizome': /rhizome|turmeric|ginger|galangal/,
  'root': /root|ginseng|ashwagandha|licorice|dandelion|burdock|valerian|elecampane/,
  'leaf': /leaf|tea|basil|mint|sage|thyme|oregano|oregano|rosemary|lavender|eucalyptus/,
  'flower': /flower|chamomile|chrysanthemum|calendula|hibiscus|lavender|safflower|cloves?$/,
  'fruit': /fruit|hawthorn|berry|schisandra|goji|jujube|orange|lemon|citrus|pepper|cardamom|fennel|anise/,
  'seed': /seed|sesame|flax|psyllium|fennel|caraway|coriander|cumin|mustard|cardamom/,
  'bark': /bark|cinnamon|willow|oak|magnolia/,
  'stem': /stem|twig|branch|cinnamon/,
  'whole-plant': /whole|aerial|plant$/,
  'aerial-part': /aerial|above/
}

// Infer part type from slug
function inferPartType(slug, speciesData) {
  const speciesSlug = slug.toLowerCase()

  // Check for fungi - use whole-plant
  if (FUNGI_PATTERNS.some(p => p.test(speciesSlug))) {
    return 'whole-plant'
  }

  // Check for algae/seaweed - use whole-plant
  if (ALGAE_PATTERNS.some(p => p.test(speciesSlug))) {
    return 'whole-plant'
  }

  // Check species name for hints
  for (const [partType, pattern] of Object.entries(PART_TYPE_PATTERNS)) {
    if (pattern.test(speciesSlug)) {
      return partType
    }
  }

  // Check scientific name for hints
  const scientificName = (speciesData.scientificName || '').toLowerCase()
  if (scientificName.includes('rhizome') || scientificName.includes('zingiber') || scientificName.includes('curcuma')) {
    return 'rhizome'
  }
  if (scientificName.includes('folium') || scientificName.includes('leaf')) {
    return 'leaf'
  }
  if (scientificName.includes('cortex') || scientificName.includes('bark')) {
    return 'bark'
  }
  if (scientificName.includes('flos') || scientificName.includes('flower')) {
    return 'flower'
  }
  if (scientificName.includes('fructus') || scientificName.includes('fruit')) {
    return 'fruit'
  }
  if (scientificName.includes('semen') || scientificName.includes('seed')) {
    return 'seed'
  }
  if (scientificName.includes('radix') || scientificName.includes('root')) {
    return 'root'
  }

  // Default to root for most medicinal plants
  return 'root'
}

// Get common part type names for display
function getPartTypeName(partType, lang = 'en') {
  const names = {
    'root': { en: 'Root', zh: '根' },
    'rhizome': { en: 'Rhizome', zh: '根茎' },
    'tuber': { en: 'Tuber', zh: '块茎' },
    'bulb': { en: 'Bulb', zh: '鳞茎' },
    'corm': { en: 'Corm', zh: '球茎' },
    'stem': { en: 'Stem', zh: '茎' },
    'bark': { en: 'Bark', zh: '皮' },
    'leaf': { en: 'Leaf', zh: '叶' },
    'flower': { en: 'Flower', zh: '花' },
    'flower-bud': { en: 'Flower Bud', zh: '花蕾' },
    'fruit': { en: 'Fruit', zh: '果' },
    'seed': { en: 'Seed', zh: '种子' },
    'whole-plant': { en: 'Whole Plant', zh: '全草' },
    'aerial-part': { en: 'Aerial Parts', zh: '地上部分' }
  }
  return names[partType]?.[lang] || partType
}

// Check if entity is a non-plant
function isNonPlant(slug) {
  return NON_PLANT_PATTERNS.some(pattern => pattern.test(slug))
}

// Check if species already has parts
function hasExistingParts(slug) {
  const partsDir = path.join(PARTS_DIR)
  if (!fs.existsSync(partsDir)) return false

  const existingParts = fs.readdirSync(partsDir)
    .filter(name => name.startsWith(slug + '-'))

  return existingParts.length > 0
}

// Generate PlantPart entity
function generatePlantPart(speciesSlug, speciesData, partType) {
  // Avoid redundant naming (e.g., "asparagus-root-root" -> "asparagus-root")
  let partSlug
  if (speciesSlug.endsWith('-' + partType) || speciesSlug.endsWith(partType)) {
    partSlug = speciesSlug
  } else {
    partSlug = `${speciesSlug}-${partType}`
  }
  const partName = speciesData.name?.en || speciesSlug

  const entity = {
    "@context": "../../../../schema/context/core.jsonld",
    "@id": `botanical/part/${partSlug}`,
    "@type": ["botany:PlantPart", "schema:Plant"],
    "name": {
      "en": `${partName} ${getPartTypeName(partType, 'en')}`,
      ...(speciesData.name?.['zh-Hant'] ? { "zh-Hant": speciesData.name['zh-Hant'] } : {}),
      ...(speciesData.name?.['zh-Hans'] ? { "zh-Hans": speciesData.name['zh-Hans'] } : {})
    },
    "partOf": { "@id": `botanical/species/${speciesSlug}` },
    "partType": partType,
    "description": {
      "en": `The ${partType} of ${speciesData.scientificName || partName}, used in traditional medicine.`
    }
  }

  // Add provenance
  entity.provenance = {
    created: new Date().toISOString(),
    source: "Generated from species data",
    license: "https://creativecommons.org/licenses/by-sa/4.0/"
  }

  return { entity, partSlug }
}

// Main function
async function main() {
  console.log('=== PlantPart Entity Generator ===\n')

  if (DRY_RUN) {
    console.log('DRY RUN - No files will be written\n')
  }

  // Get all species directories
  const speciesDirs = fs.readdirSync(SPECIES_DIR)
    .filter(name => fs.statSync(path.join(SPECIES_DIR, name)).isDirectory())

  console.log(`Found ${speciesDirs.length} species directories\n`)

  let stats = {
    total: speciesDirs.length,
    nonPlants: 0,
    existingParts: 0,
    generated: 0,
    skipped: 0
  }

  const toGenerate = []

  for (const speciesSlug of speciesDirs) {
    // Skip non-plants
    if (isNonPlant(speciesSlug)) {
      stats.nonPlants++
      continue
    }

    // Check if already has parts
    if (hasExistingParts(speciesSlug)) {
      stats.existingParts++
      continue
    }

    // Read species data
    const speciesFile = path.join(SPECIES_DIR, speciesSlug, 'entity.jsonld')
    if (!fs.existsSync(speciesFile)) {
      console.log(`  WARNING: Missing entity file for ${speciesSlug}`)
      stats.skipped++
      continue
    }

    let speciesData
    try {
      speciesData = JSON.parse(fs.readFileSync(speciesFile, 'utf8'))
    } catch (e) {
      console.log(`  ERROR: Could not parse ${speciesFile}: ${e.message}`)
      stats.skipped++
      continue
    }

    // Check if it has botanical classification
    if (!speciesData.scientificName && !speciesData.family) {
      console.log(`  SKIP: ${speciesSlug} - no botanical classification`)
      stats.skipped++
      continue
    }

    // Determine part type
    const partType = inferPartType(speciesSlug, speciesData)

    toGenerate.push({ speciesSlug, speciesData, partType })
  }

  // Apply limit if specified
  if (LIMIT > 0 && toGenerate.length > LIMIT) {
    console.log(`Limiting to ${LIMIT} entities\n`)
    toGenerate.length = LIMIT
  }

  console.log(`\nGenerating ${toGenerate.length} PlantPart entities...\n`)

  for (const { speciesSlug, speciesData, partType } of toGenerate) {
    const { entity, partSlug } = generatePlantPart(speciesSlug, speciesData, partType)

    const partDir = path.join(PARTS_DIR, partSlug)
    const partFile = path.join(partDir, 'entity.jsonld')

    if (DRY_RUN) {
      console.log(`  [DRY] Would create: ${partFile}`)
      console.log(`        Part type: ${partType}`)
      console.log(`        Parent: ${speciesSlug}`)
    } else {
      // Create directory
      fs.mkdirSync(partDir, { recursive: true })

      // Write entity file
      fs.writeFileSync(partFile, JSON.stringify(entity, null, 2))
      console.log(`  ✓ Created: ${partFile}`)

      // Update parent species with hasParts reference
      const speciesFile = path.join(SPECIES_DIR, speciesSlug, 'entity.jsonld')
      const speciesEntity = JSON.parse(fs.readFileSync(speciesFile, 'utf8'))

      if (!speciesEntity.hasParts) {
        speciesEntity.hasParts = []
      }

      const partRef = { "@id": `botanical/part/${partSlug}` }
      if (!speciesEntity.hasParts.some(p => p['@id'] === partRef['@id'])) {
        speciesEntity.hasParts.push(partRef)
        speciesEntity.provenance = speciesEntity.provenance || {}
        speciesEntity.provenance.modified = new Date().toISOString()
        fs.writeFileSync(speciesFile, JSON.stringify(speciesEntity, null, 2))
        console.log(`  ✓ Updated: ${speciesFile} (added hasParts)`)
      }

      stats.generated++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Total species: ${stats.total}`)
  console.log(`Non-plants: ${stats.nonPlants}`)
  console.log(`Already have parts: ${stats.existingParts}`)
  console.log(`Generated: ${stats.generated}`)
  console.log(`Skipped: ${stats.skipped}`)

  if (DRY_RUN) {
    console.log('\n*** DRY RUN - No changes were made ***')
  }
}

main().catch(console.error)

#!/usr/bin/env node
/**
 * Classify all source materials in the dataset.
 *
 * This script analyzes all entities and classifies them into the correct
 * SourceMaterial type hierarchy:
 * - BotanicalSource: Plants, fungi, algae
 * - ZoologicalSource: Animal products
 * - MineralSource: Minerals
 * - ChemicalSource: Vitamins, amino acids, compounds
 *
 * It also identifies:
 * - Essential oils that should be HerbalPreparation
 * - Processed products that should be HerbalPreparation
 * - Proprietary formulas that should be Formula
 *
 * Usage:
 *   node scripts/classify-sources.js          # Show classification report
 *   node scripts/classify-sources.js --update # Update @type for misclassified entities
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const UPDATE_MODE = process.argv.includes('--update')

// Classification rules based on entity characteristics
const CLASSIFICATION_RULES = {
  // Animal products - ZoologicalSource
  zoological: {
    patterns: [
      'deer-antler', 'deer-horn', 'birds-nest', 'bird\'s-nest',
      'dragon-bone', 'guijia', 'guiban', 'turtle', 'shell',
      'swiftlet', 'cervus', 'antler', 'horn gelatine'
    ],
    scientificNames: [
      'cervus nippon', 'chinemys reevesii', 'swiftlet',
      'colla cornus', 'draconis os', 'fossil'
    ]
  },

  // Minerals - MineralSource
  mineral: {
    patterns: [
      'calcium', 'copper', 'iodine', 'iron', 'magnesium',
      'manganese', 'potassium', 'selenium', 'zinc',
      'mineral-oil', 'petrolatum'
    ],
    exactMatches: [
      'calcium', 'copper', 'iodine', 'iron', 'magnesium',
      'manganese', 'potassium', 'selenium', 'zinc',
      'mineral-oil', 'petrolatum', 'amber'
    ]
  },

  // Chemical/Nutrient sources - ChemicalSource
  chemical: {
    patterns: [
      'vitamin', 'choline', 'inositol', 'lysine', 'methionine',
      'glycine', 'cysteine', 'paba', 'omega-', 'glucosamine',
      'chondroitin', 'chitosan', 'lecithin', 'phospholipid',
      'ceramide', 'squalene', 'linolenic', 'melatonin'
    ],
    exactMatches: [
      'vitamin-a', 'vitamin-b1', 'vitamin-b2', 'vitamin-b3-niacin',
      'vitamin-b5', 'vitamin-b6', 'vitamin-b7-biotin',
      'vitamin-b9-folate-folic-acid', 'vitamin-b12',
      'vitamin-c', 'vitamin-d-calciferol-cholecalciferol-ergocalciferol',
      'vitamin-e', 'vitamin-p-bioflavonoids',
      'choline', 'inositol', 'lysine', 'methionine', 'glycine',
      'cysteine-hci', 'paba', 'omega-3', 'omega-6', 'omega-9',
      'glucosamine-sulfate', 'chondroitin-sulfate', 'chitosan',
      'lecithin', 'phospholipids', 'ceramides', 'squalene',
      'linolenic-acid', 'melatonin', 'royal-jelly', 'honey'
    ]
  },

  // Essential oils - should be HerbalPreparation
  essentialOils: {
    patterns: ['-oil'],
    exclusions: ['mineral-oil'], // Mineral oil is a mineral, not an extract
    shouldBePreparation: true
  },

  // Proprietary formulas - should be Formula
  formulas: {
    patterns: ['capigen', 'epicutin', 'factor-', 'mpc', 'hydration-factor'],
    exactMatches: [
      'capigen', 'epicutin-tt', 'factor-arl',
      'mpc', 'hydration-factor-cte4'
    ]
  },

  // Processed products - should be HerbalPreparation
  processed: {
    patterns: ['shoudihuang', 'shenqu'],
    exactMatches: ['shoudihuang', 'shenqu']
  },

  // Fungi - BotanicalSource with fungal subtype
  fungi: {
    patterns: ['lingzhi', 'reishi', 'cordyceps', 'mushroom', 'ganoderma', 'fuling', 'yunzhi', 'poria', 'trametes'],
    scientificNames: ['ganoderma lucidum', 'ophiocordyceps sinensis', 'wolfiporia cocos', 'poria cocos', 'trametes versicolor']
  },

  // Algae - BotanicalSource with algal subtype
  algae: {
    patterns: ['algae', 'seaweed', 'sargassum', 'haizao', 'kelp'],
    scientificNames: ['sargassum fusiforme']
  }
}

/**
 * Classify an entity based on its properties.
 */
function classifyEntity(slug, entity) {
  const name = entity.name?.en?.toLowerCase() || slug.toLowerCase()
  const scientificName = (entity.scientificName || '').toLowerCase()
  const description = (entity.description?.en || '').toLowerCase()

  // Check for proprietary formulas first
  for (const pattern of CLASSIFICATION_RULES.formulas.patterns) {
    if (slug.includes(pattern) || name.includes(pattern)) {
      return { type: 'Formula', subType: 'proprietary', reason: 'Matched formula pattern' }
    }
  }

  // Check for essential oils
  if (slug.endsWith('-oil') && !CLASSIFICATION_RULES.essentialOils.exclusions.includes(slug)) {
    // Extract source plant name
    const sourcePlant = slug.replace('-oil', '')
    return {
      type: 'HerbalPreparation',
      subType: 'essential-oil',
      reason: 'Essential oil should be HerbalPreparation',
      suggestedSource: sourcePlant
    }
  }

  // Check for processed products
  if (CLASSIFICATION_RULES.processed.exactMatches.includes(slug)) {
    return {
      type: 'HerbalPreparation',
      subType: 'processed',
      reason: 'Processed product should be HerbalPreparation',
      suggestedSource: slug === 'shoudihuang' ? 'dihuang' : null
    }
  }

  // Check for minerals (exact match first)
  if (CLASSIFICATION_RULES.mineral.exactMatches.includes(slug)) {
    return { type: 'MineralSource', subType: null, reason: 'Exact match for mineral' }
  }

  // Check for chemical/nutrient sources
  if (CLASSIFICATION_RULES.chemical.exactMatches.includes(slug)) {
    return { type: 'ChemicalSource', subType: 'nutrient', reason: 'Exact match for chemical/nutrient' }
  }
  for (const pattern of CLASSIFICATION_RULES.chemical.patterns) {
    if (name.includes(pattern) || slug.includes(pattern)) {
      return { type: 'ChemicalSource', subType: 'nutrient', reason: `Matched chemical pattern: ${pattern}` }
    }
  }

  // Check for zoological sources
  for (const pattern of CLASSIFICATION_RULES.zoological.patterns) {
    if (slug.includes(pattern) || name.includes(pattern)) {
      return { type: 'ZoologicalSource', subType: 'animal-part', reason: `Matched zoological pattern: ${pattern}` }
    }
  }
  for (const sciName of CLASSIFICATION_RULES.zoological.scientificNames) {
    if (scientificName.includes(sciName)) {
      return { type: 'ZoologicalSource', subType: 'animal-part', reason: `Matched scientific name: ${sciName}` }
    }
  }

  // Check for fungi
  for (const pattern of CLASSIFICATION_RULES.fungi.patterns) {
    if (slug.includes(pattern) || name.includes(pattern)) {
      return { type: 'BotanicalSource', subType: 'fungus', reason: `Matched fungal pattern: ${pattern}` }
    }
  }
  for (const sciName of CLASSIFICATION_RULES.fungi.scientificNames) {
    if (scientificName.includes(sciName)) {
      return { type: 'BotanicalSource', subType: 'fungus', reason: `Matched fungal scientific name: ${sciName}` }
    }
  }

  // Check for algae
  for (const pattern of CLASSIFICATION_RULES.algae.patterns) {
    if (slug.includes(pattern) || name.includes(pattern)) {
      return { type: 'BotanicalSource', subType: 'alga', reason: `Matched algal pattern: ${pattern}` }
    }
  }

  // Default to botanical source (plant)
  return { type: 'BotanicalSource', subType: 'plant', reason: 'Default classification as plant' }
}

/**
 * Get the correct @type array for a classification.
 */
function getCorrectType(classification) {
  switch (classification.type) {
    case 'BotanicalSource':
      if (classification.subType === 'fungus') {
        return ['herbapedia:BotanicalSource', 'mycology:FungalSpecies', 'schema:Thing']
      }
      if (classification.subType === 'alga') {
        return ['herbapedia:BotanicalSource', 'phycology:AlgalSpecies', 'schema:Thing']
      }
      return ['herbapedia:BotanicalSource', 'botany:PlantSpecies', 'schema:Plant']

    case 'ZoologicalSource':
      return ['herbapedia:ZoologicalSource', 'schema:Thing']

    case 'MineralSource':
      return ['herbapedia:MineralSource', 'schema:Thing']

    case 'ChemicalSource':
      return ['herbapedia:ChemicalSource', 'schema:Thing']

    case 'HerbalPreparation':
      return ['herbal:HerbalPreparation', 'schema:DietarySupplement']

    case 'Formula':
      return ['herbapedia:Formula', 'schema:DietarySupplement']

    default:
      return ['herbapedia:SourceMaterial', 'schema:Thing']
  }
}

async function main() {
  console.log('=== Source Material Classification Report ===\n')

  const stats = {
    total: 0,
    botanical: { plant: 0, fungus: 0, alga: 0 },
    zoological: 0,
    mineral: 0,
    chemical: 0,
    shouldBePreparation: 0,
    shouldBeFormula: 0,
    needsUpdate: 0
  }

  const misclassified = []
  const oilsNeedingConversion = []
  const processedNeedingConversion = []

  const speciesDirs = fs.readdirSync(SPECIES_DIR)
    .filter(name => fs.statSync(path.join(SPECIES_DIR, name)).isDirectory())

  for (const slug of speciesDirs) {
    const entityFile = path.join(SPECIES_DIR, slug, 'entity.jsonld')
    if (!fs.existsSync(entityFile)) continue

    stats.total++

    try {
      const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))
      const classification = classifyEntity(slug, data)
      const correctType = getCorrectType(classification)
      const currentType = data['@type'] || []

      // Track statistics
      if (classification.type === 'BotanicalSource') {
        stats.botanical[classification.subType || 'plant']++
      } else if (classification.type === 'ZoologicalSource') {
        stats.zoological++
      } else if (classification.type === 'MineralSource') {
        stats.mineral++
      } else if (classification.type === 'ChemicalSource') {
        stats.chemical++
      } else if (classification.type === 'HerbalPreparation') {
        stats.shouldBePreparation++
        if (classification.subType === 'essential-oil') {
          oilsNeedingConversion.push({ slug, classification, data })
        } else {
          processedNeedingConversion.push({ slug, classification, data })
        }
      } else if (classification.type === 'Formula') {
        stats.shouldBeFormula++
      }

      // Check if @type needs updating
      const needsUpdate = JSON.stringify(currentType.sort()) !== JSON.stringify(correctType.sort())

      if (needsUpdate && classification.type !== 'HerbalPreparation') {
        stats.needsUpdate++
        misclassified.push({
          slug,
          currentType,
          correctType,
          classification,
          scientificName: data.scientificName
        })
      }
    } catch (e) {
      console.error(`Error processing ${slug}: ${e.message}`)
    }
  }

  // Print summary
  console.log('=== Classification Summary ===\n')
  console.log(`Total entities analyzed: ${stats.total}\n`)

  console.log('BotanicalSource:')
  console.log(`  Plants: ${stats.botanical.plant}`)
  console.log(`  Fungi:  ${stats.botanical.fungus}`)
  console.log(`  Algae:  ${stats.botanical.alga}`)
  console.log('')

  console.log(`ZoologicalSource: ${stats.zoological}`)
  console.log(`MineralSource:    ${stats.mineral}`)
  console.log(`ChemicalSource:   ${stats.chemical}`)
  console.log('')

  console.log(`Should be HerbalPreparation: ${stats.shouldBePreparation}`)
  console.log(`Should be Formula:           ${stats.shouldBeFormula}`)
  console.log('')

  console.log(`Entities needing @type update: ${stats.needsUpdate}`)
  console.log('')

  // Print misclassified entities
  if (misclassified.length > 0) {
    console.log('=== Misclassified Entities ===\n')
    for (const item of misclassified) {
      console.log(`${item.slug}:`)
      console.log(`  Scientific Name: ${item.scientificName || 'N/A'}`)
      console.log(`  Current: ${JSON.stringify(item.currentType)}`)
      console.log(`  Correct: ${JSON.stringify(item.correctType)}`)
      console.log(`  Reason: ${item.classification.reason}`)
      console.log('')
    }
  }

  // Print oils needing conversion
  if (oilsNeedingConversion.length > 0) {
    console.log('=== Essential Oils to Convert to HerbalPreparation ===\n')
    for (const item of oilsNeedingConversion) {
      console.log(`${item.slug}:`)
      console.log(`  Source plant: ${item.classification.suggestedSource || 'UNKNOWN'}`)
      console.log('')
    }
  }

  // Print processed products needing conversion
  if (processedNeedingConversion.length > 0) {
    console.log('=== Processed Products to Convert to HerbalPreparation ===\n')
    for (const item of processedNeedingConversion) {
      console.log(`${item.slug}:`)
      console.log(`  Source: ${item.classification.suggestedSource || 'N/A'}`)
      console.log('')
    }
  }

  // Update mode
  if (UPDATE_MODE && misclassified.length > 0) {
    console.log('\n=== Updating @type for misclassified entities ===\n')

    for (const item of misclassified) {
      const entityFile = path.join(SPECIES_DIR, item.slug, 'entity.jsonld')
      const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))

      data['@type'] = item.correctType
      data.sourceType = item.classification.type.toLowerCase().replace('source', '')
      if (item.classification.subType) {
        data.sourceSubType = item.classification.subType
      }

      data.provenance = data.provenance || {}
      data.provenance.modified = new Date().toISOString()
      data.provenance.classificationNote = `Reclassified as ${item.classification.type}`

      fs.writeFileSync(entityFile, JSON.stringify(data, null, 2))
      console.log(`  Updated: ${item.slug}`)
    }

    console.log(`\nUpdated ${misclassified.length} entities.`)
  }

  // Summary stats for scripts
  console.log('\n=== Stats JSON ===')
  console.log(JSON.stringify(stats, null, 2))
}

main().catch(console.error)

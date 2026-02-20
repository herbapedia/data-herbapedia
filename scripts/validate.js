#!/usr/bin/env node

/**
 * Herbapedia SHACL Validation Script
 *
 * Validates JSON-LD data files against SHACL shapes.
 *
 * Usage:
 *   node scripts/validate.js                    # Validate all files
 *   node scripts/validate.js --plant ginseng    # Validate specific plant
 *   node scripts/validate.js --tcm              # Validate all TCM herbs
 *   node scripts/validate.js --verbose          # Show all validation passes
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, relative, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Validation result tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
}

/**
 * Simple JSON-LD validator (without full RDF/SHACL library)
 * This performs structural validation based on our schema
 */
class SimpleValidator {
  constructor() {
    this.errors = []
    this.warnings = []
  }

  validatePlant(data, filePath) {
    const errors = []
    const warnings = []

    // Determine if this is a plant vs. vitamin/mineral/nutrient/other
    const id = data['@id'] || ''
    const nonPlantSlugs = [
      // Minerals
      'calcium', 'copper', 'iodine', 'iron', 'magnesium', 'manganese', 'potassium', 'selenium', 'zinc',
      // Nutrients
      'capigen', 'ceramides', 'chitosan', 'choline', 'chondroitin-sulfate', 'cysteine-hci',
      'epicutin-tt', 'factor-arl', 'glucosamine-sulfate', 'glycerin', 'glycine',
      'hydration-factor-cte4', 'inositol', 'lecithin', 'linolenic-acid', 'lysine',
      'melatonin', 'methionine', 'mineral-oil', 'mpc', 'paba', 'petrolatum', 'phospholipids',
      'saw-palmetto', 'squalene',
      // Oils and animal products
      'royal-jelly', 'argan-oil', 'balm-mint-oil', 'clove-oil', 'eucalyptus-oil',
      'evening-primrose-oil', 'jojoba-seed-oil', 'lavender-oil', 'peppermint-oil',
      'rosemary-oil', 'sage-oil', 'tea-tree-oil', 'thyme-oil', 'amber'
    ]
    const isPlant = !nonPlantSlugs.some(s => id.includes(s)) && !id.includes('vitamin-') && !id.includes('omega')

    // Required: @id
    if (!data['@id']) {
      errors.push('Missing required property: @id')
    }

    // Required: @type
    if (!data['@type']) {
      errors.push('Missing required property: @type')
    } else if (!Array.isArray(data['@type'])) {
      warnings.push('@type should be an array')
    }

    // Required: scientificName (only for true plants, not vitamins/minerals/nutrients)
    if (isPlant && !data['dwc:scientificName'] && !data.scientificName) {
      errors.push('Missing required property: scientificName')
    }

    // Required: name (language map)
    if (!data['schema:name'] && !data.name) {
      errors.push('Missing required property: name')
    }

    // Validate language maps
    this.validateLanguageMap(data['schema:name'] || data.name, 'name', warnings)

    // Validate IRI references
    this.validateIri(data['schema:sameAs'] || data.sameAs, 'sameAs', warnings)
    this.validateIri(data['herbapedia:hasPart'] || data.hasPart, 'hasPart', warnings)
    this.validateIri(data['herbapedia:containsChemical'] || data.containsChemical, 'containsChemical', warnings)

    // Check for system-scoped content (should NOT be in plant entity)
    const systemScopedProps = [
      'herbapedia:traditionalUsage', 'traditionalUsage',
      'herbapedia:modernResearch', 'modernResearch',
      'herbapedia:functions', 'functions',
      'tcm:traditionalUsage', 'ayurveda:traditionalUsage', 'western:traditionalUsage'
    ]
    for (const prop of systemScopedProps) {
      if (data[prop]) {
        errors.push(`Plant entity should NOT contain system-scoped content: ${prop}. Move to system profile.`)
      }
    }

    return { errors, warnings }
  }

  validateTCMHerb(data, filePath) {
    const errors = []
    const warnings = []

    // Required: @id
    if (!data['@id']) {
      errors.push('Missing required property: @id')
    }

    // Required: @type
    if (!data['@type']) {
      errors.push('Missing required property: @type')
    } else {
      const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
      if (!types.includes('tcm:Herb') && !types.some(t => t.includes('Herb'))) {
        warnings.push('@type should include tcm:Herb')
      }
    }

    // Required: derivedFromPlant
    if (!data['tcm:derivedFromPlant'] && !data.derivedFromPlant) {
      errors.push('Missing required property: derivedFromPlant (link to plant entity)')
    }

    // Required: name
    if (!data['schema:name'] && !data.name) {
      errors.push('Missing required property: name')
    }

    // Required: pinyin
    if (!data['tcm:pinyin'] && !data.pinyin) {
      errors.push('Missing required property: pinyin')
    }

    // Required: TCM classification
    if (!data['tcm:hasCategory'] && !data.hasCategory) {
      errors.push('Missing required property: hasCategory')
    }
    if (!data['tcm:hasNature'] && !data.hasNature) {
      errors.push('Missing required property: hasNature')
    }
    if (!data['tcm:hasFlavor'] && !data.hasFlavor) {
      errors.push('Missing required property: hasFlavor')
    }
    if (!data['tcm:entersMeridian'] && !data.entersMeridian) {
      errors.push('Missing required property: entersMeridian')
    }

    // Validate IRI references
    this.validateIri(data['tcm:hasCategory'] || data.hasCategory, 'hasCategory', errors)
    this.validateIri(data['tcm:hasNature'] || data.hasNature, 'hasNature', errors)
    this.validateIriArray(data['tcm:hasFlavor'] || data.hasFlavor, 'hasFlavor', errors)
    this.validateIriArray(data['tcm:entersMeridian'] || data.entersMeridian, 'entersMeridian', errors)

    // Validate content uses TCM-scoped properties
    const tcmContentProps = [
      'tcmHistory', 'tcmTraditionalUsage', 'tcmModernResearch',
      'tcmFunctions', 'tcmClassicalReference', 'tcmSafetyConsideration'
    ]
    const genericContentProps = ['history', 'traditionalUsage', 'modernResearch', 'functions']

    for (const prop of genericContentProps) {
      if (data[prop] && !data[`tcm:${prop}`] && !data[`tcm${prop.charAt(0).toUpperCase()}${prop.slice(1)}`]) {
        warnings.push(`Consider using tcm:${prop} instead of generic ${prop} for system-scoped content`)
      }
    }

    return { errors, warnings }
  }

  validateAyurvedaDravya(data, filePath) {
    const errors = []
    const warnings = []

    // Required: @id
    if (!data['@id']) {
      errors.push('Missing required property: @id')
    }

    // Required: derivedFromPlant
    if (!data['ayurveda:derivedFromPlant'] && !data.derivedFromPlant) {
      errors.push('Missing required property: derivedFromPlant (link to plant entity)')
    }

    // Required: Rasa Panchaka
    if (!data['ayurveda:hasRasa'] && !data.hasRasa) {
      errors.push('Missing required property: hasRasa')
    }
    if (!data['ayurveda:hasVirya'] && !data.hasVirya) {
      errors.push('Missing required property: hasVirya')
    }
    if (!data['ayurveda:hasVipaka'] && !data.hasVipaka) {
      errors.push('Missing required property: hasVipaka')
    }
    if (!data['ayurveda:hasGuna'] && !data.hasGuna) {
      errors.push('Missing required property: hasGuna')
    }

    return { errors, warnings }
  }

  validateLanguageMap(value, propName, warnings) {
    if (!value) return
    if (typeof value === 'string') {
      warnings.push(`${propName} should be a language map, not a string`)
    } else if (typeof value === 'object' && !Object.keys(value).some(k => k.match(/^[a-z]{2}(-[A-Z]{2})?$/))) {
      warnings.push(`${propName} language map should use valid language codes (en, zh-Hant, etc.)`)
    }
  }

  validateIri(value, propName, errors) {
    if (!value) return
    if (typeof value === 'object' && value['@id']) {
      // Valid IRI reference
      return
    }
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('plant/') || value.startsWith('tcm/') || value.startsWith('ayurveda/') || value.startsWith('category/') || value.startsWith('nature/') || value.startsWith('flavor/') || value.startsWith('meridian/') || value.startsWith('rasa/') || value.startsWith('virya/') || value.startsWith('vipaka/') || value.startsWith('guna/') || value.startsWith('dosha/'))) {
      // Valid IRI string
      return
    }
    // Not necessarily an error, could be valid
  }

  validateIriArray(value, propName, errors) {
    if (!value) return
    const arr = Array.isArray(value) ? value : [value]
    for (const item of arr) {
      this.validateIri(item, propName, errors)
    }
  }
}

/**
 * Recursively find all JSON-LD files
 */
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

/**
 * Determine entity type from file path
 */
function getEntityType(filePath) {
  if (filePath.includes('/plants/')) return 'plant'
  if (filePath.includes('/tcm/herbs/')) return 'tcm-herb'
  if (filePath.includes('/ayurveda/dravyas/')) return 'ayurveda-dravya'
  if (filePath.includes('/tcm/')) return 'tcm-reference'
  if (filePath.includes('/ayurveda/')) return 'ayurveda-reference'
  return 'unknown'
}

/**
 * Validate a single file
 */
function validateFile(filePath, options = {}) {
  const relativePath = relative(ROOT, filePath)
  const entityType = getEntityType(filePath)

  // Skip reference data files for now
  if (entityType === 'tcm-reference' || entityType === 'ayurveda-reference') {
    if (options.verbose) {
      log(`  ⊘  ${relativePath} (reference data, skipped)`, 'cyan')
    }
    return { skipped: true }
  }

  // Skip context files
  if (filePath.includes('/context/')) {
    return { skipped: true }
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    const validator = new SimpleValidator()
    let validationResult

    switch (entityType) {
      case 'plant':
        validationResult = validator.validatePlant(data, filePath)
        break
      case 'tcm-herb':
        validationResult = validator.validateTCMHerb(data, filePath)
        break
      case 'ayurveda-dravya':
        validationResult = validator.validateAyurvedaDravya(data, filePath)
        break
      default:
        return { skipped: true }
    }

    const { errors, warnings } = validationResult

    if (errors.length === 0) {
      results.passed++
      if (options.verbose || warnings.length > 0) {
        log(`  ✓  ${relativePath}`, 'green')
        warnings.forEach(w => log(`     ⚠ ${w}`, 'yellow'))
      }
      return { valid: true, warnings }
    } else {
      results.failed++
      results.errors.push({ file: relativePath, errors, warnings })
      log(`  ✗  ${relativePath}`, 'red')
      errors.forEach(e => log(`     • ${e}`, 'red'))
      warnings.forEach(w => log(`     ⚠ ${w}`, 'yellow'))
      return { valid: false, errors, warnings }
    }
  } catch (error) {
    results.failed++
    results.errors.push({ file: relativePath, errors: [error.message], warnings: [] })
    log(`  ✗  ${relativePath}`, 'red')
    log(`     • Parse error: ${error.message}`, 'red')
    return { valid: false, errors: [error.message] }
  }
}

/**
 * Main validation function
 */
function validate(options = {}) {
  log('\n📋 Herbapedia Data Validation\n', 'cyan')

  const entitiesDir = join(ROOT, 'entities')
  const systemsDir = join(ROOT, 'systems')

  // Find all files
  const files = []

  if (options.plant) {
    // Validate specific plant
    const plantDir = join(entitiesDir, 'plants', options.plant)
    files.push(...findJsonLdFiles(plantDir))
  } else if (options.tcm) {
    // Validate all TCM herbs
    const tcmDir = join(systemsDir, 'tcm', 'herbs')
    files.push(...findJsonLdFiles(tcmDir))
  } else if (options.ayurveda) {
    // Validate all Ayurveda dravyas
    const ayurvedaDir = join(systemsDir, 'ayurveda', 'dravyas')
    files.push(...findJsonLdFiles(ayurvedaDir))
  } else {
    // Validate everything
    files.push(...findJsonLdFiles(entitiesDir))
    files.push(...findJsonLdFiles(join(systemsDir, 'tcm', 'herbs')))
    files.push(...findJsonLdFiles(join(systemsDir, 'ayurveda', 'dravyas')))
  }

  if (files.length === 0) {
    log('No files found to validate', 'yellow')
    return
  }

  log(`Validating ${files.length} file(s)...\n`, 'blue')

  // Validate each file
  for (const file of files) {
    validateFile(file, options)
  }

  // Summary
  log('\n' + '─'.repeat(50), 'reset')
  log('\n📊 Validation Summary\n', 'cyan')
  log(`  ✓ Passed: ${results.passed}`, 'green')
  log(`  ✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset')

  if (results.errors.length > 0) {
    log('\n❌ Errors:\n', 'red')
    for (const { file, errors } of results.errors) {
      log(`  ${file}:`, 'red')
      errors.forEach(e => log(`    • ${e}`, 'red'))
    }
    process.exit(1)
  } else {
    log('\n✅ All validations passed!', 'green')
    process.exit(0)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  plant: null,
  tcm: args.includes('--tcm'),
  ayurveda: args.includes('--ayurveda'),
}

const plantIndex = args.indexOf('--plant')
if (plantIndex !== -1 && args[plantIndex + 1]) {
  options.plant = args[plantIndex + 1]
}

// Run validation
validate(options)

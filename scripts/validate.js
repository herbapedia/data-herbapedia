#!/usr/bin/env node

/**
 * Herbapedia Comprehensive Validation Script
 *
 * Validates entities using multiple validators:
 * 1. Schema Validation - JSON Schema compliance
 * 2. Reference Integrity - IRI reference resolution
 * 3. Content Quality - Language maps, required fields, duplicates
 *
 * Usage:
 *   node scripts/validate.js                    # Run all validations
 *   node scripts/validate.js --schema           # Only schema validation
 *   node scripts/validate.js --references       # Only reference validation
 *   node scripts/validate.js --quality          # Only quality validation
 *   node scripts/validate.js --verbose          # Show passing files
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
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
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  log('\n' + '═'.repeat(60), 'cyan')
  log(`  ${title}`, 'cyan')
  log('═'.repeat(60), 'cyan')
}

// ============================================================================
// Schema Validator (Inline implementation for standalone script)
// ============================================================================

const ENTITY_SCHEMA_MAP = {
  'PlantSpecies': { required: ['name'] }, // scientificName optional for non-plants
  'PlantPart': { required: ['partOf', 'name'] },
  'HerbalPreparation': { required: ['derivedFrom', 'name'] },
  'TCMProfile': { required: ['pinyin', 'hasCategory', 'hasNature', 'hasFlavor'] },
  'WesternHerbalProfile': { required: ['name', 'hasAction'] },
  'AyurvedaProfile': { required: ['sanskritName', 'hasRasa', 'hasVirya', 'hasVipaka'] },
  'PersianProfile': { required: ['persianName', 'hasTemperament'] },
  'MongolianProfile': { required: ['mongolianName', 'affectsRoots'] },
}

// Non-plant entities (vitamins, minerals, etc.) that don't have scientificName
const NON_PLANT_SLUGS = [
  'vitamin', 'calcium', 'iron', 'magnesium', 'zinc', 'selenium', 'copper',
  'manganese', 'potassium', 'choline', 'inositol', 'glucosamine', 'chondroitin',
  'lecithin', 'ceramides', 'hyaluronic', 'collagen', 'elastin', 'keratin',
  'melatonin', 'coenzyme', 'resveratrol', 'quercetin', 'rutin', 'catechin',
  'egcg', 'curcumin', 'berberine', 'sulforaphane', 'allicin', 'lycopene',
  'astaxanthin', 'lutein', 'zeaxanthin', 'beta-carotene', 'biotin', 'folate',
  'niacin', 'pantothenic', 'pyridoxine', 'riboflavin', 'thiamin', 'cobalamin',
  'retinol', 'tocopherol', 'ergocalciferol', 'cholecalciferol', 'phylloquinone',
  'menaquinone', 'omega', 'ala', 'epa', 'dha', 'linolenic', 'linoleic',
  'glycerin', 'mineral-oil', 'petrolatum', 'dimethicone', 'propylene',
  'butylene', 'caprylic', 'stearic', 'palmitic', 'myristic', 'lauric',
  'hyaluronate', 'sodium', 'chloride', 'phosphorus', 'iodine', 'chromium',
  'molybdenum', 'fluoride', 'boron', 'vanadium', 'nickel', 'silicon',
  'cobalt', 'sulfur', 'cysteine', 'methionine', 'taurine', 'creatine',
  'carnitine', 'arginine', 'ornithine', 'citrulline', 'glycine',
  'proline', 'hydroxyproline', 'tryptophan', 'tyrosine', 'phenylalanine',
  'leucine', 'isoleucine', 'valine', 'lysine', 'histidine', 'threonine',
  'alanine', 'serine', 'aspartic', 'glutamic', 'asparagine', 'glutamine',
  'chitosan', 'royal-jelly', 'propolis', 'pollen', 'honey', 'beeswax',
  'factor', 'mpc', 'epicutin', 'argan-oil', 'jojoba', 'almond-oil',
  'coconut-oil', 'olive-oil', 'sunflower-oil', 'safflower-oil',
  'evening-primrose', 'borage', 'black-currant', 'rose-hip', 'sea-buckthorn'
]

function isNonPlantEntity(data) {
  const id = data['@id'] || ''
  const slug = id.split('/').pop() || ''
  const slugLower = slug.toLowerCase()

  // Check if slug contains any non-plant keyword
  return NON_PLANT_SLUGS.some(keyword => slugLower.includes(keyword))
}

function detectEntityType(data) {
  const types = data['@type']
  if (!types) return null

  const typeArray = Array.isArray(types) ? types : [types]

  for (const type of typeArray) {
    if (type.includes('tcm:Herb')) return 'TCMProfile'
    if (type.includes('western:Herb')) return 'WesternHerbalProfile'
    if (type.includes('ayurveda:Dravya')) return 'AyurvedaProfile'
    if (type.includes('persian:Drug')) return 'PersianProfile'
    if (type.includes('mongolian:Herb')) return 'MongolianProfile'
    if (type.includes('botany:PlantSpecies')) return 'PlantSpecies'
    if (type.includes('mycology:FungalSpecies')) return 'FungalSpecies'
    if (type.includes('phycology:AlgalSpecies')) return 'AlgalSpecies'
    if (type.includes('botany:PlantPart')) return 'PlantPart'
    if (type.includes('herbal:HerbalPreparation')) return 'HerbalPreparation'
    if (type.includes('herbapedia:Formula')) return 'Formula'
    if (type.includes('herbapedia:BotanicalSource')) return 'BotanicalSource'
    if (type.includes('herbapedia:ZoologicalSource')) return 'ZoologicalSource'
    if (type.includes('herbapedia:MineralSource')) return 'MineralSource'
    if (type.includes('herbapedia:ChemicalSource')) return 'ChemicalSource'
  }

  return null
}

function validateSchema(data, filePath) {
  const errors = []
  const warnings = []

  // Check required JSON-LD fields
  if (!data['@id']) {
    errors.push('Missing required property: @id')
  }
  if (!data['@type']) {
    errors.push('Missing required property: @type')
  }
  if (!data['@context']) {
    warnings.push('Missing @context - may cause JSON-LD processing issues')
  }

  const entityType = detectEntityType(data)
  if (!entityType) {
    warnings.push(`Unknown entity type: ${JSON.stringify(data['@type'])}`)
    return { valid: errors.length === 0, errors, warnings, entityType: null }
  }

  const schema = ENTITY_SCHEMA_MAP[entityType]
  if (schema) {
    for (const field of schema.required) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  // Additional check: PlantSpecies should have scientificName unless it's a non-plant entity
  if (entityType === 'PlantSpecies' && !isNonPlantEntity(data)) {
    if (!data.scientificName) {
      warnings.push('Missing scientificName for plant species (non-plant entities exempt)')
    }
  }

  return { valid: errors.length === 0, errors, warnings, entityType }
}

// ============================================================================
// Reference Validator (Inline implementation)
// ============================================================================

function extractIRIs(data, prefix = '') {
  const iris = []

  for (const [key, value] of Object.entries(data)) {
    if (key === '@id' || key === '@context' || key === '@type') continue

    const path = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (typeof item === 'object' && item !== null && item['@id']) {
            iris.push({ path: `${path}[${i}]`, iri: item['@id'] })
          } else if (typeof item === 'object') {
            iris.push(...extractIRIs(item, `${path}[${i}]`))
          }
        }
      } else if (value['@id']) {
        iris.push({ path, iri: value['@id'] })
      } else {
        iris.push(...extractIRIs(value, path))
      }
    }
  }

  return iris
}

function isInternalIRI(iri) {
  return !iri.startsWith('http://') && !iri.startsWith('https://')
}

// ============================================================================
// Quality Validator (Inline implementation)
// ============================================================================

const LANGUAGE_MAP_FIELDS = [
  'name', 'description', 'tcmFunctions', 'tcmTraditionalUsage', 'tcmModernResearch',
  'westernTraditionalUsage', 'westernModernResearch', 'ayurvedaTraditionalUsage',
  'ayurvedaModernResearch', 'contraindications', 'dosage', 'indications',
]

function validateQuality(data, entityType) {
  const issues = []

  // Check language maps
  for (const field of LANGUAGE_MAP_FIELDS) {
    const value = data[field]
    if (!value) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value)
      if (!keys.includes('en')) {
        issues.push({
          severity: 'warning',
          path: field,
          message: `Language map missing 'en' key. Found: ${keys.join(', ')}`
        })
      }
    }
  }

  // Check for empty content
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.trim() === '') {
      issues.push({
        severity: 'info',
        path: key,
        message: 'Empty string value'
      })
    }
  }

  // Validate @type patterns for source materials
  const types = data['@type'] || []
  const typeArray = Array.isArray(types) ? types : [types]

  // Check BotanicalSource entities
  if (entityType === 'PlantSpecies' || entityType === 'FungalSpecies' || entityType === 'AlgalSpecies') {
    if (!typeArray.includes('herbapedia:BotanicalSource')) {
      issues.push({
        severity: 'warning',
        path: '@type',
        message: `Missing herbapedia:BotanicalSource type for ${entityType}`
      })
    }
  }

  // Check ZoologicalSource entities
  if (entityType === 'ZoologicalSource') {
    if (!typeArray.includes('herbapedia:ZoologicalSource')) {
      issues.push({
        severity: 'warning',
        path: '@type',
        message: 'Missing herbapedia:ZoologicalSource type'
      })
    }
  }

  // Check MineralSource entities
  if (entityType === 'MineralSource') {
    if (!typeArray.includes('herbapedia:MineralSource')) {
      issues.push({
        severity: 'warning',
        path: '@type',
        message: 'Missing herbapedia:MineralSource type'
      })
    }
  }

  // Check ChemicalSource entities
  if (entityType === 'ChemicalSource') {
    if (!typeArray.includes('herbapedia:ChemicalSource')) {
      issues.push({
        severity: 'warning',
        path: '@type',
        message: 'Missing herbapedia:ChemicalSource type'
      })
    }
  }

  // Check for missing sourceType property on source materials
  if (['PlantSpecies', 'FungalSpecies', 'AlgalSpecies', 'ZoologicalSource', 'MineralSource', 'ChemicalSource'].includes(entityType)) {
    if (!data.sourceType) {
      issues.push({
        severity: 'warning',
        path: 'sourceType',
        message: 'Missing sourceType property for source material entity'
      })
    }
  }

  return issues
}

// ============================================================================
// File Discovery
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

// ============================================================================
// Main Validation Functions
// ============================================================================

async function runSchemaValidation(files, options) {
  logSection('Phase 1: Schema Validation')

  let passed = 0
  let failed = 0
  const errors = []

  for (const file of files) {
    // Skip context files
    if (file.includes('/context/')) continue

    try {
      const content = readFileSync(file, 'utf-8')
      const data = JSON.parse(content)
      const result = validateSchema(data, file)

      if (result.valid) {
        passed++
        if (options.verbose) {
          log(`  ✓ ${file.replace(ROOT + '/', '')}`, 'green')
        }
      } else {
        failed++
        const relPath = file.replace(ROOT + '/', '')
        errors.push({ file: relPath, errors: result.errors, warnings: result.warnings })
        log(`  ✗ ${relPath}`, 'red')
        result.errors.forEach(e => log(`      • ${e}`, 'red'))
        if (result.warnings.length > 0) {
          result.warnings.forEach(w => log(`      ⚠ ${w}`, 'yellow'))
        }
      }
    } catch (error) {
      failed++
      log(`  ✗ ${file.replace(ROOT + '/', '')} - Parse error: ${error.message}`, 'red')
    }
  }

  log(`\n  Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green')

  return { passed, failed, errors }
}

async function runReferenceValidation(files, options) {
  logSection('Phase 2: Reference Integrity')

  // Build IRI registry
  const iriRegistry = new Map()

  for (const file of files) {
    if (file.includes('/context/')) continue

    try {
      const content = readFileSync(file, 'utf-8')
      const data = JSON.parse(content)
      if (data['@id']) {
        iriRegistry.set(data['@id'], file.replace(ROOT + '/', ''))
      }

      // Handle arrays (reference data files)
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@id']) {
            iriRegistry.set(item['@id'], file.replace(ROOT + '/', ''))
          }
        }
      }

      // Handle reference collections with members array
      if (data.members && Array.isArray(data.members)) {
        for (const item of data.members) {
          if (item['@id']) {
            iriRegistry.set(item['@id'], file.replace(ROOT + '/', ''))
          }
        }
      }
    } catch (error) {
      // Skip parse errors (already reported in schema validation)
    }
  }

  log(`  Registered ${iriRegistry.size} IRIs`, 'blue')

  let validRefs = 0
  let brokenRefs = 0
  const broken = []

  for (const file of files) {
    if (file.includes('/context/')) continue

    try {
      const content = readFileSync(file, 'utf-8')
      const data = JSON.parse(content)
      const refs = extractIRIs(data)

      for (const { path, iri } of refs) {
        if (!isInternalIRI(iri)) {
          validRefs++
          continue
        }

        if (iriRegistry.has(iri)) {
          validRefs++
        } else {
          brokenRefs++
          const relPath = file.replace(ROOT + '/', '')
          broken.push({ file: relPath, path, iri })

          if (options.verbose) {
            log(`  ✗ ${relPath}: ${path} -> ${iri}`, 'red')
          }
        }
      }

      // Handle arrays
      if (Array.isArray(data)) {
        for (const item of data) {
          const refs = extractIRIs(item)
          for (const { path, iri } of refs) {
            if (!isInternalIRI(iri)) continue
            if (!iriRegistry.has(iri)) {
              brokenRefs++
            }
          }
        }
      }
    } catch (error) {
      // Skip
    }
  }

  log(`\n  Results: ${validRefs} valid references, ${brokenRefs} broken`, brokenRefs > 0 ? 'red' : 'green')

  if (broken.length > 0 && !options.verbose) {
    log(`\n  Broken references (showing first 10):`, 'yellow')
    for (const { file, path, iri } of broken.slice(0, 10)) {
      log(`    • ${file}: ${path} -> ${iri}`, 'red')
    }
    if (broken.length > 10) {
      log(`    ... and ${broken.length - 10} more`, 'yellow')
    }
  }

  return { validRefs, brokenRefs, broken }
}

async function runQualityValidation(files, options) {
  logSection('Phase 3: Content Quality')

  let totalEntities = 0
  let totalIssues = 0
  const bySeverity = { error: 0, warning: 0, info: 0 }
  const entities = []

  for (const file of files) {
    if (file.includes('/context/')) continue

    try {
      const content = readFileSync(file, 'utf-8')
      const data = JSON.parse(content)
      const entityType = detectEntityType(data)

      if (!entityType) continue

      totalEntities++
      const issues = validateQuality(data, entityType)

      if (issues.length > 0) {
        totalIssues += issues.length
        for (const issue of issues) {
          bySeverity[issue.severity]++
        }

        entities.push({
          file: file.replace(ROOT + '/', ''),
          entityType,
          issues
        })

        if (issues.some(i => i.severity === 'error' || i.severity === 'warning')) {
          log(`  ⚠ ${file.replace(ROOT + '/', '')}`, 'yellow')
          for (const issue of issues) {
            if (issue.severity === 'error' || issue.severity === 'warning') {
              log(`      [${issue.severity}] ${issue.path}: ${issue.message}`, issue.severity === 'error' ? 'red' : 'yellow')
            }
          }
        }
      }
    } catch (error) {
      // Skip
    }
  }

  log(`\n  Results: ${totalEntities} entities checked`, 'blue')
  log(`    Errors: ${bySeverity.error}`, bySeverity.error > 0 ? 'red' : 'reset')
  log(`    Warnings: ${bySeverity.warning}`, bySeverity.warning > 0 ? 'yellow' : 'reset')
  log(`    Info: ${bySeverity.info}`, 'reset')

  return { totalEntities, totalIssues, bySeverity, entities }
}

// ============================================================================
// Image Validation
// ============================================================================

// Non-plant products that don't need scientific names
const NON_PLANT_IMAGE_TYPES = [
  'oil', 'extract', 'factor', 'mpc', 'chitosan', 'shenqu', 'shoudihuang'
]

function isNonPlantImageType(dirName) {
  const lower = dirName.toLowerCase()
  return NON_PLANT_IMAGE_TYPES.some(type => lower.includes(type))
}

async function runImageValidation(root, options) {
  logSection('Phase 4: Image Library Validation')

  const imagesDir = join(root, 'media/images')
  const dirs = readdirSync(imagesDir).filter(d =>
    statSync(join(imagesDir, d)).isDirectory() && d !== 'banners'
  )

  let withMetadata = 0
  let withSpecies = 0
  let withAttribution = 0
  let withSpdxId = 0
  let errors = 0
  let warnings = 0

  const issues = []

  for (const dir of dirs) {
    const dirPath = join(imagesDir, dir)
    const files = readdirSync(dirPath)

    // Check for metadata file
    const metadataFile = files.find(f => f.endsWith('.json') && f !== 'attribution.json')
    if (!metadataFile) {
      errors++
      issues.push({ dir, issue: 'Missing metadata file', severity: 'error' })
      continue
    }

    withMetadata++

    // Read and validate metadata
    try {
      const metadata = JSON.parse(readFileSync(join(dirPath, metadataFile), 'utf8'))

      // Check for species (except non-plant types)
      if (!metadata.species && !isNonPlantImageType(dir)) {
        warnings++
        issues.push({ dir, issue: 'Missing species name', severity: 'warning' })
      } else if (metadata.species) {
        withSpecies++
      }

      // Check for attribution/copyright
      if (!metadata.copyright) {
        warnings++
        issues.push({ dir, issue: 'Missing copyright holder', severity: 'warning' })
      } else {
        withAttribution++
      }

      // Check for SPDX ID
      if (!metadata.spdxId) {
        warnings++
        issues.push({ dir, issue: 'Missing SPDX ID', severity: 'warning' })
      } else {
        withSpdxId++
      }

    } catch (e) {
      errors++
      issues.push({ dir, issue: `Invalid JSON: ${e.message}`, severity: 'error' })
    }
  }

  log(`\n  Results: ${dirs.length} image directories checked`, 'blue')
  log(`    Directories: ${dirs.length}`, 'reset')
  log(`    With metadata: ${withMetadata}`, withMetadata === dirs.length ? 'green' : 'yellow')
  log(`    With species: ${withSpecies} (plants)`, 'reset')
  log(`    With attribution: ${withAttribution}`, withAttribution === dirs.length ? 'green' : 'yellow')
  log(`    With SPDX ID: ${withSpdxId}`, withSpdxId === dirs.length ? 'green' : 'yellow')
  log(`    Errors: ${errors}`, errors > 0 ? 'red' : 'reset')
  log(`    Warnings: ${warnings}`, warnings > 0 ? 'yellow' : 'reset')

  if (options.verbose && issues.length > 0) {
    log('\n  Issues:', 'reset')
    for (const issue of issues.slice(0, 20)) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️'
      log(`    ${icon} ${issue.dir}: ${issue.issue}`, issue.severity === 'error' ? 'red' : 'yellow')
    }
    if (issues.length > 20) {
      log(`    ... and ${issues.length - 20} more`, 'reset')
    }
  }

  return {
    directories: dirs.length,
    withMetadata,
    withSpecies,
    withAttribution,
    withSpdxId,
    errors,
    warnings,
    issues
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    schema: args.includes('--schema'),
    references: args.includes('--references'),
    quality: args.includes('--quality'),
    images: args.includes('--images'),
  }

  // If no specific phase is selected, run all
  const runAll = !options.schema && !options.references && !options.quality && !options.images

  log('\n📋 Herbapedia Validation\n', 'cyan')

  // Find all files
  const searchDirs = [
    'entities',
    'profiles',
    'systems/tcm/reference',
    'systems/western/reference',
    'systems/ayurveda/reference',
    'systems/persian/reference',
    'systems/mongolian/reference',
  ]

  const files = []
  for (const dir of searchDirs) {
    const fullPath = join(ROOT, dir)
    files.push(...findJsonLdFiles(fullPath))
  }

  log(`Found ${files.length} JSON-LD files to validate\n`, 'blue')

  const results = {
    schema: null,
    references: null,
    quality: null,
    images: null,
  }

  // Run validations
  if (runAll || options.schema) {
    results.schema = await runSchemaValidation(files, options)
  }

  if (runAll || options.references) {
    results.references = await runReferenceValidation(files, options)
  }

  if (runAll || options.quality) {
    results.quality = await runQualityValidation(files, options)
  }

  if (runAll || options.images) {
    results.images = await runImageValidation(ROOT, options)
  }

  // Final summary
  log('\n' + '═'.repeat(60), 'cyan')
  log('  Final Summary', 'cyan')
  log('═'.repeat(60) + '\n', 'cyan')

  let hasErrors = false

  if (results.schema) {
    const status = results.schema.failed === 0 ? '✅' : '❌'
    log(`  ${status} Schema: ${results.schema.passed} passed, ${results.schema.failed} failed`, results.schema.failed > 0 ? 'red' : 'green')
    if (results.schema.failed > 0) hasErrors = true
  }

  if (results.references) {
    const status = results.references.brokenRefs === 0 ? '✅' : '⚠️'
    log(`  ${status} References: ${results.references.validRefs} valid, ${results.references.brokenRefs} broken`, results.references.brokenRefs > 0 ? 'yellow' : 'green')
  }

  if (results.quality) {
    const hasQualityIssues = results.quality.bySeverity.error > 0
    const status = hasQualityIssues ? '❌' : results.quality.bySeverity.warning > 0 ? '⚠️' : '✅'
    log(`  ${status} Quality: ${results.quality.totalEntities} entities, ${results.quality.totalIssues} issues`, hasQualityIssues ? 'red' : 'green')
    if (hasQualityIssues) hasErrors = true
  }

  if (results.images) {
    const hasImageErrors = results.images.errors > 0
    const status = hasImageErrors ? '❌' : results.images.warnings > 0 ? '⚠️' : '✅'
    log(`  ${status} Images: ${results.images.directories} dirs, ${results.images.withMetadata} metadata, ${results.images.errors} errors`, hasImageErrors ? 'red' : 'green')
    if (hasImageErrors) hasErrors = true
  }

  if (hasErrors) {
    log('\n❌ Validation completed with errors\n', 'red')
    process.exit(1)
  } else {
    log('\n✅ All validations passed!\n', 'green')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('Validation error:', error)
  process.exit(1)
})

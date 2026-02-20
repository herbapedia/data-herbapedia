#!/usr/bin/env node

/**
 * JSON-LD Data Validation Script
 *
 * Validates completeness of Herbapedia JSON-LD data:
 * - All required fields present
 * - All languages present (en, zh-Hant, zh-Hans)
 * - Medical/academic terminology usage
 * - Reference data integrity
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs'
import { join, extname } from 'path'

// Configuration
const REQUIRED_LANGUAGES = ['en', 'zh-Hant', 'zh-Hans']
const DATA_DIR = process.argv[2] || '.'

// Medical terminology patterns (case-insensitive)
const MEDICAL_TERMS = {
  en: [
    // Botanical/Scientific
    'species', 'genus', 'family', 'botanical', 'pharmacognosy',
    // Pharmacological
    'pharmacological', 'therapeutic', 'medicinal', 'pharmaceutical',
    'active compound', 'phytochemical', 'bioactive', 'metabolite',
    // Clinical
    'clinical', 'efficacy', 'indications', 'contraindications',
    'dosage', 'adverse', 'toxicity', 'pharmacokinetics',
    // Anatomical/Physiological
    'hepatic', 'renal', 'cardiovascular', 'gastrointestinal',
    'respiratory', 'nervous system', 'immune', 'endocrine',
    // Traditional Medicine
    'traditional', 'ayurvedic', 'chinese medicine', 'herbalism',
    'meridian', 'qi', 'yin', 'yang', 'dosha'
  ],
  zh: [
    // Botanical/Scientific
    '植物', '藥用', '藥理', '本草', '中藥',
    // Pharmacological
    '藥理', '治療', '活性', '化合物', '成分',
    // Clinical
    '臨床', '功效', '適應症', '禁忌', '劑量', '毒性',
    // Anatomical
    '肝', '腎', '心', '脾', '肺', '經絡', '氣血',
    // Traditional
    '陰陽', '寒熱', '虛實', '表裡'
  ]
}

// Results storage
const results = {
  summary: {
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    warnings: 0,
    errors: 0
  },
  files: [],
  missingLanguages: [],
  missingFields: [],
  terminologyIssues: [],
  referenceIssues: []
}

/**
 * Recursively find all JSON-LD files
 */
function findJsonLdFiles(dir, files = []) {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (entry !== 'node_modules' && entry !== 'dist') {
        findJsonLdFiles(fullPath, files)
      }
    } else if (extname(entry) === '.jsonld') {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Validate language map has all required languages
 */
function validateLanguageMap(langMap, fieldName, filePath) {
  if (!langMap || typeof langMap !== 'object') {
    return [{ field: fieldName, issue: 'Missing or invalid language map' }]
  }

  const issues = []

  for (const lang of REQUIRED_LANGUAGES) {
    if (!langMap[lang] || langMap[lang].trim() === '') {
      issues.push({
        field: `${fieldName}.${lang}`,
        issue: `Missing ${lang} translation`
      })
      results.missingLanguages.push({
        file: filePath,
        field: `${fieldName}.${lang}`
      })
    }
  }

  return issues
}

/**
 * Check for medical/academic terminology
 */
function checkTerminology(text, language = 'en') {
  if (!text || typeof text !== 'string') return { hasMedicalTerms: false, foundTerms: [] }

  const lowerText = text.toLowerCase()
  const terms = language === 'en' ? MEDICAL_TERMS.en : MEDICAL_TERMS.zh
  const foundTerms = terms.filter(term => lowerText.includes(term.toLowerCase()))

  return {
    hasMedicalTerms: foundTerms.length > 0,
    foundTerms
  }
}

/**
 * Validate plant entity
 */
function validatePlantEntity(data, filePath) {
  const issues = []
  const warnings = []

  // Required fields
  const requiredFields = ['@id', '@type', 'name']
  for (const field of requiredFields) {
    if (!data[field]) {
      issues.push({ field, issue: 'Missing required field' })
    }
  }

  // Name must be multilingual
  if (data.name) {
    const langIssues = validateLanguageMap(data.name, 'name', filePath)
    issues.push(...langIssues)
  }

  // Description should be multilingual
  if (data.description) {
    const langIssues = validateLanguageMap(data.description, 'description', filePath)
    issues.push(...langIssues)
  } else {
    warnings.push({ field: 'description', issue: 'Missing description' })
  }

  // Common name should be multilingual
  if (data.commonName) {
    const langIssues = validateLanguageMap(data.commonName, 'commonName', filePath)
    issues.push(...langIssues)
  }

  // Check terminology in descriptions
  if (data.description) {
    for (const lang of REQUIRED_LANGUAGES) {
      if (data.description[lang]) {
        const termCheck = checkTerminology(data.description[lang], lang === 'en' ? 'en' : 'zh')
        if (!termCheck.hasMedicalTerms && data.description[lang].length > 100) {
          warnings.push({
            field: `description.${lang}`,
            issue: 'Consider using more medical/academic terminology',
            suggestion: termCheck.foundTerms.length === 0
          })
        }
      }
    }
  }

  return { issues, warnings }
}

/**
 * Validate TCM profile
 */
function validateTcmProfile(data, filePath) {
  const issues = []
  const warnings = []

  // Required fields for TCM
  const requiredFields = ['@id', '@type', 'derivedFromPlant', 'hasCategory', 'hasNature']
  for (const field of requiredFields) {
    if (!data[field]) {
      issues.push({ field, issue: 'Missing required TCM field' })
    }
  }

  // Multilingual content
  const multilingualFields = [
    'tcmHistory', 'tcmTraditionalUsage', 'tcmModernResearch',
    'tcmFunctions', 'contraindications', 'dosage'
  ]

  for (const field of multilingualFields) {
    if (data[field]) {
      const langIssues = validateLanguageMap(data[field], field, filePath)
      issues.push(...langIssues)
    }
  }

  // Check terminology
  if (data.tcmTraditionalUsage) {
    for (const lang of REQUIRED_LANGUAGES) {
      if (data.tcmTraditionalUsage[lang]) {
        const termCheck = checkTerminology(data.tcmTraditionalUsage[lang], lang === 'en' ? 'en' : 'zh')
        if (!termCheck.hasMedicalTerms && data.tcmTraditionalUsage[lang].length > 50) {
          warnings.push({
            field: `tcmTraditionalUsage.${lang}`,
            issue: 'Consider using more TCM medical terminology'
          })
        }
      }
    }
  }

  return { issues, warnings }
}

/**
 * Validate Western profile
 */
function validateWesternProfile(data, filePath) {
  const issues = []
  const warnings = []

  // Required fields
  const requiredFields = ['@id', '@type']
  for (const field of requiredFields) {
    if (!data[field]) {
      issues.push({ field, issue: 'Missing required field' })
    }
  }

  // Multilingual content
  const multilingualFields = [
    'westernHistory', 'westernTraditionalUsage', 'westernModernResearch'
  ]

  for (const field of multilingualFields) {
    if (data[field]) {
      const langIssues = validateLanguageMap(data[field], field, filePath)
      issues.push(...langIssues)
    }
  }

  return { issues, warnings }
}

/**
 * Validate reference data
 */
function validateReferenceData(data, filePath) {
  const issues = []
  const warnings = []

  if (!data['@graph'] || !Array.isArray(data['@graph'])) {
    issues.push({ field: '@graph', issue: 'Missing or invalid @graph array' })
    return { issues, warnings }
  }

  for (const item of data['@graph']) {
    // Each item should have prefLabel in all languages
    if (item.prefLabel) {
      const langIssues = validateLanguageMap(item.prefLabel, `prefLabel (${item['@id']})`, filePath)
      issues.push(...langIssues)
    } else {
      issues.push({ field: `${item['@id']}.prefLabel`, issue: 'Missing prefLabel' })
    }

    // Description is recommended
    if (item.description) {
      const langIssues = validateLanguageMap(item.description, `description (${item['@id']})`, filePath)
      if (langIssues.length > 0) {
        warnings.push(...langIssues.map(i => ({ ...i, issue: `Optional: ${i.issue}` })))
      }
    }
  }

  return { issues, warnings }
}

/**
 * Check if path matches a pattern (cross-platform)
 */
function pathMatches(filePath, pattern) {
  // Normalize path separators and ensure leading/trailing slashes for matching
  let normalized = filePath.replace(/\\/g, '/')
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  return normalized.includes(pattern)
}

/**
 * Determine file type and validate accordingly
 */
function validateFile(filePath) {
  const fileResult = {
    path: filePath,
    type: 'unknown',
    valid: true,
    issues: [],
    warnings: []
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    results.summary.totalFiles++

    // Skip schema/context files
    if (pathMatches(filePath, '/schema/')) {
      fileResult.type = 'schema'
      results.summary.validFiles++
      results.files.push(fileResult)
      return fileResult
    }

    // Determine file type based on path and content
    if (pathMatches(filePath, '/entities/plants/') && filePath.endsWith('entity.jsonld')) {
      fileResult.type = 'plant-entity'
      const { issues, warnings } = validatePlantEntity(data, filePath)
      fileResult.issues = issues
      fileResult.warnings = warnings
    } else if (pathMatches(filePath, '/systems/tcm/herbs/') && filePath.endsWith('profile.jsonld')) {
      fileResult.type = 'tcm-profile'
      const { issues, warnings } = validateTcmProfile(data, filePath)
      fileResult.issues = issues
      fileResult.warnings = warnings
    } else if (pathMatches(filePath, '/systems/western/herbs/') && filePath.endsWith('profile.jsonld')) {
      fileResult.type = 'western-profile'
      const { issues, warnings } = validateWesternProfile(data, filePath)
      fileResult.issues = issues
      fileResult.warnings = warnings
    } else if (pathMatches(filePath, '/systems/ayurveda/dravyas/') && filePath.endsWith('profile.jsonld')) {
      fileResult.type = 'ayurveda-profile'
      // Basic validation for Ayurveda profiles
      if (data.name) {
        const langIssues = validateLanguageMap(data.name, 'name', filePath)
        fileResult.issues = langIssues
      }
    } else if (pathMatches(filePath, '/reference/') ||
               (pathMatches(filePath, '/systems/tcm/') && !pathMatches(filePath, '/herbs/')) ||
               (pathMatches(filePath, '/systems/western/') && !pathMatches(filePath, '/herbs/')) ||
               (pathMatches(filePath, '/systems/ayurveda/') && !pathMatches(filePath, '/dravyas/'))) {
      fileResult.type = 'reference-data'
      const { issues, warnings } = validateReferenceData(data, filePath)
      fileResult.issues = issues
      fileResult.warnings = warnings
    } else {
      // Unknown type - still validate basic JSON-LD structure
      fileResult.type = 'other'
      if (!data['@id']) {
        fileResult.warnings.push({ field: '@id', issue: 'Missing @id field' })
      }
    }

    // Update summary
    if (fileResult.issues.length === 0) {
      results.summary.validFiles++
    } else {
      results.summary.invalidFiles++
      fileResult.valid = false
    }

    results.summary.warnings += fileResult.warnings.length
    results.summary.errors += fileResult.issues.length

  } catch (error) {
    fileResult.valid = false
    fileResult.issues.push({ field: 'parse', issue: error.message })
    results.summary.invalidFiles++
    results.summary.errors++
  }

  results.files.push(fileResult)
  return fileResult
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70))
  console.log('HERBAPEDIA JSON-LD DATA VALIDATION REPORT')
  console.log('='.repeat(70))

  // Summary
  console.log('\n📊 SUMMARY')
  console.log('-'.repeat(40))
  console.log(`Total files scanned:    ${results.summary.totalFiles}`)
  console.log(`Valid files:            ${results.summary.validFiles}`)
  console.log(`Invalid files:          ${results.summary.invalidFiles}`)
  console.log(`Total errors:           ${results.summary.errors}`)
  console.log(`Total warnings:         ${results.summary.warnings}`)

  // File type breakdown
  const typeCount = {}
  for (const file of results.files) {
    typeCount[file.type] = (typeCount[file.type] || 0) + 1
  }
  console.log('\n📁 FILES BY TYPE')
  console.log('-'.repeat(40))
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`${type.padEnd(25)} ${count}`)
  }

  // Errors by type
  const filesWithErrors = results.files.filter(f => f.issues.length > 0)
  if (filesWithErrors.length > 0) {
    console.log('\n❌ FILES WITH ERRORS')
    console.log('-'.repeat(40))
    for (const file of filesWithErrors) {
      console.log(`\n${file.path}`)
      for (const issue of file.issues) {
        console.log(`  └─ ${issue.field}: ${issue.issue}`)
      }
    }
  }

  // Warnings summary
  const filesWithWarnings = results.files.filter(f => f.warnings.length > 0)
  if (filesWithWarnings.length > 0) {
    console.log('\n⚠️  WARNINGS (non-critical)')
    console.log('-'.repeat(40))
    const warningCount = filesWithWarnings.length
    console.log(`${warningCount} files have warnings (terminology, optional fields)`)
  }

  // Language coverage
  if (results.missingLanguages.length > 0) {
    console.log('\n🌐 MISSING LANGUAGE TRANSLATIONS')
    console.log('-'.repeat(40))
    const langCount = { en: 0, 'zh-Hant': 0, 'zh-Hans': 0 }
    for (const item of results.missingLanguages) {
      const lang = item.field.split('.').pop()
      if (langCount[lang] !== undefined) {
        langCount[lang]++
      }
    }
    for (const [lang, count] of Object.entries(langCount)) {
      console.log(`${lang.padEnd(10)} ${count} missing`)
    }
  }

  // Validation result
  console.log('\n' + '='.repeat(70))
  if (results.summary.invalidFiles === 0) {
    console.log('✅ VALIDATION PASSED - All files are valid')
  } else {
    console.log(`❌ VALIDATION FAILED - ${results.summary.invalidFiles} files have errors`)
  }
  console.log('='.repeat(70) + '\n')

  return results.summary.invalidFiles === 0
}

/**
 * Main execution
 */
function main() {
  console.log('Starting JSON-LD validation...')
  console.log(`Data directory: ${DATA_DIR}`)

  // Find all JSON-LD files
  const files = findJsonLdFiles(DATA_DIR)
  console.log(`Found ${files.length} JSON-LD files\n`)

  // Validate each file
  for (const file of files) {
    validateFile(file)
  }

  // Generate and output report
  const success = generateReport()

  // Write detailed report to file
  const reportPath = join(DATA_DIR, 'validation-report.json')
  writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`Detailed report saved to: ${reportPath}`)

  // Exit with appropriate code
  process.exit(success ? 0 : 1)
}

main()

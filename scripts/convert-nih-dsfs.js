#!/usr/bin/env node
/**
 * Convert NIH Dietary Supplement Fact Sheets to Herbapedia Modern profiles
 *
 * Usage: node scripts/convert-nih-dsfs.js
 *
 * Source: /Users/mulgogi/src/sipm/data-nih-dsfs/output/ods/*.yaml
 * Target: systems/modern/substances/{slug}/profile.jsonld
 */

import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SOURCE_DIR = '/Users/mulgogi/src/sipm/data-nih-dsfs/output/ods'
const TARGET_DIR = './systems/modern/substances'

// Classification to slug prefix mapping
const CLASSIFICATION_PREFIX = {
  'vitamin': 'vitamin',
  'mineral': 'mineral',
  'amino_acid': 'amino-acid',
  'fatty_acid': 'fatty-acid',
  'enzyme': 'enzyme',
  'probiotic': 'probiotic',
  'fiber': 'fiber',
  'herb': 'herb',
  'botanical': 'botanical',
  'other': 'substance'
}

// Vitamin name normalization
const VITAMIN_SLUGS = {
  'vitamin a and carotenoids': 'vitamin-a',
  'vitamin b6': 'vitamin-b6',
  'vitamin b12': 'vitamin-b12',
  'vitamin c': 'vitamin-c',
  'vitamin d': 'vitamin-d',
  'vitamin e': 'vitamin-e',
  'vitamin k': 'vitamin-k',
  'thiamin': 'vitamin-b1',
  'riboflavin': 'vitamin-b2',
  'niacin': 'vitamin-b3',
  'folate': 'vitamin-b9',
  'pantothenic acid': 'vitamin-b5',
  'biotin': 'vitamin-b7',
}

// Mineral name normalization
const MINERAL_SLUGS = {
  'calcium': 'calcium',
  'iron': 'iron',
  'magnesium': 'magnesium',
  'zinc': 'zinc',
  'selenium': 'selenium',
  'copper': 'copper',
  'chromium': 'chromium',
  'iodine': 'iodine',
  'manganese': 'manganese',
  'molybdenum': 'molybdenum',
  'phosphorus': 'phosphorus',
  'potassium': 'potassium',
  'fluoride': 'fluoride',
  'boron': 'boron',
  'vanadium': 'vanadium',
  'nickel': 'nickel',
  'silicon': 'silicon',
}

// Other nutrient slugs
const NUTRIENT_SLUGS = {
  'choline': 'choline',
  'carnitine': 'carnitine',
  'omega-3 fatty acids': 'omega-3',
  'probiotics': 'probiotics',
}

/**
 * Generate slug from name
 */
function generateSlug(name, classification) {
  const normalizedName = name.toLowerCase().trim()

  // Check known mappings first
  if (VITAMIN_SLUGS[normalizedName]) return VITAMIN_SLUGS[normalizedName]
  if (MINERAL_SLUGS[normalizedName]) return MINERAL_SLUGS[normalizedName]
  if (NUTRIENT_SLUGS[normalizedName]) return NUTRIENT_SLUGS[normalizedName]

  // Generate from name
  return normalizedName
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Build name LanguageMap
 */
function buildNameMap(primaryName, commonNames) {
  const nameMap = {
    'en': primaryName
  }

  // Add Chinese translations if available (would need translation service)
  // For now, just use English

  return nameMap
}

/**
 * Extract dosage information from dosage tables
 */
function extractDosage(dosageTables) {
  if (!dosageTables || dosageTables.length === 0) return null

  const dosage = {
    'en': []
  }

  for (const table of dosageTables) {
    if (table.title) {
      dosage['en'].push(`${table.title}:`)
    }

    if (table.rows && table.rows.length > 0) {
      for (const row of table.rows) {
        const parts = []
        if (row.age_group) parts.push(row.age_group)
        if (row.male) parts.push(`Male: ${row.male}`)
        if (row.female) parts.push(`Female: ${row.female}`)
        if (row.pregnancy) parts.push(`Pregnancy: ${row.pregnancy}`)
        if (row.lactation) parts.push(`Lactation: ${row.lactation}`)
        if (parts.length > 0) {
          dosage['en'].push(parts.join('; '))
        }
      }
    }

    if (table.notes && table.notes.length > 0) {
      for (const note of table.notes) {
        dosage['en'].push(`Note: ${note}`)
      }
    }
  }

  return dosage['en'].length > 0 ? { 'en': dosage['en'].join('\n') } : null
}

/**
 * Extract safety information
 */
function extractSafety(safety) {
  if (!safety) return null

  const safetyInfo = {
    'en': []
  }

  if (safety.general_safety) {
    safetyInfo['en'].push(safety.general_safety)
  }

  if (safety.side_effects && safety.side_effects.length > 0) {
    safetyInfo['en'].push(`Side effects: ${safety.side_effects.join(', ')}`)
  }

  if (safety.upper_limit) {
    safetyInfo['en'].push(`Upper limit: ${safety.upper_limit}`)
  }

  if (safety.warnings && safety.warnings.length > 0) {
    safetyInfo['en'].push(`Warnings: ${safety.warnings.join('; ')}`)
  }

  return safetyInfo['en'].length > 0 ? { 'en': safetyInfo['en'].join('\n') } : null
}

/**
 * Extract interactions
 */
function extractInteractions(safety) {
  if (!safety?.drug_interactions || safety.drug_interactions.length === 0) return null

  return safety.drug_interactions.map(interaction => ({
    drugClass: interaction.drug_class,
    drugs: interaction.drug_names || [],
    description: interaction.description,
    severity: interaction.severity || 'moderate'
  }))
}

/**
 * Extract contraindications
 */
function extractContraindications(safety) {
  if (!safety?.contraindications || safety.contraindications.length === 0) return null

  return {
    'en': safety.contraindications.join('; ')
  }
}

/**
 * Extract content sections by type
 */
function extractSections(sections, type) {
  if (!sections) return null

  const matchingSections = sections.filter(s => s.type === type)
  if (matchingSections.length === 0) return null

  return {
    'en': matchingSections.map(s => s.content).join('\n\n')
  }
}

/**
 * Extract food sources
 */
function extractFoodSources(sections) {
  if (!sections) return []

  const sourceSections = sections.filter(s =>
    s.type === 'food_sources' || s.type === 'sources'
  )

  const sources = []
  for (const section of sourceSections) {
    if (section.content) {
      // Extract food items from content (simple approach)
      const lines = section.content.split('\n')
      for (const line of lines) {
        const match = line.match(/^\s*[-*]\s*(.+)$/)
        if (match) {
          sources.push(match[1].trim())
        }
      }
    }
  }

  return sources
}

/**
 * Fix NIH DSFS YAML format (values on next line after keys, with no indentation)
 */
function fixYamlFormat(content) {
  // Fix multiline key-value pairs where value is on next line with NO indentation
  // e.g., "  primary_name:\nVitamin C" -> "  primary_name: Vitamin C"
  const lines = content.split('\n')
  const fixedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this line is a key (ends with colon, no value after)
    if (line.match(/^(\s*)([a-z_]+):\s*$/i)) {
      // Check if next line is a value (not a key, not empty, not list item)
      const nextLine = lines[i + 1] || ''

      // NIH DSFS format: value is on next line with NO indentation
      // Key: "  primary_name:" (indented)
      // Value: "Vitamin C" (NO indentation)
      if (nextLine &&
          !nextLine.match(/^(\s*)([a-z_]+):\s*$/i) &&
          !nextLine.match(/^\s*$/) &&
          !nextLine.match(/^\s*-\s*$/)) {
        // This is a value on next line - combine them
        const value = nextLine.trim()
        // Quote the value if it contains special characters
        const quotedValue = value.match(/[:\[\]{}>|*#]/) ? `"${value.replace(/"/g, '\\"')}"` : value
        fixedLines.push(line + ' ' + quotedValue)
        i++ // Skip the next line
        continue
      }
    }

    fixedLines.push(line)
  }

  return fixedLines.join('\n')
}

/**
 * Convert a single NIH DSFS file to herbapedia profile format
 */
function convertNIHDSFS(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')

  // Fix YAML format
  content = fixYamlFormat(content)

  const data = yaml.parse(content)

  if (!data.identity) {
    throw new Error('Missing identity section')
  }

  const primaryName = data.identity.primary_name
  const classification = data.identity.classification || 'other'
  const slug = generateSlug(primaryName, classification)

  // Build the profile
  const profile = {
    '@context': 'https://www.herbapedia.org/schema/context/modern-medicine.jsonld',
    '@id': `https://www.herbapedia.org/graph/profile/modern/${slug}`,
    '@type': ['modern:SubstanceProfile', 'schema:DietarySupplement'],
    slug,
    name: buildNameMap(primaryName, data.identity.common_names),
    classification,
    source: {
      source: 'NIH Office of Dietary Supplements',
      sourceUrl: data.source?.url || '',
      license: 'Public Domain',
      verified: true,
      verifiedDate: data.source?.scraped_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    }
  }

  // Add alternate names
  if (data.identity.common_names && data.identity.common_names.length > 0) {
    profile.alternateName = data.identity.common_names
  }

  // Add scientific names (for herbs)
  if (data.identity.scientific_names && data.identity.scientific_names.length > 0) {
    profile.scientificName = data.identity.scientific_names[0]
  }

  // Add description
  const intro = extractSections(data.sections, 'introduction')
  if (intro) {
    profile.description = intro
  }

  // Add mechanism of action
  const background = extractSections(data.sections, 'background')
  if (background) {
    profile.mechanismOfAction = background
  }

  // Add clinical evidence
  const health = extractSections(data.sections, 'health')
  if (health) {
    profile.clinicalEvidence = health
  }

  // Add dosage
  const dosage = extractDosage(data.dosage_tables)
  if (dosage) {
    profile.dosage = dosage
  }

  // Add safety
  const safety = extractSafety(data.safety)
  if (safety) {
    profile.safetyProfile = safety
  }

  // Add interactions
  const interactions = extractInteractions(data.safety)
  if (interactions) {
    profile.interactions = interactions
  }

  // Add contraindications
  const contraindications = extractContraindications(data.safety)
  if (contraindications) {
    profile.contraindications = contraindications
  }

  // Add food sources
  const foodSources = extractFoodSources(data.sections)
  if (foodSources.length > 0) {
    profile.dietarySources = foodSources
  }

  // Add references (simplified)
  if (data.references && data.references.length > 0) {
    profile.referenceCount = data.references.length
  }

  return { slug, profile }
}

/**
 * Main conversion function
 */
async function main() {
  console.log('💊 Converting NIH DSFS to Herbapedia Modern profiles...\n')

  // Read all ODS YAML files
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.yaml') && f.startsWith('ods_'))

  console.log(`Found ${files.length} ODS files\n`)

  let converted = 0
  let skipped = 0
  const convertedSlugs = []

  for (const file of files) {
    try {
      const filePath = path.join(SOURCE_DIR, file)
      const { slug, profile } = convertNIHDSFS(filePath)

      // Skip if already converted
      if (convertedSlugs.includes(slug)) {
        console.log(`⏭️  ${slug} (duplicate, skipping)`)
        continue
      }
      convertedSlugs.push(slug)

      // Create target directory
      const targetDir = path.join(TARGET_DIR, slug)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Write profile
      const targetPath = path.join(targetDir, 'profile.jsonld')
      fs.writeFileSync(targetPath, JSON.stringify(profile, null, 2))

      converted++
      console.log(`✅ ${slug} (${profile.classification})`)
    } catch (error) {
      skipped++
      console.log(`❌ ${file}: ${error.message}`)
    }
  }

  console.log(`\n📊 Conversion complete:`)
  console.log(`   Converted: ${converted}`)
  console.log(`   Skipped: ${skipped}`)
}

main().catch(console.error)

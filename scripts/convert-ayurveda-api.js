#!/usr/bin/env node
/**
 * Convert Ayurvedic Pharmacopoeia of India data to Herbapedia normalized profiles
 *
 * Usage: node scripts/convert-ayurveda-api.js
 *
 * Source: /Users/mulgogi/src/openphar/data-india-ayurvedic-pharmacopoeia/
 * Target: systems/ayurveda/dravyas/{slug}/profile.jsonld
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SOURCE_DIR = '/Users/mulgogi/src/openphar/data-india-ayurvedic-pharmacopoeia/ontology/data/ingredients'
const TARGET_DIR = './systems/ayurveda/dravyas'
const VOCAB_DIR = './systems/ayurveda/reference'

// Rasa mapping (Sanskrit -> slug)
const RASA_MAP = {
  'Madhura': 'madhura',    // Sweet
  'Amla': 'amla',          // Sour
  'Lavana': 'lavana',      // Salty
  'Katu': 'katu',          // Pungent
  'Tikta': 'tikta',        // Bitter
  'Kashaya': 'kashaya',    // Astringent
  'Ka¡ya': 'kashaya',      // Encoded variant
  'KaÀ¡ya': 'kashaya',     // Encoded variant
}

// Guna mapping
const GUNA_MAP = {
  'Guru': 'guru',          // Heavy
  'Laghu': 'laghu',        // Light
  'Snigdha': 'snigdha',    // Oily/Unctuous
  'Ruksha': 'ruksha',      // Dry
  'Shita': 'shita',        // Cold
  'Ushna': 'ushna',        // Hot
  'UÀ¸a': 'ushna',         // Encoded variant
  'Mridu': 'mridu',        // Soft
  'Tikshna': 'tikshna',    // Sharp/Penetrating
  'Sthira': 'sthira',      // Stable
  'Sara': 'sara',          // Mobile
  'Mrudu': 'mridu',        // Soft variant
  'Kathina': 'kathina',    // Hard
  'Vishada': 'vishada',    // Clear
  'Picchila': 'picchila',  // Slimy
  'Shlakshna': 'shlakshna', // Smooth
  'Khara': 'khara',        // Rough
  'Sukshma': 'sukshma',    // Subtle
  'Sthula': 'sthula',      // Gross
  'Sandhra': 'sandhra',    // Dense
  'Sandhra': 'sandhra',
  'Drava': 'drava',        // Liquid
}

// Virya mapping
const VIRYA_MAP = {
  'Ushna': 'ushna',
  'UÀ¸a': 'ushna',
  'Shita': 'shita',
  'Sita': 'shita',
}

// Vipaka mapping
const VIPAKA_MAP = {
  'Madhura': 'madhura',
  'Amla': 'amla',
  'Katu': 'katu',
}

// Language code mapping
const LANG_MAP = {
  'sa': 'sa',      // Sanskrit
  'sa-Latn': 'sa-Latn',
  'hi': 'hi',      // Hindi
  'en': 'en',      // English
  'bn': 'bn',      // Bengali
  'gu': 'gu',      // Gujarati
  'kn': 'kn',      // Kannada
  'ml': 'ml',      // Malayalam
  'mr': 'mr',      // Marathi
  'ta': 'ta',      // Tamil
  'te': 'te',      // Telugu
  'pa': 'pa',      // Punjabi
  'ur': 'ur',      // Urdu
  'as': 'as',      // Assamese
  'ks': 'ks',      // Kashmiri
  'or': 'or',      // Oriya
  'zh-Hans': 'zh-Hans',
  'zh-Hant': 'zh-Hant',
}

/**
 * Generate slug from Sanskrit name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/a¡/g, 'a')
    .replace(/À/g, 'a')
    .replace(/¸/g, 'sh')
}

/**
 * Parse rasa string into array of slugs
 */
function parseRasa(rasaStr) {
  if (!rasaStr) return []
  const rasas = rasaStr.split(/[,;]/).map(s => s.trim())
  return rasas
    .map(r => RASA_MAP[r] || r.toLowerCase())
    .filter(r => r && r.length > 0)
}

/**
 * Parse guna string into array of slugs
 */
function parseGuna(gunaStr) {
  if (!gunaStr) return []
  const gunas = gunaStr.split(/[,;]/).map(s => s.trim())
  return gunas
    .map(g => GUNA_MAP[g] || g.toLowerCase())
    .filter(g => g && g.length > 0)
}

/**
 * Parse virya string
 */
function parseVirya(viryaStr) {
  if (!viryaStr) return null
  return VIRYA_MAP[viryaStr.trim()] || viryaStr.toLowerCase()
}

/**
 * Parse vipaka string
 */
function parseVipaka(vipakaStr) {
  if (!vipakaStr) return null
  return VIPAKA_MAP[vipakaStr.trim()] || vipakaStr.toLowerCase()
}

/**
 * Parse karma string into array
 */
function parseKarma(karmaStr) {
  if (!karmaStr) return []
  return karmaStr
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Build name LanguageMap from vernacular names
 */
function buildNameMap(canonicalName, vernacularNames) {
  const nameMap = {}

  // Add canonical Sanskrit name
  if (canonicalName?.sa) {
    nameMap['sa'] = canonicalName.sa
    // Generate IAST transliteration
    nameMap['sa-Latn'] = transliterateToIAST(canonicalName.sa)
  }

  // Add vernacular names
  if (vernacularNames && Array.isArray(vernacularNames)) {
    for (const vn of vernacularNames) {
      const lang = LANG_MAP[vn.language] || vn.language
      if (!nameMap[lang] && vn.name) {
        // Clean up the name (remove prefixes like "-Gujrati : ")
        const cleanName = vn.name.replace(/^-\s*\w+\s*:\s*/, '')
        nameMap[lang] = cleanName
      }
    }
  }

  return nameMap
}

/**
 * Simple transliteration to IAST (approximate)
 */
function transliterateToIAST(text) {
  return text
    .replace(/¡/g, 'ā')
    .replace(/À/g, 'ā')
    .replace(/¸/g, 'ś')
    .replace(/¿/g, 'ī')
    .replace(/Â/g, 'ū')
    .replace(/¢/g, 'ī')
}

/**
 * Convert a single ingredient to herbapedia profile format
 */
function convertIngredient(source) {
  const slug = generateSlug(source.canonicalName?.sa || source['@id'].split('/').pop())

  // Build the profile
  const profile = {
    '@context': 'https://www.herbapedia.org/schema/context/ayurveda.jsonld',
    '@id': `https://www.herbapedia.org/graph/profile/ayurveda/${slug}`,
    '@type': ['ayurveda:Dravya', 'schema:DietarySupplement'],
    slug,
    name: buildNameMap(source.canonicalName, source.vernacularNames),
    derivedFrom: {
      '@id': `https://www.herbapedia.org/graph/species/${slug}`
    },
    partUsed: source.partUsed?.toLowerCase() || 'root',
    source: {
      source: 'Ayurvedic Pharmacopoeia of India',
      sourceUrl: 'https://www.ayush.gov.in/',
      identifier: source.identifier,
      license: 'CC-BY-4.0',
      verified: true
    }
  }

  // Add Ayurvedic properties
  const rasas = parseRasa(source.rasa)
  if (rasas.length > 0) {
    profile.hasRasa = rasas.map(r => ({
      '@id': `https://www.herbapedia.org/graph/vocab/ayurveda/rasa/${r}`
    }))
  }

  const gunas = parseGuna(source.guna)
  if (gunas.length > 0) {
    profile.hasGuna = gunas.map(g => ({
      '@id': `https://www.herbapedia.org/graph/vocab/ayurveda/guna/${g}`
    }))
  }

  const virya = parseVirya(source.virya)
  if (virya) {
    profile.hasVirya = {
      '@id': `https://www.herbapedia.org/graph/vocab/ayurveda/virya/${virya}`
    }
  }

  const vipaka = parseVipaka(source.vipaka)
  if (vipaka) {
    profile.hasVipaka = {
      '@id': `https://www.herbapedia.org/graph/vocab/ayurveda/vipaka/${vipaka}`
    }
  }

  const karmas = parseKarma(source.karma)
  if (karmas.length > 0) {
    profile.karma = karmas
  }

  // Add therapeutic uses
  if (source.therapeuticUses && source.therapeuticUses.length > 0) {
    profile.indications = source.therapeuticUses
  }

  // Add dosage
  if (source.dose) {
    profile.dosage = {
      'en': source.dose
    }
  }

  // Add formulations
  if (source.importantFormulations && source.importantFormulations.length > 0) {
    profile.importantFormulations = source.importantFormulations
  }

  // Add constituents
  if (source.constituents) {
    profile.constituents = {
      'en': source.constituents
    }
  }

  return { slug, profile }
}

/**
 * Main conversion function
 */
async function main() {
  console.log('🌿 Converting Ayurvedic Pharmacopoeia to Herbapedia format...\n')

  // Read all ingredient files
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.jsonld') && f !== 'ingredients.jsonld')

  console.log(`Found ${files.length} ingredient files\n`)

  let converted = 0
  let skipped = 0

  for (const file of files) {
    try {
      const filePath = path.join(SOURCE_DIR, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const source = JSON.parse(content)

      const { slug, profile } = convertIngredient(source)

      // Create target directory
      const targetDir = path.join(TARGET_DIR, slug)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Write profile
      const targetPath = path.join(targetDir, 'profile.jsonld')
      fs.writeFileSync(targetPath, JSON.stringify(profile, null, 2))

      converted++
      console.log(`✅ ${slug}`)
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

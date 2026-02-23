#!/usr/bin/env node

/**
 * Generate Western Herb Profiles from YAML Data
 *
 * Creates JSON-LD profiles for western herbs using the western.jsonld context.
 * Extracts content from existing YAML files.
 *
 * Usage:
 *   node scripts/generate-western-profiles.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use herbapedia's node_modules for yaml
const CONTENT_DIR = join(__dirname, '../../herbapedia/src/content/herbs')
const OUTPUT_DIR = join(__dirname, '../systems/western/herbs')

// Western herbs that have YAML content
const WESTERN_HERBS = [
  'bilberry',
  'blueberry',
  'cranberry',
  'dandelion',
  'echinacea',
  'hawthorn',
  'lavender-oil',
  'mint',
  'peppermint-oil',
  'rosemary-oil',
  'sage-oil',
  'st-johns-wort',
  'valerian',
  'chamomile',
  'turmeric',
  'milk-thistle',
  'ginger',
  'thyme-oil',
  'ginkgo',
  'hawthorn-berry',
  'licorice-root',
  'clove-oil',
  'tea-tree-oil',
  'eucalyptus-oil',
  'evening-primrose-oil',
  'borage-extract',
  'grape-seed',
  'garlic',
  'green-tea',
  'saw-palmetto',
  'jojoba-seed-oil'
]

/**
 * Parse YAML file safely
 */
function parseYaml(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return YAML.parse(content)
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`)
    return null
  }
}

/**
 * Load multilingual content for a herb
 */
function loadHerbContent(slug) {
  const contentDir = join(CONTENT_DIR, slug)
  if (!existsSync(contentDir)) {
    return null
  }

  const languages = ['en', 'zh-HK', 'zh-CN']
  const content = {}

  for (const lang of languages) {
    const yamlPath = join(contentDir, `${lang}.yaml`)
    if (existsSync(yamlPath)) {
      const data = parseYaml(yamlPath)
      if (data) {
        content[lang] = data
      }
    }
  }

  return Object.keys(content).length > 0 ? content : null
}

/**
 * Generate localized name object
 */
function generateNames(content) {
  const names = {}

  if (content['en']?.title) {
    names.en = content['en'].title
  }
  if (content['zh-HK']?.title) {
    names['zh-Hant'] = content['zh-HK'].title
  }
  if (content['zh-CN']?.title) {
    names['zh-Hans'] = content['zh-CN'].title
  }

  return names
}

/**
 * Generate language-mapped content
 */
function generateLanguageMap(content, field) {
  const map = {}

  if (content['en']?.[field]) {
    map.en = content['en'][field]
  }
  if (content['zh-HK']?.[field]) {
    map['zh-Hant'] = content['zh-HK'][field]
  }
  if (content['zh-CN']?.[field]) {
    map['zh-Hans'] = content['zh-CN'][field]
  }

  return Object.keys(map).length > 0 ? map : null
}

/**
 * Generate a Western herb profile
 */
function generateWesternProfile(slug, content) {
  const en = content['en']
  if (!en) return null

  // Extract English content
  const history = generateLanguageMap(content, 'history')
  const introduction = generateLanguageMap(content, 'introduction')
  const traditionalUsage = generateLanguageMap(content, 'traditional_usage')
  const functions = generateLanguageMap(content, 'functions')

  const profile = {
    '@context': '../../schema/context/western.jsonld',
    '@id': `western/${slug}`,
    '@type': [
      'western:Herb',
      'schema:DietarySupplement'
    ],
    derivedFromPlant: {
      '@id': `plant/${slug}`
    },
    name: generateNames(content),
    scientificName: en.scientific_name || null,
    hasAction: extractActions(en),
    hasOrganAffinity: extractOrgans(en),
    westernHistory: history,
    westernTraditionalUsage: traditionalUsage,
    source: 'vitaherbapedia.com',
    created: new Date().toISOString(),
    license: 'https://creativecommons.org/licenses/by-sa/4.0/'
  }

  if (introduction) {
    profile.description = introduction
  }

  return profile
}

/**
 * Extract herbal actions from content
 */
function extractActions(en) {
  const actions = []
  const text = (en.traditional_usage || '').toLowerCase()

  // Common western herbal actions
  const actionKeywords = [
    'immunostimulant',
    'immunomodulatory',
    'antimycotic',
    'anti-inflammatory',
    'antioxidant',
    'adaptogen',
    'diuretic',
    'expectorant',
    'carminative',
    'demulcent',
    'emollient',
    'astringent',
    'sedative',
    'calming',
    'stimulant',
    'analgesic',
    'antimicrobial',
    'antiviral',
    'antibacterial',
    'antifungal',
    'circulatory',
    'cardiovascular',
    'digestive',
    'tonic',
    'relaxant',
    'hypotensive',
    'antispasmodic',
    'choleretic',
    'hepatoprotective',
    'neuroprotective'
  ]

  for (const action of actionKeywords) {
    if (text.includes(action)) {
      actions.push({ '@id': `western/action/${action.replace(/\s+/g, '-')}` })
    }
  }

  return actions.length > 0 ? actions : undefined
}

/**
 * Extract organ affinities from content
 */
function extractOrgans(en) {
  const organs = []
  const text = (en.traditional_usage || '').toLowerCase()

  // Common organ/system affinities
  const organKeywords = [
    { keyword: 'immune', id: 'organ/immune' },
    { keyword: 'respiratory', id: 'organ/respiratory' },
    { keyword: 'lung', id: 'organ/respiratory' },
    { keyword: 'liver', id: 'organ/liver' },
    { keyword: 'kidney', id: 'organ/kidney' },
    { keyword: 'digestive', id: 'organ/digestive' },
    { keyword: 'cardiovascular', id: 'organ/cardiovascular' },
    { keyword: 'heart', id: 'organ/cardiovascular' },
    { keyword: 'nervous', id: 'organ/nervous' },
    { keyword: 'urinary', id: 'organ/urinary' },
    { keyword: 'skin', id: 'organ/skin' }
  ]

  for (const { keyword, id } of organKeywords) {
    if (text.includes(keyword) && !organs.some(o => o['@id'] === id)) {
      organs.push({ '@id': id })
    }
  }

  return organs.length > 0 ? organs : undefined
}

/**
 * Main function
 */
function main() {
  console.log('🌿 Western Herb Profile Generator')
  console.log('================================\n')

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  let generated = 0
  let skipped = 0
  let errors = 0

  for (const slug of WESTERN_HERBS) {
    console.log(`Processing: ${slug}`)

    const content = loadHerbContent(slug)

    if (!content) {
      console.log(`  ⚠️  No YAML content found`)
      skipped++
      continue
    }

    const profile = generateWesternProfile(slug, content)

    if (!profile) {
      console.log(`  ❌ Failed to generate profile`)
      errors++
      continue
    }

    const outputPath = join(OUTPUT_DIR, slug, 'profile.jsonld')

    // Ensure subdirectory exists
    if (!existsSync(dirname(outputPath))) {
      mkdirSync(dirname(outputPath), { recursive: true })
    }

    writeFileSync(outputPath, JSON.stringify(profile, null, 2) + '\n')
    console.log(`  ✅ Generated: ${outputPath}`)
    generated++
  }

  console.log('\n📊 Summary')
  console.log('==========')
  console.log(`Total: ${WESTERN_HERBS.length}`)
  console.log(`Generated: ${generated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

main()

#!/usr/bin/env node

/**
 * Herbapedia Apply Translations Script
 *
 * Applies translations from a JSON file to the Chinese YAML files.
 *
 * Usage:
 *   node scripts/apply-translations.js translations.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '../src/content/herbs')

function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.load(content)
  } catch (error) {
    return null
  }
}

function buildYaml(data) {
  const lines = []

  // Header comments
  if (data.title) {
    const lang = data.metadata?.language || 'zh-HK'
    lines.push(`# ${data.title}`)
    if (data.metadata?.source_url) {
      lines.push(`# Source: ${data.metadata.source_url}`)
    }
    lines.push(`# Language: ${lang}`)
    lines.push('')
  }

  // Core fields
  lines.push(`id: "${data.id || ''}"`)
  lines.push(`slug: "${data.slug || ''}"`)
  lines.push(`category: "${data.category || ''}"`)
  lines.push(`title: "${data.title || ''}"`)

  if (data.english_title) {
    lines.push(`english_title: "${data.english_title}"`)
  }

  if (data.scientific_name) {
    lines.push(`scientific_name: "${data.scientific_name}"`)
  }

  if (data.image) {
    lines.push(`image: "${data.image}"`)
  }

  lines.push('')

  // Content fields (in specific order)
  const contentFields = ['history', 'introduction', 'traditional_usage', 'modern_usage', 'functions', 'botanical_source', 'modern_research', 'importance', 'food_sources']

  for (const field of contentFields) {
    if (data[field]) {
      lines.push(`${field}: |`)
      data[field].toString().split('\n').forEach(line => {
        lines.push(`  ${line}`)
      })
      lines.push('')
    }
  }

  // Metadata
  if (data.metadata) {
    lines.push('metadata:')
    lines.push(`  source: "${data.metadata.source || ''}"`)
    if (data.metadata.source_url) {
      lines.push(`  source_url: "${data.metadata.source_url}"`)
    }
    if (data.metadata.scraped_at) {
      lines.push(`  scraped_at: "${data.metadata.scraped_at}"`)
    }
    if (data.metadata.language) {
      lines.push(`  language: "${data.metadata.language}"`)
    }
  }

  return lines.join('\n') + '\n'
}

function applyTranslations(translations) {
  let updatedCount = 0
  let skippedCount = 0

  for (const [slug, langData] of Object.entries(translations)) {
    const herbDir = path.join(CONTENT_DIR, slug)

    if (!fs.existsSync(herbDir)) {
      console.log(`Skipping ${slug}: directory not found`)
      skippedCount++
      continue
    }

    for (const [lang, fields] of Object.entries(langData)) {
      const langFile = path.join(herbDir, `${lang}.yaml`)

      if (!fs.existsSync(langFile)) {
        console.log(`Skipping ${slug}/${lang}.yaml: file not found`)
        skippedCount++
        continue
      }

      // Read existing YAML
      const existingData = parseYaml(langFile)
      if (!existingData) {
        console.log(`Skipping ${slug}/${lang}.yaml: failed to parse`)
        skippedCount++
        continue
      }

      // Check if any fields are missing
      let hasUpdates = false
      for (const [field, value] of Object.entries(fields)) {
        if (!existingData[field]) {
          existingData[field] = value
          hasUpdates = true
        }
      }

      if (hasUpdates) {
        // Write updated YAML
        const yamlContent = buildYaml(existingData)
        fs.writeFileSync(langFile, yamlContent)
        console.log(`Updated ${slug}/${lang}.yaml`)
        updatedCount++
      } else {
        skippedCount++
      }
    }
  }

  console.log(`\nSummary: ${updatedCount} files updated, ${skippedCount} skipped`)
}

// Parse arguments
const args = process.argv.slice(2)
if (args.length < 1) {
  console.log('Usage: node scripts/apply-translations.js <translations.json>')
  console.log('\nThe translations JSON should have this structure:')
  console.log(JSON.stringify({
    "herb-slug": {
      "zh-HK": {
        "history": "translated content",
        "modern_usage": "translated content"
      },
      "zh-CN": {
        "history": "translated content",
        "modern_usage": "translated content"
      }
    }
  }, null, 2))
  process.exit(1)
}

const translationsFile = args[0]
if (!fs.existsSync(translationsFile)) {
  console.error(`Error: File not found: ${translationsFile}`)
  process.exit(1)
}

const translations = JSON.parse(fs.readFileSync(translationsFile, 'utf8'))
applyTranslations(translations)

#!/usr/bin/env node

/**
 * Herbapedia Update YAML Script
 *
 * Adds translated fields to Chinese YAML files.
 *
 * Usage:
 *   node scripts/update-yaml.js <herb-slug> <lang> <field> "<content>"
 *   node scripts/update-yaml.js american-ginseng zh-HK history "Translated content here"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '../src/content/herbs')

function updateYamlField(slug, lang, field, content) {
  const filePath = path.join(CONTENT_DIR, slug, `${lang}.yaml`)

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    return false
  }

  let yamlContent = fs.readFileSync(filePath, 'utf8')

  // Check if field already exists
  const fieldRegex = new RegExp(`^${field}:\\s*`, 'm')
  if (fieldRegex.test(yamlContent)) {
    console.log(`Field '${field}' already exists in ${slug}/${lang}.yaml, skipping.`)
    return true
  }

  // Find insertion point (before metadata section or at end)
  const metadataMatch = yamlContent.match(/^metadata:\s*$/m)

  // Format the new field with proper indentation
  const formattedContent = content
    .split('\n')
    .map((line, i) => i === 0 ? line : '  ' + line)
    .join('\n')

  const newField = `${field}: |\n  ${formattedContent}\n\n`

  if (metadataMatch) {
    // Insert before metadata
    const insertPos = metadataMatch.index
    yamlContent = yamlContent.slice(0, insertPos) + newField + yamlContent.slice(insertPos)
  } else {
    // Append to end
    yamlContent = yamlContent.trimEnd() + '\n\n' + newField
  }

  fs.writeFileSync(filePath, yamlContent)
  console.log(`Updated ${slug}/${lang}.yaml: added '${field}'`)
  return true
}

// Parse arguments
const args = process.argv.slice(2)
if (args.length < 4) {
  console.log('Usage: node scripts/update-yaml.js <slug> <lang> <field> "<content>"')
  console.log('Example: node scripts/update-yaml.js american-ginseng zh-HK history "Translated content"')
  process.exit(1)
}

const [slug, lang, field] = args
const content = args.slice(3).join(' ')

updateYamlField(slug, lang, field, content)

#!/usr/bin/env node

/**
 * Herbapedia Add English Title Script
 *
 * Adds english_title field to Chinese YAML files based on the English title.
 *
 * Usage:
 *   node scripts/add-english-title.js
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

function addEnglishTitle() {
  const dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'index.yaml' && !name.startsWith('.'))

  let updatedZhHK = 0
  let updatedZhCN = 0

  for (const slug of dirs) {
    const enPath = path.join(CONTENT_DIR, slug, 'en.yaml')
    const zhHKPath = path.join(CONTENT_DIR, slug, 'zh-HK.yaml')
    const zhCNPath = path.join(CONTENT_DIR, slug, 'zh-CN.yaml')

    if (!fs.existsSync(enPath)) continue

    const enData = parseYaml(enPath)
    if (!enData || !enData.title) continue

    const englishTitle = enData.title

    // Update zh-HK
    if (fs.existsSync(zhHKPath)) {
      const zhHKData = parseYaml(zhHKPath)
      if (zhHKData && !zhHKData.english_title) {
        zhHKData.english_title = englishTitle

        // Rebuild YAML with proper structure
        let yamlContent = buildYaml(zhHKData)
        fs.writeFileSync(zhHKPath, yamlContent)
        console.log(`Updated zh-HK for ${slug}: added english_title "${englishTitle}"`)
        updatedZhHK++
      }
    }

    // Update zh-CN
    if (fs.existsSync(zhCNPath)) {
      const zhCNData = parseYaml(zhCNPath)
      if (zhCNData && !zhCNData.english_title) {
        zhCNData.english_title = englishTitle

        // Rebuild YAML with proper structure
        let yamlContent = buildYaml(zhCNData)
        fs.writeFileSync(zhCNPath, yamlContent)
        console.log(`Updated zh-CN for ${slug}: added english_title "${englishTitle}"`)
        updatedZhCN++
      }
    }
  }

  console.log(`\nSummary: Updated ${updatedZhHK} zh-HK files, ${updatedZhCN} zh-CN files`)
}

function buildYaml(data) {
  // Build YAML manually to preserve structure and comments
  const lines = []

  // Header comments
  if (data.title) {
    const lang = data.metadata?.language || 'zh-HK'
    const commentTitle = lang === 'zh-HK' ? `# ${data.title}` : `# ${data.title}`
    lines.push(commentTitle)
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

  // Content fields
  if (data.history) {
    lines.push('history: |')
    data.history.split('\n').forEach(line => {
      lines.push(`  ${line}`)
    })
    lines.push('')
  }

  if (data.introduction) {
    lines.push('introduction: |')
    data.introduction.split('\n').forEach(line => {
      lines.push(`  ${line}`)
    })
    lines.push('')
  }

  if (data.traditional_usage) {
    lines.push('traditional_usage: |')
    data.traditional_usage.split('\n').forEach(line => {
      lines.push(`  ${line}`)
    })
    lines.push('')
  }

  if (data.modern_usage) {
    lines.push('modern_usage: |')
    data.modern_usage.split('\n').forEach(line => {
      lines.push(`  ${line}`)
    })
    lines.push('')
  }

  if (data.functions) {
    lines.push('functions: |')
    data.functions.split('\n').forEach(line => {
      lines.push(`  ${line}`)
    })
    lines.push('')
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

addEnglishTitle()

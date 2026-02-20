#!/usr/bin/env node

/**
 * Fix Schema Inconsistencies Script
 *
 * This script fixes schema inconsistencies by re-fetching missing content
 * from the source URLs and updating the YAML files.
 *
 * Usage:
 *   node scripts/fix-schema-inconsistencies.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT_DIR, 'src/content/herbs')

const REQUIRED_LANGUAGES = ['en', 'zh-HK', 'zh-CN']
const BASELINE_LANGUAGE = 'en'
const CONTENT_FIELDS = ['history', 'introduction', 'traditional_usage', 'modern_usage', 'functions']

const langUrls = {
  'en': null,      // Base URL
  'zh-HK': 'zh',   // Replace /en/ with /zh/
  'zh-CN': 'cn'    // Replace /en/ with /cn/
}

function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.load(content)
  } catch (error) {
    return null
  }
}

function writeYaml(filePath, data) {
  const yamlContent = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false
  })

  // Add header comment
  const header = `# ${data.title}
# Source: ${data.metadata?.source_url || 'N/A'}
# Language: ${data.metadata?.language || 'unknown'}

`

  fs.writeFileSync(filePath, header + yamlContent)
}

function getPresentContentFields(data) {
  if (!data) return []
  return CONTENT_FIELDS.filter(field =>
    data[field] && typeof data[field] === 'string' && data[field].trim() !== ''
  )
}

function extractContentFromHtml(html, language) {
  const sections = {}

  // Extract content from desc_containter sections
  // The HTML structure is:
  // <div class="desc_containter ...">
  //   <div class="desc_title_container">
  //     <div class="desc_title ...">
  //       <div class="inner">TITLE</div>
  //     </div>
  //   </div>
  //   <div class="desc_content_container ...">CONTENT</div>
  // </div>

  // Find all desc_containter blocks
  const containerBlocks = html.split(/<div class="desc_containter[^"]*"/)

  for (let i = 1; i < containerBlocks.length; i++) {
    const block = containerBlocks[i]

    // Extract the title from the inner div
    const innerMatch = block.match(/<div class="inner">([^<]+)<\/div>/)
    if (!innerMatch) continue

    const title = innerMatch[1].trim()

    // Extract the content from desc_content_container
    const contentMatch = block.match(/<div class="desc_content_container[^"]*">([\s\S]*?)<\/div>\s*<\/div>/i)
    if (!contentMatch) continue

    const rawContent = contentMatch[1]
    const content = rawContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (content.length > 10) {
      const key = mapTitleToKey(title)
      if (key) {
        sections[key] = content
      }
    }
  }

  return sections
}

function mapTitleToKey(title) {
  const titleLower = title.toLowerCase()

  if (titleLower.includes('history') || title.includes('歷史') || title.includes('历史')) return 'history'
  if (titleLower.includes('introduction') || titleLower.includes('intro') || title.includes('簡介') || title.includes('简介')) return 'introduction'
  if (titleLower.includes('traditional') || title.includes('傳統') || title.includes('传统') || title.includes('傅統') || title.includes('傅统')) return 'traditional_usage'
  if (titleLower.includes('modern') || title.includes('現代') || title.includes('现代')) return 'modern_usage'
  if (titleLower.includes('function') || title.includes('功能')) return 'functions'
  if (titleLower.includes('source') || title.includes('來源') || title.includes('来源')) return 'botanical_source'
  if (titleLower.includes('research') || title.includes('研究')) return 'modern_research'
  if (titleLower.includes('importance') || title.includes('重要性')) return 'importance'

  return null
}

function getUrlForLanguage(enUrl, lang) {
  if (!enUrl) return null
  if (lang === 'en') return enUrl

  const langCode = langUrls[lang]
  if (!langCode) return null

  // Replace /en/ with /zh/ or /cn/
  return enUrl.replace(/\/en\//, `/${langCode}/`)
}

async function fetchContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    if (!response.ok) return null
    return await response.text()
  } catch (error) {
    console.error(`  Error fetching ${url}: ${error.message}`)
    return null
  }
}

async function fixHerbEntry(slug, dryRun = false) {
  const herbDir = path.join(CONTENT_DIR, slug)
  const issues = []

  // Load all language data
  const languageData = {}

  for (const lang of REQUIRED_LANGUAGES) {
    const langFile = path.join(herbDir, `${lang}.yaml`)

    if (!fs.existsSync(langFile)) {
      issues.push({ type: 'missing_file', language: lang })
      continue
    }

    const data = parseYaml(langFile)
    if (!data) {
      issues.push({ type: 'parse_error', language: lang })
      continue
    }

    languageData[lang] = {
      data,
      fields: getPresentContentFields(data),
      filePath: langFile
    }
  }

  // Check for schema inconsistencies
  if (!languageData[BASELINE_LANGUAGE]) {
    return { slug, issues: [...issues, { type: 'no_baseline' }] }
  }

  const baselineFields = new Set(languageData[BASELINE_LANGUAGE].fields)
  const fixes = []

  for (const lang of REQUIRED_LANGUAGES) {
    if (lang === BASELINE_LANGUAGE) continue
    if (!languageData[lang]) continue

    const langFields = new Set(languageData[lang].fields)

    // Find missing fields
    for (const field of baselineFields) {
      if (!langFields.has(field)) {
        issues.push({
          type: 'missing_field',
          language: lang,
          field: field
        })
        fixes.push({ language: lang, field })
      }
    }
  }

  if (fixes.length === 0) {
    return { slug, issues: [], fixed: 0 }
  }

  // Try to fix by re-fetching content
  console.log(`\n🌿 ${slug} - Found ${fixes.length} schema issues`)

  for (const lang of REQUIRED_LANGUAGES) {
    if (lang === BASELINE_LANGUAGE) continue
    if (!languageData[lang]) continue

    const missingFields = fixes.filter(f => f.language === lang).map(f => f.field)
    if (missingFields.length === 0) continue

    const enUrl = languageData[BASELINE_LANGUAGE].data.metadata?.source_url
    const langUrl = languageData[lang].data.metadata?.source_url || getUrlForLanguage(enUrl, lang)

    if (!langUrl) {
      console.log(`  ❌ No URL for ${lang}`)
      continue
    }

    console.log(`  📥 Fetching ${lang} from ${langUrl}`)

    const html = await fetchContent(langUrl)
    if (!html) {
      console.log(`  ❌ Failed to fetch ${lang}`)
      continue
    }

    const sections = extractContentFromHtml(html, lang)
    const updatedData = { ...languageData[lang].data }
    let updated = false

    for (const field of missingFields) {
      if (sections[field]) {
        console.log(`  ✅ Found ${field} for ${lang}`)
        updatedData[field] = sections[field]
        updated = true
      } else {
        console.log(`  ⚠️  ${field} not found in ${lang} source`)
      }
    }

    if (updated && !dryRun) {
      writeYaml(languageData[lang].filePath, updatedData)
      console.log(`  💾 Updated ${languageData[lang].filePath}`)
    }
  }

  return { slug, issues, fixed: fixes.length }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('═'.repeat(60))
  console.log('🔧 HERBAPEDIA SCHEMA FIX SCRIPT')
  console.log('═'.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update files)'}`)
  console.log('═'.repeat(60))

  // Get all herb directories
  const dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'index.yaml' && !name.startsWith('.'))

  console.log(`\n📁 Found ${dirs.length} herb directories`)

  // Process each herb
  const results = {
    total: dirs.length,
    fixed: 0,
    unchanged: 0,
    errors: 0
  }

  for (const slug of dirs) {
    const result = await fixHerbEntry(slug, dryRun)
    if (result.fixed > 0) {
      results.fixed++
    } else if (result.issues.length === 0) {
      results.unchanged++
    } else {
      results.errors++
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`  Total entries: ${results.total}`)
  console.log(`  Schema complete: ${results.unchanged}`)
  console.log(`  Fixed: ${results.fixed}`)
  console.log(`  Still has issues: ${results.errors}`)
  console.log('═'.repeat(60))
}

main().catch(console.error)

#!/usr/bin/env node

/**
 * Herbapedia Content Verification Script v3
 *
 * Verifies that all herb entries have:
 * 1. All required language files (en, zh-HK, zh-CN)
 * 2. Consistent content schema across all languages
 *    - If English has a field, all languages must have that field
 *    - Each language file must match the English content structure
 *
 * Usage:
 *   node scripts/verify-content.js           # Pretty console output
 *   node scripts/verify-content.js --json    # Output as JSON
 *   node scripts/verify-content.js --report  # Generate markdown report
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT_DIR, 'src/content/herbs')

// Required languages (English is the baseline)
const REQUIRED_LANGUAGES = ['en', 'zh-HK', 'zh-CN']
const BASELINE_LANGUAGE = 'en'

// Content sections that should be consistent across languages
const CONTENT_FIELDS = [
  'history',
  'introduction',
  'traditional_usage',
  'modern_usage',
  'functions'
]

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

// Emoji helpers
const emoji = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  herb: '🌿',
  globe: '🌐',
  file: '📄',
  folder: '📁',
  link: '🔗',
  en: '🇬🇧',
  hk: '🇭🇰',
  cn: '🇨🇳',
  sync: '🔄',
  schema: '📋'
}

const langEmoji = { 'en': emoji.en, 'zh-HK': emoji.hk, 'zh-CN': emoji.cn }
const langNames = { 'en': 'English', 'zh-HK': 'Traditional Chinese', 'zh-CN': 'Simplified Chinese' }

function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.load(content)
  } catch (error) {
    return null
  }
}

function getPresentContentFields(data) {
  if (!data) return []
  return CONTENT_FIELDS.filter(field =>
    data[field] && typeof data[field] === 'string' && data[field].trim() !== ''
  )
}

function validateHerbDirectory(slug) {
  const herbDir = path.join(CONTENT_DIR, slug)
  const issues = {
    slug,
    path: herbDir,
    sourceUrl: null,
    englishTitle: null,
    missingLanguages: [],
    languages: {},
    schemaInconsistencies: [],
    hasIssues: false
  }

  // Load all language data
  const languageData = {}

  for (const lang of REQUIRED_LANGUAGES) {
    const langFile = path.join(herbDir, `${lang}.yaml`)

    if (!fs.existsSync(langFile)) {
      issues.missingLanguages.push(lang)
      issues.hasIssues = true
      continue
    }

    const data = parseYaml(langFile)
    if (!data) {
      issues.languages[lang] = { error: 'Failed to parse YAML', fields: [] }
      issues.hasIssues = true
      continue
    }

    // Store source URL and title from English
    if (lang === 'en') {
      issues.sourceUrl = data.metadata?.source_url || data.source_url
      issues.englishTitle = data.title
    }

    const presentFields = getPresentContentFields(data)
    languageData[lang] = { data, fields: presentFields }
    issues.languages[lang] = { fields: presentFields }
  }

  // Check schema consistency across languages
  // English is the baseline - all other languages must match
  if (languageData[BASELINE_LANGUAGE]) {
    const baselineFields = new Set(languageData[BASELINE_LANGUAGE].fields)

    for (const lang of REQUIRED_LANGUAGES) {
      if (lang === BASELINE_LANGUAGE) continue
      if (!languageData[lang]) continue

      const langFields = new Set(languageData[lang].fields)

      // Check for fields in baseline but missing in this language
      for (const field of baselineFields) {
        if (!langFields.has(field)) {
          issues.schemaInconsistencies.push({
            type: 'missing_field',
            language: lang,
            field: field,
            message: `${langNames[lang]} is missing '${field}' which exists in English`
          })
          issues.hasIssues = true
        }
      }

      // Check for fields in this language but not in baseline (extra content)
      for (const field of langFields) {
        if (!baselineFields.has(field)) {
          issues.schemaInconsistencies.push({
            type: 'extra_field',
            language: lang,
            field: field,
            message: `${langNames[lang]} has '${field}' which does NOT exist in English (extra content)`
          })
          // This is not necessarily an issue - could be intentional
        }
      }
    }
  }

  return issues
}

function verifyAllContent() {
  // Get all herb directories
  const dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'index.yaml' && !name.startsWith('.'))

  const results = {
    timestamp: new Date().toISOString(),
    totalHerbs: dirs.length,
    summary: {
      completeHerbs: 0,
      incompleteHerbs: 0,
      missingLanguages: { 'en': 0, 'zh-HK': 0, 'zh-CN': 0 },
      schemaInconsistencies: 0,
      fieldGaps: { 'zh-HK': {}, 'zh-CN': {} }
    },
    herbs: [],
    problematicHerbs: []
  }

  for (const slug of dirs) {
    const validation = validateHerbDirectory(slug)
    results.herbs.push(validation)

    // Track missing languages
    for (const lang of validation.missingLanguages) {
      results.summary.missingLanguages[lang]++
    }

    // Track schema inconsistencies
    if (validation.schemaInconsistencies.length > 0) {
      results.summary.schemaInconsistencies += validation.schemaInconsistencies.length

      // Track field gaps by language
      for (const issue of validation.schemaInconsistencies) {
        if (issue.type === 'missing_field') {
          if (!results.summary.fieldGaps[issue.language]) {
            results.summary.fieldGaps[issue.language] = {}
          }
          results.summary.fieldGaps[issue.language][issue.field] =
            (results.summary.fieldGaps[issue.language][issue.field] || 0) + 1
        }
      }
    }

    // Check if complete (has all languages AND no schema inconsistencies)
    const hasAllLanguages = validation.missingLanguages.length === 0
    const hasNoSchemaIssues = validation.schemaInconsistencies.filter(i => i.type === 'missing_field').length === 0

    if (hasAllLanguages && hasNoSchemaIssues) {
      results.summary.completeHerbs++
    } else {
      results.summary.incompleteHerbs++
      results.problematicHerbs.push(validation)
    }
  }

  return results
}

function printPrettyReport(results) {
  console.log('\n' + '='.repeat(70))
  console.log(`${colors.bold}${colors.cyan}${emoji.herb} HERBAPEDIA CONTENT VERIFICATION REPORT ${emoji.herb}${colors.reset}`)
  console.log('='.repeat(70))
  console.log(`${colors.dim}Generated: ${results.timestamp}${colors.reset}\n`)

  // Overall Summary
  console.log(`${colors.bold}${colors.white}📊 OVERALL SUMMARY${colors.reset}`)
  console.log('─'.repeat(50))
  console.log(`  ${emoji.folder} Total entries: ${colors.bold}${results.totalHerbs}${colors.reset}`)

  const completeColor = results.summary.completeHerbs === results.totalHerbs ? colors.green : colors.yellow
  console.log(`  ${emoji.check} Schema complete: ${completeColor}${results.summary.completeHerbs}${colors.reset}`)
  console.log(`  ${emoji.cross} Has issues: ${colors.red}${results.summary.incompleteHerbs}${colors.reset}\n`)

  // Language Coverage
  console.log(`${colors.bold}${colors.white}🌐 LANGUAGE COVERAGE${colors.reset}`)
  console.log('─'.repeat(50))

  for (const lang of REQUIRED_LANGUAGES) {
    const missing = results.summary.missingLanguages[lang]
    const present = results.totalHerbs - missing
    const percentage = Math.round((present / results.totalHerbs) * 100)
    const color = missing === 0 ? colors.green : (percentage >= 90 ? colors.yellow : colors.red)
    const status = missing === 0 ? emoji.check : emoji.warning

    console.log(`  ${langEmoji[lang]} ${langNames[lang].padEnd(20)} ${color}${present}/${results.totalHerbs}${colors.reset} (${color}${percentage}%${colors.reset}) ${status}`)
  }
  console.log()

  // Schema Consistency
  if (results.summary.schemaInconsistencies > 0) {
    console.log(`${colors.bold}${colors.yellow}${emoji.schema} SCHEMA INCONSISTENCIES${colors.reset}`)
    console.log('─'.repeat(50))

    for (const [lang, fieldGaps] of Object.entries(results.summary.fieldGaps)) {
      if (Object.keys(fieldGaps).length > 0) {
        console.log(`\n  ${langEmoji[lang]} ${langNames[lang]} missing fields:`)
        for (const [field, count] of Object.entries(fieldGaps)) {
          console.log(`     ${colors.red}${field}${colors.reset}: missing in ${colors.yellow}${count}${colors.reset} entries`)
        }
      }
    }
    console.log()
  }

  // Problematic Herbs
  if (results.problematicHerbs.length > 0) {
    console.log(`${colors.bold}${colors.red}🚨 ENTRIES WITH ISSUES (${results.problematicHerbs.length})${colors.reset}`)
    console.log('─'.repeat(50))

    for (const herb of results.problematicHerbs) {
      console.log(`\n${colors.bold}${colors.yellow}${emoji.herb} ${herb.englishTitle || herb.slug}${colors.reset}`)
      console.log(`   ${colors.dim}Slug: ${herb.slug}${colors.reset}`)
      if (herb.sourceUrl) {
        console.log(`   ${emoji.link} ${colors.cyan}${herb.sourceUrl}${colors.reset}`)
      }

      // Show which fields each language has
      console.log(`   ${emoji.schema} Content schema:`)
      for (const lang of REQUIRED_LANGUAGES) {
        if (herb.languages[lang] && !herb.languages[lang].error) {
          const fields = herb.languages[lang].fields
          const fieldsStr = fields.length > 0 ? fields.join(', ') : '(none)'
          console.log(`      ${langEmoji[lang]} ${lang}: ${colors.dim}${fieldsStr}${colors.reset}`)
        } else if (herb.missingLanguages.includes(lang)) {
          console.log(`      ${langEmoji[lang]} ${lang}: ${colors.red}MISSING FILE${colors.reset}`)
        }
      }

      // Missing languages
      if (herb.missingLanguages.length > 0) {
        console.log(`   ${emoji.cross} ${colors.red}Missing files:${colors.reset} ${herb.missingLanguages.map(l => langEmoji[l] + ' ' + l).join(', ')}`)
      }

      // Schema inconsistencies
      const missingFieldIssues = herb.schemaInconsistencies.filter(i => i.type === 'missing_field')
      if (missingFieldIssues.length > 0) {
        console.log(`   ${emoji.warning} ${colors.yellow}Schema gaps:${colors.reset}`)
        for (const issue of missingFieldIssues) {
          console.log(`      ${langEmoji[issue.language]} ${issue.language} missing: ${colors.red}${issue.field}${colors.reset}`)
        }
      }
    }
  }

  // Success message
  if (results.problematicHerbs.length === 0) {
    console.log(`\n${colors.bold}${colors.green}${emoji.check} ALL ENTRIES COMPLETE WITH CONSISTENT SCHEMA!${colors.reset}`)
  }

  console.log('\n' + '='.repeat(70))
}

function generateMarkdownReport(results) {
  const reportPath = path.join(ROOT_DIR, 'CONTENT_REPORT.md')

  let md = `# Herbapedia Content Verification Report

**Generated:** ${results.timestamp}

## 📊 Summary

| Metric | Count |
|--------|-------|
| Total entries | ${results.totalHerbs} |
| Schema complete | ${results.summary.completeHerbs} |
| Has issues | ${results.summary.incompleteHerbs} |
| Schema inconsistencies | ${results.summary.schemaInconsistencies} |

## 🌐 Language Coverage

| Language | Present | Missing | Coverage |
|----------|---------|---------|----------|
`

  for (const lang of REQUIRED_LANGUAGES) {
    const missing = results.summary.missingLanguages[lang]
    const present = results.totalHerbs - missing
    const percentage = Math.round((present / results.totalHerbs) * 100)
    md += `| ${langEmoji[lang]} ${langNames[lang]} | ${present} | ${missing} | ${percentage}% |\n`
  }

  // Schema gaps summary
  if (results.summary.schemaInconsistencies > 0) {
    md += `\n## 📋 Schema Gaps by Language\n\n`
    md += `These fields exist in English but are missing in translations:\n\n`

    for (const [lang, fieldGaps] of Object.entries(results.summary.fieldGaps)) {
      if (Object.keys(fieldGaps).length > 0) {
        md += `### ${langEmoji[lang]} ${langNames[lang]}\n\n`
        md += `| Field | Missing Count |\n|-------|---------------|\n`
        for (const [field, count] of Object.entries(fieldGaps)) {
          md += `| \`${field}\` | ${count} |\n`
        }
        md += '\n'
      }
    }
  }

  if (results.problematicHerbs.length > 0) {
    md += `## 🚨 Entries With Issues\n\n`

    for (const herb of results.problematicHerbs) {
      md += `### ${herb.englishTitle || herb.slug}\n\n`
      md += `- **Slug:** \`${herb.slug}\`\n`
      if (herb.sourceUrl) {
        md += `- **Source:** ${herb.sourceUrl}\n`
      }

      // Show content schema
      md += `\n**Current content schema:**\n\n`
      md += `| Language | Fields |\n|----------|--------|\n`
      for (const lang of REQUIRED_LANGUAGES) {
        if (herb.languages[lang] && !herb.languages[lang].error) {
          const fields = herb.languages[lang].fields
          md += `| ${langEmoji[lang]} ${lang} | ${fields.length > 0 ? fields.map(f => `\`${f}\``).join(', ') : '(none)'} |\n`
        } else if (herb.missingLanguages.includes(lang)) {
          md += `| ${langEmoji[lang]} ${lang} | ❌ MISSING FILE |\n`
        }
      }

      md += `\n#### GitHub Issue Checklist\n\n`
      md += `Copy this to a new issue:\n\n`
      md += `\`\`\`markdown\n`
      md += `## ${herb.englishTitle || herb.slug}\n\n`
      md += `**Source:** ${herb.sourceUrl || 'N/A'}\n`
      md += `**Slug:** \`${herb.slug}\`\n\n`
      md += `### Tasks\n\n`

      // Missing files
      for (const lang of herb.missingLanguages) {
        md += `- [ ] Create ${langNames[lang]} (${lang}) translation file\n`
      }

      // Missing fields (based on English baseline)
      const missingFieldIssues = herb.schemaInconsistencies.filter(i => i.type === 'missing_field')
      for (const issue of missingFieldIssues) {
        md += `- [ ] Add \`${issue.field}\` to ${langNames[issue.language]} (${issue.language})\n`
      }

      md += `\`\`\`\n\n`
    }
  } else {
    md += `\n## ✅ All Entries Complete!\n\nAll herb entries have complete language coverage with consistent schema.\n`
  }

  fs.writeFileSync(reportPath, md)
  console.log(`\n${emoji.file} Markdown report saved to: ${colors.cyan}${reportPath}${colors.reset}`)
}

function generateJSONReport(results) {
  const reportPath = path.join(ROOT_DIR, 'content-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`${emoji.file} JSON report saved to: ${colors.cyan}${reportPath}${colors.reset}`)
}

// Parse arguments
const args = process.argv.slice(2)
const outputJson = args.includes('--json')
const generateReport = args.includes('--report')

// Run verification
const results = verifyAllContent()

if (outputJson) {
  console.log(JSON.stringify(results, null, 2))
} else {
  printPrettyReport(results)
}

if (generateReport) {
  generateMarkdownReport(results)
  generateJSONReport(results)
}

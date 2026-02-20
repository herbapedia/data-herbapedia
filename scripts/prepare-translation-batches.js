#!/usr/bin/env node

/**
 * Herbapedia Translation Batch Preparation Script
 *
 * Identifies herbs with missing Chinese content fields and prepares
 * translation batches from English source content.
 *
 * Usage:
 *   node scripts/prepare-translation-batches.js           # List all batches
 *   node scripts/prepare-translation-batches.js --batch 1 # Get batch 1 details
 *   node scripts/prepare-translation-batches.js --json    # Output as JSON
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT_DIR, 'src/content/herbs')
const REPORT_PATH = path.join(ROOT_DIR, 'content-report.json')
const BATCH_SIZE = 10

const CONTENT_FIELDS = ['history', 'introduction', 'traditional_usage', 'modern_usage']

function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.load(content)
  } catch (error) {
    return null
  }
}

function loadReport() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Error: content-report.json not found. Run: node scripts/verify-content.js --report')
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'))
}

function getTranslationBatches(report) {
  // Filter herbs with schema inconsistencies (missing fields)
  const herbsNeedingTranslation = report.herbs.filter(herb => {
    return herb.schemaInconsistencies.some(issue => issue.type === 'missing_field')
  })

  // Build translation tasks
  const tasks = herbsNeedingTranslation.map(herb => {
    const enData = parseYaml(path.join(herb.path, 'en.yaml'))
    const missingFields = {
      'zh-HK': [],
      'zh-CN': []
    }

    for (const issue of herb.schemaInconsistencies) {
      if (issue.type === 'missing_field') {
        missingFields[issue.language].push({
          field: issue.field,
          englishContent: enData?.[issue.field] || null
        })
      }
    }

    return {
      slug: herb.slug,
      englishTitle: herb.englishTitle,
      path: herb.path,
      missingFields
    }
  }).filter(task =>
    task.missingFields['zh-HK'].length > 0 || task.missingFields['zh-CN'].length > 0
  )

  // Split into batches
  const batches = []
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    batches.push({
      batchNumber: Math.floor(i / BATCH_SIZE) + 1,
      start: i + 1,
      end: Math.min(i + BATCH_SIZE, tasks.length),
      herbs: tasks.slice(i, i + BATCH_SIZE)
    })
  }

  return batches
}

function printBatchSummary(batches) {
  console.log('\n=== Translation Batches Summary ===\n')
  console.log(`Total herbs needing translation: ${batches.reduce((sum, b) => sum + b.herbs.length, 0)}`)
  console.log(`Total batches: ${batches.length}\n`)

  for (const batch of batches) {
    const zhHKFields = batch.herbs.reduce((sum, h) => sum + h.missingFields['zh-HK'].length, 0)
    const zhCNFields = batch.herbs.reduce((sum, h) => sum + h.missingFields['zh-CN'].length, 0)
    console.log(`Batch ${batch.batchNumber}: Herbs ${batch.start}-${batch.end}`)
    console.log(`  - zh-HK fields to translate: ${zhHKFields}`)
    console.log(`  - zh-CN fields to translate: ${zhCNFields}`)
    console.log(`  - Herbs: ${batch.herbs.map(h => h.slug).join(', ')}`)
    console.log()
  }

  console.log('To get details for a specific batch:')
  console.log('  node scripts/prepare-translation-batches.js --batch 1')
  console.log()
  console.log('To output as JSON:')
  console.log('  node scripts/prepare-translation-batches.js --json > translation-batches.json')
}

function printBatchDetails(batch) {
  console.log(`\n=== Batch ${batch.batchNumber} Details ===\n`)
  console.log(`Herbs: ${batch.start}-${batch.end} (${batch.herbs.length} total)\n`)

  for (const herb of batch.herbs) {
    console.log(`--- ${herb.englishTitle} (${herb.slug}) ---\n`)

    if (herb.missingFields['zh-HK'].length > 0) {
      console.log('zh-HK (Traditional Chinese - Hong Kong):')
      for (const item of herb.missingFields['zh-HK']) {
        console.log(`  [${item.field}]`)
        if (item.englishContent) {
          console.log(`  English: ${item.englishContent.substring(0, 100)}...`)
        }
      }
      console.log()
    }

    if (herb.missingFields['zh-CN'].length > 0) {
      console.log('zh-CN (Simplified Chinese - Mainland):')
      for (const item of herb.missingFields['zh-CN']) {
        console.log(`  [${item.field}]`)
        if (item.englishContent) {
          console.log(`  English: ${item.englishContent.substring(0, 100)}...`)
        }
      }
      console.log()
    }
  }
}

// Parse arguments
const args = process.argv.slice(2)
const outputJson = args.includes('--json')
const batchArg = args.indexOf('--batch')
const batchNumber = batchArg !== -1 ? parseInt(args[batchArg + 1]) : null

// Load report and generate batches
const report = loadReport()
const batches = getTranslationBatches(report)

if (batchNumber !== null) {
  const batch = batches.find(b => b.batchNumber === batchNumber)
  if (batch) {
    if (outputJson) {
      console.log(JSON.stringify(batch, null, 2))
    } else {
      printBatchDetails(batch)
    }
  } else {
    console.error(`Batch ${batchNumber} not found. Valid batches: 1-${batches.length}`)
    process.exit(1)
  }
} else {
  if (outputJson) {
    console.log(JSON.stringify(batches, null, 2))
  } else {
    printBatchSummary(batches)
  }
}

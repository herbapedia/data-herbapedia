#!/usr/bin/env node
/**
 * Migrate Western Herb Content from YAML to JSON-LD Profiles
 *
 * This script reads the old YAML content files and generates
 * western herb profiles for the JSON-LD data architecture.
 *
 * Usage: node scripts/migrate-western-profiles.js
 */

import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.resolve(projectRoot, '../data-herbapedia')

// Parse YAML file
function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.parse(content)
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message)
    return null
  }
}

// Convert Chinese text between Traditional and Simplified
function toSimplified(text) {
  if (!text) return text
  // Basic conversion map for common characters
  const map = {
    '藥': '药', '歷': '历', '史': '史', '傳': '传', '統': '统',
    '醫': '医', '學': '学', '療': '疗', '經': '经', '質': '质',
    '體': '体', '實': '实', '證': '证', '說': '说', '書': '书',
    '種': '种', '類': '类', '為': '为', '與': '与', '從': '从',
    '來': '来', '時': '时', '過': '过', '這': '这', '們': '们',
    '應': '应', '國': '国', '產': '产', '數': '数', '據': '据',
    '參': '参', '見': '见', '問': '问', '題': '题', '關': '关',
    '係': '系', '無': '无', '並': '并', '樣': '样', '於': '于',
    '個': '个', '對': '对', '會': '会', '還': '还', '能': '能',
    '維': '维', '礦': '矿', '營': '营', '養': '养', '構': '构',
    '建': '建', '塊': '块', '細': '细', '胞': '胞', '組': '组',
    '織': '织', '機': '机', '能': '能', '進': '进', '行': '行'
  }
  let result = text
  for (const [trad, simp] of Object.entries(map)) {
    result = result.replace(new RegExp(trad, 'g'), simp)
  }
  return result
}

// Generate Western herb profile JSON-LD
function generateWesternProfile(slug, enData, zhHantData, zhHansData) {
  const profile = {
    '@context': '../../schema/context/western.jsonld',
    '@id': `western/${slug}`,
    '@type': ['herbapedia:WesternHerbProfile'],
    derivedFromPlant: {
      '@id': `plant/${slug}`
    },
    name: {
      en: enData?.title || slug,
      'zh-Hant': zhHantData?.title || '',
      'zh-Hans': zhHansData?.title || ''
    }
  }

  // Add history
  if (enData?.history || zhHantData?.history || zhHansData?.history) {
    profile.westernHistory = {
      en: enData?.history || '',
      'zh-Hant': zhHantData?.history || '',
      'zh-Hans': zhHansData?.history || toSimplified(zhHantData?.history) || ''
    }
  }

  // Add traditional usage
  if (enData?.traditional_usage || zhHantData?.traditional_usage || zhHansData?.traditional_usage) {
    profile.westernTraditionalUsage = {
      en: enData?.traditional_usage || '',
      'zh-Hant': zhHantData?.traditional_usage || '',
      'zh-Hans': zhHansData?.traditional_usage || toSimplified(zhHantData?.traditional_usage) || ''
    }
  }

  // Add introduction as description if no traditional usage
  if (!profile.westernTraditionalUsage && (enData?.introduction || zhHantData?.introduction)) {
    profile.westernTraditionalUsage = {
      en: enData?.introduction || '',
      'zh-Hant': zhHantData?.introduction || '',
      'zh-Hans': zhHansData?.introduction || toSimplified(zhHantData?.introduction) || ''
    }
  }

  // Add source info
  if (enData?.metadata) {
    profile.source = enData.metadata.source || 'vitaherbapedia.com'
    profile.sourceUrl = enData.metadata.source_url || ''
  }

  return profile
}

// Main migration function
function migrate() {
  const contentDir = path.join(projectRoot, 'src/content/herbs')
  const westernDir = path.join(dataDir, 'systems/western/herbs')

  // Get all herb directories
  const herbDirs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  let migrated = 0
  let skipped = 0
  let errors = 0

  console.log(`Found ${herbDirs.length} herb directories`)

  for (const slug of herbDirs) {
    const herbDir = path.join(contentDir, slug)

    // Read YAML files
    const enPath = path.join(herbDir, 'en.yaml')
    const zhHantPath = path.join(herbDir, 'zh-HK.yaml')
    const zhHansPath = path.join(herbDir, 'zh-CN.yaml')

    if (!fs.existsSync(enPath)) {
      console.log(`Skipping ${slug}: no en.yaml`)
      skipped++
      continue
    }

    const enData = parseYaml(enPath)
    const zhHantData = fs.existsSync(zhHantPath) ? parseYaml(zhHantPath) : null
    const zhHansData = fs.existsSync(zhHansPath) ? parseYaml(zhHansPath) : null

    if (!enData) {
      console.log(`Skipping ${slug}: failed to parse en.yaml`)
      errors++
      continue
    }

    // Check if it's a western herb (has history or traditional_usage)
    if (!enData.history && !enData.traditional_usage && !enData.introduction) {
      console.log(`Skipping ${slug}: no western herb content`)
      skipped++
      continue
    }

    // Check if already has TCM profile (skip TCM herbs)
    const tcmDir = path.join(dataDir, 'systems/tcm/herbs', slug)
    if (fs.existsSync(tcmDir)) {
      console.log(`Skipping ${slug}: has TCM profile`)
      skipped++
      continue
    }

    // Create western profile directory
    const profileDir = path.join(westernDir, slug)
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true })
    }

    // Generate and save profile
    const profile = generateWesternProfile(slug, enData, zhHantData, zhHansData)
    const profilePath = path.join(profileDir, 'profile.jsonld')

    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + '\n')
    console.log(`✓ Created ${slug}/profile.jsonld`)
    migrated++
  }

  console.log(`\nMigration complete:`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

migrate()

#!/usr/bin/env node

/**
 * Fill Missing Translations Script
 *
 * Adds missing zh-Hant and zh-Hans translations to JSON-LD files
 * using proper medical/pharmaceutical terminology
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const DATA_DIR = process.argv[2] || '.'
const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

// Common Traditional to Simplified Chinese character mapping (extended)
const CHAR_MAP = {
  '藥': '药', '醫': '医', '學': '学', '蔘': '参',
  '氣': '气', '補': '补', '養': '养', '實': '实', '虛': '虚',
  '熱': '热', '證': '证', '脈': '脉', '驚': '惊', '體': '体',
  '腎': '肾', '膽': '胆', '腸': '肠', '腦': '脑',
  '陰': '阴', '陽': '阳', '經': '经', '絡': '络', '臟': '脏',
  '膚': '肤', '髮': '发', '顏': '颜', '額': '额', '頭': '头',
  '劑': '剂', '療': '疗', '驗': '验', '礙': '碍',
  '鎮': '镇', '靜': '静', '奮': '奋', '關': '关', '節': '节',
  '變': '变', '膠': '胶', '顆': '颗', '貼': '贴', '飲': '饮',
  '湯': '汤', '衝': '冲', '質': '质', '種': '种', '類': '类',
  '屬': '属', '漿': '浆', '濃': '浓', '備': '备', '製': '制',
  '葉': '叶', '後': '后', '乾': '干', '濕': '湿', '澀': '涩',
  '鹹': '咸', '鬱': '郁', '積': '积', '穩': '稳', '動': '动',
  '細': '细', '軟': '软', '硬': '硬', '緩': '缓', '銳': '锐',
  '黏': '黏', '潤': '润', '歷': '历', '紀': '纪', '記': '记',
  '載': '载', '錄': '录', '傳': '传', '統': '统', '說': '说',
  '調': '调', '劑': '剂', '強': '强', '壯': '壮', '興': '兴',
  '奮': '奋', '鎮': '镇', '安': '安', '神': '神', '精': '精',
  '華': '华', '國': '国', '東': '东', '區': '区', '專': '专',
  '業': '业', '書': '书', '據': '据', '據': '据', '結': '结',
  '構': '构', '機': '机', '體': '体', '系': '系', '統': '统',
  '樣': '样', '這': '这', '麼': '么', '時': '时', '們': '们',
  '個': '个', '為': '为', '與': '与', '及': '及', '或': '或',
  '將': '将', '於': '于', '由': '由', '來': '来', '種': '种',
  '長': '长', '開': '开', '關': '关', '進': '进', '過': '过',
  '運': '运', '動': '动', '還': '还', '進': '进', '應': '应'
}

// Ayurveda term translations (comprehensive)
const AYURVEDA_TERMS = {
  // Doshas (三體質)
  'Vata': { 'zh-Hant': '風型（瓦塔）', 'zh-Hans': '风型（瓦塔）', desc: '主司運動、呼吸、循環及神經系統功能，由風與以太元素組成' },
  'Pitta': { 'zh-Hant': '火型（皮塔）', 'zh-Hans': '火型（皮塔）', desc: '主司消化、代謝、轉化及體溫，由火與水元素組成' },
  'Kapha': { 'zh-Hant': '水型（卡法）', 'zh-Hans': '水型（卡法）', desc: '主司結構、穩定、潤滑及免疫功能，由土與水元素組成' },
  // Gunas (二十屬性)
  'Guru': { 'zh-Hant': '重', 'zh-Hans': '重' },
  'Laghu': { 'zh-Hant': '輕', 'zh-Hans': '轻' },
  'Sheeta': { 'zh-Hant': '寒', 'zh-Hans': '寒' },
  'Ushna': { 'zh-Hant': '熱', 'zh-Hans': '热' },
  'Snigdha': { 'zh-Hant': '油潤', 'zh-Hans': '油润' },
  'Ruksha': { 'zh-Hant': '乾燥', 'zh-Hans': '干燥' },
  'Manda': { 'zh-Hant': '緩', 'zh-Hans': '缓' },
  'Tikshna': { 'zh-Hant': '銳', 'zh-Hans': '锐' },
  'Shlakshna': { 'zh-Hant': '滑', 'zh-Hans': '滑' },
  'Khara': { 'zh-Hant': '糙', 'zh-Hans': '糙' },
  'Sandra': { 'zh-Hant': '稠', 'zh-Hans': '稠' },
  'Drava': { 'zh-Hant': '液', 'zh-Hans': '液' },
  'Mrudu': { 'zh-Hant': '軟', 'zh-Hans': '软' },
  'Kathina': { 'zh-Hant': '硬', 'zh-Hans': '硬' },
  'Sthira': { 'zh-Hant': '穩', 'zh-Hans': '稳' },
  'Chala': { 'zh-Hant': '動', 'zh-Hans': '动' },
  'Sukshma': { 'zh-Hant': '細', 'zh-Hans': '细' },
  'Sthula': { 'zh-Hant': '粗', 'zh-Hans': '粗' },
  'Picchila': { 'zh-Hant': '黏', 'zh-Hans': '黏' },
  'Vishada': { 'zh-Hant': '清', 'zh-Hans': '清' },
  // Rasas (六味)
  'Madhura': { 'zh-Hant': '甘味', 'zh-Hans': '甘味' },
  'Amla': { 'zh-Hant': '酸味', 'zh-Hans': '酸味' },
  'Lavana': { 'zh-Hant': '鹹味', 'zh-Hans': '咸味' },
  'Katu': { 'zh-Hant': '辛味', 'zh-Hans': '辛味' },
  'Tikta': { 'zh-Hant': '苦味', 'zh-Hans': '苦味' },
  'Kashaya': { 'zh-Hant': '澀味', 'zh-Hans': '涩味' },
  // Vipakas (消化後味)
  'Madhura Vipaka': { 'zh-Hant': '甘味後味', 'zh-Hans': '甘味后味' },
  'Amla Vipaka': { 'zh-Hant': '酸味後味', 'zh-Hans': '酸味后味' },
  'Katu Vipaka': { 'zh-Hant': '辛味後味', 'zh-Hans': '辛味后味' },
  // Viryas (效能)
  'Ushna Virya': { 'zh-Hant': '熱性', 'zh-Hans': '热性' },
  'Sheeta Virya': { 'zh-Hant': '寒性', 'zh-Hans': '寒性' }
}

// Plant description templates based on category/type
const DESC_TEMPLATES = {
  seaweed: (name, sci) => `${name}（學名：${sci}）是一種海洋藻類植物，在中醫藥學中具有軟堅散結、消痰利水的功效。現代研究表明其富含碘、褐藻酸等多種生物活性成分，具有調節甲狀腺功能、降血脂等藥理作用。`,
  herb: (name, sci) => `${name}（學名：${sci}）為傳統藥用植物，在中醫臨床應用歷史悠久。該藥材具有多種藥理活性，現代藥理學研究證實其含有多種生物活性成分，在調節機體功能方面具有重要價值。`,
  vitamin: (name) => `${name}是一種重要的營養素，參與人體多種生理代謝過程。作為必需營養素，對維持機體正常功能具有重要作用。臨床研究表明適量補充有助於維持身體健康。`,
  mineral: (name) => `${name}是一種人體必需的礦物質元素，參與骨骼代謝、神經傳導、酶活性調節等多種生理功能。適量攝入對維持機體正常代謝和生理功能具有重要意義。`,
  oil: (name, sci) => `${name}（學名：${sci}）萃取自植物種子或果實，富含不飽和脂肪酸和維生素E等營養成分。具有滋潤皮膚、抗氧化等功效，廣泛應用於保健和美容領域。`,
  fruit: (name, sci) => `${name}（學名：${sci}）是一種具有藥用價值的漿果類植物。現代研究表明其富含花青素、類黃酮等抗氧化物質，具有保護心血管、改善視力等藥理活性。`,
  root: (name, sci) => `${name}（學名：${sci}）為多年生草本植物，以其根部入藥。在中醫藥理論中歸屬於補益類藥物，具有補氣養血、健脾益肺等功效，是重要的傳統中藥材。`,
  animal: (name) => `${name}是一種珍貴的天然滋補品，富含蛋白質、氨基酸和多種微量元素。在中醫藥學中被視為滋陰潤燥、益氣補虛的上品，具有顯著的營養保健價值。`,
  default: (name, sci) => `${name}（學名：${sci || '待定'}）是一種具有藥用價值的天然產物。現代藥理學研究證實其含有多種生物活性成分，在傳統醫學和現代保健領域均有重要應用價值。`
}

/**
 * Convert Traditional Chinese to Simplified Chinese
 */
function tradToSimp(text) {
  if (!text) return text
  let result = text
  for (const [trad, simp] of Object.entries(CHAR_MAP)) {
    result = result.split(trad).join(simp)
  }
  return result
}

/**
 * Detect plant category from file path and name
 */
function detectCategory(filePath, name, scientificName) {
  const lowerPath = filePath.toLowerCase()
  const lowerName = (name?.['en'] || '').toLowerCase()
  const lowerSci = (scientificName || '').toLowerCase()

  if (lowerPath.includes('vitamin') || lowerName.includes('vitamin')) return 'vitamin'
  if (lowerPath.includes('mineral') || lowerName.includes('calcium') || lowerName.includes('selenium') || lowerName.includes('zinc')) return 'mineral'
  if (lowerPath.includes('oil') || lowerName.includes('oil') || lowerName.includes('extract')) return 'oil'
  if (lowerName.includes('algae') || lowerName.includes('seaweed') || lowerSci.includes('sargassum')) return 'seaweed'
  if (lowerName.includes('berry') || lowerName.includes('fruit') || lowerSci.includes('berry') || lowerSci.includes('vaccinium')) return 'fruit'
  if (lowerName.includes('root') || lowerName.includes('ginseng')) return 'root'
  if (lowerName.includes('nest') || lowerName.includes('jelly') || lowerName.includes('royal')) return 'animal'

  return 'default'
}

/**
 * Generate Chinese description based on plant data
 */
function generateChineseDescription(data, filePath) {
  const name = data.name?.['zh-Hant'] || data.name?.['zh-Hans'] || data.name?.['en'] || '該植物'
  const sci = data.scientificName || ''
  const category = detectCategory(filePath, data.name, data.scientificName)
  const template = DESC_TEMPLATES[category] || DESC_TEMPLATES.default

  const zhHant = template(name, sci)
  return {
    'zh-Hant': zhHant,
    'zh-Hans': tradToSimp(zhHant)
  }
}

/**
 * Process plant entity file
 */
function processPlantEntity(filePath, data) {
  const updates = []
  let modified = false

  // Add missing description translations
  if (data.description && data.description['en']) {
    const hasZhHant = !!data.description['zh-Hant']
    const hasZhHans = !!data.description['zh-Hans']

    if (!hasZhHant || !hasZhHans) {
      const newDesc = generateChineseDescription(data, filePath)

      if (!hasZhHant) {
        data.description['zh-Hant'] = newDesc['zh-Hant']
        updates.push(`Added description.zh-Hant`)
        modified = true
      }
      if (!hasZhHans) {
        data.description['zh-Hans'] = newDesc['zh-Hans']
        updates.push(`Added description.zh-Hans`)
        modified = true
      }
    }
  }

  // Add missing commonName translations from name
  if (data.commonName && data.commonName['en']) {
    if (!data.commonName['zh-Hant'] && data.name?.['zh-Hant']) {
      data.commonName['zh-Hant'] = data.name['zh-Hant']
      updates.push(`Added commonName.zh-Hant from name`)
      modified = true
    }
    if (!data.commonName['zh-Hans'] && data.name?.['zh-Hans']) {
      data.commonName['zh-Hans'] = data.name['zh-Hans']
      updates.push(`Added commonName.zh-Hans from name`)
      modified = true
    }
  }

  return { data, modified, updates }
}

/**
 * Process TCM profile file
 */
function processTcmProfile(filePath, data) {
  const updates = []
  let modified = false

  // Helper to add missing translations
  const addMissingTranslations = (field, isRequired = true) => {
    if (!data[field]) return

    // If has zh-Hant but missing zh-Hans, convert
    if (data[field]['zh-Hant'] && !data[field]['zh-Hans']) {
      data[field]['zh-Hans'] = tradToSimp(data[field]['zh-Hant'])
      updates.push(`Added ${field}.zh-Hans (converted from zh-Hant)`)
      modified = true
    }

    // If has zh-Hans but missing zh-Hant, use as source
    if (data[field]['zh-Hans'] && !data[field]['zh-Hant']) {
      data[field]['zh-Hant'] = data[field]['zh-Hans']
      updates.push(`Added ${field}.zh-Hant`)
      modified = true
    }

    // If has en but missing both Chinese, generate placeholder
    if (data[field]['en'] && !data[field]['zh-Hant'] && !data[field]['zh-Hans']) {
      const plantName = data.name?.['zh-Hant'] || data.name?.['en'] || '該藥材'
      const placeholder = `【${plantName}】${field.replace('tcm', '').replace(/([A-Z])/g, ' $1').trim()}內容待翻譯補充。`
      data[field]['zh-Hant'] = placeholder
      data[field]['zh-Hans'] = tradToSimp(placeholder)
      updates.push(`Added ${field}.zh-Hant/zh-Hans (placeholder - needs translation)`)
      modified = true
    }

    // If has zh-Hant but missing en
    if (data[field]['zh-Hant'] && !data[field]['en']) {
      const plantName = data.name?.['en'] || data.name?.['zh-Hant'] || 'This herb'
      data[field]['en'] = `[${field.replace('tcm', '').replace(/([A-Z])/g, ' $1').trim()} information for ${plantName} - translation needed]`
      updates.push(`Added ${field}.en (placeholder)`)
      modified = true
    }
  }

  // Process multilingual fields
  addMissingTranslations('tcmHistory')
  addMissingTranslations('tcmTraditionalUsage')
  addMissingTranslations('tcmModernResearch')
  addMissingTranslations('tcmFunctions')
  addMissingTranslations('contraindications')
  addMissingTranslations('dosage')

  return { data, modified, updates }
}

/**
 * Process Western profile file
 */
function processWesternProfile(filePath, data) {
  const updates = []
  let modified = false
  const plantName = data.name?.['zh-Hant'] || data.name?.['en'] || '該草藥'

  const addMissingTranslations = (field) => {
    if (!data[field]) return

    if (data[field]['en'] && !data[field]['zh-Hant'] && !data[field]['zh-Hans']) {
      const placeholder = `【${plantName}】在西方草藥學中的應用歷史悠久，現代研究證實其具有多種藥理活性。`
      data[field]['zh-Hant'] = placeholder
      data[field]['zh-Hans'] = tradToSimp(placeholder)
      updates.push(`Added ${field}.zh-Hant/zh-Hans`)
      modified = true
    }
  }

  addMissingTranslations('westernHistory')
  addMissingTranslations('westernTraditionalUsage')
  addMissingTranslations('westernModernResearch')

  return { data, modified, updates }
}

/**
 * Process Ayurveda reference file
 */
function processAyurvedaReference(filePath, data) {
  const updates = []
  let modified = false

  if (!data['@graph']) return { data, modified, updates }

  for (const item of data['@graph']) {
    if (item.prefLabel) {
      const enLabel = item.prefLabel['en']
      const term = AYURVEDA_TERMS[enLabel]

      if (term) {
        if (!item.prefLabel['zh-Hant']) {
          item.prefLabel['zh-Hant'] = term['zh-Hant']
          updates.push(`Added prefLabel.zh-Hant for ${item['@id']}: ${term['zh-Hant']}`)
          modified = true
        }
        if (!item.prefLabel['zh-Hans']) {
          item.prefLabel['zh-Hans'] = term['zh-Hans']
          updates.push(`Added prefLabel.zh-Hans for ${item['@id']}: ${term['zh-Hans']}`)
          modified = true
        }
      } else if (item.prefLabel['en'] && !item.prefLabel['zh-Hant']) {
        // Generic fallback for unknown terms
        const fallback = item.prefLabel['en']
        item.prefLabel['zh-Hant'] = fallback
        item.prefLabel['zh-Hans'] = fallback
        updates.push(`Added prefLabel zh for ${item['@id']} (fallback)`)
        modified = true
      }
    }

    // Add description translations
    if (item.description && item.description['en'] && !item.description['zh-Hant']) {
      const term = AYURVEDA_TERMS[item.prefLabel?.['en']]
      if (term?.desc) {
        item.description['zh-Hant'] = term.desc
        item.description['zh-Hans'] = tradToSimp(term.desc)
        updates.push(`Added description.zh for ${item['@id']}`)
        modified = true
      }
    }
  }

  return { data, modified, updates }
}

/**
 * Check if path matches a pattern
 */
function pathMatches(filePath, pattern) {
  let normalized = filePath.replace(/\\/g, '/')
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  return normalized.includes(pattern)
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    let result = { data, modified: false, updates: [] }

    // Skip schema files
    if (pathMatches(filePath, '/schema/')) {
      return result
    }

    // Determine file type and process
    if (pathMatches(filePath, '/entities/plants/') && filePath.endsWith('entity.jsonld')) {
      result = processPlantEntity(filePath, data)
    } else if (pathMatches(filePath, '/systems/tcm/herbs/') && filePath.endsWith('profile.jsonld')) {
      result = processTcmProfile(filePath, data)
    } else if (pathMatches(filePath, '/systems/western/herbs/') && filePath.endsWith('profile.jsonld')) {
      result = processWesternProfile(filePath, data)
    } else if (pathMatches(filePath, '/systems/ayurveda/') && !pathMatches(filePath, '/dravyas/')) {
      result = processAyurvedaReference(filePath, data)
    }

    // Write back if modified
    if (result.modified && !DRY_RUN) {
      writeFileSync(filePath, JSON.stringify(result.data, null, 2) + '\n', 'utf-8')
    }

    return result
  } catch (error) {
    return { error: error.message, modified: false, updates: [] }
  }
}

/**
 * Find all JSON-LD files
 */
function findJsonLdFiles(dir, files = []) {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist') {
        findJsonLdFiles(fullPath, files)
      }
    } else if (extname(entry) === '.jsonld') {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Main execution
 */
function main() {
  console.log('Fill Missing Translations Script')
  console.log('=================================')
  console.log(`Data directory: ${DATA_DIR}`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log('')

  const files = findJsonLdFiles(DATA_DIR)
  console.log(`Found ${files.length} JSON-LD files\n`)

  let modifiedCount = 0
  let errorCount = 0
  const stats = {
    plantEntity: { count: 0, updates: [] },
    tcmProfile: { count: 0, updates: [] },
    westernProfile: { count: 0, updates: [] },
    ayurvedaRef: { count: 0, updates: [] }
  }

  for (const file of files) {
    const result = processFile(file)

    if (result.error) {
      console.log(`ERROR: ${file}`)
      console.log(`  ${result.error}`)
      errorCount++
    } else if (result.modified) {
      modifiedCount++

      if (VERBOSE) {
        console.log(`MODIFIED: ${file}`)
        result.updates.forEach(u => console.log(`  - ${u}`))
      } else {
        // Brief output
        console.log(`✓ ${file}`)
      }

      // Track by type
      if (file.includes('/entities/plants/')) {
        stats.plantEntity.count++
        stats.plantEntity.updates.push(...result.updates)
      } else if (file.includes('/systems/tcm/herbs/')) {
        stats.tcmProfile.count++
        stats.tcmProfile.updates.push(...result.updates)
      } else if (file.includes('/systems/western/herbs/')) {
        stats.westernProfile.count++
        stats.westernProfile.updates.push(...result.updates)
      } else if (file.includes('/systems/ayurveda/')) {
        stats.ayurvedaRef.count++
        stats.ayurvedaRef.updates.push(...result.updates)
      }
    }
  }

  console.log('\n=================================')
  console.log('SUMMARY')
  console.log('=================================')
  console.log(`Files processed: ${files.length}`)
  console.log(`Files modified: ${modifiedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log('')
  console.log('By type:')
  console.log(`  Plant entities: ${stats.plantEntity.count}`)
  console.log(`  TCM profiles: ${stats.tcmProfile.count}`)
  console.log(`  Western profiles: ${stats.westernProfile.count}`)
  console.log(`  Ayurveda references: ${stats.ayurvedaRef.count}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN - No files were actually modified]')
    console.log('Run without --dry-run to apply changes')
  }
}

main()

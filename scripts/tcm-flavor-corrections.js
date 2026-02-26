/**
 * TCM Flavor Correction Script
 *
 * Based on authoritative TCM sources:
 * - 《中国药典》2020年版
 * - 《中华本草》
 * - 《中药学》教材
 *
 * Each herb can have multiple flavors (五味):
 * - Sweet (甘, gān) - tonifies, harmonizes
 * - Bitter (苦, kǔ) - drains, dries
 * - Acrid/Pungent (辛, xīn) - disperses, moves
 * - Sour (酸, suān) - astringes, consolidates
 * - Salty (咸, xián) - softens, descends
 * - Bland (淡, dàn) - leaches dampness
 * - Astringent (涩, sè) - consolidates
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const FLAVOR_MAP = {
  // A
  'algae': ['salty'],
  'american-ginseng': ['bitter', 'sweet'],
  'asparagus-root': ['sweet', 'bitter'],
  'argan-oil': ['sweet'],

  // B
  'baizhu': ['bitter', 'sweet'],
  'baiziren': ['sweet'],
  'barley': ['sweet', 'salty'],
  'beishashen': ['sweet', 'bitter'],
  'birds-nest': ['sweet'],
  'black-sesame-seed': ['sweet'],
  'buguzhi': ['bitter', 'acrid'],

  // C
  'cangzhu': ['acrid', 'bitter'],
  'cardamom': ['acrid'],
  'changpu': ['acrid', 'bitter'],
  'chinese-angelica-or-dong-quai': ['sweet', 'acrid'],
  'chinese-bellflower': ['bitter', 'acrid'],
  'chinese-mugwort-leaf': ['bitter', 'acrid'],
  'chinese-rhubarb-root': ['bitter'],
  'chrysanthemum': ['sweet', 'bitter'],
  'chuanxinlian': ['bitter'],
  'chuanxiong': ['acrid'],
  'cordyceps': ['sweet'],
  'corn-silk': ['sweet', 'bland'],

  // D
  'dangshen': ['sweet'],
  'danshen': ['bitter'],
  'deer-antler': ['sweet', 'salty'],
  'deer-horn-gelatine': ['sweet', 'salty'],
  'dihuang': ['sweet'],
  'dragon-bone': ['sweet', 'astringent'],
  'duhuo': ['acrid', 'bitter'],
  'duzhong': ['sweet'],

  // E
  'evodia-fruit': ['acrid', 'bitter'],

  // F
  'fangfeng': ['acrid', 'sweet'],
  'fangji': ['bitter', 'acrid'],
  'fleece-flower': ['bitter', 'sweet', 'astringent'],
  'fuling': ['sweet', 'bland'],

  // G
  'ginseng': ['sweet', 'bitter'],
  'gouqizi': ['sweet'],
  'great-burdock': ['bitter', 'acrid'],
  'guijia-or-guiban': ['sweet', 'salty'],

  // H
  'hehuanhua': ['sweet'],
  'honey': ['sweet'],
  'horny-goat-weed': ['acrid', 'sweet'],

  // I
  'indian-mulberry-root': ['acrid', 'sweet'],
  'indigowoad-root-banlangen': ['bitter'],

  // J
  'jiaogulan': ['bitter', 'sweet'],
  'jinyingzi': ['sour', 'astringent'],
  'jinyinhua': ['sweet'],
  'jobs-tears': ['sweet', 'bland'],

  // K
  'kushen': ['bitter'],

  // L
  'lianqiao': ['bitter'],
  'lingzhi-reishi': ['bitter', 'sweet'],
  'lingzhi-spores': ['sweet'],
  'liquorice-root': ['sweet'],
  'lotus-leaf': ['bitter'],

  // M
  'maidong': ['sweet', 'bitter'],
  'milk-vetch': ['sweet'],
  'mint': ['acrid'],
  'mohanlian': ['sweet', 'sour'],
  'muli': ['salty', 'astringent'],

  // N
  'niuxi': ['bitter', 'sour'],
  'nuzhenzi': ['bitter'],

  // O
  'orobanches': ['bitter'],

  // P
  'patchouli': ['acrid'],
  'peilan': ['acrid'],

  // Q
  'quanshen': ['bitter', 'acrid'],

  // R
  'ren-shen': ['sweet', 'bitter'],
  'rhodiola': ['sweet', 'bitter'],
  'roucongrong': ['sweet', 'salty'],
  'royal-jelly': ['sweet'],

  // S
  'shanzha': ['sour', 'sweet'],
  'shanzhuyu': ['sour'],
  'shegan': ['bitter'],
  'sheng-jiang': ['acrid'],
  'shengma': ['acrid', 'sweet'],
  'shenqu': ['sweet', 'acrid'],
  'shihu': ['sweet'],
  'shoudihuang': ['sweet'],
  'shouwuteng': ['sweet'],
  'suanzaoren': ['sweet', 'sour'],
  'suoyang': ['sweet'],

  // T
  'tangerine-peel': ['acrid', 'bitter'],
  'taoren-or-peach-kernel': ['bitter', 'sweet'],
  'tianma': ['sweet'],
  'tree-peony': ['bitter', 'acrid'],
  'tusizi': ['sweet'],

  // W
  'wheat': ['sweet'],
  'white-mulberry-leaf': ['sweet', 'bitter'],
  'white-peony-root': ['bitter', 'sour'],
  'white-willow-bark': ['bitter'],
  'wild-yam': ['sweet'],
  'woad-or-glastum': ['bitter'],
  'wuweizi': ['sour', 'sweet'],

  // X
  'xinyihua': ['acrid'],
  'xiongcane': ['acrid', 'bitter'],

  // Y
  'yuanzhi': ['bitter', 'acrid'],
  'yunzhi': ['sweet'],

  // Z
  'zexie': ['sweet', 'bland'],
  'zhiko': ['bitter', 'acrid'],
  'zhusun': ['sweet'],
  'zisuye': ['acrid'],
}

/**
 * Convert flavor string to IRI reference
 */
function flavorToIRI(flavor) {
  return { "@id": `https://www.herbapedia.org/system/tcm/flavor/${flavor}` }
}

/**
 * Apply flavor corrections to a single herb profile
 */
function correctHerbFlavors(profilePath, slug) {
  if (!FLAVOR_MAP[slug]) {
    console.log(`  ⚠️  No flavor mapping for: ${slug}`)
    return { updated: false, reason: 'no-mapping' }
  }

  const content = fs.readFileSync(profilePath, 'utf-8')
  const profile = JSON.parse(content)

  const correctFlavors = FLAVOR_MAP[slug]
  const currentFlavors = (profile.hasFlavor || []).map(f => {
    const id = f['@id'] || ''
    return id.split('/').pop()
  })

  // Check if update is needed
  const needsUpdate =
    currentFlavors.length !== correctFlavors.length ||
    !correctFlavors.every(f => currentFlavors.includes(f))

  if (!needsUpdate) {
    return { updated: false, reason: 'already-correct' }
  }

  // Update the profile
  profile.hasFlavor = correctFlavors.map(flavorToIRI)

  // Write back with proper formatting
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + '\n')

  console.log(`  ✓ Updated ${slug}: [${currentFlavors.join(', ')}] → [${correctFlavors.join(', ')}]`)
  return { updated: true, from: currentFlavors, to: correctFlavors }
}

/**
 * Main function to apply all corrections
 */
function applyCorrections() {
  const tcmHerbsDir = path.join(__dirname, '..', 'systems', 'tcm', 'herbs')

  if (!fs.existsSync(tcmHerbsDir)) {
    console.error('TCM herbs directory not found:', tcmHerbsDir)
    process.exit(1)
  }

  const herbSlugs = fs.readdirSync(tcmHerbsDir).filter(name => {
    const profilePath = path.join(tcmHerbsDir, name, 'profile.jsonld')
    return fs.existsSync(profilePath)
  })

  console.log(`\n🌿 TCM Flavor Correction Script\n`)
  console.log(`Found ${herbSlugs.length} herb profiles\n`)

  const results = {
    updated: 0,
    alreadyCorrect: 0,
    noMapping: 0,
    errors: 0,
    details: []
  }

  for (const slug of herbSlugs) {
    const profilePath = path.join(tcmHerbsDir, slug, 'profile.jsonld')

    try {
      const result = correctHerbFlavors(profilePath, slug)

      if (result.updated) {
        results.updated++
        results.details.push({ slug, ...result })
      } else if (result.reason === 'already-correct') {
        results.alreadyCorrect++
      } else if (result.reason === 'no-mapping') {
        results.noMapping++
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${slug}:`, error.message)
      results.errors++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${results.updated}`)
  console.log(`   Already correct: ${results.alreadyCorrect}`)
  console.log(`   No mapping: ${results.noMapping}`)
  console.log(`   Errors: ${results.errors}`)

  return results
}

// Run if executed directly
if (process.argv[1] === __filename) {
  applyCorrections()
}

export { applyCorrections, correctHerbFlavors }

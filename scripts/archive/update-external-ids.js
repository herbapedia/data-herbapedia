#!/usr/bin/env node
/**
 * Batch update external IDs (GBIF, Wikidata) for plant species.
 *
 * This script adds known external IDs to species entities and handles
 * duplicates by adding sameAs references.
 *
 * Usage:
 *   node scripts/update-external-ids.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const DRY_RUN = process.argv.includes('--dry-run')

// Known external IDs for species (compiled from research)
const EXTERNAL_IDS = {
  // Plants with GBIF and Wikidata IDs
  'bitter-orange': { gbifID: '8077391', wikidataID: 'Q147096', scientificName: 'Citrus ×aurantium' },
  'blueberry': { gbifID: '2882849', wikidataID: 'Q468695', scientificName: 'Vaccinium corymbosum' },
  'baiziren': { gbifID: '2684855', wikidataID: 'Q33482', scientificName: 'Platycladus orientalis' },
  'changpu': { gbifID: '2873797', wikidataID: 'Q3364284', scientificName: 'Acorus tatarinowii' },
  'white-willow-bark': { gbifID: '5372513', wikidataID: 'Q156918', scientificName: 'Salix alba' },
  'dandelion': { gbifID: '5388963', wikidataID: 'Q50871', scientificName: 'Taraxacum officinale' },
  'wild-yam': { gbifID: '2755387', wikidataID: 'Q15341401', scientificName: 'Dioscorea villosa' },
  'green-tea': { gbifID: '3189642', wikidataID: 'Q157245', scientificName: 'Camellia sinensis' },
  'garcinia-cambogia-fruit': { gbifID: '3189359', wikidataID: 'Q473917', scientificName: 'Garcinia gummi-gutta' },
  'tree-peony': { gbifID: '3578206', wikidataID: 'Q158752', scientificName: 'Paeonia suffruticosa' },
  'milk-vetch': { gbifID: '2965279', wikidataID: 'Q430891', scientificName: 'Astragalus membranaceus' },

  // Additional TCM herbs - researched 2026-02-21
  'ginkgo': { gbifID: '2687885', wikidataID: 'Q43284', scientificName: 'Ginkgo biloba' },
  'chinese-angelica-or-dong-quai': { gbifID: '6027415', wikidataID: 'Q2051387', scientificName: 'Angelica sinensis' },
  'liquorice-root': { gbifID: '2965770', wikidataID: 'Q1196166', scientificName: 'Glycyrrhiza uralensis' },
  'white-peony-root': { gbifID: '3083486', wikidataID: 'Q163076', scientificName: 'Paeonia lactiflora' },
  'dihuang': { gbifID: '6033069', wikidataID: 'Q1071605', scientificName: 'Rehmannia glutinosa' },
  'baizhu': { gbifID: '3122454', wikidataID: 'Q8208640', scientificName: 'Atractylodes macrocephala' },
  'dangshen': { gbifID: '5412957', wikidataID: 'Q1066518', scientificName: 'Codonopsis pilosula' },
  'duzhong': { gbifID: '3723584', wikidataID: 'Q131528', scientificName: 'Eucommia ulmoides' },
  'fuling': { gbifID: '2549306', wikidataID: 'Q54370411', scientificName: 'Wolfiporia cocos' },
  'jinyinhua': { gbifID: '5334240', wikidataID: 'Q161083', scientificName: 'Lonicera japonica' },

  // Additional herbs - researched 2026-02-21
  'american-ginseng': { gbifID: '5372246', wikidataID: 'Q2737217', scientificName: 'Panax quinquefolius' },
  'turmeric': { gbifID: '2757624', wikidataID: 'Q42562', scientificName: 'Curcuma longa' },
  'ginger': { gbifID: '2757280', wikidataID: 'Q35625', scientificName: 'Zingiber officinale' },
  'echinacea': { gbifID: '3150935', wikidataID: 'Q131522', scientificName: 'Echinacea purpurea' },
  'valerian': { gbifID: '2888763', wikidataID: 'Q157819', scientificName: 'Valeriana officinalis' },
  'st-johns-wort': { gbifID: '3189486', wikidataID: 'Q158289', scientificName: 'Hypericum perforatum' },
  'milk-thistle': { gbifID: '3145214', wikidataID: 'Q193798', scientificName: 'Silybum marianum' },
  'rosemary-oil': { gbifID: '2926634', wikidataID: 'Q122679', scientificName: 'Rosmarinus officinalis' },

  // Additional plants researched 2026-02-21 (batch 2)
  'aloe-vera': { gbifID: '2777724', wikidataID: 'Q80079', scientificName: 'Aloe vera' },
  'black-sesame-seed': { gbifID: '3172622', wikidataID: 'Q2763698', scientificName: 'Sesamum indicum' },
  'barley': { gbifID: '2706056', wikidataID: 'Q11577', scientificName: 'Hordeum vulgare' },
  'bilberry': { gbifID: '2882833', wikidataID: 'Q5413585', scientificName: 'Vaccinium myrtillus' },
  'balm-mint-oil': { gbifID: '5341501', wikidataID: 'Q148396', scientificName: 'Melissa officinalis' },
  'borage-extract': { gbifID: '2926110', wikidataID: 'Q147075', scientificName: 'Borago officinalis' },
  'beishashen': { gbifID: '3034648', wikidataID: 'Q15548072', scientificName: 'Glehnia littoralis' },
  'asparagus-root': { gbifID: '2768772', wikidataID: 'Q8207156', scientificName: 'Asparagus cochinchinensis' },
  'algae': { gbifID: '3196917', wikidataID: 'Q1204264', scientificName: 'Sargassum fusiforme' },
  'thyme-oil': { gbifID: '5341442', wikidataID: 'Q148668', scientificName: 'Thymus vulgaris' },
  'chamomile': { gbifID: '6445074', wikidataID: 'Q28437', scientificName: 'Matricaria chamomilla' },
  'chrysanthemum': { gbifID: '3150767', wikidataID: 'Q15530181', scientificName: 'Chrysanthemum ×morifolium' },
  'cordyceps': { gbifID: '2560562', wikidataID: 'Q312238', scientificName: 'Ophiocordyceps sinensis' },
  'danshen': { gbifID: '7308369', wikidataID: 'Q1000854', scientificName: 'Salvia miltiorrhiza' },
  'rhodiola': { gbifID: '2985688', wikidataID: 'Q207375', scientificName: 'Rhodiola rosea' },
  'horny-goat-weed': { gbifID: '2928840', wikidataID: 'Q852660', scientificName: 'Withania somnifera' },

  // Additional plants researched 2026-02-21 (batch 3)
  'chuanxiong': { gbifID: '3639592', wikidataID: 'Q61958112', scientificName: 'Ligusticum chuanxiong' },
  'lingzhi-reishi': { gbifID: '2549730', wikidataID: 'Q271098', scientificName: 'Ganoderma lucidum' },
  'jobs-tears': { gbifID: '2706301', wikidataID: 'Q827098', scientificName: 'Coix lacryma-jobi' },

  // Additional plants researched 2026-02-21 (batch 4)
  'white-mulberry-leaf': { gbifID: '5361889', wikidataID: 'Q157307', scientificName: 'Morus alba' },
  'shanzhuyu': { gbifID: '7161076', wikidataID: 'Q728125', scientificName: 'Cornus officinalis' },
  'hawthorn': { gbifID: '3014527', wikidataID: 'Q1141735', scientificName: 'Crataegus pinnatifida' },

  // Additional plants researched 2026-02-21 (batch 5)
  'eucalyptus-oil': { gbifID: '3176787', wikidataID: 'Q159528', scientificName: 'Eucalyptus globulus' },
  'lavender-oil': { gbifID: '2927305', wikidataID: 'Q42081', scientificName: 'Lavandula angustifolia' },

  // Additional plants researched 2026-02-21 (batch 6)
  'garlic': { gbifID: '2856681', wikidataID: 'Q23400', scientificName: 'Allium sativum' },
  'jiegeng': { gbifID: '3164340', wikidataID: 'Q805322', scientificName: 'Platycodon grandiflorus' },
  'chinese-bellflower': { gbifID: '3164340', wikidataID: 'Q805322', scientificName: 'Platycodon grandiflorus' },
  'buguzhi': { gbifID: '2948931', wikidataID: 'Q15530962', scientificName: 'Cullen corylifolium' },
  'cangzhu': { gbifID: '3122433', wikidataID: 'Q5202812', scientificName: 'Atractylodes lancea' },
  'cardamom': { gbifID: '5301710', wikidataID: 'Q2843829', scientificName: 'Amomum villosum' },
  'chinese-mugwort-leaf': { gbifID: '3120648', wikidataID: 'Q4797490', scientificName: 'Artemisia argyi' },
  'chinese-rhubarb-root': { gbifID: '2888864', wikidataID: 'Q1109580', scientificName: 'Rheum palmatum' },

  // Duplicates - link to primary entry
  'zhiko': { sameAs: [{ '@id': 'botanical/species/bitter-orange' }] },
  'fleece-flower': { sameAs: [{ '@id': 'botanical/species/shouwuteng' }] },
  'zingiber-officinale': { sameAs: [{ '@id': 'botanical/species/ginger' }] },
  'panax-ginseng': { sameAs: [{ '@id': 'botanical/species/ginseng' }] },
  'indigowoad-root-banlangen': { sameAs: [{ '@id': 'botanical/species/woad-or-glastum' }] },
  // lingzhi-spores is NOT a duplicate - it's a life stage of lingzhi-reishi
  // The relationship is: isLifeStageOf / producedBy, not sameAs
}

// Non-plant entities - only add Wikidata IDs (no GBIF)
const NON_PLANT_WIKIDATA = {
  'calcium': 'Q706',
  'copper': 'Q753',
  'iodine': 'Q1103',
  'iron': 'Q677',
  'magnesium': 'Q660',
  'manganese': 'Q731',
  'potassium': 'Q703',
  'selenium': 'Q737',
  'zinc': 'Q758',
  'vitamin-a': 'Q174221',
  'vitamin-b1': 'Q193248',
  'vitamin-b2': 'Q130283',
  'vitamin-b3-niacin': 'Q130365',
  'vitamin-b5': 'Q130405',
  'vitamin-b6': 'Q130414',
  'vitamin-b7-biotin': 'Q141076',
  'vitamin-b9-folate-folic-acid': 'Q127060',
  'vitamin-b12': 'Q131065',
  'vitamin-c': 'Q175623',
  'vitamin-d-calciferol-cholecalciferol-ergocalciferol': 'Q132627',
  'vitamin-e': 'Q183206',
  'vitamin-p-bioflavonoids': 'Q211096',
  'choline': 'Q193166',
  'inositol': 'Q162281',
  'lysine': 'Q159083',
  'methionine': 'Q178097',
  'glycine': 'Q159299',
  'cysteine-hci': 'Q186075',
  'paba': 'Q200374',
  'omega-3': 'Q193232',
  'omega-6': 'Q193247',
  'omega-9': 'Q193243',
  'glucosamine-sulfate': 'Q425039',
  'chondroitin-sulfate': 'Q425017',
  'chitosan': 'Q424362',
  'lecithin': 'Q208640',
  'phospholipids': 'Q186915',
  'glycerin': 'Q132621',
  'ceramides': 'Q188889',
  'squalene': 'Q424630',
  'linolenic-acid': 'Q209907',
  'melatonin': 'Q180925',
  'mineral-oil': 'Q193211',
  'petrolatum': 'Q193212',
  'royal-jelly': 'Q207292',
  'honey': 'Q10976',
  'amber': 'Q128123',
  'argan-oil': 'Q207294',
}

async function main() {
  console.log('=== Updating External IDs ===\n')

  if (DRY_RUN) {
    console.log('DRY RUN - No files will be written\n')
  }

  let stats = {
    updated: 0,
    sameAsAdded: 0,
    wikidataAdded: 0,
    skipped: 0
  }

  // Update plant species with external IDs
  for (const [slug, ids] of Object.entries(EXTERNAL_IDS)) {
    const entityFile = path.join(SPECIES_DIR, slug, 'entity.jsonld')
    if (!fs.existsSync(entityFile)) {
      console.log(`  SKIP: ${slug} - file not found`)
      stats.skipped++
      continue
    }

    const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))
    let modified = false

    // Add sameAs references for duplicates
    if (ids.sameAs) {
      if (!data.sameAs) {
        data.sameAs = ids.sameAs
        modified = true
        console.log(`  + ${slug}: Added sameAs reference`)
        stats.sameAsAdded++
      }
    }

    // Add GBIF ID
    if (ids.gbifID && !data.gbifID) {
      data.gbifID = ids.gbifID
      modified = true
      console.log(`  + ${slug}: Added GBIF ID ${ids.gbifID}`)
    }

    // Add Wikidata ID
    if (ids.wikidataID && !data.wikidataID) {
      data.wikidataID = ids.wikidataID
      modified = true
      console.log(`  + ${slug}: Added Wikidata ID ${ids.wikidataID}`)
    }

    // Update scientific name if provided and missing
    if (ids.scientificName && !data.scientificName) {
      data.scientificName = ids.scientificName
      modified = true
      console.log(`  + ${slug}: Added scientific name ${ids.scientificName}`)
    }

    if (modified) {
      data.provenance = data.provenance || {}
      data.provenance.modified = new Date().toISOString()

      if (!DRY_RUN) {
        fs.writeFileSync(entityFile, JSON.stringify(data, null, 2))
      }
      stats.updated++
    }
  }

  // Update non-plant entities with Wikidata IDs
  for (const [slug, wikidataID] of Object.entries(NON_PLANT_WIKIDATA)) {
    const entityFile = path.join(SPECIES_DIR, slug, 'entity.jsonld')
    if (!fs.existsSync(entityFile)) {
      continue
    }

    const data = JSON.parse(fs.readFileSync(entityFile, 'utf8'))

    if (!data.wikidataID) {
      data.wikidataID = wikidataID
      data.provenance = data.provenance || {}
      data.provenance.modified = new Date().toISOString()

      if (!DRY_RUN) {
        fs.writeFileSync(entityFile, JSON.stringify(data, null, 2))
      }
      console.log(`  + ${slug}: Added Wikidata ID ${wikidataID}`)
      stats.wikidataAdded++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Species updated: ${stats.updated}`)
  console.log(`SameAs references added: ${stats.sameAsAdded}`)
  console.log(`Non-plant Wikidata IDs added: ${stats.wikidataAdded}`)
  console.log(`Skipped: ${stats.skipped}`)

  if (DRY_RUN) {
    console.log('\n*** DRY RUN - No changes were made ***')
  }
}

main().catch(console.error)

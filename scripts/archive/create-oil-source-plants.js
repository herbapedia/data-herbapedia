#!/usr/bin/env node
/**
 * Create source plant entities for essential oils.
 *
 * Essential oils are extracts, not species. They need source plants
 * to link to via the derivedFrom/isExtractOf relationship.
 *
 * This script creates minimal BotanicalSource entities for:
 * - argan (Argania spinosa)
 * - balm-mint (Melissa officinalis) - lemon balm
 * - clove (Syzygium aromaticum)
 * - eucalyptus (Eucalyptus globulus)
 * - evening-primrose (Oenothera biennis)
 * - jojoba (Simmondsia chinensis)
 * - lavender (Lavandula angustifolia)
 * - peppermint (Mentha × piperita)
 * - rosemary (Salvia rosmarinus)
 * - sage (Salvia officinalis)
 * - tea-tree (Melaleuca alternifolia)
 * - thyme (Thymus vulgaris)
 *
 * Usage:
 *   node scripts/create-oil-source-plants.js          # Show plan
 *   node scripts/create-oil-source-plants.js --create # Create entities
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const SPECIES_DIR = path.join(ROOT_DIR, 'entities/botanical/species')
const CREATE_MODE = process.argv.includes('--create')

// Source plants for essential oils with Wikidata IDs
const SOURCE_PLANTS = [
  {
    slug: 'argan',
    scientificName: 'Argania spinosa',
    family: 'Sapotaceae',
    name: { en: 'Argan', zhHant: '摩洛哥堅果', zhHans: '摩洛哥坚果' },
    description: 'A tree native to Morocco, valued for its oil-rich nuts.',
    wikidataID: 'Q215833'
  },
  {
    slug: 'balm-mint',
    scientificName: 'Melissa officinalis',
    family: 'Lamiaceae',
    name: { en: 'Lemon Balm', zhHant: '香蜂草', zhHans: '香蜂草' },
    description: 'A perennial herb in the mint family with a lemon scent.',
    wikidataID: 'Q131122'
  },
  {
    slug: 'clove',
    scientificName: 'Syzygium aromaticum',
    family: 'Myrtaceae',
    name: { en: 'Clove Tree', zhHant: '丁香樹', zhHans: '丁香树' },
    description: 'An evergreen tree whose flower buds are used as a spice.',
    wikidataID: 'Q213382'
  },
  {
    slug: 'eucalyptus',
    scientificName: 'Eucalyptus globulus',
    family: 'Myrtaceae',
    name: { en: 'Eucalyptus', zhHant: '尤加利', zhHans: '尤加利' },
    description: 'A tall evergreen tree native to Australia.',
    wikidataID: 'Q156895'
  },
  {
    slug: 'evening-primrose',
    scientificName: 'Oenothera biennis',
    family: 'Onagraceae',
    name: { en: 'Evening Primrose', zhHant: '月見草', zhHans: '月见草' },
    description: 'A biennial flowering plant whose seeds yield oil rich in gamma-linolenic acid.',
    wikidataID: 'Q161259'
  },
  {
    slug: 'jojoba',
    scientificName: 'Simmondsia chinensis',
    family: 'Simmondsiaceae',
    name: { en: 'Jojoba', zhHant: '荷荷巴', zhHans: '荷荷巴' },
    description: 'A shrub whose seeds yield a liquid wax used in cosmetics.',
    wikidataID: 'Q214011'
  },
  {
    slug: 'lavender',
    scientificName: 'Lavandula angustifolia',
    family: 'Lamiaceae',
    name: { en: 'Lavender', zhHant: '薰衣草', zhHans: '薰衣草' },
    description: 'A flowering plant in the mint family, known for its fragrant essential oil.',
    wikidataID: 'Q128077'
  },
  {
    slug: 'peppermint',
    scientificName: 'Mentha × piperita',
    family: 'Lamiaceae',
    name: { en: 'Peppermint', zhHant: '胡椒薄荷', zhHans: '胡椒薄荷' },
    description: 'A hybrid mint, a cross between watermint and spearmint.',
    wikidataID: 'Q128422'
  },
  {
    slug: 'rosemary',
    scientificName: 'Salvia rosmarinus',
    family: 'Lamiaceae',
    name: { en: 'Rosemary', zhHant: '迷迭香', zhHans: '迷迭香' },
    description: 'An evergreen shrub with fragrant, needle-like leaves.',
    wikidataID: 'Q128550'
  },
  {
    slug: 'sage',
    scientificName: 'Salvia officinalis',
    family: 'Lamiaceae',
    name: { en: 'Sage', zhHant: '鼠尾草', zhHans: '鼠尾草' },
    description: 'A perennial evergreen subshrug with woody stems.',
    wikidataID: 'Q128889'
  },
  {
    slug: 'tea-tree',
    scientificName: 'Melaleuca alternifolia',
    family: 'Myrtaceae',
    name: { en: 'Tea Tree', zhHant: '茶樹', zhHans: '茶树' },
    description: 'A small tree native to Australia, source of tea tree oil.',
    wikidataID: 'Q1540966'
  },
  {
    slug: 'thyme',
    scientificName: 'Thymus vulgaris',
    family: 'Lamiaceae',
    name: { en: 'Thyme', zhHant: '百里香', zhHans: '百里香' },
    description: 'A low-growing herbaceous plant with small aromatic leaves.',
    wikidataID: 'Q128457'
  }
]

function createEntity(plant) {
  return {
    "@context": "../../schema/context/core.jsonld",
    "@id": `botanical/species/${plant.slug}`,
    "@type": [
      "herbapedia:BotanicalSource",
      "botany:PlantSpecies",
      "schema:Plant"
    ],
    "sourceType": "botanical",
    "sourceSubType": "plant",
    "scientificName": plant.scientificName,
    "family": plant.family,
    "name": {
      "en": plant.name.en,
      "zh-Hant": plant.name.zhHant,
      "zh-Hans": plant.name.zhHans
    },
    "description": {
      "en": plant.description
    },
    "wikidataID": plant.wikidataID,
    "hasExtract": [
      {
        "@id": `preparation/${plant.slug}-oil`
      }
    ],
    "provenance": {
      "created": new Date().toISOString().split('T')[0],
      "source": "Created as source plant for essential oil",
      "purpose": "Enable proper linking of essential oil extracts"
    }
  }
}

async function main() {
  console.log('=== Essential Oil Source Plant Creator ===\n')

  const toCreate = []
  const alreadyExist = []

  for (const plant of SOURCE_PLANTS) {
    const entityDir = path.join(SPECIES_DIR, plant.slug)
    const entityFile = path.join(entityDir, 'entity.jsonld')

    if (fs.existsSync(entityFile)) {
      alreadyExist.push(plant.slug)
    } else {
      toCreate.push(plant)
    }
  }

  console.log(`Already exist: ${alreadyExist.length}`)
  if (alreadyExist.length > 0) {
    console.log(`  ${alreadyExist.join(', ')}`)
  }

  console.log(`\nTo create: ${toCreate.length}`)
  if (toCreate.length > 0) {
    for (const plant of toCreate) {
      console.log(`  - ${plant.slug} (${plant.scientificName})`)
    }
  }

  if (!CREATE_MODE) {
    console.log('\nRun with --create to create these entities.')
    return
  }

  console.log('\n=== Creating Entities ===\n')

  for (const plant of toCreate) {
    const entityDir = path.join(SPECIES_DIR, plant.slug)
    const entityFile = path.join(entityDir, 'entity.jsonld')

    fs.mkdirSync(entityDir, { recursive: true })
    fs.writeFileSync(entityFile, JSON.stringify(createEntity(plant), null, 2))

    console.log(`✓ Created: ${plant.slug}`)
  }

  console.log(`\nCreated ${toCreate.length} source plant entities.`)
}

main().catch(console.error)

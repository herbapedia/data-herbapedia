#!/usr/bin/env node

/**
 * Herbapedia Data Index Builder
 *
 * Generates index files for the architecture with:
 * - All 5 medicine systems (TCM, Western, Ayurveda, Unani, Mongolian)
 * - Entity structure (entities/botanical/*, entities/preparations, profiles/*)
 * - Cross-reference indexes for efficient lookups
 *
 * Usage:
 *   node scripts/build-index.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// ============================================================================
// Utility Functions
// ============================================================================

function findJsonLdFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = existsSync(fullPath) && statSync(fullPath)
    if (stat && stat.isDirectory()) {
      findJsonLdFiles(fullPath, files)
    } else if (entry.endsWith('.jsonld')) {
      files.push(fullPath)
    }
  }
  return files
}

function parseJsonLdFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`)
    return null
  }
}

function getSlugFromPath(filePath, baseDir) {
  const relativePath = relative(baseDir, filePath)
  const parts = relativePath.split('/')
  return parts[parts.length - 2]
}

function extractIriSlug(iriRef) {
  if (!iriRef) return null
  if (typeof iriRef === 'string') return iriRef.split('/').pop()
  if (iriRef['@id']) return iriRef['@id'].split('/').pop()
  return null
}

function extractIris(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(v => extractIriSlug(v)).filter(Boolean)
  }
  const slug = extractIriSlug(value)
  return slug ? [slug] : []
}

// ============================================================================
// Entity Loaders
// ============================================================================

function loadBotanicalSpecies() {
  const dir = join(ROOT, 'entities/botanical/species')
  const files = findJsonLdFiles(dir)
  const species = []
  const index = {
    byScientificName: {},
    byGBIF: {},
    byWikidata: {},
  }

  for (const file of files) {
    if (!file.endsWith('/entity.jsonld')) continue
    const data = parseJsonLdFile(file)
    if (!data) continue

    const slug = getSlugFromPath(file, dir)
    species.push({ slug, data })

    // Index by scientific name
    if (data.scientificName) {
      index.byScientificName[data.scientificName.toLowerCase()] = slug
    }

    // Index by GBIF ID
    if (data.gbifID) {
      index.byGBIF[data.gbifID] = slug
    }

    // Index by Wikidata
    if (data.sameAs) {
      const sameAs = Array.isArray(data.sameAs) ? data.sameAs : [data.sameAs]
      for (const ref of sameAs) {
        if (ref['@id'] && ref['@id'].includes('wikidata.org')) {
          index.byWikidata[ref['@id']] = slug
        }
      }
    }
  }

  return { species, index }
}

function loadPreparations() {
  const dir = join(ROOT, 'entities/preparations')
  const files = findJsonLdFiles(dir)
  const preparations = []
  const index = {
    byPlant: {},
    profilesByPreparation: {},
  }

  for (const file of files) {
    if (!file.endsWith('/entity.jsonld')) continue
    const data = parseJsonLdFile(file)
    if (!data) continue

    const slug = getSlugFromPath(file, dir)
    preparations.push({ slug, data })

    // Index by source plant
    const sourcePlant = extractIriSlug(data.derivedFrom?.[0])
    if (sourcePlant) {
      if (!index.byPlant[sourcePlant]) {
        index.byPlant[sourcePlant] = []
      }
      index.byPlant[sourcePlant].push(slug)
    }

    // Index profiles
    const profiles = {}
    if (data.hasTCMProfile?.length) profiles.tcm = extractIriSlug(data.hasTCMProfile[0])
    if (data.hasWesternProfile?.length) profiles.western = extractIriSlug(data.hasWesternProfile[0])
    if (data.hasAyurvedaProfile?.length) profiles.ayurveda = extractIriSlug(data.hasAyurvedaProfile[0])
    if (data.hasUnaniProfile?.length) profiles.unani = extractIriSlug(data.hasUnaniProfile[0])
    if (data.hasMongolianProfile?.length) profiles.mongolian = extractIriSlug(data.hasMongolianProfile[0])

    if (Object.keys(profiles).length > 0) {
      index.profilesByPreparation[slug] = profiles
    }
  }

  return { preparations, index }
}

function loadProfiles(systemName) {
  const dir = join(ROOT, 'profiles', systemName)
  const files = findJsonLdFiles(dir)
  const profiles = []
  const index = {}

  for (const file of files) {
    if (!file.endsWith('/profile.jsonld')) continue
    const data = parseJsonLdFile(file)
    if (!data) continue

    const slug = getSlugFromPath(file, dir)
    profiles.push({ slug, data })

    // Build system-specific indexes
    if (systemName === 'tcm') {
      // TCM: Index by nature, flavor, meridian, category
      extractIris(data.hasNature).forEach(n => {
        if (!index[`nature:${n}`]) index[`nature:${n}`] = []
        index[`nature:${n}`].push(slug)
      })
      extractIris(data.hasCategory).forEach(c => {
        if (!index[`category:${c}`]) index[`category:${c}`] = []
        index[`category:${c}`].push(slug)
      })
      extractIris(data.hasFlavor).forEach(f => {
        if (!index[`flavor:${f}`]) index[`flavor:${f}`] = []
        index[`flavor:${f}`].push(slug)
      })
      extractIris(data.entersMeridian).forEach(m => {
        if (!index[`meridian:${m}`]) index[`meridian:${m}`] = []
        index[`meridian:${m}`].push(slug)
      })
    }

    if (systemName === 'western') {
      // Western: Index by action, organ
      extractIris(data.hasAction).forEach(a => {
        if (!index[`action:${a}`]) index[`action:${a}`] = []
        index[`action:${a}`].push(slug)
      })
      extractIris(data.hasOrganAffinity).forEach(o => {
        if (!index[`organ:${o}`]) index[`organ:${o}`] = []
        index[`organ:${o}`].push(slug)
      })
    }

    if (systemName === 'ayurveda') {
      // Ayurveda: Index by dosha, rasa
      extractIris(data.hasRasa).forEach(r => {
        if (!index[`rasa:${r}`]) index[`rasa:${r}`] = []
        index[`rasa:${r}`].push(slug)
      })
      if (data.affectsDosha) {
        Object.keys(data.affectsDosha).forEach(d => {
          if (!index[`dosha:${d}`]) index[`dosha:${d}`] = []
          index[`dosha:${d}`].push(slug)
        })
      }
    }

    if (systemName === 'unani') {
      // Unani: Index by temperament
      extractIris(data.hasTemperament).forEach(t => {
        if (!index[`temperament:${t}`]) index[`temperament:${t}`] = []
        index[`temperament:${t}`].push(slug)
      })
    }

    if (systemName === 'mongolian') {
      // Mongolian: Index by roots affected
      if (data.affectsRoots) {
        Object.keys(data.affectsRoots).forEach(r => {
          if (!index[`root:${r}`]) index[`root:${r}`] = []
          index[`root:${r}`].push(slug)
        })
      }
    }
  }

  return { profiles, index }
}

// ============================================================================
// Main Build Function
// ============================================================================

function build() {
  console.log('Building Herbapedia Data Index...\n')

  const counts = {
    plantSpecies: 0,
    plantParts: 0,
    preparations: 0,
    tcmProfiles: 0,
    westernProfiles: 0,
    ayurvedaProfiles: 0,
    unaniProfiles: 0,
    mongolianProfiles: 0,
    chemicals: 0,
    chemicalProfiles: 0,
    dnaBarcodes: 0,
  }

  const indexes = {
    plantsByScientificName: {},
    plantsByGBIF: {},
    plantsByWikidata: {},
    preparationsByPlant: {},
    profilesByPreparation: {},
    tcmByNature: {},
    tcmByCategory: {},
    tcmByMeridian: {},
    tcmByFlavor: {},
    westernByAction: {},
    westernByOrgan: {},
    westernBySystem: {},
    ayurvedaByDosha: {},
    ayurvedaByRasa: {},
    unaniByTemperament: {},
    mongolianByRoot: {},
    mongolianByElement: {},
    chemicalsByPlant: {},
  }

  // Load botanical species
  console.log('  Loading botanical species...')
  const { species, index: speciesIndex } = loadBotanicalSpecies()
  counts.plantSpecies = species.length
  indexes.plantsByScientificName = speciesIndex.byScientificName
  indexes.plantsByGBIF = speciesIndex.byGBIF
  indexes.plantsByWikidata = speciesIndex.byWikidata
  console.log(`    Found ${species.length} plant species`)

  // Load preparations
  console.log('  Loading preparations...')
  const { preparations, index: prepIndex } = loadPreparations()
  counts.preparations = preparations.length
  indexes.preparationsByPlant = prepIndex.byPlant
  indexes.profilesByPreparation = prepIndex.profilesByPreparation
  console.log(`    Found ${preparations.length} preparations`)

  // Load TCM profiles
  console.log('  Loading TCM profiles...')
  const { profiles: tcmProfiles, index: tcmIndex } = loadProfiles('tcm')
  counts.tcmProfiles = tcmProfiles.length
  // Transform index format
  for (const [key, slugs] of Object.entries(tcmIndex)) {
    const [type, value] = key.split(':')
    if (type === 'nature') indexes.tcmByNature[value] = slugs
    if (type === 'category') indexes.tcmByCategory[value] = slugs
    if (type === 'flavor') indexes.tcmByFlavor[value] = slugs
    if (type === 'meridian') indexes.tcmByMeridian[value] = slugs
  }
  console.log(`    Found ${tcmProfiles.length} TCM profiles`)

  // Load Western profiles
  console.log('  Loading Western profiles...')
  const { profiles: westernProfiles, index: westernIndex } = loadProfiles('western')
  counts.westernProfiles = westernProfiles.length
  for (const [key, slugs] of Object.entries(westernIndex)) {
    const [type, value] = key.split(':')
    if (type === 'action') indexes.westernByAction[value] = slugs
    if (type === 'organ') indexes.westernByOrgan[value] = slugs
  }
  console.log(`    Found ${westernProfiles.length} Western profiles`)

  // Load Ayurveda profiles
  console.log('  Loading Ayurveda profiles...')
  const { profiles: ayurvedaProfiles, index: ayurvedaIndex } = loadProfiles('ayurveda')
  counts.ayurvedaProfiles = ayurvedaProfiles.length
  for (const [key, slugs] of Object.entries(ayurvedaIndex)) {
    const [type, value] = key.split(':')
    if (type === 'rasa') indexes.ayurvedaByRasa[value] = slugs
    if (type === 'dosha') indexes.ayurvedaByDosha[value] = slugs
  }
  console.log(`    Found ${ayurvedaProfiles.length} Ayurveda profiles`)

  // Load Unani profiles
  console.log('  Loading Unani profiles...')
  const { profiles: unaniProfiles, index: unaniIndex } = loadProfiles('unani')
  counts.unaniProfiles = unaniProfiles.length
  for (const [key, slugs] of Object.entries(unaniIndex)) {
    const [type, value] = key.split(':')
    if (type === 'temperament') indexes.unaniByTemperament[value] = slugs
  }
  console.log(`    Found ${unaniProfiles.length} Unani profiles`)

  // Load Mongolian profiles
  console.log('  Loading Mongolian profiles...')
  const { profiles: mongolianProfiles, index: mongolianIndex } = loadProfiles('mongolian')
  counts.mongolianProfiles = mongolianProfiles.length
  for (const [key, slugs] of Object.entries(mongolianIndex)) {
    const [type, value] = key.split(':')
    if (type === 'root') indexes.mongolianByRoot[value] = slugs
  }
  console.log(`    Found ${mongolianProfiles.length} Mongolian profiles`)

  // Also check old directories for data that may exist there
  const oldPlantsDir = join(ROOT, 'entities/plants')
  if (existsSync(oldPlantsDir)) {
    const oldPlantFiles = findJsonLdFiles(oldPlantsDir).filter(f => f.endsWith('/entity.jsonld'))
    console.log(`  Found ${oldPlantFiles.length} plant entities in old location (entities/plants/)`)
  }

  const oldTcmDir = join(ROOT, 'systems/tcm/herbs')
  if (existsSync(oldTcmDir)) {
    const oldTcmFiles = findJsonLdFiles(oldTcmDir).filter(f => f.endsWith('/profile.jsonld'))
    console.log(`  Found ${oldTcmFiles.length} TCM profiles in old location (systems/tcm/herbs/)`)
  }

  // Build master index
  const masterIndex = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    counts,
    indexes,
  }

  // Ensure output directory
  const outputDir = join(ROOT, 'dist')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write index files
  console.log('\n  Writing index files...')

  writeFileSync(join(outputDir, 'index.json'), JSON.stringify(masterIndex, null, 2))
  console.log('    dist/index.json')

  // Write system-specific indexes
  writeFileSync(join(outputDir, 'botanical-index.json'), JSON.stringify({
    version: '2.0.0',
    generated: new Date().toISOString(),
    counts: {
      species: counts.plantSpecies,
      parts: counts.plantParts,
      chemicals: counts.chemicals,
    },
    indexes: {
      byScientificName: indexes.plantsByScientificName,
      byGBIF: indexes.plantsByGBIF,
      byWikidata: indexes.plantsByWikidata,
    },
    species: species.map(({ slug, data }) => ({
      '@id': `botanical/species/${slug}`,
      slug,
      scientificName: data.scientificName,
      name: data.name,
      family: data.family,
    })),
  }, null, 2))
  console.log('    dist/botanical-index.json')

  writeFileSync(join(outputDir, 'preparations-index.json'), JSON.stringify({
    version: '2.0.0',
    generated: new Date().toISOString(),
    counts: { preparations: counts.preparations },
    indexes: {
      byPlant: indexes.preparationsByPlant,
      profilesByPreparation: indexes.profilesByPreparation,
    },
    preparations: preparations.map(({ slug, data }) => ({
      '@id': `preparation/${slug}`,
      slug,
      name: data.name,
      derivedFrom: extractIriSlug(data.derivedFrom?.[0]),
    })),
  }, null, 2))
  console.log('    dist/preparations-index.json')

  // Write cross-reference index
  writeFileSync(join(outputDir, 'cross-references.json'), JSON.stringify({
    version: '2.0.0',
    generated: new Date().toISOString(),
    indexes,
  }, null, 2))
  console.log('    dist/cross-references.json')

  // Summary
  console.log('\n✅ Index build complete!')
  console.log('\n  Entity Counts:')
  console.log(`    Plant Species: ${counts.plantSpecies}`)
  console.log(`    Preparations: ${counts.preparations}`)
  console.log(`    TCM Profiles: ${counts.tcmProfiles}`)
  console.log(`    Western Profiles: ${counts.westernProfiles}`)
  console.log(`    Ayurveda Profiles: ${counts.ayurvedaProfiles}`)
  console.log(`    Unani Profiles: ${counts.unaniProfiles}`)
  console.log(`    Mongolian Profiles: ${counts.mongolianProfiles}`)
}

build()

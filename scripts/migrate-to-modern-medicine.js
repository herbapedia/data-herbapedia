#!/usr/bin/env node

/**
 * Migrate Western profiles to Modern Medicine profiles
 *
 * This script migrates vitamins, minerals, amino acids, and other nutrients
 * from Western Herbalism profiles to Modern Medicine profiles.
 *
 * Usage:
 *   node scripts/migrate-to-modern-medicine.js [--dry-run] [--delete-western]
 *
 * Options:
 *   --dry-run         Show what would be migrated without making changes
 *   --delete-western  Delete Western profiles after migration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// ============================================================================
// Entity Classification
// ============================================================================

/**
 * Entities that should be migrated to Modern Medicine
 * These are NOT traditional Western herbs - they are minerals, vitamins, amino acids, etc.
 */
const MODERN_MEDICINE_ENTITIES = {
  // Minerals
  minerals: [
    'calcium',
    'copper',
    'iodine',
    'iron',
    'magnesium',
    'manganese',
    'potassium',
    'selenium',
    'zinc',
  ],

  // Vitamins
  vitamins: [
    'vitamin-a',
    'vitamin-b1',
    'vitamin-b2',
    'vitamin-b3-niacin',
    'vitamin-b5',
    'vitamin-b6',
    'vitamin-b7-biotin',
    'vitamin-b9-folate-folic-acid',
    'vitamin-b12',
    'vitamin-c',
    'vitamin-d-calciferol-cholecalciferol-ergocalciferol',
    'vitamin-e',
    'vitamin-p-bioflavonoids',
  ],

  // Amino Acids
  aminoAcids: [
    'cysteine-hci',
    'glycine',
    'lysine',
    'methionine',
  ],

  // Other Nutrients & Supplements
  nutrients: [
    'choline',
    'chondroitin-sulfate',
    'glucosamine-sulfate',
    'inositol',
    'lecithin',
    'melatonin',
    'omega-3',
    'omega-6',
    'omega-9',
    'paba',
    'phospholipids',
  ],

  // Cosmetic/Skin Care Ingredients
  cosmeticIngredients: [
    'argan-oil',
    'balm-mint-oil',
    'ceramides',
    'chitosan',
    'clove-oil',
    'eucalyptus-oil',
    'evening-primrose-oil',
    'glycerin',
    'jojoba-seed-oil',
    'lavender-oil',
    'linolenic-acid',
    'mineral-oil',
    'peppermint-oil',
    'petrolatum',
    'rosemary-oil',
    'sage-oil',
    'squalene',
    'tea-tree-oil',
    'thyme-oil',
  ],

  // Other compounds
  other: [
    'amber',
    'capigen',
    'cysteine-hci',
    'epicutin-tt',
    'factor-arl',
    'hydration-factor-cte4',
    'mpc',
  ],
}

/**
 * Entities that should remain as Western Herbal profiles
 * These are actual plants/herbs used in traditional Western herbalism
 */
const WESTERN_HERB_ENTITIES = [
  'aloe-vera',
  'bilberry',
  'bitter-orange',
  'blueberry',
  'borage-extract',
  'chamomile',
  'cranberry',
  'dandelion',
  'echinacea',
  'garcinia-cambogia-fruit',
  'garlic',
  'ginger',
  'ginkgo',
  'grape-seed',
  'green-tea',
  'hawthorn',
  'konjac-jelly',
  'milk-thistle',
  'mint',
  'royal-jelly',
  'saw-palmetto',
  'soy',
  'st-johns-wort',
  'turmeric',
  'valerian',
]

// Flatten all Modern Medicine entities
const ALL_MODERN_ENTITIES = Object.values(MODERN_MEDICINE_ENTITIES).flat()

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Get entity type category
 */
function getEntityCategory(slug) {
  for (const [category, entities] of Object.entries(MODERN_MEDICINE_ENTITIES)) {
    if (entities.includes(slug)) {
      return category
    }
  }
  return 'other'
}

/**
 * Convert Western profile to Modern Medicine profile
 */
function convertToModernMedicine(westernProfile, slug) {
  const category = getEntityCategory(slug)

  const modernProfile = {
    '@context': 'https://www.herbapedia.org/schema/context/modern-medicine.jsonld',
    '@id': `https://www.herbapedia.org/system/modern/profile/${slug}`,
    '@type': ['modern:SubstanceProfile'],
    'derivedFromSource': {
      '@id': `https://www.herbapedia.org/entity/botanical/species/${slug}`
    },
    'name': westernProfile.name || {},
  }

  // Copy relevant fields
  if (westernProfile.westernTraditionalUsage) {
    modernProfile.clinicalEvidence = westernProfile.westernTraditionalUsage
  }

  // Copy source info
  if (westernProfile.source) {
    modernProfile.source = westernProfile.source
  }
  if (westernProfile.sourceUrl) {
    modernProfile.sourceUrl = westernProfile.sourceUrl
  }

  // Add regulatory category based on entity type
  switch (category) {
    case 'minerals':
      modernProfile.regulatoryCategory = ['Dietary Supplement']
      modernProfile.fdaStatus = 'GRAS'
      break
    case 'vitamins':
      modernProfile.regulatoryCategory = ['Dietary Supplement']
      modernProfile.fdaStatus = 'GRAS'
      break
    case 'aminoAcids':
      modernProfile.regulatoryCategory = ['Dietary Supplement']
      modernProfile.fdaStatus = 'GRAS'
      break
    case 'nutrients':
      modernProfile.regulatoryCategory = ['Dietary Supplement']
      break
    case 'cosmeticIngredients':
      modernProfile.regulatoryCategory = ['Cosmetic Ingredient']
      break
    default:
      modernProfile.regulatoryCategory = ['Dietary Supplement']
  }

  return modernProfile
}

/**
 * Main migration function
 */
async function migrate(options = {}) {
  const { dryRun = false, deleteWestern = false } = options

  console.log('\n🔄 Western to Modern Medicine Migration\n')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will make changes)'}`)
  console.log(`Delete Western: ${deleteWestern ? 'Yes' : 'No'}\n`)

  const westernDir = join(ROOT_DIR, 'systems/western/herbs')
  const modernDir = join(ROOT_DIR, 'systems/modern/substances')

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const slug of ALL_MODERN_ENTITIES) {
    const westernPath = join(westernDir, slug, 'profile.jsonld')
    const modernPath = join(modernDir, slug, 'profile.jsonld')

    // Check if Western profile exists
    if (!existsSync(westernPath)) {
      console.log(`⏭️  Skipping ${slug}: No Western profile found`)
      skipped++
      continue
    }

    // Check if Modern profile already exists
    if (existsSync(modernPath)) {
      console.log(`⏭️  Skipping ${slug}: Modern profile already exists`)
      skipped++
      continue
    }

    try {
      // Read Western profile
      const westernContent = readFileSync(westernPath, 'utf-8')
      const westernProfile = JSON.parse(westernContent)

      // Convert to Modern Medicine profile
      const modernProfile = convertToModernMedicine(westernProfile, slug)

      if (dryRun) {
        console.log(`📝 Would migrate: ${slug}`)
        console.log(`   Category: ${getEntityCategory(slug)}`)
        console.log(`   From: ${westernPath}`)
        console.log(`   To: ${modernPath}`)
      } else {
        // Create directory if needed
        const modernSlugDir = join(modernDir, slug)
        if (!existsSync(modernSlugDir)) {
          mkdirSync(modernSlugDir, { recursive: true })
        }

        // Write Modern Medicine profile
        writeFileSync(modernPath, JSON.stringify(modernProfile, null, 2))
        console.log(`✅ Migrated: ${slug}`)

        // Delete Western profile if requested
        if (deleteWestern) {
          rmSync(join(westernDir, slug), { recursive: true, force: true })
          console.log(`   Deleted Western profile`)
        }

        migrated++
      }
    } catch (error) {
      console.log(`❌ Error migrating ${slug}: ${error.message}`)
      errors++
    }
  }

  console.log('\n📊 Migration Summary\n')
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Total entities to migrate: ${ALL_MODERN_ENTITIES.length}`)

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to perform actual migration')
  }

  return { migrated, skipped, errors }
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const deleteWestern = args.includes('--delete-western')

migrate({ dryRun, deleteWestern }).catch(console.error)

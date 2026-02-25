#!/usr/bin/env node

/**
 * Delete Western profiles for entities that have been migrated to Modern Medicine
 *
 * Usage:
 *   node scripts/delete-migrated-western-profiles.js [--dry-run]
 */

import { existsSync, rmSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// All entities that should be in Modern Medicine, NOT Western Herbalism
const MODERN_MEDICINE_ENTITIES = [
  // Minerals
  'calcium', 'copper', 'iodine', 'iron', 'magnesium', 'manganese', 'potassium', 'selenium', 'zinc',
  // Vitamins
  'vitamin-a', 'vitamin-b1', 'vitamin-b2', 'vitamin-b3-niacin', 'vitamin-b5', 'vitamin-b6',
  'vitamin-b7-biotin', 'vitamin-b9-folate-folic-acid', 'vitamin-b12', 'vitamin-c',
  'vitamin-d-calciferol-cholecalciferol-ergocalciferol', 'vitamin-e', 'vitamin-p-bioflavonoids',
  // Amino Acids
  'cysteine-hci', 'glycine', 'lysine', 'methionine',
  // Nutrients
  'choline', 'chondroitin-sulfate', 'glucosamine-sulfate', 'inositol', 'lecithin', 'melatonin',
  'omega-3', 'omega-6', 'omega-9', 'paba', 'phospholipids',
  // Cosmetic Ingredients
  'argan-oil', 'balm-mint-oil', 'ceramides', 'chitosan', 'clove-oil', 'eucalyptus-oil',
  'evening-primrose-oil', 'glycerin', 'jojoba-seed-oil', 'lavender-oil', 'linolenic-acid',
  'mineral-oil', 'peppermint-oil', 'petrolatum', 'rosemary-oil', 'sage-oil', 'squalene',
  'tea-tree-oil', 'thyme-oil',
  // Other
  'amber', 'capigen', 'epicutin-tt', 'factor-arl', 'hydration-factor-cte4', 'mpc',
]

async function cleanup(dryRun = false) {
  console.log('\n🧹 Cleaning up migrated Western profiles\n')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will delete)'}\n`)

  const westernDir = join(ROOT_DIR, 'systems/western/herbs')
  const modernDir = join(ROOT_DIR, 'systems/modern/substances')

  let deleted = 0
  let skipped = 0
  let notFound = 0

  for (const slug of MODERN_MEDICINE_ENTITIES) {
    const westernPath = join(westernDir, slug)
    const modernPath = join(modernDir, slug, 'profile.jsonld')

    // Check if Western profile exists
    if (!existsSync(westernPath)) {
      notFound++
      continue
    }

    // Check if Modern profile exists (safety check)
    if (!existsSync(modernPath)) {
      console.log(`⚠️  Skipping ${slug}: No Modern profile found (keeping Western)`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`🗑️  Would delete: ${slug}`)
    } else {
      rmSync(westernPath, { recursive: true, force: true })
      console.log(`✅ Deleted: ${slug}`)
      deleted++
    }
  }

  console.log('\n📊 Cleanup Summary\n')
  console.log(`   Deleted: ${deleted}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Not found: ${notFound}`)
  console.log(`   Total: ${MODERN_MEDICINE_ENTITIES.length}`)

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to perform actual deletion')
  }

  return { deleted, skipped, notFound }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

cleanup(dryRun).catch(console.error)

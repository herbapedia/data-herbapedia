#!/usr/bin/env node
/**
 * Script to add chemical compound references to plant entities
 *
 * This script adds containsChemical references to plant entities based on
 * known active compounds for common medicinal herbs.
 */

import fs from 'fs';
import path from 'path';

// Map of herb slugs to their active compounds
const COMPOUND_MAP = {
  // Ginseng family
  'ginseng': ['chemical/ginsenosides', 'chemical/polysaccharides', 'chemical/saponins'],
  'american-ginseng': ['chemical/ginsenosides', 'chemical/polysaccharides'],

  // Anti-inflammatory herbs
  'turmeric': ['chemical/curcumin', 'chemical/flavonoids'],
  'ginger': ['chemical/gingerol', 'chemical/essential-oils'],

  // Antioxidant-rich herbs
  'green-tea': ['chemical/catechins', 'chemical/flavonoids', 'chemical/tannins'],
  'grape-seed': ['chemical/anthocyanins', 'chemical/flavonoids'],
  'bilberry': ['chemical/anthocyanins', 'chemical/flavonoids'],
  'blueberry': ['chemical/anthocyanins', 'chemical/flavonoids'],

  // Liver support
  'milk-thistle': ['chemical/silymarin', 'chemical/flavonoids'],

  // Nervine/calmative
  'valerian': ['chemical/alkaloids', 'chemical/essential-oils'],
  'chamomile': ['chemical/essential-oils', 'chemical/flavonoids'],
  'st-johns-wort': ['chemical/flavonoids', 'chemical/tannins'],

  // Cardiovascular
  'hawthorn': ['chemical/flavonoids', 'chemical/tannins'],
  'ginkgo': ['chemical/flavonoids', 'chemical/terpenes'],

  // Immune support
  'echinacea': ['chemical/alkaloids', 'chemical/polysaccharides'],
  'garlic': ['chemical/essential-oils', 'chemical/flavonoids'],

  // Other common herbs
  'dandelion': ['chemical/flavonoids', 'chemical/tannins'],
  'saw-palmetto': ['chemical/flavonoids', 'chemical/essential-oils'],

  // TCM herbs with known compounds
  'lingzhi-reishi': ['chemical/polysaccharides', 'chemical/terpenes'],
  'cordyceps': ['chemical/polysaccharides', 'chemical/nucleosides'],
  'goji': ['chemical/polysaccharides', 'chemical/flavonoids'],
  'huangqi': ['chemical/saponins', 'chemical/flavonoids'],
  'dangshen': ['chemical/polysaccharides', 'chemical/saponins'],
  'licorice-root': ['chemical/saponins', 'chemical/flavonoids'],
};

// Additional compounds to add to the reference data
const ADDITIONAL_COMPOUNDS = [
  {
    "@id": "chemical/nucleosides",
    "@type": "herbapedia:ChemicalCompound",
    "prefLabel": {
      "en": "Nucleosides",
      "zh-Hant": "核苷",
      "zh-Hans": "核苷"
    },
    "description": {
      "en": "Building blocks of DNA and RNA with various biological activities",
      "zh-Hant": "DNA和RNA的構建塊，具有多種生物活性",
      "zh-Hans": "DNA和RNA的构建块，具有多种生物活性"
    }
  }
];

async function main() {
  const plantsDir = './entities/plants';
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [slug, compounds] of Object.entries(COMPOUND_MAP)) {
    const entityPath = path.join(plantsDir, slug, 'entity.jsonld');

    if (!fs.existsSync(entityPath)) {
      console.log(`⚠️  ${slug}: entity not found`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(entityPath, 'utf8'));

      // Check if already has compound references
      if (content.containsChemical && content.containsChemical.length > 0) {
        console.log(`⏭️  ${slug}: already has compound references`);
        skippedCount++;
        continue;
      }

      // Add compound references
      content.containsChemical = compounds.map(c => ({ "@id": c }));

      // Update modified timestamp
      content.modified = new Date().toISOString();

      // Write back
      fs.writeFileSync(entityPath, JSON.stringify(content, null, 2) + '\n');
      console.log(`✅ ${slug}: added ${compounds.length} compound references`);
      updatedCount++;
    } catch (err) {
      console.error(`❌ ${slug}: error - ${err.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount} entities`);
  console.log(`Skipped: ${skippedCount} entities`);
}

main().catch(console.error);

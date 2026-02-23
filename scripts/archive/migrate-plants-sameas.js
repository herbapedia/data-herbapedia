#!/usr/bin/env node
/**
 * Migrate sameAs in entities/plants/ from string arrays to @id objects.
 *
 * Before: "sameAs": ["http://www.wikidata.org/entity/Q192163"]
 * After:  "sameAs": [{"@id": "http://www.wikidata.org/entity/Q192163"}]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

function migrateFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;

  if (content.sameAs && Array.isArray(content.sameAs)) {
    const newSameAs = [];
    for (const item of content.sameAs) {
      if (typeof item === 'string') {
        // Convert to @id object
        newSameAs.push({ '@id': item });
        modified = true;
      } else if (item['@id']) {
        newSameAs.push(item);
      }
    }
    if (modified) {
      content.sameAs = newSameAs;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }

  return modified;
}

// Process entities/plants directory
const plantsDir = path.join(DATA_DIR, 'entities', 'plants');
let updated = 0;
let skipped = 0;

if (fs.existsSync(plantsDir)) {
  const slugs = fs.readdirSync(plantsDir).filter(f => {
    return fs.statSync(path.join(plantsDir, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(plantsDir, slug, 'entity.jsonld');
    if (!fs.existsSync(filePath)) continue;

    if (migrateFile(filePath)) {
      updated++;
      console.log(`Updated: plants/${slug}`);
    } else {
      skipped++;
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);

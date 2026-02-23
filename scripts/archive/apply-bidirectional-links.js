#!/usr/bin/env node
/**
 * Apply bidirectional profile links to species entities.
 * Reads species-profile-additions.json and adds hasTCMProfile/hasWesternProfile properties.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

const additionsPath = path.join(DATA_DIR, 'scripts', 'species-profile-additions.json');
const speciesDir = path.join(DATA_DIR, 'entities', 'botanical', 'species');

// Read additions
const additions = JSON.parse(fs.readFileSync(additionsPath, 'utf8'));

let updated = 0;
let skipped = 0;
let errors = 0;

for (const addition of additions) {
  const speciesPath = path.join(speciesDir, addition.species, 'entity.jsonld');

  if (!fs.existsSync(speciesPath)) {
    console.log(`Species not found: ${addition.species}`);
    skipped++;
    continue;
  }

  try {
    const content = JSON.parse(fs.readFileSync(speciesPath, 'utf8'));

    // Add properties
    let modified = false;
    for (const [key, value] of Object.entries(addition.properties)) {
      if (!content[key]) {
        content[key] = value;
        modified = true;
      }
    }

    if (modified) {
      // Preserve formatting by using 2-space indent
      fs.writeFileSync(speciesPath, JSON.stringify(content, null, 2) + '\n');
      updated++;
      console.log(`Updated: ${addition.species}`);
    } else {
      skipped++;
    }
  } catch (e) {
    console.error(`Error processing ${addition.species}: ${e.message}`);
    errors++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}`);

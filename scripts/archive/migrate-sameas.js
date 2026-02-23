#!/usr/bin/env node
/**
 * Migrate sameAs from plain strings to @id objects.
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

// Process all directories
const dirs = [
  'systems/tcm/herbs',
  'systems/western/herbs',
  'systems/ayurveda/dravyas',
  'systems/persian/drugs',
  'systems/mongolian/herbs',
  'entities/botanical/species',
  'entities/preparations'
];

let updated = 0;
let total = 0;

for (const dir of dirs) {
  const dirPath = path.join(DATA_DIR, dir);
  if (!fs.existsSync(dirPath)) continue;

  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const profilePath = path.join(dirPath, entry, entry.endsWith('.jsonld') ? '' : 'profile.jsonld');
    const entityPath = path.join(dirPath, entry, entry.endsWith('.jsonld') ? '' : 'entity.jsonld');

    let filePath = null;
    if (fs.existsSync(profilePath)) filePath = profilePath;
    else if (fs.existsSync(entityPath)) filePath = entityPath;

    if (!filePath || !fs.existsSync(filePath)) continue;
    if (!fs.statSync(filePath).isFile()) continue;

    total++;
    if (migrateFile(filePath)) {
      updated++;
      console.log(`Updated: ${dir}/${entry}`);
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated}/${total} files`);

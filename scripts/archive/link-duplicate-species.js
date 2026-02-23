#!/usr/bin/env node
/**
 * Link duplicate species with sameAs references.
 *
 * When two species entries exist for the same scientific name,
 * they should reference each other via sameAs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

const SPECIES_DIR = path.join(DATA_DIR, 'entities', 'botanical', 'species');
const BASE_IRI = 'https://www.herbapedia.org/entity/botanical/species/';

// Duplicate pairs that should be linked
const DUPLICATE_PAIRS = [
  { primary: 'panax-ginseng', secondary: 'ginseng', reason: 'Same species, different naming' },
  { primary: 'zingiber-officinale', secondary: 'ginger', reason: 'Scientific name vs common name' },
  { primary: 'lingzhi-reishi', secondary: 'lingzhi-spores', reason: 'Fruiting body vs spores (different parts)' },
];

function addSameAsReference(primary, secondary) {
  const primaryPath = path.join(SPECIES_DIR, primary, 'entity.jsonld');
  const secondaryPath = path.join(SPECIES_DIR, secondary, 'entity.jsonld');

  if (!fs.existsSync(primaryPath) || !fs.existsSync(secondaryPath)) {
    console.log(`Skipping ${primary}/${secondary} - files not found`);
    return false;
  }

  // Add reference from secondary to primary
  const secondaryContent = JSON.parse(fs.readFileSync(secondaryPath, 'utf8'));

  if (!secondaryContent.sameAs) {
    secondaryContent.sameAs = [];
  }

  // Check if already linked
  const primaryIRI = { '@id': BASE_IRI + primary };
  const alreadyLinked = secondaryContent.sameAs.some(ref =>
    (typeof ref === 'object' && ref['@id'] === primaryIRI['@id']) ||
    (typeof ref === 'string' && ref === primaryIRI['@id'])
  );

  if (!alreadyLinked) {
    secondaryContent.sameAs.push(primaryIRI);
    fs.writeFileSync(secondaryPath, JSON.stringify(secondaryContent, null, 2) + '\n');
    console.log(`Linked ${secondary} → ${primary}`);
    return true;
  }

  console.log(`Already linked: ${secondary} → ${primary}`);
  return false;
}

let updated = 0;

for (const pair of DUPLICATE_PAIRS) {
  if (addSameAsReference(pair.primary, pair.secondary)) {
    updated++;
  }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated}`);

#!/usr/bin/env node
/**
 * Migrate form and preparationMethod from string values to @id references.
 *
 * Before: "form": "powder"
 * After:  "form": { "@id": "https://www.herbapedia.org/vocab/herbal/form/powder" }
 *
 * Before: "preparationMethod": "dried"
 * After:  "preparationMethod": { "@id": "https://www.herbapedia.org/vocab/herbal/method/dried" }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

const FORM_BASE = 'https://www.herbapedia.org/vocab/herbal/form/';
const METHOD_BASE = 'https://www.herbapedia.org/vocab/herbal/method/';

// Valid form values (from forms.jsonld)
const VALID_FORMS = [
  'whole', 'sliced', 'crushed', 'powder', 'granule', 'capsule', 'tablet',
  'liquid', 'oil', 'extract', 'tincture', 'tea', 'paste'
];

// Valid method values (from methods.jsonld)
const VALID_METHODS = [
  'fresh', 'dried', 'steamed', 'steamed-and-dried', 'roasted', 'fried',
  'stir-fried', 'carbonized', 'fermented', 'pickled', 'extracted', 'powdered',
  'ground', 'decocted', 'infused', 'tinctured', 'distilled', 'cold-pressed',
  'steam-distilled', 'freeze-dried', 'spray-dried', 'concentrated', 'standardized'
];

// Map alternate names to canonical names
const FORM_ALIASES = {
  'essential-oil': 'oil',
  'essential oil': 'oil',
  'herbal-tea': 'tea'
};

const METHOD_ALIASES = {};

function normalizeForm(value) {
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-');
  return FORM_ALIASES[normalized] || normalized;
}

function normalizeMethod(value) {
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-');
  return METHOD_ALIASES[normalized] || normalized;
}

function migrateFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;
  const changes = [];

  // Migrate form
  if (content.form && typeof content.form === 'string') {
    const normalized = normalizeForm(content.form);
    if (VALID_FORMS.includes(normalized)) {
      content.form = { '@id': `${FORM_BASE}${normalized}` };
      modified = true;
      changes.push(`form: "${content.form}" → @id`);
    } else {
      console.warn(`  Unknown form value: ${content.form} in ${filePath}`);
    }
  }

  // Migrate preparationMethod
  if (content.preparationMethod && typeof content.preparationMethod === 'string') {
    const normalized = normalizeMethod(content.preparationMethod);
    if (VALID_METHODS.includes(normalized)) {
      content.preparationMethod = { '@id': `${METHOD_BASE}${normalized}` };
      modified = true;
      changes.push(`preparationMethod: "${content.preparationMethod}" → @id`);
    } else {
      console.warn(`  Unknown method value: ${content.preparationMethod} in ${filePath}`);
    }
  }

  // Also handle processingMethod in TCM profiles
  if (content.processingMethod && typeof content.processingMethod === 'string') {
    const normalized = normalizeMethod(content.processingMethod);
    if (VALID_METHODS.includes(normalized)) {
      content.processingMethod = { '@id': `${METHOD_BASE}${normalized}` };
      modified = true;
      changes.push(`processingMethod: "${content.processingMethod}" → @id`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }

  return { modified, changes };
}

// Process preparations
const prepDir = path.join(DATA_DIR, 'entities', 'preparations');
let updatedPreps = 0;
let totalPreps = 0;

if (fs.existsSync(prepDir)) {
  const slugs = fs.readdirSync(prepDir).filter(f => {
    return fs.statSync(path.join(prepDir, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(prepDir, slug, 'entity.jsonld');
    if (!fs.existsSync(filePath)) continue;

    totalPreps++;
    const { modified, changes } = migrateFile(filePath);
    if (modified) {
      updatedPreps++;
      console.log(`Updated: ${slug}`);
      changes.forEach(c => console.log(`  - ${c}`));
    }
  }
}

// Process TCM profiles
const tcmDir = path.join(DATA_DIR, 'systems', 'tcm', 'herbs');
let updatedTCM = 0;
let totalTCM = 0;

if (fs.existsSync(tcmDir)) {
  const slugs = fs.readdirSync(tcmDir).filter(f => {
    return fs.statSync(path.join(tcmDir, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(tcmDir, slug, 'profile.jsonld');
    if (!fs.existsSync(filePath)) continue;

    totalTCM++;
    const { modified, changes } = migrateFile(filePath);
    if (modified) {
      updatedTCM++;
      console.log(`Updated TCM: ${slug}`);
      changes.forEach(c => console.log(`  - ${c}`));
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Preparations: ${updatedPreps}/${totalPreps} updated`);
console.log(`TCM profiles: ${updatedTCM}/${totalTCM} updated`);

#!/usr/bin/env node
/**
 * Migrate TCM actions from string arrays to @id references.
 *
 * Before: "actions": ["Tonify Yuan Qi", "Tonify Spleen Qi"]
 * After:  "actions": [{"@id": "https://www.herbapedia.org/system/tcm/action/tonify-yuan-qi"}]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

const ACTION_BASE = 'https://www.herbapedia.org/system/tcm/action/';

// Map action names to IRI slugs
const ACTION_MAP = {
  'Tonify Yuan Qi': 'tonify-yuan-qi',
  'Tonify Spleen Qi': 'tonify-spleen-qi',
  'Tonify Lung Qi': 'tonify-lung-qi',
  'Generate Body Fluids': 'generate-body-fluids',
  'Calm the Spirit (Shen)': 'calm-the-spirit',
  'Release exterior': 'release-exterior',
  'Release Exterior': 'release-exterior',
  'Warm middle burner': 'warm-middle-burner',
  'Stop vomiting': 'stop-vomiting',
  'Resolve phlegm': 'resolve-phlegm',
  'Detoxify': 'detoxify',
  'Tonify Qi': 'tonify-qi',
  'Tonify Blood': 'tonify-blood',
  'Tonify Yin': 'tonify-yin',
  'Tonify Yang': 'tonify-yang',
  'Promote Blood Circulation': 'promote-blood-circulation',
  'Clear Heat': 'clear-heat',
  'Dispel Wind': 'dispel-wind',
  'Dispel Dampness': 'dispel-dampness',
  'Promote Urination': 'promote-urination',
  'Stop Pain': 'stop-pain',
  'Stop Bleeding': 'stop-bleeding',
  'Regulate Qi': 'regulate-qi',
  'Warm Interior': 'warm-interior'
};

function slugify(action) {
  return ACTION_MAP[action] || action.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function migrateFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;

  // Migrate actions
  if (content.actions && Array.isArray(content.actions)) {
    const newActions = [];
    for (const action of content.actions) {
      if (typeof action === 'string') {
        const slug = slugify(action);
        newActions.push({ '@id': `${ACTION_BASE}${slug}` });
        modified = true;
      } else if (action['@id']) {
        newActions.push(action);
      }
    }
    if (modified) {
      content.actions = newActions;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }

  return modified;
}

// Process TCM profiles
const tcmDir = path.join(DATA_DIR, 'systems', 'tcm', 'herbs');
let updated = 0;
let total = 0;
const unknownActions = new Set();

const slugs = fs.readdirSync(tcmDir).filter(f => {
  return fs.statSync(path.join(tcmDir, f)).isDirectory();
});

for (const slug of slugs) {
  const filePath = path.join(tcmDir, slug, 'profile.jsonld');
  if (!fs.existsSync(filePath)) continue;

  total++;
  if (migrateFile(filePath)) {
    updated++;
    console.log(`Updated: ${slug}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated}/${total}`);

if (unknownActions.size > 0) {
  console.log('\nUnknown actions:');
  unknownActions.forEach(a => console.log(`  - ${a}`));
}

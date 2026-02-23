#!/usr/bin/env node
/**
 * Generate bidirectional links between species and their system profiles.
 *
 * This script:
 * 1. Reads all TCM profiles and maps derivedFromPlant → profile
 * 2. Reads all Western profiles and maps derivedFromPlant → profile
 * 3. Outputs the mappings that should be added to species entities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

// Parse IRI to extract species slug
function parseSpeciesIRI(iri) {
  // Handle patterns like:
  // https://www.herbapedia.org/entity/botanical/species/ginseng
  // https://www.herbapedia.org/entity/botanical/species/panax-ginseng#root
  const match = iri.match(/botanical\/species\/([^#\/]+)/);
  return match ? match[1] : null;
}

// Read all profiles in a directory
function readProfiles(dir, systemType) {
  const profiles = [];
  const profileDir = path.join(DATA_DIR, 'systems', systemType, systemType === 'tcm' ? 'herbs' : 'herbs');

  if (!fs.existsSync(profileDir)) {
    console.log(`Directory not found: ${profileDir}`);
    return profiles;
  }

  const slugs = fs.readdirSync(profileDir).filter(f => {
    return fs.statSync(path.join(profileDir, f)).isDirectory();
  });

  for (const slug of slugs) {
    const profilePath = path.join(profileDir, slug, 'profile.jsonld');
    if (!fs.existsSync(profilePath)) continue;

    try {
      const content = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

      // Get derivedFromPlant
      const derivedFrom = content.derivedFromPlant;
      if (!derivedFrom) continue;

      let speciesSlug;
      if (typeof derivedFrom === 'object' && derivedFrom['@id']) {
        speciesSlug = parseSpeciesIRI(derivedFrom['@id']);
      } else if (typeof derivedFrom === 'string') {
        speciesSlug = parseSpeciesIRI(derivedFrom);
      }

      if (speciesSlug) {
        profiles.push({
          profileSlug: slug,
          profileIRI: content['@id'],
          speciesSlug,
          systemType
        });
      }
    } catch (e) {
      console.error(`Error reading ${profilePath}: ${e.message}`);
    }
  }

  return profiles;
}

// Main
console.log('Scanning TCM profiles...');
const tcmProfiles = readProfiles(null, 'tcm');
console.log(`Found ${tcmProfiles.length} TCM profiles with species links`);

console.log('Scanning Western profiles...');
const westernProfiles = readProfiles(null, 'western');
console.log(`Found ${westernProfiles.length} Western profiles with species links`);

// Build species → profiles mapping
const speciesMap = new Map();

for (const p of tcmProfiles) {
  if (!speciesMap.has(p.speciesSlug)) {
    speciesMap.set(p.speciesSlug, { tcm: [], western: [] });
  }
  speciesMap.get(p.speciesSlug).tcm.push(p);
}

for (const p of westernProfiles) {
  if (!speciesMap.has(p.speciesSlug)) {
    speciesMap.set(p.speciesSlug, { tcm: [], western: [] });
  }
  speciesMap.get(p.speciesSlug).western.push(p);
}

// Output the mapping
console.log('\n=== Species with profiles ===\n');

const speciesWithProfiles = [];
for (const [species, profiles] of speciesMap.entries()) {
  if (profiles.tcm.length > 0 || profiles.western.length > 0) {
    speciesWithProfiles.push({
      species,
      tcmCount: profiles.tcm.length,
      westernCount: profiles.western.length,
      profiles
    });
  }
}

// Sort by species name
speciesWithProfiles.sort((a, b) => a.species.localeCompare(b.species));

console.log(`Total species with profiles: ${speciesWithProfiles.length}`);

// Output JSON for processing
const outputPath = path.join(DATA_DIR, 'scripts', 'species-profile-links.json');
fs.writeFileSync(outputPath, JSON.stringify(speciesWithProfiles, null, 2));
console.log(`\nMapping written to: ${outputPath}`);

// Output sample
console.log('\n=== Sample mapping (first 10) ===\n');
for (const item of speciesWithProfiles.slice(0, 10)) {
  console.log(`${item.species}:`);
  if (item.profiles.tcm.length > 0) {
    console.log(`  TCM: ${item.profiles.tcm.map(p => p.profileSlug).join(', ')}`);
  }
  if (item.profiles.western.length > 0) {
    console.log(`  Western: ${item.profiles.western.map(p => p.profileSlug).join(', ')}`);
  }
}

// Generate property additions
console.log('\n=== Properties to add to species entities ===\n');

const additions = [];
for (const item of speciesWithProfiles) {
  const props = {};
  if (item.profiles.tcm.length > 0) {
    props.hasTCMProfile = item.profiles.tcm.map(p => ({ '@id': p.profileIRI }));
  }
  if (item.profiles.western.length > 0) {
    props.hasWesternProfile = item.profiles.western.map(p => ({ '@id': p.profileIRI }));
  }
  additions.push({ species: item.species, properties: props });
}

const additionsPath = path.join(DATA_DIR, 'scripts', 'species-profile-additions.json');
fs.writeFileSync(additionsPath, JSON.stringify(additions, null, 2));
console.log(`Additions written to: ${additionsPath}`);

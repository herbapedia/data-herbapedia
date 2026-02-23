#!/usr/bin/env node
/**
 * Add missing Wikidata IDs and GBIF IDs to botanical species.
 *
 * This script uses a curated mapping of species to their external identifiers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

// Curated mapping of scientific names to Wikidata Q numbers and GBIF IDs
const EXTERNAL_IDS = {
  // Plants
  'Andrographis paniculata': { wikidataID: 'Q4714494', gbifID: '7260904' },
  'Zea mays': { wikidataID: 'Q11575', gbifID: '5290052' },
  'Vaccinium macrocarpon': { wikidataID: 'Q1076726', gbifID: '2882625' },
  'Angelica pubescens': { wikidataID: 'Q4713067', gbifID: '5537546' },
  'Evodia rutaecarpa': { wikidataID: 'Q15343078', gbifID: '5536526' },
  'Saposhnikovia divaricata': { wikidataID: 'Q7420131', gbifID: '5537187' },
  'Stephania tetrandra': { wikidataID: 'Q15409888', gbifID: '5532985' },
  'Reynoutria multiflora': { wikidataID: 'Q15389391', gbifID: '4038333' },
  'Lycium barbarum': { wikidataID: 'Q174207', gbifID: '2928743' },
  'Vitis vinifera': { wikidataID: 'Q10978', gbifID: '5290210' },
  'Arctium lappa': { wikidataID: 'Q160416', gbifID: '5398373' },
  'Albizia julibrissin': { wikidataID: 'Q159717', gbifID: '2952634' },
  'Morinda officinalis': { wikidataID: 'Q15389403', gbifID: '5535031' },
  'Isatis tinctoria': { wikidataID: 'Q161414', gbifID: '5374118' },
  'Gynostemma pentaphyllum': { wikidataID: 'Q15411558', gbifID: '5394540' },
  'Rosa laevigata': { wikidataID: 'Q15411498', gbifID: '3007266' },
  'Amorphophallus konjac': { wikidataID: 'Q26991', gbifID: '2870801' },
  'Sophora flavescens': { wikidataID: 'Q15359745', gbifID: '2958840' },
  'Forsythia suspensa': { wikidataID: 'Q143671', gbifID: '3686447' },
  'Nelumbo nucifera': { wikidataID: 'Q175025', gbifID: '2882573' },
  'Ophiopogon japonicus': { wikidataID: 'Q15412756', gbifID: '2753592' },
  'Mentha haplocalyx': { wikidataID: 'Q15337615', gbifID: '5341393' },
  'Eclipta prostrata': { wikidataID: 'Q426958', gbifID: '5385945' },
  'Achyranthes bidentata': { wikidataID: 'Q4673530', gbifID: '5556748' },
  'Ligustrum lucidum': { wikidataID: 'Q160494', gbifID: '5415402' },
  'Orobanche coerulescens': { wikidataID: 'Q15399196', gbifID: '5537561' },
  'Pogostemon cablin': { wikidataID: 'Q156895', gbifID: '5406689' },
  'Eupatorium fortunei': { wikidataID: 'Q15391166', gbifID: '5400096' },
  'Cistanche deserticola': { wikidataID: 'Q15336416', gbifID: '5535044' },
  'Bistorta officinalis': { wikidataID: 'Q15411656', gbifID: '5654125' },

  // Additional Western herbs
  'Argania spinosa': { wikidataID: 'Q110027', gbifID: '5421384' },
  'Melissa officinalis': { wikidataID: 'Q160092', gbifID: '5341390' },
  'Syzygium aromaticum': { wikidataID: 'Q160269', gbifID: '5398519' },
  'Eucalyptus globulus': { wikidataID: 'Q156895', gbifID: '3180210' },
  'Oenothera biennis': { wikidataID: 'Q161425', gbifID: '3189068' },
  'Simmondsia chinensis': { wikidataID: 'Q211821', gbifID: '3032499' },
  'Lavandula angustifolia': { wikidataID: 'Q159587', gbifID: '2924966' },
  'Mentha x piperita': { wikidataID: 'Q158318', gbifID: '5341390' },
  'Salvia rosmarinus': { wikidataID: 'Q160352', gbifID: '2928786' },
  'Salvia officinalis': { wikidataID: 'Q131064', gbifID: '2928782' },
  'Serenoa repens': { wikidataID: 'Q155854', gbifID: '5309575' },
  'Melaleuca alternifolia': { wikidataID: 'Q26998', gbifID: '5416009' },
  'Thymus vulgaris': { wikidataID: 'Q161329', gbifID: '5342116' },
  'Schisandra chinensis': { wikidataID: 'Q155983', gbifID: '5331198' },
  'Magnolia denudata': { wikidataID: 'Q156809', gbifID: '2886437' },
  'Polygala tenuifolia': { wikidataID: 'Q15411639', gbifID: '5331153' },
  'Trametes versicolor': { wikidataID: 'Q258786', gbifID: '5259362' },
  'Alisma plantago-aquatica': { wikidataID: 'Q157149', gbifID: '5329052' },
  'Citrus aurantium': { wikidataID: 'Q147096', gbifID: '8077391' },
  'Dictyophora indusiata': { wikidataID: 'Q15411731', gbifID: '2524872' },
  'Perilla frutescens': { wikidataID: 'Q161391', gbifID: '2925991' },
  'Cervus nippon': { wikidataID: 'Q93040', gbifID: '2440964' },
};

const SPECIES_DIR = path.join(DATA_DIR, 'entities', 'botanical', 'species');

function addExternalIds() {
  let updated = 0;
  let skipped = 0;

  const slugs = fs.readdirSync(SPECIES_DIR).filter(f => {
    return fs.statSync(path.join(SPECIES_DIR, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(SPECIES_DIR, slug, 'entity.jsonld');
    if (!fs.existsSync(filePath)) continue;

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const scientificName = content.scientificName;

    if (!scientificName) continue;

    const ids = EXTERNAL_IDS[scientificName];
    if (!ids) continue;

    let modified = false;

    // Add wikidataID if missing
    if (ids.wikidataID && !content.wikidataID) {
      content.wikidataID = ids.wikidataID;
      modified = true;
      console.log(`Added wikidataID ${ids.wikidataID} to ${slug}`);
    }

    // Add gbifID if missing
    if (ids.gbifID && !content.gbifID) {
      content.gbifID = ids.gbifID;
      modified = true;
      console.log(`Added gbifID ${ids.gbifID} to ${slug}`);
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

addExternalIds();

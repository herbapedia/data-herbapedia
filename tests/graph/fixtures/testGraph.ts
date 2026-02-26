/**
 * Test Fixtures for Knowledge Graph Tests
 *
 * These fixtures provide sample data for unit and integration tests.
 */

import type { GraphNode } from '../../src/graph/types.js'

// Sample Species Node
export const sampleSpeciesNode: GraphNode = {
  '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
  '@id': 'https://www.herbapedia.org/graph/species/panax-ginseng',
  '@type': ['https://schema.org/Plant', 'https://www.herbapedia.org/ontology/MedicinalPlant'],
  'slug': 'panax-ginseng',
  'scientificName': 'Panax ginseng C.A. Meyer',
  'name': {
    'en': 'Ginseng',
    'zh-Hant': '人蔘',
    'zh-Hans': '人蔘',
    'ko': '인삼',
  },
  'description': {
    'en': 'A perennial plant native to Eastern Asia, known for its medicinal root.',
    'zh-Hant': '原產於東亞的多年生草本植物，以其藥用根部聞名。',
  },
  'family': 'Araliaceae',
  'genus': 'Panax',
  'containsChemical': [
    { '@id': 'https://www.herbapedia.org/graph/chemical/ginsenosides' },
    { '@id': 'https://www.herbapedia.org/graph/chemical/ginseng-polysaccharides' },
  ],
  'sameAs': [
    { '@id': 'http://www.wikidata.org/entity/Q192163' },
  ],
}

// Sample TCM Profile Node
// Note: For testing, derivedFrom references the species directly
// In production, it would reference a part like 'panax-ginseng#root'
export const sampleTcmProfileNode: GraphNode = {
  '@context': 'https://www.herbapedia.org/schema/context/tcm.jsonld',
  '@id': 'https://www.herbapedia.org/graph/profile/tcm/ren-shen',
  '@type': ['https://www.herbapedia.org/ontology/TcmHerb'],
  'slug': 'ren-shen',
  'derivedFrom': { '@id': 'https://www.herbapedia.org/graph/species/panax-ginseng' },
  'name': {
    'en': 'Ginseng Root',
    'zh-Hant': '人蔘',
    'pinyin': 'Rén Shēn',
  },
  'pinyin': 'Rén Shēn',
  'hasCategory': { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/category/tonify-qi' },
  'hasNature': { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/nature/warm' },
  'hasFlavor': [
    { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet' },
    { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/flavor/bitter' },
  ],
  'entersMeridian': [
    { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/meridian/spleen' },
    { '@id': 'https://www.herbapedia.org/graph/vocab/tcm/meridian/lung' },
  ],
  'tcmFunctions': {
    'en': 'Tonifies Qi, strengthens the Spleen, benefits the Lung',
    'zh-Hant': '大補元氣， 健脾益肺',
  },
  'tcmTraditionalUsage': {
    'en': 'Used for Qi deficiency, fatigue, shortness of breath, loss of appetite.',
    'zh-Hant': '用於氣虛欲脫， 脾虛食少， 倦怠乏力， 食欲不振。',
  },
}

// Sample TCM Flavor Vocabulary Node
export const sampleTcmFlavorNode: GraphNode = {
  '@context': 'https://www.herbapedia.org/schema/context/tcm.jsonld',
  '@id': 'https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet',
  '@type': ['https://www.herbapedia.org/ontology/TcmFlavor'],
  'slug': 'sweet',
  'value': 'sweet',
  'prefLabel': {
    'en': 'Sweet',
    'zh-Hant': '甘',
    'zh-Hans': '甘',
  },
  'description': {
    'en': 'Sweet flavor in Traditional Chinese Medicine, associated with tonifying and harmonizing properties.',
    'zh-Hant': '中醫五味之一， 具有補益、和中作用。',
  },
}

// Minimal test graph for multiple nodes for testing
export const minimalTestGraph: GraphNode[] = [
  sampleSpeciesNode,
  sampleTcmProfileNode,
  sampleTcmFlavorNode,
]

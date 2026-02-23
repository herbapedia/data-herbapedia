# Herbapedia Data Repository

> The authoritative JSON-LD knowledge base for medicinal botany across all traditional medicine systems

## Current Status

| Metric | Count |
|--------|-------|
| JSON-LD Files | 1,004 |
| Schema Validation | ✅ 1,004 passed, 0 failed |
| Reference Integrity | ✅ 2,719 valid, 0 broken |
| Quality Checks | ✅ 670 entities, 0 issues |
| Wikidata IDs | 158/177 (89%) |
| GBIF IDs | 126/177 (71%) |
| NCBI Taxonomy | 123/177 (69%) |
| ChEBI IDs (chemicals) | 18/20 (90%) |
| PubChem IDs (individual compounds) | 6/6 (100%) |
| InChI (individual compounds) | 6/6 (100%) |

> **Note**: Chemical entities include 6 individual compounds and 14 compound classes (alkaloids, flavonoids, etc.). PubChem IDs and InChI strings only exist for individual molecules, not compound classes. ChEBI provides class-level identifiers for compound groups.

### Entity Counts

| Entity Type | Count |
|-------------|-------|
| **Source Materials** | |
| BotanicalSource (Plants) | 121 |
| BotanicalSource (Fungi) | 5 |
| BotanicalSource (Algae) | 1 |
| ZoologicalSource | 5 |
| MineralSource | 12 |
| ChemicalSource | 33 |
| **Total Source Entities** | **177** |
| | |
| Plant Parts | 136 |
| Chemical Compounds | 20 |
| Chemical Profiles | 9 |
| DNA Barcodes | 9 |
| **Preparations & Formulas** | |
| Herbal Preparations | 194 |
| Formulas (Proprietary) | 5 |
| | |
| **System Profiles** | |
| TCM Profiles | 99 |
| Western Profiles | 87 |
| Ayurveda Profiles | 1 |
| Persian Profiles | 1 |
| Mongolian Profiles | 1 |
| **Total Entities** | **756** |

## Overview

This repository contains the structured data for [Herbapedia](https://herbapedia.org), the premier knowledge base for medicinal plants across all traditional medicine systems.

### Root IRI

All entities use fully qualified IRIs with the root: **`https://www.herbapedia.org/`**

| IRI Pattern | Example |
|-------------|---------|
| Entity | `https://www.herbapedia.org/entity/botanical/species/ginseng` |
| TCM Profile | `https://www.herbapedia.org/system/tcm/profile/ginseng` |
| Western Profile | `https://www.herbapedia.org/system/western/profile/ginger` |
| Reference Data | `https://www.herbapedia.org/system/tcm/nature/warm` |

### Key Features

- **JSON-LD Format**: True semantic linked data with proper vocabularies
- **Multi-System Support**: TCM, Western, Ayurveda, Persian, and Mongolian medicine
- **HerbalPreparation-Centric**: A single preparation can have multiple system profiles
- **Linked Data**: Integration with Wikidata, GBIF, and external knowledge bases
- **Multilingual**: Content in English, Chinese, Hindi, Sanskrit, Persian, Mongolian, and more
- **JSON Schema Validation**: Comprehensive schemas with embedded documentation
- **TypeScript API**: Full type definitions and query API

## Medicine Systems Supported

| System | Key Concepts | Languages |
|--------|--------------|-----------|
| **TCM** (Traditional Chinese Medicine) | 四气五味归经 (Nature, Flavor, Meridian) | 中文, English |
| **Western** | Herbal actions, organ affinities | English |
| **Ayurveda** | रस-गुण-वीर्य-विपाक-दोष | संस्कृतम्, English |
| **Persian** (TPM) | مزاج temperament (Hot/Cold × Wet/Dry) | فارسی, English |
| **Mongolian** | гурван үндэс (Three Roots) | Монгол, English |

## Architecture

### Core Principle: HerbalPreparation is Central

The architecture is built around **HerbalPreparation** as the central pivot entity:

```
PlantSpecies (Zingiber officinale)
  │
  └── PlantPart (Rhizome)
        │
        └── HerbalPreparation (Dried Ginger Rhizome)
              │
              ├── TCM Profile: 乾薑 (Gān Jiāng) - hot, pungent
              ├── Western Profile: Ginger - carminative, anti-inflammatory
              ├── Ayurveda Profile: नागर (Nāgara) - pungent, heating
              ├── Persian Profile: زنجبیل (Zanjabil) - hot-dry 3rd degree
              └── Mongolian Profile: гаа (Gaa) - hot potency
```

This enables:
1. **Same plant, different parts** with different therapeutic properties
2. **Same preparation, multiple interpretations** by different medicine systems
3. **Cross-system comparison** of therapeutic uses
4. **Clean separation** of botanical facts from therapeutic interpretations

### Entity Model

```
Entity (abstract base)
│
├── SourceMaterial (abstract)
│   ├── BotanicalSource (abstract)
│   │   ├── PlantSpecies              # Species-level botanical facts
│   │   ├── FungalSpecies             # Medicinal fungi (lingzhi, cordyceps)
│   │   └── AlgalSpecies              # Medicinal algae
│   ├── ZoologicalSource              # Animal products (deer antler, birds nest)
│   ├── MineralSource                 # Minerals (calcium, iron, zinc)
│   └── ChemicalSource                # Isolated compounds (vitamins, amino acids)
│
├── BotanicalEntity (abstract)
│   ├── PlantPart                     # Specific part of specific plant
│   ├── ChemicalCompound              # Molecular entity
│   ├── ChemicalProfile               # Chemical composition data
│   └── DNABarcode                    # DNA barcode for identification
│
├── HerbalPreparation                 # CENTRAL PIVOT ENTITY
│
├── Formula                           # Proprietary blends (capigen, etc.)
│
├── MedicineSystemProfile (abstract)
│   ├── TCMProfile                    # TCM interpretation
│   ├── WesternHerbalProfile          # Western interpretation
│   ├── AyurvedaProfile               # Ayurvedic interpretation
│   ├── PersianProfile                # Persian (TPM) interpretation
│   └── MongolianProfile              # Mongolian interpretation
│
└── ReferenceEntity (abstract)
    ├── TCMReference (Nature, Flavor, Meridian, Category)
    ├── WesternReference (Action, Organ, System)
    ├── AyurvedaReference (Rasa, Guna, Virya, Vipaka, Dosha)
    ├── PersianReference (Temperament, Element, Degree)
    └── MongolianReference (Root, Element, Taste, Potency)
```

## Directory Structure

```
data-herbapedia/
├── schema/
│   ├── json-schema/              # JSON Schema definitions
│   │   ├── core/                 # Base schemas (entity, language-map)
│   │   ├── botanical/            # Plant-related schemas
│   │   ├── herbal/               # Preparation schemas
│   │   ├── profiles/             # Medicine system profile schemas
│   │   └── reference/            # Controlled vocabulary schemas
│   └── context/                  # JSON-LD contexts
│
├── entities/
│   ├── botanical/
│   │   ├── species/              # Plant species (Zingiber officinale)
│   │   ├── parts/                # Plant parts (Ginger Rhizome)
│   │   ├── chemicals/            # Chemical compounds (Gingerol)
│   │   ├── profiles/             # Chemical profiles
│   │   └── barcodes/             # DNA barcodes
│   └── preparations/             # Herbal preparations (Dried Ginger)
│
├── profiles/                     # Medicine system profiles
│   ├── tcm/                      # TCM profiles (乾薑)
│   ├── western/                  # Western profiles (Ginger)
│   ├── ayurveda/                 # Ayurveda profiles (नागर)
│   ├── persian/                  # Persian profiles (زنجبیل)
│   └── mongolian/                # Mongolian profiles (гаа)
│
├── systems/                      # Medicine systems
│   ├── tcm/reference/            # Natures, Flavors, Meridians
│   ├── western/reference/        # Actions, Organs, Systems
│   ├── ayurveda/reference/       # Rasas, Gunas, Viryas, Doshas
│   ├── persian/reference/        # Temperaments, Elements, Degrees
│   └── mongolian/reference/      # Roots, Elements, Tastes, Potencies
│
├── src/
│   ├── dataset.ts                # HerbapediaDataset query API
│   ├── index.ts                  # Main exports
│   └── validation/               # Validation modules
│
├── types/                        # TypeScript definitions
│   ├── core.ts                   # Entity, LanguageMap, IRIReference
│   ├── botanical.ts              # PlantSpecies, PlantPart, etc.
│   ├── preparation.ts            # HerbalPreparation, SystemProfiles
│   ├── profiles/                 # Profile types for each system
│   ├── reference.ts              # Reference entity types
│   └── index.ts                  # Re-exports all types
│
├── scripts/
│   ├── validate.js               # Comprehensive validation
│   └── build-index.js            # Index builder
│
└── dist/                         # Build output
    ├── index.json                # Master index
    ├── botanical-index.json      # Plant species index
    ├── preparations-index.json   # Preparations index
    └── cross-references.json     # All cross-reference mappings
```

## TypeScript API

📖 **[Full API Documentation](docs/API.md)** - Complete reference for all 50+ query methods

### Installation

```bash
npm install @herbapedia/data
```

### Basic Usage

```typescript
import { HerbapediaDataset } from '@herbapedia/data'

const dataset = new HerbapediaDataset('./data')

// Load a plant species
const ginger = dataset.getPlantSpecies('ginger')
console.log(ginger?.scientificName) // "Zingiber officinale"

// Get preparations derived from a plant
const preparations = dataset.getPreparationsForPlant('ginger')

// Get all system profiles for a preparation
const profiles = dataset.getAllProfilesForPreparation('dried-ginger-rhizome')
console.log(profiles.tcm?.pinyin)      // "Gān Jiāng"
console.log(profiles.western?.name)    // "Ginger"
console.log(profiles.ayurveda?.sanskritName) // "नागर"
```

### Modular API (New in v0.3.0)

For better performance and tree-shaking, use the modular API:

```typescript
import {
  EntityLoader,
  BotanicalQueries,
  ProfileQueries,
  SearchIndex
} from '@herbapedia/data'

const loader = new EntityLoader({ dataPath: './data' })
const botanical = new BotanicalQueries(loader)
const profiles = new ProfileQueries(loader)

// Async loading (recommended for production)
const plant = await botanical.getPlantSpeciesAsync('ginseng')
const compounds = await botanical.getCompoundsInPlantAsync('ginseng')

// Batch loading for efficiency
const plants = await loader.batchLoad([
  'botanical/species/ginseng',
  'botanical/species/ginger'
])
```

### Full-Text Search

```typescript
import { SearchIndex } from '@herbapedia/data'

const search = new SearchIndex({ dataPath: './data' })
search.buildIndex()

// Search by name (English or Chinese)
const results = search.search('人蔘')  // Chinese for Ginseng
const results2 = search.search('ginger')

// Results include relevance scores
console.log(results[0].score, results[0].name)
```

### Entity Builder

Create new entities with validation:

```typescript
import { EntityBuilder } from '@herbapedia/data'

const newPlant = EntityBuilder.plantSpecies()
  .scientificName('Panax ginseng')
  .name({ en: 'Ginseng', 'zh-Hant': '人蔘' })
  .family('Araliaceae')
  .wikidataID('Q192163')
  .gbifID('3036592')
  .containsChemicals('ginsenosides', 'polysaccharides')
  .build()
```

### Validation Helpers

```typescript
import { EntityValidator } from '@herbapedia/data'

const result = EntityValidator.validate(plantEntity)
if (!result.valid) {
  console.log('Errors:', result.errors)
  console.log('Warnings:', result.warnings)
}
```

### Cross-Reference Queries

```typescript
// Find TCM herbs by thermal nature
const hotHerbs = dataset.getTCMByNature('hot')

// Find Western herbs by action
const antiInflammatory = dataset.getWesternByAction('anti-inflammatory')

// Find Ayurveda herbs by dosha effect
const vataReducing = dataset.getAyurvedaByDosha('vata')

// Find Persian herbs by temperament
const hotDry = dataset.getPersianByTemperament('hot-dry')

// Find Mongolian herbs by root effect
const badaganReducing = dataset.getMongolianByRoot('badagan')
```

### Type Imports

```typescript
import type {
  // Core types
  Entity,
  LanguageMap,
  IRIReference,

  // Botanical types
  PlantSpecies,
  PlantPart,
  ChemicalCompound,

  // Preparation types
  HerbalPreparation,
  SystemProfiles,

  // Profile types
  TCMProfile,
  WesternHerbalProfile,
  AyurvedaProfile,
  PersianProfile,
  MongolianProfile,
} from '@herbapedia/data/types'
```

## JSON-LD Examples

### Plant Species

```json
{
  "@context": "../../schema/context/core.jsonld",
  "@id": "botanical/species/ginger",
  "@type": ["botany:PlantSpecies", "schema:Plant"],
  "scientificName": "Zingiber officinale",
  "name": {
    "en": "Ginger",
    "zh-Hant": "薑",
    "zh-Hans": "姜"
  },
  "family": "Zingiberaceae",
  "gbifID": "2751590",
  "hasParts": [
    { "@id": "botanical/part/ginger-rhizome" }
  ]
}
```

### Herbal Preparation

```json
{
  "@context": "../../schema/context/herbal.jsonld",
  "@id": "preparation/dried-ginger-rhizome",
  "@type": ["herbal:HerbalPreparation", "schema:DietarySupplement"],
  "name": { "en": "Dried Ginger Rhizome" },
  "derivedFrom": [{ "@id": "botanical/part/ginger-rhizome" }],
  "hasTCMProfile": [{ "@id": "tcm/profile/dried-ginger" }],
  "hasWesternProfile": [{ "@id": "western/profile/ginger" }],
  "hasAyurvedaProfile": [{ "@id": "ayurveda/profile/nagara" }],
  "hasPersianProfile": [{ "@id": "persian/profile/zanjabil" }],
  "hasMongolianProfile": [{ "@id": "mongolian/profile/gaa" }]
}
```

### TCM Profile

```json
{
  "@context": "../../schema/context/tcm.jsonld",
  "@id": "tcm/profile/dried-ginger",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  "profiles": { "@id": "preparation/dried-ginger-rhizome" },
  "pinyin": "Gān Jiāng",
  "hasCategory": { "@id": "tcm/category/warm-interior" },
  "hasNature": { "@id": "tcm/nature/hot" },
  "hasFlavor": [{ "@id": "tcm/flavor/pungent" }],
  "entersMeridian": [
    { "@id": "tcm/meridian/spleen" },
    { "@id": "tcm/meridian/stomach" }
  ]
}
```

## Scripts

### Validation

```bash
# Run all validations
node scripts/validate.js

# Run with verbose output (shows all broken references)
node scripts/validate.js --verbose

# Run specific phase
node scripts/validate.js --schema
node scripts/validate.js --references
node scripts/validate.js --quality
```

### Build Index

```bash
# Build all index files
node scripts/build-index.js
```

### Utility Scripts

```bash
# Generate HerbalPreparation entities from TCM profiles
node scripts/generate-preparations.js

# Generate HerbalPreparation entities from Western profiles
node scripts/generate-western-preparations.js

# Fix IRI patterns (use with caution)
node scripts/fix-iri-patterns.js
```

## IRI Reference Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `botanical/species/{slug}` | `botanical/species/ginger` | Plant species |
| `botanical/part/{slug}` | `botanical/part/ginger-rhizome` | Plant part |
| `preparation/{slug}` | `preparation/dried-ginger-rhizome` | Herbal preparation |
| `tcm/profile/{slug}` | `tcm/profile/dried-ginger` | TCM profile |
| `western/profile/{slug}` | `western/profile/ginger` | Western profile |
| `ayurveda/profile/{slug}` | `ayurveda/profile/nagara` | Ayurveda profile |
| `persian/profile/{slug}` | `persian/profile/zanjabil` | Persian profile |
| `mongolian/profile/{slug}` | `mongolian/profile/gaa` | Mongolian profile |
| `tcm/nature/{value}` | `tcm/nature/hot` | TCM thermal nature |
| `tcm/flavor/{value}` | `tcm/flavor/pungent` | TCM flavor |
| `tcm/meridian/{value}` | `tcm/meridian/spleen` | TCM meridian |
| `western/action/{value}` | `western/action/carminative` | Western action |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-herb`)
3. Add or modify JSON-LD data files following the schema
4. Validate using `node scripts/validate.js`
5. Build index using `node scripts/build-index.js`
6. Submit a pull request

### Content Guidelines

- **Language Maps**: Use BCP 47 language codes (`en`, `zh-Hant`, `zh-Hans`, `sa`, `fa`, `mn`)
- **System-Scoped Content**: Use `tcm:traditionalUsage`, not generic `traditionalUsage`
- **IRI References**: Always use object format `{ "@id": "..." }` for references
- **Required Fields**: Check JSON schemas for required fields per entity type

## License

Content is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Related Projects

- [herbapedia](https://github.com/herbapedia/herbapedia) - Vue.js site builder
- [herbapedia-api](https://github.com/herbapedia/herbapedia-api) - GraphQL API (planned)

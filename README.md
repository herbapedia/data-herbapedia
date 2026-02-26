# Herbapedia Data Repository

> The authoritative **JSON-LD Knowledge Graph** for medicinal botany across all traditional medicine systems

## What is Herbapedia?

Herbapedia is a **fully normalized knowledge graph** that provides:
- **Single source of truth**: Each entity stored once, referenced by IRI
- **Cross-system linking**: Same preparation viewed through TCM, Ayurveda, Western, and other lenses
- **Semantic queries**: Traverse relationships, find paths, search across all nodes
- **Schema validation**: SHACL shapes ensure data integrity
- **Multiple formats**: Export to JSON-LD, RDF Turtle

## Current Status

| Metric | Count |
|--------|-------|
| JSON-LD Files | 1,004+ |
| Schema Validation | ✅ All passed |
| Reference Integrity | ✅ All valid |
| Knowledge Graph Nodes | 500+ |
| Medical Systems | 6 (TCM, Ayurveda, Western, Unani, Mongolian, Modern) |

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
| Ayurveda Profiles | 1+ |
| Unani Profiles | 1+ |
| Mongolian Profiles | 1 |
| Modern Medicine | Added |
| **Total Entities** | **756+** |

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

### Knowledge Graph Architecture

Herbapedia is built as a **fully normalized JSON-LD knowledge graph**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Knowledge Graph                               │
│                                                                      │
│  Species ──────► Part ──────► Preparation ──────► Profiles          │
│     │              │               │                  │              │
│     │              │               │                  ├── TCM        │
│     │              │               │                  ├── Ayurveda   │
│     │              │               │                  ├── Western    │
│     │              │               │                  ├── Unani      │
│     │              │               │                  └── Mongolian  │
│     │              │               │                                  │
│     ▼              ▼               ▼                                  │
│  Chemical ◄──── References ────► Vocabulary                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Full Normalization**: Each entity stored once, referenced by `@id`
2. **IRI-based References**: All relationships use `{"@id": "https://..."}`
3. **Schema-Driven**: SHACL shapes validate all nodes
4. **Multi-System**: Same preparation has multiple system profiles

### Core Principle: HerbalPreparation is Central

The architecture is built around **HerbalPreparation** as the central pivot entity:

```
PlantSpecies (Zingiber officinale)
  │
  └── PlantPart (Rhizome)
        │
        └── HerbalPreparation (Dried Ginger Rhizome)
              │
              ├── TCM Profile: 干姜 (Gān Jiāng) - hot, pungent
              ├── Western Profile: Ginger - carminative, anti-inflammatory
              ├── Ayurveda Profile: नागर (Nāgara) - pungent, heating
              ├── Unani Profile: زنجبیل (Zanjabil) - hot-dry
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
│   ├── context/                  # JSON-LD contexts
│   ├── shapes/                   # SHACL validation shapes
│   │   ├── core.shacl.ttl        # Core node shapes
│   │   ├── species.shacl.ttl     # Species validation
│   │   ├── profile.shacl.ttl     # Profile validation
│   │   └── ...
│   └── vocab/                    # Ontology definitions
│
├── entities/
│   ├── botanical/
│   │   ├── species/              # Plant species (Zingiber officinale)
│   │   ├── parts/                # Plant parts (Ginger Rhizome)
│   │   ├── chemicals/            # Chemical compounds (Gingerol)
│   │   ├── profiles/             # Chemical profiles
│   │   └── barcodes/             # DNA barcodes
│   ├── preparations/             # Herbal preparations (Dried Ginger)
│   └── plants/                   # Alternative plant entity location
│
├── profiles/                     # Medicine system profiles
│   ├── tcm/                      # TCM profiles (干姜)
│   ├── western/                  # Western profiles (Ginger)
│   ├── ayurveda/                 # Ayurveda profiles (नागर)
│   ├── unani/                    # Unani profiles (زنجبیل)
│   └── mongolian/                # Mongolian profiles (гаа)
│
├── systems/                      # Medicine systems
│   ├── tcm/                      # TCM herbs and reference data
│   │   ├── herbs/                # TCM herb profiles
│   │   └── reference/            # Natures, Flavors, Meridians
│   ├── western/reference/        # Actions, Organs, Systems
│   ├── ayurveda/reference/       # Rasas, Gunas, Viryas, Doshas
│   ├── unani/reference/          # Temperaments, Elements, Degrees
│   └── mongolian/reference/      # Roots, Elements, Tastes, Potencies
│
├── src/
│   ├── graph/                    # Knowledge Graph module (NEW)
│   │   ├── api/                  # Query, Traversal, Index APIs
│   │   │   ├── GraphQuery.ts     # Entity lookup
│   │   │   ├── GraphTraversal.ts # Relationship navigation
│   │   │   └── GraphIndex.ts     # Search and listings
│   │   ├── nodes/                # Node classes (Species, Profile, etc.)
│   │   ├── registry/             # GraphRegistry for node storage
│   │   ├── exporters/            # JSON-LD and Turtle exporters
│   │   ├── validators/           # Schema and SHACL validation
│   │   ├── GraphBuilder.ts       # Build orchestrator
│   │   └── index.ts              # Module exports
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
│   ├── build-index.js            # Index builder
│   └── build-graph.ts            # Knowledge Graph builder (NEW)
│
├── api/v1/                       # Built graph output (NEW)
│   ├── node/                     # Individual node files
│   │   ├── species/              # Species nodes
│   │   ├── profile/              # Profile nodes by system
│   │   │   ├── tcm/
│   │   │   ├── ayurveda/
│   │   │   └── western/
│   │   └── vocab/                # Vocabulary nodes
│   ├── graph/                    # Aggregated files
│   │   ├── all.jsonld            # All nodes
│   │   ├── species.jsonld        # All species
│   │   ├── tcm-profiles.jsonld   # All TCM profiles
│   │   └── vocabulary.jsonld     # All vocabulary
│   ├── stats.json                # Graph statistics
│   ├── context.jsonld            # Combined context
│   └── version.json              # Build version
│
└── dist/                         # Build output
    ├── index.json                # Master index
    └── ...
```

## TypeScript API

### Installation

```bash
npm install @herbapedia/data
```

### Knowledge Graph API (Recommended)

The new Graph API provides clean, normalized access to all entities:

```typescript
import {
  GraphBuilder,
  GraphQuery,
  GraphTraversal,
  GraphIndex
} from '@herbapedia/data/graph'

// Build the knowledge graph
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1'
})
await builder.build()
const registry = builder.getRegistry()

// Query API - Get entities
const query = new GraphQuery(registry)
const ginseng = query.getSpecies('panax-ginseng')
const tcmProfile = query.getProfile('tcm', 'ren-shen')
const westernProfile = query.getProfile('western', 'ginger')

// Find related profiles
const profiles = query.findProfilesForSpecies('panax-ginseng')
const preparations = query.findPreparationsForSpecies('panax-ginseng')

// Traversal API - Navigate relationships
const traversal = new GraphTraversal(registry)
const related = traversal.getRelatedNodes('species/panax-ginseng', 2)
const path = traversal.getShortestPath(
  'species/panax-ginseng',
  'profile/tcm/ren-shen'
)
const derivedProfiles = traversal.traverseRelationship(
  'species/panax-ginseng',
  'derivedFrom'
)

// Index API - Search and list
const index = new GraphIndex(registry)

// List all entities
const allSpecies = index.listSpecies()
const tcmProfiles = index.listProfiles('tcm')
const flavors = index.listVocabulary('tcm', 'flavor')

// Full-text search (lunr.js powered)
const results = index.search('ginseng')
const chineseResults = index.search('補氣')  // Chinese works!

// Statistics
const stats = index.getStats()
console.log(stats.totalNodes, stats.byType)
```

### Dataset API

The HerbapediaDataset API provides a simpler interface:

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
```

### Modular API

For better performance and tree-shaking:

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
  "hasFlavor": [{ "@id": "tcm/flavor/acrid" }],
  "entersMeridian": [
    { "@id": "tcm/meridian/spleen" },
    { "@id": "tcm/meridian/stomach" }
  ]
}
```

## Scripts

### Build Knowledge Graph

```bash
# Build with defaults
npm run build-graph

# Build with verbose output
npm run build-graph -- --verbose

# Clean build (removes all previous output)
npm run build-graph -- --clean

# Incremental build (only files changed since last build)
npm run build-graph -- --since last

# Incremental build (files changed since specific date)
npm run build-graph -- --since 2026-02-01

# Build with higher concurrency
npm run build-graph -- --concurrency 20

# Export to both JSON-LD and Turtle
npm run build-graph -- --format jsonld,turtle

# Skip validation
npm run build-graph -- --no-validate
```

### Build Options

| Option | Description | Default |
|--------|-------------|---------|
| `--data-root <path>` | Root directory of source data | current directory |
| `--output-dir <path>` | Output directory | ./api/v1 |
| `--format <formats>` | Export formats: jsonld,turtle | jsonld |
| `--validate` | Enable validation | true |
| `--no-validate` | Disable validation | - |
| `--verbose, -v` | Enable verbose logging | false |
| `--clean` | Clean output directory before build | false |
| `--since <date>` | Incremental build since date | - |
| `--concurrency <n>` | Concurrent file operations | 10 |
| `--help, -h` | Show help | - |

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

## IRI Patterns

All entities in the knowledge graph use fully qualified IRIs:

| Pattern | Example | Description |
|---------|---------|-------------|
| `https://www.herbapedia.org/graph/species/{slug}` | `.../species/panax-ginseng` | Plant species |
| `https://www.herbapedia.org/graph/part/{slug}` | `.../part/ginseng-root` | Plant part |
| `https://www.herbapedia.org/graph/chemical/{slug}` | `.../chemical/ginsenoside-rb1` | Chemical compound |
| `https://www.herbapedia.org/graph/preparation/{slug}` | `.../preparation/dried-ginger` | Herbal preparation |
| `https://www.herbapedia.org/graph/formula/{slug}` | `.../formula/si-jun-zi-tang` | Multi-herb formula |
| `https://www.herbapedia.org/graph/profile/{system}/{slug}` | `.../profile/tcm/ren-shen` | System profile |
| `https://www.herbapedia.org/graph/vocab/{system}/{type}/{value}` | `.../vocab/tcm/flavor/sweet` | Vocabulary term |
| `https://www.herbapedia.org/graph/source/{slug}` | `.../source/vita-green` | Data source |
| `https://www.herbapedia.org/graph/image/{slug}` | `.../image/panax-ginseng` | Image metadata |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-herb`)
3. Add or modify JSON-LD data files following the schema
4. Validate using `node scripts/validate.js`
5. Build index using `node scripts/build-index.js`
6. Build graph using `npm run build-graph`
7. Submit a pull request

### Content Guidelines

- **Language Maps**: Use BCP 47 language codes (`en`, `zh-Hant`, `zh-Hans`, `sa`, `fa`, `mn`)
- **System-Scoped Content**: Use `tcm:traditionalUsage`, not generic `traditionalUsage`
- **IRI References**: Always use object format `{ "@id": "..." }` for references
- **Required Fields**: Check JSON schemas for required fields per entity type

## Documentation

- **[API Reference](docs/api/README.md)** - Query, Traversal, Index APIs
- **[Migration Guide](MIGRATE-KG-IMPORTANT.md)** - Migrating to the Knowledge Graph API
- **[Examples](docs/EXAMPLES.md)** - Usage examples and patterns
- **[Schema Documentation](docs/SCHEMA.md)** - JSON-LD schemas and contexts

## License

Content is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Related Projects

- [herbapedia](https://github.com/herbapedia/herbapedia) - Vue.js site builder
- [herbapedia-api](https://github.com/herbapedia/herbapedia-api) - GraphQL API (planned)

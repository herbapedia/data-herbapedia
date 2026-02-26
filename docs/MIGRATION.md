# Migration Guide

This guide helps users migrate from the old data-herbapedia API to the new Knowledge Graph API.

## Overview

The new architecture introduces a fully normalized JSON-LD knowledge graph with:
- **Full Normalization**: Each entity appears exactly once, referenced by `@id`
- **Knowledge-Centric API**: Three complementary APIs (Query, Traversal, Index)
- **Schema-Driven Validation**: SHACL shapes and JSON Schema validation
- **Multiple Output Formats**: JSON-LD and RDF Turtle

## Breaking Changes

### 1. Entity Access

**Old API:**
```typescript
import { loadPlant } from '@herbapedia/data'

const plant = loadPlant('ginseng')
console.log(plant.name) // "Ginseng"
```

**New API:**
```typescript
import { GraphBuilder, GraphQuery } from '@herbapedia/data/graph'

const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
await builder.build()

const query = new GraphQuery(builder.getRegistry())
const species = query.getSpecies('panax-ginseng')
console.log(species.name) // { en: "Ginseng", zh: "人蔘" }
```

### 2. Profile Access

**Old API:**
```typescript
import { loadTcmHerb } from '@herbapedia/data'

const herb = loadTcmHerb('ren-shen')
console.log(herb.nature) // "warm"
```

**New API:**
```typescript
import { GraphBuilder, GraphQuery } from '@herbapedia/data/graph'

const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
await builder.build()

const query = new GraphQuery(builder.getRegistry())
const profile = query.getProfile('tcm', 'ren-shen')
const nature = query.getByIRI(profile.hasNature['@id'])
console.log(nature.value) // "warm"
```

### 3. Search

**Old API:**
```typescript
import { searchPlants } from '@herbapedia/data'

const results = searchPlants('ginseng')
```

**New API:**
```typescript
import { GraphBuilder, GraphIndex } from '@herbapedia/data/graph'

const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
await builder.build()

const index = new GraphIndex(builder.getRegistry())
index.buildSearchIndex()

const results = index.search('ginseng')
```

## Step-by-Step Migration

### Step 1: Update Imports

Replace old imports with new graph module imports:

```typescript
// Old
import { loadPlant, loadTcmHerb, searchPlants } from '@herbapedia/data'

// New
import {
  GraphBuilder,
  GraphQuery,
  GraphTraversal,
  GraphIndex
} from '@herbapedia/data/graph'
```

### Step 2: Initialize the Graph

Build the graph once at application startup:

```typescript
// Create builder
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1', // Optional: for export
  validate: true,        // Optional: enable validation
  verbose: false
})

// Build the graph
const result = await builder.build()

if (!result.success) {
  console.error('Build failed:', result.errors)
  return
}

// Get the registry
const registry = builder.getRegistry()
```

### Step 3: Create API Instances

```typescript
// Create API instances
const query = new GraphQuery(registry)
const traversal = new GraphTraversal(registry)
const index = new GraphIndex(registry)
```

### Step 4: Update Data Access Patterns

#### Accessing Species Data

```typescript
// Old: Direct property access
const plant = loadPlant('ginseng')
const name = plant.name

// New: Language map access
const species = query.getSpecies('panax-ginseng')
const name = species.name?.en || species.name?.zh
```

#### Accessing TCM Properties

```typescript
// Old: Embedded properties
const herb = loadTcmHerb('ren-shen')
const nature = herb.nature
const flavors = herb.flavors

// New: Reference resolution
const profile = query.getProfile('tcm', 'ren-shen')

// Resolve nature reference
const natureNode = query.getByIRI(profile.hasNature['@id'])
const nature = natureNode.value

// Resolve flavor references
const flavors = profile.hasFlavor.map(ref => {
  const node = query.getByIRI(ref['@id'])
  return node.value
})
```

### Step 5: Update Search Patterns

```typescript
// Old: Simple search
const results = searchPlants('ginseng')

// New: Index-based search
index.buildSearchIndex() // Call once
const results = index.search('ginseng')

// Access results
for (const result of results) {
  console.log(result.node['@id'], result.score)
}
```

## New Features

### Traversal API

Navigate relationships between nodes:

```typescript
const traversal = new GraphTraversal(registry)

// Find all profiles for a species
const profiles = traversal.getIncomingReferences(species['@id'])

// Get TCM vocabulary for a profile
const vocab = traversal.getTcmVocabulary(profile['@id'])
console.log('Natures:', vocab.natures)
console.log('Flavors:', vocab.flavors)

// Find shortest path between nodes
const path = traversal.getShortestPath(speciesId, meridianId)
```

### Index API

List and search nodes:

```typescript
const index = new GraphIndex(registry)

// List all nodes of a type
const allSpecies = index.listSpecies()
const allTcmProfiles = index.listProfiles('tcm')

// Search by field
const results = index.searchByField('pinyin', 'shen')

// Search by criteria
const herbs = index.searchByCriteria({
  medicalSystem: 'tcm'
})

// Get statistics
const stats = index.getStats()
console.log('Total nodes:', stats.totalNodes)
```

## Output File Changes

### Old Structure
```
dist/
├── index.json
├── plants.json
└── tcm-herbs.json
```

### New Structure
```
api/v1/
├── node/
│   ├── species/
│   │   ├── index.jsonld
│   │   ├── panax-ginseng.jsonld
│   │   └── ...
│   ├── profile/
│   │   ├── tcm/
│   │   ├── ayurveda/
│   │   └── western/
│   └── vocab/
│       ├── tcm/
│       └── ayurveda/
├── graph/
│   ├── all.jsonld
│   ├── all.ttl
│   └── ...
├── stats.json
└── context.jsonld
```

## CLI Changes

### Old Commands
```bash
npm run validate
npm run build-index
```

### New Commands
```bash
# Build the graph
npm run build-graph

# Build with options
node scripts/build-graph.js --clean --validate --verbose

# CLI commands
npx herbapedia build
npx herbapedia validate
npx herbapedia query --species panax-ginseng
npx herbapedia stats
```

## Common Patterns

### Pattern: Load and Display Species

```typescript
import { GraphBuilder, GraphQuery } from '@herbapedia/data/graph'

async function displaySpecies(slug: string) {
  const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
  await builder.build()

  const query = new GraphQuery(builder.getRegistry())
  const species = query.getSpecies(slug)

  if (!species) {
    console.log('Species not found')
    return
  }

  console.log('Scientific Name:', species.scientificName)
  console.log('Names:', species.name)
  console.log('Family:', species.family)
}
```

### Pattern: Find Profiles for Species

```typescript
import { GraphBuilder, GraphQuery, GraphTraversal } from '@herbapedia/data/graph'

async function findProfiles(speciesSlug: string) {
  const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
  await builder.build()

  const registry = builder.getRegistry()
  const query = new GraphQuery(registry)
  const traversal = new GraphTraversal(registry)

  const profiles = query.findProfilesForSpecies(speciesSlug)

  for (const profile of profiles) {
    if (profile['@id'].includes('/tcm/')) {
      const vocab = traversal.getTcmVocabulary(profile['@id'])
      console.log('TCM Profile:', profile.pinyin)
      console.log('  Nature:', vocab.natures.map(n => n.value).join(', '))
      console.log('  Flavors:', vocab.flavors.map(f => f.value).join(', '))
    }
  }
}
```

### Pattern: Search and Explore

```typescript
import { GraphBuilder, GraphIndex, GraphQuery } from '@herbapedia/data/graph'

async function searchAndExplore(searchTerm: string) {
  const builder = new GraphBuilder({ dataRoot: './data-herbapedia' })
  await builder.build()

  const registry = builder.getRegistry()
  const index = new GraphIndex(registry)
  const query = new GraphQuery(registry)

  index.buildSearchIndex()
  const results = index.search(searchTerm, 10)

  for (const result of results) {
    const node = result.node
    console.log(`${node['@id']} (score: ${result.score})`)

    // Get related nodes
    if (node['@id'].includes('/species/')) {
      const profiles = query.findProfilesForSpecies(node.slug)
      console.log(`  ${profiles.length} profiles found`)
    }
  }
}
```

## Getting Help

- See [docs/api/README.md](./api/README.md) for API overview
- See [docs/api/QUERY.md](./api/QUERY.md) for Query API reference
- See [docs/api/TRAVERSAL.md](./api/TRAVERSAL.md) for Traversal API reference
- See [docs/api/INDEX.md](./api/INDEX.md) for Index API reference

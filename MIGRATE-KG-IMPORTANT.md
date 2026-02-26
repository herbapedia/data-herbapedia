# MIGRATION Guide: Knowledge Graph API

## Overview

The knowledge graph module introduces a new **fully normalized JSON-LD knowledge graph** architecture.
This replaces the previous approaches with:

1. **Normalized entities**: Each entity (species, part, chemical, profile, formula, source, image, vocabulary) stored exactly once
2. **@id references**: All relationships use IRI references (`{"@id": "..."}`)
3. **Schema-driven validation**: All nodes validated against SHACL shapes
4. **Multiple medical systems**: TCM, Ayurveda, Western, Unani, Mongolian, Modern
5. **Knowledge-Centric API**: Query, Traversal, and Index APIs for accessing the graph

## Breaking Changes from Old API → New API

| Old API | New API |
|---------|---------|
| `getData()` | `query.getSpecies()` |
| `buildIndex()` | `builder.buildIndex()` |
| `exportData()` | `exporter.export()` |
| `getTcmHerbs()` | `query.getProfiles('tcm')` |
| `getAyurvedaDravyas()` | `query.getProfiles('ayurveda')` |
| `search()` | `index.search()` |
| Embedded objects | `@id` references |
| Direct property access | Language maps |

## New Capabilities

- **Graph traversal**: Navigate relationships bidirectionally
- **Full-text search**: Search across all nodes using lunr.js
- **Path finding**: Find shortest path between nodes
- **Statistics**: Get graph statistics
- **Validation**: Schema, reference, and SHACL validation
- **Multiple formats**: JSON-LD and RDF Turtle output

## Migration Steps

### Step 1: Update Imports
```typescript
// OLD
import { getData, buildIndex } from './data'

// New
import {
  GraphBuilder,
  GraphRegistry,
  GraphQuery,
  GraphTraversal,
  GraphIndex
} from '@herbapedia/data/graph'
```

### Step 2: Update Entity Access
```typescript
// Old
const species = getData('ginseng')
const herbs = getTcmHerbs()

// New
const builder = new GraphBuilder({ dataRoot: './data-herbapedia', outputDir: './api/v1' })
await builder.build()
const registry = builder.getRegistry()
const query = new GraphQuery(registry)

const species = query.getSpecies('panax-ginseng')
const profiles = query.getProfiles('tcm')
```

### Step 3: Update Query Patterns
```typescript
// Old: Direct property access
const name = species.name?.en
const pinyin = species.pinyin

// New: Use the Query API
const species = query.getSpecies('ginseng')
const name = species?.name // Language map still accessible
const pinyin = species?.pinyin // Still direct
```

### Step 4: Use Traversal for Relationships
```typescript
const traversal = new GraphTraversal(registry)

// Get all profiles for a species
const profiles = traversal.getProfilesForSpecies(species['@id'])

// Get TCM vocabulary
const vocab = traversal.getTcmVocabulary(profile['@id'])

// Find path between nodes
const path = traversal.getShortestPath(species['@id'], profile['@id'])
```

### Step 5: Use Index for Search
```typescript
const index = new GraphIndex(registry)
index.buildSearchIndex()

// Search for ginseng
const results = index.search('ginseng')

// Get statistics
const stats = index.getStats()
```

## CLI Commands

### Build Commands
```bash
# Build with defaults
node scripts/build-graph.ts

# Build with verbose output
node scripts/build-graph.ts --verbose

# Clean build (removes all previous output)
node scripts/build-graph.ts --clean --verbose

# Incremental build (only files changed since last build)
node scripts/build-graph.ts --since last

# Incremental build (files changed since specific date)
node scripts/build-graph.ts --since 2026-02-01

# Build with higher concurrency
node scripts/build-graph.ts --concurrency 20

# Export to both JSON-LD and Turtle
node scripts/build-graph.ts --format jsonld,turtle

# Skip validation
node scripts/build-graph.ts --no-validate
```

### CLI Options
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

## Full API Reference

### GraphQuery API
```typescript
import { GraphQuery } from '@herbapedia/data/graph'

const query = new GraphQuery(registry)

// Get single entities
const species = query.getSpecies('panax-ginseng')
const part = query.getPart('ginseng-root')
const chemical = query.getChemical('ginsenoside-rb1')
const preparation = query.getPreparation('ginseng-decoction')
const formula = query.getFormula('si-jun-zi-tang')

// Get profiles by system
const tcmProfile = query.getProfile('tcm', 'ren-shen')
const ayurvedaProfile = query.getProfile('ayurveda', 'ashwagandha')
const westernProfile = query.getProfile('western', 'ginger')

// Get vocabulary terms
const flavor = query.getVocabulary('tcm', 'flavor', 'sweet')
const nature = query.getVocabulary('tcm', 'nature', 'warm')
const dosha = query.getVocabulary('ayurveda', 'dosha', 'vata')

// Get by IRI (universal access)
const node = query.getByIRI('https://www.herbapedia.org/graph/species/panax-ginseng')

// Find related profiles
const profiles = query.findProfilesForSpecies('panax-ginseng')
const preparations = query.findPreparationsForSpecies('panax-ginseng')
```

### GraphTraversal API
```typescript
import { GraphTraversal } from '@herbapedia/data/graph'

const traversal = new GraphTraversal(registry)

// Get references
const incoming = traversal.getIncomingReferences('species/panax-ginseng')
const outgoing = traversal.getOutgoingReferences('profile/tcm/ren-shen')

// Traverse relationships
const derivedProfiles = traversal.traverseRelationship(
  'species/panax-ginseng',
  'derivedFrom'
)

// Get related nodes
const related = traversal.getRelatedNodes('species/panax-ginseng', 2) // depth 2

// Graph navigation
const ancestors = traversal.getAncestors('formula/si-jun-zi-tang')
const descendants = traversal.getDescendants('species/panax-ginseng')

// Path finding
const path = traversal.getShortestPath(
  'species/panax-ginseng',
  'profile/tcm/ren-shen'
)
```

### GraphIndex API
```typescript
import { GraphIndex } from '@herbapedia/data/graph'

const index = new GraphIndex(registry)

// List all entities of a type
const allSpecies = index.listSpecies()
const allParts = index.listParts()
const allChemicals = index.listChemicals()
const allPreparations = index.listPreparations()
const allFormulas = index.listFormulas()

// List profiles by system
const tcmProfiles = index.listProfiles('tcm')
const allProfiles = index.listProfiles() // all systems

// List vocabulary
const flavors = index.listVocabulary('tcm', 'flavor')
const doshas = index.listVocabulary('ayurveda', 'dosha')

// Full-text search (lunr.js powered)
const results = index.search('ginseng')
const tcmResults = index.search('補氣') // Chinese characters work

// Field-specific search
const byName = index.searchByField('name', 'ginseng')
const byPinyin = index.searchByField('pinyin', 'ren shen')

// Statistics
const stats = index.getStats()
console.log(stats.totalNodes)
console.log(stats.byType)
```

## Full Normalization Explained

### What is Full Normalization?
Each entity is stored exactly once and referenced by its IRI (`@id`). No data is duplicated.

### Example: Species with Profiles
```json
// species/panax-ginseng.jsonld
{
  "@id": "https://www.herbapedia.org/graph/species/panax-ginseng",
  "@type": ["herbapedia:Species", "schema:Plant"],
  "name": { "en": "Ginseng", "zh-Hant": "人蔘" },
  "scientificName": "Panax ginseng",
  "containsChemical": [
    { "@id": "https://www.herbapedia.org/graph/chemical/ginsenoside-rb1" }
  ]
}

// profile/tcm/ren-shen.jsonld
{
  "@id": "https://www.herbapedia.org/graph/profile/tcm/ren-shen",
  "@type": ["tcm:Herb", "herbapedia:Profile"],
  "derivedFrom": { "@id": "https://www.herbapedia.org/graph/species/panax-ginseng" },
  "hasNature": { "@id": "https://www.herbapedia.org/graph/vocab/tcm/nature/warm" },
  "hasFlavor": [
    { "@id": "https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet" }
  ]
}
```

### Benefits
1. **Single source of truth**: Each entity defined once
2. **Easy updates**: Change a vocabulary term, all references update automatically
3. **Consistent IRIs**: Universal identifiers for linking
4. **Efficient traversal**: Follow @id references through the graph

## Common Patterns

### Pattern 1: Load and Query
```typescript
import { GraphBuilder, GraphQuery } from '@herbapedia/data/graph'

async function main() {
  // Build the graph
  const builder = new GraphBuilder({
    dataRoot: './data',
    outputDir: './api/v1'
  })
  await builder.build()

  // Query it
  const query = new GraphQuery(builder.getRegistry())
  const ginseng = query.getSpecies('panax-ginseng')

  console.log(ginseng?.name?.en) // "Ginseng"
}
```

### Pattern 2: Search and Traverse
```typescript
import { GraphIndex, GraphTraversal } from '@herbapedia/data/graph'

const index = new GraphIndex(registry)
const traversal = new GraphTraversal(registry)

// Search for warming herbs
const results = index.search('warm nature')

// For each result, get related profiles
for (const result of results) {
  const related = traversal.getRelatedNodes(result['@id'], 1)
  console.log(`${result.name?.en}: ${related.size} related nodes`)
}
```

### Pattern 3: Export for Web API
```typescript
import { GraphBuilder, JsonLdExporter } from '@herbapedia/data/graph'

const builder = new GraphBuilder({ dataRoot, outputDir })
await builder.build()

const exporter = new JsonLdExporter(builder.getRegistry(), outputDir)
await exporter.export({ pretty: true, includeContext: true })

// Now serve the api/v1 directory as static files
// GET /api/v1/node/species/panax-ginseng.jsonld
// GET /api/v1/graph/species.jsonld
// GET /api/v1/stats.json
```

## IRI Patterns

All IRIs follow consistent patterns:
- Species: `https://www.herbapedia.org/graph/species/{slug}`
- Part: `https://www.herbapedia.org/graph/part/{slug}`
- Chemical: `https://www.herbapedia.org/graph/chemical/{slug}`
- Preparation: `https://www.herbapedia.org/graph/preparation/{slug}`
- Formula: `https://www.herbapedia.org/graph/formula/{slug}`
- Profile: `https://www.herbapedia.org/graph/profile/{system}/{slug}`
- Vocab: `https://www.herbapedia.org/graph/vocab/{system}/{type}/{value}`
- Source: `https://www.herbapedia.org/graph/source/{slug}`
- Image: `https://www.herbapedia.org/graph/image/{slug}`

## Output Structure
```
api/v1/
├── node/
│   ├── species/
│   │   ├── index.jsonld
│   │   ├── ginseng.jsonld
│   │   └── ...
│   ├── profile/
│   │   ├── tcm/
│   │   ├── index.jsonld
│   │   ├── ren-shen.jsonld
│   │   └── ...
│   └── vocab/
│       └── tcm/
│           ├── flavor/
│           │   ├── sweet.jsonld
│           │   └── index.jsonld
│           └── ...
├── graph/
│   ├── all.jsonld
│   ├── all.ttl
│   ├── species.jsonld
│   ├── tcm-profiles.jsonld
│   └── vocabulary.jsonld
├── stats.json
├── context.jsonld
└── version.json
```

## Validation

The new module provides comprehensive validation:
```typescript
import { CompositeValidator } from '@herbapedia/data/graph'

const validator = new CompositeValidator(registry)
const result = validator.validate({
  failFast: false,
  validateReferences: true
})

if (!result.valid) {
  for (const [nodeIri, nodeResult] of result.byNode) {
    if (!nodeResult.valid) {
      console.error(`Invalid node: ${nodeIri}`)
      for (const issue of nodeResult.issues) {
        console.error(`  - ${issue.type}: ${issue.message}`)
      }
    }
  }
}
```

## Getting Help

- **Documentation**: See `docs/api/` directory
- **Issues**: Open a GitHub issue
- **Examples**: See `docs/EXAMPLES.md`

## Troubleshooting

### Common Issues

#### "Module not found: @herbapedia/data/graph"
Ensure you're importing from the correct path:
```typescript
// If using as a local module
import { GraphBuilder } from './src/graph/index.js'

// If using as a package
import { GraphBuilder } from '@herbapedia/data/graph'
```

#### "Unresolved reference" warnings
This means an @id reference points to a node that wasn't loaded. Check:
1. The referenced file exists
2. The slug/IRI matches exactly
3. The node type is being loaded during build

#### Build fails with "Cannot find module"
Run npm install first:
```bash
npm install
npm run build-graph
```

#### Search returns no results
The search index is built on-demand. Call `index.buildSearchIndex()` first:
```typescript
const index = new GraphIndex(registry)
index.buildSearchIndex() // Required before searching
const results = index.search('ginseng')
```

#### TypeScript type errors
Ensure your tsconfig.json includes:
```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "node",
    "target": "ES2022"
  }
}
```

### Debug Mode
Run builds with verbose output to see detailed progress:
```bash
node scripts/build-graph.ts --verbose --clean
```

## Migration Checklist

- [ ] Update imports to use new module paths
- [ ] Replace `getData()` with `GraphQuery.getSpecies()`
- [ ] Replace embedded objects with @id reference traversal
- [ ] Update search to use `GraphIndex.search()`
- [ ] Run `npm run build-graph` to generate output
- [ ] Verify output in `api/v1/` directory
- [ ] Update any hardcoded entity access to use slugs
- [ ] Test traversal relationships
- [ ] Update validation to use `CompositeValidator`

## Version Compatibility

| Version | Features |
|---------|----------|
| 1.0.0 | Initial knowledge graph release |
| 1.1.0 | Added Unani, Mongolian, Modern medicine systems |
| 1.2.0 | Added SHACL validation, incremental builds |
| 1.3.0 | Added concurrency options, improved error reporting |

Check `api/v1/version.json` for current build version.

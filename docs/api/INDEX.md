# GraphIndex API

The GraphIndex API provides methods to list, search, and generate indexes for nodes in the knowledge graph.

## Overview

GraphIndex enables you to:
- List all nodes of a specific type
- Perform full-text search across all nodes
- Search by specific fields or criteria
- Get graph statistics
- Generate index files for API output

## Constructor

```typescript
const index = new GraphIndex(registry: GraphRegistry)
```

## List Operations

### listSpecies

List all species nodes.

```typescript
const species = index.listSpecies()
// Returns: GraphNode[] - all botanical species
```

### listParts

List all part nodes.

```typescript
const parts = index.listParts()
// Returns: GraphNode[] - all plant parts (root, leaf, flower, etc.)
```

### listChemicals

List all chemical compound nodes.

```typescript
const chemicals = index.listChemicals()
// Returns: GraphNode[] - all chemical compounds
```

### listPreparations

List all preparation nodes.

```typescript
const preparations = index.listPreparations()
// Returns: GraphNode[] - all herbal preparations
```

### listFormulas

List all formula nodes.

```typescript
const formulas = index.listFormulas()
// Returns: GraphNode[] - all multi-herb formulas
```

### listSources

List all source nodes.

```typescript
const sources = index.listSources()
// Returns: GraphNode[] - all reference sources
```

### listImages

List all image nodes.

```typescript
const images = index.listImages()
// Returns: GraphNode[] - all image metadata
```

### listProfiles

List profile nodes, optionally filtered by system.

```typescript
// All profiles
const allProfiles = index.listProfiles()

// TCM profiles only
const tcmProfiles = index.listProfiles('tcm')

// Ayurveda profiles only
const ayurvedaProfiles = index.listProfiles('ayurveda')

// Western profiles only
const westernProfiles = index.listProfiles('western')
// Returns: GraphNode[]
```

### listVocabulary

List vocabulary nodes for a specific system and type.

```typescript
// All TCM vocabulary
const allTcmVocab = index.listVocabulary('tcm')

// TCM flavors only
const flavors = index.listVocabulary('tcm', 'flavor')

// TCM natures only
const natures = index.listVocabulary('tcm', 'nature')

// TCM meridians only
const meridians = index.listVocabulary('tcm', 'meridian')

// TCM categories only
const categories = index.listVocabulary('tcm', 'category')

// All Ayurveda vocabulary
const allAyurvedaVocab = index.listVocabulary('ayurveda')

// Ayurveda doshas only
const doshas = index.listVocabulary('ayurveda', 'dosha')

// Ayurveda rasas only
const rasas = index.listVocabulary('ayurveda', 'rasa')
// Returns: GraphNode[]
```

### listAll

List all nodes in the graph.

```typescript
const allNodes = index.listAll()
// Returns: GraphNode[] - every node in the graph
```

## Search Operations

### buildSearchIndex

Build or rebuild the full-text search index. Call this after the graph is fully loaded.

```typescript
index.buildSearchIndex()
// No return value - builds internal lunr index
```

### search

Full-text search across all nodes.

```typescript
interface SearchResult {
  node: GraphNode
  score: number
  matchCount: number
}

const results = index.search('ginseng')
// Returns: SearchResult[] - ranked search results

// With limit
const topResults = index.search('digestive', 10)
// Returns top 10 results
```

The search index includes:
- Node names (all languages)
- Scientific names
- Pinyin names
- Sanskrit names
- Descriptions
- Functions and usage

### searchByField

Search by a specific field value.

```typescript
const results = index.searchByField('slug', 'panax-ginseng')
// Returns: GraphNode[] - nodes where slug contains 'panax-ginseng'

const results = index.searchByField('pinyin', 'ren shen')
// Returns: GraphNode[] - nodes where pinyin contains 'ren shen'
```

### searchByCriteria

Search by multiple criteria.

```typescript
const results = index.searchByCriteria({
  medicalSystem: 'tcm',
  pinyin: 'shen'
})
// Returns: GraphNode[] - nodes matching ALL criteria

// With array values (OR logic within a field)
const results = index.searchByCriteria({
  medicalSystem: ['tcm', 'ayurveda']
})
// Returns nodes from either TCM or Ayurveda
```

## Statistics

### getStats

Get comprehensive graph statistics.

```typescript
interface GraphStats {
  totalNodes: number
  byType: Record<string, number>
  lastUpdated: string
}

const stats = index.getStats()
// Returns: GraphStats
// Example:
// {
//   totalNodes: 500,
//   byType: {
//     species: 150,
//     tcm_profile: 100,
//     ayurveda_profile: 50,
//     western_profile: 80,
//     tcm_flavor: 7,
//     tcm_nature: 5,
//     ...
//   },
//   lastUpdated: '2026-02-26T00:00:00Z'
// }
```

### getCountByType

Get count of nodes by type.

```typescript
const counts = index.getCountByType()
// Returns: Record<string, number>
// Example: { species: 150, tcm_profile: 100, ... }
```

### getTotalCount

Get total node count.

```typescript
const total = index.getTotalCount()
// Returns: number
```

## Index File Generation

### generateIndex

Generate index data for a node type (used for API output).

```typescript
const speciesIndex = index.generateIndex('species')
// Returns: {
//   '@context': 'https://www.w3.org/ns/hydra/context.jsonld',
//   '@type': 'Collection',
//   totalItems: 150,
//   member: [{ '@id': 'https://...' }, ...]
// }

// Supported types:
// 'species', 'part', 'chemical', 'preparation', 'formula',
// 'source', 'image', 'tcm-profile', 'ayurveda-profile', 'western-profile'
```

## Complete Example

```typescript
import { GraphBuilder, GraphIndex } from '@herbapedia/data/graph'

// Build the graph
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1'
})
await builder.build()

// Create index API
const index = new GraphIndex(builder.getRegistry())

// Get statistics
const stats = index.getStats()
console.log(`Total nodes: ${stats.totalNodes}`)
console.log(`Species: ${stats.byType.species}`)
console.log(`TCM profiles: ${stats.byType.tcm_profile}`)

// List all TCM profiles
const tcmProfiles = index.listProfiles('tcm')
console.log(`Found ${tcmProfiles.length} TCM profiles`)

// Build search index
index.buildSearchIndex()

// Search for ginseng-related items
const results = index.search('ginseng')
console.log(`Search results: ${results.length}`)
for (const result of results.slice(0, 5)) {
  console.log(`  - ${result.node['@id']} (score: ${result.score})`)
}

// Search by field
const sweetHerbs = index.searchByField('pinyin', 'gan')
console.log(`Herbs with 'gan' in pinyin: ${sweetHerbs.length}`)

// Search by criteria
const warmHerbs = index.searchByCriteria({
  medicalSystem: 'tcm'
})
console.log(`TCM herbs: ${warmHerbs.length}`)

// Generate index for API
const speciesIndexData = index.generateIndex('species')
console.log(`Species index: ${speciesIndexData.totalItems} items`)

// List vocabulary
const flavors = index.listVocabulary('tcm', 'flavor')
console.log(`TCM flavors: ${flavors.map(f => f.prefLabel).join(', ')}`)

const natures = index.listVocabulary('tcm', 'nature')
console.log(`TCM natures: ${natures.map(n => n.prefLabel).join(', ')}`)
```

## Search Index Details

The search index is built using lunr.js and indexes the following fields:

| Field | Description |
|-------|-------------|
| `content` | Combined searchable content |
| `name` | Node names (all languages) |
| `scientificName` | Scientific/botanical names |
| `pinyin` | Chinese pinyin names |
| `slug` | URL-friendly identifier |

### Search Query Syntax

The search supports lunr query syntax:

```typescript
// Simple term
index.search('ginseng')

// Multiple terms (AND)
index.search('ginseng root')

// Field-specific
index.search('pinyin:ren')

// Wildcards
index.search('gins*')

// Fuzzy matching
index.search('ginseng~2')
```

### Fallback Search

If lunr search fails, the API falls back to simple string matching across all searchable fields.

## Return Types

All list methods return `GraphNode[]` where `GraphNode` is a JSON-LD compatible object with:
- `@id: string` - The node's IRI
- `@type: string[]` - The node's types
- Additional properties specific to node type

Search methods return `SearchResult[]` with:
- `node: GraphNode` - The matching node
- `score: number` - Relevance score
- `matchCount: number` - Number of matched terms

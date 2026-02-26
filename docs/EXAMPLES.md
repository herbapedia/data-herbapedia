# Usage Examples

This document provides practical examples for using the Herbapedia Knowledge Graph API.

## Setup

All examples assume you have initialized the graph:

```typescript
import {
  GraphBuilder,
  GraphQuery,
  GraphTraversal,
  GraphIndex
} from '@herbapedia/data/graph'

// Build the graph
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1',
  validate: true,
  verbose: false
})

await builder.build()
const registry = builder.getRegistry()

// Create API instances
const query = new GraphQuery(registry)
const traversal = new GraphTraversal(registry)
const index = new GraphIndex(registry)
```

## Basic Queries

### Get a Species by Slug

```typescript
const ginseng = query.getSpecies('panax-ginseng')

if (ginseng) {
  console.log('Scientific Name:', ginseng.scientificName)
  console.log('English Name:', ginseng.name?.en)
  console.log('Chinese Name:', ginseng.name?.zh)
  console.log('Family:', ginseng.family)
}
```

### Get a Species by Scientific Name

```typescript
const species = query.getSpeciesByScientificName('Panax ginseng')

if (species) {
  console.log('Found:', species['@id'])
}
```

### Get a TCM Profile

```typescript
const renShen = query.getProfile('tcm', 'ren-shen')

if (renShen) {
  console.log('Pinyin:', renShen.pinyin)
  console.log('Chinese:', renShen.name?.zh)
}
```

### Get an Ayurveda Profile

```typescript
const ashwagandha = query.getProfile('ayurveda', 'ashwagandha')

if (ashwagandha) {
  console.log('Sanskrit:', ashwagandha.sanskritName)
  console.log('English:', ashwagandha.name?.en)
}
```

### Get Vocabulary Terms

```typescript
const sweetFlavor = query.getVocabulary('tcm', 'flavor', 'sweet')

if (sweetFlavor) {
  console.log('English:', sweetFlavor.prefLabel?.en)
  console.log('Chinese:', sweetFlavor.prefLabel?.zh)
}
```

## Traversal Examples

### Find All Profiles for a Species

```typescript
const profiles = query.findProfilesForSpecies('panax-ginseng')

for (const profile of profiles) {
  if (profile['@id'].includes('/tcm/')) {
    console.log('TCM Profile:', profile.pinyin)
  } else if (profile['@id'].includes('/ayurveda/')) {
    console.log('Ayurveda Profile:', profile.sanskritName)
  } else if (profile['@id'].includes('/western/')) {
    console.log('Western Profile:', profile.commonName)
  }
}
```

### Get TCM Vocabulary for a Profile

```typescript
const profile = query.getProfile('tcm', 'ren-shen')

if (profile) {
  const vocab = traversal.getTcmVocabulary(profile['@id'])

  console.log('Nature:', vocab.natures.map(n => n.prefLabel?.en).join(', '))
  console.log('Flavors:', vocab.flavors.map(f => f.prefLabel?.en).join(', '))
  console.log('Meridians:', vocab.meridians.map(m => m.prefLabel?.en).join(', '))

  if (vocab.categories.length > 0) {
    console.log('Category:', vocab.categories[0].prefLabel?.en)
  }
}
```

### Get Ayurveda Vocabulary for a Profile

```typescript
const profile = query.getProfile('ayurveda', 'ashwagandha')

if (profile) {
  const vocab = traversal.getAyurvedaVocabulary(profile['@id'])

  console.log('Rasa:', vocab.rasas.map(r => r.prefLabel?.en).join(', '))
  console.log('Virya:', vocab.viryas.map(v => v.prefLabel?.en).join(', '))
  console.log('Vipaka:', vocab.vipakas.map(v => v.prefLabel?.en).join(', '))
  console.log('Gunas:', vocab.gunas.map(g => g.prefLabel?.en).join(', '))
  console.log('Doshas:', vocab.doshas.map(d => d.prefLabel?.en).join(', '))
}
```

### Get Chemicals in a Species

```typescript
const species = query.getSpecies('panax-ginseng')

if (species?.containsChemicals) {
  for (const ref of species.containsChemicals) {
    const chemical = query.getByIRI(ref['@id'])
    if (chemical) {
      console.log('Chemical:', chemical.name?.en)
      if (chemical.casNumber) {
        console.log('  CAS:', chemical.casNumber)
      }
    }
  }
}
```

### Get Related Nodes

```typescript
const species = query.getSpecies('panax-ginseng')

if (species) {
  const related = traversal.getRelatedNodes(species['@id'], { maxDepth: 2 })

  console.log(`Found ${related.size} related nodes`)

  for (const [iri, node] of related) {
    console.log(`  ${iri}`)
  }
}
```

### Find Path Between Nodes

```typescript
const speciesId = 'https://www.herbapedia.org/graph/species/panax-ginseng'
const meridianId = 'https://www.herbapedia.org/graph/vocab/tcm/meridian/spleen'

const path = traversal.getShortestPath(speciesId, meridianId)

if (path.length > 0) {
  console.log('Path found:')
  path.forEach((iri, i) => {
    console.log(`  ${i + 1}. ${iri}`)
  })
} else {
  console.log('No path found')
}
```

## Index and Search Examples

### List All Species

```typescript
const allSpecies = index.listSpecies()

console.log(`Total species: ${allSpecies.length}`)

for (const species of allSpecies.slice(0, 10)) {
  console.log(`- ${species.scientificName} (${species.slug})`)
}
```

### List Profiles by System

```typescript
const tcmProfiles = index.listProfiles('tcm')
const ayurvedaProfiles = index.listProfiles('ayurveda')
const westernProfiles = index.listProfiles('western')

console.log(`TCM profiles: ${tcmProfiles.length}`)
console.log(`Ayurveda profiles: ${ayurvedaProfiles.length}`)
console.log(`Western profiles: ${westernProfiles.length}`)
```

### List Vocabulary

```typescript
const flavors = index.listVocabulary('tcm', 'flavor')
const natures = index.listVocabulary('tcm', 'nature')
const meridians = index.listVocabulary('tcm', 'meridian')

console.log('TCM Flavors:', flavors.map(f => f.value).join(', '))
console.log('TCM Natures:', natures.map(n => n.value).join(', '))
console.log('TCM Meridians:', meridians.map(m => m.value).join(', '))
```

### Full-Text Search

```typescript
// Build the search index first
index.buildSearchIndex()

// Search for ginseng
const results = index.search('ginseng')

console.log(`Found ${results.length} results`)

for (const result of results.slice(0, 5)) {
  console.log(`- ${result.node['@id']} (score: ${result.score})`)
}
```

### Search by Field

```typescript
// Search by pinyin
const shenHerbs = index.searchByField('pinyin', 'shen')

console.log(`Found ${shenHerbs.length} herbs with 'shen' in pinyin`)

// Search by scientific name
const panaxSpecies = index.searchByField('scientificName', 'Panax')

console.log(`Found ${panaxSpecies.length} Panax species`)
```

### Search by Multiple Criteria

```typescript
const results = index.searchByCriteria({
  medicalSystem: 'tcm'
})

console.log(`Found ${results.length} TCM items`)
```

### Get Statistics

```typescript
const stats = index.getStats()

console.log('Graph Statistics:')
console.log(`  Total nodes: ${stats.totalNodes}`)
console.log('  By type:')
for (const [type, count] of Object.entries(stats.byType)) {
  console.log(`    ${type}: ${count}`)
}
```

## Export Examples

### Export to JSON-LD

```typescript
import { GraphExporter } from '@herbapedia/data/graph'

const exporter = new GraphExporter(registry)

// Export to files
await exporter.exportToFiles('./output', { format: 'jsonld' })

// Export aggregated files
await exporter.exportAggregated('./output', { format: 'jsonld' })
```

### Generate Index for API

```typescript
const speciesIndex = index.generateIndex('species')

console.log('Species Index:')
console.log(`  Total items: ${speciesIndex.totalItems}`)
console.log(`  First 5 IRIs:`)
for (const member of speciesIndex.member.slice(0, 5)) {
  console.log(`    ${member['@id']}`)
}
```

## CLI Examples

### Build the Graph

```bash
# Basic build
npm run build-graph

# Build with options
node scripts/build-graph.js \
  --data-root ./data-herbapedia \
  --output-dir ./api/v1 \
  --clean \
  --validate \
  --verbose
```

### Query from CLI

```bash
# Query a species
npx herbapedia query --species panax-ginseng

# Query a profile
npx herbapedia query --profile tcm:ren-shen

# Search
npx herbapedia query --search "ginseng"
```

### Get Statistics

```bash
npx herbapedia stats
```

## Integration Examples

### Express.js API Server

```typescript
import express from 'express'
import { GraphBuilder, GraphQuery, GraphIndex } from '@herbapedia/data/graph'

const app = express()

// Initialize graph at startup
let query: GraphQuery
let index: GraphIndex

async function initialize() {
  const builder = new GraphBuilder({
    dataRoot: './data-herbapedia',
    validate: true
  })
  await builder.build()

  const registry = builder.getRegistry()
  query = new GraphQuery(registry)
  index = new GraphIndex(registry)
  index.buildSearchIndex()

  console.log('Graph initialized')
}

// API endpoints
app.get('/species/:slug', (req, res) => {
  const species = query.getSpecies(req.params.slug)
  if (!species) {
    return res.status(404).json({ error: 'Species not found' })
  }
  res.json(species)
})

app.get('/profiles/:system/:slug', (req, res) => {
  const profile = query.getProfile(
    req.params.system as any,
    req.params.slug
  )
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  res.json(profile)
})

app.get('/search', (req, res) => {
  const q = req.query.q as string
  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' })
  }
  const results = index.search(q, 50)
  res.json(results)
})

// Start server
initialize().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000')
  })
})
```

### React Component Example

```typescript
import { useState, useEffect } from 'react'

interface SpeciesViewerProps {
  slug: string
}

function SpeciesViewer({ slug }: SpeciesViewerProps) {
  const [species, setSpecies] = useState<any>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const speciesRes = await fetch(`/api/species/${slug}`)
      const speciesData = await speciesRes.json()
      setSpecies(speciesData)

      const profilesRes = await fetch(`/api/species/${slug}/profiles`)
      const profilesData = await profilesRes.json()
      setProfiles(profilesData)

      setLoading(false)
    }

    loadData()
  }, [slug])

  if (loading) return <div>Loading...</div>
  if (!species) return <div>Species not found</div>

  return (
    <div>
      <h1>{species.scientificName}</h1>
      <p>{species.name?.en}</p>
      <p>Family: {species.family}</p>

      <h2>Profiles</h2>
      {profiles.map(profile => (
        <div key={profile['@id']}>
          <h3>{profile.pinyin || profile.commonName}</h3>
          <p>{profile['@id'].includes('/tcm/') ? 'TCM' :
              profile['@id'].includes('/ayurveda/') ? 'Ayurveda' : 'Western'}</p>
        </div>
      ))}
    </div>
  )
}
```

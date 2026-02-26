# Knowledge Graph API Documentation

This document provides an overview of the Herbapedia Knowledge Graph API.

## Architecture

The Knowledge Graph API provides three complementary interfaces:

### 1. GraphQuery
Retrieves nodes by specific criteria.

### 2. GraphTraversal
Navigates relationships between nodes.

### 3. GraphIndex
Lists and searches nodes with full-text capabilities.

## Usage

```typescript
import { GraphBuilder, GraphQuery, GraphTraversal, GraphIndex } from '@herbapedia/data/graph'

// Build the graph
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1'
})
await builder.build()

// Get the registry
const registry = builder.getRegistry()

// Create API instances
const query = new GraphQuery(registry)
const traversal = new GraphTraversal(registry)
const index = new GraphIndex(registry)

// Query for a species
const ginseng = query.getSpecies('panax-ginseng')
console.log(ginseng)

// Find all profiles for this species
const profiles = query.findProfilesForSpecies('panax-ginseng')

// Traverse relationships
const relatedNodes = traversal.getRelatedNodes(ginseng['@id'], { maxDepth: 2 })

// Search for nodes
const searchResults = index.search('ginseng')

// Get statistics
const stats = index.getStats()
```

## Key Concepts

### Full Normalization
Each entity appears exactly once in the graph. All relationships use @id references.

### IRI Patterns
```
https://www.herbapedia.org/graph/species/{slug}
https://www.herbapedia.org/graph/part/{slug}
https://www.herbapedia.org/graph/chemical/{slug}
https://www.herbapedia.org/graph/profile/{system}/{slug}
https://www.herbapedia.org/graph/vocab/{system}/{type}/{value}
```

### Medical Systems
- `tcm` - Traditional Chinese Medicine
- `ayurveda` - Ayurvedic medicine
- `western` - Western herbal medicine
- `unani` - Unani medicine
- `mongolian` - Traditional Mongolian medicine
- `modern` - Modern pharmacological profiles

## See Also
- [QUERY.md](./QUERY.md) - Query API reference
- [TRAVERSAL.md](./TRAVERSAL.md) - Traversal API reference
- [INDEX.md](./INDEX.md) - Index API reference

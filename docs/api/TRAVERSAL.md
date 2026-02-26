# GraphTraversal API

The GraphTraversal API provides methods to navigate relationships between nodes in the knowledge graph.

## Overview

GraphTraversal enables you to:
- Follow incoming references (nodes that reference a given node)
- Follow outgoing references (nodes that a given node references)
- Traverse specific relationship types
- Find paths between nodes
- Navigate hierarchies (ancestors/descendants)

## Constructor

```typescript
const traversal = new GraphTraversal(registry: GraphRegistry)
```

## Relationship Types

The API defines standard relationship types for traversal:

```typescript
const RelationshipType = {
  // Botanical relationships
  HAS_PART: 'hasPart',
  PART_OF: 'partOf',
  CONTAINS_CHEMICAL: 'containsChemical',
  FOUND_IN: 'foundIn',

  // Profile relationships
  DERIVED_FROM: 'derivedFrom',
  HAS_CATEGORY: 'hasCategory',
  HAS_NATURE: 'hasNature',
  HAS_FLAVOR: 'hasFlavor',
  ENTERS_MERIDIAN: 'entersMeridian',
  HAS_DOSHA: 'hasDosha',
  HAS_RASA: 'hasRasa',
  HAS_GUNA: 'hasGuna',
  HAS_VIRYA: 'hasVirya',
  HAS_VIPAKA: 'hasVipaka',
  HAS_ACTION: 'hasAction',
  HAS_ORGAN_AFFINITY: 'hasOrganAffinity',

  // Preparation relationships
  HAS_INGREDIENT: 'hasIngredient',
  INGREDIENT_IN: 'ingredientIn',

  // Vocabulary relationships
  BROADER: 'broader',
  NARROWER: 'narrower',
  RELATED: 'related',

  // General relationships
  SAME_AS: 'sameAs',
  HAS_SOURCE: 'hasSource',
  HAS_IMAGE: 'hasImage',
  DEPICTS: 'depicts',
}
```

## Reference Traversal

### getIncomingReferences

Get all nodes that reference a given node (other nodes have @id pointing to this node).

```typescript
const refs = traversal.getIncomingReferences(
  'https://www.herbapedia.org/graph/species/panax-ginseng'
)
// Returns: GraphNode[] - all nodes that reference ginseng
```

### getOutgoingReferences

Get all nodes that a given node references (this node has @id pointing to other nodes).

```typescript
const refs = traversal.getOutgoingReferences(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen'
)
// Returns: GraphNode[] - all nodes referenced by this profile
```

### hasUnresolvedReferences

Check if there are any unresolved @id references in the graph.

```typescript
const hasUnresolved = traversal.hasUnresolvedReferences()
// Returns: boolean
```

### getUnresolvedReferences

Get all unresolved reference IRIs.

```typescript
const unresolved = traversal.getUnresolvedReferences()
// Returns: string[] - IRIs that don't resolve to any node
```

## Relationship Traversal

### traverseRelationship

Traverse a specific relationship from a node.

```typescript
const meridians = traversal.traverseRelationship(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen',
  RelationshipType.ENTERS_MERIDIAN
)
// Returns: GraphNode[] - all meridian nodes this herb enters

const flavors = traversal.traverseRelationship(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen',
  'hasFlavor'
)
// Returns: GraphNode[] - all flavor nodes for this herb
```

### traverseRelationships

Traverse multiple relationships at once.

```typescript
const results = traversal.traverseRelationships(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen',
  [RelationshipType.HAS_NATURE, RelationshipType.HAS_FLAVOR, RelationshipType.ENTERS_MERIDIAN]
)
// Returns: Map<RelationshipTypeValue, GraphNode[]>
```

## Graph Navigation

### getRelatedNodes

Get all nodes related to a node within a certain depth.

```typescript
interface TraversalOptions {
  maxDepth?: number          // Default: 1
  relationships?: string[]   // Filter by relationship types
  includeStart?: boolean     // Include the starting node
  nodeTypeFilter?: string[]  // Filter by node types
}

const related = traversal.getRelatedNodes(
  'https://www.herbapedia.org/graph/species/panax-ginseng',
  { maxDepth: 2, includeStart: false }
)
// Returns: Map<string, GraphNode> - all related nodes within 2 hops
```

### getAncestors

Get ancestors of a node (following 'broader' relationships).

```typescript
const ancestors = traversal.getAncestors(
  'https://www.herbapedia.org/graph/vocab/tcm/category/tonify-qi',
  { maxDepth: 5 }
)
// Returns: GraphNode[] - broader categories
```

### getDescendants

Get descendants of a node (following 'narrower' relationships).

```typescript
const descendants = traversal.getDescendants(
  'https://www.herbapedia.org/graph/vocab/tcm/category/tonify',
  { maxDepth: 3 }
)
// Returns: GraphNode[] - narrower categories
```

## Domain-Specific Traversals

### getSpeciesForProfile

Get all species that a profile is derived from.

```typescript
const species = traversal.getSpeciesForProfile(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen'
)
// Returns: GraphNode[] - the species this profile references
```

### getProfilesForSpecies

Get all profiles for a species (inverse of derivedFrom).

```typescript
const profiles = traversal.getProfilesForSpecies(
  'https://www.herbapedia.org/graph/species/panax-ginseng'
)
// Returns: GraphNode[] - all TCM, Ayurveda, Western profiles for this species
```

### getChemicals

Get all chemicals in a species or part.

```typescript
const chemicals = traversal.getChemicals(
  'https://www.herbapedia.org/graph/species/panax-ginseng'
)
// Returns: GraphNode[] - all chemical compounds
```

### getParts

Get all parts of a species.

```typescript
const parts = traversal.getParts(
  'https://www.herbapedia.org/graph/species/panax-ginseng'
)
// Returns: GraphNode[] - root, leaf, etc.
```

### getParentSpecies

Get the species a part belongs to.

```typescript
const species = traversal.getParentSpecies(
  'https://www.herbapedia.org/graph/part/ginseng-root'
)
// Returns: GraphNode | undefined
```

### getIngredients

Get all ingredients in a formula.

```typescript
const ingredients = traversal.getIngredients(
  'https://www.herbapedia.org/graph/formula/si-jun-zi-tang'
)
// Returns: GraphNode[] - all herbs in the formula
```

### getFormulasContaining

Get all formulas containing an ingredient.

```typescript
const formulas = traversal.getFormulasContaining(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen'
)
// Returns: GraphNode[] - all formulas containing ginseng
```

### getTcmVocabulary

Get all TCM vocabulary for a profile.

```typescript
const vocab = traversal.getTcmVocabulary(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen'
)
// Returns: { natures, flavors, meridians, categories } - each GraphNode[]
```

### getAyurvedaVocabulary

Get all Ayurveda vocabulary for a profile.

```typescript
const vocab = traversal.getAyurvedaVocabulary(
  'https://www.herbapedia.org/graph/profile/ayurveda/ashwagandha'
)
// Returns: { doshas, rasas, gunas, viryas, vipakas } - each GraphNode[]
```

## Path Finding

### getShortestPath

Find the shortest path between two nodes.

```typescript
const path = traversal.getShortestPath(
  'https://www.herbapedia.org/graph/species/panax-ginseng',
  'https://www.herbapedia.org/graph/vocab/tcm/meridian/spleen'
)
// Returns: string[] - array of IRIs forming the path, empty if no path
```

### areConnected

Check if two nodes are connected.

```typescript
const connected = traversal.areConnected(
  'https://www.herbapedia.org/graph/species/panax-ginseng',
  'https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet'
)
// Returns: boolean
```

## Complete Example

```typescript
import { GraphBuilder, GraphTraversal, RelationshipType } from '@herbapedia/data/graph'

// Build the graph
const builder = new GraphBuilder({
  dataRoot: './data-herbapedia',
  outputDir: './api/v1'
})
await builder.build()

// Create traversal API
const traversal = new GraphTraversal(builder.getRegistry())

// Find all profiles for ginseng
const ginsengId = 'https://www.herbapedia.org/graph/species/panax-ginseng'
const profiles = traversal.getProfilesForSpecies(ginsengId)

// For each TCM profile, get its vocabulary
for (const profile of profiles) {
  if (profile['@id'].includes('/tcm/')) {
    const vocab = traversal.getTcmVocabulary(profile['@id'])
    console.log(`Profile: ${profile.pinyin}`)
    console.log(`  Nature: ${vocab.natures.map(n => n.prefLabel).join(', ')}`)
    console.log(`  Flavors: ${vocab.flavors.map(f => f.prefLabel).join(', ')}`)
    console.log(`  Meridians: ${vocab.meridians.map(m => m.prefLabel).join(', ')}`)
  }
}

// Find all formulas containing ginseng
const formulas = traversal.getFormulasContaining(
  'https://www.herbapedia.org/graph/profile/tcm/ren-shen'
)
console.log(`Found ${formulas.length} formulas containing ginseng`)

// Get all related nodes within 2 hops
const related = traversal.getRelatedNodes(ginsengId, { maxDepth: 2 })
console.log(`Found ${related.size} related nodes`)
```

## Return Types

All traversal methods return either:
- `GraphNode[]` - For multi-node results
- `GraphNode | undefined` - For single node results
- `Map<string, GraphNode>` - For related node collections
- `string[]` - For path/IRI results
- `boolean` - For connectivity checks

The `GraphNode` type is a JSON-LD compatible object with:
- `@id: string` - The node's IRI
- `@type: string[]` - The node's types
- Additional properties specific to node type

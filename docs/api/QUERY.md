# GraphQuery API

The document describes the Query API for retrieving nodes from the knowledge graph.

## Overview

GraphQuery provides methods to retrieve nodes by various criteria:
- By slug (human-readable identifier)
- By IRI (full Internationalized Resource Identifier)
- By system and type (for profiles and vocabulary)
- Related nodes (profiles for a species, etc.)

## Constructor

```typescript
const query = new GraphQuery(registry: GraphRegistry)
```

## Botanical Node Queries

### getSpecies

Retrieves a species node by its slug.

```typescript
const ginseng = query.getSpecies('panax-ginseng')
// Returns: GraphNode | undefined
```

### getSpeciesByScientificName

Retrieves a species node by its scientific name (case-insensitive).

```typescript
const ginseng = query.getSpeciesByScientificName('Panax ginseng')
// Returns: GraphNode | undefined
```

### getPart

Retrieves a part node by its slug.

```typescript
const root = query.getPart('root')
// Returns: GraphNode | undefined
```

### getChemical

Retrieves a chemical compound node by its slug.

```typescript
const ginsenosides = query.getChemical('ginsenosides')
// Returns: GraphNode | undefined
```

### getChemicalByCasNumber

Retrieves a chemical by its CAS Registry Number.

```typescript
const chemical = query.getChemicalByCasNumber('22327-92-2')
// Returns: GraphNode | undefined
```

## Preparation Node Queries

### getPreparation

Retrieves a preparation node by its slug.

```typescript
const driedRoot = query.getPreparation('dried-ginseng-root')
// Returns: GraphNode | undefined
```

### getFormula

Retrieves a formula node by its slug.

```typescript
const siJunZi = query.getFormula('si-jun-zi')
// Returns: GraphNode | undefined
```

## Profile Node Queries

### getProfile

Retrieves a profile node by medical system and slug.

```typescript
const renShen = query.getProfile('tcm', 'ren-shen')
const ashwagandha = query.getProfile('ayurveda', 'ashwagandha')
const ginsengWestern = query.getProfile('western', 'ginseng')
// Returns: GraphNode | undefined
```

### getTcmProfileByPinyin

Retrieves a TCM profile by its pinyin name.

```typescript
const renShen = query.getTcmProfileByPinyin('Rén Shēn')
// Returns: GraphNode | undefined
```

### getProfilesBySystem

Retrieves all profiles for a given medical system.

```typescript
const tcmProfiles = query.getProfilesBySystem('tcm')
// Returns: GraphNode[]
```

### findProfilesForSpecies

Finds all profiles that reference a species.

```typescript
const profiles = query.findProfilesForSpecies('panax-ginseng')
// Returns: GraphNode[] - all profiles (TCM, Ayurveda, Western, etc.)
```

### findPreparationsForSpecies

Finds all preparations that reference a species.

```typescript
const preparations = query.findPreparationsForSpecies('panax-ginseng')
// Returns: GraphNode[]
```

### findFormulasContaining

Finds all formulas that contain a specific ingredient.

```typescript
const formulas = query.findFormulasContaining('ren-shen', NodeType.TCM_PROFILE)
// Returns: GraphNode[]
```

## Vocabulary Node Queries

### getVocabulary

Retrieves a vocabulary term by system, type, and value.

```typescript
const sweetFlavor = query.getVocabulary('tcm', 'flavor', 'sweet')
const vata = query.getVocabulary('ayurveda', 'dosha', 'vata')
// Returns: GraphNode | undefined
```

### getVocabularyByType

Retrieves all vocabulary terms for a system and type.

```typescript
const flavors = query.getVocabularyByType('tcm', 'flavor')
// Returns: GraphNode[]
```

## Generic Node Queries

### getByIRI

Retrieves any node by its full IRI.

```typescript
const node = query.getByIRI('https://www.herbapedia.org/graph/species/panax-ginseng')
// Returns: GraphNode | undefined
```

### getBySlug

Searches all registries to find a node by slug.

```typescript
const node = query.getBySlug('panax-ginseng')
// Returns: GraphNode | undefined
```

### exists

Checks if a node exists in the graph.

```typescript
const exists = query.exists('https://www.herbapedia.org/graph/species/panax-ginseng')
// Returns: boolean
```

## Return Types

All query methods return either:
- `GraphNode | undefined` - For single node queries
- `GraphNode[]` - For multi-node queries
- `boolean` - For existence checks

The `GraphNode` type is a JSON-LD compatible object with:
- `@id: string` - The node's IRI
- `@type: string[]` - The node's types
- `@context?: string | object` - Optional JSON-LD context
- Additional properties specific to node type

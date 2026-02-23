# Herbapedia Data Package API Documentation

This document provides comprehensive API documentation for using the `@herbapedia/data` package.

## Installation

```bash
npm install @herbapedia/data
# or
pnpm add @herbapedia/data
# or
yarn add @herbapedia/data
```

## Quick Start

```typescript
import { HerbapediaDataset } from '@herbapedia/data'

// Initialize the dataset with path to data directory
const dataset = new HerbapediaDataset('./path/to/data-herbapedia')

// Load a plant species
const ginger = dataset.getPlantSpecies('ginger')
console.log(ginger?.scientificName) // "Zingiber officinale"

// Get all system profiles for a preparation
const profiles = dataset.getAllProfilesForPreparation('dried-ginger-rhizome')
console.log(profiles.tcm?.pinyin)      // "Gān Jiāng"
console.log(profiles.western?.name)    // "Ginger"
```

---

## HerbapediaDataset Class

The main class for querying the Herbapedia dataset.

### Constructor

```typescript
constructor(dataPath: string)
```

Creates a new HerbapediaDataset instance.

**Parameters:**
- `dataPath` - Path to the root of the data-herbapedia repository

**Example:**
```typescript
const dataset = new HerbapediaDataset('./data-herbapedia')
```

---

## Botanical Entity Methods

### getPlantSpecies

```typescript
getPlantSpecies(slug: string): PlantSpecies | null
```

Load a plant species by its slug.

**Parameters:**
- `slug` - The species slug (e.g., "ginger", "ginseng")

**Returns:** `PlantSpecies` object or `null` if not found

**Example:**
```typescript
const ginger = dataset.getPlantSpecies('ginger')
if (ginger) {
  console.log(ginger.scientificName) // "Zingiber officinale"
  console.log(ginger.name.en)        // "Ginger"
  console.log(ginger.family)         // "Zingiberaceae"
}
```

---

### getPlantPart

```typescript
getPlantPart(slug: string): PlantPart | null
```

Load a plant part by its slug.

**Parameters:**
- `slug` - The part slug (e.g., "ginger-rhizome")

**Returns:** `PlantPart` object or `null` if not found

**Example:**
```typescript
const rhizome = dataset.getPlantPart('ginger-rhizome')
if (rhizome) {
  console.log(rhizome.partType) // "rhizome"
  console.log(rhizome.partOf)   // Reference to parent species
}
```

---

### getChemicalCompound

```typescript
getChemicalCompound(slug: string): ChemicalCompound | null
```

Load a chemical compound by its slug.

**Parameters:**
- `slug` - The compound slug (e.g., "gingerol")

**Returns:** `ChemicalCompound` object or `null` if not found

---

### getChemicalProfile

```typescript
getChemicalProfile(entityIri: string): ChemicalProfile | null
```

Get chemical composition profile for an entity.

**Parameters:**
- `entityIri` - The entity IRI

**Returns:** `ChemicalProfile` object or `null` if not found

---

### getDNABarcode

```typescript
getDNABarcode(speciesSlug: string): DNABarcode | null
```

Get DNA barcode data for a plant species.

**Parameters:**
- `speciesSlug` - The plant species slug

**Returns:** `DNABarcode` object or `null` if not found

---

### findByScientificName

```typescript
findByScientificName(name: string): PlantSpecies | null
```

Find a plant by its scientific name.

**Parameters:**
- `name` - The scientific name (e.g., "Zingiber officinale")

**Returns:** `PlantSpecies` object or `null` if not found

**Example:**
```typescript
const plant = dataset.findByScientificName('Panax ginseng')
console.log(plant?.name.en) // "Ginseng"
```

---

### getPartsOfPlant

```typescript
getPartsOfPlant(plantSlug: string): PlantPart[]
```

Get all parts of a plant species.

**Parameters:**
- `plantSlug` - The plant species slug

**Returns:** Array of `PlantPart` objects

**Example:**
```typescript
const parts = dataset.getPartsOfPlant('ginger')
for (const part of parts) {
  console.log(part.partType) // "rhizome", "root", "leaf", etc.
}
```

---

### getPlantsContainingChemical

```typescript
getPlantsContainingChemical(chemSlug: string): PlantSpecies[]
```

Find all plants containing a specific chemical compound.

**Parameters:**
- `chemSlug` - The chemical compound slug

**Returns:** Array of `PlantSpecies` objects

---

### searchPlants

```typescript
searchPlants(query: string): PlantSpecies[]
```

Search plants by name (scientific or common name).

**Parameters:**
- `query` - Search query string

**Returns:** Array of matching `PlantSpecies` objects

**Example:**
```typescript
const results = dataset.searchPlants('gin')
// Returns: [Ginger, Ginseng, ...]
```

---

## Herbal Preparation Methods

### getPreparation

```typescript
getPreparation(slug: string): HerbalPreparation | null
```

Load an herbal preparation by its slug.

**Parameters:**
- `slug` - The preparation slug (e.g., "dried-ginger-rhizome")

**Returns:** `HerbalPreparation` object or `null` if not found

**Example:**
```typescript
const prep = dataset.getPreparation('dried-ginger-rhizome')
if (prep) {
  console.log(prep.name.en)           // "Dried Ginger Rhizome"
  console.log(prep.derivedFrom)       // Source plant part
  console.log(prep.hasTCMProfile)     // TCM profile reference
}
```

---

### getPreparationsForPlant

```typescript
getPreparationsForPlant(plantSlug: string): HerbalPreparation[]
```

Get all preparations derived from a specific plant species.

**Parameters:**
- `plantSlug` - The plant species slug

**Returns:** Array of `HerbalPreparation` objects

**Example:**
```typescript
const preps = dataset.getPreparationsForPlant('ginger')
// Returns: [dried-ginger-rhizome, fresh-ginger-rhizome, ...]
```

---

### getPreparationsForPart

```typescript
getPreparationsForPart(partSlug: string): HerbalPreparation[]
```

Get all preparations derived from a specific plant part.

**Parameters:**
- `partSlug` - The plant part slug

**Returns:** Array of `HerbalPreparation` objects

---

### searchPreparations

```typescript
searchPreparations(query: string): HerbalPreparation[]
```

Search preparations by name.

**Parameters:**
- `query` - Search query string

**Returns:** Array of matching `HerbalPreparation` objects

---

### getSourcePlant

```typescript
getSourcePlant(prepSlug: string): PlantSpecies | null
```

Get the source plant species for a preparation.

**Parameters:**
- `prepSlug` - The preparation slug

**Returns:** `PlantSpecies` object or `null`

**Example:**
```typescript
const plant = dataset.getSourcePlant('dried-ginger-rhizome')
console.log(plant?.scientificName) // "Zingiber officinale"
```

---

### getSourcePart

```typescript
getSourcePart(prepSlug: string): PlantPart | null
```

Get the specific plant part used in a preparation.

**Parameters:**
- `prepSlug` - The preparation slug

**Returns:** `PlantPart` object or `null`

---

## Profile Query Methods

### getTCMProfile

```typescript
getTCMProfile(slug: string): TCMProfile | null
```

Load a TCM profile by its slug.

**Parameters:**
- `slug` - The TCM profile slug (e.g., "dried-ginger", "ren-shen")

**Returns:** `TCMProfile` object or `null` if not found

**Example:**
```typescript
const profile = dataset.getTCMProfile('dried-ginger')
if (profile) {
  console.log(profile.pinyin)         // "Gān Jiāng"
  console.log(profile.hasNature)      // { "@id": "tcm/nature/hot" }
  console.log(profile.entersMeridian) // Array of meridian references
}
```

---

### getWesternProfile

```typescript
getWesternProfile(slug: string): WesternHerbalProfile | null
```

Load a Western herbal profile by its slug.

**Parameters:**
- `slug` - The Western profile slug

**Returns:** `WesternHerbalProfile` object or `null` if not found

**Example:**
```typescript
const profile = dataset.getWesternProfile('ginger')
if (profile) {
  console.log(profile.hasAction)        // Array of action references
  console.log(profile.hasOrganAffinity) // Array of organ references
}
```

---

### getAyurvedaProfile

```typescript
getAyurvedaProfile(slug: string): AyurvedaProfile | null
```

Load an Ayurveda profile by its slug.

**Parameters:**
- `slug` - The Ayurveda profile slug (e.g., "nagara", "haridra")

**Returns:** `AyurvedaProfile` object or `null` if not found

---

### getPersianProfile

```typescript
getPersianProfile(slug: string): PersianProfile | null
```

Load a Persian (TPM) profile by its slug.

**Parameters:**
- `slug` - The Persian profile slug (e.g., "zanjabil")

**Returns:** `PersianProfile` object or `null` if not found

---

### getMongolianProfile

```typescript
getMongolianProfile(slug: string): MongolianProfile | null
```

Load a Mongolian profile by its slug.

**Parameters:**
- `slug` - The Mongolian profile slug (e.g., "gaa")

**Returns:** `MongolianProfile` object or `null` if not found

---

### getAllProfilesForPreparation

```typescript
getAllProfilesForPreparation(prepSlug: string): ExtendedSystemProfiles
```

Get all medicine system profiles for a preparation.

**Parameters:**
- `prepSlug` - The preparation slug

**Returns:** Object containing all available profiles

**Example:**
```typescript
const profiles = dataset.getAllProfilesForPreparation('dried-ginger-rhizome')

if (profiles.tcm) {
  console.log(profiles.tcm.pinyin) // "Gān Jiāng"
}

if (profiles.western) {
  console.log(profiles.western.hasAction)
}

if (profiles.ayurveda) {
  console.log(profiles.ayurveda.sanskritName)
}

if (profiles.persian) {
  console.log(profiles.persian.persianName)
}

if (profiles.mongolian) {
  console.log(profiles.mongolian.mongolianName)
}
```

---

## Cross-Reference Methods

### TCM Cross-References

#### getTCMByNature

```typescript
getTCMByNature(nature: string): TCMProfile[]
```

Find all TCM herbs with a specific thermal nature.

**Parameters:**
- `nature` - The nature slug: "hot", "warm", "neutral", "cool", "cold"

**Returns:** Array of `TCMProfile` objects

**Example:**
```typescript
const hotHerbs = dataset.getTCMByNature('hot')
const warmHerbs = dataset.getTCMByNature('warm')
```

---

#### getTCMByCategory

```typescript
getTCMByCategory(category: string): TCMProfile[]
```

Find all TCM herbs in a specific category.

**Parameters:**
- `category` - The category slug (e.g., "tonify-qi", "clear-heat")

**Returns:** Array of `TCMProfile` objects

**Example:**
```typescript
const qiTonics = dataset.getTCMByCategory('tonify-qi')
// Returns herbs like Ren Shen, Huang Qi, etc.
```

---

#### getTCMByMeridian

```typescript
getTCMByMeridian(meridian: string): TCMProfile[]
```

Find all TCM herbs that enter a specific meridian.

**Parameters:**
- `meridian` - The meridian slug (e.g., "spleen", "lung", "liver")

**Returns:** Array of `TCMProfile` objects

**Example:**
```typescript
const spleenHerbs = dataset.getTCMByMeridian('spleen')
const lungHerbs = dataset.getTCMByMeridian('lung')
```

---

#### getTCMByFlavor

```typescript
getTCMByFlavor(flavor: string): TCMProfile[]
```

Find all TCM herbs with a specific flavor.

**Parameters:**
- `flavor` - The flavor slug: "sweet", "sour", "bitter", "pungent", "salty", "bland", "astringent"

**Returns:** Array of `TCMProfile` objects

---

### Western Cross-References

#### getWesternByAction

```typescript
getWesternByAction(action: string): WesternHerbalProfile[]
```

Find all Western herbs with a specific action.

**Parameters:**
- `action` - The action slug (e.g., "anti-inflammatory", "carminative", "hepatic")

**Returns:** Array of `WesternHerbalProfile` objects

**Example:**
```typescript
const antiInflammatory = dataset.getWesternByAction('anti-inflammatory')
const carminatives = dataset.getWesternByAction('carminative')
```

---

#### getWesternByOrgan

```typescript
getWesternByOrgan(organ: string): WesternHerbalProfile[]
```

Find all Western herbs with affinity for a specific organ.

**Parameters:**
- `organ` - The organ slug (e.g., "liver", "digestive", "nervous")

**Returns:** Array of `WesternHerbalProfile` objects

---

### Ayurveda Cross-References

#### getAyurvedaByDosha

```typescript
getAyurvedaByDosha(dosha: string): AyurvedaProfile[]
```

Find all Ayurveda herbs affecting a specific dosha.

**Parameters:**
- `dosha` - The dosha slug: "vata", "pitta", "kapha"

**Returns:** Array of `AyurvedaProfile` objects

**Example:**
```typescript
const vataHerbs = dataset.getAyurvedaByDosha('vata')
const pittaHerbs = dataset.getAyurvedaByDosha('pitta')
```

---

#### getAyurvedaByRasa

```typescript
getAyurvedaByRasa(rasa: string): AyurvedaProfile[]
```

Find all Ayurveda herbs with a specific rasa (taste).

**Parameters:**
- `rasa` - The rasa slug: "sweet", "sour", "salty", "pungent", "bitter", "astringent"

**Returns:** Array of `AyurvedaProfile` objects

---

### Persian Cross-References

#### getPersianByTemperament

```typescript
getPersianByTemperament(temperament: string): PersianProfile[]
```

Find all Persian herbs with a specific temperament.

**Parameters:**
- `temperament` - The temperament slug: "hot-dry", "hot-wet", "cold-dry", "cold-wet"

**Returns:** Array of `PersianProfile` objects

---

### Mongolian Cross-References

#### getMongolianByRoot

```typescript
getMongolianByRoot(root: string): MongolianProfile[]
```

Find all Mongolian herbs affecting a specific root.

**Parameters:**
- `root` - The root slug: "heyi", "xila", "badagan"

**Returns:** Array of `MongolianProfile` objects

---

## Navigation Methods

### getCombinedHerbs

```typescript
getCombinedHerbs(tcmSlug: string): TCMProfile[]
```

Get herbs commonly combined with a TCM herb in formulas.

**Parameters:**
- `tcmSlug` - The TCM profile slug

**Returns:** Array of `TCMProfile` objects

**Example:**
```typescript
const combinations = dataset.getCombinedHerbs('ren-shen')
// Returns herbs commonly paired with Ginseng
```

---

### getHerbsInCategory

```typescript
getHerbsInCategory(categorySlug: string): TCMProfile[]
```

Get all TCM herbs in the same category (alias for getTCMByCategory).

**Parameters:**
- `categorySlug` - The category slug

**Returns:** Array of `TCMProfile` objects

---

### getSimilarHerbs

```typescript
getSimilarHerbs(prepSlug: string): HerbalPreparation[]
```

Find preparations with similar therapeutic profiles based on shared actions or TCM properties.

**Parameters:**
- `prepSlug` - The preparation slug

**Returns:** Array of similar `HerbalPreparation` objects

**Example:**
```typescript
const similar = dataset.getSimilarHerbs('dried-ginger-rhizome')
// Returns herbs with similar warming, digestive properties
```

---

### getSubstitutes

```typescript
getSubstitutes(prepSlug: string): HerbalPreparation[]
```

Find potential substitutes for a preparation based on similar category and properties.

**Parameters:**
- `prepSlug` - The preparation slug

**Returns:** Array of substitute `HerbalPreparation` objects

---

## Reference Data Methods

### TCM Reference Data

```typescript
// Get all TCM thermal natures
getTCMNatures(): TCMNature[]

// Get all TCM flavors (五味)
getTCMFlavors(): TCMFlavor[]

// Get all TCM meridians (十二经脉)
getTCMMeridians(): TCMMeridian[]

// Get all TCM herb categories
getTCMCategories(): TCMCategory[]
```

**Example:**
```typescript
const natures = dataset.getTCMNatures()
for (const nature of natures) {
  console.log(nature.name.en)  // "Hot", "Warm", "Neutral", etc.
}
```

---

### Western Reference Data

```typescript
// Get all Western herbal actions
getWesternActions(): WesternAction[]

// Get all Western organ affinities
getWesternOrgans(): WesternOrgan[]

// Get all Western body systems
getWesternSystems(): WesternSystem[]
```

---

### Ayurveda Reference Data

```typescript
// Get all rasas (六味)
getAyurvedaRasas(): AyurvedaRasa[]

// Get all gunas (十性)
getAyurvedaGunas(): AyurvedaGuna[]

// Get all viryas (两力 - heating/cooling)
getAyurvedaViryas(): AyurvedaVirya[]

// Get all vipakas (三消化后味)
getAyurvedaVipakas(): AyurvedaVipaka[]

// Get all doshas (三体质)
getAyurvedaDoshas(): AyurvedaDosha[]
```

---

### Persian Reference Data

```typescript
// Get all temperaments (四气质)
getPersianTemperaments(): PersianTemperament[]
```

---

### Mongolian Reference Data

```typescript
// Get all three roots (三根)
getMongolianRoots(): MongolianRoot[]
```

---

## Index & Utility Methods

### getIndex

```typescript
getIndex(): DatasetIndex
```

Get the dataset index with counts and cross-reference mappings.

**Returns:** `DatasetIndex` object

**Example:**
```typescript
const index = dataset.getIndex()
console.log(index.counts.plantSpecies)    // 3
console.log(index.counts.tcmProfiles)     // 3
console.log(index.indexes.plantsByScientificName) // { "zingiber officinale": "ginger", ... }
```

---

### getCounts

```typescript
getCounts(): DatasetIndex['counts']
```

Get entity counts.

**Returns:** Object with counts for all entity types

**Example:**
```typescript
const counts = dataset.getCounts()
console.log(counts.plantSpecies)     // 3
console.log(counts.preparations)     // 3
console.log(counts.tcmProfiles)      // 3
console.log(counts.westernProfiles)  // 3
console.log(counts.ayurvedaProfiles) // 2
console.log(counts.persianProfiles)  // 1
console.log(counts.mongolianProfiles)// 1
```

---

### clearCache

```typescript
clearCache(): void
```

Clear the entity cache to free memory or reload data.

---

### getCacheStats

```typescript
getCacheStats(): { size: number; keys: string[] }
```

Get cache statistics for debugging.

---

## Type Definitions

### Core Types

```typescript
interface Entity {
  '@id': string
  '@type': string[]
  '@context'?: string | string[]
  name?: LanguageMap
  description?: LanguageMap
}

interface LanguageMap {
  [langCode: string]: string
}
// Examples: { "en": "Ginger", "zh-Hant": "薑" }

interface IRIReference {
  '@id': string
}
```

### Botanical Types

```typescript
interface PlantSpecies extends Entity {
  '@id': `botanical/species/${string}`
  scientificName: string
  family?: string
  gbifID?: string
  hasParts?: IRIReference[]
  containsChemical?: IRIReference[]
}

interface PlantPart extends Entity {
  '@id': `botanical/part/${string}`
  partType: string
  partOf: IRIReference
}

interface ChemicalCompound extends Entity {
  '@id': `botanical/chemical/${string}`
  molecularFormula?: string
  inchiKey?: string
}
```

### Preparation Types

```typescript
interface HerbalPreparation extends Entity {
  '@id': `preparation/${string}`
  derivedFrom: IRIReference[]
  hasTCMProfile?: IRIReference[]
  hasWesternProfile?: IRIReference[]
  hasAyurvedaProfile?: IRIReference[]
  hasPersianProfile?: IRIReference[]
  hasMongolianProfile?: IRIReference[]
}
```

### Profile Types

```typescript
interface TCMProfile extends Entity {
  '@id': `tcm/profile/${string}`
  profiles: IRIReference
  pinyin: string
  hasCategory: IRIReference
  hasNature: IRIReference
  hasFlavor: IRIReference[]
  entersMeridian?: IRIReference[]
}

interface WesternHerbalProfile extends Entity {
  '@id': `western/profile/${string}`
  profiles: IRIReference
  hasAction?: IRIReference[]
  hasOrganAffinity?: IRIReference[]
}

interface AyurvedaProfile extends Entity {
  '@id': `ayurveda/profile/${string}`
  profiles: IRIReference
  hasRasa: IRIReference[]
  hasVirya: IRIReference
  hasVipaka: IRIReference
  hasGuna?: IRIReference[]
  affectsDosha?: Record<string, { effect: string }>
}

interface PersianProfile extends Entity {
  '@id': `persian/profile/${string}`
  profiles: IRIReference
  hasTemperament: IRIReference
  temperamentDegree?: 1 | 2 | 3 | 4
}

interface MongolianProfile extends Entity {
  '@id': `mongolian/profile/${string}`
  profiles: IRIReference
  affectsRoots?: Record<string, { effect: string }>
}
```

---

## Error Handling

All methods return `null` or empty arrays when data is not found:

```typescript
const plant = dataset.getPlantSpecies('non-existent')
if (plant === null) {
  console.log('Plant not found')
}

const profiles = dataset.getTCMByCategory('unknown')
// Returns: [] (empty array)
```

---

## Performance Tips

1. **Reuse dataset instance**: Create one instance and reuse it
2. **Use caching**: The dataset caches loaded entities automatically
3. **Clear cache when needed**: Use `clearCache()` after bulk updates
4. **Use index methods**: Cross-reference methods use the index for faster lookups

```typescript
// Good - reuse instance
const dataset = new HerbapediaDataset('./data')
const ginger = dataset.getPlantSpecies('ginger')
const ginseng = dataset.getPlantSpecies('ginseng')

// Check cache stats
const stats = dataset.getCacheStats()
console.log(`Cache has ${stats.size} entities`)
```

---

## Complete Example

```typescript
import { HerbapediaDataset } from '@herbapedia/data'

const dataset = new HerbapediaDataset('./data')

// Find a plant by scientific name
const ginger = dataset.findByScientificName('Zingiber officinale')
if (!ginger) {
  console.log('Ginger not found')
  process.exit(1)
}

console.log(`Found: ${ginger.name.en} (${ginger.scientificName})`)

// Get preparations from this plant
const preps = dataset.getPreparationsForPlant('ginger')
console.log(`\nPreparations (${preps.length}):`)
for (const prep of preps) {
  console.log(`  - ${prep.name.en}`)
}

// Get all profiles for first preparation
if (preps.length > 0) {
  const profiles = dataset.getAllProfilesForPreparation(
    preps[0]['@id'].split('/').pop()
  )

  console.log('\nTCM Profile:')
  if (profiles.tcm) {
    console.log(`  Pinyin: ${profiles.tcm.pinyin}`)
    console.log(`  Category: ${profiles.tcm.hasCategory?.['@id']}`)
  }

  console.log('\nWestern Profile:')
  if (profiles.western) {
    console.log(`  Actions: ${profiles.western.hasAction?.length || 0}`)
  }
}

// Find similar herbs
const similar = dataset.getSimilarHerbs('dried-ginger-rhizome')
console.log(`\nSimilar herbs: ${similar.length}`)

// Get entity counts
const counts = dataset.getCounts()
console.log('\nDataset Statistics:')
console.log(`  Plant Species: ${counts.plantSpecies}`)
console.log(`  Preparations: ${counts.preparations}`)
console.log(`  TCM Profiles: ${counts.tcmProfiles}`)
console.log(`  Western Profiles: ${counts.westernProfiles}`)
```

---

## License

Content is licensed under CC BY-SA 4.0.

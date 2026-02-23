# Herbapedia Schema Documentation

This document provides comprehensive documentation for all entity schemas in the Herbapedia dataset.

## Schema Architecture

All schemas follow a consistent inheritance pattern:

```
Entity (base)
├── BotanicalEntity (abstract)
│   ├── PlantSpecies
│   ├── PlantPart
│   ├── ChemicalCompound
│   ├── ChemicalProfile
│   └── DNABarcode
├── HerbalPreparation (central pivot)
├── MedicineSystemProfile (abstract)
│   ├── TCMProfile
│   ├── WesternHerbalProfile
│   ├── AyurvedaProfile
│   ├── PersianProfile
│   └── MongolianProfile
└── ReferenceEntity (abstract)
    ├── TCMReference (Nature, Flavor, Meridian, Category)
    ├── WesternReference (Action, Organ, System)
    ├── AyurvedaReference (Rasa, Guna, Virya, Vipaka, Dosha, Prabhava)
    ├── PersianReference (Temperament, Element, Degree)
    └── MongolianReference (Root, Element, Taste, Potency)
```

---

## Core Types

### Entity (Base)

All entities inherit from the base Entity type.

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Unique IRI identifier |
| `@type` | array | Entity type(s) |
| `name` | LanguageMap | Multilingual name |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `description` | LanguageMap | Multilingual description |
| `image` | string | Image path |
| `sameAs` | IRIReference[] | External authority links |
| `provenance` | object | Creation/modification metadata |

### LanguageMap

A map of BCP 47 language codes to strings.

```json
{
  "en": "Ginger",
  "zh-Hant": "薑",
  "zh-Hans": "姜",
  "sa": "नागर",
  "hi": "अदरक"
}
```

**Supported Languages:**
- `en` - English
- `zh-Hant` - Traditional Chinese (繁體中文)
- `zh-Hans` - Simplified Chinese (简体中文)
- `sa` - Sanskrit (संस्कृतम्)
- `hi` - Hindi (हिन्दी)
- `fa` - Persian (فارسی)
- `mn` - Mongolian (Монгол)

### IRIReference

A reference to another entity via its IRI.

```json
{ "@id": "botanical/species/ginger" }
```

---

## Botanical Entities

### PlantSpecies

**IRI Pattern:** `botanical/species/{slug}`
**Directory:** `entities/botanical/species/{slug}/entity.jsonld`
**Context:** `schema/context/botany.jsonld`

Contains ONLY botanical facts - no therapeutic information.

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `botanical/species/{slug}` |
| `@type` | array | Must include `botany:PlantSpecies` |
| `name` | LanguageMap | Multilingual common name |
| `scientificName` | string | Latin binomial (genus + species) |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `scientificNameAuthorship` | string | Author citation (e.g., "Roscoe") |
| `family` | string | Botanical family (e.g., "Zingiberaceae") |
| `genus` | string | Botanical genus |
| `specificEpithet` | string | Species epithet |
| `gbifID` | string | GBIF species identifier |
| `powoID` | string | Plants of the World Online ID |
| `wikidataID` | string | Wikidata Q number |
| `hasParts` | IRIReference[] | Links to PlantPart entities |
| `containsChemical` | IRIReference[] | Links to ChemicalCompound entities |
| `hasChemicalProfile` | IRIReference | Link to ChemicalProfile |
| `hasDNABarcode` | IRIReference | Link to DNABarcode |
| `habitat` | LanguageMap | Natural habitat description |
| `origin` | LanguageMap | Geographic origin |
| `growthForm` | string | Enum: herb, shrub, tree, vine, climber |
| `lifecycle` | string | Enum: annual, biennial, perennial |
| `conservationStatus` | string | IUCN status: LC, NT, VU, EN, CR, EW, EX |

**Example:**
```json
{
  "@context": "../../../schema/context/botany.jsonld",
  "@id": "botanical/species/ginger",
  "@type": ["botany:PlantSpecies", "schema:Plant"],
  "scientificName": "Zingiber officinale",
  "family": "Zingiberaceae",
  "name": { "en": "Ginger", "zh-Hant": "薑" },
  "hasParts": [{ "@id": "botanical/part/ginger-rhizome" }],
  "hasChemicalProfile": { "@id": "botanical/chemical-profile/ginger-rhizome" },
  "hasDNABarcode": { "@id": "botanical/barcode/ginger" }
}
```

### PlantPart

**IRI Pattern:** `botanical/part/{species-slug}-{part-type}`
**Directory:** `entities/botanical/parts/{slug}/entity.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `botanical/part/{slug}` |
| `@type` | array | Must include `botany:PlantPart` |
| `name` | LanguageMap | Multilingual name |
| `partOf` | IRIReference | Parent PlantSpecies |
| `partType` | string | Controlled vocabulary |

**Part Types (Controlled Vocabulary):**
| Underground | Aerial | Exudates | Aggregate |
|-------------|--------|----------|-----------|
| root | stem | resin | whole-plant |
| rhizome | bark | gum | aerial-part |
| tuber | branch | sap | underground-part |
| bulb | twig | latex | |
| corm | leaf | oil-gland | |
| | needle | trichome | |
| | flower | spore | |
| | flower-bud | | |
| | fruit | | |
| | seed | | |

**Example:**
```json
{
  "@id": "botanical/part/ginger-rhizome",
  "@type": ["botany:PlantPart"],
  "partOf": { "@id": "botanical/species/ginger" },
  "partType": "rhizome",
  "name": { "en": "Ginger Rhizome" },
  "containsChemical": [
    { "@id": "botanical/chemical/gingerol" }
  ]
}
```

### ChemicalCompound

**IRI Pattern:** `botanical/chemical/{slug}`
**Directory:** `entities/botanical/chemicals/{slug}/entity.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `botanical/chemical/{slug}` |
| `@type` | array | Must include `botany:ChemicalCompound` |
| `name` | LanguageMap | Compound name |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `molecularFormula` | string | Chemical formula (e.g., "C17H26O4") |
| `inchiKey` | string | InChIKey identifier |
| `pubchemCID` | string | PubChem Compound ID |
| `foundIn` | IRIReference[] | Species containing this compound (bidirectional with PlantSpecies.containsChemical) |

**Example:**
```json
{
  "@id": "botanical/chemical/flavonoids",
  "@type": ["botany:ChemicalCompound", "schema:BioChemEntity"],
  "name": { "en": "Flavonoids", "zh-Hant": "類黃酮" },
  "compoundClass": "Polyphenols; Flavonoids",
  "foundIn": [
    { "@id": "botanical/species/chamomile" },
    { "@id": "botanical/species/ginkgo" },
    { "@id": "botanical/species/green-tea" }
  ]
}
```

### ChemicalProfile

**IRI Pattern:** `botanical/chemical-profile/{slug}`
**Directory:** `entities/botanical/profiles/{slug}/entity.jsonld`

Records FACTUAL chemical composition - NOT therapeutic claims.

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `botanical/chemical-profile/{slug}` |
| `@type` | array | Must include `botany:ChemicalProfile` |
| `name` | LanguageMap | Profile name |
| `profileOf` | IRIReference | PlantSpecies or PlantPart |
| `hasComponent` | array | Component analysis data |

**Component Structure:**
```json
{
  "compound": { "@id": "botanical/chemical/gingerol" },
  "relativeAbundance": "major",
  "concentrationRange": { "min": 0.3, "max": 3.0, "unit": "%" },
  "detectionMethod": "HPLC"
}
```

**Example:**
```json
{
  "@id": "botanical/chemical-profile/ginger-rhizome",
  "@type": ["botany:ChemicalProfile", "schema:Dataset"],
  "profileOf": { "@id": "botanical/part/ginger-rhizome" },
  "hasComponent": [
    {
      "compound": { "@id": "botanical/chemical/gingerol" },
      "relativeAbundance": "major",
      "concentrationRange": { "min": 0.3, "max": 3.0, "unit": "%" }
    }
  ],
  "analyticalMethod": "HPLC, GC-MS"
}
```

### DNABarcode

**IRI Pattern:** `botanical/barcode/{slug}`
**Directory:** `entities/botanical/barcodes/{slug}/entity.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `botanical/barcode/{slug}` |
| `@type` | array | Must include `botany:DNABarcode` |
| `name` | LanguageMap | Barcode name |
| `barcodes` | IRIReference | Species this identifies |
| `sequence` | array | Sequence data by region |

**Sequence Region Types:**
| Region | Description |
|--------|-------------|
| `rbcL` | Plant standard barcode |
| `matK` | Higher resolution plant barcode |
| `ITS` | Internal Transcribed Spacer |
| `ITS2` | Common for medicinal plants |
| `trnL-F` | tRNA intergenic spacer |
| `trnH-psbA` | High variability region |

**Example:**
```json
{
  "@id": "botanical/barcode/ginger",
  "@type": ["botany:DNABarcode", "schema:Dataset"],
  "barcodes": { "@id": "botanical/species/ginger" },
  "sequence": [
    {
      "region": "rbcL",
      "sequence": "ATGTCACCACAAACAG...",
      "length": 555,
      "genbankAccession": "MN872614"
    }
  ],
  "adulterantDetection": {
    "canDetect": ["Curcuma longa", "Alpinia galanga"]
  }
}
```

---

## HerbalPreparation (Central Pivot)

**IRI Pattern:** `preparation/{slug}`
**Directory:** `entities/preparations/{slug}/entity.jsonld`
**Context:** `schema/context/herbal.jsonld`

The central entity connecting botanical sources to system-specific profiles.

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `preparation/{slug}` |
| `@type` | array | Must include `herbal:HerbalPreparation` |
| `name` | LanguageMap | Preparation name |
| `derivedFrom` | IRIReference[] | Botanical source(s) |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `preparationMethod` | string | How processed |
| `form` | string | Physical form |
| `hasTCMProfile` | IRIReference[] | TCM interpretation(s) |
| `hasWesternProfile` | IRIReference[] | Western interpretation(s) |
| `hasAyurvedaProfile` | IRIReference[] | Ayurveda interpretation(s) |
| `hasPersianProfile` | IRIReference[] | Persian interpretation(s) |
| `hasMongolianProfile` | IRIReference[] | Mongolian interpretation(s) |
| `relatedPreparations` | IRIReference[] | Other forms of same source |

**Preparation Methods (Controlled Vocabulary):**
| Method | Description |
|--------|-------------|
| fresh | Used without processing |
| dried | Air or heat dried |
| steamed | Steamed processing |
| roasted | Dry heat roasted |
| fried | Oil or dry fried |
| carbonized | Charred |
| fermented | Microbial fermentation |
| extracted | Solvent extraction |
| powdered | Ground to powder |
| standardized | Standardized extract |

**Preparation Forms (Controlled Vocabulary):**
| Form | Description |
|------|-------------|
| whole | Whole form |
| sliced | Sliced/cut |
| powder | Fine powder |
| granule | Granulated |
| capsule | Encapsulated |
| tablet | Compressed tablet |
| liquid | Liquid form |
| oil | Oil extract |
| extract | Concentrated extract |
| tincture | Alcohol extraction |
| tea | Tea form |
| paste | Paste form |

**Example:**
```json
{
  "@id": "preparation/dried-ginger-rhizome",
  "@type": ["herbal:HerbalPreparation", "schema:DietarySupplement"],
  "name": { "en": "Dried Ginger Rhizome", "zh-Hant": "乾薑" },
  "derivedFrom": [{ "@id": "botanical/part/ginger-rhizome" }],
  "preparationMethod": "dried",
  "form": "sliced",
  "hasTCMProfile": [{ "@id": "tcm/profile/dried-ginger" }],
  "hasWesternProfile": [{ "@id": "western/profile/ginger" }],
  "hasAyurvedaProfile": [{ "@id": "ayurveda/profile/nagara" }],
  "hasPersianProfile": [{ "@id": "persian/profile/zanjabil" }],
  "hasMongolianProfile": [{ "@id": "mongolian/profile/gaa" }]
}
```

---

## Medicine System Profiles

### TCMProfile

**IRI Pattern:** `tcm/profile/{slug}`
**Directory:** `profiles/tcm/{slug}/profile.jsonld`
**Context:** `schema/context/tcm.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `tcm/profile/{slug}` |
| `@type` | array | Must include `tcm:Herb` |
| `profiles` | IRIReference | HerbalPreparation |
| `pinyin` | string | Pinyin name |
| `hasNature` | IRIReference | Thermal nature |
| `hasFlavor` | IRIReference[] | Flavors (五味) |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `hasCategory` | IRIReference | Herb category |
| `entersMeridian` | IRIReference[] | Meridian affinities |
| `tcmFunctions` | LanguageMap | Therapeutic functions |
| `tcmTraditionalUsage` | LanguageMap | Traditional usage |
| `tcmModernResearch` | LanguageMap | Modern research |

**TCM Reference IRIs:**
| Type | Pattern | Examples |
|------|---------|----------|
| Nature | `tcm/nature/{value}` | hot, warm, neutral, cool, cold |
| Flavor | `tcm/flavor/{value}` | pungent, sweet, bitter, sour, salty |
| Meridian | `tcm/meridian/{value}` | lung, spleen, liver, kidney |
| Category | `tcm/category/{value}` | tonify-qi, clear-heat |

### WesternHerbalProfile

**IRI Pattern:** `western/profile/{slug}`
**Directory:** `profiles/western/{slug}/profile.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `western/profile/{slug}` |
| `profiles` | IRIReference | HerbalPreparation |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `hasAction` | IRIReference[] | Herbal actions |
| `hasOrganAffinity` | IRIReference[] | Organ affinities |
| `westernTraditionalUsage` | LanguageMap | Traditional usage |
| `westernModernResearch` | LanguageMap | Modern research |

### AyurvedaProfile

**IRI Pattern:** `ayurveda/profile/{slug}`
**Directory:** `profiles/ayurveda/{slug}/profile.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `ayurveda/profile/{slug}` |
| `profiles` | IRIReference | HerbalPreparation |
| `hasRasa` | IRIReference[] | Taste(s) |
| `hasVirya` | IRIReference | Potency (heating/cooling) |
| `hasVipaka` | IRIReference | Post-digestive effect |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `hasGuna` | IRIReference[] | Qualities |
| `affectsDosha` | object | Dosha effects |
| `hasPrabhava` | IRIReference | Special effect |
| `sanskritName` | string | Sanskrit name |

### PersianProfile

**IRI Pattern:** `persian/profile/{slug}`
**Directory:** `profiles/persian/{slug}/profile.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `persian/profile/{slug}` |
| `profiles` | IRIReference | HerbalPreparation |
| `hasTemperament` | IRIReference | Mizaj (temperament) |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `temperamentDegree` | number | Intensity (1-4) |
| `hasElement` | IRIReference[] | Elemental composition |
| `persianName` | string | Persian name |

### MongolianProfile

**IRI Pattern:** `mongolian/profile/{slug}`
**Directory:** `profiles/mongolian/{slug}/profile.jsonld`

**Required Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `@id` | string | Pattern: `mongolian/profile/{slug}` |
| `profiles` | IRIReference | HerbalPreparation |

**Optional Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `affectsRoots` | object | Effect on three roots |
| `hasElement` | IRIReference[] | Elements |
| `hasTaste` | IRIReference[] | Tastes |
| `hasPotency` | IRIReference[] | Potencies |

---

## IRI Reference Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `botanical/species/{slug}` | `botanical/species/ginger` | Plant species |
| `botanical/part/{slug}` | `botanical/part/ginger-rhizome` | Plant part |
| `botanical/chemical/{slug}` | `botanical/chemical/gingerol` | Chemical compound |
| `botanical/chemical-profile/{slug}` | `botanical/chemical-profile/ginger-rhizome` | Chemical profile |
| `botanical/barcode/{slug}` | `botanical/barcode/ginger` | DNA barcode |
| `preparation/{slug}` | `preparation/dried-ginger-rhizome` | Herbal preparation |
| `tcm/profile/{slug}` | `tcm/profile/dried-ginger` | TCM profile |
| `tcm/nature/{value}` | `tcm/nature/hot` | TCM thermal nature |
| `tcm/flavor/{value}` | `tcm/flavor/pungent` | TCM flavor |
| `tcm/meridian/{value}` | `tcm/meridian/spleen` | TCM meridian |
| `tcm/category/{value}` | `tcm/category/warm-interior` | TCM category |
| `western/profile/{slug}` | `western/profile/ginger` | Western profile |
| `western/action/{value}` | `western/action/carminative` | Western action |
| `western/organ/{value}` | `western/organ/digestive` | Western organ |
| `ayurveda/profile/{slug}` | `ayurveda/profile/nagara` | Ayurveda profile |
| `ayurveda/rasa/{value}` | `ayurveda/rasa/pungent` | Ayurveda taste |
| `ayurveda/guna/{value}` | `ayurveda/guna/light` | Ayurveda quality |
| `ayurveda/virya/{value}` | `ayurveda/virya/heating` | Ayurveda potency |
| `ayurveda/vipaka/{value}` | `ayurveda/vipaka/pungent` | Ayurveda post-digestive |
| `ayurveda/dosha/{value}` | `ayurveda/dosha/vata` | Ayurveda dosha |
| `persian/profile/{slug}` | `persian/profile/zanjabil` | Persian profile |
| `persian/temperament/{value}` | `persian/temperament/hot-dry` | Persian temperament |
| `mongolian/profile/{slug}` | `mongolian/profile/gaa` | Mongolian profile |
| `mongolian/root/{value}` | `mongolian/root/heyi` | Mongolian root |

---

## Validation

All schemas are validated using:

1. **JSON Schema Validation**: Structural compliance
2. **Reference Integrity**: All IRI references must resolve
3. **Content Quality**: Required fields, language map validity

Run validation:
```bash
node scripts/validate.js
```

---

## MECE Principles

### Separation of Concerns

| Entity Type | Contains | Does NOT Contain |
|-------------|----------|------------------|
| PlantSpecies | Taxonomy, distribution, morphology | Therapeutic properties |
| PlantPart | Part-specific data, constituents | System-specific properties |
| HerbalPreparation | Processing method, form | Botanical facts, therapeutic claims |
| System Profiles | Therapeutic interpretations | Botanical facts |

### No Overlaps

- Botanical data is NEVER in profiles
- Therapeutic data is NEVER in species
- Each medicine system has its own profile type
- Reference data is defined exactly once

### No Gaps

- All preparations link to botanical sources
- All profiles link to preparations
- All parts link to parent species
- Bidirectional links where appropriate

---

## Bidirectional Linking Pattern

All entity relationships follow a bidirectional linking pattern for complete traversability:

| Forward Link | Reverse Link | Example |
|--------------|--------------|---------|
| `PlantSpecies.hasParts` | `PlantPart.partOf` | ginger → ginger-rhizome |
| `PlantSpecies.containsChemical` | `ChemicalCompound.foundIn` | ginger → flavonoids |
| `PlantSpecies.hasChemicalProfile` | `ChemicalProfile.profileOf` | ginger → ginger-rhizome profile |
| `PlantSpecies.hasDNABarcode` | `DNABarcode.barcodes` | ginger → ginger barcode |
| `HerbalPreparation.hasTCMProfile` | `TCMProfile.profiles` | dried-ginger → dried-ginger TCM |
| `HerbalPreparation.hasWesternProfile` | `WesternHerbalProfile.profiles` | dried-ginger → ginger Western |

This enables queries in both directions:
- "What parts does ginger have?" → `ginger.hasParts`
- "What species does this part belong to?" → `ginger-rhizome.partOf`
- "What compounds are in chamomile?" → `chamomile.containsChemical`
- "What species contain flavonoids?" → `flavonoids.foundIn`

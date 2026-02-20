# CLAUDE.md - Herbapedia Data Repository Guidelines

## Project Overview

This is **data-herbapedia**, the authoritative JSON-LD knowledge base for medicinal plants.
It is a **dataset**, not an application. The Herbapedia website queries this dataset to render content.

### Key Architectural Principle

**Plant ≠ Medicine**

We separate the **botanical entity** from its **medicinal interpretation**:

```
Plant (Panax ginseng)
  └── Root (plant part)
        ├── TCM Profile: 人參 (Ren Shen) - tonifies Qi
        └── Ayurveda Profile: अश्वगन्धा - Rasayana
```

This enables:
1. Same plant, different parts with different properties
2. Same part, different interpretations by different systems
3. Cross-system linking and comparison
4. Integration with external botanical databases

## Directory Structure

```
data-herbapedia/
├── schema/
│   ├── context/          # JSON-LD contexts (core.jsonld, tcm.jsonld, etc.)
│   ├── shapes/           # SHACL validation shapes
│   └── vocab/            # Ontology definitions (Turtle)
│
├── entities/
│   ├── plants/           # Botanical entities (entity.jsonld per plant)
│   │   └── {slug}/
│   │       └── entity.jsonld
│   └── chemicals/        # Chemical compounds
│
├── systems/              # Traditional medicine system profiles
│   ├── tcm/herbs/        # TCM herb profiles
│   │   └── {slug}/
│   │       └── profile.jsonld
│   ├── ayurveda/dravyas/ # Ayurvedic substance profiles
│   └── western/herbs/    # Western herbalism profiles
│
├── media/
│   └── images/           # Plant images, banners
│
├── types/                # TypeScript definitions
│   ├── core.ts           # Plant, ChemicalCompound, etc.
│   ├── tcm.ts            # TCMHerbProfile, etc.
│   ├── ayurveda.ts       # AyurvedaDravyaProfile, etc.
│   └── index.ts          # Re-exports
│
└── scripts/              # Validation and build scripts
```

## Data Format

### Plant Entity (entities/plants/{slug}/entity.jsonld)

```json
{
  "@context": "../../schema/context/core.jsonld",
  "@id": "plant/ginger",
  "@type": ["schema:Plant", "herbapedia:MedicinalPlant"],
  "scientificName": "Zingiber officinale",
  "name": {
    "en": "Ginger",
    "zh-Hant": "薑",
    "zh-Hans": "姜"
  },
  "description": {
    "en": "A flowering plant whose rhizome is widely used as a spice...",
    "zh-Hant": "多年生草本植物..."
  },
  "image": "media/images/ginger/ginger.jpg",
  "sameAs": [
    { "@id": "https://www.wikidata.org/wiki/Q1097047" }
  ]
}
```

### TCM Profile (systems/tcm/herbs/{slug}/profile.jsonld)

```json
{
  "@context": ["../../schema/context/core.jsonld", "../../schema/context/tcm.jsonld"],
  "@id": "tcm/sheng-jiang",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  "derivedFromPlant": { "@id": "plant/ginger#rhizome" },
  "name": {
    "zh-Hant": "生薑",
    "zh-Hans": "生姜",
    "en": "Fresh Ginger"
  },
  "hasNature": { "@id": "nature/warm" },
  "hasFlavor": [{ "@id": "flavor/acrid" }],
  "entersMeridian": [
    { "@id": "meridian/lung" },
    { "@id": "meridian/spleen" }
  ],
  "tcmFunctions": {
    "zh-Hant": "發汗解表，溫中止嘔...",
    "en": "Releases exterior, warms middle burner..."
  }
}
```

## Content Guidelines

### Language Codes

Use these language codes consistently:
- `en` - English
- `zh-Hant` - Traditional Chinese (繁體中文)
- `zh-Hans` - Simplified Chinese (简体中文)
- `hi` - Hindi
- `sa` - Sanskrit

### System-Scoped Content

Content properties are NOT generic. They are scoped to each medicine system:

- **TCM**: `tcmFunctions`, `tcmTraditionalUsage`, `tcmModernResearch`
- **Ayurveda**: `ayurvedaTraditionalUsage`, `ayurvedaModernResearch`
- **Western**: `westernTraditionalUsage`, `westernModernResearch`

DO NOT create generic properties like `herbapedia:traditionalUsage`.

## Validation

Run validation using:
```bash
npm run validate
```

This checks:
1. JSON-LD syntax validity
2. Required fields presence
3. Language map completeness
4. Reference integrity

## Publishing Versions

This dataset is published as versioned GitHub releases:

1. Update version in package.json
2. Run validation: `npm run validate`
3. Generate distribution: `npm run build`
4. Create git tag: `git tag v1.x.x`
5. Push tag: `git push origin v1.x.x`
6. Create GitHub release with bundled data

Consumers can then fetch specific versions:
```
https://github.com/herbapedia/data-herbapedia/releases/download/v1.2.0/herbapedia-data.tar.gz
```

## TypeScript Types

Import types for type-safe access:

```typescript
import type { Plant, TCMHerbProfile, LanguageMap } from '@herbapedia/data/types'

// Access plant data
const plant: Plant = loadPlant('ginger')
const name = plant.name['zh-Hant'] // 薑

// Access TCM profile
const tcm: TCMHerbProfile = loadTCMProfile('sheng-jiang')
const nature = tcm.hasNature // { "@id": "nature/warm" }
```

## Common Tasks

### Adding a New Plant

1. Create directory: `entities/plants/{slug}/`
2. Create `entity.jsonld` with required fields
3. Add image to `media/images/{slug}/`
4. Add system profiles as needed (TCM, Ayurveda, Western)
5. Run validation

### Adding TCM Profile for Existing Plant

1. Create directory: `systems/tcm/herbs/{tcm-slug}/`
2. Create `profile.jsonld` linking to plant via `derivedFromPlant`
3. Include TCM-specific properties (nature, flavor, meridians)
4. Run validation

### Adding Translations

1. Find the entity or profile file
2. Add translations to all `LanguageMap` fields
3. Ensure all languages are present (en, zh-Hant, zh-Hans minimum)
4. Run validation

## File Naming Conventions

- **Slugs**: lowercase, hyphen-separated (`zingiber-officinale`, `sheng-jiang`)
- **Files**: `entity.jsonld` for plants, `profile.jsonld` for system profiles
- **Images**: match the slug, include variant suffix if needed (`ginger.jpg`, `ginger-root.jpg`)

## External References

Use `sameAs` to link to external authorities:
- Wikidata: `https://www.wikidata.org/entity/Q...`
- GBIF: `https://www.gbif.org/species/...`
- Wikipedia: `https://en.wikipedia.org/wiki/...`

This enables data enrichment and cross-referencing.

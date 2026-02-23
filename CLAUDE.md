# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**data-herbapedia** is the authoritative JSON-LD knowledge base for medicinal plants.
It is a **dataset**, not an application. The Herbapedia website queries this dataset to render content.

## Commands

```bash
# Validate all data files
npm run validate

# Validate specific plant entity
node scripts/validate.js --plant ginseng

# Validate all TCM herbs
node scripts/validate.js --tcm

# Validate with verbose output (shows passing files)
node scripts/validate.js --verbose

# Build distribution index files
npm run build-index

# Link plant entities to Wikidata
node scripts/link-wikidata.js

# Link plant entities to GBIF
node scripts/link-gbif.js

# Apply translations from batch files
node scripts/apply-translations.js
```

## Key Architectural Principle

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
│   ├── context/          # JSON-LD contexts
│   │   ├── core.jsonld   # Base vocabulary (schema.org, Darwin Core, etc.)
│   │   ├── tcm.jsonld    # TCM vocabulary extension
│   │   ├── ayurveda.jsonld
│   │   └── western.jsonld
│   ├── shapes/           # SHACL validation (planned)
│   └── vocab/            # Ontology definitions (Turtle, planned)
│
├── entities/
│   ├── plants/           # Botanical entities (185 total)
│   │   └── {slug}/entity.jsonld
│   └── chemicals/        # Chemical compounds
│
├── systems/
│   ├── tcm/
│   │   ├── herbs/        # TCM herb profiles (99 total)
│   │   │   └── {slug}/profile.jsonld
│   │   ├── natures.jsonld    # Reference: hot/warm/neutral/cool/cold
│   │   ├── flavors.jsonld    # Reference: 五味
│   │   ├── meridians.jsonld  # Reference: 十二经脉
│   │   └── categories.jsonld # Herb category definitions
│   ├── ayurveda/
│   │   ├── dravyas/      # Ayurvedic substance profiles
│   │   ├── doshas.jsonld
│   │   ├── rasas.jsonld
│   │   └── gunas.jsonld
│   └── western/
│       ├── herbs/        # Western herb profiles (87 total)
│       │   └── {slug}/profile.jsonld
│       ├── actions.jsonld    # Herbal actions (carminative, etc.)
│       └── organs.jsonld     # Organ affinities
│
├── types/                # TypeScript definitions
│   ├── core.ts           # Plant, ChemicalCompound, LanguageMap
│   ├── tcm.ts            # TCMHerbProfile, TCMMeridian, etc.
│   ├── ayurveda.ts       # AyurvedaDravyaProfile, DoshaType
│   └── index.ts          # Re-exports
│
├── scripts/              # Validation and utility scripts
│
├── dist/                 # Build output (gitignored)
│   ├── index.json        # Master index with merged data
│   ├── categories.json   # Category definitions with counts
│   ├── plants.json       # All plant entities
│   └── tcm-herbs.json    # All TCM profiles
│
└── media/images/         # Plant images
```

## IRI Reference Patterns

IRIs follow consistent patterns for referencing entities and controlled vocabularies:

| Pattern | Example | Usage |
|---------|---------|-------|
| `plant/{slug}` | `plant/ginseng` | Plant entity reference |
| `plant/{slug}#{part}` | `plant/ginger#rhizome` | Specific plant part |
| `tcm/{slug}` | `tcm/ren-shen` | TCM herb profile |
| `western/{slug}` | `western/ginger` | Western herb profile |
| `nature/{value}` | `nature/warm` | TCM thermal nature |
| `flavor/{value}` | `flavor/sweet` | TCM flavor (五味) |
| `meridian/{value}` | `meridian/spleen` | TCM meridian |
| `category/{value}` | `category/tonify-qi` | TCM herb category |
| `western/action/{value}` | `western/action/carminative` | Western herbal action |
| `western/organ/{value}` | `western/organ/digestive` | Western organ affinity |

## Data Format

### Plant Entity (entities/plants/{slug}/entity.jsonld)

Contains ONLY botanical data. No system-specific content.

```json
{
  "@context": "../../schema/context/core.jsonld",
  "@id": "plant/ginseng",
  "@type": ["schema:Plant", "herbapedia:MedicinalPlant"],
  "scientificName": "Panax ginseng",
  "name": {
    "en": "Ginseng",
    "zh-Hant": "人蔘",
    "zh-Hans": "人蔘"
  },
  "description": { "...": "..." },
  "image": "media/images/ginseng/ginseng.jpg",
  "containsChemical": [{ "@id": "chemical/ginsenosides" }],
  "sameAs": [{ "@id": "http://www.wikidata.org/entity/Q192163" }]
}
```

### TCM Profile (systems/tcm/herbs/{slug}/profile.jsonld)

```json
{
  "@context": "../../schema/context/tcm.jsonld",
  "@id": "tcm/ren-shen",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  "derivedFromPlant": { "@id": "plant/panax-ginseng#root" },
  "name": { "en": "Ginseng Root", "zh-Hant": "人蔘" },
  "pinyin": "Rén Shēn",
  "hasCategory": { "@id": "category/tonify-qi" },
  "hasNature": { "@id": "nature/warm" },
  "hasFlavor": [{ "@id": "flavor/sweet" }, { "@id": "flavor/bitter" }],
  "entersMeridian": [{ "@id": "meridian/spleen" }, { "@id": "meridian/lung" }],
  "tcmFunctions": { "en": "...", "zh-Hant": "..." },
  "tcmTraditionalUsage": { "en": "...", "zh-Hant": "..." },
  "tcmModernResearch": { "en": "...", "zh-Hant": "..." }
}
```

### Western Profile (systems/western/herbs/{slug}/profile.jsonld)

```json
{
  "@context": "../../schema/context/western.jsonld",
  "@id": "western/ginger",
  "@type": ["western:Herb", "schema:DietarySupplement"],
  "derivedFromPlant": { "@id": "plant/ginger" },
  "name": { "en": "Ginger", "zh-Hant": "生薑" },
  "hasAction": [{ "@id": "western/action/carminative" }],
  "hasOrganAffinity": [{ "@id": "western/organ/digestive" }],
  "westernTraditionalUsage": { "en": "...", "zh-Hant": "..." }
}
```

## Content Guidelines

### Language Codes

- `en` - English
- `zh-Hant` - Traditional Chinese (繁體中文)
- `zh-Hans` - Simplified Chinese (简体中文)
- `hi` - Hindi
- `sa` - Sanskrit

### System-Scoped Properties

Content properties are scoped to each medicine system. NEVER create generic properties:

| System | Properties |
|--------|------------|
| TCM | `tcmFunctions`, `tcmTraditionalUsage`, `tcmModernResearch`, `tcmHistory`, `tcmSafetyConsideration` |
| Ayurveda | `ayurvedaTraditionalUsage`, `ayurvedaModernResearch` |
| Western | `westernTraditionalUsage`, `westernModernResearch`, `westernHistory` |

**Wrong**: `herbapedia:traditionalUsage`
**Right**: `tcm:traditionalUsage` or `western:traditionalUsage`

### Non-Plant Entities

The `entities/plants/` directory also contains non-plant entities:
- Vitamins: `vitamin-a`, `vitamin-b1`, etc.
- Minerals: `calcium`, `iron`, `magnesium`, etc.
- Nutrients: `choline`, `glucosamine-sulfate`, etc.
- Oils: `argan-oil`, `lavender-oil`, etc.

The validator handles these differently (e.g., no `scientificName` required).

## File Naming Conventions

- **Slugs**: lowercase, hyphen-separated (`zingiber-officinale`, `sheng-jiang`)
- **Plant files**: `entity.jsonld`
- **Profile files**: `profile.jsonld`
- **Images**: match the slug, include variant suffix if needed (`ginger.jpg`, `ginger-root.jpg`)

## External References

Use `sameAs` to link to external authorities:
- Wikidata: `http://www.wikidata.org/entity/Q...`
- GBIF: Use `gbifID` property with the numeric ID

Utility scripts:
- `node scripts/link-wikidata.js` - Auto-link to Wikidata
- `node scripts/link-gbif.js` - Auto-link to GBIF species data

## TypeScript Configuration

The project uses TypeScript 5.3+ with ES2022 target and strict mode enabled.
Types are for development only; there is no runtime TypeScript compilation.
The `noEmit` flag is set - types are consumed directly from `.ts` files.

## Publishing Workflow

1. Update version in package.json
2. Run validation: `npm run validate`
3. Generate distribution: `npm run build-index`
4. Create git tag: `git tag v1.x.x`
5. Push tag: `git push origin v1.x.x`
6. Create GitHub release with bundled data

Consumers fetch specific versions:
```
https://github.com/herbapedia/data-herbapedia/releases/download/v1.2.0/herbapedia-data.tar.gz
```

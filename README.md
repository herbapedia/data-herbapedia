# Herbapedia Data Repository

> The authoritative JSON-LD knowledge base for all medicinal botany

## Overview

This repository contains the structured data for [Herbapedia](https://herbapedia.org), the premier knowledge base for medicinal plants across all traditional medicine systems.

### Key Features

- **JSON-LD Format**: True semantic linked data with proper vocabularies
- **Multi-System Support**: TCM, Ayurveda, Western Herbalism, and more
- **Entity Separation**: Plants are distinct from their medicinal interpretations
- **Linked Data**: Integration with Wikidata, GBIF, and external knowledge bases
- **Multilingual**: Content in English, Chinese, Hindi, Sanskrit, and more

## Directory Structure

```
data-herbapedia/
├── schema/
│   ├── context/          # JSON-LD contexts
│   │   ├── core.jsonld   # Base vocabulary
│   │   ├── tcm.jsonld    # TCM extension
│   │   ├── ayurveda.jsonld
│   │   └── western.jsonld
│   ├── vocab/            # Ontology definitions (Turtle)
│   └── shapes/           # SHACL validation
│
├── entities/
│   ├── plants/           # Botanical entities
│   └── chemicals/        # Chemical compounds
│
├── systems/              # Traditional medicine systems
│   ├── tcm/              # Traditional Chinese Medicine
│   │   ├── herbs/        # TCM herb profiles
│   │   ├── meridians.jsonld
│   │   ├── natures.jsonld
│   │   └── flavors.jsonld
│   ├── ayurveda/         # Ayurvedic medicine
│   │   ├── dravyas/
│   │   ├── doshas.jsonld
│   │   ├── rasas.jsonld
│   │   └── gunas.jsonld
│   └── western/          # Western herbalism
│
├── media/
│   └── images/
│
└── types/                # TypeScript definitions
```

## Architecture

### Core Principle: Plant ≠ Medicine

We separate the **botanical entity** from its **medicinal interpretation**:

```
Plant (Panax ginseng)
  └── Root (plant part)
        ├── TCM Profile: 人参 (Ren Shen) - tonifies Qi
        └── Ayurveda Profile: अश्वगन्धा - Rasayana
```

This enables:

1. Same plant, different parts with different properties
2. Same part, different interpretations by different systems
3. Cross-system linking and comparison
4. Integration with external botanical databases

## JSON-LD Contexts

### Core Context

```json
{
  "@context": "https://herbapedia.org/schema/context/core.jsonld",
  "@id": "https://herbapedia.org/plant/zingiber-officinale",
  "@type": ["schema:Plant", "herbapedia:MedicinalPlant"],
  "scientificName": "Zingiber officinale",
  "name": { "en": "Ginger", "zh-Hant": "薑" }
}
```

### TCM Context Extension

```json
{
  "@context": [
    "https://herbapedia.org/schema/context/core.jsonld",
    "https://herbapedia.org/schema/context/tcm.jsonld"
  ],
  "@id": "https://herbapedia.org/tcm/sheng-jiang",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  "hasNature": { "@id": "nature/warm" },
  "entersMeridian": [
    { "@id": "meridian/lung" },
    { "@id": "meridian/spleen" }
  ]
}
```

## Vocabulary Reference

### External Vocabularies

| Prefix | URI | Purpose |
|--------|-----|---------|
| `schema` | https://schema.org/ | SEO, entity types |
| `dc` | http://purl.org/dc/terms/ | Provenance |
| `skos` | http://www.w3.org/2004/02/skos/core | Knowledge organization |
| `dwc` | http://rs.tdwg.org/dwc/terms/ | Darwin Core (taxonomy) |
| `wd` | http://www.wikidata.org/entity/ | External identity |

### Custom Vocabularies

| Prefix | URI | Purpose |
|--------|-----|---------|
| `herbapedia` | https://herbapedia.org/vocab/core | Universal concepts |
| `tcm` | https://herbapedia.org/vocab/tcm | Traditional Chinese Medicine |
| `ayurveda` | https://herbapedia.org/vocab/ayurveda | Ayurvedic medicine |
| `western` | https://herbapedia.org/vocab/western | Western herbalism |

## TypeScript Types

```typescript
import type { Plant, TCMHerbProfile, AyurvedaDravyaProfile } from '@herbapedia/data'

const plant: Plant = {
  "@id": "https://herbapedia.org/plant/panax-ginseng",
  "@type": ["schema:Plant", "herbapedia:MedicinalPlant"],
  scientificName: "Panax ginseng",
  // ...
}

const tcmHerb: TCMHerbProfile = {
  "@id": "https://herbapedia.org/tcm/ren-shen",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  hasNature: "nature/warm",
  // ...
}
```

## Usage

### Install

```bash
npm install @herbapedia/data
# or
pnpm add @herbapedia/data
```

### Import

```typescript
import { contexts } from '@herbapedia/data/schema/context'
import { plants } from '@herbapedia/data/entities'
import type { Plant, TCMHerbProfile } from '@herbapedia/data/types'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add or modify JSON-LD data files
4. Validate using `npm run validate`
5. Submit a pull request

## License

Content is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Related Projects

- [herbapedia](https://github.com/herbapedia/herbapedia) - Vue.js site builder
- [herbapedia-api](https://github.com/herbapedia/herbapedia-api) - GraphQL API (planned)

# Herbapedia Ontology Documentation

This document describes the Herbapedia ontology - a semantic data model for medicinal plants and their interpretations across multiple traditional medicine systems.

## Root IRI

**Root IRI**: `https://www.herbapedia.org/`

All entities use fully qualified IRIs based on this root. This ensures:
- Global uniqueness
- Resolvability
- Linked Data compliance

## IRI Structure

```
https://www.herbapedia.org/
├── entity/                     # Core entity namespace
│   ├── botanical/
│   │   ├── species/           # Plant species
│   │   ├── part/              # Plant parts
│   │   ├── chemical/          # Chemical compounds
│   │   ├── profile/           # Botanical profiles
│   │   └── barcode/           # DNA barcodes
│   ├── preparation/           # Herbal preparations
│   ├── formula/               # Proprietary formulas
│   └── sources/
│       ├── zoological/        # Animal products
│       ├── mineral/           # Minerals
│       └── chemical/          # Isolated compounds
├── system/
│   ├── tcm/
│   │   ├── profile/           # TCM herb profiles
│   │   ├── category/          # TCM categories
│   │   ├── nature/            # Thermal natures
│   │   ├── flavor/            # Flavors (五味)
│   │   └── meridian/          # Meridians
│   ├── western/
│   │   ├── profile/           # Western herb profiles
│   │   ├── action/            # Herbal actions
│   │   └── organ/             # Organ affinities
│   ├── ayurveda/
│   │   └── profile/           # Ayurvedic profiles
│   ├── persian/
│   │   └── profile/           # Persian medicine profiles
│   └── mongolian/
│       └── profile/           # Mongolian medicine profiles
└── vocab/
    ├── core/                  # Core vocabulary
    ├── tcm/                   # TCM vocabulary
    ├── western/               # Western vocabulary
    └── herbal/                # Herbal preparation vocabulary
```

## Core Architectural Principle

**Plant ≠ Medicine**

The Herbapedia ontology strictly separates:
1. **Source Materials** (botanical facts, chemistry, taxonomy)
2. **Preparations** (processing methods, forms)
3. **Interpretations** (medicine system-specific therapeutic properties)

This separation enables:
- Same plant, different parts with different properties
- Same preparation, multiple interpretations by different systems
- Cross-system comparison and linking
- Integration with external botanical databases

## Entity Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HERBAPEDIA ENTITY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────── SOURCE MATERIAL LAYER ─────────────────────┐       │
│  │                                                                   │       │
│  │  SourceMaterial (Abstract Base)                                  │       │
│  │    │                                                              │       │
│  │    ├── BotanicalSource (Plants, Fungi, Algae)                   │       │
│  │    │     ├── PlantSpecies (~121 entities)                        │       │
│  │    │     ├── FungalSpecies (5: lingzhi, cordyceps, etc.)        │       │
│  │    │     └── AlgalSpecies (1: Sargassum)                         │       │
│  │    │                                                              │       │
│  │    ├── ZoologicalSource (5: deer-antler, birds-nest, etc.)      │       │
│  │    │                                                              │       │
│  │    ├── MineralSource (12: calcium, iron, zinc, etc.)            │       │
│  │    │                                                              │       │
│  │    └── ChemicalSource (33: vitamins, amino acids, etc.)         │       │
│  │                                                                   │       │
│  └───────────────────────────────────────────────────────────────────┘       │
│                              │                                               │
│                              │ derivedFrom / isExtractOf                     │
│                              ▼                                               │
│  ┌───────────────────── PREPARATION LAYER ─────────────────────────┐       │
│  │                                                                   │       │
│  │  HerbalPreparation (Central Pivot Entity - 194 entities)        │       │
│  │    │                                                              │       │
│  │    ├── derivedFrom ──► SourceMaterial                           │       │
│  │    ├── preparationMethod: dried, fresh, extracted, etc.         │       │
│  │    ├── form: powder, tincture, tea, capsule, oil, etc.          │       │
│  │    └── has*Profile ──► System-Specific Profiles                 │       │
│  │                                                                   │       │
│  │  Formula (Proprietary Blends - 5 entities)                       │       │
│  │    └── hasIngredients ──► Multiple sources                      │       │
│  │                                                                   │       │
│  └───────────────────────────────────────────────────────────────────┘       │
│                              │                                               │
│          ┌───────────────────┼───────────────────┬───────────────┐          │
│          ▼                   ▼                   ▼               ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ TCMProfile   │  │ WesternProfile│  │AyurvedaProfile│  │PersianProfile│    │
│  │ (99 profiles)│  │ (87 profiles)│  │ (2 profiles)  │  │ (1 profile)  │    │
│  │              │  │              │  │              │  │              │    │
│  │ hasNature    │  │ hasAction    │  │ hasRasa      │  │hasTemperament│    │
│  │ hasFlavor    │  │ hasOrganAff. │  │ hasVirya     │  │ hasElement   │    │
│  │ entersMerid. │  │              │  │ hasVipaka    │  │ hasDegree    │    │
│  │ hasCategory  │  │              │  │ hasGuna      │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│                                        ┌──────────────┐                     │
│                                        │MongolianProfile│                   │
│                                        │ (1 profile)  │                     │
│                                        │ affectsRoots │                     │
│                                        │ hasElement   │                     │
│                                        │ hasTaste     │                     │
│                                        └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Source Material Types

### BotanicalSource

Sources from plants, fungi, or algae.

**Type Hierarchy:**
- `herbapedia:BotanicalSource`
- `botany:PlantSpecies` OR `mycology:FungalSpecies` OR `phycology:AlgalSpecies`
- `schema:Plant` (for plants only)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `scientificName` | string | Latin binomial |
| `family` | string | Botanical family |
| `genus` | string | Botanical genus |
| `containsChemical` | IRI[] | Chemical compounds found in this source |
| `hasChemicalProfile` | IRI | Link to chemical composition data |
| `hasDNABarcode` | IRI | Link to DNA barcode data |
| `hasParts` | IRI[] | Plant parts available from this source |
| `hasExtract` | IRI[] | Extracts/preparations derived from this source |

**Subtypes:**
- `plant`: Terrestrial plants
- `fungus`: Medicinal mushrooms and fungi
- `alga`: Marine and freshwater algae

### ZoologicalSource

Sources from animal products.

**Type:** `herbapedia:ZoologicalSource`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `animalName` | LanguageMap | Common name of source animal |
| `animalScientificName` | string | Scientific name of source animal |
| `animalPart` | string | Part used (antler, shell, nest, etc.) |

**Examples:**
- `deer-antler`: Cervus nippon antler
- `birds-nest`: Swiftlet saliva nest
- `dragon-bone`: Fossilized bone
- `guijia-or-guiban`: Turtle shell
- `deer-horn-gelatine`: Processed deer antler

### MineralSource

Mineral-based sources.

**Type:** `herbapedia:MineralSource`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `chemicalFormula` | string | Chemical formula if applicable |

**Examples:**
- calcium, copper, iodine, iron, magnesium, manganese, potassium, selenium, zinc
- amber (fossilized resin), mineral-oil, petrolatum

### ChemicalSource

Isolated or synthesized chemical compounds.

**Type:** `herbapedia:ChemicalSource`

**Subtypes:**
- `vitamin`: Vitamin compounds
- `amino-acid`: Amino acids
- `fatty-acid`: Fatty acids (omega-3, omega-6, omega-9)
- `compound`: Other isolated compounds
- `nutrient`: General nutrients

**Examples:**
- Vitamins: vitamin-a through vitamin-e, vitamin-p-bioflavonoids
- Amino acids: lysine, methionine, glycine, cysteine-hci
- Fatty acids: omega-3, omega-6, omega-9, linolenic-acid
- Compounds: glucosamine-sulfate, chondroitin-sulfate, chitosan

## HerbalPreparation

The **central pivot entity** in Herbapedia. An herbal preparation is a substance prepared from source materials for therapeutic or culinary use.

**Type:** `herbal:HerbalPreparation`, `schema:DietarySupplement`

**Key Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `derivedFrom` | IRI[] | Links to source material(s) |
| `preparationMethod` | enum | How prepared (dried, fresh, extracted, etc.) |
| `form` | enum | Physical form (powder, capsule, oil, etc.) |
| `hasTCMProfile` | IRI[] | TCM interpretations |
| `hasWesternProfile` | IRI[] | Western herbalism interpretations |
| `hasAyurvedaProfile` | IRI[] | Ayurvedic interpretations |

**Preparation Methods:**
- `fresh`, `dried`, `steamed`, `roasted`, `fried`, `stir-fried`
- `carbonized`, `fermented`, `pickled`
- `extracted`, `powdered`, `ground`
- `decocted`, `infused`, `tinctured`
- `distilled`, `cold-pressed`, `steam-distilled`
- `freeze-dried`, `spray-dried`, `concentrated`, `standardized`

**Forms:**
- `whole`, `sliced`, `crushed`, `powder`
- `granule`, `capsule`, `tablet`, `liquid`
- `oil`, `extract`, `tincture`, `tea`, `paste`

## Formula

Proprietary blends containing multiple ingredients.

**Type:** `herbapedia:Formula`, `schema:DietarySupplement`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `hasIngredients` | FormulaIngredient[] | List of ingredients with proportions |
| `proprietaryName` | LanguageMap | Brand/trade name |
| `standardizedTo` | object | Standardization target |

## Relationship Types

| Relationship | Forward | Reverse | Description |
|--------------|---------|---------|-------------|
| Taxonomic | `hasParts` | `partOf` | Plant → Parts |
| Chemical | `containsChemical` | `foundIn` | Plant → Compounds |
| Derivation | `derivedFrom` | - | Preparation → Source |
| Extraction | `hasExtract` | `isExtractOf` | Plant → Oil/Extract |
| Life Stage | `hasLifeStage` | `isLifeStageOf` | Species → Spores/Mycelium |
| Processing | `processedInto` | `isProcessedFrom` | Raw → Processed |
| Profile | `has*Profile` | `profiles` | Preparation → System Profile |
| **Bidirectional Species** | `hasTCMProfile` | `derivedFromPlant` | Species → TCM Profile |
| **Bidirectional Species** | `hasWesternProfile` | `derivedFromPlant` | Species → Western Profile |

## IRI Reference Patterns

| Pattern | Example | Usage |
|---------|---------|-------|
| `botanical/species/{slug}` | `botanical/species/ginseng` | Plant/fungal/algal species |
| `botanical/part/{slug}-{part}` | `botanical/part/ginger-rhizome` | Specific plant part |
| `botanical/chemical/{slug}` | `botanical/chemical/ginsenosides` | Chemical compound |
| `botanical/profile/{slug}` | `botanical/profile/ginger-rhizome` | Chemical profile |
| `botanical/barcode/{slug}` | `botanical/barcode/ginger` | DNA barcode |
| `preparation/{slug}` | `preparation/dried-ginger` | Herbal preparation |
| `formula/{slug}` | `formula/capigen` | Proprietary formula |
| `sources/zoological/{slug}` | `sources/zoological/chitosan` | Zoological source |

## Medicine System Profiles

### TCM (Traditional Chinese Medicine)

**Type:** `tcm:Herb`

**Key Concepts:**
- **四气 (Four Natures)**: hot, warm, neutral, cool, cold
- **五味 (Five Flavors)**: acrid, sweet, sour, bitter, salty
- **归经 (Meridian Tropism)**: Which meridians the herb enters
- **功效 (Functions)**: Therapeutic functions

### Western Herbalism

**Type:** `western:Herb`

**Key Concepts:**
- **Actions**: carminative, anti-inflammatory, etc.
- **Organ Affinities**: digestive, respiratory, etc.

### Ayurveda

**Type:** `ayurveda:Dravya`

**Key Concepts:**
- **रस (Rasa)**: Taste (sweet, sour, salty, pungent, bitter, astringent)
- **गुण (Guna)**: Qualities (heavy, light, dry, unctuous, etc.)
- **वीर्य (Virya)**: Potency (heating, cooling)
- **विपाक (Vipaka)**: Post-digestive taste
- **दोष (Dosha)**: Effect on Vata, Pitta, Kapha

### Persian Medicine (TPM)

**Type:** `persian:Herb`

**Key Concepts:**
- **مزاج (Temperament)**: Hot/Cold × Wet/Dry
- **Degree**: 1st, 2nd, 3rd, 4th degree

### Mongolian Medicine

**Type:** `mongolian:Herb`

**Key Concepts:**
- **гурван үндэс (Three Roots)**: Positive, Negative, Neutral
- **Element**: Earth, Water, Fire, Air, Space
- **Taste**: Six tastes
- **Potency**: Heavy, light, cool, hot, etc.

## Validation

The Herbapedia dataset uses a 3-phase validation process:

1. **Schema Validation**: All entities conform to JSON Schema
2. **Reference Integrity**: All IRI references resolve to existing entities
3. **Content Quality**: Required fields, valid enumerations, proper formatting

Run validation:
```bash
node scripts/validate.js
```

## TypeScript Types

All entity types are defined in TypeScript for development support:

- `types/core.ts` - Base Entity types
- `types/source-material.ts` - SourceMaterial hierarchy
- `types/botanical.ts` - Plant parts, chemicals, profiles
- `types/preparation.ts` - HerbalPreparation
- `types/formula.ts` - Formula types
- `types/tcm.ts` - TCM profile types
- `types/ayurveda.ts` - Ayurveda profile types
- `types/index.ts` - Re-exports all types

## Vocabulary Files

All vocabulary definitions are available as OWL ontologies in JSON-LD format:

### Ontology Definitions
| Vocabulary | File Location | Description |
|------------|---------------|-------------|
| Core | `/schema/vocab/core/ontology.jsonld` | Entity, SourceMaterial, Formula |
| Botany | `/schema/vocab/botany/ontology.jsonld` | PlantSpecies, PlantPart, ChemicalCompound |
| Mycology | `/schema/vocab/mycology/ontology.jsonld` | FungalSpecies |
| Phycology | `/schema/vocab/phycology/ontology.jsonld` | AlgalSpecies |
| Herbal | `/schema/vocab/herbal/ontology.jsonld` | HerbalPreparation (central pivot) |
| TCM | `/schema/vocab/tcm/ontology.jsonld` | Herb, Nature, Flavor, Meridian, Category |
| Western | `/schema/vocab/western/ontology.jsonld` | Herb, Action, Organ, System |
| Ayurveda | `/schema/vocab/ayurveda/ontology.jsonld` | Dravya, Rasa, Guna, Virya, Vipaka, Dosha |
| Persian | `/schema/vocab/persian/ontology.jsonld` | Drug, Temperament, Element, Degree |
| Mongolian | `/schema/vocab/mongolian/ontology.jsonld` | Herb, Root, Element, Taste, Potency |

### Controlled Vocabularies (Reference Data)
| Vocabulary | File Location | Description |
|------------|---------------|-------------|
| Herbal Forms | `/schema/vocab/herbal/forms.jsonld` | Preparation forms (powder, capsule, oil, etc.) |
| Herbal Methods | `/schema/vocab/herbal/methods.jsonld` | Preparation methods (dried, steamed, etc.) |
| TCM Actions | `/systems/tcm/reference/actions.jsonld` | Therapeutic actions (tonify qi, etc.) |
| TCM Natures | `/systems/tcm/reference/natures.jsonld` | Thermal natures (hot, warm, neutral, cool, cold) |
| TCM Flavors | `/systems/tcm/reference/flavors.jsonld` | Five flavors (五味) |
| TCM Meridians | `/systems/tcm/reference/meridians.jsonld` | Twelve meridians (十二经脉) |
| TCM Categories | `/systems/tcm/reference/categories.jsonld` | Herb categories |
| Western Actions | `/systems/western/reference/actions.jsonld` | Herbal actions (carminative, etc.) |
| Western Organs | `/systems/western/reference/organs.jsonld` | Organ affinities |
| Ayurveda Karmas | `/systems/ayurveda/reference/karmas.jsonld` | Therapeutic actions (कर्म) |
| Ayurveda Mahabhutas | `/systems/ayurveda/reference/mahabhutas.jsonld` | Five elements (पञ्च महाभूत) |
| Ayurveda Rasas | `/systems/ayurveda/reference/rasas.jsonld` | Six tastes (षड् रस) |
| Ayurveda Gunas | `/systems/ayurveda/reference/gunas.jsonld` | Qualities (गुण) |
| Ayurveda Viryas | `/systems/ayurveda/reference/viryas.jsonld` | Potencies (वीर्य) |
| Ayurveda Vipakas | `/systems/ayurveda/reference/vipakas.jsonld` | Post-digestive effects (विपाक) |
| Ayurveda Doshas | `/systems/ayurveda/reference/doshas.jsonld` | Three doshas (त्रिदोष) |

## External References

Herbapedia links to external authorities:

- **Wikidata**: `http://www.wikidata.org/entity/Q...`
- **GBIF**: `gbifID` property with numeric ID
- **NCBI Taxonomy**: `ncbiTaxonID` property (planned)

Utility scripts:
```bash
node scripts/link-wikidata.js  # Auto-link to Wikidata
node scripts/link-gbif.js      # Auto-link to GBIF species data
```

---

**Last Updated**: 2026-02-21
**Version**: 2.0.0
**License**: CC BY-SA 4.0

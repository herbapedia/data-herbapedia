# Herbapedia Ontology Design Document

> Design decisions, implementation guidelines, and architectural patterns for the Herbapedia ontology.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Core Design Decisions](#core-design-decisions)
3. [Architectural Patterns](#architectural-patterns)
4. [Schema Design Patterns](#schema-design-patterns)
5. [Implementation Guidelines](#implementation-guidelines)
6. [Extension Mechanisms](#extension-mechanisms)
7. [Validation Rules](#validation-rules)
8. [Performance Considerations](#performance-considerations)
9. [Migration Strategies](#migration-strategies)

---

## Design Philosophy

### Foundational Principles

The Herbapedia ontology is built on these core principles:

| Principle | Description | Application |
|-----------|-------------|-------------|
| **OOP Architecture** | Entity-based model with inheritance | Each entity type has dedicated class |
| **MECE** | Mutually Exclusive, Collectively Exhaustive | No data duplication, no gaps |
| **Linked Data** | IRI-based entity references | All links via `@id` |
| **Single Source of Truth** | Data defined once | Reference, don't copy |
| **Layered Abstraction** | Separation of concerns | Botanical → Preparation → Medicine System |

### Design Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| HerbalPreparation as pivot | More indirection | Enables multiple medicine system interpretations |
| Separate DNA/Chemical files | More files, smaller | Easier extraction, modular updates |
| Language maps vs separate files | Larger files | Query efficiency, atomic updates |
| Reference entities (Nature, Flavor) | More complexity | Consistency, validation, localization |

---

## Core Design Decisions

### 1. Three-Layer Architecture

```
+------------------+     +------------------+     +------------------+
|  BOTANICAL LAYER | --> | PREPARATION LAYER| --> | MEDICINE SYSTEMS |
+------------------+     +------------------+     +------------------+
| PlantSpecies     |     | HerbalPreparation|     | TCMProfile       |
| PlantPart        |     | - derivedFrom    |     | WesternProfile   |
| ChemicalCompound |     | - preparationMethod     | AyurvedaProfile |
| DNABarcode       |     | - form          |     | PersianProfile   |
+------------------+     +------------------+     | MongolianProfile |
                         +------------------+     +------------------+
```

**Why three layers?**

1. **Botanical Layer**: Pure scientific facts, no therapeutic interpretations
2. **Preparation Layer**: Processing transforms the material (drying, steaming, etc.)
3. **Medicine System Layer**: Each system interprets the same preparation differently

This enables:
- Same plant → Different preparations (fresh vs dried ginger)
- Same preparation → Different interpretations (TCM vs Ayurveda)
- Clear attribution of data to its source

### 2. HerbalPreparation as Central Pivot

```
                    +---------------------------+
                    |     HerbalPreparation     |
                    +---------------------------+
                    | @id: preparation/{slug}   |
                    | derivedFrom: PlantPart    |
                    | preparationMethod: string |
                    | form: string              |
                    +---------------------------+
                           /    |    \
                          /     |     \
            +-----------+  +-----------+  +-----------+
            | TCMProfile|  |WesternProf|  |AyurvedaProf|
            +-----------+  +-----------+  +-----------+
```

**Design Rationale:**

- A single plant species can yield multiple preparations (e.g., fresh ginger vs dried ginger)
- Processing changes therapeutic properties in most medicine systems
- Enables cross-system comparison of the same preparation

**Alternative Considered:**

```
PlantSpecies → TCMProfile (rejected)
```

This would not allow:
- Different preparations from same plant
- Cross-system comparison
- Clear attribution of processing effects

### 3. Reference Entity Pattern

```
+------------------+
|  TCMProfile      |
+------------------+
| hasNature: {     |
|   "@id": "tcm/   |
|    nature/warm"  |
| }                |
+------------------+
         |
         v
+------------------+
|  tcm/nature/warm |
+------------------+
| @type: tcm:Nature|
| prefLabel: {     |
|   en: "Warm",    |
|   zh-Hant: "溫"  |
| }                |
| broader: ...     |
| narrower: ...    |
+------------------+
```

**Why reference entities?**

1. **Validation**: Only valid values accepted
2. **Localization**: Labels in multiple languages
3. **Hierarchy**: Broader/narrower relationships
4. **Consistency**: Same value, same spelling

### 4. Extracted Data Separation

```
data-herbapedia/
├── entities/           # Core entities (plants, specimens)
├── systems/tcm/herbs/  # Medicine system profiles
├── media/
│   ├── images/         # Image metadata
│   ├── documents/      # Document metadata
│   └── extracted/      # EXTRACTED DATA (separate)
│       ├── dna/        # DNA sequences
│       ├── chemical/   # Chemical analysis
│       └── index.jsonld
└── indices/            # Cross-references
```

**Why separate extracted data?**

1. **Extraction independence**: Can re-extract without touching core entities
2. **Source traceability**: Clear link to original PDF
3. **Versioning**: Can track extraction versions
4. **Size management**: Large sequence data doesn't bloat core entities

---

## Architectural Patterns

### Pattern 1: Language Map

All multilingual text uses language maps:

```json
{
  "name": {
    "en": "Ginseng",
    "zh-Hant": "人蔘",
    "zh-Hans": "人参"
  }
}
```

**Implementation:**

```ruby
def build_language_map(field_base, variants)
  {
    "en" => variants["en"]&.send(field_base),
    "zh-Hant" => variants["zh-hk"]&.send(field_base),
    "zh-Hans" => variants["zh-cn"]&.send(field_base)
  }.compact
end
```

### Pattern 2: IRI Reference

All entity links use object format with `@id`:

```json
{
  "derivedFrom": { "@id": "botanical/species/panax-ginseng" },
  "hasNature": { "@id": "tcm/nature/warm" }
}
```

**Never embed full entity:**

```json
// WRONG - Don't do this
{
  "derivedFrom": {
    "@id": "botanical/species/panax-ginseng",
    "scientificName": "Panax ginseng",
    "family": "Araliaceae"
  }
}

// CORRECT - Use reference only
{
  "derivedFrom": { "@id": "botanical/species/panax-ginseng" }
}
```

### Pattern 3: Typed Array

Arrays always specify item types:

```json
{
  "identificationMethod": ["TLC", "HPLC-Fingerprint", "HPLC-Assay"],
  "referenceCompounds": [
    {
      "name": "Ginsenoside Rb1",
      "formula": "C54H92O23",
      "purpose": ["TLC identification", "Assay quantification"]
    }
  ]
}
```

### Pattern 4: Optional Object Properties

Use null for explicit absence, omit for unknown:

```json
{
  "rrt": 1.00,
  "acceptableRange": null,  // Explicit: no range (reference marker)
  "notes": "Reference peak"
}

{
  "rrt": 0.76,
  "acceptableRange": "±0.03",
  // notes omitted - no notes available
}
```

---

## Schema Design Patterns

### JSON-LD Context Structure

```
schema/context/
├── core.jsonld      # Base vocabulary, Herbapedia core terms
├── tcm.jsonld       # TCM-specific terms (imports core)
├── western.jsonld   # Western herbal terms (imports core)
├── ayurveda.jsonld  # Ayurveda terms (imports core)
└── persian.jsonld   # Persian medicine terms (imports core)
```

**Context inheritance:**

```json
// tcm.jsonld
{
  "@context": {
    "@import": "./core.jsonld",
    "@base": "https://herbapedia.org/tcm/",

    "Herb": { "@id": "tcm:Herb" },
    "hasNature": { "@id": "tcm:hasNature", "@type": "@id" }
  }
}
```

### Entity Type Hierarchy

```json
{
  "@type": ["herbapedia:ChemicalAnalysisData", "schema:Dataset"]
}
```

**Multiple types for:**

1. **Domain specificity**: Herbapedia types for our domain
2. **Interoperability**: Schema.org types for general tools
3. **Validation**: Each type implies certain properties

### Slug Generation

```
Scientific Name → Slug
Panax ginseng → panax-ginseng
Atractylodes lancea → atractylodes-lancea
Pinyin Name → Slug
Ren Shen → ren-shen
Cang Zhu → cang-zhu
Latin Pharmaceutical → Slug
Radix Ginseng → radix-ginseng
Cortex Eucommiae → cortex-eucommiae
```

**Rules:**

1. Lowercase
2. Spaces → hyphens
3. Remove diacritics
4. No special characters

---

## Implementation Guidelines

### Entity File Organization

```
entities/
├── plants/
│   └── {genus}-{species}/
│       └── entity.jsonld
├── specimens/
│   └── {gcmtiCode}/
│       └── entity.jsonld
└── chemicals/
    └── {compound-slug}/
        └── entity.jsonld

systems/
├── tcm/
│   └── herbs/
│       └── {pinyin-slug}/
│           └── profile.jsonld
└── western/
    └── herbs/
        └── {common-name-slug}/
            └── profile.jsonld

media/
├── extracted/
│   ├── dna/
│   │   └── {species-slug}.jsonld
│   └── chemical/
│       └── {preparation-slug}.jsonld
```

### Required vs Optional Properties

**Always required:**

```json
{
  "@context": "required",
  "@id": "required",
  "@type": "required (array)"
}
```

**Conditionally required:**

- `PlantSpecies`: `scientificName`, `family`, `genus`, `species`
- `TCMProfile`: `pinyin`, at least one of `hasNature`, `hasFlavor`
- `DNABarcode`: `loci` array with at least one locus

### Date Handling

All dates in ISO 8601 format:

```json
{
  "extractedAt": "2026-02-21",
  "collectedAt": "2020-05-15T10:30:00Z"
}
```

### Measurement Values

Include unit in property name or value:

```json
{
  "minimumContent": "0.20%",  // Unit in value
  "sequenceLength": 230,      // Unit implied (bp)
  "flowRate": {
    "value": 1.0,
    "unit": "mL/min"
  }
}
```

---

## Extension Mechanisms

### Adding a New Medicine System

1. Create context file: `schema/context/{system}.jsonld`
2. Create profile class: `lib/entities/{system}_profile.rb`
3. Add profile link to HerbalPreparation
4. Create reference entities

**Example: Adding Unani Medicine**

```json
// schema/context/unani.jsonld
{
  "@context": {
    "@import": "./core.jsonld",
    "@base": "https://herbapedia.org/unani/",

    "Herb": { "@id": "unani:Herb" },
    "hasMizaj": { "@id": "unani:hasMizaj", "@type": "@id" },
    "hasUsool": { "@id": "unani:hasUsool", "@type": "@id" }
  }
}
```

### Adding New Identification Methods

1. Add method to `identificationMethod` enum
2. Create method-specific schema if complex
3. Add extraction template

```json
{
  "identificationMethod": ["TLC", "HPLC-Fingerprint", "NMR", "GC-MS"]
}
```

### Adding New Entity Types

1. Define in context file
2. Create entity class
3. Add to factory
4. Add to transformer pipeline

---

## Validation Rules

### Structural Validation

```ruby
class EntityValidator
  def validate(entity)
    errors = []

    # Required fields
    errors << "Missing @id" unless entity["@id"]
    errors << "Missing @type" unless entity["@type"]
    errors << "Missing @context" unless entity["@context"]

    # Type-specific validation
    case entity_type(entity)
    when "PlantSpecies"
      errors += validate_plant_species(entity)
    when "TCMProfile"
      errors += validate_tcm_profile(entity)
    end

    errors
  end
end
```

### Referential Integrity

```ruby
class ReferenceValidator
  def validate_references(entities)
    all_ids = entities.map { |e| e["@id"] }.to_set

    entities.flat_map do |entity|
      find_references(entity).reject { |ref| all_ids.include?(ref) }
    end
  end
end
```

### Value Constraints

```ruby
TCM_NATURES = %w[hot warm neutral cool cold]
TCM_FLAVORS = %w[sweet sour bitter acrid salty astringent bland]
TCM_MERIDIANS = %w[lung large-intestine stomach spleen heart small-intestine
                   bladder kidney pericardium triple-burner gallbladder liver]

def validate_tcm_reference(property, value)
  case property
  when "hasNature"
    TCM_NATURES.include?(value) or raise "Invalid nature: #{value}"
  when "hasFlavor"
    TCM_FLAVORS.include?(value) or raise "Invalid flavor: #{value}"
  when "entersMeridian"
    TCM_MERIDIANS.include?(value) or raise "Invalid meridian: #{value}"
  end
end
```

### Image Library Validation

The validation script (`scripts/validate.js`) includes Phase 4 for image library validation:

```javascript
// Non-plant products exempt from species requirement
const NON_PLANT_IMAGE_TYPES = [
  'oil', 'extract', 'factor', 'mpc', 'chitosan', 'shenqu', 'shoudihuang',
  'capigen', 'epicutin', 'hydration-factor'
]

function validateImageMetadata(metadata, dirName) {
  const errors = []

  // Required fields
  if (!metadata.fileName) errors.push("Missing fileName")
  if (!metadata.attribution) errors.push("Missing attribution")
  if (!metadata.downloaded) errors.push("Missing downloaded date")

  // Attribution requirements
  if (metadata.attribution) {
    if (!metadata.attribution.copyright) errors.push("Missing copyright")
    if (!metadata.attribution.license) errors.push("Missing license")
    if (!metadata.attribution.source) errors.push("Missing source")
    if (!metadata.attribution.spdxId) errors.push("Missing SPDX ID")
  }

  // Species required for botanical images only
  const isNonPlant = NON_PLANT_IMAGE_TYPES.some(t => dirName.includes(t))
  if (!metadata.species && !isNonPlant) {
    errors.push("Missing species (required for botanical images)")
  }

  return errors
}
```

#### SPDX License Identifiers

Images must include valid SPDX identifiers:

| Source Type | SPDX ID | Description |
|------------|---------|-------------|
| Proprietary | `NONE` | All rights reserved - used with permission |
| Public Domain | `CC-PDDC` | Public Domain Mark 1.0 |
| CC0 | `CC0-1.0` | Creative Commons Zero v1.0 |
| CC BY-SA 3.0 | `CC-BY-SA-3.0` | Attribution Share-Alike 3.0 |

#### Validation Output

```
Phase 4: Image Library Validation
════════════════════════════════════════════════════════════

  Results: 178 image directories checked
    Directories: 178
    With metadata: 178
    With species: 158 (plants)
    With attribution: 178
    With SPDX ID: 178
    Errors: 0
    Warnings: 0
```
```

---

## Performance Considerations

### File Size Guidelines

| Entity Type | Target Size | Max Size |
|-------------|-------------|----------|
| PlantSpecies | < 5 KB | 20 KB |
| TCMProfile | < 10 KB | 50 KB |
| DNABarcode | < 50 KB | 200 KB |
| ChemicalAnalysis | < 100 KB | 500 KB |

### Query Optimization

**Index files for common queries:**

```
indices/
├── master-index.json      # All entities with type, name
├── gcmti-mapping.json     # GCMTI code → entity mapping
├── tcm-herbs-index.json   # All TCM herbs with key properties
└── chemical-index.json    # All chemicals with formulas
```

**Master index structure:**

```json
{
  "plants": {
    "panax-ginseng": {
      "name": { "en": "Ginseng", "zh": "人参" },
      "family": "Araliaceae"
    }
  },
  "tcmHerbs": {
    "ren-shen": {
      "pinyin": "Ren Shen",
      "nature": "warm",
      "flavors": ["sweet", "bitter"]
    }
  }
}
```

### Lazy Loading

For large entities, use reference-only in main file:

```json
// entity.jsonld (small)
{
  "@id": "botanical/species/panax-ginseng",
  "hasDNABarcode": { "@id": "media/extracted/dna/panax-ginseng" }
}

// media/extracted/dna/panax-ginseng.jsonld (large)
{
  "@id": "media/extracted/dna/panax-ginseng",
  "loci": [...]
}
```

---

## Migration Strategies

### Adding New Properties

1. Add to context file
2. Make optional in validation
3. Update extraction/transformation
4. Re-generate entities

**Example: Adding `tcmContraindications`:**

```json
// 1. Add to context
"contraindications": { "@id": "tcm:contraindications", "@container": "@language" }

// 2. Add to profile
{
  "contraindications": {
    "en": "Not for excess heat patterns",
    "zh-Hant": "實熱證禁用"
  }
}
```

### Renaming Properties

1. Add alias to context
2. Update extraction to use new name
3. Keep old name for backward compatibility
4. Remove old name in next major version

```json
// Context with alias
{
  "hasNature": { "@id": "tcm:hasNature" },
  "nature": { "@id": "tcm:hasNature" }  // Alias
}
```

### Breaking Changes

Require version bump and migration script:

```ruby
# migrate_v1_to_v2.rb
def migrate(entity)
  case entity["@type"]
  when "tcm:Herb"
    entity["hasTCMProfile"] = entity.delete("profile")
  end
  entity
end
```

---

## Appendix: Quick Reference

### Entity ID Patterns

| Entity Type | ID Pattern | Example |
|-------------|------------|---------|
| PlantSpecies | `botanical/species/{slug}` | `botanical/species/panax-ginseng` |
| PlantPart | `botanical/part/{slug}` | `botanical/part/ginseng-root` |
| ChemicalCompound | `botanical/chemical/{slug}` | `botanical/chemical/ginsenosides` |
| HerbalPreparation | `preparation/{slug}` | `preparation/dried-ginseng-root` |
| TCMProfile | `tcm/profile/{pinyin}` | `tcm/profile/ren-shen` |
| DNABarcode | `media/extracted/dna/{slug}` | `media/extracted/dna/panax-ginseng` |
| ChemicalAnalysis | `media/extracted/chemical/{slug}` | `media/extracted/chemical/radix-ginseng` |

### Property Naming Conventions

| Pattern | Example | Meaning |
|---------|---------|---------|
| `has{Entity}` | `hasNature`, `hasFlavor` | Reference to entity |
| `{verb}{Entity}` | `entersMeridian` | Action relationship |
| `derivedFrom` | `derivedFrom` | Source relationship |
| `{noun}Of` | `partOf` | Inverse relationship |
| `{noun}{Noun}` | `scientificName` | Compound property |

### File Extension Convention

| Content Type | Extension |
|--------------|-----------|
| JSON-LD Entity | `.jsonld` |
| JSON Index | `.json` |
| Context File | `.jsonld` |
| Markdown Doc | `.md` |

---

## Document Information

- **Version**: 1.0.0
- **Last Updated**: 2026-02-21
- **Authors**: Herbapedia Project
- **License**: CC BY-SA 4.0

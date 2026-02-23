# Contributing to Herbapedia

Thank you for your interest in contributing to Herbapedia! This guide will help you add new entities, edit existing data, and maintain data quality.

## Table of Contents

- [Getting Started](#getting-started)
- [Data Entry Conventions](#data-entry-conventions)
- [Entity Templates](#entity-templates)
- [Validation](#validation)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Basic understanding of JSON-LD

### Setup

```bash
git clone https://github.com/herbapedia/data-herbapedia.git
cd data-herbapedia
npm install
```

### Validate Before Committing

Always run validation before submitting changes:

```bash
npm run validate
```

## Data Entry Conventions

### File Naming (Slugs)

Use lowercase, hyphen-separated slugs:

| Good | Bad |
|------|-----|
| `ginger` | `Ginger`, `GINGER` |
| `zingiber-officinale` | `Zingiber officinale` |
| `st-johns-wort` | `stJohnsWort`, `st_johns_wort` |

### Language Codes

Use BCP 47 language codes:

| Code | Language |
|------|----------|
| `en` | English |
| `zh-Hant` | Traditional Chinese (繁體中文) |
| `zh-Hans` | Simplified Chinese (简体中文) |
| `sa` | Sanskrit (संस्कृतम्) |
| `hi` | Hindi (हिन्दी) |
| `fa` | Persian (فارسی) |
| `mn` | Mongolian (Монгол) |

### Language Maps

All text content uses language maps:

```json
{
  "name": {
    "en": "Ginger",
    "zh-Hant": "薑",
    "zh-Hans": "姜"
  }
}
```

### IRI References

Always use object format for references:

```json
// ✅ Correct
{ "@id": "botanical/species/ginger" }

// ❌ Wrong
"botanical/species/ginger"
```

### IRI Patterns

| Entity Type | Pattern | Example |
|-------------|---------|---------|
| PlantSpecies | `botanical/species/{slug}` | `botanical/species/ginger` |
| PlantPart | `botanical/part/{slug}` | `botanical/part/ginger-rhizome` |
| ChemicalCompound | `botanical/chemical/{slug}` | `botanical/chemical/gingerol` |
| ChemicalProfile | `botanical/chemical-profile/{slug}` | `botanical/chemical-profile/ginger-rhizome` |
| DNABarcode | `botanical/barcode/{slug}` | `botanical/barcode/ginger` |
| HerbalPreparation | `preparation/{slug}` | `preparation/dried-ginger-rhizome` |
| TCMProfile | `tcm/profile/{slug}` | `tcm/profile/dried-ginger` |
| WesternProfile | `western/profile/{slug}` | `western/profile/ginger` |

## Entity Templates

### Plant Species

Directory: `entities/botanical/species/{slug}/entity.jsonld`

```json
{
  "@context": "../../../schema/context/core.jsonld",
  "@id": "botanical/species/{slug}",
  "@type": ["botany:PlantSpecies", "schema:Plant"],
  "name": {
    "en": "Common Name",
    "zh-Hant": "繁體中文名",
    "zh-Hans": "简体中文名"
  },
  "scientificName": "Genus species",
  "family": "Family Name",
  "genus": "Genus",
  "description": {
    "en": "Brief description of the plant."
  },
  "image": "media/images/{slug}/{slug}.jpg",
  "gbifID": "1234567",
  "wikidataID": "Q12345",
  "hasParts": [
    { "@id": "botanical/part/{slug}-root" }
  ],
  "containsChemical": [
    { "@id": "botanical/chemical/compound-name" }
  ],
  "provenance": {
    "created": "2026-01-01T00:00:00.000Z",
    "source": "Source name",
    "license": "https://creativecommons.org/licenses/by-sa/4.0/"
  }
}
```

### Plant Part

Directory: `entities/botanical/parts/{slug}/entity.jsonld`

```json
{
  "@context": "../../../../schema/context/core.jsonld",
  "@id": "botanical/part/{species-slug}-{part-type}",
  "@type": ["botany:PlantPart", "schema:Plant"],
  "name": {
    "en": "Plant Name Part Type",
    "zh-Hant": "植物名部位"
  },
  "partOf": { "@id": "botanical/species/{species-slug}" },
  "partType": "root",
  "description": {
    "en": "Description of this plant part."
  },
  "provenance": {
    "created": "2026-01-01T00:00:00.000Z",
    "source": "Generated from species data",
    "license": "https://creativecommons.org/licenses/by-sa/4.0/"
  }
}
```

**Part Types:** `root`, `rhizome`, `tuber`, `bulb`, `stem`, `bark`, `leaf`, `flower`, `fruit`, `seed`, `whole-plant`, `aerial-part`

### Herbal Preparation

Directory: `entities/preparations/{slug}/entity.jsonld`

```json
{
  "@context": "../../schema/context/herbal.jsonld",
  "@id": "preparation/{slug}",
  "@type": ["herbal:HerbalPreparation", "schema:DietarySupplement"],
  "name": {
    "en": "Preparation Name",
    "zh-Hant": "製劑名稱"
  },
  "derivedFrom": [
    { "@id": "botanical/part/{species-part}" }
  ],
  "preparationMethod": "dried",
  "form": "sliced",
  "hasTCMProfile": [
    { "@id": "tcm/profile/{tcm-slug}" }
  ],
  "hasWesternProfile": [
    { "@id": "western/profile/{western-slug}" }
  ],
  "provenance": {
    "created": "2026-01-01T00:00:00.000Z",
    "source": "Source name",
    "license": "https://creativecommons.org/licenses/by-sa/4.0/"
  }
}
```

**Preparation Methods:** `fresh`, `dried`, `steamed`, `roasted`, `fried`, `carbonized`, `fermented`, `extracted`, `powdered`, `standardized`

**Forms:** `whole`, `sliced`, `powder`, `granule`, `capsule`, `tablet`, `liquid`, `oil`, `extract`, `tincture`, `tea`, `paste`

### TCM Profile

Directory: `profiles/tcm/{slug}/profile.jsonld`

```json
{
  "@context": "../../schema/context/tcm.jsonld",
  "@id": "tcm/profile/{slug}",
  "@type": ["tcm:Herb", "schema:DietarySupplement"],
  "profiles": { "@id": "preparation/{preparation-slug}" },
  "pinyin": "Pinyin Name",
  "hasCategory": { "@id": "tcm/category/category-name" },
  "hasNature": { "@id": "tcm/nature/warm" },
  "hasFlavor": [
    { "@id": "tcm/flavor/pungent" },
    { "@id": "tcm/flavor/sweet" }
  ],
  "entersMeridian": [
    { "@id": "tcm/meridian/spleen" },
    { "@id": "tcm/meridian/lung" }
  ],
  "tcmFunctions": {
    "en": "Therapeutic functions in English.",
    "zh-Hant": "中醫功效描述"
  },
  "provenance": {
    "created": "2026-01-01T00:00:00.000Z",
    "source": "TCM reference source",
    "license": "https://creativecommons.org/licenses/by-sa/4.0/"
  }
}
```

## Validation

### Running Validation

```bash
# Full validation
npm run validate

# Verbose output (shows all files)
node scripts/validate.js --verbose

# Validate specific entity
node scripts/validate.js --plant ginger
```

### Common Errors

#### Missing Required Field

```
Error: Missing required field "scientificName" in botanical/species/example
```

**Fix:** Add the required field to the entity.

#### Broken Reference

```
Error: Broken reference to "botanical/chemical/nonexistent"
```

**Fix:** Create the referenced entity or correct the IRI.

#### Invalid Language Map

```
Error: Language map must use BCP 47 codes
```

**Fix:** Use valid language codes (`en`, `zh-Hant`, etc.).

### Reference Integrity

All IRI references must resolve to existing entities:

```bash
# Check for broken references
node scripts/validate.js --references
```

## Pull Request Process

1. **Create a Branch**

   ```bash
   git checkout -b feature/add-new-herb
   ```

2. **Make Changes**

   - Add or modify entity files
   - Follow naming conventions
   - Include proper IRI references

3. **Validate**

   ```bash
   npm run validate
   ```

   All validations must pass before submitting.

4. **Commit**

   Use semantic commit messages:

   ```
   feat(species): add lavender species entity
   fix(tcm): correct ginger meridian reference
   docs(schema): update ChemicalCompound example
   ```

5. **Submit Pull Request**

   - Describe changes clearly
   - Reference any related issues
   - Confirm validation passes

## MECE Principles

### Separation of Concerns

| Entity Type | Contains | Does NOT Contain |
|-------------|----------|------------------|
| PlantSpecies | Taxonomy, distribution, morphology | Therapeutic properties |
| PlantPart | Part-specific data | System-specific properties |
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
- Bidirectional links are maintained

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Reference the [Schema Documentation](docs/SCHEMA.md) for detailed property information

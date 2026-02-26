# Herbapedia Optimization Plan

**Generated**: 2026-02-24
**Version**: 1.0.0

---

## Executive Summary

This plan addresses **API architecture** and **ontology** improvements to achieve:
- **Clean Architecture**: Single source of truth, no duplication
- **High Performance**: Async-first, smart caching, indexed queries
- **Developer Experience**: Type-safe, consistent errors, great DX
- **Extensibility**: Plugin system, config-driven registries

---

## Phase A: API Architecture Refactoring

### A.1: Consolidate API Architecture (HIGH PRIORITY)

**Problem**: Two parallel APIs exist causing confusion:
- `src/dataset.ts` (1262 lines - violates 700-line limit)
- `src/queries/` (modular queries)

**Solution**: Migrate to fully modular architecture

```
src/
├── index.ts                    # Single export entry
├── types/                      # Core type definitions
│   ├── index.ts
│   ├── entity.ts              # Entity interfaces
│   └── query.ts               # Query result types
├── core/
│   ├── config.ts              # Centralized configuration (NAMESPACE_MAP)
│   ├── loader.ts              # EntityLoader (async-first)
│   └── cache.ts               # SmartCache with lazy size calculation
├── queries/
│   ├── botanical.ts           # Botanical queries
│   ├── preparation.ts         # Preparation queries
│   ├── profiles/              # Profile queries
│   │   ├── tcm.ts
│   │   ├── western.ts
│   │   └── index.ts
│   └── search.ts              # Search with async index building
├── builders/
│   └── index.ts              # Fluent builders
├── validation/
│   ├── index.ts              # Unified validation API
│   ├── schema.ts
│   ├── quality.ts
│   └── image.ts               # Image validation
├── registry/                   # NEW: Extensible registries
│   ├── index.ts
│   ├── entity-types.ts        # Config-driven entity types
│   └── validators.ts          # Plugin validators
└── export/                    # NEW: Export formatters
    ├── index.ts
    ├── jsonld.ts
    ├── rdf.ts
    └── turtle.ts
```

**Tasks**:
- [x] A.1.1: Create `src/types/` with all interfaces
- [x] A.1.2: Create `src/core/config.ts` - single NAMESPACE_MAP
- [x] A.2.1: Convert all file I/O to async
- [x] A.2.2: Fix cache size calculation (lazy size)
- [x] A.2.3: Add QueryIndex class
- [x] A.1.3: Refactor `EntityLoader` to async-only (deprecate sync methods)
- [x] A.1.5: Update exports in `index.ts`
- [x] A.1.4: Delete `dataset.ts` - migrate to modular queries ✅ (2026-02-25)

---

### A.2: Performance Optimizations (HIGH PRIORITY)

**Problem**: Synchronous file I/O blocks event loop, expensive cache calculations

**Solutions**:

#### A.2.1: Async File Operations
```typescript
// BEFORE (blocking)
const content = readFileSync(path, 'utf-8')

// AFTER (non-blocking)
const content = await readFile(path, 'utf-8')
```

#### A.2.2: Lazy Cache Size Calculation
```typescript
// BEFORE (expensive - serializes on every access)
private calculateSize(entity: T): number {
  return JSON.stringify(entity).length * 2
}

// AFTER (lazy - only when evicted)
private entrySizes = new WeakMap<object, number>()
set(key: string, value: T): void {
  // Store size only when needed for eviction
}
```

#### A.2.3: Pre-built Query Indexes
```typescript
// Build indexes once at startup, serve fast lookups
class QueryIndex {
  private bySlug = new Map<string, Entity>()
  private byType = new Map<string, Set<Entity>>()
  private byScientificName = new Map<string, Entity>()

  static async build(loader: EntityLoader): Promise<QueryIndex>
}
```

**Tasks**:
- [x] A.2.1: Convert all file I/O to async
- [x] A.2.2: Fix cache size calculation
- [x] A.2.3: Add QueryIndex class

---

### A.3: Developer Experience (MEDIUM PRIORITY)

**Problem**: Inconsistent errors, weak type safety

**Solutions**:

#### A.3.1: Unified Error Handling
```typescript
// Use Result pattern for explicit error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

// Instead of null or throwing
async function getPlant(slug: string): Promise<Result<PlantSpecies>>
```

#### A.3.2: Type-safe Entity Detection
```typescript
// BEFORE (fragile)
if (type.includes('tcm:Herb')) return 'TCMProfile'

// AFTER (type-safe)
const TYPE_GUARDS: Record<string, (t: string[]) => boolean> = {
  TCMProfile: (t) => t.includes('tcm:Herb') || t.includes('tcm:HerbProfile'),
  WesternHerb: (t) => t.includes('western:Herb'),
}
```

#### A.3.3: Comprehensive TypeScript Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Tasks**:
- [x] A.3.1: Add Result type and migrate error handling
- [x] A.3.2: Add type guards for entity detection
- [x] A.3.3: Enable strict TypeScript options

---

### A.4: Extensibility (MEDIUM PRIORITY)

**Problem**: Hardcoded entity types, no plugin system

**Solutions**:

#### A.4.1: Config-Driven Entity Registry
```typescript
// config/entity-types.json
{
  "PlantSpecies": {
    "schema": "botanical/plant-species.schema.json",
    "required": ["scientificName", "name"],
    "queryPaths": ["botanical/species"]
  }
}
```

#### A.4.2: Validator Plugin System
```typescript
// plugins/custom-validator.ts
import { ValidatorPlugin } from '@herbapedia/data'

export const myValidator: ValidatorPlugin = {
  name: 'my-validator',
  validate(entity, context) {
    // Custom validation logic
    return { valid: true }
  }
}

// Register in config
// plugins: ['my-validator']
```

#### A.4.3: Exporter Plugin System
```typescript
interface Exporter<T> {
  format: string
  serialize(entity: T): string | Buffer
}

// Built-in exporters
const EXPORTERS = {
  jsonld: new JsonLdExporter(),
  turtle: new TurtleExporter(),
  rdf: new RdfExporter(),
}
```

**Tasks**:
- [x] A.4.1: Create `config/entity-types.json` ✅ (Using ENTITY_TYPE_CONFIG in TypeScript for type safety)
- [x] A.4.2: Add validator plugin interface ✅ (2026-02-25)
- [x] A.4.3: Add exporter plugin interface ✅ (2026-02-25)

---

## Phase B: Ontology Improvements

### B.1: Fix Critical OWL Gaps (HIGH PRIORITY)

**Problem**: Missing base class `herbapedia:MedicineSystemProfile`

**Solution**: Add to `schema/vocab/core/ontology.jsonld`

```json
{
  "@id": "herbapedia:MedicineSystemProfile",
  "@type": "owl:Class",
  "rdfs:subClassOf": "herbapedia:Entity",
  "rdfs:label": { "en": "Medicine System Profile" },
  "rdfs:comment": "Abstract base for all medicine system-specific herb profiles."
}
```

**Tasks**:
- [x] B.1.1: Add MedicineSystemProfile to core ontology
- [x] B.1.2: Add inverse properties (8 pairs)
- [x] B.1.3: Add disjoint class declarations

---

### B.2: Complete Property Definitions (MEDIUM PRIORITY)

**Problem**: Properties in context files not defined in ontology

**Solution**: Add missing owl:ObjectProperty/owl:DatatypeProperty definitions

**Tasks**:
- [x] B.2.1: Add missing TCM properties to ontology ✅ (2026-02-25)
- [x] B.2.2: Add missing Western properties to ontology ✅ (2026-02-25)
- [x] B.2.3: Add missing Ayurveda properties to ontology ✅ (2026-02-25)

---

### B.3: Fix Taxonomy Inconsistencies (MEDIUM PRIORITY)

**Problems**:
- `derivedFromPlant` range too narrow (PlantSpecies only, not BotanicalSource)
- `botany:PlantPart` has wrong superclass

**Tasks**:
- [x] B.3.1: Fix property ranges ✅ (Already correct in ontology)
- [x] B.3.2: Fix taxonomy hierarchy ✅ (Already correct in ontology)

---

## Phase C: Distribution & Performance

### C.1: Pre-built Indexes (MEDIUM PRIORITY)

Generate optimized indexes at build time:

```
dist/
├── index.json              # Main index
├── botanical-index.json   # Species lookup
├── search-index.json      # Lunr.js index (pre-built)
└── by-type/
    ├── PlantSpecies.json
    ├── HerbalPreparation.json
    └── TCMProfile.json
```

**Tasks**:
- [ ] C.1.1: Pre-build search index
- [ ] C.1.2: Add type-specific indexes

---

### C.2: Compression (LOW PRIORITY)

Add gzip/brotli compression for distribution:

```json
// package.json
"files": [
  "dist/**/*.json",
  "dist/**/*.json.gz"
]
```

**Tasks**:
- [ ] C.2.1: Add compression to build script

---

## Implementation Status

- **Phase A: Completed ✅
  - [x] A.1.1: Create `src/types/` with all interfaces
  - [x] A.1.2: Create `src/core/config.ts` - single NAMESPACE_MAP
  - [x] A.2.1: Convert all file I/O to async
  - [x] A.2.2: Fix cache size calculation (lazy size)
  - [x] A.2.3: Add QueryIndex class
  - [x] A.1.3: Refactor `EntityLoader` to async-only (deprecate sync methods)
  - [x] A.1.5: Update exports in `index.ts`
  - [x] A.1.4: Delete `dataset.ts` - migrate to modular queries ✅ (2026-02-25)

### **Phase B: Completed ✅**
  - [x] B.1.1: Add MedicineSystemProfile to core ontology
  - [x] B.1.2: Add inverse properties (8 pairs)
  - [x] B.1.3: Add disjoint class declarations
  - [x] B.2.1: Add missing TCM properties to ontology ✅ (2026-02-25)
  - [x] B.2.2: Add missing Western properties to ontology ✅ (2026-02-25)
  - [x] B.2.3: Add missing Ayurveda properties to ontology ✅ (2026-02-25)
  - [x] B.3.1: Fix property ranges ✅ (Already correct in ontology)
  - [x] B.3.2: Fix taxonomy hierarchy ✅ (Already correct in ontology)

### **Phase A.4:2-3: Plugin System (NEW) ✅ (2026-02-25)
  - [x] A.4.1: Create `config/entity-types.json` ✅ (Using ENTITY_TYPE_CONFIG in TypeScript for type safety)
  - [x] A.4.2: Add validator plugin interface ✅ (2026-02-25)
  - [x] A.4.3: Add exporter plugin interface ✅ (2026-02-25)

---

## Remaining Tasks
- Create migration script to move Western profiles for vitamins/minerals to Modern Medicine profiles system
- Create sample Modern Medicine profiles for Calcium as a template
- Migrate remaining entities (vitamins, minerals, etc.) from Western to Modern Medicine system
### Immediate (This Session)

1. **A.1.1**: Create `src/types/` with all interfaces
2. **A.1.2**: Create `src/core/config.ts` - single NAMESPACE_MAP
3. **B.1.1**: Add MedicineSystemProfile to core ontology

### Short-term (1-2 days)

4. **A.2.1**: Convert all file I/O to async
5. **A.3.1**: Add Result type
6. **B.1.2**: Add inverse properties

### Medium-term (1 week)

7. **A.1.3-5**: Complete API consolidation
8. **A.4.1**: Config-driven entity registry
9. **B.2**: Complete property definitions

### Long-term

10. **A.4.2-3**: Plugin systems
11. **C.1-2**: Distribution optimizations

---

## Breaking Changes

| Change | Impact | Migration |
|--------|--------|------------|
| Remove sync methods | High | Use async variants |
| Delete dataset.ts | High | Use modular queries |
| Result<T> return type | Medium | Update error handling |
| Config-driven entities | Low | Add config file |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API bundle size | < 100KB |
| Query latency (cold) | < 100ms |
| Query latency (cached) | < 10ms |
| Schema validation | < 2s |
| TypeScript strict mode | Pass |
| OWL DL compliance | Valid |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing users | Deprecation period, clear migration docs |
| Performance regression | Benchmark before/after |
| Plugin security | Sandboxed execution |
| Schema changes | Versioned schemas |


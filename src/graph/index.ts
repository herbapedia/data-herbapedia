/**
 * Knowledge Graph Module
 *
 * This module provides a fully normalized JSON-LD knowledge graph
 * for medicinal plants and herbal medicine.
 *
 * ## Architecture
 *
 * The graph is organized into three main layers:
 *
 * 1. **Botanical Layer** - Factual botanical data
 *    - Species: Plant species (taxonomy, distribution, external IDs)
 *    - Part: Plant parts (leaves, roots, bark, etc.)
 *    - Chemical: Chemical compounds found in plants
 *
 * 2. **Preparation Layer** - The central pivot entity
 *    - Preparation: Prepared substances derived from botanical sources
 *    - Formula: Multi-herb formulations
 *
 * 3. **Profile Layer** - Medical system interpretations
 *    - TCM: Traditional Chinese Medicine profiles
 *    - Ayurveda: Ayurvedic medicine profiles
 *    - Western: Western herbal medicine profiles
 *    - Unani: Unani medicine profiles
 *    - Mongolian: Traditional Mongolian medicine profiles
 *    - Modern: Modern pharmacological profiles
 *
 * ## Key Principle: Full Normalization
 *
 * Each entity appears exactly once in the graph.
 * Relationships use @id references, not embedded objects.
 *
 * @example
 * ```typescript
 * import { GraphBuilder, JsonLdExporter } from '@herbapedia/data/graph'
 *
 * // Build the graph
 * const builder = new GraphBuilder({
 *   dataRoot: './data-herbapedia',
 *   outputDir: './api/v1'
 * })
 *
 * const result = await builder.build()
 *
 * // Export to JSON-LD
 * const exporter = new JsonLdExporter(builder.getRegistry(), './api/v1')
 * await exporter.export()
 * ```
 *
 * @module graph
 */

// Core types
export * from './types.js'

// Registry
export { GraphRegistry } from './registry/GraphRegistry.js'

// Node classes
export {
  GraphNodeBase,
  lang,
  ref,
  refs,
  type LanguageMap,
  type IRIReference,
} from './nodes/GraphNodeBase.js'

export {
  SpeciesNode,
  SpeciesNodeBuilder,
  PartNode,
  PartNodeBuilder,
  ChemicalNode,
  ChemicalNodeBuilder,
} from './nodes/BotanicalNodes.js'

export {
  TcmProfileNode,
  TcmProfileNodeBuilder,
  AyurvedaProfileNode,
  AyurvedaProfileNodeBuilder,
  WesternProfileNode,
  WesternProfileNodeBuilder,
  VocabularyNode,
  VocabularyNodeBuilder,
} from './nodes/ProfileNodes.js'

// Graph builder
export {
  GraphBuilder,
  type GraphBuilderOptions,
  type BuildResult,
  type BuildError,
  type BuildWarning,
} from './GraphBuilder.js'

// Exporters
export {
  GraphExporter,
  JsonLdExporter,
  TurtleExporter,
} from './exporters/GraphExporter.js'

export { BrowserExporter } from './exporters/BrowserExporter.js'

// Knowledge-Centric API
export {
  GraphQuery,
  GraphTraversal,
  GraphIndex,
  RelationshipType,
  type RelationshipTypeValue,
  type TraversalOptions,
  type SearchResult,
} from './api/index.js'

// CLI
export {
  Cli,
  createCli,
  type CliOptions,
  type Command,
  type CommandOption,
  BuildCommand,
  ValidateCommand,
  QueryCommand,
  ExportCommand,
  StatsCommand,
} from './cli/index.js'

// Validators
export {
  type ValidationSeverity,
  type ValidationIssue,
  type NodeValidationResult,
  type ValidationResult,
  type ValidationOptions,
  type Validator,
  ReferenceValidator,
  SchemaValidator,
  CompositeValidator,
  createEmptyValidationResult,
  createNodeResult,
  createError,
  createWarning,
  createInfo,
  addNodeResult,
  addIssueToNode,
  finalizeResult,
} from './validators/index.js'

// Utilities
export {
  extractSearchableFields,
  RelationshipType,
  type RelationshipTypeValue,
} from './utils/index.js'

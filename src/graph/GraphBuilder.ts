/**
 * GraphBuilder - Orchestrates building the knowledge graph
 *
 * Responsibilities:
 * 1. Load source data from files
 * 2. Transform source data to graph nodes
 * 3. Register nodes in the registry
 * 4. Resolve and validate references
 * 5. Export to various formats
 */

import fs from 'fs'
import path from 'path'
import type { GraphNode, GraphStats } from './types.js'
import { NodeType, MedicalSystem, generateIRI } from './types.js'
import { GraphRegistry } from './registry/GraphRegistry.js'
import { SpeciesNodeBuilder, PartNodeBuilder, ChemicalNodeBuilder } from './nodes/BotanicalNodes.js'
import {
  TcmProfileNodeBuilder,
  AyurvedaProfileNodeBuilder,
  WesternProfileNodeBuilder,
  VocabularyNodeBuilder,
} from './nodes/ProfileNodes.js'

/**
 * Options for GraphBuilder
 */
export interface GraphBuilderOptions {
  /** Root directory of the data */
  dataRoot: string
  /** Output directory for built graph */
  outputDir: string
  /** Whether to validate during build */
  validate: boolean
  /** Whether to verbose log */
  verbose: boolean
  /** Context URL for nodes */
  contextUrl: string
  /** Number of concurrent operations */
  concurrency?: number
  /** Timestamp for incremental builds (only process files modified after this) */
  sinceTimestamp?: number
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Partial<GraphBuilderOptions> = {
  validate: true,
  verbose: false,
  contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
  concurrency: 10,
  sinceTimestamp: 0,
}

/**
 * Result of building the graph
 */
export interface BuildResult {
  success: boolean
  stats: GraphStats
  errors: BuildError[]
  warnings: BuildWarning[]
}

export interface BuildError {
  type: 'load' | 'transform' | 'validate' | 'export'
  source: string
  message: string
  details?: unknown
}

export interface BuildWarning {
  type: 'reference' | 'data' | 'schema'
  source: string
  message: string
}

/**
 * Main GraphBuilder class
 */
export class GraphBuilder {
  private options: GraphBuilderOptions
  private registry: GraphRegistry
  private errors: BuildError[] = []
  private warnings: BuildWarning[] = []

  constructor(options: Partial<GraphBuilderOptions> & { dataRoot: string; outputDir: string }) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as GraphBuilderOptions
    this.registry = new GraphRegistry()
  }

  /**
   * Build the complete knowledge graph
   */
  async build(): Promise<BuildResult> {
    this.errors = []
    this.warnings = []

    if (this.options.verbose) {
      console.log('Building knowledge graph...')
      console.log(`Data root: ${this.options.dataRoot}`)
      console.log(`Output dir: ${this.options.outputDir}`)
    }

    // Phase 1: Load vocabulary first (other nodes reference these)
    await this.loadVocabulary()

    // Phase 2: Load botanical entities
    await this.loadSpecies()
    await this.loadParts()
    await this.loadChemicals()
    await this.loadBarcodes()

    // Phase 3: Load preparations and formulas
    await this.loadPreparations()
    await this.loadFormulas()

    // Phase 4: Load profiles (they reference species and vocabulary)
    await this.loadTCMProfiles()
    await this.loadAyurvedaProfiles()
    await this.loadWesternProfiles()
    await this.loadUnaniProfiles()
    await this.loadMongolianProfiles()

    // Phase 5: Resolve references
    this.resolveReferences()

    // Phase 6: Validate
    if (this.options.validate) {
      this.validateGraph()
    }

    const stats = this.registry.getStats()

    if (this.options.verbose) {
      console.log('\nBuild complete!')
      console.log(`Total nodes: ${stats.totalNodes}`)
      console.log(`Errors: ${this.errors.length}`)
      console.log(`Warnings: ${this.warnings.length}`)
    }

    return {
      success: this.errors.length === 0,
      stats,
      errors: this.errors,
      warnings: this.warnings,
    }
  }

  /**
   * Get the registry for querying
   */
  getRegistry(): GraphRegistry {
    return this.registry
  }

  // =========================================================================
  // Vocabulary Loading
  // =========================================================================

  private async loadVocabulary(): Promise<void> {
    if (this.options.verbose) console.log('\n📚 Loading vocabulary...')

    // Load TCM vocabulary
    await this.loadTCMVocabulary()
    await this.loadAyurvedaVocabulary()
  }

  private async loadTCMVocabulary(): Promise<void> {
    const tcmDir = path.join(this.options.dataRoot, 'systems', 'tcm')

    // Load flavors
    const flavorsPath = path.join(tcmDir, 'flavors.jsonld')
    if (fs.existsSync(flavorsPath)) {
      const data = JSON.parse(fs.readFileSync(flavorsPath, 'utf-8'))
      const flavors = data['@graph'] || [data]

      for (const flavor of flavors) {
        try {
          const value = flavor.flavorValue || this.extractValueFromIRI(flavor['@id'])
          const iri = generateIRI(NodeType.TCM_FLAVOR, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(flavor.prefLabel || {})
            .description(flavor.description)
            .build()

          this.registry.registerNode(node, NodeType.TCM_FLAVOR)
        } catch (error) {
          this.addError('transform', flavorsPath, `Failed to transform flavor: ${error}`)
        }
      }
    }

    // Load natures
    const naturesPath = path.join(tcmDir, 'reference', 'natures.jsonld')
    if (fs.existsSync(naturesPath)) {
      const data = JSON.parse(fs.readFileSync(naturesPath, 'utf-8'))
      const natures = data['@graph'] || [data]

      for (const nature of natures) {
        try {
          const value = nature.natureValue || this.extractValueFromIRI(nature['@id'])
          const iri = generateIRI(NodeType.TCM_NATURE, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(nature.prefLabel || {})
            .description(nature.description)
            .build()

          this.registry.registerNode(node, NodeType.TCM_NATURE)
        } catch (error) {
          this.addError('transform', naturesPath, `Failed to transform nature: ${error}`)
        }
      }
    }

    // Load meridians
    const meridiansPath = path.join(tcmDir, 'meridians.jsonld')
    if (fs.existsSync(meridiansPath)) {
      const data = JSON.parse(fs.readFileSync(meridiansPath, 'utf-8'))
      const meridians = data['@graph'] || [data]

      for (const meridian of meridians) {
        try {
          const value = meridian.meridianValue || this.extractValueFromIRI(meridian['@id'])
          const iri = generateIRI(NodeType.TCM_MERIDIAN, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(meridian.prefLabel || {})
            .description(meridian.description)
            .build()

          this.registry.registerNode(node, NodeType.TCM_MERIDIAN)
        } catch (error) {
          this.addError('transform', meridiansPath, `Failed to transform meridian: ${error}`)
        }
      }
    }

    // Load categories
    const categoriesPath = path.join(tcmDir, 'categories.jsonld')
    if (fs.existsSync(categoriesPath)) {
      const data = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
      const categories = data['@graph'] || [data]

      for (const category of categories) {
        try {
          const value = category.categoryValue || this.extractValueFromIRI(category['@id'])
          const iri = generateIRI(NodeType.TCM_CATEGORY, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(category.prefLabel || {})
            .description(category.description)
            .build()

          this.registry.registerNode(node, NodeType.TCM_CATEGORY)
        } catch (error) {
          this.addError('transform', categoriesPath, `Failed to transform category: ${error}`)
        }
      }
    }
  }

  private async loadAyurvedaVocabulary(): Promise<void> {
    const ayurvedaDir = path.join(this.options.dataRoot, 'systems', 'ayurveda')

    // Load doshas
    const doshasPath = path.join(ayurvedaDir, 'doshas.jsonld')
    if (fs.existsSync(doshasPath)) {
      const data = JSON.parse(fs.readFileSync(doshasPath, 'utf-8'))
      const doshas = data['@graph'] || [data]

      for (const dosha of doshas) {
        try {
          const value = dosha.doshaValue || this.extractValueFromIRI(dosha['@id'])
          const iri = generateIRI(NodeType.AYURVEDA_DOSHA, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(dosha.prefLabel || {})
            .description(dosha.description)
            .build()

          this.registry.registerNode(node, NodeType.AYURVEDA_DOSHA)
        } catch (error) {
          this.addError('transform', doshasPath, `Failed to transform dosha: ${error}`)
        }
      }
    }

    // Load rasas
    const rasasPath = path.join(ayurvedaDir, 'rasas.jsonld')
    if (fs.existsSync(rasasPath)) {
      const data = JSON.parse(fs.readFileSync(rasasPath, 'utf-8'))
      const rasas = data['@graph'] || [data]

      for (const rasa of rasas) {
        try {
          const value = rasa.rasaValue || this.extractValueFromIRI(rasa['@id'])
          const iri = generateIRI(NodeType.AYURVEDA_RASA, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(rasa.prefLabel || {})
            .description(rasa.description)
            .build()

          this.registry.registerNode(node, NodeType.AYURVEDA_RASA)
        } catch (error) {
          this.addError('transform', rasasPath, `Failed to transform rasa: ${error}`)
        }
      }
    }

    // Load gunas
    const gunasPath = path.join(ayurvedaDir, 'gunas.jsonld')
    if (fs.existsSync(gunasPath)) {
      const data = JSON.parse(fs.readFileSync(gunasPath, 'utf-8'))
      const gunas = data['@graph'] || [data]

      for (const guna of gunas) {
        try {
          const value = guna.gunaValue || this.extractValueFromIRI(guna['@id'])
          const iri = generateIRI(NodeType.AYURVEDA_GUNA, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(guna.prefLabel || {})
            .description(guna.description)
            .build()

          this.registry.registerNode(node, NodeType.AYURVEDA_GUNA)
        } catch (error) {
          this.addError('transform', gunasPath, `Failed to transform guna: ${error}`)
        }
      }
    }

    // Load viryas
    const viryasPath = path.join(ayurvedaDir, 'viryas.jsonld')
    if (fs.existsSync(viryasPath)) {
      const data = JSON.parse(fs.readFileSync(viryasPath, 'utf-8'))
      const viryas = data['@graph'] || [data]

      for (const virya of viryas) {
        try {
          const value = virya.viryaValue || this.extractValueFromIRI(virya['@id'])
          const iri = generateIRI(NodeType.AYURVEDA_VIRYA, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(virya.prefLabel || {})
            .description(virya.description)
            .build()

          this.registry.registerNode(node, NodeType.AYURVEDA_VIRYA)
        } catch (error) {
          this.addError('transform', viryasPath, `Failed to transform virya: ${error}`)
        }
      }
    }

    // Load vipakas
    const vipakasPath = path.join(ayurvedaDir, 'vipakas.jsonld')
    if (fs.existsSync(vipakasPath)) {
      const data = JSON.parse(fs.readFileSync(vipakasPath, 'utf-8'))
      const vipakas = data['@graph'] || [data]

      for (const vipaka of vipakas) {
        try {
          const value = vipaka.vipakaValue || this.extractValueFromIRI(vipaka['@id'])
          const iri = generateIRI(NodeType.AYURVEDA_VIPAKA, value)

          const node = new VocabularyNodeBuilder()
            .iri(iri)
            .value(value)
            .prefLabel(vipaka.prefLabel || {})
            .description(vipaka.description)
            .build()

          this.registry.registerNode(node, NodeType.AYURVEDA_VIPAKA)
        } catch (error) {
          this.addError('transform', vipakasPath, `Failed to transform vipaka: ${error}`)
        }
      }
    }
  }

  // =========================================================================
  // Species Loading
  // =========================================================================

  private async loadSpecies(): Promise<void> {
    if (this.options.verbose) console.log('\n🌱 Loading species...')

    const speciesDir = path.join(this.options.dataRoot, 'entities', 'botanical', 'species')
    if (!fs.existsSync(speciesDir)) {
      this.addWarning('data', speciesDir, 'Species directory not found')
      return
    }

    const slugs = fs.readdirSync(speciesDir).filter(name => {
      const entityPath = path.join(speciesDir, name, 'entity.jsonld')
      if (!fs.existsSync(entityPath)) {
        return false
      }

      // Filter by @type: only load actual botanical species
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]

        // Check if this is a Species/BotanicalSource node (not Chemical, Source, etc.)
        const isSpecies = types.some(t =>
          t === 'botany:PlantSpecies' ||
          t === 'herbapedia:BotanicalSource' ||
          t === 'phycology:AlgalSpecies' ||
          t === 'mycology:FungalSpecies' ||
          t === 'herbapedia:Species' ||
          t === 'Species' ||
          t.includes('PlantSpecies') ||
          t === 'schema:Plant'
        )

        // Skip if it is a Chemical or other non-species type
        // Note: We specifically list exclusions - don't use includes('Source') because
        // herbapedia:BotanicalSource is a valid species type
        const isNonSpecies = types.some(t =>
          t === 'herbapedia:Chemical' ||
          t === 'Chemical' ||
          t.includes('Chemical') ||
          t === 'herbapedia:ZoologicalSource' ||
          t === 'herbapedia:MineralSource' ||
          t === 'herbapedia:FungalSource' // Fungi have their own loader
        )

        return isSpecies && !isNonSpecies
      } catch {
        // If we can't parse, skip it
        return false
      }
    })

    for (const slug of slugs) {
      const entityPath = path.join(speciesDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformSpecies(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.SPECIES)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load species: ${error}`)
      }
    }
  }

  private transformSpecies(data: Record<string, unknown>, slug: string): GraphNode | null {
    try {
      const builder = new SpeciesNodeBuilder()

      builder
        .slug(slug)
        .scientificName((data.scientificName as string) || '')
        .name((data.name as Record<string, string>) || {})

      if (data.family) builder.family(data.family as string)
      if (data.genus) builder.genus(data.genus as string)
      if (data.description) builder.description(data.description as Record<string, string>)

      // Extract parts
      if (data.hasPart && Array.isArray(data.hasPart)) {
        for (const part of data.hasPart) {
          const partSlug = this.extractSlugFromRef(part)
          if (partSlug) {
            builder.addPart(generateIRI(NodeType.PART, partSlug))
          }
        }
      }

      // Extract chemicals
      if (data.containsChemical && Array.isArray(data.containsChemical)) {
        for (const chem of data.containsChemical) {
          const chemSlug = this.extractSlugFromRef(chem)
          if (chemSlug) {
            builder.addChemical(generateIRI(NodeType.CHEMICAL, chemSlug))
          }
        }
      }

      // Extract sameAs references
      if (data.sameAs && Array.isArray(data.sameAs)) {
        for (const ref of data.sameAs) {
          const refId = this.extractIdFromRef(ref)
          if (refId && refId.includes('wikidata')) {
            builder.wikidataId(refId)
          }
        }
      }

      return builder.build()
    } catch (error) {
      this.addError('transform', slug, `Failed to transform species: ${error}`)
      return null
    }
  }

  // =========================================================================
  // Parts Loading
  // =========================================================================

  private async loadParts(): Promise<void> {
    if (this.options.verbose) console.log('\n🌿 Loading parts...')

    const partsDir = path.join(this.options.dataRoot, 'entities', 'botanical', 'parts')
    if (!fs.existsSync(partsDir)) {
      return
    }

    const slugs = fs.readdirSync(partsDir).filter(name => {
      const entityPath = path.join(partsDir, name, 'entity.jsonld')
      return fs.existsSync(entityPath)
    })

    for (const slug of slugs) {
      const entityPath = path.join(partsDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformPart(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.PART)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load part: ${error}`)
      }
    }
  }

  private transformPart(data: Record<string, unknown>, slug: string): GraphNode | null {
    try {
      const builder = new PartNodeBuilder()

      builder
        .slug(slug)
        .name((data.name as Record<string, string>) || {})

      if (data.partOf) {
        const speciesSlug = this.extractSlugFromRef(data.partOf)
        if (speciesSlug) {
          builder.partOf(generateIRI(NodeType.SPECIES, speciesSlug))
        }
      }

      return builder.build()
    } catch (error) {
      this.addError('transform', slug, `Failed to transform part: ${error}`)
      return null
    }
  }

  // =========================================================================
  // Chemicals Loading
  // =========================================================================

  private async loadChemicals(): Promise<void> {
    if (this.options.verbose) console.log('\n⚗️ Loading chemicals...')

    const chemicalsDir = path.join(this.options.dataRoot, 'entities', 'botanical', 'chemicals')
    if (!fs.existsSync(chemicalsDir)) {
      return
    }

    const slugs = fs.readdirSync(chemicalsDir).filter(name => {
      const entityPath = path.join(chemicalsDir, name, 'entity.jsonld')
      return fs.existsSync(entityPath)
    })

    for (const slug of slugs) {
      const entityPath = path.join(chemicalsDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformChemical(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.CHEMICAL)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load chemical: ${error}`)
      }
    }
  }

  private transformChemical(data: Record<string, unknown>, slug: string): GraphNode | null {
    try {
      const builder = new ChemicalNodeBuilder()

      builder
        .slug(slug)
        .name((data.name as Record<string, string>) || {})

      if (data.formula) builder.formula(data.formula as string)
      if (data.inChI) builder.inchi(data.inChI as string)
      if (data.inChIKey) builder.inchiKey(data.inChIKey as string)
      if (data.casNumber) builder.casNumber(data.casNumber as string)

      return builder.build()
    } catch (error) {
      this.addError('transform', slug, `Failed to transform chemical: ${error}`)
      return null
    }
  }

  // =========================================================================
  // Barcodes Loading
  // =========================================================================

  private async loadBarcodes(): Promise<void> {
    if (this.options.verbose) console.log('\n🧬 Loading barcodes...')

    const barcodesDir = path.join(this.options.dataRoot, 'entities', 'botanical', 'barcodes')
    if (!fs.existsSync(barcodesDir)) {
      return
    }

    const slugs = fs.readdirSync(barcodesDir).filter(name => {
      const entityPath = path.join(barcodesDir, name, 'entity.jsonld')
      return fs.existsSync(entityPath)
    })

    for (const slug of slugs) {
      const entityPath = path.join(barcodesDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformBarcode(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.BARCODE)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load barcode: ${error}`)
      }
    }
  }

  private transformBarcode(data: Record<string, unknown>, slug: string): GraphNode | null {
    const iri = generateIRI(NodeType.BARCODE, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['botany:DNABarcode'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.barcodes) {
      const speciesSlug = this.extractSlugFromRef(data.barcodes)
      if (speciesSlug) {
        node.barcodes = { '@id': generateIRI(NodeType.SPECIES, speciesSlug) }
      }
    }

    if (data.sequence) {
      node.sequence = data.sequence
    }

    return node
  }

  // =========================================================================
  // Preparations Loading
  // =========================================================================

  private async loadPreparations(): Promise<void> {
    if (this.options.verbose) console.log('\n🫙 Loading preparations...')

    const prepDir = path.join(this.options.dataRoot, 'entities', 'preparations')
    if (!fs.existsSync(prepDir)) {
      return
    }

    const slugs = fs.readdirSync(prepDir).filter(name => {
      const entityPath = path.join(prepDir, name, 'entity.jsonld')
      return fs.existsSync(entityPath)
    })

    for (const slug of slugs) {
      const entityPath = path.join(prepDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformPreparation(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.PREPARATION)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load preparation: ${error}`)
      }
    }
  }

  private transformPreparation(data: Record<string, unknown>, slug: string): GraphNode | null {
    const iri = generateIRI(NodeType.PREPARATION, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['herbal:HerbalPreparation'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.derivedFrom) {
      const refs = Array.isArray(data.derivedFrom) ? data.derivedFrom : [data.derivedFrom]
      node.derivedFrom = refs.map((r: Record<string, string>) => {
        const speciesSlug = this.extractSlugFromRef(r)
        return { '@id': generateIRI(NodeType.SPECIES, speciesSlug) }
      })[0]
    }

    if (data.preparationMethod) {
      node.preparationMethod = data.preparationMethod as string
    }

    return node
  }

  // =========================================================================
  // Formulas Loading
  // =========================================================================

  private async loadFormulas(): Promise<void> {
    if (this.options.verbose) console.log('\n📜 Loading formulas...')

    const formulaDir = path.join(this.options.dataRoot, 'entities', 'formulas')
    if (!fs.existsSync(formulaDir)) {
      return
    }

    const slugs = fs.readdirSync(formulaDir).filter(name => {
      const entityPath = path.join(formulaDir, name, 'entity.jsonld')
      return fs.existsSync(entityPath)
    })

    for (const slug of slugs) {
      const entityPath = path.join(formulaDir, slug, 'entity.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(entityPath, 'utf-8'))
        const node = this.transformFormula(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.FORMULA)
        }
      } catch (error) {
        this.addError('load', entityPath, `Failed to load formula: ${error}`)
      }
    }
  }

  private transformFormula(data: Record<string, unknown>, slug: string): GraphNode | null {
    const iri = generateIRI(NodeType.FORMULA, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['herbapedia:Formula'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.scientificName) {
      node.scientificName = data.scientificName as string
    }

    if (data.description) {
      node.description = data.description as Record<string, string>
    }

    if (data.hasIngredient) {
      const refs = Array.isArray(data.hasIngredient) ? data.hasIngredient : [data.hasIngredient]
      node.hasIngredient = refs.map((r: Record<string, string>) => {
        const ingredientSlug = this.extractSlugFromRef(r)
        return { '@id': generateIRI(NodeType.PREPARATION, ingredientSlug) }
      })
    }

    return node
  }

  // =========================================================================
  // Profile Loading
  // =========================================================================

  private async loadTCMProfiles(): Promise<void> {
    if (this.options.verbose) console.log('\n🩺 Loading TCM profiles...')

    // Load from systems/tcm/herbs/
    const tcmHerbsDir = path.join(this.options.dataRoot, 'systems', 'tcm', 'herbs')
    if (fs.existsSync(tcmHerbsDir)) {
      const slugs = fs.readdirSync(tcmHerbsDir).filter(name => {
        const profilePath = path.join(tcmHerbsDir, name, 'profile.jsonld')
        return fs.existsSync(profilePath)
      })

      for (const slug of slugs) {
        const profilePath = path.join(tcmHerbsDir, slug, 'profile.jsonld')
        try {
          const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
          const node = this.transformTCMProfile(data, slug)

          if (node) {
            this.registry.registerNode(node, NodeType.TCM_PROFILE)
          }
        } catch (error) {
          this.addError('load', profilePath, `Failed to load TCM profile: ${error}`)
        }
      }
    }

    // Also load from profiles/tcm/
    const profilesDir = path.join(this.options.dataRoot, 'profiles', 'tcm')
    if (fs.existsSync(profilesDir)) {
      const slugs = fs.readdirSync(profilesDir).filter(name => {
        const profilePath = path.join(profilesDir, name, 'profile.jsonld')
        return fs.existsSync(profilePath)
      })

      for (const slug of slugs) {
        // Skip if already loaded
        const iri = generateIRI(NodeType.TCM_PROFILE, slug)
        if (this.registry.hasNode(iri)) continue

        const profilePath = path.join(profilesDir, slug, 'profile.jsonld')
        try {
          const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
          const node = this.transformTCMProfile(data, slug)

          if (node) {
            this.registry.registerNode(node, NodeType.TCM_PROFILE)
          }
        } catch (error) {
          this.addError('load', profilePath, `Failed to load TCM profile: ${error}`)
        }
      }
    }
  }

  private transformTCMProfile(data: Record<string, unknown>, slug: string): GraphNode | null {
    try {
      const builder = new TcmProfileNodeBuilder()

      builder
        .slug(slug)
        .name((data.name as Record<string, string>) || {})

      if (data.pinyin) builder.pinyin(data.pinyin as string)
      if (data.chineseName) builder.chineseName(data.chineseName as Record<string, string>)

      // Derivation
      if (data.derivedFromPlant) {
        const speciesSlug = this.extractSlugFromRef(data.derivedFromPlant)
        if (speciesSlug) {
          builder.derivedFrom(generateIRI(NodeType.SPECIES, speciesSlug))
        }
      }

      // Category
      if (data.hasCategory) {
        const catValue = this.extractValueFromRef(data.hasCategory)
        if (catValue) {
          builder.hasCategory(generateIRI(NodeType.TCM_CATEGORY, catValue))
        }
      }

      // Nature
      if (data.hasNature) {
        const natureValue = this.extractValueFromRef(data.hasNature)
        if (natureValue) {
          builder.hasNature(generateIRI(NodeType.TCM_NATURE, natureValue))
        }
      }

      // Flavors
      if (data.hasFlavor && Array.isArray(data.hasFlavor)) {
        for (const flavor of data.hasFlavor) {
          const flavorValue = this.extractValueFromRef(flavor)
          if (flavorValue) {
            builder.addFlavor(generateIRI(NodeType.TCM_FLAVOR, flavorValue))
          }
        }
      }

      // Meridians
      if (data.entersMeridian && Array.isArray(data.entersMeridian)) {
        for (const meridian of data.entersMeridian) {
          const meridianValue = this.extractValueFromRef(meridian)
          if (meridianValue) {
            builder.addMeridian(generateIRI(NodeType.TCM_MERIDIAN, meridianValue))
          }
        }
      }

      // Text content
      if (data.tcmFunctions) builder.tcmFunctions(data.tcmFunctions as Record<string, string>)
      if (data.tcmTraditionalUsage) builder.tcmTraditionalUsage(data.tcmTraditionalUsage as Record<string, string>)
      if (data.tcmModernResearch) builder.tcmModernResearch(data.tcmModernResearch as Record<string, string>)
      if (data.dosage) builder.dosage(data.dosage as Record<string, string>)
      if (data.contraindications) builder.contraindications(data.contraindications as Record<string, string>)

      // SameAs
      if (data.sameAs && Array.isArray(data.sameAs)) {
        for (const ref of data.sameAs) {
          const refId = this.extractIdFromRef(ref)
          if (refId) {
            builder.addSameAs(refId)
          }
        }
      }

      return builder.build()
    } catch (error) {
      this.addError('transform', slug, `Failed to transform TCM profile: ${error}`)
      return null
    }
  }

  private async loadAyurvedaProfiles(): Promise<void> {
    if (this.options.verbose) console.log('\n🕉️ Loading Ayurveda profiles...')

    const ayurvedaDir = path.join(this.options.dataRoot, 'systems', 'ayurveda', 'dravyas')
    if (!fs.existsSync(ayurvedaDir)) {
      return
    }

    const slugs = fs.readdirSync(ayurvedaDir).filter(name => {
      const profilePath = path.join(ayurvedaDir, name, 'profile.jsonld')
      return fs.existsSync(profilePath)
    })

    for (const slug of slugs) {
      const profilePath = path.join(ayurvedaDir, slug, 'profile.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
        const node = this.transformAyurvedaProfile(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.AYURVEDA_PROFILE)
        }
      } catch (error) {
        this.addError('load', profilePath, `Failed to load Ayurveda profile: ${error}`)
      }
    }
  }

  private transformAyurvedaProfile(data: Record<string, unknown>, slug: string): GraphNode | null {
    const iri = generateIRI(NodeType.AYURVEDA_PROFILE, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/ayurveda.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['ayurveda:Dravya'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.sanskritName) {
      node.sanskritName = data.sanskritName as Record<string, string>
    }

    if (data.derivedFromPlant) {
      const speciesSlug = this.extractSlugFromRef(data.derivedFromPlant)
      if (speciesSlug) {
        node.derivedFrom = { '@id': generateIRI(NodeType.SPECIES, speciesSlug) }
      }
    }

    if (data.hasRasa) {
      const refs = Array.isArray(data.hasRasa) ? data.hasRasa : [data.hasRasa]
      node.hasRasa = refs.map((r: Record<string, string>) => {
        const value = this.extractSlugFromRef(r)
        return { '@id': generateIRI(NodeType.AYURVEDA_RASA, value) }
      })
    }

    if (data.hasGuna) {
      const refs = Array.isArray(data.hasGuna) ? data.hasGuna : [data.hasGuna]
      node.hasGuna = refs.map((r: Record<string, string>) => {
        const value = this.extractSlugFromRef(r)
        return { '@id': generateIRI(NodeType.AYURVEDA_GUNA, value) }
      })
    }

    if (data.hasVirya) {
      const value = this.extractSlugFromRef(data.hasVirya)
      node.hasVirya = { '@id': generateIRI(NodeType.AYURVEDA_VIRYA, value) }
    }

    if (data.hasVipaka) {
      const value = this.extractSlugFromRef(data.hasVipaka)
      node.hasVipaka = { '@id': generateIRI(NodeType.AYURVEDA_VIPAKA, value) }
    }

    if (data.balancesDosha) {
      const refs = Array.isArray(data.balancesDosha) ? data.balancesDosha : [data.balancesDosha]
      node.affectsDosha = refs.map((r: Record<string, string>) => {
        const value = this.extractSlugFromRef(r)
        return { '@id': generateIRI(NodeType.AYURVEDA_DOSHA, value) }
      })
    }

    if (data.ayurvedaTraditionalUsage) {
      node.ayurvedaTraditionalUsage = data.ayurvedaTraditionalUsage as Record<string, string>
    }

    return node
  }

  private async loadWesternProfiles(): Promise<void> {
    if (this.options.verbose) console.log('\n💊 Loading Western profiles...')

    const westernDir = path.join(this.options.dataRoot, 'systems', 'western', 'herbs')
    if (!fs.existsSync(westernDir)) {
      return
    }

    const slugs = fs.readdirSync(westernDir).filter(name => {
      const profilePath = path.join(westernDir, name, 'profile.jsonld')
      return fs.existsSync(profilePath)
    })

    for (const slug of slugs) {
      const profilePath = path.join(westernDir, slug, 'profile.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
        const node = this.transformWesternProfile(data, slug)

        if (node) {
          this.registry.registerNode(node, NodeType.WESTERN_PROFILE)
        }
      } catch (error) {
        this.addError('load', profilePath, `Failed to load Western profile: ${error}`)
      }
    }
  }

  private transformWesternProfile(data: Record<string, unknown>, slug: string): GraphNode | null {
    const iri = generateIRI(NodeType.WESTERN_PROFILE, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/western.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['herbapedia:WesternHerbProfile'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.derivedFromPlant) {
      const speciesSlug = this.extractSlugFromRef(data.derivedFromPlant)
      if (speciesSlug) {
        node.derivedFrom = { '@id': generateIRI(NodeType.SPECIES, speciesSlug) }
      }
    }

    if (data.westernTraditionalUsage) {
      node.westernTraditionalUsage = data.westernTraditionalUsage as Record<string, string>
    }

    if (data.westernHistory) {
      node.westernHistory = data.westernHistory as Record<string, string>
    }

    if (data.hasAction) {
      const refs = Array.isArray(data.hasAction) ? data.hasAction : [data.hasAction]
      node.hasAction = refs.map((r: Record<string, string>) => ({
        '@id': `https://www.herbapedia.org/vocab/western/action/${this.extractSlugFromRef(r)}`
      }))
    }

    if (data.hasOrganAffinity) {
      const refs = Array.isArray(data.hasOrganAffinity) ? data.hasOrganAffinity : [data.hasOrganAffinity]
      node.hasOrganAffinity = refs.map((r: Record<string, string>) => ({
        '@id': `https://www.herbapedia.org/vocab/western/organ/${this.extractSlugFromRef(r)}`
      }))
    }

    return node
  }

  private async loadUnaniProfiles(): Promise<void> {
    if (this.options.verbose) console.log('\n📜 Loading Unani profiles...')

    const unaniDir = path.join(this.options.dataRoot, 'systems', 'unani')
    if (!fs.existsSync(unaniDir)) {
      return
    }

    // Check for herbs or profiles subdirectory
    const herbsDir = path.join(unaniDir, 'herbs')
    const profilesDir = path.join(unaniDir, 'profiles')

    const dataDir = fs.existsSync(herbsDir) ? herbsDir : (fs.existsSync(profilesDir) ? profilesDir : null)
    if (!dataDir) {
      return
    }

    const slugs = fs.readdirSync(dataDir).filter(name => {
      const profilePath = path.join(dataDir, name, 'profile.jsonld')
      return fs.existsSync(profilePath)
    })

    for (const slug of slugs) {
      const profilePath = path.join(dataDir, slug, 'profile.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
        const node = this.transformGenericProfile(data, slug, NodeType.UNANI_PROFILE)

        if (node) {
          this.registry.registerNode(node, NodeType.UNANI_PROFILE)
        }
      } catch (error) {
        this.addError('load', profilePath, `Failed to load Unani profile: ${error}`)
      }
    }
  }

  private async loadMongolianProfiles(): Promise<void> {
    if (this.options.verbose) console.log('\n🏔️ Loading Mongolian profiles...')

    const mongolianDir = path.join(this.options.dataRoot, 'systems', 'mongolian')
    if (!fs.existsSync(mongolianDir)) {
      return
    }

    // Check for herbs or profiles subdirectory
    const herbsDir = path.join(mongolianDir, 'herbs')
    const profilesDir = path.join(mongolianDir, 'profiles')

    const dataDir = fs.existsSync(herbsDir) ? herbsDir : (fs.existsSync(profilesDir) ? profilesDir : null)
    if (!dataDir) {
      return
    }

    const slugs = fs.readdirSync(dataDir).filter(name => {
      const profilePath = path.join(dataDir, name, 'profile.jsonld')
      return fs.existsSync(profilePath)
    })

    for (const slug of slugs) {
      const profilePath = path.join(dataDir, slug, 'profile.jsonld')
      try {
        const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
        const node = this.transformGenericProfile(data, slug, NodeType.MONGOLIAN_PROFILE)

        if (node) {
          this.registry.registerNode(node, NodeType.MONGOLIAN_PROFILE)
        }
      } catch (error) {
        this.addError('load', profilePath, `Failed to load Mongolian profile: ${error}`)
      }
    }
  }

  private transformGenericProfile(data: Record<string, unknown>, slug: string, nodeType: NodeTypeValue): GraphNode | null {
    const iri = generateIRI(nodeType, slug)
    const node: GraphNode = {
      '@context': 'https://www.herbapedia.org/schema/context/core.jsonld',
      '@id': iri,
      '@type': data['@type'] || ['herbapedia:HerbProfile'],
      slug,
      name: (data.name as Record<string, string>) || {},
    }

    if (data.derivedFromPlant) {
      const speciesSlug = this.extractSlugFromRef(data.derivedFromPlant)
      if (speciesSlug) {
        node.derivedFrom = { '@id': generateIRI(NodeType.SPECIES, speciesSlug) }
      }
    }

    if (data.description) {
      node.description = data.description as Record<string, string>
    }

    return node
  }

  // =========================================================================
  // Reference Resolution
  // =========================================================================

  private resolveReferences(): void {
    if (this.options.verbose) console.log('\n🔗 Resolving references...')

    // Register all references from all nodes
    const allNodes = this.registry.getAllNodes()
    for (const node of allNodes) {
      this.registry.registerReferences(node)
    }

    // Check for unresolved references
    const unresolved = this.registry.resolver.getUnresolvedReferences()
    for (const iri of unresolved) {
      this.addWarning('reference', iri, `Unresolved reference: ${iri}`)
    }

    if (this.options.verbose && unresolved.length > 0) {
      console.log(`  Found ${unresolved.length} unresolved references`)
    }
  }

  // =========================================================================
  // Validation
  // =========================================================================

  private validateGraph(): void {
    if (this.options.verbose) console.log('\n✅ Validating graph...')

    // Validate each node type
    // This will be expanded with SHACL validation
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private extractSlugFromRef(ref: unknown): string | null {
    if (typeof ref === 'string') {
      return ref.split('/').pop() || null
    }
    if (typeof ref === 'object' && ref !== null && '@id' in ref) {
      const id = (ref as { '@id': string })['@id']
      return id.split('/').pop() || null
    }
    return null
  }

  private extractValueFromRef(ref: unknown): string | null {
    if (typeof ref === 'string') {
      return ref.split('/').pop() || null
    }
    if (typeof ref === 'object' && ref !== null && '@id' in ref) {
      const id = (ref as { '@id': string })['@id']
      return id.split('/').pop() || null
    }
    return null
  }

  private extractIdFromRef(ref: unknown): string | null {
    if (typeof ref === 'string') {
      return ref
    }
    if (typeof ref === 'object' && ref !== null && '@id' in ref) {
      return (ref as { '@id': string })['@id']
    }
    return null
  }

  private extractValueFromIRI(iri: string): string {
    return iri.split('/').pop() || iri
  }

  private addError(type: BuildError['type'], source: string, message: string, details?: unknown): void {
    this.errors.push({ type, source, message, details })
    if (this.options.verbose) {
      console.error(`  ❌ [${type}] ${source}: ${message}`)
    }
  }

  private addWarning(type: BuildWarning['type'], source: string, message: string): void {
    this.warnings.push({ type, source, message })
    if (this.options.verbose) {
      console.warn(`  ⚠️ [${type}] ${source}: ${message}`)
    }
  }
}

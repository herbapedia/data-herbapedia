/**
 * Botanical Node Classes
 *
 * Species, Part, and Chemical nodes represent the botanical layer
 * of the knowledge graph. These contain factual botanical data only -
 * no medical system interpretations.
 */

import { GraphNodeBase, lang, ref, type LanguageMap, type IRIReference } from './GraphNodeBase.js'
import { NodeType, generateIRI } from '../types.js'

// ============================================================================
// Species Node
// ============================================================================

/**
 * Builder for SpeciesNode
 */
export class SpeciesNodeBuilder {
  private _slug: string = ''
  private _scientificName: string = ''
  private _name: LanguageMap = {}
  private _description?: LanguageMap
  private _family?: string
  private _genus?: string
  private _species?: string
  private _authorship?: string
  private _gbifId?: string
  private _wikidataId?: string
  private _hasParts: IRIReference[] = []
  private _containsChemicals: IRIReference[] = []
  private _hasProfiles: IRIReference[] = []
  private _images: string[] = []

  slug(value: string): this { this._slug = value; return this }
  scientificName(value: string): this { this._scientificName = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  description(value: LanguageMap): this { this._description = value; return this }
  family(value: string): this { this._family = value; return this }
  genus(value: string): this { this._genus = value; return this }
  species(value: string): this { this._species = value; return this }
  authorship(value: string): this { this._authorship = value; return this }
  gbifId(value: string): this { this._gbifId = value; return this }
  wikidataId(value: string): this { this._wikidataId = value; return this }

  addPart(iri: string): this { this._hasParts.push(ref(iri)); return this }
  addChemical(iri: string): this { this._containsChemicals.push(ref(iri)); return this }
  addProfile(iri: string): this { this._hasProfiles.push(ref(iri)); return this }
  addImage(url: string): this { this._images.push(url); return this }

  build(): SpeciesNode {
    if (!this._slug) throw new Error('Species slug is required')
    // scientificName can be empty for synthetic/non-botanical sources

    return new SpeciesNode({
      slug: this._slug,
      scientificName: this._scientificName || '',
      name: this._name,
      description: this._description,
      family: this._family,
      genus: this._genus,
      species: this._species,
      authorship: this._authorship,
      gbifId: this._gbifId,
      wikidataId: this._wikidataId,
      hasParts: this._hasParts.length > 0 ? this._hasParts : undefined,
      containsChemicals: this._containsChemicals.length > 0 ? this._containsChemicals : undefined,
      hasProfiles: this._hasProfiles.length > 0 ? this._hasProfiles : undefined,
      images: this._images.length > 0 ? this._images : undefined,
    })
  }
}

/**
 * Species Node - a botanical species
 */
export class SpeciesNode extends GraphNodeBase {
  readonly slug: string
  readonly scientificName: string
  readonly name: LanguageMap
  readonly description?: LanguageMap
  readonly family?: string
  readonly genus?: string
  readonly species?: string
  readonly authorship?: string
  readonly gbifId?: string
  readonly wikidataId?: string
  readonly hasParts?: IRIReference[]
  readonly containsChemicals?: IRIReference[]
  readonly hasProfiles?: IRIReference[]
  readonly images?: string[]

  constructor(data: {
    slug: string
    scientificName: string
    name: LanguageMap
    description?: LanguageMap
    family?: string
    genus?: string
    species?: string
    authorship?: string
    gbifId?: string
    wikidataId?: string
    hasParts?: IRIReference[]
    containsChemicals?: IRIReference[]
    hasProfiles?: IRIReference[]
    images?: string[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/core.jsonld',
      generateIRI(NodeType.SPECIES, data.slug),
      ['schema:Plant', 'herbapedia:MedicinalPlant']
    )

    this.slug = data.slug
    this.scientificName = data.scientificName
    this.name = data.name
    this.description = data.description
    this.family = data.family
    this.genus = data.genus
    this.species = data.species
    this.authorship = data.authorship
    this.gbifId = data.gbifId
    this.wikidataId = data.wikidataId
    this.hasParts = data.hasParts
    this.containsChemicals = data.containsChemicals
    this.hasProfiles = data.hasProfiles
    this.images = data.images
  }

  static builder(): SpeciesNodeBuilder {
    return new SpeciesNodeBuilder()
  }

  /**
   * Create from existing JSON-LD data
   */
  static fromJSONLD(data: Record<string, unknown>): SpeciesNode {
    const builder = SpeciesNode.builder()

    if (data['@id']) {
      const id = data['@id'] as string
      const slug = id.split('/').pop() || ''
      builder.slug(slug)
    }

    if (data.scientificName) builder.scientificName(data.scientificName as string)
    if (data.name) builder.name(data.name as LanguageMap)
    if (data.description) builder.description(data.description as LanguageMap)
    if (data.family) builder.family(data.family as string)
    if (data.genus) builder.genus(data.genus as string)
    if (data.gbifId) builder.gbifId(data.gbifId as string)

    return builder.build()
  }
}

// ============================================================================
// Part Node
// ============================================================================

export class PartNodeBuilder {
  private _slug: string = ''
  private _name: LanguageMap = {}
  private _partOf?: IRIReference
  private _partType?: string
  private _containsChemicals: IRIReference[] = []

  slug(value: string): this { this._slug = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  partOf(iri: string): this { this._partOf = ref(iri); return this }
  partType(value: string): this { this._partType = value; return this }
  addChemical(iri: string): this { this._containsChemicals.push(ref(iri)); return this }

  build(): PartNode {
    if (!this._slug) throw new Error('Part slug is required')
    return new PartNode({
      slug: this._slug,
      name: this._name,
      partOf: this._partOf,
      partType: this._partType,
      containsChemicals: this._containsChemicals.length > 0 ? this._containsChemicals : undefined,
    })
  }
}

export class PartNode extends GraphNodeBase {
  readonly slug: string
  readonly name: LanguageMap
  readonly partOf?: IRIReference
  readonly partType?: string
  readonly containsChemicals?: IRIReference[]

  constructor(data: {
    slug: string
    name: LanguageMap
    partOf?: IRIReference
    partType?: string
    containsChemicals?: IRIReference[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/core.jsonld',
      generateIRI(NodeType.PART, data.slug),
      ['herbapedia:PlantPart']
    )

    this.slug = data.slug
    this.name = data.name
    this.partOf = data.partOf
    this.partType = data.partType
    this.containsChemicals = data.containsChemicals
  }

  static builder(): PartNodeBuilder {
    return new PartNodeBuilder()
  }
}

// ============================================================================
// Chemical Node
// ============================================================================

export class ChemicalNodeBuilder {
  private _slug: string = ''
  private _name: LanguageMap = {}
  private _formula?: string
  private _inchi?: string
  private _inchiKey?: string
  private _casNumber?: string
  private _pubchemId?: string

  slug(value: string): this { this._slug = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  formula(value: string): this { this._formula = value; return this }
  inchi(value: string): this { this._inchi = value; return this }
  inchiKey(value: string): this { this._inchiKey = value; return this }
  casNumber(value: string): this { this._casNumber = value; return this }
  pubchemId(value: string): this { this._pubchemId = value; return this }

  build(): ChemicalNode {
    if (!this._slug) throw new Error('Chemical slug is required')
    return new ChemicalNode({
      slug: this._slug,
      name: this._name,
      formula: this._formula,
      inchi: this._inchi,
      inchiKey: this._inchiKey,
      casNumber: this._casNumber,
      pubchemId: this._pubchemId,
    })
  }
}

export class ChemicalNode extends GraphNodeBase {
  readonly slug: string
  readonly name: LanguageMap
  readonly formula?: string
  readonly inchi?: string
  readonly inchiKey?: string
  readonly casNumber?: string
  readonly pubchemId?: string

  constructor(data: {
    slug: string
    name: LanguageMap
    formula?: string
    inchi?: string
    inchiKey?: string
    casNumber?: string
    pubchemId?: string
  }) {
    super(
      'https://www.herbapedia.org/schema/context/core.jsonld',
      generateIRI(NodeType.CHEMICAL, data.slug),
      ['herbapedia:ChemicalCompound']
    )

    this.slug = data.slug
    this.name = data.name
    this.formula = data.formula
    this.inchi = data.inchi
    this.inchiKey = data.inchiKey
    this.casNumber = data.casNumber
    this.pubchemId = data.pubchemId
  }

  static builder(): ChemicalNodeBuilder {
    return new ChemicalNodeBuilder()
  }
}

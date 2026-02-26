/**
 * Profile Node Classes
 *
 * Profile nodes represent medical system interpretations of botanical entities.
 * Each profile belongs to exactly one medical system and interprets a species
 * or preparation through that system's lens.
 */

import { GraphNodeBase, ref, type LanguageMap, type IRIReference } from './GraphNodeBase.js'
import { NodeType, MedicalSystem, generateIRI } from '../types.js'

// ============================================================================
// TCM Profile Node
// ============================================================================

export class TcmProfileNodeBuilder {
  private _slug: string = ''
  private _name: LanguageMap = {}
  private _pinyin?: string
  private _chineseName?: LanguageMap
  private _derivedFrom?: IRIReference
  private _hasCategory?: IRIReference
  private _hasNature?: IRIReference
  private _hasFlavors: IRIReference[] = []
  private _entersMeridians: IRIReference[] = []
  private _tcmFunctions?: LanguageMap
  private _tcmTraditionalUsage?: LanguageMap
  private _tcmModernResearch?: LanguageMap
  private _dosage?: LanguageMap
  private _contraindications?: LanguageMap
  private _cautions?: LanguageMap
  private _incompatibilities?: LanguageMap
  private _antidotes?: LanguageMap
  private _dietaryRestrictions?: LanguageMap
  private _source?: string
  private _sameAs: IRIReference[] = []

  slug(value: string): this { this._slug = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  pinyin(value: string): this { this._pinyin = value; return this }
  chineseName(value: LanguageMap): this { this._chineseName = value; return this }
  derivedFrom(iri: string): this { this._derivedFrom = ref(iri); return this }
  hasCategory(iri: string): this { this._hasCategory = ref(iri); return this }
  hasNature(iri: string): this { this._hasNature = ref(iri); return this }
  addFlavor(iri: string): this { this._hasFlavors.push(ref(iri)); return this }
  addMeridian(iri: string): this { this._entersMeridians.push(ref(iri)); return this }
  tcmFunctions(value: LanguageMap): this { this._tcmFunctions = value; return this }
  tcmTraditionalUsage(value: LanguageMap): this { this._tcmTraditionalUsage = value; return this }
  tcmModernResearch(value: LanguageMap): this { this._tcmModernResearch = value; return this }
  dosage(value: LanguageMap): this { this._dosage = value; return this }
  contraindications(value: LanguageMap): this { this._contraindications = value; return this }
  cautions(value: LanguageMap): this { this._cautions = value; return this }
  incompatibilities(value: LanguageMap): this { this._incompatibilities = value; return this }
  antidotes(value: LanguageMap): this { this._antidotes = value; return this }
  dietaryRestrictions(value: LanguageMap): this { this._dietaryRestrictions = value; return this }
  source(value: string): this { this._source = value; return this }
  addSameAs(iri: string): this { this._sameAs.push(ref(iri)); return this }

  build(): TcmProfileNode {
    if (!this._slug) throw new Error('TCM profile slug is required')
    return new TcmProfileNode({
      slug: this._slug,
      name: this._name,
      pinyin: this._pinyin,
      chineseName: this._chineseName,
      derivedFrom: this._derivedFrom,
      hasCategory: this._hasCategory,
      hasNature: this._hasNature,
      hasFlavor: this._hasFlavors.length > 0 ? this._hasFlavors : undefined,
      entersMeridian: this._entersMeridians.length > 0 ? this._entersMeridians : undefined,
      tcmFunctions: this._tcmFunctions,
      tcmTraditionalUsage: this._tcmTraditionalUsage,
      tcmModernResearch: this._tcmModernResearch,
      dosage: this._dosage,
      contraindications: this._contraindications,
      cautions: this._cautions,
      incompatibilities: this._incompatibilities,
      antidotes: this._antidotes,
      dietaryRestrictions: this._dietaryRestrictions,
      source: this._source,
      sameAs: this._sameAs.length > 0 ? this._sameAs : undefined,
    })
  }
}

export class TcmProfileNode extends GraphNodeBase {
  readonly slug: string
  readonly name: LanguageMap
  readonly pinyin?: string
  readonly chineseName?: LanguageMap
  readonly derivedFrom?: IRIReference
  readonly hasCategory?: IRIReference
  readonly hasNature?: IRIReference
  readonly hasFlavor?: IRIReference[]
  readonly entersMeridian?: IRIReference[]
  readonly tcmFunctions?: LanguageMap
  readonly tcmTraditionalUsage?: LanguageMap
  readonly tcmModernResearch?: LanguageMap
  readonly dosage?: LanguageMap
  readonly contraindications?: LanguageMap
  readonly cautions?: LanguageMap
  readonly incompatibilities?: LanguageMap
  readonly antidotes?: LanguageMap
  readonly dietaryRestrictions?: LanguageMap
  readonly source?: string
  readonly sameAs?: IRIReference[]

  static builder(): TcmProfileNodeBuilder {
    return new TcmProfileNodeBuilder()
  }

  constructor(data: {
    slug: string
    name: LanguageMap
    pinyin?: string
    chineseName?: LanguageMap
    derivedFrom?: IRIReference
    hasCategory?: IRIReference
    hasNature?: IRIReference
    hasFlavor?: IRIReference[]
    entersMeridian?: IRIReference[]
    tcmFunctions?: LanguageMap
    tcmTraditionalUsage?: LanguageMap
    tcmModernResearch?: LanguageMap
    dosage?: LanguageMap
    contraindications?: LanguageMap
    cautions?: LanguageMap
    incompatibilities?: LanguageMap
    antidotes?: LanguageMap
    dietaryRestrictions?: LanguageMap
    source?: string
    sameAs?: IRIReference[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/tcm.jsonld',
      generateIRI(NodeType.TCM_PROFILE, data.slug),
      ['tcm:Herb', 'schema:DietarySupplement']
    )

    this.slug = data.slug
    this.name = data.name
    this.pinyin = data.pinyin
    this.chineseName = data.chineseName
    this.derivedFrom = data.derivedFrom
    this.hasCategory = data.hasCategory
    this.hasNature = data.hasNature
    this.hasFlavor = data.hasFlavor
    this.entersMeridian = data.entersMeridian
    this.tcmFunctions = data.tcmFunctions
    this.tcmTraditionalUsage = data.tcmTraditionalUsage
    this.tcmModernResearch = data.tcmModernResearch
    this.dosage = data.dosage
    this.contraindications = data.contraindications
    this.cautions = data.cautions
    this.incompatibilities = data.incompatibilities
    this.antidotes = data.antidotes
    this.dietaryRestrictions = data.dietaryRestrictions
    this.source = data.source
    this.sameAs = data.sameAs
  }

  static builder(): TcmProfileNodeBuilder {
    return new TcmProfileNodeBuilder()
  }
}

// ============================================================================
// Ayurveda Profile Node
// ============================================================================

export class AyurvedaProfileNodeBuilder {
  private _slug: string = ''
  private _name: LanguageMap = {}
  private _sanskritName?: LanguageMap
  private _derivedFrom?: IRIReference
  private _hasRasas: IRIReference[] = []
  private _hasGunas: IRIReference[] = []
  private _hasVirya?: IRIReference
  private _hasVipaka?: IRIReference
  private _affectsDoshas: IRIReference[] = []
  private _ayurvedaTraditionalUsage?: LanguageMap
  private _ayurvedaModernResearch?: LanguageMap
  private _source?: string
  private _sameAs: IRIReference[] = []

  slug(value: string): this { this._slug = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  sanskritName(value: LanguageMap): this { this._sanskritName = value; return this }
  derivedFrom(iri: string): this { this._derivedFrom = ref(iri); return this }
  addRasa(iri: string): this { this._hasRasas.push(ref(iri)); return this }
  addGuna(iri: string): this { this._hasGunas.push(ref(iri)); return this }
  hasVirya(iri: string): this { this._hasVirya = ref(iri); return this }
  hasVipaka(iri: string): this { this._hasVipaka = ref(iri); return this }
  addDosha(iri: string): this { this._affectsDoshas.push(ref(iri)); return this }
  ayurvedaTraditionalUsage(value: LanguageMap): this { this._ayurvedaTraditionalUsage = value; return this }
  ayurvedaModernResearch(value: LanguageMap): this { this._ayurvedaModernResearch = value; return this }
  source(value: string): this { this._source = value; return this }
  addSameAs(iri: string): this { this._sameAs.push(ref(iri)); return this }

  build(): AyurvedaProfileNode {
    if (!this._slug) throw new Error('Ayurveda profile slug is required')
    return new AyurvedaProfileNode({
      slug: this._slug,
      name: this._name,
      sanskritName: this._sanskritName,
      derivedFrom: this._derivedFrom,
      hasRasa: this._hasRasas.length > 0 ? this._hasRasas : undefined,
      hasGuna: this._hasGunas.length > 0 ? this._hasGunas : undefined,
      hasVirya: this._hasVirya,
      hasVipaka: this._hasVipaka,
      affectsDosha: this._affectsDoshas.length > 0 ? this._affectsDoshas : undefined,
      ayurvedaTraditionalUsage: this._ayurvedaTraditionalUsage,
      ayurvedaModernResearch: this._ayurvedaModernResearch,
      source: this._source,
      sameAs: this._sameAs.length > 0 ? this._sameAs : undefined,
    })
  }
}

export class AyurvedaProfileNode extends GraphNodeBase {
  readonly slug: string
  readonly name: LanguageMap
  readonly sanskritName?: LanguageMap
  readonly derivedFrom?: IRIReference
  readonly hasRasa?: IRIReference[]
  readonly hasGuna?: IRIReference[]
  readonly hasVirya?: IRIReference
  readonly hasVipaka?: IRIReference
  readonly affectsDosha?: IRIReference[]
  readonly ayurvedaTraditionalUsage?: LanguageMap
  readonly ayurvedaModernResearch?: LanguageMap
  readonly source?: string
  readonly sameAs?: IRIReference[]

  constructor(data: {
    slug: string
    name: LanguageMap
    sanskritName?: LanguageMap
    derivedFrom?: IRIReference
    hasRasa?: IRIReference[]
    hasGuna?: IRIReference[]
    hasVirya?: IRIReference
    hasVipaka?: IRIReference
    affectsDosha?: IRIReference[]
    ayurvedaTraditionalUsage?: LanguageMap
    ayurvedaModernResearch?: LanguageMap
    source?: string
    sameAs?: IRIReference[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/ayurveda.jsonld',
      generateIRI(NodeType.AYURVEDA_PROFILE, data.slug),
      ['ayurveda:Dravya', 'schema:DietarySupplement']
    )

    this.slug = data.slug
    this.name = data.name
    this.sanskritName = data.sanskritName
    this.derivedFrom = data.derivedFrom
    this.hasRasa = data.hasRasa
    this.hasGuna = data.hasGuna
    this.hasVirya = data.hasVirya
    this.hasVipaka = data.hasVipaka
    this.affectsDosha = data.affectsDosha
    this.ayurvedaTraditionalUsage = data.ayurvedaTraditionalUsage
    this.ayurvedaModernResearch = data.ayurvedaModernResearch
    this.source = data.source
    this.sameAs = data.sameAs
  }

  static builder(): AyurvedaProfileNodeBuilder {
    return new AyurvedaProfileNodeBuilder()
  }
}

// ============================================================================
// Western Herbal Profile Node
// ============================================================================

export class WesternProfileNodeBuilder {
  private _slug: string = ''
  private _name: LanguageMap = {}
  private _derivedFrom?: IRIReference
  private _hasActions: IRIReference[] = []
  private _hasOrganAffinities: IRIReference[] = []
  private _westernTraditionalUsage?: LanguageMap
  private _westernModernResearch?: LanguageMap
  private _source?: string
  private _sameAs: IRIReference[] = []

  slug(value: string): this { this._slug = value; return this }
  name(value: LanguageMap): this { this._name = value; return this }
  derivedFrom(iri: string): this { this._derivedFrom = ref(iri); return this }
  addAction(iri: string): this { this._hasActions.push(ref(iri)); return this }
  addOrganAffinity(iri: string): this { this._hasOrganAffinities.push(ref(iri)); return this }
  westernTraditionalUsage(value: LanguageMap): this { this._westernTraditionalUsage = value; return this }
  westernModernResearch(value: LanguageMap): this { this._westernModernResearch = value; return this }
  source(value: string): this { this._source = value; return this }
  addSameAs(iri: string): this { this._sameAs.push(ref(iri)); return this }

  build(): WesternProfileNode {
    if (!this._slug) throw new Error('Western profile slug is required')
    return new WesternProfileNode({
      slug: this._slug,
      name: this._name,
      derivedFrom: this._derivedFrom,
      hasAction: this._hasActions.length > 0 ? this._hasActions : undefined,
      hasOrganAffinity: this._hasOrganAffinities.length > 0 ? this._hasOrganAffinities : undefined,
      westernTraditionalUsage: this._westernTraditionalUsage,
      westernModernResearch: this._westernModernResearch,
      source: this._source,
      sameAs: this._sameAs.length > 0 ? this._sameAs : undefined,
    })
  }
}

export class WesternProfileNode extends GraphNodeBase {
  readonly slug: string
  readonly name: LanguageMap
  readonly derivedFrom?: IRIReference
  readonly hasAction?: IRIReference[]
  readonly hasOrganAffinity?: IRIReference[]
  readonly westernTraditionalUsage?: LanguageMap
  readonly westernModernResearch?: LanguageMap
  readonly source?: string
  readonly sameAs?: IRIReference[]

  constructor(data: {
    slug: string
    name: LanguageMap
    derivedFrom?: IRIReference
    hasAction?: IRIReference[]
    hasOrganAffinity?: IRIReference[]
    westernTraditionalUsage?: LanguageMap
    westernModernResearch?: LanguageMap
    source?: string
    sameAs?: IRIReference[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/western.jsonld',
      generateIRI(NodeType.WESTERN_PROFILE, data.slug),
      ['western:Herb', 'schema:DietarySupplement']
    )

    this.slug = data.slug
    this.name = data.name
    this.derivedFrom = data.derivedFrom
    this.hasAction = data.hasAction
    this.hasOrganAffinity = data.hasOrganAffinity
    this.westernTraditionalUsage = data.westernTraditionalUsage
    this.westernModernResearch = data.westernModernResearch
    this.source = data.source
    this.sameAs = data.sameAs
  }

  static builder(): WesternProfileNodeBuilder {
    return new WesternProfileNodeBuilder()
  }
}

// ============================================================================
// Vocabulary Node (generic)
// ============================================================================

export class VocabularyNodeBuilder {
  private _iri: string = ''
  private _value: string = ''
  private _prefLabel: LanguageMap = {}
  private _description?: LanguageMap
  private _broader?: IRIReference
  private _related: IRIReference[] = []

  iri(value: string): this { this._iri = value; return this }
  value(value: string): this { this._value = value; return this }
  prefLabel(value: LanguageMap): this { this._prefLabel = value; return this }
  description(value: LanguageMap): this { this._description = value; return this }
  broader(iri: string): this { this._broader = ref(iri); return this }
  addRelated(iri: string): this { this._related.push(ref(iri)); return this }

  build(): VocabularyNode {
    if (!this._iri) throw new Error('Vocabulary IRI is required')
    return new VocabularyNode({
      iri: this._iri,
      value: this._value,
      prefLabel: this._prefLabel,
      description: this._description,
      broader: this._broader,
      related: this._related.length > 0 ? this._related : undefined,
    })
  }
}

export class VocabularyNode extends GraphNodeBase {
  readonly value: string
  readonly prefLabel: LanguageMap
  readonly description?: LanguageMap
  readonly broader?: IRIReference
  readonly related?: IRIReference[]

  constructor(data: {
    iri: string
    value: string
    prefLabel: LanguageMap
    description?: LanguageMap
    broader?: IRIReference
    related?: IRIReference[]
  }) {
    super(
      'https://www.herbapedia.org/schema/context/core.jsonld',
      data.iri,
      ['skos:Concept']
    )

    this.value = data.value
    this.prefLabel = data.prefLabel
    this.description = data.description
    this.broader = data.broader
    this.related = data.related
  }

  static builder(): VocabularyNodeBuilder {
    return new VocabularyNodeBuilder()
  }
}

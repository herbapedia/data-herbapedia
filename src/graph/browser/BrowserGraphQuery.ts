/**
 * BrowserGraphQuery - Browser-compatible query API for the knowledge graph
 *
 * Provides the same API as GraphQuery but works with BrowserGraphRegistry.
 *
 * @example
 * ```typescript
 * import { BrowserGraphRegistry, BrowserGraphQuery } from '@herbapedia/data/graph-browser'
 *
 * const registry = new BrowserGraphRegistry()
 * await registry.loadFromUrl('/api/v1/browser/registry.json')
 *
 * const query = new BrowserGraphQuery(registry)
 *
 * // Get a species by slug
 * const ginseng = query.getSpecies('panax-ginseng')
 *
 * // Get a TCM profile
 * const renshen = query.getProfile('tcm', 'ren-shen')
 *
 * // Find all profiles for a species
 * const profiles = query.findProfilesForSpecies('panax-ginseng')
 * ```
 */

import type {
  GraphNode,
  MedicalSystemValue,
  NodeTypeValue,
} from '../types.js'
import { NodeType, generateIRI } from '../types.js'
import type { BrowserGraphRegistry } from './BrowserGraphRegistry.js'

/**
 * Browser-compatible Query API
 */
export class BrowserGraphQuery {
  private registry: BrowserGraphRegistry

  constructor(registry: BrowserGraphRegistry) {
    this.registry = registry
  }

  // ===========================================================================
  // Botanical Node Queries
  // ===========================================================================

  /**
   * Get a species node by its slug
   */
  getSpecies(slug: string): GraphNode | undefined {
    const iri = generateIRI(NodeType.SPECIES, slug)
    return this.registry.getNode(iri)
  }

  /**
   * Get a species node by its scientific name
   */
  getSpeciesByScientificName(scientificName: string): GraphNode | undefined {
    const allSpecies = this.registry.getNodesByType('herbapedia:Species')
    return allSpecies.find(node => {
      const nodeData = node as { scientificName?: string }
      return nodeData.scientificName?.toLowerCase() === scientificName.toLowerCase()
    })
  }

  /**
   * Get a part node by its slug
   */
  getPart(slug: string): GraphNode | undefined {
    const iri = generateIRI(NodeType.PART, slug)
    return this.registry.getNode(iri)
  }

  /**
   * Get a chemical node by its slug
   */
  getChemical(slug: string): GraphNode | undefined {
    const iri = generateIRI(NodeType.CHEMICAL, slug)
    return this.registry.getNode(iri)
  }

  /**
   * Get a chemical by CAS number
   */
  getChemicalByCasNumber(casNumber: string): GraphNode | undefined {
    const allChemicals = this.registry.getNodesByType('herbapedia:Chemical')
    return allChemicals.find(node => {
      const nodeData = node as { casNumber?: string }
      return nodeData.casNumber === casNumber
    })
  }

  // ===========================================================================
  // Preparation Node Queries
  // ===========================================================================

  /**
   * Get a preparation node by its slug
   */
  getPreparation(slug: string): GraphNode | undefined {
    const iri = generateIRI(NodeType.PREPARATION, slug)
    return this.registry.getNode(iri)
  }

  /**
   * Get a formula node by its slug
   */
  getFormula(slug: string): GraphNode | undefined {
    const iri = generateIRI(NodeType.FORMULA, slug)
    return this.registry.getNode(iri)
  }

  // ===========================================================================
  // Profile Node Queries
  // ===========================================================================

  /**
   * Get a profile node by system and slug
   */
  getProfile(system: MedicalSystemValue, slug: string): GraphNode | undefined {
    const nodeType = `${system}-profile` as NodeTypeValue
    const iri = generateIRI(nodeType, slug)
    return this.registry.getNode(iri)
  }

  /**
   * Get a TCM profile by its pinyin name
   */
  getTcmProfileByPinyin(pinyin: string): GraphNode | undefined {
    const allProfiles = this.registry.getNodesByType('tcm:Herb')
    return allProfiles.find(node => {
      const nodeData = node as { pinyin?: string }
      return nodeData.pinyin?.toLowerCase() === pinyin.toLowerCase()
    })
  }

  /**
   * Get all profiles for a given medical system
   */
  getProfilesBySystem(system: MedicalSystemValue): GraphNode[] {
    const typeMap: Record<string, string> = {
      tcm: 'tcm:Herb',
      ayurveda: 'ayurveda:Dravya',
      western: 'western:Herb',
      unani: 'unani:Drug',
      mongolian: 'mongolian:Drug',
      modern: 'modern:Substance',
    }
    const type = typeMap[system]
    return type ? this.registry.getNodesByType(type) : []
  }

  /**
   * Find all profiles that reference a species
   */
  findProfilesForSpecies(speciesSlug: string): GraphNode[] {
    const speciesIRI = generateIRI(NodeType.SPECIES, speciesSlug)
    const profiles: GraphNode[] = []

    // Check all profile types
    const profileTypes = [
      'tcm:Herb',
      'ayurveda:Dravya',
      'western:Herb',
      'unani:Drug',
      'mongolian:Drug',
      'modern:Substance',
    ]

    for (const type of profileTypes) {
      const nodes = this.registry.getNodesByType(type)
      for (const profile of nodes) {
        const profileData = profile as { derivedFrom?: { '@id': string } }
        if (profileData.derivedFrom?.['@id'] === speciesIRI) {
          profiles.push(profile)
        }
      }
    }

    return profiles
  }

  /**
   * Find all preparations that reference a species
   */
  findPreparationsForSpecies(speciesSlug: string): GraphNode[] {
    const speciesIRI = generateIRI(NodeType.SPECIES, speciesSlug)
    const preparations: GraphNode[] = []

    const nodes = this.registry.getNodesByType('herbapedia:HerbalPreparation')
    for (const prep of nodes) {
      const prepData = prep as { derivedFrom?: { '@id': string } }
      if (prepData.derivedFrom?.['@id'] === speciesIRI) {
        preparations.push(prep)
      }
    }

    return preparations
  }

  /**
   * Find all formulas containing a species or preparation
   */
  findFormulasContaining(nodeSlug: string, nodeType: NodeTypeValue): GraphNode[] {
    const nodeIRI = generateIRI(nodeType, nodeSlug)
    const formulas: GraphNode[] = []

    const nodes = this.registry.getNodesByType('herbapedia:Formula')
    for (const formula of nodes) {
      const formulaData = formula as { hasIngredient?: Array<{ '@id': string }> }
      if (formulaData.hasIngredient?.some(ref => ref['@id'] === nodeIRI)) {
        formulas.push(formula)
      }
    }

    return formulas
  }

  // ===========================================================================
  // Vocabulary Node Queries
  // ===========================================================================

  /**
   * Get a vocabulary term by system, type, and value
   */
  getVocabulary(
    system: 'tcm' | 'ayurveda',
    type: string,
    value: string
  ): GraphNode | undefined {
    const nodeType = `${system}-${type}` as NodeTypeValue
    const iri = generateIRI(nodeType, value)
    return this.registry.getNode(iri)
  }

  /**
   * Get TCM flavor by value
   */
  getTcmFlavor(value: string): GraphNode | undefined {
    return this.getVocabulary('tcm', 'flavor', value)
  }

  /**
   * Get TCM nature by value
   */
  getTcmNature(value: string): GraphNode | undefined {
    return this.getVocabulary('tcm', 'nature', value)
  }

  /**
   * Get TCM meridian by value
   */
  getTcmMeridian(value: string): GraphNode | undefined {
    return this.getVocabulary('tcm', 'meridian', value)
  }

  /**
   * Get TCM category by value
   */
  getTcmCategory(value: string): GraphNode | undefined {
    return this.getVocabulary('tcm', 'category', value)
  }

  /**
   * Get all vocabulary terms for a system and type
   */
  getVocabularyByType(system: 'tcm' | 'ayurveda', type: string): GraphNode[] {
    const typeMap: Record<string, string> = {
      'tcm-flavor': 'tcm:Flavor',
      'tcm-nature': 'tcm:Nature',
      'tcm-meridian': 'tcm:Meridian',
      'tcm-category': 'tcm:Category',
      'ayurveda-dosha': 'ayurveda:Dosha',
      'ayurveda-rasa': 'ayurveda:Rasa',
      'ayurveda-guna': 'ayurveda:Guna',
      'ayurveda-virya': 'ayurveda:Virya',
      'ayurveda-vipaka': 'ayurveda:Vipaka',
    }
    const key = `${system}-${type}`
    const rdfType = typeMap[key]
    return rdfType ? this.registry.getNodesByType(rdfType) : []
  }

  // ===========================================================================
  // Generic Node Queries
  // ===========================================================================

  /**
   * Get any node by its full IRI
   */
  getByIRI(iri: string): GraphNode | undefined {
    return this.registry.getNode(iri)
  }

  /**
   * Get any node by its slug, searching all registries
   */
  getBySlug(slug: string): GraphNode | undefined {
    return this.registry.getBySlug(slug)
  }

  /**
   * Check if a node exists
   */
  exists(iri: string): boolean {
    return this.registry.hasNode(iri)
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return this.registry.getAllNodes()
  }
}

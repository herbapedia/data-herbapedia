/**
 * GraphQuery - Query API for the knowledge graph
 *
 * Provides methods to retrieve nodes by various criteria:
 * - By slug (human-readable identifier)
 * - By IRI (full Internationalized Resource Identifier)
 * - By system and type (for profiles and vocabulary)
 * - Related nodes (profiles for a species, etc.)
 *
 * @example
 * ```typescript
 * const query = new GraphQuery(registry)
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
import { GraphRegistry } from '../registry/GraphRegistry.js'

/**
 * Query API for retrieving nodes from the knowledge graph
 */
export class GraphQuery {
  private registry: GraphRegistry

  constructor(registry: GraphRegistry) {
    this.registry = registry
  }

  // ===========================================================================
  // Botanical Node Queries
  // ===========================================================================

  /**
   * Get a species node by its slug
   */
  getSpecies(slug: string): GraphNode | undefined {
    return this.registry.species.getBySlug(slug) as unknown as GraphNode | undefined
  }

  /**
   * Get a species node by its scientific name
   */
  getSpeciesByScientificName(scientificName: string): GraphNode | undefined {
    const allSpecies = this.registry.species.getAllAsGraphNodes()
    return allSpecies.find(node => {
      const nodeData = node as { scientificName?: string }
      return nodeData.scientificName?.toLowerCase() === scientificName.toLowerCase()
    })
  }

  /**
   * Get a part node by its slug
   */
  getPart(slug: string): GraphNode | undefined {
    return this.registry.parts.getBySlug(slug) as unknown as GraphNode | undefined
  }

  /**
   * Get a chemical node by its slug
   */
  getChemical(slug: string): GraphNode | undefined {
    return this.registry.chemicals.getBySlug(slug) as unknown as GraphNode | undefined
  }

  /**
   * Get a chemical by CAS number
   */
  getChemicalByCasNumber(casNumber: string): GraphNode | undefined {
    const allChemicals = this.registry.chemicals.getAllAsGraphNodes()
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
    return this.registry.preparations.getBySlug(slug) as unknown as GraphNode | undefined
  }

  /**
   * Get a formula node by its slug
   */
  getFormula(slug: string): GraphNode | undefined {
    return this.registry.formulas.getBySlug(slug) as unknown as GraphNode | undefined
  }

  // ===========================================================================
  // Profile Node Queries
  // ===========================================================================

  /**
   * Get a profile node by system and slug
   */
  getProfile(system: MedicalSystemValue, slug: string): GraphNode | undefined {
    const registry = this.getProfileRegistry(system)
    if (!registry) return undefined
    return registry.getBySlug(slug) as unknown as GraphNode | undefined
  }

  /**
   * Get a TCM profile by its pinyin name
   */
  getTcmProfileByPinyin(pinyin: string): GraphNode | undefined {
    const allProfiles = this.registry.profiles.tcm.getAllAsGraphNodes()
    return allProfiles.find(node => {
      const nodeData = node as { pinyin?: string }
      return nodeData.pinyin?.toLowerCase() === pinyin.toLowerCase()
    })
  }

  /**
   * Get all profiles for a given medical system
   */
  getProfilesBySystem(system: MedicalSystemValue): GraphNode[] {
    const registry = this.getProfileRegistry(system)
    if (!registry) return []
    return registry.getAllAsGraphNodes()
  }

  /**
   * Find all profiles that reference a species
   */
  findProfilesForSpecies(speciesSlug: string): GraphNode[] {
    const speciesIRI = generateIRI(NodeType.SPECIES, speciesSlug)
    const profiles: GraphNode[] = []

    // Check all profile systems
    for (const system of ['tcm', 'ayurveda', 'western', 'unani', 'mongolian', 'modern'] as const) {
      const registry = this.registry.profiles[system]
      const nodes = registry.getAllAsGraphNodes()

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

    const nodes = this.registry.preparations.getAllAsGraphNodes()
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

    const nodes = this.registry.formulas.getAllAsGraphNodes()
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
    const registry = this.getVocabularyRegistry(system, type)
    if (!registry) return undefined

    // Try to find by value
    const nodes = registry.getAllAsGraphNodes()
    return nodes.find(node => {
      const nodeData = node as { value?: string }
      return nodeData.value === value
    })
  }

  /**
   * Get all vocabulary terms for a system and type
   */
  getVocabularyByType(system: 'tcm' | 'ayurveda', type: string): GraphNode[] {
    const registry = this.getVocabularyRegistry(system, type)
    if (!registry) return []
    return registry.getAllAsGraphNodes()
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
    // Search in order of likelihood
    return (
      this.getSpecies(slug) ||
      this.getPart(slug) ||
      this.getChemical(slug) ||
      this.getPreparation(slug) ||
      this.getFormula(slug) ||
      this.registry.profiles.tcm.getBySlug(slug) as unknown as GraphNode ||
      this.registry.profiles.ayurveda.getBySlug(slug) as unknown as GraphNode ||
      this.registry.profiles.western.getBySlug(slug) as unknown as GraphNode ||
      this.registry.sources.getBySlug(slug) as unknown as GraphNode ||
      this.registry.images.getBySlug(slug) as unknown as GraphNode ||
      undefined
    )
  }

  /**
   * Check if a node exists
   */
  exists(iri: string): boolean {
    return this.registry.hasNode(iri)
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get the profile registry for a medical system
   */
  private getProfileRegistry(system: MedicalSystemValue) {
    switch (system) {
      case 'tcm':
        return this.registry.profiles.tcm
      case 'ayurveda':
        return this.registry.profiles.ayurveda
      case 'western':
        return this.registry.profiles.western
      case 'unani':
        return this.registry.profiles.unani
      case 'mongolian':
        return this.registry.profiles.mongolian
      case 'modern':
        return this.registry.profiles.modern
      default:
        return undefined
    }
  }

  /**
   * Get the vocabulary registry for a system and type
   */
  private getVocabularyRegistry(system: 'tcm' | 'ayurveda', type: string) {
    if (system === 'tcm') {
      switch (type) {
        case 'flavor':
          return this.registry.vocabulary.tcm.flavors
        case 'nature':
          return this.registry.vocabulary.tcm.natures
        case 'meridian':
          return this.registry.vocabulary.tcm.meridians
        case 'category':
          return this.registry.vocabulary.tcm.categories
        default:
          return undefined
      }
    } else if (system === 'ayurveda') {
      switch (type) {
        case 'dosha':
          return this.registry.vocabulary.ayurveda.doshas
        case 'rasa':
          return this.registry.vocabulary.ayurveda.rasas
        case 'guna':
          return this.registry.vocabulary.ayurveda.gunas
        case 'virya':
          return this.registry.vocabulary.ayurveda.viryas
        case 'vipaka':
          return this.registry.vocabulary.ayurveda.vipakas
        default:
          return undefined
      }
    }
    return undefined
  }
}

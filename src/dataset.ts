/**
 * Herbapedia Dataset - Main Query API
 *
 * This class provides the primary interface for querying the Herbapedia dataset.
 * It supports loading entities by IRI/slug, traversing relationships, and
 * cross-referencing across different medicine systems.
 *
 * @example
 * ```typescript
 * import { HerbapediaDataset } from '@herbapedia/data'
 *
 * const dataset = new HerbapediaDataset('./data')
 *
 * // Load a plant species
 * const ginger = dataset.getPlantSpecies('ginger')
 * console.log(ginger?.scientificName) // "Zingiber officinale"
 *
 * // Get preparations derived from a plant
 * const preparations = dataset.getPreparationsForPlant('ginger')
 *
 * // Get all system profiles for a preparation
 * const profiles = dataset.getAllProfilesForPreparation('dried-ginger-rhizome')
 * console.log(profiles.tcm?.pinyin) // "Gān Jiāng"
 * ```
 *
 * ARCHITECTURE:
 * The API is built around the HerbalPreparation as the central entity:
 * - PlantSpecies/PlantPart → HerbalPreparation → System Profiles
 * - A single preparation can have multiple profiles (TCM, Western, Ayurveda, Persian, Mongolian)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import type {
  Entity,
  IRIReference,
  LanguageMap,
  ExternalReference,
} from '../types/core'

import {
  isFullIRI,
  toRelativeIRI,
  HERBAPEDIA_BASE_IRI,
  ENTITY_PREFIX,
} from '../types/core'

import type {
  PlantSpecies,
  PlantPart,
  ChemicalCompound,
  ChemicalProfile,
  DNABarcode,
} from '../types/botanical'

import type {
  HerbalPreparation,
  SystemProfiles,
} from '../types/preparation'

import type {
  TCMProfile,
  WesternHerbalProfile,
  AyurvedaProfile,
  PersianProfile,
  MongolianProfile,
} from '../types/profiles/base'

import type {
  TCMCategory,
  TCMNature,
  TCMFlavor,
  TCMMeridian,
  WesternAction,
  WesternOrgan,
  WesternSystem,
  AyurvedaRasa,
  AyurvedaGuna,
  AyurvedaVirya,
  AyurvedaVipaka,
  AyurvedaDosha,
} from '../types/reference'

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Entity,
  IRIReference,
  LanguageMap,
  ExternalReference,
  PlantSpecies,
  PlantPart,
  ChemicalCompound,
  ChemicalProfile,
  DNABarcode,
  HerbalPreparation,
  SystemProfiles,
  TCMProfile,
  WesternHerbalProfile,
  AyurvedaProfile,
  PersianProfile,
  MongolianProfile,
}

// ============================================================================
// Extended System Profiles
// ============================================================================

export interface ExtendedSystemProfiles extends SystemProfiles {
  tcm?: TCMProfile
  western?: WesternHerbalProfile
  ayurveda?: AyurvedaProfile
  persian?: PersianProfile
  mongolian?: MongolianProfile
}

// ============================================================================
// Dataset Index Types
// ============================================================================

interface DatasetIndex {
  version: string
  generated: string
  counts: {
    plantSpecies: number
    plantParts: number
    preparations: number
    tcmProfiles: number
    westernProfiles: number
    ayurvedaProfiles: number
    persianProfiles: number
    mongolianProfiles: number
    chemicals: number
    chemicalProfiles: number
    dnaBarcodes: number
  }
  indexes: {
    plantsByScientificName: Record<string, string>
    plantsByGBIF: Record<string, string>
    plantsByWikidata: Record<string, string>
    preparationsByPlant: Record<string, string[]>
    profilesByPreparation: Record<string, {
      tcm?: string
      western?: string
      ayurveda?: string
      persian?: string
      mongolian?: string
    }>
    tcmByNature: Record<string, string[]>
    tcmByCategory: Record<string, string[]>
    tcmByMeridian: Record<string, string[]>
    tcmByFlavor: Record<string, string[]>
    westernByAction: Record<string, string[]>
    westernByOrgan: Record<string, string[]>
    westernBySystem: Record<string, string[]>
    ayurvedaByDosha: Record<string, string[]>
    ayurvedaByRasa: Record<string, string[]>
    persianByTemperament: Record<string, string[]>
    mongolianByRoot: Record<string, string[]>
    mongolianByElement: Record<string, string[]>
    chemicalsByPlant: Record<string, string[]>
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function extractSlugFromIRI(iri: string): string {
  const parts = iri.split('/')
  return parts[parts.length - 1] || ''
}

function extractNamespaceFromIRI(iri: string): string {
  // Convert full IRI to relative for internal processing
  const relativeIri = isFullIRI(iri) ? toRelativeIRI(iri) : iri
  const parts = relativeIri.split('/')
  // Remove the slug (last part)
  return parts.slice(0, -1).join('/')
}

/**
 * Normalize an IRI for internal use.
 * Converts full IRIs to relative IRIs for caching and path resolution.
 */
function normalizeIRI(iri: string): string {
  return isFullIRI(iri) ? toRelativeIRI(iri) : iri
}

// ============================================================================
// HerbapediaDataset Class
// ============================================================================

/**
 * Main class for querying the Herbapedia dataset.
 *
 * Provides methods to:
 * - Load individual entities by slug or IRI
 * - Search and filter entities
 * - Traverse relationships between entities
 * - Get cross-references across medicine systems
 */
export class HerbapediaDataset {
  private dataPath: string
  private cache: Map<string, Entity> = new Map()
  private indexCache: DatasetIndex | null = null

  /**
   * Create a new HerbapediaDataset instance.
   *
   * @param dataPath - Path to the root of the data-herbapedia repository
   */
  constructor(dataPath: string) {
    this.dataPath = dataPath
  }

  // ===========================================================================
  // Core Loading Methods
  // ===========================================================================

  /**
   * Load an entity by its IRI.
   * Supports both full IRIs (https://www.herbapedia.org/entity/botanical/species/ginseng)
   * and relative IRIs (botanical/species/ginseng).
   * @param iri - The full or relative IRI
   */
  loadByIRI<T extends Entity>(iri: string): T | null {
    // Normalize to relative IRI for caching
    const normalizedIri = normalizeIRI(iri)

    if (this.cache.has(normalizedIri)) {
      return this.cache.get(normalizedIri) as T
    }

    const path = this.iriToPath(normalizedIri)
    if (!existsSync(path)) {
      return null
    }

    try {
      const content = readFileSync(path, 'utf-8')
      const entity = JSON.parse(content) as T
      this.cache.set(normalizedIri, entity)
      return entity
    } catch (error) {
      console.error(`Error loading ${iri}:`, error)
      return null
    }
  }

  /**
   * Convert a relative IRI to a file system path.
   * @param relativeIri - The relative IRI (e.g., "botanical/species/ginseng")
   */
  private iriToPath(relativeIri: string): string {
    const namespace = extractNamespaceFromIRI(relativeIri)
    const slug = extractSlugFromIRI(relativeIri)

    // Map IRI namespace to directory structure
    const namespaceMap: Record<string, string> = {
      'botanical/species': 'entities/botanical/species',
      'botanical/part': 'entities/botanical/parts',
      'botanical/chemical': 'entities/botanical/chemicals',
      'botanical/chemical-profile': 'entities/botanical/profiles',
      'botanical/profile': 'entities/botanical/profiles',
      'botanical/barcode': 'entities/botanical/barcodes',
      'preparation': 'entities/preparations',
      'formula': 'entities/formulas',
      'profile/tcm': 'profiles/tcm',
      'tcm/profile': 'profiles/tcm',
      'profile/western': 'profiles/western',
      'western/profile': 'profiles/western',
      'profile/ayurveda': 'profiles/ayurveda',
      'ayurveda/profile': 'profiles/ayurveda',
      'profile/persian': 'profiles/persian',
      'persian/profile': 'profiles/persian',
      'profile/mongolian': 'profiles/mongolian',
      'mongolian/profile': 'profiles/mongolian',
    }

    const dir = namespaceMap[namespace]
    if (!dir) {
      throw new Error(`Unknown IRI namespace: ${namespace}`)
    }

    // Determine filename based on entity type
    const filename = namespace.includes('profile') ? 'profile.jsonld' : 'entity.jsonld'
    return join(this.dataPath, dir, slug, filename)
  }

  // ===========================================================================
  // Botanical Queries
  // ===========================================================================

  /**
   * Get a plant species by slug.
   * @param slug - The species slug (e.g., "zingiber-officinale")
   */
  getPlantSpecies(slug: string): PlantSpecies | null {
    return this.loadByIRI<PlantSpecies>(`botanical/species/${slug}`)
  }

  /**
   * Get a plant part by slug.
   * @param slug - The part slug (e.g., "zingiber-officinale-rhizome")
   */
  getPlantPart(slug: string): PlantPart | null {
    return this.loadByIRI<PlantPart>(`botanical/part/${slug}`)
  }

  /**
   * Get a chemical compound by slug.
   * @param slug - The compound slug (e.g., "gingerol")
   */
  getChemicalCompound(slug: string): ChemicalCompound | null {
    return this.loadByIRI<ChemicalCompound>(`botanical/chemical/${slug}`)
  }

  /**
   * Get all plant species that contain a specific chemical compound.
   * Uses the foundIn property (bidirectional link from containsChemical).
   * @param compoundSlug - The chemical compound slug (e.g., "flavonoids")
   * @returns Array of PlantSpecies that contain this compound
   */
  getPlantsContainingCompound(compoundSlug: string): PlantSpecies[] {
    const compound = this.getChemicalCompound(compoundSlug)
    if (!compound?.foundIn) return []

    return compound.foundIn
      .map(ref => {
        const iri = ref['@id']
        // foundIn references PlantSpecies entities
        if (iri.startsWith('botanical/species/')) {
          return this.getPlantSpecies(extractSlugFromIRI(iri))
        }
        return null
      })
      .filter((p): p is PlantSpecies => p !== null)
  }

  /**
   * Get all chemical compounds contained in a specific plant species.
   * @param plantSlug - The plant species slug
   * @returns Array of ChemicalCompound entities
   */
  getCompoundsInPlant(plantSlug: string): ChemicalCompound[] {
    const plant = this.getPlantSpecies(plantSlug)
    if (!plant?.containsChemical) return []

    return plant.containsChemical
      .map(ref => this.getChemicalCompound(extractSlugFromIRI(ref['@id'])))
      .filter((c): c is ChemicalCompound => c !== null)
  }

  /**
   * Find plants that share common chemical compounds with another plant.
   * @param plantSlug - The reference plant species slug
   * @returns Map of compound slug to array of plants sharing that compound
   */
  getPlantsWithSharedCompounds(plantSlug: string): Map<string, PlantSpecies[]> {
    const compounds = this.getCompoundsInPlant(plantSlug)
    const result = new Map<string, PlantSpecies[]>()

    for (const compound of compounds) {
      const compoundSlug = extractSlugFromIRI(compound['@id'])
      const plants = this.getPlantsContainingCompound(compoundSlug)
        .filter(p => extractSlugFromIRI(p['@id']) !== plantSlug) // Exclude the reference plant

      if (plants.length > 0) {
        result.set(compoundSlug, plants)
      }
    }

    return result
  }

  /**
   * Find a plant by its scientific name.
   * @param name - The scientific name (e.g., "Zingiber officinale")
   */
  findByScientificName(name: string): PlantSpecies | null {
    const index = this.getIndex()
    const slug = index.indexes.plantsByScientificName[name.toLowerCase()]
    if (!slug) return null
    return this.getPlantSpecies(slug)
  }

  /**
   * Get all parts of a plant species.
   * @param plantSlug - The plant species slug
   */
  getPartsOfPlant(plantSlug: string): PlantPart[] {
    const plant = this.getPlantSpecies(plantSlug)
    if (!plant?.hasParts) return []

    return plant.hasParts
      .map(ref => this.getPlantPart(extractSlugFromIRI(ref['@id'])))
      .filter((p): p is PlantPart => p !== null)
  }

  // ===========================================================================
  // Herbal Preparation Queries
  // ===========================================================================

  /**
   * Get an herbal preparation by slug.
   * @param slug - The preparation slug (e.g., "fresh-ginger-rhizome")
   */
  getPreparation(slug: string): HerbalPreparation | null {
    return this.loadByIRI<HerbalPreparation>(`preparation/${slug}`)
  }

  /**
   * Get all preparations derived from a specific plant species.
   * @param plantSlug - The plant species slug
   */
  getPreparationsForPlant(plantSlug: string): HerbalPreparation[] {
    const index = this.getIndex()
    const slugs = index.indexes.preparationsByPlant[plantSlug] || []
    return slugs
      .map(slug => this.getPreparation(slug))
      .filter((p): p is HerbalPreparation => p !== null)
  }

  /**
   * Get all preparations derived from a specific plant part.
   * @param partSlug - The plant part slug
   */
  getPreparationsForPart(partSlug: string): HerbalPreparation[] {
    const index = this.getIndex()
    const slugs = index.indexes.preparationsByPlant[partSlug] || []
    return slugs
      .map(slug => this.getPreparation(slug))
      .filter((p): p is HerbalPreparation => p !== null)
  }

  // ===========================================================================
  // Profile Queries
  // ===========================================================================

  /**
   * Get all system profiles for a preparation.
   * @param prepSlug - The preparation slug
   */
  getAllProfilesForPreparation(prepSlug: string): ExtendedSystemProfiles {
    const prep = this.getPreparation(prepSlug)
    if (!prep) return {}

    return {
      tcm: prep.hasTCMProfile?.[0]
        ? this.loadByIRI<TCMProfile>(prep.hasTCMProfile[0]['@id'])
        : undefined,
      western: prep.hasWesternProfile?.[0]
        ? this.loadByIRI<WesternHerbalProfile>(prep.hasWesternProfile[0]['@id'])
        : undefined,
      ayurveda: prep.hasAyurvedaProfile?.[0]
        ? this.loadByIRI<AyurvedaProfile>(prep.hasAyurvedaProfile[0]['@id'])
        : undefined,
      persian: prep.hasPersianProfile?.[0]
        ? this.loadByIRI<PersianProfile>(prep.hasPersianProfile[0]['@id'])
        : undefined,
      mongolian: prep.hasMongolianProfile?.[0]
        ? this.loadByIRI<MongolianProfile>(prep.hasMongolianProfile[0]['@id'])
        : undefined,
    }
  }

  // ===========================================================================
  // Individual Profile Query Methods
  // ===========================================================================

  /**
   * Get a TCM profile by slug.
   * @param slug - The TCM profile slug (e.g., "gan-jiang")
   */
  getTCMProfile(slug: string): TCMProfile | null {
    return this.loadByIRI<TCMProfile>(`tcm/profile/${slug}`)
  }

  /**
   * Get a Western herbal profile by slug.
   * @param slug - The Western profile slug (e.g., "ginger")
   */
  getWesternProfile(slug: string): WesternHerbalProfile | null {
    return this.loadByIRI<WesternHerbalProfile>(`western/profile/${slug}`)
  }

  /**
   * Get an Ayurveda profile by slug.
   * @param slug - The Ayurveda profile slug (e.g., "nagara")
   */
  getAyurvedaProfile(slug: string): AyurvedaProfile | null {
    return this.loadByIRI<AyurvedaProfile>(`ayurveda/profile/${slug}`)
  }

  /**
   * Get a Persian (TPM) profile by slug.
   * @param slug - The Persian profile slug (e.g., "zanjabil")
   */
  getPersianProfile(slug: string): PersianProfile | null {
    return this.loadByIRI<PersianProfile>(`persian/profile/${slug}`)
  }

  /**
   * Get a Mongolian profile by slug.
   * @param slug - The Mongolian profile slug (e.g., "gaa")
   */
  getMongolianProfile(slug: string): MongolianProfile | null {
    return this.loadByIRI<MongolianProfile>(`mongolian/profile/${slug}`)
  }

  // ===========================================================================
  // Cross-Reference Query Methods
  // ===========================================================================

  /**
   * Get all TCM profiles with a specific nature.
   * @param nature - The nature slug (e.g., "hot", "warm")
   */
  getTCMByNature(nature: string): TCMProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.tcmByNature[nature] || []
    return slugs
      .map(slug => this.getTCMProfile(slug))
      .filter((p): p is TCMProfile => p !== null)
  }

  /**
   * Get all TCM profiles in a specific category.
   * @param category - The category slug (e.g., "tonify-qi")
   */
  getTCMByCategory(category: string): TCMProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.tcmByCategory[category] || []
    return slugs
      .map(slug => this.getTCMProfile(slug))
      .filter((p): p is TCMProfile => p !== null)
  }

  /**
   * Get all TCM profiles that enter a specific meridian.
   * @param meridian - The meridian slug (e.g., "spleen", "lung")
   */
  getTCMByMeridian(meridian: string): TCMProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.tcmByMeridian[meridian] || []
    return slugs
      .map(slug => this.getTCMProfile(slug))
      .filter((p): p is TCMProfile => p !== null)
  }

  /**
   * Get all TCM profiles with a specific flavor.
   * @param flavor - The flavor slug (e.g., "pungent", "sweet")
   */
  getTCMByFlavor(flavor: string): TCMProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.tcmByFlavor[flavor] || []
    return slugs
      .map(slug => this.getTCMProfile(slug))
      .filter((p): p is TCMProfile => p !== null)
  }

  /**
   * Get all Western profiles with a specific action.
   * @param action - The action slug (e.g., "anti-inflammatory", "carminative")
   */
  getWesternByAction(action: string): WesternHerbalProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.westernByAction[action] || []
    return slugs
      .map(slug => this.getWesternProfile(slug))
      .filter((p): p is WesternHerbalProfile => p !== null)
  }

  /**
   * Get all Western profiles with a specific organ affinity.
   * @param organ - The organ slug (e.g., "liver", "digestive")
   */
  getWesternByOrgan(organ: string): WesternHerbalProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.westernByOrgan[organ] || []
    return slugs
      .map(slug => this.getWesternProfile(slug))
      .filter((p): p is WesternHerbalProfile => p !== null)
  }

  /**
   * Get all Ayurveda profiles affecting a specific dosha.
   * @param dosha - The dosha slug (e.g., "vata", "pitta", "kapha")
   */
  getAyurvedaByDosha(dosha: string): AyurvedaProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.ayurvedaByDosha[dosha] || []
    return slugs
      .map(slug => this.getAyurvedaProfile(slug))
      .filter((p): p is AyurvedaProfile => p !== null)
  }

  /**
   * Get all Ayurveda profiles with a specific rasa (taste).
   * @param rasa - The rasa slug (e.g., "sweet", "pungent")
   */
  getAyurvedaByRasa(rasa: string): AyurvedaProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.ayurvedaByRasa[rasa] || []
    return slugs
      .map(slug => this.getAyurvedaProfile(slug))
      .filter((p): p is AyurvedaProfile => p !== null)
  }

  /**
   * Get all Persian profiles with a specific temperament.
   * @param temperament - The temperament slug (e.g., "hot-dry", "cold-wet")
   */
  getPersianByTemperament(temperament: string): PersianProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.persianByTemperament[temperament] || []
    return slugs
      .map(slug => this.getPersianProfile(slug))
      .filter((p): p is PersianProfile => p !== null)
  }

  /**
   * Get all Mongolian profiles affecting a specific root.
   * @param root - The root slug (e.g., "heyi", "xila", "badagan")
   */
  getMongolianByRoot(root: string): MongolianProfile[] {
    const index = this.getIndex()
    const slugs = index.indexes.mongolianByRoot[root] || []
    return slugs
      .map(slug => this.getMongolianProfile(slug))
      .filter((p): p is MongolianProfile => p !== null)
  }

  /**
   * Get the source plant species for a preparation.
   * @param prepSlug - The preparation slug
   */
  getSourcePlant(prepSlug: string): PlantSpecies | null {
    const prep = this.getPreparation(prepSlug)
    if (!prep?.derivedFrom?.[0]) return null

    const sourceRef = prep.derivedFrom[0]
    const source = this.loadByIRI(sourceRef['@id'])

    if (!source) return null

    // If source is a PlantPart, get its parent PlantSpecies
    if (source['@type'].includes('botany:PlantPart')) {
      const part = source as PlantPart
      return this.loadByIRI<PlantSpecies>(part.partOf['@id'])
    }

    // If source is already a PlantSpecies, return it
    if (source['@type'].includes('botany:PlantSpecies')) {
      return source as PlantSpecies
    }

    return null
  }

  /**
   * Get the source plant part for a preparation.
   * @param prepSlug - The preparation slug
   */
  getSourcePart(prepSlug: string): PlantPart | null {
    const prep = this.getPreparation(prepSlug)
    if (!prep?.derivedFrom?.[0]) return null

    const sourceRef = prep.derivedFrom[0]
    const source = this.loadByIRI(sourceRef['@id'])

    if (!source) return null

    // If source is a PlantPart, return it
    if (source['@type'].includes('botany:PlantPart')) {
      return source as PlantPart
    }

    return null
  }

  /**
   * Get chemical profile for an entity (plant or plant part).
   * @param entityIri - The entity IRI
   */
  getChemicalProfile(entityIri: string): ChemicalProfile | null {
    return this.loadByIRI<ChemicalProfile>(`botanical/profile/${entityIri}`)
  }

  /**
   * Get DNA barcode for a plant species.
   * @param speciesSlug - The plant species slug
   */
  getDNABarcode(speciesSlug: string): DNABarcode | null {
    return this.loadByIRI<DNABarcode>(`botanical/barcode/${speciesSlug}`)
  }

  /**
   * Get plants containing a specific chemical compound.
   * @param chemSlug - The chemical compound slug
   */
  getPlantsContainingChemical(chemSlug: string): PlantSpecies[] {
    const index = this.getIndex()
    const slugs = index.indexes.chemicalsByPlant[chemSlug] || []
    return slugs
      .map(slug => this.getPlantSpecies(slug))
      .filter((p): p is PlantSpecies => p !== null)
  }

  // ===========================================================================
  // Reference Data Methods
  // ===========================================================================

  /**
   * Load reference data from a JSON-LD file.
   * @param refPath - Path relative to data root
   */
  private loadReferenceData<T>(refPath: string): T[] {
    const fullPath = join(this.dataPath, refPath)
    if (!existsSync(fullPath)) return []

    try {
      const content = readFileSync(fullPath, 'utf-8')
      const data = JSON.parse(content)
      // Handle both array and single object formats
      return Array.isArray(data) ? data : [data]
    } catch (error) {
      console.error(`Error loading reference data ${refPath}:`, error)
      return []
    }
  }

  /**
   * Get all TCM natures (四气).
   */
  getTCMNatures(): TCMNature[] {
    return this.loadReferenceData<TCMNature>('systems/tcm/reference/natures.jsonld')
  }

  /**
   * Get all TCM flavors (五味).
   */
  getTCMFlavors(): TCMFlavor[] {
    return this.loadReferenceData<TCMFlavor>('systems/tcm/reference/flavors.jsonld')
  }

  /**
   * Get all TCM meridians (十二经脉).
   */
  getTCMMeridians(): TCMMeridian[] {
    return this.loadReferenceData<TCMMeridian>('systems/tcm/reference/meridians.jsonld')
  }

  /**
   * Get all TCM categories.
   */
  getTCMCategories(): TCMCategory[] {
    return this.loadReferenceData<TCMCategory>('systems/tcm/reference/categories.jsonld')
  }

  /**
   * Get all Western herbal actions.
   */
  getWesternActions(): WesternAction[] {
    return this.loadReferenceData<WesternAction>('systems/western/reference/actions.jsonld')
  }

  /**
   * Get all Western organ affinities.
   */
  getWesternOrgans(): WesternOrgan[] {
    return this.loadReferenceData<WesternOrgan>('systems/western/reference/organs.jsonld')
  }

  /**
   * Get all Western body systems.
   */
  getWesternSystems(): WesternSystem[] {
    return this.loadReferenceData<WesternSystem>('systems/western/reference/systems.jsonld')
  }

  /**
   * Get all Ayurveda rasas (六味).
   */
  getAyurvedaRasas(): AyurvedaRasa[] {
    return this.loadReferenceData<AyurvedaRasa>('systems/ayurveda/reference/rasas.jsonld')
  }

  /**
   * Get all Ayurveda gunas (十性).
   */
  getAyurvedaGunas(): AyurvedaGuna[] {
    return this.loadReferenceData<AyurvedaGuna>('systems/ayurveda/reference/gunas.jsonld')
  }

  /**
   * Get all Ayurveda viryas (两力).
   */
  getAyurvedaViryas(): AyurvedaVirya[] {
    return this.loadReferenceData<AyurvedaVirya>('systems/ayurveda/reference/viryas.jsonld')
  }

  /**
   * Get all Ayurveda vipakas (三消化后味).
   */
  getAyurvedaVipakas(): AyurvedaVipaka[] {
    return this.loadReferenceData<AyurvedaVipaka>('systems/ayurveda/reference/vipakas.jsonld')
  }

  /**
   * Get all Ayurveda doshas (三体质).
   */
  getAyurvedaDoshas(): AyurvedaDosha[] {
    return this.loadReferenceData<AyurvedaDosha>('systems/ayurveda/reference/doshas.jsonld')
  }

  /**
   * Get all Persian temperaments (四气质).
   */
  getPersianTemperaments(): PersianProfile[] {
    return this.loadReferenceData<PersianProfile>('systems/persian/reference/temperaments.jsonld')
  }

  /**
   * Get all Mongolian three roots.
   */
  getMongolianRoots(): MongolianProfile[] {
    return this.loadReferenceData<MongolianProfile>('systems/mongolian/reference/roots.jsonld')
  }

  // ===========================================================================
  // Navigation Query Methods
  // ===========================================================================

  /**
   * Get herbs commonly combined with a TCM herb.
   * Based on the combinesWith property in TCM profiles.
   * @param tcmSlug - The TCM profile slug
   */
  getCombinedHerbs(tcmSlug: string): TCMProfile[] {
    const profile = this.getTCMProfile(tcmSlug)
    if (!profile?.combinesWith) return []

    return profile.combinesWith
      .map(ref => this.getTCMProfile(extractSlugFromIRI(ref['@id'])))
      .filter((p): p is TCMProfile => p !== null)
  }

  /**
   * Get TCM herbs in the same category.
   * @param categorySlug - The category slug (e.g., "tonify-qi")
   */
  getHerbsInCategory(categorySlug: string): TCMProfile[] {
    return this.getTCMByCategory(categorySlug)
  }

  /**
   * Get preparations with similar therapeutic profiles.
   * Similarity is based on shared actions or TCM properties.
   * @param prepSlug - The preparation slug
   */
  getSimilarHerbs(prepSlug: string): HerbalPreparation[] {
    const profiles = this.getAllProfilesForPreparation(prepSlug)
    const similarSlugs = new Set<string>()

    // Find similar by TCM properties
    if (profiles.tcm) {
      const tcm = profiles.tcm

      // Get herbs with same category
      if (tcm.hasCategory) {
        const categorySlug = extractSlugFromIRI(tcm.hasCategory['@id'])
        const sameCategory = this.getTCMByCategory(categorySlug)
        for (const p of sameCategory) {
          if (p.profiles) {
            similarSlugs.add(extractSlugFromIRI(p.profiles['@id']))
          }
        }
      }

      // Get herbs with same nature
      if (tcm.hasNature) {
        const natureSlug = extractSlugFromIRI(tcm.hasNature['@id'])
        const sameNature = this.getTCMByNature(natureSlug)
        for (const p of sameNature) {
          if (p.profiles) {
            similarSlugs.add(extractSlugFromIRI(p.profiles['@id']))
          }
        }
      }
    }

    // Find similar by Western actions
    if (profiles.western?.hasAction) {
      for (const actionRef of profiles.western.hasAction) {
        const actionSlug = extractSlugFromIRI(actionRef['@id'])
        const sameAction = this.getWesternByAction(actionSlug)
        for (const p of sameAction) {
          if (p.profiles) {
            similarSlugs.add(extractSlugFromIRI(p.profiles['@id']))
          }
        }
      }
    }

    // Remove the original preparation
    similarSlugs.delete(prepSlug)

    // Convert back to preparations
    return Array.from(similarSlugs)
      .map(slug => this.getPreparation(slug))
      .filter((p): p is HerbalPreparation => p !== null)
  }

  /**
   * Get potential substitutes for a preparation.
   * Based on similar therapeutic properties within the same category.
   * @param prepSlug - The preparation slug
   */
  getSubstitutes(prepSlug: string): HerbalPreparation[] {
    const profiles = this.getAllProfilesForPreparation(prepSlug)
    const substituteSlugs = new Set<string>()

    // TCM substitutes are typically from the same category
    // with similar nature/flavor but more readily available
    if (profiles.tcm?.hasCategory) {
      const categorySlug = extractSlugFromIRI(profiles.tcm.hasCategory['@id'])
      const sameCategory = this.getTCMByCategory(categorySlug)

      for (const p of sameCategory) {
        if (!p.profiles) continue

        const pSlug = extractSlugFromIRI(p.profiles['@id'])
        if (pSlug === prepSlug) continue

        // Check if it has similar nature (substitutes usually share nature)
        if (profiles.tcm.hasNature && p.hasNature) {
          const origNature = extractSlugFromIRI(profiles.tcm.hasNature['@id'])
          const subNature = extractSlugFromIRI(p.hasNature['@id'])
          if (origNature === subNature) {
            substituteSlugs.add(pSlug)
          }
        }
      }
    }

    return Array.from(substituteSlugs)
      .map(slug => this.getPreparation(slug))
      .filter((p): p is HerbalPreparation => p !== null)
  }

  // ===========================================================================
  // Search Methods (Basic Implementation)
  // ===========================================================================

  /**
   * Search plants by name (scientific or common name).
   * This is a basic implementation; for full-text search, consider using
   * a search index like Lunr.js or a dedicated search service.
   * @param query - Search query
   */
  searchPlants(query: string): PlantSpecies[] {
    const normalizedQuery = query.toLowerCase().trim()
    const results: PlantSpecies[] = []

    // Search by scientific name via index
    const index = this.getIndex()
    for (const [name, slug] of Object.entries(index.indexes.plantsByScientificName)) {
      if (name.includes(normalizedQuery)) {
        const plant = this.getPlantSpecies(slug)
        if (plant) results.push(plant)
      }
    }

    // Note: For more comprehensive search, would need to iterate all plants
    // and search in name language maps

    return results
  }

  /**
   * Search preparations by name.
   * @param query - Search query
   */
  searchPreparations(query: string): HerbalPreparation[] {
    const normalizedQuery = query.toLowerCase().trim()
    const results: HerbalPreparation[] = []

    // Search via index - preparations by plant
    const index = this.getIndex()
    for (const [plantSlug, prepSlugs] of Object.entries(index.indexes.preparationsByPlant)) {
      if (plantSlug.includes(normalizedQuery)) {
        for (const prepSlug of prepSlugs) {
          const prep = this.getPreparation(prepSlug)
          if (prep) results.push(prep)
        }
      }
    }

    return results
  }

  // ===========================================================================
  // Index Access
  // ===========================================================================

  /**
   * Get the dataset index.
   */
  getIndex(): DatasetIndex {
    if (this.indexCache) {
      return this.indexCache
    }

    const indexPath = join(this.dataPath, 'dist', 'index.json')
    if (!existsSync(indexPath)) {
      // Return empty index if not built yet
      return {
        version: '0.0.0',
        generated: new Date().toISOString(),
        counts: {
          plantSpecies: 0,
          plantParts: 0,
          preparations: 0,
          tcmProfiles: 0,
          westernProfiles: 0,
          ayurvedaProfiles: 0,
          persianProfiles: 0,
          mongolianProfiles: 0,
          chemicals: 0,
          chemicalProfiles: 0,
          dnaBarcodes: 0,
        },
        indexes: {
          plantsByScientificName: {},
          plantsByGBIF: {},
          plantsByWikidata: {},
          preparationsByPlant: {},
          profilesByPreparation: {},
          tcmByNature: {},
          tcmByCategory: {},
          tcmByMeridian: {},
          tcmByFlavor: {},
          westernByAction: {},
          westernByOrgan: {},
          westernBySystem: {},
          ayurvedaByDosha: {},
          ayurvedaByRasa: {},
          persianByTemperament: {},
          mongolianByRoot: {},
          mongolianByElement: {},
          chemicalsByPlant: {},
        },
      }
    }

    const content = readFileSync(indexPath, 'utf-8')
    this.indexCache = JSON.parse(content)
    return this.indexCache!
  }

  /**
   * Get entity counts.
   */
  getCounts(): DatasetIndex['counts'] {
    return this.getIndex().counts
  }

  // ===========================================================================
  // Cross-System Comparison Queries
  // ===========================================================================

  /**
   * Get all preparations that have profiles in multiple medicine systems.
   * @param minSystems - Minimum number of systems (default: 2)
   * @returns Array of preparations with their system profiles
   */
  getPreparationsWithMultipleSystems(minSystems: number = 2): Array<{
    preparation: HerbalPreparation
    systems: string[]
  }> {
    const results: Array<{ preparation: HerbalPreparation; systems: string[] }> = []

    // Get all preparations
    const prepDir = join(this.dataPath, 'entities', 'preparations')
    if (!existsSync(prepDir)) return results

    const prepSlugs = readdirSync(prepDir)
      .filter(name => statSync(join(prepDir, name)).isDirectory())

    for (const slug of prepSlugs) {
      const prep = this.getPreparation(slug)
      if (!prep) continue

      const systems: string[] = []
      if (prep.hasTCMProfile?.length) systems.push('tcm')
      if (prep.hasWesternProfile?.length) systems.push('western')
      if (prep.hasAyurvedaProfile?.length) systems.push('ayurveda')
      if (prep.hasPersianProfile?.length) systems.push('persian')
      if (prep.hasMongolianProfile?.length) systems.push('mongolian')

      if (systems.length >= minSystems) {
        results.push({ preparation: prep, systems })
      }
    }

    return results
  }

  /**
   * Find plants that have therapeutic profiles in a specific medicine system.
   * @param system - The medicine system ('tcm', 'western', 'ayurveda', 'persian', 'mongolian')
   * @returns Array of plant species with profiles in that system
   */
  getPlantsBySystem(system: 'tcm' | 'western' | 'ayurveda' | 'persian' | 'mongolian'): PlantSpecies[] {
    const index = this.getIndex()
    const prepByPlant = index.indexes.preparationsByPlant
    const plants: PlantSpecies[] = []

    for (const plantSlug of Object.keys(prepByPlant)) {
      const prepSlugs = prepByPlant[plantSlug]
      for (const prepSlug of prepSlugs) {
        const prep = this.getPreparation(prepSlug)
        if (!prep) continue

        const hasSystem = {
          tcm: prep.hasTCMProfile?.length,
          western: prep.hasWesternProfile?.length,
          ayurveda: prep.hasAyurvedaProfile?.length,
          persian: prep.hasPersianProfile?.length,
          mongolian: prep.hasMongolianProfile?.length,
        }

        if (hasSystem[system]) {
          const plant = this.getPlantSpecies(plantSlug)
          if (plant && !plants.includes(plant)) {
            plants.push(plant)
          }
          break // Found a preparation with this system, move to next plant
        }
      }
    }

    return plants
  }

  /**
   * Compare how the same plant is interpreted across different medicine systems.
   * @param plantSlug - The plant species slug
   * @returns Object with profiles from each system that has one
   */
  comparePlantAcrossSystems(plantSlug: string): {
    plant: PlantSpecies | null
    preparations: Array<{
      preparation: HerbalPreparation
      tcm?: TCMProfile
      western?: WesternHerbalProfile
      ayurveda?: AyurvedaProfile
      persian?: PersianProfile
      mongolian?: MongolianProfile
    }>
  } {
    const plant = this.getPlantSpecies(plantSlug)
    const preparations = this.getPreparationsForPlant(plantSlug)

    const result = {
      plant,
      preparations: preparations.map(prep => {
        const profiles: {
          preparation: HerbalPreparation
          tcm?: TCMProfile
          western?: WesternHerbalProfile
          ayurveda?: AyurvedaProfile
          persian?: PersianProfile
          mongolian?: MongolianProfile
        } = { preparation: prep }

        if (prep.hasTCMProfile?.length) {
          profiles.tcm = this.getTCMProfile(extractSlugFromIRI(prep.hasTCMProfile[0]['@id'])) || undefined
        }
        if (prep.hasWesternProfile?.length) {
          profiles.western = this.getWesternProfile(extractSlugFromIRI(prep.hasWesternProfile[0]['@id'])) || undefined
        }
        if (prep.hasAyurvedaProfile?.length) {
          profiles.ayurveda = this.getAyurvedaProfile(extractSlugFromIRI(prep.hasAyurvedaProfile[0]['@id'])) || undefined
        }
        if (prep.hasPersianProfile?.length) {
          profiles.persian = this.getPersianProfile(extractSlugFromIRI(prep.hasPersianProfile[0]['@id'])) || undefined
        }
        if (prep.hasMongolianProfile?.length) {
          profiles.mongolian = this.getMongolianProfile(extractSlugFromIRI(prep.hasMongolianProfile[0]['@id'])) || undefined
        }

        return profiles
      })
    }

    return result
  }

  /**
   * Find plants that are used for similar purposes across different systems.
   * This compares therapeutic categories across systems.
   * @param plantSlug - Reference plant slug
   * @returns Plants with overlapping therapeutic uses
   */
  findTherapeuticallySimilarPlants(plantSlug: string): Map<string, PlantSpecies[]> {
    const result = new Map<string, PlantSpecies[]>()

    // Get TCM category of reference plant
    const comparison = this.comparePlantAcrossSystems(plantSlug)
    const tcmCategory = comparison.preparations[0]?.tcm?.hasCategory
    if (!tcmCategory) return result

    const categoryId = typeof tcmCategory === 'object' ? tcmCategory['@id'] : tcmCategory

    // Find all plants with same TCM category
    const similarPlants = this.getTCMByCategory(extractSlugFromIRI(categoryId))
      .filter(p => extractSlugFromIRI(p['@id']) !== plantSlug)

    if (similarPlants.length > 0) {
      result.set(`tcm/category/${extractSlugFromIRI(categoryId)}`, similarPlants)
    }

    return result
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear the entity cache.
   */
  clearCache(): void {
    this.cache.clear()
    this.indexCache = null
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default HerbapediaDataset

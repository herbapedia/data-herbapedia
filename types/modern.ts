/**
 * Modern Medicine Types
 *
 * Evidence-based clinical profile types for substances used in modern medicine,
 * including vitamins, minerals, amino acids, and pharmaceuticals.
 *
 * @module types/modern
 */

import type { Entity, IRIReference, LanguageMap } from './core'

// ============================================================================
// Enum-like Types
// ============================================================================

/**
 * FDA regulatory status
 */
export type FDAStatus =
  | 'GRAS'           // Generally Recognized as Safe
  | 'NDI'            // New Dietary Ingredient
  | 'Drug'           // FDA-approved drug
  | 'OTC'            // Over-the-counter drug
  | 'Rx'             // Prescription-only drug
  | 'MedicalFood'    // Medical food
  | 'Cosmetic'       // Cosmetic ingredient
  | 'NotRegulated'   // Not specifically regulated

/**
 * FDA pregnancy category (legacy system, still useful)
 */
export type PregnancyCategory =
  | 'A'  // Adequate studies: safe
  | 'B'  // Animal studies: probably safe
  | 'C'  // Risk cannot be excluded
  | 'D'  // Positive evidence of risk
  | 'X'  // Contraindicated in pregnancy
  | 'N'  // Not classified

/**
 * Lactation safety rating
 */
export type LactationSafety =
  | 'Safe'                   // Safe to use while breastfeeding
  | 'LikelySafe'             // Probably safe
  | 'Caution'                // Use with caution
  | 'Unsafe'                 // Avoid while breastfeeding
  | 'InsufficientInformation'// Not enough data

/**
 * Efficacy rating from Natural Medicines Database
 */
export type EfficacyRating =
  | 'Effective'              // Strong scientific evidence
  | 'LikelyEffective'        // Good scientific evidence
  | 'PossiblyEffective'      // Some scientific evidence
  | 'PossiblyIneffective'    // Some evidence it doesn't work
  | 'LikelyIneffective'      // Good evidence it doesn't work
  | 'Ineffective'            // Strong evidence it doesn't work
  | 'InsufficientEvidence'   // Not enough evidence to rate

/**
 * Evidence level
 */
export type EvidenceLevel =
  | 'A'  // Strong evidence from systematic reviews/RCTs
  | 'B'  // Moderate evidence from cohort/case-control studies
  | 'C'  // Limited evidence from case series/reports
  | 'D'  // Theoretical/invitro evidence only

// ============================================================================
// Complex Types
// ============================================================================

/**
 * Recommended Dietary Allowance structure
 */
export interface RecommendedDietaryAllowance {
  /** Unit of measurement (mg, mcg, IU, g) */
  unit: string
  /** Adult recommendations */
  adult?: {
    male?: string
    female?: string
    pregnant?: string
    lactating?: string
  }
  /** Children recommendations */
  children?: {
    infants0to6mo?: string
    infants7to12mo?: string
    children1to3?: string
    children4to8?: string
    children9to13?: string
    teens14to18?: string
  }
  /** Older adults (51+) */
  seniors?: {
    male?: string
    female?: string
  }
}

/**
 * Tolerable Upper Intake Level structure
 */
export interface TolerableUpperIntake {
  /** Unit of measurement */
  unit: string
  /** Adult UL */
  adult?: string
  /** Children UL by age group */
  children?: {
    infants0to6mo?: string
    infants7to12mo?: string
    children1to3?: string
    children4to8?: string
    children9to13?: string
    teens14to18?: string
  }
}

/**
 * Drug interaction information
 */
export interface DrugInteraction {
  /** Drug/substance name */
  drug: string
  /** Interaction type */
  type: 'major' | 'moderate' | 'minor'
  /** Description of interaction */
  description?: string
  /** Clinical management */
  management?: string
}

/**
 * Food interaction information
 */
export interface FoodInteraction {
  /** Food name */
  food: string
  /** Effect description */
  effect: string
  /** Timing recommendation */
  recommendation?: string
}

// ============================================================================
// Main Profile Type
// ============================================================================

/**
 * Modern Medicine Substance Profile
 *
 * Evidence-based clinical profile for substances used in modern medicine.
 * This includes vitamins, minerals, amino acids, and pharmaceutical compounds.
 */
export interface ModernMedicineProfile extends Entity {
  /** JSON-LD context */
  '@context': string
  /** Profile IRI */
  '@id': string
  /** Profile type */
  '@type': ['modern:SubstanceProfile']

  // ========================================================================
  // Source Reference
  // ========================================================================

  /** Reference to the source material entity */
  derivedFromSource: IRIReference

  // ========================================================================
  // Names
  // ========================================================================

  /** Primary name */
  name: LanguageMap
  /** International Nonproprietary Name (WHO) */
  inn?: LanguageMap

  // ========================================================================
  // Identification
  // ========================================================================

  /** CAS Registry Number */
  casNumber?: string
  /** FDA Unique Ingredient Identifier */
  unii?: string
  /** DrugBank database ID */
  drugBankId?: string
  /** PubChem Compound ID */
  pubChemId?: string

  // ========================================================================
  // Regulatory Status
  // ========================================================================

  /** FDA regulatory status */
  fdaStatus?: FDAStatus
  /** Regulatory categories */
  regulatoryCategory?: string[]
  /** European Medicines Agency status */
  emaStatus?: LanguageMap

  // ========================================================================
  // Clinical Evidence
  // ========================================================================

  /** Clinical evidence summary */
  clinicalEvidence?: LanguageMap
  /** Efficacy rating */
  efficacyRating?: EfficacyRating
  /** Evidence level */
  evidenceLevel?: EvidenceLevel

  // ========================================================================
  // Dosing & Pharmacology
  // ========================================================================

  /** Recommended Dietary Allowance */
  rda?: RecommendedDietaryAllowance
  /** Tolerable Upper Intake Level */
  ul?: TolerableUpperIntake
  /** Typical dosage range */
  dosageRange?: LanguageMap
  /** Bioavailability information */
  bioavailability?: LanguageMap
  /** Biological half-life */
  halfLife?: LanguageMap
  /** Metabolic pathway */
  metabolism?: LanguageMap

  // ========================================================================
  // Safety & Interactions
  // ========================================================================

  /** Drug interactions */
  drugInteraction?: DrugInteraction[]
  /** Food interactions */
  foodInteraction?: FoodInteraction[]
  /** Contraindications */
  contraindication?: LanguageMap
  /** Adverse effects */
  adverseEffect?: LanguageMap
  /** FDA pregnancy category */
  pregnancyCategory?: PregnancyCategory
  /** Breastfeeding safety rating */
  lactationSafety?: LactationSafety
  /** Toxicity information */
  toxicity?: LanguageMap

  // ========================================================================
  // Mechanism of Action
  // ========================================================================

  /** Molecular mechanism of action */
  mechanismOfAction?: LanguageMap
  /** Target receptors/enzymes */
  targetReceptor?: string[]
  /** Pharmacodynamic properties */
  pharmacodynamics?: LanguageMap
  /** Pharmacokinetic properties */
  pharmacokinetics?: LanguageMap

  // ========================================================================
  // Indications
  // ========================================================================

  /** FDA-approved indications */
  indication?: string[]
  /** Off-label uses with evidence */
  offLabelUse?: string[]
  /** Investigational uses */
  investigationalUse?: string[]
  /** Deficiency symptoms */
  deficiencySymptoms?: LanguageMap
  /** Excess/toxicity symptoms */
  excessSymptoms?: LanguageMap

  // ========================================================================
  // Sources & Forms
  // ========================================================================

  /** Natural dietary sources */
  dietarySources?: string[]
  /** Available supplement forms */
  supplementForms?: string[]
  /** Substances that enhance absorption */
  absorptionEnhancers?: string[]
  /** Substances that inhibit absorption */
  absorptionInhibitors?: string[]
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if entity is a Modern Medicine Profile
 */
export function isModernMedicineProfile(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('modern:SubstanceProfile') ||
    t.includes('ModernMedicineProfile') ||
    t.includes('ModernMedicine')
  )
}

/**
 * Type guard to check if entity is a Mineral Source
 */
export function isMineralSource(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('MineralSource') ||
    t.includes('herbapedia:MineralSource')
  )
}

/**
 * Type guard to check if entity is a Chemical Source (vitamins, amino acids, etc.)
 */
export function isChemicalSource(entity: { '@type': string[] }): boolean {
  return entity['@type'].some(t =>
    t.includes('ChemicalSource') ||
    t.includes('herbapedia:ChemicalSource')
  )
}

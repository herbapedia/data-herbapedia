/**
 * Formula types for Herbapedia.
 *
 * A Formula represents a proprietary blend or standardized preparation
 * that contains multiple ingredients in specific proportions.
 *
 * Unlike HerbalPreparation (which is derived from a single botanical source),
 * a Formula is a composite product with multiple source materials.
 *
 * Examples:
 * - capigen: Proprietary hair care blend
 * - epicutin-tt: Skin treatment formula
 * - factor-arl: Anti-redness complex
 * - mpc: Moisturizing complex
 * - hydration-factor-cte4: Hydration formula
 *
 * @see types/preparation.ts for HerbalPreparation
 * @see types/source-material.ts for SourceMaterial
 */

import type { Entity, IRIReference, LanguageMap, Provenance } from './core'

// ============================================================================
// Formula Interface
// ============================================================================

/**
 * A proprietary or standardized formula containing multiple ingredients.
 *
 * Formulas differ from HerbalPreparation in that they:
 * - Contain multiple ingredients (not single-source)
 * - Often have proprietary proportions
 * - May be standardized to specific compound percentages
 * - Can include both botanical and non-botanical ingredients
 */
export interface Formula extends Entity {
  '@id': `formula/${string}`
  '@type': ['herbapedia:Formula', 'schema:DietarySupplement' | 'schema:Product', ...string[]]

  // Formula identification
  formulaCode?: string           // Internal product code
  proprietaryName?: LanguageMap  // Brand/trade name

  // Ingredients (MULTIPLE, unlike HerbalPreparation's derivedFrom)
  hasIngredients: FormulaIngredient[]

  // Standardization
  standardizedTo?: {
    compound: IRIReference       // Active compound
    percentage?: number          // e.g., 95% curcuminoids
    range?: string               // e.g., "20-25%"
  }

  // Intended use (not therapeutic claims)
  intendedUse?: LanguageMap
  applicationMethod?: LanguageMap

  // Physical form
  form?: 'capsule' | 'tablet' | 'powder' | 'liquid' | 'cream' | 'serum' | 'gel'

  // Manufacturing
  manufacturer?: string
  batchStandardization?: string

  // Provenance
  provenance?: Provenance
}

// ============================================================================
// Formula Ingredient
// ============================================================================

/**
 * An ingredient in a formula with optional proportion/standardization.
 */
export interface FormulaIngredient {
  /** Reference to the source material or preparation */
  ingredient: IRIReference

  /** Proportion in the formula (if disclosed) */
  proportion?: number            // Percentage (0-100)
  proportionRange?: string      // e.g., "5-10%"

  /** Standardization of this ingredient */
  standardizedTo?: string       // e.g., "50% extraction"

  /** Role in the formula */
  role?: 'active' | 'carrier' | 'preservative' | 'stabilizer' | 'flavoring' | 'solvent'
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an entity is a Formula.
 */
export function isFormula(entity: Entity): entity is Formula {
  const types = entity['@type'] || []
  return types.includes('herbapedia:Formula')
}

// ============================================================================
// Namespace Constants
// ============================================================================

export const FORMULA_NAMESPACES = {
  FORMULA: 'formula',
} as const

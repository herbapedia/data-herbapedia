/**
 * Relationship types in the knowledge graph
 *
 * These constants define the predicates used to connect nodes in the graph.
 * Used by GraphTraversal and BrowserGraphTraversal.
 */

/**
 * Relationship types in the knowledge graph
 */
export const RelationshipType = {
  // Botanical relationships
  HAS_PART: 'hasPart',
  PART_OF: 'partOf',
  CONTAINS_CHEMICAL: 'containsChemical',
  FOUND_IN: 'foundIn',

  // Profile relationships
  DERIVED_FROM: 'derivedFrom',
  HAS_CATEGORY: 'hasCategory',
  HAS_NATURE: 'hasNature',
  HAS_FLAVOR: 'hasFlavor',
  ENTERS_MERIDIAN: 'entersMeridian',
  HAS_DOSHA: 'hasDosha',
  HAS_RASA: 'hasRasa',
  HAS_GUNA: 'hasGuna',
  HAS_VIRYA: 'hasVirya',
  HAS_VIPAKA: 'hasVipaka',
  HAS_ACTION: 'hasAction',
  HAS_ORGAN_AFFINITY: 'hasOrganAffinity',

  // Preparation relationships
  HAS_INGREDIENT: 'hasIngredient',
  INGREDIENT_IN: 'ingredientIn',

  // Vocabulary relationships
  BROADER: 'broader',
  NARROWER: 'narrower',
  RELATED: 'related',

  // General relationships
  SAME_AS: 'sameAs',
  HAS_SOURCE: 'hasSource',
  HAS_IMAGE: 'hasImage',
  DEPICTS: 'depicts',
} as const

export type RelationshipTypeValue = typeof RelationshipType[keyof typeof RelationshipType]

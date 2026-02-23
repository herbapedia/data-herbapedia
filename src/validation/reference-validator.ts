/**
 * Reference Integrity Validator for Herbapedia Dataset
 *
 * Verifies that all IRI references resolve to existing entities.
 * Checks bidirectional relationships and reports orphaned entities.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'

// ============================================================================
// Types
// ============================================================================

export interface ReferenceCheck {
  source: string
  property: string
  target: string
  valid: boolean
  error?: string
}

export interface OrphanCheck {
  iri: string
  type: string
  file: string
  inboundRefs: number
}

export interface ReferenceValidationResult {
  valid: boolean
  totalReferences: number
  validReferences: number
  brokenReferences: ReferenceCheck[]
  orphans: OrphanCheck[]
  bidirectionalIssues: string[]
}

// ============================================================================
// Reference Validator Class
// ============================================================================

export class ReferenceValidator {
  private dataPath: string
  private iriRegistry: Map<string, { file: string; type: string }> = new Map()
  private referenceGraph: Map<string, Set<string>> = new Map() // target -> sources
  private outgoingRefs: Map<string, Set<{ property: string; target: string }>> = new Map()

  constructor(dataPath: string) {
    this.dataPath = dataPath
  }

  /**
   * Build the IRI registry by scanning all entity files.
   */
  async buildRegistry(): Promise<void> {
    console.log('Building IRI registry...')

    // Entity directories to scan
    const entityDirs = [
      { path: 'entities/botanical/species', type: 'PlantSpecies' },
      { path: 'entities/botanical/parts', type: 'PlantPart' },
      { path: 'entities/botanical/chemicals', type: 'ChemicalCompound' },
      { path: 'entities/botanical/profiles', type: 'ChemicalProfile' },
      { path: 'entities/botanical/barcodes', type: 'DNABarcode' },
      { path: 'entities/preparations', type: 'HerbalPreparation' },
      { path: 'profiles/tcm', type: 'TCMProfile' },
      { path: 'profiles/western', type: 'WesternHerbalProfile' },
      { path: 'profiles/ayurveda', type: 'AyurvedaProfile' },
      { path: 'profiles/persian', type: 'PersianProfile' },
      { path: 'profiles/mongolian', type: 'MongolianProfile' },
    ]

    for (const { path: dir, type } of entityDirs) {
      const fullDir = join(this.dataPath, dir)
      if (!existsSync(fullDir)) continue

      const entities = readdirSync(fullDir)
      for (const entity of entities) {
        const entityPath = join(fullDir, entity)
        if (!statSync(entityPath).isDirectory()) continue

        const files = ['entity.jsonld', 'profile.jsonld']
        for (const file of files) {
          const filePath = join(entityPath, file)
          if (!existsSync(filePath)) continue

          try {
            const content = readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)

            if (data['@id']) {
              this.iriRegistry.set(data['@id'], {
                file: `${dir}/${entity}/${file}`,
                type: type,
              })
            }
          } catch (error) {
            console.error(`Error parsing ${filePath}:`, error)
          }
        }
      }
    }

    // Also scan reference data
    const refDirs = [
      'systems/tcm/reference',
      'systems/western/reference',
      'systems/ayurveda/reference',
      'systems/persian/reference',
      'systems/mongolian/reference',
    ]

    for (const dir of refDirs) {
      const fullDir = join(this.dataPath, dir)
      if (!existsSync(fullDir)) continue

      const files = readdirSync(fullDir).filter(f => f.endsWith('.jsonld'))
      for (const file of files) {
        const filePath = join(fullDir, file)
        try {
          const content = readFileSync(filePath, 'utf-8')
          const data = JSON.parse(content)

          // Handle arrays of reference items
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item['@id']) {
                this.iriRegistry.set(item['@id'], {
                  file: `${dir}/${file}`,
                  type: item['@type']?.[0] || 'ReferenceEntity',
                })
              }
            }
          } else if (data['@id']) {
            this.iriRegistry.set(data['@id'], {
              file: `${dir}/${file}`,
              type: data['@type']?.[0] || 'ReferenceEntity',
            })
          }
        } catch (error) {
          console.error(`Error parsing ${filePath}:`, error)
        }
      }
    }

    console.log(`Registered ${this.iriRegistry.size} IRIs`)
  }

  /**
   * Extract all IRI references from an entity.
   */
  private extractReferences(data: Record<string, unknown>, prefix: string = ''): Array<{ property: string; iri: string }> {
    const refs: Array<{ property: string; iri: string }> = []

    for (const [key, value] of Object.entries(data)) {
      const propPath = prefix ? `${prefix}.${key}` : key

      if (key === '@id' || key === '@context' || key === '@type') continue

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i]
            if (typeof item === 'object' && item !== null) {
              if (item['@id']) {
                refs.push({ property: `${propPath}[${i}]`, iri: item['@id'] as string })
              } else {
                refs.push(...this.extractReferences(item as Record<string, unknown>, `${propPath}[${i}]`))
              }
            }
          }
        } else {
          if ((value as Record<string, unknown>)['@id']) {
            refs.push({ property: propPath, iri: (value as Record<string, unknown>)['@id'] as string })
          } else {
            refs.push(...this.extractReferences(value as Record<string, unknown>, propPath))
          }
        }
      }
    }

    return refs
  }

  /**
   * Check if an IRI is internal (should be registered) or external.
   */
  private isInternalIRI(iri: string): boolean {
    // External IRIs start with http/https and are not our namespace
    if (iri.startsWith('http://') || iri.startsWith('https://')) {
      return false
    }
    // Our internal IRIs are simple paths like "botanical/species/ginger"
    return true
  }

  /**
   * Validate all references in the dataset.
   */
  async validate(verbose: boolean = false): Promise<ReferenceValidationResult> {
    if (this.iriRegistry.size === 0) {
      await this.buildRegistry()
    }

    const brokenRefs: ReferenceCheck[] = []
    const bidirectionalIssues: string[] = []
    let totalRefs = 0
    let validRefs = 0

    // Check all registered entities for reference integrity
    for (const [sourceIRI, { file }] of this.iriRegistry.entries()) {
      const filePath = join(this.dataPath, file)
      if (!existsSync(filePath)) continue

      try {
        const content = readFileSync(filePath, 'utf-8')
        const data = JSON.parse(content)
        const refs = this.extractReferences(data)

        for (const { property, iri } of refs) {
          totalRefs++

          // Skip external IRIs
          if (!this.isInternalIRI(iri)) {
            validRefs++
            continue
          }

          // Track the reference in the graph
          if (!this.referenceGraph.has(iri)) {
            this.referenceGraph.set(iri, new Set())
          }
          this.referenceGraph.get(iri)!.add(sourceIRI)

          // Track outgoing references
          if (!this.outgoingRefs.has(sourceIRI)) {
            this.outgoingRefs.set(sourceIRI, new Set())
          }
          this.outgoingRefs.get(sourceIRI)!.add({ property, target: iri })

          // Check if the target exists
          if (this.iriRegistry.has(iri)) {
            validRefs++
            if (verbose) {
              console.log(`✓ ${sourceIRI} -> ${property} -> ${iri}`)
            }
          } else {
            brokenRefs.push({
              source: sourceIRI,
              property,
              target: iri,
              valid: false,
              error: `Target IRI not found: ${iri}`,
            })
            if (verbose) {
              console.error(`✗ ${sourceIRI} -> ${property} -> ${iri} (not found)`)
            }
          }
        }
      } catch (error) {
        console.error(`Error checking references in ${file}:`, error)
      }
    }

    // Find orphaned entities (no incoming references)
    const orphans: OrphanCheck[] = []
    for (const [iri, { file, type }] of this.iriRegistry.entries()) {
      const inboundRefs = this.referenceGraph.get(iri)?.size || 0

      // Skip reference entities - they don't need to be referenced
      if (type === 'ReferenceEntity' ||
          iri.includes('/reference/') ||
          iri.startsWith('tcm/nature/') ||
          iri.startsWith('tcm/flavor/') ||
          iri.startsWith('tcm/meridian/') ||
          iri.startsWith('tcm/category/') ||
          iri.startsWith('western/action/') ||
          iri.startsWith('western/organ/') ||
          iri.startsWith('western/system/') ||
          iri.startsWith('ayurveda/rasa/') ||
          iri.startsWith('ayurveda/dosha/') ||
          iri.startsWith('ayurveda/guna/') ||
          iri.startsWith('ayurveda/virya/') ||
          iri.startsWith('ayurveda/vipaka/') ||
          iri.startsWith('persian/temperament/') ||
          iri.startsWith('persian/element/') ||
          iri.startsWith('persian/degree/') ||
          iri.startsWith('mongolian/root/') ||
          iri.startsWith('mongolian/element/') ||
          iri.startsWith('mongolian/taste/') ||
          iri.startsWith('mongolian/potency/')) {
        continue
      }

      if (inboundRefs === 0) {
        orphans.push({
          iri,
          type,
          file,
          inboundRefs,
        })
      }
    }

    // Check bidirectional relationships
    // HerbalPreparation -> profiles should have profile -> HerbalPreparation
    for (const [sourceIRI, refs] of this.outgoingRefs.entries()) {
      if (!sourceIRI.startsWith('preparation/')) continue

      for (const { property, target } of refs) {
        if (!property.includes('Profile')) continue

        // Check if profile links back
        const profileRefs = this.outgoingRefs.get(target)
        if (!profileRefs) {
          bidirectionalIssues.push(`${sourceIRI} -> ${target}: profile has no outgoing refs`)
          continue
        }

        const hasBackRef = Array.from(profileRefs).some(
          ref => ref.target === sourceIRI && ref.property === 'profiles'
        )
        if (!hasBackRef) {
          bidirectionalIssues.push(`${sourceIRI} -> ${target}: missing back-reference`)
        }
      }
    }

    return {
      valid: brokenRefs.length === 0,
      totalReferences: totalRefs,
      validReferences: validRefs,
      brokenReferences: brokenRefs,
      orphans,
      bidirectionalIssues,
    }
  }
}

export default ReferenceValidator

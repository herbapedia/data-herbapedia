#!/usr/bin/env node

/**
 * Fix IRI patterns in legacy files to match new structure.
 *
 * Fixes:
 * - nature/X → tcm/nature/X
 * - flavor/X → tcm/flavor/X
 * - meridian/X → tcm/meridian/X
 * - category/X → tcm/category/X
 * - plant/X → botanical/species/X
 * - chemical/X → botanical/chemical/X
 * - preparation/X → herbal/preparation/X
 * - western/action/X → western/reference/action/X
 * - western/organ/X → western/reference/organ/X
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()

const REPLACEMENTS = [
  // TCM reference patterns
  [/"nature\/([a-z-]+)"/g, '"tcm/nature/$1"'],
  [/"flavor\/([a-z-]+)"/g, '"tcm/flavor/$1"'],
  [/"meridian\/([a-z-]+)"/g, '"tcm/meridian/$1"'],
  [/"category\/([a-z-]+)"/g, '"tcm/category/$1"'],

  // Ayurveda reference patterns
  [/"rasa\/([a-z-]+)"/g, '"ayurveda/rasa/$1"'],
  [/"guna\/([a-z-]+)"/g, '"ayurveda/guna/$1"'],
  [/"virya\/([a-z-]+)"/g, '"ayurveda/virya/$1"'],
  [/"vipaka\/([a-z-]+)"/g, '"ayurveda/vipaka/$1"'],
  [/"dosha\/([a-z-]+)"/g, '"ayurveda/dosha/$1"'],

  // Western reference patterns
  [/"organ\/([a-z-]+)"/g, '"western/organ/$1"'],

  // Botanical patterns (already fixed but just in case)
  [/"chemical\/([a-z-]+)"/g, '"botanical/chemical/$1"'],
]

function findJsonLdFiles(dir, files = []) {
  if (!existsSync(dir)) return files
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      findJsonLdFiles(fullPath, files)
    } else if (entry.endsWith('.jsonld')) {
      files.push(fullPath)
    }
  }
  return files
}

function fixIriPatterns(content) {
  let result = content
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// Find all JSON-LD files
const searchDirs = [
  'entities',
  'profiles',
  'systems/tcm/herbs',
  'systems/western/herbs',
  'systems/ayurveda/dravyas',
]

let totalFixed = 0

for (const dir of searchDirs) {
  const fullPath = join(ROOT, dir)
  const files = findJsonLdFiles(fullPath)

  for (const file of files) {
    if (file.includes('/context/')) continue

    const content = readFileSync(file, 'utf-8')
    const fixed = fixIriPatterns(content)

    if (content !== fixed) {
      writeFileSync(file, fixed)
      totalFixed++
      console.log(`Fixed: ${file.replace(ROOT + '/', '')}`)
    }
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`)

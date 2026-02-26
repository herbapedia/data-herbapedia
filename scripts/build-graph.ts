#!/usr/bin/env node

/**
 * Build Knowledge Graph
 *
 * This script builds the fully normalized JSON-LD knowledge graph
 * from the source data files.
 *
 * Usage:
 *   node scripts/build-graph.ts [options]
 *
 * Options:
 *   --data-root <path>    Root directory of source data (default: current directory)
 *   --output-dir <path>   Output directory for built graph (default: ./api/v1)
 *   --format <formats>    Export formats: jsonld,turtle (default: jsonld)
 *   --validate            Validate during build (default: true)
 *   --verbose             Enable verbose logging
 *   --clean               Clean output directory before build
 *   --help                Show help
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

interface BuildOptions {
  dataRoot: string
  outputDir: string
  formats: ('jsonld' | 'turtle')[]
  validate: boolean
  verbose: boolean
  clean: boolean
  since?: string // ISO date string or 'last'
  concurrency: number
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2)

  const options: BuildOptions = {
    dataRoot: ROOT,
    outputDir: path.join(ROOT, 'api', 'v1'),
    formats: ['jsonld'],
    validate: true,
    verbose: false,
    clean: false,
    concurrency: 10,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--data-root':
        options.dataRoot = args[++i]
        break
      case '--output-dir':
        options.outputDir = args[++i]
        break
      case '--format':
        options.formats = args[++i].split(',') as ('jsonld' | 'turtle')[]
        break
      case '--validate':
        options.validate = true
        break
      case '--no-validate':
        options.validate = false
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--clean':
        options.clean = true
        break
      case '--since':
        options.since = args[++i]
        break
      case '--concurrency':
        options.concurrency = parseInt(args[++i], 10) || 10
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        console.error(`Unknown option: ${arg}`)
        printHelp()
        process.exit(1)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Build Knowledge Graph

Usage:
  node scripts/build-graph.ts [options]

Options:
  --data-root <path>    Root directory of source data (default: current directory)
  --output-dir <path>   Output directory for built graph (default: ./api/v1)
  --format <formats>    Export formats: jsonld,turtle (default: jsonld)
  --validate            Validate during build (default: true)
  --no-validate         Skip validation during build
  --verbose, -v         Enable verbose logging
  --clean               Clean output directory before build
  --since <date|last>   Incremental build: only process files modified since date
                        Use 'last' to use last build time, or ISO date string
  --concurrency <n>     Number of concurrent file operations (default: 10)
  --help, -h            Show this help

Examples:
  # Build with defaults
  node scripts/build-graph.ts

  # Build with verbose output
  node scripts/build-graph.ts --verbose

  # Build and export to both formats
  node scripts/build-graph.ts --format jsonld,turtle

  # Clean build
  node scripts/build-graph.ts --clean --verbose

  # Incremental build (only changed files since last build)
  node scripts/build-graph.ts --since last

  # Incremental build (files changed since specific date)
  node scripts/build-graph.ts --since 2026-02-01

  # Build with higher concurrency
  node scripts/build-graph.ts --concurrency 20
`)
}

function cleanOutputDir(outputDir: string): void {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true })
  }
  fs.mkdirSync(outputDir, { recursive: true })
}

// Manifest file for incremental builds
interface BuildManifest {
  lastBuildTime: string
  fileTimestamps: Record<string, number>
  version: string
}

const MANIFEST_FILE = '.build-manifest.json'

function getManifestPath(outputDir: string): string {
  return path.join(outputDir, MANIFEST_FILE)
}

function loadManifest(outputDir: string): BuildManifest | null {
  const manifestPath = getManifestPath(outputDir)
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function saveManifest(outputDir: string, manifest: BuildManifest): void {
  const manifestPath = getManifestPath(outputDir)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

function getSinceTimestamp(since: string | undefined, manifest: BuildManifest | null): number {
  if (!since) return 0

  if (since === 'last') {
    return manifest ? new Date(manifest.lastBuildTime).getTime() : 0
  }

  // Parse ISO date string
  const date = new Date(since)
  return isNaN(date.getTime()) ? 0 : date.getTime()
}

function getFileMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs
  } catch {
    return 0
  }
}

// Concurrency limiter
async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      // Remove completed promises
      const index = executing.findIndex(p => p === promise)
      if (index !== -1) executing.splice(index, 1)
    }
  }

  await Promise.all(executing)
  return results
}

async function main(): Promise<void> {
  const options = parseArgs()

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         Herbapedia Knowledge Graph Builder                 ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()

  if (options.verbose) {
    console.log('Configuration:')
    console.log(`  Data root: ${options.dataRoot}`)
    console.log(`  Output dir: ${options.outputDir}`)
    console.log(`  Formats: ${options.formats.join(', ')}`)
    console.log(`  Validate: ${options.validate}`)
    console.log(`  Concurrency: ${options.concurrency}`)
    if (options.since) {
      console.log(`  Incremental: since ${options.since}`)
    }
    console.log()
  }

  // Load manifest for incremental builds
  const manifest = loadManifest(options.outputDir)
  const sinceTimestamp = getSinceTimestamp(options.since, manifest)

  if (sinceTimestamp > 0 && options.verbose) {
    console.log(`📅 Incremental build: processing files modified since ${new Date(sinceTimestamp).toISOString()}`)
    console.log()
  }

  // Clean if requested
  if (options.clean) {
    console.log('🧹 Cleaning output directory...')
    cleanOutputDir(options.outputDir)
  }

  // Ensure output directory exists
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true })
  }

  try {
    // Import the graph module
    const { GraphBuilder, JsonLdExporter, TurtleExporter } = await import('../src/graph/index.js')
    const { BrowserExporter } = await import('../src/graph/exporters/BrowserExporter.js')

    // Build the graph
    console.log('🔨 Building knowledge graph...')
    const builder = new GraphBuilder({
      dataRoot: options.dataRoot,
      outputDir: options.outputDir,
      validate: options.validate,
      verbose: options.verbose,
      contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      concurrency: options.concurrency,
      sinceTimestamp,
    })

    const result = await builder.build()

    if (!result.success) {
      console.error('\n❌ Build failed with errors:')
      for (const error of result.errors) {
        console.error(`  [${error.type}] ${error.source}: ${error.message}`)
      }
      process.exit(1)
    }

    // Export in requested formats
    const registry = builder.getRegistry()

    if (options.formats.includes('jsonld')) {
      console.log('\n📦 Exporting to JSON-LD...')
      const exporter = new JsonLdExporter(registry, options.outputDir)
      await exporter.export({ pretty: true, includeContext: true })
    }

    if (options.formats.includes('turtle')) {
      console.log('\n📦 Exporting to Turtle...')
      const exporter = new TurtleExporter(registry, options.outputDir)
      await exporter.export({ pretty: true })
    }

    // Export browser-compatible artifacts
    console.log('\n📦 Exporting browser artifacts...')
    const browserExporter = new BrowserExporter(registry, options.outputDir)
    await browserExporter.export()

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    Build Summary                           ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()
    console.log(`  Total nodes: ${result.stats.totalNodes}`)
    console.log()
    console.log('  By type:')
    for (const [type, count] of Object.entries(result.stats.byType)) {
      if (count > 0) {
        console.log(`    ${type}: ${count}`)
      }
    }
    console.log()

    if (result.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${result.warnings.length}`)
      if (options.verbose) {
        for (const warning of result.warnings.slice(0, 10)) {
          console.log(`    [${warning.type}] ${warning.source}: ${warning.message}`)
        }
        if (result.warnings.length > 10) {
          console.log(`    ... and ${result.warnings.length - 10} more`)
        }
      }
    }

    console.log()
    console.log('✅ Build complete!')
    console.log(`   Output: ${options.outputDir}`)

    // Save manifest for future incremental builds
    const newManifest: BuildManifest = {
      lastBuildTime: new Date().toISOString(),
      fileTimestamps: {},
      version: process.env.npm_package_version || '0.0.0',
    }
    saveManifest(options.outputDir, newManifest)

    if (options.verbose) {
      console.log(`   Manifest saved: ${getManifestPath(options.outputDir)}`)
    }

  } catch (error) {
    // Enhanced error reporting with source location
    if (error instanceof Error) {
      console.error('\n❌ Build failed:')
      console.error(`   Message: ${error.message}`)

      // Try to extract file path from stack trace
      const stack = error.stack
      if (stack) {
        const fileMatch = stack.match(/\((.+):(\d+):(\d+)\)/)
        if (fileMatch) {
          console.error(`   File: ${fileMatch[1]}`)
          console.error(`   Line: ${fileMatch[2]}`)
        }
      }

      if (options.verbose) {
        console.error('\n   Stack trace:')
        console.error(stack)
      }
    } else {
      console.error('\n❌ Build failed:', error)
    }
    process.exit(1)
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

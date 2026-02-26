/**
 * BuildCommand - Build the knowledge graph from source data
 *
 * Usage:
 *   herbapedia-graph build [options]
 *
 * Options:
 *   --data-root <path>   Root directory of source data
 *   --output-dir <path>  Output directory for built graph
 *   --format <formats>   Export formats: jsonld,turtle (default: jsonld)
 *   --validate           Validate during build (default: true)
 *   --no-validate        Skip validation
 *   --clean              Clean output directory before build
 *   --verbose, -v        Enable verbose logging
 */

import fs from 'fs'
import path from 'path'
import type { CliOptions, Command, CommandOption } from '../Cli.js'
import type { Cli } from '../Cli.js'
import { GraphBuilder, JsonLdExporter, TurtleExporter } from '../../index.js'

interface BuildCommandOptions extends CliOptions {
  dataRoot: string
  outputDir: string
  format: string[]
  validate: boolean
  noValidate: boolean
  clean: boolean
}

export class BuildCommand implements Command {
  name = 'build'
  description = 'Build the knowledge graph from source data'

  options: Record<string, CommandOption> = {
    'data-root': {
      description: 'Root directory of source data',
      type: 'string',
      default: '.',
    },
    'output-dir': {
      description: 'Output directory for built graph',
      type: 'string',
      default: './api/v1',
    },
    format: {
      alias: 'f',
      description: 'Export formats: jsonld,turtle',
      type: 'string[]',
      default: ['jsonld'],
    },
    validate: {
      description: 'Validate during build',
      type: 'boolean',
      default: true,
    },
    noValidate: {
      description: 'Skip validation',
      type: 'boolean',
      default: false,
    },
    clean: {
      alias: 'c',
      description: 'Clean output directory before build',
      type: 'boolean',
      default: false,
    },
    verbose: {
      alias: 'v',
      description: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    },
  }

  async run(baseOptions: CliOptions, args: string[]): Promise<number> {
    const options = baseOptions as BuildCommandOptions
    const dataRoot = path.resolve(options.dataRoot || '.')
    const outputDir = path.resolve(options.outputDir || './api/v1')
    const validate = !options.noValidate && options.validate !== false
    const formats = options.format || ['jsonld']

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║         Herbapedia Knowledge Graph Builder                 ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()

    if (options.verbose) {
      console.log('Configuration:')
      console.log(`  Data root: ${dataRoot}`)
      console.log(`  Output dir: ${outputDir}`)
      console.log(`  Formats: ${formats.join(', ')}`)
      console.log(`  Validate: ${validate}`)
      console.log(`  Clean: ${options.clean}`)
      console.log()
    }

    // Clean if requested
    if (options.clean) {
      console.log('🧹 Cleaning output directory...')
      this.cleanOutputDir(outputDir)
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    try {
      // Build the graph
      console.log('🔨 Building knowledge graph...')
      const builder = new GraphBuilder({
        dataRoot,
        outputDir,
        validate,
        verbose: options.verbose,
        contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      })

      const result = await builder.build()

      if (!result.success) {
        console.error('\n❌ Build failed with errors:')
        for (const error of result.errors) {
          console.error(`  [${error.type}] ${error.source}: ${error.message}`)
        }
        return 1
      }

      // Export in requested formats
      const registry = builder.getRegistry()

      if (formats.includes('jsonld')) {
        console.log('\n📦 Exporting to JSON-LD...')
        const exporter = new JsonLdExporter(registry, outputDir)
        await exporter.export({ pretty: true, includeContext: true })
      }

      if (formats.includes('turtle')) {
        console.log('\n📦 Exporting to Turtle...')
        const exporter = new TurtleExporter(registry, outputDir)
        await exporter.export({ pretty: true })
      }

      // Print summary
      console.log('\n╔════════════════════════════════════════════════════════════╗')
      console.log('║                    Build Summary                           ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log()
      console.log(`  Total nodes: ${result.stats.totalNodes}`)
      console.log()
      console.log('  By type:')
      for (const [type, count] of Object.entries(result.stats.byType)) {
        if (typeof count === 'number' && count > 0) {
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
      console.log(`   Output: ${outputDir}`)

      return 0
    } catch (error) {
      console.error('\n❌ Build failed:', error)
      return 1
    }
  }

  private cleanOutputDir(outputDir: string): void {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true })
    }
    fs.mkdirSync(outputDir, { recursive: true })
  }
}

export function registerBuildCommand(cli: Cli): void {
  cli.registerCommand(new BuildCommand())
}

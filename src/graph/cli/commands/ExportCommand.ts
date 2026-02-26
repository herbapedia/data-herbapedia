/**
 * ExportCommand - Export the knowledge graph to various formats
 *
 * Usage:
 *   herbapedia-graph export [options]
 *
 * Options:
 *   --data-root <path>   Root directory of source data
 *   --output-dir <path>  Output directory (default: ./api/v1)
 *   --format <formats>   Export formats: jsonld,turtle (default: jsonld)
 *   --pretty             Pretty-print output (default: true)
 *   --verbose, -v        Enable verbose logging
 */

import path from 'path'
import type { CliOptions, Command, CommandOption, Cli } from '../Cli.js'
import { GraphBuilder, JsonLdExporter, TurtleExporter } from '../../index.js'

interface ExportCommandOptions extends CliOptions {
  dataRoot: string
  outputDir: string
  format: string[]
  pretty: boolean
}

export class ExportCommand implements Command {
  name = 'export'
  description = 'Export the knowledge graph to various formats'

  options: Record<string, CommandOption> = {
    'data-root': {
      description: 'Root directory of source data',
      type: 'string',
      default: '.',
    },
    'output-dir': {
      alias: 'o',
      description: 'Output directory',
      type: 'string',
      default: './api/v1',
    },
    format: {
      alias: 'f',
      description: 'Export formats: jsonld,turtle',
      type: 'string[]',
      default: ['jsonld'],
    },
    pretty: {
      description: 'Pretty-print output',
      type: 'boolean',
      default: true,
    },
    verbose: {
      alias: 'v',
      description: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    },
  }

  async run(baseOptions: CliOptions, args: string[]): Promise<number> {
    const options = baseOptions as ExportCommandOptions
    const dataRoot = path.resolve(options.dataRoot || '.')
    const outputDir = path.resolve(options.outputDir || './api/v1')
    const formats = options.format || ['jsonld']

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║         Knowledge Graph Export                             ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()

    if (options.verbose) {
      console.log('Configuration:')
      console.log(`  Data root: ${dataRoot}`)
      console.log(`  Output dir: ${outputDir}`)
      console.log(`  Formats: ${formats.join(', ')}`)
      console.log(`  Pretty: ${options.pretty}`)
      console.log()
    }

    try {
      // Build the graph
      console.log('🔨 Building knowledge graph...')
      const builder = new GraphBuilder({
        dataRoot,
        outputDir,
        validate: false,
        verbose: options.verbose,
        contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      })

      await builder.build()
      const registry = builder.getRegistry()

      // Export in requested formats
      if (formats.includes('jsonld')) {
        console.log('\n📦 Exporting to JSON-LD...')
        const exporter = new JsonLdExporter(registry, outputDir)
        await exporter.export({ pretty: options.pretty, includeContext: true })
      }

      if (formats.includes('turtle')) {
        console.log('\n📦 Exporting to Turtle...')
        const exporter = new TurtleExporter(registry, outputDir)
        await exporter.export({ pretty: options.pretty })
      }

      console.log()
      console.log('✅ Export complete!')
      console.log(`   Output: ${outputDir}`)

      return 0
    } catch (error) {
      console.error('\n❌ Export failed:', error)
      return 1
    }
  }
}

export function registerExportCommand(cli: Cli): void {
  cli.registerCommand(new ExportCommand())
}

/**
 * StatsCommand - Show statistics about the knowledge graph
 *
 * Usage:
 *   herbapedia-graph stats [options]
 *
 * Options:
 *   --data-root <path>   Root directory of source data
 *   --verbose, -v        Enable verbose logging
 *   --json               Output as JSON
 */

import path from 'path'
import type { CliOptions, Command, CommandOption, Cli } from '../Cli.js'
import { GraphBuilder, GraphIndex } from '../../index.js'

interface StatsCommandOptions extends CliOptions {
  dataRoot: string
  json: boolean
}

export class StatsCommand implements Command {
  name = 'stats'
  description = 'Show statistics about the knowledge graph'

  options: Record<string, CommandOption> = {
    'data-root': {
      description: 'Root directory of source data',
      type: 'string',
      default: '.',
    },
    json: {
      description: 'Output as JSON',
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
    const options = baseOptions as StatsCommandOptions
    const dataRoot = path.resolve(options.dataRoot || '.')

    try {
      // Build the graph
      if (options.verbose) {
        console.log('Building knowledge graph from:', dataRoot)
      }

      const builder = new GraphBuilder({
        dataRoot,
        outputDir: '/tmp/herbapedia-stats',
        validate: false,
        verbose: false,
        contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      })

      await builder.build()
      const registry = builder.getRegistry()
      const index = new GraphIndex(registry)
      const stats = index.getStats()

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2))
        return 0
      }

      // Print formatted statistics
      console.log('╔════════════════════════════════════════════════════════════╗')
      console.log('║              Knowledge Graph Statistics                    ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log()
      console.log(`  Total Nodes: ${stats.totalNodes}`)
      console.log()
      console.log('  Nodes by Type:')
      console.log()

      // Group by category
      const botanical = ['species', 'parts', 'chemicals']
      const preparations = ['preparations', 'formulas']
      const profiles = Object.entries(stats.byType)
        .filter(([k]) => k.startsWith('profiles:'))
        .map(([k, v]) => [k.replace('profiles:', ''), typeof v === 'number' ? v : 0]) as [string, number][]
      const vocabulary = Object.entries(stats.byType)
        .filter(([k]) => k.startsWith('vocab:'))
        .map(([k, v]) => [k, typeof v === 'number' ? v : 0]) as [string, number][]
      const other = ['sources', 'images']

      console.log('  Botanical:')
      for (const type of botanical) {
        const count = stats.byType[type] || 0
        if (count > 0) {
          console.log(`    ${type}: ${count}`)
        }
      }

      console.log()
      console.log('  Preparations:')
      for (const type of preparations) {
        const count = stats.byType[type] || 0
        if (count > 0) {
          console.log(`    ${type}: ${count}`)
        }
      }

      console.log()
      console.log('  Profiles:')
      for (const [system, count] of profiles) {
        if (count > 0) {
          console.log(`    ${system}: ${count}`)
        }
      }

      console.log()
      console.log('  Vocabulary:')
      for (const [type, count] of vocabulary) {
        if (count > 0) {
          console.log(`    ${type}: ${count}`)
        }
      }

      console.log()
      console.log('  Other:')
      for (const type of other) {
        const count = stats.byType[type] || 0
        if (count > 0) {
          console.log(`    ${type}: ${count}`)
        }
      }

      console.log()

      if (stats.validation.errors > 0) {
        console.log(`  ⚠️  Validation Errors: ${stats.validation.errors}`)
      }

      console.log()
      console.log(`  Last Updated: ${stats.lastUpdated}`)
      console.log(`  Build Version: ${stats.buildVersion}`)

      return 0
    } catch (error) {
      console.error('\n❌ Failed to get statistics:', error)
      return 1
    }
  }
}

export function registerStatsCommand(cli: Cli): void {
  cli.registerCommand(new StatsCommand())
}

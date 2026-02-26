/**
 * ValidateCommand - Validate the knowledge graph
 *
 * Usage:
 *   herbapedia-graph validate [options]
 *
 * Options:
 *   --data-root <path>   Root directory of source data
 *   --verbose, -v        Enable verbose logging
 *   --strict             Treat warnings as errors
 */

import path from 'path'
import type { CliOptions, Command, CommandOption, Cli } from '../Cli.js'
import { GraphBuilder } from '../../index.js'

interface ValidateCommandOptions extends CliOptions {
  dataRoot: string
  strict: boolean
}

export class ValidateCommand implements Command {
  name = 'validate'
  description = 'Validate the knowledge graph'

  options: Record<string, CommandOption> = {
    'data-root': {
      description: 'Root directory of source data',
      type: 'string',
      default: '.',
    },
    strict: {
      description: 'Treat warnings as errors',
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
    const options = baseOptions as ValidateCommandOptions
    const dataRoot = path.resolve(options.dataRoot || '.')

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║         Knowledge Graph Validation                         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()

    if (options.verbose) {
      console.log(`Validating: ${dataRoot}`)
      console.log()
    }

    try {
      const builder = new GraphBuilder({
        dataRoot,
        outputDir: '/tmp/herbapedia-validate', // Temporary output for validation
        validate: true,
        verbose: options.verbose,
        contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      })

      const result = await builder.build()

      // Print validation results
      console.log('\n╔════════════════════════════════════════════════════════════╗')
      console.log('║                  Validation Results                        ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log()

      if (result.errors.length > 0) {
        console.log(`❌ Errors: ${result.errors.length}`)
        for (const error of result.errors) {
          console.log(`  [${error.type}] ${error.source}: ${error.message}`)
        }
        console.log()
      }

      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.warnings.length}`)
        if (options.verbose) {
          for (const warning of result.warnings) {
            console.log(`  [${warning.type}] ${warning.source}: ${warning.message}`)
          }
        }
        console.log()
      }

      if (result.success && (options.strict ? result.warnings.length === 0 : true)) {
        console.log('✅ Validation passed!')
        console.log(`   Total nodes: ${result.stats.totalNodes}`)
        return 0
      } else {
        if (!result.success) {
          console.log('❌ Validation failed!')
        } else if (options.strict && result.warnings.length > 0) {
          console.log('❌ Validation failed (strict mode: warnings treated as errors)!')
        }
        return 1
      }
    } catch (error) {
      console.error('\n❌ Validation failed:', error)
      return 1
    }
  }
}

export function registerValidateCommand(cli: Cli): void {
  cli.registerCommand(new ValidateCommand())
}

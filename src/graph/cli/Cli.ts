/**
 * CLI - Command Line Interface for Herbapedia Knowledge Graph
 *
 * Provides commands for building, validating, querying, and exporting
 * the knowledge graph.
 *
 * Usage:
 *   herbapedia-graph <command> [options]
 *
 * Commands:
 *   build     Build the knowledge graph from source data
 *   validate  Validate the knowledge graph
 *   query     Query nodes from the knowledge graph
 *   export    Export the knowledge graph to various formats
 *   stats     Show statistics about the knowledge graph
 *
 * @example
 * ```bash
 * # Build the graph
 * herbapedia-graph build --verbose
 *
 * # Validate all nodes
 * herbapedia-graph validate
 *
 * # Query for a species
 * herbapedia-graph query species panax-ginseng
 *
 * # Export to Turtle format
 * herbapedia-graph export --format turtle
 * ```
 */

import type { GraphRegistry } from '../registry/GraphRegistry.js'

/**
 * Base options for all CLI commands
 */
export interface CliOptions {
  verbose: boolean
  dataRoot?: string
  outputDir?: string
}

/**
 * CLI command interface
 */
export interface Command {
  name: string
  description: string
  options: Record<string, CommandOption>
  run(options: CliOptions, args: string[]): Promise<number>
}

/**
 * Command option definition
 */
export interface CommandOption {
  alias?: string
  description: string
  type: 'boolean' | 'string' | 'number' | 'string[]'
  default?: unknown
  required?: boolean
}

/**
 * Main CLI class
 */
export class Cli {
  private commands: Map<string, Command> = new Map()
  private registry: GraphRegistry | null = null

  /**
   * Register a command
   */
  registerCommand(command: Command): void {
    this.commands.set(command.name, command)
  }

  /**
   * Set the graph registry (used by commands that need it)
   */
  setRegistry(registry: GraphRegistry): void {
    this.registry = registry
  }

  /**
   * Get the graph registry
   */
  getRegistry(): GraphRegistry | null {
    return this.registry
  }

  /**
   * Parse command-line arguments and execute
   */
  async run(argv: string[]): Promise<number> {
    const args = argv.slice(2)

    if (args.length === 0) {
      this.printHelp()
      return 0
    }

    const commandName = args[0]

    // Handle global flags
    if (commandName === '--help' || commandName === '-h') {
      this.printHelp()
      return 0
    }

    if (commandName === '--version' || commandName === '-V') {
      this.printVersion()
      return 0
    }

    // Find and execute command
    const command = this.commands.get(commandName)
    if (!command) {
      console.error(`Unknown command: ${commandName}`)
      console.error('Run with --help for usage information.')
      return 1
    }

    // Parse command-specific options
    const { options, remainingArgs } = this.parseOptions(args.slice(1), command)

    try {
      return await command.run(options, remainingArgs)
    } catch (error) {
      console.error(`Command failed: ${error}`)
      if (options.verbose && error instanceof Error) {
        console.error(error.stack)
      }
      return 1
    }
  }

  /**
   * Parse command-specific options
   */
  private parseOptions(
    args: string[],
    command: Command
  ): { options: CliOptions; remainingArgs: string[] } {
    const options: CliOptions & Record<string, unknown> = {
      verbose: false,
    }
    const remainingArgs: string[] = []

    // Set defaults
    for (const [name, opt] of Object.entries(command.options)) {
      if (opt.default !== undefined) {
        options[name] = opt.default
      }
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      if (arg.startsWith('--')) {
        const name = arg.slice(2)
        const opt = command.options[name]

        if (!opt) {
          console.warn(`Unknown option: ${arg}`)
          continue
        }

        if (opt.type === 'boolean') {
          options[name] = true
        } else {
          const value = args[++i]
          if (opt.type === 'number') {
            options[name] = parseInt(value, 10)
          } else if (opt.type === 'string[]') {
            const existing = options[name] as string[] | undefined
            options[name] = [...(existing || []), value]
          } else {
            options[name] = value
          }
        }
      } else if (arg.startsWith('-')) {
        const alias = arg.slice(1)
        const entry = Object.entries(command.options).find(
          ([, o]) => o.alias === alias
        )

        if (!entry) {
          console.warn(`Unknown option: ${arg}`)
          continue
        }

        const [name, opt] = entry

        if (opt.type === 'boolean') {
          options[name] = true
        } else {
          const value = args[++i]
          if (opt.type === 'number') {
            options[name] = parseInt(value, 10)
          } else if (opt.type === 'string[]') {
            const existing = options[name] as string[] | undefined
            options[name] = [...(existing || []), value]
          } else {
            options[name] = value
          }
        }
      } else {
        remainingArgs.push(arg)
      }
    }

    return { options, remainingArgs }
  }

  /**
   * Print help text
   */
  printHelp(): void {
    console.log(`
Herbapedia Knowledge Graph CLI

Usage:
  herbapedia-graph <command> [options]

Commands:
`)

    for (const command of this.commands.values()) {
      console.log(`  ${command.name.padEnd(12)} ${command.description}`)
    }

    console.log(`
Global Options:
  --help, -h     Show this help
  --version, -V  Show version

Examples:
  # Build the knowledge graph
  herbapedia-graph build --verbose

  # Query for a species
  herbapedia-graph query species panax-ginseng

  # Show statistics
  herbapedia-graph stats
`)
  }

  /**
   * Print version
   */
  printVersion(): void {
    const version = process.env.npm_package_version || '0.0.0'
    console.log(`herbapedia-graph v${version}`)
  }
}

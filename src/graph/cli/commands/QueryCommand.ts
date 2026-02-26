/**
 * QueryCommand - Query nodes from the knowledge graph
 *
 * Usage:
 *   herbapedia-graph query <type> <identifier> [options]
 *
 * Types:
 *   species <slug>           Get a species by slug
 *   profile <system> <slug>  Get a profile by system and slug
 *   iri <iri>                Get a node by full IRI
 *   search <query>           Search for nodes
 *
 * Options:
 *   --data-root <path>       Root directory of source data
 *   --format <format>        Output format: json, jsonld (default: json)
 *   --verbose, -v            Enable verbose logging
 */

import path from 'path'
import type { CliOptions, Command, CommandOption, Cli } from '../Cli.js'
import { GraphBuilder, GraphQuery, GraphIndex, type GraphNode } from '../../index.js'

interface QueryCommandOptions extends CliOptions {
  dataRoot: string
  format: string
}

export class QueryCommand implements Command {
  name = 'query'
  description = 'Query nodes from the knowledge graph'

  options: Record<string, CommandOption> = {
    'data-root': {
      description: 'Root directory of source data',
      type: 'string',
      default: '.',
    },
    format: {
      alias: 'f',
      description: 'Output format: json, jsonld',
      type: 'string',
      default: 'json',
    },
    verbose: {
      alias: 'v',
      description: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    },
  }

  async run(baseOptions: CliOptions, args: string[]): Promise<number> {
    const options = baseOptions as QueryCommandOptions
    const dataRoot = path.resolve(options.dataRoot || '.')

    if (args.length === 0) {
      this.printQueryHelp()
      return 1
    }

    const queryType = args[0]

    try {
      // Build the graph
      const builder = new GraphBuilder({
        dataRoot,
        outputDir: '/tmp/herbapedia-query',
        validate: false,
        verbose: false,
        contextUrl: 'https://www.herbapedia.org/schema/context/index.jsonld',
      })

      await builder.build()
      const registry = builder.getRegistry()
      const query = new GraphQuery(registry)
      const index = new GraphIndex(registry)

      let result: unknown = null

      switch (queryType) {
        case 'species': {
          const slug = args[1]
          if (!slug) {
            console.error('Error: species slug required')
            return 1
          }
          result = query.getSpecies(slug)
          break
        }

        case 'profile': {
          const system = args[1]
          const slug = args[2]
          if (!system || !slug) {
            console.error('Error: system and slug required')
            return 1
          }
          result = query.getProfile(
            system as 'tcm' | 'ayurveda' | 'western' | 'unani' | 'mongolian' | 'modern',
            slug
          )
          break
        }

        case 'iri': {
          const iri = args[1]
          if (!iri) {
            console.error('Error: IRI required')
            return 1
          }
          result = query.getByIRI(iri)
          break
        }

        case 'search': {
          const searchTerm = args.slice(1).join(' ')
          if (!searchTerm) {
            console.error('Error: search term required')
            return 1
          }
          index.buildSearchIndex()
          const results = index.search(searchTerm, 20)
          result = results.map(r => ({
            '@id': r.node['@id'],
            score: r.score,
            matchCount: r.matchCount,
          }))
          break
        }

        case 'list': {
          const type = args[1]
          result = this.listNodes(index, type)
          break
        }

        default:
          console.error(`Unknown query type: ${queryType}`)
          this.printQueryHelp()
          return 1
      }

      if (result === null || result === undefined) {
        console.log('No results found.')
        return 0
      }

      // Output result
      if (options.format === 'jsonld') {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(JSON.stringify(result, null, 2))
      }

      return 0
    } catch (error) {
      console.error('\n❌ Query failed:', error)
      return 1
    }
  }

  private listNodes(index: GraphIndex, type: string): unknown {
    switch (type) {
      case 'species':
        return index.listSpecies().map(n => n['@id'])
      case 'parts':
        return index.listParts().map(n => n['@id'])
      case 'chemicals':
        return index.listChemicals().map(n => n['@id'])
      case 'preparations':
        return index.listPreparations().map(n => n['@id'])
      case 'formulas':
        return index.listFormulas().map(n => n['@id'])
      case 'tcm':
        return index.listProfiles('tcm').map(n => n['@id'])
      case 'ayurveda':
        return index.listProfiles('ayurveda').map(n => n['@id'])
      case 'western':
        return index.listProfiles('western').map(n => n['@id'])
      case 'all':
        return index.listAll().map(n => n['@id'])
      default:
        console.error(`Unknown list type: ${type}`)
        console.error('Valid types: species, parts, chemicals, preparations, formulas, tcm, ayurveda, western, all')
        return null
    }
  }

  private printQueryHelp(): void {
    console.log(`
Query commands:

  species <slug>           Get a species by slug
  profile <system> <slug>  Get a profile by system and slug
  iri <iri>                Get a node by full IRI
  search <query>           Search for nodes
  list <type>              List all nodes of a type

List types:
  species, parts, chemicals, preparations, formulas, tcm, ayurveda, western, all

Examples:
  herbapedia-graph query species panax-ginseng
  herbapedia-graph query profile tcm ren-shen
  herbapedia-graph query search ginseng
  herbapedia-graph query list species
`)
  }
}

export function registerQueryCommand(cli: Cli): void {
  cli.registerCommand(new QueryCommand())
}

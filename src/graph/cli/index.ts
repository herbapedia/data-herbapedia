/**
 * CLI Module - Barrel export for CLI components
 */

export { Cli, type CliOptions, type Command, type CommandOption } from './Cli.js'
export {
  BuildCommand,
  ValidateCommand,
  QueryCommand,
  ExportCommand,
  StatsCommand,
  registerBuildCommand,
  registerValidateCommand,
  registerQueryCommand,
  registerExportCommand,
  registerStatsCommand,
} from './commands/index.js'

/**
 * Create and configure a CLI instance with all commands registered
 */
import { Cli as CliClass } from './Cli.js'
import {
  registerBuildCommand,
  registerValidateCommand,
  registerQueryCommand,
  registerExportCommand,
  registerStatsCommand,
} from './commands/index.js'

export function createCli(): CliClass {
  const cli = new CliClass()
  registerBuildCommand(cli)
  registerValidateCommand(cli)
  registerQueryCommand(cli)
  registerExportCommand(cli)
  registerStatsCommand(cli)
  return cli
}

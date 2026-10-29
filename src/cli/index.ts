#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { runAdd } from './add.js'
import { CliError } from './errors.js'
import { runInit } from './init.js'

const HELP = `Tracky registry CLI

Installs the source for Tracky's UI primitives into your project.

Usage:
  tracky init [options]              Create tracky.json and add the theme tokens
  tracky add <component...> [options] Install one or more components

Init options:
  --ui <dir>          Component directory (default: <alias root>/components/ui)
  --lib <dir>         Shared helper directory (default: <alias root>/lib)
  --stylesheet <file> Stylesheet that loads Tailwind CSS
  --alias <prefix>    Import prefix recorded in tracky.json (default: from tsconfig)
  --alias-root <dir>  Directory the prefix maps to (default: from tsconfig)
  --force             Rewrite an existing tracky.json

Add options:
  --overwrite         Replace files that already exist

Both commands:
  --ref <ref>         Branch, tag, or commit SHA to install from (default: main)
  --registry <url>    Base URL of the registry payloads
  -h, --help          Show help
  -v, --version       Show the CLI version

The CLI reads your tsconfig.json path mappings and refuses to install when the
configured alias does not match. See https://github.com/lennythecreator/tracky
for the component list.`

function readVersion(): string {
  try {
    const pkg: unknown = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    if (typeof pkg === 'object' && pkg !== null && typeof (pkg as { version?: unknown }).version === 'string') {
      return (pkg as { version: string }).version
    }
  } catch {
    // Fall through: the version is cosmetic, not worth failing over.
  }

  return 'unknown'
}

interface ParsedArgs {
  positionals: string[]
  flags: Set<string>
  values: Map<string, string>
}

function parseArgs(
  args: string[],
  spec: { booleans: string[]; values: string[] },
  usage: string,
): ParsedArgs {
  const positionals: string[] = []
  const flags = new Set<string>()
  const values = new Map<string, string>()

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--') {
      positionals.push(...args.slice(i + 1))
      break
    }

    if (arg === '-h') {
      flags.add('help')
      continue
    }

    if (arg.startsWith('--')) {
      const separator = arg.indexOf('=')
      const name = separator === -1 ? arg.slice(2) : arg.slice(2, separator)
      const inline = separator === -1 ? undefined : arg.slice(separator + 1)

      if (spec.booleans.includes(name)) {
        if (inline !== undefined) throw new CliError(`--${name} does not take a value.`, usage)
        flags.add(name)
        continue
      }

      if (spec.values.includes(name)) {
        const value = inline ?? args[i + 1]

        if (value === undefined || (inline === undefined && value.startsWith('--'))) {
          throw new CliError(`--${name} needs a value.`, usage)
        }

        if (inline === undefined) i += 1
        values.set(name, value)
        continue
      }

      throw new CliError(`Unknown option "--${name}".`, usage)
    }

    if (arg.startsWith('-') && arg !== '-') {
      throw new CliError(`Unknown option "${arg}".`, usage)
    }

    positionals.push(arg)
  }

  return { positionals, flags, values }
}

const INIT_USAGE = 'Usage: tracky init [--ui <dir>] [--lib <dir>] [--stylesheet <file>] [--alias <prefix>] [--alias-root <dir>] [--force]'
const ADD_USAGE = 'Usage: tracky add <component...> [--overwrite] [--ref <ref>]'

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP)
    return
  }

  if (command === '--version' || command === '-v') {
    console.log(readVersion())
    return
  }

  if (command === 'init') {
    const parsed = parseArgs(
      rest,
      { booleans: ['force', 'help'], values: ['ui', 'lib', 'stylesheet', 'alias', 'alias-root', 'ref', 'registry'] },
      INIT_USAGE,
    )

    if (parsed.flags.has('help')) {
      console.log(HELP)
      return
    }

    await runInit(process.cwd(), {
      ui: parsed.values.get('ui'),
      lib: parsed.values.get('lib'),
      stylesheet: parsed.values.get('stylesheet'),
      aliasPrefix: parsed.values.get('alias'),
      aliasRoot: parsed.values.get('alias-root'),
      force: parsed.flags.has('force'),
      ref: parsed.values.get('ref'),
      registry: parsed.values.get('registry'),
    })
    return
  }

  if (command === 'add') {
    const parsed = parseArgs(
      rest,
      { booleans: ['overwrite', 'help'], values: ['ref', 'registry'] },
      ADD_USAGE,
    )

    if (parsed.flags.has('help')) {
      console.log(HELP)
      return
    }

    await runAdd(process.cwd(), {
      names: parsed.positionals,
      overwrite: parsed.flags.has('overwrite'),
      ref: parsed.values.get('ref'),
      registry: parsed.values.get('registry'),
    })
    return
  }

  throw new CliError(`Unknown command "${command}".`, 'Run `tracky --help` to see the available commands.')
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(`error: ${error.message}`)
    if (error.hint) console.error(`\n${error.hint}`)
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message)
  } else {
    console.error(String(error))
  }

  process.exitCode = 1
})

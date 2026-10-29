import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CliError } from './errors.js'
import { asRecord, parseJsonc } from './jsonc.js'

export const CONFIG_FILE = 'tracky.json'

export interface TrackyAlias {
  /** Import prefix, for example `@` in `@/components/ui/button`. */
  prefix: string
  /** Project-relative directory the prefix resolves to, for example `src`. */
  root: string
}

export interface TrackyConfig {
  ui: string
  lib: string
  stylesheet: string
  alias: TrackyAlias
}

export const DEFAULT_UI = 'src/components/ui'
export const DEFAULT_LIB = 'src/lib'
export const DEFAULT_ALIAS: TrackyAlias = { prefix: '@', root: 'src' }

export function toPosix(value: string): string {
  return value.replace(/\\/g, '/')
}

export function normalizeRelative(value: string): string {
  return toPosix(value.trim()).replace(/^\.\//, '').replace(/\/+$/, '')
}

function requireRelative(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CliError(`${CONFIG_FILE}: "${field}" must be a non-empty relative path.`)
  }

  const normalized = normalizeRelative(value)

  if (
    path.isAbsolute(value) ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new CliError(
      `${CONFIG_FILE}: "${field}" must be a path inside the project (got "${value}").`,
    )
  }

  return normalized
}

function requireAlias(value: unknown): TrackyAlias {
  if (value === undefined) return { ...DEFAULT_ALIAS }

  const record = asRecord(value)

  if (!record) {
    throw new CliError(`${CONFIG_FILE}: "alias" must be an object with "prefix" and "root".`)
  }

  const prefix = record.prefix === undefined ? DEFAULT_ALIAS.prefix : record.prefix

  if (typeof prefix !== 'string' || prefix.trim() === '' || prefix.includes('*')) {
    throw new CliError(`${CONFIG_FILE}: "alias.prefix" must be a non-empty import prefix such as "@".`)
  }

  const normalizedPrefix = prefix.trim().replace(/\/+$/, '')

  if (/[\s"'`]/.test(normalizedPrefix)) {
    throw new CliError(`${CONFIG_FILE}: "alias.prefix" cannot contain spaces or quotes.`)
  }

  return {
    prefix: normalizedPrefix,
    root: record.root === undefined ? DEFAULT_ALIAS.root : requireRelative(record.root, 'alias.root'),
  }
}

export function parseConfig(value: unknown, source = CONFIG_FILE): TrackyConfig {
  const record = asRecord(value)

  if (!record) {
    throw new CliError(`${source} must contain a JSON object.`)
  }

  return {
    ui: record.ui === undefined ? DEFAULT_UI : requireRelative(record.ui, 'ui'),
    lib: record.lib === undefined ? DEFAULT_LIB : requireRelative(record.lib, 'lib'),
    stylesheet:
      record.stylesheet === undefined
        ? ''
        : requireRelative(record.stylesheet, 'stylesheet'),
    alias: requireAlias(record.alias),
  }
}

export function serializeConfig(config: TrackyConfig): string {
  return `${JSON.stringify(
    {
      ui: config.ui,
      lib: config.lib,
      stylesheet: config.stylesheet,
      alias: { prefix: config.alias.prefix, root: config.alias.root },
    },
    null,
    2,
  )}\n`
}

export async function readConfig(root: string): Promise<TrackyConfig | null> {
  const file = path.join(root, CONFIG_FILE)
  let raw: string

  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }

  const config = parseConfig(parseJsonc(raw, CONFIG_FILE))

  if (config.stylesheet === '') {
    throw new CliError(
      `${CONFIG_FILE}: "stylesheet" is required.`,
      'Set it to the stylesheet that imports your Tailwind CSS, for example "src/app/globals.css".',
    )
  }

  return config
}

export async function writeConfig(root: string, config: TrackyConfig): Promise<void> {
  await writeFile(path.join(root, CONFIG_FILE), serializeConfig(config), 'utf8')
}

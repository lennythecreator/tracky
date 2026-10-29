import { CliError } from './errors.js'
import { asRecord } from './jsonc.js'

export const DEFAULT_REGISTRY_BASE =
  'https://raw.githubusercontent.com/lennythecreator/tracky/main/registry/r'

const REQUEST_TIMEOUT_MS = 15_000

export type ItemType = 'ui' | 'lib' | 'theme'

export interface RegistryItemFile {
  type: ItemType
  path: string
  content: string
}

export interface RegistryItem {
  schema: number
  name: string
  type: ItemType
  title: string
  description: string
  dependencies: string[]
  requires: string[]
  files: RegistryItemFile[]
}

export interface RegistryIndexItem {
  name: string
  type: ItemType
  title: string
  description: string
}

export interface RegistryIndex {
  schema: number
  name: string
  homepage: string
  items: RegistryIndexItem[]
}

export interface RegistrySource {
  /** Base URL that item payloads are fetched from. */
  base: string
  /** Ref the developer asked for, such as `main` or a tag or commit SHA. */
  ref: string
  /** Commit SHA the ref resolved to, when the host could be asked. */
  resolved: string | null
  index: RegistryIndex
}

const ITEM_TYPES: ItemType[] = ['ui', 'lib', 'theme']

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'tracky-cli' },
    })

    if (!response.ok) {
      throw new CliError(`Could not download ${url} (HTTP ${response.status}).`)
    }

    return await response.text()
  } catch (error) {
    if (error instanceof CliError) throw error

    throw new CliError(
      `Could not reach ${url}.`,
      'Check your network connection, or pass --registry with a base URL you can reach.',
    )
  } finally {
    clearTimeout(timeout)
  }
}

function parseJson(text: string, url: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new CliError(`${url} did not return JSON.`)
  }
}

function readString(record: Record<string, unknown>, field: string, source: string): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new CliError(`${source} is missing "${field}".`)
  }
  return value
}

function readStringArray(record: Record<string, unknown>, field: string): string[] {
  const value = record[field]
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new CliError(`Registry payload field "${field}" must be an array of strings.`)
  }
  return value as string[]
}

function readItemType(record: Record<string, unknown>, source: string): ItemType {
  const value = record.type
  if (typeof value !== 'string' || !ITEM_TYPES.includes(value as ItemType)) {
    throw new CliError(`${source} has an unknown item type.`)
  }
  return value as ItemType
}

function parseIndex(raw: unknown, url: string): RegistryIndex {
  const record = asRecord(raw)

  if (!record || record.schema !== 1 || !Array.isArray(record.items)) {
    throw new CliError(`${url} is not a Tracky registry index.`)
  }

  const items = record.items.map((entry) => {
    const item = asRecord(entry)
    if (!item) throw new CliError(`${url} lists an item that is not an object.`)

    return {
      name: readString(item, 'name', url),
      type: readItemType(item, url),
      title: readString(item, 'title', url),
      description: typeof item.description === 'string' ? item.description : '',
    }
  })

  return {
    schema: 1,
    name: typeof record.name === 'string' ? record.name : 'tracky',
    homepage: typeof record.homepage === 'string' ? record.homepage : '',
    items,
  }
}

function parseItem(raw: unknown, url: string): RegistryItem {
  const record = asRecord(raw)

  if (!record || record.schema !== 1 || !Array.isArray(record.files)) {
    throw new CliError(`${url} is not a Tracky registry item.`)
  }

  const files = record.files.map((entry) => {
    const file = asRecord(entry)
    if (!file) throw new CliError(`${url} lists a file that is not an object.`)

    return {
      type: readItemType(file, url),
      path: readString(file, 'path', url),
      content: readString(file, 'content', url),
    }
  })

  return {
    schema: 1,
    name: readString(record, 'name', url),
    type: readItemType(record, url),
    title: readString(record, 'title', url),
    description: typeof record.description === 'string' ? record.description : '',
    dependencies: readStringArray(record, 'dependencies'),
    requires: readStringArray(record, 'requires'),
    files,
  }
}

function parseGithubHomepage(homepage: string): { owner: string; repo: string } | null {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(homepage)
  if (!match) return null

  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

function rawBase(owner: string, repo: string, ref: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/registry/r`
}

async function resolveCommit(owner: string, repo: string, ref: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'tracky-cli' },
    })

    if (!response.ok) return null

    const data = asRecord(await response.json())
    return typeof data?.sha === 'string' ? data.sha : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function resolveSource(options: {
  ref?: string
  registry?: string
}): Promise<RegistrySource> {
  const requestedRef = options.ref?.trim() || 'main'
  const base = (options.registry ?? DEFAULT_REGISTRY_BASE).replace(/\/+$/, '')
  const indexUrl = `${base}/index.json`
  const index = parseIndex(parseJson(await fetchText(indexUrl), indexUrl), indexUrl)

  if (options.registry) {
    return { base, ref: requestedRef, resolved: null, index }
  }

  const repo = parseGithubHomepage(index.homepage)

  if (!repo) {
    return { base, ref: requestedRef, resolved: null, index }
  }

  const resolved = await resolveCommit(repo.owner, repo.repo, requestedRef)

  if (!resolved) {
    console.warn(
      `warning: could not resolve "${requestedRef}" to a commit; fetching from the branch or tag name instead.`,
    )
    return { base, ref: requestedRef, resolved: null, index }
  }

  return { base: rawBase(repo.owner, repo.repo, resolved), ref: requestedRef, resolved, index }
}

export async function fetchItem(source: RegistrySource, name: string): Promise<RegistryItem> {
  const url = `${source.base}/${name}.json`
  return parseItem(parseJson(await fetchText(url), url), url)
}

/**
 * Fetches the requested items plus everything they require, so `add button`
 * brings `utils` along without the developer naming it.
 */
export async function resolveItems(
  source: RegistrySource,
  names: string[],
): Promise<RegistryItem[]> {
  const known = new Set(source.index.items.map((item) => item.name))
  const queue = [...new Set(names.map((name) => name.trim()).filter(Boolean))]

  for (const name of queue) {
    if (!known.has(name)) {
      throw new CliError(
        `Unknown component "${name}".`,
        `Available: ${[...known].filter((item) => item !== 'theme').sort().join(', ')}.`,
      )
    }
  }

  const items = new Map<string, RegistryItem>()
  const pending = [...queue]

  while (pending.length > 0) {
    const name = pending.shift() as string
    if (items.has(name)) continue

    const item = await fetchItem(source, name)
    items.set(name, item)

    for (const dependency of item.requires) {
      if (!items.has(dependency)) pending.push(dependency)
    }
  }

  return [...items.values()]
}

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { CliError } from './errors.js'
import { asRecord, parseJsonc } from './jsonc.js'
import { normalizeRelative, toPosix, type TrackyAlias } from './config.js'

export interface PathMapping {
  key: string
  targets: string[]
  /** Directory that relative targets in this mapping are resolved against. */
  baseDir: string
}

interface TsconfigShape {
  compilerOptions?: {
    baseUrl?: unknown
    paths?: unknown
  }
  extends?: unknown
}

async function isFile(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isFile()
  } catch {
    return false
  }
}

function samePath(a: string, b: string): boolean {
  const left = path.resolve(a)
  const right = path.resolve(b)
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
}

/**
 * Looks for `tsconfig.json` at the project root and up to two directories
 * above it, which covers a frontend nested inside a monorepo.
 */
export async function findTsconfig(root: string): Promise<string | null> {
  let current = path.resolve(root)

  for (let depth = 0; depth <= 2; depth += 1) {
    const candidate = path.join(current, 'tsconfig.json')
    if (await isFile(candidate)) return candidate

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return null
}

async function resolveExtends(specifier: string, fromDir: string): Promise<string | null> {
  if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
    const base = path.resolve(fromDir, specifier)

    for (const candidate of [base, `${base}.json`, path.join(base, 'tsconfig.json')]) {
      if (await isFile(candidate)) return candidate
    }

    return null
  }

  let current = fromDir

  while (true) {
    const base = path.join(current, 'node_modules', specifier)

    for (const candidate of [base, `${base}.json`, path.join(base, 'tsconfig.json')]) {
      if (await isFile(candidate)) return candidate
    }

    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

interface LoadedConfig {
  mappings: Map<string, PathMapping>
  /** Resolved `baseUrl` for this config, inherited from an extended config when absent. */
  baseUrlDir: string | null
}

async function loadConfig(
  tsconfigPath: string,
  seen = new Set<string>(),
): Promise<LoadedConfig> {
  const resolvedPath = path.resolve(tsconfigPath)
  const mappings = new Map<string, PathMapping>()

  if (seen.has(resolvedPath)) {
    throw new CliError(`${toPosix(path.relative(process.cwd(), resolvedPath))} extends itself.`)
  }
  seen.add(resolvedPath)

  const parsed = asRecord(parseJsonc(await readFile(resolvedPath, 'utf8'), resolvedPath)) as TsconfigShape | null

  if (!parsed) {
    throw new CliError(`${resolvedPath} must contain a JSON object.`)
  }

  const parentDir = path.dirname(resolvedPath)
  const rawExtends = parsed.extends
  const parents =
    typeof rawExtends === 'string' ? [rawExtends] : Array.isArray(rawExtends) ? rawExtends : []
  let inheritedBaseUrl: string | null = null

  for (const specifier of parents) {
    if (typeof specifier !== 'string') continue
    const parentPath = await resolveExtends(specifier, parentDir)
    if (!parentPath) continue

    const parent = await loadConfig(parentPath, seen)

    for (const [key, mapping] of parent.mappings) {
      mappings.set(key, mapping)
    }

    if (inheritedBaseUrl === null) inheritedBaseUrl = parent.baseUrlDir
  }

  const compilerOptions = asRecord(parsed.compilerOptions)
  const baseUrl = compilerOptions?.baseUrl
  const ownBaseUrl =
    typeof baseUrl === 'string' && baseUrl.trim() !== ''
      ? path.resolve(parentDir, baseUrl)
      : null
  const baseUrlDir = ownBaseUrl ?? inheritedBaseUrl
  const baseDir = baseUrlDir ?? parentDir

  const paths = asRecord(compilerOptions?.paths)

  if (paths) {
    for (const [key, value] of Object.entries(paths)) {
      if (!Array.isArray(value) || value.some((target) => typeof target !== 'string')) {
        throw new CliError(
          `${toPosix(path.relative(process.cwd(), resolvedPath))}: compilerOptions.paths["${key}"] must be an array of strings.`,
        )
      }

      mappings.set(key, { key, targets: value as string[], baseDir })
    }
  }

  return { mappings, baseUrlDir }
}

async function loadMappings(tsconfigPath: string): Promise<Map<string, PathMapping>> {
  return (await loadConfig(tsconfigPath)).mappings
}

function mappingRoots(mapping: PathMapping): string[] {
  const roots: string[] = []

  for (const target of mapping.targets) {
    if (!target.includes('*')) continue
    const prefix = target.slice(0, target.indexOf('*')).replace(/\/+$/, '')
    roots.push(path.resolve(mapping.baseDir, prefix))
  }

  return roots
}

export interface AliasCheck {
  tsconfig: string
  /** Prefix including a trailing slash, ready to prepend to an alias-relative path. */
  specifierBase: string
}

/**
 * Confirms the consumer's tsconfig actually maps the configured prefix to the
 * configured root. Without this the installed imports would not resolve.
 */
export async function verifyAlias(root: string, alias: TrackyAlias): Promise<AliasCheck> {
  const tsconfigPath = await findTsconfig(root)

  if (!tsconfigPath) {
    throw new CliError(
      `No tsconfig.json found in ${toPosix(root)} or its parent directories.`,
      'tracky writes alias imports, so it needs the tsconfig that defines them.',
    )
  }

  const mappings = await loadMappings(tsconfigPath)
  const expectedKey = `${alias.prefix}/*`
  const tsconfigLabel = toPosix(path.relative(root, tsconfigPath)) || 'tsconfig.json'
  const mapping =
    mappings.get(expectedKey) ??
    [...mappings.values()].find((candidate) => candidate.key.toLowerCase() === expectedKey.toLowerCase())

  if (!mapping) {
    const keys = [...mappings.keys()].sort()

    throw new CliError(
      `${tsconfigLabel} has no "${expectedKey}" path mapping.`,
      [
        `Add this to compilerOptions.paths in ${tsconfigLabel}:`,
        '',
        `  "${expectedKey}": ["./${alias.root}/*"]`,
        '',
        keys.length > 0
          ? `Existing mappings: ${keys.map((key) => `"${key}"`).join(', ')}.`
          : 'The file has no compilerOptions.paths today.',
      ].join('\n'),
    )
  }

  const expectedRoot = path.resolve(root, alias.root)

  if (!mappingRoots(mapping).some((candidate) => samePath(candidate, expectedRoot))) {
    throw new CliError(
      `"${expectedKey}" in ${tsconfigLabel} maps to ${mapping.targets.map((target) => `"${target}"`).join(', ')}, which is not "${alias.root}".`,
      `Set "alias.root" in tracky.json to "${normalizeRelative(
        toPosix(path.relative(root, mappingRoots(mapping)[0] ?? expectedRoot)),
      )}" or change the tsconfig path mapping.`,
    )
  }

  return { tsconfig: tsconfigPath, specifierBase: `${alias.prefix}/` }
}

/**
 * The first single-target `*` mapping whose root sits inside the project.
 * Used by `tracky init` to propose a config that already works.
 */
export async function detectAlias(root: string, tsconfigPath: string): Promise<TrackyAlias | null> {
  const mappings = await loadMappings(tsconfigPath)
  const candidates = [...mappings.values()]
    .filter((mapping) => mapping.key.endsWith('/*'))
    .sort((a, b) => (a.key === '@/*' ? -1 : b.key === '@/*' ? 1 : 0))

  for (const mapping of candidates) {
    const roots = mappingRoots(mapping)
    if (roots.length !== 1) continue

    const relative = normalizeRelative(toPosix(path.relative(root, roots[0])))
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('../')) continue

    const prefix = mapping.key.slice(0, -2).replace(/\/+$/, '')
    if (prefix === '') continue

    return { prefix, root: relative === '' ? '.' : relative }
  }

  return null
}

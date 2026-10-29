import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  CONFIG_FILE,
  normalizeRelative,
  parseConfig,
  toPosix,
  writeConfig,
  type TrackyConfig,
} from './config.js'
import { CliError } from './errors.js'
import { readLock, writeLock } from './lock.js'
import { rewriteContent } from './plan.js'
import { fetchItem, resolveSource } from './registry.js'
import { detectAlias, findTsconfig, verifyAlias } from './tsconfig.js'

export interface InitOptions {
  ui?: string
  lib?: string
  stylesheet?: string
  aliasPrefix?: string
  aliasRoot?: string
  force: boolean
  ref?: string
  registry?: string
}

const STYLESHEET_CANDIDATES = [
  'src/app/globals.css',
  'app/globals.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'src/index.css',
  'src/globals.css',
  'src/main.css',
  'src/app.css',
  'app/index.css',
  'index.css',
]

const TAILWIND_CONFIGS = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
]

async function isFile(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isFile()
  } catch {
    return false
  }
}

async function isDirectory(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isDirectory()
  } catch {
    return false
  }
}

function defaultDirectory(aliasRoot: string, name: string): string {
  return aliasRoot === '.' || aliasRoot === '' ? name : `${aliasRoot}/${name}`
}

async function firstExistingDirectory(root: string, candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await isDirectory(path.join(root, candidate))) return candidate
  }
  return null
}

async function readJsonFile(file: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Inserts the import after any leading `@charset` and `@import` statements, so
 * the result stays valid CSS. Comments and blank lines above those statements
 * are preserved.
 */
function insertCssImport(css: string, specifier: string): string {
  const newline = css.includes('\r\n') ? '\r\n' : '\n'
  const lines = css.split(/\r?\n/)
  let index = 0
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (trimmed === '') {
      i += 1
      continue
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        i += 1
        while (i < lines.length && !lines[i].includes('*/')) i += 1
      }
      i += 1
      continue
    }

    if (trimmed.startsWith('@charset') || trimmed.startsWith('@import')) {
      while (i < lines.length && !lines[i].includes(';')) i += 1
      i += 1
      continue
    }

    break
  }

  index = lines.slice(0, i).every((line) => line.trim() === '') ? 0 : i

  const next = [...lines.slice(0, index), `@import "${specifier}";`, '', ...lines.slice(index)]
  return next.join(newline)
}

/**
 * Builds the Tailwind v4 mapping from the token names in tokens.css, so the
 * mapping follows the theme instead of duplicating it.
 */
function tailwindThemeBlock(tokensCss: string): string {
  const names = [...tokensCss.matchAll(/--tracky-([a-z0-9-]+)\s*:/g)].map((match) => match[1])
  const mappings = names.map((name) => {
    const variable = name.startsWith('radius-')
      ? `--radius-${name.slice('radius-'.length)}`
      : name.startsWith('font-')
        ? `--font-${name.slice('font-'.length)}`
        : `--color-${name}`

    return `  ${variable}: var(--tracky-${name});`
  })

  return ['@theme inline {', ...mappings, '}'].join('\n')
}

async function detectTailwind(
  root: string,
  stylesheet: string,
): Promise<{ major: number | null; config: string | null }> {
  if (/@import\s+["']tailwindcss["']/.test(stylesheet)) return { major: 4, config: null }

  const pkg = await readJsonFile(path.join(root, 'package.json'))
  const version = pkg?.dependencies
    ? (pkg.dependencies as Record<string, unknown>).tailwindcss
    : undefined
  const devVersion = pkg?.devDependencies
    ? (pkg.devDependencies as Record<string, unknown>).tailwindcss
    : undefined
  const declared = typeof version === 'string' ? version : typeof devVersion === 'string' ? devVersion : null
  const match = declared ? /(\d+)/.exec(declared) : null

  let config: string | null = null
  for (const candidate of TAILWIND_CONFIGS) {
    if (await isFile(path.join(root, candidate))) {
      config = candidate
      break
    }
  }

  if (match) return { major: Number(match[1]), config }

  return { major: config ? 3 : null, config }
}

export async function runInit(root: string, options: InitOptions): Promise<void> {
  const configPath = path.join(root, CONFIG_FILE)

  if (!options.force && (await isFile(configPath))) {
    throw new CliError(
      `${toPosix(path.relative(root, configPath)) || CONFIG_FILE} already exists.`,
      'Pass --force to rewrite it from the detected project layout.',
    )
  }

  const tsconfigPath = await findTsconfig(root)

  if (!tsconfigPath) {
    throw new CliError(
      `No tsconfig.json found in ${toPosix(root)} or its parent directories.`,
      'tracky installs alias imports, so it needs the tsconfig that defines them.',
    )
  }

  const detected = await detectAlias(root, tsconfigPath)
  const aliasRoot = normalizeRelative(options.aliasRoot ?? detected?.root ?? 'src')
  const aliasPrefix = options.aliasPrefix ?? detected?.prefix ?? '@'
  const ui =
    options.ui ??
    (await firstExistingDirectory(root, [
      defaultDirectory(aliasRoot, 'components/ui'),
      'src/components/ui',
      'components/ui',
    ])) ??
    defaultDirectory(aliasRoot, 'components/ui')
  const lib =
    options.lib ??
    (await firstExistingDirectory(root, [
      defaultDirectory(aliasRoot, 'lib'),
      'src/lib',
      'lib',
    ])) ??
    defaultDirectory(aliasRoot, 'lib')

  let stylesheet = options.stylesheet ? normalizeRelative(options.stylesheet) : null

  if (!stylesheet) {
    for (const candidate of STYLESHEET_CANDIDATES) {
      if (await isFile(path.join(root, candidate))) {
        stylesheet = candidate
        break
      }
    }
  }

  if (!stylesheet) {
    throw new CliError(
      'Could not find the stylesheet that loads Tailwind CSS.',
      `Pass --stylesheet <path>, for example --stylesheet ${STYLESHEET_CANDIDATES[0]}.`,
    )
  }

  if (!(await isFile(path.join(root, stylesheet)))) {
    throw new CliError(
      `Stylesheet not found: ${stylesheet}`,
      'Pass --stylesheet with a file that exists in your project.',
    )
  }

  const config: TrackyConfig = parseConfig({
    ui,
    lib,
    stylesheet,
    alias: { prefix: aliasPrefix, root: aliasRoot },
  })

  await verifyAlias(root, config.alias)

  const source = await resolveSource({ ref: options.ref, registry: options.registry })
  const theme = await fetchItem(source, 'theme')

  const tokens = theme.files.find((file) => path.basename(file.path) === 'tokens.css')
  const preset = theme.files.find((file) => path.basename(file.path) === 'tailwind-preset.cjs')

  if (!tokens || !preset) {
    throw new CliError('The theme payload is missing tokens.css or tailwind-preset.cjs.')
  }

  const tokensCss = rewriteContent(tokens.content, config)
  const stylesheetPath = path.join(root, config.stylesheet)
  const stylesheetCss = await readFile(stylesheetPath, 'utf8')
  const tailwind = await detectTailwind(root, stylesheetCss)

  const relativeTokens = path.posix.relative(
    path.posix.dirname(config.stylesheet),
    path.posix.join(config.ui, 'tokens.css'),
  )
  const tokensSpecifier = relativeTokens.startsWith('.') ? relativeTokens : `./${relativeTokens}`
  const importsTokens = /@import\s+["'][^"']*tokens\.css["']/.test(stylesheetCss)
  let nextStylesheet = stylesheetCss
  let appendedTheme = false

  if (!importsTokens) {
    nextStylesheet = insertCssImport(nextStylesheet, tokensSpecifier)
  }

  if (tailwind.major === 4 && !nextStylesheet.includes('@theme inline')) {
    nextStylesheet = `${nextStylesheet.replace(/\s+$/, '')}\n\n/* Tracky theme tokens */\n${tailwindThemeBlock(tokensCss)}\n`
    appendedTheme = true
  }

  await mkdir(path.join(root, config.ui), { recursive: true })
  await writeConfig(root, config)

  const written: string[] = []
  const kept: string[] = []

  for (const [file, content] of [
    [tokens, tokensCss],
    [preset, preset.content],
  ] as const) {
    const target = path.join(root, config.ui, path.basename(file.path))
    const relative = toPosix(path.relative(root, target))

    if (await isFile(target)) {
      kept.push(relative)
      continue
    }

    await writeFile(target, content, 'utf8')
    written.push(relative)
  }

  if (nextStylesheet !== stylesheetCss) {
    await writeFile(stylesheetPath, nextStylesheet, 'utf8')
  }

  const lock = await readLock(root)
  lock.registry = source.index.homepage || source.base
  lock.items.theme = {
    ref: source.ref,
    resolved: source.resolved,
    files: [
      toPosix(path.join(config.ui, 'tokens.css')),
      toPosix(path.join(config.ui, 'tailwind-preset.cjs')),
    ],
  }
  await writeLock(root, lock)

  const version = source.resolved ? `${source.ref} at ${source.resolved.slice(0, 7)}` : source.ref

  console.log(`Created ${CONFIG_FILE} (${version}):`)
  console.log(`  ui:         ${config.ui}`)
  console.log(`  lib:        ${config.lib}`)
  console.log(`  stylesheet: ${config.stylesheet}`)
  console.log(`  alias:      ${config.alias.prefix} -> ${config.alias.root}`)

  for (const file of written) console.log(`\nWrote ${file}`)
  for (const file of kept) console.log(`\nKept ${file} (already exists)`)

  if (nextStylesheet !== stylesheetCss) {
    console.log(`\nUpdated ${config.stylesheet} (${appendedTheme ? 'tokens import and @theme mapping' : 'tokens import'})`)
  }

  if (tailwind.major === 4) {
    if (!nextStylesheet.includes('var(--tracky-')) {
      console.log('\nAdd this to your stylesheet so the token classes resolve:')
      console.log(`\n${tailwindThemeBlock(tokensCss)}`)
    }
  } else {
    const presetPath = path.posix.join(config.ui, 'tailwind-preset.cjs')
    const requirePath = presetPath.startsWith('.') ? presetPath : `./${presetPath}`

    console.log(
      `\nTracky components use semantic Tailwind classes. Add the preset in ${tailwind.config ?? 'tailwind.config.js'}:`,
    )
    console.log(`\n  presets: [require('${requirePath}')],`)
  }

  console.log('\nNext: npx tracky add button')
}

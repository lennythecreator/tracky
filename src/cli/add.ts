import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CONFIG_FILE, readConfig, toPosix } from './config.js'
import { CliError } from './errors.js'
import { readLock, writeLock } from './lock.js'
import { planFiles, type PlannedFile } from './plan.js'
import { resolveItems, resolveSource } from './registry.js'
import { verifyAlias } from './tsconfig.js'

export interface AddOptions {
  names: string[]
  overwrite: boolean
  ref?: string
  registry?: string
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function fileExists(file: string): Promise<boolean> {
  return (await readIfExists(file)) !== null
}

async function readPackageJson(root: string): Promise<Record<string, unknown> | null> {
  const raw = await readIfExists(path.join(root, 'package.json'))
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function dependencyNames(pkg: Record<string, unknown> | null): Set<string> {
  const names = new Set<string>()

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const group = pkg?.[field]
    if (typeof group !== 'object' || group === null) continue

    for (const name of Object.keys(group)) names.add(name)
  }

  return names
}

async function detectInstallCommand(root: string): Promise<string> {
  if (await fileExists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm add'
  if (await fileExists(path.join(root, 'yarn.lock'))) return 'yarn add'
  if (await fileExists(path.join(root, 'bun.lockb'))) return 'bun add'
  return 'npm install'
}

function summarize(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export async function runAdd(root: string, options: AddOptions): Promise<void> {
  const config = await readConfig(root)

  if (!config) {
    throw new CliError(
      `No ${CONFIG_FILE} found in ${toPosix(root)}.`,
      'Run `npx tracky init` first to create the config and theme tokens.',
    )
  }

  if (options.names.length === 0) {
    const source = await resolveSource({ ref: options.ref, registry: options.registry })
    const available = source.index.items
      .filter((item) => item.type !== 'theme')
      .map((item) => item.name)

    throw new CliError(
      'Name at least one component to add.',
      `Available: ${available.join(', ')}\n\nExample: npx tracky add button`,
    )
  }

  await verifyAlias(root, config.alias)

  const source = await resolveSource({ ref: options.ref, registry: options.registry })
  const items = await resolveItems(source, options.names)
  const planned = planFiles(root, config, items)

  const conflicts: string[] = []
  const unchanged: string[] = []
  const changed: PlannedFile[] = []

  for (const file of planned) {
    const existing = await readIfExists(file.target)
    const relative = toPosix(path.relative(root, file.target))

    if (existing === null) {
      changed.push(file)
    } else if (existing === file.content) {
      unchanged.push(relative)
    } else if (options.overwrite) {
      changed.push(file)
    } else {
      conflicts.push(relative)
    }
  }

  if (conflicts.length > 0) {
    throw new CliError(
      `Refusing to overwrite ${conflicts.length} existing file${conflicts.length === 1 ? '' : 's'}:`,
      `${conflicts.map((file) => `  ${file}`).join('\n')}\n\nPass --overwrite to replace them with the registry source.`,
    )
  }

  for (const file of changed) {
    await mkdir(path.dirname(file.target), { recursive: true })
    await writeFile(file.target, file.content, 'utf8')
  }

  const lock = await readLock(root)
  const registryLabel = source.index.homepage || source.base

  for (const item of items) {
    const directory = item.type === 'lib' ? config.lib : config.ui

    lock.items[item.name] = {
      ref: source.ref,
      resolved: source.resolved,
      files: item.files.map((file) => toPosix(path.join(directory, path.basename(file.path)))),
    }
  }

  lock.registry = registryLabel
  await writeLock(root, lock)

  const version = source.resolved ? `${source.ref} at ${source.resolved.slice(0, 7)}` : source.ref
  const requested = new Set(options.names)
  const requiredChanged = items
    .filter((item) => !requested.has(item.name) && changed.some((file) => file.item === item.name))
    .map((item) => item.name)
  const counts = [`${changed.length} file${changed.length === 1 ? '' : 's'} written`]

  if (unchanged.length > 0) {
    counts.push(`${unchanged.length} already up to date`)
  }

  const withRequired = requiredChanged.length > 0 ? ` with ${summarize(requiredChanged)}` : ''
  console.log(
    `Added ${summarize([...requested])}${withRequired} from ${version} (${counts.join(', ')}).`,
  )

  for (const file of changed) {
    console.log(`  ${toPosix(path.relative(root, file.target))}`)
  }

  const packageJson = await readPackageJson(root)
  const installed = dependencyNames(packageJson)
  const required = [...new Set(items.flatMap((item) => item.dependencies))].filter(
    (name) => !installed.has(name),
  )

  if (required.length > 0) {
    const command = await detectInstallCommand(root)
    console.log(`\nInstall the SDK these components import: ${command} ${required.join(' ')}`)
  }

  if (!(await fileExists(path.join(root, config.ui, 'tokens.css')))) {
    console.log(
      `\nTheme tokens are missing from ${config.ui}. Run \`npx tracky init\` so the component classes resolve.`,
    )
  }
}

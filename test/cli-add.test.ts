// @vitest-environment node
import { readFile, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAdd } from '../src/cli/add.js'
import {
  createProject,
  readJson,
  startRegistry,
  TRACKY_CONFIG,
  type Project,
  type RegistryServer,
} from './cli-harness.js'

let registry: RegistryServer
let projects: Project[]
let logs: string[]

beforeEach(async () => {
  registry = await startRegistry()
  projects = []
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await registry.close()
  await Promise.all(projects.splice(0).map((project) => project.remove()))
})

async function project(overrides: Record<string, string | null> = {}): Promise<Project> {
  const created = await createProject(overrides)
  projects.push(created)
  return created
}

/** `init` has its own suite; add only needs the config file it leaves behind. */
async function configured(): Promise<Project> {
  return project({ 'tracky.json': `${JSON.stringify(TRACKY_CONFIG, null, 2)}\n` })
}

describe('tracky add', () => {
  it('installs a component with the helper it requires and records both', async () => {
    const app = await configured()

    await runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url })

    const button = await readFile(app.file('src/components/ui/button.tsx'), 'utf8')
    expect(button).toContain("from '@/lib/utils'")
    expect(button).toContain('data-tracky-component="button"')

    const utils = await readFile(app.file('src/lib/utils.ts'), 'utf8')
    expect(utils).toContain('export function cn')

    const lock = await readJson<{ items: Record<string, { files: string[] }> }>(
      app,
      'tracky.lock.json',
    )
    expect(lock.items.button.files).toEqual(['src/components/ui/button.tsx'])
    expect(lock.items.utils.files).toEqual(['src/lib/utils.ts'])

    expect(logs.join('\n')).toContain('Added button with utils from main (2 files written).')
    expect(logs.join('\n')).toContain('npm install tracky')
  })

  it('refuses to replace an edited file unless --overwrite is passed', async () => {
    const app = await configured()
    await runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url })

    const edited = '// local edit\n'
    await writeFile(app.file('src/components/ui/button.tsx'), edited, 'utf8')

    await expect(
      runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('Refusing to overwrite 1 existing file'),
    })
    expect(await readFile(app.file('src/components/ui/button.tsx'), 'utf8')).toBe(edited)

    await runAdd(app.root, { names: ['button'], overwrite: true, registry: registry.url })
    expect(await readFile(app.file('src/components/ui/button.tsx'), 'utf8')).toContain(
      'data-tracky-component="button"',
    )
  })

  it('reports current files instead of rewriting them', async () => {
    const app = await configured()
    await runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url })
    logs.length = 0

    await runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url })

    expect(logs.join('\n')).toContain('0 files written, 2 already up to date')
  })

  it('requires init before add', async () => {
    const app = await project()

    await expect(
      runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('No tracky.json found'),
    })
  })

  it('requires a component name and lists the registry contents', async () => {
    const app = await configured()

    await expect(
      runAdd(app.root, { names: [], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('Name at least one component'),
      hint: expect.stringContaining('button'),
    })
  })

  it('rejects an unknown component by name', async () => {
    const app = await configured()

    await expect(
      runAdd(app.root, { names: ['nope'], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('Unknown component "nope"'),
      hint: expect.stringContaining('Available: button'),
    })
  })

  it('refuses to install when the alias does not resolve in tsconfig', async () => {
    const app = await project({
      'tracky.json': `${JSON.stringify(
        { ...TRACKY_CONFIG, alias: { prefix: '@', root: 'app' } },
        null,
        2,
      )}\n`,
    })

    await expect(
      runAdd(app.root, { names: ['button'], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('which is not "app"'),
    })
  })

  it('points theme installs at init', async () => {
    const app = await configured()

    await expect(
      runAdd(app.root, { names: ['theme'], overwrite: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('installed by tracky init'),
    })
  })
})

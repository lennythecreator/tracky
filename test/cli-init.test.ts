// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runInit } from '../src/cli/init.js'
import {
  createProject,
  exists,
  readJson,
  startRegistry,
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

describe('tracky init', () => {
  it('writes the config, theme files, and lock for a detected project', async () => {
    const app = await project()

    await runInit(app.root, { force: false, registry: registry.url })

    expect(await readJson(app, 'tracky.json')).toEqual({
      ui: 'src/components/ui',
      lib: 'src/lib',
      stylesheet: 'src/app/globals.css',
      alias: { prefix: '@', root: 'src' },
    })

    const tokens = await readFile(app.file('src/components/ui/tokens.css'), 'utf8')
    expect(tokens).toContain('--tracky-primary:')

    const preset = await readFile(app.file('src/components/ui/tailwind-preset.cjs'), 'utf8')
    expect(preset).toContain('var(--tracky-')

    const lock = await readJson<{
      registry: string
      items: Record<string, { ref: string; resolved: string | null; files: string[] }>
    }>(app, 'tracky.lock.json')
    expect(lock.registry).toBe('https://github.com/lennythecreator/tracky')
    expect(lock.items.theme).toEqual({
      ref: 'main',
      resolved: null,
      files: ['src/components/ui/tokens.css', 'src/components/ui/tailwind-preset.cjs'],
    })

    // The tokens import follows the existing Tailwind import, and the v4 theme
    // mapping is generated from the token names rather than duplicated.
    const css = await readFile(app.file('src/app/globals.css'), 'utf8')
    expect(css).toContain('@import "../components/ui/tokens.css";')
    expect(css.indexOf('@import "tailwindcss";')).toBeLessThan(
      css.indexOf('@import "../components/ui/tokens.css";'),
    )
    expect(css).toContain('@theme inline {')
    expect(css).toContain('--color-primary: var(--tracky-primary);')

    expect(logs.join('\n')).toContain('Created tracky.json (main)')
  })

  it('records an explicit layout instead of the detected one', async () => {
    const app = await project({
      'tsconfig.json': `${JSON.stringify(
        { compilerOptions: { baseUrl: '.', paths: { '~/*': ['./app/*'] } } },
        null,
        2,
      )}\n`,
      'app/globals.css': '@import "tailwindcss";\n',
    })

    await runInit(app.root, {
      ui: 'app/ui',
      lib: 'app/lib',
      stylesheet: 'app/globals.css',
      aliasPrefix: '~',
      aliasRoot: 'app',
      force: false,
      registry: registry.url,
    })

    expect(await readJson(app, 'tracky.json')).toEqual({
      ui: 'app/ui',
      lib: 'app/lib',
      stylesheet: 'app/globals.css',
      alias: { prefix: '~', root: 'app' },
    })
    expect(await exists(app.file('app/ui/tokens.css'))).toBe(true)

    const css = await readFile(app.file('app/globals.css'), 'utf8')
    expect(css).toContain('@import "./ui/tokens.css";')
  })

  it('refuses an existing config without --force and keeps one tokens import on a rerun', async () => {
    const app = await project()
    await runInit(app.root, { force: false, registry: registry.url })
    const first = await readFile(app.file('src/app/globals.css'), 'utf8')

    await expect(
      runInit(app.root, { force: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('tracky.json already exists'),
    })

    await runInit(app.root, { force: true, registry: registry.url })
    const second = await readFile(app.file('src/app/globals.css'), 'utf8')

    expect(second).toBe(first)
    expect(second.match(/@import "[^"]*tokens\.css";/g)).toHaveLength(1)
  })

  it('fails before writing anything when the project has no tsconfig', async () => {
    const app = await project({ 'tsconfig.json': null })

    await expect(
      runInit(app.root, { force: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('No tsconfig.json found'),
    })
    expect(await exists(app.file('tracky.json'))).toBe(false)
  })

  it('fails when the configured alias is not what tsconfig maps', async () => {
    const app = await project({
      'tsconfig.json': JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['./app/*'] } },
      }),
    })

    // Without an explicit root, init adopts the tsconfig mapping; pinning the
    // root is what makes the mismatch something the CLI must reject.
    await expect(
      runInit(app.root, {
        aliasPrefix: '@',
        aliasRoot: 'src',
        force: false,
        registry: registry.url,
      }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('which is not "src"'),
    })
    expect(await exists(app.file('tracky.json'))).toBe(false)
  })

  it('fails when it cannot find the stylesheet that loads Tailwind', async () => {
    const app = await project({ 'src/app/globals.css': null })

    await expect(
      runInit(app.root, { force: false, registry: registry.url }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('Could not find the stylesheet'),
    })
    expect(await exists(app.file('tracky.json'))).toBe(false)
  })
})

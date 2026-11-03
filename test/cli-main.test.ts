// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from '../src/cli/run.js'
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
let out: string[]
let errors: string[]
let cwd: string
let version: string

beforeEach(async () => {
  registry = await startRegistry()
  projects = []
  out = []
  errors = []
  cwd = process.cwd()
  process.exitCode = undefined
  version = (JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string }).version

  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    out.push(args.map(String).join(' '))
  })
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
})

afterEach(async () => {
  process.chdir(cwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  await registry.close()
  await Promise.all(projects.splice(0).map((project) => project.remove()))
})

/** A temp consumer project, with the process moved into it like a terminal would be. */
async function project(overrides: Record<string, string | null> = {}): Promise<Project> {
  const created = await createProject(overrides)
  projects.push(created)
  process.chdir(created.root)
  return created
}

describe('argument parsing', () => {
  it('prints help with no command or a help flag, and exits 0', async () => {
    for (const argv of [[], ['help'], ['--help'], ['-h']] as string[][]) {
      out.length = 0
      expect(await run(argv)).toBe(0)
      expect(process.exitCode).toBe(0)
      expect(out.join('\n')).toContain('Usage:')
      expect(out.join('\n')).toContain('tracky add <component...>')
    }
  })

  it('prints the package version for -v and --version', async () => {
    for (const argv of [['-v'], ['--version']]) {
      out.length = 0
      expect(await run(argv)).toBe(0)
      expect(process.exitCode).toBe(0)
      expect(out).toEqual([version])
    }
  })

  it('shows help for a subcommand without running it', async () => {
    const app = await project()

    expect(await run(['init', '-h'])).toBe(0)
    expect(process.exitCode).toBe(0)
    expect(out.join('\n')).toContain('Init options:')
    await expect(readFile(app.file('tracky.json'), 'utf8')).rejects.toThrow()
  })

  it('rejects an unknown command with exit code 1', async () => {
    expect(await run(['deploy'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('error: Unknown command "deploy".')
    expect(errors.join('\n')).toContain('Run `tracky --help`')
  })

  it('rejects unknown long and short options', async () => {
    expect(await run(['init', '--wat'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('Unknown option "--wat"')
    expect(errors.join('\n')).toContain('Usage: tracky init')

    errors.length = 0
    process.exitCode = undefined
    expect(await run(['add', '-x'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('Unknown option "-x"')
  })

  it('requires a value for value options', async () => {
    expect(await run(['init', '--ui'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('--ui needs a value')

    errors.length = 0
    process.exitCode = undefined
    expect(await run(['init', '--ui', '--force'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('--ui needs a value')
  })

  it('rejects a value on a boolean flag', async () => {
    expect(await run(['init', '--force=yes'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('--force does not take a value')
  })

  it('treats everything after -- as positionals', async () => {
    await project()

    expect(await run(['add', '--', '--overwrite'])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('No tracky.json found')
    expect(errors.join('\n')).not.toContain('Unknown option')
  })
})

describe('exit codes', () => {
  it('runs init from the current directory and exits 0', async () => {
    const app = await project({
      'tsconfig.json': JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '~/*': ['./app/*'] } },
      }),
      'app/globals.css': '@import "tailwindcss";\n',
    })

    const code = await run([
      'init',
      '--ui=app/ui',
      '--lib', 'app/lib',
      '--stylesheet', 'app/globals.css',
      '--alias', '~',
      '--alias-root', 'app',
      '--ref', 'v1.2.3',
      '--registry', registry.url,
    ])

    expect(code).toBe(0)
    expect(process.exitCode).toBe(0)
    expect(await readJson(app, 'tracky.json')).toEqual({
      ui: 'app/ui',
      lib: 'app/lib',
      stylesheet: 'app/globals.css',
      alias: { prefix: '~', root: 'app' },
    })

    const lock = await readJson<{ items: { theme: { ref: string } } }>(app, 'tracky.lock.json')
    expect(lock.items.theme.ref).toBe('v1.2.3')
    expect(out.join('\n')).toContain('Created tracky.json (v1.2.3)')
  })

  it('maps --force to rewriting an existing config', async () => {
    await project()

    expect(await run(['init', '--registry', registry.url])).toBe(0)
    expect(process.exitCode).toBe(0)

    expect(await run(['init', '--registry', registry.url])).toBe(1)
    expect(process.exitCode).toBe(1)
    expect(errors.join('\n')).toContain('tracky.json already exists')

    expect(await run(['init', '--force', '--registry', registry.url])).toBe(0)
    expect(process.exitCode).toBe(0)
  })

  it('runs add with positionals and flags, and exits 0', async () => {
    const app = await project({ 'tracky.json': `${JSON.stringify(TRACKY_CONFIG, null, 2)}\n` })

    expect(await run(['add', 'button', '--overwrite', '--registry', registry.url])).toBe(0)
    expect(process.exitCode).toBe(0)
    expect(await readFile(app.file('src/components/ui/button.tsx'), 'utf8')).toContain(
      'data-tracky-component="button"',
    )
  })
})

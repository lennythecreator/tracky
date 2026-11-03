import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The committed payloads, served over loopback so the tests never reach the network. */
const REGISTRY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'registry',
  'r',
)

export interface RegistryServer {
  url: string
  /** Payload names requested, in order. */
  requests: string[]
  close: () => Promise<void>
}

export async function startRegistry(): Promise<RegistryServer> {
  const requests: string[] = []
  const server = createServer(async (request, response) => {
    const name = (request.url ?? '/').replace(/^\//, '')
    requests.push(name)

    // Only the flat payload layout, so a crafted URL cannot walk the repo.
    if (!/^[a-z-]+\.json$/.test(name)) {
      response.writeHead(404).end()
      return
    }

    try {
      const payload = await readFile(path.join(REGISTRY_DIR, name))
      response.writeHead(200, { 'content-type': 'application/json' }).end(payload)
    } catch {
      response.writeHead(404).end()
    }
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        // Fetch keeps sockets in a pool, and `close` waits for them.
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

/** What `tracky init` detects in a plain project: `@` mapped to `src`, Tailwind v4. */
const BASE_FILES: Record<string, string> = {
  'package.json': `${JSON.stringify(
    { name: 'consumer', private: true, dependencies: { react: '^19.0.0' } },
    null,
    2,
  )}\n`,
  'tsconfig.json': `${JSON.stringify(
    { compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } } },
    null,
    2,
  )}\n`,
  'src/app/globals.css': '@import "tailwindcss";\n\nbody {\n  margin: 0;\n}\n',
}

export interface Project {
  root: string
  file: (...segments: string[]) => string
  remove: () => Promise<void>
}

/**
 * A throwaway consumer project outside the repository. Pass a file to replace a
 * default, or `null` to leave it out, which is how the failure paths are set up.
 */
export async function createProject(
  overrides: Record<string, string | null> = {},
): Promise<Project> {
  const root = await mkdtemp(path.join(tmpdir(), 'tracky-cli-'))

  for (const [relative, content] of Object.entries({ ...BASE_FILES, ...overrides })) {
    if (content === null) continue

    const target = path.join(root, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content, 'utf8')
  }

  return {
    root,
    file: (...segments) => path.join(root, ...segments),
    remove: () => rm(root, { recursive: true, force: true }),
  }
}

export async function readJson<T>(project: Project, relative: string): Promise<T> {
  return JSON.parse(await readFile(project.file(relative), 'utf8')) as T
}

export async function exists(file: string): Promise<boolean> {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

/** The config `tracky init` writes for the base project. */
export const TRACKY_CONFIG = {
  ui: 'src/components/ui',
  lib: 'src/lib',
  stylesheet: 'src/app/globals.css',
  alias: { prefix: '@', root: 'src' },
}

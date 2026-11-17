import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig, type Plugin } from 'vite'
import { buildNav, readMeta, type FolderMeta } from './shared/meta.ts'

const docsDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(docsDir, 'app')
const contentDir = path.join(appDir, 'src', 'content')

/** Every `.mdx` file under the content root, as a path relative to it. */
function contentFiles(dir = contentDir, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return contentFiles(path.join(dir, entry.name), relative)
    return entry.name.endsWith('.mdx') ? [relative] : []
  })
}

/** Every folder under the content root, relatives only, including ''. */
function contentFolders(dir = contentDir, prefix = ''): string[] {
  const folders = existsSync(path.join(dir, 'meta.json')) ? [prefix] : []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    folders.push(...contentFolders(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name))
  }
  return folders
}

/**
 * Read and check the content tree at build start. A page missing from its
 * folder's `meta.json`, a listed page with no file, or a folder with no meta
 * fails the build with the file named, instead of a blank page in production.
 */
function checkContent(): string[] {
  const problems: string[] = []
  const folders: Record<string, FolderMeta> = {}

  for (const folder of contentFolders()) {
    const file = folder ? path.join(contentDir, folder, 'meta.json') : path.join(contentDir, 'meta.json')
    let value: unknown
    try {
      value = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      problems.push(`content/${folder ? `${folder}/` : ''}meta.json is not valid JSON: ${(error as Error).message}`)
      continue
    }
    const read = readMeta(value, folder)
    problems.push(...read.problems)
    if (read.meta) folders[folder] = read.meta
  }

  const files = existsSync(contentDir) ? contentFiles() : []
  problems.push(...buildNav(files, folders).problems)
  return problems
}

function docsContent(): Plugin {
  return {
    name: 'tracky-docs-content',
    buildStart() {
      const problems = checkContent()
      if (problems.length > 0) this.error(`Docs content is not valid:\n  ${problems.join('\n  ')}`)
    },
  }
}

export default defineConfig(({ command }) => ({
  root: appDir,
  // On the site the app is served from `/docs/dist/`; in dev it is the root.
  base: command === 'serve' ? '/' : '/docs/dist/',
  plugins: [
    docsContent(),
    mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }),
    react(),
    tailwindcss(),
  ],
  server: { fs: { allow: [path.resolve(docsDir, '../..')] } },
  build: {
    // The source lives in `app/`; the built site ships at `docs/dist/`.
    outDir: path.join(docsDir, 'dist'),
    emptyOutDir: true,
  },
}))

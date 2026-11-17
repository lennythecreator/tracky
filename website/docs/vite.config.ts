import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig, type Plugin } from 'vite'
import { checkDocs } from './shared/check.ts'
import { buildSearchIndex } from './shared/search-index.ts'
import { nodeNextSourceImports } from '../shared/node-next.ts'

const docsDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(docsDir, 'app')
const contentDir = path.join(appDir, 'src', 'content')
const repoRoot = path.resolve(docsDir, '../..')

/**
 * Run the authoring contract at build start. The page checker is the same one
 * `npm run check:docs` runs, so the build cannot pass a tree CI rejects.
 */
function docsContent(): Plugin {
  return {
    name: 'tracky-docs-content',
    buildStart() {
      const problems = checkDocs(contentDir, repoRoot)
      if (problems.length === 0) return
      this.error(
        `Docs content is not valid:\n  ${problems
          .map((problem) => `${problem.file}:${problem.line} ${problem.message}`)
          .join('\n  ')}`,
      )
    },
  }
}

/**
 * Build the search index once at build start, serve it in dev, and emit it as
 * a static asset. A missing or oversized index fails the build instead of
 * shipping a search box that cannot answer.
 */
function docsSearch(): Plugin {
  let payload: string | undefined

  const build = () => {
    const built = buildSearchIndex(contentDir)
    payload = built.json
    return built
  }

  return {
    name: 'tracky-docs-search',
    buildStart() {
      try {
        build()
      } catch (error) {
        this.error(`Docs search index could not be generated: ${(error as Error).message}`)
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request.url ?? '').split('?')[0] !== '/search-index.json') return next()

        try {
          const { json } = build()
          response.setHeader('Content-Type', 'application/json')
          response.end(json)
        } catch (error) {
          response.statusCode = 500
          response.end(String(error))
        }
      })
    },
    generateBundle() {
      if (!payload) return
      this.emitFile({ type: 'asset', fileName: 'search-index.json', source: payload })
    },
  }
}

export default defineConfig(({ command }) => ({
  root: appDir,
  // On the site the app is served from `/docs/dist/`; in dev it is the root.
  base: command === 'serve' ? '/' : '/docs/dist/',
  plugins: [
    docsContent(),
    docsSearch(),
    nodeNextSourceImports(),
    mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }),
    react(),
    tailwindcss(),
  ],
  // Live examples import the registry source, which imports the SDK by name.
  resolve: { alias: { tracky: path.join(repoRoot, 'src', 'index.ts') } },
  server: { fs: { allow: [path.resolve(docsDir, '../..')] } },
  build: {
    // The source lives in `app/`; the built site ships at `docs/dist/`.
    outDir: path.join(docsDir, 'dist'),
    emptyOutDir: true,
  },
}))

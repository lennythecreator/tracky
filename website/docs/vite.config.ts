import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig, type Plugin } from 'vite'
import { checkDocs } from './shared/check.ts'
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

export default defineConfig(({ command }) => ({
  root: appDir,
  // On the site the app is served from `/docs/dist/`; in dev it is the root.
  base: command === 'serve' ? '/' : '/docs/dist/',
  plugins: [
    docsContent(),
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

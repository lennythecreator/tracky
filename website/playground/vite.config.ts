import { createReadStream, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(playgroundDir, '../..')
const appDir = path.join(playgroundDir, 'app')
const siteDir = path.dirname(playgroundDir)

/**
 * The SDK and registry sources use NodeNext `.js` specifiers that point at
 * `.ts`/`.tsx` files. Vite resolves imports literally, so map them back before
 * resolution runs.
 */
function nodeNextSourceImports(): Plugin {
  return {
    name: 'tracky-node-next-imports',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || !source.endsWith('.js')) return null

      const resolved = path.resolve(path.dirname(importer), source)

      for (const extension of ['.ts', '.tsx']) {
        const candidate = resolved.replace(/\.js$/, extension)
        if (existsSync(candidate)) return candidate
      }

      return null
    },
  }
}

/**
 * Serve the landing page's icons inside the playground instead of keeping a
 * second copy in a Vite public directory.
 */
function siteIcons(): Plugin {
  const icons: Record<string, string> = {
    'favicon.svg': 'image/svg+xml',
    'apple-touch-icon.png': 'image/png',
  }

  return {
    name: 'tracky-site-icons',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.replace(/^\//, '').split('?')[0]
        if (!name || !(name in icons)) return next()
        const file = path.join(siteDir, name)
        if (!existsSync(file)) return next()
        response.setHeader('Content-Type', icons[name])
        createReadStream(file).pipe(response)
      })
    },
    generateBundle() {
      for (const [name, type] of Object.entries(icons)) {
        const file = path.join(siteDir, name)
        if (!existsSync(file)) continue
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(file) })
      }
    },
  }
}

export default defineConfig({
  root: appDir,
  base: './',
  plugins: [nodeNextSourceImports(), siteIcons(), react(), tailwindcss()],
  resolve: {
    alias: { tracky: path.join(repoRoot, 'src', 'index.ts') },
  },
  server: { fs: { allow: [repoRoot] } },
  build: {
    // The app source lives in `app/`; the built page ships with the static site
    // at `playground/dist/`, one level up from the Vite root.
    outDir: path.join(playgroundDir, 'dist'),
    emptyOutDir: true,
  },
})

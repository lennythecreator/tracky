import { createReadStream, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { nodeNextSourceImports } from '../shared/node-next.ts'

const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(playgroundDir, '../..')
const appDir = path.join(playgroundDir, 'app')
const siteDir = path.dirname(playgroundDir)

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

export default defineConfig(({ command }) => ({
  root: appDir,
  // The deployed app is served from `/playground/`; its assets stay in `dist/`.
  base: command === 'serve' ? '/' : '/playground/dist/',
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
}))

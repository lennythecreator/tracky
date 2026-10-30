import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))

/**
 * The SDK and registry sources use NodeNext `.js` specifiers that point at
 * `.ts`/`.tsx` files. Map them back before resolution, as the playground does.
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

export default defineConfig({
  plugins: [nodeNextSourceImports()],
  resolve: {
    // Registry components import the SDK by its package name.
    alias: { tracky: path.join(repoRoot, 'src', 'index.ts') },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
  },
})

import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * The SDK and registry sources use NodeNext `.js` specifiers that point at
 * `.ts`/`.tsx` files. Vite resolves imports literally, so map them back before
 * resolution runs. Shared by the playground and the docs app, which both import
 * registry source directly.
 */
export function nodeNextSourceImports(): Plugin {
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

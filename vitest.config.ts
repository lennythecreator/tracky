import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { nodeNextSourceImports } from './website/shared/node-next.ts'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))

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

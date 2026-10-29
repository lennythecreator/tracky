#!/usr/bin/env node
// Builds the registry payloads that `tracky add` fetches from the repository.
//
// Reads registry/registry.json, rewrites local imports in the source files into
// placeholders the installer substitutes with the consumer's alias, and writes
// one payload per item plus an index under registry/r/.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'registry', 'registry.json')
const outDir = path.join(root, 'registry', 'r')

const baseUrl = (
  process.env.TRACKY_REGISTRY_BASE_URL ??
  'https://raw.githubusercontent.com/lennythecreator/tracky/main/registry/r'
).replace(/\/+$/, '')

const checkOnly = process.argv.includes('--check')

// Local imports become placeholders so the payload carries no repo-specific or
// consumer-specific paths. The installer replaces `@tracky/ui/` with the
// consumer's component alias and `@tracky/lib/` with their shared-file alias.
function rewriteImports(source) {
  const rewritten = source.replace(
    /from (['"])(\.\/[^'"]+)\1/g,
    (_match, quote, specifier) => {
      const base = path.basename(specifier).replace(/\.js$/, '')
      const scope = base === 'utils' ? '@tracky/lib' : '@tracky/ui'
      return `from ${quote}${scope}/${base}${quote}`
    },
  )

  if (/from (['"])\.\.?\//.test(rewritten)) {
    throw new Error('relative import left in payload after rewriting')
  }

  return rewritten
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function buildPayload(item) {
  const files = []

  for (const file of item.files) {
    const raw = await readFile(path.join(root, file.path), 'utf8')
    const source = raw.replace(/\r\n/g, '\n')
    files.push({
      type: item.type,
      path: path.basename(file.path),
      content: rewriteImports(source),
    })
  }

  return serialize({
    schema: 1,
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies ?? [],
    requires: item.requires ?? [],
    files,
  })
}

function buildIndex(manifest) {
  return serialize({
    schema: 1,
    name: manifest.name,
    homepage: manifest.homepage,
    baseUrl,
    items: manifest.items.map((item) => ({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      url: `${baseUrl}/${item.name}.json`,
    })),
  })
}

async function readExisting(fileName) {
  try {
    return await readFile(path.join(outDir, fileName), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const payloads = new Map()
for (const item of manifest.items) {
  payloads.set(`${item.name}.json`, await buildPayload(item))
}
payloads.set('index.json', buildIndex(manifest))

if (checkOnly) {
  const stale = []
  for (const [fileName, expected] of payloads) {
    const actual = await readExisting(fileName)
    if (actual !== expected) stale.push(`registry/r/${fileName}`)
  }

  let existing = []
  try {
    existing = await readdir(outDir)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  for (const fileName of existing) {
    if (fileName.endsWith('.json') && !payloads.has(fileName)) {
      stale.push(`registry/r/${fileName} (no longer an item)`)
    }
  }

  if (stale.length > 0) {
    console.error('Registry payloads are out of date:')
    for (const name of stale) console.error(`  ${name}`)
    console.error('Run `node scripts/build-registry.mjs` and commit the result.')
    process.exit(1)
  }

  console.log(`Registry payloads are current (${payloads.size} files).`)
  process.exit(0)
}

await mkdir(outDir, { recursive: true })
for (const [fileName, content] of payloads) {
  await writeFile(path.join(outDir, fileName), content, 'utf8')
}

for (const fileName of await readdir(outDir)) {
  if (fileName.endsWith('.json') && !payloads.has(fileName)) {
    await rm(path.join(outDir, fileName))
  }
}

console.log(`Wrote ${payloads.size} registry files to registry/r/.`)

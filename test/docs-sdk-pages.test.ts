import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const CONTENT = 'website/docs/app/src/content'
const SDK_PAGES = ['getting-started', 'tracking-events', 'capture-switches', 'event-contract', 'privacy-and-exclusions', 'delivery-and-retries']

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(full)
    return entry.name.endsWith('.mdx') ? [full] : []
  })
}

const pages = markdownFiles(CONTENT)
const content = pages.map((file) => readFileSync(file, 'utf8')).join('\n')
const index = readFileSync('src/index.ts', 'utf8')

/** Every name the root entry exports, including type-only exports. */
function rootExports(source: string): string[] {
  return [...source.matchAll(/export (?:type )?\{([^}]+)\}/g)]
    .flatMap((match) => match[1]!.split(',').map((name) => name.trim().replace(/^type\s+/, '')))
    .filter(Boolean)
}

function constant(source: string, name: string): number {
  const match = new RegExp(`const ${name} = ([\\d_]+)`).exec(source)
  if (!match) throw new Error(`${name} is missing from the source`)
  return Number(match[1]!.replace(/_/g, ''))
}

const client = readFileSync('src/client.ts', 'utf8')

describe('SDK documentation pages', () => {
  it('authors every page in the SDK track', () => {
    for (const page of SDK_PAGES) {
      expect(pages.some((file) => file.endsWith(path.join('sdk', `${page}.mdx`))), page).toBe(true)
    }
  })

  it('names every root export at least once', () => {
    const missing = rootExports(index).filter((name) => !content.includes(name))

    expect(missing).toEqual([])
  })

  it('states the shipped defaults and keeps them equal to the source', () => {
    const delivery = readFileSync(path.join(CONTENT, 'sdk', 'delivery-and-retries.mdx'), 'utf8')

    expect(delivery).toContain(String(constant(client, 'DEFAULT_BATCH_SIZE')))
    expect(delivery).toContain(String(constant(client, 'DEFAULT_FLUSH_INTERVAL_MS')))
    expect(delivery).toContain(String(constant(client, 'DEFAULT_MAX_RETRIES')))
    expect(delivery).toContain(String(constant(client, 'MAX_QUEUE_SIZE').toLocaleString('en-US').replace(/,/g, ',')))
  })

  it('documents every capture switch', () => {
    const switches = readFileSync(path.join(CONTENT, 'sdk', 'capture-switches.mdx'), 'utf8')

    for (const name of ['pageViews', 'clicks', 'formSubmits', 'inputChanges', 'frustrationClicks', 'heatMaps', 'scrollDepth', 'engagement']) {
      expect(switches).toContain(`\`${name}\``)
    }
  })

  it('says at the install step that the package is not published', () => {
    const gettingStarted = readFileSync(path.join(CONTENT, 'sdk', 'getting-started.mdx'), 'utf8')

    expect(gettingStarted).toMatch(/not published yet/i)
  })
})

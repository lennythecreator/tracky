import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { DocsSearchIndex, DocsSearchPage, DocsSearchSection } from '../../shared/docsSearch.ts'
import { readFrontmatter } from './check.ts'
import { folderOf, readMeta, routeFor } from './meta.ts'
import { slugify } from './slug.ts'

/**
 * The budget the docs build enforces. The index holds headings and body text
 * only, so it stays a single small request that the client fetches on first
 * open rather than shipping the page bodies in the bundle.
 */
export const SEARCH_INDEX_MAX_BYTES = 64 * 1024

export interface BuiltSearchIndex {
  index: DocsSearchIndex
  json: string
  bytes: number
}

function markdownFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return markdownFiles(path.join(dir, entry.name), relative)
    return entry.name.endsWith('.mdx') ? [relative] : []
  })
}

function sectionLabel(contentDir: string, folder: string): string {
  const file = path.join(contentDir, folder, 'meta.json')
  try {
    const meta = readMeta(JSON.parse(readFileSync(file, 'utf8')), folder).meta
    return meta?.label ?? (folder || 'Docs')
  } catch {
    return folder || 'Docs'
  }
}

function plain(text: string): string {
  return text
    .replace(/^import\s.+$/gm, ' ')
    // MDX components that only carry props or a source path, never prose.
    .replace(/<(Example|CodeTabs|PropsTable)\b[\s\S]*?\/>/g, ' ')
    .replace(/<\/?[A-Z][\w]*\b[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Headings become sections, so each result can carry its own anchor. */
function sectionsOf(source: string): DocsSearchSection[] {
  const lines = source.split(/\r?\n/)
  const start = lines[0] === '---' ? (lines.indexOf('---', 1) === -1 ? 0 : lines.indexOf('---', 1) + 1) : 0

  const sections: DocsSearchSection[] = [{ heading: '', slug: '', text: '' }]
  let current = sections[0]!
  let fenced = false

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]!
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue

    const heading = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (heading) {
      const text = heading[2]!.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      current = { heading: text, slug: slugify(text), text: '' }
      sections.push(current)
      continue
    }

    current.text += `${line}\n`
  }

  return sections
    .map((section) => ({ ...section, text: plain(section.text) }))
    .filter((section) => section.heading !== '' || section.text !== '')
}

/**
 * Read the authored pages and return the index plus its serialized form. The
 * code fences are dropped before tokenizing and every MDX prop-only component
 * is removed, so an example can never be searched or copied into the payload.
 */
export function buildSearchIndex(contentDir: string, maxBytes = SEARCH_INDEX_MAX_BYTES): BuiltSearchIndex {
  const pages: DocsSearchPage[] = markdownFiles(contentDir)
    .map((relative) => {
      const file = path.join(contentDir, relative)
      const source = readFileSync(file, 'utf8')
      const frontmatter = readFrontmatter(source, file).data

      return {
        route: routeFor(relative),
        title: frontmatter.title ?? relative.replace(/\.mdx$/, ''),
        section: sectionLabel(contentDir, folderOf(relative)),
        description: frontmatter.description ?? '',
        sections: sectionsOf(source),
      }
    })
    .sort((a, b) => a.route.localeCompare(b.route))

  const index: DocsSearchIndex = { pages }
  const json = JSON.stringify(index)
  const bytes = Buffer.byteLength(json, 'utf8')

  if (bytes > maxBytes) {
    throw new Error(`the search index is ${bytes} bytes, over the ${maxBytes}-byte budget.`)
  }

  return { index, json, bytes }
}

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { buildNav, folderOf, readMeta, routeFor, type FolderMeta } from './meta.ts'
import { slugify } from './slug.ts'

/**
 * One reason a page or the content tree breaks the authoring contract. The file
 * is relative to the repository root, so the same message works in a terminal
 * and in CI.
 */
export interface DocProblem {
  file: string
  line: number
  message: string
}

export interface Frontmatter {
  title?: string
  description?: string
  order?: number
  since?: string
  status?: string
}

/** The statuses a page may declare; a page without one is simply current. */
export const STATUSES = ['stable', 'beta', 'unreleased'] as const

export interface Heading {
  text: string
  slug: string
  line: number
  level: number
}

const FIELD = /^([A-Za-z][\w-]*):\s*(.*)$/
const HEADING = /^(#{2,3})\s+(.+?)\s*$/
const FENCE = /^\s*```/
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function bodyStart(source: string): number {
  const lines = source.split(/\r?\n/)
  if (lines[0] !== '---') return 1
  const end = lines.indexOf('---', 1)
  return end === -1 ? 1 : end + 2
}

/** The first line of a page that is not frontmatter, so body lines have real numbers. */
function bodyOf(source: string): { body: string; firstLine: number } {
  const firstLine = bodyStart(source)
  const lines = source.split(/\r?\n/)
  return { body: lines.slice(firstLine - 1).join('\n'), firstLine }
}

/**
 * The frontmatter contract: `title` and `description` are required, `order`
 * numbers a page inside its section, and `since` and `status` describe the API
 * the page documents. Anything else is a typo the author should see now.
 */
export function readFrontmatter(source: string, file: string): { data: Frontmatter; problems: DocProblem[] } {
  const problems: DocProblem[] = []
  const data: Frontmatter = {}
  const lines = source.split(/\r?\n/)

  if (lines[0] !== '---') {
    problems.push({ file, line: 1, message: 'frontmatter is missing; start the page with a --- block.' })
    return { data, problems }
  }

  const end = lines.indexOf('---', 1)
  if (end === -1) {
    problems.push({ file, line: 1, message: 'frontmatter has no closing ---.' })
    return { data, problems }
  }

  for (let index = 1; index < end; index += 1) {
    const line = lines[index]
    if (!line.trim() || line.trimStart().startsWith('#')) continue

    const match = FIELD.exec(line)
    if (!match) {
      problems.push({ file, line: index + 1, message: `"${line.trim()}" is not a key: value pair.` })
      continue
    }

    const [, key, raw] = match
    const value = raw.trim().replace(/^(['"])(.*)\1$/, '$2')

    if (key === 'order') {
      const order = Number(value)
      if (!value || Number.isNaN(order)) problems.push({ file, line: index + 1, message: 'order must be a number.' })
      else data.order = order
      continue
    }

    if (key === 'title' || key === 'description' || key === 'since' || key === 'status') {
      if (!value) problems.push({ file, line: index + 1, message: `${key} is empty.` })
      else data[key] = value
      continue
    }

    problems.push({ file, line: index + 1, message: `"${key}" is not part of the frontmatter contract.` })
  }

  if (!data.title) problems.push({ file, line: 1, message: 'frontmatter is missing a title.' })
  if (!data.description) problems.push({ file, line: 1, message: 'frontmatter is missing a description.' })
  if (data.status && !STATUSES.includes(data.status as (typeof STATUSES)[number])) {
    problems.push({ file, line: 1, message: `status "${data.status}" is not one of ${STATUSES.join(', ')}.` })
  }

  return { data, problems }
}

/** The `##` and `###` headings the on-this-page list builds, with their lines. */
export function readHeadings(source: string, firstLine: number): Heading[] {
  const headings: Heading[] = []
  let fenced = false

  source.split(/\r?\n/).forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced
      return
    }
    if (fenced) return

    const match = HEADING.exec(line)
    if (!match) return

    const text = match[2]
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    headings.push({ text, slug: slugify(text), line: firstLine + index, level: match[1].length })
  })

  return headings
}

/** Markdown links, skipping fenced code so an example cannot look like a link. */
export function readLinks(source: string, firstLine: number): { target: string; line: number }[] {
  const links: { target: string; line: number }[] = []
  let fenced = false

  source.split(/\r?\n/).forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced
      return
    }
    if (fenced) return

    for (const match of line.matchAll(LINK)) {
      links.push({ target: match[1], line: firstLine + index })
    }
  })

  return links
}

function contentFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return contentFiles(path.join(dir, entry.name), relative)
    return entry.name.endsWith('.mdx') ? [relative] : []
  })
}

function contentFolders(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return []
  const folders = existsSync(path.join(dir, 'meta.json')) ? [prefix] : []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    folders.push(...contentFolders(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name))
  }
  return folders
}

function label(repoRoot: string, file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join('/')
}

/** The file a navigation problem is about, so the message points somewhere. */
function navProblem(message: string, repoRoot: string, contentDir: string): DocProblem {
  const named = message.match(/^content\/(\S+?)\.mdx|^content\/(\S+?meta\.json)/)
  const relative = named ? `content/${named[1] ? `${named[1]}.mdx` : named[2]}` : 'content'
  return { file: label(repoRoot, path.join(contentDir, relative.replace(/^content\/?/, ''))), line: 1, message }
}

interface ReadPage {
  route: string
  file: string
  headings: Heading[]
  links: { target: string; line: number }[]
}

/**
 * Check the content tree offline: frontmatter, authored order, one anchor per
 * heading, and internal links that resolve to a page and, when they carry one,
 * to a heading on that page. The docs build runs this too, so a broken tree
 * never renders.
 */
export function checkDocs(contentDir: string, repoRoot: string): DocProblem[] {
  const problems: DocProblem[] = []
  const folders: Record<string, FolderMeta> = {}

  for (const folder of contentFolders(contentDir)) {
    const file = folder ? path.join(contentDir, folder, 'meta.json') : path.join(contentDir, 'meta.json')
    let value: unknown
    try {
      value = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      problems.push({ file: label(repoRoot, file), line: 1, message: `is not valid JSON: ${(error as Error).message}` })
      continue
    }
    const read = readMeta(value, folder)
    for (const message of read.problems) problems.push({ file: label(repoRoot, file), line: 1, message })
    if (read.meta) folders[folder] = read.meta
  }

  const files = contentFiles(contentDir)
  const nav = buildNav(files, folders)
  for (const message of nav.problems) problems.push(navProblem(message, repoRoot, contentDir))

  const routes = new Set(nav.sections.flatMap((section) => section.pages.map((page) => page.route)))
  const slugs = new Map<string, Set<string>>()
  const pages: ReadPage[] = []

  for (const relative of files) {
    const file = path.join(contentDir, relative)
    const source = readFileSync(file, 'utf8')
    const where = label(repoRoot, file)
    const route = routeFor(relative)

    const frontmatter = readFrontmatter(source, where)
    problems.push(...frontmatter.problems)

    const { body, firstLine } = bodyOf(source)
    const headings = readHeadings(body, firstLine)

    const seen = new Map<string, number>()
    for (const heading of headings) {
      const first = seen.get(heading.slug)
      if (first !== undefined) {
        problems.push({
          file: where,
          line: heading.line,
          message: `heading "${heading.text}" repeats the anchor #${heading.slug} first used on line ${first}; add a distinguishing word.`,
        })
      } else {
        seen.set(heading.slug, heading.line)
      }
    }

    slugs.set(route, new Set(seen.keys()))
    pages.push({ route, file: where, headings, links: readLinks(body, firstLine) })
  }

  for (const page of pages) {
    for (const link of page.links) {
      const target = link.target
      if (/^[a-z]+:/i.test(target) || target.startsWith('//')) continue

      const [pathPart, hash] = target.split('#')
      const route = pathPart ? (pathPart.replace(/\/+$/, '') || '/') : page.route

      if (pathPart && !pathPart.startsWith('/')) {
        problems.push({ file: page.file, line: link.line, message: `link "${target}" must start with / or #.` })
        continue
      }
      if (!routes.has(route)) {
        problems.push({ file: page.file, line: link.line, message: `no page is authored at ${route}.` })
        continue
      }
      if (hash && !slugs.get(route)?.has(hash)) {
        problems.push({ file: page.file, line: link.line, message: `no heading "${hash}" on ${route}.` })
      }
    }
  }

  return problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/** Pages in the tree, for the checker's success line. */
export function countPages(contentDir: string): number {
  return contentFiles(contentDir).length
}

/** The folder names, exported so the script can name what it checked. */
export { contentFolders, folderOf }

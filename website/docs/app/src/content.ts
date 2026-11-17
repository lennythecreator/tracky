import type { ComponentType } from 'react'
import { buildNav, folderOf, readMeta, routeFor, type FolderMeta } from '../../shared/meta'

export interface PageFrontmatter {
  title: string
  description: string
  order?: number
}

interface MdxModule {
  default: ComponentType
  frontmatter?: PageFrontmatter
}

const pageModules = import.meta.glob<MdxModule>('./content/**/*.mdx', { eager: true })
const metaModules = import.meta.glob<{ default: unknown }>('./content/**/meta.json', { eager: true })

const relative = (key: string) => key.replace(/^\.\/content\//, '')

const folders: Record<string, FolderMeta> = {}
const problems: string[] = []

for (const [key, module] of Object.entries(metaModules)) {
  const folder = key.replace(/^\.\/content\/?/, '').replace(/\/?meta\.json$/, '')
  const read = readMeta(module.default, folder)
  problems.push(...read.problems)
  if (read.meta) folders[folder] = read.meta
}

const nav = buildNav(Object.keys(pageModules).map(relative), folders)
problems.push(...nav.problems)

// The build fails on these first, in `vite.config.ts`. This runs in dev, and in
// a build that skipped the plugin, so a broken content tree never renders.
if (problems.length > 0) {
  throw new Error(`Tracky docs content is not valid:\n  ${problems.join('\n  ')}`)
}

export interface DocsPage {
  path: string
  route: string
  title: string
  description: string
  order?: number
  Component: ComponentType
}

export interface DocsSection {
  folder: string
  label: string
  pages: DocsPage[]
}

function pageFor(path: string): DocsPage | null {
  const module = pageModules[`./content/${path}`]
  if (!module) return null
  const frontmatter = module.frontmatter
  return {
    path,
    route: routeFor(path),
    title: frontmatter?.title ?? path,
    description: frontmatter?.description ?? '',
    order: frontmatter?.order,
    Component: module.default,
  }
}

/**
 * Pages in authored order: the folder meta decides which section a page belongs
 * to and the section order; `frontmatter.order` decides the order inside a
 * section, falling back to the order in `meta.json`.
 */
export const sections: DocsSection[] = nav.sections.map((section) => {
  const pages = section.pages
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const orderA = pageFor(a.entry.path)?.order ?? Number.MAX_SAFE_INTEGER
      const orderB = pageFor(b.entry.path)?.order ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB || a.index - b.index
    })
    .map(({ entry }) => pageFor(entry.path))
    .filter((page): page is DocsPage => page !== null)

  return { folder: section.folder, label: section.label, pages }
})

export const flatPages = sections.flatMap((section) => section.pages)
export const pagesByRoute = new Map(flatPages.map((page) => [page.route, page]))

/** The section a page belongs to, for the small label above the title. */
export function sectionFor(page: DocsPage): DocsSection | undefined {
  return sections.find((section) => section.pages.includes(page))
}



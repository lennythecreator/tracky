/**
 * Content structure shared by the docs app and its Vite config, so the build
 * and the running app agree on what a page is and what counts as valid.
 */

export interface FolderMeta {
  label?: string
  order?: number
  pages: string[]
}

export interface NavEntry {
  /** Path relative to the content root, such as `guides/capture-switches.mdx`. */
  path: string
  route: string
}

export interface NavSectionResult {
  folder: string
  label: string
  pages: NavEntry[]
}

export interface NavResult {
  sections: NavSectionResult[]
  problems: string[]
}

/** `index.mdx` is `/`, `guides/capture-switches.mdx` is `/guides/capture-switches`. */
export function routeFor(path: string): string {
  const segments = path.replace(/\.mdx$/, '').split('/')
  if (segments[segments.length - 1] === 'index') segments.pop()
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/'
}

/** `guides/capture-switches.mdx` is in `guides`; `index.mdx` is at the root. */
export function folderOf(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

/** `guides/capture-switches.mdx` is `capture-switches`. */
export function idOf(path: string): string {
  const folder = folderOf(path)
  return path.slice(folder ? folder.length + 1 : 0).replace(/\.mdx$/, '')
}

/** The meta file for a folder: `content/guides/meta.json`, or `content/meta.json`. */
export function metaPath(folder: string): string {
  return folder ? `content/${folder}/meta.json` : 'content/meta.json'
}

/** Check one parsed `meta.json` before it reaches the navigation. */
export function readMeta(value: unknown, folder: string): { meta?: FolderMeta; problems: string[] } {
  const where = metaPath(folder)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { problems: [`${where} must be an object with a pages array.`] }
  }

  const record = value as { label?: unknown; order?: unknown; pages?: unknown }
  if (!Array.isArray(record.pages) || record.pages.some((page) => typeof page !== 'string')) {
    return { problems: [`${where} must list pages as an array of ids.`] }
  }
  if (record.label !== undefined && typeof record.label !== 'string') {
    return { problems: [`${where} has a label that is not a string.`] }
  }
  if (record.order !== undefined && typeof record.order !== 'number') {
    return { problems: [`${where} has an order that is not a number.`] }
  }

  return {
    meta: { label: record.label as string | undefined, order: record.order as number | undefined, pages: record.pages as string[] },
    problems: [],
  }
}

/**
 * Build the authored navigation from the content files and their folder meta.
 * Every page must be listed exactly once, every listed page must exist, and the
 * root section comes first with the other sections by `order`.
 */
export function buildNav(files: string[], folders: Record<string, FolderMeta>): NavResult {
  const problems: string[] = []
  const pages = files.filter((file) => file.endsWith('.mdx'))

  for (const file of pages) {
    const folder = folderOf(file)
    if (!folders[folder]) {
      problems.push(`content/${file} has no ${metaPath(folder)}.`)
      continue
    }
    if (!folders[folder].pages.includes(idOf(file))) {
      problems.push(`content/${file} is not listed in ${metaPath(folder)}.`)
    }
  }

  const folderNames = [...new Set([...Object.keys(folders), ...pages.map(folderOf)])].sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    const orderA = folders[a]?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = folders[b]?.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB || a.localeCompare(b)
  })

  const sections: NavSectionResult[] = []
  for (const folder of folderNames) {
    const meta = folders[folder]
    if (!meta) continue

    const seen = new Set<string>()
    for (const id of meta.pages) {
      if (seen.has(id)) problems.push(`${metaPath(folder)} lists "${id}" more than once.`)
      seen.add(id)
    }

    const entries = meta.pages.map((id) => ({ id, path: folder ? `${folder}/${id}.mdx` : `${id}.mdx` }))
    for (const entry of entries) {
      if (!pages.includes(entry.path)) {
        problems.push(`${metaPath(folder)} lists "${entry.id}", but content/${entry.path} does not exist.`)
      }
    }

    sections.push({
      folder,
      label: meta.label ?? (folder === '' ? 'Docs' : folder),
      pages: entries.map((entry) => ({ path: entry.path, route: routeFor(entry.path) })),
    })
  }

  return { sections, problems }
}

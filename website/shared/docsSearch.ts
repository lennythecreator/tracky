/**
 * Search data and matching shared by the docs build and the docs app, so the
 * matcher is tested once and the client bundle never imports the index builder.
 */

export interface DocsSearchSection {
  /** The `##` or `###` text; empty for the text before the first heading. */
  heading: string
  /** The anchor the heading renders with; empty for the page intro. */
  slug: string
  text: string
}

export interface DocsSearchPage {
  route: string
  title: string
  section: string
  description: string
  sections: DocsSearchSection[]
}

export interface DocsSearchIndex {
  pages: DocsSearchPage[]
}

export interface DocsSearchHit {
  heading: string
  slug: string
  snippet: string
}

export interface DocsSearchGroup {
  route: string
  title: string
  section: string
  hits: DocsSearchHit[]
}

const SNIPPET_BEFORE = 50
const SNIPPET_LENGTH = 90
const HITS_PER_PAGE = 3

/** A short window around the first token that matches, with no raw markup. */
function snippet(text: string, tokens: string[]): string {
  const lower = text.toLowerCase()
  let at = -1

  for (const token of tokens) {
    const index = lower.indexOf(token)
    if (index !== -1 && (at === -1 || index < at)) at = index
  }

  if (at === -1) {
    return text.length > SNIPPET_LENGTH * 2
      ? `${text.slice(0, SNIPPET_LENGTH * 2).trimEnd()}…`
      : text.trim()
  }

  const start = Math.max(0, at - SNIPPET_BEFORE)
  const end = Math.min(text.length, at + SNIPPET_LENGTH)

  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

/**
 * Match a query against each heading's own text, so a term that appears only
 * under a subheading returns that subheading's anchor. Every token must appear
 * in the section; a page-level match falls back to the page top.
 */
export function searchDocs(index: DocsSearchIndex, rawQuery: string, maxGroups = 12): DocsSearchGroup[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []

  const tokens = [...new Set(query.split(/\s+/).filter(Boolean))]
  const scored: { group: DocsSearchGroup; score: number }[] = []

  for (const page of index.pages) {
    const hits: { hit: DocsSearchHit; score: number }[] = []

    for (const section of page.sections) {
      const heading = section.heading.toLowerCase()
      const text = section.text.toLowerCase()
      const haystack = `${heading} ${text}`

      if (!tokens.every((token) => haystack.includes(token))) continue

      const score =
        (heading.includes(query) ? 100 : 0) +
        (heading.includes(tokens[0]!) ? 10 : 0) +
        (text.includes(query) ? 5 : 0)

      hits.push({ hit: { heading: section.heading, slug: section.slug, snippet: snippet(section.text, tokens) }, score })
    }

    if (hits.length === 0) {
      const pageText = `${page.title} ${page.description}`.toLowerCase()
      if (tokens.every((token) => pageText.includes(token))) {
        hits.push({ hit: { heading: '', slug: '', snippet: page.description }, score: 1 })
      }
    }

    if (hits.length === 0) continue

    hits.sort((a, b) => b.score - a.score)
    scored.push({
      group: {
        route: page.route,
        title: page.title,
        section: page.section,
        hits: hits.slice(0, HITS_PER_PAGE).map(({ hit }) => hit),
      },
      score: hits[0]!.score,
    })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.group.title.localeCompare(b.group.title))
    .slice(0, maxGroups)
    .map(({ group }) => group)
}

/** The number of results a grouped list contains, for the live announcement. */
export function countHits(groups: DocsSearchGroup[]): number {
  return groups.reduce((total, group) => total + group.hits.length, 0)
}

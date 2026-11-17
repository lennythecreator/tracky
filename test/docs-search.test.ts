import { describe, expect, it } from 'vitest'
import { SEARCH_INDEX_MAX_BYTES, buildSearchIndex } from '../website/docs/shared/search-index.js'
import { countHits, searchDocs } from '../website/shared/docsSearch.js'

const CONTENT = 'website/docs/app/src/content'
const built = buildSearchIndex(CONTENT)

describe('docs search index', () => {
  it('stays within the size budget it enforces', () => {
    expect(built.bytes).toBeLessThanOrEqual(SEARCH_INDEX_MAX_BYTES)
    expect(() => buildSearchIndex(CONTENT, 10)).toThrow(/over the 10-byte budget/)
  })

  it('leaves code fences and prop-only components out of the payload', () => {
    expect(built.json).not.toContain('npx tracky add')
    expect(built.json).not.toContain('import { AnalyticsProvider }')
    expect(built.json).not.toContain('<Example')
    expect(built.json).not.toContain('<PropsTable')
  })

  it('indexes every authored page with its section label', () => {
    const routes = built.index.pages.map((page) => page.route)

    expect(routes).toContain('/')
    expect(routes).toContain('/sdk/getting-started')
    expect(routes).toContain('/components/button')
    expect(built.index.pages.find((page) => page.route === '/components/button')?.section).toBe('Components')
  })
})

describe('docs search matching', () => {
  it('returns the subheading anchor for a term that appears only below it', () => {
    const groups = searchDocs(built.index, 'cookiebot')

    expect(groups[0]?.route).toBe('/sdk/privacy-and-exclusions')
    expect(groups[0]?.hits[0]?.heading).toBe('Consent')
    expect(groups[0]?.hits[0]?.slug).toBe('consent')
  })

  it('groups results by page and reports a count', () => {
    const groups = searchDocs(built.index, 'heat map')
    const routes = groups.map((group) => group.route)

    expect(routes).toContain('/sdk/capture-switches')
    expect(countHits(groups)).toBeGreaterThan(0)
  })

  it('requires every token to appear in the same section', () => {
    expect(searchDocs(built.index, 'cookiebot engagement')).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(searchDocs(built.index, '   ')).toEqual([])
  })

  it('keeps a snippet short and free of markup', () => {
    const [group] = searchDocs(built.index, 'cookiebot')
    const snippet = group?.hits[0]?.snippet ?? ''

    expect(snippet.toLowerCase()).toContain('cookiebot')
    expect(snippet.length).toBeLessThanOrEqual(150)
    expect(snippet).not.toMatch(/<[A-Z]|\]\(/)
  })
})

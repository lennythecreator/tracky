import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildNav, readMeta } from '../website/docs/shared/meta.js'

const folders = (pages: string[]) => ({ '': { label: 'Introduction', pages } })

describe('docs content structure', () => {
  it('names a page that is missing from its meta file', () => {
    const { problems } = buildNav(['index.mdx', 'not-listed.mdx'], folders(['index']))

    expect(problems).toEqual(['content/not-listed.mdx is not listed in content/meta.json.'])
  })

  it('names a listed page that has no file', () => {
    const { problems } = buildNav(['index.mdx'], folders(['index', 'missing']))

    expect(problems).toEqual(['content/meta.json lists "missing", but content/missing.mdx does not exist.'])
  })

  it('sorts the root section first and the others by order', () => {
    const { sections, problems } = buildNav(
      ['index.mdx', 'guides/capture.mdx', 'reference/events.mdx'],
      {
        '': { label: 'Introduction', pages: ['index'] },
        reference: { label: 'Reference', order: 2, pages: ['events'] },
        guides: { label: 'Guides', order: 1, pages: ['capture'] },
      },
    )

    expect(problems).toEqual([])
    expect(sections.map((section) => [section.label, section.pages.map((page) => page.route)])).toEqual([
      ['Introduction', ['/']],
      ['Guides', ['/guides/capture']],
      ['Reference', ['/reference/events']],
    ])
  })

  it('rejects a meta file that lists a page twice', () => {
    const { problems } = buildNav(['index.mdx'], folders(['index', 'index']))

    expect(problems).toContain('content/meta.json lists "index" more than once.')
  })

  it('rejects a meta file without a pages array', () => {
    expect(readMeta({ label: 'Guides' }, 'guides').problems).toEqual([
      'content/guides/meta.json must list pages as an array of ids.',
    ])
  })
})

describe('docs app', () => {
  it('mounts no analytics provider and sends no request', () => {
    for (const file of ['App.tsx', 'CodeBlock.tsx', 'highlight.ts', 'main.tsx', 'content.ts', 'router.ts', 'Toc.tsx']) {
      const source = readFileSync(`website/docs/app/src/${file}`, 'utf8')
      expect(source).not.toMatch(/from 'tracky'|AnalyticsProvider|useAnalytics|fetch\(|XMLHttpRequest|sendBeacon/)
    }
  })
})

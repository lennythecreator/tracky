import { describe, expect, it } from 'vitest'
import { highlight } from '../website/docs/app/src/highlight.js'

const text = (source: string, language: string) =>
  highlight(source, language)
    .map((token) => token.text)
    .join('')

/** Every token that carries a kind the docs style; `plain` and `punct` are uncolored. */
const kinds = (source: string, language: string) =>
  highlight(source, language)
    .filter((token) => token.kind !== 'plain' && token.kind !== 'punct')
    .map((token) => `${token.kind}:${token.text}`)

describe('docs code highlight', () => {
  it('reproduces the source exactly for every supported language', () => {
    const tsx = `export function App() {\n  return <p title="a">hello</p> // done\n}\n`
    const html = `<section data-analytics="ignore">\n  <BillingForm />\n</section>\n`
    const shell = `npm install tracky # once\n`

    expect(text(tsx, 'tsx')).toBe(tsx)
    expect(text(html, 'html')).toBe(html)
    expect(text(shell, 'sh')).toBe(shell)
  })

  it('separates keywords, strings, and comments', () => {
    expect(kinds(`const plan = 'team' // note`, 'tsx')).toEqual([
      'keyword:const',
      "string:'team'",
      'comment:// note',
    ])
  })

  it('names the JSX tag and keeps attributes as their own token', () => {
    expect(kinds(`<AnalyticsProvider endpoint="/api/events" />`, 'tsx')).toEqual([
      'tag:AnalyticsProvider',
      'attr:endpoint',
      'string:"/api/events"',
    ])
  })

  it('keeps highlighting inside a JSX attribute expression', () => {
    expect(kinds(`<A options={{ pageViews: true }} />`, 'tsx')).toEqual([
      'tag:A',
      'attr:options',
      'literal:true',
    ])
  })

  it('colors HTML attributes and markup comments', () => {
    expect(kinds(`<!-- billing -->\n<section data-analytics="ignore">`, 'html')).toEqual([
      'comment:<!-- billing -->',
      'tag:section',
      'attr:data',
      'attr:analytics',
      'string:"ignore"',
    ])
  })

  it('treats the first shell word as the command', () => {
    expect(kinds(`npm install tracky --save`, 'sh')).toEqual([
      'keyword:npm',
      'attr:--save',
    ])
  })

  it('renders an unknown language as one plain token', () => {
    expect(highlight('a < b', 'rust')).toEqual([{ text: 'a < b', kind: 'plain' }])
    expect(highlight('no language')).toEqual([{ text: 'no language', kind: 'plain' }])
  })
})

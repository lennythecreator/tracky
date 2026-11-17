import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('website/styles.css', 'utf8')
const rootStart = css.indexOf(':root {')
const rootEnd = css.indexOf('}', rootStart)
const root = css.slice(rootStart, rootEnd)
const rest = css.slice(rootEnd + 1)

const tokens = new Map<string, string>()
for (const match of root.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
  tokens.set(match[1]!, match[2]!.trim())
}

/** Follow var(--name) until a literal value, so semantic tokens resolve. */
function value(name: string): string {
  let current = tokens.get(name)
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const reference = /^var\(--([\w-]+)\)$/.exec(current)
    if (!reference) break
    current = tokens.get(reference[1]!)
  }
  if (!current) throw new Error(`token --${name} is missing`)
  return current
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(value(foreground)), luminance(value(background))].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

describe('landing visual tokens', () => {
  it('keeps every colour outside the token block on a named token', () => {
    expect(rest).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('uses the type scale for every font size and line height', () => {
    const offScale = (property: string, prefix: string) =>
      [...rest.matchAll(new RegExp(`${property}:\\s*([^;]+);`, 'g'))]
        .map((match) => match[1]!.trim())
        .filter((value) => !value.startsWith(prefix))

    expect(offScale('font-size', 'var(--text-')).toEqual([])
    expect(offScale('line-height', 'var(--leading-')).toEqual([])
  })

  it('keeps muted text at AA on white, tinted, pale, and dark surfaces', () => {
    const pairs: [string, string, string][] = [
      ['body text on white', 'text', 'surface'],
      ['muted text on white', 'text-muted', 'surface'],
      ['soft text on white', 'text-soft', 'surface'],
      ['muted text on the tinted band', 'text-muted', 'surface-tint'],
      ['soft text on the tinted band', 'text-soft', 'surface-tint'],
      ['soft text on the pale band', 'text-soft', 'surface-pale'],
      ['soft text in the footer', 'text-soft', 'surface-footer'],
      ['link text on white', 'accent', 'surface'],
      ['link text on the tinted band', 'accent', 'surface-tint'],
      ['primary button label', 'white', 'sky-700'],
      ['primary button hover label', 'white', 'sky-800'],
      ['signal heading on the code surface', 'signal-heading', 'surface-code'],
      ['signal title on the code surface', 'signal-title', 'surface-code'],
      ['signal body on the code surface', 'signal-text', 'surface-code'],
      ['signal meta on the code surface', 'signal-meta', 'surface-code'],
    ]

    const failures = pairs
      .map(([label, foreground, background]) => ({ label, ratio: contrast(foreground, background) }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ label, ratio }) => `${label}: ${ratio.toFixed(2)}:1`)

    expect(failures).toEqual([])
  })

  it('keeps the focus ring visible on white and tinted surfaces', () => {
    expect(contrast('sky-600', 'surface')).toBeGreaterThanOrEqual(3)
    expect(contrast('sky-600', 'surface-tint')).toBeGreaterThanOrEqual(3)
  })
})

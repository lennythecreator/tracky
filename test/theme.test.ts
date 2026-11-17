import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  isTheme,
  readStoredTheme,
  readTheme,
  resolveTheme,
  storeTheme,
  toggleTheme,
} from '../website/docs/app/src/theme.js'

describe('docs theme choice', () => {
  it('lets a stored choice win over the system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('uses the system preference when nothing valid is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme('sepia', true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(isTheme('sepia')).toBe(false)
  })

  it('treats storage failures as no choice and does not throw', () => {
    const broken = {
      getItem() {
        throw new Error('storage is blocked')
      },
    }

    expect(readStoredTheme(broken)).toBeNull()
    expect(storeTheme('dark', { setItem() { throw new Error('quota') } })).toBe(false)
  })

  it('reads and writes the scheme without touching page content', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    }

    expect(storeTheme('dark', storage)).toBe(true)
    expect(readStoredTheme(storage)).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
    expect(toggleTheme('light')).toBe('dark')
  })
})

describe('docs theme application', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('applies the attribute the stylesheet keys off, and reads it back first', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(readTheme()).toBe('dark')

    applyTheme('light')
    expect(readTheme()).toBe('light')
  })
})

/** Relative luminance from an sRGB hex colour, per WCAG 2.2. */
function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

function tokens(source: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(source)?.[1] ?? ''
  const found: Record<string, string> = {}

  for (const match of block.matchAll(/--tracky-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    found[match[1]!] = match[2]!
  }

  return found
}

const registry = readFileSync('registry/theme/tokens.css', 'utf8')
const docs = readFileSync('website/docs/app/src/docs.css', 'utf8')

const light = { ...tokens(registry, ':root'), ...tokens(docs, ':root') }
const dark = { ...light, ...tokens(docs, "[data-theme='dark']") }

const TEXT_PAIRS: [key: string, foreground: string, background: string][] = [
  ['body text', 'foreground', 'background'],
  ['muted text', 'muted-foreground', 'background'],
  ['muted text on the muted surface', 'muted-foreground', 'muted'],
  ['muted text on the secondary surface', 'muted-foreground', 'secondary'],
  ['code text', 'foreground', 'muted'],
  ['link text', 'primary', 'background'],
  ['primary button label', 'primary-foreground', 'primary'],
  ['secondary button label', 'secondary-foreground', 'secondary'],
  ['error text', 'destructive', 'background'],
]

describe('docs theme contrast', () => {
  for (const [theme, values] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it(`keeps every text pair at WCAG AA in the ${theme} theme`, () => {
      const failures: string[] = []

      for (const [label, foreground, background] of TEXT_PAIRS) {
        const ratio = contrast(values[foreground]!, values[background]!)
        if (ratio < 4.5) failures.push(`${label}: ${ratio.toFixed(2)}:1`)
      }

      expect(failures).toEqual([])
    })

    it(`keeps the focus ring at 3:1 against both surfaces in the ${theme} theme`, () => {
      for (const surface of ['background', 'muted']) {
        expect(contrast(values.ring!, values[surface]!), `ring on ${surface}`).toBeGreaterThanOrEqual(3)
      }
    })
  }

  it('defines the dark scheme with the registry token names, not new ones', () => {
    const darkOnly = tokens(docs, "[data-theme='dark']")
    expect(Object.keys(darkOnly).length).toBeGreaterThan(10)
    expect(Object.keys(darkOnly).every((name) => name in light)).toBe(true)
  })
})

// @vitest-environment node
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer, { type Browser, type LaunchOptions, type Page } from 'puppeteer-core'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'

/**
 * Keyboard behavior needs a real browser: jsdom has no sequential focus
 * navigation, no native `<select>` keys, and no computed focus styles. This
 * check drives the playground in the locally installed Chrome, so it covers
 * the claims BACKLOG.md records for T-005 without downloading a browser.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLAYGROUND_CONFIG = path.join(repoRoot, 'website', 'playground', 'vite.config.ts')
const SAMPLE_TIME = 'example'

let server: ViteDevServer
let browser: Browser
let page: Page
let url: string
/** Tab stops in document order, as described when the page loaded. */
let stops: string[]

/** Ask the OS for a free port so parallel runs cannot collide. */
async function freePort(): Promise<number> {
  const probe = createNetServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const { port } = probe.address() as AddressInfo
  await new Promise<void>((resolve) => probe.close(() => resolve()))

  return port
}

/**
 * Label every element a keyboard user can reach, in document order, and store
 * the labels on the page so later assertions can name what has focus.
 */
function describeStops(): string[] {
  const SELECTOR =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]'

  const describe = (el: HTMLElement): string => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const type = el.getAttribute('type')
    const role = el.getAttribute('role')
    const associated = (el as HTMLInputElement).labels?.[0]?.textContent ?? ''
    // `||`, not `??`: an element without a <label> reports `associated` as `''`.
    const text = (el.getAttribute('aria-label') || associated || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 48)

    return `${tag}${id}${type ? `[${type}]` : ''}${role ? `{${role}}` : ''}:${text}`
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
    if ((el as HTMLButtonElement).disabled) return false
    if (el.getAttribute('tabindex') === '-1') return false
    // `display: none` content has no client rects and cannot take focus.
    if (el.getClientRects().length === 0) return false
    return true
  })

  const labels = candidates.map(describe)
  ;(window as unknown as { __kbStops?: string[] }).__kbStops = labels
  candidates.forEach((el, index) => el.setAttribute('data-kb-stop', String(index)))

  return labels
}

/** The labelled tab stop that currently has focus, if any. */
async function activeStop(target: Page): Promise<{ index: number; label: string } | null> {
  return target.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return null

    const raw = el.getAttribute('data-kb-stop')
    const index = raw === null ? -1 : Number(raw)
    const labels = (window as unknown as { __kbStops?: string[] }).__kbStops ?? []

    return { index, label: labels[index] ?? `untracked:${el.tagName.toLowerCase()}` }
  })
}

/** Tab forward until a stop matching `match` has focus. */
async function tabTo(target: Page, description: string, match: (label: string) => boolean): Promise<void> {
  for (let step = 0; step < stops.length + 5; step += 1) {
    await target.keyboard.press('Tab')
    const stop = await activeStop(target)

    if (stop && match(stop.label)) return
  }

  throw new Error(`Tab never reached ${description}`)
}

/** Number of real events in the preview; the sample entry is not counted. */
async function eventCount(target: Page): Promise<number> {
  return target.evaluate(() => {
    const badge = document.querySelector('#event-preview-title + span')

    return Number((badge?.textContent ?? '0').trim())
  })
}

/** Wait until the newest real event in the preview has the given title. */
async function waitForNewestEvent(target: Page, title: string): Promise<void> {
  await target.waitForFunction(
    (expected: string) => {
      const entries = Array.from(document.querySelectorAll('ol[aria-live="polite"] li'))
      const newest = entries.find(
        (entry) => (entry.querySelector('time')?.textContent ?? '').trim() !== 'example',
      )

      return (newest?.querySelector('div span')?.textContent ?? '').trim() === expected
    },
    { timeout: 5_000 },
    title,
  )
}

async function waitForEventCount(target: Page, count: number): Promise<void> {
  await target.waitForFunction(
    (expected: number) =>
      Number((document.querySelector('#event-preview-title + span')?.textContent ?? '0').trim()) ===
      expected,
    { timeout: 5_000 },
    count,
  )
}

beforeAll(async () => {
  const port = await freePort()

  server = await createServer({
    configFile: PLAYGROUND_CONFIG,
    root: path.join(repoRoot, 'website', 'playground', 'app'),
    server: { host: '127.0.0.1', port, strictPort: true },
    logLevel: 'error',
  })
  await server.listen()
  url = `http://127.0.0.1:${port}/`

  const launchOptions: LaunchOptions = process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, headless: true }
    : { channel: 'chrome', headless: true }

  try {
    browser = await puppeteer.launch(launchOptions)
  } catch (error) {
    throw new Error(
      'The keyboard check drives a local Chrome. Install Google Chrome or set CHROME_PATH to a Chrome or Chromium binary. ' +
        String(error),
    )
  }
}, 120_000)

beforeEach(async () => {
  page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('article#button')

  stops = await page.evaluate(describeStops)
})

afterEach(async () => {
  await page.close()
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
}, 60_000)

describe('playground keyboard navigation', () => {
  it('reaches every tab stop once, in document order', async () => {
    expect(stops.length).toBeGreaterThan(30)

    const observed: string[] = []
    for (let index = 0; index < stops.length; index += 1) {
      await page.keyboard.press('Tab')
      observed.push((await activeStop(page))?.label ?? 'body')
    }

    expect(observed).toEqual(stops)
  })

  it('skips disabled controls', async () => {
    const focused: string[] = []
    for (let index = 0; index < stops.length; index += 1) {
      await page.keyboard.press('Tab')
      const stop = await activeStop(page)
      if (stop) focused.push(stop.label)
    }

    expect(focused.filter((label) => label.startsWith('untracked:'))).toEqual([])
    expect(focused.some((label) => label.includes('Disabled'))).toBe(false)

    // Even a programmatic focus call cannot reach a disabled control.
    const reachable = await page.evaluate(() => {
      const offenders: string[] = []
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('[disabled]'))) {
        el.focus()
        if (document.activeElement === el) offenders.push(el.outerHTML.slice(0, 80))
      }
      ;(document.activeElement as HTMLElement | null)?.blur()

      return offenders
    })

    expect(reachable).toEqual([])
  })

  it('shows a focus indicator on every stop it reaches', async () => {
    // `outline-width` alone is not an indicator: Chrome changes it on focus even
    // when `outline-style` stays `none` and no ring is drawn.
    const unfocused = await page.evaluate(() => {
      const signature = (el: HTMLElement) => {
        const style = getComputedStyle(el)

        return `${style.boxShadow}|${style.outlineStyle}|${style.outlineColor}`
      }

      return Array.from(document.querySelectorAll<HTMLElement>('[data-kb-stop]')).map(signature)
    })

    for (let index = 0; index < unfocused.length; index += 1) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return null

        const style = getComputedStyle(el)

        return {
          index: Number(el.getAttribute('data-kb-stop')),
          style: `${style.boxShadow}|${style.outlineStyle}|${style.outlineColor}`,
        }
      })

      expect(stop?.index).toBe(index)
      expect(stop?.style, `focus indicator on ${stops[index]}`).not.toBe(unfocused[index])
      expect(stop?.style, `visible focus indicator on ${stops[index]}`).not.toMatch(/^none\|none\|/)
    }
  })

  it('activates Button with Enter and Space', async () => {
    await tabTo(page, 'the Primary button', (label) => label === 'button[button]:Primary')
    const before = await eventCount(page)

    await page.keyboard.press('Enter')
    await waitForNewestEvent(page, 'button · activate')

    await page.keyboard.press('Space')
    await waitForEventCount(page, before + 2)
    await waitForNewestEvent(page, 'button · activate')
  })

  it('toggles Checkbox and Switch with Space', async () => {
    await tabTo(page, 'the weekly email checkbox', (label) =>
      label.includes('input[checkbox]') && label.includes('Weekly product email'),
    )

    await page.keyboard.press('Space')
    await waitForNewestEvent(page, 'checkbox · toggle')
    expect(await page.evaluate(() => (document.activeElement as HTMLInputElement).checked)).toBe(true)

    await tabTo(page, 'the weekly digest switch', (label) => label.includes('Weekly digest'))
    await page.keyboard.press('Space')
    await waitForNewestEvent(page, 'switch · toggle')
    expect(await page.evaluate(() => (document.activeElement as HTMLInputElement).checked)).toBe(false)
  })

  it('changes Select with arrow keys', async () => {
    await tabTo(page, 'the Plan select', (label) => label.startsWith('select#playground-plan'))

    await page.keyboard.press('ArrowDown')
    await waitForNewestEvent(page, 'select · change')
    expect(await page.evaluate(() => (document.activeElement as HTMLSelectElement).value)).toBe(
      'enterprise',
    )
  })

  it('sends no event while typing in Input or Textarea', async () => {
    const before = await eventCount(page)

    await tabTo(page, 'the workspace name input', (label) =>
      label.startsWith('input#playground-name[text]'),
    )
    await page.keyboard.type('keyboard check')

    await tabTo(page, 'the release note textarea', (label) =>
      label.startsWith('textarea#playground-note'),
    )
    await page.keyboard.type(' typed by keyboard')

    // Give the client time to flush anything it might have queued.
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(await eventCount(page)).toBe(before)
    expect(
      await page.evaluate(
        () => (document.getElementById('playground-name') as HTMLInputElement).value,
      ),
    ).toContain('keyboard check')
  })
})

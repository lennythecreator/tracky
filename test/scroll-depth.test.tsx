import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { CaptureOptions, ScrollDepthSummary } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, render } from './render.js'

let fetch: FetchStub

// jsdom has no layout: set the page height and scroll position by hand.
// The viewport is 768 px tall; a 3,072 px page puts each 25% at 768 px.
function layout(pageHeight: number, scrollY = 0) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: pageHeight, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true })
}

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  layout(3_072)
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (document.documentElement as { scrollHeight?: unknown }).scrollHeight
  delete (window as { scrollY?: unknown }).scrollY
  delete (document as { visibilityState?: unknown }).visibilityState
})

function Page({ capture = { scrollDepth: true } }: { capture?: CaptureOptions }) {
  return <AnalyticsProvider endpoint={ENDPOINT} options={{ capture }}>{null}</AnalyticsProvider>
}

const depths = () => fetch.events()
  .filter((event) => event.eventType === 'scroll_depth')
  .map((event) => ({ route: event.route, ...(event.payload as ScrollDepthSummary) }))

async function exitPage() {
  act(() => { window.dispatchEvent(new Event('pagehide')) })
  await settle()
}

describe('measure', () => {
  it.each([
    [0, 25],
    [700, 25],
    [768, 50],
    [1_600, 75],
    [2_304, 100],
  ])('scrolled to %i px reports %i%%', async (y, expected) => {
    render(<Page />)
    scrollTo(y)
    await exitPage()

    expect(depths().map((depth) => depth.maxDepthPercent)).toEqual([expected])
  })

  it('keeps the deepest bucket after scrolling back up', async () => {
    render(<Page />)
    scrollTo(1_600)
    scrollTo(0)
    await exitPage()

    expect(depths()[0].maxDepthPercent).toBe(75)
  })

  it('reports 100% for a page shorter than the viewport', async () => {
    layout(500)
    render(<Page />)
    await exitPage()

    expect(depths()[0].maxDepthPercent).toBe(100)
  })

  it('sends only the summary fields, never positions or text', async () => {
    render(<Page />)
    scrollTo(1_234)
    await exitPage()

    const [event] = fetch.events()
    expect(Object.keys(event.payload as object).sort()).toEqual(['maxDepthPercent', 'visitId', 'visitStartedAt'])
    expect(event.context).toEqual({})
    expect(fetch.bodies().join()).not.toContain('1234')
  })
})

describe('delivery', () => {
  it('sends the previous route depth on route change and resets for the new visit', async () => {
    render(<Page />)
    scrollTo(1_600)
    act(() => window.history.pushState(null, '', '/reports'))
    await vi.advanceTimersByTimeAsync(0)
    scrollTo(0)
    await exitPage()

    const [home, reports] = depths()
    expect([home.route, home.maxDepthPercent]).toEqual(['/', 75])
    expect([reports.route, reports.maxDepthPercent]).toEqual(['/reports', 25])
    expect(reports.visitId).not.toBe(home.visitId)
  })

  it('does not carry the previous page scroll position into the next visit', async () => {
    render(<Page />)
    scrollTo(1_600)
    // The router has not scrolled to the top yet when the route changes.
    act(() => window.history.pushState(null, '', '/reports'))
    await vi.advanceTimersByTimeAsync(0)
    act(() => window.history.pushState(null, '', '/settings'))
    await vi.advanceTimersByTimeAsync(0)
    await settle()

    // `/reports` was never measured, so only `/` is reported so far.
    expect(depths().map((depth) => depth.route)).toEqual(['/'])
  })

  it('resends on a later exit only when the visit got deeper', async () => {
    render(<Page />)
    await exitPage()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await settle()
    scrollTo(1_600)
    await exitPage()

    expect(depths().map((depth) => depth.maxDepthPercent)).toEqual([25, 75])
    expect(new Set(depths().map((depth) => depth.visitId)).size).toBe(1)
  })

  it('works with every other capture category off and enables none of them', async () => {
    render(<Page />)
    act(() => window.history.pushState(null, '', '/next'))
    await vi.advanceTimersByTimeAsync(0)
    await exitPage()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['scroll_depth', 'scroll_depth'])
  })

  it('stays off unless its switch is on', async () => {
    render(<Page capture={{ heatMaps: true }} />)
    scrollTo(1_600)
    await exitPage()

    expect(depths()).toEqual([])
  })
})

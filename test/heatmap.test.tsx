import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { CaptureOptions, HeatMapSummary } from '../src/types.js'
import { ENDPOINT, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, render } from './render.js'

let fetch: FetchStub

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

// jsdom's viewport is 1024 × 768, so each region is 102.4 × 76.8 pixels.
const CENTER = { x: 512, y: 384, region: 55 }
const TOP_LEFT = { x: 10, y: 10, region: 0 }

function Page({ capture = { heatMaps: true } }: { capture?: CaptureOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={{ capture, flushIntervalMs: 100 }}>
      <button id="save" type="button">Save</button>
      <div id="ignored" data-analytics="ignore"><button id="ignored-button" type="button">Skip</button></div>
    </AnalyticsProvider>
  )
}

const summaries = () => fetch.events()
  .filter((event) => event.eventType === 'heatmap')
  .map((event) => ({ route: event.route, ...(event.payload as HeatMapSummary) }))

function dispatch(target: EventTarget, event: Event) {
  act(() => { target.dispatchEvent(event) })
}

const move = (x: number, y: number, pointerType = 'mouse', target: EventTarget = document.body) =>
  dispatch(target, new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType }))

const pointerClick = (x: number, y: number, target: EventTarget = document.body, detail = 1) =>
  dispatch(target, new MouseEvent('click', { bubbles: true, clientX: x, clientY: y, detail }))

async function navigate(url: string) {
  act(() => window.history.pushState(null, '', url))
  await vi.advanceTimersByTimeAsync(0)
}

/** Send whatever is buffered without advancing to the periodic flush. */
async function exitPage() {
  dispatch(window, new Event('pagehide'))
  await vi.advanceTimersByTimeAsync(0)
}

describe('aggregation', () => {
  it('samples mouse position every 250 ms into a 10 × 10 viewport grid', async () => {
    render(<Page />)
    move(CENTER.x, CENTER.y)
    await vi.advanceTimersByTimeAsync(1_000)
    move(TOP_LEFT.x, TOP_LEFT.y)
    await vi.advanceTimersByTimeAsync(500)
    await exitPage()

    const [summary] = summaries()
    expect(summary.columns).toBe(10)
    expect(summary.rows).toBe(10)
    expect(summary.sampleIntervalMs).toBe(250)
    expect(summary.pointerMs).toHaveLength(100)
    expect(summary.pointerMs[CENTER.region]).toBe(1_000)
    expect(summary.pointerMs[TOP_LEFT.region]).toBe(500)
    expect(summary.pointerMs.reduce((a, b) => a + b)).toBe(1_500)
  })

  it('sends only aggregate fields, never coordinates or pointer identifiers', async () => {
    render(<Page />)
    move(CENTER.x + 3, CENTER.y + 7)
    await vi.advanceTimersByTimeAsync(250)
    await exitPage()

    const [event] = fetch.events()
    expect(Object.keys(event.payload as object).sort()).toEqual([
      'clicks', 'columns', 'focusEntries', 'periodEndedAt', 'periodStartedAt',
      'pointerMs', 'rows', 'sampleIntervalMs', 'visitId', 'visitStartedAt',
    ])
    expect(event.context).toEqual({})
    expect(fetch.bodies().join()).not.toMatch(/515|391/)
  })

  it('ignores touch movement but counts touch taps', async () => {
    render(<Page />)
    move(CENTER.x, CENTER.y, 'touch')
    await vi.advanceTimersByTimeAsync(1_000)
    pointerClick(CENTER.x, CENTER.y)
    await exitPage()

    const [summary] = summaries()
    expect(summary.pointerMs.every((ms) => ms === 0)).toBe(true)
    expect(summary.clicks[CENTER.region]).toBe(1)
  })

  it('stops sampling when the pointer leaves the page or the page is hidden', async () => {
    render(<Page />)
    move(CENTER.x, CENTER.y)
    await vi.advanceTimersByTimeAsync(500)
    dispatch(document.body, new PointerEvent('pointerout', { bubbles: true, relatedTarget: null }))
    await vi.advanceTimersByTimeAsync(2_000)

    move(CENTER.x, CENTER.y)
    await vi.advanceTimersByTimeAsync(250)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    dispatch(document, new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(2_000)

    expect(summaries().map((summary) => summary.pointerMs[CENTER.region])).toEqual([750])
  })

  it('counts pointer clicks by region and skips keyboard activation', async () => {
    render(<Page />)
    pointerClick(TOP_LEFT.x, TOP_LEFT.y)
    pointerClick(TOP_LEFT.x, TOP_LEFT.y)
    pointerClick(CENTER.x, CENTER.y)
    pointerClick(0, 0, document.getElementById('save')!, 0)
    await exitPage()

    const [summary] = summaries()
    expect(summary.clicks[TOP_LEFT.region]).toBe(2)
    expect(summary.clicks[CENTER.region]).toBe(1)
    expect(summary.clicks.reduce((a, b) => a + b)).toBe(3)
  })

  it('counts keyboard focus entries at the focused element and skips pointer focus', async () => {
    render(<Page />)
    const save = document.getElementById('save')!
    save.getBoundingClientRect = () => DOMRect.fromRect({ x: CENTER.x - 40, y: CENTER.y - 10, width: 80, height: 20 })

    dispatch(save, new FocusEvent('focusin', { bubbles: true }))
    dispatch(save, new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
    dispatch(save, new FocusEvent('focusin', { bubbles: true }))
    await exitPage()

    expect(summaries()[0].focusEntries[CENTER.region]).toBe(1)
  })

  it('skips ignored subtrees', async () => {
    render(<Page />)
    const ignored = document.getElementById('ignored-button')!
    move(CENTER.x, CENTER.y, 'mouse', ignored)
    await vi.advanceTimersByTimeAsync(1_000)
    pointerClick(CENTER.x, CENTER.y, ignored)
    dispatch(ignored, new FocusEvent('focusin', { bubbles: true }))
    await exitPage()

    expect(summaries()).toEqual([])
  })
})

describe('delivery', () => {
  it('sends the previous route summary on route change and starts a new visit', async () => {
    render(<Page />)
    pointerClick(CENTER.x, CENTER.y)
    await navigate('/reports')
    pointerClick(TOP_LEFT.x, TOP_LEFT.y)
    await exitPage()

    const [home, reports] = summaries()
    expect(home.route).toBe('/')
    expect(home.clicks[CENTER.region]).toBe(1)
    expect(reports.route).toBe('/reports')
    expect(reports.clicks[TOP_LEFT.region]).toBe(1)
    expect(reports.clicks[CENTER.region]).toBe(0)
    expect(reports.visitId).not.toBe(home.visitId)
  })

  it('sends a summary every 30 seconds without repeating data', async () => {
    render(<Page />)
    pointerClick(CENTER.x, CENTER.y)
    await vi.advanceTimersByTimeAsync(30_000)
    await vi.advanceTimersByTimeAsync(30_000)
    pointerClick(CENTER.x, CENTER.y)
    // The third period ends at 90 s; allow the client's 100 ms flush interval.
    await vi.advanceTimersByTimeAsync(30_000 + 1_000)

    const sent = summaries()
    expect(sent.map((summary) => summary.clicks[CENTER.region])).toEqual([1, 1])
    expect(new Set(sent.map((summary) => summary.visitId)).size).toBe(1)
    expect(sent[1].periodStartedAt >= sent[0].periodEndedAt).toBe(true)
  })

  it('sends on page exit and does not resend on a second exit', async () => {
    render(<Page />)
    pointerClick(CENTER.x, CENTER.y)
    await exitPage()
    await exitPage()

    expect(summaries()).toHaveLength(1)
  })

  it('sends the remaining summary when the switch turns off', async () => {
    const view = render(<Page />)
    pointerClick(CENTER.x, CENTER.y)
    view.rerender(<Page capture={{}} />)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(summaries()).toHaveLength(1)
  })

  it('collects nothing unless its switch is on', async () => {
    render(<Page capture={{ clicks: true }} />)
    move(CENTER.x, CENTER.y)
    await vi.advanceTimersByTimeAsync(1_000)
    pointerClick(CENTER.x, CENTER.y)
    await exitPage()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(summaries()).toEqual([])
  })
})

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { CaptureOptions, EngagementSummary } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, render } from './render.js'

let fetch: FetchStub
// The module reads `performance.now()` deltas, so the test owns that clock
// alongside the fake timers and moves both in the same slices.
let clock = 0

beforeEach(() => {
  vi.useFakeTimers()
  clock = 0
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

async function advance(ms: number) {
  const step = 250
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    const slice = Math.min(step, ms - elapsed)
    clock += slice
    await act(async () => { await vi.advanceTimersByTimeAsync(slice) })
  }
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

function hide() {
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

function show() {
  setVisibility('visible')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

async function exitPage() {
  act(() => { window.dispatchEvent(new Event('pagehide')) })
  await settle()
}

async function routeChange(url: string) {
  act(() => window.history.pushState(null, '', url))
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
}

function Page({
  capture = { engagement: true },
  resolveRoute,
}: {
  capture?: CaptureOptions
  resolveRoute?: (location: Location) => string | null
}) {
  return <AnalyticsProvider endpoint={ENDPOINT} options={{ capture, resolveRoute }}>{null}</AnalyticsProvider>
}

const summaries = () => fetch.events()
  .filter((event) => event.eventType === 'engagement')
  .map((event) => ({ route: event.route, ...(event.payload as EngagementSummary) }))

describe('measure', () => {
  it('counts visible time and stops while the tab is hidden', async () => {
    render(<Page />)
    await advance(3_000)
    hide()
    await settle()
    await advance(5_000)
    show()
    await advance(2_000)
    await exitPage()

    const events = summaries()
    expect(events.map((event) => [event.activeMs, event.foregroundMs])).toEqual([[3_000, 3_000], [5_000, 5_000]])
    expect(new Set(events.map((event) => event.visitId)).size).toBe(1)
  })

  it('accumulates across several hide and show cycles without resending the same totals', async () => {
    render(<Page />)
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await advance(1_000)
      hide()
      await settle()
      await advance(4_000)
      show()
    }
    await exitPage()

    const events = summaries()
    expect(events.map((event) => event.activeMs)).toEqual([1_000, 2_000, 3_000])
    expect(new Set(events.map((event) => event.visitId)).size).toBe(1)
  })

  it('stops counting idle time after 30 seconds and resumes on activity', async () => {
    render(<Page />)
    await advance(31_000)
    await exitPage()

    expect(summaries()[0]).toMatchObject({ activeMs: 30_000, foregroundMs: 31_000 })

    act(() => { document.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
    await advance(2_000)
    await exitPage()

    expect(summaries().at(-1)).toMatchObject({ activeMs: 32_000, foregroundMs: 33_000 })
  })

  it('sends only the summary fields and no context', async () => {
    render(<Page />)
    await advance(1_000)
    await exitPage()

    const [event] = fetch.events()
    expect(Object.keys(event.payload as object).sort()).toEqual(['activeMs', 'foregroundMs', 'visitId', 'visitStartedAt'])
    expect(event.context).toEqual({})
  })
})

describe('delivery', () => {
  it('sends the visit summary on route change and starts a new visit', async () => {
    render(<Page />)
    await advance(2_000)
    await routeChange('/reports')
    await advance(1_000)
    await exitPage()

    const [home, reports] = summaries()
    expect([home.route, home.activeMs]).toEqual(['/', 2_000])
    expect([reports.route, reports.activeMs]).toEqual(['/reports', 1_000])
    expect(reports.visitId).not.toBe(home.visitId)
  })

  it('sends again after an earlier snapshot only when the visit grew', async () => {
    render(<Page />)
    await advance(2_000)
    hide()
    await settle()
    show()
    await exitPage()

    expect(summaries()).toHaveLength(1)
  })

  it('sends the summary on unmount', async () => {
    const view = render(<Page />)
    await advance(2_000)
    view.unmount()
    await settle()

    expect(summaries()[0]).toMatchObject({ activeMs: 2_000, foregroundMs: 2_000 })
  })

  it('enables no other capture category', async () => {
    render(<Page />)
    await advance(1_000)
    await routeChange('/next')
    await exitPage()

    // The visit summary for `/` goes out on the route change; the new visit has
    // nothing to report yet, so no other event type appears.
    expect(fetch.events().map((event) => event.eventType)).toEqual(['engagement'])
  })

  it('adds no timer or activity listener when the switch is off', () => {
    const intervals = vi.spyOn(globalThis, 'setInterval')
    const listeners = vi.spyOn(document, 'addEventListener')

    render(<Page capture={{}} />)

    expect(intervals).not.toHaveBeenCalled()
    const attached = listeners.mock.calls.map(([type]) => type)
    expect(attached).not.toContain('pointerdown')
    expect(attached).not.toContain('scroll')
  })
})

describe('ignored locations', () => {
  const skipLogin = (location: Location) => location.pathname === '/login' ? null : location.pathname

  it('starts no visit for a location the resolver ignores', async () => {
    window.history.replaceState(null, '', '/login')
    render(<Page resolveRoute={skipLogin} />)
    await advance(5_000)
    await exitPage()

    expect(summaries()).toEqual([])

    await routeChange('/dashboard')
    await advance(1_000)
    await exitPage()

    expect(summaries().map((event) => [event.route, event.activeMs])).toEqual([['/dashboard', 1_000]])
  })
})

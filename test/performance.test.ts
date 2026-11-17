import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as root from '../src/index.js'
import { observePerformance } from '../src/performance.js'
import type { AnalyticsClient } from '../src/types.js'

class FakePerformanceObserver {
  static instances: FakePerformanceObserver[] = []
  static unsupported: string[] = []

  readonly observed: PerformanceObserverInit[] = []
  disconnected = false
  private readonly callback: PerformanceObserverCallback

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback
    FakePerformanceObserver.instances.push(this)
  }

  observe(options: PerformanceObserverInit = {}): void {
    if (options.type && FakePerformanceObserver.unsupported.includes(options.type)) {
      throw new TypeError(`Unsupported entry type: ${options.type}`)
    }
    this.observed.push(options)
  }

  disconnect(): void { this.disconnected = true }

  takeRecords(): PerformanceEntry[] { return [] }

  emit(entries: PerformanceEntry[]): void {
    this.callback(
      { getEntries: () => entries } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver,
    )
  }
}

function entry(entryType: string, fields: Record<string, unknown> = {}): PerformanceEntry {
  return { entryType, name: '', startTime: 0, duration: 0, toJSON: () => ({}), ...fields } as unknown as PerformanceEntry
}

function fakeClient() {
  const track = vi.fn()
  return { track, client: { track } as unknown as AnalyticsClient }
}

const observers = () => ({
  lcp: FakePerformanceObserver.instances[0],
  layout: FakePerformanceObserver.instances[1],
  events: FakePerformanceObserver.instances[2],
})

beforeEach(() => {
  FakePerformanceObserver.instances = []
  FakePerformanceObserver.unsupported = []
  vi.stubGlobal('PerformanceObserver', FakePerformanceObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('entry', () => {
  it('is not reachable from the root entry', () => {
    expect(Object.keys(root)).not.toContain('observePerformance')
    expect(Object.keys(root)).not.toContain('PerformanceSummary')
  })
})

describe('observePerformance', () => {
  it('sends one event with the metrics available when the page is hidden or unloaded', () => {
    const { client, track } = fakeClient()
    const cleanup = observePerformance(client)
    const { lcp, layout, events } = observers()

    lcp.emit([entry('largest-contentful-paint', { startTime: 1_234.5 })])
    layout.emit([entry('layout-shift', { value: 0.1, hadRecentInput: false })])
    layout.emit([entry('layout-shift', { value: 0.2, hadRecentInput: true })])
    events.emit([
      entry('event', { duration: 300, interactionId: 1 }),
      entry('event', { duration: 150, interactionId: 2 }),
      entry('event', { duration: 60, interactionId: 3 }),
      entry('event', { duration: 400, interactionId: 0 }),
    ])

    window.dispatchEvent(new Event('pagehide'))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('performance', {}, { lcpMs: 1_235, cls: 0.1, inpMs: 150 })

    window.dispatchEvent(new Event('pagehide'))
    expect(track).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('omits a metric the browser did not report instead of sending a zero', () => {
    FakePerformanceObserver.unsupported = ['largest-contentful-paint', 'event']
    const { client, track } = fakeClient()
    const cleanup = observePerformance(client)

    window.dispatchEvent(new Event('pagehide'))

    // No layout shifts were reported, so CLS is a measured zero.
    expect(track).toHaveBeenCalledWith('performance', {}, { cls: 0 })
    cleanup()
  })

  it('sends nothing when no measure is supported', () => {
    FakePerformanceObserver.unsupported = ['largest-contentful-paint', 'layout-shift', 'event']
    const { client, track } = fakeClient()
    const cleanup = observePerformance(client)

    window.dispatchEvent(new Event('pagehide'))
    cleanup()

    expect(track).not.toHaveBeenCalled()
  })

  it('disconnects every observer on cleanup and sends the pending summary once', () => {
    const { client, track } = fakeClient()
    const cleanup = observePerformance(client)
    observers().lcp.emit([entry('largest-contentful-paint', { startTime: 800 })])

    cleanup()
    cleanup()

    expect(track).toHaveBeenCalledTimes(1)
    expect(FakePerformanceObserver.instances.every((observer) => observer.disconnected)).toBe(true)
  })

  it('does nothing in a browser without PerformanceObserver', () => {
    vi.stubGlobal('PerformanceObserver', undefined)
    const { client, track } = fakeClient()

    const cleanup = observePerformance(client)
    window.dispatchEvent(new Event('pagehide'))
    cleanup()

    expect(track).not.toHaveBeenCalled()
  })
})

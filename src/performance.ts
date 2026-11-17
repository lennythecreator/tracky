import type { AnalyticsClient, PerformanceSummary } from './types.js'

/** Interaction durations under this can never become the reported INP value. */
const INP_DURATION_FLOOR_MS = 104
/** Keeps the INP sample list bounded on a long page view. */
const MAX_INTERACTION_SAMPLES = 200

type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean }
type EventTimingEntry = PerformanceEntry & { interactionId?: number }

/**
 * Report LCP, CLS, and INP for the current page view from the separate
 * `tracky/performance` entry, so an app that never imports it loads no
 * observer code. Call it once in an effect with the client from
 * `useAnalytics()`; the returned cleanup disconnects the observers.
 *
 * Nothing touches a browser API until the function is called, so importing it
 * during a server render is safe.
 */
export function observePerformance(client: AnalyticsClient): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof PerformanceObserver !== 'function') {
    return () => {}
  }

  const observers: PerformanceObserver[] = []
  const interactions: number[] = []
  let lcpMs: number | undefined
  let shiftTotal = 0
  let layoutShiftObserved = false
  let sent = false

  const observe = (type: string, handle: (entry: PerformanceEntry) => void): boolean => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) handle(entry)
      })
      observer.observe({ type, buffered: true })
      observers.push(observer)
      return true
    } catch {
      // The browser does not support this entry type; the metric stays absent.
      return false
    }
  }

  observe('largest-contentful-paint', (entry) => {
    lcpMs = Math.round(entry.startTime)
  })

  layoutShiftObserved = observe('layout-shift', (entry) => {
    const shift = entry as LayoutShiftEntry
    if (shift.hadRecentInput) return
    shiftTotal += shift.value
  })

  observe('event', (entry) => {
    const timing = entry as EventTimingEntry
    if (!timing.interactionId || timing.duration < INP_DURATION_FLOOR_MS) return
    interactions.push(timing.duration)
    if (interactions.length > MAX_INTERACTION_SAMPLES) interactions.shift()
  })

  const send = () => {
    if (sent) return
    const payload: PerformanceSummary = {}
    if (lcpMs !== undefined) payload.lcpMs = lcpMs
    // A measured zero is a real CLS. The field is absent only when the browser
    // reported no layout-shift support at all.
    if (layoutShiftObserved) payload.cls = Math.round(shiftTotal * 10_000) / 10_000
    if (interactions.length > 0) {
      const sorted = [...interactions].sort((a, b) => a - b)
      payload.inpMs = Math.round(sorted[Math.floor((sorted.length - 1) * 0.98)])
    }
    if (Object.keys(payload).length === 0) return
    sent = true
    client.track('performance', {}, payload)
  }

  const onExit = () => { send() }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') send()
  }

  window.addEventListener('pagehide', onExit)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.removeEventListener('pagehide', onExit)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    for (const observer of observers) observer.disconnect()
    observers.length = 0
    send()
  }
}

export type { PerformanceSummary } from './types.js'

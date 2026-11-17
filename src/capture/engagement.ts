import { randomId, trackForRoute } from '../client.js'
import type { AnalyticsClient, EngagementSummary } from '../types.js'
import { subscribeToRoute } from './navigation.js'

/** Time without activity after which a visible visit stops adding active time. */
export const ENGAGEMENT_IDLE_MS = 30_000
/** The step at which foreground time is counted. */
export const ENGAGEMENT_TICK_MS = 1_000
// A visible tab whose timer was delayed by more than this had its clock
// suspended (a sleeping machine, for example), so the gap is not counted.
const MAX_ELAPSED_MS = ENGAGEMENT_TICK_MS * 2

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

interface Visit {
  route: string
  visitId: string
  visitStartedAt: string
  activeMs: number
  foregroundMs: number
  sentActiveMs: number
  sentForegroundMs: number
}

function startVisit(route: string): Visit {
  return {
    route,
    visitId: randomId(),
    visitStartedAt: new Date().toISOString(),
    activeMs: 0,
    foregroundMs: 0,
    sentActiveMs: 0,
    sentForegroundMs: 0,
  }
}

/**
 * Measure how long each route visit held attention. Time counts only while the
 * tab is visible and the visit is on an accepted route, and it stops adding
 * active time after `ENGAGEMENT_IDLE_MS` without pointer, key, scroll, or touch
 * activity. The summary is cumulative for the visit, sent on route change, page
 * exit, and capture stop, and only when the totals grew since the last send.
 */
export function captureEngagement(client: AnalyticsClient, resolve: () => string | null): () => void {
  // A location the resolver ignores has no visit, so nothing is measured for it.
  const initial = resolve()
  let visit: Visit | null = initial === null ? null : startVisit(initial)
  let lastActivity = performance.now()
  let lastTick = lastActivity
  let ticker: ReturnType<typeof setInterval> | undefined

  const resetClock = () => {
    lastActivity = performance.now()
    lastTick = lastActivity
  }

  const tick = () => {
    const now = performance.now()
    const elapsed = Math.max(0, Math.min(now - lastTick, MAX_ELAPSED_MS))
    lastTick = now
    if (visit === null || document.visibilityState !== 'visible') return
    visit.foregroundMs += elapsed
    if (now - lastActivity <= ENGAGEMENT_IDLE_MS) visit.activeMs += elapsed
  }

  const send = () => {
    if (visit === null) return
    const activeMs = Math.round(visit.activeMs)
    const foregroundMs = Math.round(visit.foregroundMs)
    if (activeMs <= visit.sentActiveMs && foregroundMs <= visit.sentForegroundMs) return
    visit.sentActiveMs = activeMs
    visit.sentForegroundMs = foregroundMs
    trackForRoute(client, visit.route, 'engagement', {
      visitId: visit.visitId,
      visitStartedAt: visit.visitStartedAt,
      activeMs,
      foregroundMs,
    } satisfies EngagementSummary)
  }

  const startTicking = () => {
    if (ticker) return
    resetClock()
    ticker = setInterval(tick, ENGAGEMENT_TICK_MS)
  }

  const stopTicking = () => {
    if (ticker) clearInterval(ticker)
    ticker = undefined
  }

  // The only activity signal Tracky reads: the time of the last pointer, key,
  // scroll, or touch. Nothing is taken from the event itself.
  const onActivity = () => { lastActivity = performance.now() }

  const onExit = () => {
    tick()
    send()
    void client.flush()
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      stopTicking()
      onExit()
      return
    }
    startTicking()
  }

  const unsubscribe = subscribeToRoute(resolve, (route) => {
    tick()
    send()
    visit = route === null ? null : startVisit(route)
    stopTicking()
    if (visit !== null) startTicking()
  })

  for (const type of ACTIVITY_EVENTS) {
    document.addEventListener(type, onActivity, { capture: true, passive: true })
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onExit)
  if (document.visibilityState === 'visible') startTicking()

  return () => {
    unsubscribe()
    stopTicking()
    for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, onActivity, true)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onExit)
    tick()
    send()
  }
}

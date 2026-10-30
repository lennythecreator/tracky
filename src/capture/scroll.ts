import { randomId, trackForRoute } from '../client.js'
import type { AnalyticsClient, ScrollDepthSummary } from '../types.js'
import { subscribeToRoute } from './navigation.js'

export const SCROLL_DEPTH_BUCKET_PERCENT = 25

type Depth = ScrollDepthSummary['maxDepthPercent']

/** Deepest visible point of the page, rounded down to a 25% bucket. */
function currentDepth(): Depth {
  const root = document.documentElement
  const pageHeight = Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0)
  const visibleBottom = window.scrollY + window.innerHeight
  if (pageHeight <= window.innerHeight || pageHeight <= 0) return 100
  const percent = Math.min(100, (visibleBottom / pageHeight) * 100)
  return (Math.floor(percent / SCROLL_DEPTH_BUCKET_PERCENT) * SCROLL_DEPTH_BUCKET_PERCENT) as Depth
}

/**
 * Track the deepest scroll bucket per route visit and send it on route change,
 * page exit, and when capture stops, but only when it is deeper than what this
 * visit already sent. A visit sends at most five events. No periodic flush:
 * the page-hidden signal also covers mobile tab switches and closes.
 */
export function captureScrollDepth(client: AnalyticsClient, resolve: () => string | null): () => void {
  // `deepest` is -1 until the visit is measured. A visit that starts after
  // navigation waits for its first scroll, resize, or exit: right after a
  // route change the scroll position still belongs to the previous page.
  const startVisit = (route: string, deepest: Depth | -1) => ({
    route,
    visitId: randomId(),
    visitStartedAt: new Date().toISOString(),
    deepest,
    sent: -1,
  })
  let visit = startVisit(resolve() ?? '', currentDepth())

  const measure = () => {
    const depth = currentDepth()
    if (depth > visit.deepest) visit.deepest = depth
  }

  const sendDeepest = () => {
    if (visit.deepest <= visit.sent) return
    visit.sent = visit.deepest
    trackForRoute(client, visit.route, 'scroll_depth', {
      visitId: visit.visitId,
      visitStartedAt: visit.visitStartedAt,
      maxDepthPercent: visit.deepest as Depth,
    } satisfies ScrollDepthSummary)
  }

  const send = () => {
    measure()
    sendDeepest()
  }

  const onExit = () => {
    send()
    void client.flush()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') onExit()
  }

  const unsubscribe = subscribeToRoute(resolve, (route) => {
    // The location already changed and the old page may be gone, so send what
    // was measured before navigation instead of measuring again.
    sendDeepest()
    visit = startVisit(route, -1)
  })

  window.addEventListener('scroll', measure, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  window.addEventListener('pagehide', onExit)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    unsubscribe()
    window.removeEventListener('scroll', measure)
    window.removeEventListener('resize', measure)
    window.removeEventListener('pagehide', onExit)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    send()
  }
}

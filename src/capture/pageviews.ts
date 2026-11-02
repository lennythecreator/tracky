import type { AnalyticsClient } from '../types.js'
import { subscribeToRoute } from './navigation.js'

export interface LastPageView {
  current: { client: AnalyticsClient; route: string } | null
}

/**
 * Send a `pageview` for the current route and each later route change. `last`
 * outlives a single call so a Strict Mode remount or an options change does
 * not repeat the current page.
 */
export function capturePageViews(
  client: AnalyticsClient,
  resolve: () => string | null,
  last: LastPageView,
): () => void {
  const track = (route: string) => {
    if (last.current?.client === client && last.current.route === route) return
    last.current = { client, route }
    client.track('pageview', { title: document.title })
  }

  const initial = resolve()
  if (initial !== null) track(initial)
  return subscribeToRoute(resolve, track)
}

'use client'

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { captureClicks, captureFormSubmits, captureInputChanges } from './capture/interactions.js'
import { resolveCapture } from './capture/options.js'
import { createAnalyticsClient, currentRoute } from './client.js'
import type { AnalyticsClient, AnalyticsProviderProps } from './types.js'

const AnalyticsContextValue = createContext<AnalyticsClient | null>(null)

export function AnalyticsProvider({ endpoint, options, children }: AnalyticsProviderProps) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const capture = resolveCapture(options)
  const lastPageView = useRef<{ client: AnalyticsClient; route: string } | null>(null)

  // The client lives as long as the endpoint. It reads the other options
  // through this view, so new values apply without recreating it.
  const client = useMemo(() => createAnalyticsClient(endpoint, {
    get batchSize() { return optionsRef.current?.batchSize },
    get flushIntervalMs() { return optionsRef.current?.flushIntervalMs },
    get maxRetries() { return optionsRef.current?.maxRetries },
    get context() { return optionsRef.current?.context },
    onDeliveryError: (error) => optionsRef.current?.onDeliveryError?.(error),
  }), [endpoint])

  useEffect(() => () => { void client.flush() }, [client])

  useEffect(() => {
    if (!capture.pageViews) return

    // One page view per route. Remembered across effect runs so a Strict Mode
    // remount or an options change does not repeat the current page.
    const trackPageView = () => {
      pending = undefined
      const route = currentRoute()
      const last = lastPageView.current
      if (last?.client === client && last.route === route) return
      lastPageView.current = { client, route }
      client.track('pageview', { title: document.title })
    }

    // Wait one task after a history change so the router can render the new
    // page and its title, and so a redirect in the same task counts once.
    let pending: ReturnType<typeof setTimeout> | undefined
    const onNavigation = () => { pending ??= setTimeout(trackPageView, 0) }

    trackPageView()
    window.addEventListener('popstate', onNavigation)

    // Another script may wrap the History API after this one. On cleanup, only
    // restore the originals if these wrappers are still installed; otherwise
    // leave the chain intact and let `active` make these wrappers inert.
    let active = true
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    const pushState: History['pushState'] = function (this: History, ...args) {
      originalPushState.apply(this, args)
      if (active) onNavigation()
    }
    const replaceState: History['replaceState'] = function (this: History, ...args) {
      originalReplaceState.apply(this, args)
      if (active) onNavigation()
    }
    history.pushState = pushState
    history.replaceState = replaceState

    return () => {
      active = false
      if (pending) clearTimeout(pending)
      window.removeEventListener('popstate', onNavigation)
      if (history.pushState === pushState) history.pushState = originalPushState
      if (history.replaceState === replaceState) history.replaceState = originalReplaceState
    }
  }, [client, capture.pageViews])

  // Send buffered events when the page is hidden or unloaded. `keepalive`
  // lets these requests outlive the page; the flush interval would not.
  useEffect(() => {
    const onPageHide = () => { void client.flush() }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void client.flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [client])

  useEffect(() => (capture.clicks ? captureClicks(client) : undefined), [client, capture.clicks])
  useEffect(() => (capture.formSubmits ? captureFormSubmits(client) : undefined), [client, capture.formSubmits])
  useEffect(() => (capture.inputChanges ? captureInputChanges(client) : undefined), [client, capture.inputChanges])

  return <AnalyticsContextValue.Provider value={client}>{children}</AnalyticsContextValue.Provider>
}

export function useAnalytics(): AnalyticsClient {
  const client = useContext(AnalyticsContextValue)
  if (!client) throw new Error('useAnalytics must be used within an AnalyticsProvider')
  return client
}

/** Returns the client, or `null` outside an `AnalyticsProvider` so UI stays usable. */
export function useAnalyticsOptional(): AnalyticsClient | null {
  return useContext(AnalyticsContextValue)
}


'use client'

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { captureFrustrationClicks } from './capture/frustration.js'
import { captureHeatMaps } from './capture/heatmap.js'
import { captureClicks, captureFormSubmits, captureInputChanges } from './capture/interactions.js'
import { resolveCapture } from './capture/options.js'
import { captureScrollDepth } from './capture/scroll.js'
import { capturePageViews, type LastPageView } from './capture/pageviews.js'
import { createAnalyticsClient, resolveRoute } from './client.js'
import type { AnalyticsClient, AnalyticsProviderProps } from './types.js'

const AnalyticsContextValue = createContext<AnalyticsClient | null>(null)

export function AnalyticsProvider({ endpoint, options, children }: AnalyticsProviderProps) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const capture = resolveCapture(options)
  const lastPageView: LastPageView = useRef(null)

  // The client lives as long as the endpoint. It reads the other options
  // through this view, so new values apply without recreating it.
  const client = useMemo(() => createAnalyticsClient(endpoint, {
    get batchSize() { return optionsRef.current?.batchSize },
    get flushIntervalMs() { return optionsRef.current?.flushIntervalMs },
    get maxRetries() { return optionsRef.current?.maxRetries },
    get context() { return optionsRef.current?.context },
    get resolveRoute() { return optionsRef.current?.resolveRoute },
    onDeliveryError: (error) => optionsRef.current?.onDeliveryError?.(error),
  }), [endpoint])

  useEffect(() => () => { void client.flush() }, [client])

  useEffect(() => {
    if (!capture.pageViews) return
    return capturePageViews(client, () => resolveRoute(optionsRef.current?.resolveRoute), lastPageView)
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
  useEffect(() => (capture.frustrationClicks ? captureFrustrationClicks(client) : undefined), [client, capture.frustrationClicks])
  useEffect(() => {
    if (!capture.heatMaps) return
    return captureHeatMaps(client, () => resolveRoute(optionsRef.current?.resolveRoute))
  }, [client, capture.heatMaps])
  useEffect(() => {
    if (!capture.scrollDepth) return
    return captureScrollDepth(client, () => resolveRoute(optionsRef.current?.resolveRoute))
  }, [client, capture.scrollDepth])

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


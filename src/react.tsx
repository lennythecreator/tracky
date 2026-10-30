'use client'

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { createAnalyticsClient, currentRoute } from './client.js'
import type { AnalyticsClient, AnalyticsContext, AnalyticsOptions, AnalyticsProviderProps } from './types.js'

const AnalyticsContextValue = createContext<AnalyticsClient | null>(null)

export function AnalyticsProvider({ endpoint, options, children }: AnalyticsProviderProps) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const capturePageViews = Boolean(options?.capturePageViews)
  const captureInteractions = Boolean(options?.captureInteractions)
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
    if (!capturePageViews) return

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
  }, [client, capturePageViews])

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

  useEffect(() => {
    if (!captureInteractions) return

    const ignored = (target: Element) => Boolean(target.closest('[data-analytics="ignore"]'))
    const metadata = (target: Element): AnalyticsContext => {
      const el = target.closest<HTMLElement>('[data-analytics-name],button,a,[role="button"],input,select,textarea')
        ?? target as HTMLElement
      const safe: AnalyticsContext = {
        tag: el.tagName.toLowerCase(),
      }
      if (el.id) safe.id = el.id
      if (el.dataset.analyticsName) safe.name = el.dataset.analyticsName
      if (typeof el.className === 'string' && el.className) safe.className = el.className.slice(0, 120)
      return safe
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || ignored(target)) return
      // A Tracky component emits its own documented action for this interaction.
      if (target.closest('[data-tracky-component]')) return
      const el = target.closest('button,a,[role="button"],[data-analytics-name]')
      if (el) client.track('click', metadata(el))
    }
    const onChange = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return
      if (target instanceof HTMLInputElement && (target.type === 'password' || target.type === 'hidden')) return
      if (target.matches('[contenteditable="true"]') || ignored(target)) return
      client.track('input_interaction', metadata(target))
    }
    const onSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || ignored(form)) return
      client.track('form_submit', metadata(form))
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('change', onChange, true)
    document.addEventListener('submit', onSubmit, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('change', onChange, true)
      document.removeEventListener('submit', onSubmit, true)
    }
  }, [client, captureInteractions])

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


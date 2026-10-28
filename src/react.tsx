'use client'

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { createAnalyticsClient } from './client.js'
import type { AnalyticsClient, AnalyticsContext, AnalyticsOptions, AnalyticsProviderProps } from './types.js'

const AnalyticsContextValue = createContext<AnalyticsClient | null>(null)

export function AnalyticsProvider({ endpoint, options, children }: AnalyticsProviderProps) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const client = useMemo(() => createAnalyticsClient(endpoint, options), [endpoint])

  useEffect(() => {
    if (optionsRef.current?.capturePageViews) {
      client.track('pageview', { title: document.title })
      let previousUrl = window.location.href
      const onNavigation = () => {
        if (window.location.href === previousUrl) return
        previousUrl = window.location.href
        client.track('pageview', { title: document.title })
      }
      window.addEventListener('popstate', onNavigation)
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState
      history.pushState = function (...args) {
        originalPushState.apply(this, args)
        onNavigation()
      }
      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args)
        onNavigation()
      }
      return () => {
        window.removeEventListener('popstate', onNavigation)
        history.pushState = originalPushState
        history.replaceState = originalReplaceState
        void client.flush()
      }
    }

    return () => { void client.flush() }
  }, [client])

  useEffect(() => {
    if (!optionsRef.current?.captureInteractions) return

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
  }, [client])

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


import type { AnalyticsEvent } from 'tracky'

/**
 * A reserved, non-routable endpoint. `installPreviewTransport` answers requests
 * to it inside the page, so the playground exercises the real SDK delivery path
 * without sending anything anywhere.
 */
export const PREVIEW_ENDPOINT = 'https://tracky-preview.invalid/events'

export const SAMPLE_EVENT: AnalyticsEvent = {
  eventType: 'component_interaction',
  timestamp: '2026-01-01T09:00:00.000Z',
  route: '/playground/',
  context: { name: 'checkout_continue' },
  sessionId: 'sample-session',
  component: { name: 'button', action: 'activate' },
}

type Listener = (events: AnalyticsEvent[]) => void

const listeners = new Set<Listener>()
let installed = false

export function subscribeToPreview(listener: Listener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function installPreviewTransport(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (url !== PREVIEW_ENDPOINT) return originalFetch(input, init)

    try {
      const payload: unknown = JSON.parse(String(init?.body ?? ''))
      const events = (payload as { events?: unknown }).events

      if (Array.isArray(events)) {
        for (const listener of listeners) listener(events as AnalyticsEvent[])
      }
    } catch {
      // A malformed preview batch is not worth surfacing in the demo.
    }

    return Promise.resolve(new Response(null, { status: 204 }))
  }
}

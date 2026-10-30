import type {
  AnalyticsClient,
  AnalyticsComponent,
  AnalyticsContext,
  AnalyticsEvent,
  AnalyticsOptions,
  JsonValue,
} from './types.js'

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_FLUSH_INTERVAL_MS = 3_000
const DEFAULT_MAX_RETRIES = 3
const MAX_BACKOFF_MS = 30_000
// Bounds memory while the endpoint is unreachable: at most this many events
// wait in the queue (oldest dropped first) and this many batches are in flight.
const MAX_QUEUE_SIZE = 1_000
const MAX_CONCURRENT_BATCHES = 4

class DeliveryError extends Error {
  constructor(readonly status: number) {
    super(`Analytics endpoint responded with ${status}`)
  }
}

// Other 4xx responses mean the request itself was rejected; resending it
// unchanged cannot succeed.
const isRetryable = (error: unknown) =>
  !(error instanceof DeliveryError) || error.status >= 500 || error.status === 408 || error.status === 429

/** A random v4 UUID. `crypto.randomUUID` needs a secure context; `getRandomValues` does not. */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function getSessionId(): string {
  const key = 'ui-analytics-session-id'
  try {
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const id = randomId()
    window.sessionStorage.setItem(key, id)
    return id
  } catch {
    return randomId()
  }
}

/** Path plus query. Hash-only changes keep the same route. */
export function defaultRoute(): string {
  return `${window.location.pathname}${window.location.search}`
}

/**
 * The current route from the app's resolver, or path plus query without one.
 * `null` means the resolver chose to ignore the current location. A resolver
 * that throws falls back to the default so tracking never breaks the app.
 */
export function resolveRoute(resolver: AnalyticsOptions['resolveRoute']): string | null {
  if (!resolver) return defaultRoute()
  try {
    return resolver(window.location)
  } catch {
    return defaultRoute()
  }
}

type Enqueue = (
  eventType: string,
  context: AnalyticsContext,
  component?: AnalyticsComponent,
  payload?: JsonValue,
  route?: string,
) => void

// Lets built-in capture record an event against a route other than the
// current one, without adding that to the public client API.
const enqueuers = new WeakMap<AnalyticsClient, Enqueue>()

/**
 * Track an event for `route` instead of the current location. Summaries use
 * this after navigation, when they describe the page the visitor just left.
 */
export function trackForRoute(
  client: AnalyticsClient,
  route: string,
  eventType: string,
  payload: JsonValue,
): void {
  const enqueue = enqueuers.get(client)
  if (enqueue) enqueue(eventType, {}, undefined, payload, route)
  else client.track(eventType, {}, payload)
}

export function createAnalyticsClient(endpoint: string, options: AnalyticsOptions = {}): AnalyticsClient {
  const queue: AnalyticsEvent[] = []
  const inFlight = new Set<Promise<void>>()
  let sessionId: string | undefined
  // Options are read when used, so a caller can pass an object whose values
  // change over the client's lifetime, as `AnalyticsProvider` does.
  const batchSize = () => Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
  const maxRetries = () => Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES)
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const reportError = (error: unknown) => options.onDeliveryError?.(error)

  const send = async (batch: AnalyticsEvent[], attempt = 0): Promise<void> => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      })
      if (!response.ok) throw new DeliveryError(response.status)
    } catch (error) {
      if (attempt < maxRetries() && !closed && isRetryable(error)) {
        const delay = Math.min(1_000 * 2 ** attempt, MAX_BACKOFF_MS)
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
        return send(batch, attempt + 1)
      }
      reportError(error)
    }
  }

  // Start a request for each waiting batch, up to the concurrency limit. A
  // finished request starts the next one, so the queue drains without waiting
  // for the flush interval.
  const sendQueued = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    while (queue.length > 0 && inFlight.size < MAX_CONCURRENT_BATCHES) {
      const request: Promise<void> = send(queue.splice(0, batchSize())).then(() => {
        inFlight.delete(request)
        sendQueued()
      })
      inFlight.add(request)
    }
  }

  const flush = async (): Promise<void> => {
    sendQueued()
    while (inFlight.size > 0) await Promise.all(inFlight)
  }

  const scheduleFlush = () => {
    if (timer || closed) return
    timer = setTimeout(() => void flush(), options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)
  }

  const enqueue: Enqueue = (eventType, context, component, payload, route) => {
    if (closed || !eventType.trim()) return
    const event: AnalyticsEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      route: route ?? resolveRoute(options.resolveRoute) ?? defaultRoute(),
      context: { ...options.context, ...context },
      sessionId: sessionId ??= getSessionId(),
    }
    if (component) event.component = component
    if (payload !== undefined) event.payload = payload
    if (queue.length >= MAX_QUEUE_SIZE) queue.shift()
    queue.push(event)
    if (queue.length >= batchSize()) sendQueued()
    else scheduleFlush()
  }

  const track = (eventType: string, context: AnalyticsContext = {}, payload?: JsonValue) => {
    enqueue(eventType, context, undefined, payload)
  }

  const trackComponentEvent = (
    component: string,
    action: string,
    context: AnalyticsContext = {},
  ) => {
    if (!component.trim() || !action.trim()) return
    enqueue('component_interaction', context, { name: component, action })
  }

  const client: AnalyticsClient = {
    track,
    trackComponentEvent,
    flush,
    async shutdown() {
      await flush()
      closed = true
      if (timer) clearTimeout(timer)
      timer = undefined
    },
  }
  enqueuers.set(client, enqueue)
  return client
}

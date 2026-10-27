import type { AnalyticsClient, AnalyticsContext, AnalyticsEvent, AnalyticsOptions } from './types.js'

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_FLUSH_INTERVAL_MS = 3_000
const DEFAULT_MAX_RETRIES = 3
const MAX_BACKOFF_MS = 30_000

function getSessionId(): string {
  const key = 'ui-analytics-session-id'
  try {
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.sessionStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function currentRoute(): string {
  return `${window.location.pathname}${window.location.search}`
}

export function createAnalyticsClient(endpoint: string, options: AnalyticsOptions = {}): AnalyticsClient {
  const queue: AnalyticsEvent[] = []
  let sessionId: string | undefined
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES)
  let timer: ReturnType<typeof setTimeout> | undefined
  let sending = false
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
      if (!response.ok) throw new Error(`Analytics endpoint responded with ${response.status}`)
    } catch (error) {
      if (attempt < maxRetries && !closed) {
        const delay = Math.min(1_000 * 2 ** attempt, MAX_BACKOFF_MS)
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
        return send(batch, attempt + 1)
      }
      reportError(error)
    }
  }

  const flush = async (): Promise<void> => {
    if (sending || queue.length === 0) return
    sending = true
    if (timer) clearTimeout(timer)
    timer = undefined
    const batch = queue.splice(0, queue.length)
    try {
      await send(batch)
    } finally {
      sending = false
      if (queue.length > 0 && !closed) void flush()
    }
  }

  const scheduleFlush = () => {
    if (timer || closed) return
    timer = setTimeout(() => void flush(), options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)
  }

  const track = (eventType: string, context: AnalyticsContext = {}) => {
    if (closed || !eventType.trim()) return
    queue.push({
      eventType,
      timestamp: new Date().toISOString(),
      route: currentRoute(),
      context: { ...options.context, ...context },
      sessionId: sessionId ??= getSessionId(),
    })
    if (queue.length >= (options.batchSize ?? DEFAULT_BATCH_SIZE)) void flush()
    else scheduleFlush()
  }

  const trackComponentEvent = (
    component: string,
    action: string,
    context: AnalyticsContext = {},
  ) => {
    if (!component.trim() || !action.trim()) return
    track('component_interaction', { ...context, component, action })
  }

  return {
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
}


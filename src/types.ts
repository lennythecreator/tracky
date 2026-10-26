export type AnalyticsContext = Record<string, string | number | boolean | null>

export interface AnalyticsEvent {
  eventType: string
  timestamp: string
  route: string
  context: AnalyticsContext
  sessionId: string
}

export interface AnalyticsOptions {
  /** Number of events to buffer before sending. Defaults to 10. */
  batchSize?: number
  /** Maximum delay before flushing the current batch. Defaults to 3000 ms. */
  flushIntervalMs?: number
  /** Enable page-view events on initial mount and history changes. Defaults to false. */
  capturePageViews?: boolean
  /** Enable safe click, form-submit, and input-interaction metadata. Defaults to false. */
  captureInteractions?: boolean
  /** Maximum number of retries per batch. Defaults to 3. */
  maxRetries?: number
  /** Additional context merged into every event. */
  context?: AnalyticsContext
  /** Called after an event batch cannot be delivered. */
  onDeliveryError?: (error: unknown) => void
}

export interface AnalyticsClient {
  track: (eventType: string, context?: AnalyticsContext) => void
  flush: () => Promise<void>
  shutdown: () => Promise<void>
}

export interface AnalyticsProviderProps {
  endpoint: string
  options?: AnalyticsOptions
  children: React.ReactNode
}

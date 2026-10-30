export type AnalyticsContext = Record<string, string | number | boolean | null>

/** A value that survives `JSON.stringify` unchanged. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface AnalyticsComponent {
  name: string
  action: string
}

export interface AnalyticsEvent {
  eventType: string
  timestamp: string
  route: string
  context: AnalyticsContext
  sessionId: string
  /** Present on component interaction events. */
  component?: AnalyticsComponent
  /** Structured data for events that need more than flat context, such as summaries. */
  payload?: JsonValue
}

export interface CaptureOptions {
  /** `pageview` on initial load and each route change. */
  pageViews?: boolean
  /** `click` with safe metadata for buttons, links, and named elements. */
  clicks?: boolean
  /** `form_submit` with safe metadata for the form, never submitted values. */
  formSubmits?: boolean
  /** `input_interaction` when a field changes, never its value. */
  inputChanges?: boolean
}

export interface AnalyticsOptions {
  /** Number of events to buffer before sending. Defaults to 10. */
  batchSize?: number
  /** Maximum delay before flushing the current batch. Defaults to 3000 ms. */
  flushIntervalMs?: number
  /**
   * Map the current location to the route Tracky records. Return `null` to
   * ignore the location, for example an intermediate redirect. Defaults to
   * path plus query, which ignores hash-only changes.
   */
  resolveRoute?: (location: Location) => string | null
  /** Page-wide capture switches. Each one is independent and off by default. */
  capture?: CaptureOptions
  /** @deprecated Use `capture.pageViews`. */
  capturePageViews?: boolean
  /** @deprecated Use `capture.clicks`, `capture.formSubmits`, and `capture.inputChanges`. */
  captureInteractions?: boolean
  /** Maximum number of retries per batch. Defaults to 3. */
  maxRetries?: number
  /** Additional context merged into every event. */
  context?: AnalyticsContext
  /** Called after an event batch cannot be delivered. */
  onDeliveryError?: (error: unknown) => void
}

export interface AnalyticsClient {
  /**
   * Track a named event. Pass structured data as `payload`, not in `context`.
   * The type parameter lets callers name the payload shape they send.
   */
  track: <TPayload extends JsonValue = JsonValue>(eventType: string, context?: AnalyticsContext, payload?: TPayload) => void
  /** Track an explicit interaction from a Tracky or application UI component. */
  trackComponentEvent: (component: string, action: string, context?: AnalyticsContext) => void
  flush: () => Promise<void>
  shutdown: () => Promise<void>
}

export interface AnalyticsProviderProps {
  endpoint: string
  options?: AnalyticsOptions
  children: React.ReactNode
}

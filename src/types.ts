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
  /** `frustration_click` when one target is clicked 3+ times within 1 second. Works without `clicks`. */
  frustrationClicks?: boolean
  /** `heatmap` summaries of pointer time, clicks, and keyboard focus on a 10×10 viewport grid. */
  heatMaps?: boolean
  /** `scroll_depth` with the deepest 25% bucket reached per visit. Independent of `heatMaps`. */
  scrollDepth?: boolean
}

/**
 * Payload of a `heatmap` event: one period of one visit to one route. The
 * event's `route` is the route the visit was on. Each grid is row-major,
 * `columns × rows` long, over the visible viewport (index 0 is top left).
 * Periods of the same `visitId` do not overlap; sum them for the visit.
 */
/**
 * Payload of a `scroll_depth` event: the deepest point of the page a visit has
 * shown, as a bucket. A visit can send several events as it gets deeper; keep
 * the largest `maxDepthPercent` per `visitId`.
 */
export type ScrollDepthSummary = {
  /** Random ID for this visit to the route. Not stored and not reused. */
  visitId: string
  visitStartedAt: string
  /** Bottom of the viewport as a share of the page height, rounded down to 0, 25, 50, 75, or 100. */
  maxDepthPercent: 0 | 25 | 50 | 75 | 100
}

export type HeatMapSummary = {
  /** Random ID for this visit to the route. Not stored and not reused. */
  visitId: string
  visitStartedAt: string
  periodStartedAt: string
  periodEndedAt: string
  columns: number
  rows: number
  sampleIntervalMs: number
  /** Milliseconds a mouse or pen pointer was sampled in each region. */
  pointerMs: number[]
  /** Pointer clicks, including touch taps, in each region. */
  clicks: number[]
  /** Keyboard focus moves into each region. */
  focusEntries: number[]
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

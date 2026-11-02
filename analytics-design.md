# Tracky Analytics Design

**Status:** Approved product direction; implementation is in progress. This document is the working contract for agents changing analytics capture, event schemas, or delivery. It describes target behavior, not a claim that every feature already exists.

Before changing analytics tracking, read this guide together with `product.md`, `README.md`, and `AGENTS.md`. Update the implementation and relevant documentation together. Keep current scaffold status in `product.md` accurate.

## Product boundary

Tracky is a React analytics SDK paired with reusable, analytics-aware React components. It sends events only to the endpoint configured by the integrating developer. Tracky does not provide a hosted collector, dashboard, storage layer, identity graph, session replay, or guaranteed delivery.

The integrating app owns consent. The SDK must not collect before its configured capture options permit it. All page-wide capture is opt-in and off by default. A Tracky component may emit its documented action when used; this must not implicitly enable page-wide DOM, cursor, or scroll capture.

## Event contract

Use one event envelope:

```ts
interface AnalyticsEvent {
  eventType: string
  timestamp: string
  route: string
  sessionId: string
  context: Record<string, string | number | boolean | null>
  component?: { name: string; action: string }
  payload?: JsonValue // Define a concrete type for each structured payload.
}
```

- `eventType` identifies the event, for example `pageview`, `click`, or `component_interaction`.
- Component events put `{ name, action }` in the top-level `component` object, alongside `eventType` and `context`. Keep `context` for small, JSON-safe developer metadata and safe target metadata.
- `track(eventType, context, payload)` sets `payload`. Callers name its shape with the type parameter, for example `track<ExportSummary>(…)`.
- Heat map summaries use a typed `payload`, not `context`. Define a concrete TypeScript payload type when implementing the feature.
- `route` is path plus query by default. Hash-only changes do not create page views by default. Support a developer-provided route resolver for hash-based or custom routers.
- `sessionId` remains a random identifier scoped to the browser tab/session. Do not add cross-tab identity, user identity, cookies, or persistent identifiers.
- Keep developer-supplied context JSON-safe. Never add personal data, secrets, field contents, arbitrary component props, or unrestricted DOM snapshots automatically.

## Capture behavior

### Tracky component actions

Tracky components emit their documented action events automatically when the user performs those actions. Give each event a stable component name and action. For a native button or control, keyboard activation through Enter or Space is the same normal action event as pointer activation; do not record key names or key presses.

Keep `trackComponentEvent(component, action, context)` available for explicit application-defined component actions. It must use the same event envelope and populate the top-level `component` object. Do not inspect component props to infer analytics data.

If page-wide click capture and a Tracky component action both observe the same interaction, emit the component event and suppress the duplicate generic click event for that interaction.

### Page-wide capture switches

Keep each capture type independently configurable, grouped as page-wide capture. Every page-wide capture switch is off by default. The approved capture categories are:

- Page views: initial page load and actual route changes, including browser back/forward.
- Clicks: safe click metadata only; a link click is not navigation unless the route changes.
- Form submissions: event metadata only, never submitted values.
- Input changes: a separate opt-in metadata event; never capture values, text, or keystrokes.
- Frustration clicks: may be enabled independently from ordinary click events.
- Cursor heat maps: aggregated region summaries only.
- Scroll depth: a separate opt-in signal, independent of cursor heat maps.

Use separate switches so developers can enable one category without enabling the others. Page views and page-wide interactions must not turn on automatically merely because an `AnalyticsProvider` is mounted.

### Navigation and route changes

Track the initial page view and actual route changes, including back/forward navigation. Use path plus query as the default route. Ignore hash-only changes unless the app's route resolver identifies them as real route changes. A link click without a route change is only a click.

### Frustration clicks

Count 3 or more clicks on the same live DOM element instance within a 1-second window as a frustration-click event. Do not infer frustration from labels, text, DOM ancestry, or whether the page responded. Let this detector consume click signals internally when enabled, even if ordinary click events are disabled.

Allow an explicit analytics name such as `data-analytics-name` to provide stable grouping across instances. Do not build or transmit deep DOM paths. Continue to honor `data-analytics="ignore"` for excluded subtrees.

### Heat maps

Build a per-visit, per-route summary on a normalized 10×10 grid of the visible viewport. Aggregate in the browser; never send raw cursor trails or precise coordinates.

- Sample mouse and pen positions every 250 ms while the pointer is within the visible page. Accumulate sampled time in the corresponding grid region.
- Count clicks as a separate measure in their corresponding regions.
- Count keyboard focus entries by region as a separate measure. Map the focused control to a region without recording the key used to move focus.
- Do not treat touch movement as cursor movement. Touch clicks may contribute to click counts.
- Represent summary values in a concrete, typed `payload` with route/visit scope and grid data. Do not put the grid in `context`.
- Send summaries on route change and page exit, with a bounded periodic flush for long visits. Delivery is best-effort; periodic flushes should limit data lost when a page closes unexpectedly.
- The configured endpoint is responsible for combining per-visit summaries into cross-visit heat maps.

The exact grid payload fields and periodic flush interval are implementation details to define in the public types and documentation. Preserve the approved aggregation and privacy behavior above.

## Delivery and runtime constraints

- Keep delivery asynchronous, bounded, and non-blocking. A slow endpoint must not block rendering or input handling.
- Send only to the developer-configured endpoint. Do not add hidden destinations or remote vendor calls.
- Retry only within a bounded policy. The receiving endpoint owns durable storage and guaranteed delivery.
- Use browser APIs only in browser execution paths such as effects and event handlers, not during module initialization or render.
- Keep React 18+ compatibility, ESM/NodeNext import conventions, and a small runtime dependency footprint.

## Privacy requirements

Never collect field values, keystrokes, passwords, hidden input values, contenteditable text, arbitrary page text, or session replay data. Do not infer labels by scraping text. Preserve the `data-analytics="ignore"` exclusion boundary. Keep capture opt-in, respect the integrating app's consent decision, and avoid collecting more DOM metadata than an event requires.

## Implementation checklist

When implementing or changing tracking behavior:

1. Check whether the behavior is current scaffold capability or approved future direction in `product.md`.
2. Update TypeScript event types and runtime behavior together.
3. Keep `src/`, `README.md`, `product.md`, and this guide aligned on event names, payload fields, defaults, and privacy behavior.
4. Update the quick start when public setup or exports change.
5. Do not claim an unimplemented capability is shipped.

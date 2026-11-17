# Tracky

A lightweight React analytics SDK that sends first-party events to an endpoint you control. The initial package foundation includes an explicit tracking hook, independent opt-in switches for page views, clicks, form submissions, and input changes, buffered delivery, retry with backoff, and a session-scoped random ID. Engagement time and the Core Web Vitals ship opt-in, and [ADR 0003](docs/adr/0003-engagement-and-performance-measures.md) records their measures and bounds.

## Status

Early development. The public API and event schema may change before the first stable release. Hosted license verification and managed dashboards are not part of this repository foundation.

## Component architecture decisions

Tracky's reusable UI components are distributed as source-owned registry entries (not runtime exports from the `tracky` SDK package). The initial source lives in [`registry/components/ui/`](registry/components/ui/). See [ADR 0001: Component registry and styling model](./docs/adr/0001-component-registry-and-styling.md) for distribution, styling, accessibility, naming, and package-boundary decisions.

## Install

Tracky is not published to npm yet. This command applies once a release is available:

```sh
npm install tracky
```

## Quick start

```tsx
'use client'

import { AnalyticsProvider, useAnalytics } from 'tracky'

function SaveButton() {
  const analytics = useAnalytics()
  return (
    <button
      type="button"
      onClick={() => analytics.trackComponentEvent('save_button', 'activate', { location: 'toolbar' })}
    >
      Save
    </button>
  )
}

export function AppAnalytics({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProvider
      endpoint="https://your-api.example.com/events"
      options={{ capture: { pageViews: true } }}
    >
      {children}
    </AnalyticsProvider>
  )
}
```

With `capture.pageViews`, Tracky sends one `pageview` for the current page and one for each route change through `pushState`, `replaceState`, or back/forward. The route is path plus query, so hash-only changes don't count unless you pass `resolveRoute`. Tracky reads `document.title` one task after the history change, which gives the router time to render the new page. Several changes in the same task, such as a redirect, count once, at the final route.

For hash-based or custom routers, pass `resolveRoute`. It receives `window.location` and returns the route to record, or `null` to ignore the location (for example, a redirect page). Tracky uses its result for page views and for the `route` field on every event. If the resolver throws, Tracky falls back to path plus query.

An ignored location is not a route visit. Page views skip it, and heat maps and scroll depth start no visit for it: nothing is measured while it is current, no summary carries its activity, and the next visit begins at the first route the resolver accepts. On mount that means the first heat-map or scroll summary covers the first accepted route, not an empty one.

```tsx
<AnalyticsProvider
  endpoint="/api/events"
  options={{
    capture: { pageViews: true },
    resolveRoute: (location) => (location.hash.startsWith('#/') ? location.hash.slice(1) : '/'),
  }}
>
```

### Common routers

Three helpers cover the usual shapes without importing a router:

```ts
import { hashResolver, pathResolver, stripBasePath } from 'tracky'

pathResolver()                        // path plus query, ignores hash changes
pathResolver({ basePath: '/app' })    // the same, with the app's base path removed
hashResolver()                        // '#/settings' becomes '/settings'
```

`resolveRoute` stays the only integration hook. Tracky imports no router, and none of these helpers is required.

A resolver that reads the address bar misses a route the app keeps somewhere else. A path that never reaches `window.location` — a memory router, or a screen the app renders without changing the URL — produces no route change for Tracky to observe, so pass the router's own location instead, and track that page view yourself.

**React Router** (v6.4 through v7). With `<BrowserRouter>`, the default already works. With `<HashRouter>`, pass `hashResolver()`. With `<BrowserRouter basename="/app">`, pass `pathResolver({ basePath: '/app' })` so the route does not repeat the base path. For a memory router, pass its location through a ref:

```tsx
import { useRef } from 'react'
import { useLocation } from 'react-router-dom'

const location = useLocation()
const current = useRef(location)
current.current = location

// <AnalyticsProvider options={{ resolveRoute: () => `${current.current.pathname}${current.current.search}` }}>
```

**Next.js App Router** (13.4 and later). `usePathname()` and `useSearchParams()` give the rendered route, with the configured `basePath` already removed. `useSearchParams()` needs a `Suspense` boundary above it in statically rendered pages.

```tsx
'use client'

import { useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const pathname = usePathname()
const query = useSearchParams().toString()
const current = useRef('/')
current.current = query ? `${pathname}?${query}` : pathname

// <AnalyticsProvider options={{ resolveRoute: () => current.current }}>
```

If the resolver runs before the router has rendered the new page, it returns the previous route. When the URL already carries the route, `pathResolver()` is the timing-safe choice; use `pathResolver({ basePath })` when the app sets one.

**Next.js Pages Router** (12 and later). `asPath` is the path the app rendered, including the query. Strip the base path with the helper, which does nothing when it is already gone:

```tsx
'use client'

import { useRouter } from 'next/router'
import { stripBasePath } from 'tracky'

const router = useRouter()

// <AnalyticsProvider options={{ resolveRoute: () => stripBasePath(router.asPath, '/app') }}>
```

Each recipe renders the provider inside the router, so the router's location is available where the provider is set up.

Only `endpoint` recreates the client. The other options can change after mount, and new values apply to the next event. To start collecting after the user consents, render the provider without capture options, then turn on the `capture` switches you need once you have consent. [Consent](#consent) has copyable recipes. Turning an option off removes its capture listeners. The page-hidden flush listeners below stay attached, because they deliver explicit events rather than collect.

The provider uses browser APIs after mounting, so it can be rendered inside a React app or a Next.js client boundary. In Next.js App Router, put it in a small Client Component and render that component from the server layout.

## Event shape

Events contain `eventType`, ISO UTC `timestamp`, relative `route`, a `context` object, and a random `sessionId` stored in `sessionStorage`. Component events also carry a top-level `component` object.

`context` is flat: string, number, boolean, or `null` values only. For structured data, pass a third argument to `track()`. Tracky sends it as a top-level `payload` field and leaves `context` alone:

```ts
type ExportSummary = { rows: number; columns: string[] }

analytics.track<ExportSummary>('report_exported', { format: 'csv' }, { rows: 120, columns: ['date', 'total'] })
```

The payload must be JSON-safe (`JsonValue`). The type parameter is optional and checks the shape at compile time. Events without a payload have no `payload` field.

Call `analytics.trackComponentEvent(component, action, context)` from an explicit component action handler to send a `component_interaction` event. The call above produces `component: { name: "save_button", action: "activate" }` with `location: "toolbar"` in `context`. Use stable component and action names; pass only small, JSON-safe metadata. Tracky does not inspect component props or read field values.

Explicit component events are sent when you call the method. The `capture` switches control only automatic, page-wide capture.

## Page-wide capture

Each switch in `options.capture` is independent and off by default. Tracky attaches a category's listeners only while its switch is on.

| Switch | Event | What it records |
| --- | --- | --- |
| `pageViews` | `pageview` | Initial load and each route change, with `title` in `context`. |
| `clicks` | `click` | Clicks on buttons, links, `role="button"`, and `data-analytics-name` elements. A link click is only a click; navigation shows up as a page view. |
| `formSubmits` | `form_submit` | That a form was submitted, never its values. |
| `inputChanges` | `input_interaction` | That an input, select, or textarea changed, never its value. Password and hidden inputs are skipped. A contenteditable editor is not a form control, so it never sends this event. |
| `frustrationClicks` | `frustration_click` | One event when the same target gets 3 or more pointer clicks within 1 second. Works without `clicks`. |
| `heatMaps` | `heatmap` | A per-visit `HeatMapSummary` payload of pointer time, clicks, and keyboard focus on a 10 × 10 viewport grid. |
| `scrollDepth` | `scroll_depth` | A per-visit `ScrollDepthSummary` payload with the deepest 25% bucket reached. Independent of `heatMaps`. |
| `engagement` | `engagement` | A per-visit `EngagementSummary` payload with foreground time and the part of it that passed with recent activity. Independent of every other switch. |

```tsx
<AnalyticsProvider endpoint="/api/events" options={{ capture: { pageViews: true, clicks: true } }}>
```

A frustration click's target is the clicked control, or the clicked element itself when it isn't a control, so repeated clicks on a non-interactive image count too. Elements that share a `data-analytics-name` are grouped across instances. A burst sends one event however long it lasts, with the same safe metadata as `click`. Keyboard activation doesn't count. Tracky never looks at text, labels, or whether the page responded.

### Heat maps

With `capture.heatMaps`, the browser builds the heat map itself and sends only the totals. The visible viewport is split into a 10 × 10 grid; each grid is a row-major array of 100 numbers, with index 0 at the top left.

- `pointerMs`: Tracky samples the mouse or pen position every 250 ms while the pointer is over the visible page, and adds 250 ms to that region. Touch movement doesn't count.
- `clicks`: pointer clicks and touch taps per region. Keyboard activation doesn't count.
- `focusEntries`: keyboard focus moving into a region, located at the focused element's center. Focus caused by a pointer press doesn't count, and the key used is never recorded.

A summary covers one period of one visit to one route. A route that `resolveRoute` ignores has no visit and therefore no summary. Tracky sends it when the route changes, when the page is hidden or unloaded, every 30 seconds during a long visit, and when the switch turns off. Each send resets the grids, so periods never overlap, and an empty period is not sent. The event's `route` is the route the visit was on, even when the summary is sent after navigation. To build a cross-visit heat map, sum the grids on your endpoint by `route`, or by `visitId` for a single visit.

Raw coordinates, cursor trails, pointer IDs, and viewport size are never sent. `data-analytics="ignore"` subtrees don't count.

### Scroll depth

With `capture.scrollDepth`, Tracky records how far down the page each visit got: the bottom of the viewport as a share of the page height, rounded down to 0, 25, 50, 75, or 100. A page shorter than the viewport counts as 100. Scrolling back up doesn't lower the value.

Tracky sends the summary when the route changes, when the page is hidden or unloaded, and when the switch turns off. It sends again only if the visit got deeper since the last send, so a visit sends at most five events; keep the largest `maxDepthPercent` per `visitId`. There's no periodic flush: the page-hidden signal also covers closing the tab and switching apps on mobile. Raw scroll positions, page text, and DOM paths are never sent.

After navigation, the new visit is measured on its first scroll, resize, or exit, because the router may not have scrolled the new page yet. A route that `resolveRoute` ignores has no visit, so its scroll position is never measured or carried into the next route.

### Engagement time

With `capture.engagement`, Tracky measures how long each visit held attention, without identity and without reading anything typed or clicked. A second counts toward `activeMs` only when the tab is visible, the route is accepted, and the most recent pointer press, key press, scroll, or touch was within 30 seconds. Time in a hidden tab never counts. After 30 seconds without activity, counting pauses until activity resumes, so an abandoned tab stops accumulating.

`foregroundMs` is the same period without the idle rule, so `activeMs / foregroundMs` shows how much of the visible time was active. Both are cumulative for the visit, and a visit that resumes after being hidden keeps its `visitId` and totals.

The summary goes out when the visit ends: on a route change, on page exit, and when the switch turns off. It sends again only if the totals grew since the last send, so keep the largest `activeMs` per `visitId` on your endpoint.

The measure costs one one-second interval and one passive activity listener set, both removed when the switch turns off or the tab is hidden. The listeners record only the time of the last activity. No keystrokes, key names, field values, page text, pointer positions, or identity are recorded.

```ts
type EngagementSummary = {
  visitId: string
  visitStartedAt: string
  activeMs: number
  foregroundMs: number
}
```

The earlier flags still work but are deprecated: `capturePageViews` maps to `capture.pageViews`, and `captureInteractions` maps to `clicks`, `formSubmits`, and `inputChanges`. A key set in `capture` overrides the flag.

Automatic capture records basic element metadata and never reads input values. Add `data-analytics="ignore"` to exclude a subtree; add `data-analytics-name="checkout_continue"` to give a control a stable analytics name.

The browser sends batches with `fetch` and `keepalive`. Each request carries at most `batchSize` events. Inside an `AnalyticsProvider`, Tracky also sends buffered events when the page is hidden or unloaded, so they don't wait for the flush interval.

Failed requests are retried with capped exponential backoff while the page remains open. That covers network errors, `5xx`, `408`, and `429`. Tracky doesn't retry any other `4xx` response, because the endpoint rejected the request itself. In both cases `onDeliveryError` receives the error.

Delivery is bounded while the endpoint is unreachable. At most four requests are in flight, and at most 1,000 events wait in the buffer. When the buffer is full, Tracky drops the oldest event first. For durable delivery, validate and queue events on your own endpoint.

## Performance

LCP, CLS, and INP ship from a separate entry, so an app that imports only `tracky` loads no observer code. Call `observePerformance` once in an effect with the client from `useAnalytics()`:

```tsx
'use client'

import { useEffect } from 'react'
import { useAnalytics } from 'tracky'
import { observePerformance } from 'tracky/performance'

export function PagePerformance() {
  const analytics = useAnalytics()
  useEffect(() => observePerformance(analytics), [analytics])
  return null
}
```

Render it inside `AnalyticsProvider`. The returned cleanup disconnects the observers, so the effect returns it as is.

Tracky sends one `performance` event when the page is hidden or unloaded, or when the component unmounts. The payload carries only the metrics the browser reported:

```ts
type PerformanceSummary = {
  lcpMs?: number
  cls?: number
  inpMs?: number
}
```

`lcpMs` is the last largest contentful paint entry, `cls` is the layout shift total without recent input rounded to four decimals, and `inpMs` is the 98th percentile interaction duration. An absent field was not measured, while a measured CLS of zero is sent as `0`. No raw entries, URLs, element selectors, or text are sent.

These are document-level measurements, so one summary covers the loaded document rather than each client-side route change.

The entry needs `PerformanceObserver` with buffered `largest-contentful-paint`, `layout-shift`, and `event` timing entries. In a browser without them, `observePerformance` returns a cleanup and sends nothing. It reads no browser API at module load, so it is safe to import during a server render.

Performance capture is separate from the `capture` switches and never turns one of them on.

## Consent

Capture is off by default, and the SDK stores nothing until an event is sent: the session ID is created on the first event, not when the provider mounts. A page that captures nothing and calls no tracking method writes no browser storage.

Consent must come from the consent manager's stored decision. Read that decision, then enable the switches it allows. A banner click that a reload forgets must not start capture, so the click handler that records a decision is not the place to enable capture: read the stored decision instead.

### Custom banner

Keep one boolean that is true only while the stored decision allows analytics, and pass `capture` only while it is true:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { AnalyticsProvider } from 'tracky'

const CONSENT_KEY = 'analytics-consent'

function storedDecision() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
}

export function AppAnalytics({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    setGranted(storedDecision())
    const onDecision = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY) setGranted(event.newValue === 'granted')
    }
    window.addEventListener('storage', onDecision)
    return () => window.removeEventListener('storage', onDecision)
  }, [])

  return (
    <AnalyticsProvider endpoint="/api/events" options={{ capture: granted ? { pageViews: true } : {} }}>
      {children}
    </AnalyticsProvider>
  )
}
```

The first render has capture off, so nothing is captured or stored until the decision is read. Turning a switch on later sends the next event; turning it off removes that category's listeners. `storage` only fires in other tabs, so a banner on the current page should update the same state through its own handler.

### Cookiebot

Cookiebot exposes the decision as `Cookiebot.consent.statistics`, the analytics category, and fires `CookiebotOnConsentReady` once the stored state is known. Read it on mount and listen for that event rather than for the banner click:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { AnalyticsProvider } from 'tracky'

declare global {
  interface Window {
    Cookiebot?: { consent: { statistics: boolean } }
  }
}

export function AppAnalytics({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    const read = () => setGranted(window.Cookiebot?.consent.statistics === true)
    read()
    window.addEventListener('CookiebotOnConsentReady', read)
    return () => window.removeEventListener('CookiebotOnConsentReady', read)
  }, [])

  return (
    <AnalyticsProvider endpoint="/api/events" options={{ capture: granted ? { pageViews: true } : {} }}>
      {children}
    </AnalyticsProvider>
  )
}
```

The declaration names only the part of Cookiebot's API this recipe reads, so Tracky does not depend on Cookiebot's typings. Load the Cookiebot script before this effect runs, and treat a declined or unanswered decision as off.

### Another consent manager

The shape is the same for any manager: expose one boolean that is true only when the stored decision allows analytics, read it in an effect, and pass `capture` only while it is true. Where the decision lives is your choice, whether a first-party cookie you control, `localStorage`, or a server-side record. Tracky reads and writes none of it, and it ships no banner.

The review of what is stored and sent before and after consent, and what your endpoint owns, is in [`analytics-design.md`](analytics-design.md#consent).

## Component source

Tracky's primitives are installed as source into your project by the `tracky` CLI, which ships in this package. The files are not exports of the `tracky` SDK package: you own them and can edit them. The registry is this repository, so the CLI needs network access.

The package is not published to npm yet. From a checkout, build it and run the CLI directly:

```sh
npm run build
node dist/cli/index.js init
node dist/cli/index.js add button
```

After a release, the same commands are `npx tracky init` and `npx tracky add button`. The CLI runs on Node 18 or later.

`tracky init` writes `tracky.json`, copies `tokens.css` and `tailwind-preset.cjs` into your component directory, and adds the token import to your stylesheet. With Tailwind CSS v4 it also writes the `@theme inline` mapping; with v3 it prints the preset line to add to your Tailwind config. `tracky add <component>` copies the component and any shared file it needs, currently the `cn` helper.

Both commands fetch from the repository's `main` branch and record the resolved commit in `tracky.lock.json`. Pass `--ref <tag|sha>` to install an exact revision. Existing files are left alone unless you pass `--overwrite`.

`tracky.json` sits at your frontend root:

```json
{
  "ui": "src/components/ui",
  "lib": "src/lib",
  "stylesheet": "src/app/globals.css",
  "alias": { "prefix": "@", "root": "src" }
}
```

The CLI reads your `tsconfig.json` path mappings and stops with the exact mapping to add when `@/*` does not resolve to the configured root, because installed files import through that alias. The components use Tailwind CSS classes and semantic theme tokens, so the app must run Tailwind. Shared conventions, interaction states, and a field example are documented in [`registry/components/ui/README.md`](registry/components/ui/README.md).

The [component playground](website/playground/) renders the same source files with a local event preview. It runs the SDK's delivery path and answers the request inside the page, so nothing is sent when you interact with a control.

The primitives read the nearest provider through `useAnalyticsOptional()`, so their source imports the `tracky` package. With a provider present, each documented interaction sends one `component_interaction` event with a top-level `component` object:

| Component | Component name | Action |
| --- | --- | --- |
| `Button` | `button` | `activate` |
| `Checkbox` | `checkbox` | `toggle` |
| `Switch` | `switch` | `toggle` |
| `Select` | `select` | `change` |

Enter and Space on a `Button` are ordinary activation and send the same `activate` action as a pointer click; Tracky never records key names or key presses. `Input`, `Textarea`, and `Label` send no component events.

The events contain no values, labels, props, or selected options. Pass `analyticsName` to attach a stable name in `context`; the component renders it as `data-analytics-name`, so page-wide capture uses the same name for that element. Setting `data-analytics-name` yourself works too, and `analyticsName` wins when both are present. Component events reach only the configured endpoint, and using a Tracky component does not turn on page views or page-wide capture.

```tsx
<Button variant="primary" analyticsName="checkout_continue" onClick={continueCheckout}>
  Continue
</Button>
```

Without an `AnalyticsProvider`, the components still render and call your handlers; they send nothing.

## Theming

Colors, radii, and font family come from CSS variables. [`registry/theme/tokens.css`](registry/theme/tokens.css) provides light-theme defaults, and [`registry/theme/tailwind-preset.cjs`](registry/theme/tailwind-preset.cjs) maps them to semantic Tailwind utilities. `tracky init` imports the tokens and writes the `@theme inline` mapping for Tailwind v4; with v3, add the preset line it prints. Then override the `--tracky-*` variables to theme the components. Typography inherits your application's font until you set `--tracky-font-sans`. See [`registry/theme/README.md`](registry/theme/README.md) for setup, dark-theme examples, and the token list.

## Privacy and security

Tracking is opt-in. Automatic interaction capture is off unless enabled. The SDK does not collect text typed into fields, and ignores password inputs, editable elements, and ignored subtrees. Input-change capture listens for `change` on `input`, `select`, and `textarea` only: a contenteditable editor never produces an event, even if a script dispatches a `change` at it, and nothing reads a field value or an editor's text. Review your consent and retention requirements before enabling collection. Never put secrets in event context. The endpoint must accept JSON POST requests from your app's origin.

## Development

```sh
npm install
npm run lint
npm run check:terms
npm test
npm run build
```

`npm test` runs every suite without network access. The SDK suites run in jsdom and check the event envelope, batching and retry, and the privacy defaults: no capture without an opt-in, no field values, and no password, hidden, or ignored fields.

`test/playground-keyboard.test.ts` also drives the playground in a real browser, because jsdom has no tab order and no computed focus styles. It starts the playground's Vite server on a loopback port, launches the installed Chrome through `puppeteer-core`, and checks tab order, focus indicators, keyboard activation, and that typing sends no event. It downloads no browser: install Google Chrome, or set `CHROME_PATH` to a Chrome or Chromium binary if the check cannot find one.

`test/cli-init.test.ts` and `test/cli-add.test.ts` cover the installer in a temporary consumer project, served the committed `registry/r` payloads from a loopback server. They check the files, the lockfile, and the failure paths: an existing config without `--force`, a missing tsconfig or stylesheet, a mismatched alias, an edited file without `--overwrite`, an unknown component, and adding the theme directly. `test/cli-main.test.ts` covers argument parsing and exit codes through the exported `run()`, so those checks need neither a build nor a spawned process.


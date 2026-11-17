# Tracky Product

## Product summary

Tracky is a React UI analytics library: it pairs reusable, analytics-aware UI components with a lightweight SDK for capturing product events and sending them to an endpoint the developer controls. It should be quick to integrate, backend agnostic, and small enough to stay out of the app it measures. The SDK exists in the current scaffold. Initial primitive source lives in the repository registry tree, emits documented component actions, and is installed with the `tracky` registry CLI; the package is not published yet.

## Users and problem

Tracky is for React developers and small product teams who need to understand page views, feature usage, and conversion flows without adopting a hosted analytics platform or building browser instrumentation from scratch. They bring the endpoint, storage, dashboards, retention policy, and access controls.

## Product principles

- **Developer-owned data path:** Events go directly to the endpoint configured by the developer.
- **Opt-in page-wide collection:** Page views and page-wide DOM, cursor, and scroll capture are disabled unless enabled by the integrator. Tracky components may emit their documented action events when used; this does not enable page-wide capture.
- **Useful defaults, explicit boundaries:** Tracky captures event metadata, never field contents or secrets.
- **Low overhead:** Buffer events and deliver asynchronously so tracking does not block normal UI work.
- **Backend agnostic:** The SDK defines a browser event contract, not a server or storage implementation.
- **Honest reliability:** Retries are bounded; durable storage and guaranteed delivery belong to the receiving service.
- **Useful UI building blocks:** Source-owned React primitives make common UI interactions easier to instrument. The initial inventory and package boundaries are recorded in ADR 0001; the registry CLI installs the source into the consuming app.

## Core experience

A developer wraps the relevant client-side React tree in `AnalyticsProvider`, configures an endpoint or serverless function, and calls `useAnalytics().track(name, context)` for product-specific events. Tracky components emit stable, documented action events when used with a provider. Developers separately opt in to page views and each page-wide capture type. Their endpoint receives batches and is responsible for validating, persisting, and querying events. The SDK workflow and the component installer are implemented in the current scaffold; publishing, conversion helpers, and a production privacy review remain future work.

## Event model

An event has these fields:

| Field | Meaning |
| --- | --- |
| `eventType` | Stable event type, such as `pageview`, `click`, or a developer-defined type name. |
| `timestamp` | Client event time as an ISO-8601 UTC string. |
| `route` | Current relative path and query string. |
| `context` | Small, JSON-safe developer context and safe target metadata, such as an element tag, optional ID, explicit analytics name, or bounded class name. |
| `sessionId` | Random pseudonymous identifier scoped to the browser tab/session. |
| `component` | Present on component interaction events as `{ name, action }`. |
| `payload` | Optional JSON-safe structured data passed as the third argument to `track()`. |

The approved target contract also allows a typed `payload` for structured data such as heat map summaries. See [analytics-design.md](analytics-design.md) for the complete target contract and capture rules. `track(eventType, context, payload)` sends a JSON-safe `payload`, and heat maps send a typed `HeatMapSummary`.

The event context is not a place for credentials, personal data, form values, arbitrary component props, or unrestricted DOM snapshots. Custom context is supplied by the application developer. Automatic capture records only basic element metadata; it must not read or send typed values.

## Core tracking capabilities

- **Navigation and views:** Tracky captures the initial page view and actual route changes, including back/forward, when `capture.pageViews` is on. Path plus query is the default; `resolveRoute` supports apps with custom route state and can ignore a location. The `pathResolver`, `hashResolver`, and `stripBasePath` helpers cover path, base-path, and hash routes without a router dependency.
- **Element interactions:** A separate, opt-in `capture` switch controls each of safe clicks, form submissions, input-change metadata, frustration clicks, cursor heat maps, and scroll depth. Tracky never captures field values or text.
- **Component interactions:** Tracky components emit documented actions. `trackComponentEvent(component, action, context)` supports explicit application-defined actions. The event puts `{ name, action }` in a top-level `component` object and keeps `context` for developer metadata.
- **Conversion flows:** Developers can compose a flow today from named events. Dedicated form lifecycle helpers are future work.
- **Engagement and performance:** Active session time is captured per visit; feature usage is derived at the endpoint; and the Core Web Vitals LCP, CLS, and INP ship from the separate `tracky/performance` entry. [ADR 0003](docs/adr/0003-engagement-and-performance-measures.md) fixes every measure, payload, compute boundary, and bound.

## Component library direction

Tracky includes source for an initial set of reusable React UI primitives alongside the analytics SDK. The accepted distribution, styling, and accessibility conventions are recorded in [ADR 0001](docs/adr/0001-component-registry-and-styling.md). The primitives are not exported by the SDK package. `Button`, `Checkbox`, `Switch`, and `Select` send their documented action through the nearest provider and stay usable without one; `Input`, `Textarea`, and `Label` send no events. The `tracky` CLI installs the source: `tracky init` writes the project config and theme files, and `tracky add <component>` copies the component and its shared helper. The CLI validates the project's `tsconfig` alias and records the resolved registry commit in `tracky.lock.json`. The website playground renders the same source files and shows each documented action in a local event preview. The event contract is documented in [analytics-design.md](analytics-design.md).

## Capabilities and status

### In the current scaffold

- React provider and `useAnalytics` hook.
- Explicit named events with typed context and an optional JSON-safe `payload`.
- Explicit component interaction tracking that sends a `component_interaction` event with `{ name, action }` in a top-level `component` object.
- Documented component actions from the initial primitives: `button` activate, `checkbox` toggle, `switch` toggle, and `select` change.
- Optional page-view tracking for initial load and History API navigation, keyed by path plus query, so hash-only changes don't count. A `resolveRoute` option supports hash-based and custom routers and can return `null` to ignore a location; an ignored location is not a route visit, so page views, heat maps, and scroll depth record nothing for it and its activity is never attributed to the next route. Capture options can be turned on or off after mount, for example once consent is given.
- Independent, opt-in `capture` switches for page views, clicks, form submits, input changes, frustration clicks (3+ pointer clicks on one target within 1 second), cursor heat maps (`HeatMapSummary` payloads aggregated in the browser on a 10 × 10 grid), scroll depth (`ScrollDepthSummary`, the deepest 25% bucket per visit), and engagement (`EngagementSummary`, cumulative foreground time per visit). The earlier `capturePageViews` and `captureInteractions` flags are kept as deprecated aliases.
- Engagement time counts only while the tab is visible, on an accepted route, and with activity inside a 30-second idle threshold, so idle and hidden time never reach `activeMs`. One summary is sent per visit, cumulatively, on route change, page exit, and when the switch turns off. The measure costs one one-second interval and one passive activity listener set while the switch is on.
- Dependency-free route resolver helpers: `pathResolver({ basePath })`, `hashResolver()`, and `stripBasePath()` cover path, base-path, and hash routes, and `README.md` documents recipes for React Router, the Next.js App Router, and the Pages Router. `resolveRoute` stays the only integration hook, and the SDK imports no router.
- Frontend performance from the separate `tracky/performance` entry: `observePerformance(analytics)` sends one `performance` event when the page is hidden or unloaded, with a `PerformanceSummary` payload carrying only the LCP, CLS, and INP values the browser reported. It uses buffered observers, never polls, and adds nothing to the root entry, so an app that imports only `tracky` loads no performance code.
- Event buffering, JSON batch POST, a flush when the page is hidden or unloaded, bounded exponential retry for transient failures, a bounded buffer, and a delivery error callback.
- Random session ID held in `sessionStorage` when available. It is created on the first event, so a page that captures nothing and tracks nothing writes no browser storage.
- A documented consent pattern: render the provider with capture off, read the consent manager's stored decision, then apply the switches it allows. `README.md` carries a custom-banner recipe, a Cookiebot recipe, and a vendor-neutral fallback, and `analytics-design.md` records the privacy review of what is stored and sent before and after consent.

Initial primitive source is implemented and the `tracky` CLI installs it into a project, but the package is not published yet.

- A website playground that renders the initial primitives with variant, state, and snippet examples.
- A docs app at `website/docs/`, built from MDX files with a Vite + React app that reuses the playground toolchain and the registry tokens. It serves the sidebar, on-this-page table of contents, and previous/next pager from authored `meta.json` files, and it mounts no analytics provider. It has light and dark schemes over the same theme tokens, with a stored choice, the system preference on a first visit, and a pre-paint script. SDK and component pages cover install, tracking, capture switches, the event contract, privacy, delivery, and each primitive's props, action, and accessibility; search is still to come. Live examples render registry source against an in-page event preview that intercepts the SDK's request, so they show the documented actions without sending events anywhere.
- Initial source-owned primitives: `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, and `Select` in `registry/components/ui/`. They use native elements, preserve native props and refs, and emit only the documented component actions listed above, never values, labels, or props. Focus-visible, disabled, and `aria-invalid` states are styled consistently and documented with the source. Their colors, radii, and font family come from CSS variables in `registry/theme/`, with a Tailwind preset and documented setup so consumers can theme them. The `tracky` CLI installs the source into the project; the primitives are not included in the SDK package.

### Product direction, not yet complete

- Full-navigation behavior beyond the load that already counts as a page view.
- Conventions for components added after the initial seven.
- Frontend performance beyond LCP, CLS, and INP, such as TTFB, paint timings, and custom user timing.
- Conversion-flow helpers and richer typed event conventions.
- Deeper production privacy review beyond the documented consent pattern.
- Build, release, and package publishing workflow.
- Optional commercial licensing and verification service.

## Privacy and safety requirements

- Page-wide automatic tracking remains off by default. Tracky component actions are limited to documented component behavior and do not enable page-wide capture.
- Never collect input values, keystrokes, password data, contenteditable text, or arbitrary inner text.
- Ignore password and hidden inputs and support an explicit `data-analytics="ignore"` exclusion boundary.
- Do not introduce persistent cross-session identifiers or identity stitching without an explicit, documented opt-in design.
- Do not add cookies, remote vendor calls, or hidden telemetry endpoints.
- The integrator is responsible for consent, endpoint access control, data retention, and compliance with their applicable requirements.

## Licensing direction

The initial concept proposes a free individual/open-source tier and a paid commercial license for proprietary business use, possibly checked by a hosted verification service. This is a business direction, not an implemented SDK contract. Before enforcement is added, define license terms, the verification service, offline behavior, privacy implications, and what happens when the service is unavailable. The current SDK must not silently stop collecting events because a future licensing check has not been built or configured.

## Success criteria for an early release

- A React developer can install and configure Tracky with a short setup.
- A custom event reaches the developer's endpoint in the documented schema.
- Reusable React components can be integrated without hiding their interaction events or redirecting data to a Tracky-hosted service.
- Automatic capture is opt-in and does not include field values.
- A transient endpoint error does not block rendering or interaction.
- The package can be built and consumed through its documented export.

## Out of scope for the SDK

Tracky does not provide a hosted event collector, database, dashboard, identity graph, user replay, ad attribution, or guaranteed-delivery queue. It does not decide the integrator's consent policy or retain data on the integrator's behalf. The component library does not imply a hosted analytics backend or enable page-wide capture.

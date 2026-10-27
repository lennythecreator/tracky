# Tracky Product

## Product summary

Tracky is a React UI analytics library: it pairs reusable, analytics-aware UI components with a lightweight SDK for capturing product events and sending them to an endpoint the developer controls. It should be quick to integrate, backend agnostic, and small enough to stay out of the app it measures. The SDK exists in the current scaffold. Initial primitive source now lives in the repository registry tree; registry installation and component analytics wiring are still in progress.

## Users and problem

Tracky is for React developers and small product teams who need to understand page views, feature usage, and conversion flows without adopting a hosted analytics platform or building browser instrumentation from scratch. They bring the endpoint, storage, dashboards, retention policy, and access controls.

## Product principles

- **Developer-owned data path:** Events go directly to the endpoint configured by the developer.
- **Opt-in page-wide collection:** Page views and page-wide DOM, cursor, and scroll capture are disabled unless enabled by the integrator. Tracky components may emit their documented action events when used; this does not enable page-wide capture.
- **Useful defaults, explicit boundaries:** Tracky captures event metadata, never field contents or secrets.
- **Low overhead:** Buffer events and deliver asynchronously so tracking does not block normal UI work.
- **Backend agnostic:** The SDK defines a browser event contract, not a server or storage implementation.
- **Honest reliability:** Retries are bounded; durable storage and guaranteed delivery belong to the receiving service.
- **Useful UI building blocks:** Source-owned React primitives make common UI interactions easier to instrument. The initial inventory and package boundaries are recorded in ADR 0001; registry installation and component event wiring are still in progress.

## Core experience

A developer wraps the relevant client-side React tree in `AnalyticsProvider`, configures an endpoint or serverless function, and calls `useAnalytics().track(name, context)` for product-specific events. Once component event wiring is implemented, Tracky components will emit stable, documented action events when used. Developers separately opt in to page views and each page-wide capture type. Their endpoint receives batches and is responsible for validating, persisting, and querying events. The SDK workflow is implemented in the current scaffold; registry installation, component event wiring, and several approved tracking capabilities remain future work.

## Event model

An event has these fields:

| Field | Meaning |
| --- | --- |
| `eventType` | Stable event name such as `pageview`, `click`, or a developer-defined name. |
| `timestamp` | Client event time as an ISO-8601 UTC string. |
| `route` | Current relative path and query string. |
| `context` | Small, JSON-safe developer context and safe target metadata, such as an element tag, optional ID, explicit analytics name, or bounded class name. |
| `sessionId` | Random pseudonymous identifier scoped to the browser tab/session. |

The approved target contract also allows a top-level `component: { name, action }` for component interactions and a typed `payload` for structured data such as heat map summaries. See [analytics-design.md](analytics-design.md) for the complete target contract and capture rules. These fields are not all implemented in the current scaffold.

The event context is not a place for credentials, personal data, form values, arbitrary component props, or unrestricted DOM snapshots. Custom context is supplied by the application developer. Automatic capture records only basic element metadata; it must not read or send typed values.

## Core tracking capabilities

- **Navigation and views:** The target captures the initial page view and actual route changes, including back/forward, when enabled. Path plus query is the default; a route resolver supports apps with custom route state.
- **Element interactions:** The target offers separate opt-in capture for safe clicks, form submissions, input-change metadata, frustration clicks, cursor heat maps, and scroll depth. It never captures field values or text.
- **Component interactions:** Tracky components emit documented actions. `trackComponentEvent(component, action, context)` supports explicit application-defined actions. The target event puts `{ name, action }` in a top-level `component` object and keeps `context` for developer metadata.
- **Conversion flows:** Developers can compose a flow today from named events. Dedicated form lifecycle helpers are future work.
- **Engagement and performance:** The concept includes active-session and feature-usage signals plus frontend performance metrics. These metrics need defined measures, privacy bounds, and APIs before implementation; they are not current capabilities.

## Component library direction

Tracky includes source for an initial set of reusable React UI primitives alongside the analytics SDK. The accepted distribution, styling, and accessibility conventions are recorded in [ADR 0001](docs/adr/0001-component-registry-and-styling.md). The primitives are not exported by the SDK package. A registry installer and automatic component action tracking remain future work; the approved event contract is documented in [analytics-design.md](analytics-design.md).

## Capabilities and status

### In the current scaffold

- React provider and `useAnalytics` hook.
- Explicit named events with typed context.
- Explicit component interaction tracking with the current `component_interaction` shape (component and action currently live in `context`; migration to the target top-level component object remains to be implemented).
- Optional page-view tracking for initial load and History API navigation.
- Optional click, form-submit, and input-interaction metadata capture.
- Event buffering, JSON batch POST, bounded exponential retry, and a delivery error callback.
- Random session ID held in `sessionStorage` when available.

Initial primitive source has been implemented, but the reusable component library is not yet installable and its components do not emit action events. Cursor heat maps, frustration-click detection, per-capture switches, typed heat-map payloads, and the approved component event schema migration are also not implemented yet.

- Initial source-owned primitives: `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, and `Select` in `registry/components/ui/`. They use native elements, preserve native props and refs, and have no analytics side effects yet. The source is not installed through a registry CLI and is not included in the SDK package.

### Product direction, not yet complete

- Route adapters for popular routers and more complete full-navigation behavior.
- Registry manifest, installer, and consumer setup instructions for the initial primitives.
- Documented component action wiring through the Tracky provider.
- A component playground and conventions for any additional components.
- Engagement, active-session, and frontend performance measurements.
- Conversion-flow helpers and richer typed event conventions.
- A complete consent integration story and production privacy review.
- Build, release, and package publishing workflow.
- Optional commercial licensing and verification service.

## Privacy and safety requirements

- Page-wide automatic tracking remains off by default. Tracky component actions are limited to documented component behavior and do not enable page-wide capture.
- Never collect input values, keystrokes, password data, contenteditable text, or arbitrary inner text.
- Ignore password and hidden inputs and support an explicit `data-analytics="ignore"` exclusion boundary.
- Do not introduce persistent cross-session identifiers or identity stitching without an explicit, documented opt-in design.
- Do not add cookies, remote vendor calls, or hidden telemetry destinations.
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

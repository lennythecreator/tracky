# Tracky

A lightweight React analytics SDK that sends first-party events to an endpoint you control. The initial package foundation includes an explicit tracking hook, an opt-in automatic interaction capture mode, page-view capture, buffered delivery, retry with backoff, and a session-scoped anonymous ID.

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
      options={{ capturePageViews: true }}
    >
      {children}
    </AnalyticsProvider>
  )
}
```

The provider uses browser APIs after mounting, so it can be rendered inside a React app or a Next.js client boundary. In Next.js App Router, put it in a small Client Component and render that component from the server layout.

## Event shape

Events contain `eventType`, ISO UTC `timestamp`, relative `route`, a `context` object, and a random `sessionId` stored in `sessionStorage`. Call `analytics.trackComponentEvent(component, action, context)` from an explicit component action handler to send a `component_interaction` event. For example, the call above produces `component: "save_button"`, `action: "activate"`, and `location: "toolbar"` in `context`. Use stable component and action names; pass only small, JSON-safe metadata. Tracky does not inspect component props or read field values. The approved target contract places `{ name, action }` in a top-level `component` object; the current scaffold still writes both into `context`.

Explicit component events are sent when you call the method. The `captureInteractions` option controls only automatic DOM interaction capture.

Automatic capture records basic element metadata and never reads input values. Add `data-analytics="ignore"` to exclude a subtree; add `data-analytics-name="checkout_continue"` to give a control a stable event name.

The browser sends batches with `fetch` and `keepalive` when possible. Failed requests are retried with capped exponential backoff while the page remains open. For durable delivery, validate and queue events on your own endpoint.

## Component source

The initial source-owned primitives are in [`registry/components/ui/`](registry/components/ui/). They are standalone React source files that consumers can adapt in their own application; they are not exports from the `tracky` SDK package, and no registry installer is available yet. The components use Tailwind CSS classes and semantic theme tokens, so the consuming app must configure Tailwind. Component action tracking is still in progress; the current primitive source does not emit analytics events.

## Theming

Colors, radii, and font family come from CSS variables. [`registry/theme/tokens.css`](registry/theme/tokens.css) provides light-theme defaults, and [`registry/theme/tailwind-preset.cjs`](registry/theme/tailwind-preset.cjs) maps them to semantic Tailwind utilities. Import the stylesheet and add the preset (Tailwind v3) or the `@theme inline` block (Tailwind v4), then override the `--tracky-*` variables to theme the components. Typography inherits your application's font until you set `--tracky-font-sans`. See [`registry/theme/README.md`](registry/theme/README.md) for setup, dark-theme examples, and the token list.

## Privacy and security

Tracking is opt-in. Automatic interaction capture is off unless enabled. The SDK does not collect text typed into fields, and ignores password inputs, editable elements, and ignored subtrees. Review your consent and retention requirements before enabling collection. Never put secrets in event context. The endpoint must accept JSON POST requests from your app's origin.

## Development

```sh
npm install
npm run build
```


# Tracky

A lightweight React analytics SDK that sends first-party events to an endpoint you control. The initial package foundation includes an explicit tracking hook, an opt-in automatic interaction capture mode, page-view capture, buffered delivery, retry with backoff, and a session-scoped anonymous ID.

## Status

Early development. The public API and event schema may change before the first stable release. Hosted license verification and managed dashboards are not part of this repository foundation.

## Install

```sh
npm install tracky
```

## Quick start

```tsx
'use client'

import { AnalyticsProvider, useAnalytics } from 'tracky'

function SaveButton() {
  const analytics = useAnalytics()
  return <button onClick={() => analytics.track('save_clicked', { location: 'toolbar' })}>Save</button>
}

export function AppAnalytics({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProvider
      endpoint="https://your-api.example.com/events"
      options={{ capturePageViews: true, captureInteractions: true }}
    >
      {children}
    </AnalyticsProvider>
  )
}
```

The provider uses browser APIs after mounting, so it can be rendered inside a React app or a Next.js client boundary. In Next.js App Router, put it in a small Client Component and render that component from the server layout.

## Event shape

Events contain `eventType`, ISO UTC `timestamp`, relative `route`, a `context` object, and a random `sessionId` stored in `sessionStorage`. Automatic capture records basic element metadata and never reads input values. Add `data-analytics="ignore"` to exclude a subtree; add `data-analytics-name="checkout_continue"` to give a control a stable event name.

The browser sends batches with `fetch` and `keepalive` when possible. Failed requests are retried with capped exponential backoff while the page remains open. For durable delivery, validate and queue events on your own endpoint.

## Privacy and security

Tracking is opt-in. Automatic interaction capture is off unless enabled. The SDK does not collect text typed into fields, and ignores password inputs, editable elements, and ignored subtrees. Review your consent and retention requirements before enabling collection. Never put secrets in event context. The endpoint must accept JSON POST requests from your app's origin.

## Development

```sh
npm install
npm run build
```



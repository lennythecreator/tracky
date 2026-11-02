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

Events contain `eventType`, ISO UTC `timestamp`, relative `route`, a `context` object, and a random `sessionId` stored in `sessionStorage`. Component events also carry a top-level `component` object.

Call `analytics.trackComponentEvent(component, action, context)` from an explicit component action handler to send a `component_interaction` event. The call above produces `component: { name: "save_button", action: "activate" }` with `location: "toolbar"` in `context`. Use stable component and action names; pass only small, JSON-safe metadata. Tracky does not inspect component props or read field values.

Explicit component events are sent when you call the method. The `captureInteractions` option controls only automatic DOM interaction capture.

Automatic capture records basic element metadata and never reads input values. Add `data-analytics="ignore"` to exclude a subtree; add `data-analytics-name="checkout_continue"` to give a control a stable event name.

The browser sends batches with `fetch` and `keepalive` when possible. Failed requests are retried with capped exponential backoff while the page remains open. For durable delivery, validate and queue events on your own endpoint.

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

Tracking is opt-in. Automatic interaction capture is off unless enabled. The SDK does not collect text typed into fields, and ignores password inputs, editable elements, and ignored subtrees. Review your consent and retention requirements before enabling collection. Never put secrets in event context. The endpoint must accept JSON POST requests from your app's origin.

## Development

```sh
npm install
npm run lint
npm test
npm run build
```

`npm test` runs the Vitest suite in jsdom without network access. It checks the event envelope, batching and retry, and the privacy defaults: no capture without an opt-in, no field values, and no password, hidden, or ignored fields.


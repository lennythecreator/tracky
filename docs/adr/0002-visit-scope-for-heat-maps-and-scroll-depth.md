# ADR 0002: Visit scope for heat maps and scroll depth

**Status:** Accepted
**Date:** 2026-11-03

## Context

Heat maps and scroll depth both answer questions about one stay on one page: where the pointer went during this look at the page, and how far down this look reached. The SDK also has a `sessionId`, a random identifier for one browser tab that keeps existing while the person navigates, and a `route`, the path plus query the event was recorded under. Either would have been a usable grouping key, and both are already on the envelope.

They group the wrong things. A session covers every page the tab ever showed, so a summary keyed on it would merge visits and could not say how far down *this* page the person got before leaving. A route alone spans every visit the app has ever had, so it would merge separate stays and grow without bound.

## Decision

Measure these two signals per **visit**: one continuous stay on one accepted route.

- The SDK creates a fresh random `visitId` for each visit, exposes it in the `HeatMapSummary` and `ScrollDepthSummary` payloads, and never stores or reuses it.
- A visit begins when a route becomes current, and ends when the route changes or the page goes away. Returning to a route later is a new visit, with a new ID.
- A location the route resolver refuses starts no visit, so nothing is measured for it and its activity is never attributed to the next route.
- The receiving endpoint combines per-visit summaries into anything broader. The SDK sends visit-scoped data and stops there.
- `sessionId` stays on the envelope for coarse correlation across visits. Capture never reads it to decide what a measurement belongs to.

## Consequences

- A visit is bounded twice: by the route changing, and by the summary schedule. Heat maps send on route change, on page exit, and every 30 seconds, so a long visit produces consecutive periods that the endpoint sums by `visitId`. Scroll depth sends as the deepest 25% bucket grows, at most five events per visit.
- Visit-level questions are answerable without a durable session: "how far down this page did this visit reach" is a single payload.
- Cross-visit questions, such as the same page over a week, require the endpoint to aggregate by route, and correlating visits within one tab requires joining on the envelope's `sessionId`. Neither is the SDK's job, which keeps the SDK's own state independent of the session.
- A visit ID is not an identity. It stays random, is not persisted, and does not survive the page, which keeps the privacy boundary that forbids stitching activity across sessions.

## Considered options

- **Key on `sessionId`.** Rejected: it merges every page a tab showed, and the summary could no longer answer how far down one page one visit reached.
- **Key on `route` alone.** Rejected: it merges separate stays and grows without bound, and the endpoint cannot tell two visits apart in one payload.
- **Send each period with no visit scope.** Rejected: the endpoint would have to infer which periods belong to one stay, and a route change and a page exit look the same in a stream of independent summaries.

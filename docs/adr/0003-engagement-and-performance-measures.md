# ADR 0003: Engagement and performance measures

**Status:** Accepted
**Date:** 2026-11-17
**Issue:** [#37](https://github.com/lennythecreator/tracky/issues/37)

## Context

`product.md` lists engagement and performance as product direction and says the measures need defining before any capture code ships. Two questions had to be settled first: what each measure means and which side computes it, so the SDK stays a small sender and the endpoint keeps ownership of comparison and reporting; and how the code ships, so an app that wants only explicit events pays nothing for either feature.

Three existing constraints shape the decision:

- Visit scope from [ADR 0002](0002-visit-scope-for-heat-maps-and-scroll-depth.md) already groups heat maps and scroll depth into one continuous stay on one accepted route. Engagement time belongs to the same grouping.
- The privacy boundary forbids identity, cross-session identifiers, keystrokes, field values, and page text. Both features report bounded numbers only.
- The SDK has one runtime entry with React as its only peer dependency. Performance code that every app would download conflicts with that.

## Decision

### Measures

**Active session.** The foreground time one visit accumulates while a person is present. The SDK counts a second of a visit as active when all three hold:

1. `document.visibilityState` is `visible`. Time in a hidden tab never counts.
2. The window has had at least one activity signal within the idle threshold. A pointer press, a key press, a scroll, or a touch counts; Tracky reads nothing from those events.
3. The visit belongs to an accepted route, so an ignored location has no active time.

The idle threshold is 30 seconds. It is long enough that reading a long paragraph, watching a video, or thinking about a form does not break the count, and short enough that an abandoned tab stops accumulating. Time is counted in one-second steps from `performance.now()` deltas, so a delayed or throttled timer does not inflate the total.

The SDK reports two cumulative numbers per visit: `activeMs`, the time that passed all three conditions, and `foregroundMs`, the visible time including idle. Two numbers keep the report honest: `activeMs / foregroundMs` shows how much of the foreground a person actually spent, and the endpoint can answer either question without the SDK guessing. A resumed visit (hidden, then visible again on the same route) keeps its `visitId` and its totals.

**Feature usage.** Counted at the endpoint from events the SDK already sends; no new capture, no new event type. A feature use is one `component_interaction`, identified by `component.name` and `component.action`, or one developer-named event. Per visit, the endpoint can derive which features were used, how often, the order of first use, and the time from the visit's start to the first use. Comparing features across visits, routes, or weeks is the endpoint's job.

**Engagement figures the endpoint derives.** From existing events plus the engagement summary: visits per route, active time per visit and per route, events per active minute, distinct features per visit, the share of visits that used a given feature, and the foreground-to-active ratio. The SDK must not attempt figures that need identity or cross-session linking, such as return rates, cohorts, or per-person funnels.

**Performance.** Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Interaction to Next Paint (INP). Each page view reports one summary:

- LCP is the value of the last `largest-contentful-paint` entry for the page view.
- CLS is the sum of `layout-shift` entries without recent input. Input-driven shifts never count.
- INP is the 98th percentile of per-interaction durations, grouped by `interactionId` from `event` timing entries. Durations under 104 ms are ignored because they can never become the reported value.

### Compute boundary

| Measure | The SDK emits | The endpoint derives |
| --- | --- | --- |
| Active time | One `engagement` event per visit with `{ visitId, visitStartedAt, activeMs, foregroundMs }` | Active time per route, active share, trends, retention |
| Feature usage | Nothing beyond existing events | Feature counts, distinct features per visit, time to first use, comparisons |
| LCP, CLS, INP | One `performance` event per page view with `{ lcpMs?, cls?, inpMs? }` | Percentiles, route comparison, budgets, alerting |

Snapshot rules the endpoint must apply: the engagement summary is cumulative, so keep the largest `activeMs` per `visitId`; a performance summary carries only the metrics that were available, so an absent field is not zero.

The SDK computes no ranking, no percentile across visits, and no historical comparison. It sends the measurement and stops.

### Modular shape

- **Engagement ships in the SDK**, behind `capture.engagement`. It shares the visit machinery the SDK already has (the route observer, visit IDs, the accepted-location rule), and it costs one interval. A separate entry would duplicate that machinery for a few hundred bytes of benefit.
- **Performance ships from a separate `tracky/performance` entry** that exposes `observePerformance(analytics)`. It is not exported from the root, so an app that never imports it downloads none of it. There is no provider change and no second setup step: the app calls it once in an effect with the client from `useAnalytics()`.

### Volume and cost bounds

| Bound | Value |
| --- | --- |
| Engagement events | One per visit, sent when the visit ends and again only if its totals grew |
| Timers | One one-second interval, only while `capture.engagement` is on and the tab is visible |
| Listeners for engagement | One passive activity listener set that records a timestamp and reads no event data |
| Performance events | One per page view |
| Performance work | Buffered observers only: no polling, no interval, no per-frame work |
| Payload size | Four numbers and two identifiers at most |
| Root bundle | No performance code; the root entry must not import `tracky/performance` |

The activity listener is the one place this contract asks for more than the implementation ticket assumed. Idle time cannot be detected without an activity signal, and the alternative (counting every visible second) would report an abandoned tab as engaged. One listener set that stores a timestamp is the smallest way to keep the measure correct.

### Collected fields

| Field | Type | Why it identifies nobody |
| --- | --- | --- |
| `visitId` | random UUID | Generated per visit, never stored, never reused |
| `visitStartedAt` | ISO timestamp | Describes this visit's start, not a person |
| `activeMs`, `foregroundMs` | numbers | Durations within one visit |
| `lcpMs`, `cls`, `inpMs` | numbers | Rounded timings and ratios for one page view |
| `route` | string | Path and query from the route resolver, already on every event |

Not collected: element selectors or URLs from performance entries, entry bodies, page text, keystrokes, field values, pointer coordinates, session-spanning identifiers, or any user or account identifier.

### DX budget

A reviewer can check these four rules:

- No new required setup. Engagement is one key in `capture`; performance is one import and one effect call.
- Nothing runs by default. Both stay off until the integrator enables them, and neither enables any other capture switch.
- No polling. No per-frame, per-scroll, or per-event timer, no interval while the tab is hidden, and no work in the input path.
- No bundle cost for apps that never import `tracky/performance`. The root entry's export map and build output must not include it.

## Consequences

- `analytics-design.md` gains the engagement and performance contract, and `README.md` names both surfaces only once their implementation ships.
- Tracking tickets #39 and #40 implement against this contract. Neither may widen a payload, add a timer, or add a listener beyond the bounds above without a new decision record.
- The endpoint owns the aggregation rules in the compute-boundary table, including the largest-snapshot rule for engagement and absent-versus-zero for performance.
- Counting one visit's active time costs one interval and one passive listener set, both removed when the switch turns off.
- The package gains a second entry point. The build, the `exports` map, and the release notes must keep the root entry free of performance code.

## Out of scope

Route adapters and full-navigation behavior beyond the load that already counts as a page view (tracked separately as #41), conversion-flow helpers, licensing verification, and any hosted reporting. Also out: TTFB, FCP, FID, and TBT, custom user timing marks and measures, scroll-percentage and per-frame instrumentation, idle-time histograms, per-element performance, session-level identity, and any measure that needs to recognize a person.

## References

- [Analytics design contract](../../analytics-design.md)
- [Product scope and status](../../product.md)
- [ADR 0002: Visit scope for heat maps and scroll depth](0002-visit-scope-for-heat-maps-and-scroll-depth.md)
- [web.dev: Core Web Vitals](https://web.dev/articles/vitals)

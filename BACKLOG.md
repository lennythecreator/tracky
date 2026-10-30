# Tracky component backlog

This is the ordered, agent-ready backlog for the first Tracky component release. It follows the approved analytics contract in `analytics-design.md` and the product boundary in `product.md`.

GitHub issues track these tickets. T-001 through T-006 map to issues [#1](https://github.com/lennythecreator/tracky/issues/1) through [#6](https://github.com/lennythecreator/tracky/issues/6), and the analytics tickets below map to [#9](https://github.com/lennythecreator/tracky/issues/9) through [#16](https://github.com/lennythecreator/tracky/issues/16). This backlog stays the ordered implementation plan; `product.md` remains the source of truth for product scope and status.

## Milestone: primitive component foundation

### T-001 — Define the component source and distribution model

**Priority:** First

**Goal:** Choose how developers adopt and customize Tracky components before creating component APIs.

**Scope:**

- Decide whether components are shipped as an npm package, copied into consumer projects through a registry/CLI, or supported through both paths.
- Define how the component library relates to the existing analytics SDK and website in this repository.
- Choose the styling contract and runtime dependency policy.
- Define component file, export, prop, variant, size, and class customization conventions.
- Define accessibility requirements and the stable analytics component/action naming convention.
- Preserve a clear boundary between Tracky's reusable component code and the developer's application code.

**Acceptance criteria:**

- A short architecture decision record documents the chosen distribution and styling model, tradeoffs, and package boundaries.
- The first primitive inventory and public import examples are approved.
- The design supports developer customization and does not require a hosted Tracky service.
- The plan explains how consumers receive styles and how the component action reaches the configured Tracky endpoint.

**Reference:** [shadcn component configuration](https://ui.shadcn.com/docs/components-json), [shadcn registry guide](https://ui.shadcn.com/docs/registry/getting-started).

### T-002 — Establish the primitive component foundation

**Priority:** After T-001

**Goal:** Add the shared style, accessibility, and composition foundation that core primitives use.

**Scope:**

- Implement only the styling helpers, tokens, and shared types required by the selected architecture.
- Define consistent focus-visible, disabled, invalid, and size/variant behavior.
- Ensure components compose with native elements and preserve standard React event handlers and refs as appropriate.
- Keep browser-only behavior out of module initialization and render-time code.

**Acceptance criteria:**

- The foundation is small and does not add unnecessary runtime dependencies.
- Shared styles and conventions are documented with an example.
- Keyboard focus and disabled/invalid states have visible, accessible behavior.
- The package remains compatible with React 18+ and the repository's ESM/NodeNext setup.

### T-003 — Build the first core primitives

**Priority:** After T-002

**Goal:** Implement the first small set of reusable, customizable controls.

**Initial inventory:**

- `Button`
- `Input`
- `Textarea`
- `Label`
- `Checkbox`
- `Switch`
- `Select`

Confirm this inventory in T-001 before implementation. Keep the first pass focused on these primitives; defer overlays, menus, tables, and complex composed widgets.

**Acceptance criteria:**

- Each primitive has a typed, documented API and usable default styling.
- Controls support controlled and uncontrolled use where the native interaction model calls for it.
- Accessible labels, keyboard operation, focus state, disabled state, and invalid state work as expected.
- Components preserve caller-provided handlers and safe native attributes.
- Input values are never read or sent to analytics automatically.

**Reference:** [shadcn Input](https://ui.shadcn.com/docs/components/base/input), [shadcn Checkbox](https://ui.shadcn.com/docs/components/base/checkbox).

## Milestone: analytics-aware components

### T-004 — Emit documented actions from Tracky primitives

**Priority:** After T-003

**Goal:** Make Tracky-owned components emit their documented interaction events through the configured analytics client.

**Scope:**

- Use the top-level `component: { name, action }` event shape from `analytics-design.md`.
- Define stable action names for the initial primitives (for example, button activation, checkbox toggle, and select change) without including selected values or input contents.
- Treat Enter/Space activation as the control's normal action; never record key names or presses.
- Suppress a duplicate generic click when the same Tracky component interaction is also observed by page-wide click capture.
- Preserve ordinary React handlers and behavior when analytics is absent or disabled.

**Acceptance criteria:**

- Only documented Tracky component actions emit component events.
- The event is sent only through the developer-configured endpoint.
- No props, labels, input contents, selected values, or secrets are inferred or attached automatically.
- Page-wide capture remains independently opt-in.

### T-005 — Build a component playground for the primitive set

**Status:** Complete. The playground renders the registry source with the SDK provider and a local event preview, and it ships with the site at `https://tracky-ivory.vercel.app/playground/`. The keyboard pass covered every tab stop in Chromium: each control is reachable in document order with a visible focus ring, Enter and Space activate `Button`, Space toggles `Checkbox` and `Switch`, arrow keys change `Select`, and every disabled example is skipped by Tab. Typing into `Input` or `Textarea` produces no event.

**Priority:** After T-003; can proceed alongside T-004
**GitHub:** [#5](https://github.com/lennythecreator/tracky/issues/5)

**Goal:** Let developers explore the primitive components and their analytics behavior on the Tracky website.

**Scope:**

- Show live examples, key variants/states, and concise usage snippets for each shipped primitive.
- Include a safe event preview for documented component actions using illustrative data.
- Explain which events are emitted and make clear that page-wide capture remains off until configured.
- Keep the playground separate from the SDK runtime package.

**Acceptance criteria:**

- Examples use the actual component exports and current APIs.
- Keyboard and disabled states can be explored.
- The event preview uses sample data and does not send telemetry to a Tracky-hosted endpoint.

## Milestone: component distribution

### T-006 — Implement the chosen component distribution path

**Status:** Complete. The `tracky` CLI in `src/cli/` installs the primitives as source: `init` writes the theme files and stylesheet import, and `add <component>` copies the component with its shared `cn` helper, recording the resolved commit. Installed files read the nearest provider through `useAnalyticsOptional()` and send only to the configured endpoint.

**Priority:** After T-001 through T-004
**GitHub:** [#6](https://github.com/lennythecreator/tracky/issues/6)

**Goal:** Make the primitive source easy for developers to adopt in the form chosen by T-001.

**Scope:**

- If source-copy/registry is selected, publish structured component registry entries and a small installer workflow inspired by shadcn's model.
- If package distribution is selected, publish clear package exports and styling setup with developer customization points.
- Keep the analytics SDK and component library boundaries explicit.

**Acceptance criteria:**

- A React developer can install or copy the initial primitives using the documented path.
- The installed components send events only through the developer's configured Tracky endpoint.
- Package/registry examples, website playground, and implementation all match.

## Milestone: analytics tracking

These tickets follow the component foundation and use `analytics-design.md` as their source of truth. Do not implement page-wide capture as a side effect of installing or using a primitive.

### T-007 — Add analytics test harness and privacy coverage

**Status:** Complete. `npm test` runs Vitest with jsdom from `test/`, offline, and CI runs it with `npm run lint` and `npm run build` on every pull request. The suite covers the envelope, batching, scheduled flush, bounded retry, `onDeliveryError`, `shutdown()`, the opt-in defaults, and the privacy boundary, and it fails when a field value, password, hidden input, or ignored subtree reaches a request body.

**Priority:** After T-002
**GitHub:** [#9](https://github.com/lennythecreator/tracky/issues/9)

**Goal:** Add a browser-like test harness so analytics behavior and privacy boundaries can be verified before expanding capture.

**Scope:**

- Choose a small test runner and DOM environment (for example Vitest with jsdom). Keep them in `devDependencies` and leave runtime dependencies unchanged.
- Add a test script alongside `build` and `lint`, and document the command.
- Cover the current envelope: `eventType`, ISO UTC `timestamp`, path-plus-query `route`, merged `context`, and reuse of the tab-scoped `sessionId`.
- Cover delivery: batch size, scheduled flush, bounded retry, `onDeliveryError`, and `shutdown()` flushing.
- Cover privacy and defaults: no capture when options are absent, no field values, no password or hidden inputs, no contenteditable text, and the `data-analytics="ignore"` boundary.
- Exercise provider behavior with fake timers and DOM events rather than a live browser.

**Acceptance criteria:**

- `npm test` runs offline and is the documented command.
- The suite fails if a field value, keystroke, password value, or ignored subtree is captured.
- The suite fails if page views or page-wide interaction capture run without an opt-in.
- No runtime dependency is added to the published package.

### T-008 — Migrate analytics events to the approved envelope

**Status:** Complete. Component events already used the top-level `component` object. `track(eventType, context, payload)` now sends a JSON-safe `payload` (`JsonValue`) whose shape callers can name with a type parameter.

**Priority:** After T-007
**GitHub:** [#10](https://github.com/lennythecreator/tracky/issues/10)

**Goal:** Align the event envelope with the approved contract so component and structured events share one schema.

**Scope:**

- Add optional `component: { name, action }` and `payload` fields to the event type. `payload` must be typed per structured event, not stored in `context`.
- Move `trackComponentEvent()` output from `context` into the top-level `component` object; keep developer metadata and safe target metadata in `context`.
- Define the public way to pass a typed payload (for example `track(eventType, context, payload?)` or an options object) before heat maps need it.
- Keep the configured endpoint, session ID rules, and delivery behavior unchanged.
- Update `README.md`, `product.md`, `analytics-design.md` status notes, and add tests.

**Acceptance criteria:**

- Component events match the approved envelope with no `component` or `action` in `context`.
- Structured events have a concrete payload type and never put grid or other structured data in `context`.
- Existing context metadata still merges as documented.
- Docs and tests describe the shipped shape, not a future one.

### T-009 — Split page-wide capture into independent opt-in switches

**Status:** Complete. `options.capture` has `pageViews`, `clicks`, `formSubmits`, and `inputChanges`, each off by default and attached only while on. `capturePageViews` and `captureInteractions` remain as deprecated aliases; an explicit `capture` key wins. Each category lives in `src/capture/`.

**Priority:** After T-008
**GitHub:** [#11](https://github.com/lennythecreator/tracky/issues/11)

**Goal:** Replace the single interaction switch with independent page-wide capture categories, all off by default.

**Scope:**

- Define grouped options for page views, clicks, form submissions, input changes, frustration clicks, cursor heat maps, and scroll depth. Decide and document how the previous `captureInteractions` option migrates.
- Attach listeners only for enabled categories. Mounting a provider or using a Tracky component must not enable page-wide capture.
- Clicks: safe element metadata only; a link click is not navigation unless the route changes.
- Form submissions: event metadata only, never submitted values.
- Input changes: metadata only; never values, text, or keystrokes. Skip password and hidden inputs, contenteditable, and ignored subtrees.
- Honor `data-analytics="ignore"` in every category.

**Acceptance criteria:**

- Enabling one category does not enable any other.
- With all categories off, the SDK attaches no page-wide listeners.
- Input and form capture never read or send values.
- Defaults, option names, and privacy behavior are documented and tested.

### T-010 — Capture navigation with an optional route resolver

**Status:** Complete. `resolveRoute(location)` returns the route or `null` and also sets each event's `route`. One shared observer in `src/capture/navigation.ts` wraps the History API once for every subscriber, checks one task after a change, and restores the originals when the last subscriber leaves.

**Priority:** After T-009 (page-view switch)
**GitHub:** [#12](https://github.com/lennythecreator/tracky/issues/12)

**Goal:** Capture the initial page view and real route changes, including back/forward, with support for custom routers.

**Scope:**

- Track the initial page view when page-view capture is enabled.
- Observe `pushState`, `replaceState`, and `popstate` without producing duplicate page views, and clean up listeners on unmount.
- Use path plus query as the default route. A developer-provided resolver supports hash-based or custom route state and can return the current route or `null` to ignore a change.
- Ignore hash-only changes unless the resolver identifies them as real route changes.
- A link click without a route change stays a click, not a page view.
- Add tests with stubbed history and location.

**Acceptance criteria:**

- Initial load, back, and forward produce one page view each.
- A resolver enables hash-based routing; without one, hash-only changes are ignored.
- Repeated or intermediate navigation does not emit duplicate page views.
- No route data beyond path plus query (or the resolver's output) is sent.

### T-011 — Detect frustration clicks

**Status:** Complete. `capture.frustrationClicks` sends one `frustration_click` per burst of 3+ pointer clicks within 1 second on one live element, or across elements that share a `data-analytics-name`. It listens independently of `capture.clicks`.

**Priority:** After T-009 (click switch)
**GitHub:** [#13](https://github.com/lennythecreator/tracky/issues/13)

**Goal:** Emit a frustration-click event when one live element is clicked repeatedly, independently of ordinary click capture.

**Scope:**

- Count 3 or more clicks on the same live DOM element instance within a 1-second window as one frustration-click event.
- Use `data-analytics-name` for stable grouping across instances; do not build or transmit deep DOM paths.
- Never infer frustration from labels, text, DOM ancestry, or whether the page responded.
- Let the detector consume click signals internally when enabled, even when ordinary click events are disabled.
- Honor `data-analytics="ignore"` and the separate capture switch.
- Keep the event metadata within the safe target fields already documented.
- Add tests with fake timers and DOM events.

**Acceptance criteria:**

- Two clicks produce no event; three within one second produce one.
- Clicks on different elements, or spaced beyond the window, do not combine.
- Grouping by `data-analytics-name` works across instances; ignored subtrees never count.
- Enabling the detector does not enable ordinary click events.

### T-012 — Aggregate cursor heat map summaries

**Status:** Complete. `capture.heatMaps` aggregates `pointerMs`, `clicks`, and `focusEntries` on a 10×10 viewport grid in `src/capture/heatmap.ts`. The payload type is `HeatMapSummary`.

**Priority:** After T-010
**GitHub:** [#14](https://github.com/lennythecreator/tracky/issues/14)

**Goal:** Build per-visit, per-route heat map summaries on a normalized grid without collecting raw cursor data.

**Scope:**

- Use a 10x10 grid normalized to the visible viewport.
- Sample mouse and pen positions every 250 ms while the pointer is within the visible page, and accumulate sampled time per region.
- Count clicks per region as a separate measure. Touch clicks may count; touch movement must not count as cursor movement.
- Count keyboard focus entries per region without recording the key used to move focus.
- Define a concrete `HeatMapSummary` payload type with route/visit scope and grid measures. Do not put the grid in `context`.
- Aggregate in the browser; never send raw cursor trails or precise coordinates.
- Add tests with fake timers and pointer events.

**Acceptance criteria:**

- Only aggregate grid data is produced; no coordinates, trails, or pointer identifiers are available in the payload.
- Sampling is bounded to 250 ms, stops when the pointer leaves, and resets per route/visit.
- Focus entries never include key names or keystrokes.
- Collection runs only when the cursor heat map switch is on.

### T-013 — Deliver heat map summaries on route change and exit

**Status:** Complete. Summaries are sent on route change (recorded against the route the visitor left), on `pagehide` or hidden `visibilitychange`, every 30 seconds, and when capture stops. Each send resets the period, so grids are never resent.

**Priority:** After T-012
**GitHub:** [#15](https://github.com/lennythecreator/tracky/issues/15)

**Goal:** Send aggregated heat map summaries through the existing bounded delivery path.

**Scope:**

- Send the current route's summary on route change, on page exit (`pagehide` and hidden `visibilitychange`), and on a bounded periodic flush for long visits.
- Define and document the periodic interval and how a summary is scoped to one route/visit.
- Keep delivery asynchronous and best-effort; do not block rendering, input, or navigation.
- Use only the configured endpoint and existing queue/retry behavior. The endpoint combines per-visit summaries into cross-visit heat maps.
- Clear or reset the summary after sending so repeat flushes do not duplicate grid data.
- Add tests with fake timers for route change, exit, and periodic delivery.

**Acceptance criteria:**

- A summary is delivered at most once per flush scope; repeat flushes do not resend the same grid.
- Exit and route-change sends fit within the existing retry limits.
- No raw cursor data or additional destination is introduced.
- Interval and payload scope are documented alongside the heat map payload type.

### T-014 — Capture scroll depth independently of heat maps

**Priority:** After T-009; independent of T-012 and T-013
**GitHub:** [#16](https://github.com/lennythecreator/tracky/issues/16)

**Goal:** Add a separate, opt-in scroll-depth signal that does not depend on cursor heat maps.

**Scope:**

- Define a concrete, bounded scroll-depth measure and payload, such as the deepest percentage bucket reached per route/visit. Do not collect raw scroll positions or page text.
- Use its own capture switch; do not couple it to click, cursor heat map, or page-view settings.
- Send the summary on route change and page exit through the existing delivery path, and define whether a periodic flush is needed.
- Keep the measure per route/visit and avoid unbounded event volume.
- Add tests for the switch, summary calculation, and delivery scope.

**Acceptance criteria:**

- Scroll depth can be enabled with every other page-wide category off.
- The payload contains only a bounded summary, with no raw positions, text, or DOM paths.
- The measure resets per route/visit and is documented with its payload type.
- Enabling it does not enable cursor heat maps or any other capture.

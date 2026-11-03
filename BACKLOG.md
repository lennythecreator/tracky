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

That pass is now automated: `test/playground-keyboard.test.ts` starts the playground's Vite server, drives the locally installed Chrome through `puppeteer-core`, and asserts the same claims on every run of `npm test`. It downloads no browser, and it fails with an actionable message when Chrome or `CHROME_PATH` is missing.

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
- Attach capture listeners only for enabled categories. Mounting a provider or using a Tracky component must not enable page-wide capture.
- Clicks: safe element metadata only; a link click is not navigation unless the route changes.
- Form submissions: event metadata only, never submitted values.
- Input changes: metadata only; never values, text, or keystrokes. Skip password and hidden inputs, contenteditable, and ignored subtrees.
- Honor `data-analytics="ignore"` in every category.

**Acceptance criteria:**

- Enabling one category does not enable any other.
- With all categories off, the SDK attaches no page-wide capture listeners. The always-on `pagehide` and `visibilitychange` listeners belong to delivery, not capture: they read no DOM data, create no events, and exist so buffered explicit events still leave before the page closes.
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

**Status:** Complete. Summaries are sent on route change (recorded against the route the visit left), on `pagehide` or hidden `visibilitychange`, every 30 seconds, and when capture stops. Each send resets the period, so grids are never resent.

**Priority:** After T-012
**GitHub:** [#15](https://github.com/lennythecreator/tracky/issues/15)

**Goal:** Send aggregated heat map summaries through the existing bounded delivery path.

**Scope:**

- Send the current route's summary on route change, on page exit (`pagehide` and hidden `visibilitychange`), and on a bounded periodic flush for long visits.
- Define and document the periodic interval and how a summary is scoped to one route/visit.
- Keep delivery asynchronous and best-effort; do not block rendering, input, or navigation.
- Use only the configured endpoint and existing buffer/retry behavior. The endpoint combines per-visit summaries into cross-visit heat maps.
- Clear or reset the summary after sending so repeat flushes do not duplicate grid data.
- Add tests with fake timers for route change, exit, and periodic delivery.

**Acceptance criteria:**

- A summary is delivered at most once per flush scope; repeat flushes do not resend the same grid.
- Exit and route-change sends fit within the existing retry limits.
- No raw cursor data or additional endpoint is introduced.
- Interval and payload scope are documented alongside the heat map payload type.

### T-014 — Capture scroll depth independently of heat maps

**Status:** Complete. `capture.scrollDepth` sends a `ScrollDepthSummary` with the deepest 25% bucket per route visit. It sends on route change, page exit, and when capture stops, and only when the visit got deeper, so a visit sends at most five events. There is no periodic flush.

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

### T-015 — Define engagement and performance measures

**Status:** Open. Defines active session, feature usage, and the LCP, CLS, and INP measures, plus the compute boundary and the bundle budget. No capture code ships in this ticket.

**Priority:** Before any engagement or performance capture; independent of route adapters and conversion helpers
**GitHub:** [#37](https://github.com/lennythecreator/tracky/issues/37)

**Goal:** Decide and document what Tracky measures for engagement and performance, where each measure is computed, and the limits that keep capture cheap, before any capture code exists.

**Scope:**

- Define the measures: active session (what counts as active, whether idle time is excluded and by what threshold), feature usage, and the engagement figures the endpoint can derive from events Tracky already sends.
- Fix the compute boundary for each measure: what the SDK emits and what the endpoint derives. The endpoint owns cross-visit comparison, dashboards, and retention.
- Choose the modular shape: one `capture.engagement` switch for foreground time, and LCP, CLS, and INP behind a separate `tracky/performance` import so an app that never imports it loads no performance code.
- Define payload types and volume bounds: one foreground-time summary per visit and one performance summary per page view. No polling, no per-frame or per-scroll timers, and at most one added timer while a tab is visible.
- State the privacy bounds: no identity, no cross-session identifiers, no keystrokes, field values, or text, and no raw event streams. Bounded numbers only.
- Record the decision in ADR 0003 and update `product.md`, `analytics-design.md`, and `README.md` wherever an API surface is named.
- Name what stays out: route adapters, conversion-flow helpers, and licensing verification.

**Acceptance criteria:**

- A written definition of active session, feature usage, and each engagement measure, with its computation side and its limits.
- LCP, CLS, and INP named as the performance measures in scope; every other performance measure explicitly out.
- The DX budget stated as a rule a reviewer can check: no new required setup, nothing captured by default, no polling, and no bundle cost for apps that never import `tracky/performance`.
- A recorded list of collected fields per measure, confirming that none identifies a person or spans sessions.
- No runtime capture code; the event contract is defined for the follow-up implementation tickets.
- ADR 0003 records the compute boundary and the modular entry decision.

### T-016 — Document the consent integration and defer analytics storage until consent

**Status:** Open. Makes the SDK store nothing before consent and documents one copyable consent pattern. Nothing shipped yet.

**Priority:** After T-015; independent of route adapters and conversion helpers
**GitHub:** [#38](https://github.com/lennythecreator/tracky/issues/38)

**Goal:** Give developers one consent pattern they can copy, and make the SDK store nothing before consent, so the opt-in promise holds for storage as well as for capture.

`getSessionId()` currently writes `ui-analytics-session-id` to `sessionStorage` when the client is created, before any consent decision. Nothing is captured, but a strict review still has to explain the write.

**Scope:**

- Defer the session ID: create or read it on the first captured event rather than at client creation. Keep it random and session-scoped; no cookies, no cross-session identifier, no identity.
- Document the pattern: render the provider without capture switches, then apply them once the consent manager reports a persisted decision. Include a custom-banner recipe, one named-manager recipe (Cookiebot's `CookieConsent` callback), and a vendor-neutral paragraph.
- Name the trap: consent must come from the manager's stored decision, so a click that a reload forgets cannot start capture.
- Record the privacy review as a table: stored and sent fields before and after consent, what the endpoint owns, and what Tracky does not decide.
- Update `analytics-design.md`, `README.md`, and `product.md` in the same change.
- Add tests for the deferral and for the switch-on-after-consent path.

**Acceptance criteria:**

- No `sessionStorage` write when nothing is captured and `track()` is never called.
- The session ID stays random and tab-scoped, with no cookie, cross-session identifier, or identity.
- A copy-paste recipe exists for a custom banner and one named manager, plus a vendor-neutral paragraph.
- The guide states that capture is off by default and that consent comes from a persisted decision.
- The privacy review lists every stored and sent field before and after consent.
- `product.md` drops the consent story from missing direction once this ships.

### T-017 — Capture active session time behind its own switch

**Status:** Open. Blocked by [#37](https://github.com/lennythecreator/tracky/issues/37) until the measures, idle rule, and payload fields are defined.

**Priority:** After T-015
**GitHub:** [#39](https://github.com/lennythecreator/tracky/issues/39)

**Goal:** Send a bounded foreground-time summary per route visit behind its own switch, without identity and without a second API for developers to learn.

**Scope:**

- Add `capture.engagement`, off by default, enabling nothing else.
- Count only while the tab is visible, with at most one interval, and exclude idle time by the T-015 rule.
- Send an `EngagementSummary` scoped to one route visit on route change, page exit, and capture stop, at most once per visit.
- Ignored locations start no visit and send nothing.
- Document the switch, payload, and idle rule; add tests for the switch, visibility cycles, ignored locations, and unmount.

**Acceptance criteria:**

- Hidden time never counts toward `activeMs`, and several hide/show cycles accumulate correctly.
- One summary per visit with bounded numeric fields only.
- No timer or listener is added while the switch is off.

### T-018 — Ship Core Web Vitals from a separate performance entry

**Status:** Open. Blocked by [#37](https://github.com/lennythecreator/tracky/issues/37) for the in-scope measures and their bounds.

**Priority:** After T-015
**GitHub:** [#40](https://github.com/lennythecreator/tracky/issues/40)

**Goal:** Send LCP, CLS, and INP once per page view from a `tracky/performance` entry, so apps that never import it pay nothing.

**Scope:**

- Expose `observePerformance(analytics)` from `tracky/performance`, called once in an effect with the client from `useAnalytics()`.
- Use `PerformanceObserver` for the three measures. No polling, no intervals, no module-load browser access.
- Send one `performance` event per page view with only the metrics that are available; do nothing in a browser without the APIs.
- Add the entry to `exports` and `files`; confirm the default entry does not pull it in.
- Document the import, payload, and support; test with a stubbed observer.

**Acceptance criteria:**

- Importing only `tracky` loads no observer code.
- One event per page view with no raw entries, selectors, or URLs.
- The returned cleanup disconnects every observer.

### T-019 — Make route resolvers easy for common routers

**Status:** Open. The resolver hook exists; this ticket adds helpers and recipes.

**Priority:** After T-010; independent of the engagement tickets
**GitHub:** [#41](https://github.com/lennythecreator/tracky/issues/41)

**Goal:** Make common routers one documented step instead of a hand-written resolver, without adding a router dependency.

**Scope:**

- Ship dependency-free helpers for path-only routes, hash routes, and a base path.
- Document recipes that feed router state into `resolveRoute` for React Router, the Next.js App Router, and the Pages Router.
- Show why passing the router's location beats reading `window.location`, which can miss a client-side change.
- Test the helpers and the recipe shapes; keep `resolveRoute` the only integration hook.

**Acceptance criteria:**

- No dependency or peer dependency is added, and nothing imports a router package.
- The hash helper produces one page view per hash change; the path-only helper still ignores hash changes.
- Recipes name the router versions they target.

**Out of scope:** full-navigation behavior beyond the load that already counts as a page view.

### T-020 — Define conventions for components added after the first seven

**Status:** Open. Documents the contract the next primitives follow.

**Priority:** Before the next primitive
**GitHub:** [#42](https://github.com/lennythecreator/tracky/issues/42)

**Goal:** Write down what a new primitive must satisfy, so the conventions the first seven established survive the next seven.

**Scope:**

- Analytics contract: lowercase names, one action per control behavior, the `data-tracky-component` marker, documented actions, and no values, labels, props, or text.
- Registry contract: item type, files, `requires` and `dependencies`, theme tokens instead of palette values, and a recorded reason for any runtime dependency.
- Accessibility bar: native element where one exists, label association, keyboard operation, visible focus, disabled and invalid states.
- Test and surface bar: a component test per documented action and for the no-value rule, keyboard expectations where they apply, and a playground demo with a snippet.
- One conventions document, linked from `AGENTS.md`, `registry/components/ui/README.md`, and this file, pointing at ADR 0001.

**Acceptance criteria:**

- One document exists, every requirement is checkable, and each matches what the shipped seven already do.
- ADR 0001 is referenced and not contradicted.
- No component or registry entry is added here.

### T-021 — Scaffold the docs app and record the docs architecture

**Status:** Open. Adds the docs surface at `/docs/`; no page content yet.

**Priority:** Before the rest of the docs track
**GitHub:** [#43](https://github.com/lennythecreator/tracky/issues/43)
**Background:** [website/research/docs-site-patterns.md](website/research/docs-site-patterns.md) compares shadcn/ui, TanStack Query, Fumadocs, Starlight, and VitePress against this repository.

**Goal:** Stand up one Vite + React app whose pages are MDX files, reusing the playground toolchain and the registry tokens, and record why that stack beat the alternatives.

**Scope:**

- `website/docs/` with source in `app/` and output in `dist/`, mirroring the playground; `dev:docs` and `build:docs` scripts that typecheck first.
- Routes from MDX via `import.meta.glob`; frontmatter for title and description; `meta.json` for authored section order.
- One set of chrome: sectioned sidebar, on-this-page TOC, previous/next pager, mobile drawer, skip link.
- Existing Tailwind and CSS variables only; no new palette.
- `vercel.json` builds docs with a client-route fallback; landing page and playground link to `/docs/`.
- ADR 0004 records the choice, rejected options, and the no-per-page-HTML trade-off.
- CI builds docs; `product.md`, `README.md`, and `website/README.md` record the surface.

**Acceptance criteria:**

- An index page and one nested page prove routing, order, TOC, and the pager.
- A content file missing from `meta.json` fails the build naming the file.
- The docs site mounts no provider and makes no request, and `exports`/`files` are unchanged.
- Every new dependency is a devDependency, and ADR 0004 exists.

### T-022 — Define the docs authoring contract and validate it in CI

**Status:** Open.

**Priority:** After T-021
**GitHub:** [#44](https://github.com/lennythecreator/tracky/issues/44)

**Goal:** Make a page predictable to write and review, and catch broken structure in CI rather than in production.

**Scope:**

- Frontmatter contract: required `title` and `description`, optional `order`, `since`, and `status`.
- MDX components: `Callout`, `Steps`, `Kbd`, `PropsTable`, `PageHeader`, each documented with a usage example.
- Unique, stable heading slugs so TOC entries and deep links resolve.
- `npm run check:docs` in CI, failing on missing frontmatter, files unlisted or listed twice in `meta.json`, meta entries with no file, duplicate slugs, and dead internal links or anchors.

**Acceptance criteria:**

- Each failure mode has a fixture that fails with the file, line, and reason.
- The check runs offline with no browser and no network.
- Routes come only from a validated table, never from runtime filesystem discovery.

### T-023 — Add build-time highlighted, copyable code blocks

**Status:** Open.

**Priority:** After T-021
**GitHub:** [#45](https://github.com/lennythecreator/tracky/issues/45)

**Goal:** Make every example copyable and readable, with highlighting that costs the browser nothing.

**Scope:**

- Shiki at build time with one theme derived from the landing page palette; inline code from the same tokens.
- `CodeBlock` with an optional filename label, a copy button with an announced success state, and optional highlighted lines.
- `CodeTabs` for one change expressed several ways, as a real tablist with arrow-key support.
- Clipboard failure announced, no clipboard call on mount, and no highlighter shipped to the client.

**Acceptance criteria:**

- The build emits no highlighter chunk; the client code is copy and tabs only.
- Copied text matches the source exactly, including indentation.
- Tabs work with arrows, Home, and End; a long line scrolls inside the block without widening the page.

### T-024 — Render live component examples in docs pages

**Status:** Open.

**Priority:** After T-021; before T-027
**GitHub:** [#46](https://github.com/lennythecreator/tracky/issues/46)

**Goal:** Show the primitives working in the docs and prove what they send, using the same source `tracky add` installs.

**Scope:**

- `Example` MDX component renders one example file and prints the same file through a raw import, so demo and code cannot drift.
- Examples live in `website/docs/app/examples/` and import `registry/components/ui/*` plus the registry theme.
- The playground's in-page request interception is shared, not reimplemented, so an interaction shows the event and nothing leaves the page.
- Recorded actions use the playground labels; the toggle has `aria-expanded` and `aria-controls`.

**Acceptance criteria:**

- Each event-sending primitive has a live example whose displayed source matches its file.
- A jsdom test asserts the preview shows an event and `fetch` was never called.
- Examples import registry source, never SDK runtime exports, and show an empty preview state before interaction.

### T-025 — Add a dark theme to the docs site

**Status:** Open.

**Priority:** After T-021
**GitHub:** [#47](https://github.com/lennythecreator/tracky/issues/47)

**Goal:** A readable dark theme with no flash on load, no second palette, and no analytics side effects.

**Scope:**

- `[data-theme="dark"]` token overrides using the existing variable names; no literal hex values in docs components.
- A labelled, keyboard-operable toggle that reports the current theme.
- System preference on first visit, persisted choice afterwards, and a pre-paint script that never flashes light.
- Contrast pass over text, muted text, borders, focus rings, code surfaces, callouts, and the event preview.

**Acceptance criteria:**

- No flash of light content on reload in dark mode; storage failures leave the system theme and do not throw.
- WCAG AA contrast in both themes, checked against the token values.
- Toggling sends no event and does not enable capture.

### T-026 — Write the SDK documentation pages

**Status:** Open. Content only; depends on the pages from T-022 and T-023.

**Priority:** After T-021 through T-023
**GitHub:** [#48](https://github.com/lennythecreator/tracky/issues/48)

**Goal:** A developer can install, configure, and verify Tracky without reading the source.

**Scope:**

- Overview, Getting started, Tracking events, Capture switches, Event contract, Privacy and exclusions, Delivery and retries — each with frontmatter, a TOC, and a next step.
- State the unpublished status at every install step, and name the endpoint's responsibilities beside the delivery claim.
- Document `data-analytics="ignore"` with a working example.

**Acceptance criteria:**

- Every export in `src/index.ts` appears at least once with its defaults and side effects, and each stated default matches the source.
- No page claims npm availability, hosted collection, guaranteed delivery, consent management, or legal compliance.
- Pages follow `WRITING.md` and link only to routes the site has.

### T-027 — Document each registry component

**Status:** Open. Depends on T-024 for live examples.

**Priority:** After T-024
**GitHub:** [#49](https://github.com/lennythecreator/tracky/issues/49)

**Goal:** One page per primitive covering props, documented action, and accessibility, so a developer can decide without opening the source.

**Scope:**

- `/docs/components` index: registry distribution, the four event-sending primitives and the three silent ones.
- One page per component with the `tracky add` command, live examples, a props table with defaults, the exact action string, keyboard and screen-reader behavior, and the tokens used.
- One shared explanation of `analyticsName`, the `data-tracky-component` marker, and provider-absent behavior.

**Acceptance criteria:**

- All seven components have a page in registry order, and each props table matches `registry/components/ui/`.
- Action pages name the exact string and state that no values, labels, or text are sent; silent pages say so explicitly.
- Each page links to its source file and sends nothing off the page.

### T-028 — Add keyboard-first docs search

**Status:** Open. Sequenced after the first docs release.

**Priority:** After T-021 and T-022
**GitHub:** [#50](https://github.com/lennythecreator/tracky/issues/50)

**Goal:** Search the docs from the keyboard without a hosted service.

**Scope:**

- A build step emits `search-index.json` from titles, descriptions, headings, and body text, with code fences excluded and a bounded size.
- `SearchDialog`: Cmd/Ctrl+K and a header button, native `<dialog>`, labelled input, grouped results, arrow keys, Enter to open at the anchor, Escape restores focus.
- The index loads lazily on first open; nothing loads on mount and nothing third-party is contacted.
- The build fails if the index cannot be generated or exceeds its size budget.

**Acceptance criteria:**

- Opening search makes exactly one request, and no page body is duplicated into the client bundle.
- A term present only under a subheading resolves to that anchor.
- Result count is announced and focus returns to the opener.

**Out of scope:** hosted search, typo tolerance beyond simple matching, and filtering by component or version.

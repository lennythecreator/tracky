# Tracky completion checklist

Tracks completion of the GitHub tickets against the shipped code.

**Last verified:** 2026-11-03, `main` at `a7c03ae` (after the merges of PR #35 and PR #36).
**Ticket index:** [#1](https://github.com/lennythecreator/tracky/issues/1) through [#6](https://github.com/lennythecreator/tracky/issues/6), and [#9](https://github.com/lennythecreator/tracky/issues/9) through [#16](https://github.com/lennythecreator/tracky/issues/16). All 14 are closed as completed.

Legend: `[x]` verified in the repository · `[ ]` not done · `[~]` done with a recorded caveat.

## Release gate

- [x] `npm test` passes offline (129/129 tests, 15 files: jsdom suites, node CLI tests, and the Chrome check).
- [x] `npm run lint` passes the SDK and test typechecks.
- [x] `npm run build` emits the ESM package to `dist/`.
- [x] Package exports point at `dist/index.js` and `dist/index.d.ts`.
- [x] React remains a peer dependency; no runtime dependency was added.
- [x] Page-wide capture is off by default; no hidden endpoint or persistent cross-session identifier.
- [ ] Package is published to npm (explicitly not done; README documents the checkout build).

## Component foundation

### T-001 — Component source and distribution model (#1)

- [x] ADR documents distribution, styling, tradeoffs, and package boundaries (`docs/adr/0001-component-registry-and-styling.md`).
- [x] Registry/source-ownership model chosen over runtime package exports.
- [x] First primitive inventory and import examples recorded.
- [x] No hosted Tracky service required.
- [x] Style setup and component-action routing to the developer endpoint are documented.

### T-002 — Primitive component foundation (#2)

- [x] Shared `cn` helper, CSS-variable tokens, and Tailwind preset exist.
- [x] Focus-visible, disabled, invalid, size, and variant behavior is consistent.
- [x] Components compose with native elements and preserve props, refs, and handlers.
- [x] No browser-only APIs in module initialization or render.
- [x] React 18+ / ESM `NodeNext` conventions preserved.

### T-003 — First core primitives (#3)

- [x] `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Select` implemented in `registry/components/ui/`.
- [x] Typed, documented APIs with usable default styling.
- [x] Controlled and uncontrolled use supported through native inputs.
- [x] Accessible labels, keyboard operation, focus, disabled, and `aria-invalid` states.
- [x] Caller handlers and safe native attributes preserved.
- [x] Input values are never read or sent automatically.

### T-004 — Emit documented actions (#4)

- [x] Top-level `component: { name, action }` envelope used.
- [x] Stable actions: `button` activate, `checkbox` toggle, `switch` toggle, `select` change.
- [x] Enter/Space activation is normal activation; no key names recorded.
- [x] Generic click suppressed for Tracky component interactions when page-wide clicks are on.
- [x] Components remain usable without a provider.
- [x] No props, labels, contents, or selected values attached.

### T-005 — Component playground (#5)

- [x] Playground renders the registry source, variants, states, and snippets.
- [x] Local event preview intercepts the SDK request at a non-routable endpoint.
- [x] No telemetry leaves the page.
- [x] Disabled and keyboard states are explorable.
- [x] Keyboard pass covered every tab stop in Chromium per `BACKLOG.md`, now automated by `test/playground-keyboard.test.ts` in `npm test`.

### T-006 — Component distribution path (#6)

- [x] `tracky init` writes `tracky.json`, theme files, and the stylesheet import.
- [x] `tracky add <component>` copies the component and shared `cn` helper.
- [x] Registry entries and a resolved-commit lockfile exist.
- [x] CLI validates the `tsconfig` alias and supports `--ref` and `--overwrite`.
- [x] Installed components send only through the configured endpoint.
- [~] The documented path requires building the SDK from a checkout because the package is unpublished.

## Analytics tickets

### T-007 — Test harness and privacy coverage (#9)

- [x] Vitest + jsdom in `devDependencies`; `npm test` documented.
- [x] Envelope, batching, scheduled flush, bounded retry, `onDeliveryError`, and `shutdown()` covered.
- [x] Privacy defaults covered: no opt-in, no field values, password/hidden inputs, contenteditable, ignored subtrees.
- [x] Tests fail if capture runs without an opt-in.
- [x] No runtime dependency added.

### T-008 — Approved event envelope (#10)

- [x] Optional top-level `component` and typed `payload` on `AnalyticsEvent`.
- [x] `track(eventType, context, payload?)` with a caller-named payload type (`JsonValue`).
- [x] `trackComponentEvent` uses the top-level `component` object; no `component`/`action` in `context`.
- [x] Heat-map and scroll-depth data travel in `payload`, never `context`.
- [x] Context merging and delivery behavior unchanged.
- [x] `product.md` describes navigation and element capture as shipped behavior in the "Core tracking capabilities" section.

### T-009 — Independent capture switches (#11)

- [x] `capture` groups `pageViews`, `clicks`, `formSubmits`, `inputChanges`, `frustrationClicks`, `heatMaps`, `scrollDepth`.
- [x] Every switch is off by default; one switch does not enable another.
- [x] Deprecated `capturePageViews` / `captureInteractions` migrate; explicit `capture` keys win.
- [x] Listeners attach only while their category is on.
- [x] Clicks: safe metadata only; link clicks are not page views.
- [x] Form submits: metadata only; input changes: metadata only; values never read.
- [x] Password and hidden inputs skipped; `data-analytics="ignore"` honored in every category.
- [x] With every capture switch off, no page-wide capture listeners attach. The always-on `pagehide` and `visibilitychange` listeners are delivery, not capture: they read no DOM data, create no events, and flush buffered explicit events. The test asserts no capture listeners (`click`/`change`/`submit`/`popstate`) and an unwrapped History API.
- [~] Contenteditable is excluded implicitly because only `change` on input/select/textarea is observed; there is no explicit contenteditable guard.

### T-010 — Navigation and route resolver (#12)

- [x] Initial page view, back, and forward each produce one page view.
- [x] `pushState` and `replaceState` observed without duplicates; listeners restored on unmount.
- [x] Path plus query by default; hash-only changes ignored without a resolver.
- [x] `resolveRoute(location)` supports hash/custom routing and `null` to ignore a location.
- [x] Resolver output sets `route` on every event; a throwing resolver falls back to path plus query.
- [x] Link click without a route change stays a click.
- [x] Repeated or intermediate navigation emits no duplicate page view.

### T-011 — Frustration clicks (#13)

- [x] Two clicks produce no event; three within one second produce one.
- [x] Different elements or clicks beyond the window do not combine; one event per burst.
- [x] `data-analytics-name` groups instances; ignored subtrees never count.
- [x] Works without ordinary click capture and does not enable it.
- [x] Keyboard activation and touch movement do not count; no text, labels, ancestry, or response inference.
- [x] Payload uses only safe target metadata.

### T-012 — Cursor heat map aggregation (#14)

- [x] 10×10 grid normalized to the visible viewport.
- [x] Mouse/pen positions sampled every 250 ms; sampling stops when the pointer leaves or the page hides.
- [x] Clicks counted by region, including touch taps; touch movement excluded.
- [x] Keyboard focus entries counted by region without key names.
- [x] `HeatMapSummary` typed payload with route/visit scope; grid never in `context`.
- [x] No coordinates, trails, or pointer identifiers in the payload.
- [x] Collection runs only with `capture.heatMaps`.
- [x] The `HeatMapSummary` type-level JSDoc is attached to its own declaration, so the generated declaration carries the description. Field docs and README are intact.

### T-013 — Heat map delivery (#15)

- [x] Sent on route change, `pagehide`, hidden `visibilitychange`, every 30 seconds, and when capture stops.
- [x] Route/visit scope documented; summaries are recorded against the route the visit left.
- [x] Each send resets the grids, so periods never overlap and repeat flushes do not resend.
- [x] Empty periods are not sent.
- [x] Delivery uses only the configured endpoint, existing buffer, and retry limits.
- [x] Interval and payload scope documented in README.

### T-014 — Scroll depth (#16)

- [x] Deepest 25% bucket per route/visit (`ScrollDepthSummary`).
- [x] Own `capture.scrollDepth` switch; independent of heat maps and every other category.
- [x] Sent on route change, page exit, and when capture stops; no periodic flush (documented).
- [x] Only deeper values resend, so a visit sends at most five events.
- [x] Resets per route/visit; the next page is measured on its first scroll/resize/exit.
- [x] No raw positions, text, or DOM paths in the payload.
- [x] An ignored location (`null` route) is not a visit: heat-map/scroll capture starts no visit for it, at mount or after navigation, and the next visit begins at the first accepted route. No summary is sent for an ignored location.

## Verification record

| Check | Result | Where |
| --- | --- | --- |
| `npm test` | 129/129 pass, 15 files | `main` @ `a7c03ae` |
| `npm run lint` | pass | `main` @ `a7c03ae` |
| `npm run check:terms` | 38 files match the glossary | `main` @ `a7c03ae` |
| `npm run build` | pass | `main` @ `a7c03ae` |
| Keyboard check in a real browser | 7 cases, part of `npm test` | PR #33 |
| Contenteditable capture reasoning | documented and tested | PR #34 |
| Ignored locations and heat-map/scroll visits | tests cover mount and non-attribution | PR #35 |
| CLI argument parsing and exit codes | covered through the exported `run()` | PR #36 |
| Merge of stack into `main` | no conflicts | PR #32 |

## Follow-ups

- [x] Update the future-tense wording in `product.md` (navigation and element interaction bullets) and the status header in `analytics-design.md`.
- [x] Repair the `HeatMapSummary` JSDoc so the payload type keeps its description in generated declarations. Fixed and verified in `dist/types.d.ts`.
- [x] The no-listener guarantee is scoped to capture listeners; the always-on flush listeners are named as delivery in T-009, `src/react.tsx`, and `README.md`.
- [x] Document why the `change`-only listener is sufficient for contenteditable: the form-control gate excludes editors, and a test dispatches edit events at one to prove nothing is sent. PR #34.
- [x] An ignored location starts no heat-map or scroll visit; both begin at the next route the resolver accepts. Covered by `test/heatmap.test.tsx` and `test/scroll-depth.test.tsx`, documented in `README.md` and `analytics-design.md`. PR #35.
- [x] Add an automated or scripted keyboard check for the playground: `test/playground-keyboard.test.ts`, driving the installed Chrome via `puppeteer-core`. PR #33.
- [ ] Publish the package or document the supported local/link workflow for consumers of installed primitives.
- [x] Prune merged remote branches (`t-002-*`, `t-005-*`, `t-006-*`, `t-007-*`, `t-008-*`, and the T-008–T-014 stack) after confirming nothing else depends on them. Every branch had a merged pull request (#8–#32); the T-series and `capture-guarantees`, `glossary-and-cli-coverage` are deleted locally and on the remote. `copilot/t-001-*` and the two `fix/*` branches are merged too but left alone.

## Re-verify

```sh
npm install
npm run lint
npm run check:terms
npm test
npm run build
```

# Agent instructions

## Read first

Before changing this project, read `product.md` and `README.md`. Treat `product.md` as the product boundary and status record; it separates shipped behavior from future direction. If code and docs disagree, inspect the implementation and update the relevant documentation in the same change.

Before changing analytics capture, event schemas, or delivery, also read `analytics-design.md`. It records the approved target contract and distinguishes it from features that are not implemented yet.

When planning or implementing the component library, follow the ordered tickets in `BACKLOG.md`. Treat them as implementation planning; `product.md` remains the source of truth for product scope and status.

When writing or editing developer-facing content, also read `WRITING.md` and follow its voice, terminology, and product-claim rules.

## Project shape

- Tracky is a React analytics SDK, not the Coachly application or a hosted analytics backend.
- Runtime source lives in `src/`; TypeScript emits package files to `dist/`.
- The package is ESM and uses TypeScript `NodeNext` resolution. Keep relative TypeScript imports using `.js` specifiers.
- React is a peer dependency. Keep the runtime dependency footprint small.
- `package.json` exports the built package from `dist/`; do not commit generated `dist/` output.

## Product and privacy constraints

- Keep page-wide collection opt-in and off by default. Tracky components may emit their documented action events as specified in `analytics-design.md`; component tracking must not enable page-wide capture.
- Never collect field values, keystrokes, passwords, contenteditable text, or arbitrary page text.
- Preserve and document the `data-analytics="ignore"` exclusion mechanism.
- Do not add hidden destinations, cookies, identity stitching, or persistent cross-session identifiers.
- Treat custom event context as developer-supplied JSON-safe metadata; do not add secret or personal data automatically.
- Keep delivery bounded and non-blocking. Tracky sends to the configured endpoint; durable storage and guaranteed delivery are endpoint responsibilities.
- Hosted license verification is a future proposal. Do not add a network license check or block event delivery without a documented product decision and an implemented service contract.

## Implementation guidance

- Keep browser-only APIs out of module initialization and render-time code. Access `window`, `document`, storage, and history only in browser execution paths such as effects or event calls.
- Keep event names, schema fields, defaults, and endpoint payloads aligned across `src/`, `README.md`, and `product.md`.
- Avoid collecting more DOM metadata than the product requires.
- Preserve React 18+ compatibility and avoid assuming a particular router or backend.
- When changing public exports or package metadata, update the quick-start documentation.

## Local commands

- `npm run build` compiles the distributable package.
- `npm run lint` runs TypeScript's no-emit check on the SDK and the tests.
- `npm test` runs the Vitest suite in jsdom. It runs offline and covers the event envelope, delivery, and privacy defaults; add a test when you change capture or delivery.
- Report only checks that were actually run; do not describe a build as tested if it was not run.

# Tracky component backlog

This is the ordered, agent-ready backlog for the first Tracky component release. It follows the approved analytics contract in `analytics-design.md` and the product boundary in `product.md`.

GitHub issue creation was attempted for this repository but the connected integration returned 403, and the local GitHub CLI reports an invalid token. These are ready-to-file ticket drafts; no remote issues have been created.

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

**Priority:** After T-003; can proceed alongside T-004

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

**Priority:** After T-001 through T-004

**Goal:** Make the primitive source easy for developers to adopt in the form chosen by T-001.

**Scope:**

- If source-copy/registry is selected, publish structured component registry entries and a small installer workflow inspired by shadcn's model.
- If package distribution is selected, publish clear package exports and styling setup with developer customization points.
- Keep the analytics SDK and component library boundaries explicit.

**Acceptance criteria:**

- A React developer can install or copy the initial primitives using the documented path.
- The installed components send events only through the developer's configured Tracky endpoint.
- Package/registry examples, website playground, and implementation all match.

## Later analytics SDK work

The approved contract also includes independent page-wide capture switches, route resolution, frustration-click detection, and heat map aggregation/delivery. Those SDK tickets should follow the component foundation and use `analytics-design.md` as their source of truth. Do not implement page-wide capture as a side effect of installing or using a primitive.

# ADR 0001: Component registry and styling model

- **Status:** Accepted
- **Date:** 2026-10-27
- **Issue:** [#1](https://github.com/lennythecreator/tracky/issues/1)

## Context

Tracky needs a component strategy before defining individual component APIs. The strategy must let application teams customize UI source code, keep analytics routing optional and developer-controlled, and avoid coupling reusable components to a hosted Tracky service.

## Decision

### Distribution and source ownership

- Tracky components are distributed through a **registry that copies editable source files** into the consumer application (shadcn-style source ownership).
- Tracky does **not** ship these UI components as runtime exports from an npm package.
- Consumers own copied component source and can modify markup, styles, variants, and analytics wiring as needed.

### Package and runtime boundaries

- The root `tracky` npm package remains the analytics SDK runtime.
- The website and component registry are delivery/documentation surfaces, not SDK runtime dependencies.
- Component source should depend only on the consumer's local app dependencies and the `tracky` provider configuration they choose to use.

### Styling contract and dependency policy

- Components use **Tailwind CSS utility classes** as the styling contract.
- Consumers are responsible for Tailwind configuration and theme tokens.
- No hosted Tracky styling runtime is required.

### Initial primitive inventory

The first registry primitives are:

- `Button`
- `Input`
- `Textarea`
- `Label`
- `Checkbox`
- `Switch`
- `Select`

### Component authoring and API conventions

- Use **local, named exports** per component file.
- Preserve native element props and event handlers.
- Forward refs to native controls/elements.
- Always support `className` extension/override patterns.
- Keep variant and size options local to each copied component source so consumers can change them directly.

Local import pattern example in consumer code:

```tsx
import { Button } from "@/components/tracky/button"
import { Input } from "@/components/tracky/input"
```

### Accessibility and analytics behavior

- Prefer native accessible controls before custom role-based abstractions.
- Components must continue to function without an analytics provider.
- Analytics emissions are additive behavior routed through the consumer-configured Tracky provider.
- Use stable lowercase analytics component/action names.
- Keep page-wide automatic capture independently opt-in (separate from component action emission).

Documented naming examples:

- Component name: `button`
- Action names: `click`, `toggle`, `select`
- Combined event intent examples: `button.click`, `switch.toggle`, `select.select`

## Tradeoffs

### Benefits

- Maximum consumer customization with direct source ownership.
- No lock-in to a hosted Tracky backend.
- Clear separation between SDK runtime and UI distribution.

### Costs

- Consumers must handle Tailwind setup and maintain local component source.
- Registry and manifest tooling must be documented and maintained separately from the SDK runtime package.

## Implementation implications

- Next implementation detail: choose the registry CLI and manifest format.
- Document Tailwind setup and import-alias adaptation for registry installs.
- Build each primitive as a registry entry in follow-up component tickets.

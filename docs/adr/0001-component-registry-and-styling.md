# ADR 0001: Component registry and styling model

**Status:** Accepted
**Date:** 2026-10-27
**Issue:** [#1](https://github.com/lennythecreator/tracky/issues/1)

## Context

Tracky has an existing React analytics SDK in the repository root. The component library should follow the shadcn model of giving developers source they can own and customize, while sending documented component events through the SDK and the endpoint configured by the application. The strategy must let application teams customize UI source, keep analytics routing optional and developer-controlled, and avoid coupling reusable components to a hosted Tracky service.

## Decision

- Distribute the UI primitives through a Tracky component registry. A registry CLI adds editable component source to the consuming application; it does not install a separately hosted component runtime.
- Keep the analytics SDK as the root `tracky` npm package. Keep registry entries and the website separate from the SDK runtime. The website may serve the registry, but it is not a runtime dependency for installed components.
- Use Tailwind CSS utility classes in the copied component source. Consumers configure Tailwind in their application and own the resulting source and styles. Document the required Tailwind setup and any theme tokens alongside installation instructions.
- Keep component runtime dependencies small. Prefer semantic HTML and React. Add a dependency only when a primitive requires behavior that native elements cannot provide accessibly; record that dependency in its registry entry and install instructions.
- Put copied primitives in the consumer's conventional local UI directory, with one source file per primitive and named exports. Preserve native element props, refs, event handlers, and `className` customization. Use typed variants and sizes only where they are useful for that primitive.
- Build on native controls where possible. Require associated labels, keyboard operation, visible focus, and correct disabled and invalid states. A component must remain usable when no analytics provider is present.
- Use stable lowercase component names and action names in analytics events. Emit only documented actions through the application's Tracky provider; never infer labels, props, values, or text. Page-wide capture remains independently opt-in.

### Component action naming

Action names describe what the control did, not the input device that did it. Use one action per control behavior:

| Component | Action |
| --- | --- |
| `button` | `activate` |
| `checkbox` | `toggle` |
| `switch` | `toggle` |
| `select` | `change` |

Enter and Space are normal button activation, so they produce the same `activate` action as a pointer click. Text inputs and textareas do not emit component actions; their values are never read.

## Initial primitives

The first registry set is `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, and `Select`.

After installation, consumers import from their own source tree, for example:

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

The registry CLI and exact registry manifest format will be selected during implementation. The example assumes the consumer has an `@/` alias; installation documentation must explain how to adapt imports when it does not.

## Tradeoffs

### Benefits

- Developers can change component markup and Tailwind classes directly, and choose when to apply registry updates.
- The SDK and copied components have distinct package boundaries. The registry and website can evolve without adding website code to the SDK bundle.
- Maximum consumer customization with direct source ownership, with no lock-in to a hosted Tracky backend.

### Costs

- Consumers need Tailwind CSS configured. Tracky must document the setup and keep copied code compatible with the documented Tailwind version.
- Consumers maintain local component source and decide when to re-apply registry updates.
- Registry and manifest tooling must be documented and maintained separately from the SDK runtime package.

## Implementation implications

- Component analytics requires the Tracky provider for delivery, but components still render and behave normally without it. Component actions use the configured endpoint and do not enable page-wide capture.
- Registry entries need to describe source files, imports, dependencies, and any setup steps so the CLI can add components predictably.
- Remaining T-001 detail: choose the registry CLI and manifest format, and document Tailwind setup and import-alias adaptation.
- Build each primitive as a registry entry in follow-up component tickets.

## References

- [Component distribution backlog](../../BACKLOG.md), T-001
- [Analytics design contract](../../analytics-design.md)
- [shadcn component configuration](https://ui.shadcn.com/docs/components-json)
- [shadcn registry guide](https://ui.shadcn.com/docs/registry/getting-started)

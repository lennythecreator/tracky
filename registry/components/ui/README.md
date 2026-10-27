# Tracky UI primitives

These files are copied into your application, not imported from the `tracky` package. Edit them freely. The shared conventions below keep the primitives consistent as you customize them.

## Conventions

- One component per file with a named export and an exported props type, such as `Button` and `ButtonProps`.
- Wrap native elements (`button`, `input`, `textarea`, `select`, `label`) instead of rebuilding their behavior. Spread native props and forward the ref, so `id`, `name`, `form`, `aria-*`, handlers, and the rest keep working.
- Use `cn()` from `utils.ts` to append your `className` after the defaults, so callers can override individual utilities.
- Keep variants and sizes local to the component, typed with a union. Add them only where the primitive actually needs them.
- Support controlled and uncontrolled use by passing `value`/`checked` and `defaultValue`/`defaultChecked` through to the native element. Primitive code must not hold or read form values.
- Tracky components have no analytics side effects. They never read values, labels, or text. Component analytics is a separate capability.
- React 18+ only; no runtime dependency beyond React.
- Styling uses the theme tokens in [`../../theme/`](../../theme/README.md). Run the Tailwind setup before using these classes.

## Interaction states

All controls share the same focus and disabled treatment:

- **Focus** — focus-visible ring with `ring-ring` and `ring-offset-background`, never a focus style that appears on mouse click alone.
- **Disabled** — `disabled:opacity-50` with `disabled:cursor-not-allowed`; buttons also remove pointer events.
- **Invalid** — set `aria-invalid="true"` (or pass `aria-invalid` through) to switch the border and focus ring to `destructive`. Do not rely on color alone for the message: render an error element and connect it with `aria-describedby`.

```tsx
import { Input, Label } from '@/components/ui'

export function WorkspaceNameField({ error }: { error?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="workspace-name">Workspace name</Label>
      <Input
        id="workspace-name"
        name="workspaceName"
        defaultValue="Northstar Studio"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'workspace-name-error' : undefined}
      />
      {error ? (
        <p id="workspace-name-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

## Accessibility checklist

- Every control has a visible, associated label (`Label` with `htmlFor`, or `aria-label` when a visible label is not appropriate).
- Keyboard operation, focus order, and native shortcuts are preserved.
- Disabled and invalid states are exposed with native attributes, not only with classes.
- Focus is visible against the consumer's themed background.
- Error text is rendered by the application; components do not generate or announce messages on their own.

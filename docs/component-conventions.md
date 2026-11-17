# Tracky component conventions

What a component added after the initial seven must satisfy. [ADR 0001](adr/0001-component-registry-and-styling.md) records the distribution, styling, and naming decisions; this document is the checklist that follows from them, and it does not replace them. Read both before adding a primitive.

The bar applies to the whole repository: the registry source in `registry/components/ui/`, the registry entry, the tests, and the playground surface.

## 1. Analytics contract

- **Name.** The component name is lowercase and identical in four places: the file (`switch.tsx`), the exported component (`Switch`), the registry item (`switch`), and the `name` in the event. No camelCase, prefixes, or versions.
- **One action per control behavior.** The action describes what the control did, never the input device that did it. The shipped four are `button` / `activate`, `checkbox` / `toggle`, `switch` / `toggle`, and `select` / `change`. Enter and Space on a button produce `activate`, the same as a pointer click. A new documented action is added to the table in ADR 0001 in the same change that adds the component.
- **Marker.** A component that sends a documented action renders `data-tracky-component="<name>"` on the native element it wraps. `captureClicks` skips clicks inside that marker, which is how one interaction produces one event instead of a component event and a generic click. Components that send nothing (`Input`, `Textarea`, `Label`) do not render it.
- **Emission.** Read the nearest provider with `useAnalyticsOptional()` and call `trackComponentEvent('<name>', '<action>', context)` from the control's own handler. Never call `useAnalytics()`, never require a provider, and never enable page-wide capture. Without a provider the component renders, behaves normally, and sends nothing.
- **Caller handlers first.** Call the caller's handler before tracking. `Button` also skips its event when the handler called `event.preventDefault()`, because the interaction was cancelled.
- **Context.** The only context a primitive adds is `{ name }`, taken from `data-analytics-name` when `analyticsName` is set. This is the cheapest way to give an instance a stable analytics name, and page-wide capture reads the same attribute. Never read or send field values, `checked` state, labels, props, child text, selected options, option text, placeholder text, or `aria-label` values.
- **`analyticsName`.** The prop is optional, renders as `data-analytics-name`, and takes precedence over an attribute the caller sets. It never changes the event's `component` object.

## 2. Registry contract

- **Item.** Add one entry to `registry/registry.json` with `name`, `type: "ui"`, `title`, `description`, `dependencies`, `requires`, and `files`, matching the shape of the shipped seven. `name` matches the component and the file.
- **`dependencies`** lists the packages the installed source imports. A sending primitive lists `tracky`; a silent primitive lists nothing. `**requires**` lists registry items whose files must be installed with it, currently `utils` for the `cn()` helper.
- **No new runtime dependency without a recorded reason.** Add one only when a native element cannot provide the behavior accessibly. Record why in the registry item's `description` and in the pull request, and add it to the install documentation.
- **Styling.** Use the semantic theme utilities and the `--tracky-*` variables: `bg-background`, `text-foreground`, `border-border`, `ring-ring`, `bg-primary`, `text-destructive`, `rounded-md`, `font-sans`. No hex values, no palette utilities such as `slate-700` or `blue-600`, and no new CSS variables. A new visual state needs a token in `registry/theme/`, not a literal color.
- **Files.** One `.tsx` per component with a named export and an exported props type, built on the native element, `forwardRef`ed, spreading native props, and passing `className` through `cn()` last. Export the component and its types from `registry/components/ui/index.ts`.
- **Payloads.** `registry/r/` holds generated payloads. Edit the component source and `registry/registry.json`; do not hand-edit a payload.

## 3. Accessibility bar

- **Native element.** Wrap the element that already has the semantics: `button`, `input`, `textarea`, `select`, `label`. Do not put roles on a `div` to imitate one.
- **Label association.** The application supplies the label, with `Label` and `htmlFor` or with `aria-label` when a visible label does not fit. A primitive must not invent, duplicate, or strip a label, and must not require one to render.
- **Keyboard.** Preserve the native behavior. Enter and Space activate a button, Space toggles a checkbox or switch, and the arrow keys move through a select. Add a key handler only when the native element cannot do the job, and never record the key that was used.
- **Focus.** Every focusable control shows a `focus-visible` ring using `ring-ring` with `ring-offset-background`, and no focus style that appears on a pointer click alone.
- **Disabled.** Use the native `disabled` attribute, plus `disabled:opacity-50` with `disabled:cursor-not-allowed` or `disabled:pointer-events-none`, so the state is exposed to assistive technology and not only visually.
- **Invalid.** Pass `aria-invalid` through, and switch the border and focus ring to `destructive` with `aria-[invalid=true]:` utilities. Error text belongs to the application, connected with `aria-describedby`; a primitive does not generate or announce messages.

## 4. Test and surface bar

- **Component test.** At least one test in `test/` asserts the documented action for the new control, the `{ name, action }` component object, the context with and without `analyticsName`, that no value, label, or text reaches a request body, and that the control still works without a provider. `test/components.test.tsx` shows the shape.
- **Keyboard.** Add the new control to `test/playground-keyboard.test.ts` so tab order, the visible focus ring, its activation key, and disabled skipping are covered in a real browser.
- **Playground.** Add a demo in `website/playground/app/src/demos.tsx` and a card in `website/playground/app/src/App.tsx`, rendering the registry source and showing the documented action in the event preview. The card carries a copyable snippet that matches the source exactly; `website/playground/app/src/Snippet.tsx` owns that layout.
- **Docs.** The primitive's page arrives with the docs track; a component is not finished until its playground demo and its page render the same registry file.

## 5. Definition of done

- [ ] The file, component, registry item, and the `name` in the event all use the same lowercase name.
- [ ] One documented action, added to the ADR 0001 table if it is new, sent through `trackComponentEvent` from `useAnalyticsOptional()`.
- [ ] `data-tracky-component` is rendered only by sending primitives.
- [ ] No value, label, text, prop, or selected option is read or sent; `analyticsName` is the only context.
- [ ] The registry item lists `dependencies`, `requires`, and every file, and no runtime dependency was added without a recorded reason.
- [ ] Styling uses theme tokens only, with no hex or palette utilities.
- [ ] The accessibility bar holds: native element, label left to the app, keyboard intact, visible focus, native disabled, `aria-invalid` styling.
- [ ] Component test, keyboard test, and playground demo are in place.
- [ ] `npm run lint`, `npm test`, `npm run check:terms`, and `npm run build:playground` pass.

## References

- [ADR 0001: Component registry and styling model](adr/0001-component-registry-and-styling.md)
- [Registry component README](../registry/components/ui/README.md)
- [Analytics design contract](../analytics-design.md)
- [Component backlog, T-020](../BACKLOG.md)

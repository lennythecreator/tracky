# Tracky theme tokens

The copied primitives read their colors, radii, and font family from CSS variables. Override the variables to theme them; there is no Tracky styling runtime and no second component API.

## Files

- `tokens.css` — default light-theme values for the `--tracky-*` variables.
- `tailwind-preset.cjs` — a Tailwind CSS v3 preset that maps the variables to semantic utilities such as `bg-primary`, `text-foreground`, `border-border`, `rounded-md`, and `font-sans`.

Keep both files next to the components you copy, for example in `src/components/ui/`, and import `tokens.css` once from your global stylesheet.

## Tailwind CSS v4

Import the tokens, then map them to Tailwind theme variables with `@theme inline`:

```css
@import "tailwindcss";
@import "./components/ui/tokens.css";

@theme inline {
  --color-background: var(--tracky-background);
  --color-foreground: var(--tracky-foreground);
  --color-primary: var(--tracky-primary);
  --color-primary-foreground: var(--tracky-primary-foreground);
  --color-primary-hover: var(--tracky-primary-hover);
  --color-secondary: var(--tracky-secondary);
  --color-secondary-foreground: var(--tracky-secondary-foreground);
  --color-secondary-hover: var(--tracky-secondary-hover);
  --color-muted: var(--tracky-muted);
  --color-muted-foreground: var(--tracky-muted-foreground);
  --color-destructive: var(--tracky-destructive);
  --color-destructive-foreground: var(--tracky-destructive-foreground);
  --color-destructive-hover: var(--tracky-destructive-hover);
  --color-border: var(--tracky-border);
  --color-ring: var(--tracky-ring);
  --color-switch-thumb: var(--tracky-switch-thumb);
  --radius-sm: var(--tracky-radius-sm);
  --radius-md: var(--tracky-radius-md);
  --radius-lg: var(--tracky-radius-lg);
  --font-sans: var(--tracky-font-sans);
}
```

## Tailwind CSS v3

Import `tokens.css` from your global stylesheet and add the preset to your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  presets: [require('./src/components/ui/tailwind-preset.cjs')],
  content: ['./src/**/*.{ts,tsx}'],
}
```

The preset extends `colors`, `borderRadius`, and `fontFamily.sans`. It deliberately remaps the `sm`, `md`, and `lg` radii and the `sans` family, so check those entries if your application defines its own scale. If your Tailwind config is an ES module, import the preset instead: `import preset from './src/components/ui/tailwind-preset.cjs'` and set `presets: [preset]`.

## Override the theme

Set the variables wherever your application already defines theme values. Values are plain CSS colors and lengths, so hex, `rgb()`, and `oklch()` all work:

```css
:root {
  --tracky-primary: #0f766e;
  --tracky-primary-hover: #115e59;
  --tracky-primary-foreground: #ffffff;
  --tracky-ring: #0f766e;
  --tracky-radius-md: 0.625rem;
  --tracky-border: #d6e4e0;
}
```

Scope the overrides to a container or a theme class if you need more than one palette. For a dark theme, redefine the same variables on `.dark` (or inside a `prefers-color-scheme` query) and toggle the class from your application:

```css
.dark {
  --tracky-background: #0f172a;
  --tracky-foreground: #f8fafc;
  --tracky-border: #334155;
  --tracky-muted: #1e293b;
  --tracky-muted-foreground: #94a3b8;
  --tracky-switch-thumb: #f8fafc;
}
```

Components use explicit hover tokens instead of slash opacity (`hover:bg-primary-hover`, not `hover:bg-primary/90`), so the overrides behave the same in Tailwind v3 and v4.

## Typography

Typography inherits by default. `--tracky-font-sans` is set to `inherit`, so the components use whatever font their parent uses; the copied source applies `font-sans`, which resolves through the preset or the `@theme` block above.

Set the variable to opt into a specific family:

```css
:root {
  --tracky-font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

Sizes and weights stay on standard utilities (`text-sm`, `text-base`, `font-medium`). Customize them in your Tailwind theme, or edit the `sizes` map in the copied component source when you want a different scale for one primitive.

## What the tokens control

| Token group | Used by |
| --- | --- |
| `--tracky-background`, `--tracky-foreground`, `--tracky-border`, `--tracky-ring` | All controls |
| `--tracky-primary*`, `--tracky-secondary*`, `--tracky-destructive*` | `Button`, `Checkbox`, `Switch` |
| `--tracky-muted*` | `Button` outline and ghost states, `Switch` track, placeholders |
| `--tracky-switch-thumb` | `Switch` thumb |
| `--tracky-radius-*` | Controls that use `rounded-sm`, `rounded-md`, or `rounded-lg` |
| `--tracky-font-sans` | Text-bearing controls |

Theme overrides only affect presentation. They do not enable analytics, change which events are sent, or add a destination.

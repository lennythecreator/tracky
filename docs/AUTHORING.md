# Docs authoring contract

Every page under `website/docs/app/src/content/` is MDX with a frontmatter block and a row in its folder's `meta.json`. This file is the contract the page checker enforces: `npm run check:docs` runs in CI and at the start of `npm run build:docs`, so a broken page fails with its file and line instead of appearing blank on the site.

## Frontmatter

Two fields are required; the rest are optional and only exist where they say something true.

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `title` | yes | string | The page's heading and sidebar label. Distinct from any other page title. |
| `description` | yes | string | One sentence under the title, also used as the page meta description. |
| `order` | no | number | Position inside the section; pages without one follow `meta.json`. |
| `since` | no | string | The release a documented API first shipped in. Omit while the package is unreleased. |
| `status` | no | `stable` \| `beta` \| `unreleased` | The API state the page documents. |

```mdx
---
title: Capture switches
description: What each opt-in page-wide capture switch records, and what Tracky never reads.
order: 1
---

## Every switch is off by default
```

A key that is not in this table fails the check, because a typo such as `descripton` otherwise renders an empty subtitle. Values are plain strings, optionally quoted; nested YAML is not part of the contract.

## Sections and order

Each content folder has a `meta.json` that lists its pages in order:

```json
{
  "label": "Guides",
  "order": 1,
  "pages": ["capture-switches"]
}
```

- Every `.mdx` file must be listed exactly once, and every listed id must have a file.
- The root folder comes first; other sections follow by `order`, then by name.
- `label` is the sidebar heading. Without `order`, a section sorts after ordered ones.

`index.mdx` is the section's landing route (`/`), `guides/capture-switches.mdx` is `/guides/capture-switches`.

## Headings and anchors

- Start at `##`. The app renders the page's `h1` from `title`, so a page must not write its own.
- `##` and `###` become the on-this-page list and the anchors deep links use.
- One anchor per page: two headings with the same text fail the check, with both lines named. Add a distinguishing word rather than relying on a generated suffix.

## Links

Internal links use the route the page is served at:

- `[capture switches](/guides/capture-switches)` — must resolve to an authored page.
- `[forms](/guides/capture-switches#forms-and-inputs)` — the anchor must exist on that page.
- `[below](#what-is-never-sent)` — an anchor on the same page.

Links that start with a scheme (`https:`, `mailto:`) are left alone; anything else must start with `/` or `#`. Links inside fenced code are ignored. The check reads the whole tree, so a link may point at a page in another section.

## MDX components

These are available on every page and need no import. Use them instead of restyling Markdown by hand.

### `Callout`

```mdx
<Callout variant="warning" title="Before you ship">
  The endpoint owns delivery. Tracky retries a failed batch a fixed number of
  times and then drops it.
</Callout>
```

`variant` is `note` (default) or `warning`; `title` replaces the default label.

### `Steps`

```mdx
<Steps>

1. Run `npm install tracky`.
2. Render `AnalyticsProvider`.
3. Turn on the capture switches you need.

</Steps>
```

Renders an ordered list with the shared numbering and rhythm.

### `Kbd`

```mdx
Press <Kbd>Cmd</Kbd> + <Kbd>K</Kbd> to search.
```

One key or chord per element, so a shortcut is announced as keys.

### `PropsTable`

```mdx
<PropsTable
  rows={[
    { name: 'variant', type: '"primary" | "secondary"', defaultValue: '"primary"', description: 'The button treatment.' },
    { name: 'analyticsName', type: 'string', description: 'Stable name for the documented action.' },
  ]}
/>
```

Each row needs `name`, `type`, and `description`; `defaultValue` is optional. Every component page's table is data, so a page cannot forget a column.

### `PageHeader`

```mdx
<PageHeader
  title="Forms and inputs"
  description="What the SDK records when a form is submitted or a field changes."
  meta={<span>Since 0.3</span>}
/>
```

A section header with an optional description and label row. It renders `##` by default; pass `level={3}` for a subsection. Use it where a plain heading needs that extra context, not on every heading.

### `CodeTabs`

```mdx
<CodeTabs
  tabs={[
    { label: 'npm', language: 'sh', code: 'npm install tracky' },
    { label: 'pnpm', language: 'sh', code: 'pnpm add tracky' },
  ]}
/>
```

One change shown several ways. It renders a real tablist: Arrow keys wrap, Home
and End jump, and the active pane carries the copy button. Every fenced block
gets that copy button on its own, and both outcomes are announced in a live
region.

### `Example`

```mdx
<Example name="button" />
```

Renders `app/examples/button.tsx` and prints that same file through a raw import,
so the demo and the listing cannot drift. The example imports registry source,
mounts a provider against the reserved preview endpoint the page answers itself,
and reports the event the primitive sent. Pass `sendsEvents={false}` for a
primitive that sends nothing (`input`, `textarea`, `label`); the demo still
renders and the readout says that no component event exists instead of waiting
for one. Files live in `website/docs/app/examples/`; every primitive has one.

## The check

```sh
npm run check:docs
```

It runs offline with no browser and no network. A failure names the file, line, and reason:

```text
website/docs/app/src/content/guides/capture-switches.mdx:12: no heading "forms" on /guides/capture-switches.
```

Fix the page, not the checker. A check that is wrong for a real page is a change to this document and to `website/docs/shared/check.ts`, in the same pull request.

## Search

`npm run build:docs` emits `search-index.json` from each page's title, description, headings, and body text. Fenced code, imports, and the prop-only MDX components (`Example`, `CodeTabs`, `PropsTable`) are excluded, so an example is never searchable or copied into the payload. The build fails when the index cannot be generated or exceeds 64 KiB; the app fetches the file only when search first opens.

## Adding a page

1. Create the `.mdx` file in a folder that has a `meta.json`.
2. Add its id to that folder's `pages` array.
3. Add `title` and `description`; add `order` if the position matters.
4. Write headings from `##` down, with one anchor per heading.
5. Run `npm run check:docs`, then `npm run build:docs`.

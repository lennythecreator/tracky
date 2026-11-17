# ADR 0004: The docs site

**Status:** Accepted
**Date:** 2026-11-17
**Issue:** [#43](https://github.com/lennythecreator/tracky/issues/43)
**Background:** [`website/research/docs-site-patterns.md`](../website/research/docs-site-patterns.md)

## Context

Tracky has a landing page, a playground, and a component registry, but no documentation surface. The SDK and the primitives are documented in the root README, which is accurate but long, and the component pages that shadcn/ui and TanStack Query publish have no Tracky equivalent.

The repository already runs Vite + React + Tailwind for the playground, serves one static site from `website/` on Vercel, and ships theme tokens as CSS variables. Anything added for docs should reuse those, stay out of the published package, and not introduce a second framework or a hosted service.

## Decision

Build the docs as a **Vite + React + MDX app in `website/docs/`**, mirroring the playground: source in `app/`, output in `dist/`, served under `/docs/`.

- **Content is MDX with YAML frontmatter.** Title and description come from the page's own frontmatter; the layout renders them and sets `<title>` and the description meta tag from the same values.
- **Navigation is authored.** Each content folder has a `meta.json` that lists its pages in order and names the section; the root folder comes first and the others follow by `order`. A page that is not listed, a listed page with no file, and a folder with no meta all fail the build with the file named.
- **One shell.** Sidebar, on-this-page TOC, previous/next pager, mobile drawer, and skip link live in one layout. The TOC is built from the headings the page just rendered, so a page and its list cannot disagree.
- **Styling reuses the registry tokens.** Tailwind and the `--tracky-*` variables only; no new palette and no second stylesheet of colors.
- **No analytics.** The app mounts no provider, imports nothing from `tracky`, and requests nothing of its own. Reading the docs is not a visit to anyone's endpoint.
- **Static output with a client router.** Vercel builds the docs with the playground and rewrites `/docs/*` to the app, so a link or a reload lands on the same page.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Fumadocs on Next.js (shadcn's stack) | A second framework, a second build system, and a generated content layer for a site with a handful of pages. The repository is deliberately Vite-only. |
| Starlight (Astro) | Per-page HTML and Pagefind for free, but it brings a second component pipeline; the React examples, Tailwind setup, and registry tokens would all need a second integration. |
| VitePress | Markdown-first on Vite and static HTML, but its component model is Vue, which cannot render the React primitives live. |
| Markdown files plus a config-driven nav, as TanStack Query does | The authoring model fits, but it still needs a renderer; once Vite and React are already present, MDX is the shorter path to headings, TOC, and live examples. |
| A hosted docs service | A third-party dependency, credentials, and a content source outside the repository, for a site that ships from this repository. |

## Trade-offs

- **No per-page HTML.** A client-rendered Vite app serves one HTML file, so docs pages are not individually indexable, and a crawler without JavaScript sees no content. The marketing surface is the landing page, so this is acceptable now; prerendering the MDX routes is the follow-up if docs SEO matters.
- **The client router is ours.** Path handling, the docs base path, and the `/docs/*` rewrite live in about forty lines of app code instead of a routing library. It works for one app with one level of nesting; a larger docs tree would want a router.
- **A client-side TOC.** Anchors are assigned after render, from heading text. Two pages that share a heading text get the same anchor, which is fine today and becomes the authoring contract's problem when the pages grow.
- **Build-time content checks only at build start.** Editing a page in dev re-runs the app, not the validation, until the dev server restarts.

## Consequences

- The docs build is a second Vite config and a second `vite build` in the deployment command. Both must stay green in CI.
- `@mdx-js/rollup`, `remark-frontmatter`, and `remark-mdx-frontmatter` are devDependencies. The published package's `exports` and `files` do not change, and no runtime dependency is added.
- The docs app has its own `tsconfig.json` and builds with `npm run build:docs`, which typechecks before it builds, the same way `build:playground` does.
- The site serves the docs from `/docs/dist/`. The app derives its base from the URL, so a route under `/docs/` and the built folder both resolve.
- Search, dark mode, live examples, and the real page content are the following tickets in the docs track.

## References

- [Research: how React libraries build their docs sites](../website/research/docs-site-patterns.md)
- [Component backlog, T-021 and T-022–T-028](../BACKLOG.md)
- [Writing guide](../WRITING.md)
- [Registry theme tokens](../registry/theme/README.md)

# How React libraries build their docs sites

**Research date:** 2026-11-03
**Scope:** What shadcn/ui and TanStack Query actually run for documentation, which static-site tools fit Tracky's stack, and what a docs surface at `website/docs/` should copy or deliberately skip. Checked against the landing page, playground, `product.md`, and `WRITING.md` as they exist today.

## What the reference sites run

### shadcn/ui: one Next.js app with Fumadocs

The docs and the component registry are the same app (`apps/v4`). Its `package.json` shows `next` 16, `fumadocs-core` 16.10.5, `fumadocs-ui`, `fumadocs-mdx` 15, `shiki` with `rehype-pretty-code`, `ts-morph`, `cmdk`, and `next-themes`, plus a `postinstall` hook that runs `fumadocs-mdx` to generate the content layer. [shadcn `apps/v4/package.json`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/package.json)

Three details matter more than the framework:

- **Content is MDX with frontmatter.** Fumadocs' quick start documents the same shape: `content/docs/index.mdx` with a `---` title block, and the framework supplies search, content sources, and Markdown extensions around it. [Fumadocs quick start](https://fumadocs.dev/docs)
- **Examples are real components, shown twice.** A component page like Button renders each example live under a heading (`Default`, `Outline`, `Secondary`, `Icon`, …) and then prints that example's source, ending with an `API Reference` section for props. The source shown comes from the example files the registry also ships, so the rendered demo and the copied code cannot drift. [shadcn Button page](https://ui.shadcn.com/docs/components/button)
- **The nav is grouped and exhaustive.** The sidebar lists Introduction, Components (every primitive), Get Started, Utilities, Registry, API Reference. There is no per-page guessing: the page tree is authored.

Syntax highlighting happens at build time through Shiki and `rehype-pretty-code`; the client never ships a highlighter. Search is a `cmdk` command dialog, and dark mode comes from `next-themes`.

### TanStack Query: Markdown beside the package, config-driven nav

Query's docs are plain `.md` files with frontmatter in the package repo, for example `docs/framework/react/overview.md`:

```md
---
id: overview
title: Overview
---
```

Navigation is hand-maintained in one `docs/config.json`: sections (`Getting Started`, `Guides & Concepts`, …) containing per-framework page lists with `label` and `to` slugs, plus hosted Algolia DocSearch credentials (`docSearch.appId`, `apiKey`, `indexName`). [TanStack Query `docs/config.json`](https://github.com/TanStack/query/blob/main/docs/config.json) · [React overview](https://github.com/TanStack/query/blob/main/docs/framework/react/overview.md)

Its live-example strategy is the opposite of shadcn's: pages link out to StackBlitz for runnable examples and keep inline code fences static. That keeps the docs build cheap but sends readers to another site to try anything.

### The tooling choices in play

- **Fumadocs** is a React docs framework made of four layers — core (search, content sources, Markdown extensions), UI theme, a content source such as Fumadocs MDX, and a CLI for installing layout components. It has templates for Next.js, Waku, React Router, and TanStack Start, and supports static export. [Fumadocs quick start](https://fumadocs.dev/docs)
- **Starlight** (Astro) includes full-text search powered by Pagefind with no configuration, and can swap in Algolia DocSearch. That is the cheapest way to get static HTML plus search. [Starlight site search](https://starlight.astro.build/guides/site-search/)
- **VitePress** is Markdown-first on Vite, generates static HTML and then behaves as a SPA, and embeds Vue components in Markdown. Its authoring model is excellent but its component model is Vue, which does not fit a React component library's live demos. [VitePress](https://vitepress.dev/guide/what-is-vitepress)

| Approach | Static per-page HTML | Search | Live React examples | Cost for Tracky |
| --- | --- | --- | --- | --- |
| Fumadocs + Next.js (shadcn) | Yes | Built in | Yes | A second framework and a heavier build in a repo that is deliberately Vite |
| Starlight (Astro) | Yes | Pagefind, zero config | Yes, as React islands | A second framework and a second component pipeline; Tailwind and tokens need a second integration |
| VitePress | Yes | Built in | No, Vue components | Wrong component model |
| Vite + React + MDX in `website/docs/` | No, until prerendering is added | Generated index later | Yes, directly | Reuses Vite, React, Tailwind, and the existing tokens; sidebar and TOC are written once |

## What transfers to Tracky

**Copy:**

- **One app owns the docs chrome.** Sidebar, header, TOC, and page layout are one implementation, not repeated per page. This is the reason shadcn and Fumadocs feel consistent.
- **MDX with frontmatter as the source of truth.** Title, description, and group come from the file; the nav and page title are derived, not retyped.
- **Authored navigation.** TanStack's `config.json` and Fumadocs' page tree both make order an explicit decision. Tracky's registry also needs a stable component order, so a small `meta.json` per content folder beats alphabetical output.
- **Examples that are real components, with their source shown.** Tracky's docs can import `registry/components/ui/` source directly, the same way the playground does, and print each example from the same file with `?raw`. shadcn pays for a `ts-morph` step; a per-example file plus a raw import gets the same guarantee for less.
- **Build-time syntax highlighting.** Shiki in the build pipeline, no client highlighter.

**Deliberately skip:**

- **Hosted search (Algolia).** It adds a third-party service, an index to keep in sync with every page, and a set of credentials in a public repo. A build-time JSON index over page titles and headings is enough at this size.
- **Next.js or Astro for the docs shell.** Both would work, but the repository already runs Vite for the playground and one Vite config per app is easier to keep honest than two build systems.
- **StackBlitz-style external examples.** Live in-page examples are the point here: the SDK's value is what the event does, and the playground already proves the in-page interception pattern works.

**The one honest trade-off:** a client-rendered Vite app serves one HTML file per deploy, so docs pages are not individually indexable and Pagefind cannot crawl them. shadcn and TanStack get per-page HTML from their frameworks. If docs SEO ever matters, prerendering the MDX routes at build time is the follow-up; it is not required for a site whose marketing surface is the landing page.

## Implications for the build

- Sources live in `website/docs/`, the output in `website/docs/dist/`, mirroring `website/playground/`. Deployment stays static on Vercel.
- MDX compilation (`@mdx-js/rollup`), frontmatter parsing, and Shiki are **devDependencies**. None of them reach the published package, so the SDK's install size is unchanged.
- Live examples must not send events. The playground already answers the SDK's request inside the page; the docs example frame should reuse that mechanism rather than configure a real endpoint.
- Docs pages are developer-facing content, so `WRITING.md` applies: task-first guides, exact behavior, limitations next to the claims they qualify, and no capability the source does not have.
- Dark mode needs tokens, not a second stylesheet: the registry theme already defines colors as CSS variables, so a `data-theme` override layer is the whole implementation.

## Sources

- [shadcn `apps/v4/package.json`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/package.json) — Next.js, Fumadocs, Shiki, `ts-morph`, `cmdk`, `next-themes` dependency list.
- [shadcn Button page](https://ui.shadcn.com/docs/components/button) — grouped sidebar, per-example source, trailing API reference.
- [TanStack Query `docs/config.json`](https://github.com/TanStack/query/blob/main/docs/config.json) — authored nav sections, framework variants, Algolia DocSearch.
- [TanStack Query React overview](https://github.com/TanStack/query/blob/main/docs/framework/react/overview.md) — frontmatter shape and StackBlitz example links.
- [Fumadocs quick start](https://fumadocs.dev/docs) — layers, supported frameworks, MDX frontmatter, static export.
- [Starlight site search](https://starlight.astro.build/guides/site-search/) — Pagefind default, Algolia alternative.
- [VitePress introduction](https://vitepress.dev/guide/what-is-vitepress) — Markdown-first Vite site with Vue components in content.

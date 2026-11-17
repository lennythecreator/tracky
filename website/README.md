# Tracky website

This is a dependency-free static landing page for Tracky's React component library and analytics SDK direction. The SDK is in the current scaffold; the initial component source is in `registry/` and is installed with the `tracky` CLI, but the package is not published yet. Open `index.html` directly or serve this folder locally, for example with `python -m http.server 8000`, then visit `http://localhost:8000`.

The component playground in `playground/` is a Vite + React app that imports the registry components and the SDK source directly. Its event preview runs the SDK's normal delivery path and answers the request inside the page, so interacting with a control shows an event without sending anything.

Run it with hot reload from the repository root:

```sh
npm run dev:playground
```

Then visit `http://localhost:5173`. The app source is in `playground/app/`; the built page ships with the static site in `playground/dist/`, so rebuilding is required after changing a component or the SDK:

```sh
npm run build:playground
```

On the served site the playground is at `http://localhost:8000/playground/`, which forwards to `playground/dist/`. The Vite app root is `playground/app/`, so `playground/index.html` is a plain page rather than the app entry — opening the app's own `index.html` over a static server shows nothing.

## Docs

The documentation app is in `docs/`: a Vite + React app whose pages are MDX files in `docs/app/src/content/`. Each content folder has a `meta.json` that lists its pages in order and names the sidebar section; the build fails, naming the file, when a page is missing from it or a listed page has no file.

```sh
npm run dev:docs
npm run build:docs
```

The dev server serves the app at `http://localhost:5173`, and the built output is in `docs/dist/`. On the site the docs are at `/docs/`, which the deployment config rewrites to the app, so a deep link or a reload lands on the same page. The shell mounts no analytics provider and sends no requests; the live examples mount one against a reserved `.invalid` endpoint that the page answers itself. The stack, the alternatives that were rejected, and the no-per-page-HTML trade-off are in [`../docs/adr/0004-docs-site.md`](../docs/adr/0004-docs-site.md).

## Page metadata and icons

`index.html` carries the canonical URL, description, Open Graph and Twitter card tags, and the theme colour. `og-image.png` is the 1200×630 share image named by `og:image`.

The icon set lives at the root of this folder: `favicon.svg` (primary, the blue route mark), `favicon.ico` (16/32/48 fallback), and `apple-touch-icon.png` (180×180, square so iOS can apply its own rounding). The playground reuses these files; `playground/vite.config.ts` copies them into `playground/dist/` and serves them in dev, so there is no second copy to keep in sync.

Canonical, Open Graph, and Twitter URLs point at `https://tracky-ivory.vercel.app/`. Update them together with `og-image.png` if the site moves to a custom domain or the page copy changes.

## Deploying

`vercel.json` at the repository root builds the playground and the docs app and publishes this folder, so the deployed site is the landing page, the playground at `/playground/`, and the docs at `/docs/`. No environment variables or server code are involved.

On Vercel, import the repository and leave the defaults: the config sets the build command to `npm run build:playground` and the output directory to `website`.

```sh
npx vercel --prod
```

Because the playground is built during deployment, `playground/dist/` does not need to be committed. The published output is this folder as-is, which also exposes `research/`, `SURFACE.md`, and the playground sources — move them out of `website/` or add a staging step if they should not be public.

The self-hosted Plus Jakarta Sans files are licensed under SIL Open Font License 1.1; see `fonts/OFL.txt`.

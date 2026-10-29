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

## Deploying

`vercel.json` at the repository root builds the playground and publishes this folder, so the deployed site is the landing page plus the playground at `/playground/`. No environment variables or server code are involved.

On Vercel, import the repository and leave the defaults: the config sets the build command to `npm run build:playground` and the output directory to `website`.

```sh
npx vercel --prod
```

Because the playground is built during deployment, `playground/dist/` does not need to be committed. The published output is this folder as-is, which also exposes `research/`, `SURFACE.md`, and the playground sources — move them out of `website/` or add a staging step if they should not be public.

The self-hosted Plus Jakarta Sans files are licensed under SIL Open Font License 1.1; see `fonts/OFL.txt`.

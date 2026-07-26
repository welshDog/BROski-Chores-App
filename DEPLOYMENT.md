# Deployment Guide

This app has no backend and needs no environment variables — deployment is just "get the built static files onto the device people will actually use."

## Prerequisites

- Node.js 18+
- npm 9+ (or pnpm/yarn)

There is no Firebase project, no database, and no API to configure. If you see instructions elsewhere referencing any of those for this repo, they're stale — an earlier scaffold assumed a backend that was never built.

## Option 1: Run it directly on the kiosk device (simplest)

Since this is meant to run on one shared device (a tablet on the fridge, a laptop in the kitchen), the least-friction option is often just running the dev server on that device and leaving it open in a browser tab:

```bash
npm install
npm run dev
```

`localStorage` persists to that specific browser, on that specific device — which is exactly the intended model (see the design spec's "Audience & device model" section).

## Option 2: Build and serve locally

If you'd rather not leave a dev server running:

```bash
npm install
npm run build
npx serve dist -l 3000
```

Then open `http://localhost:3000` (or the device's local IP, if accessing from another device on the same network) in the kiosk browser.

## Option 3: Static hosting (Vercel, Netlify, GitHub Pages)

Because there's no backend, any static host works — there's nothing to configure beyond the build command and output directory:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** none required

The repo's `package.json` still has a `deploy` script (`gh-pages -d dist`) and `vite.config.js` sets a `/BROski-Chores-App/` production base path for that specific GitHub Pages target — if you use a different static host, update or remove the `base` config in `vite.config.js` first, or routes won't resolve correctly under a different path prefix.

**Worth knowing if you do host this somewhere shared/public:** `localStorage` is per-browser, per-origin. Hosting this centrally doesn't make it multi-device — each person opening the URL on their own device gets their own empty, independent copy of the app's data. The shared-single-device model (Options 1–2) is what the app is actually designed around.

## Updating dependencies

```bash
npm outdated
npm update
npm test
```

Run the test suite after any dependency bump — `npm test` — before considering an update safe.

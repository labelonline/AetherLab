# AetherLab

Static GitHub Pages dashboard for AetherLab. No build step is required.

## Structure

- `index.html` — lightweight entry point only.
- `partials/` — global overlays/auth/sidebar/footer.
- `views/` — one HTML file per dashboard section.
- `css/` — styles split by subsystem.
- `js/config.js` — public client configuration.
- `js/firebase.js` / `js/firebase-sync.js` — database bootstrap, realtime subscriptions and server clock offset.
- `js/core/` — shared UI/data/state/auth/navigation logic.
- `js/modules/` — releases, moderation, support, finance, karaoke, questionnaires, etc.
- `js/i18n.js` — RU/EN/UK translation engine.
- `js/router.js` — GitHub Pages-compatible in-app routes.

## Overview Dashboard

The Overview is driven by live `appState` data and uses Firebase Realtime Database `.info/serverTimeOffset` when available. The clock refreshes every second and automatically falls back to the browser clock if Firebase time sync is unavailable. Release countdowns and greeting are recalculated from that same clock.

## Deployment

Upload the complete repository structure to GitHub Pages. Do not upload only `index.html`; `partials`, `views`, `css`, and `js` are runtime dependencies.

## Smart Links repository
Public Smart Links are now served by the separate GitHub Pages repository `AetherLab-SmartLinks`.
The dashboard creates URLs in the form `https://labelonline.github.io/AetherLab-SmartLinks/#artist-release`.

# AetherLab refactor — 2026-09-29

## Added
- New live Overview Dashboard with greeting, live clock, time zone, Firebase server-time synchronization state, release counters, attention queue, next approved release/countdown, recent activity, latest news and finance preview.
- `AetherClock` based on Firebase Realtime Database `.info/serverTimeOffset`, with browser-clock fallback.
- Dynamic release-year selector based on the synchronized current year.

## Refactored
- `index.html` reduced to a lightweight entry point.
- HTML split into `partials/` and `views/`.
- CSS split into subsystem files in `css/`.
- JavaScript split into `js/core/` and `js/modules/`.
- Firebase initialization/realtime synchronization separated into `js/firebase.js` and `js/firebase-sync.js`.
- Moderation, releases, finance, support, translations, routing, karaoke, questionnaires, AI helpers and marketing logic are now separate files.
- GitHub Pages still requires no build step.

## Fixed
- Removed an accidental duplicate promo-link JavaScript block that had been embedded inside a `<style>` block in the original file.
- Fixed duplicated `Sitemap:` prefix in `robots.txt`.
- Removed legacy Kite SEO keywords from the footer.

## Important
- This refactor intentionally preserves the existing authentication/business behavior for compatibility. The old password-based client authentication is still present in `js/core/auth.js`; migrating to Firebase Authentication remains a separate security task.

## UI fix — Overview + sidebar
- Исправлен чёрный текст в интерактивных карточках Overview.
- Новости, активность и задачи теперь раскладываются по отдельным строкам и не выходят за границы карточек.
- Добавлено аккуратное обрезание длинных описаний с многоточием.
- Убран горизонтальный overflow Dashboard.
- Добавлено сворачивание боковой панели до режима «только иконки» с сохранением состояния в браузере.

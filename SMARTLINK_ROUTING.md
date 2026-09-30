# AetherLab Smart Links routing

Public Smart Links are hosted by a separate GitHub Pages project:

- Dashboard/editor: https://labelonline.github.io/AetherLab/
- Public Smart Links: https://labelonline.github.io/AetherLab-SmartLinks/#<slug>

The AetherLab dashboard writes the editable record to `promoLinks/<id>` and a public-safe copy to `publicSmartLinks/<slug>` in the same Firebase Realtime Database.

The public repository reads only the Smart Link data it needs. The old `smartlink.html` renderer was intentionally removed from the main repository so it cannot replace or interfere with the dashboard entry point.

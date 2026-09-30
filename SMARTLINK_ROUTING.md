# AetherLab Smart Links routing

- Main cabinet: https://labelonline.github.io/AetherLab/
- Public Smart Links host: https://labelonline.github.io/AetherLab-SmartLinks/
- Generated URL format: https://labelonline.github.io/AetherLab-SmartLinks/#artist-release
- The main cabinet writes public-safe data to Firebase `publicSmartLinks/<slug>`.
- The public repository only reads the public Smart Link payload and renders it.
- Build `20260930-smartlinks-5` uses cache-busting for partials and JS so old promo UI does not remain cached.

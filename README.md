# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover turns your photos into GTA 6-style cover art: a multi-panel poster with bold outlined lettering and a Vice City sunset or neon colour grade, exported as a PNG to share. It runs offline in a desktop browser from its own static files — your photos never leave your machine.

## What it does

- **Multi-panel layouts** — hero + two small panels, three vertical strips, a 2 x 2 grid, or a single full photo. Load one photo to fill every panel, or several and put a different one in each.
- **Crop every panel** — click a panel to select it, drag to pan, scroll to zoom, double-click to swap its photo. A zoom slider crops the selected panel too.
- **Caption your way** — bold poster lettering with a dark outline and drop shadow, a subtitle line, three colours, top or bottom, and a size slider.
- **Colour grades** — Vice City sunset, neon, dusk, or none, painted over every panel.
- **Three post sizes** — export a PNG at 1920 x 1080, 1080 x 1080 or 1080 x 1350 in one click, straight from the live canvas preview.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080, load a photo (or try the sample photos), arrange the panels, write a caption, pick a grade, and export a PNG.

The two sample photos in `app/samples/` were made with an image model for make.fun and are free to use. Everything in the app is original: no Rockstar Games logo, artwork or font.

## How it is built

- `app/src/cover.js` — the drawing engine: panel rectangles for each layout, cover-fit photo drawing with per-panel zoom and pan, the grade gradients, and the outlined caption lettering.
- `app/src/main.js` — the editor wiring: photo tray, layout and grade buttons, caption controls, pointer drag and wheel zoom on the canvas, and the PNG export.
- `app/src/shots.js` — the fixed `?shot=` scenes used for the screenshots in `screenshots/`.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nyfg51za&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover

Vice Cover turns your photos into GTA 6-style cover art: a multi-panel poster
with huge outlined gradient lettering, a Vice City sunset or neon colour
grade, and a PNG export to share. It runs offline in a desktop browser from
its own static files — your photos never leave your machine.

## What it does

- **Four layouts** — hero + 2, three strips, 2 x 2 grid, or a single photo.
- **Any photo** — drag a panel to crop it, scroll to zoom, double-click to
  swap photos. Load your own photos or use the two sample photos.
- **One-click presets** — Sunset Heist, Neon Nights and Dusk Drive set the
  layout, grade, caption and photos in one tap.
- **Bold lettering** — a huge caption with a thick dark outline, a gradient
  fill and a hard 3D shadow, plus a subtitle in a dark pill that reads over
  any photo.
- **Four grades** — Vice City sunset, neon, dusk, or none. The grades are
  painted over every panel like a printed poster, not a thin wash.
- **Three export sizes** — 1920 x 1080, 1080 x 1080, and 1080 x 1350 PNGs.

## How it is built

- `app/src/cover.js` — the drawing engine: panel layouts, photo punch and
  colour grades, the giant title lettering and the subtitle pill.
- `app/src/main.js` — the editor: photos, layouts, grades, caption, presets,
  pan/zoom per panel, export sizes, and the `?shot=` scenes.
- `app/src/shots.js` — the fixed `?shot=` scenes used for the screenshots in
  `screenshots/`.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library.

The two sample photos in `app/samples/` come from the competition kit and are
free to use. Everything in the app is original: no Rockstar Games logo,
artwork or font.

## Try it

Serve `app/` locally and open it in a desktop browser:

```sh
node serve.ts
# app/ is on http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=nyfg51za&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

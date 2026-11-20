[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover — GTA 6 Cover Art Maker

Turn any photo into a GTA 6-style multi-panel poster cover, offline in your
browser. Pick a photo, frame it in one of five layouts, tap a one-click
preset, type your title, and export a PNG to share.

- **5 layouts** — Hero, Grid 2×2, Triptych, Cinematic, Split
- **5 one-click presets** — Sunset Heist, Neon Nights, Dusk Drive, Palm Gold, Vice Noir
- **4 photo grades** — Sunset, Neon, Noir, Palm Gold
- **Per-panel crop** — drag to pan, scroll or slide to zoom, upload your own photo per panel
- **Export sizes** — Square 1080 × 1080, Portrait 1080 × 1350, Wide 1920 × 1080

## Run it

Serve `app/` with any static server and open `index.html`:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` straight from the folder — everything runs offline,
no network request, your photos never leave your machine.

## How to make a cover

1. **Select photo** — a sample is loaded already, or upload your own per panel.
2. **Pick a preset** — one click sets layout, grade, title and subtitle.
3. **Type title** — it auto-fits the cover width and sits above the subtitle pill.
4. **Export PNG** — choose a size and download.

## Files

- `app/` — the web app (static files, no build step)
- `app/samples/` — two free-to-use sample photos from the make.fun kit
- `screenshots/` — the cover and the editor in action
- `main.ts` — hands the app in (copies `app/` + `screenshots/` and writes the dossier)

Made for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

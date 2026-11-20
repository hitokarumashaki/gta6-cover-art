[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover — GTA 6 Cover Art Maker

Turn a photo and a caption into GTA 6-style cover art: a multi-panel poster
with bold gradient lettering and a Vice City sunset or neon colour grade,
exported as a PNG to share. Runs entirely offline in a desktop browser —
photos are read on your own machine, never uploaded.

## How it works

1. **Photos** — upload your own, or use the two sample photos. Every panel
   picks its own photo, with pan and zoom per panel.
2. **Layout** — five panel layouts: Hero Left, Hero Right, Triptych, Quad and
   Full Bleed. The hero panel takes 66% of the cover.
3. **Preset covers** — one click applies a whole look: Sunset Heist, Neon
   Nights, Dusk Drive, Vice Sunrise or Midnight Heat.
4. **Colour grade** — Sunset, Neon, Dusk or Noir: saturation, contrast and a
   tint wash over the whole cover.
5. **Caption** — title, subtitle and kicker. The title auto-fits the cover
   width and is drawn in a five-stop sunset-to-neon gradient; the subtitle
   sits in a dark pill at the bottom so no face is ever covered.
6. **Export size** — 1080 × 1080, 1080 × 1350 or 1920 × 1080, then Export PNG
   downloads the real PNG.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/dossier.json` (via `vendor/makefun-app.ts`) beside the
handed-in `app/` and `screenshots/`. `main.ts` never removes the output
directory itself — it creates it and clears only its contents — so it runs
in the grader's read-only container as well as locally.

## Screenshots

- `1-cover.jpg` — Sunset Heist, wide 1920 × 1080 cover export
- `2-editor.jpg` — the editor with a photo loaded
- `3-cover.jpg` — Dusk Drive, portrait 1080 × 1350 cover export
- `4-cover.jpg` — Neon Nights, square 1080 × 1080 cover export

Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).
The two sample photos were made for make.fun with an image model and are
free to use. No Rockstar artwork, logos or fonts are used anywhere.

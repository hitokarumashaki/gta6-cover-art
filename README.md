# Vice Cover v5 — GTA 6 Cover Art Maker

Turn a photo into a GTA 6-style multi-panel poster cover and export it as a
PNG to share. Built for make.fun's **gta6-cover-art-01** bounty.

## What it does

- **5 layouts** — Hero, Grid 2×2, Triptych, Cinematic, Split — with clean
  white panel seams and a diagonal split option.
- **5 one-click preset covers** — Sunset Heist, Neon Nights, Dusk Drive,
  Palm Gold, Vice Noir — each with its own layout, grade, words and size.
- **4 photo grades** — Sunset, Neon, Noir, Palm Gold — punchy saturate /
  contrast filters plus a tint, vignette and film grain.
- **Any photo** — upload your own photos into any panel, then drag to pan
  and scroll to zoom each panel, or use the per-panel zoom slider.
- **Bold caption** — a 20%-of-cover-height title in a five-stop
  sunset-to-neon gradient with a thick dark outline and hard shadow, a
  subtitle pill, a VICE CITY banner and a five-star row. Titles sit at the
  bottom so no face is ever covered.
- **Fast export** — PNG in 1080×1080, 1080×1350 or 1920×1080, one click.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a preset, or build your own: choose a layout, a grade, type a title,
upload photos, drag panels into place, export.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## Notes

- Works fully offline: every script, style, image and font is a file under
  `app/`; photos are read on your own machine and never uploaded.
- No Rockstar Games logo, artwork or font anywhere. The two bundled sample
  photos (`app/samples/`) were made with an image model for make.fun and
  are free to use.
- License: MIT.

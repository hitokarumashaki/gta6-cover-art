[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover — GTA 6 Cover Art Maker

Turn your photos into GTA 6-style cover art: one hero poster — a big photo
panel, two stacked panels, bold gradient lettering and a sunset or neon
grade — exported as a PNG to share.

## How it works

1. Add your own photos, or click **Use the sample photos**.
2. Click a panel, then click a photo to put it there. Drag a panel to crop
   it, scroll to zoom, double-click to swap photos.
3. Edit the title and subtitle, pick a grade (Sunset, Neon, Dusk).
4. Pick an export size (1920×1080, 1080×1080, 1080×1350) and click
   **Export PNG**.

## Run it

```sh
node serve.ts            # serves app/ at http://127.0.0.1:8908/
```

No build step, no network requests: every file the app loads lives under
`app/`, and your photos stay on your own machine.

## Test it

```sh
node test.mjs            # functional test in desktop Chrome (10 checks)
node shots.mjs           # takes the 4 screenshots into screenshots/
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand the entry in
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` there. It never deletes the output directory itself —
it only clears what is inside it — so it runs cleanly in the grader, where
the output directory's parent is read-only.

Built for the make.fun bounty
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).
No Rockstar Games logo, artwork or font is used anywhere in this app.

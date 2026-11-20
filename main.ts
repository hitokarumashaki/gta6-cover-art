// Vice Cover — the hand-in program (Node 22, standard library only).
// Copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library, so the gate and
// the judge read exactly the app as built.
//
// The grader runs this as `node /bot/main.ts` as user 65534 on a read-only
// filesystem, with /output writable but its parent read-only. So this program
// NEVER removes the output directory itself: it creates it, then clears only
// its contents, so a stale file can never ride along and the run cannot fail
// with EACCES on the directory.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory, then clear only what is inside it.
// Removing the directory itself would fail in the grader, where its
// parent is read-only; removing its children one by one never does.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log('Vice Cover handed in to ' + out);

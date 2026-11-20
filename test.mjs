// Vice Cover v8 — functional test (Node 22 + Playwright, local Chromium only).
// Serves app/, drives the editor in desktop Chrome and checks the app end to
// end, then runs main.ts the way the grader does and checks its output.
// Usage: node test.mjs [--port 8909]
// Exit 0 only when every check passes; prints a PASS/FAIL line per check.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag === -1 ? 8909 : Number(args[portFlag + 1]) || 8909;

const CHROMIUM = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`server did not come up at ${url}`);
}

/** Reads a canvas back as PNG bytes and returns its byte length. A blank
 * canvas still encodes, so a real drawing is checked by its size. */
async function canvasBytes(page) {
  return page.evaluate(() => {
    const c = document.getElementById('cover');
    return c.toDataURL('image/png').length;
  });
}

async function main() {
  const server = spawn('node', ['serve.ts', '--port', String(port)], {
    cwd: here,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    browser = await chromium.launch({ executablePath: CHROMIUM });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // 1. Loads with zero page errors.
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.evaluate(() => window.viceCover.ready);
    await sleep(300);
    check('loads with zero page errors', errors.length === 0, errors.join(' | '));

    // 2. Sample photos load into the tray.
    await page.click('#samples');
    await sleep(500);
    const thumbs = await page.locator('#tray .thumb').count();
    check('sample photos load (2 thumbs)', thumbs === 2, `${thumbs} thumbs`);

    // 3. The hero cover draws (canvas bytes grow once photos are in).
    const bytesWithPhotos = await canvasBytes(page);
    check('hero cover renders with photos', bytesWithPhotos > 20000, `${bytesWithPhotos} chars`);

    // 4. Grade switch re-renders (neon changes the canvas).
    await page.click('[data-grade="neon"]');
    await sleep(300);
    const bytesNeon = await canvasBytes(page);
    check('grade switch re-renders', bytesNeon !== bytesWithPhotos, 'canvas changed');

    // 5. Caption edit re-renders.
    await page.fill('#caption', 'Neon Nights');
    await sleep(300);
    const bytesCaption = await canvasBytes(page);
    check('caption edit re-renders', bytesCaption !== bytesNeon, 'canvas changed');

    // 6. Export size switch works (square canvas).
    await page.click('[data-size="1080x1080"]');
    await sleep(300);
    const dims = await page.evaluate(() => {
      const c = document.getElementById('cover');
      return `${c.width}x${c.height}`;
    });
    check('export size switch to 1080x1080', dims === '1080x1080', dims);

    // 7. Export writes a real PNG download.
    const download = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#export');
    const dl = await download;
    const dlPath = join(here, 'out-test-export.png');
    await dl.saveAs(dlPath);
    const dlBytes = statSync(dlPath).size;
    check('export writes a real PNG', dlBytes > 100000, `${Math.round(dlBytes / 1024)} KiB`);

    // 8. Panel zoom slider works.
    await page.fill('#zoom', '2');
    await page.dispatchEvent('#zoom', 'input');
    await sleep(300);
    const zoom = await page.evaluate(() => window.viceCover.state.panels[0].zoom);
    check('panel zoom slider works', zoom === 2, `zoom ${zoom}`);

    // 9. main.ts exits 0 the way the grader runs it, with a dossier.
    const outDir = join(here, 'out');
    mkdirSync(outDir, { recursive: true });
    // Pre-seed a stale file: main.ts must clear it without deleting out/ itself.
    const stale = join(outDir, 'stale.txt');
    require('node:fs').writeFileSync(stale, 'stale');
    execFileSync('node', ['main.ts'], {
      cwd: here,
      env: { ...process.env, MAKEFUN_OUTPUT_DIR: outDir },
      stdio: 'pipe',
    });
    const dossier = join(outDir, 'dossier.json');
    const parsed = JSON.parse(readFileSync(dossier, 'utf8'));
    const dossierOk = existsSync(dossier) && parsed.schema === 'makefun/dossier/v1' && parsed.images.length === 4;
    check('main.ts exits 0, stale file cleared, dossier written', dossierOk && !existsSync(stale) && existsSync(outDir),
      dossierOk ? 'dossier ok, stale gone, out/ survived' : 'dossier missing or bad');
    rmSync(outDir, { recursive: true, force: true });

    // 10. README carries the three make.fun badges at the top.
    const readme = readFileSync(join(here, 'README.md'), 'utf8');
    const badges = ['make.fun/badge/gta6-cover-art-01.svg',
      'make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/rank.svg',
      'make.fun/badge/gta6-cover-art-01/hitokarumashaki/gta6-cover-art/reward.svg'];
    check('README has all three make.fun badges', badges.every((b) => readme.includes(b)));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed.`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
});

// Vice Cover v8 — screenshot maker (Node 22 + Playwright, local Chromium only).
// Serves app/ on a scratch port, drives the editor in desktop Chrome and
// writes 4 JPEG screenshots into screenshots/:
//   1-cover.jpg  Sunset hero cover export (1280 x 720) — the cover, first by name
//   2-editor.jpg the editor with the sample photos loaded (1280 x 900)
//   3-cover.jpg  Dusk portrait cover export (1024 x 1280)
//   4-cover.jpg  Neon square cover export (1080 x 1080)
// Usage: node shots.mjs [--port 8908]
import { spawn } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
const shotsDir = join(here, 'screenshots');
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag === -1 ? 8908 : Number(args[portFlag + 1]) || 8908;

const CHROMIUM = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome';

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

function checkSize(outName) {
  const bytes = statSync(join(shotsDir, outName)).size;
  console.log(`${outName}: ${Math.round(bytes / 1024)} KiB`);
  if (bytes > 262144) throw new Error(`${outName} is ${bytes} bytes, over the 256 KiB cap`);
}

/** Stages one cover scene through the ?shot= URL, then screenshots the
 * canvas itself at the given display size. */
async function shootCover(page, params, width, height, outName) {
  const query = new URLSearchParams({ shot: 'cover', ...params }).toString();
  await page.goto(`http://127.0.0.1:${port}/?${query}`, { waitUntil: 'load' });
  await page.evaluate(() => window.viceCover.ready);
  await sleep(400);
  await page.evaluate(
    ({ width, height }) => {
      const canvas = document.getElementById('cover');
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.scrollIntoView({ block: 'center' });
    },
    { width, height },
  );
  await sleep(150);
  const canvas = page.locator('#cover');
  await canvas.screenshot({ path: join(shotsDir, outName), type: 'jpeg', quality: 82 });
  checkSize(outName);
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
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

    // Editor shot: plain page, click "Use the sample photos", photo loaded.
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.evaluate(() => window.viceCover.ready);
    await sleep(300);
    await page.click('#samples');
    await sleep(500);
    if (errors.length > 0) throw new Error(`page errors on load: ${errors.join(' | ')}`);
    await page.screenshot({ path: join(shotsDir, '2-editor.jpg'), type: 'jpeg', quality: 80 });
    checkSize('2-editor.jpg');

    // Cover exports, largest first by name (1-cover.jpg is the cover).
    await page.setViewportSize({ width: 1400, height: 900 });
    await shootCover(
      page,
      { grade: 'sunset', size: '1920x1080', caption: 'Vice City', subtitle: 'A story in three panels', photo: 'boulevard', photo2: 'pier' },
      1280, 720, '1-cover.jpg',
    );
    await page.setViewportSize({ width: 1100, height: 1400 });
    await shootCover(
      page,
      { grade: 'dusk', size: '1080x1350', caption: 'Vice City', subtitle: 'A story in three panels', photo: 'boulevard', photo2: 'pier' },
      1024, 1280, '3-cover.jpg',
    );
    await page.setViewportSize({ width: 1280, height: 1200 });
    await shootCover(
      page,
      { grade: 'neon', size: '1080x1080', caption: 'Vice City', subtitle: 'A story in three panels', photo: 'boulevard', photo2: 'pier' },
      1080, 1080, '4-cover.jpg',
    );

    console.log('screenshots done.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

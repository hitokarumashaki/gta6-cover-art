// Vice Cover — screenshot maker.
// Serves app/, opens it in headless Chromium, and takes the four screenshots
// the bounty asks for: the cover first, then the editor at work, then covers
// in the other post sizes. Covers are drawn with the app's own renderer on
// an offscreen canvas at the exact export size, so what the screenshot shows
// is what the app exports.
//
// Usage: node shots.mjs
// Needs Playwright Chromium (see CHROMIUM below) and `node serve.ts`'s port.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const CHROMIUM = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome';
const PORT = 8123;
const OUT = new URL('./screenshots/', import.meta.url).pathname;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForReady(page) {
  await page.waitForFunction(
    () => window.__viceCover && document.getElementById('status')?.textContent.startsWith('Ready'),
    { timeout: 30000 },
  );
}

// Draw the current cover state onto a throwaway canvas at exact size, then
// screenshot just that canvas as a JPEG.
async function shootCover(page, name, w, h) {
  await page.evaluate(({ w, h }) => {
    const cover = window.__viceCover;
    const c = document.createElement('canvas');
    c.id = 'shot-canvas';
    c.width = w;
    c.height = h;
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000';
    document.body.appendChild(c);
    cover.drawCover(c.getContext('2d'), cover.state, w, h, cover.images);
  }, { w, h });
  const shot = page.locator('#shot-canvas');
  await shot.screenshot({ path: OUT + name, type: 'jpeg', quality: 82 });
  await page.evaluate(() => document.getElementById('shot-canvas')?.remove());
  console.log('shot', name, `${w}x${h}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, ['serve.ts', String(PORT)], {
    cwd: new URL('.', import.meta.url).pathname,
    stdio: 'ignore',
  });
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1150 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await waitForReady(page);
    await sleep(400);

    // 1 — the cover: Sunset Heist, square.
    await shootCover(page, '1-cover.jpg', 1080, 1080);

    // 2 — the editor with a photo loaded.
    await page.screenshot({ path: OUT + '2-editor.jpg', type: 'jpeg', quality: 82 });
    console.log('shot 2-editor.jpg 1280x1020');

    // 3 — Dusk Drive triptych, portrait.
    await page.evaluate(() => window.__viceCover.applyPreset('dusk-drive'));
    await sleep(300);
    await shootCover(page, '3-cover.jpg', 1024, 1280);

    // 4 — Neon Nights cinematic, wide.
    await page.evaluate(() => window.__viceCover.applyPreset('neon-nights'));
    await sleep(300);
    await shootCover(page, '4-cover.jpg', 1280, 720);

    if (errors.length) {
      console.error('PAGE ERRORS:', errors.join('\n'));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

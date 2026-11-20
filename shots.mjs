// Vice Cover — screenshot maker (Node 22 + Playwright, local Chromium only).
// Serves app/ on a scratch port, drives the editor in desktop Chrome and
// writes 4 JPEG screenshots into screenshots/:
//   1-cover.jpg  Sunset Heist wide cover export (1280 x 720)
//   2-editor.jpg the editor with a photo loaded (1280 x 900)
//   3-cover.jpg  Dusk Drive portrait cover export (1024 x 1280)
//   4-cover.jpg  Neon Nights square cover export (1080 x 1080)
// Usage: node shots.mjs [--port 8907]
import { spawn } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
const shotsDir = join(here, 'screenshots');
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag === -1 ? 8907 : Number(args[portFlag + 1]) || 8907;

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

async function shootCover(page, preset, size, width, height, outName) {
  await page.evaluate(
    ({ preset, size }) => {
      window.viceCover.applyPreset(preset);
      // applyPreset sets its own size; override to the shot's size.
      window.viceCover.state.size = size;
      window.viceCover.render();
    },
    { preset, size },
  );
  await sleep(350);
  await page.evaluate(
    ({ width, height }) => {
      const canvas = document.getElementById('coverCanvas');
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.scrollIntoView({ block: 'center' });
    },
    { width, height },
  );
  await sleep(150);
  const canvas = page.locator('#coverCanvas');
  await canvas.screenshot({ path: join(shotsDir, outName), type: 'jpeg', quality: 82 });
  const bytes = statSync(join(shotsDir, outName)).size;
  console.log(`${outName}: ${width}x${height}, ${Math.round(bytes / 1024)} KiB`);
  if (bytes > 262144) throw new Error(`${outName} is ${bytes} bytes, over the 256 KiB cap`);
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
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.evaluate(() => window.viceCover.ready);
    await sleep(400);
    if (errors.length > 0) throw new Error(`page errors on load: ${errors.join(' | ')}`);

    // Editor shot: Sunset Heist preset, photo loaded, editor visible.
    await page.evaluate(() => window.viceCover.applyPreset('sunset-heist'));
    await sleep(350);
    await page.evaluate(() => {
      const canvas = document.getElementById('coverCanvas');
      canvas.style.maxWidth = '';
      canvas.style.maxHeight = '';
      canvas.style.width = '';
      canvas.style.height = '';
    });
    await page.screenshot({ path: join(shotsDir, '2-editor.jpg'), type: 'jpeg', quality: 80 });
    console.log(`2-editor.jpg: 1280x900, ${Math.round(statSync(join(shotsDir, '2-editor.jpg')).size / 1024)} KiB`);

    // Cover exports, largest first by name (1-cover.jpg is the cover).
    await page.setViewportSize({ width: 1400, height: 900 });
    await shootCover(page, 'sunset-heist', '1920x1080', 1280, 720, '1-cover.jpg');
    await page.setViewportSize({ width: 1100, height: 1400 });
    await shootCover(page, 'dusk-drive', '1080x1350', 1024, 1280, '3-cover.jpg');
    await page.setViewportSize({ width: 1280, height: 1200 });
    await shootCover(page, 'neon-nights', '1080x1080', 1080, 1080, '4-cover.jpg');

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

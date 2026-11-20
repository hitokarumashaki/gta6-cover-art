// Vice Cover v5 — functional test (9 checks).
// Serves app/ locally, drives it in headless Chromium (Playwright) and
// reports PASS/FAIL per check. Run: node test.mjs

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/node_modules/playwright/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(here, 'app');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

function serveApp() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = req.url === '/' ? '/index.html' : String(req.url).split('?')[0];
      const file = join(appDir, path);
      if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function launchBrowser() {
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  try {
    return await chromium.launch({ args });
  } catch (e) {
    return await chromium.launch({
      args,
      executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome',
    });
  }
}

// A fingerprint of the current cover: the canvas drawn down to a 32x32
// thumbnail, hashed pixel by pixel — dense enough to catch title changes.
function fingerprintScript() {
  return () => {
    const c = window.__viceCover.canvas;
    const thumb = document.createElement('canvas');
    thumb.width = 32;
    thumb.height = 32;
    const tctx = thumb.getContext('2d');
    tctx.drawImage(c, 0, 0, 32, 32);
    const d = tctx.getImageData(0, 0, 32, 32).data;
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < d.length; i += 4) {
      h1 = (h1 * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0;
      h2 = (h2 * 17 + d[i] * 5 + d[i + 1] + d[i + 2] * 11) >>> 0;
    }
    return `${c.width}x${c.height}:${h1.toString(36)}-${h2.toString(36)}`;
  };
}

async function main() {
  const checks = [];
  const check = (name, ok) => {
    checks.push([name, ok]);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  };
  const { server, port } = await serveApp();
  const base = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(`${base}/index.html`);
    await page.waitForFunction(() => window.__viceCover && window.__viceCover.canvas.width > 0);
    await page.waitForTimeout(500);

    // 1. App loads with no page errors.
    check('1. app loads, canvas present, no page errors', errors.length === 0);

    // 2. Photos loaded: the cover is not a blank dark canvas.
    const brightness = await page.evaluate(() => {
      const c = window.__viceCover.canvas;
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 401 * 4) { sum += d[i] + d[i + 1] + d[i + 2]; n++; }
      return sum / n;
    });
    check('2. sample photos render (cover is not blank)', brightness > 40);

    // 3. Layout switch changes the render.
    const fp0 = await page.evaluate(fingerprintScript());
    await page.click('[data-layout="grid"]');
    await page.waitForTimeout(300);
    const fpGrid = await page.evaluate(fingerprintScript());
    check('3. layout switch re-renders (Hero -> Grid 2x2)', fpGrid !== fp0);

    // 4. Preset apply updates the caption and the render.
    await page.click('[data-preset="neonNights"]');
    await page.waitForTimeout(300);
    const title = await page.inputValue('#titleInput');
    check('4. preset applies (Neon Nights sets title)', title === 'NEON NIGHTS');

    // 5. Grade switch changes the render.
    const fpNeon = await page.evaluate(fingerprintScript());
    await page.click('[data-grade="noir"]');
    await page.waitForTimeout(300);
    const fpNoir = await page.evaluate(fingerprintScript());
    check('5. grade switch re-renders (Neon -> Noir)', fpNoir !== fpNeon);

    // 6. Size switch changes the canvas dimensions.
    await page.click('[data-size="1080x1350"]');
    await page.waitForTimeout(300);
    const dims = await page.evaluate(() => {
      const c = window.__viceCover.canvas;
      return `${c.width}x${c.height}`;
    });
    check('6. size switch resizes canvas (1080x1350)', dims === '1080x1350');

    // 7. Title edit changes the render.
    const fpBefore = await page.evaluate(fingerprintScript());
    await page.fill('#titleInput', 'PALM CITY');
    await page.waitForTimeout(300);
    const fpAfter = await page.evaluate(fingerprintScript());
    check('7. caption edit re-renders (title -> PALM CITY)', fpAfter !== fpBefore);

    // 8. Export produces a PNG download.
    const download = page.waitForEvent('download', { timeout: 10000 });
    await page.click('#exportBtn');
    const dl = await download;
    const path = await dl.path();
    const header = readFileSync(path).subarray(0, 8);
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    check('8. export downloads a PNG file', isPng && dl.suggestedFilename().endsWith('.png'));

    // 9. Per-panel zoom slider changes the render.
    await page.click('[data-layout="hero"]');
    await page.waitForTimeout(200);
    const fpZ0 = await page.evaluate(fingerprintScript());
    await page.evaluate(() => {
      const slider = document.querySelector('.panel-row input[type="range"]');
      slider.value = '2';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    const fpZ1 = await page.evaluate(fingerprintScript());
    check('9. panel zoom slider re-renders', fpZ1 !== fpZ0);
  } finally {
    await browser.close();
    server.close();
  }
  const passed = checks.filter(([, ok]) => ok).length;
  console.log(`\n${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

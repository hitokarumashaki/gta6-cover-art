// Vice Cover v5 — screenshot maker.
// Serves app/ locally, drives it in headless Chromium (Playwright) and
// writes 3-4 JPEG screenshots into screenshots/:
//   1-cover.jpg  the app's exported PNG (Sunset Heist, square), scaled down
//   2-editor.jpg the editor in the browser with a photo loaded
//   3-cover.jpg  an exported portrait cover (Dusk Drive)
//   4-cover.jpg  an exported wide cover (Neon Nights)
// Every shot stays within the gate: long side <= 1280, short side >= 480,
// each file <= 256 KiB. Run: node shots.mjs

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/node_modules/playwright/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
const MAX_BYTES = 256 * 1024;

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

// The app's exported PNG, shown scaled down as a JPEG that fits the gate.
async function exportCoverShot(browser, base, preset, targetW, targetH) {
  const page = await browser.newPage({ viewport: { width: targetW, height: targetH } });
  await page.goto(`${base}/index.html?shot=cover&preset=${preset}`);
  await page.waitForFunction(() => window.__viceCover && window.__viceCover.canvas.width > 0);
  await page.waitForTimeout(600);
  const pngData = await page.evaluate(() => {
    const c = window.__viceCover.canvas;
    return c.toDataURL('image/png');
  });
  await page.close();
  // Show the PNG itself in a fresh page and capture it as a JPEG.
  const shot = await browser.newPage({ viewport: { width: targetW, height: targetH } });
  await shot.setContent(
    `<body style="margin:0"><img src="${pngData}" style="width:${targetW}px;height:${targetH}px;display:block"></body>`,
  );
  await shot.waitForTimeout(300);
  let quality = 88;
  let buf = null;
  while (quality >= 40) {
    buf = await shot.screenshot({ type: 'jpeg', quality });
    if (buf.length <= MAX_BYTES) break;
    quality -= 12;
  }
  await shot.close();
  return buf;
}

async function editorShot(browser, base, preset) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1020 } });
  await page.goto(`${base}/index.html?shot=editor&preset=${preset}`);
  await page.waitForFunction(() => window.__viceCover && window.__viceCover.canvas.width > 0);
  await page.waitForTimeout(600);
  let quality = 85;
  let buf = null;
  while (quality >= 40) {
    buf = await page.screenshot({ type: 'jpeg', quality });
    if (buf.length <= MAX_BYTES) break;
    quality -= 12;
  }
  await page.close();
  return buf;
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  const { server, port } = await serveApp();
  const base = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  const results = [];
  try {
    const cover1 = await exportCoverShot(browser, base, 'sunsetHeist', 1080, 1080);
    writeFileSync(join(shotsDir, '1-cover.jpg'), cover1);
    results.push(['1-cover.jpg', cover1.length, '1080x1080']);
    const editor = await editorShot(browser, base, 'sunsetHeist');
    writeFileSync(join(shotsDir, '2-editor.jpg'), editor);
    results.push(['2-editor.jpg', editor.length, '1280x1020']);
    const cover3 = await exportCoverShot(browser, base, 'duskDrive', 1024, 1280);
    writeFileSync(join(shotsDir, '3-cover.jpg'), cover3);
    results.push(['3-cover.jpg', cover3.length, '1024x1280']);
    const cover4 = await exportCoverShot(browser, base, 'neonNights', 1280, 720);
    writeFileSync(join(shotsDir, '4-cover.jpg'), cover4);
    results.push(['4-cover.jpg', cover4.length, '1280x720']);
  } finally {
    await browser.close();
    server.close();
  }
  for (const [name, bytes, dims] of results) {
    const ok = bytes <= MAX_BYTES ? 'OK ' : 'OVER';
    console.log(`${ok} ${name} ${dims} ${(bytes / 1024).toFixed(1)} KiB`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

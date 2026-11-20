// Vice Cover — functional tests (Node 22 + Playwright, local Chromium only).
// Drives the app in desktop Chrome and checks the editor end to end, then
// runs main.ts the way the grader does and checks the dossier it writes.
// Usage: node test.mjs [--port 8908]
// Exits 0 when every check passes, 1 otherwise.
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/package.json');
const { chromium } = require('playwright');

const here = fileURLToPath(new URL('.', import.meta.url));
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

// A cheap checksum over sampled canvas pixels: changes when the render does.
async function canvasHash(page) {
  return page.evaluate(() => {
    const c = document.getElementById('coverCanvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 997) {
      h ^= d[i];
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  });
}

async function canvasIsBlank(page) {
  return page.evaluate(() => {
    const c = document.getElementById('coverCanvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 401) {
      seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (seen.size > 24) return false;
    }
    return true;
  });
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
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

    check('loads with zero page errors', errors.length === 0, errors.join(' | '));

    const blank = await canvasIsBlank(page);
    check('photos render (canvas is not blank)', !blank);

    const h0 = await canvasHash(page);
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#layoutRow .chip')];
      btns.find((b) => b.textContent === 'Triptych').click();
    });
    await sleep(300);
    const h1 = await canvasHash(page);
    check('layout switch re-renders', h0 !== h1);

    await page.evaluate(() => window.viceCover.applyPreset('neon-nights'));
    await sleep(300);
    const titleAfterPreset = await page.evaluate(() => document.getElementById('titleInput').value);
    const h2 = await canvasHash(page);
    check(
      'preset applies (Neon Nights title + re-render)',
      titleAfterPreset === 'NEON NIGHTS' && h1 !== h2,
      `title=${titleAfterPreset}`,
    );

    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#gradeRow .chip')];
      btns.find((b) => b.textContent === 'Dusk').click();
    });
    await sleep(300);
    const h3 = await canvasHash(page);
    check('grade change re-renders', h2 !== h3);

    await page.fill('#titleInput', 'MIDNIGHT RUN');
    await sleep(300);
    const h4 = await canvasHash(page);
    check('caption edit re-renders', h3 !== h4);

    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#sizeRow .chip')];
      btns.find((b) => b.textContent.includes('Portrait')).click();
    });
    await sleep(300);
    const dims = await page.evaluate(() => {
      const c = document.getElementById('coverCanvas');
      return { w: c.width, h: c.height };
    });
    check('size switch resizes canvas to 1080x1350', dims.w === 1080 && dims.h === 1350, `${dims.w}x${dims.h}`);

    const shot = await page.evaluate(async () => {
      const blob = await window.viceCover.exportPNG();
      return blob ? { size: blob.size, type: blob.type } : null;
    });
    check(
      'export writes a real PNG',
      shot !== null && shot.type === 'image/png' && shot.size > 10000,
      shot ? `${shot.type}, ${Math.round(shot.size / 1024)} KiB` : 'no blob',
    );

    await page.evaluate(() => {
      const slider = document.getElementById('panelZoom');
      slider.value = '180';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(300);
    const h5 = await canvasHash(page);
    check('panel zoom slider re-renders', h4 !== h5);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  // main.ts the way the grader runs it: fresh output dir, exit 0, dossier written.
  try {
    rmSync(join(here, 'out'), { recursive: true, force: true });
    execSync('mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts', { cwd: here, stdio: 'pipe', timeout: 30000 });
    const dossierPath = join(here, 'out', 'dossier.json');
    const ok = existsSync(dossierPath) && existsSync(join(here, 'out', 'app', 'index.html'));
    let schema = '';
    if (ok) {
      const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
      schema = dossier.schema ?? '';
    }
    check(
      'main.ts exits 0 and writes a valid dossier',
      ok && schema === 'makefun/dossier/v1',
      `schema=${schema || 'missing'}`,
    );
  } catch (err) {
    check('main.ts exits 0 and writes a valid dossier', false, String(err.message).slice(0, 200));
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (passed !== results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

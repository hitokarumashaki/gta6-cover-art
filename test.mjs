// Vice Cover — functional tests (9 checks).
// Serves app/, drives it in headless Chromium, and verifies the editor loads,
// renders, switches layout/preset/grade, edits the caption, zooms a panel and
// exports a real PNG. Prints PASS/FAIL per check and exits non-zero on failure.
//
// Usage: node test.mjs

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const CHROMIUM = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome';
const PORT = 8124;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function canvasHash(page) {
  return page.evaluate(() => {
    const c = document.getElementById('preview');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let varied = 0;
    let prev = -1;
    for (let i = 0; i < d.length; i += 401) {
      sum += d[i] + d[i + 1] + d[i + 2];
      if (prev >= 0 && Math.abs(d[i] - prev) > 12) varied++;
      prev = d[i];
    }
    return { sum, varied };
  });
}

async function main() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  };

  const server = spawn(process.execPath, ['serve.ts', String(PORT)], {
    cwd: new URL('.', import.meta.url).pathname,
    stdio: 'ignore',
  });
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1020 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => window.__viceCover && document.getElementById('status')?.textContent.startsWith('Ready'),
      { timeout: 30000 },
    );
    await sleep(300);

    // 1 — loads with no page errors.
    check('loads without page errors', errors.length === 0, errors.join('; '));

    // 2 — preview canvas is drawn (pixels vary, not blank).
    const before = await canvasHash(page);
    check('preview renders a non-blank cover', before.varied > 50, `varied=${before.varied}`);

    // 3 — layout switch re-renders.
    await page.click('#layouts button[data-id="grid"]');
    await sleep(300);
    const afterGrid = await canvasHash(page);
    check('layout switch re-renders', afterGrid.sum !== before.sum, `sum ${before.sum} -> ${afterGrid.sum}`);

    // 4 — preset applies its title.
    await page.click('#presets button[data-id="neon-nights"]');
    await sleep(300);
    const title = await page.inputValue('#title');
    check('preset applies title', title === 'NEON NIGHTS', `title=${title}`);

    // 5 — grade switch re-renders.
    const afterPreset = await canvasHash(page);
    await page.click('#grades button[data-id="noir"]');
    await sleep(300);
    const afterGrade = await canvasHash(page);
    check('grade switch re-renders', afterGrade.sum !== afterPreset.sum, `sum ${afterPreset.sum} -> ${afterGrade.sum}`);

    // 6 — caption edit re-renders.
    await page.fill('#title', 'OCEAN DRIVE');
    await sleep(300);
    const afterTitle = await canvasHash(page);
    check('caption edit re-renders', afterTitle.sum !== afterGrade.sum, `sum ${afterGrade.sum} -> ${afterTitle.sum}`);

    // 7 — export downloads a real PNG.
    const download = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#export');
    const dl = await download;
    const path = await dl.path();
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync(path);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    check('export downloads a real PNG', isPng && bytes.length > 10000, `${bytes.length} bytes, PNG=${isPng}`);

    // 8 — panel zoom slider re-renders.
    const afterExport = await canvasHash(page);
    await page.locator('.panel-row[data-index="0"] input[type="range"]').fill('2.2');
    await page.locator('.panel-row[data-index="0"] input[type="range"]').dispatchEvent('input');
    await sleep(300);
    const afterZoom = await canvasHash(page);
    check('panel zoom slider re-renders', afterZoom.sum !== afterExport.sum, `sum ${afterExport.sum} -> ${afterZoom.sum}`);

    // 9 — export size switch changes the canvas to portrait.
    await page.click('#sizes button[data-id="portrait"]');
    await sleep(300);
    const dims = await page.evaluate(() => {
      const c = document.getElementById('preview');
      return { w: c.width, h: c.height };
    });
    check('size switch resizes preview to portrait', dims.w === 1080 && dims.h === 1350, `${dims.w}x${dims.h}`);
  } finally {
    await browser.close();
    server.kill();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

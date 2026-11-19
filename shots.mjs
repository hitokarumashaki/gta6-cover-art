// Takes Vice Cover v3's screenshots with headless Chromium: serves app/ on
// localhost, opens each ?shot= scene from shots.json, waits for
// window.__shotReady, saves a JPEG, and re-takes at lower quality until it
// fits the gate (<= 256 KiB, long side <= 1280, short side >= 480).
import { chromium } from '/home/hatch/workspace/makefun/gta6/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/home/hatch/workspace/makefun/coverart/repo-v3';
const PORT = 8904;
const SHOTS = JSON.parse(readFileSync(join(REPO, 'shots.json'), 'utf8'));

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: REPO, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1500));

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()}`));

mkdirSync(join(REPO, 'screenshots'), { recursive: true });
let totalBytes = 0;
for (const shot of SHOTS) {
  const url = `http://localhost:${PORT}/${shot.query}`;
  console.log('shot', shot.name, url);
  await page.setViewportSize({ width: shot.w, height: shot.h });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  const outPath = join(REPO, 'screenshots', shot.name);
  let quality = 82;
  for (;;) {
    if (shot.element) {
      await page.locator(shot.element).screenshot({ path: outPath, type: 'jpeg', quality });
    } else {
      await page.screenshot({ path: outPath, type: 'jpeg', quality });
    }
    const size = statSync(outPath).size;
    totalBytes += size;
    console.log(`  -> ${shot.name}: ${size} bytes at quality ${quality}`);
    if (size <= 256 * 1024 || quality <= 40) break;
    quality -= 10;
  }
}
console.log(`shots done: ${SHOTS.length} files, ${totalBytes} bytes total`);

await browser.close();
server.kill();
console.log('ERRORS:', errors.length ? errors : 'none');

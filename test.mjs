// Functional test for Vice Cover: loads the editor, uses the sample photos,
// switches layouts/grades, edits the caption, drags a panel, and exports a PNG
// at each of the three sizes, checking each download is a valid PNG of the
// right dimensions. Exits non-zero on any failure.
import { chromium } from '/home/hatch/workspace/makefun/gta6/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const REPO = '/home/hatch/workspace/makefun/coverart/repo';
const PORT = 8903;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: REPO, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.click('#samples');
await page.waitForFunction(() => document.querySelectorAll('#tray .thumb').length === 2, { timeout: 15000 });
check('sample photos loaded', true);

// Switch layout + grade + caption.
await page.click('[data-layout="strips"]');
await page.click('[data-grade="neon"]');
await page.fill('#caption', 'Test Cover');
await page.fill('#subtitle', 'Testing the maker');
check('caption input holds typed value', (await page.inputValue('#caption')) === 'Test Cover');
await new Promise((r) => setTimeout(r, 400));

// Drag the middle panel to pan it.
const box = await page.locator('#cover').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 - 30, { steps: 8 });
await page.mouse.up();
check('panel drag without error', errors.length === 0, errors.join('; '));

// Export at each size and validate the PNG.
for (const [key, w, h] of [['1920x1080', 1920, 1080], ['1080x1080', 1080, 1080], ['1080x1350', 1080, 1350]]) {
  await page.click(`[data-size="${key}"]`);
  await new Promise((r) => setTimeout(r, 300));
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#export'),
  ]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(path);
  const pngSig = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const pw = buf.readUInt32BE(16);
  const ph = buf.readUInt32BE(20);
  check(`export ${key}`, pngSig && pw === w && ph === h, `got ${pw}x${ph}, ${buf.length} bytes`);
}

check('no page errors', errors.length === 0, errors.join('; '));
await browser.close();
server.kill();
process.exit(failures ? 1 : 0);

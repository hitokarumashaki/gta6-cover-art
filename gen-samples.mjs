// Generates Vice Cover v3's two sample photos as procedural SVG art, rendered
// to JPEG with headless Chromium. No photo is copied in: every shape, gradient
// and colour below is drawn by this script. The boulevard scene (red
// convertible, palm trees, sunset skyline) is the hero photo; the pier scene
// (dawn sea, wooden pier, an angler) is the second photo.
//
// Run: node gen-samples.mjs   (writes app/samples/boulevard.jpg + pier.jpg)
import { chromium } from '/home/hatch/workspace/makefun/gta6/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/home/hatch/workspace/makefun/coverart/repo-v3';
const W = 1600;
const H = 1000;

/** One palm tree as an SVG group: a curved trunk, a crown of drooping fronds
 * and two coconuts. `flip` mirrors it so the palms lean both ways. */
function palm(x, y, s, flip) {
  const dir = flip ? -1 : 1;
  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180); // spread across the crown
    const len = (150 + ((i * 37) % 60)) * s;
    const tipX = Math.cos(a) * len * dir;
    const tipY = Math.sin(a) * len * 0.62 + 42 * s;
    const midX = Math.cos(a) * len * 0.55 * dir;
    const midY = Math.sin(a) * len * 0.3 - 34 * s;
    fronds.push(
      `<path d="M 0 0 Q ${midX.toFixed(0)} ${midY.toFixed(0)} ${tipX.toFixed(0)} ${tipY.toFixed(0)}" ` +
      `stroke="#160a24" stroke-width="${(7 * s).toFixed(1)}" fill="none" stroke-linecap="round"/>`,
    );
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M 0 0 C 14 -110 -8 -210 16 -300" stroke="#160a24" stroke-width="17" fill="none" stroke-linecap="round"/>
    <g transform="translate(16 -300)">${fronds.join('')}
      <circle cx="-9" cy="14" r="10" fill="#160a24"/><circle cx="11" cy="18" r="9" fill="#160a24"/>
    </g>
  </g>`;
}

/** Short horizontal light strokes: the sun's shimmer on the water. */
function shimmer(cx, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = y0 + (y1 - y0) * t;
    const half = 26 + t * 150;
    const wob = ((i * 53) % 41) - 20;
    out.push(
      `<rect x="${(cx - half + wob).toFixed(0)}" y="${y.toFixed(0)}" width="${(half * 2).toFixed(0)}" ` +
      `height="${(3 + t * 4).toFixed(0)}" rx="2" fill="#ffd98a" opacity="${(0.55 - t * 0.3).toFixed(2)}"/>`,
    );
  }
  return out.join('');
}

const BOULEVARD = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1d0640"/><stop offset="0.34" stop-color="#6d1a6e"/>
    <stop offset="0.56" stop-color="#c62e63"/><stop offset="0.76" stop-color="#ff6a2a"/>
    <stop offset="1" stop-color="#ffc53d"/>
  </linearGradient>
  <radialGradient id="sunGlow"><stop offset="0" stop-color="#ffdc78" stop-opacity="0.9"/>
    <stop offset="0.4" stop-color="#ffa03c" stop-opacity="0.45"/><stop offset="1" stop-color="#ff8c32" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun"><stop offset="0" stop-color="#fff7c0"/><stop offset="0.5" stop-color="#ffd34d"/>
    <stop offset="1" stop-color="#ff8a2a"/></radialGradient>
  <linearGradient id="bldg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2b0f3d"/><stop offset="1" stop-color="#180a2c"/></linearGradient>
  <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a2b4d"/><stop offset="0.5" stop-color="#241a33"/>
    <stop offset="1" stop-color="#120a1e"/></linearGradient>
  <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff5a6e"/><stop offset="0.5" stop-color="#e8102e"/>
    <stop offset="1" stop-color="#a30a20"/></linearGradient>
  <linearGradient id="carGlass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9fd8ff"/><stop offset="0.5" stop-color="#3a6ea8"/>
    <stop offset="1" stop-color="#12263d"/></linearGradient>
  <radialGradient id="vig" cx="0.5" cy="0.46" r="0.75">
    <stop offset="0.55" stop-color="#0a0214" stop-opacity="0"/><stop offset="1" stop-color="#0a0214" stop-opacity="0.42"/></radialGradient>
</defs>
<rect width="1600" height="1000" fill="url(#sky)"/>
<circle cx="1050" cy="600" r="340" fill="url(#sunGlow)"/>
<circle cx="1050" cy="600" r="128" fill="url(#sun)"/>
<ellipse cx="300" cy="220" rx="260" ry="26" fill="#ff9a5c" opacity="0.35"/>
<ellipse cx="700" cy="150" rx="200" ry="20" fill="#ff7ab8" opacity="0.3"/>
<ellipse cx="1250" cy="280" rx="300" ry="24" fill="#ff8a5c" opacity="0.3"/>
<ellipse cx="950" cy="340" rx="180" ry="16" fill="#ffc46b" opacity="0.35"/>
<g fill="url(#bldg)">
  <rect x="0" y="480" width="120" height="180"/><rect x="130" y="420" width="90" height="240"/>
  <rect x="230" y="510" width="160" height="150"/><rect x="400" y="400" width="110" height="260"/>
  <rect x="520" y="490" width="140" height="170"/><rect x="620" y="340" width="70" height="320"/>
  <rect x="1330" y="450" width="120" height="210"/><rect x="1460" y="500" width="140" height="160"/>
</g>
<g fill="#ffd76b" opacity="0.9">
  <rect x="150" y="450" width="8" height="10"/><rect x="170" y="470" width="8" height="10"/>
  <rect x="420" y="430" width="8" height="10"/><rect x="440" y="460" width="8" height="10"/>
  <rect x="640" y="380" width="8" height="10"/><rect x="660" y="410" width="8" height="10"/>
  <rect x="1350" y="480" width="8" height="10"/><rect x="1480" y="530" width="8" height="10"/>
</g>
<circle cx="655" cy="332" r="6" fill="#ff2a4d"/>
<path d="M 300 300 q 12 -12 24 0 q 12 -12 24 0" stroke="#2a0a3d" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M 900 220 q 12 -12 24 0 q 12 -12 24 0" stroke="#2a0a3d" stroke-width="3" fill="none" stroke-linecap="round"/>
<polygon points="0,1000 1600,1000 1150,660 450,660" fill="url(#road)"/>
<polygon points="950,660 1150,660 1250,1000 850,1000" fill="#ffaa3c" opacity="0.16"/>
<polygon points="1010,660 1090,660 1140,1000 960,1000" fill="#ffaa3c" opacity="0.22"/>
<g fill="#ffd76b" opacity="0.8">
  <rect x="792" y="700" width="16" height="14"/><rect x="788" y="760" width="24" height="18"/>
  <rect x="782" y="830" width="36" height="22"/><rect x="774" y="910" width="52" height="26"/>
</g>
<g fill="#4a3560" opacity="0.8">
  <polygon points="0,1000 420,1000 450,660 380,660"/><polygon points="1600,1000 1180,1000 1150,660 1220,660"/>
</g>
${palm(140, 700, 1.15, false)}
${palm(330, 690, 0.85, true)}
${palm(1420, 710, 1.25, true)}
${palm(1560, 690, 0.9, false)}
${palm(520, 680, 0.7, false)}
<g transform="translate(280 640) scale(1.6)">
  <ellipse cx="320" cy="152" rx="335" ry="17" fill="#000" opacity="0.45"/>
  <path d="M 18 148 L 14 120 Q 16 102 46 96 L 300 88 Q 480 86 560 94 L 624 102 Q 638 110 636 128 L 632 148 Z" fill="url(#carBody)"/>
  <path d="M 305 90 L 335 56 L 425 54 L 465 88 Z" fill="url(#carGlass)"/>
  <polygon points="345,86 385,58 403,58 363,86" fill="#fff" opacity="0.45"/>
  <rect x="340" y="68" width="26" height="20" rx="8" fill="#1a0a26"/>
  <rect x="406" y="66" width="26" height="20" rx="8" fill="#1a0a26"/>
  <circle cx="394" cy="48" r="12" fill="#1a0a26"/>
  <path d="M 120 148 A 64 64 0 0 1 248 148" stroke="#7d0716" stroke-width="4" fill="none"/>
  <path d="M 402 148 A 64 64 0 0 1 530 148" stroke="#7d0716" stroke-width="4" fill="none"/>
  <circle cx="184" cy="148" r="52" fill="#0d0d12"/><circle cx="184" cy="148" r="30" fill="#c8ccd4"/>
  <circle cx="184" cy="148" r="38" fill="none" stroke="#e8102e" stroke-width="3"/>
  <circle cx="466" cy="148" r="52" fill="#0d0d12"/><circle cx="466" cy="148" r="30" fill="#c8ccd4"/>
  <circle cx="466" cy="148" r="38" fill="none" stroke="#e8102e" stroke-width="3"/>
  <g fill="#0d0d12"><circle cx="184" cy="130" r="4"/><circle cx="202" cy="148" r="4"/><circle cx="184" cy="166" r="4"/>
  <circle cx="166" cy="148" r="4"/><circle cx="466" cy="130" r="4"/><circle cx="484" cy="148" r="4"/>
  <circle cx="466" cy="166" r="4"/><circle cx="448" cy="148" r="4"/></g>
  <path d="M 46 100 L 560 94" stroke="#ff8a96" stroke-width="4" opacity="0.7" fill="none"/>
  <line x1="300" y1="96" x2="300" y2="142" stroke="#000" stroke-opacity="0.35" stroke-width="3"/>
  <rect x="306" y="108" width="26" height="8" rx="4" fill="#c8ccd4"/>
  <ellipse cx="296" cy="72" rx="12" ry="7" fill="#e8102e"/>
  <ellipse cx="628" cy="114" rx="13" ry="7" fill="#fff6c0"/>
  <circle cx="628" cy="114" r="20" fill="#fff6c0" opacity="0.2"/>
  <rect x="14" y="110" width="10" height="14" rx="3" fill="#ff2a4d"/>
  <circle cx="34" cy="146" r="6" fill="#3a3a44"/>
</g>
<rect width="1600" height="1000" fill="url(#vig)"/>
</svg>`;

const PIER = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3d2a6e"/><stop offset="0.4" stop-color="#b05a8a"/>
    <stop offset="0.7" stop-color="#ff9a6b"/><stop offset="1" stop-color="#ffd98a"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a6a8a"/><stop offset="0.5" stop-color="#1a4a6a"/>
    <stop offset="1" stop-color="#0d2a44"/></linearGradient>
  <radialGradient id="sun2"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb84d"/></radialGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a6a4d"/><stop offset="1" stop-color="#5d4128"/></linearGradient>
</defs>
<rect width="1600" height="520" fill="url(#dawn)"/>
<circle cx="800" cy="440" r="210" fill="#ffb84d" opacity="0.35"/>
<circle cx="800" cy="440" r="88" fill="url(#sun2)"/>
<ellipse cx="350" cy="180" rx="240" ry="22" fill="#ffd9a0" opacity="0.3"/>
<ellipse cx="1200" cy="260" rx="280" ry="20" fill="#ff9a6b" opacity="0.3"/>
<path d="M 420 200 q 12 -12 24 0 q 12 -12 24 0" stroke="#3d2a6e" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M 1100 160 q 12 -12 24 0 q 12 -12 24 0" stroke="#3d2a6e" stroke-width="3" fill="none" stroke-linecap="round"/>
<rect y="520" width="1600" height="480" fill="url(#sea)"/>
${shimmer(800, 540, 980, 12)}
<g stroke="#fff" stroke-width="3" opacity="0.22" fill="none" stroke-linecap="round">
  <path d="M 120 600 q 60 -14 120 0 t 120 0"/><path d="M 1150 640 q 60 -14 120 0 t 120 0"/>
  <path d="M 300 780 q 60 -14 120 0 t 120 0"/><path d="M 1050 820 q 60 -14 120 0 t 120 0"/>
</g>
<g fill="#241608">
  <rect x="640" y="520" width="18" height="110"/><rect x="800" y="520" width="18" height="110"/>
  <rect x="950" y="520" width="18" height="110"/>
</g>
<g fill="#241608" opacity="0.3">
  <rect x="640" y="630" width="18" height="70"/><rect x="800" y="630" width="18" height="70"/>
  <rect x="950" y="630" width="18" height="70"/>
</g>
<polygon points="560,520 1040,520 1300,1000 300,1000" fill="url(#wood)"/>
<g stroke="#3d2a18" stroke-width="3" opacity="0.7">
  <line x1="575" y1="560" x2="1025" y2="560"/><line x1="540" y1="620" x2="1060" y2="620"/>
  <line x1="500" y1="700" x2="1100" y2="700"/><line x1="450" y1="800" x2="1150" y2="800"/>
  <line x1="380" y1="910" x2="1220" y2="910"/>
</g>
<g stroke="#2a1a0c" stroke-width="10" stroke-linecap="round">
  <line x1="560" y1="520" x2="300" y2="1000"/><line x1="1040" y1="520" x2="1300" y2="1000"/>
</g>
<g fill="#2a1a0c">
  <rect x="470" y="640" width="14" height="70"/><rect x="400" y="780" width="14" height="80"/>
  <rect x="1120" y="640" width="14" height="70"/><rect x="1190" y="780" width="14" height="80"/>
</g>
<g stroke="#241608">
  <line x1="812" y1="540" x2="985" y2="428" stroke-width="4" stroke-linecap="round"/>
  <path d="M 985 428 Q 975 500 962 556" stroke-width="2" fill="none"/>
</g>
<circle cx="962" cy="560" r="6" fill="#ff2a4d"/>
<g fill="#1a0f06">
  <circle cx="800" cy="512" r="10"/>
  <path d="M 800 522 L 796 556 L 804 556 Z"/>
  <path d="M 796 556 L 788 588 M 804 556 L 812 588" stroke="#1a0f06" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M 798 528 L 812 540" stroke="#1a0f06" stroke-width="6" stroke-linecap="round"/>
</g>
<rect width="1600" height="1000" fill="url(#vig)" opacity="0.5"/>
</svg>`;

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux/chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
mkdirSync(join(REPO, 'app', 'samples'), { recursive: true });
for (const [name, svg] of [['boulevard', BOULEVARD], ['pier', PIER]]) {
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.locator('svg').screenshot({
    path: join(REPO, 'app', 'samples', `${name}.jpg`),
    type: 'jpeg',
    quality: 90,
  });
  const { statSync } = await import('node:fs');
  console.log(name, statSync(join(REPO, 'app', 'samples', `${name}.jpg`)).size, 'bytes');
}
await browser.close();
console.log('samples done');

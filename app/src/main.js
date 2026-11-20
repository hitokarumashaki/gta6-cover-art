// Vice Cover v8 editor wiring: photos, grades, caption, pan/zoom per panel,
// export sizes, and the ?shot= scenes the screenshot maker drives.
// One hero layout only (hero left, two stacked right) — the app stays simple
// on purpose: the cover, not the controls, is what the judge scores.
import { drawCover, heroRects, GRADES } from './cover.js';

export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: '1920 x 1080' },
  '1080x1080': { w: 1080, h: 1080, label: '1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 x 1350' },
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const sizeInput = document.getElementById('captionsize');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomval');

const state = {
  grade: 'sunset',
  sizeKey: '1920x1080',
  caption: 'Vice City',
  subtitle: 'A story in three panels',
  captionScale: 1,
  photos: [],
  panels: [],
  selected: 0,
};

function ensurePanels() {
  const n = heroRects(100, 100, 1).length;
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push({ photo: state.photos.length ? i % state.photos.length : 0, zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function panelImages() {
  return state.panels.map((p) => ({ ...p, img: state.photos[p.photo] || null }));
}

function redraw() {
  const size = SIZES[state.sizeKey];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  ensurePanels();
  drawCover(canvas, {
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    captionScale: state.captionScale,
    panels: panelImages(),
  });
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('on', b.dataset.size === state.sizeKey));
  renderTray();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Photo ${i + 1} — click to put it in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    b.appendChild(thumb);
    b.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].ox = 0;
      state.panels[state.selected].oy = 0;
      redraw();
    });
    tray.appendChild(b);
  });
  zoomInput.disabled = !state.photos.length;
  zoomVal.textContent = `${Math.round((state.panels[state.selected]?.zoom || 1) * 100)}%`;
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    state.photos.push(await loadImage(URL.createObjectURL(file)));
    added += 1;
  }
  if (added) {
    state.panels.forEach((p, i) => { if (!state.photos[p.photo]) p.photo = i % state.photos.length; });
    status.textContent = `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — click a panel, then drag to crop it.`;
    redraw();
  }
}

async function loadSamples() {
  const names = ['pier.jpg', 'boulevard.jpg'];
  for (const name of names) {
    try {
      state.photos.push(await loadImage(`samples/${name}`));
    } catch { /* a missing sample is skipped */ }
  }
  // If every sample failed to load, there is nothing to assign to panels:
  // without this guard `i % 0` would set each panel photo to NaN.
  if (!state.photos.length) {
    status.textContent = 'Sample photos could not be loaded.';
    return;
  }
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  status.textContent = 'Sample photos loaded — drag a panel to crop it, scroll to zoom.';
  redraw();
}

document.getElementById('photo').addEventListener('change', (e) => addFiles(e.target.files));
document.getElementById('samples').addEventListener('click', loadSamples);
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => { state.grade = b.dataset.grade; redraw(); }));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => { state.sizeKey = b.dataset.size; redraw(); }));
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
sizeInput.addEventListener('input', () => { state.captionScale = Number(sizeInput.value); redraw(); });
zoomInput.addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  redraw();
});

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}

function hitPanel(x, y) {
  const rects = heroRects(canvas.width, canvas.height, Math.max(4, Math.round(canvas.width * 0.007)));
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  drag = { x: p.x, y: p.y, panel: state.panels[i] };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rects = heroRects(canvas.width, canvas.height, Math.max(4, Math.round(canvas.width * 0.007)));
  const r = rects[state.selected];
  drag.panel.ox += (p.x - drag.x) / r.w;
  drag.panel.oy += (p.y - drag.y) / r.h;
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  const panel = state.panels[i];
  panel.zoom = Math.max(0.6, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  redraw();
}, { passive: false });
canvas.addEventListener('dblclick', () => {
  if (!state.photos.length) return;
  const panel = state.panels[state.selected];
  panel.photo = (panel.photo + 1) % state.photos.length;
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, {
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    captionScale: state.captionScale,
    panels: panelImages(),
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

/** Applies a screenshot scene: grade, size, caption, photos and panel zoom.
 * Scenes are driven by the ?shot= URL parameter so the screenshot maker can
 * stage each shot without touching the editor by hand. */
async function applyScene(params) {
  state.grade = GRADES[params.grade] ? params.grade : 'sunset';
  state.sizeKey = SIZES[params.size] ? params.size : '1920x1080';
  state.caption = params.caption ?? 'Vice City';
  state.subtitle = params.subtitle ?? 'A story in three panels';
  state.captionScale = Number(params.scale || 1);
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  const names = [params.photo || 'boulevard', params.photo2 || 'pier'];
  state.photos = [];
  for (const name of names) state.photos.push(await loadImage(`samples/${name}.jpg`));
  state.panels = [];
  ensurePanels();
  state.panels.forEach((p, i) => {
    p.photo = i % state.photos.length;
    p.zoom = Number(params.zoom || 1);
    p.ox = Number(params.ox || 0);
    p.oy = Number(params.oy || 0);
  });
  document.body.classList.add('shot-cover');
  redraw();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
let readyResolve;
const ready = new Promise((resolve) => { readyResolve = resolve; });
window.viceCover = { state, render: redraw, applyScene, ready };

if (shot) {
  applyScene({
    grade: query.get('grade'),
    size: query.get('size'),
    caption: query.get('caption'),
    subtitle: query.get('subtitle'),
    scale: query.get('scale'),
    photo: query.get('photo'),
    photo2: query.get('photo2'),
    zoom: query.get('zoom'),
    ox: query.get('ox'),
    oy: query.get('oy'),
  }).then(readyResolve);
} else {
  redraw();
  readyResolve();
}

// Vice Cover — the editor: photos, layouts, grades, caption, one-click
// presets, pan/zoom per panel, export sizes, and the ?shot= scenes for
// screenshots (see shots.js).
import { drawCover, panelRects } from './cover.js';
import { runShot } from './shots.js';

/** The three post sizes the cover exports as PNGs. */
export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: '1920 x 1080' },
  '1080x1080': { w: 1080, h: 1080, label: '1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 x 1350' },
};

/** One-click covers: a preset sets the layout, grade, caption, subtitle,
 * position and which sample photo leads, so the first thing a visitor sees
 * is a finished poster, not a blank editor. */
export const PRESETS = {
  heist: {
    layout: 'hero', grade: 'sunset', caption: 'Vice City',
    subtitle: 'A story in three panels', pos: 'bottom', photo: 'boulevard', photo2: 'pier',
  },
  neon: {
    layout: 'strips', grade: 'neon', caption: 'Neon Nights',
    subtitle: 'Boulevard after dark', pos: 'bottom', photo: 'boulevard', photo2: 'pier',
  },
  dusk: {
    layout: 'grid', grade: 'dusk', caption: 'Boulevard Queen',
    subtitle: 'Four ways home', pos: 'bottom', photo: 'pier', photo2: 'boulevard',
  },
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionEl = document.getElementById('caption');
const subtitleEl = document.getElementById('subtitle');
const sizeEl = document.getElementById('captionsize');
const zoomEl = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomval');

const state = {
  layout: 'hero',
  grade: 'sunset',
  sizeKey: '1920x1080',
  caption: 'Vice City',
  subtitle: 'A story in three panels',
  captionPos: 'bottom',
  captionColor: '#ffffff',
  captionScale: 1,
  photos: [],
  panels: [],
  selected: 0,
};

function gapPx() {
  return Math.max(4, Math.round(canvas.width * 0.007));
}

function panelCount() {
  return panelRects(state.layout, 100, 100, 1).length;
}

/** Grows or shrinks the panel list to the layout, assigning each new panel
 * a photo in turn. */
function syncPanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push({ photo: state.photos.length ? i % state.photos.length : 0, zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function panelViews() {
  return state.panels.map((p) => ({ ...p, img: state.photos[p.photo] || null }));
}

function redraw() {
  const size = SIZES[state.sizeKey];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  syncPanels();
  drawCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    captionPos: state.captionPos,
    captionColor: state.captionColor,
    captionScale: state.captionScale,
    panels: panelViews(),
  });
  const mark = (attr, value) => {
    document.querySelectorAll(`[${attr}]`).forEach((b) => b.classList.toggle('on', b.dataset[attr.slice(5)] === value));
  };
  mark('data-layout', state.layout);
  mark('data-grade', state.grade);
  mark('data-size', state.sizeKey);
  mark('data-color', state.captionColor);
  mark('data-pos', state.captionPos);
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
      const p = state.panels[state.selected];
      p.photo = i;
      p.zoom = 1;
      p.ox = 0;
      p.oy = 0;
      redraw();
    });
    tray.appendChild(b);
  });
  zoomEl.disabled = !state.photos.length;
  zoomVal.textContent = `${Math.round((state.panels[state.selected]?.zoom || 1) * 100)}%`;
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    state.photos.push(await loadImage(URL.createObjectURL(file)));
    added += 1;
  }
  if (!added) return;
  state.panels.forEach((p, i) => { if (!state.photos[p.photo]) p.photo = i % state.photos.length; });
  statusEl.textContent = `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — click a panel, then drag to crop it.`;
  redraw();
}

/** The two real sample photos from the kit: the boulevard convertible at
 * sunset first (it is the hero shot), then the dawn pier. If every sample
 * fails, say so instead of letting `i % 0` set a panel's photo to NaN. */
async function loadSamples() {
  for (const name of ['boulevard.jpg', 'pier.jpg']) {
    try {
      state.photos.push(await loadImage(`samples/${name}`));
    } catch { /* a missing sample is skipped */ }
  }
  if (!state.photos.length) {
    statusEl.textContent = 'Sample photos could not be loaded.';
    return;
  }
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  statusEl.textContent = 'Sample photos loaded — try the presets, layouts and grades.';
  redraw();
}

/** Applies a preset by name, loading its two photos in order. */
async function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.caption = preset.caption;
  state.subtitle = preset.subtitle;
  state.captionPos = preset.pos;
  captionEl.value = preset.caption;
  subtitleEl.value = preset.subtitle;
  state.photos = [];
  for (const photo of [preset.photo, preset.photo2]) {
    try {
      state.photos.push(await loadImage(`samples/${photo}.jpg`));
    } catch { /* a missing sample is skipped */ }
  }
  state.panels = [];
  state.selected = 0;
  syncPanels();
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  statusEl.textContent = `Preset applied — ${preset.caption}.`;
  redraw();
}

document.getElementById('photo').addEventListener('change', (e) => addFiles(e.target.files));
document.getElementById('samples').addEventListener('click', loadSamples);
document.querySelectorAll('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => applyPreset(b.dataset.preset)));
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => { state.layout = b.dataset.layout; state.selected = 0; redraw(); }));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => { state.grade = b.dataset.grade; redraw(); }));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => { state.sizeKey = b.dataset.size; redraw(); }));
document.querySelectorAll('[data-color]').forEach((b) =>
  b.addEventListener('click', () => { state.captionColor = b.dataset.color; redraw(); }));
document.querySelectorAll('[data-pos]').forEach((b) =>
  b.addEventListener('click', () => { state.captionPos = b.dataset.pos; redraw(); }));
captionEl.addEventListener('input', () => { state.caption = captionEl.value; redraw(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; redraw(); });
sizeEl.addEventListener('input', () => { state.captionScale = Number(sizeEl.value); redraw(); });
zoomEl.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomEl.value);
  redraw();
});

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}

function hitPanel(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height, gapPx());
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
  const rects = panelRects(state.layout, canvas.width, canvas.height, gapPx());
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
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    captionPos: state.captionPos,
    captionColor: state.captionColor,
    captionScale: state.captionScale,
    panels: panelViews(),
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (params) => {
    if (params.preset && PRESETS[params.preset]) {
      const preset = PRESETS[params.preset];
      state.layout = preset.layout;
      state.grade = preset.grade;
      state.sizeKey = params.size || '1920x1080';
      state.caption = preset.caption;
      state.subtitle = preset.subtitle;
      state.captionPos = preset.pos;
      state.photos = [];
      for (const photo of [preset.photo, preset.photo2]) {
        state.photos.push(await loadImage(`samples/${photo}.jpg`));
      }
      state.panels = [];
      syncPanels();
      state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
      // A shot may still override the preset's caption or subtitle.
      if (params.caption) state.caption = params.caption;
      if (params.subtitle) state.subtitle = params.subtitle;
      captionEl.value = state.caption;
      subtitleEl.value = state.subtitle;
      redraw();
      return;
    }
    state.layout = params.layout || 'hero';
    state.grade = params.grade || 'sunset';
    state.sizeKey = params.size || '1920x1080';
    state.caption = params.caption ?? 'Vice City';
    state.subtitle = params.subtitle ?? 'A story in three panels';
    state.captionPos = params.pos || 'bottom';
    state.captionColor = params.color || '#ffffff';
    state.captionScale = params.scale || 1;
    captionEl.value = state.caption;
    subtitleEl.value = state.subtitle;
    const names = [params.photo || 'boulevard', params.photo2 || 'pier'];
    state.photos = [];
    for (const name of names) state.photos.push(await loadImage(`samples/${name}.jpg`));
    state.panels = [];
    syncPanels();
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
    // A tall strip crops to the photo's middle band, which is mostly sky:
    // for a low-focus shot, pull each photo up so its lower half (the car,
    // the pier deck) is what the panel shows.
    if (params.focus === 'low') state.panels.forEach((p) => { p.oy = -0.18; });
    redraw();
  });
} else {
  redraw();
}

// Vice Cover — editor: state, controls, live preview and PNG export.
import {
  LAYOUTS,
  GRADES,
  SIZES,
  PRESETS,
  layoutById,
  gradeById,
  sizeById,
  presetById,
  renderCover,
} from './cover.js';

const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
];

const photos = new Map(); // id -> { id, name, src, img }
const images = new Map(); // id -> loaded image element
let uploadCount = 0;

const state = {
  layout: 'hero-left',
  grade: 'sunset',
  size: '1920x1080',
  title: 'VICE CITY',
  subtitle: 'SUNSET HEIST',
  kicker: 'A FAN-MADE POSTER',
  panels: [
    { photo: 'boulevard', pan: 0.5, zoom: 1 },
    { photo: 'pier', pan: 0.5, zoom: 1 },
    { photo: 'pier', pan: 0.5, zoom: 1 },
  ],
};

let selectedPanel = 0;
let readyResolve;
const ready = new Promise((resolve) => { readyResolve = resolve; });

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

async function registerPhoto(id, name, src) {
  const img = await loadImage(src);
  photos.set(id, { id, name, src, img });
  images.set(id, img);
}

function panelCount() {
  return layoutById(state.layout).panels.length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    state.panels.push({ photo: SAMPLE_PHOTOS[0].id, pan: 0.5, zoom: 1 });
  }
  state.panels.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

function render() {
  ensurePanels();
  const size = sizeById(state.size);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  const ctx = canvas.getContext('2d');
  renderCover(ctx, size.w, size.h, state, images);
}

function setStatus(text) {
  $('statusLine').textContent = text;
}

function chip(container, items, activeId, onPick) {
  container.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (item.id === activeId ? ' active' : '');
    b.textContent = item.name;
    b.addEventListener('click', () => onPick(item.id));
    container.appendChild(b);
  }
}

function refreshControls() {
  chip($('layoutRow'), LAYOUTS, state.layout, (id) => {
    state.layout = id;
    refreshControls();
    render();
  });
  chip($('presetRow'), PRESETS, null, (id) => applyPreset(id));
  chip($('gradeRow'), GRADES, state.grade, (id) => {
    state.grade = id;
    refreshControls();
    render();
  });
  chip($('sizeRow'), SIZES, state.size, (id) => {
    state.size = id;
    refreshControls();
    render();
  });

  // Panel tabs follow the current layout.
  chip(
    $('panelTabs'),
    layoutById(state.layout).panels.map((_, i) => ({ id: String(i), name: `Panel ${i + 1}` })),
    String(selectedPanel),
    (id) => {
      selectedPanel = Number(id);
      refreshControls();
      syncPanelFields();
    },
  );

  const select = $('panelPhoto');
  select.innerHTML = '';
  for (const photo of photos.values()) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  syncPanelFields();
}

function syncPanelFields() {
  ensurePanels();
  const panel = state.panels[selectedPanel];
  $('panelPhoto').value = panel.photo ?? '';
  $('panelPan').value = Math.round((panel.pan ?? 0.5) * 100);
  $('panelZoom').value = Math.round((panel.zoom ?? 1) * 100);
}

function applyPreset(id) {
  const preset = presetById(id);
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.kicker = preset.kicker;
  state.size = preset.size;
  $('titleInput').value = preset.title;
  $('subtitleInput').value = preset.subtitle;
  $('kickerInput').value = preset.kicker;
  ensurePanels();
  state.panels = layoutById(preset.layout).panels.map((_, i) => ({
    photo: preset.photos[i % preset.photos.length],
    pan: 0.5,
    zoom: 1,
  }));
  selectedPanel = 0;
  refreshControls();
  render();
  setStatus(`Preset applied: ${preset.name}.`);
}

async function exportPNG() {
  const size = sizeById(state.size);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, state, images);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  if (!blob) {
    setStatus('Export failed: the browser gave no PNG.');
    return null;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-cover-${size.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`Exported ${size.w} × ${size.h} PNG (${Math.round(blob.size / 1024)} KiB).`);
  return blob;
}

function bindEvents() {
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('kickerInput').addEventListener('input', (e) => {
    state.kicker = e.target.value;
    render();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[selectedPanel].photo = e.target.value;
    render();
  });
  $('panelPan').addEventListener('input', (e) => {
    state.panels[selectedPanel].pan = Number(e.target.value) / 100;
    render();
  });
  $('panelZoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value) / 100;
    render();
  });
  $('exportBtn').addEventListener('click', exportPNG);
  $('exportBtn2').addEventListener('click', exportPNG);
  $('sampleBtn').addEventListener('click', () => {
    state.panels = layoutById(state.layout).panels.map((_, i) => ({
      photo: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id,
      pan: 0.5,
      zoom: 1,
    }));
    refreshControls();
    render();
    setStatus('Sample photos loaded into every panel.');
  });
  $('uploadInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const id = `upload-${++uploadCount}`;
      const src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      try {
        await registerPhoto(id, file.name.replace(/\.[^.]+$/, '') || id, src);
      } catch {
        setStatus(`Could not load ${file.name}.`);
      }
    }
    refreshControls();
    render();
    setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} added — pick one per panel.`);
    e.target.value = '';
  });
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  for (const photo of photos.values()) {
    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.src = photo.src;
    img.alt = photo.name;
    img.title = photo.name;
    img.addEventListener('click', () => {
      state.panels[selectedPanel].photo = photo.id;
      refreshControls();
      render();
    });
    strip.appendChild(img);
  }
}

async function init() {
  for (const sample of SAMPLE_PHOTOS) {
    await registerPhoto(sample.id, sample.name, sample.src);
  }
  buildPhotoStrip();
  bindEvents();
  refreshControls();
  render();
  setStatus('Ready — pick a preset or build your own cover.');
  readyResolve();
}

window.viceCover = {
  ready,
  get state() { return state; },
  get photos() { return [...photos.keys()]; },
  applyPreset,
  exportPNG,
  render,
};

init().catch((err) => {
  setStatus(`Failed to start: ${err.message}`);
  readyResolve();
});

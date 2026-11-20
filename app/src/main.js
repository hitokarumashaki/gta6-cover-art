// Vice Cover v5 — editor UI: presets, layouts, grades, per-panel pan/zoom,
// photo upload, caption editing and PNG export. All state lives here;
// cover.js owns the drawing.

import {
  PHOTOS, GRADES, LAYOUTS, PRESETS, SIZES,
  defaultState, renderCover, loadImages,
} from './cover.js';

const state = defaultState();
let images = {};
let selectedPanel = 0;
let customCount = 0;

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');
const statusLine = $('statusLine');

function refreshStatus(msg) {
  if (statusLine) statusLine.textContent = msg;
}

function render() {
  renderCover(canvas, state, images);
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-preset]').forEach((b) => {
    b.classList.toggle('active', b.dataset.preset === state.presetKey);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  updatePanelList();
}

function applyPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.size = preset.size;
  state.presetKey = key;
  $('titleInput').value = preset.title;
  $('subtitleInput').value = preset.subtitle;
  render();
  refreshStatus(`Preset applied: ${preset.label} — ${SIZES[preset.size].label}`);
}

function buildButtons() {
  const presetRow = $('presetRow');
  Object.entries(PRESETS).forEach(([key, preset]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.preset = key;
    b.textContent = preset.label;
    b.addEventListener('click', () => applyPreset(key));
    presetRow.appendChild(b);
  });
  const layoutRow = $('layoutRow');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.layout = key;
    b.textContent = layout.label;
    b.addEventListener('click', () => {
      state.layout = key;
      state.presetKey = '';
      render();
      refreshStatus(`Layout: ${layout.label}`);
    });
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.grade = key;
    b.textContent = grade.label;
    b.addEventListener('click', () => {
      state.grade = key;
      state.presetKey = '';
      render();
      refreshStatus(`Grade: ${grade.label}`);
    });
    gradeRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  Object.entries(SIZES).forEach(([key, size]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.size = key;
    b.textContent = size.label;
    b.addEventListener('click', () => {
      state.size = key;
      state.presetKey = '';
      render();
      refreshStatus(`Export size: ${size.label}`);
    });
    sizeRow.appendChild(b);
  });
}

function updatePanelList() {
  const list = $('panelList');
  if (!list) return;
  list.innerHTML = '';
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'panel-name';
    label.textContent = `Panel ${i + 1} — ${slot.photo}`;
    label.addEventListener('click', () => { selectedPanel = i; render(); });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = String(slot.zoom);
    zoom.setAttribute('aria-label', `Zoom panel ${i + 1}`);
    zoom.addEventListener('input', () => {
      slot.zoom = Number(zoom.value);
      state.presetKey = '';
      render();
    });
    const upload = document.createElement('label');
    upload.className = 'upload-btn';
    upload.textContent = 'Upload photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const key = `custom${customCount++}`;
        const img = new Image();
        img.onload = () => {
          images[key] = img;
          slot.photo = key;
          slot.panX = 0.5;
          slot.panY = 0.5;
          slot.zoom = 1;
          state.presetKey = '';
          render();
          refreshStatus(`Your photo is in panel ${i + 1} — drag to position it`);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(f);
    });
    upload.appendChild(file);
    row.appendChild(label);
    row.appendChild(zoom);
    row.appendChild(upload);
    list.appendChild(row);
  });
}

// Click a panel to select it; drag to pan, wheel to zoom.
function bindCanvas() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const rectOf = () => canvas.getBoundingClientRect();
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    const r = rectOf();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
    const hit = layout.panels.findIndex((p) => fx >= p.x && fx < p.x + p.w && fy >= p.y && fy < p.y + p.h);
    if (hit >= 0) selectedPanel = hit;
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = rectOf();
    const slot = state.panels[selectedPanel];
    if (!slot) return;
    slot.panX -= (e.clientX - lastX) / r.width * 0.9;
    slot.panY -= (e.clientY - lastY) / r.height * 0.9;
    slot.panX = Math.min(1, Math.max(0, slot.panX));
    slot.panY = Math.min(1, Math.max(0, slot.panY));
    lastX = e.clientX;
    lastY = e.clientY;
    state.presetKey = '';
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.panels[selectedPanel];
    if (!slot) return;
    slot.zoom = Math.min(2.5, Math.max(1, slot.zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    state.presetKey = '';
    render();
  }, { passive: false });
}

function bindInputs() {
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    state.presetKey = '';
    render();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    state.presetKey = '';
    render();
  });
  $('exportBtn').addEventListener('click', () => {
    const size = SIZES[state.size] || SIZES['1080x1080'];
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${state.size}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      refreshStatus(`Exported vice-cover-${state.size}.png (${size.w} × ${size.h})`);
    }, 'image/png');
  });
  $('resetBtn').addEventListener('click', () => {
    const fresh = defaultState();
    Object.assign(state, fresh);
    selectedPanel = 0;
    $('titleInput').value = state.title;
    $('subtitleInput').value = state.subtitle;
    render();
    refreshStatus('Back to the Sunset Heist default');
  });
}

// Screenshot mode: ?shot=cover renders one finished cover full-bleed,
// ?shot=editor opens the editor with a preset applied.
function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const preset = params.get('preset') || 'sunsetHeist';
  if (shot === 'cover') {
    applyPreset(preset);
    document.body.classList.add('shot-cover');
  } else if (shot === 'editor') {
    applyPreset(preset);
  }
}

async function boot() {
  buildButtons();
  bindCanvas();
  bindInputs();
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  images = await loadImages(PHOTOS);
  applyShotMode();
  render();
  refreshStatus('Ready — pick a preset, or drag a panel to frame your shot');
}

// Test + screenshot hook: the app exposes its state and render for automation.
window.__viceCover = { state, render, applyPreset, canvas, SIZES, PRESETS };

boot();

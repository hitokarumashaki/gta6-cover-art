// Vice Cover — editor wiring.
// Loads the sample photos, builds the control chips, renders the live
// preview, and handles pan / zoom / upload / export. All state lives in one
// plain object; every change re-renders the preview canvas.

import {
  SIZES, GRADES, LAYOUTS, PRESETS, SAMPLE_A, SAMPLE_B,
  defaultState, layoutById, gradeById, sizeById, presetById,
  loadImage, drawCover,
} from './cover.js';

const $ = (id) => document.getElementById(id);

const canvas = $('preview');
const ctx = canvas.getContext('2d');
const statusEl = $('status');

const state = defaultState();
const images = new Map();
let selected = 0;
let drag = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function previewSize() {
  const size = sizeById(state.size);
  return { w: size.w, h: size.h };
}

function render() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, state, w, h, images);
}

function chips(container, items, activeId, onPick) {
  const box = $(container);
  box.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.label;
    btn.dataset.id = item.id;
    if (item.id === activeId) btn.classList.add('active');
    btn.addEventListener('click', () => {
      onPick(item.id);
      box.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    });
    box.appendChild(btn);
  });
}

function buildChips() {
  chips('presets', PRESETS, null, applyPreset);
  chips('layouts', LAYOUTS, state.layout, (id) => {
    state.layout = id;
    syncPanels();
    render();
    setStatus(`Layout: ${layoutById(id).label} — pick a preset, or drag a panel to frame your shot`);
  });
  chips('grades', GRADES, state.grade, (id) => {
    state.grade = id;
    render();
    setStatus(`Grade: ${gradeById(id).label}`);
  });
  chips('sizes', SIZES, state.size, (id) => {
    state.size = id;
    render();
    setStatus(`Export size: ${sizeById(id).label}`);
  });
}

function syncPanels() {
  const layout = layoutById(state.layout);
  while (state.panels.length < layout.panels.length) {
    const src = state.panels.length % 2 === 0 ? SAMPLE_A : SAMPLE_B;
    state.panels.push({
      src,
      name: src === SAMPLE_A ? 'boulevard' : 'pier',
      panX: 0.5, panY: 0.15, zoom: 1,
    });
  }
  buildPanelRows();
}

function buildPanelRows() {
  const box = $('panel-rows');
  box.innerHTML = '';
  const layout = layoutById(state.layout);
  layout.panels.forEach((_, i) => {
    const panel = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selected ? ' selected' : '');
    row.dataset.index = String(i);

    const head = document.createElement('div');
    head.className = 'row-head';
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1} — ${panel.name}`;
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'upload-btn';
    upload.textContent = 'Upload photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    upload.addEventListener('click', () => file.click());
    file.addEventListener('change', () => uploadPhoto(i, file));
    head.append(name, upload);
    head.appendChild(file);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '2.5';
    slider.step = '0.01';
    slider.value = String(panel.zoom || 1);
    slider.setAttribute('aria-label', `Zoom panel ${i + 1}`);
    slider.addEventListener('input', () => {
      panel.zoom = Number(slider.value);
      render();
    });

    row.addEventListener('click', (ev) => {
      if (ev.target === upload || ev.target === file) return;
      selected = i;
      box.querySelectorAll('.panel-row').forEach((r) => r.classList.toggle('selected', Number(r.dataset.index) === i));
    });
    row.append(head, slider);
    box.appendChild(row);
  });
}

async function uploadPhoto(index, fileInput) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
    const img = await loadImage(dataUrl);
    images.set(dataUrl, img);
    const panel = state.panels[index];
    panel.src = dataUrl;
    panel.name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'photo';
    panel.panX = 0.5;
    panel.panY = 0.15;
    panel.zoom = 1;
    buildPanelRows();
    render();
    setStatus(`Panel ${index + 1}: ${panel.name} loaded`);
  } catch (err) {
    setStatus('That photo could not be loaded — try another file.');
  }
  fileInput.value = '';
}

function applyPreset(id) {
  const preset = presetById(id);
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  $('title').value = preset.title;
  $('subtitle').value = preset.subtitle;
  syncPanels();
  buildChips();
  render();
  setStatus(`Preset: ${preset.label} — edit the caption or export when ready`);
}

function pointToCover(ev) {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = previewSize();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * w,
    y: ((ev.clientY - rect.top) / rect.height) * h,
  };
}

function panelAt(x, y) {
  const { w, h } = previewSize();
  const layout = layoutById(state.layout);
  for (let i = 0; i < layout.panels.length; i++) {
    const f = layout.panels[i];
    if (x >= f.x * w && x < (f.x + f.w) * w && y >= f.y * h && y < (f.y + f.h) * h) return i;
  }
  return -1;
}

function bindPointer() {
  canvas.addEventListener('pointerdown', (ev) => {
    const p = pointToCover(ev);
    const hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    selected = hit;
    document.querySelectorAll('.panel-row').forEach((r) => r.classList.toggle('selected', Number(r.dataset.index) === hit));
    canvas.setPointerCapture(ev.pointerId);
    drag = { x: p.x, y: p.y, panel: { ...state.panels[hit] } };
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const { w, h } = previewSize();
    const p = pointToCover(ev);
    const panel = state.panels[selected];
    const layout = layoutById(state.layout);
    const f = layout.panels[selected];
    const rw = f.w * w;
    const rh = f.h * h;
    const img = images.get(panel.src);
    if (!img) return;
    const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight);
    const dw = img.naturalWidth * base * panel.zoom;
    const dh = img.naturalHeight * base * panel.zoom;
    const dx = dw > rw ? (p.x - drag.x) / (dw - rw) : 0;
    const dy = dh > rh ? (p.y - drag.y) / (dh - rh) : 0;
    panel.panX = Math.min(1, Math.max(0, drag.panel.panX - dx));
    panel.panY = Math.min(1, Math.max(0, drag.panel.panY - dy));
    render();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = pointToCover(ev);
    const hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    const panel = state.panels[hit];
    panel.zoom = Math.min(2.5, Math.max(1, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.92)));
    const row = document.querySelector(`.panel-row[data-index="${hit}"] input[type="range"]`);
    if (row) row.value = String(panel.zoom);
    render();
  }, { passive: false });
}

function exportPNG() {
  const size = sizeById(state.size);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), state, size.w, size.h, images);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${size.w} × ${size.h} PNG — share it!`);
  }, 'image/png');
}

function resetAll() {
  const fresh = defaultState();
  state.layout = fresh.layout;
  state.grade = fresh.grade;
  state.size = fresh.size;
  state.title = fresh.title;
  state.subtitle = fresh.subtitle;
  state.panels = fresh.panels;
  selected = 0;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  buildChips();
  syncPanels();
  render();
  setStatus('Reset — Sunset Heist loaded. Pick a preset to start again.');
}

async function init() {
  $('title').addEventListener('input', (ev) => {
    state.title = ev.target.value;
    render();
  });
  $('subtitle').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    render();
  });
  $('export').addEventListener('click', exportPNG);
  $('reset').addEventListener('click', resetAll);
  bindPointer();
  buildChips();
  syncPanels();
  try {
    const [a, b] = await Promise.all([loadImage(SAMPLE_A), loadImage(SAMPLE_B)]);
    images.set(SAMPLE_A, a);
    images.set(SAMPLE_B, b);
    render();
    setStatus('Ready — pick a preset, or drag a panel to frame your shot');
  } catch (err) {
    setStatus('Sample photos failed to load — upload your own to begin.');
  }
}

// Test and screenshot hooks: the harness drives the app through these.
window.__viceCover = {
  state,
  images,
  render,
  applyPreset,
  exportPNG,
  resetAll,
  drawCover,
};

init();

// Vice Cover v5 — cover art rendering engine.
// Draws GTA-style multi-panel poster covers on a canvas from plain state:
// layout, photos, grades, caption and export size. No network, no libraries.

export const PHOTOS = {
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};

// Photo colour grades: canvas filter + a translucent tint painted over the panel.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.8) contrast(1.35) brightness(1.04) sepia(0.28)',
    tint: 'rgba(255, 110, 40, 0.16)',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(2.1) contrast(1.3) brightness(0.98) hue-rotate(-18deg)',
    tint: 'rgba(255, 46, 136, 0.18)',
  },
  noir: {
    label: 'Noir',
    filter: 'saturate(0.25) contrast(1.45) brightness(0.92)',
    tint: 'rgba(10, 10, 40, 0.20)',
  },
  palm: {
    label: 'Palm Gold',
    filter: 'saturate(1.6) contrast(1.25) brightness(1.08) sepia(0.45)',
    tint: 'rgba(255, 190, 60, 0.14)',
  },
};

// Panel layouts. Every rect is a fraction of the cover (x, y, w, h).
// slant > 0 shears the panel's right edge for a diagonal GTA split.
export const LAYOUTS = {
  hero: {
    label: 'Hero',
    panels: [
      { x: 0, y: 0, w: 0.66, h: 1, slant: 0.05 },
      { x: 0.66, y: 0, w: 0.34, h: 0.5, slant: 0 },
      { x: 0.66, y: 0.5, w: 0.34, h: 0.5, slant: 0 },
    ],
  },
  grid: {
    label: 'Grid 2×2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5, slant: 0 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5, slant: 0 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5, slant: 0 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5, slant: 0 },
    ],
  },
  triptych: {
    label: 'Triptych',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 1, slant: 0.04 },
      { x: 0.34, y: 0, w: 0.32, h: 1, slant: 0 },
      { x: 0.66, y: 0, w: 0.34, h: 1, slant: -0.04 },
    ],
  },
  cinematic: {
    label: 'Cinematic',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62, slant: 0 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38, slant: 0 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38, slant: 0 },
    ],
  },
  split: {
    label: 'Split',
    panels: [
      { x: 0, y: 0, w: 0.6, h: 1, slant: 0.12 },
      { x: 0.6, y: 0, w: 0.4, h: 0.5, slant: 0 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5, slant: 0 },
    ],
  },
};

// One-click preset covers: layout + grade + words + size.
export const PRESETS = {
  sunsetHeist: {
    label: 'Sunset Heist',
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE CITY',
    subtitle: 'SUNSET HEIST • EST. 2026',
    size: '1080x1080',
  },
  neonNights: {
    label: 'Neon Nights',
    layout: 'cinematic',
    grade: 'neon',
    title: 'NEON NIGHTS',
    subtitle: 'VICE CITY AFTER DARK',
    size: '1920x1080',
  },
  duskDrive: {
    label: 'Dusk Drive',
    layout: 'triptych',
    grade: 'palm',
    title: 'DUSK DRIVE',
    subtitle: 'OCEAN DRIVE • 6 PM',
    size: '1080x1350',
  },
  palmGold: {
    label: 'Palm Gold',
    layout: 'grid',
    grade: 'palm',
    title: 'PALM GOLD',
    subtitle: 'VICE CITY • GOLDEN HOUR',
    size: '1080x1080',
  },
  viceNoir: {
    label: 'Vice Noir',
    layout: 'split',
    grade: 'noir',
    title: 'VICE NOIR',
    subtitle: 'NO HEROES • NO MERCY',
    size: '1080x1350',
  },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

// Default cover state: hero layout, real photos, sunset grade.
export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE CITY',
    subtitle: 'SUNSET HEIST • EST. 2026',
    size: '1080x1080',
    panels: [
      { photo: 'boulevard', panX: 0.5, panY: 0.15, zoom: 1 },
      { photo: 'pier', panX: 0.5, panY: 0.15, zoom: 1.05 },
      { photo: 'boulevard', panX: 0.35, panY: 0.15, zoom: 1.15 },
      { photo: 'pier', panX: 0.5, panY: 0.15, zoom: 1 },
    ],
  };
}

// Seeded pseudo-random so the film grain is identical on every render.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let grainTile = null;
export function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  const rnd = seededRandom(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

// Draw one photo into a panel rect, cover-fit, with pan/zoom and grade filter.
export function drawPhotoPanel(ctx, img, rect, panel, grade) {
  const px = rect.x;
  const py = rect.y;
  const pw = rect.w;
  const ph = rect.h;
  ctx.save();
  ctx.beginPath();
  if (rect.slant) {
    const s = rect.slant * pw;
    ctx.moveTo(px, py);
    ctx.lineTo(px + pw + s, py);
    ctx.lineTo(px + pw - s, py + ph);
    ctx.lineTo(px, py + ph);
    ctx.closePath();
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.clip();
  const scale = Math.max(pw / img.width, ph / img.height) * panel.zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  // Pan moves the photo only within its overflow: pan 0.5 centres it, pan 0
  // shows the left/top edge, pan 1 the right/bottom edge. With no overflow
  // (the photo fits the panel exactly) pan changes nothing, so no dark gap.
  const ox = Math.max(0, dw - pw);
  const oy = Math.max(0, dh - ph);
  const dx = px - ox * panel.panX;
  const dy = py - oy * panel.panY;
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(px, py, pw, ph);
  // Vignette: dark corners keep the focus on the middle of the panel.
  const vg = ctx.createRadialGradient(
    px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35,
    px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  // Panel gutter: a clean white seam between panels.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, pw * 0.006);
  ctx.strokeRect(px, py, pw, ph);
  ctx.restore();
}

// Halftone dots in the two top corners, a print-poster touch.
export function drawHalftone(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  const step = Math.max(14, w * 0.016);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const r = (5 - row) * 0.55 + 0.8;
      ctx.beginPath();
      ctx.arc(w - 14 - col * step, 14 + row * step, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14 + col * step, h - 14 - row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The big bottom title: up to 20% of cover height, five-stop sunset-to-neon
// gradient, thick dark outline, hard drop shadow, slight forward slant.
// The title is fitted to the cover width (never clipped) and stacked above
// the subtitle pill, never overlapping it.
export function drawTitleBlock(ctx, state, w, h) {
  const title = (state.title || 'VICE CITY').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();
  // Subtitle pill first: its height sets where the title baseline sits.
  let subSize = Math.max(14, h * 0.026);
  let pillH = 0;
  let pillW = 0;
  if (subtitle) {
    ctx.save();
    ctx.font = `700 ${subSize}px "Arial Black", Impact, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas */ }
    let tw = ctx.measureText(subtitle).width;
    while (tw + subSize * 2.2 > w * 0.96 && subSize > 12) {
      subSize *= 0.92;
      ctx.font = `700 ${subSize}px "Arial Black", Impact, sans-serif`;
      try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas */ }
      tw = ctx.measureText(subtitle).width;
    }
    pillW = tw + subSize * 2.2;
    pillH = subSize * 2.24;
    ctx.restore();
  }
  const bottomMargin = Math.max(10, h * 0.015);
  const pillY = h - bottomMargin - pillH;
  // Title: shrink until it fits 94% of the cover width.
  let size = h * 0.2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setTitleFont = () => {
    ctx.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch (e) { /* older canvas */ }
  };
  setTitleFont();
  while (ctx.measureText(title).width > w * 0.94 && size > h * 0.1) {
    size *= 0.94;
    setTitleFont();
  }
  const baseline = pillH > 0 ? pillY - size * 0.08 : h - size * 0.16;
  // Slight forward slant, pivoted on the title centre so it stays centred.
  ctx.save();
  ctx.translate(w / 2, baseline);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.translate(-w / 2, -baseline);
  const grad = ctx.createLinearGradient(0, baseline - size * 1.05, 0, baseline);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.28, '#ffd23f');
  grad.addColorStop(0.55, '#ff8a3d');
  grad.addColorStop(0.8, '#ff2e88');
  grad.addColorStop(1, '#7b2fff');
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#16001f';
  ctx.lineWidth = size * 0.075;
  ctx.strokeText(title, w / 2, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(title, w / 2, baseline);
  ctx.restore();
  // Subtitle pill under the title, unskewed.
  if (subtitle) {
    const padX = subSize * 1.1;
    const pillX = (w - pillW) / 2;
    ctx.fillStyle = 'rgba(12, 0, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.font = `700 ${subSize}px "Arial Black", Impact, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(subtitle, w / 2, pillY + pillH / 2 + subSize * 0.36);
  }
  ctx.restore();
}

// Top strip: VICE CITY banner left, five stars right.
export function drawTopStrip(ctx, w, h) {
  const barH = Math.max(26, h * 0.042);
  const pad = Math.max(12, w * 0.02);
  ctx.save();
  ctx.font = `900 ${barH * 0.52}px "Arial Black", Impact, sans-serif`;
  const label = '★ VICE CITY ★';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath();
  ctx.roundRect(pad, pad, tw + barH * 1.1, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pad + barH * 0.55, pad + barH / 2 + 1);
  ctx.fillStyle = '#ffd23f';
  ctx.font = `${barH * 0.62}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('★★★★★', w - pad, pad + barH / 2 + 1);
  ctx.restore();
}

// Render a full cover onto a canvas of the state's export size.
export function renderCover(canvas, state, images) {
  const size = SIZES[state.size] || SIZES['1080x1080'];
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const w = size.w;
  const h = size.h;
  ctx.fillStyle = '#0d0016';
  ctx.fillRect(0, 0, w, h);
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] || state.panels[0];
    const img = images[slot.photo];
    if (!img) return;
    drawPhotoPanel(ctx, img, {
      x: panel.x * w,
      y: panel.y * h,
      w: panel.w * w,
      h: panel.h * h,
      slant: panel.slant || 0,
    }, slot, grade);
  });
  // Film grain over the whole cover, then halftone corners.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawHalftone(ctx, w, h);
  drawTopStrip(ctx, w, h);
  drawTitleBlock(ctx, state, w, h);
  return canvas;
}

// Load the two bundled sample photos (or any photo map) into Image objects.
export function loadImages(photoMap) {
  const out = {};
  const jobs = Object.entries(photoMap).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { out[key] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = src;
  }));
  return Promise.all(jobs).then(() => out);
}

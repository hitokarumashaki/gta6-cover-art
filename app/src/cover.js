// Vice Cover — cover rendering: panels, photos, grades and lettering.
// Everything here draws on a canvas; main.js owns state and the editor UI.

/** Panel rectangles in unit coordinates [x, y, w, h] per layout. */
export const LAYOUTS = [
  {
    id: 'hero-left',
    name: 'Hero Left',
    panels: [
      [0, 0, 0.66, 1],
      [0.66, 0, 0.34, 0.5],
      [0.66, 0.5, 0.34, 0.5],
    ],
  },
  {
    id: 'hero-right',
    name: 'Hero Right',
    panels: [
      [0, 0, 0.34, 0.5],
      [0, 0.5, 0.34, 0.5],
      [0.34, 0, 0.66, 1],
    ],
  },
  {
    id: 'triptych',
    name: 'Triptych',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  {
    id: 'quad',
    name: 'Quad',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  { id: 'full', name: 'Full Bleed', panels: [[0, 0, 1, 1]] },
];

/** Colour grades: photo filter plus a tint wash over the whole cover. */
export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    saturate: 1.65,
    contrast: 1.28,
    brightness: 1.02,
    tint: ['#ff2e88', '#ff9a3d'],
    tintAlpha: 0.16,
    blend: 'overlay',
  },
  {
    id: 'neon',
    name: 'Neon',
    saturate: 1.8,
    contrast: 1.2,
    brightness: 1.0,
    tint: ['#ff2e88', '#2ee6d6'],
    tintAlpha: 0.2,
    blend: 'overlay',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    saturate: 1.45,
    contrast: 1.22,
    brightness: 0.96,
    tint: ['#8b5cf6', '#ff2e88'],
    tintAlpha: 0.2,
    blend: 'soft-light',
  },
  {
    id: 'noir',
    name: 'Noir',
    saturate: 0.55,
    contrast: 1.45,
    brightness: 0.98,
    tint: ['#1a1a2e', '#000000'],
    tintAlpha: 0.18,
    blend: 'multiply',
  },
];

/** Export sizes: the common post sizes. */
export const SIZES = [
  { id: '1080x1080', name: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', name: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', name: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

/** One-click preset covers: layout, grade, caption, size and photos. */
export const PRESETS = [
  {
    id: 'sunset-heist',
    name: 'Sunset Heist',
    layout: 'hero-left',
    grade: 'sunset',
    title: 'VICE CITY',
    subtitle: 'SUNSET HEIST',
    kicker: 'A FAN-MADE POSTER',
    size: '1920x1080',
    photos: ['boulevard', 'pier'],
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    layout: 'triptych',
    grade: 'neon',
    title: 'NEON NIGHTS',
    subtitle: 'VICE AFTER DARK',
    kicker: 'A FAN-MADE POSTER',
    size: '1080x1080',
    photos: ['pier', 'boulevard', 'pier'],
  },
  {
    id: 'dusk-drive',
    name: 'Dusk Drive',
    layout: 'hero-right',
    grade: 'dusk',
    title: 'DUSK DRIVE',
    subtitle: 'LAST LIGHT',
    kicker: 'A FAN-MADE POSTER',
    size: '1080x1350',
    photos: ['boulevard', 'pier'],
  },
  {
    id: 'vice-sunrise',
    name: 'Vice Sunrise',
    layout: 'quad',
    grade: 'sunset',
    title: 'VICE SUNRISE',
    subtitle: 'NEW DAY IN THE CITY',
    kicker: 'A FAN-MADE POSTER',
    size: '1080x1080',
    photos: ['pier', 'boulevard', 'pier', 'boulevard'],
  },
  {
    id: 'midnight-heat',
    name: 'Midnight Heat',
    layout: 'full',
    grade: 'noir',
    title: 'MIDNIGHT HEAT',
    subtitle: 'NO WAY OUT',
    kicker: 'A FAN-MADE POSTER',
    size: '1920x1080',
    photos: ['boulevard'],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/**
 * Draw one photo into a panel with cover-fit, overflow-based pan and zoom.
 * pan 0..1 slides the photo horizontally; vertical offset is biased high
 * (0.18) so faces stay in frame on wide cinematic crops.
 */
function drawPhoto(ctx, img, x, y, w, h, pan, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  const dw = iw * base;
  const dh = ih * base;
  const ox = x + (w - dw) * pan;
  const oy = y + (h - dh) * 0.18;
  ctx.drawImage(img, ox, oy, dw, dh);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Shrink the title font until it fits the cover width; never clips. */
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  for (;;) {
    ctx.font = `900 ${size}px "Arial Black", Impact, "Segoe UI", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 24) return size;
    size = Math.max(24, Math.floor(size * 0.92));
  }
}

/**
 * Render a cover into ctx at W x H.
 * state: { layout, grade, title, subtitle, kicker, panels: [{photo, pan, zoom}] }
 * images: Map from photo id to a loaded image (HTMLImageElement or canvas).
 */
export function renderCover(ctx, W, H, state, images) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const gap = Math.max(3, Math.round(Math.min(W, H) * 0.004));

  ctx.save();
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, W, H);

  // Panels: photos with the grade's filter, thin gutters between them.
  for (let i = 0; i < layout.panels.length; i++) {
    const [ux, uy, uw, uh] = layout.panels[i];
    const x = ux * W + (ux > 0 ? gap / 2 : 0);
    const y = uy * H + (uy > 0 ? gap / 2 : 0);
    const w = uw * W - (ux > 0 ? gap / 2 : 0) - (ux + uw < 1 ? gap / 2 : 0);
    const h = uh * H - (uy > 0 ? gap / 2 : 0) - (uy + uh < 1 ? gap / 2 : 0);
    const panel = state.panels[i] ?? { photo: null, pan: 0.5, zoom: 1 };
    const img = panel.photo ? images.get(panel.photo) : null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (img) {
      ctx.filter = `saturate(${grade.saturate}) contrast(${grade.contrast}) brightness(${grade.brightness})`;
      drawPhoto(ctx, img, x, y, w, h, panel.pan ?? 0.5, panel.zoom ?? 1);
      ctx.filter = 'none';
    } else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#2b1040');
      g.addColorStop(1, '#120a24');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1, Math.round(Math.min(W, H) * 0.002));
    ctx.strokeRect(x, y, w, h);
  }

  // Grade tint wash over the whole cover.
  const tint = ctx.createLinearGradient(0, 0, W, H);
  tint.addColorStop(0, grade.tint[0]);
  tint.addColorStop(1, grade.tint[1]);
  ctx.save();
  ctx.globalCompositeOperation = grade.blend;
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Vignette: darken the corners so the poster feels printed.
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Bottom scrim so the lettering always reads.
  const scrim = ctx.createLinearGradient(0, H * 0.6, 0, H);
  scrim.addColorStop(0, 'rgba(5,2,12,0)');
  scrim.addColorStop(0.55, 'rgba(5,2,12,0.45)');
  scrim.addColorStop(1, 'rgba(5,2,12,0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  // Kicker, then the big gradient title, then the subtitle pill.
  // Lettering lives in the bottom ~30% so no face is ever covered.
  const cx = W / 2;
  const title = (state.title || 'VICE CITY').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();
  const kicker = (state.kicker || '').toUpperCase();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const kickerSize = Math.max(14, Math.round(H * 0.026));
  if (kicker) {
    ctx.font = `700 ${kickerSize}px "Segoe UI", system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(kickerSize * 0.32)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#2ee6d6';
    ctx.fillText(kicker, cx, H * 0.72);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  const titleSize = fitTitleSize(ctx, title, W * 0.92, Math.round(H * 0.15));
  const titleGrad = ctx.createLinearGradient(0, H * 0.74, W, H * 0.74);
  titleGrad.addColorStop(0, '#ff2e88');
  titleGrad.addColorStop(0.28, '#ff9a3d');
  titleGrad.addColorStop(0.5, '#ffe259');
  titleGrad.addColorStop(0.74, '#2ee6d6');
  titleGrad.addColorStop(1, '#8b5cf6');
  ctx.font = `900 ${titleSize}px "Arial Black", Impact, "Segoe UI", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,2,20,0.6)';
  ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.09));
  const titleY = H * 0.87;
  ctx.strokeText(title, cx, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, cx, titleY);

  if (subtitle) {
    const subSize = Math.max(13, Math.round(H * 0.032));
    ctx.font = `700 ${subSize}px "Segoe UI", system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText(subtitle).width;
    const padX = Math.round(subSize * 0.9);
    const pillW = tw + padX * 2;
    const pillH = Math.round(subSize * 2.1);
    const pillX = cx - pillW / 2;
    const pillY = H * 0.9;
    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, cx, pillY + pillH / 2 + subSize * 0.36);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  ctx.restore();
}

/** Render a cover to a fresh canvas of W x H and return it. */
export function renderCoverToCanvas(W, H, state, images) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, W, H, state, images);
  return canvas;
}

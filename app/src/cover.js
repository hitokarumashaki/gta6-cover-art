// Vice Cover — cover renderer.
// Draws the multi-panel GTA-style poster onto any 2d canvas: panels with
// per-panel crop, a photo grade, a gradient title, subtitle pill, badge,
// stars and halftone dots. Pure drawing code: no network, no fonts to fetch.

export const SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

export const GRADES = [
  { id: 'sunset', label: 'Sunset', filter: 'saturate(1.65) contrast(1.28)', tint: 'rgba(255,122,26,0.10)' },
  { id: 'neon', label: 'Neon', filter: 'saturate(1.9) contrast(1.2)', tint: 'rgba(255,46,136,0.12)' },
  { id: 'noir', label: 'Noir', filter: 'grayscale(1) contrast(1.35)', tint: 'rgba(20,20,40,0.10)' },
  { id: 'palm', label: 'Palm Gold', filter: 'saturate(1.3) contrast(1.1) brightness(1.05)', tint: 'rgba(255,209,102,0.10)' },
];

// Panel rects are fractions of the cover (x, y, w, h). The hero panel is 66%
// of the width; the rest of the layouts split the frame in the classic
// multi-panel poster way.
export const LAYOUTS = [
  {
    id: 'hero', label: 'Hero',
    panels: [
      { x: 0, y: 0, w: 0.66, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 0.5 },
      { x: 0.66, y: 0.5, w: 0.34, h: 0.5 },
    ],
  },
  {
    id: 'grid', label: 'Grid 2×2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'triptych', label: 'Triptych',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'cinematic', label: 'Cinematic',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  {
    id: 'split', label: 'Split',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
];

export const PRESETS = [
  { id: 'sunset-heist', label: 'Sunset Heist', layout: 'hero', grade: 'sunset', title: 'VICE CITY', subtitle: 'SUNSET HEIST • EST. 2026' },
  { id: 'neon-nights', label: 'Neon Nights', layout: 'cinematic', grade: 'neon', title: 'NEON NIGHTS', subtitle: 'VICE CITY AFTER DARK' },
  { id: 'dusk-drive', label: 'Dusk Drive', layout: 'triptych', grade: 'palm', title: 'DUSK DRIVE', subtitle: 'OCEAN DRIVE • 6 PM' },
  { id: 'palm-gold', label: 'Palm Gold', layout: 'grid', grade: 'palm', title: 'PALM GOLD', subtitle: 'VICE CITY • GOLDEN HOUR' },
  { id: 'vice-noir', label: 'Vice Noir', layout: 'split', grade: 'noir', title: 'VICE NOIR', subtitle: 'EVERY CITY HAS ITS PRICE' },
];

export const SAMPLE_A = 'samples/boulevard.jpg';
export const SAMPLE_B = 'samples/pier.jpg';

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: 'square',
    title: 'VICE CITY',
    subtitle: 'SUNSET HEIST • EST. 2026',
    panels: [
      { src: SAMPLE_A, name: 'boulevard', panX: 0.5, panY: 0.15, zoom: 1 },
      { src: SAMPLE_B, name: 'pier', panX: 0.5, panY: 0.15, zoom: 1 },
      { src: SAMPLE_A, name: 'boulevard', panX: 0.5, panY: 0.15, zoom: 1 },
    ],
  };
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[0];
}

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image: ' + src));
    img.src = src;
  });
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

function drawPanelImage(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Cover-fit with overflow-based pan: the crop window slides inside the
  // oversized image, so wide crops never cut faces off the frame.
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const ox = (dw - w) * (panel.panX ?? 0.5);
  const oy = (dh - h) * (panel.panY ?? 0.15);
  ctx.filter = grade.filter;
  ctx.drawImage(img, x - ox, y - oy, dw, dh);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function fitTitleFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.92);
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

function subtitleMetrics(state, W, H) {
  const text = (state.subtitle || '').toUpperCase();
  const size = Math.max(14, Math.round(H * 0.032));
  const pillH = size * 2.05;
  const bottom = H - Math.max(10, H * 0.018);
  return { text, size, pillH, top: bottom - pillH, bottom };
}

function drawTitle(ctx, state, W, H, ceiling) {
  const text = (state.title || '').toUpperCase();
  if (!text) return;
  const maxWidth = W * 0.96;
  const start = Math.round(H * 0.18);
  const size = fitTitleFont(ctx, text, maxWidth, start);
  // Baseline sits `ceiling` pixels above the subtitle pill, with a gap.
  const baseline = ceiling - Math.max(8, H * 0.015);
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#ffd166');
  grad.addColorStop(0.28, '#ff7a1a');
  grad.addColorStop(0.52, '#ff2e88');
  grad.addColorStop(0.76, '#c026d3');
  grad.addColorStop(1, '#7c3aed');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = W / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.strokeStyle = '#160a2e';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, cx, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, baseline);
  ctx.restore();
}

function drawSubtitle(ctx, state, W, H, m) {
  const { text, size, pillH } = m;
  if (!text) return;
  ctx.save();
  ctx.font = `700 ${size}px Arial, sans-serif`;
  const textW = ctx.measureText(text).width;
  const padX = size * 1.1;
  const pillW = Math.min(textW + padX * 2, W * 0.92);
  const x = (W - pillW) / 2;
  const y = m.top;
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fillStyle = 'rgba(22,10,46,0.88)';
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Letter-spacing by hand: canvas has no letterSpacing everywhere.
  const spaced = text.split('').join('\u2009');
  const sw = ctx.measureText(spaced).width;
  const scale = sw > pillW - padX ? (pillW - padX) / sw : 1;
  ctx.save();
  ctx.translate(x + pillW / 2, y + pillH / 2 + size * 0.06);
  ctx.scale(scale, 1);
  ctx.fillText(spaced, 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawBadge(ctx, W, H) {
  const size = Math.max(13, Math.round(H * 0.026));
  ctx.save();
  ctx.font = `800 ${size}px Arial, sans-serif`;
  const label = '★ VICE CITY ★';
  const w = ctx.measureText(label).width + size * 1.6;
  const h = size * 2.1;
  const x = Math.max(10, W * 0.015);
  const y = Math.max(10, H * 0.015);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#ff2e88';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + size * 0.05);
  ctx.restore();
}

function drawStars(ctx, W, H) {
  const size = Math.max(14, Math.round(H * 0.028));
  ctx.save();
  ctx.font = `${size}px Arial, sans-serif`;
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText('★★★★★', W - Math.max(10, W * 0.015), Math.max(10, H * 0.015));
  ctx.restore();
}

function drawHalftone(ctx, W, H) {
  const gap = Math.max(10, W * 0.014);
  const r = Math.max(1.5, W * 0.0022);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6 - row; col++) {
      const x = W * 0.02 + col * gap;
      const y = H - W * 0.02 - row * gap;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(10,4,24,0.28)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Draws the whole cover. `images` maps a panel src to a loaded HTMLImageElement.
export function drawCover(ctx, state, W, H, images) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0616';
  ctx.fillRect(0, 0, W, H);
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const gap = Math.max(2, Math.round(Math.min(W, H) * 0.004));
  layout.panels.forEach((frac, i) => {
    const panel = state.panels[i] || state.panels[0];
    const img = images.get(panel.src);
    if (!img) return;
    const rect = {
      x: frac.x * W + (frac.x > 0 ? gap / 2 : 0),
      y: frac.y * H + (frac.y > 0 ? gap / 2 : 0),
      w: frac.w * W - (frac.x > 0 ? gap / 2 : 0) - (frac.x + frac.w < 1 ? gap / 2 : 0),
      h: frac.h * H - (frac.y > 0 ? gap / 2 : 0) - (frac.y + frac.h < 1 ? gap / 2 : 0),
    };
    drawPanelImage(ctx, img, rect, panel, grade);
  });
  drawVignette(ctx, W, H);
  drawHalftone(ctx, W, H);
  drawBadge(ctx, W, H);
  drawStars(ctx, W, H);
  // Title sits above the subtitle pill: measure the pill first, then place
  // the title baseline above it so the two never overlap.
  const sub = subtitleMetrics(state, W, H);
  drawTitle(ctx, state, W, H, sub.top);
  drawSubtitle(ctx, state, W, H, sub);
}

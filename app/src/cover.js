// Vice Cover drawing engine: multi-panel GTA-style cover art on a 2D canvas.
// A cover is a set of photo panels (white gutters, poster frame), a colour grade
// over the photos, and bold outlined caption lettering with a subtitle line.
// Every measurement is derived from the canvas size, so the same state draws at
// any export size (1080x1080, 1080x1350, 1920x1080).

export const LAYOUTS = ['hero', 'strips', 'grid', 'single'];

/** Panel rectangles for a layout, as fractions of the cover, gutter already split. */
export function panelRects(layout, w, h, gutter) {
  const g = gutter / w;
  const gh = gutter / h;
  switch (layout) {
    case 'hero':
      return [
        { x: 0, y: 0, w: 0.62 - g / 2, h: 1 },
        { x: 0.62 + g / 2, y: 0, w: 0.38 - g / 2, h: 0.5 - gh / 2 },
        { x: 0.62 + g / 2, y: 0.5 + gh / 2, w: 0.38 - g / 2, h: 0.5 - gh / 2 },
      ];
    case 'strips':
      return [0, 1, 2].map((i) => ({
        x: i * (1 / 3) + (i === 0 ? 0 : g / 2),
        y: 0,
        w: 1 / 3 - (i === 1 ? g : g / 2),
        h: 1,
      }));
    case 'grid':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 0.5 - gh / 2 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.5 - gh / 2 },
        { x: 0, y: 0.5 + gh / 2, w: 0.5 - g / 2, h: 0.5 - gh / 2 },
        { x: 0.5 + g / 2, y: 0.5 + gh / 2, w: 0.5 - g / 2, h: 0.5 - gh / 2 },
      ];
    case 'single':
    default:
      return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
}

/** Colour grades: each is a list of gradient stops painted over every photo. */
export const GRADES = {
  sunset: [
    { at: 0, color: 'rgba(255, 170, 60, 0.16)' },
    { at: 0.45, color: 'rgba(255, 110, 60, 0.14)' },
    { at: 1, color: 'rgba(214, 38, 120, 0.48)' },
  ],
  neon: [
    { at: 0, color: 'rgba(0, 229, 255, 0.30)' },
    { at: 0.5, color: 'rgba(120, 60, 255, 0.12)' },
    { at: 1, color: 'rgba(255, 0, 153, 0.32)' },
  ],
  dusk: [
    { at: 0, color: 'rgba(90, 50, 180, 0.28)' },
    { at: 0.6, color: 'rgba(40, 40, 140, 0.16)' },
    { at: 1, color: 'rgba(10, 10, 60, 0.42)' },
  ],
  none: [],
};

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const s = base * Math.max(0.5, zoom || 1);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    const maxOx = Math.max(0, (dw - w) / 2) / w;
    const maxOy = Math.max(0, (dh - h) / 2) / h;
    const cx = Math.max(-maxOx, Math.min(maxOx, ox || 0));
    const cy = Math.max(-maxOy, Math.min(maxOy, oy || 0));
    ctx.drawImage(img, x + (w - dw) / 2 + cx * w, y + (h - dh) / 2 + cy * h, dw, dh);
  } else {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Paints a grade's gradient over a panel rect (top to bottom). */
export function drawGrade(ctx, rect, grade) {
  const stops = GRADES[grade] || [];
  if (!stops.length) return;
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  for (const stop of stops) grad.addColorStop(stop.at, stop.color);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Bold poster lettering: gradient fill, dark outline, soft drop shadow. */
export function drawCaption(ctx, text, w, h, opts) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  const bottom = opts.pos !== 'top';
  let size = h * 0.115 * (opts.scale || 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => {
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.05)}px`; } catch { /* older canvas */ }
  };
  setFont();
  while (ctx.measureText(clean).width > w * 0.92 && size > 14) {
    size -= 2;
    setFont();
  }
  const baseline = bottom ? h - h * 0.055 : h * 0.055 + size * 0.8;
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, opts.color === '#ffffff' ? '#ffd9a0' : opts.color);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.13);
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(clean, w / 2, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(clean, w / 2, baseline);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return { baseline, size };
}

/** Small letterspaced subtitle line beside the caption. */
export function drawSubtitle(ctx, text, w, h, captionInfo, pos) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean || !captionInfo) return;
  const bottom = pos !== 'top';
  let size = Math.max(12, h * 0.028);
  ctx.textAlign = 'center';
  ctx.font = `700 ${size}px "Arial Black", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.35)}px`; } catch { /* older canvas */ }
  while (ctx.measureText(clean).width > w * 0.8 && size > 10) {
    size -= 1;
    ctx.font = `700 ${size}px "Arial Black", Arial, sans-serif`;
  }
  const y = bottom
    ? captionInfo.baseline + size * 1.15
    : captionInfo.baseline - captionInfo.size * 0.45;
  ctx.fillStyle = '#ffd23e';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = size * 0.3;
  ctx.fillText(clean, w / 2, y);
  ctx.shadowBlur = 0;
}

/**
 * Draws the whole cover. `state` holds layout, grade, caption, subtitle,
 * captionPos, captionColor, captionScale and panels: [{ img, zoom, ox, oy }].
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const gutter = Math.max(4, Math.round(w * 0.007));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout || 'hero', w, h, gutter);
  const panels = state.panels || [];
  rects.forEach((r, i) => {
    const px = { x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h };
    const p = panels[i] || {};
    drawPanelPhoto(ctx, p.img || null, px, p.zoom, p.ox, p.oy);
    drawGrade(ctx, px, state.grade || 'sunset');
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, gutter * 0.5);
    ctx.strokeRect(px.x, px.y, px.w, px.h);
  });
  // Scrim behind the lettering so it reads over any photo.
  const bottom = state.captionPos !== 'top';
  const scrim = ctx.createLinearGradient(0, bottom ? h * 0.62 : 0, 0, bottom ? h : h * 0.38);
  if (bottom) {
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0.55)');
  } else {
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0.55)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bottom ? h * 0.62 : 0, w, h * 0.38);
  const info = drawCaption(ctx, state.caption, w, h, {
    pos: state.captionPos,
    color: state.captionColor || '#ffffff',
    scale: state.captionScale || 1,
  });
  drawSubtitle(ctx, state.subtitle, w, h, info, state.captionPos);
  // Poster frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

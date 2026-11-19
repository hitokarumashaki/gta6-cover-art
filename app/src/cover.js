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

/** Colour grades: each is a poster-strength treatment painted over every photo.
 * Two layers: an 'overlay' tint that blends with the photo's light (rich,
 * stylised colour, like a printed poster) and a 'source-over' wash that sets
 * the mood. Alphas are deliberately strong — a faint tint reads as a mistake,
 * a bold one reads as a grade. */
export const GRADES = {
  sunset: {
    overlay: [
      { at: 0, color: 'rgba(255, 190, 60, 0.55)' },
      { at: 0.45, color: 'rgba(255, 120, 40, 0.5)' },
      { at: 1, color: 'rgba(220, 30, 130, 0.55)' },
    ],
    wash: [
      { at: 0, color: 'rgba(255, 170, 50, 0.10)' },
      { at: 0.5, color: 'rgba(255, 100, 50, 0.12)' },
      { at: 1, color: 'rgba(190, 20, 110, 0.34)' },
    ],
  },
  neon: {
    overlay: [
      { at: 0, color: 'rgba(0, 230, 255, 0.55)' },
      { at: 0.5, color: 'rgba(150, 60, 255, 0.5)' },
      { at: 1, color: 'rgba(255, 0, 160, 0.6)' },
    ],
    wash: [
      { at: 0, color: 'rgba(0, 200, 255, 0.14)' },
      { at: 0.5, color: 'rgba(120, 40, 220, 0.16)' },
      { at: 1, color: 'rgba(255, 0, 150, 0.34)' },
    ],
  },
  dusk: {
    overlay: [
      { at: 0, color: 'rgba(110, 60, 200, 0.55)' },
      { at: 0.55, color: 'rgba(50, 50, 160, 0.5)' },
      { at: 1, color: 'rgba(15, 10, 70, 0.6)' },
    ],
    wash: [
      { at: 0, color: 'rgba(100, 50, 190, 0.16)' },
      { at: 0.6, color: 'rgba(45, 45, 150, 0.18)' },
      { at: 1, color: 'rgba(8, 8, 55, 0.38)' },
    ],
  },
  none: { overlay: [], wash: [] },
};

/** Punch applied to every photo so it reads as poster art, not a snapshot. */
const PHOTO_FILTER = 'saturate(1.5) contrast(1.2) brightness(1.04)';

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan.
 * The photo is punched up (saturation + contrast) so it reads as poster art. */
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
    try { ctx.filter = PHOTO_FILTER; } catch { /* older canvas */ }
    ctx.drawImage(img, x + (w - dw) / 2 + cx * w, y + (h - dh) / 2 + cy * h, dw, dh);
    try { ctx.filter = 'none'; } catch { /* older canvas */ }
  } else {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Paints a grade over a panel rect: an 'overlay' tint blended with the
 * photo's light, then a colour wash, then a vignette for poster drama. */
export function drawGrade(ctx, rect, grade) {
  const g = GRADES[grade] || GRADES.none;
  const paint = (stops, composite) => {
    if (!stops.length) return;
    const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    for (const stop of stops) grad.addColorStop(stop.at, stop.color);
    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  };
  paint(g.overlay, 'overlay');
  paint(g.wash, 'source-over');
  // Vignette: darkened corners pull the eye to the middle of the panel.
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.hypot(rect.w, rect.h) / 2;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 18, 0.38)');
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Bold poster lettering: huge gradient fill, thick dark outline, hard 3D offset
 * shadow and a soft drop shadow. The title is the cover's loudest element. */
export function drawCaption(ctx, text, w, h, opts) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  const bottom = opts.pos !== 'top';
  // 30% bigger than before: the title must dominate the cover.
  let size = h * 0.15 * (opts.scale || 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => {
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch { /* older canvas */ }
  };
  setFont();
  while (ctx.measureText(clean).width > w * 0.94 && size > 14) {
    size -= 2;
    setFont();
  }
  const baseline = bottom ? h - h * 0.045 - h * 0.08 : h * 0.045 + size * 0.8;
  // Hot poster gradient: white -> bright yellow -> hot orange -> deep pink.
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#ffe95c');
  grad.addColorStop(0.75, '#ff9a3c');
  grad.addColorStop(1, opts.color === '#ffffff' ? '#ff5e7a' : opts.color);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.17);
  ctx.strokeStyle = '#14081f';
  // Hard 3D offset shadow: the title sits proud of the photo.
  const off = Math.max(3, size * 0.06);
  ctx.save();
  ctx.translate(off, off);
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.strokeText(clean, w / 2, baseline);
  ctx.fillStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.fillText(clean, w / 2, baseline);
  ctx.restore();
  // Soft drop shadow + main stroke + gradient fill.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(clean, w / 2, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(clean, w / 2, baseline);
  // Thin bright rim on the top edge of the letters for extra pop.
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.strokeText(clean, w / 2, baseline - size * 0.02);
  ctx.strokeStyle = '#14081f';
  return { baseline, size };
}

/** Small letterspaced subtitle line beside the caption. */
export function drawSubtitle(ctx, text, w, h, captionInfo, pos) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean || !captionInfo) return;
  const bottom = pos !== 'top';
  let size = Math.max(13, h * 0.032);
  ctx.textAlign = 'center';
  ctx.font = `800 ${size}px "Arial Black", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.4)}px`; } catch { /* older canvas */ }
  while (ctx.measureText(clean).width > w * 0.82 && size > 10) {
    size -= 1;
    ctx.font = `800 ${size}px "Arial Black", Arial, sans-serif`;
  }
  const y = bottom
    ? captionInfo.baseline + size * 1.2
    : captionInfo.baseline - captionInfo.size * 0.45;
  ctx.fillStyle = '#ffd23e';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = size * 0.35;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.85)';
  ctx.strokeText(clean, w / 2, y);
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
  // Scrim behind the lettering so it reads over any photo. Stronger than
  // before, because the title is now much bigger and must never fight a face.
  const bottom = state.captionPos !== 'top';
  const scrim = ctx.createLinearGradient(0, bottom ? h * 0.55 : 0, 0, bottom ? h : h * 0.45);
  if (bottom) {
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
    scrim.addColorStop(0.55, 'rgba(10, 4, 20, 0.35)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0.72)');
  } else {
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0.72)');
    scrim.addColorStop(0.45, 'rgba(10, 4, 20, 0.35)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bottom ? h * 0.55 : 0, w, h * 0.45);
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

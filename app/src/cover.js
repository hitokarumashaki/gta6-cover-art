// Vice Cover v3 — the cover drawing engine.
// A cover is a set of photo panels on a white poster frame, a colour grade
// painted over every photo, and huge outlined caption lettering with a
// subtitle pill. All geometry is computed from the canvas size in pixels, so
// the same state renders at any export size (1080x1080, 1080x1350, 1920x1080).

export const LAYOUT_NAMES = ['hero', 'strips', 'grid', 'single'];
export const GRADE_NAMES = ['sunset', 'neon', 'dusk', 'none'];

/** Panel rectangles in pixels for a layout. `gap` is the gutter in pixels. */
export function layoutPanels(name, w, h, gap) {
  const third = w / 3;
  const halfW = w / 2;
  const halfH = h / 2;
  if (name === 'strips') {
    return [
      { x: 0, y: 0, w: third - gap / 2, h },
      { x: third + gap / 2, y: 0, w: third - gap, h },
      { x: 2 * third + gap / 2, y: 0, w: third - gap / 2, h },
    ];
  }
  if (name === 'grid') {
    return [
      { x: 0, y: 0, w: halfW - gap / 2, h: halfH - gap / 2 },
      { x: halfW + gap / 2, y: 0, w: halfW - gap / 2, h: halfH - gap / 2 },
      { x: 0, y: halfH + gap / 2, w: halfW - gap / 2, h: halfH - gap / 2 },
      { x: halfW + gap / 2, y: halfH + gap / 2, w: halfW - gap / 2, h: halfH - gap / 2 },
    ];
  }
  if (name === 'single') return [{ x: 0, y: 0, w, h }];
  // hero: one big panel on the left, two stacked panels on the right.
  const heroW = w * 0.62;
  return [
    { x: 0, y: 0, w: heroW - gap / 2, h },
    { x: heroW + gap / 2, y: 0, w: w - heroW - gap / 2, h: halfH - gap / 2 },
    { x: heroW + gap / 2, y: halfH + gap / 2, w: w - heroW - gap / 2, h: halfH - gap / 2 },
  ];
}

/** How hard a photo is punched before the grade goes on: a poster, not a
 * snapshot. Saturation and contrast do most of the work; a touch of
 * brightness keeps the sunset from going muddy. */
const PHOTO_PUNCH = 'saturate(1.5) contrast(1.2) brightness(1.04)';

/** Colour grades. Each grade is two vertical treatments: an 'overlay' tint
 * that marries with the photo's light (rich, printed-poster colour) and a
 * 'source-over' wash that sets the mood. The alphas are strong on purpose —
 * a timid tint reads as a mistake, a bold one reads as a grade. */
export const GRADES = {
  sunset: {
    overlay: [[0, 'rgba(255,190,60,0.55)'], [0.45, 'rgba(255,120,40,0.5)'], [1, 'rgba(220,30,130,0.55)']],
    wash: [[0, 'rgba(255,170,50,0.10)'], [0.5, 'rgba(255,100,50,0.12)'], [1, 'rgba(190,20,110,0.34)']],
    vignette: 0.38,
  },
  neon: {
    overlay: [[0, 'rgba(0,230,255,0.55)'], [0.5, 'rgba(150,60,255,0.5)'], [1, 'rgba(255,0,160,0.6)']],
    wash: [[0, 'rgba(0,200,255,0.14)'], [0.5, 'rgba(120,40,220,0.16)'], [1, 'rgba(255,0,150,0.34)']],
    vignette: 0.38,
  },
  dusk: {
    overlay: [[0, 'rgba(110,60,200,0.55)'], [0.55, 'rgba(50,50,160,0.5)'], [1, 'rgba(15,10,70,0.6)']],
    wash: [[0, 'rgba(100,50,190,0.16)'], [0.6, 'rgba(45,45,150,0.18)'], [1, 'rgba(8,8,55,0.38)']],
    vignette: 0.4,
  },
  none: { overlay: [], wash: [], vignette: 0.22 },
};

/** Draws one photo into a panel, cover-fit, with the panel's zoom and pan.
 * `view` is { zoom, ox, oy } — offsets are fractions of the panel size. */
export function paintPhoto(ctx, img, rect, view) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const zoom = Math.max(0.5, view.zoom || 1);
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2) / rect.w;
  const slackY = Math.max(0, (dh - rect.h) / 2) / rect.h;
  const ox = Math.max(-slackX, Math.min(slackX, view.ox || 0));
  const oy = Math.max(-slackY, Math.min(slackY, view.oy || 0));
  try { ctx.filter = PHOTO_PUNCH; } catch { /* canvas without filter */ }
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + ox * rect.w, rect.y + (rect.h - dh) / 2 + oy * rect.h, dw, dh);
  try { ctx.filter = 'none'; } catch { /* canvas without filter */ }
  ctx.restore();
}

/** Paints a grade over one panel: overlay tint, wash, then a vignette that
 * darkens the corners and pulls the eye to the middle of the photo. */
export function paintGrade(ctx, rect, gradeName) {
  const grade = GRADES[gradeName] || GRADES.none;
  const layer = (stops, mode) => {
    if (!stops.length) return;
    const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  };
  layer(grade.overlay, 'overlay');
  layer(grade.wash, 'source-over');
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.hypot(rect.w, rect.h) / 2;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(8,2,18,${grade.vignette})`);
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** The poster's loudest element: huge gradient lettering, a thick dark
 * outline, a hard offset shadow that lifts the letters off the photo, and a
 * thin bright rim along the top edge. Returns where the letters sit so the
 * subtitle can follow. */
export function paintTitle(ctx, text, w, h, opts) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return null;
  const atTop = opts.pos === 'top';
  // The title must dominate the cover: 16% of the cover height before the
  // user's size slider, shrinking only until it fits the width.
  let size = h * 0.16 * (opts.scale || 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => {
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch { /* no letterSpacing */ }
  };
  setFont();
  while (ctx.measureText(clean).width > w * 0.94 && size > 14) {
    size -= 2;
    setFont();
  }
  // Reserve 8% of the height below the baseline so a bottom title never
  // collides with the frame; a top title sits just under the frame instead.
  const baseline = atTop ? h * 0.045 + size * 0.8 : h - h * 0.045 - h * 0.08;
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#ffe95c');
  grad.addColorStop(0.75, '#ff9a3c');
  grad.addColorStop(1, opts.color === '#ffffff' ? '#ff5e7a' : opts.color);
  ctx.lineJoin = 'round';
  // Hard 3D offset: the same letters, shifted down-right in near-black.
  const off = Math.max(3, size * 0.06);
  ctx.save();
  ctx.translate(off, off);
  ctx.lineWidth = Math.max(3, size * 0.17);
  ctx.strokeStyle = 'rgba(10,2,20,0.9)';
  ctx.strokeText(clean, w / 2, baseline);
  ctx.fillStyle = 'rgba(10,2,20,0.9)';
  ctx.fillText(clean, w / 2, baseline);
  ctx.restore();
  // Main letters: soft drop shadow, thick outline, gradient fill.
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = Math.max(3, size * 0.17);
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(clean, w / 2, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(clean, w / 2, baseline);
  // Bright rim on the top edge of the letters for extra pop.
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeText(clean, w / 2, baseline - size * 0.02);
  return { baseline, size };
}

/** The subtitle rides in a dark pill under (or over) the title: yellow
 * letterspaced capitals on a translucent black capsule, so it reads over any
 * photo without fighting the title. */
export function paintSubtitlePill(ctx, text, w, h, title, pos) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean || !title) return;
  const atTop = pos === 'top';
  let size = Math.max(13, h * 0.032);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => {
    ctx.font = `800 ${size}px "Arial Black", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.4)}px`; } catch { /* no letterSpacing */ }
  };
  setFont();
  while (ctx.measureText(clean).width > w * 0.78 && size > 10) {
    size -= 1;
    setFont();
  }
  const textW = ctx.measureText(clean).width;
  const padX = size * 0.9;
  const padY = size * 0.55;
  const pillW = textW + padX * 2;
  const pillH = size + padY * 2;
  const cx = w / 2;
  // Below the title when the title is at the top (the title's own height
  // fills the space above its baseline, so a pill there would collide with
  // the letters); below the title when it is at the bottom too — the pill
  // always rides just under the title.
  const cy = atTop
    ? title.baseline + title.size * 0.35 + pillH / 2
    : title.baseline + size * 1.35 + pillH / 2;
  const x = cx - pillW / 2;
  const y = cy - pillH / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(12,4,24,0.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,0.55)';
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.25;
  ctx.fillText(clean, cx, cy + size * 0.36);
  ctx.restore();
}

/**
 * Draws the whole cover. `state` holds layout, grade, caption, subtitle,
 * captionPos, captionColor, captionScale and panels: [{ img, zoom, ox, oy }].
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const gap = Math.max(4, Math.round(w * 0.007));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.layout || 'hero', w, h, gap);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const p = panels[i] || {};
    paintPhoto(ctx, p.img || null, rect, p);
    paintGrade(ctx, rect, state.grade || 'sunset');
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, gap * 0.5);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  // Scrim behind the lettering so it reads over any photo. Strong, because
  // the title is huge and must never fight a bright sky or a face.
  const atTop = state.captionPos === 'top';
  const scrim = ctx.createLinearGradient(0, atTop ? 0 : h * 0.55, 0, atTop ? h * 0.45 : h);
  if (atTop) {
    scrim.addColorStop(0, 'rgba(10,4,20,0.72)');
    scrim.addColorStop(0.45, 'rgba(10,4,20,0.35)');
    scrim.addColorStop(1, 'rgba(10,4,20,0)');
  } else {
    scrim.addColorStop(0, 'rgba(10,4,20,0)');
    scrim.addColorStop(0.55, 'rgba(10,4,20,0.35)');
    scrim.addColorStop(1, 'rgba(10,4,20,0.72)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, atTop ? 0 : h * 0.55, w, h * 0.45);
  const title = paintTitle(ctx, state.caption, w, h, {
    pos: state.captionPos,
    color: state.captionColor || '#ffffff',
    scale: state.captionScale || 1,
  });
  paintSubtitlePill(ctx, state.subtitle, w, h, title, state.captionPos);
  // Poster frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

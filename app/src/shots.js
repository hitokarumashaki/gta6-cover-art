// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the app with a sample photo loaded and the controls
// visible. Query params: layout, grade, size, caption, subtitle, pos, color,
// scale, photo, photo2 (sample names without .jpg). window.__shotReady is
// set once the scene has painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // The scale param is user-supplied, so only a finite number is accepted:
  // a non-numeric value would otherwise become NaN and break the title size.
  const raw = query.get('scale');
  const scale = raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
  const params = {
    layout: query.get('layout'),
    grade: query.get('grade'),
    size: query.get('size'),
    caption: query.get('caption'),
    subtitle: query.get('subtitle'),
    pos: query.get('pos'),
    color: query.get('color'),
    scale,
    photo: query.get('photo'),
    photo2: query.get('photo2'),
    focus: query.get('focus'),
  };
  await setup(params);
  if (shot === 'cover') {
    // Fit the cover inside the viewport without stretching it.
    const canvas = document.getElementById('cover');
    const fit = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    canvas.style.width = `${Math.floor(canvas.width * fit)}px`;
    canvas.style.height = `${Math.floor(canvas.height * fit)}px`;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the app with a sample photo loaded and the controls visible.
// Query params: layout, grade, size, caption, subtitle, pos, color, scale,
// photo, photo2 (sample names without .jpg). window.__shotReady is set once painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const params = {
    layout: query.get('layout'),
    grade: query.get('grade'),
    size: query.get('size'),
    caption: query.get('caption'),
    subtitle: query.get('subtitle'),
    pos: query.get('pos'),
    color: query.get('color'),
    scale: query.get('scale') ? Number(query.get('scale')) : undefined,
    photo: query.get('photo'),
    photo2: query.get('photo2'),
  };
  await setup(params);
  const canvas = document.getElementById('cover');
  if (shot === 'cover') {
    // Fit the cover inside the viewport without stretching it.
    const scale = Math.min(
      window.innerWidth / canvas.width,
      window.innerHeight / canvas.height,
    );
    canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
    canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

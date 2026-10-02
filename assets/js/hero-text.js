// Hero headline rendered on canvas with pretext: lines flow around a rotating
// wireframe cube. Falls back to static HTML headline on any failure.
import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '../vendor/pretext/dist/layout.js';

const TEXT = 'EVENT-DRIVEN BACKENDS FOR MONEY-CRITICAL SYSTEMS.';
const INK = '#1e1e1e';

function initHeroText() {
  const wrap = document.querySelector('.hero__canvas-wrap');
  const canvas = document.getElementById('hero-canvas');
  const fallback = document.getElementById('hero-static');
  if (!wrap || !canvas || !fallback) return;

  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let prepared = null;
  let fontSize = 0;
  let lineHeight = 0;
  let letterSpacing = 0;
  let w = 0, h = 0, dpr = 1;
  let raf = 0;
  let running = false;
  let start = performance.now();

  const fontSpec = () => `600 ${fontSize}px Archivo`;

  function prepare() {
    letterSpacing = -0.028 * fontSize;
    prepared = prepareWithSegments(TEXT, fontSpec(), { letterSpacing });
    lineHeight = fontSize * 0.98;
  }

  function sizeCanvas() {
    const rect = wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const next = Math.round(Math.min(150, Math.max(40, w * 0.105)));
    if (next !== fontSize) {
      fontSize = next;
      prepare(); // one-time cost per size; layout() stays pure arithmetic
    }
  }

  // Wireframe cube: vertices, rotation, projection, silhouette.
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]);
  const E = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      let diff = 0;
      for (let k = 0; k < 3; k++) if (V[i][k] !== V[j][k]) diff++;
      if (diff === 1) E.push([i, j]);
    }

  function cubeGeom(t) {
    const ry = t * 0.5, rx = 0.42 + Math.sin(t * 0.23) * 0.12;
    const s = Math.min(h, w) * 0.21;
    const cx = w * (w > 760 ? 0.76 : 0.78);
    const cy = h * 0.34;
    const pts = V.map(([x, y, z]) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      return [cx + x1 * s, cy + y1 * s];
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { pts, minX, maxX, minY, maxY };
  }

  function drawCube(g) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    for (const [a, b] of E) {
      ctx.beginPath();
      ctx.moveTo(g.pts[a][0], g.pts[a][1]);
      ctx.lineTo(g.pts[b][0], g.pts[b][1]);
      ctx.stroke();
    }
  }

  function render(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = fontSpec();
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';

    const g = cubeGeom(t);
    const interfere = w > 620;
    const pad = fontSize * 0.18;

    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    const y0 = Math.max(fontSize * 0.4, (h - lineHeight * 4) / 2);
    for (let i = 0; ; i++) {
      const lineTop = y0 + i * lineHeight;
      const lineBottom = lineTop + lineHeight;
      let maxW = w - pad * 2;
      if (interfere && lineBottom > g.minY - pad && lineTop < g.maxY + pad) {
        maxW = Math.max(fontSize * 2.2, g.minX - pad * 2);
      }
      const range = layoutNextLineRange(prepared, cursor, maxW);
      if (!range) break;
      const line = materializeLineRange(prepared, range);
      ctx.fillText(line.text, pad, lineTop + fontSize * 0.82);
      cursor = range.end;
    }
    if (interfere) drawCube(g);
  }

  function frame(now) {
    render((now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  try {
    sizeCanvas();
    render(reduced ? 0.8 : 0);
  } catch {
    canvas.hidden = true;
    fallback.hidden = false;
    return;
  }

  if (reduced) { canvas.hidden = true; fallback.hidden = false; return; }

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    if (!running) render(0);
  });
  ro.observe(wrap);

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      start = performance.now() - 800; // keep phase pleasant after pauses
      startLoop();
    } else stopLoop();
  }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopLoop() : startLoop();
  });
}

export { initHeroText };

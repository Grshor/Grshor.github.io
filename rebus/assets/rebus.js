// REBUS — not a resume. A toy. Zero words on screen: symbols, digits, play.
// Drag the polyhedron to spin it (with inertia). Chapters are playthings:
// ripples, a sigil matrix, digit rain, and three contact sigils.
'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const contactsEl = document.getElementById('contacts');

const INK = 'rgba(140, 245, 214, ';   // structure
const LIFE = 'rgba(255, 92, 138, ';   // live signal
const DIM = 'rgba(120, 160, 150, ';   // background matter

let W = 0, H = 0, DPR = 1;
let t = 0, last = performance.now();
let px = -1, py = -1;                 // tracked pointer (CSS px)
let down = false, dragDist = 0;
let scene = 'orbit';
let morph = 0;
let hovered = null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icosahedron ---------- */
const PHI = (1 + Math.sqrt(5)) / 2;
const V = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(v => v.map(x => x / Math.hypot(1, PHI)));
const E = [];
const EDGE = 2 / Math.sqrt(1 + PHI * PHI);
for (let i = 0; i < 12; i++)
  for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
    if (Math.abs(d - EDGE) < 0.02) E.push([i, j]);
  }

function rot(v, ry, rx) {
  const [x, y, z] = v;
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
  return [x1, y1, z2];
}
const proj = (v, s, cx, cy) => [cx + v[0] * s, cy + v[1] * s, v[2]];

// user-driven spin with inertia; idles back to a slow auto-spin
let spinY = 0.6, spinX = 0.4;
let velY = 0.30, velX = 0.10; // rad/s

/* ---------- chapters ---------- */
const NODES = [
  { id: 'ripple', glyph: 'line' },
  { id: 'matrix', glyph: 'grid' },
  { id: 'rain', glyph: 'pulse' },
  { id: 'contact', glyph: 'link' },
];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let s = Math.imul(a ^ (a >>> 15), 1 | a);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function sigil(seed, s) { // strokes a deterministic glyph at ctx origin
  const rnd = mulberry(seed);
  const n = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    ctx.beginPath();
    const kind = Math.floor(rnd() * 3);
    const a = (rnd() - 0.5) * s, b = (rnd() - 0.5) * s;
    if (kind === 0) { ctx.moveTo(a, b); ctx.lineTo((rnd() - 0.5) * s, (rnd() - 0.5) * s); }
    else if (kind === 1) { ctx.arc(a * 0.4, b * 0.4, s * (0.12 + rnd() * 0.2), 0, rnd() * Math.PI * 2); }
    else { ctx.rect(a * 0.5, b * 0.5, s * (0.15 + rnd() * 0.25), s * (0.15 + rnd() * 0.25)); }
    ctx.stroke();
  }
}

/* ripple state */
const rings = [];       // {x, y, r, v, life, hot}
const motes = [];       // ambient drifting particles
/* matrix state */
const M_N = 5;
const mGen = new Array(M_N * M_N).fill(0);
const mWave = [];       // {ci, r}
/* rain state */
let cols = [];
let drops = [];         // splash particles

function initCols() {
  const n = Math.max(12, Math.floor(W / 34));
  cols = Array.from({ length: n }, (_, i) => ({
    x: (i + 0.5) * (W / n),
    y: Math.random() * H,
    sp: 90 + Math.random() * 160,
    len: 8 + Math.floor(Math.random() * 10),
    chars: Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)),
  }));
}

/* ---------- helpers ---------- */
function poly(pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (close) ctx.closePath();
  ctx.stroke();
}

const orbitCenter = () => [W / 2, H / 2];
function nodeRing() {
  const [cx, cy] = orbitCenter();
  const R = Math.min(W, H) * 0.36;
  return NODES.map((n, i) => {
    const a = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2 + t * 0.05;
    return { ...n, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });
}

function hitTest(x, y) {
  if (x < 0) return null;
  if (scene === 'orbit') {
    for (const n of nodeRing()) if (Math.hypot(x - n.x, y - n.y) < 26) return n.id;
    return null;
  }
  if (scene === 'matrix') {
    const S = Math.min(W, H) * 0.085, gap = S * 0.42;
    const ox = W / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
    const oy = H / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
    for (let i = 0; i < M_N * M_N; i++) {
      const r = Math.floor(i / M_N), c = i % M_N;
      const sx = ox + c * (S + gap), sy = oy + r * (S + gap);
      if (Math.abs(x - sx) < S / 2 + 4 && Math.abs(y - sy) < S / 2 + 4) return 'matrix-' + i;
    }
  }
  return null;
}

function drawNodeGlyph(g, x, y, r, hot) {
  ctx.strokeStyle = hot ? LIFE + '0.95)' : INK + '0.75)';
  ctx.lineWidth = hot ? 1.8 : 1.2;
  if (g === 'diamond') poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]]);
  if (g === 'line') poly([[x - r, y + r * 0.5], [x - r * 0.4, y - r * 0.6], [x + r * 0.3, y + r * 0.4], [x + r, y - r * 0.6]], false);
  if (g === 'grid') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(x - r + i * r * 0.8, y - r + j * r * 0.8, r * 0.4, r * 0.4); }
  if (g === 'pulse') { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.3, y); ctx.lineTo(x - r * 0.1, y - r); ctx.lineTo(x + r * 0.15, y + r); ctx.lineTo(x + r * 0.35, y); ctx.lineTo(x + r, y); ctx.stroke(); }
  if (g === 'link') { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI * 2); ctx.stroke(); }
}

function drawIdentity(s, cx, cy) {
  const pts = V.map(v => proj(rot(v, spinY, spinX), s, cx, cy));
  for (const [a, b] of E) {
    const z = (pts[a][2] + pts[b][2]) / 2;
    ctx.strokeStyle = INK + (0.28 + (z + 1) * 0.3) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke();
  }
  ctx.strokeStyle = INK + '0.9)';
  ctx.lineWidth = 1.6;
  const k = s * 0.22;
  poly([[cx - k, cy + k], [cx - k, cy - k], [cx + k * 0.65, cy + k]], false);
  ctx.beginPath(); ctx.moveTo(cx + k * 1.1, cy - k); ctx.lineTo(cx + k * 1.1, cy + k); ctx.stroke();
}

/* ---------- scenes ---------- */
function drawMatter() {
  for (let i = 0; i < 60; i++) {
    const sd = Math.sin(i * 127.1) * 43758.5453;
    const x = ((sd - Math.floor(sd)) * W + t * (6 + (i % 5) * 4)) % (W + 40) - 20;
    const yd = Math.sin(i * 311.7) * 43758.5453;
    const y = (yd - Math.floor(yd)) * H;
    ctx.fillStyle = DIM + (0.06 + (i % 4) * 0.04) + ')';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawOrbit(alpha) {
  ctx.globalAlpha = alpha;
  drawMatter();
  const [cx, cy] = orbitCenter();
  ctx.strokeStyle = INK + '0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const R = Math.min(W, H) * 0.36;
    i ? ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  ctx.stroke();
  drawIdentity(Math.min(W, H) * (0.21 + 0.02 * Math.sin(t * 0.8)), cx, cy);
  for (const n of nodeRing()) {
    const hot = hovered === n.id;
    drawNodeGlyph(n.glyph, n.x, n.y, hot ? 13 : 9, hot);
  }
  ctx.globalAlpha = 1;
}

function drawExit(alpha) {
  ctx.globalAlpha = alpha;
  const x = 26, y = 26;
  ctx.strokeStyle = INK + '0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 12); ctx.moveTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ripple */
let nextRing = 0;
function drawRipple(a) {
  ctx.globalAlpha = a;
  drawMatter();
  const [cx, cy] = orbitCenter();
  if (t > nextRing && !reduced) {
    nextRing = t + 1.5;
    rings.push({ x: cx, y: cy, r: 8, v: 130 + Math.random() * 60, life: 1, hot: Math.random() < 0.3 });
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const g = rings[i];
    g.r += g.v * (1 / 60);
    g.life -= (0.12 + (g.r / (Math.max(W, H) * 0.9)) * 0.6) * (1 / 60) * 1.4;
    if (g.life <= 0 || g.r > Math.max(W, H) * 0.9) { rings.splice(i, 1); continue; }
    ctx.strokeStyle = (g.hot ? LIFE : INK) + (g.life * 0.8) + ')';
    ctx.lineWidth = g.hot ? 1.8 : 1.2;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
  }
  // motes orbiting center
  for (let i = 0; i < 26; i++) {
    const rr = 40 + ((i * 97) % 200) + Math.sin(t + i) * 12;
    const aa = t * (0.2 + (i % 5) * 0.06) * (i % 2 ? 1 : -1) + i;
    ctx.fillStyle = (i % 6 === 0 ? LIFE : INK) + '0.7)';
    ctx.fillRect(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.62, 2.5, 2.5);
  }
  drawExit(a);
  ctx.globalAlpha = 1;
}

/* matrix */
function drawMatrix(a) {
  ctx.globalAlpha = a;
  const S = Math.min(W, H) * 0.085, gap = S * 0.42;
  const ox = W / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
  const oy = H / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
  for (let i = 0; i < M_N * M_N; i++) {
    const r = Math.floor(i / M_N), c = i % M_N;
    const x = ox + c * (S + gap), y = oy + r * (S + gap);
    const hot = hovered === 'matrix-' + i;
    ctx.strokeStyle = hot ? LIFE + '1)' : INK + '0.4)';
    ctx.lineWidth = hot ? 1.8 : 1;
    if (hot) { ctx.shadowColor = LIFE + '0.8)'; ctx.shadowBlur = 14; }
    ctx.strokeRect(x - S / 2, y - S / 2, S, S);
    ctx.shadowBlur = 0;
    ctx.save(); ctx.translate(x, y); sigil(i * 977 + mGen[i] * 131, S * 0.62); ctx.restore();
  }
  // shuffle waves
  for (let i = mWave.length - 1; i >= 0; i--) {
    const wv = mWave[i];
    wv.r += 480 * (1 / 60);
    if (wv.r > Math.max(W, H)) { mWave.splice(i, 1); continue; }
    ctx.strokeStyle = LIFE + (0.5 * (1 - wv.r / Math.max(W, H))) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2); ctx.stroke();
  }
  drawExit(a);
  ctx.globalAlpha = 1;
}

/* rain */
function drawRain(a, dt) {
  if (a > 0.99) {
    ctx.fillStyle = 'rgba(5, 7, 10, 0.16)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#05070a';
    ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a;
  }
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (const c of cols) {
    const near = px >= 0 && Math.abs(c.x - px) < 130;
    if (!reduced) c.y += c.sp * (near ? 2.4 : 1) * dt;
    if (c.y - c.len * 18 > H) {
      c.y = -Math.random() * 200;
      c.sp = 90 + Math.random() * 160;
      c.chars = c.chars.map(() => Math.floor(Math.random() * 10));
    }
    for (let k = 0; k < c.len; k++) {
      const y = c.y - k * 18;
      if (y < -20 || y > H + 20) continue;
      const close = near && Math.abs(y - py) < 160;
      const alpha = k === 0 ? 0.95 : Math.max(0, 0.5 * (1 - k / c.len));
      if (alpha <= 0.02) continue;
      ctx.fillStyle = (k === 0 ? 'rgba(230, 255, 246, ' : close ? LIFE : INK) + alpha + ')';
      ctx.fillText(String(c.chars[k]), c.x, y);
    }
  }
  // splashes
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.x += d.vx * (1 / 60); d.y += d.vy * (1 / 60); d.vy += 220 * (1 / 60); d.life -= 0.02;
    if (d.life <= 0) { drops.splice(i, 1); continue; }
    ctx.fillStyle = LIFE + d.life + ')';
    ctx.fillText(d.ch, d.x, d.y);
  }
  drawExit(a);
  ctx.globalAlpha = 1;
}

function drawContact(a) {
  ctx.globalAlpha = a;
  contactsEl.classList.add('show');
  const R = Math.min(W, H) * 0.3;
  const p = (t * 0.6) % 1;
  ctx.strokeStyle = INK + (0.16 * (1 - p)) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, R + 70 + p * 30, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = INK + '0.12)';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, R + 70, 0, Math.PI * 2); ctx.stroke();
  drawExit(a);
  ctx.globalAlpha = 1;
}

/* ---------- main loop ---------- */
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (cols.length) initCols();
}
resize();
addEventListener('resize', resize);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  t += dt;

  if (!down) {
    spinY += velY * dt; spinX += velX * dt;
    velY += (0.30 - velY) * dt * 0.5;   // relax to idle spin
    velX += (0.10 - velX) * dt * 0.5;
  }

  morph = Math.min(1, morph + dt * 2.4);
  const ease = morph * morph * (3 - 2 * morph);

  // hover is recomputed every frame from the tracked pointer —
  // nodes rotate, so event-time hit tests always lag behind
  hovered = (scene === 'orbit' || scene === 'matrix') ? hitTest(px, py) : null;
  cv.style.cursor = down && dragDist > 6 ? 'grabbing' : hovered ? 'pointer' : 'crosshair';

  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);

  if (scene === 'orbit') drawOrbit(1);
  else {
    drawOrbit(1 - ease);
    ctx.save();
    if (scene === 'ripple') drawRipple(ease);
    if (scene === 'matrix') drawMatrix(ease);
    if (scene === 'rain') drawRain(ease, dt);
    if (scene === 'contact') drawContact(ease);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}

/* ---------- pointer: track, drag-spin, click ---------- */
function setPointer(e) { px = e.clientX; py = e.clientY; }

addEventListener('pointermove', e => {
  if (down && scene === 'orbit') {
    spinY += e.movementX * 0.005;
    spinX += e.movementY * 0.005;
    velY = e.movementX * 0.12;
    velX = e.movementY * 0.12;
    dragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
  }
  setPointer(e);
});
addEventListener('pointerdown', e => { down = true; dragDist = 0; setPointer(e); });
addEventListener('pointerup', e => { down = false; setPointer(e); });
addEventListener('pointerleave', () => { px = -1; py = -1; });

function exitToOrbit() {
  scene = 'orbit'; morph = 0;
  contactsEl.classList.remove('show');
  rings.length = 0; mWave.length = 0; drops.length = 0;
}

addEventListener('click', e => {
  if (e.target.closest('#contacts')) return;
  if (dragDist > 6) return; // that was a spin, not a click
  const hit = hitTest(e.clientX, e.clientY);
  if (scene === 'orbit') {
    if (hit && NODES.some(n => n.id === hit)) { scene = hit; morph = 0; if (scene === 'rain') initCols(); }
    return;
  }
  // chapters: ✕ corner exits
  if (e.clientX < 60 && e.clientY < 60) { exitToOrbit(); return; }
  if (scene === 'matrix' && hit && hit.startsWith('matrix-')) {
    const i = +hit.split('-')[1];
    mGen[i]++;
    const S = Math.min(W, H) * 0.085, gap = S * 0.42;
    const ox = W / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
    const oy = H / 2 - (M_N * S + (M_N - 1) * gap) / 2 + S / 2;
    const r = Math.floor(i / M_N), c = i % M_N;
    mWave.push({ x: ox + c * (S + gap), y: oy + r * (S + gap), r: 8 });
    return;
  }
  if (scene === 'ripple') {
    rings.push({ x: e.clientX, y: e.clientY, r: 6, v: 160, life: 1, hot: true });
    return;
  }
  if (scene === 'rain') {
    for (let k = 0; k < 22; k++) {
      drops.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 340,
        vy: -120 - Math.random() * 220,
        life: 0.8 + Math.random() * 0.4,
        ch: String(Math.floor(Math.random() * 10)),
      });
    }
    return;
  }
});

addEventListener('keydown', e => { if (e.key === 'Escape' && scene !== 'orbit') exitToOrbit(); });

/* contact sigils — real links, no captions */
contactsEl.innerHTML = `
  <a href="mailto:thegrushor@gmail.com" aria-label="email">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="10" y="20" width="52" height="34"/><path d="M10 22 L36 44 L62 22"/>
    </svg></a>
  <a href="https://t.me/Grushor" aria-label="telegram" rel="noopener">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M58 14 L12 32 L26 38 L30 54 L38 44 L50 52 Z"/><path d="M26 38 L50 20"/>
    </svg></a>
  <a href="https://github.com/Grshor" aria-label="github" rel="noopener">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="36" cy="36" r="24"/><path d="M24 40c8 6 16 6 24 0M28 30h.5M44 30h.5"/>
    </svg></a>`;

requestAnimationFrame(frame);

// test hook
window.__rebus = { nodes: nodeRing, hitTest, scene: () => scene };

// REBUS — a portfolio with the words removed. Symbols, digits, associations.
// Orbit of chapter-nodes around an icosahedron-identity; every glyph decodes
// on hover. ⌖ or [H] pins the hints.
'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');
const contactsEl = document.getElementById('contacts');
const toggleBtn = document.getElementById('toggle');

const INK = 'rgba(140, 245, 214, ';   // structure
const LIFE = 'rgba(255, 92, 138, ';   // live signal
const DIM = 'rgba(120, 160, 150, ';   // background matter

let W = 0, H = 0, DPR = 1;
let t = 0, last = performance.now();
let px = 0, py = 0, vx = 0, vy = 0;          // parallax
let scene = 'orbit';                          // orbit | chronicle | stack | proof | contact
let morph = 0;                                // 0..1 enter animation
let hovered = null;
let labels = false;                           // pinned hints
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- geometry ---------- */
const PHI = (1 + Math.sqrt(5)) / 2;
const V = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(v => v.map(x => x / Math.hypot(1, PHI)));
const E = [];
const EDGE = 2 / Math.sqrt(1 + PHI * PHI); // edge length after vertex normalization
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

/* ---------- chapters ---------- */
const NODES = [
  { id: 'identity',   word: 'nikita makarichev · go',       glyph: 'diamond' },
  { id: 'chronicle',  word: '2021 → now',                   glyph: 'line' },
  { id: 'stack',      word: 'tools',                        glyph: 'grid' },
  { id: 'proof',      word: 'load',                         glyph: 'pulse' },
  { id: 'contact',    word: 'reach',                        glyph: 'link' },
];

const STACK = [
  'go', 'kafka', 'postgres', 'eventstore', 'redis',
  'k8s', 'grpc', 'cqrs', 'ddd', 'otel',
  'docker', 'linux', 'jaeger', 'mongo', 'solid',
];

// deterministic sigil per cell
function sigil(i, s) { // draws into ctx centered at 0,0 size s
  let seed = (i * 2654435761) >>> 0;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1000) / 1000; };
  const n = 2 + Math.floor(rnd() * 2);
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

/* ---------- helpers ---------- */
function poly(pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (close) ctx.closePath();
  ctx.stroke();
}
function word(x, y, s, color = 'rgba(158,247,221,.9)') {
  ctx.fillStyle = color;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(s, x, y);
}
function setHint(txt) {
  hintEl.textContent = txt;
  hintEl.style.left = (px + 18) + 'px';
  hintEl.style.top = (py + 18) + 'px';
  hintEl.classList.add('on');
}
function clearHint() { hintEl.classList.remove('on'); }

/* ---------- scenes ---------- */
function orbitCenter() { return [W / 2 + vx * 30, H / 2 + vy * 30]; }

function drawIdentity(s, cx, cy) {
  const ry = t * 0.32, rx = t * 0.21;
  const pts = V.map(v => proj(rot(v, ry, rx), s, cx, cy));
  for (const [a, b] of E) {
    const z = (pts[a][2] + pts[b][2]) / 2;             // -1..1 depth
    const alpha = 0.28 + (z + 1) * 0.3;
    ctx.strokeStyle = INK + alpha + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke();
  }
  // monogram core
  ctx.strokeStyle = INK + '0.9)';
  ctx.lineWidth = 1.6;
  const k = s * 0.22;
  poly([[cx - k, cy + k], [cx - k, cy - k], [cx + k * 0.65, cy + k]], false);   // N-ish stroke
  ctx.beginPath(); ctx.moveTo(cx + k * 1.1, cy - k); ctx.lineTo(cx + k * 1.1, cy + k); ctx.stroke();
}

function nodeRing(cx, cy) {
  const R = Math.min(W, H) * 0.36;
  return NODES.map((n, i) => {
    const a = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2 + t * 0.05;
    return { ...n, x: cx + Math.cos(a) * R * (1 + vy * 0.06), y: cy + Math.sin(a) * R * (1 + vx * 0.06), a };
  });
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

function drawOrbit(alpha) {
  const [cx, cy] = orbitCenter();
  ctx.globalAlpha = alpha;
  // drifting matter
  for (let i = 0; i < 60; i++) {
    const sd = Math.sin(i * 127.1) * 43758.5453;
    const x = ((sd - Math.floor(sd)) * W + t * (6 + (i % 5) * 4) + vx * 20) % (W + 40) - 20;
    const y = (Math.sin(i * 311.7) * 43758.5453); const yr = (y - Math.floor(y)) * H;
    ctx.fillStyle = DIM + (0.06 + (i % 4) * 0.04) + ')';
    ctx.fillRect(x, yr, 2, 2);
  }
  // ring
  ctx.strokeStyle = INK + '0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const R = Math.min(W, H) * 0.36;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  drawIdentity(Math.min(W, H) * 0.21, cx, cy);

  for (const n of nodeRing(cx, cy)) {
    const hot = hovered === n.id;
    const r = hot ? 13 : 9;
    drawNodeGlyph(n.glyph, n.x, n.y, r, hot);
    if (labels && !hot) word(n.x, n.y - r - 8, n.word, 'rgba(158,247,221,.55)');
  }
  ctx.globalAlpha = 1;
}

function chromeTitle(txt) { // chapter sigil top-left, minimal
  word(W / 2, H - 40, txt, 'rgba(158,247,221,.35)');
}

function drawChronicle(a) {
  ctx.globalAlpha = a;
  const y = H / 2, x0 = W * 0.14, x1 = W * 0.86;
  ctx.strokeStyle = INK + '0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const marks = [
    { d: '21', w: 'nifi · dashboards' },
    { d: '22', w: 'black wall · bank core' },
    { d: '24', w: 'kangaroo · lead' },
    { d: '25', w: 'sber · real-time' },
  ];
  marks.forEach((m, idx) => {
    const f = 0.06 + 0.88 * (idx / (marks.length - 1));
    const x = x0 + (x1 - x0) * f;
    const hot = hovered === 'chronicle-' + m.d;
    ctx.strokeStyle = hot ? LIFE + '1)' : INK + '0.8)';
    ctx.beginPath(); ctx.arc(x, y, hot ? 9 : 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = INK + '0.85)';
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(m.d, x, y - 16);
    if (hot || labels) word(x, y + 26, m.w);
  });
  // "now" — live end
  const p = (t * 0.6) % 1;
  ctx.strokeStyle = LIFE + (1 - p) + ')';
  ctx.beginPath(); ctx.arc(x1, y, 5 + p * 16, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = LIFE + '0.95)';
  ctx.beginPath(); ctx.arc(x1, y, 4, 0, Math.PI * 2); ctx.stroke();
  if (labels) word(x1, y + 26, 'now · open to work');
  chromeTitle('· — · — ·');
  ctx.globalAlpha = 1;
}

function drawStack(a) {
  ctx.globalAlpha = a;
  const N = 5, S = Math.min(W, H) * 0.085, gap = S * 0.42;
  const ox = W / 2 - (N * S + (N - 1) * gap) / 2 + S / 2;
  const oy = H / 2 - (N * S + (N - 1) * gap) / 2 + S / 2;
  for (let i = 0; i < STACK.length; i++) {
    const r = Math.floor(i / N), c = i % N;
    const x = ox + c * (S + gap), y = oy + r * (S + gap);
    const id = 'stack-' + i;
    const hot = hovered === id;
    ctx.strokeStyle = hot ? LIFE + '1)' : INK + '0.4)';
    ctx.lineWidth = hot ? 1.8 : 1;
    ctx.strokeRect(x - S / 2, y - S / 2, S, S);
    ctx.save(); ctx.translate(x, y); sigil(i, S * 0.62); ctx.restore();
    if (hot || labels) word(x, y + S / 2 + 14, STACK[i], hot ? 'rgba(255,140,170,.95)' : 'rgba(158,247,221,.5)');
  }
  chromeTitle('⌗ ⌗ ⌗');
  ctx.globalAlpha = 1;
}

function drawProof(a) {
  ctx.globalAlpha = a;
  const items = [
    { v: 5000, suf: '/s', w: 'peak events — kafka ingest' },
    { v: 10000, suf: '/m', w: 'transactions — bank backbone' },
    { v: 40000, suf: '+', w: 'catalog categories' },
    { v: 50, suf: '+', w: 'rbac roles' },
  ];
  const fs = Math.min(W, H) * 0.11;
  items.forEach((it, i) => {
    const x = W / 2, y = H * (0.22 + i * 0.19);
    const id = 'proof-' + i;
    const hot = hovered === id;
    ctx.fillStyle = hot ? 'rgba(255,140,170,.95)' : INK + '0.85)';
    ctx.font = `500 ${fs}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    const wob = Math.sin(t * 2 + i) * (hot ? 3 : 0);
    ctx.fillText(it.v.toLocaleString('en-US') + it.suf, x, y + wob);
    if (hot || labels) word(x, y + 16, it.w);
  });
  chromeTitle('↑ ↑ ↑ ↑');
  ctx.globalAlpha = 1;
}

function drawContact(a) {
  ctx.globalAlpha = a;
  contactsEl.classList.add('show');
  const R = Math.min(W, H) * 0.3;
  ctx.strokeStyle = INK + '0.18)';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, R + 70, 0, Math.PI * 2); ctx.stroke();
  chromeTitle('⊕ ⊕ ⊕');
  ctx.globalAlpha = 1;
}

/* ---------- main loop ---------- */
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resize();
addEventListener('resize', resize);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  t += dt;
  vx += ((px / W - 0.5) * 2 - vx) * 0.06;
  vy += ((py / H - 0.5) * 2 - vy) * 0.06;

  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);

  morph = Math.min(1, morph + dt * 2.4);
  const ease = morph * morph * (3 - 2 * morph);

  if (scene === 'orbit') drawOrbit(1);
  else {
    drawOrbit(1 - ease);
    ctx.save();
    if (scene === 'chronicle') drawChronicle(ease);
    if (scene === 'stack') drawStack(ease);
    if (scene === 'proof') drawProof(ease);
    if (scene === 'contact') drawContact(ease);
    ctx.restore();
    if (scene !== 'contact') { // exit glyph
      ctx.strokeStyle = INK + '0.5)';
      const x = 26, y = 26;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 12); ctx.moveTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.stroke();
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- pointer / hit testing ---------- */
function hitTest(x, y) {
  if (scene === 'orbit') {
    const [cx, cy] = orbitCenter();
    for (const n of nodeRing(cx, cy)) {
      if (Math.hypot(x - n.x, y - n.y) < 26) return n.id;
    }
    // identity → nowhere; ESC via polyhedron click
    if (Math.hypot(x - cx, y - cy) < Math.min(W, H) * 0.22) return 'identity';
  }
  if (scene === 'chronicle') {
    const y0 = H / 2, x0 = W * 0.14, x1 = W * 0.86;
    const marks = [['21', 0.02], ['22', 0.36], ['24', 0.62], ['25', 0.86]];
    for (const [d, f] of marks) {
      const mx = x0 + (x1 - x0) * (0.1 + f);
      if (Math.hypot(x - mx, y - y0) < 22) return 'chronicle-' + d;
    }
  }
  if (scene === 'stack') {
    const N = 5, S = Math.min(W, H) * 0.085, gap = S * 0.42;
    const ox = W / 2 - (N * S + (N - 1) * gap) / 2 + S / 2;
    const oy = H / 2 - (N * S + (N - 1) * gap) / 2 + S / 2;
    for (let i = 0; i < STACK.length; i++) {
      const r = Math.floor(i / N), c = i % N;
      const sx = ox + c * (S + gap), sy = oy + r * (S + gap);
      if (Math.abs(x - sx) < S / 2 + 4 && Math.abs(y - sy) < S / 2 + 4) return 'stack-' + i;
    }
  }
  if (scene === 'proof') {
    for (let i = 0; i < 4; i++) {
      const yy = H * (0.22 + i * 0.19);
      if (Math.abs(x - W / 2) < W * 0.3 && Math.abs(y - yy) < H * 0.08) return 'proof-' + i;
    }
  }
  return null;
}

const WORDS = Object.fromEntries([
  ['identity', '← back'],
  ...NODES.map(n => [n.id, n.word]),
  ['chronicle-21', 'nifi 2021 · dashboards'], ['chronicle-22', 'black wall 2022 · 10k txn/min'],
  ['chronicle-24', 'kangaroo 2024 · team lead'], ['chronicle-25', 'sber 2025 · 5k events/s'],
  ...STACK.map((s, i) => ['stack-' + i, s]),
  ['proof-0', 'peak events/sec — sber'], ['proof-1', 'txn/min — black wall'],
  ['proof-2', 'categories — kangaroo'], ['proof-3', 'rbac roles — black wall'],
]);

addEventListener('pointermove', e => {
  px = e.clientX; py = e.clientY;
  if (scene === 'contact') { hovered = null; clearHint(); return; }
  hovered = hitTest(px, py);
  if (hovered && WORDS[hovered]) setHint(WORDS[hovered]); else clearHint();
  cv.style.cursor = hovered ? 'pointer' : 'crosshair';
});

addEventListener('click', e => {
  if (e.target.closest('#contacts') || e.target.closest('#toggle')) return;
  const hit = hitTest(e.clientX, e.clientY);
  if (scene === 'orbit') {
    if (hit && NODES.some(n => n.id === hit)) { scene = hit; morph = 0; hovered = null; }
  } else {
    if (!hit || hit === 'identity' || e.clientX < 60 && e.clientY < 60) {
      scene = 'orbit'; morph = 0; contactsEl.classList.remove('show'); hovered = null;
    }
  }
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && scene !== 'orbit') { scene = 'orbit'; morph = 0; contactsEl.classList.remove('show'); }
  if (e.key.toLowerCase() === 'h') toggle();
});
function toggle() {
  labels = !labels;
  document.body.classList.toggle('labels', labels);
  toggleBtn.classList.toggle('on', labels);
  hintEl.classList.toggle('on', labels && !!hovered);
}
toggleBtn.addEventListener('click', toggle);

// debug/test hook: ring rotates, tests need live coordinates
window.__rebus = {
  nodes: () => nodeRing(W / 2 + vx * 30, H / 2 + vy * 30),
  hitTest,
  scene: () => scene,
};

/* contact sigils */
contactsEl.innerHTML = `
  <a href="mailto:thegrushor@gmail.com" data-w="email" aria-label="email" title="email">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="10" y="20" width="52" height="34"/><path d="M10 22 L36 44 L62 22"/>
    </svg></a>
  <a href="https://t.me/Grushor" data-w="telegram" aria-label="telegram" rel="noopener" title="telegram">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M58 14 L12 32 L26 38 L30 54 L38 44 L50 52 Z"/><path d="M26 38 L50 20"/>
    </svg></a>
  <a href="https://github.com/Grshor" data-w="github" aria-label="github" rel="noopener" title="github">
    <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="36" cy="36" r="24"/><path d="M24 40c8 6 16 6 24 0M28 30h.5M44 30h.5"/>
    </svg></a>`;

requestAnimationFrame(frame);

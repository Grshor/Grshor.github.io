// Global page behaviour: dither textures, live counters, glider, repo sync.
import { initHeroText } from './hero-text.js';

const INK = '#1e1e1e';

/* ---------- 1-bit dithered decor (Bayer 4x4 ordered dithering) ---------- */

const BAYER = [
  [15,  8, 14,  2],
  [ 0, 12,  3, 11],
  [10,  6,  9,  5],
  [ 1,  7, 13,  4],
].map(row => row.map(v => (v + 0.5) / 16));

function ditherDataURL(size, dotColor, falloff = 1.0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  const maxR = half;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / maxR, dy = (y - half) / maxR;
      let v = 1 - Math.min(1, Math.hypot(dx, dy) * falloff); // 1 center → 0 edge
      v = Math.pow(Math.max(0, v), 0.75);
      const on = v > BAYER[y & 3][x & 3];
      const i = (y * size + x) * 4;
      if (on) {
        img.data[i] = parseInt(dotColor.slice(1, 3), 16);
        img.data[i + 1] = parseInt(dotColor.slice(3, 5), 16);
        img.data[i + 2] = parseInt(dotColor.slice(5, 7), 16);
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

function addDecor(section, url, side, size, opacity) {
  const el = document.createElement('div');
  el.className = 'dither-decor';
  el.style.cssText = `width:${size}px;height:${size}px;${side};opacity:${opacity};` +
    `background:url(${url}) center/contain no-repeat;`;
  section.appendChild(el);
}

function initDecor() {
  const pink = document.querySelector('.sec--pink');
  const black = document.querySelector('.sec--black');
  const contact = document.getElementById('contact');
  if (pink) {
    addDecor(pink, ditherDataURL(560, INK, 1.15), 'top:-160px;right:-120px', 560, 0.5);
    addDecor(pink, ditherDataURL(420, INK, 1.3), 'bottom:-140px;left:-110px', 420, 0.35);
  }
  if (black) {
    addDecor(black, ditherDataURL(520, '#f386a1', 1.2), 'top:-150px;right:-140px', 520, 0.22);
  }
  if (contact) {
    addDecor(contact, ditherDataURL(460, '#d45bb6', 1.25), 'bottom:-120px;right:8%', 460, 0.25);
  }
}

/* ---------- live-ish counters (targets are real resume numbers) ---------- */

function initCounters() {
  const ev = document.getElementById('stat-events');
  const tx = document.getElementById('stat-txn');
  if (!ev || !tx) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let e = 5000, t = 10000;
  setInterval(() => {
    e = Math.min(5120, Math.max(4880, e + Math.round((Math.random() - 0.5) * 90)));
    t = Math.min(10180, Math.max(9860, t + Math.round((Math.random() - 0.5) * 160)));
    ev.textContent = e.toLocaleString('en-US');
    tx.textContent = t.toLocaleString('en-US');
  }, 900);
}

/* ---------- glider 1.1 (Conway, torus) ---------- */

function initGlider() {
  const cv = document.getElementById('glider');
  if (!cv) return;
  const n = 12, cell = 4; // 48x48
  const grid = Array.from({ length: n }, () => new Array(n).fill(0));
  // glider
  [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([x, y]) => { grid[y][x] = 1; });
  const ctx = cv.getContext('2d');
  const draw = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = INK;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (grid[y][x]) ctx.fillRect(x * cell, y * cell, cell, cell);
  };
  const step = () => {
    const next = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let alive = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) alive += grid[(y + dy + n) % n][(x + dx + n) % n];
        next[y][x] = grid[y][x] ? (alive === 2 || alive === 3 ? 1 : 0) : (alive === 3 ? 1 : 0);
      }
    for (let y = 0; y < n; y++) grid[y] = next[y];
  };
  draw();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => { step(); draw(); }, 420);
}

/* ---------- repo metadata sync (progressive enhancement) ---------- */

async function syncRepos() {
  const cells = document.querySelectorAll('.repo-list [data-updated]');
  if (!cells.length) return;
  const note = document.getElementById('repos-note');
  try {
    const res = await fetch('https://api.github.com/users/Grshor/repos?per_page=100', {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    const repos = await res.json();
    const byName = new Map(repos.map(r => [r.name.toLowerCase(), r]));
    for (const cell of cells) {
      const name = cell.parentElement.querySelector('a')?.textContent.trim().toLowerCase();
      const repo = name && byName.get(name);
      if (repo) {
        const d = new Date(repo.pushed_at);
        cell.textContent = '↑ ' + d.toISOString().slice(0, 10) +
          (repo.stargazers_count ? ` · ★${repo.stargazers_count}` : '');
      } else {
        cell.textContent = '';
      }
    }
  } catch {
    if (note) note.textContent = '// curated snapshot · live sync unavailable';
  }
}

/* ---------- boot ---------- */

initDecor();
initCounters();
initGlider();
initHeroText();
document.addEventListener('htmx:afterSettle', () => { syncRepos(); }, { once: false });

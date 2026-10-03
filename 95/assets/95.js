// NikitaOS 95 — window manager, pixel icons, taskbar. Vanilla, no deps.
'use strict';

/* ---------- pixel icon renderer ---------- */
const PAL = { k:'#000', w:'#fff', g:'#808080', s:'#c0c0c0', n:'#000080', b:'#1084d0',
              y:'#ffd800', o:'#a08000', r:'#e00000', f:'#0020c0', h:'#00a040', c:'#00c0c0' };
const ICONS = {
  computer: [
    "..kkkkkkkk..",
    ".knnnnnnnnk.",
    ".knnnnnnnnk.",
    ".knwnnnnnnk.",
    ".knnnnnnnnk.",
    "..kkkkkkkk..",
    "..kssssssk..",
    ".ksssssssks.",
    ".kssssssssk.",
    ".kkkkkkkkkk.",
  ],
  folder: [
    ".kkkkk......",
    "kyyyyyk.....",
    "kyyyyykkkkk.",
    "kyyyyyyyyyk.",
    "kyyyyyyyyyk.",
    "kyyyyyyyyyk.",
    "kyyyyyyyyyk.",
    "kyyyyyyyyyk.",
    ".kkkkkkkkk..",
  ],
  doc: [
    "..kkkkkkk..",
    ".kwwwwwwwkk",
    ".kwwwwwwwwk",
    ".kwkkkkwwwk",
    ".kwwwwwwwwk",
    ".kwkkkkkkwk",
    ".kwwwwwwwwk",
    ".kwkkkkwwwk",
    ".kwwwwwwwwk",
    ".kkkkkkkkkk",
  ],
  mail: [
    "kkkkkkkkkkkk",
    "kwwwwwwwwwwk",
    "kwkwwwwwwkwk",
    "kwwkwwwwkwwk",
    "kwwwkwwkwwwk",
    "kwwwwkkwwwwk",
    "kwwwwwwwwwwk",
    "kkkkkkkkkkkk",
  ],
  disk: [
    "kkkkkkkkkkkk",
    "knnnnnnnnnnk",
    "knnkkkkkknnk",
    "knnkkkkkknnk",
    "knnnnnnnnnnk",
    "kwwwwwwwwwwk",
    "kwkkkkkkkkwk",
    "kwwwwwwwwwwk",
    "kkkkkkkkkkkk",
  ],
  help: [
    "kkkkkkkkkkkk",
    "knnnnnnnnnnk",
    "knnnnwwwnnnk",
    "knnnwnnnwnnk",
    "knnnnnnwnnnk",
    "knnnnnwnnnnk",
    "knnnnnwnnnnk",
    "knnnnnnnnnnk",
    "knnnnnwnnnnk",
    "kkkkkkkkkkkk",
  ],
  flag: [
    "..krrryyy...",
    ".kkrrryyy...",
    ".kkfffhhh...",
    ".kkfffhhh...",
    ".kk.........",
  ],
  warning: [
    ".....kk.....",
    "....kyyk....",
    "....kyyk....",
    "...kyyyyk...",
    "...kykkyk...",
    "..kyyyyyyk..",
    "..kyykkyyk..",
    ".kyyykkyyyk.",
    ".kyyyyyyyyk.",
    "kkkkkkkkkkkk",
  ],
  bin: [
    "...kkkkkk...",
    "..kwwwwwwk..",
    ".kwwwwwwwwk.",
    ".kwkwwwwkwk.",
    ".kwkwwwwkwk.",
    ".kwkwwwwkwk.",
    ".kwwwwwwwwk.",
    "..kkkkkkkk..",
  ],
};

function renderPix(el) {
  const name = el.dataset.icon;
  const map = ICONS[name];
  if (!map) return;
  const s = parseInt(el.dataset.scale || '2', 10);
  const w = map[0].length, h = map.length;
  const parts = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = map[y][x];
      if (ch !== '.') parts.push(`${x * s}px ${y * s}px 0 0 ${PAL[ch]}`);
    }
  el.style.width = w * s + 'px';
  el.style.height = h * s + 'px';
  el.style.setProperty('--sh', parts.join(','));
  el.style.setProperty('--s', s + 'px');
}
document.querySelectorAll('.pix').forEach(renderPix);

/* ---------- window manager ---------- */
let zTop = 100;
const desktop = document.getElementById('desktop');
const taskapps = document.getElementById('taskapps');
const isMobile = matchMedia('(max-width: 700px)').matches;

function activate(win) {
  document.querySelectorAll('.win').forEach(w => w.classList.toggle('active', w === win));
  win.style.zIndex = ++zTop;
  document.querySelectorAll('.taskapp').forEach(b =>
    b.classList.toggle('open', b.dataset.app === win.dataset.app && !win.classList.contains('minimized')));
}

function makeTaskButton(win) {
  const b = document.createElement('button');
  b.className = 'taskapp';
  b.dataset.app = win.dataset.app;
  const ico = document.createElement('span');
  ico.className = 'pix';
  ico.dataset.icon = win.querySelector('.t-ico').dataset.icon;
  ico.dataset.scale = '1';
  renderPix(ico);
  const lbl = document.createElement('span');
  lbl.textContent = win.querySelector('.t-text').textContent;
  b.append(ico, lbl);
  b.addEventListener('click', () => {
    if (win.classList.contains('minimized')) { win.classList.remove('minimized'); activate(win); }
    else if (win.classList.contains('active')) { win.classList.add('minimized'); activate(win); win.classList.remove('active'); }
    else activate(win);
  });
  taskapps.appendChild(b);
}

const wins = document.querySelectorAll('.win');
wins.forEach(w => { makeTaskButton(w); w.addEventListener('mousedown', () => activate(w)); });
activate(wins[0]);

if (!isMobile) {
  document.querySelectorAll('.tbar').forEach(bar => {
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.tbtn')) return;
      const win = bar.closest('.win');
      const rect = win.getBoundingClientRect();
      const dx = e.clientX - rect.left, dy = e.clientY - rect.top;
      const move = ev => {
        win.style.left = Math.max(-rect.width + 60, Math.min(innerWidth - 40, ev.clientX - dx)) + 'px';
        win.style.top = Math.max(0, Math.min(innerHeight - 60, ev.clientY - dy)) + 'px';
      };
      const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
  });
}

document.querySelectorAll('.tbtn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const win = btn.closest('.win');
    const act = btn.dataset.act;
    if (act === 'min') { win.classList.add('minimized'); win.classList.remove('active'); }
    if (act === 'max') win.classList.toggle('maxed');
    if (act === 'close') { win.classList.add('minimized'); win.classList.remove('active'); }
    document.querySelectorAll('.taskapp').forEach(b =>
      b.classList.toggle('open', b.dataset.app === win.dataset.app && !win.classList.contains('minimized')));
  });
});

/* ---------- desktop icons ---------- */
const ICON_DEFS = [
  { icon: 'computer', label: 'My Career', app: 'props', x: 16, y: 16 },
  { icon: 'folder', label: 'experience', app: 'experience', x: 16, y: 110 },
  { icon: 'disk', label: 'skills.sys', app: 'skills', x: 16, y: 204 },
  { icon: 'mail', label: 'contact.msg', app: 'contact', x: 16, y: 298 },
  { icon: 'help', label: 'faq.hlp', app: 'faq', x: 16, y: 392 },
  { icon: 'bin', label: 'Recycle Bin', app: null, x: 16, y: 486 },
];
const dsk = document.getElementById('desktop');
for (const d of ICON_DEFS) {
  const el = document.createElement('div');
  el.className = 'dicon';
  el.style.left = d.x + 'px'; el.style.top = d.y + 'px';
  el.innerHTML = `<span class="pix" data-icon="${d.icon}" data-scale="4"></span><span class="lbl">${d.label}</span>`;
  renderPix(el.querySelector('.pix'));
  if (d.app) {
    el.addEventListener('click', () => {
      document.querySelectorAll('.dicon').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
    });
    el.addEventListener('dblclick', () => {
      const win = document.querySelector(`.win[data-app="${d.app}"]`);
      win.classList.remove('minimized'); activate(win);
    });
  }
  dsk.appendChild(el);
}
dsk.addEventListener('click', e => {
  if (e.target === dsk) document.querySelectorAll('.dicon').forEach(i => i.classList.remove('selected'));
});

/* ---------- folder rows → document windows ---------- */
const DOCS = {
  sber: { title: 'SBER.DOC — Backend Engineer (Go)', icon: 'doc', html: `
    <h3>Sber — fintech, bank · Apr 2025 — present · Moscow</h3>
    <ul>
      <li>Real-time command/event microservices with eventual consistency — peak <b>5,000 events/sec</b>.</li>
      <li>Multi-threaded Kafka importer: topic/handler grouping, rollbacks, at-least-once guarantees.</li>
      <li>Integrations with internal ecosystem vendors (chat, tasks, GigaChat).</li>
      <li>Inter-service communication strategies, architecture, code review.</li>
      <li>Rebuilt task-tracking strategy: separate flows for services vs libraries.</li>
    </ul>` },
  kangaroo: { title: 'KANGAROO.DOC — Senior Go Developer', icon: 'doc', html: `
    <h3>Kangaroo marketplace · Apr 2024 — Apr 2025</h3>
    <ul>
      <li>Led the backend team: planned and scoped product development.</li>
      <li>Codegen system: Go handlers → API docs + Postman collections, always in sync.</li>
      <li>Authn/authz RBAC; listings &amp; reviews with multi-language search and translation.</li>
      <li>Seller dashboard: metrics and order management. Tree catalog, <b>40,000+ categories</b>.</li>
      <li>WebSocket chat + Firebase push; full order pipeline on Stripe.</li>
    </ul>` },
  bwg: { title: 'BLACK_WALL.DOC — Middle Go Developer', icon: 'doc', html: `
    <h3>Black Wall Group — fintech, bank · Jul 2022 — Apr 2024 · Moscow</h3>
    <ul>
      <li>Event-driven microservice architecture for a banking service (Go, PostgreSQL, Kafka, EventStoreDB, Redis) — <b>10,000+ txn/min</b>.</li>
      <li>Funds sharding: lower custody costs, capped blast radius.</li>
      <li>RBAC with granular permissions, <b>50+ roles</b>. Three-way FX exchange, tiered dynamic rates, automatic order book.</li>
      <li>PostgreSQL transaction dissemination tool — deadlocks eliminated.</li>
      <li>Blue-green deploys, zero downtime. Interviews, code review, onboarding docs.</li>
    </ul>` },
  nifi: { title: 'NIFI.DOC — Programmer', icon: 'doc', html: `
    <h3>NIFI · Sep 2021 — Jul 2022 · Moscow</h3>
    <ul>
      <li>Web dashboards on Go and React.js.</li>
      <li>Statistical/financial data processing in Python and NumPy.</li>
      <li>Web scrapers and sentiment statistics pipelines.</li>
    </ul>` },
};

let cascade = 0;
function openDoc(key) {
  const d = DOCS[key];
  if (!d) return;
  const existing = document.querySelector(`.win[data-doc="${key}"]`);
  if (existing) { existing.classList.remove('minimized'); activate(existing); return; }
  const win = document.createElement('div');
  win.className = 'win doc';
  win.dataset.doc = key;
  win.style.cssText = `left:${160 + cascade * 24}px; top:${40 + cascade * 24}px; width:520px; z-index:${++zTop}`;
  cascade = (cascade + 1) % 6;
  win.innerHTML = `<div class="tbar"><span class="pix t-ico" data-icon="${d.icon}" data-scale="2"></span>
    <span class="t-text">${d.title}</span><span class="tbtns">
    <button class="tbtn" data-act="min">_</button><button class="tbtn" data-act="max">□</button><button class="tbtn" data-act="close">✕</button></span></div>
    <div class="wbody">${d.html}</div>`;
  dsk.appendChild(win);
  renderPix(win.querySelector('.t-ico'));
  win.addEventListener('mousedown', () => activate(win));
  win.querySelectorAll('.tbtn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.act === 'close') { win.remove(); document.querySelector(`.taskapp[data-app="doc-${key}"]`)?.remove(); }
    if (b.dataset.act === 'min') { win.classList.add('minimized'); }
  }));
  const tb = document.createElement('button');
  tb.className = 'taskapp open'; tb.dataset.app = 'doc-' + key;
  tb.innerHTML = `<span class="pix" data-icon="doc" data-scale="1"></span><span>${d.title.split(' — ')[0]}</span>`;
  renderPix(tb.querySelector('.pix'));
  tb.addEventListener('click', () => {
    win.classList.toggle('minimized');
    if (!win.classList.contains('minimized')) activate(win);
  });
  taskapps.appendChild(tb);
  activate(win);
}

document.querySelectorAll('.dlist .lrow').forEach(row => {
  row.addEventListener('click', () => {
    row.parentElement.querySelectorAll('.lrow').forEach(r => r.classList.remove('sel'));
    row.classList.add('sel');
  });
  row.addEventListener('dblclick', () => openDoc(row.dataset.doc));
});

/* ---------- menus ---------- */
let openMenu = null;
function closeMenu() { openMenu?.remove(); openMenu = null;
  document.querySelectorAll('.menubar button.open').forEach(b => b.classList.remove('open')); }
function showMenu(anchor, items, upward = false) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'dropdown';
  for (const it of items) {
    if (it.sep) { const s = document.createElement('div'); s.className = 'sep'; m.appendChild(s); continue; }
    const b = document.createElement('button');
    b.textContent = it.label;
    b.addEventListener('click', () => { closeMenu(); it.act(); });
    m.appendChild(b);
  }
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = r.left + 'px';
  if (upward) m.style.bottom = (innerHeight - r.top + 2) + 'px';
  else m.style.top = r.bottom + 'px';
  openMenu = m;
  anchor.classList.add('open');
}
const MENUS = {
  file: () => [
    { label: 'Open career.properties', act: () => { const w = document.querySelector('.win[data-app="props"]'); w.classList.remove('minimized'); activate(w); } },
    { sep: true },
    { label: 'Close', act: () => document.querySelector('.win.active')?.classList.add('minimized') },
  ],
  view: () => [{ label: 'Refresh', act: () => location.reload() }],
  help: () => [{ label: 'About NikitaOS 95…', act: about }],
};
function about() {
  const win = document.createElement('div');
  win.className = 'win'; win.style.cssText = `left:calc(50% - 190px); top:30%; width:380px; z-index:${++zTop}`;
  win.innerHTML = `<div class="tbar"><span class="pix t-ico" data-icon="flag" data-scale="2"></span><span class="t-text">About NikitaOS 95</span>
    <span class="tbtns"><button class="tbtn" data-act="close">✕</button></span></div>
    <div class="wbody" style="text-align:center">
      <p style="margin-bottom:8px"><b>NikitaOS 95</b><br>v5.1 (5 years 1 month in production)</p>
      <p style="margin-bottom:10px">Event-driven backends for money-critical systems.<br>Go · Kafka · PostgreSQL · Kubernetes</p>
      <button class="tbtn" style="width:70px; height:22px; font-weight:700" id="okbtn">OK</button>
    </div>`;
  document.body.appendChild(win);
  renderPix(win.querySelector('.t-ico'));
  win.querySelector('#okbtn').addEventListener('click', () => win.remove());
  win.querySelector('[data-act="close"]').addEventListener('click', () => win.remove());
}
document.querySelectorAll('.menubar button').forEach(b =>
  b.addEventListener('click', e => { e.stopPropagation(); showMenu(b, MENUS[b.dataset.menu]()); }));
document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) closeMenu(); });

/* ---------- start menu ---------- */
const start = document.getElementById('start');
start.addEventListener('click', e => {
  e.stopPropagation();
  if (openMenu) { closeMenu(); return; }
  showMenu(start, [
    { label: 'Programs ▸ experience', act: () => { const w = document.querySelector('.win[data-app="experience"]'); w.classList.remove('minimized'); activate(w); } },
    { label: 'Settings ▸ skills.sys', act: () => { const w = document.querySelector('.win[data-app="skills"]'); w.classList.remove('minimized'); activate(w); } },
    { label: 'Help ▸ faq.hlp', act: () => { const w = document.querySelector('.win[data-app="faq"]'); w.classList.remove('minimized'); activate(w); } },
    { sep: true },
    { label: 'Shut Down…', act: shutdown },
  ], true);
});
function shutdown() {
  const win = document.createElement('div');
  win.className = 'win'; win.style.cssText = `left:calc(50% - 170px); top:32%; width:340px; z-index:${++zTop}`;
  win.innerHTML = `<div class="tbar"><span class="pix t-ico" data-icon="warning" data-scale="2"></span><span class="t-text">Shut Down Windows</span>
    <span class="tbtns"><button class="tbtn" data-act="x">✕</button></span></div>
    <div class="wbody" style="text-align:center">
      <p style="margin-bottom:10px">Are you sure you want to shut down<br>the most productive era of computing?</p>
      <button class="tbtn" style="width:60px; height:22px; font-weight:700" id="yes">Yes</button>
      <button class="tbtn" style="width:60px; height:22px; font-weight:700" id="no">No</button>
    </div>`;
  document.body.appendChild(win);
  renderPix(win.querySelector('.t-ico'));
  win.querySelector('#yes').addEventListener('click', () => {
    win.remove();
    const sc = document.getElementById('shutdown-screen');
    sc.style.display = 'grid';
    sc.addEventListener('click', () => { sc.style.display = 'none'; }, { once: true });
  });
  win.querySelector('#no').addEventListener('click', () => win.remove());
  win.querySelector('[data-act="x"]').addEventListener('click', () => win.remove());
}

/* ---------- clock ---------- */
function tick() {
  const d = new Date();
  document.getElementById('clock').textContent =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
tick(); setInterval(tick, 10000);

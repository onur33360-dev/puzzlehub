#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Seviye Ölçüm Aracı (Ok Bulmaca)
// ═══════════════════════════════════════════════════════════════
// TASARIMIN RESMİ DOĞRULAMA ARACI. Referans seviyeleri de bizim
// seviyelerimiz de AYNI kodla ölçülür; ayrı ölçüm karşılaştırmayı
// anlamsız kılar.
//
// Sıfır bağımlılık: yalnızca Node çekirdeği. Proje build'siz kalır;
// bu betik oyunu ÇALIŞTIRMAZ, sadece motoru okur (bkz. CLAUDE.md §6).
//
// KULLANIM
//   node tools/level-metrics.js                  kendi kampanyamızı ölç
//   node tools/level-metrics.js <dosya.txt>      transkripsiyon ölç
//   node tools/level-metrics.js --ascii <sv>     seviyeyi ASCII bas
//
// TRANSKRİPSİYON BİÇİMİ
//   == LEVEL 3 ==        (başlık; sayı serbest)
//   ...A.....            BÜYÜK harf = yılanın KAFASI (ucu)
//   ...aaa...            küçük harf = gövde,  '.' = boş
//   # K=down             yalnızca GEREKİRSE yön notu (aşağıya bak)
//
// Yön normalde YAZILMAZ, çıkarılır: modelde gövdenin ilk hücresi
// daima ucun tam arkasındadır, yani yön = cells[1] → cells[0].
// Katlanmış yılanlarda (2x2 kare gibi) kafa kendi gövdesine iki
// yerden komşu olur ve yön belirsizleşir — orada "# X=up|right|
// down|left" satırı şarttır. Araç belirsizliği kendi söyler.

'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ───────── Motoru Node'da yükle ─────────
// games.js bir tarayıcı dosyası ama DOM'a yalnızca init() içinde
// dokunuyor; modül seviyesinde stub'lar yetiyor.
function stubEl() {
  return {
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, children: [],
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left:0, top:0, right:0, bottom:0, width:0, height:0 }; },
    focus() {}, blur() {}, cloneNode() { return stubEl(); },
    get innerHTML() { return ''; }, set innerHTML(v) {},
    get textContent() { return ''; }, set textContent(v) {},
  };
}
function loadEngine() {
  const doc = {
    head: stubEl(), body: stubEl(), documentElement: stubEl(),
    createElement: stubEl, createElementNS: stubEl, createTextNode: stubEl,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    visibilityState: 'visible', hidden: false,
  };
  const sb = {
    document: doc,
    navigator: { userAgent: 'node', vibrate() {}, maxTouchPoints: 0 },
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; },
                    setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
    console, Math, Date, JSON, performance: { now: () => Date.now() },
    AudioContext: function () { throw new Error('node: ses yok'); },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    IntersectionObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    ResizeObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  // i18n.js games.js'ten ÖNCE: oyunlar t() çağırıyor. Bu araç yalnızca
  // Ok Bulmaca'nın üretecini ölçüyor ve hiç metin okumuyor, ama t()
  // tanımsız olsaydı games.js değerlendirilirken ReferenceError verirdi.
  for (const rel of ['core/rng.js', 'core/i18n.js', 'locales/en.js', 'games/games.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  }
  // top-level `const` global sözlük kapsamına gider, sandbox nesnesine değil
  return vm.runInContext('PuzzleGames', sb).arrowPuzzle.engine;
}

const E = loadEngine();
const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];       // 0 yukarı 1 sağ 2 aşağı 3 sol
const DIRNAME = ['up', 'right', 'down', 'left'];
const shapeOf = id => E.SHAPES.find(s => s.id === id);
const isStraight = id => {
  const o = shapeOf(id).offsets;
  return o.every(p => p[0] === o[0][0]) || o.every(p => p[1] === o[0][1]);
};

// ───────── ASCII → tahta ─────────
function parseAscii(text) {
  const dirHint = {}; const gridLines = [];
  for (const raw of text.split('\n')) {
    const m = raw.match(/^\s*#\s*([A-Za-z])\s*=\s*(up|right|down|left)\s*$/);
    if (m) { dirHint[m[1].toLowerCase()] = DIRNAME.indexOf(m[2]); continue; }
    if (raw.trim()) gridLines.push(raw);
  }
  const lines = gridLines.map(l => l.replace(/\s/g, ''));
  const rows = lines.length, cols = Math.max(...lines.map(l => l.length));
  const byLetter = new Map();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      const ch = lines[r][c];
      if (ch === '.') continue;
      const key = ch.toLowerCase();
      if (!byLetter.has(key)) byLetter.set(key, { head: null, cells: new Set() });
      const e = byLetter.get(key);
      e.cells.add(c + ',' + r);
      if (ch !== key) {
        if (e.head) throw new Error(key.toUpperCase() + ': iki kafa (iki BÜYÜK harf)');
        e.head = [c, r];
      }
    }
  }
  const snakes = [];
  for (const [key, e] of byLetter) {
    const K = key.toUpperCase();
    if (!e.head) throw new Error(K + ': kafa yok — bir hücre BÜYÜK harf olmalı');
    const path0 = [e.head], seen = new Set([e.head.join(',')]);
    for (;;) {
      const [c, r] = path0[path0.length - 1];
      const nb = DIRV.map(([dc, dr]) => [c + dc, r + dr])
        .filter(([x, y]) => e.cells.has(x + ',' + y) && !seen.has(x + ',' + y));
      if (!nb.length) break;
      if (nb.length > 1 && path0.length === 1) {
        const d = dirHint[key];
        if (d === undefined) throw new Error(
          K + ': kafa kendi gövdesine iki yerden komşu, yön belirsiz — ' +
          'ızgaradan sonra "# ' + K + '=up|right|down|left" ekle');
        const want = [e.head[0] - DIRV[d][0], e.head[1] - DIRV[d][1]];
        const pick = nb.find(([x, y]) => x === want[0] && y === want[1]);
        if (!pick) throw new Error(K + ': verilen yön gövdeye uymuyor');
        path0.push(pick); seen.add(pick.join(',')); continue;
      }
      path0.push(nb[0]); seen.add(nb[0].join(','));
    }
    if (path0.length !== e.cells.size)
      throw new Error(K + ': gövde kopuk (' + path0.length + '/' + e.cells.size + ' hücre yürünebildi)');
    let dir = 0;
    if (path0.length > 1) {
      const dx = path0[0][0] - path0[1][0], dy = path0[0][1] - path0[1][1];
      dir = DIRV.findIndex(v => v[0] === dx && v[1] === dy);
      if (dir < 0) throw new Error(K + ': yön çıkarılamadı (gövde uca komşu değil)');
    }
    snakes.push({ dir, cells: path0 });
  }
  return E.buildHandLevel({ cols, rows, snakes });
}

// ───────── Tahta → ASCII ─────────
function toAscii(b) {
  const SYM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const g = Array.from({ length: b.rows }, () => Array(b.cols).fill('.'));
  const notes = []; let i = 0;
  b.arrows.forEach(a => {
    const s = SYM[i++ % SYM.length], cells = E.cellsOf(a);
    cells.forEach(([c, r], k) => { g[r][c] = k === 0 ? s : s.toLowerCase(); });
    const set = new Set(cells.map(c => c.join(',')));
    const [hc, hr] = cells[0];
    if (DIRV.filter(([dc, dr]) => set.has((hc + dc) + ',' + (hr + dr))).length > 1)
      notes.push('# ' + s + '=' + DIRNAME[a.dir]);
  });
  return g.map(l => l.join('')).join('\n') + (notes.length ? '\n' + notes.join('\n') : '');
}

// ───────── 10 metrik ─────────
// Tanımlar bilerek burada, tek yerde:
//   dalga derinliği — greedy çözümün dalga sayısı. Her dalgada O AN
//     serbest olan HER ŞEY çıkar. Monotonluk sayesinde arama gerekmez.
//   zincir sayısı  — BAŞLANGIÇ bağımlılık grafiğinde en az bir kenarı
//     olan bağlı bileşen sayısı. Kenar: A, B'nin çıkış ışınını kesiyor.
//   iç içe geçme   — ok başına temas eden FARKLI ok sayısı (dik komşu).
function measure(b) {
  const arrows = [...b.arrows.values()];
  const n = arrows.length;
  let filled = 0;
  for (let i = 0; i < b.occ.length; i++) if (b.occ[i]) filled++;

  const own = new Map();
  arrows.forEach(a => E.cellsOf(a).forEach(([c, r]) => own.set(c + ',' + r, a.id)));
  let touchSum = 0;
  arrows.forEach(a => {
    const nb = new Set();
    E.cellsOf(a).forEach(([c, r]) => DIRV.forEach(([dc, dr]) => {
      const o = own.get((c + dc) + ',' + (r + dr));
      if (o !== undefined && o !== a.id) nb.add(o);
    }));
    touchSum += nb.size;
  });

  const copy = { cols: b.cols, rows: b.rows, occ: Int16Array.from(b.occ), arrows: new Map(b.arrows) };
  const waves = [];
  let guard = n + 5;
  while (copy.arrows.size && guard-- > 0) {
    const free = E.freeArrows(copy);
    if (!free.length) { waves.length = 0; break; }
    waves.push(free.length);
    free.forEach(a => E.removeArrow(copy, a));
  }

  const parent = new Map(arrows.map(a => [a.id, a.id]));
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  let edges = 0;
  arrows.forEach(a => E.blockersOf(b, a).forEach(bid => {
    edges++; const p = find(a.id), q = find(bid); if (p !== q) parent.set(p, q);
  }));
  const size = new Map();
  arrows.forEach(a => { const r = find(a.id); size.set(r, (size.get(r) || 0) + 1); });

  return {
    boardSize: b.cols + 'x' + b.rows,
    snakeCount: n,
    avgLength: n ? +(filled / n).toFixed(2) : 0,
    fillRatio: +(filled / (b.cols * b.rows)).toFixed(3),
    freeAtStart: E.freeArrows(b).length,
    waveDepth: waves.length,
    waves,
    chainCount: [...size.values()].filter(s => s >= 2).length,
    depEdges: edges,
    shapeDiversity: new Set(arrows.map(a => a.shapeId)).size,
    curvedRatio: n ? +(arrows.filter(a => !isStraight(a.shapeId)).length / n).toFixed(3) : 0,
    interlocking: n ? +(touchSum / n).toFixed(2) : 0,
    solvable: waves.length > 0,
  };
}

module.exports = { E, parseAscii, toAscii, measure };

// ───────── CLI ─────────
const HEAD = ['sv', 'kaynak', 'tahta', 'yılan', 'ort.uz', 'dolum', 'serbest',
              'derinlik', 'zincir', 'kenar', 'şekil', 'kavisli', 'içiçe', 'çözülür'];
const WID = [5, 10, 8, 7, 8, 7, 9, 10, 8, 7, 7, 9, 7, 8];
const line = vals => vals.map((v, i) => String(v).padEnd(WID[i])).join('');
function header() {
  console.log(line(HEAD));
  console.log(WID.map(w => '-'.repeat(w - 1)).join(' '));
}
function row(lv, src, m) {
  console.log(line([lv, src, m.boardSize, m.snakeCount, m.avgLength, m.fillRatio,
    m.freeAtStart + '/' + m.snakeCount, m.waveDepth, m.chainCount, m.depEdges,
    m.shapeDiversity, m.curvedRatio, m.interlocking, m.solvable ? 'evet' : 'HAYIR']));
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--ascii') {
    const lv = Number(args[1] || 1);
    const def = E.HAND_LEVELS[lv];
    if (!def) { console.error('Seviye ' + lv + ' elle tasarlanmış değil.'); process.exit(1); }
    console.log(toAscii(E.buildHandLevel(def)));
    process.exit(0);
  }

  if (args[0]) {                       // transkripsiyon dosyası
    const txt = fs.readFileSync(args[0], 'utf8');
    const blocks = txt.split(/^\s*==\s*LEVEL\s*(\d+)\s*==\s*$/mi);
    header();
    let bad = 0;
    for (let i = 1; i < blocks.length; i += 2) {
      const lv = blocks[i], body = blocks[i + 1];
      try { row(lv, 'REFERANS', measure(parseAscii(body))); }
      catch (e) { console.log(lv + '   !!! ' + e.message); bad++; }
    }
    if (bad) { console.log('\n' + bad + ' seviye okunamadı.'); process.exit(1); }
    process.exit(0);
  }

  // Varsayılan: kendi kampanyamız
  const TIERS = [
    { from: 1, ids: ['i3', 'i4'] }, { from: 4, ids: ['l3', 'l3b', 'l4', 's4', 'u5'] },
    { from: 9, ids: ['z6', 'n6', 'l6', 'c6', 's7'] }, { from: 17, ids: ['w8', 'g8', 'e9', 'h10'] },
    { from: 22, ids: ['sp12', 'sp14', 'sp16'] },
  ];
  const lenOf = id => shapeOf(id).offsets.length;
  const pool = n => TIERS.filter(t => n >= t.from).flatMap(t => t.ids);
  const avgC = a => a.reduce((s, id) => s + lenOf(id), 0) / a.length;
  function paramsFor(n) {
    const t = Math.min(n, 40);
    const cols = 5 + Math.min(Math.floor(t / 6), 4);
    const rows = 6 + Math.min(Math.floor(t / 5), 5);
    const shapes = pool(n);
    return { cols, rows, shapes,
      arrows: Math.max(3, Math.min(4 + Math.floor(t * 0.7),
              Math.floor(cols * rows * 0.85 / avgC(shapes)))) };
  }
  header();
  for (const lv of [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 60, 100]) {
    if (E.HAND_LEVELS[lv]) { row(lv, 'ELLE', measure(E.buildHandLevel(E.HAND_LEVELS[lv]))); continue; }
    const p = paramsFor(lv);
    const r = E.generateSlide({ ...p, fill: true, preferLong: true }, (lv * 2654435761) >>> 0);
    if (r) row(lv, 'üreteç', measure(r.board));
  }
  console.log('\nNOT: paramsFor t=min(n,40) — 40 sonrası parametreler AYNI.');
}

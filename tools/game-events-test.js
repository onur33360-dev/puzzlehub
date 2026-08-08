#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Evrensel Oyun-Olayı Sistemi Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// GameEvents'in (core/app.js) sözleşmesini ve kayıtlı oyunların BAĞLANTISINI
// doğrular. Sıfır bağımlılık, yalnızca Node çekirdeği — proje build'siz
// kalır (bkz. CLAUDE.md §6). level-metrics.js'in kardeşi: aynı vm+stub
// deseni, ama burada games.js'in YANINDA app.js de yükleniyor, çünkü
// test edilen şey ikisinin arasındaki sözleşme.
//
//   node tools/game-events-test.js            hepsini çalıştır
//   node tools/game-events-test.js --table    yalnızca enjeksiyon tablosu
//
// ÜÇ KATMAN, üçü de ayrı bir hata sınıfını yakalıyor:
//   1. SÖZLEŞME  — GameEvents'in kendi mantığı (sayaç, kalıcılık, açık
//                  tur değişmezleri, reopen, stray koruması).
//   2. KAYNAK    — games.js'teki her gameEvent(...) çağrısı taranıyor:
//                  doğru oyunda mı, gameId kayıt anahtarıyla uyuşuyor mu,
//                  result değeri geçerli mi. Kopyala-yapıştır hatasının
//                  (Blok Puzzle'ın 'waterSort' yayınlaması) tek gerçekçi
//                  savunması budur ve dosya:satır tablosunu da bu üretir.
//   3. CANLI     — her oyunun init()'i gerçekten çağrılıyor ve tam olarak
//                  bir game_started çıktığı doğrulanıyor. Kaynak taraması
//                  "çağrı yazılmış" der, bu katman "çağrı ÇALIŞIYOR" der.

'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'games/games.js'), 'utf8');

// Kayıt sırası = raporun sırası. GAME_MAP'teki kimliklerle birebir aynı
// olmalı; bu liste aynı zamanda "hiçbir oyun unutulmadı" kontrolüdür.
const GAMES = [
  'game2048', 'memoryGame', 'wordSearch', 'sudoku', 'blockPuzzle',
  'mazeGame', 'screwPuzzle', 'waterSort', 'arrowPuzzle', 'jigsawCard',
  'snakeGame',
];
const N = GAMES.length;

let failures = 0;
function ok(name)        { console.log('  ✓ ' + name); }
function bad(name, why)  { failures++; console.log('  ✗ ' + name + '\n      ' + why); }
function check(name, cond, why) { cond ? ok(name) : bad(name, why || 'beklenen sağlanmadı'); }
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  a === e ? ok(name) : bad(name, 'beklenen ' + e + ', gelen ' + a);
}

// ───────────────────────────────────────────────────────────────
//  DOM sandbox
// ───────────────────────────────────────────────────────────────
// level-metrics.js'in stub'larından daha zengin olmak ZORUNDA: orada
// yalnızca motor okunuyordu, burada oyunlar gerçekten init ediliyor.
// İki fark kritik:
//   getElementById stub DÖNDÜRÜYOR (null değil) — app.js kabuğu açılışta
//   onlarca öğeye dokunuyor ve null'da patlardı.
//   canvas getContext bir Proxy — Blok Puzzle ve Su Sıralama canvas'a
//   çiziyor; her çizim çağrısını tek tek stub'lamak anlamsız.
function ctx2d() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      // createLinearGradient/createPattern gibi ÜRETEN çağrılar bir nesne
      // döndürmeli; gerisi no-op. Ayrım yapmak yerine hepsi gradient döner.
      return function () { return grad; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function stubEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: new Proxy({}, { get(t, k) {
      if (k === 'setProperty' || k === 'removeProperty') return function () {};
      return t[k] !== undefined ? t[k] : '';
    }, set(t, k, v) { t[k] = v; return true; } }),
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, children: [], width: 300, height: 300,
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    insertAdjacentHTML() {}, insertAdjacentElement() {},
    removeChild() {}, remove() {}, replaceChildren() {}, scrollIntoView() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    hasAttribute() { return false; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    querySelector() { return stubEl(); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
    getBoundingClientRect() { return { left:0, top:0, right:300, bottom:300, width:300, height:300 }; },
    getContext() { return ctx2d(); },
    focus() {}, blur() {}, cloneNode() { return stubEl(tag); },
    animate() { return { cancel() {}, finished: Promise.resolve() }; },
    innerHTML: '', outerHTML: '', textContent: '', value: '', disabled: false,
    offsetWidth: 300, offsetHeight: 300, clientWidth: 300, clientHeight: 300,
  };
  return el;
}

function makeSandbox() {
  const doc = {
    head: stubEl(), body: stubEl(), documentElement: stubEl(),
    createElement: stubEl, createElementNS: stubEl, createTextNode: stubEl,
    createDocumentFragment: stubEl,
    getElementById: () => stubEl(),
    querySelector: () => stubEl(), querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    visibilityState: 'visible', hidden: false, readyState: 'complete',
  };
  const store = {};
  const sb = {
    document: doc,
    navigator: { userAgent: 'node', vibrate() {}, maxTouchPoints: 0, language: 'tr' },
    localStorage: {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
      clear() { for (const k in store) delete store[k]; },
    },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    console: { log() {}, warn() {}, error() {}, info() {} },   // sessiz: test çıktısı bizim
    Math, Date, JSON, performance: { now: () => Date.now() },
    AudioContext: function () { throw new Error('node: ses yok'); },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    IntersectionObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    ResizeObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    Image: function () { return stubEl('img'); },
    addEventListener() {}, removeEventListener() {},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    // Blok Puzzle'ın pickRenderScale()'i cihaz sınıfını buradan okuyor
    // (bkz. CLAUDE.md §5 RENDER_SCALE); yoksa init yarıda kalıyor.
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 844 },
    // readJewels() mücevher renklerini CSS değişkenlerinden okuyor. Node'da
    // stil yok; boş dize dönmek yeterli, test rengi değil olayı ölçüyor.
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    _store: store,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  // index.html'deki yükleme sırasının AYNISI. Sıra bozulursa gerçek
  // uygulamadaki hata burada da çıkmalı (bkz. CLAUDE.md §2).
  for (const rel of ['core/rng.js', 'games/games.js', 'core/ui-kit.js',
                     'reels/reels.js', 'core/daily.js', 'core/app.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  }
  // Üst düzey `const` sandbox NESNESİNE değil global sözlük kapsamına gider;
  // oradan ancak ifade değerlendirerek alınır.
  return {
    sb,
    GameEvents: vm.runInContext('GameEvents', sb),
    PuzzleGames: vm.runInContext('PuzzleGames', sb),
    store,
  };
}

// ───────────────────────────────────────────────────────────────
//  1. SÖZLEŞME — GameEvents'in kendi mantığı
// ───────────────────────────────────────────────────────────────
function testContract() {
  console.log('\n1. SÖZLEŞME — GameEvents mantığı');
  const { GameEvents: GE, store } = makeSandbox();
  const seen = [];
  GE.on('game_started', e => seen.push(['started', e.gameId]));
  GE.on('game_ended', e => seen.push(['ended', e.gameId, e.result]));

  // ── temel tur ──
  GE.emit('game_started', { gameId: 'sudoku' });
  GE.emit('game_ended', { gameId: 'sudoku', result: 'won', score: 4200 });
  // perGame'in TAMAMI karşılaştırılmıyor (2026-08-07). Eskiden nesne birebir
  // eşitleniyordu; _record seri/en-hızlı/en-yüksek alanlarını ekleyince o
  // iddia, ölçmek istediği şeyle ilgisiz bir sebepten kırıldı. Sayaçların
  // kendisi hâlâ aynı sıkılıkta denetleniyor — kırılgan olan karşılaştırma
  // biçimiydi, iddianın kendisi değil.
  eq('kazanılan tur sayaçlara işliyor',
     [GE.stats().totalGamesStarted, GE.stats().totalGamesWon], [1, 1]);
  eq('oyun bazlı sayaç işliyor',
     [GE.forGame('sudoku').started, GE.forGame('sudoku').won], [1, 1]);

  // ── kaybetme sayılmıyor (yalnızca started artıyor) ──
  GE.emit('game_started', { gameId: 'blockPuzzle' });
  GE.emit('game_ended', { gameId: 'blockPuzzle', result: 'lost', score: 900 });
  eq('kaybedilen tur won sayacına işlemiyor',
     [GE.forGame('blockPuzzle').started, GE.forGame('blockPuzzle').won], [1, 0]);

  // ── seri / en hızlı / en yüksek (2026-08-07) ──
  //
  // Sonsuz ilerleyen oyunlar için eklendi (Resim Kaydır'ın sonsuz akışı).
  // Buradaki iddiaların değeri, seriyi BOZAN şeyleri saymakta: 'lost' ve
  // 'quit' ikisi de bozmalı, çünkü ikisi de "arka arkaya tamamlama"nın
  // tanımını bozuyor. bestStreak ise asla azalmamalı.
  {
    const G = 'jigsawCard';
    GE.abandon();
    for (let i = 0; i < 3; i++) {
      GE.emit('game_started', { gameId: G });
      GE.emit('game_ended', { gameId: G, result: 'won', score: 50 + i, durationMs: 9000 - i * 1000 });
    }
    eq('üst üste 3 tamamlama seriyi 3 yapıyor', GE.forGame(G).streak, 3);
    eq('en iyi seri 3', GE.forGame(G).bestStreak, 3);
    eq('en hızlı tamamlama en KÜÇÜK süre', GE.forGame(G).bestMs, 7000);
    eq('en yüksek skor', GE.forGame(G).bestScore, 52);

    GE.emit('game_started', { gameId: G });
    GE.emit('game_ended', { gameId: G, result: 'lost' });
    eq('kaybetme seriyi sıfırlıyor', GE.forGame(G).streak, 0);
    eq('en iyi seri AZALMIYOR', GE.forGame(G).bestStreak, 3);

    GE.emit('game_started', { gameId: G });
    GE.emit('game_started', { gameId: G });      // öncekini quit'ler
    eq('quit de seriyi sıfırlıyor', GE.forGame(G).streak, 0);

    // Daha yavaş bir tamamlama en hızlıyı BOZMAMALI.
    GE.emit('game_ended', { gameId: G, result: 'won', score: 1, durationMs: 99000 });
    eq('yavaş tur en hızlıyı bozmuyor', GE.forGame(G).bestMs, 7000);
    eq('düşük skor en yükseği bozmuyor', GE.forGame(G).bestScore, 52);

    // Süre/skor GÖNDERMEYEN oyun o alanı hiç kazanmamalı — uydurma bir
    // sayı, eksik bir alandan kötüdür.
    GE.abandon();
    GE.emit('game_started', { gameId: 'arrowPuzzle' });
    GE.emit('game_ended', { gameId: 'arrowPuzzle', result: 'won' });
    eq('skor göndermeyen oyunda bestScore 0', GE.forGame('arrowPuzzle').bestScore, 0);

    // Başıboş olay (açık tur yok) seriyi ŞİŞİRMEMELİ — Değişmez 3.
    GE.abandon();
    const s0 = GE.forGame(G).streak;
    GE.emit('game_ended', { gameId: G, result: 'won', score: 9999 });
    eq('başıboş bitiş seriyi artırmıyor', GE.forGame(G).streak, s0);
    eq('başıboş bitiş en yüksek skoru bozmuyor', GE.forGame(G).bestScore, 52);
  }

  // ── kalıcılık: sayaç localStorage'da ──
  // Sabit sayı yerine CANLI durumla karşılaştırılıyor (2026-08-07):
  // ölçülmek istenen şey "diskteki kayıt bellektekiyle aynı mı", belirli
  // bir tur sayısı değil. Sabit [2,1] beklentisi, testin başka bir yerine
  // tur eklenince ilgisiz bir sebeple kırılıyordu.
  const raw = JSON.parse(store['ph_game_stats']);
  const mem = GE.stats();
  eq('ph_game_stats diske yazılıyor',
     [raw.totalGamesStarted, raw.totalGamesWon],
     [mem.totalGamesStarted, mem.totalGamesWon]);
  check('diske en az bir tur işlenmiş', mem.totalGamesStarted > 0);

  // ── Değişmez 1+2: açık tur varken yeni başlangıç, eskisini quit'ler ──
  seen.length = 0;
  GE.emit('game_started', { gameId: 'waterSort' });
  GE.emit('game_started', { gameId: 'waterSort' });   // seviye 2, önceki bitmeden
  eq('açık tur, yeni başlangıçta quit ile kapanıyor',
     seen, [['started', 'waterSort'], ['ended', 'waterSort', 'quit'], ['started', 'waterSort']]);
  check('quit sayaçlara işlemiyor (yalnızca 2 started)',
        GE.forGame('waterSort').started === 2 && GE.forGame('waterSort').won === 0,
        'gelen: ' + JSON.stringify(GE.forGame('waterSort')));

  // ── Değişmez 3: açık tur yokken gelen bitiş sayaçlara işlemiyor ──
  GE.abandon();                                       // açık turu temizle
  const before = GE.stats().totalGamesWon;
  seen.length = 0;
  GE.emit('game_ended', { gameId: 'mazeGame', result: 'won' });
  check('başlangıçsız bitiş won sayacını artırmıyor', GE.stats().totalGamesWon === before,
        'won ' + before + ' → ' + GE.stats().totalGamesWon);
  check('başlangıçsız bitiş stray olarak işaretleniyor',
        seen.length === 1 && seen[0][0] === 'ended', 'dinleyiciye ulaşmadı');

  // Bu, sistemin en önemli tek garantisi: kazanma oranı 1'i aşamaz.
  const st = GE.stats();
  check('değişmez: totalGamesWon <= totalGamesStarted',
        st.totalGamesWon <= st.totalGamesStarted,
        st.totalGamesWon + ' > ' + st.totalGamesStarted);

  // ── durationMs ──
  GE.emit('game_started', { gameId: 'mazeGame' });
  let dur = null;
  const off = GE.on('game_ended', e => { dur = e.durationMs; });
  GE.emit('game_ended', { gameId: 'mazeGame', result: 'won' });
  check('durationMs merkezde türetiliyor', typeof dur === 'number' && dur >= 0, 'gelen: ' + dur);
  GE.emit('game_started', { gameId: 'mazeGame' });
  GE.emit('game_ended', { gameId: 'mazeGame', result: 'won', durationMs: 12345 });
  eq('oyunun verdiği durationMs türetilene üstün geliyor', dur, 12345);
  off();

  // ── reopen: reklamla devam ──
  GE.emit('game_started', { gameId: 'game2048' });
  const startedAt = GE.openRound().startedAt;
  GE.emit('game_ended', { gameId: 'game2048', result: 'lost', score: 100 });
  GE.reopen('game2048');
  check('reopen turu geri açıyor', !!GE.openRound(), 'açık tur yok');
  eq('reopen başlangıç zamanını koruyor', GE.openRound().startedAt, startedAt);
  const s2 = GE.stats().totalGamesStarted;
  GE.emit('game_ended', { gameId: 'game2048', result: 'won', score: 4000 });
  check('devam edip kazanmak yeni bir başlangıç saymıyor',
        GE.stats().totalGamesStarted === s2, 'started arttı');

  // ── abonelikten çıkma ──
  let n = 0;
  const off2 = GE.on('game_started', () => n++);
  GE.emit('game_started', { gameId: 'sudoku' });
  off2();
  GE.emit('game_started', { gameId: 'sudoku' });
  eq('on() döndürdüğü fonksiyon aboneliği iptal ediyor', n, 1);

  // ── dinleyici hatası oyunu düşürmüyor ──
  GE.on('game_ended', () => { throw new Error('kasıtlı hata'); });
  let survived = true;
  try { GE.emit('game_ended', { gameId: 'sudoku', result: 'won' }); }
  catch (e) { survived = false; }
  check('dinleyici hatası emit()i düşürmüyor', survived, 'hata yayıldı');
}

// ───────────────────────────────────────────────────────────────
//  2. KAYNAK — games.js'teki her gameEvent çağrısı
// ───────────────────────────────────────────────────────────────
// Oyun sınırları: `PuzzleGames.<id> = (() => {` satırları. Bir çağrının
// hangi oyunun İÇİNDE olduğu buradan çıkıyor, yani yanlış oyuna yazılmış
// bir gameId ("blockPuzzle'ın içinde waterSort") yakalanabiliyor.
function scanSource() {
  const lines = SRC.split(/\r?\n/);
  const bounds = [];
  lines.forEach((l, i) => {
    const m = l.match(/^PuzzleGames\.(\w+)\s*=/);
    if (m) bounds.push({ id: m[1], line: i + 1 });
  });
  const ownerOf = (line) => {
    let owner = null;
    for (const b of bounds) { if (b.line <= line) owner = b.id; else break; }
    return owner;
  };
  const calls = [];
  lines.forEach((l, i) => {
    // Yorum satırları atlanıyor: gameEvent()'in kendi kullanım örneği de
    // bir yorumun içinde ve tarayıcı onu gerçek bir çağrı sanıyordu.
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    const m = l.match(/gameEvent\(\s*'(game_started|game_ended)'/);
    if (!m) return;
    // Yük tek satıra sığmayabiliyor; kapanan paranteze kadar birleştir.
    let chunk = '', depth = 0, started = false;
    for (let j = i; j < Math.min(i + 8, lines.length); j++) {
      for (const ch of lines[j]) {
        chunk += ch;
        if (ch === '(') { depth++; started = true; }
        else if (ch === ')') depth--;
      }
      if (started && depth <= 0) break;
      chunk += ' ';
    }
    const gid = chunk.match(/gameId:\s*'(\w+)'/);
    const res = chunk.match(/result:\s*'(\w+)'/);
    const dyn = /result:\s*\w+\s*\?/.test(chunk);           // won ? 'won' : 'lost'
    const results = dyn ? (chunk.match(/'(won|lost|quit)'/g) || []).map(s => s.slice(1, -1))
                        : (res ? [res[1]] : []);
    calls.push({
      line: i + 1, event: m[1], owner: ownerOf(i + 1),
      gameId: gid ? gid[1] : null, results,
      hasScore: /\bscore\b/.test(chunk),
    });
  });
  return calls;
}

function testSource(calls) {
  console.log('\n2. KAYNAK — games.js taraması (' + calls.length + ' çağrı)');
  const VALID = ['won', 'lost', 'quit'];

  check('yalnızca kayıtlı oyunlar yayın yapıyor',
        calls.every(c => GAMES.indexOf(c.owner) >= 0),
        'kayıt dışı: ' + calls.filter(c => GAMES.indexOf(c.owner) < 0).map(c => c.owner + ':' + c.line));

  const wrong = calls.filter(c => c.gameId !== c.owner);
  check('her çağrının gameId\'si bulunduğu oyunla aynı', wrong.length === 0,
        wrong.map(c => 'satır ' + c.line + ': ' + c.owner + ' içinde gameId=' + c.gameId).join('; '));

  const badRes = calls.filter(c => c.event === 'game_ended' &&
                                   (!c.results.length || c.results.some(r => VALID.indexOf(r) < 0)));
  check('her game_ended geçerli bir result taşıyor', badRes.length === 0,
        badRes.map(c => 'satır ' + c.line).join('; '));

  const quitFromGame = calls.filter(c => c.results.indexOf('quit') >= 0);
  check('hiçbir oyun \'quit\' yayınlamıyor (kabuğun işi)', quitFromGame.length === 0,
        quitFromGame.map(c => c.owner + ':' + c.line).join('; '));

  for (const g of GAMES) {
    const mine = calls.filter(c => c.owner === g);
    const starts = mine.filter(c => c.event === 'game_started');
    const ends = mine.filter(c => c.event === 'game_ended');
    if (!starts.length) bad(g + ' — game_started var', 'hiç game_started çağrısı yok');
    if (!ends.length) bad(g + ' — game_ended var', 'hiç game_ended çağrısı yok');
  }
  if (GAMES.every(g => calls.some(c => c.owner === g && c.event === 'game_started') &&
                       calls.some(c => c.owner === g && c.event === 'game_ended'))) {
    ok(N + ' oyunun hepsinde hem başlangıç hem bitiş çağrısı var');
  }

  // Bilerek tek taraflı oyunlar — dokümanla kodun aynı şeyi söylediğini
  // sabitler. Biri değişirse test kırılır ve karar yeniden konuşulur.
  const resultsOf = g => calls.filter(c => c.owner === g && c.event === 'game_ended')
                              .reduce((a, c) => a.concat(c.results), []);
  // waterSort 2026-08-01'e kadar YALNIZCA 'won' yayınlıyordu ve bu bir
  // eksiklik değil, oyunun doğru ifadesiydi: tüpler tıkanmazdı. Hamle limiti
  // (Faz 4) bilinçli bir kaybetme durumu getirdi, dolayısıyla artık ikisini
  // de yayınlıyor. Bu satırın kırılması kararın yeniden konuşulmasını
  // sağladı — testin varlık sebebi tam olarak buydu.
  eq('waterSort hem \'won\' hem \'lost\' yayınlıyor (hamle limiti)',
     [...new Set(resultsOf('waterSort'))].sort(), ['lost', 'won']);
  eq('mazeGame yalnızca \'won\' yayınlıyor', [...new Set(resultsOf('mazeGame'))], ['won']);
  eq('blockPuzzle yalnızca \'lost\' yayınlıyor (kazanma durumu yok)',
     [...new Set(resultsOf('blockPuzzle'))], ['lost']);
}

// ───────────────────────────────────────────────────────────────
//  3. CANLI — init() gerçekten game_started yayınlıyor mu
// ───────────────────────────────────────────────────────────────
function testLive() {
  console.log('\n3. CANLI — ' + N + ' oyunun init() çağrısı');
  for (const id of GAMES) {
    const { GameEvents: GE, PuzzleGames: PG } = makeSandbox();
    const seen = [];
    GE.on('game_started', e => seen.push(e.gameId));
    const mod = PG[id];
    if (!mod) { bad(id, 'PuzzleGames kaydında yok'); continue; }
    let err = null;
    try { mod.init(stubEl(), undefined); } catch (e) { err = e; }
    // init'in DOM stub'ları yüzünden sonradan patlaması mümkün; önemli olan
    // olayın çıkmış olması. Yine de hata varsa sonuca yazılıyor —
    // sessizce yutmak, testin ne kanıtladığını belirsizleştirirdi.
    const note = err ? '  (init hatası: ' + String(err.message).slice(0, 60) + ')' : '';
    if (seen.length === 1 && seen[0] === id) ok(id + ' → game_started' + note);
    else bad(id, 'beklenen 1 adet "' + id + '", gelen ' + JSON.stringify(seen) + note);
  }
}

// ───────────────────────────────────────────────────────────────
//  4. SİMÜLASYON — kayıtlı her oyunun tam yaşam döngüsü
// ───────────────────────────────────────────────────────────────
// Her oyunun kaynakta BULUNAN yükleriyle bir tur oynatılıyor; amaç
// sayaçların uçtan uca doğru birikmesi. Seviyeli oyunlar (tur = seviye)
// üst üste iki seviye oynuyor, tek turlu oyunlar bir tur.
const LEVELED = ['screwPuzzle', 'waterSort', 'arrowPuzzle', 'jigsawCard'];

function testSimulation(calls) {
  console.log('\n4. SİMÜLASYON — uçtan uca sayaç birikimi');
  const { GameEvents: GE } = makeSandbox();
  const expect = {};

  for (const g of GAMES) {
    const ends = calls.filter(c => c.owner === g && c.event === 'game_ended');
    const canWin = ends.some(c => c.results.indexOf('won') >= 0);
    const rounds = LEVELED.indexOf(g) >= 0 ? 2 : 1;
    let won = 0;
    for (let i = 0; i < rounds; i++) {
      GE.emit('game_started', { gameId: g });
      const result = canWin ? 'won' : 'lost';
      GE.emit('game_ended', { gameId: g, result, score: 100 });
      if (result === 'won') won++;
    }
    expect[g] = { started: rounds, won };
  }

  // started/won ÜZERİNDEN karşılaştırılıyor, nesnenin tamamı üzerinden
  // değil: forGame() artık seri/en-hızlı/en-yüksek alanlarını da taşıyor
  // ve burada ölçülen şey onlar değil, sayaçlar. Birebir nesne eşitliği
  // her yeni alanda bu iddiayı ilgisiz bir sebeple kırardı.
  let allOk = true;
  for (const g of GAMES) {
    const got = GE.forGame(g);
    const sade = { started: got.started, won: got.won };
    if (JSON.stringify(sade) !== JSON.stringify(expect[g])) {
      bad(g + ' sayacı', 'beklenen ' + JSON.stringify(expect[g]) + ', gelen ' + JSON.stringify(sade));
      allOk = false;
    }
  }
  if (allOk) ok(N + ' oyunun per-game sayacı beklenen değerde');

  const total = Object.values(expect).reduce(
    (a, e) => ({ s: a.s + e.started, w: a.w + e.won }), { s: 0, w: 0 });
  eq('genel toplamlar per-game toplamıyla tutarlı',
     [GE.stats().totalGamesStarted, GE.stats().totalGamesWon], [total.s, total.w]);

  // Kapat/aç: aynı localStorage üzerine YENİ bir GameEvents okuması.
  const snapshot = GE.stats();
  const revived = JSON.parse(JSON.stringify(snapshot));
  eq('sayaçlar localStorage üzerinden hayatta kalıyor',
     [revived.totalGamesStarted, revived.totalGamesWon],
     [snapshot.totalGamesStarted, snapshot.totalGamesWon]);
}

// ───────────────────────────────────────────────────────────────
//  Enjeksiyon tablosu
// ───────────────────────────────────────────────────────────────
function printTable(calls) {
  console.log('\nENJEKSİYON TABLOSU (games/games.js)');
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
  console.log('  ' + pad('oyun', 14) + pad('başlangıç', 12) + 'bitiş');
  for (const g of GAMES) {
    const mine = calls.filter(c => c.owner === g);
    const s = mine.filter(c => c.event === 'game_started').map(c => c.line).join(',');
    const e = mine.filter(c => c.event === 'game_ended')
                  .map(c => c.line + ':' + c.results.join('/')).join('  ');
    console.log('  ' + pad(g, 14) + pad(s || '—', 12) + (e || '—'));
  }
}

// ───────────────────────────────────────────────────────────────
const calls = scanSource();
if (process.argv.indexOf('--table') >= 0) { printTable(calls); process.exit(0); }

console.log('SlySwipe — Evrensel Oyun-Olayı Sistemi Doğrulaması');
testContract();
testSource(calls);
testLive();
testSimulation(calls);
printTable(calls);

console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
process.exit(failures === 0 ? 0 : 1);

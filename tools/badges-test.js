#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Rozet Sistemi Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// Badges'in (core/app.js) sözleşmesini, mevcut sayaçlara BAĞLANMASINI ve
// ekonomiye dokunuşunu doğrular. daily-quests-test.js'in kardeşi: aynı
// vm+stub deseni (tools/dom-sandbox.js), sıfır bağımlılık, plain Node.
//
//   node tools/badges-test.js
//
// DÖRT KATMAN:
//   1. SÖZLEŞME  — koşullar, tek-seferlik ödeme, kalıcılık, vitrin/son
//                  kazanılan siralamasi, yeniden-giriş korumasi.
//   2. KAYNAK    — core/app.js taraması. Bu sistemin mimari iddiası
//                  "oyun-özel kod yok" ve "yeni takip yazılmadı";
//                  ikisi de ancak kaynağı okuyarak kanıtlanır. Ayrıca
//                  ödemenin addReward()'dan geçtiği (Plus) ve mağaza
//                  satırının "Yakında"dan çıktığı burada sabitlenir.
//   3. CANLI     — 10 oyunun gerçek init()'i "İlk Oyun"u veriyor mu.
//   4. UÇTAN UCA — tüm rozetlerin kazanıldığı bir yolculuk, Plus'lı hali,
//                  kapat/aç kalıcılığı, UI'a yansıma.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, stubEl } = require('./dom-sandbox');

const APP_SRC = fs.readFileSync(path.join(ROOT, 'core/app.js'), 'utf8');

const GAMES = [
  'game2048', 'memoryGame', 'wordSearch', 'sudoku', 'blockPuzzle',
  'mazeGame', 'screwPuzzle', 'waterSort', 'arrowPuzzle', 'jigsawCard',
];
const IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30'];

let failures = 0;
function ok(name)       { console.log('  ✓ ' + name); }
function bad(name, why) { failures++; console.log('  ✗ ' + name + '\n      ' + why); }
function check(name, cond, why) { cond ? ok(name) : bad(name, why || 'beklenen sağlanmadı'); }
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  a === e ? ok(name) : bad(name, 'beklenen ' + e + ', gelen ' + a);
}

// Bu araç YALNIZCA rozet ödüllerini ölçüyor. Ama rozet koşullarını
// tetiklemenin tek gerçekçi yolu gerçek oyun olayları yaymak ve bunlar
// DailyQuests'i de ödetiyor ("3 oyun oyna" +10💎) — ilk çalıştırmada
// bakiye farkları tam da bu kadar şaştı. Görevleri günün başında ÖDENMİŞ
// kabul ederek izole ediyoruz: settle() hiçbir şey ödemez, bakiyedeki
// her değişim rozetlere aittir.
function questsPrePaid() {
  return JSON.stringify({
    date: new Date().toDateString(),
    played: 0, won: 0,
    paid: ['play3', 'daily', 'win1'], bonusPaid: true,
  });
}

function boot(store) {
  store = store || {};
  if (!store['ph_daily_quests']) store['ph_daily_quests'] = questsPrePaid();
  const s = makeSandbox(store);
  return {
    s, store: s.store,
    B: s.get('Badges'), BADGES: s.get('BADGES'),
    GE: s.get('GameEvents'), DS: s.get('DiamondSystem'),
    SS: s.get('StreakSystem'), ECON: s.get('EconomyConfig'),
    renderShop: () => s.get('renderShop()'),
    renderProgress: () => s.get('renderProgress()'),
    renderShowcase: () => s.get('renderShowcase()'),
    el: (id) => s.byId[id],
  };
}

const earnedIds = (B) => B.getData().earned.map(e => e.id);

// N tur oynat (her tur bir game_started).
function playRounds(GE, n, gameId) {
  for (let i = 0; i < n; i++) {
    GE.emit('game_started', { gameId: gameId || 'game2048' });
    GE.emit('game_ended', { gameId: gameId || 'game2048', result: 'lost' });
  }
}

// Seri'yi hedefe kur ve checkIn() ile rozet tetikleyicisini calistir.
function setStreak(s, store, count) {
  const y = new Date(Date.now() - 86400000).toDateString();
  store['ph_streak'] = JSON.stringify({ count: count - 1, lastDate: y, totalDays: count - 1, days: [] });
  return s.get('StreakSystem.checkIn()');
}

// ───────────────────────────────────────────────────────────────
//  1. SÖZLEŞME
// ───────────────────────────────────────────────────────────────
function testContract() {
  console.log('\n1. SÖZLEŞME — Badges mantığı');
  const b = boot();
  const { B, GE, DS, SS, ECON, s, store } = b;

  eq('beş rozet tanımlı', B.total(), 5);
  eq('rozet kimlikleri', b.BADGES.map(x => x.id), IDS);
  eq('taze kayıtta hiç rozet yok', B.count(), 0);
  eq('totalReward EconomyConfig toplamı', B.totalReward(),
     ECON.BADGE_FIRST_GAME + ECON.BADGE_10_GAMES + ECON.BADGE_STREAK_7 +
     ECON.BADGE_STREAK_30 + ECON.BADGE_DIAMONDS_500);

  // ── "İlk Oyun" ──
  const base = DS.get();
  GE.emit('game_started', { gameId: 'sudoku' });
  check('ilk tur "İlk Oyun" rozetini veriyor', B.has('first_game'), earnedIds(B).join(','));
  eq('rozet ödülü ödendi (+5💎)', DS.get() - base, ECON.BADGE_FIRST_GAME);
  check('earnedAt kaydediliyor', typeof B.getData().earned[0].earnedAt === 'number');

  // ── TEK SEFERLİK: tekrar tekrar ödenmiyor ──
  const afterFirst = DS.get();
  for (let i = 0; i < 25; i++) B.check();
  playRounds(GE, 3, 'mazeGame');
  eq('rozet İKİNCİ kez ödenmiyor', DS.get(), afterFirst);
  eq('rozet listeye iki kez yazılmıyor',
     earnedIds(B).filter(x => x === 'first_game').length, 1);

  // ── "10 Oyun" eşiği ──
  check('10 oyundan önce kazanılmamış', !B.has('games_10'),
        'started=' + GE.stats().totalGamesStarted);
  const before10 = DS.get();
  while (GE.stats().totalGamesStarted < 10) playRounds(GE, 1, 'game2048');
  check('10. oyunda kazanılıyor', B.has('games_10'));
  eq('10 Oyun ödülü', DS.get() - before10, ECON.BADGE_10_GAMES);

  // ── Seri rozetleri: ph_streak, DailyChallenge SERİSİ DEĞİL ──
  check('7 gün öncesinde kazanılmamış', !B.has('streak_7'));
  const before7 = DS.get();
  setStreak(s, store, 7);
  eq('StreakSystem 7 gün', SS.getCount(), 7);
  check('checkIn() 7 Gün Seri rozetini veriyor', B.has('streak_7'));
  eq('7 Gün Seri ödülü', DS.get() - before7, ECON.BADGE_STREAK_7);
  check('30 gün henüz kazanılmamış', !B.has('streak_30'));

  // ── Yaşam boyu elmas: BAKİYE DEĞİL ──
  const b2 = boot();
  b2.DS.add(600, null);
  check('600💎 kazanınca 500 rozeti veriliyor', b2.B.has('diamonds_500'));
  // Harcamak rozeti geri ALMAZ ve sayacı düşürmez — asıl sınav bu.
  b2.DS.spend(590);
  check('harcama yaşam boyu sayacı düşürmüyor', b2.DS.earned() >= 600,
        'earned=' + b2.DS.earned());
  check('harcama rozeti geri almıyor', b2.B.has('diamonds_500'));

  // ── Yeniden giriş: add() → check() → addReward() → add() ──
  // Korumasız bu sonsuz özyineleme olurdu; hâlâ yaşıyorsak koruma var.
  let survived = true;
  try { b2.DS.add(10, null); } catch (e) { survived = false; }
  check('add()→check()→addReward() özyinelemeye girmiyor', survived, 'yığın taştı');

  // ── Sıralamalar ──
  const b3 = boot();
  b3.GE.emit('game_started', { gameId: 'sudoku' });     // first_game
  b3.DS.add(600, null);                                  // diamonds_500
  const rec = b3.B.recent(4).map(x => x.id);
  eq('recent() en son kazanılan başta', rec[0], 'diamonds_500');
  const sc = b3.B.showcase(3).map(x => x.id);
  eq('showcase() en değerli başta', sc[0], 'diamonds_500');   // 25 > 5
  check('showcase en fazla 3 döndürüyor', b3.B.showcase(3).length <= 3);

  // ── Kalıcılık: yeni oturum, aynı disk ──
  const b4 = boot(b3.store);
  eq('rozetler localStorage üzerinden hayatta kalıyor',
     earnedIds(b4.B).sort(), earnedIds(b3.B).sort());
  const beforeReboot = b4.DS.get();
  b4.B.check();
  eq('yeniden açılışta ödül tekrar verilmiyor', b4.DS.get(), beforeReboot);
}

// ───────────────────────────────────────────────────────────────
//  2. KAYNAK
// ───────────────────────────────────────────────────────────────
function testSource() {
  console.log('\n2. KAYNAK — core/app.js taraması');

  const start = APP_SRC.indexOf('const BADGES = [');
  const end = APP_SRC.indexOf("GameEvents.on('game_ended', function () { Badges.check(); });");
  check('BADGES + Badges bloğu bulundu', start > 0 && end > start);
  const block = APP_SRC.slice(start, end);
  const code = block.split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  const leaked = GAMES.filter(g => code.indexOf("'" + g + "'") >= 0);
  check('hiçbir oyun kimliği geçmiyor (evrensel)', leaked.length === 0,
        'sızan: ' + leaked.join(', '));

  // Mevcut sayaçlardan TÜRETİLİYOR; yeni takip yazılmadı.
  check('koşullar GameEvents.stats()\'ten okuyor', /GameEvents\.stats\(\)/.test(code));
  check('koşullar StreakSystem.getCount()\'ten okuyor', /StreakSystem\.getCount\(\)/.test(code));
  check('koşullar DiamondSystem.earned()\'den okuyor', /DiamondSystem\.earned\(\)/.test(code));
  // Rozet sistemi KENDİ anahtarından başka hiçbir yere yazmamalı:
  // koşullar mevcut sayaçlardan türetiliyor, kopya sayaç tutulmuyor.
  // (_save() içindeki tek yazım meşru — o da this._key'e.)
  const writes = code.match(/localStorage\.setItem\([^,]+/g) || [];
  check('yalnızca kendi anahtarına yazıyor (kopya sayaç yok)',
        writes.length === 1 && /this\._key/.test(writes[0]),
        'yazımlar: ' + JSON.stringify(writes));

  // Seri rozetleri DOĞRU streak'e bakmalı.
  check('seri rozetleri ph_streak kullanıyor, DailyChallenge serisini DEĞİL',
        !/DailyChallenge/.test(code), 'DailyChallenge referansı var');

  // Ödeme addReward()'dan geçmeli (Plus +%50).
  check('ödemeler addReward() ile (Plus +%50)',
        /DiamondSystem\.addReward\(/.test(code) && !/DiamondSystem\.add\(/.test(code));

  // Yeniden giriş koruması silinmesin.
  check('yeniden giriş koruması (_checking) yerinde',
        /_checking/.test(code) && /if \(this\._checking\) return/.test(code));

  // Tetikleyiciler
  check('GameEvents aboneliği var', /GameEvents\.on\(\s*'game_started', function \(\) \{ Badges\.check/.test(APP_SRC));
  check('DiamondSystem.add() rozet kontrolü tetikliyor',
        /_animateAdd\(\);[\s\S]{0,400}Badges\.check\(\)/.test(APP_SRC));
  check('StreakSystem.checkIn() rozet kontrolü tetikliyor',
        /saveData\(data\);[\s\S]{0,200}Badges\.check\(\)/.test(APP_SRC));

  // Ödüller EconomyConfig'te
  ['BADGE_FIRST_GAME','BADGE_10_GAMES','BADGE_STREAK_7','BADGE_STREAK_30','BADGE_DIAMONDS_500']
    .forEach(k => check(k + ' EconomyConfig\'te', new RegExp(k + ':\\s*\\d+').test(APP_SRC)));

  // Mağaza satırı gerçek
  const shopRow = APP_SRC.match(/\{[^}]*'Başarımlar'[^}]*\}/);
  check('mağaza "Başarımlar" satırı bulundu', !!shopRow);
  if (shopRow) {
    check('artık "Yakında" değil',
          shopRow[0].indexOf('soon') < 0 && shopRow[0].indexOf('Yakında') < 0, shopRow[0]);
    check('ödülü dinamik (koddan)', /dynamic:\s*'badges'/.test(shopRow[0]));
  }
  check('showAchievements() placeholder toast atmıyor',
        !/function showAchievements\(\)\s*\{\s*showToast/.test(APP_SRC));

  // Statik mockup dizisi kaldırildi
  check('RECENT_BADGES statik dizisi kaldırıldı', !/const RECENT_BADGES = \[/.test(APP_SRC));

  // Oyuna-özel rozet YOK (bu fazın kapsamı disi)
  check('oyuna-özel rozet eklenmemiş',
        !/Sudoku Ustası|Blok Ustası|perGame/.test(code));
}

// ───────────────────────────────────────────────────────────────
//  3. CANLI
// ───────────────────────────────────────────────────────────────
function testLive() {
  console.log('\n3. CANLI — gerçek oyunlar rozeti tetikliyor mu');
  for (const id of GAMES) {
    const { B, s } = boot();
    const PG = s.get('PuzzleGames');
    let err = null;
    try { PG[id].init(stubEl(), undefined); } catch (e) { err = e; }
    const note = err ? '  (init hatası: ' + String(err.message).slice(0, 45) + ')' : '';
    if (B.has('first_game')) ok(id + ' → "İlk Oyun"' + note);
    else bad(id, 'rozet verilmedi' + note);
  }
}

// ───────────────────────────────────────────────────────────────
//  4. UÇTAN UCA
// ───────────────────────────────────────────────────────────────
function testEndToEnd() {
  console.log('\n4. UÇTAN UCA — beş rozet, Plus, UI');

  // ── Ücretsiz oyuncu: hepsini kazan ──
  const a = boot();
  const base = a.DS.get();
  playRounds(a.GE, 10, 'game2048');            // first_game + games_10
  setStreak(a.s, a.store, 7);                  // streak_7
  setStreak(a.s, a.store, 30);                 // streak_30
  a.DS.add(500, null);                         // diamonds_500 (kazanım sayacı)
  eq('beş rozetin beşi de kazanıldı', a.B.count(), 5);
  eq('rozet ödülleri toplamı', a.DS.get() - base - 500, a.B.totalReward());

  // ── UI: dört nokta ──
  a.renderProgress();
  const prg = a.el('progress-content').innerHTML;
  check('İlerleme "Rozet" karosu gerçek sayıyı gösteriyor', prg.indexOf('5/5') >= 0,
        prg.slice(0, 400));
  check('İlerleme "Son Kazanılan" gerçek rozetleri çiziyor',
        prg.indexOf('bdg-gold') >= 0 || prg.indexOf('bdg-cyan') >= 0);
  check('İlerleme ekranında kilitli yuva kalmadı', prg.indexOf('bdg-locked') < 0);

  a.renderShowcase();
  const sc = a.el('pf-showcase').innerHTML;
  check('Profil vitrini 3 rozet çiziyor', (sc.match(/pf-badge/g) || []).length === 3, sc);
  check('vitrinde en değerli rozet var (30 Gün Seri → gold)', sc.indexOf('bdg-gold') >= 0, sc);

  a.renderShop();
  const shop = a.el('shop-free').innerHTML;
  check('mağaza satırı toplam ödülü gösteriyor',
        shop.indexOf('+' + a.B.totalReward() + '💎') >= 0, shop.slice(0, 400));
  check('mağaza satırı durumu gösteriyor', shop.indexOf('Tüm rozetler kazanıldı') >= 0);
  check('mağazada hiç "Yakında" kalmadı', shop.indexOf('Yakında') < 0);

  // ── Plus oyuncu: +%50 ──
  const p = boot();
  p.store['ph_plus'] = JSON.stringify({ active: true });
  const pBase = p.DS.get();
  playRounds(p.GE, 10, 'game2048');
  setStreak(p.s, p.store, 30);
  p.DS.add(500, null);
  eq('Plus: beş rozet de kazanıldı', p.B.count(), 5);
  // Her ödül ayrı ayrı Math.round(x*1.5) — toplamı yuvarlamak yanlış olurdu.
  const plusTotal = p.s.get('BADGES').reduce((s, b) => s + Math.round(b.reward * 1.5), 0);
  eq('Plus: rozet ödülleri +%50', p.DS.get() - pBase - 500, plusTotal);
  check('Plus toplamı ücretsizden yüksek', plusTotal > a.B.totalReward(),
        plusTotal + ' vs ' + a.B.totalReward());

  // ── Kısmi ilerleme: kilitli yuvalar görünüyor mu ──
  const q = boot();
  q.GE.emit('game_started', { gameId: 'sudoku' });
  q.renderShowcase();
  const sc2 = q.el('pf-showcase').innerHTML;
  eq('1 rozetle vitrinde 2 kilitli yuva', (sc2.match(/bdg-locked/g) || []).length, 2);
  q.renderShop();
  check('mağaza satırı 1/5 gösteriyor',
        q.el('shop-free').innerHTML.indexOf('1/5 rozet') >= 0);

  // ── Kapat/aç ──
  const r = boot(a.store);
  eq('kapat/aç: rozetler korunuyor', r.B.count(), 5);
  const rBefore = r.DS.get();
  r.B.check();
  playRounds(r.GE, 5, 'game2048');
  eq('kapat/aç: ödül tekrar verilmiyor', r.DS.get(), rBefore);

  // Bu sistemin en önemli tek garantisi.
  const s2 = boot();
  const s2Base = s2.DS.get();
  playRounds(s2.GE, 40, 'game2048');
  setStreak(s2.s, s2.store, 30);
  s2.DS.add(500, null);
  for (let i = 0; i < 10; i++) s2.B.check();
  eq('değişmez: rozet ödülleri en fazla bir kez', s2.DS.get() - s2Base - 500, s2.B.totalReward());
}

// ───────────────────────────────────────────────────────────────
console.log('SlySwipe — Rozet Sistemi Doğrulaması');
testContract();
testSource();
testLive();
testEndToEnd();

console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
process.exit(failures === 0 ? 0 : 1);

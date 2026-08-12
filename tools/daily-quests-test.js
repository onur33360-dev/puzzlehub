#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Günlük Görev Sistemi Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// DailyQuests'in (core/app.js) sözleşmesini, GameEvents'e BAĞLANMASINI
// ve ekonomiye dokunuşunu doğrular. game-events-test.js'in kardeşi:
// aynı vm+stub deseni (tools/dom-sandbox.js), sıfır bağımlılık, plain
// Node — proje build'siz kalır (bkz. CLAUDE.md §6).
//
//   node tools/daily-quests-test.js
//
// DÖRT KATMAN, dördü de ayrı bir hata sınıfını yakalıyor:
//   1. SÖZLEŞME  — DailyQuests'in kendi mantığı: sayaç, tembel günlük
//                  sıfırlama, settle()'ın idempotentliği, satır türetimi.
//   2. KAYNAK    — core/app.js taraması. Bu sistemin tek gerçek mimari
//                  iddiası "oyun-özel kod yok"; onu ancak kaynağı okuyup
//                  hiçbir oyun kimliğinin geçmediğini göstererek
//                  kanıtlayabiliriz. Ödemenin addReward()'dan geçtiği
//                  (Plus çarpanı) ve mağaza satırının artık "Yakında"
//                  olmadığı da burada sabitleniyor.
//   3. CANLI     — 10 oyunun gerçek init()'i çağrılıyor; sayacın oyun
//                  yazmadan arttığı doğrulanıyor. Kaynak taraması "kod
//                  böyle yazılmış" der, bu katman "gerçekten çalışıyor" der.
//   4. UÇTAN UCA — bir günün tamamı: 45💎 vaadi, Plus'lı hâli, gece
//                  yarısı sıfırlaması ve uygulama kapat/aç kalıcılığı.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, stubEl, readSrc } = require('./dom-sandbox');

const APP_SRC = readSrc('core/app.js');

const GAMES = [
  'game2048', 'memoryGame', 'wordSearch', 'sudoku', 'blockPuzzle',
  'waterSort', 'arrowPuzzle', 'jigsawCard',
];

let failures = 0;
function ok(name)       { console.log('  ✓ ' + name); }
function bad(name, why) { failures++; console.log('  ✗ ' + name + '\n      ' + why); }
function check(name, cond, why) { cond ? ok(name) : bad(name, why || 'beklenen sağlanmadı'); }
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  a === e ? ok(name) : bad(name, 'beklenen ' + e + ', gelen ' + a);
}

// Bu araç YALNIZCA görev ödüllerini ölçüyor. Rozetler (Faz 2b) de aynı
// olaylardan besleniyor ve elmas ödüyor — izole edilmezse buradaki her
// bakiye farkı rozet ödülleriyle kirlenir (eklendiği gün 11 test bu
// yüzden kırıldı). Tüm rozetleri KAZANILMIŞ kabul ediyoruz: Badges.check()
// hiçbir şey ödemez, bakiyedeki her değişim görevlere aittir.
const ALL_BADGE_IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30',
                       'streak_50', 'streak_100', 'streak_250', 'streak_500'];
function badgesPreEarned() {
  return JSON.stringify({
    earned: ALL_BADGE_IDS.map(id => ({ id, earnedAt: 1 })),
  });
}

// Kum havuzu + sık kullanılan globaller tek yerden.
function boot(store) {
  store = store || {};
  if (!store['ph_badges']) store['ph_badges'] = badgesPreEarned();
  const s = makeSandbox(store);
  return {
    s,
    store: s.store,
    DQ: s.get('DailyQuests'),
    GE: s.get('GameEvents'),
    DS: s.get('DiamondSystem'),
    DC: s.get('DailyChallenge'),
    PG: s.get('PuzzleGames'),
    ECON: s.get('EconomyConfig'),
    MISSIONS: s.get('DAILY_MISSIONS'),
    render: () => s.get('renderMissions()'),
    Badges: (boot.__lastBadges = s.get('Badges')),
    renderShop: () => s.get('renderShop()'),
    switchHome: () => s.get("switchTab('home')"),
    el: (id) => s.byId[id],
  };
}

const progressOf = (DQ) => DQ.rows().map(r => r.progress + '/' + r.total);
const doneOf = (DQ) => DQ.rows().map(r => r.done);

// Bir tur oyna: başlat + bitir.
function playRound(GE, gameId, result) {
  GE.emit('game_started', { gameId });
  GE.emit('game_ended', { gameId, result });
}

// "Gece yarısı geçti" — kaydı bir gün ESKİTİR.
// HER İKİ deponun da eskitilmesi ŞART. Gerçek hayatta saat tek bir tane:
// gün dönünce hem ph_daily_quests hem ph_daily_v1 aynı anda dünde kalır.
// Yalnızca birini eskitmek, var olmayan bir durumu ("görev sayacı yeni
// gün, günlük bulmaca hâlâ dün çözülmüş") test etmek olurdu — bu aracın
// ilk çalıştırmasında tam olarak bu yanlış kurgu yakalandı.
function ageOneDay(store) {
  const yDate = new Date(Date.now() - 86400000);
  if (store['ph_daily_quests']) {
    const d = JSON.parse(store['ph_daily_quests']);
    d.date = yDate.toDateString();
    store['ph_daily_quests'] = JSON.stringify(d);
  }
  if (store['ph_daily_v1']) {
    // DailyChallenge.todayKey() biçimi: YYYY-MM-DD (yerel gün).
    const key = yDate.getFullYear() + '-' +
                String(yDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(yDate.getDate()).padStart(2, '0');
    const dc = JSON.parse(store['ph_daily_v1']);
    Object.keys(dc).forEach(id => { if (dc[id].last) dc[id].last = key; });
    store['ph_daily_v1'] = JSON.stringify(dc);
  }
  return store;
}

// ───────────────────────────────────────────────────────────────
//  1. SÖZLEŞME — DailyQuests mantığı
// ───────────────────────────────────────────────────────────────
function testContract() {
  console.log('\n1. SÖZLEŞME — DailyQuests mantığı');
  const { DQ, GE, DS, DC, store } = boot();

  // İzolasyon gerçekten tuttu mu: yeni bir rozet eklenirse bu SESSİZCE
  // bozulmasın, burada yüksek sesle kırılsın.
  const BG = boot.__lastBadges || null;
  check('rozetler izole edildi (hiçbiri ödeme yapmayacak)',
        BG === null || BG.count() === BG.total(),
        'kazanılmış ' + (BG && BG.count()) + '/' + (BG && BG.total()) +
        ' — ALL_BADGE_IDS güncellenmeli');

  eq('taze gün: üç görev de sıfırda', progressOf(DQ), ['0/3', '0/1', '0/1']);
  check('taze gün: hiçbiri tamamlanmamış', doneOf(DQ).every(x => !x));

  // ── "3 oyun oyna" sayacı game_started'dan geliyor ──
  const base = DS.get();
  GE.emit('game_started', { gameId: 'sudoku' });
  eq('game_started sayacı artırıyor', DQ.rows()[0].progress, 1);
  check('tamamlanmamış görev ödenmiyor', DS.get() === base, 'bakiye ' + base + ' → ' + DS.get());

  GE.emit('game_started', { gameId: 'memoryGame' });     // açık turu quit'ler
  GE.emit('game_started', { gameId: 'game2048' });
  eq('3 tur → "3 oyun oyna" tamam', [DQ.rows()[0].progress, DQ.rows()[0].done], [3, true]);
  eq('ödül anında ödendi (+10💎)', DS.get() - base, 10);

  // ── idempotentlik: settle her render'da çalışıyor ──
  DQ.settle(); DQ.settle(); DQ.settle();
  eq('settle() tekrar ödemiyor', DS.get() - base, 10);

  // ── ilerleme toplamda kapanıyor (çubuk %100'ü aşmasın) ──
  GE.emit('game_started', { gameId: 'sudoku' });
  eq('ilerleme total ile sınırlı', DQ.rows()[0].progress, 3);

  // ── "1 oyun kazan" ──
  GE.emit('game_ended', { gameId: 'sudoku', result: 'lost' });
  check('kaybetmek kazanma görevini ilerletmiyor', !DQ.rows()[2].done);
  playRound(GE, 'waterSort', 'won');
  eq('kazanmak görevi tamamlıyor + ödüyor', [DQ.rows()[2].done, DS.get() - base], [true, 20]);

  // ── stray (açık tur yokken gelen bitiş) sayaçlara işlemiyor ──
  const beforeStray = DQ.getData().won;
  GE.emit('game_ended', { gameId: 'sudoku', result: 'won' });   // açık tur yok
  eq('stray game_ended kazanma sayacını artırmıyor', DQ.getData().won, beforeStray);

  // ── "günlük meydan okuma" TÜRETİLİYOR, sayılmıyor ──
  check('günlük görev başta tamamlanmamış', !DQ.rows()[1].done);
  check('ph_daily_quests içinde günlük-çözüldü alanı YOK (tek kaynak ph_daily_v1)',
        !('daily' in DQ.getData()) && !('dailyDone' in DQ.getData()),
        JSON.stringify(DQ.getData()));
  DC.complete('sudoku');
  check('DailyChallenge.complete() görevi tamamlıyor', DQ.rows()[1].done,
        'doneToday okunamadı');
  DQ.settle();
  eq('üçü birden → görev ödülü + bonus', DS.get() - base, 45);
  check('bonus ikinci kez ödenmiyor', (DQ.settle(), DS.get() - base) === 45);

  // ── etiketler ──
  eq('allDone()', DQ.allDone(), true);
  eq('totalReward() EconomyConfig toplamı', DQ.totalReward(), 45);
  eq('shopLabel() tamamlanınca', DQ.shopLabel(), '✅ Bugün tamamlandı');

  // ── TEMBEL günlük sıfırlama (StreakSystem/AdBudget deseni) ──
  ageOneDay(store);
  eq('dünkü kayıt bugün sıfır okunuyor', progressOf(DQ), ['0/3', '0/1', '0/1']);
  check('sıfırlama sonrası ödeme geçmişi de temiz',
        DQ.getData().paid.length === 0 && DQ.getData().bonusPaid === false,
        JSON.stringify(DQ.getData()));
  const afterReset = DS.get();
  DQ.settle();
  // Günlük meydan okuma DÜN çözülmüştü; bugün doneToday false olmalı,
  // yoksa "her gün bedava 15💎" açığı olurdu.
  check('dün çözülen günlük bugün yeniden ödemiyor', DS.get() === afterReset,
        'bakiye ' + afterReset + ' → ' + DS.get());
}

// ───────────────────────────────────────────────────────────────
//  2. KAYNAK — core/app.js taraması
// ───────────────────────────────────────────────────────────────
function testSource() {
  console.log('\n2. KAYNAK — core/app.js taraması');

  const start = APP_SRC.indexOf('const DailyQuests = {');
  const end = APP_SRC.indexOf("GameEvents.on('game_ended'", start);
  check('DailyQuests bloğu bulundu', start > 0 && end > start);
  const block = APP_SRC.slice(start, end);
  // Yorumlar hariç: gerekçe metinlerinde oyun adı geçebilir, KOD'da geçemez.
  const code = block.split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  // Bu sistemin tek mimari iddiası bu.
  const leaked = GAMES.filter(g => code.indexOf("'" + g + "'") >= 0);
  check('hiçbir oyun kimliği geçmiyor (evrensel)', leaked.length === 0,
        'sızan: ' + leaked.join(', '));

  check('GameEvents game_started aboneliği var',
        /GameEvents\.on\(\s*'game_started'/.test(APP_SRC));
  check('GameEvents game_ended aboneliği var',
        /GameEvents\.on\(\s*'game_ended'/.test(APP_SRC));

  // Ödeme addReward()'dan geçmeli: Plus +%50 çarpanı oraya bağlı.
  // Düz add() kullanılsaydı Plus faydası sessizce kaybolurdu.
  check('ödemeler addReward() ile (Plus +%50 çarpanı)',
        /DiamondSystem\.addReward\(/.test(code) && !/DiamondSystem\.add\(/.test(code),
        'add() kullanımı bulundu veya addReward() yok');

  // Günlük sıfırlama deseni: üç sistem aynı tarih tanımını kullanmalı.
  check('sıfırlama toDateString() deseniyle (StreakSystem/AdBudget ile aynı)',
        /toDateString\(\)/.test(code));
  const dateFns = ['ph_daily_quests'];
  check('kendi anahtarını kullanıyor', dateFns.every(k => code.indexOf(k) >= 0));

  // Günlük görev, günlüğü ÇÖZME bilgisini kendi tutmamalı.
  check('günlük meydan okuma DailyChallenge\'dan türetiliyor',
        /DailyChallenge\.state\(/.test(code) && /DailyChallenge\.games\(\)/.test(code));

  // Mağaza satırı: artık "Yakında" değil.
  const shopRow = APP_SRC.match(/\{[^}]*'Günlük Görevler'[^}]*\}/);
  check('mağaza satırı bulundu', !!shopRow);
  if (shopRow) {
    check('mağaza "Günlük Görevler" satırı artık Yakında değil',
          shopRow[0].indexOf('soon') < 0 && shopRow[0].indexOf('Yakında') < 0,
          shopRow[0]);
    check('mağaza satırı ödülü dinamik (koddan okunuyor)',
          /dynamic:\s*'quests'/.test(shopRow[0]), shopRow[0]);
  }

  // Görev tanımları ile rows()'un ele aldığı kimlikler aynı olmalı;
  // ayrışırlarsa görev ekranda görünür ama hiç ilerlemez.
  const ids = (APP_SRC.match(/\{\s*id:'(\w+)'/g) || []).map(s => s.match(/'(\w+)'/)[1]);
  const handled = ['play3', 'daily', 'win1'];
  eq('DAILY_MISSIONS kimlikleri rows() ile aynı', ids.slice(0, 3), handled);
  handled.forEach(id => check("rows() '" + id + "' kimliğini ele alıyor",
                              code.indexOf("'" + id + "'") >= 0));

  // Ekonomi sayıları EconomyConfig'te, satır içinde değil.
  check('ödül miktarları EconomyConfig\'ten',
        /QUEST_PLAY_REWARD/.test(APP_SRC) && /QUEST_DAILY_REWARD/.test(APP_SRC) &&
        /QUEST_WIN_REWARD/.test(APP_SRC) && /QUEST_ALL_BONUS/.test(APP_SRC));
}

// ───────────────────────────────────────────────────────────────
//  3. CANLI — gerçek oyunlar sayacı besliyor mu
// ───────────────────────────────────────────────────────────────
function testLive() {
  console.log('\n3. CANLI — 10 oyunun init() çağrısı görevi ilerletiyor');
  for (const id of GAMES) {
    const { DQ, PG } = boot();
    const mod = PG[id];
    if (!mod) { bad(id, 'PuzzleGames kaydında yok'); continue; }
    let err = null;
    try { mod.init(stubEl(), undefined); } catch (e) { err = e; }
    const note = err ? '  (init hatası: ' + String(err.message).slice(0, 50) + ')' : '';
    const p = DQ.rows()[0].progress;
    if (p === 1) ok(id + ' → "3 oyun oyna" 1/3' + note);
    else bad(id, 'beklenen 1, gelen ' + p + note);
  }

  // Üç FARKLI oyun arka arkaya — cihaz testinin birebir karşılığı.
  console.log('\n   3 farklı oyun arka arkaya:');
  const { DQ, DS, PG } = boot();
  const base = DS.get();
  ['game2048', 'memoryGame', 'wordSearch'].forEach(id => {
    try { PG[id].init(stubEl(), undefined); } catch (e) {}
  });
  eq('3 farklı oyun → görev tamam', [DQ.rows()[0].progress, DQ.rows()[0].done], [3, true]);
  eq('elmas ödendi', DS.get() - base, 10);
}

// ───────────────────────────────────────────────────────────────
//  4. UÇTAN UCA — bir günün tamamı
// ───────────────────────────────────────────────────────────────
function testEndToEnd() {
  console.log('\n4. UÇTAN UCA — bir gün, sıfırlama, kapat/aç');

  // ── Ücretsiz oyuncu: tam gün 45💎 ──
  const a = boot();
  const base = a.DS.get();
  playRound(a.GE, 'game2048', 'lost');
  playRound(a.GE, 'memoryGame', 'lost');
  playRound(a.GE, 'waterSort', 'won');
  a.DC.complete('sudoku');
  a.switchHome();                       // oyundan çıkış → ana ekran render'ı
  eq('ücretsiz oyuncu: gün sonu 45💎', a.DS.get() - base, 45);
  eq('üç görev de tamam', doneOf(a.DQ), [true, true, true]);

  // Mağaza satırı gerçek veriyi gösteriyor mu (metin koda bağlı mı).
  a.renderShop();
  const shopHtml = a.el('shop-free').innerHTML;
  check('mağaza satırı "+45💎" gösteriyor', shopHtml.indexOf('+45💎') >= 0,
        shopHtml.slice(0, 300));
  check('mağaza satırı durumu gösteriyor', shopHtml.indexOf('Bugün tamamlandı') >= 0);
  // 2026-08-01: Başarımlar satırı da gerçek oldu (Faz 2b), artık mağazada
  // hiç "Yakında" yok — dört kaynağın dördü de çalışan bir sistem.
  check('mağazada hiç "Yakında" kalmadı',
        (shopHtml.match(/Yakında/g) || []).length === 0, shopHtml.slice(0, 400));

  // Ana ekran satırları gerçek ilerlemeyi çiziyor mu.
  a.render();
  const missionHtml = a.el('daily-missions').innerHTML;
  check('görev kartı "1 oyun kazan" satırını çiziyor',
        missionHtml.indexOf('1 oyun kazan') >= 0, missionHtml.slice(0, 200));
  check('görev kartı 3 / 3 gösteriyor', missionHtml.indexOf('3 / 3') >= 0);
  check('eski statik "Kişisel rekorunu geliştir" görevi kalmadı',
        missionHtml.indexOf('Kişisel rekor') < 0);

  // ── Plus oyuncu: aynı gün, +%50 ──
  const b = boot();
  b.store['ph_plus'] = JSON.stringify({ active: true });
  const bBase = b.DS.get();
  playRound(b.GE, 'game2048', 'lost');
  playRound(b.GE, 'memoryGame', 'lost');
  playRound(b.GE, 'waterSort', 'won');
  b.DC.complete('sudoku');
  b.switchHome();
  // 15 + 23 + 15 + 15 = 68 (Math.round(15*1.5) = 23)
  eq('Plus oyuncu: gün sonu 68💎 (+%50)', b.DS.get() - bBase, 68);

  // ── Kapat/aç: aynı disk, yeni oturum ──
  const c = boot(a.store);
  eq('kapat/aç: görev ilerlemesi korunuyor', doneOf(c.DQ), [true, true, true]);
  const cBefore = c.DS.get();
  c.switchHome();
  eq('kapat/aç: ödül İKİNCİ kez verilmiyor', c.DS.get(), cBefore);
  eq('kapat/aç: sayaç korunuyor', c.DQ.getData().played, 3);

  // ── Gece yarısı: gün değişti ──
  const d = boot(ageOneDay(c.store));
  eq('yeni gün: görevler sıfırlandı', progressOf(d.DQ), ['0/3', '0/1', '0/1']);
  const dBase = d.DS.get();
  playRound(d.GE, 'game2048', 'lost');
  playRound(d.GE, 'memoryGame', 'lost');
  playRound(d.GE, 'sudoku', 'won');
  eq('yeni gün: görevler yeniden kazanılabiliyor', d.DS.get() - dBase, 20);
  check('yeni gün: dünkü günlük meydan okuma tekrar ödenmiyor',
        !d.DQ.rows()[1].done, 'günlük görev yanlışlıkla tamam görünüyor');

  // Bu sistemin en önemli tek garantisi: bir gün 45💎'den fazlası çıkamaz.
  const e = boot();
  const eBase = e.DS.get();
  for (let i = 0; i < 20; i++) playRound(e.GE, 'game2048', 'won');
  e.DC.complete('sudoku');
  for (let i = 0; i < 10; i++) e.switchHome();
  eq('değişmez: bir günde en fazla 45💎', e.DS.get() - eBase, 45);
}

// ───────────────────────────────────────────────────────────────
console.log('SlySwipe — Günlük Görev Sistemi Doğrulaması');
testContract();
testSource();
testLive();
testEndToEnd();

console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
process.exit(failures === 0 ? 0 : 1);

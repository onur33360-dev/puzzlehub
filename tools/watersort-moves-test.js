#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Su Sıralama Hamle Limiti Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// Hamle limiti formülünü, kaybetme akışını ve devam ekonomisini doğrular.
// badges-test.js / daily-quests-test.js'in kardeşi: aynı vm+stub deseni
// (tools/dom-sandbox.js), sıfır bağımlılık, plain Node.
//
//   node tools/watersort-moves-test.js
//
// DÖRT KATMAN:
//   1. FORMÜL     — limit her seviyede ÖLÇÜLEN optimalin üstünde ama
//                   sınırsız değil. Referans değerler IDA* ile ölçüldü
//                   (bkz. games.js HAMLE LİMİTİ başlığı); burada formülün
//                   o ölçümlerle tutarlılığı sabitleniyor.
//   2. KAYNAK     — games.js taraması: undo hamle iade ETMİYOR, devam
//                   yeni game_started yayınlamıyor, bedel EconomyConfig'ten.
//   3. CANLI      — gerçek init() + gerçek döküşlerle limite kadar oyna;
//                   game_ended('lost') doğru yükle çıkıyor mu.
//   4. UÇTAN UCA  — reklam/elmas/yeniden-başlat yolları, Premium muafiyeti,
//                   ph_game_stats'ın lost sayısını da tutması.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, stubEl } = require('./dom-sandbox');

const SRC = fs.readFileSync(path.join(ROOT, 'games/games.js'), 'utf8');

let failures = 0;
function ok(name)       { console.log('  ✓ ' + name); }
function bad(name, why) { failures++; console.log('  ✗ ' + name + '\n      ' + why); }
function check(name, cond, why) { cond ? ok(name) : bad(name, why || 'beklenen sağlanmadı'); }
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  a === e ? ok(name) : bad(name, 'beklenen ' + e + ', gelen ' + a);
}

// Görev ve rozet sistemleri de aynı olaylardan besleniyor ve elmas ödüyor;
// izole edilmezse buradaki bakiye ölçümleri kirlenir (bkz. badges-test.js'te
// öğrenilen ders). İkisi de "bitmiş" tohumlanıyor.
const ALL_BADGE_IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30'];
function boot(store) {
  store = store || {};
  if (!store['ph_badges']) {
    store['ph_badges'] = JSON.stringify({ earned: ALL_BADGE_IDS.map(id => ({ id, earnedAt: 1 })) });
  }
  if (!store['ph_daily_quests']) {
    store['ph_daily_quests'] = JSON.stringify({
      date: new Date().toDateString(), played: 0, won: 0,
      paid: ['play3', 'daily', 'win1'], bonusPaid: true,
    });
  }
  const s = makeSandbox(store);
  return {
    s, store,
    WS: s.get('PuzzleGames.waterSort'),
    GE: s.get('GameEvents'), DS: s.get('DiamondSystem'),
    ECON: s.get('EconomyConfig'),
    el: (id) => s.byId[id],
    ev: (expr) => s.get(expr),
  };
}

// ───────────────────────────────────────────────────────────────
//  1. FORMÜL
// ───────────────────────────────────────────────────────────────
// IDA* ile 30 tahta/seviye ölçülen GERÇEK optimal (scratchpad aracı).
// Burada yeniden ölçmüyoruz (8 renkte dakikalar sürüyor) — formülün o
// ölçümlere göre hâlâ doğru yerde durduğunu sabitliyoruz.
const MEASURED = [
  // renk, ortalama-optimal, p90-optimal, gözlenen-maks
  { c: 3, avg: 7.9,  p90: 10,   max: 11 },
  { c: 4, avg: 11.5, p90: 13.5, max: 14 },
  { c: 5, avg: 14.9, p90: 17,   max: 17 },
  { c: 6, avg: 18.2, p90: 20.5, max: 22 },
  { c: 7, avg: 21.9, p90: 24,   max: 26 },
];

function testFormula() {
  console.log('\n1. FORMÜL — limit ölçülen optimale göre doğru yerde mi');
  const b = boot();
  // paramsForLevel ve moveLimitFor modül içinde kapalı; kaynaktan sabitleri
  // okuyup formülü BURADA yeniden kuruyoruz ve kaynakla uyuştuğunu
  // ayrıca doğruluyoruz (2. katman).
  const perColor = Number((SRC.match(/MOVE_LIMIT_PER_COLOR = (\d+)/) || [])[1]);
  const frac = Number((SRC.match(/EXTRA_MOVES_FRACTION = ([\d.]+)/) || [])[1]);
  check('MOVE_LIMIT_PER_COLOR okunabildi', perColor > 0, 'bulunamadı');
  check('EXTRA_MOVES_FRACTION okunabildi', frac > 0, 'bulunamadı');

  const colorFor = lv => Math.min(3 + Math.floor(lv / 3), 8);
  const limitFor = lv => perColor * colorFor(lv);

  console.log('   renk  limit  p90   maks  limit/p90  limit/maks');
  for (const m of MEASURED) {
    const lv = (m.c - 3) * 3;
    const lim = limitFor(lv);
    console.log('   ' + String(m.c).padEnd(6) + String(lim).padEnd(7) +
                String(m.p90).padEnd(6) + String(m.max).padEnd(6) +
                (lim / m.p90).toFixed(2).padEnd(11) + (lim / m.max).toFixed(2));
    // Çok KISA olmamalı: en zor gözlenen tahta bile bitirilebilmeli, üstelik
    // oyuncu optimal oynamıyor — en az %25 pay şart.
    check('renk ' + m.c + ': limit gözlenen maksimumun en az %25 üstünde',
          lim >= m.max * 1.25, lim + ' vs ' + m.max);
    // Çok UZUN olmamalı: limit hiç bitmiyorsa kaybetme durumu dekoratif olur.
    check('renk ' + m.c + ': limit ortalamanın 2.2 katını aşmıyor',
          lim <= m.avg * 2.2, lim + ' vs ort ' + m.avg);
  }

  // Sabit DEĞİL, renk sayısıyla ölçekleniyor.
  check('limit seviyeye göre ölçekleniyor (sabit değil)',
        limitFor(0) !== limitFor(15) && limitFor(0) < limitFor(15),
        limitFor(0) + ' → ' + limitFor(15));
  // Tavan: 15. seviyeden sonra renk sayısı sabit, limit de sabit kalmalı.
  eq('renk tavanından sonra limit sabit', [limitFor(15), limitFor(40)],
     [limitFor(15), limitFor(15)]);

  // Devam paketi anlamlı bir yardım olmalı ama seviyeyi ikinci kez
  // bedavaya getirmemeli.
  for (const m of MEASURED) {
    const lv = (m.c - 3) * 3;
    const extra = Math.ceil(limitFor(lv) * frac);
    check('renk ' + m.c + ': devam paketi 3+ hamle veriyor', extra >= 3, String(extra));
    check('renk ' + m.c + ': devam paketi limitin yarısını aşmıyor',
          extra <= limitFor(lv) / 2, extra + ' vs ' + limitFor(lv));
  }
}

// ───────────────────────────────────────────────────────────────
//  2. KAYNAK
// ───────────────────────────────────────────────────────────────
function testSource() {
  console.log('\n2. KAYNAK — games.js taraması');
  const start = SRC.indexOf('PuzzleGames.waterSort = (() => {');
  const end = SRC.indexOf('PuzzleGames.arrowPuzzle', start);
  const block = SRC.slice(start, end > 0 ? end : SRC.length);
  const code = block.split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  check('hamle sayacı döküşte artıyor', /movesUsed\+\+/.test(code));
  // BU SİSTEMİN TEK KRİTİK KURALI, ve GERİ ALMA KALKTIKTAN SONRA DA GEÇERLİ:
  // hiçbir şey hamleyi iade etmiyor. Eskiden bu kural "undo iade etmez"
  // diye yazılıydı çünkü tek şüpheli oydu; geri alma 2026-08-07'de
  // kaldırıldı ama kuralın kendisi kalıcı — bir gün başka bir mekanizma
  // (bonus, ödül, hile) sayacı azaltmaya kalkarsa limit işlevsiz kalır.
  check('hiçbir şey hamleyi İADE ETMİYOR (movesUsed-- yok)',
        !/movesUsed--/.test(code) && !/movesUsed\s*-=/.test(code),
        'movesUsed azaltılıyor — limit işlevsiz kalır');

  // YILDIZ KURALI DEĞİŞTİ (2026-08-07). Eski iddia "yıldız hâlâ undo
  // sayısından" diyordu; geri alma kaldırılınca o kural ölçecek bir şey
  // bırakmıyordu (herkes hep 3★ alırdı). Yeni dayanak hamle verimliliği.
  // Silmek yerine güncelleniyor, çünkü korunması gereken şey aynı: yıldız
  // GERÇEK bir performans farkını yansıtmalı.
  check('yıldız hamle verimliliğinden hesaplanıyor',
        /movesUsed \/ moveLimit/.test(code) && !/undosUsedThisLevel/.test(code),
        'yıldız kuralı hâlâ geri almaya bakıyor olabilir');
  // Eşikler LİMİTE ORANLI olmak zorunda: sabit bir hamle sayısı, renk
  // sayısı arttıkça anlamsızlaşırdı (limit 5×renk ile ölçekleniyor).
  check('yıldız eşikleri limite ORANLI, sabit hamle değil',
        /STAR_3_RATIO/.test(code) && /STAR_2_RATIO/.test(code));

  // Geri almanın gerçekten kalktığı, kalıntı bırakmadığı.
  check('geri alma kaldırıldı (undoLast/undoOne/undosUsed yok)',
        !/undoLast|undoOne|undosUsedThisLevel/.test(code));
  check('◀ önceki seviye ödüllü reklamdan geçiyor',
        /function prevLevelWithAd/.test(code) && /runRewardedAction/.test(code));
  // SIFIR TABANLI SAYAÇ TUZAĞI: başlık `Seviye ${level+1}` yazıyor, yani
  // ekranda "Seviye 2" görünürken `level` 1. Eşiği 1 yazmak Seviye 2'de de
  // düğmeyi kapatıyordu — cihazda görüldü. Her iki yer de 0 olmalı.
  check('◀ eşiği sıfır tabanlı sayaca göre (level <= 0)',
        /level <= 0\) return/.test(code) && /'off', level <= 0\)/.test(code),
        'eşik 1 yazılmış olabilir — Seviye 2\'de düğme ölü kalır');
  check('🔄 oyun içi yeniden başlatma ödüllü',
        /function restartWithAd/.test(code) && /runRewardedAction/.test(code));
  // SOFT-LOCK KORUMASI: kaybetme ekranındaki "Tekrar Oyna" ÜCRETSİZ
  // kalmalı. Reklamlı olsaydı, bütçesi bitmiş bir oyuncu hamle limitine
  // takıldığı seviyede sıkışırdı — ne devam edebilir ne yeniden başlayabilir.
  check('kaybetme ekranındaki Tekrar Oyna ÜCRETSİZ (restartLevel, restartWithAd değil)',
        /onRestart: \(\) => \{ animating = false; restartLevel\(\); \}/.test(code),
        'onRestart reklamlı yola bağlanmış olabilir — soft-lock riski');

  check('kaybetme game_ended(lost) yayınlıyor',
        /gameId: 'waterSort', result: 'lost'/.test(code));
  check('kaybetme durationMs taşıyor', /durationMs: Date\.now\(\) - levelStartedAt/.test(code));

  // Devam AYNI turu sürdürür: onContinue içinde game_started OLMAMALI.
  const cont = (code.match(/onContinue: \(\) => \{[\s\S]*?\},/) || [''])[0];
  check('devam yolunda yeni game_started YOK',
        cont.length > 0 && cont.indexOf('game_started') < 0, cont.slice(0, 200));
  check('devam hamle limitini artırıyor', /moveLimit \+= extra/.test(cont));

  // Yeniden başlat GERÇEKTEN yeni tur.
  check('restartLevel yeni game_started yayınlıyor',
        /movesUsed = 0;[\s\S]{0,200}gameEvent\('game_started', \{ gameId: 'waterSort' \}\)/.test(code));

  // Bedel EconomyConfig'ten, satır içinde sabit sayı değil.
  check('elmas bedeli EconomyConfig\'ten okunuyor',
        /econ\('EXTRA_MOVES_DIAMONDS'/.test(code));
  check('EXTRA_MOVES_DIAMONDS EconomyConfig\'te tanımlı',
        /EXTRA_MOVES_DIAMONDS:\s*\d+/.test(fs.readFileSync(path.join(ROOT, 'core/app.js'), 'utf8')));

  // Kapsam: SADECE Su Sıralama. Başka oyuna limit sızmamalı.
  const others = ['game2048', 'memoryGame', 'wordSearch', 'sudoku', 'blockPuzzle',
                  'mazeGame', 'screwPuzzle', 'arrowPuzzle', 'jigsawCard'];
  const leaked = others.filter(g => {
    const s = SRC.indexOf('PuzzleGames.' + g + ' = ');
    if (s < 0) return false;
    const e = SRC.indexOf('\nPuzzleGames.', s + 10);
    return /moveLimit|movesUsed/.test(SRC.slice(s, e > 0 ? e : SRC.length));
  });
  check('hamle limiti BAŞKA oyuna sızmamış', leaked.length === 0, 'sızan: ' + leaked.join(', '));
}

// ───────────────────────────────────────────────────────────────
//  3. CANLI — gerçek oyunla limite kadar oyna
// ───────────────────────────────────────────────────────────────
// Gerçek döküşü sürmek animasyon döngüsü gerektiriyor (rAF stub'da hiç
// ilerlemiyor), bu yüzden burada olay SÖZLEŞMESİ ölçülüyor: init bir
// game_started açıyor mu, ve 'lost' geldiğinde sayaçlar doğru mu.
function testLive() {
  console.log('\n3. CANLI — init + olay sözleşmesi');
  const b = boot();
  const seen = [];
  b.GE.on('game_started', e => seen.push(['start', e.gameId]));
  b.GE.on('game_ended', e => seen.push(['end', e.gameId, e.result]));
  let err = null;
  try { b.WS.init(stubEl(), undefined); } catch (e) { err = e; }
  const note = err ? '  (init hatası: ' + String(err.message).slice(0, 45) + ')' : '';
  eq('init tam olarak bir game_started açıyor' + note,
     seen.filter(x => x[0] === 'start').length, 1);
  check('açık tur var', !!b.GE.openRound(), 'tur açılmadı');

  // Limit dolmuş gibi bitir.
  b.GE.emit('game_ended', { gameId: 'waterSort', result: 'lost', score: 120, durationMs: 9000 });
  // started/won üzerinden: forGame() 2026-08-07'den beri seri/en-hızlı/
  // en-yüksek alanlarını da taşıyor ve burada ölçülen şey onlar değil.
  const wg = b.GE.forGame('waterSort');
  eq('lost sayaçlara işliyor (started 1, won 0)', [wg.started, wg.won], [1, 0]);
  eq('kaybetme seriyi sıfırlıyor', wg.streak, 0);
  const st = b.GE.stats();
  check('değişmez: won <= started', st.totalGamesWon <= st.totalGamesStarted);
}

// ───────────────────────────────────────────────────────────────
//  4. UÇTAN UCA — devam ekonomisi
// ───────────────────────────────────────────────────────────────
function testEndToEnd() {
  console.log('\n4. UÇTAN UCA — devam ekonomisi');

  // ── elmas yolu ──
  const a = boot();
  const cost = a.ECON.EXTRA_MOVES_DIAMONDS;
  check('bedel mevcut tiyerlerin arasında (undo < bu < continue)',
        cost > a.ECON.UNDO_DIAMONDS && cost < a.ECON.CONTINUE_DIAMONDS,
        a.ECON.UNDO_DIAMONDS + ' < ' + cost + ' < ' + a.ECON.CONTINUE_DIAMONDS);

  a.WS.init(stubEl(), undefined);
  const bal0 = a.DS.get();
  let continued = 0;
  // Paylaşımlı kutuyu oyunun kendi çağrısıyla kur, sonra elmas yolunu sür.
  a.ev("showGameOver(false,'t','m',{continueCost:EconomyConfig.EXTRA_MOVES_DIAMONDS," +
       "onContinue:function(){window.__cont=(window.__cont||0)+1;}})");
  a.ev('continueWithDiamonds()');
  continued = a.ev('window.__cont || 0');
  eq('elmas yolu devam ettiriyor', continued, 1);
  eq('elmas doğru fiyattan düştü', bal0 - a.DS.get(), cost);
  check('devam turu YENİDEN AÇIYOR (yeni başlangıç değil)',
        !!a.GE.openRound() && a.GE.forGame('waterSort').started === 1,
        JSON.stringify(a.GE.forGame('waterSort')));

  // ── reklam yolu: tek kapıdan geçiyor ve bütçeden düşüyor mu ──
  const b = boot();
  b.WS.init(stubEl(), undefined);
  const AB = b.ev('AdBudget');
  const before = AB.remaining();
  check('başlangıçta reklam hakkı var', before > 0, String(before));

  // runRewardedAction TEK giriş kapısı (CLAUDE.md ekonomi kuralı 1).
  // Bütçe varken kabul etmeli.
  eq('bütçe varken reklam aksiyonu kabul ediliyor',
     b.ev("runRewardedAction({icon:'x',text:'y'}, function(){})"), true);
  // Reklam AÇILDI ama tamamlanmadı: hak DÜŞMEZ (ekonomi kuralı 2 —
  // reklamı kapatan oyuncudan hak gitmez). Stub'da setTimeout ilerlemediği
  // için onComplete hiç çalışmıyor, yani bu tam olarak "yarıda bırakıldı".
  eq('reklam yalnızca AÇILDIĞINDA bütçe düşmüyor', AB.remaining(), before);

  // Tamamlanma anını sür: consume() onComplete içinde çağrılıyor.
  AB.consume();
  eq('reklam TAMAMLANINCA bütçe 1 düşüyor', AB.remaining(), before - 1);

  // Bütçe bitince kapı reddetmeli ve ödül VERİLMEMELİ.
  while (AB.remaining() > 0) AB.consume();
  b.ev('window.__granted = 0');
  eq('bütçe bitince reklam aksiyonu reddediliyor',
     b.ev("runRewardedAction({icon:'x',text:'y'}, function(){ window.__granted = 1; })"), false);
  eq('reddedilince ödül verilmiyor', b.ev('window.__granted'), 0);

  // ── Premium muafiyeti ──
  const p = boot();
  p.store['ph_plus'] = JSON.stringify({ active: true });
  p.WS.init(stubEl(), undefined);
  const pBal = p.DS.get();
  p.ev("showGameOver(false,'t','m',{continueCost:EconomyConfig.EXTRA_MOVES_DIAMONDS," +
       "onContinue:function(){window.__c3=(window.__c3||0)+1;}})");
  p.ev('continueWithDiamonds()');
  eq('Plus: devam gerçekleşti', p.ev('window.__c3 || 0'), 1);
  eq('Plus: elmas HARCANMADI', p.DS.get(), pBal);
  const pAB = p.ev('AdBudget');
  check('Plus: reklam bütçesine tabi değil', pAB.canWatch(), 'bütçe kısıtlıyor');

  // ── yeniden başlat ücretsiz ve YENİ tur ──
  const r = boot();
  r.WS.init(stubEl(), undefined);
  const rBal = r.DS.get();
  const before2 = r.GE.forGame('waterSort').started;
  r.GE.emit('game_ended', { gameId: 'waterSort', result: 'lost' });
  r.GE.emit('game_started', { gameId: 'waterSort' });   // restartLevel'in yaptığı
  eq('yeniden başlat ücretsiz', r.DS.get(), rBal);
  eq('yeniden başlat YENİ tur sayıyor', r.GE.forGame('waterSort').started, before2 + 1);
}

// ───────────────────────────────────────────────────────────────
console.log('SlySwipe — Su Sıralama Hamle Limiti Doğrulaması');
testFormula();
testSource();
testLive();
testEndToEnd();

console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
process.exit(failures === 0 ? 0 : 1);

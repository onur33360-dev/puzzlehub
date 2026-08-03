#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Geçiş Reklamı (Interstitial) Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/interstitial-test.js
//
// Kardeş araçlarla (game-events, daily-quests, badges, ad-consent) aynı
// dört katman. Burada test edilen şey SDK değil — SDK cihazda çalışıyor —
// BİZİM sıklık mantığımız: iki eksenin her birinin tek başına engelleyip
// engellemediği, muafiyetler ve gösterilemeyen reklamın hiçbir şey
// tüketmediği.
//
// Kum havuzuna SAHTE bir Capacitor.Plugins.AdMob enjekte ediliyor
// (ad-consent-test.js'teki desen). Fark: bu sahte eklenti dinleyicileri
// SAKLIYOR ve `fire()` ile tetikleyebiliyor — çünkü buradaki asıl soru
// "hangi OLAY sayacı sıfırlar" (Showed mı, Dismissed mı).

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox } = require('./dom-sandbox');

const APP_SRC = fs.readFileSync(path.join(ROOT, 'core/app.js'), 'utf8');

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

const MIN = 60 * 1000;

// ───────── sahte eklenti ─────────
function fakePlugin(cfg) {
  cfg = cfg || {};
  const calls = [], listeners = {};
  const info = cfg.info || {
    status: 'NOT_REQUIRED', canRequestAds: true,
    privacyOptionsRequirementStatus: 'NOT_REQUIRED', isConsentFormAvailable: false,
  };
  return {
    calls, listeners,
    names() { return calls.map(c => c[0]); },
    fire(ev, arg) { (listeners[ev] || []).forEach(f => f(arg)); },

    requestConsentInfo() { calls.push(['requestConsentInfo']); return Promise.resolve(info); },
    showConsentForm()    { calls.push(['showConsentForm']);    return Promise.resolve(info); },
    initialize()         { calls.push(['initialize']);         return Promise.resolve(); },
    addListener(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
      return Promise.resolve({ remove() {} });
    },
    prepareInterstitial(o) {
      calls.push(['prepareInterstitial', o && o.adId]);
      return cfg.prepareError ? Promise.reject(new Error(cfg.prepareError)) : Promise.resolve();
    },
    showInterstitial() { calls.push(['showInterstitial']); return Promise.resolve(); },
    // Ödüllü akış aynı SDK nesnesinde — köprü testi (5. bölüm) için lazım.
    prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o && o.adId]); return Promise.resolve(); },
    showRewardVideoAd()     { calls.push(['showRewardVideoAd']); return Promise.resolve(); },
  };
}

// Rozet ve görev sistemleri AYNI oyun olaylarından besleniyor ve ikisi de
// elmas ödüyor. İzole edilmezlerse buradaki olay akışı onların ödüllerini
// tetikler ve gürültü yaratır (kardeş araçlarda öğrenilen ders).
const ALL_BADGE_IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30'];

function boot(cfg) {
  cfg = cfg || {};
  const store = {
    ph_badges: JSON.stringify({ earned: ALL_BADGE_IDS.map(id => ({ id, earnedAt: 1 })) }),
    ph_daily_quests: JSON.stringify({
      date: new Date().toDateString(), played: 0, won: 0,
      paid: ['play3', 'daily', 'win1'], bonusPaid: true,
    }),
  };
  if (cfg.plus) {
    store.ph_plus = JSON.stringify({ active: true, plan: 'monthly',
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
  }
  if (cfg.state) store.ph_interstitial = JSON.stringify(cfg.state);

  const s = makeSandbox(store);
  let plugin = null;
  if (cfg.native) {
    plugin = fakePlugin(cfg);
    s.sb.Capacitor = { isNativePlatform: () => true, Plugins: { AdMob: plugin } };
  }
  const IA = s.get('InterstitialAds');
  const AC = s.get('AdConsent');
  AC._promise = null; AC._info = null;   // her senaryo temiz rıza ile başlasın
  IA._showing = false;
  return { s, IA, AC, plugin, store, get: s.get,
           data: () => JSON.parse(store.ph_interstitial || '{}') };
}

// Promise zincirinin çözülmesi için birkaç mikro-görev turu.
const wait = () => new Promise(r => setImmediate(r));
async function flush(n) { for (let i = 0; i < (n || 6); i++) await wait(); }

(async function () {
  console.log('SlySwipe — Geçiş Reklamı (Interstitial) Doğrulaması');

  // ═════════ 1. İKİ EKSENLİ SINIR ═════════
  // Asıl iddia: her iki koşul da AYRI AYRI kontrol ediliyor. Bunu
  // kanıtlamanın tek yolu, birini sağlayıp diğerini sağlamamak.
  console.log('\n1. İKİ EKSENLİ SINIR');
  {
    const now = Date.now();
    const cases = [
      // [ad,                                              rounds, lastShownAt,     beklenen]
      ['hiç tur yok → gösterilmez',                              0, 0,              false],
      ['2 tur (eşiğin altı) → gösterilmez',                      2, 0,              false],
      ['3 tur + hiç gösterilmemiş → GÖSTERİLİR',                 3, 0,              true ],
      ['3 tur ama gösterim AZ ÖNCE → gösterilmez',               3, now,            false],
      ['3 tur + 2dk59sn (eşiğin hemen altı) → gösterilmez',      3, now - 179000,   false],
      ['3 tur + 3dk01sn → GÖSTERİLİR',                           3, now - 181000,   true ],
      ['SÜRE tamam ama TUR eksik (10dk / 2 tur) → gösterilmez',  2, now - 10 * MIN, false],
      ['TUR tamam ama SÜRE eksik (1dk / 5 tur) → gösterilmez',   5, now - 1 * MIN,  false],
      ['ikisi de tamam (10dk / 5 tur) → GÖSTERİLİR',             5, now - 10 * MIN, true ],
    ];
    for (const [name, rounds, lastShownAt, want] of cases) {
      const b = boot({ state: { rounds, lastShownAt } });
      eq(name, b.IA.canShow(now), want);
    }
  }

  // Eşikler koda gömülü değil, EconomyConfig'ten geliyor mu?
  {
    const b = boot({});
    eq('eşik EconomyConfig.INTERSTITIAL_MIN_ROUNDS ile aynı',
       b.IA.minRounds(), b.get('EconomyConfig.INTERSTITIAL_MIN_ROUNDS'));
    eq('eşik EconomyConfig.INTERSTITIAL_MIN_INTERVAL_MS ile aynı',
       b.IA.minIntervalMs(), b.get('EconomyConfig.INTERSTITIAL_MIN_INTERVAL_MS'));
    eq('süre eşiği 3 dakika', b.IA.minIntervalMs(), 3 * MIN);
    eq('tur eşiği 3', b.IA.minRounds(), 3);
  }

  // ═════════ 2. SAYAÇ (GameEvents entegrasyonu) ═════════
  console.log('\n2. SAYAÇ');
  {
    const b = boot({});
    const GE = b.get('GameEvents');
    eq('başlangıçta 0 tur', b.IA.rounds(), 0);

    GE.emit('game_started', { gameId: 'memoryGame' });
    GE.emit('game_ended',   { gameId: 'memoryGame', result: 'won' });
    eq("kazanılan tur sayılıyor", b.IA.rounds(), 1);

    GE.emit('game_started', { gameId: 'waterSort' });
    GE.emit('game_ended',   { gameId: 'waterSort', result: 'lost' });
    eq('kaybedilen tur da sayılıyor', b.IA.rounds(), 2);

    // exitGame()'in yolu: abandon() → game_ended('quit').
    GE.emit('game_started', { gameId: 'arrowPuzzle' });
    GE.abandon();
    eq("terk edilen ('quit') tur da sayılıyor", b.IA.rounds(), 3);
    eq('üç turdan sonra gösterilebilir', b.IA.canShow(), true);
  }
  {
    // stray: açık tur yokken gelen bitiş. GameEvents sayaçlarına işlemiyor,
    // burada da işlememeli — yoksa reklam sıklığı oynanan turu aşardı.
    const b = boot({});
    const GE = b.get('GameEvents');
    GE.emit('game_ended', { gameId: 'sudoku', result: 'won' });
    GE.emit('game_ended', { gameId: 'sudoku', result: 'won' });
    eq('stray bitiş sayaca İŞLEMİYOR', b.IA.rounds(), 0);
  }

  // ═════════ 3. GÖSTERİM ═════════
  console.log('\n3. GÖSTERİM');
  {
    // Mutlu yol: Showed → Dismissed. İki eksen de sıfırlanmalı.
    const b = boot({ native: true, state: { rounds: 4, lastShownAt: 0 } });
    const started = b.IA.maybeShow();
    eq('maybeShow() denemeyi başlattı', started, true);
    await flush();
    const names = b.plugin.names();
    check('prepareInterstitial çağrıldı', names.indexOf('prepareInterstitial') >= 0, names.join(','));
    check('showInterstitial çağrıldı', names.indexOf('showInterstitial') >= 0, names.join(','));
    eq('TEST reklam kimliği kullanıldı',
       b.plugin.calls.find(c => c[0] === 'prepareInterstitial')[1],
       'ca-app-pub-3940256099942544/1033173712');

    b.plugin.fire('interstitialAdShowed');
    b.plugin.fire('interstitialAdDismissed');
    await flush();
    eq('gösterildi → tur sayacı sıfırlandı', b.IA.rounds(), 0);
    check('gösterildi → zaman damgası yazıldı', b.IA.lastShownAt() > 0, String(b.IA.lastShownAt()));
    eq('hemen ardından tekrar gösterilmez', b.IA.canShow(), false);
  }
  {
    // Yüklenemedi: HİÇBİR ŞEY tüketilmemeli.
    const b = boot({ native: true, state: { rounds: 4, lastShownAt: 0 } });
    b.IA.maybeShow();
    await flush();
    b.plugin.fire('interstitialAdFailedToLoad', { code: 3 });
    await flush();
    eq('yüklenemedi → tur sayacı KORUNDU', b.IA.rounds(), 4);
    eq('yüklenemedi → zaman damgası yazılmadı', b.IA.lastShownAt(), 0);
    eq('yüklenemedi → bir sonraki çıkışta yeniden denenir', b.IA.canShow(), true);
  }
  {
    // Showed GELMEDEN Dismissed: reklam görünmedi, hak harcanmamalı.
    // Ödüllüdeki Rewarded-vs-Dismissed ayrımının aynısı.
    const b = boot({ native: true, state: { rounds: 4, lastShownAt: 0 } });
    b.IA.maybeShow();
    await flush();
    b.plugin.fire('interstitialAdDismissed');
    await flush();
    eq('Showed olmadan Dismissed → sayaç KORUNDU', b.IA.rounds(), 4);
    eq('Showed olmadan Dismissed → zaman damgası yok', b.IA.lastShownAt(), 0);
  }
  {
    // Rıza yoksa istek HİÇ yapılmamalı (UMP kuralı formata bağlı değil).
    const b = boot({ native: true, state: { rounds: 4, lastShownAt: 0 },
      info: { status: 'REQUIRED', canRequestAds: false,
              isConsentFormAvailable: false, privacyOptionsRequirementStatus: 'REQUIRED' } });
    b.IA.maybeShow();
    await flush();
    const names = b.plugin.names();
    check('rıza yok → prepareInterstitial ÇAĞRILMADI', names.indexOf('prepareInterstitial') < 0, names.join(','));
    eq('rıza yok → sayaç korundu', b.IA.rounds(), 4);
  }

  // ═════════ 4. MUAFİYETLER ═════════
  console.log('\n4. MUAFİYETLER');
  {
    // Premium: reklamsızlık faydasının doğal uzantısı.
    const b = boot({ native: true, plus: true, state: { rounds: 9, lastShownAt: 0 } });
    eq('Premium aktif', b.get('PlusSystem').isActive(), true);
    eq('Premium → canShow false', b.IA.canShow(), false);
    eq('Premium → maybeShow false', b.IA.maybeShow(), false);
    await flush();
    check('Premium → SDK hiç çağrılmadı',
          b.plugin.names().indexOf('prepareInterstitial') < 0, b.plugin.names().join(','));
    eq('Premium → sayaç bozulmadı', b.IA.rounds(), 9);
  }
  {
    // Keşfet: hızlı-deneme oturumu. Sınırlara BAKILMADAN muaf, ve sayaç
    // sıfırlanmıyor — o turlar bir sonraki normal çıkışta hâlâ geçerli.
    const b = boot({ native: true, state: { rounds: 5, lastShownAt: 0 } });
    eq('koşullar sağlanıyor (muafiyet olmasa gösterilecekti)', b.IA.canShow(), true);
    eq('Keşfet çıkışı → maybeShow false', b.IA.maybeShow({ fromDiscover: true }), false);
    await flush();
    check('Keşfet çıkışı → SDK hiç çağrılmadı',
          b.plugin.names().indexOf('prepareInterstitial') < 0, b.plugin.names().join(','));
    eq('Keşfet çıkışı → tur sayacı SIFIRLANMADI', b.IA.rounds(), 5);
    eq('Keşfet çıkışı → zaman damgası yazılmadı', b.IA.lastShownAt(), 0);

    // Aynı turlarla normal bir çıkış hâlâ reklamı getirmeli.
    eq('sonraki NORMAL çıkışta gösteriliyor', b.IA.maybeShow(), true);
    await flush();
    check('normal çıkışta SDK çağrıldı',
          b.plugin.names().indexOf('prepareInterstitial') >= 0);
  }

  // ═════════ 5. ÖDÜLLÜ REKLAM KÖPRÜSÜ ═════════
  // "Ödülü al → çık → hemen bir reklam daha" dizisi ENGELLENMELİ.
  console.log('\n5. ÖDÜLLÜ REKLAM SONRASI SIFIRLAMA');
  {
    const b = boot({ state: { rounds: 5, lastShownAt: 0 } });
    eq('ödüllü reklamdan ÖNCE gösterilebilir', b.IA.canShow(), true);
    b.IA.noteRewardedShown();
    eq('noteRewardedShown() → zamanlayıcı sıfırlandı', b.IA.canShow(), false);
    eq('tur sayacına DOKUNULMADI', b.IA.rounds(), 5);
    // 3 dakika sonrası yeniden serbest.
    eq('3 dakika sonra yeniden serbest',
       b.IA.canShow(Date.now() + 3 * MIN + 1000), true);
  }
  {
    // Uçtan uca: gerçek runRewardedAction akışı köprüyü kuruyor mu?
    const b = boot({ native: true, state: { rounds: 5, lastShownAt: 0 } });
    let granted = 0;
    b.s.sb.__grant = () => { granted++; };
    b.get("runRewardedAction({icon:'x',text:'y'}, function(){ __grant(); })");
    await flush();
    b.plugin.fire('onRewardedVideoAdReward');
    b.plugin.fire('onRewardedVideoAdDismissed');
    await flush();
    eq('ödül verildi', granted, 1);
    eq('ödüllü bütçeden düştü', b.get('AdBudget.used()'), 1);
    eq('ödüllü sonrası interstitial ENGELLİ', b.IA.canShow(), false);
    check('interstitial zaman damgası ödüllü tarafından yazıldı',
          b.IA.lastShownAt() > 0, String(b.IA.lastShownAt()));
  }

  // ═════════ 6. KAYNAK ═════════
  console.log('\n6. KAYNAK');
  {
    // maybeShow TEK çağrı yerinden çağrılmalı ve orası exitGame olmalı.
    // Açılış/splash ve oyun-içi yasakları bir bayrakla değil, tam olarak
    // bu tek çağrı noktasıyla korunuyor.
    const callSites = APP_SRC.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /InterstitialAds\.maybeShow\(/.test(l));
    eq('maybeShow tam BİR çağrı yeri', callSites.length, 1);

    const exitFn = (APP_SRC.match(/function exitGame\(\)[\s\S]*?\n\}/) || [''])[0];
    check('tek çağrı yeri exitGame() içinde',
          /InterstitialAds\.maybeShow\(/.test(exitFn), 'exitGame içinde bulunamadı');
    check('exitGame Keşfet kaynağını geçiriyor',
          /fromDiscover/.test(exitFn), 'fromDiscover geçirilmiyor');
    check('Keşfet kaynağı _beforeGameScreen sıfırlanmadan okunuyor',
          exitFn.indexOf('_beforeGameScreen === \'screen-discover\'') <
          exitFn.indexOf('InterstitialAds.maybeShow'));

    const initApp = (APP_SRC.match(/\(function initApp\(\)[\s\S]*?\n\}\)\(\);/) || [''])[0];
    check('AÇILIŞTA interstitial çağrısı YOK',
          initApp.indexOf('InterstitialAds') < 0, 'initApp içinde interstitial çağrısı var');

    const splash = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    check('SPLASH tarafında interstitial çağrısı YOK',
          splash.indexOf('InterstitialAds') < 0);
  }
  {
    // Yalnızca Google'ın resmî TEST birimi, ve yayın için işaretli.
    const ids = (APP_SRC.match(/const AD_IDS = \{[\s\S]*?\n\};/) || [''])[0];
    check('interstitial kimliği Google TEST birimi',
          /interstitialAndroid:\s*'ca-app-pub-3940256099942544\/1033173712'/.test(ids), ids);
    check('yayın için TODO işareti var',
          (ids.match(/TODO\(yayın\)/g) || []).length >= 2, ids);
    check('depoda başka (gerçek olabilecek) reklam kimliği yok',
          (APP_SRC.match(/ca-app-pub-\d+/g) || [])
            .every(x => x === 'ca-app-pub-3940256099942544'));
  }
  {
    // Ödüllünün tek kapı mimarisi bozulmamalı (CLAUDE.md ekonomi kuralı 1).
    const gate = (APP_SRC.match(/function runRewardedAction\([\s\S]*?\n\}/) || [''])[0];
    check('runRewardedAction hâlâ tek kapı (üç kural yerinde)',
          /PlusSystem.*isActive\(\)/.test(gate) && /AdBudget\.canWatch\(\)/.test(gate) &&
          /AdBudget\.consume\(\)/.test(gate), gate.slice(0, 200));
    check('köprü kapının İÇİNDE, consume ile aynı yerde',
          /AdBudget\.consume\(\)[\s\S]{0,600}InterstitialAds\.noteRewardedShown\(\)/.test(gate),
          'noteRewardedShown kapıda değil');
    check('runRewardedAction interstitial GÖSTERMİYOR (yeri orası değil)',
          gate.indexOf('maybeShow') < 0);
  }
  {
    // Oyun-özel kod YOK: yeni bir oyun eklemek bu bloğa dokunmayı
    // gerektirmemeli (DailyQuests/Badges ile aynı disiplin).
    const start = APP_SRC.indexOf('const InterstitialAds = {');
    const end = APP_SRC.indexOf('GameEvents.on(\'game_ended\', function (ev) { InterstitialAds.onRoundEnded(ev); });');
    check('InterstitialAds bloğu bulundu', start > 0 && end > start);
    const block = APP_SRC.slice(start, end);
    const b = boot({});
    const gameIds = Object.keys(b.get('PuzzleGames'));
    const leaked = gameIds.filter(id => block.indexOf(id) >= 0);
    eq('blokta oyun kimliği geçmiyor', leaked, []);
    check('eşikler blokta sabit sayı olarak yazılı değil',
          !/180000|3\s*\*\s*60\s*\*\s*1000/.test(block) &&
          /EconomyConfig\.INTERSTITIAL_MIN_ROUNDS/.test(block) &&
          /EconomyConfig\.INTERSTITIAL_MIN_INTERVAL_MS/.test(block), 'eşik bloğa gömülmüş');
    // Yorumlar ayıklanıyor: blok, günlük sıfırlama deseninin NEDEN burada
    // olmadığını anlatan bir yorum taşıyor ve o yorumun kendisi taramaya
    // takılmamalı — aranan şey kod, gerekçe değil.
    const code = block.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    check('günlük sıfırlama deseni YOK (bu bir günlük hak değil)',
          code.indexOf('toDateString') < 0 && !/d\.date\s*===/.test(code),
          'blokta günlük sıfırlama kodu var');
  }
  {
    // Bu değişikliğin ikinci yarısı: günlük ödüllü reklam hakkı.
    const b = boot({});
    eq('AD_DAILY_LIMIT 8', b.get('EconomyConfig.AD_DAILY_LIMIT'), 8);
    eq('AdBudget limiti EconomyConfig ile aynı', b.get('AdBudget.limit()'), 8);
    check('bütçe ile sıklık kapağı AYRI depolarda',
          b.get('AdBudget._key') !== b.get('InterstitialAds._key'));
  }

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

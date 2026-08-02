#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  PuzzleHub — Reklam Rızası (UMP / GDPR) Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/ad-consent-test.js
//
// SDK'nın kendisi cihazda çalışıyor; burada doğrulanan şey BİZİM
// mantığımız: hangi durumda form gösteriliyor, rıza yokken reklam
// isteniyor mu, hata hâlinde uygulama çalışmaya devam ediyor mu.
// Gerçek form/bölge davranışı cihazda ayrıca test edildi (bkz. CLAUDE.md).
//
// Kum havuzuna SAHTE bir Capacitor.Plugins.AdMob enjekte ediliyor — gerçek
// SDK Node'da yok, ama bizim kodumuz onunla yalnızca dört metot üzerinden
// konuşuyor, dolayısıyla sözleşme test edilebilir.

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

// Sahte eklenti. `calls` neyin çağrıldığını kaydediyor — asıl sorular
// "form gösterildi mi" ve "reklam istendi mi".
function fakePlugin(cfg) {
  const calls = [];
  const p = {
    calls,
    requestConsentInfo(opts) {
      calls.push(['requestConsentInfo', opts || null]);
      if (cfg.infoError) return Promise.reject(new Error(cfg.infoError));
      return Promise.resolve(cfg.info);
    },
    showConsentForm() {
      calls.push(['showConsentForm']);
      if (cfg.formError) return Promise.reject(new Error(cfg.formError));
      return Promise.resolve(cfg.afterForm || cfg.info);
    },
    showPrivacyOptionsForm() { calls.push(['showPrivacyOptionsForm']); return Promise.resolve(); },
    resetConsentInfo() { calls.push(['resetConsentInfo']); return Promise.resolve(); },
    initialize() { calls.push(['initialize']); return Promise.resolve(); },
    addListener() { return Promise.resolve({ remove() {} }); },
    prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o && o.adId]); return Promise.resolve(); },
    showRewardVideoAd() { calls.push(['showRewardVideoAd']); return Promise.resolve(); },
  };
  return p;
}

// Rozet/görev sistemleri elmas ödediği için izole ediliyor (kardeş
// araçlarda öğrenilen ders).
const ALL_BADGE_IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30'];
function boot(cfg) {
  const store = {
    ph_badges: JSON.stringify({ earned: ALL_BADGE_IDS.map(id => ({ id, earnedAt: 1 })) }),
    ph_daily_quests: JSON.stringify({
      date: new Date().toDateString(), played: 0, won: 0,
      paid: ['play3', 'daily', 'win1'], bonusPaid: true,
    }),
  };
  if (cfg && cfg.umpDebug) store.ph_ump_debug = cfg.umpDebug;
  const s = makeSandbox(store);
  let plugin = null;
  if (cfg && cfg.native) {
    plugin = fakePlugin(cfg);
    s.sb.Capacitor = { isNativePlatform: () => true, Plugins: { AdMob: plugin } };
  }
  const AC = s.get('AdConsent');
  // initApp kum havuzunda çalışmış olabilir; her senaryo temiz başlasın.
  AC._promise = null; AC._info = null;
  return { s, AC, plugin, store, get: s.get };
}

const wait = () => new Promise(r => setImmediate(r));

(async function () {
  console.log('PuzzleHub — Reklam Rızası (UMP) Doğrulaması');

  // ───────── 1. SÖZLEŞME ─────────
  console.log('\n1. SÖZLEŞME');

  // Web: SDK yok. Rızanın konusu yok, akış sessizce geçmeli.
  {
    const b = boot({ native: false });
    const r = await b.AC.ensure();
    eq('web: ensure() sessizce çözülüyor', r, null);
    eq('web: gizlilik satırı gerekmiyor', b.AC.privacyOptionsRequired(), false);
    check('web: hiçbir şey patlamadı', true);
  }

  // Kapsam DIŞI bölge: form GÖSTERİLMEMELİ, reklam serbest.
  {
    const b = boot({ native: true, info: {
      status: 'NOT_REQUIRED', canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED', isConsentFormAvailable: false,
    } });
    await b.AC.ensure();
    const names = b.plugin.calls.map(c => c[0]);
    check('kapsam dışı: requestConsentInfo çağrıldı', names.indexOf('requestConsentInfo') >= 0);
    check('kapsam dışı: form GÖSTERİLMEDİ', names.indexOf('showConsentForm') < 0, names.join(','));
    eq('kapsam dışı: reklam serbest', b.AC.canRequestAds(), true);
    eq('kapsam dışı: gizlilik satırı yok', b.AC.privacyOptionsRequired(), false);
  }

  // AB + rıza GEREKLİ: form gösterilmeli.
  {
    const b = boot({ native: true,
      info: { status: 'REQUIRED', canRequestAds: false,
              isConsentFormAvailable: true, privacyOptionsRequirementStatus: 'REQUIRED' },
      afterForm: { status: 'OBTAINED', canRequestAds: true,
                   privacyOptionsRequirementStatus: 'REQUIRED' } });
    await b.AC.ensure();
    const names = b.plugin.calls.map(c => c[0]);
    check('AB: rıza formu GÖSTERİLDİ', names.indexOf('showConsentForm') >= 0, names.join(','));
    eq('AB: kabul sonrası reklam serbest', b.AC.canRequestAds(), true);
    eq('AB: gizlilik satırı GEREKLİ', b.AC.privacyOptionsRequired(), true);
  }

  // AB + kullanıcı REDDETTİ: reklam yok, ama uygulama çalışıyor.
  {
    const b = boot({ native: true,
      info: { status: 'REQUIRED', canRequestAds: false,
              isConsentFormAvailable: true, privacyOptionsRequirementStatus: 'REQUIRED' },
      afterForm: { status: 'REQUIRED', canRequestAds: false,
                   privacyOptionsRequirementStatus: 'REQUIRED' } });
    await b.AC.ensure();
    eq('red: reklam istenmiyor', b.AC.canRequestAds(), false);
    // Uygulamanın geri kalanı ÇALIŞMALI — bu maddenin tamamı 3. madde.
    const bal = b.get('DiamondSystem.get()');
    b.get('DiamondSystem.add(5, null)');
    eq('red: elmas sistemi çalışıyor', b.get('DiamondSystem.get()'), bal + 5);
    check('red: oyun başlatılabiliyor', (() => {
      try { b.get("GameEvents.emit('game_started', {gameId:'sudoku'})"); return true; }
      catch (e) { return false; }
    })(), 'oyun akışı kilitlendi');
  }

  // Çağrı patlarsa: sessizce yutulmalı, reklam kapalı, uygulama ayakta.
  {
    const b = boot({ native: true, infoError: 'ag yok' });
    let threw = false;
    try { await b.AC.ensure(); } catch (e) { threw = true; }
    eq('hata: ensure() reddetmiyor', threw, false);
    eq('hata: reklam istenmiyor (varsayılan HAYIR)', b.AC.canRequestAds(), false);
  }

  // ensure() BİR KEZ çalışır.
  {
    const b = boot({ native: true, info: {
      status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' } });
    await b.AC.ensure(); await b.AC.ensure(); await b.AC.ensure();
    const n = b.plugin.calls.filter(c => c[0] === 'requestConsentInfo').length;
    eq('ensure() tekrar tekrar çağrılsa da bir kez sorar', n, 1);
  }

  // Hata ayıklama kapısı: YALNIZCA localStorage'da varsa.
  {
    const b1 = boot({ native: true, info: {
      status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' } });
    await b1.AC.ensure();
    const o1 = b1.plugin.calls.find(c => c[0] === 'requestConsentInfo')[1];
    eq('varsayılan: debugGeography GÖNDERİLMİYOR', (o1 && o1.debugGeography) || null, null);

    const b2 = boot({ native: true, umpDebug: '{"geo":1,"ids":["ABC"]}', info: {
      status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' } });
    await b2.AC.ensure();
    const o2 = b2.plugin.calls.find(c => c[0] === 'requestConsentInfo')[1];
    eq('debug açıkken AB simülasyonu geçiyor', o2.debugGeography, 1);
    eq('debug açıkken test cihazı geçiyor', o2.testDeviceIdentifiers, ['ABC']);
  }

  // ───────── 2. REKLAM YOLU ─────────
  console.log('\n2. REKLAM YOLU');

  // Rıza yoksa reklam İSTENMEMELİ.
  {
    const b = boot({ native: true,
      info: { status: 'REQUIRED', canRequestAds: false,
              isConsentFormAvailable: true, privacyOptionsRequirementStatus: 'REQUIRED' },
      afterForm: { status: 'REQUIRED', canRequestAds: false,
                   privacyOptionsRequirementStatus: 'REQUIRED' } });
    let rewarded = 0;
    b.s.sb.__grant = () => { rewarded++; };
    b.get("RewardedAd.show({icon:'x',text:'y'}, function(){ __grant(); })");
    for (let i = 0; i < 8; i++) await wait();
    const names = b.plugin.calls.map(c => c[0]);
    check('rıza yok: prepareRewardVideoAd ÇAĞRILMADI',
          names.indexOf('prepareRewardVideoAd') < 0, names.join(','));
    check('rıza yok: SDK initialize bile edilmedi',
          names.indexOf('initialize') < 0, names.join(','));
    eq('rıza yok: ödül verilmedi', rewarded, 0);
  }

  // Rıza varsa akış normal ilerlemeli.
  {
    const b = boot({ native: true, info: {
      status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' } });
    b.s.sb.__grant = () => {};
    b.get("RewardedAd.show({icon:'x',text:'y'}, function(){ __grant(); })");
    for (let i = 0; i < 8; i++) await wait();
    const names = b.plugin.calls.map(c => c[0]);
    check('rıza var: reklam isteniyor', names.indexOf('prepareRewardVideoAd') >= 0, names.join(','));
    // SIRA: rıza SDK başlatmadan ÖNCE sorulmuş olmalı.
    check('sıra: requestConsentInfo, initialize\'dan ÖNCE',
          names.indexOf('requestConsentInfo') < names.indexOf('initialize'), names.join(','));
  }

  // ───────── 3. UI ─────────
  console.log('\n3. UI');
  {
    const b = boot({ native: true, info: {
      status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' } });
    await b.AC.ensure();
    b.get('renderSettings()');
    const html = b.s.byId['settings-list'].innerHTML;
    check('gerekliyken "Gizlilik Seçenekleri" satırı çiziliyor',
          html.indexOf('Gizlilik Seçenekleri') >= 0, html.slice(-300));
  }
  {
    const b = boot({ native: true, info: {
      status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' } });
    await b.AC.ensure();
    b.get('renderSettings()');
    const html = b.s.byId['settings-list'].innerHTML;
    check('gerekmiyorken satır ÇİZİLMİYOR', html.indexOf('Gizlilik Seçenekleri') < 0);
  }

  // ───────── 4. KAYNAK ─────────
  console.log('\n4. KAYNAK');

  // Tek kapı mimarisi korunmuş olmalı (5. maddedeki yasak).
  const gate = (APP_SRC.match(/function runRewardedAction\([\s\S]*?\n\}/) || [''])[0];
  check('runRewardedAction hâlâ tek kapı (üç kural yerinde)',
        /PlusSystem.*isActive\(\)/.test(gate) && /AdBudget\.canWatch\(\)/.test(gate) &&
        /AdBudget\.consume\(\)/.test(gate), gate.slice(0, 200));
  check('runRewardedAction rıza mantığı İÇERMİYOR (yeri orası değil)',
        gate.indexOf('AdConsent') < 0, 'rıza kapıya sızmış');

  // Rıza, SDK başlatmadan önce beklenmeli.
  check('reklam yolu rızayı BEKLİYOR',
        /AdConsent\.ensure\(ad\)\.then/.test(APP_SRC));
  check('rıza yoksa istek yapılmıyor',
        /if \(!AdConsent\.canRequestAds\(\)\)[\s\S]{0,200}return null;/.test(APP_SRC));

  // Bypass YASAK.
  check('rıza "kabul edildi" varsayılmıyor',
        !/canRequestAds\s*=\s*true/.test(APP_SRC) &&
        !/status\s*=\s*['"]OBTAINED/.test(APP_SRC));
  // Varsayılan HAYIR olmalı.
  check('canRequestAds bilgi yokken false',
        /return !!\(this\._info && this\._info\.canRequestAds\)/.test(APP_SRC));

  // Depoda sabit AB simülasyonu OLMAMALI.
  const acBlock = APP_SRC.slice(APP_SRC.indexOf('const AdConsent'), APP_SRC.indexOf('const RewardedAd'));
  check('depoda sabit debugGeography YOK (yalnızca localStorage kapısı)',
        !/debugGeography:\s*\d/.test(acBlock) && /ph_ump_debug/.test(acBlock));

  // Açılışa bağlı mı?
  check('açılışta tetikleniyor', /AdConsent\.ensure\(\)\.then/.test(APP_SRC));

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

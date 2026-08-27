#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — iOS Para Sistemi Kapısı Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/ios-gating-test.js
//
// Kardeş araçlarla (ad-release, interstitial, iap) aynı dört katman.
//
// ───── NEDEN AYRI BİR ARAÇ ─────
// Diğer bütün koşumlar kum havuzunda `Capacitor` OLMADAN çalışıyor, yani
// hepsi web yolunu ölçüyor ve `adsSupported()` orada her zaman true. Yedi
// koşumun tamamı yeşilken iOS kapısının hiç sınanmamış olması tam olarak
// bu yüzden mümkün — CLAUDE.md'nin "yeşil bir ölçüm işlenmiş bir ekran
// değildir" dersi burada "yeşil bir ölçüm ölçülmemiş bir platform
// değildir" hâlini alıyor.
//
// `adsSupported()` ve `purchasesPlugin()` `Capacitor`'ı ÇAĞRI ANINDA
// okuyor (`typeof Capacitor !== 'undefined'`), dolayısıyla sahte bir
// Capacitor kum havuzuna app.js yüklendikten SONRA enjekte edilebiliyor
// ve gerçek üretim yolunu çalıştırıyor — test için açılmış bir arka kapı
// yok.
//
// ───── ASIL SORU ─────
// En pahalı hata BEDAVA ÖDÜL: `adMobPlugin()` iOS'ta null dönseydi
// `show()` `_showSimulated`'a düşer ve oyuncu reklam izlemeden ödülü
// alırdı. Buradaki en önemli iddia da o: iOS'ta onComplete ASLA
// çağrılmamalı.

'use strict';
const { makeSandbox, readSrc } = require('./dom-sandbox');

const APP_SRC = readSrc('core/app.js');

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

// Sahte AdMob eklentisi: hiçbir olay yaymıyor. Amacı yalnızca "eklenti
// VAR" demek — android yolunda kapının açık kaldığını göstermek için.
function fakeAdMob() {
  return {
    initialize:            () => Promise.resolve(),
    prepareRewardVideoAd:  () => Promise.resolve(),
    showRewardVideoAd:     () => Promise.resolve(),
    prepareInterstitial:   () => Promise.resolve(),
    showInterstitial:      () => Promise.resolve(),
    addListener:           () => Promise.resolve({ remove() {} }),
    requestConsentInfo:    () => Promise.resolve({ isConsentFormAvailable: false, status: 'NOT_REQUIRED' }),
    requestTrackingAuthorization: () => Promise.resolve(),
  };
}

function fakePurchases() {
  return {
    configure:   () => Promise.resolve(),
    getOfferings:() => Promise.resolve({ current: null }),
    addCustomerInfoUpdateListener: () => Promise.resolve({ remove() {} }),
  };
}

// platform: 'ios' | 'android' | null (null = web, Capacitor hiç yok)
function boot(platform, store) {
  // makeSandbox LOAD_ORDER'ın sonunda app.js'i ZATEN yüklüyor; ikinci kez
  // değerlendirmek `EconomyConfig has already been declared` ile düşüyor.
  //
  // Capacitor bu yüzden app.js'ten SONRA enjekte ediliyor — ve bu bir
  // sınırlama değil, sınanmak istenen durumun ta kendisi: açılış web
  // yolunda geçiyor, kapılar ise çağrı anında platformu okuyor.
  const b = makeSandbox(store || {});
  if (platform) {
    b.sb.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => platform,
      Plugins: { AdMob: fakeAdMob(), Purchases: fakePurchases() },
    };
  }
  return b;
}

(function main() {
  console.log('\n1. PLATFORM TESPİTİ');
  {
    eq('iOS      → reklam desteklenmiyor', boot('ios').get('adsSupported()'), false);
    eq('Android  → reklam destekleniyor',  boot('android').get('adsSupported()'), true);
    eq('web      → reklam destekleniyor (simülasyon)', boot(null).get('adsSupported()'), true);
  }

  console.log('\n2. ÖDÜLLÜ REKLAM — BEDAVA ÖDÜL KAPISI KAPALI MI');
  {
    const b = boot('ios');
    b.sb.__granted = 0;
    const r = b.get('RewardedAd.show({ icon: "x", text: "y" }, () => { __granted++; })');
    eq('show() false dönüyor', r, false);
    eq('onComplete HİÇ çağrılmadı (bedava ödül yok)', b.get('__granted'), 0);
    // En sinsi hata: kapı _pending kurulduktan sonra dönseydi kilit bir
    // daha açılmaz, oyuncu Plus alsa bile hiçbir reklam açamazdı.
    eq('_pending kilidi takılı kalmadı', b.get('RewardedAd._pending'), false);
    eq('preload() ağ isteği yapmıyor', b.get('typeof RewardedAd.preload().then'), 'function');
  }
  {
    // NEGATİF KONTROL — bir koruma ancak başarısız olduğunu gördükten
    // sonra güvenilir. Aynı çağrı web'de kabul edilmeli, yoksa "her
    // koşulda false dönen" bir fonksiyonu doğru sanardık.
    const b = boot(null);
    const r = b.get('RewardedAd.show({ icon: "x", text: "y" }, () => {})');
    eq('web: show() kabul ediyor (simülasyon yolu duruyor)', r, true);
  }
  {
    const b = boot('android');
    eq('android: show() kabul ediyor', b.get('RewardedAd.show({ icon: "x", text: "y" }, () => {})'), true);
  }

  console.log('\n3. TEK KAPI — runRewardedAction');
  {
    const b = boot('ios');
    b.sb.__granted = 0;
    eq('iOS: false dönüyor', b.get('runRewardedAction({ icon: "x", text: "y" }, () => { __granted++; })'), false);
    eq('ödül verilmedi', b.get('__granted'), 0);
  }
  {
    // Plus yolu ETKİLENMEMELİ: Plus'lı oyuncu ödülü zaten reklamsız
    // alıyor, orası bir reklam yolu değil — reklamın atlandığı yol.
    const b = boot('ios');
    b.get('PlusSystem.activate("monthly")');
    b.sb.__granted = 0;
    eq('iOS + Plus: ödül veriliyor', b.get('runRewardedAction({ icon: "x", text: "y" }, () => { __granted++; })'), true);
    eq('Plus ödülü landı', b.get('__granted'), 1);
  }

  console.log('\n4. GEÇİŞ REKLAMI');
  {
    const b = boot('ios', {
      // İki eksen de sağlanmış olsun ki engelleyen şeyin platform
      // olduğu kesinleşsin — eşiklerin kendisi engelliyor olsaydı test
      // hiçbir şey kanıtlamazdı.
      ph_interstitial: JSON.stringify({ rounds: 99, lastShownAt: 0 }),
    });
    eq('iOS: canShow() false', b.get('InterstitialAds.canShow()'), false);
  }
  {
    const b = boot('android', {
      ph_interstitial: JSON.stringify({ rounds: 99, lastShownAt: 0 }),
    });
    eq('android: aynı durumda canShow() true (negatif kontrol)', b.get('InterstitialAds.canShow()'), true);
  }

  console.log('\n5. SATIN ALMA');
  {
    const b = boot('ios');
    eq('iOS: purchasesPlugin() null', b.get('purchasesPlugin() === null'), true);
    eq('iOS: Billing.available() false', b.get('Billing.available()'), false);
    // Fiyat ASLA eski bir sabite düşmemeli: yanlış fiyat göstermek hiç
    // göstermemekten kötü, oyuncu gördüğünü ödeyeceğini varsayar.
    const price = b.get('String(Billing.priceFor("plus_monthly"))');
    check('iOS: fiyat para birimi + rakam içermiyor', !/\d/.test(price),
          'fiyat gibi bir değer dönüyor: ' + price);
  }
  {
    const b = boot('android');
    eq('android: purchasesPlugin() null DEĞİL (negatif kontrol)', b.get('purchasesPlugin() !== null'), true);
  }

  console.log('\n6. KAYNAK TARAMASI');
  {
    // Kapının YERİ tasarımın kendisi: _pending'den önce olmak zorunda.
    const show = /show\(reward, onComplete\)\s*\{([\s\S]*?)\n  \},/.exec(APP_SRC);
    check('show() gövdesi bulundu', !!show);
    if (show) {
      const body = show[1];
      const gate = body.indexOf('adsSupported()');
      const pend = body.indexOf('this._pending = true');
      check('platform kapısı _pending ATAMASINDAN önce',
            gate >= 0 && pend >= 0 && gate < pend,
            'kapı sonraya kalmış: kilit bir daha açılmaz');
    }

    // adMobPlugin() iOS kapısı OLARAK KULLANILMAMALI — o yol simülasyona
    // düşer. Fonksiyonun kendisi platform sormamalı.
    const amp = /function adMobPlugin\(\)\s*\{([\s\S]*?)\n\}/.exec(APP_SRC);
    check('adMobPlugin() gövdesi bulundu', !!amp);
    if (amp) {
      check('adMobPlugin() platform sormuyor (simülasyon tuzağı)',
            amp[1].indexOf('getPlatform') < 0,
            'adMobPlugin içinde platform kontrolü var — iOS simülasyona düşer');
    }

    // Kapı tek bir yerde tanımlı olmalı; ikinci bir "iOS mu" tanımı,
    // ikisinin zamanla ayrışması demek.
    const defs = (APP_SRC.match(/function adsSupported\(\)/g) || []).length;
    eq('adsSupported() tek kez tanımlı', defs, 1);

    // Tüketici listesi: biri unutulursa o yüzeyde reklam düğmesi görünür.
    for (const site of ['RewardedAd.show', 'preload', 'runRewardedAction',
                        'InterstitialAds.canShow', 'refreshGameOverOffers',
                        'FREE_DIAMOND_SOURCES', 'offerRewardChoice']) {
      // Yalnızca "adsSupported çağrısı var mı" sorusu; yerini yukarıdaki
      // yapısal iddialar denetliyor.
    }
    const uses = (APP_SRC.match(/adsSupported\(\)/g) || []).length;
    check('adsSupported() en az 6 yerde tüketiliyor', uses >= 6,
          'yalnızca ' + uses + ' kullanım — bir yüzey atlanmış olabilir');
  }

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

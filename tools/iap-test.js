#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Satın Alma (RevenueCat) Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/iap-test.js
//
// Kardeş araçlarla aynı dört katman. Test edilen şey RevenueCat DEĞİL —
// o cihazda çalışıyor — bizim katmanımız: entitlement'ın yerel anlık
// görüntüye doğru yazılması, plan→ürün eşlemesi, iptal/hata dili, geri
// yükleme, ve depoda sabit fiyat KALMAMASI.
//
// Kum havuzuna sahte bir Capacitor.Plugins.Purchases enjekte ediliyor
// (ad-consent-test.js'te kurulan desen).
//
// GERÇEK SATIN ALMA BURADA TEST EDİLEMEZ: Play Billing yalnızca Play'den
// kurulmuş, imzalı ve bir test track'inde yayınlanmış uygulamada çalışır.
// O adım cihazda ve Play Console kurulumu bittikten sonra yapılacak.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, readSrc } = require('./dom-sandbox');

const APP_SRC = readSrc('core/app.js');
const HTML_SRC = readSrc('index.html');

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

const DAY = 24 * 3600 * 1000;

// ───────── sahte RevenueCat eklentisi ─────────
function makeProduct(id, price, cur) {
  const sym = cur === 'TRY' ? '₺' : '$';
  return { identifier: id, price: price, priceString: sym + price.toFixed(2), currencyCode: cur };
}

function customerInfoWith(productId, expiresAt) {
  const active = {};
  if (productId) {
    active.plus = {
      identifier: 'plus', productIdentifier: productId,
      expirationDate: expiresAt || null, willRenew: true, isActive: true,
    };
  }
  return { entitlements: { active: active, all: active } };
}

function fakePlugin(cfg) {
  cfg = cfg || {};
  const calls = [];
  let listener = null;
  const cur = cfg.currency || 'TRY';
  const products = cfg.products || {
    plus_weekly:  44.99, plus_monthly: 149.99, plus_yearly: 499,
    diamonds_100: 89.99, diamonds_550: 379.99,
    diamonds_1800: 799.99, diamonds_6500: 1649.99,
  };
  // `basePlanSuffix`: GOOGLE PLAY'İN GERÇEK DAVRANIŞI (2026-08-12).
  // Play'de bir aboneliğin altında taban planlar var ve RevenueCat ürün
  // kimliğini BİLEŞİK döndürüyor — 'plus_monthly:aylik'. Tek seferlik
  // ürünlerde (diamonds_*) böyle bir şey yok, kimlik birebir kalıyor.
  //
  // Fixture bunu taklit etmediği için harness aylarca yeşil kaldı: cihazda
  // elmas fiyatları gelirken Plus fiyatları '—' görünüyordu ve Plus satın
  // alma sessizce notFound dönüyordu. `configureReturnsString` ile aynı
  // sınıf hata — bir mock, taklit ettiği şey kadar dürüsttür.
  const suffix = cfg.basePlanSuffix || null;
  const packages = Object.keys(products).map(id => ({
    identifier: '$rc_' + id,
    product: makeProduct(
      (suffix && /^plus_/.test(id)) ? id + ':' + suffix : id,
      products[id], cur),
  }));
  return {
    calls, names() { return calls.map(c => c[0]); },
    emit(info) { if (listener) listener({ customerInfo: info }); },

    configure(o) {
      calls.push(['configure', o && o.apiKey]);
      // `configureReturnsString`: CİHAZDAKİ GERÇEK DAVRANIŞ (2026-08-07).
      // Ham köprüden (Capacitor.Plugins.Purchases) çağrıldığında configure()
      // paketin .d.ts'inin vaat ettiği Promise'i değil, bir string döndürüyor.
      // Bu seçenek olmadan sahte eklenti gerçeğinden DAHA USLU davranıyordu ve
      // harness, elmas mağazasını tamamen açılmaz yapan hatayı kaçırdı — bir
      // taklit ancak taklit ettiği şey kadar dürüst olabilir.
      if (cfg.configureReturnsString) return 'ok';
      return cfg.configureError ? Promise.reject(new Error(cfg.configureError)) : Promise.resolve();
    },
    addCustomerInfoUpdateListener(fn) { listener = fn; calls.push(['addListener']); return Promise.resolve('cb1'); },
    getCustomerInfo() {
      calls.push(['getCustomerInfo']);
      if (cfg.infoError) return Promise.reject(new Error(cfg.infoError));
      return Promise.resolve({ customerInfo: cfg.info || customerInfoWith(null) });
    },
    getOfferings() {
      calls.push(['getOfferings']);
      if (cfg.offeringsError) return Promise.reject(new Error(cfg.offeringsError));
      return Promise.resolve({ offerings: {
        all: { default: { identifier: 'default', availablePackages: packages } },
        current: { identifier: 'default', availablePackages: packages },
      } });
    },
    purchasePackage(o) {
      const id = o && o.aPackage && o.aPackage.product && o.aPackage.product.identifier;
      calls.push(['purchasePackage', id]);
      if (cfg.purchaseCancelled) return Promise.reject({ userCancelled: true, message: 'cancelled' });
      if (cfg.purchaseError) return Promise.reject(new Error(cfg.purchaseError));
      const sub = /^plus_/.test(id);
      return Promise.resolve({ customerInfo: sub ? customerInfoWith(id, new Date(Date.now() + 30 * DAY).toISOString())
                                                 : customerInfoWith(null) });
    },
    restorePurchases() {
      calls.push(['restorePurchases']);
      if (cfg.restoreError) return Promise.reject(new Error(cfg.restoreError));
      return Promise.resolve({ customerInfo: cfg.restoreInfo || customerInfoWith(null) });
    },
  };
}

// Rozet/görev sistemleri elmas ödüyor; izole ediliyor (kardeş araç dersi).
const ALL_BADGE_IDS = ['first_game', 'games_10', 'streak_7', 'diamonds_500', 'streak_30',
                       'streak_50', 'streak_100', 'streak_250', 'streak_500'];

function boot(cfg) {
  cfg = cfg || {};
  const store = {
    ph_badges: JSON.stringify({ earned: ALL_BADGE_IDS.map(id => ({ id, earnedAt: 1 })) }),
    ph_daily_quests: JSON.stringify({
      date: new Date().toDateString(), played: 0, won: 0,
      paid: ['play3', 'daily', 'win1'], bonusPaid: true,
    }),
  };
  if (cfg.plusRecord) store.ph_plus = JSON.stringify(cfg.plusRecord);

  const s = makeSandbox(store);
  let plugin = null;
  if (cfg.native) {
    plugin = fakePlugin(cfg);
    // getPlatform ARTIK VERİLİYOR (2026-09-08). Önceden yoktu ve sonucu
    // şuydu: anahtar seçimi platforma bağlandığı anda bu koşum her zaman
    // Android'i ölçerdi, iOS dalı hiç yürümezdi. Reklam tarafında tam
    // olarak aynı kör nokta yaşandı — orada `ios-gating-test.js` bu yüzden
    // ayrı bir araç olarak var.
    s.sb.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => cfg.platform || 'android',
      Plugins: { Purchases: plugin },
    };
  }
  // Anahtar HER İKİ yönde de enjekte ediliyor — Billing._apiKey() tam
  // olarak bunun için var.
  //
  // `apiKey:false` artık AÇIKÇA boş dönüyor; önceden yalnızca override'ı
  // atlıyordu ve deponun sabitinin boş olmasına bel bağlıyordu. Anahtar
  // 2026-08-03'te gerçek değeriyle dolunca o kurgu sessizce anlamını
  // yitirdi: "anahtarsız" senaryosu gerçek anahtarla koşup configure'ü
  // çağırdı. Testin ölçmek istediği şey deponun o anki sabiti değil,
  // kodun davranışı — bu yüzden iki yön de enjekte ediliyor.
  const B = s.get('Billing');
  B._ready = null; B._offerings = null;
  // cfg.realKey: override'i ATLA. Platform seçimini ölçen bölüm gerçek
  // rcApiKey()'i görmek zorunda; sahte anahtar orada testin kendi kurgusunu
  // ölçmek olurdu. (delete B._apiKey ile geri alınamıyor — Billing düz bir
  // nesne, metot prototipte değil kendi özelliği, silince gerçeği de gider.)
  if (cfg.native && !cfg.realKey) B._apiKey = (cfg.apiKey === false) ? () => '' : () => 'goog_TEST';
  return { s, B, plugin, store, get: s.get,
           plus: () => JSON.parse(store.ph_plus || '{}') };
}

const wait = () => new Promise(r => setImmediate(r));
async function flush(n) { for (let i = 0; i < (n || 8); i++) await wait(); }

(async function () {
  console.log('SlySwipe — Satın Alma (RevenueCat) Doğrulaması');

  // ═════════ 1. ÜRÜN HARİTASI ═════════
  console.log('\n1. ÜRÜN HARİTASI');
  {
    const b = boot({});
    const IAP = b.get('IAP');
    eq('entitlement adı', IAP.ENTITLEMENT, 'plus');
    eq('offering adı', IAP.OFFERING, 'default');
    eq('abonelik kimlikleri', IAP.PLUS,
       { weekly: 'plus_weekly', monthly: 'plus_monthly', yearly: 'plus_yearly' });
    eq('elmas kimlikleri', IAP.DIAMONDS,
       { small: 'diamonds_100', medium: 'diamonds_550',
         large: 'diamonds_1800', mega: 'diamonds_6500' });

    // Kimlikler paketlerin VAAT ETTİĞİ toplamı adlandırmalı (amount+bonus).
    const pkgs = b.get('DIAMOND_PACKAGES');
    const totals = pkgs.map(p => p.amount + p.bonus);
    eq('paket toplamları 100/550/1800/6500', totals, [100, 550, 1800, 6500]);
    const idNums = pkgs.map(p => Number(IAP.DIAMONDS[p.id].split('_')[1]));
    eq('ürün kimlikleri toplamlarla tutarlı', idNums, totals);
  }

  // ═════════ 2. HAK (ENTITLEMENT) SENKRONU ═════════
  console.log('\n2. HAK SENKRONU');
  {
    const b = boot({});
    const PS = b.get('PlusSystem');
    eq('kayıt yokken Plus kapalı', PS.isActive(), false);

    PS._setFromStore(customerInfoWith('plus_monthly', new Date(Date.now() + 30 * DAY).toISOString()));
    eq('aktif hak → Plus açık', PS.isActive(), true);
    eq('plan ürün kimliğinden türetildi', b.plus().plan, 'monthly');
    eq('kaynak işaretlendi', b.plus().source, 'revenuecat');

    // Play bazen "plus_yearly:base-plan" biçiminde döndürüyor.
    PS._setFromStore(customerInfoWith('plus_yearly:p1y', new Date(Date.now() + 300 * DAY).toISOString()));
    eq('base-plan ekli kimlik de eşleşiyor', b.plus().plan, 'yearly');

    // Süresi GEÇMİŞ hak.
    PS._setFromStore(customerInfoWith('plus_weekly', new Date(Date.now() - DAY).toISOString()));
    eq('süresi dolmuş hak → Plus kapalı', PS.isActive(), false);

    // Süresiz hak (expirationDate null).
    PS._setFromStore(customerInfoWith('plus_yearly', null));
    eq('süresiz hak → Plus açık', PS.isActive(), true);

    // Mağaza "hak yok" dedi → yerel görüntü SİLİNMELİ.
    PS._setFromStore(customerInfoWith(null));
    eq('hak kalmadı → Plus kapandı', PS.isActive(), false);
  }
  {
    // ÇEVRİMDIŞI: bilgi YOKSA mevcut durum korunur. Bilgi yokluğu
    // "hak yok" demek değildir.
    const b = boot({ plusRecord: { active: true, source: 'revenuecat',
                                   expiresAt: new Date(Date.now() + 10 * DAY).toISOString() } });
    const PS = b.get('PlusSystem');
    eq('başlangıçta Plus açık', PS.isActive(), true);
    PS._setFromStore(null);
    eq('bilgi yokken Plus KORUNDU', PS.isActive(), true);
    PS._setFromStore(undefined);
    eq('undefined ile de korundu', PS.isActive(), true);
  }
  {
    // Mağaza yapılandırılmışsa YEREL activate() üzerine yazılır.
    const b = boot({});
    const PS = b.get('PlusSystem');
    PS.activate('yearly');
    eq('yerel activate çalışıyor (harness yolu)', PS.isActive(), true);
    eq('yerel kaynak işaretli', b.plus().source, 'local');
    PS._setFromStore(customerInfoWith(null));
    eq('mağaza kazanıyor: yerel Plus silindi', PS.isActive(), false);
  }

  // ═════════ 3. SATIN ALMA AKIŞI ═════════
  console.log('\n3. SATIN ALMA AKIŞI');
  {
    const b = boot({ native: true });
    const PS = b.get('PlusSystem');
    b.get("selectPlan('weekly')");
    eq('seçili plan', b.get('_selectedPlan'), 'weekly');
    b.get('purchasePlus()');
    await flush();
    const bought = b.plugin.calls.find(c => c[0] === 'purchasePackage');
    eq('seçili plana KARŞILIK GELEN ürün satın alındı', bought && bought[1], 'plus_weekly');
    eq('satın alma sonrası Plus açık', PS.isActive(), true);
  }
  {
    const b = boot({ native: true });
    b.get("selectPlan('yearly')");
    b.get('purchasePlus()');
    await flush();
    const bought = b.plugin.calls.find(c => c[0] === 'purchasePackage');
    eq('yıllık plan doğru eşleşti', bought && bought[1], 'plus_yearly');
  }
  {
    // İPTAL bir hata değil: Plus açılmaz, hata mesajı da gösterilmez.
    const b = boot({ native: true, purchaseCancelled: true });
    const PS = b.get('PlusSystem');
    let toasts = [];
    b.s.sb.showToast = (m) => toasts.push(m);
    b.get("selectPlan('monthly')");
    b.get('purchasePlus()');
    await flush();
    eq('iptalde Plus AÇILMADI', PS.isActive(), false);
    eq('iptalde hata mesajı YOK', toasts.length, 0);
  }
  {
    // Hata: Plus açılmaz, kullanıcı bilgilendirilir.
    const b = boot({ native: true, purchaseError: 'network' });
    const PS = b.get('PlusSystem');
    let toasts = [];
    b.s.sb.showToast = (m) => toasts.push(m);
    b.get("selectPlan('monthly')");
    b.get('purchasePlus()');
    await flush();
    eq('hatada Plus AÇILMADI', PS.isActive(), false);
    check('hatada kullanıcı bilgilendirildi', toasts.length > 0, JSON.stringify(toasts));
  }
  {
    // Elmas paketi: doğru ürün + doğru miktar (amount + bonus).
    const b = boot({ native: true });
    const before = b.get('DiamondSystem.get()');
    b.get("buyPackage('medium')");
    await flush();
    const bought = b.plugin.calls.find(c => c[0] === 'purchasePackage');
    eq('doğru elmas ürünü', bought && bought[1], 'diamonds_550');
    eq('miktar amount+bonus olarak eklendi', b.get('DiamondSystem.get()') - before, 550);
  }
  {
    // Satın alınan elmasa Plus çarpanı UYGULANMAZ.
    const b = boot({ native: true, plusRecord: { active: true, source: 'local', plan: 'yearly' } });
    eq('Plus aktif', b.get('PlusSystem.isActive()'), true);
    const before = b.get('DiamondSystem.get()');
    b.get("buyPackage('small')");
    await flush();
    eq('Plus üyede de tam olarak 100 elmas', b.get('DiamondSystem.get()') - before, 100);
  }

  // ═════════ 4. FİYATLAR MAĞAZADAN ═════════
  console.log('\n4. FİYATLAR');
  {
    const b = boot({ native: true });
    await b.get('refreshPrices()');
    await flush();
    eq('yıllık fiyat mağazadan', b.B.priceFor('plus_yearly'), '₺499.00');
    eq('elmas paketi fiyatı mağazadan', b.B.priceFor('diamonds_6500'), '₺1649.99');
    eq('bilinmeyen ürün → null', b.B.priceFor('yok_boyle_bir_urun'), null);

    // Türetilen "aylığa vurulmuş" not: 499/12 ≈ 41.58, aylık 149.99 →
    // tasarruf ≈ %72. Sayılar YAZILI DEĞİL, hesaplanıyor.
    const note = b.get('_yearlyNote()');
    check('aylık karşılık + tasarruf hesaplandı', /\/ay/.test(note) && /%\d+/.test(note), note);
  }
  {
    // Farklı bölge → farklı para birimi, tek satır kod değişmeden.
    const b = boot({ native: true, currency: 'USD',
      products: { plus_weekly: 1.99, plus_monthly: 5.99, plus_yearly: 19.99,
                  diamonds_100: 1.99, diamonds_550: 7.99,
                  diamonds_1800: 16.99, diamonds_6500: 34.99 } });
    await b.get('refreshPrices()');
    await flush();
    eq('USD fiyat lokalize geldi', b.B.priceFor('plus_yearly'), '$19.99');
  }
  {
    // ── ABONELİK KİMLİĞİ BİLEŞİK GELİYOR (regresyon: 2026-08-12) ──
    // Cihazda gözlenen belirti: elmas fiyatları GELİYOR, Plus fiyatları '—'.
    // Sebep tek bir yerdeydi — tablo pkg.product.identifier ile anahtarlanıyor
    // ve Play abonelikleri 'plus_monthly:aylik' biçiminde dönüyor.
    //
    // Bu bloğun asıl değeri fiyat DEĞİL: purchase() de aynı tabloya baktığı
    // için Plus satın alma notFound dönüyordu. Fiyat kozmetik, satın
    // alamamak gelir kaybı.
    const b = boot({ native: true, basePlanSuffix: 'aylik' });
    await b.get('refreshPrices()');
    await flush();

    eq('bileşik kimlikli abonelik fiyatı ÜRÜN KİMLİĞİYLE bulunuyor',
       b.B.priceFor('plus_monthly'), '₺149.99');
    eq('bileşik kimliğin kendisi de çalışıyor',
       b.B.priceFor('plus_monthly:aylik'), '₺149.99');
    eq('tek seferlik ürün etkilenmedi (kimlik zaten düz)',
       b.B.priceFor('diamonds_550'), '₺379.99');
    eq('türetilen yıllık not yine hesaplanıyor',
       /%\d+/.test(b.get('_yearlyNote()')), true);

    // Asıl mesele: paket bulunabiliyor mu?
    const res = await b.get("Billing.purchase('plus_monthly')");
    check('bileşik kimlikli abonelik SATIN ALINABİLİYOR',
          res && res.ok === true && !res.notFound,
          'purchase() döndü: ' + JSON.stringify(res));
  }
  {
    // Takma ad var olan bir kaydı EZMEMELİ: birebir eşleşme her zaman kazanır.
    // Aksi hâlde 'plus_monthly' adında gerçek bir ürün varken bir aboneliğin
    // taban planı onun fiyatını sessizce değiştirebilirdi.
    const b = boot({ native: true, basePlanSuffix: 'aylik',
      products: { plus_monthly: 149.99, plus_weekly: 44.99, plus_yearly: 499,
                  diamonds_100: 89.99, diamonds_550: 379.99,
                  diamonds_1800: 799.99, diamonds_6500: 1649.99 } });
    await b.get('refreshPrices()');
    await flush();
    const t = b.B._offerings;
    check('bileşik kimlik de düz kimlik de tabloda',
          !!t['plus_monthly'] && !!t['plus_monthly:aylik'],
          Object.keys(t).join(', '));
  }
  {
    // Mağazaya ulaşılamıyorsa NÖTR yer tutucu; eski sabit fiyata düşülmez.
    const b = boot({ native: true, offeringsError: 'network' });
    await b.get('refreshPrices()');
    await flush();
    eq('offerings hatasında fiyat yok', b.B.priceFor('plus_yearly'), null);
    eq('yer tutucu nötr', b.get('PRICE_PLACEHOLDER'), '—');
    eq('tasarruf notu uydurulmuyor', b.get('_yearlyNote()'), '');
  }

  // ═════════ 5. GERİ YÜKLEME ═════════
  console.log('\n5. GERİ YÜKLEME');
  {
    const b = boot({ native: true,
      restoreInfo: customerInfoWith('plus_yearly', new Date(Date.now() + 300 * DAY).toISOString()) });
    const PS = b.get('PlusSystem');
    eq('başlangıçta Plus yok', PS.isActive(), false);
    const res = await b.B.restore();
    eq('geri yükleme başarılı', res.ok, true);
    eq('geri yükleme sonrası Plus açık', PS.isActive(), true);
    check('restorePurchases çağrıldı', b.plugin.names().indexOf('restorePurchases') >= 0);
  }
  {
    // Satın alması olmayan kullanıcı: hata DEĞİL, bilgi.
    const b = boot({ native: true });
    const res = await b.B.restore();
    eq('boş geri yükleme başarılı sayılıyor', res.ok, true);
    eq('ama Plus açılmıyor', res.active, false);
  }
  {
    const b = boot({});     // web: eklenti yok
    const res = await b.B.restore();
    eq('web: geri yükleme kullanılamıyor', res.unavailable, true);
  }

  // ═════════ 6. EKLENTİSİZ / ANAHTARSIZ ═════════
  console.log('\n6. EKLENTİSİZ / ANAHTARSIZ');
  {
    const b = boot({});
    eq('web: Billing kullanılamıyor', b.B.available(), false);
    eq('web: init sessizce false', await b.B.init(), false);
    eq('web: fiyat yok', b.B.priceFor('plus_yearly'), null);
    eq('web: Plus kapalı ama uygulama ayakta', b.get('PlusSystem.isActive()'), false);
    // Satın alma SİMÜLE EDİLMEZ: sahte bir satın alma bedava Plus kapısı olurdu.
    const res = await b.B.purchase('plus_yearly');
    eq('web: satın alma kullanılamıyor', res.unavailable, true);
    eq('web: Plus yine kapalı', b.get('PlusSystem.isActive()'), false);
  }
  {
    // Anahtar boşken native'de de configure ÇAĞRILMAMALI (deponun
    // bugünkü gerçek durumu: hesap yok, anahtar boş).
    const b = boot({ native: true, apiKey: false });
    await b.B.init();
    await flush();
    const cfgCall = b.plugin.calls.find(c => c[0] === 'configure');
    check('anahtar boşken configure çağrılmadı', !cfgCall,
          'anahtar yokken SDK yapılandırıldı: ' + JSON.stringify(cfgCall));
  }

  // ═════════ 6.5. PLATFORMA GÖRE ANAHTAR ═════════
  //
  // Bu bölüm `_apiKey`'i ÖZELLİKLE override ETMİYOR — boot()'un sahte
  // 'goog_TEST' anahtarı diğer senaryolar için var ve burada kullanılsa
  // ölçülen şey testin kendi kurgusu olurdu. Sorulan soru gerçek seçicinin
  // ne döndürdüğü.
  console.log('\n6.5. PLATFORMA GÖRE ANAHTAR');
  {
    const keys = boot({}).get('RC_API_KEYS');

    const a = boot({ native: true, platform: 'android', realKey: true });
    eq('android gerçek Play anahtarını seçiyor', a.B._apiKey(), keys.android);
    eq('android: Billing kullanılabilir', a.B.available(), true);

    const i = boot({ native: true, platform: 'ios', realKey: true });
    eq('ios App Store anahtarını seçiyor', i.B._apiKey(), keys.ios);
    check('ios ANDROID anahtarını SEÇMİYOR', i.B._apiKey() !== keys.android,
          'iOS Play anahtarıyla configure edilecekti — o mağazanın hiçbir ' +
          'ürünü çözülmez ve bütün fiyatlar sessizce "—" kalır');

    // iOS eklentisi artık ERİŞİLEBİLİR olmalı: 2026-08-27'deki
    // `getPlatform() === 'ios' → null` kapısı kaldırıldı. Kapı dururken
    // anahtarı doldurmak hiçbir şeyi çalıştırmazdı.
    eq('ios: eklenti erişilebilir (kapı kalktı)',
       i.get('purchasesPlugin() !== null'), true);
    check('kaynakta iOS satın alma kapısı kalmadı',
          !/getPlatform\(\)\s*===\s*'ios'\)\s*return null/.test(APP_SRC),
          'purchasesPlugin() hâlâ iOS\'ta null dönüyor');
  }
  {
    // Anahtar boş bir platformda: güvenli durum, yarım kurulum değil.
    // (iOS anahtarı girildiğinde bu senaryo Android'e döner ve iddia
    // aynı kalır — ölçtüğü şey "anahtarsız platform ne yapar".)
    const empty = boot({}).get('RC_API_KEYS');
    const noKey = Object.keys(empty).find(k => !empty[k]);
    if (noKey) {
      const b = boot({ native: true, platform: noKey, realKey: true });
      eq(noKey + ': available() false', b.B.available(), false);
      eq(noKey + ': init sessizce false', await b.B.init(), false);
      await flush();
      check(noKey + ': configure ÇAĞRILMADI',
            !b.plugin.calls.find(c => c[0] === 'configure'),
            'anahtarsız platformda SDK yapılandırıldı');
      eq(noKey + ': fiyat uydurulmuyor', b.B.priceFor('plus_yearly'), null);

      // İDDİA BİÇİME DEĞİL SONUCA BAKIYOR, ve bu bilinçli. İlk yazımı
      // `r.unavailable === true` idi ve düştü: `unavailable` yalnızca
      // EKLENTİ yokken dönüyor (web). Anahtarsız bir native platformda
      // eklenti erişilebilir, `loadOfferings()` null döner ve sonuç
      // `notFound` olur.
      //
      // Kod BİLEREK değiştirilmedi: `unavailable` dalının mesajı
      // `purchase_app_only` ("yalnızca uygulamada") ve bunu uygulamanın
      // İÇİNDEKİ bir oyuncuya göstermek düpedüz yanlış olurdu. İkisinden
      // az yanlış olanı `notFound`, üstelik bu durum iOS anahtarı
      // girildiği anda tamamen ortadan kalkıyor.
      //
      // Önemli olan değişmez: satın alma TAMAMLANMIYOR ve Plus verilmiyor.
      const r = await b.B.purchase('plus_yearly');
      eq(noKey + ': satın alma başarılı OLMADI', r.ok, false);
      check(noKey + ': reddin sebebi işaretli', !!(r.unavailable || r.notFound),
            'satın alma sessizce belirsiz bir sonuçla döndü: ' + JSON.stringify(r));
      eq(noKey + ': Plus verilmedi', b.get('PlusSystem.isActive()'), false);
      check(noKey + ': purchasePackage ÇAĞRILMADI',
            !b.plugin.calls.find(c => c[0] === 'purchasePackage'),
            'anahtarsız platformda mağazaya satın alma isteği gitti');
    } else {
      ok('her platformun anahtarı dolu — boş-anahtar senaryosu geçersiz');
    }
  }

  // ═════════ 7. KAYNAK ═════════
  console.log('\n7. KAYNAK');
  {
    // Depoda TEK BİR sabit fiyat kalmamalı.
    const money = /[₺$€£]\s?\d/;
    const appHits = APP_SRC.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => money.test(l) && !/^\s*\/\//.test(l));
    eq('core/app.js sabit fiyat İÇERMİYOR', appHits.map(h => h[0] + ': ' + h[1].trim()), []);

    const htmlHits = HTML_SRC.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => money.test(l));
    eq('index.html sabit fiyat İÇERMİYOR', htmlHits.map(h => h[0] + ': ' + h[1].trim()), []);

    check('DIAMOND_PACKAGES price alanı KALDIRILDI',
          !/DIAMOND_PACKAGES[\s\S]{0,400}price:/.test(APP_SRC));
    check('fiyatlar data-ph-price sözleşmesiyle çiziliyor',
          /data-ph-price/.test(HTML_SRC) && /data-ph-price/.test(APP_SRC));
    check('üç planın üçü de niteliğe bağlı',
          /data-ph-price="plus_yearly"/.test(HTML_SRC) &&
          /data-ph-price="plus_monthly"/.test(HTML_SRC) &&
          /data-ph-price="plus_weekly"/.test(HTML_SRC));
  }
  {
    // 2026-08-03'e kadar bu iddia "anahtar BOŞ + TODO işaretli" idi ve
    // hesap açılınca doğru şekilde düştü. Silinmedi, çevrildi: artık
    // ölçtüğü şey anahtarın DOĞRU TÜRDE olduğu.
    //
    // Kritik olan ikinci yarısı. RevenueCat'in iki anahtarı var ve
    // ikisi de "anahtar" diye anılıyor: `goog_...` PUBLIC SDK anahtarı
    // (istemciye gömülmek üzere üretiliyor, tek başına yetki vermiyor)
    // ve `sk_...` SECRET anahtarı (REST API'ye tam yetki: abonelik
    // verebilir, iade edebilir, müşteri silebilir). İkincisi bir APK'ya
    // girerse APK herkesçe açılabildiği için sızmış sayılır ve döndürmek
    // gerekir. Kopyala-yapıştır hatasıyla karışmaları mümkün, o yüzden
    // burada yakalanıyor.
    // 2026-09-08: tek sabit yerine PLATFORM BAŞINA anahtar (RC_API_KEYS).
    // Android'in değeri değişmedi; iddia genişledi.
    const keys = boot({}).get('RC_API_KEYS');
    check('android anahtarı public Play anahtarı (goog_)',
          !!keys.android && /^goog_[A-Za-z0-9]+$/.test(keys.android),
          'android anahtarı goog_ biçiminde değil: ' + JSON.stringify(keys.android));

    // iOS anahtarı BOŞ OLABİLİR — henüz girilmediyse bu güvenli bir durum
    // (available() false, fiyatlar '—', purchase reddediyor), yarım bir
    // kurulum değil. Ama DOLUYSA doğru türde olmak zorunda.
    check('ios anahtarı boş ya da appl_ biçiminde',
          keys.ios === '' || /^appl_[A-Za-z0-9]+$/.test(keys.ios),
          'ios anahtarı beklenen biçimde değil: ' + JSON.stringify(keys.ios));

    // ASIL TEHLİKE BU: anahtarları birbirinin yerine yapıştırmak. Yanlış
    // anahtar configure()'u düşürmeyebilir — düşmezse o mağazanın hiçbir
    // ürünü çözülmez ve BÜTÜN fiyatlar '—' kalır, hiçbir hata görünmeden.
    check('anahtarlar birbirine karışmamış',
          !/^appl_/.test(keys.android) && !/^goog_/.test(keys.ios),
          'bir platformun anahtarı diğerine yazılmış');
    check('iki anahtar birbirinin aynısı değil',
          !keys.ios || keys.ios !== keys.android);

    // ───── YER TUTUCU AVI (2026-09-08) ─────
    //
    // NEDEN VAR: iki kez üst üste yer tutucu bir anahtar geldi
    // (`appl_........` ve `appl_GERCEKANAHTAR`). Birincisini biçim denetimi
    // yakaladı; İKİNCİSİ HEPSİNİ GEÇTİ — önek doğru, gövde alfanümerik,
    // Android'inkinden farklı. Yani koşum yeşil olurdu ve sahte anahtar
    // yayına giderdi.
    //
    // Bunun sonucu SESSİZ: configure() geçersiz anahtarla çalışır,
    // RevenueCat o mağazanın hiçbir ürününü çözemez ve bütün fiyatlar '—'
    // kalır — hiçbir hata görünmeden. Yeşil bir koşum o konuda kanıt değil.
    //
    // SINIRINI BİLEREK: bu denetim BİÇİMİ değil GÖRÜNÜŞÜ sorguluyor.
    // Bir kimlik bilgisinin GERÇEKTEN geçerli olduğunu hiçbir yerel test
    // söyleyemez — o ancak cihazda getOfferings() yedi ürünü döndürdüğünde
    // anlaşılır. Buradaki iş, apaçık sahteleri elemek.
    //
    // "Büyük harf var, rakam yok → şüpheli" gibi bir entropi sezgisi
    // DENENDİ VE ELENDİ: Android'in gerçek anahtarının gövdesi
    // ('OTMeoEeifXmuMWwbdKXhVYqawEb') hiç rakam içermiyor. Gerçek bir
    // anahtarı reddeden bir denetim, insanı sahte anahtardan daha çok
    // engeller.
    const PLACEHOLDER_WORDS = [
      'TODO', 'XXX', 'FIXME', 'PLACEHOLDER', 'CHANGEME', 'EXAMPLE', 'SAMPLE',
      'REALKEY', 'YOURKEY', 'MYKEY', 'GERCEK', 'GERÇEK', 'ANAHTAR', 'BURAYA',
    ];
    function placeholderReason(key) {
      if (!key) return null;                        // boş = güvenli durum, ayrı iddia
      const body = key.replace(/^(goog_|appl_)/, '');
      if (/^(.)\1*$/.test(body)) return 'gövde tek bir karakterin tekrarı';
      const upper = body.toUpperCase();
      const hit = PLACEHOLDER_WORDS.find(w => upper.indexOf(w) >= 0);
      if (hit) return 'gövde yer tutucu sözcük içeriyor: ' + hit;
      // Gerçek RC public anahtarlarının gövdesi ~27-30 karakter
      // (Android'inki 27). Eşik bilerek AŞAĞIDA: amaç kısa yer tutucuları
      // elemek, gerçek bir anahtarı kıl payı reddetmek değil.
      if (body.length < 20) return 'gövde çok kısa (' + body.length + ' karakter, beklenen ~27+)';
      return null;
    }

    for (const plat of ['android', 'ios']) {
      const why = placeholderReason(keys[plat]);
      check(plat + ': anahtar yer tutucu DEĞİL', !why,
            'yer tutucu anahtar deponun içinde — ' + why + '\n      ' +
            'Değer: ' + JSON.stringify(keys[plat]) + '\n      ' +
            'Bu anahtarla configure() sessizce başarısız olur: hiçbir ürün ' +
            'çözülmez, bütün fiyatlar "—" kalır ve hiçbir hata görünmez.');
    }

    // NEGATİF KONTROL: sezgi gerçek bir anahtarı reddetmemeli. Android'in
    // anahtarı gerçek ve yayında, yani bu iddia denetimin kendisini
    // denetliyor — "her şeye yer tutucu diyen" bir sürüm buradan düşer.
    check('yer tutucu avı GERÇEK anahtarı reddetmiyor',
          placeholderReason('goog_OTMeoEeifXmuMWwbdKXhVYqawEb') === null,
          'denetim gerçek Android anahtarını yer tutucu sandı — yanlış pozitif');
    // Ve gerçekten yakaladığını da göster: iki turda gelen iki değer.
    check('yer tutucu avı bilinen sahteleri yakalıyor',
          !!placeholderReason('appl_........') &&
          !!placeholderReason('appl_GERCEKANAHTAR') &&
          !!placeholderReason('appl_TODO'),
          'denetim bilinen yer tutucuları kaçırıyor');

    check('RC SECRET anahtarı (sk_) depoda YOK',
          !/\bsk_[A-Za-z0-9]{10,}/.test(APP_SRC) && !/\bsk_[A-Za-z0-9]{10,}/.test(HTML_SRC));
    // Plan süreleri KODDA kalmalı (mağaza fiyatı verir, dönemi biz biliriz).
    check('plan süreleri korundu',
          /setDate\(now\.getDate\(\) \+ 7\)/.test(APP_SRC) &&
          /setMonth\(now\.getMonth\(\) \+ 1\)/.test(APP_SRC) &&
          /setFullYear\(now\.getFullYear\(\) \+ 1\)/.test(APP_SRC));
    // isActive() SENKRON kalmalı — dört sistemin sözleşmesi buna bağlı.
    const fn = (APP_SRC.match(/\n  isActive\(\) \{[\s\S]*?\n  \},/) || [''])[0];
    check('isActive() senkron (async/await yok)',
          fn.length > 0 && !/async|await|Promise/.test(fn), fn.slice(0, 160));
    // 2026-08-15: satırın ETİKETİ artık app.js'te sabit yazılı değil,
    // locales/*.js'te bir anahtar. İddianın amacı metin değil VARLIK —
    // "cihaz değiştiren aboneye geri yükleme yolu duruyor mu". O yüzden
    // iki parça birden denetleniyor: satır ayarlarda kayıtlı VE metni
    // gerçekten tanımlı (anahtarın kendisi ekranda görünseydi de test
    // geçerdi, o boşluğu kapatmak için).
    const restoreLabelDefined = ['en', 'tr'].every((c) => {
      const src = readSrc('locales/' + c + '.js');
      return /settings_restore\s*:/.test(src) && /settings_restore_note\s*:/.test(src);
    });
    check('geri yükleme satırı ayarlarda',
          /labelKey\s*:\s*'settings_restore'/.test(APP_SRC) &&
          /restorePurchases\(\)/.test(APP_SRC) &&
          restoreLabelDefined);
  }
  {
    const b = boot({});
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const dep = pkgJson.dependencies['@revenuecat/purchases-capacitor'];
    check('RevenueCat v11 hattına sabitli (Capacitor 7 uyumu)',
          /^\^?11\./.test(dep), 'bulunan: ' + dep);
    const rcPkg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'node_modules/@revenuecat/purchases-capacitor/package.json'), 'utf8'));
    check('kurulu sürümün peer bağımlılığı Capacitor 7 kabul ediyor',
          />=7/.test(rcPkg.peerDependencies['@capacitor/core']),
          JSON.stringify(rcPkg.peerDependencies));
  }

  // ═════════ configure() PROMISE DÖNDÜRMEZSE ═════════
  //
  // Cihazda yaşanmış bir gerileme (2026-08-07). Çıplak `p.configure(...).then`
  // senkron bir TypeError atıyordu; hata init() → loadOfferings() →
  // refreshPrices() → renderShop() zincirini tırmanıp openShop()'u
  // showScreen'e HİÇ ulaşamadan kesiyordu. Sonuç: elmas mağazası
  // tamamen açılmıyordu ve hiçbir yerde bir hata görünmüyordu.
  //
  // Buradaki iddiaların değeri, ikisinin AYRI şeyleri koruması: biri
  // sarmalayıcıyı, diğeri mağazanın açılma sırasını. Sarmalayıcı geri
  // alınsa bile ekran sırası doğruysa mağaza boş açılır, ölmez.
  console.log('\nconfigure() PROMISE DÖNDÜRMEZSE (cihaz davranışı)');
  {
    const b = boot({ native: true, configureReturnsString: true });
    let threw = null;
    try { b.get('Billing').init(); } catch (e) { threw = e; }
    check('Billing.init() senkron istisna ATMIYOR', !threw,
          threw && (threw.message || String(threw)));
    check('init() yine de bir promise döndürüyor',
          !!(b.get('Billing')._ready && b.get('Billing')._ready.then));

    let shopThrew = null;
    try { b.get('openShop()'); } catch (e) { shopThrew = e; }
    check('openShop() istisna atmıyor', !shopThrew,
          shopThrew && (shopThrew.stack || String(shopThrew)).slice(0, 200));
  }
  {
    // Sıra kaynakta da sabitleniyor: renderShop, showScreen'den SONRA.
    const fn = (APP_SRC.match(/function openShop\(\) \{[\s\S]*?\n\}/) || [''])[0];
    const iShow = fn.indexOf('showScreen');
    const iRender = fn.indexOf('renderShop');
    check('openShop: showScreen ÖNCE, renderShop SONRA',
          iShow > 0 && iRender > iShow,
          'render önce çalışırsa bir istisna mağazayı sessizce öldürür:\n' + fn);
    check('configure() Promise.resolve ile sarılı',
          /Promise\.resolve\(\s*p\.configure\(/.test(APP_SRC),
          'çıplak p.configure(...).then ham köprüde patlıyor');
  }

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

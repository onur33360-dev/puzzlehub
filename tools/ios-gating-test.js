#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — iOS Reklam Entegrasyonu Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/ios-gating-test.js
//
// ───── NEDEN AYRI BİR ARAÇ ─────
// Diğer bütün koşumlar kum havuzunda `Capacitor.getPlatform` OLMADAN
// çalışıyor, yani hepsi Android/web yolunu ölçüyor. iOS'a özgü hiçbir
// şey — kimlik seçimi, test kipi, boş test-cihazı listesi — orada
// görünmez. Yedi koşum yeşilken iOS tarafının tamamen sınanmamış olması
// tam olarak bu yüzden mümkün.
//
// Sahte `Capacitor` kum havuzuna app.js yüklendikten SONRA enjekte
// ediliyor ve bu bir sınırlama değil: kapılar platformu ÇAĞRI ANINDA
// okuyor, yani ölçülen şey üretim yolunun kendisi, test için açılmış bir
// arka kapı değil.
//
// ───── BU ARACIN GEÇMİŞİ (okumadan değiştirme) ─────
// 2026-08-27'de iOS'ta reklam KAPALIYDI ve bu araç kapalılığı
// doğruluyordu: NSUserTrackingUsageDescription'ın YOKLUĞUNU, ödülün hiç
// verilmediğini. 2026-09-05'te iOS kendi AdMob uygulamasını aldı ve
// karar tersine döndü. Eski iddialar silinmedi, KARŞITLARINA çevrildi —
// aynı yüzeyler hâlâ denetleniyor, beklenen sonuç değişti.
//
// ───── ASIL SORU ─────
// En pahalı iki hata: (1) BEDAVA ÖDÜL — ödül gerçek `Rewarded` olayı
// gelmeden verilirse reklamsız ödül dağıtılır; (2) YANLIŞ PLATFORMUN
// KİMLİĞİ — sessizce başarısız olur, uygulama açılır, reklam hiç dolmaz.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, readSrc } = require('./dom-sandbox');

const APP_SRC = readSrc('core/app.js');
const PLIST = readSrc('ios/App/App/Info.plist');

// ───── SABİTLENMİŞ BEKLENEN DEĞERLER ─────
// Bunlar testin "Android değişmedi" kanıtının ta kendisi. Kaynaktan
// okunup kaynağa karşı doğrulanan bir iddia hiçbir şey söylemez; bu
// literaller değişirse koşum düşer ve değişikliğin bilinçli olduğu
// buradan da onaylanmak zorunda kalır.
const EXPECT = {
  androidRewarded:     'ca-app-pub-5960894143182893/1987429698',
  androidInterstitial: 'ca-app-pub-5960894143182893/7435197490',
  androidDevices: [
    '50CD4ED8DA91D950C1BFDFB07897BFB5',
    '58A6B46444BBBA9EF97BA72ECA2BE728',
    '88D815B20F99227E224E91EB84233D54',
  ],
  iosAppId:            'ca-app-pub-9211142655536364~4012978726',
  iosRewardedLive:     'ca-app-pub-9211142655536364/4038853281',
  iosInterstitialLive: 'ca-app-pub-9211142655536364/3631659175',
  iosRewardedTest:     'ca-app-pub-3940256099942544/1712485313',
  iosInterstitialTest: 'ca-app-pub-3940256099942544/4411468910',
};

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

function pubOf(id) { return String(id || '').split(/[~/]/)[0]; }

// Sahte AdMob eklentisi. Olayları BİZ sürüyoruz (`fire`), çünkü sorulan
// şey "hangi olaydan sonra ne oluyor" — özellikle ödülün yalnız
// `Rewarded` olayında verilmesi.
//
// requestTrackingAuthorization BİLEREK YOK. Eklenti bu API'yi sunuyor
// ama uygulama onu çağırmamalı (ATT'yi UMP'nin IDFA mesajı yönetiyor).
// Sahte eklentide tutmak, bir çağrının sessizce geçmesi demek olurdu;
// böyle bir çağrı artık burada TypeError ile patlar.
function fakeAdMob(consent) {
  const calls = [], listeners = {};
  return {
    calls, listeners,
    names() { return calls.map(c => c[0]); },
    argOf(n) { const c = calls.find(x => x[0] === n); return c && c[1]; },
    count(n) { return calls.filter(x => x[0] === n).length; },
    fire(ev, arg) { (listeners[ev] || []).slice().forEach(f => f(arg)); },
    requestConsentInfo() {
      calls.push(['requestConsentInfo']);
      return Promise.resolve(consent || {
        status: 'NOT_REQUIRED', canRequestAds: true,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED', isConsentFormAvailable: false,
      });
    },
    showConsentForm() { calls.push(['showConsentForm']); return Promise.resolve({ status: 'OBTAINED' }); },
    showPrivacyOptionsForm() { calls.push(['showPrivacyOptionsForm']); return Promise.resolve({}); },
    initialize(o) { calls.push(['initialize', o]); return Promise.resolve(); },
    addListener(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
      return Promise.resolve({ remove() {
        const a = listeners[name] || [], i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      } });
    },
    prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o]); return Promise.resolve(); },
    showRewardVideoAd()     { calls.push(['showRewardVideoAd']); return Promise.resolve(); },
    prepareInterstitial(o)  { calls.push(['prepareInterstitial', o]); return Promise.resolve(); },
    showInterstitial()      { calls.push(['showInterstitial']); return Promise.resolve(); },
  };
}

// platform: 'ios' | 'android' | 'web'(Capacitor yok)
function boot(platform, opts) {
  opts = opts || {};
  const b = makeSandbox(opts.store || {});
  const plugin = fakeAdMob(opts.consent);
  if (platform !== 'web') {
    b.sb.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => platform,
      Plugins: { AdMob: plugin },
    };
  }
  // makeSandbox app.js'i LOAD_ORDER'ın sonunda zaten yükledi ve açılış
  // web yolunda geçti; bu durumların sıfırlanması o yüzden gerekli.
  const AC = b.get('AdConsent'); AC._promise = null; AC._info = null;
  const RA = b.get('RewardedAd');
  RA._initPromise = null; RA._ready = false; RA._loading = null; RA._pending = false;
  return { b, plugin, get: b.get, sb: b.sb };
}

const wait = () => new Promise(r => setImmediate(r));
async function flush(n) { for (let i = 0; i < (n || 10); i++) await wait(); }

(async function main() {

  console.log('\n1. PLATFORMA GÖRE KİMLİK SEÇİMİ');
  {
    const a = boot('android'), i = boot('ios'), w = boot('web');
    eq('android → adPlatform android', a.get('adPlatform()'), 'android');
    eq('ios     → adPlatform ios',     i.get('adPlatform()'), 'ios');
    // Web'de getPlatform yok; varsayılan android ve bu zararsız, çünkü
    // web'de hiç birim kimliği istenmez (eklenti yok → simülasyon).
    eq('web     → adPlatform android (varsayılan, kullanılmaz)', w.get('adPlatform()'), 'android');

    eq('android ödüllü kimliği',  a.get("adUnitId('rewarded')"),     EXPECT.androidRewarded);
    eq('android geçiş kimliği',   a.get("adUnitId('interstitial')"), EXPECT.androidInterstitial);
    eq('ios ödüllü kimliği (TEST kipi)',  i.get("adUnitId('rewarded')"),     EXPECT.iosRewardedTest);
    eq('ios geçiş kimliği (TEST kipi)',   i.get("adUnitId('interstitial')"), EXPECT.iosInterstitialTest);

    check('iOS ile Android kimlikleri ÇAKIŞMIYOR',
          i.get("adUnitId('rewarded')") !== a.get("adUnitId('rewarded')") &&
          i.get("adUnitId('interstitial')") !== a.get("adUnitId('interstitial')"),
          'iOS Android kimliğini kullanıyor — sessizce hiç reklam dolmaz');
  }

  console.log('\n2. iOS TEST KİPİ (YAYIN ENGELİ)');
  {
    const i = boot('ios');
    const ids = i.get('AD_IDS');
    eq('IOS_ADS_TEST_MODE şu an açık', i.get('IOS_ADS_TEST_MODE'), true);
    // Gerçek birimler kodda DURMALI: test kipi kapatıldığında elle
    // yeniden yazılacak bir değer, kaybolmuş bir değerdir.
    eq('iOS GERÇEK ödüllü birim kodda duruyor', ids.ios.rewarded, EXPECT.iosRewardedLive);
    eq('iOS GERÇEK geçiş birimi kodda duruyor', ids.ios.interstitial, EXPECT.iosInterstitialLive);
    eq('iOS demo ödüllü birim doğru', ids.ios.rewardedTest, EXPECT.iosRewardedTest);
    eq('iOS demo geçiş birimi doğru', ids.ios.interstitialTest, EXPECT.iosInterstitialTest);
    check('test kipinde GERÇEK birim KULLANILMIYOR',
          i.get("adUnitId('rewarded')") !== ids.ios.rewarded &&
          i.get("adUnitId('interstitial')") !== ids.ios.interstitial,
          'test kipi açıkken gerçek birime istek gidiyor');
    check('gerçek iOS birimleri kendi yayıncısıyla tutarlı',
          pubOf(ids.ios.rewarded) === pubOf(EXPECT.iosAppId) &&
          pubOf(ids.ios.interstitial) === pubOf(EXPECT.iosAppId),
          'iOS uygulama kimliği ile birimleri farklı yayıncıda — reklam hiç dolmaz');
    check('yayın engeli kaynakta işaretli',
          /YAYIN ENGEL/i.test(APP_SRC) && /IOS_ADS_TEST_MODE/.test(APP_SRC),
          'IOS_ADS_TEST_MODE yayın engeli olarak işaretlenmemiş');
  }

  console.log('\n3. TEST CİHAZI AYRIMI');
  {
    const a = boot('android'), i = boot('ios');
    eq('android listesi DEĞİŞMEDİ', a.get('adTestDevices()'), EXPECT.androidDevices);
    eq('ios listesi boş (hash henüz yok)', i.get('adTestDevices()'), []);
    // Android hash'i imza anahtarına bağlı; iOS'ta geçersiz. Geçersiz bir
    // hash SDK tarafından SESSİZCE yok sayılır — "korunuyorum" sanılan
    // cihaz gerçek reklam görür. Bu yüzden sızma tek yönlü denetleniyor.
    check('android hash\'leri iOS listesine SIZMADI',
          i.get('adTestDevices()').length === 0,
          'iOS listesinde Android hash\'i var — sahte koruma');
  }
  {
    // initialize()'a giden yapılandırma platforma göre doğru mu?
    const a = boot('android');
    a.get('RewardedAd').show(10, function () {});
    await flush();
    const ia = a.plugin.argOf('initialize');
    eq('android initialize testingDevices', ia && ia.testingDevices, EXPECT.androidDevices);
    eq('android initializeForTesting açık', ia && ia.initializeForTesting, true);

    const i = boot('ios');
    i.get('RewardedAd').show(10, function () {});
    await flush();
    const ii = i.plugin.argOf('initialize');
    eq('ios initialize testingDevices boş', ii && ii.testingDevices, []);
    // Liste boşken açmak anlamsız — bayrak listeye bağlı olmalı.
    eq('ios initializeForTesting kapalı', ii && ii.initializeForTesting, false);
  }

  console.log('\n4. ANDROID DAVRANIŞI DEĞİŞMEDİ');
  {
    const a = boot('android');
    a.get('RewardedAd').show(10, function () {});
    await flush();
    const rw = a.plugin.argOf('prepareRewardVideoAd');
    check('android ödüllü istek yapıldı', !!rw, a.plugin.names().join(','));
    eq('android ödüllü GERÇEK kimlikle', rw && rw.adId, EXPECT.androidRewarded);
    eq('android ödüllü isTesting=false', rw && rw.isTesting, false);
  }
  {
    const a = boot('android');
    a.get('InterstitialAds')._present(function () {}, function () {});
    await flush();
    const it = a.plugin.argOf('prepareInterstitial');
    check('android geçiş isteği yapıldı', !!it, a.plugin.names().join(','));
    eq('android geçiş GERÇEK kimlikle', it && it.adId, EXPECT.androidInterstitial);
    eq('android geçiş isTesting=false', it && it.isTesting, false);
  }

  console.log('\n5. iOS İSTEKLERİ DOĞRU KİMLİKLE GİDİYOR');
  {
    const i = boot('ios');
    i.get('RewardedAd').show(10, function () {});
    await flush();
    const rw = i.plugin.argOf('prepareRewardVideoAd');
    check('ios ödüllü istek yapıldı', !!rw, i.plugin.names().join(','));
    eq('ios ödüllü DEMO kimlikle', rw && rw.adId, EXPECT.iosRewardedTest);
    // isTesting yine false: eklenti true iken BİZİM adId'mizi atıp kendi
    // demo birimini koyuyor. Demo birimi zaten biz veriyoruz, yani açmak
    // hiçbir şey kazandırmaz ve gerçek birime geçince tehlikeli olur.
    eq('ios ödüllü isTesting=false', rw && rw.isTesting, false);
  }
  {
    const i = boot('ios');
    i.get('InterstitialAds')._present(function () {}, function () {});
    await flush();
    const it = i.plugin.argOf('prepareInterstitial');
    check('ios geçiş isteği yapıldı', !!it, i.plugin.names().join(','));
    eq('ios geçiş DEMO kimlikle', it && it.adId, EXPECT.iosInterstitialTest);
    eq('ios geçiş isTesting=false', it && it.isTesting, false);
  }

  console.log('\n6. Info.plist');
  {
    const appId = (/<key>GADApplicationIdentifier<\/key>\s*<string>([^<]+)<\/string>/.exec(PLIST) || [])[1];
    eq('GADApplicationIdentifier iOS uygulama kimliği', appId, EXPECT.iosAppId);
    check('NSUserTrackingUsageDescription VAR',
          PLIST.indexOf('NSUserTrackingUsageDescription') >= 0,
          'ATT anahtarı yok — UMP izni istediği anda uygulama sonlanır');
    const att = (/<key>NSUserTrackingUsageDescription<\/key>\s*<string>([^<]+)<\/string>/.exec(PLIST) || [])[1];
    check('ATT açıklaması anlamlı bir cümle',
          !!att && att.length > 25 && /ad|reklam/i.test(att),
          'açıklama boş ya da reklamdan söz etmiyor: ' + att);
    // Android'in yayıncısı buraya yazılırsa reklam sessizce hiç dolmaz.
    check('plist Android yayıncısını İÇERMİYOR',
          PLIST.indexOf(pubOf(EXPECT.androidRewarded)) < 0,
          'iOS plist\'inde Android yayıncı kimliği var');
  }

  console.log('\n7. ATT — AKTİF ÇAĞRI YOK (UMP yönetiyor)');
  {
    // ATT diyaloğunu AdMob panelindeki IDFA mesajı açıyor. Uygulama da
    // isterse kullanıcı iki diyalog görür ve ikincisi hiçbir zaman
    // gösterilmez (iOS izni bir kez sorar) — yani sessiz bir çelişki.
    for (const rel of ['core/app.js', 'index.html']) {
      const src = readSrc(rel);
      check(rel + ' requestTrackingAuthorization çağırmıyor',
            src.indexOf('requestTrackingAuthorization') < 0,
            'uygulama ATT\'yi kendisi istiyor — UMP ile çakışır');
      check(rel + ' ATTrackingManager kullanmıyor',
            src.indexOf('ATTrackingManager') < 0);
    }
    // Gerçek reklam akışı boyunca da çağrılmadığını doğrula: kaynak
    // taraması dinamik bir çağrıyı (Plugins.AdMob[isim]) göremez.
    const i = boot('ios');
    i.get('RewardedAd').show(10, function () {});
    await flush();
    check('ödüllü akışta ATT çağrısı yapılmadı',
          i.plugin.names().indexOf('requestTrackingAuthorization') < 0,
          'akış ATT istedi: ' + i.plugin.names().join(','));
  }

  console.log('\n8. RIZA KAPISI — CONSENT OLMADAN İSTEK YOK');
  {
    // canRequestAds=false: kapsam içi bölge, rıza alınmamış.
    const deny = {
      status: 'REQUIRED', canRequestAds: false,
      privacyOptionsRequirementStatus: 'REQUIRED', isConsentFormAvailable: true,
    };
    for (const platform of ['ios', 'android']) {
      const b = boot(platform, { consent: deny });
      b.get('RewardedAd').show(10, function () {});
      await flush();
      check(platform + ': rıza yokken ödüllü prepare YAPILMADI',
            b.plugin.count('prepareRewardVideoAd') === 0,
            'rıza olmadan reklam istendi: ' + b.plugin.names().join(','));

      const b2 = boot(platform, { consent: deny });
      b2.get('InterstitialAds')._present(function () {}, function () {});
      await flush();
      check(platform + ': rıza yokken geçiş prepare YAPILMADI',
            b2.plugin.count('prepareInterstitial') === 0,
            'rıza olmadan reklam istendi: ' + b2.plugin.names().join(','));

      // preload()'un DÖNÜŞÜ BEKLENMİYOR, ve bu bilerek. İç promise ancak
      // `loaded`/`failedToLoad` olayı geldiğinde çözülüyor; sahte eklenti
      // hiçbir olay ateşlemediği için `await` sonsuza kadar asılır.
      //
      // Bu, hatayı geri koyarak ölçülürken bulundu: rıza kapısı
      // kaldırıldığında koşum DÜŞMEDİ, DONDU — ve boş çıktı "geçti" gibi
      // okundu. Asılabilen bir denetim, yanlış cevap veren bir denetimden
      // beterdir; burada sorulan şey zaten "istek gitti mi", "yükleme
      // bitti mi" değil.
      const b3 = boot(platform, { consent: deny });
      b3.get('RewardedAd').preload();
      await flush();
      check(platform + ': rıza yokken preload istek YAPMADI',
            b3.plugin.count('prepareRewardVideoAd') === 0,
            'ön yükleme rızayı atladı');
    }
  }
  {
    // ATT reddi TEK BAŞINA reklamları kapatmaz. UMP canRequestAds=true
    // diyorsa IDFA olmadan (kişiselleştirilmemiş) reklam istenebilir —
    // ATT'yi reklamların anahtarı sanmak gelir kaybettiren bir hata.
    const attDenied = {
      status: 'OBTAINED', canRequestAds: true,
      privacyOptionsRequirementStatus: 'REQUIRED', isConsentFormAvailable: true,
    };
    const i = boot('ios', { consent: attDenied });
    i.get('RewardedAd').show(10, function () {});
    await flush();
    check('ios: canRequestAds=true ise IDFA olmadan da reklam isteniyor',
          i.plugin.count('prepareRewardVideoAd') === 1,
          'ATT reddi reklamları tamamen kapatmış: ' + i.plugin.names().join(','));
  }

  console.log('\n9. ÖDÜL YALNIZ GERÇEK REWARDED OLAYINDA');
  {
    // Olay adları kum havuzundaki AD_EV'den okunuyor, elle yazılmıyor:
    // eklentinin enum'undan kopyalanmış ham dizeler bunlar ve testte
    // ikinci bir kopya tutmak, yanlış adla ateşlenen bir olayın "ödül
    // verilmedi" diye YANLIŞ NEDENLE geçmesi demek olurdu.
    const EV = boot('ios').get('AD_EV');
    check('AD_EV okunabildi', !!EV && !!EV.rewarded && !!EV.dismissed);

    // Kapatma → ödül YOK. En pahalı hata bunun tersi olurdu.
    const i = boot('ios');
    i.sb.__granted = 0;
    i.get('RewardedAd').show(10, function () { i.sb.__granted++; });
    await flush();
    i.plugin.fire(EV.dismissed);
    await flush();
    eq('reklam ödülsüz kapandı → ödül YOK', i.sb.__granted, 0);

    // Rewarded → Dismissed sırası gerçek SDK'nın sırası.
    const b = boot('ios');
    b.sb.__granted = 0;
    b.get('RewardedAd').show(10, function () { b.sb.__granted++; });
    await flush();
    b.plugin.fire(EV.rewarded);
    b.plugin.fire(EV.dismissed);
    await flush();
    eq('Rewarded olayı geldi → ödül VERİLDİ', b.sb.__granted, 1);

    // Yükleme hatası: ödül yok, kilit de takılı kalmıyor.
    const c = boot('ios');
    c.sb.__granted = 0;
    c.get('RewardedAd').show(10, function () { c.sb.__granted++; });
    await flush();
    c.plugin.fire(EV.failedToLoad);
    await flush();
    eq('yüklenemedi → ödül YOK', c.sb.__granted, 0);
    eq('_pending kilidi bırakıldı', c.get('RewardedAd._pending'), false);
  }

  console.log('\n10. PLUS VE WEB SİMÜLASYONU BOZULMADI');
  {
    // Plus: reklam hiç istenmez, ödül doğrudan verilir.
    const i = boot('ios');
    i.get('PlusSystem').activate('monthly');
    i.sb.__granted = 0;
    eq('ios + Plus: runRewardedAction true',
       i.get('runRewardedAction({ icon: "x", text: "y" }, () => { __granted++; })'), true);
    eq('ios + Plus: ödül anında verildi', i.sb.__granted, 1);
    eq('ios + Plus: hiç reklam istenmedi', i.plugin.count('prepareRewardVideoAd'), 0);
    eq('ios + Plus: geçiş reklamı da kapalı', i.get('InterstitialAds.canShow()'), false);
  }
  {
    // Web: eklenti yok → simülasyon. show() kabul etmeli, yoksa birincil
    // geliştirme yüzeyi (CLAUDE.md §1) reklamsız kalır.
    const w = boot('web');
    eq('web: adsSupported true', w.get('adsSupported()'), true);
    eq('web: adMobPlugin null', w.get('adMobPlugin() === null'), true);
    eq('web: show() simülasyonu kabul ediyor',
       w.get('RewardedAd.show({ icon: "x", text: "y" }, () => {})'), true);
  }
  {
    const i = boot('ios'), a = boot('android');
    eq('ios artık adsSupported', i.get('adsSupported()'), true);
    eq('android hâlâ adsSupported', a.get('adsSupported()'), true);
  }

  console.log('\n11. KAYNAK TARAMASI');
  {
    // Kimlik seçimi TEK KAPIDAN geçmeli. Doğrudan AD_IDS.android.* yazan
    // bir prepare çağrısı, iOS'ta sessizce Android kimliğiyle istek yapar.
    check('hiçbir yerde doğrudan AD_IDS.android/ios birimi istenmiyor',
          !/adId:\s*AD_IDS\./.test(APP_SRC),
          'bir prepare çağrısı merkezi seçiciyi atlıyor');
    const adIdCalls = (APP_SRC.match(/adId:\s*adUnitId\(/g) || []).length;
    eq('üç prepare çağrısı da adUnitId() kullanıyor', adIdCalls, 3);

    eq('adUnitId tek kez tanımlı', (APP_SRC.match(/function adUnitId\(/g) || []).length, 1);
    eq('adPlatform tek kez tanımlı', (APP_SRC.match(/function adPlatform\(/g) || []).length, 1);
    eq('adTestDevices tek kez tanımlı', (APP_SRC.match(/function adTestDevices\(/g) || []).length, 1);

    check('initialize testingDevices\'ı seçiciden alıyor',
          /testingDevices:\s*adTestDevices\(\)/.test(APP_SRC),
          'ham AD_TEST_DEVICES initialize\'a gidiyor — iOS de Android listesini alır');

    check('kaynakta isTesting: true kalmadı',
          !/isTesting:\s*true/.test(APP_SRC),
          'isTesting açık — gerçek oyuncuya demo reklam gösterilir');

    // adsSupported hâlâ show()'da _pending'DEN ÖNCE. Sonraya kayarsa
    // kalkan bir daha inmez ve oyuncu hiç reklam açamaz.
    const show = /show\(reward, onComplete\)\s*\{([\s\S]*?)\n  \},/.exec(APP_SRC);
    check('show() gövdesi bulundu', !!show);
    if (show) {
      const gate = show[1].indexOf('adsSupported()');
      const pend = show[1].indexOf('this._pending = true');
      check('platform kapısı _pending ATAMASINDAN önce',
            gate >= 0 && pend >= 0 && gate < pend,
            'kapı sonraya kalmış: kilit bir daha açılmaz');
    }
  }

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

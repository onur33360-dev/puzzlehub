#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Reklam Yayın Hazırlığı Doğrulaması
// ═══════════════════════════════════════════════════════════════
//   node tools/ad-release-test.js
//
// Kardeş araçların (game-events, ad-consent, interstitial) aksine burada
// test edilen şey davranış değil, YAYIN GÜVENLİĞİ. Cevaplanan tek soru:
// "gerçek reklam birimleriyle yayına çıkmak ŞU AN güvenli mi?"
//
// Neden ayrı bir araç: interstitial-test.js "depoda yalnızca test kimliği
// var" diye iddia ediyordu ve bu iddia yayına çıkarken ZORUNLU olarak
// bozuluyor. Bir testi geçmek için silmek yerine, kuralın kendisini
// taşıdık: kimlikler gerçekse başka koşullar devreye giriyor.
//
// Denetlenen üç kural:
//   1. Gerçek birim kimliği varsa AD_TEST_DEVICES boş OLAMAZ.
//      (kendi reklamına tıklamak = geçersiz trafik = hesap askıya alınır)
//   2. isTesting her iki reklam biçiminde de KAPALI olmalı.
//      (açıkken eklenti bizim kimliğimizi atıp demo birimi kullanıyor)
//   3. AndroidManifest'teki uygulama kimliği ile birim kimlikleri AYNI
//      yayıncıya (pub-...) ait olmalı.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox } = require('./dom-sandbox');

const APP_SRC = fs.readFileSync(path.join(ROOT, 'core/app.js'), 'utf8');
const MANIFEST = fs.readFileSync(
  path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');

// Google'ın resmî demo yayıncısı. Hiçbir hesaba bağlı değil, o yüzden
// bu yayıncıya ait kimlikler "gerçek değil" demek.
// developers.google.com/admob/android/test-ads
const DEMO_PUB = 'ca-app-pub-3940256099942544';

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

// Bir reklam kimliğinin yayıncı kısmı: ca-app-pub-1234/5678 → ca-app-pub-1234
function pubOf(id) { return String(id || '').split(/[~/]/)[0]; }

function fakePlugin() {
  const calls = [], listeners = {};
  return {
    calls, listeners,
    names() { return calls.map(c => c[0]); },
    argOf(name) { const c = calls.find(x => x[0] === name); return c && c[1]; },
    // Çift dokunuş ve ön yükleme senaryoları için: olay akışını biz
    // sürüyoruz, çünkü test edilen şey "hangi olaydan sonra ne serbest
    // kalıyor" (interstitial-test.js'teki aynı desen).
    fire(ev, arg) { (listeners[ev] || []).forEach(f => f(arg)); },
    requestConsentInfo() {
      calls.push(['requestConsentInfo']);
      return Promise.resolve({
        status: 'NOT_REQUIRED', canRequestAds: true,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED', isConsentFormAvailable: false,
      });
    },
    initialize(o)  { calls.push(['initialize', o]); return Promise.resolve(); },
    addListener(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
      return Promise.resolve({
        remove() {
          const a = listeners[name] || [];
          const i = a.indexOf(fn);
          if (i >= 0) a.splice(i, 1);
        },
      });
    },
    prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o]); return Promise.resolve(); },
    showRewardVideoAd()     { calls.push(['showRewardVideoAd']); return Promise.resolve(); },
    prepareInterstitial(o)  { calls.push(['prepareInterstitial', o]); return Promise.resolve(); },
    showInterstitial()      { calls.push(['showInterstitial']); return Promise.resolve(); },
  };
}

function boot() {
  const s = makeSandbox({});
  const plugin = fakePlugin();
  s.sb.Capacitor = { isNativePlatform: () => true, Plugins: { AdMob: plugin } };
  const AC = s.get('AdConsent');
  AC._promise = null; AC._info = null;
  s.get('RewardedAd')._initPromise = null;
  return { s, plugin, get: s.get };
}

const wait = () => new Promise(r => setImmediate(r));
async function flush(n) { for (let i = 0; i < (n || 8); i++) await wait(); }

(async function () {
  console.log('SlySwipe — Reklam Yayın Hazırlığı');

  const b0 = boot();
  const ids = b0.get('AD_IDS');
  const devices = b0.get('AD_TEST_DEVICES');
  const manifestId = (MANIFEST.match(/ca-app-pub-[\d~/]+/) || [''])[0];

  const unitIds = [ids.rewardedAndroid, ids.interstitialAndroid];
  const anyReal = unitIds.some(id => pubOf(id) !== DEMO_PUB) ||
                  (manifestId && pubOf(manifestId) !== DEMO_PUB);

  console.log('\n0. DURUM');
  console.log('   ödüllü      : ' + ids.rewardedAndroid);
  console.log('   geçiş       : ' + ids.interstitialAndroid);
  console.log('   manifest    : ' + manifestId);
  console.log('   test cihazı : ' + (devices.length ? devices.length + ' adet' : 'yok'));
  console.log('   kip         : ' + (anyReal ? 'GERÇEK KİMLİK' : 'demo kimlikler'));

  // ═════════ 1. ASIL KURAL ═════════
  //
  // Gerçek bir birim kimliğiyle geliştirmek, kendi reklamını izlemek
  // demek — Google bunu geçersiz trafik sayıyor ve hesabı askıya alıyor.
  // Tek meşru korunma yolu test cihazı listesi: o listedeki cihaza SDK,
  // kimlik gerçek olsa bile TEST reklamı sunuyor, gösterim hesaba işlemiyor.
  //
  // Bu yüzden iki durum tutarlı olmak zorunda. Gerçek kimlik VE boş
  // liste, geliştiricinin bir sonraki açılışta kendi reklamını gerçek
  // olarak izlemesi demektir — sessiz, geri alınamaz ve pahalı.
  console.log('\n1. GERÇEK KİMLİK ⇒ TEST CİHAZI ZORUNLU');
  if (anyReal) {
    check('gerçek kimlik var, AD_TEST_DEVICES DOLU',
          devices.length > 0,
          'AD_TEST_DEVICES boş. Cihazda `adb logcat | grep TestDeviceHashedId` ' +
          'çalıştırıp hash\'i core/app.js\'e ekle — yoksa kendi reklamını ' +
          'gerçek izlersin ve AdMob hesabı askıya alınabilir.');
    // `[].every` her zaman true döner — boş listede bu iddia hiçbir şey
    // söylemez ve "geçti" yazması yanıltıcı olur. Liste doluysa denetlenir.
    if (devices.length) {
      check('test cihazı hash\'leri makul biçimde',
            devices.every(d => typeof d === 'string' && /^[A-F0-9]{32}$/i.test(d)),
            'hash 32 haneli onaltılık olmalı: ' + JSON.stringify(devices));
    }
  } else {
    ok('demo kimlikler kullanılıyor — test cihazı şart değil');
    // Her demo birimin başında bir TODO durmalı: geçici olduklarını
    // işaretleyen tek şey o. AD_TEST_DEVICES'ın TODO'su sayılmıyor —
    // o liste demo kimliklerden BAĞIMSIZ olarak doldurulabilir ve
    // doldurulduğunda TODO'sunun kalkması doğrudur.
    const idBlock = (APP_SRC.match(/const AD_IDS = \{[\s\S]*?\n\};/) || [''])[0];
    const demoCount = unitIds.filter(id => pubOf(id) === DEMO_PUB).length;
    check('her demo birimin TODO işareti duruyor',
          (idBlock.match(/TODO\(yayın\)/g) || []).length >= demoCount,
          demoCount + ' demo birim var, o kadar TODO bekleniyordu:\n' + idBlock);
  }

  // ═════════ 2. isTesting KAPALI ═════════
  //
  // Bu bayrak göründüğü gibi çalışmıyor. Eklentinin
  // AdViewIdHelper.getFinalAdId'i şunu yapıyor:
  //     isTesting false                → bizim adId'miz
  //     isTesting true + test cihazı   → bizim adId'miz
  //     isTesting true + NORMAL cihaz  → Google'ın DEMO birimi
  // Yani açık bırakmak "ekstra emniyet" değil; gerçek oyuncuya demo
  // reklam göstermek, yani sıfır gelir demek.
  console.log('\n2. isTesting KAPALI (yoksa gerçek oyuncu demo reklam görür)');
  {
    const b = boot();
    b.get('RewardedAd').show(10, function () {});
    await flush();
    const rw = b.plugin.argOf('prepareRewardVideoAd');
    check('ödüllü reklam istendi', !!rw, b.plugin.names().join(','));
    eq('ödüllü isTesting=false', rw && rw.isTesting, false);
    eq('ödüllü GERÇEK AD_IDS kimliğiyle istendi', rw && rw.adId, ids.rewardedAndroid);
  }
  {
    // Sıklık kapısı (maybeShow) burada test edilmiyor — o interstitial-test'in
    // işi. Buradaki soru sadece "istek hangi kimlikle ve hangi bayrakla
    // gidiyor", o yüzden gösterim doğrudan _present ile tetikleniyor.
    const b = boot();
    b.get('InterstitialAds')._present(function () {}, function () {});
    await flush();
    const it = b.plugin.argOf('prepareInterstitial');
    check('geçiş reklamı istendi', !!it, b.plugin.names().join(','));
    eq('geçiş isTesting=false', it && it.isTesting, false);
    eq('geçiş AD_IDS kimliğiyle istendi', it && it.adId, ids.interstitialAndroid);
  }
  check('kaynakta hiçbir yerde isTesting: true kalmadı',
        !/isTesting:\s*true/.test(APP_SRC),
        'core/app.js hâlâ isTesting: true içeriyor');

  // ═════════ 3. TEST CİHAZI LİSTESİ SDK'YA ULAŞIYOR ═════════
  //
  // Liste initialize()'dan geçiyor, reklam isteğinden değil: eklenti
  // testingDevices'ı yalnızca orada okuyup setRequestConfiguration'a
  // veriyor (AdMob.java satır 200-203, 252). Tek çağrı tüm reklam
  // biçimlerini kapsıyor — yani bu bağlantı koparsa İKİ biçim birden
  // korumasız kalır, sadece biri değil.
  console.log('\n3. LİSTE SDK\'YA ULAŞIYOR');
  {
    const b = boot();
    b.get('RewardedAd').show(10, function () {});
    await flush();
    const init = b.plugin.argOf('initialize');
    check('initialize çağrıldı', !!init, b.plugin.names().join(','));
    eq('testingDevices AD_TEST_DEVICES ile aynı', init && init.testingDevices, devices);
    eq('initializeForTesting listeye bağlı',
       init && init.initializeForTesting, devices.length > 0);
  }
  {
    // initialize BİR KEZ — ödüllü ve geçiş aynı promise'i paylaşıyor.
    // İkinci bir initialize, ikinci bir setRequestConfiguration demek
    // olurdu ve hangisinin kazandığı belirsiz kalırdı.
    const b = boot();
    b.get('RewardedAd').show(10, function () {});
    await flush();
    b.get('InterstitialAds')._present(function () {}, function () {});
    await flush();
    eq('initialize yalnızca bir kez',
       b.plugin.names().filter(n => n === 'initialize').length, 1);
  }

  // ═════════ 3.5. ÇİFT DOKUNUŞ VE ÖN YÜKLEME ═════════
  //
  // Cihazda bildirilen hata (2026-08-07): reklam ~4 saniye gecikmeyle
  // geliyordu ve o pencerede düğmeye 3-4 kez basılabiliyordu; her basış
  // yeni bir istek başlatıp arka arkaya reklam açıyordu.
  //
  // Buradaki iddiaların değeri sayaçta değil EKONOMİDE: her tamamlanan
  // reklam AdBudget.consume() çağırdığı için, tek bir "devam et" niyeti
  // oyuncunun birden çok reklam hakkını yiyordu.
  console.log('\n3.5. ÇİFT DOKUNUŞ KALKANI');
  {
    const b = boot();
    const R = b.get('RewardedAd');
    const ilk = R.show(10, function () {});
    const ikinci = R.show(10, function () {});
    const ucuncu = R.show(10, function () {});
    await flush();
    eq('ilk dokunuş kabul edildi', ilk, true);
    eq('ikinci dokunuş REDDEDİLDİ', ikinci, false);
    eq('üçüncü dokunuş REDDEDİLDİ', ucuncu, false);
    eq('yalnızca BİR gösterim isteği gitti',
       b.plugin.names().filter(n => n === 'showRewardVideoAd').length, 1);
    eq('yalnızca BİR hazırlama isteği gitti',
       b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length, 1);
  }
  {
    // Kalkan KALICI OLMAMALI: reklam kapandıktan sonra bir sonraki
    // dokunuş çalışmalı. Unutulan bir _pending, oyuncunun bir daha hiç
    // reklam izleyememesi demek olurdu — sessiz ve teşhisi zor.
    const b = boot();
    const R = b.get('RewardedAd');
    R.show(10, function () {});
    await flush();
    b.plugin.fire(b.get('AD_EV').rewarded);
    b.plugin.fire(b.get('AD_EV').dismissed);
    await flush();
    eq('gösterim bitince _pending bırakıldı', R._pending, false);
    eq('sonraki dokunuş yeniden kabul ediliyor', R.show(10, function () {}), true);
  }
  {
    // Ön yükleme gerçekten prepare çağırıyor mu, ve gösterim onu KULLANIYOR
    // mu (yani ikinci bir prepare gitmiyor mu)? Gecikme düzeltmesinin
    // tamamı bu iki cümlede.
    const b = boot();
    const R = b.get('RewardedAd');
    R.preload();
    await flush();
    b.plugin.fire(b.get('AD_EV').loaded);
    await flush();
    eq('ön yükleme sonrası hazır', R._ready, true);
    eq('ön yükleme bir prepare çağırdı',
       b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length, 1);

    R.show(10, function () {});
    await flush();
    eq('gösterim İKİNCİ bir prepare yapmadı',
       b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length, 1);
    eq('gösterim yapıldı',
       b.plugin.names().filter(n => n === 'showRewardVideoAd').length, 1);
  }
  {
    // Ön yükleme SESSİZ olmalı: oyuncu bir şey istemedi. Başarısız bir
    // ön yükleme toast göstermemeli ve bütçeye dokunmamalı.
    const b = boot();
    const R = b.get('RewardedAd');
    R.preload();
    await flush();
    b.plugin.fire(b.get('AD_EV').failedToLoad);
    await flush();
    eq('başarısız ön yükleme hazır bırakmadı', R._ready, false);
    eq('ön yükleme bütçeye dokunmadı', b.get('AdBudget').remaining(), b.get('AdBudget').limit());
  }
  {
    // ÖN YÜKLEME AÇILIŞTA TETİKLENMEMELİ — seçilen strateji "hedefli"
    // (yalnızca teklif ekranı açılınca), "sürekli sıcak tut" değil.
    // Bu iddia bir hatadan doğdu: preload() önce refreshGameOverOffers()'a
    // konmuştu, ama o fonksiyon AdBudget.updateUI()'dan da çağrılıyor ve
    // updateUI açılışta çalışıyor — yani strateji sessizce diğerine
    // dönüşmüştü. Cihazda `_ready:true` görülünce fark edildi.
    const b = boot();
    b.get('AdBudget').updateUI();
    await flush();
    eq('AdBudget.updateUI() ön yükleme TETİKLEMİYOR',
       b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length, 0);
    check('preload çağrısı refreshGameOverOffers içinde DEĞİL',
          !/RewardedAd\.preload\(\)/.test(
            (APP_SRC.match(/function refreshGameOverOffers\(\)[\s\S]*?\n\}/) || [''])[0]),
          'updateUI oradan geçiyor, açılışta da tetiklenir');
    check('preload çağrısı showGameOver içinde',
          /RewardedAd\.preload\(\)/.test(
            (APP_SRC.match(/function showGameOver\([\s\S]*?\n\}/) || [''])[0]));
  }
  {
    // ÖN YÜKLEME OYUNUN BAŞINDA. Bu iddia ikinci bir cihaz raporundan
    // doğdu: panelin açılışında başlatmak yetmiyordu, çünkü ölçülen ilk
    // yükleme 6580 ms ve oyuncu kaybettiği anda düğmeye basıyor. Aradaki
    // pencerenin yükleme süresinden BÜYÜK olması gerekiyor; bunu sağlayan
    // tek an oyunun başı.
    check('preload çağrısı playGame içinde',
          /RewardedAd\.preload\(\)/.test(
            (APP_SRC.match(/function playGame\(name, opts\)[\s\S]*?\n\}/) || [''])[0]),
          'panel açılışı tek başına yetmiyor — ölçüm: ilk yükleme 6580 ms');
    // Açılışta SDK ısıtılıyor ama reklam İSTENMİYOR: initialize() bir ağ
    // reklam isteği değil, o yüzden hedefli stratejiyi bozmuyor.
    const boot = (APP_SRC.match(/AdConsent\.ensure\(\)\.then\([\s\S]*?\n  \}\);/) || [''])[0];
    check('açılışta _ensureInit ısıtılıyor', /_ensureInit/.test(boot), boot);
    check('açılışta preload ÇAĞRILMIYOR', !/preload\(/.test(boot), boot);
  }
  {
    // Yükleme sürerken düğme durumu: dokunuş yutulmuş gibi görünmemeli.
    const b = boot();
    const R = b.get('RewardedAd');
    R.show(10, function () {});
    await flush();
    const src = (APP_SRC.match(/function refreshGameOverOffers\(\)[\s\S]*?\n\}/) || [''])[0];
    check('düğme "yükleniyor" durumunu gösteriyor',
          /_pending/.test(src) && /yükleniyor/i.test(src), src.slice(0, 400));
    check('show() düğmeleri hemen tazeliyor',
          /_pending = true;[\s\S]{0,220}refreshGameOverOffers\(\)/.test(APP_SRC));
  }
  {
    // Kaynak taraması: kalkan TEK yerde, show()'un içinde. Çağrı
    // noktalarına dağılırsa biri güncellenir, diğerleri eski kalır —
    // bütçesiz reklam hatasının kaynağı tam olarak buydu (CLAUDE.md).
    const blok = (APP_SRC.match(/\n  show\(reward, onComplete\) \{[\s\S]*?\n  \},/) || [''])[0];
    check('kalkan show() içinde', /_pending/.test(blok), blok);
    check('runRewardedAction kendi kalkanını KURMUYOR',
          !/_pending/.test((APP_SRC.match(/function runRewardedAction\([\s\S]*?\n\}/) || [''])[0]));
  }

  // ═════════ 3.6. GÜNLÜK HAK YALNIZCA ELMASA ═════════
  //
  // 2026-08-07 sahip kararı: günlük reklam hakkı SADECE ücretsiz elmas
  // musluğunu sınırlar. Devam etme, yeniden başlatma, önceki seviye,
  // karıştırma, ipucu, 2x skor — hepsi fayda eylemi ve sınırsız.
  //
  // Buradaki en kritik iddia SON İKİSİ: varsayılan "bütçeye tabi" olmak
  // zorunda. Yeni bir elmas veren eylem eklenip bayrak unutulursa sonuç
  // sınırsız elmas olur; fayda eyleminde unutulursa sadece gereksiz sınır.
  // Yani yanlış tarafa düşmenin ucuz olduğu yön korunmalı.
  console.log('\n3.6. GÜNLÜK HAK YALNIZCA ELMASA');
  {
    const b = boot();
    const AB = b.get('AdBudget');
    const bas = AB.remaining();
    // Fayda eylemi: bütçeye DOKUNMAMALI.
    b.get('runRewardedAction')({ icon: 'x', text: 'y' }, function () {}, { skipDailyLimit: true });
    await flush();
    b.plugin.fire(b.get('AD_EV').rewarded);
    b.plugin.fire(b.get('AD_EV').dismissed);
    await flush();
    eq('fayda eylemi günlük hakkı TÜKETMİYOR', AB.remaining(), bas);
  }
  {
    const b = boot();
    const AB = b.get('AdBudget');
    const bas = AB.remaining();
    // Bayraksız çağrı: bütçeye İŞLEMELİ (güvenli varsayılan).
    b.get('runRewardedAction')({ icon: 'x', text: 'y' }, function () {});
    await flush();
    b.plugin.fire(b.get('AD_EV').rewarded);
    b.plugin.fire(b.get('AD_EV').dismissed);
    await flush();
    eq('bayraksız çağrı günlük hakkı TÜKETİYOR (güvenli varsayılan)',
       AB.remaining(), bas - 1);
  }
  {
    // Bütçe SIFIRKEN: fayda eylemi çalışmalı, elmas eylemi reddedilmeli.
    const b = boot();
    const AB = b.get('AdBudget');
    while (AB.canWatch()) AB.consume();
    eq('bütçe sıfırlandı', AB.remaining(), 0);

    const faydaOk = b.get('runRewardedAction')({ icon: 'x', text: 'y' }, function () {},
                                               { skipDailyLimit: true });
    eq('bütçe 0 iken fayda eylemi KABUL EDİLİYOR', faydaOk, true);
    await flush();
    check('bütçe 0 iken fayda eylemi için reklam istendi',
          b.plugin.names().indexOf('showRewardVideoAd') >= 0, b.plugin.names().join(','));

    const b2 = boot();
    const AB2 = b2.get('AdBudget');
    while (AB2.canWatch()) AB2.consume();
    const elmasOk = b2.get('runRewardedAction')({ icon: 'x', text: 'y' }, function () {});
    eq('bütçe 0 iken elmas eylemi REDDEDİLİYOR', elmasOk, false);
    await flush();
    check('reddedilen elmas eylemi için reklam İSTENMEDİ',
          b2.plugin.names().indexOf('showRewardVideoAd') < 0, b2.plugin.names().join(','));
  }
  {
    // Bütçe 0 iken ÖN YÜKLEME de çalışmalı. Aksi hâlde bütçe, kaldırıldığı
    // hâlde gecikme üzerinden etkisini sürdürürdü: fayda eylemleri çalışır
    // ama her biri ~4 saniye beklerdi. Cihazda bildirilen gecikme buydu.
    const b = boot();
    const AB = b.get('AdBudget');
    while (AB.canWatch()) AB.consume();
    b.get('RewardedAd').preload();
    await flush();
    check('bütçe 0 iken ön yükleme yine de istek yapıyor',
          b.plugin.names().indexOf('prepareRewardVideoAd') >= 0,
          'preload AdBudget kontrolü yüzünden erken dönüyor olabilir');
  }
  {
    // Gösterim bitince bir SONRAKİ reklam yükleniyor mu? Fayda eylemleri
    // sınırsız olduğu için arka arkaya kullanım normal; ikincisinin yavaş
    // olması düzeltmeyi yarım bırakırdı.
    const b = boot();
    const R = b.get('RewardedAd');
    R.show(10, function () {});
    await flush();
    const oncekiSayi = b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length;
    b.plugin.fire(b.get('AD_EV').rewarded);
    b.plugin.fire(b.get('AD_EV').dismissed);
    await flush();
    check('gösterimden sonra bir sonraki reklam ön yükleniyor',
          b.plugin.names().filter(n => n === 'prepareRewardVideoAd').length > oncekiSayi,
          'ikinci fayda eylemi ~4 sn gecikir');
  }
  {
    // Kaynak taraması: elmas veren tek yol (watchAdForDiamonds) bayrağı
    // ALMAMIŞ olmalı — aldığı an ücretsiz elmas sınırsızlaşır.
    const fn = (APP_SRC.match(/function watchAdForDiamonds\(\)[\s\S]*?\n\}/) || [''])[0];
    check('watchAdForDiamonds günlük hakka TABİ (skipDailyLimit YOK)',
          fn.length > 0 && !/skipDailyLimit/.test(fn),
          'elmas eylemi bütçeden muaf tutulmuş — ücretsiz elmas açığı:\n' + fn);
    // Oyun içi fayda eylemleri bayrağı almış olmalı.
    check('devam etme muaf', /_runGameOverContinuation\('ad'\)[\s\S]{0,160}skipDailyLimit: true/.test(APP_SRC));
    check('skor 2x muaf', /Skor 2 katına çıktı[\s\S]{0,200}skipDailyLimit: true/.test(APP_SRC));
  }

  // ═════════ 4. MANİFEST İLE TUTARLILIK ═════════
  //
  // Uygulama kimliği (~ ile) ve birim kimlikleri (/ ile) aynı yayıncıya
  // ait olmak zorunda. Karıştırmak klasik hata ve belirtisi sinsi:
  // uygulama açılır, hata vermez, reklamlar hiç dolmaz.
  console.log('\n4. MANİFEST ↔ AD_IDS');
  {
    check('manifestte AdMob uygulama kimliği var', !!manifestId, MANIFEST.slice(0, 200));
    check('uygulama kimliği ~ ile ayrılmış (birim kimliği değil)',
          manifestId.indexOf('~') > 0,
          manifestId + ' — birim kimliği (/) yazılmış olabilir');
    const pubs = unitIds.concat([manifestId]).map(pubOf);
    const uniq = pubs.filter((p, i) => pubs.indexOf(p) === i);
    check('manifest ve iki birim AYNI yayıncıda', uniq.length === 1,
          'birden çok yayıncı var: ' + uniq.join(' · ') +
          ' — ödüllü/geçiş/manifest üçünün de aynı pub- kimliğine ait olması gerekir');
    check('iki birim kimliği birbirinden farklı',
          ids.rewardedAndroid !== ids.interstitialAndroid,
          'ödüllü ve geçiş aynı kimliği kullanıyor');
  }

  // ═════════ 5. YAYIN ÖNCESİ DİĞER KOŞULLAR ═════════
  //
  // Reklam kimliği (AD_ID) topladığımız için Play, herkese açık bir
  // gizlilik politikası URL'i olmadan sürümü reddediyor. Metin depoda
  // duruyor; yayınlanması ayrı bir adım ama metnin var olması burada
  // denetlenebilir ve unutulması en kolay parça bu.
  console.log('\n5. GİZLİLİK POLİTİKASI');
  {
    const p = path.join(ROOT, 'site/slyswipe/gizlilik.html');
    check('gizlilik politikası metni depoda', fs.existsSync(p), p);
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf8');
      // Politika, uygulamanın GERÇEKTE ne yaptığını anlatmak zorunda.
      // Yeni bir SDK eklenip politikaya yazılmazsa bu liste yakalar.
      for (const t of ['AdMob', 'RevenueCat', 'Google Fonts', 'Unsplash'])
        check('politika ' + t + '\'i anıyor', html.indexOf(t) >= 0);
      check('reklam kimliği ve sıfırlama anlatılmış',
            /AD_ID/.test(html) && /sıfırla/i.test(html));
      check('iletişim adresi var', /mailto:/.test(html));
    }
  }

  console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
  process.exit(failures === 0 ? 0 : 1);
})();

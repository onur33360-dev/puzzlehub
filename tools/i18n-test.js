#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Yerelleştirme Doğrulaması
// ═══════════════════════════════════════════════════════════════
//   node tools/i18n-test.js            tam denetim
//   node tools/i18n-test.js --missing  yalnızca eksik anahtar raporu
//   node tools/i18n-test.js --scan     yalnızca kalan sabit metin taraması
//
// Kardeş araçlarla aynı desen: sıfır bağımlılık, dom-sandbox üzerinde vm.
// Dört katman:
//   1. SÖZLEŞME  — I18n'in kendisi (çözümleme, yedek zinciri, kalıcılık)
//   2. ANAHTAR   — en.js kanonik; her dilde eksik/fazla anahtar raporu
//   3. KAYIT     — locales/ ile SUPPORTED ve locales_config.xml aynı mı
//   4. TARAMA    — kaynakta kalan sabit Türkçe metin (migrasyon ölçer)
//
// 4. KATMAN NEDEN KIRMIZI DEĞİL: migrasyon aşamalı ilerliyor, o yüzden
// kalan metin sayısı bir HATA değil bir ÖLÇÜ. Eşik aşılırsa (aşağıdaki
// BUDGET) düşer — yani sayı azalabilir, sessizce artamaz.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, readSrc } = require('./dom-sandbox');

const LOCALES_DIR = path.join(ROOT, 'locales');
const BASE = 'en';

// Migrasyon bütçesi: kaynakta kalan sabit Türkçe metin sayısı bunu
// AŞAMAZ. Faz ilerledikçe düşürülür; yükseltmek bilinçli bir karar olmalı.
//
// 2026-08-15, Faz 4 sonu. Kalan 13'ün HER BİRİ bilinçli:
//
//   core/app.js (7)  ACHIEVEMENT_CARDS. ÇİZİLMİYOR (bkz. CLAUDE.md) ve
//                    kurulmamış bir "oyun başarımları" sisteminin mockup
//                    yer tutucusu. Var olmayan bir sistemin sahte
//                    başarım adlarını 15 dile çevirmek, tutulamayacak bir
//                    vaadi on beş kez tekrarlamak olurdu. Sistem gerçek
//                    olduğunda anahtarlanır; o güne kadar borç GÖRÜNÜR
//                    kalsın diye NOT_UI'ye de saklanmadı.
// games.js ve reels.js 2026-08-16'da SIFIRA indi (Faz 8): Kelime Avı'nın
// yedek kelimeleri (OYUN/SKOR/PUAN) ve Keşfet önizlemesinin sabit
// kelimeleri (KEDİ/DENİZ/GÜNEŞ) artık yok — ikisi de aktif dilin
// havuzundan geliyor (games/words/<kod>.js). Sabit Türk alfabesi de öyle.
//
// SAYILAR NEDEN BİR ARA "DAHA İYİ" GÖRÜNDÜ: bu bütçe önce 7/0/3/0 diye
// yazıldı ve o rakam YANLIŞTI — tarayıcının üç ayrı kör noktası vardı
// (aşağıda her biri kendi yorumuyla düzeltildi: diyakritiksiz Türkçe,
// tek karakterlik dizelerin tırnak eşleşmesini kaydırması, şablon
// `${…}` içindeki kodun taranmaması). Düzeltmelerden sonra ortaya çıkan
// ~30 metin de taşındı; buradaki 13, düzeltilmiş tarayıcının gerçeği.
// index.html EKLENDİ (2026-08-16) ve eklenmemiş olması bir boşluktu:
// Faz 4'te oradaki 56 metin düğümü `data-i18n` ile etiketlendi, ama
// dosya ölçere hiç girmedi — yani orada GÖZDEN KAÇAN bir metin olsaydı
// araç bunu asla söylemeyecekti. Bir migrasyon ölçeri, migre edilen HER
// dosyayı görmek zorundadır.
const BUDGET = {
  'core/app.js': 7, 'games/games.js': 0, 'reels/reels.js': 0,
  'core/daily.js': 0, 'index.html': 0,
};

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + (why ? '\n      ' + why : '')); }
function check(n, c, why) { c ? ok(n) : bad(n, why); }

// ── Locale tablolarını yükle ────────────────────────────────────────
// I18n.register() ile kendilerini kaydediyorlar; sahte bir I18n yeter.
function loadTables() {
  const vm = require('vm');
  const tables = {};
  const sb = { console: { warn() {}, log() {} } };
  sb.window = sb; sb.globalThis = sb;
  sb.I18n = { register(code, table) { tables[code] = table; } };
  vm.createContext(sb);
  for (const f of fs.readdirSync(LOCALES_DIR).filter(x => x.endsWith('.js'))) {
    vm.runInContext(fs.readFileSync(path.join(LOCALES_DIR, f), 'utf8'), sb, { filename: 'locales/' + f });
  }
  return tables;
}

// Bir metindeki {yerTutucu} adları
function slots(s) {
  const out = new Set();
  String(s).replace(/\{(\w+)\}/g, (m, k) => { out.add(k); return m; });
  return out;
}

const argv = process.argv.slice(2);
const only = argv.find(a => a.startsWith('--'));

console.log('SlySwipe — Yerelleştirme Doğrulaması');

const tables = loadTables();
const sandbox = makeSandbox({});
const I18n = sandbox.get('I18n');

// ═════════ 1. SÖZLEŞME ═════════
if (!only || only === '--all') {
  console.log('\n1. I18n SÖZLEŞMESİ');

  check('en kanonik yedek olarak yüklü', !!tables[BASE]);
  check('SUPPORTED 15 dil bildiriyor', I18n.SUPPORTED.length === 15,
        'gelen: ' + I18n.SUPPORTED.length);

  // Etiket çözümleme — şartnamenin örnek tablosu birebir.
  const cases = [
    ['tr', 'tr'], ['tr-TR', 'tr'], ['de-DE', 'de'], ['de', 'de'],
    ['ja', 'ja'], ['ar-EG', 'ar'], ['pt-BR', 'pt-BR'], ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'], ['zh-Hans-CN', 'zh-Hans'], ['zh-CN', 'zh-Hans'],
    ['en-US', 'en'], ['in', 'id'], ['id-ID', 'id'],
    // Desteklenmeyenler → null (çağıran taraf İngilizce'ye düşürür)
    ['fi', null], ['sv-SE', null], ['zh-TW', null],
  ];
  let resolveOk = true, firstBad = '';
  for (const [tag, want] of cases) {
    const got = I18n.resolve(tag);
    if (got !== want) { resolveOk = false; firstBad = firstBad || (tag + ' → ' + got + ', beklenen ' + want); }
  }
  check('BCP-47 etiket çözümlemesi (17 vaka)', resolveOk, firstBad);

  // Fince telefon → İngilizce. Şartnamenin ana yedek kuralı.
  const savedLangs = sandbox.sb.navigator.languages;
  sandbox.sb.navigator.languages = ['fi-FI', 'fi'];
  check('desteklenmeyen sistem dili → İngilizce', I18n.systemLocale() === BASE,
        'gelen: ' + I18n.systemLocale());
  // Tercih SIRASI okunuyor: ikinci tercih destekleniyorsa o seçilmeli.
  sandbox.sb.navigator.languages = ['fi-FI', 'de-DE', 'en-US'];
  check('tercih listesinde ilk DESTEKLENEN dil seçiliyor', I18n.systemLocale() === 'de',
        'gelen: ' + I18n.systemLocale());
  sandbox.sb.navigator.languages = savedLangs;

  // Eksik anahtar ÇÖKMEZ: önce en'e, sonra anahtarın kendisine düşer.
  check('tanımsız anahtar ham hâliyle dönüyor, patlamıyor',
        I18n.t('bu_anahtar_yok_12345') === 'bu_anahtar_yok_12345');
  check('yer tutucu yerleşiyor',
        I18n.t('game_soon', { name: 'X' }).indexOf('X') !== -1,
        I18n.t('game_soon', { name: 'X' }));
  check('eksik yer tutucu metni bozmuyor',
        I18n.t('game_soon').indexOf('{name}') !== -1);

  // Kalıcılık: mode saklanıyor, düz locale DEĞİL.
  I18n.set('ja');
  check('manuel seçim ph_lang\'e mode ile yazılıyor',
        (sandbox.store.ph_lang || '').indexOf('"mode":"manual"') !== -1,
        sandbox.store.ph_lang);
  I18n.set(null);
  check('Sistem Varsayılanı manuel geçersiz kılmayı temizliyor',
        (sandbox.store.ph_lang || '').indexOf('"mode":"system"') !== -1,
        sandbox.store.ph_lang);

  // dirFor() üzerinden: yön, dilin YÜKLÜ olmasını gerektirmeyen saf bir
  // özellik. I18n.set('ar') ile denemek Faz 5'e kadar (ar.js yokken)
  // yanıltıcı bir düşüş verirdi — dosya yüklenemediği için aktif dil
  // bilinçli olarak DEĞİŞMİYOR (yarı çevrilmiş arayüz yerine eskisi).
  check('Arapça RTL bildiriliyor', I18n.dirFor('ar') === 'rtl');
  check('ar-EG gibi bölgeli etiket de RTL', I18n.dirFor('ar-EG') === 'rtl');
  check('Türkçe LTR bildiriliyor', I18n.dirFor('tr') === 'ltr' && !I18n.isRTL);

  // Türkçe büyütme — JS'in varsayılanı bu dilde YANLIŞ.
  check("I18n.upper('istanbul') Türkçe'de İSTANBUL veriyor",
        I18n.upper('istanbul') === 'İSTANBUL', I18n.upper('istanbul'));
}

// ═════════ 2. ANAHTAR SETİ ═════════
if (!only || only === '--missing' || only === '--all') {
  console.log('\n2. ANAHTAR SETİ (kanonik: en)');
  const baseKeys = Object.keys(tables[BASE] || {}).sort();
  console.log('   kanonik anahtar sayısı: ' + baseKeys.length);

  const present = fs.readdirSync(LOCALES_DIR)
    .filter(x => x.endsWith('.js')).map(x => x.replace(/\.js$/, ''));

  let anyMissing = false;
  for (const code of present) {
    if (code === BASE) continue;
    const t = tables[code] || {};
    const keys = Object.keys(t);

    // ── ÇOĞUL KATEGORİLERİ DİLE GÖRE DEĞİŞİR ────────────────────────
    // İngilizce'de iki biçim var (one/other), Rusça'da dört
    // (one/few/many/other), Arapça'da altı (zero/two da dahil),
    // Japonca/Korece/Çince/Endonezce'de ise TEK biçim (other).
    // Yani `en`'in anahtar setiyle birebir eşitlik ŞART KOŞULAMAZ:
    // ru'nun `badges_earned_days_ago_few` anahtarı "fazla" değil,
    // Rusça'nın DOĞRU çevrilmiş olmasının kanıtıdır — ve ja'nın `_one`
    // taşımaması da eksiklik değil, o dilde böyle bir kategori yok.
    //
    // Kural: `X_<kategori>` biçimindeki bir anahtar, `X_other` kanonik
    // sette varsa meşrudur. `_other` HER dilde zorunlu kalır (tp()'nin
    // son yedeği odur), ötekiler serbesttir.
    const PLURAL_CATS = ['zero', 'one', 'two', 'few', 'many', 'other'];
    const pluralBase = (k) => {
      const m = k.match(/^(.*)_(zero|one|two|few|many|other)$/);
      return m && (m[1] + '_other') in tables[BASE] ? m[1] : null;
    };
    const missing = baseKeys.filter(k => {
      if (k in t) return false;
      const b = pluralBase(k);
      // `en`'in `_one`'ı başka dilde olmayabilir; `_other` ise zorunlu.
      return !b || k === b + '_other';
    });
    const extra = keys.filter(k => !(k in tables[BASE]) && !pluralBase(k));

    // Yer tutucu uyuşmazlığı: çeviride {level} yoksa sayı hiç görünmez.
    const slotBad = [];
    for (const k of keys) {
      if (!(k in tables[BASE])) {
        // Çoğul varyantın yer tutucuları `_other`ınkilerle aynı olmalı —
        // AMA SAYISI SABİT OLAN KATEGORİLERDE DEĞİL.
        //
        // `zero` / `one` / `two` kategorileri sayıyı zaten dilbilgisel
        // olarak taşır, o yüzden rakamı yazmak gereksiz, bazen yanlıştır:
        //   en  flappy_over_msg_one: 'You passed 1 gate.'   ({n} YOK)
        //   ar  badges_earned_days_ago_two: '…قبل يومين'    (ikil biçim;
        //       "2" yazmak "قبل 2 يومين" gibi bozuk bir ifade üretirdi)
        // `few` / `many` / `other` ise değişken sayı içindir; orada yer
        // tutucunun düşmesi sayının EKRANDAN KAYBOLMASI demektir.
        const FIXED_COUNT = ['zero', 'one', 'two'];
        const cat = (k.match(/_(zero|one|two|few|many|other)$/) || [])[1];
        if (FIXED_COUNT.indexOf(cat) !== -1) continue;
        const b = pluralBase(k);
        if (b) for (const s of slots(tables[BASE][b + '_other']))
          if (!slots(t[k]).has(s)) slotBad.push(k + ' ({' + s + '} eksik)');
        continue;
      }
      const a = slots(tables[BASE][k]), b = slots(t[k]);
      for (const s of a) if (!b.has(s)) slotBad.push(k + ' ({' + s + '} eksik)');
    }

    const line = code.padEnd(8) +
      String(missing.length).padStart(3) + ' eksik  ' +
      String(extra.length).padStart(3) + ' fazla  ' +
      String(slotBad.length).padStart(3) + ' yer-tutucu';
    console.log('   ' + line);

    if (missing.length) { anyMissing = true; console.log('      eksik: ' + missing.slice(0, 8).join(', ') + (missing.length > 8 ? ' …' : '')); }
    if (extra.length)   { anyMissing = true; console.log('      fazla: ' + extra.slice(0, 8).join(', ') + (extra.length > 8 ? ' …' : '')); }
    if (slotBad.length) { anyMissing = true; console.log('      yer tutucu: ' + slotBad.slice(0, 5).join(', ')); }
  }
  check('yüklenen diller arasında eksik/fazla anahtar yok', !anyMissing);

  // Marka adları ÇEVRİLMEMELİ.
  let brandBad = '';
  for (const code of present) {
    const t = tables[code] || {};
    for (const k of Object.keys(t)) {
      if (typeof t[k] !== 'string') continue;
      if (/slyswipe/i.test(t[k]) && !/SlySwipe/.test(t[k])) brandBad = code + '/' + k + ': ' + t[k];
    }
  }
  check('SlySwipe markası hiçbir dilde bozulmamış', !brandBad, brandBad);

  // Fiyat ASLA metinde olmamalı — mağazadan geliyor.
  let priceBad = '';
  for (const code of present) {
    const t = tables[code] || {};
    for (const k of Object.keys(t)) {
      if (typeof t[k] !== 'string') continue;
      if (/[₺$€£¥]\s?\d|\d+[.,]\d{2}\s?(TL|USD|EUR)/.test(t[k])) priceBad = code + '/' + k + ': ' + t[k];
    }
  }
  check('hiçbir çeviride sabit fiyat yok', !priceBad, priceBad);
}

// ═════════ 3. KAYIT NOKTALARI ═════════
if (!only || only === '--all') {
  console.log('\n3. KAYIT NOKTALARI');
  const declared = I18n.SUPPORTED.map(s => s.code).sort();

  // locales_config.xml — eksik kalan dil uygulamada çalışır ama Android
  // sistem dil ekranında HİÇ görünmez. Sessiz bir eksik, bu yüzden test.
  const xml = readSrc('android/app/src/main/res/xml/locales_config.xml');
  const inXml = (xml.match(/android:name="([^"]+)"/g) || [])
    .map(m => m.replace(/.*"([^"]+)".*/, '$1')).sort();
  check('locales_config.xml, SUPPORTED ile birebir aynı',
        JSON.stringify(inXml) === JSON.stringify(declared),
        'xml: ' + inXml.join(',') + '\n      kod: ' + declared.join(','));

  // sw.js: yalnızca en precache edilmeli (diğerleri her sürüm bump'ında
  // yeniden inerdi — ikonlar/Jigsaw için belgelenmiş tuzak).
  const sw = readSrc('sw.js');
  const shell = (sw.match(/const SHELL_ASSETS = \[([\s\S]*?)\]/) || ['', ''])[1];
  check('sw.js kabuk listesinde core/i18n.js var', /core\/i18n\.js/.test(shell));
  check('sw.js kabuk listesinde locales/en.js var', /locales\/en\.js/.test(shell));
  const otherPrecached = (shell.match(/locales\/(\w[\w-]*)\.js/g) || [])
    .filter(m => !/en\.js/.test(m));
  check('en DIŞINDA hiçbir dil precache edilmemiş', otherPrecached.length === 0,
        otherPrecached.join(', '));

  // build-www: locales klasörü APK'ya girmeli.
  check("build-www.js SHIP listesinde 'locales' var",
        /'locales'/.test(readSrc('tools/build-www.js')));

  // index.html yükleme zinciri: i18n games.js'ten ÖNCE.
  const html = readSrc('index.html');
  const iI18n = html.indexOf("loadScript('core/i18n.js'");
  const iGames = html.indexOf("loadScript('games/games.js'");
  check('index.html zincirinde i18n.js, games.js\'ten önce',
        iI18n > 0 && iGames > 0 && iI18n < iGames);
  // YÜKLEME SIRASI: words.js, I18n.boot()'tan ÖNCE olmak ZORUNDA.
  // Bu doğrulama cihazda bulunan bir hatadan doğdu: sıra tersken
  // loadWords() `WordPools` tanımsız diye sessizce dönüyor ve AÇILIŞ
  // DİLİNİN havuzu hiç yüklenmiyordu — Kelime Avı "?" ızgarası olarak
  // açılıyordu. Hiçbir otomatik test görmemişti, çünkü hepsi dili
  // AÇIKÇA değiştirip havuzu dolaylı yoldan yüklüyordu.
  {
    // YORUMLAR AYIKLANIYOR. İlk sürüm bunu yapmıyordu ve KENDİ
    // açıklama yorumumdaki "I18n.boot()" metnini çağrı sanıp, düzeltme
    // yerindeyken bile düştü. Bu deponun üçüncü kez kaydettiği tuzak;
    // `[^\n]*` kullanılıyor çünkü depo CRLF ve JS'te `.` `\r`'yi eşlemez.
    const html = readSrc('index.html')
      .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const iw = html.indexOf("loadScript('games/words.js'");
    const ib = html.indexOf('I18n.boot(');
    check('index.html: words.js, I18n.boot() ÇAĞRISINDAN önce yükleniyor',
          iw !== -1 && ib !== -1 && iw < ib,
          'words.js@' + iw + ' boot@' + ib + ' — ters sıra açılış dilinin havuzunu düşürür');
  }
  check('index.html I18n.boot() çağırıyor', /I18n\.boot\(/.test(html));

  // dom-sandbox yükleme sırası gerçek uygulamayı yansıtmalı.
  const ds = readSrc('tools/dom-sandbox.js');
  check('dom-sandbox LOAD_ORDER i18n içeriyor', /core\/i18n\.js/.test(ds));
}

// ═════════ 4. KALAN SABİT METİN ═════════
// Migrasyonun ölçüsü. Yorumlar ayıklanıyor; yalnızca Türkçe'ye özgü
// harf taşıyan dize literalleri sayılıyor (kaba ama tutarlı bir ölçü —
// asıl işi eşiğin YÜKSELMEMESİ yapıyor).
if (!only || only === '--scan' || only === '--all') {
  console.log('\n4. KALAN SABİT METİN (migrasyon ölçer)');

  function stripComments(src) {
    let out = '', i = 0, mode = 'code';
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (mode === 'code') {
        if (c === '/' && d === '/') { mode = 'line'; i += 2; continue; }
        if (c === '/' && d === '*') { mode = 'block'; i += 2; continue; }
        if (c === "'" || c === '"' || c === '`') { mode = c; out += c; i++; continue; }
        out += c; i++; continue;
      }
      if (mode === 'line')  { if (c === '\n') { mode = 'code'; out += c; } i++; continue; }
      if (mode === 'block') { if (c === '*' && d === '/') { mode = 'code'; i += 2; } else { if (c === '\n') out += c; i++; } continue; }
      if (c === '\\') { out += c + (d || ''); i += 2; continue; }
      out += c;
      if (c === mode) mode = 'code';
      i++;
    }
    return out;
  }

  // TÜRKÇE METİN SEZGİSİ — İKİ AYAKLI, ve ikincisi ÖLÇÜLMÜŞ BİR AÇIKTAN
  // doğdu. İlk sürüm yalnızca Türkçe'ye özgü harfleri (çğıöşü…) arıyordu
  // ve bu, düz ASCII ile yazılmış Türkçe'yi TAMAMEN görmüyordu:
  // "Kapat ✕", "Plus aktif — iyi oyunlar!", "Elmas Kazan!" hiç sayılmadı,
  // yani ölçer "7 kaldı" derken gerçek sayı daha yüksekti. Bir migrasyon
  // ölçerin en kötü hatası, işi olduğundan bitmiş göstermektir.
  //
  // İkinci ayak: Türkçe UI sözcük listesi. Kapsamlı bir dil tespiti değil
  // — bu deponun arayüz kelime dağarcığı. Yeni bir metin bu listedeki
  // hiçbir kelimeyi içermiyorsa kaçabilir; o yüzden liste, yeni sabit
  // metin fark edildikçe büyütülür.
  const TRCHAR = /[çğıöşüÇĞİÖŞÜ]/;
  // Liste bilinçli olarak UZUN ve AYIRT EDİCİ kelimelerden. İlk sürüm
  // 'var', 'en', 'ay', 'bir', 'plan' gibi kısa kelimeleri de içeriyordu
  // ve ÖLÇÜLDÜ: `var(--ph-accent)` CSS'i "var" diye, `plus_plan_failed`
  // anahtar adı "plan" diye işaretlendi. Kısa kelime = yanlış pozitif.
  const TRWORD = new RegExp('(^|[^a-zA-ZçğıöşüÇĞİÖŞÜ])(' + [
    'kapat', 'devam', 'skor', 'puan', 'elmas', 'kazan', 'kazandin', 'kazanildi',
    'oyun', 'oyunlar', 'seviye', 'reklam', 'bekle', 'tamam', 'hayir', 'ipucu',
    'hamle', 'basla', 'bitti', 'aktif', 'oyuncu', 'odul', 'gorev', 'rozet',
    'profil', 'ayar', 'ayarlar', 'tema', 'yardim', 'paylas', 'puanla', 'satin',
    'alma', 'yukle', 'iptal', 'vazgec', 'sonra', 'tekrar', 'dene', 'simdi',
    'kalan', 'dolu', 'seri', 'gunluk', 'haftalik', 'aylik', 'yillik', 'ucretsiz',
    'kilitli', 'yakinda', 'basari', 'basarim', 'magaza', 'paket', 'uyelik',
    'tamamlandi', 'baslat', 'sifirla', 'karistir', 'birlestir', 'yerlestir',
    'bakiye', 'bakiyen', 'tasarruf', 'yukleniyor', 'bulunamadi', 'topladin',
    // 'favori' CİHAZDA bulundu: Keşfet kartındaki kalp etiketi sabit
    // Türkçeydi ve diyakritiği olmadığı için tarayıcı görmüyordu. Bu,
    // aynı kör noktanın ÜÇÜNCÜ kez ısırması — liste, yeni sabit metin
    // fark edildikçe büyütülmeli.
    'favori', 'favoriler', 'sevilen', 'begen',
  ].join('|') + ')([^a-zA-ZçğıöşüÇĞİÖŞÜ]|$)', 'i');
  // CSS değeri / seçici / anahtar adı gibi görünenler metin DEĞİL.
  //
  // `i` BAYRAĞI YOK, ve bu ölçülmüş bir hatanın düzeltmesi: bayrakla
  // birlikte `^[a-z][a-z0-9_]*$` alternatifi "Seri", "Seviye", "Kapat"
  // gibi TEK KELİMELİK arayüz metinlerini de yutuyordu — yani ölçer
  // sustuğu için bu metinler iki tur boyunca görünmedi. Küçük harf
  // tanımlayıcıyı (`plus_plan_failed`) elemek isteniyorsa desen de
  // küçük harfe duyarlı kalmalı.
  const CODEISH = /var\(--|^[.#[]|^[a-z][a-z0-9_]*$|^-{0,2}[a-z-]+:\s|^(rgba?|hsla?|linear-gradient|calc|translate)\(/;
  // NOT: CODEISH artık burada DEĞİL, çağıran tarafta HAM dizeye
  // uygulanıyor (bkz. aşağıdaki yorum). Burada kalsaydı kırpılmış
  // metni eleyip aynı hatayı sürdürürdü.
  const looksTurkish = (s) => TRCHAR.test(s) || TRWORD.test(s);

  // ÇEVİRİ DIŞI — her biri GEREKÇELİ. Bu liste bir kaçış kapısı değil:
  // buraya bir şey eklemek, "bu metin kullanıcıya HİÇ gösterilmiyor"
  // iddiasında bulunmaktır. Gösteriliyorsa yeri locales/'tir.
  const NOT_UI = new Set([
    // console.warn / console.error — geliştirici günlüğü, ekrana çıkmaz.
    '[GameEvents] açık tur yokken game_ended:',
    '[GameEvents] dinleyici hatası',
    '[Billing] fiyatlar alınamadı:',
    '[i18n] yeniden çizim hatası',
    // LEADERBOARD'daki sahte oyuncu TAKMA ADLARI. Liderlik tablosunun
    // akıbeti belirsiz (bkz. CLAUDE.md: renderLeaderboard'ın çağıranı yok)
    // ve takma ad zaten çevrilmez — gerçek bir tabloda da çevrilmezdi.
    'OyunKralı', 'Yıldız', 'Şimşek',
    // Türk alfabesi sabiti: Kelime Avı'nın dolgu harf havuzu, METİN DEĞİL.
    // Locale başına alfabe Faz 8'in konusu (bkz. words-tr.js).
    'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',
  ]);

  // ŞABLON LİTERALLERİ AYRI ELE ALINIYOR ve bunun sebebi ölçülmüş bir
  // yanlış pozitif: oyunlar CSS'lerini `injectStyle(id, \`…\`)` ile
  // gömüyor, o backtick bloklarının İÇİNDE de Türkçe /* */ yorumları var.
  // Şablonun tamamı bir dize olduğu için tırnak taraması o yorumlardaki
  // "dikkat çek" gibi parçaları sabit metin sanıyordu.
  // Doğru ayrım: şablonun içinde tırnaklı metin CSS'tir, KULLANICI METNİ
  // ise >buraya< yazılır. O yüzden şablon içinde yalnızca >metin< aranıyor.
  // `${…}` İÇİ KODDUR, şablon metni değil — ve bu bir düzeltme. İlk
  // sürüm backtick'ler arasındaki HER ŞEYİ şablon sayıyordu, oysa
  // interpolasyonun içinde gerçek JS (ve gerçek sabit metin) yaşıyor:
  //     `<span>${n >= total ? 'Tüm rozetleri topladın.' : '…'}</span>`
  // Bu iki Türkçe cümle tırnak taramasına hiç ulaşmıyordu, çünkü tırnak
  // taraması yalnızca `code` üzerinde çalışıyor. Şimdi interpolasyon
  // içeriği `code`'a yönlendiriliyor; şablonun düz metin kısmı `tpl`de
  // kalıyor ve orada hâlâ yalnızca >görünen metin< aranıyor.
  function splitTemplates(src) {
    let code = '', tpl = '', i = 0, depth = 0, interp = 0;
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (depth === 0 && c === '`') { depth = 1; i++; continue; }
      if (depth === 1 && interp === 0 && c === '`') { depth = 0; i++; continue; }
      if (depth === 1 && interp === 0 && c === '$' && d === '{') { interp = 1; code += ' '; i += 2; continue; }
      if (depth === 1 && interp > 0) {
        if (c === '{') interp++;
        else if (c === '}') { interp--; if (interp === 0) { code += ' '; i++; continue; } }
        code += c; i++; continue;
      }
      if (depth === 1 && c === '\\') { tpl += '  '; i += 2; continue; }
      (depth ? (tpl += c) : (code += c));
      i++;
    }
    return { code, tpl };
  }

  // ── index.html AYRI TARANIR ───────────────────────────────────────
  // JS taraması burada yanlış cevap verir, çünkü HTML'de bir Türkçe
  // metin İKİ ayrı şey olabilir:
  //   <span data-i18n="tab_badges">Rozetler</span>   ← YEDEK, borç değil
  //   <h3>Koleksiyonlar</h3>                          ← BORÇ
  // `data-i18n` taşıyan bir düğümün içeriğini I18n.applyDom() açılışta
  // üzerine yazıyor; oradaki Türkçe yalnızca "JS çalışmazsa ne görünsün"
  // sorusunun cevabı. İkisini ayırmayan bir sayaç ya sürekli yanlış
  // alarm verir ya da bütçesi hiç sıfırlanamaz.
  function scanHtml(src) {
    const out = new Set();
    const temiz = src
      .replace(/<!--[\s\S]*?-->/g, ' ')          // HTML yorumları
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');
    // Açılış etiketi + hemen ardından gelen metin.
    const re = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>([^<]+)</g;
    let m;
    while ((m = re.exec(temiz))) {
      const attrs = m[2] || '';
      const metin = m[3].replace(/\s+/g, ' ').trim();
      if (metin.length < 2 || !looksTurkish(metin)) continue;
      if (/\bdata-i18n(-html)?\s*=/.test(attrs)) continue;   // yedek metin
      if (NOT_UI.has(metin)) continue;
      out.add(metin);
    }
    // Kullanıcıya görünen ÖZNİTELİKLER de metindir (title/aria-label/…).
    // `data-i18n-attr` taşıyan etiket bunları da çalışma anında yazıyor.
    const reAttr = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    while ((m = reAttr.exec(temiz))) {
      const attrs = m[2] || '';
      if (/\bdata-i18n-attr\s*=/.test(attrs)) continue;
      const re2 = /\b(title|aria-label|placeholder|alt)\s*=\s*"([^"]+)"/g;
      let a;
      while ((a = re2.exec(attrs))) {
        const v = a[2].trim();
        if (v.length >= 2 && looksTurkish(v) && !NOT_UI.has(v)) out.add(v);
      }
    }
    return out;
  }

  let overBudget = false;
  for (const rel of Object.keys(BUDGET)) {
    if (rel.endsWith('.html')) {
      const found = scanHtml(readSrc(rel));
      const n = found.size, cap = BUDGET[rel];
      if (n > cap) { overBudget = true; failures++; }
      console.log('   ' + rel.padEnd(18) + String(n).padStart(3) + ' / ' +
                  String(cap).padStart(3) + (n > cap ? '  ✗ BÜTÇE AŞILDI' : ''));
      if (argv.includes('--list') && n) {
        [...found].forEach(s => console.log('        ' + JSON.stringify(s)));
      }
      continue;
    }
    const { code, tpl } = splitTemplates(stripComments(readSrc(rel)));
    const found = new Set();
    // EN AZ 1 KARAKTER, 2 değil — ve bu, taramanın tamamını bozan bir
    // hatanın düzeltmesi. Alt sınır 2 iken tek karakterlik dizeler
    // (`'⏳'`, `'✕'` gibi emoji argümanlar) hiç eşleşmiyordu; regex o
    // noktada geri izleyip AÇILIŞ tırnağını atlıyor ve bundan sonraki
    // bütün tırnaklar YANLIŞ EŞLEŞİYORDU. Ölçülen sonuç:
    // `setBtn(contAd, '⏳', 'Reklam yükleniyor…', false)` satırında tarayıcı
    // `', '` aralığını dize sandı ve "Reklam yükleniyor…" hiç görünmedi —
    // üstelik kayma dosyanın geri kalanına da yayıldığı için tek bir emoji
    // argümanı, kendisinden sonraki her metni gizliyordu.
    // Uzunluk elemesi artık eşleşmeden SONRA yapılıyor.
    const re = /'([^'\\\n]{1,120})'|"([^"\\\n]{1,120})"/g;
    let m;
    while ((m = re.exec(code))) {
      const ham = (m[1] !== undefined ? m[1] : m[2]);
      const s = ham.trim();
      // CODEISH testi HAM dizeye yapılıyor, kırpılmışa değil. Ölçülen
      // hata: `value: n + ' aktif'` içindeki `' aktif'` kırpılınca
      // "aktif" oluyor ve `^[a-z][a-z0-9_]*$` deseni onu bir tanımlayıcı
      // sanıp eliyordu. Baştaki boşluk tam olarak "bu bir kod adı değil,
      // bir metin parçası" demek — tanımlayıcıların boşluğu olmaz.
      // (Arapça ekran görüntüsünde "aktif 3" diye göründü ve öyle
      // yakalandı; tarayıcı sessizdi.)
      if (s.length < 2 || CODEISH.test(ham) || !looksTurkish(s)) continue;
      // Bu da HAM dizeye bakıyor, CODEISH ile aynı gerekçeyle. Eskiden
      // kırpılmışa bakıyordu ve CODEISH düzeltilirken gözden kaçtı:
      // iki ayrı süzgeç aynı işi yapınca birini düzeltmek yetmiyor.
      // `' aktif'` tam olarak buradan sızıyordu — CODEISH'i geçiyor,
      // sonra bu satır "hepsi küçük harf, demek ki css sınıfı" deyip
      // eliyordu.
      if (/^[a-zçğıöşü-]+$/.test(ham)) continue;       // css sınıfı / anahtar
      if (/[{};]|:\s*[\w-]+\s*;/.test(s)) continue;    // css bloğu
      if (NOT_UI.has(s)) continue;
      found.add(s);
    }
    // Şablonlarda yalnızca görünen metin: >…<
    //
    // SATIR SONU ARTIK YASAK DEĞİL — ve bu, ölçülmüş bir kör noktanın
    // düzeltmesi. Desen `[^<>{}\n]` idi, yani metin `>` ile `<` arasında
    // TEK SATIRDA durmak zorundaydı. Oysa biçimlendirilmiş HTML'de
    // normal olan şudur:
    //     <div …>
    //       Keşfet'e git ve ❤️ ile favorile →
    //     </div>
    // Bu cümle Arapça ekran görüntüsünde Türkçe olarak göründü; tarayıcı
    // hiç görmemişti. Artık satır sonuna izin var, ama yakalanan metin
    // kırpılıp tek satıra indirgeniyor (rapor okunur kalsın diye).
    const reTpl = />([^<>{}]{2,200})</g;
    while ((m = reTpl.exec(tpl))) {
      const s = m[1].replace(/\s+/g, ' ').trim();
      if (!s || s.length < 2 || !looksTurkish(s)) continue;
      if (/[{};]/.test(s)) continue;
      if (NOT_UI.has(s)) continue;
      found.add(s);
    }
    const n = found.size;
    const cap = BUDGET[rel];
    const flag = n > cap ? '  ✗ BÜTÇE AŞILDI' : '';
    if (n > cap) { overBudget = true; failures++; }
    console.log('   ' + rel.padEnd(18) + String(n).padStart(3) + ' / ' + String(cap).padStart(3) + flag);
    if (argv.includes('--list') && n) {
      [...found].forEach(s => console.log('        ' + JSON.stringify(s)));
    }
  }
  check('kalan sabit metin bütçeleri aşılmadı', !overBudget,
        'BUDGET düşürülebilir, YÜKSELTİLMEZ — yükseltmek migrasyonun geri gitmesi demek');

  // ── `t` GÖLGELEME DENETİMİ ────────────────────────────────────────
  // GERÇEK BİR HATADAN DOĞDU (2026-08-15). `Badges.shopLabel()` içinde
  //     const n = this.count(), t = this.total();
  // vardı; oraya bir `t('badges_all_earned')` çağrısı eklenince satır
  // "t is not a function" ile PATLADI — çeviri fonksiyonu yerel değişken
  // tarafından gölgelenmişti. Aynısı ThemeSystem.apply()'da da vardı.
  //
  // Bu sınıfın tehlikesi sessiz olması değil, GEÇ olması: sözdizimi
  // geçerli, dosya yükleniyor, hata ancak o kod yolu çalışınca çıkıyor —
  // yani mağaza satırı çizilene ya da tema uygulanana kadar. i18n'den
  // sonra `t` AYRILMIŞ BİR AD; tek harflik yerel değişken olarak
  // kullanılamaz.
  //
  // YALNIZCA `const/let/var t =` aranıyor — ok fonksiyonu parametresi
  // (`tubes.filter(t => …)`) BİLEREK dışarıda. O yalnızca kendi
  // gövdesini gölgeler ve bu depoda hepsi tek satırlık; onları da
  // saymak ilk denemede gerçek bir yanlış pozitif üretti
  // (games.js'te `filter(t => …)` satırının HEMEN ALTINDAKİ güvenli
  // `t('watersort_over_title')` çağrısı suçlanmıştı).
  // `const t =` KADAR `const n = …, t = …` de yakalanmalı. İlk sürüm
  // yalnızca birincisini arıyordu ve ÖLÇÜLDÜ: gerçek hatayı (Badges
  // .shopLabel'daki `const n = this.count(), t = this.total()`) geri
  // koyunca denetim yine "geçti" dedi. Bir koruyucuya, önce düşürdüğünü
  // görmeden güvenilmez.
  const declRe = /\b(?:const|let|var)\s+(?:[\w$]+\s*=[^;]*,\s*)*t\s*=/;
  const callRe = /(^|[^\w.$])t\s*\(\s*['"][a-z][a-z0-9_]*['"]/;
  const shadowBad = [];
  for (const rel of ['core/app.js', 'core/daily.js', 'reels/reels.js', 'games/games.js']) {
    const lines = stripComments(readSrc(rel)).split('\n');
    // Kapsam sonunu ucuz kestir: bildirimin girintisinden daha sığ bir
    // `}` görülene kadar aynı blok sayılıyor.
    for (let i = 0; i < lines.length; i++) {
      if (!declRe.test(lines[i])) continue;
      const indent = lines[i].match(/^\s*/)[0].length;
      for (let j = i + 1; j < lines.length; j++) {
        const cur = lines[j];
        if (/^\s*\}/.test(cur) && cur.match(/^\s*/)[0].length < indent) break;
        if (callRe.test(cur)) { shadowBad.push(rel + ':' + (j + 1) + '  ' + cur.trim().slice(0, 62)); break; }
      }
    }
  }
  check('hiçbir t() çağrısı yerel bir `t` tarafından gölgelenmiyor', !shadowBad.length,
        shadowBad.join('\n      '));

  // ── ARTIK (ÖKSÜZ) ANAHTAR DENETİMİ ────────────────────────────────
  // Kaynakta hiç ADI GEÇMEYEN bir `en` anahtarı ölü ağırlıktır: her yeni
  // dil onu bir kez daha çevirmek zorunda kalır ve hiçbir yerde
  // görünmediği için yanlış çevrildiğinde de kimse fark etmez.
  // Faz 5'e girerken üç tane vardı (`purchase_restored`,
  // `purchase_nothing_to_restore`, `nav_back_again`) — hepsi kullanılan
  // bir anahtarın birebir kopyasıydı; 13 dile çoğaltılmadan silindiler.
  //
  // DİNAMİK KURULAN ANAHTARLAR muaf: bazı yerlerde ad çalışma zamanında
  // birleşiyor (`t('game_name_' + id)`, `t('difficulty_' + k)`), yani
  // tam ad kaynakta hiç geçmez. Önek listesi bu yüzden var — bir öneki
  // buraya eklemek "bu aile dinamik çağrılıyor" demektir.
  const DYNAMIC_PREFIXES = ['game_name_', 'game_desc_', 'game_tag_', 'difficulty_',
                            'day_', 'badge_', 'quest_', 'weekly_', 'block_praise_',
                            'streak_milestone_', 'theme_', 'flappy_over_msg',
                            // help_* bölümleri HELP_SECTIONS dizisinden
                            // t(s.k + '_title') ile kuruluyor, yani tam ad
                            // kaynakta hiç geçmiyor.
                            'help_',
                            'badges_earned_days_ago'];
  const allSrc = ['core/app.js', 'core/daily.js', 'core/ui-kit.js', 'games/games.js',
                  'reels/reels.js', 'index.html'].map(readSrc).join('\n');
  const orphans = Object.keys(tables[BASE]).filter(k =>
    !DYNAMIC_PREFIXES.some(p => k.startsWith(p)) && allSrc.indexOf(k) < 0);
  check('kanonik sette artık (kullanılmayan) anahtar yok', !orphans.length,
        orphans.join(', '));
  if (!argv.includes('--list')) console.log('   (tam liste için: --scan --list)');
}

console.log('\n' + (failures ? failures + ' DOĞRULAMA DÜŞTÜ' : 'TÜM TESTLER GEÇTİ'));
process.exit(failures ? 1 : 0);

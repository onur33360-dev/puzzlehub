// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Yerelleştirme çalışma zamanı (i18n)
// ═══════════════════════════════════════════════════════════════════════
//
// NEDEN ELDE YAZILDI: projede bundler yok (§1), dolayısıyla hazır bir i18n
// kütüphanesi `import` edilemez; ayrıca §6 sıfır-bağımlılık kuralı runtime
// kod için geçerli. Bu dosya o boşluğu dolduran ~10 KB'lık tek modül.
//
// VERİ NEDEN .js, JSON DEĞİL: `words-tr.js` zaten bu deseni kullanıyor.
// JSON seçmek `fetch()` demekti ve orada iki farklı dünya var — web'de
// origin, APK'da Capacitor'ın kendi şeması. Bir <script> etiketi ikisinde
// de aynı şekilde çalışır ve service worker'ın mevcut kuralları onu zaten
// tanıyor. Yerel dosyalar kendilerini `I18n.register()` ile kaydeder, yani
// yükleme sırası önemsizdir (bu dosya hariç — o ilk olmalı).
//
// EKSİK ANAHTAR ASLA ÇÖKMEZ: zincir "istenen dil → İngilizce → anahtarın
// kendisi". En kötü durumda ekranda ham bir anahtar görünür; boş bir ekran
// ya da bir TypeError asla görünmez.
'use strict';

window.I18n = (function () {

  // ── Desteklenen diller ──────────────────────────────────────────────
  // `native` KENDİ DİLİNDEKİ ad — seçicide böyle gösterilir. Bir kullanıcı
  // uygulamayı anlamadığı bir dilde açtığında listede arayacağı şey
  // "Almanca" değil "Deutsch"tur; kendi dilini yalnızca kendi yazımıyla
  // tanır. Bu yüzden bu adlar ÇEVRİLMEZ, her locale'de aynıdır.
  const SUPPORTED = [
    { code: 'tr',      native: 'Türkçe' },
    { code: 'en',      native: 'English' },
    { code: 'es',      native: 'Español' },
    { code: 'pt-BR',   native: 'Português (Brasil)' },
    { code: 'de',      native: 'Deutsch' },
    { code: 'fr',      native: 'Français' },
    { code: 'it',      native: 'Italiano' },
    { code: 'ru',      native: 'Русский' },
    { code: 'ar',      native: 'العربية' },
    { code: 'ja',      native: '日本語' },
    { code: 'ko',      native: '한국어' },
    { code: 'zh-Hans', native: '简体中文' },
    { code: 'id',      native: 'Bahasa Indonesia' },
    { code: 'hi',      native: 'हिन्दी' },
    { code: 'pl',      native: 'Polski' },
  ];

  const CODES = SUPPORTED.map(s => s.code);
  const BASE = 'en';                    // kanonik yedek — asla değişmez

  // Sağdan sola yazılan diller. Bugün yalnızca Arapça; liste olarak
  // tutuluyor çünkü İbranice/Farsça eklenirse tek satır değişir.
  const RTL = ['ar'];

  // ── Etiket eşlemesi ─────────────────────────────────────────────────
  // Cihazın verdiği BCP-47 etiketi desteklenen listeyle birebir tutmayabilir.
  // Buradaki eşlemeler KAYIP DEĞİL, KAZANÇ: 'pt-PT' → 'pt-BR' aynı dilin
  // başka bir yazımı, İngilizce'ye düşürmek belirgin biçimde daha kötü olurdu.
  //
  // 'in' bir yazım hatası DEĞİL: Java, Endonezce'yi tarihsel olarak 'in'
  // kodlar ve bu bazı Android WebView'larında navigator.language'e sızar.
  // Ucuz sigorta.
  //
  // 'zh-TW'/'zh-HK' (Geleneksel Çince) BİLEREK eşlenmedi. Basitleştirilmiş
  // metin Geleneksel okuyucuya yanlış görünür; şartnamenin kuralı
  // "desteklenmeyen dil → İngilizce" ve burada ona uyuyoruz.
  const ALIASES = {
    'in': 'id',
    'pt': 'pt-BR', 'pt-pt': 'pt-BR',
    'zh': 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-sg': 'zh-Hans', 'zh-hans': 'zh-Hans',
  };

  const STORE_KEY = 'ph_lang';
  const PATH = 'locales/';

  // Yüklenmiş tablolar: { en: {...}, de: {...} }
  const tables = {};
  let active = BASE;
  let listeners = [];
  const warned = {};                    // aynı eksik anahtarı bir kez uyar

  // ── Etiket çözümleme ────────────────────────────────────────────────
  /** 'de-DE' → 'de'  ·  'pt-br' → 'pt-BR'  ·  'fi' → null */
  // Geleneksel Çince yazımları. ÖNCE bakılıyor, çünkü aksi hâlde
  // 'zh-TW' → dil kısmı 'zh' → ALIASES['zh'] → 'zh-Hans' zincirine
  // düşüyor ve Geleneksel okuyucuya Basitleştirilmiş metin gösteriliyordu.
  // Ölçülmüş bir hataydı; tools/i18n-test.js bu vakayı sabitliyor.
  const HANT = /^zh-(hant|tw|hk|mo)\b/;

  function resolve(tag) {
    if (!tag) return null;
    const raw = String(tag).replace(/_/g, '-');
    const low = raw.toLowerCase();

    if (HANT.test(low)) return null;   // desteklenmiyor → çağıran taraf en'e düşer
    if (ALIASES[low]) return ALIASES[low];

    // Birebir (büyük/küçük harf duyarsız): 'pt-br' → 'pt-BR'
    for (let i = 0; i < CODES.length; i++) {
      if (CODES[i].toLowerCase() === low) return CODES[i];
    }
    // Dil + yazı: 'zh-Hans-CN' → 'zh-Hans'
    const parts = low.split('-');
    if (parts.length >= 2) {
      const twoAlias = ALIASES[parts[0] + '-' + parts[1]];
      if (twoAlias) return twoAlias;
      for (let i = 0; i < CODES.length; i++) {
        if (CODES[i].toLowerCase() === parts[0] + '-' + parts[1]) return CODES[i];
      }
    }
    // Yalnızca dil: 'de-AT' → 'de'
    if (ALIASES[parts[0]]) return ALIASES[parts[0]];
    for (let i = 0; i < CODES.length; i++) {
      if (CODES[i].toLowerCase() === parts[0]) return CODES[i];
    }
    return null;
  }

  /**
   * Cihazın tercih listesinden desteklenen İLK dili seç.
   * `navigator.languages` bir SIRALAMA — kullanıcı "Almanca, sonra
   * İngilizce" dediyse Almanca'yı seçmeliyiz. Yalnızca [0]'a bakmak,
   * ikinci tercihi desteklediğimiz halde İngilizce'ye düşmek demekti.
   */
  function systemLocale() {
    const list = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || navigator.userLanguage];
    for (let i = 0; i < list.length; i++) {
      const hit = resolve(list[i]);
      if (hit) return hit;
    }
    return BASE;                        // desteklenmeyen sistem dili → İngilizce
  }

  // ── Kalıcılık ───────────────────────────────────────────────────────
  // MODE saklanıyor, düz bir locale değil. "Sistem Varsayılanı" seçiliyken
  // o anın dilini yazsaydık, kullanıcı telefonunun dilini değiştirdiğinde
  // uygulama donmuş eski dilde kalırdı — yani "sistem varsayılanı" adını
  // taşıyan bir manuel seçim olurdu.
  function readPref() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { mode: 'system' };
      const o = JSON.parse(raw);
      if (o && o.mode === 'manual' && resolve(o.locale)) {
        return { mode: 'manual', locale: resolve(o.locale) };
      }
      return { mode: 'system' };
    } catch (e) { return { mode: 'system' }; }
  }

  function writePref(pref) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(pref)); } catch (e) {}
  }

  // ── Yükleyici ───────────────────────────────────────────────────────
  // index.html'in loadScript'i burada kullanılamaz: dil çalışma zamanında
  // da değişebiliyor ve o an <head>'deki fonksiyon kapsamı dışındayız.
  // KELİME HAVUZU LOCALE İLE BİRLİKTE GELİR. Kelime Avı'nın içeriği de
  // bu dilin bir parçası; ayrı bir yoldan yüklemek "arayüz Japonca ama
  // tahtada Türkçe kelimeler" gibi bir ara duruma izin verirdi.
  // Başarısızlığı SESSİZ: havuz gelmezse WordPools.forLocale() İngilizce'ye
  // düşüyor ve oyun oynanabilir kalıyor — arayüzü bunun için bekletmeye
  // değmez, o yüzden `done` bu yüklemeyi beklemiyor.
  function loadWords(code) {
    if (typeof WordPools === 'undefined' || WordPools.has(code)) return;
    const w = document.createElement('script');
    w.src = 'games/words/' + code + '.js';
    w.onerror = function () { console.warn('[words] havuz yüklenemedi: ' + code); };
    document.head.appendChild(w);
  }

  function loadLocale(code, done) {
    loadWords(code);
    if (tables[code]) return done(true);
    const s = document.createElement('script');
    s.src = PATH + code + '.js';
    s.onload = function () { done(!!tables[code]); };
    // Yükleme başarısız → sessizce İngilizce'ye düşülür. Kullanıcıya bir
    // ağ hatası göstermek burada yardımcı olmaz; okuyabildiği bir arayüz
    // görmek, okuyamadığı bir hata mesajı görmekten iyidir.
    s.onerror = function () {
      console.warn('[i18n] locale yüklenemedi: ' + code);
      done(false);
    };
    document.head.appendChild(s);
  }

  // ── Sistem dili değişimini yakala ───────────────────────────────────
  // ZORUNLU, çünkü Android 13+ "uygulama başına dil" ayarı bu uygulamada
  // activity'yi YENİDEN YARATMIYOR: AndroidManifest'te configChanges
  // listesinde `locale` var (Capacitor'ın varsayılanı, biz koymadık).
  // Yani kullanıcı sistem ayarlarından SlySwipe'ın dilini değiştirdiğinde
  // süreç ayakta kalır ve okunmuş navigator.language bayatlayabilir.
  //
  // Uygulamaya geri dönüldüğünde yeniden okumak, bunun için bir native
  // köprü yazmaktan hem daha ucuz hem daha az kırılgan. Manuel seçim
  // varsa hiç çalışmaz — orada sistemin bir söz hakkı yok.
  let watching = false;
  function watchSystem() {
    if (watching) return;
    watching = true;
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) api.recheckSystem();
    });
  }

  // ── Yerleştirme (interpolation) ─────────────────────────────────────
  // '{level}' biçimi. Dizge birleştirme YASAK olduğu için var: her dilde
  // kelime sırası farklı ve "Seviye " + n, Japonca'da "レベル7" olamaz.
  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return (params[k] === undefined || params[k] === null) ? m : String(params[k]);
    });
  }

  // ── Arama ───────────────────────────────────────────────────────────
  function lookup(key) {
    const t = tables[active];
    if (t && t[key] !== undefined) return t[key];
    const b = tables[BASE];
    if (b && b[key] !== undefined) {
      if (!warned[key]) { warned[key] = 1; console.warn('[i18n] eksik anahtar (' + active + '): ' + key); }
      return b[key];
    }
    if (!warned[key]) { warned[key] = 1; console.warn('[i18n] TANIMSIZ anahtar: ' + key); }
    return null;
  }

  const api = {
    SUPPORTED: SUPPORTED,
    BASE: BASE,

    get locale() { return active; },
    get dir() { return api.dirFor(active); },
    get isRTL() { return api.dirFor(active) === 'rtl'; },
    /** Bir dilin yazım yönü — o dil YÜKLÜ OLMASA da cevaplanabilir. */
    dirFor(code) { return RTL.indexOf(resolve(code) || code) !== -1 ? 'rtl' : 'ltr'; },
    /** 'system' | 'manual' — dil seçicinin hangi satırı işaretleyeceği. */
    get mode() { return readPref().mode; },

    /** Locale dosyalarının çağırdığı kayıt fonksiyonu. */
    register(code, table) { tables[code] = table; },

    resolve: resolve,
    systemLocale: systemLocale,

    /** Ana çeviri fonksiyonu. */
    t(key, params) {
      const v = lookup(key);
      if (v === null) return key;       // görünür ama zararsız: ham anahtar
      return interpolate(v, params);
    },

    /**
     * Çoğul. Intl.PluralRules dilin GERÇEK kurallarını uygular — Rusça'nın
     * one/few/many'si ve Arapça'nın zero/one/two/few/many/other'ı
     * İngilizce'nin tekil/çoğul ikilisine sığmaz.
     * Anahtar biçimi: `word_count_one`, `word_count_other`, ...
     */
    tp(key, count, params) {
      let cat = 'other';
      try { cat = new Intl.PluralRules(active).select(count); } catch (e) {}
      const p = Object.assign({ n: count, count: count }, params || {});
      let v = lookup(key + '_' + cat);
      if (v === null) v = lookup(key + '_other');
      if (v === null) return key;
      return interpolate(v, p);
    },

    /**
     * Locale'e duyarlı sayı biçimi. Skorlar da buradan geçiyor: ayırıcı
     * (1,000 / 1.000 / 1 000) dile göre değişir ve toLocaleString()'i
     * argümansız çağırmak CİHAZIN dilini kullanır — kullanıcı uygulamayı
     * elle Almanca yaptığında sayı Türkçe biçiminde kalırdı.
     */
    n(value) {
      try { return Number(value).toLocaleString(active); }
      catch (e) { return String(value); }
    },

    /**
     * Locale'e duyarlı büyütme. Türkçe'de JS'in varsayılanı YANLIŞ
     * ('i' → 'I', doğrusu 'İ'); CJK'de ise büyütme diye bir şey yok ve
     * dönüşüm kimliktir. Tek kapı olması, `toUpperCase()`in bir yere
     * sızmasını engelliyor.
     */
    upper(s) {
      try { return String(s).toLocaleUpperCase(active); }
      catch (e) { return String(s).toUpperCase(); }
    },

    /** Dil değişiminde haber verilecek dinleyiciler (ekran yeniden çizimi). */
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },

    /**
     * <html lang> ve <html dir> güncelle, sonra [data-i18n] taşıyan her
     * düğümü yeniden yaz.
     *
     * `lang` KOZMETİK DEĞİL: CSS `text-transform:uppercase` bu özniteliğe
     * bakar. lang="tr" olmadan 'i' harfi 'I' olur, doğrusu 'İ'dir — yani
     * yanlış lang, görünür bir yazım hatası üretir.
     */
    applyDom(root) {
      const scope = root || document;
      if (!root) {
        document.documentElement.setAttribute('lang', active);
        document.documentElement.setAttribute('dir', api.dir);
      }
      const nodes = scope.querySelectorAll('[data-i18n]');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = api.t(key);
      }
      // Satır içi biçimlendirme taşıyan metinler ("Keşfet <em>Akışı</em>").
      // Vurgulanan kelime dile göre DEĞİŞİR — İngilizce'de ikinci, başka
      // bir dilde birinci sözcük olabilir — bu yüzden metni iki ayrı
      // düğüme bölmek yanlış olurdu; işaret çevirinin bir parçası.
      // XSS riski yok: kaynak yalnızca kendi locale dosyalarımız, hiçbir
      // kullanıcı girdisi buradan geçmiyor.
      const htmlNodes = scope.querySelectorAll('[data-i18n-html]');
      for (let i = 0; i < htmlNodes.length; i++) {
        const el = htmlNodes[i];
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = api.t(key);
      }
      // Öznitelik çevirisi: data-i18n-attr="title:tooltip_music"
      const attrNodes = scope.querySelectorAll('[data-i18n-attr]');
      for (let i = 0; i < attrNodes.length; i++) {
        const el = attrNodes[i];
        const spec = el.getAttribute('data-i18n-attr') || '';
        spec.split(',').forEach(function (pair) {
          const bits = pair.split(':');
          if (bits.length === 2) el.setAttribute(bits[0].trim(), api.t(bits[1].trim()));
        });
      }
    },

    /**
     * Dili değiştir. `code === null` → "Sistem Varsayılanı"na dön
     * (manuel geçersiz kılma temizlenir, cihazın dili yeniden okunur).
     * Yeniden başlatma GEREKMİYOR: uygulama zaten imperatif innerHTML
     * yeniden çizimi kullanıyor, bu yüzden dinleyicileri çağırmak yeterli.
     */
    set(code, done) {
      const pref = (code === null || code === undefined)
        ? { mode: 'system' }
        : { mode: 'manual', locale: resolve(code) || BASE };
      writePref(pref);
      const target = pref.mode === 'system' ? systemLocale() : pref.locale;
      if (target === active) { if (done) done(active); return; }

      loadLocale(target, function (ok) {
        // Yüklenemediyse aktif dil DEĞİŞMEZ — yarı çevrilmiş bir arayüz
        // yerine tutarlı olan eskisinde kalmak daha az kötü.
        if (ok) active = target;
        api.applyDom();
        listeners.forEach(function (fn) { try { fn(active); } catch (e) { console.warn('[i18n] dinleyici hatası', e); } });
        if (done) done(active);
      });
    },

    /**
     * Açılış. index.html zincirinin BAŞINDA çağrılır: İngilizce tabanı
     * (garantili yedek) ve gerekiyorsa aktif dili yükler, sonra devam eder.
     * `en` her zaman yüklenir — eksik bir anahtar için yedeğin diskte
     * hazır olması, o an ağ istemek zorunda kalmaktan iyidir.
     */
    boot(done) {
      loadLocale(BASE, function () {
        const pref = readPref();
        const target = pref.mode === 'system' ? systemLocale() : pref.locale;
        watchSystem();
        if (target === BASE) { active = BASE; api.applyDom(); return done && done(active); }
        loadLocale(target, function (ok) {
          active = ok ? target : BASE;
          api.applyDom();
          if (done) done(active);
        });
      });
    },

    /** Sistem dilini yeniden oku (yalnızca "Sistem Varsayılanı" modunda). */
    recheckSystem() {
      if (readPref().mode !== 'system') return;
      const want = systemLocale();
      if (want !== active) api.set(null);
    },
  };

  return api;
})();

// games.js ve reels.js için kısa yol. `econ()` / `gameEvent()` ile AYNI
// desen ve aynı iki gerekçe: (1) modül kapsamında `const T = I18n.t`
// yazmak yükleme sırasına bağımlı olurdu, (2) `tools/*.js` harness'ları
// games.js'i kabuksuz bir vm içinde çalıştırıyor ve orada I18n yok —
// o durumda anahtar geri döner, hiçbir şey patlamaz.
window.t = function (key, params) {
  return (typeof I18n !== 'undefined' && I18n) ? I18n.t(key, params) : key;
};
window.tp = function (key, count, params) {
  return (typeof I18n !== 'undefined' && I18n) ? I18n.tp(key, count, params) : key;
};

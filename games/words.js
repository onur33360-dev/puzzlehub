// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı içerik kayıt defteri + grapheme araçları
// ═══════════════════════════════════════════════════════════════════════
//
// NE YAPAR: her dilin kelime havuzunu, alfabesini ve zorluk kurallarını
// tek bir yerden sunar; ayrıca tahtanın Unicode açısından doğru olmasını
// sağlayan `graphemes()` yardımcısını verir.
//
// ── NEDEN AYRI DOSYA ───────────────────────────────────────────────────
// `words-tr.js` tek dil için yeterliydi ve global bir `WORDS_TR` yayıyordu.
// 15 dil ile birlikte iki şey değişti: havuz artık AKTİF DİLE göre
// seçilmeli, ve seçim oyunun içinde değil burada yapılmalı — yoksa her
// yeni dil `games.js`'te bir `if` daha demek olurdu.
//
// ── GRAPHEME MESELESİ (bu dosyanın asıl varlık sebebi) ────────────────
// Tahtanın kuralı şudur: BİR GÖRSEL HÜCRE = BİR MANTIKSAL GRAPHEME.
// JavaScript'in dizeleri bunu vermez:
//
//   'क्षत्रिय'.length        → 8   (görsel harf sayısı 4)
//   [...'क्षत्रिय'].length   → 8   (code point'ler de yetmiyor)
//   'नमस्ते'[2]              → yarım bir harf; tek başına anlamsız
//   '한'.length              → 1   ama '한'.normalize('NFD').length → 3
//
// Eski üretici `word[i]` ve `word.length` kullanıyordu. Latin ve Kiril'de
// doğru, Devanagari'de YANLIŞ: matra (ि ी ू) ve virama (्) kendi başına
// bir hücreye konamaz. Arapça'da harekeler, Korece'de NFD'ye ayrılmış
// hece blokları aynı sorunu üretir.
//
// Çözüm: kelimeler ÜRETİCİYE GRAPHEME DİZİSİ olarak giriyor. Tahtanın her
// hücresi bir grapheme dizesi tutuyor (çoğu dilde 1 karakter, Hintçe'de
// 1-4). Karşılaştırmalar dizi üzerinden yapılıyor, `[...str].reverse()`
// gibi code-point varsayan hiçbir işlem kalmadı.
'use strict';

(function () {

  // ── graphemes(str) ───────────────────────────────────────────────────
  // Intl.Segmenter DOĞRU cevabı veren tek standart yol ve hedeflenen her
  // ortamda var (Chrome 87+; bu depodaki en eski test cihazı Chrome 138,
  // Node 20 de destekliyor). Yine de bir yedek duruyor: araçlar bunu
  // kabuksuz bir vm'de çalıştırıyor ve orada bir gün eksik olabilir.
  //
  // YEDEK regex NE YAPAR: bir taban karakteri, ardından gelen birleştirici
  // işaretleri (Mn/Mc), virama+ünsüz dizilerini ve ZWJ bağlarını tek
  // parçada tutar. Intl.Segmenter kadar tam değildir — bu yüzden yedek,
  // varsayılan değil.
  const _seg = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  const FALLBACK_RE = /(\P{M}\p{M}*(?:‍\P{M}\p{M}*)*)/gu;

  function graphemes(str) {
    const s = String(str);
    if (!s) return [];
    if (_seg) {
      const out = [];
      for (const g of _seg.segment(s)) out.push(g.segment);
      return out;
    }
    return s.match(FALLBACK_RE) || Array.from(s);
  }

  // ── Kayıt defteri ────────────────────────────────────────────────────
  // Her dil dosyası kendini `WordPools.register(kod, veri)` ile yazıyor,
  // locales/ ile birebir aynı desen. Yükleme sırası önemsiz.
  const pools = {};

  // Havuz verisi ÖN İŞLENİYOR (register anında, çizim anında değil):
  // her kelimenin grapheme dizisi bir kez hesaplanıp saklanıyor. Üretici
  // seviye başına yüzlerce kez `fits()` çağırıyor; orada tekrar tekrar
  // segment etmek ölçülebilir bir maliyet olurdu.
  function prepare(code, data) {
    const alfabe = graphemes(data.alphabet);
    const dolgu = graphemes(data.fillerBag || data.alphabet);
    const kelimeler = [];
    const gorulen = Object.create(null);
    for (const w of data.words) {
      const gs = graphemes(w);
      // Aynı kelime iki kez yazılmışsa sessizce tekilleştir: bir tahtada
      // aynı kelimenin iki çipi çıkması oyuncuya hata gibi görünür.
      if (gorulen[w]) continue;
      gorulen[w] = 1;
      kelimeler.push({ w: w, g: gs, n: gs.length });
    }
    return {
      code: code,
      words: kelimeler,
      alphabet: alfabe,
      fillerBag: dolgu,
      // Büyütme dili: Türkçe'de 'i' → 'İ' olmalı, JS varsayılanı 'I' verir.
      // `null` ise hiç dönüşüm yapılmaz (CJK, Arapça, Devanagari'de büyük
      // harf kavramı yoktur ve zorlamak kelimeyi bozabilir).
      upperLocale: data.upperLocale || null,
      // Zorluk: uzunluk sınırları DİLE GÖRE. Bkz. her havuz dosyasının
      // kendi gerekçesi — Çince'de 2-4 karakter normalken Almanca'da
      // aynı aralık havuzu neredeyse boşaltır.
      len: data.len,
      // Izgara boyu tavanı: CJK hücreleri Latin'den geniş çizilir.
      sizeCap: data.sizeCap || 12,
      note: data.note || '',
    };
  }

  const api = {
    register: function (code, data) { pools[code] = prepare(code, data); },
    has: function (code) { return !!pools[code]; },
    codes: function () { return Object.keys(pools); },

    /**
     * Aktif dilin havuzu. Bulunamazsa İngilizce'ye, o da yoksa yüklü olan
     * ilk havuza düşer — oyun HER ZAMAN oynanabilir kalmalı, ama bu
     * düşüşün sessiz olmaması için uyarı basılıyor.
     */
    forLocale: function (code) {
      const c = code || (typeof I18n !== 'undefined' ? I18n.locale : 'en');
      if (pools[c]) return pools[c];
      if (pools.en) {
        console.warn('[words] havuz yok: ' + c + ' → en');
        return pools.en;
      }
      const ilk = Object.keys(pools)[0];
      return ilk ? pools[ilk] : null;
    },

    graphemes: graphemes,

    /** Havuzun büyütme kuralı — dili yoksa dizeyi olduğu gibi bırakır. */
    upper: function (pool, s) {
      if (!pool || !pool.upperLocale) return String(s);
      try { return String(s).toLocaleUpperCase(pool.upperLocale); }
      catch (e) { return String(s).toUpperCase(); }
    },
  };

  if (typeof window !== 'undefined') window.WordPools = api;
  if (typeof globalThis !== 'undefined') globalThis.WordPools = api;
})();

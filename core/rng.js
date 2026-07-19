// ============================================
// PuzzleHub — Deterministik Rastgelelik (rng.js)
// ============================================
// Math.random() TEKRARLANAMAZ. Bu dosya, aynı tohumun her zaman aynı
// diziyi üretmesini sağlayan küçük bir katman sunar. İki şey için gerekli:
//
//   1. Günlük Meydan Okuma — dünyadaki herkes aynı günde aynı bulmacayı
//      görmeli, hem de sunucu olmadan. Tarihten türetilen tohum bunu
//      istemci tarafında çözer.
//   2. Hata ayıklama ve test — "şu bulmacada bir sorun var" diyebilmek
//      için bulmacayı yeniden üretebilmek gerekir. Tohum, 81 hücrelik bir
//      diziyi tek bir sayıyla ifade eder.
//
// Oyun-bağımsızdır: Sudoku'ya özel hiçbir şey içermez, sonraki oyunlar
// (Nonogram, Kelime, Wordle-tipi) aynı tohum sistemini kullanır.
//
// Neden hazır bir kütüphane değil: bunların hepsi birkaç satır ve
// projenin sıfır-bağımlılık kararı korunuyor (bkz. CLAUDE.md §6).

// ───────── Metin → tohum (xmur3) ─────────
// 'daily-2026-07-19' gibi anlamlı bir etiketi 32-bit tohuma çevirir.
// Bir karakter değişince tohum tamamen değişmeli — ardışık tarihlerin
// birbirine benzeyen bulmacalar üretmemesi buna bağlı.
function phHashSeed(str) {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// ───────── Tohumlu üreteç (mulberry32) ─────────
// [0,1) aralığında sayı döndüren bir fonksiyon üretir. Kriptografik
// DEĞİLDİR ve olması da gerekmiyor — istenen tek şey, iyi dağılmış ve
// tekrarlanabilir olması. 32-bit durum, tek satırlık ilerletme.
function phRng(seed) {
  let a = (seed >>> 0) || 1;          // 0 tohumu dejenere diziye yol açar
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [0, n) aralığında tamsayı.
function phRngInt(rng, n) {
  return Math.floor(rng() * n);
}

// Fisher-Yates — diziyi YERİNDE karıştırır ve aynı diziyi döndürür.
// Kopya üzerinde çalışmak isteyen çağıran taraf [...arr] geçirir.
function phShuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = phRngInt(rng, i + 1);
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ───────── Günlük tohum ─────────
// Aynı takvim gününde her zaman aynı tohum. YEREL tarih kullanılır
// (UTC değil): oyuncunun "bugün"ü kendi saat diliminde başlar; UTC
// kullanılsaydı bazı bölgelerde günlük bulmaca gün ortasında değişirdi.
// scope, aynı gün içinde farklı oyunların FARKLI bulmaca almasını sağlar
// ('sudoku' ve 'nonogram' aynı tarihte aynı tohumu paylaşmamalı).
function phDailySeed(scope, date) {
  const d = date || new Date();
  const key = [
    scope || 'daily',
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return phHashSeed(key);
}

// Tohumsuz çağrılar için rastgele ama KAYDEDİLEBİLİR bir tohum.
// Üretilen her bulmaca tohumunu yanında taşır, böylece bir sorun
// bildirildiğinde bulmaca birebir yeniden üretilebilir.
function phRandomSeed() {
  return (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0) || 1;
}

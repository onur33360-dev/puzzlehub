// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Bahasa Indonesia (id)
// ═══════════════════════════════════════════════════════════════════════
//
// BU DOSYA YALNIZCA VERİDİR. Oyun kodu games.js'te; buraya kelime
// eklemek hiçbir satırın değişmesini gerektirmez.
//
// SEÇİM ÖLÇÜTÜ: günlük, herkesin bildiği somut isimler. Özel isim yok,
// kısaltma yok, çekimli biçim yok, rahatsız edici içerik yok.
//
// ALFABE HAVUZDAN TÜRETİLMİŞTİR, elle yazılmamıştır. Değişmez şudur:
// DOLGU, kelimelerde geçen HER grapheme'i üretebilmeli. Aksi hâlde
// yalnızca kelimelerde bulunan bir harf, "bu hücre kesin bir kelimeye
// ait" ipucunu bedava verirdi. Türetme bunu yapısal olarak garantiler;
// tools/wordsearch-test.js her koşumda ayrıca doğruluyor.
// Korece/Çince/Devanagari'de zaten elle yazmak MÜMKÜN DEĞİL (11.172
// olası Hangul hece bloğu, binlerce Han karakteri, kelimeye göre
// değişen grapheme kümeleri).
//
// UZUNLUK KADEMELERİ dile göre: [3, 6], [3, 7], [4, 8], [4, 9], [4, 10]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('id', {
  upperLocale: 'id',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEGHIJKLMNOPRSTUWY',
  fillerBag: 'ABCDEGHIJKLMNOPRSTUWYABCDEGHIJKLMNOPRSTUWYAEIOUAEIUNRKT',
  words: [
    'AIR', 'API', 'TANAH', 'ANGIN', 'BATU', 'SUNGAI',
    'LAUT', 'HUTAN', 'GUNUNG', 'LEMBAH', 'PULAU', 'GURUN',
    'AWAN', 'BADAI', 'GURUH', 'SALJU', 'MUSIM', 'PAGI',
    'MALAM', 'BAYANG', 'CAHAYA', 'BINTANG', 'BULAN', 'MATAHARI',
    'PLANET', 'LANGIT', 'APEL', 'ROTI', 'KEJU', 'MENTEGA',
    'MADU', 'GULA', 'GARAM', 'LADA', 'KOPI', 'JUS',
    'SUSU', 'SUP', 'JERUK', 'LEMON', 'ANGGUR', 'CERI',
    'PISANG', 'MELON', 'TOMAT', 'BAWANG', 'WORTEL', 'KENTANG',
    'NASI', 'MIE', 'KUE', 'BISKUIT', 'PERMEN', 'KUDA',
    'UNTA', 'HARIMAU', 'SINGA', 'BERUANG', 'SERIGALA', 'RUBAH',
    'KELINCI', 'TIKUS', 'ELANG', 'GAGAK', 'LUMBA', 'PAUS',
    'HIU', 'KURA', 'ULAR', 'KADAL', 'LABA', 'KUPU',
    'RUMAH', 'PINTU', 'JENDELA', 'ATAP', 'TAMAN', 'JEMBATAN',
    'MENARA', 'ISTANA', 'PASAR', 'JALAN', 'MEJA', 'KURSI',
    'CERMIN', 'KARPET', 'TIRAI', 'BANTAL', 'SELIMUT', 'LILIN',
    'LAMPU', 'KERANJANG', 'BOTOL', 'SENDOK', 'PIRING', 'PISAU',
    'JAM', 'KUNCI', 'BUKU', 'KERTAS', 'PENSIL', 'KUAS',
    'MUSIK', 'GITAR', 'PIANO', 'GENDANG', 'BIOLA', 'LAGU',
    'TARI', 'PANGGUNG', 'KERETA', 'PESAWAT', 'ROKET', 'KAPAL',
    'RODA', 'MESIN', 'TIKET', 'PERJALANAN', 'DOKTER', 'GURU',
    'PETANI', 'TUKANG', 'PILOT', 'PELAUT', 'SENIMAN', 'TEMAN',
    'KELUARGA', 'IBU', 'AYAH', 'KAKAK', 'ADIK', 'HATI',
    'SENYUM', 'MIMPI', 'INGATAN', 'SUNYI',
  ],
});

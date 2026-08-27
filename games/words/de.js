// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Deutsch (de)
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
// UZUNLUK KADEMELERİ dile göre: [3, 7], [4, 8], [4, 10], [5, 12], [5, 13]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('de', {
  upperLocale: 'de',
  len: [[3, 7], [4, 8], [4, 10], [5, 12], [5, 13]],
  alphabet: 'ABCDEFGHIKLMNOPRSTUVWZ',
  fillerBag: 'ABCDEFGHIKLMNOPRSTUVWZABCDEFGHIKLMNOPRSTUVWZAEIOUENRSTLDH',
  words: [
    'WASSER', 'FEUER', 'ERDE', 'WIND', 'STEIN', 'FLUSS',
    'MEER', 'WALD', 'BERG', 'TAL', 'INSEL', 'WUESTE',
    'WOLKE', 'STURM', 'DONNER', 'SCHNEE', 'SOMMER', 'WINTER',
    'FRUEHLING', 'HERBST', 'MORGEN', 'ABEND', 'NACHT', 'SCHATTEN',
    'LICHT', 'STERN', 'MOND', 'SONNE', 'PLANET', 'HIMMEL',
    'APFEL', 'BROT', 'KAESE', 'BUTTER', 'HONIG', 'ZUCKER',
    'SALZ', 'PFEFFER', 'KAFFEE', 'MILCH', 'SUPPE', 'ORANGE',
    'ZITRONE', 'TRAUBE', 'KIRSCHE', 'BANANE', 'MELONE', 'TOMATE',
    'ZWIEBEL', 'KAROTTE', 'KARTOFFEL', 'REIS', 'NUDELN', 'KUCHEN',
    'KEKS', 'PFERD', 'KAMEL', 'TIGER', 'LOEWE', 'BAER',
    'WOLF', 'FUCHS', 'HASE', 'MAUS', 'ADLER', 'RABE',
    'DELFIN', 'WAL', 'HAI', 'SCHILDKROETE', 'SCHLANGE', 'SPINNE',
    'SCHMETTERLING', 'HAUS', 'TUER', 'FENSTER', 'DACH', 'GARTEN',
    'BRUECKE', 'TURM', 'SCHLOSS', 'MARKT', 'STRASSE', 'TISCH',
    'STUHL', 'SPIEGEL', 'TEPPICH', 'VORHANG', 'KISSEN', 'DECKE',
    'KERZE', 'LAMPE', 'KORB', 'FLASCHE', 'LOEFFEL', 'TELLER',
    'MESSER', 'SCHLUESSEL', 'BUCH', 'PAPIER', 'STIFT', 'PINSEL',
    'MUSIK', 'GITARRE', 'KLAVIER', 'TROMMEL', 'GEIGE', 'LIED',
    'TANZ', 'BUEHNE', 'ZUG', 'FLUGZEUG', 'RAKETE', 'SCHIFF',
    'RAD', 'MOTOR', 'FAHRKARTE', 'REISE', 'ARZT', 'LEHRER',
    'BAUER', 'BAECKER', 'PILOT', 'MATROSE', 'KUENSTLER', 'FREUND',
    'FAMILIE', 'MUTTER', 'VATER', 'SCHWESTER', 'BRUDER', 'HERZ',
    'LAECHELN', 'TRAUM', 'ERINNERUNG', 'STILLE',
  ],
});

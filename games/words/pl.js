// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Polski (pl)
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

WordPools.register('pl', {
  upperLocale: 'pl',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIJKLMNOPRSTUWYZÓĄĆĘŁŃŚŹŻ',
  fillerBag: 'ABCDEFGHIJKLMNOPRSTUWYZÓĄĆĘŁŃŚŹŻAĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻAEIOUAEIOWRKNZ',
  words: [
    'WODA', 'OGIEŃ', 'ZIEMIA', 'WIATR', 'KAMIEŃ', 'RZEKA',
    'MORZE', 'LAS', 'GÓRA', 'DOLINA', 'WYSPA', 'PUSTYNIA',
    'CHMURA', 'BURZA', 'GRZMOT', 'ŚNIEG', 'LÓD', 'LATO',
    'ZIMA', 'WIOSNA', 'JESIEŃ', 'RANEK', 'NOC', 'CIEŃ',
    'GWIAZDA', 'KSIĘŻYC', 'SŁOŃCE', 'PLANETA', 'NIEBO', 'JABŁKO',
    'CHLEB', 'SER', 'MASŁO', 'MIÓD', 'CUKIER', 'SÓL',
    'PIEPRZ', 'KAWA', 'SOK', 'MLEKO', 'ZUPA', 'POMARAŃCZA',
    'CYTRYNA', 'WINOGRONO', 'WIŚNIA', 'BANAN', 'MELON', 'POMIDOR',
    'CEBULA', 'CZOSNEK', 'MARCHEW', 'ZIEMNIAK', 'RYŻ', 'MAKARON',
    'CIASTO', 'HERBATNIK', 'CUKIEREK', 'KOŃ', 'WIELBŁĄD', 'TYGRYS',
    'LEW', 'NIEDŹWIEDŹ', 'WILK', 'LIS', 'KRÓLIK', 'MYSZ',
    'ORZEŁ', 'KRUK', 'DELFIN', 'WIELORYB', 'REKIN', 'ŻÓŁW',
    'WĄŻ', 'JASZCZURKA', 'PAJĄK', 'MOTYL', 'DOM', 'DRZWI',
    'OKNO', 'DACH', 'OGRÓD', 'MOST', 'WIEŻA', 'ZAMEK',
    'RYNEK', 'ULICA', 'STÓŁ', 'KRZESŁO', 'LUSTRO', 'DYWAN',
    'ZASŁONA', 'PODUSZKA', 'KOC', 'ŚWIECA', 'LAMPA', 'KOSZYK',
    'BUTELKA', 'ŁYŻKA', 'TALERZ', 'NÓŻ', 'ZEGAR', 'KLUCZ',
    'KSIĄŻKA', 'PAPIER', 'OŁÓWEK', 'PĘDZEL', 'MUZYKA', 'GITARA',
    'PIANINO', 'BĘBEN', 'SKRZYPCE', 'PIOSENKA', 'TANIEC', 'SCENA',
    'POCIĄG', 'SAMOLOT', 'RAKIETA', 'STATEK', 'KOŁO', 'SILNIK',
    'BILET', 'PODRÓŻ', 'LEKARZ', 'NAUCZYCIEL', 'ROLNIK', 'PIEKARZ',
    'PILOT', 'MARYNARZ', 'ARTYSTA', 'PRZYJACIEL', 'RODZINA', 'MATKA',
    'OJCIEC', 'SIOSTRA', 'BRAT', 'SERCE', 'UŚMIECH', 'MARZENIE',
    'PAMIĘĆ', 'CISZA',
  ],
});

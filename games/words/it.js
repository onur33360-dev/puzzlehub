// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Italiano (it)
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

WordPools.register('it', {
  upperLocale: 'it',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHILMNOPQRSTUVZ',
  fillerBag: 'ABCDEFGHILMNOPQRSTUVZABCDEFGHILMNOPQRSTUVZAEIOUAEIORSTN',
  words: [
    'ACQUA', 'FUOCO', 'TERRA', 'VENTO', 'PIETRA', 'FIUME',
    'MARE', 'FORESTA', 'MONTAGNA', 'VALLE', 'ISOLA', 'DESERTO',
    'NUVOLA', 'TEMPORALE', 'TUONO', 'NEVE', 'GHIACCIO', 'ESTATE',
    'INVERNO', 'PRIMAVERA', 'AUTUNNO', 'MATTINO', 'NOTTE', 'OMBRA',
    'STELLA', 'LUNA', 'SOLE', 'PIANETA', 'GALASSIA', 'CIELO',
    'MELA', 'PANE', 'FORMAGGIO', 'BURRO', 'MIELE', 'ZUCCHERO',
    'SALE', 'PEPE', 'CAFFE', 'SUCCO', 'LATTE', 'ZUPPA',
    'ARANCIA', 'LIMONE', 'UVA', 'CILIEGIA', 'BANANA', 'MELONE',
    'POMODORO', 'CIPOLLA', 'AGLIO', 'CAROTA', 'PATATA', 'RISO',
    'PASTA', 'TORTA', 'BISCOTTO', 'CARAMELLA', 'CAVALLO', 'CAMMELLO',
    'TIGRE', 'LEONE', 'ORSO', 'LUPO', 'VOLPE', 'CONIGLIO',
    'TOPO', 'AQUILA', 'CORVO', 'DELFINO', 'BALENA', 'SQUALO',
    'TARTARUGA', 'SERPENTE', 'LUCERTOLA', 'RAGNO', 'FARFALLA', 'CASA',
    'PORTA', 'FINESTRA', 'TETTO', 'GIARDINO', 'PONTE', 'TORRE',
    'CASTELLO', 'MERCATO', 'STRADA', 'TAVOLO', 'SEDIA', 'SPECCHIO',
    'TAPPETO', 'TENDA', 'CUSCINO', 'COPERTA', 'CANDELA', 'LAMPADA',
    'CESTINO', 'BOTTIGLIA', 'CUCCHIAIO', 'PIATTO', 'COLTELLO', 'OROLOGIO',
    'CHIAVE', 'LIBRO', 'CARTA', 'MATITA', 'PENNELLO', 'MUSICA',
    'CHITARRA', 'PIANOFORTE', 'TAMBURO', 'VIOLINO', 'CANZONE', 'DANZA',
    'TRENO', 'AEREO', 'RAZZO', 'BARCA', 'RUOTA', 'MOTORE',
    'BIGLIETTO', 'VIAGGIO', 'MEDICO', 'MAESTRO', 'CONTADINO', 'FORNAIO',
    'PILOTA', 'MARINAIO', 'ARTISTA', 'AMICO', 'FAMIGLIA', 'MADRE',
    'PADRE', 'SORELLA', 'FRATELLO', 'CUORE', 'SORRISO', 'SOGNO',
    'MEMORIA', 'SILENZIO',
  ],
});

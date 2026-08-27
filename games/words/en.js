// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · English (en)
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

WordPools.register('en', {
  upperLocale: 'en',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIJKLMNOPRSTUVWXYZ',
  fillerBag: 'ABCDEFGHIJKLMNOPRSTUVWXYZABCDEFGHIJKLMNOPRSTUVWXYZAEIOUAEIORSTNL',
  words: [
    'WATER', 'FIRE', 'EARTH', 'WIND', 'STONE', 'RIVER',
    'OCEAN', 'FOREST', 'MOUNTAIN', 'VALLEY', 'ISLAND', 'DESERT',
    'CLOUD', 'STORM', 'THUNDER', 'RAINBOW', 'SNOW', 'ICE',
    'FROST', 'SUMMER', 'WINTER', 'SPRING', 'AUTUMN', 'MORNING',
    'EVENING', 'NIGHT', 'SHADOW', 'LIGHT', 'STAR', 'MOON',
    'SUN', 'PLANET', 'COMET', 'GALAXY', 'APPLE', 'BREAD',
    'CHEESE', 'BUTTER', 'HONEY', 'SUGAR', 'SALT', 'PEPPER',
    'COFFEE', 'JUICE', 'MILK', 'SOUP', 'ORANGE', 'LEMON',
    'GRAPE', 'CHERRY', 'BANANA', 'PEACH', 'MELON', 'BERRY',
    'TOMATO', 'ONION', 'GARLIC', 'CARROT', 'POTATO', 'BEANS',
    'RICE', 'PASTA', 'CAKE', 'COOKIE', 'CANDY', 'HORSE',
    'CAMEL', 'TIGER', 'LION', 'BEAR', 'WOLF', 'FOX',
    'RABBIT', 'MOUSE', 'EAGLE', 'FALCON', 'RAVEN', 'SPARROW',
    'DOLPHIN', 'WHALE', 'SHARK', 'TURTLE', 'SNAKE', 'LIZARD',
    'SPIDER', 'BUTTERFLY', 'BEETLE', 'HOUSE', 'DOOR', 'WINDOW',
    'ROOF', 'GARDEN', 'BRIDGE', 'TOWER', 'CASTLE', 'MARKET',
    'STREET', 'TABLE', 'CHAIR', 'MIRROR', 'CARPET', 'CURTAIN',
    'PILLOW', 'BLANKET', 'CANDLE', 'LAMP', 'BASKET', 'BOTTLE',
    'SPOON', 'PLATE', 'KNIFE', 'CLOCK', 'KEY', 'BOOK',
    'PAPER', 'PENCIL', 'BRUSH', 'MUSIC', 'GUITAR', 'PIANO',
    'DRUM', 'VIOLIN', 'SONG', 'DANCE', 'STAGE', 'TRAIN',
    'PLANE', 'ROCKET', 'BOAT', 'WHEEL', 'ENGINE', 'TICKET',
    'JOURNEY', 'DOCTOR', 'TEACHER', 'FARMER', 'BAKER', 'PILOT',
    'SAILOR', 'ARTIST', 'WRITER', 'FRIEND', 'FAMILY', 'MOTHER',
    'FATHER', 'SISTER', 'BROTHER', 'HEART', 'SMILE', 'DREAM',
    'MEMORY', 'COURAGE', 'SILENCE', 'WONDER',
  ],
});

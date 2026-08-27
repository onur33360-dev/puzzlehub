// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · 日本語 (ja)
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
// UZUNLUK KADEMELERİ dile göre: [2, 4], [2, 4], [3, 5], [3, 6], [3, 6]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('ja', {
  upperLocale: null,
  len: [[2, 4], [2, 4], [3, 5], [3, 6], [3, 6]],
  alphabet: 'あいうえおかがきぎくけげこごさしじすずせぜそぞただちっつでとどなにねのはばぱひびぴふぶぷへほぼまみめもゃやゅゆょよらりるれろわん',
  fillerBag: 'あいうえおかがきぎくけげこごさしじすずせぜそぞただちっつでとどなにねのはばぱひびぴふぶぷへほぼまみめもゃやゅゆょよらりるれろわんあいうえおかきくけこさしすせそたちつとなにねのはひふへほまみめもやゆよらりるれろわんあいうえおかきくけこさしすせ',
  words: [
    'みず', 'ひかり', 'かぜ', 'いし', 'かわ', 'うみ',
    'もり', 'やま', 'たに', 'しま', 'さばく', 'くも',
    'あらし', 'かみなり', 'ゆき', 'こおり', 'なつ', 'ふゆ',
    'はる', 'あき', 'あさ', 'よる', 'かげ', 'ほし',
    'つき', 'たいよう', 'そら', 'りんご', 'ぱん', 'ちいず',
    'はちみつ', 'さとう', 'しお', 'こしょう', 'こおひい', 'みるく',
    'すうぷ', 'おれんじ', 'れもん', 'ぶどう', 'さくらんぼ', 'ばなな',
    'めろん', 'とまと', 'たまねぎ', 'にんじん', 'じゃがいも', 'ごはん',
    'けえき', 'くっきい', 'あめ', 'うま', 'らくだ', 'とら',
    'らいおん', 'くま', 'おおかみ', 'きつね', 'うさぎ', 'ねずみ',
    'わし', 'からす', 'いるか', 'くじら', 'さめ', 'かめ',
    'へび', 'とかげ', 'ちょう', 'いえ', 'とびら', 'まど',
    'やね', 'にわ', 'はし', 'とう', 'しろ', 'いちば',
    'みち', 'つくえ', 'いす', 'かがみ', 'じゅうたん', 'まくら',
    'もうふ', 'ろうそく', 'らんぷ', 'かご', 'びん', 'すぷうん',
    'さら', 'ないふ', 'とけい', 'かぎ', 'ほん', 'かみ',
    'えんぴつ', 'ふで', 'おんがく', 'ぎたあ', 'ぴあの', 'たいこ',
    'ばいおりん', 'うた', 'おどり', 'ぶたい', 'でんしゃ', 'ひこうき',
    'ろけっと', 'ふね', 'くるま', 'えんじん', 'きっぷ', 'たび',
    'いしゃ', 'せんせい', 'のうか', 'ぱんや', 'ぱいろっと', 'ふなのり',
    'がか', 'ともだち', 'かぞく', 'はは', 'ちち', 'あね',
    'あに', 'こころ', 'えがお', 'ゆめ', 'きおく', 'しずか',
  ],
});

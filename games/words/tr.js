// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Türkçe (tr)
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
//
// games/words-tr.js (2026-08-13) havuzundan devralındı.
'use strict';

WordPools.register('tr', {
  upperLocale: 'tr',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIKLMNOPRSTUVYZÇÖÜĞİŞ',
  fillerBag: 'ABCDEFGHIKLMNOPRSTUVYZÇÖÜĞİŞABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZAEIİOÖUÜAEİKLMNRST',
  words: [
    'OYUN', 'SKOR', 'PUAN', 'RENK', 'HARF', 'BLOK',
    'SAYI', 'ISIK', 'GÖLGE', 'SES', 'ZAMAN', 'YOL',
    'KAPI', 'PENCERE', 'ANAHTAR', 'SAAT', 'AYNA', 'HALI',
    'PERDE', 'YASTIK', 'BATTANİYE', 'SANDALYE', 'MASA', 'KOLTUK',
    'DOLAP', 'RAF', 'LAMBA', 'MUM', 'SEPET', 'KUTU',
    'ÇANTA', 'CÜZDAN', 'ŞEMSİYE', 'TARAK', 'HAVLU', 'SABUN',
    'MAKAS', 'İĞNE', 'İPLİK', 'DÜĞME', 'DENİZ', 'ORMAN',
    'BULUT', 'GÜNEŞ', 'YILDIZ', 'DOLUNAY', 'GÖKYÜZÜ', 'DAĞ',
    'TEPE', 'OVA', 'NEHİR', 'GÖL', 'DERE', 'ŞELALE',
    'YAĞMUR', 'KAR', 'RÜZGAR', 'FIRTINA', 'ŞİMŞEK', 'SİS',
    'TOPRAK', 'TAŞ', 'KUM', 'AĞAÇ', 'YAPRAK', 'ÇİÇEK',
    'GÜL', 'PAPATYA', 'LALE', 'MENEKŞE', 'ÇİMEN', 'DAL',
    'KÖK', 'TOHUM', 'ADA', 'MAĞARA', 'VADİ', 'BAHÇE',
    'KEDİ', 'KÖPEK', 'KUŞ', 'BALIK', 'ASLAN', 'KAPLAN',
    'AYI', 'KURT', 'TİLKİ', 'TAVŞAN', 'SİNCAP', 'GEYİK',
    'KISRAK', 'İNEK', 'KOYUN', 'KEÇİ', 'TAVUK', 'HOROZ',
    'ÖRDEK', 'KAZ', 'KARTAL', 'BAYKUŞ', 'KELEBEK', 'ARI',
    'KARINCA', 'YILAN', 'KURBAĞA', 'KAPLUMBAĞA', 'FİL', 'ZÜRAFA',
    'MAYMUN', 'PENGUEN', 'YUNUS', 'BALİNA', 'EKMEK', 'PEYNİR',
    'SÜT', 'YOĞURT', 'BAL', 'TEREYAĞ', 'ZEYTİN', 'DOMATES',
    'SALATALIK', 'BİBER', 'PATATES', 'SOĞAN', 'SARIMSAK', 'HAVUÇ',
    'ELMA', 'ARMUT', 'KİRAZ', 'ÇİLEK', 'KARPUZ', 'KAVUN',
    'ÜZÜM', 'MUZ', 'PORTAKAL', 'LİMON', 'ŞEFTALİ', 'KAYISI',
    'İNCİR', 'CEVİZ', 'FINDIK', 'BADEM', 'PİRİNÇ', 'MAKARNA',
    'ÇORBA', 'KÖFTE', 'PİLAV', 'SALATA', 'TATLI', 'ÇAY',
    'KAHVE', 'AYRAN', 'ŞEKER', 'TUZ', 'APARTMAN', 'SOKAK',
    'CADDE', 'MEYDAN', 'KÖPRÜ', 'PARK', 'MARKET', 'PAZAR',
    'HASTANE', 'ECZANE', 'MÜZE', 'KÜTÜPHANE', 'SİNEMA', 'TİYATRO',
    'STADYUM', 'BİNA', 'KULE', 'BALKON', 'BAHÇIVAN', 'ARABA',
    'TREN', 'GEMİ', 'UÇAK', 'OTOBÜS', 'BİSİKLET', 'MOTOR',
    'VAPUR', 'TAKSİ', 'METRO', 'TRAMVAY', 'KAMYON', 'TEKNE',
    'BİLET', 'DURAK', 'LİMAN', 'OKUL', 'SINIF', 'ÖĞRENCİ',
    'ÖĞRETMEN', 'KALEM', 'KİTAP', 'DEFTER', 'SİLGİ', 'CETVEL',
    'TAHTA', 'SIRA', 'KURŞUN', 'DERS', 'SORU', 'CEVAP',
    'BİLGİ', 'SINAV', 'ÖDEV', 'HARİTA', 'SÖZLÜK', 'EKRAN',
    'ROBOT', 'TELEFON', 'BİLGİSAYAR', 'KLAVYE', 'FARE', 'KAMERA',
    'PİL', 'KABLO', 'YAZILIM', 'İNTERNET', 'DOSYA', 'UYGULAMA',
    'VERİ', 'ŞİFRE', 'TUŞ', 'FUTBOL', 'TENİS', 'YÜZME',
    'KOŞU', 'BASKET', 'VOLEYBOL', 'GÜREŞ', 'BOKS', 'TOP',
    'KALE', 'MAÇ', 'TAKIM', 'ANTRENÖR', 'MADALYA', 'KUPA',
    'HAKEM', 'DOKTOR', 'HEMŞİRE', 'MÜHENDİS', 'AVUKAT', 'AŞÇI',
    'TERZİ', 'MARANGOZ', 'ÇİFTÇİ', 'PİLOT', 'ŞOFÖR', 'POLİS',
    'İTFAİYECİ', 'RESSAM', 'YAZAR', 'MÜZİSYEN', 'BERBER', 'SEVGİ',
    'MUTLU', 'HAYAL', 'UMUT', 'DOSTLUK', 'BARIŞ', 'SABIR',
    'CESARET', 'GÜLÜMSE', 'ŞARKI', 'DANS', 'MÜZİK', 'RESİM',
    'HİKAYE', 'MASAL', 'ŞİİR', 'RÜYA', 'UYKU', 'SABAH',
    'AKŞAM', 'GECE', 'GÜNDÜZ', 'YAZ', 'KIŞ', 'BAHAR',
    'GÜZ',
  ],
});

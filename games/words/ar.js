// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · العربية (ar)
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
// UZUNLUK KADEMELERİ dile göre: [3, 5], [3, 6], [3, 7], [4, 8], [4, 8]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('ar', {
  upperLocale: null,
  len: [[3, 5], [3, 6], [3, 7], [4, 8], [4, 8]],
  alphabet: 'ءئابةتثجحخدذرزسشصطعغفقكلمنهوىي',
  fillerBag: 'ءئابةتثجحخدذرزسشصطعغفقكلمنهوىيابتثجحخدذرزسشصطعغفقكلمنهويالمنرياليمنبر',
  words: [
    'ماء', 'نار', 'تراب', 'ريح', 'حجر', 'نهر',
    'بحر', 'غابة', 'جبل', 'واد', 'جزيرة', 'صحراء',
    'سحاب', 'عاصفة', 'رعد', 'ثلج', 'جليد', 'صيف',
    'شتاء', 'ربيع', 'خريف', 'صباح', 'ليل', 'نور',
    'نجم', 'قمر', 'شمس', 'كوكب', 'سماء', 'تفاح',
    'خبز', 'جبن', 'زبدة', 'عسل', 'سكر', 'ملح',
    'فلفل', 'قهوة', 'عصير', 'حليب', 'حساء', 'برتقال',
    'ليمون', 'عنب', 'كرز', 'موز', 'بطيخ', 'طماطم',
    'بصل', 'ثوم', 'جزر', 'بطاطا', 'ارز', 'كعك',
    'بسكويت', 'حلوى', 'حصان', 'جمل', 'نمر', 'اسد',
    'ذئب', 'ثعلب', 'ارنب', 'فار', 'نسر', 'غراب',
    'دلفين', 'حوت', 'قرش', 'سلحفاة', 'ثعبان', 'سحلية',
    'عنكبوت', 'فراشة', 'بيت', 'باب', 'نافذة', 'سقف',
    'حديقة', 'جسر', 'برج', 'قصر', 'سوق', 'شارع',
    'طاولة', 'كرسي', 'مراة', 'سجاد', 'ستارة', 'وسادة',
    'بطانية', 'شمعة', 'مصباح', 'سلة', 'زجاجة', 'ملعقة',
    'صحن', 'سكين', 'ساعة', 'مفتاح', 'كتاب', 'ورق',
    'قلم', 'فرشاة', 'موسيقى', 'جيتار', 'بيانو', 'طبل',
    'كمان', 'اغنية', 'رقص', 'مسرح', 'قطار', 'طائرة',
    'صاروخ', 'سفينة', 'عجلة', 'محرك', 'تذكرة', 'رحلة',
    'طبيب', 'معلم', 'فلاح', 'خباز', 'طيار', 'بحار',
    'فنان', 'صديق', 'عائلة', 'اخت', 'قلب', 'ابتسامة',
    'حلم', 'ذاكرة', 'صمت',
  ],
});

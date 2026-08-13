// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Türkçe kelime havuzu (Kelime Avı)
// ═══════════════════════════════════════════════════════════════════════
//
// NEDEN AYRI DOSYA: içerik oyun kodundan ayrı tutuluyor, çünkü havuzun
// büyümesi kod değişikliği GEREKTİRMEMELİ. Bugün ~260 kelime; binlerce
// olduğunda `wordSearch` içindeki hiçbir satır değişmeyecek.
//
// KELİMELER BÜYÜK HARFLE YAZILI ve bu bilinçli. JavaScript'in varsayılan
// büyütmesi Türkçe için YANLIŞ:
//     'i'.toUpperCase()  → 'I'   (doğrusu 'İ')
//     'I'.toLowerCase()  → 'i'   (doğrusu 'ı')
// Havuzu hazır büyük harfle tutmak, çalışma zamanında hiç dönüşüm
// yapmamayı ve bu tuzağa hiç girmemeyi sağlıyor. Yine de oyun tarafı
// kendi karşılaştırmalarında `toLocaleUpperCase('tr')` kullanıyor —
// ikisi birden, çünkü ileride havuza küçük harfli bir kelime eklenirse
// sessizce eşleşmemesi yerine doğru büyütülmesi gerekir.
//
// TÜRK ALFABESİ 29 HARF: Q, W, X YOK. Dolgu harfleri de bu alfabeden
// seçiliyor, yoksa tahtada Türkçede bulunmayan harfler belirir ve
// oyuncu onları "kelime olamaz" diye eleyerek bulmacayı kolaylaştırır.
//
// SEÇİM ÖLÇÜTLERİ (yeni kelime eklerken uy):
//  • günlük, herkesin bildiği kelimeler — sözlük derinliği değil
//  • 3-10 harf (tahtaya sığmalı; 12x12 en büyük ızgara)
//  • özel isim yok, kısaltma yok, çoğul/ek almış biçim yok
//  • rahatsız edici ya da tartışmalı içerik yok
//
// zorluk: kelime UZUNLUĞU değil, TANINIRLIK. Uzunluk üreticinin işi.
'use strict';

window.WORDS_TR = (function () {

  // Kategoriler yalnızca içerik düzeni için; oyuncuya gösterilmiyor.
  // İleride "hayvan seviyesi" gibi bir mod istenirse veri hazır.
  const POOL = [
    // ── genel ──
    { w:'OYUN', d:'easy', c:'oyun' },        { w:'SKOR', d:'easy', c:'oyun' },
    { w:'PUAN', d:'easy', c:'oyun' },        { w:'RENK', d:'easy', c:'genel' },
    { w:'HARF', d:'easy', c:'okul' },        { w:'BLOK', d:'easy', c:'oyun' },
    { w:'SAYI', d:'easy', c:'okul' },        { w:'ISIK', d:'easy', c:'genel' },
    { w:'GÖLGE', d:'med',  c:'genel' },      { w:'SES', d:'easy', c:'genel' },
    { w:'ZAMAN', d:'med',  c:'genel' },      { w:'YOL', d:'easy', c:'ulasim' },
    { w:'KAPI', d:'easy', c:'esya' },        { w:'PENCERE', d:'med', c:'esya' },
    { w:'ANAHTAR', d:'med', c:'esya' },      { w:'SAAT', d:'easy', c:'esya' },
    { w:'AYNA', d:'easy', c:'esya' },        { w:'HALI', d:'easy', c:'esya' },
    { w:'PERDE', d:'med',  c:'esya' },       { w:'YASTIK', d:'med', c:'esya' },
    { w:'BATTANİYE', d:'hard', c:'esya' },   { w:'SANDALYE', d:'hard', c:'esya' },
    { w:'MASA', d:'easy', c:'esya' },        { w:'KOLTUK', d:'med', c:'esya' },
    { w:'DOLAP', d:'med',  c:'esya' },       { w:'RAF', d:'easy', c:'esya' },
    { w:'LAMBA', d:'med',  c:'esya' },       { w:'MUM', d:'easy', c:'esya' },
    { w:'SEPET', d:'med',  c:'esya' },       { w:'KUTU', d:'easy', c:'esya' },
    { w:'ÇANTA', d:'med',  c:'esya' },       { w:'CÜZDAN', d:'med', c:'esya' },
    { w:'ŞEMSİYE', d:'hard', c:'esya' },     { w:'TARAK', d:'med', c:'esya' },
    { w:'HAVLU', d:'med',  c:'esya' },       { w:'SABUN', d:'med', c:'esya' },
    { w:'MAKAS', d:'med',  c:'esya' },       { w:'İĞNE', d:'med', c:'esya' },
    { w:'İPLİK', d:'med',  c:'esya' },       { w:'DÜĞME', d:'med', c:'esya' },

    // ── doğa ──
    { w:'DENİZ', d:'easy', c:'doga' },       { w:'ORMAN', d:'easy', c:'doga' },
    { w:'BULUT', d:'easy', c:'doga' },       { w:'GÜNEŞ', d:'easy', c:'doga' },
    { w:'YILDIZ', d:'med', c:'doga' },       { w:'DOLUNAY', d:'med', c:'doga' },
    { w:'GÖKYÜZÜ', d:'hard', c:'doga' },     { w:'DAĞ', d:'easy', c:'doga' },
    { w:'TEPE', d:'easy', c:'doga' },        { w:'OVA', d:'easy', c:'doga' },
    { w:'NEHİR', d:'med',  c:'doga' },       { w:'GÖL', d:'easy', c:'doga' },
    { w:'DERE', d:'easy', c:'doga' },        { w:'ŞELALE', d:'hard', c:'doga' },
    { w:'YAĞMUR', d:'med', c:'doga' },       { w:'KAR', d:'easy', c:'doga' },
    { w:'RÜZGAR', d:'med', c:'doga' },       { w:'FIRTINA', d:'hard', c:'doga' },
    { w:'ŞİMŞEK', d:'hard', c:'doga' },      { w:'SİS', d:'easy', c:'doga' },
    { w:'TOPRAK', d:'med', c:'doga' },       { w:'TAŞ', d:'easy', c:'doga' },
    { w:'KUM', d:'easy', c:'doga' },         { w:'AĞAÇ', d:'easy', c:'doga' },
    { w:'YAPRAK', d:'med', c:'doga' },       { w:'ÇİÇEK', d:'med', c:'doga' },
    { w:'GÜL', d:'easy', c:'doga' },         { w:'PAPATYA', d:'hard', c:'doga' },
    { w:'LALE', d:'easy', c:'doga' },        { w:'MENEKŞE', d:'hard', c:'doga' },
    { w:'ÇİMEN', d:'med',  c:'doga' },       { w:'DAL', d:'easy', c:'doga' },
    { w:'KÖK', d:'easy', c:'doga' },         { w:'TOHUM', d:'med', c:'doga' },
    { w:'ADA', d:'easy', c:'doga' },         { w:'MAĞARA', d:'med', c:'doga' },
    { w:'VADİ', d:'med',  c:'doga' },        { w:'BAHÇE', d:'med', c:'doga' },

    // ── hayvan ──
    { w:'KEDİ', d:'easy', c:'hayvan' },      { w:'KÖPEK', d:'easy', c:'hayvan' },
    { w:'KUŞ', d:'easy', c:'hayvan' },       { w:'BALIK', d:'easy', c:'hayvan' },
    { w:'ASLAN', d:'easy', c:'hayvan' },     { w:'KAPLAN', d:'med', c:'hayvan' },
    { w:'AYI', d:'easy', c:'hayvan' },       { w:'KURT', d:'easy', c:'hayvan' },
    { w:'TİLKİ', d:'med',  c:'hayvan' },     { w:'TAVŞAN', d:'med', c:'hayvan' },
    { w:'SİNCAP', d:'med', c:'hayvan' },     { w:'GEYİK', d:'med', c:'hayvan' },
    { w:'KISRAK', d:'med', c:'hayvan' },        { w:'İNEK', d:'easy', c:'hayvan' },
    { w:'KOYUN', d:'easy', c:'hayvan' },     { w:'KEÇİ', d:'easy', c:'hayvan' },
    { w:'TAVUK', d:'easy', c:'hayvan' },     { w:'HOROZ', d:'med', c:'hayvan' },
    { w:'ÖRDEK', d:'med',  c:'hayvan' },     { w:'KAZ', d:'easy', c:'hayvan' },
    { w:'KARTAL', d:'med', c:'hayvan' },     { w:'BAYKUŞ', d:'med', c:'hayvan' },
    { w:'KELEBEK', d:'hard', c:'hayvan' },   { w:'ARI', d:'easy', c:'hayvan' },
    { w:'KARINCA', d:'hard', c:'hayvan' },   { w:'YILAN', d:'easy', c:'hayvan' },
    { w:'KURBAĞA', d:'hard', c:'hayvan' },   { w:'KAPLUMBAĞA', d:'hard', c:'hayvan' },
    { w:'FİL', d:'easy', c:'hayvan' },       { w:'ZÜRAFA', d:'med', c:'hayvan' },
    { w:'MAYMUN', d:'med', c:'hayvan' },     { w:'PENGUEN', d:'hard', c:'hayvan' },
    { w:'YUNUS', d:'med',  c:'hayvan' },     { w:'BALİNA', d:'med', c:'hayvan' },
    { w:'KÖPEKBALIĞI', d:'hard', c:'hayvan' },

    // ── yiyecek ──
    { w:'EKMEK', d:'easy', c:'yiyecek' },    { w:'PEYNİR', d:'med', c:'yiyecek' },
    { w:'SÜT', d:'easy', c:'yiyecek' },      { w:'YOĞURT', d:'med', c:'yiyecek' },
    { w:'BAL', d:'easy', c:'yiyecek' },      { w:'TEREYAĞ', d:'hard', c:'yiyecek' },
    { w:'ZEYTİN', d:'med', c:'yiyecek' },    { w:'DOMATES', d:'hard', c:'yiyecek' },
    { w:'SALATALIK', d:'hard', c:'yiyecek' },{ w:'BİBER', d:'med', c:'yiyecek' },
    { w:'PATATES', d:'hard', c:'yiyecek' },  { w:'SOĞAN', d:'med', c:'yiyecek' },
    { w:'SARIMSAK', d:'hard', c:'yiyecek' }, { w:'HAVUÇ', d:'med', c:'yiyecek' },
    { w:'ELMA', d:'easy', c:'yiyecek' },     { w:'ARMUT', d:'easy', c:'yiyecek' },
    { w:'KİRAZ', d:'med',  c:'yiyecek' },    { w:'ÇİLEK', d:'med', c:'yiyecek' },
    { w:'KARPUZ', d:'med', c:'yiyecek' },    { w:'KAVUN', d:'med', c:'yiyecek' },
    { w:'ÜZÜM', d:'easy', c:'yiyecek' },     { w:'MUZ', d:'easy', c:'yiyecek' },
    { w:'PORTAKAL', d:'hard', c:'yiyecek' }, { w:'LİMON', d:'med', c:'yiyecek' },
    { w:'ŞEFTALİ', d:'hard', c:'yiyecek' },  { w:'KAYISI', d:'med', c:'yiyecek' },
    { w:'İNCİR', d:'med',  c:'yiyecek' },    { w:'CEVİZ', d:'med', c:'yiyecek' },
    { w:'FINDIK', d:'med', c:'yiyecek' },    { w:'BADEM', d:'med', c:'yiyecek' },
    { w:'PİRİNÇ', d:'med', c:'yiyecek' },    { w:'MAKARNA', d:'hard', c:'yiyecek' },
    { w:'ÇORBA', d:'med',  c:'yiyecek' },    { w:'KÖFTE', d:'med', c:'yiyecek' },
    { w:'PİLAV', d:'med',  c:'yiyecek' },    { w:'SALATA', d:'med', c:'yiyecek' },
    { w:'TATLI', d:'med',  c:'yiyecek' },    { w:'ÇAY', d:'easy', c:'yiyecek' },
    { w:'KAHVE', d:'med',  c:'yiyecek' },    { w:'AYRAN', d:'med', c:'yiyecek' },
    { w:'ŞEKER', d:'med',  c:'yiyecek' },    { w:'TUZ', d:'easy', c:'yiyecek' },

    // ── şehir / yer ──
    { w:'APARTMAN', d:'hard', c:'sehir' },         { w:'SOKAK', d:'med', c:'sehir' },
    { w:'CADDE', d:'med',  c:'sehir' },      { w:'MEYDAN', d:'med', c:'sehir' },
    { w:'KÖPRÜ', d:'med',  c:'sehir' },      { w:'PARK', d:'easy', c:'sehir' },
    { w:'MARKET', d:'med', c:'sehir' },      { w:'PAZAR', d:'med', c:'sehir' },
    { w:'HASTANE', d:'hard', c:'sehir' },    { w:'ECZANE', d:'hard', c:'sehir' },
    { w:'MÜZE', d:'easy', c:'sehir' },       { w:'KÜTÜPHANE', d:'hard', c:'sehir' },
    { w:'SİNEMA', d:'med', c:'sehir' },      { w:'TİYATRO', d:'hard', c:'sehir' },
    { w:'STADYUM', d:'hard', c:'sehir' },    { w:'BİNA', d:'easy', c:'sehir' },
    { w:'KULE', d:'easy', c:'sehir' },       { w:'BALKON', d:'med', c:'sehir' },
    { w:'BAHÇIVAN', d:'hard', c:'meslek' },

    // ── ulaşım ──
    { w:'ARABA', d:'easy', c:'ulasim' },     { w:'TREN', d:'easy', c:'ulasim' },
    { w:'GEMİ', d:'easy', c:'ulasim' },      { w:'UÇAK', d:'easy', c:'ulasim' },
    { w:'OTOBÜS', d:'med', c:'ulasim' },     { w:'BİSİKLET', d:'hard', c:'ulasim' },
    { w:'MOTOR', d:'med',  c:'ulasim' },     { w:'VAPUR', d:'med', c:'ulasim' },
    { w:'TAKSİ', d:'med',  c:'ulasim' },     { w:'METRO', d:'med', c:'ulasim' },
    { w:'TRAMVAY', d:'hard', c:'ulasim' },   { w:'KAMYON', d:'med', c:'ulasim' },
    { w:'TEKNE', d:'med',  c:'ulasim' },     { w:'BİLET', d:'med', c:'ulasim' },
    { w:'DURAK', d:'med',  c:'ulasim' },     { w:'LİMAN', d:'med', c:'ulasim' },

    // ── okul ──
    { w:'OKUL', d:'easy', c:'okul' },        { w:'SINIF', d:'med', c:'okul' },
    { w:'ÖĞRENCİ', d:'hard', c:'okul' },     { w:'ÖĞRETMEN', d:'hard', c:'okul' },
    { w:'KALEM', d:'easy', c:'okul' },       { w:'KİTAP', d:'easy', c:'okul' },
    { w:'DEFTER', d:'med', c:'okul' },       { w:'SİLGİ', d:'med', c:'okul' },
    { w:'CETVEL', d:'med', c:'okul' },       { w:'TAHTA', d:'med', c:'okul' },
    { w:'SIRA', d:'easy', c:'okul' },        { w:'KURŞUN', d:'med', c:'okul' },
    { w:'DERS', d:'easy', c:'okul' },        { w:'SORU', d:'easy', c:'okul' },
    { w:'CEVAP', d:'med',  c:'okul' },       { w:'BİLGİ', d:'med', c:'okul' },
    { w:'SINAV', d:'med',  c:'okul' },       { w:'ÖDEV', d:'easy', c:'okul' },
    { w:'HARİTA', d:'med', c:'okul' },       { w:'SÖZLÜK', d:'med', c:'okul' },

    // ── teknoloji ──
    { w:'EKRAN', d:'easy', c:'teknoloji' },  { w:'ROBOT', d:'easy', c:'teknoloji' },
    { w:'TELEFON', d:'hard', c:'teknoloji' },{ w:'BİLGİSAYAR', d:'hard', c:'teknoloji' },
    { w:'KLAVYE', d:'med', c:'teknoloji' },  { w:'FARE', d:'easy', c:'teknoloji' },
    { w:'KAMERA', d:'med', c:'teknoloji' },  { w:'PİL', d:'easy', c:'teknoloji' },
    { w:'KABLO', d:'med',  c:'teknoloji' },  { w:'YAZILIM', d:'hard', c:'teknoloji' },
    { w:'İNTERNET', d:'hard', c:'teknoloji' },{ w:'DOSYA', d:'med', c:'teknoloji' },
    { w:'UYGULAMA', d:'hard', c:'teknoloji' },{ w:'VERİ', d:'easy', c:'teknoloji' },
    { w:'ŞİFRE', d:'med',  c:'teknoloji' },  { w:'TUŞ', d:'easy', c:'teknoloji' },

    // ── spor ──
    { w:'FUTBOL', d:'med', c:'spor' },       { w:'TENİS', d:'med', c:'spor' },
    { w:'YÜZME', d:'med',  c:'spor' },       { w:'KOŞU', d:'easy', c:'spor' },
    { w:'BASKET', d:'med', c:'spor' },       { w:'VOLEYBOL', d:'hard', c:'spor' },
    { w:'GÜREŞ', d:'med',  c:'spor' },       { w:'BOKS', d:'easy', c:'spor' },
    { w:'TOP', d:'easy', c:'spor' },         { w:'KALE', d:'easy', c:'spor' },
    { w:'MAÇ', d:'easy', c:'spor' },         { w:'TAKIM', d:'med', c:'spor' },
    { w:'ANTRENÖR', d:'hard', c:'spor' },    { w:'MADALYA', d:'hard', c:'spor' },
    { w:'KUPA', d:'easy', c:'spor' },        { w:'HAKEM', d:'med', c:'spor' },

    // ── meslek ──
    { w:'DOKTOR', d:'med', c:'meslek' },     { w:'HEMŞİRE', d:'hard', c:'meslek' },
    { w:'MÜHENDİS', d:'hard', c:'meslek' },  { w:'AVUKAT', d:'med', c:'meslek' },
    { w:'AŞÇI', d:'easy', c:'meslek' },      { w:'TERZİ', d:'med', c:'meslek' },
    { w:'MARANGOZ', d:'hard', c:'meslek' },  { w:'ÇİFTÇİ', d:'med', c:'meslek' },
    { w:'PİLOT', d:'med',  c:'meslek' },     { w:'ŞOFÖR', d:'med', c:'meslek' },
    { w:'POLİS', d:'med',  c:'meslek' },     { w:'İTFAİYECİ', d:'hard', c:'meslek' },
    { w:'RESSAM', d:'med', c:'meslek' },     { w:'YAZAR', d:'med', c:'meslek' },
    { w:'MÜZİSYEN', d:'hard', c:'meslek' },  { w:'BERBER', d:'med', c:'meslek' },

    // ── genel / soyut ──
    { w:'SEVGİ', d:'med',  c:'genel' },      { w:'MUTLU', d:'med', c:'genel' },
    { w:'HAYAL', d:'med',  c:'genel' },      { w:'UMUT', d:'easy', c:'genel' },
    { w:'DOSTLUK', d:'hard', c:'genel' },    { w:'BARIŞ', d:'med', c:'genel' },
    { w:'SABIR', d:'med',  c:'genel' },      { w:'CESARET', d:'hard', c:'genel' },
    { w:'GÜLÜMSE', d:'hard', c:'genel' },    { w:'ŞARKI', d:'med', c:'genel' },
    { w:'DANS', d:'easy', c:'genel' },       { w:'MÜZİK', d:'med', c:'genel' },
    { w:'RESİM', d:'med',  c:'genel' },      { w:'HİKAYE', d:'med', c:'genel' },
    { w:'MASAL', d:'med',  c:'genel' },      { w:'ŞİİR', d:'easy', c:'genel' },
    { w:'RÜYA', d:'easy', c:'genel' },       { w:'UYKU', d:'easy', c:'genel' },
    { w:'SABAH', d:'med',  c:'genel' },      { w:'AKŞAM', d:'med', c:'genel' },
    { w:'GECE', d:'easy', c:'genel' },       { w:'GÜNDÜZ', d:'med', c:'genel' },
    { w:'YAZ', d:'easy', c:'genel' },        { w:'KIŞ', d:'easy', c:'genel' },
    { w:'BAHAR', d:'med',  c:'genel' },      { w:'GÜZ', d:'easy', c:'genel' },
  ];

  // Türk alfabesi — dolgu harfleri BURADAN. Q/W/X yok.
  const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

  // Sesli harfler dolguda biraz daha sık geçsin: tamamen düzgün dağılım
  // "ŞĞÇJ" yığınları üretiyor ve tahta Türkçe görünmüyor. Bu yalnızca
  // ESTETİK — çözülebilirliği etkilemiyor, hedef kelimeler zaten yerleşmiş
  // oluyor (bkz. üreticinin sırası: önce kelimeler, sonra dolgu).
  const FILLER_BAG = ALPHABET + 'AEIİOÖUÜ' + 'AEİKLMNRST';

  return {
    POOL,
    ALPHABET,
    FILLER_BAG,
    /** Zorluk etiketine göre süz. Bilinmeyen etiket → tüm havuz. */
    byDifficulty(d) {
      if (!d) return POOL.slice();
      const hit = POOL.filter(x => x.d === d);
      return hit.length ? hit : POOL.slice();
    },
    /** Uzunluk aralığına göre süz (üretici tahtaya sığmayanı istemiyor). */
    byLength(min, max) {
      return POOL.filter(x => x.w.length >= min && x.w.length <= max);
    },
  };
})();

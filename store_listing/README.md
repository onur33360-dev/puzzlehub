# store_listing/ — Play Store liste metinleri

**Bu klasör uygulamanın parçası DEĞİLDİR.** `tools/build-www.js` açık bir
beyaz liste kullanıyor, o yüzden buradaki hiçbir dosya `www/`'ya ya da
APK'ya girmez. `site/` ile aynı kategoride: depoda duran ama uygulamaya
girmeyen malzeme.

## Durum: 15 iskelet, 0 doldurulmuş

| Alan | Durum |
|---|---|
| Uygulama adı | ✅ 15/15 — "SlySwipe", marka olduğu için çevrilmiyor |
| Kısa açıklama (80) | ❌ 0/15 |
| Tam açıklama (4000) | ❌ 0/15 |
| Ekran görüntüsü başlıkları (8×2) | ❌ 0/15 · Türkçe için 8 çift MEVCUT (bkz. `tr.md`) |
| Sürüm notları (500) | ❌ 0/15 |

## Neden boş

Depoda mağaza metni yoktu. Şartnamenin kuralı açık: *"mevcut store copy
projede yoksa metin uydurma"*. Mağaza açıklaması bir pazarlama kararıdır
— dönüşüm oranını, anahtar kelime stratejisini ve ürünün nasıl
konumlandığını belirler. Bunu otomatik üretip "hazır" diye işaretlemek,
on beş pazarda birden sahibinin görmediği bir vaat yayınlamak olurdu.

Türkçe için tek gerçek malzeme, `tools/store-screenshots.js` içindeki
sekiz onaylı ekran görüntüsü başlığıdır; `tr.md` onları kaynak olarak
listeliyor ama bunlar kısa/uzun açıklama yerine geçmez.

## Doldurma sırası (önerilen)

1. **Önce `tr.md` ya da `en.md`** — kaynak metin. Ürünü en iyi bilen
   dilde yazılmalı, sonra diğerlerine uyarlanmalı.
2. **Sonra kalan 13** — çeviri DEĞİL uyarlama. 80 karakterlik kısa
   açıklama Almanca/Rusça'da birebir çeviriyle taşar; o alan her dilde
   yeniden yazılır.
3. **Ekran görüntüsü başlıkları** doldurulduğunda
   `tools/store-screenshots.js` içine de girmeli — görüntüler oradan
   üretiliyor, buradaki tablo yalnızca kaynak.

## Uygulama içi çeviriyle karıştırma

`locales/<kod>.js` **arayüzü** çevirir, bu klasör **mağazayı**. İkisi
farklı mekanizmalarla seçilir:

- Play, kullanıcının **mağaza diline** göre listeyi gösterir.
- Uygulama, **cihaz/uygulama dili** tercihine göre açılır (`ph_lang`).

Bu ikisini birbirine bağlamak, Almanca mağazadan indiren ama telefonu
İngilizce olan bir kullanıcıyı yanlış varsayıma sokar. Kod tarafında
ülkeye göre dil zorlaması **yok** ve olmamalı.

## Kurallar

- **Fiyat yazma.** Play yerel fiyatı kendisi gösterir.
- **Yanlış vaat yok.** Kurulmamış sistemleri (oyun başarımları, haftalık
  sandık, profil çerçevesi, bildirimler, liderlik tablosu) yazma.
- **Sabit oyun sayısına dikkat.** "11 oyun" bugün doğru ama yeni oyun
  on beş dosyayı birden bayatlatır.

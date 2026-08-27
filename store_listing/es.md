# SlySwipe — Play Store listesi · Español (`es`)

> **DURUM: DOLDURULMADI.** Bu dosya bir İSKELETTİR. Aşağıdaki alanların
> hiçbiri yazılmadı ve otomatik olarak da yazılmayacak — mağaza metni
> pazarlama kararıdır, çeviri işi değildir. Bir alanı doldurduğunda
> `DURUM` satırını güncelle.

**Play Console dil kodu:** `es-ES`
**Uygulama içi locale karşılığı:** `es` (locales/es.js)

---

## 1. Uygulama adı  · en fazla 30 karakter

```
SlySwipe
```

**ÇEVRİLMEZ.** Marka adı; on beş dilde de aynı kalır (bkz. CLAUDE.md
marka kuralı). Bu alan bilerek doldurulmuş olan tek alan.

## 2. Kısa açıklama · en fazla 80 karakter

```
TODO
```

Mağaza listesinde başlığın hemen altında çıkar ve arama sonucunda
görünen tek açıklamadır. 80 karakter SIKI bir sınır — Almanca ve Rusça
gibi dillerde İngilizce taslağın birebir çevirisi taşar, o yüzden bu
alan çeviri değil YENİDEN YAZIM ister.

## 3. Tam açıklama · en fazla 4000 karakter

```
TODO
```

Kapsaması gerekenler (ürün gerçeğiyle uyumlu olmalı):
- 11 oyun: 9 bulmaca + 2 arcade
- Keşfet akışı (kaydırarak oyun keşfi)
- Günlük meydan okuma — herkese aynı bulmaca
- Seri, rozet ve görev sistemi
- SlySwipe Plus: reklamsız + günlük elmas + sınırsız devam
- Çevrimdışı oynanabilirlik

**YANLIŞ VAAT YASAK.** Kurulmamış sistemleri (oyun başarımları, haftalık
sandık, profil çerçevesi, bildirimler, liderlik tablosu) yazma — hepsi
uygulamada "yakında" durumunda.

## 4. Ekran görüntüsü başlıkları · 8 adet

Görüntüler `tools/store-screenshots.js` ile üretiliyor ve başlıklar
O DOSYADA yazılı. Bu dile çevrildiğinde ORAYA da girmeli, yoksa
görüntüler İngilizce/Türkçe kalır.

| # | Başlık | Alt başlık |
|---|---|---|
| 1 | TODO | TODO |
| 2 | TODO | TODO |
| 3 | TODO | TODO |
| 4 | TODO | TODO |
| 5 | TODO | TODO |
| 6 | TODO | TODO |
| 7 | TODO | TODO |
| 8 | TODO | TODO |

## 5. Yeni sürüm notları · en fazla 500 karakter

```
TODO
```

---

## Kurallar

1. **Mağaza metni uygulama içi çeviriden AYRIDIR.** `locales/es.js`
   arayüzü çevirir; bu dosya mağazayı. İkisini birbirine bağlama —
   Play, kullanıcının MAĞAZA diline göre listeyi seçer, uygulama ise
   cihaz/uygulama dili tercihine göre açılır. Bunlar bağımsız
   mekanizmalar (bkz. şartname: "Store Listing İçin Dil Mantığı").
2. **Fiyat yazma.** Play yerel fiyatı kendisi gösterir; metne
   "₺149,99" gibi bir sayı yazmak, para birimi veya fiyat değişince
   yalan söyler.
3. **Sabit oyun sayısı dikkatli.** "11 oyun" bugün doğru; yeni oyun
   eklendiğinde on beş dilde birden güncellenmesi gerekir. Depoda bu
   yüzden daha önce bilinçli bir temizlik yapıldı (bkz. commit
   `1f41e80`) — sayı yerine "düzenli yeni oyun" tercih edilebilir.
4. **Ekran görüntüleri Play kurallarına uygun olmalı** — oran, kenar,
   alfa kanalı. `node tools/store-screenshots.js` bunu denetliyor.

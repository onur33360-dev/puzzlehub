# Play Store mağaza kaydı — SlySwipe

Play Console'a **kopyala-yapıştır** için hazır metinler ve form cevapları.
Kaynak burasıdır: bir metin değişirse önce bu dosya güncellenir, sonra Console.

Paket: `com.skyroonlabs.slyswipe` · Sürüm: `1.68.0` (`versionCode 2`)

---

## 1. Uygulama adı (en fazla 30 karakter)

```
SlySwipe
```

Alternatif (arama görünürlüğü için, 27 karakter):

```
SlySwipe: Bulmaca & Oyunlar
```

> **Karar sende.** Kısa ad marka odaklı, uzun ad Play aramasında "bulmaca"
> kelimesini yakalar. Ad sonradan değiştirilebilir (paket kimliğinin aksine).

---

## 2. Kısa açıklama (en fazla 80 karakter)

```
11 oyun tek uygulamada. Sudoku'dan Yılan'a, kendi hızında, tamamen Türkçe.
```

---

## 3. Tam açıklama (en fazla 4000 karakter)

```
SlySwipe — 11 oyun, tek uygulama.

Bulmaca sevenler için sakin ve akıcı bir oyun merkezi. Sayaç yok, süre baskısı
yok: istediğin kadar düşün, istediğin oyunu istediğin an bırak.

▸ KEŞFET AKIŞI
Yeni bir oyun aramak zorunda değilsin. Keşfet sekmesinde parmağını kaydır,
oynanabilir önizlemeler önüne gelsin. Beğendiğin kartta "Oyna"ya bas, doğrudan
oyuna gir. Her tur farklı bir oyun — kataloğun tamamı birkaç kaydırmada.

▸ 11 OYUN

Bulmaca
• Sudoku — üç zorluk, günlük bulmaca, hata hakkı sistemi
• Bulmaca Blokları — klasik blok yerleştirme, satır ve sütun temizleme
• İksir Sıralama — renkleri tüplerde ayır, hamle limitine dikkat et
• Ok Bulmaca — okları sıkışmadan tahtadan çıkar
• Akış Bağlantı — 70 seviye, aynı renkleri kesişmeden birleştir
• Kelime Avı — ızgarada gizli kelimeleri bul
• Hafıza Oyunu — kart eşleştirme
• 2048 — sayıları birleştir
• Resim Kaydır — karışan fotoğrafı yerine oturt, sonsuz seviye

Arcade
• Yılan — klasik oynanış, duvarlar geçirgen, tek düşman kendi kuyruğun
• Flappy UFO — tek dokunuşla uç, borulara çarpma

▸ GÜNLÜK RİTİM
Her gün yeni bir meydan okuma — herkes için aynı bulmaca. Giriş serini
sürdür, rozetleri topla, günlük görevleri tamamla ve elmas kazan.

▸ TÜRKÇE
Menüsünden ipucu metnine kadar her şey Türkçe. Çeviri değil, Türkçe düşünülmüş.

▸ ÇEVRİMDIŞI OYNANIR
Oyunların tamamı cihazında çalışır. Uçakta, metroda, çekmeyen yerde aynı
şekilde oynanır.

▸ TELEFONA GÖRE TASARLANDI
Tek elle, dikey. Küçük ekranda da, yazı boyutunu büyütmüş kullanıcıda da
metin taşmaz — yerleşim 54 ekran/yazı-ölçeği kombinasyonunda test edildi.

—

SlySwipe ücretsiz indirilir ve reklam içerir. İsteğe bağlı olarak reklamsız
deneyim sunan SlySwipe Plus aboneliği ve elmas paketleri satın alınabilir.
Ödüllü reklamlar tamamen isteğe bağlıdır — izlemeden de her oyun oynanabilir.

Gizlilik politikası:
https://onur33360-dev.github.io/slyswipe/gizlilik.html
```

---

## 4. Grafik varlıklar

| Varlık | Boyut | Durum |
|---|---|---|
| Uygulama ikonu | 512×512 PNG | ✅ `assets/icons/icon-512.png` |
| Öne çıkan grafik | 1024×500 PNG/JPEG | ✅ `assets/store/feature-graphic-1024x500.png` |
| Telefon ekran görüntüsü | min 2, max 8 · en az 320 px | ✅ **8 adet** → `screenshots/store-ready/` |

### Ekran görüntüsü hattı (2026-08-13)

```
screenshots/raw/          cihazdan alınan ham kareler (1080×2400)
      ↓  node tools/store-screenshots.js
screenshots/store-ready/  Play'e yüklenecek 1350×2400 dosyalar
```

Betik tekrar kullanılabilir: yeni bir kare eklemek için dosyayı `raw/`
içine koymak yeterli, başlığı `CAPTIONS` tablosuna yaz (yoksa başlıksız
üretir). `--no-caption` sade sürüm, `--jpeg` PNG yerine JPEG verir.

**HAM KARE OLDUĞU GİBİ YÜKLENEMEZ — iki şart birden ihlal ediliyor,
ikisi de ret sebebi. Ölçüldü, varsayılmadı:**

1. **En-boy oranı.** Galaxy A51 ekranı 1080×2400, oran **0.450**. Play en
   dar **9:16 = 0.5625**'e izin veriyor; telefon ekranı bundan daha uzun.
   Yani "kırp ve yükle" diye bir yol yok, yanlara pay eklenmek *zorunda*.
   Çıktı tam **1350×2400 = 9:16**. Madem pay eklenecek, marka zeminine ve
   başlığa dönüştürülüyor.
2. **Alfa kanalı.** `screencap` 4 kanallı PNG üretiyor; Play alfasız
   24-bit istiyor. Burada bir tuzak var: `sharp`'ın `flatten()`'ı
   saydamlığı zemin rengiyle **doldurur ama kanalı kaldırmaz** — çıktı
   hâlâ RGBA yazılır. `removeAlpha()` de gerekiyor. Betiğin kendi
   uygunluk denetimi bunu yakaladı, yani denetim süs değil.

Durum ve gezinme çubukları kırpılıyor (`CROP_TOP`/`CROP_BOTTOM`); operatör
adı ve pil yüzdesi mağaza görselinde bilgi taşımıyor. **Bu iki sayı cihaza
özeldir** — başka bir telefonla çekilirse yeniden ölçülmeli.

> `assets/store/screenshots/` altındaki 6 kare Huawei'den alınmış **ham**
> görüntülerdir ve bu hatla üretilenler onların yerini alır. Silinmedi,
> ama mağazaya yüklenecek olan `store-ready/` çıktısıdır.

**Ekran görüntüsü çekim listesi** (sıra mağazada göründüğü sıradır — ilk iki
kare dönüşümün çoğunu belirler, en güçlü ikisi başa):

1. Keşfet akışı — ürünün farkı bu, önce o görünsün
2. Ana Sayfa — günlük meydan okuma + seri + favoriler
3. Akış Bağlantı — renkli, tek bakışta anlaşılır
4. Bulmaca Blokları — canvas efektleri en iyi burada görünüyor
5. Sudoku — en çok aranan başlık
6. Yılan — neon kimlik
7. Flappy UFO — arcade tarafı
8. Rozetler — ilerleme sistemi

---

## 5. İçerik derecelendirme anketi

Google'ın anketine verilecek cevaplar. **Hepsi HAYIR** dışında not düşülenler:

| Soru | Cevap | Gerekçe |
|---|---|---|
| Şiddet | Hayır | Bulmaca ve arcade; çatışma yok |
| Cinsellik | Hayır | — |
| Küfür / kaba dil | Hayır | — |
| Uyuşturucu / alkol / tütün | Hayır | — |
| Kumar (gerçek para) | **Hayır** | Elmas oyun içi para birimi; şans oyunu, bahis veya ödül çekilişi yok |
| Kullanıcılar arası etkileşim | **Hayır** | Sohbet, arkadaş, kullanıcı içeriği yok. Liderlik tablosu **yayında değil** |
| Konum paylaşımı | Hayır | Konum izni istenmiyor |
| Kişisel bilgi paylaşımı | Hayır | — |
| Dijital satın alma | **Evet** | Plus aboneliği + elmas paketleri |

Beklenen sonuç: **3+ / Herkes**.

---

## 6. Veri güvenliği formu (EN KRİTİK BÖLÜM)

Yanlış beyan ret sebebidir. Uygulama **beyan edildiğinden fazlasını topluyor**
görünmesin diye kritik nokta: AdMob SDK'sı birleştirilmiş manifest'e
`com.google.android.gms.permission.AD_ID` iznini **kendisi ekliyor**. Bizim
`AndroidManifest.xml`'imiz yalnızca `INTERNET` istese de reklam kimliği
toplanıyor sayılır.

### Paketteki izinler — 2026-08-12'de yüklenen AAB'den okundu

Play Console "11 izin" diyor. **Bizim `AndroidManifest.xml`'imizde yalnızca bir
tane var** (`INTERNET`); gerisini SDK'lar manifest birleştirme sırasında ekliyor.
Birleştirilmiş release manifestinden çıkarılan tam liste:

| İzin | Kaynak |
|---|---|
| `android.permission.INTERNET` | **bizim** |
| `com.google.android.gms.permission.AD_ID` | AdMob ← **veri güvenliği beyanını zorunlu kılan izin** |
| `android.permission.ACCESS_ADSERVICES_AD_ID` | AdMob (Privacy Sandbox) |
| `android.permission.ACCESS_ADSERVICES_ATTRIBUTION` | AdMob (Privacy Sandbox) |
| `android.permission.ACCESS_ADSERVICES_TOPICS` | AdMob (Privacy Sandbox) |
| `android.permission.ACCESS_NETWORK_STATE` | AdMob / Capacitor |
| `android.permission.WAKE_LOCK` | AdMob (video reklam ekranı açık tutar) |
| `android.permission.FOREGROUND_SERVICE` | eklenti |
| `com.android.vending.BILLING` | Play Faturalandırma (RevenueCat) |
| `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | AndroidX, otomatik üretilir |

**Hiçbiri "tehlikeli" (runtime) izin değil** — konum, kişiler, kamera, mikrofon,
depolama yok. Yani kullanıcıya çalışma anında hiçbir izin sorusu çıkmıyor ve
formda o kategorilerin hepsi "Hayır".

**Veri topluyor mu?** → **Evet**

| Veri türü | Toplanıyor | Paylaşılıyor | Amaç | Zorunlu mu |
|---|---|---|---|---|
| Cihaz veya diğer kimlikler (**Reklam kimliği**) | Evet | Evet | Reklamlar, analiz | Zorunlu |
| Satın alma geçmişi | Evet | Evet (RevenueCat) | Uygulama işlevi (abonelik durumu) | Zorunlu |
| Uygulama etkileşimleri | Evet | Evet | Reklamlar | Zorunlu |
| Kilitlenme günlükleri | Hayır | — | — | — |
| Ad, e-posta, konum, kişiler, fotoğraf, dosya | **Hayır** | — | — | — |

**Diğer form cevapları:**

- Veriler aktarım sırasında şifreleniyor mu? → **Evet** (tüm istekler HTTPS)
- Kullanıcı verisinin silinmesini isteyebilir mi? → **Evet**, gizlilik
  politikasındaki e-posta üzerinden
- Veriler cihazda mı işleniyor? → Oyun ilerlemesi, elmas, seri ve rozetler
  **yalnızca cihazda** (`localStorage`) tutuluyor, sunucuya gönderilmiyor

> **Not:** oyun ilerlemesi hiçbir sunucuya gitmediği için "toplanan veri"
> sayılmaz. Bu, formda beyan edilmemesi gereken bir şey — beyan etmek de en az
> eksik beyan kadar yanlış olur.

---

## 7. Diğer Play Console beyanları

| Alan | Cevap |
|---|---|
| Uygulama kategorisi | Oyunlar → Bulmaca |
| Etiketler | Bulmaca, Sıradan (Casual), Beyin Egzersizi |
| Reklam içeriyor mu? | **Evet** |
| Hedef kitle yaş aralığı | 13+ (reklam kimliği toplandığı için 13 altı hedeflenmiyor) |
| Çocuklara yönelik mi? | **Hayır** — "Aileler" programına dahil edilmeyecek |
| Web sitesi | `https://onur33360-dev.github.io` |
| Gizlilik politikası | `https://onur33360-dev.github.io/slyswipe/gizlilik.html` |
| E-posta | `onur33360@gmail.com` |

> **Web sitesi alanı ile `app-ads.txt`'in alan adı AYNI olmak zorunda.** AdMob
> tarayıcısı dosyayı mağaza kaydındaki adreste arar; farklı olurlarsa dosya
> bulunmaz ve doğrulama **sessizce** başarısız olur.

---

## 8. Ürünler (Play Console → Para kazanma)

**Sıra bağlayıcı: önce AAB bir track'e yüklenmeli, sonra ürünler açılabilir.**

Abonelikler — entitlement adı RevenueCat tarafında `plus` olmalı:

| Ürün kimliği | Süre |
|---|---|
| `plus_weekly` | 1 hafta |
| `plus_monthly` | 1 ay |
| `plus_yearly` | 1 yıl |

Tek seferlik ürünler (tüketilebilir):

| Ürün kimliği | Verilen elmas |
|---|---|
| `diamonds_100` | 100 |
| `diamonds_550` | 550 |
| `diamonds_1800` | 1800 |
| `diamonds_6500` | 6500 |

RevenueCat tarafında offering adı: **`default`**

> **Elmas miktarları koddan gelir, mağazadan değil.** Play Console'da bir ürünü
> yeniden adlandırmak oyunun elmas bakiyesini değiştirmemeli — mağaza
> **fiyatın** doğruluk kaynağıdır, ekonominin değil. Fiyat yazılı hiçbir yer
> yok; ulaşılamazsa nötr `—` gösterilir, eski bir fiyata asla düşülmez.

---

## 9. Yayın sırası ve açık riskler

1. AAB'yi **internal testing**'e yükle
2. Play'den kur → **logcat'ten dördüncü cihaz hash'ini oku**
3. `AD_TEST_DEVICES`'a ekle → yeni sürüm
4. Ürünleri oluştur → RevenueCat ↔ Play bağla → gerçek satın alma testi
5. Kapalı test: 12 test kullanıcısı, 14 gün kesintisiz
6. Üretim başvurusu

**Açık risk — Play App Signing.** Play paketi Google'ın anahtarıyla yeniden
imzalar, yani `AD_TEST_DEVICES`'ta olmayan **dördüncü** bir cihaz hash'i doğar.
Hash cihaza değil **imza anahtarına** bağlı (ölçüldü: aynı A51 üç farklı değer
üretti). O hash eklenene kadar **Play'den kurulmuş build'de reklama dokunma** —
kendi reklamına tıklamak geçersiz trafiktir ve AdMob hesabını askıya aldırabilir.

**Açık borç — gerçek satın alma hiç çalıştırılmadı.** Play Billing sideload
edilmiş APK'da çalışmıyor; Play track'i, Play'den kurulum, yüklenen anahtarla
imza ve lisans test hesabı gerekiyor. Teknik kısıt, atlanmış adım değil.
Lisans test hesabı: `onur33360@gmail.com`

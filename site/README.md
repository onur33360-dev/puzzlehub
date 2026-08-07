# site/ — SlySwipe'ın halka açık web sayfaları

Bu klasör **uygulamanın parçası değildir**. `tools/build-www.js` açık bir beyaz liste
kullandığı için buradaki dosyalar `www/`'ye ve APK'ya asla girmez. Burası, Google
Play'in ve AdMob'un istediği **herkese açık URL'lerin kaynağıdır**.

## Neden gerekli

| Dosya | Kim istiyor | Zorunlu mu |
|---|---|---|
| `slyswipe/gizlilik.html` | Google Play Console → Uygulama içeriği → Gizlilik politikası | **Evet.** Reklam kimliği (`AD_ID`) topladığımız için URL'siz sürüm reddedilir. |
| `app-ads.txt` | AdMob → Uygulamalar → app-ads.txt | Hayır, ama **şiddetle önerilir**: yetkisiz envanter satışını engeller ve bazı reklam verenler yalnızca doğrulanmış envantere teklif verir. |

## Durum: YAYINDA (2026-08-07)

Depo oluşturuldu ve Pages açık. İkisi de HTTP 200 doğrulandı:

- https://onur33360-dev.github.io/slyswipe/gizlilik.html
- https://onur33360-dev.github.io/app-ads.txt

**Bu klasör hâlâ kaynak.** Bir değişiklik yaptığında `onur33360-dev.github.io`
deposuna kopyalayıp push etmen gerekiyor — iki yer otomatik senkron değil.

## Yayınlama — GitHub Pages

Alan adı satın almadan çözülüyor. **Kullanıcı sitesi** (`<kullanıcı>.github.io`)
şart, proje sitesi değil: `app-ads.txt` alan adının **kökünde** olmak zorunda ve
proje sitesinde kök `/<repo>/` altına düşer.

1. `onur33360-dev` hesabında **`onur33360-dev.github.io`** adında **public** bir depo aç.
2. Bu klasörün içeriğini o deponun köküne kopyala:
   ```
   onur33360-dev.github.io/
   ├── app-ads.txt
   └── slyswipe/
       └── gizlilik.html
   ```
3. Push et. Pages kendiliğinden açılır (Settings → Pages → Source: `main` / root).

Ortaya çıkan URL'ler:

- Gizlilik politikası → `https://onur33360-dev.github.io/slyswipe/gizlilik.html`
- app-ads.txt → `https://onur33360-dev.github.io/app-ads.txt`

## Bu URL'ler nereye giriliyor

| Nereye | Ne |
|---|---|
| Play Console → Uygulama içeriği → Gizlilik politikası | gizlilik.html URL'i |
| Play Console → Mağaza kaydı → Web sitesi | `https://onur33360-dev.github.io` |
| AdMob → Uygulamalar → SlySwipe → app-ads.txt | aynı alan adı |

**Play'deki "Web sitesi" alanı ile app-ads.txt'in alan adı aynı olmalı** — AdMob
tarayıcısı app-ads.txt'i mağaza kaydındaki adreste arar. Farklı olurlarsa dosya
bulunmaz ve doğrulama sessizce başarısız olur.

## app-ads.txt içeriği

Tek satır yeter. `pub-...` kimliğini AdMob → Ayarlar → Hesap bilgileri'nden al
(`ca-app-pub-` ÖN EKİ OLMADAN — sadece `pub-` ile başlayan kısım):

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Sondaki `f08c47fec0942fa0` Google'ın sabit sertifika kimliğidir, değişmez.

## Güncelleme kuralı

Gizlilik politikası **uygulamanın gerçekte ne yaptığını** anlatmak zorundadır.
Yeni bir SDK, yeni bir ağ isteği veya yeni bir veri türü eklenirse bu sayfa **aynı
değişiklikte** güncellenir — `CLAUDE.md` §9'un aynı kuralı. Şu an sayfada listeli
üçüncü taraflar: Google AdMob, Google Play Faturalandırma, RevenueCat, Google Fonts,
Unsplash.

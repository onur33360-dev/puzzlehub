# assets/ — kaynak görseller ve üretim

Bu klasörde İKİ farklı şey var, karıştırılmamalı:

| Yol | Nedir | Yayına girer mi |
|---|---|---|
| `assets/logo.png` | **Kaynak** sanat eseri (1254×1254) — ikon üretiminin girdisi | ❌ hayır |
| `assets/icons/` | **Üretilmiş** web/PWA ikonları | ✅ evet — `sw.js` precache + `tools/build-www.js` SHIP listesi |

`build-www.js` yalnızca `assets/icons` alt klasörünü kopyaladığı için kökteki
`logo.png` APK'ya girmez. **SHIP listesini `'assets'` olarak genişletme** — o an
2 MB'lık kaynak sanat eseri APK'nın içine girer.

---

## Bu süreç tekrarlanacaksa: SIRA ÖNEMLİ

Aracın splash üretimi bizim elle hazırladığımız dosyaları **ezer**. Doğru sıra:

### 1) İkonlar — Easy Mode (araç üretir)

```
npx capacitor-assets generate --android \
  --iconBackgroundColor "#14142E" --splashBackgroundColor "#14142E"
```

Easy Mode yalnızca `assets/logo.png` ister. **Şartı:** `assets/` kökünde
`icon-only.png`, `icon-foreground.png`, `icon-background.png` veya `splash.png`
BULUNMAMALI — biri varsa araç Custom Mode'a düşer ve `logo.png`'yi görmez.

Ürettikleri (74 dosya): `mipmap-*/ic_launcher{,_round,_foreground,_background}.png`
ve adaptive icon tanımı. Güvenli alan ayrımını **araç kendi yapıyor** —
`ic_launcher.xml` içine `%16.7` inset koyuyor, elle uğraşmaya gerek yok.

### 2) Splash — elle üzerine yaz

Araç kendi splash'ini de üretir; onları **ez**. 10 dosya
(`drawable-{port,land}-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png`) elle
hazırlandı.

**Neden elle:** aracın splash üretimi genel şablon oranı (1.5) kullanıyor,
gerçek cihaz ekranıyla (Galaxy A51, 2.222) uyuşmuyor; otomatik üretim kırpınca
kompozisyonun büyük kısmı kayboluyor. Elle hazırlanan dosyalar kaynak görselin
kendi oranı cihaza çok yakın olduğu için (2.167) neredeyse hiç kırpılmadan
ölçeklendi.

`drawable-land-*` dosyaları kasıtlı düz `#14142E`: uygulama
`screenOrientation="portrait"` kilitli, o dosyalar hiç görünmüyor.

### 3) TUZAK — araç `-night-` ve `ldpi` klasörleri de açıyor

Easy Mode, daha önce var olmayan `drawable-night`, `drawable-{port,land}-night-*`
ve `drawable-{port,land}-ldpi` klasörlerini de üretiyor. **Karanlık moddaki bir
cihaz `-night-` sürümü seçer** — yani elle hazırlanan splash hiç görünmez.
Test cihazı zaten karanlık modda (`ui_night_mode=2`) ve bu tam olarak yaşandı.

Çözüm: bu klasörler **silindi**. Splash zaten koyu bir gece kompozisyonu, ayrı
bir açık/koyu tasarımı yok; kopyalamak APK'ya bedava ~8,8 MB daha eklerdi.
Araç her çalıştırıldığında bu klasörleri **yeniden üretir — tekrar sil.**

### 4) Web ikonları — elle (araç KULLANILMAZ)

`--android` bayrağı zorunlu. Bayraksız çalışırsa araç PWA modunu da açar ve web
manifest'ini `public/`, `src/`, `www/` sırasıyla arar — bizde **`www/manifest.json`'ı
bulup yeniden yazar.** `www/` üretilmiş çıktıdır: bir sonraki `npm run build` onu
siler, değişiklik depoya hiç ulaşmaz.

Bu yüzden web ikonları `sharp` ile elle üretiliyor (`sharp` zaten
`@capacitor/assets` ile birlikte geliyor):

| Dosya | Boyut | purpose | Not |
|---|---|---|---|
| `icon-192.png` | 192×192 | `any` | tam kadraj |
| `icon-512.png` | 512×512 | `any` | tam kadraj |
| `icon-maskable-512.png` | 512×512 | `maskable` | logo %78'e küçültülüp ortalandı |

Maskable dolgusu `#3d2950` — logonun **kendi köşe rengi** (örneklendi), böylece
dikiş görünmüyor. Launcher maskable ikonu daire/squircle'a kırpar ve yalnızca
içteki %80'lik daireyi garanti eder; bu yüzden ayrı dosya gerekiyor.

Üçü de `png({palette:true})` ile yazıldı: 512'lik dosya 474 KB → 92 KB.
Bantlama gözle kontrol edildi, ikon boyutunda fark yok. Bu dosyalar service
worker precache'inde, yani her sürüm bump'ında yeniden iniyor — boyut önemli.

Yeni bir dosya eklenirse **iki listeye birden** girmeli: `sw.js` içindeki
`SHELL_ASSETS` ve `tools/build-www.js` içindeki `SHIP`. `build-www.js` ikisini
çapraz doğruluyor ve ayrışırlarsa build'i durduruyor.

---

## Açılış ekranı mimarisi — ölçülmüş, tahmin değil

Hepsi Galaxy A51 / Android 13'te cihaz üzerinde doğrulandı.

### Android 12+ iki ayrı şeyi birden kırıyor

**1) Native tam ekran splash gösterilmiyor.** API 31'den beri açılış ekranı
platformun işi: sistem launcher ikonunu ortalar ve eski
`android:background="@drawable/splash"` yöntemini **yok sayar**. Aynısı
`@capacitor/splash-screen` için de geçerli — eklentinin `showOnLaunch()`
metodu API 31+'ta `androidx installSplashScreen`'e düşüyor
(`SplashScreen.java` → `showWithAndroid12API`), yani drawable'ı çizmiyor.
`launchShowDuration` 0 da 3000 de denendi; ikisinde de sahne çıkmadı.

**2) Eklentinin programatik `show()`'u da çizemiyor.** Varsayılan yolda
(`showDialog`) görsel şu view'in **arka planı** olarak atanıyor:

```java
new LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)
```

Yükseklik `WRAP_CONTENT` ve LinearLayout'un hiç çocuğu yok → yükseklik sıfır →
arka plan hiç çizilmiyor. `layoutName` ile tam ekran özel bir düzen de verildi
(APK'ya girdi, "Layout not found" uyarısı çıkmadı) — ekran yine düz kaldı.
Logcat `show`'un native tarafa ulaştığını ve hata dönmediğini gösteriyor.

### Çalışan çözüm: ikon eklentide, sahne DOM'da

Sahne **HTML katmanı** olarak çiziliyor (`index.html` → `#ph-splash`,
`assets/icons/splash-hero.jpg`). DOM tarafı her Android sürümünde sorunsuz.

Eklenti tek bir iş için duruyor: **ikon fazını tutmak.**
`launchAutoHide: false` ile sistemin ikon ekranı `hide()` çağrılana kadar
ekranda kalıyor. Sıra şu:

1. İkon ekranı durur (eklenti tutuyor)
2. Sahnenin görseli **gerçekten yüklenir ve boyanır** (`Image.onload` + çift `rAF`)
3. Ancak o zaman `SplashScreen.hide()` → ikon çekilir, altından sahne çıkar
4. Yükleme çubuğu 6000 ms'de %100 + uygulama hazır → sahne CSS ile söner → Ana Sayfa

Bu sıralamanın amacı **aradaki boş kabuk karesini yok etmek**. Eklenti
kullanılmasaydı ikon, WebView boyanmadan kalkar ve oyuncu bir an düz renk
görürdü — "iki kopuk ekran" şikâyetinin kaynağı buydu.

Çift `rAF` şart: `onload` görselin **çözüldüğünü** söyler, **çizildiğini**
değil. Tek karede bırakılırsa ikon, sahne boyanmadan kalkabilir.

Ayar noktaları `index.html`: `PH_SPLASH_TARGET_MS` (sahnenin sabit süresi ve
yükleme çubuğunun tam yolu — 6000 ms), `PH_SPLASH_MAX_MS` (emniyet supabı,
7500 ms). Süre hâlâ "en az": çubuk dolmuş ama uygulama hazır değilse çubuk
%100'de bekler.

### Android 11 ve altı

Orada eski yol hâlâ çalışıyor, bu yüzden 10 density dosyası duruyor.
`values-v31/styles.xml` yalnızca API 31+ için zemini `#14142E` yapıyor;
varsayılan siyahtı ve uygulamaya geçişte gözle görülür renk sıçraması vardı.

**Açık maliyet:** splash PNG'leri APK'yı 5,3 MB → ~14 MB çıkarıyor ve bu
ağırlığın tamamı Android ≤11 içindir; modern cihazlarda ölü yük. Kaldırılırsa
o sürümlerde yalnızca ikon+renk kalır. Ürün kararı — bkz. CLAUDE.md §5.

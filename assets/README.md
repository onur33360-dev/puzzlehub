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

## Android 12+ (API 31): tam ekran splash GÖSTERİLMİYOR

Ölçüldü, tahmin değil — Galaxy A51 / Android 13:

Android 12 ile acılış ekranı platformun işi oldu. Sistem launcher ikonunu
`windowSplashScreenBackground` üzerinde ortalar ve eski yöntemi
(`values/styles.xml` içindeki `android:background="@drawable/splash"`)
**tamamen yok sayar.** Yani yukarıdaki 10 splash dosyası yalnızca
**Android 11 ve altında** görünür.

`values-v31/styles.xml` bu platformda zemini `#14142E` yapıyor; varsayılan
siyahtı ve uygulamaya geçişte gözle görülür bir renk sıçraması oluyordu.

**Açık maliyet:** splash PNG'leri APK'yı 5,3 MB → 14 MB çıkardı ve bu ağırlığın
tamamı Android ≤11 içindir. Modern cihazlarda ölü yük. Bırakılıp
bırakılmayacağı ürün kararı — bkz. CLAUDE.md §5.

# assets/ — kaynak görseller ve üretim

Bu klasörde İKİ farklı şey var, karıştırılmamalı:

| Yol | Nedir | Yayına girer mi |
|---|---|---|
| `assets/icons/` | **Üretilmiş** web/PWA ikonları | ✅ evet — `sw.js` precache + `tools/build-www.js` SHIP listesi |
| `assets/*.png` (kök) | **Kaynak** sanat eserleri (@capacitor/assets girdisi) | ❌ hayır — SHIP listesi yalnızca `assets/icons` içeriyor |

Kaynak dosyaları klasörün köküne koymak `@capacitor/assets`'in varsayılan
davranışıdır (`assets/` → sonra `resources/` bakar). `build-www.js` yalnızca
`assets/icons` alt klasörünü kopyaladığı için 1024px kaynak görseller APK'ya
girmez. **SHIP listesini `'assets'` olarak genişletme** — o an bütün kaynak
sanat eseri APK'nın içine girer.

---

## Native ikon + splash üretimi

```
npm run assets:android
```

Beklenen kaynak dosyalar (Custom Mode):

```
assets/
├── icon-only.png        ≥ 1024×1024   → mipmap ic_launcher / ic_launcher_round
├── icon-foreground.png  ≥ 1024×1024   → adaptive icon ön plan (güvenli alan paylı)
├── icon-background.png  ≥ 1024×1024   → adaptive icon arka plan
└── splash.png           ≥ 2732×2732   → drawable-{port,land}-*/splash.png
```

Alternatif olarak tek bir `logo.png` ile Easy Mode kullanılabilir; o durumda
arka plan renkleri bayrakla verilir
(`--iconBackgroundColor`, `--splashBackgroundColor`).

### Neden `--android`, neden `generate` değil

Platform bayrağı verilmezse `@capacitor/assets` **PWA modunu da** çalıştırır ve
web app manifest'ini arar. Aradığı yerler sırayla `public/`, `src/`, `www/` —
yani bizde **`www/manifest.json`'ı bulup yeniden yazar.** `www/` üretilmiş
çıktıdır (bkz. CLAUDE.md §5): bir sonraki `npm run build` onu siler, yani
değişiklik sessizce kaybolur ve depo köküne hiç ulaşmaz. Bu yüzden komut
Android ile sınırlı; **kök `manifest.json` ve `assets/icons/` elle güncellenir.**

### Splash görselinin kırpılması

Android splash'i `AppTheme.NoActionBarLaunch` içinde `android:background` olarak
veriliyor (`res/values/styles.xml`), yani ekran oranına göre **kırpılıyor,
sığdırılmıyor**. Kompozisyonun taşıyıcı öğesi (logo/karakter) merkezde ve
kenarlardan pay bırakacak şekilde durmalı; kenara yakın her şey bazı cihazlarda
kesilir.

---

## Web/PWA ikonları — elle, ve şu an BOZUK

`assets/icons/icon-192.png` ve `icon-512.png` (2026-07-28 tespiti):

- ikisi de aslında **JPEG** (JFIF), `.png` uzantısıyla adlandırılmış
- **byte-byte aynı** dosyalar (388.362 B), ikisi de **1024×1024** —
  ne 192 ne 512
- toplam **758 KB** ve ikisi de service worker precache'inde: her `APP_VERSION`
  bump'ında yeniden iniyor
- `manifest.json` ikisini de `purpose: "any maskable"` ilan ediyor, ama JPEG'in
  **alfa kanalı yok**; maskable ikon launcher tarafından daire/squircle'a
  kırpılır ve yalnızca içteki ~%80 güvenli alan garantidir

Yeni logo geldiğinde üretilecekler:

- `icon-192.png` — gerçek PNG, 192×192, `purpose: "any"`
- `icon-512.png` — gerçek PNG, 512×512, `purpose: "any"`
- `icon-maskable-512.png` — güvenli alan paylı ayrı dosya, `purpose: "maskable"`

Yeni bir dosya eklenirse **iki listeye birden** girmeli: `sw.js` içindeki
`SHELL_ASSETS` ve `tools/build-www.js` içindeki `SHIP`. `build-www.js` ikisini
çapraz doğruluyor ve ayrışırlarsa build'i durduruyor.

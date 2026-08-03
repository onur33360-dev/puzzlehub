# ROADMAP

SlySwipe'ın sprint planı. `CLAUDE.md` "ne" ve "neden"i anlatır; bu dosya **sıradaki
işi** anlatır. Bir sprint bitince buradaki durumu güncelle — kod ile bu dosya
çelişirse kod haklıdır, dosyayı düzelt.

---

## Neden buradayız — Block performans hikâyesi

Block oyunu düşük/orta segment Android WebView'de oynanamayacak kadar kasıyordu.
Aylarca DOM/CSS optimizasyonu denendi (transform, rAF, preview, shadow, beam,
atmosphere, blur/filter azaltma, innerHTML azaltma, GPU profiling, gfxinfo,
overlay FPS ölçer). Ölçüm sonunda darboğazın **JS veya layout değil**, GPU
fill-rate + DOM compositing olduğunu gösterdi:

| Ölçüm (Galaxy A51) | Değer |
|---|---|
| Block sürükleme (DOM) | ~24 fps, kare medyanı 41.7ms, en kötü 209ms |
| Aynı anda ana iş parçacığı | **1.1ms** — yani thread boştaydı, GPU bekleniyordu |

Ana iş parçacığı boşken kare 41.7ms sürüyorsa, daha fazla JS/DOM optimizasyonu
bu duvarı yıkmaz. **DOM'da render çözünürlüğü düşürülemez** — 60fps'in tek
gerçek kaldıracı budur. Bu yüzden ağır oyunlar Canvas'a taşınıyor.

**Karar: DOM optimizasyonuna geri dönülmeyecek.** Ağır oyunlar Canvas + render-scale.

---

## Mimari

| Katman | Render |
|---|---|
| Home / Discover / İlerleme / Profile | DOM |
| **Ağır oyunlar** — Block, Water Sort | **Canvas** |
| Hafif oyunlar — Sudoku, Hafıza, Kelime, Labirent | DOM |

Yeni **ağır** oyunlar doğrudan Canvas mimarisiyle yazılır.
**Block bu sistemin referans implementasyonudur** — yeni bir canvas oyunu
yazarken önce Block'un renderer'ına bak.

Oyun mantığı ile render katmanı ayrı kalır. Canvas'a geçiş bir *render*
değişikliğidir; board durumu, yerleştirme, satır algılama, skor, combo ve
`{init, cleanup}` sözleşmesi değişmez.

---

## Sprint 1 — Canvas Block Renderer ✅

Board, ghost, preview, yerleştirme, satır temizleme. Efektler kapalı (temiz
render ölçümü için).

Kurulan üç kural (`CLAUDE.md` §5'te de yazılı, hepsi yük taşıyor):
1. **`touchmove` içinde çizim yok** — sadece durum + `requestPaint()`, çizim rAF'ta.
2. **Tüm board yeniden çizilmez** — yalnızca değişen/önizleme hücreleri.
3. **`RENDER_SCALE` kalır** — cihaza göre buffer çözünürlüğü (A5x → 0.8).

Ayrıca giriş düzeltmesi: grab dinleyicisi `.bp-slot`'a taşındı (`.bp-tp`
`scale(0)`'dan animasyonla girdiği için dokunma alanı bir süre SIFIRDI) ve
`locked` penceresindeki dokunuşlar artık düşmüyor, tamponlanıyor.

---

## Sprint 2 — Canvas Particle System ✅

Tüm patlama ve yerleştirme efektleri tek canvas FX katmanına + tek rAF
döngüsüne taşındı: shard, glow, flash, shockwave, sweep, glyph, stardust,
circle, contact sparks, rune pulse, dais discharge.

İlkeler:
- Parçacık yokken **döngü durur** (idle maliyeti sıfır).
- Gradyanlar **kare başına üretilmez**, bir kez küçük dokulara pişirilir.
- Parıltı `shadowBlur` ile değil, önceden üretilmiş **sprite** ile.
- Kristaller de sprite — `buildBoardCache` 64 karmaşık çizim yerine 64 blit.

| Ölçüm (A51, soğuk cihaz, aynı protokol) | Öncesi | Sonrası |
|---|---|---|
| Yerleştirme + patlama **p99** | 150ms | **89ms** (−41%) |
| Medyan | 32ms | 32ms |

Medyanın değişmemesi beklenen: değişiklikler sürekli maliyeti değil
**sıçramayı** hedefliyordu — hissedilen takılma da oydu.

Bu sprintte iki görsel hata da yakalandı ve düzeltildi:
- Işık sütunu canvas port'unda **sert kenarlı dikdörtgene** dönmüştü (DOM'da
  yumuşaklık `blur`/elips gradyandan geliyordu, canvas'ta tek eksende
  sönümlenen gradyan kullanılmıştı). Düzeltildi, sonra ürün kararıyla katman
  tamamen kapatıldı (fonksiyon duruyor, geri almak tek satır).
- Aynı sınıf hata `axisSweep`'te de vardı.

**Ders:** bir CSS efektini canvas'a taşırken gradyanın **kaç eksende**
sönümlendiğini koru. Tek eksende sönümlenen gradyan canvas'ta dikdörtgen
görünür; CSS'te çoğu zaman bir blur/maske onu gizliyordur.

**Ertelendi:** artımlı cache güncellemesi (yalnızca değişen hücreleri yeniden
çiz). Fikir saklı — Block oynanabilir seviyeye ulaştığı için getirisi düşük;
zaman görsel kaliteye ayrılıyor.

---

## Sprint 3 — Görsel Cila ✅ (kapandı; B geri alındı)

Amaç premium görünümdü. Sonuç: **görsel cila performansın önüne geçemez** —
bu sprintin asıl çıktısı bu kural oldu.

### A. Place Animation — yazıldı, sonra ürün kararıyla kapatıldı
`bpPlaceIn` tasarımı (düş `scale(1.14)` → ez `.93` → yayla `1.04` → otur,
280ms, hücre başına 12ms kademe) canvas'a taşındı. Gereksiz bulunup kapatıldı;
kod duruyor, geri almak tek satır (`placePiece` içindeki `commitCells`
çağrısını `fxPlaceIn` ile değiştir).

### B. Crystal Polish — GERİ ALINDI
İç parıltı + bevel + sparkle + dış glow eklendi; **dış glow komşu hücrelere
taşarak halo/"hayalet çerçeve" üretti ve fill-rate yedi.** Tamamı kaldırıldı,
sade sprite geri geldi.

**Kural (kalıcı):** bu renderer'da **glow / halo / light-bleed kullanılmaz.**
Premium his yalnızca **bevel + highlight + faset + sparkle**'dan gelir ve
hepsi **hücre sınırının içinde** kalır. Gelecek Crystal Polish sıfırdan,
bu kurala göre yazılacak.

### C. Explosion Polish — yapılmadı
Bunun yerine ölçümle bulunan gerçek maliyetler kesildi (aşağıya bak).

### Bu sprintte ölçümle bulunan ve kesilen maliyetler
- **`sceneFlash` artçısı** — tam ekranı 300ms boyunca dolduruyordu.
  A/B: flaş açık → yoğun p99 **113ms**; kapalı → **69ms**. Çekirdek (90ms,
  darbe karesi) korundu, artçı kapatıldı.
- **`bpNewPiece`'te `filter:brightness`** — tepsi her 3 yerleştirmede
  yenileniyor ve 27'ye kadar eleman 450ms filtre canlandırıyordu. Kaldırıldı.
- **Çift board cache kurulumu** — yerleştirme başına 2× 64 blit. `commitCells`
  ile artımlı hâle geldi (~9 blit).
- **Tepsi DOM kristalleri** → canvas sprite (yenileme başına 27 ağır DOM
  elemanı yerine 3 küçük canvas).
- **Hayalet tuvali** her tutuşta yeniden tahsis ediliyordu → yeniden kullanım.
- **`runePulse` / `daisDischarge`** kapatıldı (istenmeyen görsel + kare
  başına maliyet).

### Kritik hata: "hayalet çerçeve"
İki ayrı nedeni vardı:
1. **`touchcancel` dinlenmiyordu.** Android WebView sistem jesti devraldığında
   (kenar/geri jesti, bildirim çubuğu, ikinci parmak) `touchcancel` gönderir ve
   **`touchend` hiç gelmez** → sürükleme sonsuza kadar açık kalır → önizleme
   her karede yeniden çizilir → ekranda donmuş çerçeve. Scriptli testler her
   zaman `UP` gönderdiği için ölçümlerde asla görünmedi, yalnızca gerçek
   oynayışta çıktı. `touchcancel`/`pointercancel` + `visibilitychange`
   güvenlik ağı eklendi; iptal edilen sürükleme taşı tepsiye geri verir.
2. **Sprite dış parıltısının taşması** (yukarıda, B geri alımı).

3. **`commitCells` komşu hücrelerin kenarını siliyordu.** Artımlı cache
   güncellemesi her hücrenin *payandalı* kutusunu temizliyordu; payanda (~6px)
   hücreler arası boşluktan (3px) büyük olduğu için temizlik komşunun içine
   ~3px giriyordu. ±1 komşular yeniden çiziliyordu ama **±2 mesafedeki
   hücrelerin o şeridi silinip bir daha çizilmiyordu.** Soket yarı saydam
   olduğu için orada kaide görünüyor → konan taşı saran **daha açık ince bir
   çerçeve**. Kalınlığı `pad − GAP` olduğundan payanda küçültülünce inceliyor
   ama kaybolmuyordu. Düzeltme: yalnızca hücrenin kendi dikdörtgenini temizle
   (glow gittiği için sprite payandası zaten saydam).

**Dersler:**
- Girdi olaylarının **iptal yolu (cancel)** test edilmiyorsa, otomatik testler
  geçse bile gerçek cihazda kalıcı görsel bozulma üretebilir.
- **Ölçüm aracının kör noktası, kodun temiz olduğu yanılgısını üretebilir.**
  İlk doğrulama testi hücre değişimini yalnızca merkezî 104px'lik alanda
  ölçüyordu; bozulan şerit hücrenin *kenarındaydı*. "61 hücrede sıfır değişim"
  sonucu bu yüzden yanıltıcıydı. Bir ölçüm "temiz" diyorsa, önce ölçümün o
  bölgeyi gerçekten kapsayıp kapsamadığını doğrula.
- Kullanıcının **"aynı ama daha ince"** gözlemi kök nedeni verdi: artefaktın
  bir parametreyle *ölçeklenmesi*, o parametrenin suçlu olduğunu söyler.

---

## Block — DURUM: ÜRETİME HAZIR, GELİŞTİRME DURDU

Block artık "mükemmel" yapılmaya çalışılmayacak; stabil, akıcı ve üretime
hazır. Enerji Water Sort'a aktarılıyor. Block'a yalnızca **hata düzeltmesi**
yapılır — yeni görsel katman eklenmez.

Ölçüm (A51, SKIN mStatus=1): idle medyan 34ms / p99 48ms · yoğun yerleştirme
medyan 32ms / p90 40ms / p95 53ms · idle 60fps, board görsel olarak temiz.

---

## Sprint 4 — Water Sort → Canvas ✅ (KAPANDI, 2026-07-28)

İlk deneme **başarısız** kabul edildi: FPS hedeflenirken oyunun hissi bozulmuştu
(sıvı görünümü, döküş fizizği, cam kalınlığı gitti; tüpler ekran dışına taştı).
Kural konuldu ve uygulandı: **performans, oyunun hissini bozuyorsa başarısız
optimizasyondur. Önce doğru oyun, sonra hızlı oyun.**

Yeniden inşa edildi, DOM'un premium hissi birebir port edildi:

- **Üç bug:** hareket zarfı (padding'li canvas), `−h·sin θ` kompanzasyonu,
  ışınlanan sıvı (ara durum + kademeli drain + düşen akış).
- **Parite:** cam ağzı hacmi, havuz ışıması, menisküs, seam, yan speküler,
  sütun ışık örtüsü, neon-jel tonu (filtre yerine renge **pişirildi**),
  slosh (DOM'un kendi eğrileri — gecikme 3.64°/5.54°, aşım 1.49°),
  katman oturması, geçerli hedef nabzı, seçim ölçeği, olay-tetiklemeli sheen.
- **Perf:** sprite cache + incremental update + dirty region; idle **sıfır**.
- **Dokunma:** `click` → `pointerdown` + tampon (gecikme hissi çözüldü).

**Ölçüm (A51, gerçek koşul):** P90 **150 ms → 40 ms**, P99 200 → 48 ms,
üretilen kare +%80. Fark ortalamada değil **kuyrukta** — "ekran sürekli
yenileniyor" şikâyetinin kaynağı buydu. Tam tablo ve koşullar:
`docs/04_CANVAS_POLICY.md`.

**DOM renderer duruyor — legacy referans.** Geliştirme hedefi değil:
optimize edilmeyecek, genişletilmeyecek. Kritik regresyon çıkmadıkça
migration kapalıdır.

---

## Sprint 5 — Kabuk, marka ve açılış ✅ (KAPANDI, 2026-07-30)

Canvas hikâyesi kapandıktan sonra ilk kez **render dışı** bir sprint. Odak
kabuğun görünüşü ve uygulamanın "kurulmuş bir ürün" gibi açılması.

- **Kabuk paleti yenilendi**, üçüncü sekme SKORLAR → **İLERLEME** oldu.
  Sekmenin *anahtarı* hâlâ `lider` — içerik değişti, anahtar değişmedi;
  yeniden adlandırmak `switchTab`/`showScreen`/`__phHandleBack`'i aynı anda
  değiştirmek demek ve liderlik tablosunun akıbeti kararlaşmadan getirisi yok.
- **Ana Sayfa / İlerleme / Profil** sahibin mockup'ına birebir yeniden çizildi.
  Mockup henüz var olmayan sistemlerin sayılarını gösteriyordu; bunlar
  **bilerek statik** bırakıldı ve her biri kendini değiştirecek sistemi adıyla
  anan bir `TODO:` yorumu taşıyor. (Bu borcun büyük kısmı Sprint 7'de kapandı.)
- **Uygulama ikonu + açılış sahnesi** entegre edildi.

### Açılış ekranı — iki bağımsız engel

Android 12+ platformu açılış ekranını **kendisi** sahipleniyor ve
`android:background="@drawable/splash"` yok sayılıyor. `@capacitor/splash-screen`
de bundan kaçamıyor; üstelik plugin'in programatik `show()`'u da çizemiyor
(görsel, çocuğu olmayan `WRAP_CONTENT` bir layout'un arka planı olarak
veriliyor → yükseklik sıfır). İkisi de denendi ve ölçüldü.

**Çözüm ikiye bölündü:** sahne **HTML**'de (`#ph-splash`), plugin yalnızca
ikon fazını tutuyor (`launchAutoHide:false`). Sıra yük taşıyor — ikon tutulur →
sahne gerçekten **boyanır** (`onload` + **çift** rAF) → sonra `hide()`.
`onload` "çözüldü" demek, "çizildi" demek değil; tek kare sonra bırakılırsa
ikon sahneden önce kalkıyor ve "iki kopuk ekran" hissi doğuyor.

**Süre bilinçli olarak sabit 6 saniye** (`PH_SPLASH_TARGET_MS`), gerçek init
~586 ms. Bar bilerek bekliyor. İki özellik yük taşıyor: süre bir **alt sınır**
(bar bitmeden VE `__phAppReady` gelmeden kapanmıyor), ve `PH_SPLASH_MAX_MS`
(7500) zorla kapatırken barı **önce %100'e boyuyor** — yoksa bir script hatası
"donmuş animasyon" gibi görünürdü. Bar üssü 1.8; kübik 4.6 sn'de %99'a varıp
son 1.4 saniyeyi orada geçiriyor ve donmuş okunuyordu.

**Cihaz doğrulaması (A51, 2026-08-02):** sahne çiziliyor, bar %43 → %95 →
`width:100%`, kapanış **6877 ms** — yani `PH_SPLASH_MAX_MS` acil yolu
tetiklenmiyor, bar doğal olarak bitiyor.

**Ders (build):** `colors.xml` içindeki bir yorumda **çift tire** (`--`) APK
build'ini kırdı. XML yorumları `--` içeremez; hata mesajı bunu söylemiyor.

---

## Sprint 6 — Ekonomi ✅ (KAPANDI, 2026-07-31)

Reklam/IAP **teslimi** hâlâ sahte (3 saniyelik yapay overlay), ama etrafındaki
**kurallar gerçek** oldu. İkisini ayır: ödeme SDK'sı yazılmıyor, kurallar
dürüst tutuluyor.

- **Tek günlük reklam bütçesi** (`AdBudget`, 3/gün) — beş ödüllü aksiyonun
  hepsi aynı havuzdan yiyor. Aksiyon başına ayrı sayaç bilerek YOK: bütçeyi
  elmasa harcamak, elmas biriktirmeyi anlamlı kılan şeyin ta kendisi.
- **`runRewardedAction` tek kapı.** `showForDiamonds`/`showForContinue`
  bu yüzden **silindi** — `show()`'u doğrudan sarıyorlardı, yani bütçesiz yan
  kapılardı. `RewardedAd.show()` bu kapının dışından asla çağrılmaz.
- **Plus faydaları gerçek kod oldu**; +%50 çarpan yalnızca `addReward()`'da,
  `add()` çarpansız — abonelik oyun içi ilerlemeyi (seviye ödülü +3)
  hızlandırmıyor. "Erken Erişim" kaldırıldı: herkesi geciktirerek değer
  üretiyordu.
- Paylaşımlı **teklif modalı**; 2048'in kendi kopyası silindi. İki ayrı
  yazılmış teklif penceresi, "arayüz sınır diyor ama kod sınırsız veriyor"
  hatasının çıkış noktasıydı.

---

## Sprint 7 — İlerleme sistemleri ✅ (KAPANDI, 2026-08-01)

Üç katman, üçü de aynı disiplinle: **oyun-özel kod yok, mevcut sayaçlardan
türet, yeni takip yazma.**

- **`GameEvents`** — 10 oyun tek kapıdan raporluyor. `game_won`/`game_lost`
  yerine tek `game_ended` + `result` alanı; sebebi kaybetme durumu OLMAYAN
  oyunlar (o gün Water Sort) — ayrı olaylarla yarı-entegre görünürlerdi.
  Üç değişmez: en fazla bir açık tur, sahipsiz `game_ended` sayaçlara
  dokunmaz, reklamla devam turu **yeniden açar**, yeni tur saymaz.
- **`DailyQuests`** — üçüncü günlük-sıfırlanan sistem; `StreakSystem`/
  `AdBudget` desenini birebir kopyalıyor, çünkü "gün"ün üç ayrı tanımı gece
  yarısı desenkron olurdu. Günlük 45💎. Üçüncü görev "kişisel rekorunu
  geliştir"den **"1 oyun kazan"a** çevrildi: eskisi evrensel değildi (Arrow ve
  Jigsaw'da skor kavramı yok).
- **`Badges`** — beş evrensel rozet, 115💎. Yeniden giriş koruması yük
  taşıyor: ödeme `addReward()` → `add()` → `check()`'e geri dönüyor, çünkü
  elmas kazanmak da bir rozet koşulu.

### Bu sprintin iki dersi

- **Ödül harness'leri birbirini kirletir.** Rozetler eklenince 11 görev testi
  kırıldı; sebep kod değil, ikisinin de aynı olaylardan beslenip elmas
  ödemesiydi. Her araç artık diğerini "bitmiş" tohumluyor, görev aracı
  izolasyonun tuttuğunu ayrıca doğruluyor.
- **Bir testin kırılması iyi haber olabilir.** `game-events-test.js`
  "waterSort yalnızca 'won' yayınlar" iddiasını sabitliyordu; Sprint 8'de
  bilerek kırıldı ve kararı yeniden konuşturdu. Testin varlık sebebi buydu —
  silinmedi, gerekçesiyle güncellendi.

---

## Sprint 8 — Oyun tasarımı ve dayanıklılık ✅ (KAPANDI, 2026-08-02)

- **Water Sort hamle limiti** — oyunun **ilk kaybetme durumu**. Limit
  `5 × renk`, ve sayı ölçüldü: seviye başına 30 tahtanın gerçek optimali
  IDA* ile çıkarıldı (kabul edilebilir sezgisel: bir hamle toplam renk-koşusu
  sayısını en fazla 1 azaltır). Uyum neredeyse doğrusal (p90 ≈ 3.5 × renk),
  bu yüzden `5 × renk` her kademede sabit **1.47 × p90**. Tahta başına optimal
  çalışma zamanında denendi ve **reddedildi** — 8 renkte dakikalar sürüyor,
  seviye üretimi ana ipliği bloke ediyor (Arrow'un `staleMax` dersi).
  Yük taşıyan kural: **undo hamleyi iade etmez**; etseydi undo sınırsız ve
  ücretsiz olduğu için limit hiç dolmaz, kaybetme ekranı dekoratif kalırdı.
- **Jigsaw ağ bağımsızlığı** — ağ yokken 8/8 karo büyük-numara yedeğine
  düşüyordu. Üç denemeli geri çekilme *geçici* kesintiyi çözer, olmayan ağı
  çözmez. 6 görsel APK'ya gömüldü (~1.1 MB; APK 14.16 → 15.28 MB) ve yedek
  bir **zincire** dönüştü: uzak seçim üç denemeyi tüketirse yerel havuza
  düşülüyor, yani ilk altı değil **her** seviye ağsız hayatta kalıyor.

---

## Doğrulama altyapısı (Sprint 6-8'de oluştu)

`tools/` artık bir test takımı taşıyor — hepsi plain Node, sıfır bağımlılık,
`tools/dom-sandbox.js` üzerinde vm + DOM stub ile çalışıyor:

| Araç | Neyi koruyor |
|---|---|
| `game-events-test.js` | olay sözleşmesi, kaynak taraması, 10 oyunun canlı `init`'i |
| `daily-quests-test.js` | günlük sıfırlama, tek-ödeme, gece yarısı fixture'ı |
| `badges-test.js` | tek-seferlik ödeme, Plus çarpanı, yeniden giriş |
| `watersort-moves-test.js` | limit formülünün ölçümle tutarlılığı, devam ekonomisi |
| `jigsaw-images-test.js` | yerel havuz dosyaları + dağıtım sözleşmesi |
| `level-metrics.js` | Arrow seviye tasarımı (Sprint öncesi) |

Ortak desen: **katmanlardan biri her zaman kaynağı tarar.** "Oyun-özel kod
yok" ya da "bedel EconomyConfig'ten okunuyor" gibi mimari iddialar ancak
kaynağa bakarak kanıtlanır; çalışma zamanı testi bunları göremez.

---

## Sprint kapanış kuralı

Hiçbir sprint **push edilmeden** bırakılmaz. Sıra:

```
APK build → gerçek cihaz testi (Galaxy A51) → commit → push
```

Ölçüm yaparken **termal durum normalize EDİLMEZ** (2026-07-28'de değişti).
SlySwipe laboratuvar koşuluna değil gerçek oynanışa göre optimize ediliyor;
cihaz normal kullanımda throttling'e giriyorsa bu oyuncunun deneyiminin bir
parçasıdır ve sayıya dahildir. Throttled bir turu atma, soğutup tekrarlama —
`dumpsys thermalservice` değerini başta ve sonda **kaydet**, ve ortalamayı
değil **kuyruğu (P90/P95/P99)** raporla. Ayrıntı: `docs/03_PERFORMANCE_RULES.md`.

Tek istisna cihaz değil **ölçüm aracıdır**: uygulama içi FPS overlay kendi rAF
döngüsünü ve `backdrop-filter`'ını çalıştırdığı için ölçüm sırasında KAPALI
olmalı.

**Huawei Y6 adımı KAPSAM DIŞI (2026-08-02, sahip kararı).** Zincirde eskiden
ikinci bir cihaz testi vardı; o cihaz artık test için kullanılmıyor, dolayısıyla
kural tek cihaza (Galaxy A51) indirildi. Sprint 5-8'de Y6 testinin yapılmamış
olması bu yüzden **kapanmamış bir iş değil** — geriye dönük de kapsam dışı.
Y6'da yapılmış eski **ölçümler** geçerliliğini koruyor ve kod yorumlarında
duruyor (`components.css` blur/blend kayıtları, `games.js` `pickRenderScale`
zayıf-cihaz kademesi); onlar gerçekten alınmış sayılar ve düşük segment
bütçesinin gerekçesi — silinmedi, silinmemeli.

---

## Sıradaki — AdMob (gerçek ödüllü reklam)

Sahte 3 saniyelik overlay'in yerine gerçek SDK. Entegrasyon yüzeyi küçük,
çünkü Sprint 6 doğru kurulmuştu: **`runRewardedAction` tek kapı**,
`RewardedAd.show()` tek sahte parça. Bütçe, Plus muafiyeti ve
"tamamlanınca düş" kuralları DEĞİŞMEYECEK.

Baştan konulan kurallar:

1. **Kod boyunca yalnızca Google'ın resmî TEST reklam kimlikleri.** Gerçek
   birim kimlikleri hiçbir committe geçmeyecek. Geliştirme sırasında kendi
   gerçek birimlerini kullanmak geçersiz trafik sayılır ve hesabı askıya
   aldırabilir — test kimliklerinin varlık sebebi tam olarak bu.
2. **Gerçek kimlikler yayına çıkarken, ayrı ve son bir adımda** girilir.
3. **Geliştirme sırasında gerçek reklam tıklanmaz/tamamlanmaz.**
4. Plugin `@capacitor-community/admob@^7`'ye **sabitlenir.** npm varsayılan
   olarak Capacitor 8 isteyen bir majöre çözer; runtime Capacitor 7.
   `--force`/`--legacy-peer-deps` ile geçilmez — bu, splash-screen
   plugin'inde bir kez öğrenilmiş tuzağın aynısı.

Sahibin paralel yürüttüğü, kod tarafından bağımsız adımlar: AdMob hesabı,
uygulama kaydı, ödüllü birim, ödeme/vergi bilgileri, ve **kullanıcı rızası
(UMP/GDPR)** — sonuncusu SDK'dan ayrı bir iş.

**Bu faz öncekilerden farklı:** hatanın bedeli artık kodda kalmıyor, hesap
askıya alınmasına kadar gidebiliyor.

---

## Sprint 9 — reklam hacmi: bütçe 8'e, geçiş reklamı devrede (2026-08-02)

Araştırmaya dayalı iki karar. İkisi de reklam **hacmini** artırıyor, ama
farklı eksenlerde ve bilerek birbirine bağlanmadan.

**1. `AD_DAILY_LIMIT` 3 → 8.** Sabit `EconomyConfig` ile birlikte doğmuş
(`0e68322`) ve o günden beri hiç değişmemişti; **hiçbir zaman 5 olmadı**
(`git log -S` ile doğrulandı — hafızadaki 5 yanlıştı, kayıt bu yüzden
tutuluyor). Beş aksiyon tek havuzu paylaştığı için 3 hak, iki devam-et'ten
sonra oyuncuya elmas dışında seçenek bırakmıyordu: o boyutta havuz "seçim"
değil "kıtlık" oluyor. Güncellenecek metin çıkmadı, çünkü her yüzey zaten
`AdBudget.label()` okuyor.

**2. `InterstitialAds` — ödülsüz tam ekran reklam.** Tasarımın tamamı bir
sıklık kapağı: **3 dakika VE 3 tur bitişi**, ikisi birden. Eşikler bu depoda
ÖLÇÜLMEDİ — sahibin sektör araştırmasından geliyor (daha sık bir kadans
klasik D7-retention katili), ve bu ayrım kayda geçiriliyor ki ileride Su
Sıralama hamle limiti gibi ölçülmüş bir sayı sanılmasın.

Faz 6'nın (AdMob) doğru kurulmuş olması burada da işe yaradı: rıza kapısı,
SDK init'i ve test-kimliği disiplini aynen yeniden kullanıldı, yalnızca
format değişti. Yeni olan tek şey "ne zaman" sorusu.

Sınırın dışındaki dört kural — gerekçeleri CLAUDE.md §5'te:
`maybeShow`'un **tek çağrı yeri `exitGame()`** (açılış ve oyun-içi yasakları
bayrakla değil yapıyla korunuyor), **Keşfet muafiyeti** (sınırlara bakılmadan,
sayaç sıfırlanmadan), **ödüllü reklam sonrası zamanlayıcı sıfırlama**, ve
**Premium'da hiç**.

`tools/interstitial-test.js` (68 doğrulama) kardeş araçların dört katmanını
izliyor. En değerli iki iddiası koda değil gerekçeye ait: her eksenin **tek
başına** engellediği, ve Keşfet muafiyetinin sayacı **tüketmediği**.

**Cihaz doğrulaması TAMAM** (A51, APK 1.42.0, gerçek AdMob test birimi). İki
tur sonrası reklam yok; üçüncü çıkışta gerçek interstitial açıldı ve kapanınca
sayaç sıfırlandı. Kritik olan iki eksen kanıtı: **3 tur tamam ama 27 saniye**
geçmişken reklam gelmedi, 227 saniye sonra geldi. Ödüllü reklam tamamlanınca
zamanlayıcı sıfırlandı (elmas 30→40, bütçe 7/8, tur sayacı bozulmadan) ve
hemen ardındaki gerçek çıkışta reklam çıkmadı. Premium'da 12 tur boyunca hiç.
Muafiyetin A/B kanıtı: **aynı sayaç durumunda** Keşfet çıkışı reklamsız ve
sayaç korunmuş, Ana Sayfa çıkışı reklamlı.

---

## Sprint 10 — RevenueCat: gerçek satın alma, mağazadan fiyat (2026-08-02)

`purchasePlus()` bir toast'tı, `buyPackage()` da öyle. Artık ikisi de gerçek
satın alma akışını çağırıyor; fiyatlar **mağazadan** geliyor.

**Sürüm tuzağı üçüncü kez.** `@revenuecat/purchases-capacitor` varsayılanı
(13.x) Capacitor 8 istiyor, bizde 7 var → **`^11` hattına sabitlendi** (11.3.2).
splash-screen ve AdMob'da aynısı yaşandığı için artık bu bir kural sayılmalı:
yeni bir Capacitor eklentisi kurulurken peer bağımlılığı ÖNCE bakılır.

**Merkezî karar: `isActive()` senkron kaldı.** 14 çağrı yeri var ve dördü
senkron sözleşmeli sistemlerin içinde (`AdBudget.canWatch`,
`InterstitialAds.canShow`, `DiamondSystem.addReward`, `runRewardedAction`).
Asenkrona çevirmek o dört sistemi ve dört harness'ı da yeniden yazmak
olurdu. Bunun yerine `AdConsent`'te kurulan biçim: **asenkron kaynak, senkron
okuyucu**. Sonuç: değişen çağrı yeri 0, kırılan harness 0.

**Fiyatlar koddan tamamen çıktı.** `index.html`'deki üç `₺` ve
`DIAMOND_PACKAGES`'taki dört `price` alanı silindi; `data-ph-price` sözleşmesi
(`data-ph-avatar` ailesinin devamı) dolduruyor. Yıllık kartın "aylığa vurulmuş
fiyat + tasarruf %" satırı bile **türetiliyor**. Mağazaya ulaşılamazsa nötr `—`
gösteriliyor; eski sabit fiyata ASLA düşülmüyor.

Elmas miktarları kodda kaldı: mağaza **fiyatın** doğruluk kaynağı, ekonominin
değil. Satın alınan elmasa Plus çarpanı uygulanmıyor (`add()`, `addReward()`
değil) — aynı paranın karşılığı aboneye farklı olsaydı mağazadaki sayı yalan
söylerdi.

**Cihaz doğrulaması — yapılabilenler yapıldı, gerçek satın alma BORÇ.**
Play Billing sideload edilmiş debug APK'da çalışmıyor: Play track'i, Play'den
kurulum, yüklenen anahtarla imza ve lisans test hesabı gerekiyor. Bu gerçek
bir teknik kısıt, atlanmış bir adım değil — ama kapanmamış bir iş, ve Play
Console kurulumu + imzalı AAB'den sonra ayrı bir turda yapılacak.
Lisans test hesabı: **onur33360@gmail.com**.

Cihazda (A51, 1.43.0) doğrulananlar: eklenti `Capacitor.Plugins.Purchases`
olarak erişilebiliyor (paketleyicisiz desen), anahtar boşken uygulama normal
çalışıyor, üç plan da `—` gösteriyor (bayat fiyat yok), geri yükleme satırı
yerinde, ve mağaza biçiminde bir hak `_setFromStore`'a verildiğinde Premium
faydalarının hepsi tetikleniyor (bütçe bypass, interstitial susuyor, tema
açılıyor, `addReward` 10→15 iken `add` 10 kalıyor).

**Play Console erişimi mevcut (2026-08-03).** Uygulama sahibi, Play Console'a
yetkili kullanıcı olarak ekli; ürünleri açmak, lisans test kullanıcısı
tanımlamak, RevenueCat ↔ Play bağlantısını (Google Play Developer API servis
hesabı) kurmak ve internal testing track'e yükleme yapmak için **üçüncü bir
kişiden onay/erişim beklemek gerekmiyor.** Kayda geçiriliyor çünkü bir süre
belirsizdi ve "önce erişim isteyelim" diye yanlış bir sıra kurulabilirdi:
sandbox testinin önündeki tek engel Play kurulumunun kendisi, izin değil.

Kalan eksikler:
1. ~~**RevenueCat API anahtarı**~~ — **girildi 2026-08-03**, `goog_OTM…`.
2. **Play Console ürünleri**: `plus_weekly` / `plus_monthly` / `plus_yearly`
   (entitlement `plus`), `diamonds_100` / `diamonds_550` / `diamonds_1800` /
   `diamonds_6500`, offering `default`. **Henüz oluşturulmadı** — sahip,
   AAB internal testing'e yüklendikten sonra oluşturacak.
3. ~~**İmzalı AAB**~~ — **üretildi 2026-08-03** (`bundleRelease`, `CN=Skyroon
   Labs` upload key'iyle imzalı, 19.5 MB). **Yüklenmedi.**

---

## Sprint 11 — Marka: PuzzleHub → SlySwipe (2026-08-03)

**Neden şimdi:** paket kimliği Play Console'a ilk yükleme yapıldığı anda
**kalıcı** hale gelir, bir daha asla değişmez. Uygulama henüz hiç
kaydedilmemişti — yani bu iş için son fırsat buydu. Sıra kasıtlı: rebrand
bitmeden Play Console'a hiçbir kayıt/yükleme yapılmadı.

`com.puzzlehub.app` → **`com.skyroonlabs.slyswipe`**, "PuzzleHub" → **"SlySwipe"**.

**Paket kimliği dört yerde ve dördü birden değişmek zorunda:**
`capacitor.config.json` (`appId`), `android/app/build.gradle` (`namespace` **ve**
`applicationId` — ayrı iki anahtar, biri diğerinden türemiyor),
`res/values/strings.xml` (`package_name` + `custom_url_scheme`) ve **java kaynak
dizininin kendisi** (`java/com/puzzlehub/app/` → `java/com/skyroonlabs/slyswipe/`,
gerçek `git mv` + `MainActivity.java`'daki `package` satırı).
`AndroidManifest.xml` elle düzenlenmedi: `.MainActivity` `namespace`'e göreli,
FileProvider yetkilisi de `${applicationId}` — ikisi de kendiliğinden takip etti.

**İsim 42 dosyada değişti**, ama iki şeye kasıtlı DOKUNULMADI:
- `PuzzleGames`, `blockPuzzle` gibi tanımlayıcılar **motor isimlendirmesidir**,
  marka değil.
- `ph_` localStorage öneki duruyor. Yeniden adlandırmak mevcut her oyuncunun
  elmasını, serisini, rozetlerini ve Plus anlık görüntüsünü öksüz bırakırdı —
  `gh_` önekiyle aynı kural, göç planı olmadan olmaz.

Ürün kimlikleri (`plus_*`, `diamonds_*`) ve AdMob test birimleri paket
kimliğinden bağımsız; el sürülmedi.

**Splash: asıl tuzak.** Görsel 11 dosyada duruyor ama modern telefonun
gerçekten gösterdiği tek dosya `assets/icons/splash-hero.jpg` (DOM sahnesi).
10 density PNG'si yalnızca Android ≤11'e ulaşıyor — yani sadece onları
değiştirmek "bitti" gibi görünür ve test cihazında hiçbir şeyi değiştirmez.
Sahibin gönderdiği 5 portre PNG'si yerine kondu, `splash-hero.jpg` xxxhdpi'den
`sharp` ile yeniden üretildi (852×1846, `quality:86, mozjpeg` ≈ 171 KB —
dosya SW precache'inde, boyut her sürüm bump'ında yeniden iniyor).
Uygulama ikonu değişmedi; `🧩` amblemi ve `<title>`'daki `🧩` de şimdilik duruyor
(yeni "S" kimliğiyle kalıp kalmayacağı ürün kararı, arama-değiştirme işi değil).

`APP_VERSION` 1.43.0 → **1.44.0** (splash-hero.jpg aynı isimle değiştiği için
bump zorunlu, yoksa web kullanıcısı eski PUZZLEHUB sahnesini görmeye devam eder).

Doğrulama: `npm run build` geçti, 8 Node harness'ının tamamı geçti, debug APK
üretildi ve `output-metadata.json` `applicationId: com.skyroonlabs.slyswipe`
diyor.

---

## Sprint 12 — Release imzası + RevenueCat anahtarı (2026-08-03)

Play Console'da SlySwipe oluşturuldu (`com.skyroonlabs.slyswipe`), gerçek
RevenueCat public SDK anahtarı `core/app.js`'e girildi, upload key üretildi
ve **ilk imzalı AAB çıktı**: `android/app/build/outputs/bundle/release/app-release.aab`.

**Anahtar ve şifre depo dışında.** Gradle `android/keystore.properties`
okuyor; dosya yoksa release imzasız derleniyor ve `assembleDebug` etkilenmiyor
(doğrulandı). `.gitignore`'a AYRI bir satır gerekti: `*.jks` anahtarın
kendisini tutuyordu ama şifre dosyasının uzantısı `.properties`, o desene
takılmıyordu — dört şifre commit'e girebilirdi.

**RC anahtarı ise BİLEREK depoda.** `AD_IDS` kuralının tersi: `goog_...`
public SDK anahtarı istemciye gömülmek üzere üretiliyor ve tek başına yetki
vermiyor (doğrulama Google'ın sunucusunda).

**`iap-test.js`'in iki iddiası kırıldı ve ikisi de ÇEVRİLDİ, silinmedi:**
1. *"anahtar depoda boş + TODO işaretli"* → **"anahtar `goog_` public
   anahtarı"** + yeni bir iddia: **`sk_` SECRET anahtarı depoda YOK**.
   RevenueCat'in iki anahtarı da "anahtar" diye anılıyor; `sk_` REST API'ye
   tam yetki veriyor (abonelik verir, iade eder, müşteri siler) ve bir APK'ya
   girerse sızmış sayılır. Kopyala-yapıştır hatasıyla karışabilirler, artık
   harness yakalıyor.
2. *"anahtar boşken configure çağrılmadı"* — bu bir **harness kurgu
   hatasıydı**. `apiKey:false` yalnızca override'ı atlıyor, yani deponun
   sabitinin boş olmasına bel bağlıyordu; sabit dolunca "anahtarsız" senaryosu
   gerçek anahtarla koştu. Artık iki yön de açıkça enjekte ediliyor —
   test kodun davranışını ölçüyor, deponun o anki sabitini değil.

**Ürünler henüz yok, offerings boş dönecek — beklenen davranış.**
`loadOfferings` bunu zaten karşılıyor (`if (!off || !off.availablePackages)
return null`), fiyatlar nötr `—` gösteriyor. Sahip ürünleri yüklemeden sonra
oluşturacak.

`APP_VERSION` 1.44.0 → **1.45.0**. `versionCode` **1**, `versionName` **1.0**
— ilk yükleme için yeterli, ama **her yeni yüklemede `versionCode` artmalı**
(`android/app/build.gradle`), yoksa Play reddeder.

---

## Hedef

Sadece yüksek FPS değil:

- Premium görünüm
- Stabil performans
- Temiz mimari
- **Yeniden kullanılabilir Canvas altyapısı** — her yeni ağır oyun bunu kullanır

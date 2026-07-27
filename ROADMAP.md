# ROADMAP

PuzzleHub'ın sprint planı. `CLAUDE.md` "ne" ve "neden"i anlatır; bu dosya **sıradaki
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
| Home / Discover / Leaderboard / Profile | DOM |
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

## Sprint 4 — Water Sort → Canvas (SIRADAKİ)

Mevcut darboğaz: blur, filter, compositing, cam efektleri, sıvı animasyonu.
Ölçülen davranış: döküşte ~46fps'e düşüyor, en kötü kare 117ms; UI iş parçacığı
ile GPU birebir aynı sürüyor (sync-blocked) → yine fill-rate.

Block'ta kurulan altyapı (FX katmanı, doku önbelleği, render-scale, sprite'lar)
yeniden kullanılacak.

---

## Sprint kapanış kuralı

Hiçbir sprint **push edilmeden** bırakılmaz. Sıra:

```
APK build → gerçek cihaz testi → Huawei Y6 testi → commit → push
```

Ölçüm yaparken: **sıcak cihazda karşılaştırma geçersizdir.**
`dumpsys thermalservice` → `mName=SKIN` / `mStatus` ≥ 1 ise throttling var.
Her zaman **aynı termal durumda idle baz çizgisi** al ve farkı karşılaştır,
mutlak sayıyı değil.

---

## Hedef

Sadece yüksek FPS değil:

- Premium görünüm
- Stabil performans
- Temiz mimari
- **Yeniden kullanılabilir Canvas altyapısı** — her yeni ağır oyun bunu kullanır

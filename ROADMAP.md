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

## Sprint 3 — Görsel Cila (AKTİF)

Amaç: Canvas Block Renderer'ın **premium görünümü**. Performans ikinci planda,
ama **performans bütçesi korunur: yeni blur/filter eklenmez.**

### A. Place Animation ← şu an burada
Blok şu an aniden oturuyor. Yeni davranış: **Drop → Compress → Settle**.
(DOM'daki `bpPlaceIn` tasarımı referans: yukarıdan gel `-9px scale(1.14)` →
çarpınca ez `scale(.93)` → yaylan `scale(1.04)` → otur; 280ms, hücre başına
12ms kademe.)

### B. Crystal Polish
Sprite sistemi korunur. Eklenecek: iç parıltı, hafif bevel, küçük sparkle,
ince highlight.

### C. Explosion Polish
Shard, glow, flash, shockwave iyileştirilir — performansı bozmadan.

### D. Kod Kalitesi
Renderer temiz kalır, render ile oyun mantığı ayrı kalır, **oyun mantığı
değiştirilmez.**

---

## Sprint 4 — Water Sort → Canvas

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

# Yerelleştirme — Cihaz QA Kontrol Listesi

**Bu liste otomatik testlerin YERİNE geçmez, onların GÖREMEDİĞİNİ
kapsar.** Node harness'ları 4500 tahta üretip sıfır hata buldu; hiçbiri
bir Devanagari matrasının hücreden taştığını ya da bir Arapça harfin
yanlış biçimde çizildiğini göremez. Bu depoda zaten kayıtlı bir ders
var: *"yeşil bir ölçüm, çizilmiş bir ekran değildir — birine bak."*
Arapça ekran görüntüleri, ölçümün bulamadığı beş hatayı bulmuştu.

**Cihaz:** Galaxy A51 (Android 13, 384 CSS px) birincil.
İkincil: Huawei P20 Lite (360 px) — dar uç.
Tablet **yok** ve bu bilinen bir boşluk (bkz. CLAUDE.md, API 36 notu).

Dil değiştirme yolu: **Profil → Tercihler → Dil**.

---

## A. Kelime Avı — beş yüksek riskli yazı sistemi

Her biri için ayrı ayrı: `ar`, `ja`, `hi`, `ko`, `zh-Hans`.

### A1. Izgara okunabilirliği
- [ ] Her hücrede **tek bir görsel harf** var; yarım harf / kutu (tofu) yok.
- [ ] Harfler hücre sınırını **taşmıyor** — özellikle `hi`: matra
      (ि ी ू ै ौ) taban çizgisinin üstüne ve altına çıkar.
- [ ] 12×12 ızgarada harfler hâlâ okunuyor (en küçük hücre boyu).
- [ ] `zh-Hans` ızgarası 10×10'da kalıyor (Han hücreleri geniş; `sizeCap`).
- [ ] `ar` harfleri **yalın (isolated) biçimde** çiziliyor ve bu kabul
      edilebilir görünüyor. → **Arapça okuyan biri onaylamalı.**
- [ ] `ko` hece blokları tek hücrede tam çiziliyor (NFD'ye ayrılmış
      görünüm yok).

### A2. Sürükleme seçimi — mekanik korunmuş mu
Her dilde en az bir kez:
- [ ] İlk harfe bas → sürükle → **canlı vurgu** parmakla birlikte geliyor.
- [ ] Bırak → doğru kelime **kalıcı yeşil**, çip üstü çiziliyor.
- [ ] Yanlış seçim sessizce **sıfırlanıyor** (uyarı penceresi yok).
- [ ] **Yatay** bulundu.
- [ ] **Dikey** bulundu.
- [ ] **Çapraz** bulundu.
- [ ] **Ters** okuma bulundu (sağdan sola / aşağıdan yukarı).
      → `hi` için ZORUNLU: code-point hatası tam burada patlıyordu.
- [ ] Hedefin biraz **dışında** bırakma yine doğru hücrelere kilitleniyor.
- [ ] Parmak ızgaranın dışına çıkıp geri gelince seçim bozulmuyor.
- [ ] Sistem jesti (kenardan kaydırma) seçimi **asılı bırakmıyor**
      (`pointercancel` yolu).

### A3. Seviye ilerlemesi
- [ ] Tüm kelimeler bulununca seviye **otomatik** ilerliyor.
- [ ] Yeni tahta **aynı dilde** yeni kelimelerle geliyor.
- [ ] Skor **korunuyor** (sıfırlanmıyor).
- [ ] Arka arkaya 3-4 seviyede **aynı kelime tekrarlanmıyor**.

---

## B. Oyun ortasında dil değişimi

Kelime Avı **açıkken**, seviye 5+ ve skor 0'dan büyükken:

- [ ] `tr` → `ja`: **seviye korunuyor**.
- [ ] `tr` → `ja`: **skor korunuyor**.
- [ ] Tahta yeni dilin kelimeleriyle **yeniden kuruluyor**.
- [ ] Eski dilde bulunmuş kelimeler yeni tahtaya **taşınmıyor**
      (taşınmaya çalışılması hata olurdu — "DENİZ" ile "OCEAN" arasında
      oyuncunun emeğini taşıyan bir ilişki yok).
- [ ] Oyun başlığı yeni dilde.
- [ ] `ja` → `ar`: aynısı + düzen RTL'e geçiyor, **tahta LTR kalıyor**.
- [ ] Uygulamayı kapatıp açınca seçilen dil **hatırlanıyor**.
- [ ] "Sistem Varsayılanı"na dönünce cihaz diline geri dönüyor.

**Diğer oyunlarda dil değişimi durumu bozmamalı:**
- [ ] Yılan oynarken dil değiştir → yılan ölmüyor, skor duruyor.
- [ ] 2048 oynarken dil değiştir → tahta duruyor.
- [ ] Su Sıralama seviyesi ortasında dil değiştir → hamle sayacı duruyor.

---

## C. Keşfet — jest çakışması ve performans

- [ ] Akış dikey kaydırma **akıcı** (kart kurulumu takılma yapmıyor).
- [ ] Kelime Avı önizleme kartı **aktif dilin** kelimelerini gösteriyor.
- [ ] Önizleme kartı üzerinde parmak kaydırınca **akış kayıyor**
      (önizleme dekoratif, girdi almıyor — jest çalmamalı).
- [ ] Akış Bağlantı kartı hâlâ **kendi tahtasında** çalışıyor ve
      etrafında akış kayıyor (bu kart girdi ALIYOR — ayrım korunmalı).
- [ ] Dil değiştirince Keşfet kartları yeni dilde **yeniden çiziliyor**.
- [ ] Kategori çipleri (`Bulmaca` / `Arcade` / `Favoriler`) çevrilmiş.
- [ ] Kart CTA'sı, zorluk rozeti, "En iyi: N" satırı çevrilmiş.
- [ ] `ar`'da çipler ve kart metni sağa hizalı, **demo alanı LTR**.

---

## D. Arayüz — taşma ve yön

Üç ekranda (Ana Sayfa, Rozetler, Profil), en dar cihazda:

- [ ] `de` — hiçbir düğme/kart metni **kırpılmıyor**.
- [ ] `ru` — aynısı. Başlıklar Outfit yerine Inter'e düşüyor
      (**beklenen**, tofu değil — bkz. bilinen riskler).
- [ ] `pl` — aynısı.
- [ ] `hi` — satır yüksekliği Latin'den fazla; kartlar **büyüyor**,
      metin kesilmiyor.
- [ ] `ar` — üst bar, geri oku, ayar satırları, alt sekmeler **aynalı**.
- [ ] `ar` — sayılar ve `%` işareti doğru tarafta.
- [ ] Sistem yazı tipi boyutu **%130**'a alınınca hiçbir dilde kırpılma yok.

---

## E. Ekonomi ve satın alma (dil değişimi bunları bozmamalı)

- [ ] Elmas bakiyesi dil değişiminde **değişmiyor**.
- [ ] Skor biçimi uygulama diline uyuyor (`tr` 1.234.567 · `en` 1,234,567
      · `hi` 12,34,567) — **cihaz diline değil**.
- [ ] Mağazada fiyatlar Play'den geliyor, metinde **sabit fiyat yok**.
- [ ] "Popüler" / "En İyi" rozetleri her dilde **vurgulu** çıkıyor
      (bunlar bir zamanlar metinle karşılaştırılıyordu; kimliğe çevrildi).
- [ ] Ödüllü reklam akışı çevrilmiş ve ödül **bir kez** veriliyor.
- [ ] Plus sayfası, günlük ödül, rozet açılış animasyonu çevrilmiş.

---

## F. Android 13+ uygulama başına dil

- [ ] **Ayarlar → Uygulamalar → SlySwipe → Dil** listesinde 15 dil
      görünüyor (`locales_config.xml`).
- [ ] Oradan seçilen dil uygulamada geçerli oluyor.
- [ ] Uygulama içi manuel seçim varken sistem seçimi onu **ezmiyor**.
- [ ] Uygulama arka plandayken sistem dili değişirse, öne gelince
      "Sistem Varsayılanı" modundaysa **takip ediyor**.

---

## G. Çevrimdışı ve soğuk açılış

- [ ] Uçak modunda açılış: arayüz **çevrili** geliyor
      (aktif locale `SHELL_CACHE`'te).
- [ ] Uçak modunda Kelime Avı: tahta **aktif dilde** kuruluyor.
- [ ] İlk kurulumda cihaz dili `de` ise uygulama **Almanca** açılıyor.
- [ ] Cihaz dili Fince ise **İngilizce** açılıyor (yedek).
- [ ] Cihaz dili `zh-TW` ise **İngilizce** açılıyor — Basitleştirilmiş
      Çince DEĞİL (Geleneksel okuyucuya Basitleştirilmiş göstermek hata).

---

## Bir hata bulunca

Hangi dil, hangi ekran, hangi cihaz, ekran görüntüsü. Yazı sistemine
özgü hatalar tek bir ekran görüntüsüyle anlaşılır; "Hintçe'de bozuk
görünüyor" anlaşılmaz.

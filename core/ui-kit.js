// ============================================
// PuzzleHub — Paylaşımlı UI Davranışları (ui-kit.js)
// docs/DESIGN_SYSTEM.md §20.3'ün JS karşılığı.
// Bu dosya sadece DAVRANIŞ içerir — görsel tanımlar
// core/design-tokens.css (keyframe'ler) ve core/components.css
// (tetiklenen sınıflar) içinde yaşıyor. GameAudio, games.js'te
// tanımlı global bir singleton olduğu için bu dosya games.js'ten
// SONRA yüklenmelidir (index.html'deki loadScript zincirine bakın).
//
// TÜKETİCİLER: Water Sort (phStaggerIn, phParticleBurst, phFloatText,
// phShake, phShowCelebration), Block Puzzle (phAtmosphere) ve
// Sudoku (phLives, phAtmosphere, phShake, phParticleBurst).
// ============================================

// ───────── §15 Reddedilen/Geçersiz Eylem ─────────
function phShake(el) {
  el.classList.remove('ph-shake');
  void el.offsetWidth;
  el.classList.add('ph-shake');
  GameAudio.play('error');
  GameAudio.haptic('error');
}

// ───────── §16/§17 Başarı Partikül Patlaması ─────────
// count, §17'nin 12–16 sabit üst sınırına göre kırpılır.
function phParticleBurst(container, x, y, color, count) {
  const n = Math.min(count || 12, 16);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    const angle = (Math.PI * 2 / n) * i + Math.random() * 0.4;
    const dist = 20 + Math.random() * 50;
    const size = 3 + Math.random() * 6;
    p.className = 'ph-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = color;
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    p.style.setProperty('--ph-px', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ph-py', Math.sin(angle) * dist + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 450);
  }
}

// ───────── §16 Uçan Skor/Metin ─────────
function phFloatText(container, text, x, y, color) {
  const el = document.createElement('div');
  el.className = 'ph-float-text';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = color || 'var(--ph-success)';
  el.style.textShadow = `0 0 12px ${color || 'var(--ph-success-glow)'}, 0 2px 8px rgba(0,0,0,.5)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}

// ───────── "A→B" Transfer (örn. WATER_SORT.md §11'in pour animasyonu) ─────────
// Konumları TEK SEFER getBoundingClientRect() ile okur ve viewport-sabit
// (position:fixed) bir noktayı düz bir translate deltasıyla taşır —
// tüplerin/elemanların aradaki gerçek yolunu bilmesi gerekmez, bu yüzden
// bitişik veya satır-kaydırmalı düzenlerde aynı derecede doğru çalışır.
function phTransfer(fromEl, toEl, opts) {
  opts = opts || {};
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const startX = fromRect.left + fromRect.width / 2;
  const startY = fromRect.top + fromRect.height / 2;
  const endX = toRect.left + toRect.width / 2;
  const endY = toRect.top + toRect.height / 2;
  const dx = endX - startX, dy = endY - startY;
  const size = opts.size || 14;
  const dur = opts.duration || 380;

  const dot = document.createElement('div');
  dot.className = 'ph-transfer-dot';
  dot.style.width = size + 'px';
  dot.style.height = size + 'px';
  dot.style.left = (startX - size / 2) + 'px';
  dot.style.top = (startY - size / 2) + 'px';
  dot.style.background = opts.color || 'var(--ph-accent)';
  dot.style.boxShadow = `0 0 ${size}px ${opts.color || 'var(--ph-accent)'}`;
  dot.style.setProperty('--ph-tx', dx + 'px');
  dot.style.setProperty('--ph-ty', dy + 'px');
  dot.style.setProperty('--ph-tmy', (dy / 2 - 16) + 'px');
  dot.style.animationDuration = dur + 'ms';
  document.body.appendChild(dot);

  return new Promise((resolve) => {
    setTimeout(() => {
      dot.remove();
      if (typeof opts.onComplete === 'function') opts.onComplete();
      resolve();
    }, dur);
  });
}

// ───────── Izgara/Liste Giriş Animasyonu ─────────
function phStaggerIn(elements, delayStep) {
  const step = delayStep || 40;
  Array.prototype.forEach.call(elements, (el, i) => {
    el.classList.remove('ph-stagger-item');
    el.style.animationDelay = (i * step) + 'ms';
    void el.offsetWidth;
    el.classList.add('ph-stagger-item');
  });
}

// ───────── Magic Sahne Atmosferi ─────────
// PuzzleHub'ın ortak evrenini kuran katman: yıldızlar, ışık huzmeleri,
// süzülen zerreler. Oyuncu hangi oyunu açarsa açsın ilk kare CANLI olmalı —
// oyuncu hiçbir şey yapmadan önce sahne yaşıyor olmalı.
//
// Bu fonksiyon SADECE ortak olanı kurar. Her oyunun kendi mekânı (Water
// Sort'un ayı/dağları, Block Puzzle'ın kristal tozu) dönen elemanın ÜSTÜNE
// oyunun kendisi tarafından eklenir — ortak katman bir oyunun kimliğini
// taşımaz, yoksa oyunlar birbirinin kopyası olur.
//
// Yoğunluk parametrik: Water Sort sakin bir sahne ister (nefes alır),
// Block Puzzle daha az/daha keskin ister (şarj olur). Aynı kelimeler,
// farklı cümle.
//
// Konteynerin KARDEŞİ değil ÇOCUĞU olarak eklenir; oyunlar kendi
// wrapper'larını her seviyede yeniden çizdiği için atmosfer o
// sıfırlamadan etkilenmemeli — bu yüzden ayrı bir eleman.
function phAtmosphere(container, opts) {
  opts = opts || {};
  const stars = opts.stars != null ? opts.stars : 22;
  const beams = opts.beams != null ? opts.beams : 2;
  const motes = opts.motes != null ? opts.motes : 9;
  // Yıldızların dağıldığı dikey bölge: alt kısım oyun alanıdır, gök üstte.
  const skyPct = opts.skyPct != null ? opts.skyPct : 62;

  const layer = document.createElement('div');
  layer.className = 'ph-atmo';

  for (let i = 0; i < stars; i++) {
    const s = document.createElement('div');
    s.className = 'ph-star';
    const size = 1 + Math.random() * 1.8;
    s.style.width = size + 'px'; s.style.height = size + 'px';
    s.style.left = (2 + Math.random() * 96) + '%';
    s.style.top = (1 + Math.random() * skyPct) + '%';
    s.style.animationDuration = (2600 + Math.random() * 3400) + 'ms';
    // Negatif gecikme: sahne açıldığı anda yıldızlar zaten "yolun ortasında"
    // olsun; hepsinin birlikte parlamaya başlaması yapay görünüyor.
    s.style.animationDelay = (-Math.random() * 5000) + 'ms';
    layer.appendChild(s);
  }

  for (let i = 0; i < beams; i++) {
    const b = document.createElement('div');
    b.className = 'ph-beam';
    b.style.left = (10 + i * 38 + Math.random() * 8) + '%';
    b.style.width = (34 + Math.random() * 10) + '%';
    b.style.height = '78%';
    b.style.animationDuration = (11000 + i * 4000) + 'ms';
    b.style.animationDelay = (-i * 6000) + 'ms';
    layer.appendChild(b);
  }

  for (let i = 0; i < motes; i++) {
    const m = document.createElement('div');
    m.className = 'ph-mote';
    m.style.left = (6 + Math.random() * 88) + '%';
    m.style.bottom = (Math.random() * 50) + '%';
    m.style.setProperty('--ph-mote-dx', (Math.random() * 34 - 17) + 'px');
    m.style.animationDuration = (6000 + Math.random() * 5000) + 'ms';
    m.style.animationDelay = (-Math.random() * 6000) + 'ms';
    layer.appendChild(m);
  }

  container.appendChild(layer);
  return layer;
}

// ───────── Dünyanın Tepkisi ─────────
// Sahneyi bir an için iter ve aydınlatır. Yalnızca oyunun ZİRVE anlarında
// çağrılmalı: her hamlede tetiklenirse "dünya tepki verdi" hissi ölür ve
// geriye titreyen bir arka plan kalır.
// layer: phAtmosphere()'in döndürdüğü eleman. b: parlaklık çarpanı.
function phAtmosphereFlare(layer, b, durMs) {
  if (!layer) return;
  layer.classList.remove('ph-flare');
  void layer.offsetWidth;                      // animasyonu yeniden başlat
  if (b) layer.style.setProperty('--ph-flare-b', b);
  if (durMs) layer.style.setProperty('--ph-flare-dur', durMs + 'ms');
  layer.classList.add('ph-flare');
  setTimeout(() => layer.classList.remove('ph-flare'), (durMs || 520) + 40);
}

// ═══════════ HIZ VE IŞIK EFEKTLERİ ═══════════
// Referans olarak incelenen arcade 2048'lerin "canlı/hızlı" hissini
// PuzzleHub'ın diline çeviren üç yapı taşı. Ortak nokta: hepsi KISA,
// DÜŞÜK OPAKLIKLI ve tek seferlik. Amaç dikkat çekmek değil, olayın
// enerjisini taşımak — parlak sarı bloom ve kalıcı kıvılcımlar bilerek
// alınmadı, onlar gece/menekşe evrenini bozardı.
// Üçü de oyun-bağımsızdır; sonraki oyunlar aynı sözlüğü kullanır.

// ───────── Enerji halkası ─────────
// Bir birleşme/çarpışma noktasından yayılan tek halka.
// phParticleBurst "kutlama" der, bu "enerji açığa çıktı" der — ikisi
// farklı anlar içindir ve aynı anda kullanılırsa gürültü olur.
function phPulseRing(x, y, opts) {
  opts = opts || {};
  const ring = document.createElement('div');
  ring.className = 'ph-pulse-ring';
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  ring.style.setProperty('--ph-pulse-color', opts.color || 'rgba(255,255,255,.8)');
  ring.style.setProperty('--ph-pulse-size', (opts.size || 120) + 'px');
  const dur = opts.duration || 420;
  ring.style.setProperty('--ph-pulse-dur', dur + 'ms');
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), dur + 60);
  return ring;
}

// ───────── Parlama süpürmesi ─────────
// Yüzeyin üzerinden bir kez geçen ışık: "bu şey az önce var oldu".
// Sınıf yeniden eklenmeden önce kaldırılıp reflow zorlanır, yoksa aynı
// eleman için ikinci çağrı hiçbir şey yapmaz (CSS animasyonları
// kendiliğinden yeniden başlamaz).
function phGleam(el, opts) {
  if (!el) return;
  opts = opts || {};
  const dur = opts.duration || 620;
  el.style.setProperty('--ph-gleam-dur', dur + 'ms');
  if (opts.strength != null) el.style.setProperty('--ph-gleam-strength', opts.strength);
  el.classList.remove('ph-gleam');
  void el.offsetWidth;
  el.classList.add('ph-gleam');
  setTimeout(() => el.classList.remove('ph-gleam'), dur + 60);
}

// ───────── Hareket izi ─────────
// Hızlı giden bir nesnenin arkasında kalan ışık — hız hissinin tek en
// büyük kaynağı. Konum/boyut çağıran tarafından verilir çünkü her oyunun
// koordinat sistemi farklı; buradaki iş yalnızca izi kurup söndürmek.
// KISA mesafelerde çağrılmamalı: her hareket iz bırakırsa tahta bulanır.
function phTrail(parent, rect, opts) {
  if (!parent) return;
  opts = opts || {};
  const dur = opts.duration || 200;
  const t = document.createElement('div');
  t.className = 'ph-trail';
  t.style.left = rect.left + 'px';
  t.style.top = rect.top + 'px';
  t.style.width = rect.width + 'px';
  t.style.height = rect.height + 'px';
  t.style.background = opts.background || 'rgba(200,190,255,.35)';
  t.style.setProperty('--ph-trail-dur', dur + 'ms');
  parent.appendChild(t);
  setTimeout(() => t.remove(), dur + 60);
  return t;
}

// ───────── Yüksek Skor ─────────
// Platform çapında bir boşluğu kapatıyor: reels.js Keşfet kartlarında
// `gh_hi_<id>` anahtarından yüksek skor OKUYORDU ama bu anahtarı hiçbir
// oyun YAZMIYORDU. Yalnızca Block Puzzle kendi `bp_hi`'sını yazıyordu,
// yani yedi oyunun kartında "En Yüksek" sonsuza kadar 0 görünüyordu.
//
// Anahtar isimleri BİLEREK korundu. `gh_` eski önek (bkz. CLAUDE.md §6)
// ve yenisi tercih ediliyor, ama bu anahtarları yeniden adlandırmak
// oyuncuların mevcut rekorlarını siler; migration planı olmadan anahtar
// değiştirmek yasak. Burada yapılan, zaten okunan sözleşmeyi
// TAMAMLAMAK — yeni bir anahtar ailesi eklemek değil.
//
//   phHighScore(id)         → mevcut rekoru okur
//   phHighScore(id, değer)  → yalnızca DAHA YÜKSEKSE yazar, güncelini döner
function phHighScore(gameId, value) {
  // Block Puzzle tarihsel olarak kendi anahtarını kullanıyor.
  const key = gameId === 'blockPuzzle' ? 'bp_hi' : 'gh_hi_' + gameId;
  let current = 0;
  try { current = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) {}
  if (value == null) return current;
  if (value > current) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
    return value;
  }
  return current;
}

// ───────── Kamera: Zoom + Pan ─────────
// Yoğunlaşan tahtalarda oyuncunun yakınlaşabilmesi gerekiyor. İlk
// tüketici Arrow (ileri seviyelerde 19+ ok, hücreler küçülüyor); ikinci
// tüketici olarak flowConnect ve jigsawCard aynı ihtiyaca sahip — §20.3'ün
// "en az bir başka makul tüketici" şartı bu yüzden karşılanıyor.
//
// İKİ ELEMAN gerekir:
//   viewport — sabit ölçülü, kırpan kap
//   stage    — viewport'u tamamen dolduran, DÖNÜŞTÜRÜLEN kap
// İçerik (SVG, canvas, DOM — fark etmez) stage'in içinde durur ve ASLA
// yeniden çizilmez: tek yaptığımız stage'e bir CSS transform yazmak.
// Bu yüzden kamera içerik türünden bağımsız.
//
// TASARIM NOTLARI
//  • transform-origin 0 0. Matematiği sadeleştiriyor: ekran = dünya*s + t.
//    İmleç altındaki noktayı sabit tutmak için t1 = p - (p - t0)*s1/s0.
//    Merkez orijinle aynı formül ek terimler kazanıyor ve okunmuyor.
//  • HEDEF ve GÖRÜNEN ayrı. Tekerlek/pinch hedefi zıplatır, rAF döngüsü
//    göreni hedefe yaklaştırır → "kamera" hissi. Sürükleme sırasında ise
//    araya yumuşatma girmez (immediate), yoksa parmak içerikten kopar.
//  • rAF döngüsü hedefe varınca DURUR (§19: amacı biten döngü çalışmaz).
//  • Viewport ölçüsü ResizeObserver ile ÖNBELLEKLENİR. Her olayda
//    getBoundingClientRect okumak layout thrashing üretirdi (§19).
//  • minScale 1: içerik zaten viewport'a sığacak şekilde tasarlandığı
//    için uzaklaşmaya izin yok — uzaklaşınca kenarlarda boşluk oluşur ve
//    "kaybolmuş" hissi verir.
function phCamera(viewport, stage, opts) {
  opts = opts || {};
  const MIN = opts.minScale != null ? opts.minScale : 1;
  const MAX = opts.maxScale != null ? opts.maxScale : 4;
  const EASE = opts.ease != null ? opts.ease : 0.22;
  // Tekerlek deltası tarayıcı/cihaz arasında çok değişken; üstel ölçek
  // hem yönü hem büyüklüğü doğal kılıyor (her "tık" oransal yakınlaşma).
  const WHEEL_K = opts.wheelStep != null ? opts.wheelStep : 0.0022;
  const SETTLE = 0.001;              // bundan yakınsa hedefe oturmuş say

  let s = 1, tx = 0, ty = 0;         // hedef
  let vs = 1, vx = 0, vy = 0;        // görünen (rAF bunu hedefe taşır)
  let raf = 0, vw = 0, vh = 0;
  const pointers = new Map();
  let pinchD = 0;                    // son pinch mesafesi (0 = pinch yok)
  let pinchMx = 0, pinchMy = 0;      // son pinch orta noktası

  function measure() {
    const r = viewport.getBoundingClientRect();
    vw = r.width; vh = r.height;
  }
  // Ölçek 1'de öteleme zorunlu olarak 0: içerik viewport'u tam doldurur.
  // Büyüdükçe kenarların içeri girmemesi için t ∈ [-(boyut*(s-1)), 0].
  function clamp() {
    const maxX = vw * (s - 1), maxY = vh * (s - 1);
    tx = Math.min(0, Math.max(-maxX, tx));
    ty = Math.min(0, Math.max(-maxY, ty));
  }
  function draw() {
    stage.style.transform =
      'translate(' + vx + 'px,' + vy + 'px) scale(' + vs + ')';
  }
  function tick() {
    const ds = s - vs, dx = tx - vx, dy = ty - vy;
    if (Math.abs(ds) < SETTLE && Math.abs(dx) < SETTLE && Math.abs(dy) < SETTLE) {
      vs = s; vx = tx; vy = ty; draw();
      raf = 0;                        // hedefe varıldı — döngü kapanır
      return;
    }
    vs += ds * EASE; vx += dx * EASE; vy += dy * EASE;
    draw();
    raf = requestAnimationFrame(tick);
  }
  function run() { if (!raf) raf = requestAnimationFrame(tick); }
  function snap() { vs = s; vx = tx; vy = ty; draw(); }

  // p: viewport'a göre imleç konumu. O noktadaki dünya noktası sabit kalır.
  function zoomAt(nextS, px, py) {
    const s0 = s;
    s = Math.min(MAX, Math.max(MIN, nextS));
    if (s === s0) return;
    tx = px - (px - tx) * (s / s0);
    ty = py - (py - ty) * (s / s0);
    clamp();
    run();
  }

  function local(e) {
    const r = viewport.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function onWheel(e) {
    e.preventDefault();
    const [px, py] = local(e);
    zoomAt(s * Math.exp(-e.deltaY * WHEEL_K), px, py);
  }

  function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) viewport.setPointerCapture(e.pointerId);
    if (pointers.size === 2) pinchD = 0;   // yeni pinch — ilk ölçümde kur
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const prevX = p.x, prevY = p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointers.size === 1) {
      // Tek parmak/fare: saf pan. Ölçek 1'de clamp zaten sıfırlar, yani
      // yakınlaşmamışken sürükleme kendiliğinden etkisiz.
      tx += e.clientX - prevX;
      ty += e.clientY - prevY;
      clamp(); snap();                    // 1:1 — araya yumuşatma girmez
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = viewport.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      if (pinchD) {
        // İki parmak hem yakınlaştırır hem taşır: önce orta noktanın
        // kaydığı kadar pan, sonra o nokta etrafında ölçek.
        tx += mx - pinchMx; ty += my - pinchMy;
        zoomAt(s * (d / pinchD), mx, my);
        snap();
      }
      pinchD = d; pinchMx = mx; pinchMy = my;
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchD = 0;
  }

  const ro = new ResizeObserver(() => { measure(); clamp(); snap(); });
  ro.observe(viewport);
  measure();

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);

  return {
    get scale() { return s; },
    zoomBy(f) { zoomAt(s * f, vw / 2, vh / 2); },
    // İçerik ölçüsü DEĞİŞTİĞİNDE çağrılır (yeni seviye, yeni tahta oranı).
    // ResizeObserver bunu kendiliğinden yakalar ama YALNIZCA sayfa render
    // ediliyorken: RO geri çağrıları da rAF gibi "update the rendering"
    // adımlarına bağlı. Sekme gizliyken hiç tetiklenmez ve kamera, içerik
    // oluşmadan önce ölçtüğü bayat boyutla clamp yapar. Tüketici tahtayı
    // yeniden kurduğunda bunu çağırarak o pencereyi kapatır.
    remeasure() { measure(); clamp(); snap(); },
    reset() { s = 1; tx = 0; ty = 0; run(); },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', onUp);
      viewport.removeEventListener('pointercancel', onUp);
    },
  };
}

// ───────── Kaydırma (Swipe) ─────────
// Oyun-bağımsız yön algılama. 2048 ve Labirent bunu ayrı ayrı, ham
// biçimde yazıyordu (sabit 30px eşik, eksen kilidi yok); ortak hâle
// getirilirken üç şey düzeltildi:
//
//  1. EKSEN KİLİDİ — çapraz bir hareket "biraz sağa biraz aşağı"dır.
//     Baskın eksen yeterince baskın değilse hamle ÜRETİLMEZ. Yanlış
//     yöne giden bir 2048 hamlesi geri alınamaz, o yüzden kararsız
//     girdiyi yok saymak yanlış tahmin etmekten iyidir.
//  2. FİSKE (flick) — hızlı ve kısa bir hareket de niyettir. Kısa
//     sürede yapılan kaydırmada eşik düşürülür.
//  3. Fare desteği — masaüstü PWA ve tarayıcıda test için; hiçbir
//     görsel ipucu göstermez, yalnızca aynı olayları üretir.
//
// onSwipe('left'|'right'|'up'|'down') ile çağrılır.
function phSwipe(el, onSwipe, opts) {
  opts = opts || {};
  const minDist = opts.minDist != null ? opts.minDist : 24;
  // Baskın eksene oranla izin verilen sapma. .6 = 31°'lik bir koni.
  const maxOffAxis = opts.maxOffAxis != null ? opts.maxOffAxis : 0.6;
  const flickMs = opts.flickMs != null ? opts.flickMs : 250;

  let sx = 0, sy = 0, st = 0, active = false;

  function start(e) {
    const t = e.touches ? e.touches[0] : e;
    sx = t.clientX; sy = t.clientY; st = Date.now(); active = true;
  }
  function end(e) {
    if (!active) return;
    active = false;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const dominant = Math.max(adx, ady);
    if (dominant === 0) return;
    // Hızlı fiskede eşik düşer.
    const threshold = (Date.now() - st) < flickMs ? minDist * 0.6 : minDist;
    if (dominant < threshold) return;
    if (Math.min(adx, ady) / dominant > maxOffAxis) return;   // fazla çapraz
    onSwipe(adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  addEv(el, 'touchstart', start, { passive: true });
  addEv(el, 'touchend', end, { passive: true });
  addEv(el, 'mousedown', start);
  addEv(el, 'mouseup', end);
}

// ───────── Can Sistemi ─────────
// Oyuncunun hata bütçesi. Yanlış hamleyi ENGELLEYEN oyunlarda bu bütçe
// olmazsa engelleme ücretsiz bir otomatik yardıma dönüşür ve bulmacanın
// bütün gerilimi kaçar — can, "seni koruyorum"u "bunun bir bedeli var"a
// çevirir.
//
// Bilerek KÜÇÜK tutuldu: sayaç + kalp göstergesi + tükenme bildirimi.
// Puan, reklam, elmas, Game Over ekranı burada DEĞİL — onlar oyunun ve
// uygulama kabuğunun işi. Bu modül canın kaç tane olduğunu bilir, o kadar.
//
// mount() çağrılmadan da çalışır (başsız sayaç): göstergesiz bir oyun
// canı yine de kullanabilir.
//
// onEmpty yalnızca canın SIFIRA DÜŞTÜĞÜ anda bir kez tetiklenir; zaten
// sıfırken gelen lose() çağrıları sessizdir, yoksa Game Over ekranı
// üst üste açılabilir.
function phLives(opts) {
  opts = opts || {};
  const max = opts.max != null ? opts.max : 3;
  let count = max;
  let host = null;

  function render(changedIndex, gaining) {
    if (!host) return;
    host.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const h = document.createElement('span');
      // i < count → dolu. Kaybedilenler sağdan sola söner.
      const lost = i >= count;
      h.className = 'ph-heart' + (lost ? ' lost' : '');
      h.textContent = '♥';
      if (i === changedIndex) h.classList.add(gaining ? 'gaining' : 'losing');
      host.appendChild(h);
    }
  }

  return {
    get count() { return count; },
    get max() { return max; },
    mount(el) { host = el; host.classList.add('ph-lives'); render(); return el; },
    lose() {
      if (count <= 0) return 0;              // zaten tükendi — sessiz
      count--;
      render(count, false);                  // sönen kalp: yeni count indeksi
      if (count === 0 && typeof opts.onEmpty === 'function') opts.onEmpty();
      return count;
    },
    gain(n) {
      const before = count;
      count = Math.min(max, count + (n || 1));
      if (count !== before) render(count - 1, true);
      return count;
    },
    reset() { count = max; render(); return count; }
  };
}

// ───────── §16 Büyük Başarı — Seviye/Oturum Tamamlandı ─────────
// Süre (~2sn), her oyunun ayarlayabileceği bir parametre DEĞİL,
// paylaşımlı bir sabittir (WATER_SORT.md §14).
function phShowCelebration(opts) {
  opts = opts || {};
  const HOLD_MS = 2000;

  const scrim = document.createElement('div');
  scrim.className = 'ph-modal-scrim';
  const panel = document.createElement('div');
  panel.className = 'ph-modal ph-modal-enter';
  panel.innerHTML =
    `<div class="ph-celebrate-title"></div>` +
    `<div class="ph-celebrate-subtitle"></div>`;
  panel.querySelector('.ph-celebrate-title').textContent = opts.title || '';
  panel.querySelector('.ph-celebrate-subtitle').textContent = opts.subtitle || '';
  scrim.appendChild(panel);
  document.body.appendChild(scrim);

  if (opts.sfx) GameAudio.play(opts.sfx);
  GameAudio.haptic('win');

  requestAnimationFrame(() => {
    const rect = panel.getBoundingClientRect();
    phParticleBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 'var(--ph-success)', 16);
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      scrim.remove();
      resolve();
    }, HOLD_MS);
  });
}

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

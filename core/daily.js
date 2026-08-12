// ============================================
// SlySwipe — Günlük Meydan Okuma (daily.js)
// ============================================
// PLATFORM özelliğidir, Sudoku'ya ait değildir. Sudoku ilk tüketicisi;
// Water Sort, Rope Puzzle, Block Puzzle ve sonrakiler aynı çerçeveye
// tek bir satırla bağlanır.
//
// ── OYUN NASIL BAĞLANIR ──
// Bir oyunun günlüğe katılması için iki şey yeterli:
//
//   1. Modülü `supportsDaily: true` göstersin.
//   2. init(container, opts) çağrısında opts.seed'i ONURLANDIRSIN —
//      yani aynı tohum her zaman aynı tahtayı üretsin.
//
// İsteğe bağlı: `dailyDifficulty` ile günlüğün hangi zorlukta oynanacağı
// belirtilir (herkes aynı zorluğu görmeli, yoksa "aynı bulmaca" iddiası
// bozulur).
//
// Sözleşme bilerek bu kadar dar: bu dosya hiçbir oyunun kurallarını,
// tahtasını veya puanlamasını bilmez. Bildiği tek şey "bu oyun tohumdan
// deterministik üretebiliyor mu".
//
// ── NEDEN SUNUCU YOK ──
// Tohum takvim gününden türetiliyor (core/rng.js → phDailySeed), yani
// aynı gün herkes aynı tahtayı görüyor. Backend, hesap ve senkronizasyon
// gerekmiyor. Bu, projenin mevcut sunucusuz aşamasıyla uyumlu.
//
// ── STREAK: giriş streak'inden AYRI ──
// app.js'teki StreakSystem (ph_streak) uygulamayı AÇMAYI ödüllendirir.
// Buradaki streak günlük bulmacayı ÇÖZMEYİ ödüllendirir. İkisi farklı
// davranışlar ve birbirine karıştırılmamalı — biri katılım, diğeri
// başarı.

const DailyChallenge = {
  _key: 'ph_daily_v1',

  _read() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { return {}; }
  },
  _write(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) {}
  },

  // YEREL takvim günü. UTC kullanılsaydı günlük bulmaca bazı bölgelerde
  // gün ortasında değişirdi (bkz. core/rng.js'teki aynı gerekçe).
  todayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },

  // Günlüğe katılabilen oyunların id listesi. Kayıt defteri YOK —
  // oyunlar kendilerini ilan eder, böylece yeni oyun eklerken bu
  // dosyaya dokunmak gerekmez.
  games() {
    if (typeof PuzzleGames === 'undefined') return [];
    return Object.keys(PuzzleGames).filter(id => PuzzleGames[id] && PuzzleGames[id].supportsDaily);
  },

  state(gameId) {
    const s = this._read()[gameId] || { last: null, streak: 0, best: 0 };
    return {
      streak: s.streak || 0,
      best: s.best || 0,
      last: s.last || null,
      doneToday: s.last === this.todayKey(),
    };
  },

  seedFor(gameId) {
    return phDailySeed(gameId);
  },

  difficultyFor(gameId) {
    const g = PuzzleGames[gameId];
    return (g && g.dailyDifficulty) || undefined;
  },

  // Bugünü tamamlandı işaretler ve streak'i günceller.
  // AYNI GÜN İÇİNDE İDEMPOTENT: bulmacayı ikinci kez bitirmek streak'i
  // ikiye katlamaz. Oyuncu günlüğü tekrar oynayabildiği için bu şart.
  complete(gameId) {
    const all = this._read();
    const s = all[gameId] || { last: null, streak: 0, best: 0 };
    const today = this.todayKey();
    if (s.last === today) return this.state(gameId);

    const yesterday = this.todayKey(new Date(Date.now() - 86400000));
    // Dün çözülmüşse seri devam eder; aradan gün atlandıysa 1'den başlar.
    s.streak = (s.last === yesterday) ? (s.streak || 0) + 1 : 1;
    s.last = today;
    s.best = Math.max(s.best || 0, s.streak);
    all[gameId] = s;
    this._write(all);
    return this.state(gameId);
  },

  // Oyunu günlük modda başlatır.
  start(gameId) {
    if (typeof playGameById !== 'function') return;
    playGameById(gameId, {
      daily: true,
      seed: this.seedFor(gameId),
      difficulty: this.difficultyFor(gameId),
    });
  },
};

// ───────── Ana ekran kartları ─────────
// Günlüğe katılan her oyun için bir satır. Hiçbir oyun katılmıyorsa
// bölüm tamamen gizlenir — boş bir başlık göstermek yerine.
function renderDailyChallenge() {
  const section = document.getElementById('daily-challenge-section');
  const list = document.getElementById('daily-challenge-list');
  if (!section || !list) return;

  const ids = DailyChallenge.games();
  if (!ids.length) { section.style.display = 'none'; return; }
  section.style.display = '';

  list.innerHTML = ids.map(id => {
    const g = PuzzleGames[id];
    const st = DailyChallenge.state(id);
    const meta = (typeof REEL_GAMES !== 'undefined')
      ? REEL_GAMES.find(x => x.id === id) : null;
    const name = (meta && meta.name) || id;
    const emoji = (meta && meta.emoji) || '🧩';
    const diff = g.dailyDifficulty && g.DIFFICULTIES && g.DIFFICULTIES[g.dailyDifficulty]
      ? g.DIFFICULTIES[g.dailyDifficulty].label : '';

    // Mockup panel 1: solda tahta önizlemesi, sağda ad · zorluk, ödül ve
    // "Başla" butonu. Önizleme GERÇEK günün tahtasından geliyor (bkz.
    // previewFor) — sahte bir görsel değil.
    return '<div class="dc-card' + (st.doneToday ? ' done' : '') + '">' +
             previewFor(id, emoji) +
             '<div class="dc-body">' +
               '<span class="dc-name">' + name + (diff ? ' - ' + diff : '') + '</span>' +
               // Ödül etiketi YOK ve bu bilinçli (2026-08-12, yayın öncesi).
               // Burada "⭐ 50 XP" yazıyordu; XP diye bir ekonomi hiç kurulmadı,
               // yani kart tutulmayan bir ödül vaat ediyordu. Sahibin kararı:
               // vaadi kaldır, sahte bir sayıyla değiştirme. Günlük meydan
               // okumanın gerçek ödülü zaten DailyQuests'in "günlük meydan
               // okumayı tamamla" görevi (EconomyConfig.QUEST_*) üzerinden
               // ödeniyor — kartta ikinci kez ilan edilmesi gerekmiyor.
               '<button class="dc-btn" onclick="DailyChallenge.start(\'' + id + '\')">' +
                 (st.doneToday ? 'Tekrar Oyna' : 'Başla') +
               '</button>' +
             '</div>' +
             (st.doneToday ? '<span class="dc-check">✓</span>' : '') +
             (st.streak > 0 ? '<span class="dc-streak">🔥 ' + st.streak + '</span>' : '') +
           '</div>';
  }).join('');
}

// ───────── Tahta önizlemesi ─────────
// Mockup'taki mini sudoku ızgarası. Günün tohumu deterministik olduğu için
// oyuncunun birazdan oynayacağı TAHTANIN TA KENDİSİNDEN üretiliyor —
// dekoratif bir görsel değil, bulmacanın sol üst 3x3'ü.
//
// İKİ ÖNLEM ZORUNLU:
//  1) SONUÇ ÖNBELLEKLENİR. generate() bir sudoku üreticisi çalıştırıyor;
//     ana ekran her render'da yeniden üretmek boşa CPU demek. Tohum gün
//     içinde sabit olduğu için tek üretim yeter.
//  2) try/catch ŞART. Üretici bir gün hata verirse ana ekranın TAMAMI
//     boş kalırdı; hata durumunda sessizce emoji'ye düşüyoruz.
const _previewCache = {};

function previewFor(gameId, fallbackEmoji) {
  if (gameId !== 'sudoku') {
    return '<div class="dc-preview dc-preview-emoji">' + fallbackEmoji + '</div>';
  }
  const seed = DailyChallenge.seedFor(gameId);
  const key = gameId + ':' + seed;

  if (!(key in _previewCache)) {
    _previewCache[key] = null;
    try {
      const g = PuzzleGames[gameId];
      if (g && typeof g.generate === 'function') {
        const res = g.generate(DailyChallenge.difficultyFor(gameId), seed);
        if (res && res.puzzle) _previewCache[key] = res.puzzle;
      }
    } catch (e) { /* önizleme opsiyonel — kart yine de çalışır */ }
  }

  const puzzle = _previewCache[key];
  if (!puzzle) {
    return '<div class="dc-preview dc-preview-emoji">' + fallbackEmoji + '</div>';
  }

  // Sol üst 3x3 blok: 81'lik dizide satır r, sütun c → r*9 + c.
  let cells = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const v = puzzle[r * 9 + c];
      cells += '<span class="dc-cell">' + (v ? v : '') + '</span>';
    }
  }
  return '<div class="dc-preview">' + cells + '</div>';
}

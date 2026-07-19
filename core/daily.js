// ============================================
// PuzzleHub — Günlük Meydan Okuma (daily.js)
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

    return '<button class="daily-card' + (st.doneToday ? ' done' : '') + '" ' +
             'onclick="DailyChallenge.start(\'' + id + '\')">' +
             '<span class="daily-emoji">' + emoji + '</span>' +
             '<span class="daily-info">' +
               '<span class="daily-name">' + name + (diff ? ' · ' + diff : '') + '</span>' +
               '<span class="daily-sub">' +
                 (st.doneToday ? 'Bugün tamamlandı' : 'Bugünün bulmacası hazır') +
               '</span>' +
             '</span>' +
             '<span class="daily-right">' +
               (st.doneToday ? '<span class="daily-check">✓</span>' : '') +
               (st.streak > 0 ? '<span class="daily-streak">🔥 ' + st.streak + '</span>' : '') +
             '</span>' +
           '</button>';
  }).join('');
}

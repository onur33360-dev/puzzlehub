/* ============================================
   GameHup — Uygulama Mantığı
   ============================================ */

// ==================== EKONOMİ AYARLARI ====================
//
// TÜM ekonomi sayıları burada. Daha önce dağınıktı: geri alma bedeli
// games.js'te (2048 IIFE'sinin içinde), devam bedeli continueWithDiamonds
// içinde, reklam ödülü watchAdForDiamonds içinde, günlük reklam limiti ise
// HİÇBİR yerde — mağaza metni ayrı, kod sınırsızdı. Denge ayarı yapılacaksa
// tek dosyada, tek blokta
// yapılsın; fonksiyon fonksiyon aranmasın.
//
// games.js bu objeyi ÇALIŞMA ANINDA okur (bkz. games.js `econ()`), modül
// değerlendirilirken değil: yükleme sırası games.js → … → app.js.
const EconomyConfig = {
  // --- Reklam bütçesi ---
  // Tek günlük reklam havuzu. Tüm reklamlı ödül/continue/hint/undo/2x
  // akışları bu 3 haktan düşer.
  AD_DAILY_LIMIT: 3,

  // --- Elmas kazanımları ---
  AD_DIAMOND_REWARD: 10,      // reklamla elmas kazan
  LEVEL_COMPLETE_REWARD: 3,   // seviye tamamlama (Plus çarpanı UYGULANMAZ)

  // --- Elmas harcamaları ---
  CONTINUE_DIAMONDS: 30,      // game over sonrası devam
  UNDO_DIAMONDS: 15,          // +1 geri alma
  HINT_DIAMONDS: 10,          // ipucu — undo'dan ucuz, daha az kritik yardım

  // --- Premium (PlusSystem) ---
  PLUS_DAILY_DIAMONDS: 20,    // günlük ödülün ÜSTÜNE, ayrı satır
  PLUS_DIAMOND_MULTIPLIER: 1.5, // reklam + günlük ödül kazanımlarına
};

// ==================== VERİ ====================

const PUZZLE_GAMES = [
  { name:'Vida Ustası', emoji:'🔩', rating:4.9, badge:'yeni', desc:'Vidaları sök, eşleştir!', bg:'linear-gradient(135deg,#b45309,#78350f)' },
  { name:'2048', emoji:'🔢', rating:4.8, badge:null, desc:'Sayı birleştir', bg:'linear-gradient(135deg,#d97706,#92400e)' },
  { name:'Bulmaca Blokları', emoji:'🧱', rating:4.5, badge:null, desc:'Blok yerleştir', bg:'linear-gradient(135deg,#7c3aed,#5b21b6)' },
  { name:'Hafıza Oyunu', emoji:'🧠', rating:4.3, badge:null, desc:'Kartları eşleştir', bg:'linear-gradient(135deg,#0891b2,#155e75)' },
  { name:'Kelime Avı', emoji:'📝', rating:4.6, badge:null, desc:'Gizli kelimeleri bul', bg:'linear-gradient(135deg,#16a34a,#166534)' },
  { name:'Sudoku', emoji:'#️⃣', rating:4.7, badge:null, desc:'9x9 tabloyu doldur', bg:'linear-gradient(135deg,#1d4ed8,#1e3a8a)' },
  { name:'Labirent', emoji:'🌀', rating:4.2, badge:null, desc:'Çıkışı bul', bg:'linear-gradient(135deg,#059669,#065f46)' },
  { name:'Resim Kaydır', emoji:'🖼️', rating:4.9, badge:'yeni', desc:'Fotoğrafı kaydır, tamamla', bg:'linear-gradient(135deg,#123a4a,#06121c)' },
];

// Mockup panel 1 "Bugünün Görevleri" ile birebir üç görev.
// TODO: görev takibi kurulunca gerçek veriye bağlanacak. Bugün hiçbir
// sayaç yazılmıyor — playGame()/showGameOver() ilerleme kaydetmiyor,
// o yüzden progress değerleri statik. İkincisi ("Günlük meydan okumayı
// tamamla") takip gelmeden de türetilebilir: DailyChallenge.state()
// .doneToday zaten bu bilgiyi tutuyor.
const DAILY_MISSIONS = [
  { icon:'🎮', tone:'blue',  name:'3 oyun oyna',                     progress:1, total:3 },
  { icon:'🎯', tone:'red',   name:'Günlük meydan okumayı tamamla',   progress:0, total:1 },
  { icon:'⭐', tone:'amber', name:'Kişisel rekorunu geliştir',       progress:0, total:1 },
];

// ŞU AN RENDER EDİLMİYOR. Mockup'ın ana sayfasında haftalık görev listesi
// yok, yerine "Haftalık Ödül" sandığı var. Dizi silinmedi: sandığın
// "tüm görevleri tamamla" koşulu kurulduğunda tüketilecek kaynak bu.
const WEEKLY_MISSIONS = [
  { icon:'🔥', name:'7 Gün Giriş', desc:'7 gün üst üste gir', progress:4, total:7, reward:'+200' },
  { icon:'⭐', name:'15 Oyun Kazan', desc:'15 oyun kazanma', progress:6, total:15, reward:'+300' },
  { icon:'🎯', name:'Her Kategoriden 1', desc:'Her kategoriden oyna', progress:2, total:4, reward:'+150' },
];

const LEADERBOARD = [
  { name:'ProGamer', avatar:'🦊', score:12400 },
  { name:'OyunKralı', avatar:'🐺', score:11200 },
  { name:'Yıldız', avatar:'🦁', score:10800 },
  { name:'Ninja', avatar:'🐱', score:9500 },
  { name:'Şimşek', avatar:'🐯', score:8900 },
  { name:'Kahraman', avatar:'🐻', score:8200 },
  { name:'Sen', avatar:'😎', score:1240 },
  { name:'Acemi', avatar:'🐣', score:500 },
];

// Profil satırları. İlk üçü mockup panel 4'ten; ardından Plus ve Mağaza
// geliyor — ikisi de header'dan KALDIRILDIĞI için (mockup'ta yoklar)
// uygulamadaki tek erişim kapıları burası. Kalanlar mevcut ayarlar.
// `fn` verilirse çalıştırılır, verilmezse `action` toast olarak gösterilir.
const SETTINGS = [
  { icon:'👤', label:'Avatarını Düzenle', fn:'openAvatarPicker()' },
  // TODO: profil çerçevesi sistemi kurulunca gerçek ekrana bağlanacak
  { icon:'🖼️', label:'Profil Çerçevesi', action:'Profil çerçeveleri yakında!' },
  // Tema seçici bu turda kurulmadı; tek tema var ve "Özel Temalar" Plus'ın
  // reklam ettiği bir avantaj — bu yüzden satır Plus sayfasına yönlendiriyor.
  { icon:'🎨', label:'Tema Seçimi', fn:'showPlusPage()' },
  { icon:'👑', label:"Plus'a Geç", fn:'showPlusPage()' },
  { icon:'💎', label:'Elmas Mağazası', fn:'openShop()' },
  { icon:'🔔', label:'Bildirimler', action:'Bildirimler yakında!' },
  { icon:'🔊', label:'Ses Ayarları', action:'Ses ayarları yakında!' },
  { icon:'🌐', label:'Dil', action:'Dil: Türkçe' },
  { icon:'⭐', label:'Puanla', action:'Uygulama puanlama yakında!' },
  { icon:'📤', label:'Paylaş', action:'Paylaşım yakında!' },
  // Sürüm tek kaynaktan (index.html APP_VERSION) okunur; burada sabit
  // yazmak bump'ta kaydırır. typeof guard'ı app.js'in izole yüklendiği
  // (test) durumda ReferenceError'ı önler.
  { icon:'ℹ️', label:'Hakkında', action:'PuzzleHub v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.28.0') },
];

const DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const DAY_ICONS = ['✅','✅','✅','🎁','🏃','💎','🏆'];

// ==================== ELMAS SİSTEMİ ====================

const DiamondSystem = {
  _key: 'ph_diamonds',
  
  get() {
    return parseInt(localStorage.getItem(this._key) || '100', 10); // Start with 100
  },
  
  set(val) {
    localStorage.setItem(this._key, Math.max(0, val).toString());
    this.updateUI();
  },
  
  add(amount, reason) {
    const current = this.get();
    this.set(current + amount);
    if (reason) showToast(`+${amount}💎 ${reason}`);
    this._animateAdd();
  },
  
  // KAZANIM kapısı — Premium çarpanı yalnızca buradan geçenlere işler.
  // add() ile bilerek ayrı: çarpan reklam ve günlük ödül kazanımlarına
  // uygulanıyor, seviye tamamlama ödülüne (+3) UYGULANMIYOR. Oyun içi
  // ilerlemeyi de abonelikle hızlandırmak bir denge kararı olurdu, oysa
  // burada verilen şey bir abonelik faydası.
  addReward(amount, reason) {
    const plus = (typeof PlusSystem !== 'undefined') && PlusSystem.isActive();
    const total = plus
      ? Math.round(amount * EconomyConfig.PLUS_DIAMOND_MULTIPLIER)
      : amount;
    this.add(total, plus && reason ? reason + ' (Plus +%50)' : reason);
    return total;
  },

  spend(amount) {
    const current = this.get();
    if (current < amount) {
      showToast('💎 Yeterli elmas yok!');
      return false;
    }
    this.set(current - amount);
    return true;
  },
  
  canAfford(amount) {
    return this.get() >= amount;
  },
  
  updateUI() {
    const els = document.querySelectorAll('.diamond-count');
    els.forEach(el => el.textContent = this.get().toLocaleString());
  },
  
  _animateAdd() {
    const el = document.querySelector('.diamond-display');
    if (el) {
      el.classList.add('diamond-pop');
      setTimeout(() => el.classList.remove('diamond-pop'), 400);
    }
  }
};

// ==================== AVATAR ====================
//
// Avatar eskiden ÜÇ AYRI YERDE sabit yazılıydı (header, profil, ilerleme)
// ve hiçbiri diğerinden haberdar değildi — birini değiştirmek diğer ikisini
// sessizce tutarsız bırakıyordu. Artık tek kaynak burası: DOM'da
// `data-ph-avatar` niteliği taşıyan her öğe buradan doldurulur, yani yeni
// bir yerde avatar göstermek için o niteliği eklemek yeterli.
const AvatarSystem = {
  _key: 'ph_avatar',
  DEFAULT: '🦊',
  // Seçenekler tek bir emoji listesi — ayrı bir görsel varlık yok, bu
  // yüzden ne indirme ne lisans sorunu var (bkz. CLAUDE.md §6 ses politikası
  // ile aynı mantık).
  CHOICES: ['🦊','😎','🐺','🦁','🐱','🐯','🐻','🐼','🐸','🐨','🦉','🐧'],

  get() {
    try { return localStorage.getItem(this._key) || this.DEFAULT; }
    catch (e) { return this.DEFAULT; }
  },
  set(emoji) {
    try { localStorage.setItem(this._key, emoji); } catch (e) {}
    this.updateUI();
  },
  updateUI() {
    const v = this.get();
    document.querySelectorAll('[data-ph-avatar]').forEach(el => { el.textContent = v; });
  },
};

// Basit seçici — mockup'ta ayrı bir ekran yok, bu yüzden mevcut modal
// dilini kullanan hafif bir ızgara.
function openAvatarPicker() {
  const cur = AvatarSystem.get();
  const grid = AvatarSystem.CHOICES.map(e =>
    `<button class="av-pick${e === cur ? ' sel' : ''}" onclick="pickAvatar('${e}')">${e}</button>`
  ).join('');
  let el = document.getElementById('avatar-picker');
  if (!el) {
    el = document.createElement('div');
    el.id = 'avatar-picker';
    el.className = 'av-scrim';
    el.onclick = (ev) => { if (ev.target === el) closeAvatarPicker(); };
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="av-box">
      <span class="av-head">Avatarını Seç</span>
      <div class="av-grid">${grid}</div>
      <button class="av-close" onclick="closeAvatarPicker()">Kapat</button>
    </div>`;
  el.style.display = 'flex';
}
function pickAvatar(emoji) {
  AvatarSystem.set(emoji);
  if (typeof GameAudio !== 'undefined') { GameAudio.play('tab'); GameAudio.haptic('micro'); }
  closeAvatarPicker();
}
function closeAvatarPicker() {
  const el = document.getElementById('avatar-picker');
  if (el) el.style.display = 'none';
}

// ==================== STREAK SİSTEMİ ====================

const StreakSystem = {
  _key: 'ph_streak',
  
  getData() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '{}');
    } catch(e) { return {}; }
  },
  
  saveData(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },
  
  checkIn() {
    const data = this.getData();
    const today = new Date().toDateString();

    if (data.lastDate === today) return false; // Already checked in

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (data.lastDate === yesterday.toDateString()) {
      // Streak continues
      data.count = (data.count || 0) + 1;
    } else if (data.lastDate) {
      // Streak broken — go back 1 day instead of reset
      data.count = Math.max(1, (data.count || 1) - 1);
    } else {
      data.count = 1;
    }

    data.lastDate = today;
    data.totalDays = (data.totalDays || 0) + 1;

    // Hafta satırının ✓ işaretleri buradan besleniyor. count BU İŞE
    // YARAMAZ: seri bozulduğunda sıfırlanmıyor, bir azaltılıyor (yukarıya
    // bak), dolayısıyla "son N gün girildi" anlamına gelmiyor. Hangi günün
    // gerçekten alındığını bilmenin tek yolu günü kaydetmek.
    // Son 21 gün yeterli: ekranda yalnızca içinde bulunulan Pzt–Paz
    // gösteriliyor, fazlası anahtarı gereksiz büyütür.
    const key = StreakSystem.dayKey();
    const days = Array.isArray(data.days) ? data.days : [];
    if (days.indexOf(key) === -1) days.push(key);
    data.days = days.slice(-21);

    this.saveData(data);
    return true;
  },

  // YEREL takvim günü — UTC olsaydı gün bazı bölgelerde gün ortasında
  // değişirdi (core/rng.js ve core/daily.js'teki aynı gerekçe).
  dayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },

  // Gerçekten giriş yapılmış günler. ESKİ KAYITLARDA `days` YOKTUR:
  // alan 2026-07-29'da eklendi ve geriye dönük doldurulamaz (o bilgi hiç
  // tutulmamıştı). Eski kullanıcıda satır ilk check-in'e kadar boş görünür
  // — uydurmaktansa doğrusu bu.
  claimedDays() {
    const days = this.getData().days;
    return new Set(Array.isArray(days) ? days : []);
  },

  getCount() {
    return this.getData().count || 0;
  },

  getDayInWeek() {
    // Gerçek takvim günü: Pzt=0, Sal=1, Çar=2, Per=3, Cum=4, Cmt=5, Paz=6
    const day = new Date().getDay(); // JS: 0=Pazar, 1=Pzt...6=Cmt
    return day === 0 ? 6 : day - 1;
  }
};

// ==================== GÜNLÜK ÖDÜL TAKVİMİ ====================

const DAILY_REWARD_TABLE = [
  { day: 'Pzt', amount: 5,   icon: '💎', label: '5 Elmas' },
  { day: 'Sal', amount: 10,  icon: '💎', label: '10 Elmas' },
  { day: 'Çar', amount: 15,  icon: '🎁', label: '15 Elmas' },
  { day: 'Per', amount: 20,  icon: '💎', label: '20 Elmas' },
  { day: 'Cum', amount: 30,  icon: '🎉', label: '30 Elmas' },
  { day: 'Cmt', amount: 40,  icon: '✨', label: '40 Elmas' },
  { day: 'Paz', amount: 100, icon: '👑', label: '100 Elmas!' },
];

function claimDailyReward() {
  const isNew = StreakSystem.checkIn();
  if (!isNew) {
    showToast('✅ Bugünkü ödülü zaten aldın!');
    return;
  }
  const dayIdx = StreakSystem.getDayInWeek();
  const reward = DAILY_REWARD_TABLE[dayIdx];
  // addReward: günlük ödül Plus'ın +%50 çarpanına TABİ (bkz. 4d).
  DiamondSystem.addReward(reward.amount, 'Günlük ödül!');

  // Plus günlük bonusu — tablonun ÜSTÜNE, ayrı bir satır olarak.
  // Tabloyu Plus'a göre değiştirmek yerine ayrı satır olmasının sebebi:
  // DAILY_REWARD_TABLE haftanın ritmini kuruyor (Paz 100💎 zirvesi), Plus
  // bunu bozmadan her güne sabit bir taban ekliyor.
  // add() ile veriliyor, addReward() ile DEĞİL: bu zaten bir Plus faydası,
  // üstüne bir de Plus çarpanı uygulamak aynı avantajı iki kez saymak olur.
  if (PlusSystem.isActive()) {
    DiamondSystem.add(EconomyConfig.PLUS_DAILY_DIAMONDS, 'Plus günlük bonusu 👑');
  }

  // Streak milestones
  const streak = StreakSystem.getCount();
  if (streak === 7) DiamondSystem.add(50, '7 gün streak bonusu! 🔥');
  if (streak === 14) DiamondSystem.add(100, '14 gün streak! 🎉');
  if (streak === 30) DiamondSystem.add(200, '30 gün streak! 👑');
  
  renderDailyRewards();
  updateStreakUI();
}

// ==================== EVRENSEL OYUN OLAYLARI ====================
//
// 10 oyunun HEPSİNİN çağırdığı tek olay kapısı. Görev/başarım sistemleri
// buraya abone olur; oyunlar onların varlığından habersiz kalır.
//
// ───── NEDEN İKİ OLAY YETİYOR ─────
// Ayrı `game_won` / `game_lost` olayları yerine tek `game_ended` + `result`
// alanı var. Sebep, kaybetme durumu OLMAYAN oyunlar: Su Sıralama'da tahta
// tıkanmaz, oyuncu kaybedemez. Ayrı olaylarda her oyun ikisini de düşünmek,
// abone olan her sistem ikisini de dinlemek zorunda kalırdı — ve "lost"u hiç
// yayınlamayan bir oyun, eksik entegre edilmiş gibi görünürdü. Tek olayda
// Su Sıralama yalnızca result:'won' gönderir; bu bir boşluk değil, o oyunun
// doğru ve tam ifadesi. 'quit' de üçüncü bir olay değil, aynı alanın üçüncü
// değeri: oyundan çıkmak da bir bitiş biçimi.
//
// ───── TUR (ROUND) KAVRAMI ─────
// Sayılan birim "oturum" değil TUR: bir kazanma/kaybetme kararının kapsadığı
// oynanış. Seviyeli oyunlarda (Su Sıralama, Vida, Ok, Resim Kaydır) bu bir
// SEVİYE, seviyesizlerde (2048, Blok, Hafıza…) tüm oturum. Bu ayrım keyfi
// değil, zorunlu: seviye tamamlama game_ended('won') yayınlıyorsa, seviye
// başlangıcı da game_started yayınlamalı — yoksa Su Sıralama'da 1 başlangıca
// karşı 40 galibiyet birikir ve "kazanma oranı" gibi her türev ölçüm anlamsız
// olurdu.
//
// Değişmezler (bunlar bozulursa sayaçlar yalan söyler):
//   1. Aynı anda EN FAZLA BİR açık tur olur.
//   2. game_started açık bir tur bulursa onu önce 'quit' ile kapatır. Oyun içi
//      "yeniden başlat" düğmelerinin her birini ayrıca yakalamak gerekmesin
//      diye sistem kendi kendini onarır.
//   3. Açık tur yokken gelen game_ended sayaçlara İŞLEMEZ (stray). Aksi hâlde
//      totalGamesWon > totalGamesStarted olabilir; kazanma oranı 1'i aşardı.
//      Yanlış bağlanmış bir oyun sessizce veri bozmak yerine konsolda görünür.
const GameEvents = {
  _key: 'ph_game_stats',
  _subs: {},
  _open: null,          // { gameId, startedAt } — o an açık tur
  _lastRound: null,     // en son kapanan tur (yalnızca reopen için)

  // ───── pub/sub ─────
  // Bu adımda GERÇEK abone yok; mekanizma sıradaki adımlar (günlük görevler,
  // rozetler) için hazır duruyor. Dönen fonksiyon aboneliği iptal eder.
  on(eventName, cb) {
    if (typeof cb !== 'function') return function () {};
    (this._subs[eventName] || (this._subs[eventName] = [])).push(cb);
    const subs = this._subs[eventName];
    return function off() {
      const i = subs.indexOf(cb);
      if (i >= 0) subs.splice(i, 1);
    };
  },

  emit(eventName, payload) {
    payload = payload || {};
    if (eventName === 'game_started') return this._start(payload);
    if (eventName === 'game_ended') return this._end(payload);
    // Bilinmeyen olay: sayaç yok, yalnızca dağıtım. İleride yeni olay
    // eklemek (örn. 'level_up') buraya dokunmadan mümkün olsun.
    this._dispatch(eventName, payload);
  },

  // ───── sayaçlar (ph_game_stats) ─────
  // Bu adımda bu veriyi GÖSTEREN hiçbir UI yok; amaç sıradaki adımların
  // okuyacağı ham verinin doğru birikmesi.
  stats() {
    let d;
    try { d = JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { d = {}; }
    return {
      totalGamesStarted: d.totalGamesStarted || 0,
      totalGamesWon: d.totalGamesWon || 0,
      perGame: d.perGame || {},
    };
  },

  forGame(gameId) {
    const g = this.stats().perGame[gameId];
    return { started: (g && g.started) || 0, won: (g && g.won) || 0 };
  },

  _bump(gameId, field) {
    const s = this.stats();
    if (field === 'started') s.totalGamesStarted++; else s.totalGamesWon++;
    const g = s.perGame[gameId] || (s.perGame[gameId] = { started: 0, won: 0 });
    g[field]++;
    try { localStorage.setItem(this._key, JSON.stringify(s)); } catch (e) {}
  },

  // ───── iç uçlar ─────
  _start(p) {
    if (!p.gameId) return;
    // Değişmez 2: açık tur varsa terk edilmiş sayılır.
    if (this._open) this._end({ gameId: this._open.gameId, result: 'quit' });
    this._open = { gameId: p.gameId, startedAt: Date.now() };
    this._bump(p.gameId, 'started');
    this._dispatch('game_started', { gameId: p.gameId });
  },

  _end(p) {
    if (!p.gameId) return;
    const open = this._open;
    const stray = !open || open.gameId !== p.gameId;
    this._open = null;
    // Kapanan turun başlangıcı saklanıyor: reklamla "devam et" bu turu geri
    // açıyor ve süresi baştan başlamamalı.
    if (open) this._lastRound = open;
    // Süre MERKEZDE hesaplanıyor: her oyunun kendi zamanlayıcısını olaya
    // taşıması gereksiz tekrar olurdu. Oyun açıkça verirse o kazanır
    // (kendi ölçümü daha anlamlı olabilir).
    const durationMs = p.durationMs != null ? p.durationMs
                     : (open ? Date.now() - open.startedAt : null);
    const ev = { gameId: p.gameId, result: p.result || 'quit' };
    if (p.score != null) ev.score = p.score;
    if (durationMs != null) ev.durationMs = durationMs;
    if (stray) ev.stray = true;

    if (stray) {
      // Değişmez 3. Sessizce yutmuyoruz: bu neredeyse her zaman yanlış
      // bağlanmış bir oyun demektir ve tek görünür işareti burasıdır.
      console.warn('[GameEvents] açık tur yokken game_ended:', ev.gameId, ev.result);
    } else if (ev.result === 'won') {
      this._bump(p.gameId, 'won');
    }
    this._dispatch('game_ended', ev);
  },

  // Reklam/elmasla "devam et": tur BİTMEDİ, yeniden açılıyor. Yeni bir
  // game_started YAYINLANMIYOR — oyuncu tek tur oynadı, iki tur değil.
  // startedAt korunuyor ki süre oturumun gerçeğini söylesin.
  reopen(gameId, startedAt) {
    if (!gameId) return;
    const last = this._lastRound;
    this._open = {
      gameId,
      startedAt: startedAt || (last && last.gameId === gameId ? last.startedAt : Date.now()),
    };
  },

  // Oyundan çıkış — açık tur varsa 'quit' ile kapanır. Açık tur yoksa
  // (oyun zaten bitmiş, game-over kutusundan çıkılıyor) hiçbir şey olmaz.
  abandon() {
    if (this._open) this._end({ gameId: this._open.gameId, result: 'quit' });
  },

  openRound() { return this._open; },

  _dispatch(eventName, ev) {
    const subs = this._subs[eventName];
    if (!subs) return;
    // Kopya üzerinde geziliyor: bir dinleyici yayın sırasında abonelikten
    // çıkarsa dizi altımızdan kaymasın.
    subs.slice().forEach(cb => {
      // Bir abonenin hatası oyunu ASLA düşürmemeli — bu sistem oynanışın
      // yanında duruyor, önünde değil.
      try { cb(ev); } catch (e) { console.warn('[GameEvents] dinleyici hatası', e); }
    });
  },
};

// ==================== GÜNLÜK REKLAM BÜTÇESİ ====================
//
// TEK havuz. Reklamla elmas, reklamla devam, reklamla ipucu, reklamla +1
// geri alma ve reklamla 2x skor — HEPSİ aynı 3 haktan düşer, her aksiyonun
// kendi sayacı YOK.
//
// Neden tek havuz: oyuncu 3 hakkını elmas kazanmaya harcarsa game-over'da
// reklamla devam edemez, biriktirdiği elmasla devam eder. Elmas biriktirmek
// ilk kez gerçekten bir işe yarıyor. Ayrı sayaçlar (3 elmas-hakkı + 3
// devam-hakkı gibi) hem kodu hem UI'ı ikiye katlar, karşılığında hiçbir şey
// kazandırmaz.
//
// Günlük sıfırlama, StreakSystem.checkIn()'deki desenin AYNISI:
// toDateString() karşılaştırması. Yeni bir tarih deseni icat edilmedi —
// iki sistem farklı şekilde "gün" tanımlarsa biri sıfırlanırken diğeri
// sıfırlanmaz ve hata ancak gece yarısı görünür.
const AdBudget = {
  _key: 'ph_ad_budget',

  getData() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { return {}; }
  },

  _today() { return new Date().toDateString(); },

  // Sıfırlama TEMBEL: gece yarısını bekleyen bir zamanlayıcı yok (uygulama
  // kapalıysa çalışmazdı zaten). Kayıtlı tarih bugün değilse sayaç 0 kabul
  // edilir; ilk consume() kaydı bugüne çevirir.
  used() {
    const d = this.getData();
    return d.date === this._today() ? (d.used || 0) : 0;
  },

  limit() { return EconomyConfig.AD_DAILY_LIMIT; },

  remaining() { return Math.max(0, this.limit() - this.used()); },

  // Premium bütçeye TABİ DEĞİL (bkz. runRewardedAction: reklam hiç
  // gösterilmiyor, dolayısıyla harcanacak bir hak da yok).
  canWatch() {
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return true;
    return this.remaining() > 0;
  },

  // SADECE reklam başarıyla tamamlandığında çağrılır (RewardedAd.show'un
  // onComplete'i içinde). Reklamı açıp kapatan oyuncudan hak düşmez.
  consume() {
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return;
    try {
      localStorage.setItem(this._key, JSON.stringify({
        date: this._today(), used: this.used() + 1
      }));
    } catch (e) {}
    this.updateUI();
  },

  // Oyuncu bütçesini GÖRMELİ, yoksa "hakkım bitti" sürprizi olur ve
  // bilinçli seçim (reklam mı, elmas mı) yapamaz.
  label() {
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return '👑 Plus: sınırsız';
    const left = this.remaining();
    if (left === 0) return '📺 Yarın tekrar gel';
    return '📺 ' + left + '/' + this.limit() + ' reklam hakkın kaldı';
  },

  // Oyun içi küçük rozetler için kısa hâl — uzun cümle 28px'lik bir
  // aksiyon düğmesine sığmıyor, ama sayının GÖRÜNMESİ şart.
  shortLabel() {
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return '👑';
    const left = this.remaining();
    // Bütçe bittiğinde rozet elmas bedeline dönüşüyor: aksiyon hâlâ
    // mümkün, sadece bedeli değişti.
    return left > 0 ? '📺' + left : '💎';
  },

  // AvatarSystem ile aynı sözleşme: niteliği taşıyan her öğe doldurulur,
  // yeni bir gösterim noktası için yeni kod gerekmez.
  updateUI() {
    const txt = this.label();
    document.querySelectorAll('[data-ph-ad-budget]').forEach(el => { el.textContent = txt; });
    document.querySelectorAll('.shop-free-item [data-ph-ad-budget]').forEach(el => {
      const row = el.closest('.shop-free-item');
      if (row) row.classList.toggle('sfi-off', !this.canWatch());
    });
    const short = this.shortLabel();
    document.querySelectorAll('[data-ph-ad-budget-short]').forEach(el => { el.textContent = short; });
    refreshGameOverOffers();
  }
};

// ==================== ÖDÜLLÜ REKLAM ====================

const RewardedAd = {
  // Simulated rewarded ad — will be replaced with real SDK later
  show(reward, onComplete) {
    // Create ad modal
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-modal">
        <div class="ad-header">📺 Ödüllü Video</div>
        <div class="ad-body">
          <div class="ad-reward-preview">${reward.icon} ${reward.text}</div>
          <div class="ad-timer">
            <div class="ad-timer-bar"><div class="ad-timer-fill"></div></div>
            <span class="ad-timer-text">Reklam simülasyonu: 3 saniye</span>
          </div>
        </div>
        <button class="ad-skip" style="display:none">Kapat ✕</button>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Simulate 3 second ad
    const fill = overlay.querySelector('.ad-timer-fill');
    fill.style.transition = 'width 3s linear';
    requestAnimationFrame(() => fill.style.width = '100%');
    
    setTimeout(() => {
      const skipBtn = overlay.querySelector('.ad-skip');
      skipBtn.style.display = 'block';
      skipBtn.addEventListener('click', () => {
        overlay.remove();
        if (onComplete) onComplete();
      });
    }, 3000);
  },
  
  // showForDiamonds() / showForContinue() KALDIRILDI (2026-07-30).
  // İkisi de RewardedAd.show'u doğrudan sarıyordu, yani günlük bütçeye
  // uğramayan bir yan kapıydı — bütçe sistemi kurulduktan sonra bunları
  // bırakmak, ileride birinin farkında olmadan sınırsız reklam yolunu
  // yeniden açması demekti. Reklam-ödül akışlarının TEK girişi artık
  // runRewardedAction(); show() ise yalnızca onun kullandığı alt katman.
};

// ==================== REKLAM-ÖDÜL KAPISI ====================
//
// Reklamla ödül veren HER aksiyonun tek geçiş noktası. Üç kural burada,
// bir kez yazılıyor — çağrı noktalarına dağıtılsaydı biri güncellenir,
// diğerleri sessizce eski kalırdı (bütçesiz reklam hatasının kaynağı
// tam olarak buydu).
//
//   1. Premium  → reklam GÖSTERİLMEZ, bütçeye BAKILMAZ, ödül anında verilir
//   2. Bütçe 0  → reklam gösterilmez, ödül verilmez, false döner
//   3. Normal   → reklam gösterilir; TAMAMLANIRSA bütçeden 1 düşer + ödül
//
// Dönüş değeri "ödül akışı başladı mı" demektir, "ödül verildi mi" DEMEZ:
// reklam asenkron. Çağıran tarafın ödül anında iş yapması gerekiyorsa
// onReward içine yazmalı.
function runRewardedAction(reward, onReward) {
  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    onReward();
    return true;
  }
  // UI zaten devre dışı bırakılmış olmalı; bu savunma katmanı (oyun
  // içinden doğrudan çağrılan yollar için).
  if (!AdBudget.canWatch()) {
    showToast('📺 Bugünkü reklam hakkın bitti — yarın tekrar gel!');
    return false;
  }
  RewardedAd.show(reward, () => {
    AdBudget.consume();
    onReward();
  });
  return true;
}

// Reklam VEYA elmas seçeneği sunan paylaşımlı teklif penceresi.
// games.js'ten de çağrılır (ipucu), bu yüzden kabukta duruyor: her oyun
// kendi pencere dilini icat etmesin. Kullanılan sınıflar components.css'in
// paylaşımlı .ph-modal ailesi.
//
// opts: { title, adText, gemCost, gemText, onGrant(source) }
// gemCost verilmezse elmas satırı hiç çizilmez (skor 2x böyle: elmasla
// skor satın alınmaz — bkz. doubleScoreWithAd).
function offerRewardChoice(opts) {
  const gemCost = opts.gemCost;
  const plus = (typeof PlusSystem !== 'undefined') && PlusSystem.isActive();
  const adOk = AdBudget.canWatch();
  const balance = DiamondSystem.get();
  const gemOk = gemCost != null && balance >= gemCost;

  const scrim = document.createElement('div');
  scrim.className = 'ph-modal-scrim';
  const panel = document.createElement('div');
  panel.className = 'ph-modal ph-modal-enter';
  panel.innerHTML =
    '<div class="ph-offer">' +
      '<div class="ph-offer-title"></div>' +
      '<button class="ph-offer-btn primary" data-a="ad"' + (adOk ? '' : ' disabled') + '>' +
        (plus ? '👑 ' : '📺 ') + (opts.adText || 'Reklam İzle') +
      '</button>' +
      '<div class="ph-offer-budget" data-ph-ad-budget></div>' +
      (gemCost != null
        ? '<button class="ph-offer-btn" data-a="gem"' + (gemOk ? '' : ' disabled') + '>💎 ' +
            gemCost + ' → ' + (opts.gemText || 'Al') + '</button>' +
          '<div class="ph-offer-balance">Bakiyen: 💎 ' + balance.toLocaleString() + '</div>'
        : '') +
      '<button class="ph-offer-btn" data-a="no">Vazgeç</button>' +
    '</div>';
  // Başlık textContent ile: oyun adı/etiketi HTML olarak yorumlanmasın.
  panel.querySelector('.ph-offer-title').textContent = opts.title || 'Yardım';
  panel.querySelector('[data-ph-ad-budget]').textContent = AdBudget.label();
  scrim.appendChild(panel);
  document.body.appendChild(scrim);

  const close = () => scrim.remove();
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('.ph-offer-btn');
    if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'no') { close(); return; }
    if (a === 'gem') {
      if (DiamondSystem.spend(gemCost)) { close(); opts.onGrant('diamond'); }
      return;
    }
    close();
    runRewardedAction({ icon: '🎁', text: opts.adText || 'Ödül' }, () => opts.onGrant('ad'));
  });
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
}

// ==================== PLUS SİSTEMİ ====================

const PlusSystem = {
  _key: 'ph_plus',
  
  getData() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch(e) { return {}; }
  },
  
  isActive() {
    const data = this.getData();
    if (!data.active) return false;
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      // Expired
      this.deactivate();
      return false;
    }
    return true;
  },
  
  activate(plan) {
    const data = { active: true, plan: plan, activatedAt: new Date().toISOString() };
    const now = new Date();
    if (plan === 'weekly') now.setDate(now.getDate() + 7);
    else if (plan === 'monthly') now.setMonth(now.getMonth() + 1);
    else if (plan === 'yearly') now.setFullYear(now.getFullYear() + 1);
    data.expiresAt = now.toISOString();
    localStorage.setItem(this._key, JSON.stringify(data));
    this.updateUI();
  },
  
  deactivate() {
    localStorage.removeItem(this._key);
    this.updateUI();
  },
  
  updateUI() {
    const badge = document.getElementById('plus-badge');
    if (badge) {
      if (this.isActive()) {
        badge.classList.add('plus-active');
        badge.querySelector('.plus-text').textContent = 'PLUS ✓';
      } else {
        badge.classList.remove('plus-active');
        badge.querySelector('.plus-text').textContent = 'PLUS';
      }
    }
  }
};

// ==================== TEMA ALTYAPISI (Premium kilidi) ====================
//
// Bu tur GERÇEK bir tema EKLEMİYOR — görseller/token setleri yok. Eklenen
// tek şey, Premium kilidinin NEREYE oturacağı: `plusOnly` bayrağı ve tek
// bir kapı (`ThemeSystem.apply`). Kilit tema geldiğinde yazılsaydı, kontrol
// büyük ihtimalle tema seçicinin içine gömülür ve ikinci bir giriş yolu
// (derin bağlantı, ayarlar, kayıtlı tercih) onu atlardı.
//
// 'tapinak' rezerve slot: --ph-stone-* token'ları onun için duruyor
// (bkz. CLAUDE.md §5). ready:false → henüz uygulanamaz.
const ThemeSystem = {
  _key: 'ph_theme',
  DEFAULT: 'gece',

  THEMES: [
    { id: 'gece',    name: 'Gece Moru',      plusOnly: false, ready: true  },
    { id: 'tapinak', name: 'Gölge Tapınak',  plusOnly: true,  ready: false },
  ],

  find(id) { return this.THEMES.find(t => t.id === id) || null; },

  get() {
    let id;
    try { id = localStorage.getItem(this._key); } catch (e) {}
    // Kayıtlı tema kilitlenmişse (abonelik bitti) varsayılana düşülür —
    // aksi hâlde iptal eden kullanıcı Premium temayı kullanmaya devam eder.
    return (id && !this.isLocked(id) && this.find(id)) ? id : this.DEFAULT;
  },

  isLocked(id) {
    const t = this.find(id);
    if (!t || !t.plusOnly) return false;
    return !PlusSystem.isActive();
  },

  // Tema seçicinin TEK giriş noktası. Bugün çağıran yok (seçici yok);
  // seçici geldiğinde kilidi yeniden düşünmek yerine bunu çağıracak.
  apply(id) {
    const t = this.find(id);
    if (!t) return false;
    if (this.isLocked(id)) {
      showToast('👑 Bu tema Plus üyeliğe özel');
      showPlusPage();
      return false;
    }
    if (!t.ready) { showToast('🎨 Bu tema yakında'); return false; }
    try { localStorage.setItem(this._key, id); } catch (e) {}
    return true;
  }
};

let _selectedPlan = 'yearly';

function selectPlan(plan) {
  _selectedPlan = plan;
  document.querySelectorAll('.plus-plan').forEach(p => {
    p.classList.toggle('selected', p.dataset.plan === plan);
  });
}

function purchasePlus() {
  if (PlusSystem.isActive()) {
    showToast('⭐ Zaten Plus üyesisin!');
    return;
  }
  // Placeholder — gerçek ödeme entegrasyonu sonra
  showToast('👑 Plus üyelik yakında aktif olacak!');
}

function showPlusPage() {
  document.getElementById('bottom-tabs').style.display = 'none';
  showScreen('screen-plus');
}

function closePlusPage() {
  document.getElementById('bottom-tabs').style.display = 'flex';
  switchTab(currentTab || 'home');
}

// ==================== ELMAS MAĞAZASI ====================

const DIAMOND_PACKAGES = [
  { id: 'small', amount: 100, price: '₺19.99', bonus: 0, badge: null },
  { id: 'medium', amount: 500, price: '₺79.99', bonus: 50, badge: 'Popüler' },
  { id: 'large', amount: 1500, price: '₺199.99', bonus: 300, badge: null },
  { id: 'mega', amount: 5000, price: '₺499.99', bonus: 1500, badge: 'En İyi! ⭐' },
];

// `soon: true` → sistem henüz YOK. Satır duruyor (mağazanın ne vaat edeceği
// belli) ama ödül miktarı yerine "Yakında" yazıyor: envanter çıkarıldı,
// günlük görev takibi (DAILY_MISSIONS statik, hiçbir sayaç yazılmıyor) ve
// başarım sistemi (showAchievements yalnızca toast atıyor) gerçekten yok.
// Var olmayan bir ödülü sayı olarak yazmak yanlış vaattir.
// `dynamic:'ad'` → açıklaması AdBudget'tan geliyor, sabit metin değil:
// Reklam hakkı metnini ayrı yazıp kodu sınırsız bırakan eski hâlin sebebi tam olarak
// metnin koddan bağımsız olmasıydı.
const FREE_DIAMOND_SOURCES = [
  { icon: '📺', title: 'Reklam İzle', desc: '', reward: '+10💎', action: 'watchAdForDiamonds', dynamic: 'ad' },
  { icon: '🎯', title: 'Günlük Görevler', desc: 'Görev sistemi hazırlanıyor', reward: 'Yakında', action: 'goToHome', soon: true },
  { icon: '📅', title: 'Günlük Ödül', desc: 'Her gün giriş yap', reward: '+5-100💎', action: 'goToHome' },
  { icon: '🏆', title: 'Başarımlar', desc: 'Başarım sistemi hazırlanıyor', reward: 'Yakında', action: 'showAchievements', soon: true },
];

function openShop() {
  document.getElementById('bottom-tabs').style.display = 'none';
  renderShop();
  showScreen('screen-shop');
}

function closeShop() {
  document.getElementById('bottom-tabs').style.display = 'flex';
  switchTab(currentTab || 'home');
}

function renderShop() {
  // Packages grid
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = DIAMOND_PACKAGES.map(pkg => {
    const totalAmount = pkg.amount + pkg.bonus;
    return `
      <div class="shop-package ${pkg.badge === 'En İyi! ⭐' ? 'shop-best' : ''} ${pkg.badge === 'Popüler' ? 'shop-popular' : ''}" onclick="buyPackage('${pkg.id}')">
        ${pkg.badge ? '<div class="shop-badge">' + pkg.badge + '</div>' : ''}
        <span class="shop-pkg-icon">💎</span>
        <span class="shop-pkg-amount">${pkg.amount.toLocaleString()}</span>
        ${pkg.bonus > 0 ? '<span class="shop-pkg-bonus">+' + pkg.bonus + ' BONUS</span>' : ''}
        <button class="shop-pkg-price">${pkg.price}</button>
      </div>
    `;
  }).join('');
  
  // Free sources
  const free = document.getElementById('shop-free');
  free.innerHTML = FREE_DIAMOND_SOURCES.map(src => {
    // Reklam satırı bütçeyi GÖSTERİR ve bütçe bittiğinde pasifleşir —
    // tıklanıp "hakkın bitti" toast'ı yemek yerine durum baştan görünür.
    const adRow = src.dynamic === 'ad';
    const spent = adRow && !AdBudget.canWatch();
    const desc = adRow ? AdBudget.label() : src.desc;
    const disabled = spent || src.soon;
    const cls = 'shop-free-item' + (disabled ? ' sfi-off' : '');
    const action = disabled ? 'aria-disabled="true"' : 'onclick="' + src.action + '()"';
    return `
    <div class="${cls}" ${action}>
      <span class="sfi-icon">${src.icon}</span>
      <div class="sfi-info">
        <span class="sfi-title">${src.title}</span>
        <span class="sfi-desc"${adRow ? ' data-ph-ad-budget' : ''}>${desc}</span>
      </div>
      <span class="sfi-reward">${src.reward}</span>
    </div>
  `;
  }).join('');

  DiamondSystem.updateUI();
}

function buyPackage(id) {
  showToast('💎 Satın alma yakında!');
}

function watchAdForDiamonds() {
  const amount = EconomyConfig.AD_DIAMOND_REWARD;
  const ok = runRewardedAction(
    { icon: '💎', text: amount + ' Elmas Kazan!' },
    () => DiamondSystem.addReward(amount, 'Reklam ödülü!')
  );
  // Mağaza satırının açıklaması ("Bugün 2/3 hakkın kaldı") anında
  // güncellenmeli; reklam bittiğinde AdBudget.consume() zaten tetikliyor
  // ama bütçe doluysa satırın pasifleşmesi de görünmeli.
  if (!ok) renderShop();
}

function goToHome() {
  closeShop();
  switchTab('home');
}

function showAchievements() {
  showToast('🏆 Başarımlar yakında!');
}

// ==================== DURUM ====================
let currentScreen = 'home';
let currentTab = 'home';
let currentCategory = null;
let currentFilter = 'Tümü';

// ==================== NAVIGASYON ====================

function switchTab(tabName) {
  // Tab butonları
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  // Önceki tab'dan çıkış (Reels cleanup)
  if (currentTab === 'discover' && tabName !== 'discover') {
    if (window.ReelsEngine) ReelsEngine.cleanup();
  }

  // Ekranları göster
  const screenId = 'screen-' + tabName;
  showScreen(screenId);
  currentTab = tabName;
  // UI ses efekti
  if (typeof GameAudio !== 'undefined') { GameAudio.play('tab'); GameAudio.haptic('micro'); }

  // Tab tabanlı render
  if (tabName === 'discover') {
    if (window.ReelsEngine) {
      const container = document.getElementById('screen-discover');
      container.innerHTML = '';
      ReelsEngine.init(container);
    }
  }
  // 'lider' sekmesi artık İLERLEME ekranını gösteriyor. renderLeaderboard()
  // silinmedi, yalnızca çağrılmıyor — bkz. index.html #lider-legacy.
  if (tabName === 'lider') renderProgress();
  if (tabName === 'profil') { renderSettings(); renderFavorites(); }
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  currentScreen = screenId;
}

function goBack() {
  switchTab(currentTab || 'home');
}

// ==================== DONANIM GERİ TUŞU (Android) ====================
//
// Capacitor 7'nin BridgeActivity'si donanım geri tuşunu ele almaz: AndroidX
// varsayılanı Activity'yi doğrudan bitirir — yani oyunun ortasında geri'ye
// basan oyuncu TÜM uygulamadan çıkardı.
//
// Native taraf (MainActivity.java) geri tuşunu buradaki __phHandleBack'e
// delege eder; biz uygulama içinde bir adım geri gideriz. Ana ekran kökünde
// iki kez basış (2 sn içinde) native köprü PHNativeBack.exit() ile uygulamadan
// çıkar. history.pushState'e GÜVENİLMİYOR: eski WebView'lerde (ör. Android 9)
// pushState girişleri WebView.canGoBack() geçmişine yansımıyor.
let _backExitPrimed = false;
let _backExitTimer = null;

function __phHandleBack() {
  // 1) Ödüllü reklam overlay'i açıksa geri'yi yoksay (mock akışı bozmayalım)
  if (document.querySelector('.ad-overlay')) return;

  // 2) Kazanma/kaybetme ekranı görünürse oyundan çık
  const go = document.getElementById('game-over');
  if (go && go.style.display === 'flex') { exitGame(); return; }

  // 3) Oyun / Plus / Mağaza alt ekranları → bir üst ekrana dön
  if (currentScreen === 'screen-game') { exitGame(); return; }
  if (currentScreen === 'screen-plus') { closePlusPage(); return; }
  if (currentScreen === 'screen-shop') { closeShop(); return; }

  // 4) Ana dışı sekme (Keşfet/Skorlar/Profil) → Ana sekmeye dön
  if (currentTab !== 'home') { switchTab('home'); return; }

  // 5) Ana ekran kökü → çıkmak için iki kez geri
  if (_backExitPrimed) {
    _backExitPrimed = false;
    clearTimeout(_backExitTimer);
    if (window.PHNativeBack && typeof PHNativeBack.exit === 'function') {
      PHNativeBack.exit();
    }
    return;
  }
  _backExitPrimed = true;
  showToast("↩︎ Çıkmak için tekrar geri'ye basın");
  clearTimeout(_backExitTimer);
  _backExitTimer = setTimeout(() => { _backExitPrimed = false; }, 2000);
}
// Native köprünün erişebilmesi için global'e bağla.
window.__phHandleBack = __phHandleBack;

// ==================== RENDER: ANA SAYFA ====================

// Header'daki seri rozeti tek yerden güncellenir — ödül alındığında
// sayının anında değişmesi için claimDailyReward de bunu çağırıyor.
function updateStreakUI() {
  const n = StreakSystem.getCount();
  const el = document.getElementById('hdr-streak');
  if (el) el.textContent = n || '0';
}

function renderHome() {
  if (typeof renderDailyChallenge === 'function') renderDailyChallenge();
  renderDailyRewards();
  renderFavorites();
  renderMissions();
}

function renderDailyRewards() {
  const container = document.getElementById('daily-rewards');
  const streakData = StreakSystem.getData();
  const today = new Date().toDateString();
  const alreadyClaimed = streakData.lastDate === today;
  const currentDayIdx = StreakSystem.getDayInWeek();
  
  // Mockup panel 1 "7 Günlük Seri": alınmış günler yeşil ✓, bugün dolu mor
  // daire içinde gün numarası, kalanlar sadece çerçeve.
  // Elmas miktarı etiketi mockup'ta yok — kaldırıldı, tablo yerinde duruyor
  // (claimDailyReward hâlâ oradan okuyor).
  //
  // ✓ YALNIZCA GERÇEKTEN GİRİŞ YAPILAN GÜNE VERİLİR (2026-07-29 kararı).
  // Eskiden koşul `i < currentDayIdx` idi: bugünden önceki HER gün, ödül
  // alınmış olsun olmasın işaretleniyordu. Bu, hafta satırının "2 gün
  // tamamlandı" derken İlerleme ekranının "0 Gün Seri" demesine yol
  // açıyordu — aynı veriden iki farklı hikâye.
  const claimed = StreakSystem.claimedDays();
  // Bu haftanın Pazartesi'si: bugünden, haftadaki sıra kadar geri.
  const monday = new Date();
  monday.setDate(monday.getDate() - currentDayIdx);

  container.innerHTML = DAILY_REWARD_TABLE.map((reward, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const done = claimed.has(StreakSystem.dayKey(d));
    const isToday = i === currentDayIdx;
    let cls = 'sw-day';
    let mark;

    if (done) {
      cls += ' sw-done';
      mark = '✓';
    } else if (isToday) {
      cls += ' sw-today';
      mark = String(i + 1);
    } else {
      cls += ' sw-future';
      mark = String(i + 1);
    }

    const claimable = !alreadyClaimed && isToday;
    return `<div class="sw-cell">
      <div class="${cls}" ${claimable ? 'onclick="claimDailyReward()"' : ''}>${mark}</div>
      <span class="sw-label">${reward.day}</span>
    </div>`;
  }).join('');
}

function renderFavorites() {
  // Favori ID'leri al
  let favIds = [];
  try { favIds = JSON.parse(localStorage.getItem('gh_fav')||'[]'); } catch(e){}
  
  // REEL_GAMES'den bilgileri çek
  const favGames = favIds.map(id => {
    if (window.REEL_GAMES) {
      const rg = REEL_GAMES.find(r => r.id === id);
      if (rg) return { id:rg.id, name:rg.name, emoji:rg.emoji, gradient:rg.gradient };
    }
    return null;
  }).filter(Boolean);
  
  const emptyHTML = `
    <div style="text-align:center;padding:14px 12px;color:#9a9ab0;font-size:13px;">
      <span style="font-size:20px;">💫</span>
      <div style="margin-top:4px;">Henüz favori oyunun yok</div>
      <div style="margin-top:4px;color:#c084fc;font-size:12px;cursor:pointer" onclick="switchTab('discover')">
        Keşfet'e git ve ❤️ ile favorile →
      </div>
    </div>`;
  
  // Mockup panel 4: kare ikon karoları (isim yok, sadece oyun ikonu).
  const badgeHTML = favGames.map((g, i) => `
    <div class="pf-fav anim-in" style="animation-delay:${i*40}ms;background:linear-gradient(135deg,${g.gradient[0]},${g.gradient[1]})"
         onclick="playGameById('${g.id}')" title="${g.name}">
      <span class="pf-fav-emoji">${g.emoji}</span>
    </div>
  `).join('');

  // Ana sayfa container'ı mockup'ta YOK — kaldırıldı. Guard duruyor ki
  // ileride geri gelirse tek satırla çalışsın.
  const homeContainer = document.getElementById('fav-games');
  if (homeContainer) {
    homeContainer.innerHTML = favGames.length === 0 ? emptyHTML : badgeHTML;
  }

  // Profil container (fav-games-list)
  const profileContainer = document.getElementById('fav-games-list');
  if (profileContainer) {
    profileContainer.innerHTML = favGames.length === 0
      ? '<p class="pf-fav-empty" onclick="switchTab(\'discover\')">❤️ Keşfet\'ten favorilerine ekle →</p>'
      : badgeHTML;
  }
}

// ==================== RENDER: GÖREVLER ====================

function renderMissions() {
  // Haftalık liste artık ana sayfada yok (mockup'ta yerine ödül sandığı var).
  renderMissionList('daily-missions', DAILY_MISSIONS);
}

function renderMissionList(containerId, missions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = missions.map((m, i) => `
    <div class="ms-row anim-in" style="animation-delay:${i * 60}ms">
      <span class="ms-icon ms-${m.tone}">${m.icon}</span>
      <div class="ms-body">
        <span class="ms-name">${m.name}</span>
        <div class="ms-bar"><div class="ms-fill" style="width:${(m.progress / m.total) * 100}%"></div></div>
      </div>
      <span class="ms-count">${m.progress} / ${m.total}</span>
    </div>
  `).join('');
}

// TODO: görev takibi kurulunca "tüm görevler tamamlandı mı" koşuluna ve
// gerçek ödül verme akışına bağlanacak. Bugün sandık dekoratif.
function claimWeeklyReward() {
  showToast('🎁 Haftalık ödül yakında!');
}

// ==================== RENDER: İLERLEME ====================
//
// Mockup panel 3'ün birebir karşılığı. Ekrandaki değerlerin ÇOĞU şu an
// STATİK — arkalarındaki sistemler (rozet, koleksiyon, başarım) henüz
// kurulmadı. Bu bilinçli bir geliştirme-build kararı: canlı kullanıcı yok,
// amaç tasarımı cihazda görmek. Her placeholder'ın başında TODO var.
//
// GERÇEK VERİYE BAĞLI OLAN: "Seri" kutusu (StreakSystem).
//
// SİSTEMİ OLMAYANLAR (hepsi TODO ile işaretli):
//   • Rozet sayısı, koleksiyon yüzdesi, Oyun Başarımları çipleri,
//     Son Kazanılan Rozetler → rozet/başarım sistemi yok.
//   • "Oyun Denedi" → gh_plays_* SADECE Keşfet akışından artıyor
//     (reels.js), ana sayfadan oynanan sayılmıyor; gerçek değeri
//     bağlamak yanlış toplam gösterirdi. Payda (10) oynanabilir oyun
//     sayısı, o gerçek.
//
// NOT: bu ekran daha önce gerçek bölüm/rekor verisi gösteriyordu
// (ph_watersort_level, ph_screw_level, bp_hi, gh_hi_game2048). Mockup'ta
// o bölüm yok. Veriler yerinde duruyor ve okunabilir — rozet sistemi
// gelince "Oyun Başarımları" çubuklarının gerçek paydası olabilirler.

// TODO: rozet sistemi kurulunca gerçek veriye bağlanacak.
// Mockup panel 3'teki üç kart birebir.
const ACHIEVEMENT_CARDS = [
  { name:'Bulmaca Blokları', emoji:'🧱', grad:['#7c3aed','#5b21b6'], pct:62,
    chips:[{ icon:'🧩', label:'Satır Ustası', val:'10/10' }, { icon:'🎖️', label:'Renk Mimarı', val:'12/20' }] },
  { name:'Sudoku', emoji:'🔢', grad:['#1d4ed8','#1e3a8a'], pct:55,
    chips:[{ icon:'🧩', label:'Zihin Kıvılcımı', val:'10/10' }, { icon:'🎖️', label:'Sessiz Çözümcü', val:'12/20' }] },
  { name:'Kelime Avı', emoji:'🔍', grad:['#0891b2','#155e75'], pct:48,
    chips:[{ icon:'🧩', label:'Kelime Dedektifi', val:'10/10' }, { icon:'🎖️', label:'Harf Şampiyonu', val:'12/20' }] },
];

// TODO: rozet sistemi kurulunca gerçek veriye bağlanacak.
const RECENT_BADGES = [
  { icon:'🔟', tone:'blue' },
  { icon:'🧩', tone:'purple' },
  { icon:'👑', tone:'gold' },
  { icon:'🔥', tone:'red' },
];

function renderProgress() {
  const container = document.getElementById('progress-content');
  if (!container) return;

  const streak = StreakSystem.getCount();

  const tiles = [
    // TODO: oynanan oyun takibi kurulunca gerçek veriye bağlanacak
    { icon:'🎮', value:'10/10',        label:'Oyun Denedi' },
    // TODO: rozet sistemi kurulunca gerçek veriye bağlanacak
    { icon:'🛡️', value:'18',           label:'Rozet' },
    { icon:'🔥', value:streak + ' Gün', label:'Seri' },
    // TODO: koleksiyon tanımı + sistemi kurulunca gerçek veriye bağlanacak
    { icon:'🧩', value:'%72',          label:'Koleksiyon' },
  ];

  const tilesHTML = tiles.map((t, i) => `
    <div class="prg-tile anim-in" style="animation-delay:${i*50}ms">
      <span class="prg-tile-icon">${t.icon}</span>
      <span class="prg-tile-val">${t.value}</span>
      <span class="prg-tile-lbl">${t.label}</span>
    </div>
  `).join('');

  const achHTML = ACHIEVEMENT_CARDS.map((a, i) => `
    <div class="ach-card anim-in" style="animation-delay:${i*60}ms">
      <span class="ach-icon" style="background:linear-gradient(135deg,${a.grad[0]},${a.grad[1]})">${a.emoji}</span>
      <div class="ach-body">
        <span class="ach-name">${a.name}</span>
        <div class="ach-chips">
          ${a.chips.map(c => `
            <span class="ach-chip">
              <span class="ach-chip-icon">${c.icon}</span>
              <span class="ach-chip-text">
                <span class="ach-chip-label">${c.label}</span>
                <span class="ach-chip-val">${c.val}</span>
              </span>
            </span>`).join('')}
        </div>
        <div class="ach-bar"><div class="ach-fill" style="width:${a.pct}%"></div></div>
      </div>
    </div>
  `).join('');

  const badgesHTML = RECENT_BADGES.map((b, i) => `
    <span class="rb-badge rb-${b.tone} anim-in" style="animation-delay:${i*60}ms">${b.icon}</span>
  `).join('');

  container.innerHTML = `
    <div class="prg-hero">
      <div class="prg-avatar" data-ph-avatar></div>
      <span class="prg-hero-name">Oyuncu</span>
    </div>

    <div class="prg-stats">${tilesHTML}</div>

    <div class="section">
      <h3 class="section-title">Oyun Başarımları</h3>
      ${achHTML}
    </div>

    <div class="section">
      <h3 class="section-title">Son Kazanılan Rozetler</h3>
      <div class="rb-row">${badgesHTML}</div>
    </div>
  `;

  // Hero avatarı innerHTML ile YENİ oluşturuldu — tek kaynaktan doldur.
  AvatarSystem.updateUI();
}

// ==================== RENDER: LİDER ====================
//
// ŞU AN ÇAĞRILMIYOR. 'lider' sekmesi İlerleme ekranını gösteriyor
// (bkz. switchTab). Fonksiyon ve LEADERBOARD dizisi bilerek duruyor:
// bu verinin nereye taşınacağına karar verilmedi ve geri dönüşün ucuz
// kalması isteniyor. Okuduğu #lider-podium/#lider-list kapsayıcıları
// index.html'de gizli olarak duruyor, yani çağrıldığı an çalışır.
function renderLeaderboard() {
  const sorted = [...LEADERBOARD].sort((a,b) => b.score - a.score);

  // Podyum (ilk 3)
  const podium = document.getElementById('lider-podium');
  const medals = ['🥇','🥈','🥉'];
  const classes = ['gold','silver','bronze'];
  podium.innerHTML = sorted.slice(0,3).map((p, i) => `
    <div class="podium-item ${classes[i]} anim-in" style="animation-delay:${i*100}ms">
      <span class="podium-medal">${medals[i]}</span>
      <span class="podium-avatar">${p.avatar}</span>
      <span class="podium-name">${p.name}</span>
      <span class="podium-score">${p.score.toLocaleString()}</span>
    </div>
  `).join('');

  // Liste (4+)
  const list = document.getElementById('lider-list');
  list.innerHTML = sorted.slice(3).map((p, i) => `
    <div class="lider-row anim-in" style="animation-delay:${(i+3)*60}ms">
      <span class="lider-rank">#${i+4}</span>
      <span class="lider-avatar">${p.avatar}</span>
      <span class="lider-name">${p.name === 'Sen' ? '⭐ Sen' : p.name}</span>
      <span class="lider-score-badge">${p.score.toLocaleString()}</span>
    </div>
  `).join('');
}

// ==================== RENDER: AYARLAR ====================

function renderSettings() {
  const container = document.getElementById('settings-list');
  if (!container) return;
  container.innerHTML = SETTINGS.map((s, i) => {
    // fn varsa doğrudan çalıştırılır; yoksa action toast olarak gösterilir.
    const act = s.fn ? s.fn : `showToast('${s.action}')`;
    return `
    <button class="setting-row anim-in" style="animation-delay:${i*40}ms" onclick="${act}">
      <span class="sr-left"><span class="sr-icon">${s.icon}</span>${s.label}</span>
      <span class="sr-arrow">›</span>
    </button>`;
  }).join('');
}

// renderFavorites() zaten yukarıda tek bir fonksiyon olarak tanımlandı
// Hem anasayfa hem profil container'ı aynı anda dolduruyor

// ==================== OYUN MOTORU ====================

const GAME_MAP = {
  'Vida Ustası': 'screwPuzzle',
  '2048': 'game2048',
  'Hafıza Oyunu': 'memoryGame',
  'Kelime Avı': 'wordSearch',
  'Sudoku': 'sudoku',
  'Bulmaca Blokları': 'blockPuzzle',
  'Labirent': 'mazeGame',
  'İksir Sıralama': 'waterSort',
  'Ok Bulmaca': 'arrowPuzzle',
  // Faz 3 bitti: tema hazır, oyun Keşfet ve ana ekranda AÇIK.
  'Resim Kaydır': 'jigsawCard',
};

let _currentGameId = null;
let _currentGameOpts = null;
let _beforeGameScreen = null;

// id → görünen ad (GAME_MAP'in tersi). Günlük Meydan Okuma oyunları
// id ile başlatıyor; başlık için ada ihtiyaç var.
const GAME_NAME_BY_ID = Object.keys(GAME_MAP).reduce((acc, n) => {
  acc[GAME_MAP[n]] = n; return acc;
}, {});

function playGameById(gameId, opts) {
  const name = GAME_NAME_BY_ID[gameId];
  if (!name) { showToast('🎮 Oyun bulunamadı'); return; }
  playGame(name, opts);
}

// opts oyuna AYNEN geçer (örn. { daily, seed, difficulty }).
// Yeniden başlatmada da korunur — aksi hâlde günlük bulmacada "Tekrar
// Oyna" oyuncuyu rastgele bir tahtaya düşürürdü.
function playGame(name, opts) {
  const gameId = GAME_MAP[name];
  if (!gameId || typeof PuzzleGames === 'undefined' || !PuzzleGames[gameId]) {
    showToast(`🎮 ${name} — yakında!`);
    return;
  }

  _currentGameId = gameId;
  _currentGameOpts = opts || null;
  _beforeGameScreen = currentScreen;

  // Discover'dan oyuna geçince reels demolarını DURDUR. playGame switchTab'ı
  // çağırmadığı için buraya gelene kadar ReelsEngine.cleanup() hiç tetiklenmiyordu:
  // bir demo rAF döngüsü arka planda çalışmaya devam edip (cihazda ölçüldü:
  // oyun ekranında ~46 rAF çağrısı/sn) oyunla main-thread için yarışıyor, ayrıca
  // tekrar Discover'a girince init() cleanup'sız çalışıp öksüz döngüler biriktiriyordu.
  // cleanup() idempotent: reels aktif değilse zararsızdır.
  if (window.ReelsEngine) ReelsEngine.cleanup();

  // Tab bar gizle
  document.getElementById('bottom-tabs').style.display = 'none';

  // Başlık ve skor ayarla
  document.getElementById('game-title').textContent = name;
  document.getElementById('game-score').textContent = '0';

  // Game over gizle
  document.getElementById('game-over').style.display = 'none';

  // Ekranı aç
  showScreen('screen-game');

  // Oyunu başlat
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  // Arka plan müziği geçici olarak kapalı — mevcut kompozisyon oyunun
  // atmosferine uymuyor. Profesyonel ses tasarımıyla yeniden eklenene kadar
  // sessizlik + oyun içi SFX hiyerarşisi kullanılıyor.
  GameAudio.setIntensity(1); // Oyun modu — beat katmanı aktif (müzik başladığında)
  GameAudio.play('bloom');
  GameAudio.haptic('soft');
  // Ses buton durumları
  const btnS = document.getElementById('btn-sound');
  const btnM = document.getElementById('btn-music');
  if (btnS) btnS.textContent = GameAudio.muted ? '🔇' : '🔊';
  if (btnM) btnM.textContent = GameAudio.musicMuted ? '🎵' : '🎶';

  // Oyun kendi skor göstergesini çiziyorsa kabuğunki gizlenir — aynı
  // sayı iki yerde birden görünmemeli. (2048 sahne dilinde SKOR/EN İYİ
  // kapsülleri çiziyor; başlıktaki kopyası hiyerarşiyi bulanıklaştırıyordu.)
  const scoreWrap = document.querySelector('#screen-game .game-score-wrap');
  if (scoreWrap) scoreWrap.style.display = PuzzleGames[gameId].ownsScoreDisplay ? 'none' : '';

  PuzzleGames[gameId].init(container, _currentGameOpts || undefined);
}

function updateGameScore(score) {
  document.getElementById('game-score').textContent = score.toLocaleString();
}

// "Devam et" akışının oyun tarafındaki karşılığı.
// Reklam/elmas akışı modalı kapatmayı bilir ama oyunun devam etmek için
// NEYE ihtiyacı olduğunu bilemez (Sudoku'da can, başka oyunda başka şey).
// Oyun showGameOver'a bir onContinue verirse, ödeme tamamlandığında o
// çağrılır ve oyun kendini toparlar. Vermezse eski davranış aynen sürer —
// mevcut oyunların hiçbiri etkilenmez.
let _gameOverContinuation = null;
let _gameOverRestart = null;

// opts (hepsi isteğe bağlı, verilmezse eski davranış):
//   onContinue  → reklam/elmasla devam edildiğinde çağrılır
//   accent      → oyunun imza rengi; mühür ve vurgular buradan boyanır
//   mark        → mühürdeki işaret (varsayılan ✦ / ✧)
//   stats       → [{label, value, record}] — skor/en iyi kapsülleri
function showGameOver(win, title, message, opts) {
  opts = opts || {};
  _gameOverContinuation = (typeof opts.onContinue === 'function') ? opts.onContinue : null;
  // onRestart, onContinue'nun ikizi: "Tekrar Oyna" düğmesinin ne
  // yapacağını oyun tanımlar. Varsayılan davranış (oyunu baştan kurmak)
  // seviyeli oyunlarda yanlış — oyuncuyu 1. seviyeye düşürür, oysa
  // kaybettiği yer o anki seviyedir. Verilmezse eski davranış aynen sürer.
  _gameOverRestart = (typeof opts.onRestart === 'function') ? opts.onRestart : null;

  const box = document.querySelector('.game-over-box');
  // Sahne-duyarlılık: oyun kendi rengini geçirir, geçirmezse platform
  // moruna düşülür. Tüm oyunlar aynı YAPIYI, farklı VURGUYU kullanır.
  if (box) {
    box.style.setProperty('--go-accent', opts.accent || '#7c3aed');
    box.style.setProperty('--go-accent-light', opts.accentLight || '#b9a0ff');
    box.style.setProperty('--go-accent-glow', opts.accentGlow || 'rgba(124,58,237,.7)');
  }

  const mark = document.getElementById('go-emoji');
  mark.textContent = opts.mark || (win ? '✦' : '✧');
  mark.classList.toggle('lost', !win);

  document.getElementById('go-title').textContent = title;
  document.getElementById('go-msg').textContent = message;

  // İstatistik kapsülleri — skorun düz altyazı olmaktan çıkması.
  const stats = document.getElementById('go-stats');
  if (stats) {
    if (opts.stats && opts.stats.length) {
      stats.style.display = '';
      stats.innerHTML = opts.stats.map(s =>
        '<div class="go-stat' + (s.record ? ' record' : '') + '">' +
          '<span class="go-stat-lbl"></span><span class="go-stat-val"></span></div>'
      ).join('');
      // Metin textContent ile yazılıyor: oyun adları/etiketleri HTML olarak
      // yorumlanmasın (skor değerleri güvenli olsa da alışkanlık önemli).
      [...stats.children].forEach((el, i) => {
        el.querySelector('.go-stat-lbl').textContent = opts.stats[i].label;
        el.querySelector('.go-stat-val').textContent = opts.stats[i].value;
      });
    } else {
      stats.style.display = 'none';
      stats.innerHTML = '';
    }
  }

  // Show/hide continue button (only on loss)
  const continueBtn = document.getElementById('go-continue');
  const doubleBtn = document.getElementById('go-double');
  if (continueBtn) continueBtn.style.display = win ? 'none' : 'flex';
  if (doubleBtn) doubleBtn.style.display = win ? 'flex' : 'none';

  // Elmasla devam, oyun bazında kapatılabilir; varsayılan artık her
  // kaybetme ekranında 30💎 veya reklamla devamdır.
  // Yeni bir modal açmak yerine paylaşımlı kutunun bir düğmesi gizleniyor.
  // Karar refreshGameOverOffers'a taşınıyor: Premium'da elmas satırı da
  // gizleniyor ve iki koşulun tek yerde olması gerekiyor.
  _gameOverNoDiamond = !!opts.noDiamond;

  // Level complete reward — Plus çarpanı BİLEREK yok (add, addReward değil):
  // abonelik oyun içi ilerlemeyi hızlandırmıyor (bkz. DiamondSystem.addReward).
  if (win) DiamondSystem.add(EconomyConfig.LEVEL_COMPLETE_REWARD, 'Level tamamlandı!');

  refreshGameOverOffers();
  document.getElementById('game-over').style.display = 'flex';
}

// Game-over'daki reklam/elmas düğmelerinin metni ve etkinliği. Hem
// showGameOver'dan hem AdBudget.updateUI'dan çağrılır — ikincisi, oyuncu
// kutu AÇIKKEN son hakkını harcadığında (reklamla devam → tekrar kaybetme
// döngüsü) düğmenin kendiliğinden pasifleşmesi için.
let _gameOverNoDiamond = false;

function refreshGameOverOffers() {
  const plus = (typeof PlusSystem !== 'undefined') && PlusSystem.isActive();
  const adOk = AdBudget.canWatch();

  const setBtn = (btn, ico, lbl, enabled) => {
    if (!btn) return;
    const i = btn.querySelector('.go-btn-ico');
    const l = btn.querySelector('.go-btn-lbl');
    if (i) i.textContent = ico;
    if (l) l.textContent = lbl;
    btn.disabled = !enabled;
  };

  // Devam — reklam satırı. Premium'da reklam yok: düğme "anında devam"
  // düğmesine dönüşüyor (bkz. continueWithAd).
  const contAd = document.getElementById('go-continue-ad');
  if (plus) {
    setBtn(contAd, '👑', 'Devam Et (Plus)', true);
  } else if (adOk) {
    setBtn(contAd, '📺', 'Reklam İzle → Devam Et  (' + AdBudget.remaining() + '/' + AdBudget.limit() + ')', true);
  } else {
    setBtn(contAd, '📺', 'Reklam hakkın bitti — yarın tekrar gel', false);
  }

  // Devam — elmas satırı. Premium'da GİZLİ: ücretsiz devam varken elmas
  // istemek oyuncuyu cezalandırmak olur.
  const diamondBtn = document.querySelector('.go-btn-diamond');
  if (diamondBtn) {
    const hide = _gameOverNoDiamond || plus;
    diamondBtn.style.display = hide ? 'none' : '';
    if (!hide) {
      const cost = EconomyConfig.CONTINUE_DIAMONDS;
      setBtn(diamondBtn, '💎', cost + ' Elmas → Devam Et', DiamondSystem.canAfford(cost));
    }
  }

  // Skor 2x — yalnızca reklam. Elmas alternatifi bilerek YOK.
  const dbl = document.getElementById('go-double');
  if (plus) {
    setBtn(dbl, '👑', 'Skor 2x (Plus)', true);
  } else if (adOk) {
    setBtn(dbl, '📺', 'Reklam İzle → Skor 2x!  (' + AdBudget.remaining() + '/' + AdBudget.limit() + ')', true);
  } else {
    setBtn(dbl, '📺', 'Reklam hakkın bitti — yarın tekrar gel', false);
  }
}

// Kanca tek kullanımlıktır: alınıp temizlendikten SONRA çağrılır, böylece
// oyun devam ederken tekrar tetiklenemez (aynı canı iki kez veremez).
function _runGameOverContinuation(source) {
  document.getElementById('game-over').style.display = 'none';
  if (!_gameOverContinuation) return false;
  const fn = _gameOverContinuation;
  _gameOverContinuation = null;
  _gameOverRestart = null;        // devam edildi — yeniden başlatma kancası da düştü
  // Tur YENİDEN AÇILIYOR: oyun bittiğinde game_ended('lost') yayınlandı, ama
  // oyuncu devam ediyor. Yeni bir game_started yayınlanmıyor (tek tur oynandı,
  // iki değil); buradaki tek iş, sonraki gerçek bitişin (kazanma ya da çıkış)
  // "açık tur yok" diye düşmesini engellemek.
  if (typeof GameEvents !== 'undefined' && _currentGameId) GameEvents.reopen(_currentGameId);
  fn(source);
  return true;
}

// Premium'da (runRewardedAction 1. kural) reklam gösterilmez ve bütçeye
// bakılmaz — yani "sınırsız ücretsiz devam" faydası ayrı bir kod yolu
// değil, kapının doğal sonucu.
function continueWithAd() {
  runRewardedAction({ icon: '🔄', text: 'Devam Et!' }, () => {
    if (!_runGameOverContinuation('ad')) showToast('🔄 Devam ediyorsun!');
  });
}

function continueWithDiamonds() {
  // Premium'da bu düğme hiç görünmüyor (refreshGameOverOffers), ama
  // ücretsiz devam hakkı varken elmas harcamak her hâlükârda yanlış.
  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    if (!_runGameOverContinuation('plus')) showToast('👑 Plus: devam ücretsiz!');
    return;
  }
  const cost = EconomyConfig.CONTINUE_DIAMONDS;
  if (DiamondSystem.spend(cost)) {
    if (!_runGameOverContinuation('diamond')) showToast('💎 ' + cost + ' elmas harcandı — devam!');
  }
}

// Elmas alternatifi BİLEREK yok: elmasla skor satın almak oyunun anlamını
// bozar — skor kazanılır. Ekonominin tek istisnası, gözden kaçırma değil.
function doubleScoreWithAd() {
  runRewardedAction(
    { icon: '2️⃣', text: 'Skor 2x!' },
    () => {
      const scoreEl = document.getElementById('game-score');
      const current = parseInt(scoreEl.textContent.replace(/,/g, '')) || 0;
      scoreEl.textContent = (current * 2).toLocaleString();
      showToast('🎉 Skor 2 katına çıktı!');
    }
  );
}

function restartCurrentGame() {
  if (!_currentGameId || !PuzzleGames[_currentGameId]) return;
  // Oyun kendi yeniden başlatmasını tanımladıysa onu çalıştır: seviyeli
  // bir oyunda "tekrar" o SEVİYEYİ yeniden kurmak demektir, oyunu baştan
  // almak değil. Kanca tek kullanımlık (onContinue ile aynı sözleşme).
  if (_gameOverRestart) {
    const fn = _gameOverRestart;
    _gameOverRestart = null;
    _gameOverContinuation = null;
    document.getElementById('game-over').style.display = 'none';
    fn();
    return;
  }
  _gameOverContinuation = null;   // yeni oyun — eski kanca geçersiz
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('game-score').textContent = '0';
  const container = document.getElementById('game-container');
  PuzzleGames[_currentGameId].cleanup();
  container.innerHTML = '';
  // Aynı opts ile: günlük bulmacada "Tekrar Oyna" AYNI günün tahtasını
  // vermeli, rastgele yeni bir tahta değil.
  PuzzleGames[_currentGameId].init(container, _currentGameOpts || undefined);
}

function exitGame() {
  // Terk edilen tur BURADA kapanıyor, cleanup()'ta değil: cleanup oyunun
  // kendi işi (dinleyici/rAF sökmek) ve "tur"dan haberi yok. Oyun zaten
  // bitmişse (game-over kutusundan çıkılıyor) açık tur yoktur, abandon()
  // hiçbir şey yapmaz — çift sayım riski yok.
  if (typeof GameEvents !== 'undefined') GameEvents.abandon();
  if (_currentGameId && PuzzleGames[_currentGameId]) {
    PuzzleGames[_currentGameId].cleanup();
  }
  _gameOverContinuation = null;   // oyundan çıkıldı — eski kancalar geçersiz
  _gameOverRestart = null;
  _currentGameOpts = null;
  GameAudio.stopMusic();
  GameAudio.play('transition');
  _currentGameId = null;

  document.getElementById('game-container').innerHTML = '';
  document.getElementById('game-over').style.display = 'none';

  // Tab bar göster
  document.getElementById('bottom-tabs').style.display = 'flex';

  // Önceki ekrana dön
  if (_beforeGameScreen === 'screen-discover') {
    switchTab('discover');
  } else {
    switchTab(currentTab || 'home');
  }
}

function toggleGameSound() {
  const muted = GameAudio.toggleMute();
  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

function toggleGameMusic() {
  const off = GameAudio.toggleMusic();
  const btn = document.getElementById('btn-music');
  if (btn) btn.textContent = off ? '🎵' : '🎶';
}

function playRandomGame() {
  const playable = Object.keys(GAME_MAP);
  const pick = playable[Math.floor(Math.random() * playable.length)];
  playGame(pick);
}

// ==================== TOAST ====================

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (typeof GameAudio !== 'undefined') GameAudio.play('toast');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==================== BAŞLANGIÇ ====================

// app.js en son yükleniyor (games.js → reels.js → app.js)
// Bu noktada DOM zaten hazır
(function initApp() {
  DiamondSystem.updateUI();
  PlusSystem.updateUI();
  AvatarSystem.updateUI();
  // Reklam bütçesi rozetleri açılışta doğru dolsun; gün değiştiyse
  // sayaç ilk okumada zaten sıfırdan başlar (tembel sıfırlama).
  AdBudget.updateUI();
  renderHome();
  // renderLeaderboard() değil: 'lider' sekmesi artık İlerleme ekranını
  // gösteriyor. Eskisi açılışta GİZLİ kapsayıcılara boşuna çiziyordu.
  renderProgress();
  renderSettings();
  renderFavorites();
  updateStreakUI();

  // Uygulama açılış sesi — soft bloom (müzik geçici olarak kapalı, bkz. playGame())
  document.addEventListener('click', function _firstTouch() {
    if (typeof GameAudio !== 'undefined') {
      GameAudio.play('bloom');
    }
    document.removeEventListener('click', _firstTouch);
  }, { once: true });
})();

// ==================== FPS ÖLÇER (dev aracı) ====================
// Cihazda gerçek performansı okumak için hafif bir overlay. Kapalıyken hiçbir
// maliyeti yok (rAF durur). pointer-events:none olduğu için oyunun hiçbir alanını
// bloke etmez — sadece görsel katman. Aç/kapa: iki parmakla ~800ms basılı tutma
// (tek parmaklı oyun girdileriyle çakışmaz) veya konsoldan window.PHFps.toggle().
window.PHFps = (function () {
  const KEY = 'ph_fpsmeter';
  let el = null, rafId = 0, visible = false;
  // Pencere biriktiricileri (~500ms'de bir özetlenip sıfırlanır)
  let frames = 0, sumMs = 0, maxMs = 0, lastT = 0, winStart = 0;
  let jank = 0, peak = 0; // jank kümülatif; peak = görülen en yüksek fps (yenileme hızı tahmini)

  injectStyle('fpsm-style', `
    #fpsm{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);left:50%;
      transform:translateX(-50%);z-index:2147483647;pointer-events:none;
      font:600 12px/1.15 ui-monospace,Menlo,Consolas,monospace;
      background:rgba(10,6,20,.72);color:#e8e2f5;padding:5px 10px;border-radius:10px;
      text-align:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      box-shadow:0 2px 10px rgba(0,0,0,.4);letter-spacing:.2px;white-space:nowrap}
    #fpsm .fpsm-big{font-size:15px;font-weight:800}
    #fpsm .fpsm-sub{opacity:.75;font-size:10px;margin-top:1px}
    #fpsm.fpsm-good .fpsm-big{color:#67e8a0}
    #fpsm.fpsm-mid  .fpsm-big{color:#f5c451}
    #fpsm.fpsm-bad  .fpsm-big{color:#f56b6b}
  `);

  function snap(v) { // en yakın yaygın yenileme hızına oturt (renk eşiği için)
    for (const r of [60, 90, 120, 144]) if (Math.abs(v - r) <= 8) return r;
    return v;
  }
  function tick(t) {
    if (lastT) {
      const dt = t - lastT;
      frames++; sumMs += dt; if (dt > maxMs) maxMs = dt;
      const exp = peak ? 1000 / peak : 16.7;
      if (dt > exp * 1.5) jank++; // yarım kareden fazla gecikme = hitch
    } else { winStart = t; }
    lastT = t;
    const elapsed = t - winStart;
    if (elapsed >= 500 && frames > 0) {
      const fps = Math.round(frames * 1000 / elapsed);
      const avg = (sumMs / frames);
      peak = snap(Math.max(peak, fps));
      const ratio = peak ? fps / peak : 1;
      el.className = ratio >= 0.92 ? 'fpsm-good' : ratio >= 0.6 ? 'fpsm-mid' : 'fpsm-bad';
      el.innerHTML = `<div class="fpsm-big">${fps} fps</div>` +
        `<div class="fpsm-sub">avg ${avg.toFixed(1)} · max ${Math.round(maxMs)} · jank ${jank}</div>`;
      frames = 0; sumMs = 0; maxMs = 0; winStart = t;
    }
    rafId = requestAnimationFrame(tick);
  }
  function show() {
    if (visible) return;
    visible = true;
    el = document.getElementById('fpsm');
    if (!el) { el = document.createElement('div'); el.id = 'fpsm'; el.textContent = '…'; document.body.appendChild(el); }
    el.style.display = 'block';
    frames = 0; sumMs = 0; maxMs = 0; lastT = 0; jank = 0; // temiz başla
    rafId = requestAnimationFrame(tick);
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  function hide() {
    visible = false;
    cancelAnimationFrame(rafId); rafId = 0;
    if (el) el.style.display = 'none';
    try { localStorage.removeItem(KEY); } catch (e) {}
  }
  function toggle() { visible ? hide() : show(); }

  // İki parmakla basılı tutma jesti (sadece gözlemci — oyun girdisini çalmaz)
  const active = new Map();
  let holdTimer = null;
  function cancelHold() { clearTimeout(holdTimer); holdTimer = null; }
  addEventListener('pointerdown', e => {
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelHold();
    if (active.size === 2) holdTimer = setTimeout(toggle, 800);
  }, { capture: true, passive: true });
  addEventListener('pointermove', e => {
    const p = active.get(e.pointerId); if (!p) return;
    if (Math.abs(e.clientX - p.x) > 24 || Math.abs(e.clientY - p.y) > 24) cancelHold(); // kayma = iptal
  }, { capture: true, passive: true });
  function up(e) { active.delete(e.pointerId); if (active.size < 2) cancelHold(); }
  addEventListener('pointerup', up, { capture: true, passive: true });
  addEventListener('pointercancel', up, { capture: true, passive: true });

  try { if (localStorage.getItem(KEY) === '1') show(); } catch (e) {}
  return { toggle, show, hide };
})();


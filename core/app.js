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
  // akışları bu 8 haktan düşer.
  //
  // 2026-08-02: 3 → 8. Sistem kurulurken (0e68322) 3 seçilmişti ve o
  // günden beri hiç değişmemişti; beş ayrı aksiyonun TEK havuzu olduğu
  // için 3 hak, oyuncunun ilk iki devam-et'inden sonra elmas dışında
  // seçenek bırakmıyordu — havuzun "bilinçli seçim" amacı (hangisine
  // harcayayım?) 3'te seçim değil kıtlık oluyor.
  AD_DAILY_LIMIT: 8,

  // --- Geçiş reklamı sıklık kapağı (InterstitialAds) ---
  // AD_DAILY_LIMIT'ten TAMAMEN AYRI bir eksen: o "oyuncu kaç ödül
  // isteyebilir"i sınırlar (oyuncunun kendi seçimi), bu ise "biz kaç kez
  // araya girebiliriz"i (oyuncunun seçimi değil). Aynı havuza bağlamak,
  // istenmeyen bir reklamın istenen bir ödülü yemesi demekti.
  //
  // İki eşik de İKİSİ BİRDEN sağlanmadan reklam çıkmaz. Tek eksen yeterli
  // olsaydı ikisi de kendi başına bozulurdu: yalnız süre → hızlı oynayan
  // oyuncu her 3 dakikada bir reklam yer; yalnız tur sayısı → kısa
  // oyunlarda (Hafıza, Labirent) üç tur arka arkaya bir dakikaya sığar.
  INTERSTITIAL_MIN_INTERVAL_MS: 3 * 60 * 1000,
  INTERSTITIAL_MIN_ROUNDS: 3,

  // --- Elmas kazanımları ---
  AD_DIAMOND_REWARD: 10,      // reklamla elmas kazan
  LEVEL_COMPLETE_REWARD: 3,   // seviye tamamlama (Plus çarpanı UYGULANMAZ)

  // --- Elmas harcamaları ---
  CONTINUE_DIAMONDS: 30,      // game over sonrası devam
  UNDO_DIAMONDS: 15,          // +1 geri alma
  HINT_DIAMONDS: 10,          // ipucu — undo'dan ucuz, daha az kritik yardım
  // Hamle limiti dolunca +%25 hamle (şu an yalnızca Su Sıralama).
  // CONTINUE_DIAMONDS'tan UCUZ olması bilinçli: o oyunlarda devam etmemek
  // turu tamamen kaybettirir, burada seviye her zaman ÜCRETSİZ yeniden
  // başlatılabiliyor — oyuncu turu değil, harcadığı emeği satın alıyor.
  // Tek bir geri almadan (15) değerli, tam bir devamdan (30) ucuz.
  EXTRA_MOVES_DIAMONDS: 20,

  // --- Günlük görev ödülleri (DailyQuests) ---
  // Toplam 45💎 (10+15+10 + 10 bonus). Mağazadaki "Günlük Görevler"
  // satırı bu toplamı KODDAN okuyor, ayrı yazılmıyor — metin ile kodun
  // ayrışması bu projede zaten bir kez oldu (bkz. AdBudget yorumu).
  QUEST_PLAY_REWARD: 10,      // "3 oyun oyna"
  QUEST_DAILY_REWARD: 15,     // "Günlük meydan okumayı tamamla" (en spesifik görev)
  QUEST_WIN_REWARD: 10,       // "1 oyun kazan"
  QUEST_ALL_BONUS: 10,        // üçü birden tamamlanınca

  // --- Rozet ödülleri (Badges) ---
  // TEK SEFERLİK kazanımlar, günlük değil. Toplam 115💎; mağazadaki
  // "Başarımlar" satırı bu toplamı KODDAN okuyor.
  BADGE_FIRST_GAME: 5,
  BADGE_10_GAMES: 15,
  BADGE_STREAK_7: 20,
  BADGE_STREAK_30: 50,        // en zoru, en yüksek
  BADGE_DIAMONDS_500: 25,

  // --- Premium (PlusSystem) ---
  PLUS_DAILY_DIAMONDS: 20,    // günlük ödülün ÜSTÜNE, ayrı satır
  PLUS_DIAMOND_MULTIPLIER: 1.5, // reklam + günlük ödül + görev + rozet kazanımlarına
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
// Bunlar artık TANIM: ilerleme değerleri burada YAZMAZ, DailyQuests
// hesaplar (bkz. GÜNLÜK GÖREVLER bölümü). Sabit `progress` alanları
// 2026-08-01'de kaldırıldı — üçü de gerçek veriye bağlandı.
//
// "Kişisel rekorunu geliştir" görevi "1 oyun kazan" ile DEĞİŞTİRİLDİ:
// eskisi evrensel değildi, çünkü Ok Bulmaca ve Resim Kaydır'da skor
// kavramı yok (bkz. GameEvents yorumu) — o iki oyunu oynayan oyuncu
// görevi hiç ilerletemezdi. "Kazanmak" ise 10 oyunun hepsinde tanımlı.
const DAILY_MISSIONS = [
  { id:'play3', icon:'🎮', tone:'blue',  name:'3 oyun oyna',
    total:3, reward:EconomyConfig.QUEST_PLAY_REWARD },
  { id:'daily', icon:'🎯', tone:'red',   name:'Günlük meydan okumayı tamamla',
    total:1, reward:EconomyConfig.QUEST_DAILY_REWARD },
  { id:'win1',  icon:'⭐', tone:'amber', name:'1 oyun kazan',
    total:1, reward:EconomyConfig.QUEST_WIN_REWARD },
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
  // Cihaz değiştiren / uygulamayı silip kuran kullanıcı için ZORUNLU:
  // abonelik satan her uygulamanın sunması gereken standart yol.
  { icon:'🔄', label:'Satın Almaları Geri Yükle', fn:'restorePurchases()' },
  { icon:'🔔', label:'Bildirimler', action:'Bildirimler yakında!' },
  { icon:'🔊', label:'Ses Ayarları', action:'Ses ayarları yakında!' },
  { icon:'🌐', label:'Dil', action:'Dil: Türkçe' },
  { icon:'⭐', label:'Puanla', action:'Uygulama puanlama yakında!' },
  { icon:'📤', label:'Paylaş', action:'Paylaşım yakında!' },
  // Sürüm tek kaynaktan (index.html APP_VERSION) okunur; burada sabit
  // yazmak bump'ta kaydırır. typeof guard'ı app.js'in izole yüklendiği
  // (test) durumda ReferenceError'ı önler.
  { icon:'ℹ️', label:'Hakkında', action:'SlySwipe v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.28.0') },
];

const DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const DAY_ICONS = ['✅','✅','✅','🎁','🏃','💎','🏆'];

// ==================== ELMAS SİSTEMİ ====================

const DiamondSystem = {
  _key: 'ph_diamonds',
  // YAŞAM BOYU KAZANILAN toplam — bakiyeden AYRI ve hiç azalmayan sayaç.
  // Bakiye "şu an neyin var"ı, bu "toplamda ne kazandın"ı söyler; harcama
  // ikincisini etkilemez. Rozet/başarım koşulları ("500💎 kazan") ancak
  // bununla ifade edilebilir: bakiyeyle yazılan bir koşul, oyuncu elmasını
  // harcadığı an geri alınırdı.
  _earnedKey: 'ph_diamonds_earned',

  get() {
    return parseInt(localStorage.getItem(this._key) || '100', 10); // Start with 100
  },

  set(val) {
    localStorage.setItem(this._key, Math.max(0, val).toString());
    this.updateUI();
  },

  // Başlangıçtaki 100💎 GERİYE DÖNÜK SAYILMAZ: kazanılmadı, verildi.
  // Eski kayıtlar da 0'dan başlar — geçmiş kazanımlar hiç tutulmamıştı,
  // bakiyeden türetmek onu "kazanılmış" gibi göstermek olurdu.
  earned() {
    return parseInt(localStorage.getItem(this._earnedKey) || '0', 10);
  },

  // Sayaç set() içinde DEĞİL burada artıyor: set()'i spend() de çağırıyor,
  // oraya konsaydı harcama da "kazanım" sayılırdı.
  add(amount, reason) {
    const current = this.get();
    this.set(current + amount);
    // amount > 0 koruması, sayacın tek değişmezini garanti eder: asla azalmaz.
    if (amount > 0) {
      try {
        localStorage.setItem(this._earnedKey, (this.earned() + amount).toString());
      } catch (e) {}
    }
    if (reason) showToast(`+${amount}💎 ${reason}`);
    this._animateAdd();
    // Elmas kazanımı bir rozet koşulu (500💎). Badges.check() kendi
    // ödülünü yine add() ile ödüyor, yani buradan geri çağrılıyor —
    // özyinelemeyi Badges._checking bayrağı kesiyor.
    if (typeof Badges !== 'undefined') Badges.check();
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
    // Seri uzadı — 7/30 gün rozetlerinin koşulu tam olarak bu.
    if (typeof Badges !== 'undefined') Badges.check();
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
    return {
      started:   (g && g.started) || 0,
      won:       (g && g.won) || 0,
      streak:    (g && g.streak) || 0,      // üst üste tamamlama (şu an)
      bestStreak:(g && g.bestStreak) || 0,  // gelmiş geçmiş en uzun
      bestMs:    (g && g.bestMs) || 0,      // en hızlı tamamlama (0 = yok)
      bestScore: (g && g.bestScore) || 0,
    };
  },

  _bump(gameId, field) {
    const s = this.stats();
    if (field === 'started') s.totalGamesStarted++; else s.totalGamesWon++;
    const g = s.perGame[gameId] || (s.perGame[gameId] = { started: 0, won: 0 });
    g[field]++;
    try { localStorage.setItem(this._key, JSON.stringify(s)); } catch (e) {}
  },

  // ───── tur kaydı: seri, en hızlı, en yüksek ─────
  //
  // Sonsuz ilerleyen oyunlar (Resim Kaydır, Su Sıralama, Ok Bulmaca)
  // "ne kadar ilerledim" sorusunu started/won ikilisiyle cevaplayamıyor.
  // Bu üç alan onun için var: üst üste tamamlama, en hızlı tamamlama,
  // en yüksek skor.
  //
  // OYUN-ÖZEL KOD YOK, DailyQuests ve Badges'taki disiplinin aynısı: burası
  // hiçbir oyunun adını anmıyor, alanlar `game_ended` yükünden türüyor.
  // Yeni bir oyun eklemek bu bloğa dokunmayı gerektirmiyor; bir oyun
  // `score` ya da `durationMs` göndermiyorsa o alanı hiç kazanmıyor
  // (uydurma bir sayı, eksik bir alandan kötüdür — CLAUDE.md).
  //
  // Seri KAZANMAYLA artar, kazanma DIŞINDAKİ her sonuçla sıfırlanır:
  // 'lost' de 'quit' de seriyi bozar, çünkü ikisi de "arka arkaya
  // tamamlama"nın tanımını bozuyor. bestStreak asla azalmaz.
  _record(ev) {
    const s = this.stats();
    const g = s.perGame[ev.gameId] || (s.perGame[ev.gameId] = { started: 0, won: 0 });
    if (ev.result === 'won') {
      g.streak = (g.streak || 0) + 1;
      if (g.streak > (g.bestStreak || 0)) g.bestStreak = g.streak;
      if (ev.durationMs != null && (!g.bestMs || ev.durationMs < g.bestMs)) g.bestMs = ev.durationMs;
      if (ev.score != null && ev.score > (g.bestScore || 0)) g.bestScore = ev.score;
    } else {
      g.streak = 0;
    }
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
    // Değişmez 3'ün aynısı burada da geçerli: BAŞIBOŞ olay sayaçlara
    // dokunmaz. Yoksa açık tur olmadan gelen bir 'won' seriyi şişirirdi.
    if (!stray) this._record(ev);
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

// ==================== GÜNLÜK GÖREVLER ====================
//
// GameEvents'in İLK gerçek abonesi. Faz 1'de mekanizma kuruldu ve
// bilerek boş bırakıldı; bu bölüm onu tüketiyor.
//
// ───── NEDEN OYUN-ÖZEL KOD YOK ─────
// Üç görevin üçü de mevcut veriden besleniyor:
//   • "3 oyun oyna"  → GameEvents game_started sayacı
//   • "1 oyun kazan" → GameEvents game_ended(result:'won') sayacı
//   • "Günlük meydan okuma" → DailyChallenge.state(id).doneToday
// Üçüncüsü için AYRI bir takip YAZILMADI: o bilgi zaten ph_daily_v1'de
// tutuluyor ve ikinci bir kayıt, aynı gerçeğin iki kaynağı demek olurdu
// (ikisi ayrışırsa hangisinin doğru olduğunu söyleyecek bir şey yok).
// Sonuç: bu dosya hiçbir oyunun adını bilmiyor, yeni oyun eklemek
// buraya dokunmayı gerektirmiyor.
//
// ───── TUR = SEVİYE ─────
// Sayılan birim GameEvents'in tanımladığı TUR. Seviyeli oyunlarda
// (Su Sıralama, Vida, Ok, Resim Kaydır) üç SEVİYE bitirmek "3 oyun
// oyna"yı tamamlar. Bu ayrı bir kural değil, tur tanımının doğrudan
// sonucu — ve iki tanım tutmak (biri görev için, biri istatistik için)
// tam olarak kaçınılmak istenen şey.
//
// ───── GÜNLÜK SIFIRLAMA ─────
// StreakSystem.checkIn() ve AdBudget'ın deseninin AYNISI: toDateString()
// karşılaştırması + TEMBEL sıfırlama (gece yarısını bekleyen zamanlayıcı
// yok, uygulama kapalıyken çalışmazdı zaten). Yeni bir tarih deseni
// icat edilmedi — üç sistem "gün"ü farklı tanımlarsa biri sıfırlanırken
// diğeri sıfırlanmaz ve hata ancak gece yarısı görünür.
//
// ───── ÖDÜL ANI ─────
// Görev tamamlandığı an ödenir; toplanacak bir düğme yok (mockup'ta da
// yok — bkz. §4, tasarıma dokunulmuyor). Ödeme TEK yerde: settle().
// İki tetikleyicisi var ve ikincisi zorunlu: DailyChallenge.complete()
// oyun bittikten SONRA çağrılıyor (games.js, sudoku), yani game_ended
// dinleyicisi çalışırken doneToday hâlâ false. O görev bu yüzden ana
// ekran render'ında ödeniyor — oyuncunun oyundan çıktığı an, toast'ın
// game-over kutusunun altında kaybolmadığı yer.
const DailyQuests = {
  _key: 'ph_daily_quests',

  _today() { return new Date().toDateString(); },

  // Kayıtlı tarih bugün değilse taze kayıt döner (diske YAZMADAN —
  // ilk gerçek değişiklik zaten kaydedecek; AdBudget.used() ile aynı).
  getData() {
    let d;
    try { d = JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { d = {}; }
    if (d.date !== this._today()) {
      return { date: this._today(), played: 0, won: 0, paid: [], bonusPaid: false };
    }
    return {
      date: d.date,
      played: d.played || 0,
      won: d.won || 0,
      paid: Array.isArray(d.paid) ? d.paid : [],
      bonusPaid: !!d.bonusPaid,
    };
  },

  _save(d) {
    try { localStorage.setItem(this._key, JSON.stringify(d)); } catch (e) {}
  },

  // Günlük meydan okuma TÜRETİLİYOR, sayılmıyor. try/catch şart:
  // DailyChallenge PuzzleGames kaydını geziyor, oradaki bir hata
  // görev satırını değil ANA EKRANI düşürürdü.
  _dailyChallengeDone() {
    if (typeof DailyChallenge === 'undefined') return false;
    try {
      return DailyChallenge.games().some(id => DailyChallenge.state(id).doneToday);
    } catch (e) { return false; }
  },

  // Tanım (DAILY_MISSIONS) + bugünün verisi → ekranın ve ödemenin
  // ortak kaynağı. İkisi ayrı hesaplansaydı UI'ın "tamam" dediği bir
  // görev ödenmemiş olabilirdi.
  rows(data) {
    const d = data || this.getData();
    const dailyDone = this._dailyChallengeDone();
    return DAILY_MISSIONS.map(m => {
      let raw = 0;
      if (m.id === 'play3') raw = d.played;
      else if (m.id === 'win1') raw = d.won;
      else if (m.id === 'daily') raw = dailyDone ? 1 : 0;
      const progress = Math.min(raw, m.total);
      return {
        id: m.id, icon: m.icon, tone: m.tone, name: m.name,
        total: m.total, reward: m.reward,
        progress, done: progress >= m.total,
      };
    });
  },

  doneCount() { return this.rows().filter(r => r.done).length; },
  allDone() { const r = this.rows(); return r.every(x => x.done); },

  // Mağaza satırının vaadi. Sayılar EconomyConfig'ten toplanıyor,
  // metne elle yazılmıyor.
  totalReward() {
    return DAILY_MISSIONS.reduce((a, m) => a + m.reward, 0) + EconomyConfig.QUEST_ALL_BONUS;
  },

  // Tamamlanmış ama ÖDENMEMİŞ her görevi öder. İdempotent: ödenen
  // görevin id'si `paid` listesine yazılıyor, ikinci çağrı hiçbir şey
  // yapmıyor — bu fonksiyon her render'da çalıştığı için şart.
  settle() {
    const d = this.getData();
    const rows = this.rows(d);
    let changed = false;

    rows.forEach(r => {
      if (!r.done || d.paid.indexOf(r.id) >= 0) return;
      d.paid.push(r.id);
      changed = true;
      // addReward: görev ödülü günlük ödülle AYNI kategoride bir
      // kazanım, dolayısıyla Plus'ın +%50 çarpanına tabi. add() ile
      // ayrımı korunuyor — seviye tamamlama (+3) hâlâ çarpansız,
      // abonelik oyun içi ilerlemeyi hızlandırmıyor.
      DiamondSystem.addReward(r.reward, 'Görev: ' + r.name);
    });

    if (rows.every(r => r.done) && !d.bonusPaid) {
      d.bonusPaid = true;
      changed = true;
      DiamondSystem.addReward(EconomyConfig.QUEST_ALL_BONUS, 'Tüm günlük görevler! 🎉');
    }

    if (changed) this._save(d);
    return changed;
  },

  _bump(field) {
    const d = this.getData();
    d[field] = (d[field] || 0) + 1;
    this._save(d);
  },

  // ───── GameEvents abonelikleri (aşağıda bağlanıyor) ─────
  onRoundStarted() { this._bump('played'); this.refresh(); },

  onRoundEnded(ev) {
    // stray (açık tur yokken gelen bitiş) sayaçlara İŞLEMEZ —
    // GameEvents'in 3. değişmeziyle aynı kural, yoksa görev ilerlemesi
    // oynanan turdan fazla olabilirdi.
    if (!ev || ev.result !== 'won' || ev.stray) return;
    this._bump('won');
    this.refresh();
  },

  // AvatarSystem / AdBudget ile aynı sözleşme: niteliği taşıyan her
  // öğe doldurulur, yeni bir gösterim noktası yeni kod gerektirmez.
  updateUI() {
    const txt = this.shopLabel();
    const done = this.allDone();
    document.querySelectorAll('[data-ph-quests]').forEach(el => { el.textContent = txt; });
    document.querySelectorAll('.shop-free-item [data-ph-quests]').forEach(el => {
      const row = el.closest('.shop-free-item');
      // Bitince GİZLENMİYOR, pasifleşiyor: gizlemek "böyle bir seçenek
      // yok" der, soluk satır "yarın tekrar gel" der (AdBudget ile aynı
      // gerekçe).
      if (row) row.classList.toggle('sfi-off', done);
    });
  },

  shopLabel() {
    const rows = this.rows();
    const done = rows.filter(r => r.done).length;
    if (done === rows.length) return '✅ Bugün tamamlandı';
    return '🎯 ' + done + '/' + rows.length + ' görev tamamlandı';
  },

  // Öde + çiz. renderMissions() zaten settle() çağırıyor; buradaki
  // tek ek iş mağaza satırının tazelenmesi.
  refresh() {
    renderMissions();
    this.updateUI();
  },
};

// Abonelik MODÜL yüklenirken kuruluyor: GameEvents yukarıda tanımlı ve
// hiçbir oyun app.js'ten önce tur açamaz (yükleme sırası games.js → …
// → app.js). Dönen off() fonksiyonları saklanmıyor — bu abonelik
// uygulamanın ömrü boyunca yaşıyor.
GameEvents.on('game_started', function () { DailyQuests.onRoundStarted(); });
GameEvents.on('game_ended', function (ev) { DailyQuests.onRoundEnded(ev); });

// ==================== ROZETLER ====================
//
// GameEvents'in ikinci abonesi, DailyQuests'in kardeşi. Aynı disiplin:
// oyun-özel kod YOK, beş rozetin beşi de MEVCUT sayaçlardan türetiliyor
// (ph_game_stats, ph_streak, ph_diamonds_earned). Yeni bir takip
// yazılmadı — yazılsaydı aynı gerçeğin ikinci kaydı olurdu.
//
// ───── GÖREVDEN FARKI ─────
// Görev günlük ve tekrarlanır; rozet TEK SEFERLİK ve kalıcıdır. Bu fark
// üç yerde görünür: (1) sıfırlanma yok, dolayısıyla tarih deseni de yok;
// (2) ödül `earned` listesindeki kimlikle bir kez ödenir; (3) kazanma anı
// toast değil, ayrı bir kutlama katmanı — daha büyük bir an, daha güçlü
// geri bildirim.
//
// ───── KOŞUL = SAF FONKSİYON ─────
// Her rozetin `test()`i yan etkisiz ve o anki sayaçtan okur. Böylece
// "kazanıldı mı" sorusu her zaman yeniden hesaplanabilir; kaçırılan bir
// tetikleyici rozeti kalıcı olarak kaybettirmez, bir sonraki check()
// yakalar. Tetikleyiciler bu yüzden hız için, doğruluk için değil.
//
// ───── YENİDEN GİRİŞ (re-entrancy) TUZAĞI ─────
// check() ödülü DiamondSystem.addReward() ile ödüyor, o da add()'e
// düşüyor, ve add() bittiğinde check()'i ÇAĞIRIYOR (elmas kazanımı bir
// rozet koşulu). Korumasız bu sonsuz özyineleme demek. `_checking`
// bayrağı iç içe çağrıyı yutuyor; dıştaki döngü zaten yeni durumu
// yeniden değerlendiriyor, dolayısıyla hiçbir rozet kaçmıyor.
const BADGES = [
  // Sıra ZORLUĞA GÖRE ARTAN. Vitrin "en değerli 3"ü seçerken ödülü
  // ölçüt alıyor, yani ödül miktarları aynı zamanda zorluk sıralaması.
  { id:'first_game',    icon:'🎮', tone:'blue',   name:'İlk Oyun',
    desc:'İlk oyununu başlat',        reward:EconomyConfig.BADGE_FIRST_GAME,
    test: () => GameEvents.stats().totalGamesStarted >= 1 },

  { id:'games_10',      icon:'🔟', tone:'purple', name:'10 Oyun',
    desc:'10 oyun oyna',              reward:EconomyConfig.BADGE_10_GAMES,
    test: () => GameEvents.stats().totalGamesStarted >= 10 },

  // ph_streak: uygulamayı AÇMA serisi. DailyChallenge'ın "günlüğü çözme"
  // serisi DEĞİL — ikisi farklı davranışı ödüllendiriyor (katılım vs
  // başarı) ve karıştırılmamalı (bkz. core/daily.js başlığı).
  { id:'streak_7',      icon:'🔥', tone:'red',    name:'7 Gün Seri',
    desc:'7 gün üst üste giriş yap',  reward:EconomyConfig.BADGE_STREAK_7,
    test: () => StreakSystem.getCount() >= 7 },

  { id:'diamonds_500',  icon:'💎', tone:'cyan',   name:'500 Elmas',
    desc:'Toplam 500💎 kazan',        reward:EconomyConfig.BADGE_DIAMONDS_500,
    // BAKİYE değil, YAŞAM BOYU kazanım. Bakiyeyle yazılsaydı oyuncu
    // elmasını harcadığı an rozet geri alınırdı.
    test: () => DiamondSystem.earned() >= 500 },

  { id:'streak_30',     icon:'👑', tone:'gold',   name:'30 Gün Seri',
    desc:'30 gün üst üste giriş yap', reward:EconomyConfig.BADGE_STREAK_30,
    test: () => StreakSystem.getCount() >= 30 },
];

const Badges = {
  _key: 'ph_badges',
  _checking: false,
  _queue: [],
  _showing: false,

  getData() {
    let d;
    try { d = JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { d = {}; }
    return { earned: Array.isArray(d.earned) ? d.earned : [] };
  },

  _save(d) {
    try { localStorage.setItem(this._key, JSON.stringify(d)); } catch (e) {}
  },

  has(id) { return this.getData().earned.some(e => e.id === id); },
  count() { return this.getData().earned.length; },
  total() { return BADGES.length; },

  def(id) { return BADGES.find(b => b.id === id) || null; },

  // Mağaza satırının vaadi — sayılar EconomyConfig'ten toplanıyor.
  totalReward() { return BADGES.reduce((a, b) => a + b.reward, 0); },

  // Kazanılanlar + tanımları, EN SON kazanılan başta.
  // Eşitlik bozucu DİZİ SIRASI: iki rozet aynı milisaniyede açılabiliyor
  // (bir ödülün ödenmesi bir sonrakini tetikleyebiliyor) ve o durumda
  // earnedAt karşılaştırması sıfır dönüp sırayı tanımsız bırakıyordu —
  // "en son kazanılan" ilk kazanılanı gösteriyordu. `earned` dizisine
  // eklenme sırası zaten kazanma sırasıdır, tek gereken oydu.
  recent(n) {
    return this.getData().earned
      .map((e, i) => ({ e, i }))
      .sort((a, b) => ((b.e.earnedAt || 0) - (a.e.earnedAt || 0)) || (b.i - a.i))
      .map(({ e }) => { const d = this.def(e.id); return d ? Object.assign({ earnedAt: e.earnedAt }, d) : null; })
      .filter(Boolean)
      .slice(0, n || 4);
  },

  // Vitrin: EN DEĞERLİ rozetler (eşitlikte en yeni). Seçim arayüzü
  // bilerek yok — oyuncuya bir karar daha yüklemek yerine "en iyisini
  // göster" varsayılanı bu fazda yeterli.
  showcase(n) {
    return this.getData().earned
      .slice()
      .map(e => { const d = this.def(e.id); return d ? Object.assign({ earnedAt: e.earnedAt }, d) : null; })
      .filter(Boolean)
      .sort((a, b) => (b.reward - a.reward) || ((b.earnedAt || 0) - (a.earnedAt || 0)))
      .slice(0, n || 3);
  },

  // Koşulu sağlanan ve HENÜZ ÖDENMEMİŞ her rozeti verir.
  // İdempotent: kimlik `earned` listesine yazılıyor, ikinci çağrı
  // hiçbir şey yapmıyor — bu fonksiyon her sayaç değişiminde çalıştığı
  // için şart (DailyQuests.settle() ile aynı gerekçe).
  check() {
    if (this._checking) return [];       // yeniden giriş koruması (yukarıdaki nota bak)
    this._checking = true;
    const won = [];
    try {
      const d = this.getData();
      const ids = new Set(d.earned.map(e => e.id));
      // Döngü: bir rozetin ödülü başka bir rozeti açabilir (500💎 ödülü
      // 500 elmas rozetini tetikleyebilir). Sabit noktaya kadar dön;
      // rozet sayısı üst sınır, sonsuz döngü mümkün değil.
      let changed = true;
      while (changed) {
        changed = false;
        for (const b of BADGES) {
          if (ids.has(b.id)) continue;
          let met = false;
          // Bir rozetin koşulu patlarsa DİĞERLERİ etkilenmesin; bu sistem
          // oynanışın yanında duruyor, önünde değil.
          try { met = !!b.test(); } catch (e) { met = false; }
          if (!met) continue;
          ids.add(b.id);
          d.earned.push({ id: b.id, earnedAt: Date.now() });
          this._save(d);                 // önce yaz: ödeme yarıda kalsa da rozet kalıcı
          // reason VERİLMİYOR → toast çıkmıyor. Geri bildirimi kutlama
          // katmanı veriyor; ikisi birden gürültü olurdu.
          const granted = DiamondSystem.addReward(b.reward);
          won.push({ def: b, granted });
          changed = true;
        }
      }
    } finally {
      this._checking = false;
    }
    if (won.length) {
      won.forEach(w => this._queue.push(w));
      this._drain();
      this.updateUI();
    }
    return won;
  },

  // ───── Kutlama katmanı ─────
  // Görev toast'ından bilerek daha güçlü: rozet tek seferlik ve kalıcı.
  // Aynı anda birden fazla rozet açılabildiği için KUYRUK var — üst üste
  // binen iki kutlama, ikincisini görünmez yapardı.
  _drain() {
    if (this._showing || !this._queue.length) return;
    const item = this._queue.shift();
    this._showing = true;
    const el = document.createElement('div');
    el.className = 'bdg-pop';
    el.innerHTML =
      '<div class="bdg-pop-card">' +
        '<span class="bdg-pop-badge bdg-' + item.def.tone + '">' + item.def.icon + '</span>' +
        '<span class="bdg-pop-kicker">Rozet Kazanıldı</span>' +
        '<span class="bdg-pop-name"></span>' +
        '<span class="bdg-pop-reward">+' + item.granted + '💎</span>' +
      '</div>';
    // Ad textContent ile: rozet adı HTML olarak yorumlanmasın.
    el.querySelector('.bdg-pop-name').textContent = item.def.name;
    document.body.appendChild(el);
    if (typeof GameAudio !== 'undefined') { GameAudio.play('win'); GameAudio.haptic('win'); }
    // ~2 sn görünür, sonra kendi kapanır. Kapanış animasyonu bitmeden
    // sıradakini açmıyoruz, yoksa iki kart üst üste gelir.
    setTimeout(() => {
      el.classList.add('bdg-out');
      setTimeout(() => {
        el.remove();
        this._showing = false;
        this._drain();
      }, 260);
    }, 2000);
  },

  // AdBudget / DailyQuests ile aynı sözleşme: niteliği taşıyan her öğe
  // doldurulur. Ayrıca İlerleme ve Profil ekranları yeniden çiziliyor —
  // ikisi de innerHTML ile kuruluyor, kısmi güncelleme mümkün değil.
  updateUI() {
    const txt = this.shopLabel();
    document.querySelectorAll('[data-ph-badges]').forEach(el => { el.textContent = txt; });
    document.querySelectorAll('.shop-free-item [data-ph-badges]').forEach(el => {
      const row = el.closest('.shop-free-item');
      if (row) row.classList.toggle('sfi-off', this.count() >= this.total());
    });
    if (typeof renderShowcase === 'function') renderShowcase();
    // İlerleme ekranı yalnızca görünürken yeniden çizilsin — gizli bir
    // ekranı her rozet için baştan kurmak boşa iş.
    if (currentScreen === 'screen-lider' && typeof renderProgress === 'function') renderProgress();
  },

  shopLabel() {
    const n = this.count(), t = this.total();
    if (n >= t) return '🏆 Tüm rozetler kazanıldı';
    return '🏆 ' + n + '/' + t + ' rozet kazanıldı';
  },
};

// Sayaç değiştiren her nokta rozet kontrolünü tetikler. Koşullar saf
// olduğu için bunlar HIZ içindir, doğruluk için değil: biri unutulursa
// rozet kaybolmaz, bir sonraki tetikleyicide verilir.
// (DiamondSystem.add() ve StreakSystem.checkIn() kendi içlerinden
// çağırıyor — oradaki yeniden-giriş notuna bak.)
GameEvents.on('game_started', function () { Badges.check(); });
GameEvents.on('game_ended', function () { Badges.check(); });

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

// ==================== ÖDÜLLÜ REKLAM ====================
//
// Reklam birimi kimlikleri. Gerçek birime geçiş yayın adımıdır; kimlik ÜÇ
// yerde birden değişir ve üçü de birbiriyle tutarlı olmak zorunda:
// burası, AndroidManifest'teki APPLICATION_ID meta-data'sı ve AD_TEST_DEVICES.
//
// Kimliklerin kendisi SIR DEĞİL — APK açılabilir bir dosya, oradan zaten
// okunuyorlar. Tehlike sızmaları değil, GELİŞTİRİRKEN KULLANILMALARI:
// kendi reklamını kendin izlemek/tıklamak "geçersiz trafik" sayılıyor ve
// AdMob hesabını askıya aldırabiliyor. Bu yüzden gerçek kimliğe geçiş
// AD_TEST_DEVICES olmadan YAPILMAZ (aşağıdaki nota bak).
// (developers.google.com/admob/android/test-ads, teyit 2026-08-06)
// Gerçek birimler girildi 2026-08-07. Yayıncı: pub-5960894143182893.
// Üçü de aynı yayıncıya ait olmak zorunda (bkz. ad-release-test.js §4);
// manifestteki uygulama kimliği ca-app-pub-5960894143182893~1883487916.
//
// TEK ödüllü birim, beş eylemin hepsi için: elmas, devam et, ipucu, geri
// al, 2x skor. runRewardedAction tek kapı olduğu için yerleşim başına
// kimlik kavramı burada yok. AdMob'da yerleşim bazlı raporlama istenirse
// bu alan bir eşleme tablosuna dönüşür — göç gerektirmeyen bir değişiklik,
// o yüzden sıfır kullanıcıyla şimdi yapmanın faydası yok.
const AD_IDS = {
  rewardedAndroid: 'ca-app-pub-5960894143182893/1987429698',
  interstitialAndroid: 'ca-app-pub-5960894143182893/7435197490',
};

// GERÇEK KİMLİKLE GELİŞTİRMENİN TEK GÜVENLİ YOLU.
//
// Buradaki hash'ler `MobileAds.setRequestConfiguration().setTestDeviceIds(...)`
// listesine giriyor; o listedeki cihaza SDK, birim kimliği gerçek olsa bile
// TEST reklamı sunuyor. Yani gösterimler ve tıklamalar hesaba hiç işlemiyor —
// geçersiz trafik riski yapısal olarak ortadan kalkıyor. Google'ın bu iş için
// önerdiği mekanizma budur; `isTesting` bayrağı DEĞİL (aşağıya bak).
//
// Hash cihaza özgü ve gizli değil; reklam kimliğinden türetiliyor, tek başına
// hiçbir şeye erişim vermiyor, o yüzden depoda durması doğru. Oyuncunun
// reklam kimliğini sıfırlaması hash'i de değiştirir — o zaman yenisi alınır.
//
// Nereden bulunur: uygulamayı cihazda aç, BİR REKLAM İSTE, sonra
//   adb logcat | grep "setTestDeviceIds"
// Ads SDK'sı ilk reklam isteğinde hash'i kendisi yazdırıyor:
//   I/Ads: Use RequestConfiguration.Builder().setTestDeviceIds(
//          Arrays.asList("...")) to get test ads on this device.
//
// HASH CİHAZA DEĞİL, İMZAYA BAĞLI — listede birden çok değer olmasının
// sebebi bu. Aynı telefonda ÜÇ farklı değer ölçüldü (2026-08-07, Galaxy A51):
//   debug anahtarı            → 50CD4ED8DA91D950C1BFDFB07897BFB5
//   upload (yayın) anahtarı   → 58A6B46444BBBA9EF97BA72ECA2BE728
//   üçüncü taraf imzalı kurulum → 88D815B20F99227E224E91EB84233D54
// Yani debug'da doğruladığın koruma, yayın APK'sında KENDİLİĞİNDEN geçerli
// olmuyor. İmza değiştiğinde hash yeniden okunmalı; fazlalık girdi zararsız.
//
// AÇIK RİSK — Play App Signing: Play'den kurulan uygulama Google'ın kendi
// imza anahtarıyla yeniden imzalanıyor, yani oradan gelen kurulumun hash'i
// muhtemelen DÖRDÜNCÜ bir değer olacak ve bu listede bulunmayacak. Uygulamayı
// Play'den kendi cihazına kurup reklamlarına dokunursan geçersiz trafik
// üretirsin. İç test kanalından ilk kurulumda logcat'ten yeni hash'i oku ve
// buraya ekle; ölçülene kadar Play'den kurulmuş sürümde reklamlara DOKUNMA.
//
// UMP ile Ads AYNI hash'i kullanıyor (ikisi de aynı satırı yazdırıyor),
// ama biçimleri de aynı olduğu için hangi kurulumdan geldiğini karıştırmak
// çok kolay — asıl tuzak orada.
//
// Yanlış hash SESSİZCE başarısız olur: SDK cihazı tanımaz ve gerçek reklam
// sunar, yani korunduğunu sanarken korunmuyor olursun. Doğrulamanın tek
// yolu logcat'te şu satırı GÖRMEK:
//   I/Ads: This request is sent from a test device.
// Onun yerine "Use RequestConfiguration.Builder().setTestDeviceIds(...)"
// satırını görüyorsan hash yanlıştır ve doğrusu o satırın içinde yazılıdır.
//
// LİSTE BOŞKEN GERÇEK KİMLİK KULLANILMAZ. Bu kural `tools/ad-release-test.js`
// tarafından denetleniyor: AD_IDS demo birimlerinden farklıysa ve bu dizi
// boşsa test başarısız olur. Sessizce kendi reklamına tıklama ihtimalini
// koda değil, teste bağladık — çalışma zamanında reklamı kapatmak, gerçek
// oyuncunun reklamını da kapatmak demek olurdu.
const AD_TEST_DEVICES = [
  '50CD4ED8DA91D950C1BFDFB07897BFB5',   // Galaxy A51 — debug imzalı kurulum
  '58A6B46444BBBA9EF97BA72ECA2BE728',   // Galaxy A51 — release (upload) anahtarıyla imzalı
];

// Olay adları HAM DİZGİ olarak yazılı. `RewardAdPluginEvents` enum'u
// paketin ES modülünde yaşıyor ve bu projede paketleyici YOK (CLAUDE.md §1),
// yani çalışma zamanında erişilemez. Dizgiler eklentinin
// reward-ad-plugin-events.enum'undan birebir alındı.
const AD_EV = {
  rewarded:     'onRewardedVideoAdReward',
  dismissed:    'onRewardedVideoAdDismissed',
  failedToShow: 'onRewardedVideoAdFailedToShow',
  failedToLoad: 'onRewardedVideoAdFailedToLoad',
  // Ön yükleme için: "reklam yüklendi, gösterilmeye hazır".
  loaded:       'onRewardedVideoAdLoaded',
};

// Geçiş reklamının olayları AYRI bir enum'da (interstitial-ad-plugin-events),
// adları da ödüllüninkinden farklı — aynı gerekçeyle ham dizgi.
const INT_EV = {
  loaded:       'interstitialAdLoaded',
  showed:       'interstitialAdShowed',
  dismissed:    'interstitialAdDismissed',
  failedToShow: 'interstitialAdFailedToShow',
  failedToLoad: 'interstitialAdFailedToLoad',
};

// Gerçek SDK yalnızca native kabukta var. Web/PWA yolunda simülasyon
// KALIYOR: CLAUDE.md §1'e göre web birincil geliştirme yüzeyi ve orada
// reklam SDK'sı yok — simülasyonu silmek o yüzeyi test edilemez yapardı.
//
// Erişim `Capacitor.Plugins.AdMob` üzerinden: `import` kullanılamaz, aynı
// gerekçe (splash-screen eklentisinde kurulan desen, index.html'e bak).
function adMobPlugin() {
  const C = (typeof Capacitor !== 'undefined') ? Capacitor : null;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  return (C.Plugins && C.Plugins.AdMob) || null;
}

// ==================== REKLAM RIZASI (UMP / GDPR) ====================
//
// AB/İngiltere kullanıcısına rıza akışı göstermeden reklam istemek gerçek
// bir GDPR ihlali riski — AdMob hesap askısından AYRI, yasal bir risk.
//
// Bölgeyi BİZ TAHMİN ETMİYORUZ. `requestConsentInfo()` Google'ın kendi
// mantığını çalıştırıyor ve "form gerekli mi" sorusunu o cevaplıyor;
// kapsam dışı bir bölgede hiçbir şey gösterilmemesi NORMAL, hata değil.
//
// Enum'lar ham değer olarak yazılı: paketleyici yok (CLAUDE.md §1), yani
// paketin AdmobConsentStatus / AdmobConsentDebugGeography enum'ları
// çalışma zamanında erişilemez. Değerler eklentinin kendi enum
// dosyalarından birebir alındı.
const UMP_STATUS = {
  notRequired: 'NOT_REQUIRED',
  obtained:    'OBTAINED',
  required:    'REQUIRED',
  unknown:     'UNKNOWN',
};
const UMP_GEO = { disabled: 0, eea: 1, us: 3, other: 4 };

const AdConsent = {
  _promise: null,
  _info: null,

  info() { return this._info; },

  // Reklam istenebilir mi? Google'ın kendi cevabı (`canRequestAds`).
  // Bilgi HİÇ alınamadıysa (eklenti yok, ağ yok, çağrı patladı) cevap
  // HAYIR: bölgeyi bilmeden reklam istemek, rıza gerekiyor olabilecek
  // bir kullanıcıya rızasız reklam göstermek demek. Maliyeti yalnızca
  // bir reklamın gösterilmemesi; karşılığı yasal risk.
  canRequestAds() {
    return !!(this._info && this._info.canRequestAds);
  },

  // AB'de kullanıcının rızasını SONRADAN değiştirebilmesi zorunlu.
  privacyOptionsRequired() {
    return !!(this._info &&
              this._info.privacyOptionsRequirementStatus === UMP_STATUS.required);
  },

  // Hata ayıklama kapısı — YALNIZCA localStorage'da açıkça varsa çalışır.
  // Depoda sabit bir AB simülasyonu YOK: test yapılandırması yayına
  // sızmasın. Ayrıca debugGeography Google tarafında yalnızca KAYITLI
  // test cihazlarında geçerli, yani gerçek kullanıcı bunu kullanamaz.
  //   localStorage.ph_ump_debug = '{"geo":1,"ids":["CIHAZ_HASH"]}'
  _debugOptions() {
    try {
      const raw = localStorage.getItem('ph_ump_debug');
      if (!raw) return null;
      const d = JSON.parse(raw);
      const o = {};
      if (typeof d.geo === 'number') o.debugGeography = d.geo;
      if (Array.isArray(d.ids) && d.ids.length) o.testDeviceIdentifiers = d.ids;
      return Object.keys(o).length ? o : null;
    } catch (e) { return null; }
  },

  // Bir kez çalışır, sonucu saklanır. İLK REKLAM İSTEĞİNDEN ÖNCE
  // tamamlanmış olması gerektiği için hem açılışta çağrılıyor hem de
  // reklam yolunda bekleniyor (ikisi aynı promise'i paylaşıyor).
  ensure(adArg) {
    if (this._promise) return this._promise;
    const ad = adArg || adMobPlugin();
    if (!ad || !ad.requestConsentInfo) {
      // Web/PWA: SDK yok, simülasyon çalışıyor, rızanın konusu yok.
      this._promise = Promise.resolve(null);
      return this._promise;
    }
    const opts = this._debugOptions() || {};
    this._promise = ad.requestConsentInfo(opts)
      .then((info) => {
        this._info = info || null;
        // Form YALNIZCA gerekiyorsa ve mevcutsa gösterilir.
        const need = info && info.status === UMP_STATUS.required &&
                     info.isConsentFormAvailable !== false;
        if (!need) return info;
        return ad.showConsentForm().then((after) => {
          // showConsentForm güncel bilgiyi döndürüyor; kullanıcı reddetmiş
          // olabilir, o da geçerli bir sonuç — akış devam eder.
          this._info = after || this._info;
          return this._info;
        });
      })
      .catch((e) => {
        // Rıza alınamadıysa reklam gösterilmez ama UYGULAMA ÇALIŞMAYA
        // DEVAM EDER: menüler, oyunlar, elmas harcama etkilenmez.
        if (typeof console !== 'undefined') console.warn('[UMP] ' + (e && e.message || e));
        this._info = null;
        return null;
      });
    return this._promise;
  },

  // Profil'deki "Gizlilik Seçenekleri" satırı buraya bağlı.
  showPrivacyOptions() {
    const ad = adMobPlugin();
    if (!ad || !ad.showPrivacyOptionsForm) { showToast('Bu cihazda kullanılamıyor'); return; }
    ad.showPrivacyOptionsForm()
      .then(() => ad.requestConsentInfo(this._debugOptions() || {}))
      .then((info) => { if (info) this._info = info; renderSettings(); })
      .catch((e) => {
        showToast('Gizlilik formu açılamadı');
        if (typeof console !== 'undefined') console.warn('[UMP] ' + (e && e.message || e));
      });
  },

  // Yalnızca test için: rıza durumunu sıfırlar ki form tekrar çıksın.
  reset() {
    const ad = adMobPlugin();
    if (!ad || !ad.resetConsentInfo) return Promise.resolve(false);
    this._promise = null; this._info = null;
    return ad.resetConsentInfo().then(() => true);
  },
};

const RewardedAd = {
  _initPromise: null,

  // ───────── GECİKME VE ÇİFT DOKUNUŞ ─────────
  //
  // Ölçüm (2026-08-07, Galaxy A51, gerçek birim, test reklamı):
  //   prepareRewardVideoAd → Loaded : 3360 / 4352 / 4459 ms
  //   yüklü reklamı göstermek        : ~125 ms
  // Yani gecikmenin tamamı YÜKLEMEDE. Dokunuşta yüklemeye başlamak,
  // oyuncuya ~4 saniyelik ölü bir pencere bırakıyordu ve o pencerede
  // düğmeye 3-4 kez basılabiliyordu — her basış YENİ bir istek başlatıyor,
  // arka arkaya reklamlar açılıyordu. Bildirilen hata buydu.
  //
  // İki ayrı kusur, iki ayrı çare; ikisi de gerekli:
  //   _pending → aynı anda ikinci bir gösterim başlamasın (DOĞRULUK).
  //              Ekonomik yanı asıl mesele: her tamamlanan reklam
  //              AdBudget.consume() çağırıyor, yani tek bir "devam et"
  //              niyeti oyuncunun 3-4 reklam hakkını yiyordu; elmas veren
  //              yollarda ise tersine 3-4 kat ödül dağıtıyordu.
  //   preload  → reklam ÖNCEDEN yüklensin, gösterim 125 ms'ye insin (HIZ).
  _pending: false,     // bir gösterim uçuşta
  _ready: false,       // yüklü, gösterilmeye hazır bir reklam var
  _loading: null,      // uçuşta olan ön yükleme promise'i

  // Teklif ekranı açılınca çağrılır (oyun-sonu paneli, elmas mağazası).
  // SESSİZ: oyuncu bir şey istemedi, başarısızlığında toast çıkmaz.
  // Hedefli çağrı bilinçli — her oturumda peşinen reklam istemek, hiç
  // reklam izlemeyen oyuncular için boşa istek demek (AdMob eşleşme oranı).
  preload() {
    const ad = adMobPlugin();
    if (!ad) return Promise.resolve(false);          // web: simülasyon, yükleme yok
    if (this._ready) return Promise.resolve(true);
    if (this._loading) return this._loading;
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return Promise.resolve(false);
    // AdBudget KONTROLÜ KALDIRILDI (2026-08-07). Günlük hak artık yalnızca
    // elmas kazanmayı sınırlıyor; fayda eylemleri (devam, yeniden başlat,
    // önceki seviye, karıştır, ipucu) bütçe sıfırken de çalışıyor. Kontrol
    // burada kalsaydı, bütçesi bitmiş oyuncu için ön yükleme sessizce
    // devre dışı kalır ve o eylemlerin HEPSİ yeniden ~4 saniye gecikirdi —
    // yani bütçe, kaldırıldığı hâlde gecikme üzerinden etkisini sürdürürdü.

    this._loading = AdConsent.ensure(ad).then(() => {
      if (!AdConsent.canRequestAds()) return false;
      return this._ensureInit(ad)
        .then(() => new Promise((resolve) => {
          let subs = [], settled = false;
          const done = (ok) => {
            if (settled) return;
            settled = true;
            subs.forEach((h) => { try { h && h.remove && h.remove(); } catch (e) {} });
            this._ready = ok;
            resolve(ok);
          };
          Promise.all([
            ad.addListener(AD_EV.loaded, () => done(true)),
            ad.addListener(AD_EV.failedToLoad, () => done(false)),
          ]).then((handles) => {
            subs = handles;
            return ad.prepareRewardVideoAd({
              adId: AD_IDS.rewardedAndroid,
              isTesting: false,
            });
          }).catch(() => done(false));
        }));
    }).catch(() => false)
      .then((ok) => { this._loading = null; return ok; });

    return this._loading;
  },

  // initialize() BİR KEZ. Promise saklanıyor ki üst üste gelen iki istek
  // SDK'yı iki kez başlatmasın.
  //
  // Test cihazı listesi BURADAN geçiyor, reklam isteğinden değil: eklenti
  // `testingDevices`'ı yalnızca initialize sırasında okuyup
  // setRequestConfiguration'a veriyor (AdMob.java, setRequestConfiguration).
  // Yani liste tüm reklam biçimleri için tek seferde kuruluyor — geçiş
  // reklamı da aynı yapılandırmayı kullanıyor, ayrıca bir şey yapmak gerekmiyor.
  //
  // `initializeForTesting` bir kip değil, sadece testingDevices'ın okunup
  // okunmayacağını belirleyen kapı (aynı dosya, satır 200-203). Liste boşsa
  // açmanın anlamı yok, o yüzden listeye bağlı.
  _ensureInit(ad) {
    if (!this._initPromise) {
      this._initPromise = ad.initialize({
        initializeForTesting: AD_TEST_DEVICES.length > 0,
        testingDevices: AD_TEST_DEVICES,
      })
        .catch((e) => { this._initPromise = null; throw e; });
    }
    return this._initPromise;
  },

  // ───────── GERÇEK SDK (native) ─────────
  //
  // Sözleşme runRewardedAction'ınkiyle AYNI kalmak zorunda: onComplete
  // YALNIZCA ödül gerçekten hak edilince çağrılır. Bütçeyi tüketen şey
  // onComplete olduğu için, reklamı yarıda kapatan oyuncudan hak gitmez —
  // ekonomi kuralı 2 tam olarak burada korunuyor.
  //
  // Ödülün tek doğruluk kaynağı `Rewarded` OLAYI. `Dismissed` iki durumda
  // da geliyor (ödül alınmadan kapatma VE ödül alındıktan sonra kapanma),
  // yani tek başına "ödül verildi mi" sorusunu cevaplayamaz.
  _showNative(ad, reward, onComplete) {
    let earned = false, settled = false, subs = [];
    const cleanup = () => {
      subs.forEach((h) => { try { h && h.remove && h.remove(); } catch (e) {} });
      subs = [];
    };
    // Reklam gösterilemezse oyuncu ASILI KALMAZ; ödül de verilmez, bütçe de
    // düşmez. Simülasyona geri düşmek cazip ama yanlış olurdu: reklamsız
    // ödül dağıtmak, yayında bedava ödül açığı demek.
    // Her iki çıkış yolu da _pending'i BIRAKMAK ve _ready'yi düşürmek
    // zorunda: gösterilen (ya da gösterilemeyen) reklam tüketilmiştir,
    // eldeki yükleme artık yok. Biri unutulursa oyuncu bir daha reklam
    // izleyemez — sessiz ve teşhisi zor bir kilit olurdu.
    // Panel açıkken düğmeleri de tazele: "Yükleniyor…" durumundan çıksın.
    // Başarısızlık yolunda kimse refreshGameOverOffers'ı çağırmıyordu, o
    // yüzden düğme sonsuza kadar yüklüyor gibi kalırdı.
    const release = () => {
      this._pending = false; this._ready = false;
      if (typeof refreshGameOverOffers === 'function') refreshGameOverOffers();
    };
    // Gösterilen reklam TÜKENİR; bir sonraki için hemen yenisini yükle.
    // Bu, fayda eylemleri sınırsız olduğundan (2026-08-07) çok daha önemli
    // hale geldi: oyuncu arka arkaya "yeniden başlat" diyebiliyor ve ilki
    // hızlı, ikincisi ~4 saniye gecikmeli olsaydı düzeltme yarım kalırdı.
    // YALNIZCA başarılı gösterimden sonra: başarısızlıktan sonra yeniden
    // denemek, kopan bir ağda sonsuz istek döngüsü olurdu.
    const preloadNext = () => { try { this.preload(); } catch (e) {} };
    const fail = (why, msg) => {
      if (settled) return;
      settled = true; cleanup(); release();
      showToast(msg || '📺 Reklam şu an yüklenemedi, sonra tekrar dene');
      if (typeof console !== 'undefined') console.warn('[AdMob] ' + why);
    };
    const finish = () => {
      if (settled) return;
      settled = true; cleanup(); release();
      preloadNext();
      if (earned && onComplete) onComplete();
      else if (!earned) showToast('📺 Ödül için reklamı sonuna kadar izlemelisin');
    };

    // RIZA ÖNCE. Açılışta zaten başlatıldı; burada aynı promise bekleniyor,
    // yani ilk reklam isteği rıza çözülmeden ASLA gitmiyor. Google'ın
    // cevabı hayırsa (kapsam içi bölge + rıza yok) istek hiç yapılmıyor.
    AdConsent.ensure(ad).then(() => {
      if (!AdConsent.canRequestAds()) {
        fail('riza yok (canRequestAds=false)',
             '📺 Reklam gösterilemiyor — gizlilik tercihlerini Profil’den değiştirebilirsin');
        return null;
      }
      return this._ensureInit(ad)
        // Uçuşta bir ÖN YÜKLEME varsa onu bekle. Gerçekçi yarış bu:
        // oyuncu teklif ekranı açılır açılmaz basıyor. Beklemezsek aynı
        // anda ikinci bir prepare gider ve ön yükleme boşa harcanır.
        .then(() => this._loading || null)
        .then(() => Promise.all([
          ad.addListener(AD_EV.rewarded, () => { earned = true; }),
          ad.addListener(AD_EV.dismissed, () => finish()),
          ad.addListener(AD_EV.failedToShow, () => fail('gosterilemedi')),
          ad.addListener(AD_EV.failedToLoad, () => fail('yuklenemedi')),
        ]))
        .then((handles) => {
          subs = handles;
          // isTesting YAYINDA KAPALI OLMAK ZORUNDA — ve bu, göründüğünden
          // farklı çalışan bir bayrak. Eklentinin AdViewIdHelper.getFinalAdId'i
          // isTesting true iken, cihaz test cihazı DEĞİLSE bizim adId'mizi
          // atıp Google'ın demo birimini kullanıyor. Yani açık bırakmak
          // "ekstra emniyet" değil, gerçek oyuncuya demo reklam göstermek,
          // yani sıfır gelir olurdu.
          // Kendi cihazımızın korunması bu bayrağa değil, AD_TEST_DEVICES'a
          // bağlı — o liste gerçek birim kimliğiyle test reklamı sunuyor.
          // Reklam ÖNCEDEN yüklendiyse prepare atlanıyor — gecikmenin
          // tamamı burada, ~4 saniye. Hazır reklamı göstermek ~125 ms.
          if (this._ready) return null;
          return ad.prepareRewardVideoAd({
            adId: AD_IDS.rewardedAndroid,
            isTesting: false,
          });
        })
        .then(() => ad.showRewardVideoAd());
    }).catch((e) => fail(e && e.message ? e.message : String(e)));
  },

  // ÇİFT DOKUNUŞ KALKANI BURADA, tek kapıda. runRewardedAction'a
  // konulmadı çünkü asenkron pencerenin sahibi burası; ayrıca kapı
  // Plus yolunda hiç buraya uğramıyor (onReward senkron çağrılıyor) ve
  // orada kalkana gerek yok.
  //
  // Reddedilen çağrı bütçeye DOKUNMUYOR: consume() zaten onComplete'in
  // içinde, o da yalnızca ödül hak edilince çalışıyor. Yani ikinci dokunuş
  // ne reklam açıyor ne de oyuncuya bir şey kaybettiriyor.
  show(reward, onComplete) {
    if (this._pending) return false;
    this._pending = true;
    // release() ile simetrik: durumu kurar kurmaz düğmeler tazeleniyor,
    // yani "Yükleniyor…" dokunuşun HEMEN ardından görünüyor.
    if (typeof refreshGameOverOffers === 'function') refreshGameOverOffers();
    const ad = adMobPlugin();
    if (ad) this._showNative(ad, reward, onComplete);
    else this._showSimulated(reward, onComplete);
    return true;
  },

  // ───────── SİMÜLASYON (web/PWA) ─────────
  // Silinmedi: web birincil geliştirme yüzeyi ve orada SDK yok.
  _showSimulated(reward, onComplete) {
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
        // _pending BURADA da bırakılmak zorunda. Native yolun release()'i
        // buraya uğramıyor; unutulursa web'de ilk reklamdan sonra bir daha
        // hiç reklam açılmaz ve web birincil geliştirme yüzeyi (§1).
        this._pending = false;
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
// GÜNLÜK HAK ARTIK YALNIZCA ELMAS KAZANMAYA UYGULANIR (2026-08-07,
// sahip kararı). Bu, 2026-07-30'daki "tek paylaşımlı havuz" kuralının
// BİLİNÇLİ olarak geri alınmasıdır — aşağıdaki gerekçe artık geçerli değil:
//   "bütçeyi elmasa harcamak, elması biriktirmeyi anlamlı kılıyor"
// Pratikte ters çalıştı: devam etme, yeniden başlatma, önceki seviye,
// karıştırma, ipucu gibi FAYDA eylemleri de aynı havuzu tükettiği için
// oyuncu, hiç elmas istemediği hâlde günün ortasında oyunu ilerletemez
// hâle geliyordu. Reklamı oyuncu KENDİ İSTEĞİYLE izliyor ve karşılığında
// bir kolaylık alıyor; bunu sınırlamak ne oyuncuyu ne de geliri koruyor.
// Sınırlanması gereken tek şey ÜCRETSİZ ELMAS musluğu, çünkü ekonomiyi
// bozan tek şey o.
//
// VARSAYILAN BİLEREK "BÜTÇEYE TABİ": yeni bir elmas veren eylem eklenip
// bayrak unutulursa sonuç sınırsız elmas olurdu — sessiz ve pahalı bir
// açık. Fayda eylemi ekleyip bayrağı unutmanın bedeli ise yalnızca gereksiz
// bir sınır; yani yanlış tarafa düşmek ucuz olan yön bu.
//
// Kapı hâlâ TEK: Plus baypası, reklam gösterimi, tüketim ve geçiş reklamı
// köprüsü hepsi burada. Değişen tek şey, tüketimin KOŞULLU olması.
function runRewardedAction(reward, onReward, opts) {
  opts = opts || {};
  const sayilir = !opts.skipDailyLimit;   // günlük hakka işler mi

  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    onReward();
    return true;
  }
  // UI zaten devre dışı bırakılmış olmalı; bu savunma katmanı (oyun
  // içinden doğrudan çağrılan yollar için).
  if (sayilir && !AdBudget.canWatch()) {
    showToast('📺 Bugünkü elmas hakkın bitti — yarın tekrar gel!');
    return false;
  }
  RewardedAd.show(reward, () => {
    if (sayilir) AdBudget.consume();
    // Oyuncu AZ ÖNCE bir reklam izledi. Geçiş reklamının zamanlayıcısı tam
    // burada sıfırlanıyor, yoksa "ödülü al → oyundan çık → hemen bir reklam
    // daha" dizisi mümkün olurdu: oyuncunun kendi isteğiyle izlediği reklam,
    // istemediği bir reklamın gerekçesine dönüşürdü. Bütçe (AdBudget) ile
    // sıklık kapağı (InterstitialAds) ayrı eksenler olduğu için bu köprü
    // açıkça kurulmak zorunda — kendiliğinden oluşmuyor.
    if (typeof InterstitialAds !== 'undefined') InterstitialAds.noteRewardedShown();
    onReward();
  });
  return true;
}

// ==================== GEÇİŞ REKLAMI (INTERSTITIAL) ====================
//
// Ödülsüz, tam ekran reklam. Ödüllüden farkı ekonomik değil DAVRANIŞSAL:
// ödüllü reklamı oyuncu ister (bir şey karşılığında), bunu biz araya
// sokarız. Dolayısıyla buranın tasarım sorusu "ne kadar kazandırır" değil,
// "ne zaman rahatsız etmez" — ve bütün kod o sorunun cevabı.
//
// ───── NEDEN AdBudget'A BAĞLANMADI ─────
// AdBudget "oyuncu bugün kaç ödül isteyebilir"i sınırlar; burası "biz kaç
// kez araya girebiliriz"i. Aynı havuza bağlamak, istenmeyen bir reklamın
// istenen bir ödülü yemesi demekti (oyuncu continue hakkını kaybederdi,
// hiç talep etmediği bir reklam yüzünden). İki ayrı eksen, tek bir köprü:
// bkz. noteRewardedShown().
//
// ───── İKİ EKSENLİ SIKLIK SINIRI ─────
// Son gösterimden bu yana EN AZ 3 dakika VE EN AZ 3 tur bitişi. İkisi de
// sağlanmadan reklam çıkmaz; tek eksen yeterli olsaydı ikisi de kendi
// başına bozulurdu:
//   • yalnız süre    → hızlı oynayan oyuncu her 3 dakikada bir reklam yer
//   • yalnız tur     → kısa oyunlarda (Hafıza, Labirent) üç tur bir
//                      dakikaya sığar, aynı sonuç
// Eşikler EconomyConfig'te; buradaki kural onların AND'lenmesi.
//
// ───── NEREDE GÖSTERİLMEZ ─────
//   1. Açılışta/splash'ta — maybeShow'un TEK çağrı yeri exitGame(), yani
//      bu yapısal olarak imkânsız, ayrıca bir bayrakla korunmuyor.
//   2. Oyun oynanırken — aynı sebep. Seviye tamamlama game_ended yayınlar
//      ama yalnızca SAYAR; Su Sıralama'da seviye aralarına reklam girmez.
//   3. Keşfet'ten başlatılan oturumun çıkışında — muafiyet, sınırlara
//      bakılmadan (aşağıda).
//   4. Premium'da hiç.
const InterstitialAds = {
  _key: 'ph_interstitial',
  // Aynı anda iki gösterim denemesi olmasın. Kalıcı değil (oturumluk):
  // uygulama kapanırsa asılı kalmış bir bayrak sonsuza kadar reklamı
  // engellerdi.
  _showing: false,

  // Sayılar EconomyConfig'ten ÇAĞRI ANINDA okunuyor — denge ayarı tek
  // dosyada yapılsın (CLAUDE.md ekonomi kuralı).
  minIntervalMs() { return EconomyConfig.INTERSTITIAL_MIN_INTERVAL_MS; },
  minRounds()     { return EconomyConfig.INTERSTITIAL_MIN_ROUNDS; },

  // GÜNLÜK SIFIRLAMA YOK ve bu bilinçli: StreakSystem/AdBudget/DailyQuests'in
  // toDateString() deseni burada YANLIŞ olurdu. Onlar günlük HAK dağıtıyor,
  // burası kayan bir sıklık kapağı. Sayaç günler ve oturumlar boyunca
  // taşınır — 2 turda çıkan oyuncunun o iki turu unutulmamalı.
  _data() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { return {}; }
  },

  _save(d) {
    try { localStorage.setItem(this._key, JSON.stringify(d)); } catch (e) {}
  },

  rounds()      { return this._data().rounds || 0; },
  lastShownAt() { return this._data().lastShownAt || 0; },

  // GameEvents'in üçüncü abonesi. Hangi oyun, hangi sonuç (won/lost/quit)
  // ÖNEMSİZ — sayılan şey "bir tur bitti"; oyuncunun molası burada oluşur.
  // stray (açık tur yokken gelen bitiş) işlemez: DailyQuests ile aynı
  // kural, yoksa reklam sıklığı oynanan turdan fazla olurdu.
  onRoundEnded(ev) {
    if (ev && ev.stray) return;
    const d = this._data();
    d.rounds = (d.rounds || 0) + 1;
    this._save(d);
  },

  // Ödüllü reklam izlendi → zamanlayıcı ŞİMDİ başlar. runRewardedAction'ın
  // içinden, AdBudget.consume()'un yanından çağrılıyor: iki sistemin tek
  // teması burası.
  noteRewardedShown() {
    const d = this._data();
    d.lastShownAt = Date.now();
    this._save(d);
  },

  // İki eksen. Saf fonksiyon: yan etkisi yok, her an yeniden hesaplanabilir.
  canShow(now) {
    now = now || Date.now();
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return false;
    if (this._showing) return false;
    const d = this._data();
    if ((d.rounds || 0) < this.minRounds()) return false;
    const last = d.lastShownAt || 0;
    // last === 0: henüz hiç reklam gösterilmemiş → zaman ekseni sağlanmış
    // sayılır, yalnızca tur eksenini bekler. (Saat geriye alınırsa fark
    // negatif olur ve reklam ENGELLENİR — yanlış yön değil, güvenli yön.)
    if (last && (now - last) < this.minIntervalMs()) return false;
    return true;
  },

  // Tek gösterim kapısı. Dönüş: "gösterim denemesi başladı mı".
  //
  // opts.fromDiscover → Keşfet akışından başlatılmış bir oturumun çıkışı.
  // Orası hızlı-deneme yüzeyi: oyuncu kart kart geziniyor, bir oyunu
  // saniyeler içinde açıp kapatıyor. Araya reklam sokmak akışın kendisini
  // öldürürdü, o yüzden SINIRLARA BAKILMADAN muaf. Sayaç sıfırlanmıyor:
  // o turlar gerçekten oynandı, bir sonraki normal çıkışta hâlâ geçerli.
  maybeShow(opts) {
    opts = opts || {};
    if (opts.fromDiscover) return false;
    if (!this.canShow()) return false;

    this._showing = true;
    this._present(
      () => {
        // GÖSTERİLDİ. İki eksen de ancak burada sıfırlanır.
        const d = this._data();
        d.rounds = 0;
        d.lastShownAt = Date.now();
        this._save(d);
        this._showing = false;
      },
      () => {
        // GÖSTERİLEMEDİ: hiçbir şey tüketilmez, sayaç durur, bir sonraki
        // çıkışta yeniden denenir. Ödüllüdeki disiplinin aynısı — orada
        // "reklamsız ödül" açığı vardı, burada "gösterilmeyen reklamın
        // sıklık hakkını yemesi" olurdu.
        this._showing = false;
      }
    );
    return true;
  },

  _present(onShown, onFail) {
    const ad = adMobPlugin();
    if (ad) { this._presentNative(ad, onShown, onFail); return; }
    this._presentSimulated(onShown, onFail);
  },

  // ───────── GERÇEK SDK (native) ─────────
  _presentNative(ad, onShown, onFail) {
    let shown = false, settled = false, subs = [];
    const cleanup = () => {
      subs.forEach((h) => { try { h && h.remove && h.remove(); } catch (e) {} });
      subs = [];
    };
    // Başarısızlık SESSİZ — ödüllüden ayrıldığı yer burası. Orada oyuncu
    // bir ödül bekliyordu ve bilgilendirilmesi şarttı; burada istemediği
    // bir şey gelmedi, "reklam yüklenemedi" demek saf gürültü olurdu.
    const fail = (why) => {
      if (settled) return;
      settled = true; cleanup();
      if (typeof console !== 'undefined') console.warn('[AdMob/interstitial] ' + why);
      onFail();
    };
    // Sayacı sıfırlayan tek şey `Showed` OLAYI. `Dismissed` tek başına
    // yetmez: reklam hiç görünmeden de kapanabilir, o zaman oyuncu
    // rahatsız edilmemiş olur ve sıklık hakkını harcamamalı. Ödüllüdeki
    // `Rewarded`-vs-`Dismissed` ayrımının birebir aynısı.
    const done = () => {
      if (settled) return;
      settled = true; cleanup();
      if (shown) onShown(); else onFail();
    };

    // Rıza ÖNCE — ödüllüyle aynı kapı, aynı promise. UMP kuralı formatlara
    // göre değişmez: rıza yoksa hiçbir reklam istenmez.
    AdConsent.ensure(ad).then(() => {
      if (!AdConsent.canRequestAds()) { fail('riza yok (canRequestAds=false)'); return null; }
      // RewardedAd._ensureInit BİLEREK yeniden kullanılıyor: initialize()
      // SDK'nın tamamı için bir kez çağrılır, format başına değil. Buraya
      // ikinci bir _initPromise yazmak SDK'yı iki kez başlatırdı.
      return RewardedAd._ensureInit(ad)
        .then(() => Promise.all([
          ad.addListener(INT_EV.showed, () => { shown = true; }),
          ad.addListener(INT_EV.dismissed, () => done()),
          ad.addListener(INT_EV.failedToShow, () => fail('gosterilemedi')),
          ad.addListener(INT_EV.failedToLoad, () => fail('yuklenemedi')),
        ]))
        .then((handles) => {
          subs = handles;
          // isTesting kapalı — gerekçe ödüllü reklamdaki notta.
          return ad.prepareInterstitial({
            adId: AD_IDS.interstitialAndroid,
            isTesting: false,
          });
        })
        .then(() => ad.showInterstitial());
    }).catch((e) => fail(e && e.message ? e.message : String(e)));
  },

  // ───────── SİMÜLASYON (web/PWA) ─────────
  // Ödüllüdeki gerekçenin aynısı: web birincil geliştirme yüzeyi ve orada
  // SDK yok — silinirse sıklık mantığı o yüzeyde hiç görülemez.
  _presentSimulated(onShown, onFail) {
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-modal">
        <div class="ad-header">📺 Reklam</div>
        <div class="ad-body">
          <div class="ad-reward-preview">Geçiş reklamı simülasyonu</div>
          <div class="ad-timer">
            <div class="ad-timer-bar"><div class="ad-timer-fill"></div></div>
            <span class="ad-timer-text">2 saniye sonra kapatılabilir</span>
          </div>
        </div>
        <button class="ad-skip" style="display:none">Kapat ✕</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const fill = overlay.querySelector('.ad-timer-fill');
    fill.style.transition = 'width 2s linear';
    requestAnimationFrame(() => { fill.style.width = '100%'; });

    setTimeout(() => {
      const skipBtn = overlay.querySelector('.ad-skip');
      skipBtn.style.display = 'block';
      skipBtn.addEventListener('click', () => {
        overlay.remove();
        onShown();
      });
    }, 2000);
  },
};

// GameEvents'in ÜÇÜNCÜ abonesi (DailyQuests, Badges, InterstitialAds).
// exitGame()'in 'quit' bitişi de buradan geliyor — GameEvents.abandon()
// zaten game_ended yayınlıyor, ayrı bir enjeksiyon gerekmiyor.
GameEvents.on('game_ended', function (ev) { InterstitialAds.onRoundEnded(ev); });

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
  const balance = DiamondSystem.get();
  const gemOk = gemCost != null && balance >= gemCost;

  const scrim = document.createElement('div');
  scrim.className = 'ph-modal-scrim';
  const panel = document.createElement('div');
  panel.className = 'ph-modal ph-modal-enter';
  panel.innerHTML =
    '<div class="ph-offer">' +
      '<div class="ph-offer-title"></div>' +
      // Bütçeye göre PASİFLEŞMİYOR: bu modal fayda eylemleri için
      // (ipucu, geri al, ekstra hamle) ve onlar 2026-08-07'den beri günlük
      // hakka işlemiyor. Günlük hak satırı da kaldırıldı — burada artık
      // yanlış bir sınırı anlatıyordu.
      '<button class="ph-offer-btn primary" data-a="ad">' +
        (plus ? '👑 ' : '📺 ') + (opts.adText || 'Reklam İzle') +
      '</button>' +
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
    runRewardedAction({ icon: '🎁', text: opts.adText || 'Ödül' }, () => opts.onGrant('ad'),
                      { skipDailyLimit: true });
  });
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
}

// ==================== SATIN ALMA (RevenueCat) ====================
//
// Abonelik ve elmas paketleri BURADAN geçer. Reklamlarda olduğu gibi tek
// bir alt katman var ve üstündeki ürün mantığı (hangi plan, kaç elmas)
// ona dokunmuyor.
//
// ───── ÜRÜN KİMLİKLERİ ─────
// Play Console'daki kimliklerle BİREBİR aynı olmak zorunda; eşleşmezse
// ürün "bulunamadı" döner ve hata mesajı bunu söylemez. Fiyat burada
// YAZMAZ — mağazadan gelir (bkz. priceFor).
//
// Elmas miktarları ise mağazadan DEĞİL koddan okunuyor: mağaza fiyatın
// doğruluk kaynağı, ekonominin değil. Play Console'da bir ürünün adını
// değiştirmek oyunun elmas dengesini kaydırmamalı.
const IAP = {
  ENTITLEMENT: 'plus',      // RevenueCat entitlement adı
  OFFERING: 'default',      // RevenueCat offering adı
  PLUS: { weekly: 'plus_weekly', monthly: 'plus_monthly', yearly: 'plus_yearly' },
  DIAMONDS: {
    small:  'diamonds_100',
    medium: 'diamonds_550',
    large:  'diamonds_1800',
    mega:   'diamonds_6500',
  },
};

// RevenueCat'in ANDROID PUBLIC SDK anahtarı ('goog_...').
//
// Reklam birimi kimliklerinden farklı olarak bu anahtar TASARIM GEREĞİ
// geneldir: istemciye gömülmek üzere üretiliyor, tek başına hiçbir yetki
// vermiyor (satın alma doğrulaması Google'ın sunucusunda yapılıyor). Yani
// AD_IDS'teki "gerçek kimlik depoda durmaz" kuralı buraya UYGULANMAZ —
// burada gerçek anahtarın durması doğru olan.
//
// Gerçek anahtar girildi (2026-08-03). Boş kalsaydı Billing.init() sessizce
// atlanır ve uygulama normal çalışırdı — o davranış duruyor, artık sadece
// tetiklenmiyor.
const RC_API_KEY_ANDROID = 'goog_OTMeoEeifXmuMWwbdKXhVYqawEb';

function purchasesPlugin() {
  const C = (typeof Capacitor !== 'undefined') ? Capacitor : null;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  return (C.Plugins && C.Plugins.Purchases) || null;
}

const Billing = {
  _ready: null,        // configure() promise'i — bir kez
  _offerings: null,    // önbellek: productId → { priceString, price, pkg }
  _lastError: null,

  // Anahtar ÇAĞRI ANINDA okunuyor, modül değerlendirilirken değil.
  // Sebebi games.js'teki econ() ile aynı sınıftan: tek bir üst düzey
  // sabite bağlanmak onu test edilemez yapıyor (Node harness'ı sahte bir
  // anahtar enjekte edebilmeli, yoksa satın alma yolunun tamamı
  // ölçülemez kalır).
  _apiKey() { return RC_API_KEY_ANDROID; },

  available() { return !!purchasesPlugin() && !!this._apiKey(); },

  // Açılışta çağrılır, BEKLENMEZ. Rıza akışıyla (AdConsent) aynı desen:
  // uygulama bunun bitmesini beklemez, ihtiyaç duyan yol aynı promise'i
  // bekler. Anahtar yoksa veya web'deysek sessizce geçer — o yüzeylerde
  // satın almanın konusu yok, ama uygulamanın geri kalanı çalışmalı.
  init() {
    if (this._ready) return this._ready;
    const p = purchasesPlugin();
    const key = this._apiKey();
    if (!p || !key) {
      this._ready = Promise.resolve(false);
      return this._ready;
    }
    // Promise.resolve SARMALAYICISI ZORUNLU — süs değil. Eklentiye ham
    // köprüden erişiyoruz (Capacitor.Plugins.Purchases, §1: paketleyici yok),
    // ve orada configure() paketin .d.ts'inin söylediği Promise'i DÖNDÜRMÜYOR:
    // cihazda ölçüldü (2026-08-07, Galaxy A51), dönen şey bir string.
    // Çıplak `.then` bu yüzden senkron bir TypeError atıyordu ve hata
    // init() → loadOfferings() → refreshPrices() → renderShop() zincirini
    // yukarı tırmanıp ELMAS MAĞAZASINI TAMAMEN AÇILMAZ hâle getiriyordu.
    // Promise.resolve her iki durumu da yutuyor: gelecekte paket gerçekten
    // Promise döndürürse davranış değişmiyor.
    this._ready = Promise.resolve(p.configure({ apiKey: key }))
      .then(() => {
        // Dinleyici İYİLEŞTİRME, doğruluk şartı DEĞİL: abonelik durumu
        // ayrıca açılışta, satın almada ve geri yüklemede senkronlanıyor.
        // Kaçan bir olay güncellemeyi geciktirir, kaybetmez.
        try {
          p.addCustomerInfoUpdateListener((info) => {
            PlusSystem._setFromStore(info && info.customerInfo ? info.customerInfo : info);
          });
        } catch (e) {}
        return this.refresh();
      })
      .then(() => true)
      .catch((e) => {
        this._lastError = e;
        if (typeof console !== 'undefined') console.warn('[RC] configure: ' + (e && e.message || e));
        // Bir kez daha denenebilsin: başarısız configure'ü önbelleğe almak
        // uygulamayı kalıcı olarak satın alınamaz hâle getirirdi.
        this._ready = null;
        return false;
      });
    return this._ready;
  },

  // Abonelik durumunu mağazadan tazeler. isActive()'in okuduğu anlık
  // görüntüyü YAZAN tek yol budur (satın alma/geri yükleme de buraya iner).
  refresh() {
    const p = purchasesPlugin();
    if (!p) return Promise.resolve(null);
    return p.getCustomerInfo()
      .then((r) => {
        const info = r && r.customerInfo ? r.customerInfo : r;
        PlusSystem._setFromStore(info);
        return info;
      })
      .catch((e) => {
        // ÇEVRİMDIŞI: son bilinen durum korunuyor, silinmiyor. Uçaktaki
        // bir aboneden Plus'ı geri almak yanlış olurdu.
        if (typeof console !== 'undefined') console.warn('[RC] getCustomerInfo: ' + (e && e.message || e));
        return null;
      });
  },

  // Offerings → productId bazlı fiyat tablosu. Önbellekli: fiyatlar tek
  // bir oturumda değişmiyor ve her render'da ağ isteği yapmak saçma olurdu.
  loadOfferings() {
    if (this._offerings) return Promise.resolve(this._offerings);
    const p = purchasesPlugin();
    if (!p) return Promise.resolve(null);
    return this.init().then((okConfig) => {
      if (!okConfig) return null;
      return p.getOfferings().then((res) => {
        const all = (res && res.offerings) || res || {};
        const off = (all.all && all.all[IAP.OFFERING]) || all.current || null;
        if (!off || !off.availablePackages) return null;
        const table = {};
        off.availablePackages.forEach((pkg) => {
          const prod = pkg.product || {};
          const id = prod.identifier;
          if (!id) return;
          table[id] = {
            priceString: prod.priceString, price: prod.price,
            currencyCode: prod.currencyCode, pkg: pkg,
          };
        });
        this._offerings = table;
        return table;
      });
    }).catch((e) => {
      if (typeof console !== 'undefined') console.warn('[RC] getOfferings: ' + (e && e.message || e));
      return null;
    });
  },

  // Fiyat SORULUR, hesaplanmaz. Bilinmiyorsa null döner — çağıran taraf
  // nötr bir yer tutucu gösterir. Uydurma bir sayı göstermek, mağazadaki
  // gerçek fiyattan sapma riski demek.
  priceFor(productId) {
    const t = this._offerings;
    return (t && t[productId]) ? t[productId].priceString : null;
  },

  priceNumberFor(productId) {
    const t = this._offerings;
    return (t && t[productId]) ? t[productId].price : null;
  },

  // Satın alma. Dönen promise { ok, cancelled, error } ile çözülür —
  // "iptal" bir HATA DEĞİL, oyuncunun geçerli bir kararı, ve ona hata
  // mesajı göstermek yanlış olur.
  purchase(productId) {
    const p = purchasesPlugin();
    if (!p) return Promise.resolve({ ok: false, unavailable: true });
    return this.loadOfferings().then((table) => {
      const entry = table && table[productId];
      if (!entry) return { ok: false, notFound: true };
      return p.purchasePackage({ aPackage: entry.pkg })
        .then((res) => {
          const info = res && res.customerInfo;
          if (info) PlusSystem._setFromStore(info);
          return { ok: true, customerInfo: info, productId: productId };
        })
        .catch((e) => {
          // RevenueCat iptali `userCancelled` ile işaretliyor.
          if (e && (e.userCancelled || e.code === '1' || /cancel/i.test(e.message || ''))) {
            return { ok: false, cancelled: true };
          }
          return { ok: false, error: e };
        });
    });
  },

  // Geri yükleme. Cihaz değiştiren / uygulamayı silip kuran kullanıcı
  // için ZORUNLU (mağaza politikası), ayrıca satın alması görünmeyen
  // kullanıcının ilk deneyeceği şey.
  restore() {
    const p = purchasesPlugin();
    if (!p) return Promise.resolve({ ok: false, unavailable: true });
    return this.init().then(() => p.restorePurchases())
      .then((res) => {
        const info = res && res.customerInfo ? res.customerInfo : res;
        PlusSystem._setFromStore(info);
        return { ok: true, active: PlusSystem.isActive() };
      })
      .catch((e) => ({ ok: false, error: e }));
  },
};

// ==================== FİYAT GÖSTERİMİ ====================
//
// Depoda TEK BİR fiyat metni yok — hepsi mağazadan geliyor. Sebep ikili:
// Play Console'da fiyat değişince kodun elle güncellenmesi gerekmesin, ve
// kullanıcı kendi bölgesinin parasını görsün (Türkiye/uluslararası ayrımı
// mağazanın işi, bizim if'imizin değil).
//
// Sözleşme data-ph-avatar / data-ph-ad-budget ile AYNI: niteliği taşıyan
// her öğe doldurulur, yeni bir fiyat noktası için yeni kod gerekmez.
//
// Fiyat bilinmiyorken gösterilen şey nötr bir yer tutucu; ESKİ SABİT
// FİYATLARA geri düşülmüyor. Yanlış bir fiyat göstermek, hiç fiyat
// göstermemekten kötüdür — kullanıcı gördüğü sayıyı ödeyeceğini sanır.
const PRICE_PLACEHOLDER = '—';

// Yıllık planın "aylığa vurulmuş" karşılığı ve tasarruf oranı. İkisi de
// TÜRETİLİYOR; hiçbiri yazılı değil. Aylık fiyat bilinmiyorsa oran
// hesaplanamaz ve satır gizlenir — uydurulmaz.
function _yearlyNote() {
  const y = Billing.priceNumberFor(IAP.PLUS.yearly);
  const m = Billing.priceNumberFor(IAP.PLUS.monthly);
  const cur = (Billing._offerings && Billing._offerings[IAP.PLUS.yearly] || {}).currencyCode;
  if (!y || !cur) return '';
  let perMonth;
  try {
    perMonth = new Intl.NumberFormat(undefined, {
      style: 'currency', currency: cur, maximumFractionDigits: 0,
    }).format(y / 12);
  } catch (e) { return ''; }
  if (!m || m <= 0) return perMonth + '/ay';
  const save = Math.round((1 - (y / 12) / m) * 100);
  return save > 0 ? perMonth + '/ay • %' + save + ' tasarruf' : perMonth + '/ay';
}

function refreshPrices() {
  return Billing.loadOfferings().then(() => {
    document.querySelectorAll('[data-ph-price]').forEach((el) => {
      const id = el.getAttribute('data-ph-price');
      el.textContent = Billing.priceFor(id) || PRICE_PLACEHOLDER;
    });
    document.querySelectorAll('[data-ph-plan-note]').forEach((el) => {
      const note = _yearlyNote();
      el.textContent = note;
      el.style.display = note ? '' : 'none';
    });
  })
  // Mağaza ulaşılamazsa fiyat alanları PRICE_PLACEHOLDER ('—') olarak
  // kalıyor — zaten doğru davranış (eski bir fiyatı göstermek, ödenecek
  // tutar hakkında yalan söylemek olurdu). Buradaki catch o davranışı
  // değiştirmiyor, yalnızca yakalanmamış bir promise reddini engelliyor:
  // iki çağıran da (openShop, showPlusPage) sonucu beklemiyor.
  .catch((e) => {
    if (typeof console !== 'undefined') console.warn('[Billing] fiyatlar alınamadı:', e);
  });
}

// ==================== PLUS SİSTEMİ ====================
//
// isActive() SENKRON KALDI ve bu bilinçli bir mimari karar. 14 çağrı yeri
// var ve bunların bir kısmı sıcak yollarda (AdBudget.canWatch,
// InterstitialAds.canShow, DiamondSystem.addReward, runRewardedAction).
// RevenueCat'in entitlement API'si asenkron; isActive()'i asenkrona
// çevirmek o dört sistemin senkron sözleşmesini de bozardı.
//
// Çözüm AdConsent'te kurulan desenin aynısı: asenkron kaynak, senkron
// okuyucu. RevenueCat GERÇEK doğruluk kaynağı; ph_plus onun yerel anlık
// görüntüsü. Görüntü şu dört anda tazelenir: açılış, satın alma, geri
// yükleme, customerInfoUpdate. Aradaki her okuma önbellekten — ki bu
// aynı zamanda ÇEVRİMDIŞI doğru davranış: RevenueCat'in kendi SDK'sı da
// tam olarak bunu yapıyor.
const PlusSystem = {
  _key: 'ph_plus',
  
  getData() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch(e) { return {}; }
  },
  
  isActive() {
    const data = this.getData();
    if (!data.active) return false;
    // expiresAt null olabilir (süresiz hak); yalnızca YAZILI bir tarih
    // geçmişteyse düşülür.
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      // Expired
      this.deactivate();
      return false;
    }
    return true;
  },

  // RevenueCat'ten gelen müşteri bilgisini yerel anlık görüntüye yazar.
  // isActive()'in okuduğu veriyi yazan TEK mağaza yolu burasıdır.
  //
  // İki kural:
  //   1. `customerInfo` YOKSA hiçbir şey yapılmaz. Bilgi alınamaması
  //      (ağ yok, çağrı patladı) "hak yok" DEMEK DEĞİL — çevrimdışı bir
  //      aboneden Plus'ı almak, ödediği şeyi elinden almaktır.
  //   2. Bilgi VARSA mağaza kazanır, kaynağı ne olursa olsun. Yerel
  //      activate() ile açılmış bir Plus da silinir: mağaza yapılandırılmışsa
  //      doğruluk kaynağı odur, geliştirme kısayolu değil.
  _setFromStore(customerInfo) {
    if (!customerInfo) return;
    const act = (customerInfo.entitlements && customerInfo.entitlements.active) || {};
    const ent = act[IAP.ENTITLEMENT];
    if (ent) {
      const data = {
        active: true,
        source: 'revenuecat',
        plan: this._planFromProduct(ent.productIdentifier),
        productId: ent.productIdentifier || null,
        expiresAt: ent.expirationDate || null,
        willRenew: ent.willRenew !== false,
        syncedAt: new Date().toISOString(),
      };
      try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) {}
    } else {
      try { localStorage.removeItem(this._key); } catch (e) {}
    }
    this.updateUI();
    // Plus durumu reklam bütçesi rozetlerini, mağaza satırlarını ve
    // game-over tekliflerini değiştiriyor; hepsi tek çağrıda tazeleniyor.
    if (typeof AdBudget !== 'undefined') AdBudget.updateUI();
  },

  _planFromProduct(productId) {
    if (!productId) return null;
    const map = IAP.PLUS;
    for (const k in map) {
      // Play abonelik kimlikleri bazen "plus_yearly:base-plan" gibi bir
      // base-plan ekiyle geliyor; startsWith bunu da yakalar.
      if (productId === map[k] || productId.indexOf(map[k]) === 0) return k;
    }
    return null;
  },

  // YEREL yol — geliştirme/test içindir, gerçek satın alma DEĞİL.
  // Dört Node harness'ı Premium senaryolarını bununla kuruyor. Mağaza
  // yapılandırılmışsa ilk senkronda üzerine yazılır (bkz. _setFromStore).
  activate(plan) {
    const data = { active: true, source: 'local', plan: plan, activatedAt: new Date().toISOString() };
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

// Satın alma sonuçlarının ORTAK yorumu. İki akış (abonelik + elmas) aynı
// hata dilini konuşsun diye tek yerde: ayrı yazılsalardı biri güncellenir,
// diğeri sessizce eski kalırdı — reklam tarafında birebir bu olmuştu.
//
// "İptal" bilinçli olarak SESSİZ: oyuncu vazgeçmek istedi ve bunu başardı,
// ona hata göstermek yaptığı şeyi yanlışmış gibi sunar.
function _handlePurchaseResult(res, onSuccess) {
  if (res && res.ok) { onSuccess(); return; }
  if (res && res.cancelled) return;
  if (res && res.unavailable) {
    showToast('🛒 Satın alma yalnızca uygulamada kullanılabilir');
    return;
  }
  if (res && res.notFound) {
    showToast('🛒 Ürün şu an mağazada bulunamadı');
    return;
  }
  showToast('🛒 Satın alma tamamlanamadı, sonra tekrar dene');
  if (res && res.error && typeof console !== 'undefined') {
    console.warn('[RC] purchase: ' + (res.error.message || res.error));
  }
}

function purchasePlus() {
  if (PlusSystem.isActive()) {
    showToast('⭐ Zaten Plus üyesisin!');
    return;
  }
  const productId = IAP.PLUS[_selectedPlan];
  if (!productId) { showToast('🛒 Plan seçilemedi'); return; }
  Billing.purchase(productId).then((res) => {
    _handlePurchaseResult(res, () => {
      // Hak durumu Billing.purchase içinde zaten senkronlandı; burada
      // yalnızca geri bildirim ve ekran tazeleme var.
      showToast('👑 Plus aktif — iyi oyunlar!');
      renderSettings();
      closePlusPage();
    });
  });
}

// Cihaz değiştiren veya uygulamayı silip kuran kullanıcı satın almasını
// geri alabilmeli — mağaza politikası gereği ZORUNLU, ayrıca "param gitti"
// algısının tek panzehiri.
function restorePurchases() {
  if (!Billing.available()) {
    showToast('🛒 Satın alma yalnızca uygulamada kullanılabilir');
    return;
  }
  showToast('🔄 Satın almalar geri yükleniyor…');
  Billing.restore().then((res) => {
    if (!res.ok) { showToast('🔄 Geri yükleme başarısız, sonra tekrar dene'); return; }
    showToast(res.active ? '👑 Plus üyeliğin geri yüklendi!'
                         : 'ℹ️ Geri yüklenecek bir satın alma bulunamadı');
    renderSettings();
  });
}

function showPlusPage() {
  document.getElementById('bottom-tabs').style.display = 'none';
  showScreen('screen-plus');
  // Fiyatlar asenkron: ekran ÖNCE açılır, sayılar geldiğinde dolar.
  // Beklemek, mağazası yavaş bir kullanıcıya boş ekran göstermek olurdu.
  refreshPrices();
}

function closePlusPage() {
  document.getElementById('bottom-tabs').style.display = 'flex';
  switchTab(currentTab || 'home');
}

// ==================== ELMAS MAĞAZASI ====================

// FİYAT ALANI YOK ve olmayacak (2026-08-02). Fiyatlar mağazadan geliyor
// (Billing.priceFor) — Play Console'da bir fiyat değişince koda dokunmak
// gerekmesin ve kullanıcı kendi bölgesinin parasını görsün diye. Miktar ve
// bonus KODDA kalıyor: mağaza fiyatın doğruluk kaynağı, ekonominin değil.
//
// amount + bonus = ürünün vaat ettiği toplam (100 / 550 / 1800 / 6500) ve
// IAP.DIAMONDS kimlikleri bu toplamları adlandırıyor.
const DIAMOND_PACKAGES = [
  { id: 'small', amount: 100, bonus: 0, badge: null },
  { id: 'medium', amount: 500, bonus: 50, badge: 'Popüler' },
  { id: 'large', amount: 1500, bonus: 300, badge: null },
  { id: 'mega', amount: 5000, bonus: 1500, badge: 'En İyi! ⭐' },
];

// `soon: true` ARTIK KULLANILMIYOR (2026-08-01) — dört kaynağın dördü de
// gerçek. Alan silinmedi: bir sonraki yarım sistem için doğru desen bu
// (satır durur, ödül yerine "Yakında" yazar), var olmayan bir ödülü sayı
// olarak yazmak yanlış vaat olurdu.
// `dynamic:'ad'` → açıklaması AdBudget'tan geliyor, sabit metin değil:
// Reklam hakkı metnini ayrı yazıp kodu sınırsız bırakan eski hâlin sebebi tam olarak
// metnin koddan bağımsız olmasıydı.
// `dynamic:'quests'` → aynı gerekçe: hem açıklama (kaç görev bitti) hem
// ödül miktarı DailyQuests'ten okunuyor. Görev satırı 2026-08-01'de
// "Yakında"dan çıktı — sistem artık gerçekten var.
const FREE_DIAMOND_SOURCES = [
  { icon: '📺', title: 'Reklam İzle', desc: '', reward: '+10💎', action: 'watchAdForDiamonds', dynamic: 'ad' },
  { icon: '🎯', title: 'Günlük Görevler', desc: '', reward: '', action: 'goToHome', dynamic: 'quests' },
  { icon: '📅', title: 'Günlük Ödül', desc: 'Her gün giriş yap', reward: '+5-100💎', action: 'goToHome' },
  { icon: '🏆', title: 'Başarımlar', desc: '', reward: '', action: 'showAchievements', dynamic: 'badges' },
];

// SIRA YÜK TAŞIYOR: ekran ÖNCE açılır, içerik sonra dolar — showPlusPage()
// ile birebir aynı desen. Ters sırada (render → göster) renderShop()'taki
// herhangi bir istisna showScreen'e hiç ulaşmadan yolu kesiyor ve mağaza
// SESSİZCE açılmıyor: dokunma bir şey yapmıyor, hata da görünmüyor.
// Tam olarak bu yaşandı (2026-08-07, Billing.init'teki configure() hatası)
// ve teşhisi ancak cihazda CDP ile mümkün oldu. Ekran önce açılırsa aynı
// hata en fazla boş bir mağaza gösterir — kıyaslanamayacak kadar iyi.
function openShop() {
  document.getElementById('bottom-tabs').style.display = 'none';
  showScreen('screen-shop');
  renderShop();
  // "Reklam İzle" satırı burada görünüyor — oyun-sonu paneliyle aynı gerekçe.
  RewardedAd.preload();
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
        <button class="shop-pkg-price" data-ph-price="${IAP.DIAMONDS[pkg.id]}">${PRICE_PLACEHOLDER}</button>
      </div>
    `;
  }).join('');
  
  // Free sources
  const free = document.getElementById('shop-free');
  free.innerHTML = FREE_DIAMOND_SOURCES.map(src => {
    // Reklam satırı bütçeyi GÖSTERİR ve bütçe bittiğinde pasifleşir —
    // tıklanıp "hakkın bitti" toast'ı yemek yerine durum baştan görünür.
    const adRow = src.dynamic === 'ad';
    // Görev satırı TIKLANABİLİR kalıyor (ana ekrana götürüyor) ama üçü de
    // bitmişse soluklaşıyor — reklam satırıyla aynı dil.
    const questRow = src.dynamic === 'quests';
    const badgeRow = src.dynamic === 'badges';
    const spent = (adRow && !AdBudget.canWatch())
               || (questRow && DailyQuests.allDone())
               || (badgeRow && Badges.count() >= Badges.total());
    const desc = adRow ? AdBudget.label()
               : questRow ? DailyQuests.shopLabel()
               : badgeRow ? Badges.shopLabel() : src.desc;
    const reward = questRow ? '+' + DailyQuests.totalReward() + '💎'
                 : badgeRow ? '+' + Badges.totalReward() + '💎' : src.reward;
    const disabled = spent || src.soon;
    const cls = 'shop-free-item' + (disabled ? ' sfi-off' : '');
    // Görev/rozet satırları bitmiş olsa da tıklanabilir: ne kazandığını
    // GÖRMEK hâlâ anlamlı. Reklam satırında tıklamanın karşılığı yok.
    const inert = (adRow && spent) || src.soon;
    const action = inert ? 'aria-disabled="true"' : 'onclick="' + src.action + '()"';
    return `
    <div class="${cls}" ${action}>
      <span class="sfi-icon">${src.icon}</span>
      <div class="sfi-info">
        <span class="sfi-title">${src.title}</span>
        <span class="sfi-desc"${adRow ? ' data-ph-ad-budget' : ''}${questRow ? ' data-ph-quests' : ''}${badgeRow ? ' data-ph-badges' : ''}>${desc}</span>
      </div>
      <span class="sfi-reward">${reward}</span>
    </div>
  `;
  }).join('');

  DiamondSystem.updateUI();
  // innerHTML az önce fiyat düğümlerini de sildi. AvatarSystem.updateUI()
  // ile aynı kural: markup'ı yeniden kuran, niteliğe bağlı alanları da
  // yeniden doldurmak zorunda. Offerings önbellekli, bu çağrı bedava.
  refreshPrices();
}

function buyPackage(id) {
  const pkg = DIAMOND_PACKAGES.find(p => p.id === id);
  const productId = IAP.DIAMONDS[id];
  if (!pkg || !productId) { showToast('🛒 Paket bulunamadı'); return; }
  Billing.purchase(productId).then((res) => {
    _handlePurchaseResult(res, () => {
      // add(), addReward() DEĞİL: satın alınan elmasa Plus'ın +%50
      // çarpanı UYGULANMAZ. Çarpan kazanılan ödülleri büyütmek için var,
      // satın alınan miktarı değil — aksi hâlde aynı paranın karşılığı
      // aboneye farklı olurdu ve mağazadaki sayı yalan söylerdi.
      DiamondSystem.add(pkg.amount + pkg.bonus, 'Satın alma tamamlandı!');
      renderShop();
    });
  });
}

function watchAdForDiamonds() {
  const amount = EconomyConfig.AD_DIAMOND_REWARD;
  const ok = runRewardedAction(
    { icon: '💎', text: amount + ' Elmas Kazan!' },
    () => DiamondSystem.addReward(amount, 'Reklam ödülü!')
  );
  // Mağaza satırının açıklaması ("7/8 reklam hakkın kaldı") anında
  // güncellenmeli; reklam bittiğinde AdBudget.consume() zaten tetikliyor
  // ama bütçe doluysa satırın pasifleşmesi de görünmeli.
  if (!ok) renderShop();
}

function goToHome() {
  closeShop();
  switchTab('home');
}

// Rozetlerin yaşadığı yer İLERLEME ekranı ("Son Kazanılan Rozetler" +
// "Rozet" karosu). Ayrı bir rozet ekranı AÇILMADI: mockup'ta yok ve beş
// rozet kendi ekranını hak etmiyor — mevcut bölüme götürmek yeterli.
// Sekme anahtarı hâlâ 'lider', gösterdiği İLERLEME (bkz. CLAUDE.md §5).
function showAchievements() {
  closeShop();
  switchTab('lider');
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
  // Ana sekmeye dönüş görev satırlarını tazeler. Oyundan çıkan oyuncu
  // buraya düşüyor ve "günlük meydan okuma" görevinin ödemesi tam olarak
  // burada gerçekleşiyor (bkz. DailyQuests: ÖDÜL ANI). renderHome()
  // TAMAMI çağrılmıyor — günlük bulmaca kartı ve favoriler değişmedi.
  if (tabName === 'home') DailyQuests.refresh();
  if (tabName === 'lider') renderProgress();
  if (tabName === 'profil') { renderSettings(); renderFavorites(); renderShowcase(); }
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

// ==================== RENDER: VİTRİN (Profil) ====================
//
// Üç yuva SABİT: kazanılmayanlar kilitli siluet olarak duruyor. Sayısı
// değişken bir vitrin, rozet kazanıldıkça profilin düzenini kaydırırdı.
function renderShowcase() {
  const el = document.getElementById('pf-showcase');
  if (!el) return;
  const top = Badges.showcase(3);
  let html = top.map(b =>
    '<span class="pf-badge bdg-' + b.tone + '" title="' + b.name + '">' + b.icon + '</span>'
  ).join('');
  for (let i = top.length; i < 3; i++) {
    html += '<span class="pf-badge bdg-locked">🔒</span>';
  }
  el.innerHTML = html;
}

// ==================== RENDER: GÖREVLER ====================

function renderMissions() {
  // ÖNCE öde, sonra çiz. Tersi olsaydı yeni tamamlanan bir görev ekranda
  // "tamam" görünür ama ödülü bir sonraki render'a kalırdı.
  // Bu aynı zamanda "günlük meydan okuma" görevinin ödeme noktası
  // (bkz. DailyQuests başlığı: ÖDÜL ANI).
  DailyQuests.settle();
  // Haftalık liste artık ana sayfada yok (mockup'ta yerine ödül sandığı var).
  renderMissionList('daily-missions', DailyQuests.rows());
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

// RECENT_BADGES statik dizisi KALDIRILDI (2026-08-01) — "Son Kazanılan
// Rozetler" artık Badges.recent()'ten geliyor, gerçek veriye bağlı.

function renderProgress() {
  const container = document.getElementById('progress-content');
  if (!container) return;

  const streak = StreakSystem.getCount();

  const tiles = [
    // TODO: oynanan oyun takibi kurulunca gerçek veriye bağlanacak
    { icon:'🎮', value:'10/10',        label:'Oyun Denedi' },
    // Gerçek veri: kazanılan/toplam rozet. Paydası da gösteriliyor —
    // çıplak bir sayı kaç rozet olduğunu söylemiyordu.
    { icon:'🛡️', value:Badges.count() + '/' + Badges.total(), label:'Rozet' },
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

  // Kazanılan rozetler (en yeni başta) + kalanlar KİLİTLİ olarak. Kilitli
  // olanları göstermek bir tercih: boş bir satır "burada bir şey yok" der,
  // soluk siluetler "kazanılacak dört şey daha var" der.
  const recent = Badges.recent(4);
  const lockedCount = Math.max(0, Math.min(4 - recent.length, Badges.total() - Badges.count()));
  const badgesHTML =
    recent.map((b, i) => `
      <span class="rb-badge bdg-${b.tone} anim-in" style="animation-delay:${i*60}ms"
            title="${b.name}">${b.icon}</span>
    `).join('') +
    Array.from({ length: lockedCount }, (_, i) => `
      <span class="rb-badge bdg-locked anim-in" style="animation-delay:${(recent.length+i)*60}ms">🔒</span>
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
  // Gizlilik Seçenekleri satırı KOŞULLU: AB'de kullanıcının rızasını
  // sonradan değiştirebilmesi zorunlu, kapsam dışı bölgede ise böyle bir
  // satır göstermek anlamsız (ve Google formu da açılmaz). Kararı biz
  // vermiyoruz — privacyOptionsRequirementStatus veriyor.
  const rows = (typeof AdConsent !== 'undefined' && AdConsent.privacyOptionsRequired())
    ? SETTINGS.concat([{ icon:'🔒', label:'Gizlilik Seçenekleri',
                         fn:'AdConsent.showPrivacyOptions()' }])
    : SETTINGS;
  container.innerHTML = rows.map((s, i) => {
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

  // ÖN YÜKLEME BURADA BAŞLAR — oyun-sonu panelinde değil.
  //
  // Ölçüm (2026-08-07, A51, soğuk açılış): ilk reklamın yüklenmesi 6580 ms,
  // sonrakiler 3.4-4.5 sn. Paneli açıldığında başlatmak yetmiyor, çünkü
  // oyuncu kaybettiği anda düğmeye basıyor — o pencere saniyeler değil,
  // milisaniyeler. Cihazda tekrar yaşandı ve bildirildi.
  //
  // Oyunun BAŞI doğru an: aradaki süre bir oyun turu kadar, yani yüklemenin
  // kat kat üstü. Hedefli strateji de bozulmuyor — istek yalnızca gerçekten
  // oyun oynayan, yani ödüllü reklam teklifi görebilecek oyuncu için gidiyor
  // (devam, ipucu, geri al, 2x skor hepsi oyun içinde).
  //
  // preload() kendi içinde Plus ve bütçe kontrolü yapıyor; hazırsa hemen
  // dönüyor, yani her oyun açılışında yeni istek anlamına gelmiyor.
  RewardedAd.preload();

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
  // Elmas bedeli oyun bazında değiştirilebilir. Verilmezse eski davranış
  // (CONTINUE_DIAMONDS) aynen sürer — onContinue/onRestart ile aynı sözleşme.
  // Sabit tek bir bedel, "devam"ın her oyunda aynı şeyi kurtardığını varsayardı;
  // oysa seviyeli bir oyunda kurtarılan şey bir seviyenin emeği, skorlu bir
  // oyunda tüm turdur (bkz. EconomyConfig.EXTRA_MOVES_DIAMONDS).
  _gameOverContinueCost = (typeof opts.continueCost === 'number')
    ? opts.continueCost : EconomyConfig.CONTINUE_DIAMONDS;

  // Level complete reward — Plus çarpanı BİLEREK yok (add, addReward değil):
  // abonelik oyun içi ilerlemeyi hızlandırmıyor (bkz. DiamondSystem.addReward).
  if (win) DiamondSystem.add(EconomyConfig.LEVEL_COMPLETE_REWARD, 'Level tamamlandı!');

  refreshGameOverOffers();
  document.getElementById('game-over').style.display = 'flex';

  // ÖN YÜKLEME tam BURADA, refreshGameOverOffers'ta değil. O fonksiyon
  // AdBudget.updateUI()'dan da çağrılıyor ve updateUI açılışta çalışıyor —
  // oraya konulunca ön yükleme HER AÇILIŞTA tetikleniyordu, yani hedefli
  // strateji sessizce "sürekli sıcak tut"a dönüşüyordu. Ölçülerek bulundu.
  // Buradaki çağrı "panel gerçekten göründü" demek, tek doğru an bu.
  RewardedAd.preload();
}

// Game-over'daki reklam/elmas düğmelerinin metni ve etkinliği. Hem
// showGameOver'dan hem AdBudget.updateUI'dan çağrılır — ikincisi, oyuncu
// kutu AÇIKKEN son hakkını harcadığında (reklamla devam → tekrar kaybetme
// döngüsü) düğmenin kendiliğinden pasifleşmesi için.
let _gameOverNoDiamond = false;
let _gameOverContinueCost = EconomyConfig.CONTINUE_DIAMONDS;

function refreshGameOverOffers() {
  const plus = (typeof PlusSystem !== 'undefined') && PlusSystem.isActive();

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
  } else if (RewardedAd._pending) {
    // Reklam yolda. Bunu SÖYLEMEK zorundayız: ölçülen yükleme süresi ilk
    // seferde ~6.5 saniye ve o boyunca düğme hiçbir şey yapmıyormuş gibi
    // görünüyordu — oyuncunun üst üste basmasının sebebi buydu. Kalkan
    // artık fazladan reklam açılmasını engelliyor, ama sessiz kalmak
    // "bozuk" hissini tek başına ortadan kaldırmıyor.
    setBtn(contAd, '⏳', 'Reklam yükleniyor…', false);
  } else {
    // Günlük hak SAYISI ARTIK YAZMIYOR ve düğme bütçe yüzünden PASİFLEŞMİYOR:
    // devam etmek 2026-08-07'den beri günlük hakka işlemiyor (bkz.
    // runRewardedAction). Sayıyı burada göstermeye devam etmek, oyuncuya
    // artık geçerli olmayan bir sınırı vaat etmek olurdu — ve daha kötüsü,
    // sayı sıfırlandığında çalışan bir düğmeyi "bitti" diye kapatırdı.
    setBtn(contAd, '📺', 'Reklam İzle → Devam Et', true);
  }

  // Devam — elmas satırı. Premium'da GİZLİ: ücretsiz devam varken elmas
  // istemek oyuncuyu cezalandırmak olur.
  const diamondBtn = document.querySelector('.go-btn-diamond');
  if (diamondBtn) {
    const hide = _gameOverNoDiamond || plus;
    diamondBtn.style.display = hide ? 'none' : '';
    if (!hide) {
      const cost = _gameOverContinueCost;
      setBtn(diamondBtn, '💎', cost + ' Elmas → Devam Et', DiamondSystem.canAfford(cost));
    }
  }

  // Skor 2x — yalnızca reklam. Elmas alternatifi bilerek YOK.
  const dbl = document.getElementById('go-double');
  if (plus) {
    setBtn(dbl, '👑', 'Skor 2x (Plus)', true);
  } else {
    // Devam düğmesiyle aynı gerekçe: skor 2x günlük hakka işlemiyor.
    setBtn(dbl, '📺', 'Reklam İzle → Skor 2x!', true);
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
  // Günlük hakka İŞLEMEZ: devam etmek bir fayda, elmas musluğu değil.
  runRewardedAction({ icon: '🔄', text: 'Devam Et!' }, () => {
    if (!_runGameOverContinuation('ad')) showToast('🔄 Devam ediyorsun!');
  }, { skipDailyLimit: true });
}

function continueWithDiamonds() {
  // Premium'da bu düğme hiç görünmüyor (refreshGameOverOffers), ama
  // ücretsiz devam hakkı varken elmas harcamak her hâlükârda yanlış.
  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    if (!_runGameOverContinuation('plus')) showToast('👑 Plus: devam ücretsiz!');
    return;
  }
  const cost = _gameOverContinueCost;
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
    },
    // Günlük hakka İŞLEMEZ: skor bir fayda, elmas değil.
    { skipDailyLimit: true }
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
  // Oturumun KAYNAĞI, _beforeGameScreen sıfırlanmadan önce okunuyor.
  // Keşfet'ten açılan oyunlar hızlı-deneme oturumu (kart kart gezinip
  // saniyeler içinde açıp kapatma); oraya geçiş reklamı sokmak akışın
  // kendisini öldürür, o yüzden muaf.
  const fromDiscover = _beforeGameScreen === 'screen-discover';

  // Terk edilen tur BURADA kapanıyor, cleanup()'ta değil: cleanup oyunun
  // kendi işi (dinleyici/rAF sökmek) ve "tur"dan haberi yok. Oyun zaten
  // bitmişse (game-over kutusundan çıkılıyor) açık tur yoktur, abandon()
  // hiçbir şey yapmaz — çift sayım riski yok.
  //
  // Sıra ÖNEMLİ: abandon() önce çalışır, yani bu çıkışın 'quit' turu da
  // aşağıdaki maybeShow'un gördüğü sayaca dahildir.
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

  // Geçiş reklamının TEK çağrı yeri. Buradan sonra çağrılması bilinçli:
  // reklam kapanınca oyuncu oyun ekranını değil, gideceği yeri (ana ekran
  // veya Keşfet) görür. Açılışta ve oyun içinde çağrı YOK — o iki yasak
  // bir bayrakla değil, bu tek çağrı noktasıyla korunuyor.
  if (typeof InterstitialAds !== 'undefined') {
    InterstitialAds.maybeShow({ fromDiscover: fromDiscover });
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
  renderShowcase();
  updateStreakUI();
  // Açılışta bir kez: koşullar saf olduğu için, tetikleyicisi kaçmış bir
  // rozet (ör. sistem kurulmadan önce oynanmış oyunlar) burada verilir.
  Badges.check();

  // Reklam rızası: İLK reklam isteğinden önce başlasın diye açılışta
  // tetikleniyor. BEKLENMİYOR — akış bloklanmaz; rıza formu Google'ın
  // kendi katmanında açılır ve uygulama arkasında normal çalışır.
  // Reklam yolu aynı promise'i beklediği için sıralama yine garanti.
  // Kapsam dışı bölgede hiçbir şey görünmez; bu beklenen davranış.
  AdConsent.ensure().then(() => {
    // Gizlilik satırı yalnızca gerekiyorsa çıkıyor (bkz. renderSettings).
    if (AdConsent.privacyOptionsRequired()) renderSettings();

    // SDK'yı burada ISITIYORUZ — ama reklam İSTEMİYORUZ. initialize()
    // ölçülen 393 ms'lik bir kerelik maliyet ve ilk reklamın gecikmesine
    // birebir ekleniyordu; burada ödenirse oyuncu hiç görmüyor.
    // Bu bir ağ reklam isteği DEĞİL, yani "hedefli ön yükleme" kararını
    // bozmuyor: hiç reklam izlemeyen oyuncu için de bedeli yok.
    const ad = adMobPlugin();
    if (ad && AdConsent.canRequestAds()) RewardedAd._ensureInit(ad).catch(() => {});
  });

  // Satın alma katmanı: rıza akışıyla aynı desen — açılışta tetiklenir,
  // BEKLENMEZ. init() abonelik durumunu mağazadan tazeliyor, yani cihaz
  // değiştirmiş veya aboneliği bitmiş kullanıcının hakları ilk açılışta
  // kendiliğinden doğruya oturuyor. Anahtar yoksa sessizce atlanır.
  Billing.init();

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


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
  // oyunlarda (Hafıza, Resim Kaydır) üç tur arka arkaya bir dakikaya sığar.
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
  BADGE_STREAK_30: 50,
  BADGE_DIAMONDS_500: 25,
  // Uzun seri rozetleri (2026-08-11, sahibinin isteği).
  // ÖLÇEK SAHİBİNİN KENDİ ÇİZGİSİNDEN GELİYOR, uydurulmadı: yukarıdaki
  // 7→20 ve 30→50 zaten "bir aylık sadakat ≈ 50💎" diyor. Bu dördü o
  // oranı sürdürüyor, katlayarak değil.
  // İlk sürümde 75/150/300/600 yazılmıştı ve sahibi "çok fazla" dedi —
  // haklıydı: yalnız 500 gün rozeti 600💎, yani mağazanın "Popüler"
  // paketinden (550💎) fazlaydı ve dört rozet toplamı ücretli orta
  // paketin iki katını bedavaya veriyordu. Ölçüt şu: rozet havuzunun
  // TAMAMI (500💎) en küçük paketin (100💎) birkaç katında kalmalı,
  // paketlerin yerine geçmemeli.
  BADGE_STREAK_50: 60,
  BADGE_STREAK_100: 75,
  BADGE_STREAK_250: 100,
  BADGE_STREAK_500: 150,      // en zoru, en yüksek (≈ 5 devam hakkı)

  // Seri kilometre taşları. Rozetlerden AYRI bir ödül ekseni: rozet tek
  // seferlik ve kalıcı, bu ise seri her o sayıya ulaştığında ödenir
  // (seri kırılıp yeniden kurulursa tekrar). Değerler 2026-08-11'e kadar
  // claimDailyReward() içinde ÇIPLAK SAYI olarak duruyordu; buraya
  // taşındı, çünkü kural "her ekonomi sayısı EconomyConfig'te".
  STREAK_MILESTONES: [
    { days: 7,  amount: 50,  labelKey: 'streak_milestone_7' },
    { days: 14, amount: 100, labelKey: 'streak_milestone_14' },
    { days: 30, amount: 200, labelKey: 'streak_milestone_30' },
  ],

  // --- Premium (PlusSystem) ---
  PLUS_DAILY_DIAMONDS: 20,    // günlük ödülün ÜSTÜNE, ayrı satır
  PLUS_DIAMOND_MULTIPLIER: 1.5, // reklam + günlük ödül + görev + rozet kazanımlarına
};

// ==================== VERİ ====================

// HÂLÂ OKUYANI YOK (bkz. CLAUDE.md) — sunum verisi olarak duruyor, ileride
// bir ana sayfa kataloğu kurulursa ham madde bu. 2026-08-15'te `name`/`desc`
// alanları SİLİNDİ ve yerine `id` geldi: o iki alan oyunun TÜRKÇE adını
// taşıyordu, yani tam olarak `GAME_MAP`'i `GAME_IDS`'e çevirten kalıptı —
// kullanıcıya görünen metin kimlik olamaz. Katalog kurulduğunda ad ve
// açıklama `t('game_name_' + g.id)` / `t('game_desc_' + g.id)` ile okunur,
// böylece ölü veri yeniden canlandığında da çevrilmiş gelir.
const PUZZLE_GAMES = [
  { id:'game2048',    emoji:'🔢', rating:4.8, badge:null,   bg:'linear-gradient(135deg,#d97706,#92400e)' },
  { id:'blockPuzzle', emoji:'🧱', rating:4.5, badge:null,   bg:'linear-gradient(135deg,#7c3aed,#5b21b6)' },
  { id:'memoryGame',  emoji:'🧠', rating:4.3, badge:null,   bg:'linear-gradient(135deg,#0891b2,#155e75)' },
  { id:'wordSearch',  emoji:'📝', rating:4.6, badge:null,   bg:'linear-gradient(135deg,#16a34a,#166534)' },
  { id:'sudoku',      emoji:'#️⃣', rating:4.7, badge:null,   bg:'linear-gradient(135deg,#1d4ed8,#1e3a8a)' },
  { id:'jigsawCard',  emoji:'🖼️', rating:4.9, badge:'yeni', bg:'linear-gradient(135deg,#123a4a,#06121c)' },
  { id:'snakeGame',   emoji:'🐍', rating:4.8, badge:'yeni', bg:'linear-gradient(135deg,#16255e,#060b22)' },
  { id:'flappyUfo',   emoji:'🛸', rating:4.7, badge:'yeni', bg:'linear-gradient(135deg,#132a63,#04081c)' },
  { id:'flowConnect', emoji:'🔗', rating:4.8, badge:'yeni', bg:'linear-gradient(135deg,#2b6cb8,#0d1b3e)' },
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
// `name` yerine `nameKey`: tanım modül yüklenirken kuruluyor, metin ise
// çizim anında çözülmeli. Metni burada tutmak, dil değiştiğinde görev
// adlarını eski dilde dondururdu (aynı gerekçe SETTING_GROUPS'un `state`
// alanının fonksiyon olmasının gerekçesi).
const DAILY_MISSIONS = [
  { id:'play3', icon:'🎮', tone:'blue',  nameKey:'quest_play_3',
    total:3, reward:EconomyConfig.QUEST_PLAY_REWARD },
  { id:'daily', icon:'🎯', tone:'red',   nameKey:'quest_daily_challenge',
    total:1, reward:EconomyConfig.QUEST_DAILY_REWARD },
  { id:'win1',  icon:'⭐', tone:'amber', nameKey:'quest_win_1',
    total:1, reward:EconomyConfig.QUEST_WIN_REWARD },
];

// ŞU AN RENDER EDİLMİYOR. Mockup'ın ana sayfasında haftalık görev listesi
// yok, yerine "Haftalık Ödül" sandığı var. Dizi silinmedi: sandığın
// "tüm görevleri tamamla" koşulu kurulduğunda tüketilecek kaynak bu.
const WEEKLY_MISSIONS = [
  { icon:'🔥', nameKey:'weekly_login7_name',  descKey:'weekly_login7_desc',  progress:4, total:7,  reward:'+200' },
  { icon:'⭐', nameKey:'weekly_win15_name',   descKey:'weekly_win15_desc',   progress:6, total:15, reward:'+300' },
  { icon:'🎯', nameKey:'weekly_variety_name', descKey:'weekly_variety_desc', progress:2, total:4,  reward:'+150' },
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

// ── AYARLAR ─────────────────────────────────────────────────────
// Düz bir liste DEĞİL, gruplu bölümler. Sebep tasarımsal değil bilgi
// mimarisi: on iki satırın tek bir yığın hâlinde durması, "Plus'a Geç"
// ile "Paylaş"ı aynı ağırlıkta gösteriyordu.
//
// Satır sözleşmesi:
//   fn      → doğrudan çalıştırılır
//   action  → toast olarak gösterilir (henüz kurulmamış sistemler)
//   value   → sağda okunur bir değer (ok yerine)
//   note    → etiketin altında ikinci satır
//   toggle  → anahtar; state/fn ÇALIŞMA ZAMANINDA okunur (aşağıya bak)
//   tone    → 'accent' | 'gold' (öne çıkan satırlar)
//
// PLUS ve MAĞAZA satırları burada KALIYOR. Üst bara geri konmuş olmaları
// bu satırları gereksiz yapmıyor: eskiden sorun tek kapının kapanmasıydı,
// iki kapının açık olması değil.
//
// "Oturumu kapat" BİLEREK YOK: uygulamada hesap/oturum kavramı yok
// (giriş yapılmıyor, veri localStorage'da). Çalışmayan bir satır koymak,
// olmayan bir sistemi vaat etmek olurdu — "Özel Görevler"in Plus
// listesinden çıkarılmasıyla aynı gerekçe.
// METİNLER ARTIK ANAHTAR (2026-08-15). Bu dizi modül YÜKLENİRKEN bir kez
// kuruluyor; görünen metni burada tutmak onu açılıştaki dilde dondururdu
// ve dil değiştiğinde ayarlar ekranı eski dilde kalırdı. Aynı gerekçe
// `state`in neden fonksiyon olduğunun gerekçesiyle birebir aynı (aşağıda).
// Çözüm de aynı: değeri çağrı anında oku — renderSettings her çizimde
// t()'yi yeniden çağırıyor.
const SETTING_GROUPS = [
  { titleKey:'settings_group_account', rows: [
    { icon:'👤', labelKey:'settings_avatar', noteKey:'settings_avatar_note', fn:'openAvatarPicker()' },
    // PROFİL ÇERÇEVESİ ARAYÜZDEN GİZLİ (2026-08-19, release öncesi).
    // hidden:true satırı renderSettings'te eliyor ama TANIMI SİLMİYOR:
    // sistem kurulduğunda tek yapılacak iş bu bayrağı kaldırmak.
    // Release'te "Yakında" göstermek, tarihi olmayan bir söz vermektir —
    // "⭐ 50 XP" etiketinin kaldırılmasıyla aynı gerekçe (bkz. CLAUDE.md).
    { icon:'🖼️', labelKey:'settings_frame', valueKey:'common_soon',
      actionKey:'settings_frame_toast', hidden:true },
    // Cihaz değiştiren / uygulamayı silip kuran kullanıcı için ZORUNLU:
    // abonelik satan her uygulamanın sunması gereken standart yol.
    { icon:'🔄', labelKey:'settings_restore', noteKey:'settings_restore_note', fn:'restorePurchases()' },
  ]},

  { titleKey:'settings_group_premium', rows: [
    { icon:'👑', labelKey:'settings_plus', noteKey:'settings_plus_note', tone:'gold', fn:'showPlusPage()' },
    { icon:'💎', labelKey:'settings_shop', noteKey:'settings_shop_note', tone:'accent', fn:'openShop()' },
    // TEMA SATIRI ARAYÜZDEN GİZLİ (2026-08-19). Tek tema var ve satırın
    // tüm işlevi Plus sayfasına gidip "Özel Temalar — yakında" vaadini
    // göstermekti. ThemeSystem kodu DURUYOR (THEMES, apply, isLocked);
    // gizlenen yalnızca giriş noktası.
    { icon:'🎨', labelKey:'settings_theme', valueKey:'theme_night_violet',
      fn:'showPlusPage()', hidden:true },
  ]},

  { titleKey:'settings_group_prefs', rows: [
    // GERÇEK anahtar: GameAudio.muted okunuyor, toggleMute() yazıyor.
    // `state` bir FONKSİYON, düz bir boolean DEĞİL — bu dizi modül
    // yüklenirken kuruluyor ve o an okunan bir değer ilk açılıştaki
    // durumda donardı. renderSettings her çizimde yeniden çağırıyor.
    { icon:'🔊', labelKey:'settings_sound', toggle:true,
      state: () => (typeof GameAudio !== 'undefined') && !GameAudio.muted,
      fn:'toggleSoundSetting()' },
    // Bildirimler RELEASE İÇİN HAZIR DEĞİL. Profil Çerçevesi ve Tema ile
    // aynı muamele: hidden:true satırı çizdirmiyor ama TANIMI SİLMİYOR —
    // bayrağı kaldırmak satırı olduğu gibi geri getiriyor. Altyapı duruyor.
    { icon:'🔔', labelKey:'settings_notifications', valueKey:'common_soon',
      actionKey:'settings_notifications_toast', hidden:true },
    // Dil satırı ARTIK GERÇEK. 2026-08-15'e kadar "Şu an yalnızca Türkçe
    // destekleniyor." diyen bir toast'tı. `value` bir FONKSİYON: seçili
    // dilin adı çalışma anında okunmalı, yoksa dil değişince satır eski
    // adı gösterirdi.
    { icon:'🌐', labelKey:'settings_language',
      value: () => currentLanguageLabel(),
      fn:'openLanguagePicker()' },
  ]},

  { titleKey:'settings_group_support', rows: [
    { icon:'❓', labelKey:'settings_help', fn:'openHelp()' },
    { icon:'⭐', labelKey:'settings_rate', fn:'rateApp()' },
    { icon:'📤', labelKey:'settings_share', fn:'shareApp()' },
    // Sürüm tek kaynaktan (index.html APP_VERSION) okunur; burada sabit
    // yazmak bump'ta kaydırır. typeof guard'ı app.js'in izole yüklendiği
    // (test) durumda ReferenceError'ı önler.
    { icon:'ℹ️', labelKey:'settings_about',
      value:'v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.28.0'),
      action:'SlySwipe v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.28.0') },
  ]},
];

// Gün kısaltmaları da anahtar: haftalık seri satırı bunları basıyor.
const DAY_KEYS = ['day_mon','day_tue','day_wed','day_thu','day_fri','day_sat','day_sun'];
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
    this.add(total, plus && reason ? reason + t('diamonds_plus_bonus') : reason);
    return total;
  },

  spend(amount) {
    const current = this.get();
    if (current < amount) {
      showToast(t('diamonds_not_enough'));
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
      <span class="av-head">${t('avatar_picker_title')}</span>
      <div class="av-grid">${grid}</div>
      <button class="av-close" onclick="closeAvatarPicker()">${t('common_close')}</button>
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

// ==================== DİL SEÇİCİ ====================
//
// Avatar seçicinin modal dilini AYNEN kullanıyor (.av-scrim/.av-box):
// ikinci bir modal ailesi kurmak, aynı şeyin iki ayrı görünümü demekti.
// Tek fark liste düzeni (.lang-list), çünkü 16 satır bir ızgaraya değil
// bir listeye sığar.

/** Ayarlar satırında görünen değer: seçili dilin KENDİ adı. */
function currentLanguageLabel() {
  if (typeof I18n === 'undefined') return '';
  // Sistem modunda hangi dilin geçerli OLDUĞUNU da söylüyoruz. Yalnızca
  // "Sistem Varsayılanı" yazmak, kullanıcının o an hangi dilde olduğunu
  // ayarlar ekranından okuyamaması demekti.
  const hit = I18n.SUPPORTED.filter(s => s.code === I18n.locale)[0];
  const name = hit ? hit.native : I18n.locale;
  return I18n.mode === 'system' ? name : name;
}

function openLanguagePicker() {
  if (typeof I18n === 'undefined') return;
  const isSystem = I18n.mode === 'system';
  const cur = I18n.locale;

  // İLK SATIR "Sistem Varsayılanı" ve bu bir dil DEĞİL, bir kip.
  // Seçildiğinde manuel geçersiz kılma temizlenir ve cihazın dili yeniden
  // okunur — yani telefonun dili sonradan değişirse uygulama takip eder.
  let rows = `<button class="lang-row${isSystem ? ' sel' : ''}" onclick="pickLanguage(null)">
      <span class="lang-name">${t('settings_language_system')}</span>
      <span class="lang-note">${t('settings_language_system_note')}</span>
    </button>`;

  // Diller KENDİ adlarıyla ve ÇEVRİLMEDEN listeleniyor: uygulamayı
  // anlamadığı bir dilde açan kullanıcı listede "Almanca"yı değil
  // "Deutsch"u arar.
  rows += I18n.SUPPORTED.map(s =>
    `<button class="lang-row${!isSystem && s.code === cur ? ' sel' : ''}"
       onclick="pickLanguage('${s.code}')" lang="${s.code}">
      <span class="lang-name">${s.native}</span>
    </button>`
  ).join('');

  let el = document.getElementById('lang-picker');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lang-picker';
    el.className = 'av-scrim';
    el.onclick = (ev) => { if (ev.target === el) closeLanguagePicker(); };
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="av-box lang-box">
      <span class="av-head">${t('settings_language_title')}</span>
      <div class="lang-list">${rows}</div>
      <button class="av-close" onclick="closeLanguagePicker()">${t('common_close')}</button>
    </div>`;
  el.style.display = 'flex';
}

function pickLanguage(code) {
  if (typeof GameAudio !== 'undefined') { GameAudio.play('tab'); GameAudio.haptic('micro'); }
  // Modal ÖNCE kapanıyor: I18n.set() dinleyicileri tetikleyip ekranı
  // yeniden çizecek, açık bir modalın altındaki ekranın değişmesi ise
  // "bir şey oldu ama göremedim" hissi verirdi.
  closeLanguagePicker();
  I18n.set(code);
}

function closeLanguagePicker() {
  const el = document.getElementById('lang-picker');
  if (el) el.style.display = 'none';
}
// ══════════════════════════════════════════════════════════════════
//  DESTEK SATIRLARI — Paylaş / Puanla / Yardım  (2026-08-19)
// ══════════════════════════════════════════════════════════════════
// Üçü de release öncesine kadar "Yakında" toast'ıydı. Ortak kural:
// HİÇBİRİ ÇÖKMEZ. Üçü de platformdan bir şey istiyor (paylaşım sayfası,
// mağaza uygulaması) ve o şey yoksa kullanıcıya sessizce anlamlı bir
// yedek sunuyorlar — hata penceresi değil.

// ADRESLER SABİT ve BİLEREK ÇEVRİLMİYOR: bunlar metin değil kimlik.
// Paket adı üç yerde geçiyor ve hepsi burada tek noktadan türüyor
// (CLAUDE.md: paket kimliği ilk yayından sonra DEĞİŞTİRİLEMEZ).
const STORE_ID  = 'com.skyroonlabs.slyswipe';
const STORE_URL = 'https://play.google.com/store/apps/details?id=' + STORE_ID;
const MARKET_URI = 'market://details?id=' + STORE_ID;
const PRIVACY_URL = 'https://onur33360-dev.github.io/slyswipe/gizlilik.html';
const SUPPORT_MAIL = 'onur33360@gmail.com';

/**
 * PAYLAŞ — gerçek Android paylaşım sayfası (@capacitor/share 7.0.4).
 *
 * NEDEN EKLENTİ: navigator.share Android WebView'da YOK — cihazda
 * ölçüldü (typeof navigator.share === "undefined"). Web Share API bir
 * Chrome özelliği; güvenli köken olması yetmiyor. Bağımlılıksız
 * intent:// denemesi de açılmıyor, çünkü Capacitor'ün launchIntent'i
 * onu ACTION_VIEW olarak işliyor, oysa intent:// Intent.parseUri() ister.
 *
 * `url` ALANI BİLEREK GEÇİLMİYOR. SharePlugin.java ikisi de verilirse
 * birleştiriyor (text = text + " " + url) ve share_text zaten {url}
 * taşıyor — ikisini de geçmek bağlantıyı İKİ KEZ yazardı. Android'de
 * URL için ayrı bir intent alanı yok; tek hedef EXTRA_TEXT, yani metnin
 * içine gömmek ile ayrı geçmek aynı sonucu veriyor.
 *
 * İPTAL BİR HATA DEĞİL. Eklenti geri tuşunda reject("Share canceled")
 * yapıyor (SharePlugin.java: RESULT_CANCELED), açık bir sayfa varken de
 * reject("Can't share while sharing is in progress"). İkisi de kullanıcı
 * davranışı; yedeğe düşmek panoya sessizce kopyalar, "paylaşılamadı"
 * demek ise düpedüz yanlış geri bildirim olurdu.
 *
 * YEDEK ZİNCİRİ: eklenti → navigator.share (web) → clipboard → toast.
 */
function shareApp() {
  const metin = t('share_text', { url: STORE_URL });
  const P = (typeof Capacitor !== 'undefined' && Capacitor.Plugins) ? Capacitor.Plugins.Share : null;

  if (P && typeof P.share === 'function') {
    try {
      P.share({ title: 'SlySwipe', text: metin, dialogTitle: t('share_dialog_title') })
        .catch((e) => {
          const m = (e && (e.message || e.errorMessage)) || '';
          if (/cancel|in progress/i.test(m)) return;
          shareFallback(metin);
        });
      return;
    } catch (e) { /* köprü patlarsa aşağıdaki yollara düş */ }
  }

  // Web yüzeyi: bazı tarayıcılarda gerçek paylaşım sayfası var.
  try {
    if (navigator.share) {
      navigator.share({ title: 'SlySwipe', text: metin })
        .catch((e) => {
          if (e && e.name === 'AbortError') return;
          shareFallback(metin);
        });
      return;
    }
  } catch (e) { /* share çağrısının kendisi patlarsa yedeğe düş */ }

  shareFallback(metin);
}

function shareFallback(metin) {
  const bitir = (anahtar) => { if (typeof showToast === 'function') showToast(t(anahtar)); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin)
        .then(() => bitir('share_copied'))
        .catch(() => bitir('share_failed'));
      return;
    }
  } catch (e) { /* pano da yoksa aşağıya düş */ }
  bitir('share_failed');
}

/**
 * PUANLA — önce Play uygulaması (market://), sonra HTTPS.
 *
 * SIRA ÖNEMLİ: market:// Play uygulamasını doğrudan açar ve kullanıcıyı
 * tarayıcıdan geçirmez. Play uygulaması yoksa (emülatör, bazı ROM'lar)
 * o şema hiçbir şey yapmaz — bu yüzden HTTPS yedeği ZORUNLU.
 *
 * ZAMAN AŞIMI ile yedek: market:// başarısız olduğunda senkron bir HATA
 * ATMAZ, sessizce hiçbir şey yapmaz. Yani try/catch tek başına yetmez.
 * Sayfa hâlâ görünürse mağaza açılmamış demektir ve HTTPS'e geçiyoruz;
 * mağaza AÇILDIYSA sayfa arka plana düşer ve ikinci gezinme atlanır.
 *
 * Kapalı testte listeleme tester hesabına bağlı olabilir; bu işlevin işi
 * yalnızca GÜVENLİ YÖNLENDİRME — sayfanın içeriğini garanti etmiyor.
 */
function rateApp() {
  try {
    window.location.href = MARKET_URI;
  } catch (e) { /* şema tanınmadı */ }

  setTimeout(() => {
    if (document.visibilityState === 'hidden') return;   // mağaza açıldı
    try {
      window.open(STORE_URL, '_blank');
    } catch (e) {
      try { window.location.href = STORE_URL; }
      catch (e2) { if (typeof showToast === 'function') showToast(t('rate_failed')); }
    }
  }, 700);
}

/**
 * YARDIM — mevcut modal kabuğunu (.av-scrim/.av-box) yeniden kullanır.
 *
 * YENİ TASARIM SİSTEMİ KURULMADI: dil seçici zaten bu kabuğu kullanıyor
 * ve yükseklik/kaydırma sorunları orada çözülmüş durumda (70vh tavan,
 * liste kendi içinde kayar, overscroll-behavior:contain). Yardım da aynı
 * kutuya giriyor, yalnızca içerik düzeni farklı.
 *
 * Bölümler DİZİDEN geliyor: sekiz bölümün her biri iki anahtar taşıyor
 * ve yeni bölüm eklemek diziye bir satır demek.
 */
const HELP_SECTIONS = [
  { ico: '🎯', k: 'help_start' },
  { ico: '🧭', k: 'help_discover' },
  { ico: '🎮', k: 'help_games' },
  { ico: '📺', k: 'help_ads' },
  { ico: '👑', k: 'help_plus' },
  { ico: '🛒', k: 'help_purchase' },
  { ico: '🔒', k: 'help_privacy' },
  { ico: '✉️', k: 'help_support' },
];

function openHelp() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bolumler = HELP_SECTIONS.map((s) => `
    <div class="help-sec">
      <span class="help-sec-head"><span class="help-sec-ico">${s.ico}</span>${esc(t(s.k + '_title'))}</span>
      <p class="help-sec-body">${esc(t(s.k + '_body'))}</p>
    </div>`).join('');

  // Gizlilik ve destek satırları GERÇEK adreslere gidiyor. Adresler
  // çeviriye girmiyor (kimlik, metin değil) ve rel=noopener zorunlu.
  const baglantilar = `
    <div class="help-links">
      <a class="help-link" href="${PRIVACY_URL}" target="_blank" rel="noopener noreferrer">
        <span class="dir-ico">↗</span> ${esc(t('help_privacy_link'))}</a>
      <a class="help-link" href="mailto:${SUPPORT_MAIL}">
        <span>✉️</span> ${esc(SUPPORT_MAIL)}</a>
    </div>`;

  let el = document.getElementById('help-sheet');
  if (!el) {
    el = document.createElement('div');
    el.id = 'help-sheet';
    el.className = 'av-scrim';
    el.onclick = (ev) => { if (ev.target === el) closeHelp(); };
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="av-box help-box">
      <span class="av-head">${esc(t('help_title'))}</span>
      <div class="help-list">${bolumler}${baglantilar}</div>
      <button class="av-close" onclick="closeHelp()">${esc(t('common_close'))}</button>
    </div>`;
  el.style.display = 'flex';
}

function closeHelp() {
  const el = document.getElementById('help-sheet');
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
  
  // ───── GİRİŞ SERİSİ ─────
  // UYGULAMA HER AÇILDIĞINDA çağrılır (initApp), ödül almaya BAĞLI DEĞİL.
  // 2026-08-11'e kadar tek çağıranı claimDailyReward() idi, yani seri
  // ancak oyuncu bugünün dairesine DOKUNURSA ilerliyordu; cihazda 248 tur
  // oynamış bir hesap "0 gün seri" gösteriyordu. Seri artık "uygulamayı
  // açtın mı" sorusunun cevabı, ki adı da bunu söylüyor.
  checkIn() {
    const data = this.getData();
    const today = new Date().toDateString();

    // GEÇİŞ (2026-08-11): rewardDate'ten önce lastDate İKİ anlamı birden
    // taşıyordu — "giriş yaptı" ve "günlük ödülü aldı" tek eylemdi.
    // Alan yoksa eski anlamı ödül tarafına taşı.
    //
    // İKİ ŞEY LOAD-BEARING:
    // 1. lastDate GÜNCELLENMEDEN ÖNCE çalışmalı. Sonra yapılsaydı, bugün
    //    ödülünü henüz almamış her oyuncu almış sayılır ve ödülünü bir
    //    gün kaybederdi.
    // 2. `|| null` ŞART, `&& data.lastDate` koşulu DEĞİL. Alan her
    //    hâlükârda YAZILMALI: yazılmasaydı taze bir kayıtta rewardDate
    //    sonsuza dek undefined kalır, okuyucu da lastDate'e düşerdi — ve
    //    lastDate iki satır sonra BUGÜN olacağı için yeni oyuncuya
    //    "bugünkü ödülü zaten aldın" denirdi. Cihazda bu şekilde
    //    yakalandı; null "hiç alınmadı" demenin açık yolu.
    if (data.rewardDate === undefined) {
      data.rewardDate = data.lastDate || null;
    }

    if (data.lastDate === today) {
      this.saveData(data);   // geçiş yazılmış olabilir
      return false;          // bugün zaten sayıldı
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (data.lastDate === yesterday.toDateString()) {
      // Dün de girilmiş — seri sürüyor. 100 gün üst üste = 100.
      data.count = (data.count || 0) + 1;
    } else {
      // BOŞLUK VAR (ya da ilk giriş) → SERİ SIFIRLANIR, bugünle 1'den
      // başlar. Eskiden bir azaltılıyordu ("go back 1 day instead of
      // reset"); sahibinin kararıyla değişti (2026-08-11): bir gün
      // atlayan oyuncu seriyi kuramamıştır, seri de bunu söylemeli.
      // Azaltma, "üst üste kaç gün" ifadesini ölçmediği için sayıyı
      // anlamsızlaştırıyordu.
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

    // ───── SERİ KİLOMETRE TAŞLARI ─────
    // 2026-08-11'de claimDailyReward()'dan BURAYA taşındı. Orada
    // `streak === 7` koşulu, seri ödül almaya bağlıyken doğruydu; seri
    // artık açılışta ilerlediği için orada kalsaydı yalnızca oyuncu
    // ödülü tam o gün almayı hatırlarsa ödenirdi — yani sessizce
    // güvenilmez olurdu. Kilometre taşı seriye aittir, ödüle değil.
    // add() ile, addReward() ile DEĞİL: Plus çarpanı reklam ve günlük
    // ödül kazançlarına uygulanıyor; bu ise oyuncunun kendi
    // sürekliliğinin karşılığı, aboneliğin değil.
    if (typeof DiamondSystem !== 'undefined') {
      const ms = EconomyConfig.STREAK_MILESTONES.find(m => m.days === data.count);
      if (ms) DiamondSystem.add(ms.amount, t(ms.labelKey));
    }

    // Seri uzadı — seri rozetlerinin (7/30/50/100/250/500) koşulu tam
    // olarak bu.
    if (typeof Badges !== 'undefined') Badges.check();
    return true;
  },

  // ───── GÜNLÜK ELMAS ÖDÜLÜ ─────
  // Giriş serisinden AYRI kayıt (`rewardDate`). Ayrılmak ZORUNDAYDI:
  // seri artık açılışta ilerliyor, yani ikisi tek alanda tutulsaydı
  // uygulama açılır açılmaz ödül "alınmış" sayılır ve oyuncu ödülünü
  // hiç alamazdı.
  // SADECE rewardDate'e bakar, lastDate'e DÜŞMEZ. Düşseydi, alanı henüz
  // yazılmamış bir kayıtta lastDate (= bugün) okunur ve ödül alınmış
  // sanılırdı. Belirsizliği geçiş çözüyor: checkIn() her açılışta ve her
  // render'dan ÖNCE çalışıp alanı mutlaka yazıyor.
  rewardClaimedToday() {
    return this.getData().rewardDate === new Date().toDateString();
  },

  markRewardClaimed() {
    const d = this.getData();
    d.rewardDate = new Date().toDateString();
    this.saveData(d);
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

// `day` ve `label` alanları KALDIRILDI (2026-08-15): ikisi de görünen
// metindi ve bu dizi modül yüklenirken kuruluyor. Gün adı artık
// DAY_KEYS'ten sırayla, etiket ise miktardan türetiliyor
// (t('diamonds_reward_label', {amount})) — yani "5 Elmas" gibi bir metni
// hem burada hem çeviri tablosunda tutmak gerekmiyor. Pazar'ın ünlemli
// biçimi ayrı bir anahtar, çünkü vurgu tasarımın parçası.
const DAILY_REWARD_TABLE = [
  { amount: 5,   icon: '💎' },
  { amount: 10,  icon: '💎' },
  { amount: 15,  icon: '🎁' },
  { amount: 20,  icon: '💎' },
  { amount: 30,  icon: '🎉' },
  { amount: 40,  icon: '✨' },
  { amount: 100, icon: '👑', big: true },
];

/** Günlük ödülün görünen etiketi ("5 Elmas" / "100 Elmas!"). */
function dailyRewardLabel(r) {
  return t(r.big ? 'diamonds_reward_label_big' : 'diamonds_reward_label', { amount: r.amount });
}

// Yalnızca ELMAS ödülünü öder. Seriyi ARTIRMAZ — seri açılışta
// ilerliyor (bkz. StreakSystem.checkIn). İkisi 2026-08-11'e kadar aynı
// eylemdi ve seri de bu yüzden çalışmıyordu.
function claimDailyReward() {
  if (StreakSystem.rewardClaimedToday()) {
    showToast(t('diamonds_already_claimed'));
    return;
  }
  StreakSystem.markRewardClaimed();
  const dayIdx = StreakSystem.getDayInWeek();
  const reward = DAILY_REWARD_TABLE[dayIdx];
  // addReward: günlük ödül Plus'ın +%50 çarpanına TABİ (bkz. 4d).
  DiamondSystem.addReward(reward.amount, t('diamonds_daily_reward'));

  // Plus günlük bonusu — tablonun ÜSTÜNE, ayrı bir satır olarak.
  // Tabloyu Plus'a göre değiştirmek yerine ayrı satır olmasının sebebi:
  // DAILY_REWARD_TABLE haftanın ritmini kuruyor (Paz 100💎 zirvesi), Plus
  // bunu bozmadan her güne sabit bir taban ekliyor.
  // add() ile veriliyor, addReward() ile DEĞİL: bu zaten bir Plus faydası,
  // üstüne bir de Plus çarpanı uygulamak aynı avantajı iki kez saymak olur.
  if (PlusSystem.isActive()) {
    DiamondSystem.add(EconomyConfig.PLUS_DAILY_DIAMONDS, t('diamonds_plus_daily'));
  }

  // Seri kilometre taşları (7/14/30) BURADAN KALDIRILDI —
  // StreakSystem.checkIn()'e taşındı; gerekçe orada yazılı.

  renderDailyRewards();
  // Seri kartı da tazelenmeli: #hdr-streak onun içinde ve ilerleme
  // çubuğu da seriden hesaplanıyor. renderHomeStats() elemanı yeniden
  // yarattığı için updateStreakUI() ONDAN SONRA çağrılmalı — tersi
  // olsaydı sayı yazılır, hemen ardından üzerine eski değer basılırdı.
  renderHomeStats();
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
        id: m.id, icon: m.icon, tone: m.tone, name: t(m.nameKey),
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
      DiamondSystem.addReward(r.reward, t('quest_toast', { name: r.name }));
    });

    if (rows.every(r => r.done) && !d.bonusPaid) {
      d.bonusPaid = true;
      changed = true;
      DiamondSystem.addReward(EconomyConfig.QUEST_ALL_BONUS, t('quest_all_done'));
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
    if (done === rows.length) return t('quest_done_today');
    return t('quest_shop_progress', { done, total: rows.length });
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
// KOLEKSİYONLAR — Rozetler ekranının çipleri bunları okuyor.
// UYDURULMUŞ bir taksonomi DEĞİL: her rozetin zaten hangi sayaçtan
// beslendiği belli (oyun sayacı / seri / elmas), gruplar tam olarak o
// üç kaynak. Yeni bir rozet eklendiğinde `group` alanı verilir; çip
// listesi buradan türediği için ekran kodu dokunulmadan büyür.
const BADGE_GROUPS = [
  { id:'all',     labelKey:'common_all' },
  { id:'oyun',    labelKey:'badge_group_games' },
  { id:'seri',    labelKey:'badge_group_streak' },
  { id:'ekonomi', labelKey:'badge_group_economy' },
];

const BADGES = [
  // Sıra ZORLUĞA GÖRE ARTAN. Vitrin "en değerli 3"ü seçerken ödülü
  // ölçüt alıyor, yani ödül miktarları aynı zamanda zorluk sıralaması.
  { id:'first_game',    icon:'🎮', tone:'blue',   group:'oyun',    nameKey:'badge_first_game',
    descKey:'badge_first_game_desc',        reward:EconomyConfig.BADGE_FIRST_GAME,
    test: () => GameEvents.stats().totalGamesStarted >= 1 },

  { id:'games_10',      icon:'🔟', tone:'purple', group:'oyun',    nameKey:'badge_ten_games',
    descKey:'badge_ten_games_desc',              reward:EconomyConfig.BADGE_10_GAMES,
    test: () => GameEvents.stats().totalGamesStarted >= 10 },

  // ph_streak: uygulamayı AÇMA serisi. DailyChallenge'ın "günlüğü çözme"
  // serisi DEĞİL — ikisi farklı davranışı ödüllendiriyor (katılım vs
  // başarı) ve karıştırılmamalı (bkz. core/daily.js başlığı).
  { id:'streak_7',      icon:'🔥', tone:'red',    group:'seri',    nameKey:'badge_streak_7',
    descKey:'badge_streak_7_desc',  reward:EconomyConfig.BADGE_STREAK_7,
    test: () => StreakSystem.getCount() >= 7 },

  { id:'diamonds_500',  icon:'💎', tone:'cyan',   group:'ekonomi', nameKey:'badge_diamonds_500',
    descKey:'badge_diamonds_500_desc',        reward:EconomyConfig.BADGE_DIAMONDS_500,
    // BAKİYE değil, YAŞAM BOYU kazanım. Bakiyeyle yazılsaydı oyuncu
    // elmasını harcadığı an rozet geri alınırdı.
    test: () => DiamondSystem.earned() >= 500 },

  { id:'streak_30',     icon:'👑', tone:'gold',   group:'seri',    nameKey:'badge_streak_30',
    descKey:'badge_streak_30_desc', reward:EconomyConfig.BADGE_STREAK_30,
    test: () => StreakSystem.getCount() >= 30 },

  // Uzun seri basamakları (2026-08-11). Hepsi AYNI sayaçtan okuyor
  // (ph_streak), yani yeni bir takip yazılmadı — bu bölümün kuralı.
  { id:'streak_50',     icon:'⚡', tone:'purple', group:'seri',    nameKey:'badge_streak_50',
    descKey:'badge_streak_50_desc', reward:EconomyConfig.BADGE_STREAK_50,
    test: () => StreakSystem.getCount() >= 50 },

  { id:'streak_100',    icon:'🌟', tone:'cyan',   group:'seri',    nameKey:'badge_streak_100',
    descKey:'badge_streak_100_desc', reward:EconomyConfig.BADGE_STREAK_100,
    test: () => StreakSystem.getCount() >= 100 },

  { id:'streak_250',    icon:'💫', tone:'blue',   group:'seri',    nameKey:'badge_streak_250',
    descKey:'badge_streak_250_desc', reward:EconomyConfig.BADGE_STREAK_250,
    test: () => StreakSystem.getCount() >= 250 },

  { id:'streak_500',    icon:'🏆', tone:'gold',   group:'seri',    nameKey:'badge_streak_500',
    descKey:'badge_streak_500_desc', reward:EconomyConfig.BADGE_STREAK_500,
    test: () => StreakSystem.getCount() >= 500 },
];

// Rozet `tone` değerleri (blue/purple/red/cyan/gold) ile kabuk tasarım
// sisteminin ton aileleri (sly-t-*) arasındaki tek eşleme noktası.
// İki isim seti var çünkü rozet tonları bu sistemden ÖNCE yazılmıştı ve
// depoda `bdg-<tone>` sınıflarıyla da kullanılıyor; ikisini birden
// yeniden adlandırmak bu turun konusu değil.
const SLY_TONE = {
  blue:'blue', purple:'violet', red:'rose', cyan:'cyan', gold:'gold',
  green:'green', amber:'gold',
};
function slyTone(t) { return SLY_TONE[t] || 'violet'; }

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
        '<span class="bdg-pop-kicker">' + t('badges_earned_kicker') + '</span>' +
        '<span class="bdg-pop-name"></span>' +
        '<span class="bdg-pop-reward">+' + item.granted + '💎</span>' +
      '</div>';
    // Ad textContent ile: rozet adı HTML olarak yorumlanmasın.
    el.querySelector('.bdg-pop-name').textContent = t(item.def.nameKey);
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
    // Rozetler ekranı yalnızca görünürken yeniden çizilsin — gizli bir
    // ekranı her rozet için baştan kurmak boşa iş.
    if (currentScreen === 'screen-lider' && typeof renderProgress === 'function') renderProgress();
    // Ana sayfadaki "Rozet İlerlemesi" kartı da bu sayacı gösteriyor.
    // Onsuz, oyundan çıkıp ana sayfaya dönmeden kart eski sayıda kalırdı
    // — kutlama katmanı "rozet kazandın" derken kartın 0/5 demesi, aynı
    // gerçeğin iki farklı hikâyesi olurdu.
    if (currentScreen === 'screen-home' && typeof renderHomeStats === 'function') {
      renderHomeStats();
      // #hdr-streak yeniden yaratıldı; seri sayısını geri yaz.
      if (typeof updateStreakUI === 'function') updateStreakUI();
      if (typeof renderHomePromo === 'function') renderHomePromo();
    }
  },

  // `total` YEREL DEĞİŞKENİ ESKİDEN `t` İDİ ve bu, global `t()` çeviri
  // fonksiyonunu gölgeliyordu: satır `t is not a function` ile patlıyordu.
  // i18n sonrası `t` artık ayrılmış bir ad — tek harflik yerel değişken
  // olarak kullanılamaz.
  shopLabel() {
    const n = this.count(), total = this.total();
    if (n >= total) return t('badges_all_earned');
    return t('badges_shop_progress', { n, total });
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
    if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) return t('ad_budget_plus');
    const left = this.remaining();
    if (left === 0) return t('ad_budget_empty');
    return t('ad_budget_left', { left, limit: this.limit() });
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
  // Galaxy A51 — PLAY'DEN kurulum (2026-08-13). Play App Signing paketi
  // GOOGLE'IN anahtarıyla yeniden imzaladığı için hash yine değişti; hash
  // cihaza değil imza anahtarına bağlı (aynı telefon şimdiye kadar ÜÇ
  // farklı değer üretti). Bu değer daha önce "üçüncü taraf imzalı bir
  // kurulum" diye kaydedilmişti — kimliği şimdi netleşti, Play'in kendisi.
  // Kaynak: UMP'nin açılışta yazdığı satır (addTestDeviceHashedId), ki
  // Ads SDK'sı da aynı değeri basıyor.
  '88D815B20F99227E224E91EB84233D54',
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

// ───── REKLAM BU PLATFORMDA VAR MI? ─────
//
// "Bütçe bitti" ile "reklam diye bir şey yok" AYRI iki durum ve ayrı
// kalmak zorundalar. AdBudget.canWatch() birincisini yanıtlıyor; oraya
// platform bilgisini karıştırmak, iOS'ta oyuncuya "günlük hakkın bitti"
// dedirtirdi — hiç var olmamış bir hakkın bittiğini söylemek.
//
// iOS'ta reklam KAPALI (2026-08-27, sahip kararı). Sebep gelir değil
// GÜVENLİK: AD_TEST_DEVICES'taki üç hash Android'e özgü ve İMZA
// ANAHTARINA bağlı — aynı telefon şimdiye kadar üç farklı değer üretti.
// iOS'ta hiçbiri geçerli olmadığı için "kendi reklamına tıklama"
// koruması orada YOK, ve o koruma kurulmadan gerçek bir birim kimliği
// kullanmak AdMob hesabının askıya alınması riski demek.
//
// ───── NEDEN adMobPlugin() null DÖNDÜRMÜYORUZ ─────
// En kısa yol o gibi görünüyor ve TAM TERSİ sonucu veriyor: show() eklenti
// yoksa _showSimulated'a düşüyor, yani oyuncu iOS'ta hiç reklam izlemeden
// ödülü alırdı. Simülasyon web için var (CLAUDE.md §1: birincil geliştirme
// yüzeyi) ve orada zararsız; native bir sürümde ise doğrudan bedava-ödül
// kapısı. Bu yüzden kontrol AYRI bir soru olarak duruyor.
function adsSupported() {
  const C = (typeof Capacitor !== 'undefined') ? Capacitor : null;
  if (!C || !C.getPlatform) return true;            // web → simülasyon çalışsın
  return C.getPlatform() !== 'ios';
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
    if (!ad || !ad.showPrivacyOptionsForm) { showToast(t('settings_privacy_unavailable')); return; }
    ad.showPrivacyOptionsForm()
      .then(() => ad.requestConsentInfo(this._debugOptions() || {}))
      .then((info) => { if (info) this._info = info; renderSettings(); })
      .catch((e) => {
        showToast(t('settings_privacy_failed'));
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
    // Gösterilmeyecek bir reklamı önceden yüklemek boşuna ağ isteği —
    // ve daha önemlisi, AdMob'a giden bir İSTEK. iOS'ta test cihaz
    // koruması olmadığı için hiç istek yapılmaması gereken taraf burası.
    if (!adsSupported()) return Promise.resolve(false);
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
      showToast(msg || t('ad_load_failed'));
      if (typeof console !== 'undefined') console.warn('[AdMob] ' + why);
    };
    const finish = () => {
      if (settled) return;
      settled = true; cleanup(); release();
      preloadNext();
      if (earned && onComplete) onComplete();
      else if (!earned) showToast(t('ad_must_finish'));
    };

    // RIZA ÖNCE. Açılışta zaten başlatıldı; burada aynı promise bekleniyor,
    // yani ilk reklam isteği rıza çözülmeden ASLA gitmiyor. Google'ın
    // cevabı hayırsa (kapsam içi bölge + rıza yok) istek hiç yapılmıyor.
    AdConsent.ensure(ad).then(() => {
      if (!AdConsent.canRequestAds()) {
        fail('riza yok (canRequestAds=false)',
             t('ad_blocked_consent'));
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
    // Platform kapısı EN BAŞTA ve _pending'DEN ÖNCE: burada kalkanı
    // kurup dönmek, kilidi hiç açılmayacak şekilde kapatırdı (release()
    // yalnız native/simüle yollarının sonunda çağrılıyor) ve oyuncu bir
    // daha hiçbir ödüllü reklam açamazdı.
    if (!adsSupported()) return false;
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
        <div class="ad-header">${t('ad_reward_title')}</div>
        <div class="ad-body">
          <div class="ad-reward-preview">${reward.icon} ${reward.text}</div>
          <div class="ad-timer">
            <div class="ad-timer-bar"><div class="ad-timer-fill"></div></div>
            <span class="ad-timer-text">${t('ad_reward_sim')}</span>
          </div>
        </div>
        <button class="ad-skip" style="display:none">${t('ad_close')}</button>
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
  // Reklamın olmadığı platformda (iOS) hiçbir ödül yolu açılmaz. Plus
  // kontrolünden SONRA duruyor, çünkü Plus'lı oyuncu ödülü zaten reklamsız
  // alıyor — orası bir reklam yolu değil, reklamın atlandığı yol.
  //
  // SESSİZCE false dönüyor, toast YOK: UI bu seçeneği hiç göstermiyor
  // (refreshGameOverOffers, FREE_DIAMOND_SOURCES, offerRewardChoice), yani
  // buraya ancak oyun içinden doğrudan çağıran bir yol ulaşır. Orada
  // "reklam hakkın bitti" demek yanlış bilgi olurdu.
  if (!adsSupported()) return false;
  // UI zaten devre dışı bırakılmış olmalı; bu savunma katmanı (oyun
  // içinden doğrudan çağrılan yollar için).
  if (sayilir && !AdBudget.canWatch()) {
    showToast(t('ad_daily_limit'));
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
//   • yalnız tur     → kısa oyunlarda (Hafıza, Resim Kaydır) üç tur bir
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
    // Reklamın olmadığı platformda (iOS) geçiş reklamı da yok. Ödüllü
    // taraftan AYRI yazılmak zorunda: ikisi bilerek farklı eksenler
    // (AdBudget "oyuncu kaç ödül isteyebilir", burası "biz kaç kez araya
    // girebiliriz") ve aralarında paylaşılan bir kapı yok.
    if (!adsSupported()) return false;
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
        <div class="ad-header">${t('ad_interstitial_title')}</div>
        <div class="ad-body">
          <div class="ad-reward-preview">${t('ad_interstitial_sim')}</div>
          <div class="ad-timer">
            <div class="ad-timer-bar"><div class="ad-timer-fill"></div></div>
            <span class="ad-timer-text">${t('ad_interstitial_wait')}</span>
          </div>
        </div>
        <button class="ad-skip" style="display:none">${t('ad_close')}</button>
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
      // Reklamsız platformda (iOS) reklam düğmesi hiç çizilmiyor. Sonuç:
      // pencere yalnız elmas + iptal gösterir. gemCost verilmeyen tek
      // çağrı skor 2x ve o zaten reklamsız platformda hiç açılmıyor
      // (refreshGameOverOffers düğmeyi gizliyor), yani "hiçbir seçeneği
      // olmayan pencere" durumu oluşamıyor.
      (adsSupported() || plus
        ? '<button class="ph-offer-btn primary" data-a="ad">' +
            (plus ? '👑 ' : '📺 ') + (opts.adText || t('ad_watch')) +
          '</button>'
        : '') +
      (gemCost != null
        ? '<button class="ph-offer-btn" data-a="gem"' + (gemOk ? '' : ' disabled') + '>💎 ' +
            gemCost + ' → ' + (opts.gemText || 'Al') + '</button>' +
          '<div class="ph-offer-balance">' + t('offer_balance', { amount: I18n.n(balance) }) + '</div>'
        : '') +
      '<button class="ph-offer-btn" data-a="no">' + t('common_cancel') + '</button>' +
    '</div>';
  // Başlık textContent ile: oyun adı/etiketi HTML olarak yorumlanmasın.
  panel.querySelector('.ph-offer-title').textContent = opts.title || t('offer_help');
  // BURADA BİR data-ph-ad-budget SATIRI ARAMAYIN — 2026-08-07'de günlük
  // hak satırı bu modalden kaldırıldı (fayda eylemleri artık günlük
  // elmas hakkına işlemiyor), ama onu dolduran querySelector satırı
  // kalmıştı ve null üzerinde .textContent yazmaya çalışıyordu. Sonuç:
  // modal her açılışta TypeError atıyor, yani Ok Bulmaca'nın ve 2048'in
  // ipucu/geri-al penceresi hiç açılmıyordu. 2026-08-09'da kaldırıldı.
  //
  // Node koşum takımı bunu YAKALAYAMAZ: tools/dom-sandbox.js'in
  // querySelector'ı hiçbir zaman null dönmez, her zaman bir stub verir.
  // Hata yalnızca gerçek tarayıcıda ortaya çıkıyor — bu satırın sessizce
  // aylarca yaşamasının sebebi de bu.
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
    runRewardedAction({ icon: '🎁', text: opts.adText || t('offer_reward') }, () => opts.onGrant('ad'),
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
  // iOS'ta satın alma KAPALI (2026-08-27, sahip kararı). Burada null
  // döndürmek reklam tarafındaki tuzağın TERSİ: orada null "simülasyona
  // düş" demekti, burada "mağaza yok" demek — ve mağaza yokluğu zaten
  // tasarlanmış bir durum, çünkü web yüzeyi hep öyle çalışıyor. Fiyatlar
  // '—' gösteriyor (asla eski bir sabit sayıya düşmüyor: yanlış fiyat
  // göstermek hiç göstermemekten kötü, oyuncu gördüğünü ödeyeceğini
  // varsayar) ve purchase() sessizce reddediyor.
  //
  // Neden kapalı: RC_API_KEY_ANDROID bir goog_ anahtarı, iOS appl_ ister;
  // ve 7 ürünün (3 abonelik + 4 elmas paketi) App Store Connect tarafında
  // sıfırdan tanımlanması gerekiyor — Play Console'daki tanımlar taşınmaz.
  //
  // Mağaza satırları GİZLENMİYOR: CLAUDE.md'ye göre Profil'deki o iki
  // satır Plus sayfasının ve elmas mağazasının TEK kapısı; gizlemek iki
  // ekranı erişilmez yapardı.
  if (C.getPlatform && C.getPlatform() === 'ios') return null;
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
          const entry = {
            priceString: prod.priceString, price: prod.price,
            currencyCode: prod.currencyCode, pkg: pkg,
          };
          table[id] = entry;

          // ABONELİKLER "subId:basePlanId" OLARAK GELİR — takma ad ŞART.
          // Google Play'de bir aboneliğin altında taban planlar (base plan)
          // var ve RevenueCat ürün kimliğini bileşik döndürüyor:
          // 'plus_monthly:aylik'. Tek seferlik ürünlerde (diamonds_100) böyle
          // bir şey yok, kimlik birebir kalıyor. Kaynak, paketin kendi tip
          // tanımı: SubscriptionOption.storeProductId → "This will be
          // subId:basePlanId" (offerings.d.ts).
          //
          // Bu yüzden elmas fiyatları GELİRKEN Plus fiyatları '—' kalıyordu:
          // tablo 'plus_monthly:aylik' ile anahtarlanıyor, IAP.PLUS.monthly
          // ise 'plus_monthly' soruyor. Cihazda gözlendi (2026-08-12).
          //
          // Fiyattan daha ağırı: purchase() de aynı tabloya bakıyor, yani
          // Plus satın alma sessizce notFound dönüyordu.
          //
          // Taban plan kimliğini BİLMEYE gerek yok — iki nokta üstündeki
          // kısım zaten ürün kimliği. Var olan bir kayıt EZİLMİYOR: birebir
          // eşleşme her zaman kazanır, takma ad yalnızca boş yeri doldurur.
          const base = id.split(':')[0];
          if (base && base !== id && !table[base]) table[base] = entry;
        });
        this._offerings = table;

        // Mağazanın GERÇEKTE ne döndürdüğünü tek satırda göster. Bir fiyat
        // '—' kaldığında iki sebep var ve ikisi farklı yerde çözülüyor:
        // (a) ürün/taban plan Play Console'da yok veya etkin değil → paket
        //     hiç dönmez, (b) kimlik biçimi beklenenden farklı → paket döner
        //     ama anahtar tutmaz. Bu satır ikisini ayırt eden tek kanıt;
        //     cihazda `adb logcat | grep RC` ile okunuyor.
        if (typeof console !== 'undefined') {
          console.log('[RC] offerings: ' + Object.keys(table).join(', '));
        }
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
  // Ay eki ve tasarruf cümlesi AYRI anahtarlar: bazı dillerde yüzde
  // işareti sayıdan önce gelir (tr "%72"), bazılarında sonra (en "72%"),
  // yani "%" + sayı birleştirmesi çeviriye bırakılmalı.
  if (!m || m <= 0) return perMonth + t('plus_period_month');
  const save = Math.round((1 - (y / 12) / m) * 100);
  return save > 0 ? t('plus_savings', { perMonth, percent: save })
                  : perMonth + t('plus_period_month');
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
    { id: 'gece',    nameKey: 'theme_night_violet', plusOnly: false, ready: true  },
    { id: 'tapinak', nameKey: 'theme_shadow_temple', plusOnly: true,  ready: false },
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
    const th = this.find(id);
    if (!th || !th.plusOnly) return false;
    return !PlusSystem.isActive();
  },

  // Tema seçicinin TEK giriş noktası. Bugün çağıran yok (seçici yok);
  // seçici geldiğinde kilidi yeniden düşünmek yerine bunu çağıracak.
  // Yerel tema değişkeni `th`, `t` DEĞİL: `t` global çeviri fonksiyonunun
  // adı ve onu gölgelemek satırı "t is not a function" ile patlatıyor
  // (Badges.shopLabel'de tam olarak bu yaşandı). i18n sonrası `t` artık
  // ayrılmış bir ad — tek harflik yerel değişken olarak kullanılamaz.
  apply(id) {
    const th = this.find(id);
    if (!th) return false;
    if (this.isLocked(id)) {
      showToast(t('theme_plus_only'));
      showPlusPage();
      return false;
    }
    if (!th.ready) { showToast(t('theme_soon')); return false; }
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
    showToast(t('purchase_app_only'));
    return;
  }
  if (res && res.notFound) {
    showToast(t('purchase_not_found'));
    return;
  }
  showToast(t('purchase_failed'));
  if (res && res.error && typeof console !== 'undefined') {
    console.warn('[RC] purchase: ' + (res.error.message || res.error));
  }
}

function purchasePlus() {
  if (PlusSystem.isActive()) {
    showToast(t('plus_already'));
    return;
  }
  const productId = IAP.PLUS[_selectedPlan];
  if (!productId) { showToast(t('plus_plan_failed')); return; }
  Billing.purchase(productId).then((res) => {
    _handlePurchaseResult(res, () => {
      // Hak durumu Billing.purchase içinde zaten senkronlandı; burada
      // yalnızca geri bildirim ve ekran tazeleme var.
      showToast(t('plus_active'));
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
    showToast(t('purchase_app_only'));
    return;
  }
  showToast(t('purchase_restoring'));
  Billing.restore().then((res) => {
    if (!res.ok) { showToast(t('purchase_restore_failed')); return; }
    showToast(res.active ? t('purchase_restored_plus')
                         : t('purchase_restore_none'));
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
// `badge` bir METİN değil, bir ETİKET KİMLİĞİ ('popular' | 'best').
// 2026-08-15'e kadar Türkçe metindi ve renderShop() ona `===` ile
// bakıp kartın CSS sınıfına karar veriyordu — yani metin çevrildiği an
// hem "Popüler" hem "En İyi" vurgusu sessizce kaybolurdu. Kullanıcıya
// görünen metin kimlik olamaz; aynı kalıp GAME_MAP'te de düzeltildi.
const DIAMOND_PACKAGES = [
  { id: 'small', amount: 100, bonus: 0, badge: null },
  { id: 'medium', amount: 500, bonus: 50, badge: 'popular' },
  { id: 'large', amount: 1500, bonus: 300, badge: null },
  { id: 'mega', amount: 5000, bonus: 1500, badge: 'best' },
];
const SHOP_BADGE_KEY = { popular: 'shop_tag_popular', best: 'shop_tag_best' };

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
  { icon: '📺', titleKey: 'shop_free_ad', descKey: null, reward: '+10💎', action: 'watchAdForDiamonds', dynamic: 'ad' },
  { icon: '🎯', titleKey: 'shop_free_quests', descKey: null, reward: '', action: 'goToHome', dynamic: 'quests' },
  { icon: '📅', titleKey: 'shop_free_daily', descKey: 'shop_free_daily_note', reward: '+5-100💎', action: 'goToHome' },
  { icon: '🏆', titleKey: 'shop_free_badges', descKey: null, reward: '', action: 'showAchievements', dynamic: 'badges' },
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
      <div class="shop-package ${pkg.badge === 'best' ? 'shop-best' : ''} ${pkg.badge === 'popular' ? 'shop-popular' : ''}" onclick="buyPackage('${pkg.id}')">
        ${pkg.badge ? '<div class="shop-badge">' + t(SHOP_BADGE_KEY[pkg.badge]) + '</div>' : ''}
        <span class="shop-pkg-icon">💎</span>
        <span class="shop-pkg-amount">${pkg.amount.toLocaleString()}</span>
        ${pkg.bonus > 0 ? '<span class="shop-pkg-bonus">+' + pkg.bonus + ' BONUS</span>' : ''}
        <button class="shop-pkg-price" data-ph-price="${IAP.DIAMONDS[pkg.id]}">${PRICE_PLACEHOLDER}</button>
      </div>
    `;
  }).join('');
  
  // Free sources
  const free = document.getElementById('shop-free');
  // Reklam satırı, reklamın olmadığı platformda (iOS) hiç çizilmiyor.
  // Pasif çizmek "hakkın bitti" anlamına gelirdi ve AdBudget.label() da
  // olmayan bir havuzdan sayı okurdu; satırın kendisi yanlış olurdu.
  free.innerHTML = FREE_DIAMOND_SOURCES.filter(src => src.dynamic !== 'ad' || adsSupported()).map(src => {
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
               : badgeRow ? Badges.shopLabel() : (src.descKey ? t(src.descKey) : '');
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
        <span class="sfi-title">${t(src.titleKey)}</span>
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
  if (!pkg || !productId) { showToast(t('shop_pkg_not_found')); return; }
  Billing.purchase(productId).then((res) => {
    _handlePurchaseResult(res, () => {
      // add(), addReward() DEĞİL: satın alınan elmasa Plus'ın +%50
      // çarpanı UYGULANMAZ. Çarpan kazanılan ödülleri büyütmek için var,
      // satın alınan miktarı değil — aksi hâlde aynı paranın karşılığı
      // aboneye farklı olurdu ve mağazadaki sayı yalan söylerdi.
      DiamondSystem.add(pkg.amount + pkg.bonus, t('purchase_done'));
      renderShop();
    });
  });
}

function watchAdForDiamonds() {
  const amount = EconomyConfig.AD_DIAMOND_REWARD;
  const ok = runRewardedAction(
    { icon: '💎', text: t('shop_free_ad_note', { amount }) },
    () => DiamondSystem.addReward(amount, t('ad_reward_toast'))
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
  // Ana sekmedeki özet kartlar görev/rozet/seri sayaçlarını okuyor;
  // oyundan dönen oyuncu buraya düşüyor, dolayısıyla kartlar da
  // tazelenmeli — yoksa görev satırı ilerlerken üstündeki "Aktif Görev"
  // kartı eski sayıyı gösterirdi (aynı gerçeğin iki farklı hikâyesi).
  if (tabName === 'home') { DailyQuests.refresh(); renderHomeStats(); renderHomePromo(); }
  if (tabName === 'lider') renderProgress();
  if (tabName === 'profil') { renderSettings(); renderFavorites(); renderShowcase(); renderProfileHero(); }
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
  showToast(t('nav_back_exit'));
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

// ── OYUNCU SEVİYESİ ─────────────────────────────────────────────
// UYDURULMUŞ bir sayı DEĞİL. Referans tasarımdaki "Seviye" kartını
// karşılamak için iki yol vardı: sabit bir placeholder yazmak (bu
// dosyadaki TODO'ların yaptığı şey) ya da mevcut gerçek bir sayaçtan
// türetmek. İkincisi seçildi çünkü kaynak zaten var: GameEvents
// `totalGamesWon` tutuyor ve o sayı "ne kadar ilerledin"in en dürüst
// karşılığı. Yeni bir depolama anahtarı YAZILMADI — aynı gerçeğin
// ikinci kaydı olurdu (DailyQuests'in üçüncü göreviyle aynı gerekçe).
//
// Eğri bilerek DÜZ: her WINS_PER_LEVEL kazanım bir seviye. Artan bir
// eğri (her seviye daha çok kazanım ister) daha "oyunumsu" olurdu ama
// dengelenmesi gereken bir sayı daha demek; ekonomi kararları sahibinin
// (CLAUDE.md §7) ve böyle bir talep yok.
const PlayerLevel = {
  WINS_PER_LEVEL: 5,
  get() {
    let won = 0;
    // GameEvents app.js içinde tanımlı ama harness'ler bu dosyayı
    // parça parça yükleyebiliyor; okuma hiçbir ekranı düşürmemeli.
    try { won = (GameEvents.stats().totalGamesWon) || 0; } catch (e) { won = 0; }
    const per = this.WINS_PER_LEVEL;
    return { level: Math.floor(won / per) + 1, into: won % per, need: per, won: won };
  },
};

function renderHome() {
  if (typeof renderDailyChallenge === 'function') renderDailyChallenge();
  renderHomeStats();
  renderDailyRewards();
  renderFavorites();
  renderMissions();
  renderHomePromo();
}

// ── Özet kartlar ────────────────────────────────────────────────
// Dördü de GERÇEK veriden geliyor: rozet sayacı, günlük görevler, seri
// ve türetilmiş seviye. Referans görseldeki dört kartın karşılığı, ama
// hiçbirinin altında sahte bir sayı yok.
function renderHomeStats() {
  const el = document.getElementById('home-stats');
  if (!el) return;

  const badgeN = Badges.count(), badgeT = Badges.total();
  const quests = DailyQuests.rows();
  const questDone = quests.filter(q => q.done).length;
  const streak = StreakSystem.getCount();
  const lv = PlayerLevel.get();

  const cards = [
    { tone:'violet', icon:'🛡️', label:t('home_stat_badges'),
      value: badgeN + '<small> / ' + badgeT + '</small>',
      pct: badgeT ? (badgeN / badgeT) * 100 : 0,
      onclick: "switchTab('lider')" },
    { tone:'gold', icon:'🎯', label:t('home_stat_quest'),
      value: t('home_stat_quest_active', { n: quests.length - questDone }),
      pct: quests.length ? (questDone / quests.length) * 100 : 0 },
    // Seri kartı #hdr-streak'i TAŞIYOR: updateStreakUI() o id'yi arıyor
    // ve ödül alındığı an sayıyı tazeliyor. Element başka bir yere
    // taşınırsa o tazeleme sessizce ölür.
    { tone:'green', icon:'🔥', label:t('home_stat_streak'),
      value: '<span id="hdr-streak">' + streak + '</span><small> ' + t('common_day_short') + '</small>',
      // Haftanın kaçı tamamlandı: 7 günlük satırla aynı ölçek.
      pct: Math.min(100, (streak % 7 || (streak ? 7 : 0)) / 7 * 100) },
    { tone:'cyan', icon:'📈', label:t('home_stat_level'),
      value: String(lv.level),
      pct: (lv.into / lv.need) * 100 },
  ];

  el.innerHTML = cards.map((c, i) => `
    <div class="sly-stat sly-t-${c.tone} sly-in" style="animation-delay:${i * 55}ms"
         ${c.onclick ? 'onclick="' + c.onclick + '"' : ''}>
      <div class="sly-stat-top">
        <span class="sly-stat-ico">${c.icon}</span>
        <span class="sly-stat-txt">
          <span class="sly-stat-lbl">${c.label}</span>
          <span class="sly-stat-val">${c.value}</span>
        </span>
      </div>
      <div class="sly-bar"><div class="sly-bar-fill" style="width:${Math.max(0, Math.min(100, c.pct))}%"></div></div>
    </div>
  `).join('');
}

// ── Alt promo satırı ────────────────────────────────────────────
// Solda son kazanılan rozet (GERÇEK — Badges.recent), sağda Plus.
// Hiç rozet yoksa sol hücre "ilk rozetini kazan" diyor: boş bir kutu
// göstermek yerine bir sonraki adımı öneriyor.
function renderHomePromo() {
  const el = document.getElementById('home-promo');
  if (!el) return;
  const last = Badges.recent(1)[0] || null;

  const leftIcon = last ? last.icon : '🎖️';
  const leftTone = last ? slyTone(last.tone) : 'violet';
  const leftKicker = last ? t('badges_last_earned') : t('badges_none_yet');
  const leftTitle = last ? t(last.nameKey) : t('badges_first_title');
  const leftNote = last ? _agoText(last.earnedAt) : t('badges_first_desc');

  el.innerHTML = `
    <div class="sly-promo-cell sly-t-${leftTone}" onclick="switchTab('lider')">
      <span class="sly-promo-ico sly-stat-ico">${leftIcon}</span>
      <span class="sly-promo-txt">
        <span class="sly-promo-kicker">${leftKicker}</span>
        <span class="sly-promo-title">${leftTitle}</span>
        <span class="sly-promo-note">${leftNote}</span>
      </span>
    </div>
    <!-- Chevron YOK: hücrenin tamamı zaten tıklanabilir ve ok, başlığın
         tek satırda durması için gereken ~25px'i yiyordu. -->
    <div class="sly-promo-cell is-plus" onclick="showPlusPage()">
      <span class="sly-promo-ico">👑</span>
      <span class="sly-promo-txt">
        <span class="sly-promo-title">${t('home_promo_plus_title')}</span>
        <span class="sly-promo-note">${t('home_promo_plus_desc')}</span>
      </span>
    </div>
  `;
}

// "1 gün önce kazandın" gibi bir ifade. Tam saat göstermek bu bağlamda
// bilgi değil gürültü; gün çözünürlüğü yeterli.
function _agoText(ts) {
  if (!ts) return t('common_earned');
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return t('badges_earned_today');
  // tp(): çoğul kategorisini Intl.PluralRules seçiyor. Türkçe'de tek biçim
  // var, ama Rusça'da üç (1/2-4/5+) ve Arapça'da altı — elle "1 ise şu,
  // değilse bu" yazmak o dillerde yanlış olurdu.
  return tp('badges_earned_days_ago', days);
}

// Haftalık seri kartındaki "Nasıl Çalışır?" bağlantısı. Ayrı bir ekran
// açmıyor: anlatılacak şey iki cümle ve bir ekran geçişi o iki cümleden
// pahalı olurdu.
function showStreakInfo() {
  showToast(t('home_streak_info'));
}

function renderDailyRewards() {
  const container = document.getElementById('daily-rewards');
  // Ödül alındı mı — SERİDEN AYRI kayıt (bkz. rewardClaimedToday).
  // Eskiden `lastDate === today` okunuyordu; seri açılışta ilerlemeye
  // başlayınca bu, uygulama açılır açılmaz "ödül alındı" demek olurdu.
  const alreadyClaimed = StreakSystem.rewardClaimedToday();
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
    // Bugün ve ödül henüz alınmadıysa daire TIKLANABİLİR ve nabız atıyor —
    // ekranda "şu an yapılabilecek bir şey" olduğunu söyleyen tek işaret.
    const claimable = !alreadyClaimed && isToday;

    // İŞARET TEK KURALDAN: girilen gün ★, girilmeyen gün BOŞ.
    // Eskiden üç ayrı işaret vardı (✓ alınmış, ★ bugün, gün numarası
    // gelecek) ve "gün numarası" girilmemiş bir günü DOLU gösteriyordu —
    // yani satır, girilmeyen günleri de bir şey olmuş gibi çiziyordu.
    // Artık tek soru var: o gün girildi mi?
    const mark = done ? '★' : '';

    // Sınıf sırası önemli: bugün girilmiş olsa bile (açılışta checkIn
    // çalıştığı için neredeyse her zaman öyle) menekşe "bugün" vurgusunu
    // almalı, geçmiş günlerin yeşilini değil.
    let cls = 'sly-day';
    if (isToday)    cls += ' is-today';
    else if (done)  cls += ' is-done';
    else            cls += ' is-future';
    if (claimable) cls += ' is-claimable';

    return `<div class="${cls}">
      <div class="sly-day-dot" ${claimable ? 'onclick="claimDailyReward()"' : ''}>${mark}</div>
      <span class="sly-day-lbl">${t(DAY_KEYS[i])}</span>
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
      // rg.name YOK (2026-08-15: adlar locales/'e taşındı) — çeviri
      // tablosundan okunuyor. Eskisi title="undefined" üretiyordu.
      if (rg) return { id:rg.id, name:t('game_name_' + rg.id), emoji:rg.emoji, gradient:rg.gradient };
    }
    return null;
  }).filter(Boolean);
  
  const emptyHTML = `
    <div style="text-align:center;padding:14px 12px;color:#9a9ab0;font-size:13px;">
      <span style="font-size:20px;">💫</span>
      <div style="margin-top:4px;">${t('home_no_favorites')}</div>
      <div style="margin-top:4px;color:#c084fc;font-size:12px;cursor:pointer" onclick="switchTab('discover')">
        ${t('home_favorites_cta')}
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
      ? '<p class="pf-fav-empty" onclick="switchTab(\'discover\')">' + t('home_favorites_empty_cta') + '</p>'
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
    '<span class="pf-badge bdg-' + b.tone + '" title="' + t(b.nameKey) + '">' + b.icon + '</span>'
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

// Görev satırı — ana sayfa ve Rozetler ekranı AYNI işleyiciyi kullanıyor.
// İkinci bir kopya, ödül rozetinin bir ekranda güncellenip diğerinde
// kalmasının en kısa yolu olurdu.
function renderMissionList(containerId, missions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = missions.map((m, i) => `
    <div class="sly-task sly-t-${slyTone(m.tone)} ${m.done ? 'is-done' : ''} sly-in"
         style="animation-delay:${i * 60}ms">
      <span class="sly-task-ico">${m.icon}</span>
      <div class="sly-task-body">
        <div class="sly-task-line">
          <span class="sly-task-name">${m.name}</span>
          <span class="sly-task-count">${m.progress} / ${m.total}${
            m.done ? '<span class="sly-task-tick">✓</span>' : ''}</span>
        </div>
        <div class="sly-bar"><div class="sly-bar-fill" style="width:${(m.progress / m.total) * 100}%"></div></div>
      </div>
      <span class="sly-task-reward">
        <span class="sly-task-reward-ico">💎</span>${m.reward}
      </span>
    </div>
  `).join('');
}

// ARTIK ÇAĞRILMIYOR. Haftalık ödül sandığı ana sayfadan kaldırıldı
// (sahibinin isteği, 2026-08-10) — haftalık seri kartı yalnızca günleri
// gösteriyor. Fonksiyon renderLeaderboard() ile aynı gerekçeyle duruyor:
// haftalık ödülün geri gelip gelmeyeceği bir ürün kararı ve geri dönüşün
// ucuz kalması isteniyor. WEEKLY_MISSIONS dizisi de aynı sebeple yerinde.
function claimWeeklyReward() {
  showToast(t('home_weekly_reward_soon'));
}

// ==================== RENDER: ROZETLER ====================
//
// 2026-08-10: bu ekran "İlerleme"den "Rozetler"e dönüştü ve mockup'tan
// kalan STATİK değerlerin tamamı kaldırıldı. Artık ekrandaki her sayı
// gerçek bir sayaçtan geliyor:
//   • rozet ilerlemesi  → Badges.count()/total()
//   • oynanan/kazanılan → GameEvents.stats()
//   • seri              → StreakSystem
//   • seviye            → PlayerLevel (totalGamesWon'dan türetilmiş)
// Kaldırılan placeholder'lar: "Oyun Denedi 10/10" (gh_plays_* yalnızca
// Keşfet'ten artıyor, yani toplam yanlıştı) ve "Koleksiyon %72" (böyle
// bir sistem yok). ACHIEVEMENT_CARDS de artık çizilmiyor — üç oyunun
// uydurma başarım çubuklarıydı. Dizi renderLeaderboard() ile aynı
// gerekçeyle duruyor: oyun-özel rozetler kurulunca tüketilecek kaynak o.
//
// ESKİ BAŞLIK: RENDER: İLERLEME
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

// Seçili koleksiyon çipi. Ekran her yeniden çizildiğinde (rozet
// kazanıldığında Badges.updateUI() çağırıyor) seçim korunmalı, bu yüzden
// render fonksiyonunun dışında.
let _badgeFilter = 'all';

function setBadgeFilter(id) {
  _badgeFilter = id;
  if (typeof GameAudio !== 'undefined') { GameAudio.play('tab'); GameAudio.haptic('micro'); }
  renderProgress();
}

function renderProgress() {
  const container = document.getElementById('progress-content');
  if (!container) return;

  const earnedIds = new Set(Badges.getData().earned.map(e => e.id));
  const n = Badges.count(), total = Badges.total();
  const pct = total ? Math.round((n / total) * 100) : 0;
  const stats = (function () {
    try { return GameEvents.stats(); } catch (e) { return { totalGamesStarted:0, totalGamesWon:0 }; }
  })();
  const lv = PlayerLevel.get();
  const streak = StreakSystem.getCount();

  // ── Özet kartlar: ana sayfayla AYNI bileşen (.sly-stat). Aynı bilginin
  // iki ekranda farklı görünmesi, tasarım sisteminin ilk kaybettiği yer.
  const tiles = [
    { tone:'blue',   icon:'🎮', label:t('stat_games_played'), value:String(stats.totalGamesStarted || 0) },
    { tone:'green',  icon:'🏆', label:t('stat_games_won'),   value:String(stats.totalGamesWon || 0) },
    { tone:'gold',   icon:'🔥', label:t('home_stat_streak'),        value:streak + '<small> ' + t('common_day_short') + '</small>' },
    { tone:'cyan',   icon:'📈', label:t('home_stat_level'),      value:String(lv.level) },
  ];
  const tilesHTML = tiles.map((t, i) => `
    <div class="sly-stat sly-t-${t.tone} sly-in" style="animation-delay:${i*50}ms">
      <div class="sly-stat-top">
        <span class="sly-stat-ico">${t.icon}</span>
        <span class="sly-stat-txt">
          <span class="sly-stat-lbl">${t.label}</span>
          <span class="sly-stat-val">${t.value}</span>
        </span>
      </div>
    </div>
  `).join('');

  // ── Koleksiyon çipleri. Sayılar BADGES'ten sayılıyor, elle yazılmıyor —
  // yeni bir rozet eklemek burada hiçbir şeye dokunmayı gerektirmiyor.
  const chipsHTML = BADGE_GROUPS.map(g => {
    const list = g.id === 'all' ? BADGES : BADGES.filter(b => b.group === g.id);
    const got = list.filter(b => earnedIds.has(b.id)).length;
    return `<button class="sly-chip ${_badgeFilter === g.id ? 'on' : ''}"
              onclick="setBadgeFilter('${g.id}')">${t(g.labelKey)}
              <span class="sly-chip-n">${got}/${list.length}</span></button>`;
  }).join('');

  // ── Rozet kartları. Kilitli olanlar GİZLENMİYOR: boş bir ızgara
  // "burada bir şey yok" der, soluk madalyonlar "kazanılacak dört şey
  // daha var" der. Aynı gerekçe boş favori çipinde de yazılı.
  const shown = _badgeFilter === 'all' ? BADGES : BADGES.filter(b => b.group === _badgeFilter);
  const badgesHTML = shown.map((b, i) => {
    const got = earnedIds.has(b.id);
    return `
    <div class="sly-badge-card sly-t-${slyTone(b.tone)} ${got ? 'is-earned' : ''} sly-in"
         style="animation-delay:${i*55}ms">
      <span class="sly-badge-medal">${b.icon}</span>
      <span class="sly-badge-name">${t(b.nameKey)}</span>
      <span class="sly-badge-desc">${t(b.descKey)}</span>
      <span class="sly-badge-foot">${got ? t('common_earned') : '+' + b.reward + '💎'}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="sly-screen-head">
      <h2 class="sly-screen-title">${t('badges_screen_title')}
        <span class="sly-screen-sub">${t('badges_screen_sub')}</span>
      </h2>
    </div>

    <div class="sly-ring-card">
      <div class="sly-ring" style="--sly-ring-pct:${pct}">
        <span class="sly-ring-txt">
          <span class="sly-ring-n">${n}</span>
          <span class="sly-ring-of">/ ${total}</span>
        </span>
      </div>
      <div class="sly-ring-body">
        <span class="sly-ring-title">${t('badges_collection_pct', { pct })}</span>
        <span class="sly-ring-desc">${
          n >= total ? t('badges_all_done_title') : t('badges_all_done_desc')
        }</span>
        <div class="sly-ring-meta">
          <span class="sly-pill is-gold">${t('badges_total_reward', { amount: Badges.totalReward() })}</span>
        </div>
      </div>
    </div>

    <div class="sly-stats">${tilesHTML}</div>

    <!-- Görevler burada da var, çünkü ana sayfadaki "Tümünü Gör"
         buraya geliyor ve rozetlerin çoğu görev tamamlayarak açılıyor. -->
    <section class="sly-panel">
      <div class="sly-panel-head">
        <span class="sly-panel-title">
          <span class="sly-panel-title-ico">📋</span>${t('shop_free_quests')}
        </span>
        <span class="sly-panel-link sly-muted">${DailyQuests.doneCount()}/${DailyQuests.rows().length}</span>
      </div>
      <div class="sly-tasks" id="progress-missions"></div>
    </section>

    <h3 class="sly-group-title">${t('badges_collections')}</h3>
    <div class="sly-chips">${chipsHTML}</div>
    <div class="sly-badge-grid">${badgesHTML}</div>
  `;

  // Görev satırları ana sayfayla AYNI fonksiyondan; kapsayıcı yukarıda
  // innerHTML ile yeni oluşturuldu, o yüzden sonra dolduruluyor.
  renderMissionList('progress-missions', DailyQuests.rows());
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

// Ses anahtarı. GameAudio.toggleMute() zaten kalıcı (gh_muted) — burada
// yapılan tek şey satırı yeniden çizmek, çünkü anahtarın görünümü
// durumdan türüyor. Oyun içi 🔊 düğmesiyle AYNI kaynağı kullanıyor;
// ikinci bir "ses açık mı" kaydı tutulsaydı ikisi ayrışırdı.
function toggleSoundSetting() {
  GameAudio.toggleMute();
  if (!GameAudio.muted) GameAudio.play('tab');
  renderSettings();
}

function renderSettings() {
  const container = document.getElementById('settings-list');
  if (!container) return;

  // Gizlilik Seçenekleri satırı KOŞULLU: AB'de kullanıcının rızasını
  // sonradan değiştirebilmesi zorunlu, kapsam dışı bölgede ise böyle bir
  // satır göstermek anlamsız (ve Google formu da açılmaz). Kararı biz
  // vermiyoruz — privacyOptionsRequirementStatus veriyor.
  // `hidden` satırlar ÇİZİLMİYOR. Tanımları duruyor (bkz. SETTING_GROUPS)
  // — hazır olmayan bir özelliği release'te "Yakında" diye göstermektense
  // hiç göstermemek, tutulmayacak bir söz vermemek demek.
  const groups = SETTING_GROUPS
    .map(g => ({ titleKey: g.titleKey, rows: g.rows.filter(r => !r.hidden) }))
    .filter(g => g.rows.length);
  if (typeof AdConsent !== 'undefined' && AdConsent.privacyOptionsRequired()) {
    groups.push({ titleKey:'settings_group_privacy', rows: [
      { icon:'🔒', labelKey:'settings_privacy_options',
        noteKey:'settings_privacy_options_note',
        fn:'AdConsent.showPrivacyOptions()' },
    ]});
  }

  let idx = 0;
  container.innerHTML = groups.map(g => {
    const rowsHTML = g.rows.map(s => {
      const delay = (idx++) * 32;
      const tone = s.tone === 'gold' ? ' is-gold' : (s.tone === 'accent' ? ' is-accent' : '');

      // Sağ uç: anahtar > değer > ok. Üçü birden gösterilmiyor —
      // bir satırda tek bir "burada ne olur" işareti olmalı.
      // Metinler ÇAĞRI ANINDA çözülüyor. `value` düz bir dize de olabilir
      // (sürüm numarası) bir fonksiyon da (seçili dilin adı) — ikincisi
      // aynı gerekçeyle: değer dil değiştiğinde farklı olmalı.
      const label = s.labelKey ? t(s.labelKey) : s.label;
      const note  = s.noteKey  ? t(s.noteKey)  : s.note;
      let value   = s.valueKey ? t(s.valueKey) : s.value;
      if (typeof value === 'function') { try { value = value(); } catch (e) { value = ''; } }

      let right;
      if (s.toggle) {
        // Durum ÇALIŞMA ZAMANINDA okunuyor (tanımdaki `state` bir
        // fonksiyon). Bir ayarın kaynağı patlarsa satır kapalı görünsün,
        // ekranın tamamı düşmesin.
        let on = false;
        try { on = !!s.state(); } catch (e) { on = false; }
        right = `<span class="sly-switch ${on ? 'on' : ''}"></span>`;
      } else if (value) {
        right = `<span class="sly-row-value">${value}</span>`;
      } else {
        right = '<span class="sly-row-chev">›</span>';
      }

      // fn varsa doğrudan çalıştırılır; yoksa action toast olarak gösterilir.
      const actionText = s.actionKey ? t(s.actionKey) : s.action;
      const act = s.fn ? s.fn : `showToast('${String(actionText).replace(/'/g, "\\'")}')`;
      return `
      <button class="sly-row${tone} sly-in" style="animation-delay:${delay}ms" onclick="${act}">
        <span class="sly-row-ico">${s.icon}</span>
        <span class="sly-row-body">
          <span class="sly-row-label">${label}</span>
          ${note ? `<span class="sly-row-note">${note}</span>` : ''}
        </span>
        ${right}
      </button>`;
    }).join('');

    return `<div class="sly-group">
      <h3 class="sly-group-title">${t(g.titleKey)}</h3>
      <div class="sly-list">${rowsHTML}</div>
    </div>`;
  }).join('');
}

// Profil başlığındaki durum çipleri — üçü de gerçek veriden.
// Plus çipi yalnızca aboneyken çıkıyor: "Plus değilsin" demek için bir
// çip harcamak, o alanı bilgiden çok reklama çevirirdi (Plus'a giden
// satır zaten hemen aşağıda).
function renderProfileHero() {
  const el = document.getElementById('pf-tags');
  if (!el) return;
  const lv = PlayerLevel.get();
  const tags = [
    { cls:'', txt: '📈 ' + t('common_level_n', { n: lv.level }) },
    { cls:'', txt: '🔥 ' + t('profile_pill_streak', { n: StreakSystem.getCount() }) },
    { cls:'', txt: '🛡️ ' + t('profile_pill_badges', { n: Badges.count(), total: Badges.total() }) },
  ];
  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    tags.push({ cls:' is-gold', txt:'👑 PLUS' });
  }
  el.innerHTML = tags.map(t => `<span class="sly-pill${t.cls}">${t.txt}</span>`).join('');
}

// renderFavorites() zaten yukarıda tek bir fonksiyon olarak tanımlandı
// Hem anasayfa hem profil container'ı aynı anda dolduruyor

// ==================== OYUN MOTORU ====================

// KAYITLI OYUN ID'LERİ — kabuğun "bu oyun oynanabilir" listesi.
//
// 2026-08-15'e kadar bu bir SÖZLÜKTÜ ve anahtarı oyunun TÜRKÇE GÖRÜNEN
// ADIYDI ({'Kelime Avı': 'wordSearch'}), playGame() de o adla çağrılıyordu.
// Yerelleştirmeyle birlikte bu artık çalışamaz: görünen ad dile göre
// değişiyor, yani bir Alman oyuncuda "Word Hunt" hiçbir anahtarla
// eşleşmez ve oyun "yakında!" diyerek açılmazdı.
//
// GENEL KURAL: görünen metin KİMLİK OLARAK KULLANILAMAZ. Ad artık
// yalnızca bir sunum değeri (t('game_name_' + id)); kimlik id'dir.
const GAME_IDS = [
  'game2048',
  'memoryGame',
  'wordSearch',
  'sudoku',
  'blockPuzzle',
  'waterSort',
  'arrowPuzzle',
  // Faz 3 bitti: tema hazır, oyun Keşfet ve ana ekranda AÇIK.
  'jigsawCard',
  'snakeGame',
  'flappyUfo',
  // 2026-08-09: oyun gerçekten yazıldı. Öncesinde yalnızca Keşfet'te bir
  // kart animasyonu vardı ve burada hiç kayıtlı değildi.
  'flowConnect',
];

/** Oyunun o anki dildeki görünen adı. Tek kaynak: locale tablosu. */
function gameName(id) {
  return (typeof t === 'function') ? t('game_name_' + id) : id;
}

let _currentGameId = null;
let _currentGameOpts = null;
let _beforeGameScreen = null;

// GERİYE DÖNÜK AD: playGame artık zaten id alıyor, yani bu ince bir
// takma ad. Silinmedi çünkü index.html ve app.js içindeki onclick
// dizgelerinde adıyla geçiyor; ikisini aynı anda değiştirmenin bir
// kazancı yok.
function playGameById(gameId, opts) {
  playGame(gameId, opts);
}

// opts oyuna AYNEN geçer (örn. { daily, seed, difficulty }).
// Yeniden başlatmada da korunur — aksi hâlde günlük bulmacada "Tekrar
// Oyna" oyuncuyu rastgele bir tahtaya düşürürdü.
function playGame(gameId, opts) {
  if (GAME_IDS.indexOf(gameId) === -1 || typeof PuzzleGames === 'undefined' || !PuzzleGames[gameId]) {
    showToast(t('game_soon', { name: gameName(gameId) }));
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
  document.getElementById('game-title').textContent = gameName(gameId);
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
  if (win) DiamondSystem.add(EconomyConfig.LEVEL_COMPLETE_REWARD, t('game_level_done'));

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

  // Reklamın olmadığı platformda (iOS) reklam satırları GİZLENİYOR,
  // pasifleştirilmiyor. Bu, bu dosyada zaten kayıtlı olan kuralın aynısı:
  // tıklanabilir "Yakında" ayar satırları sürüm arayüzünden tam da build'in
  // tutamayacağı bir söz verdikleri için kaldırılmıştı. Soluk bir "reklam
  // izle" düğmesi de aynı şeyi yapardı — üstelik burada "yarın gel" bile
  // demiyor, çünkü yarın da olmayacak.
  //
  // Plus'lı oyuncuda GİZLENMİYOR: onun düğmesi zaten reklam düğmesi değil,
  // "anında devam" düğmesi ve reklam yokluğundan etkilenmiyor.
  const adsOff = !plus && !adsSupported();

  // Devam — reklam satırı. Premium'da reklam yok: düğme "anında devam"
  // düğmesine dönüşüyor (bkz. continueWithAd).
  const contAd = document.getElementById('go-continue-ad');
  if (contAd) contAd.style.display = adsOff ? 'none' : '';
  if (adsOff) {
    // Düğme gizli; etiketini yazmanın anlamı yok.
  } else if (plus) {
    setBtn(contAd, '👑', t('go_continue_plus'), true);
  } else if (RewardedAd._pending) {
    // Reklam yolda. Bunu SÖYLEMEK zorundayız: ölçülen yükleme süresi ilk
    // seferde ~6.5 saniye ve o boyunca düğme hiçbir şey yapmıyormuş gibi
    // görünüyordu — oyuncunun üst üste basmasının sebebi buydu. Kalkan
    // artık fazladan reklam açılmasını engelliyor, ama sessiz kalmak
    // "bozuk" hissini tek başına ortadan kaldırmıyor.
    setBtn(contAd, '⏳', t('ad_loading'), false);
  } else {
    // Günlük hak SAYISI ARTIK YAZMIYOR ve düğme bütçe yüzünden PASİFLEŞMİYOR:
    // devam etmek 2026-08-07'den beri günlük hakka işlemiyor (bkz.
    // runRewardedAction). Sayıyı burada göstermeye devam etmek, oyuncuya
    // artık geçerli olmayan bir sınırı vaat etmek olurdu — ve daha kötüsü,
    // sayı sıfırlandığında çalışan bir düğmeyi "bitti" diye kapatırdı.
    setBtn(contAd, '📺', t('go_continue_ad'), true);
  }

  // Devam — elmas satırı. Premium'da GİZLİ: ücretsiz devam varken elmas
  // istemek oyuncuyu cezalandırmak olur.
  const diamondBtn = document.querySelector('.go-btn-diamond');
  if (diamondBtn) {
    const hide = _gameOverNoDiamond || plus;
    diamondBtn.style.display = hide ? 'none' : '';
    if (!hide) {
      const cost = _gameOverContinueCost;
      setBtn(diamondBtn, '💎', t('go_continue_diamonds', { cost }), DiamondSystem.canAfford(cost));
    }
  }

  // Skor 2x — yalnızca reklam. Elmas alternatifi bilerek YOK.
  //
  // Bunun sonucu: reklamsız platformda skor 2x TAMAMEN kaybolur, devam ve
  // ipucu gibi elmas yolu olan yüzeylerin aksine. Bu, "skor satın alınmaz"
  // kararının doğrudan bedeli ve bilerek kabul edildi — 2x'e elmas yolu
  // açmak, iOS'u bahane ederek o kararı sessizce geri almak olurdu.
  const dbl = document.getElementById('go-double');
  if (dbl) dbl.style.display = adsOff ? 'none' : '';
  if (adsOff) {
    // Gizli.
  } else if (plus) {
    setBtn(dbl, '👑', t('go_double_plus'), true);
  } else {
    // Devam düğmesiyle aynı gerekçe: skor 2x günlük hakka işlemiyor.
    setBtn(dbl, '📺', t('go_double_ad'), true);
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
  runRewardedAction({ icon: '🔄', text: t('go_continue_title') }, () => {
    if (!_runGameOverContinuation('ad')) showToast(t('go_continuing'));
  }, { skipDailyLimit: true });
}

function continueWithDiamonds() {
  // Premium'da bu düğme hiç görünmüyor (refreshGameOverOffers), ama
  // ücretsiz devam hakkı varken elmas harcamak her hâlükârda yanlış.
  if (typeof PlusSystem !== 'undefined' && PlusSystem.isActive()) {
    if (!_runGameOverContinuation('plus')) showToast(t('go_continue_free_plus'));
    return;
  }
  const cost = _gameOverContinueCost;
  if (DiamondSystem.spend(cost)) {
    if (!_runGameOverContinuation('diamond')) showToast(t('go_continue_spent', { cost }));
  }
}

// Elmas alternatifi BİLEREK yok: elmasla skor satın almak oyunun anlamını
// bozar — skor kazanılır. Ekonominin tek istisnası, gözden kaçırma değil.
function doubleScoreWithAd() {
  runRewardedAction(
    { icon: '2️⃣', text: t('go_double_title') },
    () => {
      const scoreEl = document.getElementById('game-score');
      const current = parseInt(scoreEl.textContent.replace(/,/g, '')) || 0;
      scoreEl.textContent = (current * 2).toLocaleString();
      showToast(t('go_double_done'));
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
  const pick = GAME_IDS[Math.floor(Math.random() * GAME_IDS.length)];
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
  // GİRİŞ SERİSİ — uygulamayı açmak serinin TANIMI. Ekranlar
  // çizilmeden ÖNCE çalışmalı, yoksa bugünün yıldızı ve seri sayısı
  // bir açılış geriden gelirdi. Aynı gün tekrar açılışta hiçbir şey
  // yapmaz (lastDate === today).
  StreakSystem.checkIn();
  renderHome();
  // renderLeaderboard() değil: 'lider' sekmesi artık İlerleme ekranını
  // gösteriyor. Eskisi açılışta GİZLİ kapsayıcılara boşuna çiziyordu.
  renderProgress();
  renderSettings();
  renderFavorites();
  renderShowcase();
  renderProfileHero();
  // renderHomeStats() içindeki #hdr-streak elemanını YAZDIKTAN sonra
  // çalışmalı — renderHome() zaten yukarıda çağrıldı, sıra doğru.
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

  // ───── DİL DEĞİŞİMİ ─────
  // YENİDEN BAŞLATMA GEREKMİYOR, çünkü uygulama zaten imperatif innerHTML
  // yeniden çizimi kullanıyor: her ekranın bir render fonksiyonu var ve
  // hepsi metni t()'den okuyor. Yapılacak tek şey onları yeniden çağırmak.
  //
  // I18n.applyDom() statik index.html metinlerini zaten yazdı; burada
  // JS'in ÜRETTİĞİ ekranlar tazeleniyor. Hepsini birden çizmek maliyetli
  // değil (dil yılda birkaç kez değişir) ve seçmeli çizmek "profil
  // güncellendi ama ana sayfa Türkçe kaldı" hatasını davet ederdi.
  //
  // OYUN STATE'İNE DOKUNULMUYOR: aktif oyunun içi yeniden kurulmuyor,
  // yalnızca başlığı güncelleniyor. Bir arcade turunun ortasında dili
  // değiştirmek skoru sıfırlamamalı (Kelime Avı'nın tahta tazelemesi
  // ayrı bir iş — içeriği gerçekten dile bağlı olan tek oyun o).
  if (typeof I18n !== 'undefined') {
    I18n.onChange(function () {
      try {
        renderSettings();
        renderProfileHero();
        renderFavorites();
        renderShowcase();
        renderHomeStats();
        renderMissions();
        renderDailyRewards();
        renderHomePromo();
        if (typeof renderProgress === 'function') renderProgress();
        if (typeof renderDailyChallenge === 'function') renderDailyChallenge();
        // Keşfet akışı kart metinlerini kuruluşta yazıyor; yeniden kurmak
        // yerine yeniden çizmek gerekiyor. cleanup+init idempotent.
        if (window.ReelsEngine && currentScreen === 'screen-discover') {
          ReelsEngine.cleanup(); ReelsEngine.init();
        }
        // Açık bir oyun varsa yalnızca BAŞLIĞI tazele.
        if (_currentGameId) {
          const el = document.getElementById('game-title');
          if (el) el.textContent = gameName(_currentGameId);
          // TEK İSTİSNA: Kelime Avı'nın İÇERİĞİ dile bağlı. Tahtada
          // eski dilin kelimeleri duruyor ve onları yeni dile
          // eşleştirmenin anlamlı bir yolu yok (şartname de bunu
          // yasaklıyor). Oyun kendi `onLocaleChange`'ini sunuyorsa
          // çağrılıyor: SEVİYE ve SKOR korunur, yalnızca tahta yenilenir.
          const g = PuzzleGames[_currentGameId];
          if (g && typeof g.onLocaleChange === 'function') {
            try { g.onLocaleChange(); } catch (e) { console.warn('[i18n] tahta tazelenemedi', e); }
          }
        }
      } catch (e) { console.warn('[i18n] yeniden çizim hatası', e); }
    });
  }

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


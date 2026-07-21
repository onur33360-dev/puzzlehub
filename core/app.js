/* ============================================
   GameHup — Uygulama Mantığı
   ============================================ */

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

const DAILY_MISSIONS = [
  { icon:'🎮', name:'3 Oyun Oyna', desc:'Herhangi 3 oyun bitir', progress:2, total:3, reward:'+50' },
  { icon:'🏆', name:'1 Oyun Kazan', desc:'Bir oyunda birinci ol', progress:0, total:1, reward:'+30' },
  { icon:'⏱️', name:'10 dk Oyna', desc:'Toplam 10 dakika oyna', progress:7, total:10, reward:'+40' },
  { icon:'🎲', name:'Rastgele Oyna', desc:'Rastgele oyun denemesi', progress:0, total:1, reward:'+20' },
];

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

const SETTINGS = [
  { icon:'🔔', label:'Bildirimler', action:'Bildirimler yakında!' },
  { icon:'🔊', label:'Ses Ayarları', action:'Ses ayarları yakında!' },
  { icon:'🎨', label:'Tema', action:'Tema ayarları yakında!' },
  { icon:'🌐', label:'Dil', action:'Dil: Türkçe' },
  { icon:'📊', label:'İstatistikler', action:'İstatistikler yakında!' },
  { icon:'⭐', label:'Puanla', action:'Uygulama puanlama yakında!' },
  { icon:'📤', label:'Paylaş', action:'Paylaşım yakında!' },
  { icon:'ℹ️', label:'Hakkında', action:'GameHup v1.0.0 — İskelet sürümü' },
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
    this.saveData(data);
    return true;
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
  DiamondSystem.add(reward.amount, 'Günlük ödül!');
  
  // Streak milestones
  const streak = StreakSystem.getCount();
  if (streak === 7) DiamondSystem.add(50, '7 gün streak bonusu! 🔥');
  if (streak === 14) DiamondSystem.add(100, '14 gün streak! 🎉');
  if (streak === 30) DiamondSystem.add(200, '30 gün streak! 👑');
  
  renderDailyRewards();
}

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
  
  // Quick reward ad — earn diamonds
  showForDiamonds(amount) {
    this.show(
      { icon: '💎', text: `${amount} Elmas Kazan!` },
      () => DiamondSystem.add(amount, 'Reklam ödülü!')
    );
  },
  
  // Continue game ad
  showForContinue(onContinue) {
    this.show(
      { icon: '🔄', text: 'Devam Et!' },
      onContinue
    );
  }
};

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

const FREE_DIAMOND_SOURCES = [
  { icon: '📺', title: 'Reklam İzle', desc: 'Günde 5 kez', reward: '+10💎', action: 'watchAdForDiamonds' },
  { icon: '🎯', title: 'Günlük Görevler', desc: '3 görev tamamla', reward: '+45💎', action: 'goToHome' },
  { icon: '📅', title: 'Günlük Ödül', desc: 'Her gün giriş yap', reward: '+5-100💎', action: 'goToHome' },
  { icon: '🏆', title: 'Başarımlar', desc: 'Hedefleri tamamla', reward: '+10-100💎', action: 'showAchievements' },
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
  free.innerHTML = FREE_DIAMOND_SOURCES.map(src => `
    <div class="shop-free-item" onclick="${src.action}()">
      <span class="sfi-icon">${src.icon}</span>
      <div class="sfi-info">
        <span class="sfi-title">${src.title}</span>
        <span class="sfi-desc">${src.desc}</span>
      </div>
      <span class="sfi-reward">${src.reward}</span>
    </div>
  `).join('');
  
  DiamondSystem.updateUI();
}

function buyPackage(id) {
  showToast('💎 Satın alma yakında!');
}

function watchAdForDiamonds() {
  RewardedAd.showForDiamonds(10);
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
  if (tabName === 'lider') renderLeaderboard();
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

// ==================== RENDER: ANA SAYFA ====================

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
  
  container.innerHTML = DAILY_REWARD_TABLE.map((reward, i) => {
    let cls = 'reward-day';
    let content = '';
    
    if (alreadyClaimed && i <= currentDayIdx) {
      // Already claimed days
      cls += ' claimed';
      content = `<span class="reward-check">✓</span>`;
    } else if (!alreadyClaimed && i === currentDayIdx) {
      // Today — claimable
      cls += ' today claimable';
      content = `<span class="reward-icon glow">${reward.icon}</span>`;
    } else if (i < currentDayIdx) {
      cls += ' claimed';
      content = `<span class="reward-check">✓</span>`;
    } else {
      content = `<span class="reward-icon" style="opacity:.4">${reward.icon}</span>`;
    }
    return `<div class="${cls}" ${(!alreadyClaimed && i === currentDayIdx) ? 'onclick="claimDailyReward()"' : ''}>
      ${content}
      <span class="reward-label">${reward.day}</span>
      <span class="reward-amount">${reward.amount}💎</span>
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
  
  const badgeHTML = favGames.map((g, i) => `
    <div class="fav-badge anim-in" style="animation-delay:${i*40}ms" onclick="switchTab('discover')">
      <span class="fav-badge-emoji" style="background:linear-gradient(135deg,${g.gradient[0]},${g.gradient[1]})">${g.emoji}</span>
      <span class="fav-badge-name">${g.name}</span>
    </div>
  `).join('');
  
  // Anasayfa container (fav-games)
  const homeContainer = document.getElementById('fav-games');
  if (homeContainer) {
    homeContainer.innerHTML = favGames.length === 0 ? emptyHTML : badgeHTML;
  }
  
  // Profil container (fav-games-list)
  const profileContainer = document.getElementById('fav-games-list');
  if (profileContainer) {
    profileContainer.innerHTML = favGames.length === 0
      ? '<p style="color:var(--text-muted);text-align:center;padding:12px;font-size:13px">❤️ Keşfet ekranından favorilere ekle!</p>'
      : badgeHTML;
  }
}

// ==================== RENDER: GÖREVLER ====================

function renderMissions() {
  renderMissionList('daily-missions', DAILY_MISSIONS);
  renderMissionList('weekly-missions', WEEKLY_MISSIONS);
}

function renderMissionList(containerId, missions) {
  const container = document.getElementById(containerId);
  container.innerHTML = missions.map((m, i) => `
    <div class="mission-card anim-in" style="animation-delay:${i * 60}ms">
      <span class="mission-icon">${m.icon}</span>
      <div class="mission-info">
        <span class="mission-name">${m.name}</span>
        <span class="mission-desc">${m.desc}</span>
        <div class="mission-progress-bar">
          <div class="mission-progress-fill" style="width:${(m.progress/m.total)*100}%"></div>
        </div>
      </div>
      <span class="mission-reward">${m.reward} ⭐</span>
    </div>
  `).join('');
}

// ==================== RENDER: LİDER ====================

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
  container.innerHTML = SETTINGS.map((s, i) => `
    <button class="setting-row anim-in" style="animation-delay:${i*40}ms" onclick="showToast('${s.action}')">
      <span>${s.icon} ${s.label}</span>
      <span>→</span>
    </button>
  `).join('');
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

  // Elmasla devam, oyun BAZINDA kapatılabilir. Ok Bulmaca'da devam hakkı
  // yalnızca ödüllü reklamla veriliyor — elmas can satın alma yok.
  // Yeni bir modal açmak yerine paylaşımlı kutunun bir düğmesi gizleniyor.
  const diamondBtn = document.querySelector('.go-btn-diamond');
  if (diamondBtn) diamondBtn.style.display = opts.noDiamond ? 'none' : '';

  // Level complete reward
  if (win) DiamondSystem.add(3, 'Level tamamlandı!');

  document.getElementById('game-over').style.display = 'flex';
}

// Kanca tek kullanımlıktır: alınıp temizlendikten SONRA çağrılır, böylece
// oyun devam ederken tekrar tetiklenemez (aynı canı iki kez veremez).
function _runGameOverContinuation(source) {
  document.getElementById('game-over').style.display = 'none';
  if (!_gameOverContinuation) return false;
  const fn = _gameOverContinuation;
  _gameOverContinuation = null;
  _gameOverRestart = null;        // devam edildi — yeniden başlatma kancası da düştü
  fn(source);
  return true;
}

function continueWithAd() {
  RewardedAd.showForContinue(() => {
    if (!_runGameOverContinuation('ad')) showToast('🔄 Devam ediyorsun!');
  });
}

function continueWithDiamonds() {
  if (DiamondSystem.spend(30)) {
    if (!_runGameOverContinuation('diamond')) showToast('💎 30 elmas harcandı — devam!');
  }
}

function doubleScoreWithAd() {
  RewardedAd.show(
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
  renderHome();
  renderLeaderboard();
  renderSettings();
  
  // Update streak badge
  const streakCount = StreakSystem.getCount();
  const streakNum = document.querySelector('.streak-num');
  if (streakNum) streakNum.textContent = streakCount || '0';
  
  // Update eco-streak
  const ecoStreak = document.getElementById('eco-streak');
  if (ecoStreak) ecoStreak.textContent = streakCount || '0';

  // Uygulama açılış sesi — soft bloom (müzik geçici olarak kapalı, bkz. playGame())
  document.addEventListener('click', function _firstTouch() {
    if (typeof GameAudio !== 'undefined') {
      GameAudio.play('bloom');
    }
    document.removeEventListener('click', _firstTouch);
  }, { once: true });
})();


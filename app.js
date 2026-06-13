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
  renderDailyRewards();
  renderPuzzleList();
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

function renderPuzzleList() {
  const grid = document.getElementById('puzzle-grid');
  grid.innerHTML = PUZZLE_GAMES.map((g, i) => {
    const btnColor = g.bg.match(/#[a-f0-9]+/i)?.[0] || '#7c3aed';
    return `
    <div class="game-card anim-in" style="animation-delay:${i * 50}ms">
      <div class="game-card-visual" style="background:${g.bg}">
        <span class="game-emoji">${g.emoji}</span>
        ${g.rating ? `<span class="game-rating">⭐ ${g.rating}</span>` : ''}
        ${g.badge ? `<span class="game-badge ${g.badge}">${g.badge === 'yeni' ? 'YENİ' : 'HOT'}</span>` : ''}
      </div>
      <div class="game-card-info">
        <span class="game-card-name">${g.name}</span>
        <span class="game-card-desc">${g.desc}</span>
        <button class="game-play-btn" style="background:${btnColor}" onclick="playGame('${g.name}')">
          ▶ Oyna
        </button>
      </div>
    </div>`;
  }).join('');
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

function renderFavorites() {
  const container = document.getElementById('fav-games-list');
  if (!container) return;
  let favIds = [];
  try { favIds = JSON.parse(localStorage.getItem('gh_fav')||'[]'); } catch(e){}
  if (favIds.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:14px">❤️ Keşfet ekranından oyunları favorilere ekle!</p>';
    return;
  }
  const favGames = favIds.map(id => {
    if (window.REEL_GAMES) {
      const rg = REEL_GAMES.find(r => r.id === id);
      if (rg) return { name:rg.name, emoji:rg.emoji, bg:`linear-gradient(135deg,${rg.gradient[0]},${rg.gradient[1]})`, desc:rg.desc };
    }
    return null;
  }).filter(Boolean);
  container.innerHTML = favGames.map((g,i) => `
    <div class="game-card anim-in" style="animation-delay:${i*50}ms">
      <div class="game-card-visual" style="background:${g.bg}">
        <span class="game-emoji">${g.emoji}</span>
      </div>
      <div class="game-card-info">
        <span class="game-card-name">${g.name}</span>
        <span class="game-card-desc">${g.desc}</span>
        <button class="game-play-btn" onclick="playGame('${g.name}')">▶ Oyna</button>
      </div>
    </div>
  `).join('');
}

// ==================== OYUN MOTORU ====================

const GAME_MAP = {
  'Vida Ustası': 'screwPuzzle',
  '2048': 'game2048',
  'Hafıza Oyunu': 'memoryGame',
  'Kelime Avı': 'wordSearch',
  'Sudoku': 'sudoku',
  'Bulmaca Blokları': 'blockPuzzle',
  'Labirent': 'mazeGame',
};

let _currentGameId = null;
let _beforeGameScreen = null;

function playGame(name) {
  const gameId = GAME_MAP[name];
  if (!gameId || typeof PuzzleGames === 'undefined' || !PuzzleGames[gameId]) {
    showToast(`🎮 ${name} — yakında!`);
    return;
  }

  _currentGameId = gameId;
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
  PuzzleGames[gameId].init(container);
}

function updateGameScore(score) {
  document.getElementById('game-score').textContent = score.toLocaleString();
}

function showGameOver(win, title, message) {
  document.getElementById('go-emoji').textContent = win ? '🎉' : '😔';
  document.getElementById('go-title').textContent = title;
  document.getElementById('go-msg').textContent = message;
  
  // Show/hide continue button (only on loss)
  const continueBtn = document.getElementById('go-continue');
  const doubleBtn = document.getElementById('go-double');
  if (continueBtn) continueBtn.style.display = win ? 'none' : 'flex';
  if (doubleBtn) doubleBtn.style.display = win ? 'flex' : 'none';
  
  // Level complete reward
  if (win) DiamondSystem.add(3, 'Level tamamlandı!');
  
  document.getElementById('game-over').style.display = 'flex';
}

function continueWithAd() {
  RewardedAd.showForContinue(() => {
    document.getElementById('game-over').style.display = 'none';
    showToast('🔄 Devam ediyorsun!');
    // Game continues from where it left off
  });
}

function continueWithDiamonds() {
  if (DiamondSystem.spend(30)) {
    document.getElementById('game-over').style.display = 'none';
    showToast('💎 30 elmas harcandı — devam!');
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
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('game-score').textContent = '0';
  const container = document.getElementById('game-container');
  PuzzleGames[_currentGameId].cleanup();
  container.innerHTML = '';
  PuzzleGames[_currentGameId].init(container);
}

function exitGame() {
  if (_currentGameId && PuzzleGames[_currentGameId]) {
    PuzzleGames[_currentGameId].cleanup();
  }
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
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==================== BAŞLANGIÇ ====================

document.addEventListener('DOMContentLoaded', () => {
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
});


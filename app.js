/* ============================================
   GameHup — Uygulama Mantığı
   ============================================ */

// ==================== VERİ ====================

const PUZZLE_GAMES = [
  { name:'2048', emoji:'🔢', rating:4.8, badge:null, desc:'Sayı birleştir', bg:'linear-gradient(135deg,#d97706,#92400e)' },
  { name:'Bulmaca Blokları', emoji:'🧱', rating:4.5, badge:null, desc:'Blok yerleştir', bg:'linear-gradient(135deg,#7c3aed,#5b21b6)' },
  { name:'Hafıza Oyunu', emoji:'🧠', rating:4.3, badge:'yeni', desc:'Kartları eşleştir', bg:'linear-gradient(135deg,#0891b2,#155e75)' },
  { name:'Kelime Avı', emoji:'📝', rating:4.6, badge:null, desc:'Gizli kelimeleri bul', bg:'linear-gradient(135deg,#16a34a,#166534)' },
  { name:'Sudoku', emoji:'#️⃣', rating:4.7, badge:null, desc:'9x9 tabloyu doldur', bg:'linear-gradient(135deg,#1d4ed8,#1e3a8a)' },
  { name:'Labirent', emoji:'🌀', rating:4.2, badge:'hot', desc:'Çıkışı bul', bg:'linear-gradient(135deg,#059669,#065f46)' },
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
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  container.innerHTML = DAYS.map((day, i) => {
    let cls = 'reward-day';
    let content = '';
    if (i < todayIdx) {
      cls += ' claimed';
      content = `<span class="reward-check">✓</span>`;
    } else if (i === todayIdx) {
      cls += ' today';
      content = `<span class="reward-icon">${DAY_ICONS[i]}</span>`;
    } else {
      content = `<span class="reward-icon" style="opacity:.5">${DAY_ICONS[i]}</span>`;
    }
    return `<div class="${cls}">
      ${content}
      <span class="reward-label">${day}</span>
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
  document.getElementById('game-over').style.display = 'flex';
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
  renderHome();
  renderLeaderboard();
  renderSettings();
});


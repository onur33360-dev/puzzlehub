/* ============================================
   GameHup — Reels / Keşfet Motoru
   TikTok-style game discovery feed
   ============================================ */

// ===== OYUN VERİLERİ =====

const REEL_GAMES = [
  { id:'screwPuzzle', name:'Vida Ustası', emoji:'🔩', category:'puzzle', desc:'Vidaları sök, renkleri eşleştir!', difficulty:'Orta', gradient:['#b45309','#78350f'], playable:true },
  { id:'blockPuzzle', name:'Bulmaca Blokları', emoji:'🧱', category:'puzzle', desc:'Blokları yerleştir, satırları temizle!', difficulty:'Orta', gradient:['#7c3aed','#5b21b6'], playable:true },
  { id:'game2048', name:'2048', emoji:'🔢', category:'puzzle', desc:'Kaydır, birleştir, 2048\'e ulaş!', difficulty:'Kolay', gradient:['#d97706','#92400e'], playable:true },
  { id:'memoryGame', name:'Hafıza Oyunu', emoji:'🧠', category:'puzzle', desc:'Kartları eşleştir, hafızanı test et!', difficulty:'Kolay', gradient:['#0891b2','#155e75'], playable:true },
  { id:'wordSearch', name:'Kelime Avı', emoji:'📝', category:'puzzle', desc:'Gizli kelimeleri bul!', difficulty:'Orta', gradient:['#16a34a','#166534'], playable:true },
  { id:'sudoku', name:'Sudoku', emoji:'#️⃣', category:'puzzle', desc:'9x9 tabloyu doldur!', difficulty:'Zor', gradient:['#1d4ed8','#1e3a8a'], playable:true },
  { id:'mazeGame', name:'Labirent', emoji:'🌀', category:'puzzle', desc:'Çıkışı bul, zamana karşı yarış!', difficulty:'Orta', gradient:['#059669','#065f46'], playable:true },
  { id:'waterSort', name:'İksir Sıralama', emoji:'🧪', category:'puzzle', desc:'İksirleri sırala, renkleri ayır!', difficulty:'Orta', gradient:['#1e2a63','#080b22'], playable:true },
  { id:'arrowPuzzle', name:'Ok Bulmaca', emoji:'🔮', category:'puzzle', desc:'Enerji kanallarını doğru sırayla boşalt!', difficulty:'Kolay', gradient:['#2a1a5e','#0d0824'], playable:true },
  { id:'flowConnect', name:'Akış Bağlantı', emoji:'🔗', category:'puzzle', desc:'Renkleri bağla, tahtayı doldur!', difficulty:'Zor', gradient:['#e11d48','#881337'], playable:false },
  // playable:false BİLEREK — motor ve resim sistemi hazır ama tema Faz 3'te.
  // Oyuncuya çıplak tahta göstermektense kart demoda kalsın.
  { id:'jigsawCard', name:'Resim Kaydır', emoji:'🖼️', category:'puzzle', desc:'Fotoğrafı kaydırarak tamamla!', difficulty:'Orta', gradient:['#123a4a','#06121c'], playable:true },
  { id:'snakeGame', name:'Yılan', emoji:'🐍', category:'arcade', desc:'Klasik yılan — elmasları topla, uza!', difficulty:'Kolay', gradient:['#16255e','#060b22'], playable:true },
  { id:'flappyUfo', name:'Flappy UFO', emoji:'🛸', category:'arcade', desc:'Dokun, yüksel, geçitlerden süz!', difficulty:'Orta', gradient:['#132a63','#04081c'], playable:true },
];

const GAME_NAME_MAP = {
  'screwPuzzle': 'Vida Ustası',
  'blockPuzzle': 'Bulmaca Blokları',
  'game2048': '2048',
  'memoryGame': 'Hafıza Oyunu',
  'wordSearch': 'Kelime Avı',
  'sudoku': 'Sudoku',
  'mazeGame': 'Labirent',
  'waterSort': 'İksir Sıralama',
  'arrowPuzzle': 'Ok Bulmaca',
  'flowConnect': 'Akış Bağlantı',
  'jigsawCard': 'Resim Kaydır',
  'snakeGame': 'Yılan',
  'flappyUfo': 'Flappy UFO'
};



// ===== localStorage YARDIMCILAR =====

function getPlayCount(id) { return parseInt(localStorage.getItem('gh_plays_'+id)||'0',10); }
function incPlayCount(id) { localStorage.setItem('gh_plays_'+id, (getPlayCount(id)+1).toString()); }
// Paylaşımlı API'ye devredildi (core/ui-kit.js). Anahtar mantığı tek
// yerde yaşasın diye: burada okuyup oyunda başka bir anahtara yazmak
// tam olarak "En Yüksek hep 0" hatasını doğuran şeydi.
function getHighScore(id) {
  if (typeof phHighScore === 'function') return phHighScore(id);
  if (id==='blockPuzzle') return parseInt(localStorage.getItem('bp_hi')||'0',10);
  return parseInt(localStorage.getItem('gh_hi_'+id)||'0',10);
}
function getFavorites() { try { return JSON.parse(localStorage.getItem('gh_fav')||'[]'); } catch(e){ return []; } }
function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) favs = favs.filter(f=>f!==id);
  else favs.push(id);
  localStorage.setItem('gh_fav', JSON.stringify(favs));
  return favs.includes(id);
}
function isFavorite(id) { return getFavorites().includes(id); }

// ===== DEMO FABRİKALARI =====
// Her demo: { el, pause(), resume(), destroy() }

const MiniDemos = {};

// Yardımcı: throttled RAF at ~30fps
function _demoLoop(state, drawFn) {
  let frame = 0;
  function tick() {
    if (state.paused) return;
    state.raf = requestAnimationFrame(tick);
    frame++;
    if (frame % 2 !== 0) return; // ~30fps
    drawFn(frame);
  }
  state.raf = requestAnimationFrame(tick);
}

// ———————— 1. Block Puzzle Demo ————————
MiniDemos.demo_blockPuzzle = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const G = 8;
  const COLORS = ['#a855f7','#22d3ee','#22c55e','#f97316','#ec4899','#fbbf24','#ef4444'];
  const grid = Array.from({length:G}, ()=>Array(G).fill(''));
  const state = { paused:false, raf:0 };

  // Build grid DOM
  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:2px;width:85%;max-width:260px;aspect-ratio:1;';
  const cells = [];
  for (let y=0;y<G;y++) for (let x=0;x<G;x++) {
    const c = document.createElement('div');
    c.style.cssText = 'border-radius:4px;background:rgba(255,255,255,0.06);transition:transform 0.3s,opacity 0.3s,background 0.3s;';
    gridEl.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gridEl);

  let stepTimer = 0;
  function drawFn(frame) {
    stepTimer++;
    // Every ~60 frames (~2s at 30fps) drop a block
    if (stepTimer % 60 === 0) {
      const col = COLORS[Math.floor(Math.random()*COLORS.length)];
      const sx = Math.floor(Math.random()*(G-2));
      const sy = Math.floor(Math.random()*(G-2));
      const shapes = [[0,0],[1,0],[0,1],[1,1]]; // 2x2
      shapes.forEach(([dx,dy])=>{
        const gy=sy+dy, gx=sx+dx;
        grid[gy][gx]=col;
        const c=cells[gy*G+gx];
        c.style.background=col;
        c.style.transform='scale(0)';
        c.style.opacity='0.5';
        setTimeout(()=>{ c.style.transform='scale(1)'; c.style.opacity='1'; },50);
      });
    }
    // Every ~120 frames (~4s) clear a full row
    if (stepTimer % 120 === 0) {
      const row = Math.floor(Math.random()*G);
      for (let x=0;x<G;x++) {
        const c = cells[row*G+x];
        c.style.transform='scale(1.15)';
        c.style.opacity='1';
        c.style.background='#fff';
      }
      setTimeout(()=>{
        for (let x=0;x<G;x++) {
          grid[row][x]='';
          const c=cells[row*G+x];
          c.style.transform='scale(0)';
          c.style.opacity='0';
        }
        setTimeout(()=>{
          for (let x=0;x<G;x++) {
            cells[row*G+x].style.transform='scale(1)';
            cells[row*G+x].style.opacity='1';
            cells[row*G+x].style.background='rgba(255,255,255,0.06)';
          }
        },350);
      },300);
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 2. 2048 Demo ————————
MiniDemos.demo_2048 = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const SIZE = 4;
  const TILE_COLORS = {2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
  const TILE_DARK = {2:true,4:true,8:false,16:false,32:false,64:false,128:false,256:false,512:false,1024:false,2048:false};
  const grid = Array.from({length:SIZE},()=>Array(SIZE).fill(0));
  const state = { paused:false, raf:0 };

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:80%;max-width:240px;aspect-ratio:1;padding:8px;border-radius:12px;background:rgba(255,255,255,0.04);';
  const cells = [];
  for (let i=0;i<16;i++) {
    const c = document.createElement('div');
    c.style.cssText = 'border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;background:rgba(255,255,255,0.04);transition:transform 0.25s cubic-bezier(.34,1.56,.64,1),background 0.25s;';
    gridEl.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gridEl);

  // Seed two tiles
  function spawnTile() {
    const empty = [];
    for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) if(!grid[y][x]) empty.push([y,x]);
    if(!empty.length) return;
    const [y,x] = empty[Math.floor(Math.random()*empty.length)];
    grid[y][x] = Math.random()<0.9 ? 2 : 4;
  }
  function renderGrid() {
    for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) {
      const v=grid[y][x], c=cells[y*SIZE+x];
      c.style.background = v ? (TILE_COLORS[v]||'#3c3a32') : 'rgba(255,255,255,0.04)';
      c.style.color = TILE_DARK[v] ? '#776e65' : '#f9f6f2';
      c.textContent = v||'';
    }
  }
  spawnTile(); spawnTile(); renderGrid();

  let stepTimer = 0;
  function drawFn(frame) {
    stepTimer++;
    if (stepTimer % 45 === 0) { // ~1.5s
      // Random slide
      const dirs = ['up','down','left','right'];
      const dir = dirs[Math.floor(Math.random()*dirs.length)];
      const rotated=dir==='up'||dir==='down';
      const rev=dir==='right'||dir==='down';
      let moved=false;
      for(let i=0;i<SIZE;i++){
        let line=[];
        for(let j=0;j<SIZE;j++){const y=rotated?j:i,x=rotated?i:j;line.push(grid[y][x])}
        if(rev)line.reverse();
        const a=line.filter(v=>v);
        for(let k=0;k<a.length-1;k++){if(a[k]===a[k+1]){a[k]*=2;a[k+1]=0;}}
        const merged=a.filter(v=>v);
        while(merged.length<SIZE)merged.push(0);
        if(rev)merged.reverse();
        for(let j=0;j<SIZE;j++){const y=rotated?j:i,x=rotated?i:j;if(grid[y][x]!==merged[j])moved=true;grid[y][x]=merged[j]}
      }
      if(moved) spawnTile();
      // Reset if full
      const hasEmpty = grid.some(r=>r.some(v=>!v));
      if(!hasEmpty) {
        for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) grid[y][x]=0;
        spawnTile(); spawnTile();
      }
      renderGrid();
      // Animate a random tile
      const rndIdx = Math.floor(Math.random()*16);
      cells[rndIdx].style.transform='scale(1.15)';
      setTimeout(()=>{ cells[rndIdx].style.transform='scale(1)'; },200);
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 3. Memory Demo ————————
MiniDemos.demo_memory = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const EMOJIS = ['🎮','🎲','🎯','🏆','⚽','🎸','🚀','🌟'];
  const pairs = [...EMOJIS,...EMOJIS].sort(()=>Math.random()-0.5);
  const matched = new Set();
  const state = { paused:false, raf:0 };

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:80%;max-width:240px;';
  const cards = [];
  for(let i=0;i<16;i++) {
    const c = document.createElement('div');
    c.style.cssText = 'aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;transition:transform 0.4s,background 0.3s;background:linear-gradient(135deg,'+gradient[0]+','+gradient[1]+');user-select:none;';
    c.textContent = '?';
    gridEl.appendChild(c);
    cards.push(c);
  }
  el.appendChild(gridEl);

  let stepTimer=0, flipA=-1, flipB=-1;
  function drawFn(frame) {
    stepTimer++;
    if(stepTimer % 50 === 0) { // Flip two cards
      // Pick an unmatched pair
      const available = [];
      for(let i=0;i<16;i++) if(!matched.has(i)) available.push(i);
      if(available.length<2) {
        // Reset all
        matched.clear();
        for(let i=0;i<16;i++){
          cards[i].style.background='linear-gradient(135deg,'+gradient[0]+','+gradient[1]+')';
          cards[i].textContent='?';
          cards[i].style.transform='';
        }
        return;
      }
      flipA = available[Math.floor(Math.random()*available.length)];
      cards[flipA].style.transform='rotateY(180deg)';
      cards[flipA].style.background='rgba(255,255,255,0.1)';
      cards[flipA].textContent=pairs[flipA];
    }
    if(stepTimer % 50 === 15 && flipA>=0) {
      // Find match
      const matchIdx = pairs.findIndex((e,i)=>i!==flipA&&!matched.has(i)&&e===pairs[flipA]);
      flipB = matchIdx>=0 ? matchIdx : -1;
      if(flipB>=0){
        cards[flipB].style.transform='rotateY(180deg)';
        cards[flipB].style.background='rgba(255,255,255,0.1)';
        cards[flipB].textContent=pairs[flipB];
      }
    }
    if(stepTimer % 50 === 30 && flipA>=0) {
      if(flipB>=0 && pairs[flipA]===pairs[flipB]) {
        matched.add(flipA); matched.add(flipB);
        cards[flipA].style.background='rgba(34,197,94,0.2)';
        cards[flipB].style.background='rgba(34,197,94,0.2)';
        cards[flipA].style.transform='scale(1.05)';
        cards[flipB].style.transform='scale(1.05)';
      } else {
        // Flip back
        [flipA,flipB].forEach(idx=>{
          if(idx>=0&&!matched.has(idx)){
            cards[idx].style.transform='';
            cards[idx].style.background='linear-gradient(135deg,'+gradient[0]+','+gradient[1]+')';
            cards[idx].textContent='?';
          }
        });
      }
      flipA=-1;flipB=-1;
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 4. Word Search Demo ————————
MiniDemos.demo_wordSearch = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const SIZE = 8;
  const ALPHA = 'ABCDEFGHIJKLMNOPRSTUVYZİÖÜÇŞĞ';
  const WORDS = ['OYUN','SKOR','BLOK','RENK'];
  const state = { paused:false, raf:0 };

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:2px;width:85%;max-width:260px;';
  const cells = [];
  const letters = [];
  // Place first word horizontally at row 2
  const wordPositions = [];
  let wordIdx=0, charIdx=0;
  for(let y=0;y<SIZE;y++) {
    for(let x=0;x<SIZE;x++) {
      const c = document.createElement('div');
      c.style.cssText = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border-radius:4px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);transition:all 0.3s;';
      let letter = ALPHA[Math.floor(Math.random()*ALPHA.length)];
      // Plant words
      if(wordIdx<WORDS.length) {
        const w = WORDS[wordIdx];
        const wy = wordIdx * 2;
        if(y===wy && x>=1 && x<1+w.length) {
          letter = w[x-1];
          wordPositions.push({y,x,wi:wordIdx,ci:x-1});
        }
      }
      c.textContent = letter;
      letters.push(letter);
      gridEl.appendChild(c);
      cells.push(c);
    }
    if(y>0 && y%2===0) wordIdx = Math.min(wordIdx+1, WORDS.length-1);
  }
  el.appendChild(gridEl);

  let stepTimer=0, highlightWord=0, highlightChar=0;
  function drawFn(frame) {
    stepTimer++;
    if(stepTimer % 20 === 0) { // Highlight letters one by one
      const wp = wordPositions.filter(p=>p.wi===highlightWord);
      if(highlightChar < wp.length) {
        const p = wp[highlightChar];
        const c = cells[p.y*SIZE+p.x];
        c.style.background = gradient[0];
        c.style.color = '#fff';
        c.style.transform = 'scale(1.1)';
        c.style.boxShadow = '0 0 12px '+gradient[0];
        highlightChar++;
      } else {
        highlightChar = 0;
        highlightWord = (highlightWord+1) % WORDS.length;
        // Reset all
        cells.forEach(c=>{
          c.style.background='rgba(255,255,255,0.06)';
          c.style.color='rgba(255,255,255,0.7)';
          c.style.transform='scale(1)';
          c.style.boxShadow='none';
        });
        // Keep previously completed words highlighted (green)
        wordPositions.filter(p=>p.wi<highlightWord).forEach(p=>{
          const c=cells[p.y*SIZE+p.x];
          c.style.background='rgba(34,197,94,0.25)';
          c.style.color='#86efac';
        });
      }
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 5. Sudoku Demo ————————
MiniDemos.demo_sudoku = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const SIZE = 9;
  // Pre-filled partial sudoku (0=empty to fill)
  const puzzle = [
    5,3,0,0,7,0,0,0,0,
    6,0,0,1,9,5,0,0,0,
    0,9,8,0,0,0,0,6,0,
    8,0,0,0,6,0,0,0,3,
    4,0,0,8,0,3,0,0,1,
    7,0,0,0,2,0,0,0,6,
    0,6,0,0,0,0,2,8,0,
    0,0,0,4,1,9,0,0,5,
    0,0,0,0,8,0,0,7,9
  ];
  const solution = [
    5,3,4,6,7,8,9,1,2,
    6,7,2,1,9,5,3,4,8,
    1,9,8,3,4,2,5,6,7,
    8,5,9,7,6,1,4,2,3,
    4,2,6,8,5,3,7,9,1,
    7,1,3,9,2,4,8,5,6,
    9,6,1,5,3,7,2,8,4,
    2,8,7,4,1,9,6,3,5,
    3,4,5,2,8,6,1,7,9
  ];
  const board = [...puzzle];

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(9,1fr);gap:1px;width:85%;max-width:250px;aspect-ratio:1;padding:4px;border-radius:10px;background:rgba(255,255,255,0.04);';
  const cells = [];
  for(let i=0;i<81;i++) {
    const c = document.createElement('div');
    const r=Math.floor(i/9), col=i%9;
    const borderR = col%3===2&&col<8 ? 'border-right:2px solid rgba(255,255,255,0.15);':'';
    const borderB = r%3===2&&r<8 ? 'border-bottom:2px solid rgba(255,255,255,0.15);':'';
    c.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border-radius:3px;background:rgba(255,255,255,0.05);color:'+(puzzle[i]?'rgba(255,255,255,0.4)':gradient[0])+';transition:all 0.3s;'+borderR+borderB;
    c.textContent = puzzle[i]||'';
    gridEl.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gridEl);

  // Find empty cells in order
  const empties = [];
  for(let i=0;i<81;i++) if(!puzzle[i]) empties.push(i);
  let fillIdx = 0;
  let stepTimer = 0;

  function drawFn(frame) {
    stepTimer++;
    if(stepTimer % 25 === 0) {
      if(fillIdx < empties.length) {
        const idx = empties[fillIdx];
        const c = cells[idx];
        board[idx] = solution[idx];
        c.textContent = solution[idx];
        c.style.color = gradient[0];
        c.style.background = 'rgba(255,255,255,0.1)';
        c.style.transform = 'scale(1.2)';
        setTimeout(()=>{ c.style.transform='scale(1)'; c.style.background='rgba(255,255,255,0.05)'; },250);
        fillIdx++;
      } else {
        // Reset
        fillIdx = 0;
        empties.forEach(idx=>{
          board[idx]=0;
          cells[idx].textContent='';
          cells[idx].style.color=gradient[0];
          cells[idx].style.background='rgba(255,255,255,0.05)';
        });
      }
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 6. Maze Demo ————————
MiniDemos.demo_maze = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const MZ = 11; // odd for maze
  // Simple fixed maze pattern
  const maze = [
    1,1,1,1,1,1,1,1,1,1,1,
    1,0,0,0,1,0,0,0,0,0,1,
    1,0,1,0,1,0,1,1,1,0,1,
    1,0,1,0,0,0,0,0,1,0,1,
    1,0,1,1,1,1,1,0,1,0,1,
    1,0,0,0,0,0,1,0,0,0,1,
    1,1,1,0,1,0,1,1,1,0,1,
    1,0,0,0,1,0,0,0,0,0,1,
    1,0,1,1,1,0,1,1,1,1,1,
    1,0,0,0,0,0,0,0,0,0,1,
    1,1,1,1,1,1,1,1,1,1,1,
  ];
  // Valid path through the maze
  const validPath = [[1,1],[1,2],[1,3],[2,3],[3,3],[3,4],[3,5],[3,6],[3,7],[4,7],[5,7],[5,8],[5,9],[6,9],[7,9],[7,8],[7,7],[7,6],[7,5],[6,5],[5,5],[5,4],[5,3],[5,2],[5,1],[7,3],[7,2],[7,1],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9]];

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat('+MZ+',1fr);gap:1px;width:80%;max-width:240px;aspect-ratio:1;';
  const cells = [];
  for(let y=0;y<MZ;y++) for(let x=0;x<MZ;x++) {
    const c = document.createElement('div');
    const isWall = maze[y*MZ+x]===1;
    c.style.cssText = 'border-radius:2px;transition:all 0.3s;background:'+(isWall?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.02)')+';';
    gridEl.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gridEl);

  let dotIdx = 0, stepTimer = 0;
  const trail = [];

  function drawFn(frame) {
    stepTimer++;
    if(stepTimer % 12 === 0) {
      if(dotIdx < validPath.length) {
        const [y,x] = validPath[dotIdx];
        // Clear previous dot glow
        if(trail.length>0) {
          const [py,px]=trail[trail.length-1];
          cells[py*MZ+px].style.background='rgba(34,197,94,0.2)';
          cells[py*MZ+px].style.boxShadow='none';
        }
        // Draw current
        const c = cells[y*MZ+x];
        c.style.background='#22c55e';
        c.style.boxShadow='0 0 10px #22c55e, 0 0 20px rgba(34,197,94,0.4)';
        trail.push([y,x]);
        dotIdx++;
      } else {
        // Reset
        dotIdx = 0;
        trail.length = 0;
        for(let i=0;i<MZ*MZ;i++) {
          const isWall = maze[i]===1;
          cells[i].style.background = isWall?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.02)';
          cells[i].style.boxShadow = 'none';
        }
      }
    }
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};


// ===== SCREW PUZZLE DEMO =====
MiniDemos.demo_screw = function(gradient) {
  const el = document.createElement('div');
  el.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden';
  
  const COLORS = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7'];
  const WOOD = ['#8B6914','#A0522D','#6B4226'];
  
  // Create boards
  const boards = [
    { x:15, y:30, w:70, h:28, z:1 },
    { x:25, y:18, w:55, h:26, z:2 },
  ];
  
  // Create screws on boards
  const screwData = [];
  boards.forEach((b,bi) => {
    [{rx:0.12,ry:0.2},{rx:0.88,ry:0.2},{rx:0.12,ry:0.8},{rx:0.88,ry:0.8}].forEach(s => {
      screwData.push({ x:b.x+s.rx*b.w, y:b.y+s.ry*b.h, c:Math.floor(Math.random()*3), bi, removed:false });
    });
  });
  
  let html = '';
  // Boards
  boards.forEach((b,i) => {
    const c = WOOD[i];
    html += `<div style="position:absolute;left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;background:linear-gradient(145deg,${c},rgba(0,0,0,0.3));border-radius:6px;z-index:${b.z};box-shadow:0 3px 8px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.15),inset 0 -1px 0 rgba(0,0,0,0.3)"></div>`;
  });
  // Screws
  screwData.forEach((s,i) => {
    const c = COLORS[s.c];
    html += `<div id="dsc${i}" style="position:absolute;left:${s.x}%;top:${s.y}%;width:14px;height:14px;margin:-7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${c},rgba(0,0,0,0.4));box-shadow:0 2px 4px rgba(0,0,0,0.5);z-index:10;transition:all .5s ease"><div style="position:absolute;inset:3px;border-radius:50%;border:0.5px solid rgba(255,255,255,0.2)"></div></div>`;
  });
  // Slots
  html += '<div style="position:absolute;bottom:6%;left:15%;right:15%;display:flex;gap:4px;justify-content:center">';
  for(let i=0;i<5;i++) html += `<div id="dsl${i}" style="width:16px;height:16px;border-radius:5px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)"></div>`;
  html += '</div>';
  el.innerHTML = html;
  
  const state = { paused:false, raf:0 };
  let step = 0, slotIdx = 0, removedCount = 0;
  
  function drawFn(frame) {
    if (frame % 90 !== 0) return;
    // Find next non-removed screw
    let found = -1;
    for (let i = 0; i < screwData.length; i++) {
      const idx = (step + i) % screwData.length;
      if (!screwData[idx].removed) { found = idx; break; }
    }
    if (found < 0) {
      // Reset all
      screwData.forEach((s,i) => {
        s.removed = false;
        const e = el.querySelector('#dsc'+i);
        if(e) { e.style.transform='rotate(0) scale(1)'; e.style.opacity='1'; }
      });
      for(let i=0;i<5;i++) { const e=el.querySelector('#dsl'+i); if(e) e.style.background='rgba(255,255,255,0.05)'; }
      slotIdx = 0; removedCount = 0; step = 0;
      return;
    }
    
    screwData[found].removed = true;
    const e = el.querySelector('#dsc'+found);
    if(e) { e.style.transform='rotate(540deg) scale(0)'; e.style.opacity='0'; }
    
    // Fill slot
    if (slotIdx < 5) {
      const slot = el.querySelector('#dsl'+slotIdx);
      if(slot) slot.style.background = COLORS[screwData[found].c];
      slotIdx++;
    }
    
    removedCount++;
    // Clear slots every 3
    if (slotIdx >= 3) {
      setTimeout(() => {
        for(let i=0;i<5;i++) { const e=el.querySelector('#dsl'+i); if(e) { e.style.background='rgba(255,255,255,0.05)'; } }
        slotIdx = 0;
      }, 600);
    }
    
    step = found + 1;
  }
  
  _demoLoop(state, drawFn);
  
  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};


// ———————— 8. İksir Sıralama Demo ————————
MiniDemos.demo_waterSort = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  // §3.5 mücevher paleti (3-stop): gerçek oyunun sıvı içeriğiyle aynı aile.
  const POTIONS = [
    {hi:'#c084fc', base:'#a855f7', sh:'#7c3aed', glow:'rgba(168,85,247,.5)'},   // Violet
    {hi:'#67e8f9', base:'#22d3ee', sh:'#0891b2', glow:'rgba(34,211,238,.5)'},   // Cyan
    {hi:'#f87171', base:'#ef4444', sh:'#b91c1c', glow:'rgba(239,68,68,.5)'},    // Coral
    {hi:'#4ade80', base:'#22c55e', sh:'#15803d', glow:'rgba(34,197,94,.5)'},    // Emerald
    {hi:'#60a5fa', base:'#3b82f6', sh:'#1d4ed8', glow:'rgba(59,130,246,.5)'},   // Azure
  ];
  const TC=6, LY=4;

  if(!document.getElementById('css-ws-demo2')){
    const s=document.createElement('style');s.id='css-ws-demo2';
    s.textContent =
      // Yıldız tozu — büyü laboratuvarı zerreleri
      '.wsd-mote{position:absolute;border-radius:50%;background:radial-gradient(circle,#EAF0FF,rgba(190,205,255,.6) 55%,transparent);'+
        'box-shadow:0 0 5px 1px rgba(165,190,255,.4);animation:_wsdDrift linear infinite;pointer-events:none}'+
      '@keyframes _wsdDrift{0%{transform:translateY(0);opacity:0}15%{opacity:.7}100%{transform:translateY(-60px);opacity:0}}'+
      '.wsd-crystal{position:absolute;border-radius:50%;filter:blur(26px);mix-blend-mode:screen;pointer-events:none;'+
        'animation:_wsdPulse 8s ease-in-out infinite}'+
      '@keyframes _wsdPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.55;transform:scale(1.12)}}'+
      // Sıvı katmanı: dikey gradyan gövde. İç highlight + glow inline veriliyor.
      '.wsd-layer{position:relative;width:100%;transition:height .5s cubic-bezier(.34,1.56,.64,1),'+
        'opacity .4s ease,transform .5s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom}'+
      // Meniskus: her sıvı sütununun ÜST katmanının tepesinde yuvarlak kabarma
      '.wsd-layer.top::after{content:"";position:absolute;top:-3px;left:0;right:0;height:6px;'+
        'border-radius:50%;background:inherit;filter:brightness(1.15)}'+
      // Cam parıltısı: sol dikey şerit + üst diagonal sheen
      '.wsd-gloss{position:absolute;top:6px;left:3px;width:5px;bottom:14px;border-radius:4px;pointer-events:none;'+
        'background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.05) 40%,transparent);z-index:3}'+
      '.wsd-sheen{position:absolute;top:4px;right:5px;width:9px;height:26px;border-radius:50%;pointer-events:none;'+
        'background:linear-gradient(150deg,rgba(255,255,255,.22),transparent 65%);transform:rotate(18deg);z-index:3}'+
      // Dökülme akışı: kaynaktan hedefe inen ince sıvı şerit
      '.wsd-stream{position:absolute;width:4px;border-radius:2px;z-index:20;pointer-events:none;'+
        'transform-origin:top center;animation:_wsdStream .5s ease-in forwards}'+
      '@keyframes _wsdStream{0%{transform:scaleY(0)}30%{transform:scaleY(1)}100%{transform:scaleY(1);opacity:.85}}'+
      // Tamamlama kutlaması: tüp yükselir + parlar
      '@keyframes _wsdComplete{0%{transform:translateY(0)}30%{transform:translateY(-10px)}100%{transform:translateY(0)}}'+
      '.wsd-star{position:absolute;pointer-events:none;z-index:25;font-size:10px;'+
        'animation:_wsdStar .8s ease-out forwards}'+
      '@keyframes _wsdStar{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(1);opacity:0}}';
    document.head.appendChild(s);
  }

  // Atmosfer: kristal ışık + yıldız tozu
  const c1=document.createElement('div');
  c1.className='wsd-crystal';
  c1.style.cssText+='width:150px;height:150px;left:6%;top:16%;background:radial-gradient(circle,rgba(126,110,220,.5),transparent 70%)';
  const c2=document.createElement('div');
  c2.className='wsd-crystal';
  c2.style.cssText+='width:120px;height:120px;right:8%;bottom:18%;background:radial-gradient(circle,rgba(96,120,225,.45),transparent 70%);animation-delay:-4s';
  el.appendChild(c1); el.appendChild(c2);
  for(let i=0;i<12;i++){
    const m=document.createElement('div');
    const sz=1.5+Math.random()*2;
    m.className='wsd-mote';
    m.style.cssText+='width:'+sz+'px;height:'+sz+'px;left:'+(6+Math.random()*88)+'%;top:'+(30+Math.random()*60)+'%;'+
      'animation-duration:'+(4000+Math.random()*3500)+'ms;animation-delay:'+(-Math.random()*6000)+'ms';
    el.appendChild(m);
  }

  const scene=document.createElement('div');
  scene.style.cssText='width:88%;max-width:290px;position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px';
  const tubeWrap=document.createElement('div');
  tubeWrap.style.cssText='display:flex;gap:8px;align-items:flex-end;justify-content:center;width:100%;position:relative';
  scene.appendChild(tubeWrap);
  el.appendChild(scene);

  // Bir katmanın dolgusunu §13 sıvı reçetesine göre yaz
  function paint(ly, pot, isTop){
    ly.dataset.color = pot.base;
    ly.style.background = 'linear-gradient(180deg,'+pot.hi+' 0%,'+pot.base+' 45%,'+pot.sh+' 100%)';
    ly.style.boxShadow = 'inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.3),0 0 8px '+pot.glow;
    ly.classList.toggle('top', !!isTop);
  }
  function potByBase(base){ return POTIONS.find(p=>p.base===base); }

  // Tüpleri kur. İlk TC-2 dolu (karışık), son 2 boş — çözülebilir his.
  const tubes=[];
  for(let t=0;t<TC;t++){
    const tube=document.createElement('div');
    const empty = t>=TC-2;
    tube.style.cssText='position:relative;width:38px;height:128px;border-radius:6px 6px 18px 18px;overflow:hidden;'+
      'border:1.5px solid rgba(200,205,255,.22);border-top:1.5px solid rgba(200,205,255,.32);'+
      'background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(10,12,30,.35));'+
      'backdrop-filter:blur(3px);display:flex;flex-direction:column-reverse;transition:transform .5s cubic-bezier(.34,1.56,.64,1),box-shadow .4s ease';
    const layers=[];
    if(!empty){
      for(let l=0;l<LY;l++){
        const ly=document.createElement('div');
        ly.className='wsd-layer';
        ly.style.height='25%';
        paint(ly, POTIONS[Math.floor(Math.random()*POTIONS.length)], l===LY-1);
        tube.appendChild(ly);
        layers.push(ly);
      }
    }
    const gloss=document.createElement('div'); gloss.className='wsd-gloss';
    const sheen=document.createElement('div'); sheen.className='wsd-sheen';
    tube.appendChild(gloss); tube.appendChild(sheen);
    tubeWrap.appendChild(tube);
    tubes.push({ el:tube, layers, empty });
  }

  function markTops(){
    tubes.forEach(t=>t.layers.forEach((ly,i)=>ly.classList.toggle('top', i===t.layers.length-1)));
  }

  // Kaynağın üst rengini hedefe DÖK: gerçek transfer hissi.
  function pour(src, dst){
    const top = src.layers[src.layers.length-1];
    if(!top) return;
    const pot = potByBase(top.dataset.color);
    const dr = dst.el.getBoundingClientRect();
    const host = el.getBoundingClientRect();
    // Akış şeridi: hedefin ağzından, hedefteki MEVCUT sıvı yüzeyine kadar.
    // Sıvı boşluğa düşer — hedef boşsa dibe iner, doluysa yüzeyde durur.
    // Tüplerin tepesi eşit olduğu için kaynağın Y'si burada hiçbir şey
    // söylemiyor; belirleyici olan tek şey hedefin doluluğu.
    const stream=document.createElement('div');
    stream.className='wsd-stream';
    const layerPx = dr.height * (25/100);              // .wsd-layer height:25% ile aynı
    const fillPx  = dst.layers.length * layerPx;       // katman EKLENMEDEN önceki seviye
    const x = dr.left - host.left + dr.width/2 - 2;
    const yTop = dr.top - host.top + 6;                // ağzın hemen içi
    const h = Math.max(6, (dr.bottom - host.top - fillPx) - yTop);
    stream.style.cssText+='left:'+x+'px;top:'+yTop+'px;height:'+h+'px;'+
      'background:linear-gradient(180deg,'+pot.hi+','+pot.base+');box-shadow:0 0 8px '+pot.glow;
    el.appendChild(stream);
    src.el.style.boxShadow='0 0 16px '+pot.glow;
    // Kaynaktan çıkar
    top.style.height='0%'; top.style.opacity='0';
    setTimeout(()=>{ top.remove(); src.layers.pop(); src.el.style.boxShadow='none'; markTops(); },500);
    // Hedefe belir
    setTimeout(()=>{
      const ly=document.createElement('div');
      ly.className='wsd-layer'; ly.style.height='0%';
      paint(ly, pot, true);
      dst.el.appendChild(ly); dst.layers.push(ly);
      requestAnimationFrame(()=>{
        ly.style.height='25%'; markTops();
        // Seviye yükseldikçe şerit kısalır: ucu hep yüzeyde kalsın, yeni
        // katmanın içine gömülmesin.
        stream.style.transition='height .36s ease-in';
        stream.style.height=Math.max(6, h-layerPx)+'px';
      });
      // Hedef tek renk + dolu mu? -> kutlama
      setTimeout(()=>{ if(isComplete(dst)) celebrate(dst); },520);
    },260);
    setTimeout(()=>stream.remove(),620);
  }

  function isComplete(t){
    return t.layers.length===LY &&
      t.layers.every(ly=>ly.dataset.color===t.layers[0].dataset.color);
  }
  function celebrate(t){
    const pot=potByBase(t.layers[0].dataset.color);
    t.el.style.animation='_wsdComplete .8s cubic-bezier(.34,1.56,.64,1)';
    t.el.style.boxShadow='0 0 22px '+pot.glow;
    const r=t.el.getBoundingClientRect(), host=el.getBoundingClientRect();
    const cx=r.left-host.left+r.width/2, cy=r.top-host.top+8;
    for(let i=0;i<6;i++){
      const st=document.createElement('div');
      st.className='wsd-star'; st.textContent='✦';
      st.style.color=pot.hi;
      st.style.left=cx+'px'; st.style.top=cy+'px';
      const a=(Math.PI*2/6)*i, d=18+Math.random()*16;
      st.style.setProperty('--sx',Math.cos(a)*d+'px');
      st.style.setProperty('--sy',(Math.sin(a)*d-10)+'px');
      el.appendChild(st);
      setTimeout(()=>st.remove(),800);
    }
    setTimeout(()=>{ t.el.style.animation=''; t.el.style.boxShadow=''; },850);
  }

  let step=0;
  function drawFn(){
    step++;
    if(step%70===0){
      // Kaynak: üstü olan bir tüp. Hedef: boş ya da aynı renkle biten.
      const srcs=tubes.filter(t=>t.layers.length>0 && !isComplete(t));
      if(!srcs.length){ resetBoard(); return; }
      const src=srcs[Math.floor(Math.random()*srcs.length)];
      const col=src.layers[src.layers.length-1].dataset.color;
      const dsts=tubes.filter(t=>t!==src && t.layers.length<LY &&
        (t.layers.length===0 || t.layers[t.layers.length-1].dataset.color===col));
      if(dsts.length){ pour(src, dsts[Math.floor(Math.random()*dsts.length)]); }
    }
  }
  function resetBoard(){
    tubes.forEach((t,ti)=>{
      t.el.querySelectorAll('.wsd-layer').forEach(l=>l.remove());
      t.layers=[];
      if(ti<TC-2){
        for(let l=0;l<LY;l++){
          const ly=document.createElement('div');
          ly.className='wsd-layer'; ly.style.height='25%';
          paint(ly, POTIONS[Math.floor(Math.random()*POTIONS.length)], l===LY-1);
          t.el.appendChild(ly); t.layers.push(ly);
        }
      }
    });
    markTops();
  }

  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
};

// ———————— 9. Ok Bulmaca Demo ————————
// Gerçek oyunun görsel diliyle birebir: SVG neon enerji KANALLARI
// (glow/casing/core/inner/head), kıvrımlı oklar, yılan gibi çıkış
// (uç ilerler, gövde kendi izini takip ederek düzleşir), ışık izi.
// Eski emoji-ok + kelebek demosu tamamen kaldırıldı — o mekaniği de
// görsel dili de artık yansıtmıyordu.
MiniDemos.demo_arrowPuzzle = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const NS = 'http://www.w3.org/2000/svg';
  // §3.5 mücevher paleti — 1. hüzme (Violet). Gerçek oyunla aynı hex'ler.
  const J = { hi:'#c084fc', base:'#a855f7', sh:'#7c3aed', glow:'rgba(168,85,247,.45)', ink:'#070B1E' };
  // Kanal stroke oranları (hücre birimi) — oyundakilerin aynısı.
  const W = { glow:0.5, casing:0.3, core:0.19, inner:0.075 };
  const EXIT_MS = 620;

  // Kıvrımlı oklar: cells uçtan kuyruğa, dir = uçtan dışarı bakan yön.
  // 8x8 tahtada dengeli yerleşim (demo — çözülebilirlik gerekmez, his verir).
  const GRID = 8;
  const ARROWS = [
    { cells:[[2,1],[2,2],[2,3],[3,3]], dir:[0,-1] },   // yukarı, L sağa
    { cells:[[6,1],[6,2],[5,2],[5,3]], dir:[0,-1] },   // yukarı, S
    { cells:[[1,4],[2,4],[2,5]],       dir:[-1,0] },   // sola, köşe
    { cells:[[4,5],[4,4],[5,4]],       dir:[0,1]  },   // aşağı, köşe
    { cells:[[6,6],[5,6],[5,5],[6,5]], dir:[1,0]  },   // sağa, U
    { cells:[[3,7],[3,6],[2,6],[2,7]], dir:[0,1]  },   // aşağı, U
  ];

  if(!document.getElementById('css-arrow-demo2')){
    const s=document.createElement('style');s.id='css-arrow-demo2';
    s.textContent =
      '.ard-svg{width:100%;height:100%;overflow:visible;will-change:transform;'+
        'animation:_ardBreath 9s ease-in-out infinite}'+          // hafif kamera nefesi = büyük tahta hissi
      '@keyframes _ardBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}'+
      '.ard-arrow path{fill:none;stroke-linecap:round;stroke-linejoin:round}'+
      '.ard-glow{opacity:.5}.ard-arrow:not(.exiting){transition:opacity .5s ease}'+
      '.ard-arrow.exiting .ard-glow,.ard-arrow.exiting .ard-casing,'+
        '.ard-arrow.exiting .ard-core,.ard-arrow.exiting .ard-inner{'+
        'transition:stroke-dashoffset '+EXIT_MS+'ms cubic-bezier(.22,1,.36,1)}'+
      '.ard-arrow.exiting .ard-head{transition:transform '+EXIT_MS+'ms cubic-bezier(.22,1,.36,1)}'+
      '.ard-arrow.exiting{animation:_ardFade '+EXIT_MS+'ms ease forwards}'+
      '@keyframes _ardFade{0%,55%{opacity:1}100%{opacity:0}}'+
      '.ard-wake{fill:none;stroke:'+J.glow+';stroke-width:'+(W.core*0.85)+';stroke-linecap:round;'+
        'animation:_ardWake '+EXIT_MS+'ms cubic-bezier(.22,1,.36,1) forwards}'+
      '@keyframes _ardWake{0%{opacity:.85}70%{opacity:.3}100%{opacity:0}}'+
      '.ard-dust{position:absolute;border-radius:50%;background:radial-gradient(circle,#EAF0FF,rgba(190,205,255,.6) 55%,transparent);'+
        'box-shadow:0 0 5px 1px rgba(165,190,255,.5);animation:_ardDrift linear infinite;pointer-events:none}'+
      '@keyframes _ardDrift{0%{transform:translateY(0);opacity:0}15%{opacity:.8}100%{transform:translateY(-70px);opacity:0}}'+
      '.ard-crystal{position:absolute;border-radius:50%;filter:blur(24px);mix-blend-mode:screen;pointer-events:none;'+
        'animation:_ardPulse 7s ease-in-out infinite}'+
      '@keyframes _ardPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.6;transform:scale(1.15)}}';
    document.head.appendChild(s);
  }

  // Kristal ışık (blur küreler) + yıldız tozu — Magic Night atmosferi.
  const c1=document.createElement('div');
  c1.className='ard-crystal';
  c1.style.cssText+='width:160px;height:160px;left:8%;top:12%;background:radial-gradient(circle,rgba(126,110,220,.55),transparent 70%)';
  const c2=document.createElement('div');
  c2.className='ard-crystal';
  c2.style.cssText+='width:130px;height:130px;right:6%;bottom:14%;background:radial-gradient(circle,rgba(96,120,225,.5),transparent 70%);animation-delay:-3.5s';
  el.appendChild(c1); el.appendChild(c2);
  for(let i=0;i<14;i++){
    const d=document.createElement('div');
    const sz=1.5+Math.random()*2.2;
    d.className='ard-dust';
    d.style.cssText+='width:'+sz+'px;height:'+sz+'px;left:'+(5+Math.random()*90)+'%;top:'+(20+Math.random()*70)+'%;'+
      'animation-duration:'+(4000+Math.random()*4000)+'ms;animation-delay:'+(-Math.random()*6000)+'ms';
    el.appendChild(d);
  }

  // SVG sahne
  const scene=document.createElement('div');
  scene.style.cssText='width:78%;max-width:250px;aspect-ratio:1;position:relative;z-index:1;'+
    'border-radius:20px;padding:8px;'+
    'background:linear-gradient(180deg,rgba(126,110,220,.14),rgba(20,18,54,.5) 70%);'+
    'border:1px solid rgba(180,165,255,.16);box-shadow:0 20px 44px -18px rgba(4,6,22,.9),inset 0 1px 0 rgba(205,195,255,.2)';
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('class','ard-svg');
  svg.setAttribute('viewBox','0 0 '+GRID+' '+GRID);
  scene.appendChild(svg); el.appendChild(scene);

  // Izgara (çok kısık, oyundaki gibi)
  const grid=document.createElementNS(NS,'g');
  grid.setAttribute('stroke','rgba(180,170,255,.07)');
  grid.setAttribute('stroke-width','.02');
  for(let i=0;i<=GRID;i++){
    for(const [x1,y1,x2,y2] of [[i,0,i,GRID],[0,i,GRID,i]]){
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x1);ln.setAttribute('y1',y1);ln.setAttribute('x2',x2);ln.setAttribute('y2',y2);
      grid.appendChild(ln);
    }
  }
  svg.appendChild(grid);
  const layer=document.createElementNS(NS,'g');
  svg.appendChild(layer);

  // ── Geometri (oyundaki mantığın kompakt hali) ──
  function bodyPath(cells){
    return cells.map((c,i)=>(i?'L':'M')+(c[0]+.5)+' '+(c[1]+.5)).join(' ');
  }
  function trackPath(cells,dir,ext){
    const tx=cells[0][0]+.5, ty=cells[0][1]+.5;
    let p='M'+(tx+dir[0]*ext)+' '+(ty+dir[1]*ext);
    for(const c of cells) p+='L'+(c[0]+.5)+' '+(c[1]+.5);
    return p;
  }
  function headPath(cells,dir){
    const cx=cells[0][0]+.5, cy=cells[0][1]+.5;
    const t=.5,b=-.05,w=.17, px=-dir[1],py=dir[0];
    return 'M'+(cx+dir[0]*t)+' '+(cy+dir[1]*t)+
      'L'+(cx+px*w+dir[0]*b)+' '+(cy+py*w+dir[1]*b)+
      'L'+(cx-px*w+dir[0]*b)+' '+(cy-py*w+dir[1]*b)+'Z';
  }
  function mkPath(cls,w,stroke,d){
    const p=document.createElementNS(NS,'path');
    p.setAttribute('class',cls);p.setAttribute('d',d);
    p.setAttribute('stroke',stroke);p.setAttribute('stroke-width',w);
    return p;
  }

  const nodes=[];   // {g, arrow, strokes, head}
  function build(){
    layer.innerHTML='';
    nodes.length=0;
    ARROWS.forEach((a,i)=>{
      const g=document.createElementNS(NS,'g');
      g.setAttribute('class','ard-arrow');
      const d=bodyPath(a.cells);
      const glow=mkPath('ard-glow',W.glow,J.glow,d);
      const casing=mkPath('ard-casing',W.casing,J.ink,d);
      const core=mkPath('ard-core',W.core,J.sh,d);
      const inner=mkPath('ard-inner',W.inner,J.hi,d);
      const head=document.createElementNS(NS,'path');
      head.setAttribute('class','ard-head');
      head.setAttribute('d',headPath(a.cells,a.dir));
      head.setAttribute('fill',J.hi);head.setAttribute('stroke',J.ink);head.setAttribute('stroke-width','.05');
      [glow,casing,core,inner,head].forEach(n=>g.appendChild(n));
      layer.appendChild(g);
      nodes.push({ g, arrow:a, strokes:[glow,casing,core,inner], head });
    });
  }
  build();

  function exit(node){
    const { g, arrow, strokes, head } = node;
    const bodyLen=arrow.cells.length-1||0.001;
    const ext=GRID+bodyLen;
    const track=trackPath(arrow.cells,arrow.dir,ext);
    // İz
    const wake=mkPath('ard-wake',W.core*0.85,J.glow,track);
    wake.style.strokeDasharray='0 '+(ext+bodyLen+1);
    wake.style.strokeDashoffset=-(ext+bodyLen);
    g.insertBefore(wake,g.firstChild);
    requestAnimationFrame(()=>{
      wake.style.transition='stroke-dasharray '+EXIT_MS+'ms cubic-bezier(.22,1,.36,1),stroke-dashoffset '+EXIT_MS+'ms cubic-bezier(.22,1,.36,1)';
      wake.style.strokeDasharray=ext+' '+(ext+bodyLen+1);
      wake.style.strokeDashoffset=-bodyLen;
    });
    // Gövde: kendi rayında kayar ve düzleşir
    strokes.forEach(p=>{
      p.setAttribute('d',track);
      p.style.strokeDasharray=bodyLen+' '+(ext+bodyLen+1);
      p.style.strokeDashoffset=-ext;
    });
    void svg.getBBox();
    g.classList.add('exiting');
    strokes.forEach(p=>{ p.style.strokeDashoffset='0'; });
    head.style.transform='translate('+(arrow.dir[0]*ext)+'px,'+(arrow.dir[1]*ext)+'px)';
  }

  function restore(node){
    const { g, arrow, strokes, head } = node;
    g.classList.remove('exiting');
    g.style.opacity='0';
    const wake=g.querySelector('.ard-wake'); if(wake) wake.remove();
    const d=bodyPath(arrow.cells);
    strokes.forEach(p=>{
      p.style.transition='none';
      p.setAttribute('d',d);
      p.style.strokeDasharray='none';
      p.style.strokeDashoffset='0';
    });
    head.style.transition='none';
    head.setAttribute('d',headPath(arrow.cells,arrow.dir));
    head.style.transform='none';
    void svg.getBBox();
    strokes.forEach(p=>{ p.style.transition=''; });
    head.style.transition='';
    g.style.transition='opacity .5s ease';
    g.style.opacity='1';
  }

  // "Sürekli canlı" koreografi: eskiden tüm oklar çıkıp grid uzun süre BOŞ
  // kalıyordu (cihazda gözlemlendi). Artık her seferinde tek ok çıkar ve bir
  // süre sonra geri belirir; tahtada her an en az yarısı kalır — hero asla
  // boşalmaz, sürekli hareket ama hiç boşluk.
  let step=0;
  const present = nodes.map(()=>true);
  function drawFn(){
    step++;
    if(step%36===0){
      const live = nodes.map((_,i)=>i).filter(i=>present[i]);
      if(live.length > nodes.length/2){          // yarıdan azına düşürme
        const i = live[Math.floor(Math.random()*live.length)];
        present[i] = false;
        exit(nodes[i]);
        setTimeout(()=>{
          if(!nodes[i].g.isConnected) return;    // demo yok edildi — dokunma
          restore(nodes[i]);
          present[i] = true;
        }, EXIT_MS + 1400);
      }
    }
  }
  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
};

// ———————— 10. Akış Bağlantı Demo ————————
MiniDemos.demo_flowConnect = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const G=6;
  const FLOWS = [
    {c:'#ef4444',path:[[0,0],[0,1],[0,2],[1,2],[2,2],[2,1],[2,0]]},   // Kırmızı: L şekli
    {c:'#3b82f6',path:[[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]]},          // Mavi: düz çizgi
    {c:'#22c55e',path:[[3,0],[3,1],[4,1],[5,1],[5,2],[5,3]]},          // Yeşil: merdiven
    {c:'#eab308',path:[[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5]]},    // Sarı: kenar
    {c:'#a855f7',path:[[4,0],[5,0],[5,1],[4,2],[3,2],[3,3],[4,3],[4,4],[5,4]]}, // Mor: yılan
  ];
  
  const scene = document.createElement('div');
  scene.style.cssText = 'width:85%;max-width:260px;display:flex;flex-direction:column;align-items:center;gap:8px;';
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;';
  header.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:700;">6x6</span><span style="font-size:12px;color:rgba(255,255,255,0.3);font-weight:600;">Akış: 0/5</span><span style="font-size:12px;color:rgba(255,255,255,0.25);">Boru: 0%</span>';
  scene.appendChild(header);
  
  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat('+G+',1fr);gap:2px;width:100%;aspect-ratio:1;background:rgba(255,255,255,0.03);border-radius:10px;padding:3px;border:1px solid rgba(255,255,255,0.06);';
  const cells = [];
  for(let y=0;y<G;y++) for(let x=0;x<G;x++){
    const c = document.createElement('div');
    c.style.cssText = 'border-radius:4px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;transition:all 0.3s;aspect-ratio:1;position:relative;';
    gridEl.appendChild(c);cells.push(c);
  }
  scene.appendChild(gridEl);
  el.appendChild(scene);
  
  // Place dots
  FLOWS.forEach(f=>{
    const start=f.path[0], end=f.path[f.path.length-1];
    [start,end].forEach(([y,x])=>{
      const c=cells[y*G+x];
      const dot=document.createElement('div');
      dot.style.cssText='width:70%;height:70%;border-radius:50%;background:'+f.c+';box-shadow:0 0 8px '+f.c+'80;position:absolute;';
      c.appendChild(dot);
      c.dataset.dot='1';
    });
  });
  
  let step=0, flowIdx=0, pathStep=0;
  function drawFn(){
    step++;
    if(flowIdx<FLOWS.length){
      if(step%8===0){ // Draw path step by step (fast)
        const f=FLOWS[flowIdx];
        if(pathStep<f.path.length){
          const [y,x]=f.path[pathStep];
          const c=cells[y*G+x];
          if(!c.dataset.dot){
            c.style.background=f.c+'30';
            c.style.boxShadow='inset 0 0 8px '+f.c+'20';
            // Add pipe segment
            const pipe=document.createElement('div');
            pipe.style.cssText='width:60%;height:60%;border-radius:3px;background:'+f.c+'90;position:absolute;transition:all 0.2s;transform:scale(0);';
            c.appendChild(pipe);
            setTimeout(()=>{pipe.style.transform='scale(1)'},30);
          }
          pathStep++;
        } else {
          flowIdx++;pathStep=0;
          // Update header
          header.children[1].textContent='Akış: '+flowIdx+'/5';
          header.children[2].textContent='Boru: '+Math.round(flowIdx*20)+'%';
        }
      }
    }
    // Reset after all drawn
    if(flowIdx>=FLOWS.length && step%200===0){
      cells.forEach(c=>{
        while(c.children.length>0){
          if(c.children[0].style.borderRadius==='50%'){break;} // Keep dots
          if(c.children.length<=1 && c.dataset.dot) break;
          c.removeChild(c.lastChild);
        }
        if(!c.dataset.dot){c.style.background='rgba(255,255,255,0.03)';c.style.boxShadow='none';c.innerHTML='';}
      });
      flowIdx=0;pathStep=0;step=0;
      header.children[1].textContent='Akış: 0/5';
      header.children[2].textContent='Boru: 0%';
    }
  }
  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
};

// ———————— 11. Resim Kaydır (Photo Slider Puzzle) Demo ————————
MiniDemos.demo_jigsawCard = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  // Eski demo bir gradyan renk matrisiyle fotoğraf TAKLİT ediyordu ve
  // parçalar yerinde renk değiştiriyordu — oyunun mekaniği bu değil.
  // Bu demo gerçek oyunun kendisini gösteriyor: gerçek bir fotoğraf,
  // background-position ile parçalanmış, ve yalnızca BOŞLUĞA DİK KOMŞU
  // parçalar kayıyor. Oyundaki numara rozetleri ve hedef önizlemesi de var.
  const G = 3;                       // kart boyunda 4x4 okunmuyor, 3x3 doğru
  // Havuzdaki mou-3: Samanyolu + dağ silueti, mor gökyüzü. Kartın Magic
  // Night gradyanıyla aynı aile, ve dağ silueti 3x3'e bölününce parçalar
  // birbirinden net ayrışıyor — küçük kartta okunabilirliğin şartı bu.
  const URL = 'https://images.unsplash.com/photo-1519681393784-d120267933ba' +
              '?w=600&h=600&fit=crop&q=80';

  if(!document.getElementById('css-jig-demo2')){
    const s=document.createElement('style');s.id='css-jig-demo2';
    s.textContent =
      '.jgd-board{position:relative;width:100%;aspect-ratio:1;border-radius:14px;'+
        'overflow:hidden;border:1px solid rgba(180,165,255,.22);'+
        'box-shadow:0 18px 40px -16px rgba(4,6,22,.9),inset 0 1px 0 rgba(205,195,255,.18)}'+
      // Kayma animasyonu: transform geçişi. Oyunda da aynı yaklaşım.
      '.jgd-tile{position:absolute;top:0;left:0;background-repeat:no-repeat;'+
        'border-radius:6px;outline:1px solid rgba(8,8,22,.5);'+
        'transition:transform .34s cubic-bezier(.34,1.4,.64,1)}'+
      '.jgd-tile::after{content:attr(data-num);position:absolute;top:2px;left:2px;'+
        'min-width:13px;height:13px;padding:0 3px;border-radius:4px;'+
        'background:rgba(8,8,20,.72);color:#fff;'+
        'font:700 9px/13px system-ui,sans-serif;text-align:center}'+
      '.jgd-goal{position:absolute;right:8px;top:8px;width:44px;height:44px;'+
        'border-radius:8px;background-size:cover;z-index:5;'+
        'border:1px solid rgba(205,195,255,.35);box-shadow:0 6px 16px -6px #000c}'+
      '.jgd-dust{position:absolute;border-radius:50%;pointer-events:none;'+
        'background:radial-gradient(circle,#EAF0FF,rgba(190,205,255,.6) 55%,transparent);'+
        'box-shadow:0 0 5px 1px rgba(165,190,255,.4);animation:_jgdDrift linear infinite}'+
      '@keyframes _jgdDrift{0%{transform:translateY(0);opacity:0}15%{opacity:.7}'+
        '100%{transform:translateY(-60px);opacity:0}}';
    document.head.appendChild(s);
  }

  for(let i=0;i<10;i++){
    const d=document.createElement('div'); const sz=1.5+Math.random()*2;
    d.className='jgd-dust';
    d.style.cssText+='width:'+sz+'px;height:'+sz+'px;left:'+(6+Math.random()*88)+'%;'+
      'top:'+(30+Math.random()*60)+'%;animation-duration:'+(4000+Math.random()*3500)+'ms;'+
      'animation-delay:'+(-Math.random()*6000)+'ms';
    el.appendChild(d);
  }

  const scene=document.createElement('div');
  scene.style.cssText='width:76%;max-width:240px;position:relative;z-index:1';
  const boardEl=document.createElement('div');
  boardEl.className='jgd-board';
  const goal=document.createElement('div');
  goal.className='jgd-goal';
  goal.style.backgroundImage='url("'+URL+'")';
  scene.appendChild(boardEl); scene.appendChild(goal); el.appendChild(scene);

  // ── Durum: board[i] = o hücredeki parçanın ev indeksi, boşluk null ──
  let board=[]; for(let i=0;i<G*G-1;i++) board.push(i); board.push(null);
  const tiles=new Map();
  const nbOf=i=>{const c=i%G,r=(i-c)/G,o=[];
    if(r>0)o.push(i-G); if(r<G-1)o.push(i+G);
    if(c>0)o.push(i-1); if(c<G-1)o.push(i+1); return o;};
  const blank=()=>board.indexOf(null);

  function place(t,idx){
    const c=idx%G,r=(idx-c)/G,p=100/G;
    t.style.width=p+'%'; t.style.height=p+'%';
    t.style.transform='translate('+(c*100)+'%,'+(r*100)+'%)';
  }
  function build(){
    boardEl.innerHTML='';
    tiles.clear();
    const d=G-1;
    for(let i=0;i<G*G;i++){
      const v=board[i]; if(v===null) continue;
      const t=document.createElement('div');
      t.className='jgd-tile';
      t.dataset.num=String(v+1);
      const c=v%G, r=(v-c)/G;
      t.style.backgroundImage='url("'+URL+'")';
      t.style.backgroundSize=(G*100)+'% '+(G*100)+'%';
      t.style.backgroundPosition=(c/d*100)+'% '+(r/d*100)+'%';
      place(t,i);
      boardEl.appendChild(t); tiles.set(v,t);
    }
  }
  function move(i){
    const z=blank();
    board[z]=board[i]; board[i]=null;
    const t=tiles.get(board[z]); if(t) place(t,z);
  }
  // Çözülmüş hâlden geçerli hamlelerle karıştır — demoda da çözülebilir kalsın
  function scramble(n){
    let prev=-1;
    for(let s=0;s<n;s++){
      const opts=nbOf(blank()).filter(i=>i!==prev);
      const pick=opts[Math.floor(Math.random()*opts.length)];
      prev=blank(); move(pick);
    }
  }
  scramble(40); build();

  let step=0, prev=-1;
  function drawFn(){
    step++;
    if(step%18===0){                    // ~0.6 sn'de bir hamle
      const opts=nbOf(blank()).filter(i=>i!==prev);
      const pick=opts[Math.floor(Math.random()*opts.length)];
      prev=blank(); move(pick);
    }
    if(step%600===0){ scramble(40); build(); }   // ara ara yeniden karıştır
  }
  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
};

// ———————— 12. Yılan Demo ————————
// Kendi kendine oynayan klasik yılan. Diğer demolar gibi DOM ızgarası:
// 117 hücre, kare başına yalnızca değişen hücreler boyanıyor.
// Renkler oyunun kendi paletinden (games.js snakeGame) — kart ile oyunun
// aynı şey olduğu ilk bakışta anlaşılmalı.
MiniDemos.demo_snake = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const CO = 13, RO = 9;
  const EMPTY = 'rgba(255,255,255,0.04)';
  // Oyunun 3. tasarımıyla aynı dil: neon yeşil cam gövde, DOLU parlak baş,
  // çift tonlu (camgöbeği→macenta) elmas, lacivert arena, soluk çerçeve.
  const BODY = 'linear-gradient(180deg,rgba(46,214,96,.42),rgba(14,120,52,.42))';
  const HEAD = 'linear-gradient(180deg,#4bf07f,#16a341)';
  const FOOD = 'linear-gradient(180deg,#8df3ff,#57d8ff 42%,#b06bff 58%,#e79bff)';

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat('+CO+',1fr);gap:2px;width:92%;max-width:300px;aspect-ratio:'+CO+'/'+RO+';padding:6px;border-radius:12px;border:1.5px solid rgba(206,214,255,.7);box-shadow:0 0 16px rgba(150,175,255,.22);background:rgba(6,11,34,.5);';
  const cells = [];
  for (let i=0;i<CO*RO;i++) {
    const c = document.createElement('div');
    c.style.cssText = 'border-radius:3px;background:'+EMPTY+';transition:background .12s;';
    gridEl.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gridEl);

  let snake, food, dir;
  function paint() {
    for (let i=0;i<cells.length;i++) {
      const c = cells[i];
      c.style.background = EMPTY;
      c.style.boxShadow = 'none';
      c.style.clipPath = 'none';
      c.style.border = 'none';
      c.style.borderRadius = '3px';
    }
    snake.forEach((p, i) => {
      const c = cells[p.y*CO+p.x];
      // i===0 baş: oyundaki gibi opak, daha parlak ve YUVARLAK.
      c.style.background = i === 0 ? HEAD : BODY;
      c.style.boxShadow = '0 0 6px rgba(60,255,120,.5)';
      if (i === 0) c.style.borderRadius = '40%';
      else c.style.border = '1px solid rgba(92,255,133,.75)';
    });
    if (food) {
      const c = cells[food.y*CO+food.x];
      c.style.background = FOOD;
      c.style.boxShadow = '0 0 8px rgba(130,220,255,.65)';
      c.style.clipPath = 'polygon(50% 0,100% 38%,50% 100%,0 38%)';   // elmas silueti
    }
  }
  function occupied(x,y) { return snake.some(p => p.x===x && p.y===y); }
  function newFood() {
    const free = [];
    for (let y=0;y<RO;y++) for (let x=0;x<CO;x++) if(!occupied(x,y)) free.push({x,y});
    food = free.length ? free[Math.floor(Math.random()*free.length)] : null;
  }
  function reset() {
    snake = [{x:4,y:4},{x:3,y:4},{x:2,y:4}];
    dir = {x:1,y:0};
    newFood();
    paint();
  }
  // Açgözlü yön seçimi: yeme yaklaştıran, duvara/kendine çarpmayan hamle.
  // Demoda mükemmel oynamak gerekmiyor, "yılan gibi davranması" yeterli.
  function chooseDir() {
    const h = snake[0];
    const opts = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]
      .filter(d => !(d.x===-dir.x && d.y===-dir.y))
      .filter(d => {
        const nx=h.x+d.x, ny=h.y+d.y;
        if (nx<0||nx>=CO||ny<0||ny>=RO) return false;
        const tail = snake[snake.length-1];
        if (occupied(nx,ny) && !(nx===tail.x && ny===tail.y)) return false;
        return true;
      });
    if (!opts.length) return null;
    if (!food) return opts[0];
    opts.sort((a,b) =>
      (Math.abs(h.x+a.x-food.x)+Math.abs(h.y+a.y-food.y)) -
      (Math.abs(h.x+b.x-food.x)+Math.abs(h.y+b.y-food.y)));
    return opts[0];
  }
  reset();

  let step = 0;
  function drawFn() {
    step++;
    if (step % 9 !== 0) return;              // ~3.3 hamle/sn
    const nd = chooseDir();
    if (!nd) { reset(); return; }
    dir = nd;
    const h = snake[0];
    const nx = h.x+dir.x, ny = h.y+dir.y;
    const grow = food && nx===food.x && ny===food.y;
    if (!grow) snake.pop();
    snake.unshift({x:nx,y:ny});
    if (grow) newFood();
    if (snake.length > 15) { reset(); return; }
    paint();
  }
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused=true; },
    resume() { if(state.paused){ state.paused=false; _demoLoop(state,drawFn); } },
    destroy() { state.paused=true; cancelAnimationFrame(state.raf); el.innerHTML=''; }
  };
};

// ———————— 13. Flappy UFO Demo ————————
// 2026-08-08'de BAŞTAN yazıldı. Öncesi DOM'du ve sahibin bildirdiği hata
// oradaydı: "UFO sanki engellerin içinden geçiyor". İki sebebi vardı ve
// ikisi de DOM yaklaşımının doğrudan sonucuydu —
//   1) konumlar yüzde tabanlı `transform: translate(%)` ile yazılıyordu ve
//      yüzde, elemanın KENDİ boyutuna göre çözülür; sütun ile UFO farklı
//      genişlikte olduğu için ikisi aynı koordinat sisteminde değildi,
//   2) otomatik pilot yalnızca "yeme yaklaş" mantığıyla sürüyordu, boşluğun
//      kenarlarını hiç hesaba katmıyordu.
// Kart oyunun ne olduğunu anlatmak zorunda; içinden geçilen bir engel
// oyuncuya yalan söylüyordu.
//
// Çözüm CANVAS: oyunun kendisi de canvas (games.js flappyUfo) ve tek bir
// piksel koordinat sistemi olunca "içinden geçme" sınıfı hata mümkün
// değil — çarpışma ile çizim aynı sayılardan besleniyor. Ayrıca kart
// oyunla aynı görsel dili taşıyor: aynı palet, aynı neon sütun, aynı
// kubbeli UFO, UFO'nun yolunu takip eden aynı iz.
//
// MALİYET: 240×192'lik tek tuval, kare başına ~10 çizim çağrısı. Diğer
// demoların DOM ızgaralarından pahalı değil.
MiniDemos.demo_flappyUfo = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };

  const CW = 240, CH = 192;                 // tuval (mantıksal piksel)
  const cv = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = CW * dpr; cv.height = CH * dpr;
  cv.style.cssText = 'width:92%;max-width:300px;aspect-ratio:'+CW+'/'+CH+';'
    + 'display:block;border-radius:12px;border:1px solid rgba(126,110,220,.34);'
    + 'background:linear-gradient(180deg,#060b22,#0a1436 46%,#101d46);';
  el.appendChild(cv);
  const x = cv.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Oyunun oranlarının küçültülmüş hâli (games.js W bloğu). Birebir aynı
  // sayılar değil — kart bir vitrin, oyun değil — ama aynı ORAN: boşluk
  // yüksekliğin ~%25'i, sütun genişliğin ~%13'ü.
  const GROUND = CH * 0.20;                 // dağ şeridi
  const SKY = CH - GROUND;
  const PW = 30, GAP = 62, SPACING = 132, SPEED = 0.62;
  const GRAV = 0.052, FLAP = -1.45, UX = 74, UR = 9;
  const UW = 30, UH = 18;                   // UFO çizim ölçüsü (≠ UR)

  let uy, vy, pipes, trail;
  function reset() {
    uy = SKY * 0.45; vy = 0; trail = [];
    pipes = [
      { x: CW + 30,           gap: SKY * 0.45 },
      { x: CW + 30 + SPACING, gap: SKY * 0.60 },
    ];
  }
  reset();

  // Dağ silueti — bir kez üretilip saklanıyor (kare başına yeniden
  // hesaplamak anlamsız). Oyunla aynı fikir: kırık çizgi + karlı sırt.
  const ridge = (() => {
    let s = 20260808;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const pts = [];
    for (let i = 0; i <= 26; i++) pts.push(i % 2 === 0 ? 0.45 + rnd() * 0.55 : 0.10 + rnd() * 0.25);
    pts[26] = pts[0];
    return pts;
  })();

  function drawMountains() {
    const base = CH, top = CH - GROUND;
    const g = x.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, 'rgba(206,228,255,.85)');
    g.addColorStop(0.5, 'rgba(58,88,152,.9)');
    g.addColorStop(1, 'rgba(8,14,40,.98)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, base);
    for (let i = 0; i < ridge.length; i++) {
      x.lineTo((i * CW) / (ridge.length - 1), base - GROUND * ridge[i]);
    }
    x.lineTo(CW, base);
    x.closePath();
    x.fill();
  }

  function drawPipe(px, gapY) {
    const gt = gapY - GAP / 2, gb = gapY + GAP / 2;
    const g = x.createLinearGradient(px - PW / 2, 0, px + PW / 2, 0);
    g.addColorStop(0, '#7fe3ff'); g.addColorStop(0.07, '#2b7fd4');
    g.addColorStop(0.20, '#101a46'); g.addColorStop(0.5, '#070c26');
    g.addColorStop(0.80, '#101a46'); g.addColorStop(0.93, '#2b7fd4');
    g.addColorStop(1, '#7fe3ff');
    x.fillStyle = g;
    x.fillRect(px - PW / 2, 0, PW, gt);
    x.fillRect(px - PW / 2, gb, PW, CH - gb);
    // Bilezikler
    x.fillStyle = '#141d44';
    x.strokeStyle = '#9b8cff';
    x.lineWidth = 1;
    const cw = PW * 1.26, ch = 8;
    [gt - ch, gb].forEach((cy) => {
      x.fillRect(px - cw / 2, cy, cw, ch);
      x.strokeRect(px - cw / 2 + 0.5, cy + 0.5, cw - 1, ch - 1);
    });
  }

  function drawUfo() {
    // İz — oyundaki gibi UFO'nun GERÇEK yolunu takip ediyor.
    if (trail.length > 1) {
      const len = 62;
      const hw = (p) => 3.4 * Math.max(0, 1 - (UX - p.x) / len);
      x.beginPath();
      x.moveTo(UX, uy - 3.4);
      for (let i = trail.length - 1; i >= 0; i--) x.lineTo(trail[i].x, trail[i].y - hw(trail[i]));
      for (let i = 0; i < trail.length; i++) x.lineTo(trail[i].x, trail[i].y + hw(trail[i]));
      x.closePath();
      const tg = x.createLinearGradient(UX - len, 0, UX, 0);
      tg.addColorStop(0, 'rgba(120,220,255,0)');
      tg.addColorStop(0.7, 'rgba(120,220,255,.45)');
      tg.addColorStop(1, 'rgba(200,246,255,.92)');
      x.fillStyle = tg;
      x.fill();
    }
    // Gövde + kubbe + lambalar (oyunun sadeleştirilmiş hâli).
    const hg = x.createLinearGradient(0, uy - UH * 0.3, 0, uy + UH * 0.3);
    hg.addColorStop(0, '#33477f'); hg.addColorStop(1, '#0b1230');
    x.fillStyle = hg;
    x.beginPath(); x.ellipse(UX, uy, UW / 2, UH * 0.24, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#9ed8ff'; x.lineWidth = 1; x.stroke();
    const dg = x.createLinearGradient(0, uy - UH * 0.62, 0, uy);
    dg.addColorStop(0, '#4a6ba8'); dg.addColorStop(1, '#0a1026');
    x.fillStyle = dg;
    x.beginPath(); x.ellipse(UX, uy - UH * 0.10, UW * 0.28, UH * 0.42, 0, Math.PI, 0); x.fill();
    x.strokeStyle = 'rgba(158,216,255,.75)'; x.stroke();
    x.fillStyle = '#7ff0ff';
    [-0.28, 0, 0.28].forEach((f) => {
      x.beginPath(); x.arc(UX + UW * f, uy + UH * 0.16, 1.5, 0, Math.PI * 2); x.fill();
    });
  }

  // Otomatik pilot: bir SONRAKİ engelin boşluk merkezini hedefler ve
  // yalnızca hedefin ALTINA düşerken çırpar. Eski sürümün hatası bu
  // hedefin hiç hesaplanmamasıydı.
  function autopilot() {
    let next = null;
    for (const p of pipes) {
      if (p.x + PW / 2 >= UX - 4 && (!next || p.x < next.x)) next = p;
    }
    const target = next ? next.gap : SKY * 0.5;
    // Öngörü: mevcut hızla 9 kare sonra nerede olacağım? Yalnızca anlık
    // konuma bakmak, ağır düşerken çok geç çırpmaya yol açıyordu.
    const ahead = uy + vy * 9 + 0.5 * GRAV * 81;
    if (ahead > target && vy > -0.9) vy = FLAP;
  }

  let step = 0;
  function drawFn() {
    step++;
    autopilot();
    vy += GRAV;
    if (vy > 3.2) vy = 3.2;
    uy += vy;
    // Kart hiç "ölmez": vitrin, meydan okuma değil. Sınırlarda yumuşak
    // yakalama — ama engellerin İÇİNDEN asla geçmez, otomatik pilot
    // boşluğu hedeflediği için.
    if (uy < UR + 2) { uy = UR + 2; vy = 0; }
    if (uy > SKY - UR) { uy = SKY - UR; vy = 0; }

    for (const p of pipes) {
      p.x -= SPEED;
      if (p.x < -PW) {
        p.x += SPACING * pipes.length;
        p.gap = SKY * (0.28 + Math.random() * 0.46);
      }
    }

    // İz geçmişi — oyundakiyle aynı mantık: noktalar engellerle aynı
    // hızda geriye kayıyor.
    for (const t of trail) t.x -= SPEED;
    const last = trail.length ? trail[trail.length - 1] : null;
    if (!last || UX - last.x >= 3) trail.push({ x: UX, y: uy });
    while (trail.length && UX - trail[0].x > 62) trail.shift();

    x.clearRect(0, 0, CW, CH);
    drawMountains();
    for (const p of pipes) drawPipe(p.x, p.gap);
    drawUfo();
  }

  drawFn();
  _demoLoop(state, drawFn);

  return {
    el,
    pause() { state.paused = true; },
    resume() { if (state.paused) { state.paused = false; _demoLoop(state, drawFn); } },
    destroy() { state.paused = true; cancelAnimationFrame(state.raf); el.innerHTML = ''; }
  };
};
// ===== DEMO EŞLEME =====

function getDemoFactory(game) {
  switch(game.id) {
    case 'screwPuzzle': return MiniDemos.demo_screw;
    case 'blockPuzzle': return MiniDemos.demo_blockPuzzle;
    case 'game2048':    return MiniDemos.demo_2048;
    case 'memoryGame':  return MiniDemos.demo_memory;
    case 'wordSearch':  return MiniDemos.demo_wordSearch;
    case 'sudoku':      return MiniDemos.demo_sudoku;
    case 'mazeGame':    return MiniDemos.demo_maze;
    case 'waterSort':   return MiniDemos.demo_waterSort;
    case 'arrowPuzzle': return MiniDemos.demo_arrowPuzzle;
    case 'flowConnect': return MiniDemos.demo_flowConnect;
    case 'jigsawCard':  return MiniDemos.demo_jigsawCard;
    case 'snakeGame':   return MiniDemos.demo_snake;
    case 'flappyUfo':   return MiniDemos.demo_flappyUfo;
    default:            return MiniDemos.demo_blockPuzzle; // fallback
  }
}

// ===== SEEDED RATINGS (deterministic per game) =====
function _gameRating(id) {
  let h=0;
  for(let i=0;i<id.length;i++) h=((h<<5)-h)+id.charCodeAt(i);
  return (4.0 + (Math.abs(h)%10)*0.1).toFixed(1);
}

// ===== REELS ENGINE (Sonsuz Döngü) =====

window.ReelsEngine = (function() {
  let _observer = null;
  let _container = null;
  let _scrollEl = null;
  let _cards = [];
  let _globalIdx = 0;        // toplam oluşturulan kart sayısı
  let _recentIds = [];        // son N oyun id'si (tekrar engelleme)
  let _isLoading = false;     // batch yükleniyor mu
  const BATCH_SIZE = 6;       // her seferde eklenecek kart
  const NO_REPEAT_WINDOW = 4; // aynı oyun en az bu kadar sonra tekrar gelir
  const MAX_DOM_CARDS = 24;   // DOM'da maksimum kart (performans)

  // ===== Kullanıcı Davranış Altyapısı =====
  // İleride: oynanma verisine göre ağırlıklı seçim
  const _userWeights = {};
  function _recordInteraction(gameId, type) {
    // type: 'play', 'favorite', 'view'
    if (!_userWeights[gameId]) _userWeights[gameId] = { play:0, fav:0, view:0 };
    _userWeights[gameId][type] = (_userWeights[gameId][type]||0) + 1;
    try { localStorage.setItem('gh_weights', JSON.stringify(_userWeights)); } catch(e){}
  }
  function _loadWeights() {
    try {
      const saved = JSON.parse(localStorage.getItem('gh_weights')||'{}');
      Object.assign(_userWeights, saved);
    } catch(e){}
  }

  // ===== Akıllı Kuyruk =====
  function _pickNextGame() {
    // Aynı oyun son NO_REPEAT_WINDOW içinde tekrar gelmesin
    const available = REEL_GAMES.filter(g => {
      const lastIdx = _recentIds.lastIndexOf(g.id);
      return lastIdx < 0 || (_recentIds.length - lastIdx) >= NO_REPEAT_WINDOW;
    });
    // Eğer tüm oyunlar recently gösterildiyse, en az tekrar edeni seç
    const pool = available.length > 0 ? available : REEL_GAMES;
    // Rastgele seç
    const picked = pool[Math.floor(Math.random() * pool.length)];
    _recentIds.push(picked.id);
    // Hafızayı sınırla
    if (_recentIds.length > 50) _recentIds = _recentIds.slice(-30);
    return picked;
  }

  // İlk kart her zaman görsel olarak zengin, atmosferli bir demo olsun —
  // Discover'ın ilk izlenimi "wow" olmalı, seyrek bir demoyla açılmamalı.
  const HERO_FIRST = ['waterSort', 'arrowPuzzle', 'jigsawCard', 'blockPuzzle'];

  function _generateBatch(count) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      // Yalnızca en baştaki kart (ilk batch'in ilk elemanı) küratörlü.
      if (_globalIdx === 0 && i === 0) {
        const heroes = REEL_GAMES.filter(g => HERO_FIRST.includes(g.id) && g.playable);
        const pick = heroes[Math.floor(Math.random() * heroes.length)];
        if (pick) { _recentIds.push(pick.id); batch.push(pick); continue; }
      }
      batch.push(_pickNextGame());
    }
    return batch;
  }

  function _injectCSS() {
    injectStyle('css-reels', `
      .reels-container{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
      .reels-container::-webkit-scrollbar{display:none}

      .reel-card{height:100%;scroll-snap-align:start;scroll-snap-stop:always;position:relative;display:flex;flex-direction:column;overflow:hidden}

      .reel-bg{position:absolute;inset:0;z-index:0;opacity:0.85}

      .reel-demo-area{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;z-index:1;min-height:0}
      .reel-demo-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative}
      .reel-demo-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.25) 100%);z-index:2;pointer-events:none}

      .reel-info{position:absolute;bottom:0;left:0;right:0;padding:24px 20px 30px;background:linear-gradient(transparent,rgba(0,0,0,0.72) 22%,rgba(0,0,0,0.9));z-index:10;animation:reelInfoIn 0.5s ease backwards}

      .reel-game-emoji{font-size:36px;display:inline-block;margin-right:8px;vertical-align:middle;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))}
      .reel-game-name{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.5);line-height:1.2;display:inline;vertical-align:middle}
      .reel-desc{font-size:14px;color:rgba(255,255,255,0.72);margin:10px 0 16px;line-height:1.45}

      .reel-stats{display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap}
      .reel-stat{display:flex;align-items:center;gap:4px;font-size:12px;color:rgba(255,255,255,0.65);font-weight:600}
      .reel-stat-val{color:#fff;font-weight:700}
      .reel-diff-badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px}
      .reel-diff-badge.easy{background:rgba(34,197,94,0.2);color:#86efac}
      .reel-diff-badge.medium{background:rgba(234,179,8,0.2);color:#fde047}
      .reel-diff-badge.hard{background:rgba(239,68,68,0.2);color:#fca5a5}
      .reel-highscore{font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px}
      .reel-highscore span{color:#fbbf24;font-weight:800}

      /* Sakin premium CTA: sürekli pulse + shine kaldırıldı (§2.5 restraint —
         demo/atmosfer/CTA aynı anda yarışmasın). Soft-solid: üst catch-light
         inline gradyanla, temiz gölge, yalnızca :active geri bildirim. */
      .reel-play-btn{width:100%;padding:17px;border-radius:16px;font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:#fff;border:none;cursor:pointer;letter-spacing:0.3px;box-shadow:0 8px 24px -6px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.22);-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;margin-top:8px;transition:transform .12s ease}
      .reel-play-btn:active{transform:scale(0.97)}

      .reel-actions{position:absolute;right:12px;bottom:200px;display:flex;flex-direction:column;align-items:center;gap:20px;z-index:15}
      .reel-action-btn{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .reel-action-btn .act-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.25s;border:1px solid rgba(255,255,255,0.06)}
      .reel-action-btn .act-label{font-size:10px;color:rgba(255,255,255,0.6);font-weight:600}
      .reel-action-btn:active .act-icon{transform:scale(0.9)}

      .reel-action-btn.fav-active .act-icon{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.3)}

      .reel-swipe-hint{position:absolute;bottom:24%;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;z-index:20;animation:reelSwipeHint 1.8s ease-in-out infinite;pointer-events:none;transition:opacity .6s ease}
      .reel-swipe-hint .hint-arrow{font-size:22px;color:rgba(255,255,255,0.5)}
      .reel-swipe-hint .hint-text{font-size:10px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:0.5px}

      .reel-card-counter{position:absolute;top:16px;left:16px;z-index:12;padding:4px 12px;border-radius:20px;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:11px;color:rgba(255,255,255,0.6);font-weight:700;border:1px solid rgba(255,255,255,0.06)}

      @keyframes reelInfoIn{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes reelSwipeHint{0%,100%{transform:translateX(-50%) translateY(0);opacity:0.5}50%{transform:translateX(-50%) translateY(-12px);opacity:1}}
      @keyframes reelCardIn{0%{opacity:0;transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}
    `);
  }

  function _diffClass(d) {
    if(d==='Kolay') return 'easy';
    if(d==='Orta') return 'medium';
    return 'hard';
  }

  // Zorluğu oyunun KENDİSİ bildirebilir. Sudoku'da zorluk oyuncu
  // tarafından seçiliyor; sabit etiket "Zor" yazıp Kolay bulmaca vermek
  // kartın yalan söylemesi demekti. Oyun `difficultyLabel` gösterirse o
  // kullanılır, yoksa REEL_GAMES'teki statik etikete düşülür.
  // Genel bir mekanizma: seçilebilir zorluğu olan her oyun aynı şekilde
  // katılır, reels.js'in o oyunu tanımasına gerek kalmadan.
  function _liveDifficulty(game) {
    try {
      const g = (typeof PuzzleGames !== 'undefined') ? PuzzleGames[game.id] : null;
      if (g && typeof g.difficultyLabel === 'string') return g.difficultyLabel;
    } catch(e) {}
    return game.difficulty;
  }

  function _buildCard(game, idx) {
    const card = document.createElement('div');
    card.className = 'reel-card';
    card.dataset.gameId = game.id;
    card.dataset.idx = idx;

    // Background gradient
    const bg = document.createElement('div');
    bg.className = 'reel-bg';
    bg.style.background = 'linear-gradient(160deg,'+game.gradient[0]+' 0%,'+game.gradient[1]+' 100%)';
    card.appendChild(bg);

    // Demo area
    const demoArea = document.createElement('div');
    demoArea.className = 'reel-demo-area';
    const overlay = document.createElement('div');
    overlay.className = 'reel-demo-overlay';
    demoArea.appendChild(overlay);
    card.appendChild(demoArea);

    // Counter — sonsuz feed'de sadece sıra numarası
    const counter = document.createElement('div');
    counter.className = 'reel-card-counter';
    counter.textContent = '#' + (idx + 1);
    card.appendChild(counter);

    // Info panel
    const info = document.createElement('div');
    info.className = 'reel-info';

    const titleRow = document.createElement('div');
    titleRow.innerHTML = '<span class="reel-game-emoji">'+game.emoji+'</span><span class="reel-game-name">'+game.name+'</span>';
    info.appendChild(titleRow);

    const desc = document.createElement('div');
    desc.className = 'reel-desc';
    desc.textContent = game.desc;
    info.appendChild(desc);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'reel-stats';
    const rating = _gameRating(game.id);
    stats.innerHTML =
      '<div class="reel-stat">⭐ <span class="reel-stat-val">'+rating+'</span></div>'+
      '<div class="reel-stat">🎮 <span class="reel-stat-val">'+getPlayCount(game.id)+'</span></div>'+
      '<span class="reel-diff-badge '+_diffClass(_liveDifficulty(game))+'">'+_liveDifficulty(game)+'</span>';
    info.appendChild(stats);

    // High score
    const hi = getHighScore(game.id);
    if(hi>0) {
      const hiEl = document.createElement('div');
      hiEl.className = 'reel-highscore';
      hiEl.innerHTML = '🏆 En Yüksek: <span>'+hi.toLocaleString()+'</span>';
      info.appendChild(hiEl);
    }

    // Play button
    const btn = document.createElement('button');
    btn.className = 'reel-play-btn';
    // Soft-solid: oyunun kendi rengini koru ama üste ince bir catch-light
    // katmanı bindir (§14) — düz gradyan yerine "basılabilir" premium yüzey.
    btn.style.background = 'linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 26%),linear-gradient(135deg,'+game.gradient[0]+','+game.gradient[1]+')';
    btn.textContent = game.playable ? '▶  OYNA' : '🔒  YAKINDA';
    btn.addEventListener('click', function() {
      if(game.playable) {
        incPlayCount(game.id);
        _recordInteraction(game.id, 'play');
        if(typeof playGame==='function') playGame(GAME_NAME_MAP[game.id]);
      } else {
        if(typeof showToast==='function') showToast('Yakında!');
      }
    });
    info.appendChild(btn);
    card.appendChild(info);

    // Right-side actions
    const actions = document.createElement('div');
    actions.className = 'reel-actions';

    // Favorite button
    const favBtn = document.createElement('div');
    favBtn.className = 'reel-action-btn'+(isFavorite(game.id)?' fav-active':'');
    favBtn.innerHTML = '<div class="act-icon">'+(isFavorite(game.id)?'❤️':'🤍')+'</div><span class="act-label">Favori</span>';
    favBtn.addEventListener('click', function() {
      const isNow = toggleFavorite(game.id);
      _recordInteraction(game.id, 'fav');
      favBtn.className = 'reel-action-btn'+(isNow?' fav-active':'');
      favBtn.querySelector('.act-icon').textContent = isNow?'❤️':'🤍';
      if (typeof GameAudio !== 'undefined') {
        GameAudio.play(isNow ? 'favorite' : 'unfavorite');
        GameAudio.haptic(isNow ? 'favorite' : 'micro');
      }
      if(typeof showToast==='function') showToast(isNow?'❤️ Favorilere eklendi':'💔 Favorilerden çıkarıldı');
    });
    actions.appendChild(favBtn);

    // Kategori etiketi butonu kaldırıldı — tıklanamaz/dekoratifti ve sağ
    // rayı kalabalıklaştırıyordu. Ray artık tek anlamlı eylemle (Favori) sade.
    card.appendChild(actions);

    // Swipe hint yalnızca ilk kartta — ve birkaç saniye sonra sönümlenir.
    // Sürekli hareket eden bir ipucu bırakmak "premium = sadelik" ile çelişir;
    // amacını (ilk kez kaydırmayı öğretmek) görünce kaybolmalı.
    if(idx === 0) {
      const hint = document.createElement('div');
      hint.className = 'reel-swipe-hint';
      hint.innerHTML = '<span class="hint-arrow">⬆</span><span class="hint-text">Kaydır</span>';
      card.appendChild(hint);
      setTimeout(() => {
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 700);
      }, 4200);
    }

    return { card, demoArea, gameId: game.id, game };
  }

  // ===== Sonsuz Yükleme =====
  function _appendBatch() {
    if (_isLoading || !_scrollEl) return;
    _isLoading = true;

    const batch = _generateBatch(BATCH_SIZE);
    batch.forEach(game => {
      const idx = _globalIdx++;
      const { card, demoArea, gameId } = _buildCard(game, idx);
      const item = { card, demoArea, gameId, game, demoInstance: null, active: false };
      _cards.push(item);
      _scrollEl.appendChild(card);
      if (_observer) _observer.observe(card);
      // Görüntülenme kaydı
      _recordInteraction(gameId, 'view');
    });

    // DOM temizliği — çok yukarıdaki kartları kaldır (performans)
    _cleanupOldCards();

    _isLoading = false;
  }

  function _cleanupOldCards() {
    // Aktif kartın index'ini bul
    const activeIdx = _cards.findIndex(c => c.active);
    if (activeIdx < 0) return;

    // Aktiften MAX_DOM_CARDS/2'den fazla uzaktaki eski kartları temizle
    const cleanThreshold = Math.floor(MAX_DOM_CARDS / 2);
    let cleaned = 0;

    while (_cards.length > MAX_DOM_CARDS && cleaned < 3) {
      const firstItem = _cards[0];
      const currentActiveIdx = _cards.findIndex(c => c.active);
      if (currentActiveIdx <= cleanThreshold) break; // aktife çok yakın, temizleme

      // Demo'yu yok et
      if (firstItem.demoInstance) {
        firstItem.demoInstance.destroy();
        firstItem.demoInstance = null;
      }
      // Observer'dan çıkar
      if (_observer) _observer.unobserve(firstItem.card);
      // DOM'dan kaldır
      if (firstItem.card.parentNode) firstItem.card.parentNode.removeChild(firstItem.card);
      // Diziden çıkar
      _cards.shift();
      cleaned++;
    }
  }

  // ===== Scroll Dinleyici =====
  function _onScroll() {
    if (!_scrollEl) return;
    const scrollTop = _scrollEl.scrollTop;
    const scrollHeight = _scrollEl.scrollHeight;
    const clientHeight = _scrollEl.clientHeight;

    // Sona 2 kart mesafe kaldığında yeni batch yükle
    if (scrollHeight - scrollTop - clientHeight < clientHeight * 2.5) {
      _appendBatch();
    }
  }

  // ===== Ana Fonksiyonlar =====
  function init(container) {
    _container = container;
    _globalIdx = 0;
    _recentIds = [];
    _isLoading = false;
    _cards = [];
    _loadWeights();
    _injectCSS();

    container.innerHTML = '';

    // Scroll container
    const scroll = document.createElement('div');
    scroll.className = 'reels-container';
    _scrollEl = scroll;

    container.appendChild(scroll);

    // IntersectionObserver
    _observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const card = entry.target;
        const item = _cards.find(c => c.card === card);
        if (!item) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          if (!item.active) {
            item.active = true;
            card.style.willChange = 'transform';
            _startDemo(item);
            // Reels kaydırma sesi
            if (typeof GameAudio !== 'undefined') { GameAudio.play('swipe'); GameAudio.haptic('swipe'); }
          }
        } else {
          if (item.active) {
            item.active = false;
            card.style.willChange = 'auto';
            _stopDemo(item);
          }
        }
      });
    }, { threshold: [0, 0.55, 1], root: scroll });

    // Scroll event — sonsuz yükleme tetikleyici
    scroll.addEventListener('scroll', _onScroll, { passive: true });

    // İlk batch'i yükle
    _appendBatch();

    // WOW — hero asla boş görünmesin: ilk kartın demosunu IntersectionObserver'ı
    // BEKLEMEDEN hemen başlat. Observer async tetiklendiği için giriş anında
    // hero bir kare boş kalıyordu (cihazda gözlemlendi). active=true set edildiği
    // için observer'ın ilk geri çağrısı bu kartı atlar — çift başlatma olmaz.
    if (_cards.length) {
      const first = _cards[0];
      first.active = true;
      first.card.style.willChange = 'transform';
      _startDemo(first);
    }
  }

  function _startDemo(item) {
    if (item.demoInstance) { item.demoInstance.resume(); return; }
    const factory = getDemoFactory(item.game);
    if (!factory) return;
    const demo = factory(item.game.gradient);
    item.demoInstance = demo;
    const overlay = item.demoArea.querySelector('.reel-demo-overlay');
    if (overlay) item.demoArea.insertBefore(demo.el, overlay);
    else item.demoArea.appendChild(demo.el);
  }

  function _stopDemo(item) {
    if (item.demoInstance) item.demoInstance.pause();
  }

  function cleanup() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    if (_scrollEl) _scrollEl.removeEventListener('scroll', _onScroll);
    _cards.forEach(item => {
      if (item.demoInstance) {
        item.demoInstance.destroy();
        item.demoInstance = null;
      }
    });
    _cards = [];
    _scrollEl = null;
    _globalIdx = 0;
    _recentIds = [];
    if (_container) _container.innerHTML = '';
  }

  return { init, cleanup };
})();

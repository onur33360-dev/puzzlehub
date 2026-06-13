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
  { id:'waterSort', name:'İksir Sıralama', emoji:'🧪', category:'puzzle', desc:'İksirleri sırala, renkleri ayır!', difficulty:'Orta', gradient:['#8b5cf6','#4c1d95'], playable:false },
  { id:'arrowPuzzle', name:'Ok Bulmaca', emoji:'🏹', category:'puzzle', desc:'Okları doğru sırayla çıkar!', difficulty:'Kolay', gradient:['#0ea5e9','#0c4a6e'], playable:false },
  { id:'flowConnect', name:'Akış Bağlantı', emoji:'🔗', category:'puzzle', desc:'Renkleri bağla, tahtayı doldur!', difficulty:'Zor', gradient:['#e11d48','#881337'], playable:false },
  { id:'jigsawCard', name:'Yapboz Kart', emoji:'🧩', category:'puzzle', desc:'Kartları sürükle, resmi tamamla!', difficulty:'Kolay', gradient:['#d97706','#78350f'], playable:false },
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
  'jigsawCard': 'Yapboz Kart'
};



// ===== localStorage YARDIMCILAR =====

function getPlayCount(id) { return parseInt(localStorage.getItem('gh_plays_'+id)||'0',10); }
function incPlayCount(id) { localStorage.setItem('gh_plays_'+id, (getPlayCount(id)+1).toString()); }
function getHighScore(id) {
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
  const POTIONS = [
    {color:'#a855f7', glow:'rgba(168,85,247,0.4)', name:'Büyü'},
    {color:'#22d3ee', glow:'rgba(34,211,238,0.4)', name:'Buz'},
    {color:'#ef4444', glow:'rgba(239,68,68,0.4)', name:'Ateş'},
    {color:'#22c55e', glow:'rgba(34,197,94,0.4)', name:'Zehir'},
    {color:'#fbbf24', glow:'rgba(251,191,36,0.4)', name:'Altın'},
  ];
  const TC=7, LY=4;
  
  // Container
  const scene = document.createElement('div');
  scene.style.cssText = 'width:92%;max-width:300px;display:flex;flex-direction:column;align-items:center;gap:12px;';
  
  // Magical particles background
  const particles = document.createElement('div');
  particles.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
  for(let i=0;i<12;i++){
    const p = document.createElement('div');
    const sz = 2+Math.random()*4;
    p.style.cssText = 'position:absolute;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:rgba(168,85,247,0.3);animation:_wsFloat '+(3+Math.random()*4)+'s ease-in-out infinite;left:'+(Math.random()*100)+'%;top:'+(Math.random()*100)+'%;animation-delay:'+(Math.random()*3)+'s;';
    particles.appendChild(p);
  }
  el.appendChild(particles);
  
  // Inject float animation
  if(!document.getElementById('css-ws-demo')){
    const s=document.createElement('style');s.id='css-ws-demo';
    s.textContent='@keyframes _wsFloat{0%,100%{transform:translateY(0) scale(1);opacity:0.3}50%{transform:translateY(-30px) scale(1.5);opacity:0.7}}@keyframes _wsPour{0%{transform:scaleY(1)}50%{transform:scaleY(0.3)}100%{transform:scaleY(1)}}@keyframes _wsGlow{0%,100%{box-shadow:0 0 8px rgba(168,85,247,0.2)}50%{box-shadow:0 0 20px rgba(168,85,247,0.5)}}';
    document.head.appendChild(s);
  }
  
  // Tubes
  const tubeWrap = document.createElement('div');
  tubeWrap.style.cssText = 'display:flex;gap:6px;align-items:flex-end;justify-content:center;width:100%;';
  const tubes = [];
  for(let t=0;t<TC;t++){
    const tube = document.createElement('div');
    const isEmpty = t >= TC-2;
    tube.style.cssText = 'width:34px;height:120px;border-radius:0 0 16px 16px;border:2px solid rgba(255,255,255,0.12);border-top:none;display:flex;flex-direction:column-reverse;padding:3px;gap:1px;background:rgba(0,0,0,0.25);backdrop-filter:blur(4px);position:relative;overflow:hidden;transition:all 0.3s;';
    // Glass highlight
    const gloss = document.createElement('div');
    gloss.style.cssText = 'position:absolute;top:0;left:2px;width:6px;height:100%;background:linear-gradient(180deg,rgba(255,255,255,0.08),transparent);border-radius:0 0 0 12px;pointer-events:none;';
    tube.appendChild(gloss);
    const layers = [];
    if(!isEmpty){
      for(let l=0;l<LY;l++){
        const ly = document.createElement('div');
        const pot = POTIONS[Math.floor(Math.random()*POTIONS.length)];
        ly.style.cssText = 'height:24%;border-radius:3px;background:linear-gradient(180deg,'+pot.color+' 0%,'+pot.color+'cc 100%);transition:all 0.6s cubic-bezier(.34,1.56,.64,1);position:relative;box-shadow:inset 0 2px 4px rgba(255,255,255,0.2),inset 0 -2px 4px rgba(0,0,0,0.3),0 0 6px '+pot.glow+';';
        ly.dataset.color = pot.color;
        tube.appendChild(ly);
        layers.push(ly);
      }
    }
    tubeWrap.appendChild(tube);
    tubes.push({el:tube, layers, empty:isEmpty});
  }
  scene.appendChild(tubeWrap);
  
  // Level indicator
  const lvl = document.createElement('div');
  lvl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:4px;';
  lvl.innerHTML = '<span style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:700;">SEVİYE 42</span><span style="font-size:11px;color:rgba(255,255,255,0.25);">•</span><span style="font-size:11px;color:rgba(168,85,247,0.6);font-weight:700;">✨ 5 İksir</span>';
  scene.appendChild(lvl);
  el.appendChild(scene);
  
  let step=0;
  function drawFn(){
    step++;
    if(step%80===0){
      // Pour animation: pick a random non-empty tube
      const nonEmpty = tubes.filter(t=>t.layers.length>0);
      if(nonEmpty.length>0){
        const src = nonEmpty[Math.floor(Math.random()*nonEmpty.length)];
        const topLayer = src.layers[src.layers.length-1];
        if(topLayer){
          topLayer.style.transform='scaleY(0)';topLayer.style.opacity='0';
          // Glow the tube
          src.el.style.boxShadow='0 0 15px rgba(168,85,247,0.4)';
          setTimeout(()=>{
            const nc=POTIONS[Math.floor(Math.random()*POTIONS.length)];
            topLayer.style.background='linear-gradient(180deg,'+nc.color+','+nc.color+'cc)';
            topLayer.style.boxShadow='inset 0 2px 4px rgba(255,255,255,0.2),inset 0 -2px 4px rgba(0,0,0,0.3),0 0 6px '+nc.glow;
            topLayer.dataset.color=nc.color;
            topLayer.style.transform='scaleY(1)';topLayer.style.opacity='1';
            src.el.style.boxShadow='none';
          },700);
        }
      }
    }
    // Random tube glow
    if(step%50===0){
      const t=tubes[Math.floor(Math.random()*tubes.length)];
      t.el.style.borderColor='rgba(168,85,247,0.4)';
      setTimeout(()=>{t.el.style.borderColor='rgba(255,255,255,0.12)';},500);
    }
  }
  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
};

// ———————— 9. Ok Bulmaca Demo ————————
MiniDemos.demo_arrowPuzzle = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  
  // Kelebek şekli - 10x10 grid'de ok pattern (Amaze GO tarzı)
  const G=10;
  // 1=up,2=down,3=left,4=right, 0=empty
  const BUTTERFLY = [
    [0,0,0,4,4,4,4,0,0,0],
    [0,0,4,1,1,1,1,4,0,0],
    [0,4,1,1,0,0,1,1,4,0],
    [4,1,1,0,0,0,0,1,1,4],
    [4,1,0,0,2,2,0,0,1,4],
    [4,1,0,0,1,1,0,0,1,4],
    [4,1,1,0,0,0,0,1,1,4],
    [0,4,1,1,0,0,1,1,4,0],
    [0,0,4,1,1,1,1,4,0,0],
    [0,0,0,4,4,4,4,0,0,0],
  ];
  const ARROWS_SYM = {1:'↑',2:'↓',3:'←',4:'→'};
  const ARROW_CLR = {1:'#22d3ee',2:'#a855f7',3:'#22c55e',4:'#f97316'};
  
  if(!document.getElementById('css-arrow-demo')){
    const s=document.createElement('style');s.id='css-arrow-demo';
    s.textContent='@keyframes _arExit{0%{transform:scale(1);opacity:1}100%{opacity:0}}';
    document.head.appendChild(s);
  }
  
  const scene = document.createElement('div');
  scene.style.cssText = 'width:90%;max-width:280px;display:flex;flex-direction:column;align-items:center;gap:8px;';
  
  // Level header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 4px;';
  header.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:700;">← SEVİYE 27</span><span style="font-size:12px;color:rgba(255,255,255,0.3);">🦋 Kelebek</span><span style="font-size:14px;">⭐⭐⭐⭐</span>';
  scene.appendChild(header);
  
  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat('+G+',1fr);gap:2px;width:100%;aspect-ratio:1;background:rgba(255,255,255,0.02);border-radius:12px;padding:4px;';
  const cellEls = [];
  for(let y=0;y<G;y++) for(let x=0;x<G;x++){
    const c = document.createElement('div');
    const v = BUTTERFLY[y][x];
    c.style.cssText = 'border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.5s cubic-bezier(.34,1.56,.64,1);user-select:none;aspect-ratio:1;';
    if(v>0){
      c.textContent = ARROWS_SYM[v];
      c.dataset.dir = v;
      c.dataset.active = '1';
      const clr = ARROW_CLR[v];
      c.style.background = clr+'20';
      c.style.border = '1px solid '+clr+'40';
      c.style.color = clr;
      c.style.textShadow = '0 0 6px '+clr+'60';
    } else {
      c.style.background = 'rgba(255,255,255,0.02)';
      c.dataset.active = '0';
    }
    gridEl.appendChild(c);
    cellEls.push(c);
  }
  scene.appendChild(gridEl);
  
  // Progress dots
  const dots = document.createElement('div');
  dots.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
  for(let i=0;i<5;i++){
    const d=document.createElement('div');
    d.style.cssText = 'width:6px;height:6px;border-radius:50%;background:'+(i<2?'#22d3ee':'rgba(255,255,255,0.15)')+';transition:background 0.3s;';
    dots.appendChild(d);
  }
  scene.appendChild(dots);
  el.appendChild(scene);
  
  let step=0, removeOrder=[];
  // Pre-compute removal order (outside-in)
  for(let y=0;y<G;y++) for(let x=0;x<G;x++){
    if(BUTTERFLY[y][x]>0) removeOrder.push({y,x,dir:BUTTERFLY[y][x]});
  }
  // Shuffle slightly for visual interest
  removeOrder.sort(()=>Math.random()-0.5);
  let rmIdx=0;
  
  function drawFn(){
    step++;
    if(step%40===0 && rmIdx<removeOrder.length){
      const {y,x,dir} = removeOrder[rmIdx];
      const cell = cellEls[y*G+x];
      if(cell.dataset.active==='1'){
        const dirMap = {1:'translateY(-120px)',2:'translateY(120px)',3:'translateX(-120px)',4:'translateX(120px)'};
        cell.style.transform = dirMap[dir];
        cell.style.opacity = '0';
        cell.style.border = 'none';
        setTimeout(()=>{
          cell.textContent='';
          cell.style.transform='scale(1)';
          cell.style.opacity='1';
          cell.style.background='rgba(34,197,94,0.08)';
          cell.dataset.active='0';
        },500);
      }
      rmIdx++;
    }
    // Reset when all removed
    if(rmIdx>=removeOrder.length && step%120===0){
      rmIdx=0;
      removeOrder.sort(()=>Math.random()-0.5);
      cellEls.forEach((c,i)=>{
        const y=Math.floor(i/G),x=i%G,v=BUTTERFLY[y][x];
        if(v>0){
          c.style.transform='scale(0)';
          setTimeout(()=>{
            c.textContent=ARROWS_SYM[v];
            c.dataset.dir=v;c.dataset.active='1';
            const clr=ARROW_CLR[v];
            c.style.background=clr+'20';c.style.border='1px solid '+clr+'40';
            c.style.color=clr;c.style.textShadow='0 0 6px '+clr+'60';
            c.style.transform='scale(1)';c.style.opacity='1';
          },50+Math.random()*300);
        } else {
          c.style.background='rgba(255,255,255,0.02)';
        }
      });
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

// ———————— 11. Yapboz Kart Demo ————————
MiniDemos.demo_jigsawCard = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const G=4;
  // Güzel gradient renkleri ile "resim parçaları" simüle et
  const PIECES = [
    {bg:'linear-gradient(135deg,#ff6b6b,#ee5a24)',icon:'🌅'},
    {bg:'linear-gradient(135deg,#74b9ff,#0984e3)',icon:'🌊'},
    {bg:'linear-gradient(135deg,#55efc4,#00b894)',icon:'🌿'},
    {bg:'linear-gradient(135deg,#fdcb6e,#e17055)',icon:'🌄'},
    {bg:'linear-gradient(135deg,#a29bfe,#6c5ce7)',icon:'🦋'},
    {bg:'linear-gradient(135deg,#fd79a8,#e84393)',icon:'🌸'},
    {bg:'linear-gradient(135deg,#ffeaa7,#dfe6e9)',icon:'⭐'},
    {bg:'linear-gradient(135deg,#00cec9,#81ecec)',icon:'💎'},
    {bg:'linear-gradient(135deg,#fab1a0,#e17055)',icon:'🍂'},
    {bg:'linear-gradient(135deg,#dfe6e9,#b2bec3)',icon:'❓'},
    {bg:'linear-gradient(135deg,#ff7675,#d63031)',icon:'🌹'},
    {bg:'linear-gradient(135deg,#a0c4ff,#bdb2ff)',icon:'🔮'},
    {bg:'linear-gradient(135deg,#caffbf,#9bf6ff)',icon:'🍀'},
    {bg:'linear-gradient(135deg,#ffc6ff,#bdb2ff)',icon:'🎀'},
    {bg:'linear-gradient(135deg,#fdffb6,#ffd6a5)',icon:'🌻'},
    {bg:'linear-gradient(135deg,#ffadad,#ffd6a5)',icon:'🎨'},
  ];
  
  if(!document.getElementById('css-jig-demo')){
    const s=document.createElement('style');s.id='css-jig-demo';
    s.textContent='@keyframes _jigFlip{0%{transform:perspective(300px) rotateY(0)}50%{transform:perspective(300px) rotateY(90deg)}100%{transform:perspective(300px) rotateY(0)}}@keyframes _jigSnap{0%{transform:scale(1.15);box-shadow:0 0 20px rgba(34,197,94,0.5)}100%{transform:scale(1);box-shadow:none}}';
    document.head.appendChild(s);
  }
  
  const scene = document.createElement('div');
  scene.style.cssText='width:82%;max-width:260px;display:flex;flex-direction:column;align-items:center;gap:10px;';
  
  // Header
  const header = document.createElement('div');
  header.style.cssText='display:flex;align-items:center;justify-content:space-between;width:100%;';
  header.innerHTML='<span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:700;">🧩 4x4 Yapboz</span><span style="font-size:12px;color:rgba(255,255,255,0.3);">0/16 yerleşti</span>';
  scene.appendChild(header);
  
  const gridEl = document.createElement('div');
  gridEl.style.cssText='display:grid;grid-template-columns:repeat('+G+',1fr);gap:3px;width:100%;aspect-ratio:1;background:rgba(255,255,255,0.03);border-radius:12px;padding:4px;border:1px solid rgba(255,255,255,0.06);';
  const cards=[];
  const order=[...Array(G*G).keys()].sort(()=>Math.random()-0.5);
  
  for(let i=0;i<G*G;i++){
    const c=document.createElement('div');
    const piece=PIECES[order[i]];
    const isHidden=Math.random()<0.35;
    c.style.cssText='border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all 0.5s cubic-bezier(.34,1.56,.64,1);user-select:none;aspect-ratio:1;cursor:pointer;position:relative;overflow:hidden;';
    if(isHidden){
      c.style.background='linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))';
      c.style.border='1px dashed rgba(255,255,255,0.15)';
      c.textContent='❓';
      c.dataset.hidden='1';
      c.dataset.icon=piece.icon;
      c.dataset.bg=piece.bg;
    } else {
      c.style.background=piece.bg;
      c.style.border='1px solid rgba(255,255,255,0.1)';
      c.textContent=piece.icon;
      c.dataset.hidden='0';
      // Add subtle shine overlay
      const shine=document.createElement('div');
      shine.style.cssText='position:absolute;top:-50%;left:-50%;width:100%;height:100%;background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent);transform:rotate(45deg);pointer-events:none;';
      c.appendChild(shine);
    }
    gridEl.appendChild(c);cards.push(c);
  }
  scene.appendChild(gridEl);
  
  // Bottom: "Snap to place" hint
  const hint=document.createElement('div');
  hint.style.cssText='font-size:11px;color:rgba(255,255,255,0.25);font-weight:600;';
  hint.textContent='📌 Kartları sürükle, yerine oturt';
  scene.appendChild(hint);
  el.appendChild(scene);
  
  let step=0, placed=0;
  function drawFn(){
    step++;
    // Reveal hidden card every ~2.5s
    if(step%75===0){
      const hdn=cards.filter(c=>c.dataset.hidden==='1');
      if(hdn.length>0){
        const c=hdn[Math.floor(Math.random()*hdn.length)];
        c.style.animation='_jigFlip 0.5s ease';
        setTimeout(()=>{
          c.textContent=c.dataset.icon;
          c.style.background=c.dataset.bg;
          c.style.border='1px solid rgba(255,255,255,0.1)';
          c.dataset.hidden='0';
          c.style.animation='_jigSnap 0.3s ease';
          placed++;
          header.children[1].textContent=placed+'/16 yerleşti';
        },250);
      }
    }
    // Swap two visible cards every ~3s
    if(step%90===0){
      const vis=cards.filter(c=>c.dataset.hidden==='0');
      if(vis.length>=2){
        const a=vis[Math.floor(Math.random()*vis.length)];
        let b=vis[Math.floor(Math.random()*vis.length)];
        if(b===a) b=vis[(vis.indexOf(a)+1)%vis.length];
        a.style.transform='scale(0.7) rotate(5deg)';
        b.style.transform='scale(0.7) rotate(-5deg)';
        setTimeout(()=>{
          const tmpT=a.textContent,tmpBg=a.style.background;
          a.textContent=b.textContent;a.style.background=b.style.background;
          b.textContent=tmpT;b.style.background=tmpBg;
          a.style.transform='scale(1) rotate(0)';
          b.style.transform='scale(1) rotate(0)';
          a.style.animation='_jigSnap 0.3s ease';
        },350);
      }
    }
    // Reset cycle
    if(step>600){
      step=0;placed=0;
      header.children[1].textContent='0/16 yerleşti';
      cards.forEach((c,i)=>{
        const piece=PIECES[order[i]];
        if(Math.random()<0.35){
          c.style.background='linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))';
          c.style.border='1px dashed rgba(255,255,255,0.15)';
          c.textContent='❓';c.dataset.hidden='1';c.dataset.icon=piece.icon;c.dataset.bg=piece.bg;
        }
      });
    }
  }
  _demoLoop(state,drawFn);
  return {el,pause(){state.paused=true},resume(){if(state.paused){state.paused=false;_demoLoop(state,drawFn)}},destroy(){state.paused=true;cancelAnimationFrame(state.raf);el.innerHTML=''}};
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

  function _generateBatch(count) {
    const batch = [];
    for (let i = 0; i < count; i++) {
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

      .reel-info{position:absolute;bottom:0;left:0;right:0;padding:20px 16px 28px;background:linear-gradient(transparent,rgba(0,0,0,0.75) 25%,rgba(0,0,0,0.88));z-index:10;animation:reelInfoIn 0.5s ease backwards}

      .reel-game-emoji{font-size:36px;display:inline-block;margin-right:8px;vertical-align:middle;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))}
      .reel-game-name{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.5);line-height:1.2;display:inline;vertical-align:middle}
      .reel-desc{font-size:14px;color:rgba(255,255,255,0.75);margin:8px 0 12px;line-height:1.4}

      .reel-stats{display:flex;align-items:center;gap:14px;margin-bottom:8px;flex-wrap:wrap}
      .reel-stat{display:flex;align-items:center;gap:4px;font-size:12px;color:rgba(255,255,255,0.65);font-weight:600}
      .reel-stat-val{color:#fff;font-weight:700}
      .reel-diff-badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px}
      .reel-diff-badge.easy{background:rgba(34,197,94,0.2);color:#86efac}
      .reel-diff-badge.medium{background:rgba(234,179,8,0.2);color:#fde047}
      .reel-diff-badge.hard{background:rgba(239,68,68,0.2);color:#fca5a5}
      .reel-highscore{font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px}
      .reel-highscore span{color:#fbbf24;font-weight:800}

      .reel-play-btn{width:100%;padding:16px;border-radius:16px;font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:#fff;border:none;cursor:pointer;letter-spacing:0.5px;box-shadow:0 4px 24px rgba(0,0,0,0.3);animation:reelBtnPulse 2s ease-in-out infinite;-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;margin-top:6px}
      .reel-play-btn::after{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,0.08) 50%,transparent 60%);animation:reelBtnShine 3s ease-in-out infinite}
      .reel-play-btn:active{transform:scale(0.97);animation:none}

      .reel-actions{position:absolute;right:12px;bottom:200px;display:flex;flex-direction:column;align-items:center;gap:20px;z-index:15}
      .reel-action-btn{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .reel-action-btn .act-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.25s;border:1px solid rgba(255,255,255,0.06)}
      .reel-action-btn .act-label{font-size:10px;color:rgba(255,255,255,0.6);font-weight:600}
      .reel-action-btn:active .act-icon{transform:scale(0.9)}

      .reel-action-btn.fav-active .act-icon{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.3)}

      .reel-swipe-hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;z-index:20;animation:reelSwipeHint 1.8s ease-in-out infinite;pointer-events:none}
      .reel-swipe-hint .hint-arrow{font-size:22px;color:rgba(255,255,255,0.5)}
      .reel-swipe-hint .hint-text{font-size:10px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:0.5px}

      .reel-card-counter{position:absolute;top:16px;left:16px;z-index:12;padding:4px 12px;border-radius:20px;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:11px;color:rgba(255,255,255,0.6);font-weight:700;border:1px solid rgba(255,255,255,0.06)}

      @keyframes reelBtnPulse{0%,100%{transform:scale(1);box-shadow:0 4px 24px rgba(0,0,0,0.3)}50%{transform:scale(1.04);box-shadow:0 6px 32px rgba(0,0,0,0.4)}}
      @keyframes reelBtnShine{0%,100%{transform:translateX(-100%) rotate(0)}50%{transform:translateX(100%) rotate(0)}}
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
      '<span class="reel-diff-badge '+_diffClass(game.difficulty)+'">'+game.difficulty+'</span>';
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
    btn.style.background = 'linear-gradient(135deg,'+game.gradient[0]+','+game.gradient[1]+')';
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
      if(typeof showToast==='function') showToast(isNow?'❤️ Favorilere eklendi':'💔 Favorilerden çıkarıldı');
    });
    actions.appendChild(favBtn);

    // Category label
    const catBtn = document.createElement('div');
    catBtn.className = 'reel-action-btn';
    catBtn.innerHTML = '<div class="act-icon">🧩</div><span class="act-label">Bulmaca</span>';
    actions.appendChild(catBtn);
    card.appendChild(actions);

    // Swipe hint on first card only
    if(idx === 0) {
      const hint = document.createElement('div');
      hint.className = 'reel-swipe-hint';
      hint.innerHTML = '<span class="hint-arrow">⬆</span><span class="hint-text">KAYDIR</span>';
      card.appendChild(hint);
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

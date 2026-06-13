/* ============================================
   GameHup â€” Reels / KeÅŸfet Motoru
   TikTok-style game discovery feed
   ============================================ */

// ===== OYUN VERÄ°LERÄ° =====

const REEL_GAMES = [
  { id:'blockPuzzle', name:'Bulmaca BloklarÄ±', emoji:'ğŸ§±', category:'puzzle', desc:'BloklarÄ± yerleÅŸtir, satÄ±rlarÄ± temizle!', difficulty:'Orta', gradient:['#7c3aed','#5b21b6'], playable:true },
  { id:'game2048', name:'2048', emoji:'ğŸ”¢', category:'puzzle', desc:'KaydÄ±r, birleÅŸtir, 2048\'e ulaÅŸ!', difficulty:'Kolay', gradient:['#d97706','#92400e'], playable:true },
  { id:'memoryGame', name:'HafÄ±za Oyunu', emoji:'ğŸ§ ', category:'puzzle', desc:'KartlarÄ± eÅŸleÅŸtir, hafÄ±zanÄ± test et!', difficulty:'Kolay', gradient:['#0891b2','#155e75'], playable:true },
  { id:'wordSearch', name:'Kelime AvÄ±', emoji:'ğŸ“', category:'puzzle', desc:'Gizli kelimeleri bul!', difficulty:'Orta', gradient:['#16a34a','#166534'], playable:true },
  { id:'sudoku', name:'Sudoku', emoji:'#ï¸âƒ£', category:'puzzle', desc:'9x9 tabloyu doldur!', difficulty:'Zor', gradient:['#1d4ed8','#1e3a8a'], playable:true },
  { id:'mazeGame', name:'Labirent', emoji:'ğŸŒ€', category:'puzzle', desc:'Ã‡Ä±kÄ±ÅŸÄ± bul, zamana karÅŸÄ± yarÄ±ÅŸ!', difficulty:'Orta', gradient:['#059669','#065f46'], playable:true },
];

const GAME_NAME_MAP = {
  'blockPuzzle': 'Bulmaca BloklarÄ±',
  'game2048': '2048',
  'memoryGame': 'HafÄ±za Oyunu',
  'wordSearch': 'Kelime AvÄ±',
  'sudoku': 'Sudoku',
  'mazeGame': 'Labirent'
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

// ===== DEMO FABRÄ°KALARI =====
// Her demo: { el, pause(), resume(), destroy() }

const MiniDemos = {};

// YardÄ±mcÄ±: throttled RAF at ~30fps
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 1. Block Puzzle Demo â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 2. 2048 Demo â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 3. Memory Demo â”€â”€â”€â”€â”€â”€â”€â”€
MiniDemos.demo_memory = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const EMOJIS = ['ğŸ®','ğŸ²','ğŸ¯','ğŸ†','âš½','ğŸ¸','ğŸš€','ğŸŒŸ'];
  const pairs = [...EMOJIS,...EMOJIS].sort(()=>Math.random()-0.5);
  const matched = new Set();
  const state = { paused:false, raf:0 };

  const gridEl = document.createElement('div');
  gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:80%;max-width:240px;';
  const cards = [];
  for(let i=0;i<16;i++) {
    const c = document.createElement('div');
    c.style.cssText = 'aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;transition:transform 0.4s,background 0.3s;background:linear-gradient(135deg,'+gradient[0]+','+gradient[1]+');user-select:none;';
    c.textContent = 'â“';
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
          cards[i].textContent='â“';
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
            cards[idx].textContent='â“';
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 4. Word Search Demo â”€â”€â”€â”€â”€â”€â”€â”€
MiniDemos.demo_wordSearch = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const SIZE = 8;
  const ALPHA = 'ABCDEFGHIJKLMNOPRSTUVYZÄ°Ã–ÃœÃ‡ÅÄ';
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 5. Sudoku Demo â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€ 6. Maze Demo â”€â”€â”€â”€â”€â”€â”€â”€
MiniDemos.demo_maze = function(gradient) {
  const el = document.createElement('div');
  el.className = 'reel-demo-inner';
  const state = { paused:false, raf:0 };
  const MZ = 11; // odd for maze
  // Simple maze using recursive backtracker is overkill; use a fixed pattern
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
  // Path through the maze
  const path = [
    [1,1],[1,2],[1,3],[2,3],[3,3],[3,4],[3,5],[3,6],[3,7],[4,7],[5,7],[5,8],[5,9],
    [6,9],[7,9],[7,8],[7,7],[7,6],[7,5],[7,4],[7,3],[6,3],[5,3],[5,4],[5,5],
    [5,4],[5,3],[5,2],[5,1],[5,0],
    [9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9]
  ];
  // Simplified: just use the valid path
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


// ===== DEMO EÅLEME =====

function getDemoFactory(game) {
  switch(game.id) {
    case 'blockPuzzle': return MiniDemos.demo_blockPuzzle;
    case 'game2048':    return MiniDemos.demo_2048;
    case 'memoryGame':  return MiniDemos.demo_memory;
    case 'wordSearch':  return MiniDemos.demo_wordSearch;
    case 'sudoku':      return MiniDemos.demo_sudoku;
    case 'mazeGame':    return MiniDemos.demo_maze;
    default:            return MiniDemos.demo_blockPuzzle; // fallback
  }
}

// ===== SEEDED RATINGS (deterministic per game) =====
function _gameRating(id) {
  let h=0;
  for(let i=0;i<id.length;i++) h=((h<<5)-h)+id.charCodeAt(i);
  return (4.0 + (Math.abs(h)%10)*0.1).toFixed(1);
}

// ===== REELS ENGINE =====

window.ReelsEngine = (function() {
  let _observer = null;
  let _demos = {};       // id â†’ demo instance
  let _container = null;
  let _cards = [];

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

      @keyframes reelBtnPulse{0%,100%{transform:scale(1);box-shadow:0 4px 24px rgba(0,0,0,0.3)}50%{transform:scale(1.02);box-shadow:0 6px 32px rgba(0,0,0,0.4)}}
      @keyframes reelBtnShine{0%,100%{transform:translateX(-100%) rotate(0)}50%{transform:translateX(100%) rotate(0)}}
      @keyframes reelInfoIn{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes reelSwipeHint{0%,100%{transform:translateX(-50%) translateY(0);opacity:0.5}50%{transform:translateX(-50%) translateY(-12px);opacity:1}}
      @keyframes reelCardIn{0%{opacity:0;transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}
    `);
  }

  function _shuffle(arr) {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  function _diffClass(d) {
    if(d==='Kolay') return 'easy';
    if(d==='Orta') return 'medium';
    return 'hard';
  }

  function _buildCard(game, idx, total) {
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
    // Overlay for readability
    const overlay = document.createElement('div');
    overlay.className = 'reel-demo-overlay';
    demoArea.appendChild(overlay);
    card.appendChild(demoArea);

    // Counter
    const counter = document.createElement('div');
    counter.className = 'reel-card-counter';
    counter.textContent = (idx+1)+' / '+total;
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
      '<div class="reel-stat">â­ <span class="reel-stat-val">'+rating+'</span></div>'+
      '<div class="reel-stat">ğŸ® <span class="reel-stat-val">'+getPlayCount(game.id)+'</span></div>'+
      '<span class="reel-diff-badge '+_diffClass(game.difficulty)+'">'+game.difficulty+'</span>';
    info.appendChild(stats);

    // High score
    const hi = getHighScore(game.id);
    if(hi>0) {
      const hiEl = document.createElement('div');
      hiEl.className = 'reel-highscore';
      hiEl.innerHTML = 'ğŸ† En YÃ¼ksek: <span>'+hi.toLocaleString()+'</span>';
      info.appendChild(hiEl);
    }

    // Play button
    const btn = document.createElement('button');
    btn.className = 'reel-play-btn';
    btn.style.background = 'linear-gradient(135deg,'+game.gradient[0]+','+game.gradient[1]+')';
    btn.textContent = game.playable ? 'â–¶  OYNA' : 'ğŸ”’  YAKINDA';

    btn.addEventListener('click', function() {
      if(game.playable) {
        incPlayCount(game.id);
        if(typeof playGame==='function') playGame(GAME_NAME_MAP[game.id]);
      } else {
        if(typeof showToast==='function') showToast('ğŸ® '+game.name+' â€” YakÄ±nda!');
      }
    });
    info.appendChild(btn);

    card.appendChild(info);

    // Right-side actions (TikTok style)
    const actions = document.createElement('div');
    actions.className = 'reel-actions';

    // Favorite button
    const favBtn = document.createElement('div');
    favBtn.className = 'reel-action-btn'+(isFavorite(game.id)?' fav-active':'');
    favBtn.innerHTML = '<div class="act-icon">'+(isFavorite(game.id)?'â¤ï¸':'ğŸ¤')+'</div><span class="act-label">Favori</span>';
    favBtn.addEventListener('click', function() {
      const isNow = toggleFavorite(game.id);
      favBtn.className = 'reel-action-btn'+(isNow?' fav-active':'');
      favBtn.querySelector('.act-icon').textContent = isNow?'â¤ï¸':'ğŸ¤';
      if(typeof showToast==='function') showToast(isNow?'â¤ï¸ Favorilere eklendi':'ğŸ’” Favorilerden Ã§Ä±karÄ±ldÄ±');
    });
    actions.appendChild(favBtn);

    // Category label
    const catBtn = document.createElement('div');
    catBtn.className = 'reel-action-btn';
    const catEmojis = {puzzle:'ğŸ§©',yaris:'ğŸï¸',giydirme:'ğŸ‘—',kisilik:'ğŸ²'};
    catBtn.innerHTML = '<div class="act-icon">'+(catEmojis[game.category]||'ğŸ®')+'</div><span class="act-label">'+(CATEGORY_LABELS[game.category]||'')+'</span>';
    actions.appendChild(catBtn);

    card.appendChild(actions);

    // Swipe hint on first card
    if(idx===0) {
      const hint = document.createElement('div');
      hint.className = 'reel-swipe-hint';
      hint.innerHTML = '<span class="hint-arrow">â¬†</span><span class="hint-text">KAYDIR</span>';
      card.appendChild(hint);
    }

    return { card, demoArea, gameId: game.id, game };
  }

  function init(container) {
    _container = container;
    _injectCSS();

    // Clear
    container.innerHTML = '';

    // Shuffle games
    const shuffled = _shuffle(REEL_GAMES);
    const total = shuffled.length;

    // Scroll container
    const scroll = document.createElement('div');
    scroll.className = 'reels-container';

    _cards = [];
    shuffled.forEach((game, idx) => {
      const { card, demoArea, gameId } = _buildCard(game, idx, total);
      _cards.push({ card, demoArea, gameId, game, demoInstance:null, active:false });
      scroll.appendChild(card);
    });

    container.appendChild(scroll);

    // IntersectionObserver â€” activate/deactivate demos
    _observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const card = entry.target;
        const idx = _cards.findIndex(c=>c.card===card);
        if(idx<0) return;
        const item = _cards[idx];

        if(entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          // Activate
          if(!item.active) {
            item.active = true;
            card.style.willChange = 'transform';
            _startDemo(item);
          }
        } else {
          // Deactivate
          if(item.active) {
            item.active = false;
            card.style.willChange = 'auto';
            _stopDemo(item);
          }
        }
      });
    }, { threshold: [0, 0.55, 1], root: scroll });

    _cards.forEach(item => _observer.observe(item.card));
  }

  function _startDemo(item) {
    if(item.demoInstance) { item.demoInstance.resume(); return; }
    const factory = getDemoFactory(item.game);
    if(!factory) return;
    const demo = factory(item.game.gradient);
    item.demoInstance = demo;
    // Insert into demo area (before overlay)
    const overlay = item.demoArea.querySelector('.reel-demo-overlay');
    if(overlay) item.demoArea.insertBefore(demo.el, overlay);
    else item.demoArea.appendChild(demo.el);
  }

  function _stopDemo(item) {
    if(item.demoInstance) item.demoInstance.pause();
  }

  function cleanup() {
    if(_observer) { _observer.disconnect(); _observer=null; }
    _cards.forEach(item => {
      if(item.demoInstance) {
        item.demoInstance.destroy();
        item.demoInstance = null;
      }
    });
    _cards = [];
    if(_container) _container.innerHTML = '';
  }

  return { init, cleanup };
})();

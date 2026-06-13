/* ============================================
   GameHup — Puzzle Oyunları
   6 tam oynanabilir puzzle oyunu
   ============================================ */

const PuzzleGames = {};

// ═══════════════════════════════════════════
//  GLOBAL SES & TİTREŞİM SİSTEMİ
// ═══════════════════════════════════════════
const GameAudio = (() => {
  let ctx = null;
  let musicGain = null;
  let musicOscs = [];
  let musicPlaying = false;
  let muted = JSON.parse(localStorage.getItem('gh_muted') || 'false');
  let musicMuted = JSON.parse(localStorage.getItem('gh_music_muted') || 'false');

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ───── HAFİF TİTREŞİM ─────
  function haptic(ms) {
    if (muted) return;
    try { navigator.vibrate && navigator.vibrate(ms || 8); } catch(e) {}
  }

  // ───── SES EFEKTLERİ ─────
  function play(type) {
    if (muted) return;
    try {
      const c = getCtx(), t = c.currentTime;
      const mk = (tp, freq, dur, vol, start) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = tp; o.connect(g); g.connect(c.destination);
        if (typeof freq === 'number') o.frequency.setValueAtTime(freq, t + start);
        else { o.frequency.setValueAtTime(freq[0], t + start); o.frequency.exponentialRampToValueAtTime(freq[1], t + start + dur); }
        g.gain.setValueAtTime(vol, t + start);
        g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.start(t + start); o.stop(t + start + dur);
      };
      switch (type) {
        case 'tap':
          mk('sine', [300, 500], 0.06, 0.1, 0);
          break;
        case 'merge':
          mk('sine', [400, 600], 0.1, 0.15, 0);
          mk('triangle', [300, 500], 0.08, 0.08, 0.02);
          break;
        case 'match':
          [523, 659, 784].forEach((f, i) => mk('sine', f, 0.2, 0.14, i * 0.04));
          break;
        case 'clear':
          [523, 659, 784, 1047].forEach((f, i) => mk('sine', f, 0.25, 0.12, i * 0.04));
          mk('triangle', [200, 800], 0.2, 0.06, 0.05);
          break;
        case 'place':
          mk('sine', [350, 120], 0.1, 0.12, 0);
          break;
        case 'flip':
          mk('sine', [200, 400], 0.06, 0.08, 0);
          break;
        case 'error':
          mk('sawtooth', [300, 150], 0.15, 0.1, 0);
          break;
        case 'step':
          mk('sine', 280, 0.03, 0.05, 0);
          break;
        case 'win':
          [523, 659, 784, 1047, 1319].forEach((f, i) => mk('sine', f, 0.35, 0.13, i * 0.06));
          mk('triangle', [300, 1200], 0.3, 0.06, 0.05);
          break;
        case 'lose':
          mk('sawtooth', [350, 60], 0.55, 0.12, 0);
          mk('sine', [250, 70], 0.4, 0.08, 0.1);
          break;
        case 'unscrew':
          mk('sine', [600, 200], 0.12, 0.15, 0);
          mk('triangle', [400, 150], 0.08, 0.1, 0.02);
          break;
        case 'board':
          mk('sine', [200, 80], 0.25, 0.14, 0);
          mk('triangle', 100, 0.12, 0.08, 0.08);
          break;
        case 'combo':
          [523, 659, 784, 988, 1175].forEach((f, i) => mk('sine', f, 0.35, 0.1, i * 0.03));
          break;
      }
    } catch (e) {}
  }

  // ───── ARKA PLAN MÜZİĞİ ─────
  // Soft ambient loop — düşük volüm, rahatlatıcı
  function startMusic() {
    if (musicMuted || musicPlaying) return;
    try {
      const c = getCtx();
      musicGain = c.createGain();
      musicGain.gain.setValueAtTime(0, c.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.04, c.currentTime + 2);
      musicGain.connect(c.destination);

      // Soft pad akorları — C maj7 → Am7 → F maj7 → G döngüsü
      const chords = [
        [261.63, 329.63, 392.00, 493.88],  // Cmaj7
        [220.00, 261.63, 329.63, 392.00],  // Am7
        [174.61, 220.00, 261.63, 329.63],  // Fmaj7
        [196.00, 246.94, 293.66, 392.00],  // G
      ];

      let chordIdx = 0;
      const oscs = [];

      // 4 osilator — her nota için bir tane
      for (let i = 0; i < 4; i++) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(chords[0][i], c.currentTime);
        g.gain.setValueAtTime(0.25, c.currentTime);
        o.connect(g);
        g.connect(musicGain);
        o.start();
        oscs.push({ osc: o, gain: g });
      }

      // Akord değiştirme döngüsü
      const changeChord = () => {
        if (!musicPlaying) return;
        chordIdx = (chordIdx + 1) % chords.length;
        const t = c.currentTime;
        oscs.forEach((o, i) => {
          o.osc.frequency.linearRampToValueAtTime(chords[chordIdx][i], t + 1.5);
        });
        setTimeout(changeChord, 4000);
      };
      setTimeout(changeChord, 4000);

      // LFO — hafif tremolo
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.15, c.currentTime);
      lfoGain.gain.setValueAtTime(0.008, c.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(musicGain.gain);
      lfo.start();

      musicOscs = [...oscs.map(o => o.osc), lfo];
      musicPlaying = true;
    } catch (e) {}
  }

  function stopMusic() {
    musicOscs.forEach(o => { try { o.stop(); } catch(e) {} });
    musicOscs = [];
    musicPlaying = false;
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('gh_muted', JSON.stringify(muted));
    if (muted) stopMusic();
    return muted;
  }

  function toggleMusic() {
    musicMuted = !musicMuted;
    localStorage.setItem('gh_music_muted', JSON.stringify(musicMuted));
    if (musicMuted) stopMusic();
    else startMusic();
    return musicMuted;
  }

  return { play, haptic, startMusic, stopMusic, toggleMute, toggleMusic, get muted() { return muted; }, get musicMuted() { return musicMuted; } };
})();

// ===== YARDIMCI =====
let _listeners = [];
function addEv(el, evt, fn, opts) { el.addEventListener(evt, fn, opts); _listeners.push([el, evt, fn, opts]); }
function clearEvs() { _listeners.forEach(([el, e, fn, o]) => el.removeEventListener(e, fn, o)); _listeners = []; }

function injectStyle(id, css) {
  let s = document.getElementById(id);
  if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
  s.textContent = css;
}

// ╔══════════════════════════════════════╗
// ║           1. 2048                    ║
// ╚══════════════════════════════════════╝
PuzzleGames.game2048 = (() => {
  let grid, score, moved, container;
  const SIZE = 4;
  const COLORS = {0:'rgba(255,255,255,0.04)',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
  const DARK = {0:false,2:true,4:true,8:false,16:false,32:false,64:false,128:false,256:false,512:false,1024:false,2048:false};

  function init(c) {
    container = c; score = 0; grid = Array.from({length:SIZE},()=>Array(SIZE).fill(0));
    injectStyle('css-2048', `
      .g2048{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;max-width:340px;aspect-ratio:1;padding:6px;border-radius:12px;background:rgba(255,255,255,0.04)}
      .g2048 .t{border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;transition:all .12s;user-select:none}
      @media(max-width:360px){.g2048 .t{font-size:20px}}
    `);
    addSpawn(); addSpawn(); render();
    let tx,ty;
    addEv(container,'touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
    addEv(container,'touchend',e=>{const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;if(Math.abs(dx)>30||Math.abs(dy)>30){Math.abs(dx)>Math.abs(dy)?move(dx>0?'right':'left'):move(dy>0?'down':'up')}},{passive:true});
    addEv(document,'keydown',onKey);
  }
  function onKey(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key.replace('Arrow','').toLowerCase())}}
  function addSpawn(){const empty=[];grid.forEach((r,y)=>r.forEach((v,x)=>{if(!v)empty.push([y,x])}));if(!empty.length)return;const[y,x]=empty[Math.floor(Math.random()*empty.length)];grid[y][x]=Math.random()<0.9?2:4}
  function move(dir){
    moved=false;
    const rotated=dir==='up'||dir==='down';const rev=dir==='right'||dir==='down';
    for(let i=0;i<SIZE;i++){
      let line=[];for(let j=0;j<SIZE;j++){const y=rotated?j:i,x=rotated?i:j;line.push(grid[y][x])}
      if(rev)line.reverse();
      line=mergeLine(line);
      if(rev)line.reverse();
      for(let j=0;j<SIZE;j++){const y=rotated?j:i,x=rotated?i:j;if(grid[y][x]!==line[j])moved=true;grid[y][x]=line[j]}
    }
    if(moved){GameAudio.play('merge');GameAudio.haptic(8);addSpawn();render();updateGameScore(score);if(checkWin()){GameAudio.play('win');GameAudio.haptic(30);showGameOver(true,'Kazandın! 🎉','2048\'e ulaştın! Skor: '+score)}else if(checkLose()){GameAudio.play('lose');showGameOver(false,'Oyun Bitti','Hamle kalmadı. Skor: '+score)}}
  }
  function mergeLine(line){
    let a=line.filter(v=>v);
    for(let i=0;i<a.length-1;i++){if(a[i]===a[i+1]){a[i]*=2;score+=a[i];a[i+1]=0}}
    a=a.filter(v=>v);while(a.length<SIZE)a.push(0);return a
  }
  function checkWin(){return grid.some(r=>r.some(v=>v>=2048))}
  function checkLose(){
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(!grid[y][x])return false;if(x<SIZE-1&&grid[y][x]===grid[y][x+1])return false;if(y<SIZE-1&&grid[y][x]===grid[y+1][x])return false}
    return true
  }
  function render(){
    container.innerHTML=`<div class="g2048">${grid.map(r=>r.map(v=>{
      const bg=COLORS[v]||'#3c3a32';const dark=DARK[v]??false;const fs=v>=1024?'18px':v>=128?'22px':'24px';
      return `<div class="t" style="background:${bg};color:${dark?'#776e65':'#f9f6f2'};font-size:${fs}">${v||''}</div>`
    }).join('')).join('')}</div>`;
  }
  function cleanup(){clearEvs()}
  return {init,cleanup};
})();

// ╔══════════════════════════════════════╗
// ║       2. HAFIZA OYUNU                ║
// ╚══════════════════════════════════════╝
PuzzleGames.memoryGame = (() => {
  const EMOJIS = ['🎮','🎲','🎯','🏆','⚽','🎸','🚀','🌟'];
  let cards, flipped, matched, moves, locked, container;

  function init(c) {
    container = c; moves = 0; matched = 0; locked = false; flipped = [];
    const pairs = [...EMOJIS, ...EMOJIS];
    cards = pairs.sort(() => Math.random() - 0.5).map((e, i) => ({id:i, emoji:e, up:false, done:false}));
    injectStyle('css-memory', `
      .mem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;max-width:340px}
      .mem-card{aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;transition:transform .3s,background .3s;user-select:none;transform-style:preserve-3d}
      .mem-card.down{background:linear-gradient(135deg,#7c3aed,#5b21b6)}
      .mem-card.up{background:rgba(255,255,255,0.1);transform:rotateY(180deg)}
      .mem-card.done{background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3)}
      .mem-info{display:flex;gap:20px;justify-content:center;font-size:14px;font-weight:700;color:#9a9ab0}
      .mem-info span{color:#f0f0f5}
    `);
    render();
  }
  function render() {
    container.innerHTML = `
      <div class="mem-info"><div>Hamle: <span id="mem-moves">${moves}</span></div><div>Eşleşme: <span>${matched}/${EMOJIS.length}</span></div></div>
      <div class="mem-grid">${cards.map((c,i)=>`<div class="mem-card ${c.done?'done':c.up?'up':'down'}" data-i="${i}">${c.up||c.done?c.emoji:'❓'}</div>`).join('')}</div>`;
    container.querySelectorAll('.mem-card:not(.done):not(.up)').forEach(el => {
      addEv(el, 'click', () => flipCard(+el.dataset.i));
    });
  }
  function flipCard(i) {
    if (locked || cards[i].up || cards[i].done) return;
    cards[i].up = true; flipped.push(i); moves++; GameAudio.play('flip');
    updateGameScore(Math.max(1000 - moves * 20, 100));
    render();
    if (flipped.length === 2) {
      locked = true;
      const [a, b] = flipped;
      if (cards[a].emoji === cards[b].emoji) {
        cards[a].done = cards[b].done = true; matched++; flipped = []; locked = false;
        GameAudio.play('match'); GameAudio.haptic(12);
        render();
        if (matched === EMOJIS.length) { GameAudio.play('win'); GameAudio.haptic(25); showGameOver(true, 'Harika! 🧠', `${moves} hamlede tamamladın!`); }
      } else {
        GameAudio.play('error'); setTimeout(() => { cards[a].up = cards[b].up = false; flipped = []; locked = false; render(); }, 800);
      }
    }
  }
  function cleanup() { clearEvs(); }
  return { init, cleanup };
})();

// ╔══════════════════════════════════════╗
// ║       3. KELIME AVI                  ║
// ╚══════════════════════════════════════╝
PuzzleGames.wordSearch = (() => {
  const WORDS = ['OYUN','SKOR','PUAN','BLOK','RENK','HARF','LEVEL','PUZZLE'];
  const SIZE = 10;
  let grid, placed, found, selStart, container;

  function init(c) {
    container = c; found = []; selStart = null;
    grid = Array.from({length:SIZE}, () => Array(SIZE).fill(''));
    placed = [];
    WORDS.forEach(w => placeWord(w));
    // Boş yerleri doldur
    const ABC = 'ABCDEFGHIJKLMNOPRSTUVYZİÖÜÇŞĞ';
    grid.forEach((r,y) => r.forEach((v,x) => { if(!v) grid[y][x] = ABC[Math.floor(Math.random()*ABC.length)] }));
    injectStyle('css-ws', `
      .ws-grid{display:grid;grid-template-columns:repeat(${SIZE},1fr);gap:3px;width:100%;max-width:360px}
      .ws-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;border-radius:6px;background:rgba(255,255,255,0.06);cursor:pointer;user-select:none;transition:all .15s}
      .ws-cell.sel{background:rgba(168,85,247,0.3);color:#e9d5ff}
      .ws-cell.found{background:rgba(34,197,94,0.2);color:#86efac}
      .ws-words{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px}
      .ws-w{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;background:rgba(255,255,255,0.06)}
      .ws-w.done{background:rgba(34,197,94,0.15);color:#86efac;text-decoration:line-through}
    `);
    render();
  }
  function placeWord(word) {
    const dirs = [[0,1],[1,0]]; // yatay, dikey
    for(let attempt=0; attempt<100; attempt++) {
      const [dy,dx] = dirs[Math.floor(Math.random()*dirs.length)];
      const y = Math.floor(Math.random()*(SIZE - (dy?word.length:0)));
      const x = Math.floor(Math.random()*(SIZE - (dx?word.length:0)));
      let ok = true;
      for(let i=0;i<word.length;i++){const cy=y+i*dy,cx=x+i*dx;const v=grid[cy][cx];if(v&&v!==word[i]){ok=false;break}}
      if(ok){
        const cells=[];
        for(let i=0;i<word.length;i++){const cy=y+i*dy,cx=x+i*dx;grid[cy][cx]=word[i];cells.push(`${cy},${cx}`)}
        placed.push({word,cells});
        return;
      }
    }
  }
  function render() {
    const foundCells = new Set(found.flatMap(w => placed.find(p=>p.word===w)?.cells||[]));
    container.innerHTML = `
      <div class="ws-grid">${grid.map((r,y)=>r.map((v,x)=>{
        const key=`${y},${x}`;const isFnd=foundCells.has(key);
        return `<div class="ws-cell ${isFnd?'found':''}" data-y="${y}" data-x="${x}">${v}</div>`
      }).join('')).join('')}</div>
      <div class="ws-words">${WORDS.map(w=>`<span class="ws-w ${found.includes(w)?'done':''}">${w}</span>`).join('')}</div>`;
    container.querySelectorAll('.ws-cell:not(.found)').forEach(el => {
      addEv(el, 'click', () => onCellClick(+el.dataset.y, +el.dataset.x));
    });
  }
  function onCellClick(y,x) {
    if (!selStart) { selStart = {y,x}; highlightSel(y,x,y,x); return; }
    // İki nokta arası kontrol
    const sy=selStart.y, sx=selStart.x;
    selStart = null;
    // Yatay mı dikey mi?
    let cells = [];
    if (sy===y) { // yatay
      const minX=Math.min(sx,x), maxX=Math.max(sx,x);
      for(let i=minX;i<=maxX;i++) cells.push(`${y},${i}`);
    } else if (sx===x) { // dikey
      const minY=Math.min(sy,y), maxY=Math.max(sy,y);
      for(let i=minY;i<=maxY;i++) cells.push(`${i},${x}`);
    } else { render(); return; }
    // Seçilen harf dizisini kontrol
    const str1 = cells.map(c=>{const[cy,cx]=c.split(',');return grid[cy][cx]}).join('');
    const str2 = [...str1].reverse().join('');
    const match = placed.find(p => !found.includes(p.word) && (p.word===str1||p.word===str2));
    if (match) {
      found.push(match.word);
      updateGameScore(found.length * 100);
      GameAudio.play('match'); GameAudio.haptic(12);
      render();
      if (found.length === placed.length) { GameAudio.play('win'); GameAudio.haptic(25); showGameOver(true, 'Tebrikler! 📝', 'Tüm kelimeleri buldun!'); }
    } else { render(); }
  }
  function highlightSel(y1,x1,y2,x2) {
    container.querySelectorAll('.ws-cell').forEach(el => {
      if(+el.dataset.y===y1 && +el.dataset.x===x1) el.classList.add('sel');
    });
  }
  function cleanup(){clearEvs()}
  return {init,cleanup};
})();

// ╔══════════════════════════════════════╗
// ║         4. SUDOKU                    ║
// ╚══════════════════════════════════════╝
PuzzleGames.sudoku = (() => {
  // 3 hazır bulmaca (0=boş)
  const PUZZLES = [
    [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9],
    [0,0,0,2,6,0,7,0,1,6,8,0,0,7,0,0,9,0,1,9,0,0,0,4,5,0,0,8,2,0,1,0,0,0,4,0,0,0,4,6,0,2,9,0,0,0,5,0,0,0,3,0,2,8,0,0,9,3,0,0,0,7,4,0,4,0,0,5,0,0,3,6,7,0,3,0,1,8,0,0,0],
    [0,0,5,3,0,0,0,0,0,8,0,0,0,0,0,0,2,0,0,7,0,0,1,0,5,0,0,4,0,0,0,0,5,3,0,0,0,1,0,0,7,0,0,0,6,0,0,3,2,0,0,0,8,0,0,6,0,5,0,0,0,0,9,0,0,4,0,0,0,0,3,0,0,0,0,0,0,9,7,0,0],
  ];
  const SOLUTIONS = [];
  let board, initial, selected, container, startTime;

  function solveCopy(puzzle) {
    const b=[...puzzle];
    function solve(b){
      const i=b.indexOf(0);if(i===-1)return true;
      const r=Math.floor(i/9),c=i%9,bx=Math.floor(r/3)*3,by=Math.floor(c/3)*3;
      for(let n=1;n<=9;n++){
        let ok=true;
        for(let j=0;j<9;j++){if(b[r*9+j]===n||b[j*9+c]===n)ok=false}
        for(let dr=0;dr<3;dr++)for(let dc=0;dc<3;dc++)if(b[(bx+dr)*9+(by+dc)]===n)ok=false;
        if(ok){b[i]=n;if(solve(b))return true;b[i]=0}
      }
      return false;
    }
    solve(b);return b;
  }

  function init(c) {
    container = c; selected = -1; startTime = Date.now();
    const idx = Math.floor(Math.random() * PUZZLES.length);
    initial = [...PUZZLES[idx]];
    board = [...initial];
    if (!SOLUTIONS[idx]) SOLUTIONS[idx] = solveCopy(PUZZLES[idx]);
    injectStyle('css-sudoku', `
      .sdk-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;width:100%;max-width:360px;padding:4px;border-radius:10px;background:rgba(255,255,255,0.04)}
      .sdk-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border-radius:4px;background:rgba(255,255,255,0.06);cursor:pointer;user-select:none;transition:all .1s}
      .sdk-cell.fixed{color:#9a9ab0;cursor:default}
      .sdk-cell.sel{background:rgba(168,85,247,0.3);box-shadow:0 0 0 2px #a855f7}
      .sdk-cell.err{color:#ef4444}
      .sdk-cell.br{border-right:2px solid rgba(255,255,255,0.15)}
      .sdk-cell.bb{border-bottom:2px solid rgba(255,255,255,0.15)}
      .sdk-nums{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:10px}
      .sdk-num{width:38px;height:38px;border-radius:8px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;cursor:pointer;transition:all .1s}
      .sdk-num:active{transform:scale(0.9);background:rgba(168,85,247,0.3)}
    `);
    render();
  }
  function render() {
    const sol = SOLUTIONS[PUZZLES.indexOf(initial)] || [];
    container.innerHTML = `
      <div class="sdk-grid">${board.map((v,i)=>{
        const r=Math.floor(i/9),c=i%9;
        const fixed=initial[i]!==0;
        const isErr=v&&sol[i]&&v!==sol[i];
        const cls=['sdk-cell',fixed?'fixed':'',selected===i?'sel':'',isErr?'err':'',c%3===2&&c<8?'br':'',r%3===2&&r<8?'bb':''].filter(Boolean).join(' ');
        return `<div class="${cls}" data-i="${i}">${v||''}</div>`
      }).join('')}</div>
      <div class="sdk-nums">${[1,2,3,4,5,6,7,8,9].map(n=>`<div class="sdk-num" data-n="${n}">${n}</div>`).join('')}<div class="sdk-num" data-n="0">✕</div></div>`;
    container.querySelectorAll('.sdk-cell:not(.fixed)').forEach(el => addEv(el,'click',()=>{selected=+el.dataset.i;render()}));
    container.querySelectorAll('.sdk-num').forEach(el => addEv(el,'click',()=>placeNum(+el.dataset.n)));
  }
  function placeNum(n) {
    if(selected<0||initial[selected]!==0) return;
    board[selected]=n; GameAudio.play('place'); render();
    // Kazanma kontrolü
    if(!board.includes(0)){
      const sol = SOLUTIONS[PUZZLES.indexOf(initial)];
      const win = board.every((v,i)=>v===sol[i]);
      const secs = Math.floor((Date.now()-startTime)/1000);
      const sc = Math.max(5000-secs*10,500);
      updateGameScore(sc);
      if(win) { GameAudio.play('win'); GameAudio.haptic(25); showGameOver(true,'Sudoku Çözüldü! 🧩',`${secs} saniyede tamamladın!`); }
      else { GameAudio.play('error'); showGameOver(false,'Hata Var','Bazı sayılar yanlış, tekrar dene.'); }
    }
  }
  function cleanup(){clearEvs()}
  return {init,cleanup};
})();

// ╔══════════════════════════════════════════════════════╗
// ║  5. BULMACA BLOKLARI — V2 Ultra Juice Edition       ║
// ║  Sürükle-Bırak • Combo • Parçacık • Sarsıntı • Ses  ║
// ╚══════════════════════════════════════════════════════╝
PuzzleGames.blockPuzzle = (() => {
  const G = 8;

  const SHAPES = [
    [[1]],[[1,1]],[[1],[1]],
    [[1,1,1]],[[1],[1],[1]],
    [[1,1],[1,0]],[[1,1],[0,1]],[[1,0],[1,1]],[[0,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1,1],[1,0,0]],[[1,1,1],[0,0,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],
    [[1,1,1,1]],[[1],[1],[1],[1]],
    [[1,1,1],[0,1,0]],
  ];

  const PAL = [
    {f:'#a855f7',l:'#c084fc',g:'rgba(168,85,247,.45)'},
    {f:'#22d3ee',l:'#67e8f9',g:'rgba(34,211,238,.45)'},
    {f:'#22c55e',l:'#4ade80',g:'rgba(34,197,94,.45)'},
    {f:'#f97316',l:'#fb923c',g:'rgba(249,115,22,.45)'},
    {f:'#ec4899',l:'#f472b6',g:'rgba(236,72,153,.45)'},
    {f:'#fbbf24',l:'#fcd34d',g:'rgba(251,191,36,.45)'},
    {f:'#ef4444',l:'#f87171',g:'rgba(239,68,68,.45)'},
    {f:'#6366f1',l:'#818cf8',g:'rgba(99,102,241,.45)'},
    {f:'#14b8a6',l:'#2dd4bf',g:'rgba(20,184,166,.45)'},
  ];

  const COMBO_WORDS = ['','Nice!','Great!','Awesome!','Incredible!','LEGENDARY!'];

  let board, pieces, score, combo, highScore, locked, container;
  let boardEl, trayEl, wrapEl;
  let drag = null;
  let aCtx = null;

  // ───────── HAPTİK ─────────
  function haptic(ms) { GameAudio.haptic(ms); }

  // ───────── SES ─────────
  function snd(type) { GameAudio.play(type); }

  // ───────── EKRAN SARSINTISI ─────────
  function screenShake(intensity, duration) {
    const el = wrapEl;
    const start = performance.now();
    const anim = (now) => {
      const elapsed = now - start;
      if (elapsed > duration) { el.style.transform = ''; return; }
      const decay = 1 - elapsed/duration;
      const x = (Math.random()*2-1) * intensity * decay;
      const y = (Math.random()*2-1) * intensity * decay;
      el.style.transform = `translate(${x}px,${y}px)`;
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ───────── EKRAN FLASH ─────────
  function screenFlash(color, dur) {
    const fl = document.createElement('div');
    fl.style.cssText = `position:absolute;inset:0;background:${color||'rgba(255,255,255,.2)'};pointer-events:none;z-index:250;border-radius:14px;animation:bpScreenFlash ${dur||300}ms ease-out forwards`;
    wrapEl.appendChild(fl);
    setTimeout(()=>fl.remove(), (dur||300)+50);
  }

  // ───────── IŞIK DALGASI ─────────
  function lightWave(cx, cy, color) {
    const w = document.createElement('div');
    w.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;border-radius:50%;pointer-events:none;z-index:195;transform:translate(-50%,-50%);animation:bpWave .6s ease-out forwards;border:3px solid ${color||'rgba(255,255,255,.5)'}`;
    wrapEl.appendChild(w);
    setTimeout(()=>w.remove(),650);
  }

  // ───────── PARTİKÜLLER ─────────
  function spawnParticles(cx, cy, color, n) {
    for (let i=0;i<n;i++) {
      const p = document.createElement('div');
      const ang = (Math.PI*2/n)*i + Math.random()*.5;
      const dist = 20+Math.random()*55;
      const sz = 2+Math.random()*6;
      const dur = 400+Math.random()*300;
      const type = Math.random() > 0.6 ? 'star' : 'dot';
      p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${color};pointer-events:none;z-index:200;will-change:transform,opacity;animation:bpPop ${dur}ms cubic-bezier(.2,.8,.3,1) forwards`;
      if (type==='star') {
        p.style.borderRadius = '2px';
        p.style.transform = `rotate(${Math.random()*360}deg)`;
      } else {
        p.style.borderRadius = '50%';
      }
      p.style.setProperty('--ptx',Math.cos(ang)*dist+'px');
      p.style.setProperty('--pty',Math.sin(ang)*dist+'px');
      p.style.setProperty('--rot',(Math.random()*720-360)+'deg');
      wrapEl.appendChild(p);
      setTimeout(()=>p.remove(),dur+50);
    }
  }

  // ───────── KIVILCIM TRAİL ─────────
  function sparkTrail(cx, cy, color, count) {
    for (let i=0;i<count;i++) {
      const s = document.createElement('div');
      const ang = Math.random()*Math.PI*2;
      const dist = 40+Math.random()*80;
      const sz = 2+Math.random()*3;
      s.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${color};border-radius:50%;pointer-events:none;z-index:205;box-shadow:0 0 ${sz*2}px ${color};animation:bpSpark ${500+Math.random()*400}ms ease-out forwards`;
      s.style.setProperty('--sx',Math.cos(ang)*dist+'px');
      s.style.setProperty('--sy',Math.sin(ang)*dist+'px');
      wrapEl.appendChild(s);
      setTimeout(()=>s.remove(),950);
    }
  }

  // ───────── UÇAN SKOR ─────────
  function floatText(text, x, y, color, big) {
    const el = document.createElement('div');
    el.textContent = text;
    const sz = big ? 32 : 22;
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:${sz}px;font-weight:900;color:${color||'#fbbf24'};pointer-events:none;z-index:210;white-space:nowrap;text-shadow:0 0 12px ${color||'#fbbf24'},0 2px 8px rgba(0,0,0,.5);animation:bpFloat 1.1s ease-out forwards`;
    wrapEl.appendChild(el);
    setTimeout(()=>el.remove(),1150);
  }

  // ───────── COMBO YAZISI ─────────
  function showCombo(level) {
    const word = COMBO_WORDS[Math.min(level, COMBO_WORDS.length-1)];
    if (!word) return;
    const el = document.createElement('div');
    el.textContent = level > 1 ? `${word} x${level}` : word;
    const fs = Math.min(28+level*6, 54);
    const glowStrength = Math.min(level*8, 48);
    el.style.cssText = `position:absolute;top:35%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:${fs}px;font-weight:900;color:#fff;text-shadow:0 0 ${glowStrength}px rgba(168,85,247,.9),0 0 ${glowStrength*2}px rgba(168,85,247,.5),0 0 ${glowStrength*3}px rgba(168,85,247,.25);pointer-events:none;z-index:220;white-space:nowrap;animation:bpCombo 1.3s cubic-bezier(.16,1,.3,1) forwards`;
    wrapEl.appendChild(el);
    setTimeout(()=>el.remove(),1400);

    // Combo seviyesine göre ek efektler
    if (level >= 2) screenFlash('rgba(168,85,247,.15)', 400);
    if (level >= 3) {
      const bRect = boardEl.getBoundingClientRect();
      const cx = bRect.width/2, cy = bRect.height/2;
      sparkTrail(cx, cy, '#c084fc', level*4);
    }
  }

  // ───────── CSS ─────────
  function injectCSS() {
    injectStyle('css-bp', `
      .bp-wrap{position:relative;width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:14px;will-change:transform}
      .bp-score-bar{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 4px}
      .bp-score-bar .sb-left{display:flex;align-items:center;gap:6px}
      .bp-score-bar .sb-lbl{font-size:11px;font-weight:700;color:#5d5d78;letter-spacing:1px}
      .bp-score-bar .sb-val{font-size:22px;font-weight:900;color:#fbbf24;transition:transform .15s}
      .bp-score-bar .sb-val.bump{animation:bpScoreBump .3s ease}
      .bp-score-bar .sb-hi{font-size:11px;color:#5d5d78;font-weight:600}
      .bp-score-bar .sb-combo{font-size:13px;font-weight:800;color:#a855f7;opacity:0;transition:opacity .3s}
      .bp-score-bar .sb-combo.on{opacity:1;animation:bpComboPulse .6s ease}
      .bp-board{display:grid;grid-template-columns:repeat(${G},1fr);gap:3px;width:100%;padding:5px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 4px 24px rgba(0,0,0,.2)}
      .bp-c{aspect-ratio:1;border-radius:6px;background:rgba(255,255,255,.04);transition:transform .15s,opacity .15s,box-shadow .15s;position:relative;overflow:hidden}
      .bp-c.filled{box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.15),0 2px 6px rgba(0,0,0,.2)}
      .bp-c.filled::after{content:'';position:absolute;top:2px;left:15%;width:70%;height:4px;border-radius:4px;background:rgba(255,255,255,.2)}
      .bp-c.pv-ok{background:rgba(34,197,94,.3)!important;box-shadow:inset 0 0 0 2px rgba(34,197,94,.6),0 0 12px rgba(34,197,94,.2)}
      .bp-c.pv-no{background:rgba(239,68,68,.15)!important;box-shadow:inset 0 0 0 2px rgba(239,68,68,.4)}
      .bp-c.flash{animation:bpFlash .4s ease}
      .bp-c.energy{animation:bpEnergy .45s ease forwards}
      .bp-c.place-in{animation:bpPlaceIn .3s cubic-bezier(.34,1.56,.64,1)}
      .bp-tray{display:flex;gap:16px;justify-content:center;align-items:center;min-height:80px;width:100%;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);box-shadow:0 -2px 16px rgba(0,0,0,.1)}
      .bp-tp{display:grid;gap:2px;padding:6px;border-radius:10px;cursor:grab;transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s;touch-action:none;user-select:none}
      .bp-tp:active{cursor:grabbing}
      .bp-tp.grabbed{opacity:.2;transform:scale(.7)}
      .bp-tp.empty{pointer-events:none}
      .bp-tp.fade-out{animation:bpFadeOut .3s ease forwards}
      .bp-tc{border-radius:4px;width:16px;height:16px}
      .bp-ghost{position:fixed;pointer-events:none;z-index:1000;display:grid;gap:3px;filter:drop-shadow(0 8px 24px rgba(0,0,0,.5));will-change:left,top;transition:none}
      .bp-ghost .bp-gc{border-radius:6px;position:relative;overflow:hidden}
      .bp-ghost .bp-gc::after{content:'';position:absolute;top:2px;left:15%;width:70%;height:4px;border-radius:4px;background:rgba(255,255,255,.25)}
      @keyframes bpPop{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--ptx),var(--pty)) rotate(var(--rot)) scale(0);opacity:0}}
      @keyframes bpSpark{0%{transform:translate(0,0) scale(1);opacity:1}40%{opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0}}
      @keyframes bpFloat{0%{transform:translateY(0) scale(1);opacity:1}60%{opacity:1}100%{transform:translateY(-65px) scale(1.4);opacity:0}}
      @keyframes bpCombo{0%{transform:translate(-50%,-50%) scale(0) rotate(-5deg);opacity:0}20%{transform:translate(-50%,-50%) scale(1.4) rotate(2deg);opacity:1}50%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(-50%,-50%) scale(.6) rotate(-2deg);opacity:0}}
      @keyframes bpFlash{0%{filter:brightness(1);box-shadow:none}35%{filter:brightness(3);box-shadow:0 0 16px rgba(255,255,255,.4)}70%{filter:brightness(2)}100%{filter:brightness(1);box-shadow:none}}
      @keyframes bpEnergy{0%{transform:scale(1);opacity:1;filter:brightness(1)}30%{transform:scale(1.15);filter:brightness(2.5)}60%{transform:scale(1.1);opacity:.6;filter:brightness(2)}100%{transform:scale(0);opacity:0;filter:brightness(3)}}
      @keyframes bpPlaceIn{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.1) rotate(2deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      @keyframes bpFadeOut{0%{transform:scale(1);opacity:1}100%{transform:scale(0.3);opacity:0}}
      @keyframes bpNewPiece{0%{transform:scale(0) translateY(20px);opacity:0;filter:brightness(2)}60%{transform:scale(1.1) translateY(-3px);filter:brightness(1.3)}100%{transform:scale(1) translateY(0);opacity:1;filter:brightness(1)}}
      .bp-tp.new-in{animation:bpNewPiece .45s cubic-bezier(.34,1.56,.64,1) backwards}
      @keyframes bpScreenFlash{0%{opacity:1}100%{opacity:0}}
      @keyframes bpWave{0%{width:0;height:0;opacity:1}100%{width:280px;height:280px;opacity:0}}
      @keyframes bpScoreBump{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
      @keyframes bpComboPulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
      @keyframes bpGlow{0%{box-shadow:0 0 0 rgba(168,85,247,0)}50%{box-shadow:0 0 20px rgba(168,85,247,.4)}100%{box-shadow:0 0 0 rgba(168,85,247,0)}}
      .bp-tray.glow-in{animation:bpGlow .6s ease}
    `);
  }

  // ───────── PARÇA ─────────
  function rndPiece() {
    const i = Math.floor(Math.random()*SHAPES.length);
    const c = PAL[Math.floor(Math.random()*PAL.length)];
    return {shape:SHAPES[i], color:c};
  }

  // ───────── YERLEŞTİRME KONTROLÜ ─────────
  function canPlace(sh, r, c) {
    for (let dy=0;dy<sh.length;dy++) for (let dx=0;dx<sh[0].length;dx++) {
      if (sh[dy][dx]) { if (r+dy<0||r+dy>=G||c+dx<0||c+dx>=G||board[r+dy][c+dx]) return false; }
    } return true;
  }

  // ───────── RENDER ─────────
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let y=0;y<G;y++) for (let x=0;x<G;x++) {
      const d = document.createElement('div');
      d.className = 'bp-c' + (board[y][x] ? ' filled' : '');
      d.dataset.y = y; d.dataset.x = x;
      if (board[y][x]) {
        const col = board[y][x];
        d.style.background = `linear-gradient(145deg,${col.l},${col.f})`;
        d.style.boxShadow = `inset 0 -2px 0 rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.15),0 2px 6px ${col.g}`;
      }
      boardEl.appendChild(d);
    }
  }

  function renderTray(animate) {
    trayEl.innerHTML = '';
    if (animate) { trayEl.classList.add('glow-in'); setTimeout(()=>trayEl.classList.remove('glow-in'),700); }
    pieces.forEach((p,i) => {
      const wrap = document.createElement('div');
      if (!p) {
        wrap.className='bp-tp empty';
        wrap.style.cssText='width:50px;height:50px';
        trayEl.appendChild(wrap); return;
      }
      const cols = p.shape[0].length;
      wrap.className = 'bp-tp' + (animate ? ' new-in' : '');
      if (animate) wrap.style.animationDelay = (i*100)+'ms';
      wrap.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      wrap.dataset.idx = i;
      p.shape.forEach(r => r.forEach(v => {
        const c = document.createElement('div');
        c.className = 'bp-tc';
        c.style.background = v ? `linear-gradient(145deg,${p.color.l},${p.color.f})` : 'transparent';
        if (v) c.style.boxShadow = `inset 0 -1px 0 rgba(0,0,0,.2),0 1px 3px ${p.color.g}`;
        wrap.appendChild(c);
      }));
      const onStart = (e) => { e.preventDefault(); grabPiece(i, e); };
      addEv(wrap, 'touchstart', onStart, {passive:false});
      addEv(wrap, 'mousedown', onStart);
      trayEl.appendChild(wrap);
    });
  }

  function renderScoreBar(bump) {
    const sb = wrapEl.querySelector('.bp-score-bar');
    const valEl = sb.querySelector('.sb-val');
    valEl.textContent = score.toLocaleString();
    if (bump) { valEl.classList.remove('bump'); void valEl.offsetWidth; valEl.classList.add('bump'); }
    sb.querySelector('.sb-hi').textContent = 'EN YÜKSEK: '+highScore.toLocaleString();
    const cb = sb.querySelector('.sb-combo');
    if (combo > 1) { cb.textContent = 'COMBO x'+combo; cb.classList.remove('on'); void cb.offsetWidth; cb.classList.add('on'); }
    else cb.classList.remove('on');
    updateGameScore(score);
  }

  // ───────── TRAY PARÇA KAYBOLMA ─────────
  function fadeOutTrayPiece(idx) {
    const el = trayEl.children[idx];
    if (!el) return;
    el.classList.remove('grabbed');
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => {
      el.classList.remove('fade-out');
      el.classList.add('empty');
      el.innerHTML = '';
      el.style.cssText = 'width:50px;height:50px';
    }, {once:true});
  }

  // ───────── SÜRÜKLE-BIRAK ─────────
  function grabPiece(idx, e) {
    if (locked || drag) return;
    const p = pieces[idx];
    if (!p) return;

    snd('pickup');
    haptic(15);

    const touch = e.touches ? e.touches[0] : e;
    const trayPiece = trayEl.children[idx];
    trayPiece.classList.add('grabbed');

    const bRect = boardEl.getBoundingClientRect();
    const cs = (bRect.width - 3*(G-1) - 10) / G;
    const cols = p.shape[0].length, rows = p.shape.length;
    const ghost = document.createElement('div');
    ghost.className = 'bp-ghost';
    ghost.style.gridTemplateColumns = `repeat(${cols},${cs}px)`;
    ghost.style.gap = '3px';
    p.shape.flat().forEach(v => {
      const gc = document.createElement('div');
      gc.className = 'bp-gc';
      gc.style.width = cs+'px'; gc.style.height = cs+'px';
      gc.style.background = v ? `linear-gradient(145deg,${p.color.l},${p.color.f})` : 'transparent';
      gc.style.opacity = v ? '1' : '0';
      if (v) gc.style.boxShadow = `0 0 14px ${p.color.g},inset 0 -2px 0 rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.15)`;
      ghost.appendChild(gc);
    });
    document.body.appendChild(ghost);

    const ghostW = cols*cs + (cols-1)*3;
    const ghostH = rows*cs + (rows-1)*3;

    drag = { idx, piece:p, ghost, bRect, cs, ghostW, ghostH, row:-1, col:-1, valid:false };
    posGhost(touch.clientX, touch.clientY);

    const onMove = (ev) => { ev.preventDefault(); const t=ev.touches?ev.touches[0]:ev; posGhost(t.clientX,t.clientY); showPreview(t.clientX,t.clientY); };
    const onEnd = () => { document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',onEnd); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onEnd); dropPiece(); };
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('touchend',onEnd);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onEnd);
  }

  function posGhost(cx, cy) {
    if (!drag) return;
    drag.ghost.style.left = (cx - drag.ghostW/2) + 'px';
    drag.ghost.style.top = (cy - drag.ghostH - 40) + 'px';
  }

  function showPreview(cx, cy) {
    if (!drag) return;
    clearPreview();
    const {piece, bRect, cs} = drag;
    const gx = cx - drag.ghostW/2;
    const gy = cy - drag.ghostH - 40;
    const col = Math.round((gx - bRect.left - 5) / (cs+3));
    const row = Math.round((gy - bRect.top - 5) / (cs+3));
    const wasValid = drag.valid;
    drag.row = row; drag.col = col;
    drag.valid = canPlace(piece.shape, row, col);

    // Haptic when entering valid zone
    if (drag.valid && !wasValid) haptic(10);

    piece.shape.forEach((r,dy) => r.forEach((v,dx) => {
      if (!v) return;
      const ry = row+dy, rx = col+dx;
      if (ry<0||ry>=G||rx<0||rx>=G) return;
      const cell = boardEl.children[ry*G+rx];
      if (cell) cell.classList.add(drag.valid ? 'pv-ok' : 'pv-no');
    }));
  }

  function clearPreview() {
    boardEl.querySelectorAll('.pv-ok,.pv-no').forEach(c => c.classList.remove('pv-ok','pv-no'));
  }

  function dropPiece() {
    if (!drag) return;
    const {idx, piece, ghost, row, col, valid} = drag;
    ghost.remove();
    clearPreview();

    if (valid) {
      placePiece(idx, piece, row, col);
    } else {
      const trayPiece = trayEl.children[idx];
      if (trayPiece) trayPiece.classList.remove('grabbed');
    }
    drag = null;
  }

  // ───────── YERLEŞTİRME ─────────
  function placePiece(idx, piece, row, col) {
    locked = true;
    const placedCells = [];
    piece.shape.forEach((r,dy) => r.forEach((v,dx) => {
      if (v) {
        board[row+dy][col+dx] = piece.color;
        placedCells.push({y:row+dy,x:col+dx});
      }
    }));

    snd('place');
    haptic(25);
    pieces[idx] = null;

    // Tray parça kaybolma animasyonu
    fadeOutTrayPiece(idx);

    // Yerleştirme puanı
    score += 10;

    // Board güncelle ve animasyon
    renderBoard();
    placedCells.forEach(({y,x},i) => {
      const cell = boardEl.children[y*G+x];
      if (cell) { cell.style.animationDelay = (i*30)+'ms'; cell.classList.add('place-in'); }
    });
    renderScoreBar(true);

    // Mini sarsıntı
    screenShake(2, 100);

    // Satır/sütun kontrolü
    setTimeout(() => {
      const lines = findCompleteLines();
      if (lines.length > 0) {
        combo++;
        animateClear(lines, () => {
          const lineScore = lines.length===1?10:lines.length===2?30:lines.length===3?60:100+lines.length*20;
          const comboMult = Math.max(1, combo);
          const totalAdd = lineScore * comboMult;
          score += totalAdd;

          // Uçan skor (combo'da daha büyük)
          const bw = boardEl.offsetWidth;
          const bh = boardEl.offsetHeight;
          floatText('+'+totalAdd, bw/2-20, bh/2-10, '#fbbf24', combo>1);

          if (combo > 1) {
            snd('combo');
            showCombo(combo);
            haptic([30,20,40,20,50]); // pattern vibration
          } else {
            snd('clear');
            haptic(30);
          }

          if (score > highScore) highScore = score;
          renderScoreBar(true);
          afterPlace();
          locked = false;
        });
      } else {
        combo = 0;
        renderScoreBar(false);
        afterPlace();
        locked = false;
      }
    }, 180);
  }

  // ───────── YERLEŞTİRME SONRASI ─────────
  function afterPlace() {
    if (pieces.every(p=>!p)) {
      setTimeout(() => {
        pieces = [rndPiece(),rndPiece(),rndPiece()];
        renderTray(true);
        haptic(15);

        // Yeni blok geldikten sonra tekrar kontrol
        setTimeout(() => {
          if (!anyPieceFits()) {
            snd('over');
            haptic([100,50,100]);
            setTimeout(()=>showGameOver(false,'Oyun Bitti 💥','Skor: '+score.toLocaleString()+'\nEn Yüksek: '+highScore.toLocaleString()),300);
          }
        }, 500);
      }, 200);
    } else {
      if (!anyPieceFits()) {
        snd('over');
        haptic([100,50,100]);
        setTimeout(()=>showGameOver(false,'Oyun Bitti 💥','Skor: '+score.toLocaleString()+'\nEn Yüksek: '+highScore.toLocaleString()),300);
      }
    }
  }

  // ───────── SATIR/SÜTUN TEMİZLEME ─────────
  function findCompleteLines() {
    const lines = [];
    for (let r=0;r<G;r++) { if (board[r].every(v=>v)) lines.push({type:'row',idx:r}); }
    for (let c=0;c<G;c++) { let full=true; for(let r=0;r<G;r++) if(!board[r][c]) full=false; if(full) lines.push({type:'col',idx:c}); }
    return lines;
  }

  function animateClear(lines, cb) {
    const cells = new Set();
    lines.forEach(l => {
      if (l.type==='row') for(let x=0;x<G;x++) cells.add(l.idx*G+x);
      else for(let y=0;y<G;y++) cells.add(y*G+l.idx);
    });

    const intensity = Math.min(lines.length * 2 + combo, 12);
    const particleCount = 8 + lines.length*4 + combo*3;

    // 1. Flash + haptic
    haptic(20);
    cells.forEach(i => { const el=boardEl.children[i]; if(el) el.classList.add('flash'); });

    // 2. Işık dalgası (her satır/sütunun ortasından)
    setTimeout(() => {
      const bRect = boardEl.getBoundingClientRect();
      lines.forEach(l => {
        let cx, cy;
        if (l.type==='row') {
          cx = bRect.width/2;
          const firstCell = boardEl.children[l.idx*G];
          cy = firstCell ? firstCell.offsetTop + firstCell.offsetHeight/2 : bRect.height/2;
        } else {
          const firstCell = boardEl.children[l.idx];
          cx = firstCell ? firstCell.offsetLeft + firstCell.offsetWidth/2 : bRect.width/2;
          cy = bRect.height/2;
        }
        lightWave(cx, cy, '#fff');
      });
    }, 150);

    // 3. Sarsıntı + flash + enerji çözülme + parçacıklar
    setTimeout(() => {
      screenShake(3 + intensity, 250 + intensity*20);
      if (lines.length >= 2 || combo >= 2) screenFlash('rgba(255,255,255,.12)', 350);

      const bRect = boardEl.getBoundingClientRect();
      let delay = 0;
      cells.forEach(i => {
        setTimeout(() => {
          const el = boardEl.children[i];
          if (!el) return;
          const eRect = el.getBoundingClientRect();
          const cx = eRect.left - bRect.left + eRect.width/2;
          const cy = eRect.top - bRect.top + eRect.height/2;
          const col = board[Math.floor(i/G)][i%G];
          const color = col?.f || '#fff';

          // Parçacıklar
          spawnParticles(cx, cy, color, Math.ceil(particleCount / cells.size));
          spawnParticles(cx, cy, col?.l || '#fff', 3); // extra glow particles
          if (combo >= 2) sparkTrail(cx, cy, color, 3);

          el.classList.remove('flash');
          el.classList.add('energy');
        }, delay);
        delay += 20; // zincirleme efekt
      });

      haptic(40 + intensity*5);

      setTimeout(() => {
        lines.forEach(l => {
          if (l.type==='row') board[l.idx] = Array(G).fill(0);
          else for(let r=0;r<G;r++) board[r][l.idx]=0;
        });
        renderBoard();
        if (cb) cb();
      }, 450);
    }, 350);
  }

  // ───────── OYUN BİTTİ KONTROLÜ ─────────
  function anyPieceFits() {
    return pieces.some(p => {
      if (!p) return false;
      for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(canPlace(p.shape,y,x)) return true;
      return false;
    });
  }

  // ───────── INIT / CLEANUP ─────────
  function init(c) {
    container = c;
    score = 0; combo = 0; locked = false;
    highScore = parseInt(localStorage.getItem('bp_hi')||'0',10);
    board = Array.from({length:G},()=>Array(G).fill(0));
    pieces = [rndPiece(),rndPiece(),rndPiece()];

    injectCSS();

    wrapEl = document.createElement('div');
    wrapEl.className = 'bp-wrap';
    wrapEl.innerHTML = `
      <div class="bp-score-bar">
        <div class="sb-left"><span class="sb-lbl">SKOR</span><span class="sb-val">0</span></div>
        <span class="sb-combo"></span>
        <span class="sb-hi">EN YÜKSEK: ${highScore.toLocaleString()}</span>
      </div>
    `;
    boardEl = document.createElement('div');
    boardEl.className = 'bp-board';
    trayEl = document.createElement('div');
    trayEl.className = 'bp-tray';

    wrapEl.appendChild(boardEl);
    wrapEl.appendChild(trayEl);
    container.appendChild(wrapEl);

    renderBoard();
    renderTray(true);
    renderScoreBar(false);
  }

  function cleanup() {
    if (score > highScore) localStorage.setItem('bp_hi', score.toString());
    clearEvs();
    drag = null; locked = false;
  }

  return {init, cleanup};
})();

// ╔══════════════════════════════════════╗
// ║        6. LABİRENT                   ║
// ╚══════════════════════════════════════╝
PuzzleGames.mazeGame = (() => {
  const W = 13, H = 13;
  let maze, playerX, playerY, endX, endY, startTime, moveCount, container;

  function init(c) {
    container = c; startTime = Date.now(); moveCount = 0;
    generateMaze();
    playerX = 1; playerY = 1; endX = W-2; endY = H-2;
    injectStyle('css-maze', `
      .maze-grid{display:grid;grid-template-columns:repeat(${W},1fr);gap:1px;width:100%;max-width:360px;padding:2px;border-radius:10px;background:rgba(255,255,255,0.02)}
      .mz-c{aspect-ratio:1;border-radius:2px;transition:background .15s}
      .mz-wall{background:rgba(255,255,255,0.12)}
      .mz-path{background:rgba(255,255,255,0.02)}
      .mz-player{background:#22c55e;border-radius:50%;box-shadow:0 0 8px rgba(34,197,94,0.5)}
      .mz-end{background:#ef4444;border-radius:50%;box-shadow:0 0 8px rgba(239,68,68,0.5);animation:mzPulse 1s infinite}
      .mz-trail{background:rgba(168,85,247,0.15)}
      .mz-info{display:flex;gap:20px;justify-content:center;font-size:13px;font-weight:700;color:#9a9ab0;margin-top:6px}
      @keyframes mzPulse{0%,100%{opacity:1}50%{opacity:0.5}}
    `);
    render();
    let tx,ty;
    addEv(container,'touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
    addEv(container,'touchend',e=>{const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;if(Math.abs(dx)>20||Math.abs(dy)>20){Math.abs(dx)>Math.abs(dy)?movePlayer(dx>0?1:(-1),0):movePlayer(0,dy>0?1:(-1))}},{passive:true});
    addEv(document,'keydown',onKey);
  }
  function onKey(e){
    const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    if(map[e.key]){e.preventDefault();movePlayer(map[e.key][0],map[e.key][1])}
  }
  function generateMaze() {
    maze = Array.from({length:H},()=>Array(W).fill(1));
    function carve(x,y){
      maze[y][x]=0;
      const dirs=[[0,-2],[0,2],[-2,0],[2,0]].sort(()=>Math.random()-0.5);
      for(const[dx,dy]of dirs){
        const nx=x+dx,ny=y+dy;
        if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&maze[ny][nx]===1){maze[y+dy/2][x+dx/2]=0;carve(nx,ny)}
      }
    }
    carve(1,1);
    maze[H-2][W-2]=0; // çıkış açık
  }
  function movePlayer(dx,dy) {
    const nx=playerX+dx, ny=playerY+dy;
    if(nx<0||nx>=W||ny<0||ny>=H||maze[ny][nx]===1)return;
    maze[playerY][playerX] = 2; // trail
    GameAudio.play('step');
    playerX=nx; playerY=ny; moveCount++;
    const secs = Math.floor((Date.now()-startTime)/1000);
    updateGameScore(Math.max(5000-secs*50-moveCount*5,500));
    render();
    if(playerX===endX&&playerY===endY){
      GameAudio.play('win'); GameAudio.haptic(25);
      showGameOver(true,'Çıkışı Buldun! 🌀',`${secs} saniye, ${moveCount} adım`);
    }
  }
  function render() {
    const secs = Math.floor((Date.now()-startTime)/1000);
    container.innerHTML = `
      <div class="maze-grid">${maze.map((r,y)=>r.map((v,x)=>{
        if(x===playerX&&y===playerY)return '<div class="mz-c mz-player"></div>';
        if(x===endX&&y===endY)return '<div class="mz-c mz-end"></div>';
        return `<div class="mz-c ${v===1?'mz-wall':v===2?'mz-trail':'mz-path'}"></div>`
      }).join('')).join('')}</div>
      <div class="mz-info"><div>⏱️ ${secs}s</div><div>👣 ${moveCount} adım</div></div>`;
  }
  function cleanup(){clearEvs()}
  return {init,cleanup};
})();


// ╔══════════════════════════════════════╗
// ║     7. VİDA USTASI (SCREW PUZZLE)    ║
// ╚══════════════════════════════════════╝
PuzzleGames.screwPuzzle = (() => {
  // ───────── RENK PALETİ ─────────
  const PAL = [
    {f:'#ef4444',l:'#f87171',g:'rgba(239,68,68,.4)'},
    {f:'#3b82f6',l:'#60a5fa',g:'rgba(59,130,246,.4)'},
    {f:'#22c55e',l:'#4ade80',g:'rgba(34,197,94,.4)'},
    {f:'#eab308',l:'#fbbf24',g:'rgba(234,179,8,.4)'},
    {f:'#a855f7',l:'#c084fc',g:'rgba(168,85,247,.4)'},
  ];
  const WOOD = [
    {f:'#b8860b',l:'#d4a834',d:'#7a5a08'},
    {f:'#a0522d',l:'#c4764d',d:'#6d3519'},
    {f:'#8b6914',l:'#b08a3a',d:'#5c4610'},
    {f:'#cd853f',l:'#dca060',d:'#9a6228'},
    {f:'#9b7653',l:'#b89474',d:'#6b4e33'},
    {f:'#8b4513',l:'#b06030',d:'#5a2d0c'},
  ];
  const MAX_SLOTS = 5;
  const SCR_SZ = 44; // vida pixel boyutu

  // ───────── 20 LEVEL ─────────
  const LEVELS = [
    {boards:[{x:12,y:45,w:76,h:28,screws:[{rx:.15,ry:.35,c:0},{rx:.85,ry:.35,c:1},{rx:.15,ry:.75,c:0},{rx:.85,ry:.75,c:1}]},{x:25,y:30,w:50,h:24,screws:[{rx:.2,ry:.35,c:1},{rx:.8,ry:.35,c:0},{rx:.2,ry:.75,c:0},{rx:.8,ry:.75,c:1}]}]},
    {boards:[{x:10,y:48,w:80,h:26,screws:[{rx:.15,ry:.35,c:0},{rx:.85,ry:.35,c:0},{rx:.15,ry:.75,c:1},{rx:.85,ry:.75,c:1}]},{x:22,y:32,w:56,h:24,screws:[{rx:.2,ry:.35,c:1},{rx:.8,ry:.35,c:0},{rx:.2,ry:.75,c:0},{rx:.8,ry:.75,c:1}]}]},
    {boards:[{x:8,y:46,w:70,h:28,screws:[{rx:.15,ry:.3,c:1},{rx:.85,ry:.3,c:0},{rx:.15,ry:.7,c:1},{rx:.85,ry:.7,c:0}]},{x:30,y:30,w:58,h:24,screws:[{rx:.2,ry:.35,c:0},{rx:.8,ry:.35,c:1},{rx:.2,ry:.75,c:0},{rx:.8,ry:.75,c:1}]}]},
    {boards:[{x:8,y:55,w:84,h:22,screws:[{rx:.12,ry:.4,c:0},{rx:.5,ry:.4,c:1},{rx:.88,ry:.4,c:2},{rx:.3,ry:.8,c:0}]},{x:18,y:40,w:64,h:22,screws:[{rx:.15,ry:.4,c:1},{rx:.85,ry:.4,c:2},{rx:.5,ry:.8,c:0}]},{x:28,y:26,w:48,h:20,screws:[{rx:.2,ry:.4,c:2},{rx:.8,ry:.4,c:0},{rx:.5,ry:.8,c:1}]}]},
    {boards:[{x:6,y:56,w:82,h:22,screws:[{rx:.12,ry:.4,c:2},{rx:.5,ry:.4,c:0},{rx:.88,ry:.4,c:1}]},{x:20,y:42,w:68,h:22,screws:[{rx:.15,ry:.4,c:0},{rx:.85,ry:.4,c:1},{rx:.5,ry:.8,c:2}]},{x:14,y:28,w:58,h:20,screws:[{rx:.2,ry:.4,c:1},{rx:.8,ry:.4,c:2},{rx:.5,ry:.8,c:0}]}]},
    {boards:[{x:5,y:58,w:78,h:20,screws:[{rx:.12,ry:.4,c:1},{rx:.5,ry:.4,c:0},{rx:.88,ry:.4,c:2}]},{x:24,y:44,w:66,h:20,screws:[{rx:.15,ry:.4,c:0},{rx:.85,ry:.4,c:2},{rx:.5,ry:.8,c:1}]},{x:16,y:30,w:54,h:18,screws:[{rx:.2,ry:.4,c:2},{rx:.8,ry:.4,c:0},{rx:.5,ry:.8,c:1}]}]},
    {boards:[{x:10,y:58,w:80,h:20,screws:[{rx:.12,ry:.4,c:0},{rx:.5,ry:.4,c:2},{rx:.88,ry:.4,c:1}]},{x:5,y:44,w:64,h:20,screws:[{rx:.15,ry:.4,c:2},{rx:.85,ry:.4,c:1},{rx:.5,ry:.8,c:0}]},{x:34,y:30,w:56,h:18,screws:[{rx:.2,ry:.4,c:1},{rx:.8,ry:.4,c:0},{rx:.5,ry:.8,c:2}]}]},
    {boards:[{x:8,y:58,w:84,h:20,screws:[{rx:.1,ry:.4,c:0},{rx:.4,ry:.4,c:1},{rx:.7,ry:.4,c:3},{rx:.9,ry:.4,c:2}]},{x:18,y:42,w:66,h:20,screws:[{rx:.15,ry:.4,c:2},{rx:.85,ry:.4,c:3},{rx:.5,ry:.8,c:0}]},{x:26,y:28,w:50,h:18,screws:[{rx:.2,ry:.4,c:1},{rx:.8,ry:.4,c:0},{rx:.5,ry:.8,c:3}]}]},
    {boards:[{x:5,y:62,w:88,h:18,screws:[{rx:.1,ry:.4,c:0},{rx:.35,ry:.4,c:1},{rx:.65,ry:.4,c:2},{rx:.9,ry:.4,c:3}]},{x:18,y:48,w:66,h:18,screws:[{rx:.15,ry:.4,c:3},{rx:.85,ry:.4,c:0},{rx:.5,ry:.8,c:1}]},{x:10,y:34,w:62,h:18,screws:[{rx:.15,ry:.4,c:1},{rx:.85,ry:.4,c:2},{rx:.5,ry:.8,c:3}]},{x:32,y:20,w:46,h:18,screws:[{rx:.2,ry:.5,c:2},{rx:.8,ry:.5,c:0}]}]},
    {boards:[{x:3,y:64,w:92,h:16,screws:[{rx:.1,ry:.4,c:1},{rx:.35,ry:.4,c:3},{rx:.65,ry:.4,c:0},{rx:.9,ry:.4,c:2}]},{x:20,y:50,w:68,h:18,screws:[{rx:.15,ry:.4,c:0},{rx:.85,ry:.4,c:2},{rx:.5,ry:.8,c:3}]},{x:8,y:36,w:66,h:18,screws:[{rx:.15,ry:.4,c:2},{rx:.85,ry:.4,c:1},{rx:.5,ry:.8,c:0}]},{x:30,y:22,w:50,h:18,screws:[{rx:.2,ry:.5,c:3},{rx:.8,ry:.5,c:1}]}]},
    {boards:[{x:8,y:60,w:80,h:18,screws:[{rx:.12,ry:.4,c:3},{rx:.5,ry:.4,c:0},{rx:.88,ry:.4,c:1}]},{x:3,y:46,w:84,h:18,screws:[{rx:.1,ry:.4,c:2},{rx:.4,ry:.4,c:1},{rx:.7,ry:.4,c:3},{rx:.9,ry:.4,c:0}]},{x:18,y:32,w:62,h:16,screws:[{rx:.15,ry:.4,c:0},{rx:.85,ry:.4,c:3},{rx:.5,ry:.8,c:2}]},{x:10,y:18,w:54,h:16,screws:[{rx:.2,ry:.5,c:1},{rx:.8,ry:.5,c:2}]}]},
    {boards:[{x:5,y:62,w:86,h:16,screws:[{rx:.1,ry:.4,c:2},{rx:.35,ry:.4,c:0},{rx:.65,ry:.4,c:1},{rx:.9,ry:.4,c:3}]},{x:15,y:48,w:70,h:18,screws:[{rx:.15,ry:.4,c:1},{rx:.85,ry:.4,c:3},{rx:.5,ry:.8,c:0}]},{x:3,y:34,w:78,h:16,screws:[{rx:.1,ry:.4,c:0},{rx:.5,ry:.4,c:2},{rx:.9,ry:.4,c:1}]},{x:28,y:20,w:52,h:16,screws:[{rx:.2,ry:.5,c:3},{rx:.8,ry:.5,c:2}]}]},
    {boards:[{x:3,y:64,w:90,h:16,screws:[{rx:.1,ry:.4,c:0},{rx:.3,ry:.4,c:4},{rx:.5,ry:.4,c:1},{rx:.7,ry:.4,c:2},{rx:.9,ry:.4,c:3}]},{x:15,y:50,w:72,h:16,screws:[{rx:.12,ry:.4,c:3},{rx:.5,ry:.4,c:0},{rx:.88,ry:.4,c:4}]},{x:5,y:36,w:78,h:16,screws:[{rx:.12,ry:.4,c:2},{rx:.5,ry:.4,c:3},{rx:.88,ry:.4,c:0}]},{x:25,y:22,w:52,h:16,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:4},{rx:.8,ry:.5,c:2}]}]},
    {boards:[{x:2,y:66,w:94,h:14,screws:[{rx:.08,ry:.5,c:0},{rx:.25,ry:.5,c:1},{rx:.42,ry:.5,c:2},{rx:.58,ry:.5,c:3},{rx:.75,ry:.5,c:0},{rx:.92,ry:.5,c:1}]},{x:12,y:52,w:76,h:16,screws:[{rx:.12,ry:.4,c:3},{rx:.5,ry:.4,c:2},{rx:.88,ry:.4,c:0}]},{x:5,y:38,w:80,h:16,screws:[{rx:.12,ry:.4,c:1},{rx:.5,ry:.4,c:0},{rx:.88,ry:.4,c:3}]},{x:22,y:24,w:58,h:16,screws:[{rx:.15,ry:.5,c:2},{rx:.85,ry:.5,c:1}]},{x:15,y:12,w:50,h:14,screws:[{rx:.2,ry:.5,c:0},{rx:.8,ry:.5,c:3}]}]},
    {boards:[{x:2,y:68,w:94,h:14,screws:[{rx:.08,ry:.5,c:0},{rx:.25,ry:.5,c:4},{rx:.42,ry:.5,c:1},{rx:.58,ry:.5,c:3},{rx:.75,ry:.5,c:2},{rx:.92,ry:.5,c:0}]},{x:10,y:54,w:78,h:14,screws:[{rx:.12,ry:.5,c:2},{rx:.4,ry:.5,c:0},{rx:.68,ry:.5,c:4},{rx:.88,ry:.5,c:1}]},{x:5,y:40,w:72,h:14,screws:[{rx:.12,ry:.5,c:3},{rx:.5,ry:.5,c:2},{rx:.88,ry:.5,c:0}]},{x:22,y:26,w:60,h:14,screws:[{rx:.15,ry:.5,c:1},{rx:.85,ry:.5,c:3},{rx:.5,ry:.5,c:4}]},{x:15,y:12,w:52,h:14,screws:[{rx:.2,ry:.5,c:4},{rx:.8,ry:.5,c:2}]}]},
    {boards:[{x:3,y:68,w:92,h:14,screws:[{rx:.08,ry:.5,c:4},{rx:.25,ry:.5,c:1},{rx:.42,ry:.5,c:0},{rx:.58,ry:.5,c:2},{rx:.75,ry:.5,c:3},{rx:.92,ry:.5,c:1}]},{x:12,y:54,w:76,h:14,screws:[{rx:.1,ry:.5,c:3},{rx:.35,ry:.5,c:4},{rx:.65,ry:.5,c:1},{rx:.9,ry:.5,c:0}]},{x:3,y:40,w:82,h:14,screws:[{rx:.1,ry:.5,c:2},{rx:.35,ry:.5,c:0},{rx:.65,ry:.5,c:3},{rx:.9,ry:.5,c:4}]},{x:20,y:26,w:62,h:14,screws:[{rx:.15,ry:.5,c:1},{rx:.5,ry:.5,c:4},{rx:.85,ry:.5,c:2}]},{x:10,y:12,w:60,h:14,screws:[{rx:.15,ry:.5,c:0},{rx:.5,ry:.5,c:3},{rx:.85,ry:.5,c:1}]}]},
    {boards:[{x:5,y:68,w:88,h:14,screws:[{rx:.1,ry:.5,c:1},{rx:.3,ry:.5,c:3},{rx:.5,ry:.5,c:4},{rx:.7,ry:.5,c:0},{rx:.9,ry:.5,c:2}]},{x:12,y:54,w:72,h:14,screws:[{rx:.12,ry:.5,c:0},{rx:.5,ry:.5,c:2},{rx:.88,ry:.5,c:1}]},{x:3,y:40,w:84,h:14,screws:[{rx:.1,ry:.5,c:4},{rx:.35,ry:.5,c:0},{rx:.65,ry:.5,c:3},{rx:.9,ry:.5,c:2}]},{x:20,y:26,w:62,h:14,screws:[{rx:.15,ry:.5,c:2},{rx:.5,ry:.5,c:1},{rx:.85,ry:.5,c:0}]},{x:10,y:12,w:66,h:14,screws:[{rx:.15,ry:.5,c:3},{rx:.5,ry:.5,c:4},{rx:.85,ry:.5,c:2}]}]},
    {boards:[{x:2,y:70,w:94,h:13,screws:[{rx:.06,ry:.5,c:0},{rx:.22,ry:.5,c:2},{rx:.38,ry:.5,c:4},{rx:.54,ry:.5,c:1},{rx:.7,ry:.5,c:3},{rx:.86,ry:.5,c:0}]},{x:10,y:56,w:78,h:14,screws:[{rx:.1,ry:.5,c:3},{rx:.35,ry:.5,c:0},{rx:.65,ry:.5,c:1},{rx:.9,ry:.5,c:4}]},{x:3,y:42,w:84,h:14,screws:[{rx:.1,ry:.5,c:2},{rx:.35,ry:.5,c:3},{rx:.65,ry:.5,c:0},{rx:.9,ry:.5,c:1}]},{x:18,y:28,w:66,h:14,screws:[{rx:.15,ry:.5,c:4},{rx:.5,ry:.5,c:1},{rx:.85,ry:.5,c:2}]},{x:8,y:14,w:72,h:14,screws:[{rx:.12,ry:.5,c:1},{rx:.5,ry:.5,c:4},{rx:.88,ry:.5,c:0}]},{x:26,y:2,w:46,h:12,screws:[{rx:.25,ry:.5,c:3},{rx:.75,ry:.5,c:2}]}]},
    {boards:[{x:2,y:72,w:94,h:13,screws:[{rx:.06,ry:.5,c:4},{rx:.22,ry:.5,c:0},{rx:.38,ry:.5,c:2},{rx:.54,ry:.5,c:3},{rx:.7,ry:.5,c:1},{rx:.86,ry:.5,c:4}]},{x:8,y:58,w:82,h:14,screws:[{rx:.1,ry:.5,c:1},{rx:.3,ry:.5,c:4},{rx:.5,ry:.5,c:0},{rx:.7,ry:.5,c:2},{rx:.9,ry:.5,c:3}]},{x:3,y:44,w:88,h:14,screws:[{rx:.1,ry:.5,c:3},{rx:.35,ry:.5,c:1},{rx:.65,ry:.5,c:4},{rx:.9,ry:.5,c:0}]},{x:15,y:30,w:68,h:14,screws:[{rx:.12,ry:.5,c:2},{rx:.5,ry:.5,c:3},{rx:.88,ry:.5,c:1}]},{x:5,y:16,w:76,h:14,screws:[{rx:.12,ry:.5,c:0},{rx:.5,ry:.5,c:2},{rx:.88,ry:.5,c:4}]},{x:22,y:2,w:54,h:14,screws:[{rx:.2,ry:.5,c:3},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:0}]}]},
    {boards:[{x:1,y:74,w:96,h:12,screws:[{rx:.06,ry:.5,c:2},{rx:.18,ry:.5,c:4},{rx:.32,ry:.5,c:0},{rx:.46,ry:.5,c:1},{rx:.6,ry:.5,c:3},{rx:.74,ry:.5,c:0},{rx:.88,ry:.5,c:2}]},{x:6,y:60,w:86,h:14,screws:[{rx:.08,ry:.5,c:1},{rx:.25,ry:.5,c:3},{rx:.42,ry:.5,c:4},{rx:.58,ry:.5,c:0},{rx:.75,ry:.5,c:2},{rx:.92,ry:.5,c:1}]},{x:3,y:46,w:90,h:14,screws:[{rx:.1,ry:.5,c:0},{rx:.3,ry:.5,c:2},{rx:.5,ry:.5,c:1},{rx:.7,ry:.5,c:4},{rx:.9,ry:.5,c:3}]},{x:12,y:32,w:72,h:14,screws:[{rx:.12,ry:.5,c:3},{rx:.5,ry:.5,c:0},{rx:.88,ry:.5,c:4}]},{x:5,y:18,w:80,h:14,screws:[{rx:.1,ry:.5,c:4},{rx:.35,ry:.5,c:1},{rx:.65,ry:.5,c:3},{rx:.9,ry:.5,c:2}]},{x:20,y:4,w:58,h:14,screws:[{rx:.15,ry:.5,c:0},{rx:.5,ry:.5,c:3},{rx:.85,ry:.5,c:4}]}]}
  ];

  let container, level, score, slots, screws, boards, undoStack, undoUsed;
  let wrapEl, areaEl, slotsEl;
  let animating = false;
  let aCtx = null;

  // ───────── HAPTİK ─────────
  function haptic(ms) { GameAudio.haptic(ms); }

  // ───────── SES ─────────
  function snd(type) { GameAudio.play(type); }

  // ───────── EKRAN SARSINTISI ─────────
  function screenShake(intensity, dur) {
    const el = wrapEl, start = performance.now();
    const anim = (now) => {
      const elapsed = now - start;
      if (elapsed > dur) { el.style.transform = ''; return; }
      const decay = 1 - elapsed/dur;
      el.style.transform = `translate(${(Math.random()*2-1)*intensity*decay}px,${(Math.random()*2-1)*intensity*decay}px)`;
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ───────── PARTİKÜLLER ─────────
  function particles(cx, cy, color, n) {
    for(let i=0;i<n;i++){
      const p=document.createElement('div');
      const a=(Math.PI*2/n)*i+Math.random()*.4, d=20+Math.random()*50, sz=3+Math.random()*6;
      p.style.cssText=`position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${color};border-radius:${Math.random()>.5?'50%':'2px'};pointer-events:none;z-index:200;box-shadow:0 0 ${sz*2}px ${color};animation:spPart ${400+Math.random()*300}ms cubic-bezier(.2,.8,.3,1) forwards`;
      p.style.setProperty('--px',Math.cos(a)*d+'px');
      p.style.setProperty('--py',Math.sin(a)*d+'px');
      areaEl.appendChild(p);
      setTimeout(()=>p.remove(),750);
    }
  }

  // ───────── UÇAN SKOR ─────────
  function floatText(text, x, y, color, big) {
    const el=document.createElement('div');
    el.textContent=text;
    const sz=big?28:18;
    el.style.cssText=`position:absolute;left:${x}px;top:${y}px;font-size:${sz}px;font-weight:900;color:${color||'#fbbf24'};pointer-events:none;z-index:210;white-space:nowrap;text-shadow:0 0 12px ${color||'#fbbf24'},0 2px 8px rgba(0,0,0,.5);animation:spFloat 1s ease-out forwards`;
    areaEl.appendChild(el);
    setTimeout(()=>el.remove(),1100);
  }

  // ───────── CSS ─────────
  function injectCSS() {
    injectStyle('css-screw', `
      .sp2-wrap{position:relative;width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center;gap:12px;will-change:transform;margin:0 auto}
      .sp2-bar{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 4px}
      .sp2-bar .sb-left{display:flex;align-items:center;gap:6px}
      .sp2-bar .sb-lbl{font-size:11px;font-weight:700;color:#5d5d78;letter-spacing:1px}
      .sp2-bar .sb-val{font-size:22px;font-weight:900;color:#fbbf24;transition:transform .15s}
      .sp2-bar .sb-val.bump{animation:spBump .3s ease}
      .sp2-bar .sb-hi{font-size:11px;color:#5d5d78;font-weight:600}
      .sp2-undo{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;font:700 12px/1 inherit;padding:7px 14px;border-radius:20px;cursor:pointer;transition:.2s;user-select:none}
      .sp2-undo:active{transform:scale(.92);background:rgba(168,85,247,.3)}
      .sp2-undo.off{opacity:.25;pointer-events:none}
      .sp2-area{position:relative;width:100%;aspect-ratio:5/6;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 4px 24px rgba(0,0,0,.2);overflow:hidden}
      .sp2-board{position:absolute;border-radius:10px;pointer-events:none;transition:transform .5s cubic-bezier(.4,0,.2,1),opacity .4s;overflow:hidden}
      .sp2-board .wood-grain{position:absolute;inset:0;border-radius:10px;opacity:.18;background:repeating-linear-gradient(92deg,transparent 0,transparent 3px,rgba(0,0,0,.04) 3px,rgba(0,0,0,.04) 5px)}
      .sp2-board .wood-bevel{position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 2px 0 rgba(255,255,255,.18),inset 0 -2px 0 rgba(0,0,0,.3),inset 2px 0 rgba(255,255,255,.08),inset -2px 0 rgba(0,0,0,.15)}
      .sp2-board.shake{animation:spShake .3s ease}
      .sp2-board.fall{transform:translateY(130%) rotate(8deg)!important;opacity:0!important}
      .sp2-screw{position:absolute;border-radius:50%;cursor:pointer;z-index:50;transition:transform .2s,opacity .2s,filter .15s;user-select:none;-webkit-tap-highlight-color:transparent}
      .sp2-screw .scr-body{width:100%;height:100%;border-radius:50%;position:relative;box-shadow:0 3px 8px rgba(0,0,0,.5),inset 0 -2px 4px rgba(0,0,0,.25);overflow:hidden}
      .sp2-screw .scr-shine{position:absolute;width:38%;height:38%;top:8%;left:12%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),transparent 70%)}
      .sp2-screw .scr-cross::before,.sp2-screw .scr-cross::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);background:rgba(0,0,0,.35);border-radius:1px}
      .sp2-screw .scr-cross::before{width:55%;height:11%}
      .sp2-screw .scr-cross::after{width:11%;height:55%}
      .sp2-screw .scr-rim{position:absolute;inset:3px;border-radius:50%;border:1.5px solid rgba(255,255,255,.15)}
      .sp2-screw.covered{filter:brightness(.3) saturate(.3);pointer-events:none}
      .sp2-screw.removing{animation:spUnscrew .5s cubic-bezier(.4,0,.2,1) forwards}
      .sp2-screw:not(.covered):not(.removing):active{transform:scale(.88)}
      .sp2-slots{display:flex;gap:8px;justify-content:center;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);box-shadow:0 -2px 16px rgba(0,0,0,.1)}
      .sp2-slot{width:50px;height:50px;border-radius:12px;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.08);display:grid;place-items:center;transition:.3s}
      .sp2-slot.filled{border-style:solid;border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
      .sp2-slot .mini{width:34px;height:34px;border-radius:50%;position:relative;animation:spPop .4s cubic-bezier(.34,1.56,.64,1);box-shadow:0 2px 6px rgba(0,0,0,.4),inset 0 -2px 3px rgba(0,0,0,.2);overflow:hidden}
      .sp2-slot .mini .scr-shine{position:absolute;width:30%;height:30%;top:10%;left:12%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.45),transparent 70%)}
      .sp2-slot .mini .scr-cross{position:absolute;inset:0}
      .sp2-slot .mini .scr-cross::before,.sp2-slot .mini .scr-cross::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);background:rgba(0,0,0,.3);border-radius:1px}
      .sp2-slot .mini .scr-cross::before{width:50%;height:10%}
      .sp2-slot .mini .scr-cross::after{width:10%;height:50%}
      .sp2-slot.clearing{animation:spClear .55s ease forwards}
      .sp2-overlay{position:absolute;inset:0;z-index:300;display:grid;place-items:center;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);animation:spFadeIn .25s ease}
      .sp2-overlay h2{font-size:28px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(168,85,247,.5);text-align:center;line-height:1.6;animation:spPop .5s cubic-bezier(.34,1.56,.64,1)}
      @keyframes spUnscrew{0%{transform:scale(1) rotate(0)}20%{transform:scale(.85)}100%{transform:scale(0) rotate(540deg);opacity:0}}
      @keyframes spPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}80%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
      @keyframes spClear{0%{transform:scale(1);filter:brightness(1)}30%{transform:scale(1.25);filter:brightness(2.5) drop-shadow(0 0 10px #fbbf24)}100%{transform:scale(0);opacity:0;filter:brightness(3)}}
      @keyframes spShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px) rotate(-.5deg)}50%{transform:translateX(4px) rotate(.5deg)}80%{transform:translateX(-2px)}}
      @keyframes spPart{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0}}
      @keyframes spFloat{0%{transform:translateY(0) scale(1);opacity:1}60%{opacity:1}100%{transform:translateY(-55px) scale(1.3);opacity:0}}
      @keyframes spBump{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
      @keyframes spFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spGlow{0%{box-shadow:0 0 0 rgba(168,85,247,0)}50%{box-shadow:0 0 20px rgba(168,85,247,.4)}100%{box-shadow:0 0 0 rgba(168,85,247,0)}}
      .sp2-slots.glow{animation:spGlow .5s ease}
    `);
  }

  // ───────── COVERED CHECK ─────────
  function isCovered(sc) {
    for (let i = sc.bi + 1; i < boards.length; i++) {
      if (boards[i].removed) continue;
      const b = boards[i];
      if (sc.px > b.x && sc.px < b.x + b.w && sc.py > b.y && sc.py < b.y + b.h) return true;
    }
    return false;
  }

  // ───────── LOAD LEVEL ─────────
  function loadLevel(lv) {
    const data = LEVELS[lv]; if (!data) return;
    score = 0; slots = []; undoStack = []; undoUsed = false; animating = false;
    boards = data.boards.map((b,i) => ({...b, idx:i, removed:false, sids:[]}));
    screws = [];
    let sid = 0;
    boards.forEach((b,bi) => {
      b.screws.forEach(s => {
        screws.push({id:sid++, bi, color:s.c, px:b.x+s.rx*b.w, py:b.y+s.ry*b.h, removed:false});
        boards[bi].sids.push(sid-1);
      });
    });
    render();
  }

  // ───────── RENDER ─────────
  function render() {
    wrapEl.innerHTML = '';

    // Score bar
    const bar = document.createElement('div'); bar.className = 'sp2-bar';
    bar.innerHTML = `
      <div class="sb-left"><span class="sb-lbl">SEVİYE ${level+1}</span></div>
      <span class="sb-val" id="sp-score">⭐ ${score}</span>
      <span class="sb-hi">🏆 ${LEVELS.length} Level</span>`;
    const ub = document.createElement('button');
    ub.className = 'sp2-undo' + (undoUsed||!undoStack.length?' off':'');
    ub.textContent = '↩ Geri Al';
    if(!undoUsed&&undoStack.length) addEv(ub,'click',doUndo);
    bar.appendChild(ub);
    wrapEl.appendChild(bar);

    // Game area
    areaEl = document.createElement('div'); areaEl.className = 'sp2-area';
    wrapEl.appendChild(areaEl);

    // Boards
    boards.forEach((b,i) => {
      const el = document.createElement('div'); el.className = 'sp2-board'+(b.removed?' fall':'');
      const w = WOOD[i%WOOD.length];
      el.style.cssText = `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;background:linear-gradient(145deg,${w.l},${w.f},${w.d});z-index:${5+i};border:1px solid ${w.d}`;
      el.innerHTML = '<div class="wood-grain"></div><div class="wood-bevel"></div>';
      el.dataset.bi = i;
      areaEl.appendChild(el);
    });

    // Screws
    screws.forEach(s => {
      if(s.removed) return;
      const cov = isCovered(s);
      const el = document.createElement('div');
      el.className = 'sp2-screw'+(cov?' covered':'');
      const sz = SCR_SZ;
      el.style.cssText = `left:calc(${s.px}% - ${sz/2}px);top:calc(${s.py}% - ${sz/2}px);width:${sz}px;height:${sz}px;z-index:${50+s.bi}`;
      const c = PAL[s.color];
      el.innerHTML = `<div class="scr-body" style="background:radial-gradient(circle at 32% 32%,${c.l},${c.f},${c.f}cc)"><div class="scr-shine"></div><div class="scr-cross"></div><div class="scr-rim"></div></div>`;
      el.dataset.sid = s.id;
      if(!cov) addEv(el,'click',()=>tapScrew(s.id));
      areaEl.appendChild(el);
    });

    // Slots
    slotsEl = document.createElement('div'); slotsEl.className = 'sp2-slots';
    for(let i=0;i<MAX_SLOTS;i++) {
      const d = document.createElement('div');
      d.className = 'sp2-slot'+(slots[i]!==undefined?' filled':'');
      if(slots[i]!==undefined) {
        const c = PAL[slots[i]];
        const m = document.createElement('div'); m.className = 'mini';
        m.style.background = `radial-gradient(circle at 32% 32%,${c.l},${c.f})`;
        m.innerHTML = '<div class="scr-shine"></div><div class="scr-cross"></div>';
        d.appendChild(m);
      }
      slotsEl.appendChild(d);
    }
    wrapEl.appendChild(slotsEl);
  }

  // ───────── TAP SCREW ─────────
  function tapScrew(sid) {
    if(animating) return;
    const s = screws.find(x=>x.id===sid);
    if(!s||s.removed||isCovered(s)) return;
    if(slots.length>=MAX_SLOTS) return;
    animating = true;
    haptic(15);
    snd('unscrew');

    undoStack.push({sid:s.id, bi:s.bi, col:s.color, ss:[...slots]});
    s.removed = true;
    score += 10; updateGameScore(score);
    bumpScore();

    const el = areaEl.querySelector(`[data-sid="${sid}"]`);
    if(el) el.classList.add('removing');

    slots.push(s.color);

    // Board clear check
    const bd = boards[s.bi];
    if(bd.sids.every(id=>screws.find(x=>x.id===id).removed) && !bd.removed) {
      bd.removed = true;
      score += 100; updateGameScore(score);
      snd('board');
      haptic(30);
      const be = areaEl.querySelector(`[data-bi="${s.bi}"]`);
      if(be) {
        be.classList.add('shake');
        setTimeout(()=>be.classList.add('fall'),300);
      }
      const bRect = areaEl.getBoundingClientRect();
      const cx = bRect.width*(bd.x+bd.w/2)/100;
      const cy = bRect.height*(bd.y+bd.h/2)/100;
      floatText('+100',cx-20,cy-10,'#fbbf24',true);
      particles(cx,cy,WOOD[bd.idx%WOOD.length].l,10);
      screenShake(3,250);
    }

    setTimeout(()=>chk3(()=>{animating=false;render();checkEnd();}),550);
  }

  function bumpScore() {
    const el = document.getElementById('sp-score');
    if(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
  }

  // ───────── 3 MATCH CHECK ─────────
  function chk3(cb) {
    const cc = {};
    slots.forEach(c => {cc[c]=(cc[c]||0)+1;});
    let mc = -1;
    for(const c in cc) {if(cc[c]>=3){mc=parseInt(c);break;}}
    if(mc >= 0) {
      score += 50; updateGameScore(score);
      snd('match');
      haptic(25);

      const bRect = areaEl.getBoundingClientRect();
      const cx = bRect.width/2, cy = bRect.height*.85;
      floatText('+50 ✨',cx-15,cy-30,'#fbbf24');
      particles(cx,cy,PAL[mc].l,14);
      screenShake(2,200);

      slotsEl.classList.remove('glow');
      void slotsEl.offsetWidth;
      slotsEl.classList.add('glow');

      let rm=0; const ns=[];
      for(let i=0;i<slots.length;i++){
        if(slots[i]===mc&&rm<3) rm++; else ns.push(slots[i]);
      }
      setTimeout(()=>{slots=ns;chk3(cb);},550);
    } else {if(cb)cb();}
  }

  // ───────── UNDO ─────────
  function doUndo() {
    if(undoUsed||!undoStack.length||animating) return;
    undoUsed = true; haptic(10);
    const u = undoStack.pop();
    const s = screws.find(x=>x.id===u.sid);
    if(s) {
      s.removed = false;
      const bd = boards[s.bi];
      if(bd.removed && !bd.sids.every(id=>screws.find(x=>x.id===id).removed)) bd.removed=false;
    }
    slots = u.ss; score = Math.max(0,score-10); updateGameScore(score);
    render();
  }

  // ───────── WIN/LOSE CHECK ─────────
  function checkEnd() {
    if(screws.every(s=>s.removed)) {
      const empty = MAX_SLOTS - slots.length;
      const bonus = 200 + empty*30;
      score += bonus; updateGameScore(score);
      snd('win'); haptic([50,30,50]);
      const nxt = level + 1;
      if(nxt < LEVELS.length) localStorage.setItem('ph_screw_level',nxt.toString());
      setTimeout(()=>{
        if(nxt>=LEVELS.length) {
          showGameOver(true,'Tebrikler! 🏆','Tüm seviyeleri tamamladın!\nSkor: '+score);
        } else {
          const ov = document.createElement('div'); ov.className='sp2-overlay';
          ov.innerHTML=`<h2>✅ Seviye ${level+1} Tamam!<br><span style="font-size:18px;color:#fbbf24">+${bonus} bonus</span></h2>`;
          areaEl.appendChild(ov);
          screenShake(4,300);
          setTimeout(()=>{ov.remove();level=nxt;loadLevel(level);},1800);
        }
      },400);
      return;
    }
    if(slots.length>=MAX_SLOTS) {
      const cc={}; slots.forEach(c=>{cc[c]=(cc[c]||0)+1;});
      if(!Object.values(cc).some(v=>v>=3)) {
        snd('lose'); haptic(100);
        setTimeout(()=>showGameOver(false,'Oyun Bitti! 😔','Slotlar doldu!\nSkor: '+score),300);
      }
    }
  }

  // ───────── INIT ─────────
  function init(c) {
    container = c;
    level = parseInt(localStorage.getItem('ph_screw_level')||'0',10);
    if(level>=LEVELS.length) level=0;
    injectCSS();
    wrapEl = document.createElement('div'); wrapEl.className='sp2-wrap';
    container.appendChild(wrapEl);
    loadLevel(level);
  }

  function cleanup() { clearEvs(); animating=false; }
  return {init,cleanup};
})();


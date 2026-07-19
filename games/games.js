/* ============================================
   GameHup — Puzzle Oyunları
   6 tam oynanabilir puzzle oyunu
   ============================================ */

const PuzzleGames = {};

// ═══════════════════════════════════════════════════════════════
//  GAMEHUP AUDIO ENGINE v2.0 — Premium Ses & Geri Bildirim
//  Lo-fi Ambient Synth + 30+ SFX + Adaptif Müzik + Haptic
// ═══════════════════════════════════════════════════════════════
const GameAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let reverbNode = null;
  let reverbGain = null;
  let noiseBuffer = null;

  // Müzik katmanları
  // Katman adları (beat/arp) setIntensity sözleşmesiyle uyumlu kalsın diye
  // korundu; içerikleri "büyülü gece" kurgusuna göre değişti —
  // beat → nefes, arp → cam çanlar. Melodi katmanı kaldırıldı.
  let musicLayers = { pad:null, beat:null, arp:null };
  let musicPlaying = false;
  let musicIntensity = 0; // 0=sadece pad, 1=+nefes, 2=+çanlar
  let _currentChord = null;   // pad'in o anki akoru — çanlar buna uyum sağlar

  // Ayarlar
  let muted = JSON.parse(localStorage.getItem('gh_muted') || 'false');
  let musicMuted = JSON.parse(localStorage.getItem('gh_music_muted') || 'false');

  // ───── CORE: AudioContext ─────
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Master chain: sfx/music → master → destination
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      masterGain.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.7, ctx.currentTime);
      sfxGain.connect(masterGain);

      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0, ctx.currentTime);
      musicGain.connect(masterGain);

      // Reverb send
      reverbGain = ctx.createGain();
      reverbGain.gain.setValueAtTime(0.15, ctx.currentTime);
      _createReverb();
      reverbGain.connect(masterGain);

      // Noise buffer (1s white noise)
      _createNoiseBuffer();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ───── REVERB: Sentetik impulse response ─────
  function _createReverb() {
    const c = getCtx();
    const len = c.sampleRate * 1.5; // 1.5s reverb
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    reverbNode = c.createConvolver();
    reverbNode.buffer = buf;
    reverbNode.connect(reverbGain);
  }

  // ───── NOISE: White noise buffer ─────
  function _createNoiseBuffer() {
    const c = getCtx();
    const len = c.sampleRate * 2;
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // ───── HELPERS ─────
  function _osc(type, freq, dur, vol, start, dest) {
    const c = getCtx(), t = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.connect(g);
    g.connect(dest || sfxGain);
    if (typeof freq === 'number') {
      o.frequency.setValueAtTime(freq, t);
    } else {
      o.frequency.setValueAtTime(freq[0], t);
      if (freq.length === 2) o.frequency.exponentialRampToValueAtTime(Math.max(freq[1], 20), t + dur);
      if (freq.length === 3) {
        o.frequency.linearRampToValueAtTime(freq[1], t + dur * 0.5);
        o.frequency.linearRampToValueAtTime(freq[2], t + dur);
      }
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.01);
    return { osc: o, gain: g };
  }

  function _noise(dur, vol, start, filterFreq, filterQ) {
    const c = getCtx(), t = c.currentTime + start;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (filterFreq) {
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(filterFreq, t);
      f.Q.setValueAtTime(filterQ || 1, t);
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  function _chime(notes, dur, vol, gap, dest) {
    notes.forEach((f, i) => _osc('sine', f, dur, vol * (1 - i * 0.02), i * gap, dest));
  }

  function _withReverb(fn) {
    fn(reverbNode);
  }

  // ═══════════════════════════════════════════
  //  SES EFEKTLERİ — 30+ Premium SFX
  // ═══════════════════════════════════════════
  const SFX = {
    // ─── UI Sesleri ───
    tab: () => {
      _osc('sine', [420, 630], 0.06, 0.08, 0);
      _noise(0.03, 0.02, 0, 4000, 2);
    },
    button: () => {
      _osc('sine', 520, 0.025, 0.06, 0);
      _osc('triangle', 780, 0.02, 0.03, 0.005);
    },
    favorite: () => {
      _osc('sine', 880, 0.12, 0.1, 0);
      _osc('sine', 1108, 0.12, 0.08, 0.04);
      _osc('sine', 1318, 0.15, 0.07, 0.08);
      _osc('triangle', [660, 1760], 0.2, 0.04, 0.02);
    },
    unfavorite: () => {
      _osc('sine', [660, 380], 0.12, 0.06, 0);
      _osc('triangle', [440, 280], 0.1, 0.04, 0.02);
    },
    toast: () => {
      _osc('sine', 880, 0.18, 0.07, 0);
      _osc('triangle', 1320, 0.12, 0.04, 0.03);
    },
    transition: () => {
      _noise(0.15, 0.04, 0, 2000, 0.5);
      _osc('sine', [300, 600], 0.12, 0.03, 0);
    },
    settings: () => {
      _osc('sine', [380, 420], 0.08, 0.05, 0);
      _osc('triangle', 560, 0.06, 0.03, 0.02);
    },

    // ─── Oyun İçi Temel ───
    tap: () => {
      _osc('sine', [380, 520], 0.05, 0.08, 0);
      _osc('triangle', 760, 0.03, 0.03, 0.01);
    },
    place: () => {
      _osc('sine', [280, 100], 0.1, 0.12, 0);
      _noise(0.04, 0.06, 0, 800, 3);
      _osc('triangle', 180, 0.06, 0.05, 0.02);
    },
    merge: () => {
      _osc('sine', [400, 680], 0.12, 0.13, 0);
      _osc('triangle', [320, 560], 0.1, 0.07, 0.015);
      _osc('sine', 880, 0.08, 0.04, 0.06);
    },
    match: () => {
      [523, 659, 784].forEach((f, i) => {
        _osc('sine', f, 0.22, 0.12, i * 0.04);
        _osc('triangle', f * 2, 0.15, 0.03, i * 0.04 + 0.01);
      });
    },
    clear: () => {
      [523, 659, 784, 1047].forEach((f, i) => {
        _osc('sine', f, 0.28, 0.1, i * 0.04);
        _osc('triangle', f * 1.5, 0.2, 0.03, i * 0.04);
      });
      _noise(0.15, 0.04, 0.08, 3000, 1);
    },
    flip: () => {
      _osc('sine', [220, 440], 0.06, 0.07, 0);
      _osc('triangle', [330, 550], 0.05, 0.04, 0.01);
      _noise(0.03, 0.02, 0, 5000, 3);
    },
    error: () => {
      _osc('sawtooth', [280, 160], 0.14, 0.07, 0);
      _osc('sine', [220, 140], 0.12, 0.05, 0.02);
    },
    step: () => {
      _osc('sine', 300, 0.03, 0.04, 0);
      _osc('triangle', 450, 0.02, 0.02, 0.005);
    },
    unscrew: () => {
      _osc('sine', [620, 220], 0.12, 0.12, 0);
      _osc('triangle', [480, 180], 0.1, 0.07, 0.015);
      _osc('square', [800, 200], 0.06, 0.02, 0.03);
    },
    board: () => {
      _osc('sine', [200, 80], 0.25, 0.1, 0);
      _osc('triangle', 110, 0.15, 0.06, 0.05);
      _noise(0.1, 0.03, 0, 400, 2);
    },
    slide: () => {
      _osc('sine', [350, 500, 350], 0.18, 0.06, 0);
      _osc('triangle', [250, 400], 0.12, 0.03, 0.02);
    },
    pour: () => {
      _osc('sine', [500, 300, 420], 0.25, 0.08, 0);
      _osc('triangle', [400, 250, 380], 0.2, 0.04, 0.03);
      _noise(0.15, 0.02, 0.05, 1200, 0.8);
    },
    snap: () => {
      _osc('sine', [600, 800], 0.04, 0.1, 0);
      _noise(0.02, 0.05, 0, 6000, 5);
    },

    // ─── KRİSTAL AİLESİ (Block Puzzle) ───
    // Tasarım kuralı: iki ses birbirinden EN AZ İKİ eksende ayrılmalı —
    // perde yönü, süre, doku, register. Sadece perdesi farklı sesler aynı
    // sesin varyasyonu gibi duyulur ve karakter oluşmaz. Aile şöyle
    // dağılıyor:
    //   pickup   yukarı  / 90ms  / saf      / tiz
    //   hover    düz     / 28ms  / saf+kısık/ çok tiz
    //   place    aşağı   / 130ms / tok+tık  / pes + tiz
    //   touch    düz     / 55ms  / camsı    / tiz
    //   shatter  aşağı   / 320ms / gürültü  / geniş
    //   combo    yukarı  / 220ms / çan      / orta-tiz
    //   burst    aşağı+  / 360ms / sub+bant / tam spektrum

    // Kristali soketten KALDIRMA — vurulmuş bir kristal, yükselen blip değil.
    // İlk hâli 740→1180 yükselen bir süpürmeydi ve "menü seçim sesi" gibi
    // duyuluyordu. İki değişiklik: (1) süpürme kaldırıldı, yerine sabit
    // perdeli vuruş geldi; (2) kısmi tonlar İNHARMONİK — camı sentetik
    // sinüsten ayıran şey budur, tam katlar org gibi tınlar.
    // Küçük bir gövde eklendi: salt tiz ton havada kalıyor, tok olmuyor.
    crystalPickup: () => {
      _noise(0.02, 0.05, 0, 6800, 4);                  // soketten ayrılma
      const f = 1046;
      _osc('sine', f,        0.16, 0.085, 0.003);
      _osc('sine', f * 2.32, 0.12, 0.038, 0.005);      // inharmonik
      _osc('sine', f * 4.25, 0.08, 0.018, 0.007);
      _osc('triangle', [340, 150], 0.05, 0.05, 0);     // gövde (tokluk)
    },
    // Geçerli hücrenin ÜSTÜNDEN geçme. Ailenin en kısık sesi olmak
    // zorunda: sürükleme boyunca defalarca çalıyor, normal seviyede
    // olsaydı birkaç saniyede yorucu hâle gelirdi.
    crystalHover: () => {
      // 0.020 ölçüldü: tepe 0.0104, yani patlamadan 16 kat kısık — telefon
      // hoparlöründe duyulmama riski vardı. Duyulmayan geri bildirim yok
      // demektir. Yine de ailenin en kısığı kalıyor (sık çalıyor).
      _osc('triangle', 2100, 0.03, 0.034, 0);
    },
    // OTURMA — iki ayrı kimlik üst üste: pes "tok" ağırlığı, tiz "tık"
    // malzemeyi anlatır. (Su Sıralama'da camla sıvıyı ayırmanın karşılığı.)
    // ONAYLANDI — dokunma. Ailenin geri kalanı için de referans: ağırlığı
    // olan ama tiz bileşeni net bir vuruş.
    crystalPlace: () => {
      _osc('sine', [190, 68], 0.13, 0.16, 0);          // ağırlık
      _osc('triangle', [1500, 1150], 0.05, 0.048, 0.004); // kristal malzeme
      _noise(0.045, 0.048, 0, 1100, 2.2);              // taşa temas
      _osc('sine', 2400, 0.03, 0.018, 0.01);           // ince tepe parıltısı
    },
    // Kristal kristale DEĞDİ. Hafif detune edilmiş iki sinüs vuruşma
    // (beating) üretir — camın camla tokuşmasının karakteri budur.
    // Perde temas sayısıyla yükselir: sıkı yerleştirme kulakta da ödül.
    crystalTouch: (o) => {
      const n = Math.min((o && o.count) || 1, 4);
      const f = 1900 + n * 130;
      _osc('sine', f, 0.055, 0.032, 0);
      _osc('sine', f * 1.008, 0.055, 0.028, 0);
      _noise(0.02, 0.016, 0, 7000, 5);
    },
    // KIRILMA — satır temizleme. Tizden aşağı süpüren gürültü (kırılan
    // cam) + düşüp yükselen ton (enerjinin boşalıp dağılması) + reverb'e
    // giden çınlama kuyruğu.
    crystalShatter: (o) => {
      const lines = Math.min((o && o.lines) || 1, 4);
      // Gürültü KISA ve DAR. Eski hâl 220-300ms boyunca Q=0.8-1.2 ile
      // çalıyordu; geniş bantlı uzun gürültü kulakta "vıcık" bir uğultu
      // yapıyor. Tokluk, uzun uğultudan değil sert ataktan gelir.
      _noise(0.05, 0.13, 0, 5200, 2.8);
      _noise(0.06, 0.07, 0.01, 2000, 2.4);
      // Gövde — place'in beğenilen tokluğuyla aynı mantık: hızlı düşen alt uç
      _osc('sine', [300, 85], 0.13, 0.15, 0);
      // Cam parçaları: inharmonik ve kademeli. Patlamanın "kırılma" olarak
      // okunmasını sağlayan doku bu, gürültü değil.
      const base = 988;
      [1, 2.32, 3.11, 4.25].forEach((r, i) =>
        _osc('sine', base * r, 0.08 + i*0.03, 0.042, 0.01 + i*0.016));
      _withReverb(d => _chime([1319, 1760, 2093], 0.45, 0.035 + lines*0.006, 0.045, d));
    },
    // COMBO — pentatonik merdiven. Her basamak bir derece yukarı: tırmanış
    // KULAKTAN takip edilebilir olmalı, yoksa combo'nun büyüdüğü sadece
    // ekranda kalır.
    crystalCombo: (o) => {
      const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
      const lv = Math.max(2, Math.min((o && o.level) || 2, scale.length));
      const root = scale[lv - 1];
      _osc('sine', root, 0.20, 0.11, 0);
      _osc('sine', root * 1.5, 0.22, 0.065, 0.05);
      _osc('triangle', root * 2, 0.16, 0.035, 0.09);
      _withReverb(d => _chime([root*2, root*3], 0.4, 0.045, 0.05, d));
    },
    // BÜYÜK PATLAMA — çoklu satır / yüksek combo. Ailenin tek SUB'lu sesi:
    // göğüste hissedilen alt uç, geniş bant gövde, tepede parıldayan kuyruk.
    // Kırılmayla birlikte çalar (biri alt ucu, diğeri üst ucu doldurur).
    crystalBurst: (o) => {
      const p = Math.min((o && o.power) || 1, 3);
      // Sub süpürmeleri (110→38Hz, 70→30Hz) kaldırıldı: telefon hoparlörü
      // o bölgeyi üretmiyor, geriye yalnızca 340ms'lik Q=0.6 gürültü
      // uğultusu kalıyordu — "vıcık"ın kaynağı buydu.
      // Yerine: çok kısa dar bantlı çatlak + hızlı düşen tok gövde.
      _noise(0.045, 0.16, 0, 4200, 3.0);
      _noise(0.07, 0.09, 0.008, 1600, 2.6);
      _osc('sine', [260, 70], 0.16, 0.20 + p*0.012, 0);
      _osc('triangle', [180, 60], 0.13, 0.11, 0.004);
      const base = 1174;
      [1, 2.32, 3.11, 4.25].forEach((r, i) =>
        _osc('sine', base * r, 0.09 + i*0.03, 0.045, 0.012 + i*0.018));
      // Kuyruk ince tutuluyor ki gövdeyi bulandırmasın.
      _withReverb(d => _chime([1568, 2093, 2637], 0.5, 0.035, 0.05, d));
    },
    // OYUN BİTTİ — kristalin sönmesi. Aşağı, uzun, rezonanslı.
    crystalOver: () => {
      _osc('sine', [420, 150], 0.5, 0.11, 0);
      _osc('triangle', [630, 200], 0.42, 0.055, 0.05);
      _noise(0.3, 0.035, 0.05, 700, 0.8);
      _withReverb(d => _chime([330, 262], 0.7, 0.045, 0.12, d));
    },

    // ─── Reels Sesleri ───
    swipe: () => {
      _noise(0.12, 0.03, 0, 2500, 0.8);
      _osc('sine', [250, 500], 0.08, 0.02, 0);
    },
    cardFlip: () => {
      _noise(0.06, 0.04, 0, 3000, 2);
      _osc('triangle', [400, 600], 0.05, 0.03, 0.01);
    },

    // ─── Ödül & Başarı ───
    combo2: () => {
      _osc('sine', 659, 0.15, 0.1, 0);
      _osc('sine', 784, 0.15, 0.1, 0.06);
    },
    combo3: () => {
      [659, 784, 988].forEach((f, i) => _osc('sine', f, 0.18, 0.1, i * 0.05));
      _osc('triangle', [800, 1600], 0.15, 0.03, 0.08);
    },
    combo5: () => {
      [523, 659, 784, 988, 1175].forEach((f, i) => {
        _osc('sine', f, 0.22, 0.09, i * 0.04);
        _osc('triangle', f * 1.5, 0.15, 0.02, i * 0.04 + 0.01);
      });
      _noise(0.2, 0.03, 0.1, 4000, 1.5);
    },
    combo8: () => {
      [523, 587, 659, 784, 880, 988, 1175, 1319].forEach((f, i) => {
        _osc('sine', f, 0.3, 0.08, i * 0.035);
        _osc('triangle', f * 2, 0.2, 0.025, i * 0.035);
      });
      _noise(0.3, 0.04, 0.05, 5000, 1);
      _osc('sine', [1319, 2637], 0.4, 0.04, 0.2);
    },
    combo: () => { SFX.combo3(); }, // alias
    win: () => {
      // Epic victory fanfare
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => {
        _osc('sine', f, 0.4, 0.11, i * 0.07);
        _osc('triangle', f * 2, 0.3, 0.04, i * 0.07 + 0.02);
      });
      // Shimmer tail
      _osc('sine', [1319, 2637], 0.6, 0.04, 0.3);
      _osc('triangle', [2637, 1319], 0.5, 0.03, 0.35);
      _noise(0.4, 0.03, 0.2, 6000, 1.5);
    },
    lose: () => {
      _osc('sawtooth', [350, 60], 0.5, 0.08, 0);
      _osc('sine', [280, 70], 0.4, 0.06, 0.08);
      _osc('triangle', [200, 50], 0.35, 0.04, 0.12);
    },
    star: () => {
      _osc('sine', 1047, 0.2, 0.1, 0);
      _osc('triangle', 1568, 0.15, 0.06, 0.05);
      _osc('sine', [1568, 2093], 0.25, 0.04, 0.1);
    },
    scoreTick: () => {
      _osc('sine', 1200, 0.02, 0.04, 0);
    },
    record: () => {
      // Epic record-breaking fanfare
      const notes = [523, 659, 784, 988, 1175, 1319, 1568];
      notes.forEach((f, i) => {
        _osc('sine', f, 0.35, 0.09, i * 0.05);
        _osc('triangle', f * 1.5, 0.25, 0.03, i * 0.05);
      });
      _noise(0.5, 0.04, 0.15, 5000, 1.2);
      _osc('sine', [1568, 3136], 0.6, 0.04, 0.3);
    },
    mission: () => {
      [784, 988, 1175, 1319].forEach((f, i) => _osc('sine', f, 0.25, 0.09, i * 0.06));
      _osc('triangle', [988, 1976], 0.3, 0.04, 0.15);
    },
    diamond: () => {
      // Crystal bling
      [1568, 1976, 2349, 2637].forEach((f, i) => {
        _osc('sine', f, 0.2, 0.07, i * 0.04);
        _osc('triangle', f * 0.5, 0.15, 0.03, i * 0.04);
      });
      _noise(0.15, 0.02, 0.08, 8000, 3);
    },
    premium: () => {
      // Luxury unlock cascade
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
        _osc('sine', f, 0.3, 0.08, i * 0.06);
        _osc('triangle', f * 2, 0.2, 0.03, i * 0.06 + 0.02);
      });
      _osc('sine', [1568, 3136], 0.8, 0.04, 0.3);
      _noise(0.5, 0.03, 0.2, 6000, 1.5);
    },
    bloom: () => {
      // App open sound — soft magical bloom
      _osc('sine', [220, 330], 0.4, 0.05, 0);
      _osc('triangle', [330, 440], 0.35, 0.03, 0.1);
      _osc('sine', [440, 523], 0.3, 0.04, 0.2);
      _osc('sine', 659, 0.4, 0.03, 0.3);
    },
  };

  // ═══════════════════════════════════════════
  //  PLAY — Ses efekti çal
  // ═══════════════════════════════════════════
  // opts, sesin kendini duruma göre ayarlaması için (combo seviyesi, temas
  // sayısı, patlama gücü). Geriye dönük uyumlu: mevcut 30+ SFX argümansız
  // tanımlı ve fazladan parametreyi yok sayar.
  function play(type, opts) {
    if (muted) return;
    try {
      getCtx();
      if (SFX[type]) SFX[type](opts || {});
    } catch (e) {}
  }

  // ═══════════════════════════════════════════
  //  HAPTIC — Pattern-based titreşim
  // ═══════════════════════════════════════════
  const HAPTIC_PATTERNS = {
    micro:     [5],
    tap:       [5],
    soft:      [8],
    match:     [5, 30, 12],
    combo3:    [5, 20, 5, 20, 8],
    combo5:    [3, 15, 3, 15, 3, 15, 5, 15, 10],
    win:       [10, 50, 15, 50, 20],
    error:     [3, 80, 3],
    swipe:     [3],
    favorite:  [5, 30, 8],
    star:      [8, 40, 5, 40, 12],
    record:    [10, 30, 10, 30, 10, 30, 20],
    diamond:   [5, 20, 5, 20, 12],
  };

  function haptic(patternOrMs) {
    if (muted) return;
    try {
      if (!navigator.vibrate) return;
      if (typeof patternOrMs === 'string') {
        navigator.vibrate(HAPTIC_PATTERNS[patternOrMs] || [5]);
      } else if (Array.isArray(patternOrMs)) {
        navigator.vibrate(patternOrMs);
      } else {
        navigator.vibrate(patternOrMs || 5);
      }
    } catch(e) {}
  }

  // ═══════════════════════════════════════════
  //  MÜZİK SİSTEMİ — Adaptif Katmanlı "Büyülü Gece"
  // ═══════════════════════════════════════════
  // Önceki kompozisyon 82 BPM'lik bir lo-fi hip-hop beat'iydi: sürekli
  // kick+snare+hihat, üstünde 16'lık notalarla arpej. Bir bulmaca oyununda
  // bu "acele et" sinyalidir — oyuncular gerilim hissettiğini söyledi ve
  // haklıydılar. Sorun akorlarda DEĞİLDİ (Cmaj9→Am11→Fmaj9→Gsus4 sıcak ve
  // uyumlu, korunuyor); sorun davul kitiydi ve arpejin temposuydu.
  //
  // Yeni kurgu, platformun "stres değil akış" ilkesini sese çeviriyor:
  // tempo DUYULMAZ, HİSSEDİLİR. Katmanlar yavaştan hızlıya:
  //   pad    — sürekli, 9sn'de bir akor değişir
  //   breath — ~40/dk yavaş bir alt-frekans şişkinliği (vuruş DEĞİL, nefes)
  //   bells  — seyrek, uzun kuyruklu cam çanlar (yıldızların sesi)
  // Davul yok. Hiçbir katman oyuncuyu bir sonraki hamleye itmez.
  // Katman mimarisi ve setIntensity(0..3) aynen korundu.

  // Gece pad'i: Detuned sine akorları + LFO
  function _startPad() {
    const c = getCtx();
    const padGain = c.createGain();
    padGain.gain.setValueAtTime(0.3, c.currentTime);
    padGain.connect(musicGain);

    // Cmaj9 → Am11 → Fmaj9 → Gsus4 — daha zengin akorlar
    const chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66],  // Cmaj9
      [110.00, 130.81, 164.81, 196.00, 246.94],  // Am11
      [87.31, 110.00, 130.81, 164.81, 220.00],   // Fmaj9
      [98.00, 130.81, 146.83, 196.00, 261.63],   // Gsus4
    ];

    let chordIdx = 0;
    const oscs = [];

    for (let i = 0; i < 5; i++) {
      const o = c.createOscillator();
      const g = c.createGain();
      // Alternate sine/triangle for warmth
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(chords[0][i], c.currentTime);
      // Slight detune for lo-fi width
      o.detune.setValueAtTime((i - 2) * 6, c.currentTime);
      g.gain.setValueAtTime(i < 3 ? 0.2 : 0.1, c.currentTime);
      o.connect(g);
      g.connect(padGain);
      // Send to reverb too
      const revSend = c.createGain();
      revSend.gain.setValueAtTime(0.08, c.currentTime);
      o.connect(revSend);
      if (reverbNode) revSend.connect(reverbNode);
      o.start();
      oscs.push({ osc: o, gain: g });
    }

    // LFO for subtle volume movement
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, c.currentTime);
    lfoG.gain.setValueAtTime(0.015, c.currentTime);
    lfo.connect(lfoG);
    lfoG.connect(padGain.gain);
    lfo.start();

    // Akor değişimi 9sn'de bir (eskiden 5sn). Geçiş de 2sn yerine 4sn'ye
    // yayılıyor: akorun "değiştiğini" duymamalısın, bir yere varmış
    // olduğunu fark etmelisin. Hız hissinin yarısı buradan geliyordu.
    // Mevcut akor _startBells tarafından okunuyor (çanlar uyumlu kalsın).
    const chordTimer = setInterval(() => {
      if (!musicPlaying) return;
      chordIdx = (chordIdx + 1) % chords.length;
      _currentChord = chords[chordIdx];
      const t = c.currentTime;
      oscs.forEach((o, i) => {
        o.osc.frequency.linearRampToValueAtTime(chords[chordIdx][i], t + 4);
      });
    }, 9000);

    musicLayers.pad = { oscs: oscs.map(o => o.osc).concat([lfo]), gain: padGain, timer: chordTimer };
  }

  // Nefes: vuruş DEĞİL — ~40/dk yavaş bir alt-frekans şişkinliği. Davul
  // kitinin (kick+snare+hihat) yerine geçti. Fark kritik: bir vuruş ANİ
  // başlar ve zamanı böler; kulak ona uyar, sonra acele eder. Nefesin atağı
  // 1.1sn — başladığı AN duyulmaz, sadece odanın dolup boşaldığını
  // hissedersin. 140Hz altına filtreli, yani ritim değil zemin. Sahnedeki
  // sisin ve süzülen zerrelerin ses karşılığı.
  // Katman adı `beat` kalıyor: setIntensity(1) sözleşmesi korunsun.
  function _startBreath() {
    const c = getCtx();
    const breathGain = c.createGain();
    breathGain.gain.setValueAtTime(0, c.currentTime);
    breathGain.connect(musicGain);

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(140, c.currentTime);
    lp.connect(breathGain);

    const timer = setInterval(() => {
      if (!musicPlaying) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      // Sabit bir nota değil, hafifçe yükselip alçalan canlı bir soluk.
      o.frequency.setValueAtTime(58, t);
      o.frequency.linearRampToValueAtTime(70, t + 1.1);
      o.frequency.linearRampToValueAtTime(58, t + 2.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 1.1);          // uzun atak
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);  // uzun bırakış
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + 2.4);
    }, 1500);   // ~40/dk

    musicLayers.beat = { gain: breathGain, timer };
  }

  // Cam çanlar: yıldızların sesi. Eski arpejin yerine geçti — o, 82 BPM'de
  // 16'lık notalarla (~183ms arayla) çalan sürekli bir örüntüydü; sabit
  // aralık kulakta metronom kurar ve doğrudan aceleye çevrilir.
  // Buradaki notalar SEYREK ve DÜZENSİZ (2.2–5.4sn arası rastgele): bir
  // sonrakinin ne zaman geleceğini kestiremezsin, dolayısıyla ona
  // yetişmeye de çalışmazsın. Tempo değil, olay.
  // Ton: hızlı atak + çok uzun üstel sönüm + bir oktav üstte hafif bir
  // harmonik = cam/celesta. Reverb'e cömert gönderim, kuyruk sahnedeki
  // ışık huzmeleri gibi asılı kalsın.
  const BELL_PENTATONIC = [0, 2, 4, 7, 9];   // majör pentatonik — uyumsuz aralık yok
  function _startBells() {
    const c = getCtx();
    const bellGain = c.createGain();
    bellGain.gain.setValueAtTime(0, c.currentTime);
    bellGain.connect(musicGain);

    const bellRev = c.createGain();
    bellRev.gain.setValueAtTime(0.55, c.currentTime);   // eskiden 0.1 — kuyruk asıl karakter
    if (reverbNode) bellRev.connect(reverbNode);

    function ring() {
      if (!musicPlaying) return;
      const t = c.currentTime;
      // Notayı o anki akorun köküne bağla: pad ne çalıyorsa çan onunla uyumlu.
      const root = (_currentChord && _currentChord[0]) || 130.81;
      const semi = BELL_PENTATONIC[Math.floor(Math.random() * BELL_PENTATONIC.length)];
      const oct = 2 + Math.floor(Math.random() * 2);            // 2–3 oktav üstü: berrak
      const freq = root * Math.pow(2, oct + semi / 12);
      [[freq, 0.09, 2.6], [freq * 2, 0.025, 1.6]].forEach(([f, peak, decay]) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.012);        // hızlı atak = vuruş anı
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay); // uzun kuyruk = cam
        o.connect(g);
        g.connect(bellGain);
        g.connect(bellRev);
        o.start(t); o.stop(t + decay + 0.1);
      });
      schedule();
    }
    let timer = null;
    function schedule() { timer = setTimeout(ring, 2200 + Math.random() * 3200); }
    schedule();

    // stopMusic clearInterval çağırıyor; clearTimeout ile aynı id uzayını
    // paylaştıkları için bu timer da doğru şekilde iptal oluyor.
    musicLayers.arp = { gain: bellGain, get timer() { return timer; } };
  }

  // NOT: Eski "melody" katmanı (5sn'de bir tekrarlayan 4 sabit cümle)
  // kaldırıldı. Tanıdık, dönüp duran bir ezgi arka planda kalmaz — öne
  // çıkar ve dikkat ister; ayrıca sabit döngü tekrarı fark edilir hâle
  // gelince sıkıcılaşır. Onun rolünü artık _startBells üstleniyor:
  // aynı melodik malzeme, ama tahmin edilemez zamanlamayla.

  // ───── MÜZİK KONTROL ─────
  // GEÇİCİ: arka plan müziği tamamen devre dışı. Mevcut kompozisyon gerilim
  // hissi veriyor ve casual puzzle tonuna uymuyor — sessizlik daha iyi.
  // PuzzleHub için yeni bir müzik sistemi tasarlanınca bu guard kalkacak;
  // altındaki pad/beat motoru bilerek olduğu gibi duruyor.
  const MUSIC_DISABLED = true;
  function startMusic() {
    if (MUSIC_DISABLED) return;
    if (musicMuted || musicPlaying) return;
    try {
      const c = getCtx();
      musicGain.gain.setValueAtTime(0, c.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.035, c.currentTime + 2.5);

      _startPad();
      _startBreath();
      _startBells();

      musicPlaying = true;
      setIntensity(0); // Sadece pad ile başla
    } catch (e) {}
  }

  function stopMusic() {
    musicPlaying = false;
    Object.values(musicLayers).forEach(layer => {
      if (!layer) return;
      // Çanlar setTimeout zinciriyle çalışıyor; setTimeout ve setInterval
      // aynı id uzayını paylaştığı için ikisini de temizlemek gerekiyor.
      if (layer.timer) { clearInterval(layer.timer); clearTimeout(layer.timer); }
      if (layer.oscs) layer.oscs.forEach(o => { try { o.stop(); } catch(e) {} });
    });
    musicLayers = { pad:null, beat:null, arp:null };
  }

  // Adaptif yoğunluk: 0=sadece pad, 1=+nefes, 2=+çanlar.
  // Katman anahtarları (beat/arp) korundu; melodi katmanı kaldırıldığı için
  // eski 3. kademe de kalktı. Hedef seviyeler "büyülü gece" için düşürüldü:
  // hiçbir katman pad'i bastırmamalı, hepsi zemin dokusu.
  function setIntensity(level) {
    musicIntensity = Math.max(0, Math.min(2, level));
    const c = getCtx();
    const t = c.currentTime;
    const fade = 2.5; // crossfade süresi — yavaş, geçiş duyulmasın

    // Pad her zaman açık
    if (musicLayers.beat && musicLayers.beat.gain) {   // nefes
      const target = musicIntensity >= 1 ? 0.5 : 0;
      musicLayers.beat.gain.gain.linearRampToValueAtTime(target, t + fade);
    }
    if (musicLayers.arp && musicLayers.arp.gain) {     // çanlar
      const target = musicIntensity >= 2 ? 0.5 : 0;
      musicLayers.arp.gain.gain.linearRampToValueAtTime(target, t + fade);
    }
  }

  // ───── TOGGLES ─────
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

  // ───── PUBLIC API ─────
  return {
    play, haptic, startMusic, stopMusic, setIntensity,
    toggleMute, toggleMusic,
    get muted() { return muted; },
    get musicMuted() { return musicMuted; },
    get intensity() { return musicIntensity; },
  };
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
  // Hata bütçesi. Klasik sudokudan bilinçli bir ayrılış: yanlış hamle
  // engelleniyor AMA bedava değil — bedeli bir can. Engelleme ücretsiz
  // olsaydı bulmacanın gerilimi kaçardı (bkz. docs/GAMES/SUDOKU.md).
  const MAX_LIVES = 3;
  let board, initial, solution, selected, container, startTime, wrapEl;
  let tabletEl, mistakesEl, atmoEl, placeEl, lives, dead;

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

  // ═══════════ CSS — "Ancient Arcane" ═══════════
  // Sudoku'nun maddesi PARŞÖMEN: sıcak, opak, kâğıt lifli, ışığı yumuşak
  // dağıtan bir yüzey. Water Sort=sıvı, Block Puzzle=kristal, Sudoku=parşömen.
  //
  // AMA gökyüzü ORTAK. Tahta, platformun paylaşımlı gece göğünün (.ph-scene
  // + phAtmosphere) üstünde yüzen aydınlık bir levhadır — oyuncu hangi oyunu
  // açarsa açsın aynı evrende olduğunu gökten anlar, farklı bir oyunda
  // olduğunu tahtanın maddesinden. Sudoku'nun kendi MEKÂNI ise tapınak
  // kalıntıları + hilal: Water Sort'un ayı/dağları ile karışmasın diye
  // bilerek mimari (manzara değil).
  //
  // Okunabilirlik notu: önceki taş temada ipucu rakamları yüzeye karşı
  // 1.05:1 kontrasttaydı (WCAG AA büyük metin eşiği 3.0) — pratikte
  // görünmüyorlardı. Parşömen üzerindeki koyu mürekkep bunu ~10:1'e taşıyor;
  // tema değişiminin en somut kazancı bu.
  function injectCSS() {
    injectStyle('css-sudoku', `
      /* ── Ancient Arcane paleti — OYUN KAPSAMINDA (§20.4) ──
         design-tokens.css'e konmadı: tek oyuna ait açık bir tema platform
         token'larını kirletmemeli. "Tema Seç" özelliği geldiğinde buradan
         terfi ettirilir. --ph-heart-* ezmeleri paylaşımlı can göstergesini
         parşömen üstünde okunur kılıyor (varsayılanları koyu zemine göre). */
      #game-container.sdk-arcane{
        --sdk-paper-hi:#FBF5E7; --sdk-paper:#F3EAD4; --sdk-paper-lo:#E3D4B4;
        --sdk-gold:#B8974F;
        --sdk-gold-hair:rgba(146,116,58,.26);   /* hücreler arası saç teli */
        --sdk-gold-line:rgba(140,109,48,.58);   /* 3x3 blokları ayıran çizgi */
        --sdk-ink:#382F20;                      /* verilen ipuçları */
        --sdk-ink-user:#8A5A16;                 /* oyuncunun yazdıkları */
        --sdk-err:#B3402E;
        --ph-heart-on:#C0453A; --ph-heart-off:rgba(90,70,40,.3);
        --ph-heart-glow:rgba(192,69,58,.4);
      }

      /* ── Sudoku'nun MEKÂNI — ortak gökyüzünün üstüne ── */
      .sdk-place{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
      /* Hilal: Water Sort'un ayından bilerek farklı — daha küçük, sağ üstte,
         ve gökte tek başına değil (altında kalıntı siluetleri var). */
      /* Hilal MASK ile oyuluyor, üstüne koyu daire koyarak değil: gökyüzü
         bir gradyan olduğu için "gök rengi" tek bir değer değil — düz renkli
         bir kesme dairesi ayın yanında koyu bir leke olarak görünüyordu.
         Mask zemini gerçekten şeffaf bırakır, yıldızlar hilalin içinden geçer. */
      .sdk-moon{position:absolute;top:5%;right:11%;width:38px;height:38px;border-radius:50%;
        background:radial-gradient(circle at 36% 32%, #FFF8E2, #F1E1B0 56%, #D8C085 100%);
        -webkit-mask-image:radial-gradient(circle at 132% 2%, transparent 52%, #000 53%);
        mask-image:radial-gradient(circle at 132% 2%, transparent 52%, #000 53%)}
      /* Parıltı ayrı katmanda: mask ışımayı da keserdi. */
      .sdk-moon-glow{position:absolute;top:5%;right:11%;width:38px;height:38px;border-radius:50%;
        box-shadow:0 0 40px 12px rgba(246,228,172,.2)}
      /* Kalıntılar: EKRANIN KENARLARINDA. Ortası bilerek boş — tahta ve sayı
         tuşları oraya oturuyor, arkalarında siluet olursa okunurluk düşer. */
      .sdk-ruins{position:absolute;left:0;right:0;bottom:0;height:132px;opacity:.5}
      .sdk-col{position:absolute;bottom:0;width:13px;border-radius:2px 2px 0 0;
        background:linear-gradient(180deg, rgba(44,37,84,.92), rgba(16,14,40,.98));
        box-shadow:inset 1px 0 0 rgba(190,175,255,.09)}
      .sdk-col::before{content:'';position:absolute;top:-5px;left:-4px;right:-4px;height:6px;
        border-radius:2px;background:linear-gradient(180deg, rgba(52,43,98,.95), rgba(28,23,60,.98))}

      .sdk-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:var(--ph-space-4);width:100%;max-width:430px;min-height:100%;
        margin:0 auto;padding:var(--ph-space-4) var(--ph-space-2)}
      .sdk-wrap *{box-sizing:border-box}

      /* ── KARTUŞ — can/hata göstergesi ──
         Tahtayla aynı parşömenden: HUD'un uygulama kabuğuna değil OYUNA ait
         olduğunu bu söylüyor. */
      .sdk-cartouche{display:flex;align-items:center;gap:var(--ph-space-3);
        padding:7px 15px;border-radius:var(--ph-radius-full);
        background:linear-gradient(180deg, var(--sdk-paper-hi), var(--sdk-paper));
        border:1px solid var(--sdk-gold-line);
        box-shadow:0 6px 16px -6px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.7)}
      .sdk-cartouche-lbl{font:600 11px/1 'Fraunces',serif;letter-spacing:.14em;
        text-transform:uppercase;color:#7A6642}
      .sdk-cartouche-val{font:600 13px/1 'Fraunces',serif;
        font-variant-numeric:var(--ph-variant-numeral);color:var(--sdk-ink)}

      /* ── PARŞÖMEN TABLET ──
         Tek parça levha. Sol-üst anahtar ışığı (§4) + sağ-alt gölge + kâğıt
         lifi (malzemeden bağımsız --ph-stone-grain dokusu, soft-light).
         Hücreler arası boşluk YOK: gerçek bir sayfa gibi kesintisiz yüzey,
         bölmeler yalnızca altın çizgilerle çiziliyor. */
      .sdk-tablet{
        position:relative;display:grid;grid-template-columns:repeat(3,1fr);
        width:100%;padding:9px;border-radius:var(--ph-radius-md);
        background:
          var(--ph-stone-grain),
          radial-gradient(ellipse 110% 78% at 22% 6%, rgba(255,255,255,.55), transparent 55%),
          radial-gradient(ellipse 95% 92% at 84% 99%, rgba(148,120,70,.22), transparent 62%),
          linear-gradient(153deg, var(--sdk-paper-hi) 0%, var(--sdk-paper) 52%, var(--sdk-paper-lo) 100%);
        background-size:170px 170px, auto, auto, auto;
        background-blend-mode:soft-light, normal, normal, normal;
        border:1px solid var(--sdk-gold);
        box-shadow:
          0 28px 56px -20px rgba(0,0,0,.72),
          0 0 46px -12px rgba(246,226,170,.18),
          inset 0 1px 0 rgba(255,255,255,.75);
      }
      .sdk-block{display:grid;grid-template-columns:repeat(3,1fr);min-width:0;min-height:0}
      /* 3x3 bölmeleri ayıran KALIN altın çizgiler — kenarlarda çift çizgi
         oluşmasın diye yalnızca iç kenarlara. */
      .sdk-tablet > .sdk-block:not(:nth-child(3n)){border-right:2px solid var(--sdk-gold-line)}
      .sdk-tablet > .sdk-block:nth-child(-n+6){border-bottom:2px solid var(--sdk-gold-line)}
      /* Hücreler arası SAÇ TELİ çizgiler — aynı mantık, daha ince. */
      .sdk-block > .sdk-cell:not(:nth-child(3n)){border-right:1px solid var(--sdk-gold-hair)}
      .sdk-block > .sdk-cell:nth-child(-n+6){border-bottom:1px solid var(--sdk-gold-hair)}

      /* ── HÜCRE ── */
      .sdk-cell{aspect-ratio:1;min-width:0;min-height:0;position:relative;display:flex;
        align-items:center;justify-content:center;user-select:none;
        transition:background var(--ph-duration-fast) var(--ph-ease-standard)}
      .sdk-cell.empty{cursor:pointer}
      /* Boş hücrenin noktası: yüzeyi "boş" değil "henüz yazılmamış" gösterir. */
      .sdk-dot{font:400 15px/1 'Fraunces',serif;color:rgba(122,102,66,.34);pointer-events:none}

      /* ── RAKAMLAR ──
         Serif (Fraunces): kadim el yazması hissi. İpuçları koyu mürekkep —
         sayfaya BASILMIŞ, kalıcı. Oyuncununkiler sıcak altın-kahve —
         sayfaya SONRADAN yazılmış, ama aynı okunurlukta. */
      .sdk-glyph{font:600 clamp(19px,5.6vw,24px)/1 'Fraunces',serif;
        font-variant-numeric:var(--ph-variant-numeral);pointer-events:none}
      .sdk-glyph.clue{color:var(--sdk-ink)}
      .sdk-glyph.user{color:var(--sdk-ink-user)}
      /* Yeni yazılan rakam bir an ışıyıp yerine oturur: "bu benim hamlemdi". */
      @keyframes sdkInk{
        0%{opacity:0;transform:scale(.6);text-shadow:0 0 16px rgba(191,138,42,.9)}
        60%{opacity:1;transform:scale(1.14);text-shadow:0 0 12px rgba(191,138,42,.55)}
        100%{opacity:1;transform:scale(1);text-shadow:none}
      }
      .sdk-glyph.fresh{animation:sdkInk var(--ph-duration-medium) var(--ph-ease-spring)}

      /* ── SEÇİM + AKRABA HÜCRELER ──
         Seçili hücrenin satır/sütun/kutusu hafifçe ısınır: oyuncunun gözü
         ilgili bölgeyi taramak zorunda kalmaz. Modern mobil sudokunun
         standart yardımı — ipucu vermez, sadece taramayı ucuzlatır. */
      .sdk-cell.peer{background:rgba(184,151,79,.13)}
      .sdk-cell.sel{
        background:radial-gradient(ellipse 86% 78% at 50% 45%, rgba(214,170,74,.34), rgba(214,170,74,.16));
        box-shadow:inset 0 0 0 2px var(--sdk-gold), inset 0 0 12px rgba(184,151,79,.4);
        border-radius:3px;
      }

      /* ── REDDEDİLEN HAMLE — "büyü tutmadı" ──
         Rakam bir an sayfada BELİRİR, sonra kızıl bir korla yanıp yok olur.
         Oyuncu ne denediğini görür ama sayı asla yerleşmez — reddedilmenin
         sebebi böylece somutlaşır. Hücre eşzamanlı olarak kızıl parlar. */
      @keyframes sdkBurn{
        0%  {opacity:0;transform:scale(.7)}
        22% {opacity:1;transform:scale(1.05);color:var(--sdk-err);text-shadow:0 0 14px rgba(179,64,46,.85)}
        60% {opacity:.75;transform:scale(1.02);text-shadow:0 0 20px rgba(179,64,46,.6)}
        100%{opacity:0;transform:scale(1.3) translateY(-8px);text-shadow:0 0 26px rgba(179,64,46,0)}
      }
      .sdk-ghost{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        font:600 clamp(19px,5.6vw,24px)/1 'Fraunces',serif;color:var(--sdk-err);
        pointer-events:none;animation:sdkBurn .62s var(--ph-ease-standard) forwards}
      @keyframes sdkReject{
        0%  {box-shadow:inset 0 0 0 2px rgba(179,64,46,.85), inset 0 0 18px rgba(179,64,46,.42)}
        60% {box-shadow:inset 0 0 0 2px rgba(179,64,46,.38), inset 0 0 10px rgba(179,64,46,.2)}
        100%{box-shadow:inset 0 0 0 2px var(--sdk-gold), inset 0 0 12px rgba(184,151,79,.4)}
      }
      .sdk-cell.sdk-reject{animation:sdkReject .62s var(--ph-ease-standard)}

      /* ── SAYI TUŞLARI ──
         ✕ (temizle) YOK: yanlış sayı hiç yerleşmediği için silinecek bir şey
         kalmıyor. 9 tuş tek sıraya sığıyor — §22'nin 44px dokunma hedefi
         korunuyor. */
      .sdk-nums{display:flex;gap:5px;justify-content:center;width:100%;max-width:430px}
      .sdk-num{
        flex:1;min-width:0;aspect-ratio:1;max-width:46px;display:flex;align-items:center;justify-content:center;
        border-radius:var(--ph-radius-sm);cursor:pointer;
        font:600 20px/1 'Fraunces',serif;color:var(--sdk-ink);
        background:
          var(--ph-stone-grain),
          linear-gradient(180deg, var(--sdk-paper-hi) 0%, var(--sdk-paper) 60%, var(--sdk-paper-lo) 100%);
        background-size:170px 170px, auto;background-blend-mode:soft-light, normal;
        border:1px solid var(--sdk-gold-line);
        box-shadow:0 5px 12px -5px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.75);
        transition:transform var(--ph-duration-micro) var(--ph-ease-standard);
      }
      .sdk-num:active{transform:scale(.9)}
      /* Tahtada 9 kez kullanılmış rakam sönükleşir — hangi rakamın bittiğini
         saymak zorunda kalmamak, akışı koruyan küçük ama gerçek bir yardım. */
      .sdk-num.done{opacity:.32;pointer-events:none}

      @media (prefers-reduced-motion: reduce){
        .sdk-glyph.fresh, .sdk-cell.sdk-reject{animation:none}
        .sdk-ghost{animation-duration:var(--ph-duration-fast)}
      }
    `);
  }

  function init(c) {
    container = c; selected = -1; startTime = Date.now(); dead = false;
    container.classList.add('ph-scene', 'sdk-arcane');
    const idx = Math.floor(Math.random() * PUZZLES.length);
    initial = [...PUZZLES[idx]];
    board = [...initial];
    // Çözüm artık DOĞRULAMA için şart (sadece kazanma kontrolü için değil):
    // her hamle buna karşı sınanıyor. Bu, bulmacaların TEK ÇÖZÜMLÜ olmasını
    // fonksiyonel bir gereklilik yapar — çok çözümlü bir bulmacada oyuncu
    // geçerli bir alternatifi girip haksız yere can kaybederdi.
    // Mevcut üç bulmaca doğrulandı; yeni bulmaca eklerken bu kontrol şart.
    if (!SOLUTIONS[idx]) SOLUTIONS[idx] = solveCopy(PUZZLES[idx]);
    solution = SOLUTIONS[idx];
    injectCSS();

    // Ortak evren: gökyüzü (.ph-scene) + atmosfer. Sahne oyuncu hiçbir şey
    // yapmadan ÖNCE canlı olmalı. skyPct düşük — tahta ortayı kaplıyor,
    // yıldızlar üst şeride toplanmalı.
    atmoEl = phAtmosphere(container, { stars: 20, beams: 2, motes: 7, skyPct: 42 });
    buildPlace();

    wrapEl = document.createElement('div'); wrapEl.className = 'sdk-wrap';
    wrapEl.innerHTML =
      `<div class="sdk-cartouche">` +
        `<span class="sdk-cartouche-lbl">Hatalar</span>` +
        `<span class="sdk-cartouche-val" data-role="mistakes">0/${MAX_LIVES}</span>` +
        `<span data-role="hearts"></span>` +
      `</div>` +
      `<div class="sdk-tablet" data-role="tablet"></div>` +
      `<div class="sdk-nums" data-role="nums">` +
        [1,2,3,4,5,6,7,8,9].map(n=>`<div class="sdk-num" data-n="${n}">${n}</div>`).join('') +
      `</div>`;
    container.appendChild(wrapEl);

    tabletEl = wrapEl.querySelector('[data-role="tablet"]');
    mistakesEl = wrapEl.querySelector('[data-role="mistakes"]');

    lives = phLives({ max: MAX_LIVES, onEmpty: onLivesEmpty });
    lives.mount(wrapEl.querySelector('[data-role="hearts"]'));

    // Olay DELEGASYONU: tahta her render'da yeniden çiziliyor, tek tek
    // hücrelere dinleyici bağlansaydı clearEvs'in listesi her render'da
    // büyürdü (ölü elemanlara referans tutarak). İki dinleyici yeter.
    addEv(tabletEl, 'click', (e) => {
      const cell = e.target.closest('.sdk-cell');
      if (!cell || !cell.classList.contains('empty')) return;
      selected = +cell.dataset.i;
      GameAudio.play('tap');
      render();
    });
    addEv(wrapEl.querySelector('[data-role="nums"]'), 'click', (e) => {
      const btn = e.target.closest('.sdk-num');
      if (btn) placeNum(+btn.dataset.n);
    });

    render();
  }

  // Sudoku'nun kendi mekânı — ortak atmosferin ÜSTÜNE, tahtanın ALTINA.
  function buildPlace() {
    placeEl = document.createElement('div');
    placeEl.className = 'sdk-place';
    const glow = document.createElement('div');
    glow.className = 'sdk-moon-glow';
    placeEl.appendChild(glow);
    const moon = document.createElement('div');
    moon.className = 'sdk-moon';
    placeEl.appendChild(moon);
    const ruins = document.createElement('div');
    ruins.className = 'sdk-ruins';
    // Kenarlarda kümelenmiş sütunlar; orta bölge tahtaya bırakıldı.
    [[3,96],[10,68],[17,84],[75,78],[84,104],[92,62]].forEach(([leftPct, h]) => {
      const col = document.createElement('div');
      col.className = 'sdk-col';
      col.style.left = leftPct + '%';
      col.style.height = h + 'px';
      ruins.appendChild(col);
    });
    placeEl.appendChild(ruins);
    container.appendChild(placeEl);
  }

  function updateHud() {
    if (mistakesEl) mistakesEl.textContent = (MAX_LIVES - lives.count) + '/' + MAX_LIVES;
  }

  function render(freshIndex) {
    // Nested yapı: tablet > 9 blok > 9 hücre. Bloklar görsel sırayla gezilir
    // (nth-child tabanlı altın çizgiler bu sıraya bağlı).
    // Yerleşen her sayı çözümle DOĞRULANDIĞI için tahtada asla yanlış bir
    // rakam bulunmaz — "yanlış" durumu için stil yok, olamaz.
    const selR = selected >= 0 ? Math.floor(selected/9) : -1;
    const selC = selected >= 0 ? selected % 9 : -1;
    const selB = selected >= 0 ? Math.floor(selR/3)*3 + Math.floor(selC/3) : -1;
    let blocksHtml = '';
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        let cells = '';
        for (let rr = 0; rr < 3; rr++) {
          for (let cc = 0; cc < 3; cc++) {
            const r = br*3+rr, c = bc*3+cc, i = r*9+c;
            const v = board[i];
            const fixed = initial[i] !== 0;
            const peer = selected >= 0 && i !== selected &&
                         (r === selR || c === selC || (br*3+bc) === selB);
            const cls = ['sdk-cell', v ? 'filled' : 'empty', fixed ? 'fixed' : '',
                         selected === i ? 'sel' : '', peer ? 'peer' : ''].filter(Boolean).join(' ');
            const inner = v
              ? `<span class="sdk-glyph ${fixed ? 'clue' : 'user'}${i === freshIndex ? ' fresh' : ''}">${v}</span>`
              : `<span class="sdk-dot">·</span>`;
            cells += `<div class="${cls}" data-i="${i}">${inner}</div>`;
          }
        }
        blocksHtml += `<div class="sdk-block">${cells}</div>`;
      }
    }
    tabletEl.innerHTML = blocksHtml;
    refreshNumStates();
  }

  // Tahtada 9 kez geçen rakamın tuşu kapanır.
  function refreshNumStates() {
    const counts = {};
    for (let i = 0; i < 81; i++) if (board[i]) counts[board[i]] = (counts[board[i]] || 0) + 1;
    wrapEl.querySelectorAll('.sdk-num').forEach(btn => {
      btn.classList.toggle('done', counts[+btn.dataset.n] === 9);
    });
  }

  // Yanlış hamle: sayı yerleşmez, bir can gider.
  // Tek kural — DOĞRU sayı dışındaki her şey yanlıştır. Satır/sütun/kutu
  // çakışması bunun alt kümesidir, ayrıca kontrol edilmez.
  // Yeniden render YOK: tahta değişmedi, seçim korunur ki oyuncu hemen
  // başka bir rakam deneyebilsin. (Render, hayalet animasyonunu da silerdi.)
  function rejectMove(cellEl, n) {
    if (cellEl) {
      phShake(cellEl);                       // sarsıntı + 'error' sfx + haptic
      cellEl.classList.remove('sdk-reject'); void cellEl.offsetWidth;
      cellEl.classList.add('sdk-reject');
      setTimeout(() => cellEl.classList.remove('sdk-reject'), 640);
      // Yanan hayalet rakam — oyuncu ne denediğini görür.
      const ghost = document.createElement('span');
      ghost.className = 'sdk-ghost';
      ghost.textContent = n;
      cellEl.appendChild(ghost);
      setTimeout(() => ghost.remove(), 640);
      const r = cellEl.getBoundingClientRect();
      phParticleBurst(document.body, r.left + r.width/2, r.top + r.height/2, 'var(--sdk-err)', 9);
    } else {
      GameAudio.play('error'); GameAudio.haptic('error');
    }
    lives.lose();
    updateHud();
  }

  function onLivesEmpty() {
    dead = true;
    selected = -1;
    GameAudio.play('lose');
    GameAudio.haptic('error');
    render();
    // Devam kancası: reklam/elmas akışı tamamlanırsa oyuncu bir canla
    // kaldığı yerden sürer — tahta korunur, sıfırlanmaz.
    showGameOver(false, 'Büyü Tükendi', 'Tüm canların tükendi. Tekrar denemek ister misin?', {
      onContinue: () => {
        lives.gain(1);
        dead = false;
        updateHud();
        GameAudio.play('star');
        GameAudio.haptic('soft');
      }
    });
  }

  function placeNum(n) {
    if (dead) return;                                   // canlar tükendi
    if (selected < 0 || board[selected] !== 0) return;   // seçim yok / hücre dolu
    const cellEl = tabletEl.querySelector(`.sdk-cell[data-i="${selected}"]`);

    if (n !== solution[selected]) { rejectMove(cellEl, n); return; }

    // Doğru hamle — mürekkep sayfaya işler. Yerleşen sayı KALICIDIR
    // (yanlışı hiç yerleşmediği için silme/geri alma ihtiyacı yok).
    board[selected] = n;
    GameAudio.play('place'); GameAudio.haptic('tap');
    const placedAt = selected;
    selected = -1;
    render(placedAt);

    if (!board.includes(0)) {
      const secs = Math.floor((Date.now()-startTime)/1000);
      updateGameScore(Math.max(5000 - secs*10, 500));
      GameAudio.play('win'); GameAudio.haptic('win');
      phAtmosphereFlare(atmoEl, 2.2, 620);
      showGameOver(true, 'Sudoku Çözüldü! 🧩', `${secs} saniyede tamamladın!`);
    }
  }

  function cleanup(){
    clearEvs();
    if (placeEl) { placeEl.remove(); placeEl = null; }
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) container.classList.remove('ph-scene', 'sdk-arcane');
  }
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

  // Renkler artık oyunun kendi paletinden değil ORTAK jewel token'larından
  // (design-tokens.css §3.5) geliyor: 8 renk, her biri highlight/base/
  // shadow/glow. Water Sort'un sıvı katmanları da aynı sekiz renkten
  // seçiyor — "aynı evren" hissinin yarısı bu renk ortaklığı.
  // Eski özel PAL 9 renkti ve hiçbiri token'larla birebir aynı değildi.
  const JEWELS = 8;
  // Bir hücre/parça için ortak token'lardan CSS özel özellikleri üretir.
  // Kompozisyonun kendisi CSS'te (bkz. .bp-c.filled) — burada yalnızca
  // hangi rengin kullanılacağı seçiliyor.
  function jewelVars(n) {
    return `--bp-base:var(--ph-jewel-${n}-base);--bp-hl:var(--ph-jewel-${n}-highlight);` +
           `--bp-sh:var(--ph-jewel-${n}-shadow);--bp-glow:var(--ph-jewel-${n}-glow);`;
  }

  // UI metinleri Türkçe (bkz. CLAUDE.md §6 — bu konvansiyon, düzeltilecek
  // bir tutarsızlık değil). Eskiden 'Nice!/Great!/LEGENDARY!' idi.
  const COMBO_WORDS = ['','Güzel!','Harika!','Muhteşem!','İnanılmaz!','EFSANE!'];

  let board, pieces, score, combo, highScore, locked, container;
  let boardEl, trayEl, wrapEl, atmoEl;
  let drag = null;
  let aCtx = null;

  // ───────── HAPTİK ─────────
  function haptic(ms) { GameAudio.haptic(ms); }

  // ───────── SES ─────────
  function snd(type, opts) { GameAudio.play(type, opts); }

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

  // ═══════════ FAZ 2A — YERLEŞTİRME ENERJİSİ ═══════════
  // Hikâye: kaide bir rün levhası, kristaller katılaşmış enerji. Kristal
  // yerleştirmek levhaya enerji BOŞALTIR. Aşağıdaki üç efekt bunun üç ayrı
  // katmanı — hepsi aynı anda olur ama her biri FARKLI şeyi anlatır:
  //   runePulse  → levha ENERJİYİ İLETİR (ızgara boyunca, boş soketler dâhil)
  //   discharge  → enerji YÜZEYİN ALTINA sızar (yumuşak renk yayılımı)
  //   sparks     → kristaller BİRBİRİNE DEĞER (yalnızca temas kenarlarında)
  // Üst üste binmeleri "çöplük" değil derinlik üretir, çünkü her katmanın
  // ayrı bir sebebi var. Sebepsiz efekt eklenmiyor.

  // Bir hücrenin merkezini wrapEl koordinatlarına çevirir.
  // DİKKAT: efektler wrapEl'e ekleniyor, bu yüzden ölçüm de wrapEl'e göre
  // olmak zorunda. Eski kod boardEl'e göre hesaplayıp wrapEl'e koyuyordu;
  // ölçüldü: parçacıklar 21px sola, 77px yukarı düşüyordu (kaide iç boşluğu
  // + üst bar kadar). Efektin doğru yerde doğması, güzelliğinden önce gelir.
  function cellCenter(y, x) {
    const el = boardEl.children[y*G+x];
    if (!el) return null;
    const r = el.getBoundingClientRect(), w = wrapEl.getBoundingClientRect();
    return { x: r.left - w.left + r.width/2, y: r.top - w.top + r.height/2, size: r.width };
  }

  // Izgarayı takip eden enerji dalgası. Yarıçap sınırlı (RUNE_R): tüm tahtayı
  // yakmak "levha iletti" değil "ekran flaşladı" gibi okunur. Şiddet
  // mesafeyle sönümlenir, gecikme mesafeyle artar — dalga dışa yayılır.
  // Yarıçap 3.2 denendi ve fazlaydı: 4 hücrelik bir taşta 64 hücrenin 50'si
  // darbe alıyordu — "levha iletti" değil "ekran flaşladı". 2.4 ile etki
  // taşın çevresinde kalıyor. RUNE_MIN_I ayrıca gözle görülmeyecek kadar
  // sönük hücreleri tamamen eliyor: onlara stil yazmak boşuna DOM işi.
  const RUNE_R = 2.4;
  const RUNE_MIN_I = 0.07;
  function runePulse(cells, jewel) {
    const color = `var(--ph-jewel-${jewel}-glow)`;
    const touched = new Map();
    for (let y=0;y<G;y++) for (let x=0;x<G;x++) {
      // Konan hücrelerin HERHANGİ birine olan en kısa mesafe: dalga tek bir
      // noktadan değil, parçanın tüm gövdesinden yayılır.
      let d = Infinity;
      cells.forEach(c => { const t = Math.hypot(y-c.y, x-c.x); if (t < d) d = t; });
      if (d <= RUNE_R && 0.62 * (1 - d/RUNE_R) >= RUNE_MIN_I) touched.set(y*G+x, d);
    }
    touched.forEach((d, i) => {
      const el = boardEl.children[i];
      if (!el) return;
      el.style.setProperty('--bp-rune-c', color);
      el.style.setProperty('--bp-rune-i', (0.62 * (1 - d/RUNE_R)).toFixed(3));
      el.style.animationDelay = (d * 26).toFixed(0) + 'ms';
      el.classList.add('rune');
    });
    setTimeout(() => touched.forEach((d, i) => {
      const el = boardEl.children[i];
      if (el) { el.classList.remove('rune'); el.style.animationDelay = ''; }
    }), RUNE_R * 26 + 280);
  }

  // Enerjinin levhaya sızması — parçanın ağırlık merkezinden.
  function daisDischarge(cells, jewel) {
    const first = cellCenter(cells[0].y, cells[0].x);
    if (!first) return;
    let sx=0, sy=0, n=0;
    cells.forEach(c => { const p = cellCenter(c.y,c.x); if(p){ sx+=p.x; sy+=p.y; n++; } });
    if (!n) return;
    const size = first.size * 5;
    const d = document.createElement('div');
    d.className = 'bp-discharge';
    d.style.cssText = `left:${(sx/n).toFixed(1)}px;top:${(sy/n).toFixed(1)}px;` +
      `width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;` +
      `background:radial-gradient(circle, var(--ph-jewel-${jewel}-glow) 0%, transparent 68%)`;
    wrapEl.appendChild(d);
    setTimeout(()=>d.remove(), 480);
  }

  // Yeni kristalin MEVCUT kristallere değdiği kenarlar. Kendi parçasının
  // hücreleri sayılmaz — taşın kendi içindeki birleşimler temas değildir.
  function contactEdges(cells) {
    const own = new Set(cells.map(c => c.y+','+c.x));
    const out = [];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    cells.forEach(({y,x}) => dirs.forEach(([dy,dx]) => {
      const ny=y+dy, nx=x+dx;
      if (ny<0||ny>=G||nx<0||nx>=G) return;
      if (!board[ny][nx] || own.has(ny+','+nx)) return;
      out.push({y,x,dy,dx});
    }));
    return out;
  }

  // Temas kıvılcımları: paylaşılan kenarın ortasından, kenara DİK fırlar.
  // Boşluğa konan taş hiç kıvılcım üretmez — efekt, sıkı yerleştirmenin
  // ödülü, yani oyunun asıl becerisinin. Toplam sayı sınırlı: dar bir
  // boşluğa giren 4 hücrelik taş 8 temas üretebiliyor.
  const SPARK_CAP = 14;
  function contactSparks(edges, jewel) {
    if (!edges.length) return;
    const use = edges.slice(0, SPARK_CAP);
    // Kenar başına ÜST SINIR ayrıca gerekli: yalnızca toplamı sınırlamak,
    // az sayıda temasta kenar başına 7 kıvılcım düşürüyordu — o artık
    // "temas" değil "patlama" gibi okunuyor. Temas kıvılcımı SEYREK olmalı;
    // çokluğu değil, VARLIĞI ödül. Yoğunluk temas SAYISINDAN gelsin.
    const perEdge = Math.min(3, Math.max(1, Math.floor(SPARK_CAP / use.length)));
    use.forEach(({y,x,dy,dx}) => {
      const c = cellCenter(y,x);
      if (!c) return;
      const half = c.size/2;
      const ex = c.x + dx*half, ey = c.y + dy*half;   // paylaşılan kenarın ortası
      for (let k=0;k<perEdge;k++) {
        const spread = (Math.random()-.5) * c.size * .55;   // kenar boyunca dağıl
        const px = ex + (dx ? 0 : spread), py = ey + (dy ? 0 : spread);
        const dist = 7 + Math.random()*9;
        const sz = 2 + Math.random()*2.5;
        const s = document.createElement('div');
        s.className = 'bp-spark';
        s.style.cssText = `left:${px.toFixed(1)}px;top:${py.toFixed(1)}px;` +
          `width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;` +
          `background:var(--ph-jewel-${jewel}-highlight);` +
          `box-shadow:0 0 ${(sz*2.5).toFixed(1)}px var(--ph-jewel-${jewel}-glow);` +
          `--bp-sx:${(dx*dist).toFixed(1)}px;--bp-sy:${(dy*dist).toFixed(1)}px;` +
          `--bp-spark-dur:${(260+Math.random()*120)|0}ms`;
        wrapEl.appendChild(s);
        setTimeout(()=>s.remove(), 420);
      }
    });
  }

  // ── ŞARJ ──
  // En dolu satır/sütunun doluluğu. Bu sayı oyuncuya GÖSTERİLMEZ; yalnızca
  // kaidenin dibindeki ışığın şiddetini besler. Hangi satırın dolmak üzere
  // olduğu bilgisi hiçbir yere sızmaz — konumsuz bir gerilim, ipucu değil.
  function maxLineFill() {
    let m = 0;
    for (let r=0;r<G;r++) { let n=0; for(let c=0;c<G;c++) if(board[r][c]) n++; if(n>m)m=n; }
    for (let c=0;c<G;c++) { let n=0; for(let r=0;r<G;r++) if(board[r][c]) n++; if(n>m)m=n; }
    return m;
  }
  function updateCharge() {
    const el = wrapEl && wrapEl.querySelector('.bp-charge');
    if (!el) return;
    const m = maxLineFill();
    // 5 ve altı: hiçbir şey. 6→.33, 7→.67. (8 zaten temizleniyor.)
    const t = m <= 5 ? 0 : Math.min((m - 5) / 3, 1);
    el.style.setProperty('--bp-charge', (t * 0.42).toFixed(3));
    el.classList.toggle('breathe', t > 0);
  }

  // ═══════════ FAZ 2B — KIRILMA KATMANLARI ═══════════
  // İlke: "daha çok parçacık" değil "daha çok KATMAN". Her fonksiyon
  // patlamanın farklı bir yönünü anlatıyor; hiçbiri süsleme değil.
  // Hepsi wrapEl uzayında çalışır (bkz. cellCenter'daki koordinat notu).

  // ── PARÇACIK BÜTÇESİ: İKİ KATMAN ──
  // DESIGN_SYSTEM §17 tek bir sert sınır koyuyordu: 12-16. O sınır AMBİYANS
  // ve MİKRO anlar için hâlâ geçerli (temas kıvılcımı 14'te duruyor). Ama
  // satır temizleme oyunun KAHRAMAN anı ve seyrek: 8 hücrelik bir satırda
  // hücre başına 2 parçacık "kristal patladı" değil "iki nokta çıktı"
  // demek. Kahraman katmanı için ayrı — ve yine SERT — tavanlar tanımlı.
  // Tavanlar toplam üzerinden uygulanıyor, hücre başına değil: 4 satırlık
  // bir temizleme 32 hücre eder ve hücre başına sabit sayı verilseydi
  // bütçe dörde katlanırdı.
  const SHARD_CAP = 48;   // kristal kıymığı
  const DUST_CAP  = 14;   // yıldız tozu (kalıntı)
  const GLYPH_CAP = 8;    // rün glifi (combo 2+)

  // Kristal kıymıkları — İKİ POPÜLASYON.
  // Tek boyutta kıymık dağıtmak patlamayı toz bulutu gibi gösteriyordu.
  // Gerçekte kırılan bir taş birkaç İRİ parça + çok sayıda kırıntı verir;
  // gözün "kırıldı" diye okuduğu şey bu boyut dağılımı. İri parçalar yavaş
  // ve takip edilebilir (olayın gövdesi), kırıntılar hızlı ve çok (dokusu).
  function shard(p, j, opts) {
    const ang = opts.ang, dist = opts.dist, sz = opts.sz;
    const s = document.createElement('div');
    s.className = 'bp-shard' + (opts.big ? ' big' : '');
    s.style.cssText =
      `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;` +
      `width:${sz.toFixed(1)}px;height:${(sz*(opts.big?1.15:1.5)).toFixed(1)}px;` +
      `background:linear-gradient(150deg, var(--ph-jewel-${j}-highlight), var(--ph-jewel-${j}-base) 55%, var(--ph-jewel-${j}-shadow));` +
      `--bp-shg:var(--ph-jewel-${j}-glow);` +
      `--bp-shx:${(Math.cos(ang)*dist).toFixed(1)}px;` +
      // Yerçekimi. Kıymık savrulur AMA düşer; tam simetrik dağılım
      // "havai fişek" gibi okunuyor, "kırıldı" gibi değil. İri parça daha
      // ağır: daha çok düşer.
      `--bp-shy:${(Math.sin(ang)*dist + (opts.big?26:14)).toFixed(1)}px;` +
      `--bp-shr:${(Math.random()*720-360).toFixed(0)}deg;` +
      `--bp-shd:${opts.dur|0}ms`;
    wrapEl.appendChild(s);
    setTimeout(()=>s.remove(), opts.dur + 220);
  }
  function shatterShards(cellIdxs, jewelOf, budget) {
    // İri parçalar bütçenin küçük bir kısmı — çokluğu değil VARLIĞI iş
    // görüyor. Hepsi iri olsaydı patlama hantallaşır, hiçbiri olmasaydı
    // toz bulutuna dönerdi.
    const bigCount = Math.max(2, Math.min(6, Math.round(cellIdxs.length / 3)));
    const pool = [...cellIdxs];
    for (let k=0; k<bigCount && pool.length; k++) {
      const i = pool.splice((Math.random()*pool.length)|0, 1)[0];
      const p = cellCenter(Math.floor(i/G), i%G);
      if (!p) continue;
      shard(p, jewelOf(i) || 1, {
        big: true,
        ang: Math.random()*Math.PI*2,
        dist: 34 + Math.random()*54,
        sz: 13 + Math.random()*10,
        dur: 600 + Math.random()*220,
      });
    }
    const small = Math.max(0, budget - bigCount);
    const n = cellIdxs.length || 1;
    const per = Math.max(1, Math.min(5, Math.round(small / n)));
    let spent = 0;
    for (const i of cellIdxs) {
      if (spent >= small) break;
      const p = cellCenter(Math.floor(i/G), i%G);
      if (!p) continue;
      const j = jewelOf(i) || 1;
      for (let k=0; k<per && spent<small; k++, spent++) {
        shard(p, j, {
          ang: Math.random()*Math.PI*2,
          dist: 20 + Math.random()*52,
          sz: 3 + Math.random()*4,
          dur: 400 + Math.random()*200,
        });
      }
    }
  }

  // Şok dalgası — tahtadan çıkıp TÜM SAHNEYİ kat eder. Patlamanın oyun
  // alanıyla sınırlı kalmadığını söyleyen katman. Konteynere eklenir.
  function shockwave(jewel) {
    if (!container) return;
    const mid = (G-1)/2|0;
    const p = cellCenter(mid, mid);
    const cr = container.getBoundingClientRect();
    const wr = wrapEl.getBoundingClientRect();
    if (!p) return;
    const d = Math.max(cr.width, cr.height) * 1.1;
    const el = document.createElement('div');
    el.className = 'bp-shock';
    el.style.cssText =
      `left:${(wr.left - cr.left + p.x).toFixed(1)}px;top:${(wr.top - cr.top + p.y).toFixed(1)}px;` +
      `width:${d.toFixed(0)}px;height:${d.toFixed(0)}px;` +
      `background:radial-gradient(circle, transparent 58%, var(--ph-jewel-${jewel}-highlight) 68%, rgba(255,255,255,.85) 72%, transparent 80%)`;
    container.appendChild(el);
    setTimeout(()=>el.remove(), 520);
  }

  // Işık sütunu — temizlenen çizgiden yukarı kaçan enerji.
  function lightColumn(line, jewel) {
    const mid = (G-1)/2|0;
    const p = line.type==='row' ? cellCenter(line.idx, mid) : cellCenter(mid, line.idx);
    if (!p) return;
    const br = boardEl.getBoundingClientRect();
    const w = (line.type==='row' ? br.width * .82 : p.size * 2.1);
    const el = document.createElement('div');
    el.className = 'bp-column';
    el.style.cssText =
      `left:${p.x.toFixed(1)}px;bottom:${(wrapEl.getBoundingClientRect().height - p.y).toFixed(1)}px;` +
      `width:${w.toFixed(0)}px;height:${(p.y + 40).toFixed(0)}px;` +
      `background:linear-gradient(0deg, #fff 0%, var(--ph-jewel-${jewel}-highlight) 22%, var(--ph-jewel-${jewel}-glow) 55%, transparent 100%)`;
    wrapEl.appendChild(el);
    setTimeout(()=>el.remove(), 580);
  }

  // Eksen süpürmesi: enerji rastgele değil, ÇİZGİ boyunca boşalıyor.
  function axisSweep(line, jewel) {
    const mid = (G-1)/2|0;
    const p = line.type==='row' ? cellCenter(line.idx, mid) : cellCenter(mid, line.idx);
    if (!p) return;
    const br = boardEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'bp-sweep' + (line.type==='col' ? ' vert' : '');
    const long = (line.type==='row' ? br.width : br.height) * 1.05;
    const thick = p.size * 0.9;
    el.style.cssText =
      `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;` +
      `width:${(line.type==='row'?long:thick).toFixed(0)}px;` +
      `height:${(line.type==='row'?thick:long).toFixed(0)}px;` +
      `background:linear-gradient(${line.type==='row'?'90deg':'180deg'}, transparent, ` +
        `var(--ph-jewel-${jewel}-highlight) 35%, #fff 50%, var(--ph-jewel-${jewel}-highlight) 65%, transparent);` +
      `filter:blur(1px)`;
    wrapEl.appendChild(el);
    setTimeout(()=>el.remove(), 380);
  }

  // Rün glifleri — combo 2+. Nokta değil YAZI: levhadan serbest kalan büyü.
  const GLYPHS = ['ᚦ','ᛝ','ᛟ','ᚨ','ᛉ','ᛊ','ᛃ','ᛒ'];
  function runeGlyphs(cellIdxs, jewel, count) {
    const n = Math.min(count, GLYPH_CAP);
    for (let k=0;k<n;k++) {
      const i = cellIdxs[(Math.random()*cellIdxs.length)|0];
      const p = cellCenter(Math.floor(i/G), i%G);
      if (!p) continue;
      const el = document.createElement('div');
      el.className = 'bp-glyph';
      el.textContent = GLYPHS[(Math.random()*GLYPHS.length)|0];
      el.style.cssText =
        `left:${(p.x + (Math.random()*20-10)).toFixed(1)}px;top:${p.y.toFixed(1)}px;` +
        `color:var(--ph-jewel-${jewel}-highlight);` +
        // 11-18px denendi ve "rün" değil "leke" gibi okunuyordu. Glif bu
        // dilin İMZASI — okunacak kadar büyük olmalı, yoksa parçacıktan
        // farkı kalmıyor ve combo tırmanışının anlamı kayboluyor.
        `--bp-gs:${(15 + Math.random()*9)|0}px;` +
        `--bp-gx:${(Math.random()*40-20).toFixed(1)}px;` +
        `--bp-gr0:${(Math.random()*40-20).toFixed(0)}deg;` +
        `--bp-gr1:${(Math.random()*50-25).toFixed(0)}deg;` +
        `--bp-gd:${(560 + Math.random()*220)|0}ms`;
      wrapEl.appendChild(el);
      setTimeout(()=>el.remove(), 840);
    }
  }

  // Yıldız tozu — 3. vuruş (kalıntı). Patlama bittikten sonra havada kalan
  // ince parıltı: "olay bitti ama izi duruyor".
  function stardust(cellIdxs, jewel, count) {
    const n = Math.min(count, DUST_CAP);
    for (let k=0;k<n;k++) {
      const i = cellIdxs[(Math.random()*cellIdxs.length)|0];
      const p = cellCenter(Math.floor(i/G), i%G);
      if (!p) continue;
      const sz = 1.5 + Math.random()*2;
      const el = document.createElement('div');
      el.className = 'bp-dust';
      el.style.cssText =
        `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;` +
        `width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;` +
        `background:var(--ph-jewel-${jewel}-highlight);` +
        `box-shadow:0 0 ${(sz*3).toFixed(1)}px var(--ph-jewel-${jewel}-glow);` +
        `--bp-dx:${(Math.random()*54-27).toFixed(1)}px;` +
        `--bp-dy:${(-30 - Math.random()*40).toFixed(1)}px;` +
        `--bp-dd:${(760 + Math.random()*380)|0}ms`;
      wrapEl.appendChild(el);
      setTimeout(()=>el.remove(), 1200);
    }
  }

  // Rün çemberi — combo 4+. Seyrek olduğu için çıktığında OLAY olur.
  function runeCircle(jewel) {
    const mid = (G-1)/2|0;
    const p = cellCenter(mid, mid);
    if (!p) return;
    const d = boardEl.getBoundingClientRect().width * 0.78;
    const el = document.createElement('div');
    el.className = 'bp-circle';
    el.style.cssText = `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;` +
      `width:${d.toFixed(0)}px;height:${d.toFixed(0)}px;` +
      `--bp-cc:var(--ph-jewel-${jewel}-glow)`;
    wrapEl.appendChild(el);
    setTimeout(()=>el.remove(), 660);
  }

  // Sahne flaşı — DÜNYAYI aydınlatır (atmosfer dâhil), tahtayı değil.
  // Olan şey tahtada değil dünyada oluyor. Süre tavanı 90ms.
  // İki katman: kısa ve neredeyse beyaz ÇEKİRDEK (darbe karesi) + uzun ve
  // sönük mücevher rengi ARTÇI (enerjinin dağılması). Güç çekirdeğin
  // parlaklığından gelir, süresinden değil — bu yüzden çekirdek 90ms'de
  // kalırken artçı 300ms yaşayabiliyor ve göz yorulmuyor.
  function sceneFlash(jewel, intensity) {
    if (!container) return;
    const core = document.createElement('div');
    core.className = 'bp-scene-flash';
    core.style.cssText =
      `background:radial-gradient(ellipse 72% 52% at 50% 52%, rgba(255,255,255,.95) 0%, ` +
        `var(--ph-jewel-${jewel}-highlight) 30%, var(--ph-jewel-${jewel}-glow) 55%, transparent 80%);` +
      `--bp-ffi:${Math.min(intensity, .92).toFixed(2)};--bp-ffd:90ms`;
    container.appendChild(core);
    setTimeout(()=>core.remove(), 150);

    const after = document.createElement('div');
    after.className = 'bp-scene-flash after';
    after.style.cssText =
      `background:radial-gradient(ellipse 95% 70% at 50% 55%, var(--ph-jewel-${jewel}-glow) 0%, transparent 76%);` +
      `--bp-ffi:${Math.min(intensity*0.55, .5).toFixed(2)};--bp-ffd:300ms`;
    container.appendChild(after);
    setTimeout(()=>after.remove(), 360);
  }

  // Kamera nefesi — combo 3+. SARSINTI DEĞİL.
  function cameraBreath() {
    if (!container) return;
    container.classList.remove('bp-breath');
    void container.offsetWidth;
    container.classList.add('bp-breath');
    setTimeout(()=>container.classList.remove('bp-breath'), 470);
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
      // Tahtanın gerçek merkezi, wrapEl uzayında (bkz. cellCenter).
      const mid = (G - 1) / 2 | 0;
      const p = cellCenter(mid, mid);
      if (p) sparkTrail(p.x, p.y, '#c084fc', level*4);
    }
  }

  // ───────── CSS ─────────
  function injectCSS() {
    injectStyle('css-bp', `
      /* Sahne: ortak gece göğü (.ph-scene) #game-container'a init'te
         ekleniyor, cleanup'ta kaldırılıyor — diğer oyunların tema
         varsayımına dokunmadan. */
      .bp-wrap{position:relative;z-index:1;width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center;gap:var(--ph-space-3);margin:0 auto;padding:var(--ph-space-3) var(--ph-space-2);will-change:transform}

      /* ── HUD: Water Sort'la AYNI cam kapsül dili (.ph-capsule) ──
         Skor ortada birincil kapsülde, en yüksek skor sağda ikincil ve
         daha sönük. Uygulama başlığındaki skor gizleniyor (bkz. init) —
         aynı sayıyı iki yerde göstermek HUD'u kabuk gibi gösteriyordu. */
      .bp-bar{position:relative;display:flex;justify-content:center;align-items:center;width:100%;padding:0 4px;min-height:40px}
      .bp-score.bump{animation:bpScoreBump .28s var(--ph-ease-spring)}
      .bp-bar .bp-hi{position:absolute;right:4px;top:50%;transform:translateY(-50%);
        font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;
        color:rgba(200,190,255,.55);text-align:right}
      .bp-bar .bp-hi b{display:block;font-size:14px;font-variant-numeric:var(--ph-variant-numeral);color:rgba(225,215,255,.85);margin-top:3px}
      /* Combo göstergesi solda — combo yokken yer kaplar ama görünmez,
         böylece belirdiğinde HUD zıplamaz. */
      .bp-bar .bp-combo{position:absolute;left:4px;top:50%;transform:translateY(-50%);
        font:800 13px/1 system-ui,sans-serif;color:var(--ph-jewel-1-highlight);
        text-shadow:0 0 12px var(--ph-jewel-1-glow);opacity:0;transition:opacity var(--ph-duration-fast)}
      .bp-bar .bp-combo.on{opacity:1;animation:bpComboPulse .6s ease}

      /* ── Tahta: ortak cam kaidenin (.ph-dais) üstünde ── */
      .bp-dais{padding:var(--ph-space-3);width:100%}
      /* position/z-index şart: .bp-charge konumlandırılmış (z-index:0) ve
         konumlandırılmış elemanlar, konumlandırılmamış kardeşlerinin ÜSTÜNE
         boyanır — tahta aksi hâlde şarj parıltısının altında kalırdı. */
      .bp-board{position:relative;z-index:1;display:grid;grid-template-columns:repeat(${G},1fr);gap:3px;width:100%}
      /* Boş hücre: düz kare değil, içe gömük karanlık yuva. Kristalin
         oturacağı SOKET — dolu hücreyle arasındaki derinlik farkı,
         tahtanın "yüzey" gibi okunmasını sağlayan şey. */
      .bp-c{aspect-ratio:1;border-radius:5px;position:relative;
        background:rgba(8,10,30,.5);
        box-shadow:inset 0 1px 3px rgba(0,0,0,.55),inset 0 -1px 0 rgba(180,165,255,.07);
        transition:box-shadow var(--ph-duration-fast) var(--ph-ease-standard)}
      /* ── KRİSTAL ──
         Water Sort'un sıvısı akar ve çalkalanır; buranın maddesi KATI.
         Aynı evren, farklı hâl. Üç katman:
           1) taban: mücevher gradyanı (highlight→base→shadow)
           2) faset: sol-üstten gelen ışığın yakaladığı kırılma yüzeyi —
              ışık yönü Water Sort'un kaidesiyle AYNI olmak zorunda,
              yoksa "aynı evren" hissi dağılır
           3) parıltı: tahtaya sızan renk (sıvının --wsrt-pool'unun karşılığı)
         Renkler artık oyunun kendi paletinden değil ortak jewel
         token'larından geliyor. */
      /* ── KRİSTAL MALZEMESİ (.bp-crystal) ──
         Tahta hücresi, tepsi hücresi ve hayalet AYNI reçeteyi kullanır —
         tek yerden değişsin diye ayrı sınıf. .bp-c.filled artık yalnızca
         DURUM işareti (JS sorguları onu kullanıyor), malzeme burada.

         Neden önceki hâl plastik gibi görünüyordu: tek bir yumuşak 135°
         ışık yıkaması + ortası en parlak yüzey. Bu, opak/pürüzsüz bir
         cismin davranışı. Değerli taş TERSİ çalışır:
           • merkez KOYU (taşın içine bakıyorsun), kenarlar parlak
           • ışık yumuşak yayılmaz, AYRIK fasetlerde kırılır
           • kenarda keskin bir kırılma çizgisi vardır
           • fasetlerin buluştuğu yerde küçük ve çok parlak bir hotspot olur
         Dört katman bunu kuruyor (hepsi statik, kare başına boyama yok): */
      .bp-crystal{
        background:
          /* 1) HOTSPOT — fasetlerin buluştuğu nokta. Küçük ve neredeyse
                beyaz olması şart: geniş/soluk olursa yine "parlak plastik". */
          radial-gradient(circle at 27% 21%, rgba(255,255,255,.98) 0%, rgba(255,255,255,.45) 20%, transparent 44%),
          /* 2) FASET KESİMİ — SERT duraklı konik gradyan. Yumuşak geçişli
                bir konik denendi ve yetmedi: sonuç hâlâ "parlak şeker"di,
                çünkü kesilmiş bir taşın asıl işareti düzlemlerin PARLAKLIK
                farkı değil, birleştikleri yerdeki KESKİN ÇİZGİdir. Aynı
                açıda iki durak vermek (90deg→90deg) o çizgiyi üretir:
                merkezden dışa doğru dört eğik düzlem, tıpkı pah kırılmış
                bir taş gibi. Işık sol-üstten geldiği için üst-sol düzlem
                en parlak, alt-sağ en koyu. */
          conic-gradient(from 45deg at 50% 48%,
            rgba(255,255,255,.20) 0deg,  rgba(255,255,255,.20) 90deg,
            rgba(0,0,0,.13) 90deg,       rgba(0,0,0,.13) 180deg,
            rgba(0,0,0,.24) 180deg,      rgba(0,0,0,.24) 270deg,
            rgba(255,255,255,.09) 270deg,rgba(255,255,255,.09) 360deg),
          /* 3) ÇEKİRDEK DERİNLİĞİ — merkezi karartır. Hacim hissinin asıl
                kaynağı: göz, kenarlardan koyu olan bir yüzeyi "içi olan"
                bir cisim olarak okur. */
          radial-gradient(ellipse 78% 72% at 50% 58%, rgba(0,0,0,.26) 0%, transparent 70%),
          /* 4) taban mücevher rengi */
          linear-gradient(165deg, var(--bp-hl) 0%, var(--bp-base) 52%, var(--bp-sh) 100%);
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.40),      /* keskin kenar kırılması */
          inset 0 1px 0 rgba(255,255,255,.9),         /* üst kenar yakalama ışığı */
          inset 0 -2px 5px -1px rgba(0,0,0,.55),      /* alt hacim gölgesi */
          0 0 9px -1px var(--bp-glow),                /* çevreye sızan enerji */
          0 3px 14px -4px var(--bp-glow);
      }
      /* Keskin parlama çizgisi: ışığın bir kenarda kırıldığı an. Geniş bir
         parlama yerine DAR ve yüksek kontrastlı olması, yüzeyi cilalı
         plastikten ayıran detay. */
      .bp-crystal::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
        background:linear-gradient(128deg, transparent 33%, rgba(255,255,255,.62) 37.5%, rgba(255,255,255,.14) 41%, transparent 45%)}
      .bp-c.pv-ok{background:rgba(34,197,94,.28)!important;box-shadow:inset 0 0 0 2px rgba(74,222,128,.7),0 0 14px rgba(34,197,94,.35)}
      .bp-c.pv-no{background:rgba(239,68,68,.16)!important;box-shadow:inset 0 0 0 2px rgba(248,113,113,.45)}
      .bp-c.flash{animation:bpFlash .18s ease}
      .bp-c.energy{animation:bpEnergy .24s ease forwards}
      /* ── OTURMA (ağırlık) ──
         Eski hâl scale(0)'dan büyüyüp hafif dönüyordu: kristal "belirdi",
         "düşmedi". Ağırlık hissi EZİLMEden gelir — Water Sort'ta sıvının
         camdan geride kalıp savrulmasının karşılığı, burada katı maddenin
         çarpma anında bir an sıkışması. Sıra önemli: yukarıdan gel (−9px,
         büyük) → çarpınca EZİL (.93) → geri yaylan (1.04) → otur. */
      .bp-c.place-in{animation:bpPlaceIn .28s cubic-bezier(.3,.9,.3,1)}

      /* ── RÜN DARBESİ ──
         Kristal oturunca kaide enerjiyi İLETİR: dalga ızgarayı takip ederek
         temas noktasından dışa yayılır. Jenerik bir daire değil, hücre hücre
         — levhanın kendisi tepki veriyor, sadece konan taş değil. BOŞ
         soketler de parlar; asıl fikir bu.
         ::before kullanılıyor çünkü ::after kristal parlamasına ait. */
      .bp-c::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;
        background:radial-gradient(circle at 50% 50%, var(--bp-rune-c, transparent) 0%, transparent 72%);
        opacity:0}
      .bp-c.rune::before{animation:bpRune .2s ease-out}
      @keyframes bpRune{0%{opacity:0}28%{opacity:var(--bp-rune-i,.55)}100%{opacity:0}}

      /* ── TEMAS KIVILCIMI ──
         Yeni kristalin mevcut kristallere DEĞDİĞİ kenarlarda doğar ve o
         kenardan dışa fırlar. Sıkı yerleştirmeyi ödüllendirir — yani oyunun
         asıl becerisini. Boşluğa konan taş kıvılcım üretmez. */
      .bp-spark{position:absolute;border-radius:50%;pointer-events:none;z-index:210;
        animation:bpSparkFly var(--bp-spark-dur,300ms) cubic-bezier(.15,.7,.3,1) forwards}
      @keyframes bpSparkFly{
        0%{transform:translate(-50%,-50%) scale(1);opacity:1}
        100%{transform:translate(calc(-50% + var(--bp-sx)), calc(-50% + var(--bp-sy))) scale(.2);opacity:0}}

      /* ── KAİDEYE ENERJİ BOŞALMASI ──
         Taş enerjisini levhaya bırakır: temas noktasından büyüyüp sönen
         renkli bir yayılım. Rün darbesi ızgarayı aydınlatır, bu ise
         yüzeyin altına sızan ışıktır — ikisi farklı katman. */
      .bp-discharge{position:absolute;border-radius:50%;pointer-events:none;z-index:0;
        transform:translate(-50%,-50%) scale(.28);
        animation:bpDischarge .42s cubic-bezier(.2,.75,.3,1) forwards}
      @keyframes bpDischarge{
        0%{transform:translate(-50%,-50%) scale(.28);opacity:.6}
        100%{transform:translate(-50%,-50%) scale(1.9);opacity:0}}

      /* ── ŞARJ (gerilim, bilgi DEĞİL) ──
         Tahta dolmaya yaklaşınca kaidenin dibinde çok hafif bir enerji
         birikir. Hangi satırın dolmak üzere olduğunu SÖYLEMEZ — konumsuz,
         bütün levhaya yayılı. Amaç oyuncuya ipucu vermek değil, "bir şey
         birikiyor" gerilimini kurmak. Opaklık JS'ten (--bp-charge), nefes
         ise transform'dan gelir: ikisi ayrı özellik olduğu için çakışmaz. */
      .bp-charge{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
        background:radial-gradient(ellipse 92% 55% at 50% 100%, var(--ph-jewel-1-glow) 0%, transparent 72%);
        opacity:var(--bp-charge,0);transition:opacity .6s var(--ph-ease-standard)}
      .bp-charge.breathe{animation:bpChargeBreathe 2.2s ease-in-out infinite}
      @keyframes bpChargeBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}

      /* ══════════ FAZ 2B — KIRILMA ══════════
         Üç vuruş, toplam ~460ms. Süre UZAMIYOR (senin kararın); güç
         katman sayısından geliyor. Vuruşlar:
           1) 0-70ms   ŞARJ    — kristal beyaza yaklaşır, hafif büyür
           2) 70-190ms PATLAMA — flaş, kıymık, süpürme, renk taşması
           3) 190-460  KALINTI — kıymıklar düşer, yıldız tozu süzülür
         Amatör efektlerde yalnızca 2. vuruş olur; "ucuz" hissettiren
         tam olarak eksik 1. ve 3. vuruştur. */

      /* 1. vuruş — ŞARJ: patlamadan önceki gerilim. Beklenti olmadan
         patlama sadece gürültüdür. */
      /* .06s şarj + forwards ile 40ms TUTUŞ: kristal zirvede bekler, sonra
         patlar. Animasyon süresi ile patlama gecikmesi (100ms) arasındaki
         fark o duraklamadır. */
      .bp-c.charging{animation:bpCharging .06s ease-out forwards}
      @keyframes bpCharging{
        0%{filter:brightness(1);transform:scale(1)}
        100%{filter:brightness(2.6) saturate(.5);transform:scale(1.09)}}

      /* KRİSTAL KIYMIĞI — nokta değil, kırılmış taş parçası. Açılı
         clip-path + dönerek savrulma + hafif yerçekimi. Kıymığın nokta
         yerine ŞEKİLLİ olması, "kristal kırıldı" ile "parçacık çıktı"
         arasındaki fark. */
      .bp-shard{position:absolute;pointer-events:none;z-index:206;
        clip-path:polygon(50% 0%, 100% 58%, 66% 100%, 8% 74%);
        animation:bpShard var(--bp-shd,520ms) cubic-bezier(.1,.65,.3,1) forwards}
      /* İRİ PARÇA — kırılmanın "gövdesi". Tek boyutlu kıymık dağılımı
         patlamayı toz bulutu gibi gösteriyordu; gerçek kırılma birkaç İRİ
         parça + çok sayıda kırıntı üretir. İri parça kristalin fasetini
         taşır (kenar ışığı + parlama), yani gözle takip edilebilen gerçek
         bir taş parçasıdır — kırıntı ise sadece renk. */
      .bp-shard.big{z-index:208;border-radius:2px;
        clip-path:polygon(46% 0%, 100% 42%, 78% 100%, 16% 86%, 0% 34%);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.85), 0 0 12px -2px var(--bp-shg)}
      .bp-shard.big::after{content:'';position:absolute;inset:0;
        background:linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.1) 40%, transparent 60%)}
      @keyframes bpShard{
        0%{transform:translate(-50%,-50%) rotate(0deg) scale(1);opacity:1}
        62%{opacity:.95}
        100%{transform:translate(calc(-50% + var(--bp-shx)), calc(-50% + var(--bp-shy))) rotate(var(--bp-shr)) scale(.3);opacity:0}}

      /* EKSEN SÜPÜRMESİ — temizlenen satırın/sütunun boyunca koşan ışık.
         Enerjinin nereden boşaldığını gösterir: patlama rastgele değil,
         ÇİZGİ boyunca. */
      .bp-sweep{position:absolute;pointer-events:none;z-index:205;border-radius:3px;
        animation:bpSweep .3s cubic-bezier(.2,.8,.3,1) forwards}
      @keyframes bpSweep{
        0%{transform:translate(-50%,-50%) scaleX(.05) scaleY(1);opacity:0}
        22%{opacity:1}
        100%{transform:translate(-50%,-50%) scaleX(1) scaleY(.25);opacity:0}}
      .bp-sweep.vert{animation-name:bpSweepV}
      @keyframes bpSweepV{
        0%{transform:translate(-50%,-50%) scaleY(.05) scaleX(1);opacity:0}
        22%{opacity:1}
        100%{transform:translate(-50%,-50%) scaleY(1) scaleX(.25);opacity:0}}

      /* RÜN GLİFİ — combo 2+. Nokta parçacığı değil, YAZI: levhadan
         serbest kalan büyü. Yukarı süzülüp söner. */
      .bp-glyph{position:absolute;pointer-events:none;z-index:207;
        font:700 var(--bp-gs,13px)/1 'Fraunces',serif;
        text-shadow:0 0 10px currentColor,0 0 22px currentColor;
        animation:bpGlyph var(--bp-gd,620ms) cubic-bezier(.15,.7,.3,1) forwards}
      @keyframes bpGlyph{
        0%{transform:translate(-50%,-50%) scale(.4) rotate(var(--bp-gr0));opacity:0}
        18%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(0deg)}
        100%{transform:translate(calc(-50% + var(--bp-gx)), calc(-50% - 46px)) scale(.85) rotate(var(--bp-gr1));opacity:0}}

      /* YILDIZ TOZU — 3. vuruş. Patlamadan sonra havada kalan ince
         parıltı; "olay bitti ama izi duruyor" hissi. Yavaş ve sönük. */
      .bp-dust{position:absolute;border-radius:50%;pointer-events:none;z-index:203;
        animation:bpDust var(--bp-dd,900ms) ease-out forwards}
      @keyframes bpDust{
        0%{transform:translate(-50%,-50%) scale(1);opacity:0}
        20%{opacity:.85}
        100%{transform:translate(calc(-50% + var(--bp-dx)), calc(-50% + var(--bp-dy))) scale(.4);opacity:0}}

      /* RÜN ÇEMBERİ — combo 4+. Kaideye kısa süreliğine kazınan çember.
         Büyük combo'nun "tören" hissi; her temizlemede çıkmaz, o yüzden
         çıktığında olay olur. */
      .bp-circle{position:absolute;pointer-events:none;z-index:202;border-radius:50%;
        border:2px solid var(--bp-cc,rgba(200,180,255,.9));
        box-shadow:0 0 24px var(--bp-cc),inset 0 0 24px var(--bp-cc);
        animation:bpCircle .58s cubic-bezier(.15,.75,.3,1) forwards}
      @keyframes bpCircle{
        0%{transform:translate(-50%,-50%) scale(.25) rotate(0deg);opacity:0}
        25%{opacity:.95}
        100%{transform:translate(-50%,-50%) scale(1.35) rotate(42deg);opacity:0}}

      /* ── IŞIK BOŞALMASI — İKİ KATMAN ──
         Tek katmanlı flaş yetmiyordu: zirve etkin alfa ~0.25'te kalıyor,
         yani "ışık boşaldı" değil "ekran hafif morardı" oluyordu. Ama
         çözüm flaşı uzatmak DEĞİL — uzun beyaz flaş güçlü değil hatalı
         görünür ve gözü yorar. Çözüm ikiye ayırmak:
           çekirdek — neredeyse beyaz, ÇOK kısa (≤90ms). Darbe karesi budur.
           artçı    — mücevher renginde, sönük, uzun (~300ms). Enerjinin
                      dağılması. Gözü yormaz çünkü asla beyaza çıkmaz.
         Güç çekirdeğin PARLAKLIĞINDAN gelir, süresinden değil. */
      .bp-scene-flash{position:absolute;inset:0;pointer-events:none;z-index:3;
        mix-blend-mode:screen;
        animation:bpSceneFlash var(--bp-ffd,90ms) cubic-bezier(.1,.8,.3,1) forwards}
      /* Ani yükseliş (%8'de zirve) + hızlı düşüş = DARBE. Sabit bir tepeden
         sönmek "flaş" değil "aydınlatma" gibi okunuyor. */
      @keyframes bpSceneFlash{0%{opacity:0}8%{opacity:var(--bp-ffi,.5)}100%{opacity:0}}
      .bp-scene-flash.after{mix-blend-mode:screen;animation-duration:var(--bp-ffd,300ms)}

      /* ── ŞOK DALGASI ──
         Tahtadan çıkıp TÜM SAHNEYİ kat eden halka. Patlamanın tahtayla
         sınırlı kalmadığını söyleyen asıl katman bu — konteynere eklenir,
         wrapEl'e değil, yoksa oyun alanında hapsolurdu.
         Halka bir kenarlık değil radyal gradyan bandı: kenarlık transform
         ile ölçeklenince KALINLAŞIYOR, oysa gerçek şok dalgası yayıldıkça
         incelir. Gradyan bandı ölçekle orantılı kalır. */
      .bp-shock{position:absolute;border-radius:50%;pointer-events:none;z-index:2;
        mix-blend-mode:screen;
        animation:bpShock .46s cubic-bezier(.1,.75,.25,1) forwards}
      @keyframes bpShock{
        0%{transform:translate(-50%,-50%) scale(.08);opacity:0}
        10%{opacity:.95}
        100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}

      /* ── IŞIK SÜTUNU ──
         Temizlenen çizgiden YUKARI kaçan enerji. Patlama yatay yayılırken
         bu dikey kaçış, "serbest kaldı" hissini veren şey: enerjinin
         gidecek bir yeri var. */
      .bp-column{position:absolute;pointer-events:none;z-index:204;
        transform-origin:50% 100%;mix-blend-mode:screen;filter:blur(6px);
        animation:bpColumn .52s cubic-bezier(.15,.8,.3,1) forwards}
      @keyframes bpColumn{
        0%{transform:translateX(-50%) scaleY(.04) scaleX(.7);opacity:0}
        16%{opacity:.9}
        100%{transform:translateX(-50%) scaleY(1) scaleX(1.25);opacity:0}}

      /* KAMERA NEFESİ — combo 3+. Sarsıntı DEĞİL. Sarsıntı "çarpma/hata"
         der, nefes "güç" der. 1.008 gözle seçilmez ama BEDENDE hissedilir;
         abartıldığında anında ucuzlar. */
      #game-container.bp-breath{animation:bpBreath .42s cubic-bezier(.2,.9,.3,1)}
      @keyframes bpBreath{0%{transform:scale(1)}30%{transform:scale(1.008)}100%{transform:scale(1)}}

      @media (prefers-reduced-motion: reduce){
        .bp-shard,.bp-glyph,.bp-dust,.bp-circle,.bp-sweep{display:none}
        #game-container.bp-breath{animation:none}
        .bp-scene-flash{animation-duration:60ms}
        .bp-charge.breathe{animation:none}
      }

      /* ── TEPSİ: SABİT YUVALAR ──
         Asıl UX düzeltmesi burada. Eskiden her parça KENDİ genişliğinde
         bir eleman olduğu ve tepsi justify-content:center ile ortaladığı
         için, bir parça kullanılıp yerine sabit boyutlu boş kutu geçtiğinde
         KALAN PARÇALAR KAYIYORDU (ölçüldü: 11px). Oyuncu "hangisini
         koymadım" derken aslında kaybettiği şey blok değil, mekânsal
         çıpasıydı — bloklar yer değiştiriyordu.
         Artık üç yuva eşit ve sabit (flex:1); parça yuvanın İÇİNDE
         ortalanıyor. Yuvanın kendisi asla hareket etmez. */
      .bp-tray{display:flex;gap:var(--ph-space-2);align-items:stretch;width:100%;padding:var(--ph-space-2)}
      .bp-slot{flex:1 1 0;height:86px;display:flex;align-items:center;justify-content:center;
        border-radius:var(--ph-radius-md);position:relative;
        background:rgba(8,10,30,.34);
        box-shadow:inset 0 1px 3px rgba(0,0,0,.5),inset 0 -1px 0 rgba(180,165,255,.06);
        transition:box-shadow var(--ph-duration-fast) var(--ph-ease-standard)}
      /* Boş soket: harcanmış yuva sönük bir iç parıltıyla kendini belli
         eder — "burada bir şey vardı, kullandın" der. Kaybolan bloğun
         yerinde HİÇBİR ŞEY olmaması, yer değiştirmenin ikinci yarısıydı. */
      .bp-slot.spent{box-shadow:inset 0 1px 3px rgba(0,0,0,.55),inset 0 0 18px -4px var(--ph-jewel-1-glow),inset 0 -1px 0 rgba(180,165,255,.06)}
      .bp-tp{display:grid;gap:2px;cursor:grab;touch-action:none;user-select:none;
        transition:transform var(--ph-duration-fast) var(--ph-ease-spring),opacity var(--ph-duration-fast)}
      .bp-tp:active{cursor:grabbing}
      .bp-tp.grabbed{opacity:.22;transform:scale(.72)}
      /* NOT: .bp-tp.fade-out kuralı bilerek burada DEĞİL, .bp-tp.new-in'den
         SONRA tanımlı (aşağıya bak) — ikisi aynı özgüllükte olduğu için
         sıra belirleyici. */
      .bp-tc{border-radius:4px;width:15px;height:15px;position:relative}
      .bp-ghost{position:fixed;pointer-events:none;z-index:var(--ph-z-floating);display:grid;gap:3px;filter:drop-shadow(0 10px 26px rgba(0,0,0,.55));will-change:left,top;transition:none}
      .bp-ghost .bp-gc{border-radius:5px;position:relative}
      /* Hayalet de aynı kristal — elindeki taş, tahtadakiyle aynı malzeme
         olmalı. Ek olarak daha güçlü dış parıltı: havada, ışığı serbest. */
      .bp-ghost .bp-gc.bp-crystal{box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.45),
        inset 0 1px 0 rgba(255,255,255,.95),
        inset 0 -2px 5px -1px rgba(0,0,0,.55),
        0 0 20px -2px var(--bp-glow),
        0 0 40px -6px var(--bp-glow)}
      @keyframes bpPop{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--ptx),var(--pty)) rotate(var(--rot)) scale(0);opacity:0}}
      @keyframes bpSpark{0%{transform:translate(0,0) scale(1);opacity:1}40%{opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0}}
      @keyframes bpFloat{0%{transform:translateY(0) scale(1);opacity:1}60%{opacity:1}100%{transform:translateY(-65px) scale(1.4);opacity:0}}
      @keyframes bpCombo{0%{transform:translate(-50%,-50%) scale(0) rotate(-5deg);opacity:0}20%{transform:translate(-50%,-50%) scale(1.4) rotate(2deg);opacity:1}50%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(-50%,-50%) scale(.6) rotate(-2deg);opacity:0}}
      @keyframes bpFlash{0%{filter:brightness(1);box-shadow:none}35%{filter:brightness(3);box-shadow:0 0 16px rgba(255,255,255,.4)}70%{filter:brightness(2)}100%{filter:brightness(1);box-shadow:none}}
      @keyframes bpEnergy{0%{transform:scale(1);opacity:1;filter:brightness(1)}30%{transform:scale(1.15);filter:brightness(2.5)}60%{transform:scale(1.1);opacity:.6;filter:brightness(2)}100%{transform:scale(0);opacity:0;filter:brightness(3)}}
      @keyframes bpPlaceIn{
        0%{transform:translateY(-9px) scale(1.14);opacity:.5}
        45%{transform:translateY(0) scale(.93);opacity:1}
        72%{transform:translateY(0) scale(1.04)}
        100%{transform:translateY(0) scale(1)}}
      /* TUTULAN hâlden (.grabbed: scale .72 / opacity .22) devam eder.
         scale(1)/opacity(1)'den başlamak, parçanın sönmeden önce bir an
         tam görünür hâle sıçraması demekti. */
      @keyframes bpFadeOut{0%{transform:scale(.72);opacity:.22}100%{transform:scale(.28);opacity:0}}
      @keyframes bpNewPiece{0%{transform:scale(0) translateY(20px);opacity:0;filter:brightness(2)}60%{transform:scale(1.1) translateY(-3px);filter:brightness(1.3)}100%{transform:scale(1) translateY(0);opacity:1;filter:brightness(1)}}
      .bp-tp.new-in{animation:bpNewPiece .45s cubic-bezier(.34,1.56,.64,1) backwards}
      /* Kaybolma kuralı giriş kuralından SONRA gelmek ZORUNDA: ikisi aynı
         özgüllükte (.bp-tp.X) ve kademede sonra gelen kazanır. Ters sırada
         olduğu için bpFadeOut hiç oynamıyordu ve kullanılan blok tepside
         kalıyordu. JS ayrıca new-in'i kaldırıyor (fadeOutTrayPiece) —
         ikisi birlikte, hatanın sessizce geri gelmesini engelliyor.
         Kaybolma TUTULAN hâlden devam eder (bkz. bpFadeOut keyframe'i). */
      .bp-tp.fade-out{animation:bpFadeOut .22s var(--ph-ease-standard) forwards}
      @keyframes bpScreenFlash{0%{opacity:1}100%{opacity:0}}
      @keyframes bpWave{0%{width:0;height:0;opacity:1}100%{width:280px;height:280px;opacity:0}}
      @keyframes bpScoreBump{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
      @keyframes bpComboPulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
      /* .bp-tray.glow-in / bpGlow kaldırıldı: tepsinin tamamını yakan bir
         parıltıydı, artık yenilenme her YUVANIN kendi girişiyle
         anlatılıyor (bpNewPiece) — ve box-shadow canlandırdığı için her
         karede yeniden boyama demekti. */
    `);
  }

  // ───────── PARÇA ─────────
  function rndPiece() {
    const i = Math.floor(Math.random()*SHAPES.length);
    return {shape:SHAPES[i], jewel: 1 + Math.floor(Math.random()*JEWELS)};
  }
  // Tepsi yuvaları artık parçanın KENDİSİ değil; parça yuvanın içinde
  // ortalanmış bir çocuk. Parçaya erişen her yer yuvadan geçmek zorunda.
  function trayPieceEl(idx) {
    const slot = trayEl.children[idx];
    return slot ? slot.querySelector('.bp-tp') : null;
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
      const j = board[y][x];
      // 'filled' durum işareti, 'bp-crystal' malzeme — ikisi ayrı tutuluyor
      // ki malzeme tek yerden değişebilsin (tepsi/hayalet de aynı sınıfı
      // kullanıyor).
      d.className = 'bp-c' + (j ? ' filled bp-crystal' : '');
      d.dataset.y = y; d.dataset.x = x;
      // Kristalin görünüşü CSS'te tanımlı; buradan yalnızca HANGİ ortak
      // renk olduğu geçiyor. Eskiden gradyan/gölge her hücrede satır içi
      // yeniden kuruluyordu — malzemeyi değiştirmek 3 ayrı yeri düzenlemek
      // demekti.
      if (j) d.style.cssText = jewelVars(j);
      boardEl.appendChild(d);
    }
  }

  // Üç yuva HER ZAMAN çizilir ve HER ZAMAN aynı yerdedir (flex:1). Parça
  // varsa yuvanın içinde ortalanır, yoksa yuva boş soket olarak kalır.
  // Kritik nokta: yuva sayısı ve genişliği parçalardan BAĞIMSIZ — tepsinin
  // düzeni tepside ne olduğuna göre hiç değişmiyor.
  function renderTray(animate) {
    trayEl.innerHTML = '';
    pieces.forEach((p,i) => {
      const slot = document.createElement('div');
      slot.className = 'bp-slot' + (p ? '' : ' spent');
      slot.dataset.idx = i;
      if (p) {
        const tp = document.createElement('div');
        tp.className = 'bp-tp' + (animate ? ' new-in' : '');
        if (animate) tp.style.animationDelay = (i*70)+'ms';
        tp.style.gridTemplateColumns = `repeat(${p.shape[0].length},1fr)`;
        p.shape.forEach(r => r.forEach(v => {
          const c = document.createElement('div');
          c.className = 'bp-tc' + (v ? ' on bp-crystal' : '');
          if (v) c.style.cssText = jewelVars(p.jewel);
          tp.appendChild(c);
        }));
        const onStart = (e) => { e.preventDefault(); grabPiece(i, e); };
        addEv(tp, 'touchstart', onStart, {passive:false});
        addEv(tp, 'mousedown', onStart);
        slot.appendChild(tp);
      }
      trayEl.appendChild(slot);
    });
  }

  function renderScoreBar(bump) {
    // Skorun değiştiği HER yol buradan geçiyor (yerleştirme puanı da dâhil,
    // sadece satır temizleme değil) — rekoru tek noktada yakalamanın yeri.
    bumpHighScore();
    const sb = wrapEl.querySelector('.bp-bar');
    const cap = sb.querySelector('.bp-score');
    cap.querySelector('.ph-capsule-num').textContent = score.toLocaleString();
    if (bump) { cap.classList.remove('bump'); void cap.offsetWidth; cap.classList.add('bump'); }
    sb.querySelector('.bp-hi b').textContent = highScore.toLocaleString();
    const cb = sb.querySelector('.bp-combo');
    if (combo > 1) { cb.textContent = 'SERİ x'+combo; cb.classList.remove('on'); void cb.offsetWidth; cb.classList.add('on'); }
    else cb.classList.remove('on');
    // updateGameScore ÇAĞRILMIYOR: skor artık oyunun kendi cam kapsülünde
    // yaşıyor ve uygulama başlığındaki sayaç init'te gizleniyor. İkisini
    // birden beslemek aynı sayıyı ekranda iki kez gösteriyordu.
  }

  // ───────── TRAY PARÇA KAYBOLMA ─────────
  // Parça yok olur, YUVA kalır. Eskiden burada önce .grabbed kaldırılıyordu
  // (opacity .22 → 1), yani parça sönmeye başlamadan önce bir kare boyunca
  // TAM GÖRÜNÜR hâle sıçrıyordu — "geri geldi" gibi okunuyordu. Artık
  // .grabbed duruyor ve bpFadeOut tutulan hâlden devam ediyor.
  function fadeOutTrayPiece(idx) {
    const slot = trayEl.children[idx];
    if (!slot) return;
    const tp = slot.querySelector('.bp-tp');
    if (!tp) { slot.classList.add('spent'); return; }
    // 1) Giriş sınıfını KALDIR. Bu satır olmazsa parça hiç kaybolmuyor:
    //    .bp-tp.new-in ile .bp-tp.fade-out aynı özgüllükte ve new-in stil
    //    sayfasında sonra geldiği için animation'ı o kazanıyordu (ölçüldü:
    //    ikisi birlikteyken animationName = bpNewPiece). bpFadeOut hiç
    //    oynamıyor, dolayısıyla animationend hiç doğmuyor, dolayısıyla
    //    aşağıdaki temizlik hiç çalışmıyordu — kullanılan blok tepside
    //    kalıyordu. "Hangisini koymadım" karışıklığının asıl kaynağı buydu.
    tp.classList.remove('new-in');
    tp.classList.add('fade-out');
    // 2) Silme İKİ yoldan da tetiklenir. Yalnızca animationend'e güvenmek
    //    kırılgan: animasyon iptal edilirse, prefers-reduced-motion kapatırsa
    //    ya da sekme arka plandayken (animasyonlar donar) olay hiç gelmez ve
    //    blok kalıcı olarak takılı kalır. Tepsinin doğru görünmesi bir
    //    animasyonun oynamasına bağlı olamaz.
    const finish = () => { if (tp.parentNode) tp.remove(); slot.classList.add('spent'); };
    tp.addEventListener('animationend', finish, {once:true});
    setTimeout(finish, 300);
  }

  // ───────── SÜRÜKLE-BIRAK ─────────
  function grabPiece(idx, e) {
    if (locked || drag) return;
    const p = pieces[idx];
    if (!p) return;

    snd('crystalPickup');
    haptic(15);

    const touch = e.touches ? e.touches[0] : e;
    const trayPiece = trayPieceEl(idx);
    if (trayPiece) trayPiece.classList.add('grabbed');

    // Hücre boyutu ve ızgara başlangıcı VARSAYILMAZ, ÖLÇÜLÜR. Eskiden
    // `(bRect.width - 3*(G-1) - 10) / G` yazıyordu; buradaki 10, tahtanın o
    // zamanki 5px'lik iç boşluğuydu. İç boşluk kaideye taşınınca bu sabit
    // sessizce yanlışa düştü: hayaletin hücre boyutu küçüldü ve bırakma
    // hedefi kaydı, yani hiçbir yerleştirme geçerli sayılmıyordu.
    // İlk hücrenin gerçek dikdörtgeni hem boyutu hem ızgara orijinini verir
    // ve düzen değişikliklerinden etkilenmez.
    const bRect = boardEl.getBoundingClientRect();
    const c0 = boardEl.children[0].getBoundingClientRect();
    const cs = c0.width;
    const originX = c0.left, originY = c0.top;
    const cols = p.shape[0].length, rows = p.shape.length;
    const ghost = document.createElement('div');
    ghost.className = 'bp-ghost';
    ghost.style.gridTemplateColumns = `repeat(${cols},${cs}px)`;
    ghost.style.gap = '3px';
    p.shape.flat().forEach(v => {
      const gc = document.createElement('div');
      gc.className = 'bp-gc' + (v ? ' on bp-crystal' : '');
      gc.style.cssText = `width:${cs}px;height:${cs}px;` + (v ? jewelVars(p.jewel) : 'opacity:0;');
      ghost.appendChild(gc);
    });
    document.body.appendChild(ghost);

    const ghostW = cols*cs + (cols-1)*3;
    const ghostH = rows*cs + (rows-1)*3;

    drag = { idx, piece:p, ghost, bRect, cs, originX, originY, ghostW, ghostH, row:-1, col:-1, valid:false };
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
    const {piece, cs} = drag;
    const gx = cx - drag.ghostW/2;
    const gy = cy - drag.ghostH - 40;
    // Izgara orijini grabPiece'te ilk hücreden ölçüldü (bkz. oradaki not).
    const col = Math.round((gx - drag.originX) / (cs+3));
    const row = Math.round((gy - drag.originY) / (cs+3));
    const wasValid = drag.valid;
    drag.row = row; drag.col = col;
    drag.valid = canPlace(piece.shape, row, col);

    // Geçerli bölgeye GİRİŞ anı — çıkışta veya içinde gezinirken değil.
    // Her mousemove'da çalsaydı saniyede onlarca kez tetiklenirdi; ailenin
    // en kısık sesi olmasının sebebi de bu (bkz. crystalHover).
    if (drag.valid && !wasValid) { snd('crystalHover'); haptic(8); }

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
      const trayPiece = trayPieceEl(idx);
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
        board[row+dy][col+dx] = piece.jewel;
        placedCells.push({y:row+dy,x:col+dx});
      }
    }));

    snd('crystalPlace');
    // Titreşim burada DEĞİL, aşağıda temas sayısına göre veriliyor —
    // sabit 25ms her yerleştirmeyi aynı hissettiriyordu.
    pieces[idx] = null;

    // Tray parça kaybolma animasyonu
    fadeOutTrayPiece(idx);

    // Yerleştirme puanı
    score += 10;

    // Temas kenarları, DOM yeniden çizilmeden önce hesaplanmalı: board
    // dizisi zaten güncel, ama fonksiyon yalnızca durum okuyor.
    const edges = contactEdges(placedCells);

    // Board güncelle ve animasyon
    renderBoard();
    // Gecikme 30→12ms: taş TEK BİR NESNE olarak düşmeli. 4 hücrelik bir
    // parçada 30ms'lik kademe, hücreleri ayrı ayrı beliren şeyler gibi
    // gösteriyordu — ağırlık hissinin tersi.
    placedCells.forEach(({y,x},i) => {
      const cell = boardEl.children[y*G+x];
      if (cell) { cell.style.animationDelay = (i*12)+'ms'; cell.classList.add('place-in'); }
    });
    renderScoreBar(true);

    // ── Yerleştirme enerjisi (Faz 2A) ──
    // Sıra kasıtlı: önce yüzeyin altındaki yayılım (en yavaş, en arkada),
    // sonra ızgara iletimi, en son temas kıvılcımları (en hızlı, en önde).
    // Göz böylece derinlikten yüzeye doğru okuyor.
    daisDischarge(placedCells, piece.jewel);
    runePulse(placedCells, piece.jewel);
    contactSparks(edges, piece.jewel);
    updateCharge();

    // Temas sesi — görsel kıvılcımların sesli karşılığı. Oturma sesinin
    // hemen ARDINDAN (35ms) çalıyor: önce taş oturur, sonra komşusuna
    // değer. Aynı anda çalsalardı tek bir bulanık vuruş olurlardı.
    // Boşluğa konan taş sessiz kalır — kıvılcım gibi, bu da sıkı
    // yerleştirmenin ödülü.
    if (edges.length) setTimeout(() => snd('crystalTouch', {count: edges.length}), 35);

    // Mini sarsıntı — temas ne kadar sıkıysa o kadar tok. Boşluğa konan taş
    // neredeyse hiç sarsmaz; oyuncu iyi yerleştirmeyi PARMAĞINDA hisseder.
    screenShake(1.5 + Math.min(edges.length, 6) * 0.45, 110);
    haptic(edges.length ? 18 + Math.min(edges.length,5)*4 : 12);

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
          // Skor da tahtanın gerçek ortasında doğsun (wrapEl uzayı).
          const mid = (G - 1) / 2 | 0;
          const cp = cellCenter(mid, mid);
          floatText('+'+totalAdd, (cp?cp.x:0)-20, (cp?cp.y:0)-10, '#fbbf24', combo>1);

          if (combo > 1) {
            showCombo(combo);
            haptic([30,20,40,20,50]); // pattern vibration
          } else {
            haptic(30);
          }

          bumpHighScore();
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
    }, 90);
  }

  // Rekor KIRILDIĞI ANDA diske yazılır, oyundan çıkarken değil.
  // Eskiden yalnızca cleanup()'ta kaydediliyordu; oyun bittikten sonra
  // uygulamayı kapatan oyuncu rekorunu kaybediyordu (ölçüldü: 1070 puanlık
  // bir oturumdan sonra bp_hi hâlâ null'dı). localStorage yazımı ucuz ve
  // yalnızca rekor geçildiğinde oluyor — yani seyrek.
  function bumpHighScore() {
    if (score <= highScore) return;
    highScore = score;
    try { localStorage.setItem('bp_hi', String(highScore)); } catch (e) {}
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
            snd('crystalOver');
            haptic([100,50,100]);
            setTimeout(()=>showGameOver(false,'Oyun Bitti 💥','Skor: '+score.toLocaleString()+'\nEn Yüksek: '+highScore.toLocaleString()),300);
          }
        }, 500);
      }, 200);
    } else {
      if (!anyPieceFits()) {
        snd('crystalOver');
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

    const idxs = [...cells];
    const intensity = Math.min(lines.length * 2 + combo, 12);
    // Baskın renk: temizlenen hücrelerde en çok geçen mücevher. Patlamanın
    // "bir rengi" olması, karışık renkli bir bulamaçtan çok daha okunaklı.
    const tally = {};
    idxs.forEach(i => { const j = board[Math.floor(i/G)][i%G]; if (j) tally[j] = (tally[j]||0)+1; });
    const jewel = +Object.keys(tally).sort((a,b)=>tally[b]-tally[a])[0] || 1;
    const jewelOf = i => board[Math.floor(i/G)][i%G];

    // ══ ZAMANLAMA — ÜÇ VURUŞ, ~460ms ══
    // Süre UZATILMADI (senin kararın: güç süreden değil yoğunluktan).
    // Eski dizi 980ms'ti; 420ms'ye indirilmişti; şimdi aynı bütçede çok
    // daha fazla KATMAN var:
    //   0-70    ŞARJ    — kristal beyaza yaklaşır, büyür (beklenti)
    //   70-190  PATLAMA — flaş, kıymık, süpürme, glif, çember, nefes
    //   190-460 KALINTI — kıymıklar düşer, yıldız tozu süzülür
    // Amatör efektlerde yalnızca orta vuruş vardır; "ucuz" hissi eksik
    // 1. ve 3. vuruştan gelir.

    // ── 1. VURUŞ: ŞARJ + TUTUŞ ──
    // Şarj 60ms sürer, sonra 40ms HİÇBİR ŞEY OLMAZ. O boşluk boşa değil:
    // darbeyi oturtan şey tam olarak patlamadan hemen önceki durgunluktur.
    // Kesintisiz akan bir dizide göz vuruşu yakalayamıyor.
    haptic(14);
    idxs.forEach(i => { const el=boardEl.children[i]; if(el) el.classList.add('charging'); });

    setTimeout(() => {
      // ── 2. VURUŞ: PATLAMA ──
      // Sıra kasıtlı — en geniş katman önce, en ince en son. Göz dünyadan
      // detaya doğru okuyor: dünya → sahne → çizgi → kıymık → yazı.
      const power = 0.42 + Math.min(combo,4)*0.10 + (lines.length-1)*0.08;

      // ── SES, GÖRSEL DARBEYLE AYNI KAREDE ──
      // Eskiden temizleme sesi geri çağrımda çalıyordu, yani patlamadan
      // 240ms SONRA — göz patlamayı görüp kulak sesi sonra duyuyordu ve
      // ikisi ayrı olay gibi okunuyordu. Ses ile ışığın aynı anda olması,
      // "tatmin edici" hissinin yarısı.
      snd('crystalShatter', {lines: lines.length});
      // Büyük an: alt ucu dolduran ayrı bir ses. Kırılma tiz/gürültü,
      // patlama sub/gövde — üst üste binerler ve spektrumu paylaşırlar,
      // birbirini maskelemezler.
      if (lines.length >= 2 || combo >= 3) {
        snd('crystalBurst', {power: lines.length + Math.max(0, combo-2)});
      }
      // Combo ödülü ayrı bir VURUŞ olarak geliyor (110ms sonra): patlamayla
      // aynı anda çalsaydı içinde kaybolurdu. Önce olay, sonra ödül.
      if (combo > 1) setTimeout(() => snd('crystalCombo', {level: combo}), 110);

      sceneFlash(jewel, power);
      shockwave(jewel);
      // Dünya da tepki verir: atmosfer itilir ve aydınlanır. Patlamanın
      // tahtayla sınırlı kalmadığını söyleyen ikinci katman (ilki şok
      // dalgası). Yalnızca satır temizlemede — her hamlede olsaydı ölürdü.
      phAtmosphereFlare(atmoEl, 1.9 + Math.min(combo,4)*0.35, 520);
      lines.forEach(l => { axisSweep(l, jewel); lightColumn(l, jewel); });
      screenShake(2.5 + intensity*0.8, 180 + intensity*12);

      const mid = (G - 1) / 2 | 0;
      lines.forEach(l => {
        const p = l.type==='row' ? cellCenter(l.idx, mid) : cellCenter(mid, l.idx);
        if (p) lightWave(p.x, p.y, '#fff');
      });

      // Kıymık bütçesi combo ile büyür ama SERT tavanı aşamaz.
      shatterShards(idxs, jewelOf, Math.min(SHARD_CAP, 22 + combo*6 + lines.length*6));

      // ── COMBO TIRMANIŞI ──
      // Her basamakta YENİ BİR EFEKT TÜRÜ giriyor; "aynı şeyden daha çok"
      // değil. Ekran dolmuyor, dil büyüyor.
      if (combo >= 2) runeGlyphs(idxs, jewel, 3 + combo);
      if (combo >= 3) cameraBreath();
      if (combo >= 4) runeCircle(jewel);

      // Hücreler çözülür — merkeze uzaklığa göre kademeli (dışa yayılan
      // dalga), toplam yayılma 70ms'de sabit.
      const cmid = (G - 1) / 2;
      const dist = i => Math.hypot(Math.floor(i/G) - cmid, (i%G) - cmid);
      const maxDist = Math.max(...idxs.map(dist)) || 1;
      idxs.forEach(i => {
        setTimeout(() => {
          const el = boardEl.children[i];
          if (!el) return;
          el.classList.remove('charging');
          el.classList.add('energy');
        }, (dist(i) / maxDist) * 70);
      });

      haptic(38 + intensity*5);

      setTimeout(() => {
        lines.forEach(l => {
          if (l.type==='row') board[l.idx] = Array(G).fill(0);
          else for(let r=0;r<G;r++) board[r][l.idx]=0;
        });
        renderBoard();
        // ── 3. VURUŞ: KALINTI ──
        // Tahta temizlendikten SONRA doğar: olay bitti, izi duruyor.
        // Bu vuruş olmadan patlama "kesilmiş" gibi bitiyor.
        stardust(idxs, jewel, 8 + combo*2);
        if (cb) cb();
      }, 240);
    }, 100);   // 60ms şarj + 40ms TUTUŞ (bkz. yukarıdaki not)
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

    // Ortak evren: gece göğü + atmosfer. Water Sort'la AYNI sınıflar
    // (.ph-scene / phAtmosphere) — ama yoğunluk farklı. Water Sort'un
    // sahnesi nefes alır (22 yıldız, 9 zerre, sakin); Block Puzzle'ınki
    // daha seyrek ve daha keskin: burada dikkat tahtada olmalı, sahne
    // arkada durup enerjiyi taşımalı. Aynı kelimeler, farklı cümle.
    // Ayrıca ay/dağ YOK — onlar Water Sort'un mekânı, ortak DNA değil.
    container.classList.add('ph-scene');
    atmoEl = phAtmosphere(container, { stars: 16, beams: 2, motes: 6, skyPct: 40 });

    wrapEl = document.createElement('div');
    wrapEl.className = 'bp-wrap';
    wrapEl.innerHTML = `
      <div class="bp-bar">
        <span class="bp-combo"></span>
        <span class="ph-capsule bp-score">◈ <span class="ph-capsule-num">0</span></span>
        <span class="bp-hi">EN İYİ<b>${highScore.toLocaleString()}</b></span>
      </div>
      <div class="ph-dais bp-dais"><div class="bp-charge"></div><div class="bp-board"></div></div>
      <div class="bp-tray"></div>
    `;
    container.appendChild(wrapEl);
    boardEl = wrapEl.querySelector('.bp-board');
    trayEl = wrapEl.querySelector('.bp-tray');

    // Uygulama başlığındaki skor sayacı bu oyun boyunca gizli: skor
    // oyunun kendi HUD'unda. (Water Sort da aynısını yapıyor.)
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = 'none';

    renderBoard();
    renderTray(true);
    renderScoreBar(false);
  }

  function cleanup() {
    bumpHighScore();          // güvenlik ağı; normalde çoktan yazılmış olur
    clearEvs();
    drag = null; locked = false;
    // Sahne yalnızca bu oyun aktifken duruyor — diğer oyunların koyu-tema
    // varsayımına dokunmadan geri alınıyor.
    if (container) container.classList.remove('ph-scene');
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = '';
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
  const PAL = [
    {f:'#ef4444',l:'#f87171',g:'rgba(239,68,68,.4)',name:'Kırmızı'},
    {f:'#3b82f6',l:'#60a5fa',g:'rgba(59,130,246,.4)',name:'Mavi'},
    {f:'#22c55e',l:'#4ade80',g:'rgba(34,197,94,.4)',name:'Yeşil'},
    {f:'#eab308',l:'#fbbf24',g:'rgba(234,179,8,.4)',name:'Sarı'},
    {f:'#a855f7',l:'#c084fc',g:'rgba(168,85,247,.4)',name:'Mor'},
    {f:'#f97316',l:'#fb923c',g:'rgba(249,115,22,.4)',name:'Turuncu'},
  ];
  const WOOD = [
    {f:'#b8860b',l:'#d4a834',d:'#7a5a08'},
    {f:'#a0522d',l:'#c4764d',d:'#6d3519'},
    {f:'#8b6914',l:'#b08a3a',d:'#5c4610'},
    {f:'#cd853f',l:'#dca060',d:'#9a6228'},
    {f:'#9b7653',l:'#b89474',d:'#6b4e33'},
    {f:'#8b4513',l:'#b06030',d:'#5a2d0c'},
  ];
  const MAX_SLOTS = 7;
  const SCR_SZ = 46;

  // ───────── SEVİYELER ─────────
  // Kural: Her renk 3 veya 6 kez, aynı renk aynı tahtada kümelenmiş
  // Tahtalar: bazıları yan yana (seçim hakkı), bazıları üst üste
  const LEVELS = [
    // Lv1: 2 tahta üst üste, 6 vida, 2 renk (3+3) — öğretici
    {boards:[
      {x:10,y:55,w:80,h:28,screws:[{rx:.2,ry:.5,c:0},{rx:.5,ry:.5,c:0},{rx:.8,ry:.5,c:1}]},
      {x:20,y:30,w:60,h:32,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:0}]}
    ]},
    // Lv2: 2 tahta üst üste, 6 vida, 2 renk (3+3)
    {boards:[
      {x:8,y:55,w:84,h:28,screws:[{rx:.15,ry:.5,c:1},{rx:.5,ry:.5,c:0},{rx:.85,ry:.5,c:1}]},
      {x:18,y:28,w:64,h:34,screws:[{rx:.2,ry:.5,c:0},{rx:.5,ry:.5,c:0},{rx:.8,ry:.5,c:1}]}
    ]},
    // Lv3: 2 tahta yan yana + 1 üstte, 9 vida, 3 renk (3+3+3)
    {boards:[
      {x:3,y:55,w:45,h:30,screws:[{rx:.3,ry:.4,c:0},{rx:.7,ry:.4,c:0},{rx:.5,ry:.8,c:1}]},
      {x:52,y:55,w:45,h:30,screws:[{rx:.3,ry:.4,c:1},{rx:.7,ry:.4,c:2},{rx:.5,ry:.8,c:2}]},
      {x:15,y:25,w:70,h:36,screws:[{rx:.2,ry:.5,c:0},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:2}]}
    ]},
    // Lv4: 3 tahta üst üste, 9 vida, 3 renk — renkler kümelenmiş
    {boards:[
      {x:5,y:60,w:90,h:24,screws:[{rx:.2,ry:.5,c:0},{rx:.5,ry:.5,c:0},{rx:.8,ry:.5,c:0}]},
      {x:12,y:38,w:76,h:28,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:1}]},
      {x:22,y:14,w:56,h:30,screws:[{rx:.2,ry:.5,c:2},{rx:.5,ry:.5,c:2},{rx:.8,ry:.5,c:2}]}
    ]},
    // Lv5: 2 yan yana + 1 üstte, 9 vida, 3 renk
    {boards:[
      {x:3,y:58,w:44,h:28,screws:[{rx:.25,ry:.4,c:1},{rx:.75,ry:.4,c:2},{rx:.5,ry:.8,c:0}]},
      {x:53,y:58,w:44,h:28,screws:[{rx:.25,ry:.4,c:0},{rx:.75,ry:.4,c:0},{rx:.5,ry:.8,c:2}]},
      {x:10,y:24,w:80,h:40,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:2}]}
    ]},
    // Lv6: 4 tahta, 12 vida, 4 renk (3+3+3+3) — kümelenmiş
    {boards:[
      {x:3,y:68,w:94,h:20,screws:[{rx:.15,ry:.5,c:0},{rx:.38,ry:.5,c:0},{rx:.62,ry:.5,c:0},{rx:.85,ry:.5,c:1}]},
      {x:10,y:48,w:80,h:26,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:1},{rx:.8,ry:.5,c:2}]},
      {x:18,y:28,w:64,h:26,screws:[{rx:.2,ry:.5,c:2},{rx:.5,ry:.5,c:2},{rx:.8,ry:.5,c:3}]},
      {x:28,y:6,w:44,h:28,screws:[{rx:.25,ry:.5,c:3},{rx:.75,ry:.5,c:3}]}
    ]},
    // Lv7: 2 yan yana (alt) + 2 yan yana (üst), 12 vida, 4 renk
    {boards:[
      {x:3,y:58,w:44,h:28,screws:[{rx:.25,ry:.4,c:0},{rx:.75,ry:.4,c:0},{rx:.5,ry:.8,c:0}]},
      {x:53,y:58,w:44,h:28,screws:[{rx:.25,ry:.4,c:1},{rx:.75,ry:.4,c:1},{rx:.5,ry:.8,c:1}]},
      {x:3,y:18,w:44,h:46,screws:[{rx:.25,ry:.3,c:2},{rx:.75,ry:.3,c:2},{rx:.5,ry:.7,c:2}]},
      {x:53,y:18,w:44,h:46,screws:[{rx:.25,ry:.3,c:3},{rx:.75,ry:.3,c:3},{rx:.5,ry:.7,c:3}]}
    ]},
    // Lv8: 5 tahta, 15 vida, 5 renk — karışık ama kazanılabilir
    {boards:[
      {x:3,y:72,w:94,h:18,screws:[{rx:.15,ry:.5,c:0},{rx:.38,ry:.5,c:0},{rx:.62,ry:.5,c:1},{rx:.85,ry:.5,c:1}]},
      {x:3,y:54,w:44,h:22,screws:[{rx:.3,ry:.5,c:2},{rx:.7,ry:.5,c:2}]},
      {x:53,y:54,w:44,h:22,screws:[{rx:.3,ry:.5,c:3},{rx:.7,ry:.5,c:3}]},
      {x:10,y:28,w:80,h:30,screws:[{rx:.15,ry:.5,c:0},{rx:.38,ry:.5,c:4},{rx:.62,ry:.5,c:4},{rx:.85,ry:.5,c:4}]},
      {x:25,y:4,w:50,h:28,screws:[{rx:.2,ry:.5,c:1},{rx:.5,ry:.5,c:2},{rx:.8,ry:.5,c:3}]}
    ]},
    // Lv9: 2 yan yana + 2 üstte, 12 vida, 4 renk (3+3+3+3)
    {boards:[
      {x:3,y:62,w:44,h:24,screws:[{rx:.3,ry:.5,c:0},{rx:.7,ry:.5,c:0},{rx:.5,ry:.3,c:0}]},
      {x:53,y:62,w:44,h:24,screws:[{rx:.3,ry:.5,c:1},{rx:.7,ry:.5,c:1},{rx:.5,ry:.3,c:1}]},
      {x:3,y:28,w:44,h:40,screws:[{rx:.3,ry:.5,c:2},{rx:.7,ry:.5,c:2},{rx:.5,ry:.3,c:2}]},
      {x:53,y:28,w:44,h:40,screws:[{rx:.3,ry:.5,c:3},{rx:.7,ry:.5,c:3},{rx:.5,ry:.3,c:3}]}
    ]},
    // Lv10: BOSS — 5 tahta, 18 vida, 6 renk
    {boards:[
      {x:2,y:74,w:96,h:16,screws:[{rx:.1,ry:.5,c:0},{rx:.3,ry:.5,c:0},{rx:.5,ry:.5,c:0},{rx:.7,ry:.5,c:1},{rx:.9,ry:.5,c:1}]},
      {x:2,y:56,w:44,h:22,screws:[{rx:.3,ry:.5,c:1},{rx:.7,ry:.5,c:2}]},
      {x:54,y:56,w:44,h:22,screws:[{rx:.3,ry:.5,c:2},{rx:.7,ry:.5,c:2}]},
      {x:8,y:30,w:84,h:30,screws:[{rx:.12,ry:.5,c:3},{rx:.35,ry:.5,c:3},{rx:.62,ry:.5,c:3},{rx:.85,ry:.5,c:4}]},
      {x:18,y:4,w:64,h:30,screws:[{rx:.2,ry:.5,c:4},{rx:.5,ry:.5,c:4},{rx:.8,ry:.5,c:5},{rx:.5,ry:.3,c:5},{rx:.5,ry:.7,c:5}]}
    ]}
  ];

  let container, level, score, slots, screws, boards, undoStack, undoUsed;
  let wrapEl, areaEl, slotsEl;
  let animating = false;

  function haptic(ms) { GameAudio.haptic(ms); }
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
      .sp2-bar .sb-left{display:flex;align-items:center;gap:8px}
      .sp2-bar .sb-lbl{font-size:13px;font-weight:800;color:#c084fc;letter-spacing:.5px}
      .sp2-bar .sb-val{font-size:20px;font-weight:900;color:#fbbf24;transition:transform .15s}
      .sp2-bar .sb-val.bump{animation:spBump .3s ease}
      .sp2-bar .sb-hi{font-size:11px;color:#5d5d78;font-weight:600}
      .sp2-undo{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;font:700 12px/1 inherit;padding:7px 14px;border-radius:20px;cursor:pointer;transition:.2s;user-select:none}
      .sp2-undo:active{transform:scale(.92);background:rgba(168,85,247,.3)}
      .sp2-undo.off{opacity:.25;pointer-events:none}
      .sp2-area{position:relative;width:100%;aspect-ratio:4/5;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.1));border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 6px 30px rgba(0,0,0,.3);overflow:hidden}
      .sp2-board{position:absolute;border-radius:12px;pointer-events:none;transition:transform .6s cubic-bezier(.4,0,.2,1),opacity .5s;overflow:visible}
      .sp2-board-inner{position:absolute;inset:0;border-radius:12px;overflow:hidden}
      .sp2-board .wood-grain{position:absolute;inset:0;border-radius:12px;opacity:.15;background:repeating-linear-gradient(95deg,transparent 0,transparent 4px,rgba(0,0,0,.03) 4px,rgba(0,0,0,.03) 6px)}
      .sp2-board .wood-bevel{position:absolute;inset:0;border-radius:12px;box-shadow:inset 0 2px 0 rgba(255,255,255,.2),inset 0 -3px 0 rgba(0,0,0,.35),inset 2px 0 rgba(255,255,255,.1),inset -2px 0 rgba(0,0,0,.18)}
      .sp2-board .wood-shadow{position:absolute;inset:-4px;border-radius:14px;z-index:-1;box-shadow:0 6px 20px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.3)}
      .sp2-board.shake{animation:spShake .35s ease}
      .sp2-board.fall{transform:translateY(140%) rotate(12deg)!important;opacity:0!important;transition:transform .7s cubic-bezier(.4,0,.2,1),opacity .5s .2s}
      .sp2-screw{position:absolute;border-radius:50%;cursor:pointer;z-index:50;transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s,filter .2s;user-select:none;-webkit-tap-highlight-color:transparent}
      .sp2-screw .scr-body{width:100%;height:100%;border-radius:50%;position:relative;box-shadow:0 4px 10px rgba(0,0,0,.55),inset 0 -3px 5px rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.3);overflow:hidden}
      .sp2-screw .scr-shine{position:absolute;width:40%;height:40%;top:6%;left:10%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.6),transparent 70%)}
      .sp2-screw .scr-cross{position:absolute;inset:0}
      .sp2-screw .scr-cross::before,.sp2-screw .scr-cross::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);background:rgba(0,0,0,.3);border-radius:1px}
      .sp2-screw .scr-cross::before{width:55%;height:12%}
      .sp2-screw .scr-cross::after{width:12%;height:55%}
      .sp2-screw .scr-rim{position:absolute;inset:3px;border-radius:50%;border:1.5px solid rgba(255,255,255,.18)}
      .sp2-screw.active{animation:spPulse 1.5s ease infinite}
      .sp2-screw.covered{opacity:.35;filter:saturate(.1) brightness(.45) grayscale(.5);transform:scale(.75);cursor:not-allowed;transition:all .5s}
      .sp2-screw.covered::after{content:'🔒';position:absolute;top:-8px;right:-8px;font-size:13px;z-index:60;filter:brightness(1.5) drop-shadow(0 1px 3px rgba(0,0,0,.8))}
      .sp2-screw.covered.deny{animation:spDeny .4s ease}
      .sp2-screw.removing{animation:spUnscrew .5s cubic-bezier(.4,0,.2,1) forwards}
      .sp2-screw:not(.covered):not(.removing):hover{transform:scale(1.08);filter:brightness(1.15)}
      .sp2-screw:not(.covered):not(.removing):active{transform:scale(.85)}
      .sp2-slots{display:flex;gap:8px;justify-content:center;padding:12px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);box-shadow:0 -2px 16px rgba(0,0,0,.15)}
      .sp2-slot{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.03);border:2px dashed rgba(255,255,255,.08);display:grid;place-items:center;transition:.3s}
      .sp2-slot.filled{border-style:solid;border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
      .sp2-slot .mini{width:36px;height:36px;border-radius:50%;position:relative;animation:spSlotIn .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 3px 8px rgba(0,0,0,.45),inset 0 -2px 4px rgba(0,0,0,.25);overflow:hidden}
      .sp2-slot .mini .scr-shine{position:absolute;width:30%;height:30%;top:10%;left:12%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.45),transparent 70%)}
      .sp2-slot .mini .scr-cross{position:absolute;inset:0}
      .sp2-slot .mini .scr-cross::before,.sp2-slot .mini .scr-cross::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);background:rgba(0,0,0,.3);border-radius:1px}
      .sp2-slot .mini .scr-cross::before{width:50%;height:10%}
      .sp2-slot .mini .scr-cross::after{width:10%;height:50%}
      .sp2-slot.clearing{animation:spClear .55s ease forwards}
      .sp2-overlay{position:absolute;inset:0;z-index:300;display:grid;place-items:center;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);animation:spFadeIn .3s ease}
      .sp2-overlay h2{font-size:28px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(168,85,247,.5);text-align:center;line-height:1.6;animation:spPop .5s cubic-bezier(.34,1.56,.64,1)}
      @keyframes spUnscrew{0%{transform:scale(1) rotate(0)}20%{transform:scale(.85) rotate(90deg)}100%{transform:scale(0) rotate(720deg);opacity:0}}
      @keyframes spPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}80%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
      @keyframes spSlotIn{0%{transform:scale(0) translateY(-20px);opacity:0}60%{transform:scale(1.15) translateY(2px)}100%{transform:scale(1) translateY(0);opacity:1}}
      @keyframes spClear{0%{transform:scale(1);filter:brightness(1)}30%{transform:scale(1.3);filter:brightness(2.5) drop-shadow(0 0 12px #fbbf24)}100%{transform:scale(0);opacity:0;filter:brightness(3)}}
      @keyframes spShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-5px) rotate(-1deg)}35%{transform:translateX(5px) rotate(1deg)}55%{transform:translateX(-3px) rotate(-.5deg)}75%{transform:translateX(3px) rotate(.5deg)}}
      @keyframes spPart{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0}}
      @keyframes spFloat{0%{transform:translateY(0) scale(1);opacity:1}60%{opacity:1}100%{transform:translateY(-55px) scale(1.3);opacity:0}}
      @keyframes spBump{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
      @keyframes spFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spGlow{0%{box-shadow:0 0 0 rgba(168,85,247,0)}50%{box-shadow:0 0 20px rgba(168,85,247,.4)}100%{box-shadow:0 0 0 rgba(168,85,247,0)}}
      @keyframes spPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 6px rgba(255,255,255,.12)}}
      @keyframes spDeny{0%,100%{transform:scale(.75) translateX(0)}20%{transform:scale(.75) translateX(-5px)}40%{transform:scale(.75) translateX(5px)}60%{transform:scale(.75) translateX(-3px)}80%{transform:scale(.75) translateX(3px)}}
      .sp2-slots.glow{animation:spGlow .5s ease}
      .sp2-hint{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,.25);pointer-events:none}
    `);
  }

  // ───────── COVERED CHECK ─────────
  function isCovered(sc) {
    const my = boards[sc.bi];
    for (let i = sc.bi + 1; i < boards.length; i++) {
      if (boards[i].removed) continue;
      const b = boards[i];
      const overlapX = my.x < b.x + b.w && my.x + my.w > b.x;
      const overlapY = my.y < b.y + b.h && my.y + my.h > b.y;
      if (overlapX && overlapY) return true;
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
      <div class="sb-left">
        <span class="sb-lbl">🔩 Seviye ${level+1}</span>
        <span class="sb-hi">/ ${LEVELS.length}</span>
      </div>
      <span class="sb-val" id="sp-score">⭐ ${score}</span>`;
    const ub = document.createElement('button');
    ub.className = 'sp2-undo' + (undoUsed||!undoStack.length?' off':'');
    ub.textContent = '↩ Geri Al';
    if(!undoUsed&&undoStack.length) addEv(ub,'click',doUndo);
    bar.appendChild(ub);
    wrapEl.appendChild(bar);

    // Game area
    areaEl = document.createElement('div'); areaEl.className = 'sp2-area';
    wrapEl.appendChild(areaEl);

    // Boards — alttakiler daha karanlık
    const totalBoards = boards.filter(b=>!b.removed).length;
    boards.forEach((b,i) => {
      if(b.removed) return;
      const el = document.createElement('div'); el.className = 'sp2-board';
      const w = WOOD[i%WOOD.length];
      // Derinlik: alttaki tahtalar daha koyu, üsttekiler daha parlak
      const depthFactor = 0.6 + (i / Math.max(boards.length-1,1)) * 0.4;
      el.style.cssText = `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;background:linear-gradient(145deg,${w.l},${w.f},${w.d});z-index:${5+i};border:1px solid ${w.d};filter:brightness(${depthFactor.toFixed(2)})`;
      el.innerHTML = '<div class="wood-shadow"></div><div class="board-inner"><div class="wood-grain"></div><div class="wood-bevel"></div></div>';
      el.dataset.bi = i;
      areaEl.appendChild(el);
    });

    // Screws
    screws.forEach(s => {
      if(s.removed) return;
      const cov = isCovered(s);
      const el = document.createElement('div');
      el.className = 'sp2-screw' + (cov ? ' covered' : ' active');
      const sz = SCR_SZ;
      el.style.cssText = `left:calc(${s.px}% - ${sz/2}px);top:calc(${s.py}% - ${sz/2}px);width:${sz}px;height:${sz}px;z-index:${50+s.bi}`;
      const c = PAL[s.color];
      el.innerHTML = `<div class="scr-body" style="background:radial-gradient(circle at 30% 30%,${c.l},${c.f} 60%,${c.f}aa)"><div class="scr-shine"></div><div class="scr-cross"></div><div class="scr-rim"></div></div>`;
      el.dataset.sid = s.id;
      if(!cov) addEv(el,'click',()=>tapScrew(s.id));
      else addEv(el,'click',()=>denyScrew(el));
      areaEl.appendChild(el);
    });

    // Hint
    if(level === 0 && screws.some(s=>!s.removed&&isCovered(s))) {
      const hint = document.createElement('div');
      hint.className = 'sp2-hint';
      hint.textContent = '💡 Üstteki tahtanın vidalarını önce çıkar!';
      areaEl.appendChild(hint);
    }

    // Slots
    slotsEl = document.createElement('div'); slotsEl.className = 'sp2-slots';
    for(let i=0;i<MAX_SLOTS;i++) {
      const d = document.createElement('div');
      d.className = 'sp2-slot'+(slots[i]!==undefined?' filled':'');
      if(slots[i]!==undefined) {
        const c = PAL[slots[i]];
        const m = document.createElement('div'); m.className = 'mini';
        m.style.background = `radial-gradient(circle at 30% 30%,${c.l},${c.f})`;
        m.innerHTML = '<div class="scr-shine"></div><div class="scr-cross"></div>';
        d.appendChild(m);
      }
      slotsEl.appendChild(d);
    }
    wrapEl.appendChild(slotsEl);
  }

  // ───────── KİLİTLİ VİDA ─────────
  function denyScrew(el) {
    el.classList.remove('deny');
    void el.offsetWidth;
    el.classList.add('deny');
    GameAudio.play('error');
    GameAudio.haptic(5);
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
        setTimeout(()=>be.classList.add('fall'),350);
      }
      const bRect = areaEl.getBoundingClientRect();
      const cx = bRect.width*(bd.x+bd.w/2)/100;
      const cy = bRect.height*(bd.y+bd.h/2)/100;
      floatText('+100 🪵',cx-30,cy-10,'#fbbf24',true);
      particles(cx,cy,WOOD[bd.idx%WOOD.length].l,12);
      screenShake(4,300);
    }

    setTimeout(()=>chk3(()=>{animating=false;render();checkEnd();}),550);
  }

  function bumpScore() {
    const el = document.getElementById('sp-score');
    if(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
  }

  // ───────── 3 MATCH ─────────
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

  // ───────── WIN/LOSE ─────────
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
          screenShake(5,350);
          setTimeout(()=>{ov.remove();level=nxt;loadLevel(level);},2000);
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

// ╔══════════════════════════════════════╗
// ║   8. İKSİR SIRALAMA (WATER SORT)     ║
// ╚══════════════════════════════════════╝
PuzzleGames.waterSort = (() => {
  const CAP = 4;
  const PALETTE = [
    {color:'#a855f7', glow:'rgba(168,85,247,.4)'},
    {color:'#22d3ee', glow:'rgba(34,211,238,.4)'},
    {color:'#ef4444', glow:'rgba(239,68,68,.4)'},
    {color:'#22c55e', glow:'rgba(34,197,94,.4)'},
    {color:'#fbbf24', glow:'rgba(251,191,36,.4)'},
    {color:'#3b82f6', glow:'rgba(59,130,246,.4)'},
    {color:'#f97316', glow:'rgba(249,115,22,.4)'},
    {color:'#ec4899', glow:'rgba(236,72,153,.4)'},
  ];

  // Bir sıvı katmanının, içinde durduğu odaya göre yüksekliği. CAP=4 ile
  // 4 × 25% = tam dolu tüp gerçekten dolu görünür. CSS ile syncLiquidShade
  // aynı değeri paylaşmak zorunda — tek kaynak burası.
  const LAYER_PCT = 25;

  let container, level, score, tubes, selected, history, animating, wrapEl, tubesEl, atmosphereEl;
  let comboCount, undosUsedThisLevel;

  // ═══════════ SAF DURUM FONKSİYONLARI ═══════════
  // Hem canlı oyun hem de seviye üretici/çözülebilirlik kontrolü bu
  // fonksiyonları paylaşır — kurallar tek yerde tanımlı.
  function topRun(tube) {
    if (!tube.colors.length) return {color:null, count:0};
    const top = tube.colors[tube.colors.length-1];
    let count = 0;
    for (let i=tube.colors.length-1; i>=0 && tube.colors[i]===top; i--) count++;
    return {color:top, count};
  }
  function canPour(state, from, to, capacity) {
    if (from === to) return false;
    const src = state[from], dst = state[to];
    if (!src.colors.length) return false;
    if (dst.colors.length >= capacity) return false;
    if (!dst.colors.length) return true;
    return dst.colors[dst.colors.length-1] === topRun(src).color;
  }
  function transferUnits(state, from, to, count) {
    for (let i=0;i<count;i++) state[to].colors.push(state[from].colors.pop());
  }
  function pourState(state, from, to, capacity) {
    const run = topRun(state[from]);
    const room = capacity - state[to].colors.length;
    const count = Math.min(run.count, room);
    transferUnits(state, from, to, count);
    return count;
  }
  function isTubeSolved(tube, capacity) {
    return tube.colors.length === capacity && topRun(tube).count === capacity;
  }
  function isWin(state, capacity) {
    return state.every(t => t.colors.length === 0 || isTubeSolved(t, capacity));
  }
  function cloneState(state) { return state.map(t => ({colors:[...t.colors]})); }

  // ═══════════ SEVİYE ÜRETİMİ ═══════════
  function shuffle(arr) {
    for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }
  function paramsForLevel(lv) {
    const colorCount = Math.min(3 + Math.floor(lv/3), PALETTE.length);
    return { colorCount, tubeCount: colorCount + 2 };
  }
  function buildRandomDistribution(colorCount, tubeCount, capacity) {
    const units = [];
    for (let c=0;c<colorCount;c++) for (let k=0;k<capacity;k++) units.push(c);
    shuffle(units);
    const dist = [];
    for (let t=0;t<colorCount;t++) dist.push({colors: units.splice(0,capacity)});
    for (let t=colorCount;t<tubeCount;t++) dist.push({colors:[]});
    return shuffle(dist);
  }
  function serializeState(state) { return state.map(t => t.colors.join('.')).sort().join('|'); }
  // Gerçek DFS ile çözülebilirlik kanıtı — sezgisel hamle sıralaması (önce
  // eşleşen renkli dolu tüpe aktarım, boş tüpe aktarım en son) sayesinde
  // pratikte neredeyse her zaman ilk denemede birkaç düzine düğümde sonuca
  // ulaşır (ölçüldü: 1200 rastgele seviyede %100 ilk-deneme başarı, ortalama
  // ~39 düğüm). `visited` kümesi aynı durumu iki kez incelemeyi önler.
  function isSolvableDFS(startState, capacity, maxNodes) {
    const visited = new Set([serializeState(startState)]);
    const stack = [startState];
    let nodes = 0;
    while (stack.length) {
      const cur = stack.pop();
      if (isWin(cur, capacity)) return true;
      if (++nodes > maxNodes) return false;
      const moves = [];
      for (let i=0;i<cur.length;i++) {
        if (!cur[i].colors.length) continue;
        for (let j=0;j<cur.length;j++) {
          if (i===j || !canPour(cur,i,j,capacity)) continue;
          moves.push([i, j, cur[j].colors.length ? 0 : 1]);
        }
      }
      moves.sort((a,b) => a[2]-b[2]);
      for (const [i,j] of moves) {
        const clone = cloneState(cur);
        pourState(clone,i,j,capacity);
        const key = serializeState(clone);
        if (visited.has(key)) continue;
        visited.add(key);
        stack.push(clone);
      }
    }
    return false;
  }
  function generateLevel(lv) {
    const {colorCount, tubeCount} = paramsForLevel(lv);
    for (let attempt=0; attempt<15; attempt++) {
      const candidate = buildRandomDistribution(colorCount, tubeCount, CAP);
      if (isSolvableDFS(candidate, CAP, 20000)) return candidate;
    }
    // Pratikte hiç tetiklenmemesi beklenir (bkz. yukarıdaki not) — güvenlik ağı.
    return buildRandomDistribution(colorCount, tubeCount, CAP);
  }

  // ═══════════ CSS ═══════════
  // Faz 3 — "büyülü gece": derin gece mavisi + mor, yıldızlı gök, uzakta sis,
  // yumuşak ışık huzmeleri, süzülen parçacıklar. Arka plan bir SAHNE, tüpler
  // sahnenin yıldızı: atmosfer bilerek düşük kontrastlı ve doygunluğu kısık
  // tutuluyor, ekrandaki tek yüksek-kontrast/yüksek-doygunluk alan tüplerin
  // içindeki sıvı. Önceki "sıcak gece köşesi" (parşömen/ahşap/bakır + pencere
  // manzarası) dilinin yerine geçiyor. Sadece #game-container.wsrt-scene
  // altında yaşıyor — diğer oyunların tema varsayımlarına dokunmuyor
  // (init/cleanup class'ı ekleyip kaldırıyor).
  function injectCSS() {
    injectStyle('css-wsrt', `
      #game-container.wsrt-scene{
        --wsrt-night-0:#070B1E; --wsrt-night-1:#0E1435; --wsrt-night-2:#1A1F4D;
        --wsrt-violet:#4C2A7A; --wsrt-violet-soft:#6D45A8;
        --wsrt-mist:#2E3A6B;
        --wsrt-ink:#E8ECFF;
        /* Cam kalınlığı tek yerden. Referans "wow" hedefi için kalınlaştırıldı:
           daha kalın duvar + daha yüksek ağız = daha belirgin, kristal cam.
           Ağız, halka kalınlığının ~3 katı olmalı ki ortada gerçek bir
           AÇIKLIK kalsın (bkz. .wsrt-rim'deki not). */
        --wsrt-wall:4.5px; --wsrt-rim-h:17px;
        /* ── SIVI GÖVDESİNİN GEOMETRİSİ ──
           Sıvı, camın ters döndüğü ayrı bir gövdede yaşıyor (bkz. .wsrt-body).
           Tüp yatınca gövde ters döner; oda (kırpma maskesi) tüple birlikte
           dönmeye devam eder. Ters dönen bir dikdörtgen odayı köşelerinden
           açıkta bırakır, o yüzden gövde YANLARDAN taşar ve fazlası kırpılır.
           Gereken yarı-taşma = oda_yüksekliği × sin(eğim). Oda yüksekliği
           ≈ 4.26 × oda genişliği (aspect-ratio .235), 45°'de sin=.707 →
           ≈ 3.01 genişlik. 3.4 emniyet payıyla en geniş tüpte de yetiyor.
           --wsrt-body-r bunun türevi: gövde/oda genişlik oranı = 1 + 2×3.4.
           İkisi BİRLİKTE değişmek zorunda — gövde içindeki yüzde tabanlı
           süslemeler (yan speküler, menisküs, parlama) odaya geri
           ölçeklenmek için bu oranı kullanıyor. */
        --wsrt-spill-k:3.4; --wsrt-body-r:7.8;
        /* Salınım: gövde camın dönüşünü aynen taklit etmez, GERİDEN gelir ve
           hafifçe aşarak oturur. Ağırlık hissinin tamamı bu gecikmede —
           cam durur, sıvı bir an daha savrulur.
           Eğri, o bacakta TÜPÜN kullandığı eğrinin ŞEKLİNİ takip etmek
           zorunda; yalnızca biraz uzun ve ucunda aşımlı. Aksi hâlde "gecikme"
           değil "kaçış" olur: ölçüldü, dönüşte tüpün yavaş başlayan
           ease-standard'ına karşı hızlı başlayan bir yay verilince gövde
           tüpü geride bırakıyor ve yüzey 27°'ye kadar sapıyordu — yani
           düzeltmeye çalıştığımız "sıvı tüple dönüyor" hatası dönüş
           bacağında aynen geri geliyordu. Bu yüzden iki bacak ayrı:
           gidiş  → tüp ease-decel (hızlı başlar)    : yay da hızlı başlar
           dönüş  → tüp ease-standard (yavaş başlar) : .45,0 ile yavaş başlar */
        --wsrt-slosh-ms:240ms; --wsrt-slosh-ease:cubic-bezier(.2,1.3,.35,1);
        position:relative;overflow:hidden;border-radius:var(--ph-radius-lg);
        background:
          radial-gradient(ellipse 70% 45% at 50% 104%, rgba(109,69,168,.42) 0%, transparent 70%),
          radial-gradient(ellipse 85% 55% at 50% -8%, rgba(76,42,122,.5) 0%, transparent 65%),
          linear-gradient(180deg, var(--wsrt-night-0) 0%, var(--wsrt-night-1) 45%, var(--wsrt-night-2) 100%);
      }
      .wsrt-atmosphere{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
      /* Yıldızlar: sahnenin en uzak katmanı — küçük, soluk, yavaş. */
      .wsrt-star{position:absolute;border-radius:50%;background:#F2F5FF;animation:wsrtTwinkle ease-in-out infinite}
      @keyframes wsrtTwinkle{0%,100%{opacity:.16;transform:scale(.75)}50%{opacity:.7;transform:scale(1.1)}}
      /* Hilal ay: dolu daire + ona binen bir gölge daire = hilal. Soluk sıcak
         ışıması gökyüzünü aydınlatır ama tüplerle yarışmaz (üst köşede, uzakta). */
      .wsrt-moon{position:absolute;top:8%;left:13%;width:52px;height:52px;border-radius:50%;
        background:radial-gradient(circle at 38% 36%, #FBF6E6, #E9DFC2 58%, #C9BC98 100%);
        box-shadow:0 0 26px 4px rgba(250,240,205,.35);pointer-events:none}
      .wsrt-moon::after{content:'';position:absolute;top:-14%;left:-30%;width:100%;height:100%;border-radius:50%;
        background:var(--wsrt-night-1);box-shadow:0 0 0 6px var(--wsrt-night-1)}
      /* Uzak dağ siluetleri: ufuk çizgisi (dais'in arkasında). İki katman,
         farklı koyulukta = derinlik. Sadece şekil, animasyon yok. */
      /* Dağlar gökyüzünde, ufuk çizgisinde: tepeleri dais'in üstünden görünsün,
         dipleri dais'in arkasında kalsın (referanstaki uzak sıradağ hissi). */
      .wsrt-range{position:absolute;left:-4%;right:-4%;pointer-events:none;filter:blur(.6px)}
      .wsrt-range.far{top:23%;height:16%;opacity:.55;background:#2A2054;
        clip-path:polygon(0% 100%,0% 62%,12% 40%,23% 58%,34% 30%,46% 52%,58% 26%,70% 50%,82% 34%,92% 54%,100% 40%,100% 100%)}
      .wsrt-range.near{top:27%;height:16%;opacity:.75;background:#1C1540;
        clip-path:polygon(0% 100%,0% 70%,16% 46%,30% 64%,42% 40%,55% 60%,68% 38%,80% 58%,90% 44%,100% 60%,100% 100%)}
      /* Ateşböcekleri: dip bölgeyi dolduran, sıcak-menekşe parlayan iri
         parçacıklar. Yıldızlardan büyük ve parlak; zemini yaşatır. */
      .wsrt-firefly{position:absolute;border-radius:50%;
        background:radial-gradient(circle, #FFF3D0 0%, rgba(255,214,150,.85) 40%, transparent 72%);
        box-shadow:0 0 10px 2px rgba(255,206,140,.55);
        animation:wsrtFireflyFloat ease-in-out infinite;opacity:0}
      @keyframes wsrtFireflyFloat{
        0%{transform:translate(0,0);opacity:0}
        20%{opacity:.9}80%{opacity:.55}
        100%{transform:translate(var(--ff-dx,8px),var(--ff-dy,-16px));opacity:0}}
      /* Işık huzmeleri: üstten aşağı süzülen, çok geniş ve çok soluk koniler.
         mix-blend-mode:screen ile gökyüzünü aydınlatır, üzerine boya sürmez. */
      /* Ağır blur + düşük opaklık şart: keskin kenarlı bir koni "sahne spot
         lambası" gibi okunuyor, oysa istenen uzaktan sızan yumuşak ışık. */
      .wsrt-beam{
        position:absolute;top:-14%;transform-origin:top center;pointer-events:none;
        mix-blend-mode:screen;filter:blur(34px);
        background:linear-gradient(180deg, rgba(146,118,232,.20) 0%, rgba(118,98,218,.07) 50%, transparent 82%);
        clip-path:polygon(38% 0%, 62% 0%, 94% 100%, 6% 100%);
        animation:wsrtBeamBreathe ease-in-out infinite;
      }
      @keyframes wsrtBeamBreathe{0%,100%{opacity:.3}50%{opacity:.6}}
      /* Uzak sis: tüplerin dibini saran yumuşak bant — "zeminde duruyorlar"
         hissi. Eskiden transform (translateX+scaleY) ile kayıyordu; 22px
         blur'lu bu kadar geniş bir alanı taşımak GPU'ya her karede yeniden
         rasterize ettiriyordu (kasma sebeplerinden). Artık yalnızca opacity
         nefes alıyor: blur'lu görüntü bir kez rasterize edilip önbelleğe
         alınır, sonra sadece saydamlığı değişir — çok daha ucuz. */
      .wsrt-mist-band{
        position:absolute;left:-30%;right:-30%;pointer-events:none;
        filter:blur(22px);mix-blend-mode:screen;
        background:radial-gradient(ellipse 46% 100% at 50% 50%, rgba(132,158,235,.42) 0%, rgba(110,130,215,.16) 48%, transparent 76%);
        animation:wsrtMistDrift ease-in-out infinite;
      }
      @keyframes wsrtMistDrift{0%,100%{opacity:.55}50%{opacity:1}}
      /* Parçacıklar: yukarı süzülen, çok hafif parlayan zerreler. */
      .wsrt-mote{position:absolute;width:3px;height:3px;border-radius:50%;background:radial-gradient(circle,#EAF0FF 0%,rgba(190,205,255,.7) 55%,transparent 75%);box-shadow:0 0 5px 1px rgba(165,190,255,.5);animation:wsrtMoteDrift linear infinite;opacity:0}
      @keyframes wsrtMoteDrift{0%{transform:translateY(0) translateX(0);opacity:0}14%{opacity:.75}86%{opacity:.4}100%{transform:translateY(-90px) translateX(var(--mote-dx,10px));opacity:0}}

      /* Kompozisyon referanstaki gibi sıkı: geniş dais, dar kenar boşluğu,
         dikeyde ortalı. max-width 380→430 + kenar boşluğu küçüldü = tüpler
         ekranın hâkimi (asıl istenen odak). */
      .wsrt-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--ph-space-4);width:100%;max-width:430px;min-height:100%;margin:0 auto;padding:var(--ph-space-3) var(--ph-space-2)}
      /* Seviye kapsülü ortada, kontroller sağda mutlak konumlu (referans üst
         barı). Böylece kapsül geri/kontrol düğmelerinden bağımsız ortalanır. */
      .wsrt-bar{position:relative;display:flex;justify-content:center;align-items:center;width:100%;padding:0 4px;min-height:40px}
      /* Seviye etiketi artık cam kapsül (referanstaki gibi) — üst barı
         "app kabuğu" değil, oyunun kendi parçası gibi gösterir. */
      .wsrt-bar .wb-lbl{
        font:600 17px/1 'Fraunces',serif;color:var(--wsrt-ink);letter-spacing:.02em;
        padding:9px 18px;border-radius:var(--ph-radius-full);
        background:linear-gradient(160deg, rgba(120,100,200,.32), rgba(40,32,80,.46) 70%);
        border:1px solid rgba(180,165,255,.24);
        box-shadow:0 4px 12px -3px rgba(4,6,20,.6),inset 0 1px 0 rgba(220,215,255,.28);
        text-shadow:0 0 18px rgba(150,120,235,.55);
      }
      .wsrt-bar .wb-right{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;gap:var(--ph-space-2)}
      .wsrt-icon-btn{
        width:36px;height:36px;border-radius:var(--ph-radius-full);
        display:flex;align-items:center;justify-content:center;font-size:15px;
        background:linear-gradient(160deg, rgba(120,100,200,.35), rgba(40,32,80,.5) 70%);
        border:1px solid rgba(180,165,255,.22);
        color:var(--wsrt-ink);cursor:pointer;
        box-shadow:0 3px 10px -2px rgba(4,6,20,.6),inset 0 1px 0 rgba(220,215,255,.28);
        transition:transform var(--ph-duration-micro) var(--ph-ease-standard),box-shadow var(--ph-duration-fast) var(--ph-ease-standard);
      }
      .wsrt-icon-btn:active{transform:scale(.9)}
      .wsrt-icon-btn:focus{outline:none}
      .wsrt-icon-btn:focus-visible{outline:2px solid var(--wsrt-violet-soft);outline-offset:2px}
      .wsrt-icon-btn.off{opacity:.28;pointer-events:none}

      /* ── Kaide: tüplerin üstünde durduğu, hafifçe parlayan cam yüzey ──
         Ahşap tezgahın yerine geçti; artık geceyle aynı dili konuşuyor. */
      .wsrt-dais{
        position:relative;border-radius:var(--ph-radius-lg);padding:var(--ph-space-7) var(--ph-space-3) var(--ph-space-5);width:100%;
        background:linear-gradient(180deg, rgba(126,110,220,.2) 0%, rgba(34,30,80,.44) 62%, rgba(20,18,54,.52) 100%);
        border:1px solid rgba(180,165,255,.2);
        box-shadow:0 30px 60px -22px rgba(4,6,22,.92), inset 0 1px 0 rgba(205,195,255,.24);
      }
      /* Üst kenardaki tek anahtar ışık — tüm sahnenin ışık yönünü kurar. */
      .wsrt-dais::before{content:'';position:absolute;top:0;left:12%;right:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(200,180,255,.85),transparent);box-shadow:0 0 16px rgba(150,120,235,.8)}
      /* Zemin: tüplerin dibinin oturduğu ışık çizgisi — "havada süzülmüyorlar,
         bir yüzeyin üstünde duruyorlar" hissini veren şey. */
      .wsrt-dais::after{content:'';position:absolute;left:6%;right:6%;bottom:var(--ph-space-4);height:16px;border-radius:50%;background:radial-gradient(ellipse 60% 100% at 50% 50%, rgba(150,130,240,.32), transparent 72%);filter:blur(6px);pointer-events:none}
      /* gap referanstaki gibi daraldı (12→8px), tüplere daha çok yer kaldı. */
      .wsrt-tubes{--wsrt-n:6;display:flex;gap:8px;align-items:flex-end;justify-content:center;flex-wrap:wrap;width:100%}
      /* ── CAM TÜP ──
         Gerçek bir cam kap tek bir yüzey değil, üst üste binen üç şeydir:
         ARKA cam → içindeki SIVI → ÖN cam. Eski hâl bunu tek div + 2px
         border ile kurmaya çalışıyordu; sonuç cam değil, içinde beyaz bir
         pipet duran düz bir paneldi. Katmanlar artık ayrı:
           .wsrt-glass  — silüet: gövde, dış gölge, içeriğin sızdırdığı ışık
           .wsrt-tube-inner — sıvı odası (kırpma maskesi), duvar kalınlığı
                              kadar içeri çekik; tüple birlikte DÖNER
           .wsrt-body   — sıvının kendisi; odanın dönüşünü İPTAL eder, yani
                          yüzey her açıda dünyaya göre yatay kalır
           .wsrt-front  — ön cam: silindir gölgelemesi + iki yanda parlama
           .wsrt-rim    — ağızdaki cam kesiti (halka)
         Kalınlık --wsrt-wall ile tek yerden ayarlanıyor: sıvının silüetten
         bu kadar içeride durması, duvarın GÖRÜLMESİ demek — "hacim" hissinin
         asıl kaynağı bu, gradyanlar değil. */
      /* Tüpler ~%18 büyüdü (max 62→72px) ve uzadı (aspect .27→.235) —
         referanstaki gibi ince-uzun, ekranın hâkimi. gap 8px calc'a yansıdı. */
      .wsrt-tube{
        width:clamp(46px, calc((100% - (var(--wsrt-n) - 1) * 8px) / min(var(--wsrt-n),6)), 72px);
        aspect-ratio:.235;
        position:relative;cursor:pointer;
        transition:transform var(--ph-duration-fast) var(--ph-ease-standard);
      }
      /* Silüet: üstte geniş-basık elips (silindirin ağzı), altta derin U.
         Buradaki box-shadow'lar STATİK (derinlik gölgesi + içeriğin sızdırdığı
         havuz) — hiç canlanmaz, bir kez boyanır. Durum parıltıları ise ayrı
         bir ::after katmanında yaşar ve yalnızca OPACITY ile açılıp kapanır
         (aşağıya bak) — böylece seçim/geçerli-hedef/çözüldü parıltılarının
         hiçbiri box-shadow canlandırmaz. */
      .wsrt-glass{
        position:absolute;inset:0;z-index:1;
        border-radius:50% 50% 46% 46% / var(--wsrt-rim-h) var(--wsrt-rim-h) 13% 13%;
        background:linear-gradient(180deg, rgba(150,175,255,.07) 0%, rgba(120,145,230,.10) 82%, rgba(160,185,255,.18) 100%);
        box-shadow:
          0 18px 20px -12px rgba(3,5,20,.9),
          0 12px 42px -6px var(--wsrt-pool, transparent),
          0 0 26px -1px var(--wsrt-pool, transparent);
      }
      /* Tüm durum parıltılarının tek taşıyıcısı. Renk --wsrt-ring ile gelir,
         görünürlük yalnızca opacity ile değişir = GPU-dostu, sıfır paint. */
      .wsrt-glass::after{
        content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
        box-shadow:0 0 var(--ph-glow-md) 3px var(--wsrt-ring, transparent);
        opacity:0;transition:opacity var(--ph-duration-fast) var(--ph-ease-standard);
      }
      /* Oda artık SADECE kırpma maskesi: cam duvarın içindeki boşluğun şekli.
         Tüple birlikte döner ve sıvıyı cam siluetine kırpar — ama sıvının
         kendisini TAŞIMAZ, o .wsrt-body'de yaşar. İkisinin ayrılması Faz 1'in
         tamamı: eğik bardaktaki sıvı, eğik bir kap tarafından kırpılmış YATAY
         yüzeyli bir gövdedir. */
      .wsrt-tube-inner{
        position:absolute;z-index:2;
        top:calc(var(--wsrt-rim-h) * .55);
        left:var(--wsrt-wall);right:var(--wsrt-wall);bottom:var(--wsrt-wall);
        overflow:hidden;
        border-radius:34% 34% 46% 46% / 6% 6% 14% 14%;
        /* Sıvıyı "ışık saçıyor" seviyesine çıkaran son dokunuş: bir bütün
           olarak doygunluk + parlaklık. Tek tek katman renklerine dokunmadan
           tüm sütunu neon-jel hissine taşır (referanstaki gibi). */
        filter:saturate(1.22) brightness(1.08);
      }
      /* ── SIVI GÖVDESİ ──
         Tüpün rotate(θ)'sını rotate(-θ) ile İPTAL eder. Bileşke dönüş sıfır:
         katmanlar tüp ne kadar yatarsa yatsın DÜNYAYA GÖRE yatay kalır.
         Görünen sıvı = bu gövde ∩ odanın kırpması — gerçek fizikteki gibi.

         scaleY(--wsrt-squash) hacim korumasıdır. Yüzey yatay kalırken eğik
         odanın alanı yeniden dağılır; dolgu yüksekliği sabit bırakılırsa yarı
         dolu bir tüp yatınca DAHA DOLU görünür (yoktan sıvı üremesi — ağırlık
         hissini bozan tam olarak bu tür şeyler). Doğru dünya-yüksekliği
         dolgu × oda_yüksekliği × cos(θ); scaleY tam olarak bunu verir, çünkü
         gövdenin bileşke dönüşü sıfır olduğu için scaleY dünya-dikeyindedir.

         transition transform üzerinde: --wsrt-tilt değişince transform yeniden
         hesaplanır ve geçiş tetiklenir. Tüpünkinden uzun süre + aşımlı eğri =
         sıvının camı geriden takip edip savrularak oturması. */
      .wsrt-body{
        position:absolute;top:0;bottom:0;
        left:calc(-100% * var(--wsrt-spill-k));
        right:calc(-100% * var(--wsrt-spill-k));
        display:flex;flex-direction:column-reverse;
        transform-origin:50% 100%;
        transform:rotate(calc(-1 * var(--wsrt-tilt, 0deg))) scaleY(var(--wsrt-squash, 1));
        transition:transform var(--wsrt-slosh-ms) var(--wsrt-slosh-ease);
      }
      /* Dönüş bacağı: tüp POUR_RETURN_MS boyunca --ph-ease-standard ile
         doğrulur (yavaş başlar). Gövde aynı yavaş başlangıcı paylaşır,
         biraz daha uzun sürer ve ucunda aşar — sıvı camdan sonra oturur.
         220ms taranarak seçildi (250/235/220/205 ölçüldü): gidişte yüzeyin
         tepe gecikmesi 3.6°, dönüşte 220ms ile 5.4° — dönüş daha sert bir
         hareket olduğu için biraz fazlası doğru, ama 250ms'in 10.5°'i
         "ağırlık" değil "gevşeklik" gibi okunuyordu. Oturma aşımı 1.9°:
         ağırlık hissini asıl veren, gecikmenin kendisi değil bu oturma. */
      .wsrt-tube.wsrt-returning .wsrt-body{
        transition-duration:220ms;
        transition-timing-function:cubic-bezier(.45,0,.2,1.25);
      }
      /* will-change YALNIZCA dökme boyunca: sürekli açık bırakmak 10 tüpün
         her birine kalıcı bir compositor katmanı ayırtır (gövde odadan ~8 kat
         geniş, bedeli boşuna ödenir). Dökmeler sıralı olduğu için aynı anda
         en fazla bir tüpte açık kalır. */
      .wsrt-tube.wsrt-pouring .wsrt-body{will-change:transform}
      /* Ön cam. Fizik: cama KENARINDAN bakınca yoğun ve yansıtıcı, ORTASINDAN
         bakınca berrak görünür. Silindir hissini kuran tek şey bu — üstteki
         sıvıyı da örttüğü için sıvı "camın içinde" okunuyor. */
      .wsrt-front{
        position:absolute;inset:0;z-index:3;pointer-events:none;
        border-radius:50% 50% 46% 46% / var(--wsrt-rim-h) var(--wsrt-rim-h) 13% 13%;
        background:linear-gradient(90deg,
          rgba(228,238,255,.38) 0%,
          rgba(228,238,255,.12) 13%,
          rgba(255,255,255,0) 36%,
          rgba(255,255,255,0) 64%,
          rgba(205,220,255,.13) 87%,
          rgba(216,230,255,.32) 100%);
      }
      /* Parlama: eskiden bunlar tüp boyunca uzanan, iki ucu yuvarlatılmış,
         eğik BEYAZ ÇUBUKLARDI — pipet görüntüsünün asıl kaynağı. Bir yansıma
         nesne gibi durmamalı: kısa, bulanık, iki ucu da sönümlenen, eğimsiz. */
      .wsrt-front::before{
        content:'';position:absolute;top:9%;left:11%;width:9%;height:44%;
        border-radius:50%;filter:blur(2px);
        background:linear-gradient(180deg, transparent 0%, rgba(255,255,255,.72) 24%, rgba(255,255,255,.26) 72%, transparent 100%);
      }
      /* Karşı kenarda daha soluk ikinci parlama — düz panel değil, YUVARLAK. */
      .wsrt-front::after{
        content:'';position:absolute;top:16%;right:8.5%;width:5.5%;height:32%;
        border-radius:50%;filter:blur(2px);
        background:linear-gradient(180deg, transparent 0%, rgba(222,234,255,.42) 34%, transparent 100%);
      }
      /* Ağız: camı KESİTTEN gösteren elips halka — açık bir kabın en kuvvetli
         işareti. Dolgu ŞEFFAF olmak zorunda: içi doldurulunca (ve halka
         yüksekliğine göre kalın border verilince) açıklık kapanıyor ve halka
         kapak/tıpa gibi okunuyordu — kaldırdığımız mantar tıpanın kılık
         değiştirmiş hâli. Şeffaf dolguyla boş tüpte karanlık iç, dolu tüpte
         sıvının yüzeyi görünür. Üst iç kenarda gölge (öne bakan kenar), alt
         iç kenarda ışık (arka kenar ışığı yakalar) — ağzı hacimli yapan bu. */
      .wsrt-rim{
        position:absolute;z-index:4;pointer-events:none;box-sizing:border-box;
        top:0;left:0;right:0;height:var(--wsrt-rim-h);
        border-radius:50%;
        border:2.5px solid rgba(233,243,255,.62);
        background:transparent;
        box-shadow:
          inset 0 4px 6px -2px rgba(3,5,18,.92),
          inset 0 -3px 5px -2px rgba(245,249,255,.72),
          0 1px 4px rgba(3,5,18,.7),
          0 0 16px rgba(150,175,255,.28);
      }
      /* Ağzın ön kenarında parlak bir kristal ışık — camın kalınlığını
         "yakalanan ışık" olarak gösterir, referanstaki parlak ağız hissi. */
      .wsrt-rim::before{
        content:'';position:absolute;left:14%;right:14%;top:1px;height:3px;border-radius:50%;
        background:linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent);
        filter:blur(.5px);
      }

      /* ── SIVI ──
         Küp değil, akışkan: her renk düz bir dolgu — kendi parlak/koyu
         döngüsünü tekrarlamıyor. Tüm sütunu tek bir ışık taraması
         (.wsrt-liquid-shade) örtüyor; sonuç üst üste bloklar değil tek
         parça bir sıvı gövdesi. */
      /* Renk artık color özelliğinde tutuluyor (background değil), çünkü
         box-shadow bunu currentColor ile okuyabiliyor: her katman kendi
         rengini 1px AŞAĞI taşırır. Sebep — katman yükseklikleri kesirli
         (192.588/4 = 48.147px), yani komşu katmanlar tam piksele oturmuyor;
         kenar yumuşatması aradan arkadaki camı sızdırıp saç teli inceliğinde
         açık bir çizgi bırakıyordu. AYNI renkli iki katman arasında bile.
         Blok görüntüsünün yarısı buydu. */
      /* Jel/ışık saçan sıvı (referans hedefi). Üç katman bir arada:
         1) yan speküler ışıklar — silindirin kenarlarından yansıyan parlaklık,
            sıvıya cam-arkası hacim verir;
         2) üst jel parlaması (inset açık) — yoğun/parlak yüzey;
         3) alt hacim gölgesi (inset koyu) — sıvının dibi yuvarlanır.
         currentColor taban rengi; 0 1px 0 currentColor kesirli-piksel contası.
         Işımanın kendisi tube-inner'daki saturate/brightness + --wsrt-pool ile
         geliyor (aşağıya bak) — katman kırpıldığı için glow buraya konamaz. */
      /* Yan speküler artık gövde genişliğine değil ODA genişliğine göre
         konumlanıyor: p_oda → 50% + (p_oda - 50%) / --wsrt-body-r. Tüp dikken
         sonuç piksel piksel eskisinin aynısı (oda dışı zaten kırpılıyor).
         Taşma bölgesinde şeffafa sönümleniyor — sert bir kenar, tüp yatınca
         sıvının ortasından geçen dikey bir çizgi olarak görünürdü.
         Yatık tüpte sıvının KENAR parlaması zaten .wsrt-front'tan geliyor
         (o oda uzayında, yani her zaman camla hizalı — fizik olarak da doğru
         yer: kenar parlaması camın yansıması, sıvının özelliği değil). */
      .wsrt-layer{
        position:relative;height:${LAYER_PCT}%;flex-shrink:0;transform-origin:bottom;overflow:hidden;
        background:
          linear-gradient(90deg,
            rgba(255,255,255,0)   0%,
            rgba(255,255,255,.30) calc(50% - 50% / var(--wsrt-body-r)),
            rgba(255,255,255,0)   calc(50% - 26% / var(--wsrt-body-r)),
            rgba(255,255,255,0)   calc(50% + 26% / var(--wsrt-body-r)),
            rgba(255,255,255,.14) calc(50% + 50% / var(--wsrt-body-r)),
            rgba(255,255,255,0)   100%),
          currentColor;
        box-shadow:
          inset 0 3px 7px -2px rgba(255,255,255,.5),
          inset 0 -7px 11px -5px rgba(0,0,0,.3),
          0 1px 0 currentColor;
      }
      /* En alttaki katman AŞAĞI da taşmalı. Gövde ters dönerken oda birlikte
         döner ve odanın alçak dip köşesi gövdenin alt kenarının ALTINA iner
         ((genişlik/2)×sin θ). O köşe doldurulmazsa yatık tüpün dibinde boş bir
         üçgen açılır. Alt taşma 1px'lik kesirli-piksel contasını da kapsıyor.
         64px, ölçülerek seçildi ve BOL olması kasıtlı: gölge katmanın kendi
         uzayında duruyor, yani gövdenin scaleY'si (45°'de .707) onu da
         küçültüyor — 64px ekranda ~45px'e iniyor. En geniş tüpte gereken
         ~26px; kalan pay, hacim korumasının squash'ı daha da kıstığı
         durumlar için. Fazlası bedava: oda zaten hepsini kırpıyor, dik
         tüpte gölgenin tamamı odanın dibinin altında kalır. */
      .wsrt-body > .wsrt-layer:first-child{
        box-shadow:
          inset 0 3px 7px -2px rgba(255,255,255,.5),
          inset 0 -7px 11px -5px rgba(0,0,0,.3),
          0 64px 0 currentColor;
      }
      /* Sınır çizgisi YALNIZCA iki FARKLI renk arasında (.wsrt-seam) — aynı
         renkli katmanların arasına da çizgi çekmek, çözülmüş bir tüpü tek
         parça sıvı yerine üst üste dizilmiş 4 kutu gibi gösteriyordu.
         Sert kenar değil, iki sıvı arasındaki yüzey gerilimi.
         Çizginin ALT kenarda olması kritik: column-reverse'te katman idx,
         idx-1'in ÜSTÜNDE durur — yani "altımdaki farklı renk" sınırı bu
         katmanın ALT kenarıdır. Üste çizmek çizgiyi bir katman yukarı
         kaydırıyordu; ekrandaki mor|mor sınırına düşen çizgi tam olarak buydu. */
      .wsrt-layer.wsrt-seam::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:rgba(255,255,255,.16);pointer-events:none;z-index:1}
      /* Menisküs: en üstteki katman havayla temas eder — içbükey yüzey.
         ::before kullanır, çünkü ::after sınır çizgisine ait (ikisi bir
         arada olabilir: üstteki katmanın altında farklı bir renk varsa). */
      /* Menisküs elipsi de oda genişliğine ölçeklenir (78% ODA'nın yüzdesi;
         gövde genişliğinin 78%'i olsaydı düz bir yayılmaya dönerdi). */
      .wsrt-layer-top::before{content:'';position:absolute;top:0;left:0;right:0;height:9px;background:radial-gradient(ellipse calc(78% / var(--wsrt-body-r)) 100% at 50% 0%, rgba(255,255,255,.78), rgba(255,255,255,.24) 62%, transparent);pointer-events:none;z-index:1}
      /* Parıltı: eskiden background-position canlandırıyordu — bu HER KARE
         yeniden boyama (paint) demek ve her dolu tüpün üstünde sürekli
         çalışıyordu (kasmanın ana sebebi). Artık dar bir ışık bandı
         transform ile süzülüyor: katmanın overflow:hidden'ı bandı kırpar,
         GPU sadece translate eder — sıfır paint. Çoğu zaman durur, ara sıra
         hızlıca geçer: gerçek camın ışığı ara sıra yakalaması gibi. */
      /* left/width oda genişliğine ölçekli (bkz. --wsrt-body-r). translateX
         yüzdeleri kendi genişliğine göre olduğu için keyframe'ler değişmiyor:
         süzülme mesafesi hâlâ oda genişliğinin ~1.6 katı. */
      .wsrt-sheen{position:absolute;top:-10%;bottom:-10%;
        left:calc(50% - 95% / var(--wsrt-body-r));width:calc(36% / var(--wsrt-body-r));pointer-events:none;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,.22) 50%,transparent);
        transform:translateX(-30%) skewX(-14deg);
        animation:wsrtSheenDrift calc(var(--ph-duration-ambient) * 3) linear infinite;
      }
      @keyframes wsrtSheenDrift{0%,62%{transform:translateX(-30%) skewX(-14deg)}100%{transform:translateX(440%) skewX(-14deg)}}
      .wsrt-liquid-shade{position:absolute;left:0;right:0;bottom:0;pointer-events:none;z-index:1;background:linear-gradient(180deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,.06) 30%, rgba(0,0,0,0) 52%, rgba(0,0,0,.3) 100%);mix-blend-mode:overlay}
      .wsrt-layer-settle{animation:wsrtSettle var(--ph-duration-medium) var(--ph-ease-spring)}
      @keyframes wsrtSettle{0%{transform:scaleY(.32);opacity:.4}100%{transform:scaleY(1);opacity:1}}

      /* ── DURUMLAR ──
         Dönüşüm dış kutuda (.wsrt-tube), parıltı ise şekilli katmanda
         (.wsrt-glass) — böylece halka tüpün gerçek silüetini takip eder,
         dikdörtgeni değil. */
      /* Dökme dönüşümü JS'te satır içi veriliyor (pourTransform) — hedefin
         yerine göre hesaplandığı için sabit bir sınıf olamaz. Pivot burada. */
      .wsrt-tube{transform-origin:bottom center}
      .wsrt-tube.selected{transform:translateY(-14px) scale(1.04)}
      /* Seçim: menekşe halka, sabit (nabız yok) — opacity 1, renk mor. */
      .wsrt-tube.selected .wsrt-glass{--wsrt-ring:rgba(190,168,255,.95)}
      .wsrt-tube.selected .wsrt-glass::after{opacity:1}
      /* Geçerli hedef: camgöbeği halka, opacity nabzı (box-shadow DEĞİL). */
      .wsrt-tube.valid-target .wsrt-glass{--wsrt-ring:rgba(150,205,255,.75)}
      .wsrt-tube.valid-target .wsrt-glass::after{animation:wsrtValidPulse var(--ph-duration-ambient) ease-in-out infinite}
      @keyframes wsrtValidPulse{0%,100%{opacity:0}50%{opacity:1}}
      /* Çözüldü: altın halka, tek seferlik opacity nabzı. */
      .wsrt-tube.wsrt-tube-solved .wsrt-glass{--wsrt-ring:var(--ph-success-glow)}
      .wsrt-tube.wsrt-tube-solved .wsrt-glass::after{animation:wsrtSolvedPulse var(--ph-duration-celebratory) var(--ph-ease-standard)}
      @keyframes wsrtSolvedPulse{0%,100%{opacity:0}35%{opacity:1}}
      .wsrt-countup{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:'Fraunces',serif;font-weight:600;font-variant-numeric:var(--ph-variant-numeral);font-size:36px;color:#FFF6D8;text-shadow:0 0 24px var(--ph-success-glow),0 0 48px var(--ph-success-glow);z-index:var(--ph-z-overlay);pointer-events:none}
      /* Akış: ağızda geniş, düşerken incelen bir huni — yerçekimiyle hızlanan
         sıvı incelir. Ağız hedefin tam üstünde olduğu için hep dikey.
         Işıma filter ile: clip-path box-shadow'u da kırptığı için eski
         box-shadow parıltısı hiç görünmüyordu — drop-shadow kırpılmış
         şeklin dışına taşar. Ortadaki açık şerit ise camsı bir sıvı
         sütununun ışığı kırdığı çekirdek. */
      /* Genişlik 15→26px. clip-path huniyi kestiği için GÖRÜNEN akış bunun
         yarısı kadar: 15px'te tepede 7.8px, dipte 3.6px kalıyordu — tüp
         genişliğinin %14'ünden %6'sına inen bir iplik. Akış kısayken
         (~50px) fark edilmiyordu; artık 300px düştüğü için kuyruğu
         görünmez oluyordu. 26px'te tepede 13.5px, dipte 6.2px: incelen bir
         huni olarak kalıyor ama dökülen bir sıvı olarak okunuyor. */
      .wsrt-stream{
        position:fixed;top:0;left:0;width:26px;transform-origin:top center;
        clip-path:polygon(24% 0%, 76% 0%, 62% 100%, 38% 100%);
        background:
          linear-gradient(90deg, rgba(255,255,255,0) 16%, rgba(255,255,255,.5) 44%, rgba(255,255,255,0) 70%),
          var(--wsrt-stream-color);
        filter:drop-shadow(0 0 5px var(--wsrt-stream-color)) drop-shadow(0 0 12px var(--wsrt-stream-color));
        opacity:.96;pointer-events:none;z-index:var(--ph-z-floating);
        /* Düşen sıvı HIZLANIR. Eskiden --ph-ease-decel kullanılıyordu, yani
           akışın ön ucu inerken yavaşlıyordu — bu yerçekiminin tersi ve
           akışı "düşen sıvı" değil "uzayan lastik" gibi gösteriyordu.
           Süre satır içi veriliyor (mesafeyle ölçekleniyor), eğri burada. */
        transition-property:transform;
        transition-timing-function:cubic-bezier(.42,0,.85,.55);
      }
      /* Kaynak boşalırken en üstteki birim önce gider, sonra bir alttaki —
         sütunun yüzeyi kademeli iner. Akış akarken kaynağın seviyesi sabit
         kalıyor, sonra sıvı bir anda yer değiştiriyordu: "akan sıvı" ile
         "hiç değişmeyen tüp" arasındaki bu kopukluk dökmeyi sahte
         gösteriyordu. Asıl mesele buydu, akışın kendi şekli değil. */
      @keyframes wsrtDrain{from{transform:scaleY(1)}to{transform:scaleY(0)}}
      @media (prefers-reduced-motion: reduce){
        .wsrt-tube{transition:none}
        /* Yüzey yatay kalmaya devam eder (bu bir bilgi, süs değil) — sadece
           savrulup oturması anında olur. */
        .wsrt-body{transition:none}
        .wsrt-tube.valid-target .wsrt-glass::after{animation:none;opacity:.7}
        .wsrt-tube.wsrt-tube-solved .wsrt-glass::after{animation:none}
        .wsrt-layer-settle{animation-duration:var(--ph-duration-fast)}
        .wsrt-stream{transition:none}
        .wsrt-mote{display:none}
        .wsrt-sheen{animation:none;display:none}
        .wsrt-beam{animation:none;opacity:.45}
        .wsrt-mist-band{animation:none;opacity:.75}
        .wsrt-star{animation:none;opacity:.5}
        .wsrt-firefly{animation:none;opacity:.6}
      }
    `);
  }

  // ═══════════ DOM YARDIMCILARI ═══════════
  // Renkler design-tokens.css'in jewel-tone paletinden okunur (PALETTE
  // dizisi sadece .length için kullanılıyor). Küp değil akışkan: her renk
  // artık DÜZ bir dolgu — kendi parlak/koyu döngüsünü tekrarlamıyor. Işık,
  // syncLiquidShade'in kurduğu TEK paylaşımlı örtüyle tüm sütuna birden
  // uygulanıyor (bkz. injectCSS .wsrt-liquid-shade).
  // seam: bu katmanın ALTINDA farklı bir renk var mı? Sadece o zaman sınır
  // çizgisi çizilir — aynı renkli katmanlar tek sıvı gövdesi olarak birleşir.
  function layerHtml(colorIdx, isTop, seam) {
    const n = colorIdx + 1;
    const sheen = isTop ? '<div class="wsrt-sheen"></div>' : '';
    const cls = 'wsrt-layer' + (isTop ? ' wsrt-layer-top' : '') + (seam ? ' wsrt-seam' : '');
    return `<div class="${cls}" style="color:var(--ph-jewel-${n}-base)">${sheen}</div>`;
  }
  // Sıvı sütununun toplam dolu yüksekliğine göre boyanan tek ışık taraması —
  // katman eklenip çıkarıldıkça (pour/undo) yeniden hizalanmalı.
  function syncLiquidShade(innerEl) {
    const count = innerEl.querySelectorAll('.wsrt-layer').length;
    let shade = innerEl.querySelector('.wsrt-liquid-shade');
    if (!count) { if (shade) shade.remove(); return; }
    if (!shade) { shade = document.createElement('div'); shade.className = 'wsrt-liquid-shade'; innerEl.appendChild(shade); }
    shade.style.height = (count * LAYER_PCT) + '%';
  }
  // Tüpün mevcut üst rengi tezgah yüzeyine sızan renkli bir "ışık havuzu"
  // besler (--wsrt-pool, injectCSS'teki box-shadow'da tüketilir) —
  // içerik ışığını çevresine geri yansıtan tek bir dokunuş.
  function updateTubeGlow(el, tube) {
    const top = topRun(tube);
    el.style.setProperty('--wsrt-pool', top.color !== null ? `var(--ph-jewel-${top.color + 1}-glow)` : 'transparent');
    el.classList.toggle('wsrt-empty', !tube.colors.length);
  }
  // Sıvıyla ilgili her şey (katmanlar, ışık örtüsü) artık .wsrt-body'nin
  // içinde: ODA döner, GÖVDE ters döner. Katmanları arayan her yer gövdeyi
  // hedeflemek zorunda — odada artık katman yok.
  function bodyOf(tubeEl) { return tubeEl.querySelector('.wsrt-body'); }
  // Katman sırası = derinlik sırası: arka cam, sıvı, ön cam, ağız halkası.
  // Sıvının ön camın ALTINDA olması, "camın içinde" okunmasını sağlayan şey.
  function buildTubeEl(tube, i) {
    const el = document.createElement('div');
    el.className = 'wsrt-tube';
    const layers = tube.colors.map((c, idx, arr) =>
      layerHtml(c, idx === arr.length - 1, idx > 0 && arr[idx-1] !== c)).join('');
    el.innerHTML =
      `<div class="wsrt-glass"></div>` +
      `<div class="wsrt-tube-inner"><div class="wsrt-body">${layers}</div></div>` +
      `<div class="wsrt-front"></div>` +
      `<div class="wsrt-rim"></div>`;
    syncLiquidShade(bodyOf(el));
    updateTubeGlow(el, tube);
    addEv(el, 'click', () => onTapTube(i));
    return el;
  }
  // Sıvı katmanları iç odanın TEK çocuk türü değil: syncLiquidShade ışık
  // örtüsünü (.wsrt-liquid-shade) oraya kardeş olarak koyuyor. Bu yüzden
  // ":last-child" bir katmanı asla yakalayamaz — örtü varken hiç eşleşmez,
  // yokken yanlış elemanı verir. Katmanlar her zaman kendi koleksiyonundan
  // seçilir; örtü mutlak konumlu olduğu için DOM sırası düzeni etkilemez.
  function topLayerEl(innerEl) {
    const ls = innerEl.querySelectorAll('.wsrt-layer');
    return ls[ls.length - 1] || null;
  }
  function appendLayer(innerEl, colorIdx, isTop, seam) {
    const shade = innerEl.querySelector('.wsrt-liquid-shade');
    const html = layerHtml(colorIdx, isTop, seam);
    if (shade) shade.insertAdjacentHTML('beforebegin', html);
    else innerEl.insertAdjacentHTML('beforeend', html);
    return topLayerEl(innerEl);
  }
  // Tek bir aktarımı sadece etkilenen iki tüpün DOM'unda günceller —
  // her dokunuşta tüm tüpleri yeniden çizmekten kaçınmak için.
  // Sıvı katmanları .wsrt-body içinde (ters dönen sıvı gövdesi, bkz.
  // injectCSS) — insertAdjacentHTML mutlaka o gövdeye hedeflenmeli.
  function applyPourDOM(from, to, count, colorIdx) {
    const fromInner = bodyOf(tubesEl.children[from]);
    const toInner = bodyOf(tubesEl.children[to]);
    for (let i=0;i<count;i++) { const l = topLayerEl(fromInner); if (l) l.remove(); }
    const newFromTop = topLayerEl(fromInner);
    if (newFromTop) newFromTop.classList.add('wsrt-layer-top');
    const prevToTop = topLayerEl(toInner);
    if (prevToTop) prevToTop.classList.remove('wsrt-layer-top');
    // Dikiş yalnızca eklenen İLK katmanda olabilir (kalanlar aynı renk).
    // Normal dökmede hiç oluşmaz — kural gereği sıvı ya aynı rengin ya da
    // boş tüpün üstüne gider. Ama GERİ ALMA, altında farklı renk bulunan
    // bir katmanı kaynağa iade edebilir; sınır oradan doğar.
    const destColors = tubes[to].colors;
    for (let i=0;i<count;i++) {
      const isLast = i === count - 1;
      const idx = destColors.length - count + i;
      const seam = idx > 0 && destColors[idx-1] !== colorIdx;
      const added = appendLayer(toInner, colorIdx, isLast, seam);
      if (isLast && added) added.classList.add('wsrt-layer-settle');
    }
    syncLiquidShade(fromInner);
    syncLiquidShade(toInner);
    updateTubeGlow(tubesEl.children[from], tubes[from]);
    updateTubeGlow(tubesEl.children[to], tubes[to]);
  }
  function updateControlsBar() {
    const undoBtn = wrapEl.querySelector('#wsrt-undo');
    const restartBtn = wrapEl.querySelector('#wsrt-restart');
    if (undoBtn) undoBtn.classList.toggle('off', history.length === 0);
    if (restartBtn) restartBtn.classList.toggle('off', history.length === 0);
  }
  // Tam yeniden çizim — sadece seviye başlangıcında/yeniden başlatmada.
  function render() {
    wrapEl.innerHTML = `
      <div class="wsrt-bar">
        <span class="wb-lbl">Seviye ${level+1}</span>
        <div class="wb-right">
          <button class="wsrt-icon-btn" id="wsrt-undo" title="Geri Al">↩</button>
          <button class="wsrt-icon-btn" id="wsrt-restart" title="Yeniden Başlat">🔄</button>
        </div>
      </div>
      <div class="wsrt-dais"><div class="wsrt-tubes"></div></div>
    `;
    tubesEl = wrapEl.querySelector('.wsrt-tubes');
    tubesEl.style.setProperty('--wsrt-n', tubes.length);
    tubes.forEach((tube,i) => tubesEl.appendChild(buildTubeEl(tube,i)));
    phStaggerIn(tubesEl.children, 35);
    addEv(wrapEl.querySelector('#wsrt-undo'), 'click', undoLast);
    addEv(wrapEl.querySelector('#wsrt-restart'), 'click', restartLevel);
    updateControlsBar();
  }

  // ═══════════ ETKİLEŞİM ═══════════
  function updateValidTargets() {
    Array.prototype.forEach.call(tubesEl.children, (el, j) => {
      el.classList.toggle('valid-target', selected !== null && selected !== j && canPour(tubes, selected, j, CAP));
    });
  }
  function select(i) {
    if (selected !== null) tubesEl.children[selected]?.classList.remove('selected');
    selected = i;
    tubesEl.children[i].classList.add('selected');
    updateValidTargets();
    GameAudio.play('tap'); GameAudio.haptic('micro');
  }
  function deselect() {
    if (selected !== null) tubesEl.children[selected]?.classList.remove('selected');
    selected = null;
    updateValidTargets();
  }
  function onTapTube(i) {
    if (animating) return;
    const tube = tubes[i];
    if (selected === null) {
      if (tube.colors.length) select(i);
      return;
    }
    if (selected === i) { deselect(); return; }
    if (canPour(tubes, selected, i, CAP)) {
      doPour(selected, i);
    } else if (tube.colors.length) {
      phShake(tubesEl.children[i]);
      select(i);
    } else {
      deselect();
    }
  }
  // Ödül merdiveni SÜREYE değil gerçek ilerlemeye bağlı: "seri" = bu seviyede
  // art arda tamamlanan tüp sayısı. Bir bulmacada düşünmek oyunun kendisidir;
  // kronometre onu cezalandırır. Tempo bunun yerine katmanlardan gelir —
  // akış animasyonu, iniş sıçraması, tüp parıltısı, nefes alan atmosfer.
  // Seri yalnızca GERİ ALMA ile sıfırlanır (hamleyi geri sarmak ilerlemeyi de
  // geri sarar); geçersiz dokunuşlar keşiftir, cezalandırılmaz.
  // Merdiven seviyeyle kendiliğinden büyür: 3 renkli seviyede en fazla x3,
  // 8 renkli seviyede combo8'e kadar çıkar.
  const COMBO_SFX = [
    { upTo: 2, sfx: 'combo2', haptic: 'match'  },
    { upTo: 4, sfx: 'combo3', haptic: 'combo3' },
    { upTo: 7, sfx: 'combo5', haptic: 'combo5' },
  ];
  function tubeSolvedFeedback(el, x, y) {
    comboCount++;
    el.classList.remove('wsrt-tube-solved'); void el.offsetWidth; el.classList.add('wsrt-tube-solved');
    phParticleBurst(document.body, x, y, 'var(--ph-success)', 10);
    // İlk tüp zaten büyük bir ödül — seri yazısı ancak ikinciden itibaren.
    if (comboCount < 2) { GameAudio.play('star'); GameAudio.haptic('star'); return; }
    const step = COMBO_SFX.find(s => comboCount <= s.upTo) || { sfx: 'combo8', haptic: 'record' };
    GameAudio.play(step.sfx); GameAudio.haptic(step.haptic);
    const r = tubesEl.getBoundingClientRect();
    phFloatText(wrapEl, `Seri x${comboCount}! 🔥`, r.left + r.width/2, r.top - 12, 'var(--ph-success)');
  }
  // Gerçek bir dökülme: kaynak ağzından hedefin ağzına düşen, yerçekimiyle
  // hızlanan ve incelen bir akış (bkz. injectCSS'teki fizik notu). phTransfer
  // (ui-kit.js) burada kullanılmıyor çünkü o jenerik "A'dan B'ye uçan obje"
  // içindir — huni şeklindeki sıvı akışı Su Sıralama'ya özel, ikinci bir
  // tüketicisi olmadan paylaşımlı katmana taşınmıyor (bkz. plan §5).
  // Tüpü YERİNDE yatırmak dökme üretemez. Sebep geometrik: bütün tüpler aynı
  // zemine oturur ve dibinden (transform-origin: bottom center) yatan bir
  // tüpün ağzı yana savrulurken AŞAĞI da iner — yani komşusunun ağzının
  // altına. Ölçüldü: 22° yatık tüpün ağzı y=353, hedefin ağzı y=323. Sıvı
  // yukarı akmaz; akış da hedefe 50px uzakta boşluğa dökülen bir kütük
  // olarak kalıyordu.
  // Gerçek oyunların çözümü: tüp KALKAR, hedefin üstüne GİDER, orada yatar.
  // Bunun asıl kazancı ağız noktasının artık ÖLÇÜLMEMESİ — biz onu seçiyoruz
  // ve tüpü oraya götüren dönüşümü çözüyoruz. Dönmüş bir elemanın
  // getBoundingClientRect'ini okumak (eksen-hizalı kutu döndürür, üstelik
  // geçiş ortasında rastgele değer verir) tamamen ortadan kalkıyor.
  // Aynı formül bitişik tüpte de, satır kaydırmalı uzak tüpte de çalışır.
  // Açı 32° → 45°. Eski 32° sınırı bir tasarım tercihi değil, bir ÖRTBASTI:
  // sıvı katmanları tüple birlikte döndüğü için 50°'de sıvı "tüpe yapışmış
  // çapraz bir yığın" gibi görünüyordu, 32° bunu göze batmayacak kadar
  // gizleyen en büyük açıydı. Sıvı artık ters dönen kendi gövdesinde
  // (.wsrt-body) yaşıyor ve yüzeyi her açıda yatay kalıyor — dolayısıyla
  // sınırın sebebi ortadan kalktı. 45°, dolu bir tüpün ağzından sıvının
  // gerçekten boşalacağı eğim.
  // Not: açıyı artırmak gövdenin yan taşmasını da artırır (--wsrt-spill-k);
  // 3.4 katsayısı 45° için hesaplandı, daha dik bir açı ikisini birden ister.
  const POUR_TILT_DEG = 45;
  // Ağız hedefin ne kadar üstünde dursun. Düşüş mesafesi = akışın görünür
  // ömrü: 20px'te sıvı görünmeye fırsat bulamadan varıyordu.
  const POUR_MOUTH_GAP = 34;
  function pourTransform(fromEl, toEl) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const cx = a.left + a.width / 2, by = a.bottom, h = a.height;
    const targetX = b.left + b.width / 2;
    const targetY = b.top - POUR_MOUTH_GAP;
    const dir = targetX >= cx ? 1 : -1;          // hedefe doğru yat
    const rad = POUR_TILT_DEG * dir * Math.PI / 180;
    // transform-origin: bottom center ve CSS rotate (saat yönü pozitif) ile
    // ağız, döndükten sonra (cx + h·sinR, by − h·cosR) noktasına gider;
    // translate bunu istediğimiz yere taşır. Denklemi tx/ty için çözüyoruz.
    const tx = targetX - cx - h * Math.sin(rad);
    const ty = targetY - by + h * Math.cos(rad);
    return {
      css: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${POUR_TILT_DEG * dir}deg)`,
      mouth: { x: targetX, y: targetY },
      // Sıvı gövdesinin camı iptal etmesi için gereken iki değer:
      // tilt aynı açı (gövde CSS'te -1 ile çarpar), squash hacim koruması.
      tilt: POUR_TILT_DEG * dir,
      squash: Math.cos(rad),
    };
  }
  // Ağız hedefin tam üstünde olduğu için akış DİKEY düşer — açı hesabı yok.
  // Akışın NEREDE biteceği: hedefteki sıvının yüzeyi. Boş tüpte dibe kadar,
  // yarı dolu tüpte mevcut seviyeye. Eskiden sabit bir derinlikte
  // (tüp yüksekliğinin %14'ü) kesiliyordu — hedef ister boş ister dolu olsun
  // hep aynı yerde. Sonuç: sıvı akmıyor, ağzın hemen altında asılı kalıyordu.
  // Yüzey seviyesi DOM'dan değil durumdan hesaplanıyor, çünkü applyPourDOM
  // henüz çalışmadı: hedef hâlâ dökme ÖNCESİ seviyesini gösteriyor ve akış
  // da oraya inmeli.
  function pourFallY(toEl, preFillCount) {
    const ch = toEl.querySelector('.wsrt-tube-inner').getBoundingClientRect();
    return ch.bottom - (preFillCount * LAYER_PCT / 100) * ch.height;
  }
  // Düşüş mesafesi hedefin doluluğuna göre ~100px ile ~300px arasında
  // değişiyor; süre sabit kalırsa akış kâh sürünür kâh fırlar. Sabit HIZ
  // (px/ms) doğru olan: yolu uzun olan uzun akar. Alt/üst sınırlar, çok kısa
  // düşüşün göz kırpması ve çok uzununun oyalanması içindir.
  const STREAM_PX_PER_MS = 1.1;
  function streamDuration(len) {
    return Math.round(Math.min(300, Math.max(120, len / STREAM_PX_PER_MS)));
  }
  function pourStream(fromPoint, toY, colorVar, duration) {
    const len = Math.max(18, toY - fromPoint.y);
    const s = document.createElement('div');
    s.className = 'wsrt-stream';
    s.style.left = fromPoint.x + 'px';
    s.style.top = fromPoint.y + 'px';
    s.style.height = len + 'px';
    s.style.setProperty('--wsrt-stream-color', colorVar);
    s.style.transform = 'translateX(-50%) scaleY(0)';
    document.body.appendChild(s);
    // Giriş: üstten büyür — sıvının ÖN UCU aşağı düşüyor.
    requestAnimationFrame(() => {
      s.style.transitionDuration = duration + 'ms';
      s.style.transform = 'translateX(-50%) scaleY(1)';
    });
    setTimeout(() => {
      // Çıkış: kuyruk. Pivot alta geçer, üst uç aşağı doğru toplanır — yani
      // akışın arkası hedefe düşmeye devam eder. Tüm çizgiyi birden
      // söndürmek (eski .fade) "musluk kapandı" gibi duruyordu; sıvı öyle
      // davranmaz, kuyruğunu bırakır. scaleY=1 anında pivot değişimi
      // görünmez, bu yüzden sıçrama olmaz.
      // Kuyruk da aynı yolu kat ediyor, o hâlde aynı HIZDA düşmeli — sabit
      // bir süre verilirse uzun akışta kuyruk baştan hızlı, kısa akışta
      // yavaş kalıyordu (aynı akış içinde iki farklı yerçekimi).
      const tailMs = Math.round(duration * 0.7);
      s.style.transformOrigin = 'bottom center';
      s.style.transitionDuration = tailMs + 'ms';
      s.style.transform = 'translateX(-50%) scaleY(0)';
      setTimeout(() => s.remove(), tailMs + 60);
    }, duration);
  }
  // Kaynağın seviyesi akışla EŞ ZAMANLI düşsün: en üstteki birim önce, sonra
  // bir alttaki. Kademeli olması önemli — hepsini birden küçültmek katmanlar
  // arasında boşluk açardı (her biri kendi dibine doğru toplanır).
  function drainSource(innerEl, count, durMs) {
    const ls = innerEl.querySelectorAll('.wsrt-layer');
    const per = durMs / count;
    for (let j = 0; j < count; j++) {
      const el = ls[ls.length - 1 - j];
      if (el) el.style.animation = `wsrtDrain ${per.toFixed(0)}ms linear ${(j * per).toFixed(0)}ms forwards`;
    }
  }
  // Dizi: tüp hedefin üstüne GİDER (travel) → sıvı akar (stream) → tüp yerine
  // DÖNER (return). "Önce tepki, sonra sonuç": dokunuş anında tüp harekete
  // geçer, sıvı bir adım geriden gelir.
  // Akışın süresi artık sabit değil: düşeceği mesafeden hesaplanıyor
  // (bkz. streamDuration) — hedef ne kadar boşsa akış o kadar uzun sürer.
  const POUR_TRAVEL_MS = 200;
  const POUR_RETURN_MS = 190;
  function doPour(from, to) {
    const colorIdx = topRun(tubes[from]).color;
    const count = pourState(tubes, from, to, CAP);
    const fromEl = tubesEl.children[from];
    const toEl = tubesEl.children[to];
    const jewelColor = `var(--ph-jewel-${colorIdx+1}-base)`;
    const scoreDelta = count * 10;

    // pourState `tubes`'u ANINDA değiştirir, applyPourDOM ise akış bitince
    // çalışır. Bu aralıkta girdi açık kalırsa ikinci bir hamle, DOM'u henüz
    // güncellenmemiş bir tahta üzerinde işlem yapar (durum ile DOM ayrışır).
    // Dökmeler zaten sıralıdır (bkz. WATER_SORT.md §17) — tüm dizi boyunca kilitle.
    animating = true;
    score += scoreDelta;
    history.push({from, to, count, colorIdx, scoreDelta});
    updateGameScore(score);

    // Dönüşüm, tüpler HENÜZ hareketsizken çözülür — hem kaynak hem hedef
    // dik ve yerli yerinde, yani ölçüm her zaman temiz.
    const { css: travelCss, mouth, tilt, squash } = pourTransform(fromEl, toEl);
    fromEl.style.zIndex = '5';                       // komşuların üstünden geçsin
    fromEl.style.transition = `transform ${POUR_TRAVEL_MS}ms var(--ph-ease-decel)`;
    fromEl.style.transform = travelCss;
    // Cam yatar, sıvı yatmaz: gövde aynı açıyı ters yönde uygular. İki geçiş
    // BİLEREK farklı sürede/eğride (bkz. --wsrt-slosh-*) — aradaki fark
    // sıvının kendi ağırlığıyla geriden gelip savrularak oturması demek.
    fromEl.classList.add('wsrt-pouring');
    fromEl.classList.remove('wsrt-returning');   // gidiş eğrisine geri dön
    fromEl.style.setProperty('--wsrt-tilt', tilt + 'deg');
    fromEl.style.setProperty('--wsrt-squash', squash.toFixed(4));
    // Cam ve sıvı ayrı ses kimlikleri alır: tüp kalkar kalkmaz kısa, kristal
    // bir "snap", sıvı gerçekten akmaya başladığında 'pour' — ses de görsel
    // "önce tepki, sonra sonuç" sırasını takip eder.
    GameAudio.play('snap'); GameAudio.haptic(6);
    deselect();
    updateControlsBar();

    setTimeout(() => {
      GameAudio.play('pour'); GameAudio.haptic(10);
      // Akış hedefteki sıvının yüzeyine iner; süre o mesafeden çıkar.
      // pourState `tubes`'u zaten değiştirdi, bu yüzden dökme ÖNCESİ doluluk
      // için eklenen birimler geri çıkarılıyor — akışın inmesi gereken yer
      // hedefin ŞU ANDA görünen seviyesi.
      const fallY = pourFallY(toEl, tubes[to].colors.length - count);
      const streamMs = streamDuration(fallY - mouth.y);
      pourStream(mouth, fallY, jewelColor, streamMs);
      // Sıvı kaynaktan AKARKEN ayrılır, akış bitince değil.
      drainSource(bodyOf(fromEl), count, streamMs);
      setTimeout(() => {
        applyPourDOM(from, to, count, colorIdx);
        const won = isWin(tubes, CAP);
        fromEl.style.transition = `transform ${POUR_RETURN_MS}ms var(--ph-ease-standard)`;
        fromEl.style.transform = '';
        // Sıvı da doğrulur — yine geriden, yine savrularak. Dönüşte salınımın
        // kuyruğu tüpün oturmasından ~60ms sonra biter; kilit tüple birlikte
        // açılır, kuyruk için oyuncuyu bekletmeye gerek yok.
        // Sınıf, gövdeye dönüş bacağının eğrisini verir (bkz. injectCSS) —
        // tilt değişmeden ÖNCE eklenmeli, yoksa geçiş eski eğriyle başlar.
        fromEl.classList.add('wsrt-returning');
        fromEl.style.setProperty('--wsrt-tilt', '0deg');
        fromEl.style.setProperty('--wsrt-squash', '1');
        setTimeout(() => {
          fromEl.style.zIndex = '';
          fromEl.style.transition = '';
          // 'wsrt-returning' BİLEREK burada kaldırılmıyor: gövdenin dönüş
          // geçişi (220ms) tüpünkinden (190ms) uzun, sınıfı şimdi almak
          // geçişi tam ortasında farklı bir eğriye çevirirdi. Boşta durması
          // zararsız (eğri yalnızca tilt değişince iş görür, o da 0'da) —
          // bir sonraki dökme başlarken temizleniyor.
          fromEl.classList.remove('wsrt-pouring');
          // Kilit ancak tüp gerçekten yerine oturunca açılır — bir sonraki
          // dökmenin ölçümü hareketli bir tüpü yakalamamalı.
          // Kazanıldıysa hiç açılmaz: tahta kutlama/geçiş boyunca donuk kalır.
          if (!won) animating = false;
        }, POUR_RETURN_MS);

        const r = toEl.getBoundingClientRect();
        // İniş "sıçraması" — akışın hedefe değdiği an birkaç damla saçılır.
        phParticleBurst(document.body, r.left + r.width/2, r.top, jewelColor, 8);
        phFloatText(wrapEl, `+${scoreDelta}`, r.left + r.width/2, r.top, 'var(--ph-success)');

        if (isTubeSolved(tubes[to], CAP)) tubeSolvedFeedback(toEl, r.left + r.width/2, r.top + r.height/2);
        if (won) setTimeout(onLevelComplete, 300);
      }, streamMs);
    }, POUR_TRAVEL_MS);
  }
  function undoOne(bulk) {
    if (!history.length) return;
    const move = history.pop();
    transferUnits(tubes, move.to, move.from, move.count);
    score -= move.scoreDelta;
    if (!bulk) applyPourDOM(move.to, move.from, move.count, move.colorIdx);
  }
  function undoLast() {
    if (!history.length || animating) return;
    deselect();
    undoOne(false);
    updateGameScore(score);
    updateControlsBar();
    comboCount = 0;
    undosUsedThisLevel++;
    GameAudio.play('slide'); GameAudio.haptic('soft');
  }
  // Dökme sırasında yeniden başlatma yok (durum yarı yolda değişiyor olurdu);
  // ama geçmiş boşken de render() çalışır — tahta zaten başlangıçtaysa bile
  // dokunuş görünür bir karşılık verir ve DOM durumdan yeniden kurulur.
  function restartLevel() {
    if (animating) return;
    while (history.length) undoOne(true);
    selected = null;
    comboCount = 0;
    undosUsedThisLevel = 0;
    updateGameScore(score);
    render();
    GameAudio.play('button'); GameAudio.haptic('soft');
  }

  // ═══════════ SEVİYE İLERLEMESİ ═══════════
  // Yıldız derecesi geri-alma sayısına dayanır — 3★ hiç geri alınmadan,
  // 2★ 1-2 geri almayla, 1★ daha fazlasıyla. Ödül sayacı (0→bonus) yerel
  // bir rAF döngüsüyle dais üzerinde oynatılır, ardından paylaşımlı
  // phShowCelebration'a NİHAİ metin geçilir — ui-kit.js'e dokunulmuyor
  // (bkz. plan §5: paylaşımlı katman yalnızca gerçek ikinci tüketici
  // çıktığında büyür).
  function starsForLevel() {
    if (undosUsedThisLevel === 0) return 3;
    if (undosUsedThisLevel <= 2) return 2;
    return 1;
  }
  function countUpAndCelebrate(bonus, stars) {
    const el = document.createElement('div');
    el.className = 'wsrt-countup';
    wrapEl.appendChild(el);
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = '+' + bonus;
      finish();
      return;
    }
    const dur = 550, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = '+' + Math.round(bonus * eased);
      if (p < 1) { requestAnimationFrame(tick); return; }
      finish();
    }
    function finish() {
      setTimeout(() => {
        el.remove();
        const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        phShowCelebration({
          title: `Seviye ${level+1} Tamam!`,
          subtitle: `${starStr}  +${bonus} bonus`,
          sfx: 'win',
        }).then(() => {
          level++;
          localStorage.setItem('ph_watersort_level', String(level));
          loadLevel(level);
        });
      }, 200);
    }
    requestAnimationFrame(tick);
  }
  function onLevelComplete() {
    const bonus = 50 + tubes.length * 20;
    score += bonus;
    updateGameScore(score);
    GameAudio.play('star'); GameAudio.haptic('star');
    countUpAndCelebrate(bonus, starsForLevel());
  }
  function loadLevel(lv) {
    level = lv;
    tubes = generateLevel(lv);
    history = [];
    selected = null;
    animating = false;
    comboCount = 0;
    undosUsedThisLevel = 0;
    render();
  }

  // ═══════════ YAŞAM DÖNGÜSÜ ═══════════
  // Oynanış sırasında canlı skor sayacı gösterilmiyor — referans analizi
  // (bkz. plan) skorun yalnızca seviye tamamlandığında görünmesinin
  // oyuncunun dikkatini tüplerde tuttuğunu gösteriyor. Paylaşımlı başlık
  // elemanı (#game-score, index.html) app.js değiştirilmeden, yalnızca
  // bu oyunun yaşam döngüsü boyunca gizlenip geri getiriliyor.
  // Atmosfer katmanı wrapEl'in KARDEŞİ olarak eklenir (içine değil) —
  // render() her seviye/restart'ta wrapEl.innerHTML'i tamamen değiştirir;
  // zerreler wrapEl dışında yaşadığı için bu sıfırlamadan etkilenmez.
  // Sahne, oyuncu hiçbir şey yapmadan ÖNCE canlı olmalı (bkz. tasarım
  // felsefesi: ilk kare yaşamalı). Dört derinlik katmanı, hepsi de bilerek
  // düşük kontrast: en uzakta yıldızlar, sonra huzmeler, sis, en yakında
  // süzülen zerreler. Hiçbiri tüplerle yarışmaz — sahne onlar değil.
  function buildAtmosphere() {
    container.style.position = container.style.position || 'relative';
    atmosphereEl = document.createElement('div');
    atmosphereEl.className = 'wsrt-atmosphere';

    // Hilal ay + uzak dağ silüetleri — gökyüzünü doldurur, üstteki ölü
    // boşluğu kapatır (referanstaki kompozisyon). Konumları/şekilleri CSS'te.
    const moon = document.createElement('div'); moon.className = 'wsrt-moon';
    const rangeFar = document.createElement('div'); rangeFar.className = 'wsrt-range far';
    const rangeNear = document.createElement('div'); rangeNear.className = 'wsrt-range near';
    atmosphereEl.appendChild(moon);
    atmosphereEl.appendChild(rangeFar);
    atmosphereEl.appendChild(rangeNear);

    // Yıldızlar — üst yarıya dağılır; alt yarı tüplerin alanı. Sayı 34'ten
    // 22'ye indi: her yıldız ayrı bir compositor katmanı, 34 tanesi gökyüzünü
    // doldurmaktan çok GPU'yu yoruyordu; 22 tane aynı yoğunluğu veriyor.
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('div');
      s.className = 'wsrt-star';
      const size = 1 + Math.random() * 1.8;
      s.style.width = size + 'px'; s.style.height = size + 'px';
      s.style.left = (2 + Math.random() * 96) + '%';
      s.style.top = (1 + Math.random() * 62) + '%';
      s.style.animationDuration = (2600 + Math.random() * 3400) + 'ms';
      s.style.animationDelay = (-Math.random() * 5000) + 'ms';
      atmosphereEl.appendChild(s);
    }
    // Işık huzmeleri — üstten süzülen iki geniş koni, farklı tempoda nefes alır.
    [{ left: 16, w: 42, dur: 11000, delay: 0 }, { left: 54, w: 36, dur: 15000, delay: -6000 }].forEach(b => {
      const el = document.createElement('div');
      el.className = 'wsrt-beam';
      el.style.left = b.left + '%';
      el.style.width = b.w + '%';
      el.style.height = '78%';
      el.style.animationDuration = b.dur + 'ms';
      el.style.animationDelay = b.delay + 'ms';
      atmosphereEl.appendChild(el);
    });
    // Uzak sis — tüplerin dibini saran bantlar: hem "bir zeminde duruyorlar"
    // hissini verir hem de alt üçte biri boş bırakmaz (sahne, tüplerin
    // bittiği yerde bitmemeli).
    [{ bottom: 2, h: 30, dur: 17000, delay: 0 },
     { bottom: 14, h: 22, dur: 23000, delay: -9000 },
     { bottom: 26, h: 16, dur: 29000, delay: -14000 }].forEach(m => {
      const el = document.createElement('div');
      el.className = 'wsrt-mist-band';
      el.style.bottom = m.bottom + '%';
      el.style.height = m.h + '%';
      el.style.animationDuration = m.dur + 'ms';
      el.style.animationDelay = m.delay + 'ms';
      atmosphereEl.appendChild(el);
    });
    // Zerreler — §17 partikül bütçesi: sürekli ama düşük sayıda.
    for (let i = 0; i < 9; i++) {
      const m = document.createElement('div');
      m.className = 'wsrt-mote';
      m.style.left = (6 + Math.random() * 88) + '%';
      m.style.bottom = (Math.random() * 50) + '%';
      m.style.setProperty('--mote-dx', (Math.random() * 34 - 17) + 'px');
      m.style.animationDuration = (6000 + Math.random() * 5000) + 'ms';
      m.style.animationDelay = (-Math.random() * 6000) + 'ms';
      atmosphereEl.appendChild(m);
    }
    // Ateşböcekleri — alt bölgeyi (zemin) dolduran iri, sıcak parçacıklar.
    // Referanstaki dip köşe parıltıları: sahne tüplerin altında bitmiyor.
    for (let i = 0; i < 10; i++) {
      const f = document.createElement('div');
      f.className = 'wsrt-firefly';
      const size = 2.5 + Math.random() * 3;
      f.style.width = size + 'px'; f.style.height = size + 'px';
      f.style.left = (4 + Math.random() * 92) + '%';
      f.style.top = (74 + Math.random() * 22) + '%';   // alt %25'lik zemin bölgesi
      f.style.setProperty('--ff-dx', (Math.random() * 24 - 12) + 'px');
      f.style.setProperty('--ff-dy', (-10 - Math.random() * 22) + 'px');
      f.style.animationDuration = (3800 + Math.random() * 3600) + 'ms';
      f.style.animationDelay = (-Math.random() * 5000) + 'ms';
      atmosphereEl.appendChild(f);
    }
    container.appendChild(atmosphereEl);
  }
  function init(c) {
    container = c;
    score = 0;
    // Sıcak/gece sahnesi sadece bu oyun aktifken #game-container'ı kaplar —
    // diğer oyunların koyu-tema varsayımına dokunmadan, cleanup()'ta geri
    // alınıyor (bkz. injectCSS #game-container.wsrt-scene).
    container.classList.add('wsrt-scene');
    injectCSS();
    buildAtmosphere();
    wrapEl = document.createElement('div'); wrapEl.className = 'wsrt-wrap';
    container.appendChild(wrapEl);
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = 'none';
    // Müzik artık tüm oyunlarda otomatik başlamıyor (bkz. app.js playGame()) —
    // bu oyuna özel durdurma çağrısına gerek kalmadı.
    const savedLevel = parseInt(localStorage.getItem('ph_watersort_level') || '0', 10);
    loadLevel(savedLevel);
  }
  function cleanup() {
    clearEvs();
    animating = false;
    if (container) container.classList.remove('wsrt-scene');
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = '';
  }

  return { init, cleanup };
})();


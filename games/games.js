/* ============================================
   GameHup — Puzzle Oyunları
   6 tam oynanabilir puzzle oyunu
   ============================================ */

const PuzzleGames = {};

// ═══════════════════════════════════════════════════════════════
//  EKONOMİ SABİTLERİ — tek kaynak app.js'teki EconomyConfig
// ═══════════════════════════════════════════════════════════════
// Değer ÇAĞRI ANINDA okunuyor, modül değerlendirilirken DEĞİL: yükleme
// sırası games.js → ui-kit → reels → daily → app.js, yani bu dosya
// çalışırken EconomyConfig henüz tanımlı değil. Üstte `const X =
// EconomyConfig.Y` yazmak ReferenceError verir.
//
// Yedek değer şart: tools/level-metrics.js games.js'i tek başına, bir vm
// sandbox'ında yükler — orada kabuk hiç yok.
function econ(key, fallback) {
  return (typeof EconomyConfig !== 'undefined' && EconomyConfig[key] != null)
    ? EconomyConfig[key]
    : fallback;
}

// ═══════════════════════════════════════════════════════════════
//  EVRENSEL OYUN OLAYLARI — tek kaynak app.js'teki GameEvents
// ═══════════════════════════════════════════════════════════════
// econ() ile AYNI iki gerekçe: (1) app.js bu dosyadan sonra yükleniyor,
// yani çağrı anında bakılmalı; (2) tools/*.js games.js'i kabuksuz bir vm
// sandbox'ında çalıştırıyor, orada GameEvents hiç yok.
//
// try/catch bilerek: olay sistemi oynanışın YANINDA duruyor, önünde değil.
// Bir görev/rozet dinleyicisinin hatası oyunu asla düşürmemeli.
//
// KULLANIM (tam sözleşme):
//   gameEvent('game_started', { gameId })
//   gameEvent('game_ended',   { gameId, result:'won'|'lost'|'quit', score?, durationMs? })
// 'quit' oyunlardan YAYINLANMAZ — onu kabuk (exitGame) ve turu kendi
// kendine devralan yeni bir game_started üretir.
function gameEvent(name, payload) {
  if (typeof GameEvents === 'undefined') return;
  try { GameEvents.emit(name, payload); } catch (e) {}
}

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
    // opts.pitch — perde çarpanı (varsayılan 1).
    // 2048'de birleşme perdesi karo kademesiyle yükseliyor: sayı rampasına
    // birebir eşlik eden bir ses rampası. Örnek dosyalarla bu 11 ayrı kayıt
    // gerektirirdi; sentezle tek parametre. Çağıran taraf opts vermezse
    // ses aynen eskisi gibi çalar (geriye dönük uyumlu).
    merge: (o) => {
      const p = (o && o.pitch) || 1;
      _osc('sine', [400 * p, 680 * p], 0.12, 0.13, 0);
      _osc('triangle', [320 * p, 560 * p], 0.1, 0.07, 0.015);
      _osc('sine', 880 * p, 0.08, 0.04, 0.06);
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
  // SlySwipe için yeni bir müzik sistemi tasarlanınca bu guard kalkacak;
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
  // ═══════════════════════════════════════════════════════════════
  //  2048 — "Arcane Night"
  // ═══════════════════════════════════════════════════════════════
  // MİMARİ NOTU (bu oyunun en önemli kararı):
  // Eski sürüm her hamlede innerHTML'i baştan yazıyordu, bu yüzden
  // karolar kayamıyor, ışınlanıyordu. Artık ızgara STATİK hücrelerden
  // oluşuyor ve karolar onun ÜSTÜNDE mutlak konumlu, KİMLİĞİ OLAN
  // elemanlar. Her karo hamleler boyunca aynı DOM elemanı kalıyor;
  // değişen tek şey transform. Kayma animasyonunu mümkün kılan tek şey
  // budur — kimlik olmadan tarayıcı neyin nereye gittiğini bilemez.
  //
  // Birleştirme matematiği ESKİ SÜRÜMDEN korundu: 1296 kombinasyonda
  // referans uygulamayla birebir aynı sonucu verdiği doğrulanmıştı.
  // Değişen yalnızca bunun etrafındaki her şey.

  const SIZE = 4;
  const WIN_TILE = 2048;
  const GAP = 8;                    // hücreler arası boşluk (px)

  // Faz zamanlamaları. Kayma 140→115ms'e çekildi: oyunun "durgun"
  // hissetmesinin en doğrudan sebebi buydu. Commit kaymanın SONUNDAN
  // biraz önce çalışıyor (SLIDE_MS - COMMIT_LEAD), böylece birleşme
  // "pop"u kaymanın kuyruğuyla örtüşüyor ve hamle tek bir hareket gibi
  // okunuyor — arka arkaya iki ayrı animasyon gibi değil.
  const SLIDE_MS = 115;
  const POP_MS = 170;
  const COMMIT_LEAD = 25;
  // İz yalnızca UZUN hareketlerde: her kayan karo iz bırakırsa tahta
  // bulanır ve hız hissi yerine kirlilik oluşur.
  const TRAIL_MIN_CELLS = 2;

  // Bir bedava geri alma. Sonrası reklam veya elmas — böylece geri alma
  // "hata yapmanın bedeli yok" demeye dönüşmüyor, bir kaynak oluyor.
  const FREE_UNDOS = 1;
  // Bedel EconomyConfig'ten okunuyor (fonksiyon, sabit değil — yükleme
  // sırası, bkz. dosya başındaki econ()).
  const undoCost = () => econ('UNDO_DIAMONDS', 15);
  const HISTORY_MAX = 8;
  const MILESTONES = [512, 1024, 2048];

  let container, wrapEl, boardEl, cellsEl, tilesEl, atmoEl, placeEl;
  let scoreEl, bestEl, undoBtn;
  let grid;            // grid[y][x] → tile | null
  let tiles;           // aktif tile nesneleri
  let nextId, score, best, won, dead;
  let cellPx = 0;
  let commitTimer = null, pendingCommit = null;
  let resizeObs = null;
  let history, undosLeft, seenMilestones;
  let scoreShown, scoreRaf = null, scoreSafety = null;

  // ── Renk rampası ──
  // Klasik 2048 ilerlemesinin YAPISI korundu (açık → sıcak → altın →
  // serin), ama tonlar platformun premium diline çekildi ve zirve
  // MENEKŞEYE bağlandı: 2048'e ulaşmak SlySwipe'ın kendi imza rengine
  // varmak oluyor. Renk yolculuğu markanın yaşadığı yerde bitiyor.
  // 2048'in ÖTESİ de rampanın parçası: devam etmeyi özellik yaptıysak
  // devam etmenin görsel karşılığı olmalı. 65536+ tek "super" tonuna
  // düşer — oraya varan oyuncu için renk artık ayırt edici değil, sayı.
  const TIERS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

  function tierIndex(v) {
    const i = TIERS.indexOf(v);
    return i === -1 ? TIERS.length : i;      // 4096+ → "super"
  }

  function injectCSS() {
    injectStyle('css-2048', `
      #game-container.g2-arcane{
        /* ── Karo rampası — oyun kapsamında (§20.4) ──
           İki kural rampayı yönetiyor:

           1. PARLAKLIK KADEMEYLE ARTAR. Önceki hâlde 2 ve 4 karoları
              koyu tahtadaki EN parlak nesnelerdi; yani en önemsiz karolar
              en çok bağırıyordu ve göz sürekli gürültüye çekiliyordu.
              Artık düşük karolar ay ışığında sönük taş gibi geri
              çekiliyor, kazanım karoları öne çıkıyor.
           2. YOLCULUK MENEKŞEDE BİTMİYOR, ORADA DÖNÜYOR. 2048 tek
              IŞIYAN karo (aşağıdaki .v2048 kuralına bak) — varış noktası
              olduğu oradan anlaşılıyor. Ötesi söndürülmüyor, başka bir
              yöne açılıyor: indigo → magenta → gül → ay beyazı. */

        /* Sönük taş — okunur ama sessiz. Ay ışığında geri çekilir. */
        --g2-2-a:#B9B2C8;    --g2-2-b:#A29AB4;    --g2-2-ink:#332E42;
        --g2-4-a:#C7BEC9;    --g2-4-b:#B0A5B1;    --g2-4-ink:#332E42;
        /* Isınma — kehribar */
        --g2-8-a:#D79A6B;    --g2-8-b:#C07E4A;    --g2-8-ink:#FFF6E9;
        --g2-16-a:#D8894F;   --g2-16-b:#C06B34;   --g2-16-ink:#FFF6E9;
        /* Mercan */
        --g2-32-a:#D4735A;   --g2-32-b:#BA553F;   --g2-32-ink:#FFF2EC;
        --g2-64-a:#CE6250;   --g2-64-b:#B24336;   --g2-64-ink:#FFF2EC;
        /* Altın — ilk gerçek kazanım hissi */
        --g2-128-a:#E0B450;  --g2-128-b:#C4942C;  --g2-128-ink:#FFFBEA;
        --g2-256-a:#EFC556;  --g2-256-b:#D3A527;  --g2-256-ink:#FFFDF0;
        /* Serinleme — yeşim, sonra gök. Komşularıyla aynı doygunlukta
           tutuldu; önceki hâlde bu ikisi rampada sert bir kopukluk
           yaratıyordu. */
        --g2-512-a:#6FBE9A;  --g2-512-b:#4E9B78;  --g2-512-ink:#F4FFFA;
        --g2-1024-a:#6BA0DC; --g2-1024-b:#4A7FBC; --g2-1024-ink:#F4FAFF;
        /* VARIŞ — platformun imza menekşesi, tek ışıyan karo. */
        --g2-2048-a:#A886FF; --g2-2048-b:#7C4FE0; --g2-2048-ink:#FBF8FF;
        /* Ötesi: sönmüyor, başka bir yöne açılıyor. Devam etmenin
           görsel ödülü buydu — önceden 4096+ hepsi tek renkti. */
        --g2-4096-a:#8E7BF2;  --g2-4096-b:#5B44C6;  --g2-4096-ink:#FBF8FF;
        --g2-8192-a:#C77BEE;  --g2-8192-b:#9A46C4;  --g2-8192-ink:#FEF8FF;
        --g2-16384-a:#E87BC4; --g2-16384-b:#C24693; --g2-16384-ink:#FFF8FC;
        --g2-32768-a:#F58BA6; --g2-32768-b:#D2557A; --g2-32768-ink:#FFF8FA;
        /* Ay beyazı — rampanın sonu, gökyüzüne dönüş. */
        --g2-super-a:#F2EEFF; --g2-super-b:#C9BEEA; --g2-super-ink:#3A3358;
      }

      /* ── Sudoku'nun MEKÂNINDAN farklı: mimari değil SU ──
         Sudoku tapınak sütunları, Water Sort dağlar kullanıyor. 2048'in
         yeri durgun bir göl: ufuk çizgisi + ayın suya düşen ışık sütunu.
         Ortak olan gökyüzü; ayırt eden şey mekân. */
      .g2-place{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
      /* Ay: soğuk inci beyazı, sarı bir top değil. Tahta ortayı
         kapladığı için gök ve su ANCAK üstte/altta kalan boşlukta
         yaşayabilir — kompozisyon buna göre kuruldu. */
      .g2-moon{position:absolute;top:2.5%;left:50%;margin-left:-14px;width:28px;height:28px;
        border-radius:50%;
        background:radial-gradient(circle at 36% 32%, #FFFDF6 0%, #EFEADA 46%, #CFC7C0 100%);
        box-shadow:0 0 26px 8px rgba(232,236,255,.16), inset -3px -3px 6px rgba(150,140,160,.32)}

      /* SU — konteynerin ALT şeridi. Yüzde yerine alta sabitlendi ki
         konteyner boyu değişince kompozisyon bozulmasın. */
      .g2-water{position:absolute;left:0;right:0;bottom:0;height:20%;
        background:linear-gradient(180deg, rgba(120,110,210,.1) 0%, rgba(30,24,70,.34) 55%, rgba(14,12,42,.5) 100%)}
      /* Ufuk: göğü sudan ayıran ince aydınlık şerit — suyun üst kenarı. */
      .g2-horizon{position:absolute;left:0;right:0;bottom:20%;height:1px;
        background:linear-gradient(90deg, transparent, rgba(200,190,255,.26) 28%, rgba(224,216,255,.44) 50%, rgba(200,190,255,.26) 72%, transparent)}
      /* Ayın suya düşen ışık yolu: ufuktan AŞAĞI doğru genişleyen,
         yavaşça nefes alan bir sütun. Bu oyunun imzası ve Sudoku'nun
         mimari mekânından ayıran şey. */
      .g2-glimmer{position:absolute;left:50%;margin-left:-30px;bottom:0;width:60px;height:20%;
        background:linear-gradient(180deg, rgba(246,240,214,.4) 0%, rgba(206,198,255,.14) 55%, transparent 100%);
        filter:blur(7px);transform-origin:top center;
        animation:g2Glimmer 7s ease-in-out infinite}
      @keyframes g2Glimmer{
        0%,100%{opacity:.45;transform:scaleX(1)}
        50%    {opacity:.8;transform:scaleX(1.3)}
      }

      .g2-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:var(--ph-space-4);width:100%;max-width:430px;min-height:100%;
        margin:0 auto;padding:var(--ph-space-4) var(--ph-space-3)}
      .g2-wrap *{box-sizing:border-box}

      /* ── Skor kapsülleri ── */
      .g2-scores{display:flex;gap:var(--ph-space-3);width:100%;max-width:340px}
      .g2-score{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
        padding:9px 6px;border-radius:var(--ph-radius-md);
        background:linear-gradient(180deg, rgba(126,110,220,.2) 0%, rgba(34,30,80,.44) 62%, rgba(20,18,54,.52) 100%);
        border:1px solid rgba(180,165,255,.2);
        box-shadow:0 6px 18px -8px rgba(4,6,22,.9), inset 0 1px 0 rgba(205,195,255,.24)}
      .g2-score-lbl{font:600 9px/1 'Fraunces',serif;letter-spacing:.16em;text-transform:uppercase;
        color:rgba(210,200,255,.62)}
      .g2-score-val{font:800 20px/1 var(--ph-font-display);
        font-variant-numeric:var(--ph-variant-numeral);color:var(--ph-scene-ink)}
      /* Yeni rekor anı oyun sonuna ertelenmemeli — anında görünür. */
      @keyframes g2BestFlash{
        0%,100%{box-shadow:0 6px 18px -8px rgba(4,6,22,.9), inset 0 1px 0 rgba(205,195,255,.24)}
        40%    {box-shadow:0 0 22px 2px rgba(246,196,90,.6), inset 0 1px 0 rgba(255,235,180,.5)}
      }
      .g2-score.flash{animation:g2BestFlash .7s var(--ph-ease-standard)}

      /* ── TAHTA ──
         Cam kaide üstünde; hücreler oyulmuş yuvalar, karolar üstte
         mutlak konumlu ayrı bir katmanda. */
      .g2-board{position:relative;width:100%;max-width:340px;aspect-ratio:1;
        padding:${GAP}px;border-radius:var(--ph-radius-lg);
        background:linear-gradient(180deg, rgba(126,110,220,.18) 0%, rgba(30,26,72,.5) 62%, rgba(18,16,50,.6) 100%);
        border:1px solid rgba(180,165,255,.18);
        box-shadow:0 26px 54px -20px rgba(4,6,22,.92), inset 0 1px 0 rgba(205,195,255,.22);
        touch-action:none;user-select:none}
      .g2-cells{position:absolute;inset:${GAP}px;display:grid;
        grid-template-columns:repeat(${SIZE},1fr);grid-template-rows:repeat(${SIZE},1fr);gap:${GAP}px}
      .g2-cell{border-radius:var(--ph-radius-sm);background:rgba(10,8,30,.34);
        box-shadow:inset 0 1px 3px rgba(0,0,0,.34)}
      .g2-tiles{position:absolute;inset:${GAP}px}

      /* ── KARO — §13 "solid block / tile" arketipi ──
         Düz üst yüzey, kalınlık ima eden alt pah, altında yumuşak gölge.
         Kullanılmamış tek arketip buydu (sıvı=Water Sort, kristal=Block
         Puzzle, parşömen=Sudoku), yani tutarlılık kendiliğinden geliyor. */
      .g2-tile{position:absolute;top:0;left:0;
        display:flex;align-items:center;justify-content:center;
        border-radius:var(--ph-radius-sm);
        font:800 26px/1 var(--ph-font-display);
        font-variant-numeric:var(--ph-variant-numeral);
        will-change:transform;
        /* Yalnızca transform geçişli: kayma GPU'da, layout tetiklenmiyor. */
        transition:transform ${SLIDE_MS}ms var(--ph-ease-decel)}
      .g2-tile.d3{font-size:22px}
      .g2-tile.d4{font-size:18px}
      .g2-tile.d5{font-size:15px}

      /* Doğuş ve birleşme: transform ANİMASYONU, geçişi değil — ikisi
         aynı özelliği kullandığı için animasyon geçişi geçici olarak
         devralır, bitince transform yine transition'a döner. */
      @keyframes g2Spawn{
        0%  {transform:translate(var(--tx),var(--ty)) scale(0)}
        100%{transform:translate(var(--tx),var(--ty)) scale(1)}
      }
      @keyframes g2Pop{
        0%  {transform:translate(var(--tx),var(--ty)) scale(1)}
        45% {transform:translate(var(--tx),var(--ty)) scale(1.18)}
        100%{transform:translate(var(--tx),var(--ty)) scale(1)}
      }
      .g2-tile.spawn{animation:g2Spawn ${POP_MS}ms var(--ph-ease-spring)}
      .g2-tile.pop{animation:g2Pop ${POP_MS}ms var(--ph-ease-spring)}
      /* Yutulan karo hayatta kalanın ALTINDA kalmalı, yoksa kayarken
         onun üstüne biner ve değeri bir an yanlış görünür. */
      .g2-tile.absorbing{z-index:0}
      .g2-tile.surviving{z-index:2}

      ${TIERS.map(v => `
      .g2-tile.v${v}{
        background:linear-gradient(180deg, var(--g2-${v}-a) 0%, var(--g2-${v}-b) 100%);
        color:var(--g2-${v}-ink);
        box-shadow:0 3px 0 rgba(0,0,0,.22), 0 7px 16px -6px rgba(0,0,0,.6),
                   inset 0 1px 0 rgba(255,255,255,.34);
      }`).join('')}
      /* 2048 rampadaki TEK ışıyan karo. Varış noktası olduğu renkten
         değil, ışıktan anlaşılır — sakin ama tartışmasız. */
      .g2-tile.v2048{
        box-shadow:0 3px 0 rgba(0,0,0,.22), 0 8px 24px -6px rgba(168,134,255,.7),
                   0 0 20px -2px rgba(168,134,255,.45),
                   inset 0 1px 0 rgba(255,255,255,.42);
      }
      /* 2048 ötesi: her kademe kendi rengiyle devam eder. */
      .g2-tile.vsuper{
        background:linear-gradient(180deg, var(--g2-super-a) 0%, var(--g2-super-b) 100%);
        color:var(--g2-super-ink);
        box-shadow:0 3px 0 rgba(0,0,0,.22), 0 8px 22px -5px rgba(226,216,255,.55),
                   inset 0 1px 0 rgba(255,255,255,.5);
      }

      /* ── Kontroller — TEK buton ──
         Mock'ta üç yuvarlak buton vardı (geri al / ipucu / duraklat).
         İpucu çıkarıldı (2048'de ipucu = oyunu oyuncu yerine oynamak),
         duraklat gereksiz (zamana karşı yarış yok). Geriye tahtadan
         dikkat çalmayan tek bir kontrol kaldı. */
      .g2-controls{display:flex;gap:var(--ph-space-3);justify-content:center;align-items:center}
      .g2-undo{position:relative;width:46px;height:46px;border-radius:var(--ph-radius-full);
        display:flex;align-items:center;justify-content:center;font-size:19px;cursor:pointer;
        background:linear-gradient(160deg, rgba(120,100,200,.34), rgba(40,32,80,.5) 70%);
        border:1px solid rgba(180,165,255,.22);color:var(--ph-scene-ink);
        box-shadow:0 4px 12px -3px rgba(4,6,20,.7), inset 0 1px 0 rgba(220,215,255,.28);
        transition:transform var(--ph-duration-micro) var(--ph-ease-standard),opacity var(--ph-duration-fast) var(--ph-ease-standard)}
      .g2-undo:active{transform:scale(.9)}
      .g2-undo.spent{opacity:.55}
      .g2-undo[disabled]{opacity:.25;pointer-events:none}
      /* Rozet: kalan bedava hak, ya da bitince maliyet. */
      .g2-undo-badge{position:absolute;bottom:-3px;right:-5px;min-width:19px;height:19px;padding:0 5px;
        border-radius:var(--ph-radius-full);display:flex;align-items:center;justify-content:center;
        font:800 10px/1 var(--ph-font-display);font-variant-numeric:var(--ph-variant-numeral);
        background:linear-gradient(180deg,#a78bfa,#7c3aed);color:#fff;
        border:1px solid rgba(220,215,255,.4);box-shadow:0 2px 6px -1px rgba(0,0,0,.6);white-space:nowrap}

      /* Geri alma teklif penceresinin stili buradan KALDIRILDI (.g2-buy*):
         pencere artık kabuktaki paylaşımlı offerRewardChoice() tarafından
         çiziliyor, stili components.css'teki .ph-offer ailesinde. Oyuna
         özel bir kopya bırakmak, iki teklif penceresinin zamanla
         ayrışması demekti (bkz. offerUndo'daki not). */

      /* ── GEÇERSİZ HAMLE — direnç ──
         Duvara doğru kaydırmak eskiden TAMAMEN sessizdi; oyuncu
         dokunuşunun algılanıp algılanmadığını bilmiyordu. Tahta hamlenin
         yönünde bir parça zorlanıp geri yaylanıyor: "gördüm, ama olmaz".
         Bilerek çok küçük (6px) ve çok kısa — hata değil, sınır bildirimi. */
      @keyframes g2Nudge{
        0%  {transform:translate(0,0)}
        38% {transform:translate(var(--nx,0),var(--ny,0))}
        100%{transform:translate(0,0)}
      }
      .g2-board.nudge{animation:g2Nudge 200ms var(--ph-ease-decel)}

      /* Dönüm noktası: tahtanın üstünde beliren kısa bir mühür.
         Bilerek küçük ve kısa — tahtanın önüne geçmemeli. */
      @keyframes g2Milestone{
        0%  {opacity:0;transform:translate(-50%,-50%) scale(.6)}
        22% {opacity:1;transform:translate(-50%,-50%) scale(1.05)}
        72% {opacity:1;transform:translate(-50%,-50%) scale(1)}
        100%{opacity:0;transform:translate(-50%,-58%) scale(1)}
      }
      .g2-milestone{position:absolute;top:50%;left:50%;pointer-events:none;z-index:5;
        padding:10px 22px;border-radius:var(--ph-radius-full);white-space:nowrap;
        font:800 21px/1 var(--ph-font-display);font-variant-numeric:var(--ph-variant-numeral);
        color:#F8F4FF;background:linear-gradient(160deg, rgba(155,114,240,.92), rgba(113,69,212,.92));
        border:1px solid rgba(200,175,255,.55);
        box-shadow:0 10px 30px -8px rgba(139,92,246,.85), inset 0 1px 0 rgba(255,255,255,.35);
        animation:g2Milestone 1.4s var(--ph-ease-standard) forwards}

      @media (prefers-reduced-motion: reduce){
        .g2-tile{transition-duration:var(--ph-duration-micro)}
        .g2-tile.spawn,.g2-tile.pop{animation:none}
        .g2-glimmer{animation:none}
        .g2-milestone{animation-duration:var(--ph-duration-medium)}
      }
    `);
  }

  // ───────── Izgara yardımcıları ─────────
  function withinBounds(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
  function cellAt(x, y) { return withinBounds(x, y) ? grid[y][x] : null; }

  function emptyCells() {
    const out = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!grid[y][x]) out.push({ x, y });
    return out;
  }

  // ───────── Karo yaşam döngüsü ─────────
  function makeTile(x, y, value) {
    const el = document.createElement('div');
    const t = { id: nextId++, x, y, value, el, mergedThisTurn: false };
    el.className = 'g2-tile';
    applyFace(t);
    positionTile(t);
    tilesEl.appendChild(el);
    grid[y][x] = t;
    tiles.push(t);
    return t;
  }

  // Görsel yüz: değer, renk sınıfı ve basamak sayısına göre punto.
  function applyFace(t) {
    const digits = String(t.value).length;
    const cls = ['g2-tile'];
    cls.push(TIERS.indexOf(t.value) === -1 ? 'vsuper' : 'v' + t.value);
    if (digits >= 5) cls.push('d5'); else if (digits === 4) cls.push('d4'); else if (digits === 3) cls.push('d3');
    t.el.className = cls.join(' ');
    t.el.textContent = t.value;
  }

  // Konum İKİ KEZ yazılıyor ve bu bilerek:
  //
  //   --tx/--ty  → spawn/pop KEYFRAME'leri için (onlar transform'u
  //                baştan yazdığı için konumu bilmek zorundalar)
  //   transform  → AÇIK piksel değeriyle, geçiş için
  //
  // Neden açık değer şart: transform hep `translate(var(--tx),var(--ty))`
  // olarak yazılsaydı, değer DİZESİ hiç değişmezdi ve CSS geçişi
  // TETİKLENMEZDİ — yalnızca içindeki değişken değişmiş olurdu. Karolar
  // kaymak yerine ışınlanırdı. (Ölçülerek bulundu: kaymanın 70. ms'inde
  // karo zaten hedefteydi.)
  function positionTile(t) {
    const px = t.x * (cellPx + GAP), py = t.y * (cellPx + GAP);
    t.el.style.setProperty('--tx', px + 'px');
    t.el.style.setProperty('--ty', py + 'px');
    t.el.style.transform = 'translate(' + px + 'px, ' + py + 'px)';
  }

  function measure() {
    if (!boardEl) return;
    const inner = boardEl.clientWidth - GAP * 2;
    cellPx = (inner - GAP * (SIZE - 1)) / SIZE;
    tilesEl.style.setProperty('--cell', cellPx + 'px');
    tiles.forEach(t => {
      t.el.style.width = cellPx + 'px';
      t.el.style.height = cellPx + 'px';
      positionTile(t);
    });
  }

  function spawnTile(animate) {
    const spots = emptyCells();
    if (!spots.length) return null;
    const spot = spots[Math.floor(Math.random() * spots.length)];
    const t = makeTile(spot.x, spot.y, Math.random() < 0.9 ? 2 : 4);
    t.el.style.width = cellPx + 'px';
    t.el.style.height = cellPx + 'px';
    if (animate) {
      t.el.classList.add('spawn');
      setTimeout(() => t.el.classList.remove('spawn'), POP_MS + 40);
    }
    return t;
  }

  // ───────── Hamle ─────────
  const VECTORS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  function buildTraversals(v) {
    const xs = [], ys = [];
    for (let i = 0; i < SIZE; i++) { xs.push(i); ys.push(i); }
    // Hareket yönündeki hücreler ÖNCE işlenmeli, yoksa karolar
    // birbirinin üstünden atlar.
    if (v.x === 1) xs.reverse();
    if (v.y === 1) ys.reverse();
    return { xs, ys };
  }

  function findFarthest(x, y, v) {
    let px, py;
    do { px = x; py = y; x += v.x; y += v.y; } while (withinBounds(x, y) && !cellAt(x, y));
    return { fx: px, fy: py, nx: x, ny: y };
  }

  // ───────── Geçmiş / Geri alma ─────────
  // Anlık görüntü sade tutuldu: değerler + skor. Karo KİMLİKLERİ
  // saklanmıyor çünkü geri alma sonrası kayma animasyonu yok — tahta
  // yeniden kuruluyor. Kimlikleri saklamak çok daha karmaşık olurdu ve
  // nadiren kullanılan bir eylem için değmez.
  function snapshot() {
    return {
      values: grid.map(row => row.map(t => (t ? t.value : 0))),
      score: score,
    };
  }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > HISTORY_MAX) history.shift();
  }

  function restore(snap) {
    tiles.forEach(t => t.el.remove());
    tiles = [];
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = snap.values[y][x];
      if (!v) continue;
      const t = makeTile(x, y, v);
      t.el.style.width = cellPx + 'px';
      t.el.style.height = cellPx + 'px';
      t.el.classList.add('spawn');
      setTimeout(() => t.el.classList.remove('spawn'), POP_MS + 40);
    }
    score = snap.score;
    scoreShown = score;
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    updateGameScore(score);
    dead = false;
  }

  function doUndo() {
    if (!history.length) return;
    flushCommit();
    restore(history.pop());
    undosLeft--;
    GameAudio.play('slide'); GameAudio.haptic('tap');
    refreshUndo();
  }

  function refreshUndo() {
    if (!undoBtn) return;
    const badge = undoBtn.querySelector('.g2-undo-badge');
    undoBtn.disabled = history.length === 0;
    if (undosLeft > 0) {
      undoBtn.classList.remove('spent');
      badge.textContent = undosLeft;
    } else {
      // Bedava hak bitti — buton maliyeti gösteriyor, gizlenmiyor.
      undoBtn.classList.add('spent');
      badge.textContent = '💎' + undoCost();
    }
  }

  // Bedava hak bittiğinde: reklam veya elmas.
  //
  // Pencerenin KENDİSİ artık burada kurulmuyor — kabuktaki paylaşımlı
  // offerRewardChoice() çiziyor. Sebebi teknik değil, ekonomik: reklam
  // hakkının kalıp kalmadığı, Premium'un reklamı atlaması ve bütçenin
  // ekranda gösterilmesi kuralları TEK yerde yaşamalı. Bu pencere kendi
  // kopyasını tutsaydı, bütçe kuralı değiştiğinde biri güncellenip diğeri
  // sessizce eski kalırdı — "UI bir limit söylüyor, kod sınırsız izletiyor"
  // hatasının kaynağı tam olarak buydu.
  function offerUndo() {
    // Kabuk yoksa (games.js'in tek başına yüklendiği test ortamı) sessizce
    // vazgeç: burada reklamsız bedava hak vermek ekonomiyi delerdi.
    if (typeof offerRewardChoice !== 'function') return;
    offerRewardChoice({
      title: 'Geri Alma',
      adText: 'Reklam İzle → +1',
      gemCost: undoCost(),
      gemText: '+1 Geri Alma',
      onGrant: () => { undosLeft++; refreshUndo(); doUndo(); }
    });
  }

  function onUndoTap() {
    if (!history.length) return;
    if (undosLeft > 0) doUndo();
    else offerUndo();
  }

  function move(dir) {
    if (dead) return;
    // Animasyon sürerken yeni hamle gelirse bekleyen işlem ANINDA
    // uygulanır. Girdiyi 320ms kilitlemek 2048'i ağır hissettirir —
    // oyuncu hızlı kaydırır ve her kaydırma sayılmalı.
    flushCommit();

    const v = VECTORS[dir];
    const { xs, ys } = buildTraversals(v);
    const merges = [];
    let moved = false;
    // Anlık görüntü hamleden ÖNCE alınır; geçerli bir hamle çıkmazsa
    // atılır, yoksa geçmiş "hiçbir şey yapmayan" adımlarla dolar.
    const before = snapshot();

    // px/py: hamleden ÖNCEKİ konum — iz bunu kullanıyor.
    tiles.forEach(t => { t.mergedThisTurn = false; t.px = t.x; t.py = t.y; });

    xs.forEach(x => ys.forEach(y => {
      const tile = cellAt(x, y);
      if (!tile) return;
      const { fx, fy, nx, ny } = findFarthest(x, y, v);
      const next = cellAt(nx, ny);

      // Bir karo hamle başına YALNIZCA BİR KEZ birleşir — mergedThisTurn
      // bunu garantiliyor. Klasik 2048 kuralı budur.
      if (next && next.value === tile.value && !next.mergedThisTurn) {
        grid[y][x] = null;
        tile.x = nx; tile.y = ny;          // yutulan karo hedefe kayar
        next.mergedThisTurn = true;
        tile.el.classList.add('absorbing');
        next.el.classList.add('surviving');
        merges.push({ survivor: next, absorbed: tile });
        moved = true;
      } else if (fx !== x || fy !== y) {
        grid[y][x] = null;
        grid[fy][fx] = tile;
        tile.x = fx; tile.y = fy;
        moved = true;
      }
    }));

    if (!moved) { nudge(v); return; }

    // Işık izleri kayma BAŞLAMADAN önce kurulur: iz, karonun geldiği
    // yolu gösterir, gittiği yeri değil.
    tiles.forEach(t => {
      if (t.px == null) return;
      const dc = Math.abs(t.x - t.px) + Math.abs(t.y - t.py);
      if (dc >= TRAIL_MIN_CELLS) layTrail(t.px, t.py, t.x, t.y);
    });

    history.push(before);
    if (history.length > HISTORY_MAX) history.shift();
    refreshUndo();

    GameAudio.play('swipe');
    tiles.forEach(positionTile);            // kayma başlar (CSS transition)
    scheduleCommit(merges);
  }

  // Kaymadan SONRA çalışan ikinci faz: yutulanları sil, değerleri
  // güncelle, yeni karo doğur, oyun durumunu kontrol et.
  function scheduleCommit(merges) {
    pendingCommit = () => applyCommit(merges);
    // Kaymanın bitişinden biraz ÖNCE: pop kaymanın kuyruğuyla örtüşür
    // ve hamle tek bir hareket gibi okunur.
    commitTimer = setTimeout(flushCommit, Math.max(SLIDE_MS - COMMIT_LEAD, 40));
  }

  function flushCommit() {
    if (!pendingCommit) return;
    clearTimeout(commitTimer);
    const fn = pendingCommit;
    pendingCommit = null; commitTimer = null;
    fn();
  }

  function applyCommit(merges) {
    let gained = 0;
    let highestMerge = 0;

    merges.forEach(({ survivor, absorbed }) => {
      absorbed.el.remove();
      tiles = tiles.filter(t => t !== absorbed);
      survivor.value *= 2;
      gained += survivor.value;
      if (survivor.value > highestMerge) highestMerge = survivor.value;
      applyFace(survivor);
      positionTile(survivor);
      survivor.el.classList.remove('surviving');
      survivor.el.classList.remove('pop');
      void survivor.el.offsetWidth;
      survivor.el.classList.add('pop');
      setTimeout(() => survivor.el.classList.remove('pop'), POP_MS + 40);

      // Enerji halkası: birleşmenin "açığa çıkan güç" tarafı. Halkanın
      // boyu ve parlaklığı kademeyle büyür, böylece 4 birleşmesiyle
      // 512 birleşmesi aynı şeyi söylemez.
      const r = survivor.el.getBoundingClientRect();
      const tier = tierIndex(survivor.value);
      phPulseRing(r.left + r.width / 2, r.top + r.height / 2, {
        color: 'rgba(198,180,255,' + Math.min(0.35 + tier * 0.05, 0.8) + ')',
        size: cellPx * (1.5 + Math.min(tier, 8) * 0.16),
        duration: 380,
      });
      // Parlama süpürmesi yalnızca ANLAMLI kademelerde (128+): her
      // birleşmede parlarsa "özel" olmaktan çıkar ve süse dönüşür.
      if (survivor.value >= 128) phGleam(survivor.el, { duration: 560, strength: 0.42 });
    });

    if (merges.length) {
      score += gained;
      updateScore();
      // Perde karo kademesiyle yükseliyor: sayı rampasına eşlik eden
      // ses rampası. 4 birleşmesi alçak, 2048 tiz.
      const pitch = 1 + tierIndex(highestMerge) * 0.085;
      GameAudio.play('merge', { pitch });
      // Hafif dokunsal geri bildirim normal birleşmede; dönüm noktası
      // karolarında güçlü. Fark hissedilir olmalı, yoksa ikisi de
      // "titreşim" olarak algılanır.
      GameAudio.haptic(highestMerge >= 512 ? 'star' : 'micro');
    }

    spawnTile(true);

    // Dönüm noktaları — HER kademede bir kez. 2048'in orta oyunu uzun ve
    // düzdür; ödülü yalnızca sona saklamak "akış" ilkesine aykırı.
    if (MILESTONES.indexOf(highestMerge) !== -1 && seenMilestones.indexOf(highestMerge) === -1) {
      seenMilestones.push(highestMerge);
      celebrateMilestone(highestMerge);
    }

    if (!hasMoves()) {
      dead = true;
      // 2048'de 2048 karosuna ULAŞMAK oyunu bitirmez, oyun sürer. Bu yüzden
      // tek bitiş noktası burasıdır ve sonucu o turda zafer karosuna
      // ulaşılıp ulaşılmadığı belirler: hedefe varmış bir oyuncuyu, sonradan
      // tahta tıkandı diye "kaybetti" saymak yanlış olurdu.
      gameEvent('game_ended', {
        gameId: 'game2048', result: won ? 'won' : 'lost', score,
      });
      GameAudio.play('lose');
      // "Devam et" = ölümcül hamleyi geri al. 2048'de anlamlı olan tek
      // devam biçimi bu; rastgele karo silmek tahtayı oyuncunun
      // kurmadığı bir duruma sokardı.
      showGameOver(false, 'Hamle Kalmadı', 'En yüksek karo: ' + enBuyukKaro(), {
        accent: '#7C4FE0', accentLight: '#A886FF', accentGlow: 'rgba(168,134,255,.7)',
        mark: '✧',
        stats: [
          { label: 'Skor', value: score.toLocaleString() },
          // Rekor bu turda kırıldıysa kapsül altın vurguyla işaretlenir.
          { label: '👑 En İyi', value: best.toLocaleString(), record: score >= best && score > 0 },
        ],
        onContinue: history.length ? () => { doUndo(); refreshUndo(); } : undefined,
      });
    }
  }

  // Kayan karonun arkasında kalan ışık. Eski ve yeni konumun kapsayıcı
  // kutusunu kaplar; gradyan KUYRUKTAN başa doğru açılır, yani izin
  // parlak ucu karonun gittiği yöndedir.
  function layTrail(px, py, x, y) {
    const step = cellPx + GAP;
    const left = Math.min(px, x) * step;
    const top = Math.min(py, y) * step;
    const w = Math.abs(x - px) * step + cellPx;
    const h = Math.abs(y - py) * step + cellPx;
    // Gradyan yönü hareket yönüne göre: kuyruk şeffaf, baş ışıklı.
    let deg = 90;
    if (x < px) deg = 270; else if (y > py) deg = 180; else if (y < py) deg = 0;
    phTrail(tilesEl, { left, top, width: w, height: h }, {
      background: 'linear-gradient(' + deg + 'deg, transparent 8%, rgba(198,188,255,.34) 92%)',
      duration: 210,
    });
  }

  // Geçersiz hamlenin karşılığı: tahta o yöne 6px zorlanıp geri döner,
  // en hafif titreşim eşlik eder. Ses YOK — her duvara dokunuşta ses
  // çıkması kısa sürede rahatsız ederdi; bu bir hata değil, sınır.
  function nudge(v) {
    if (!boardEl) return;
    boardEl.style.setProperty('--nx', (v.x * 6) + 'px');
    boardEl.style.setProperty('--ny', (v.y * 6) + 'px');
    boardEl.classList.remove('nudge'); void boardEl.offsetWidth;
    boardEl.classList.add('nudge');
    setTimeout(() => boardEl.classList.remove('nudge'), 240);
    GameAudio.haptic('micro');
  }

  function celebrateMilestone(value) {
    const isWin = value >= WIN_TILE;
    if (isWin) won = true;

    const seal = document.createElement('div');
    seal.className = 'g2-milestone';
    seal.textContent = isWin ? '2048! ✨' : value;
    boardEl.appendChild(seal);
    setTimeout(() => seal.remove(), 1500);

    const r = boardEl.getBoundingClientRect();
    phParticleBurst(document.body, r.left + r.width / 2, r.top + r.height / 2,
      'var(--ph-accent)', isWin ? 16 : 10);
    phAtmosphereFlare(atmoEl, isWin ? 2.4 : 1.7, isWin ? 700 : 500);
    GameAudio.play(isWin ? 'premium' : 'star');
    GameAudio.haptic(isWin ? 'win' : 'star');
  }

  // Bir turun asıl hikâyesi skordan çok ulaşılan en yüksek karodur.
  function enBuyukKaro() {
    return tiles.reduce((m, t) => Math.max(m, t.value), 0);
  }

  function hasMoves() {
    if (emptyCells().length) return true;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = grid[y][x].value;
      if (x < SIZE - 1 && grid[y][x + 1].value === v) return true;
      if (y < SIZE - 1 && grid[y + 1][x].value === v) return true;
    }
    return false;
  }

  // ───────── Skor ─────────
  function updateScore() {
    tweenScore();
    updateGameScore(score);
    if (score > best) {
      const wasBehind = best > 0;
      best = phHighScore('game2048', score);
      if (bestEl) bestEl.textContent = best.toLocaleString();
      // Rekorun geçildiği AN belli olmalı, oyun sonunda değil.
      // wasBehind koşulu: ilk oyunda skor sıfırdan büyüdüğü an sürekli
      // parlamasın, yalnızca GERÇEK bir rekor kırıldığında parlasın.
      if (wasBehind && bestEl) {
        const card = bestEl.closest('.g2-score');
        card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      }
    }
  }

  // Skor zıplamaz, SAYAR. Puanın kazanıldığı hissi rakamın yolculuğunda.
  // Gizli sekmede rAF çalışmaz; o durumda değer doğrudan oturur — bu
  // kabul edilebilir, çünkü kimse bakmıyor.
  function tweenScore() {
    if (!scoreEl) return;
    // ÖNCEKİ tween'in hem karesi hem güvenlik zamanlayıcısı iptal edilir.
    // Zamanlayıcıyı iptal etmemek kalıcı bir hataya yol açıyordu: eski
    // zamanlayıcı, yeni tween çalışırken ateşleyip onun karesini iptal
    // ediyor ve skoru ESKİ hedefe yazıyordu; ardından yeni zamanlayıcı
    // "kare yok" diye erken çıkıyor ve gösterge kalıcı olarak geride
    // kalıyordu. (Ölçüldü: başlık 308 iken kapsül 284'te takılı kaldı.)
    if (scoreRaf) { cancelAnimationFrame(scoreRaf); scoreRaf = null; }
    if (scoreSafety) { clearTimeout(scoreSafety); scoreSafety = null; }

    const from = scoreShown, to = score, t0 = performance.now(), dur = 320;
    if (from === to) { scoreEl.textContent = to.toLocaleString(); return; }

    // Bitiş DAİMA güncel `score`'u yazar, bu çağrının yakaladığı `to`'yu
    // değil — böylece arada yeni puan gelse bile gösterge doğruya oturur.
    const finish = () => {
      if (scoreRaf) { cancelAnimationFrame(scoreRaf); scoreRaf = null; }
      scoreSafety = null;
      scoreShown = score;
      scoreEl.textContent = score.toLocaleString();
    };
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      // Hızlı başlayıp yavaşlayan: son rakamlar okunabilsin.
      const eased = 1 - Math.pow(1 - k, 3);
      scoreShown = Math.round(from + (to - from) * eased);
      scoreEl.textContent = scoreShown.toLocaleString();
      if (k < 1) scoreRaf = requestAnimationFrame(step);
      else { scoreRaf = null; finish(); }
    };
    scoreRaf = requestAnimationFrame(step);
    // Güvenlik ağı: rAF hiç çalışmazsa (gizli sekme) değer yine de otursun.
    scoreSafety = setTimeout(finish, dur + 120);
  }

  // ───────── Sahne ─────────
  function buildPlace() {
    placeEl = document.createElement('div');
    placeEl.className = 'g2-place';
    ['g2-water', 'g2-glimmer', 'g2-horizon', 'g2-moon'].forEach(c => {
      const d = document.createElement('div'); d.className = c; placeEl.appendChild(d);
    });
    container.appendChild(placeEl);
  }

  // ───────── Yaşam döngüsü ─────────
  function init(c) {
    container = c;
    score = 0; scoreShown = 0; won = false; dead = false; nextId = 1;
    tiles = []; history = []; seenMilestones = [];
    undosLeft = FREE_UNDOS;
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    best = phHighScore('game2048');
    gameEvent('game_started', { gameId: 'game2048' });

    container.classList.add('ph-scene', 'g2-arcane');
    injectCSS();

    // Atmosfer Sudoku'dan KISIK: 2048'de göz sürekli tahtayı tarıyor,
    // arka planda hareket eden her şey o taramaya rakip oluyor.
    atmoEl = phAtmosphere(container, { stars: 14, beams: 1, motes: 4, skyPct: 30 });
    buildPlace();

    wrapEl = document.createElement('div');
    wrapEl.className = 'g2-wrap';
    wrapEl.innerHTML =
      '<div class="g2-scores">' +
        '<div class="g2-score"><span class="g2-score-lbl">Skor</span>' +
          '<span class="g2-score-val" data-role="score">0</span></div>' +
        '<div class="g2-score"><span class="g2-score-lbl">👑 En İyi</span>' +
          '<span class="g2-score-val" data-role="best">0</span></div>' +
      '</div>' +
      '<div class="g2-board" data-role="board">' +
        '<div class="g2-cells" data-role="cells"></div>' +
        '<div class="g2-tiles" data-role="tiles"></div>' +
      '</div>' +
      '<div class="g2-controls">' +
        '<button class="g2-undo" data-role="undo" title="Geri al">↺' +
          '<span class="g2-undo-badge"></span></button>' +
      '</div>';
    container.appendChild(wrapEl);

    boardEl = wrapEl.querySelector('[data-role="board"]');
    cellsEl = wrapEl.querySelector('[data-role="cells"]');
    tilesEl = wrapEl.querySelector('[data-role="tiles"]');
    scoreEl = wrapEl.querySelector('[data-role="score"]');
    bestEl = wrapEl.querySelector('[data-role="best"]');
    undoBtn = wrapEl.querySelector('[data-role="undo"]');
    bestEl.textContent = best.toLocaleString();
    addEv(undoBtn, 'click', onUndoTap);
    refreshUndo();

    for (let i = 0; i < SIZE * SIZE; i++) {
      const d = document.createElement('div'); d.className = 'g2-cell'; cellsEl.appendChild(d);
    }

    // Ölçüm SENKRON yapılıyor: eleman DOM'a eklendiği için clientWidth
    // zaten okunabilir (tek bir layout tetikler, kabul edilebilir).
    // requestAnimationFrame KULLANILMIYOR — sekme arka plandayken rAF
    // çalışmaz ve oyun hiç karo doğurmadan açılırdı.
    measure();
    spawnTile(true);
    spawnTile(true);

    // Tahta yeniden boyutlanınca (döndürme, klavye açılışı) karoların
    // piksel konumları yeniden hesaplanmalı.
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => measure());
      resizeObs.observe(boardEl);
    }

    phSwipe(boardEl, move);
    // Klavye BİLEREK sessiz: hiçbir ipucu gösterilmiyor, mobil deneyimi
    // etkilemiyor; yalnızca masaüstü PWA'da ve testte işe yarıyor.
    addEv(document, 'keydown', onKey);
  }

  function onKey(e) {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  }

  function cleanup() {
    clearEvs();
    flushCommit();
    if (scoreRaf) { cancelAnimationFrame(scoreRaf); scoreRaf = null; }
    if (scoreSafety) { clearTimeout(scoreSafety); scoreSafety = null; }
    document.querySelectorAll('.ph-modal-scrim').forEach(s => s.remove());
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    if (placeEl) { placeEl.remove(); placeEl = null; }
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) container.classList.remove('ph-scene', 'g2-arcane');
  }

  // Kabuğa bildirim: skor göstergesini bu oyun kendi çiziyor, başlıktaki
  // kopyası gizlensin (aynı sayı iki yerde görünmemeli).
  return { init, cleanup, ownsScoreDisplay: true };
})();

// ╔══════════════════════════════════════╗
// ║       2. HAFIZA OYUNU                ║
// ╚══════════════════════════════════════╝
PuzzleGames.memoryGame = (() => {
  const EMOJIS = ['🎮','🎲','🎯','🏆','⚽','🎸','🚀','🌟'];
  let cards, flipped, matched, moves, locked, container;

  function init(c) {
    container = c; moves = 0; matched = 0; locked = false; flipped = [];
    gameEvent('game_started', { gameId: 'memoryGame' });
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
        if (matched === EMOJIS.length) { GameAudio.play('win'); GameAudio.haptic(25);
          // Skor oynanış boyunca updateGameScore ile aynı formülden yazılıyor;
          // olaya da o değer gidiyor ki iki yer birbirinden ayrışmasın.
          gameEvent('game_ended', {
            gameId: 'memoryGame', result: 'won', score: Math.max(1000 - moves * 20, 100),
          });
          showGameOver(true, 'Eşleştirme Tamamlandı', 'Tüm kartları eşledin.', {
          accent: 'var(--ph-jewel-2-shadow)',
          accentLight: 'var(--ph-jewel-2-highlight)',
          accentGlow: 'var(--ph-jewel-2-glow)',
          mark: '✦',
          stats: [
            { label: 'Hamle', value: moves },
            { label: 'Eşleşme', value: matched + '/' + EMOJIS.length },
          ],
        }); }
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
    gameEvent('game_started', { gameId: 'wordSearch' });
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
      if (found.length === placed.length) { GameAudio.play('win'); GameAudio.haptic(25);
        gameEvent('game_ended', {
          gameId: 'wordSearch', result: 'won', score: found.length * 100,
        });
        showGameOver(true, 'Kelimeler Bulundu', 'Gizli kelimelerin hepsini buldun.', {
          accent: 'var(--ph-jewel-4-shadow)',
          accentLight: 'var(--ph-jewel-4-highlight)',
          accentGlow: 'var(--ph-jewel-4-glow)',
          mark: '✦',
          stats: [
            { label: 'Kelime', value: found.length + '/' + placed.length },
            { label: 'Skor', value: (found.length * 100).toLocaleString() },
          ],
        }); }
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
  // Hata bütçesi. Klasik sudokudan bilinçli bir ayrılış: yanlış hamle
  // engelleniyor AMA bedava değil — bedeli bir can. Engelleme ücretsiz
  // olsaydı bulmacanın gerilimi kaçardı (bkz. docs/GAMES/SUDOKU.md).
  const MAX_LIVES = 3;
  const DEFAULT_DIFFICULTY = 'easy';
  // Oyuncunun seçimi hatırlanır. gh_ ESKİ önek (bkz. CLAUDE.md §6);
  // yeni anahtarlar ph_ altında.
  const DIFF_KEY = 'ph_sudoku_difficulty';
  // Günlük herkes için AYNI zorlukta olmalı.
  const DAILY_DIFFICULTY = 'medium';

  let board, initial, solution, selected, container, startTime, wrapEl;
  let tabletEl, mistakesEl, atmoEl, placeEl, lives, dead;
  let currentSeed, currentDifficulty, isDaily;

  function savedDifficulty() {
    try {
      const v = localStorage.getItem(DIFF_KEY);
      if (v && DIFFICULTIES[v]) return v;
    } catch (e) {}
    return DEFAULT_DIFFICULTY;
  }
  function saveDifficulty(d) {
    try { if (DIFFICULTIES[d]) localStorage.setItem(DIFF_KEY, d); } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  BULMACA ÜRETİCİ
  // ═══════════════════════════════════════════════════════════════
  // Önceden üç sabit bulmaca vardı; dördüncü oyunda tekrar başlıyordu.
  // Artık sınırsız üretiliyor.
  //
  // TEKLİK PAZARLIK KONUSU DEĞİL. Can sistemi her hamleyi çözüme karşı
  // sınadığı için, iki çözümü olan bir bulmaca oyuncuyu geçerli bir
  // alternatifi girdiği için cezalandırırdı. Bu yüzden her hücre
  // çıkarımı, çözüm sayısı hâlâ 1 mi diye doğrulanarak yapılıyor.
  //
  // ZORLUK = GEREKEN TEKNİK, ipucu sayısı değil.
  // İpucu sayısı zayıf bir vekildir: 30 ipuçlu bir bulmaca 45 ipuçlu
  // birinden kolay olabilir. Bunun yerine hücreler, bulmaca belirli bir
  // teknik setiyle çözülebilir KALDIĞI SÜRECE çıkarılıyor:
  //   • Kolay  → yalnızca "tek aday" (naked single) yetmeli
  //   • Orta   → "gizli tek" (hidden single) de gerekebilir
  //   • Zor+   → teknik kısıtı yok, yalnızca teklik + ipucu tabanı
  // Böylece kolay bulmacalar gerçekten adım adım çözülebilir olur,
  // rastgele 45 hücre bırakılmış bir tahta değil.

  // ceil  = kazma sırasında KORUNAN üst sınır ("şu teknikle çözülebilir kal")
  // floor  = sonuçta KARŞILANMASI GEREKEN alt sınır ("bu kadarını gerektir")
  //
  // Taban olmadan merdiven çöküyor: "en fazla gizli tek gerekir" kısıtı
  // "yalnızca tek aday yeter"i de KAPSADIĞI için kolay bulmacalar orta/zor
  // kovasına sızıyordu (ölçüldü: 40 "zor" bulmacanın 8'i yalnızca tek
  // adayla çözülebiliyordu — etiket yalan söylüyordu). Taban bunu keser.
  const DIFFICULTIES = {
    easy:   { label: 'Kolay', ceil: 1, floor: 1, minClues: 40 },
    medium: { label: 'Orta',  ceil: 2, floor: 2, minClues: 32 },
    hard:   { label: 'Zor',   ceil: 3, floor: 3, minClues: 30 },
    expert: { label: 'Uzman', ceil: 3, floor: 3, minClues: 26 },
    master: { label: 'Usta',  ceil: 3, floor: 3, minClues: 23 },
  };

  // Taban tutmazsa türetilmiş tohumla yeniden denenir. Sınırlı: mobilde
  // sınırsız döngü kabul edilemez. Denemeler orijinal tohumdan
  // türetildiği için sonuç HÂLÂ deterministiktir.
  const MAX_ATTEMPTS = 24;

  // Bit maskesi tabloları. Aday kümeleri 9-bitlik maskeler olarak
  // tutuluyor; "hangi rakamlar kullanılabilir" sorusu tek bir AND/NOT
  // işlemine iniyor. Çözüm sayacı binlerce kez çağrıldığı için bu fark
  // erken optimizasyon değil, üreticiyi mobilde kullanılabilir kılan şey.
  const ALL9 = 0x1FF;
  const POPCOUNT = new Uint8Array(512);
  for (let i = 1; i < 512; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);
  const BIT_DIGIT = new Int8Array(512);
  for (let d = 1; d <= 9; d++) BIT_DIGIT[1 << (d - 1)] = d;

  const BOX_OF = new Int8Array(81);
  for (let i = 0; i < 81; i++) BOX_OF[i] = (((i / 9) | 0) / 3 | 0) * 3 + ((i % 9) / 3 | 0);

  function buildMasks(grid, rows, cols, boxes) {
    rows.fill(0); cols.fill(0); boxes.fill(0);
    for (let i = 0; i < 81; i++) {
      const v = grid[i];
      if (!v) continue;
      const bit = 1 << (v - 1);
      rows[(i / 9) | 0] |= bit; cols[i % 9] |= bit; boxes[BOX_OF[i]] |= bit;
    }
  }

  // Çözüm sayısını `limit`e kadar sayar (limit'e ulaşınca durur).
  // Teklik kontrolü için limit=2 yeterli: "1 mi, birden fazla mı".
  //
  // MRV (en az adaylı hücreyi önce seç) kritik: sıralı tarama, seyrek
  // tahtalarda kombinatoryal patlamaya yol açar; MRV ile aynı tahtalar
  // milisaniyeler içinde bitiyor.
  function countSolutions(grid, limit) {
    const work = Int8Array.from(grid);
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    buildMasks(work, rows, cols, boxes);
    let count = 0;

    function recurse() {
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (work[i]) continue;
        const avail = ~(rows[(i / 9) | 0] | cols[i % 9] | boxes[BOX_OF[i]]) & ALL9;
        if (avail === 0) return;                 // çıkmaz: bu dal ölü
        const n = POPCOUNT[avail];
        if (n < bestCount) {
          bestCount = n; best = i; bestMask = avail;
          if (n === 1) break;                    // daha iyisi olamaz
        }
      }
      if (best === -1) { count++; return; }      // tahta doldu → bir çözüm

      const r = (best / 9) | 0, c = best % 9, b = BOX_OF[best];
      let m = bestMask;
      while (m) {
        const bit = m & -m;                      // en düşük set bit
        m ^= bit;
        work[best] = BIT_DIGIT[bit];
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        recurse();
        work[best] = 0;
        rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
        if (count >= limit) return;
      }
    }

    recurse();
    return count;
  }

  // Tohumlu rastgele dolu tahta. Rakam sırası karıştırıldığı için her
  // tohum farklı bir çözüm ızgarası verir; geri izleme her zaman başarılı.
  function buildSolvedGrid(rng) {
    const grid = new Int8Array(81);
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);

    function fill(pos) {
      if (pos === 81) return true;
      const r = (pos / 9) | 0, c = pos % 9, b = BOX_OF[pos];
      const used = rows[r] | cols[c] | boxes[b];
      const order = phShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
      for (let k = 0; k < 9; k++) {
        const v = order[k], bit = 1 << (v - 1);
        if (used & bit) continue;
        grid[pos] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (fill(pos + 1)) return true;
        grid[pos] = 0; rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
      }
      return false;
    }

    fill(0);
    return grid;
  }

  // İnsan tekniğiyle çözmeyi dener — geri izleme YOK, tahmin YOK.
  //   naked single: hücrenin tek bir adayı kalmışsa o rakam oraya girer
  //   hidden single: bir birimde (satır/sütun/kutu) bir rakam yalnızca
  //                  tek bir hücreye sığıyorsa oraya girer
  // Tamamen çözebiliyorsa true. Zorluk derecelendirmesi buna dayanıyor:
  // "bir insan bunu tahmin etmeden çözebilir mi?"
  function solveWithTechniques(puzzle, allowHidden) {
    const grid = Int8Array.from(puzzle);
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    buildMasks(grid, rows, cols, boxes);
    let empties = 0;
    for (let i = 0; i < 81; i++) if (!grid[i]) empties++;

    function place(i, bit) {
      grid[i] = BIT_DIGIT[bit];
      rows[(i / 9) | 0] |= bit; cols[i % 9] |= bit; boxes[BOX_OF[i]] |= bit;
      empties--;
    }

    let progress = true;
    while (progress && empties > 0) {
      progress = false;

      // Tek aday
      for (let i = 0; i < 81; i++) {
        if (grid[i]) continue;
        const avail = ~(rows[(i / 9) | 0] | cols[i % 9] | boxes[BOX_OF[i]]) & ALL9;
        if (avail === 0) return false;           // çelişki
        if (POPCOUNT[avail] === 1) { place(i, avail); progress = true; }
      }
      if (progress || !allowHidden) continue;

      // Gizli tek — 27 birimin her biri için, her rakamın kaç hücreye
      // sığdığına bakılır. Yalnızca tek aday kaldığında ilerleme yoksa
      // devreye girer (ucuz teknik önce).
      for (let u = 0; u < 27 && !progress; u++) {
        const cells = unitCells(u);
        for (let d = 1; d <= 9 && !progress; d++) {
          const bit = 1 << (d - 1);
          let spot = -1, n = 0;
          for (let k = 0; k < 9; k++) {
            const i = cells[k];
            if (grid[i]) { if (grid[i] === d) { n = 0; break; } continue; }
            const avail = ~(rows[(i / 9) | 0] | cols[i % 9] | boxes[BOX_OF[i]]) & ALL9;
            if (avail & bit) { n++; spot = i; if (n > 1) break; }
          }
          if (n === 1) { place(spot, bit); progress = true; }
        }
      }
    }

    return empties === 0;
  }

  // 0-8 satır, 9-17 sütun, 18-26 kutu.
  function unitCells(u) {
    const out = new Array(9);
    if (u < 9) { for (let k = 0; k < 9; k++) out[k] = u * 9 + k; }
    else if (u < 18) { const c = u - 9; for (let k = 0; k < 9; k++) out[k] = k * 9 + c; }
    else {
      const b = u - 18, br = ((b / 3) | 0) * 3, bc = (b % 3) * 3;
      for (let k = 0; k < 9; k++) out[k] = (br + ((k / 3) | 0)) * 9 + (bc + (k % 3));
    }
    return out;
  }

  // Bulmacanın gerçekte hangi teknik seviyesini gerektirdiği (1/2/3).
  function rateDifficulty(puzzle) {
    if (solveWithTechniques(puzzle, false)) return 1;
    if (solveWithTechniques(puzzle, true)) return 2;
    return 3;
  }

  // ── Genel API ──
  // Aynı tohum + aynı zorluk → HER ZAMAN aynı bulmaca. Günlük Meydan
  // Okuma bunu şöyle kullanacak:
  //     generate('medium', phDailySeed('sudoku'))
  // Sunucu gerekmez; aynı gün herkes aynı tahtayı görür.
  // Tek deneme: bir çözüm ızgarası kur, tekliği ve zorluk TAVANINI
  // koruyarak hücre çıkar.
  function digOnce(cfg, attemptSeed) {
    const rng = phRng(attemptSeed);
    const solved = buildSolvedGrid(rng);
    const puzzle = Int8Array.from(solved);
    const order = phShuffle(Array.from({ length: 81 }, (_, i) => i), rng);

    let clues = 81;
    for (let k = 0; k < 81 && clues > cfg.minClues; k++) {
      const pos = order[k];
      const saved = puzzle[pos];
      puzzle[pos] = 0;

      // 1) Teklik korunuyor mu? (pazarlık konusu değil)
      if (countSolutions(puzzle, 2) !== 1) { puzzle[pos] = saved; continue; }
      // 2) Zorluk tavanı korunuyor mu? (ceil 3 = kısıt yok)
      if (cfg.ceil < 3 && !solveWithTechniques(puzzle, cfg.ceil >= 2)) {
        puzzle[pos] = saved; continue;
      }
      clues--;
    }

    return { puzzle, solved, clues, rating: rateDifficulty(puzzle) };
  }

  function generate(difficulty, seed) {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const key = difficulty in DIFFICULTIES ? difficulty : DEFAULT_DIFFICULTY;
    const cfg = DIFFICULTIES[key];
    const usedSeed = (seed >>> 0) || phRandomSeed();

    // Tabanı tutturana kadar dene. Deneme tohumları orijinalden ALTIN ORAN
    // sabitiyle türetiliyor — ardışık denemeler birbirine benzemesin diye.
    // Tohum aynıysa deneme zinciri de aynı olduğu için determinizm korunur.
    let best = null, attempts = 0;
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      attempts = a + 1;
      const attemptSeed = a === 0 ? usedSeed : ((usedSeed + Math.imul(a, 0x9E3779B1)) >>> 0) || 1;
      const r = digOnce(cfg, attemptSeed);
      if (r.rating >= cfg.floor) { best = r; break; }
      // Taban tutmadı — en iyisini sakla ve devam et.
      if (!best || r.rating > best.rating) best = r;
    }

    return {
      puzzle: Array.from(best.puzzle),
      solution: Array.from(best.solved),
      clues: best.clues,
      difficulty: key,
      label: cfg.label,
      rating: best.rating,
      // Taban tutturulamadıysa dürüstçe bildirilir; çağıran taraf isterse
      // farklı bir tohumla tekrar isteyebilir. Sessizce yanlış etiketli
      // bir bulmaca döndürmekten iyidir.
      floorMet: best.rating >= cfg.floor,
      attempts,
      seed: usedSeed,
      ms: Math.round(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) * 10) / 10,
    };
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
        /* Mor: sayfanın sıcak paletindeki TEK soğuk renk. Bölge tamamlanma
           anına saklanıyor — her yerde kullanılsaydı o an sıradanlaşırdı. */
        --sdk-magic:#8B5CF6;
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
      /* Köşeye çekildi: zorluk seçici çipleri üst-ortayı kapladığı için
         eski konumunda "Usta" çipiyle çakışıyordu. */
      .sdk-moon{position:absolute;top:2.5%;right:5%;width:34px;height:34px;border-radius:50%;
        background:radial-gradient(circle at 36% 32%, #FFF8E2, #F1E1B0 56%, #D8C085 100%);
        -webkit-mask-image:radial-gradient(circle at 132% 2%, transparent 52%, #000 53%);
        mask-image:radial-gradient(circle at 132% 2%, transparent 52%, #000 53%)}
      /* Parıltı ayrı katmanda: mask ışımayı da keserdi. */
      .sdk-moon-glow{position:absolute;top:2.5%;right:5%;width:34px;height:34px;border-radius:50%;
        box-shadow:0 0 36px 11px rgba(246,228,172,.2)}
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

      /* ── ZORLUK SEÇİCİ ──
         Tahtanın ÜSTÜNDE, oynamadan önce görülecek yerde. Seçim yeni bir
         bulmaca başlatır; Sudoku'da kaydedilmiş oyun kavramı olmadığı
         için (yeniden başlatma da tahtayı atar) bu davranış tutarlı. */
      .sdk-diffs{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;max-width:430px}
      .sdk-diff{
        padding:5px 11px;border-radius:var(--ph-radius-full);cursor:pointer;
        font:600 11px/1 'Fraunces',serif;letter-spacing:.06em;
        color:#7A6642;background:rgba(243,234,212,.14);
        border:1px solid rgba(184,151,79,.32);
        transition:transform var(--ph-duration-micro) var(--ph-ease-standard),
                   background var(--ph-duration-fast) var(--ph-ease-standard);
      }
      .sdk-diff:active{transform:scale(.92)}
      /* Seçili olan parşömenle AYNI malzemede: hangi zorlukta olduğun
         tahtayla aynı maddeden okunuyor. */
      .sdk-diff.on{
        color:var(--sdk-ink);
        background:linear-gradient(180deg, var(--sdk-paper-hi), var(--sdk-paper));
        border-color:var(--sdk-gold);
        box-shadow:0 3px 10px -4px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.7);
      }

      /* Günlük modda zorluk seçilemez (herkes aynı tahtayı görmeli),
         onun yerine rozet gösterilir. */
      .sdk-daily-badge{
        display:inline-flex;align-items:center;gap:6px;
        padding:6px 14px;border-radius:var(--ph-radius-full);
        font:600 11px/1 'Fraunces',serif;letter-spacing:.1em;text-transform:uppercase;
        color:#F3EAD4;background:linear-gradient(160deg, rgba(139,92,246,.5), rgba(76,42,122,.6));
        border:1px solid rgba(167,139,250,.5);
        box-shadow:0 4px 14px -5px rgba(139,92,246,.7), inset 0 1px 0 rgba(220,215,255,.3);
      }

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

      /* ── ÜÇ KADEMELİ VURGU ──
         Modern mobil sudokunun temel tarama aracı. Kademeler bilerek
         farklı GÜÇTE ve farklı RENKTE:
           peer    (en açık, altın) → seçilinin satır/sütun/kutusu
           samenum (koyu, nötr)     → tahtadaki AYNI rakamlar
           sel     (en güçlü)       → seçili hücre
         Aynı rakamların vurgusu en çok işe yarayan katman: "9 nereye
         gider?" diye ararken herhangi bir 9'a dokunup hepsini görmek,
         tahtayı tek tek taramanın yerine geçiyor.
         CSS sırası = öncelik sırası (hepsi aynı özgüllükte). */
      .sdk-cell.peer{background:rgba(184,151,79,.13)}
      .sdk-cell.samenum{background:rgba(74,58,34,.2)}
      .sdk-cell.sel{
        background:radial-gradient(ellipse 86% 78% at 50% 45%, rgba(214,170,74,.34), rgba(214,170,74,.16));
        box-shadow:inset 0 0 0 2px var(--sdk-gold), inset 0 0 12px rgba(184,151,79,.4);
        border-radius:3px;
      }

      /* ── BÖLGE TAMAMLANDI — "denize atılan taş" ──
         Ritim buradan geliyor. Bir satır/sütun/kutu dolduğunda hamlenin
         yapıldığı hücreden mor halkalar yayılıyor, ardından bölgenin
         hücreleri o merkeze olan UZAKLIKLARINA göre sırayla parlıyor:
         önce taş düşüyor, sonra dalga yayılıyor.
         Halkalar tabletin içine, hücrelerin üstüne çiziliyor. */
      .sdk-ripple{
        position:absolute;border-radius:50%;pointer-events:none;z-index:4;
        transform:translate(-50%,-50%);
        border:2px solid rgba(139,92,246,.75);
        box-shadow:0 0 20px rgba(139,92,246,.45), inset 0 0 16px rgba(139,92,246,.3);
        animation:sdkRipple 1.1s cubic-bezier(.16,.72,.3,1) forwards;
      }
      @keyframes sdkRipple{
        0%  {width:0;height:0;opacity:.9;border-width:3px}
        100%{width:var(--sdk-r,320px);height:var(--sdk-r,320px);opacity:0;border-width:.5px}
      }
      /* Dalganın hücrelere çarpması. scale için z-index şart, yoksa
         büyüyen hücre komşularının ALTINDA kalıyor ve dalga kaybolur. */
      @keyframes sdkWave{
        0%  {background-color:transparent;transform:scale(1)}
        34% {background-color:rgba(139,92,246,.4);transform:scale(1.14)}
        100%{background-color:transparent;transform:scale(1)}
      }
      .sdk-cell.sdk-wave{animation:sdkWave .6s var(--ph-ease-standard) both;z-index:3}

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
      /* Sabit yükseklik (aspect-ratio DEĞİL): tamamlanan tuş yatayda
         daralarak yok olurken aspect-ratio yüksekliği de sıfırlar ve
         bütün sıra çöker. Yükseklik sabitlenince sıra yerinde durur. */
      .sdk-nums{display:flex;gap:5px;justify-content:center;align-items:center;
        width:100%;max-width:430px;min-height:46px}
      .sdk-num{
        flex:1 1 0;min-width:0;max-width:46px;height:clamp(38px,11vw,46px);
        display:flex;align-items:center;justify-content:center;
        border-radius:var(--ph-radius-sm);cursor:pointer;overflow:hidden;
        font:600 20px/1 'Fraunces',serif;color:var(--sdk-ink);
        background:
          var(--ph-stone-grain),
          linear-gradient(180deg, var(--sdk-paper-hi) 0%, var(--sdk-paper) 60%, var(--sdk-paper-lo) 100%);
        background-size:170px 170px, auto;background-blend-mode:soft-light, normal;
        border:1px solid var(--sdk-gold-line);
        box-shadow:0 5px 12px -5px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.75);
        transition:transform var(--ph-duration-micro) var(--ph-ease-standard),
                   max-width var(--ph-duration-medium) var(--ph-ease-standard),
                   opacity var(--ph-duration-medium) var(--ph-ease-standard),
                   margin var(--ph-duration-medium) var(--ph-ease-standard),
                   border-width var(--ph-duration-medium) var(--ph-ease-standard);
      }
      .sdk-num:active{transform:scale(.9)}
      /* Tahtada 9 kez yerleşen rakamın tuşu SİLİNİR — sönükleşmez.
         O rakamın bittiği, tuşun yokluğundan anlaşılır; oyuncunun kaç tane
         kaldığını sayması gerekmez. Kalan tuşlar boşluğu doldurarak
         genişler, bu yüzden daralma animasyonlu: tuşlar yer değiştirirken
         sıçramasın, kas hafızası kopmasın. */
      .sdk-num.done{
        max-width:0;flex-grow:0;opacity:0;margin-left:-5px;
        border-width:0;pointer-events:none;
      }

      @media (prefers-reduced-motion: reduce){
        .sdk-glyph.fresh, .sdk-cell.sdk-reject{animation:none}
        .sdk-ghost{animation-duration:var(--ph-duration-fast)}
      }
    `);
  }

  // opts: { difficulty, seed } — ikisi de isteğe bağlı. Günlük Meydan
  // Okuma buraya phDailySeed('sudoku') geçirerek aynı tahtayı üretecek.
  function init(c, opts) {
    opts = opts || {};
    container = c; selected = -1; startTime = Date.now(); dead = false;
    // Zorluk değiştirmek de buradan geçiyor (aşağıdaki diffs dinleyicisi
    // cleanup + init çağırıyor): yeni zorluk = yeni bulmaca = yeni tur.
    // Eski tur GameEvents tarafından kendiliğinden 'quit' ile kapanır.
    gameEvent('game_started', { gameId: 'sudoku' });
    container.classList.add('ph-scene', 'sdk-arcane');

    // Üretilen her bulmaca TEK ÇÖZÜMLÜ olduğu garanti edilir (üretici her
    // hücre çıkarımında doğruluyor). Bu bir estetik tercih değil: can
    // sistemi her hamleyi çözüme karşı sınıyor, çok çözümlü bir tahtada
    // oyuncu geçerli bir alternatifi girdiği için can kaybederdi.
    // Günlük modda zorluk ÇAĞIRAN tarafından dayatılır (herkes aynı
    // tahtayı görmeli); normal modda oyuncunun kayıtlı tercihi kullanılır.
    isDaily = !!opts.daily;
    const wanted = opts.difficulty || (isDaily ? DAILY_DIFFICULTY : savedDifficulty());
    const gen = generate(wanted, opts.seed);
    currentSeed = gen.seed;
    currentDifficulty = gen.difficulty;
    initial = gen.puzzle;
    solution = gen.solution;
    board = [...initial];
    injectCSS();

    // Ortak evren: gökyüzü (.ph-scene) + atmosfer. Sahne oyuncu hiçbir şey
    // yapmadan ÖNCE canlı olmalı. skyPct düşük — tahta ortayı kaplıyor,
    // yıldızlar üst şeride toplanmalı.
    atmoEl = phAtmosphere(container, { stars: 20, beams: 2, motes: 7, skyPct: 42 });
    buildPlace();

    wrapEl = document.createElement('div'); wrapEl.className = 'sdk-wrap';
    const topRow = isDaily
      ? `<div class="sdk-daily-badge">🗓️ Günlük · ${DIFFICULTIES[currentDifficulty].label}</div>`
      : `<div class="sdk-diffs" data-role="diffs">` +
          Object.keys(DIFFICULTIES).map(k =>
            `<div class="sdk-diff${k === currentDifficulty ? ' on' : ''}" data-d="${k}">${DIFFICULTIES[k].label}</div>`
          ).join('') +
        `</div>`;
    wrapEl.innerHTML =
      topRow +
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
    // DOLU hücreler de seçilebilir. Bu, "aynı rakamları vurgula" tarama
    // aracının çalışabilmesi için şart: oyuncu tahtadaki bir 9'a dokunup
    // bütün 9'ların nerede olduğunu görebilmeli. Dolu hücreye rakam
    // basmak zaten placeNum içinde engelli, üzerine yazılamıyor.
    addEv(tabletEl, 'click', (e) => {
      const cell = e.target.closest('.sdk-cell');
      if (!cell) return;
      selected = +cell.dataset.i;
      GameAudio.play('tap');
      render();
    });
    addEv(wrapEl.querySelector('[data-role="nums"]'), 'click', (e) => {
      const btn = e.target.closest('.sdk-num');
      if (btn) placeNum(+btn.dataset.n);
    });

    // Zorluk seçimi → tercih kaydedilir ve yeni bulmaca başlar.
    // restartCurrentGame yerine doğrudan yeniden init: uygulama
    // kabuğunun sakladığı opts günlük moda ait olabilir, onu taşımak
    // istemiyoruz.
    const diffsEl = wrapEl.querySelector('[data-role="diffs"]');
    if (diffsEl) {
      addEv(diffsEl, 'click', (e) => {
        const btn = e.target.closest('.sdk-diff');
        if (!btn || btn.dataset.d === currentDifficulty) return;
        saveDifficulty(btn.dataset.d);
        GameAudio.play('button'); GameAudio.haptic('tap');
        const c = container;
        cleanup(); c.innerHTML = '';
        init(c, { difficulty: btn.dataset.d });
      });
    }

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
    // Seçili hücrede bir rakam varsa tahtadaki bütün eşleri işaretlenir.
    // Boş hücre seçiliyse eşleşecek rakam yoktur (0 asla eşleşmemeli).
    const selVal = selected >= 0 ? board[selected] : 0;
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
            const same = selVal > 0 && v === selVal && i !== selected;
            const cls = ['sdk-cell', v ? 'filled' : 'empty', fixed ? 'fixed' : '',
                         selected === i ? 'sel' : '', same ? 'samenum' : '',
                         peer ? 'peer' : ''].filter(Boolean).join(' ');
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

  // ── Bölge tamamlanma ──
  // Bir hamleden sonra hangi satır/sütun/kutu tamamen doldu?
  // Yalnızca doğru rakam yerleştiği için "dolu" = "doğru tamamlanmış";
  // ayrıca doğrulamaya gerek yok.
  function completedRegions(i) {
    const r = Math.floor(i/9), c = i % 9;
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    const out = [];

    const row = []; for (let k = 0; k < 9; k++) row.push(r*9+k);
    if (row.every(j => board[j])) out.push(row);

    const col = []; for (let k = 0; k < 9; k++) col.push(k*9+c);
    if (col.every(j => board[j])) out.push(col);

    const box = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) box.push((br+dr)*9 + (bc+dc));
    if (box.every(j => board[j])) out.push(box);

    return out;
  }

  // "Denize atılan taş": merkeze mor halkalar, ardından bölgenin hücreleri
  // merkeze olan uzaklıklarına göre sırayla parlar. Aynı anda birden fazla
  // bölge tamamlanırsa (satır + kutu gibi) ödül yükselir — ritim buradan.
  function rippleFrom(originIdx, regions) {
    const originEl = tabletEl.querySelector(`.sdk-cell[data-i="${originIdx}"]`);
    if (!originEl) return;
    const tRect = tabletEl.getBoundingClientRect();
    const oRect = originEl.getBoundingClientRect();
    const cx = oRect.left - tRect.left + oRect.width/2;
    const cy = oRect.top - tRect.top + oRect.height/2;

    // Üç halka, kademeli gecikmeyle — tek halka "daire büyüdü" gibi
    // duruyor, üçü birlikte su yüzeyi gibi okunuyor.
    for (let k = 0; k < 3; k++) {
      const ring = document.createElement('div');
      ring.className = 'sdk-ripple';
      ring.style.left = cx + 'px';
      ring.style.top = cy + 'px';
      ring.style.setProperty('--sdk-r', (tRect.width * (0.75 + k * 0.28)) + 'px');
      ring.style.animationDelay = (k * 140) + 'ms';
      tabletEl.appendChild(ring);
      setTimeout(() => ring.remove(), 1120 + k * 140);
    }

    // Dalganın hücrelere ulaşması: gecikme = merkeze uzaklık.
    const seen = new Set();
    regions.forEach(cells => cells.forEach(j => {
      if (seen.has(j)) return;             // kesişen hücre iki kez parlamasın
      seen.add(j);
      const el = tabletEl.querySelector(`.sdk-cell[data-i="${j}"]`);
      if (!el) return;
      const dr = Math.abs(Math.floor(j/9) - Math.floor(originIdx/9));
      const dc = Math.abs((j % 9) - (originIdx % 9));
      const dist = Math.max(dr, dc);       // Chebyshev: halka gibi yayılır
      el.classList.remove('sdk-wave'); void el.offsetWidth;
      el.style.animationDelay = (dist * 55) + 'ms';
      el.classList.add('sdk-wave');
      setTimeout(() => { el.classList.remove('sdk-wave'); el.style.animationDelay = ''; }, 600 + dist * 55 + 60);
    }));

    // Tek bölge / çoklu bölge ayrımı hem seste hem titreşimde: ödülün
    // büyüklüğü olayın büyüklüğüyle ölçekleniyor.
    GameAudio.play(regions.length > 1 ? 'combo3' : 'combo2');
    GameAudio.haptic(regions.length > 1 ? 'combo3' : 'match');
    // Dünyanın tepkisi yalnızca çoklu tamamlamada — her bölgede
    // tetiklenirse "olay oldu" hissi ölür (bkz. phAtmosphereFlare notu).
    if (regions.length > 1) phAtmosphereFlare(atmoEl, 1.8, 520);
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
    const filled = board.filter(x => x !== 0).length;
    gameEvent('game_ended', { gameId: 'sudoku', result: 'lost' });
    // Devam kancası: reklam/elmas akışı tamamlanırsa oyuncu bir canla
    // kaldığı yerden sürer — tahta korunur, sıfırlanmaz. Turu da kabuk
    // yeniden açar (bkz. app.js _runGameOverContinuation), o yüzden burada
    // yayınlanan 'lost' devam edilse bile doğru kalır: tur bitmişti.
    showGameOver(false, 'Büyü Tükendi', 'Canların tükendi.', {
      accent: 'var(--ph-jewel-5-shadow)',
      accentLight: 'var(--ph-jewel-5-highlight)',
      accentGlow: 'var(--ph-jewel-5-glow)',
      mark: '✧',
      stats: [
        { label: 'Dolu', value: filled + '/81' },
        { label: 'Kalan', value: 81 - filled },
      ],
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
    // Seçim yerleşen hücrede KALIR: artık dolu hücreler de seçilebildiği
    // için bu, yeni yazılan rakamın bütün eşlerini anında vurguluyor —
    // "bu rakamdan başka nerede var?" sorusu hamlenin hemen ardından
    // ücretsiz cevaplanmış oluyor.
    render(placedAt);

    // Bölge tamamlandıysa dalga. render'dan SONRA çağrılmalı: efekt taze
    // DOM'a uygulanıyor, aksi halde yeniden çizim animasyonu siler.
    const regions = completedRegions(placedAt);
    if (regions.length) rippleFrom(placedAt, regions);

    if (!board.includes(0)) {
      const secs = Math.floor((Date.now()-startTime)/1000);
      const finalScore = Math.max(5000 - secs*10, 500);
      updateGameScore(finalScore);
      // Süre oyunun kendi ölçümünden geçiyor (startTime), GameEvents'in
      // türetmesinden değil: aynı sayı skoru da belirliyor, ikisi ayrışmasın.
      gameEvent('game_ended', {
        gameId: 'sudoku', result: 'won', score: finalScore, durationMs: secs * 1000,
      });
      GameAudio.play('win'); GameAudio.haptic('win');
      phAtmosphereFlare(atmoEl, 2.2, 620);

      let title = 'Sudoku Çözüldü';
      let msg = 'Tabloyu tamamladın.';
      let stat2 = { label: 'Skor', value: finalScore.toLocaleString() };
      if (isDaily && typeof DailyChallenge !== 'undefined') {
        // complete() aynı gün içinde idempotent — günlüğü tekrar
        // çözmek seriyi ikiye katlamaz.
        const st = DailyChallenge.complete('sudoku');
        title = 'Günlük Tamamlandı';
        msg = 'Bugünün bulmacasını çözdün.';
        stat2 = { label: 'Seri', value: st.streak, record: true };
        if (typeof renderDailyChallenge === 'function') renderDailyChallenge();
      }
      showGameOver(true, title, msg, {
        accent: 'var(--ph-jewel-5-shadow)',
        accentLight: 'var(--ph-jewel-5-highlight)',
        accentGlow: 'var(--ph-jewel-5-glow)',
        mark: '✦',
        stats: [
          { label: 'Süre', value: secs + ' sn' },
          stat2,
        ],
      });
    }
  }

  function cleanup(){
    clearEvs();
    if (placeEl) { placeEl.remove(); placeEl = null; }
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) container.classList.remove('ph-scene', 'sdk-arcane');
  }

  // generate/DIFFICULTIES bilerek DIŞA AÇIK: üretici oyunun içine gömülü
  // bir ayrıntı değil, Günlük Meydan Okuma ve zorluk seçici gibi
  // gelecek özelliklerin tüketeceği bir yetenek.
  // currentSeed hata ayıklama içindir — "şu bulmacada sorun var"
  // denildiğinde tahtayı birebir yeniden üretmeyi sağlar.
  return {
    init, cleanup, generate,
    DIFFICULTIES,
    // ── Günlük Meydan Okuma sözleşmesi (core/daily.js) ──
    // supportsDaily: bu oyun günlüğe katılabilir.
    // dailyDifficulty: günlük HERKES için aynı zorlukta olmalı, yoksa
    // "aynı bulmaca" iddiası bozulur. Orta seçildi: kolay çok hızlı
    // biter, uzman günlük bir alışkanlık için fazla cezalandırıcı.
    // init() zaten opts.seed'i onurlandırıyor — sözleşmenin diğer yarısı.
    supportsDaily: true,
    dailyDifficulty: DAILY_DIFFICULTY,
    get seed() { return currentSeed; },
    get difficulty() { return currentDifficulty; },
    // Keşfet kartının gerçeği söylemesi için: oyuncunun kayıtlı seçimi.
    get difficultyLabel() { return DIFFICULTIES[savedDifficulty()].label; },
  };
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

  // ═══════════ CANVAS RENDERER (Sprint 1) ═══════════
  // Board artık 64 DOM hücresi değil, TEK bir canvas. Kristaller offscreen
  // bir cache'e BİR KEZ çizilir (board değişince). Her preview değişiminde
  // cache blit'lenip üstüne birkaç highlight çizilir — 64 DOM kristalini
  // yeniden boyamaktan (A51'de sürüklemenin ~24fps'e düşmesinin sebebi buydu)
  // ~10× ucuz. Ghost DOM kalır (position:fixed, tek küçük katman, ucuz
  // translate). Efektler Faz 1'de kapalı (FX) — temiz render ölçümü için.
  // RENDER_SCALE: buffer çözünürlüğü çarpanı (1 = tam/crisp). Önce 1'de ölç;
  // 60fps gelmezse düşür (fill-rate kaldıracı).
  const FX = true;               // Faz 2: efektler canvas FX katmanında AÇIK
  const GAP = 3;                 // hücreler arası boşluk (CSS px)
  let cv, ctx, bufScale;         // görünen board canvas
  let boardCache, bctx;          // offscreen kristal cache
  let JCOL = [];                 // jewel renkleri: JCOL[n] = {hl,base,sh,glow}
  let geom = null;               // {cssW, cs, step}

  // ── RENDER SCALE ──
  // Roadmap: Day 1'den itibaren var olmalı ve CİHAZA GÖRE seçilmeli.
  // Ölçüm (A51, canvas board, scale=1): sürükleme 33fps → fill-rate hâlâ sınır.
  // Cihaz gücünü doğrudan okuyamayız; ekran piksel sayısı + çekirdek sayısı
  // makul bir vekil: yüksek çözünürlük az çekirdekle birleşince buffer küçülür.
  // İleride Ayarlar > Grafik (Yüksek/Dengeli/Pil) bu değeri override edecek.
  function pickRenderScale() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = (screen.width * dpr) * (screen.height * dpr);   // fiziksel piksel
    const cores = navigator.hardwareConcurrency || 4;
    if (px >= 2.2e6 && cores <= 8) return 0.8;   // A51/A54 sınıfı 1080p
    if (px >= 1.5e6 && cores <= 4) return 0.65;  // Y6 sınıfı zayıf
    return 1;
  }
  let RENDER_SCALE = 1;

  // ── RENDER LOOP ──
  // Roadmap kuralı: ASLA touchmove içinde çizme. touchmove yalnızca DURUM
  // günceller ve bir kare talep eder; çizim rAF'ta tek noktadan olur.
  // Böylece bir karede birden fazla move gelse bile tek çizim yapılır.
  let rafId = 0, needsPaint = false;
  function requestPaint() {
    needsPaint = true;
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; if (needsPaint) { needsPaint = false; paintBoard(); } });
  }

  // ── DIRTY RECTANGLES ──
  // Roadmap kuralı: tüm board'u yeniden ÇİZME. Bu kural artık cache
  // tarafında yaşıyor: commitCells yalnızca değişen hücreleri (+8 komşu)
  // yeniden çizer, 64 hücreyi değil. Görünen tuvale hazır cache görüntüsünü
  // basmak ise tek bir drawImage — orada dirty-rect yapmak hem daha pahalı
  // hem de hayalet çerçeve riski taşıyordu (bkz. paintBoard'daki not).

  function readJewels() {
    JCOL = [null];
    const s = getComputedStyle(document.documentElement);
    for (let n = 1; n <= JEWELS; n++) {
      JCOL[n] = {
        hl:   (s.getPropertyValue(`--ph-jewel-${n}-highlight`) || '#fff').trim(),
        base: (s.getPropertyValue(`--ph-jewel-${n}-base`)      || '#888').trim(),
        sh:   (s.getPropertyValue(`--ph-jewel-${n}-shadow`)    || '#444').trim(),
        glow: (s.getPropertyValue(`--ph-jewel-${n}-glow`)      || 'rgba(255,255,255,.4)').trim(),
      };
    }
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Canvas buffer'ı CSS boyutuna + render-scale'e göre kur; geometriyi hesapla.
  function sizeCanvas() {
    if (!cv) return false;
    const cssW = cv.clientWidth || cv.getBoundingClientRect().width;
    if (!cssW) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    bufScale = dpr * RENDER_SCALE;
    const buf = Math.round(cssW * bufScale);
    cv.width = buf; cv.height = buf;                 // kare board
    ctx.setTransform(bufScale, 0, 0, bufScale, 0, 0); // CSS px'te çiz
    boardCache.width = buf; boardCache.height = buf;
    bctx.setTransform(bufScale, 0, 0, bufScale, 0, 0);
    const cs = (cssW - (G - 1) * GAP) / G;            // hücre boyutu (CSS px)
    geom = { cssW, cs, step: cs + GAP };
    _fxOff = null;                                    // düzen değişti → FX ofseti tazelensin
    cellTex = null;                                   // hücre boyutu değişti → sprite'ları yenile
    return true;
  }

  // Boş soket — .bp-c'nin canvas karşılığı (içe gömük karanlık yuva).
  function drawSocketC(c, px, py, sz) {
    const r = sz * 0.14;
    rrect(c, px, py, sz, sz, r);
    c.fillStyle = 'rgba(8,10,30,.5)';
    c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2;
    rrect(c, px, py - 1.5, sz, sz, r); c.stroke();     // inset 0 1px 3px ~ üst iç gölge
    c.restore();
  }

  // Kristal — .bp-crystal reçetesinin canvas karşılığı (4 katman + kenar + glow).
  // Cache'e bir kez çizildiği için detaylı olabilir (kare başına maliyet yok).
  function drawCrystalC(c, px, py, sz, jewel) {
    const col = JCOL[jewel] || JCOL[1];
    const r = sz * 0.14;
    // DIŞ GLOW YOK (Sprint 3/B geri alındı). Kristalin çevresine yayılan
    // parıltı, komşu hücrelere taşarak "hayalet çerçeve/halo" üretiyordu ve
    // her hücre blit'ini büyüterek fill-rate yiyordu. Kural: bu renderer'da
    // GLOW/HALO/LIGHT BLEED KULLANILMAZ. Premium his bevel/highlight/faset/
    // sparkle'dan gelmeli — ve onlar da hücre sınırının İÇİNDE kalmalı.
    c.save();
    rrect(c, px, py, sz, sz, r); c.clip();
    // 4) taban mücevher gradyanı (linear ~165deg: hl→base→sh)
    let g = c.createLinearGradient(px + sz * 0.2, py, px + sz * 0.8, py + sz);
    g.addColorStop(0, col.hl); g.addColorStop(0.52, col.base); g.addColorStop(1, col.sh);
    c.fillStyle = g; c.fillRect(px, py, sz, sz);
    // 3) faset — sert duraklı konik gradyan (4 düzlem, keskin çizgiler)
    if (c.createConicGradient) {
      const cg = c.createConicGradient(45 * Math.PI / 180, px + sz * 0.5, py + sz * 0.48);
      cg.addColorStop(0.00, 'rgba(255,255,255,.20)'); cg.addColorStop(0.25, 'rgba(255,255,255,.20)');
      cg.addColorStop(0.25, 'rgba(0,0,0,.13)');       cg.addColorStop(0.50, 'rgba(0,0,0,.13)');
      cg.addColorStop(0.50, 'rgba(0,0,0,.24)');       cg.addColorStop(0.75, 'rgba(0,0,0,.24)');
      cg.addColorStop(0.75, 'rgba(255,255,255,.09)'); cg.addColorStop(1.00, 'rgba(255,255,255,.09)');
      c.fillStyle = cg; c.fillRect(px, py, sz, sz);
    }
    // 2) çekirdek derinliği — merkezi karart
    let rg = c.createRadialGradient(px + sz * 0.5, py + sz * 0.58, 0, px + sz * 0.5, py + sz * 0.58, sz * 0.55);
    rg.addColorStop(0, 'rgba(0,0,0,.26)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(px, py, sz, sz);
    // 1) hotspot — fasetlerin buluştuğu parlak nokta
    let hg = c.createRadialGradient(px + sz * 0.27, py + sz * 0.21, 0, px + sz * 0.27, py + sz * 0.21, sz * 0.44);
    hg.addColorStop(0, 'rgba(255,255,255,.98)'); hg.addColorStop(0.45, 'rgba(255,255,255,.45)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(px, py, sz, sz);
    // 5) keskin parlama çizgisi (::after, 128deg dar bant)
    let sg = c.createLinearGradient(px + sz * 0.1, py + sz, px + sz * 0.9, py);
    sg.addColorStop(0.30, 'rgba(255,255,255,0)'); sg.addColorStop(0.375, 'rgba(255,255,255,.62)');
    sg.addColorStop(0.41, 'rgba(255,255,255,.14)'); sg.addColorStop(0.46, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(px, py, sz, sz);

    c.restore();

    // 6) kenar kırılması — keskin dış çizgi (inset 0 0 0 1px)
    c.save();
    rrect(c, px + 0.5, py + 0.5, sz - 1, sz - 1, r);
    c.strokeStyle = 'rgba(255,255,255,.42)'; c.lineWidth = 1; c.stroke();
    c.restore();
  }


  // ── HÜCRE SPRITE'LARI ──
  // drawCrystalC pahalı: shadowBlur (canvas'ın en yavaş işlemlerinden biri)
  // + 4 gradyan + yol dolgusu. Cache'i her yerleştirmede 64 kez bu şekilde
  // kurmak, yerleştirme/temizleme anında görünür bir takılma üretiyordu
  // (ölçüldü A51, soğuk cihaz: yerleştirme oturumunda p99 150ms, idle 48ms).
  // Artık her mücevher BİR KEZ kendi sprite'ına çiziliyor; cache kurulumu
  // 64 karmaşık çizim yerine 64 blit. shadowBlur kare başına 64 → toplam 8.
  // Sprite'ta payanda (pad) var çünkü glow hücre sınırının dışına taşıyor.
  let cellTex = null;
  function buildCellTextures() {
    cellTex = null;
    if (!geom || !bufScale) return;
    // Kristalin artık hücre dışına taşan hiçbir şeyi yok (glow kaldırıldı).
    // Payanda yalnızca HAYALET GÖLGESİ sprite'ı için gerekiyor; kristal
    // sprite'ında kullanılmıyor ama tek boyut paylaşıldığı için ortak.
    // Küçük payanda = küçük blit = daha az fill-rate.
    const pad = Math.max(2, Math.round(geom.cs * 0.13));
    const S = Math.round(geom.cs) + pad * 2;
    const mk = (paint) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(S * bufScale));
      c.height = c.width;
      const x = c.getContext('2d');
      x.setTransform(bufScale, 0, 0, bufScale, 0, 0);
      paint(x);
      return c;
    };
    const jewels = [];
    for (let j = 1; j <= JEWELS; j++) jewels[j] = mk(x => drawCrystalC(x, pad, pad, geom.cs, j));
    // Hayaletin "havada" gölgesi de sprite: aksi hâlde her TUTMA anında
    // hücre başına bir shadowBlur çalışıyordu ve tutuş tek karelik bir
    // sıçrama üretiyordu (ölçüldü: sürüklemede p99 150ms, medyan 34ms —
    // yani tek seferlik tutuş maliyeti). Böylece shadowBlur etkileşim
    // yolundan tamamen çıktı; yalnızca sprite üretiminde kalıyor.
    const shadow = mk(x => {
      x.save();
      x.shadowColor = 'rgba(0,0,0,.5)';
      // Blur+offset payandanın İÇİNDE kalmalı, yoksa gölge kırpılır.
      x.shadowBlur = geom.cs * 0.09; x.shadowOffsetY = geom.cs * 0.05;
      x.fillStyle = 'rgba(0,0,0,.85)';
      rrect(x, pad, pad, geom.cs, geom.cs, geom.cs * 0.14);
      x.fill();
      x.restore();
    });
    cellTex = { pad, S, socket: mk(x => drawSocketC(x, pad, pad, geom.cs)), jewels, shadow };
  }

  // Yerleştirme animasyonu süresince ilgili hücreler cache'e YAZILMAZ (soket
  // olarak kalır); kristali FX katmanı düşürüp oturtur. Animasyon bitince
  // cache yeniden kurulur ve kristal kalıcı olarak board'a yazılır.
  let placingCells = null;

  // Offscreen cache: tüm board (soketler + kristaller) — board değişince bir kez.
  function buildBoardCache() {
    if (!geom) return;
    if (!cellTex) buildCellTextures();
    bctx.clearRect(0, 0, geom.cssW, geom.cssW);
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const px = x * geom.step, py = y * geom.step;
      const j = (placingCells && placingCells.has(y * G + x)) ? 0 : board[y][x];
      if (cellTex) {
        const t = j ? cellTex.jewels[j] : cellTex.socket;
        if (t) { bctx.drawImage(t, px - cellTex.pad, py - cellTex.pad, cellTex.S, cellTex.S); continue; }
      }
      if (j) drawCrystalC(bctx, px, py, geom.cs, j);
      else drawSocketC(bctx, px, py, geom.cs);
    }
  }

  // Cache'e YALNIZCA verilen hücreleri işler (tüm board'u kurmadan).
  // Eskiden yerleştirme animasyonu bitince renderBoard() çağrılıyordu, yani
  // yerleştirme başına board cache'i İKİ KEZ kuruluyordu (biri placePiece'te
  // soketlerle, biri animasyon bitince kristallerle) — her biri 64 blit +
  // tam tuval temizliği. Sprint 3 sonrası "hafif fps düşüşleri"nin kaynağı buydu.
  // Sprite payandası komşuya taştığı için etkilenen bölge konan hücreler +
  // 8 komşusu; payanda (0.35·cs) bir hücreden kısa olduğu için ±1 yeterli.
  function commitCells(cells) {
    if (!geom || !cellTex) { renderBoard(); return; }
    // YALNIZCA HÜCRENİN KENDİ DİKDÖRTGENİ temizlenir — payandalı kutu DEĞİL.
    //
    // Eski hâl "hayalet çerçeve" hatasının kaynağıydı: payandalı kutu
    // (S = cs + 2·pad) temizleniyordu ve payanda (≈6px) hücreler arası
    // boşluktan (GAP=3px) BÜYÜK olduğu için her temizlik komşu hücrenin
    // içine ≈3px giriyordu. Komşular (±1) yeniden çiziliyordu ama ±2
    // mesafedeki hücrelerin o 3px'lik şeridi siliniyor ve BİR DAHA
    // ÇİZİLMİYORDU. Soket yarı saydam olduğu için (rgba(8,10,30,.5))
    // silinen yerde kaide olduğu gibi görünüyor → konan taşı saran, daha
    // AÇIK renkli ince bir çerçeve. Kalınlığı pad−GAP olduğu için pad
    // küçültülünce inceliyor ama kaybolmuyordu.
    //
    // Artık gerek de yok: glow kaldırıldığından sprite'ın payandası TAMAMEN
    // SAYDAM ve görünür içeriği tam olarak hücre dikdörtgeni. Hücreyi
    // temizleyip sprite'ı basmak komşulara hiç dokunmuyor — bu yüzden
    // komşuları set'e eklemeye de gerek kalmadı (daha az blit).
    // DİKKAT: hücre dışına taşan bir efekt (glow/gölge) sprite'a geri
    // eklenirse bu varsayım bozulur — o zaman ya payandalı temizliğe
    // dönülmeli ya da etkilenen komşular yeniden çizilmeli.
    for (const c of cells) {
      if (c.y < 0 || c.y >= G || c.x < 0 || c.x >= G) continue;
      const px = c.x * geom.step, py = c.y * geom.step, j = board[c.y][c.x];
      bctx.clearRect(px, py, geom.cs, geom.cs);
      const t = j ? cellTex.jewels[j] : cellTex.socket;
      if (t) bctx.drawImage(t, px - cellTex.pad, py - cellTex.pad, cellTex.S, cellTex.S);
    }
    requestPaint();
  }

  // Bir hücreye preview highlight çiz.
  function drawPreviewCell(y, x, ok) {
    const px = x * geom.step, py = y * geom.step, r = geom.cs * 0.14;
    rrect(ctx, px, py, geom.cs, geom.cs, r);
    ctx.fillStyle = ok ? 'rgba(34,197,94,.28)' : 'rgba(239,68,68,.16)';
    ctx.fill();
    rrect(ctx, px + 1, py + 1, geom.cs - 2, geom.cs - 2, r);
    ctx.strokeStyle = ok ? 'rgba(74,222,128,.7)' : 'rgba(248,113,113,.45)';
    ctx.lineWidth = 2; ctx.stroke();
  }

  // Tek çizim noktası (yalnızca rAF'tan çağrılır — bkz. requestPaint).
  // HER KARE TAM BLIT — bilerek. Önceden "kirli dikdörtgen" mantığı vardı:
  // eski preview hücreleri cache'ten tek tek geri yüklenir, yenileri çizilirdi.
  // İki sebeple kaldırıldı:
  //  1) DOĞRULUK: preview'un kendisi 2px'lik bir ÇERÇEVE. Geri yükleme
  //     defterinin (prevPreview) durumla en ufak sapması ekranda takılı kalmış
  //     hayalet bir çerçeve bırakır. Kalıntı riskini kökünden kaldırmak,
  //     birkaç mikrosaniyeden çok daha değerli.
  //  2) MALİYET: cache ARTIK TEK BİR GÖRÜNTÜ (kristaller commitCells ile
  //     artımlı işleniyor), yani tam blit = TEK drawImage. Hücre hücre geri
  //     yükleme 4-5 drawImage yapıyordu — yani dirty-rect burada daha da
  //     pahalıydı. Pahalı olan tahtayı yeniden ÇİZMEK, hazır görüntüyü
  //     basmak değil; o kural (bkz. ROADMAP) commitCells'te korunuyor.
  function paintBoard() {
    if (!geom) return;
    ctx.clearRect(0, 0, geom.cssW, geom.cssW);
    ctx.drawImage(boardCache, 0, 0, geom.cssW, geom.cssW);
    if (drag && drag.previewCells) {
      const ok = drag.valid;
      for (const { y, x } of drag.previewCells) {
        if (y < 0 || y >= G || x < 0 || x >= G) continue;
        drawPreviewCell(y, x, ok);
      }
    }
  }

  // Canvas layout'u hazır olana kadar (clientWidth > 0) bekleyip callback'i çağır.
  function ensureCanvas(cb) {
    if (sizeCanvas()) { cb(); return; }
    requestAnimationFrame(() => ensureCanvas(cb));
  }

  // ═══════════ FX KATMANI (Faz 2) ═══════════
  // Tüm patlama/parçacık efektleri TEK bir canvas'ta ve TEK bir rAF
  // döngüsünde. Eskiden her kıymık/glif/flaş ayrı bir DOM elemanıydı
  // (yüzlerce eleman, her biri kendi CSS animasyonu + box-shadow/blur ile);
  // patlamada fps'in 3-9'a düşmesinin sebebi buydu.
  //
  // Kritik: parçacık yokken döngü DURUR — idle maliyeti tam sıfır.
  // Buffer render-scale'e tabi (board ile aynı), yani fill-rate de kontrollü.
  let fxCv = null, fxCtx = null, fxGeom = null, fxRaf = 0;
  const fxList = [];
  let glowSprite = [];

  // Parçacık parıltısı SPRITE olarak bir kez üretilir. Alternatif olan
  // shadowBlur, parçacık başına kare başına yeniden bulanıklaştırma demek —
  // canvas'ta da pahalı. Hazır sprite'ı ölçekleyip basmak neredeyse bedava.
  function glowSpriteFor(j) {
    if (glowSprite[j]) return glowSprite[j];
    const S = 48, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d'), col = JCOL[j] || JCOL[1];
    const g = x.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.28, col.hl);
    g.addColorStop(0.62, col.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    glowSprite[j] = c;
    return c;
  }

  // ── DOKU ÖNBELLEĞİ ──
  // Gradyanı HER KARE yeniden üretip tam ekran doldurmak, patlamadaki asıl
  // maliyetti (ölçüldü A51: patlama sırasında p99 93ms, idle 61ms). Gradyan
  // bir kez KÜÇÜK bir tuvale pişirilip ölçeklenerek basılıyor: piksel başına
  // gradyan hesabı yerine tek bitmap blit. Görüntü aynı (gradyanlar zaten
  // yumuşak), maliyet birkaç kat düşük.
  const _tex = {};
  function tex(key, w, h, paint) {
    if (_tex[key]) return _tex[key];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    _tex[key] = c;
    return c;
  }
  // Radyal ışık dokusu (flaş/boşalma): merkezden dışa sönümlenen daire.
  function radialTex(key, stops) {
    return tex(key, 128, 128, (x, w, h) => {
      const g = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
      for (const [p, col] of stops) g.addColorStop(p, col);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  }
  // Kıymık dokusu: mücevher gradyanlı yuvarlak köşeli parça.
  function shardTexFor(j) {
    const col = JCOL[j] || JCOL[1];
    return tex('sh' + j, 24, 28, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, col.hl); g.addColorStop(0.55, col.base); g.addColorStop(1, col.sh);
      x.fillStyle = g;
      const r = 5;
      x.beginPath(); x.moveTo(r, 0);
      x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r);
      x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r);
      x.closePath(); x.fill();
    });
  }

  function fxEnsure() {
    if (fxCv || !container) return;
    fxCv = document.createElement('canvas');
    fxCv.className = 'bp-fx';
    container.appendChild(fxCv);
    fxCtx = fxCv.getContext('2d');
    fxResize();
  }
  function fxResize() {
    if (!fxCv || !container) return;
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = Math.min(window.devicePixelRatio || 1, 3) * RENDER_SCALE;
    fxCv.width = Math.round(r.width * s);
    fxCv.height = Math.round(r.height * s);
    fxCv.style.width = r.width + 'px';
    fxCv.style.height = r.height + 'px';
    fxCtx.setTransform(s, 0, 0, s, 0, 0);
    fxGeom = { w: r.width, h: r.height };
    _fxOff = null;
  }
  // Hücre merkezi — FX CANVAS uzayında (cellCenter wrapEl uzayında çalışır;
  // efektler artık container'ı kaplayan fx canvas'a çiziliyor).
  // Offset CACHE'li: runePulse tek seferde 64 hücre sorabiliyor ve her biri
  // 2 getBoundingClientRect demek olurdu — layout okuma fırtınası. Ofset
  // yalnızca düzen değişince değişir; sizeCanvas/fxResize'da düşürülüyor.
  let _fxOff = null;
  function fxCell(y, x) {
    if (!cv || !geom || !fxCv) return null;
    if (!_fxOff) {
      const b = cv.getBoundingClientRect(), f = fxCv.getBoundingClientRect();
      _fxOff = { x: b.left - f.left, y: b.top - f.top };
    }
    return {
      x: _fxOff.x + x * geom.step + geom.cs / 2,
      y: _fxOff.y + y * geom.step + geom.cs / 2,
      size: geom.cs
    };
  }
  function fxAdd(o) {
    fxEnsure();
    if (!fxCtx) return;
    o.t0 = performance.now() + (o.delay || 0);
    fxList.push(o);
    if (!fxRaf) fxRaf = requestAnimationFrame(fxTick);
  }
  function fxTick(now) {
    fxRaf = 0;
    if (!fxCtx || !fxGeom) return;
    fxCtx.clearRect(0, 0, fxGeom.w, fxGeom.h);
    for (let i = fxList.length - 1; i >= 0; i--) {
      const o = fxList[i];
      const el = now - o.t0;
      if (el < 0) continue;                       // gecikmeli efekt henüz başlamadı
      const p = el / o.dur;
      if (p >= 1) { fxList.splice(i, 1); if (o.done) o.done(); continue; }
      o.draw(fxCtx, p, now);
    }
    if (fxList.length) fxRaf = requestAnimationFrame(fxTick);
    else fxCtx.clearRect(0, 0, fxGeom.w, fxGeom.h);   // son kare: tuvali temiz bırak
  }
  function fxClear() {
    if (fxRaf) { cancelAnimationFrame(fxRaf); fxRaf = 0; }
    fxList.length = 0;
    if (fxCtx && fxGeom) fxCtx.clearRect(0, 0, fxGeom.w, fxGeom.h);
  }
  const easeOut = p => 1 - Math.pow(1 - p, 3);

  // ── YERLEŞTİRME: DÜŞ → EZİL → OTUR (Sprint 3/A) ──
  // Ağırlık hissi EZİLMEden gelir. Kristal scale(0)'dan büyüseydi "belirdi"
  // gibi okunurdu, "düştü" gibi değil: sıra kasıtlı — yukarıdan gel (büyük) →
  // çarpınca ez → geri yaylan → otur. DOM'daki bpPlaceIn tasarımı birebir
  // korundu (280ms, hücre başına 12ms kademe); tek fark düşüş mesafesinin
  // sabit -9px yerine hücre boyutuna oranlanması (her ekranda aynı hissetsin).
  const PLACE_MS = 280, PLACE_STAGGER = 12;
  function placeAnimState(u) {
    const ease = t => t * t * (3 - 2 * t);           // smoothstep
    if (u < 0.45) { const t = ease(u / 0.45); return { ty: -1 + t, s: 1.14 + (0.93 - 1.14) * t, a: 0.5 + 0.5 * t }; }
    if (u < 0.72) { const t = ease((u - 0.45) / 0.27); return { ty: 0, s: 0.93 + (1.04 - 0.93) * t, a: 1 }; }
    const t = ease((u - 0.72) / 0.28);
    return { ty: 0, s: 1.04 + (1 - 1.04) * t, a: 1 };
  }
  function fxPlaceIn(cells, jewel) {
    if (!cellTex) buildCellTextures();
    // Bu animasyonun SAHİP olduğu hücreler. Hızlı ardışık hamlelerde ikinci
    // yerleştirme placingCells'i devralır; kimlik karşılaştırması sayesinde
    // biten animasyon başkasının hücrelerini iptal etmez.
    const myCells = new Set(cells.map(c => c.y * G + c.x));
    placingCells = myCells;
    // renderBoard() ÇAĞRILMIYOR — ve çağrılmamalı. Konan hücreler yerleştirme
    // öncesinde BOŞTU, yani cache'te zaten soket duruyor; animasyon boyunca
    // istediğimiz görüntü de tam olarak bu. Buradaki eski renderBoard() çağrısı
    // yerleştirme başına 64 blit + tam tuval temizliğini boşuna yapıyordu.
    // placingCells yine de set ediliyor: araya giren bir cache kurulumu
    // (ör. resize) olursa bu hücreleri soket çizsin diye.
    if (!cellTex || !geom || !cellTex.jewels[jewel]) {
      if (placingCells === myCells) placingCells = null;
      commitCells(cells);
      return;
    }
    const t = cellTex.jewels[jewel], S = cellTex.S;
    const drop = geom.cs * 0.2;                       // DOM'daki -9px'in oranı
    const list = cells.map((c, i) => ({ y: c.y, x: c.x, delay: i * PLACE_STAGGER }));
    const total = PLACE_MS + (list.length - 1) * PLACE_STAGGER;
    fxAdd({
      dur: total,
      draw(c, p, now) {
        if (!placingCells || !geom || !cellTex) return;
        const el = now - this.t0;
        for (const s of list) {
          const u = (el - s.delay) / PLACE_MS;
          if (u < 0) continue;                        // sırası gelmedi: soket görünür
          // Biten hücre OTURMUŞ hâlde çizilmeye devam eder: cache ancak tüm
          // dizi bitince yazılıyor, aksi hâlde erken biten hücre kaybolurdu.
          const st = u >= 1 ? { ty: 0, s: 1, a: 1 } : placeAnimState(u);
          const q = fxCell(s.y, s.x);
          if (!q) continue;
          c.save();
          c.globalAlpha = st.a;
          c.translate(q.x, q.y + st.ty * drop);
          c.scale(st.s, st.s);
          c.drawImage(t, -S / 2, -S / 2, S, S);
          c.restore();
        }
      },
      // Bitişte TÜM board yeniden kurulmaz — yalnızca konan hücreler cache'e
      // işlenir (bkz. commitCells). placingCells başka bir yerleştirme
      // tarafından değiştirilmişse (hızlı ardışık hamle) dokunma: o zaman
      // sahibi olan animasyon kendi hücrelerini işleyecek.
      done() {
        if (placingCells === myCells) placingCells = null;
        commitCells(cells);
      },
    });
  }

  // ── ŞARJ (1. VURUŞ) ──
  // Temizlenecek hücreler patlamadan önce beyaza yaklaşır. Beklenti anı;
  // bu vuruş olmadan patlama "birden oldu" gibi okunuyor.
  function fxCharge(idxs, dur) {
    const cells = idxs.map(i => fxCell(Math.floor(i / G), i % G)).filter(Boolean);
    if (!cells.length) return;
    fxAdd({ dur, draw(c, p) {
      c.save();
      c.globalAlpha = Math.min(1, p * 1.4) * 0.85;
      c.fillStyle = '#fff';
      for (const q of cells) {
        const gr = 1 + p * 0.06, s = q.size * gr;
        rrect(c, q.x - s / 2, q.y - s / 2, s, s, s * 0.14);
        c.fill();
      }
      c.restore();
    }});
  }

  // ── KRİSTAL KIYMIKLARI — İKİ POPÜLASYON ──
  // Tasarım DOM sürümünden birebir korundu: birkaç İRİ parça (olayın
  // gövdesi) + çok sayıda kırıntı (dokusu), yerçekimiyle düşen, dönen.
  // Fark: yüzlerce DOM elemanı yerine tek canvas döngüsünde tek dizi.
  function shatterShards(cellIdxs, jewelOf, budget) {
    const parts = [];
    const bigCount = Math.max(2, Math.min(6, Math.round(cellIdxs.length / 3)));
    const pool = [...cellIdxs];
    const push = (i, big) => {
      const q = fxCell(Math.floor(i / G), i % G);
      if (!q) return;
      const ang = Math.random() * Math.PI * 2;
      parts.push({
        x: q.x, y: q.y, big,
        tex: shardTexFor(jewelOf(i) || 1),
        ang, dist: big ? 34 + Math.random() * 54 : 20 + Math.random() * 52,
        // Yerçekimi: kıymık savrulur AMA düşer. İri parça daha ağır.
        fall: big ? 26 : 14,
        sz: big ? 13 + Math.random() * 10 : 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 4 - Math.PI * 2,
        dur: big ? 600 + Math.random() * 220 : 400 + Math.random() * 200,
      });
    };
    for (let k = 0; k < bigCount && pool.length; k++) {
      push(pool.splice((Math.random() * pool.length) | 0, 1)[0], true);
    }
    const small = Math.max(0, budget - bigCount);
    const per = Math.max(1, Math.min(5, Math.round(small / (cellIdxs.length || 1))));
    let spent = 0;
    for (const i of cellIdxs) {
      if (spent >= small) break;
      for (let k = 0; k < per && spent < small; k++, spent++) push(i, false);
    }
    if (!parts.length) return;
    const total = Math.max(...parts.map(s => s.dur));
    fxAdd({ dur: total, draw(c, p, now) {
      for (const s of parts) {
        const sp = (now - this.t0) / s.dur;
        if (sp >= 1) continue;
        const e = easeOut(sp);
        const x = s.x + Math.cos(s.ang) * s.dist * e;
        const y = s.y + Math.sin(s.ang) * s.dist * e + s.fall * sp * sp;
        // Doku blit'i: gradyan + yol dolgusu parçacık başına kare başına
        // yapılmıyor (bkz. DOKU ÖNBELLEĞİ notu).
        c.save();
        c.globalAlpha = 1 - sp * sp;
        c.translate(x, y);
        c.rotate(s.rot * sp);
        const w = s.sz, h = s.sz * (s.big ? 1.15 : 1.5);
        c.drawImage(s.tex, -w / 2, -h / 2, w, h);
        c.restore();
      }
    }});
  }

  // ── SAHNE FLAŞI ── Dünyayı aydınlatır, tahtayı değil. Çekirdek (kısa,
  // neredeyse beyaz) + artçı (uzun, sönük, mücevher renginde).
  function sceneFlash(jewel, intensity) {
    const col = JCOL[jewel] || JCOL[1];
    // Dokular bir kez pişer; kare başına iş yalnızca ölçekli bir blit.
    // Elips oranları DOM sürümünden korundu (çekirdek 72%×52%, artçı 95%×70%).
    const core = radialTex('fc' + jewel, [
      [0, 'rgba(255,255,255,.95)'], [0.30, col.hl], [0.55, col.glow], [0.80, 'rgba(0,0,0,0)']]);
    const after = radialTex('fa' + jewel, [
      [0, col.glow], [0.76, 'rgba(0,0,0,0)']]);
    const mk = (t, peak, dur, rx, ry, cyf) => fxAdd({ dur, draw(c, p) {
      if (!fxGeom) return;
      // Ani yükseliş (%8'de zirve) + hızlı düşüş = DARBE.
      const a = p < 0.08 ? (p / 0.08) * peak : peak * (1 - (p - 0.08) / 0.92);
      if (a <= 0) return;
      const w = fxGeom.w, h = fxGeom.h, cx = w / 2, cy = h * cyf;
      const ex = w * rx, ey = h * ry;
      c.save(); c.globalAlpha = a;
      c.drawImage(t, cx - ex, cy - ey, ex * 2, ey * 2);
      c.restore();
    }});
    // ÇEKİRDEK korunuyor: darbe karesi bu — patlamanın "vurdu" hissi buradan
    // geliyor ve 90ms sürüyor.
    mk(core,  Math.min(intensity, 0.92),        90,  0.72, 0.52, 0.52);
    // ARTÇI KAPALI (ölçüm kararı). Tam ekranı 300ms boyunca dolduruyordu,
    // yani çekirdekten ÜÇ KAT uzun. A/B ölçümü (A51, aynı termal durum):
    //   sceneFlash açık  -> yoğun yerleştirme p99 113ms (idle 53)  = +60ms
    //   sceneFlash kapalı-> yoğun yerleştirme p99  69ms (idle 57)  = +12ms
    // Yani patlamadaki hissedilen takılmanın büyük kısmı bu iki tam-ekran
    // dolgusuydu ve maliyetin çoğu uzun süren artçıdaydı. Çekirdek kalınca
    // darbe korunuyor, süregelen maliyet kalkıyor.
    // Geri almak: aşağıdaki satırın yorumunu kaldır.
    // mk(after, Math.min(intensity * 0.55, 0.5), 300,  0.95, 0.70, 0.55);
  }

  // ── ŞOK DALGASI ── Tahtadan çıkıp tüm sahneyi kat eden halka.
  function shockwave(jewel) {
    const mid = (G - 1) / 2 | 0, q = fxCell(mid, mid);
    if (!q || !fxGeom) return;
    const col = JCOL[jewel] || JCOL[1];
    const rMax = Math.max(fxGeom.w, fxGeom.h) * 0.55;
    fxAdd({ dur: 460, draw(c, p) {
      const e = easeOut(p);
      const r = rMax * (0.04 + e * 1.1);
      c.save();
      c.globalAlpha = p < 0.1 ? p / 0.1 * 0.95 : 0.95 * (1 - (p - 0.1) / 0.9);
      // Yayıldıkça İNCELEN halka (gerçek şok dalgası gibi).
      c.lineWidth = Math.max(1, q.size * 0.5 * (1 - e * 0.75));
      c.strokeStyle = col.hl;
      c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.stroke();
      c.globalAlpha *= 0.55; c.lineWidth *= 0.35; c.strokeStyle = '#fff';
      c.beginPath(); c.arc(q.x, q.y, r, 0, Math.PI * 2); c.stroke();
      c.restore();
    }});
  }

  // ── IŞIK SÜTUNU ── Temizlenen çizgiden yukarı kaçan enerji.
  function lightColumn(line, jewel) {
    const mid = (G - 1) / 2 | 0;
    const q = line.type === 'row' ? fxCell(line.idx, mid) : fxCell(mid, line.idx);
    if (!q || !geom) return;
    const col = JCOL[jewel] || JCOL[1];
    const w0 = line.type === 'row' ? geom.cssW * 0.82 : q.size * 2.1;
    const h0 = q.y + 40;
    // ÖNEMLİ: doku İKİ boyutlu sönümlenmeli. İlk canvas port'u dikey lineer
    // gradyan kullanıyordu; yatayda hiç sönümleme olmadığı için sütun, sol/sağ
    // kenarları KESKİN bir dikdörtgen olarak görünüyordu ("patlamayla alakasız
    // gereksiz dikdörtgen" — kullanıcı raporu). DOM sürümünde yumuşaklık önce
    // filter:blur(6px), sonra (perf için) elips radial-gradient ile geliyordu;
    // burada da aynısı: tabandan (alt-orta) yayılan elips.
    const t = tex('col' + jewel, 64, 128, (x, w, h) => {
      const cx = w / 2, cy = h, rx = w * 0.62, ry = h * 1.16;
      x.save();
      x.translate(cx, cy);
      x.scale(rx, ry);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, '#fff'); g.addColorStop(0.26, col.hl);
      g.addColorStop(0.58, col.glow); g.addColorStop(0.78, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(-cx / rx, -cy / ry, w / rx, h / ry);
      x.restore();
    });
    fxAdd({ dur: 520, draw(c, p) {
      const e = easeOut(p);
      const sy = 0.04 + e * 0.96, sx = 0.7 + e * 0.55;
      c.save();
      c.globalAlpha = p < 0.16 ? p / 0.16 * 0.9 : 0.9 * (1 - (p - 0.16) / 0.84);
      c.translate(q.x, q.y);
      c.scale(sx, sy);
      c.drawImage(t, -w0 / 2, -h0, w0, h0);
      c.restore();
    }});
  }

  // ── EKSEN SÜPÜRMESİ ── Enerji rastgele değil ÇİZGİ boyunca boşalıyor.
  function axisSweep(line, jewel) {
    const mid = (G - 1) / 2 | 0;
    const q = line.type === 'row' ? fxCell(line.idx, mid) : fxCell(mid, line.idx);
    if (!q || !geom) return;
    const col = JCOL[jewel] || JCOL[1];
    const row = line.type === 'row';
    const long = geom.cssW * 1.05, thick = q.size * 0.9;
    // Bant: yatayda uçlara doğru sönümlenir (gradyan), DİKEYDE de kenarları
    // yumuşar. Dikey sönümleme olmadan bant, üst/alt kenarları keskin bir
    // şerit gibi duruyordu (sütundakiyle aynı sınıf hata; DOM'da bunu
    // filter:blur(1px) örtüyordu). Satır/sütun farkı çizimde döndürmeyle.
    const t = tex('swp' + jewel, 128, 16, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, col.hl);
      g.addColorStop(0.5, '#fff'); g.addColorStop(0.65, col.hl);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      // Dikey yumuşatma: kenarları saydamlaştıran maske.
      x.globalCompositeOperation = 'destination-in';
      const m = x.createLinearGradient(0, 0, 0, h);
      m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, '#000');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = m; x.fillRect(0, 0, w, h);
    });
    fxAdd({ dur: 380, draw(c, p) {
      c.save();
      c.globalAlpha = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      c.translate(q.x, q.y);
      if (!row) c.rotate(Math.PI / 2);
      c.drawImage(t, -long / 2, -thick / 2, long, thick);
      c.restore();
    }});
  }

  // ── RÜN GLİFLERİ (combo 2+) ── Nokta değil YAZI: levhadan kaçan büyü.
  const GLYPHS = ['ᚦ','ᛝ','ᛟ','ᚨ','ᛉ','ᛊ','ᛃ','ᛒ'];
  function runeGlyphs(cellIdxs, jewel, count) {
    const n = Math.min(count, GLYPH_CAP), col = JCOL[jewel] || JCOL[1], parts = [];
    for (let k = 0; k < n; k++) {
      const i = cellIdxs[(Math.random() * cellIdxs.length) | 0];
      const q = fxCell(Math.floor(i / G), i % G);
      if (!q) continue;
      parts.push({
        x: q.x + (Math.random() * 20 - 10), y: q.y,
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        sz: (15 + Math.random() * 9) | 0,
        dx: Math.random() * 40 - 20,
        r0: (Math.random() * 40 - 20) * Math.PI / 180,
        r1: (Math.random() * 50 - 25) * Math.PI / 180,
        dur: (560 + Math.random() * 220) | 0,
      });
    }
    if (!parts.length) return;
    const total = Math.max(...parts.map(s => s.dur));
    fxAdd({ dur: total, draw(c, p, now) {
      c.save();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col.hl;
      for (const s of parts) {
        const sp = (now - this.t0) / s.dur;
        if (sp >= 1) continue;
        c.save();
        c.globalAlpha = sp < 0.2 ? sp / 0.2 : 1 - (sp - 0.2) / 0.8;
        c.translate(s.x + s.dx * sp, s.y - 46 * easeOut(sp));
        c.rotate(s.r0 + (s.r1 - s.r0) * sp);
        c.font = '600 ' + s.sz + 'px serif';
        c.fillText(s.ch, 0, 0);
        c.restore();
      }
      c.restore();
    }});
  }

  // ── YILDIZ TOZU (3. VURUŞ: KALINTI) ── Olay bitti, izi duruyor.
  function stardust(cellIdxs, jewel, count) {
    const n = Math.min(count, DUST_CAP), parts = [];
    for (let k = 0; k < n; k++) {
      const i = cellIdxs[(Math.random() * cellIdxs.length) | 0];
      const q = fxCell(Math.floor(i / G), i % G);
      if (!q) continue;
      parts.push({
        x: q.x, y: q.y, sz: 1.5 + Math.random() * 2,
        dx: Math.random() * 54 - 27, dy: -30 - Math.random() * 40,
        dur: (760 + Math.random() * 380) | 0,
      });
    }
    if (!parts.length) return;
    const sp0 = glowSpriteFor(jewel), total = Math.max(...parts.map(s => s.dur));
    fxAdd({ dur: total, draw(c, p, now) {
      for (const s of parts) {
        const sp = (now - this.t0) / s.dur;
        if (sp >= 1) continue;
        const e = easeOut(sp), r = s.sz * 3.2;
        c.save();
        c.globalAlpha = (1 - sp) * 0.9;
        c.drawImage(sp0, s.x + s.dx * e - r, s.y + s.dy * e - r, r * 2, r * 2);
        c.restore();
      }
    }});
  }

  // ── RÜN ÇEMBERİ (combo 4+) ── Seyrek olduğu için çıktığında OLAY olur.
  function runeCircle(jewel) {
    const mid = (G - 1) / 2 | 0, q = fxCell(mid, mid);
    if (!q || !geom) return;
    const col = JCOL[jewel] || JCOL[1], d = geom.cssW * 0.78;
    fxAdd({ dur: 660, draw(c, p) {
      const e = easeOut(p);
      c.save();
      c.globalAlpha = (p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85) * 0.9;
      c.strokeStyle = col.glow; c.lineWidth = 3;
      c.beginPath(); c.arc(q.x, q.y, (d / 2) * (0.35 + e * 0.65), 0, Math.PI * 2); c.stroke();
      c.restore();
    }});
  }

  // ── IŞIK DALGASI ── Küçük beyaz halka (çizgi başına).
  function lightWave(cx, cy) {
    fxAdd({ dur: 600, draw(c, p) {
      const e = easeOut(p);
      c.save();
      c.globalAlpha = (1 - p) * 0.55;
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy, 140 * e, 0, Math.PI * 2); c.stroke();
      c.restore();
    }});
  }

  // ── TEMAS KIVILCIMLARI (yerleştirme) ── Paylaşılan kenardan dik fırlar.
  // Boşluğa konan taş kıvılcım üretmez: efekt, sıkı yerleştirmenin ödülü.
  const SPARK_CAP = 14;
  function contactSparks(edges, jewel) {
    if (!edges.length) return;
    const use = edges.slice(0, SPARK_CAP);
    const perEdge = Math.min(3, Math.max(1, Math.floor(SPARK_CAP / use.length)));
    const parts = [];
    for (const { y, x, dy, dx } of use) {
      const q = fxCell(y, x);
      if (!q) continue;
      const half = q.size / 2, ex = q.x + dx * half, ey = q.y + dy * half;
      for (let k = 0; k < perEdge; k++) {
        const spread = (Math.random() - 0.5) * q.size * 0.55;
        parts.push({
          x: ex + (dx ? 0 : spread), y: ey + (dy ? 0 : spread),
          vx: dx * (7 + Math.random() * 9), vy: dy * (7 + Math.random() * 9),
          sz: 2 + Math.random() * 2.5, dur: (260 + Math.random() * 120) | 0,
        });
      }
    }
    if (!parts.length) return;
    const sp0 = glowSpriteFor(jewel), total = Math.max(...parts.map(s => s.dur));
    fxAdd({ dur: total, draw(c, p, now) {
      for (const s of parts) {
        const sp = (now - this.t0) / s.dur;
        if (sp >= 1) continue;
        const e = easeOut(sp), r = s.sz * 2.6;
        c.save();
        c.globalAlpha = 1 - sp;
        c.drawImage(sp0, s.x + s.vx * e - r, s.y + s.vy * e - r, r * 2, r * 2);
        c.restore();
      }
    }});
  }

  // ── KAİDE BOŞALMASI (yerleştirme) ── Enerjinin levhaya sızması.
  function daisDischarge(cells, jewel) {
    let sx = 0, sy = 0, n = 0, size = 0;
    for (const c0 of cells) {
      const q = fxCell(c0.y, c0.x);
      if (q) { sx += q.x; sy += q.y; size = q.size; n++; }
    }
    if (!n) return;
    const x = sx / n, y = sy / n, R = size * 2.5, col = JCOL[jewel] || JCOL[1];
    const t = radialTex('dis' + jewel, [[0, col.glow], [1, 'rgba(0,0,0,0)']]);
    fxAdd({ dur: 480, draw(c, p) {
      const e = easeOut(p), r = R * (0.3 + e * 0.7);
      c.save();
      c.globalAlpha = (1 - p) * 0.5;
      c.drawImage(t, x - r, y - r, r * 2, r * 2);
      c.restore();
    }});
  }

  // ── IZGARA İLETİMİ (yerleştirme) ── Dalga konan taşın gövdesinden yayılır,
  // yarıçapla sönümlenir; gecikme mesafeyle artar (dışa yayılan dalga).
  function runePulse(cells, jewel) {
    const col = JCOL[jewel] || JCOL[1], touched = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      let d = Infinity;
      for (const c0 of cells) { const t = Math.hypot(y - c0.y, x - c0.x); if (t < d) d = t; }
      const inten = 0.62 * (1 - d / RUNE_R);
      if (d <= RUNE_R && inten >= RUNE_MIN_I) {
        const q = fxCell(y, x);
        if (q) touched.push({ q, i: inten, delay: d * 26 });
      }
    }
    if (!touched.length) return;
    const dur = RUNE_R * 26 + 280;
    fxAdd({ dur, draw(c, p, now) {
      const el = now - this.t0;
      c.save();
      c.fillStyle = col.glow;
      for (const t of touched) {
        const sp = (el - t.delay) / 280;
        if (sp < 0 || sp >= 1) continue;
        c.globalAlpha = t.i * (sp < 0.3 ? sp / 0.3 : 1 - (sp - 0.3) / 0.7);
        const s = t.q.size;
        rrect(c, t.q.x - s / 2, t.q.y - s / 2, s, s, s * 0.14);
        c.fill();
      }
      c.restore();
    }});
  }

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

  // (lightWave artık canvas FX katmanında — bkz. FX KATMANI bölümü.)

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
  // Izgara geometrisi CACHE'i. Eskiden cellCenter her çağrıda hücre + wrapEl
  // için 2 getBoundingClientRect yapıyordu; efektler DOM'a partikül eklerken
  // aralara giren bu okumalar tarayıcıyı her seferinde zorla senkron layout'a
  // sokuyordu (layout thrashing). Tam tahta temizlemede yüzlerce reflow üst
  // üste binip tek kareyi ~500ms'ye çıkarıyordu (A51'de ölçüldü: 9-11 fps).
  // Artık geometri hamle başına BİR kez ölçülüp aritmetikle dağıtılıyor:
  // ölçüm ardışık okumalardan oluşur (aralarında yazma yok) → tek reflow.
  // Grid uniform olduğu için hücre merkezi = köşe + sütun/satır × adım + yarım.
  // Cache renderBoard()'ta ve window resize'da düşürülür (bkz. aşağısı).
  // Hücre merkezi (wrapEl uzayında) — canvas geometrisinden hesaplanır.
  // floatText ve (Faz 2'de) efektler bunu kullanır; DOM ölçümü yok, geom
  // sizeCanvas'ta hazır. cv, dais'in içinde konumlandığı için canvas'ın
  // ekran dikdörtgeni ile wrapEl'in farkı offset'i verir.
  function cellCenter(y, x) {
    if (!cv || !geom) return null;
    const b = cv.getBoundingClientRect();
    const w = wrapEl.getBoundingClientRect();
    return {
      x: b.left - w.left + x * geom.step + geom.cs / 2,
      y: b.top - w.top + y * geom.step + geom.cs / 2,
      size: geom.cs
    };
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
  // (runePulse ve daisDischarge artık canvas FX katmanında.)

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

  // (contactSparks artık canvas FX katmanında.)

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
  const SHARD_CAP = 24;   // kristal kıymığı — bütçe kısıldı 48→24 (perf: patlama burst fill-rate)
  const DUST_CAP  = 14;   // yıldız tozu (kalıntı)
  const GLYPH_CAP = 8;    // rün glifi (combo 2+)

  // Kristal kıymıkları — İKİ POPÜLASYON.
  // Tek boyutta kıymık dağıtmak patlamayı toz bulutu gibi gösteriyordu.
  // Gerçekte kırılan bir taş birkaç İRİ parça + çok sayıda kırıntı verir;
  // gözün "kırıldı" diye okuduğu şey bu boyut dağılımı. İri parçalar yavaş
  // ve takip edilebilir (olayın gövdesi), kırıntılar hızlı ve çok (dokusu).
  // (shard/shatterShards/shockwave/lightColumn/axisSweep/runeGlyphs/
  //  stardust/runeCircle/sceneFlash DOM surumleri kaldirildi — hepsi artik
  //  canvas FX katmaninda, tek rAF dongusunde. Bkz. FX KATMANI bolumu.)

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
      if (p) sparkTrail(p.x, p.y, '#c084fc', Math.min(10, level*2)); // kıvılcım tavan (perf: level*4 → cap 10)
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
      /* Board artık bir <canvas> (Sprint 1): kare, dais genişliğini doldurur.
         Kristal/soket/preview çizimi canvas'ta (drawCrystalC/paintBoard). */
      .bp-board{position:relative;z-index:1;display:block;width:100%;aspect-ratio:1;touch-action:none}
      /* FX katmanı (Faz 2): tüm sahneyi kaplar, tüm patlama/parçacık
         efektleri buraya çizilir. Tek eleman — eskiden her kıymık ayrı bir
         DOM düğümüydü. Tıklamayı engellemez, board'un üstünde durur. */
      .bp-fx{position:absolute;left:0;top:0;pointer-events:none;z-index:6}
      /* Boş hücre: düz kare değil, içe gömük karanlık yuva. Kristalin
         oturacağı SOKET — dolu hücreyle arasındaki derinlik farkı,
         tahtanın "yüzey" gibi okunmasını sağlayan şey. */
      .bp-c{aspect-ratio:1;border-radius:5px;position:relative;
        background:rgba(8,10,30,.5);
        /* transition:box-shadow KALDIRILDI (perf): önizleme pv-ok/pv-no her hücre
           değişiminde box-shadow'u geçiş süresi boyunca canlandırıp SÜRDÜRÜLEN bir
           repaint yaratıyordu; hızlı sürüklemede hücreler hızla değiştikçe spike'lar
           üst üste biniyordu (ölçüldü Y6: P95 150→31ms, overlay max 83→17ms).
           Önizleme artık anında değişiyor — bir drag göstergesi için doğrusu da bu. */
        box-shadow:inset 0 1px 3px rgba(0,0,0,.55),inset 0 -1px 0 rgba(180,165,255,.07)}
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
      /* pv-ok'un dış glow'u (0 0 14px) KALDIRILDI (perf): blur'lu dış gölge her
         önizleme hücresinde pahalı boyaydı; inset kenarlık + arka plan yeterli
         gösterge ve çok daha ucuz. pv-no'da zaten glow yoktu. */
      .bp-c.pv-ok{background:rgba(34,197,94,.28)!important;box-shadow:inset 0 0 0 2px rgba(74,222,128,.7)}
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
      /* filter:brightness kaldırıldı (perf): temizlenen her hücrede paint tetikliyordu.
         Şarj artık sadece transform:scale ile (compositor-only). */
      @keyframes bpCharging{
        0%{transform:scale(1)}
        100%{transform:scale(1.09)}}

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
        /* mix-blend-mode:screen kaldırıldı (perf): tam ekran flaş her karede backdrop
           yeniden harmanlıyordu; dark sahnede normal alfa ~aynı okunuyor. */
        animation:bpSceneFlash var(--bp-ffd,90ms) cubic-bezier(.1,.8,.3,1) forwards}
      /* Ani yükseliş (%8'de zirve) + hızlı düşüş = DARBE. Sabit bir tepeden
         sönmek "flaş" değil "aydınlatma" gibi okunuyor. */
      @keyframes bpSceneFlash{0%{opacity:0}8%{opacity:var(--bp-ffi,.5)}100%{opacity:0}}
      .bp-scene-flash.after{animation-duration:var(--bp-ffd,300ms)}

      /* ── ŞOK DALGASI ──
         Tahtadan çıkıp TÜM SAHNEYİ kat eden halka. Patlamanın tahtayla
         sınırlı kalmadığını söyleyen asıl katman bu — konteynere eklenir,
         wrapEl'e değil, yoksa oyun alanında hapsolurdu.
         Halka bir kenarlık değil radyal gradyan bandı: kenarlık transform
         ile ölçeklenince KALINLAŞIYOR, oysa gerçek şok dalgası yayıldıkça
         incelir. Gradyan bandı ölçekle orantılı kalır. */
      .bp-shock{position:absolute;border-radius:50%;pointer-events:none;z-index:2;
        /* mix-blend-mode:screen kaldırıldı (perf): 2.4× ekran halka her karede
           backdrop harmanlıyordu; parlak halka dark sahnede ~aynı görünüyor. */
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
        /* filter:blur(6px) KALDIRILDI (perf): sütun her karede scaleX/scaleY ile
           animasyonlu — canlı blur her kare yeniden rasterize oluyordu, patlamanın
           ana GPU maliyetlerinden biri. Yanların yumuşaklığı artık radyal gradyana
           gömülü (bkz. lightColumn): filter yok, her kare yeniden çizim yok. */
        transform-origin:50% 100%;
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
      /* .bp-tp artık bir <canvas> (tek eleman), grid değil. */
      .bp-tp{display:block;cursor:grab;touch-action:none;user-select:none;
        transition:transform var(--ph-duration-fast) var(--ph-ease-spring),opacity var(--ph-duration-fast)}
      .bp-tp:active{cursor:grabbing}
      .bp-tp.grabbed{opacity:.22;transform:scale(.72)}
      /* NOT: .bp-tp.fade-out kuralı bilerek burada DEĞİL, .bp-tp.new-in'den
         SONRA tanımlı (aşağıya bak) — ikisi aynı özgüllükte olduğu için
         sıra belirleyici. */
      .bp-tc{border-radius:4px;width:15px;height:15px;position:relative}
      /* drop-shadow TAMAMEN KALDIRILDI (perf): 9px'e indirilmişti ama hareket
         eden, will-change:transform'lu ghost'ta filter YİNE her kare yeniden
         rasterize oluyordu — A54'te sürüklemede +12ms/kare (boşta 16.7ms →
         sürüklerken 29ms; framestats ile ölçüldü, ana iş parçacığı 1.1ms yani
         maliyet tamamen GPU'da). "Kaldırma" gölgesi artık hücrelerin
         box-shadow'una gömülü: box-shadow, promoted katmanın raster'ına BİR KEZ
         pişip transform ile kaydırılıyor (filter gibi her kare yeniden çizilmez). */
      /* Hayalet artık TEK bir <canvas> (Sprint 3/B): board ile aynı kristal
         sprite'larından çizilir, gölge canvas'a pişirilir. Bir kez çizilip
         yalnızca transform ile kaydırılır. */
      .bp-ghost{position:fixed;left:0;top:0;pointer-events:none;z-index:var(--ph-z-floating);display:block;will-change:transform;transition:none}
      .bp-ghost .bp-gc{border-radius:5px;position:relative}
      /* Hayalet de aynı kristal — elindeki taş, tahtadakiyle aynı malzeme
         olmalı. Ek olarak daha güçlü dış parıltı: havada, ışığı serbest. */
      .bp-ghost .bp-gc.bp-crystal{box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.45),
        inset 0 1px 0 rgba(255,255,255,.95),
        inset 0 -2px 5px -1px rgba(0,0,0,.55),
        0 0 20px -2px var(--bp-glow),
        0 0 40px -6px var(--bp-glow),
        0 6px 8px -3px rgba(0,0,0,.5)}
      @keyframes bpPop{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--ptx),var(--pty)) rotate(var(--rot)) scale(0);opacity:0}}
      @keyframes bpSpark{0%{transform:translate(0,0) scale(1);opacity:1}40%{opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0}}
      @keyframes bpFloat{0%{transform:translateY(0) scale(1);opacity:1}60%{opacity:1}100%{transform:translateY(-65px) scale(1.4);opacity:0}}
      @keyframes bpCombo{0%{transform:translate(-50%,-50%) scale(0) rotate(-5deg);opacity:0}20%{transform:translate(-50%,-50%) scale(1.4) rotate(2deg);opacity:1}50%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(-50%,-50%) scale(.6) rotate(-2deg);opacity:0}}
      @keyframes bpFlash{0%{filter:brightness(1);box-shadow:none}35%{filter:brightness(3);box-shadow:0 0 16px rgba(255,255,255,.4)}70%{filter:brightness(2)}100%{filter:brightness(1);box-shadow:none}}
      /* filter:brightness kaldırıldı (perf): burst'te tüm temizlenen hücrelerde paint. transform+opacity kaldı (compositor-only). */
      @keyframes bpEnergy{0%{transform:scale(1);opacity:1}30%{transform:scale(1.15)}60%{transform:scale(1.1);opacity:.6}100%{transform:scale(0);opacity:0}}
      @keyframes bpPlaceIn{
        0%{transform:translateY(-9px) scale(1.14);opacity:.5}
        45%{transform:translateY(0) scale(.93);opacity:1}
        72%{transform:translateY(0) scale(1.04)}
        100%{transform:translateY(0) scale(1)}}
      /* TUTULAN hâlden (.grabbed: scale .72 / opacity .22) devam eder.
         scale(1)/opacity(1)'den başlamak, parçanın sönmeden önce bir an
         tam görünür hâle sıçraması demekti. */
      @keyframes bpFadeOut{0%{transform:scale(.72);opacity:.22}100%{transform:scale(.28);opacity:0}}
      /* filter:brightness KALDIRILDI (perf). Tepsi her 3 yerleştirmede bir
         yenileniyor ve yenilemede 27'ye kadar .bp-crystal elemanı doğuyor;
         her biri 450ms boyunca filtre canlandırıyordu. Filter compositor-only
         DEĞİL: her karede yeniden rasterize olur — bu, projenin daha önce
         bpCharging/bpEnergy'den ve .ph-beam'den kaldırdığı tuzağın aynısı,
         burada gözden kaçmıştı. Sıçramanın büyük kısmı buradan geliyordu.
         Giriş hissi transform+opacity ile korunuyor: scale(1.1) aşımı
         "pop"u zaten veriyor. */
      @keyframes bpNewPiece{0%{transform:scale(0) translateY(20px);opacity:0}60%{transform:scale(1.1) translateY(-3px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
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

  // ───────── RENDER (canvas) ─────────
  // Board durumu değiştiğinde: offscreen kristal cache'ini yeniden kur ve
  // görünen canvas'a bas. Kristal görseli artık drawCrystalC'de (CSS değil).
  function renderBoard() {
    if (!geom) { if (!sizeCanvas()) return; }
    buildBoardCache();
    requestPaint();
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
        // Tepsi parçası artık hücre hücre DOM değil, TEK bir canvas —
        // board ve hayaletle aynı sprite'lardan çizilir (tek malzeme kaynağı).
        // Eskiden her yenilemede 27'ye kadar .bp-crystal elemanı doğuyordu
        // (her biri 4 arka plan katmanı + 5 box-shadow + ::after) ve tepsi
        // her 3 yerleştirmede bir yenileniyor — ölçümde kalan p99
        // sıçramasının kaynağı buydu. Artık yenileme başına 3 küçük canvas.
        const tp = document.createElement('canvas');
        tp.className = 'bp-tp' + (animate ? ' new-in' : '');
        if (animate) tp.style.animationDelay = (i*70)+'ms';
        drawTrayPiece(tp, p);
        slot.appendChild(tp);
      }
      // Dinleyici PARÇANIN değil YUVANIN üzerinde. İki sebep — ikisi de
      // ölçülmüş kullanıcı şikayeti ("tıklıyorum ama almıyor, özellikle
      // hızlı alırken"):
      //  1) .bp-tp.new-in girişi scale(0)'dan başlar ve animationDelay
      //     i*70ms'dir; o pencerede parçanın dokunma alanı SIFIRDIR
      //     (transform hit-test'i de küçültür). Yeni parçalar geldiği anda
      //     yapılan dokunuşlar bu yüzden düşüyordu.
      //  2) Parça 15px'lik hücrelerden oluşan küçük bir hedef; yuva ise
      //     flex:1 ile tepsinin üçte biri. Yuvaya bağlamak hedefi büyütür.
      // Yuva animasyonsuz ve her zaman tam boy olduğu için ikisini de çözer.
      const onStart = (e) => {
        if (!pieces[i]) return;              // boş yuva (spent) — sessizce yoksay
        e.preventDefault();
        grabPiece(i, e);
      };
      addEv(slot, 'touchstart', onStart, {passive:false});
      addEv(slot, 'mousedown', onStart);
      trayEl.appendChild(slot);
    });
  }

  // Tepsi parçasını canvas'a çizer. Hücre boyutu tepsiye sığacak şekilde
  // seçilir (board hücresinden küçük); sprite'lar board'unkiyle AYNI, sadece
  // ölçeklenerek basılır — malzeme tek kaynaktan gelmeye devam eder.
  const TRAY_CELL = 15;                    // CSS px, eski .bp-tc ile aynı
  function drawTrayPiece(cv2, p) {
    const cols = p.shape[0].length, rows = p.shape.length;
    const gap = 2, cs2 = TRAY_CELL, step2 = cs2 + gap;
    if (!cellTex) buildCellTextures();
    const t = cellTex && cellTex.jewels[p.jewel];
    // Sprite payandası hücre boyutuna oranlı; tepsi ölçeğinde de aynı oran.
    const pad2 = t ? cs2 * (cellTex.pad / geom.cs) : 0;
    const S2 = cs2 + pad2 * 2;
    const w = cols * step2 - gap + pad2 * 2, h = rows * step2 - gap + pad2 * 2;
    const s = Math.min(window.devicePixelRatio || 1, 3);
    cv2.width = Math.round(w * s); cv2.height = Math.round(h * s);
    cv2.style.width = w + 'px'; cv2.style.height = h + 'px';
    const c = cv2.getContext('2d');
    c.setTransform(s, 0, 0, s, 0, 0);
    if (!t) return;
    p.shape.forEach((rw, y) => rw.forEach((v, x) => {
      if (!v) return;
      c.drawImage(t, x * step2, y * step2, S2, S2);
    }));
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

  // Hayalet tuvali: TEK örnek, oyun boyunca yeniden kullanılır (bkz.
  // grabPiece'teki not — tutuş başına tahsis 150ms'lik sıçrama üretiyordu).
  // En büyük parça 4 hücre; tuval buna göre boyutlanır ve hücre boyutu
  // değişince (sizeCanvas → cellTex=null) yeniden üretilir.
  let ghostCv = null, ghostCvW = 0, ghostCvCs = 0;
  function ensureGhostCanvas() {
    const cs = geom ? geom.cs : 40, pad = cellTex ? cellTex.pad : 0;
    const need = 4 * (cs + GAP) + pad * 2;
    if (ghostCv && ghostCvCs === cs) return ghostCv;
    if (!ghostCv) {
      ghostCv = document.createElement('canvas');
      ghostCv.className = 'bp-ghost';
      ghostCv.style.display = 'none';
      document.body.appendChild(ghostCv);
    }
    const gs = bufScale || Math.min(window.devicePixelRatio || 1, 3);
    ghostCvW = need; ghostCvCs = cs;
    ghostCv.width = Math.round(need * gs);
    ghostCv.height = Math.round(need * gs);
    ghostCv.style.width = need + 'px';
    ghostCv.style.height = need + 'px';
    ghostCv.getContext('2d').setTransform(gs, 0, 0, gs, 0, 0);
    return ghostCv;
  }

  // ───────── SÜRÜKLE-BIRAK ─────────
  // Yerleştirme çözülürken (locked) gelen dokunuş SESSİZCE DÜŞMEZ, tamponlanır.
  // Yerleştirme sonrası kilit 90ms (satır yoksa) ile ~250ms (satır temizlemede)
  // arası sürüyor; hızlı oynayan biri bu pencerede bir sonraki parçaya
  // dokunduğunda dokunuşu kayboluyordu. Artık kilit açılır açılmaz, parmak
  // hâlâ ekrandaysa alım gerçekleşiyor.
  let pendingGrab = null;
  function setLocked(v) {
    locked = v;
    if (v || !pendingGrab) return;
    const pg = pendingGrab; pendingGrab = null;
    // Parmak kalktıysa ya da çok zaman geçtiyse alma — geç gelen bir
    // "hayalet alım" oyuncunun istemediği bir şey.
    if (!pg.down || performance.now() - pg.t > 600) return;
    if (pieces[pg.idx]) grabPiece(pg.idx, pg.pt);
  }

  function grabPiece(idx, e) {
    // KURTARMA: ortada takılı bir sürükleme varsa onu İPTAL ET ve devam et.
    // Eskiden burada `if (drag) return;` vardı; takılı bir drag (ör. sistem
    // jesti touchcancel'ı yutulmuşsa) hem ekranda donmuş bir önizleme
    // çerçevesi bırakıyor hem de SONRAKİ TÜM TUTUŞLARI engelliyordu
    // ("tıklıyorum ama almıyor"). Yeni bir tutuş, oyuncunun parmağının
    // ekranda olduğunun kanıtı — eski drag'i sonlandırmak her zaman doğru.
    if (drag) { if (drag.end) drag.end({ type: 'touchcancel' }); drag = null; }
    const p = pieces[idx];
    if (!p) return;
    if (locked) {
      const t = e.touches ? e.touches[0] : e;
      const pg = { idx, t: performance.now(), down: true, pt: { clientX: t.clientX, clientY: t.clientY } };
      pendingGrab = pg;
      // Parmağın kalkışını izle: kalkarsa tamponu geçersiz kıl.
      const up = () => { pg.down = false; document.removeEventListener('touchend', up); document.removeEventListener('mouseup', up); };
      document.addEventListener('touchend', up);
      document.addEventListener('mouseup', up);
      return;
    }

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
    // Geometri artık canvas'tan (geom): hücre boyutu + ekran orijini. DOM
    // ölçümü yok. Ghost hâlâ DOM (position:fixed) — tek küçük katman, ucuz
    // translate; canvas'a taşımaya gerek yok, board canvas'ı zaten sürükleme
    // maliyetini çözüyor (preview blit'i, 64 kristali yeniden boyamak değil).
    const bRect = cv.getBoundingClientRect();
    if (!geom) sizeCanvas();
    const cs = geom ? geom.cs : (bRect.width - (G - 1) * GAP) / G;
    const originX = bRect.left, originY = bRect.top;
    const cols = p.shape[0].length, rows = p.shape.length;
    const ghostW = cols*cs + (cols-1)*GAP;
    const ghostH = rows*cs + (rows-1)*GAP;

    // ── HAYALET: BOARD İLE AYNI SPRITE (Sprint 3/B) ──
    // Elindeki taş ile tahtadaki taş AYNI MALZEME olmak zorunda (CLAUDE.md:
    // "tahta hücresi, tepsi hücresi ve hayalet aynı reçeteyi kullanır").
    // Kristal cilası canvas sprite'ına girince DOM hayalet geride kalmıştı;
    // artık hayalet de aynı sprite'lardan çiziliyor — tek malzeme kaynağı.
    // Hayalet TEK bir canvas: bir kez çizilir, sonra yalnızca transform ile
    // kaydırılır (compositor-only). Gölge de canvas'a PİŞİRİLİYOR — CSS
    // filter:drop-shadow her karede yeniden rasterize olurdu.
    if (!cellTex) buildCellTextures();
    const gpad = cellTex ? cellTex.pad : 0;
    // Hayalet canvas'ı HER TUTUŞTA yeniden oluşturulmaz, BİR KEZ üretilip
    // yeniden kullanılır. Ölçüldü (A51): her tutuşta yeni canvas tahsisi tek
    // karelik ~150ms sıçrama üretiyordu — parçayı her aldığında hissedilen
    // takılma buydu. Tuval en büyük parçaya (4×4) göre boyutlanır; kullanılmayan
    // alan saydam kalır ve compositor için ihmal edilebilir.
    const ghost = ensureGhostCanvas();
    const gctx = ghost.getContext('2d');
    gctx.clearRect(0, 0, ghostCvW, ghostCvW);
    const step = cs + GAP;
    if (cellTex && cellTex.jewels[p.jewel]) {
      // 1. geçiş: "havada" gölgesi — hazır sprite'tan blit (shadowBlur YOK,
      // bkz. buildCellTextures'taki not: tutuş anında sıçrama üretiyordu)
      if (cellTex.shadow) {
        p.shape.forEach((rw, y) => rw.forEach((v, x) => {
          if (!v) return;
          gctx.drawImage(cellTex.shadow, x * step, y * step, cellTex.S, cellTex.S);
        }));
      }
      // 2. geçiş: kristaller — board'un TA KENDİSİ olan sprite
      const t = cellTex.jewels[p.jewel];
      p.shape.forEach((rw, y) => rw.forEach((v, x) => {
        if (!v) return;
        gctx.drawImage(t, x * step, y * step, cellTex.S, cellTex.S);
      }));
    }
    ghost.style.display = 'block';

    drag = { idx, piece:p, ghost, bRect, cs, originX, originY, ghostW, ghostH, gpad, row:-1, col:-1, valid:false, previewCells:null };
    posGhost(touch.clientX, touch.clientY);

    const onMove = (ev) => { ev.preventDefault(); const t=ev.touches?ev.touches[0]:ev; posGhost(t.clientX,t.clientY); showPreview(t.clientX,t.clientY); };
    // touchcancel/pointercancel ŞART — eksikliği "hayalet çerçeve" hatasıydı.
    // Android WebView, sistem jesti devraldığında (kenar/geri jesti, bildirim
    // çubuğunu çekme, ikinci parmak, kaydırmanın devralınması) touchcancel
    // gönderir ve o durumda touchend HİÇ GELMEZ. Yalnızca touchend dinlenince
    // sürükleme sonsuza kadar açık kalıyordu: drag null olmadığı için önizleme
    // her karede yeniden çiziliyor (ekranda donmuş yeşil/kırmızı çerçeve) ve
    // tepsi parçası .grabbed ile soluk kalıyordu. Scriptli testlerde hiç
    // görülmedi çünkü onlar her zaman UP gönderiyor; gerçek parmakla sık.
    const EV_END = ['touchend', 'touchcancel', 'mouseup', 'pointercancel'];
    const onEnd = (ev) => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mousemove', onMove);
      EV_END.forEach(t => document.removeEventListener(t, onEnd));
      const cancelled = ev && (ev.type === 'touchcancel' || ev.type === 'pointercancel');
      dropPiece(cancelled);
    };
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mousemove', onMove);
    EV_END.forEach(t => document.addEventListener(t, onEnd));
    drag.end = onEnd;      // güvenlik ağı buradan sonlandırır (bkz. init)
  }

  function posGhost(cx, cy) {
    if (!drag) return;
    // transform ile konumlandırma. Eskiden left/top yazılıyordu: ikisi de LAYOUT
    // tetikler, yani her pointermove'da reflow + filter:drop-shadow'un yeniden
    // çizimi olurdu — zayıf/eski GPU'da (Huawei Y6) sürüklerken kasmanın ana
    // kaynağı buydu. translate compositor-only: ghost bir kez rasterize edilip
    // (will-change:transform) yalnızca kaydırılıyor. Ghost position:fixed + left/top:0
    // olduğu için translate doğrudan viewport koordinatı.
    // Hayalet canvas'ı içerik kutusundan gpad kadar BÜYÜK (parıltı/gölge
    // hücre sınırının dışına taşıyor), o yüzden konum gpad kadar geri alınır —
    // yoksa taş parmağa göre sağ-aşağı kayar ve bırakma hedefi şaşar.
    const gp = drag.gpad || 0;
    drag.ghost.style.transform =
      'translate(' + (cx - drag.ghostW/2 - gp).toFixed(1) + 'px,' + (cy - drag.ghostH - 40 - gp).toFixed(1) + 'px)';
  }

  function showPreview(cx, cy) {
    if (!drag) return;
    const {piece, cs} = drag;
    const gx = cx - drag.ghostW/2;
    const gy = cy - drag.ghostH - 40;
    // Izgara orijini grabPiece'te ilk hücreden ölçüldü (bkz. oradaki not).
    const col = Math.round((gx - drag.originX) / (cs+GAP));
    const row = Math.round((gy - drag.originY) / (cs+GAP));
    // Hedef hücre DEĞİŞMEDİYSE hiç dokunma (aynı hücre içinde gezinirken
    // gereksiz repaint). Değiştiyse preview hücrelerini topla ve canvas'ı
    // yeniden bas: cache blit + birkaç dikdörtgen (64 DOM kristalini yeniden
    // boyamak DEĞİL — A51'de sürüklemenin 24fps'e düşmesinin sebebi buydu).
    if (row === drag.row && col === drag.col) return;
    const wasValid = drag.valid;
    drag.row = row; drag.col = col;
    drag.valid = canPlace(piece.shape, row, col);

    // Geçerli bölgeye GİRİŞ anı — çıkışta veya içinde gezinirken değil.
    if (drag.valid && !wasValid) { snd('crystalHover'); haptic(8); }

    const cells = [];
    piece.shape.forEach((r,dy) => r.forEach((v,dx) => {
      if (!v) return;
      const ry = row+dy, rx = col+dx;
      if (ry<0||ry>=G||rx<0||rx>=G) return;
      cells.push({ y: ry, x: rx });
    }));
    // Roadmap: touchmove içinde ÇİZME — sadece durumu güncelle, kare talep et.
    drag.previewCells = cells;
    requestPaint();
  }

  function clearPreview() {
    if (drag) drag.previewCells = null;
    requestPaint();
  }

  // cancelled: sürükleme SİSTEM tarafından iptal edildi (touchcancel) —
  // oyuncu bırakmayı istemedi. Bu durumda taş yerleştirilmez, tepsiye döner:
  // bildirim çubuğunu çekerken taşını kaybetmek sürpriz olur.
  function dropPiece(cancelled) {
    if (!drag) return;
    const {idx, piece, ghost, row, col} = drag;
    const valid = drag.valid && !cancelled;
    ghost.style.display = 'none';   // silinmez, yeniden kullanılır
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
    setLocked(true);
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

    // Board güncelle (canvas) + DÜŞ→EZİL→OTUR animasyonu (Sprint 3/A).
    // Konan hücreler animasyon boyunca cache'e yazılmaz (soket kalır),
    // kristali FX katmanı düşürüp oturtur; bitince cache yeniden kurulur.
    // YERLEŞTİRME ANİMASYONU KAPALI (ürün kararı): "düş → ezil → otur"
    // hem gereksiz bulundu hem de yerleştirme başına ek maliyet getiriyordu.
    // Yerine EN UCUZ yol: tüm board cache'ini kurmak yerine yalnızca konan
    // hücreleri işle (64 blit → ~9 blit). fxPlaceIn duruyor; geri almak
    // için bu satırı `fxPlaceIn(placedCells, piece.jewel)` yap.
    commitCells(placedCells);
    renderScoreBar(true);

    // ── Yerleştirme enerjisi (Faz 2A) ── Artık canvas FX katmanında.
    // Sıra kasıtlı: önce yüzeyin altındaki yayılım (en yavaş, en arkada),
    // sonra ızgara iletimi, en son temas kıvılcımları (en hızlı, en önde).
    if (FX) {
      // daisDischarge KAPALI (ürün kararı): konan taşın çevresini saran geniş
      // radyal parıltıydı ("çevresini saran bir yapı") — istenmedi. Ayrıca
      // ~5 hücre genişliğinde bir dolguyu 480ms boyunca her kare çiziyordu.
      // Fonksiyon duruyor; geri almak tek satır.
      // runePulse KAPALI (ürün kararı): konan taşın 2.4 hücre yarıçapındaki
      // KOMŞU hücrelerini aydınlatıyordu. Tasarımda "levha enerjiyi iletir"
      // diye vardı ama oyuncuda "koymadığım yerlerde iz düşümü" olarak
      // okunuyor — anlatmak istediği şeyi anlatmıyor. Ayrıca kare başına
      // ~20 hücre dolgusu çizerek yerleştirme sırasındaki fps'i düşürüyordu.
      // Fonksiyon duruyor; geri almak tek satır.
      contactSparks(edges, piece.jewel);
    }
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
          setLocked(false);
        });
      } else {
        combo = 0;
        renderScoreBar(false);
        afterPlace();
        setLocked(false);
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
            // Olay, showGameOver'ın 300 ms'lik gecikmesini BEKLEMİYOR: tur
            // burada gerçekten bitti, gecikme yalnızca sahnenin nefes payı.
            // Blok Puzzle'ın kazanma durumu yok (sonsuz mod) — yalnızca
            // 'lost' yayınlar. Su Sıralama'nın aynadaki hâli.
            gameEvent('game_ended', { gameId: 'blockPuzzle', result: 'lost', score });
            snd('crystalOver');
            haptic([100,50,100]);
            setTimeout(()=>showGameOver(false,'Yer Kalmadı','Sığacak blok kalmadı.',{
              accent:'var(--ph-jewel-1-shadow)',accentLight:'var(--ph-jewel-1-highlight)',accentGlow:'var(--ph-jewel-1-glow)',
              mark:'✧',
              stats:[
                {label:'Skor',value:score.toLocaleString()},
                {label:'En İyi',value:highScore.toLocaleString(),record:score>=highScore&&score>0},
              ],
            }),300);
          }
        }, 500);
      }, 200);
    } else {
      if (!anyPieceFits()) {
        gameEvent('game_ended', { gameId: 'blockPuzzle', result: 'lost', score });
        snd('crystalOver');
        haptic([100,50,100]);
        setTimeout(()=>showGameOver(false,'Yer Kalmadı','Sığacak blok kalmadı.',{
              accent:'var(--ph-jewel-1-shadow)',accentLight:'var(--ph-jewel-1-highlight)',accentGlow:'var(--ph-jewel-1-glow)',
              mark:'✧',
              stats:[
                {label:'Skor',value:score.toLocaleString()},
                {label:'En İyi',value:highScore.toLocaleString(),record:score>=highScore&&score>0},
              ],
            }),300);
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

  // ══ ZAMANLAMA — ÜÇ VURUŞ, ~460ms ══ (tasarım DOM sürümünden korundu)
  //   0-70    ŞARJ    — kristal beyaza yaklaşır, büyür (beklenti)
  //   70-190  PATLAMA — flaş, kıymık, süpürme, sütun, glif, çember
  //   190-460 KALINTI — kıymıklar düşer, yıldız tozu süzülür
  // Amatör efektlerde yalnızca orta vuruş vardır; "ucuz" hissi eksik 1. ve
  // 3. vuruştan gelir. Şarjdan sonraki 40ms'lik TUTUŞ boşa değil: darbeyi
  // oturtan şey patlamadan hemen önceki durgunluktur.
  // Fark: hepsi artık tek canvas + tek rAF döngüsü (yüzlerce DOM düğümü değil).
  function animateClear(lines, cb) {
    const cells = new Set();
    lines.forEach(l => {
      if (l.type==='row') for(let x=0;x<G;x++) cells.add(l.idx*G+x);
      else for(let y=0;y<G;y++) cells.add(y*G+l.idx);
    });
    const idxs = [...cells];
    // Baskın renk: temizlenen hücrelerde en çok geçen mücevher. Patlamanın
    // "bir rengi" olması, karışık renkli bir bulamaçtan çok daha okunaklı.
    const tally = {};
    idxs.forEach(i => { const j = board[Math.floor(i/G)][i%G]; if (j) tally[j] = (tally[j]||0)+1; });
    const jewel = +Object.keys(tally).sort((a,b)=>tally[b]-tally[a])[0] || 1;
    // jewelOf, board temizlenmeden ÖNCE sabitlenmeli: kıymıklar patlama
    // anında doğuyor ama renklerini okudukları hücreler 160ms sonra sıfırlanıyor.
    const jcopy = {};
    idxs.forEach(i => { jcopy[i] = board[Math.floor(i/G)][i%G]; });
    const jewelOf = i => jcopy[i];
    const intensity = Math.min(lines.length * 2 + combo, 12);

    // Yerleştirme animasyonunu İPTAL ET. Temizleme kontrolü yerleştirmeden
    // 90ms sonra çalışıyor, animasyon ise 280ms+ sürüyor — çakışırlar.
    // İptal edilmezse FX katmanı, tahtadan az sonra silinecek kristalleri
    // düşürmeye devam eder. Kristaller cache'e hemen yazılıyor (zaten
    // patlayacaklar), fxPlaceIn'in draw'ı placingCells null olunca susar.
    if (placingCells) { placingCells = null; renderBoard(); }

    // ── 1. VURUŞ: ŞARJ + TUTUŞ ──
    haptic(14);
    if (FX) fxCharge(idxs, 100);

    setTimeout(() => {
      // ── 2. VURUŞ: PATLAMA ──
      // Ses ile ışık AYNI KAREDE: ikisi ayrı olay gibi okunmamalı.
      snd('crystalShatter', {lines: lines.length});
      if (lines.length >= 2 || combo >= 3) snd('crystalBurst', {power: lines.length + Math.max(0, combo-2)});
      if (combo > 1) setTimeout(() => snd('crystalCombo', {level: combo}), 110);
      haptic(38 + intensity*5);

      if (FX) {
        // Sıra kasıtlı — en geniş katman önce, en ince en son. Göz dünyadan
        // detaya doğru okuyor: dünya → sahne → çizgi → kıymık → yazı.
        const power = 0.42 + Math.min(combo,4)*0.10 + (lines.length-1)*0.08;
        sceneFlash(jewel, power);
        shockwave(jewel);
        phAtmosphereFlare(atmoEl, 1.9 + Math.min(combo,4)*0.35, 520);
        // IŞIK SÜTUNU KAPALI (ürün kararı, 2026-07-26). Sert kenarlı dikdörtgen
        // hatası düzeltildikten sonra katman DOĞRU görünüyordu (yumuşak huzme),
        // yani bu bir hata değil TASARIM tercihi: sütun patlamanın anlatısına
        // yeni bir şey katmıyordu ve tek başına en büyük dolgu alanıydı
        // (satırdan ekranın tepesine, board genişliğinin %82'si) — yani
        // patlamadaki fill-rate maliyetinin en büyük tek kalemi.
        // Patlama zaten 8 katman taşıyor: flaş, şok dalgası, süpürme, kıymık,
        // glif, toz, çember, ızgara iletimi.
        // Geri almak için: aşağıdaki satıra `lightColumn(l, jewel);` ekle —
        // fonksiyon duruyor ve çalışır durumda, bilerek silinmedi.
        lines.forEach(l => { axisSweep(l, jewel); });
        screenShake(2.5 + intensity*0.8, 180 + intensity*12);
        const mid = (G - 1) / 2 | 0;
        lines.forEach(l => {
          const p = l.type==='row' ? fxCell(l.idx, mid) : fxCell(mid, l.idx);
          if (p) lightWave(p.x, p.y);
        });
        shatterShards(idxs, jewelOf, Math.min(SHARD_CAP, 10 + combo*3 + lines.length*4));
        // ── COMBO TIRMANIŞI ── Her basamakta YENİ BİR EFEKT TÜRÜ giriyor;
        // "aynı şeyden daha çok" değil. Ekran dolmuyor, dil büyüyor.
        if (combo >= 2) runeGlyphs(idxs, jewel, 2 + Math.min(combo, 3));
        if (combo >= 3) cameraBreath();
        if (combo >= 4) runeCircle(jewel);
      }

      setTimeout(() => {
        lines.forEach(l => {
          if (l.type==='row') board[l.idx] = Array(G).fill(0);
          else for(let r=0;r<G;r++) board[r][l.idx]=0;
        });
        renderBoard();
        // ── 3. VURUŞ: KALINTI ── Tahta temizlendikten SONRA doğar:
        // olay bitti, izi duruyor. Bu vuruş olmadan patlama "kesilmiş" biter.
        if (FX) stardust(idxs, jewel, 8 + combo*2);
        if (cb) cb();
      }, 140);
    }, 100);   // 60ms şarj + 40ms TUTUŞ
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
    gameEvent('game_started', { gameId: 'blockPuzzle' });
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
      <div class="ph-dais bp-dais"><div class="bp-charge"></div><canvas class="bp-board"></canvas></div>
      <div class="bp-tray"></div>
    `;
    container.appendChild(wrapEl);
    boardEl = wrapEl.querySelector('.bp-board');
    trayEl = wrapEl.querySelector('.bp-tray');

    // Canvas board kurulumu (Sprint 1). boardEl artık bir <canvas>.
    cv = boardEl;
    ctx = cv.getContext('2d');
    boardCache = document.createElement('canvas');
    bctx = boardCache.getContext('2d');
    RENDER_SCALE = pickRenderScale();
    readJewels();

    // Uygulama başlığındaki skor sayacı bu oyun boyunca gizli: skor
    // oyunun kendi HUD'unda. (Water Sort da aynısını yapıyor.)
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = 'none';

    // Canvas boyutu layout'a bağlı; hazır olana kadar rAF ile bekle.
    ensureCanvas(() => { buildBoardCache(); paintBoard(); });
    renderTray(true);
    renderScoreBar(false);

    // Ekran dönünce/yeniden boyutlanınca canvas'ı yeniden boyutlandır + çiz.
    // clearEvs() cleanup'ta kaldırır (shared _listeners).
    addEv(window, 'resize', () => { if (sizeCanvas()) { buildBoardCache(); paintBoard(); } fxResize(); });

    // GÜVENLİK AĞI: uygulama arka plana giderse sürükleme takılı kalmasın.
    // touchcancel çoğu durumu yakalıyor ama sekme/uygulama gizlenmesi ayrı bir
    // yol — takılı bir drag ekranda donmuş önizleme çerçevesi bırakıyordu.
    addEv(document, 'visibilitychange', () => {
      if (document.hidden && drag && drag.end) drag.end({ type: 'touchcancel' });
    });
  }

  function cleanup() {
    bumpHighScore();          // güvenlik ağı; normalde çoktan yazılmış olur
    clearEvs();
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    needsPaint = false; geom = null;
    fxClear();
    if (fxCv) { fxCv.remove(); fxCv = null; fxCtx = null; fxGeom = null; }
    glowSprite = []; cellTex = null; placingCells = null;
    if (ghostCv) { ghostCv.remove(); ghostCv = null; ghostCvCs = 0; }
    for (const k in _tex) delete _tex[k];
    drag = null; locked = false; pendingGrab = null;
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
    gameEvent('game_started', { gameId: 'mazeGame' });
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
      // Labirentin kaybetme durumu yok: yalnızca 'won'. Skor da süre/adım
      // formülünün az önce updateGameScore'a yazdığı değerin aynısı.
      gameEvent('game_ended', {
        gameId: 'mazeGame', result: 'won',
        score: Math.max(5000-secs*50-moveCount*5,500), durationMs: secs*1000,
      });
      GameAudio.play('win'); GameAudio.haptic(25);
      showGameOver(true,'Çıkışı Buldun','Labirentin çıkışına ulaştın.',{
        accent:'var(--ph-jewel-4-shadow)',accentLight:'var(--ph-jewel-4-highlight)',accentGlow:'var(--ph-jewel-4-glow)',
        mark:'✦',
        stats:[
          {label:'Süre',value:secs+' sn'},
          {label:'Adım',value:moveCount},
        ],
      });
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
    // Tur = SEVİYE. init() de, seviye ilerlemesi de buradan geçiyor, yani
    // tek enjeksiyon iki yolu birden kapsıyor.
    gameEvent('game_started', { gameId: 'screwPuzzle' });
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
      // Seviye tamamlandı = tur kazanıldı. Son seviyede kutu açılıyor, ara
      // seviyelerde loadLevel yeni tur başlatıyor; olay her ikisinde de aynı.
      gameEvent('game_ended', { gameId: 'screwPuzzle', result: 'won', score });
      snd('win'); haptic([50,30,50]);
      const nxt = level + 1;
      if(nxt < LEVELS.length) localStorage.setItem('ph_screw_level',nxt.toString());
      setTimeout(()=>{
        if(nxt>=LEVELS.length) {
          showGameOver(true,'Oyun Tamamlandı','Tüm bölümleri bitirdin.',{
            accent:'var(--ph-jewel-7-shadow)',accentLight:'var(--ph-jewel-7-highlight)',accentGlow:'var(--ph-jewel-7-glow)',
            mark:'✦',
            stats:[
              {label:'Skor',value:score.toLocaleString()},
              {label:'Bölüm',value:(level+1)},
            ],
          });
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
        gameEvent('game_ended', { gameId: 'screwPuzzle', result: 'lost', score });
        snd('lose'); haptic(100);
        setTimeout(()=>showGameOver(false,'Slotlar Doldu','Boş slot kalmadı.',{
          accent:'var(--ph-jewel-7-shadow)',accentLight:'var(--ph-jewel-7-highlight)',accentGlow:'var(--ph-jewel-7-glow)',
          mark:'✧',
          stats:[
            {label:'Skor',value:score.toLocaleString()},
            {label:'Bölüm',value:(level+1)},
          ],
        }),300);
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

  // GERİ ALMA KALDIRILDI (2026-08-07, sahip kararı). `↩` düğmesi artık
  // ÖNCEKİ SEVİYE. Kaldırılan üç şeyin yerine ne geldiği:
  //   history[]           → initialTubes (yeniden başlatma için anlık kopya)
  //   undosUsedThisLevel  → yıldız artık HAMLE VERİMLİLİĞİNE bakıyor
  //   undoLast/undoOne    → prevLevelWithAd
  // history yalnızca geri alma için vardı; tahtayı geri sarmak için her
  // hamleyi saklamak yerine BAŞLANGICI saklamak hem daha az bellek hem de
  // daha doğru: kopyayı geri yazmak, N hamleyi ters çevirmekten kısa.
  let container, level, score, tubes, selected, initialTubes, animating, wrapEl, tubesEl, atmosphereEl;
  let initialScore = 0;          // seviye basindaki skor (yeniden baslatma icin)
  let comboCount;
  let movesUsed, moveLimit, levelStartedAt;

  // ═══════════ HAMLE LİMİTİ ═══════════
  // Bu oyunun İLK kaybetme durumu (2026-08-01). Öncesinde tüpler tıkanmazdı
  // ve her tahta geri alınabilirdi, yani kaybetmek mümkün değildi.
  //
  // ───── FORMÜL NEREDEN GELİYOR ─────
  // Zorluğun tek değişkeni renk sayısı (paramsForLevel). Her seviye için
  // 30 tahtanın GERÇEK optimal hamle sayısı ölçüldü (IDA*, kabul edilebilir
  // sezgisel: bir hamle toplam renk-koşusu sayısını en fazla 1 azaltır,
  // bitişte koşu sayısı = renk sayısı):
  //
  //   renk 3 → ort 7.9  p90 10    maks 11
  //   renk 4 → ort 11.5 p90 13.5  maks 14
  //   renk 5 → ort 14.9 p90 17    maks 17
  //   renk 6 → ort 18.2 p90 20.5  maks 22
  //   renk 7 → ort 21.9 p90 24    maks 26
  //
  // Uyum neredeyse mükemmel doğrusal (p90 ≈ 3.5×renk). 5×renk, p90'ın her
  // kademede SABİT 1.47 katı ve en zor gözlenen tahtanın ~%40 üstü. Sabit
  // bir sayı olsaydı kolay seviyede cömert, zor seviyede haksız olurdu.
  //
  // ───── NEDEN TAHTA BAŞINA OPTİMAL DEĞİL ─────
  // "limit = bu tahtanın ideali × 1.4" daha adil olurdu ama uygulanabilir
  // değil: IDA* 7 renkte saniyeler, 8 renkte dakikalar sürüyor ve seviye
  // üretimi ana iş parçacığını bloke ediyor (Arrow'un staleMax dersi).
  const MOVE_LIMIT_PER_COLOR = 5;
  const EXTRA_MOVES_FRACTION = 0.25;   // devam paketi: limitin dörtte biri
  function moveLimitFor(lv) {
    return MOVE_LIMIT_PER_COLOR * paramsForLevel(lv).colorCount;
  }
  function extraMovesFor(lv) {
    return Math.ceil(moveLimitFor(lv) * EXTRA_MOVES_FRACTION);
  }

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
      /* z-index YÜK TAŞIYOR — süs değil, düğmelerin çalışmasının şartı.
         Tüp tuvali (.wsrt-cv) BİLEREK barın da üstüne taşan, negatif
         konumlu, aşırı büyük bir yüzey (efektler tüplerin dışına dökülsün
         diye: ölçüldü, üst kenarı barın 54px yukarısına çıkıyor). DOM'da
         bardan SONRA geldiği için, yığın bağlamında üste düşüyor ve barın
         üstündeki her dokunuşu yutuyordu — iki düğme de tamamen ölüydü.
         Bu, "off" sınıfı hatasından AYRI ve ondan sonra ortaya çıkan İKİNCİ
         sebepti; ilki düzeltilene kadar görünmüyordu, çünkü düğmeler zaten
         pointer-events:none taşıyordu.
         Tuvali küçültmek çözüm değil (efekt alanı gerçekten gerekli);
         doğru olan, barı tuvalin üstüne çıkarmak.
         NOT: bu blok bir template literal (backtick) içinde — yoruma ters
         tırnak YAZILAMAZ, dizgiyi erken kapatır ve games.js'in TAMAMI
         yüklenmez (PuzzleGames tanımsız kalır, hiçbir oyun açılmaz).
         Tam olarak bu yaşandı; node --check yakalar, gözle bakmak yakalamaz. */
      .wsrt-bar{position:relative;z-index:2;display:flex;justify-content:center;align-items:center;width:100%;padding:0 4px;min-height:40px}
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
      /* Hamle sayacı SOLDA mutlak konumlu — seviye kapsülü ortada kalsın
         (kapsül akışta ortalanıyor, sayaç akışa girseydi onu kaydırırdı). */
      .wsrt-bar .wb-moves{
        position:absolute;left:6px;top:50%;transform:translateY(-50%);
        font:600 13px/1 'Fraunces',serif;color:var(--wsrt-ink);opacity:.72;
        letter-spacing:.03em;transition:color .25s ease,opacity .25s ease;
      }
      /* Son 5 hamle: sayaç uyarıya döner. Renk mevcut hata tonundan. */
      .wsrt-bar .wb-moves.warn{color:var(--ph-danger,#ef4444);opacity:1;font-weight:800}
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
      /* will-change BİLEREK KULLANILMIYOR (kaldırıldı — perf + görsel bug).
         Dökme başında gövdeye will-change:transform eklemek onu YENİ bir
         compositor katmanına yükseltiyordu — ama gövde, filter'lı bir atanın
         (.wsrt-tube-inner: saturate/brightness) İÇİNDE. Filtreli atanın içindeki
         bir çocuğu katmana yükseltmek WebView'da o filtre tamponunu yeniden
         rasterize ettiriyor ve gövde BİR KARE görünmez oluyordu: "her dökmede
         tüp bir salise kaybolup geri geliyor" şikâyetinin sebebi buydu
         (A54'te doğrulandı). Transform geçişi will-change olmadan da
         compositor'da akıcı; katman yükseltme/indirme flaşı ortadan kalkıyor.
         Sürekli promote de İSTEMİYORUZ (10 tüp × geniş gövde = boşa katman). */
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
  // Durum (tubes dizisi) zaten pourState/transferUnits ile guncellendi;
  // canvas'ta yapilacak tek is yeniden cizim. Eskiden burada DOM katman
  // cerrahisi vardi (katman ekle/cikar, dikis sinifi, isik ortusu senkronu).
  function applyPourDOM() { wPaint(); }
  function updateControlsBar() {
    const prevBtn = wrapEl.querySelector('#wsrt-prev');
    const restartBtn = wrapEl.querySelector('#wsrt-restart');
    // Önceki seviye: yalnızca ilk seviyede kapalı — öncesi yok.
    // `level` SIFIR TABANLI (başlık `Seviye ${level+1}` yazıyor), o yüzden
    // eşik 0. `level <= 1` yazmak Seviye 2'de de düğmeyi kapatıyordu —
    // cihazda görüldü, ekranda "Seviye 2" varken düğme hâlâ ölüydü.
    if (prevBtn) prevBtn.classList.toggle('off', level <= 0);
    // YENİDEN BAŞLAT HİÇ KAPANMAZ. Bildirilen hatanın kaynağı buydu:
    // eskiden `history.length === 0` iken `off` alıyordu ve
    // `.wsrt-icon-btn.off` pointer-events:none demek — yani seviye başında
    // düğme tıklanamıyordu. Cihazda doğrulandı (2026-08-07): computed
    // pointer-events "none". Hatanın sinsiliği, yeniden başlatmanın hamle
    // yapılmamışken zaten anlamsız görünmesiydi; oysa oyuncu tahtayı
    // beğenmediğinde İLK dokunuşu bu düğmeye oluyor.
    // Tek meşru kapalılık sebebi dökülme animasyonu; onu restartWithAd'ın
    // kendi `if (animating) return` koruması zaten hallediyor.
    if (restartBtn) restartBtn.classList.remove('off');
    // Hamle sayacı. Son 5 hamlede uyarı rengine geçiyor — limit oyuncuyu
    // hazırlıksız yakalamamalı; sürpriz bir kaybetme, tasarlanmış bir
    // kaybetmeden çok daha kötü hissettirir.
    const mv = wrapEl.querySelector('#wsrt-moves');
    if (mv) {
      const left = Math.max(0, moveLimit - movesUsed);
      mv.textContent = movesUsed + ' / ' + moveLimit;
      mv.classList.toggle('warn', left <= 5);
    }
  }
  // Tam yeniden çizim — sadece seviye başlangıcında/yeniden başlatmada.
  // ═══════════ CANVAS RENDERER (Sprint 4) ═══════════
  // Water Sort'un darboğazı ölçüldü (A51): idle 60fps ama DÖKÜŞTE ~46fps,
  // en kötü kare 117ms; UI iş parçacığı ile GPU birebir aynı sürüyor, yani
  // GPU fill-rate sınırı. Sebep: HAREKET EDEN tüpün üzerinde filter:saturate
  // + brightness + blur + mix-blend-mode taşınması — eski WebView bunları
  // her kare yeniden rasterize eder (Block'ta ghost drop-shadow'unda ölçülen
  // sorunun aynısı).
  //
  // Mimari, Block'ta öğrenilen kurallara göre (bkz. ROADMAP):
  //   Katman 1 — CAM: statik. Sprite'a BİR KEZ pişer, tekrar çizilmez.
  //   Katman 2 — SIVI: her kare çizilir (hacmi/yönü sürekli değişir, bu
  //              yüzden sprite'lanamaz) ama FILTER/BLEND/BLUR KULLANMAZ;
  //              görünüm doğrudan renk ve gradyanlarla üretilir.
  // Tek rAF döngüsü, yalnızca döküş sürerken çalışır; idle'da tam sıfır.
  const WALL = 4.5, RIM_H = 17;          // CSS'teki --wsrt-wall / --wsrt-rim-h
  let wcv = null, wctx = null, wScale = 1;
  let wGeom = null;                       // {tw, th, cssW, cssH, pos:[{x,y}]}
  let glassBack = null, glassFront = null;
  let wRaf = 0, wPourFx = null;
  // ── GERİ BİLDİRİM ANİMASYONLARI (Faz 1.6) ──
  // Hepsi TEK rAF'tan akar (bkz. wTick): döküş kendi döngüsünü sürerken bunlar
  // da onun üstünde yaşayabilir. Hiçbiri canlı değilse döngü DURUR — idle'da
  // maliyet tam sıfır (Block kuralı).
  let wShake = null;      // {idx, t0}      geçersiz hedef
  let wSolved = null;     // {idx, t0}      tüp çözüldü
  let wIntro = null;      // {t0}           seviye açılışı (stagger)
  let wSettle = null;     // {idx,t0,base,color,units}  inen sıvının oturması
  const SETTLE_MS = 380;                          // --ph-duration-medium
  const settleEase = phCubicBezier(.34, 1.56, .64, 1);   // --ph-ease-spring
  // ── SHEEN: sıvının üstünden süzülen ışık bandı ──
  // DOM'da sonsuz bir CSS animasyonuydu (9sn'de bir süzülür). Canvas'ta o model
  // KULLANILMIYOR: sürekli animasyon, tüplerin sonsuza kadar her kare yeniden
  // çizilmesi demekti ve bu "idle sıfır maliyet" kuralını bozardı
  // (03_PERFORMANCE_RULES / 04_CANVAS_POLICY). Bunun yerine OLAY TETİKLEMELİ:
  // seviye açılışı, başarılı döküş ve seçimden sonra BİR KEZ süzülür, biter.
  // Oyuncu hiçbir şey yapmıyorsa hiçbir şey çizilmez.
  let wSheen = null;      // {t0}
  let sheenGrad = null;   // geometriye bağlı, bir kez üretilir
  const SHEEN_MS = 900;
  function wSheenGo() { wSheen = { t0: performance.now() }; wKick(); }
  const SHAKE_MS = 300, SOLVED_MS = 700, INTRO_MS = 460, INTRO_STEP = 55;
  const VALID_PULSE_MS = 3000;            // --ph-duration-ambient
  function wAnimAlive(now) {
    if (wShake && now - wShake.t0 > SHAKE_MS) wShake = null;
    if (wSolved && now - wSolved.t0 > SOLVED_MS) wSolved = null;
    if (wIntro && now - wIntro.t0 > INTRO_MS + tubes.length * INTRO_STEP) wIntro = null;
    if (wSettle && now - wSettle.t0 > SETTLE_MS) wSettle = null;
    if (wSheen && now - wSheen.t0 > SHEEN_MS) wSheen = null;
    // Bir tüp seçiliyken geçerli hedef halkaları nabız atar (DOM'da sonsuz CSS
    // animasyonuydu) — o yüzden seçim de "canlı animasyon" sayılır. Seçim
    // kalkınca döngü kendiliğinden durur, idle yine tam sıfır.
    return !!(wShake || wSolved || wIntro || wSettle || wSheen || selected !== null);
  }
  // Geri bildirim döngüsü. Döküşün kendi rAF'ı varken ikinci bir döngü açmaz —
  // döküş zaten her kare wPaint çağırıyor, bu animasyonlar onun üstüne biner.
  function wTick(now) {
    if (!wAnimAlive(now)) { wFxRaf = 0; wMarkAll(); wPaint(); return; }
    // Yalnız canlanan tüpü kirlet — çözüldü nabzı 700ms boyunca TEK tüpü
    // ilgilendiriyor, tüm sahneyi 42 kare boyunca yeniden çizmek israf.
    if (wShake) wMarkTube(wShake.idx);
    if (wSolved) wMarkTube(wSolved.idx);
    if (wSettle) wMarkTube(wSettle.idx);
    if (wSheen) wMarkAll();                       // bant tüm dolu tüplerden geçer
    if (wIntro || selected !== null) wMarkAll();   // nabız tüm geçerli hedeflerde
    wPaint();
    wFxRaf = requestAnimationFrame(wTick);
  }
  let wFxRaf = 0;
  function wKick() { if (!wFxRaf && !wRaf) wFxRaf = requestAnimationFrame(wTick); }
  let wPendingTap = null;                 // kilit sırasında gelen dokunuş (bkz. render)
  const TAP_BUFFER_MS = 450;              // bundan eski tampon bayattır, oynanmaz
  // Kilit açılınca bekleyen dokunuşu oynat — dokunuş düşürmek oyunu ölü hissettirir.
  function wFlushTap() {
    const p = wPendingTap; wPendingTap = null;
    if (p && performance.now() - p.t < TAP_BUFFER_MS) onTapTube(p.i);
  }

  function wPickScale() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = (screen.width * dpr) * (screen.height * dpr);
    const cores = navigator.hardwareConcurrency || 4;
    if (px >= 2.2e6 && cores <= 8) return 0.8;
    if (px >= 1.5e6 && cores <= 4) return 0.65;
    return 1;
  }

  // Tüp yerleşimi — CSS flex'in yaptığını aritmetikle üretir:
  // genişlik clamp(46, (alan - (n-1)*8)/min(n,6), 72), oran .235, satır başına
  // en çok 6 tüp, ortalanmış, 8px boşluk.
  function wLayout(cssW) {
    const n = tubes.length, perRow = Math.min(n, 6), gap = 8;
    const tw = Math.max(46, Math.min(72, (cssW - (perRow - 1) * gap) / perRow));
    const th = tw / 0.235;
    const rows = Math.ceil(n / perRow);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow), c = i % perRow;
      const inRow = Math.min(perRow, n - r * perRow);
      const rowW = inRow * tw + (inRow - 1) * gap;
      pos.push({ x: (cssW - rowW) / 2 + c * (tw + gap), y: r * (th + gap) });
    }
    return { tw, th, cssW, cssH: rows * th + (rows - 1) * gap, pos };
  }

  // Cam silüeti: üstte geniş-basık elips ağzı, altta derin U (CSS'teki
  // border-radius:50% 50% 46% 46% / rim rim 13% 13% karşılığı).
  function wTubePath(c, x, y, w, h) {
    const rt = RIM_H, rb = h * 0.13, half = w / 2;
    c.beginPath();
    c.moveTo(x, y + rt);
    c.ellipse(x + half, y + rt, half, rt, 0, Math.PI, 0);        // ağız (üst elips)
    c.lineTo(x + w, y + h - rb);
    c.ellipse(x + half, y + h - rb, half, rb, 0, 0, Math.PI);    // dip (U)
    c.closePath();
  }

  // Cam SPRITE'ları — bir kez üretilir. back: gövde+derinlik, front: parlama+ağız.
  function wBuildGlass() {
    if (!wGeom) return;
    const { tw, th } = wGeom;
    const mk = (paint) => {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(tw * wScale));
      cv.height = Math.max(1, Math.round(th * wScale));
      const c = cv.getContext('2d');
      c.setTransform(wScale, 0, 0, wScale, 0, 0);
      paint(c);
      return cv;
    };
    glassBack = mk(c => {
      wTubePath(c, 0, 0, tw, th);
      const g = c.createLinearGradient(0, 0, 0, th);
      g.addColorStop(0, 'rgba(150,175,255,.07)');
      g.addColorStop(0.82, 'rgba(120,145,230,.10)');
      g.addColorStop(1, 'rgba(160,185,255,.18)');
      c.fillStyle = g; c.fill();
    });
    glassFront = mk(c => {
      c.save(); wTubePath(c, 0, 0, tw, th); c.clip();
      // Ön cam: kenarlarda yoğun, ortada berrak (silindir hissi)
      const fg = c.createLinearGradient(0, 0, tw, 0);
      fg.addColorStop(0, 'rgba(228,238,255,.38)');
      fg.addColorStop(0.13, 'rgba(228,238,255,.12)');
      fg.addColorStop(0.36, 'rgba(255,255,255,0)');
      fg.addColorStop(0.64, 'rgba(255,255,255,0)');
      fg.addColorStop(0.87, 'rgba(205,220,255,.13)');
      fg.addColorStop(1, 'rgba(216,230,255,.32)');
      c.fillStyle = fg; c.fillRect(0, 0, tw, th);
      // Parlama lekeleri — blur YOK, gradyanın kendisi yumuşak.
      const spot = (cx, cy, rx, ry, a) => {
        const g2 = c.createRadialGradient(cx, cy, 0, cx, cy, 1);
        g2.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        g2.addColorStop(0.55, 'rgba(255,255,255,' + (a * 0.35) + ')');
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        c.save(); c.translate(cx, cy); c.scale(rx, ry);
        c.fillStyle = g2; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
        c.restore();
      };
      spot(tw * 0.155, th * 0.31, tw * 0.10, th * 0.26, 0.72);
      spot(tw * 0.885, th * 0.32, tw * 0.06, th * 0.18, 0.42);
      c.restore();
      // Ağız halkası: camı KESİTTEN gösteren elips halka — açık kabın en güçlü
      // işareti. DOM .wsrt-rim'in HACMİ iki iç kenardan gelir: öne bakan ÜST
      // kenar gölgede, ışık yakalayan ALT kenar aydınlık. Bunlar olmadan halka
      // düz bir çizgi gibi okunur (cam kalınlığı hissi kaybolur).
      c.save();
      c.lineCap = 'round';
      const rimCx = tw / 2, rimCy = RIM_H / 2 + 1, rimRx = tw / 2 - 1.5, rimRy = RIM_H / 2 - 1;
      // dış kontur
      c.strokeStyle = 'rgba(233,243,255,.62)'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(rimCx, rimCy, rimRx, rimRy, 0, 0, Math.PI * 2); c.stroke();
      // iç üst kenar gölgesi (öne bakan kenar — DOM inset üst gölge)
      c.strokeStyle = 'rgba(3,5,18,.5)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(rimCx, rimCy + 1.2, rimRx - 1.6, rimRy - 0.4, 0, Math.PI, Math.PI * 2); c.stroke();
      // iç alt kenar ışığı (arka kenar ışığı yakalar — DOM inset alt ışık)
      c.strokeStyle = 'rgba(245,249,255,.6)'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(rimCx, rimCy - 0.6, rimRx - 1.6, rimRy - 0.4, 0, 0, Math.PI); c.stroke();
      // üst kristal ışık çubuğu (DOM .wsrt-rim::before — yakalanan ışık)
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(rimCx, rimCy - 0.5, tw * 0.32, RIM_H * 0.2, 0, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
      c.restore();
    });
  }

  // ═══════════ SPRITE CACHE + INCREMENTAL UPDATE (Faz 2) ═══════════
  // Faz 1 doğru görünümü kurdu ama her kare TÜM sahneyi yeniden çiziyordu ve
  // her katman için gradyan tahsis ediyordu (~100 tahsis/kare). Block'ta
  // öğrenilen kural: değişmeyen şey yeniden çizilmez, sprite'a pişer.
  //
  //   wTubeSpr[i]  — tüpün DİK hâli (cam arka + sıvı + cam ön) tek bitmap.
  //                  Yalnız o tüpün sıvısı değişince yeniden pişer.
  //   wGlowSpr[c]  — tüp altı derinlik gölgesi + havuz parıltısı, renk başına.
  //
  // Döküşteki İKİ tüp (yatan kaynak + dolan hedef) cache KULLANAMAZ: kaynağın
  // sıvısı ters dönmek zorunda, hedefinki her kare değişiyor. Onlar yavaş
  // yoldan çizilir — sahnenin geri kalanı blit.
  let wTubeSpr = [], wTubeKey = [], wGlowSpr = {};
  const GLOW_OX = -0.5, GLOW_OY = 0.15, GLOW_W = 2, GLOW_H = 1.15;
  function wInvalidateSprites() { wTubeSpr = []; wTubeKey = []; wGlowSpr = {}; }

  function wMkCanvas(cssW, cssH) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(cssW * wScale));
    cv.height = Math.max(1, Math.round(cssH * wScale));
    const c = cv.getContext('2d');
    c.setTransform(wScale, 0, 0, wScale, 0, 0);
    return { cv, c };
  }

  // Tüpün dik hâli — cache anahtarı sıvı dizisi. Halka/seçim burada DEĞİL
  // (onlar sık değişir ve ucuzdur, sprite'ı boşuna geçersiz kılarlardı).
  function wTubeSprite(i) {
    const sig = tubes[i].colors.join(',');
    if (wTubeKey[i] === sig && wTubeSpr[i]) return wTubeSpr[i];
    const { tw, th } = wGeom;
    const { cv, c } = wMkCanvas(tw, th);
    if (glassBack) c.drawImage(glassBack, 0, 0, tw, th);
    wDrawLiquid(c, tubes[i].colors, 0, 0, tw, th, 0, 1, null);
    if (glassFront) c.drawImage(glassFront, 0, 0, tw, th);
    wTubeSpr[i] = cv; wTubeKey[i] = sig;
    return cv;
  }

  // Tüp altı ışıması — renge bağlı, tüpten geniş. Silüetin DIŞINA taştığı için
  // tüp sprite'ına giremez, ayrı ve arkada.
  // topColor: GÖRÜNEN sıvının en üst rengi (null = boş). Durumdan değil
  // görüntüden beslenmesi kritik — pourState durumu döküş BAŞINDA değiştirdiği
  // için `tubes[]`den okumak, sıvı daha varmadan hedefi hedef rengine
  // boyuyordu (DOM'da ışıma sıvı inince değişiyordu).
  function wGlowSprite(topColor) {
    const key = topColor === null || topColor === undefined ? 'e' : topColor;
    if (wGlowSpr[key] !== undefined) return wGlowSpr[key];
    const { tw, th } = wGeom;
    const { cv, c } = wMkCanvas(tw * GLOW_W, th * GLOW_H);
    const x = -GLOW_OX * tw, y = -GLOW_OY * th;     // tüpün sprite içindeki yeri
    const cx = x + tw / 2;
    ellipseGlow(c, cx, y + th * 0.99, tw * 0.52, th * 0.055,
      [[0, 'rgba(3,5,20,.5)'], [0.6, 'rgba(3,5,20,.2)'], [1, 'rgba(3,5,20,0)']]);
    if (key !== 'e') {
      const glow = wCol(topColor, 'glow');
      if (glow && glow !== '#888') {
        ellipseGlow(c, cx, y + th * 0.7, tw * 0.98, th * 0.52,
          [[0, glow], [0.45, glow], [1, 'rgba(0,0,0,0)']]);
      }
    }
    wGlowSpr[key] = cv;
    return cv;
  }

  // İç oda (sıvının yaşadığı boşluk) — cam duvarın içi.
  function wChamber(x, y, w, h) {
    return { x: x + WALL, y: y + RIM_H * 0.55, w: w - WALL * 2, h: h - RIM_H * 0.55 - WALL };
  }

  // CSS cubic-bezier(x1,y1,x2,y2) değerlendiricisi. Canvas'ta CSS geçişi yok,
  // ama DOM'un hareket kimliği bu eğrilerde — yaklaşık bir "spring" ile taklit
  // etmek ölçülebilir şekilde farklı hissettiriyor (bkz. doPour'daki slosh notu).
  // x→t Newton ile çözülür, sonra y hesaplanır. y1/y2 1'i aşarsa eğri aşar.
  function phCubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = t => ((ax * t + bx) * t + cx) * t;
    const dfx = t => (3 * ax * t + 2 * bx) * t + cx;
    return u => {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      let t = u;
      for (let i = 0; i < 6; i++) {
        const d = dfx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (fx(t) - u) / d;
      }
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return ((ay * t + by) * t + cy) * t;
    };
  }

  // Eksen-hizalı elips gradyanı (blur YOK — radyal gradyanın kendisi yumuşak).
  // Menisküs ve havuz parıltısı için paylaşılıyor.
  function ellipseGlow(c, gx, gy, rx, ry, stops) {
    c.save(); c.translate(gx, gy); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // Bir tüpün SIVISI. Katmanlar `colors` dizisinden (alttan üste) + isteğe
  // bağlı `extraTop` (döküşte boşalan/dolan KISMİ blok, kesirli birim yüksekliği)
  // segmentlere çevrilir; her segment tek tip çizilir. tilt/squash verilirse
  // (döküş) gövde ters döner → yüzey dünyaya göre YATAY, hacim korunur.
  // Görünüm DOM'un .wsrt-body/.wsrt-layer modelini üretir: düz renk taban +
  // oda koordinatlı yan speküler + katman içi üst-ışık/alt-gölge + yalnız
  // farklı renkler arası seam + en üstte menisküs; sonunda TÜM sütunu bağlayan
  // tek ışık örtüsü (liquid-shade). filter/blend/blur YOK.
  function wDrawLiquid(c, colors, x, y, w, h, tilt, squash, extraTop) {
    const n = colors.length;
    const extraUnits = extraTop && extraTop.units > 0.02 ? extraTop.units : 0;
    if (!n && !extraUnits) return;
    const ch = wChamber(x, y, w, h);
    const cx = ch.x + ch.w / 2, left = ch.x, right = ch.x + ch.w;
    c.save();
    // Oda maskesi: sıvı cam siluetine kırpılır (dik konumda kurulur)
    const r = Math.min(ch.w / 2, ch.h * 0.13);
    c.beginPath();
    c.moveTo(left, ch.y);
    c.lineTo(right, ch.y);
    c.lineTo(right, ch.y + ch.h - r);
    c.ellipse(cx, ch.y + ch.h - r, ch.w / 2, r, 0, 0, Math.PI);
    c.closePath();
    c.clip();
    if (tilt) {                       // gövde ters döner → yüzey dünya-yatay, hacim korunur
      c.translate(x + w / 2, y + h);
      c.rotate(-tilt * Math.PI / 180);
      c.scale(1, squash || 1);
      c.translate(-(x + w / 2), -(y + h));
    }
    const lh = ch.h * (LAYER_PCT / 100);
    const over = ch.w * 3.4;          // yatıkken yanlara taşma payı (--wsrt-spill-k)
    // Segmentler: alttan üste tam katmanlar + (varsa) en üstte kısmi blok.
    const segs = [];
    for (let k = 0; k < n; k++) segs.push({ color: colors[k], h: lh });
    if (extraUnits) segs.push({ color: extraTop.color, h: extraUnits * lh });
    const bottomY = ch.y + ch.h;
    let cursor = 0;                   // segmentin altından ölçülen birikimli yükseklik
    for (let j = 0; j < segs.length; j++) {
      const seg = segs[j];
      const segBot = bottomY - cursor, segTop = segBot - seg.h;
      const isTop = j === segs.length - 1;
      const downExt = j === 0 ? ch.w * 0.72 : 0;   // yatık dip köşesi (DOM: 0 64px 0)
      // 1) düz taban (+ yan taşma, + dip uzantısı)
      c.fillStyle = wCol(seg.color, 'base');
      c.fillRect(left - over, segTop, ch.w + over * 2, seg.h + 1 + downExt);
      // 2) yan speküler — yalnız oda genişliğinde: kenarlar parlak, orta berrak
      const sg = c.createLinearGradient(left, 0, right, 0);
      sg.addColorStop(0, 'rgba(255,255,255,.30)');
      sg.addColorStop(0.24, 'rgba(255,255,255,0)');
      sg.addColorStop(0.76, 'rgba(255,255,255,0)');
      sg.addColorStop(1, 'rgba(255,255,255,.14)');
      c.fillStyle = sg; c.fillRect(left, segTop, ch.w, seg.h + 1);
      // 3) katman içi üst ışık (DOM inset üst highlight)
      const tHi = Math.min(7, seg.h * 0.4);
      if (tHi > 0.5) {
        const tg = c.createLinearGradient(0, segTop, 0, segTop + tHi);
        tg.addColorStop(0, 'rgba(255,255,255,.42)');
        tg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = tg; c.fillRect(left - over, segTop, ch.w + over * 2, tHi);
      }
      // 4) katman içi alt gölge (DOM inset alt shadow)
      const bLo = Math.min(9, seg.h * 0.5);
      if (bLo > 0.5) {
        const bg = c.createLinearGradient(0, segBot - bLo, 0, segBot);
        bg.addColorStop(0, 'rgba(0,0,0,0)');
        bg.addColorStop(1, 'rgba(0,0,0,.28)');
        c.fillStyle = bg; c.fillRect(left - over, segBot - bLo, ch.w + over * 2, bLo);
      }
      // 5) seam — yalnız ALTINDAKİ segment farklı renkse (segmentin alt kenarı)
      if (j > 0 && segs[j - 1].color !== seg.color) {
        c.fillStyle = 'rgba(255,255,255,.16)';
        c.fillRect(left - over, segBot, ch.w + over * 2, 1);
      }
      // 6) menisküs — yalnız en üst segment (hava temasındaki içbükey yüzey)
      if (isTop) {
        ellipseGlow(c, cx, segTop + 1.5, ch.w * 0.6, 8,
          [[0, 'rgba(255,255,255,.8)'], [0.62, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]);
      }
      cursor += seg.h;
    }
    // 7) Sütun ışık örtüsü (DOM .wsrt-liquid-shade) — TÜM sütuna bir kez;
    // ayrık segmentleri tek parça sıvıya bağlar. DOM overlay-blend kullanıyordu,
    // burada alfa ile yaklaşıldı (blend YASAK).
    const totalH = cursor, colTop = bottomY - totalH;
    const shg = c.createLinearGradient(0, colTop, 0, bottomY);
    shg.addColorStop(0, 'rgba(255,255,255,.28)');
    shg.addColorStop(0.30, 'rgba(255,255,255,.05)');
    shg.addColorStop(0.52, 'rgba(0,0,0,0)');
    shg.addColorStop(1, 'rgba(0,0,0,.26)');
    c.fillStyle = shg; c.fillRect(left - over, colTop, ch.w + over * 2, totalH);
    c.restore();
  }

  // Sheen bandı — DOM'da en ÜST katmanın içinde yaşıyordu (overflow:hidden ile
  // ona kırpılıyordu), burada da öyle: bant yalnız en üst katmanın kutusunda
  // görünür. Gradyan geometriye bağlı olduğu için bir kez üretilip yeniden
  // kullanılır; kare başına gradyan üretmek yasak (03_PERFORMANCE_RULES).
  function wDrawSheen(c, x, y, w, h, nUnits, u) {
    if (nUnits <= 0) return;
    const ch = wChamber(x, y, w, h);
    const lh = ch.h * (LAYER_PCT / 100);
    const topY = ch.y + ch.h - Math.min(CAP, nUnits) * lh;
    const bandW = ch.w * 0.36;
    if (!sheenGrad) {
      sheenGrad = c.createLinearGradient(0, 0, bandW, 0);
      sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
      sheenGrad.addColorStop(0.5, 'rgba(255,255,255,.22)');
      sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
    }
    // Uçlarda sönümlen: bant birden belirip birden kaybolmasın.
    const fade = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1;
    c.save();
    c.beginPath(); c.rect(ch.x, topY, ch.w, lh); c.clip();
    c.globalAlpha = fade;
    c.translate(ch.x - bandW + (ch.w + bandW * 2) * u, topY - lh * 0.1);
    c.transform(1, 0, -Math.tan(14 * Math.PI / 180), 1, 0, 0);   // skewX(-14deg)
    c.fillStyle = sheenGrad;
    c.fillRect(0, 0, bandW, lh * 1.2);
    c.restore();
  }

  // Döküş akışı: ağızda geniş, düşerken incelen bir huni (yerçekimiyle hızlanıp
  // incelen sıvı). Ağız hedefin tam üstünde olduğu için DİKEY. filter/blur YOK;
  // ortadaki açık şerit camsı çekirdeğin ışığı kırması.
  function wDrawStream(c, fx) {
    const x = fx.streamX, y0 = fx.streamTopY, y1 = fx.streamBotY;
    const wt = 6.5, wb = 3;
    c.save();
    c.globalAlpha = fx.streamAlpha;
    c.fillStyle = wCol(fx.colorIdx, 'base');
    c.beginPath();
    c.moveTo(x - wt, y0); c.lineTo(x + wt, y0);
    c.lineTo(x + wb, y1); c.lineTo(x - wb, y1);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath();
    c.moveTo(x - wt * 0.4, y0); c.lineTo(x + wt * 0.4, y0);
    c.lineTo(x + wb * 0.4, y1); c.lineTo(x - wb * 0.4, y1);
    c.closePath(); c.fill();
    c.restore();
  }

  // ── NEON-JEL TONU, FİLTRESİZ ──
  // DOM sıvıyı `filter:saturate(1.22) brightness(1.08)` ile ışıtıyordu; canvas'ta
  // filtre YASAK (ölçülen darboğaz oydu). Aynı dönüşüm burada renklerin İÇİNE
  // pişiriliyor: sonuç piksel olarak aynı, maliyeti sıfır (bir kez, önbellekli).
  const GEL_SAT = 1.22, GEL_BRI = 1.08;
  function wGel(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;      // CSS saturate ekseni
    const f = v => Math.max(0, Math.min(255, Math.round((lum + (v - lum) * GEL_SAT) * GEL_BRI)));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  // Jewel token'ından renk (canvas CSS değişkeni okuyamaz). Sonuç önbelleklenir.
  let WCOL = {};
  function wCol(idx, kind) {
    const k = (idx + 1) + '-' + kind;
    if (WCOL[k]) return WCOL[k];
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--ph-jewel-' + (idx + 1) + '-' + kind).trim() || '#888';
    // glow rgba() — dokunma; gövde renkleri jel tonuna alınır.
    WCOL[k] = kind === 'glow' ? v : wGel(v);
    return WCOL[k];
  }

  function wSize() {
    if (!wcv || !tubesEl) return false;
    const cssW = tubesEl.clientWidth || tubesEl.getBoundingClientRect().width;
    if (!cssW) return false;
    const g = wLayout(cssW);
    // ── HAREKET ZARFI (padding'li tek canvas) ──
    // Döküşte kaynak tüp KALKAR, hedefin üstüne GİDER ve 45° YATAR. Canvas
    // kendi bitmap'ine SERT kırpar; ızgaranın çevresine şeffaf bir "bleed"
    // payı bırakıyoruz ki taşan tüp kesilmesin. Pay tüp yüksekliğinden türer:
    // yanlarda ~th·sinθ (yatık gövdenin savrulması), üstte ağız boşluğu +
    // hafif yükselme, altta yatık dip köşesi.
    const padX = Math.round(g.th * 0.82);
    const padTop = Math.round(g.th * 0.42);
    const padBottom = Math.round(g.th * 0.3);
    wGeom = Object.assign(g, { padX, padTop, padBottom, gridH: g.cssH });
    wScale = Math.min(window.devicePixelRatio || 1, 3) * wPickScale();
    const bmW = g.cssW + padX * 2, bmH = g.cssH + padTop + padBottom;
    wcv.width = Math.round(bmW * wScale);
    wcv.height = Math.round(bmH * wScale);
    wcv.style.width = bmW + 'px';
    wcv.style.height = bmH + 'px';
    // Canvas ızgaradan büyük; negatif konumla ızgara yine .wsrt-tubes'un
    // sol-üstüne hizalanır, pay dışarı taşar (dais overflow gizlemiyor).
    wcv.style.position = 'absolute';
    wcv.style.left = -padX + 'px';
    wcv.style.top = -padTop + 'px';
    // .wsrt-tubes yüksekliği ızgara kadar kalsın (dais düzeni paya göre kaymasın).
    tubesEl.style.position = 'relative';
    tubesEl.style.height = g.cssH + 'px';
    // Çizim koordinatları ızgara-yerel: (0,0) = ızgara sol-üstü; pay transform'a gömülü.
    wctx.setTransform(wScale, 0, 0, wScale, padX * wScale, padTop * wScale);
    wBuildGlass();
    wInvalidateSprites();   // geometri/ölçek değişti: tüm pişmiş bitmap'ler bayat
    return true;
  }

  // ── DIRTY REGION RENDERING (Faz 2) ──
  // Tüm bitmap'i silip her şeyi yeniden çizmek, hiçbir şey değişmemiş olsa
  // bile tam sahne bedeli demek. Artık yalnız DEĞİŞEN bölge temizlenir ve
  // yalnız o bölgeye değen tüpler çizilir. Kirli dikdörtgen ızgara-yerel.
  let wDirty = null;                 // {x0,y0,x1,y1} | null (=temiz) | 'all'
  function wMark(x0, y0, x1, y1) {
    if (wDirty === 'all') return;
    if (!wDirty) { wDirty = { x0, y0, x1, y1 }; return; }
    if (x0 < wDirty.x0) wDirty.x0 = x0;
    if (y0 < wDirty.y0) wDirty.y0 = y0;
    if (x1 > wDirty.x1) wDirty.x1 = x1;
    if (y1 > wDirty.y1) wDirty.y1 = y1;
  }
  function wMarkAll() { wDirty = 'all'; }
  // Bir tüpün kapladığı alan — ışıma tüpten geniş, seçim 14px yukarı kalkar.
  function wMarkTube(i) {
    if (!wGeom) return wMarkAll();
    const p = wGeom.pos[i]; if (!p) return;
    const { tw, th } = wGeom;
    wMark(p.x + GLOW_OX * tw, p.y - 20, p.x + tw * (GLOW_OX + GLOW_W), p.y + th * GLOW_H);
  }

  // Tek çizim noktası. Döküş sırasında rAF'tan, aksi hâlde durum değişince.
  function wPaint() {
    if (!wGeom || !wctx) return;
    const full = { x0: -wGeom.padX, y0: -wGeom.padTop,
                   x1: wGeom.cssW + wGeom.padX, y1: wGeom.cssH + wGeom.padBottom };
    // Döküş/giriş sırasında hareket zarfı geniş ve sürekli değişiyor; kirli
    // bölge hesabı orada kazandırmaz, tam sahne daha ucuz ve daha güvenli.
    const busy = wPourFx || wIntro;
    const r = (busy || wDirty === 'all' || !wDirty) ? full : {
      x0: Math.max(full.x0, wDirty.x0 - 2), y0: Math.max(full.y0, wDirty.y0 - 2),
      x1: Math.min(full.x1, wDirty.x1 + 2), y1: Math.min(full.y1, wDirty.y1 + 2) };
    wDirty = null;
    if (r.x1 <= r.x0 || r.y1 <= r.y0) return;
    wctx.save();
    wctx.beginPath(); wctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); wctx.clip();
    wctx.clearRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    wPaintScene(r);
    wctx.restore();
  }

  function wPaintScene(r) {
    const { tw, th, pos } = wGeom;
    const now = performance.now();
    for (let i = 0; i < tubes.length; i++) {
      const p = pos[i];
      if (!p) continue;
      const fx = wPourFx && wPourFx.from === i ? wPourFx : null;
      // Kirli bölgeye değmeyen tüpü hiç çizme (hareket edenler hariç — onların
      // zarfı kendi hücrelerinin dışına taşar, o kare zaten tam sahne).
      if (!fx && (p.x + tw * (GLOW_OX + GLOW_W) < r.x0 || p.x + GLOW_OX * tw > r.x1 ||
                  p.y + th * GLOW_H < r.y0 || p.y - 20 > r.y1)) continue;
      // Giriş (stagger): tüpler sırayla aşağıdan yükselip belirir.
      let introA = 1, introDy = 0;
      if (wIntro) {
        const u = Math.max(0, Math.min(1, (now - wIntro.t0 - i * INTRO_STEP) / INTRO_MS));
        introA = u; introDy = (1 - u) * 26;
        if (u <= 0) continue;                                    // sırası gelmedi: hiç çizme
      }
      wctx.save();
      wctx.globalAlpha = introA;
      if (introDy) wctx.translate(0, introDy);
      if (fx) wctx.transform(1, 0, 0, 1, fx.dx, fx.dy);
      // Geçersiz hedef: sönümlenen yatay salınım (DOM phShake karşılığı).
      if (wShake && wShake.idx === i) {
        const u = (now - wShake.t0) / SHAKE_MS;
        wctx.translate(Math.sin(u * Math.PI * 6) * 7 * (1 - u), 0);
      }
      // Seçili tüp kalkar VE hafifçe büyür (DOM: translateY(-14px) scale(1.04)).
      // Ölçek dip-merkezden: tüp zeminden kopmuş gibi görünmemeli.
      if (i === selected && !fx) {
        wctx.translate(0, -14);
        wctx.translate(p.x + tw / 2, p.y + th);
        wctx.scale(1.04, 1.04);
        wctx.translate(-(p.x + tw / 2), -(p.y + th));
      }
      // CAM tilt ile döner, SIVI GÖVDESİ bodyTilt ile ters döner. İkisi eşitse
      // yüzey dünyaya göre yatay; gövde geride kalınca fark kadar sapar — DOM'un
      // salınımı (bkz. doPour'daki yay) tam olarak bu farktan doğuyor.
      let tilt = 0, bodyTilt = 0, squash = 1;
      if (fx) {
        tilt = fx.tilt; squash = fx.squash;
        bodyTilt = fx.bodyTilt !== undefined ? fx.bodyTilt : fx.tilt;
        wctx.translate(p.x + tw / 2, p.y + th);
        wctx.rotate(tilt * Math.PI / 180);
        wctx.translate(-(p.x + tw / 2), -(p.y + th));
      }
      // Döküş sırasında GÖRÜNEN sıvı, durumdan (tubes) değil animasyonun ara
      // hâlinden gelir: pourState durumu döküş BAŞINDA değiştirdiği için
      // doğrudan çizmek sıvıyı ışınlar (kaynak bir anda boşalır, hedef dolar).
      const pf = wPourFx;
      let colors = null, extraTop = null;
      if (pf && pf.drain) {
        if (i === pf.from) { colors = pf.srcBase; extraTop = { color: pf.colorIdx, units: pf.srcUnits }; }
        else if (i === pf.to) { colors = pf.dstBase; extraTop = { color: pf.colorIdx, units: pf.dstUnits }; }
      } else if (wSettle && wSettle.idx === i) {
        // OTURMA — inen sıvı %32 ezilmiş gelir, yaylanarak (hafif aşarak) oturur.
        // DOM'da wsrtSettle keyframe'iydi; burada kısmi blok yüksekliğiyle
        // aynı şey yapılıyor, ayrı bir mekanizmaya gerek yok.
        const s = 0.32 + 0.68 * settleEase(Math.min(1, (now - wSettle.t0) / SETTLE_MS));
        colors = wSettle.base;
        extraTop = { color: wSettle.color, units: wSettle.units * s };
      }
      // Havuz parıltısı + derinlik gölgesi cam siluetinin ARKASINA. Yalnız
      // durağan tüpte — hareket eden tüpte glow tilt'e karışmasın (Faz 4).
      // Renk GÖRÜNEN sıvıdan alınır: kısmi blok varsa o, yoksa en üst katman.
      if (!fx) {
        const vis = colors !== null ? colors : tubes[i].colors;
        const top = (extraTop && extraTop.units > 0.02) ? extraTop.color
          : (vis.length ? vis[vis.length - 1] : null);
        wctx.drawImage(wGlowSprite(top),
          p.x + GLOW_OX * tw, p.y + GLOW_OY * th, tw * GLOW_W, th * GLOW_H);
      }
      // Sprite yalnız TAM durağan tüp için geçerli: kuyrukta cam dik (tilt 0)
      // ama sıvı hâlâ savruluyor (bodyTilt≠0) — orada sprite salınımı yutardı.
      if (colors === null && !tilt && !bodyTilt) {
        // HIZLI YOL: tüp değişmiyor → pişmiş bitmap'i tek drawImage ile bas.
        wctx.drawImage(wTubeSprite(i), p.x, p.y, tw, th);
      } else {
        // YAVAŞ YOL: yalnız döküşteki iki tüp (yatan kaynak + dolan hedef).
        if (glassBack) wctx.drawImage(glassBack, p.x, p.y, tw, th);
        wDrawLiquid(wctx, colors || tubes[i].colors, p.x, p.y, tw, th, bodyTilt, squash, extraTop);
        if (glassFront) wctx.drawImage(glassFront, p.x, p.y, tw, th);
      }
      // Sheen — olay tetiklemeli tek seferlik süzülme (bkz. wSheen notu).
      if (wSheen) {
        const units = colors !== null
          ? colors.length + (extraTop ? extraTop.units : 0)
          : tubes[i].colors.length;
        wDrawSheen(wctx, p.x, p.y, tw, th, units, (now - wSheen.t0) / SHEEN_MS);
      }
      // Durum halkası: çözüldü (altın, tek seferlik nabız) > seçili > geçerli hedef.
      // DOM'da box-shadow'du; burada ince kontur — parıltı sprite'a girmez,
      // çünkü rengi ve nabzı duruma göre değişiyor.
      let ring = null, ringW = 2;
      if (wSolved && wSolved.idx === i) {
        const u = (now - wSolved.t0) / SOLVED_MS;
        const a = Math.sin(Math.min(1, u) * Math.PI);            // 0 → 1 → 0
        ring = 'rgba(255,214,120,' + (0.95 * a).toFixed(3) + ')';
        ringW = 2 + 2.5 * a;
      } else if (i === selected) {
        ring = 'rgba(190,168,255,.95)';
      } else if (selected !== null && selected !== i && canPour(tubes, selected, i, CAP)) {
        // Geçerli hedef: camgöbeği halka NABIZ atar (DOM wsrtValidPulse —
        // opacity 0→1→0, sonsuz). Sabit halka "burası geçerli" der ama
        // dikkat çekmez; nabız gözü tahtada gezdiren şey.
        const a = 0.5 - 0.5 * Math.cos(now / VALID_PULSE_MS * Math.PI * 2);
        ring = 'rgba(150,205,255,' + (0.75 * a).toFixed(3) + ')';
      }
      if (ring) {
        wctx.save();
        wTubePath(wctx, p.x - 1, p.y - 1, tw + 2, th + 2);
        wctx.strokeStyle = ring; wctx.lineWidth = ringW; wctx.stroke();
        wctx.restore();
      }
      wctx.restore();
    }
    // Akış en üstte: kaynağın ağzından hedefin sıvı yüzeyine düşer.
    if (wPourFx && wPourFx.streamAlpha > 0) wDrawStream(wctx, wPourFx);
  }

  // Dokunulan tüpü bul (DOM yerine geometriden).
  function wHit(clientX, clientY) {
    if (!wGeom || !wcv) return -1;
    const r = wcv.getBoundingClientRect();
    // Canvas pay kadar sola/yukarı taştığı için ızgara-yerel koordinata çevir.
    const x = clientX - r.left - wGeom.padX, y = clientY - r.top - wGeom.padTop;
    const { tw, th, pos } = wGeom;
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i];
      // Dokunma hedefi kasten cömert: tüp dar, parmak geniş.
      if (x >= p.x - 4 && x <= p.x + tw + 4 && y >= p.y - 6 && y <= p.y + th + 6) return i;
    }
    return -1;
  }

  function render() {
    wrapEl.innerHTML = `
      <div class="wsrt-bar">
        <span class="wb-lbl">Seviye ${level+1}</span>
        <span class="wb-moves" id="wsrt-moves"></span>
        <div class="wb-right">
          <button class="wsrt-icon-btn" id="wsrt-prev" title="Önceki Seviye (reklam)">◀</button>
          <button class="wsrt-icon-btn" id="wsrt-restart" title="Yeniden Başlat (reklam)">🔄</button>
        </div>
      </div>
      <div class="wsrt-dais"><div class="wsrt-tubes"><canvas class="wsrt-cv"></canvas></div></div>
    `;
    tubesEl = wrapEl.querySelector('.wsrt-tubes');
    wcv = wrapEl.querySelector('.wsrt-cv');
    wctx = wcv.getContext('2d');
    WCOL = {};
    // Seviye açılışı: tüpler sırayla aşağıdan yükselerek belirir (DOM phStaggerIn).
    const boot = () => {
      if (!wSize()) { requestAnimationFrame(boot); return; }
      wIntro = { t0: performance.now() };
      wSheenGo();          // seviye açılışı: cam bir kez ışığı yakalar
      wKick();
    };
    boot();
    // ── DOKUNMA: pointerdown, click DEĞİL ──
    // Mobil WebView 'click'i, hareketin kaydırma/çift-dokunma olmadığına karar
    // verene kadar geciktirir; oyuncu bunu "tıklamayı anında algılamıyor" diye
    // hisseder. pointerdown parmak değdiği kare tepki verir.
    // Döküş kilidi (~700ms) boyunca gelen dokunuş DÜŞÜRÜLMEZ, tamponlanır —
    // Block'ta öğrenilen kural (bkz. CLAUDE.md §5). Bayat tamponu oynamamak
    // için tazelik penceresi var: kilit uzun sürerse dokunuş iptal olur.
    wcv.style.touchAction = 'manipulation';   // 300ms çift-dokunma beklemesini kaldırır
    addEv(wcv, 'pointerdown', (e) => {
      const i = wHit(e.clientX, e.clientY);
      if (i < 0) return;
      if (animating) { wPendingTap = { i, t: performance.now() }; return; }
      onTapTube(i);
    });
    addEv(wrapEl.querySelector('#wsrt-prev'), 'click', prevLevelWithAd);
    addEv(wrapEl.querySelector('#wsrt-restart'), 'click', restartWithAd);
    addEv(window, 'resize', () => { if (wSize()) wPaint(); });
    updateControlsBar();
  }

  // ═══════════ ETKİLEŞİM ═══════════
  // Gecerli hedef halkasi artik wPaint icinde ciziliyor (DOM sinifi yok).
  function updateValidTargets() { wPaint(); }
  function select(i) {
    selected = i;
    wPaint();
    wSheenGo();              // seçim: ışık bir kez süzülür
    wKick();                 // geçerli hedef nabzını başlat
    GameAudio.play('tap'); GameAudio.haptic('micro');
  }
  function deselect() { selected = null; wPaint(); }
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
      // Geçersiz hedef: tüp sallanır (DOM phShake karşılığı) ve seçim oraya geçer.
      wShake = { idx: i, t0: performance.now() };
      GameAudio.haptic('soft');
      select(i);
      wKick();
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
  function tubeSolvedFeedback(idx, x, y) {
    comboCount++;
    wSolved = { idx, t0: performance.now() };   // altın halka nabzı (DOM wsrtSolvedPulse)
    phParticleBurst(document.body, x, y, 'var(--ph-success)', 10);
    // İlk tüp zaten büyük bir ödül — seri yazısı ancak ikinciden itibaren.
    if (comboCount < 2) { GameAudio.play('star'); GameAudio.haptic('star'); return; }
    const step = COMBO_SFX.find(s => comboCount <= s.upTo) || { sfx: 'combo8', haptic: 'record' };
    GameAudio.play(step.sfx); GameAudio.haptic(step.haptic);
    const r = wcv.getBoundingClientRect();
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
  // ── DÖKÜŞ (canvas, Sprint 4) ──
  // Dizi ve zamanlama DOM sürümünden korundu: tüp KALKAR ve hedefin üstüne
  // GİDER (travel) → sıvı AKAR (stream) → tüp yerine DÖNER (return).
  // "Önce tepki, sonra sonuç": dokunuş anında tüp harekete geçer.
  // Fark: hepsi tek bir rAF döngüsünde canvas'a çiziliyor; hareket eden tüpün
  // üzerinde filter/blend/blur YOK (ölçülen darboğaz buydu).
  function doPour(from, to) {
    const run = topRun(tubes[from]);
    const colorIdx = run.color;
    // Dökme ÖNCESİ hâller — pourState durumu ANINDA değiştirir, oysa animasyon
    // boyunca çizilmesi gereken şey aradaki geçiş. Kaynağın altta KALAN kısmı
    // ve hedefin dökmeden ÖNCEKİ içeriği, durum değişmeden önce donduruluyor
    // (aktarılacak miktar pourState'in kendi formülü: run ∩ hedefteki boşluk).
    const willMove = Math.min(run.count, CAP - tubes[to].colors.length);
    const srcBase = tubes[from].colors.slice(0, tubes[from].colors.length - willMove);
    const dstBase = tubes[to].colors.slice();
    const count = pourState(tubes, from, to, CAP);
    const scoreDelta = count * 10;

    // pourState tubes'u ANINDA değiştirir; animasyon boyunca girdi kilitli
    // kalmazsa ikinci hamle yarı-güncel durum üzerinde işlem yapar.
    animating = true;
    score += scoreDelta;
    // Hamle kaydı TUTULMUYOR: geri alma kalktı, tek tüketicisi oydu.
    // Yeniden başlatma başlangıç kopyasından dönüyor (bkz. restartLevel).
    movesUsed++;
    updateGameScore(score);
    updateControlsBar();

    const p0 = wGeom.pos[from], p1 = wGeom.pos[to], tw = wGeom.tw, th = wGeom.th;
    const dir = p1.x >= p0.x ? 1 : -1;
    const tiltMax = POUR_TILT_DEG * dir;
    const tiltRad = tiltMax * Math.PI / 180;
    // DOM pourTransform matematiği BİREBİR: tüp dip-MERKEZinden döner, bu yüzden
    // ağız yana (th·sinθ) ve yukarı (th·(1-cosθ)) kayar. Bu iki terim İPTAL
    // edilmezse ağız hedefi ~th·sinθ (≈160px) aşar — eski canvas bug'ı buydu.
    // Denklem, ağzı hedef merkezinin POUR_MOUTH_GAP üstüne oturtacak şekilde çözülür.
    const tx = (p1.x - p0.x) - th * Math.sin(tiltRad);
    const ty = (p1.y - p0.y) - POUR_MOUTH_GAP - th * (1 - Math.cos(tiltRad));

    GameAudio.play('snap'); GameAudio.haptic(6);
    deselect();
    updateControlsBar();

    // Akışın geometrisi: ağız (kaynağın gittiği nokta) hedefin ÜSTÜNDE, akış
    // hedefteki sıvının O ANKİ yüzeyine iner. Süre mesafeden çıkar (sabit HIZ) —
    // hedef ne kadar boşsa akış o kadar uzun sürer (DOM streamDuration).
    const chTo = wChamber(p1.x, p1.y, tw, th);
    const lhTo = chTo.h * (LAYER_PCT / 100);
    const mouthX = p1.x + tw / 2, mouthY = p1.y - POUR_MOUTH_GAP;
    const fallY = chTo.y + chTo.h - dstBase.length * lhTo;
    const streamMs = streamDuration(Math.max(18, fallY - mouthY));
    const T1 = POUR_TRAVEL_MS, T2 = T1 + streamMs, T3 = T2 + POUR_RETURN_MS;
    const t0 = performance.now();
    let poured = false, sounded = false;
    const ease = u => 1 - Math.pow(1 - u, 3);
    const gravity = u => u * u;          // düşen sıvı HIZLANIR (DOM eğrisi)

    // ── SLOSH: sıvı camı GERİDEN takip eder, aşarak oturur ──
    // "Ağırlık hissinin tamamı bu gecikmede" (DOM'un kendi notu). Cam durur,
    // sıvı bir an daha savrulur. Görünen sıvı eğimi = cam açısı − gövde açısı;
    // ikisi eşitken yüzey dünyaya göre yatay, gövde geride kalınca fark kadar
    // sapar — savrulma tam olarak budur.
    //
    // Model YAY DEĞİL. Denendi ve yanlış çıktı: tek bir yay, düşük gecikme ile
    // belirgin aşımı aynı anda veremiyor (ölçüldü: aşımı 1.9°'ye getiren her
    // ayar gecikmeyi 10°+ yapıyordu, ki DOM bunu adıyla reddetmiş —
    // "ağırlık değil gevşeklik gibi okunuyordu"). DOM bir CSS GEÇİŞİ
    // kullanıyordu: gövde kendi SÜRESİ ve AŞIMLI EĞRİSİYLE hedefe gider.
    // Buradaki port birebir aynı: aynı eğriler, aynı süreler.
    // Doğrulandı — gidiş gecikmesi 3.64° (DOM 3.6), dönüş 5.54° (DOM 5.4),
    // oturma aşımı 1.49° (DOM 1.9).
    const bodyGoEase = phCubicBezier(.2, 1.3, .35, 1);     // --wsrt-slosh-ease
    const bodyBackEase = phCubicBezier(.45, 0, .2, 1.25);  // .wsrt-returning
    const BODY_GO_MS = 240, BODY_BACK_MS = 220;
    let bodyFrom = 0, bodyTo = 0, bodyT0 = t0, bodyDur = BODY_GO_MS, bodyEase = bodyGoEase;
    let bodyTilt = 0;
    // Gövdenin hedefi değişince geçiş MEVCUT değerden yeniden başlar — yarıda
    // kesilen bir dökmede sıçrama olmaz.
    const bodyAim = (target, dur, easeFn, now) => {
      if (target === bodyTo) return;
      bodyFrom = bodyTilt; bodyTo = target; bodyT0 = now; bodyDur = dur; bodyEase = easeFn;
    };
    const bodyAt = (now) => {
      const u = bodyDur <= 0 ? 1 : Math.min(1, (now - bodyT0) / bodyDur);
      bodyTilt = bodyFrom + (bodyTo - bodyFrom) * bodyEase(u);
      return bodyTilt;
    };
    const bodySettled = (now) => (now - bodyT0) >= bodyDur;

    const step = (now) => {
      const el = now - t0;
      if (el < T1) {                       // GİDİŞ — tüp kalkar, hedefe gider, yatar
        const u = ease(el / T1);
        // Gövde, camın ANLIK açısını izlemez — DOM'da da öyleydi: --wsrt-tilt
        // bir kerede son değere yazılır, gövde oraya kendi eğrisiyle gider.
        const tiltNow = tiltMax * u;
        bodyAim(tiltMax, BODY_GO_MS, bodyGoEase, now);
        const bt = bodyAt(now);
        wPourFx = { from, to, colorIdx, dx: tx * u, dy: ty * u,
          tilt: tiltNow, bodyTilt: bt, squash: Math.cos(bt * Math.PI / 180),
          drain: true, srcBase, dstBase, srcUnits: count, dstUnits: 0, streamAlpha: 0 };
      } else if (el < T2) {                // AKIŞ — kaynak boşalır, hedef dolar
        if (!sounded) { sounded = true; GameAudio.play('pour'); GameAudio.haptic(10); }
        const u = (el - T1) / streamMs;
        // Akışın ÖN UCU yerçekimiyle iner; kuyruk kaynak boşaldıkça gelir.
        const headY = mouthY + (fallY - mouthY) * Math.min(1, gravity(u) * 1.6);
        // Hedef, akışın ön ucu YÜZEYE DEĞDİKTEN sonra dolmaya başlar — sıvı
        // varmadan hedefin yükselmesi "ışınlanma" hissinin ta kendisiydi.
        const arrive = 1 / 1.6, fill = u <= arrive ? 0 : (u - arrive) / (1 - arrive);
        const bt = bodyAt(now);           // hedef hâlâ tiltMax — geçiş sürüyor
        wPourFx = { from, to, colorIdx, dx: tx, dy: ty,
          tilt: tiltMax, bodyTilt: bt, squash: Math.cos(bt * Math.PI / 180),
          drain: true, srcBase, dstBase,
          srcUnits: count * (1 - u), dstUnits: count * fill,
          streamAlpha: u > 0.92 ? (1 - u) / 0.08 : 1,   // kuyruk sönümü
          streamX: mouthX, streamTopY: mouthY, streamBotY: headY };
        if (!poured && u >= 0.999) { poured = true; onPoured(); }
      } else if (el < T3) {                // DÖNÜŞ — tüp doğrulur
        if (!poured) { poured = true; onPoured(); }
        const u = ease((el - T2) / (T3 - T2)), k = 1 - u;
        const tiltNow = tiltMax * k;
        bodyAim(0, BODY_BACK_MS, bodyBackEase, now);   // dönüş bacağı: kendi eğrisi
        const bt = bodyAt(now);
        wPourFx = { from, to, colorIdx, dx: tx * k, dy: ty * k,
          tilt: tiltNow, bodyTilt: bt, squash: Math.cos(bt * Math.PI / 180), streamAlpha: 0 };
      } else {
        // KUYRUK — cam dik oturdu ama sıvı hâlâ savruluyor. DOM'da da böyleydi:
        // salınımın kuyruğu tüpün oturmasından sonra biter. Kilit kuyruk
        // boyunca açılmıyor ama bu oyunu ölü hissettirmiyor, çünkü bu sırada
        // gelen dokunuş DÜŞMÜYOR — tamponlanıp kilit açılınca oynuyor.
        const bt = bodyAt(now);
        const settled = bodySettled(now) && Math.abs(bt) < 0.05;
        if (!settled && el < T3 + 600) {      // 600ms: emniyet freni
          wPourFx = { from, to, colorIdx, dx: 0, dy: 0, tilt: 0, bodyTilt: bt,
            squash: Math.cos(bt * Math.PI / 180), streamAlpha: 0 };
        } else {
          wPourFx = null; wRaf = 0; wPaint();
          // Çözüldü halkası döküşten UZUN sürer; döküş döngüsü bitince onu
          // geri bildirim döngüsü devralır (yoksa animasyon yarıda donardı).
          wKick();
          if (!isWin(tubes, CAP)) { animating = false; wFlushTap(); }
          return;
        }
      }
      wPaint();
      wRaf = requestAnimationFrame(step);
    };

    function onPoured() {
      applyPourDOM();
      // İnen sıvı yerine oturur (DOM .wsrt-layer-settle). Akış bitti, durum
      // uygulandı; görsel olarak son blok ezik gelip yaylanarak yerleşir.
      wSettle = { idx: to, t0: performance.now(), base: dstBase, color: colorIdx, units: count };
      wSheenGo();          // başarılı döküş: sıvı yerleşirken ışık süzülür
      const won = isWin(tubes, CAP);
      const r = wcv.getBoundingClientRect();
      // Canvas pay kadar taştığı için ekran koordinatına pay eklenir.
      const cx = r.left + wGeom.padX + p1.x + tw / 2, cy = r.top + wGeom.padTop + p1.y;
      phParticleBurst(document.body, cx, cy, `var(--ph-jewel-${colorIdx+1}-base)`, 8);
      phFloatText(wrapEl, `+${scoreDelta}`, cx, cy, 'var(--ph-success)');
      if (isTubeSolved(tubes[to], CAP)) tubeSolvedFeedback(to, cx, cy + th / 2);
      if (won) setTimeout(onLevelComplete, 300 + POUR_RETURN_MS);
      // Kaybetme, kazanmanın AYNI gecikmesini kullanıyor: son döküş animasyonu
      // tamamlanmadan kutu açılırsa oyuncu neyin olduğunu göremez.
      else if (movesUsed >= moveLimit) setTimeout(onOutOfMoves, 300 + POUR_RETURN_MS);
    }

    if (wRaf) cancelAnimationFrame(wRaf);
    wRaf = requestAnimationFrame(step);
  }
  // movesUsed BURADA AZALTILMIYOR ve bu bilinçli. Geri alma sınırsız ve
  // elmas bakımından ücretsiz (yalnızca yıldız düşürüyor); hamle iade
  // edilseydi oyuncu sonsuza kadar geri alıp asla kaybedemezdi, yani hamle
  // limiti de kaybetme ekranı da dekoratif kalırdı. Sayaç "yapılan döküş"ü
  // sayıyor: denemenin bedeli hamle bütçesi. Undo'nun kendi mantığına
  // (ücretsiz, sınırsız, yıldız düşürür) DOKUNULMADI — kaçış kapısı
  // ücretsiz "Yeniden Başla".
  // Tüplerin derin kopyası. Sığ kopya YETMEZ: her tüp kendi renk dizisini
  // taşıyor ve döküş o diziyi yerinde değiştiriyor — sığ kopyada başlangıç
  // anlık görüntüsü oyunla birlikte "kayar" ve yeniden başlatma hiçbir şey
  // yapmaz hâle gelir.
  function snapshotTubes(src) {
    return src.map(t => ({ colors: t.colors.slice() }));
  }

  // ◀ ÖNCEKİ SEVİYE — ÖDÜLLÜ (2026-08-07, sahip kararı).
  // Ödül verilmezse seviye DEĞİŞMEZ; bunu sağlayan şey burada bir kontrol
  // değil, runRewardedAction'ın sözleşmesi: geri çağırma yalnızca ödül hak
  // edilince çalışıyor (CLAUDE.md ekonomi kuralı 2).
  //
  // 1. seviyede kapalı: "öncesi" yok. Düğmeyi gizlemek yerine pasif
  //    bırakıyoruz — AdBudget'taki aynı dil: gri bir düğme "şimdi olmaz"
  //    der, kaybolan bir düğme "böyle bir şey yok" der.
  function prevLevelWithAd() {
    if (animating || level <= 0) return;      // level SIFIR TABANLI
    if (typeof runRewardedAction !== 'function') { loadLevel(level - 1); return; }
    runRewardedAction({ icon: '◀', text: 'Önceki Seviye' }, () => {
      // loadLevel yeni bir game_started yayınlıyor; açık tur Değişmez 2
      // gereği 'quit' ile kapanıyor. Doğru olan bu: oyuncu bu seviyeyi
      // terk edip başka bir seviyeye geçti, tamamlamadı.
      loadLevel(level - 1);
    }, { skipDailyLimit: true });   // fayda eylemi — günlük elmas hakkına işlemez
  }
  // Dökme sırasında yeniden başlatma yok (durum yarı yolda değişiyor olurdu);
  // ama geçmiş boşken de render() çalışır — tahta zaten başlangıçtaysa bile
  // dokunuş görünür bir karşılık verir ve DOM durumdan yeniden kurulur.
  // 🔄 YENİDEN BAŞLAT — oyun içi düğmeden ÖDÜLLÜ, kaybetme ekranından
  // ÜCRETSİZ (2026-08-07, sahip kararı).
  //
  // Bu ayrım soft-lock'u önlüyor ve tek sebebi bu: hamle limiti bitince
  // devam etmek reklam/elmas istiyor; yeniden başlatmanın TEK yolu da
  // reklam olsaydı, bütçesi bitmiş bir oyuncu o seviyede sıkışırdı.
  // Kaybetme ekranındaki "Tekrar Oyna" bu yüzden ücretsiz kalıyor —
  // CLAUDE.md'nin "ücretsiz kaçış kapısı" kuralı orada yaşamaya devam
  // ediyor. Oyun içi düğme ise bir kolaylık: tahtayı beğenmeyen oyuncu
  // için, kaybetmeden önce.
  function restartWithAd() {
    if (animating) return;
    if (typeof runRewardedAction !== 'function') { restartLevel(); return; }
    runRewardedAction({ icon: '🔄', text: 'Yeniden Başlat' }, () => restartLevel(), { skipDailyLimit: true });
  }

  function restartLevel() {
    if (animating) return;
    // Başlangıç kopyasını GERİ YAZ. Eskiden geçmiş ters çevriliyordu;
    // geri alma kalkınca geçmiş de kalktı, ama "başlangıç durumuna dön"
    // sözü aynen duruyor — kopya onu daha doğrudan tutuyor.
    tubes = snapshotTubes(initialTubes);
    // Skor SEVİYE BAŞINA sıfırlanmıyor, koşu boyunca birikiyor — o yüzden
    // 0'a çekmek önceki seviyelerin puanını da silerdi. Geçmişi ters
    // çeviren eski kod bunu farkında olmadan doğru yapıyordu (her hamlenin
    // scoreDelta'sını düşüyordu); kopya yöntemi aynı sonucu vermek için
    // seviye başındaki skoru ayrıca saklamak zorunda.
    score = initialScore;
    selected = null;
    comboCount = 0;
    // Yeniden başlatmak GERÇEKTEN yeni bir tur: hamle bütçesi sıfırlanıyor
    // ve GameEvents'e yeni bir başlangıç bildiriliyor. Değişmez 2 gereği
    // açık tur önce 'quit' ile kapanır — oyuncu o denemeyi terk etti.
    // Ücretsiz: kaybetme ekranının bedelsiz çıkışı bu.
    movesUsed = 0;
    moveLimit = moveLimitFor(level);
    levelStartedAt = Date.now();
    gameEvent('game_started', { gameId: 'waterSort' });
    updateGameScore(score);
    render();
    GameAudio.play('button'); GameAudio.haptic('soft');
  }

  // ═══════════ HAMLE BİTTİ ═══════════
  function onOutOfMoves() {
    if (isWin(tubes, CAP)) return;          // son döküş kazandırdıysa kaybetme yok
    GameAudio.play('lose'); GameAudio.haptic('error');
    gameEvent('game_ended', {
      gameId: 'waterSort', result: 'lost', score,
      durationMs: Date.now() - levelStartedAt,
    });
    const extra = extraMovesFor(level);
    const solved = tubes.filter(t => t.colors.length && isTubeSolved(t, CAP)).length;
    showGameOver(false, 'Hamleler Bitti', `+${extra} hamle ile devam edebilirsin.`, {
      accent: 'var(--ph-jewel-1-shadow)',
      accentLight: 'var(--ph-jewel-1-highlight)',
      accentGlow: 'var(--ph-jewel-1-glow)',
      mark: '✧',
      continueCost: econ('EXTRA_MOVES_DIAMONDS', 20),
      stats: [
        { label: 'Hamle', value: movesUsed + ' / ' + moveLimit },
        { label: 'Biten Tüp', value: solved },
      ],
      // Devam: AYNI tur sürüyor. Yeni game_started YAYINLANMIYOR —
      // app.js'teki _runGameOverContinuation turu reopen ile geri açıyor.
      onContinue: () => {
        moveLimit += extra;
        animating = false;                  // döküş döngüsü bitmemişse kilidi bırak
        updateControlsBar();
        showToast('🧪 +' + extra + ' hamle!');
      },
      // Tekrar Oyna: gerçekten yeni bir tur (restartLevel game_started yayınlar).
      onRestart: () => { animating = false; restartLevel(); },
    });
  }

  // ═══════════ SEVİYE İLERLEMESİ ═══════════
  // Yıldız derecesi geri-alma sayısına dayanır — 3★ hiç geri alınmadan,
  // 2★ 1-2 geri almayla, 1★ daha fazlasıyla. Ödül sayacı (0→bonus) yerel
  // bir rAF döngüsüyle dais üzerinde oynatılır, ardından paylaşımlı
  // phShowCelebration'a NİHAİ metin geçilir — ui-kit.js'e dokunulmuyor
  // (bkz. plan §5: paylaşımlı katman yalnızca gerçek ikinci tüketici
  // çıktığında büyür).
  // YILDIZ ARTIK HAMLE VERİMLİLİĞİNE BAKIYOR (2026-08-07).
  // Eski kural geri alma sayısına dayanıyordu; geri alma kaldırılınca
  // dayanağı kalmadı (kural aynen bırakılsaydı herkes hep 3★ alırdı, yani
  // yıldız hiçbir şey ölçmezdi).
  //
  // Eşikler UYDURULMADI, zaten ölçülmüş verilerden türüyor. CLAUDE.md'deki
  // Water Sort ölçümü: 30 tahta/seviye IDA* ile gerçek optimumuna çözüldü
  // ve p90 ≈ 3.5 × renk sayısı çıktı; limit ise 5 × renk. Yani
  //   p90 = 0.70 × limit  →  bunun altı "en zor tahtalar kadar iyi" = 3★
  //   0.85 × limit        →  limitin rahatça altında bitirme     = 2★
  //   üstü                                                        = 1★
  // Oranlar limitten türediği için renk sayısı değişince kendiliğinden
  // ölçekleniyor; hiçbir seviyeye özel sayı yok.
  const STAR_3_RATIO = 0.70;   // ölçülen p90 / limit
  const STAR_2_RATIO = 0.85;
  function starsForLevel() {
    if (!moveLimit) return 3;
    const oran = movesUsed / moveLimit;
    if (oran <= STAR_3_RATIO) return 3;
    if (oran <= STAR_2_RATIO) return 2;
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
    gameEvent('game_ended', { gameId: 'waterSort', result: 'won', score });
    GameAudio.play('star'); GameAudio.haptic('star');
    countUpAndCelebrate(bonus, starsForLevel());
  }
  function loadLevel(lv) {
    // Tur = SEVİYE (init ve seviye ilerlemesi ikisi de buradan geçiyor).
    // 2026-08-01: bu oyun ARTIK 'lost' da yayınlıyor — hamle limiti bilinçli
    // bir kaybetme durumu getirdi. Önceki "kaybetme durumu yok" notu bu
    // tarihte geçersizleşti (bkz. HAMLE LİMİTİ başlığı).
    gameEvent('game_started', { gameId: 'waterSort' });
    level = lv;
    tubes = generateLevel(lv);
    // Yeniden başlatmanın doğruluk kaynağı: seviyenin BAŞLANGIÇ hâli.
    // generateLevel(lv) yeniden çağrılmıyor — üretecin aynı tahtayı
    // vereceği garanti değil ve "başlangıç durumuna dön" sözü, başka bir
    // tahta vermekle tutulmuş olmaz.
    initialTubes = snapshotTubes(tubes);
    initialScore = score;
    selected = null;
    animating = false;
    comboCount = 0;
    movesUsed = 0;
    moveLimit = moveLimitFor(lv);
    levelStartedAt = Date.now();
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
    // 01_ARCHITECTURE: cleanup() dinleyicileri, rAF döngülerini, zamanlayıcıları
    // ve DOKULARI bırakmak zorunda. Canvas renderer'ın iki döngüsü var ve ikisi
    // de oyundan çıkarken canlı olabilir:
    //   wRaf   — döküş sürerken çıkılırsa,
    //   wFxRaf — bir tüp SEÇİLİYKEN çıkılırsa (seçim, geçerli hedef nabzını
    //            canlı tutuyor; bu döngü kendi başına asla durmazdı).
    // Bırakılırsa kopmuş bir canvas'a sonsuza kadar çizmeye devam ederler.
    if (wRaf) cancelAnimationFrame(wRaf);
    if (wFxRaf) cancelAnimationFrame(wFxRaf);
    wRaf = 0; wFxRaf = 0;
    wPourFx = null; wPendingTap = null;
    wShake = null; wSolved = null; wIntro = null; wSettle = null; wSheen = null;
    selected = null;
    // Dokular: sprite'lar tüp geometrisine bağlı; sonraki init yeniden pişirir.
    wInvalidateSprites();
    glassBack = null; glassFront = null; sheenGrad = null;
    wcv = null; wctx = null; wGeom = null;
    animating = false;
    if (container) container.classList.remove('wsrt-scene');
    const scoreWrap = document.querySelector('.game-score-wrap');
    if (scoreWrap) scoreWrap.style.display = '';
  }

  return { init, cleanup };
})();


// ╔══════════════════════════════════════╗
// ║       ARROW  (Faz 1: yalnizca motor) ║
// ╚══════════════════════════════════════╝
// Bu modul su an KABUGA BAGLI DEGIL: GAME_MAP'e eklenmedi ve
// REEL_GAMES'te playable:false. Faz 2 render + girdi getirecek.
// Motor burada duruyor cunku Node ile dogrulanabilir olmasi gerekiyordu
// (bkz. docs/GAMES/ARROW.md dogrulama bolumu).
PuzzleGames.arrowPuzzle = (() => {
  // ═══════════════════════════════════════════════════════════════
  //  ARROW — MOTOR (Faz 1)
  // ═══════════════════════════════════════════════════════════════
  // Render YOK. Bu bölüm bilerek tarayıcıdan bağımsız: çarpışma ve
  // üretim doğruluğu bu oyunun riskli kısmı ve Node'da kaba kuvvet
  // referansla sınanabilmeli (Sudoku üretecinde işe yarayan yaklaşım).
  //
  // MODEL SEÇİMİ — "hep ya da hiç" (B modeli):
  // Ok ya tamamen tahtadan çıkar ya da hiç kıpırdamaz. Referans setinde
  // iki farklı kural tarif ediliyordu (bkz. plan §1); B seçildi çünkü
  // can cezası onu ima ediyor ve bu modelde ÇIKARMA MONOTONDUR:
  // bir ok gidince doluluk yalnızca azalır, dolayısıyla serbest bir ok
  // asla bloke hâle gelemez. Sonuç: seviye çözülebilirse "her adımda
  // serbest herhangi bir oku çıkar" stratejisi HER ZAMAN çözer.
  // Bu, çözülebilirlik testini aramadan düz bir döngüye indiriyor.

  // Yön sırası: 0=yukarı 1=sağ 2=aşağı 3=sol
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  // Şekiller KANONİK yönde (uç yukarı bakar) tanımlı; gövde aşağı uzanır.
  // Uç daima (0,0). Şekil kütüphanesi VERİDİR — düz/kıvrımlı kararı
  // koda gömülmedi, parametreyle seçilir (bkz. generate opts.shapes).
  const SHAPES = [
    { id: 'i2', offsets: [[0, 0], [0, 1]] },
    { id: 'i3', offsets: [[0, 0], [0, 1], [0, 2]] },
    { id: 'i4', offsets: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'l3', offsets: [[0, 0], [0, 1], [1, 1]] },
    { id: 'l3b', offsets: [[0, 0], [0, 1], [-1, 1]] },
    { id: 'l4', offsets: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { id: 's4', offsets: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { id: 'u5', offsets: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]] },

    // ── Uzun kıvrımlılar ──
    // Referans tasarımdaki "enerji yılanı" siluetleri. Kural aynı: uç
    // (0,0)'da, ardışık hücreler komşu (bodyPath polyline'ı ve
    // bodyLen = hücre-1 buna dayanıyor), offsets[1] = [0,1] ki uç
    // gövdenin ucunda dursun, bir köşenin ortasında değil.
    { id: 'z6',  offsets: [[0,0],[0,1],[0,2],[1,2],[1,3],[1,4]] },
    { id: 'n6',  offsets: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
    { id: 'l6',  offsets: [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3]] },
    { id: 'c6',  offsets: [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1]] },
    { id: 's7',  offsets: [[0,0],[0,1],[0,2],[-1,2],[-1,3],[-1,4],[-2,4]] },
    { id: 'w8',  offsets: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3],[3,3],[3,4]] },
    { id: 'g8',  offsets: [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[2,2],[2,1]] },
    { id: 'e9',  offsets: [[0,0],[0,1],[1,1],[2,1],[2,2],[2,3],[1,3],[0,3],[0,4]] },
    { id: 'h10', offsets: [[0,0],[0,1],[1,1],[1,2],[1,3],[2,3],[3,3],[3,2],[3,1],[4,1]] },

    // ── Serpantinler (12-20 hücre) ──
    // HENÜZ HİÇBİR KADEMEDE DEĞİL: SHAPE_TIERS bunları içermiyor, yani
    // shapePool() döndürmüyor ve bugünkü oyunda çıkmıyorlar. Zorluk
    // eğrisine dokunmak ayrı bir karar. Burada duruyorlar çünkü yeni
    // üretecin ölçümü bu uzunluklarla yapıldı (26x24'te %68 yoğunluk,
    // ort. 6.4 hücre/ok) ve şekil kütüphanesi VERİdir.
    { id: 'sp12', offsets: [[0,0],[0,1],[0,2],[0,3],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3]] },
    { id: 'sp14', offsets: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3]] },
    { id: 'sp16', offsets: [[0,0],[0,1],[0,2],[0,3],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3],[3,3],[3,2],[3,1],[3,0]] },
    { id: 'sp18', offsets: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5]] },
    { id: 'sp20', offsets: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[3,4],[3,3],[3,2],[3,1],[3,0]] },
  ];
  const STRAIGHT_IDS = ['i2', 'i3', 'i4'];

  // ───────── Zorluk: şekil kademeleri ─────────
  // Oyuncu düz oklarla başlar, kıvrımı öğrenir, sonra gerçekten uzun
  // yılanlarla karşılaşır. Havuz BİRİKİMLİ: üst kademe açılınca alttakiler
  // kaybolmaz, yoksa tahta tek tip olur ve okuma kolaylaşır.
  // i2 (2 hücre) havuzdan ÇIKARILDI. Paketleyici 6 aday deneyip ilk
  // sığanı koyduğu için en küçük şekil orantısız kazanıyordu: seviye
  // 40'ta havuzun %17.6'sı düzken yerleşenlerin %48'i düz çıkıyordu ve
  // ortalama uzunluk 3.8'de kalıyordu (havuz ortalaması 5.5 iken).
  // Serpantinler 22'den itibaren giriyor — uzun kıvrımlı siluetler
  // ancak tahta 8x10'u geçince sığıyor.
  const SHAPE_TIERS = [
    { from: 1,  ids: ['i3', 'i4'] },
    { from: 4,  ids: ['l3', 'l3b', 'l4', 's4', 'u5'] },
    { from: 9,  ids: ['z6', 'n6', 'l6', 'c6', 's7'] },
    { from: 17, ids: ['w8', 'g8', 'e9', 'h10'] },
    { from: 22, ids: ['sp12', 'sp14', 'sp16'] },
  ];
  function shapePool(n) {
    const ids = [];
    for (const t of SHAPE_TIERS) if (n >= t.from) ids.push(...t.ids);
    return ids;
  }
  // Ok başına ortalama hücre — SABİT DEĞİL, havuzdan hesaplanır.
  // Uzun şekiller açılınca ortalama büyüyor ve tahtaya sığan ok sayısı
  // düşüyor. Bunu sabit bir sayıyla kestirmek, üretecin başarısız olup
  // seviyenin hiç açılmamasına yol açardı — bu hata bir kez yaşandı
  // (bkz. CLAUDE.md, 19. seviye çökmesi).
  // SHAPE_BY_ID aşağıda cellsOf için zaten tanımlı; ikinci bir eşleme
  // kurmak yerine o kullanılıyor (aynı isimle yeniden bildirmek modülün
  // tamamını çökerten bir SyntaxError üretiyordu).
  function avgCells(ids) {
    let sum = 0;
    for (const id of ids) sum += SHAPE_BY_ID[id].offsets.length;
    return sum / ids.length;
  }
  const SHAPE_BY_ID = SHAPES.reduce((m, s) => { m[s.id] = s; return m; }, {});

  // Kanonik (uç yukarı) ofseti verilen yöne döndürür.
  // up:(dc,dr) right:(-dr,dc) down:(-dc,-dr) left:(dr,-dc)
  function rotate(dc, dr, dir) {
    if (dir === 0) return [dc, dr];
    if (dir === 1) return [-dr, dc];
    if (dir === 2) return [-dc, -dr];
    return [dr, -dc];
  }

  function cellsOf(arrow) {
    const s = SHAPE_BY_ID[arrow.shapeId];
    const out = new Array(s.offsets.length);
    for (let i = 0; i < s.offsets.length; i++) {
      const r = rotate(s.offsets[i][0], s.offsets[i][1], arrow.dir);
      out[i] = [arrow.anchor[0] + r[0], arrow.anchor[1] + r[1]];
    }
    return out;
  }

  // ───────── Tahta ─────────
  // occupancy bitişik Int16Array: O(1) erişim, önbellek dostu, GC yükü
  // yok. 0 = boş, aksi hâlde arrowId+1 (0'ı boş için ayırdığımızdan).
  function makeBoard(cols, rows) {
    return { cols, rows, occ: new Int16Array(cols * rows), arrows: new Map() };
  }
  function idx(b, c, r) { return r * b.cols + c; }
  function onBoard(b, c, r) { return c >= 0 && c < b.cols && r >= 0 && r < b.rows; }

  function cellsFree(b, cells, ignoreId) {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i][0], r = cells[i][1];
      if (!onBoard(b, c, r)) return false;
      const v = b.occ[idx(b, c, r)];
      if (v !== 0 && v !== ignoreId + 1) return false;
    }
    return true;
  }

  function placeArrow(b, arrow) {
    const cells = cellsOf(arrow);
    for (let i = 0; i < cells.length; i++) b.occ[idx(b, cells[i][0], cells[i][1])] = arrow.id + 1;
    b.arrows.set(arrow.id, arrow);
  }
  function removeArrow(b, arrow) {
    const cells = cellsOf(arrow);
    for (let i = 0; i < cells.length; i++) b.occ[idx(b, cells[i][0], cells[i][1])] = 0;
    b.arrows.delete(arrow.id);
  }

  // ───────── Elle tasarlanmış seviyeler ─────────
  // Üreteç iyi tahta üretiyor ama ÖĞRETEMİYOR: hangi fikrin hangi sırada
  // tanıtılacağı bir tasarım kararı, rastgeleliğin işi değil. İlk
  // seviyeler bu yüzden elle yazılıyor. Tanımlı seviye yoksa startLevel
  // üretece düşer — ikisi bir arada yaşar, biri diğerinin yerine geçmez.
  //
  // BİÇİM: cells = MUTLAK hücreler, UÇTAN kuyruğa, ardışık komşu.
  //        dir   = ucun DIŞARI baktığı yön (0 yukarı, 1 sağ, 2 aşağı, 3 sol).
  // Kanonik şekle çevirme ve şekil kütüphanesine kaydetme otomatik;
  // seviye yazarken kütüphaneyi düşünmek gerekmiyor.
  const HAND_SHAPE_IDS = {};
  function canonicalOffsets(cells, dir) {
    const inv = (4 - dir) % 4;           // dünya → kanonik (rotate'in tersi)
    const t = cells[0];
    const out = new Array(cells.length);
    for (let i = 0; i < cells.length; i++) {
      out[i] = rotate(cells[i][0] - t[0], cells[i][1] - t[1], inv);
    }
    return out;
  }
  // Aynı silüet iki kez kaydedilmesin diye imzayla eşleniyor.
  function ensureHandShape(cells, dir) {
    const off = canonicalOffsets(cells, dir);
    const sig = off.map(o => o[0] + ',' + o[1]).join(';');
    if (HAND_SHAPE_IDS[sig]) return HAND_SHAPE_IDS[sig];
    const id = 'hand' + Object.keys(HAND_SHAPE_IDS).length;
    const shape = { id, offsets: off };
    SHAPES.push(shape);
    SHAPE_BY_ID[id] = shape;
    HAND_SHAPE_IDS[sig] = id;
    return id;
  }
  function buildHandLevel(def) {
    const b = makeBoard(def.cols, def.rows);
    for (let i = 0; i < def.snakes.length; i++) {
      const s = def.snakes[i];
      placeArrow(b, { id: i, shapeId: ensureHandShape(s.cells, s.dir),
                      dir: s.dir, anchor: s.cells[0] });
    }
    return b;
  }

  // ───────── Çıkış testi — YILAN MODELİ ─────────
  // Ok kendi izini takip ederek çıkar: uç yönü boyunca ilerler, gövde
  // ucun geçtiği yoldan gelir ve giderken düzleşir. Dolayısıyla ÇIKIŞI
  // BELİRLEYEN TEK ŞEY UCUN ÖNÜNDEKİ YOL. Gövdenin yanındaki hücreler
  // konu dışıdır — gövde oraya hiç uğramaz.
  //
  // ÖNCEKİ MODEL (rijit öteleme) BUYDU VE YANLIŞTI: okun bütün hücreleri
  // birlikte ötelenirdi, yani kıvrımlı bir okun KUYRUĞUNUN önündeki bir
  // engel de onu durdururdu. Oyuncu ucun önünü boş görüp dokunuyor, oyun
  // "engel var" diyordu. Ölçüm: kıvrımlı okların %26.5'i (416/416 vakanın
  // tamamı kıvrımlı) haksız yere reddediliyordu. Düz oklarda iki model
  // aynı sonucu verir, o yüzden hata yalnızca kıvrımlılarda görünüyordu.
  //
  // Monotonluk bu modelde de geçerli (4202 kontrol, 0 ihlal): bir ok
  // gidince yol yalnızca açılır. Kilitsiz eşzamanlı çıkış hâlâ güvenli.
  function canExit(b, arrow) {
    const cells = cellsOf(arrow);
    const own = arrow.id + 1;
    const dx = DIRS[arrow.dir][0], dy = DIRS[arrow.dir][1];
    let c = cells[0][0], r = cells[0][1];
    for (;;) {
      c += dx; r += dy;
      if (!onBoard(b, c, r)) return true;     // tahtayı terk etti
      const v = b.occ[idx(b, c, r)];
      if (v !== 0 && v !== own) return false; // yolda başka ok var
    }
  }

  function freeArrows(b) {
    const out = [];
    b.arrows.forEach(a => { if (canExit(b, a)) out.push(a); });
    return out;
  }

  // Bloke bir okun ÖNÜNDEKİ ilk engeli döndürür.
  // Ceza vermek yeterli değil; oyuncu NEDEN olmadığını görmeli. Bu
  // fonksiyon "öğreten geri bildirim"in veri tarafı.
  // canExit ile AYNI yolu yürümek zorunda — yoksa oyun bir oku reddedip
  // sonra alakasız bir oku suçlar. Yılan modelinde yol ucun önündeki
  // ışın olduğu için suçlu tek bir oktur (dizi, çağıranla uyum için).
  function blockersOf(b, arrow) {
    const cells = cellsOf(arrow);
    const own = arrow.id + 1;
    const dx = DIRS[arrow.dir][0], dy = DIRS[arrow.dir][1];
    let c = cells[0][0], r = cells[0][1];
    for (;;) {
      c += dx; r += dy;
      if (!onBoard(b, c, r)) return [];
      const v = b.occ[idx(b, c, r)];
      if (v !== 0 && v !== own) return [v - 1];
    }
  }

  // Bağımlılık grafiğinin kenar sayısı: kaç ok, kaç oku kilitliyor.
  // Tahtanın BULMACA olup olmadığının ölçüsü — doluluk ve komşuluk değil.
  // Sıfır kenar = her ok serbest = tek turda biten seviye.
  function depEdgeCount(b) {
    let e = 0;
    b.arrows.forEach(a => { e += blockersOf(b, a).length; });
    return e;
  }

  // ───────── Çözülebilirlik ─────────
  // Monotonluk sayesinde arama GEREKMEZ: serbest olan herhangi bir oku
  // çıkarmak asla çözümü bozamaz. Tahtanın kopyası üzerinde çalışır.
  function cloneBoard(b) {
    const n = makeBoard(b.cols, b.rows);
    n.occ.set(b.occ);
    b.arrows.forEach((a, id) => n.arrows.set(id, a));
    return n;
  }
  function solveOrder(b) {
    const work = cloneBoard(b);
    const order = [];
    let guard = work.arrows.size + 5;
    while (work.arrows.size > 0 && guard-- > 0) {
      const free = freeArrows(work);
      if (!free.length) return null;          // kilitlendi
      order.push(free[0].id);
      removeArrow(work, free[0]);
    }
    return work.arrows.size === 0 ? order : null;
  }
  function isSolvable(b) { return solveOrder(b) !== null; }

  // ───────── Ölçümler ─────────
  // Zorluk EĞRİSİ burada tanımlanmıyor (o bir tasarım kararı); yalnızca
  // eğrinin ifade edilebileceği kadranlar ölçülüyor.
  function metrics(b) {
    let filled = 0;
    for (let i = 0; i < b.occ.length; i++) if (b.occ[i]) filled++;
    let sweepSum = 0, onlyOneBlocker = 0;
    b.arrows.forEach(a => {
      const cells = cellsOf(a);
      const dx = DIRS[a.dir][0], dy = DIRS[a.dir][1];
      let steps = 0;
      for (let k = 1; k <= b.cols + b.rows + 2; k++) {
        let allOff = true;
        for (let i = 0; i < cells.length; i++) {
          if (onBoard(b, cells[i][0] + dx * k, cells[i][1] + dy * k)) { allOff = false; break; }
        }
        if (allOff) break;
        steps = k;
      }
      sweepSum += steps;
      // "Tek engelli" ok: görsel olarak en aldatıcı durum.
      const blockers = new Set();
      for (let k = 1; k <= b.cols + b.rows + 2; k++) {
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i][0] + dx * k, r = cells[i][1] + dy * k;
          if (!onBoard(b, c, r)) continue;
          const v = b.occ[idx(b, c, r)];
          if (v !== 0 && v !== a.id + 1) blockers.add(v - 1);
        }
      }
      if (blockers.size === 1) onlyOneBlocker++;
    });
    const n = b.arrows.size || 1;
    return {
      arrows: b.arrows.size,
      free: freeArrows(b).length,
      density: +(filled / (b.cols * b.rows)).toFixed(3),
      avgSweep: +(sweepSum / n).toFixed(2),
      singleBlocker: onlyOneBlocker,
    };
  }

  // ───────── Üreteç A: ileri yerleştirme + doğrulama ─────────
  // Rastgele yerleştir, sonra çözülebilirliği sına. Doğrulama monotonluk
  // sayesinde ucuz olduğu için bu pratikte uygulanabilir.
  // Dağılımı doğaldır (ters inşa gibi yerleştirme sırasına yanlı değil).
  function generateForward(opts, seed) {
    const cols = opts.cols, rows = opts.rows, target = opts.arrows;
    const pool = (opts.shapes || STRAIGHT_IDS);
    const rng = phRng(seed >>> 0 || 1);
    const maxTries = opts.maxTries || 40;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const b = makeBoard(cols, rows);
      let id = 0, placeFails = 0;
      while (b.arrows.size < target && placeFails < 400) {
        const shapeId = pool[phRngInt(rng, pool.length)];
        const dir = phRngInt(rng, 4);
        const anchor = [phRngInt(rng, cols), phRngInt(rng, rows)];
        const cand = { id, shapeId, dir, anchor };
        if (!cellsFree(b, cellsOf(cand), -1)) { placeFails++; continue; }
        placeArrow(b, cand); id++; placeFails = 0;
      }
      if (b.arrows.size < target) continue;
      if (isSolvable(b)) return { board: b, seed: seed >>> 0, attempts: attempt + 1, method: 'forward' };
    }
    return null;
  }

  // ───────── Üreteç B: ters inşa ─────────
  // Çözüm sırasının TERSİNE yerleştirir: her yeni ok, o an tahtada
  // bulunanlara göre çıkış yolu AÇIK olacak şekilde konur. Çözülemeyen
  // bir seviye üretilemez — inşa gereği. Doğrulama gerektirmez.
  function generateReverse(opts, seed) {
    const cols = opts.cols, rows = opts.rows, target = opts.arrows;
    const pool = (opts.shapes || STRAIGHT_IDS);
    const rng = phRng(seed >>> 0 || 1);
    const b = makeBoard(cols, rows);
    let id = 0, fails = 0;
    while (b.arrows.size < target && fails < 3000) {
      const shapeId = pool[phRngInt(rng, pool.length)];
      const dir = phRngInt(rng, 4);
      const anchor = [phRngInt(rng, cols), phRngInt(rng, rows)];
      const cand = { id, shapeId, dir, anchor };
      if (!cellsFree(b, cellsOf(cand), -1)) { fails++; continue; }
      placeArrow(b, cand);
      // Yerleştirdikten SONRA kendi çıkış yolu açık olmalı; değilse geri al.
      if (!canExit(b, cand)) { removeArrow(b, cand); fails++; continue; }
      id++; fails = 0;
    }
    if (b.arrows.size < target) return null;
    return { board: b, seed: seed >>> 0, attempts: 1, method: 'reverse' };
  }

  // ───────── Üreteç C: çıkış ışınından içeri sokma ─────────
  // GEÇERLİLİK KOŞULU ÜRETEÇ B İLE BİREBİR AYNI: bir ok yerleştirildiği
  // anda kendi çıkış ışını açık olmak zorunda. Bu sağlandığında ters
  // yerleştirme sırası geçerli bir çözümdür. Oyun kuralına EKLEME YOK —
  // canExit'in kendisi çağrılıyor, ikinci bir "çıkabilir mi" tanımı
  // türetilmiyor (iki tanımın ayrışması bu oyunda bir kez yaşandı).
  //
  // Fark YALNIZCA ARAMADA. Üreteç B rastgele bir anchor seçip "çıkışı
  // açık mı?" diye soruyor; tahta doldukça cevap neredeyse hep hayır
  // oluyor ve 3000 başarısız denemeden sonra pes ediyor. Ölçüm (20 tohum):
  //   26x24 / 85 ok  → B: %50 başarı, 112 ms   C: %80 başarı, 14 ms
  //   22x22 / 66 ok  → B: %75 başarı,  56 ms   C: %95 başarı,  5.6 ms
  // Bu üreteç ışını ZATEN açık olan uç hücrelerini doğrudan hesaplıyor ve
  // yalnızca onlardan seçiyor: geçerli konum deneme-yanılmayla değil,
  // inşa yoluyla bulunuyor.
  //
  // validTips maliyeti O(hücre), yerleştirme başına bir kez.
  // Bir hücrenin ışını açıksa, o yöndeki ilk dolu hücreye kadar hepsi boş
  // demektir; dolayısıyla sütun/satır başına tek tarama yetiyor.
  function validTips(b, dir, mask) {
    const cols = b.cols, rows = b.rows, occ = b.occ, out = [];
    const ok = (c, r) => !mask || mask[r * cols + c];
    if (dir === 0 || dir === 2) {                    // yukarı / aşağı
      for (let c = 0; c < cols; c++) {
        let first = rows, last = -1;
        for (let r = 0; r < rows; r++) if (occ[r * cols + c]) { if (r < first) first = r; last = r; }
        if (dir === 0) { for (let r = 0; r < first; r++) if (ok(c, r)) out.push([c, r, first - r]); }
        else           { for (let r = last + 1; r < rows; r++) if (ok(c, r)) out.push([c, r, r - last]); }
      }
    } else {                                          // sağ / sol
      for (let r = 0; r < rows; r++) {
        let first = cols, last = -1;
        for (let c = 0; c < cols; c++) if (occ[r * cols + c]) { if (c < first) first = c; last = c; }
        if (dir === 3) { for (let c = 0; c < first; c++) if (ok(c, r)) out.push([c, r, first - c]); }
        else           { for (let c = last + 1; c < cols; c++) if (ok(c, r)) out.push([c, r, c - last]); }
      }
    }
    return out;   // [c, r, derinlik] — derinlik = ucun önündeki boş hücre sayısı
  }

  function cellsInMask(b, cells, mask) {
    if (!mask) return true;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i][0], r = cells[i][1];
      if (!onBoard(b, c, r) || !mask[r * b.cols + c]) return false;
    }
    return true;
  }

  // opts: { cols, rows, arrows, shapes, mask?, fill?, preferLong?, deepSpan? }
  //   mask  — hangi hücreler doldurulabilir (Uint8Array). Yoksa tüm tahta.
  //   fill  — hedef sayı yerine "sığdığı kadar" doldur.
  // NOT: mask ve fill şu an startLevel tarafından KULLANILMIYOR; silüet
  // seviyeleri ayrı bir iş. Burada duruyorlar çünkü aramanın doğal
  // parametreleri ve sonradan eklemek üreteci yeniden yazmak olurdu.
  function generateSlide(opts, seed) {
    const cols = opts.cols, rows = opts.rows;
    const pool = (opts.shapes && opts.shapes.length) ? opts.shapes : STRAIGHT_IDS;
    const mask = opts.mask || null;
    const target = opts.fill ? Infinity : opts.arrows;
    const rng = phRng(seed >>> 0 || 1);
    // preferLong: uzun şekli önce dene. Yoğunluğu artırır AMA alanı erken
    // tükettiği için hedef SAYIYI tutturmayı zorlaştırır — ölçüldü:
    // 22x22'de %100 → %20. O yüzden yalnızca doldurma modunda açık.
    const preferLong = opts.preferLong !== undefined ? opts.preferLong : !!opts.fill;
    const deepSpan = opts.deepSpan !== undefined ? opts.deepSpan : 0.35;
    // Doldurma modunda tahta dolduğunda ARDIŞIK başarısızlıklar birikir ve
    // sonrası tamamen israftır: ölçüldü, staleMax 200 ile 15 arasında çıktı
    // BİREBİR aynı (kavisli %63, uzunluk 4.8, komşuluk 2.74, yoğunluk .76)
    // ama süre 86.7 ms'den 7.5 ms'ye iniyor. Hedef modunda ise yüksek sınır
    // isabet oranını taşıyor (istenen sayıya ulaşamayınca vazgeçmesin), o
    // yüzden orada 200 kalıyor.
    const staleMax = opts.staleMax !== undefined ? opts.staleMax
                   : (opts.fill ? 25 : 200);

    const b = makeBoard(cols, rows);
    let id = 0, stale = 0;

    while (b.arrows.size < target && stale < staleMax) {
      const dirs = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) { const j = phRngInt(rng, i + 1); const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t; }
      let placed = false;

      for (let d = 0; d < 4 && !placed; d++) {
        const dir = dirs[d];
        const tips = validTips(b, dir, mask);
        if (!tips.length) continue;
        // İÇTEN DIŞA paketleme: önce DERİN uçlar. Erken oklar merkeze
        // gömülür, geç gelenler kabuğu doldurur. Yoğunluğu bu sıra belirliyor.
        tips.sort((x, y) => y[2] - x[2]);
        const span = Math.max(1, Math.ceil(tips.length * deepSpan));

        for (let t = 0; t < 14 && !placed; t++) {
          const tip = tips[phRngInt(rng, span)];
          const tries = [];
          for (let k = 0; k < 6; k++) tries.push(pool[phRngInt(rng, pool.length)]);
          if (preferLong) {
            tries.sort((x, y) => SHAPE_BY_ID[y].offsets.length - SHAPE_BY_ID[x].offsets.length);
          }
          for (let k = 0; k < tries.length; k++) {
            const cand = { id, shapeId: tries[k], dir, anchor: [tip[0], tip[1]] };
            const cells = cellsOf(cand);
            if (!cellsInMask(b, cells, mask)) continue;
            if (!cellsFree(b, cells, -1)) continue;
            placeArrow(b, cand);
            // Işın açıktı, yani buranın geçmesi bekleniyor. Yine de
            // SÖZLEŞME burada: geçerliliği canExit tanımlar, biz değil.
            if (!canExit(b, cand)) { removeArrow(b, cand); continue; }
            id++; placed = true; break;
          }
        }
      }
      if (placed) stale = 0; else stale++;
    }

    if (!opts.fill && b.arrows.size < opts.arrows) return null;
    if (b.arrows.size === 0) return null;
    return { board: b, seed: seed >>> 0, attempts: 1, method: 'slide' };
  }



  // ═══════════════════════════════════════════════════════════════
  //  ARROW — RENDER + GİRDİ (Faz 2)
  // ═══════════════════════════════════════════════════════════════
  // OKUNABİLİRLİK BU OYUNUN ÇEKİRDEĞİ.
  // Faz 1'de kanıtlandı ki bu modelde sıralama tuzağı yok: zorluk
  // tamamen ALGISAL — hangi okun serbest olduğunu görebilmek. Dolayısıyla
  // render bir sunum katmanı değil, oyunun kendisidir.
  //
  // İki şeyi birbirinden ayırıyorum:
  //   • Tahtayı OKUNABİLİR kılmak  → yapılıyor (yön ve yol net)
  //   • Serbest okları İŞARETLEMEK → YAPILMIYOR; bulmacayı yok ederdi
  //
  // Ayrışmanın tekniği: her ok İKİ kez çizilir — altta geniş koyu bir
  // "kılıf", üstte dar açık bir "çekirdek". Kılıf komşu okların arasına
  // koyu bir sınır koyar, böylece yan yana duran oklar tek bir lekeye
  // dönüşmez. Referansta bu yok ve yoğun tahtalar okunmuyor.

  const CELL = 1;              // SVG kullanıcı birimi = 1 hücre

  // ───────── Ok materyali: ENERJİ KANALI ─────────
  // DESIGN_SYSTEM §13'e eklenen yedinci arketip. Ok ne sıvı, ne katı blok,
  // ne kart, ne küre, ne taş, ne parşömen — ışık TAŞIYAN bir cam kanal.
  // Dört eşmerkezli çizgi, hepsi aynı yolda, dıştan içe:
  //
  //   glow    çok geniş + çok saydam → kanalın etrafına sızan ışık
  //   casing  koyu ve dar            → komşu okların arasındaki SINIR
  //   core    derin menekşe          → cam gövdenin kendisi
  //   inner   parlak ve çok ince     → içeride akan enerjinin ta kendisi
  //
  // Glow için SVG filtresi (feGaussianBlur) KULLANILMIYOR: yoğun tahtada
  // 19 ok × filtre, §19'un "çok sayıda elemanda filter yok" kuralını
  // çiğner. Geniş ve saydam bir çizgi aynı okumayı bedavaya veriyor.
  // Gölge kanalın ALTINA düşer: tek anahtar ışık sol üstte (§4), yani
  // gölge sağ-aşağı kayar. Filtre değil, ötelenmiş saydam bir çizgi —
  // aynı derinlik okuması, filtre maliyeti olmadan.
  const SHADE_W = 0.40;
  const SHADE_OFF = 0.07;          // hücre biriminde kayma
  const GLOW_W = 0.46;
  const CASING_W = 0.28;   // koyu kılıf — komşu oklar arasındaki sınır
  const CORE_W = 0.18;     // cam gövde
  const INNER_W = 0.065;   // içerideki enerji filamenti
  const HIT_W = 0.86;      // dokunma hedefi çizgiden BAĞIMSIZ kalın
  // Çıkışta hep birlikte kayması gereken katmanlar. Tek yerde tanımlı:
  // yeni bir katman eklenip burası unutulursa ok parçalanarak çıkar.
  const STROKE_SEL = '.ar-shade, .ar-glow, .ar-casing, .ar-core, .ar-inner, .ar-hit';
  // Uç üçgeni: t ileri uzunluk, b taban (gövdenin İÇİNDE), w yarı genişlik.
  // Uzun + dar = keskin. Taban negatif ki uç gövdeden kopuk durmasın.
  const HEAD = { t: 0.48, b: -0.04, w: 0.165 };
  // İki fazlı yılan çıkışı için 260ms yetmiyordu: düzleşme fazı algı
  // eşiğinin altında kalıyordu. 420ms ile faz 1 ~230ms sürüyor.
  // SPARK_MS buna DAYANIYOR — bu yüzden ondan önce tanımlı olmak zorunda.
  const EXIT_MS = 420;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Çıkış efektleri. Kıvılcım sayısı ok başına BİLEREK küçük: çıkış sık
  // bir olay (tahta başına ~19) ve §17 sık olaylarda düşük sayı şart
  // koşuyor — burada amaç patlama değil, kalkışın bıraktığı enerji.
  const WAKE_W = CORE_W * 0.85;
  const SPARK_N = 3;
  const SPARK_R = 0.055;
  const SPARK_REACH = 0.5;        // hücre biriminde saçılma mesafesi
  const SPARK_STAGGER_MS = 45;
  // Kıvılcım ömrü çıkıştan KISA: ok gittikten sonra ortalıkta kalan
  // parıltı, olayın bittiğini geciktirir.
  const SPARK_MS = Math.round(EXIT_MS * 0.62);
  // Kamera. 3x, en yoğun tahtada (8x10) bir hücreyi rahat dokunulur
  // kılmaya yetiyor; fazlası tahtanın bağlamını kaybettiriyor.
  const CAM_MAX_SCALE = 3;
  // Tahta parlaması: alt sınır bilerek çok düşük — seviyenin başında
  // efekt fark edilmemeli, sonuna doğru belirginleşmeli.
  const FLASH_MIN = 0.05, FLASH_MAX = 0.3, FLASH_MS = 380;
  // Can, oyunun tamamı boyunca taşınır — seviye başına yenilenmez.
  // Yalnızca reklamla devam veya seviyeyi yeniden başlatma doldurur.
  const MAX_LIVES = 3;
  // Sürüklemeyi dokunuştan ayıran eşik: bu kadar px'ten fazla kaydıysa
  // parmak "kamerayı taşıdı" demektir, ok seçmedi.
  const DRAG_SLOP_PX = 6;

  // ───────── Sahne ─────────
  // Atmosfer BİLEREK kısık: göz sürekli tahtayı tarıyor ve arka planda
  // hareket eden her şey o taramaya rakip oluyor (DESIGN_SYSTEM §2.5,
  // "kısıtlama premium sinyalidir"). Water Sort nefes alan bir sahne
  // ister, Arrow ise okunmayı ister — aynı kelimeler, farklı cümle.
  const ATMO = { stars: 20, beams: 2, motes: 7, skyPct: 46 };
  // Enerji pusu: tahtanın İÇİNDE asılı yatay ışık akıntıları.
  // Her bant {üst %, yükseklik, renk, süre, tepe opaklık}.
  const HAZE_BANDS = [
    { top: 12, h: 34, tint: 'rgba(150,120,235,.30)', dur: 13000, peak: .55 },
    { top: 46, h: 42, tint: 'rgba(96,120,225,.24)',  dur: 17000, peak: .42 },
    { top: 74, h: 30, tint: 'rgba(168,85,247,.22)',  dur: 21000, peak: .38 },
  ];
  const HAZE_BLUR_PX = 26;

  let container, wrapEl, svgEl, arrowsEl, atmoEl, hudEl, camera, flashEl;
  let board, level, cleared, levelTotal, advanceT;
  let lives, dead;                 // dead: canlar bitti, girdi kapalı
  let diaEl, gridBtn, zoomSlider, gridOn, hintCooling;
  const GRID_KEY = 'ph_arrow_grid';
  const HINT_MS = 2200;            // ipucu vurgusunun ömrü
  const HINT_COOLDOWN_MS = 600;    // reklam sonrası çift tetikleme koruması
  let tapX = 0, tapY = 0;          // son pointerdown konumu (sürükleme ayrımı)

  function injectCSS() {
    injectStyle('css-arrow', `
      /* Kalpler menekşe (görseldeki gibi, §3.4 kırmızısı değil): can bu
         oyunun ENERJİSİ, kanallarla aynı ailede. .ph-heart tüketenin
         token'ından renk aldığı için burada override ediliyor. */
      #game-container.ar-scene{ --ar-ink:#E8ECFF;
        --ph-heart-on:var(--ph-jewel-1-highlight);
        --ph-heart-glow:var(--ph-jewel-1-glow); }

      .ar-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:var(--ph-space-4);width:100%;max-width:430px;min-height:100%;
        margin:0 auto;padding:var(--ph-space-4) var(--ph-space-3)}
      .ar-wrap *{box-sizing:border-box}

      /* ════════ HUD ════════
         Barlar tahtanın KARDEŞİ (üstünde değil) — "HUD tahtayı örtmez"
         kuralı akış düzeniyle garanti. Hepsi cam + neon, minimal.
         Ortak reçeteler (.ph-capsule, .ph-lives) korunuyor; buradakiler
         yalnızca Arrow'a özgü yerleşim ve iki yeni kontrol tipi. */

      /* ── Üst bar: kimlik + elmas + ayarlar ── */
      .ar-topbar{display:flex;align-items:center;justify-content:space-between;
        width:100%;padding:0 var(--ph-space-1)}
      .ar-brand{display:flex;flex-direction:column;line-height:1;
        font:800 20px/1 var(--ph-font-display);letter-spacing:.14em;
        color:var(--ar-ink);
        text-shadow:0 0 18px var(--ph-jewel-1-glow), 0 2px 6px rgba(4,6,22,.6)}
      .ar-brand-sup{font:700 8px/1 'Fraunces',serif;letter-spacing:.34em;
        color:rgba(200,188,255,.55);margin-bottom:3px}
      .ar-topbar-right{display:flex;align-items:center;gap:var(--ph-space-2)}

      /* Elmas: ortak başarı-altını (§3.4) — sayaç, dekor değil, o yüzden
         izinli. Cam hap içinde. */
      .ar-diamonds{display:inline-flex;align-items:center;gap:6px;
        padding:6px 12px;border-radius:var(--ph-radius-full);
        background:var(--ph-bg-glass);border:1px solid rgba(180,165,255,.2);
        box-shadow:inset 0 1px 0 rgba(220,215,255,.15)}
      .ar-dia-ico{color:var(--ph-success);font-size:12px;
        filter:drop-shadow(0 0 6px var(--ph-success-glow))}
      .ar-dia-num{font:800 14px/1 var(--ph-font-display);
        font-variant-numeric:var(--ph-variant-numeral);color:var(--ar-ink)}

      /* İkon butonu — dişli. Soft-solid değil, sahneye ait cam. */
      .ar-icon-btn{width:38px;height:38px;border-radius:var(--ph-radius-full);
        display:grid;place-items:center;font-size:17px;cursor:pointer;
        background:var(--ph-bg-glass);border:1px solid rgba(180,165,255,.2);
        box-shadow:inset 0 1px 0 rgba(220,215,255,.15);
        color:var(--ar-ink);transition:transform var(--ph-duration-micro) ease-out,
                                       background var(--ph-duration-fast) var(--ph-ease-standard)}
      .ar-icon-btn:active{transform:scale(.92);background:rgba(126,110,220,.28)}

      /* ── Durum: seviye kapsülü + kalpler ── */
      .ar-status{display:flex;flex-direction:column;align-items:center;
        gap:var(--ph-space-2)}
      .ar-hud-sep{opacity:.45}

      /* ── Alt aksiyon barı ── */
      .ar-actionbar{display:flex;align-items:center;gap:var(--ph-space-2);
        width:100%;max-width:400px}
      .ar-action{display:inline-flex;align-items:center;gap:7px;
        padding:9px 14px;border-radius:var(--ph-radius-full);cursor:pointer;
        font:700 13px/1 var(--ph-font-display);color:var(--ar-ink);
        background:var(--ph-bg-glass);border:1px solid rgba(180,165,255,.2);
        box-shadow:inset 0 1px 0 rgba(220,215,255,.15);
        transition:transform var(--ph-duration-micro) ease-out,
                   background var(--ph-duration-fast) var(--ph-ease-standard)}
      .ar-action:active{transform:scale(.94)}
      .ar-action-ico{font-size:15px}
      /* Reklam rozeti: ipucunun bedelinin reklam olduğunu söyler */
      .ar-action-tag{font-size:11px;opacity:.7;margin-left:-2px}
      /* İpucu vurgulu (dikkat çeken tek aksiyon): hafif altın kenar */
      .ar-action-hint{border-color:rgba(251,191,36,.3)}
      /* Izgara açık/kapalı durumu — basılı düğme mantığı */
      .ar-action-grid{opacity:.55}
      .ar-action-grid.on{opacity:1;border-color:rgba(158,140,232,.45);
        background:rgba(126,110,220,.22)}

      /* Zoom: aksiyon barının esneyen ortası */
      .ar-zoom{flex:1;display:flex;align-items:center;gap:8px;
        padding:0 var(--ph-space-2)}
      .ar-zoom-btn{width:28px;height:28px;flex:none;border-radius:var(--ph-radius-full);
        display:grid;place-items:center;cursor:pointer;
        font:700 17px/1 var(--ph-font-display);color:var(--ar-ink);
        background:var(--ph-bg-glass);border:1px solid rgba(180,165,255,.2)}
      .ar-zoom-btn:active{transform:scale(.9)}
      /* Slider: gövdesi cam oluk, dolgusu neon menekşe, başparmak parlayan orb */
      .ar-zoom-slider{flex:1;-webkit-appearance:none;appearance:none;height:4px;
        border-radius:var(--ph-radius-full);cursor:pointer;
        background:linear-gradient(90deg,var(--ph-jewel-1-base),var(--ph-jewel-1-highlight));
        outline:none}
      .ar-zoom-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
        width:16px;height:16px;border-radius:50%;background:var(--ph-jewel-1-highlight);
        box-shadow:0 0 10px var(--ph-jewel-1-glow), 0 1px 3px rgba(4,6,22,.6);
        border:2px solid #fff2}
      .ar-zoom-slider::-moz-range-thumb{width:16px;height:16px;border:none;
        border-radius:50%;background:var(--ph-jewel-1-highlight);
        box-shadow:0 0 10px var(--ph-jewel-1-glow)}

      /* ── Ayarlar popover: küçük cam panel, dişlinin altında ── */
      .ar-pop{position:absolute;top:52px;right:var(--ph-space-3);z-index:5;
        display:flex;flex-direction:column;gap:2px;padding:6px;min-width:168px;
        border-radius:var(--ph-radius-md);
        background:rgba(28,24,68,.86);backdrop-filter:blur(10px);
        border:1px solid rgba(180,165,255,.24);
        box-shadow:var(--ph-shadow-3), inset 0 1px 0 rgba(205,195,255,.18);
        animation:arPop var(--ph-duration-fast) var(--ph-ease-decel)}
      @keyframes arPop{from{opacity:0;transform:translateY(-6px) scale(.96)}
        to{opacity:1;transform:none}}
      .ar-pop-item{display:flex;align-items:center;gap:10px;padding:10px 12px;
        border-radius:var(--ph-radius-sm);cursor:pointer;text-align:left;
        font:600 13px/1 var(--ph-font-body,'Inter'),sans-serif;color:var(--ar-ink);
        background:transparent;border:none;transition:background var(--ph-duration-micro) ease}
      .ar-pop-item:active{background:rgba(126,110,220,.3)}

      /* Tahta ortak cam kaidedir (.ph-dais): gradyan, kenar, anahtar ışık
         ve gölge oradan gelir. Burada yalnızca Arrow'a özgü olan kalıyor —
         ölçü, dolgu ve dokunma davranışı. Reçeteyi kopyalamak §24'ün
         ikinci adımının ihlali olurdu. */
      /* flex:1 + min-height:0 ŞART. Tahta kolon flex'in çocuğu; yer
         yetmediğinde flex-shrink onu içeriğinin ALTINA sıkıştırır ve
         overflow:hidden farkı sessizce keser. Ölçüldü: 5x6 tahta 430px
         yükseklikte 396px'ten 218px'e büzüldü, SVG'nin 192 pikseli
         tahtanın altında kaldı — en alttaki ok gövdesinin ortasından
         kırpıldı, oyuncu ona dokunamadı ve hangi okun serbest olduğunu
         okuyamadı. min-height:0 büzülmeyi meşrulaştırır, aşağıdaki
         height:100% zinciri de SVG'yi büzülen kutuya SIĞDIRIR. */
      .ar-board{position:relative;width:100%;max-width:400px;
        display:flex;flex-direction:column;flex:1 1 auto;min-height:0;
        padding:var(--ph-space-3);overflow:hidden;touch-action:manipulation}
      /* Kamera iki katman ister: viewport KIRPAR, stage ÖLÇEKLENİR.
         SVG'ye hiç dokunulmaz — yakınlaştırma yeniden çizim değil, tek
         bir CSS transform. touch-action:none şart: yoksa tarayıcı pinch/
         pan hareketlerini sayfa kaydırması sanıp bize hiç vermez. */
      .ar-viewport{position:relative;z-index:1;overflow:hidden;
        flex:1;min-height:0;width:100%;
        border-radius:var(--ph-radius-md);touch-action:none}
      .ar-stage{transform-origin:0 0;will-change:transform;width:100%;height:100%}
      /* height:100% + preserveAspectRatio'nun varsayılanı (xMidYMid meet):
         viewBox HER İKİ eksende kutuya sığar ve ortalanır. height:auto
         idi; o, yüksekliği yalnızca GENİŞLİKTEN türetiyordu, yani boyu
         eninden büyük her tahtada (5x6, 5x7, 9x11 — hepsi öyle) içerik
         kutuyu taşıyordu. Artık taşma yok: dar kalan eksende tahta
         küçülür, tamamı görünür. Kenar boşluğu referansın da yaptığı şey.
         Kamera etkilenmiyor: ölçek 1'de öteleme zaten 0. */
      .ar-svg{display:block;width:100%;height:100%;overflow:visible}

      /* Kenarlarda koyulaşan iç gölge: tahta ÇUKUR bir yüzey gibi okunur,
         oklar da onun üstünde durur. Katman hissinin ucuz ve tek elemanlı
         kaynağı — ok başına bir şey eklemiyor.
         Kameranın üstünde (z-index 2) ama tıklamayı yutmuyor. */
      .ar-viewport::after{content:'';position:absolute;inset:0;z-index:2;
        pointer-events:none;border-radius:inherit;
        box-shadow:inset 0 0 var(--ph-space-10) var(--ph-space-4) rgba(4,6,22,.55)}
      .ar-grid{stroke:rgba(180,170,255,.07);stroke-width:.02;fill:none;
        transition:opacity var(--ph-duration-fast) var(--ph-ease-standard)}
      /* Izgara kapalı: çizgiler solar ama DOM'da kalır (yeniden kurmak
         yerine görünürlük — toggle anında ve ucuz). */
      .ar-svg.ar-nogrid .ar-grid{opacity:0}

      /* ── Tahta parlaması ──
         Başarılı çıkışta tahtanın bir an aydınlanması. Seviye başına ~19
         kez tetiklendiği için ÇOK kısık olmak zorunda: §2.5 "kısıtlama
         premium sinyalidir" ve her hamlede bağıran bir efekt yorar.
         Şiddet ilerlemeyle ölçekleniyor (sesin perdesiyle aynı mantık) —
         ilk çıkışlarda neredeyse görünmez, tahta boşalırken belirginleşir.
         Tek eleman + yalnızca opacity animasyonu: compositor dostu (§10.6). */
      .ar-flash{position:absolute;inset:0;z-index:3;pointer-events:none;
        border-radius:inherit;opacity:0;
        background:radial-gradient(ellipse 70% 55% at 50% 50%,
                   var(--ar-flash-tint) 0%, transparent 72%)}
      .ar-flash.on{animation:arFlash var(--ar-flash-dur) var(--ph-ease-decel)}
      @keyframes arFlash{
        0%{opacity:0} 22%{opacity:var(--ar-flash-peak)} 100%{opacity:0}
      }

      /* ── Enerji pusu ──
         Arrow'un kendi mekânı. Water Sort'un ZEMİN sisinin kopyası DEĞİL:
         orada sis tüplerin dibine çöker ve "bir yüzeydeler" der; burada
         ışık tahtanın içinde yatay akıntılar hâlinde asılı durur ve "bu
         oklar enerji taşıyor" der. Aynı gece, farklı hava — components.css
         bu katmanın oyuna özgü kalmasını şart koşuyor.
         z-index:0 ile okların (z-index:1) ALTINDA kalır: dekor hiçbir
         zaman oynanışı gölgelemez. */
      .ar-haze{position:absolute;inset:0;z-index:0;pointer-events:none;
        overflow:hidden;border-radius:inherit}
      .ar-haze i{position:absolute;left:-20%;width:140%;
        background:linear-gradient(90deg,transparent,var(--ar-tint),transparent);
        filter:blur(${HAZE_BLUR_PX}px);opacity:0;
        animation:arHaze var(--ar-dur) ease-in-out infinite}
      @keyframes arHaze{
        0%,100%{opacity:0;transform:translate3d(-6%,0,0)}
        50%{opacity:var(--ar-peak);transform:translate3d(6%,0,0)}
      }

      /* ── OK: ENERJİ KANALI ──
         Renkler §3.5 mücevher paletinin 1. hüzmesinden (Violet) geliyor,
         elle seçilmiş hex DEĞİL. Altın (jewel-5) bilerek kullanılmadı:
         §3.4 altını yalnızca ödül/başarıya ayırıyor ve "kıtlığı anlamını
         veriyor" diyor — dekoratif altın o anlamı harcardı. */
      .ar-arrow{cursor:pointer}
      .ar-arrow path{fill:none;stroke-linecap:round;stroke-linejoin:round}

      /* Gölge: kanalın tahtanın ÜSTÜNDE durduğunu söyleyen tek şey.
         Kaymanın yönü sol-üst anahtar ışıktan geliyor (§4) — her oyunda
         aynı yön, yoksa "aynı evren" hissi dağılır. */
      .ar-shade{stroke:rgba(4,6,22,.6);stroke-width:${SHADE_W};
        transform:translate(${SHADE_OFF}px,${SHADE_OFF}px)}
      .ar-glow{stroke:var(--ph-jewel-1-glow);stroke-width:${GLOW_W};opacity:.5}
      /* Kılıf sahnenin en koyu gecesine yakın: komşu iki ok arasında
         gerçek bir boşluk varmış gibi okunsun. */
      .ar-casing{stroke:var(--ph-night-0);stroke-width:${CASING_W}}
      .ar-core{stroke:var(--ph-jewel-1-shadow);stroke-width:${CORE_W};
        transition:stroke var(--ph-duration-fast) var(--ph-ease-standard)}
      .ar-inner{stroke:var(--ph-jewel-1-highlight);stroke-width:${INNER_W};
        transition:stroke var(--ph-duration-fast) var(--ph-ease-standard)}
      /* Özgüllük NOTU: yukarıdaki ".ar-arrow path" (0,1,1) blanket kuralı
         fill:none veriyor ve düz ".ar-head" (0,1,0) onu yenemez — uç
         dolgusuz kalır, geriye yalnızca koyu kontur kalırdı. Bu yüzden
         seçici bilerek ".ar-arrow .ar-head" (0,2,0). */
      .ar-arrow .ar-head{fill:var(--ph-jewel-1-highlight);
        stroke:var(--ph-night-0);stroke-width:.05;
        transition:fill var(--ph-duration-fast) var(--ph-ease-standard)}
      /* Görünmez ve kalın dokunma hedefi: ince çizgiye dokunmak zordur.
         pointer-events:stroke ile yalnızca çizgi boyunca yakalar. */
      .ar-hit{stroke:transparent;stroke-width:${HIT_W};pointer-events:stroke}

      /* Seçili/basılı ok — kanaldaki enerji bir an yükselir (§15 "tepki
         bir kare içinde").
         HOVER BİLEREK YOK: bu oyun dokunmatik önce ve hover dokunmatikte
         yalancı bir durum — parmak çekildikten sonra da takılı kalır.
         Sinyal yalnızca gerçek temasla geliyor. */
      .ar-arrow:active .ar-shade{opacity:.35}     /* yüzeye yaklaşır */
      .ar-arrow:active .ar-glow{opacity:1}
      .ar-arrow:active .ar-core{stroke:var(--ph-jewel-1-base)}
      .ar-arrow:active .ar-inner{stroke:#fff}

      /* ── ÇIKIŞ (yılan) ──
         Ok kendi rayında kayar: gövde stroke-dashoffset ile, uç öteleme
         ile — ikisi aynı zamanlamada, dolayısıyla senkron.

         NEDEN İKİ FAZ: gövde 2-4 birim, uzantı ~14 birim. Tek geçişte
         düzleşme mesafenin ilk ~%12'sinde biter ve hızlanan bir eğriyle
         o kısım göz açıp kapayıncaya kadar geçer — yani yılan etkisi
         GÖRÜNMEZ. Ölçtüm, gerçekten öyleydi.
           Faz 1 (%55): tam olarak GÖVDE BOYU kadar ilerler. Bu, kuyruğun
             kıvrımdan düz uzantıya geçmesine yeten en küçük mesafe;
             sonunda ok kesin olarak düzdür. Sakin eğri — izlenecek an bu.
           Faz 2 (%45): kalan yolu hızlanarak alır ve tahtayı terk eder.
         Kısacası: önce kıvrımından sıyrılır, sonra fırlar. */
      @keyframes arSnakeOut{
        0%{stroke-dashoffset:var(--ar-o0);animation-timing-function:var(--ph-ease-standard)}
        55%{stroke-dashoffset:var(--ar-o1);animation-timing-function:cubic-bezier(.55,0,1,.45)}
        100%{stroke-dashoffset:0}
      }
      @keyframes arHeadOut{
        0%{transform:translate(0,0);animation-timing-function:var(--ph-ease-standard)}
        55%{transform:var(--ar-h1);animation-timing-function:cubic-bezier(.55,0,1,.45)}
        100%{transform:var(--ar-h2)}
      }
      .ar-arrow.exiting{pointer-events:none;
        animation:arFadeOut ${EXIT_MS}ms var(--ph-ease-standard) forwards}
      @keyframes arFadeOut{0%,62%{opacity:1}100%{opacity:0}}
      .ar-arrow.exiting .ar-glow,
      .ar-arrow.exiting .ar-casing,
      .ar-arrow.exiting .ar-core,
      .ar-arrow.exiting .ar-inner,
      .ar-arrow.exiting .ar-hit{
        animation:arSnakeOut ${EXIT_MS}ms linear forwards}
      .ar-arrow.exiting .ar-head{
        animation:arHeadOut ${EXIT_MS}ms linear forwards}

      /* ── Enerji izi ──
         Okun boşalttığı ray parçası. Gövdeden İNCE ve saydam: iz okun
         kendisiyle yarışırsa hangisinin gerçek ok olduğu karışır. */
      .ar-wake{fill:none;stroke:var(--ph-jewel-1-glow);stroke-width:${WAKE_W};
        stroke-linecap:round;pointer-events:none;
        animation:arWake ${EXIT_MS}ms var(--ph-ease-decel) forwards}
      @keyframes arWake{
        0%{stroke-dasharray:var(--ar-w0);stroke-dashoffset:var(--ar-wo0);opacity:.85}
        70%{opacity:.35}
        100%{stroke-dasharray:var(--ar-w1);stroke-dashoffset:var(--ar-wo1);opacity:0}
      }

      /* ── Kıvılcım ──
         Kalkışta açığa çıkan enerji. Küçük ve kısa: okunabilirliği
         bozmamasının tek garantisi boyutunun ve ömrünün küçüklüğü. */
      .ar-spark{fill:var(--ph-jewel-1-highlight);pointer-events:none;
        animation:arSpark ${SPARK_MS}ms var(--ph-ease-decel) forwards}
      @keyframes arSpark{
        0%{transform:translate(0,0) scale(1);opacity:.9}
        100%{transform:translate(var(--ar-sx),var(--ar-sy)) scale(.2);opacity:0}
      }

      /* ── İPUCU ──
         Reklamla açılan vurgu: serbest bir ok nefes alır gibi parlar ve
         bir enerji halkası kalkışını "önizler". Süreli — çözümü ekranda
         bırakmaz, yalnızca gözü doğru yere çeker. */
      @keyframes arHintPulse{
        0%,100%{stroke:var(--ph-jewel-1-highlight)}
        50%{stroke:#fff}
      }
      .ar-arrow.hinted .ar-inner{animation:arHintPulse 700ms var(--ph-ease-standard) infinite}
      .ar-arrow.hinted .ar-glow{opacity:.95}
      .ar-hint-ring{fill:none;stroke:var(--ph-jewel-1-highlight);stroke-width:.05;
        pointer-events:none;transform-origin:center;transform-box:fill-box;
        animation:arHintRing 900ms var(--ph-ease-decel) infinite}
      @keyframes arHintRing{
        0%{r:.15;opacity:.9;stroke-width:.08}
        100%{r:.85;opacity:0;stroke-width:.01}
      }

      /* ── BLOKE ──
         Dokunulan ok sarsılır VE yolu kızıl çizilir VE engelleyen ok
         parlar. Üçü birlikte "neden olmadığını" anlatır; yalnızca
         sarsıntı "olmadı" der, sebebini söylemez. */
      @keyframes arNudge{
        0%,100%{transform:translate(0,0)}
        25%{transform:translate(var(--anx,0),var(--any,0))}
        60%{transform:translate(calc(var(--anx,0)*-.5),calc(var(--any,0)*-.5))}
      }
      /* Hata rengi §3.4'ün semantik kırmızısı (jewel-3 / --ph-error).
         Kanal kızıla döner: enerji "bozuldu", ok yer değiştirmedi. */
      .ar-arrow.blocked{animation:arNudge 320ms var(--ph-ease-standard)}
      .ar-arrow.blocked .ar-glow{stroke:var(--ph-error-glow);opacity:.9}
      .ar-arrow.blocked .ar-core{stroke:var(--ph-jewel-3-shadow)}
      .ar-arrow.blocked .ar-inner{stroke:var(--ph-jewel-3-highlight)}
      .ar-arrow.blocked .ar-head{fill:var(--ph-jewel-3-highlight)}

      /* Suçlu ok: kendi rengini korur ama bir an kızıla çalar — "engel
         benim" der, "ben de bozuldum" demez. */
      @keyframes arCulprit{
        0%,100%{stroke:var(--ph-jewel-1-highlight)}
        30%,60%{stroke:var(--ph-jewel-3-highlight)}
      }
      .ar-arrow.culprit .ar-inner{animation:arCulprit 620ms var(--ph-ease-standard)}

      /* Engellenen yol: dokunulan oktan ilk engele kadar kızıl şerit */
      .ar-blockpath{fill:none;stroke:var(--ph-error-glow);stroke-width:${CORE_W * 0.7};
        stroke-linecap:round;stroke-dasharray:.28 .22;pointer-events:none;
        animation:arBlockFade 620ms var(--ph-ease-standard) forwards}
      @keyframes arBlockFade{0%{opacity:.95}100%{opacity:0}}

      @media (prefers-reduced-motion: reduce){
        .ar-arrow.exiting,
        .ar-arrow.exiting .ar-glow,
        .ar-arrow.exiting .ar-casing,
        .ar-arrow.exiting .ar-core,
        .ar-arrow.exiting .ar-inner,
        .ar-arrow.exiting .ar-hit,
        .ar-arrow.exiting .ar-head{transition-duration:var(--ph-duration-micro);
          transition-delay:0ms}
        .ar-arrow.blocked,.ar-arrow.culprit .ar-core{animation:none}
        /* Pus dursun ama KALSIN: atmosfer dekoratif, hareketi ise gereksiz.
           Sabit düşük opaklıkta bırakmak sahneyi boşaltmadan sakinleştirir. */
        .ar-haze i{animation:none;opacity:var(--ar-peak);transform:none}
        /* İz ve kıvılcım tamamen kalkar: ikisi de saf süs, hiçbir oyun
           bilgisi taşımıyorlar. Çıkışın kendisi (ok gitti) duruyor. */
        .ar-wake,.ar-spark{display:none}
        /* İpucu bilgi taşıyor (hangi ok serbest) — kalır ama titremez:
           sabit parlaklık + halka yok. */
        .ar-arrow.hinted .ar-inner{animation:none;stroke:#fff}
        .ar-hint-ring{display:none}
        /* Parlama kalıyor ama animasyonsuz: tek kare bile "oldu" der ve
           bu bilgi taşıyor — süsleme değil, geri bildirim. */
        .ar-flash.on{animation-duration:var(--ph-duration-micro)}
        .ar-blockpath{animation-duration:var(--ph-duration-fast)}
      }
    `);
  }

  // ───────── SVG yardımcıları ─────────
  function el(name, attrs) {
    const n = document.createElementNS(SVG_NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // Okun gövde yolu: hücre merkezlerinden geçen polyline.
  // Şekil hücreleri komşuluk sırasına göre zaten sıralı tanımlandığı
  // için (uçtan kuyruğa) doğrudan kullanılabiliyor.
  function bodyPath(arrow) {
    const cells = cellsOf(arrow);
    return cells.map((c, i) => (i ? 'L' : 'M') + (c[0] + .5) + ' ' + (c[1] + .5)).join(' ');
  }

  // ───────── Yılan çıkış rayı ─────────
  // Okun ÜZERİNDE kayacağı ray: uçtan ileri doğru uzanan düz uzantı +
  // okun kendi gövdesi. Uzantı önce gelir, yani ray şöyle sıralanır:
  //
  //   [0 .. EXT]            uçtan ileri, tahtayı terk edecek düz kısım
  //   [EXT .. EXT+gövde]    okun şu anki gövdesi (uçtan kuyruğa)
  //
  // Ok bu ray üzerinde bir "pencere"dir: uzunluğu gövde kadar olan bir
  // kesit. Pencereyi EXT'ten 0'a kaydırınca ok ileri gider VE kuyruk
  // kıvrımdan düz uzantıya geçtikçe kendiliğinden DÜZLEŞİR — istenen
  // yılan hissi bundan çıkıyor, ayrı bir düzleştirme hesabı yok.
  //
  // Teknik: stroke-dasharray ile pencere, stroke-dashoffset ile kaydırma.
  // Tek bir CSS geçişi; JS her karede hesap yapmıyor.
  function trackPath(arrow, ext) {
    const cells = cellsOf(arrow);
    const d = DIRS[arrow.dir];
    const tx = cells[0][0] + .5, ty = cells[0][1] + .5;
    let p = 'M' + (tx + d[0] * ext) + ' ' + (ty + d[1] * ext);
    for (let i = 0; i < cells.length; i++) {
      p += 'L' + (cells[i][0] + .5) + ' ' + (cells[i][1] + .5);
    }
    return p;
  }

  // Uç üçgeni: uç hücrenin merkezinden yöne doğru.
  function headPath(arrow) {
    const c = cellsOf(arrow)[0];
    const d = DIRS[arrow.dir];
    const cx = c[0] + .5, cy = c[1] + .5;
    const t = HEAD.t, b = HEAD.b, w = HEAD.w;
    const px = -d[1], py = d[0];            // dike vektör
    return 'M' + (cx + d[0] * t) + ' ' + (cy + d[1] * t) +
           'L' + (cx + px * w + d[0] * b) + ' ' + (cy + py * w + d[1] * b) +
           'L' + (cx - px * w + d[0] * b) + ' ' + (cy - py * w + d[1] * b) + 'Z';
  }

  // Katman sırası boyama sırasıdır: dıştaki önce çizilir, içteki üstünü
  // örter. Uç en sonda çünkü yönü o anlatıyor ve hiçbir şey onu kesmemeli.
  function drawArrow(arrow) {
    const g = el('g', { class: 'ar-arrow', 'data-id': arrow.id });
    const d = bodyPath(arrow);
    ['ar-shade', 'ar-glow', 'ar-casing', 'ar-core', 'ar-inner'].forEach(cls => {
      g.appendChild(el('path', { class: cls, d }));
    });
    g.appendChild(el('path', { class: 'ar-head', d: headPath(arrow) }));
    g.appendChild(el('path', { class: 'ar-hit', d }));
    return g;
  }

  function buildBoard() {
    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', '0 0 ' + board.cols + ' ' + board.rows);
    // Izgara: yalnızca hafif bir referans
    const grid = el('g', { class: 'ar-grid' });
    for (let c = 0; c <= board.cols; c++) {
      grid.appendChild(el('line', { x1: c, y1: 0, x2: c, y2: board.rows }));
    }
    for (let r = 0; r <= board.rows; r++) {
      grid.appendChild(el('line', { x1: 0, y1: r, x2: board.cols, y2: r }));
    }
    svgEl.appendChild(grid);
    arrowsEl = el('g', { class: 'ar-arrows' });
    svgEl.appendChild(arrowsEl);
    board.arrows.forEach(a => arrowsEl.appendChild(drawArrow(a)));
    updateHud();
    // Tahta oranı seviyeden seviyeye değişiyor (5x6 → 8x10), yani
    // viewport'un yüksekliği de değişiyor. Kamera bunu bilmezse eski
    // ölçüye göre clamp yapar. Ayrıca yeni seviyeye yakınlaşmış hâlde
    // başlamak istemiyoruz — oyuncu önce tahtanın tamamını görmeli.
    if (camera) { camera.reset(); camera.remeasure(); }
  }

  function updateHud() {
    if (!hudEl) return;
    // .ph-capsule-num ortak sayı stilini taşır (tabular-nums dahil):
    // sayaç düşerken çevresindeki metin kaymaz.
    hudEl.innerHTML =
      'Seviye <span class="ph-capsule-num">' + level + '</span>' +
      '<span class="ar-hud-sep">·</span>' +
      'Kalan <span class="ph-capsule-num">' + board.arrows.size + '</span>';
  }

  // ───────── Etkileşim ─────────
  // ÇIKIŞ SIRASINDA GİRDİ KİLİDİ YOK — bilinçli.
  // Oyuncu arka arkaya birkaç serbest oka basabilir; çıkış animasyonları
  // üst üste binebilir. Bu güvenli, çünkü Faz 1'de kanıtlanan MONOTONLUK
  // tam olarak bunu garanti ediyor: bir ok gidince doluluk yalnızca azalır,
  // dolayısıyla serbest bir ok başka bir okun çıkışıyla asla bloke hale
  // gelemez. Kilit koymak dokunuşları sessizce yutar (ok başına 280ms) ve
  // oyun tepkisiz hissettirir. Buraya tekrar kilit EKLEME.
  // Kamera sürüklemesi tıklama SAYILMAZ. Tarayıcı sürükleme sonrası da
  // click üretir; basma noktasıyla bırakma noktası arasındaki mesafe
  // eşiği aşmışsa parmak kamerayı taşımıştır, ok seçmemiştir.
  // Ayrı bir "hareket etti" bayrağı tutmaya gerek yok: click olayının
  // kendi koordinatları bırakma noktasını zaten veriyor.
  function onPointerDown(e) { tapX = e.clientX; tapY = e.clientY; }

  function onBoardTap(e) {
    if (cleared || dead) return;
    if (Math.hypot(e.clientX - tapX, e.clientY - tapY) > DRAG_SLOP_PX) return;
    const g = e.target.closest('.ar-arrow');
    if (!g) return;
    // Zaten çıkmakta olan ok Map'ten silinmiştir → ikinci dokunuş düşer.
    const arrow = board.arrows.get(+g.dataset.id);
    if (!arrow) return;
    if (canExit(board, arrow)) doExit(arrow, g);
    else doBlocked(arrow, g);
  }

  // ── Kıvılcımlar ──
  // Okun kalkış anında açığa çıkan enerji. DOM partikülü (phParticleBurst)
  // yerine SVG içinde duruyorlar, iki sebeple: (1) tahtanın koordinat
  // sisteminde kalıyorlar, yani zoom uygulandığında da doğru yerdeler;
  // (2) çıkış sık bir olay — tahta başına ~19 kez — ve §17 sık olayları
  // "ambient/micro" katmanında, düşük sayıda tutmayı şart koşuyor.
  // Bu yüzden ok başına yalnızca SPARK_N tane var, patlama değil.
  function emitSparks(g, arrow, d) {
    const c = cellsOf(arrow)[0];
    const cx = c[0] + .5, cy = c[1] + .5;
    const px = -d[1], py = d[0];                  // dike vektör
    for (let i = 0; i < SPARK_N; i++) {
      // Yayılım dikeyde simetrik, ilerleme yönünde hafif öne doğru:
      // kıvılcım okun peşinden değil, kalkış noktasından saçılır.
      const spread = (i - (SPARK_N - 1) / 2) / SPARK_N;
      const s = el('circle', {
        class: 'ar-spark', r: SPARK_R, cx, cy,
      });
      s.style.setProperty('--ar-sx', (d[0] * SPARK_REACH + px * spread) + 'px');
      s.style.setProperty('--ar-sy', (d[1] * SPARK_REACH + py * spread) + 'px');
      s.style.animationDelay = (i * SPARK_STAGGER_MS) + 'ms';
      g.appendChild(s);
    }
  }

  function doExit(arrow, g) {
    const d = DIRS[arrow.dir];
    const bodyLen = cellsOf(arrow).length - 1 || 0.001;   // hücre merkezleri arası
    // Uzantı gövde boyunu DA içermeli: hareket bittiğinde kuyruk uçtan
    // (ext - bodyLen) kadar ileridedir ve bu mesafe tahtayı aşmalı.
    // Uzun yılanlarda (10 hücre) sabit cols+rows yetmiyordu — kuyruk
    // tahtanın içinde kalıp bir anda yok oluyordu.
    const ext = board.cols + board.rows + bodyLen;
    removeArrow(board, arrow);
    // Sayaç animasyonu değil MODELİ takip eder: dokunuş anında düşer.
    updateHud();

    // ── Gövde: kendi rayında kayar ve kıvrım düz uzantıya geçtikçe düzleşir
    const track = trackPath(arrow, ext);

    // ── Enerji izi ──
    // Okun BOŞALTTIĞI ray parçası. Kuyruk ilerledikçe bu bölge büyür,
    // yani iz gerçekten okun ARDINDAN uzar — sabit bir hayalet değil.
    // Ray koordinatlarında: [kuyruk, başlangıç-kuyruğu] aralığı.
    // Başta uzunluk 0, sonda ext. Hem dasharray hem dashoffset animasyonlu
    // (ikisi de aynı uzunlukta liste olduğu için CSS ara değer üretebiliyor).
    const wake = el('path', { class: 'ar-wake', d: track });
    wake.style.setProperty('--ar-w0', '0 ' + (ext + bodyLen + 1));
    wake.style.setProperty('--ar-w1', ext + ' ' + (ext + bodyLen + 1));
    wake.style.setProperty('--ar-wo0', -(ext + bodyLen));
    wake.style.setProperty('--ar-wo1', -bodyLen);
    g.insertBefore(wake, g.firstChild);          // okun ARKASINDA kalsın
    const strokes = g.querySelectorAll(STROKE_SEL);
    strokes.forEach(p => {
      p.setAttribute('d', track);
      // Pencere = gövde boyu; ray boyu kadar boşluk peşinden gelir ki
      // rayın geri kalanı hiç çizilmesin.
      p.style.strokeDasharray = bodyLen + ' ' + (ext + bodyLen + 1);
    });
    // Faz sınırı GÖVDE BOYU kadar ilerleme: kuyruğun kıvrımdan çıkması
    // için gereken en küçük mesafe. Bu noktada ok kesin olarak düzdür.
    g.style.setProperty('--ar-o0', -ext);
    g.style.setProperty('--ar-o1', -(ext - bodyLen));
    g.style.setProperty('--ar-h1',
      'translate(' + (d[0] * bodyLen) + 'px,' + (d[1] * bodyLen) + 'px)');
    g.style.setProperty('--ar-h2',
      'translate(' + (d[0] * ext) + 'px,' + (d[1] * ext) + 'px)');
    g.classList.add('exiting');
    emitSparks(g, arrow, d);

    // Perde kalan ok azaldıkça yükselir: bulmaca çözüldükçe SESLE de
    // ilerleme duyulur. Sentezle bedava (2048'in birleşme rampasıyla
    // aynı mantık).
    // Ilerleme seviye BASINDAKI ok sayisina gore: tahta bosaldikca perde yukselir
    const progress = levelTotal ? 1 - board.arrows.size / levelTotal : 0;
    GameAudio.play('swipe', { pitch: 1 + progress * 0.5 });
    GameAudio.haptic('micro');
    // Işık da sesle aynı rampayı izler: iki duyu aynı şeyi söylüyor.
    flashBoard('var(--ph-jewel-1-glow)', progress);

    setTimeout(() => {
      g.remove();
      // !cleared ŞART: eşzamanlı çıkışlarda birden fazla zamanlayıcı
      // tahtayı boş görebilir; guard olmadan onCleared iki kez çalışır.
      if (!cleared && board.arrows.size === 0) onCleared();
    }, EXIT_MS + 20);
  }

  function doBlocked(arrow, g) {
    const d = DIRS[arrow.dir];
    g.style.setProperty('--anx', (d[0] * 0.22) + 'px');
    g.style.setProperty('--any', (d[1] * 0.22) + 'px');
    g.classList.remove('blocked'); void g.getBBox();
    g.classList.add('blocked');
    setTimeout(() => g.classList.remove('blocked'), 360);

    // ENGELLEYENİ göster — cezanın öğretici olmasını sağlayan şey bu
    const culprits = blockersOf(board, arrow);
    culprits.forEach(id => {
      const cg = arrowsEl.querySelector('.ar-arrow[data-id="' + id + '"]');
      if (!cg) return;
      cg.classList.remove('culprit'); void cg.getBBox();
      cg.classList.add('culprit');
      setTimeout(() => cg.classList.remove('culprit'), 660);
    });

    // Dokunulan oktan ilk engele kadar kızıl şerit
    const cells = cellsOf(arrow);
    const head = cells[0];
    let k = 1;
    for (; k <= board.cols + board.rows; k++) {
      const c = head[0] + d[0] * k, r = head[1] + d[1] * k;
      if (!onBoard(board, c, r)) break;
      if (board.occ[r * board.cols + c] !== 0) break;
    }
    const bp = el('path', {
      class: 'ar-blockpath',
      d: 'M' + (head[0] + .5) + ' ' + (head[1] + .5) +
         'L' + (head[0] + .5 + d[0] * k) + ' ' + (head[1] + .5 + d[1] * k),
    });
    arrowsEl.appendChild(bp);
    setTimeout(() => bp.remove(), 660);

    // Hatada parlama TAM güçte ve kızıl: başarı rampasının aksine bu
    // olayın "şiddeti" yok, her yanlış hamle aynı ağırlıkta.
    flashBoard('var(--ph-error-glow)', 1, FLASH_MS * 0.7);
    GameAudio.play('error');
    GameAudio.haptic('error');
    // Ceza YALNIZCA bloke bir oka dokunmakta. Doğru hamle asla can
    // götürmez — yoksa oyuncu denemekten korkar ve oyun "akış" değil
    // "stres" olur.
    lives.lose();
  }

  // ───────── Canlar tükendi ─────────
  // Yeni bir modal YOK: platformun paylaşımlı Game Over kutusu iki
  // kancayla kullanılıyor.
  //   onContinue → reklam/elmas/Plus devamı geldiğinde çalışır. Tahta KORUNUR,
//                oyuncu kaldığı yerden sürer.
  //   onRestart  → "Tekrar Oyna". O ANKİ seviyeyi yeniden kurar; oyunu
  //                1. seviyeye almaz.
  // İkisi de canı tam doldurur — "reklam izlenmezse yeniden başlatma ile
  // devam edilir" kuralı bu iki yolun da oyuncuyu oyunda tutması demek.
  function onLivesEmpty() {
    dead = true;
    // Skor alanı YOK: bu oyunun ölçüsü seviye, skor değil. Alan isteğe
    // bağlı olduğu için uydurma bir sayı göndermek yerine boş bırakılıyor.
    gameEvent('game_ended', { gameId: 'arrowPuzzle', result: 'lost' });
    GameAudio.play('lose');
    GameAudio.haptic('error');
    showGameOver(false, 'Enerji Tükendi',
      'Kanallar söndü. Reklam izleyip devam edebilir ya da seviyeyi baştan alabilirsin.', {
      accent: 'var(--ph-jewel-1-shadow)',
      accentLight: 'var(--ph-jewel-1-highlight)',
      accentGlow: 'var(--ph-jewel-1-glow)',
      mark: '✧',
      stats: [
        { label: 'Seviye', value: level },
        { label: 'En İyi', value: phHighScore('arrowPuzzle') || '—' },
      ],
      onContinue: () => {
        lives.reset();
        dead = false;
        GameAudio.play('star');
        GameAudio.haptic('soft');
      },
      onRestart: () => {
        lives.reset();
        dead = false;
        startLevel();               // aynı seviye, temiz tahta
      },
    });
  }

  function onCleared() {
    cleared = true;
    // !cleared koruması çağıranda: eşzamanlı çıkışlarda bu fonksiyon birden
    // fazla kez çalışırsa olay da birden fazla kez yayınlanırdı.
    gameEvent('game_ended', { gameId: 'arrowPuzzle', result: 'won' });
    GameAudio.play('premium');
    GameAudio.haptic('win');
    phAtmosphereFlare(atmoEl, 2.2, 700);
    const r = svgEl.getBoundingClientRect();
    phParticleBurst(document.body, r.left + r.width / 2, r.top + r.height / 2,
      'var(--ph-accent)', 14);
    // Faz 3: seviye ilerleyişi, can, reklam akışı.
    advanceT = setTimeout(() => { advanceT = null; level++; startLevel(); }, 900);
  }

  // ───────── Seviye ─────────
  // GEÇİCİ eğri: zorluk değerleri henüz karara bağlanmadı (bkz. plan).
  // Buradaki sayılar Faz 3'te tasarım kararıyla değişecek.
  //
  // AMA bir şey karara bağlı: ok sayısı tahtanın KAPASİTESİNİ aşamaz.
  // Eski eğri ham sayı istiyordu (t=40'ta 32 ok) ve tahtayı aşıyordu:
  // 8x10 = 80 hücre, ok başına ortalama 3.5 hücre → ~112 hücre gerekir.
  // Üreteç null dönüyor, startLevel null.board'da çakılıyordu — oyun
  // 19. seviyede çöküyor, 30'dan sonra hiç açılmıyordu.
  // Ölçüm (24 deneme/kademe): %75 doluluğa kadar üretim 22-24/24,
  // %85'te 18-20/24. Tavan .85 — kalan başarısızlıkları startLevel'ın
  // yeniden deneme döngüsü topluyor.
  // ───────── Elle tasarlanmış açılış ─────────
  // Referansın öğretme sırası: seviye 1 yalnızca "dokun, gitsin"i öğretir
  // (çoğu yılan serbest), sonra sıralamanın önemi gelir ve zincir adım
  // adım derinleşir. Tahta 9x11 — referansın ~10x12'sine yakın ama küçük
  // telefonlarda hücre 32px kalıyor (10x12'de 29.7px'e düşüyordu).
  // Derinlik = greedy çözümün DALGA sayısı; her dalgada o an serbest olan
  // her şey çıkar. Ölçüm Node koşumunda doğrulanıyor.
  const HAND_LEVELS = {
    // Derinlik 2 · 7 yılan · başta 5 serbest
    // Öğretilen: dokununca ok kendi izinden çıkar; iki yılan başkası
    // gitmeden gidemez (E'yi B, F'yi A kilitliyor).
    1: { cols: 9, rows: 11, snakes: [
      { dir: 0, cells: [[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[2,9],[3,9],[4,9]] },
      { dir: 0, cells: [[3,2],[3,3],[3,4],[3,5],[3,6],[3,7]] },
      { dir: 0, cells: [[5,1],[5,2],[5,3],[5,4]] },
      { dir: 0, cells: [[7,2],[7,3],[7,4],[7,5],[7,6]] },
      { dir: 3, cells: [[5,6],[6,6],[6,7]] },
      { dir: 3, cells: [[3,8],[4,8],[5,8]] },
      { dir: 1, cells: [[8,9],[7,9],[6,9]] },
    ]},
    // Derinlik 3 · 8 yılan · yoğunluk 0.39
    // Öğretilen: ZİNCİR. Bir sütunda üç uzun yılan sırayla birbirini
    // bekliyor. Yılanlar kısalmıyor — zorluk sıradan geliyor, seyreklikten
    // değil (referansın tahtaları da hep dolu).
    2: { cols: 9, rows: 11, snakes: [
      { dir: 0, cells: [[2,1],[2,2],[2,3],[3,3],[4,3]] },
      { dir: 0, cells: [[2,5],[2,6],[2,7],[3,7],[4,7]] },
      { dir: 0, cells: [[2,9],[2,10],[3,10],[4,10],[5,10]] },
      { dir: 0, cells: [[6,1],[6,2],[6,3],[6,4],[6,5],[7,5],[8,5]] },
      { dir: 1, cells: [[8,7],[7,7],[6,7],[6,8]] },
      { dir: 3, cells: [[0,8],[1,8],[1,7],[1,6]] },
      { dir: 0, cells: [[5,0],[5,1],[5,2],[4,2],[3,2]] },
      { dir: 1, cells: [[8,9],[7,9],[6,9],[6,10]] },
    ]},
    // Derinlik 4 · 11 yılan · yoğunluk 0.43
    // Öğretilen: zincir uzuyor VE ikinci bir eksende de var. Oyuncu artık
    // "hangisi serbest"i değil "hangi sırayla"yı okumak zorunda.
    3: { cols: 9, rows: 11, snakes: [
      { dir: 0, cells: [[3,0],[3,1],[4,1],[5,1]] },
      { dir: 0, cells: [[3,3],[3,4],[4,4],[5,4]] },
      { dir: 0, cells: [[3,6],[3,7],[4,7],[5,7]] },
      { dir: 0, cells: [[3,9],[3,10],[4,10],[5,10]] },
      { dir: 1, cells: [[7,2],[6,2],[6,3],[6,4]] },
      { dir: 1, cells: [[7,5],[6,5],[6,6],[6,7]] },
      { dir: 0, cells: [[8,4],[8,5],[8,6],[8,7]] },
      { dir: 3, cells: [[1,2],[2,2],[2,3],[2,4]] },
      { dir: 3, cells: [[1,6],[2,6],[2,7],[2,8]] },
      { dir: 3, cells: [[1,9],[2,9],[2,10]] },
      { dir: 2, cells: [[7,9],[7,8],[6,8],[6,9]] },
    ]},
  };

  const MAX_FILL = 0.85;             // olculdu: pratik uretim siniri

  function paramsFor(n) {
    const t = Math.min(n, 40);
    // Uzun yılanlar açıldıkça tahta da büyümek zorunda: 10 hücrelik bir
    // şekil 5 genişliğinde bir tahtaya bazı yönlerde hiç sığmaz.
    const cols = 5 + Math.min(Math.floor(t / 6), 4);
    const rows = 6 + Math.min(Math.floor(t / 5), 5);
    const shapes = shapePool(n);
    // Ortalama HAVUZDAN geliyor, sabitten değil — kademe açılınca ok
    // başına hücre artar ve kapasite kendiliğinden düşer.
    const capacity = Math.floor(cols * rows * MAX_FILL / avgCells(shapes));
    return {
      cols, rows, shapes,
      arrows: Math.max(3, Math.min(4 + Math.floor(t * 0.7), capacity)),
    };
  }

  function startLevel() {
    cleared = false;
    // Tur = SEVİYE. init(), onCleared'ın ilerlemesi ve game-over'daki
    // onRestart — üçü de buradan geçiyor.
    gameEvent('game_started', { gameId: 'arrowPuzzle' });
    // Elle tasarlanmış seviye varsa o kazanır; yoksa üreteç devreye girer.
    const hand = HAND_LEVELS[level];
    if (hand) {
      board = buildHandLevel(hand);
      levelTotal = board.arrows.size;
      buildBoard();
      return;
    }
    const p = paramsFor(level);
    const seed = phHashSeed('arrow-' + level);
    // Yoğunluğun ölçülmüş sınırına yakın oynuyoruz, o yüzden tek deneme
    // yeterli değil. Her tur bir ok azaltıp yeniden dener; seyrek tahta
    // her zaman üretilebildiği için bu döngü kesin sonlanır.
    // BURAYA KORUMASIZ res.board YAZMA — çökmenin kaynağı oydu.
    // ───── KALİTE KAPISI ─────
    // Dolu ve iç içe geçmiş tahta, BULMACA demek değil: iki ok yan yana
    // durup birbirini hiç kilitlemeyebilir — kilitleyen tek şey ucun
    // önündeki ışın. Kapısız üretimde seviye 6'da 10 yılanın 10'u da
    // serbest çıkıyordu, bağımlılık grafiğinin SIFIR kenarı vardı; tek
    // turda biten bir "bulmaca". Eşik ok sayısının dörtte biri. Ölçüm
    // (sv 4-40): ortalama kenar 3.6 → 4.5, derinlik 2.27 → 2.51,
    // dejenere seviye 1 → 0; bedeli 13.9 → 17.0 ms (en kötü 42 ms,
    // seviye başına 1.4 deneme). n/3 eşiği en kötüyü 79 ms'ye çıkarıyor
    // ve kazancı küçük — denendi, alınmadı.
    const needEdges = Math.max(1, Math.ceil(p.arrows / 4));
    let res = null, best = null;
    for (let attempt = 0; attempt < 6 && !res; attempt++) {
    const sd = seed + attempt * 7919;
    let cand = null;
    for (let give = 0; give < 6 && !cand; give++) {
      const q = { ...p, arrows: Math.max(3, p.arrows - give) };
      // Önce Üreteç C, DOLDURMA modunda: hedef sayı yerine "sığdığı kadar"
      // paketler ve uzun şekli önce dener. Ölçüm (15 tohum, sv 4-40):
      //   kavisli ok  %51 → %69   ortalama uzunluk 3.8 → 5.3
      //   komşuluk   2.21 → 2.91  yoğunluk        0.58 → 0.77
      // Ok SAYISI değişmiyor (seviye başına ±1) çünkü tahta boyu zaten
      // sınırlıyor — yani zorluk eğrisi korunuyor, tahta yalnızca daha
      // dolu ve daha iç içe geçmiş oluyor.
      // DİKKAT: bu modda p.arrows kullanılmaz; sayı tahtadan DOĞAR.
      // Aşağıdaki yedekler onu hâlâ kullanıyor, o yüzden paramsFor duruyor.
      cand = generateSlide({ ...q, fill: true, preferLong: true }, sd + give)
          || generateSlide(q, sd + give)
          || generateReverse(q, sd + give)
          || generateForward(q, sd + give);
    }
      if (!cand) continue;
      if (!best) best = cand;                  // hiçbiri kapıyı geçmezse bu kullanılır
      if (depEdgeCount(cand.board) >= needEdges) res = cand;
    }
    res = res || best;
    if (!res) {   // olmamalı, ama oyun asla açılmamaktansa kolay tahta versin
      res = generateReverse({ ...p, arrows: 3, shapes: STRAIGHT_IDS }, seed);
    }
    board = res.board;
    levelTotal = board.arrows.size;
    buildBoard();
  }

  // Tahtayı bir an aydınlatır. p (0..1) ilerleme: efektin şiddeti buna
  // bağlı, yani aynı olay tahta boşaldıkça daha çok "duyuluyor".
  // Sınıf yeniden eklenmeden önce kaldırılıp reflow zorlanmalı, yoksa
  // ikinci çağrı hiçbir şey yapmaz (CSS animasyonları kendiliğinden
  // yeniden başlamaz — ui-kit'teki phGleam'de de aynı hile var).
  function flashBoard(tint, p, durMs) {
    if (!flashEl) return;
    flashEl.style.setProperty('--ar-flash-tint', tint);
    flashEl.style.setProperty('--ar-flash-peak', FLASH_MIN + (FLASH_MAX - FLASH_MIN) * p);
    flashEl.style.setProperty('--ar-flash-dur', (durMs || FLASH_MS) + 'ms');
    flashEl.classList.remove('on');
    void flashEl.offsetWidth;
    flashEl.classList.add('on');
  }

  // Pus bantları: negatif gecikme ile her biri döngünün farklı bir
  // yerinden başlar — hepsinin birlikte parlaması yapay görünür
  // (phAtmosphere'in yıldızlarında da aynı hile var).
  function buildHaze(host) {
    if (!host) return;
    HAZE_BANDS.forEach((b, i) => {
      const band = document.createElement('i');
      band.style.top = b.top + '%';
      band.style.height = b.h + '%';
      band.style.setProperty('--ar-tint', b.tint);
      band.style.setProperty('--ar-dur', b.dur + 'ms');
      band.style.setProperty('--ar-peak', b.peak);
      band.style.animationDelay = (-i * (b.dur / HAZE_BANDS.length)) + 'ms';
      host.appendChild(band);
    });
  }

  // ───────── HUD kontrolleri ─────────
  function wireControls() {
    // Zoom: butonlar oransal, slider mutlak. İkisi de kamerayı sürer;
    // kamera onChange ile slider'ı geri senkronlar (butonla değişince de).
    addEv(wrapEl.querySelector('[data-role="zoom-in"]'), 'click', () => camera.zoomBy(1.4));
    addEv(wrapEl.querySelector('[data-role="zoom-out"]'), 'click', () => camera.zoomBy(1 / 1.4));
    // silent=true: slider zaten değeri biliyor, kameranın ona geri
    // sinyal göndermesi titreme/döngü yaratır.
    addEv(zoomSlider, 'input', () => camera.setScale(parseFloat(zoomSlider.value), true));

    addEv(gridBtn, 'click', toggleGrid);
    addEv(wrapEl.querySelector('[data-role="hint"]'), 'click', requestHint);
    addEv(wrapEl.querySelector('[data-role="settings"]'), 'click', openSettings);
  }

  // Kamera hedef ölçeği değiştikçe (pinch/tekerlek/buton) slider'ı takip
  // ettir — kamera tek doğruluk kaynağı, slider onun görüntüsü.
  function syncZoomSlider(s) {
    if (zoomSlider) zoomSlider.value = s;
  }

  function updateDiamonds() {
    if (diaEl && typeof DiamondSystem !== 'undefined') {
      diaEl.textContent = DiamondSystem.get().toLocaleString();
    }
    // İpucu rozetindeki kalan reklam hakkı da HUD'ın parçası: elmas
    // değişince bütçe de değişmiş olabilir (ikisi aynı akışta harcanıyor).
    if (typeof AdBudget !== 'undefined') AdBudget.updateUI();
  }

  // ── Izgara aç/kapa ──
  // Tercih kalıcı: oyuncu bir kez kapattıysa her seviyede tekrar açmasın.
  function loadGridPref() {
    try { return localStorage.getItem(GRID_KEY) !== '0'; } catch (e) { return true; }
  }
  function applyGridPref() {
    if (gridBtn) {
      gridBtn.classList.toggle('on', gridOn);
      gridBtn.setAttribute('aria-pressed', gridOn ? 'true' : 'false');
    }
    if (svgEl) svgEl.classList.toggle('ar-nogrid', !gridOn);
  }
  function toggleGrid() {
    gridOn = !gridOn;
    try { localStorage.setItem(GRID_KEY, gridOn ? '1' : '0'); } catch (e) {}
    applyGridPref();
    GameAudio.play('tap');
    GameAudio.haptic('micro');
  }

  // ── İpucu (reklam VEYA elmas) ──
  // Vurgulanan ok, oyuncunun dokunabileceği (canExit true) gerçek bir
  // hamle: ipucu "nereye bakacağını" söyler, çözümü değil.
  //
  // Elmas alternatifi 2026-07-30'da eklendi. Öncesinde ipucunun TEK bedeli
  // reklamdı; günlük bütçe gelince bu "hakkın bittiyse ipucu da bitti"
  // demeye başlıyordu. Bedel geri almadan ucuz (10 < 15): ipucu daha az
  // kritik bir yardım, hamleyi geri almıyor, sadece gösteriyor.
  function requestHint() {
    if (dead || cleared || hintCooling) return;
    const free = freeArrows(board);
    if (!free.length) { showToast('✨ Şu an serbest ok yok'); return; }
    // Kabuk yoksa (test) doğrudan göster — akış kilitlenmesin.
    if (typeof offerRewardChoice !== 'function') { revealHint(); return; }
    offerRewardChoice({
      title: 'İpucu',
      adText: 'Reklam İzle → İpucu',
      gemCost: econ('HINT_DIAMONDS', 10),
      gemText: 'İpucu',
      onGrant: revealHint
    });
  }
  function revealHint() {
    hintCooling = true;
    setTimeout(() => { hintCooling = false; }, HINT_COOLDOWN_MS);
    const free = freeArrows(board);
    if (!free.length) return;
    // İlk serbest ok — deterministik ve sakin (rastgele parıltı değil).
    const arrow = free[0];
    const g = arrowsEl.querySelector('.ar-arrow[data-id="' + arrow.id + '"]');
    if (!g) return;
    g.classList.remove('hinted'); void g.getBBox();
    g.classList.add('hinted');
    updateDiamonds();                            // reklam ekonomisi HUD'a yansısın
    // Tahtanın kendi koordinatında bir enerji halkası — okun kalkışını
    // "önizler" gibi. SVG içinde olduğu için zoom'da da doğru yerde.
    const c = cellsOf(arrow)[0];
    const ring = el('circle', { class: 'ar-hint-ring',
      cx: c[0] + .5, cy: c[1] + .5, r: 0.1 });
    arrowsEl.appendChild(ring);
    GameAudio.play('star');
    GameAudio.haptic('soft');
    setTimeout(() => { g.classList.remove('hinted'); ring.remove(); }, HINT_MS);
  }

  // ── Ayarlar ──
  // Yeni bir tam-ekran modal DEĞİL: butona tutturulu küçük bir cam
  // popover. İçinde oyun-içi anlamlı iki ayar — ses ve menüye dönüş.
  function openSettings() {
    const existing = wrapEl.querySelector('.ar-pop');
    if (existing) { existing.remove(); return; }   // ikinci tık kapatır
    GameAudio.play('tap');
    const pop = document.createElement('div');
    pop.className = 'ar-pop';
    const label = () => GameAudio.muted
      ? '<span>🔇</span> Ses Kapalı' : '<span>🔊</span> Ses Açık';
    pop.innerHTML =
      '<button class="ar-pop-item" data-act="sound">' + label() + '</button>' +
      '<button class="ar-pop-item" data-act="exit"><span>←</span> Menüye Dön</button>';
    wrapEl.querySelector('[data-role="settings"]').after(pop);
    const soundBtn = pop.querySelector('[data-act="sound"]');
    addEv(soundBtn, 'click', () => {
      GameAudio.toggleMute();
      soundBtn.innerHTML = label();        // popover açık kalır, durum güncellenir
    });
    addEv(pop.querySelector('[data-act="exit"]'), 'click', () => {
      pop.remove();
      if (typeof exitGame === 'function') exitGame();
    });
  }

  // ───────── Yaşam döngüsü ─────────
  function init(c) {
    container = c;
    level = 1; cleared = false; dead = false;
    lives = phLives({ max: MAX_LIVES, onEmpty: onLivesEmpty });
    container.classList.add('ph-scene', 'ar-scene');
    injectCSS();
    atmoEl = phAtmosphere(container, ATMO);
    wrapEl = document.createElement('div');
    wrapEl.className = 'ar-wrap';
    // DÜZEN (mobil dikey — görselin yatay masaüstü kurgusu uyarlandı):
    //   üst bar   : ARROW kimliği · elmas + ayarlar
    //   durum     : Seviye kapsülü · kalpler
    //   tahta     : cam kaide (odak — hiçbir HUD katmanı üstüne binmez)
    //   alt bar   : İpucu · zoom slider · Izgara
    // Barlar tahtanın DIŞINDA (kardeşi), üstünde değil: "HUD asla tahtanın
    // önüne geçmeyecek" kuralı bununla yapısal olarak garanti — konum ya
    // da z-index hilesi değil, akış düzeni.
    wrapEl.innerHTML =
      '<div class="ar-topbar">' +
        '<div class="ar-brand"><span class="ar-brand-sup">SLYSWIPE</span>ARROW</div>' +
        '<div class="ar-topbar-right">' +
          '<div class="ar-diamonds" data-role="dia-wrap">' +
            '<span class="ar-dia-ico">◆</span>' +
            '<span class="ar-dia-num" data-role="dia">0</span>' +
          '</div>' +
          '<button class="ar-icon-btn" data-role="settings" aria-label="Ayarlar">⚙</button>' +
        '</div>' +
      '</div>' +
      '<div class="ar-status">' +
        '<div class="ph-capsule ar-hud" data-role="hud"></div>' +
        '<div class="ar-lives" data-role="lives"></div>' +
      '</div>' +
      '<div class="ph-dais ar-board">' +
        '<div class="ar-haze" data-role="haze" aria-hidden="true"></div>' +
        '<div class="ar-flash" data-role="flash" aria-hidden="true"></div>' +
        '<div class="ar-viewport" data-role="viewport">' +
          '<div class="ar-stage" data-role="stage">' +
            '<svg class="ar-svg" data-role="svg"></svg>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ar-actionbar">' +
        '<button class="ar-action ar-action-hint" data-role="hint">' +
          '<span class="ar-action-ico">💡</span>' +
          '<span class="ar-action-lbl">İpucu</span>' +
          // Rozet ARTIK sabit değil: kalan reklam hakkını gösteriyor
          // (📺3), hak bitince elmasa dönüyor (💎), Plus'ta taç.
          // AdBudget.updateUI() dolduruyor.
          '<span class="ar-action-tag" data-ph-ad-budget-short>📺</span>' +
        '</button>' +
        '<div class="ar-zoom" data-role="zoom">' +
          '<button class="ar-zoom-btn" data-role="zoom-out" aria-label="Uzaklaş">−</button>' +
          '<input class="ar-zoom-slider" data-role="zoom-slider" type="range" ' +
                 'min="1" max="' + CAM_MAX_SCALE + '" step="0.01" value="1" aria-label="Yakınlaştır">' +
          '<button class="ar-zoom-btn" data-role="zoom-in" aria-label="Yakınlaş">+</button>' +
        '</div>' +
        '<button class="ar-action ar-action-grid on" data-role="grid" aria-pressed="true">' +
          '<span class="ar-action-ico">#</span>' +
          '<span class="ar-action-lbl">Izgara</span>' +
        '</button>' +
      '</div>';
    container.appendChild(wrapEl);
    hudEl = wrapEl.querySelector('[data-role="hud"]');
    svgEl = wrapEl.querySelector('[data-role="svg"]');
    flashEl = wrapEl.querySelector('[data-role="flash"]');
    diaEl = wrapEl.querySelector('[data-role="dia"]');
    gridBtn = wrapEl.querySelector('[data-role="grid"]');
    zoomSlider = wrapEl.querySelector('[data-role="zoom-slider"]');
    lives.mount(wrapEl.querySelector('[data-role="lives"]'));
    buildHaze(wrapEl.querySelector('[data-role="haze"]'));
    camera = phCamera(wrapEl.querySelector('[data-role="viewport"]'),
                      wrapEl.querySelector('[data-role="stage"]'),
                      // Eşik TEK kaynaktan: kameranın "bu bir sürükleme"
                      // kararı ile oyunun "bu dokunuş sayılmaz" kararı
                      // ayrışırsa arada ne pan eden ne ok seçen ölü bant kalır.
                      { maxScale: CAM_MAX_SCALE, dragStart: DRAG_SLOP_PX,
                        onChange: syncZoomSlider });
    wireControls();
    updateDiamonds();
    gridOn = loadGridPref();
    applyGridPref();
    addEv(svgEl, 'click', onBoardTap);
    addEv(svgEl, 'pointerdown', onPointerDown);
    startLevel();
  }

  function cleanup() {
    clearEvs();
    // Seviye geçiş zamanlayıcısı: oyundan çıkılırsa tetiklenmemeli,
    // yoksa kopmuş DOM üzerine yeni bir tahta kurar.
    if (advanceT) { clearTimeout(advanceT); advanceT = null; }
    // Kamera kendi rAF döngüsünü ve ResizeObserver'ını tutuyor —
    // sökülmezse oyundan çıkıldıktan sonra da yaşar.
    if (camera) { camera.destroy(); camera = null; }
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) container.classList.remove('ph-scene', 'ar-scene');
  }

  return {
    init, cleanup,
    engine: {
      SHAPES, STRAIGHT_IDS, DIRS,
      cellsOf, makeBoard, cellsFree, placeArrow, removeArrow,
      canExit, blockersOf, freeArrows, solveOrder, isSolvable, metrics,
      generateForward, generateReverse, generateSlide, validTips, depEdgeCount,
      HAND_LEVELS, buildHandLevel,
    },
  };
})();

// ═══════════════════════════════════════════════════════════════
//  RESİM KAYDIR (jigsawCard) — FAZ 1: ÇEKİRDEK MOTOR
// ═══════════════════════════════════════════════════════════════
// Faz 1 kapsamı BİLEREK dar: yalnızca kusursuz çalışan oynanış.
// Tema, resim, animasyon ve ses sırasıyla Faz 2/3/4'te gelecek — bu
// yüzden buradaki CSS çıplak, "çirkin ama doğru" hedeflendi.
//
// Saf durum fonksiyonları (solvedBoard, canMove, applyMove, isSolved,
// shuffle) DOM'a hiç dokunmaz ve `engine` altında dışa verilir. Ok
// Bulmaca'da işe yarayan kalıp: oynanış Node'dan doğrulanabiliyor.
PuzzleGames.jigsawCard = (() => {
  const P = 'slp';                    // CSS öneki — repoda kullanılmıyor
  const SIZES = [3, 4, 5];
  let container, wrapEl, boardEl, movesEl, timeEl, levelEl, goalEl, atmoEl;
  let N = 3, board = null, moves = 0, won = false;
  let startedAt = 0, timerId = 0, seed = null, winT = 0;
  let level = 1, image = null, imageOk = false;
  // Skor KOŞU boyunca birikiyor, seviye başına sıfırlanmıyor: sonsuz
  // ilerlemede ölçülen şey tek bir resim değil, arka arkaya kaç resim
  // çözüldüğü. startLevel bunu bilerek sıfırlamıyor; init() sıfırlıyor.
  let score = 0;
  let imgRetryT = 0;                  // bekleyen yeniden deneme (bkz. loadImage)

  // ═══════════ RESİM HAVUZU ═══════════
  // Veri; kod değil. 1000+ seviyeye çıkmak = bu diziye satır eklemek.
  // Seviye sistemi HAVUZU BİLMEZ, yalnızca uzunluğunu kullanır.
  //
  // URL biçimi kasıtlı: `w/h/fit=crop` CDN'e KARE kırptırıyor, yani
  // parçalama hep tam kare bir kaynakla çalışıyor ve hizalama bozulmuyor.
  // 1200px kaynak, en büyük tahtamız ~460 CSS px olduğu için retina'da
  // bile 2.6x fazla örnekleme demek — parçalar net kalıyor.
  //
  // LİSANS: Unsplash lisansı ticari kullanıma açık ve atıf ZORUNLU değil
  // (CLAUDE.md §6 ses politikasındaki çıtanın aynısı). Watermark yok.
  const IMG = id => 'https://images.unsplash.com/photo-' + id + '?w=1200&h=1200&fit=crop&q=80';

  // ───────── YEREL GARANTİ HAVUZU (2026-08-02) ─────────
  // Ağ tamamen yokken oyun 8/8 karoyu büyük-numara yedeğine düşürüyordu
  // ("rakam çıkması"). Üç denemeli geri çekilme kalıcı ağ yokluğunda hiçbir
  // şey değiştirmiyor, çünkü sorun geçici değil. Çözüm: bir avuç görseli
  // APK'ya gömmek.
  //
  // Bu altı kayıt YENİ görsel DEĞİL — havuzda zaten bulunan ve gözle
  // onaylanmış altı görselin yerel kopyası (bkz. docs/GAMES/SLIDING_PUZZLE.md:
  // görsel eklemenin şartı erişilebilirlik değil, gözle onay). Uzak
  // listeden ÇIKARILDILAR, yani havuz büyümedi, aynı görsel iki kez
  // görünmüyor. Altı farklı kategori bilerek seçildi: ağsız oyuncu da
  // çeşitlilik görsün.
  //
  // 1000×1000 (uzak havuz 1200): en büyük tahta ~460 CSS px, cihaz DPR'si
  // ~2.1 → ~970 fiziksel piksel. 1000px zaten fazlasıyla yeterli, 1200
  // boşuna 1.4× dosya olurdu. Toplam ~1.1 MB.
  //
  // LİSANS: Unsplash lisansı (teyit 2026-08-02, unsplash.com/license):
  // ticari kullanım serbest, izin/atıf ZORUNLU DEĞİL. İki yasak var, ikisi
  // de bizi kapsamıyor: "değiştirilmeden satmak" (görseli satmıyoruz, bir
  // bulmacanın içeriği) ve "Unsplash'e rakip bir servis derlemek" (altı
  // görsel, oyun içeriği).
  const LOCAL = id => 'assets/jigsaw/' + id + '.jpg';
  const LOCAL_POOL = [
    { id:'mou-1', category:'mountains',   difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('mou-1') },
    { id:'for-1', category:'forest',      difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('for-1') },
    { id:'cit-1', category:'city',        difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('cit-1') },
    { id:'jap-1', category:'japan',       difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('jap-1') },
    { id:'oce-1', category:'ocean',       difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('oce-1') },
    { id:'flo-1', category:'flowers',     difficulty:2, w:1000, src:'local', lic:'Unsplash', url:LOCAL('flo-1') },
  ];

  // Kayit alanlari: id, category, difficulty, w (teslim cozunurlugu),
  // src (kaynak), lic (lisans), url. 1000+ seviye = bu diziye satir eklemek.
  // Uzak havuz: ag varsa cesitlilik buradan geliyor (genisletme).
  const REMOTE_POOL = [
    { id:'mou-2', category:'mountains', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1464822759023-fed622ff2c3b') },
    { id:'mou-3', category:'mountains', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1519681393784-d120267933ba') },
    { id:'for-2', category:'forest', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1448375240586-882707db888b') },
    { id:'for-3', category:'forest', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1476231682828-37e571bc172f') },
    { id:'nat-1', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1439066615861-d1af74d74000') },
    { id:'nat-2', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1500534314209-a25ddb2bd429') },
    { id:'nat-3', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1432405972618-c60b0225b8f9') },
    { id:'nat-4', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1470252649378-9c29740c9fa8') },
    { id:'nat-5', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1495616811223-4d98c6e9c869') },
    { id:'cit-2', category:'city', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1514565131-fce0801e5785') },
    { id:'cit-3', category:'city', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1477959858617-67f85cf4f1df') },
    { id:'jap-2', category:'japan', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1503899036084-c55cdd92da26') },
    { id:'jap-3', category:'japan', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1528360983277-13d401cdc186') },
    { id:'arc-1', category:'architecture', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1533929736458-ca588d08c8be') },
    { id:'spa-1', category:'space', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1462331940025-496dfbfc7564') },
    { id:'spa-2', category:'space', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1543722530-d2c3201371e7') },
    { id:'art-1', category:'art', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1502691876148-a84978e59af8') },
    { id:'ani-1', category:'animals', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1425082661705-1834bfd09dca') },
    { id:'ani-2', category:'animals', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1518791841217-8f162f1e1131') },
    { id:'ani-3', category:'animals', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1444212477490-ca407925329e') },
    { id:'ani-4', category:'animals', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1553284965-83fd3e82fa5a') },
    { id:'oce-2', category:'ocean', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1519046904884-53103b34b206') },
    { id:'arc-2', category:'architecture', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1487958449943-2429e8be8625') },
    { id:'arc-3', category:'architecture', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1449157291145-7efd050a4d0e') },
    { id:'arc-4', category:'architecture', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1470723710355-95304d8aece4') },
    { id:'art-2', category:'art', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1541961017774-22349e4a1262') },
    { id:'art-3', category:'art', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1513364776144-60967b0f800f') },
    { id:'foo-1', category:'food', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1504674900247-0877df9cc836') },
    { id:'foo-2', category:'food', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1467003909585-2f8a72700288') },
    { id:'foo-3', category:'food', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1476224203421-9ac39bcb3327') },
    { id:'nat-6', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1507371341162-763b5e419408') },
    { id:'nat-7', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1509316785289-025f5b846b35') },
    { id:'spa-3', category:'space', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1483347756197-71ef80e95f73') },
    { id:'nat-8', category:'nature', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1474044159687-1ee9f3a51722') },
    { id:'for-4', category:'forest', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1523712999610-f77fbcfc3843') },
    { id:'art-4', category:'art', difficulty:2, w:1200, src:'unsplash', lic:'Unsplash', url:IMG('1521295121783-8a321d551ad2') },
  ];
  // ELENENLER — neden elendikleri kalsın ki aynı hata tekrarlanmasın:
  //   1507003211169  bir insan PORTRESİ. "minimal" etiketiyle geldi ama
  //                  yüz; kimliği tanınan birini oyuna koymuyoruz.
  //   1470071459604  neredeyse tamamen gökyüzü — odak noktası yok.
  //   1439405326854  aynı şekilde düz gökyüzü.
  // Üçü de URL olarak SAĞLAMDI (200, kare, yüksek çözünürlük); kusur
  // görselin İÇERİĞİNDEYDİ. Bu yüzden havuza resim eklemenin şartı
  // erişilebilirlik değil, GÖZLE ONAY — bkz. docs/GAMES/SLIDING_PUZZLE.md.

  // Yerel görseller BAŞTA: seviye sistemi havuzu bilmiyor, yalnızca
  // uzunluğunu kullanıyor (orderFor zaten her turda karıyor), dolayısıyla
  // sıra oynanışı etkilemiyor — ama havuzun ilk elemanlarının garanti
  // yerel olması, hata ayıklarken "ilk seviye her zaman resimli mi"
  // sorusunu tek bakışta cevaplanabilir kılıyor.
  const IMAGE_POOL = LOCAL_POOL.concat(REMOTE_POOL);

  // ═══════════ SEVİYE SİSTEMİ ═══════════
  // Boyut eğrisi. Tek zorluk kolu tahta boyu — 11-30 arası 3x3'ten
  // 4x4'e KADEMELİ geçiş: 4x4 olasılığı 0'dan 1'e çıkıyor, yani oyuncu
  // duvara toslamadan alışıyor.
  function sizeFor(lv) {
    if (lv <= 10) return 3;
    if (lv <= 30) return (((lv * 7) % 20) / 20) < ((lv - 10) / 20) ? 4 : 3;
    if (lv <= 70) return 4;
    return 5;
  }

  // Resim seçimi: havuzu her TURDA yeniden karıp sırayla tüketiyoruz.
  // Sonucu: bir resim havuz bitmeden ASLA tekrar etmiyor (14 resimle 14
  // seviye), ve tur değişince sıra da değişiyor. Rastgele seçim bunu
  // garanti edemezdi — aynı resim iki seviye üst üste gelebilirdi.
  // Kart karıştırdıktan sonra AYNI KATEGORİ yan yana gelirse ileriden
  // farklı kategorili biriyle takas ediliyor.
  // Aynı kategoriyi yan yana bırakma: çakışanı ileriden uygun biriyle takas.
  function declusterCats(ord, prevCat) {
    const n = ord.length;
    for (let i = 0; i < n; i++) {
      const before = i === 0 ? prevCat : IMAGE_POOL[ord[i - 1]].category;
      if (before == null || IMAGE_POOL[ord[i]].category !== before) continue;
      for (let j = i + 1; j < n; j++) {
        if (IMAGE_POOL[ord[j]].category === before) continue;
        if (i + 1 < n && IMAGE_POOL[ord[j]].category === IMAGE_POOL[ord[i + 1]].category) continue;
        const t = ord[i]; ord[i] = ord[j]; ord[j] = t; break;
      }
    }
    return ord;
  }

  // Turlar BİRBİRİNDEN HABERSİZ olamaz. Her tur bağımsız karılırsa önceki
  // turun kuyruğu bu turun başına düşer ve resim 1-2 seviye arayla tekrar
  // eder. Ölçüldü: korumasız hâlde 400 seviyede 174 erken tekrar, üstelik
  // bir kez de üst üste aynı resim. Çözüm: önceki turun SON YARISINI bu
  // turun ARKASINA it — böylece iki görülme arası en az ~havuz/2 seviye.
  // Tur sırası kümülatif olduğu için önbelleğe alınıyor; seviye 1000'de
  // bile hesap 14 elemanlı birkaç düzine karıştırma.
  const _orderCache = [];
  function orderFor(epoch) {
    for (let e = _orderCache.length; e <= epoch; e++) {
      const n = IMAGE_POOL.length;
      const rng = phRng(((e + 1) * 2654435761) >>> 0);
      let ord = IMAGE_POOL.map((_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = phRngInt(rng, i + 1);
        const t = ord[i]; ord[i] = ord[j]; ord[j] = t;
      }
      let prevCat = null;
      if (e > 0) {
        const prev = _orderCache[e - 1];
        const recent = new Set(prev.slice(Math.ceil(n / 2)));
        ord = ord.filter(i => !recent.has(i)).concat(ord.filter(i => recent.has(i)));
        prevCat = IMAGE_POOL[prev[prev.length - 1]].category;
      }
      _orderCache[e] = declusterCats(ord, prevCat);
    }
    return _orderCache[epoch];
  }
  function planFor(lv) {
    const n = IMAGE_POOL.length;
    const idx = (lv - 1) % n, epoch = Math.floor((lv - 1) / n);
    return { level: lv, size: sizeFor(lv), image: IMAGE_POOL[orderFor(epoch)[idx]] };
  }

  // ═══════════ SAF DURUM ═══════════
  // board: uzunluğu N*N dizi. board[i] = o hücredeki parçanın EV indeksi,
  // boşluk için null. Çözülmüş hâl: board[i] === i, son hücre null.
  function solvedBoard(n) {
    const b = new Array(n * n);
    for (let i = 0; i < n * n - 1; i++) b[i] = i;
    b[n * n - 1] = null;
    return b;
  }
  function blankOf(b) { return b.indexOf(null); }
  function isSolved(b) {
    for (let i = 0; i < b.length - 1; i++) if (b[i] !== i) return false;
    return b[b.length - 1] === null;
  }
  // Yalnızca boşluğa DİK KOMŞU parça oynar. Aynı satır/sütundaki uzak
  // parçalar oynamaz — "komşu olmayan parça hareket etmesin" kuralı bu.
  // Klasik 15-puzzle'lar sırayı toptan kaydırır; burada bilerek yapmıyoruz.
  function neighborsOf(i, n) {
    const c = i % n, r = (i - c) / n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }
  function canMove(b, i, n) {
    return b[i] !== null && neighborsOf(blankOf(b), n).indexOf(i) >= 0;
  }
  function applyMove(b, i) {
    const z = blankOf(b);
    b[z] = b[i]; b[i] = null;
    return b;
  }

  // ÇÖZÜLEBİLİRLİK İNŞA GEREĞİ: çözülmüş tahtadan başlayıp yalnızca
  // GEÇERLİ hamleler yapıyoruz, dolayısıyla ters yönde her zaman bir
  // çözüm var. Parite hesabı gerekmiyor — o yol çift genişlikli
  // tahtalarda boşluğun satırını da işin içine katar ve sessizce
  // çözülemez tahta üretmesi çok kolaydır.
  // prev: bir önceki adımın geldiği hücre. Oraya hemen dönmek hamleyi
  // geri alır ve karışmayı yavaşlatır, o yüzden eleniyor.
  function shuffle(n, rnd) {
    const b = solvedBoard(n);
    let prev = -1;
    const steps = n * n * 25;
    for (let s = 0; s < steps; s++) {
      const opts = neighborsOf(blankOf(b), n).filter(i => i !== prev);
      const pick = opts[Math.min(opts.length - 1, Math.floor(rnd() * opts.length))];
      prev = blankOf(b);
      applyMove(b, pick);
    }
    if (isSolved(b)) applyMove(b, neighborsOf(blankOf(b), n)[0]);
    return b;
  }

  // ═══════════ RENDER (Faz 1: çıplak) ═══════════
  // ═══════════ MAGIC NIGHT TEMASI (Faz 3) ═══════════
  // Sahne, kaide, kapsül ve ikon butonlar PLATFORMDAN geliyor
  // (.ph-scene / .ph-dais / .ph-capsule / .ph-icon-btn). Burada yalnızca
  // bu oyuna ÖZGÜ olan var — reçeteyi kopyalamak DESIGN_SYSTEM §24'ün
  // ihlali olurdu.
  //
  // Bu oyunun tek gerçek yeniliği: PARÇA. Fotoğraf taşıyan, aralıklı,
  // kaydırılabilir bir yüzey. Diğer oyunlarda karşılığı yok.
  function css() {
    return '' +
      '.' + P + '-wrap{position:relative;z-index:1;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:var(--ph-space-3);' +
        'width:100%;max-width:430px;min-height:100%;margin:0 auto;' +
        'padding:var(--ph-space-4) var(--ph-space-3)}' +
      '.' + P + '-wrap *{box-sizing:border-box}' +

      // ── HUD: tek cam kapsül, üç ölçü ──
      '.' + P + '-hud{display:flex;align-items:center;gap:var(--ph-space-4)}' +
      '.' + P + '-stat{display:flex;flex-direction:column;align-items:center;gap:2px}' +
      '.' + P + '-stat b{font:600 17px/1 var(--ph-font-display,Fraunces),serif;' +
        'font-variant-numeric:var(--ph-variant-numeral);' +
        'text-shadow:0 0 18px rgba(150,120,235,.55)}' +
      '.' + P + '-stat span{font:700 9px/1 var(--ph-font-body,Inter),sans-serif;' +
        'letter-spacing:.12em;opacity:.55;text-transform:uppercase}' +

      // ── Tahta: kaide + NEON ÇERÇEVE ──
      // Çerçeve ::before ile kaidenin DIŞINA taşıyor; maketteki ışıyan
      // kenar bu. Tahtanın kendisi .ph-dais, gradyanı oradan alıyor.
      '.' + P + '-board-wrap{position:relative;width:100%;max-width:400px;' +
        'padding:var(--ph-space-3);border-radius:var(--ph-radius-lg)}' +
      // ::after ŞART, ::before DEĞİL: bu div aynı zamanda .ph-dais ve
      // platformun üst anahtar ışığı .ph-dais::before'u kullanıyor.
      // ::before'a yazınca ikisi çakışıyor ve çerçeve yalnızca üstte
      // görünüyordu — yaşandı, düzeltildi.
      '.' + P + '-board-wrap::after{content:"";position:absolute;inset:-1.5px;' +
        'border-radius:inherit;padding:1.5px;pointer-events:none;' +
        'background:linear-gradient(135deg,#5b8cff,#a855f7 45%,#ec4899);' +
        '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);' +
        '-webkit-mask-composite:xor;mask-composite:exclude;' +
        'opacity:.85;filter:drop-shadow(0 0 10px rgba(168,85,247,.45))}' +
      '.' + P + '-board{position:relative;width:100%;aspect-ratio:1;' +
        'border-radius:var(--ph-radius-md);overflow:hidden;' +
        'touch-action:manipulation;user-select:none;' +
        'background:rgba(7,11,30,.55);' +
        'box-shadow:inset 0 0 var(--ph-space-10) var(--ph-space-4) rgba(4,6,22,.5)}' +

      // ── PARÇA ──
      // Kutu TAM 100/N%: background-position matematiği buna dayanıyor,
      // bozulursa hizalama gider. Aralık transform'daki scale ile
      // veriliyor, kutu ölçüsüyle değil.
      '.' + P + '-tile{position:absolute;top:0;left:0;display:flex;' +
        'align-items:center;justify-content:center;' +
        'font:800 clamp(14px,5vw,28px)/1 var(--ph-font-display,Fraunces),serif;' +
        'color:var(--ph-scene-ink);border-radius:9px;' +
        'background:linear-gradient(160deg,rgba(126,110,220,.5),rgba(34,30,80,.6))' +
          ' center/cover no-repeat;' +
        'box-shadow:0 3px 10px -3px rgba(4,6,22,.85),' +
          'inset 0 1px 0 rgba(205,195,255,.22);cursor:pointer;' +
        'will-change:transform;' +
        'transition:transform var(--ph-duration-fast,180ms) var(--ph-ease-standard,ease),' +
          'box-shadow var(--ph-duration-fast,180ms) ease}' +
      // Oynanabilir parça hafifçe öne çıkıyor — "buraya dokunabilirsin".
      '.' + P + '-tile[data-movable="1"]{box-shadow:0 5px 16px -4px rgba(4,6,22,.9),' +
        'inset 0 1px 0 rgba(215,205,255,.34),0 0 0 1px rgba(180,165,255,.22)}' +
      '.' + P + '-tile[data-movable="1"]:active{filter:brightness(1.12)}' +
      '.' + P + '-tile[data-movable="0"]{cursor:default}' +
      // Komsu olmayan parcaya dokununca kisa itiraz — ceza degil, bilgi.
      '.' + P + '-tile.nudge{animation:slpNudge 260ms var(--ph-ease-standard,ease)}' +
      '@keyframes slpNudge{0%,100%{filter:none}35%{filter:brightness(.78) saturate(.7)}}' +
      // Numara rozeti: fotoğrafın rengi bilinmediği için kendi zemini var.
      '.' + P + '-tile[data-img="1"]::after{content:attr(data-num);' +
        'position:absolute;top:3px;left:3px;min-width:16px;height:16px;padding:0 4px;' +
        'border-radius:6px;background:rgba(7,11,30,.72);' +
        'backdrop-filter:blur(3px);color:var(--ph-scene-ink);' +
        'font:700 10px/16px var(--ph-font-body,Inter),sans-serif;text-align:center;' +
        'box-shadow:inset 0 0 0 1px rgba(180,165,255,.2)}' +

      // ── Hedef görsel ──
      '.' + P + '-goal{display:flex;align-items:center;gap:var(--ph-space-2);' +
        'font:700 11px/1 var(--ph-font-body,Inter),sans-serif;' +
        'letter-spacing:.1em;text-transform:uppercase;opacity:.6}' +
      '.' + P + '-goal i{width:52px;height:52px;border-radius:10px;flex:none;' +
        'background:rgba(7,11,30,.5) center/cover no-repeat;' +
        'border:1px solid rgba(180,165,255,.28);' +
        'box-shadow:0 6px 18px -8px rgba(4,6,22,.9)}' +

      // ── Alt aksiyon çubuğu ──
      '.' + P + '-bar{display:flex;align-items:center;justify-content:center;' +
        'gap:var(--ph-space-2);flex-wrap:wrap}' +
      '.' + P + '-seg{display:flex;gap:4px;padding:4px;border-radius:var(--ph-radius-full);' +
        'background:rgba(7,11,30,.45);border:1px solid rgba(180,165,255,.18)}' +
      '.' + P + '-seg button{padding:6px 13px;border-radius:var(--ph-radius-full);' +
        'border:none;background:transparent;color:var(--ph-scene-ink);' +
        'font:700 12px/1 var(--ph-font-body,Inter),sans-serif;cursor:pointer;opacity:.62;' +
        'transition:background var(--ph-duration-micro,120ms) ease,opacity 120ms ease}' +
      '.' + P + '-seg button[aria-pressed="true"]{opacity:1;' +
        'background:linear-gradient(160deg,rgba(126,110,220,.55),rgba(40,32,80,.5));' +
        'box-shadow:inset 0 1px 0 rgba(215,205,255,.3)}' +

      // ── Kazanma: aralıklar KAPANIR, fotoğraf tek parça olur ──
      // Oyunun ödülü bu an. Oynarken parçalar ayrık duruyor ki tahta
      // okunsun; çözülünce dikişler yok oluyor.
      '.' + P + '-board.won .' + P + '-tile{border-radius:0;box-shadow:none}' +
      '.' + P + '-board.won .' + P + '-tile::after{opacity:0}' +
      '.' + P + '-win{font:600 15px/1 var(--ph-font-display,Fraunces),serif;' +
        'color:var(--ph-success,#4ade80);text-shadow:0 0 20px rgba(74,222,128,.5)}';
  }

  function place(el, idx) {
    const c = idx % N, r = (idx - c) / N, p = 100 / N;
    el.style.width = p + '%';
    el.style.height = p + '%';
    el.style.transform = 'translate(' + (c * 100) + '%,' + (r * 100) + '%)';
  }

  // ═══════════ PARÇALAMA ═══════════
  // Canvas YOK. Tek resim, N*N parçaya YÜZDE ile bölünüyor:
  //
  //   background-size     : (N*100)%  → resim tam tahta boyuna ölçekleniyor
  //   background-position : c/(N-1)*100%  → yüzde konumlandırma, resmin
  //                         %X noktasını kutunun %X noktasına hizalar.
  //                         N-1 bölmesi bu yüzden; N değil.
  //
  // Her şey yüzde olduğu için tahta hangi piksel boyunda olursa olsun
  // hizalama TAM: yeniden ölçüm, yuvarlama hatası, kırık kenar yok.
  // Retina da bedava — tarayıcı 1200px kaynağı ölçekliyor, biz karışmıyoruz.
  function paint(el, home) {
    el.dataset.num = String(home + 1);    // hedef sıra numarası
    if (!imageOk) {                       // resim gelmediyse ORTADA büyük numara
      el.dataset.img = '0';
      el.textContent = String(home + 1);
      el.style.backgroundImage = '';
      return;
    }
    el.dataset.img = '1';
    el.textContent = '';                  // numara artık ::after rozetinde
    const c = home % N, r = (home - c) / N, d = N - 1;
    el.style.backgroundImage = 'url("' + image.url + '")';
    el.style.backgroundSize = (N * 100) + '% ' + (N * 100) + '%';
    el.style.backgroundPosition = (d ? (c / d) * 100 : 0) + '% ' + (d ? (r / d) * 100 : 0) + '%';
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < N * N; i++) {
      if (board[i] === null) continue;
      const t = document.createElement('div');
      t.className = P + '-tile';
      t.dataset.home = String(board[i]);
      place(t, i);
      paint(t, board[i]);
      boardEl.appendChild(t);
    }
    syncMovable();
  }

  // Resmi ÖNDEN yükle: yarısı boyalı tahta göstermektense numaralarla
  // başlayıp gelince boyuyoruz. Ağ hatasında oyun yine oynanır kalıyor.
  // Görsel ağdan geliyor ve TEK denemede pes etmek kabul edilemez: bir saniyelik
  // bağlantı kesintisi, o seviyeyi oyuncu yeniden başlatana kadar "numaralı
  // kareler" moduna düşürüyordu (sahada görüldü). Artık üstel geri çekilmeli
  // 3 deneme var — 400ms, 800ms.
  //
  // İki tuzak birlikte kapatıldı:
  //  1) `done` YALNIZCA BİR KEZ çağrılır. Önbellekten gelen bir görselde hem
  //     `complete` hem `onload` doğru olabiliyor; eskiden ikisi de tetiklenip
  //     tahtayı iki kez kurabiliyordu.
  //  2) Bekleyen deneme zamanlayıcısı cleanup'ta iptal edilir. Aksi hâlde
  //     oyundan çıktıktan sonra ateşlenip kopmuş DOM'a çiziyordu
  //     (01_ARCHITECTURE: cleanup timers'ı bırakmaz).
  // Yerel yedek, seviyeden TÜRETİLİYOR: aynı seviye hep aynı yedeği alır
  // (yeniden başlatınca resim değişip kafa karıştırmasın) ama ardışık
  // seviyeler farklı yedek görür — ağsız oyuncu da çeşitlilik görsün.
  function localFallbackFor(lv) {
    return LOCAL_POOL[((lv - 1) % LOCAL_POOL.length + LOCAL_POOL.length) % LOCAL_POOL.length];
  }

  const IMG_TRIES = 3, IMG_BACKOFF = 400;
  // `done(usedImage)` — KULLANILAN görseli geri veriyor, çünkü yedeğe
  // düşülmüş olabilir ve başlıktaki kategori adı ile HEDEF önizlemesi
  // gerçekte gösterilen resmi anlatmak zorunda.
  function loadImage(img, done) {
    imageOk = false;
    if (imgRetryT) { clearTimeout(imgRetryT); imgRetryT = 0; }
    let finished = false, tries = 0, current = img, fellBack = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true; imageOk = ok; done(current);
    };
    const attempt = () => {
      tries++;
      const pre = new Image();
      pre.onload = () => finish(true);
      pre.onerror = () => {
        if (tries < IMG_TRIES) {
          imgRetryT = setTimeout(() => { imgRetryT = 0; attempt(); },
            IMG_BACKOFF * Math.pow(2, tries - 1));
          return;
        }
        // Üç deneme de gitti: ağ geçici değil, YOK. Uzak görselden YEREL
        // garanti havuza düşüyoruz — büyük-numara moduna düşmenin tek
        // meşru sebebi artık yerel dosyanın da açılamaması (yani bozuk
        // bir kurulum), ağ değil.
        if (!fellBack && current.src !== 'local') {
          fellBack = true; tries = 0; current = localFallbackFor(level);
          attempt();
          return;
        }
        finish(false);
      };
      pre.src = current.url;
      if (pre.complete && pre.naturalWidth) finish(true);
    };
    attempt();
  }

  // Parçaları yeniden KURMADAN taşı: hamle başına DOM yaratılmıyor,
  // yalnızca transform güncelleniyor.
  function syncPositions() {
    const byHome = new Map();
    boardEl.querySelectorAll('.' + P + '-tile')
      .forEach(t => byHome.set(Number(t.dataset.home), t));
    for (let i = 0; i < N * N; i++) {
      if (board[i] === null) continue;
      const t = byHome.get(board[i]);
      if (t) place(t, i);
    }
    syncMovable();
  }
  function syncMovable() {
    const legal = new Set(neighborsOf(blankOf(board), N).map(i => board[i]));
    boardEl.querySelectorAll('.' + P + '-tile').forEach(t => {
      t.dataset.movable = legal.has(Number(t.dataset.home)) ? '1' : '0';
    });
  }

  function onTap(e) {
    if (won) return;
    const t = e.target.closest ? e.target.closest('.' + P + '-tile') : null;
    if (!t || !boardEl.contains(t)) return;
    const idx = board.indexOf(Number(t.dataset.home));
    if (idx < 0 || !canMove(board, idx, N)) {
      // Sessizce yutmak öğretmiyor: oyuncu neden olmadığını anlamalı.
      // Ceza yok, yalnızca kısa bir itiraz — "flow, not stress".
      t.classList.remove('nudge'); void t.offsetWidth; t.classList.add('nudge');
      GameAudio.haptic('micro');
      return;
    }
    applyMove(board, idx);
    moves++;
    GameAudio.play('slide');
    GameAudio.haptic('micro');
    syncPositions();
    updateHud();
    if (isSolved(board)) finish();
  }

  function updateHud() {
    if (levelEl) levelEl.textContent = 'Seviye ' + level + ' · ' + N + '×' + N +
                                       ' · ' + (image ? image.category : '-');
    movesEl.textContent = moves;
    const s = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    timeEl.textContent = String((s / 60) | 0).padStart(2, '0') +
                         ':' + String(s % 60).padStart(2, '0');
  }

  function finish() {
    won = true;
    stopTimer();

    // Yıldız: hamle sayısı PAR'a göre. Par = N²·2.5 (3×3→22, 4×4→40,
    // 5×5→62). 3×3'ün teorik en kötü optimali 31, ortalaması ~22 —
    // yani par "iyi oynadın" eşiği, "kusursuz" değil. Zorlayıcı bir
    // hedef koymak bu oyunun rahatlatıcı tonuna ters düşerdi.
    const par = Math.round(N * N * 2.5);
    const stars = moves <= par ? 3 : moves <= Math.round(par * 1.7) ? 2 : 1;
    const levelMs = startedAt ? Date.now() - startedAt : undefined;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    const mmss = String((secs / 60) | 0).padStart(2, '0') + ':' +
                 String(secs % 60).padStart(2, '0');

    // SIRA YÜK TAŞIYOR: skor OLAYDAN ÖNCE ekleniyor.
    // İlk hâlinde olay en başta yayınlanıyordu ve `score` henüz bu turun
    // puanını içermiyordu; cihazda görüldü — 270 puanlık bir tur sonrası
    // GameEvents.forGame('jigsawCard').bestScore hâlâ 0 duruyordu, yani
    // "en yüksek skor" istatistiği bir seviye geriden geliyordu.
    addScore(scoreFor(stars, secs));

    // Skor alanı eskiden bilerek YOKTU ("bu oyunda skor kavramı yok");
    // sonsuz ilerleme onu anlamlı kıldı, o yüzden uydurma değil gerçek bir
    // alan. durationMs bu SEVİYENİN süresi — "en hızlı tamamlama" onu okuyor.
    gameEvent('game_ended', {
      gameId: 'jigsawCard', result: 'won', score, durationMs: levelMs,
    });

    // Oyunun ödülü: aralıklar ve rozetler kaybolur, fotoğraf TEK PARÇA
    // olur. Oynarken parçalar ayrık duruyor ki tahta okunsun; çözülünce
    // dikişler kapanıyor.
    if (boardEl) boardEl.classList.add('won');

    GameAudio.play('premium');
    GameAudio.haptic('win');
    if (atmoEl) phAtmosphereFlare(atmoEl, 2.2, 700);
    if (boardEl) {
      const r = boardEl.getBoundingClientRect();
      phParticleBurst(document.body, r.left + r.width / 2, r.top + r.height / 2,
                      'var(--ph-accent)', 16);
    }

    // SONSUZ İLERLEME (2026-08-07). Eskiden burada oyun-sonu kutusu
    // açılıyordu ve oyun BİTİYORDU; artık her tamamlanan resim bir seviye
    // ve bir sonraki kendiliğinden geliyor — Water Sort ve Ok Bulmaca ile
    // aynı ritim. Kutu kaldırıldı çünkü sonsuz bir akışta "oyun bitti"
    // ekranı yanlış bir cümle: hiçbir şey bitmiyor.
    //
    // Sıra yük taşıyor: dikişlerin kapanışı GÖRÜLMELİ (kazanmanın ödülü o),
    // skor ONDAN SONRA yükselmeli, yeni resim en son gelmeli. Hepsi tek
    // seferde olsaydı oyuncu neyi başardığını göremezdi.
    // (Skor yukarıda, olaydan önce eklendi — gerekçesi orada.)
    showWinToast(stars, mmss);
    winT = setTimeout(() => {
      winT = null;
      if (!boardEl) return;                 // arada cleanup olduysa
      // forcedSize 0: boyutu ZORLAMIYORUZ, sizeFor() eğrisi karar versin.
      // N geçirmek oyuncunun o anki tahtasını dondurur ve zorluk eğrisini
      // sessizce öldürürdü (11-30 arası 3×3→4×4 kademeli geçişi).
      startLevel(level + 1, 0);
    }, WIN_HOLD_MS);
  }

  // ═══════════ SKOR ═══════════
  // Skor kavramı bu oyuna sonsuz ilerlemeyle GİRDİ: bir sonu olmayan
  // oyunda "ne kadar ilerledim" sorusunun görünür bir cevabı olmalı.
  //
  // Hiçbir sayı elle yazılmıyor — hepsi zaten var olan büyüklüklerden
  // türüyor. Taban tahta boyuyla ölçekleniyor (N² parça), yıldız çarpanı
  // hamle verimliliğini ödüllendiriyor, hız primi ise PAR SÜREden sapmayla
  // hesaplanıyor. Böylece 5×5'te bir resim, 3×3'te bir resimden fazla
  // ediyor ve iyi oynamak sayıya yansıyor.
  const WIN_HOLD_MS = 1400;         // dikişlerin kapanışı + skorun okunması
  function scoreFor(stars, secs) {
    const base = N * N * 10;                       // tahta büyüklüğü
    const parSecs = N * N * 4;                     // ~4 sn/parça: hız primi eşiği
    const speed = Math.max(0, 1 - secs / (parSecs * 2));
    return Math.round(base * stars * (1 + speed));
  }
  function addScore(pts) {
    score += pts;
    updateGameScore(score);
  }
  // Kendi modalimizi KURMUYORUZ (platform kuralı). Sonsuz akışta kazanma
  // geri bildirimi kesintisiz olmalı: tam ekran bir kutu, tam da "devam"
  // hissini kırdığı için kaldırıldı. Toast aynı bilgiyi akışı durdurmadan
  // veriyor; asıl kutlama zaten tahtada (dikişler kapanıyor + parçacıklar).
  function showWinToast(stars, mmss) {
    if (typeof showToast !== 'function') return;
    showToast('★'.repeat(stars) + '☆'.repeat(3 - stars) + '  ' +
              (image ? image.category + ' · ' : '') + mmss);
  }

  function startTimer() {
    stopTimer();
    startedAt = Date.now();
    timerId = setInterval(updateHud, 1000);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = 0; } }

  // Tohum verilirse tahta TEKRARLANABİLİR olur — günlük bulmaca ve hata
  // ayıklama bunu ister (bkz. core/rng.js). Verilmezse Math.random.
  function rndFor(sd) {
    if (sd == null) return Math.random;
    const r = phRng(sd >>> 0 || 1);
    return () => phRngInt(r, 1000000) / 1000000;
  }

  // Seviyeyi kur: plan boyutu ve resmi VERİR, burada yalnızca uygulanır.
  // forcedSize verilirse (3×3/4×4/5×5 düğmeleri) plan boyutu ezilir ama
  // resim aynı kalır — oyuncu aynı resmi başka zorlukta deneyebilsin.
  function startLevel(lv, forcedSize) {
    // Tur = SEVİYE. init(), 3×3/4×4/5×5 düğmeleri (reset), ↻ Yeniden,
    // ▸ Sonraki ve game-over'daki onRestart — hepsi buradan geçiyor.
    gameEvent('game_started', { gameId: 'jigsawCard' });
    const plan = planFor(lv);
    level = lv;
    image = plan.image;
    N = forcedSize || plan.size;
    won = false; moves = 0;
    if (winT) { clearTimeout(winT); winT = 0; }
    wrapEl.querySelectorAll('.' + P + '-win').forEach(e => e.remove());
    if (boardEl) boardEl.classList.remove('won');
    board = shuffle(N, rndFor(seed));
    // Önce numaralarla kur (anında oynanabilir), resim gelince boya.
    buildBoard();
    loadImage(image, (used) => {
      if (!boardEl) return;                       // arada cleanup olduysa
      // Yedeğe düşülmüş olabilir: paint(), HEDEF önizlemesi ve başlıktaki
      // kategori adı hep GERÇEKTEN gösterilen görseli anlatmalı.
      image = used;
      boardEl.querySelectorAll('.' + P + '-tile')
        .forEach(t => paint(t, Number(t.dataset.home)));
      if (goalEl) goalEl.style.backgroundImage = imageOk ? 'url("' + image.url + '")' : '';
      updateHud();
    });
    updateHud();
    startTimer();
    wrapEl.querySelectorAll('[data-size]').forEach(b => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.size) === N));
    });
  }
  function reset(n) { startLevel(level, n || 0); }

  // ↻ Karıştır — ÖDÜLLÜ. Ödül verilmezse tahta DEĞİŞMEZ: reklam
  // kapatılırsa, yüklenemezse veya günlük hak bittiyse hiçbir şey olmaz.
  // Bunu garanti eden şey burada bir kontrol değil, runRewardedAction'ın
  // sözleşmesi: geri çağırma YALNIZCA ödül hak edilince çalışıyor
  // (CLAUDE.md ekonomi kuralı 2). Kapıyı atlayıp RewardedAd.show'u
  // doğrudan çağırmak bütçeyi de baypas ederdi.
  //
  // Kazanma anında çağrılmıyor: orada tahta zaten çözülmüş, karıştırmanın
  // anlamı yok. `won` kontrolü o yüzden.
  function shuffleWithAd() {
    if (won) return;
    // Çağrı ANINDA aranıyor, modül kapsamında değil: app.js games.js'ten
    // SONRA yükleniyor (econ/gameEvent ile aynı gerekçe). Bulunamadığı tek
    // yer tools/*.js'in kabuksuz vm kum havuzu; orada reklam kavramı yok.
    if (typeof runRewardedAction !== 'function') { reset(0); return; }
    runRewardedAction({ icon: '🔀', text: 'Karıştır' }, () => reset(0), { skipDailyLimit: true });
  }

  function init(cont, opts) {
    container = cont;
    opts = opts || {};
    seed = opts.seed != null ? opts.seed : null;
    injectStyle('css-' + P, css());
    // Gece göğü ve atmosfer PLATFORMDAN: her oyunda aynı evren.
    container.classList.add('ph-scene', P + '-arcane');
    atmoEl = phAtmosphere(container, { stars: 16, beams: 1, motes: 5, skyPct: 34 });
    container.insertAdjacentHTML('beforeend',
      '<div class="' + P + '-wrap">' +
        '<div class="ph-capsule" data-role="level">Seviye 1</div>' +
        '<div class="ph-capsule ' + P + '-hud">' +
          '<span class="' + P + '-stat"><b data-role="moves">0</b><span>Hamle</span></span>' +
          '<span class="' + P + '-stat"><b data-role="time">00:00</b><span>Süre</span></span>' +
        '</div>' +
        '<div class="' + P + '-goal"><i data-role="goal"></i><span>Hedef</span></div>' +
        '<div class="' + P + '-board-wrap ph-dais">' +
          '<div class="' + P + '-board" data-role="board"></div>' +
        '</div>' +
        '<div class="' + P + '-bar">' +
          '<span class="' + P + '-seg">' +
            SIZES.map(s => '<button data-size="' + s + '">' + s + '×' + s + '</button>').join('') +
          '</span>' +
          // ▸ SONRAKİ KALDIRILDI (2026-08-07). Oyuncu bir sonraki resmi
          // artık SEÇMİYOR; resim tamamlanınca kendiliğinden geliyor
          // (bkz. finish → advance). Elle atlama, sonsuz ilerlemenin
          // "her resim bir seviye" anlamını boşa çıkarıyordu: beğenmediğini
          // atlayıp geçen oyuncu için tamamlama sayacı bir şey ölçmez.
          '<button class="ph-icon-btn" data-role="reset" aria-label="Karıştır">↻</button>' +
        '</div>' +
      '</div>');
    wrapEl = container.querySelector('.' + P + '-wrap');
    boardEl = wrapEl.querySelector('[data-role="board"]');
    movesEl = wrapEl.querySelector('[data-role="moves"]');
    timeEl = wrapEl.querySelector('[data-role="time"]');
    levelEl = wrapEl.querySelector('[data-role="level"]');
    goalEl = wrapEl.querySelector('[data-role="goal"]');
    addEv(boardEl, 'click', onTap);
    // Seçici İŞARETLEMEYE değil VERİYE bağlı. Faz 3'te düğmeler
    // yeniden yazılınca `.slp-btn` sınıfı kalktı ama seçici onu aramaya
    // devam etti; hiçbir düğmeye dinleyici bağlanmadı ve 3×3/4×4/5×5,
    // Yeniden, Sonraki hepsi sessizce öldü. data-* öznitelikleri
    // düğmenin GÖRÜNÜŞÜ değiştiğinde de yerinde kalıyor.
    // Boyut düğmeleri ÜCRETSİZ, Karıştır ÖDÜLLÜ. Ayrım keyfi değil:
    // 3×3/4×4/5×5 bir zorluk tercihi (oyuncu kendine daha zor bir tahta
    // seçiyor), Karıştır ise bir kolaylık (sıkıştığı tahtadan kurtuluyor).
    // Zorluk seçimini reklamın arkasına koymak, oyuncuyu kendi seviyesini
    // bulmaktan caydırırdı.
    wrapEl.querySelectorAll('[data-size],[data-role="reset"]')
      .forEach(b => {
        addEv(b, 'click', () => {
          if (b.dataset.size) { reset(Number(b.dataset.size)); return; }
          shuffleWithAd();
        });
      });
    // Koşu burada başlıyor: skor SIFIRLANIR. startLevel sıfırlamıyor,
    // çünkü orası seviye geçişi — koşunun devamı, yenisi değil.
    score = 0;
    updateGameScore(0);
    startLevel(Math.max(1, opts.level || 1), SIZES.indexOf(opts.size) >= 0 ? opts.size : 0);
  }

  function cleanup() {
    stopTimer();
    // Bekleyen kazanma zamanlayıcısı sökülmezse oyundan çıktıktan SONRA
    // ateşlenip kopmuş DOM üzerine game over kutusu açıyor.
    if (winT) { clearTimeout(winT); winT = 0; }
    // Bekleyen görsel yeniden-denemesi de sökülmeli — çıktıktan sonra
    // ateşlenirse kopmuş DOM üzerine tahtayı yeniden kurardı.
    if (imgRetryT) { clearTimeout(imgRetryT); imgRetryT = 0; }
    clearEvs();
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) {
      container.innerHTML = '';
      container.classList.remove('ph-scene', P + '-arcane');
    }
    container = wrapEl = boardEl = movesEl = timeEl = levelEl = goalEl = null;
    board = null; image = null; imageOk = false;
  }

  return {
    init, cleanup,
    engine: { solvedBoard, blankOf, isSolved, neighborsOf, canMove, applyMove, shuffle,
              IMAGE_POOL, sizeFor, orderFor, planFor },
  };
})();

// ╔══════════════════════════════════════╗
// ║          11. YILAN (SNAKE)           ║
// ╚══════════════════════════════════════╝
// KLASİK yılan. Kural setine hiçbir şey EKLENMEDİ: güç artırıcı yok,
// engel yok, özel yem yok, kombo yok, can yok. Değişen tek şey oyunun
// GİYSİSİ — SlySwipe'ın neon menekşe evreni.
//
// KENARLAR SARMALIYOR (referans oyunun davranışı, sahibin kararı
// 2026-08-08): bir kenardan çıkan yılan karşı kenardan girer. Bu yüzden
// oyunun TEK kaybetme durumu kendine çarpmaktır — ölüm hep oyuncunun
// kendi izinden gelir, tahtanın sınırından değil.
//
// RENDERER KARARI (docs/04_CANVAS_POLICY.md, uygulamadan ÖNCE alınır):
// CANVAS. Gerekçe politikanın iki maddesini birden karşılıyor — tahta her
// tikte BÜTÜN olarak yeniden çiziliyor ve sürekli hareket var. DOM'da bu
// 300 hücrelik bir ızgarayı saniyede ~7-12 kez güncellemek demekti; oysa
// canvas'ta aynı iş birkaç drawImage.
//
// PERFORMANS DURUŞU (§11: akıcılık > görsel karmaşa):
//  • rAF DÖNGÜSÜ YOK. Klasik yılan hücre hücre, kesikli ilerler — ara kare
//    interpolasyonu hem klasik hissi bozar hem de boşuna 60fps çizim
//    demektir. Çizim yalnızca durum değiştiğinde (tik başına bir kez).
//    Bu yüzden "boşta maliyet sıfır" kuralı kendiliğinden sağlanıyor.
//  • Parlama (glow) HER KAREDE shadowBlur ile DEĞİL, önceden pişirilmiş
//    sprite'larla geliyor (bkz. CLAUDE.md §5 Block Puzzle kuralı). Hücre
//    boyutu sabit olduğu için 6 sprite tüm oyunu karşılıyor.
//  • Izgara noktaları ve neon çerçeve CANVAS'TA DEĞİL, CSS'te: ikisi de
//    statik, her tikte yeniden çizmenin hiçbir karşılığı yok.
//  • Skor DOM'da ve yalnızca DEĞİŞTİĞİNDE yazılıyor (yem başına bir kez).
PuzzleGames.snakeGame = (() => {
  // Yalnızca skor/rekor anahtarı için. gameEvent() çağrılarında BİLEREK
  // kullanılmıyor: tools/game-events-test.js kaynağı tarayıp her çağrının
  // id'sini içinde bulunduğu oyunla karşılaştırıyor (kopyala-yapıştır
  // hatasını yakalayan denetim bu) ve bir değişkeni çözemez. On oyunun
  // hepsi orada düz metin yazıyor; bu da yazıyor.
  const GID = 'snakeGame';

  // ═══════════ OYNANIŞ SABİTLERİ ═══════════
  // Izgara SABİT ve cihazdan bağımsız. Ekrana göre sütun/satır türetmek
  // oynanışı cihaza göre değiştirirdi: aynı skor farklı tahtalarda farklı
  // şey ifade ederdi ve rekor karşılaştırması anlamını yitirirdi. Değişen
  // yalnızca hücrenin KAÇ PİKSEL olduğu.
  // ROWS 20 → 26 (2026-08-08, sahibin isteği: "alt ve üst kısımlarda çok
  // fazla boşluk var"). Hücre boyutunu GENİŞLİK belirliyor (15 sütun,
  // ~348px kullanılabilir → 23px), yükseklik ise artıyordu: 20 satır
  // yalnızca 460px kaplıyor, oysa dikeyde ~685px var. 26 satır 598px
  // demek — boşluk kenar payına iner, hücre boyutu ise DEĞİŞMEZ, yani
  // tahta büyür ama parçalar aynı kalır. 29'un üstünde yükseklik hücreyi
  // küçültmeye başlar (23*29 = 667), o yüzden tavan orası.
  const COLS = 15, ROWS = 26;
  const START_LEN = 3;               // klasik başlangıç uzunluğu
  const FOOD_SCORE = 10;             // yem başına puan
  // Hız: klasik yılan uzadıkça hızlanır (Nokia/retro davranışı). Yeni bir
  // mekanik değil, oyunun kendi zorluk eğrisi. Tabandan tavana ~26 yemde
  // iniliyor ve orada sabitleniyor — sonsuza kadar hızlanmak oyunu
  // oynanamaz kılar.
  const TICK_START = 150, TICK_STEP = 2.5, TICK_MIN = 85;
  // Girdi kuyruğu: bir tik içinde "yukarı sonra sola" basmak iki ayrı
  // hamledir. Kuyruk olmasaydı ikincisi birincisini ezerdi ve oyuncu
  // "döndüm ama dönmedi" hissini yaşardı — klasik yılan uygulamalarının
  // standart çözümü, ek bir yetenek değil.
  const MAX_QUEUE = 2;
  const CELL_MAX = 34;               // masaüstünde tahta absürt büyümesin

  const DIRS = [ {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1} ]; // sağ,aşağı,sol,yukarı
  const KEYS = {
    ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
    w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
    W:[0,-1], S:[0,1], A:[-1,0], D:[1,0],
  };

  // ═══════════ PALET ═══════════
  // 2. tasarım görselinin renkleri (2026-08-08). Canvas renk sabitleri CSS
  // token'ıyla okunamaz (bkz. CLAUDE.md §5 palet notu), bu yüzden burada
  // yazılı. Menekşe kristalden NEON YEŞİL tel-kafes kristale geçildi;
  // gökyüzü de mordan lacivere döndü (CSS tarafında).
  //
  // MALZEME değişti, yalnızca ton değil: eski küp OPAK ve gradyan doluydu,
  // yenisi parlak konturlu + KOYU YARI SAYDAM içli, yani "cam kristal".
  // Bu yüzden dolgu/kontur/pah ayrı ayrı tanımlı.
  const C = {
    edge:    '#5cff85',                 // parlak dış kontur
    facet:   'rgba(200,255,215,.85)',   // köşe pahları
    fillTop: 'rgba(46,214,96,.42)',
    fillBot: 'rgba(14,120,52,.42)',
    glow:    'rgba(60,255,120,.50)',
    // Baş gövdeden AYRI bir malzeme: opak, daha parlak (bkz. drawHead).
    headHi:  '#4bf07f',
    headLo:  '#16a341',
    tongue:  '#ff3131',
    pupil:   '#0a2412',
  };
  // Yem artık ÇİFT TONLU: üstü camgöbeği, altı macenta. Tek gradyan hem
  // dolguya hem KONTURA veriliyor (strokeStyle de gradyan kabul eder);
  // iki ayrı yol çizip birleştirmek geçiş yerinde dikiş bırakırdı.
  const F = {
    top:'#8df3ff', topMid:'#57d8ff', botMid:'#b06bff', bot:'#e79bff',
    fillTop:'rgba(90,220,255,.30)', fillBot:'rgba(190,90,255,.30)',
    glow:'rgba(130,220,255,.55)',
  };

  // ═══════════ DURUM ═══════════
  let container, wrapEl, arenaEl, cv, ctx, scoreEl, atmoEl;
  let cell = 0, dpr = 1, PAD = 0, SP = 0;
  let sprBody = null, sprHead = [], sprFood = null;
  let snake = [], occ = null, food = null, dir = DIRS[0];
  const queue = [];
  let score = 0, best = 0, alive = false, waiting = false, over = false;
  let timer = 0, deathT = 0, layoutRaf = 0, layoutTries = 0, startedAt = 0;

  // ═══════════ ÇİZİM YARDIMCILARI ═══════════
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  // Sprite: hücreden PAD kadar taşan kare tuval. Taşma payı hem parlamayı
  // hem de başın dışarı çıkan dişlerini içeriyor.
  function makeSprite(size, draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(size * dpr));
    c.height = Math.max(1, Math.round(size * dpr));
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(x);
    return { cv: c, size };
  }

  // Kristal küp — tasarımdaki gövde parçası.
  // Reçete: KOYU YARI SAYDAM iç + PARLAK kontur + dört köşede pah çizgisi.
  // Hacim artık dolgu gradyanından değil, konturun parlaklığı ile köşe
  // pahlarından geliyor — tasarımdaki "neon cam" malzemesi bu.
  function drawCube(x, ox, oy, s) {
    const inset = Math.max(1, s * 0.07);
    const px = ox + inset, py = oy + inset, sz = s - inset * 2;
    const r = sz * 0.18;

    x.save();
    x.shadowColor = C.glow;
    x.shadowBlur = s * 0.40;
    const g = x.createLinearGradient(px, py, px, py + sz);
    g.addColorStop(0, C.fillTop);
    g.addColorStop(1, C.fillBot);
    x.fillStyle = g;
    rr(x, px, py, sz, sz, r);
    x.fill();
    // Kontur parlamanın İÇİNDE çiziliyor: parlayan şey kenarın kendisi,
    // dolgunun silueti değil.
    x.lineWidth = Math.max(1.2, s * 0.075);
    x.strokeStyle = C.edge;
    rr(x, px, py, sz, sz, r);
    x.stroke();
    x.restore();

    // Köşe pahları — kesme taş izlenimi. Parlamanın DIŞINDA: dört kısa
    // çizgiyi de gölgelendirmek küpün içini sisli gösteriyordu.
    const f = sz * 0.30, e = r * 0.55;
    x.lineWidth = Math.max(1, s * 0.042);
    x.strokeStyle = C.facet;
    x.beginPath();
    x.moveTo(px + e, py + f);                x.lineTo(px + f, py + e);
    x.moveTo(px + sz - f, py + e);           x.lineTo(px + sz - e, py + f);
    x.moveTo(px + e, py + sz - f);           x.lineTo(px + f, py + sz - e);
    x.moveTo(px + sz - f, py + sz - e);      x.lineTo(px + sz - e, py + sz - f);
    x.stroke();
  }

  // Baş — 3. tasarım görselindeki YILAN kafası (2026-08-08): yuvarlak,
  // DOLU yeşil kafa + iki beyaz göz (koyu bebekli) + öne uzanan kırmızı
  // çatal dil. Önceki testere dişli uç tamamen kaldırıldı.
  //
  // Gövdeden üç farkı bilinçli ve hepsi okunabilirlik için:
  //  • OPAK (gövde yarı saydam kristal) — kafa arkasındaki ızgara görünmez,
  //  • daha BÜYÜK (hücreyi ~%18 taşar) ve komşu gövde parçasının üstüne
  //    biner, tıpkı görselde olduğu gibi — bu yüzden çizim sırası kuyruk→baş,
  //  • yüz detayları var; oyuncunun "nereye bakıyorum" sorusu tek bakışta
  //    cevaplanmalı, çünkü yön hatası bu oyunda ölüm demek.
  // Taşma ve dil sprite'ın PAD payına sığıyor (bkz. buildSprites).
  //
  // YÖN, sprite'ı DÖNDÜREREK değil, dil ve gözler yeniden konumlandırılarak
  // veriliyor. Blok döndürme denendi ve elendi: 90°'de gözler kafanın yanına
  // kayıp yüz "profilden balık" gibi okunuyor, 180°'de ise baş aşağı geliyor.
  // Görseldeki yüz KARŞIDAN bakan bir çizgi-film yüzü; o kimliği korumanın
  // yolu gözleri hep yatay çift tutmak, yalnızca dili ileriye çevirmek.
  // Tek istisna YUKARI: dil tepeden çıktığı için gözler alt yarıya iniyor,
  // yoksa dil gözlerin üstünden geçerdi.
  // d: 0 sağ · 1 aşağı · 2 sol · 3 yukarı
  function drawHead(x, d) {
    const cx = SP / 2, cy = SP / 2;
    const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]][d];
    // 1.28 ve yarıçap .42: görseldeki kafa gövdeden belirgin BÜYÜK ve
    // neredeyse dairesel. Daha küçük/köşeli bir kafa gövde küplerinden
    // ayrışmıyor, yılanın yönü de tek bakışta okunmuyordu.
    const hs = cell * 1.28;
    const hx = cx - hs / 2, hy = cy - hs / 2;
    const r = hs * 0.42;

    x.save();
    x.shadowColor = C.glow;
    x.shadowBlur = cell * 0.45;
    const g = x.createLinearGradient(cx, hy, cx, hy + hs);
    g.addColorStop(0, C.headHi);
    g.addColorStop(1, C.headLo);
    x.fillStyle = g;
    rr(x, hx, hy, hs, hs, r);
    x.fill();
    x.lineWidth = Math.max(1, cell * 0.055);
    x.strokeStyle = C.edge;
    rr(x, hx, hy, hs, hs, r);
    x.stroke();
    x.restore();

    // Dil: ağızdan (kafanın ön-alt kenarı) çıkıp dışarı uzanır, uçta çatal.
    // Kafadan SONRA çiziliyor ki kökü ağzın üstünde görünsün.
    // Dil AĞIZDAN çıkar: yön boyunca dışa. Yatay yönlerde ayrıca aşağı
    // kaydırılıyor (bias) — görselde dil gözlerin altından, ağız hizasından
    // çıkıyor; tam ortadan çıkan dil "burun" gibi duruyordu.
    // Görselde küçük ve ince; kalın/uzun bir dil kafayı bastırıp yüzü ikinci
    // plana atıyordu.
    const L = cell * 0.42;
    const ux = DV[0], uy = DV[1];              // ileri
    const vx = -DV[1], vy = DV[0];             // ileriye dik (çatal ekseni)
    const bias = (d === 0 || d === 2) ? hs * 0.17 : 0;
    const bx = cx + ux * hs * 0.28;
    const by = cy + uy * hs * 0.28 + bias;
    x.save();
    x.strokeStyle = C.tongue;
    x.lineWidth = Math.max(1.3, cell * 0.072);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + ux * L * 0.55, by + uy * L * 0.55);
    x.moveTo(bx + ux * L * 0.55, by + uy * L * 0.55);
    x.lineTo(bx + ux * L - vx * L * 0.30, by + uy * L - vy * L * 0.30);
    x.moveTo(bx + ux * L * 0.55, by + uy * L * 0.55);
    x.lineTo(bx + ux * L + vx * L * 0.30, by + uy * L + vy * L * 0.30);
    x.stroke();
    x.restore();

    // Gözler: HER ZAMAN yatay çift (karşıdan bakan yüz). Bebek AŞAĞI kaçık —
    // görseldeki ifade bundan geliyor. Bebek beyazın yarısından KÜÇÜK
    // kalmalı; büyütünce gözler uzaktan koyu bir lekeye dönüşüyor ve yüz
    // kayboluyor (23px hücrede sınav bu).
    const ew = hs * 0.29, eh = hs * 0.33;
    const ey = cy + (d === 3 ? hs * 0.15 : -hs * 0.13);
    [cx - hs * 0.185, cx + hs * 0.185].forEach((ex2) => {
      x.fillStyle = '#ffffff';
      rr(x, ex2 - ew / 2, ey - eh / 2, ew, eh, Math.min(ew, eh) * 0.36);
      x.fill();
      const pw = ew * 0.44, ph = eh * 0.38;
      x.fillStyle = C.pupil;
      rr(x, ex2 - pw / 2, ey + eh * 0.02, pw, ph, pw * 0.30);
      x.fill();
    });
  }

  // Yem: elmas kesim (taç + kuşak + sivri uç). Uygulamanın elmas diliyle
  // aynı siluet — tasarım görselindeki mücevher bu.
  function drawGem(x) {
    const cx = SP / 2, cy = SP / 2;
    const w = cell * 0.66, h = cell * 0.68;
    const tw = w * 0.30;
    const ty = cy - h * 0.44, gy = cy - h * 0.06, by = cy + h * 0.50;

    x.save();
    x.shadowColor = F.glow;
    x.shadowBlur = cell * 0.42;
    x.beginPath();
    x.moveTo(cx - tw, ty);
    x.lineTo(cx + tw, ty);
    x.lineTo(cx + w / 2, gy);
    x.lineTo(cx, by);
    x.lineTo(cx - w / 2, gy);
    x.closePath();
    // İç dolgu KOYU/yarı saydam, kontur parlak — gövde küpleriyle aynı
    // "neon cam" malzemesi. Renk üstte camgöbeği, altta macenta.
    const fg = x.createLinearGradient(cx, ty, cx, by);
    fg.addColorStop(0, F.fillTop);
    fg.addColorStop(1, F.fillBot);
    x.fillStyle = fg;
    x.fill();
    // Kontur da GRADYAN: iki ayrı yol çizip birleştirmek geçiş noktasında
    // görünür bir dikiş bırakırdı. strokeStyle gradyan kabul ediyor.
    const eg = x.createLinearGradient(cx, ty, cx, by);
    eg.addColorStop(0, F.top);
    eg.addColorStop(0.42, F.topMid);
    eg.addColorStop(0.58, F.botMid);
    eg.addColorStop(1, F.bot);
    x.lineWidth = Math.max(1.2, cell * 0.075);
    x.strokeStyle = eg;
    x.stroke();
    x.restore();

    // Faseta çizgileri aynı gradyanı taşıyor, beyaz değil: beyaz çizgi iki
    // tonlu taşta ortadan bölünmüş gibi duruyordu.
    x.strokeStyle = eg;
    x.globalAlpha = 0.75;
    x.lineWidth = Math.max(1, cell * 0.038);
    x.beginPath();
    x.moveTo(cx - w / 2, gy); x.lineTo(cx + w / 2, gy);
    x.moveTo(cx - tw, ty);    x.lineTo(cx, by);
    x.moveTo(cx + tw, ty);    x.lineTo(cx, by);
    x.stroke();
    x.globalAlpha = 1;
  }

  // PAD, sprite'ın hücreden taşma payı. Baş hücreyi %18 aşıyor ve dil
  // merkezden ~0.74 hücre uzağa gidiyor, yani pay en az 0.24 hücre olmalı;
  // 0.62 hem bunu hem parlamayı rahat karşılıyor.
  function buildSprites() {
    PAD = Math.max(5, Math.round(cell * 0.62));
    SP = cell + PAD * 2;
    sprBody = makeSprite(SP, (x) => drawCube(x, PAD, PAD, cell));

    // Dört yön ÜRETİM ANINDA pişiriliyor, her karede değil. Canvas
    // dönüşümü yok: drawHead yönü kendisi yerleştiriyor (bkz. oradaki not).
    sprHead = [];
    for (let d = 0; d < 4; d++) {
      sprHead.push(makeSprite(SP, (x) => drawHead(x, d)));
    }
    sprFood = makeSprite(SP, drawGem);
  }

  function blit(spr, px, py) {
    ctx.drawImage(spr.cv, px - PAD, py - PAD, spr.size, spr.size);
  }

  function dirIndex() {
    if (dir.x === 1) return 0;
    if (dir.y === 1) return 1;
    if (dir.x === -1) return 2;
    return 3;
  }

  function paint() {
    if (!ctx || !cell || !sprBody) return;
    ctx.clearRect(0, 0, cell * COLS, cell * ROWS);
    if (food && sprFood) blit(sprFood, food.x * cell, food.y * cell);
    // Kuyruktan başa doğru: baş her zaman üstte kalsın.
    for (let i = snake.length - 1; i >= 1; i--) {
      blit(sprBody, snake[i].x * cell, snake[i].y * cell);
    }
    if (snake.length) blit(sprHead[dirIndex()], snake[0].x * cell, snake[0].y * cell);
  }

  // ═══════════ YERLEŞİM ═══════════
  // Hücre boyutu tam sayı: ızgara noktaları (CSS arka planı) ve sprite
  // blit'leri piksel hizasında kalsın.
  function layout() {
    if (!wrapEl || !cv) return false;
    const availW = wrapEl.clientWidth, availH = wrapEl.clientHeight;
    if (!availW || !availH) return false;
    const c = Math.min(
      Math.floor((availW - 12) / COLS),
      Math.floor((availH - 12) / ROWS),
      CELL_MAX
    );
    if (c < 6) return false;
    cell = c;
    const W = cell * COLS, H = cell * ROWS;
    arenaEl.style.width = W + 'px';
    arenaEl.style.height = H + 'px';
    arenaEl.style.setProperty('--snk-cell', cell + 'px');
    arenaEl.style.setProperty('--snk-digit', Math.round(cell * 1.5) + 'px');
    // DPR 2'de sınırlı: tahta tikte bir kez çiziliyor, 3x buffer'ın
    // görünür bir karşılığı yok ama zayıf cihazda fill-rate'i üçe katlar.
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function ensureLayout() {
    layoutRaf = 0;
    if (layout()) { buildSprites(); paint(); return; }
    // Tuval ölçüsü layout'a bağlı; hazır olana kadar bekle. Üst sınır,
    // ekran hiç görünür olmazsa sonsuz döngüye girmemek için.
    if (++layoutTries > 60) return;
    layoutRaf = requestAnimationFrame(ensureLayout);
  }

  // ═══════════ OYUN DÖNGÜSÜ ═══════════
  function tickMs() {
    return Math.max(TICK_MIN, TICK_START - (snake.length - START_LEN) * TICK_STEP);
  }
  function stopTimer() { if (timer) { clearTimeout(timer); timer = 0; } }
  function startTimer() { stopTimer(); timer = setTimeout(loop, tickMs()); }
  function loop() {
    timer = 0;
    step();
    if (alive && !waiting) timer = setTimeout(loop, tickMs());
  }

  function step() {
    if (!alive || waiting) return;
    if (queue.length) dir = queue.shift();

    const head = snake[0];
    // SARMALAMA (wrap): bir kenardan çıkan yılan karşı kenardan girer.
    // Referans oyunun davranışı bu (sahibin kararı, 2026-08-08) — duvar
    // ÖLDÜRMEZ. Sonuç: oyunun tek kaybetme durumu kendine çarpmak, yani
    // ölüm her zaman oyuncunun kendi izinden gelir. Neon çerçeve bir duvar
    // değil, bir geçit.
    const nx = (head.x + dir.x + COLS) % COLS;
    const ny = (head.y + dir.y + ROWS) % ROWS;

    const grow = !!food && nx === food.x && ny === food.y;
    const tail = snake[snake.length - 1];
    let blocked = occ[ny * COLS + nx] === 1;
    // Kuyruğun SON hücresi bu tikte boşalıyor (büyümüyorsak): kuyruğun
    // ucunu takip etmek klasik yılanda geçerli bir hamledir.
    if (blocked && !grow && nx === tail.x && ny === tail.y) blocked = false;
    if (blocked) { die(); return; }

    // Sıra ÖNEMLİ: önce kuyruk boşalır, sonra baş yazılır. Tersi olsaydı
    // kuyruk-takibi durumunda pop, başın az önce işaretlediği hücreyi
    // temizlerdi (yılan kendi başını "yok" sanardı).
    if (!grow) {
      const t = snake.pop();
      occ[t.y * COLS + t.x] = 0;
    }
    snake.unshift({ x: nx, y: ny });
    occ[ny * COLS + nx] = 1;

    if (grow) eat();
    paint();
  }

  function eat() {
    score += FOOD_SCORE;
    syncScore();
    GameAudio.play('diamond');
    GameAudio.haptic(12);
    spawnFood();
  }

  // Yem asla yılanın üstüne düşmez: seçim yalnızca BOŞ hücreler arasından.
  function spawnFood() {
    const free = [];
    for (let i = 0; i < occ.length; i++) if (!occ[i]) free.push(i);
    if (!free.length) { food = null; boardFilled(); return; }
    const k = free[(Math.random() * free.length) | 0];
    food = { x: k % COLS, y: (k / COLS) | 0 };
  }

  function syncScore() {
    if (scoreEl) scoreEl.textContent = String(score);
    // Kabuğun skor kapsülü bu oyunda gizli (ownsScoreDisplay) ama değeri
    // güncel tutuluyor: "Skor 2x" düğmesi o elemanı okuyor.
    if (typeof updateGameScore === 'function') updateGameScore(score);
  }

  // ═══════════ BİTİŞ ═══════════
  // Tek kaybetme yolu: kendine çarpmak (duvarlar sarmalıyor, bkz. step).
  function die() {
    if (!alive) return;
    alive = false; over = true;
    stopTimer();
    if (arenaEl) {
      arenaEl.classList.remove('hit');
      void arenaEl.offsetWidth;
      arenaEl.classList.add('hit');
    }
    GameAudio.play('crystalOver');
    GameAudio.haptic([90, 40, 90]);
    best = phHighScore(GID, score);
    gameEvent('game_ended', {
      gameId: 'snakeGame', result: 'lost', score, durationMs: Date.now() - startedAt,
    });
    deathT = setTimeout(() => {
      deathT = 0;
      showGameOver(false, 'Yılan Öldü', 'Kendine çarptın. Uzunluk: ' + snake.length, {
        accent: '#16a341', accentLight: '#8dffa8', accentGlow: 'rgba(60,255,120,.65)',
        mark: '✧',
        stats: [
          { label: 'Skor', value: score.toLocaleString() },
          { label: 'En İyi', value: best.toLocaleString(), record: score >= best && score > 0 },
        ],
        onContinue: revive,
        onRestart: newGame,
      });
    }, 340);
  }

  // Tahtanın tamamen dolması: teorik "mükemmel oyun". Yılanın tek kazanma
  // durumu bu; uydurma bir bitiş değil, kuralların doğal sınırı.
  function boardFilled() {
    alive = false; over = true;
    stopTimer();
    best = phHighScore(GID, score);
    gameEvent('game_ended', {
      gameId: 'snakeGame', result: 'won', score, durationMs: Date.now() - startedAt,
    });
    GameAudio.play('win');
    GameAudio.haptic('win');
    deathT = setTimeout(() => {
      deathT = 0;
      showGameOver(true, 'Tahta Doldu!', 'Yılan bütün tahtayı kapladı.', {
        accent: '#16a341', accentLight: '#8dffa8', accentGlow: 'rgba(60,255,120,.65)',
        mark: '✦',
        stats: [
          { label: 'Skor', value: score.toLocaleString() },
          { label: 'Uzunluk', value: snake.length },
        ],
        onRestart: newGame,
      });
    }, 340);
  }

  // "Devam et" (reklam/elmas/Plus). step() çarpışmada durumu DEĞİŞTİRMEDEN
  // çıktığı için yılan hâlâ ölümden bir kare öncesinde duruyor — devam
  // etmek onu diriltip KONTROLÜ oyuncuya bırakmak demek. Aynı yönde
  // sürseydi bir sonraki tikte yine ölürdü, o yüzden ilk yön girdisine
  // kadar bekliyor. Yeni bir mekanik değil: turu kabuk yeniden açıyor
  // (bkz. app.js _runGameOverContinuation), skor ve uzunluk korunuyor.
  function revive() {
    alive = true; over = false; waiting = true;
    queue.length = 0;
    stopTimer();
    if (arenaEl) arenaEl.classList.remove('hit');
    paint();
    if (typeof showToast === 'function') showToast('🐍 Yön seç ve devam et');
  }

  function newGame() {
    stopTimer();
    if (deathT) { clearTimeout(deathT); deathT = 0; }
    if (arenaEl) arenaEl.classList.remove('hit');
    snake = [];
    occ = new Array(COLS * ROWS).fill(0);
    const hx = (COLS / 2) | 0, hy = (ROWS / 2) | 0;
    for (let i = 0; i < START_LEN; i++) {
      const c = { x: hx - i, y: hy };
      snake.push(c);
      occ[c.y * COLS + c.x] = 1;
    }
    dir = DIRS[0];                 // klasik: sağa doğru, hemen hareketle başlar
    queue.length = 0;
    score = 0; alive = true; waiting = false; over = false;
    startedAt = Date.now();
    spawnFood();
    syncScore();
    // Bir tur = bir yılan canı. Yeniden başlatma yeni bir tur açar;
    // "devam et" AÇMAZ (turu kabuk reopen ediyor).
    gameEvent('game_started', { gameId: 'snakeGame' });
    paint();
    startTimer();
  }

  // ═══════════ GİRDİ ═══════════
  // 180° dönüş, KUYRUĞUN SONUNA göre reddediliyor — o an uygulanan yöne
  // göre değil. Aksi hâlde "yukarı + aşağı" hızlı ikilisi kuyrukta yan
  // yana durur ve yılan kendi boynuna girerdi.
  function turn(nx, ny) {
    if (!alive) return;
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if (nx === -ref.x && ny === -ref.y) return;
    if (waiting) {
      dir = { x: nx, y: ny };
      waiting = false;
      paint();
      startTimer();
      return;
    }
    if (nx === ref.x && ny === ref.y) return;        // aynı yön — kuyruğu doldurma
    if (queue.length >= MAX_QUEUE) return;
    queue.push({ x: nx, y: ny });
  }

  function onKey(e) {
    const m = KEYS[e.key];
    if (!m) return;
    e.preventDefault();
    turn(m[0], m[1]);
  }

  // ═══════════ SAHNE ═══════════
  function css() {
    return `
      /* Tasarımdaki gece LACİVERT (2026-08-08 görseli), mor değil. Ortak
         .ph-scene gökyüzünün üstüne oyunun kendi mekânı geliyor — kabuk
         menekşe kalıyor, yalnızca bu oyunun sahnesi maviye dönüyor. */
      .snk-scene{
        background:
          radial-gradient(ellipse 82% 58% at 50% 44%, rgba(40,80,180,.26) 0%, transparent 72%),
          radial-gradient(ellipse 130% 92% at 50% 50%, #101c47 0%, #05091f 78%);
      }
      .snk-wrap{
        flex:1; align-self:stretch; min-height:0;
        display:flex; align-items:center; justify-content:center;
        position:relative; z-index:1;
      }
      /* Neon çerçeve + ızgara noktaları: ikisi de STATİK, bu yüzden
         canvas'ta değil CSS'te. Nokta kafesi hücre boyutuna kilitli
         (--snk-cell), böylece oyun ızgarasıyla birebir hizalı. */
      .snk-arena{
        position:relative;
        /* Çerçeve artık soluk lavanta-beyaz (görselde macenta değil). */
        border:1.5px solid rgba(206,214,255,.82);
        border-radius:18px;
        background-color:rgba(6,11,34,.55);
        background-image:radial-gradient(circle at center, rgba(150,175,255,.26) 1px, transparent 1.6px);
        background-size:var(--snk-cell) var(--snk-cell);
        background-position:calc(var(--snk-cell) / 2) calc(var(--snk-cell) / 2);
        box-shadow:
          0 0 16px rgba(150,175,255,.26),
          0 0 54px rgba(70,110,230,.12),
          inset 0 0 44px rgba(24,44,110,.28);
        overflow:hidden;
      }
      .snk-cv{display:block}
      /* Skor: tasarımdaki içi boş neon rakam. Dolgu şeffaf, kontur parlak;
         text-shadow gövdeyi değil siluetin çevresini aydınlatıyor. */
      .snk-score{
        position:absolute; z-index:2; pointer-events:none;
        left:calc(var(--snk-cell) * .5); top:calc(var(--snk-cell) * .3);
        font:900 var(--snk-digit)/1 var(--ph-font-display);
        letter-spacing:.04em;
        color:transparent;
        -webkit-text-stroke:calc(var(--snk-digit) * .075) #d8e6ff;
        text-shadow:0 0 10px rgba(150,200,255,.65), 0 0 26px rgba(80,140,255,.32);
      }
      /* Ölüm: TEK, kısa çerçeve darbesi. Sürekli çalışan hiçbir efekt yok. */
      @keyframes snkHit{
        0%,100%{border-color:rgba(206,214,255,.82)}
        35%{border-color:rgba(255,120,140,1);
            box-shadow:0 0 26px rgba(255,80,110,.60), inset 0 0 60px rgba(170,30,60,.28)}
      }
      .snk-arena.hit{animation:snkHit 320ms ease-out}
    `;
  }

  function init(c) {
    container = c;
    layoutTries = 0;
    container.classList.add('ph-scene', 'snk-scene');
    injectStyle('css-snk', css());
    // Tasarımda yalnızca yıldızlar var — huzme ve zerre yok, hem sadık
    // kalmak hem de bedava olmayan katmanları taşımamak için.
    atmoEl = phAtmosphere(container, { stars: 30, beams: 0, motes: 0, skyPct: 96 });

    wrapEl = document.createElement('div');
    wrapEl.className = 'snk-wrap';
    wrapEl.innerHTML =
      '<div class="snk-arena">' +
        '<span class="snk-score">0</span>' +
        '<canvas class="snk-cv"></canvas>' +
      '</div>';
    container.appendChild(wrapEl);

    arenaEl = wrapEl.querySelector('.snk-arena');
    scoreEl = wrapEl.querySelector('.snk-score');
    cv = wrapEl.querySelector('.snk-cv');
    ctx = cv.getContext('2d');

    best = phHighScore(GID);
    newGame();
    ensureLayout();

    // Kaydırma: paylaşımlı phSwipe (2048 ve Labirent'in de kullandığı).
    // Ayrı bir dokunuş matematiği yazmak, eksen kilidi ve fiske eşiği gibi
    // çözülmüş sorunları yeniden çözmek olurdu.
    phSwipe(container, (d) => {
      const m = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[d];
      if (m) turn(m[0], m[1]);
    }, { minDist: 18 });
    addEv(document, 'keydown', onKey);
    addEv(window, 'resize', () => { if (layout()) { buildSprites(); paint(); } });
    // Uygulama arka plana giderse döngü DURUR. Durmasaydı yılan görünmeyen
    // bir tahtada ilerleyip oyuncu ekrana bakmazken ölürdü.
    addEv(document, 'visibilitychange', () => {
      if (document.hidden) stopTimer();
      else if (alive && !waiting) startTimer();
    });
  }

  function cleanup() {
    stopTimer();
    if (deathT) { clearTimeout(deathT); deathT = 0; }
    if (layoutRaf) { cancelAnimationFrame(layoutRaf); layoutRaf = 0; }
    clearEvs();
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) {
      container.innerHTML = '';
      container.classList.remove('ph-scene', 'snk-scene');
    }
    container = wrapEl = arenaEl = cv = scoreEl = null;
    ctx = null;
    sprBody = sprFood = null; sprHead = [];
    snake = []; occ = null; food = null; queue.length = 0;
    cell = 0; alive = false; waiting = false; over = false;
  }

  // Skor sahnenin kendi içinde (tasarımda arenanın sol üstünde), bu yüzden
  // kabuğun SKOR kapsülü gizleniyor — aynı sayı iki yerde durmamalı.
  return { init, cleanup, ownsScoreDisplay: true };
})();

// ═══════════════════════════════════════════════════════════════════════
//  FLAPPY UFO — Arcade (2026-08-08)
// ═══════════════════════════════════════════════════════════════════════
// OYNANIŞ referans oyundan (flappybird.io) ALINDI, GÖRSEL tasarım sahibin
// verdiği SlySwipe görselinden. İki kaynak birbirine karışmıyor: aşağıdaki
// W bloğundaki her sayı referansın davranışını tarif eder, çizim
// bölümündeki her renk tasarım görselini.
//
// PERFORMANS DURUŞU (§4 "hafif arcade" + docs/03):
//  • Simülasyon SABİT 120 Hz adımlarla, çizim rAF'ta. Fizik kare hızına
//    bağlı olsaydı 60 fps'te ve 120 fps'te farklı bir oyun olurdu; skor da
//    cihaza göre değişirdi. Biriktirici (accumulator) bunu keser.
//  • Her şey ÖNCEDEN PİŞMİŞ sprite. Kare başına yalnızca drawImage
//    çağrılıyor (~15 adet); tek bir shadowBlur/filter oyun döngüsünde
//    ÇALIŞMIYOR — hepsi sprite üretiminde bir kez ödendi. (Blok Puzzle ve
//    Yılan'da yerleşmiş kural.)
//  • STATİK olan hiçbir şey oyun tuvalinde değil: yıldızlar DOM'da
//    (phAtmosphere), ay/bulut/ufuk parıltısı ayrı ve BİR KEZ boyanan arka
//    plan tuvalinde. Oyun tuvali yalnızca hareket edeni taşıyor.
//  • Skor DOM'da ve yalnızca DEĞİŞTİĞİNDE yazılıyor.
//  • Parçacık sistemi, blur, filter, canlı gölge, dekoratif animasyon YOK.
PuzzleGames.flappyUfo = (() => {
  // Yalnızca rekor anahtarı için. gameEvent() çağrılarında bilerek
  // kullanılmıyor — tools/game-events-test.js kaynağı tarayıp her çağrının
  // id'sini içinde bulunduğu oyunla karşılaştırıyor ve bir değişkeni
  // çözemez (bkz. snakeGame'deki aynı not).
  const GID = 'flappyUfo';

  // ═══════════ OYNANIŞ SABİTLERİ — REFERANS OYUNDAN ═══════════
  // Birim sistemi referansın kendi "dünya birimi"dir ve İZOTROPTUR (yatay
  // ve dikey aynı ölçek). Piksel değil dünya birimi tutmanın sebebi: aynı
  // sayılar her ekran boyutunda AYNI oyunu üretir — 380px'lik telefonda da
  // 900px'lik tablette de boşluk, gökyüzü yüksekliğinin aynı oranıdır.
  // Piksel sabitleri yazsaydık zorluk cihaza göre değişirdi ve rekor
  // karşılaştırması anlamını yitirirdi (Yılan'ın sabit ızgarasıyla aynı
  // gerekçe, başka bir araçla).
  //
  // Dikey referans: gökyüzü (zemin üstünden tavana) 2.03 birim, altındaki
  // zemin şeridi 0.53 birim, toplam sahne 2.56 birim. y ekseni YUKARI artar
  // ve y=0 UFO'nun başlangıç yüksekliğidir.
  const W = {
    gravity:  5.0,     // birim/sn² — aşağı çeken
    flap:     1.4,     // birim/sn — dokunuşta ANINDA atanan yukarı hız
    fallCap:  2.2,     // birim/sn — düşüş hızı tavanı
    speed:    0.6,     // birim/sn — engellerin sola akış hızı
    gap:      0.47,    // standart boşluk
    // İlk beş engel daha geniş açılıyor. Bu referansın kendi ısınma
    // eğrisi — uydurulmuş bir "kolaylık" değil, oyunun ilk saniyelerinin
    // tasarımı. Altıncıdan sonra sabit 0.47.
    openingGaps: [0.62, 0.59, 0.56, 0.53, 0.50],
    spacing:  1.0,     // engeller arası YATAY mesafe
    pipeW:    0.26,    // engel genişliği
    // ÇARPIŞMA yarıçapı. Görselden BAĞIMSIZ (§3): UFO çizimini
    // büyütmek/küçültmek (UFO_W) fiziği DEĞİŞTİRMEZ. İkisini tek sayıya
    // bağlamak, bir sanat güncellemesinin sessizce zorluk değiştirmesi
    // demekti.
    radius:   0.068,
    gapMin:  -0.20,    // boşluk merkezinin düzgün dağıldığı aralık
    gapMax:   0.80,
    floor:   -0.975,   // UFO'nun ALT kenarı bunun altına inerse çarpma
    skyH:     2.03,    // zemin üstü ← → tavan
    groundH:  0.53,    // dağ/zemin şeridi
    // Eğim: yukarı giderken sabit burun-yukarı, düşerken hıza orantılı.
    // rotMin bir EMNİYET sınırı; düşüş tavanı (2.2) yüzünden pratikte
    // ~-40°'de duruluyor — referansta da öyle, dik burun-aşağı yalnızca
    // tavansız eski sürümlerde görülüyor.
    rotUp:    Math.PI / 8,
    rotMin:  -Math.PI / 2,
    rotK:     0.5,
    bobAmp:   0.05,    // başlangıç ekranındaki süzülme genliği
    bobW:     5.0,     // ve açısal hızı (rad/sn)
  };

  const SCENE_H = W.skyH + W.groundH;      // 2.56 — sahnenin tam yüksekliği
  const TICK = 1 / 120;                    // sabit simülasyon adımı
  // Sekmeden/uygulamadan dönüşte biriken zamanın tavanı. Olmasaydı 30 sn
  // arka planda kalan oyun dönüşte 3600 adımı tek karede işler ve oyuncu
  // geri geldiğinde çoktan ölmüş olurdu.
  const MAX_CATCHUP = 0.25;

  // ═══════════ GÖRSEL SABİTLER — TASARIM GÖRSELİNDEN ═══════════
  const UFO_W = 0.185;                     // UFO'nun ÇİZİM genişliği (≠ radius)
  const TRAIL_L = 0.52;                    // iz uzunluğu (dünya birimi)
  const BIRD_X_FRAC = 0.32;                // UFO'nun sabit ekran x'i
  // Dağlar UFO'dan YAVAŞ akıyor: uzaktalar. Aynı hızda aksalardı
  // engellerle aynı düzlemdeymiş gibi görünürlerdi.
  const MTN_PARALLAX = 0.28;

  const C = {
    hull:     ['#33477f', '#0b1230'],      // gövde gradyanı (üst→alt)
    hullEdge: '#9ed8ff',                   // gövde neon konturu
    dome:     ['#4a6ba8', '#0a1026'],      // kubbe
    domeLite: 'rgba(210,236,255,.85)',     // kubbedeki parlama
    lamp:     '#7ff0ff',                   // alt lambalar
    lampGlow: 'rgba(90,220,255,.55)',
    trail:    'rgba(120,220,255,',         // alfa çağrı yerinde ekleniyor
    pillar:   ['#7fe3ff', '#2b7fd4', '#101a46', '#070c26'],
    capFill:  ['#1a2350', '#080d24'],
    capEdge:  '#9b8cff',                   // tasarımdaki menekşe-mavi kontur
    capLite:  '#8fd4ff',
    // Üç sıradağ katmanı. TASARIMIN İLİŞKİSİ: sis PARLAK, zirveler KOYU —
    // ilk denemede tersi yapılmıştı (açık zirve + açık zemin) ve cihazda
    // her şey solup düz bir mavi levhaya dönüştü. Derinlik, uzaktaki
    // sırtların sise KARIŞMASINDAN geliyor: arka katman açık ve düşük
    // kontrast, ön katman neredeyse siyah.
    // Dağlar gökyüzünden BELİRGİN AÇIK olmak zorunda. İlk denemede
    // "koyu siluet" mantığıyla neredeyse siyah yapılmıştı; gökyüzü de koyu
    // olduğu için dolgu tamamen kayboldu ve geriye yalnızca sırt konturu
    // kaldı — cihazda borsa grafiği gibi ince çizgiler olarak göründü.
    // Sis kaldırıldığı için (sahibin isteği) okunurluğu sağlayan tek şey
    // artık dağın KENDİ tonu; o yüzden dolgu gökyüzünün belirgin üstünde.
    mtnFar:   ['#7089c0', '#37496f'],
    mtnMid:   ['#4d6699', '#212d4c'],
    mtnNear:  ['#2c3d66', '#0c1220'],
    // Zirve sırtındaki ince ışık (kar/ay ışığı).
    mtnLit:   ['rgba(186,214,255,.42)', 'rgba(206,230,255,.55)', 'rgba(226,242,255,.72)'],
    // Her zirvenin AY IŞIĞI ALAN yüzü. Işık hep soldan geliyor; sağ yüz
    // kütlenin kendi gradyanında kalıyor ve fark hacmi üretiyor. Alfa
    // düşük: yüz ayrı bir renk değil, aynı kayanın aydınlanmış hâli.
    mtnFace:  ['rgba(196,220,255,.20)', 'rgba(186,214,255,.20)', 'rgba(176,206,255,.19)'],
    // Zirve karı — arkada daha soluk (atmosfer), önde daha parlak.
    mtnSnow:  ['rgba(226,240,255,.46)', 'rgba(234,246,255,.60)', 'rgba(244,251,255,.78)'],
    // SİS KALDIRILDI (2026-08-08, sahibin isteği). Bandın tamamını kaplayan
    // açık bir levhaydı ve iki ayrı hataya birden sebep oluyordu: üstteki
    // gece tonundan kopup ekranı "alt/üst iki ayrı ekran" gibi bölüyor,
    // ayrıca her şeyi soluklaştırıyordu. Artık bantta SADECE silüetler ve
    // bulutlar çiziliyor; gökyüzü gradyanı kesintisiz görünüyor.
    cloud:    'rgba(196,220,255,',
    moon:     ['#c8d6ee', '#59688c'],
  };

  // ═══════════ ARKA PLAN GÖRSELİ ═══════════
  // Tasarımın manzarası bir İLLÜSTRASYON: hacimli bulut kütleleri, ışıklı
  // vadi, dokulu onlarca kayalık. Canvas'ta poligon+gradyanla yeniden
  // çizmek denendi ve elendi (birden çok tur; en iyi hâli bile "benzer"
  // kalıyordu, "aynı" olmuyordu). Doğru araç, tasarımın kendisini bir
  // varlık olarak taşımak — depoda emsali var (Resim Kaydır'ın yerel
  // havuzu, splash-hero.jpg).
  //
  // Görsel bulunamazsa oyun BOZULMAZ: prosedürel çizim yedek olarak
  // duruyor (paintBackdrop'un else dalı). Aynı savunma Resim Kaydır'ın
  // yerel görsel zincirinde de var.
  const BG_SRC = 'assets/flappy/bg.jpg';
  // Modül düzeyinde: oyun her açıldığında yeniden çözülmesin.
  let bgImg = null, bgReady = false, bgFailed = false;

  function ensureBg(onDone) {
    if (bgReady || bgFailed) { onDone(); return; }
    if (bgImg) { bgImg.addEventListener('load', onDone); return; }
    bgImg = new Image();
    bgImg.onload = () => { bgReady = true; onDone(); };
    bgImg.onerror = () => { bgFailed = true; bgImg = null; onDone(); };
    bgImg.src = BG_SRC;
  }

  // "cover" yerleşimi, ALTA yaslı: manzaranın dibi her zaman ekranın
  // dibinde dursun — kırpma tepeden olsun, dağlardan değil.
  function paintBgImage() {
    const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
    if (!iw || !ih) return false;
    const s = Math.max(AW / iw, AH / ih);
    const w = iw * s, h = ih * s;
    bgx.drawImage(bgImg, (AW - w) / 2, AH - h, w, h);
    return true;
  }

  // ═══════════ DURUM ═══════════
  let container, wrapEl, arenaEl, bgCv, bgx, cv, ctx;
  let scoreEl, bestEl, startEl, startBestEl;
  let atmoEl = null;

  let AW = 0, AH = 0, U = 0, dpr = 1;
  let originY = 0, groundTopPx = 0, birdPx = 0;
  let sprUfo = null, sprBody = null, sprCapDown = null, sprCapUp = null;
  let mtnCv = null, mtnTileW = 0, mtnTileH = 0, mtnTop = 0, bodyPad = 0;
  // İzin geçmişi (ekran pikseli). Sprite DEĞİL: bkz. paintTrail.
  let trail = [];
  let paused = false;

  // 'ready'  → başlangıç ekranı (UFO süzülür)   · 'play'   → oyun
  // 'dying'  → çarptı, düşüyor                  · 'over'   → tur bitti, panel
  // 'revive' → reklamla devam edildi, İLK DOKUNUŞA kadar donuk
  let state = 'ready';
  let y = 0, vy = 0, rot = 0, pipes = [], spawned = 0;
  let score = 0, best = 0, startedAt = 0;
  let mtnScroll = 0, elapsed = 0, acc = 0, lastT = 0;
  let raf = 0, overT = 0, layoutRaf = 0, layoutTries = 0;

  // ═══════════ ÇİZİM YARDIMCILARI ═══════════
  function rr(x, px, py, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function makeSprite(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(x);
    return { cv: c, w: w, h: h };
  }

  // Küçük deterministik üreteç. Dağ siluetinin ekran döndürmede /
  // yeniden boyutlandırmada AYNI kalması için: Math.random olsaydı her
  // resize'da manzara değişir ve oyuncuya "bir şey bozuldu" hissi verirdi.
  // core/rng.js günlük tohum içindir; buradaki ihtiyaç ayrı ve oynanışa
  // dokunmuyor.
  function lcg(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ═══════════ SPRITE ÜRETİMİ ═══════════
  // UFO — tasarımdaki uçan daire: koyu metalik gövde, üstte camsı kubbe,
  // altta üç parlayan lamba. Tek sprite; yön EĞİMLE (canvas rotate)
  // veriliyor, çünkü daire simetrik — Yılan'ın kafasındaki "döndürme yüzü
  // bozar" sorunu burada YOK.
  function drawUfo(x, w) {
    const h = w * 0.62;
    const cx = w / 2, cy = h * 0.62;
    const rx = w / 2, ry = w * 0.135;

    // Alt parıltı — tasarımdaki mavi huzme. Radyal gradyan, blur değil.
    const gl = x.createRadialGradient(cx, cy + ry * 0.6, 0, cx, cy + ry * 0.6, w * 0.42);
    gl.addColorStop(0, 'rgba(120,225,255,.42)');
    gl.addColorStop(1, 'rgba(120,225,255,0)');
    x.fillStyle = gl;
    x.beginPath();
    x.ellipse(cx, cy + ry * 0.9, w * 0.42, w * 0.26, 0, 0, Math.PI * 2);
    x.fill();

    // Kubbe — gövdenin ARKASINDA başlayıp üstüne biniyor.
    const dr = w * 0.27;
    const dg = x.createRadialGradient(cx - dr * 0.35, cy - dr * 0.9, dr * 0.1,
                                      cx, cy - dr * 0.3, dr * 1.3);
    dg.addColorStop(0, C.dome[0]);
    dg.addColorStop(1, C.dome[1]);
    x.fillStyle = dg;
    x.beginPath();
    x.ellipse(cx, cy - ry * 0.35, dr, dr * 0.95, 0, Math.PI, 0);
    x.fill();
    x.lineWidth = Math.max(1, w * 0.018);
    x.strokeStyle = 'rgba(158,216,255,.75)';
    x.stroke();
    // Kubbedeki parlama ve birkaç benek — görseldeki camsı doku.
    x.fillStyle = C.domeLite;
    x.beginPath();
    x.ellipse(cx - dr * 0.34, cy - dr * 0.72, dr * 0.24, dr * 0.14, -0.5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(190,225,255,.34)';
    [[0.30, -0.55, 0.075], [0.05, -0.82, 0.06], [0.48, -0.34, 0.055]].forEach((p) => {
      x.beginPath();
      x.ellipse(cx + dr * p[0], cy + dr * p[1], dr * p[2], dr * p[2], 0, 0, Math.PI * 2);
      x.fill();
    });

    // Gövde (disk).
    const hg = x.createLinearGradient(cx, cy - ry, cx, cy + ry);
    hg.addColorStop(0, C.hull[0]);
    hg.addColorStop(1, C.hull[1]);
    x.fillStyle = hg;
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = Math.max(1, w * 0.022);
    x.strokeStyle = C.hullEdge;
    x.stroke();
    // Üst kenardaki ince ışık şeridi — diskin hacmini veren şey bu.
    x.strokeStyle = 'rgba(190,232,255,.55)';
    x.lineWidth = Math.max(1, w * 0.016);
    x.beginPath();
    x.ellipse(cx, cy - ry * 0.22, rx * 0.82, ry * 0.5, 0, Math.PI, 0);
    x.stroke();

    // Üç alt lamba.
    [-0.52, 0, 0.52].forEach((f) => {
      const lx = cx + rx * f, ly = cy + ry * 0.62;
      const lr = w * 0.055;
      const lg = x.createRadialGradient(lx, ly, 0, lx, ly, lr * 2.6);
      lg.addColorStop(0, C.lamp);
      lg.addColorStop(0.35, C.lampGlow);
      lg.addColorStop(1, 'rgba(90,220,255,0)');
      x.fillStyle = lg;
      x.beginPath();
      x.arc(lx, ly, lr * 2.6, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = C.lamp;
      x.beginPath();
      x.arc(lx, ly, lr * 0.72, 0, Math.PI * 2);
      x.fill();
    });
  }

  // İz — UFO'nun GERÇEK YOLUNU takip eden şerit (2026-08-08'de yeniden
  // yazıldı, sahibin geri bildirimi: "sanki biri çubukla tutuyormuş gibi").
  //
  // Eskisi TEK BİR SPRITE'tı ve her karede UFO'nun soluna yatay olarak
  // yapıştırılıyordu — yani UFO yükselip alçalırken iz olduğu gibi kalıyor,
  // aracın arkasına saplanmış sabit bir çubuk gibi okunuyordu. Doğrusu izin
  // aracın geçtiği yeri göstermesi: yukarı çıkıldığında iz aşağıda kalmalı,
  // dalga gibi kıvrılmalı.
  //
  // Bu yüzden artık bir GEÇMİŞ TUTULUYOR: `trail` dizisi UFO'nun ekranda
  // bulunduğu son noktaları saklıyor ve her tikte hepsi engellerle AYNI
  // hızda sola kayıyor — yani iz dünyada sabit duruyor, geride bırakılıyor.
  // Dalgalanma böyle kendiliğinden çıkıyor; ayrıca sallanma animasyonu
  // eklemeye gerek yok, hareketin kendisi zaten dalgayı üretiyor.
  //
  // MALİYET: kare başına tek bir path fill + 4 küçük daire. Parçacık
  // sistemi DEĞİL — parçacıkların kendi ömrü/hızı/fiziği olur, buradaysa
  // nokta sayısı sabit ve tek yaptığı şey konumları kaydırmak.
  const TRAIL_STEPS = 24;                  // şeridi tanımlayan nokta sayısı

  function pushTrail(px, py) {
    const step = (TRAIL_L * U) / TRAIL_STEPS;
    const last = trail.length ? trail[trail.length - 1] : null;
    // Nokta yalnızca yeterince yol alınınca ekleniyor: her tikte eklemek
    // 120 nokta/sn demekti ve şeklin çözünürlüğüne hiçbir şey katmıyordu.
    if (!last || px - last.x >= step) trail.push({ x: px, y: py });
    const len = TRAIL_L * U;
    while (trail.length && px - trail[0].x > len) trail.shift();
  }

  function paintTrail(uy) {
    if (trail.length < 2) return;
    const len = TRAIL_L * U;
    const maxW = UFO_W * U * 0.20;
    // En yeni nokta HER ZAMAN UFO'nun kendisi: şerit araca yapışık
    // başlamalı, yoksa kuyrukla gövde arasında boşluk açılıyor.
    const pts = [{ x: birdPx, y: uy }];
    for (let i = trail.length - 1; i >= 0; i--) pts.push(trail[i]);

    // Genişlik uçta sıfıra iniyor (sivri kuyruk), UFO'da en kalın.
    const halfW = (p) => {
      const t = Math.min(1, (birdPx - p.x) / len);
      return maxW * (1 - t) * (1 - t * 0.45);
    };

    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const w = halfW(pts[i]);
      i === 0 ? ctx.moveTo(pts[i].x, pts[i].y - w) : ctx.lineTo(pts[i].x, pts[i].y - w);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const w = halfW(pts[i]);
      ctx.lineTo(pts[i].x, pts[i].y + w);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(birdPx - len, 0, birdPx, 0);
    g.addColorStop(0.00, C.trail + '0)');
    g.addColorStop(0.45, C.trail + '.26)');
    g.addColorStop(0.80, C.trail + '.62)');
    g.addColorStop(1.00, 'rgba(200,246,255,.95)');
    ctx.fillStyle = g;
    ctx.fill();

    // Görseldeki kopuk zerreler — şeridin ÜSTÜNDE, yani onlar da yolu
    // takip ediyor. Sabit oranlarda örneklendiği için sayıları hiç artmıyor.
    [0.30, 0.48, 0.64, 0.80].forEach((f) => {
      const i = Math.min(pts.length - 1, Math.round(f * (pts.length - 1)));
      const p = pts[i];
      const t = Math.min(1, (birdPx - p.x) / len);
      ctx.fillStyle = C.trail + (0.55 * (1 - t)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, maxW * 0.55 * (1 - t) + 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Engel gövdesi — tasarımdaki neon sütun. DİKEYDE TEKDÜZE olduğu için tek
  // bir kısa dilim üretilip istenen boya GERİLİYOR; gerilme dikeyde
  // kusursuzdur çünkü değişen hiçbir şey yok. Her boy için ayrı sprite
  // üretmek (ve her boşluk değişiminde yeniden üretmek) bedava değildi.
  function buildBody(pw, pad) {
    const w = pw + pad * 2, h = 24;
    return makeSprite(w, h, (x) => {
      const g = x.createLinearGradient(pad, 0, pad + pw, 0);
      g.addColorStop(0.00, C.pillar[0]);
      g.addColorStop(0.07, C.pillar[1]);
      g.addColorStop(0.20, C.pillar[2]);
      g.addColorStop(0.50, C.pillar[3]);
      g.addColorStop(0.80, C.pillar[2]);
      g.addColorStop(0.93, C.pillar[1]);
      g.addColorStop(1.00, C.pillar[0]);
      x.fillStyle = g;
      x.fillRect(pad, 0, pw, h);
      // Kenar neonu ve DIŞA taşan parıltısı. shadowBlur burada bir kez
      // ödeniyor — oyun döngüsünde asla.
      x.save();
      x.shadowColor = 'rgba(130,225,255,.9)';
      x.shadowBlur = pad * 1.5;
      x.strokeStyle = C.pillar[0];
      x.lineWidth = Math.max(1.2, pw * 0.055);
      [pad, pad + pw].forEach((lx) => {
        x.beginPath();
        x.moveTo(lx, -2);
        x.lineTo(lx, h + 2);
        x.stroke();
      });
      x.restore();
    });
  }

  // Boşluğa bakan uçtaki bilezik. Tasarımda gövdeden GENİŞ ve menekşe-mavi
  // konturlu. up=true → bilezik yukarı bakıyor (alttaki engel).
  function buildCap(pw, pad, up) {
    const cw = pw * 1.26, ch = Math.max(6, pw * 0.34);
    const w = cw + pad * 2, h = ch + pad * 2;
    return makeSprite(w, h, (x) => {
      const bx = pad, by = pad;
      x.save();
      x.shadowColor = 'rgba(150,130,255,.75)';
      x.shadowBlur = pad * 1.4;
      const g = x.createLinearGradient(0, by, 0, by + ch);
      g.addColorStop(0, up ? C.capFill[0] : C.capFill[1]);
      g.addColorStop(1, up ? C.capFill[1] : C.capFill[0]);
      x.fillStyle = g;
      rr(x, bx, by, cw, ch, ch * 0.26);
      x.fill();
      x.lineWidth = Math.max(1.2, pw * 0.05);
      x.strokeStyle = C.capEdge;
      rr(x, bx, by, cw, ch, ch * 0.26);
      x.stroke();
      x.restore();
      // Boşluğa bakan kenardaki parlak çizgi — bileziği "ışıklı ağız"
      // yapan detay.
      const ly = up ? by + ch * 0.18 : by + ch * 0.82;
      x.strokeStyle = C.capLite;
      x.lineWidth = Math.max(1, pw * 0.035);
      x.beginPath();
      x.moveTo(bx + cw * 0.14, ly);
      x.lineTo(bx + cw * 0.86, ly);
      x.stroke();
    });
  }

  // Dağ şeridi — KUSURSUZ DÖNEN bir döşeme. Son tepe noktası ilkiyle aynı
  // yüksekliğe zorlanıyor (hs[n] = hs[0]), yoksa döşeme sınırında görünür
  // bir dikiş kalırdı. Sis en üste PİŞİRİLİYOR (ayrı bir katman değil):
  // şerit kayarken sis de kayar ama yatayda tekdüze olduğu için fark
  // edilmez, buna karşılık dağların üstünü örttüğü için ölüm çizgisi keskin
  // bir kenar değil bir sis bandı gibi okunur.
  // ORTA-NOKTA YER DEĞİŞTİRME (midpoint displacement) ile sırt hattı.
  // Eski hâli tepe/vadi diye ALTERNATİF noktalardan ibaretti, yani düzgün
  // aralıklı testere dişi — sahibin "çok basit duruyor" dediği şey buydu.
  // Bu algoritma her adımda aralığı ikiye bölüp orta noktayı rastgele
  // kaydırıyor ve genliği yarılıyor; sonuç, büyük sırtların üstünde küçük
  // sivrilerin olduğu ÖZBENZER bir silüet — gerçek dağ siluetinin kendisi.
  //
  // İki uç DEĞER OLARAK EŞİT tutuluyor (a[0] = a[n-1]); döşemenin dikişsiz
  // dönmesinin tek şartı bu.
  // ÜÇGEN ZİRVE ZARFI. Orta-nokta yer değiştirme (fraktal gürültü) burada
  // DENENDİ ve ELENDİ: her ölçekte eşit dağılmış gürültü ürettiği için
  // silüet, tasarımdaki sivri kayalıklara değil bir borsa grafiğine
  // benziyordu (cihazda iki kez görüldü — sönüm katsayısını değiştirmek
  // yalnızca gürültünün frekansını değiştirdi, karakterini değil).
  //
  // Doğru araç zarf: her tepe bir ÜÇGEN (konum, yükseklik, taban genişliği)
  // ve silüet bunların üst zarfı. Farklı genişlikteki üçgenler üst üste
  // binince büyük zirvelerin omuzlarında küçük tepeler kendiliğinden
  // oluşuyor — tasarımdaki kompozisyon bu.
  //
  // Dikişsizlik yapıdan geliyor: her tepenin ±1 kaydırılmış kopyaları da
  // hesaba katılıyor, yani kenardan taşan bir zirve öbür kenardan giriyor.
  // floor: vadilerin inebileceği en alçak yükseklik. 0 bırakılırsa zirveler
  // arasında tabana kadar inen derin V'ler oluşuyor ve sıradağ "ayrık
  // üçgenler" gibi duruyor; tasarımda ise zirveler kesintisiz bir kütleden
  // yükseliyor.
  // Zirveleri de GERİ DÖNDÜRÜYOR: siluet tek başına yetmiyor. Düz doldurulan
  // bir siluet, ne kadar iyi şekillendirilirse şekillendirilsin, "dağ" değil
  // "grafik" gibi okunuyor (cihazda görüldü) — çünkü hacim gölgeden gelir.
  // Zirvelerin listesi elde olunca her birinin AYDINLIK yüzü ayrıca
  // boyanabiliyor (bkz. layer).
  function peakRidge(nPeaks, minH, maxH, minW, maxW, floor, samples, rnd) {
    const P = [];
    for (let i = 0; i < nPeaks; i++) {
      P.push({
        x: (i + 0.5 + (rnd() - 0.5) * 0.72) / nPeaks,
        h: minH + rnd() * (maxH - minH),
        w: minW + rnd() * (maxW - minW),
      });
    }
    const env = new Array(samples + 1);
    for (let s = 0; s <= samples; s++) {
      const x = s / samples;
      let h = 0;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        for (let k = -1; k <= 1; k++) {
          const d = Math.abs(x - (p.x + k));
          if (d < p.w) {
            const v = p.h * (1 - d / p.w);
            if (v > h) h = v;
          }
        }
      }
      env[s] = h < floor ? floor : h;
    }
    return { env, peaks: P };
  }

  // Dağ şeridi — KUSURSUZ DÖNEN döşeme, ÜÇ KATMAN (görseldeki gibi geriye
  // doğru açılan sıradağlar). Arkadaki katman açık ve puslu, öndeki koyu ve
  // yüksek; aradaki pus farkı derinliği veren şey. Sis en üste PİŞİRİLİYOR:
  // şerit kayarken sis de kayar ama yatayda tekdüze olduğu için fark
  // edilmez, buna karşılık tepeleri örttüğü için ölüm çizgisi keskin bir
  // kenar değil bir sis bandı gibi okunur.
  // Manzara şeridi — dağlar VE bulutlar TEK döşemede, çünkü ikisi de aynı
  // hızda kaymak zorunda. Önceden bulutlar statik arka plan tuvalindeydi
  // ve yalnızca dağlar kayıyordu; sahibin "ekranın alt tarafı hareket
  // ederken üst tarafı etmiyor, bütün değil" dediği şey buydu. Manzara tek
  // parça olarak hareket edince sorun kaynağında bitiyor.
  //
  // Bantta ARKA PLAN DOLGUSU YOK: yalnızca silüetler ve bulutlar
  // çiziliyor, altındaki gökyüzü gradyanı kesintisiz görünüyor. Eskiden
  // buraya boydan boya bir "sis denizi" boyanıyordu ve ekranı ikiye
  // bölüyordu (bkz. palet notu).
  function buildMountains() {
    mtnTileW = Math.max(260, Math.round(AW * 1.6));
    // Bulutlar zirvelerin üstüne çıktığı için şerit yüksek başlıyor.
    // Zirvelerin kendisi ölüm çizgisinin biraz üstüne taşıyor: dağlar arka
    // plandır, oyun alanının duvarı değil.
    // Şerit, bulutların TAMAMINI içine alacak kadar yüksek başlamak
    // zorunda: kabarcıklar döşemenin üst kenarını aşarsa orada KIRPILIYOR
    // ve ekranı boydan boya kesen sert bir yatay çizgi bırakıyorlar
    // (cihazda görüldü, "alt/üst iki ayrı ekran" hissinin ikinci sebebi).
    mtnTop = Math.max(0, groundTopPx - Math.round(0.95 * U));
    mtnTileH = Math.max(8, Math.round(AH - mtnTop));
    const peakBand = Math.round(AH - (groundTopPx - 0.30 * U));   // dağların payı
    mtnCv = makeSprite(mtnTileW, mtnTileH, (x) => {
      const band = mtnTileH;
      const mtnTopInTile = band - peakBand;      // dağ silüetlerinin tavanı

      // ── Bulutlar — döşemenin ÜST kısmı, zirvelerin arkasında ──
      // Dikişsizlik: kenara taşan her kabarcık bir de karşı kenarda
      // çiziliyor (±mtnTileW).
      const crnd = lcg(4242);
      const clusters = 9;
      for (let c = 0; c < clusters; c++) {
        const t = c / (clusters - 1);
        // Yoğunluk KENARLARDA: görselde iki yanda yükselen, ortada vadinin
        // ışığına yer bırakan bir düzen var.
        const edge = Math.abs(t - 0.5) * 2;
        const cx = mtnTileW * (t + (crnd() - 0.5) * 0.07);
        // Bulutlar zirvelerin dibinden başlayıp yukarı tırmanıyor; tırmanma
        // payı döşemenin İÇİNDE kalacak şekilde sınırlı.
        const rise = Math.max(0, mtnTopInTile - band * 0.10);
        const cy = mtnTopInTile + peakBand * 0.04
                 - rise * (edge * edge * 0.88 + crnd() * 0.10);
        const scale = mtnTileW * (0.045 + crnd() * 0.03) * (0.7 + edge * 0.8);
        const puffs = 8 + ((crnd() * 5) | 0);
        for (let p = 0; p < puffs; p++) {
          const a = crnd() * Math.PI * 2, d = Math.sqrt(crnd()) * scale;
          const px = cx + Math.cos(a) * d * 1.55;
          const py = cy + Math.abs(Math.sin(a)) * d * -0.50 + scale * 0.16;
          const pr = scale * (0.30 + crnd() * 0.40);
          const alpha = (0.20 + crnd() * 0.14).toFixed(2);
          // Üst kenarı aşan kabarcık ÇİZİLMEZ. Kırpılmış bir kabarcık
          // düz bir kesik bırakır; eksik bir kabarcık ise fark edilmez.
          if (py - pr < 1) continue;
          [px - mtnTileW, px, px + mtnTileW].forEach((qx) => {
            if (qx + pr < 0 || qx - pr > mtnTileW) return;
            const g = x.createRadialGradient(qx, py - pr * 0.30, pr * 0.10, qx, py, pr);
            g.addColorStop(0, C.cloud + alpha + ')');
            g.addColorStop(0.5, C.cloud + '.06)');
            g.addColorStop(1, C.cloud + '0)');
            x.fillStyle = g;
            x.beginPath();
            x.arc(qx, py, pr, 0, Math.PI * 2);
            x.fill();
          });
        }
      }

      // Bir sıradağ katmanı. ÜÇ GEÇİŞ:
      //   1) siluet dolgusu — kütleyi kurar,
      //   2) her zirvenin AYDINLIK yüzü — hacmi kuran şey bu,
      //   3) zirvelerdeki kar + sırt ışığı — malzemeyi kurar.
      // Yalnızca (1) yapıldığında dağlar düz bir siluet, yani "grafik" gibi
      // okunuyordu; ışık hep TEK yönden (soldan) geldiği için her zirvenin
      // sol yüzü açık, sağ yüzü gradyanın kendi tonunda kalıyor ve göz bunu
      // hacim olarak çözüyor.
      const layer = (nPeaks, minH, maxH, minW, maxW, floor, colors, seed, litIdx) => {
        const rnd = lcg(seed);
        const { env, peaks } = peakRidge(nPeaks, minH, maxH, minW, maxW, floor, 240, rnd);
        const n = env.length;
        // Yükseklikler DAĞ PAYINA göre (peakBand), döşemenin tamamına değil:
        // döşeme artık bulutlar için çok daha yüksek. Zarf normalize
        // EDİLMİYOR — etmek katmanların yükseklik farkını, yani derinliği
        // yok ederdi.
        const yOf = (i) => band - peakBand * env[i];
        const silhouette = () => {
          x.beginPath();
          x.moveTo(0, band);
          for (let i = 0; i < n; i++) x.lineTo((i * mtnTileW) / (n - 1), yOf(i));
          x.lineTo(mtnTileW, band);
          x.closePath();
        };

        // 1) Kütle.
        const g = x.createLinearGradient(0, band - peakBand * maxH, 0, band);
        g.addColorStop(0, colors[0]);
        g.addColorStop(1, colors[1]);
        x.fillStyle = g;
        silhouette();
        x.fill();

        // 2) + 3) Siluetin İÇİNE kırpılmış olarak. Kırpma şart: yüz üçgenleri
        // ve kar başlıkları tabana kadar uzanıyor, kırpılmazsa komşu
        // vadilerin üstüne taşarlar.
        x.save();
        silhouette();
        x.clip();

        peaks.forEach((p) => {
          // ±1 kopyalar: kenardan taşan zirvenin yüzü öbür kenarda da olsun.
          [-1, 0, 1].forEach((k) => {
            const px = (p.x + k) * mtnTileW;
            const hw = p.w * mtnTileW;
            if (px + hw < 0 || px - hw > mtnTileW) return;
            const apexY = band - peakBand * p.h;

            // Aydınlık yüz: tepe → sol taban.
            x.fillStyle = C.mtnFace[litIdx];
            x.beginPath();
            x.moveTo(px, apexY);
            x.lineTo(px - hw, band);
            x.lineTo(px, band);
            x.closePath();
            x.fill();

            // Kar başlığı: yalnızca yeterince yüksek zirvelerde, yoksa
            // tepeler "beneklenmiş" görünüyor.
            if (p.h > minH + (maxH - minH) * 0.42) {
              const capH = peakBand * p.h * 0.24;
              const r = capH / (peakBand * p.h);      // tepeden aşağı oran
              x.fillStyle = C.mtnSnow[litIdx];
              x.beginPath();
              x.moveTo(px, apexY);
              x.lineTo(px - hw * r, apexY + capH);
              // Kar hattı düz değil, hafif kırık: doğal görünsün.
              x.lineTo(px - hw * r * 0.35, apexY + capH * 0.72);
              x.lineTo(px + hw * r * 0.30, apexY + capH * 0.92);
              x.lineTo(px + hw * r, apexY + capH);
              x.closePath();
              x.fill();
            }
          });
        });
        x.restore();

        // Sırt hattındaki ince ışık — siluetin dış kenarını ayırır.
        x.strokeStyle = C.mtnLit[litIdx];
        x.lineWidth = Math.max(0.8, peakBand * 0.009);
        x.beginPath();
        for (let i = 0; i < n; i++) {
          const px = (i * mtnTileW) / (n - 1);
          i === 0 ? x.moveTo(px, yOf(i)) : x.lineTo(px, yOf(i));
        }
        x.stroke();
      };

      // Arkadan öne: açık + alçak + geniş tabanlı → koyu + yüksek + sivri.
      // Derinlik pustan değil TON, SİLÜET ve KONTRAST farkından geliyor
      // (sis kaldırıldı, bkz. palet notu).
      // Zirve yükseklikleri bilerek ölçülü: daha yükseği oyun alanına
      // giriyor ve başlangıç kartının arkasını kalabalıklaştırıyordu.
      layer(15, 0.26, 0.50, 0.048, 0.095, 0.19, C.mtnFar,  20260808, 0);
      layer(12, 0.30, 0.62, 0.042, 0.085, 0.15, C.mtnMid,  915231,   1);
      layer(10, 0.34, 0.74, 0.038, 0.075, 0.11, C.mtnNear, 77123,    2);
    });
  }

  // Statik arka plan: ay, ufuk parıltısı, bulutlar. BİR KEZ boyanıyor, oyun
  // boyunca dokunulmuyor. Gökyüzü gradyanı CSS'te (.fufo-arena).
  function paintBackdrop() {
    bgx.clearRect(0, 0, AW, AH);

    // Görsel varsa manzaranın TAMAMI ondan geliyor: ay, yıldızlar,
    // bulutlar, dağlar. Prosedürel katmanların hiçbiri çalışmıyor ve
    // kayan dağ şeridi de kapatılıyor (mtnCv = null) — böylece arka plan
    // TEK PARÇA. Sahibin "alt taraf hareket ederken üst taraf etmiyor,
    // bütün değil" şikâyeti yapısal olarak imkânsız hâle geliyor.
    if (bgReady && bgImg && paintBgImage()) {
      mtnCv = null;
      if (atmoEl) { atmoEl.remove(); atmoEl = null; }   // yıldızlar görselde
      return;
    }

    // Ufuktaki parıltı — tasarımda tepelerin arasından gelen aydınlık.
    // ZAYIF ve manzara şeridinin üst kenarına oturuyor: güçlü/alçak bir
    // parıltı ön planı yıkayıp gökyüzünden kopuk bir levha yaratıyordu.
    const hy = groundTopPx - 0.30 * U;
    const hg = bgx.createRadialGradient(AW * 0.5, hy, 0, AW * 0.5, hy, AW * 0.66);
    hg.addColorStop(0, "rgba(120,168,244,.14)");
    hg.addColorStop(0.5, "rgba(90,140,225,.05)");
    hg.addColorStop(1, "rgba(90,140,225,0)");
    bgx.fillStyle = hg;
    bgx.fillRect(0, 0, AW, AH);

    // BULUTLAR BURADA DEĞİL — kayan manzara şeridine taşındı
    // (buildMountains). Sebebi: burada statik kalıyorlardı ve dağlar
    // kayarken onlar durunca ekran "alt/üst iki ayrı sahne" gibi
    // bölünüyordu. Manzaranın tamamı tek parça hareket etmeli.

    // Ay — tasarımda sol üstte, kraterli.
    const mx = AW * 0.16, my = AH * 0.11, mr = Math.max(14, AW * 0.075);
    const glow = bgx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.6);
    glow.addColorStop(0, 'rgba(150,185,240,.20)');
    glow.addColorStop(1, 'rgba(150,185,240,0)');
    bgx.fillStyle = glow;
    bgx.beginPath();
    bgx.arc(mx, my, mr * 2.6, 0, Math.PI * 2);
    bgx.fill();
    const mg = bgx.createRadialGradient(mx - mr * 0.35, my - mr * 0.4, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, C.moon[0]);
    mg.addColorStop(1, C.moon[1]);
    bgx.fillStyle = mg;
    bgx.beginPath();
    bgx.arc(mx, my, mr, 0, Math.PI * 2);
    bgx.fill();
    const crnd = lcg(909);
    bgx.fillStyle = 'rgba(48,62,92,.45)';
    for (let i = 0; i < 8; i++) {
      const a = crnd() * Math.PI * 2, d = crnd() * mr * 0.72;
      const cr = mr * (0.08 + crnd() * 0.14);
      bgx.beginPath();
      bgx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, cr, 0, Math.PI * 2);
      bgx.fill();
    }
  }

  function buildSprites() {
    const uw = UFO_W * U;
    sprUfo = makeSprite(uw, uw * 0.62, (x) => drawUfo(x, uw));
    // İzin sprite'ı YOK — her karede UFO'nun yolundan çiziliyor (paintTrail).

    const pw = W.pipeW * U;
    bodyPad = Math.max(4, Math.round(pw * 0.22));
    sprBody = buildBody(pw, bodyPad);
    sprCapDown = buildCap(pw, bodyPad, false);
    sprCapUp = buildCap(pw, bodyPad, true);
    // Prosedürel dağlar YALNIZCA görsel yoksa. Görsel beklenirken de
    // çizilmiyor: bir an yanlış manzarayı gösterip sonra değiştirmek,
    // hiç göstermemekten kötü.
    if (bgFailed) buildMountains(); else mtnCv = null;
  }

  // ═══════════ YERLEŞİM ═══════════
  // Dünya birimleri çözünürlükten bağımsız olduğu için yeniden
  // boyutlandırma OYUN DURUMUNU BOZMAZ: yalnızca U (birim başına piksel) ve
  // sprite'lar yenilenir; y/vy/pipes olduğu gibi kalır. Ekran döndürmenin
  // turu öldürmemesinin sebebi bu.
  function layout() {
    if (!wrapEl || !cv) return false;
    const w = wrapEl.clientWidth, h = wrapEl.clientHeight;
    if (!w || !h) return false;
    AW = w; AH = h;
    U = AH / SCENE_H;
    groundTopPx = AH - W.groundH * U;
    originY = groundTopPx + W.floor * U;     // W.floor negatif → yukarı kayar
    birdPx = Math.round(AW * BIRD_X_FRAC);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    [bgCv, cv].forEach((c) => {
      c.style.width = AW + 'px';
      c.style.height = AH + 'px';
      c.width = Math.round(AW * dpr);
      c.height = Math.round(AH * dpr);
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    // Skor rakamı sahneyle birlikte ölçekleniyor.
    arenaEl.style.setProperty('--fufo-digit', Math.round(U * 0.30) + 'px');
    return true;
  }

  function ensureLayout() {
    layoutRaf = 0;
    if (layout()) { buildSprites(); paintBackdrop(); paint(); return; }
    // Tuval ölçüsü layout'a bağlı; hazır olana kadar bekle. Üst sınır,
    // ekran hiç görünür olmazsa sonsuz döngüye girmemek için.
    if (++layoutTries > 60) return;
    layoutRaf = requestAnimationFrame(ensureLayout);
  }

  // ═══════════ KOORDİNAT ═══════════
  const yPx = (wy) => originY - wy * U;
  const xPx = (wx) => birdPx + wx * U;
  // Engellerin doğduğu x: sağ kenarın hemen dışı. Referansın sabit 1.2'si
  // onun kendi ekran oranına göreydi; ekran genişliğinden türetmek her
  // cihazda AYNI görünür ritmi verir (engel tam kenardan girer). Aradaki
  // mesafe zaten W.spacing ile korunduğu için zorluk değişmiyor.
  const spawnX = () => (AW - birdPx) / U + W.pipeW;

  // ═══════════ SİMÜLASYON ═══════════
  const gapFor = (i) => (i < W.openingGaps.length ? W.openingGaps[i] : W.gap);

  // ART ARDA GELEN BOŞLUKLAR BİRBİRİNE ÇOK YAKIN OLMAMALI (2026-08-08,
  // sahibin geri bildirimi: "sütun hizaları hep sıralı gibi, neredeyse
  // hepsi aynı").
  //
  // Referans her engeli BAĞIMSIZ ve düzgün dağılımla seçiyor. Matematiksel
  // olarak doğru ama oynanışta yanıltıcı: bağımsız çekimlerde arka arkaya
  // benzer değerlerin gelmesi olağandır ve oyuncu bunu "hep aynı yükseklik"
  // diye okur — 1.0 birimlik aralıkta iki ardışık boşluğun 0.15'ten yakın
  // olma olasılığı ~%28, yani her dört engelden birinde.
  //
  // Çözüm dağılımı DEĞİŞTİRMEK değil, yalnızca ardışık tekrarı elemek:
  // çekim MIN_GAP_DELTA'dan yakın çıkarsa yeniden çekiliyor. Sınırlı sayıda
  // deneme var — sonsuz döngü riski olmasın ve aralık daralsa bile oyun
  // durmasın. Genel dağılım hâlâ düzgün, sadece "sıralı" hissi gidiyor.
  const MIN_GAP_DELTA = 0.22;
  function nextGapY(prevY) {
    const span = W.gapMax - W.gapMin;
    let v = W.gapMin + Math.random() * span;
    if (prevY == null) return v;
    for (let i = 0; i < 6 && Math.abs(v - prevY) < MIN_GAP_DELTA; i++) {
      v = W.gapMin + Math.random() * span;
    }
    return v;
  }

  function spawnPipe() {
    const last = pipes.length ? pipes[pipes.length - 1] : null;
    // Yeni engel her zaman ÖNCEKİNDEN tam spacing kadar uzağa konuyor, "şu
    // an neredeyse oraya" değil: tik kuantalanması yüzünden mesafe yavaşça
    // kayardı ve ritim bozulurdu.
    pipes.push({
      x: last ? last.x + W.spacing : spawnX(),
      gapY: nextGapY(last ? last.gapY : null),
      gapH: gapFor(spawned),
      passed: false,
    });
    spawned++;
  }

  function flap() {
    vy = W.flap;                              // hız ATANIR, eklenmez
    GameAudio.play('tap');
    GameAudio.haptic('micro');
  }

  // Daire ↔ eksen hizalı dikdörtgen. Engelin ekran dışına taşan kısmı için
  // sonlu ama büyük bir sınır (BIG) yeterli.
  function hitsRect(cx, cy, r, x0, y0, x1, y1) {
    const nx = cx < x0 ? x0 : (cx > x1 ? x1 : cx);
    const ny = cy < y0 ? y0 : (cy > y1 ? y1 : cy);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  const BIG = 12;

  function collides() {
    const r = W.radius;
    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      const x0 = p.x - W.pipeW / 2, x1 = p.x + W.pipeW / 2;
      if (x1 < -r || x0 > r) continue;               // yatayda hiç değmiyor
      const gt = p.gapY + p.gapH / 2, gb = p.gapY - p.gapH / 2;
      if (hitsRect(0, y, r, x0, gt, x1, BIG)) return true;
      if (hitsRect(0, y, r, x0, -BIG, x1, gb)) return true;
    }
    return false;
  }

  function step() {
    elapsed += TICK;

    if (state === 'ready') {
      // Başlangıçta UFO süzülür: yerçekimi yok, engel yok, skor yok.
      // Referansın "getready" hâli — oyun İLK DOKUNUŞLA başlar.
      y = Math.sin(elapsed * W.bobW) * W.bobAmp;
      vy = 0; rot = 0;
      mtnScroll += W.speed * MTN_PARALLAX * TICK * U;
      return;
    }
    if (state === 'revive' || state === 'over') return;

    // Yarı-örtük Euler: önce hız, sonra konum.
    vy -= W.gravity * TICK;
    if (vy < -W.fallCap) vy = -W.fallCap;
    y += vy * TICK;
    rot = vy > 0 ? W.rotUp : Math.max(W.rotMin, W.rotUp + vy * W.rotK);

    if (state === 'dying') {
      // Çarptıktan sonra engeller DURUR, yalnızca UFO düşer. Klasik
      // davranış ve işlevi var: oyuncu neye çarptığını görebilsin.
      if (y - W.radius <= W.floor) { y = W.floor + W.radius; land(); }
      return;
    }

    // ── state === 'play' ──
    mtnScroll += W.speed * MTN_PARALLAX * TICK * U;
    const dx = W.speed * TICK;
    // İz noktaları engellerle AYNI hızda geriye kayıyor: iz dünyada sabit
    // durup geride kalmalı. UFO'nun ekran x'i sabit olduğu için, kaydırmayı
    // yapmazsak iz araca yapışık bir çubuk gibi görünürdü — düzeltilen tam
    // olarak buydu.
    const dpx = dx * U;
    for (let i = 0; i < trail.length; i++) trail[i].x -= dpx;
    pushTrail(birdPx, yPx(y));
    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      p.x -= dx;
      if (!p.passed && p.x <= 0) {            // engel UFO'nun hizasını geçti
        p.passed = true;
        score++;
        syncScore();
        GameAudio.play('scoreTick');
      }
    }
    // Ekranı tamamen terk edenleri at (dizi sınırsız büyümesin).
    while (pipes.length && pipes[0].x < -(birdPx / U + W.pipeW)) pipes.shift();
    if (!pipes.length || pipes[pipes.length - 1].x <= spawnX() - W.spacing) spawnPipe();

    // TAVAN YOK (klasik): UFO ekranın üstüne çıkabilir ve orada ölmez.
    // Tek ölüm sebepleri engel ve zemin.
    if (y - W.radius <= W.floor) { y = W.floor + W.radius; land(); return; }
    if (collides()) hit();
  }

  function hit() {
    if (state !== 'play') return;
    state = 'dying';
    if (vy > 0) vy = 0;                       // yukarı ivme kesiliyor
    GameAudio.play('error');
    GameAudio.haptic([70, 30, 70]);
    if (arenaEl) {
      arenaEl.classList.remove('hit');
      void arenaEl.offsetWidth;
      arenaEl.classList.add('hit');
    }
  }

  function land() {
    if (state === 'over') return;
    if (state === 'play') {                   // doğrudan zemine çarpma
      GameAudio.play('error');
      GameAudio.haptic([70, 30, 70]);
    }
    state = 'over';
    stopLoop();
    updateChrome();                           // duraklat düğmesi kalksın
    paint();
    best = phHighScore(GID, score);
    GameAudio.play('crystalOver');
    gameEvent('game_ended', {
      gameId: 'flappyUfo', result: 'lost', score: score,
      durationMs: Date.now() - startedAt,
    });
    overT = setTimeout(() => {
      overT = 0;
      showGameOver(false, 'Düştün!',
        score === 1 ? '1 geçit geçtin.' : score + ' geçit geçtin.', {
          accent: '#1d5fd6', accentLight: '#9ed8ff', accentGlow: 'rgba(70,170,255,.65)',
          mark: '✧',
          stats: [
            { label: 'Skor', value: score.toLocaleString() },
            { label: 'En İyi', value: best.toLocaleString(), record: score >= best && score > 0 },
          ],
          onContinue: revive,
          onRestart: newGame,
        });
    }, 340);
  }

  // "Devam et" (reklam/elmas/Plus). UFO'nun ÖNÜNÜ AÇMAK zorunlu: oyuncu bir
  // engele çarparak öldü, olduğu yerde diriltirsek aynı engelin içinde
  // uyanır ve ödediği şey boşa gider. Yakın engeller temizlenip UFO orta
  // yüksekliğe alınıyor, sonra İLK DOKUNUŞA kadar donuyor — anında düşmeye
  // başlasaydı oyuncu tepki veremeden yine ölürdü (Yılan'ın 'waiting'
  // durumuyla aynı gerekçe). Skor korunuyor; turu kabuk yeniden açıyor
  // (app.js _runGameOverContinuation).
  function revive() {
    if (overT) { clearTimeout(overT); overT = 0; }
    pipes = pipes.filter((p) => p.x < -W.pipeW || p.x > W.spacing * 1.15);
    y = 0; vy = 0; rot = 0;
    trail = [];                    // eski iz yeni konumla ilgisiz
    paused = false;
    state = 'revive';
    if (arenaEl) arenaEl.classList.remove('hit');
    setStart(false);
    updateChrome();
    paint();
    if (typeof showToast === 'function') showToast('🛸 Dokun ve devam et');
  }

  function newGame() {
    if (overT) { clearTimeout(overT); overT = 0; }
    if (arenaEl) arenaEl.classList.remove('hit');
    pipes = [];
    trail = [];
    paused = false;
    spawned = 0;
    y = 0; vy = 0; rot = 0;
    score = 0;
    elapsed = 0;
    state = 'ready';
    startedAt = Date.now();
    best = phHighScore(GID);
    syncScore();
    setStart(true);
    updateChrome();
    // Bir tur = bir uçuş. Yeniden başlatma yeni tur açar; "devam et" AÇMAZ
    // (turu kabuk reopen ediyor).
    gameEvent('game_started', { gameId: 'flappyUfo' });
    paint();
    startLoop();
  }

  // İlk dokunuş hem oyunu başlatır HEM DE ilk kanat çırpışıdır. Ayırmak
  // ("önce başlat, sonra ayrı bir dokunuşla yüksel") UFO'yu oyuncu daha
  // tepki veremeden düşürürdü; referans da tek dokunuş kullanıyor.
  function onTap() {
    // Duraklamışken ekrana dokunmak DEVAM ETTİRİR ve kanat ÇIRPMAZ. Aksi
    // hâlde oyuncu devam etmek için dokunduğunda UFO bir de zıplardı —
    // duraklatmanın amacı durumu korumak, değiştirmek değil.
    if (paused) { setPaused(false); return; }
    if (state === 'ready' || state === 'revive') {
      const wasReady = state === 'ready';
      state = 'play';
      if (wasReady) { setStart(false); startedAt = Date.now(); }
      flap();
      updateChrome();
      startLoop();
      return;
    }
    if (state === 'play') flap();
  }

  // ═══════════ DURAKLAT ═══════════
  // Referansta duraklatma YOK; bu sahibin açık isteğiyle eklendi
  // (2026-08-08). Oynanışı değiştirmiyor: zaman tamamen donuyor, hiçbir
  // durum sıfırlanmıyor, skor/engel/iz olduğu gibi kalıyor.
  //
  // Yalnızca oyun SÜRERKEN anlamlı: başlangıç ekranında zaten kimse
  // düşmüyor, oyun-sonu panelinde ise zaten duruyor.
  function setPaused(on) {
    if (state !== 'play' && state !== 'revive') return;
    if (paused === on) return;
    paused = on;
    if (arenaEl) arenaEl.classList.toggle('paused', paused);
    // startLoop() biriktiriciyi ve lastT'yi sıfırlıyor; bu ŞART, yoksa
    // duraklamada geçen gerçek süre tek karede fizik adımı olarak işlenir
    // ve oyuncu devam ettiği anda ölür (MAX_CATCHUP bunu sınırlar ama
    // yine de bir sıçrama olurdu).
    if (paused) stopLoop(); else startLoop();
  }

  // Duraklat düğmesi yalnızca oyun sürerken görünür.
  function updateChrome() {
    if (!arenaEl) return;
    arenaEl.classList.toggle('playing', state === 'play' || state === 'revive');
    if (!(state === 'play' || state === 'revive') && paused) {
      paused = false;
      arenaEl.classList.remove('paused');
    }
  }

  // ═══════════ ÇİZİM ═══════════
  function paint() {
    if (!ctx || !U || !sprUfo) return;
    ctx.clearRect(0, 0, AW, AH);

    // Dağ şeridi — döşeme, en fazla 3 drawImage.
    if (mtnCv) {
      const ox = -(mtnScroll % mtnTileW);
      for (let x = ox; x < AW; x += mtnTileW) {
        ctx.drawImage(mtnCv.cv, x, mtnTop, mtnTileW, mtnTileH);
      }
    }

    // Engeller — gövde GERİLİYOR, bilezik olduğu gibi. Engeller dağların
    // ÜSTÜNE çiziliyor (tasarımda da sütunlar manzaranın önünde).
    const pw = W.pipeW * U;
    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      const cx = xPx(p.x);
      if (cx + pw < -bodyPad || cx - pw > AW + bodyPad) continue;
      const left = cx - pw / 2 - bodyPad;
      const gt = yPx(p.gapY + p.gapH / 2);    // boşluğun ÜST kenarı (piksel)
      const gb = yPx(p.gapY - p.gapH / 2);    // boşluğun ALT kenarı
      if (gt > 0) ctx.drawImage(sprBody.cv, left, 0, sprBody.w, gt);
      ctx.drawImage(sprCapDown.cv, cx - sprCapDown.w / 2,
                    gt - sprCapDown.h + bodyPad, sprCapDown.w, sprCapDown.h);
      if (gb < AH) ctx.drawImage(sprBody.cv, left, gb, sprBody.w, AH - gb);
      ctx.drawImage(sprCapUp.cv, cx - sprCapUp.w / 2, gb - bodyPad,
                    sprCapUp.w, sprCapUp.h);
    }

    // UFO (+ iz).
    const uy = yPx(y);
    if (state === 'play' || state === 'dying') paintTrail(uy);
    ctx.save();
    ctx.translate(birdPx, uy);
    // Tuvalde y aşağı artar: burnu YUKARI kaldırmak için ters işaret.
    if (rot) ctx.rotate(-rot);
    ctx.drawImage(sprUfo.cv, -sprUfo.w / 2, -sprUfo.h * 0.62, sprUfo.w, sprUfo.h);
    ctx.restore();
  }

  // ═══════════ DÖNGÜ ═══════════
  // Sabit adımlı biriktirici: ÇİZİM kare hızına, FİZİK saniyeye bağlı.
  // guard, tarayıcının uzun bir duraklamadan sonra döngüyü kilitlemesini
  // engelliyor (MAX_CATCHUP zaten sınırlıyor, bu ikinci emniyet).
  function frame(t) {
    raf = 0;
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (!(dt > 0)) dt = 0;
    if (dt > MAX_CATCHUP) dt = MAX_CATCHUP;
    acc += dt;
    let guard = 0;
    while (acc >= TICK && guard++ < 240) { acc -= TICK; step(); }
    paint();
    if (state === 'ready' || state === 'play' || state === 'dying') {
      raf = requestAnimationFrame(frame);
    }
  }

  function startLoop() {
    if (raf) return;                          // çift döngü koruması
    lastT = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    acc = 0;                                  // birikmiş zaman ATILIYOR
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // ═══════════ HUD ═══════════
  function syncScore() {
    const hi = phHighScore(GID);
    if (scoreEl) scoreEl.textContent = String(score);
    if (bestEl) bestEl.textContent = 'EN İYİ: ' + hi;
    if (startBestEl) startBestEl.textContent = String(hi);
    // Kabuğun skor kapsülü gizli (ownsScoreDisplay) ama değeri güncel
    // tutuluyor: "Skor 2x" düğmesi o elemanı okuyor.
    if (typeof updateGameScore === 'function') updateGameScore(score);
  }

  function setStart(show) {
    if (startEl) startEl.classList.toggle('on', !!show);
  }

  // ═══════════ GİRDİ ═══════════
  function onPointer(e) {
    // pointerdown (click değil): gecikme en düşük olsun — §4'ün istediği
    // "tepkisel kontrol" tam olarak bu. setPointerCapture BİLEREK yok,
    // bkz. CLAUDE.md §5 phCamera tuzağı.
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    onTap();
  }
  function onKey(e) {
    if (e.key !== ' ' && e.key !== 'ArrowUp' && e.key !== 'w' && e.key !== 'W') return;
    e.preventDefault();
    onTap();
  }

  // ═══════════ SAHNE ═══════════
  function css() {
    return `
      /* Tasarımdaki uzay gecesi: koyu lacivert → siyaha yakın. Kabuğun
         menekşe .ph-scene'i yalnızca bu oyunun sahnesinde maviye dönüyor. */
      .fufo-scene{
        background:
          radial-gradient(ellipse 90% 46% at 50% 100%, rgba(46,96,196,.22) 0%, transparent 70%),
          radial-gradient(ellipse 120% 88% at 50% 42%, #0c1738 0%, #04081c 76%);
      }
      .fufo-wrap{
        flex:1; align-self:stretch; min-height:0;
        display:flex; position:relative; z-index:1;
      }
      .fufo-arena{
        position:relative; flex:1; min-height:0; overflow:hidden;
        border-radius:16px;
        border:1px solid rgba(126,110,220,.32);
        /* TEK ve KESİNTİSİZ gece tonu. Önceki hâli dipte #101d46'ya
           çıkıyor, üstüne de tabana oturan güçlü bir mavi radyal
           ekliyordu; sonuç, dağların arasındaki tonun tepedeki gökyüzüyle
           tutmaması ve ekranın "alt/üst iki ayrı sahne" gibi bölünmesiydi
           (sahibin bildirdiği hata). Artık aydınlanma yalnızca ufuktaki
           zayıf parıltıdan geliyor ve o da tuvalde. */
        background: linear-gradient(180deg, #050a1e 0%, #071026 58%, #081328 100%);
        /* Dokunuş kaydırma/zoom'a gitmesin: her dokunuş bir kanat çırpışı. */
        touch-action:none;
        -webkit-user-select:none; user-select:none;
      }
      /* İki tuval de mutlak: biri STATİK (arka plan), diğeri oyun. */
      .fufo-bg,.fufo-cv{position:absolute; inset:0; display:block}
      .fufo-bg{z-index:1}
      .fufo-cv{z-index:2}

      /* Skor — tasarımda arenanın üst ortasında, beyaz ve kalın; altında
         küçük "EN İYİ" satırı. */
      .fufo-hud{
        position:absolute; z-index:3; left:0; right:0; top:2.2%;
        display:flex; flex-direction:column; align-items:center; gap:2px;
        pointer-events:none;
      }
      .fufo-score{
        font:900 var(--fufo-digit,44px)/1 var(--ph-font-display);
        color:#fff; letter-spacing:.01em;
        text-shadow:0 0 14px rgba(120,190,255,.55), 0 2px 6px rgba(0,0,0,.55);
      }
      .fufo-best{
        font:700 calc(var(--fufo-digit,44px) * .30)/1 var(--ph-font-display);
        color:rgba(226,238,255,.88); letter-spacing:.10em;
        text-shadow:0 1px 4px rgba(0,0,0,.6);
      }

      /* Başlangıç ekranı — tasarımın sol paneli: rekor kartı + oynat
         düğmesi. pointer-events YOK ve bu bilinçli: dokunuş her yerden
         arenaya gidiyor, böylece "düğmeye mi bastım, ekrana mı" ikiliği hiç
         doğmuyor ve tek bir girdi yolu kalıyor. */
      .fufo-start{
        position:absolute; z-index:4; inset:0;
        display:none; flex-direction:column; align-items:center;
        justify-content:flex-end; padding-bottom:13%; gap:14px;
        pointer-events:none;
      }
      .fufo-start.on{display:flex}
      .fufo-card{
        display:flex; align-items:center; gap:14px;
        padding:12px 22px; border-radius:16px;
        background:rgba(9,14,36,.82);
        border:1px solid rgba(140,120,235,.45);
        box-shadow:0 0 22px rgba(70,110,220,.18);
      }
      .fufo-card-l{display:flex; flex-direction:column; align-items:center; gap:3px}
      .fufo-card-lbl{
        font:700 11px/1 var(--ph-font-display); letter-spacing:.16em;
        color:rgba(214,228,255,.82);
      }
      .fufo-card-val{font:900 30px/1 var(--ph-font-display); color:#fff}
      .fufo-card-ico{font-size:26px; line-height:1}
      .fufo-play{
        display:flex; align-items:center; justify-content:center;
        width:min(58%,230px); height:72px; border-radius:20px;
        background:linear-gradient(180deg,#2f7ff0 0%,#1348a8 55%,#0b2a6e 100%);
        border:1px solid rgba(150,205,255,.60);
        box-shadow:0 0 26px rgba(50,130,255,.34), inset 0 1px 0 rgba(255,255,255,.22);
      }
      .fufo-play-ico{
        width:0; height:0;
        border-left:26px solid rgba(190,226,255,.95);
        border-top:17px solid transparent; border-bottom:17px solid transparent;
        margin-left:7px;
      }
      .fufo-hint{
        font:600 12px/1 var(--ph-font-display); letter-spacing:.08em;
        color:rgba(200,218,255,.72);
      }

      /* Duraklat düğmesi — tasarımdaki sol üst kare. Yalnızca oyun
         sürerken görünür (.playing); başlangıç ekranında ve oyun-sonu
         panelinde duraklatacak bir şey yok. */
      .fufo-pause{
        position:absolute; z-index:5; left:3.5%; top:2.4%;
        width:42px; height:42px; padding:0;
        display:none; align-items:center; justify-content:center; gap:4px;
        border-radius:13px; cursor:pointer;
        background:rgba(9,14,36,.72);
        border:1px solid rgba(140,120,235,.55);
        box-shadow:0 0 14px rgba(70,110,220,.22);
      }
      .fufo-arena.playing .fufo-pause{display:flex}
      .fufo-pause i{
        display:block; width:4px; height:15px; border-radius:2px;
        background:rgba(226,238,255,.92);
      }
      .fufo-pause:active{transform:scale(.94)}
      /* Duraklatma perdesi */
      .fufo-paused-veil{
        position:absolute; z-index:4; inset:0;
        display:none; flex-direction:column; align-items:center; justify-content:center;
        gap:6px; pointer-events:none; background:rgba(4,8,26,.58);
      }
      .fufo-arena.paused .fufo-paused-veil{display:flex}
      .fufo-paused-veil span{
        font:900 22px/1 var(--ph-font-display); letter-spacing:.14em; color:#fff;
        text-shadow:0 0 14px rgba(120,190,255,.55);
      }
      .fufo-paused-veil small{
        font:600 12px/1 var(--ph-font-display); letter-spacing:.08em;
        color:rgba(200,218,255,.78);
      }

      /* Çarpma: TEK, kısa çerçeve darbesi. Sürekli çalışan efekt yok. */
      @keyframes fufoHit{
        0%,100%{border-color:rgba(126,110,220,.32)}
        35%{border-color:rgba(255,120,140,.95);
            box-shadow:0 0 24px rgba(255,80,110,.45)}
      }
      .fufo-arena.hit{animation:fufoHit 300ms ease-out}
    `;
  }

  function init(c) {
    container = c;
    layoutTries = 0;
    container.classList.add('ph-scene', 'fufo-scene');
    injectStyle('css-fufo', css());

    wrapEl = document.createElement('div');
    wrapEl.className = 'fufo-wrap';
    wrapEl.innerHTML =
      '<div class="fufo-arena">' +
        '<canvas class="fufo-bg"></canvas>' +
        '<canvas class="fufo-cv"></canvas>' +
        '<div class="fufo-hud">' +
          '<span class="fufo-score">0</span>' +
          '<span class="fufo-best">EN İYİ: 0</span>' +
        '</div>' +
        // Duraklat — tasarımdaki sol üst düğme. Arenanın çocuğu ama kendi
        // pointer olayını YUTUYOR (bkz. onPauseTap), yoksa aynı dokunuş hem
        // duraklatır hem kanat çırpardı.
        '<button class="fufo-pause" type="button" aria-label="Duraklat">' +
          '<i></i><i></i>' +
        '</button>' +
        '<div class="fufo-paused-veil"><span>DURAKLATILDI</span>' +
          '<small>Devam etmek için dokun</small></div>' +
        '<div class="fufo-start">' +
          '<div class="fufo-card">' +
            '<span class="fufo-card-l">' +
              '<span class="fufo-card-lbl">EN İYİ SKOR</span>' +
              '<span class="fufo-card-val">0</span>' +
            '</span>' +
            '<span class="fufo-card-ico">🏆</span>' +
          '</div>' +
          '<div class="fufo-play"><i class="fufo-play-ico"></i></div>' +
          '<span class="fufo-hint">Yükselmek için dokun</span>' +
        '</div>' +
      '</div>';
    container.appendChild(wrapEl);

    arenaEl = wrapEl.querySelector('.fufo-arena');
    bgCv = wrapEl.querySelector('.fufo-bg');
    cv = wrapEl.querySelector('.fufo-cv');
    bgx = bgCv.getContext('2d');
    ctx = cv.getContext('2d');
    scoreEl = wrapEl.querySelector('.fufo-score');
    bestEl = wrapEl.querySelector('.fufo-best');
    startEl = wrapEl.querySelector('.fufo-start');
    startBestEl = wrapEl.querySelector('.fufo-card-val');

    // Yıldızlar arenanın İÇİNDE (tasarımda gökyüzü oyun alanının kendisi).
    // Statik + CSS animasyonlu; oyun tuvaline hiç dokunmuyor.
    atmoEl = phAtmosphere(arenaEl, { stars: 44, beams: 0, motes: 0, skyPct: 74 });

    newGame();
    ensureLayout();
    // Görsel çözülünce sahneyi bir kez daha boya. APK'da dosya yerelde,
    // yani bu pratikte anında; ağdan gelen web yolunda ise oyun bu arada
    // zaten oynanabilir durumda.
    ensureBg(() => {
      if (!U || !bgx) return;
      if (bgFailed && !mtnCv) buildMountains();
      paintBackdrop();
      paint();
    });

    addEv(arenaEl, 'pointerdown', onPointer);
    // stopPropagation ŞART: düğme arenanın çocuğu, olay yukarı kabarsaydı
    // aynı dokunuş hem duraklatır hem kanat çırpardı.
    addEv(wrapEl.querySelector('.fufo-pause'), 'pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPaused(!paused);
    });
    addEv(document, 'keydown', onKey);
    addEv(window, 'resize', () => {
      if (layout()) { buildSprites(); paintBackdrop(); paint(); }
    });
    // Arka plana giden uygulamada döngü DURUR. Durmasaydı oyuncu ekrana
    // bakmazken UFO düşer ve tur görülmeden biterdi.
    addEv(document, 'visibilitychange', () => {
      if (document.hidden) stopLoop();
      // !paused ŞART: oyuncu duraklatıp uygulamadan çıkıp döndüğünde oyun
      // kendiliğinden başlamamalı — duraklatma oyuncunun kararı.
      else if (!paused && (state === 'ready' || state === 'play' || state === 'dying')) startLoop();
    });
  }

  function cleanup() {
    stopLoop();
    if (overT) { clearTimeout(overT); overT = 0; }
    if (layoutRaf) { cancelAnimationFrame(layoutRaf); layoutRaf = 0; }
    clearEvs();
    if (atmoEl) { atmoEl.remove(); atmoEl = null; }
    if (container) {
      container.innerHTML = '';
      container.classList.remove('ph-scene', 'fufo-scene');
    }
    container = wrapEl = arenaEl = bgCv = cv = null;
    scoreEl = bestEl = startEl = startBestEl = null;
    ctx = bgx = null;
    sprUfo = sprBody = sprCapDown = sprCapUp = mtnCv = null;
    pipes = [];
    trail = [];
    paused = false;
    U = 0;
    // 'over': başka bir yerden gelebilecek bir startLoop() çağrısı ölü
    // duruma döngü açmasın.
    state = 'over';
  }

  // Skor sahnenin kendi içinde (tasarımda arenanın üstünde), bu yüzden
  // kabuğun SKOR kapsülü gizleniyor — aynı sayı iki yerde durmamalı.
  return { init, cleanup, ownsScoreDisplay: true };
})();

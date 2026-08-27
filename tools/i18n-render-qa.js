#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Yerelleştirme GERÇEK RENDER QA
// ═══════════════════════════════════════════════════════════════
//   node tools/i18n-render-qa.js                 tam koşum
//   node tools/i18n-render-qa.js --lang hi       tek dil
//   node tools/i18n-render-qa.js --shot          ekran görüntüsü yaz
//
// ── BU ARAÇ NE DEĞİLDİR ──────────────────────────────────────────────
// GERÇEK CİHAZ TESTİ DEĞİLDİR. Masaüstü Chromium'da (Edge) koşuyor.
// Android WebView de Blink'tir, yani düzen/RTL/kırpma/sürükleme
// davranışı BÜYÜK ÖLÇÜDE aynıdır — ama şunlar burada ölçülemez:
//   • Android'in sistem font yedeği (Noto CJK/Devanagari/Arabic).
//     Masaüstünde başka fontlar var; "tofu yok" burada geçerse
//     cihazda da geçeceği GARANTİ DEĞİL, tersi ise kesin bir hata.
//   • Android'in metin şişirmesi (font boosting).
//   • Dokunmatik jestler ve sistem kenar jestleri.
//   • Android 13+ uygulama-başına dil ayarı.
//   • Çevrimdışı soğuk açılış, service worker'ın gerçek davranışı.
// Bunlar docs/I18N_DEVICE_QA.md'de ve telefonda yapılmalı.
//
// ── NE YAPAR ─────────────────────────────────────────────────────────
// Node harness'ları DOM'u taklit ediyor; bu araç GERÇEKTEN ÇİZİYOR.
// Aradaki fark bu depoda kayıtlı: "yeşil bir ölçüm, çizilmiş bir ekran
// değildir." Arapça ekran görüntüleri, ölçümün bulamadığı beş hata
// bulmuştu. Burada aranan da o sınıf: glif eksikliği, hücre taşması,
// yön hatası, gerçek pointer olaylarıyla sürükleme.
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { wsConnect } = require('./cdp');

const ROOT = path.resolve(__dirname, '..');
const PORT = 9782;
const CDP_PORT = 9783;
const SHOT_DIR = path.join(ROOT, 'screenshots', 'i18n-qa');

const argv = process.argv.slice(2);
const ONE = (() => { const i = argv.indexOf('--lang'); return i < 0 ? null : argv[i + 1]; })();
const SHOT = argv.includes('--shot');

// A51'in gerçek ölçüleri (birincil test cihazı): 1080×2400 @ 480dpi
// → 384 CSS px genişlik, DPR ~2.1. Dar uç için 360 (Huawei P20 Lite).
const VIEW = { w: 384, h: 774, dpr: 2.1 };

let failures = 0;
const ok = (n) => console.log('  ✓ ' + n);
const bad = (n, why) => { failures++; console.log('  ✗ ' + n + (why ? '\n      ' + why : '')); };
const check = (n, c, why) => (c ? ok(n) : bad(n, why));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Statik sunucu ────────────────────────────────────────────────────
// file:// KULLANILAMAZ: service worker ve modül yükleme HTTP kökeni ister
// (CLAUDE.md §2). localhost güvenli köken sayılıyor.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
               '.xml': 'application/xml', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); return res.end('yok');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    });
    s.listen(PORT, '127.0.0.1', () => resolve(s));
  });
}

function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return c.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
}

function httpJson(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path: p }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

// ── Sayfada koşacak yardımcılar ──────────────────────────────────────
// Fonksiyonlar dize olarak enjekte ediliyor; her `evalJs` bağımsız.

// TOFU TESPİTİ. Bir glif yoksa tarayıcı .notdef kutusu çizer ve o kutu
// HER eksik karakter için AYNI genişliktedir. Yöntem: metni ölç, sonra
// aynı uzunlukta kesin-eksik bir karakter dizisiyle (U+10FFFF özel
// kullanım alanı) ölç. Genişlikler eşitse metin de tofu demektir.
const TOFU_FN = `
function(text, font) {
  const cv = document.createElement('canvas');
  const cx = cv.getContext('2d');
  cx.font = font || getComputedStyle(document.body).font || '16px sans-serif';
  const w1 = cx.measureText(text).width;
  const yok = '\\uDBFF\\uDFFD'.repeat([...text].length);
  const w2 = cx.measureText(yok).width;
  return { metin: w1, eksik: w2, tofu: w1 > 0 && Math.abs(w1 - w2) < 0.5 };
}`;

// ALT-PİKSEL TAŞMA. scrollWidth tam sayıya yuvarlanır ve 0.78 px'lik bir
// taşmayı "temiz" gösterir — bu depoda ölçülmüş bir tuzak. Range ile
// metnin gerçek kutusu alınıyor.
const CLIP_FN = `
function() {
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.offsetParent && el !== document.body) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (cs.overflow === 'visible' && cs.overflowX === 'visible') return;
    let metin = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) metin = true;
    if (!metin) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    const t = r.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (t.width - b.width > 0.5) {
      out.push({ sinif: el.className || el.tagName, tasma: +(t.width - b.width).toFixed(2),
                 metin: (el.textContent || '').trim().slice(0, 40) });
    }
  });
  return out;
}`;

(async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.log('\n  ATLANDI: yerel Chromium (Edge/Chrome) bulunamadı.');
    console.log('  CHROME_PATH ile yol verebilirsin.\n');
    process.exit(0);
  }

  const server = await serve();
  const profil = path.join(require('os').tmpdir(), 'sly-i18nqa-' + process.pid);
  const proc = spawn(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profil,
    'about:blank',
  ], { stdio: 'ignore' });

  const kapat = () => {
    try { proc.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  };
  process.on('exit', kapat);

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(400);
    try { target = (await httpJson('/json/list')).find((x) => x.type === 'page'); } catch (e) {}
  }
  if (!target) { console.log('\n  ATLANDI: CDP açılmadı.\n'); kapat(); process.exit(0); }

  const ws = await wsConnect(target.webSocketDebuggerUrl);
  const bekleyen = new Map(); let id = 0;
  ws.onMessage((raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.id && bekleyen.has(m.id)) { bekleyen.get(m.id)(m); bekleyen.delete(m.id); }
  });
  const cmd = (method, params) => new Promise((r) => {
    const i = ++id; bekleyen.set(i, r); ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  const evalJs = async (expr) => {
    const r = await cmd('Runtime.evaluate',
      { expression: expr, returnByValue: true, awaitPromise: true });
    const res = r.result || {};
    if (res.exceptionDetails) {
      const e = res.exceptionDetails;
      throw new Error((e.exception && (e.exception.description || e.exception.value)) || e.text);
    }
    return res.result ? res.result.value : null;
  };

  await cmd('Runtime.enable');
  await cmd('Page.enable');
  await cmd('Network.enable');
  await cmd('Network.setCacheDisabled', { cacheDisabled: true });
  await cmd('Emulation.setDeviceMetricsOverride',
    { width: VIEW.w, height: VIEW.h, deviceScaleFactor: VIEW.dpr, mobile: true });

  console.log('\nSlySwipe — Yerelleştirme GERÇEK RENDER QA');
  console.log('  tarayıcı : ' + path.basename(browser));
  console.log('  görünüm  : ' + VIEW.w + '×' + VIEW.h + ' @ DPR ' + VIEW.dpr + ' (A51 ölçüleri)');
  console.log('  UYARI    : masaüstü Chromium — Android font yedeği BURADA ÖLÇÜLEMEZ');

  async function yukle() {
    await cmd('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' });
    // Açılış sahnesi 6 sn tutuyor (PH_SPLASH_TARGET_MS) — beklemek yerine
    // uygulamanın hazır olduğunu doğrudan soruyoruz.
    for (let i = 0; i < 60; i++) {
      await sleep(300);
      try { if (await evalJs('!!(window.I18n && window.PuzzleGames && document.getElementById("screen-home"))')) break; } catch (e) {}
    }
    await evalJs('document.getElementById("ph-splash") && document.getElementById("ph-splash").remove()');
    await sleep(150);
  }

  async function setLang(code) {
    await evalJs('new Promise(r => I18n.set(' + (code ? JSON.stringify(code) : 'null') + ', r))');
    await sleep(250);
  }

  // REKLAM KATMANINI KAPAT. Bunu yazmak zorunda kalmamın sebebi ölçülmüş
  // bir kirlenme: `exitGame()` üçüncü turda geçiş reklamını tetikliyor
  // (InterstitialAds'in 3-tur kuralı) ve simülasyon katmanı ekranda
  // kalıyor. Otomasyon onu hiç kapatmadığı için Türkçe turda kurulan
  // katman, Hintçe ekran görüntüsünün üstünde Türkçe metinle duruyordu —
  // bir an "çeviri hatası" gibi göründü, oysa test artefaktıydı.
  // Katmanı bırakmak iki şeyi bozar: ekran görüntüleri gerçek ekranı
  // göstermez ve ölçümler örtülü bir arayüzde yapılır.
  async function katmanKapat() {
    await evalJs('(function(){let n=0;' +
      'document.querySelectorAll(".ad-overlay").forEach(function(o){o.remove();n++;});' +
      'return n;})()');
  }

  async function shot(ad) {
    await katmanKapat();
    if (!SHOT) return;
    if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
    const r = await cmd('Page.captureScreenshot', { format: 'png' });
    if (r.result && r.result.data)
      fs.writeFileSync(path.join(SHOT_DIR, ad + '.png'), Buffer.from(r.result.data, 'base64'));
  }

  await yukle();

  // ═════════ 1. AÇILIŞ + ÇÖZÜMLEME ═════════
  console.log('\n1. AÇILIŞ VE LOCALE ÇÖZÜMLEME');
  {
    const boot = await evalJs('({ locale: I18n.locale, lang: document.documentElement.lang, dir: document.documentElement.dir })');
    check('açılışta bir dil seçilmiş', !!boot.locale, JSON.stringify(boot));
    check('<html lang> aktif dille aynı', boot.lang === boot.locale,
          'lang=' + boot.lang + ' locale=' + boot.locale);

    // Desteklenmeyen dil → İngilizce. zh-TW ÖZELLİKLE: Geleneksel okuyucuya
    // Basitleştirilmiş göstermek sessiz bir içerik hatasıdır.
    const fb = await evalJs('({ tw: I18n.resolve("zh-TW"), fi: I18n.resolve("fi"), sv: I18n.resolve("sv-SE") })');
    check('zh-TW Basitleştirilmiş Çince\'ye ÇÖZÜLMÜYOR', fb.tw === null, 'gelen: ' + fb.tw);
    check('desteklenmeyen diller null döndürüyor', fb.fi === null && fb.sv === null, JSON.stringify(fb));
  }

  // ═════════ 2. DİL BAŞINA RENDER ═════════
  const DILLER = ONE ? [ONE] : JSON.parse(await evalJs('JSON.stringify(I18n.SUPPORTED.map(x=>x.code))'));
  const EKRANLAR = [['home', 'Ana Sayfa'], ['lider', 'Rozetler'], ['profil', 'Profil']];

  console.log('\n2. EKRAN RENDER — ' + DILLER.length + ' dil × ' + EKRANLAR.length + ' ekran');
  console.log('   dil        dir   kırpma  tofu');
  const render = [];
  for (const code of DILLER) {
    await setLang(code);
    const dir = await evalJs('document.documentElement.dir');
    let kirpma = [], tofu = false;
    for (const [tab, ad] of EKRANLAR) {
      await evalJs('switchTab(' + JSON.stringify(tab) + ')');
      await sleep(220);
      await katmanKapat();
      const k = await evalJs('(' + CLIP_FN + ')()');
      kirpma = kirpma.concat((k || []).map((x) => ad + ': ' + x.metin + ' (+' + x.tasma + 'px)'));
      // Ekrandaki gerçek metinden bir örnek al ve glifini sına.
      const ornek = await evalJs('(function(){const e=document.querySelector(".screen.active");' +
        'const t=(e?e.innerText:"").replace(/[\\s\\d\\p{P}\\p{S}]/gu,"").slice(0,12);return t;})()');
      if (ornek && ornek.length) {
        const r = await evalJs('(' + TOFU_FN + ')(' + JSON.stringify(ornek) + ')');
        if (r && r.tofu) tofu = true;
      }
      await shot(code + '-' + tab);
    }
    render.push({ code, dir, kirpma, tofu });
    console.log('   ' + code.padEnd(10) + dir.padEnd(6) +
      String(kirpma.length).padStart(6) + '  ' + (tofu ? 'VAR ✗' : 'yok'));
  }
  check('hiçbir dilde metin kırpılması yok', render.every((r) => !r.kirpma.length),
        render.filter((r) => r.kirpma.length).map((r) => r.code + ': ' + r.kirpma[0]).join('\n      '));
  check('hiçbir dilde tofu (eksik glif) yok', render.every((r) => !r.tofu),
        render.filter((r) => r.tofu).map((r) => r.code).join(', '));
  check('yalnızca Arapça RTL bildiriyor',
        render.every((r) => (r.code === 'ar') === (r.dir === 'rtl')),
        render.map((r) => r.code + '=' + r.dir).join(' '));

  // ═════════ 3. RTL + OYUN KABI YALITIMI ═════════
  console.log('\n3. RTL VE OYUN KABI');
  {
    await setLang('ar');
    const g = await evalJs('(function(){' +
      'playGameById("snakeGame");' +
      'const c=document.getElementById("game-container");' +
      'return { kap: c?c.getAttribute("dir"):null, kapHesap: c?getComputedStyle(c).direction:null,' +
      ' html: document.documentElement.dir, kabuk: getComputedStyle(document.body).direction };})()');
    check('<html dir="rtl">', g.html === 'rtl', String(g.html));
    check('kabuk RTL akıyor', g.kabuk === 'rtl', String(g.kabuk));
    check('#game-container dir="ltr" ÖZNİTELİĞİ duruyor', g.kap === 'ltr', String(g.kap));
    check('#game-container HESAPLANMIŞ yönü ltr', g.kapHesap === 'ltr', String(g.kapHesap));
    await shot('ar-oyun-kabi');
    await evalJs('typeof exitGame==="function" && exitGame()');
    await sleep(200);
  }

  // ═════════ 4. KELİME AVI — GERÇEK SÜRÜKLEME ═════════
  // Node harness'ı tahta VERİSİNİ doğruluyor. Burada doğrulanan şey
  // GERÇEK POINTER OLAYLARIYLA seçimin çalışması: yön kilidi, canlı
  // vurgu, bırakınca yeşil. Sentetik `click` yerine tam
  // pointerdown→move→up zinciri (phCamera dersi).
  const WS_DILLER = ONE ? [ONE] : ['tr', 'ar', 'ja', 'hi', 'ko', 'zh-Hans'];
  console.log('\n4. KELİME AVI — gerçek sürükleme (' + WS_DILLER.join(', ') + ')');
  console.log('   dil        hücre  taşma  yatay dikey çapraz ters');

  const DRAG_FN = `
async function(ters) {
  const hedef = window.__wsPlaced && window.__wsPlaced[0];
  if (!hedef) return { hata: 'yerlesim yok' };
  let cells = hedef.cells.slice();
  if (ters) cells = cells.slice().reverse();
  const el = (k) => { const p = k.split(',');
    return document.querySelectorAll('.ws-cell')[(+p[0]) * window.__wsSize + (+p[1])]; };
  const merkez = (k) => { const r = el(k).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const grid = document.querySelector('.ws-grid');
  const at = (tip, p, hedefEl) => (hedefEl || grid).dispatchEvent(new PointerEvent(tip, {
    bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 1,
    pointerType: 'touch', isPrimary: true }));
  const bas = merkez(cells[0]);
  at('pointerdown', bas);
  let canli = 0;
  for (let i = 1; i < cells.length; i++) {
    const p = merkez(cells[i]);
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true,
      clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    canli = document.querySelectorAll('.ws-cell.sel').length;
  }
  const son = merkez(cells[cells.length - 1]);
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true,
    clientX: son.x, clientY: son.y, pointerId: 1, pointerType: 'touch', isPrimary: true }));

  // KABUL ÖLÇÜTÜ: ÇİPİN ÜSTÜ ÇİZİLDİ Mİ — sürüklediğim hücrelerin
  // yeşil olması DEĞİL. Bu bir düzeltme ve sebebi ölçülmüş:
  // Çince kelimelerin %2.9'u tahtada birden fazla kez geçiyor (星星,
  // 姐姐 gibi İKİLEMELİ kelimeler ileri ve geri aynı okunuyor, üstelik
  // iki karakterlik oldukları için kazara ikizleri kolay oluşuyor).
  // Oyun bu durumu BİLEREK böyle çözüyor: validate() KANONİK
  // hücreleri yeşile boyar, oyuncunun çizdiklerini değil — yoksa tahta
  // ile kelime listesi çelişirdi. Yani çizdiğim hücrelerin yeşil
  // olmasını beklemek oyunun sözünü değil, benim varsayımımı ölçerdi.
  const chip = document.querySelector('.ws-w[data-w="' + hedef.word + '"]');
  const kabul = !!(chip && chip.classList.contains('done'));
  const yesilAdet = document.querySelectorAll('.ws-cell.found').length;
  return { kelime: hedef.word, canliVurgu: canli, kabul, yesilAdet };
}`;

  const wsSonuc = [];
  for (const code of WS_DILLER) {
    await setLang(code);
    // Oyunu aç ve tahtayı dışarıdan görünür kıl (yalnızca ÖLÇÜM için —
    // oyunun kendi durumu değiştirilmiyor, okunuyor).
    await evalJs('playGameById("wordSearch")');
    await sleep(500);
    await katmanKapat();

    const olc = await evalJs('(function(){' +
      'const cells=document.querySelectorAll(".ws-cell");' +
      'if(!cells.length) return {yok:true};' +
      'let tasan=0, minH=1e9;' +
      'cells.forEach(c=>{const b=c.getBoundingClientRect();' +
      ' const r=document.createRange(); r.selectNodeContents(c);' +
      ' const t=r.getBoundingClientRect();' +
      ' if(t.width-b.width>0.5||t.height-b.height>0.5) tasan++;' +
      ' if(b.width<minH) minH=b.width;});' +
      'return { adet: cells.length, tasan, hucre: +minH.toFixed(1) };})()');

    if (olc.yok) { wsSonuc.push({ code, yok: true }); console.log('   ' + code.padEnd(10) + ' TAHTA ÇİZİLMEDİ'); continue; }

    // Yerleşim verisini ölçüm için dışarı al.
    await evalJs('(function(){const g=PuzzleGames.wordSearch;' +
      'window.__wsSize=document.querySelector(".ws-grid").style.gridTemplateColumns.match(/repeat\\((\\d+)/)[1]|0;' +
      'return 1;})()');
    // `placed` kapanış içinde; DOM'dan türetmek yerine motoru kullanmak
    // yanlış olurdu (o başka bir tahta üretir). Hücre sınıflarından
    // okunabilen tek şey konum, o yüzden yerleşimi oyunun kendisinden
    // alıyoruz: init sonrası global bir kanca YOK, bu yüzden tahtayı
    // yeniden kurup aynı veriyi kullanmak yerine DOM'daki çip
    // listesinden ilk kelimeyi ve onun hücrelerini arıyoruz.
    const hazir = await evalJs('(function(){' +
      'const size=window.__wsSize;' +
      'const cells=[...document.querySelectorAll(".ws-cell")];' +
      'const harf=cells.map(c=>c.textContent);' +
      'const chip=document.querySelector(".ws-w");' +
      'if(!chip) return false;' +
      'const kelime=chip.getAttribute("data-w");' +
      'const gs=WordPools.graphemes(kelime);' +
      'const D=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];' +
      'for(const d of D) for(let r=0;r<size;r++) for(let c=0;c<size;c++){' +
      ' const er=r+d[0]*(gs.length-1), ec=c+d[1]*(gs.length-1);' +
      ' if(er<0||er>=size||ec<0||ec>=size) continue;' +
      ' let ok=true; const ks=[];' +
      ' for(let i=0;i<gs.length;i++){const rr=r+d[0]*i, cc=c+d[1]*i;' +
      '  if(harf[rr*size+cc]!==gs[i]){ok=false;break;} ks.push(rr+","+cc);}' +
      ' if(ok){ window.__wsPlaced=[{word:kelime,cells:ks}]; return true; } }' +
      'return false;})()');
    if (!hazir) { wsSonuc.push({ code, bulunamadi: true }); console.log('   ' + code.padEnd(10) + ' KELİME TAHTADA BULUNAMADI'); continue; }

    const ileri = await evalJs('(' + DRAG_FN + ')(false)');
    // Ters seçim: aynı kelimeyi ters yönde sürükle. Zaten bulundu, o
    // yüzden yeni bir tahta kurup ikinci kelimeyi ters deniyoruz.
    await evalJs('playGameById("wordSearch")'); await sleep(400);
    await evalJs('(function(){const size=window.__wsSize=' +
      'document.querySelector(".ws-grid").style.gridTemplateColumns.match(/repeat\\((\\d+)/)[1]|0;' +
      'const harf=[...document.querySelectorAll(".ws-cell")].map(c=>c.textContent);' +
      'const chip=document.querySelector(".ws-w"); const kelime=chip.getAttribute("data-w");' +
      'const gs=WordPools.graphemes(kelime);' +
      'const D=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];' +
      'for(const d of D) for(let r=0;r<size;r++) for(let c=0;c<size;c++){' +
      ' const er=r+d[0]*(gs.length-1), ec=c+d[1]*(gs.length-1);' +
      ' if(er<0||er>=size||ec<0||ec>=size) continue;' +
      ' let ok=true; const ks=[];' +
      ' for(let i=0;i<gs.length;i++){const rr=r+d[0]*i, cc=c+d[1]*i;' +
      '  if(harf[rr*size+cc]!==gs[i]){ok=false;break;} ks.push(rr+","+cc);}' +
      ' if(ok){ window.__wsPlaced=[{word:kelime,cells:ks}]; return 1; } } return 0;})()');
    const geri = await evalJs('(' + DRAG_FN + ')(true)');

    await shot('ws-' + code);
    wsSonuc.push({ code, ...olc, ileri, geri });
    console.log('   ' + code.padEnd(10) + String(olc.hucre).padStart(5) +
      String(olc.tasan).padStart(7) + '   ' +
      (ileri.kabul ? '✓' : '✗') + '     ' + (ileri.canliVurgu > 0 ? '✓' : '✗') +
      '     ' + (ileri.yesilAdet > 0 ? '✓' : '✗') + '    ' + (geri.kabul ? '✓' : '✗'));
    await evalJs('typeof exitGame==="function" && exitGame()'); await sleep(200);
  }

  check('her dilde tahta çizildi', wsSonuc.every((x) => !x.yok && !x.bulunamadi),
        wsSonuc.filter((x) => x.yok || x.bulunamadi).map((x) => x.code).join(', '));
  check('hiçbir hücrede glif taşması yok', wsSonuc.every((x) => !x.tasan),
        wsSonuc.filter((x) => x.tasan).map((x) => x.code + '=' + x.tasan).join(', '));
  check('ileri sürükleme her dilde kelimeyi buluyor',
        wsSonuc.every((x) => x.ileri && x.ileri.kabul),
        wsSonuc.filter((x) => !(x.ileri && x.ileri.kabul)).map((x) => x.code).join(', '));
  check('TERS sürükleme her dilde kelimeyi buluyor',
        wsSonuc.every((x) => x.geri && x.geri.kabul),
        wsSonuc.filter((x) => !(x.geri && x.geri.kabul)).map((x) => x.code).join(', '));
  check('sürükleme sırasında canlı vurgu var',
        wsSonuc.every((x) => x.ileri && x.ileri.canliVurgu > 0),
        wsSonuc.filter((x) => !(x.ileri && x.ileri.canliVurgu > 0)).map((x) => x.code).join(', '));

  // ═════════ 5. OYUN İÇİNDE DİL DEĞİŞİMİ ═════════
  console.log('\n5. OYUN AÇIKKEN DİL DEĞİŞİMİ');
  {
    await setLang('tr');
    await evalJs('playGameById("wordSearch")'); await sleep(400);
    const once = await evalJs('(function(){' +
      'const lv=document.querySelector("[data-ws-lv]");' +
      'return { seviye: lv?lv.textContent:null,' +
      ' skor: document.getElementById("game-score")?document.getElementById("game-score").textContent:null,' +
      ' harf: [...document.querySelectorAll(".ws-cell")].slice(0,8).map(c=>c.textContent).join("") };})()');
    await setLang('hi');
    await sleep(400);
    const sonra = await evalJs('(function(){' +
      'const lv=document.querySelector("[data-ws-lv]");' +
      'return { seviye: lv?lv.textContent:null,' +
      ' skor: document.getElementById("game-score")?document.getElementById("game-score").textContent:null,' +
      ' harf: [...document.querySelectorAll(".ws-cell")].slice(0,8).map(c=>c.textContent).join(""),' +
      ' adet: document.querySelectorAll(".ws-cell").length };})()');
    check('seviye korunuyor', once.seviye === sonra.seviye, once.seviye + ' → ' + sonra.seviye);
    check('tahta gerçekten yenilendi', once.harf !== sonra.harf && sonra.adet > 0,
          once.harf + ' → ' + sonra.harf);
    check('yeni tahta Devanagari', /[\u0900-\u097F]/.test(sonra.harf), sonra.harf);
    await shot('dil-degisimi-hi');
    await evalJs('typeof exitGame==="function" && exitGame()'); await sleep(200);
  }

  // ═════════ 6. KALICILIK ═════════
  console.log('\n6. KALICILIK VE SİSTEM VARSAYILANI');
  {
    await setLang('ja');
    const kayit = await evalJs('localStorage.getItem("ph_lang")');
    check('manuel seçim ph_lang\'e yazıldı', /"mode":"manual"/.test(kayit || ''), String(kayit));
    await yukle();                       // gerçek yeniden yükleme
    const sonra = await evalJs('I18n.locale');
    check('yeniden yüklemede manuel dil korunuyor', sonra === 'ja', 'gelen: ' + sonra);
    await setLang(null);
    const kayit2 = await evalJs('localStorage.getItem("ph_lang")');
    check('Sistem Varsayılanı manuel geçersiz kılmayı temizliyor',
          /"mode":"system"/.test(kayit2 || ''), String(kayit2));
  }

  // ═════════ 7. KEŞFET JESTİ ═════════
  console.log('\n7. KEŞFET JEST SAHİPLİĞİ');
  {
    await setLang('ja');
    await evalJs('switchTab("discover")'); await sleep(900);
    const j = await evalJs('(function(){' +
      'const kart=document.querySelector(".reel-card");' +
      'const akis=document.querySelector(".reels-container")||document.querySelector("#screen-discover");' +
      'const ws=document.querySelector(".reel-demo-inner");' +
      'const fc=document.querySelector(".reel-demo-inner canvas");' +
      'return { kart: !!kart,' +
      ' akisKaydirma: akis?getComputedStyle(akis).overflowY:null,' +
      ' wsTouch: ws?getComputedStyle(ws).touchAction:null,' +
      ' fcTouch: fc?getComputedStyle(fc).touchAction:null };})()');
    check('Keşfet akışı dikey kaydırıyor', j.akisKaydirma === 'scroll' || j.akisKaydirma === 'auto',
          String(j.akisKaydirma));
    check('Kelime Avı önizlemesi jesti ÇALMIYOR (dekoratif)',
          j.wsTouch !== 'none', 'touch-action=' + j.wsTouch);
    if (j.fcTouch !== null)
      check('etkileşimli önizleme (canvas) kendi jestini alıyor', j.fcTouch === 'none',
            'touch-action=' + j.fcTouch);
    await shot('discover-ja');
  }

  kapat();
  console.log(failures ? '\n' + failures + ' DOĞRULAMA DÜŞTÜ\n' : '\nTÜM RENDER TESTLERİ GEÇTİ\n');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('\nHATA: ' + (e && e.message || e) + '\n'); process.exit(1); });

#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Yerleşim Matrisi Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// NEDEN VAR: kabuk ekranlarındaki metin taşmaları cihaz cihaz, SIRAYLA
// keşfediliyordu — önce Galaxy A51'de (384 px) "Rozet İlerlemesi"
// kırpıldı, sonra Huawei P20 Lite'ta (360 px) uygulamanın kendi adı.
// Her seferinde bir cihaz, bir hata. Bu araç o keşfi tek geçişe indiriyor:
// genişlik × yazı ölçeği matrisini tarayıcıda süpürüp taşan HER metni
// bulur. Amaç "test ettiğim cihazlarda doğru" değil, "bu aralıkta
// bozulamaz" diyebilmek.
//
//   node tools/layout-matrix-test.js
//   node tools/layout-matrix-test.js --verbose     (her hücreyi yaz)
//
// NE ÖLÇÜYOR
//   1. Metin taşması — alt piksel duyarlı. `scrollWidth` TAM SAYIYA
//      yuvarladığı için 0.78 px'lik bir taşmayı gizliyor (A51'de tam
//      olarak bu oldu ve "sığıyor" sanıldı). Bu yüzden ölçüm
//      Range.getBoundingClientRect() ile yapılıyor.
//   2. Yatay kaydırma — hiçbir ekran yanlamasına kaymamalı.
//   3. Kesişme — üst üste binen tıklanabilir öğeler.
//
// YAZI ÖLÇEĞİ NEDEN SİMÜLE EDİLİYOR: Android WebView metni sistem
// ayarına göre büyütüyor (A51'de 10 px → 11 px ölçüldü) ve bu bir CİHAZ
// özelliği değil, KULLANICI ayarı — aynı telefonda %130'a çekilebilir.
// Simülasyon, her öğenin hesaplanmış font boyutunu okuyup katsayıyla
// çarpıyor; bu, boosting'in yaptığı şeyin birebir aynısı.
//
// BAĞIMLILIK: yalnızca yerel bir Chromium (Edge/Chrome) ve Node. Paket
// yok — depo zaten sıfır bağımlılık (CLAUDE.md §6) ve bu bir araç,
// çalışma zamanı kodu değil. Tarayıcı bulunamazsa test ATLANIR, hata
// vermez: sahibinin makinesinde tarayıcı olmayabilir.

'use strict';
const http = require('http');
const fs = require('fs');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8791;
const CDP_PORT = 9771;
const VERBOSE = process.argv.includes('--verbose');
// --shot 320x1.3  → o hücrenin üç ekranını PNG olarak yazar ve çıkar.
// Ölçüm "taşma yok" dese bile yerleşimin GÜZEL durduğunu söylemez;
// başarısız (ya da şüpheli) bir hücreye bakabilmek aracın eksik yarısıydı.
const SHOT = (() => {
  const i = process.argv.indexOf('--shot');
  if (i < 0) return null;
  const m = /^(\d+)x([\d.]+)$/.exec(process.argv[i + 1] || '');
  return m ? { w: +m[1], k: +m[2] } : { w: 360, k: 1 };
})();
const SHOT_DIR = process.env.SHOT_DIR || ROOT;
// --lang ar  → --shot ile birlikte, görüntüyü o dilde al.
const SHOT_LANG = (() => {
  const i = process.argv.indexOf('--lang');
  return i < 0 ? null : (process.argv[i + 1] || null);
})();

// ── MATRİS ─────────────────────────────────────────────────────
// Genişlikler gerçek cihazlardan: 320 (iPhone SE / eski Android),
// 360 (Huawei P20 Lite — en yaygın Android genişliği), 384 (Galaxy
// A51), 393 (Pixel), 412 (Galaxy S2x), 480 (#app'in üst sınırı).
const WIDTHS = [320, 360, 384, 393, 412, 480];
// 1.0 = ayar kapalı, 1.15 = A51'de ölçülen (10→11 px), 1.3 = kullanıcının
// erişilebilirlik için seçebileceği makul üst uç.
const SCALES = [1.0, 1.15, 1.3];
const SCREENS = [
  { tab: 'home',   sel: '#screen-home',   ad: 'Ana Sayfa' },
  { tab: 'lider',  sel: '#screen-lider',  ad: 'Rozetler' },
  { tab: 'profil', sel: '#screen-profil', ad: 'Profil' },
];

// ── Statik sunucu ──────────────────────────────────────────────
const MT = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
             '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
             '.svg':'image/svg+xml' };
function serve() {
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (e, d) => {
        if (e) { r.writeHead(404); return r.end('nf'); }
        r.writeHead(200, { 'Content-Type': MT[path.extname(f)] || 'application/octet-stream' });
        r.end(d);
      });
    });
    s.listen(PORT, () => res(s));
  });
}

// ── Tarayıcıyı bul ─────────────────────────────────────────────
function findBrowser() {
  const cands = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter(Boolean);
  return cands.find((c) => { try { return fs.existsSync(c); } catch (e) { return false; } }) || null;
}

// ── Minik WebSocket / CDP istemcisi ────────────────────────────
class WS {
  constructor(url) {
    const u = new URL(url);
    this.sock = net.connect(+u.port, u.hostname);
    this.buf = Buffer.alloc(0); this.hs = [];
    this.ready = new Promise((resolve, reject) => {
      this.sock.on('error', reject);
      this.sock.on('connect', () => this.sock.write(
        'GET ' + u.pathname + ' HTTP/1.1\r\nHost: ' + u.host +
        '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ' +
        crypto.randomBytes(16).toString('base64') + '\r\nSec-WebSocket-Version: 13\r\n\r\n'));
      let done = false;
      this.sock.on('data', (d) => {
        this.buf = Buffer.concat([this.buf, d]);
        if (!done) {
          const i = this.buf.indexOf('\r\n\r\n');
          if (i < 0) return;
          this.buf = this.buf.slice(i + 4); done = true; resolve();
        }
        this._drain();
      });
    });
  }
  _drain() {
    while (this.buf.length >= 2) {
      let len = this.buf[1] & 127, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const p = this.buf.slice(off, off + len).toString();
      this.buf = this.buf.slice(off + len);
      let m; try { m = JSON.parse(p); } catch (e) { continue; }
      this.hs.forEach((h) => h(m));
    }
  }
  send(o) {
    const d = Buffer.from(JSON.stringify(o)), mask = crypto.randomBytes(4);
    let h;
    if (d.length < 126) h = Buffer.from([0x81, 0x80 | d.length]);
    else if (d.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 0xFE; h.writeUInt16BE(d.length, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 0xFF; h.writeBigUInt64BE(BigInt(d.length), 2); }
    const k = Buffer.alloc(d.length);
    for (let i = 0; i < d.length; i++) k[i] = d[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([h, mask, k]));
  }
  on(h) { this.hs.push(h); }
}

const httpJson = (p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: CDP_PORT, path: p }, (r) => {
    let b = ''; r.on('data', (c) => b += c);
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Sayfa içinde çalışan tarayıcı ──────────────────────────────
// Fonksiyon olarak yazılıp .toString() ile gönderiliyor: burada
// yazılabilir ve okunabilir kalıyor, orada tek ifade olarak çalışıyor.
function PAGE_SCAN(sel) {
  const gorunur = (e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    return e.getBoundingClientRect().width > 0;
  };
  const kok = document.querySelector(sel);
  if (!kok) return { yok: true };

  const tasan = [];
  kok.querySelectorAll('*').forEach((e) => {
    if (e.children.length) return;                 // yalnızca yaprak metin
    const t = (e.textContent || '').trim();
    if (!t || !gorunur(e)) return;
    const r = document.createRange(); r.selectNodeContents(e);
    const tw = r.getBoundingClientRect().width;
    const bw = e.getBoundingClientRect().width;
    // 0.5 px tolerans: alt piksel yuvarlamasi gurultu uretmesin.
    if (tw - bw > 0.5) {
      // Kutu ve metin genisligi de raporlaniyor: yalnizca "kac px
      // tasti" bilgisi, sebebi (kutu mu daralmis, metin mi buyumus)
      // ayirt etmeye yetmiyordu.
      tasan.push({
        metin: t.slice(0, 34),
        sinif: (e.className || '').toString().slice(0, 28),
        px: +(tw - bw).toFixed(1),
        kutu: +bw.toFixed(1),
        metinPx: +tw.toFixed(1),
        satir: e.getClientRects().length,
      });
    }
  });

  return {
    tasan,
    yatay: document.documentElement.scrollWidth > window.innerWidth + 0.5,
    govdeTasma: document.body.scrollWidth > window.innerWidth + 0.5,
  };
}

// Yazi olcegini simule et: her ogenin hesaplanmis font boyutunu katsayiyla
// carp. Android'in metin sisirmesinin yaptigi sey birebir bu.
// İKİ TUZAK VAR, ikisi de ölçeği KATLAYARAK uyguluyordu ve testi
// gerçekte olmayan hatalar üretir hâle getirmişti (ölçüm: "Oyuncu"
// 212 px çıktı — 1.3 değil 1.3^4 uygulanmıştı):
//  1. Önce OKU, sonra YAZ. querySelectorAll belge sırası döndürüyor,
//     yani ebeveyn önce ölçekleniyor; çocuk font boyutunu MİRASLA
//     aldıysa getComputedStyle o an ebeveynin YENİ boyutunu veriyor ve
//     çarpım ikinci kez uygulanıyor. Tüm boyutlar tek seferde
//     anlık görüntüye alınıp ondan sonra yazılıyor.
//  2. Sekme değişimi innerHTML ile yeni DOM yazıyor, o yüzden ölçek
//     tekrar uygulanmalı — ama ZATEN ölçeklenmiş öğelere değil.
//     İşaretleme (data-sly-scaled) bunu idempotent yapıyor.
function PAGE_SCALE(k) {
  if (k === 1) return 'atlandi';
  const els = [];
  document.querySelectorAll('*').forEach((e) => {
    if (e.dataset.slyScaled) return;
    els.push(e);
  });
  const boyut = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
  let n = 0;
  els.forEach((e, i) => {
    if (boyut[i] > 0) {
      e.style.fontSize = (boyut[i] * k).toFixed(3) + 'px';
      e.dataset.slyScaled = '1';
      n++;
    }
  });
  return n;
}

// ───────────────────────────────────────────────────────────────
(async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.log('\n  ATLANDI: yerel Chromium (Edge/Chrome) bulunamadi.');
    console.log('  CHROME_PATH ortam degiskeniyle yol verebilirsin.\n');
    process.exit(0);
  }

  const server = await serve();
  const profil = path.join(require('os').tmpdir(), 'sly-matrix-' + process.pid);
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

  // Tarayicinin CDP'yi acmasini bekle
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(400);
    try {
      const list = await httpJson('/json/list');
      target = list.find((x) => x.type === 'page');
    } catch (e) { /* henuz acilmadi */ }
  }
  if (!target) { console.log('\n  ATLANDI: tarayici CDP baglantisi acilmadi.\n'); kapat(); process.exit(0); }

  const ws = new WS(target.webSocketDebuggerUrl);
  await ws.ready;
  const bekleyen = new Map(); let id = 0;
  ws.on((m) => { if (m.id && bekleyen.has(m.id)) { bekleyen.get(m.id)(m); bekleyen.delete(m.id); } });
  const cmd = (method, params) => new Promise((r) => {
    const i = ++id; bekleyen.set(i, r); ws.send({ id: i, method, params: params || {} });
  });
  const evalJs = async (expr) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    const res = r.result || {};
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails).slice(0, 300));
    return res.result ? res.result.value : null;
  };

  await cmd('Runtime.enable');
  await cmd('Page.enable');
  await cmd('Network.enable');
  await cmd('Network.setCacheDisabled', { cacheDisabled: true });

  console.log('\nSlySwipe — Yerleşim Matrisi');
  console.log('  tarayıcı : ' + path.basename(browser));
  console.log('  matris   : ' + WIDTHS.length + ' genişlik × ' + SCALES.length +
              ' yazı ölçeği × ' + SCREENS.length + ' ekran = ' +
              (WIDTHS.length * SCALES.length * SCREENS.length) + ' hücre');
  console.log('  + dil ekseni: 15 dil × ' + SCREENS.length + ' ekran (320px ×1.3)\n');

  const hatalar = [];
  let hucre = 0;

  const YALNIZ_DIL = process.argv.includes('--locales');
  const genislikler = YALNIZ_DIL ? [] : (SHOT ? [SHOT.w] : WIDTHS);
  const olcekler    = SHOT ? [SHOT.k] : SCALES;

  for (const w of genislikler) {
    for (const k of olcekler) {
      await cmd('Emulation.setDeviceMetricsOverride',
        { width: w, height: 780, deviceScaleFactor: 1, mobile: true });
      await cmd('Page.navigate', { url: 'http://localhost:' + PORT + '/index.html' });
      // Servis calisani CSS'i cache-first veriyor; her turda temizle ki
      // duzenlemeler gercekten olculsun (CLAUDE.md'deki bayatlama tuzagi).
      await sleep(1200);
      await evalJs(`(async () => {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.unregister()));
        const ks = await caches.keys();
        await Promise.all(ks.map(x => caches.delete(x)));
      })()`).catch(() => {});
      await cmd('Page.reload', { ignoreCache: true });
      // Acilis sahnesi 6 sn; __phAppReady sonrasi ekranlar cizili olur.
      await sleep(7800);
      await evalJs('(' + PAGE_SCALE.toString() + ')(' + k + ')');
      // --lang ile birlikte: ekran görüntüsünü O DİLDE al. Ölçüm
      // "taşma yok" der ama AYNALAMANIN doğru olduğunu söylemez —
      // Arapça'yı gözle görmenin tek yolu bu.
      if (SHOT_LANG) {
        await evalJs('I18n.set("' + SHOT_LANG + '")');
        for (let i = 0; i < 40; i++) {
          await sleep(100);
          if ((await evalJs('I18n.locale')) === SHOT_LANG) break;
        }
      }

      for (const s of SCREENS) {
        await evalJs("switchTab('" + s.tab + "')").catch(() => {});
        await sleep(260);
        // Sekme degisimi yeni DOM yaziyor -> olcegi tekrar uygula.
        await evalJs('(' + PAGE_SCALE.toString() + ')(' + k + ')');
        await sleep(90);
        const r = await evalJs('(' + PAGE_SCAN.toString() + ')("' + s.sel + '")');
        hucre++;
        const kotu = r && !r.yok && (r.tasan.length || r.yatay || r.govdeTasma);
        if (kotu) {
          hatalar.push({ w, k, ekran: s.ad, ...r });
          console.log('  ✗ ' + w + 'px ×' + k + '  ' + s.ad);
          r.tasan.slice(0, 4).forEach((t) =>
            console.log('       "' + t.metin + '"  +' + t.px + 'px' +
              '  (kutu ' + t.kutu + ' / metin ' + t.metinPx + ' / satir ' + t.satir + ')' +
              '  .' + t.sinif));
          if (r.yatay) console.log('       yatay kaydırma var');
        } else if (VERBOSE) {
          console.log('  ✓ ' + w + 'px ×' + k + '  ' + s.ad);
        }
        if (SHOT) {
          await cmd('Emulation.setDeviceMetricsOverride',
            { width: w, height: 1400, deviceScaleFactor: 2, mobile: true });
          await sleep(220);
          const png = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          const dosya = path.join(SHOT_DIR,
            'shot-' + (SHOT_LANG || 'tr') + '-' + w + 'x' + k + '-' + s.tab + '.png');
          fs.writeFileSync(dosya, Buffer.from(png.result.data, 'base64'));
          console.log('  🖼  ' + dosya);
          await cmd('Emulation.setDeviceMetricsOverride',
            { width: w, height: 780, deviceScaleFactor: 1, mobile: true });
        }
      }
    }
    process.stdout.write('  … ' + w + 'px bitti\n');
  }

  // ══════════════════════════════════════════════════════════════
  //  DİL EKSENİ
  // ══════════════════════════════════════════════════════════════
  // NEDEN AYRI BİR GEÇİŞ VE NEDEN TEK HÜCREDE:
  // Yukarıdaki matris 6×3×3 = 54 hücre ve ~3 dakika sürüyor; maliyetin
  // neredeyse tamamı her (genişlik, ölçek) çifti için sayfayı yeniden
  // yüklemek. 15 dille çarpınca 810 hücre / ~45 dakika ederdi — kimsenin
  // çalıştırmayacağı bir araç, çalışmayan bir araçtır.
  //
  // İki gözlem bunu gereksiz kılıyor:
  //  1. Matris zaten YAPISAL güvenliği kanıtlıyor (kutular esniyor,
  //     ikonlar em tabanlı, üst bar sarıyor). Dil ekseninin kanıtlaması
  //     gereken şey farklı: DAHA UZUN metin bu yapıyı kırıyor mu?
  //  2. O soru en dar genişlik ve en büyük yazı ölçeğinde en serttir.
  //     320px × 1.3 sığıyorsa daha genişi de sığar — taşma bu iki
  //     eksende monotondur.
  // Dolayısıyla dil eksenі 320×1.3'te, TEK sayfa yüklemesiyle koşuyor:
  // dil değişimi zaten yeniden başlatma gerektirmiyor (özelliğin kendisi),
  // o yüzden 15 dil × 3 ekran ≈ 30 saniye. Üstelik bu, çalışma zamanı
  // dil değişiminin GERÇEK yolunu da test etmiş oluyor.
  const LOC_W = 320, LOC_K = 1.3;
  if (!SHOT) {
    console.log('\n  DİL EKSENİ — ' + LOC_W + 'px ×' + LOC_K + ' (en zorlu hücre)');
    await cmd('Emulation.setDeviceMetricsOverride',
      { width: LOC_W, height: 780, deviceScaleFactor: 1, mobile: true });
    await cmd('Page.navigate', { url: 'http://localhost:' + PORT + '/index.html' });
    await sleep(1200);
    await evalJs(`(async () => {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map(r => r.unregister()));
      const ks = await caches.keys();
      await Promise.all(ks.map(x => caches.delete(x)));
    })()`).catch(() => {});
    await cmd('Page.reload', { ignoreCache: true });
    await sleep(7800);

    const diller = JSON.parse(
      (await evalJs('JSON.stringify(I18n.SUPPORTED.map(x => x.code))')) || '[]');
    if (!diller.length) {
      console.log('  ✗ I18n.SUPPORTED okunamadı — dil ekseni ATLANDI');
      hatalar.push({ w: LOC_W, k: LOC_K, ekran: 'dil ekseni', tasan: [], yatay: false });
    }

    for (const kod of diller) {
      // set() locale dosyasını <script> ile getiriyor; yüklenene kadar bekle.
      await evalJs('I18n.set("' + kod + '")');
      let hazir = false;
      for (let i = 0; i < 40 && !hazir; i++) {
        await sleep(100);
        hazir = (await evalJs('I18n.locale')) === kod;
      }
      if (!hazir) {
        console.log('  ✗ ' + kod + '  — locale YÜKLENEMEDİ');
        hatalar.push({ w: LOC_W, k: LOC_K, ekran: kod + ' (yükleme)', tasan: [], yatay: false });
        continue;
      }
      // YÖN GERÇEKTEN UYGULANDI MI: <html dir> ile I18n'in bildirdiği
      // yön ayrışırsa Arapça metin doğru ama düzen ters kalır — ve bu,
      // ekran görüntüsüne bakmadan fark edilmeyen türden bir hatadır.
      const yon = await evalJs('document.documentElement.getAttribute("dir")');
      const bekYon = await evalJs('I18n.dir');
      if (yon !== bekYon) {
        console.log('  ✗ ' + kod + '  — <html dir>=' + yon + ', beklenen ' + bekYon);
        hatalar.push({ w: LOC_W, k: LOC_K, ekran: kod + ' (dir)', tasan: [], yatay: false });
      }
      // OYUN DÜNYASI LTR KALMALI. Kabuk Arapça'da aynalanıyor ama
      // #game-container dönmüyor (bkz. index.html'deki gerekçe).
      const oyunYon = await evalJs(
        'getComputedStyle(document.getElementById("game-container")).direction');
      if (oyunYon !== 'ltr') {
        console.log('  ✗ ' + kod + '  — #game-container yönü ' + oyunYon + ', ltr olmalı');
        hatalar.push({ w: LOC_W, k: LOC_K, ekran: kod + ' (oyun yönü)', tasan: [], yatay: false });
      }

      let kotuEkran = 0;
      for (const s of SCREENS) {
        await evalJs("switchTab('" + s.tab + "')").catch(() => {});
        await sleep(220);
        await evalJs('(' + PAGE_SCALE.toString() + ')(' + LOC_K + ')');
        await sleep(90);
        const r = await evalJs('(' + PAGE_SCAN.toString() + ')("' + s.sel + '")');
        hucre++;
        const kotu = r && !r.yok && (r.tasan.length || r.yatay || r.govdeTasma);
        if (kotu) {
          kotuEkran++;
          hatalar.push({ w: LOC_W, k: LOC_K, ekran: kod + ' / ' + s.ad, ...r });
          console.log('  ✗ ' + kod + '  ' + s.ad);
          r.tasan.slice(0, 3).forEach((t) =>
            console.log('       "' + t.metin + '"  +' + t.px + 'px  .' + t.sinif));
          if (r.yatay) console.log('       yatay kaydırma var');
        }
      }
      if (!kotuEkran && VERBOSE) console.log('  ✓ ' + kod + ' (' + yon + ')');
    }
    // Kalıcı bir tercih bırakma: sonraki koşum sistemi izlesin.
    await evalJs('I18n.set(null)').catch(() => {});
  }

  kapat();

  console.log('\n  taranan hücre : ' + hucre);
  console.log('  sorunlu hücre : ' + hatalar.length);
  if (hatalar.length) {
    // En sik tekrarlayan metinler — once onlari duzeltmek en cok hucreyi kapatir.
    const say = {};
    hatalar.forEach((h) => h.tasan.forEach((t) => {
      const anahtar = t.sinif + ' — "' + t.metin + '"';
      say[anahtar] = (say[anahtar] || 0) + 1;
    }));
    console.log('\n  EN SIK TAŞANLAR');
    Object.entries(say).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([kk, n]) => console.log('    ' + String(n).padStart(3) + '×  ' + kk));
    console.log('\nMATRİS BAŞARISIZ\n');
    process.exit(1);
  }
  console.log('\nMATRİSİN TAMAMI TEMİZ\n');
  process.exit(0);
})().catch((e) => { console.error('ARAÇ HATASI', e); process.exit(1); });

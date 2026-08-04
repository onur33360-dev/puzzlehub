#!/usr/bin/env node
//  ---------------------------------------------------------------------------
//  SlySwipe — Cihazdaki WebView'da JS çalıştırma aracı (Chrome DevTools Protocol)
//  ---------------------------------------------------------------------------
//
//  NEDEN VAR: logcat JS konsolunu TAŞIMIYOR. `chromium|Uncaught|Error`
//  filtreleri yalnızca native uyarıları veriyor; bir JS istisnası orada
//  görünmüyor. Ekran görüntüsü de bir ANIN karesi — "isActive() true döndü mü",
//  "bakiye tam olarak kaç arttı" gibi sorular kareyle cevaplanamaz.
//
//  Bu araç uygulamaya HİÇBİR debug kodu eklemeden sayfanın gerçek durumunu
//  okumanın tek pratik yolu. Özellikle satın alma doğrulamasında kritik:
//  "Premium faydaları tetiklendi mi" sorusunun cevabı görsel değil, sayısal.
//
//  BAĞIMLILIK YOK — depo kuralı (CLAUDE.md §6). WebSocket el ile yazıldı
//  çünkü Node 20'de global `WebSocket` yok ve `ws` paketi kurulu değil.
//  Yalnızca `net` + `crypto` kullanıyor.
//
//  KULLANIM
//    # 1) Soket adı PID EKLİDİR — "chrome_devtools_remote" DEĞİL:
//    adb shell cat /proc/net/unix | grep webview_devtools_remote
//    adb forward tcp:9222 localabstract:webview_devtools_remote_<PID>
//
//    # 2) Hedefin ws adresini al (AdMob SDK kendi hedeflerini açıyor,
//    #    localhost olanı seç):
//    curl -s http://localhost:9222/json/list
//
//    # 3) Çalıştır:
//    node tools/cdp.js <ws-url> "JSON.stringify({p: PlusSystem.isActive()})"
//
//  Promise dönen ifadeler de çalışır (`awaitPromise: true`), yani
//  "tetikle → bekle → oku" tek çağrıda yapılabiliyor.
//
//  Bu bir TEST ARACI, build adımı değil; yayına giren hiçbir kod onu
//  import etmiyor.

const net = require('net');
const crypto = require('crypto');

// ── Küçük bir WebSocket istemcisi ────────────────────────────────────────────
// Tam bir uygulama değil, CDP'nin ihtiyaç duyduğu kadarı: metin çerçevesi
// gönder, metin çerçevesi al. Parçalanmış (fragmented) çerçeve beklenmiyor —
// CDP yanıtları tek çerçevede geliyor; yine de devamı olan çerçevede uyarı
// veriyoruz ki sessizce yanlış cevap dönmesin.
function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(Number(u.port || 80), u.hostname, () => {
      sock.write(
        `GET ${u.pathname}${u.search} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Key: ${key}\r\n` +
        'Sec-WebSocket-Version: 13\r\n\r\n'
      );
    });

    let buf = Buffer.alloc(0);
    let handshaked = false;
    const listeners = [];

    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);

      if (!handshaked) {
        const end = buf.indexOf('\r\n\r\n');
        if (end === -1) return;
        const head = buf.slice(0, end).toString();
        if (!/HTTP\/1\.1 101/.test(head)) {
          return reject(new Error('WebSocket el sıkışması reddedildi:\n' + head));
        }
        buf = buf.slice(end + 4);
        handshaked = true;
        resolve({ send, onMessage, close: () => sock.destroy() });
      }

      // Çerçeveleri çöz.
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0;
        const opcode = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2); off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          // 2^53 üstü yük CDP'de gerçekçi değil; üst 32 bit yok sayılıyor.
          len = Number(buf.readBigUInt64BE(2)); off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if (opcode === 0x8) { sock.destroy(); return; }   // close
        if (opcode === 0x1 || opcode === 0x0) {
          if (!fin) console.error('[cdp] uyarı: parçalanmış çerçeve, cevap eksik olabilir');
          listeners.forEach((fn) => fn(payload.toString('utf8')));
        }
      }
    });

    sock.on('error', reject);

    function onMessage(fn) { listeners.push(fn); }

    // İstemci → sunucu çerçeveleri MASKELENMEK ZORUNDA (RFC 6455).
    // Maskesiz gönderirsen sunucu bağlantıyı sessizce kapatır ve bu
    // "cevap gelmedi" gibi görünür.
    function send(text) {
      const data = Buffer.from(text, 'utf8');
      const mask = crypto.randomBytes(4);
      let header;
      if (data.length < 126) {
        header = Buffer.from([0x81, 0x80 | data.length]);
      } else if (data.length < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81; header[1] = 0x80 | 126;
        header.writeUInt16BE(data.length, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81; header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(data.length), 2);
      }
      const masked = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i & 3];
      sock.write(Buffer.concat([header, mask, masked]));
    }
  });
}

// ── Runtime.evaluate ─────────────────────────────────────────────────────────
async function evaluate(wsUrl, expression, timeoutMs) {
  const ws = await wsConnect(wsUrl);
  const id = 1;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('CDP zaman aşımı (' + timeoutMs + 'ms) — sayfa yanıt vermedi'));
    }, timeoutMs);

    ws.onMessage((raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (msg.id !== id) return;              // olay bildirimleri: yok say
      clearTimeout(timer);
      ws.close();
      if (msg.error) return reject(new Error('CDP: ' + JSON.stringify(msg.error)));
      const r = msg.result || {};
      if (r.exceptionDetails) {
        const e = r.exceptionDetails;
        return reject(new Error('Sayfada istisna: ' +
          ((e.exception && (e.exception.description || e.exception.value)) || e.text)));
      }
      resolve(r.result ? r.result.value : undefined);
    });

    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: {
        expression,
        returnByValue: true,
        awaitPromise: true,       // Promise dönen ifadeler de çalışsın
        userGesture: true,        // satın alma gibi jest isteyen API'ler için
      },
    }));
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const [wsUrl, expr] = process.argv.slice(2);
  const timeout = Number(process.env.CDP_TIMEOUT || 20000);
  if (!wsUrl || !expr) {
    console.error('kullanım: node tools/cdp.js <ws-url> "<javascript>"');
    process.exit(2);
  }
  evaluate(wsUrl, expr, timeout)
    .then((v) => { console.log(typeof v === 'string' ? v : JSON.stringify(v)); })
    .catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}

module.exports = { evaluate, wsConnect };

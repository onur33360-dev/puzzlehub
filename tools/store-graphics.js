#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Play Store grafik uretici — SlySwipe
//
// Su an tek cikti: One Cikan Grafik (1024x500), Play Console'un ZORUNLU
// alani. Uygulamanin PARCASI DEGIL: cikti assets/store/ altina yaziliyor ve
// tools/build-www.js'in beyaz listesinde olmadigi icin www/'ye ya da APK'ya
// asla girmiyor. Bu yuzden boyutu da onemsiz.
//
// Kaynak sanat assets/logo.png (1254x1254). Yeni bir gorsel URETILMIYOR —
// magazadaki grafik ile telefondaki ikonun ayni sey olmasi, kullanicinin
// listeden uygulamayi tanimasinin tek yolu.
//
// Renkler style.css'teki iki markadan geliyor (--bg-body / --accent) ve
// ELLE senkron: bu dosya CSS okumuyor. Palet degisirse burasi da degisir —
// CLAUDE.md'deki "iki renk BES dosyada yazili" kuralinin alt basligi.
//
// Calistirma:  node tools/store-graphics.js
// ─────────────────────────────────────────────────────────────────────────────
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'store');

const BG = '#14142E';        // --bg-body
const ACCENT = '#8B5CF6';    // --accent
const ACCENT_LIGHT = '#c084fc';

const W = 1024, H = 500;

// Logo kutusu: solda, dikeyde ortali. 360 px, kenar payi 70 px.
// Play bazi yuzeylerde grafigin kenarlarini kirpiyor, o yuzden hicbir sey
// kenardan 60 px'ten yakin durmuyor.
const LOGO = 360, LOGO_X = 70, LOGO_Y = (H - LOGO) / 2;
const TEXT_X = LOGO_X + LOGO + 60;

async function featureGraphic() {
  // ── Zemin: marka gradyani + accent parlamasi ──
  // Parlama logonun ARKASINDA duruyor; logo kendi koyu zeminiyle geldigi
  // icin arkasinda isik olmazsa grafikte kara bir delik gibi oturuyor.
  const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="#1c1740"/>
        <stop offset="55%" stop-color="${BG}"/>
        <stop offset="100%" stop-color="#0f0f24"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.28" cy="0.5" r="0.55">
        <stop offset="0%"   stop-color="${ACCENT}" stop-opacity="0.45"/>
        <stop offset="60%"  stop-color="${ACCENT}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow2" cx="0.85" cy="0.15" r="0.5">
        <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  </svg>`);

  // ── Logo: kare koseleri yuvarlatiliyor ──
  // Kaynak sanatin kendi cizili yuvarlak cercevesi var ama dosya KARE;
  // maskelenmezse gradyanin uzerinde koyu bir kare kose olarak duruyor.
  const r = 76;
  const mask = Buffer.from(
    `<svg width="${LOGO}" height="${LOGO}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${LOGO}" height="${LOGO}" rx="${r}" ry="${r}" fill="#fff"/>
     </svg>`);

  const logo = await sharp(path.join(ROOT, 'assets', 'logo.png'))
    .resize(LOGO, LOGO, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // ── Metin ──
  // Basligin altindaki cizgi accent'ten; "11 oyun" satiri urunun tek
  // cumlelik vaadi ve magazada kisa aciklamayla AYNI seyi soylemeli.
  const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g font-family="Segoe UI, Arial, Helvetica, sans-serif">
      <text x="${TEXT_X}" y="212" font-size="94" font-weight="bold" fill="#ffffff"
            letter-spacing="-1">SlySwipe</text>
      <rect x="${TEXT_X + 3}" y="238" width="96" height="6" rx="3" fill="${ACCENT}"/>
      <text x="${TEXT_X}" y="304" font-size="42" font-weight="600" fill="${ACCENT_LIGHT}">11 oyun, tek uygulama</text>
      <text x="${TEXT_X}" y="356" font-size="28" font-weight="400" fill="#a9a6c9">Bulmaca &#183; Arcade &#183; Tamamen T&#252;rk&#231;e</text>
    </g>
  </svg>`);

  const out = await sharp(bg)
    .composite([
      { input: logo, left: LOGO_X, top: Math.round(LOGO_Y) },
      { input: text, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'feature-graphic-1024x500.png');
  fs.writeFileSync(file, out);

  const meta = await sharp(out).metadata();
  console.log('  ' + path.relative(ROOT, file).replace(/\\/g, '/') +
              ' — ' + meta.width + 'x' + meta.height +
              ', ' + Math.round(out.length / 1024) + ' KB');

  if (meta.width !== 1024 || meta.height !== 500) {
    console.error('  HATA: Play one cikan grafik icin TAM 1024x500 istiyor.');
    process.exit(1);
  }
}

featureGraphic().catch(e => { console.error(e); process.exit(1); });

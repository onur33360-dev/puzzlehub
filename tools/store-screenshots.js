#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Play Store ekran görüntüsü hazırlayıcı
// ═══════════════════════════════════════════════════════════════════════
//   node tools/store-screenshots.js
//   node tools/store-screenshots.js --no-caption   (başlıksız, sade)
//   node tools/store-screenshots.js --jpeg         (PNG yerine JPEG)
//
// screenshots/raw/*.png  →  screenshots/store-ready/*.png
//
// TEKRAR KULLANILABİLİR: yeni bir ham görüntü eklemek için tek yapılacak
// şey dosyayı raw/ içine koymak. Başlığı CAPTIONS tablosuna yaz; yoksa
// görüntü başlıksız ama yine kurallara uygun biçimde üretilir.
//
// ─── NEDEN SADECE KIRPIP GEÇMİYORUZ ───────────────────────────────────
// Ham telefon görüntüsü Play'in İKİ şartını birden ihlal ediyor ve ikisi
// de reddedilme sebebi (ölçüldü, varsayılmadı):
//
//   1) EN-BOY ORANI. Galaxy A51 ekranı 1080x2400, yani oran 0.450.
//      Play en dar 9:16'ya (0.5625) izin veriyor — telefon ekranı bundan
//      DAHA UZUN. Yani "olduğu gibi yükle" yolu yok; görüntünün yanlarına
//      pay eklenmek zorunda. Çıktı tam 1350x2400 = 9:16.
//
//   2) ALFA KANALI. screencap 4 kanallı PNG üretiyor; Play alfasız
//      24-bit PNG (ya da JPEG) istiyor. `.flatten()` bunu kapatıyor.
//
// Yanlara eklenen pay bu yüzden süs değil ZORUNLULUK; madem eklenecek,
// marka zeminine ve başlığa dönüştürülüyor.
//
// Renkler style.css'teki tokenlardan ELLE kopyalandı (bu betik CSS
// okumuyor). Palet değişirse burası da değişmeli — aynı kural
// tools/store-graphics.js için de geçerli.
'use strict';
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'screenshots', 'raw');
const OUT_DIR = path.join(ROOT, 'screenshots', 'store-ready');

// ── Marka ──
const BG_TOP    = '#1c1740';
const BG_MID    = '#14142E';   // --bg-body
const BG_BOT    = '#0f0f24';
const ACCENT    = '#8B5CF6';   // --accent
const ACCENT_LT = '#A78BFA';   // --accent-light
const TEXT      = '#EDEDF7';   // --text

// ── Play kuralları ──
// Kenar 320-3840 px, oran 9:16 ile 16:9 arasında. 1350x2400 tam 9:16.
const OUT_W = 1350, OUT_H = 2400;
const MIN_SIDE = 320, MAX_SIDE = 3840;
const MIN_RATIO = 9 / 16, MAX_RATIO = 16 / 9;

// Durum çubuğu ve sistem gezinme çubuğu kırpılıyor: operatör adı, saat ve
// pil yüzdesi mağaza görselinde bilgi taşımıyor, dikkat dağıtıyor.
// Cihaza özel; başka bir telefonla çekilirse bu iki sayı ölçülmeli.
const CROP_TOP = 78;
const CROP_BOTTOM = 96;

// ── Başlıklar ──
// Anahtar = dosya adının uzantısız hâli. Tablodaki sıra mağazadaki sıra
// olmalı: ilk iki kare dönüşümün çoğunu belirliyor, o yüzden ürünün
// FARKI (Keşfet akışı / oyun çeşitliliği) başa konur.
const CAPTIONS = {
  // SAYI YOK ve bu bilinçli (2026-08-13, sahip karari). Sabit bir oyun
  // sayisi her yeni oyunda basligi yalanci yapar ve guncellemesi birinin
  // aklinda kalmasina bagli kalir — Kesfet'teki "yeni oyun" rozetinin
  // sabit bayrak yerine TARIHE baglanmasiyla ayni gerekce.
  '01_hub':       { title: 'Tek Uygulamada Bir Sürü Oyun', sub: 'Bulmaca ve arcade — yeni oyunlar düzenli eklenir' },
  '02_gameplay1': { title: 'Parmağınla Sürükle',          sub: 'Kelimeyi bul — çapraz da serbest' },
  '03_gameplay2': { title: 'Blokları Yerleştir',          sub: 'Satırları temizle, kombo yap' },
  '04_gameplay3': { title: 'Her Gün Yeni Bulmaca',        sub: 'Günlük meydan okuma herkese aynı' },
  '05_plus':      { title: 'Reklamsız Oyna',              sub: 'SlySwipe Plus ile sınırsız devam' },
  '06_magaza':    { title: 'Elmas Kazan',                 sub: 'İpucu al, kaldığın yerden devam et' },
  '07_rozetler':  { title: 'Rozetleri Topla',             sub: 'Serini sürdür, görevleri tamamla' },
  '08_profil':    { title: 'İlerlemen Hep Yanında',       sub: 'Seviye, seri ve koleksiyon' },
};

const args = process.argv.slice(2);
const NO_CAPTION = args.includes('--no-caption');
const AS_JPEG = args.includes('--jpeg');

// XML'e girecek metin kaçışlanmalı; Türkçe karakterler UTF-8 olarak
// olduğu gibi geçiyor (SVG render'ı doğrulandı).
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function backdrop(hasCaption, cap) {
  // Başlık bloğu: küçük accent çizgi + büyük başlık + alt satır.
  const capSvg = hasCaption ? `
    <rect x="${OUT_W / 2 - 44}" y="118" width="88" height="6" rx="3" fill="${ACCENT}"/>
    <text x="${OUT_W / 2}" y="212" text-anchor="middle"
          font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="66" font-weight="bold" fill="${TEXT}">${esc(cap.title)}</text>
    <text x="${OUT_W / 2}" y="272" text-anchor="middle"
          font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="34" font-weight="600" fill="${ACCENT_LT}">${esc(cap.sub)}</text>` : '';

  return Buffer.from(`<svg width="${OUT_W}" height="${OUT_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%"   stop-color="${BG_TOP}"/>
        <stop offset="55%"  stop-color="${BG_MID}"/>
        <stop offset="100%" stop-color="${BG_BOT}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.08" r="0.62">
        <stop offset="0%"   stop-color="${ACCENT}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${OUT_W}" height="${OUT_H}" fill="url(#sky)"/>
    <rect width="${OUT_W}" height="${OUT_H}" fill="url(#glow)"/>
    ${capSvg}
  </svg>`);
}

// Köşeleri yuvarlatmak için maske. Ekran görüntüsü kare köşeli geliyor;
// marka zemininin üstünde kare bir blok "yapıştırılmış" duruyor.
function roundMask(w, h, r) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
     </svg>`);
}

async function build(file) {
  const name = path.basename(file, path.extname(file));
  const cap = CAPTIONS[name];
  const hasCaption = !NO_CAPTION && !!cap;

  const src = sharp(path.join(RAW_DIR, file));
  const meta = await src.metadata();

  // Durum/gezinme çubuklarını at.
  const cropH = meta.height - CROP_TOP - CROP_BOTTOM;
  if (cropH <= 0) throw new Error(name + ': kırpma payı görüntüden büyük');

  // Yerleşim: başlık varsa üstte yer ayrılıyor, yoksa görüntü ortalanıyor.
  const topPad = hasCaption ? 330 : 90;
  const botPad = 90;
  const sidePad = 96;
  const availH = OUT_H - topPad - botPad;
  const availW = OUT_W - sidePad * 2;

  // Oranı KORUYARAK sığdır — ezmek ekran görüntüsünü yalancı yapar.
  const ratio = meta.width / cropH;
  let shotH = availH, shotW = Math.round(shotH * ratio);
  if (shotW > availW) { shotW = availW; shotH = Math.round(shotW / ratio); }

  const shot = await src
    .extract({ left: 0, top: CROP_TOP, width: meta.width, height: cropH })
    .resize(shotW, shotH, { fit: 'fill' })
    .composite([{ input: roundMask(shotW, shotH, 26), blend: 'dest-in' }])
    .png()
    .toBuffer();

  const left = Math.round((OUT_W - shotW) / 2);
  const top = topPad + Math.round((availH - shotH) / 2);

  let img = sharp(backdrop(hasCaption, cap || {}))
    .composite([{ input: shot, left, top }])
    // ALFA KANALINI KAPAT — Play alfasız istiyor.
    // İKİ ADIM ŞART ve bu ölçümle öğrenildi: flatten() saydamlığı zemin
    // rengiyle DOLDURUYOR ama kanalı KALDIRMIYOR — çıktı hâlâ RGBA
    // yazılıyor ve Play'in "alfasız 24-bit" şartını ihlal ediyordu.
    // removeAlpha() kanalın kendisini atıyor.
    .flatten({ background: BG_MID })
    .removeAlpha();

  const outName = name + (AS_JPEG ? '.jpg' : '.png');
  const outPath = path.join(OUT_DIR, outName);
  img = AS_JPEG ? img.jpeg({ quality: 92, mozjpeg: true })
                : img.png({ compressionLevel: 9 });
  const buf = await img.toBuffer();
  fs.writeFileSync(outPath, buf);

  // ── Uygunluk denetimi — üretileni ölç, varsayma ──
  const m = await sharp(buf).metadata();
  const r = m.width / m.height;
  const problems = [];
  if (m.hasAlpha) problems.push('alfa kanalı var');
  if (Math.min(m.width, m.height) < MIN_SIDE) problems.push('kenar < ' + MIN_SIDE);
  if (Math.max(m.width, m.height) > MAX_SIDE) problems.push('kenar > ' + MAX_SIDE);
  if (r < MIN_RATIO - 1e-6 || r > MAX_RATIO + 1e-6) problems.push('oran ' + r.toFixed(3) + ' aralık dışı');

  return {
    name: outName, w: m.width, h: m.height, ratio: r,
    kb: Math.round(buf.length / 1024), alpha: !!m.hasAlpha,
    caption: hasCaption ? cap.title : '—', problems,
  };
}

(async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error('screenshots/raw/ yok. Önce ham görüntüleri oraya koy.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Alt çizgiyle başlayanlar çalışma dosyası (temas sayfası, tarama);
  // yalnızca numaralı ham görüntüler işleniyor.
  const files = fs.readdirSync(RAW_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f) && !f.startsWith('_'))
    .sort();

  if (!files.length) { console.error('raw/ içinde işlenecek görüntü yok.'); process.exit(1); }

  console.log('SlySwipe — Play ekran görüntüsü hazırlama');
  console.log('  hedef: ' + OUT_W + 'x' + OUT_H + ' (9:16), alfasız, ' + (AS_JPEG ? 'JPEG' : '24-bit PNG'));
  console.log('');

  let bad = 0;
  for (const f of files) {
    const r = await build(f);
    const flag = r.problems.length ? '  ✗ ' + r.problems.join(', ') : '  ✓';
    if (r.problems.length) bad++;
    console.log(flag + ' ' + r.name.padEnd(20) +
                r.w + 'x' + r.h + '  oran ' + r.ratio.toFixed(3) +
                '  ' + String(r.kb).padStart(5) + ' KB   ' + r.caption);
  }

  console.log('');
  console.log(files.length + ' görüntü → screenshots/store-ready/');
  if (bad) { console.log(bad + ' GÖRÜNTÜ PLAY KURALLARINA UYMUYOR'); process.exit(1); }
  console.log('Hepsi Play kurallarına uygun (oran, kenar, alfa).');
})();

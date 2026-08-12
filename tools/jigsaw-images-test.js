#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Jigsaw Görsel Havuzu Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
// Yerel garanti havuzunun (2026-08-02) sağlam kaldığını doğrular.
//
//   node tools/jigsaw-images-test.js
//
// Kardeş araçlardan (badges/quests/watersort) daha KISA olması bilinçli:
// burada doğrulanacak bir durum makinesi yok, bir dağıtım sözleşmesi var.
// Asıl korunan şey şu: "yerel" diye işaretlenmiş bir görselin dosyası
// gerçekten APK'ya giriyor mu, ve aynı fotoğraf havuzda iki kez var mı.

'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, readSrc } = require('./dom-sandbox');

const GAMES_SRC = readSrc('games/games.js');
const BUILD_SRC = readSrc('tools/build-www.js');

let failures = 0;
function ok(n)        { console.log('  ✓ ' + n); }
function bad(n, why)  { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

const s = makeSandbox();
const eng = s.get('PuzzleGames.jigsawCard.engine');
const POOL = eng.IMAGE_POOL;

console.log('SlySwipe — Jigsaw Görsel Havuzu Doğrulaması');

// ───────── 1. HAVUZ BÜTÜNLÜĞÜ ─────────
console.log('\n1. HAVUZ');
const locals = POOL.filter(p => p.src === 'local');
const remotes = POOL.filter(p => p.src !== 'local');
console.log('   yerel: ' + locals.length + '   uzak: ' + remotes.length + '   toplam: ' + POOL.length);

check('yerel görsel var', locals.length >= 5, locals.length + ' tane — ağsız çeşitlilik için az');
// Aynı fotoğrafın hem yerel hem uzak kopyası havuzda kalırsa oyuncu aynı
// resmi iki kez görür ve "tekrar etmiyor" garantisi bozulur.
const ids = POOL.map(p => p.id);
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
eq('havuzda yinelenen id yok', [...new Set(dupes)], []);

// Yerel görseller ağ isteği YAPMAMALI (promptun 2. maddesi).
const httpLocals = locals.filter(p => /^https?:/i.test(p.url));
eq('yerel görsellerin url\'i ağ adresi değil', httpLocals.map(p => p.id), []);
check('uzak görseller hâlâ unsplash\'ten', remotes.every(p => /^https:\/\/images\.unsplash\.com\//.test(p.url)));

// Kategori çeşitliliği: ağsız oyuncu hep aynı şeyi görmesin.
const cats = new Set(locals.map(p => p.category));
check('yerel havuz en az 5 farklı kategori', cats.size >= 5, [...cats].join(', '));

// ───────── 2. DOSYALAR GERÇEKTEN VAR MI ─────────
console.log('\n2. DOSYALAR');
for (const p of locals) {
  const rel = p.url;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { bad(p.id + ' dosyası yok', rel); continue; }
  const b = fs.readFileSync(abs);
  const isJpeg = b[0] === 0xFF && b[1] === 0xD8;
  // JPEG SOF işaretinden boyut oku — kare olmayan kaynak parçalama
  // hizasını bozar (bkz. paint(): background-position N-1'e bölünüyor).
  let w = 0, h = 0, i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break;
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  const kb = Math.round(b.length / 1024);
  if (isJpeg && w === h && w >= 900) ok(p.id + '  ' + w + '×' + h + '  ' + kb + ' KB');
  else bad(p.id, (isJpeg ? '' : 'JPEG değil; ') + w + '×' + h + ' (kare ve ≥900 olmalı)');
}
const totalKb = Math.round(locals.reduce((a, p) =>
  a + (fs.existsSync(path.join(ROOT, p.url)) ? fs.statSync(path.join(ROOT, p.url)).size : 0), 0) / 1024);
console.log('   toplam APK yükü: ' + totalKb + ' KB');
// Üst sınır bir tercih, kural değil: "birkaç görsel" demek, havuzu
// yerelleştirmek değil. Aşılırsa karar yeniden konuşulmalı.
check('APK yükü 2 MB\'ı aşmıyor', totalKb <= 2048, totalKb + ' KB');

// ───────── 3. DAĞITIM SÖZLEŞMESİ ─────────
console.log('\n3. DAĞITIM');
check('build-www SHIP listesinde assets/jigsaw var',
      /'assets\/jigsaw'/.test(BUILD_SRC),
      'APK\'ya girmez → cihazda yine numara çıkar');
// SHELL_ASSETS'te OLMAMALI: precache her sürüm bump'ında yeniden indirir.
// (Çapraz doğrulama tek yönlü olduğu için build bunu yakalamaz.)
const swSrc = readSrc('sw.js');
const shell = (swSrc.match(/const SHELL_ASSETS = \[([\s\S]*?)\]/) || [])[1] || '';
check('sw.js kabuk listesinde jigsaw görselleri YOK (precache değil)',
      !/assets\/jigsaw\/[^']*\.jpg'/.test(shell),
      'precache edilirse her APP_VERSION bump\'ında ~1 MB yeniden iner');
check('sw.js .jpg\'yi MEDIA_CACHE\'e yönlendiriyor',
      /MEDIA_EXT\.test\(url\.pathname\)/.test(swSrc) && /jpe?g/.test(swSrc));

// ───────── 4. YEDEK ZİNCİRİ ─────────
console.log('\n4. YEDEK ZİNCİRİ');
const start = GAMES_SRC.indexOf('PuzzleGames.jigsawCard');
const block = GAMES_SRC.slice(start);
const code = block.split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

check('üç deneme tükenince YEREL yedeğe düşülüyor',
      /fellBack = true; tries = 0; current = localFallbackFor\(level\)/.test(code),
      'ağ yokken hâlâ büyük-numara moduna düşer');
check('yedek seviyeden türetiliyor (aynı seviye → aynı yedek)',
      /function localFallbackFor\(lv\)/.test(code) && /LOCAL_POOL\[/.test(code));
check('yerel görsel de açılamazsa numara modu KORUNUYOR',
      /finish\(false\)/.test(code), 'son çare kaldırılmış');
check('kullanılan görsel geri veriliyor (başlık/HEDEF doğru olsun)',
      /done\(current\)/.test(code) && /image = used;/.test(code));
// Köşedeki küçük numara rozeti KALMALI — bu fazın kapsamı dışı, bilinçli.
check('küçük numara rozeti korundu (kapsam dışı)',
      /content:attr\(data-num\)/.test(GAMES_SRC) && /el\.dataset\.num = String\(home \+ 1\)/.test(code));

console.log('\n' + (failures === 0 ? 'TÜM TESTLER GEÇTİ' : failures + ' TEST BAŞARISIZ'));
process.exit(failures === 0 ? 0 : 1);

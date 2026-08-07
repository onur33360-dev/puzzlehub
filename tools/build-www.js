#!/usr/bin/env node
/* ============================================================
   SlySwipe — www/ derleyicisi
   ============================================================
   NE YAPAR: yayina giden dosyalari www/ altina KOPYALAR. Hepsi bu.
   Derleme, paketleme, donusturme yok — bu bir bundler DEGIL.

   NEDEN VAR: Capacitor bir "webDir" ister ve o klasorun TAMAMINI
   APK'nin icine gomer. Depo kokunu gostersek docs/, tools/, .git/
   ve olu klasorler (ui/, economy/, styles/) de APK'ya girerdi.

   ONEMLI — SESSIZ BAYATLAMA TUZAGI: gelistirme sunucusu depo
   kokunu servis eder, APK ise www/'yi. Kopyalamayi unutursan
   telefonda ESKI kod calisir ve hicbir hata gormezsin. Bu yuzden
   `npm run sync` her zaman once bu betigi calistirir; `cap sync`i
   elle cagirma.

   TEK DOGRULUK KAYNAGI sw.js icindeki SHELL_ASSETS'tir. Bu betik
   asagidaki listeyi ona karsi DOGRULAR: bir dosya sw.js'te olup
   burada olmazsa (ya da tersi) hata verip durur. Iki listenin
   birbirinden kaymasi, tespiti en zor dagitim hatasi olurdu.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// Yayina giden her sey. Klasor verilirse icerigi ozyinelemeli kopyalanir.
const SHIP = [
  'index.html',
  'manifest.json',
  'style.css',
  'sw.js',
  'core/design-tokens.css',
  'core/components.css',
  'core/rng.js',
  'core/ui-kit.js',
  'core/daily.js',
  'core/app.js',
  'games/games.js',
  'reels/reels.js',
  'assets/icons',
  // Jigsaw'in yerel garanti gorsel havuzu (~1.1 MB, 6 dosya). APK'ya
  // GIRMEK zorunda, ama sw.js SHELL_ASSETS'e BILEREK eklenmedi: precache
  // her APP_VERSION bump'inda yeniden indirilir ve acilisi geciktirir.
  // Ayni-origin .jpg istekleri sw.js'te zaten MEDIA_CACHE'e dusuyor
  // (surumden bagimsiz, ilk kullanimda dolan kova) — ses politikasiyla
  // ayni mantik. APK'da SW zaten kayitli degil, dosyalar yerel.
  'assets/jigsaw',
];

function fail(msg) {
  console.error('\n  HATA: ' + msg + '\n');
  process.exit(1);
}

/* --- sw.js kabuk listesiyle capraz dogrulama --------------- */
function shellAssetsFromSw() {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const m = src.match(/const SHELL_ASSETS = \[([\s\S]*?)\]/);
  if (!m) fail('sw.js icinde SHELL_ASSETS bulunamadi. Degisken adi mi degisti?');
  return m[1]
    .split('\n')
    .map(l => (l.match(/'([^']+)'/) || [])[1])
    .filter(Boolean)
    .map(p => p.replace(/^\.\//, ''))
    .map(p => (p === '' ? 'index.html' : p)); // './' = index.html
}

function verifyAgainstSw() {
  const shell = new Set(shellAssetsFromSw());
  // SHIP'teki klasorler (assets/icons) sw.js'te tek tek dosya olarak
  // gecer; o yuzden karsilastirmayi "onek de sayilir" seklinde yapiyoruz.
  const missing = [...shell].filter(
    a => !SHIP.includes(a) && !SHIP.some(s => a.startsWith(s + '/'))
  );
  if (missing.length) {
    fail(
      'sw.js kabuk listesinde olup www/ listesinde OLMAYAN dosyalar:\n    ' +
        missing.join('\n    ') +
        '\n  Bunlar APK\'ya girmez ve uygulama telefonda acilmaz.\n' +
        '  tools/build-www.js icindeki SHIP listesine ekle.'
    );
  }
}

/* --- kopyalama -------------------------------------------- */
function copyRecursive(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dst, name));
    }
    return 0;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return 1;
}

function countFiles(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return 1;
  return fs.readdirSync(p).reduce((n, f) => n + countFiles(path.join(p, f)), 0);
}

// ── SOZDIZIMI KAPISI (2026-08-07) ──
//
// Neden var: games.js icindeki bir template literal'e (backtick) yorum
// icinde ters tirnak yazildi, dizgi erken kapandi ve DOSYANIN TAMAMI
// ayristirilamaz hale geldi. Derleme bunu fark etmedi, bozuk dosyayi
// www/'ye ve APK'ya kopyaladi. Cihazda belirtisi son derece yaniltici:
// uygulama normal aciliyor, ana ekran calisiyor, ama PuzzleGames tanimsiz
// oldugu icin HICBIR OYUN acilmiyor ve hicbir yerde hata gorunmuyor.
//
// new Function() ayristirir ama CALISTIRMAZ — yani yan etkisi yok, sadece
// sozdizimi denetlenir. Bagimlilik yok (depo kurali).
function checkSyntax() {
  const JS = SHIP.filter(rel => rel.endsWith('.js'))
    .concat(['games/games.js', 'core/app.js'].filter(p => !SHIP.includes(p)));
  const seen = new Set();
  for (const rel of JS) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const p = path.join(OUT, rel);
    if (!fs.existsSync(p)) continue;
    try {
      new Function(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      fail('SOZDIZIMI HATASI — ' + rel + ': ' + e.message +
           '\n  (bozuk dosya APK\'ya girmesin diye derleme durduruldu)');
    }
  }
}

function main() {
  verifyAgainstSw();

  // www/ tamamen silinir: aksi halde depodan KALDIRILAN bir dosya
  // www/'de kalir ve APK'ya hayalet olarak girmeye devam eder.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let n = 0;
  for (const rel of SHIP) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) fail('yayin listesindeki dosya yok: ' + rel);
    copyRecursive(src, path.join(OUT, rel));
    n += countFiles(src);
  }

  checkSyntax();

  // Surumu ekrana bas: telefonda hangi surumun kosacagini burada gorursun.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ver = (html.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '?';

  console.log('  www/ hazir — ' + n + ' dosya, APP_VERSION ' + ver);
}

main();

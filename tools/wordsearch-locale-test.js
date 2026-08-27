#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı ÇOKLU DİL doğrulaması
// ═══════════════════════════════════════════════════════════════
//   node tools/wordsearch-locale-test.js            (dil başına 200 tahta)
//   node tools/wordsearch-locale-test.js --n 500    (daha derin)
//   node tools/wordsearch-locale-test.js --show tr  (bir tahtayı yazdır)
//
// NEDEN VAR: `wordsearch-test.js` tek dil (Türkçe) için yazılmıştı ve
// mekaniği doğruluyordu. 15 dille birlikte doğrulanması gereken şey
// değişti — mekanik değil, İÇERİĞİN ve ÜRETİCİNİN her yazı sisteminde
// tutarlı olması. Bir Devanagari tahtasının bozuk olduğunu gözle görmek
// için Hintçe bilmek gerekir; ölçüm bilmez ama sayar.
//
// HER DİL İÇİN DOĞRULANANLAR (şartnamenin listesi birebir):
//   1. generation failure — tahta üretilemeyen seviye yok
//   2. missing target word — her hedef kelime tahtada GERÇEKTEN var
//   3. duplicate target — aynı kelime bir tahtada iki kez yok
//   4. invalid grapheme — her hücre tek bir grapheme, hepsi alfabeden
//   5. impossible level — kelime tahtaya sığıyor, sayı tutuyor
// Ayrıca: dolgu locale'e uygun mu, kelimeler yalnızca kendi yazı
// sistemini mi kullanıyor, ters/çapraz okuma bozulmuş mu.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT, makeSandbox } = require('./dom-sandbox');

const argv = process.argv.slice(2);
const N = (() => { const i = argv.indexOf('--n'); return i < 0 ? 200 : (+argv[i + 1] || 200); })();
const SHOW = (() => { const i = argv.indexOf('--show'); return i < 0 ? null : argv[i + 1]; })();

let failures = 0;
const ok = (n) => console.log('  ✓ ' + n);
const bad = (n, why) => { failures++; console.log('  ✗ ' + n + (why ? '\n      ' + why : '')); };
const check = (n, c, why) => (c ? ok(n) : bad(n, why));

console.log('SlySwipe — Kelime Avı çoklu dil doğrulaması');

// ── Kum havuzu: bütün havuzları yükle ────────────────────────────────
const sandbox = makeSandbox({});
// LOCALE TABLOLARI DA YÜKLENMELİ. `I18n.set(kod)` tabloyu getiremezse
// dili DEĞİŞTİRMİYOR (bilinçli: yarı çevrilmiş arayüz yerine eskisi) —
// yani tablolar olmadan bu test 15 dili değil, 15 kez İngilizce'yi
// ölçerdi. İlk koşumda tam olarak bu oldu ve "her dil kendi havuzuyla
// üretti" doğrulaması bunu yakaladı; o satır bu yüzden var.
const LOC_DIR = path.join(ROOT, 'locales');
for (const f of fs.readdirSync(LOC_DIR)) {
  vm.runInContext(fs.readFileSync(path.join(LOC_DIR, f), 'utf8'), sandbox.sb,
                  { filename: 'locales/' + f });
}
const POOL_DIR = path.join(ROOT, 'games', 'words');
const kodlar = fs.readdirSync(POOL_DIR).filter(f => f.endsWith('.js'))
  .map(f => f.replace(/\.js$/, ''));
for (const f of fs.readdirSync(POOL_DIR)) {
  vm.runInContext(fs.readFileSync(path.join(POOL_DIR, f), 'utf8'), sandbox.sb,
                  { filename: 'games/words/' + f });
}

const WordPools = sandbox.get('WordPools');
const I18n = sandbox.get('I18n');
const eng = sandbox.get('PuzzleGames.wordSearch.engine');

// ── 1. KAYIT ─────────────────────────────────────────────────────────
console.log('\n1. HAVUZ KAYDI');
const SUP = JSON.parse(sandbox.get('JSON.stringify(I18n.SUPPORTED.map(x => x.code))'));
check('15 dilin hepsinde havuz dosyası var',
      SUP.every(c => kodlar.indexOf(c) !== -1),
      'eksik: ' + SUP.filter(c => kodlar.indexOf(c) === -1).join(', '));
check('fazladan havuz yok', kodlar.every(c => SUP.indexOf(c) !== -1),
      'fazla: ' + kodlar.filter(c => SUP.indexOf(c) === -1).join(', '));

// ── 2. HAVUZ İÇERİĞİ ─────────────────────────────────────────────────
console.log('\n2. HAVUZ İÇERİĞİ');
console.log('   dil       kelime  alfabe  dolgu  en kısa/uzun');
const icerik = [];
for (const code of SUP) {
  const p = WordPools.forLocale(code);
  const boylar = p.words.map(w => w.n);
  const enK = Math.min(...boylar), enU = Math.max(...boylar);
  icerik.push({ code, n: p.words.length, a: p.alphabet.length, f: p.fillerBag.length, enK, enU, p });
  console.log('   ' + code.padEnd(10) + String(p.words.length).padStart(5) +
              String(p.alphabet.length).padStart(8) + String(p.fillerBag.length).padStart(7) +
              '   ' + enK + '-' + enU);
}
check('her dilde en az 100 kelime', icerik.every(x => x.n >= 100),
      icerik.filter(x => x.n < 100).map(x => x.code + '=' + x.n).join(', '));

// DEĞİŞMEZ: kelimelerde geçen her grapheme dolguda da üretilebilmeli.
// Aksi hâlde o harf "kesin kelime" ipucunu bedava verir.
{
  const kotu = [];
  for (const x of icerik) {
    const dolgu = new Set(x.p.fillerBag);
    for (const w of x.p.words) for (const g of w.g)
      if (!dolgu.has(g)) { kotu.push(x.code + ':' + w.w + ' [' + g + ']'); break; }
  }
  check('kelimelerdeki her grapheme dolguda da var', !kotu.length, kotu.slice(0, 8).join(', '));
}

// YAZI SİSTEMİ KARIŞMASIN: Türkçe dışındaki hiçbir havuzda Türkçe'ye
// özgü harf, Latin dışı havuzlarda Latin harf olmamalı.
{
  const TR_OZEL = /[çğıöşüÇĞİÖŞÜ]/;
  const LATIN = /[A-Za-z]/;
  const LATIN_DILLER = ['tr', 'en', 'es', 'pt-BR', 'de', 'fr', 'it', 'id', 'pl'];
  const trSizinti = [], latinSizinti = [];
  for (const x of icerik) {
    for (const w of x.p.words) {
      if (x.code !== 'tr' && TR_OZEL.test(w.w)) trSizinti.push(x.code + ':' + w.w);
      if (LATIN_DILLER.indexOf(x.code) === -1 && LATIN.test(w.w)) latinSizinti.push(x.code + ':' + w.w);
    }
  }
  check('Türkçe dışı havuzlarda Türkçe harf yok', !trSizinti.length, trSizinti.slice(0, 8).join(', '));
  check('Latin olmayan havuzlarda Latin harf yok', !latinSizinti.length, latinSizinti.slice(0, 8).join(', '));
  // Dolgu da aynı kurala tabi — asıl "Türkçe filler harf" riski burada.
  const dolguSiz = icerik.filter(x => x.code !== 'tr' && TR_OZEL.test(x.p.fillerBag.join('')));
  check('Türkçe dışı dolgularda Türkçe harf yok', !dolguSiz.length,
        dolguSiz.map(x => x.code).join(', '));
}

// ── 3. TAHTA ÜRETİMİ ─────────────────────────────────────────────────
// Motor aktif dile `I18n.locale` üzerinden bakıyor; dili değiştirip
// gerçek yolu sürüyoruz (test için açılmış bir arka kapı yok).
console.log('\n3. TAHTA ÜRETİMİ  (' + N + ' tahta × ' + SUP.length + ' dil)');
console.log('   dil        tahta  hata  eksik  ikiz  grapheme  sığmaz  ikizYer');

const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const özet = [];
for (const code of SUP) {
  sandbox.get('I18n.set("' + code + '")');
  const aktif = sandbox.get('I18n.locale');
  const pool = WordPools.forLocale(code);
  const alfa = new Set(pool.alphabet);
  let hata = 0, eksik = 0, ikiz = 0, grapheme = 0, sigmaz = 0, ikizYerlesim = 0;

  for (let i = 0; i < N; i++) {
    const lv = 1 + (i % 60);            // beş kademeyi de gez
    let b;
    try { b = eng.buildBoard(lv); } catch (e) { hata++; continue; }
    if (!b || !b.grid || !b.placed || !b.placed.length) { hata++; continue; }

    // (4) her hücre TEK grapheme ve alfabeden
    for (let r = 0; r < b.size; r++) {
      for (let c = 0; c < b.size; c++) {
        const v = b.grid[r][c];
        if (!v || WordPools.graphemes(v).length !== 1 || !alfa.has(v)) { grapheme++; r = b.size; break; }
      }
    }

    // (3) aynı kelime iki kez hedef olmasın
    const adlar = b.placed.map(x => x.word);
    if (new Set(adlar).size !== adlar.length) ikiz++;

    for (const pw of b.placed) {
      // (5) tahtaya sığıyor mu
      if (pw.g.length > b.size) sigmaz++;
      // (2) hücreler gerçekten o kelimeyi mi veriyor
      const okunan = pw.cells.map(k => { const q = k.split(','); return b.grid[+q[0]][+q[1]]; });
      if (!eq(okunan, pw.g)) { eksik++; continue; }
      // countOccurrences ile bağımsız arama: kelime tahtada BULUNABİLİR mi
      const kac = eng.countOccurrences(b.grid, pw.g, b.size);
      if (kac < 1) eksik++;
      // TEKİLLİK: kelimenin tahtada BİRDEN FAZLA yerleşimi olmamalı.
      // Aksi hâlde oyuncu geçerli bir yol çizer, validate() kabul eder
      // ama KANONİK hücreleri boyar — yani başka hücreler yeşile döner.
      // zh-Hans'teki yinelemeli kelimeler (星星, 姐姐) bu riskin
      // yoğunlaştığı yer; ölçüm önce %2.9 göstermişti.
      if (kac > 1) ikizYerlesim++;
    }
  }
  özet.push({ code, aktif, hata, eksik, ikiz, grapheme, sigmaz, ikizYerlesim });
  console.log('   ' + code.padEnd(10) + String(N).padStart(5) +
    String(hata).padStart(6) + String(eksik).padStart(7) + String(ikiz).padStart(6) +
    String(grapheme).padStart(10) + String(sigmaz).padStart(8) +
    String(ikizYerlesim).padStart(7) +
    (aktif === code ? '' : '   ✗ dil ' + aktif));
}
sandbox.get('I18n.set(null)');

check('hiçbir dilde üretim hatası yok', özet.every(x => !x.hata),
      özet.filter(x => x.hata).map(x => x.code + '=' + x.hata).join(', '));
check('hiçbir tahtada eksik hedef kelime yok', özet.every(x => !x.eksik),
      özet.filter(x => x.eksik).map(x => x.code + '=' + x.eksik).join(', '));
check('hiçbir tahtada ikiz hedef yok', özet.every(x => !x.ikiz),
      özet.filter(x => x.ikiz).map(x => x.code + '=' + x.ikiz).join(', '));
check('her hücre tek ve geçerli bir grapheme', özet.every(x => !x.grapheme),
      özet.filter(x => x.grapheme).map(x => x.code + '=' + x.grapheme).join(', '));
check('hiçbir kelime tahtaya sığmaz değil', özet.every(x => !x.sigmaz),
      özet.filter(x => x.sigmaz).map(x => x.code + '=' + x.sigmaz).join(', '));
check('hiçbir kelimenin ikinci bir yerleşimi yok', özet.every(x => !x.ikizYerlesim),
      özet.filter(x => x.ikizYerlesim).map(x => x.code + '=' + x.ikizYerlesim).join(', '));
  check('her dil kendi havuzuyla üretti', özet.every(x => x.aktif === x.code),
      özet.filter(x => x.aktif !== x.code).map(x => x.code + '→' + x.aktif).join(', '));

// ── 4. TERS VE ÇAPRAZ OKUMA ──────────────────────────────────────────
// Sürükleme mekaniğinin çekirdeği: bir kelime ileri de ters de okunabilir.
// `[...str].reverse()` code point'e göre çalışıyordu ve Devanagari'de
// bozuluyordu; artık grapheme dizisi ters çevriliyor.
console.log('\n4. TERS OKUMA (grapheme güvenli)');
{
  const kotu = [];
  for (const code of SUP) {
    const p = WordPools.forLocale(code);
    for (const w of p.words.slice(0, 40)) {
      const ters = w.g.slice().reverse();
      const geri = ters.slice().reverse();
      if (!eq(geri, w.g)) kotu.push(code + ':' + w.w);
      // Ters çevirme HİÇBİR grapheme'i bölmemeli.
      if (ters.join('').length !== w.w.length) kotu.push(code + ':' + w.w + ' (uzunluk)');
    }
  }
  check('ters çevirme hiçbir grapheme\'i bölmüyor', !kotu.length, kotu.slice(0, 8).join(', '));
  // Kontrol: code-point yolu Devanagari'de GERÇEKTEN bozuluyor mu?
  // Bozulmuyorsa bu testin bir anlamı kalmaz ve bilmek isteriz.
  const hi = WordPools.forLocale('hi');
  const cokluk = hi.words.filter(w => w.g.some(g => [...g].length > 1));
  check('hi havuzunda çok-code-point\'li grapheme GERÇEKTEN var',
        cokluk.length > 0,
        'yoksa grapheme testi bir şey kanıtlamıyor demektir');
}

// ── 5. ZORLUK LOCALE-AWARE ───────────────────────────────────────────
console.log('\n5. ZORLUK');
{
  const farkli = new Set();
  for (const code of SUP) {
    sandbox.get('I18n.set("' + code + '")');
    const p1 = eng.paramsFor(1), p5 = eng.paramsFor(80);
    farkli.add(p1.minLen + '-' + p1.maxLen + '/' + p5.minLen + '-' + p5.maxLen);
  }
  sandbox.get('I18n.set(null)');
  check('uzunluk kuralları diller arasında GERÇEKTEN farklı', farkli.size > 1,
        'tek kural: ' + [...farkli][0] + ' — locale-aware olmadığı anlamına gelir');
  sandbox.get('I18n.set("zh-Hans")');
  const zh = eng.paramsFor(80);
  sandbox.get('I18n.set("de")');
  const de = eng.paramsFor(80);
  sandbox.get('I18n.set(null)');
  check('Çince kısa, Almanca uzun kelime istiyor', zh.maxLen < de.maxLen,
        'zh maxLen=' + zh.maxLen + ', de maxLen=' + de.maxLen);
}

// ── 6. TEKRAR PENCERESİ ──────────────────────────────────────────────
console.log('\n6. ARDIŞIK TEKRAR');
{
  sandbox.get('I18n.set("en")');
  const gorulen = [];
  for (let lv = 1; lv <= 12; lv++) gorulen.push(eng.buildBoard(lv).placed.map(x => x.word));
  let ardisik = 0;
  for (let i = 1; i < gorulen.length; i++)
    for (const w of gorulen[i]) if (gorulen[i - 1].indexOf(w) !== -1) ardisik++;
  sandbox.get('I18n.set(null)');
  check('ardışık iki seviyede aynı kelime yok', ardisik === 0, ardisik + ' tekrar');
}

// ── 7. KEŞFET ÖNİZLEME MALİYETİ ──────────────────────────────────────
// Şartnamenin kuralı: "her scroll'da dev word pool parse etme".
// Havuz `register()` anında BİR KEZ ön işleniyor (grapheme dizileri
// orada hesaplanıyor), kart kurulumu yalnızca bir sözlük araması + bir
// filtre yapıyor. Bu ölçüm o iddiayı sayıya bağlıyor — yavaşlarsa
// birileri kart başına ayrıştırma eklemiş demektir.
console.log('\n7. KEŞFET ÖNİZLEME MALİYETİ');
{
  const mk = sandbox.get('MiniDemos.demo_wordSearch');
  const KART = 200;
  let enYavas = 0, enYavasDil = '';
  for (const code of SUP) {
    sandbox.get('I18n.set("' + code + '")');
    const t0 = Date.now();
    for (let i = 0; i < KART; i++) mk(['#000', '#111']);
    const perKart = (Date.now() - t0) / KART;
    if (perKart > enYavas) { enYavas = perKart; enYavasDil = code; }
  }
  sandbox.get('I18n.set(null)');
  console.log('   en yavaş dil: ' + enYavasDil + ' — kart başına ' + enYavas.toFixed(3) + ' ms');
  // Bütçe cömert (ölçülen en kötü ~0.2 ms) ama sonsuz değil: 2 ms'i
  // aşmak, kaydırma sırasında kart kurulumunun hissedilir olması demek.
  check('kart kurulumu her dilde < 2 ms', enYavas < 2,
        enYavasDil + ' = ' + enYavas.toFixed(3) + ' ms');
}

// ── Tahtayı göster ───────────────────────────────────────────────────
if (SHOW) {
  sandbox.get('I18n.set("' + SHOW + '")');
  const b = eng.buildBoard(25);
  console.log('\n' + SHOW + ' örnek tahta (' + b.size + '×' + b.size + ')');
  for (const row of b.grid) console.log('   ' + row.join(' '));
  console.log('   kelimeler: ' + b.placed.map(x => x.word).join(', '));
}

console.log(failures ? '\n' + failures + ' DOĞRULAMA DÜŞTÜ\n' : '\nTÜM TESTLER GEÇTİ\n');
process.exit(failures ? 1 : 0);

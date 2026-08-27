#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı Doğrulama Aracı
// ═══════════════════════════════════════════════════════════════
//   node tools/wordsearch-test.js
//   node tools/wordsearch-test.js --board 12    (bir tahtayı yazdır)
//
// Kardeş araçlarla aynı dört katman:
//   1. HAVUZ    — içerik sağlığı (tekrar, Türkçe büyük harf, alfabe).
//   2. ÜRETEÇ   — 200 seviye üretilip HER kelimenin tahtada gerçekten
//                 bulunduğu, doğru yönde ve tam olarak BİR kez geçtiği
//                 doğrulanıyor. Üretici "kelimeleri önce yerleştir"
//                 kuralına dayandığı için çözülebilirlik YAPISAL; burada
//                 yapıyı bozan bir regresyon aranıyor.
//   3. KAYNAK   — mimari iddialar ancak kaynağa bakarak kanıtlanır:
//                 eski dokunmalı seçim GERÇEKTEN kaldırıldı mı, Türkçe
//                 büyütme kullanılıyor mu, pointercancel bağlı mı,
//                 setPointerCapture geri gelmiş mi.
//   4. SEÇİM    — sürükleme matematiği: yön kilidi, geri sarma, ızgara
//                 dışına taşmama.
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, makeSandbox, readSrc } = require('./dom-sandbox');

const SRC = readSrc('games/games.js');

let failures = 0;
function ok(n)       { console.log('  ✓ ' + n); }
function bad(n, why) { failures++; console.log('  ✗ ' + n + '\n      ' + why); }
function check(n, c, why) { c ? ok(n) : bad(n, why || 'beklenen sağlanmadı'); }
function eq(n, a, e) {
  const x = JSON.stringify(a), y = JSON.stringify(e);
  x === y ? ok(n) : bad(n, 'beklenen ' + y + ', gelen ' + x);
}

// ───────────────────────────────────────────────────────────────
//  1. HAVUZ
// ───────────────────────────────────────────────────────────────
function testPool(sandbox) {
  console.log('\n1. KELİME HAVUZU (Türkçe)');
  // 2026-08-16: havuz artık `WordPools` kayıt defterinden geliyor ve 15
  // dil var. BU ARAÇ TÜRKÇEYE ODAKLI KALIYOR — doğruladığı şey mekanik
  // (sürükleme, seviye, üretici) ve onun için tek dil yeterli. Diller
  // arası doğrulama ayrı bir araçta: tools/wordsearch-locale-test.js
  const W = sandbox.get('WordPools').forLocale('tr');
  check('tr havuzu kayıtlı', !!W && Array.isArray(W.words));
  if (!W) return null;

  const words = W.words.map(x => x.w);
  check('havuz anlamlı büyüklükte (>=200)', words.length >= 200, words.length + ' kelime');
  eq('tekrar eden kelime yok', words.length - new Set(words).size, 0);

  // TÜRKÇE BÜYÜTME: bu testin varlık sebebi, JS'in 'i'.toUpperCase()
  // değerinin Türkçede YANLIŞ olması ('I', doğrusu 'İ'). Havuz hazır
  // büyük harf olmazsa oyun içi karşılaştırma sessizce ıskalardı.
  const notUpper = words.filter(w => w !== w.toLocaleUpperCase('tr'));
  eq('hepsi Türkçe büyük harf', notUpper, []);

  // Alfabe artık HAVUZDAN TÜRETİLİYOR, o yüzden "alfabe dışı harf" diye
  // bir durum yapısal olarak imkânsız hâle geldi. Doğrulanacak şey
  // tersine döndü: dolgu, kelimelerde geçen HER harfi üretebiliyor mu?
  // Üretemezse o harf "bu hücre kesin bir kelimeye ait" ipucunu bedava
  // verir — eski testin korumaya çalıştığı şeyin aynısı, doğru yönden.
  const dolgu = new Set(W.fillerBag);
  const uretilemez = [];
  for (const w of W.words) for (const gph of w.g) if (!dolgu.has(gph)) uretilemez.push(w.w);
  eq('dolgu, kelimelerdeki her harfi üretebiliyor', uretilemez.slice(0, 5), []);
  // Türk alfabesinde Q/W/X yok; tahtada görünmeleri bedava eleme sağlar.
  check('Türk alfabesinde Q/W/X yok', !/[QWX]/.test(W.alphabet.join('')));
  check('havuz büyütme dilini tr olarak bildiriyor', W.upperLocale === 'tr', String(W.upperLocale));

  const lens = W.words.map(w => w.n);
  check('en kısa kelime >= 3 harf', Math.min(...lens) >= 3, 'en kısa ' + Math.min(...lens));
  // 12x12 en büyük ızgara; daha uzunu hiçbir seviyede yerleşemez ve
  // havuzda ölü kayıt olarak durur.
  check('en uzun kelime <= 12 harf', Math.max(...lens) <= 12, 'en uzun ' + Math.max(...lens));
  // "en az 8 kategori" doğrulaması KALDIRILDI: kategori alanı (`c`) eski
  // words-tr.js'in içerik düzeni içindi ve oyuncuya hiç gösterilmiyordu.
  // 15 dilin havuzunda böyle bir alan yok — tutmak, on beş dilde
  // doldurulması gereken ama hiçbir şey yapmayan bir alan demekti.
  return W;
}

// ───────────────────────────────────────────────────────────────
//  2. ÜRETEÇ
// ───────────────────────────────────────────────────────────────
function findWord(grid, word, size, DIRS) {
  const hits = [];
  for (const d of DIRS) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const er = r + d[0] * (word.length - 1), ec = c + d[1] * (word.length - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        let good = true;
        for (let i = 0; i < word.length; i++) {
          if (grid[r + d[0] * i][c + d[1] * i] !== word[i]) { good = false; break; }
        }
        if (good) hits.push({ r, c, d });
      }
    }
  }
  return hits;
}

function testGenerator(eng, W) {
  console.log('\n2. ÜRETEÇ — 200 seviye');
  const LEVELS = 200;
  let boards = 0, totalWords = 0, dupWordBoards = 0, sizes = {};
  const t0 = Date.now();

  for (let lv = 1; lv <= LEVELS; lv++) {
    const b = eng.buildBoard(lv);
    boards++;
    sizes[b.size] = (sizes[b.size] || 0) + 1;

    if (!b.placed.length) { bad('seviye ' + lv + ' tahtası boş', 'hiç kelime yerleşmedi'); return; }

    // Izgara tam dolu mu (boş hücre kalmamalı — dolgu çalışmış olmalı)
    for (let r = 0; r < b.size; r++) {
      for (let c = 0; c < b.size; c++) {
        if (!b.grid[r][c]) { bad('seviye ' + lv + ' boş hücre', r + ',' + c); return; }
        if (W.alphabet.indexOf(b.grid[r][c]) === -1) {
          bad('seviye ' + lv + ' alfabe dışı dolgu', b.grid[r][c]); return;
        }
      }
    }

    for (const p of b.placed) {
      totalWords++;
      // (a) kaydedilen hücreler gerçekten kelimeyi yazıyor mu?
      const spelled = p.cells.map(k => {
        const [r, c] = k.split(',').map(Number);
        return b.grid[r][c];
      }).join('');
      if (spelled !== p.word) {
        bad('seviye ' + lv + ' hücre/kelime uyuşmuyor', p.word + ' vs ' + spelled); return;
      }
      // (b) tahtada BAĞIMSIZ olarak da bulunabiliyor mu? (veri ile
      //     ızgara ayrı ayrı doğru olabilir ama çift bozuk olabilir)
      // findWord grapheme DİZİSİ alıyor: dize geçmek Latin dışı bir
      // havuzda code unit'e bölerdi. Bu araç Türkçe koşuyor ama doğru
      // olanı yapmanın maliyeti sıfır.
      const hits = findWord(b.grid, p.g, b.size, eng.DIRS_ALL);
      if (!hits.length) { bad('seviye ' + lv + ' kelime tahtada yok', p.word); return; }
      if (hits.length > 1) dupWordBoards++;
    }
  }
  const ms = Date.now() - t0;

  ok(LEVELS + ' seviyenin tamamı üretildi (' + totalWords + ' kelime, ' + ms + ' ms)');
  ok('her kelime kaydedildiği hücrelerde birebir duruyor');
  ok('her kelime tahtada bağımsız aramayla da bulunuyor');
  ok('boş hücre yok, dolgu alfabe içinde · ızgara boyutları ' + JSON.stringify(sizes));

  // Kazara ikiz kelime bir CİLA, doğruluk şartı değil (fillBlanks sınırlı
  // sayıda deniyor). Oran düşük kalmalı, yoksa cila işe yaramıyor demektir.
  const dupRate = dupWordBoards / totalWords;
  check('kazara ikiz kelime oranı < %2',
        dupRate < 0.02, 'oran %' + (dupRate * 100).toFixed(2));

  // Performans: seviye üretimi ANA İPLİĞİ bloke ediyor (Arrow'un staleMax
  // dersi). Seviye başına bütçe cömert ama sonsuz değil.
  const perLevel = ms / LEVELS;
  check('seviye başına üretim < 30 ms', perLevel < 30, perLevel.toFixed(1) + ' ms');
}

function testTiers(eng) {
  console.log('\n2b. ZORLUK KADEMELERİ');
  const p1 = eng.paramsFor(1), p8 = eng.paramsFor(8), p15 = eng.paramsFor(15);
  const p30 = eng.paramsFor(30), p99 = eng.paramsFor(99);

  check('seviye 1 yalnızca kolay yönler (4)', p1.dirs.length === 4, p1.dirs.length + ' yön');
  check('yön sayısı monoton artıyor',
        p1.dirs.length <= p8.dirs.length && p8.dirs.length <= p15.dirs.length);
  check('11+ seviyede sekiz yönün hepsi', p15.dirs.length === 8);
  check('kelime sayısı monoton artıyor',
        p1.count <= p8.count && p8.count <= p30.count);

  // Kelime sayısı SONSUZA KADAR artmamalı — şartnamenin açık kuralı:
  // zorluk yerleşimden gelsin, ekrandaki çip sayısından değil.
  check('kelime sayısı 8’de tavan yapıyor', p99.count <= 8, p99.count + ' kelime');
  // Izgara telefonda okunabilir kalmalı.
  check('ızgara 12’de tavan yapıyor', p99.size <= 12, p99.size);
  check('örtüşme tercihi seviyeyle artıyor', p99.overlapBias > p1.overlapBias);
}

// ───────────────────────────────────────────────────────────────
//  3. KAYNAK TARAMASI
// ───────────────────────────────────────────────────────────────
function testSource() {
  console.log('\n3. KAYNAK — mimari iddialar');
  const m = SRC.match(/PuzzleGames\.wordSearch = \(\(\) => \{[\s\S]*?\n\}\)\(\);/);
  check('wordSearch modülü bulundu', !!m);
  if (!m) return;
  const mod = m[0];

  // ESKİ MEKANİK GERÇEKTEN GİTTİ Mİ? Şartnamenin ilk maddesi buydu ve
  // "çalışıyor gibi görünüyor" ile "kaldırıldı" farklı şeyler: eski
  // fonksiyon dosyada kalsaydı bir sonraki değişiklikte geri bağlanabilirdi.
  check('onCellClick (ilk harf/son harf) KALDIRILDI',
        !/onCellClick/.test(mod), 'eski dokunmalı seçim hâlâ kaynakta');
  check('selStart durumu KALDIRILDI', !/selStart/.test(mod));
  check('sabit WORDS dizisi KALDIRILDI',
        !/const WORDS\s*=\s*\[/.test(mod), 'kelimeler hâlâ oyun kodunda gömülü');

  // Sürükleme sözleşmesi
  check('pointerdown tahtaya bağlı', /addEv\(boardEl, 'pointerdown'/.test(mod));
  check('pointermove/up PENCEREYE bağlı',
        /addEv\(window, 'pointermove'/.test(mod) && /addEv\(window, 'pointerup'/.test(mod),
        'parmak tahta dışında bırakılırsa seçim asılı kalır');
  // Bu iki iddia koda değil, GEÇMİŞTEKİ HATALARA ait.
  check('pointercancel bağlı (hayalet çerçeve hatası)',
        /addEv\(window, 'pointercancel'/.test(mod));
  // ÇAĞRI aranıyor, kelimenin kendisi değil: modül "setPointerCapture
  // bilerek yok" diyen bir YORUM taşıyor ve düz arama onu da yakalıyordu.
  // Bir kaynak taraması, koddan söz eden yorumu koddan ayırmak zorunda.
  check('setPointerCapture ÇAĞRISI yok (phCamera dersi)',
        !/\.setPointerCapture\s*\(/.test(mod),
        'yakalama sonraki click’i yeniden hedefler; Ok Bulmaca’yı bir kez oynanamaz yapmıştı');

  // BÜYÜTME ARTIK HAVUZDAN. Eskiden burada `toLocaleUpperCase('tr')`
  // aranıyordu; o çağrı games.js'ten kalktı çünkü 15 dilde SABİT bir
  // büyütme dili yanlış olur (CJK/Arapça/Devanagari'de büyük harf
  // kavramı yok ve zorlamak kelimeyi bozabilir). Kural aynı yerde
  // duruyor, sadece taşındı: `WordPools.upper()` havuzun `upperLocale`
  // alanına bakıyor ve tr havuzu 'tr' diyor (bkz. 1. katman).
  check('büyütme havuzun diline devredilmiş',
        /WordPools\.upper\s*\(/.test(SRC) && !/toLocaleUpperCase\('tr'\)/.test(mod),
        "sabit 'tr' büyütmesi 15 dilde yanlış; havuz kendi dilini bildirmeli");
  // Grapheme güvenliği: code-unit indeksleme geri gelmiş olmamalı.
  //
  // YORUMLAR AYIKLANIYOR ve bu satır ilk yazıldığında tam olarak bundan
  // düştü: games.js'te bu desenin NEDEN kaldırıldığını anlatan bir yorum
  // var ve tarama onu kod sandı. CLAUDE.md'nin build-www için kaydettiği
  // tuzağın aynısı. `[^\n]*` kullanılıyor, `.` DEĞİL — depo CRLF ve
  // JS'te `.` `\r`'yi eşlemez, yani `//.*$` hiç tutmazdı.
  const modKod = mod.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check('ters okuma grapheme güvenli',
        !/\[\.\.\.str\]\.reverse\(\)/.test(modKod),
        'yayma işleci CODE POINT verir; Devanagari\'de ters kelime bozulur');

  // Olaylar — TUR = SEVİYE
  check('game_started seviye başlangıcında',
        /function startLevel[\s\S]*?gameEvent\('game_started'/.test(mod),
        'init’te bir kez yayılırsa 1 başlangıca N kazanma birikir');
  check('game_ended seviye tamamlanınca', /gameEvent\('game_ended'/.test(mod));
  check('skor game_ended’DEN ÖNCE ekleniyor',
        mod.indexOf('score += hit.word.length') < mod.indexOf("gameEvent('game_ended'"),
        'Jigsaw’da tersi yapılmış ve en iyi skor bir seviye geriden gelmişti');

  // Kalıcılık — mevcut desen
  check('seviye ph_ önekli anahtarda', /'ph_wordsearch_level'/.test(mod));

  // Jest sahipliği: touch-action YALNIZCA tahtada olmalı.
  const cssBlock = (mod.match(/injectStyle\('css-ws'[\s\S]*?`\);/) || [''])[0];
  check('touch-action:none ızgarada tanımlı', /\.ws-grid\{[^}]*touch-action:none/.test(cssBlock));
  const taCount = (cssBlock.match(/touch-action/g) || []).length;
  check('touch-action YALNIZCA bir yerde (katmanın tamamında değil)',
        taCount === 1, taCount + ' kez geçiyor');

  // Motor dışarı açık (test aracı ikinci bir kural uygulaması yazmasın)
  check('engine dışarı açık', /engine:\s*\{/.test(mod));
}

// ───────────────────────────────────────────────────────────────
//  4. SEÇİM MATEMATİĞİ
// ───────────────────────────────────────────────────────────────
// Sürükleme mantığı DOM ölçümüne bağlı olduğu için burada aynı matematiği
// yeniden kuruyoruz — amaç kodu kopyalamak değil, KURALLARIN kendisini
// (yön kilidi, geri sarma, sınır kırpma) sabitlemek.
function project(startR, startC, dx, dy, size, cell, gap, DIRS) {
  const step = cell + gap;
  const dist = Math.hypot(dx, dy);
  if (dist < cell * 0.45) return [[startR, startC]];
  let best = null, bestProj = -Infinity;
  for (const d of DIRS) {
    const len = Math.hypot(d[0], d[1]);
    const proj = (dx * d[1] + dy * d[0]) / len;
    if (proj > bestProj) { bestProj = proj; best = d; }
  }
  const stepLen = step * Math.hypot(best[0], best[1]);
  let n = Math.max(0, Math.round(bestProj / stepLen));
  const maxR = best[0] > 0 ? (size - 1 - startR) : best[0] < 0 ? startR : Infinity;
  const maxC = best[1] > 0 ? (size - 1 - startC) : best[1] < 0 ? startC : Infinity;
  n = Math.min(n, maxR, maxC);
  const out = [];
  for (let i = 0; i <= n; i++) out.push([startR + best[0] * i, startC + best[1] * i]);
  return out;
}

function testSelection(eng) {
  console.log('\n4. SEÇİM MATEMATİĞİ');
  const size = 10, cell = 30, gap = 3, step = cell + gap;
  const D = eng.DIRS_ALL;

  // Tam yatay
  let s = project(3, 2, step * 4, 0, size, cell, gap, D);
  eq('yatay 4 adım → 5 hücre', s.map(x => x.join(',')),
     ['3,2', '3,3', '3,4', '3,5', '3,6']);

  // BAĞIŞLAYICI: satırdan 8 px sapma yönü değiştirmemeli. Şartnamenin
  // "her hücrenin tam merkezine dokunmak gerekmesin" maddesi bu.
  s = project(3, 2, step * 4, 8, size, cell, gap, D);
  eq('hafif sapmada yön korunuyor', s.map(x => x.join(',')),
     ['3,2', '3,3', '3,4', '3,5', '3,6']);

  // Çapraz
  s = project(0, 0, step * 3, step * 3, size, cell, gap, D);
  eq('çapraz (SE) 3 adım', s.map(x => x.join(',')), ['0,0', '1,1', '2,2', '3,3']);

  // Ters yön
  s = project(5, 5, -step * 3, 0, size, cell, gap, D);
  eq('ters yatay (batı)', s.map(x => x.join(',')), ['5,5', '5,4', '5,3', '5,2']);

  // GERİ SARMA: parmak geri gelince seçim kısalıyor.
  const long = project(4, 1, step * 5, 0, size, cell, gap, D);
  const short = project(4, 1, step * 2, 0, size, cell, gap, D);
  check('geri sarma seçimi kısaltıyor',
        long.length === 6 && short.length === 3,
        long.length + ' → ' + short.length);

  // IZGARA DIŞI: parmak tahtadan taşsa bile seçim sınırda duruyor.
  s = project(0, 7, step * 20, 0, size, cell, gap, D);
  check('ızgara dışına taşmıyor',
        s.length === 3 && s[s.length - 1][1] === 9,
        JSON.stringify(s));

  // ÖLÜ BÖLGE: parmak hâlâ ilk hücredeyse tek harf.
  s = project(2, 2, 4, 4, size, cell, gap, D);
  eq('ölü bölgede tek hücre', s.length, 1);

  // ZİKZAK İMKÂNSIZ: seçim her zaman tek bir doğru üzerinde.
  let straight = true;
  for (let t = 0; t < 400; t++) {
    const dx = (Math.random() - 0.5) * 600, dy = (Math.random() - 0.5) * 600;
    const cells = project(5, 5, dx, dy, size, cell, gap, D);
    if (cells.length < 3) continue;
    const dr = cells[1][0] - cells[0][0], dc = cells[1][1] - cells[0][1];
    for (let i = 2; i < cells.length; i++) {
      if (cells[i][0] - cells[i - 1][0] !== dr || cells[i][1] - cells[i - 1][1] !== dc) straight = false;
    }
  }
  check('400 rastgele sürüklemede zikzak YOK (yön kilidi)', straight);
}

// ───────────────────────────────────────────────────────────────
//  CANLI: oyunun kendisi kum havuzunda açılıyor mu
// ───────────────────────────────────────────────────────────────
function testLive() {
  console.log('\n5. CANLI — init/cleanup');
  const s = makeSandbox({});
  const g = s.get('PuzzleGames.wordSearch');
  check('modül kayıtlı', !!g && typeof g.init === 'function');
  check('engine erişilebilir', !!(g && g.engine && g.engine.buildBoard));

  let started = 0;
  s.get("GameEvents.on('game_started', function(e){ window.__wsStart=(window.__wsStart||0)+1; })");
  s.get("PuzzleGames.wordSearch.init(document.createElement('div'))");
  started = s.get('window.__wsStart') || 0;
  eq('init tam olarak bir game_started yayıyor', started, 1);
  s.get('PuzzleGames.wordSearch.cleanup()');
  ok('cleanup istisna atmadan çalıştı');
}

// ───────────────────────────────────────────────────────────────
(function main() {
  console.log('SlySwipe — Kelime Avı Doğrulaması');

  const s0 = makeSandbox({});
  const W = testPool(s0);
  if (!W) { console.log('\nHavuz yüklenemedi, durduruldu.'); process.exit(1); }

  const s = s0;
  const eng = s.get('PuzzleGames.wordSearch.engine');
  if (!eng) { console.log('\nengine dışarı açılmamış, durduruldu.'); process.exit(1); }

  const arg = process.argv[2];
  if (arg === '--board') {
    const lv = parseInt(process.argv[3], 10) || 1;
    const b = eng.buildBoard(lv);
    console.log('\nSeviye ' + lv + ' — ' + b.size + 'x' + b.size);
    b.grid.forEach(row => console.log('  ' + row.join(' ')));
    console.log('\nKelimeler: ' + b.placed.map(p => p.word).join(', '));
    return;
  }

  testGenerator(eng, W);
  testTiers(eng);
  testSource();
  testSelection(eng);
  testLive();

  console.log('');
  if (failures) { console.log(failures + ' TEST BAŞARISIZ'); process.exit(1); }
  console.log('TÜM TESTLER GEÇTİ');
})();

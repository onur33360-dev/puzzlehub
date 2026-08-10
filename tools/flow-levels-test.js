// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Akış Bağlantı seviye doğrulama + üretim aracı
// ═══════════════════════════════════════════════════════════════
// Düz Node, sıfır bağımlılık, aynı vm+stub deseni (level-metrics.js,
// game-events-test.js). BİR BUILD ADIMI DEĞİL — araç.
//
// İKİ MOD:
//   node tools/flow-levels-test.js          → oyundaki seviyeleri DOĞRULA
//   node tools/flow-levels-test.js --gen    → yeni seviye tablosu ÜRET
//   node tools/flow-levels-test.js --curve  → zorluk eğrisini yazdır
//   node tools/flow-levels-test.js --bench  → çalışma anı üretecini ölç
//
// NEDEN ÇÖZÜCÜ ŞART: seviyeler ÇÖZÜLMÜŞ tahtadan türetiliyor, yani
// yapıları gereği çözülebilirler. Bu aracın işi o iddiayı BAĞIMSIZ bir
// mekanizmayla sınamak — üreteç bir bölümlemeyi kesiyor, çözücü ise
// tahtayı sıfırdan arıyor. Aynı hatayı iki kere yapma ihtimali düşük.
//
// TAM KAPLAMA — İKİ FARKLI ŞEY, KARIŞTIRMAYIN:
//  • OYUNDA bitiş şartı DEĞİL (2026-08-09): bütün çiftler bağlanınca
//    seviye biter, boş kare kalabilir. Tam kaplama yalnızca yıldız ölçütü.
//  • ÜRETİMDE ve BU ARAÇTA hâlâ şart: seviyeler tam kaplamalı çözümlerden
//    türetiliyor ve çözücü de öyle arıyor. Çözülebilirliğin yapısal
//    garantisi ve ipucunun kaynağı bu. Yani araç oyundan DAHA KATI bir
//    şeyi doğruluyor — kasıtlı.

'use strict';
const path = require('path');
const { makeSandbox } = require('./dom-sandbox');

// ═══════════════════════════════════════════════════════════════
//  1. IZGARA TEMELLERİ
// ═══════════════════════════════════════════════════════════════
// Hücre tek bir tamsayı: idx = r * W + c. İki alanlı nesneler yerine
// tamsayı kullanmak çözücüde Int8Array/Int32Array kullanmayı mümkün
// kılıyor; 9x9'da milyonlarca düğüm gezildiği için bu fark ölçülebilir.

function buildNb(W, H) {
  const nb = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const a = [];
      if (r > 0) a.push((r - 1) * W + c);
      if (r < H - 1) a.push((r + 1) * W + c);
      if (c > 0) a.push(r * W + c - 1);
      if (c < W - 1) a.push(r * W + c + 1);
      nb.push(a);
    }
  }
  return nb;
}

// Deterministik RNG (mulberry32). Math.random KULLANILMIYOR: bir tohum
// verildiğinde aynı seviye tablosu yeniden üretilebilmeli, yoksa
// "şu seviyeyi tekrar üret" diye bir şey olmaz.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════
//  2. ÜRETEÇ — önce ÇÖZÜM, sonra bulmaca
// ═══════════════════════════════════════════════════════════════
// Sıra bilerek bu (prompt'un da istediği sıra): rastgele uç nokta atıp
// "acaba çözülür mü" diye ummak, üretimin en kötü yolu — çoğu tahta
// çözümsüz çıkar ve elde kalan azınlık da kalitesizdir.
//
// Yöntem: tahtayı TAMAMEN kaplayan bir Hamilton yolu üret, sonra onu K
// parçaya kes. Her parça bir rengin yolu, uçları da o rengin nokta
// çifti. Tam kaplama ve çözülebilirlik böylece YAPISAL garanti olur —
// kontrol edilen değil, doğuştan doğru olan bir özellik.

// Yılan sırası: her satır ters yönde. Izgarada her zaman geçerli bir
// Hamilton yolu — karıştırmanın başlangıç noktası.
function boustrophedon(W, H) {
  const p = [];
  for (let r = 0; r < H; r++) {
    if (r % 2 === 0) for (let c = 0; c < W; c++) p.push(r * W + c);
    else for (let c = W - 1; c >= 0; c--) p.push(r * W + c);
  }
  return p;
}

// BACKBITE — Hamilton yollarını karıştırmanın standart yöntemi.
// Uçtaki hücreden rastgele bir komşuya "ısırık" atılır: bu bir çevrim
// yaratır, çevrimin bir kenarı kopar ve yol yeniden düzlenir. Uzunluk
// ve kaplama DEĞİŞMEZ, yalnızca şekil değişir.
//
// Yılan sırasını doğrudan kesmek denendi ve elendi: parçalar hep aynı
// "mekik" siluetini taşıyordu, yani bütün seviyeler birbirine benziyordu.
// Karıştırma, çeşitliliğin tek kaynağı.
function backbite(W, H, rnd, steps) {
  const nb = buildNb(W, H);
  const p = boustrophedon(W, H);
  const N = p.length;
  const pos = new Int32Array(N);
  for (let i = 0; i < N; i++) pos[p[i]] = i;

  for (let s = 0; s < steps; s++) {
    // İki uç da karıştırılmalı. Diziyi ters çevirmek en ucuz yol;
    // tek uçtan karıştırmak yolun diğer yarısını taş gibi bırakıyor.
    if (rnd() < 0.5) {
      p.reverse();
      for (let i = 0; i < N; i++) pos[p[i]] = i;
    }
    const nbs = nb[p[0]];
    const n = nbs[(rnd() * nbs.length) | 0];
    const i = pos[n];
    if (i <= 1) continue;          // zaten komşu — ısırık yok
    // [0..i-1] aralığını ters çevir: p0..p_{i-1} zinciri geriye döner,
    // p_{i-1} yeni uç olur, p0-p_i kenarı eklenir, p_{i-1}-p_i kopar.
    let a = 0, b = i - 1;
    while (a < b) {
      const t = p[a]; p[a] = p[b]; p[b] = t;
      pos[p[a]] = a; pos[p[b]] = b;
      a++; b--;
    }
  }
  return p;
}

// Yolu K parçaya kes. minLen 3: 2 hücrelik bir parçanın uçları komşudur
// ve oyuncu için hiçbir karar içermez — "bulmaca" değil, dekorasyon.
function cutPath(p, K, rnd, minLen) {
  const N = p.length;
  if (K * minLen > N) return null;
  for (let tries = 0; tries < 300; tries++) {
    const cuts = new Set();
    while (cuts.size < K - 1) cuts.add(1 + ((rnd() * (N - 1)) | 0));
    const idx = [0].concat([...cuts].sort((a, b) => a - b), [N]);
    let ok = true;
    for (let i = 0; i < K; i++) if (idx[i + 1] - idx[i] < minLen) { ok = false; break; }
    if (!ok) continue;
    const segs = [];
    for (let i = 0; i < K; i++) segs.push(p.slice(idx[i], idx[i + 1]));
    return segs;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  3. ÇÖZÜCÜ — bağımsız doğrulama
// ═══════════════════════════════════════════════════════════════
// Klasik akış çözücüsü: her renk kendi BAŞINDAN büyür, hedefine varınca
// biter, bütün hücreler dolunca tahta çözülmüştür.
//
// Üç budama kuralı var ve üçü de ZORUNLU (biri çıkarılınca 8x8 tahtalar
// dakikalara çıkıyor):
//  (a) Kapana kısılmış boş hücre: her boş hücre bir yolun İÇ hücresi
//      olacak, yani iki bağlantısı olmalı. Bağlanabilir komşu = boş
//      hücre, ya da bitmemiş bir rengin başı/hedefi. Dolmuş ve baş
//      olmayan hücre asla büyümez, o yüzden sayılmaz. İkiden az ise bu
//      dal ölüdür.
//  (b) Erişilebilirlik: bitmemiş her rengin başı, hedefine boş hücreler
//      üzerinden ulaşabilmeli.
//  (c) Yetim bölge: tam kaplama şart olduğu için her boş bileşene en az
//      bir bitmemiş baş komşu olmalı — kimsenin giremediği boşluk kalırsa
//      tahta zaten dolmaz.
//
// Değişken sıralaması MRV: en az hamlesi olan renk önce oynanır. Sıfır
// hamlesi olan varsa dal hemen ölür, tek hamlesi olan varsa o hamle
// zorunludur. Sırayla ilk rengi oynatmak yerine bunu yapmak, ölçülen
// düğüm sayısını 8x8'de iki kat aşağı indiriyor.
// PERFORMANS NOTU — bu fonksiyonun içinde hiçbir şey TAHSİS EDİLMEZ.
// İlk sürüm her düğümde Set ve dizi yaratıyordu ve 9x9 tahtalar dakikalar
// sürüyordu (ölçüldü: üretim 10 dakikada bitmedi). Bileşen kümeleri artık
// BİT MASKESİ (K ≤ 8, tek bayta sığıyor) ve bütün tamponlar önceden
// ayrılmış tipli dizi. Aynı algoritma, aynı budamalar — yalnızca çöp yok.
function makeSolver(W, H, pairs) {
  const N = W * H, K = pairs.length;
  // Komşuluk DÜZ dizide, adım 4: dizi-içinde-dizi her erişimde bir
  // dolaylılık demek ve bu döngü en sıcak yol.
  const nbF = new Int32Array(N * 4), nbC = new Uint8Array(N);
  {
    const nb = buildNb(W, H);
    for (let i = 0; i < N; i++) {
      nbC[i] = nb[i].length;
      for (let j = 0; j < nb[i].length; j++) nbF[i * 4 + j] = nb[i][j];
    }
  }
  const grid = new Int8Array(N).fill(-1);
  const head = new Int32Array(K), tgt = new Int32Array(K);
  const done = new Uint8Array(K);

  for (let i = 0; i < K; i++) {
    grid[pairs[i][0]] = i; grid[pairs[i][1]] = i;
    head[i] = pairs[i][0]; tgt[i] = pairs[i][1];
  }

  let empty = 0;
  for (let i = 0; i < N; i++) if (grid[i] === -1) empty++;

  // Önceden ayrılmış tamponlar
  const comp = new Int32Array(N);
  const stack = new Int32Array(N);
  const hMask = new Int32Array(N);   // bileşen → başları komşu renkler
  const tMask = new Int32Array(N);   // bileşen → hedefleri komşu renkler
  const moves = new Int32Array(4);

  function pruned() {
    // (a) kapana kısılmış boş hücre — her boş hücre bir yolun İÇİ olacak,
    // yani iki bağlanabilir komşusu şart. Bağlanabilir = boş hücre, ya da
    // bitmemiş bir rengin başı/hedefi. Dolmuş ve baş olmayan hücre bir
    // daha asla büyümez.
    for (let i = 0; i < N; i++) {
      if (grid[i] !== -1) continue;
      let free = 0;
      const base = i * 4, n = nbC[i];
      for (let j = 0; j < n; j++) {
        const y = nbF[base + j];
        const g = grid[y];
        if (g === -1) { free++; }
        else if (!done[g] && (y === head[g] || y === tgt[g])) { free++; }
        if (free >= 2) break;
      }
      if (free < 2) return true;
    }
    // Boş hücreleri bileşenlere ayır
    comp.fill(-1);
    let nc = 0;
    for (let i = 0; i < N; i++) {
      if (grid[i] !== -1 || comp[i] !== -1) continue;
      comp[i] = nc;
      let sp = 0;
      stack[sp++] = i;
      while (sp) {
        const x = stack[--sp], base = x * 4, n = nbC[x];
        for (let j = 0; j < n; j++) {
          const y = nbF[base + j];
          if (grid[y] === -1 && comp[y] === -1) { comp[y] = nc; stack[sp++] = y; }
        }
      }
      nc++;
    }
    for (let i = 0; i < nc; i++) { hMask[i] = 0; tMask[i] = 0; }
    for (let c = 0; c < K; c++) {
      if (done[c]) continue;
      const bit = 1 << c;
      let base = head[c] * 4, n = nbC[head[c]];
      for (let j = 0; j < n; j++) {
        const y = nbF[base + j];
        if (grid[y] === -1) hMask[comp[y]] |= bit;
      }
      base = tgt[c] * 4; n = nbC[tgt[c]];
      for (let j = 0; j < n; j++) {
        const y = nbF[base + j];
        if (grid[y] === -1) tMask[comp[y]] |= bit;
      }
    }
    // (c) yetim bölge: tam kaplama şart, kimsenin giremediği boşluk kalırsa
    // tahta zaten dolmaz.
    for (let i = 0; i < nc; i++) if (hMask[i] === 0) return true;
    // (b) erişilebilirlik: bitmemiş her renk hedefine ulaşabilmeli
    for (let c = 0; c < K; c++) {
      if (done[c]) continue;
      const bit = 1 << c;
      let ok = false;
      const base = head[c] * 4, n = nbC[head[c]];
      for (let j = 0; j < n; j++) if (nbF[base + j] === tgt[c]) { ok = true; break; }
      if (ok) continue;
      for (let i = 0; i < nc; i++) if ((hMask[i] & bit) && (tMask[i] & bit)) { ok = true; break; }
      if (!ok) return true;
    }
    return false;
  }

  let solutions = 0, nodes = 0, forced = 0, cap = 1, limit = 0;

  function rec() {
    if (++nodes > limit) return true;              // bütçe bitti — arama kesildi
    // BİTİŞ SIRASI ÖNEMLİ: "bütün hücreler doldu" tek başına bitiş DEĞİL.
    // Bir rengin son hamlesi hedefine ADIM ATMAKTIR ve hedef hücresi zaten
    // dolu olduğu için o hamle boş sayacını düşürmez. Yani doğru çözümde
    // empty 0'a inerken hâlâ bitmemiş renkler olur. Önce "hepsi bitti mi"
    // sorulmalı; tersini yapmak (ilk sürüm) doğru çözümü tam da son
    // hamlelerde reddediyordu — ölçüldü: budamalar tamamen kapalıyken bile
    // 25 hücrelik tahtada 0 çözüm.
    let allDone = true;
    for (let c = 0; c < K; c++) if (!done[c]) { allDone = false; break; }
    if (allDone) {
      if (empty !== 0) return false;               // renkler bitti ama tahta dolmadı
      solutions++;
      return solutions >= cap;
    }
    // MRV — en az hamlesi olan renk önce. Sıfır hamlesi varsa dal ölür,
    // tek hamlesi varsa o hamle zorunludur.
    let best = -1, bestN = 9, bm0 = 0, bm1 = 0, bm2 = 0, bm3 = 0;
    for (let c = 0; c < K; c++) {
      if (done[c]) continue;
      const h = head[c], base = h * 4, n = nbC[h];
      let m = 0;
      for (let j = 0; j < n; j++) {
        const y = nbF[base + j];
        if (grid[y] === -1 || y === tgt[c]) moves[m++] = y;
      }
      if (m === 0) return false;
      if (m < bestN) {
        best = c; bestN = m;
        bm0 = moves[0]; bm1 = moves[1]; bm2 = moves[2]; bm3 = moves[3];
        if (m === 1) break;
      }
    }
    if (best < 0) return false;
    if (bestN === 1) forced++;

    const mv = [bm0, bm1, bm2, bm3];
    for (let j = 0; j < bestN; j++) {
      const y = mv[j];
      const prevHead = head[best];
      if (y === tgt[best]) {
        done[best] = 1; head[best] = y;
        if (!pruned() && rec()) return true;
        done[best] = 0; head[best] = prevHead;
      } else {
        grid[y] = best; head[best] = y; empty--;
        if (!pruned() && rec()) return true;
        grid[y] = -1; head[best] = prevHead; empty++;
      }
    }
    return false;
  }

  // maxSolutions'a kadar sayar. nodeLimit: patolojik tahtalarda aracın
  // asılı kalmaması için. Bütçe biterse sonuç 'timeout' döner — sessizce
  // "çözümsüz" demek yanlış olurdu.
  return function count(maxSolutions, nodeLimit) {
    solutions = 0; nodes = 0; forced = 0;
    cap = maxSolutions; limit = nodeLimit || 4000000;
    rec();
    return { solutions, nodes, forced, timeout: nodes > limit };
  };
}

// ═══════════════════════════════════════════════════════════════
//  3b. AÇGÖZLÜ OYUNCU — GERÇEK zorluk ölçütü
// ═══════════════════════════════════════════════════════════════
// Oyunun bitiş kuralı "bütün çiftler bağlı" olduğuna göre, bir seviyenin
// zorluğu ÇÖZÜCÜNÜN değil OYUNCUNUN karşılaştığı zorluktur. Acemi bir
// oyuncu ne yapar: renkleri gördüğü sırayla alır ve her birini en kısa
// görünen yoldan bağlar. Bu davranış tahtayı çözüyorsa seviye kolaydır —
// tahtanın tam kaplamalı çözümü ne kadar dolambaçlı olursa olsun.
//
// Ölçüm tam olarak bunu yapıyor: rastgele renk sıralarıyla, her rengi
// BFS ile EN KISA yoldan bağla. Başarı oranı yüksekse seviye plansız
// oynanabiliyor demektir; düşükse oyuncunun sıra ve rota düşünmesi
// gerekiyor. Zorluk buradan gelir.
//
// Neden eski skor yetmiyor: o skor yol uzunluğu, dönüş sayısı, kaplama
// gibi TAM KAPLAMALI çözümün özelliklerini ölçüyordu. Kaplama zorunlu
// olmaktan çıkınca o özelliklerin çoğu oyuncunun deneyimine dokunmuyor.
function greedySuccessRate(W, H, pairs, trials, rnd) {
  const N = W * H, K = pairs.length;
  const nb = buildNb(W, H);
  const occ = new Int8Array(N);
  const prev = new Int32Array(N);
  const q = new Int32Array(N);
  const order = [];
  for (let i = 0; i < K; i++) order.push(i);

  let win = 0;
  for (let t = 0; t < trials; t++) {
    // Fisher-Yates: renk sırası oyuncunun keyfi, o yüzden örnekleniyor.
    for (let i = K - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    occ.fill(-1);
    for (let i = 0; i < K; i++) { occ[pairs[i][0]] = i; occ[pairs[i][1]] = i; }

    let allOk = true;
    for (let oi = 0; oi < K && allOk; oi++) {
      const c = order[oi], s = pairs[c][0], tg = pairs[c][1];
      prev.fill(-2);
      prev[s] = -1;
      let qh = 0, qt = 0, found = false;
      q[qt++] = s;
      while (qh < qt && !found) {
        const x = q[qh++], a = nb[x];
        for (let j = 0; j < a.length; j++) {
          const y = a[j];
          if (prev[y] !== -2) continue;
          if (y === tg) { prev[y] = x; found = true; break; }
          if (occ[y] !== -1) continue;
          prev[y] = x; q[qt++] = y;
        }
      }
      if (!found) { allOk = false; break; }
      let cur = prev[tg];
      while (cur !== s && cur >= 0) { occ[cur] = c; cur = prev[cur]; }
    }
    if (allOk) win++;
  }
  return win / trials;
}

// ═══════════════════════════════════════════════════════════════
//  3c. PLAN YAPAN OYUNCU — "bağlamak" ne zaman gerçekten zorlaşır
// ═══════════════════════════════════════════════════════════════
// greedySuccessRate RASTGELE sırayla oynuyor; insan öyle oynamıyor.
// Oyuncu tahtaya bakar, sıkışık olanı önce bağlar, tıkanırsa geri alıp
// başka sıra dener. Yani rastgele sıranın başarısızlığı insanın
// zorlandığı anlamına GELMEZ — ölçütün fazla iyimser görünmesinin sebebi
// bu (ve sahibin "zorluk hâlâ belirleyici değil" demesinin de).
//
// Asıl ayrım şu: oyuncu her rengi EN KISA yoldan bağlayabiliyor mu?
//  • Bağlayabiliyorsa seviye kolaydır — parmağını iki nokta arasında
//    doğal biçimde gezdirmek yetiyor, tıkanırsa sırayı değiştiriyor.
//  • Bağlayamıyorsa en az bir rengi BİLE BİLE uzun yoldan dolaştırmak
//    zorunda. "Bağlantıyı kurmak" işte orada zorlaşıyor.
//
// Bu fonksiyon sıralar üzerinde geri izlemeli arama yapıyor: her adımda
// kalan renklerden birini en kısa yoldan bağlamayı deniyor, tıkanınca
// geri alıyor. Bir sıra bulursa "dolambaç GEREKMİYOR" der.
// Her renk için birkaç FARKLI en kısa yol deneniyor (komşu sırası
// karıştırılarak); tek bir en kısa yola bakmak, başka bir en kısa yolun
// işe yarayacağı tahtaları yanlışlıkla "zor" saydırırdı.
function shortestPlanExists(W, H, pairs, cap, rnd, variants) {
  const N = W * H, K = pairs.length;
  const nb = buildNb(W, H);
  const occ = new Int8Array(N).fill(-1);
  for (let i = 0; i < K; i++) { occ[pairs[i][0]] = i; occ[pairs[i][1]] = i; }
  const done = new Uint8Array(K);
  const prev = new Int32Array(N);
  const q = new Int32Array(N);
  let nodes = 0;

  // c rengi için bir en kısa yol; komşu sırası karıştırıldığı için aynı
  // renk farklı çağrılarda farklı (ama yine en kısa) yol verebilir.
  function bfsPath(c) {
    const s = pairs[c][0], tg = pairs[c][1];
    prev.fill(-2); prev[s] = -1;
    let qh = 0, qt = 0, found = false;
    q[qt++] = s;
    while (qh < qt && !found) {
      const x = q[qh++], a = nb[x];
      const idx = [0, 1, 2, 3].slice(0, a.length);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
      }
      for (let k = 0; k < idx.length; k++) {
        const y = a[idx[k]];
        if (prev[y] !== -2) continue;
        if (y === tg) { prev[y] = x; found = true; break; }
        if (occ[y] !== -1) continue;
        prev[y] = x; q[qt++] = y;
      }
    }
    if (!found) return null;
    const path = [];
    let cur = prev[tg];
    while (cur !== s && cur >= 0) { path.push(cur); cur = prev[cur]; }
    return path;                       // yalnızca ARA hücreler
  }

  function rec(depth) {
    if (++nodes > cap) return false;
    if (depth === K) return true;
    for (let c = 0; c < K; c++) {
      if (done[c]) continue;
      for (let v = 0; v < variants; v++) {
        const path = bfsPath(c);
        if (!path) break;              // bu renk şu an hiç bağlanamıyor
        done[c] = 1;
        for (let i = 0; i < path.length; i++) occ[path[i]] = c;
        if (rec(depth + 1)) return true;
        for (let i = 0; i < path.length; i++) occ[path[i]] = -1;
        done[c] = 0;
      }
    }
    return false;
  }
  const found = rec(0);
  return { found, nodes, timeout: nodes > cap };
}

// ═══════════════════════════════════════════════════════════════
//  4. ZORLUK SKORU
// ═══════════════════════════════════════════════════════════════
// Yalnızca tahta boyutuna bakmak yetmez (prompt'un açık uyarısı): 6x6'da
// 6 renkli sıkışık bir tahta, 7x7'de 4 renkli ferah bir tahtadan zordur.
// Skor ölçülen altı bileşenin ağırlıklı toplamı.
//
// Ağırlıklar deneysel: eğrinin monoton çıkması ve aynı yapılandırma
// içindeki tahtaları ayırt edebilmesi için seçildi. Mutlak değerin
// anlamı yok, SIRALAMA anlamlı.
function turnsOf(seg, W) {
  let t = 0;
  for (let i = 1; i < seg.length - 1; i++) {
    const a = seg[i - 1], b = seg[i], c = seg[i + 1];
    const d1 = (b - a), d2 = (c - b);
    if (d1 !== d2) t++;
  }
  return t;
}
function manhattan(a, b, W) {
  return Math.abs((a / W | 0) - (b / W | 0)) + Math.abs((a % W) - (b % W));
}
function isBorder(x, W, H) {
  const r = x / W | 0, c = x % W;
  return r === 0 || c === 0 || r === H - 1 || c === W - 1;
}

// ÇÖZÜM SAYISI ÖLÇÜLDÜ VE BİR ELEME ÖLÇÜTÜ OLAMADIĞI GÖRÜLDÜ.
// İlk tasarım büyük tahtalarda "tek çözüm" şartı koyuyordu; ölçüm bunun
// imkânsız olduğunu gösterdi (12 tahta/yapılandırma, çözüm sayısı 400
// tavanına kadar): 5x5/3 renk medyan 10, 6x6/4 renk 22, 7x7/6 renk 150,
// 8x8+ ise sürekli 400+. Renk sayısını artırmak da kurtarmıyor (9x9'da
// 9, 10, 11, 12 renk denendi — hepsi 400+). Sebep yapısal: tam kaplamalı
// akış bulmacalarında ızgara büyüdükçe geçerli döşeme sayısı patlar.
// Türün kendisi böyle; referans oyunların seviyeleri de tek çözümlü
// değildir. Zorluk uzamsal akıl yürütmeden gelir, teklikten değil.
//
// Dolayısıyla çözüm sayısı SERT FİLTRE değil, LOGARİTMİK bir skor
// bileşeni: az çözümlü tahta daha sıkı, çok çözümlü tahta daha bağışlayıcı.
// Doğrusal ceza kullanılamaz — 400 çözüm skoru tek başına uçurur.
function scoreOf(W, H, segs, solutions) {
  const K = segs.length, area = W * H;
  let turns = 0, detour = 0, traps = 0, border = 0, longest = 0;
  segs.forEach((s) => {
    turns += turnsOf(s, W);
    const md = manhattan(s[0], s[s.length - 1], W);
    detour += (s.length - 1) / Math.max(1, md);
    if (md === 1) traps++;                       // uçlar komşu: göz aldatan kısa yol
    if (isBorder(s[0], W, H)) border++;
    if (isBorder(s[s.length - 1], W, H)) border++;
    longest = Math.max(longest, s.length);
  });
  const avgLen = area / K;
  return (
    area * 0.10 +                    // tahta boyutu
    K * 3.2 +                        // renk sayısı
    avgLen * 1.0 +                   // ortalama yol uzunluğu
    (turns / K) * 1.8 +              // yol başına dönüş — dolambaçlılık
    (detour / K) * 4.0 +             // gerçek yol / kuş uçuşu — yanıltıcılık
    traps * 2.6 +                    // "bariz ama yanlış" kısa yol tuzağı
    (1 - border / (2 * K)) * 9.0 +   // iç bölgedeki uçlar zordur
    (longest / area) * 6.0 -         // tek rengin tahtayı yeme oranı
    Math.log2(Math.max(1, solutions)) * 2.2   // belirsizlik = bağışlayıcılık
  );
}

// ═══════════════════════════════════════════════════════════════
//  5. SEVİYE EĞRİSİ
// ═══════════════════════════════════════════════════════════════
// 60 seviye, altı yapılandırma bandı. Prompt'un istediği ilerlemenin
// birebir karşılığı: 5x5/3 renk öğreticiden 9x9/8 renk uzmana.
// Zorluk İKİ eksende artıyor — tahta büyür VE renk artar — ama band
// içinde de artıyor, çünkü tahtalar skorlarına göre sıralanıp seçiliyor.
// İlk üç seviye ELDE YAZILDI, üretilmedi. Üreteç iyi tahta yapar ama
// ÖĞRETEMEZ — hangi fikrin hangi sırada tanıtıldığı bir tasarım kararı
// (Ok Bulmaca'da yerleşmiş olan aynı gerekçe, bkz. HAND_LEVELS).
//  1: iki düz satır + bir yılan — sürüklemeyi öğretir, hiç karar yok
//  2: her renkte en az bir dönüş — köşe dönmeyi öğretir
//  3: bariz kısa yol tam kaplamayı bozar — "yollar kesişemez"i öğretir
// Üçü de 4x4 (prompt'un öğretici ölçüsü) ve üçü de bu aracın çözücüsünden
// geçiyor: elle yazılmış olmaları denetimden muaf oldukları anlamına
// gelmez, tam tersine.
// Öğretici üçlü 4x6'ya taşındı. Eski üçüncü seviyenin dersi ("bariz kısa
// yol tam kaplamayı bozar") ARTIK GEÇERSİZ: tam kaplama bitiş şartı
// olmaktan çıktı, yani o kısa yol artık kazandırıyor. Ders değiştiği için
// tahta da değişti; eskisini taşımak öğretmediği bir şeyi öğretiyormuş
// gibi durmak olurdu.
const HAND_LEVELS = [
  '4x6|00RRR,10RRR,20DRURDRU,40DRURDRU',   // 1 — iki düz satır + iki basit yılan
  '4x6|00RRRDL,10RDLDR,22RDLDR,41LDRRR',   // 2 — her renkte en az bir dönüş
  '4x6|00DDDDDRU,01RRDLLDD,22RDLDRDL',     // 3 — yollar birbirinin önünü keser
];

// ZORLUK = "BAĞLAMAK ZOR MU", tahta doldurmak değil. İki bileşen:
//
//  1. DOLAMBAÇ GEREKİYOR MU (baskın terim, 1.0 puan). shortestPlanExists
//     yanlış dönüyorsa oyuncu en az bir rengi bile bile uzun yoldan
//     dolaştırmak zorunda — "bağlantıyı kurmak" işte orada zorlaşır.
//  2. DİKKATSİZ OYUNCU TAKILIYOR MU (0.6 puan). Dolambaç gerekmese bile
//     yanlış sırayla başlayan oyuncu tıkanabiliyorsa seviye düşünmeyi
//     gerektirir.
//
// ÖLÇÜM, ÖNCEKİ 70 SEVİYENİN NEDEN KOLAY OLDUĞUNU AÇIKLADI: 70 tahtanın
// 66'sında oyuncu HER rengi en kısa yoldan bağlayıp bitirebiliyordu, yani
// hiç dolambaç yoktu. Eski ölçüt (rastgele sıralı açgözlü) bunu göremez,
// çünkü insan rastgele sırayla oynamıyor — sıkışanı önce bağlıyor.
//
// YOĞUNLUK ŞART, VE ÖLÇÜLDÜ: seyrek tahtada dolambaç gerektiren tahta
// ÜRETİLEMİYOR (4x6/4, 5x8/5, 6x9/6 → 60 adayda 0). Boş alan varken en
// kısa yol hep bulunuyor. 60 adaylık örneklemde oranlar:
//   5x7/7 %3 · 6x8/8 %8 · 6x9/9 %8 · 7x9/9 %12 · 7x11/9 %12 · 8x11/9 %17
// Bu yüzden bantlar hem büyüyor hem SIKLAŞIYOR; palet 9 renkte kalıyor
// (12 renk denenebilirdi ama beyaz tahtada 12 rengi ayırt etmek okunurluğu
// bozar — zorluk okunmazlıktan gelmemeli).
//
// h0/h1: bandın başındaki ve sonundaki HEDEF ZORLUK (0 = kolay,
// 1.0+ = dolambaç gerekli, 1.6 = tavan).
const TIERS = [
  { from: 4,  to: 10, W: 4, H: 6,  K: 5, minLen: 3, h0: 0.05, h1: 0.25, label: 'Başlangıç' },
  { from: 11, to: 18, W: 5, H: 7,  K: 6, minLen: 3, h0: 0.25, h1: 0.40, label: 'Kolay' },
  { from: 19, to: 26, W: 5, H: 8,  K: 7, minLen: 3, h0: 0.40, h1: 0.52, label: 'Kolay+' },
  // Bu bandın tavanı 0.60: dolambaç terimi olmadan zorluk en fazla
  // (1 - açgözlü) * 0.6 kadar olabiliyor ve bu boyutta dolambaçlı tahta
  // neredeyse hiç yok (6x9/8 → %5). Hedefi 0.75 bırakmak, ulaşılamayan
  // bir sayıyı kovalayıp eğride çukur açıyordu (ölçüldü: 0.50 → 0.46).
  { from: 27, to: 34, W: 6, H: 9,  K: 8, minLen: 3, h0: 0.52, h1: 0.60, label: 'Orta' },
  // GEÇİŞ BANDI: dolambaç burada başlıyor (6x9/9 → %8).
  { from: 35, to: 44, W: 6, H: 9,  K: 9, minLen: 3, h0: 0.62, h1: 1.10, label: 'Orta+' },
  { from: 45, to: 54, W: 7, H: 9,  K: 9, minLen: 3, h0: 1.10, h1: 1.28, label: 'İleri' },
  { from: 55, to: 62, W: 7, H: 11, K: 9, minLen: 3, h0: 1.28, h1: 1.40, label: 'Zor' },
  { from: 63, to: 70, W: 8, H: 11, K: 9, minLen: 3, h0: 1.40, h1: 1.55, label: 'Uzman' },
];

// Bir tahtanın zorluğu. `screen` true iken ucuz ayarlarla (havuz taraması),
// false iken daha geniş bütçeyle (seçilen tahtanın doğrulanması) ölçülür.
// PLANLAYICI RASTGELE VE BÜTÇELİ, yani asimetrik: "plan bulundu" KESİN
// (elde bir tanık var), "plan bulunamadı" ise BÜTÇEYE bağlı. Dolayısıyla
// tek yönde yanılıyor — kolay bir tahtayı zor sanabilir, tersini asla.
//
// Bütçenin gerçekten belirleyici olduğu ölçüldü (aynı tahta, artan bütçe):
//   seviye 45 → 1 deneme/15k: DOLAMBAÇ · 3/60k: plan VAR (55 ms)
//                             8/150k: plan VAR · 16/300k: plan VAR
//   seviye 65 → dördünde de DOLAMBAÇ (16/300k'da 6.8 s arama)
// Yani ucuz ayar YANLIŞ POZİTİF üretiyor, güçlü ayar gerçek zoru ayırt
// ediyor. Doğrulama 8 deneme × 150k düğüm × 4 yol çeşidi: 45'i doğru
// çözüyor (137 ms), 65'te kararlı kalıyor (1.9 s). 16/300k'ya çıkmanın
// tek etkisi süreyi 3-4 katlamak oldu, karar değişmedi.
//
// `screen` kipi yalnızca HAVUZ TARAMASI için: ucuz, gürültülü, sıralama
// yapmaya yeter. Tabloya yazılan karar her zaman doğrulama kipinden gelir.
function hardnessOf(W, H, pairs, rnd, screen) {
  const tries = screen ? 1 : 8;
  const cap = screen ? 15000 : 150000;
  let plan = false;
  for (let t = 0; t < tries && !plan; t++) {
    if (shortestPlanExists(W, H, pairs, cap, rnd, screen ? 2 : 4).found) plan = true;
  }
  const greedy = greedySuccessRate(W, H, pairs, screen ? 100 : 300, rnd);
  return { detour: !plan, greedy, h: (plan ? 0 : 1) + (1 - greedy) * 0.6 };
}
// Çözüm sayımı tavanı: gerçek sayı değil, "bu kadar çoktan sonrası
// zaten bağışlayıcı" eşiği. Tavansız sayım 9x9'da dakikalar sürer.
const SOL_CAP = 64;

// SEVİYE DİZGİSİ ÇÖZÜMÜ SAKLAR, UÇ NOKTALARI DEĞİL — ve bu bilinçli.
// Biçim: "W|rc<yönler>,rc<yönler>,..." (R sağ, L sol, D aşağı, U yukarı).
// Örnek: "4x6|00RRR,10RRR,20DRURDRU,40DRURDRU"
//
// Uç noktalar dizgiden TÜRETİLİR (yolun ilk ve son hücresi), yani oyuncuya
// gösterilen bulmaca çözümden çıkar. Prompt'un istediği veri akışı zaten
// buydu ("önce çözülmüş yerleşim, sonra uçları türet, sonra yol bilgisini
// kaldır"); dizgiyi de öyle yazmak üç şey kazandırıyor:
//  1. İPUCU mümkün olur — oyun bir rengin doğru rotasını BİLİR, cihazda
//     çözücü çalıştırmak gerekmez.
//  2. DOĞRULAMA güçlenir: bu araç hem saklanan çözümün geçerliliğini
//     (bitişiklik, çakışmama, tam kaplama) hem de uçlardan bağımsız
//     aramayla çözülebilirliği ayrı ayrı sınayabilir.
//  3. Maliyet küçük: yön harfleri hücre başına 1 bayt, en büyük seviye
//     (9x9) ~100 karakter, 70 seviye ≈ 4.5 KB.
// Biçim "SÜTUNxSATIR|...": tahta artık KARE DEĞİL, dikey dikdörtgen.
// Sebep telefonun kendisi — 384x774'lük bir ekranda kare tahta genişliğe
// dayanıp dikeyde ~200 px boş bırakıyordu. Satır/sütun oranı ~1.5
// olduğunda tahta iki ekseni de dolduruyor (ölçüldü: 6x9 → 360x540 px).
// Motor W ve H'yi zaten ayrı taşıyordu; kare olan yalnızca VERİYDİ.
// KOORDİNAT 36'LIK TABANDA, ondalık DEĞİL — ve bu bir kolaylık değil,
// düzeltme. Tahta dikey olunca satır sayısı 10'u aşıyor (7x11, 8x12) ve
// ondalık yazımda "101" ayrıştırılamaz hâle geliyor: satır 10 sütun 1 mi,
// satır 1 sütun 0 sonra yön '1' mi? Test bunu yakaladı — 6 seviyenin
// saklı çözümü motorda oynanamıyordu.
// 36'lık tabanda satır ve sütun HER ZAMAN tek karakter (0-9, a-z).
// Yön harfleri BÜYÜK (R/L/D/U), koordinatlar küçük — çakışma yok.
function encode(W, H, segs) {
  return W + 'x' + H + '|' + segs.map((s) => {
    let out = (s[0] / W | 0).toString(36) + (s[0] % W).toString(36);
    for (let i = 1; i < s.length; i++) {
      const d = s[i] - s[i - 1];
      out += d === 1 ? 'R' : d === -1 ? 'L' : d === W ? 'D' : 'U';
    }
    return out;
  }).join(',');
}
function decode(str) {
  const bar = str.indexOf('|');
  const dim = str.slice(0, bar).split('x');
  const W = parseInt(dim[0], 10);
  const H = dim.length > 1 ? parseInt(dim[1], 10) : W;
  const segs = str.slice(bar + 1).split(',').map((p) => {
    let cur = parseInt(p[0], 36) * W + parseInt(p[1], 36);
    const seg = [cur];
    for (let i = 2; i < p.length; i++) {
      const ch = p[i];
      cur += ch === 'R' ? 1 : ch === 'L' ? -1 : ch === 'D' ? W : -W;
      seg.push(cur);
    }
    return seg;
  });
  return { W, H, segs, pairs: segs.map((s) => [s[0], s[s.length - 1]]) };
}

// ═══════════════════════════════════════════════════════════════
//  6. ÜRETİM MODU
// ═══════════════════════════════════════════════════════════════
function generate(seed) {
  const out = [];
  // Elle yazılan üçlü de aynı çözücüden geçirilir; geçemezse üretim durur.
  HAND_LEVELS.forEach((key, i) => {
    const { W, H, segs, pairs } = decode(key);
    const bad = checkSolution(W, H, segs);
    if (bad) throw new Error('Elle yazılan seviye ' + (i + 1) + ': ' + bad + ' — ' + key);
    const r = makeSolver(W, H, pairs)(SOL_CAP, 800000);
    if (r.solutions < 1) throw new Error('Elle yazılan seviye ' + (i + 1) + ' ÇÖZÜLEMİYOR: ' + key);
    out.push({
      level: i + 1, tier: 'Öğretici', key, sol: r.solutions, W, H, K: pairs.length,
      score: scoreOf(W, H, segs, r.solutions),
      // Elle yazılanlar da ÖLÇÜLÜYOR. Ölçülmezlerse özet satırı NaN
      // veriyor ve daha kötüsü, "öğretici seviyeler gerçekten kolay mı"
      // sorusu cevapsız kalıyor — elle yazılmış olmak kolay olduklarını
      // kanıtlamaz.
      ...hardnessOf(W, H, pairs, rng(9001 + i), false),
      hedef: 0,
    });
  });

  TIERS.forEach((t) => {
    const need = t.to - t.from + 1;
    const rnd = rng(seed + t.from * 7919);
    const pool = [];
    const seen = new Set();
    const area = t.W * t.H;
    // Aranan tahta SEYREK: dolambaç gerektirenler en iyi yapılandırmada
    // bile adayların %8-17'si (ölçüldü). Havuz bu yüzden büyük.
    // Tarama ucuz ayarlarla yapılıyor (hardnessOf'un `screen` kipi);
    // pahalı olan tam çözücü ve geniş bütçeli planlayıcı yalnızca SEÇİLEN
    // tahtaya uygulanıyor.
    const tries = need * 220;
    for (let i = 0; i < tries; i++) {
      const p = backbite(t.W, t.H, rnd, area * 26);
      const segs = cutPath(p, t.K, rnd, t.minLen);
      if (!segs) continue;
      const key = encode(t.W, t.H, segs);
      if (seen.has(key)) continue;
      seen.add(key);
      const pairs = segs.map((s) => [s[0], s[s.length - 1]]);
      const m = hardnessOf(t.W, t.H, pairs, rnd, true);
      pool.push({ key, segs, pairs, h: m.h, detour: m.detour, greedy: m.greedy });
    }
    if (pool.length < need) {
      console.error('  UYARI: ' + t.label + ' bandında yalnızca ' + pool.length + '/' + need + ' tahta bulundu');
    }
    // Her seviyenin HEDEF zorluğu var; band boyunca h0'dan h1'e çıkıyor ve
    // havuzdan hedefe en yakın kullanılmamış aday seçiliyor.
    // SEÇİM DOĞRULANMIŞ DEĞERE GÖRE, taranmış değere göre DEĞİL.
    // Tarama ucuz bütçeyle çalışıyor ve "plan bulamadım" ile "plan yok"u
    // ayıramıyor; geniş bütçeli doğrulama çoğu zaman planı buluyor ve
    // aday kolaya düşüyor. İlk sürüm taranmış değere göre seçiyordu ve
    // sonuç ölçüldü: son iki bantta hedef 1.40-1.55 iken gerçekleşen
    // ortalama 1.06, dolambaç gerektiren seviye 10'da 4-6 çıkıyordu.
    // Şimdi aday doğrulanıyor, hedeften uzaksa REDDEDİLİP sıradaki
    // deneniyor. Doğrulama pahalı (~60 ms) ama seviye başına birkaç kez
    // çalışıyor, havuzun tamamına değil.
    const used = new Set();
    for (let i = 0; i < need; i++) {
      const target = t.h0 + (t.h1 - t.h0) * (need === 1 ? 0 : i / (need - 1));
      let cand = null, m = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        let best = -1, bestD = Infinity;
        for (let j = 0; j < pool.length; j++) {
          if (used.has(j)) continue;
          const d = Math.abs(pool[j].h - target);
          if (d < bestD) { bestD = d; best = j; }
        }
        if (best < 0) break;
        used.add(best);
        const c2 = pool[best];
        const m2 = hardnessOf(t.W, t.H, c2.pairs, rnd, false);
        // İlk aday her hâlükârda yedek: hiçbiri hedefi tutturamazsa
        // seviye boş kalmasın.
        if (!cand) { cand = c2; m = m2; }
        // Hedefe yeterince yakınsa kabul. 0.35 eşiği, "dolambaç gerekli"
        // teriminin 1.0 olmasından türüyor: bu eşik altında bir sapma
        // dolambaç kararını asla ters çeviremez.
        if (Math.abs(m2.h - target) <= 0.35) { cand = c2; m = m2; break; }
        if (m2.h > (cand ? m.h : -1) && target > 1) { cand = c2; m = m2; }
      }
      if (!cand) continue;
      const r = makeSolver(t.W, t.H, cand.pairs)(SOL_CAP, 1200000);
      if (r.solutions === 0) console.error('  UYARI: seviye ' + (t.from + i) + ' çözücüden geçemedi');
      out.push({
        level: t.from + i, tier: t.label, key: cand.key, segs: cand.segs,
        sol: r.solutions, greedy: m.greedy, detour: m.detour, h: m.h, hedef: target,
        score: scoreOf(t.W, t.H, cand.segs, Math.max(1, r.solutions)),
        W: t.W, H: t.H, K: t.K,
      });
    }
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════
//  7. DOĞRULAMA MODU
// ═══════════════════════════════════════════════════════════════
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ ' + msg); }
}

// SAKLANAN ÇÖZÜMÜN kendi geçerliliği. Çözücüden BAĞIMSIZ bir denetim:
// çözücü "bir çözüm var mı" der, bu ise "tabloya yazdığımız şey gerçekten
// bir çözüm mü" der. İkisi ayrı sorular ve ikisi de sorulmalı — tablo
// bozulup çözücü yine de başka bir çözüm bulursa, ipucu yanlış rota
// gösterirdi ve hiçbir test bunu yakalamazdı.
// Sorun varsa açıklamayı, yoksa null döndürür.
function checkSolution(W, H, segs) {
  const N = W * H;
  const seen = new Int8Array(N).fill(-1);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.length < 2) return 'renk ' + i + ' tek hücrelik';
    for (let j = 0; j < s.length; j++) {
      const x = s[j];
      if (x < 0 || x >= N) return 'renk ' + i + ' tahtanın dışına çıkıyor';
      if (seen[x] !== -1) return 'hücre ' + x + ' iki renkte birden (renk ' + seen[x] + ' ve ' + i + ')';
      seen[x] = i;
      if (j > 0) {
        const p = s[j - 1];
        const dr = Math.abs((x / W | 0) - (p / W | 0)), dc = Math.abs((x % W) - (p % W));
        // Satır sarması: soldan sağa "çıkan" bir adım komşu görünür ama
        // değildir. dr+dc===1 kontrolü tek başına bunu YAKALAMAZ, o yüzden
        // satır/sütun ayrı ayrı bakılıyor.
        if (dr + dc !== 1) return 'renk ' + i + ' bitişik olmayan adım atıyor (' + p + '→' + x + ')';
      }
    }
  }
  for (let i = 0; i < N; i++) if (seen[i] === -1) return 'hücre ' + i + ' boş — tam kaplama yok';
  return null;
}

function verifyTable(levels, verbose) {
  const scores = [];
  levels.forEach((str, i) => {
    const n = i + 1;
    const { W, H, segs, pairs } = decode(str);
    const K = pairs.length;

    ok(K >= 2, 'Seviye ' + n + ': en az 2 renk olmalı');
    ok(K <= PALETTE_SIZE, 'Seviye ' + n + ': palet ' + PALETTE_SIZE + ' renk, seviye ' + K + ' istiyor');

    // 1. Saklanan çözüm gerçekten çözüm mü (bitişik, çakışmasız, tam kaplama)
    const bad = checkSolution(W, H, segs);
    ok(!bad, 'Seviye ' + n + ': saklanan çözüm geçersiz — ' + bad);

    // 2. Uçlardan BAĞIMSIZ arama da çözüm buluyor mu
    const r = makeSolver(W, H, pairs)(2, 6000000);
    ok(!r.timeout, 'Seviye ' + n + ': çözücü bütçesi doldu (tahta patolojik olabilir)');
    ok(r.solutions >= 1, 'Seviye ' + n + ': TAM KAPLAMALI ÇÖZÜMÜ YOK (' + str + ')');

    // 3. Hiçbir çiftin iki ucu aynı hücrede olamaz
    let sameCell = false;
    pairs.forEach((p) => { if (p[0] === p[1]) sameCell = true; });
    ok(!sameCell, 'Seviye ' + n + ': bir çiftin iki ucu aynı hücrede');

    const sc = scoreOf(W, H, segs, Math.max(1, r.solutions));
    scores.push(sc);
    if (verbose) {
      console.log('  ' + String(n).padStart(3) + '  ' + W + 'x' + H +
        '  ' + K + ' renk  çözüm≥' + r.solutions +
        '  düğüm ' + String(r.nodes).padStart(8) +
        '  skor ' + sc.toFixed(1));
    }
  });
  return scores;
}
const PALETTE_SIZE = 9;

// ═══════════════════════════════════════════════════════════════
//  8. ÇALIŞMA ANI ÜRETECİ ÖLÇÜMÜ
// ═══════════════════════════════════════════════════════════════
// 60. seviyeden sonra seviyeler cihazda üretiliyor. Ok Bulmaca'nın
// staleMax dersi burada da geçerli: üretim ANA İŞ PARÇACIĞINI kilitler,
// yani ölçülmeden kabul edilemez. Oyundaki üreteç ÇÖZÜCÜ ÇALIŞTIRMAZ —
// çözülebilirlik yapısal garanti (bkz. §2), doğrulanacak bir şey yok.
function bench() {
  const { get } = makeSandbox();
  const eng = get('PuzzleGames').flowConnect.engine;
  console.log('\n  Çalışma anı üretimi (oyundaki kod, seviye 61+):\n');
  [[5, 8, 5], [6, 9, 6], [7, 10, 6], [7, 11, 8], [8, 12, 9]].forEach(([W, H, K]) => {
    const t0 = process.hrtime.bigint();
    const N = 40;
    let bad = 0;
    for (let j = 0; j < N; j++) {
      const lv = eng.genLevel(W, H, K, 1000 + j * 13);
      if (!lv) { bad++; continue; }
      // Üretilenin gerçekten tam kaplamalı çözümü var mı — ölçüm
      // koşusunda bir kez de olsa sınanmalı, yoksa "hızlı ama bozuk"
      // bir üreteci hızlı diye onaylardık.
      if (j === 0) {
        const r = makeSolver(W, H, lv.pairs)(1, 3000000);
        ok(r.solutions >= 1, 'Çalışma anı ' + W + 'x' + H + '/' + K + ': çözümü yok');
      }
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
    ok(ms < 60, W + 'x' + H + '/' + K + ' üretimi ' + ms.toFixed(1) + 'ms — ana iş parçacığı için fazla');
    console.log('    ' + W + 'x' + H + '  ' + K + ' renk   ' + ms.toFixed(2) + ' ms/seviye' +
      (bad ? '   (' + bad + ' başarısız)' : ''));
  });
}

// Araç bir CLI ama parçaları require ile de alınabilsin: üreteci ayarlarken
// tek tek ölçmenin (ve ileride başka bir aracın çözücüyü kullanmasının)
// başka yolu yok.
module.exports = { buildNb, rng, backbite, cutPath, makeSolver, scoreOf, encode, decode, TIERS, greedySuccessRate, shortestPlanExists };

// ═══════════════════════════════════════════════════════════════
//  ÇALIŞTIR
// ═══════════════════════════════════════════════════════════════
const argv = process.argv.slice(2);
if (require.main !== module) return;

if (argv.includes('--gen')) {
  const seedArg = argv.find((a) => a.startsWith('--seed='));
  const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) : 20260809;
  console.log('\n  Akış Bağlantı — seviye üretimi (tohum ' + seed + ')\n');
  const rows = generate(seed);
  // MONOTONLUK ONLUK BLOK ORTALAMALARINDA aranıyor, seviye seviye DEĞİL —
  // doğrulama modundaki ölçütün aynısı. Seviye seviye artış istemek yanlış
  // bir hedef: yeni bir tahta boyutu/renk sayısı başlarken bir miktar
  // nefes vermek (testere dişi rampa) tür standardıdır; asıl mesele
  // EĞİLİMİN artması.
  // MONOTONLUK ARTIK AÇGÖZLÜ BAŞARIDA aranıyor ve ters yönde: oran
  // DÜŞMELİ, çünkü o oran KOLAYLIK. Yapısal skor bilgi olarak duruyor
  // ama artık ölçüt değil — oyuncu tam kaplama yapmadığı için o skorun
  // ölçtüğü şeyle yaşadığı şey ayrıştı.
  const blocks = [];
  for (let i = 0; i < rows.length; i += 10) {
    const b = rows.slice(i, i + 10);
    blocks.push(b.reduce((a, x) => a + x.h, 0) / b.length);
  }
  let mono = true;
  for (let i = 1; i < blocks.length; i++) if (blocks[i] <= blocks[i - 1]) mono = false;
  console.log('  // Üretildi: tools/flow-levels-test.js --gen --seed=' + seed);
  console.log('  const LEVELS = [');
  let tier = '';
  rows.forEach((r) => {
    if (r.tier !== tier) { tier = r.tier; console.log('    // ── ' + tier + ' — ' + r.W + 'x' + r.H + ', ' + r.K + ' renk'); }
    console.log("    '" + r.key + "',   // " + String(r.level).padStart(2) +
      '  zorluk ' + r.h.toFixed(2) + (r.detour ? ' DOLAMBAÇ' : '        ') +
      '  açgözlü %' + String(Math.round(r.greedy * 100)).padStart(3) + '  çözüm ' + r.sol);
  });
  console.log('  ];');
  const dol = [];
  for (let i = 0; i < rows.length; i += 10) {
    dol.push(rows.slice(i, i + 10).filter((x) => x.detour).length);
  }
  console.log('\n  Dolambaç GEREKEN seviye (10 üzerinden): ' + dol.join(' → '));
  console.log('  Zorluk, onluk blok ortalaması — ARTMALI:');
  console.log('  ' + blocks.map((b) => b.toFixed(2)).join(' → '));
  console.log('  ' + rows.length + ' seviye · eğri ' +
    (mono ? 'MONOTON ZORLAŞIYOR' : 'DÜZENSİZ — hedef eğriye bakılmalı') + '\n');
} else if (argv.includes('--bench')) {
  bench();
  console.log('\n  ' + pass + ' geçti, ' + fail + ' başarısız\n');
  process.exit(fail ? 1 : 0);
} else {
  const verbose = argv.includes('--curve');
  console.log('\n  Akış Bağlantı — seviye doğrulama\n');
  const { get } = makeSandbox();
  const mod = get('PuzzleGames').flowConnect;
  ok(!!mod, 'PuzzleGames.flowConnect kayıtlı değil');
  if (!mod) { console.log('\n  ' + pass + ' geçti, ' + fail + ' başarısız\n'); process.exit(1); }
  const eng = mod.engine;
  ok(!!eng && Array.isArray(eng.LEVELS), 'engine.LEVELS ihraç edilmiyor');
  const levels = (eng && eng.LEVELS) || [];

  // Sahibin şartı: en az 50 seviye. Sayı burada SABİTLENİYOR ki biri
  // tabloyu kısalttığında sessizce geçmesin.
  ok(levels.length >= 50, 'Seviye sayısı 50 altına düştü (' + levels.length + ')');

  verifyTable(levels, verbose);

  // ZORLUK ÖLÇÜTÜ: AÇGÖZLÜ OYUNCUNUN BAŞARI ORANI, yapısal skor DEĞİL.
  // Bu denetim 2026-08-09'da değiştirildi ve sebebi bir oyun deneyimi:
  // sahip oynadı ve "10-15. seviyeden sonra zorlaşmıyor" dedi. Ölçüm onu
  // doğruladı — açgözlü başarı onluk bloklarda %95 → %66 → %73 → %76 →
  // %76 → %80 → %71, yani 10. seviyeden sonra DÜZ, ve 40/50/60/70.
  // seviyelerin dördü de %100 açgözlü çözülebiliyordu.
  // Yapısal skor (yol uzunluğu, dönüş, kaplama...) artıyordu ama oyuncu
  // tam kaplama yapmadığı için o skorun ölçtüğü şey artık yaşananla
  // ilgisizdi. Ölçüt oyunun BİTİŞ KURALINA göre tanımlanmalı.
  //
  // Oran KOLAYLIK olduğu için DÜŞMESİ gerekiyor. Nokta nokta değil onluk
  // ortalamalarda: aynı banttaki iki tahta birbirine yakın olabilir,
  // aranan şey eğilim.
  const rnd = rng(20260809);
  const hard = levels.map((s) => {
    const { W, H, pairs } = decode(s);
    return hardnessOf(W, H, pairs, rnd, false);
  });
  const blocks = [], dol = [];
  for (let i = 0; i < hard.length; i += 10) {
    const b = hard.slice(i, i + 10);
    blocks.push(b.reduce((a, x) => a + x.h, 0) / b.length);
    dol.push(b.filter((x) => x.detour).length);
  }
  for (let i = 1; i < blocks.length; i++) {
    ok(blocks[i] > blocks[i - 1],
      'Zorluk ' + (i * 10) + '. seviyeden sonra ARTMIYOR (' +
      blocks[i - 1].toFixed(2) + ' → ' + blocks[i].toFixed(2) + ')');
  }
  // ASIL ŞART BU: son bantlarda oyuncu en kısa yollarla bitiremiyor olmalı.
  // Yalnızca "zorluk artıyor" demek yetmez — eski tablo da artıyordu ama
  // 70 tahtanın 66'sı en kısa yollarla bitiyordu, yani hiçbiri gerçekten
  // zor değildi. Dolambaç sayısı o boşluğu kapatan denetim.
  ok(dol[0] === 0, 'İlk 10 seviye dolambaç istememeli (ölçülen ' + dol[0] + ')');
  ok(dol[dol.length - 1] >= 8,
    'Son 10 seviyenin en az 8\'i dolambaç gerektirmeli (ölçülen ' + dol[dol.length - 1] + ')');
  ok(dol[dol.length - 2] >= 6,
    'Sondan bir önceki bantta en az 6 dolambaçlı seviye olmalı (ölçülen ' + dol[dol.length - 2] + ')');
  console.log('  Dolambaç GEREKEN seviye (10 üzerinden): ' + dol.join(' → '));
  console.log('  Zorluk, onluk blok: ' + blocks.map((b) => b.toFixed(2)).join(' → '));

  // Kodlama/çözme simetrisi: tablo dizgisi tek gerçek kaynak, oyun da
  // aynı ayrıştırıcıyı kullanmalı. İkisi ayrışırsa oyun bambaşka bir
  // tahta açar ve bu araç yine "geçti" derdi.
  if (eng && typeof eng.parseLevel === 'function') {
    let mismatch = 0;
    levels.forEach((s) => {
      const a = decode(s), b = eng.parseLevel(s);
      if (!b || b.W !== a.W || !b.segs || b.segs.length !== a.segs.length) { mismatch++; return; }
      for (let i = 0; i < a.segs.length; i++) {
        if (b.segs[i].join(',') !== a.segs[i].join(',')) { mismatch++; return; }
      }
    });
    ok(mismatch === 0, 'parseLevel bu aracın çözümlemesiyle ' + mismatch + ' seviyede ayrışıyor');
  } else {
    ok(false, 'engine.parseLevel ihraç edilmiyor — tablo bağımsız doğrulanamaz');
  }

  // ═══════════════════════════════════════════════════════════════
  //  OYUN KURALLARI — createBoard üzerinde canlı
  // ═══════════════════════════════════════════════════════════════
  // Yukarısı VERİYİ doğruluyor, burası MOTORU. İkisi ayrı: tablo kusursuz
  // olup motor yanlış davranabilir (ya da tersi) ve o zaman oyun
  // oynanamaz olurdu, ama seviye testi yine "geçti" derdi.
  if (eng && typeof eng.createBoard === 'function') {
    console.log('\n  Motor kuralları:');

    // 1. UÇTAN UCA: her seviyenin saklı çözümünü OYUNUN KENDİ tahtasında
    //    hücre hücre oyna ve tam kaplamayla bittiğini doğrula. Bu tek
    //    denetim veriyi ve motoru BİRLİKTE sınıyor — biri diğerine uymazsa
    //    burada patlar.
    let played = 0, failedLv = [];
    levels.forEach((str, i) => {
      const b = eng.createBoard(str);
      if (!b) { failedLv.push(i + 1); return; }
      for (let c = 0; c < b.K; c++) {
        const route = b.segs[c];
        if (b.startDrag(route[0]) !== c) { failedLv.push(i + 1); return; }
        for (let j = 1; j < route.length; j++) {
          if (!b.extend(c, route[j])) { failedLv.push(i + 1); return; }
        }
      }
      // Saklanan çözüm tam kaplamalı, yani hem bitirmeli hem MÜKEMMEL
      // olmalı. isPerfect() da sınanıyor: bitiş kuralı gevşedi ama
      // seviyelerin tam kaplamalı çözümü OLDUĞU iddiası duruyor — ipucu
      // ve 3 yıldız o iddiaya dayanıyor.
      if (!b.isComplete() || !b.isPerfect()) { failedLv.push(i + 1); return; }
      played++;
    });
    ok(failedLv.length === 0,
      'saklı çözüm motorda oynanamıyor — seviye ' + failedLv.slice(0, 6).join(', '));
    ok(played === levels.length, played + '/' + levels.length + ' seviye motorda çözüldü');

    // 2. Kural kural, küçük ve okunur bir tahtada.
    //    "4x6|00RRR,10RRR,..." → 4 sütun x 6 satır; 0. renk üst satır.
    const B = eng.createBoard(levels[0]);
    const W = B.W;
    const at = (r, c) => r * W + c;

    ok(B.startDrag(at(0, 0)) === 0, 'uç noktadan tutulunca o rengin indisi dönmeli');
    ok(B.startDrag(at(1, 1)) === -1, 'boş hücreden sürükleme başlatılamaz');

    // Bitişiklik: çapraz ve uzak hücre reddedilmeli
    B.clearPath(0); B.startDrag(at(0, 0));
    ok(B.extend(0, at(1, 1)) === null, 'çapraz adım reddedilmeli');
    ok(B.extend(0, at(0, 2)) === null, 'hücre atlayan adım reddedilmeli');
    ok(B.extend(0, at(0, 1)) === 'ok', 'komşu boş hücreye adım geçerli');

    // Geri sarma: bir önceki hücreye dönmek son parçayı siler
    ok(B.extend(0, at(0, 0)) === 'back', 'önceki hücreye dönmek geri sarmalı');
    ok(B.owner[at(0, 1)] === -1, 'geri sarılan hücre serbest kalmalı');

    // Başka rengin UCUNDAN geçilemez (1. renk (1,0)-(1,3))
    B.clearPath(0); B.startDrag(at(0, 0));
    B.extend(0, at(0, 1)); B.extend(0, at(0, 2)); B.extend(0, at(0, 3));
    ok(B.isConnected(0), 'kendi diğer ucuna varmak bağlantıyı tamamlamalı');
    B.clearPath(0); B.startDrag(at(0, 0));
    ok(B.extend(0, at(1, 0)) === null, 'başka rengin uç noktasından geçilemez');

    // Bağlı bir yol hedefin ötesine uzayamaz
    B.clearPath(0); B.startDrag(at(0, 0));
    B.extend(0, at(0, 1)); B.extend(0, at(0, 2)); B.extend(0, at(0, 3));
    ok(B.extend(0, at(1, 3)) === null, 'bağlanmış yol hedefin ötesine uzayamaz');
    ok(B.extend(0, at(0, 2)) === 'back', 'bağlanmış yol yine de geri sarılabilir');

    // Başka rengin yolunu kesme (türün standart davranışı)
    const B2 = eng.createBoard(levels[0]);
    B2.startDrag(at(1, 0));
    B2.extend(1, at(1, 1)); B2.extend(1, at(1, 2));
    B2.startDrag(at(0, 0));
    B2.extend(0, at(0, 1));
    ok(B2.extend(0, at(1, 1)) === 'cut', 'başka rengin yoluna girmek onu kesmeli');
    ok(B2.owner[at(1, 2)] === -1, 'kesilen yolun devamı serbest kalmalı');
    ok(B2.owner[at(1, 1)] === 0, 'kesilen hücre yeni rengin olmalı');
    ok(B2.owner[at(1, 0)] === 1, 'kesilen rengin UÇ NOKTASI tahtada kalmalı');

    // BİTİŞ KURALI: bütün çiftler bağlıysa seviye BİTER — tam kaplama
    // aranmaz (2026-08-09, sahip kararı). Bu bloğun eski hâli tam
    // tersini iddia ediyordu ve silinmedi, ÇEVRİLDİ: kuralın değiştiği
    // yer burası, dolayısıyla ileride biri tam kaplamayı geri getirmeye
    // kalkarsa test gerekçesiyle birlikte karşısına çıksın.
    const B3 = eng.createBoard('4|00RRR,10RRR,20DRURDRU');
    B3.startDrag(at(0, 0)); [at(0,1),at(0,2),at(0,3)].forEach(c => B3.extend(0, c));
    B3.startDrag(at(1, 0)); [at(1,1),at(1,2),at(1,3)].forEach(c => B3.extend(1, c));
    ok(B3.connectedCount() === 2, 'iki renk bağlı sayılmalı');
    ok(!B3.isComplete(), 'bir renk bağlanmamışken seviye bitmemeli');
    // Üçüncü rengi EN KISA yoldan bağla — tahtanın yarısı boş kalır.
    // Oyuncunun gerçekte yaptığı şey bu ve seviye burada BİTMELİ.
    B3.startDrag(at(2, 0));
    [at(3,0),at(3,1),at(3,2),at(3,3),at(2,3)].forEach(c => B3.extend(2, c));
    ok(B3.connectedCount() === 3, 'üç renk de bağlı olmalı');
    ok(B3.isComplete(), 'BÜTÜN ÇİFTLER BAĞLIYKEN seviye BİTMELİ (tam kaplama aranmaz)');
    ok(!B3.isPerfect(), 'boş hücre varken isPerfect() false olmalı — yıldızın dayanağı bu');
    ok(B3.filled() < B3.N, 'bu çözümde tahta bilerek dolu değil');

    // Anlık görüntü / geri yükleme (geri al düğmesinin dayanağı).
    // Doğrulama artık BELİRLİ hücrelere değil, durumun TAMAMININ
    // imzasına bakıyor: önceki hâli belirli hücrelere bakıyordu ve
    // fikstür değişince kuralı değil fikstürü sınadığı ortaya çıktı.
    const sign = (b) => b.paths.map((p) => p.join('>')).join('|') + '#' + b.owner.join(',');
    const before = sign(B3);
    const snap = B3.snapshot();
    B3.startDrag(at(2, 0)); B3.extend(2, at(3, 0));
    ok(sign(B3) !== before, 'test kurgusu tahtayı gerçekten değiştirmeli');
    B3.restore(snap);
    ok(sign(B3) === before, 'restore() anlık görüntüye tam dönmeli');

    // Çalışma anı üreteci: 70. seviyeden sonrası
    const gen = eng.genLevel(8, 12, 9, 12345);
    ok(!!gen && gen.pairs.length === 9, 'genLevel 8x12/9 renk üretmeli');
    if (gen) {
      ok(!checkSolution(8, 12, gen.segs), 'üretilen tahtanın çözümü geçerli olmalı');
      const gb = eng.createBoard(gen);
      let genOk = true;
      for (let c = 0; c < gb.K; c++) {
        const route = gb.segs[c];
        if (gb.startDrag(route[0]) !== c) { genOk = false; break; }
        for (let j = 1; j < route.length; j++) if (!gb.extend(c, route[j])) { genOk = false; break; }
      }
      ok(genOk && gb.isComplete(), 'üretilen tahta motorda tam kaplamayla bitmeli');
      // Aynı tohum aynı tahtayı vermeli: "yeniden başlat" başka bir tahta
      // açarsa "başlangıç durumuna dön" sözü tutulmamış olur.
      const gen2 = eng.genLevel(8, 12, 9, 12345);
      ok(gen2 && JSON.stringify(gen2.pairs) === JSON.stringify(gen.pairs),
        'aynı tohum aynı tahtayı vermeli (deterministik üretim)');
    }
  }

  console.log('\n  ' + levels.length + ' seviye doğrulandı · ' + pass + ' geçti, ' + fail + ' başarısız\n');
  process.exit(fail ? 1 : 0);
}

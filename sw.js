/* ============================================================
   PuzzleHub — Service Worker
   ============================================================
   ÖNCEKİ DURUM: bu dosya bir "cache killer"dı — her açılışta tüm
   cache'leri siler, fetch'i doğrudan ağa geçirirdi. index.html de
   her script'e ?v=Date.now() ekliyordu. Net etki: uygulama HER
   ziyarette baştan iniyordu. Bu, geçmişte yaşanmış bir cache
   sorununun kaba çözümüydü; artık yerine sürümlenmiş gerçek bir
   strateji var.

   SÜRÜM TEK BİR YERDE: index.html içindeki APP_VERSION.
   Oradan bu dosyaya kayıt URL'i üzerinden geçer (sw.js?v=X).
   Sürüm değişince:
     1. SW'nin URL'i değişir → tarayıcı yeni SW görür
     2. install → yeni ph-shell-<sürüm> cache'i doldurulur
     3. activate → eski ph-shell-* cache'leri silinir
   Yani cache invalidation için elle dosya listesi güncellemek veya
   her <link>'e ?v= yazmak GEREKMEZ. Tek satır bump yeter.

   NEDEN ÜÇ AYRI KOVA:
   - shell: uygulama kodu. Sürümle birlikte tamamen yenilenir.
   - fonts: Google Fonts. URL'leri zaten içerik-hash'li ve
     değişmez; uygulama sürümüne bağlamak her bump'ta ~100KB
     fontu gereksiz yere yeniden indirtirdi.
   - media: görseller ve İLERİDE ses varlıkları. Çalışma anında
     (ilk kullanımda) dolar, precache edilmez — 30+ ses dosyasını
     ilk açılışta indirmek açılışı öldürürdü. Sürümden bağımsız,
     çünkü bu dosyalar eklenir/çıkarılır ama içerikleri değişmez.
   ============================================================ */

const VERSION = new URL(self.location).searchParams.get('v') || 'dev';

const SHELL_CACHE = `ph-shell-${VERSION}`;
const FONT_CACHE  = 'ph-fonts-v1';
const MEDIA_CACHE = 'ph-media-v1';

// Uygulama kabuğu — açılış için GEREKEN her şey. Bu listedeki bir
// dosya 404 verirse install başarısız olur ve eski SW görevde kalır
// (yarım kurulmuş bir sürümle çalışmaktan iyidir).
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './core/design-tokens.css',
  './core/components.css',
  './style.css',
  './core/rng.js',
  './games/games.js',
  './core/ui-kit.js',
  './core/daily.js',
  './reels/reels.js',
  './core/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

// media kovasının üst sınırı. Ses varlıkları geldiğinde bu kova
// sınırsız büyüyebilir; en eski girdiler atılır (kaba FIFO —
// gerçek LRU için erişim zamanı tutmak gerekir, bu ölçekte gereksiz).
const MEDIA_MAX_ENTRIES = 120;

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const MEDIA_EXT = /\.(png|jpg|jpeg|gif|webp|svg|mp3|ogg|wav|m4a|aac)$/i;

// ───────────────── install ─────────────────
// cache:'reload' KRİTİK — cache.addAll() kullanılamamasının sebebi bu.
// Statik varlıklar uzun max-age ile servis ediliyor ve dosya adlarında
// içerik hash'i YOK. addAll (veya düz fetch) tarayıcının HTTP cache'inden
// BAYAT kopya alabilir: sürüm bump'ı yeni bir kova açar, sonra o kovayı
// eski dosyalarla doldurur ve kullanıcı güncellemeyi hiç görmez.
// 'reload' HTTP cache'ini atlayıp ağdan taze kopya almaya zorlar.
// (Bu, dosya adlarında hash olmadığı sürece zorunludur.)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => {
              if (!res || res.status !== 200) throw new Error('precache basarisiz: ' + url);
              return cache.put(url, res);
            })
        )
      ))
      // Yeni sürüm beklemeden devralsın. Sayfa tarafı controllerchange'i
      // dinleyip bir kez yeniliyor (bkz. index.html).
      .then(() => self.skipWaiting())
  );
});

// ───────────────── activate ─────────────────
// Eski KABUK cache'leri silinir; font ve media kovaları korunur.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          const isOurs = key.startsWith('ph-');
          const isCurrent = key === SHELL_CACHE || key === FONT_CACHE || key === MEDIA_CACHE;
          // ph- ile başlamayanlar başka bir uygulamaya ait olabilir —
          // dokunmuyoruz. Eski "cache killer" hepsini silerdi.
          if (isOurs && !isCurrent) return caches.delete(key);
          return null;
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ───────────────── yardımcılar ─────────────────

// Cache'e yalnızca sağlıklı, tam yanıtlar yazılır.
// - status 0 (opaque): içeriği doğrulanamaz, hatalı olabilir
// - status 206 (partial): Range yanıtı — cache'e yazılırsa sonraki
//   isteklere yarım dosya servis edilir. Ses için kritik.
function isCacheable(response) {
  return response && response.status === 200 && response.type !== 'opaque';
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // En eski girdiler listenin başındadır.
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

// Cache-first: varsa cache'ten ver, yoksa ağdan al ve sakla.
// Değişmeyen varlıklar için (fontlar, medya, sürümlenmiş kabuk).
async function cacheFirst(request, cacheName, opts) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  // forceCors: <link rel=stylesheet> istekleri no-cors modunda gider ve
  // OPAK yanıt döner — içeriği okunamaz, isCacheable bunu reddeder, sonuç
  // olarak Google Fonts CSS'i hiç cache'lenmezdi (font DOSYALARI cache'lenir
  // çünkü @font-face zaten CORS ister; geriye tanımsız kalan bir CSS kalırdı
  // ve çevrimdışında yazı tipi sistem fontuna düşerdi).
  // İsteği CORS modunda YENİDEN kurup çözüyoruz: Google Fonts
  // Access-Control-Allow-Origin:* gönderiyor, böylece yanıtı doğrulayabilir
  // ve güvenle saklayabiliriz. Opak yanıtı körlemesine cache'lemekten iyidir —
  // opak bir 404 ile opak bir 200 birbirinden ayırt edilemez.
  const req = (opts && opts.forceCors)
    ? new Request(request.url, { mode: 'cors', credentials: 'omit' })
    : request;
  const response = await fetch(req);
  if (isCacheable(response)) {
    await cache.put(request, response.clone());
    if (opts && opts.trimTo) trimCache(cacheName, opts.trimTo);
  }
  return response;
}

// Network-first: taze içerik önceliklidir, ağ yoksa cache'e düşer.
// HTML kabuğu için — yeni APP_VERSION'ın kullanıcıya ulaşmasının
// tek yolu index.html'in taze gelmesidir. Cache-first yapılsaydı
// sürüm bump'ları asla teslim edilmezdi (klasik PWA tuzağı).
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request) || await cache.match('./index.html');
    if (hit) return hit;
    throw err;
  }
}

// ───────────────── fetch ─────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Yalnızca GET cache'lenir. POST/PUT vb. her zaman ağa gider.
  if (req.method !== 'GET') return;

  // Range isteği (ses/video seek) cache katmanını atlar: Cache API
  // aralık isteklerini anlamaz, tam yanıt döndürerek medyayı bozar.
  if (req.headers.has('range')) return;

  const url = new URL(req.url);

  // Chrome eklentileri vb. — karışma.
  if (!url.protocol.startsWith('http')) return;

  // 1) Sayfa gezinmesi → network-first
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  // 2) Google Fonts → cache-first, uygulama sürümünden bağımsız kovada
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, FONT_CACHE, { forceCors: true }));
    return;
  }

  // 3) Aynı origin
  if (url.origin === self.location.origin) {
    // Geliştirici araçları (tools/) asla cache'lenmez — orada eski
    // bir kopyayla uğraşmak hata ayıklamayı imkânsızlaştırır.
    if (url.pathname.includes('/tools/')) return;

    event.respondWith((async () => {
      // ÖNCE kabuk cache'ine bakılır. Bu sıralama önemli: ikonlar hem
      // precache listesinde hem de MEDIA_EXT ile eşleşiyor; uzantıya göre
      // yönlendirme önce gelseydi aynı dosya iki kovaya birden yazılırdı.
      const shell = await caches.open(SHELL_CACHE);
      const hit = await shell.match(req);
      if (hit) return hit;

      // Kabukta olmayan medya (çalışma anında yüklenen görseller ve
      // İLERİDE ses varlıkları) → ayrı, sürümden bağımsız kovaya.
      if (MEDIA_EXT.test(url.pathname)) {
        return cacheFirst(req, MEDIA_CACHE, { trimTo: MEDIA_MAX_ENTRIES });
      }

      // Geri kalan aynı-origin istekleri kabuk kovasına düşer.
      return cacheFirst(req, SHELL_CACHE);
    })());
    return;
  }

  // 4) Diğer her şey (üçüncü taraf) → dokunma
});

// Sayfa "hemen devral" derse (yeni sürüm bildirimi sonrası)
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

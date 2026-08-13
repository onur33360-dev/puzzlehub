# CLAUDE.md

Permanent instruction manual for everyone working on SlySwipe — human or AI. Read this in full at the start of every session. It is dense on purpose: it points at deeper docs rather than repeating them.

---

## 1. Project Snapshot

SlySwipe is a Turkish-language, mobile-first casual game hub: a tab-based shell (Home / Discover / Progress / Profile) around 11 playable games, a TikTok-style infinite-scroll Discover feed, and the live-ops scaffolding of a mobile game (diamonds, streaks, ads, subscription) built on top. Nine of the eleven are puzzles; **Yılan (Snake) is the first arcade title** (2026-08-08) and its `REEL_GAMES` entry is the first to carry `category:'arcade'`. **Flappy UFO is the second** (same day). **Akış Bağlantı (Flow Connect) was the thirteenth game built** (2026-08-09) and it emptied the "unbuilt Discover games" list from four to three. The `category` field is no longer unread — the Discover chips consume it (see the shuffled-bag bullet in §5).

**The app is SlySwipe, package id `com.skyroonlabs.slyswipe`, since 2026-08-03.** It was
called PuzzleHub (`com.puzzlehub.app`) from the start of the project until then, so anything
older than that date — git history, commit messages, the `ph_` storage prefix — still says
PuzzleHub. The rename landed **before the first Play Console upload on purpose**: a package
id is permanent from first publish onward. Details and the four files that carry the id: §5.

**Current stage: pre-launch prototype.** Ads, in-app payments, the leaderboard, and Plus-subscription validation are all intentionally mocked right now. That is a staging decision, not a defect — see Section 8 before "fixing" any of it.

**Tech stack: vanilla JavaScript, HTML, CSS. No framework. No bundler. No transpiler.** Every
file is served as-is. This is a deliberate choice to preserve, not a gap to close.

**Amended 2026-07-21 — the app is now also packaged as a native Android app via Capacitor**,
an explicit owner decision taken so that real AdMob and Play Billing are reachable later
(the mocked systems in §8 eventually need native APIs, and TWA constrains them). What this
did and did *not* change:

- **Added:** `package.json`, `node_modules/`, a `www/` staging folder, and `android/`.
  There is now one build command — `npm run sync` — but it only *copies files*.
- **Unchanged:** no bundling, no transpiling, no minification, no framework. The browser
  still receives the exact bytes in the repo. The web/PWA path works exactly as before and
  remains the primary development surface.

So the rule in §6 stands with one carve-out: the zero-dependency principle applies to
**runtime** code. Capacitor is packaging, not a runtime dependency of any game.

Full product vision lives in `VISION.md` (to be written). This section is a working summary only.

---

## 2. How to Run / Preview

### Web (primary surface — develop here)

It's static files — open or serve `index.html`, nothing to compile.

**Serve over HTTP, not `file://`.** The service worker requires an HTTP origin. Any static
server works (`localhost` counts as a secure origin).

**Load-order dependency:** `index.html` loads `games/games.js → core/ui-kit.js →
reels/reels.js → core/app.js` sequentially via a custom `loadScript` chain, not
`<script defer>`. This order is required: `ui-kit.js` depends on `GameAudio` from
`games.js`, and `app.js` depends on `PuzzleGames`/`GameAudio` plus `ReelsEngine` from
`reels.js`. If something can't find a global that "should" exist, check load order before
assuming a bug.

**Caching is ON and versioned.** `sw.js` precaches the app shell and serves it cache-first;
Google Fonts and runtime media live in separate, version-independent buckets so an app
update doesn't re-download them. Navigation requests are network-first so a new version is
picked up as soon as the device is online.

**To ship an update, bump `APP_VERSION` in `index.html` — that one line, nothing else.**
It flows to the worker through its registration URL, which changes the worker's own URL and
triggers install → new cache bucket → old buckets deleted → page reloads once. Forgetting
to bump it means returning users keep the old code indefinitely; that is the single most
likely deployment mistake in this project.

**Do not replace the service worker's precache loop with `cache.addAll()`.** It fetches each
shell asset with `cache: 'reload'` specifically to bypass the browser's HTTP cache. Static
assets are served with a long `max-age` and filenames carry no content hash, so a plain
fetch during install can be answered from the HTTP cache — the version bump would create a
fresh cache bucket and then fill it with **stale files**, shipping old code under a new
version number. This was observed in practice, not theorized: a bump to 1.1.0 activated a
new worker and a new bucket while still serving the previous `games.js`.

### Android (Capacitor)

Requires **JDK 21** and the **Android SDK** (platform 35 + build-tools 35). Neither is needed
to work on the web surface.

**JDK 17 does not work** — Capacitor 7 compiles its Android library at source level 21 and
fails with `invalid source release: 21`. The error names Java 21 but not the fix, and JDK 17
is still the default suggestion in most Android tutorials, so this is easy to lose an hour
to. On this machine the toolchain lives outside the repo, installed without admin rights:

```
JAVA_HOME    = C:\Users\onur3\dev-tools\jdk-21.0.11+10
ANDROID_HOME = C:\Users\onur3\dev-tools\android-sdk
```

`android/local.properties` points Gradle at the SDK. It is machine-specific and gitignored,
so a fresh clone must recreate it.

| Command | Does |
|---|---|
| `npm run build` | repo → `www/` (copy only) |
| `npm run sync` | `build` + push `www/` into `android/` |
| `npm run android` | `sync` + open Android Studio |
| `npm run apk` | `sync` + build a debug APK |
| `npm run assets:android` | regenerate native launcher icons + splash from source art |

**Never run `npx cap sync` directly** — it copies `www/` without regenerating it, so it
happily ships whatever stale snapshot is sitting there. Always go through `npm run sync`.

`tools/build-www.js` copies an explicit whitelist and **cross-checks it against
`SHELL_ASSETS` in `sw.js`**, failing the build if the two lists disagree. A file added to
the app but missed in one of the two lists is the hardest deployment bug in this project to
diagnose (the web build works, the APK opens to a blank screen), so the guard is
load-bearing — don't remove it when adding a file, update both lists.

**`@capacitor/assets` is the second approved dependency (2026-07-28), dev-only.** It
regenerates the 26 native icon/splash files from source art in `assets/`, which were
previously hand-made and therefore never updated. The zero-dependency rule in §6 still
holds: this is tooling, it never ships, and no runtime code imports it.

**The `--android` flag in `assets:android` is load-bearing, not decoration.** Without a
platform flag the tool also runs PWA mode, which hunts for a web manifest in `public/`,
`src/`, `www/` — in this repo it finds and **rewrites `www/manifest.json`**. That is
generated output: the next `npm run build` deletes it, so the edit vanishes and never
reaches the repo root. Web icons and the root `manifest.json` stay manual. Source-art
contract, expected filenames and sizes: `assets/README.md`.

---

## 3. Documentation Map

**`docs/01`–`docs/10` are the project's permanent source of truth.** They define
architecture, rendering, performance, canvas policy, game development, UI/UX,
monetization, release, security and the post-release roadmap. Read them before
implementing anything. If this file and those documents ever disagree, **the
numbered documents win** — fix this file.

| Doc | Status | Read it when... |
|---|---|---|
| `docs/01_ARCHITECTURE.md` … `docs/10_POST_RELEASE_ROADMAP.md` | written | **first, every session** — official rules |
| `CLAUDE.md` (this file) | written | every session, after the numbered docs |
| `VISION.md` | to be written | you need to know *why* SlySwipe exists, not just what it is |
| `PRODUCT_PRINCIPLES.md` | to be written | weighing a product tradeoff |
| `UX_RULES.md` | to be written | touching any interaction/navigation pattern |
| `ARCHITECTURE.md` | to be written | onboarding, or before a structural change |
| `GAME_DESIGN_DOCUMENT.md` | to be written | changing rules, scoring, or difficulty of any game |
| `NEW_GAME_INTEGRATION_GUIDE.md` | to be written | adding the next game to the hub |
| `docs/DESIGN_SYSTEM.md` | written | any visual/material decision — materials, tokens, motion, scene layering |
| `docs/GAMES/*.md` | per-game | changing a specific game; `WATER_SORT.md` and `SUDOKU.md` exist |
| `AUDIO_DESIGN.md` | to be written | adding new SFX/music, to avoid duplicating existing sounds |
| `DATA_AND_STORAGE.md` | to be written | touching localStorage keys or shapes |
| `ECONOMY_DESIGN.md` | to be written | changing diamond sources/sinks or streak rewards |
| `MONETIZATION_INTEGRATION.md` | to be written | wiring real ads/IAP behind the mocked systems |
| `ROADMAP.md` | written | figuring out what's next — sprint plan, canvas migration status, sprint-closing rule |
| `CHANGELOG.md` | to be written | logging what shipped |

`TESTING.md` and `RELEASE.md` are deliberately deferred until closer to launch — don't assume either exists.

---

## 4. Architecture Cheat-Sheet

- **Screens:** `div.screen` siblings toggled via an `.active` class. No router. `showScreen()` / `switchTab()` in `app.js`.
- **Games:** `PuzzleGames` registry object. Each game is a self-contained IIFE exposing `{ init(container), cleanup() }`. Each injects its own scoped `<style>` at runtime via the shared `injectStyle(id, css)` helper.
- **Rendering is per-game, not global — and the renderer is chosen BEFORE implementation.** This is an architectural decision, not a later migration: lightweight games start on DOM, render-intensive games start on Canvas immediately (`docs/04_CANVAS_POLICY.md` is the authority). Most existing games render with DOM + CSS. `blockPuzzle` and `waterSort` render their boards and effects on **Canvas 2D** — see the canvas landmines in Section 5. The shell (Home / Discover / Progress / Profile) always stays DOM. Migrating an *existing* DOM game to Canvas is a separate decision and still requires profiling that confirms a GPU/filter bottleneck plus owner approval.
- **Audio:** one global `GameAudio` singleton (`games.js`) — synthesized via Web Audio API — shared by the app shell and every game. See the audio policy in Section 6 before adding any sampled audio file.
- **Discover feed:** `window.ReelsEngine` (`reels.js`) — infinite scroll, `IntersectionObserver`-driven active-card demo lifecycle (start/pause/destroy), DOM pruned past 24 cards.
- **State:** no state-management library. State lives in per-game closures plus `localStorage`. UI updates are imperative `innerHTML` template-string re-renders, not reactive/diffed.

Full detail belongs in `ARCHITECTURE.md` — this is the 30-second refresh, not the reference.

---

## 5. Known Landmines (Do Not "Fix" Silently)

- **Caching is now a real versioned strategy — RESOLVED, no longer a landmine.** The old
  "cache killer" (unregister all SWs + delete all caches on every load, `?v=Date.now()` on
  every script) is gone. Replaced by a versioned service worker. **The single source of
  truth is `APP_VERSION` in `index.html`** — that one constant is passed to the worker via
  its registration URL (`sw.js?v=X`), and the worker derives its cache bucket name from it.
  To ship an update, bump that one line; nothing else. Do **not** re-add `?v=` query strings
  to `<link>`/`<script>` tags: the shell is precached without query strings and
  `cache.match()` compares them, so a stray `?v=` silently misses every cached entry.
- **`www/` is generated output — never edit it, never commit it.** `tools/build-www.js`
  deletes and rebuilds it on every run. Editing a file there means editing a copy that the
  next build silently overwrites, and the change never reaches the repo. The source of truth
  is always the repo root. It is gitignored for exactly this reason.
- **The service worker is deliberately NOT registered inside the APK.** `index.html` skips
  registration when `Capacitor.isNativePlatform()` is true. Inside the APK every asset is
  already local, so the SW buys nothing and adds a staleness layer: if `APP_VERSION` isn't
  bumped, a user who installs a *new APK* keeps running the old cached code. On the web
  that's stale code; in an APK it's an unreproducible bug report. Caching there is the
  native layer's job. Don't "fix" the missing registration.
- **Network-dependent content is a PARTIALLY closed gap.** Google Fonts are still fetched
  over the network, so a first launch with no connection falls back to system fonts —
  self-hosting them is still deferred. **The sliding puzzle's images are no longer part of
  this gap (2026-08-02)** — see the local guarantee pool below.
- **Jigsaw ships 6 images inside the APK, and that is what stops the "numbers" board.**
  With no network, every tile used to fall to the big-number fallback and the HEDEF preview
  went blank — the reported "rakam çıkması". Three retries with exponential backoff (already
  in `loadImage`) fix a *flaky* connection and do nothing for an absent one, so the fix had
  to be local bytes.
  Four things are load-bearing:
  1. **The six are not new images.** They are local copies of six pool entries that were
     already eye-approved (`docs/GAMES/SLIDING_PUZZLE.md`: the bar for a new image is eye
     approval, not reachability). Their remote twins were **removed** from the pool, so the
     pool is still 42 and no photo appears twice. Six distinct categories on purpose —
     an offline player should still see variety.
  2. **The fallback is a CHAIN, not a first-N-levels rule.** `planFor` picks from the whole
     pool as before; if a *remote* pick fails all three tries, `loadImage` switches to
     `localFallbackFor(level)` and tries again. So *every* level survives offline, not just
     the first six. Number mode is still there but its only remaining cause is a broken
     install (the local file itself failing), never the network.
  3. **`loadImage` returns the image it actually used** (`done(current)`), and `startLevel`
     assigns it back to `image`. Without that the header category and the HEDEF preview
     would describe a photo the player is not looking at.
  4. **Local entries are in `SHIP` but deliberately NOT in `SHELL_ASSETS`.** The build's
     cross-check is one-directional (every SW asset must be in SHIP, not the reverse), so
     omitting them does **not** break the build. Precaching ~1.1 MB would re-download it on
     every `APP_VERSION` bump — the same trap already documented for the icons — and delay
     install. `sw.js` already routes same-origin `.jpg` to the version-independent
     `MEDIA_CACHE`, which is exactly what the third bucket exists for. Inside the APK no SW
     is registered at all and the files are plain local assets.
  Cost: 6 × 1000×1000 JPEG ≈ **1.1 MB**, APK 14.16 → 15.28 MB. 1000 px (not the remote
  pool's 1200) because the largest board is ~460 CSS px at DPR ~2.1 ≈ 970 physical px.
  **The small corner number badge is unrelated and stays** — it is a deliberate aid shown
  when the image *does* load; only the big-number fallback was in scope.
  `tools/jigsaw-images-test.js` pins all of it: files exist on disk, are square JPEGs, no
  duplicate ids, local urls are not network urls, SHIP contains them, `SHELL_ASSETS` does
  not, and the fallback chain is still wired.
- **`blockPuzzle` renders on CANVAS, and three of its rules are load-bearing.**
  The board is one `<canvas>` (crystals drawn into an offscreen cache, rebuilt
  only when the board changes) plus a second full-scene `<canvas>` (`.bp-fx`) for
  every particle/explosion effect. Measured on a Galaxy A51: DOM drag was 24 fps
  (41.7 ms median, worst 209 ms) while the **main thread was idle at 1.1 ms** —
  the cost was GPU fill-rate + DOM compositing, which is why a year of CSS
  micro-optimization never reached 60. The rules:
  1. **Never draw inside `touchmove`.** The move handler only updates state and
     calls `requestPaint()`; drawing happens once per frame in the rAF callback.
     Drawing synchronously per move means several paints in one frame.
  2. **Never repaint the whole board.** `paintBoard()` restores only the previous
     preview cells from the cache and draws the new ones. `fullRepaint` is set
     only when the board itself changed (placement, clear, resize).
  3. **`RENDER_SCALE` must stay.** `pickRenderScale()` lowers buffer resolution on
     weak devices (A5x → 0.8). This is the only real lever on fill-rate, and it
     is the thing DOM could not do.
  Also: the FX loop **stops when no particles are alive** (idle must cost zero),
  particle glow uses a **pre-rendered sprite** — never `shadowBlur` per particle
  per frame — and `fxCell()` caches its offset because `runePulse` asks for 64
  cells at once (otherwise 128 `getBoundingClientRect` calls = layout storm).
- **Block's tray grab listener belongs on `.bp-slot`, not `.bp-tp`.** The piece
  element animates in from `scale(0)` with `animationDelay = i*70ms`, so during
  that window its hit area is literally **zero** — taps on freshly dealt pieces
  silently died. The slot is unanimated and full-size. Taps that arrive while
  `locked` (the 90–250 ms placement resolution) are **buffered**, not dropped, and
  fire when the lock releases if the finger is still down.
- **Thermal state is RECORDED, not normalized — this reversed on 2026-07-28.**
  The old rule ("a warm device invalidates the comparison, re-run it cold") is
  gone by owner decision: SlySwipe is optimised for real gameplay, not lab
  conditions, so if a device throttles during normal play that throttling is part
  of the player's experience and belongs in the number. Do **not** discard a
  throttled run and do **not** re-run to get cooler conditions. Do record
  `dumpsys thermalservice` (`mName=SKIN` / `mStatus`) at start and end next to
  every number, and report the **tail (P90/P95/P99)** — average FPS hides the
  dropped-frame clusters players actually feel. The one thing that still
  invalidates a run is *instrument* error, not device state: the in-app FPS
  overlay runs its own rAF loop and a `backdrop-filter`, so it must be off while
  measuring. See `docs/03_PERFORMANCE_RULES.md`.
- **Labirent (mazeGame) and Vida Ustası (screwPuzzle) were DELETED on 2026-08-09 (owner request).**
  Both game modules, both Discover demos (`demo_maze`, `demo_screw`) and every registration
  are gone: `GAME_MAP` and `PUZZLE_GAMES` (`app.js`), `REEL_GAMES`, `GAME_NAME_MAP` and the
  `getDemoFactory` cases (`reels.js`). games.js shrank by 566 lines, reels.js by 174.
  Two leftovers are deliberate, not oversights:
  1. **`ph_screw_level` in localStorage is not migrated or cleared.** Same rule as every other
     storage key here — that is `DATA_AND_STORAGE.md`'s job. It is now dead data on the
     devices of anyone who played, and harmless.
  2. **`tools/music-test.html` still names both games.** It is a standalone dev page for
     auditing the synth, not part of the app, and its tags describe sounds rather than games.
  The four Node harnesses that hardcoded the ids were updated, and `game-events-test.js`
  failing on the stale list is exactly what that list is for. Its fixtures now emit
  `memoryGame` where they used to emit `mazeGame` (same reason: it is a 'won'-only game).

- **A new game must be registered in THREE live places:** `GAME_MAP` (`app.js`), `REEL_GAMES`
  and `GAME_NAME_MAP` (`reels.js`). Missing one makes a game playable-but-invisible, or
  visible-but-broken. **A fourth place is a test, not the app:** `GAMES` in
  `tools/game-events-test.js` is a hardcoded list, so adding a game makes that tool fail until
  it is updated — which is the point, not a defect.
- **`PUZZLE_GAMES` (`app.js`) IS DEAD DATA — it has no reader anywhere in the repo, and this
  file used to claim otherwise.** The rule above said "four places" and named it first;
  verified 2026-08-09 by grepping the whole tree: the array is defined at `app.js:81` and
  never read. It stopped being rendered when Home was rebuilt to the owner's mockup
  (`38b352a`, 2026-07-29) — that screen now shows the daily challenge, missions, streak,
  weekly chest and the **favourites** grid (`gh_fav`), not a game catalogue.
  Two consequences worth knowing before "fixing" anything:
  1. **İksir Sıralama and Ok Bulmaca are absent from `PUZZLE_GAMES` and that hides nothing.**
     They are in `GAME_MAP` and `REEL_GAMES` (both `playable:true`), so they are reachable
     exactly like every other game. Adding them to the dead array would change no pixel.
  2. **Discover is currently the only game-catalogue surface.** All **11** games are `playable`
     there, so "will every game show up at launch" is a question about `REEL_GAMES`, not about
     Home. Whether Home should get a catalogue back is a product decision, not a bug.
     (This said "13" until 2026-08-12 — stale since the Labirent/Vida Ustası deletion on
     2026-08-09. **Thirteen games were built; eleven ship.** Both numbers are correct about
     different things, which is exactly why they get confused: count `REEL_GAMES`, don't
     recall it.)
  The array is kept rather than deleted because it still carries per-game presentation data
  (emoji, rating, gradient, blurb) that a future Home catalogue would want — but nothing reads
  it today, so **do not treat adding an entry there as registering a game.**
- **`offerRewardChoice()` threw a `TypeError` on every open until 2026-08-09, so the shared
  "ad or diamonds?" modal never appeared for anyone.** The daily-budget row was removed from
  its markup on 2026-08-07, but the line that filled it
  (`panel.querySelector('[data-ph-ad-budget]').textContent = …`) stayed, and `querySelector`
  returns `null`. Every consumer was dead: Arrow's hint, 2048's offer. Browser-verified in
  both directions — the element genuinely is absent, and re-running the old line still throws.
  **The Node harness cannot catch this class of bug**: `tools/dom-sandbox.js`'s
  `querySelector` never returns `null`, it always hands back a stub. That is exactly why the
  line survived for two days of green test runs, and it is worth remembering before trusting
  a harness pass on anything DOM-shaped.
- **Shared event-listener cleanup:** `addEv`/`clearEvs` in `games.js` use one module-level `_listeners` array across all games. Safe under normal one-game-at-a-time navigation; don't assume it's safe if game lifecycles ever overlap.
- **Inconsistent localStorage prefixes** (`gh_`, `ph_`, and the bare `bp_hi`) are historical, not designed. Don't rename existing keys without a migration plan — that's `DATA_AND_STORAGE.md`'s job once it exists.
- **"GameHup" still appears in internal file headers and the `gh_` prefix family.** It's the old product name; SlySwipe is current. Cosmetic debt, not a functional bug — don't mass-rename without being asked. **"PuzzleHub" is now a third historical layer** (see the rebrand bullet below) — unlike GameHup it was swept out of the source, but it survives in git history and in the `ph_` storage prefix.
- **The app is SlySwipe / `com.skyroonlabs.slyswipe` since 2026-08-03. The package id was
  changed BEFORE the first Play Console upload, and that timing is the whole point** — Google
  binds an app's identity to its package id permanently at first publish, so this was the last
  moment it could be done at all. Anything that looks like leftover rebrand work is therefore
  cheap now and impossible later; do not defer it.
  Four things are load-bearing:
  1. **The id lives in FOUR places and they must agree**: `capacitor.config.json` (`appId`),
     `android/app/build.gradle` (**both** `namespace` and `applicationId` — they are separate
     keys and Gradle does not derive one from the other), `res/values/strings.xml`
     (`package_name` + `custom_url_scheme`), and the **java source directory itself**
     (`android/app/src/main/java/com/skyroonlabs/slyswipe/`) whose path must match the
     `package` line inside `MainActivity.java`. The directory is a real move, not a rename of
     a string. `AndroidManifest.xml` needs no edit: it references `.MainActivity` relative to
     `namespace` and `${applicationId}` for the FileProvider authority, so it follows along.
  2. **The `ph_` localStorage prefix was deliberately NOT renamed.** Renaming it would orphan
     every existing player's diamonds, streak, badges and Plus snapshot. Same rule as the
     `gh_` prefix — that is `DATA_AND_STORAGE.md`'s job, and only with a migration.
  3. **Product ids are independent of the package id and were NOT touched** —
     `plus_weekly` / `plus_monthly` / `plus_yearly` / `diamonds_*` are managed on the
     RevenueCat and Play Console side. Same for the AdMob test unit ids.
  4. **The brand name is written in the source in more places than the visible UI.** Beyond
     `manifest.json`, `index.html` (`<title>`, `apple-mobile-web-app-title`, the
     `.brand-name` span), `strings.xml` (`app_name` / `title_activity_main`) and
     `capacitor.config.json` (`appName`), there is one in-game surface that is easy to miss:
     Arrow's header renders `<span class="ar-brand-sup">SLYSWIPE</span>ARROW`
     (`games.js`). The `PuzzleGames` registry, `blockPuzzle` and every other identifier
     containing "puzzle" are **engine naming, not brand** — they were correctly left alone.
  Still carrying the old name on purpose: the home header's `🧩` logo emoji and the `🧩` in
  `<title>`. Whether the puzzle-piece mark survives the new "S" identity is a product call,
  not a find-and-replace.
- **The splash artwork exists in ELEVEN files and only one of them is what a modern phone
  actually shows.** `assets/icons/splash-hero.jpg` is the DOM scene (§5 launch-scene bullet)
  and it is what renders on Android 12+ **and** on web; the 10 `drawable-{port,land}-*`
  PNGs only reach Android ≤11. Updating the density PNGs alone therefore looks complete and
  changes nothing visible on the test device — that trap is exactly why this is written down.
  `splash-hero.jpg` is 852×1846 (the same 2.167 aspect as the source art), regenerated from
  the xxxhdpi PNG with `sharp` at `jpeg({quality:86, mozjpeg:true})` ≈ 171 KB. **Quality is
  not cosmetic here:** the file sits in `sw.js`'s `SHELL_ASSETS` precache, so every byte is
  re-downloaded on every `APP_VERSION` bump. `drawable/splash.png` (no qualifier) is the
  fallback and is kept byte-identical to the mdpi copy. `drawable-land-*` stays flat
  `#14142E` — the app is orientation-locked to portrait and those files never render.
- **Water Sort's move limit is `5 × colorCount`, and the number came from MEASUREMENT
  (2026-08-01).** This is the game's first lose state. Difficulty has exactly one variable —
  `paramsForLevel` gives `colorCount = min(3 + ⌊lv/3⌋, 8)`, tubes = colors + 2 — so the limit
  scales with colours, never a flat number (flat would be generous early and unfair late).
  30 boards per level were solved for their **true optimal** with IDA* (admissible heuristic:
  a move reduces the total colour-run count by at most 1, and the solved state has exactly
  `colorCount` runs). Measured optimum: 3 colours avg 7.9 / p90 10 / max 11 · 4 → 11.5 / 13.5
  / 14 · 5 → 14.9 / 17 / 17 · 6 → 18.2 / 20.5 / 22 · 7 → 21.9 / 24 / 26. The fit is almost
  perfectly linear (p90 ≈ 3.5 × colours), which is why `5 × colours` lands at a **constant
  1.47 × p90** on every tier — about 40% above the hardest board seen, roughly 1.7× the
  average one. That slack is deliberate: this project optimises for flow, so losing should be
  rare and earned, not a constant threat.
  **Per-board optimal at runtime was tried and rejected** — IDA* takes seconds at 7 colours
  and minutes at 8, and level generation blocks the main thread (the Arrow `staleMax`
  lesson). The formula is the only affordable honest option.
  Three rules hold it together:
  1. **Undo does NOT refund a move, and that is the whole feature.** Undo is unlimited and
     free (it only costs stars: 0 undos → 3★, 1–2 → 2★, 3+ → 1★). If undo gave the move back,
     the limit could never be reached and the lose screen, the `'lost'` event and the
     continue economy would all be decorative. The counter counts *pours performed*;
     undo's own logic was not touched. The free escape hatch is "Yeniden Başla".
  2. **Restarting is a NEW round.** `restartLevel()` resets the counter and emits
     `game_started` (invariant 2 closes the abandoned attempt as `'quit'`), because that is
     genuinely a second attempt. Continuing after an ad/diamonds is the opposite — the round
     is *reopened*, no new `game_started` (see `_runGameOverContinuation`).
  3. **The counter warns at 5 moves left.** A limit that arrives unannounced feels like a
     bug; a designed loss has to be visible coming.
  Continue grants `ceil(limit × 0.25)` moves for an ad or **20💎**
  (`EconomyConfig.EXTRA_MOVES_DIAMONDS`), priced *between* undo (15) and a full continue
  (30): the level can always be restarted for free, so the player is buying back effort, not
  the run. That cost travels through the shared game-over box via the new optional
  `showGameOver(..., { continueCost })` — same contract as `onContinue`/`onRestart`.
- **`tools/watersort-moves-test.js` validates the move limit.** Four layers like its
  siblings. Its most important assertions are the two that encode the reasoning rather than
  the code: the limit must stay **≥ 1.25 × the measured hardest board** (or the level becomes
  unfinishable) and **≤ 2.2 × the measured average** (or the lose state never fires). The
  measured optima are pinned in the tool as reference data, so changing `MOVE_LIMIT_PER_COLOR`
  fails loudly instead of quietly drifting. It also asserts the limit did not leak into any
  other game, and that undo never decrements the counter.
- **Water Sort's UNDO WAS REMOVED and the bar is now `◀` previous-level + `🔄` restart, both
  rewarded (2026-08-07, owner decision).** This reverses several things documented above, so
  read this before trusting the undo passages in the move-limit bullet.
  The trigger was a bug report: both bar buttons were dead. Cause — `updateControlsBar()`
  gave the `off` class (which is `pointer-events:none`) to **restart** as well whenever
  `history.length === 0`, so at level start neither button could be tapped. Device-verified
  before the fix: computed `pointer-events` was `none` on both. `restartLevel()`'s own
  comment said it should work with an empty history; the code contradicted the comment, and
  the code was wrong.
  Four consequences of dropping undo, each with a replacement:
  1. **`history[]` → `initialTubes` snapshot.** Restart used to rewind the move log; it now
     restores a deep copy taken in `loadLevel`. `snapshotTubes` must stay a **deep** copy —
     each tube owns its colour array and pouring mutates it in place, so a shallow copy
     would drift with play and restart would do nothing. `initialScore` is snapshotted
     alongside: score accumulates across levels, so resetting it to 0 would erase earlier
     levels' points. The old rewind did this correctly by accident (it subtracted each
     move's `scoreDelta`).
  2. **Stars now measure MOVE EFFICIENCY.** The old rule keyed on undo count; with no undo
     everyone would score 3★ forever, i.e. stars would measure nothing. The new thresholds
     are not invented — they come from the IDA* measurement already recorded in this file:
     p90 ≈ 3.5 × colours and the limit is 5 × colours, so p90 = **0.70 × limit** (3★) and
     0.85 × limit (2★). Being ratios of the limit, they rescale with colour count on their
     own; no per-level constants.
  3. **`level` is ZERO-BASED** — the header renders `Seviye ${level+1}`. The `◀` disable
     threshold is therefore `level <= 0`, not `<= 1`. Writing `1` left the button dead on
     "Seviye 2"; caught on device, not by reading.
  4. **The in-game `🔄` costs an ad but the game-over "Tekrar Oyna" stays FREE**, and that
     asymmetry is the whole soft-lock defence. Running out of moves already demands an ad or
     diamonds to continue; if restarting also required an ad, a player with an empty
     `AdBudget` would be stuck on that level with no way forward. The "free escape hatch"
     rule in the move-limit bullet survives there, and `watersort-moves-test.js` asserts
     `onRestart` still points at `restartLevel`, not `restartWithAd`.
  The move-limit bullet's undo passages are now history: "undo does not refund a move" has
  become the broader invariant **nothing refunds a move**, and the test was reworded to that
  (a future bonus or reward could reintroduce the same hole).
- **`waterSort`'s DOM renderer is still in `games.js` ON PURPOSE — do NOT delete it as dead code.**
  The unused DOM functions (`buildTubeEl`, `pourTransform`, `pourStream`, `drainSource`,
  `syncLiquidShade`, …) and the `.wsrt-tube` / `.wsrt-body` / `.wsrt-layer` CSS are the
  **visual parity reference** for the canvas migration: their comments carry the measured
  reasoning behind every effect (why the spill coefficient is 3.4, why the return curve is
  220 ms, why the seam sits on the bottom edge). Deleting them loses the spec while the
  migration is still open. Removal is the **last step of the migration**, gated on the
  checklist in `docs/04_CANVAS_POLICY.md` — of which step 3 (DOM vs Canvas benchmark) is
  **not yet done**. Same rule applies to any future migration.
- **`flowConnect` (Akış Bağlantı, 2026-08-09) is now a real game — the "polished demo, no
  game behind it" note is history.** It was never a rewrite: `PuzzleGames.flowConnect` did
  not exist, the card was `playable:false`, and `app.js`'s `PUZZLE_GAMES`/`GAME_MAP` never
  mentioned it. The old `MiniDemos.demo_flowConnect` — five fixed paths drawn in sequence and
  reset every 200 frames — was replaced, not upgraded.
  **FULL-BOARD COVERAGE IS NOT THE WIN CONDITION — a level ends when every pair is connected
  (owner decision, 2026-08-09).** It shipped the other way for a few hours and that was a
  defect, not a variant: the player connected every colour, the board refused to advance, and
  the hint said "hepsi zaten bağlı" at the same moment. The game held **two definitions of
  done** and showed both. The goal is to connect without crossing; leftover empty cells are
  fine. `isComplete()` = all pairs connected; `isPerfect()` (all connected **and** board full)
  survives only as the star criterion. Do not restore coverage as a gate.
  **Levels are still generated as full-coverage partitions and that must not change** — it is
  what makes solvability structural and what the hint reads from. What changed is that the
  covering solution is no longer *demanded* of the player.
  **There is deliberately NO lose state.** Moves are counted but running out of anything is
  impossible, so there is no continue economy here.
  **Stars therefore moved from move-efficiency to COVERAGE** (3★ = full board, 2★ ≥ 85 %,
  1★ below). Forced, not preferred: once coverage stopped being required, drawing K short
  paths scored 3★ every time, i.e. stars would have measured nothing — the same failure mode
  CLAUDE.md already records for Water Sort's undo-based stars. Two consequences: the HUD shows
  the fill percentage next to the connected count (grading on a hidden criterion is worse than
  not grading), and the star row stays **blank until the first move** — at level start the only
  filled cells are the endpoints (~38 %), so a live grade read "★☆☆" before the player had
  touched anything. This follows the platform's
  flow-not-stress principle; Water Sort's lose state came from a *measured* move optimum and
  no such basis exists in this genre. Controls are Undo (free, unlimited), Reset (free) and
  Hint (10💎 or one rewarded ad, same price as Arrow) — owner decision, chosen over the design
  image's 💎15 undo / 💎30 reset because no other game charges for correcting a mistake.
  Nine things are load-bearing:
  0. **The board is a PORTRAIT RECTANGLE, not a square (owner request, 2026-08-09: "oyun
     alanını boyuna uzat").** A square grid can only grow by getting *wider*, and it was
     already at 97 % of the screen width — so on a 384×774 phone it left ~200 px of unusable
     vertical space and could not be enlarged at all. The rows:columns ratio comes from the
     screen, not from taste: usable area ≈ 362×548 px → 548/362 ≈ 1.51. Tiers run 4×6 → 8×12,
     and the measured result is a board of **374×554 px, i.e. 97 % of the width and 72 % of
     the height** (it was 48 % when square). The engine always carried `W` and `H` separately;
     only the *data* was square.
     **Coordinates are base-36, and that is a bug fix, not compactness.** Rows now exceed 9
     (7×11, 8×12) and in decimal `"101"` is ambiguous — row 10 col 1, or row 1 col 0 followed
     by a direction `1`? Six levels' stored solutions were unplayable before this was caught
     by the test tool. In base 36 a row and a column are always one character; direction
     letters are uppercase and coordinates lowercase, so they cannot collide.
  1. **The level table stores the SOLUTION, not the endpoints.** Format
     `"WxH|rc<dirs>,rc<dirs>,…"` (R/L/D/U); the puzzle the player sees is *derived* from it
     (first and last cell of each path). This is the data flow the genre requires — solved
     layout first, endpoints derived, path information withheld — and it buys three things:
     the hint knows a correct route without running a solver on the device, the test tool can
     check the stored solution **and** independently search for one, and a direction letter
     costs one byte (70 levels ≈ 4.5 KB).
  2. **Levels are generated by cutting a random Hamiltonian path, never by placing endpoints
     and hoping.** `tools/flow-levels-test.js --gen` builds a full-coverage path with backbite
     shuffling, then cuts it into K segments. Full coverage and solvability are therefore
     *structural*, not checked.
  3. **Difficulty is measured as the GREEDY PLAYER'S SUCCESS RATE, not as a structural score.**
     A novice connects each colour by its shortest visible route in whatever order they notice
     the dots; `greedySuccessRate()` simulates exactly that over random colour orders. If it
     succeeds, the level plays itself. Since the win condition is "all pairs connected", this
     *is* the difficulty — how ornate the full-coverage solution happens to be does not reach
     the player.
     **This replaced a structural score after the owner played it and said levels stopped
     getting harder around 10-15.** Measurement confirmed it exactly: greedy success by
     ten-level block was **95 → 66 → 73 → 76 → 76 → 80 → 71 %** — flat after level 10, and
     levels 40, 50, 60 and 70 were *all* 100 % greedy-solvable. The old score (path length,
     turns, coverage share) rose steadily the whole time, so it looked fine; it was measuring
     properties of the covering solution, which stopped being what the player does the moment
     coverage stopped being required (point 0 of the win-condition bullet). **A difficulty
     metric has to be defined against the actual win condition.**
     Levels are now selected by aiming at a per-level target greedy rate that falls across each
     tier (`g0`→`g1` in `TIERS`). Measured result: **90 → 61 → 44 → 30 → 21 → 10 → 5 %**.
     Two supporting facts: hard boards are **rare** in the candidate pool (2-18 % below a 20 %
     greedy rate, depending on config), which is why the pool is now ~260 candidates per level
     instead of ~120; and the expensive full solver no longer runs on every candidate, only on
     the 70 that get selected — greedy scoring is a handful of BFS runs, the full solver is
     ~200 ms on 8×12, and that ordering is what makes a large pool affordable.
  4. **Solution count is NOT a filter, and this was measured before it was decided.** The
     first design demanded unique solutions on hard boards; measurement showed that is
     impossible: 5×5/3 median 10 solutions, 6×6/4 → 22, 7×7/6 → 150, 8×8+ → the 400 counting cap, and raising the colour count does not help (9×9 was tried at 9/10/11/12 colours, all
     400+). Full-coverage flow puzzles simply have many valid tilings as the grid grows;
     reference games are no different. So it became a **logarithmic score component** instead —
     a linear penalty would let 400 solutions dominate every other term.
  5. **Levels 1–3 are handcrafted 4×4 boards** (two straight rows + a snake; then a turn in
     every colour; then a board where the obvious short route breaks full coverage). Same
     reasoning as Arrow's `HAND_LEVELS`: a generator makes good boards but cannot *teach*.
     They still go through the solver — being handwritten is a reason for more scrutiny, not
     less.
  6. **After level 70 levels are generated ON DEVICE, and no solver runs there.** Solvability
     is structural (rule 2), so there is nothing to verify; measured at **6.3 ms** for 9×9/9
     colours (`--bench`), well under the main-thread budget that Arrow's `staleMax` lesson
     established. Generation is seeded from the level number, so the same level always yields
     the same board — otherwise "restart" would hand the player a different puzzle. The board
     stays 9×9/9 colours forever: the palette has nine colours and reusing one would not make
     the puzzle harder, only unreadable. Difficulty therefore **plateaus** at expert; that is
     a deliberate ceiling, not an oversight.
  7. **All game rules live in `engine.createBoard()` and nothing else implements them.** The
     Discover preview drives the same factory, so adjacency, backtracking, cutting another
     colour's path and the full-coverage win condition cannot drift between the two surfaces.
  8. **The Discover preview is genuinely playable, and `touch-action:none` is on the CANVAS
     ONLY.** Discover is a vertically scrolling feed; putting it on the card would lock the
     feed. Device-verifiable property: the 160×160 board blocks scrolling, every layer around
     it stays `auto`. The preview's rAF loop runs only while a pulse is alive and stops
     otherwise — several cards are alive at once and an idle loop would eat the feed's
     scrolling smoothness.
  9. **The hint clears the undo stack, and that is a fix, not tidiness.** Snapshots predate the
     hint, so undoing after a hint would erase the route the player just paid for.
  10. **The grid and the endpoint dots are cached in offscreen canvases, rebuilt only when the
     layout, the board, or the *connected set* changes.** At 9 colours a naive repaint costs
     54 filled arcs plus the grid **per frame**, all of it static — the same trap Block Puzzle
     documents as "never repaint the whole board". The cache invalidation keys on a 9-bit
     connectivity **mask**, not a count: a cut move can connect one colour while breaking
     another, leaving the count unchanged.
  **Device-verified on a Galaxy A51 (Android 13), and two real defects only appeared there:**
   - **The Discover preview board overlapped the card's game title by 34 CSS px.** The card's
     `.reel-info` is `position:absolute` over the bottom ~40% of the demo area, so centring the
     preview in the *full* area pushes it under the title. The preview now measures the info
     panel and reserves it. Invisible on desktop, where the taller viewport happened to fit.
   - **The root cause behind it is the more instructive one: `size()` ran before the demo
     element was in the DOM.** `_startDemo` calls the factory and only *then* inserts the
     element, so `clientWidth` is 0 — and the original `el.clientWidth || 260` fallback made
     `size()` *succeed* with invented numbers, so `load()`'s rAF retry never ran and
     `closest('.reel-card')` kept returning null. Measured proof: the cell came out at exactly
     41 CSS px, the value derived from 260, not from the real width. The fallback was deleted;
     when the measurement isn't available yet the code now waits instead of guessing. **Any
     other reel demo written against `el.clientWidth` has the same latent bug.**
  **The board fills the screen width, and that took reclaiming the shell's padding.**
  `#screen-game` has a 12 px inline padding shared by every game, so `.fc-wrap` cancels it with
  `margin-inline:-12px` — scoped to this game, nothing else touched. Width is the binding axis
  on a phone, so every pixel reclaimed goes straight into the cell. With `PAD` 7 and `EDGE` 4
  the board measures **374 × 554 px in a 384 × 774 viewport** (97 % width, 72 % height); the
  Discover preview went **54 → 68 px** per cell. `CELL_MAX` (96) is a tablet ceiling only; no
  phone board reaches it. Width was the binding axis while boards were square (measured: 9×9
  allowed 36 px from width but 58 px from height) — that measurement is what proved a square
  grid could not use the vertical space and led to the portrait boards in point 0.
  Two traps, both of which produced a silently-too-small board:
  1. **`layout()` must measure `.fc-wrap` (`boardAreaEl`), not the outer column (`wrapEl`).**
     The negative margin is on the inner box, so the two differ by 24 px. Measuring the wrong
     box is not an error — it returns a perfectly valid number for the wrong element, and the
     board just comes out one step smaller (40 → 38 px, observed).
  2. **`.fc-wrap` is `flex:0 0 auto`, and `layout()` takes the available HEIGHT from the
     siblings rather than from that box.** With `flex:1` the wrapper swallowed all spare
     height and centred the board inside it, leaving two ~104 px dead bands above and below —
     the owner's "too much empty space top and bottom". The board is square and width-capped
     so it cannot grow into that space; the only fix is to stop spreading the space *around*
     it. HUD, board and controls now pack as one centred block (measured gaps: 4 px and 2 px).
     Because the wrapper's height is then content-driven, reading it for the size calculation
     would be circular — height is `wrapEl.clientHeight − HUD − controls`.
  3. **A single measurement at load is not enough; there is a `ResizeObserver` on the board
     area.** The first `layout()` can run before the box has settled (observed reading 360 px
     where the real value was 384), and `window.resize` never fires for that — the window did
     not change, the element did. The observer also covers rotation and late-applied CSS. It is
     **not** collected by `clearEvs()`; `cleanup()` disconnects it by hand.
  **Rendering measured at a locked 60 fps** while drawing continuously on the 9×9 board: 240
  frames, one cell per frame — **P50 16.7 ms · P90 16.7 ms · P95 16.8 ms · P99 33.4 ms**
  (a single doubled frame). Recorded with the device **thermally throttled** (`SKIN` 41.9 °C,
  `mStatus=2`) per §5's record-don't-normalize rule.
  **Measurement trap worth keeping:** `dumpsys gfxinfo` around `adb shell input swipe` is
  **not** a usable number for this game — it reported P90 42→48 ms and 38→90 % janky across
  the optimisation, i.e. it appeared to get *worse*. The runs were not comparable (1876 vs 686
  frames, 39.1 vs 41.9 °C, different board state) and the dominant term was the injection
  itself (`Number High input latency: 3027`). Drive the real handlers from inside the page and
  sample rAF deltas instead.
  `tools/flow-levels-test.js` validates all of it in four layers, the strongest being that it
  **replays every level's stored solution through the game's own `createBoard`** and asserts
  `isComplete()` — data and engine verified together, since either could be right while the
  pair is broken.
- **`jigsawCard` is ENDLESS since 2026-08-07 — completing a picture is a level, not the end
  of the game.** The `▸` next button was deleted and the game-over box no longer appears on
  a win; `finish()` runs the completion animation, adds score, toasts, then auto-advances
  after `WIN_HOLD_MS`. Removing manual skip is what makes "pictures completed" mean
  anything — a player who skips past pictures they dislike would make the counter measure
  nothing.
  Three things are load-bearing:
  1. **Score is added BEFORE `game_ended` is emitted.** Emitting first was the original
     shape and it under-reported: device-verified, a 270-point round left
     `GameEvents.forGame('jigsawCard').bestScore` at 0, so "best score" trailed a level
     behind. Score is genuinely new here — the old comment "this game has no score concept"
     was true until endless progression made one necessary.
  2. **`startLevel(level + 1, 0)`, never `(level + 1, N)`.** Passing the current size
     freezes the player's board and silently kills the difficulty curve (`sizeFor` ramps
     3×3 → 4×4 across levels 11-30). Score is not reset there either — `init()` resets it,
     because a level change continues the run rather than starting one.
  3. **`↻` costs a rewarded ad; the size buttons do NOT.** 3×3/4×4/5×5 is a difficulty
     choice, `↻` is a convenience (escaping a board you dislike). Gating difficulty would
     discourage players from finding their own level. Device-verified with an exhausted
     `AdBudget`: the board did not change.
  **Image rotation was NOT rewritten** — the existing epoch-shuffle already satisfies
  "random, no recent repeats, scales to thousands": it reshuffles the pool per epoch and
  pushes the previous epoch's second half to the back, and `orderFor` is cached. The
  measurement behind it is in `SLIDING_PUZZLE.md` (unguarded: 174 early repeats in 400
  levels).
- **`jigsawCard` (Resim Kaydır) tiles must stay exactly `100/N%` wide.** The image is split
  with `background-position` percentages divided by **N-1**, not N, and that math assumes the
  tile box is exactly one Nth of the board. Giving tiles a visual gap by shrinking the box
  breaks alignment — the gap comes from `border-radius`, and the win state removes it so the
  photo becomes seamless. Phases 1–3 (engine, image + level system, theme) are done; 4
  (polish) and 5 (content/scale) are not. Pool policy and the review page live in
  `docs/GAMES/SLIDING_PUZZLE.md` — **no image ships without being approved by eye**: of the
  first 49 candidates every one returned HTTP 200 and 7 still had to be cut.
- **`snakeGame` (Yılan, 2026-08-08) is CLASSIC snake with a SlySwipe skin, and "classic" is
  the specification, not a style note.** The owner's brief was explicit: reference gameplay
  from a retro snake, visuals from a supplied design image, and **no mechanics added** — no
  power-ups, obstacles, special food, combos, lives or modes. So the rules are the plain
  ones: food = +1 length, one food at a time, 180° turns refused. If a future change looks
  like "improving" the gameplay, it is out of scope by definition.
  **The edges WRAP — a wall never kills (owner decision, 2026-08-08, after playing the
  reference).** It shipped as wall-death for a few hours first; the correction came from the
  reference game, so treat "walls are solid" as a *bug*, not a variant to restore. Two
  consequences worth stating: the only lose condition is self-collision, so **every death
  comes from the player's own trail**, and the neon frame in the design image is a portal,
  not a barrier. Implementation is one line — `(head.x + dir.x + COLS) % COLS` — but the
  greedy pathing in any future helper must measure distance on a **torus**, or it will
  compute the long way round (this exact bug was caught in the test harness driver).
  Nine things are load-bearing:
  1. **Canvas was chosen BEFORE implementation** (`docs/04_CANVAS_POLICY.md`'s core rule),
     on two of the policy's own criteria: the board repaints as a whole and there is
     continuous motion. DOM would mean re-rendering a 300-cell grid 7-12×/second.
  2. **There is NO rAF loop, and that is the performance design.** Classic snake moves in
     discrete cell steps, so drawing happens once per tick inside the `setTimeout` chain —
     never per frame. Interpolating between cells would cost 60fps of painting *and* break
     the classic feel. "Idle costs zero" therefore falls out for free; do not add a rAF
     loop to animate the food or the frame.
  3. **Glow is baked into six sprites, never `shadowBlur` per frame** — the same rule already
     documented for Block Puzzle's particles. The cell size is fixed between resizes, so one
     body + four head rotations + one gem cover the whole game. The head is described once
     facing right and **rotated at sprite-build time**, not per paint.
  4. **The grid is a fixed 15×26, deliberately not derived from the screen.** Deriving
     cols/rows from the viewport would make the same score mean different things on
     different devices and make the high score incomparable. Only the *pixel* size of a cell
     varies (integer, capped at 34 so a tablet doesn't get an absurd board).
     **It was 15×20 until 2026-08-08**; the owner asked for a bigger play area ("too much
     empty space top and bottom"). The cell size is set by *width* (15 cols in ~348 px → 23 px)
     while height had ~685 px available and 20 rows used only 460 — so adding rows grows the
     board **without shrinking the pieces**. 26 rows = 598 px. The ceiling is 29: at 23×29 =
     667 px height starts binding instead and the cells shrink.
  5. **The tail's last cell is enterable when not growing.** `step()` computes collision
     *without mutating*, then pops the tail **before** writing the new head — reverse that
     order and the tail-chase case erases the head's own occupancy mark. This is the classic
     rule (following your own tail tip is legal), not a leniency bonus.
  6. **The input queue is 2 deep and reverse-checks against the QUEUE's last entry**, not the
     currently applied direction. Without the queue "up then left" inside one tick loses the
     first turn; without the queue-relative reverse check, a fast up+down pair would sit
     side by side in the queue and drive the snake into its own neck.
  7. **"Devam et" revives in place and then FREEZES until the next direction input.**
     `step()` leaves the state untouched when it detects a collision, so the snake is still
     one frame short of dying — reviving is just `alive = true`. It must not resume in the
     same direction or the next tick kills the player again for their money. This is the
     only reason a `waiting` state exists; the game itself starts moving immediately
     (classic), it does not wait for a first input.
  8. **The speed ramp is classic, not a difficulty system.** `150 → 85 ms`, `-2.5 ms` per
     food, floor reached at ~26 food. Retro snake speeds up as it grows; unbounded speed-up
     would make it unplayable, which is why there is a floor.
  9. **The game owns its score display (`ownsScoreDisplay: true`)** because the design puts
     the score inside the arena, top-left. The hidden shell `#game-score` is still kept in
     sync — `doubleScoreWithAd()` reads that element.
  **The art went through THREE owner-supplied design images in one day (2026-08-08); the
  third is current.** Anything violet in a Snake context is from image #1 and is stale.
   - #1 violet: magenta neon frame, purple sky, violet gem-cube body, **serrated 3-tooth head**,
     magenta diamond food.
   - #2 green/navy: **navy** sky, pale lavender-white frame, blue dot lattice, pale-cyan hollow
     score digit, **neon-green outlined "glass crystal"** body (bright stroke + dark translucent
     fill + 4 corner facet cuts — a different *material*, not just a hue swap), and a **two-tone**
     gem, cyan on top fading to magenta at the point.
   - #3 head only: the serrated tip was **deleted** and replaced by a real snake head — a solid,
     opaque, rounder head **1.28× the cell** (it overlaps the segment behind it, which is why
     paint order is tail→head), two white eyes with dark pupils, and a small red forked tongue.
  Three head rules are load-bearing:
   - **The head is a different material from the body on purpose** — opaque and brighter, where
     the body is translucent. At 23 px cells a translucent head with a face on it is mud.
   - **Direction is NOT applied by rotating the sprite.** Rotation was built first and rejected:
     at 90° the eyes slide to the side of the head and it reads as a fish in profile, at 180°
     the face is upside down. The design's face looks at the *viewer*, so `drawHead(ctx, dir)`
     keeps the eyes a horizontal pair always and only swings the tongue forward. The single
     exception is **up**, where the tongue exits the top, so the eyes move to the lower half —
     otherwise the tongue crosses them.
   - **Pupils must stay well under half the white.** Bigger pupils turn both eyes into one dark
     smudge at cell size and the face disappears.
  The supplied images are landscape and the app is orientation-locked to portrait, so the
  *arena proportions* are the one thing that could not be copied. The frame and dot lattice are
  **CSS, not canvas** (both static — the lattice is locked to `--snk-cell` so it stays aligned
  with the game grid), and the score is a DOM node written only when it changes.
  **The Discover card demo carries the same palette and must be updated with it** (`demo_snake`
  in `reels.js`, plus the `REEL_GAMES` gradient and the `PUZZLE_GAMES` home tile) — the owner
  asked for that explicitly, and a card that advertises the old colours is a card that lies.
  **There is no D-pad**: the owner chose swipe-only so the screen matches the design image
  exactly; input is the shared `phSwipe` plus arrow/WASD keys for desktop. Adding on-screen
  controls later is a design decision, not a bug fix.
- **`flappyUfo` (Flappy UFO, 2026-08-08) splits its two sources on purpose: GAMEPLAY from the
  reference game (flappybird.io), VISUALS from the owner's design image.** That split is the
  spec, not a style note — when the two disagree, gameplay wins, because the owner said so in
  the brief. Practical consequence: the design's in-play diamond is **not** a collectible (see
  the deliberate omissions below).
  The physics constants in the `W` block are **measured from the reference, not invented** —
  gravity 5, flap 1.4, fall cap 2.2, scroll 0.6, gap 0.47, spacing 1.0, pipe width 0.26,
  collision radius 0.068, gap centre uniform in [-0.2, 0.8], floor at -0.975, sky 2.03 +
  ground 0.53. Treat them the way Water Sort's move limit is treated: changing one is a
  gameplay change, not a tune.
  Nine things are load-bearing:
  1. **The unit is a WORLD UNIT, never a pixel, and it is ISOTROPIC.** `U = arenaH / 2.56`
     converts once at layout. Pixel constants would make the same score mean different things
     on different screens — the same reason Yılan's grid is a fixed 15×26, reached by a
     different mechanism. It also makes resize free: `layout()` rebuilds `U` and the sprites
     while `y`/`vy`/`pipes` survive untouched, so rotating the device does not kill the run.
  2. **Physics runs on a FIXED 120 Hz accumulator, drawing on rAF.** Per-frame physics would
     literally be a different game at 60 fps and at 120 fps. `MAX_CATCHUP` (0.25 s) caps the
     backlog: without it, returning from 30 s in the background would execute 3600 steps in
     one frame and the player would come back already dead.
  3. **`W.radius` (collision) and `UFO_W` (art) are SEPARATE NUMBERS.** The brief asked for
     this explicitly. Binding them would let an art tweak silently change difficulty.
  4. **There is NO ceiling.** Flying above the top edge is legal and classic; the only two
     ways to die are a pipe and the ground. Adding a ceiling would be a gameplay change.
  5. **The first five gaps are wider (0.62 → 0.50) and this is the REFERENCE'S own warm-up**,
     not an invented easing. From the sixth pipe on it is a flat 0.47 forever — there is no
     other difficulty ramp, and inventing one would be redesigning the game.
  6. **Nothing draws with a live shadow/filter/blur.** Every neon edge is baked into a sprite
     once (`buildBody`/`buildCap`/`drawUfo`/`drawTrail`/`buildMountains`); the frame loop is
     ~15 `drawImage` calls. Same rule already documented for Block Puzzle's particles and
     Yılan's glow. The pipe body is a 24 px slice **stretched** vertically — legal only
     because it is vertically uniform.
  7. **Static art is not on the game canvas.** Stars are DOM (`phAtmosphere`, inside the arena
     so they show through), and moon/clouds/horizon glow live on a second canvas painted
     **once** per layout. Only the scrolling mountain tile, the pipes and the UFO repaint.
     The mountain tile is seamless because the last peak height is forced equal to the first,
     and its silhouette comes from a **seeded** LCG — `Math.random` would reshuffle the
     landscape on every resize and read as breakage.
  8. **"Devam et" must CLEAR THE CORRIDOR and then freeze.** Reviving in place wakes the
     player inside the pipe that just killed them, so `revive()` drops nearby pipes, recentres
     the UFO and waits for the next tap. Resuming immediately would kill them again for their
     money — the same reasoning as Yılan's `waiting` state.
  9. **The start overlay is `pointer-events:none` and the play button is not a button.** One
     tap path (`pointerdown` on the arena) handles start, flap and resume, so "did I hit the
     button or the screen?" cannot arise and the first tap is also the first flap. No
     `setPointerCapture` — see the `phCamera` landmine above.
  **Deliberately NOT built, all three owner calls rather than oversights:** the floating
  diamond in the design's play panel is **not** a pickup (a collectible is a mechanic the
  reference does not have, and paying game diamonds would be an economy change — §7); there
  is **no pause button** (the reference has no pause, and the shell header already owns
  exit); and there is **no diamond HUD pill** (the balance was deliberately moved out of
  headers into Profile — see the header bullet above). Any of the three is a small, additive
  change if the owner wants it.
  **REVISED 2026-08-08 (same day) after owner feedback — five changes, each fixing a real
  defect rather than a preference:**
  1. **The trail is a PATH HISTORY, not a sprite.** It was one baked sprite pasted
     horizontally behind the UFO every frame, so when the UFO climbed or dived the trail
     stayed flat — the owner read it as "someone holding the UFO with a stick". Now `trail[]`
     stores recent screen positions and every point scrolls left at **exactly the pipe
     speed**, i.e. the trail is left behind in world space. The undulation is therefore a
     consequence of the motion, not an animation; there is no wobble effect to tune. Cost is
     one path fill + 4 dots per frame — still not a particle system (particles would own
     lifetimes and velocities; these points only translate).
  2. **The mist was DELETED and the sky is one continuous gradient.** The mist was a
     full-width light slab across the scenery band; it read as a different surface from the
     night sky above and split the screen into "two separate screens" (owner's words). The
     arena's CSS gradient also used to lighten toward the bottom — that is gone too. Nothing
     in the band paints a background any more; only silhouettes and clouds are drawn, so the
     sky shows through unbroken.
  3. **Clouds moved INTO the scrolling tile.** They were on the static backdrop canvas while
     the mountains scrolled, so the lower scenery moved and the upper did not. One tile now
     carries clouds *and* mountains, so the landscape moves as a single piece. Two traps
     found on device: a puff that overruns the tile's top edge is **clipped** and leaves a
     razor-straight horizontal line across the screen (hence the `py - pr < 1` skip and the
     taller tile), and every puff must also be drawn at ±tileW or the tile seam shows.
  4. **Consecutive gaps may not be near-identical — `MIN_GAP_DELTA` (0.22).** The reference
     draws each gap independently and uniformly, which is correct in the abstract and
     misleading in play: in a 1.0-unit range two consecutive draws land within 0.15 about
     **28%** of the time, and players read that as "the pipes are all at the same height".
     Resampling (bounded retries) drops it to **0.1%** measured over 20,000 samples while
     leaving the distribution and its full range intact. This is a deliberate, small
     deviation from the reference, requested by the owner.
  5. **A pause button exists, and the reference has none.** Owner-approved addition. It
     changes no gameplay: time stops completely, nothing resets. Two rules — the button
     **must** `stopPropagation()` (it is a child of the arena, so the same tap would
     otherwise also flap), and resuming from a tap on the arena **must not flap**, or the
     player's "continue" gesture launches the UFO. `startLoop()` resets the accumulator, so
     the paused wall-clock time is never replayed as physics.
  **Testing trap that caused a false bug report — read before diagnosing "the pipes are all
  at the same height".** The fixed-gap autopilot used for testing overrides `Math.random` in
  the *live page*, and the override survives until the app is restarted. Twice the owner
  looked at a device left in that state and reported uniform pipes. Restore it from a fresh
  realm (`document.createElement('iframe').contentWindow.Math.random`) — `delete Math.random`
  does **not** restore the native function, it removes it outright.
  **The procedural mountains are FACETED, and that is what made them read as mountains.**
  A filled silhouette — however well its outline is shaped — reads as a *chart*, not terrain,
  because volume comes from shading, not from outline. So `peakRidge` returns the peak list
  as well as the envelope, and each layer paints in three passes: silhouette fill (mass),
  then per-peak **lit left face** (volume; the light is always from the left, so the right
  face keeps the base gradient and the eye resolves the difference as form), then snow caps
  and a ridge rim (material). Passes 2-3 are **clipped to the silhouette** or the face
  triangles spill into neighbouring valleys. Two earlier approaches were tried and rejected
  on device: midpoint-displacement noise (read as a stock chart at every roughness setting)
  and a plain filled triangle envelope (flat, weightless).
  **The background is now an IMAGE ASSET (`assets/flappy/bg.jpg`, 1080×1935 JPEG q84, 100 KB),
  and the procedural mountains are the fallback behind it.** Reproducing the design's painted
  landscape (volumetric cumulus, lit valley, textured spires) with canvas polygons was
  attempted across several iterations — midpoint-displacement ridges read as a stock chart,
  triangle-envelope ridges were flat, faceted ridges finally read as terrain but still were
  not the same class of artwork. That is the general lesson: **a painted backdrop is an asset
  problem, not a rendering problem.**
  Four things are load-bearing:
  1. **When the image loads, `paintBackdrop()` returns early** after drawing it cover/
     bottom-anchored, sets `mtnCv = null` (killing the scrolling tile) and removes the
     `phAtmosphere` star layer — the illustration carries its own stars, moon and clouds.
     The whole scenery is therefore one static piece, which is *structurally* why the
     "bottom moves, top doesn't" complaint cannot recur.
  2. **`buildSprites()` skips `buildMountains()` unless `bgFailed`.** Drawing the procedural
     scene while the image is still loading would show the wrong landscape for a frame and
     then swap it; showing nothing is better.
  3. **`assets/flappy` is in `build-www.js`'s SHIP list but deliberately NOT in
     `SHELL_ASSETS`** — same reasoning as the Jigsaw pool: precaching re-downloads it on
     every `APP_VERSION` bump. Same-origin image requests already fall into `MEDIA_CACHE`.
  4. **The shipped file is a generated stand-in matched to the owner's design direction, not
     the owner's own export.** Swapping it is a file replace and nothing else — no code
     change — so treat it as art that is expected to be replaced, and keep the fallback
     path alive for exactly that reason.
  **Testing trap, cost an hour: an occluded/headless desktop browser suspends `requestAnimationFrame`,
  and the symptom is indistinguishable from a dead game loop** — the game accepts input, the
  start overlay hides, and then nothing moves, no error, no `game_ended`. Headless Edge reports
  `document.visibilityState === 'hidden'` and never fires a single frame; a headed window that
  loses focus stops firing mid-run. Verify rAF is actually ticking (`rAF/sn`) **before**
  concluding anything about physics, or test on device. This is the same trap already recorded
  in the browser-verify notes for Discover demos.
- **`.slp-board-wrap` uses `::after` for its neon frame, never `::before`.** That div is also
  a `.ph-dais`, and `.ph-dais::before` is the platform's top key light. Writing the frame to
  `::before` collides with it and the frame renders along the top edge only — this happened
  and was caught in review.
- **`phCamera` must NOT call `setPointerCapture` on pointerdown** — only once a drag
  actually starts (movement past `dragStart`). Capture retargets the subsequent `click` to
  the **capturing element**, and since the camera's viewport is an *ancestor* of the
  content, every click listener on anything inside it silently stops firing. This shipped
  once and made Arrow completely unplayable — taps did nothing at all. Note the testing
  trap that hid it: dispatching a synthetic `click` directly on the target bypasses capture
  entirely, so it passes while the real game is dead. Verify tap handling by dispatching the
  full `pointerdown → pointerup → click` chain, not a bare `click`.
- **Ok Bulmaca exit rule is the SNAKE model: only the tip's forward ray matters.**
  An arrow leaves by following its own body path, straightening as it goes, so the cells
  beside or behind its body are irrelevant. `canExit` and `blockersOf` both walk that single
  ray and **must stay in agreement** — if they diverge, the game rejects one arrow and then
  blames a different one. Do not "restore" the old rigid-translation sweep: it swept every
  cell of the shape, so an obstacle in front of a curved arrow's *tail* also blocked it.
  Players saw a clear path and got refused; measured at **26.5% of curved-arrow taps**
  (every single false rejection was a curved shape — for straight arrows the two models are
  identical, which is why the bug hid for so long).
- **Ok Bulmaca (`arrowPuzzle`) deliberately has NO input lock during exit animations.**
  Taps may overlap and several arrows can fly off at once. This is safe because arrow
  removal is **monotonic** — a departing arrow only frees cells, so a free arrow can never
  become blocked by another arrow's exit. Proven in Phase 1 and re-verified (30,880 checks,
  zero violations). A lock would silently swallow taps for ~280 ms each and make the game
  feel dead. Don't add one back. Its corollary: `onCleared` **must** stay guarded by
  `!cleared`, or concurrent exits fire the level-complete path more than once.
- **Arrow level params are capped by board CAPACITY, not just a curve.** `paramsFor` derives
  a ceiling from `cols * rows * MAX_FILL / AVG_CELLS_PER_ARROW`, and `startLevel` retries
  with one fewer arrow on generator failure. Both are load-bearing: the original raw curve
  asked for 32 arrows on an 80-cell board (~112 cells needed), the generator returned
  `null`, and the game **crashed at level 19**. Never write `res.board` without the retry
  guard. The numbers (`MAX_FILL` 0.85, avg 3.5 cells/arrow) are measured, not guessed.
- **Arrow levels come from TWO sources: `HAND_LEVELS` first, generator second.**
  `startLevel` returns early when `HAND_LEVELS[level]` exists, so `paramsFor` and
  the generator chain never run for those levels. Handcrafted levels exist because
  the generator makes good boards but cannot *teach* — which idea is introduced in
  which order is a design decision. Authoring format is absolute cells, tip first,
  plus the direction the tip faces; `ensureHandShape` converts to canonical form
  and registers the silhouette in `SHAPES` at runtime (ids `hand0`, `hand1`, …).
  Those runtime shapes are in no tier, exactly like `sp12`–`sp20`. **Never author a
  level by editing `SHAPES` directly** — write cells and let the loader do it.
  Validate any new level with the Node harness before shipping: it checks cell
  collisions, adjacency, solvability, and wave depth. A level that looks fine can
  still be unsolvable, and nothing in the UI would tell you.
- **Arrow has THREE generators and the order in `startLevel` is load-bearing.**
  `generateSlide` (Üreteç C) is tried first, then `generateReverse`, then
  `generateForward`. All three share the *same* validity condition — an arrow's
  exit ray must be clear at placement time — and C asks `canExit` itself rather
  than deriving a second "can it exit" definition. **Never let a generator define
  its own exit test**; that divergence already cost this game once (see the snake
  exit bullet above). C wins because it computes the tips whose rays are *already*
  clear instead of sampling random anchors and rejecting: measured at 26×24/85
  arrows, B gets 50% in 112 ms, C gets 80% in 14 ms. Removing C or reordering the
  chain silently reverts levels to the slow, often-failing path.
- **`generateSlide`'s `mask` and `fill` options are deliberately unused today.**
  `mask` restricts which cells may be filled (the reference game's silhouette
  levels — a board shaped like a digit or animal); `fill` packs until nothing more
  fits, raising density from ~0.55 to 0.68–0.78. `startLevel` uses neither: it
  still asks for a target arrow count. They exist because they are the search's
  natural parameters and bolting them on later would mean rewriting the generator.
  Not dead code — unshipped capability.
- **`tools/level-metrics.js` is the official design-validation tool for Arrow.**
  Reference levels and our own levels are measured by the **same code** — measuring them
  separately would make the comparison meaningless. It is plain Node, zero dependencies,
  and it does not run the game: it loads `games.js` in a `vm` sandbox with DOM stubs and
  reads the exported engine. This is the project's first Node script; it is tooling, not
  a build step, so the zero-dependency / no-build rule in §6 still holds.
  Three modes: no args measures our campaign, a file path measures an ASCII
  transcription, `--ascii <n>` prints a level. **Transcription format:** uppercase = the
  snake's head cell, lowercase = body, `.` = empty. Direction is *derived*, not written
  (the body's first cell is always directly behind the tip) — except for folded snakes
  whose head touches their own body twice, where a `# X=up|right|down|left` line is
  required; the tool says so by name when it hits one. **No new level ships without
  being measured first** — guessing the progression is what produced a campaign whose
  wave depth is flat at 2 from level 4 to 100.
- **Generated levels (4+) run the packer in FILL mode, not target-count mode.**
  `startLevel` calls `generateSlide` with `{ fill: true, preferLong: true }` first, so
  `paramsFor(...).arrows` is **not** what decides the arrow count — the board size does.
  `paramsFor` still runs because the fallbacks need a count. Measured over levels 4–40:
  curved-arrow share 51%→69%, mean snake length 3.8→5.3, interlocking (distinct
  touching neighbours per arrow) 2.21→2.91, density 0.58→0.77, while the arrow count
  per level moved by at most ±1 — the difficulty curve survived, the boards just got
  fuller. Fill mode's `staleMax` defaults to 25, not 200: measured identical output at
  both but 86.7 ms → 7.5 ms, and level generation blocks the main thread.
- **`i2` was removed from `SHAPE_TIERS`; `sp12`/`sp14`/`sp16` were added at tier 22.**
  `sp18`/`sp20` remain in `SHAPES` but in no tier. `i2` had to go because the packer
  tries six candidates and places the first that fits, so the smallest shape won far
  more often than its share of the pool: at level 40 straights were 17.6% of the pool
  but 48% of placements. Adding shapes to a tier shifts `avgCells()` and therefore the
  capacity cap, so it is never a cosmetic edit.
- **Sudoku validates against the SOLUTION, not against Sudoku's rules.** A wrong digit is
  refused and costs one of 3 lives; it never lands on the board. This is deliberate — it is
  why there is no erase key and no undo, and it makes **unique-solution puzzles a functional
  requirement** (a multi-solution puzzle would punish a valid alternative answer). The
  generator enforces this structurally. Full rationale: `docs/GAMES/SUDOKU.md`.
- **Deterministic seeds live in `core/rng.js`** and are game-agnostic on purpose. It uses
  the **local** date; switching it to UTC would make the daily puzzle change mid-day for
  some regions. `rng.js` must load before `games.js` (the Sudoku generator depends on it).
- **Daily Challenge (`core/daily.js`) is a PLATFORM feature, not a Sudoku feature.** A game
  joins with two things: `supportsDaily: true` on its module, and an `init(container, opts)`
  that honors `opts.seed` deterministically. Optionally `dailyDifficulty` (the daily must be
  the same for everyone, or "same puzzle for all" is false). `daily.js` knows nothing about
  any game's rules — adding a new daily game should not require editing it. Its streak is
  **separate from `StreakSystem`** (`ph_streak`): that one rewards *opening* the app, this
  one rewards *solving* the daily.
- **`playGame(name, opts)` options are retained and reused by `restartCurrentGame()`.** This
  is what makes "Tekrar Oyna" on a daily puzzle reproduce the same board instead of dropping
  the player onto a random one. Don't drop the argument.
- **The Discover feed deals from a SHUFFLED BAG, not independent random draws
  (2026-08-08).** The old `_pickNextGame` filtered out anything seen in the last
  `NO_REPEAT_WINDOW` cards and then drew uniformly at random. That only prevents an
  *immediate* repeat; it does not distribute. Independent draws cluster by definition —
  some games appear three times in twenty cards while others appear zero times — and the
  owner reported both symptoms: "the same games keep coming" and "I can't find the game I'm
  looking for / a newly added one".
  Measured on the real engine (13 games, 40 cards, 20 000 runs), independent → bag:
  repeat-within-6-cards **35% → 12%**, distinct games in the first epoch **9.5 → 13/13**,
  a given game missing from the first 20 cards **12.6% → 0%**, cards needed to find a
  specific game (p90) **23 → 12**. Device-verified on the A51: first 13 cards contained all
  13 games and repeat-within-6 measured **7%**.
  **The pool was 13 when this was measured; it is 11 since the 2026-08-09 deletion.** The
  numbers are kept as recorded rather than rescaled — they are a real measurement of a real
  run, and the guarantee they demonstrate ("every game once per epoch") is structural, so it
  holds at any pool size. Do not read "13" here as a current game count.
  **The same pattern already existed in the repo** — Jigsaw's image rotation is an
  epoch-shuffle for exactly this reason (`docs/GAMES/SLIDING_PUZZLE.md`: 174 early repeats
  in 400 unguarded levels). This is that pattern's second consumer, not a new one.
  Five things are load-bearing:
  1. **The epoch SEAM needs its own guard.** Without it the last card of one shuffle and
     the first of the next can be the same game, which is exactly the artefact the bag
     exists to remove. `_refillBag` rotates the new bag's head back while it collides with
     the tail of `_recentIds`. The window **shrinks with the pool instead of switching
     off**: an earlier version skipped the guard entirely for small pools and the 2-game
     Arcade chip produced adjacent duplicates on device. At pool 2 the window is 1, so the
     feed strictly alternates.
  2. **`_activePool()` is the single definition of "what may appear".** The chips filter it,
     and the bag always refills *from it*, so the "every game once per epoch" guarantee
     holds inside a filtered feed too — it is not a property of the full catalogue.
  3. **Changing a chip rebuilds the feed** (cards destroyed, `_bag`/`_recentIds`/`_globalIdx`
     reset, `scrollTop` 0). Appending instead would leave out-of-filter cards on screen.
     `_bag` and `_filter` must also reset in `init()` **and** `cleanup()`, or a re-entry
     resumes mid-epoch and the first-epoch guarantee silently fails.
  4. **The first card is the newest game, and ties are broken RANDOMLY.** Sorting by
     `addedAt` alone always returned the first array entry when two games share a date —
     measured: Yılan took the slot 100% of the time and Flappy UFO never did, defeating the
     point. Now all games sharing the newest date split it (measured 50.7/49.3).
     `addedAt` is deliberately a date, not a `badge:'yeni'` flag: a flag needs someone to
     remove it later and nobody does; a date expires on its own (`NEW_GAME_DAYS` 14).
  5. **The chips are the first consumer of `REEL_GAMES.category`** — the field existed but
     no code read it (noted elsewhere in this file). The empty-Favourites chip goes
     *disabled, not hidden*, the same rule already applied to ad-budget rows.
  **Measurement trap, hit twice while validating this:** the DOM is **not** the emitted
  sequence — `_cleanupOldCards()` prunes from the front past `MAX_DOM_CARDS`, so reading
  `.reel-card` elements samples a sliding window and understates coverage (it reported
  10/13 for a feed that was actually perfect). Record cards as they are *appended*
  (MutationObserver) instead. The sibling trap in the Node harness: `_generateBatch` does
  not increment `_globalIdx` — `_appendBatch` does — so a harness that calls the generator
  directly makes every batch look like the first and re-triggers the hero/new-game card.
- **Discover difficulty badges can be dynamic.** `reels.js` uses a game's
  `difficultyLabel` getter when present, else the static `REEL_GAMES` string. Sudoku's card
  used to advertise "Zor" while the game started on Easy — if you add player-selectable
  difficulty to a game, expose `difficultyLabel` or the card will lie.
- **Sudoku is feature-complete.** Bug fixes, performance, and small polish only — see
  `docs/GAMES/SUDOKU.md` §9 for what was deliberately not built and why.
- **`--ph-stone-*` tokens are intentionally unused.** Reserved for the planned "Gölge
  Tapınak" dark theme; Sudoku moved from stone to parchment. Not dead code to clean up —
  but also don't pick colors from it without reading `DESIGN_SYSTEM.md` §13 first (its
  intaglio color failed contrast at 1.05:1).
- **`showGameOver(win, title, msg, { onContinue })`** — the 4th argument is optional and
  backwards compatible; games that omit it get the old behavior. It exists so a game can
  define what "continue after an ad/diamonds" restores. The hook is single-use and cleared
  on restart/exit.
- **The shell was REDESIGNED on 2026-08-10 and the new design system is
  `core/ui-shell.css` (`sly-*`).** Owner-supplied reference mockup; scope was Home,
  Discover, Rozetler and Ayarlar. It is a **third** stylesheet layer, loaded **after**
  `style.css` so it wins on conflicting shell rules, and it does **not** touch games
  (`--ph-*` is untouched — see the two-`:root` bullet below, now three).
  What the redesign reversed, each deliberately:
  1. **PLUS and the diamond wallet are BACK in the home header.** The 2026-07-29 bullet
     below says they were moved to Profile rows because the mockup's header had neither;
     the new reference has both. The **Profile rows stayed** — the original problem was
     that those were the *only* doors, not that two doors exist. `#plus-badge` still needs
     its `.plus-text` child (`PlusSystem.updateUI`), and the wallet still carries
     `.diamond-display` + `.diamond-count`.
  2. **The weekly chest is GONE from Home** (owner request). `claimWeeklyReward()` and
     `WEEKLY_MISSIONS` are kept uncalled, same rule as `renderLeaderboard()`.
  3. **Tab icons are SVG, not emoji, and per-tab accent colours were dropped.** Emoji
     cannot take a colour — `style.css` worked around that by putting a coloured fill
     *behind* the icon; `currentColor` on an SVG removes the need. The four
     `--tab-active-*` tokens still exist in `style.css` but nothing reads them any more.
     `data-tab` keys are unchanged (`lider` is still the Rozetler screen's key).
  4. **There is no centre/floating nav button and none may be added** — explicit owner
     instruction. Four equal tabs.
  5. **The Rozetler screen dropped its placeholder numbers**, see the placeholder bullet
     below. `SETTINGS` became `SETTING_GROUPS` (grouped sections, real toggles).
  6. **Discover changed CSS only — `_injectCSS` values, no logic.** Three pre-existing
     overlaps were fixed there, all device-measured on a Galaxy A51 (384 CSS px wide):
     - `.reel-card-counter` was at `top:16px`, i.e. **underneath the category chips**
       added on 2026-08-08 (chips sit at `safe-area + 10px`, ~31 px tall). Now `top:56px`
       — counter top 56, chip bottom 41, no overlap.
     - **`.reel-demo-area` now reserves the chip strip** (`padding-top: safe-area + 44px`).
       The chips overlay the top of *every* card, so a centred demo ran under them:
       flowConnect's "PARMAĞINLA BAĞLA" caption measured y 29-41 against a chip strip at
       y 10-41. After: caption at y 72. This does **not** shrink demos, it shifts them —
       demos read their own element's size, so they re-fit on their own. It is the
       top-edge twin of the bottom-edge reservation flowConnect already does for
       `.reel-info` (whose `position:absolute` must therefore stay).
     - **The swipe hint moved `bottom:24%` → `44%` and gained its own dark pill.** `.reel-info`
       occupies the bottom ~41% of the card (measured 417-702 of a 702 px card), so 24% put
       the hint *inside* it, on top of the game description. Contrast was a separate bug:
       the hint is bare white text over the demo, and Akış Bağlantı's board is **white**.
       Position alone cannot fix that (any demo may be light there), hence the pill.
       **`@keyframes reelSwipeHint` no longer animates `opacity`** — it pulsed 0.5→1, which
       faded the new pill to a grey smear. Two consequences: the bob is now motion-only,
       and the JS fade-out (`style.opacity=0` after 4.2 s) finally works — an animated
       `opacity` outranks an inline style in the cascade, so it never had.
  7. **The shell layout is now SAFE BY CONSTRUCTION, and `tools/layout-matrix-test.js`
     proves it.** Text clipping used to be discovered one phone at a time — A51 (384 px)
     clipped "Rozet İlerlemesi", then the Huawei (360 px) clipped the app's own name. The
     cause was the method, not the devices: fixed-pixel boxes (`width: 164px`,
     `grid-template-columns: 1fr 1.2fr`) verified by measuring whether a given string
     happened to fit. That is "correct on the phones I owned", never "cannot break".
     The tool sweeps **6 widths × 3 font scales × 3 screens = 54 cells** in one headless
     run and fails on any sub-pixel text overflow or horizontal scroll. Baseline was
     **25 of 54 failing**; it is now 0. Run it after any shell CSS change:
     `node tools/layout-matrix-test.js` (add `--shot 320x1.3` to look at one cell).
     Four rules replaced the fixed pixels, and each one removes a whole class of failure:
     - **Icon tiles are sized in `em`, not px.** A 42 px box holding a 23 px glyph breaks
       the moment the system scales text; `width: 1.83em` makes box and glyph grow
       together. This alone fixed 24 of the 25 failing cells' icon overflows.
     - **The top bar wraps** (`flex-wrap` + `min-width: max-content` on the brand). The
       actions block cannot shrink, so something had to give — and the thing that must
       never be clipped is the app's name.
     - **Cards size to content** (`width: max-content` on `.sly-stat`) because the rail
       already scrolls horizontally; a card that grows can't clip.
     - **`overflow-wrap: anywhere` on free text** is the last-resort guarantee for a long
       Turkish word in a narrow column (`Avantajları` at 130 %). Breaking a word is ugly;
       clipping it destroys information.
     **Breakpoints now only handle SPATIAL composition** (hero text vs the card fan), not
     text fitting. The one at ≤383 px still trims the brand — not to prevent clipping
     (wrap does that) but to decide *when wrapping kicks in*, since 360 px is the most
     common Android width and a two-row header there would be the normal case, not a
     fallback.
     **Device-confirmed on 2026-08-11 (A51, `font_scale` 1.1, forced density 450 → 384 CSS
     px).** The phone's real setting is *not* the default, which is the point: brand text is
     written as 21 px and computes to **23.1 px** on the device. All three shell screens
     scanned clean at that setting. Pushing it to ~130 % in-page (without touching the
     user's system setting) made the top bar wrap to two rows and the hero title to two
     lines — exactly the designed degradation — with zero clipped text and no horizontal
     scroll.
     **Boosting re-applies to an INLINE `font-size` too**, so the on-device simulation
     compounded to ~1.43× rather than 1.3× (measured: brand 30.03 px). That makes an
     on-device scale test *stricter* than the matrix, not weaker — useful to know, and the
     reason the same trick would over-report if used to calibrate anything.
     **A bug in the tool itself is worth remembering:** the font-scale simulation applied
     the multiplier more than once — parents were scaled before children were read, so
     inherited sizes got multiplied twice, and re-applying after each tab switch compounded
     it further (measured: "Oyuncu" reported at 212 px, i.e. 1.3^4). Snapshot every computed
     size *before* writing any, and mark scaled elements so re-application is idempotent. A
     measuring tool that is wrong in the strict direction invents failures and wastes the
     time it was built to save.
  8. **Two test phones now, and 360 px is the narrow end.** The Galaxy A51 is 384 CSS px;
     a Huawei P20 Lite (ANE-LX1, Android 9, 1080×2280 @ 480 dpi) is **360**, and 24 px was
     enough to break the top bar. Measured there: the actions block (PLUS 78.4 + wallet 101)
     is `flex-shrink:0` and takes 187.4 of 332 px, leaving the brand 132.6; minus the avatar
     and gap the name got 79.6 px while "SlySwipe" needs 86.3 — **the app's own name was
     being clipped.** Fixed with a `max-width: 383px` block (brand 19 px, avatar 38 px),
     which also pulls the hero title in (it overlapped the card fan by 3 px of real glyphs).
     That block sits **before** the existing `max-width: 359px` one so the narrower, more
     aggressive rules still win. Discover, Rozetler and Profil measured clean at 360.
     **Do not assume Android 9 means an old WebView.** This phone ships WebView 79 as a
     package but its actual provider is Chrome 138, so `gap`, `conic-gradient`,
     `-webkit-line-clamp` and `backdrop-filter` all work — verified by *measuring a real
     flex gap in the page*, not by reading `dumpsys` version strings. Check the provider
     before designing around a compat table.
  9. **Android WebView INFLATES text and it only shows on device.** The stat-card label is
     `font-size:10px` in CSS and computes to **11px** on the A51 (system font scale /
     font boosting); desktop keeps 10px. "Rozet İlerlemesi" then measured 84.36 px in an
     83.58 px box and rendered as "Rozet İlerlem…" — a defect that is **invisible in a
     desktop browser at the same viewport width**. Fixed by widening `.sly-stat` to 164 px
     (~13% slack, tolerates ~124% system scale). `-webkit-text-size-adjust:100%` would kill
     the inflation outright but also overrides the user's accessibility preference, so it
     is a product decision (§7), not a silent fix.
     **Measurement trap, cost a wrong "it fits" conclusion:** `scrollWidth` is rounded to an
     integer, so a 0.78 px overflow reads as `84 == 84` and looks clean. Use
     `Range.selectNodeContents(el).getBoundingClientRect().width` against the element's own
     rect to see sub-pixel overflow.
  **Adding a shell file means editing THREE places, not one:** the `<link>` in
  `index.html`, `SHELL_ASSETS` in `sw.js`, and `SHIP` in `tools/build-www.js`. The build
  cross-checks the last two and fails loudly; the `<link>` has no guard.
  **Testing trap that cost a wrong diagnosis here:** on the web surface the service worker
  serves `style.css`/`ui-shell.css` **cache-first**, so CSS edits do not appear until
  `APP_VERSION` is bumped — while `index.html` is network-first and updates immediately.
  The symptom is "my HTML change landed, my CSS change didn't", which reads like a
  specificity bug. Unregister the worker and clear `caches` before re-reading the page.
- **The login streak DID NOT WORK until 2026-08-11, and the cause was a single missing
  call site.** `StreakSystem.checkIn()`'s only caller in the whole app was
  `claimDailyReward()` — so the streak advanced *only if the player tapped today's circle*.
  Device-verified: an account with 248 recorded rounds showed **"0 gün seri"**. The streak
  is now what its name says: `initApp()` calls `checkIn()` on every launch, before any
  screen renders.
  Four things are load-bearing:
  1. **A gap RESETS the streak to 1** (owner decision). The old code did
     `count = Math.max(1, count - 1)` — "go back one day instead of reset" — which meant
     the number never answered "how many consecutive days", so it measured nothing.
     100 consecutive opens now reads 100; miss one day and the next open reads 1.
  2. **The daily diamond reward moved to its OWN field, `rewardDate`.** It had to: streak
     and reward shared `lastDate`, so once check-in became automatic the app would mark
     the reward claimed the instant it launched and the player could never collect it.
     `checkIn()` migrates old records (`rewardDate = lastDate || null`) **before** touching
     `lastDate` — do it after and every upgrading player loses one day's reward.
     **The `|| null` is not defensive noise:** without it a *fresh* record leaves
     `rewardDate` undefined forever, the reader falls back to `lastDate` (= today), and a
     brand-new player is told they already claimed. That exact bug was caught on device,
     not in the harness. `rewardClaimedToday()` therefore reads `rewardDate` **only** and
     never falls back.
  3. **Streak milestones (7/14/30 → 50/100/200💎) moved from `claimDailyReward()` into
     `checkIn()`**, and their amounts moved into `EconomyConfig.STREAK_MILESTONES` (they
     were bare literals, against the "every economy number in EconomyConfig" rule). Keying
     them on `streak === 7` inside the claim path was correct only while the streak *was*
     the claim; with check-in automatic they would have paid only if the player happened to
     collect the reward on exactly that day. They are paid with `add()`, not `addReward()`
     — Plus's +50% is for ad/daily-reward earnings, not for the player's own consistency.
  4. **The week row's mark comes from ONE question: was that day entered?** Entered → ★,
     not entered → **empty** and dimmed. The old row had three different marks and drew a
     *day number* on days that were never entered, i.e. it showed something for nothing.
  Streak badges now go 7 / 30 / 50 / 100 / 250 / 500 (owner request), all reading the same
  `ph_streak` counter — no new tracking.
  **Their rewards were set by EXTRAPOLATING THE OWNER'S OWN SCALE, not invented.** The
  pre-existing 7→20 and 30→50 already say "about a month of loyalty ≈ 50💎"; the four new
  ones continue that line (60 / 75 / 100 / 150) instead of doubling. A first attempt used
  75/150/300/600 and the owner rejected it as too generous — correctly: the 500-day badge
  alone (600💎) beat the shop's "Popüler" pack (550💎), and the four together handed out
  more than twice a paid mid-tier pack for free. **The test to apply when adding any badge:
  the WHOLE badge pool (now 500💎) must stay a small multiple of the cheapest pack (100💎)
  and must never substitute for buying one.** The streak *milestones* (7/14/30 → 50/100/200,
  350💎 total) were deliberately left untouched by the same owner decision — they predate
  this change. **`Badges.total()` is 9, not 5**, and the badge-id
  list is hardcoded in **six** harnesses (`badges-test`, `daily-quests-test`, `iap-test`,
  `interstitial-test`, `ad-consent-test`, `ad-release-test` siblings) — adding a badge fails
  them until updated, which is the point.
  **Harness trap worth knowing:** `makeSandbox()` evaluates `app.js`, which runs the
  `initApp` IIFE — so the boot-time `checkIn()` (and any milestone it pays) has *already
  happened* by the time a test takes its "before" reading. Measure against the known
  starting balance, not a before/after delta.
- **The palette lives in THREE `:root` blocks and they do NOT talk to each other.**
  `style.css` owns the **legacy app shell** tokens — `--bg-body`, `--accent`, `--text`,
  `--radius-*` — still consumed by Plus, Shop, the game header and the avatar picker.
  `core/ui-shell.css` owns the **redesigned shell** via `--sly-*` (Home / Discover chrome /
  Rozetler / Profile-Ayarlar / bottom nav).
  `core/design-tokens.css` owns **games and shared components** via `--ph-*` (143 uses in
  `components.css`, 308 in `games.js`). `style.css` reads **zero** `--ph-*` tokens.
  Practical consequence: editing one file changes exactly half the app. The 2026-07-28
  theme refresh deliberately touched **only the shell** — a game-wide repaint would also
  have to chase the colour literals baked into the Block Puzzle and Water Sort **canvas**
  renderers, which no CSS token can reach. That is a separate, much larger decision.
- **`--accent-rgb` must stay numerically identical to `--accent`.** Sixteen translucent
  brand fills in `style.css` are `rgba(var(--accent-rgb), …)`; `rgba()` cannot consume a
  hex token, so the triplet is the only way those follow the palette. Change one without
  the other and half the purple tints silently drift off-brand. Same reason
  `--accent-light` exists: `#c084fc` used to be hardcoded in four places.
- **Two colours are written in FIVE files and must be changed together:** `style.css`
  (`--bg-body` / `--accent`), `manifest.json` (`background_color` / `theme_color`),
  `index.html` (`meta theme-color`), `capacitor.config.json` (`android.backgroundColor`),
  `android/app/src/main/res/values/colors.xml` (`phBackground` / `phAccent` /
  `colorPrimary` / `colorPrimaryDark` / `colorAccent`). If they drift, the app shows the
  wrong colour for one frame while the native splash hands off to the web view.
- **The third tab is keyed `lider` but displays ROZETLER — this is intentional.**
  2026-07-28 replaced the tab's *content*, not its *key*, and 2026-08-10 replaced the
  content again (İLERLEME → Rozetler): `data-tab="lider"`, the screen id `#screen-lider`
  and `__phHandleBack`'s screen ordering all still say `lider`.
  Renaming the key means touching `switchTab` / `showScreen` / `__phHandleBack` at once,
  and there is no payoff until the leaderboard's fate is settled.
  **`renderLeaderboard()` and the `LEADERBOARD` array are NOT dead code — do not delete
  them.** They have zero call sites on purpose; where that data goes (under Profile, or
  gone entirely) is undecided. Their containers still exist in `index.html` inside a
  hidden `#lider-legacy`, so restoring the screen is: drop the `display:none`, call the
  function. Deleting either half breaks that.
- **MOSTLY REVERSED 2026-08-10 — the shell redesign removed almost every placeholder
  named in the next bullet.** Read this first; what survives there is now a short list.
  Removed and replaced with real data: the "Oyun Denedi 10/10" tile (`gh_plays_*` only
  counts Discover launches, so the total was wrong), the "%72 Koleksiyon" tile (no such
  system), and the three `ACHIEVEMENT_CARDS` per-game achievement bars. The array is
  **kept but no longer rendered**, same rule as `renderLeaderboard()` — it is the raw
  material for real per-game badges later.
  **`PlayerLevel` is the one number that is derived rather than deleted.** The reference
  design has a "Seviye" card and the two honest options were a placeholder or a
  derivation; it is `floor(totalGamesWon / 5) + 1`, read from the `GameEvents` counter
  that already exists. **No new storage key was written** — a second record of the same
  truth is exactly what `DailyQuests`' third quest avoids. The curve is deliberately flat:
  an escalating one is an economy number, and economy numbers are the owner's call (§7).
  **The "⭐ 50 XP" label was DELETED on 2026-08-12 (owner decision, pre-launch).** It was the
  last placeholder that *promised* something rather than merely showing a number: no XP
  economy was ever built, so the card advertised a reward the app could not pay. It was
  removed rather than replaced with a diamond figure — the daily challenge is already paid
  through `DailyQuests`' "günlük meydan okumayı tamamla" quest, and announcing it twice would
  either double-count or invent a second number. `.dc-reward` in `style.css` went with it (it
  had exactly one consumer).
  Still placeholder, still carrying `TODO:`: "Profil Çerçevesi" (labelled "Yakında", so it
  promises nothing) and the profile name "Oyuncu".
- **Home / İlerleme / Profil carry STATIC PLACEHOLDER numbers on purpose (2026-07-29).**
  These three screens were rebuilt to match the owner's design mockup one-for-one, and the
  mockup shows values for systems that do not exist yet: a collection percentage, per-game
  achievement chips, the "Oyun Denedi" tile, the weekly-reward claim, the "⭐ 50 XP" label
  and the profile title. They render as written in the mockup. (**Two groups left this list
  on 2026-08-01**: the daily-mission bars — see `DailyQuests` — and everything
  badge-related, i.e. the "Rozet" tile, "Son Kazanılan Rozetler" and the Profil showcase —
  see `Badges`. The *weekly* chest is still decorative.) This is an **explicit owner decision for a pre-launch dev build**
  with no live users — the earlier "never show a number you can't back" rule was suspended
  for these screens, not forgotten. **Every placeholder carries a `TODO:` comment naming
  the system that will replace it** — grep `TODO:` in `core/app.js`, `core/daily.js` and
  `index.html` before assuming a value is real. Do not delete those comments; they are the
  only marker separating real data from mockup data.
  What IS real on these screens: the 7-day streak row and the header streak chip
  (`StreakSystem`), the daily-challenge card including its **mini board preview, which is
  generated from the actual daily seed** (`core/daily.js` `previewFor`), and the favourites
  grid (`gh_fav`).
  The traps that made the old rule necessary still stand, so read them before wiring any of
  it to real data: (1) `gh_plays_*` is incremented **only** by `reels.js` when a game starts
  from the Discover feed, so a "games played" total silently undercounts everything launched
  from Home; (2) each game's `LEVELS.length` is closed over inside its IIFE, so a level
  progress bar has no honest denominator; (3) `phHighScore('arrowPuzzle')` is only ever
  *read*, never written, so Arrow would show 0 forever.
- **`previewFor()` in `core/daily.js` must keep its cache and its `try/catch`.** It runs the
  real Sudoku generator to draw the mini board, so without the per-seed cache every home
  render pays for a full puzzle generation, and without the `catch` a generator failure
  would blank the **entire home screen** instead of falling back to an emoji tile.
- **The avatar has ONE source: `AvatarSystem` (`ph_avatar`, default 🦊).** It used to be a
  hardcoded emoji in three unrelated places that silently drifted apart. Any element with
  the `data-ph-avatar` attribute is filled from it — that attribute is the whole contract,
  so new avatar spots need no new code. Anything that rebuilds avatar markup via
  `innerHTML` must call `AvatarSystem.updateUI()` afterwards (`renderProgress` does).
- **SUPERSEDED 2026-08-10 — PLUS and the diamond wallet are back in the home header (see
  the redesign bullet above). The Profile rows below still exist and are still required.**
- **The PLUS badge and the diamond display are gone from the home header — they moved, they
  were not removed.** The mockup's header is logo + streak + avatar only, but those two
  elements were the **only** entry points to the Plus page and the diamond shop, so both now
  live as rows in the Profile settings list (`SETTINGS` in `app.js`, entries with `fn`).
  Delete those rows and two whole screens become unreachable. `PlusSystem.updateUI()` still
  looks for `#plus-badge` and is null-guarded, which is why nothing crashes.
  Same story on Home: the random-game button and the rewarded-ad tile are not in the mockup
  and are no longer rendered, so `playRandomGame()` has no home-screen caller (the ad flow is
  still reachable from the shop and the game-over screen).
- **REVERSED 2026-08-07 — the daily ad budget now limits DIAMONDS ONLY.** Read this before
  the shared-pool bullet below; that bullet describes the old design and its reasoning is no
  longer in force. Owner decision, and the reason it failed in practice: utility actions
  (continue, restart, previous level, shuffle, hint, undo, 2× score) drained the same pool,
  so a player who never wanted diamonds could still find the game unadvanceable by
  mid-afternoon. A rewarded ad the player *chooses* to watch in exchange for a convenience
  costs nothing to allow — the only thing worth capping is the **free-diamond tap**, because
  that is the only one that moves the economy.
  Three things are load-bearing:
  1. **`runRewardedAction(reward, onReward, opts)` — the default still consumes.** Utility
     call sites opt out with `{ skipDailyLimit: true }`. The direction is deliberate:
     forgetting the flag on a new *diamond* action would silently create unlimited free
     diamonds, while forgetting it on a utility action merely imposes a needless limit. The
     cheap side to be wrong on is the default. `ad-release-test.js` §3.6 asserts both
     directions, including that `watchAdForDiamonds` has **no** flag.
  2. **The UI had to stop advertising the limit.** The game-over continue and 2× buttons no
     longer print `(3/8)` and no longer disable at zero — leaving that in would have greyed
     out a button that actually works, which is worse than the old behaviour. Same for the
     shared `offerRewardChoice` modal.
  3. **`preload()` lost its `AdBudget` check.** With the check in place the budget kept
     exerting its influence through *latency*: utility ads still worked at zero budget but
     each one paid the full ~4 s load. Also, a completed ad now triggers `preloadNext()`, so
     back-to-back utility actions stay fast — measured on device at **149 ms** with an
     exhausted budget, and `_ready` true again immediately after the ad closed.
- **The economy has ONE daily ad budget and it is the load-bearing rule (2026-07-30) —
  SUPERSEDED, see the bullet directly above.**
  `AdBudget` (`ph_ad_budget`, 8/day from `EconomyConfig.AD_DAILY_LIMIT` — was 3 from the
  system's first commit until 2026-08-02, never 5) is a **single shared
  pool** for all five rewarded actions — diamonds, continue, hint, undo, 2x score. There are
  deliberately **no per-action counters**: spending the budget on diamonds is what makes
  saving diamonds matter, because continue then costs diamonds or nothing. Its daily reset
  copies `StreakSystem.checkIn()`'s `toDateString()` comparison **on purpose** — two
  different definitions of "day" would desync at midnight and only show up as a bug hours
  later.
  Three rules that must not be re-scattered:
  1. **`runRewardedAction()` is the only entry point.** It owns all three cases (Plus → no ad
     at all, budget 0 → refuse, otherwise → ad, then `consume()` inside `onComplete`).
     `RewardedAd.showForDiamonds/showForContinue` were **deleted** for exactly this reason:
     they wrapped `show()` directly and were therefore budget-free side doors. Never add a
     call to `RewardedAd.show()` outside `runRewardedAction`.
  2. **`consume()` fires on completion, not on open** — a player who dismisses an ad keeps
     the credit.
  3. **Every ad-triggering surface shows the remaining count** (`data-ph-ad-budget` for the
     sentence, `data-ph-ad-budget-short` for in-game badges — same contract as
     `data-ph-avatar`) and goes *disabled, not hidden*, at zero. Hiding says "no such
     option"; a greyed row says "come back tomorrow", which is the message that brings the
     player back.
- **Plus benefits are now REAL code, and the Plus page's text is a claim the code must
  back.** `isActive()` used to have exactly one caller (the badge). Now: ads skipped and
  budget bypassed (`runRewardedAction`), continue free and instant, `+20💎/day` on top of
  `DAILY_REWARD_TABLE` in `claimDailyReward()`, and a **+50% multiplier that lives in
  `DiamondSystem.addReward()` only** — `add()` stays unmultiplied so the level-complete `+3`
  is untouched (a subscription must not accelerate in-game progression). The daily `+20` is
  paid with `add()`, not `addReward()`, or the Plus bonus would be multiplied by the Plus
  multiplier. "Erken Erişim" was **removed** (it manufactured value by delaying everyone
  else); "Özel Görevler" was removed too, because no mission system exists.
- **Every economy number lives in `EconomyConfig` at the top of `core/app.js`.** games.js
  reads it through the `econ(key, fallback)` helper **at call time, never at module scope** —
  load order is games.js → … → app.js, so a top-level `const X = EconomyConfig.Y` throws.
  The fallback is not defensive noise: `tools/level-metrics.js` loads games.js alone in a vm
  sandbox where no shell exists.
- **`offerRewardChoice()` (app.js) is the shared "ad or diamonds?" modal, and 2048's own
  copy was deleted.** The `.g2-buy*` styles are gone with it; the shared markup is
  `.ph-offer*` in `components.css`. This is not tidying: two independently-written offer
  windows are how "UI says there is a limit, code shows unlimited" happened in the first place —
  the budget/Plus rules must exist in exactly one place.
  Arrow's hint now costs **10💎 or one ad** (it used to be ad-only, which meant an exhausted
  budget also killed hints). Score-2x is the **one deliberate exception with no diamond
  path**: score is earned, not bought.
- **All 12 games report through ONE event gate: `GameEvents` (`core/app.js`, 2026-07-31).**
  This is the foundation the mission and achievement systems will sit on; phase 1 emits
  events and keeps counters, and deliberately contains **no mission logic, no badge logic
  and no reward payout**. Games call it through the `gameEvent(name, payload)` helper in
  `games.js` — same call-time lookup and same two reasons as `econ()` (app.js loads last;
  `tools/*.js` run games.js in a shell-less vm), plus a `try/catch` so a listener's bug can
  never take a game down.
  **Why two events are enough.** There is no `game_won`/`game_lost` pair — one `game_ended`
  carries `result: 'won'|'lost'|'quit'`. The reason is games with **no lose state**: Water
  Sort's tubes never jammed, so it emitted `'won'` only, and Block Puzzle is the mirror image
  (endless, so `'lost'` only). With separate events those games would look half-integrated,
  and every game plus every subscriber would have to reason about both. `'quit'` is the same
  field's third value rather than a third event — leaving is also a way to end.
  **Water Sort is no longer in that list (2026-08-01):** the move limit added a deliberate
  lose state, so it now emits both `'won'` and `'lost'`. The one-event design is what made
  that a two-line change instead of a migration — nothing else had to learn a new event.
  `game-events-test.js` pinned the old "only `'won'`" claim and broke on this change, which
  is exactly why that assertion exists; it was updated with the reason, not deleted.
  **A round is a LEVEL, not a session.** In the level-based games (Water Sort, Screw, Arrow,
  Jigsaw) the injection point is `loadLevel`/`startLevel`, not `init` — because level
  completion emits `game_ended('won')`, and if the level *start* didn't emit too, Water Sort
  would accumulate 1 start against 40 wins and every derived metric (win rate above all)
  would be nonsense. `init` reaches those functions anyway, so one injection covers both
  paths.
  Three invariants; break one and the counters lie:
  1. **At most one open round.** A `game_started` arriving while a round is open closes the
     old one as `'quit'` first. That self-healing is what lets in-game restart buttons
     (Jigsaw's ↻ / size buttons, Sudoku's difficulty switch) work without being wired
     individually.
  2. **`game_ended` with no open round does not touch the counters** (it still reaches
     listeners, flagged `stray`, plus a `console.warn`). This is the only thing guaranteeing
     `totalGamesWon <= totalGamesStarted`.
  3. **"Continue after an ad" reopens the round, it does not start a new one.**
     `_runGameOverContinuation` calls `GameEvents.reopen()` — the player played one round,
     not two, and the preserved `startedAt` keeps `durationMs` honest.
  `durationMs` is derived centrally from the open round; a game may override it when its own
  timer is the more meaningful number (Sudoku, Maze, Jigsaw do). `score` is optional and
  deliberately absent where the game has no score concept (Arrow, Jigsaw) — an invented
  number would be worse than a missing field.
  Counters live in `ph_game_stats` (`totalGamesStarted`, `totalGamesWon`, `perGame`).
  **`forGame()` also carries `streak` / `bestStreak` / `bestMs` / `bestScore` (2026-08-07).**
  Endless games (Jigsaw, Water Sort, Arrow) cannot answer "how far have I got" with
  started/won alone. `_record()` derives all four from the `game_ended` payload and **names
  no game** — same discipline as `DailyQuests` and `Badges`, so adding a game needs no edit
  there. A game that sends no `score` or `durationMs` simply never earns that field; an
  invented number would be worse than a missing one. The streak increments on `'won'` and
  resets on **every** other result — `'lost'` and `'quit'` both break "consecutive
  completions" by definition — while `bestStreak` never decreases. Invariant 3 applies here
  too: a stray `game_ended` must not inflate the streak, which is why `_record` runs only
  when the round was open.
  `DailyQuests` and `Badges` (both 2026-08-01) are the real subscribers, and the İlerleme
  screen now reads the badge counters. `totalGamesStarted`/`totalGamesWon` themselves are
  still not displayed anywhere — that is a later decision, not an oversight.
- **`DailyQuests` (`core/app.js`, 2026-08-01) is the THIRD daily-reset system and it copies
  the other two on purpose.** `ph_daily_quests`, `toDateString()` comparison, lazy reset —
  identical to `StreakSystem.checkIn()` and `AdBudget`. Three systems disagreeing about what
  "a day" is would desync at midnight and surface hours later as a bug nobody can reproduce.
  Four rules; break one and the quests either lie or leak diamonds:
  1. **No game-specific code, and the third quest is DERIVED, not counted.** "3 oyun oyna"
     and "1 oyun kazan" come from `GameEvents`; "günlük meydan okumayı tamamla" reads
     `DailyChallenge.state(id).doneToday`, which already exists. A second "was the daily
     solved" record would be the same truth stored twice, with nothing to say which copy
     wins when they drift. Consequence: this system names no game, so adding a game needs
     no edit here. The Node harness enforces it by scanning the block for game ids.
  2. **A quest round is a LEVEL** — the `GameEvents` definition, unchanged. Three Water Sort
     *levels* complete "3 oyun oyna". That follows from the counted unit; keeping a second
     definition just for quests is exactly what this avoids.
  3. **`settle()` is the only place that pays, and it is idempotent** (paid ids live in
     `paid[]`). It runs on every mission render, so a non-idempotent version would pay on
     every home visit. `renderMissions()` calls it *before* drawing — reversed, a newly
     finished quest would read "done" on screen while its reward waited for the next render.
  4. **The daily-challenge quest is paid on the HOME RENDER, not in the `game_ended`
     listener.** `DailyChallenge.complete()` runs *after* the event is emitted (games.js,
     sudoku), so at listener time `doneToday` is still false. `switchTab('home')` therefore
     calls `DailyQuests.refresh()` — which is also where the toast is actually visible,
     instead of under the game-over panel.
  Rewards are `EconomyConfig.QUEST_*` (10 + 15 + 10, +10 when all three land = **45💎**,
  the figure the shop already promised). They are paid with **`addReward()`**, so Plus's
  +50% applies — a quest reward is the same category as the daily reward. `add()` still
  means "no multiplier" and level-complete `+3` is untouched: a subscription must not
  accelerate in-game progression. The shop's "Günlük Görevler" row left `soon: true` in the
  same change and now reads its label and its `+45💎` **from the code** via
  `data-ph-quests` — same contract as `data-ph-avatar` / `data-ph-ad-budget`. **`DAILY_MISSIONS`
  is now a definition list, not display data**: it carries `id`/`total`/`reward`, and no
  `progress` field, because progress is computed. Its third entry was changed from "Kişisel
  rekorunu geliştir" to **"1 oyun kazan"** — the old one was not universal (Arrow and Jigsaw
  have no score at all, so those players could never advance it).
- **`tools/game-events-test.js` is the official validation tool for the event system.**
  Plain Node, zero dependencies, same vm+stub pattern as `level-metrics.js` but it also
  loads `app.js` (what is under test is the contract *between* the two files). Four layers:
  the GameEvents contract; a **source scan** of every `gameEvent(...)` call in games.js that
  proves each call's `gameId` matches the game it sits inside (the realistic failure is
  copy-paste, e.g. Block Puzzle emitting `'waterSort'`); a **live** pass that actually calls
  all 12 `init()`s and asserts exactly one `game_started`; and an end-to-end counter
  simulation. `--table` prints the file:line injection table. Run it after touching any
  game's start/end path.
- **`Badges` (`core/app.js`, 2026-08-01) is GameEvents' second subscriber and the same
  pattern again.** Five universal badges, all **derived from counters that already exist** —
  `ph_game_stats` (İlk Oyun, 10 Oyun), `ph_streak` (7/30 Gün Seri), `ph_diamonds_earned`
  (500 Elmas). No new tracking was written, and the block names no game, so adding a game
  needs no edit here. Rewards are `EconomyConfig.BADGE_*` (5+15+20+50+25 = **115💎**), paid
  through **`addReward()`** so Plus's +50% applies. Storage is `ph_badges`
  (`{earned:[{id, earnedAt}]}`), one-shot per id exactly like `DailyQuests`' `paid[]`.
  Four things are load-bearing:
  1. **Conditions are pure functions.** `test()` reads the live counter and has no side
     effects, so "is it earned?" is always recomputable. Triggers
     (`GameEvents.on`, `DiamondSystem.add`, `StreakSystem.checkIn`, plus one `check()` at
     boot) therefore exist for *speed*, not correctness — a missed trigger delays a badge,
     it never loses one.
  2. **`_checking` guards re-entrancy, and removing it hangs the app.** `check()` pays with
     `addReward()` → `add()` → which calls `Badges.check()` again, because earning diamonds
     is itself a badge condition. The flag swallows the nested call; the outer `while` loop
     re-evaluates anyway, so a reward that unlocks another badge still lands.
  3. **`recent()` breaks ties on ARRAY INDEX, not just `earnedAt`.** Two badges can be
     earned in the same millisecond (one reward unlocking the next), and `earnedAt`
     comparison then returns 0 and leaves the order undefined — "most recently earned"
     showed the *oldest* badge. The `earned` array's order is already the earn order.
  4. **The celebration is a DOM layer with `pointer-events:none`**, queued so simultaneous
     unlocks don't stack. Deliberately stronger than the quest toast (a badge is one-shot
     and permanent), and the reward is passed to `addReward()` with **no `reason`** so the
     toast is suppressed — the overlay is the feedback, both at once is noise.
  UI is bound in four places: the İlerleme "Rozet" tile (`n/5`), "Son Kazanılan Rozetler"
  (real, with locked slots for the rest), the Profil showcase (top 3 **by reward**, no
  picker — auto is enough this phase), and the shop's "Başarımlar" row (`data-ph-badges`,
  same contract as `data-ph-quests`). `showAchievements()` no longer toasts; it navigates
  to İlerleme. **Badge tone classes are one family (`bdg-*`) used by both `.rb-badge` and
  `.pf-badge`** — the old `rb-*` / `pf-badge-*` tone pairs were deleted because two
  families let the same badge render in different colours on two screens.
  **Game-specific badges are deliberately NOT built** — separate, later work.
- **`DiamondSystem.earned()` / `ph_diamonds_earned` is lifetime-earned, and it is NOT the
  balance.** Incremented inside **`add()`**, never in `set()` — `set()` is also what
  `spend()` calls, so putting it there would count spending as earning. Guarded by
  `amount > 0` so the one invariant (never decreases) holds. A "500💎 earned" badge written
  against the balance would be revoked the moment the player spent it. The starting 100💎 is
  **not** counted retroactively: it wasn't earned, and older records genuinely have no
  history to reconstruct.
- **`tools/badges-test.js` validates the badge system, and the two reward harnesses must
  ISOLATE EACH OTHER.** Same four layers as the quest tool. The trap worth knowing: badges
  and quests are fed by the *same* game events and both pay diamonds, so a test that
  measures a balance delta sees the other system's payouts too. Adding badges broke 11
  quest-harness assertions on the first run for exactly this reason. Each tool now seeds the
  other system as already-settled (`ph_badges` fully earned in the quest tool,
  `ph_daily_quests` fully paid in the badge tool) so every diamond delta belongs to the
  system under test. Keep those seeds in sync when adding a quest or a badge — the quest
  tool asserts the isolation held, so it fails loudly rather than silently drifting.
- **`tools/daily-quests-test.js` validates the quest system; `tools/dom-sandbox.js` is the
  shared vm+stub harness it runs on.** Same four-layer shape as the event tool. Two notes:
  the sandbox's `getElementById` is **cached** (same id → same element) so rendered
  `innerHTML` can be asserted, which `game-events-test.js`'s own copy does not do — that
  copy was left alone deliberately, so migrating it is a separate, optional change. And the
  midnight fixture must age **both** `ph_daily_quests` *and* `ph_daily_v1`: there is one
  clock, so aging only the quest record tests a state that cannot occur (quests on a new
  day, daily puzzle still solved) and produces a false "reward paid twice" failure. That
  exact wrong fixture is what the tool's first run reported.
- **`tools/game-events-test.js` is the official validation tool for the event system.**
  Plain Node, zero dependencies, same vm+stub pattern as `level-metrics.js` but it also
  loads `app.js` (what is under test is the contract *between* the two files). Four layers:
  the GameEvents contract; a **source scan** of every `gameEvent(...)` call in games.js that
  proves each call's `gameId` matches the game it sits inside (the realistic failure is
  copy-paste, e.g. Block Puzzle emitting `'waterSort'`); a **live** pass that actually calls
  all 12 `init()`s and asserts exactly one `game_started`; and an end-to-end counter
  simulation. `--table` prints the file:line injection table. Run it after touching any
  game's start/end path.
- **The broken JPEG-named-`.png` icons are FIXED (2026-07-29).** `assets/icons/` now holds
  three real PNGs generated from `assets/logo.png`: `icon-192` and `icon-512`
  (`purpose: "any"`) plus a separate `icon-maskable-512` with safe-zone padding
  (`purpose: "maskable"`). They are written with `png({palette:true})` — 474 KB → 92 KB for
  the 512, which matters because all three sit in the service-worker precache and are
  re-downloaded on every `APP_VERSION` bump.
- **Icon/splash regeneration has a MANDATORY ORDER, and the tool fights you twice.**
  Full recipe with the measurements behind it: `assets/README.md`. The two traps:
  1. `npm run assets:android` regenerates its own splash images and **overwrites** the
     hand-prepared ones, so icons must be generated FIRST and the 10 splash files copied
     over the result SECOND. The tool's own splash uses a generic 1.5 aspect ratio that
     crops most of the composition on a real 2.222 phone screen.
  2. It also creates `drawable-night` / `drawable-{port,land}-night-*` / `-ldpi` folders
     that did not exist before. **A device in dark mode picks the `-night-` variant**, so
     the hand-made splash silently never appears — this actually happened on the test
     device (`ui_night_mode=2`). Those folders are deleted on purpose; the tool recreates
     them every run, so delete them again.
  It also silently reformats `AndroidManifest.xml` (whitespace and self-closing tags only,
  no functional change) — don't be alarmed by that diff.
- **The launch scene is a DOM layer; the plugin only HOLDS the icon phase. Both halves
  are load-bearing — measured on a Galaxy A51 / Android 13, not assumed.**
  Two independent things break on Android 12+, and knowing both is what makes the current
  design non-obvious:
  1. **No native full-screen splash.** Since API 31 the platform owns the launch screen —
     it centres the launcher icon and **ignores** `android:background="@drawable/splash"`.
     `@capacitor/splash-screen` does not escape this: its `showOnLaunch()` falls through to
     `androidx installSplashScreen` on API 31+ (`SplashScreen.java` →
     `showWithAndroid12API`). `launchShowDuration` 0 and 3000 were both tried; neither drew
     the scene.
  2. **The plugin's programmatic `show()` cannot draw it either.** In `showDialog()` the
     image is set as the *background* of a `LinearLayout` created with
     `LayoutParams(MATCH_PARENT, WRAP_CONTENT)` that has **no children** — height resolves
     to zero, so the background never paints. A full-screen custom `layoutName` was also
     tried (it reached the APK, no "Layout not found" warning) and the screen still stayed
     flat. logcat confirms `show` reaches native and returns no error.

  So the scene lives in **HTML** (`index.html` → `#ph-splash` +
  `assets/icons/splash-hero.jpg`), which renders reliably on every version, and the plugin
  is kept for exactly one job: `launchAutoHide: false` pins the system icon screen until we
  call `hide()`. The order matters — icon held → scene image actually **painted**
  (`Image.onload` + **double** `rAF`) → only then `hide()`. Without the plugin the icon
  would drop before the WebView paints and the player would see a flash of flat colour;
  that gap was the original "two disjointed screens" complaint. The double `rAF` is not
  superstition: `onload` means *decoded*, not *drawn* — release after one frame and the
  icon can lift before the scene paints. Tuning knobs: `PH_SPLASH_TARGET_MS`,
  `PH_SPLASH_MAX_MS`.
- **The splash stays up for a flat 6 s on EVERY launch — that is a deliberate product
  decision, not a slow boot.** `PH_SPLASH_TARGET_MS` (6000) is both the scene's duration and
  the exact length of the loading bar's 0→100 travel; real init measures ~586 ms, so the bar
  is *waiting on purpose*. There is intentionally **no** first-launch / relaunch distinction.
  Two properties are load-bearing if you touch the timing: (1) the duration is a **minimum**,
  not a fixed sleep — `maybeHide()` requires bar-complete **AND** `__phAppReady`, so on a slow
  device the bar parks at 100% instead of dropping the player onto a half-built home screen,
  which is why `__phAppReady` must also call `maybeHide()` (by then the rAF chain has ended);
  (2) `PH_SPLASH_MAX_MS` (7500) force-closes and **paints the bar to 100% first** — without
  that the scene would fade out at ~40% and a script error would look like a broken
  animation. The bar's ease-out exponent is **1.8, not the usual cubic**: cubic reaches 99%
  at 4.6 s and spends the last 1.4 s there, reading as frozen. Fill is animated with `width`
  rather than `transform: scaleX` on purpose — scaleX stretches the glow `box-shadow`
  horizontally and smears it.
  `values-v31/styles.xml` sets the icon phase's background to `@color/phBackground`; the
  default was black and produced a visible colour jump. The 10 density splash PNGs are kept
  for Android ≤11, where the legacy path still works, and they are **not free** — they take
  the debug APK from 5.3 MB to ~14 MB, weight modern devices carry without ever using it.
  Whether that trade stays is a product call.
- **`@capacitor/splash-screen` is the first Capacitor PLUGIN (2026-07-30) and must stay
  pinned to the v7 line.** npm resolves `@capacitor/splash-screen` to 8.x by default, which
  demands `@capacitor/core >= 8` and fails against this project's Capacitor 7. Install
  `@capacitor/splash-screen@^7` — do **not** reach for `--force`/`--legacy-peer-deps`, which
  would install a plugin mismatched with the runtime. Per §6 a plugin is a fresh decision
  each time; this one is approved, others are not covered by it.
- **Rewarded ads are REAL on native since 2026-08-02 — but only through test ad units.**
  `@capacitor-community/admob@^7` (7.2.0) is the third approved Capacitor plugin. **Pin the
  v7 line**: npm resolves the package to 8.x, which demands `@capacitor/core >= 8` against
  this project's Capacitor 7 — the exact trap already documented for `@capacitor/splash-screen`.
  Six things are load-bearing:
  1. **`runRewardedAction` was NOT touched.** The only thing that changed is the inside of
     `RewardedAd.show()`. Budget, Plus bypass and consume-on-completion still live in one
     place; that is why swapping the mock for a real SDK was a contained change.
  2. **The reward's single source of truth is the `Rewarded` event**, not `Dismissed`.
     `Dismissed` fires both when the player closes early *and* after a completed reward, so
     on its own it cannot answer "was this earned?". `onComplete` — and therefore
     `AdBudget.consume()` — runs only when `Rewarded` was seen first.
  3. **A failed ad grants nothing and consumes nothing, and must never fall back to the
     simulation.** Falling back would hand out rewards with no ad — a free-reward hole in
     production. The player gets a toast instead.
  4. **The web/PWA path keeps the simulation.** There is no ad SDK there and web is the
     primary development surface (§1); deleting the mock would make that surface untestable.
  5. **Access is `Capacitor.Plugins.AdMob`, and event names are raw strings.** No bundler
     (§1), so neither `import` nor the package's `RewardAdPluginEvents` enum is reachable at
     runtime — the strings are copied from the plugin's own enum file. Same pattern as the
     splash-screen plugin in `index.html`.
  6. **Real ad unit ids are now allowed in the repo, but only alongside `AD_TEST_DEVICES`
     — amended 2026-08-06.** The old rule was "test ids only, real ids at release"; it was
     the right rule while there was no safe way to hold a real id, and it expires the moment
     the app ships. The danger was never that the ids leak (an APK is unpackable — they are
     readable from any published build anyway); it is **developing against them**, because
     watching or tapping your own ad is invalid traffic and can suspend the AdMob account.
     Google's own mechanism for that is a test-device list, so that is what replaced the
     prohibition: hashes in `AD_TEST_DEVICES` reach
     `MobileAds.setRequestConfiguration().setTestDeviceIds(...)`, and a listed device is
     served **test ads even against a real unit id**. The hash is not secret and belongs in
     the repo.
     **The hash is per-SIGNING-KEY, not per-device — measured, not assumed (2026-08-07).**
     One Galaxy A51 produced **three different values**: `50CD4ED8…` under the debug key,
     `58A6B464…` under the release/upload key, and `88D815B2…` under a third-party-signed
     install that happened to be on the phone. So a protection verified in a debug build
     does **not** carry into the release APK — this was caught only because the release
     build was measured separately rather than assumed, and the first guess was wrong.
     Re-read the hash after any change of signing key; extra entries are harmless. UMP and
     the Ads SDK print the *same* hash as each other, so UMP's boot-time line is a usable
     proxy — but it is the same 32-hex format either way, which is exactly what makes it
     easy to paste one build's value and believe you are covered.
     **Play App Signing — CLOSED 2026-08-13.** Play re-signs with Google's key, so a build
     installed *from Play* reports its own hash. Measured on the first internal-testing
     install: **`88D815B2…` — the same value the 2026-08-07 note filed as "a third-party
     signed install that happened to be on the phone".** It was Play's signature all along;
     the earlier entry was a correct measurement with a wrong label. It is now in
     `AD_TEST_DEVICES`, so a Play-installed build on that phone is protected.
     Two practical notes from reading it: the hash came from **UMP's boot line**
     (`addTestDeviceHashedId`) rather than the Ads SDK's, because **Plus was active on the
     account and Plus suppresses ad loading entirely** — with no ad request there is no
     `Ads:` line to read. And triggering a *request* is enough; `playGame()`'s `preload()`
     makes one without ever rendering an ad, so no impression and no click is involved.
     **A wrong hash fails silently** — the SDK just serves real ads. The only proof is
     seeing `I/Ads: This request is sent from a test device.` in logcat; if instead you see
     `Use RequestConfiguration.Builder().setTestDeviceIds(…)`, the hash is wrong and the
     correct one is printed inside that very line. Note the request must actually be made:
     the line appears on the first *ad request*, not at boot.
     Four things are load-bearing:
     - **The id lives in THREE places that must agree**: `AD_IDS` (both units), the
       `APPLICATION_ID` meta-data in `AndroidManifest.xml`, and the same publisher
       (`pub-…`) across all three. A unit id from one publisher under another publisher's
       app id fails *silently* — the app runs, no error, ads simply never fill.
     - **`isTesting` must be `false`, and it does the opposite of what its name suggests.**
       The plugin's `AdViewIdHelper.getFinalAdId` **discards our `adId` and substitutes
       Google's demo unit** when `isTesting` is true on a non-test device. It was `true`
       here for months, which was harmless only because the ids were demo units too;
       leaving it on with real ids would serve demo ads to real players — zero revenue,
       and nothing in the UI would say so. Our own device is protected by
       `AD_TEST_DEVICES`, never by this flag.
     - **`testingDevices` is read only inside `initialize()`**, not per ad request
       (`AdMob.java` `setRequestConfiguration`, lines 200-203 / 252). One call covers every
       ad format, so breaking that wiring leaves rewarded *and* interstitial unprotected at
       once. `RewardedAd._ensureInit` is the single initialize and is already shared with
       `InterstitialAds`.
     - **`tools/ad-release-test.js` enforces it**: real ids with an empty `AD_TEST_DEVICES`
       fails the run, as does any `isTesting: true`, a publisher mismatch, or a missing
       privacy policy. Verified by simulation — the guard was made to fail before it was
       trusted. This is the assertion that had to move out of `interstitial-test.js`, whose
       "only test ids may be in the repo" check was updated (with its reasoning) rather
       than deleted.
  Cost: APK 15.28 → **22.27 MB** — the Google Mobile Ads SDK is ~7 MB, by far the largest
  single addition in the project. Device-verified: test ad shows (labelled "Test Reklamı"),
  reward lands only after completion (budget 3→2→1→0, +10💎 each), and at budget 0 no ad
  opens at all. **CDP gotcha:** the SDK spawns its own `googleads…sdk-core` DevTools
  targets, so `/json/list` returns several — pick the `localhost` one or tooling breaks.
- **`RewardedAd` keeps a `_pending` guard and a targeted `preload()` — both added 2026-08-07
  after a device bug report, and they fix two different things.** Measured on a Galaxy A51
  against the real ad unit: `prepareRewardVideoAd` → `Loaded` takes **3360 / 4352 / 4459 ms**,
  while showing an already-loaded ad takes **~125 ms**. So the whole delay is the load.
  1. **`_pending` is the correctness half.** `show()` had no in-flight guard (unlike
     `InterstitialAds._showing`), so during that ~4 s dead window every tap started a fresh
     request and several ads played back to back. The economic damage is the point: each
     completed ad calls `AdBudget.consume()`, so one "continue" intent ate 3-4 of the
     player's daily ad allowance — and on diamond-granting paths it paid out 3-4×. The guard
     lives in `show()`, **not** in `runRewardedAction`: the async window belongs to
     `RewardedAd`, and the Plus path never reaches it (`onReward` is called synchronously).
     A rejected tap costs nothing, because `consume()` is already inside `onComplete`.
     Both exit paths (`fail`, `finish`) must call `release()`; miss one and the player can
     never watch another ad — a silent, hard-to-diagnose lock. The web simulation clears it
     too, or the primary development surface (§1) locks after one ad.
  2. **`preload()` is the latency half, and WHERE it is triggered is the whole fix.** It
     took two attempts, both corrected by device reports rather than reasoning:
     - **`refreshGameOverOffers()` — wrong.** Looks like "the panel appeared" and isn't:
       `AdBudget.updateUI()` also calls it and `updateUI` runs at boot, so the chosen
       *targeted* strategy silently became *always-warm*. Caught by seeing `_ready:true`
       on a freshly launched device.
     - **`showGameOver()` — still wrong, and this is the instructive one.** The lead time
       it buys is only however long the player takes to tap, which is milliseconds: people
       hit "continue" the instant they lose. A lab measurement that waited for the preload
       first showed 144 ms and looked like success; the real device still felt broken.
     - **`playGame()` — right.** The lead time is a whole round, which dwarfs the load.
       Still targeted: the request only goes out for players actually in a game, i.e. the
       only ones who can be offered a rewarded ad (continue, hint, undo, 2× score).
       `showGameOver()`/`openShop()` keep a call as a cheap top-up (a no-op when `_ready`).
     Measured cold-start breakdown that forced this: consent 1 ms (already warm from boot),
     `initialize()` 393 ms, **ad load 6580 ms** — total ~7 s for the first ad, 3.4-4.5 s
     after. Result after moving the trigger: panel opens → immediate tap → **ad visible in
     334 ms**.
     `initialize()` is now also warmed at boot, right after `AdConsent.ensure()` resolves.
     That is **not** an ad request, so it does not violate the targeted-preload decision —
     it just stops a fixed 393 ms from landing on the player's first ad.
     A "⏳ Reklam yükleniyor…" disabled state covers the case the preload cannot win (a
     round short enough to end before the load finishes, e.g. Memory or Maze). The guard
     already stopped extra ads; the label is what stops the button from looking dead, which
     is what made players tap repeatedly in the first place.
  `preload()` is deliberately silent (the player asked for nothing, so a failure shows no
  toast) and self-guarding (it checks Plus and `AdBudget` itself, so call sites don't
  repeat those conditions). `_showNative` awaits an in-flight `_loading` before requesting,
  or a fast tap would waste the preload on a duplicate request.
  **Device-verified end to end:** four rapid taps → `KABUL, RED, RED, RED`, exactly one ad,
  budget consumed exactly once. `tools/ad-release-test.js` §3.5 pins all of it, including
  the assertion that `AdBudget.updateUI()` must **not** trigger a preload — that one exists
  because the mistake actually happened.
  **Reading device state races the SDK:** `Dismissed` and the reward callback arrive
  noticeably *after* the ad UI closes. A CDP read taken right after tapping ✕ shows
  `_pending:true` and an unchanged budget, which looks exactly like a stuck guard. Read
  again before concluding anything — this cost a wrong diagnosis.
- **Ad consent (UMP/GDPR) runs at boot and gates every ad — `AdConsent` in `core/app.js`
  (2026-08-02).** Serving ads to an EEA/UK user without a consent flow is a legal risk that
  is entirely separate from AdMob account suspension, which is why this landed immediately
  after the SDK rather than "later".
  Five things are load-bearing:
  1. **We never guess the region.** `requestConsentInfo()` runs Google's own logic and it
     decides whether a form is needed. Showing nothing outside the covered regions is the
     **correct** outcome, not a failure — device-verified: in Turkey the status comes back
     `NOT_REQUIRED`, `isConsentFormAvailable:false`, and no form appears.
  2. **`canRequestAds` defaults to NO when the info is missing.** If the plugin is absent,
     the network is down, or the call throws, we do not know the region — and requesting an
     ad then means possibly serving one to someone who needed to consent first. The cost of
     the safe default is one unshown ad.
  3. **Consent is awaited inside `RewardedAd._showNative`, before `initialize()`.** Boot
     kicks `AdConsent.ensure()` off and the ad path awaits the *same* promise, so the first
     ad request can never overtake consent. `runRewardedAction` was **not** touched — the
     gate still owns budget/Plus/consume, and it contains no consent logic.
  4. **"Do not consent" does not mean "no ads".** Device-verified with the EEA simulation:
     after refusing, the status is `OBTAINED` with `canRequestAds:true` and
     `privacyOptionsRequirementStatus:REQUIRED`, and the SDK stores
     `IABTCF_PurposeConsents=00000000000` with `IABTCF_gdprApplies=1` — i.e. it keeps
     serving **non-personalized** ads and transmits the refusal itself. We do not implement
     the NPA flag by hand; we verified the SDK does it.
  5. **The debug geography lives ONLY in `localStorage.ph_ump_debug`** (`{"geo":1,"ids":[…]}`),
     never in the repo — a hardcoded EEA simulation could ship. `debugGeography` is honoured
     only for device hashes registered in the same call, so a real user cannot trigger it.
     The hash is printed by the SDK: `logcat | grep TestDeviceHashedId`.
  The Profil settings list grows a **"🔒 Gizlilik Seçenekleri"** row only while
  `privacyOptionsRequirementStatus` is `REQUIRED` — in the EEA users must be able to change
  their choice later; elsewhere the row would open a form that does not exist.
  `tools/ad-consent-test.js` pins the logic (fake plugin injected into the sandbox): form
  shown only when required, ads blocked without consent, `initialize` never reached in that
  case, app still fully usable after a refusal, and a source scan proving the gate was not
  touched and consent is never assumed.
- **Interstitials exist since 2026-08-02 and their whole design is a frequency cap —
  `InterstitialAds` in `core/app.js`.** Unrelated to `AdBudget`: that one limits *how many
  rewards the player may ask for* (their choice), this one limits *how often we may
  interrupt* (not their choice). Wiring them to the same pool would let an unwanted ad eat a
  wanted reward — the player would lose a continue they never spent.
  **The two thresholds are 3 minutes AND 3 round-endings, and BOTH must be satisfied.**
  Unlike the Water Sort move limit, these numbers are **not measured in this repo** — they
  come from the owner's industry research, recorded here so nobody later mistakes them for
  in-project measurements or "tunes" them without the same basis. The stated reasoning: an
  interstitial cadence tighter than this is the classic D7-retention killer, and one axis
  alone fails in both directions — time-only means a fast player eats an ad every 3 minutes,
  rounds-only means three rounds of a short game (Memory, Maze) fit inside one minute. The
  AND is the whole mechanism.
  Seven things are load-bearing:
  1. **`maybeShow()` has exactly ONE call site and it is `exitGame()`.** The two hard
     prohibitions — never at boot/splash, never during play — are enforced *structurally* by
     that fact, not by a flag. A level ending mid-session emits `game_ended` and is only
     **counted**; Water Sort does not get an ad between levels.
  2. **Discover-launched sessions are exempt outright**, before the limits are even
     consulted. `exitGame` reads `_beforeGameScreen === 'screen-discover'` (already there for
     tab restoration) and passes `fromDiscover`. Discover is the fast-trial surface — cards
     opened and closed in seconds — and an ad there kills the flow the feed exists for.
     The exemption **does not reset the counters**: those rounds were really played and still
     count toward the next ordinary exit.
  3. **A completed rewarded ad resets the interstitial timer.** `noteRewardedShown()` sits
     inside `runRewardedAction`, next to `AdBudget.consume()` — the single bridge between the
     two systems. Without it, "take the reward → leave → get an ad immediately" would turn an
     ad the player *chose* into the justification for one they didn't.
  4. **Only the `Showed` event resets the counters.** `Dismissed` alone cannot mean "the
     player was interrupted" — the ad can close without ever appearing. Exactly the
     `Rewarded`-vs-`Dismissed` distinction already documented for the rewarded path.
  5. **A failed ad consumes nothing and says nothing.** Counters stand, the next exit retries.
     No toast either — that is the deliberate difference from the rewarded path, where the
     player was waiting for something and had to be told.
  6. **No daily reset, on purpose.** The `toDateString()` pattern shared by `StreakSystem` /
     `AdBudget` / `DailyQuests` would be wrong here: those hand out daily *allowances*, this
     is a rolling cap. `ph_interstitial` (`{rounds, lastShownAt}`) carries across days and
     sessions — a player who quit at 2 rounds must not have those rounds forgotten.
  7. **Plus never sees one**, the natural extension of the ad-free benefit.
  Implementation notes: `RewardedAd._ensureInit` is **reused** — `initialize()` is once per
  SDK, not per format, and a second init promise would start it twice. Consent is awaited
  through the same `AdConsent.ensure()` gate (UMP does not vary by ad format). Test ids only
  (`AD_IDS.interstitialAndroid`, `TODO(yayın)`), same account-suspension rule as the rewarded
  unit. Web/PWA keeps a simulated overlay for the same reason the rewarded one does.
  `tools/interstitial-test.js` pins all of it, including the assertions that encode the
  reasoning rather than the code: each axis must block *on its own*, the Discover exemption
  must not consume the counter, and `maybeShow` must still have exactly one call site.
- **Google Play SUBSCRIPTION product ids arrive COMPOSITE — `plus_monthly:basePlanId` — so
  `loadOfferings()` registers every package under its base id too (2026-08-12).** Without
  the alias, `priceFor('plus_monthly')` misses and the Plus page shows `—`.
  **The symptom is what makes this findable: diamond prices load while Plus prices don't.**
  Both screens use the *same* code path (`data-ph-price` → `priceFor` → one table), so a
  difference between them cannot be UI code — it has to be the table's **key**. One-time
  products (`diamonds_100`) keep a plain identifier; Play subscriptions live under base
  plans and RevenueCat returns the composite. Source is the package's own types:
  `SubscriptionOption.storeProductId` → *"This will be subId:basePlanId"*.
  Three things are load-bearing:
  1. **Price was the cosmetic half. `purchase()` reads the same table**, so Plus was
     silently returning `notFound` — the subscription could not be bought at all.
  2. **An exact match always wins; the alias only fills an empty slot** (`!table[base]`).
     Otherwise a subscription's base plan could silently overwrite a real product that
     happens to share the id.
  3. **`loadOfferings()` logs the identifiers it actually received**, once. A `—` has two
     possible causes that are fixed in different places — the product/base plan is missing
     or inactive in Play Console (package never arrives), or the id shape is unexpected
     (package arrives, key misses). That one line is the only thing that separates them on
     a device, and the release build has no WebView debugging to ask interactively.
  `iap-test.js` pins it, but only after the fixture was made honest: it emitted plain ids,
  so the harness could not have caught this. Same lesson as `configureReturnsString`
  directly below — **a mock is only as honest as the thing it imitates**. Verified by
  reverting the fix: 4 assertions fail, then pass.
  **CONFIRMED ON A REAL PLAY INSTALL (2026-08-13, Galaxy A51).** RevenueCat's product
  catalogue lists the subscriptions as **`plus_yearly:yearly` / `plus_monthly:monthly` /
  `plus_weekly:weekly`** — the base plans are literally named `yearly`/`monthly`/`weekly`.
  Same device, same store setup, only the app version differing: **1.68.0 → `—`,
  1.68.1 → ₺499,00 / ₺149,99 / ₺44,99**, with the derived "per-month + savings %" line
  computing correctly (499/12 ≈ ₺42, 72 % vs monthly).
  **Two diagnostic traps cost time here and are worth keeping:**
  1. **The JS `console.log` does NOT reach logcat** — this repo already documents that
     (`tools/cdp.js` exists for exactly that reason) and the `[RC] offerings:` line was
     added anyway on the assumption it would be greppable. It is not. What *did* answer the
     question was RevenueCat's **native** SDK log (`[Purchases]`), which logcat does carry.
     A release build has no WebView debugging, so on that surface the native log is the only
     channel.
  2. **Absence of an error line is not evidence of absence.** The native log showed
     `PRODUCT_NOT_FOUND` for the four `diamonds_*` (a harmless stray `subs`-type probe —
     they resolve fine as INAPP and their prices render) and **nothing at all** for
     `plus_*`. That silence was read as "the packages are missing from the offering"; it
     actually meant they resolved *without error*. The dashboard showed all seven packages
     present. Read the store's configuration directly before concluding anything from
     missing log lines.
- **Harness source scans MUST normalize line endings — use `readSrc()` from
  `tools/dom-sandbox.js`, never a bare `readFileSync` (2026-08-12).** The strongest layer in
  these tools is the source scan, and most of those assertions are **proximity** regexes
  ("this call appears within 900 characters of that one"). On Windows the working copy is
  CRLF, so every line counts one character more, and the same code that passes against the
  repo's bytes can fail against the file on disk.
  Measured: `badges-test`'s "StreakSystem.checkIn() triggers Badges.check()" spans **889
  characters with LF and 907 with CRLF** — against a 900 budget. The assertion was 11
  characters from failing and nobody knew, because the file happened to sit on disk with LF;
  a `git stash` round-trip re-checked it out as CRLF and flipped it. **A fresh `git clone` on
  Windows would have found the suite broken**, and the failure names a streak/badge wiring
  problem that does not exist — the worst kind, because it sends you into the wrong file.
  A source scan must measure **code**, not line-ending style.
- **`Billing.init()` must keep its `Promise.resolve(...)` wrapper, and `openShop()` must
  keep `showScreen` BEFORE `renderShop` (2026-08-07).** Two halves of one shipped bug that
  made the diamond shop completely unopenable on device — the row was tapped, nothing
  happened, and nothing was logged.
  1. **The raw bridge's `configure()` does not return a Promise.** The package's `.d.ts`
     declares `Promise<void>`, but we reach the plugin through
     `Capacitor.Plugins.Purchases` (§1: no bundler, so the wrapper class is unreachable) and
     there it returns a **string** — measured on a Galaxy A51 via CDP. A bare
     `p.configure(...).then` therefore threw a synchronous `TypeError`. Treat the `.d.ts` of
     any Capacitor plugin as describing the *wrapper*, not the bridge.
  2. **Order was what turned a contained error into a dead screen.** The throw climbed
     `init()` → `loadOfferings()` → `refreshPrices()` → `renderShop()` and killed
     `openShop()` before it ever reached `showScreen`. `showPlusPage()` does the opposite —
     screen first, prices after — which is exactly why Plus survived the same exception and
     the shop did not. That asymmetry is what made the bug findable; keep both functions
     screen-first. `refreshPrices()` also gained a `.catch` so a store outage cannot produce
     an unhandled rejection; prices still fall back to `—`, never to a stale number.
  **`iap-test.js` pins all three, and the fake plugin needed fixing first**: its `configure`
  returned a well-behaved Promise, so the harness was greener than reality and never saw
  the bug. `configureReturnsString: true` now reproduces the device. Verified by reverting
  the fix — the three assertions fail, then pass. A mock is only as honest as the thing it
  imitates.
- **Two things found on device 2026-08-07 that are NOT bugs in our code — do not "fix" them
  here.** Both surfaced while wiring the real ad units and both are resolved in the AdMob
  console, not the repo.
  1. **`requestConsentInfo` fails with `Publisher misconfiguration: … no form(s) configured
     for the input app ID`** until a privacy/GDPR message is published under AdMob →
     *Gizlilik ve mesajlaşma*. The consequence is total: `canRequestAds` goes false, so
     `AdConsent`'s safe default (rule 2) refuses **every** ad, and no ad request is ever
     made — logcat shows no `Ads:` lines at all, which reads exactly like a broken SDK
     integration. It is the gate working as designed. Verified with the real app id
     `ca-app-pub-5960894143182893~1883487916`.
  2. **`I/Ads: Invoke Firebase method getInstance error` at boot is expected.** The Mobile
     Ads SDK looks for the optional Firebase integration and this project deliberately has
     no Firebase (no `google-services.json` — see the Firebase note below). Harmless, and
     it is not a reason to add Firebase.
- **Firebase is deliberately NOT installed (decision 2026-08-07).** AdMob does not need it:
  the SDK only requires the `APPLICATION_ID` meta-data, proven by rewarded ads working on
  device with no `google-services.json` anywhere. Adding it would mean a fourth Capacitor
  plugin (§6 — a fresh decision each time, and the v7/v8 peer trap has now bitten three
  times) plus APK weight on an app with zero users to measure. The one real reason to
  revisit is linking AdMob↔Firebase for per-user revenue reporting; that can be added later
  with no migration.
- **`site/` is NOT part of the app — it is the source of the public URLs Google requires
  (2026-08-06).** `tools/build-www.js` uses an explicit whitelist, so nothing here reaches
  `www/` or the APK; that is why a new top-level folder was safe to add. It holds
  `slyswipe/gizlilik.html` (the privacy policy) and, once the publisher id is known,
  `app-ads.txt`.
  **The privacy policy is mandatory, and the reason is in the merged manifest, not ours.**
  The Google Mobile Ads SDK injects `com.google.android.gms.permission.AD_ID` (plus three
  `ACCESS_ADSERVICES_*`) at manifest-merge time — confirmed in
  `android/app/build/intermediates/merged_manifest/release/…`. So the app collects an
  advertising identifier even though `AndroidManifest.xml` only asks for `INTERNET`, and
  Play rejects a release with no policy URL and no Data Safety declaration.
  Two things are load-bearing:
  1. **It must be a GitHub Pages *user* site (`onur33360-dev.github.io`), not a project
     site.** `app-ads.txt` is only honoured at the **root** of the domain, and a project
     site puts everything under `/<repo>/`. The Play listing's "Website" field must name the
     same domain or AdMob's crawler looks for the file somewhere else and the verification
     fails silently.
  2. **The policy has to describe what the app actually does.** It currently names AdMob,
     Google Play Billing, RevenueCat, Google Fonts and Unsplash — that last one is easy to
     forget, and it is only there because Jigsaw fetches its remote image pool from
     `images.unsplash.com`. `ad-release-test.js` asserts all five are mentioned, so adding an
     SDK or a new network host fails the run until the policy is updated. Same rule as §9,
     enforced instead of remembered.
- **`EconomyConfig.AD_DAILY_LIMIT` went 3 → 8 on 2026-08-02.** Recorded because the value was
  misremembered as 5: `git log -S` shows the constant was added once (`0e68322`, the commit
  that created `EconomyConfig`) and never edited, so **it was 3 from birth and never 5**.
  Reason for the raise: five actions share one pool, so 3 left the player with no non-diamond
  option after two continues — at that size the pool stops being a choice and becomes a
  shortage. No text needed updating; every surface already reads `AdBudget.label()`.
- **In-app purchases run through RevenueCat since 2026-08-02 — real code, but not yet
  provable.** `@revenuecat/purchases-capacitor@^11` (11.3.2) is the fourth approved Capacitor
  plugin. **Pin the v11 line**: 12.x and 13.x demand `@capacitor/core >= 8` against this
  project's Capacitor 7 — the same trap already documented for `@capacitor/splash-screen` and
  `@capacitor-community/admob`, now seen three times, so assume it for the *next* plugin too.
  Access is `Capacitor.Plugins.Purchases` (`registerPlugin('Purchases')`), device-verified —
  no bundler involved, same pattern as AdMob.
  Seven things are load-bearing:
  1. **`PlusSystem.isActive()` stayed SYNCHRONOUS and that is the central decision.** It has
     14 call sites, four of them inside systems with synchronous contracts
     (`AdBudget.canWatch`, `InterstitialAds.canShow`, `DiamondSystem.addReward`,
     `runRewardedAction`). RevenueCat's entitlement API is async, so the shape is the one
     `AdConsent` already established: **async source, sync reader**. RevenueCat is the truth;
     `ph_plus` is its local snapshot, refreshed at boot, on purchase, on restore, and from
     `customerInfoUpdate`. Not one call site changed and no harness broke.
  2. **`_setFromStore(null)` does NOTHING, on purpose.** Missing information is not "no
     entitlement" — a subscriber on a plane would otherwise lose what they paid for. Only a
     *present* `customerInfo` with no active entitlement clears the snapshot.
  3. **When info IS present, the store wins over everything**, including a locally
     `activate()`d Plus. `activate()` survives only as the dev/test path (the four Node
     harnesses build their Premium scenarios with it) and is marked `source:'local'`.
  4. **No price is written anywhere in the repo.** `index.html` and `DIAMOND_PACKAGES` lost
     their price strings; `Billing.priceFor()` fills `[data-ph-price]` elements — same
     attribute contract as `data-ph-avatar` / `data-ph-ad-budget`. The yearly card's
     "per-month + savings %" line is **derived** from the two numeric prices, never written.
     When the store is unreachable the UI shows a neutral `—`, and **never falls back to an
     old hardcoded number**: showing a wrong price is worse than showing none, because the
     player assumes they will be charged what they see. `renderShop()` must call
     `refreshPrices()` after its `innerHTML` rebuild, exactly like `AvatarSystem.updateUI()`.
  5. **Diamond amounts stay in code; only prices come from the store.** The store is the
     source of truth for *price*, not for the *economy* — renaming a Play Console product
     must not move the game's diamond balance. `buyPackage()` grants with **`add()`, not
     `addReward()`**: Plus's +50% multiplier applies to *earned* rewards, never to purchased
     ones, or the same money would buy different amounts and the store's number would lie.
  6. **`RC_API_KEY_ANDROID` is public by design — the `AD_IDS` rule is INVERTED here.** A
     RevenueCat public SDK key is meant to ship inside the client and grants nothing on its
     own (validation happens on Google's servers), so the real key belongs in the repo. It is
     read through `Billing._apiKey()` rather than the constant directly, for the same reason
     `econ()` exists: a top-level constant cannot be substituted, and the whole purchase path
     would be untestable in the Node sandbox.
     **The real key landed 2026-08-03** (`goog_OTM…`). RevenueCat has a *second* key that is
     also called "the key" — `sk_…`, the REST **secret**, which grants full account control
     (grant entitlements, refund, delete customers). That one must never reach the client:
     an APK is publicly unpackable, so shipping it counts as a leak and forces a rotation.
     The two are confusable by copy-paste, so `iap-test.js` now asserts both directions —
     the constant matches `^goog_[A-Za-z0-9]+$`, and no `sk_…` appears in `core/app.js` or
     `index.html`.
  7. **The web path does NOT simulate purchases**, and this is the deliberate difference from
     ads. A fake rewarded ad costs nothing; a fake purchase is a free-Plus door. Web says
     "only in the app" and stops.
  **Play Billing cannot be tested with a sideloaded debug APK** — it requires the app
  published to a Play track, installed from Play, signed with the uploaded key, plus license
  test accounts. So no real purchase has ever run: product ids, offerings and the sandbox
  flow are **unverified** until Play Console setup + a signed AAB on internal testing.
  **Status 2026-08-03: the app is registered on Play Console, the key is in, and the first
  signed AAB is built — but not uploaded, and the 7 products do not exist yet.** With no
  products, `getOfferings()` returns nothing and every price renders `—`. That is the
  correct path, not a bug: `loadOfferings` guards it (`if (!off || !off.availablePackages)
  return null`) and the whole chain is `.catch`-wrapped.
  Everything else *was* device-verified (plugin reachable, prices render as `—` with no key,
  restore row present, and a store-shaped entitlement fed into `_setFromStore` correctly
  triggers every Plus benefit: budget bypass, interstitial suppression, theme unlock,
  `addReward` 10→15 while `add` stays 10). `tools/iap-test.js` pins the rest, including the
  source scan that fails if any currency-and-digit string reappears in `core/app.js` or
  `index.html`. License test account: `onur33360@gmail.com`.
- **A single `Uncaught TypeError: … reading 'triggerEvent'` in logcat at boot is PRE-EXISTING
  and not yours.** It fires before `rng.js`/`games.js`/`app.js` are even fetched, right after
  Capacitor logs `App paused → App stopped → Saving instance state!` — the native bridge
  dispatches an app-state event into a JS context that does not exist yet. Measured on both
  `am start` and `monkey` launches, and **reproduced at HEAD with the RevenueCat plugin
  removed entirely**, so it predates the purchase work. It is harmless (the app loads
  normally afterwards). Don't spend an hour attributing it to whichever plugin you just
  added — verify by building without it, which is how this was settled.
- **Background music is globally disabled** behind `MUSIC_DISABLED` in `games.js`'s `GameAudio`, and `#btn-music` in `index.html` is hidden. The synthesized pad/beat engine underneath is intact and deliberately untouched — the existing composition read as tense rather than calm, so silence is the stage-appropriate choice until a new music system is designed. Don't "fix" `startMusic()` returning early.

---

## 6. Development Philosophy & Coding Conventions

**Philosophy**
- Match effort to stage. Don't harden, generalize, or productionize a system (payments, ads, leaderboard, subscription validation) that is deliberately mocked right now, unless asked.
- Favor the existing pattern over inventing a new one. If a new game or feature fits the `PuzzleGames` / `injectStyle` / `GameAudio` conventions already in place, use them rather than starting a parallel pattern.
- No new frameworks, bundlers, or external runtime dependencies without an explicit decision. Zero-dependency is a choice here, not an oversight. Capacitor (2026-07-21) is the one approved exception and it is packaging-only — see §1. Adding a Capacitor *plugin* is a new decision each time, not covered by that approval.
- Simplicity over abstraction. Three similar small games beat one clever "generalized engine" built to anticipate hypothetical future games that don't exist yet.

**Audio policy (production)**

Synthesized Web Audio is **the default and stays the default for lightweight UI feedback** —
taps, toggles, navigation, toasts, small confirmations. It costs zero bytes, zero latency,
and zero licensing risk, and it is genuinely good enough for that job.

External audio assets **are permitted** for gameplay sounds, rewards, ambience, and special
effects — but only where they deliver a *measurable* quality improvement over what the
synthesizer can produce. "It might sound nicer" is not sufficient justification for adding a
network-fetched, license-encumbered file to a game that currently ships with none.

Every asset must clear all four bars, without exception:

1. **Commercial-use safe** — CC0 / Public Domain or an equivalent unrestricted license.
   Anything requiring a commercial license purchase is out unless separately approved.
2. **No attribution requirement** — CC-BY and similar are rejected. The app has nowhere
   natural to display credits, and an unsatisfied attribution clause is a license violation.
3. **Documented** — every file's source URL, license, and retrieval date recorded in
   `AUDIO_DESIGN.md`. An asset whose provenance can't be shown is treated as unlicensed.
4. **Approved before it lands** — the product owner approves the candidate list *before*
   any file enters the repository. Do not add audio assets speculatively.

Operationally: audio belongs in the `ph-media-*` cache bucket (runtime-cached on first use,
never precached — a cold start must not wait on sound files), and requests carrying a
`Range` header bypass the cache entirely (see `sw.js`).

**Conventions**
- UI strings and code comments: Turkish. Identifiers (variables, functions): English. This is the existing convention — keep it, don't "fix" it.
- Each game scopes its CSS with its own short class prefix (`sp2-`, `bp-`, `mz-`, etc.). New games pick a new, unique prefix and stay entirely inside it.
- Don't add new localStorage keys under the `gh_` prefix (legacy only). Until `DATA_AND_STORAGE.md` defines the go-forward convention, use one clear, documented prefix per system.

---

## 7. Working Agreements & AI Behavior During Development

- Propose before implementing anything non-trivial. Explain the plan, wait for approval, then act.
- Do not create or modify files unless explicitly asked to in that turn. Analysis and proposals are delivered as conversation text unless file creation is the actual request.
- Ask before destructive or scope-expanding actions: deleting code, changing stored data formats, adding dependencies, touching monetization/economy values.
- Keep changes scoped to exactly what was asked. Don't bundle unrelated cleanup, refactors, or "while I'm here" fixes into a requested change.
- Before treating something as a bug, check Section 5 — several apparent defects here are deliberate, stage-appropriate decisions.
- If a decision isn't yours to make (product direction, economy balance, UX tradeoffs), surface it as a question rather than picking an answer.

---

## 8. Current Priorities / What Not to Assume

**Canvas migration is COMPLETE (2026-07-28).** Block Puzzle and Water Sort both
render on canvas; Water Sort's DOM↔Canvas benchmark is recorded in
`docs/04_CANVAS_POLICY.md` (P90 150 ms → 40 ms). Water Sort's DOM renderer is
retained as **legacy reference code only** — not a development target: don't
optimise it, don't extend it, and don't treat its lack of upkeep as a defect.
Reopen the migration only for a critical regression.

**Development focus now (owner-set, in order):** 1. Theme/UI redesign ·
2. Release preparation · 3. Monetization · 4. Security · 5. Google Play launch
requirements · 6. New game development.

**Roadmap lives in `ROADMAP.md`** — read it for sprint history. It also carries
the sprint-closing rule (build → device test on the Galaxy A51 → commit → push).
The chain used to have a second Huawei Y6 pass; that device is **no longer used
for testing** and the step was dropped by owner decision on 2026-08-02 — its
absence in past sprints is a scope decision, not an open gap. Y6 *measurements*
already recorded in code comments stay valid. Note that ROADMAP's
thermal-measurement rule is superseded — see the thermal bullet in §5.
Beyond that:
- Mocked systems (ads, IAP, leaderboard, Plus validation) are correct-for-now. Don't silently "complete" or productionize them.
  **Amended 2026-07-30:** the *delivery* of ads/IAP is still mocked (the 3-second fake video,
  `buyPackage()`, `purchasePlus()`), but the **economy rules around them are now real** —
  daily ad budget, diamond prices, Plus benefits. Treat the two halves differently: don't
  build payment SDKs, but do keep the rules honest (see the economy bullets in §5).
- The remaining unbuilt Discover games are intentionally unbuilt. Building one is a real feature request, not a bug fix — confirm scope before starting. (`flowConnect` left this list on 2026-08-09; it was built as a requested feature, with the scope confirmed first.)
- Don't assume test coverage or a release process exists. `TESTING.md` and `RELEASE.md` are intentionally deferred until closer to launch.

---

## 9. Keeping This File Honest

When an architectural decision changes — a new pattern replaces an old one, a landmine gets resolved, a mocked system becomes real — update this file in the same change, not as a follow-up. If `CLAUDE.md` and the code ever disagree, the code is probably right and this file is stale: fix the file, don't just quietly work around the mismatch.

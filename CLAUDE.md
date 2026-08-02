# CLAUDE.md

Permanent instruction manual for everyone working on PuzzleHub — human or AI. Read this in full at the start of every session. It is dense on purpose: it points at deeper docs rather than repeating them.

---

## 1. Project Snapshot

PuzzleHub is a Turkish-language, mobile-first casual puzzle hub: a tab-based shell (Home / Discover / Progress / Profile) around 7 playable puzzle games, a TikTok-style infinite-scroll Discover feed, and the live-ops scaffolding of a mobile game (diamonds, streaks, ads, subscription) built on top.

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
| `VISION.md` | to be written | you need to know *why* PuzzleHub exists, not just what it is |
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
  gone by owner decision: PuzzleHub is optimised for real gameplay, not lab
  conditions, so if a device throttles during normal play that throttling is part
  of the player's experience and belongs in the number. Do **not** discard a
  throttled run and do **not** re-run to get cooler conditions. Do record
  `dumpsys thermalservice` (`mName=SKIN` / `mStatus`) at start and end next to
  every number, and report the **tail (P90/P95/P99)** — average FPS hides the
  dropped-frame clusters players actually feel. The one thing that still
  invalidates a run is *instrument* error, not device state: the in-app FPS
  overlay runs its own rAF loop and a `backdrop-filter`, so it must be off while
  measuring. See `docs/03_PERFORMANCE_RULES.md`.
- **A new game must be registered in four places:** `PUZZLE_GAMES` and `GAME_MAP` (`app.js`), `REEL_GAMES` and `GAME_NAME_MAP` (`reels.js`). Missing one makes a game playable-but-invisible, or visible-but-broken.
- **Shared event-listener cleanup:** `addEv`/`clearEvs` in `games.js` use one module-level `_listeners` array across all games. Safe under normal one-game-at-a-time navigation; don't assume it's safe if game lifecycles ever overlap.
- **Inconsistent localStorage prefixes** (`gh_`, `ph_`, and the bare `bp_hi`) are historical, not designed. Don't rename existing keys without a migration plan — that's `DATA_AND_STORAGE.md`'s job once it exists.
- **"GameHup" still appears in internal file headers and the `gh_` prefix family.** It's the old product name; PuzzleHub is current. Cosmetic debt, not a functional bug — don't mass-rename without being asked.
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
- **`waterSort`'s DOM renderer is still in `games.js` ON PURPOSE — do NOT delete it as dead code.**
  The unused DOM functions (`buildTubeEl`, `pourTransform`, `pourStream`, `drainSource`,
  `syncLiquidShade`, …) and the `.wsrt-tube` / `.wsrt-body` / `.wsrt-layer` CSS are the
  **visual parity reference** for the canvas migration: their comments carry the measured
  reasoning behind every effect (why the spill coefficient is 3.4, why the return curve is
  220 ms, why the seam sits on the bottom edge). Deleting them loses the spec while the
  migration is still open. Removal is the **last step of the migration**, gated on the
  checklist in `docs/04_CANVAS_POLICY.md` — of which step 3 (DOM vs Canvas benchmark) is
  **not yet done**. Same rule applies to any future migration.
- **`flowConnect` has a polished demo animation but no real game behind it.** Marked `playable:false` on purpose — a backlog item, not an oversight to quietly complete. (`waterSort` and `arrowPuzzle` were built earlier; `jigsawCard` is in progress, see below.)
- **`jigsawCard` (Resim Kaydır) tiles must stay exactly `100/N%` wide.** The image is split
  with `background-position` percentages divided by **N-1**, not N, and that math assumes the
  tile box is exactly one Nth of the board. Giving tiles a visual gap by shrinking the box
  breaks alignment — the gap comes from `border-radius`, and the win state removes it so the
  photo becomes seamless. Phases 1–3 (engine, image + level system, theme) are done; 4
  (polish) and 5 (content/scale) are not. Pool policy and the review page live in
  `docs/GAMES/SLIDING_PUZZLE.md` — **no image ships without being approved by eye**: of the
  first 49 candidates every one returned HTTP 200 and 7 still had to be cut.
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
- **The palette lives in TWO independent `:root` blocks and they do NOT talk to each other.**
  `style.css` owns the **app shell** (Home / Progress / Profile / Plus / Shop / tab bar /
  game header) via legacy tokens — `--bg-body`, `--accent`, `--text`, `--radius-*`.
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
- **The third tab is keyed `lider` but displays İLERLEME — this is intentional.**
  2026-07-28 replaced the tab's *content*, not its *key*: `data-tab="lider"`, the screen
  id `#screen-lider` and `__phHandleBack`'s screen ordering all still say `lider`.
  Renaming the key means touching `switchTab` / `showScreen` / `__phHandleBack` at once,
  and there is no payoff until the leaderboard's fate is settled.
  **`renderLeaderboard()` and the `LEADERBOARD` array are NOT dead code — do not delete
  them.** They have zero call sites on purpose; where that data goes (under Profile, or
  gone entirely) is undecided. Their containers still exist in `index.html` inside a
  hidden `#lider-legacy`, so restoring the screen is: drop the `display:none`, call the
  function. Deleting either half breaks that.
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
- **The PLUS badge and the diamond display are gone from the home header — they moved, they
  were not removed.** The mockup's header is logo + streak + avatar only, but those two
  elements were the **only** entry points to the Plus page and the diamond shop, so both now
  live as rows in the Profile settings list (`SETTINGS` in `app.js`, entries with `fn`).
  Delete those rows and two whole screens become unreachable. `PlusSystem.updateUI()` still
  looks for `#plus-badge` and is null-guarded, which is why nothing crashes.
  Same story on Home: the random-game button and the rewarded-ad tile are not in the mockup
  and are no longer rendered, so `playRandomGame()` has no home-screen caller (the ad flow is
  still reachable from the shop and the game-over screen).
- **The economy has ONE daily ad budget and it is the load-bearing rule (2026-07-30).**
  `AdBudget` (`ph_ad_budget`, 3/day from `EconomyConfig.AD_DAILY_LIMIT`) is a **single shared
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
- **All 10 games report through ONE event gate: `GameEvents` (`core/app.js`, 2026-07-31).**
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
  all 10 `init()`s and asserts exactly one `game_started`; and an end-to-end counter
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
  all 10 `init()`s and asserts exactly one `game_started`; and an end-to-end counter
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
  6. **Only Google's official TEST ids are in the repo** (`AD_IDS` in `core/app.js` and the
     `APPLICATION_ID` meta-data in `AndroidManifest.xml`). Developing against your own real
     units counts as invalid traffic and can get the AdMob account suspended, so this is a
     safety rule, not tidiness. Real ids go in at release, in those **two** places, as a
     separate final step.
  Cost: APK 15.28 → **22.27 MB** — the Google Mobile Ads SDK is ~7 MB, by far the largest
  single addition in the project. Device-verified: test ad shows (labelled "Test Reklamı"),
  reward lands only after completion (budget 3→2→1→0, +10💎 each), and at budget 0 no ad
  opens at all. **CDP gotcha:** the SDK spawns its own `googleads…sdk-core` DevTools
  targets, so `/json/list` returns several — pick the `localhost` one or tooling breaks.
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
the sprint-closing rule (build → device test → Y6 test → commit → push). Note
that its thermal-measurement rule is superseded — see the thermal bullet in §5.
Beyond that:
- Mocked systems (ads, IAP, leaderboard, Plus validation) are correct-for-now. Don't silently "complete" or productionize them.
  **Amended 2026-07-30:** the *delivery* of ads/IAP is still mocked (the 3-second fake video,
  `buyPackage()`, `purchasePlus()`), but the **economy rules around them are now real** —
  daily ad budget, diamond prices, Plus benefits. Treat the two halves differently: don't
  build payment SDKs, but do keep the rules honest (see the economy bullets in §5).
- The four unbuilt Discover games are intentionally unbuilt. Building one is a real feature request, not a bug fix — confirm scope before starting.
- Don't assume test coverage or a release process exists. `TESTING.md` and `RELEASE.md` are intentionally deferred until closer to launch.

---

## 9. Keeping This File Honest

When an architectural decision changes — a new pattern replaces an old one, a landmine gets resolved, a mocked system becomes real — update this file in the same change, not as a follow-up. If `CLAUDE.md` and the code ever disagree, the code is probably right and this file is stale: fix the file, don't just quietly work around the mismatch.

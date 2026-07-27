# CLAUDE.md

Permanent instruction manual for everyone working on PuzzleHub — human or AI. Read this in full at the start of every session. It is dense on purpose: it points at deeper docs rather than repeating them.

---

## 1. Project Snapshot

PuzzleHub is a Turkish-language, mobile-first casual puzzle hub: a tab-based shell (Home / Discover / Leaderboard / Profile) around 7 playable puzzle games, a TikTok-style infinite-scroll Discover feed, and the live-ops scaffolding of a mobile game (diamonds, streaks, ads, subscription) built on top.

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

**Never run `npx cap sync` directly** — it copies `www/` without regenerating it, so it
happily ships whatever stale snapshot is sitting there. Always go through `npm run sync`.

`tools/build-www.js` copies an explicit whitelist and **cross-checks it against
`SHELL_ASSETS` in `sw.js`**, failing the build if the two lists disagree. A file added to
the app but missed in one of the two lists is the hardest deployment bug in this project to
diagnose (the web build works, the APK opens to a blank screen), so the guard is
load-bearing — don't remove it when adding a file, update both lists.

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
- **Rendering is per-game, not global — and the renderer is chosen BEFORE implementation.** This is an architectural decision, not a later migration: lightweight games start on DOM, render-intensive games start on Canvas immediately (`docs/04_CANVAS_POLICY.md` is the authority). Most existing games render with DOM + CSS. `blockPuzzle` and `waterSort` render their boards and effects on **Canvas 2D** — see the canvas landmines in Section 5. The shell (Home / Discover / Leaderboard / Profile) always stays DOM. Migrating an *existing* DOM game to Canvas is a separate decision and still requires profiling that confirms a GPU/filter bottleneck plus owner approval.
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
- **Network-dependent content is a real gap in the packaged app.** Google Fonts and the
  sliding puzzle's Unsplash images are still fetched over the network, so a first launch
  with no connection shows fallback fonts and no puzzle image. This is the same behavior as
  today's PWA, so it isn't a regression — but "installed app" raises the expectation.
  Self-hosting the fonts and bundling a starter image set is deferred, not overlooked.
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
- **Measuring perf on a warm device invalidates the comparison.** Check
  `dumpsys thermalservice` (`mName=SKIN` / `mStatus`) before trusting numbers:
  status ≥ 1 means throttling and this project has already produced two
  contradictory readings that way. Always capture an **idle baseline in the same
  thermal state** and compare the delta, not the absolute.
- **A new game must be registered in four places:** `PUZZLE_GAMES` and `GAME_MAP` (`app.js`), `REEL_GAMES` and `GAME_NAME_MAP` (`reels.js`). Missing one makes a game playable-but-invisible, or visible-but-broken.
- **Shared event-listener cleanup:** `addEv`/`clearEvs` in `games.js` use one module-level `_listeners` array across all games. Safe under normal one-game-at-a-time navigation; don't assume it's safe if game lifecycles ever overlap.
- **Inconsistent localStorage prefixes** (`gh_`, `ph_`, and the bare `bp_hi`) are historical, not designed. Don't rename existing keys without a migration plan — that's `DATA_AND_STORAGE.md`'s job once it exists.
- **"GameHup" still appears in internal file headers and the `gh_` prefix family.** It's the old product name; PuzzleHub is current. Cosmetic debt, not a functional bug — don't mass-rename without being asked.
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

**Roadmap lives in `ROADMAP.md`** — read it for the active sprint and the canvas
migration status. It also carries the sprint-closing rule (build → device test →
Y6 test → commit → push) and the "never compare perf numbers on a warm device"
rule. Beyond that:
- Mocked systems (ads, IAP, leaderboard, Plus validation) are correct-for-now. Don't silently "complete" or productionize them.
- The four unbuilt Discover games are intentionally unbuilt. Building one is a real feature request, not a bug fix — confirm scope before starting.
- Don't assume test coverage or a release process exists. `TESTING.md` and `RELEASE.md` are intentionally deferred until closer to launch.

---

## 9. Keeping This File Honest

When an architectural decision changes — a new pattern replaces an old one, a landmine gets resolved, a mocked system becomes real — update this file in the same change, not as a follow-up. If `CLAUDE.md` and the code ever disagree, the code is probably right and this file is stale: fix the file, don't just quietly work around the mismatch.

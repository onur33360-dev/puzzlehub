# CLAUDE.md

Permanent instruction manual for everyone working on PuzzleHub — human or AI. Read this in full at the start of every session. It is dense on purpose: it points at deeper docs rather than repeating them.

---

## 1. Project Snapshot

PuzzleHub is a Turkish-language, mobile-first casual puzzle hub: a tab-based shell (Home / Discover / Leaderboard / Profile) around 7 playable puzzle games, a TikTok-style infinite-scroll Discover feed, and the live-ops scaffolding of a mobile game (diamonds, streaks, ads, subscription) built on top.

**Current stage: pre-launch prototype.** Ads, in-app payments, the leaderboard, and Plus-subscription validation are all intentionally mocked right now. That is a staging decision, not a defect — see Section 8 before "fixing" any of it.

**Tech stack: vanilla JavaScript, HTML, CSS. No build step. No framework. No bundler. No package manager.** Every file is served as-is. This is a deliberate choice to preserve, not a gap to close.

Full product vision lives in `VISION.md` (to be written). This section is a working summary only.

---

## 2. How to Run / Preview

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

---

## 3. Documentation Map

| Doc | Status | Read it when... |
|---|---|---|
| `CLAUDE.md` (this file) | written | every session, first |
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
| `ROADMAP.md` / `CHANGELOG.md` | to be written | figuring out what's next, or logging what shipped |

`TESTING.md` and `RELEASE.md` are deliberately deferred until closer to launch — don't assume either exists.

---

## 4. Architecture Cheat-Sheet

- **Screens:** `div.screen` siblings toggled via an `.active` class. No router. `showScreen()` / `switchTab()` in `app.js`.
- **Games:** `PuzzleGames` registry object. Each game is a self-contained IIFE exposing `{ init(container), cleanup() }`. Each injects its own scoped `<style>` at runtime via the shared `injectStyle(id, css)` helper.
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
- **A new game must be registered in four places:** `PUZZLE_GAMES` and `GAME_MAP` (`app.js`), `REEL_GAMES` and `GAME_NAME_MAP` (`reels.js`). Missing one makes a game playable-but-invisible, or visible-but-broken.
- **Shared event-listener cleanup:** `addEv`/`clearEvs` in `games.js` use one module-level `_listeners` array across all games. Safe under normal one-game-at-a-time navigation; don't assume it's safe if game lifecycles ever overlap.
- **Inconsistent localStorage prefixes** (`gh_`, `ph_`, and the bare `bp_hi`) are historical, not designed. Don't rename existing keys without a migration plan — that's `DATA_AND_STORAGE.md`'s job once it exists.
- **"GameHup" still appears in internal file headers and the `gh_` prefix family.** It's the old product name; PuzzleHub is current. Cosmetic debt, not a functional bug — don't mass-rename without being asked.
- **Two Discover-feed games** (`flowConnect`, `jigsawCard`) have polished demo animations but no real game behind them. They're marked `playable:false` on purpose — this is a backlog item, not an oversight to quietly complete. (`waterSort` and `arrowPuzzle` were the other two; both are now built and `playable:true`.)
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
- No new frameworks, bundlers, or external dependencies without an explicit decision. Zero-dependency is a choice here, not an oversight.
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

Roadmap lives in `ROADMAP.md` (to be written). Until then:
- Mocked systems (ads, IAP, leaderboard, Plus validation) are correct-for-now. Don't silently "complete" or productionize them.
- The four unbuilt Discover games are intentionally unbuilt. Building one is a real feature request, not a bug fix — confirm scope before starting.
- Don't assume test coverage or a release process exists. `TESTING.md` and `RELEASE.md` are intentionally deferred until closer to launch.

---

## 9. Keeping This File Honest

When an architectural decision changes — a new pattern replaces an old one, a landmine gets resolved, a mocked system becomes real — update this file in the same change, not as a follow-up. If `CLAUDE.md` and the code ever disagree, the code is probably right and this file is stale: fix the file, don't just quietly work around the mismatch.

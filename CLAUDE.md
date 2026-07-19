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

**Load-order dependency:** `index.html` loads `games.js → reels.js → app.js` sequentially via a custom `loadScript` chain, not `<script defer>`. This order is required: `app.js` depends on globals (`PuzzleGames`, `GameAudio`) defined in `games.js`, and on `ReelsEngine` defined in `reels.js`. If something in `app.js` can't find a global that "should" exist, check load order before assuming a bug.

**Caching is currently, deliberately, off.** `index.html` unregisters all service workers and deletes all caches on every load; `sw.js` strips fetch caching entirely; every script/style tag carries a live `?v=timestamp`. Net effect: the whole app re-downloads on every visit. This is flagged again in Section 5 — don't remove it without asking.

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
- **Audio:** one global `GameAudio` singleton (`games.js`) — fully synthesized via Web Audio API, no audio asset files — shared by the app shell and every game.
- **Discover feed:** `window.ReelsEngine` (`reels.js`) — infinite scroll, `IntersectionObserver`-driven active-card demo lifecycle (start/pause/destroy), DOM pruned past 24 cards.
- **State:** no state-management library. State lives in per-game closures plus `localStorage`. UI updates are imperative `innerHTML` template-string re-renders, not reactive/diffed.

Full detail belongs in `ARCHITECTURE.md` — this is the 30-second refresh, not the reference.

---

## 5. Known Landmines (Do Not "Fix" Silently)

- **Cache-nuking in `index.html` + `sw.js`** (Section 2). Looks like a bug; is almost certainly a deliberate workaround for a prior caching incident. Don't remove or "clean up" without checking first.
- **A new game must be registered in four places:** `PUZZLE_GAMES` and `GAME_MAP` (`app.js`), `REEL_GAMES` and `GAME_NAME_MAP` (`reels.js`). Missing one makes a game playable-but-invisible, or visible-but-broken.
- **Shared event-listener cleanup:** `addEv`/`clearEvs` in `games.js` use one module-level `_listeners` array across all games. Safe under normal one-game-at-a-time navigation; don't assume it's safe if game lifecycles ever overlap.
- **Inconsistent localStorage prefixes** (`gh_`, `ph_`, and the bare `bp_hi`) are historical, not designed. Don't rename existing keys without a migration plan — that's `DATA_AND_STORAGE.md`'s job once it exists.
- **"GameHup" still appears in internal file headers and the `gh_` prefix family.** It's the old product name; PuzzleHub is current. Cosmetic debt, not a functional bug — don't mass-rename without being asked.
- **Three Discover-feed games** (`arrowPuzzle`, `flowConnect`, `jigsawCard`) have polished demo animations but no real game behind them. They're marked `playable:false` on purpose — this is a backlog item, not an oversight to quietly complete. (`waterSort` was the fourth; it is now a fully built, `playable:true` game.)
- **Sudoku validates against the SOLUTION, not against Sudoku's rules.** A wrong digit is
  refused and costs one of 3 lives; it never lands on the board. This is deliberate — it is
  why there is no erase key and no undo, and it makes **unique-solution puzzles a functional
  requirement** (a multi-solution puzzle would punish a valid alternative answer). Verify
  uniqueness before adding any puzzle. Full rationale: `docs/GAMES/SUDOKU.md`.
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

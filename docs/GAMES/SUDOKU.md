# Sudoku — "Ancient Arcane"

Per-game specification. Per `DESIGN_SYSTEM.md` §24, this document covers only what is
**genuinely novel** about Sudoku. Anything it does not mention uses the platform system
unmodified: buttons are §14, motion tokens are §11, particles are §17, the night sky and
atmosphere are the shared `.ph-scene` + `phAtmosphere()` layer.

---

## 1. What makes this game different

Sudoku is the first PuzzleHub game that **refuses wrong input rather than recording it**,
and the first whose material is **light**. Both are deliberate departures, and both exist
to serve the same goal: this is a *modern mobile puzzle game*, not a faithful reproduction
of pencil-and-paper Sudoku.

---

## 2. The core rule: valid ≠ correct

Classic Sudoku accepts any digit that doesn't duplicate within its row, column, or box.
That rule has a trap, and the trap is real — it was measured, not theorized:

> On a fresh board, **one** rule-legal move (placing `1` where the solution wants `4`)
> made the puzzle **unsolvable**. At that moment, zero cells reported "no legal digit here",
> so the player received **no signal at all**. They would keep playing for twenty minutes
> and hit a wall with no way to know where they went wrong, and no undo history to walk back.

For a session-based mobile game with no undo, that is a broken experience. So Sudoku
validates against the **solution**, not against the rules:

```js
if (n !== solution[selected]) { rejectMove(cellEl, n); return; }
```

Row/column/box conflict is a strict subset of "wrong", so it is not checked separately.
The old `conflictAt()` helper was deleted rather than left dormant — two competing
definitions of "valid" in one file is how bugs get planted.

### Consequences that fall out of this

| Consequence | Why |
|---|---|
| **No clear/erase button** | Every digit on the board is correct by construction. There is nothing to erase. |
| **No undo** | Same reason. Undo exists to recover from mistakes that *landed*; none can. |
| **Placed digits are permanent** | Only empty cells are selectable. |
| **Puzzles MUST have a unique solution** | Non-negotiable — see §3. |

### §3 Uniqueness is a functional requirement

Validating against *a* stored solution means a multi-solution puzzle would punish a player
for entering a different, perfectly valid answer. Uniqueness is therefore not a style
preference — skipping it produces unfair life loss that looks like a random bug.

This is now guaranteed structurally: the generator (§3a) re-verifies uniqueness after
*every* cell removal and restores the cell if it fails. A puzzle that isn't unique cannot
be produced.

---

## 3a. Puzzle generator

Sudoku originally shipped three hardcoded puzzles — the fourth playthrough was a repeat.
Puzzles are now generated on demand, unlimited.

### Difficulty is defined by required technique, not clue count

Clue count is a weak proxy: a 30-clue puzzle can be easier than a 45-clue one. Instead,
cells are removed only while the puzzle *remains solvable* by a bounded set of human
techniques, implemented as a non-guessing logical solver:

| Rating | Technique needed |
|---|---|
| 1 | **naked single** — a cell with exactly one candidate |
| 2 | **hidden single** — a digit that fits only one cell in a unit |
| 3 | beyond both — advanced technique or search |

Each difficulty has a **ceiling** (preserved while digging) *and* a **floor** (required of
the finished puzzle):

| | ceiling | floor | min clues |
|---|---|---|---|
| Kolay | 1 | 1 | 40 |
| Orta | 2 | 2 | 32 |
| Zor | — | 3 | 30 |
| Uzman | — | 3 | 26 |
| Usta | — | 3 | 23 |

**The floor is what makes the ladder real, and it was added after measurement, not by
design instinct.** The first implementation had only a ceiling — and "solvable with at most
hidden singles" *includes* "solvable with naked singles alone," so easy puzzles leaked into
the harder tiers. Measured: 8 of 40 "Zor" puzzles were solvable with naked singles only, and
half of "Orta" was actually easy. The label was lying. With floors enforced, 150-puzzle
samples give 100% correct ratings for Kolay/Orta/Uzman/Usta and 98% for Zor.

If the floor isn't met, generation retries with a seed derived from the original (bounded at
24 attempts). The result reports `floorMet: false` rather than silently returning a
mislabeled puzzle. Zor is the tightest band (30 clues *and* must require advanced technique)
and averages ~6.5 attempts; every other tier averages under 2.5.

Zor/Uzman/Usta share floor 3 and are separated by clue count alone. That is an honest
limitation of a 3-tier rating: a finer ladder would need a fourth technique tier (locked
candidates / pointing pairs).

### Determinism

`generate(difficulty, seed)` — the same seed and difficulty always produce the identical
puzzle, including the retry chain (attempt seeds are derived from the original via a golden
ratio constant). Seed helpers live in `core/rng.js` and are deliberately game-agnostic.

**Daily Challenge is already supported**, no server required:

```js
PuzzleGames.sudoku.generate('medium', phDailySeed('sudoku'))
```

`phDailySeed(scope, date)` uses the **local** calendar date — with UTC, some regions would
see the daily puzzle change mid-day. The `scope` argument keeps different games from sharing
a seed on the same date.

Every generated puzzle carries its seed (`PuzzleGames.sudoku.seed`), so a reported problem
can be reproduced exactly rather than guessed at.

### Performance

Measured in-browser, median / max over 15 runs per tier: Kolay 0.4/2.5ms · Orta 0.8/3.3ms ·
Zor 3.6/12.3ms · Uzman 3.8/21.7ms · Usta 2.7/10.8ms. Generation is synchronous and well
under one frame at typical values, so no loading state is needed.

The solution counter uses 9-bit candidate masks and MRV (fewest-candidates-first) cell
selection. This is not premature optimization — plain sequential backtracking blows up
combinatorially on sparse boards, and it is what keeps Usta generation in milliseconds
rather than seconds.

---

## 4. Lives — why refusal isn't free

If wrong moves are simply blocked, the block becomes a free auto-assist and the puzzle
loses all tension: the player can brute-force by tapping every digit. Lives are what turn
*"I'm protecting you"* into *"this has a cost"*.

- 3 lives (`MAX_LIVES`), shown as hearts in the parchment cartouche above the board.
- **Every** wrong digit costs exactly one life — including a rule-violating one. One rule
  is easier to learn than two, and it matches modern mobile Sudoku convention.
- At zero: input is blocked (`dead` flag) and Game Over opens.

Lives live in `phLives()` (`core/ui-kit.js`), not in this game — see §7.

---

## 5. Rejection feedback — "the magic didn't take"

A refused move must be *legible as a refusal*, not as a dropped input. Five layers fire
together (all verified firing in-browser):

| Layer | Implementation |
|---|---|
| Shake | `phShake()` — also plays the `error` SFX and error haptic |
| Cell flash | `sdkReject` keyframes: crimson inset ring → settles back into the gold selection ring |
| **Ghost digit** | The attempted digit appears in the cell, burns crimson, and dissolves upward (`sdkBurn`) |
| Particles | `phParticleBurst(..., 'var(--sdk-err)', 9)` |
| Life | One heart dims with `ph-heart-loss` |

The ghost digit is the piece worth keeping if anything is ever cut: it shows the player
*what they tried*, which is what makes the refusal feel like a judgment rather than a
missed tap. The board is **not** re-rendered on rejection — the selection is preserved so
another digit can be tried immediately, and re-rendering would destroy the ghost mid-flight.

The cell flash deliberately **ends** on the gold selection ring rather than on the neutral
cell style, so the animation settles into the state the cell is actually in.

---

## 6. Material & scene

Sudoku's matter is **parchment** (`DESIGN_SYSTEM.md` §13), not stone. It was built on stone
first; that version measured **1.05:1** contrast on its given digits and was effectively
unreadable. Parchment brought the same digits to **10.99:1** (player digits 4.93:1).

The scene is layered so the shared universe stays shared:

```
#game-container.ph-scene.sdk-arcane   ← shared night sky (--ph-night-*)
 ├─ .ph-atmo                          ← shared: stars, beams, motes (phAtmosphere)
 ├─ .sdk-place                        ← THIS GAME'S PLACE: crescent + temple columns
 └─ .sdk-wrap
     ├─ .sdk-cartouche                ← mistakes counter + hearts
     ├─ .sdk-tablet                   ← parchment page, gold rules
     └─ .sdk-nums                     ← 1–9 (no erase key)
```

**Why columns and not mountains:** Water Sort's place is a moon over mountain ranges. If
Sudoku reused that vocabulary the two games would read as reskins of each other. The shared
layer carries the *sky*; each game supplies its own *place*. Sudoku's is architecture —
ruins and a smaller crescent, positioned differently.

The crescent is carved with `mask-image`, **not** by overlaying a dark circle. The sky is a
gradient, so no single "sky color" exists; a solid cut-out circle read as a dark smudge
beside the moon. The mask leaves real transparency and stars show through the crescent.

### Theme tokens are game-scoped on purpose

The `--sdk-*` palette lives in the game's own `injectStyle`, **not** in `design-tokens.css`.
A light theme belonging to one game should not sit in the platform token file. When the
"Tema Seç" feature ships, promote them then — not before.

---

## 7. What was extracted vs. kept local

| Went to the shared layer | Stayed in Sudoku |
|---|---|
| `phLives()` — counter, hearts, empty callback | Everything about *what* costs a life |
| `.ph-lives` / `.ph-heart` styles + keyframes | `--ph-heart-*` overrides for parchment |
| `showGameOver(..., { onContinue })` hook | What "continue" restores (one life) |

`phLives` is deliberately small — a counter, a heart strip, and an "it hit zero" callback.
Scoring, ads, diamonds, and the Game Over screen are **not** in it; those belong to the game
and the app shell. It works headless if `mount()` is never called.

The `onContinue` hook exists because `continueWithAd()` / `continueWithDiamonds()` knew how
to close the modal but had no way to tell the game what "continue" *means*. It is
single-use: cleared before invocation, and cleared again on restart/exit so a stale callback
can't grant a second life.

---

## 8. Scanning aids & rhythm

### Three-tier highlighting

Filled cells **are selectable** — this is load-bearing, not cosmetic. Tapping any cell
showing a 9 highlights every other 9 on the board, which is the core scanning technique of
modern mobile Sudoku ("where can this digit still go?"). Without selectable filled cells
that technique is impossible, and the board can only be read one cell at a time.

The tiers are deliberately different in both strength *and* hue so they never blur together:

| Tier | Look | Meaning |
|---|---|---|
| `peer` | lightest, warm gold | row / column / box of the selection |
| `samenum` | darker, neutral | every other cell holding the same digit |
| `sel` | strongest, gold ring | the selected cell |

CSS source order encodes the priority — all three have equal specificity.

Selecting a filled cell never lets it be overwritten (`placeNum` returns early on a
non-empty cell) and never costs a life. Verified by regression test.

After a correct placement the selection **stays on the placed cell**, so the digit's
siblings light up immediately — "where else is this digit?" gets answered for free, without
a second tap.

### Region completion — "a stone thrown into water"

Completing a row, column, or box fires a violet ripple. This is where the game's *rhythm*
lives: without it, a correct placement and a puzzle-advancing placement feel identical.

- Three concentric rings expand from the placed cell, staggered 140ms apart. One ring reads
  as "a circle grew"; three read as a water surface.
- The region's cells then pulse in sequence, delayed by **Chebyshev distance** from the
  origin, so the wave travels outward as a ring rather than sweeping left-to-right.
- Sound and haptics scale with the event: one region → `combo2`/`match`, two or more
  simultaneously → `combo3`/`combo3`.
- `phAtmosphereFlare()` fires **only** on multi-region completions. Triggering it on every
  region would kill the "something happened" feeling and leave a background that just
  flickers (see the note on that function in `ui-kit.js`).

Violet is the only cool color in the game's warm palette, and it is reserved exclusively for
this moment — spending it anywhere else would make the moment ordinary.

Ripples are emitted **after** `render()`, against fresh DOM; a re-render would wipe the
animation mid-flight.

### Exhausted digits disappear

A digit placed 9 times has its key **removed**, not dimmed — its absence is the signal, so
the player never counts occurrences. The key collapses its width over `--ph-duration-medium`
and the remaining keys expand to fill the gap; the collapse is animated because the keys
shift position and an instant jump would break muscle memory. The row has a fixed
`min-height` (the keys use explicit height, **not** `aspect-ratio`) — with `aspect-ratio` a
zero width collapses the height too and the whole row folds.

### Other

- **Dot in empty cells** — reads as "not yet written" rather than "blank".

---

## 8a. Difficulty selection

Five chips above the board (Kolay / Orta / Zor / Uzman / Usta). Selecting one saves the
preference to `ph_sudoku_difficulty` and starts a fresh puzzle — consistent with the fact
that Sudoku has no saved-game concept (restart already discards the board).

The selected chip is rendered in the **same parchment material as the board**, so the
current difficulty is legible from the material, not just from a color.

`PuzzleGames.sudoku.difficultyLabel` exposes the saved choice. Discover reads it through a
generic hook (`_liveDifficulty` in `reels.js`): a card uses the game's own label when the
module provides one, otherwise it falls back to the static `REEL_GAMES` string. This fixed a
real lie — the Sudoku card advertised **"Zor"** while the game always started on Easy. Any
future game with player-selectable difficulty participates the same way, with no
Sudoku-specific knowledge in `reels.js`.

---

## 8b. Daily Challenge

Sudoku is the first consumer of the **platform** daily framework (`core/daily.js`), not the
owner of it. Its entire opt-in is three lines:

```js
supportsDaily: true,
dailyDifficulty: 'medium',
// plus: init() already honors opts.seed
```

Daily mode differences: the difficulty chips are replaced by a badge (everyone must play the
same board, so difficulty is imposed by the caller), and winning calls
`DailyChallenge.complete('sudoku')`, which updates the streak and re-renders the home card.

`dailyDifficulty` is **Orta** on purpose: Kolay finishes too fast to feel like a daily ritual,
and Uzman is too punishing for something you're asked to do every day.

Restarting a daily reproduces the *same* board — `playGame`'s options are retained by
`restartCurrentGame`, otherwise "Tekrar Oyna" would drop the player onto a random puzzle.

---

## 9. Sudoku is feature-complete

Beyond this point: bug fixes, performance, and small polish only.

Deliberately **not** built (present in the reference design): timer · pause · hints (×3) ·
notes/pencil mode · how-to-play onboarding · theme selector (Arcane / Gölge Tapınak /
Altın Işık).

Two of these carry warnings for whoever picks them up:

- **Notes mode reopens a closed decision.** Pencil marks need an erase affordance, which this
  design removed on purpose (§2). Build it as its own mode rather than restoring a global
  erase key.
- **A visible timer conflicts with a platform principle** — tempo is meant to come from
  sound, animation, and atmosphere, never a stopwatch; the player may think as long as they
  like. Elapsed time is already used for scoring without being displayed. Showing it would
  be a platform-level decision, not a Sudoku one.

---

## 10. Verification performed

Everything below was exercised through real UI clicks in a browser, not asserted from
reading the code:

- **500 randomized (cell, digit) trials** across restarts — a digit is accepted **iff** it
  equals the solution; a life is lost **iff** it does not. 449 rejections, 51 acceptances,
  149 Game Overs, **0 failures**.
- Full solve with correct digits only → 45 cells, 0 unexpected rejections, 0 lives lost, win
  screen, score `5000 − seconds×10`.
- Game Over at 0 lives: correct title, input blocked, board preserved.
- Continue via **diamonds** (30) and via **ad** → +1 life, board preserved, play resumes.
- All 8 games still init/cleanup after the `showGameOver` signature change; the old
  3-argument form still works.
- Contrast measured in-page; touch targets 43px cells / 42px keys (was 32px on stone).

After the scanning-aid / rhythm pass (§8):

- **300 further randomized trials** with filled cells now selectable — 0 failures. Selecting
  a filled cell and pressing a digit neither overwrites it nor costs a life.
- Same-digit highlighting matches the expected cell set exactly.
- Region completion emits 3 rings (delays 0/140/280ms, growing diameters) and pulses all 9
  cells with distance-ordered delays (0→440ms); no ripple fires on a non-completing move.
- Exhausted key collapses 42px → 0px, `opacity` 0, unclickable; the row keeps its 46px
  height and the remaining keys redistribute. At full solve all 9 keys are gone.

Generator (§3a), 750 puzzles — 150 per difficulty, validated in Node against checkers
written independently of the generator's own solver:

- **Uniqueness confirmed by brute-force solution counting on all 750** — exactly 1 solution
  each. The generator's MRV/bitmask counter was not trusted to check itself.
- Every solution is a valid complete grid; every clue agrees with its solution; reported
  clue counts match the actual board.
- **Determinism**: regenerating from the same seed reproduced the identical puzzle in all
  750 cases.
- Different seeds produce different puzzles; `phDailySeed` is stable within a day, differs
  across consecutive days and across scopes, and produced 365 distinct seeds over a year.
- Rating distribution: Kolay 150/150 → 1 · Orta 150/150 → 2 · Zor 147/150 → 3 ·
  Uzman 150/150 → 3 · Usta 150/150 → 3.
- In-browser: 12 consecutive restarts produced 12 distinct seeds; a generated puzzle was
  solved end-to-end with 0 unexpected rejections and 0 lives lost.

Difficulty selection & Daily Challenge (§8a/§8b):

- Selecting Uzman produced a 26-clue board, persisted to `ph_sudoku_difficulty`, and
  survived leaving and re-entering the game.
- Daily mode used exactly `phDailySeed('sudoku')`, forced Orta, hid the chips, showed the
  badge; **restart reproduced the identical board** and kept the badge.
- Streak logic: first completion → 1 · same day again → unchanged (idempotent) · yesterday
  4 → 5 · two days ago 7 → reset to 1 with best preserved · best 11 → 12 · corrupt
  localStorage → safe defaults, no throw.
- End-to-end daily: solved → "Günlük Tamamlandı", streak 1, home card switched to
  "Bugün tamamlandı ✓ 🔥 1", and completing again did not double-count.
- Discover hook: overriding `difficultyLabel` on every module changed every badge whose game
  has a `PuzzleGames` module; the three unbuilt games (`arrowPuzzle`, `flowConnect`,
  `jigsawCard`) correctly fell back to their static labels.
- Regression: all 8 games still init/cleanup after the `init(container, opts)` signature
  change; 250 randomized rule trials on Zor → 0 failures.

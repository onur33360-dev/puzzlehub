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
for entering a different, perfectly valid answer. All three shipped puzzles were verified
by exhaustive solution counting (30, 36, and 23 clues → exactly 1 solution each).

**Any puzzle added later must be counted before shipping.** This is not a style
preference; skipping it produces unfair life loss that will look like a random bug.

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

## 8. Small affordances (present, and why)

- **Peer highlight** — the selected cell's row, column, and box warm slightly. Gives away
  nothing; it only makes scanning cheaper, which protects flow.
- **Exhausted digit keys dim** — a digit placed 9 times disables its key, so the player
  never has to count occurrences manually.
- **Dot in empty cells** — reads as "not yet written" rather than "blank".

---

## 9. Deferred (in the reference design, not built)

Timer · difficulty selection · pause · hints (×3) · notes/pencil mode · how-to-play
onboarding · theme selector (Arcane / Gölge Tapınak / Altın Işık).

Notes mode is the one that would **reopen a closed decision**: pencil marks need an erase
affordance, which this design removed on purpose. Design it as its own mode rather than
adding a global erase key back.

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

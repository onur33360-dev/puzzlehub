# Arrow — Reference Campaign Analysis

Level-by-level documentation of the reference game (**Snake Unjam**, YouTube Playables,
publisher *vectorgames*). Per `ARROW_REFERENCE.md` and its clarifications, the reference
is studied for **level design only** — progression, puzzle structure, dependency chains,
teaching order, difficulty curve. Its visual presentation is explicitly *not* a reference.

**This document must be complete for the first 30 levels before PuzzleHub's own
handcrafted campaign begins.** That is the current milestone.

---

## 1. Status

| | |
|---|---|
| Levels documented | **4 of 30** (1–4, partial) |
| Source material | 4 screenshots supplied by the product owner |
| Blocking | Screenshots for levels 5–30; higher-fidelity captures for dependency graphs |

The reference game cannot be inspected through browser automation — the Chrome
integration cannot drive YouTube Playables (renderer freezes). All material is
supplied manually. See §5 for what a usable capture looks like.

---

## 2. What is and is not extractable from a screenshot

Being explicit about this matters more than filling the table, because a
confidently-wrong dependency graph would send the whole campaign design the wrong way.

| Field | Extractable from one screenshot? | Notes |
|---|---|---|
| Board dimensions | **Partly** | Occupied region is measurable by counting body segments. The *playfield* extent (how much empty space surrounds it) is a guess unless grid lines are visible. |
| Snake count | **Yes** | Distinct colours are countable when the board is not too dense. |
| Snake lengths | **Partly** | Countable for isolated snakes; unreliable where bodies overlap visually at high density. |
| Density | **Derived** | occupied cells ÷ playfield cells — inherits the playfield uncertainty above. |
| **Dependency graph** | **No** | Requires every snake's exact cell path *and* head direction, then walking each tip's exit ray. Not readable at the resolutions supplied so far. This is the one field that needs better captures. |
| First introduced concept | **Yes** | Visible from what the level does that earlier ones did not. |
| Teaching purpose | **Yes** | Inferred from the above plus any tutorial text. |
| Difficulty rating | **Estimate** | Relative, not absolute, until dependency depth is known. |

**Confidence legend used below:** `M` measured · `E` estimated · `?` unknown / not
extractable.

---

## 3. Levels

### Level 1

| Field | Value | Conf. |
|---|---|---|
| Board dimensions | occupied region ≈ 12 × 16; playfield noticeably larger | E |
| Snake count | 7 | M |
| Snake lengths | one long framing snake (≈20+ cells) forming a rectangle down the left and along the bottom; the rest ≈4–10 | E |
| Density (within occupied region) | high; within playfield, low | E |
| Dependency graph | — | ? |
| First introduced concept | Tap a snake to make it leave | M |
| Teaching purpose | The core verb, nothing else. Explicit on-screen text: **"Tap to move"** | M |
| Difficulty | 1 / 10 | E |

Notes: **No zoom slider on this level.** The board fits the screen, so the camera control
is not shown. This is the clearest evidence that zoom in the reference is a consequence of
board size, not a standing UI element. Snakes are individually coloured and each has a
visible head at one end.

### Level 2

| Field | Value | Conf. |
|---|---|---|
| Board dimensions | large; occupied region roughly rectangular | E |
| Snake count | ≈35–40 | E |
| Snake lengths | many long, heavily curved (≈10–25 cells), with switchbacks and spirals | E |
| Density | very high within the mass | E |
| Dependency graph | — | ? |
| First introduced concept | Full-scale tangle; zoom slider appears | E |
| Teaching purpose | unclear — see the open question below | ? |
| Difficulty | 6 / 10 | E |

> **Open question — this jump needs verification.** Level 1 has 7 snakes; level 2 appears
> to have ≈35. That is a very steep step for a casual game's second level. The supplied
> capture also showed two differently-coloured boards stacked in one image, which may be a
> scrolling-capture artefact, two different levels, or a zoomed-out view. **A fresh, single
> capture of level 2 is needed before this row can be trusted.**

### Level 3

| Field | Value | Conf. |
|---|---|---|
| Board dimensions | large; occupied cells form a **silhouette of the digit "2"** | M |
| Snake count | ≈28–35 | E |
| Snake lengths | short-to-medium; constrained by the silhouette's stroke width (≈3–5 cells) | E |
| Density | very high *inside* the silhouette; the rest of the playfield is empty | E |
| Dependency graph | — | ? |
| First introduced concept | **Shaped levels** — the board is a picture, not a filled rectangle | M |
| Teaching purpose | Reframes the puzzle: exits are easy (the figure is surrounded by empty space), so all difficulty lives inside the figure | E |
| Difficulty | 6 / 10 | E |

### Level 4

| Field | Value | Conf. |
|---|---|---|
| Board dimensions | large; silhouette of the digit **"0"** (thick ring/oval) | M |
| Snake count | ≈30 | E |
| Snake lengths | short-to-medium, ≈3–6 cells | E |
| Density | very high inside the ring | E |
| Dependency graph | — | ? |
| First introduced concept | none new — a second silhouette | E |
| Teaching purpose | Consolidates level 3's idea with a closed (ring) topology instead of an open stroke | E |
| Difficulty | 6 / 10 | E |

---

## 4. Cross-level observations

Findings that hold across every level seen so far. These are the ones that should
actually drive PuzzleHub's campaign.

1. **Levels are figures, not filled rectangles.** From level 3 onward the occupied cells
   spell a shape. The playfield is much larger than the figure, so the figure is an island
   in empty space.
2. **Consequence of (1): exits are cheap, tangles are expensive.** With empty space all
   round, an outer snake can nearly always leave. All the difficulty is interior.
3. **The figure is always framed whole, with generous margin.** Never cropped, never
   edge-to-edge. (PuzzleHub violated this until `9e876ad`; the board was clipped.)
4. **Silhouette stroke width caps snake length.** A 3-cell-wide stroke cannot hold a long
   serpentine. Reference figures with thicker strokes carry longer snakes — measured on
   PuzzleHub's own generator: packing a "2" mask gave average snake length 3.4 cells
   versus 5.6 on an open board.
5. **Scale saturates almost immediately.** By level 3 the boards are already full size.
   The difficulty curve therefore cannot be coming from board growth.
6. **Zoom appears when the board outgrows the screen** (absent on level 1, present later),
   which matches PuzzleHub's measurement that boards beyond ≈20 cells per side are not
   tappable without zoom on a phone.
7. **Per-snake colour is a readability device**, required to trace one body through a
   dense tangle. Whether it carries any mechanical meaning is unconfirmed.

---

## 5. Capture specification for levels 5–30

To fill the table — especially the dependency graph — each level needs:

1. **One capture per level, at level start**, before any snake is removed.
2. **The whole figure in frame**, not cropped.
3. **Resolution high enough that individual body segments are countable** and each snake's
   head is distinguishable from its tail. If the whole figure cannot be captured at that
   resolution in one image, two overlapping captures are better than one small one.
4. **Level number visible** in the same image.

A short screen recording of a level being solved would additionally settle three things no
still image can: what happens on tapping a blocked snake, whether several snakes can move
at once, and whether the player can ever get stuck (i.e. whether the reference is
monotonic the way PuzzleHub is).

---

## 6. Open questions

| # | Question | Why it matters |
|---|---|---|
| 1 | Is the level 1 → 2 jump real? | Determines whether the reference actually ramps gently or throws full-scale boards immediately. Changes PuzzleHub's whole early curve. |
| 2 | Can the player get stuck in the reference? | PuzzleHub is provably monotonic — no wrong moves exist. If the reference is too, "difficulty" in both games is search, not planning. |
| 3 | Does colour mean anything mechanically? | If snakes must reach a matching exit, the genre model is different from PuzzleHub's. |
| 4 | Do the silhouettes spell something? | Levels 3 and 4 are "2" and "0". If the campaign spells words or numbers, that is a content decision, not a mechanic. |

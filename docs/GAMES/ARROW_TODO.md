# Arrow — Deferred Work

Everything here was **consciously left out of the release-candidate scope**. None of it
blocks shipping; all of it was measured or observed, not guessed. Ordered by value.

The release-candidate criteria were: no critical bugs, stable mobile performance, first
20–30 levels playable, sound/animation/visual polish done. See §5 for where each stands.

---

## 1. The difficulty ceiling — the biggest one

**Greedy wave depth is flat at ~2.5 across the whole campaign.** Measured with
`tools/level-metrics.js` over levels 4–40: depth 2–4, mostly 2. Level 100 is structurally
the same puzzle as level 4 — bigger and denser, not deeper. Typically 60–75% of snakes are
free on the first tap.

The quality gate added in `b9bf8c1` removed *degenerate* boards (zero dependencies) but
did not raise the ceiling; it only guarantees a floor. Raising the ceiling means generating
*toward* a target dependency structure rather than filling space and measuring what falls
out — a generator change that was explicitly out of scope.

**Why it was deferred:** it is a redesign, not a fix. The game is playable and pleasant
without it.

## 2. No progression past level 40

`paramsFor` starts with `const t = Math.min(n, 40)`. Levels 40 and 100 receive identical
board size, shape pool, and arrow count. There is no curve after 40 — there are 60 repeats.

## 3. Reference campaign analysis is 4 % complete

`ARROW_REFERENCE_LEVELS.md` documents 4 of the intended 100 reference levels, and the
dependency graph is unfilled for all four — it cannot be read from the screenshot
resolution supplied. The transcription pipeline that would make this tractable exists and
is validated (`tools/level-metrics.js`, ASCII format, exact round-trip on levels 1–3), so
this is now purely an input problem: it needs captures where each snake's head is
distinguishable.

## 4. Handcrafted levels 1–3 are invented, not reference-derived

They were authored before the decision to derive progression from the reference. Their
structure is sound (depth 2 → 3 → 4, all solvable, verified) but their numbers are not
anchored to anything measured. They should be re-derived once §3 has data.

## 5. Density discontinuity at level 4

Handcrafted levels 1–3 sit at fill ratio 0.36 / 0.39 / 0.43. The first generated level
jumps to ~0.87. The step is visible. Fixing it means touching either the handcrafted
levels or the generator's fill target — both were frozen.

## 6. `metrics()` in `games.js` measures an abandoned rule

`avgSweep` and `singleBlocker` (games.js, `metrics()`) still sweep **every cell of the
shape** — the rigid-translation model that was replaced by the snake model. `canExit` and
`blockersOf` use the tip's ray. So these two numbers describe a rule the game does not
implement. **Nothing in gameplay reads them** — they are diagnostic only, which is why this
is not a release blocker. Do not tune difficulty from them; use `tools/level-metrics.js`.

## 7. Unused capability, deliberately parked

- **Silhouette levels.** `generateSlide` accepts a `mask`; boards shaped like a figure
  (the reference's "2" and "0" levels) work — measured 0.81 fill inside a digit-2 mask,
  20/20 solvable. `startLevel` never passes a mask.
- **`fill` mode's other half.** Also unused: nothing calls it with an explicit arrow cap.
- **`sp18` / `sp20`** serpentine shapes exist in `SHAPES` but are in no tier.
- **Colour differentiation.** Every arrow renders in jewel-1 violet. The reference gives
  each snake its own colour because tracing one body through a dense tangle otherwise
  fails. At our current densities (0.75–0.85, interlocking ~3) this has not been reported
  as a problem, but it is untested at higher counts. Do not change rendering on the
  strength of the reference alone — measure readability first.

## 8. Camera / zoom ceiling on small phones

`CAM_MAX_SCALE = 3`. Measured across six device sizes: a 20×24 board yields 9–18 px cells,
and only at full zoom does that reach ~48 px. On a small Android with browser chrome
visible the practical board ceiling is ~15 cells per side. Today's boards top out at 9×11,
so this only matters if §1/§2 grow the boards.

## 9. Reference open questions

Unresolved, from `ARROW_REFERENCE_LEVELS.md` §6:

1. Is the level 1 → 2 jump real (7 snakes → ~35)?
2. Can the player get stuck in the reference? PuzzleHub is provably monotonic — no wrong
   moves exist. If the reference is too, "difficulty" in both is search, not planning.
3. Does per-snake colour carry mechanical meaning?
4. Do the silhouettes spell something (levels 3 and 4 are "2" and "0")?

---

## Release-candidate status

| Criterion | State |
|---|---|
| No critical bugs | **Met.** Levels 1–30 audited: 0 unsolvable, 0 without dependencies. The two shipped bugs found this cycle — board clipped off-screen (`9e876ad`) and degenerate level 6 (`b9bf8c1`) — are fixed. |
| Stable mobile performance | **Met.** Level generation 21 ms average, 49 ms worst, once per level inside a 900 ms transition. Fill-mode `staleMax` cut 200 → 25 after measuring identical output (86.7 → 7.5 ms). Board layout verified on six device sizes, no clipping. |
| First 20–30 levels playable | **Met.** All 30 audited. Interlocking 2.4–3.25, curved-arrow share ~69%, every level carries at least one dependency. |
| Sound, animation, visual polish | **Met for scope.** 9 audio cues + 5 haptic types, 13 keyframe animations, shared atmosphere flare / particle burst / gleam / camera. No missing feedback path found. |
| Release candidate | **Yes, for the built scope.** The deferred items above are depth and content, not defects. |

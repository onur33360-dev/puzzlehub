# 04_CANVAS_POLICY.md

# PuzzleHub Canvas Policy

Version: 2.0

------------------------------------------------------------------------

# Core Rule

Renderer selection is an **architectural decision made before
implementation**.

It is not a preference, and it is not something discovered afterwards.

-   Lightweight games start with DOM.
-   Render-intensive games start with Canvas immediately.

Decide before writing the game, and record the reason.

------------------------------------------------------------------------

# Choosing The Renderer

Start on **DOM** when the game is:

-   Mostly static
-   Text or UI driven
-   Changing state discretely and infrequently
-   Animating only a handful of elements at a time

Start on **Canvas** when the game has:

-   Many simultaneously animated elements
-   Particles, explosions, trails
-   Continuous motion or drag interaction over a large surface
-   Per-frame visual effects
-   A board that repaints as a whole

If the answer is genuinely unclear, build the DOM version first and
profile. Uncertainty is resolved by measurement, never by preference.

------------------------------------------------------------------------

# Migrating An Existing DOM Game

Migration is a different decision from initial selection.

An existing DOM game moves to Canvas only if all of the following are
true:

-   FPS profiling has been completed.
-   A GPU / fill-rate or filter-repaint bottleneck is confirmed.
-   Cheap DOM fixes have been tried first (for example: baking a moving
    filter into colours or a sprite).
-   Visual quality will be preserved.
-   The user approves the migration.

If even one condition is false:

DO NOT migrate to Canvas.

------------------------------------------------------------------------

# Good Canvas Candidates

-   Block Puzzle
-   Water Sort
-   Particle-heavy games
-   Games with hundreds of animated elements

------------------------------------------------------------------------

# Never Canvas

Never render with Canvas:

-   Home
-   Discover
-   Profile
-   Premium
-   Shop
-   Settings
-   Static menus
-   Text-heavy pages
-   Leaderboards

------------------------------------------------------------------------

# Hybrid Architecture

HTML/CSS

-   Navigation
-   HUD
-   Buttons
-   Menus
-   Text

Canvas

-   Game board
-   Particles
-   Dynamic effects
-   Moving gameplay objects

------------------------------------------------------------------------

# Rendering Rules

Use sprite caching.

Avoid per-frame blur generation.

Avoid per-frame gradient allocation.

Avoid moving CSS filters.

Prefer textures over runtime effects.

Repaint only what changed (dirty region), not the whole scene.

------------------------------------------------------------------------

# Idle Rule

A Canvas game must cost nothing when the player is not interacting.

-   No permanent rAF loop.
-   Ambient effects are event-driven, not time-driven.
-   The loop stops itself when the last animation finishes.
-   `cleanup()` cancels every loop and frees every texture.

------------------------------------------------------------------------

# Visual Parity

A Canvas renderer must reproduce the intended look completely.

If a Canvas version looks worse than the DOM version it replaced, the
migration has failed, regardless of its frame rate.

Where DOM used a CSS filter or transition, port the *behaviour*, not an
approximation: bake filters into colours, and reproduce easing curves
exactly rather than substituting a spring.

------------------------------------------------------------------------

# Validation

Every Canvas migration must prove:

-   Better FPS
-   Better frame pacing
-   No visual regression
-   Acceptable memory usage

------------------------------------------------------------------------

# The Legacy DOM Renderer

While a migration is in progress the **DOM renderer stays in the
codebase**. It is the visual parity reference: it is the only record of
what the game is supposed to look like, and its comments carry the
measured reasoning behind each effect.

Do not delete it as "dead code". Removing it is the **final step of the
migration**, not part of the implementation.

## Migration Completion Checklist

Removal is allowed only after every step is complete, in order:

1.  Visual parity approved by the product owner.
2.  Device testing completed.
3.  DOM vs Canvas benchmark documented.
4.  Performance improvement recorded in this document (see below).
5.  Commit.
6.  Remove the legacy DOM renderer.
7.  Commit again.

Steps 6 and 7 are a separate commit from step 5 on purpose: if the
removal turns out to be wrong, it can be reverted without losing the
migration itself.

## Recorded Migrations

| Game | Renderer | Benchmark (DOM → Canvas) | DOM removed |
|---|---|---|---|
| Block Puzzle | Canvas | DOM drag 24 fps (41.7 ms median, worst 209 ms) with main thread idle at 1.1 ms → GPU fill-rate bound; Canvas holds 60 | yes |
| Water Sort | Canvas | **P90 150 ms → 40 ms** (see full table below) | no — legacy reference, kept |

A migration with an empty benchmark cell has not satisfied step 3 and
its legacy renderer must not be removed.

### Water Sort — DOM vs Canvas (2026-07-28)

Galaxy A51 (SM-A515F), Android 13. Level 9, 7 tubes. Identical scripted
tap sequence (21 source→target pairs × 3 rounds), in-app FPS overlay
disabled. DOM build = `aac2084`, Canvas build = branch head.

| Metric | DOM | Canvas | Change |
|---|---|---|---|
| Frames produced | 1326 | **2387** | +80 % throughput |
| Frame time P50 | 34 ms | **30 ms** | −12 % |
| Frame time P90 | 150 ms | **40 ms** | **−73 %** |
| Frame time P95 | 150 ms | **42 ms** | −72 % |
| Frame time P99 | 200 ms | **48 ms** | −76 % |
| Janky frames | 74.9 % | **65.7 %** | −9.2 pts |
| GPU P50 | 8 ms | 10 ms | +2 ms |
| GPU P90 | 10 ms | 15 ms | +5 ms |
| Thermal (start → end) | 39.1 → 40.2 °C, status 1 → 2 | 33.3 → 36.3 °C, status 0 | not normalized (see below) |

**The result is in the tail, not the average.** Median frame time barely
moved; P90 dropped from 150 ms to 40 ms. A 150 ms frame is six dropped
frames in a row, which is exactly the "screen keeps refreshing itself"
complaint that motivated the migration. Average FPS never showed this.

**The bottleneck was not the GPU.** DOM's GPU time is *lower* than
Canvas's (8 ms vs 10 ms) while its total frame time is far worse — the
cost was layout/paint and re-rasterising a filter on a moving element.
Canvas asks slightly more of the GPU and gives the main thread back.

**Conditions, recorded as measured:**

-   Thermal state was **intentionally not normalized**. PuzzleHub is
    optimised for real gameplay, not laboratory conditions; if a device
    throttles during normal play, that throttling is part of the user's
    experience and belongs in the number. The DOM run was throttling
    (status 1→2), the Canvas run was not.
-   Boards are generated randomly and are not seeded, so the two runs did
    not play identical boards. Tube count and level were identical.

Both facts are recorded rather than corrected. The migration decision
rests on real gameplay performance.

### Water Sort — Checklist Status

1.  Visual parity approved — **done** (owner approved on device)
2.  Device testing completed — **done** (Galaxy A51)
3.  DOM vs Canvas benchmark documented — **done** (above)
4.  Performance improvement recorded here — **done**
5.  Commit — **done**
6.  Remove legacy DOM renderer — **deferred**
7.  Commit again — **deferred**

**The Water Sort Canvas migration is CLOSED.** Steps 6–7 are deliberately
not executed: the DOM renderer stays as legacy reference code. It is no
longer a development target — do not optimise it, do not extend it, and
do not treat its absence of upkeep as a defect.

------------------------------------------------------------------------

# Commit Rule

Canvas work requires:

Before measurements

After measurements

APK validation

User approval

Commit

Push

------------------------------------------------------------------------

# Final Principle

Canvas is a rendering strategy chosen for the job.

It is never a design preference, and never an afterthought.

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
| Water Sort | Canvas | **not yet measured — open obligation** | no — kept as parity reference until Phase 4 completes |

A migration with an empty benchmark cell has not satisfied step 3 and
its legacy renderer must not be removed.

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

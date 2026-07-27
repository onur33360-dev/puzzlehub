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

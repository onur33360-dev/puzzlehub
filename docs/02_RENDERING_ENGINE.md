# 02_RENDERING_ENGINE.md

# SlySwipe Rendering Engine

## Objective

Maintain premium visuals while sustaining stable frame rates on Android
devices.

------------------------------------------------------------------------

# Rendering Philosophy

Rendering quality is important.

Frame stability is more important.

Never reduce quality without profiling first.

------------------------------------------------------------------------

# Rendering Decision Tree

The renderer is selected **before implementation**, from the nature of
the game:

**DOM** — lightweight games:

-   Mostly static boards
-   Few animated elements
-   Text / UI driven
-   Discrete, infrequent state changes

**Canvas** — render-intensive games:

-   Many simultaneously animated elements
-   Particles, explosions, continuous motion
-   Per-frame visual effects
-   Large surfaces repainted every frame
-   Known old-WebView limitations (filter repaint, fill-rate)

An existing DOM game is *migrated* to Canvas only when profiling proves:

-   GPU fill-rate bottleneck
-   Filter repaint bottleneck
-   Continuous animation bottleneck
-   Old WebView limitations

Never choose a renderer because of preference. Record the decision and
its reason.

------------------------------------------------------------------------

# DOM Responsibilities

Use DOM for:

-   HUD
-   Buttons
-   Menus
-   Profile
-   Home
-   Discover
-   Static UI

Avoid:

-   Massive particle systems
-   Heavy filters
-   Hundreds of animated nodes

------------------------------------------------------------------------

# Canvas Responsibilities

Canvas renders:

-   Board
-   Moving pieces
-   Ghosts
-   Particles
-   Explosions
-   Dynamic lighting
-   Animated gameplay

Canvas never renders menus.

------------------------------------------------------------------------

# Sprite System

Every expensive visual should become a reusable sprite.

Examples:

-   Crystals
-   Glass tubes
-   Board sockets
-   Particle textures

Generate once.

Reuse many times.

------------------------------------------------------------------------

# Idle Cost

A Canvas renderer must cost **zero** when nothing is animating.

-   No permanent rAF loop.
-   Animation loops start on an event and stop when the last animation
    ends.
-   Ambient effects are event-driven, not time-driven.

------------------------------------------------------------------------

# Render Scale

Canvas supports adaptive render scale.

Typical values:

-   1.00 High-end
-   0.85 Mid-range
-   0.70 Low-end
-   0.60 Emergency

Visual quality should remain nearly identical.

------------------------------------------------------------------------

# Animation Rules

Prefer:

-   transform
-   opacity

Avoid:

-   filter
-   blur
-   drop-shadow
-   mix-blend-mode

on moving elements.

Where DOM achieved a look with a filter, bake the equivalent into the
colours or sprite instead of animating a filter.

------------------------------------------------------------------------

# Performance Validation

Every rendering change requires:

1.  Before measurement
2.  Implementation
3.  After measurement
4.  Device validation
5.  Commit approval

------------------------------------------------------------------------

# Rule

Rendering changes are accepted only if they improve measured performance
without visible quality loss.

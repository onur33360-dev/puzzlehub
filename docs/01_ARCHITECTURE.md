# 01_ARCHITECTURE.md

# PuzzleHub Architecture

## Goal

This document defines the permanent architecture of PuzzleHub.

## Core Principles

-   HTML/CSS for application shell.
-   Renderer selection is an architectural decision made **before**
    implementation (see `04_CANVAS_POLICY.md`).
-   Lightweight games use DOM. Render-intensive games use Canvas from the
    start.
-   Never optimize without measurements.
-   Never commit or push without user approval.

## Layers

Application → Navigation → Game Manager → Individual Game → Renderer →
Effects → Audio → Storage

## UI

Remain HTML/CSS: - Home - Discover - Profile - Premium - Shop - Settings

## Game Contract

Each game exposes: - init(container, opts?) - cleanup()

`opts` is optional and forwarded by the Game Manager. Games that support
the Daily Challenge must honour `opts.seed` deterministically.

cleanup() must remove: - listeners - RAF loops - timers - textures -
temporary objects

## Rendering

The renderer is chosen per game before implementation begins:

-   **DOM** for lightweight games (static boards, few animated elements,
    text/UI driven).
-   **Canvas** for render-intensive games (many animated elements,
    particles, continuous motion, per-frame effects).

Canvas draws: - board - particles - effects - moving objects

HUD and menus stay HTML.

## Performance

Always record: - FPS - Frame time - Before/After comparison

## Release Priority

1.  Stability
2.  Performance
3.  Security
4.  Monetization
5.  Google Play
6.  New Games

## Git Rules

No commit before approval. No push before approval.

## Documentation

Claude must read every file under /docs before implementing anything.

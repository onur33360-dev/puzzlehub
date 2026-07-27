# 05_GAME_DEVELOPMENT.md

# PuzzleHub Game Development Guide

## Goal

Every game follows the same lifecycle, architecture and quality
standards.

------------------------------------------------------------------------

## Development Order

1.  Core gameplay
2.  Renderer decision (DOM or Canvas — see `04_CANVAS_POLICY.md`)
3.  Implementation
4.  Profiling
5.  Optimization
6.  Polish
7.  Device validation
8.  Commit
9.  Push

The renderer is decided at step 2, before implementation. It is not a
later migration unless profiling of a shipped DOM game demands it.

------------------------------------------------------------------------

## Game Contract

Every game exposes:

-   init(container, opts?)
-   cleanup()

No exceptions.

`opts` is optional. Games supporting the Daily Challenge must honour
`opts.seed` deterministically.

`cleanup()` must cancel every rAF loop and timer, remove every listener,
and release every texture. A loop that survives `cleanup()` keeps drawing
into a detached canvas forever.

------------------------------------------------------------------------

## Game Structure

Game → Logic → State → Renderer → Audio → Effects

Logic must never depend on rendering.

------------------------------------------------------------------------

## Rendering

Lightweight games render with DOM.

Render-intensive games render with Canvas from the start.

Migrating an existing DOM game to Canvas requires profiling that confirms
DOM is insufficient.

------------------------------------------------------------------------

## Performance

Every new feature must be measured.

Do not guess.

Profile before optimizing.

Idle must cost zero.

------------------------------------------------------------------------

## Visual Quality

Premium appearance is mandatory.

Do not reduce visual quality unless measurements prove it is necessary.

A renderer change that loses the feel of the game has failed, even if it
is faster.

------------------------------------------------------------------------

## Testing

Required before commit:

-   Playable
-   No memory leaks
-   No console errors
-   Stable FPS
-   Device validation complete

------------------------------------------------------------------------

## Git Workflow

Code → APK Build → Physical Device Test → Regression Check → Commit →
Push → Start Next Feature

-   Every completed feature must be committed and pushed.
-   Never accumulate multiple finished features without a commit.
-   Never start a new feature while the previous finished feature is
    uncommitted.
-   Every commit must represent a stable state.
-   Small commits are preferred. One clear purpose per commit.

Never commit before user approval.

Never push before user approval.

------------------------------------------------------------------------

## Golden Rule

Build the correct game first.

Optimize only after measurements.

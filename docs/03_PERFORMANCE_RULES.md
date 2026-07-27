# 03_PERFORMANCE_RULES.md

# PuzzleHub Performance Rules

Version: 1.1

------------------------------------------------------------------------

# Objective

PuzzleHub must feel smooth on both modern and low-end Android devices.

Performance is considered a feature.

------------------------------------------------------------------------

# Target FPS

High-end devices: - 60 FPS minimum

Mid-range devices: - 55-60 FPS

Low-end devices: - Never feel stuttery - Stable frame pacing is
preferred over peak FPS

------------------------------------------------------------------------

# Frame Budget

60 FPS

16.67 ms/frame

Target distribution

JavaScript \<3ms

Layout \<2ms

Paint \<3ms

GPU \<8ms

------------------------------------------------------------------------

# Performance Workflow

Never optimize by guessing.

Always follow:

Measure

Find bottleneck

Optimize

Measure again

Validate on device

Commit

------------------------------------------------------------------------

# Required Tools

Chrome DevTools

Android gfxinfo

Perfetto (Android 12+)

FrameTimeline

FPS Overlay

------------------------------------------------------------------------

# Measurement Validity

A measurement is only valid if the conditions are controlled.

-   Check thermal state first (`dumpsys thermalservice`). SKIN
    `mStatus` ≥ 1 means the device is throttling; absolute numbers are
    not comparable.
-   Capture an idle baseline in the **same** thermal state and compare
    the delta, not the absolute.
-   Disable in-app development overlays before measuring. An overlay that
    runs its own rAF loop, or uses `backdrop-filter`, is measuring
    itself.
-   State the device, the build and the thermal state next to every
    number.

------------------------------------------------------------------------

# Bottleneck Types

CPU

GPU

Fill-rate

Overdraw

Filters

Layout

Memory

Always identify which one exists first.

------------------------------------------------------------------------

# GPU Rules

Avoid moving elements with

filter

drop-shadow

blur

mix-blend-mode

Use

transform

opacity

sprite rendering

instead.

------------------------------------------------------------------------

# Renderer Selection

The renderer is chosen before implementation (see `04_CANVAS_POLICY.md`).

Lightweight games start on DOM. Render-intensive games start on Canvas.

Migrating an existing DOM game to Canvas still requires profiling that
proves DOM cannot sustain acceptable FPS.

------------------------------------------------------------------------

# Idle Cost

Idle must cost zero.

-   No permanent animation loop.
-   Ambient effects are event-driven.
-   Loops stop themselves when the last animation ends.

------------------------------------------------------------------------

# Profiling Checklist

Before optimization collect

Average FPS

P95

P99

Worst frame

GPU phase

CPU phase

Temperature

Device

Then compare after implementation.

------------------------------------------------------------------------

# Commit Policy

Every performance commit must include

Problem

Measurement

Optimization

Result

Regression check

No exceptions.

------------------------------------------------------------------------

# Golden Rule

If it is not measured,

it is only a guess.

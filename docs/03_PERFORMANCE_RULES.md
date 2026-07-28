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

We measure **real gameplay, not laboratory conditions.**

Thermal state is deliberately **not** normalized. If a device throttles
during normal play, that throttling is part of the player's experience
and belongs in the number. Do not discard a throttled run, and do not
re-run a benchmark to obtain cooler conditions.

Rules:

-   **Record** the thermal state (`dumpsys thermalservice`, SKIN value
    and `mStatus`) next to every number, at start and end. Record it as
    data, not as a reason to reject the run.
-   State the device, the build, the level/scenario and the input
    sequence beside every number, so a run can be repeated.
-   Use an identical input sequence across the builds being compared.
-   Disable in-app development overlays before measuring. An overlay that
    runs its own rAF loop, or uses `backdrop-filter`, is measuring
    itself — this is instrument error, not a device condition, so it
    must be removed.
-   Report the tail (P90/P95/P99), not just the average. A dropped-frame
    cluster is what players feel; average FPS routinely hides it.
-   Note any uncontrolled variable honestly (random level layouts,
    differing thermal state) rather than silently correcting for it.

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

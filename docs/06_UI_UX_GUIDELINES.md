# 06_UI_UX_GUIDELINES.md

# PuzzleHub UI / UX Guidelines

## Vision

PuzzleHub must feel like a premium mobile application from the first
second.

------------------------------------------------------------------------

## Design Goals

-   Premium
-   Clean
-   Modern
-   Fast
-   Consistent

------------------------------------------------------------------------

## Visual Language

Use:

-   Glassmorphism
-   Soft gradients
-   Rounded corners
-   Smooth transitions
-   Clear typography

Avoid:

-   Clutter
-   Excessive shadows
-   Flashy colors
-   Cheap-looking effects

------------------------------------------------------------------------

## Animations

Animations should communicate, never distract.

Target duration:

-   Tap: 100--150ms
-   UI transition: 200--300ms
-   Celebration: 400--700ms

------------------------------------------------------------------------

## Input Responsiveness

Touch feedback must be immediate.

-   Use `pointerdown` for game input, not `click`. Mobile WebViews delay
    `click` until they have ruled out scrolling and double-tap.
-   Set `touch-action: manipulation` on interactive surfaces.
-   Never silently drop a tap that arrives during an animation lock.
    Buffer it and replay it when the lock releases.

------------------------------------------------------------------------

## Colors

Maintain a consistent color palette.

Never introduce random colors per game.

------------------------------------------------------------------------

## Icons

Use one icon style across the application.

------------------------------------------------------------------------

## Typography

Readable at all sizes.

Avoid decorative fonts.

------------------------------------------------------------------------

## Navigation

Maximum 1--2 taps to reach any important feature.

------------------------------------------------------------------------

## Premium Feeling

Every screen should answer:

-   Does it feel smooth?
-   Does it feel polished?
-   Does it feel intentional?

If not, improve before release.

------------------------------------------------------------------------

## Rule

Performance and polish are equally important.

A beautiful interface that stutters is not acceptable.

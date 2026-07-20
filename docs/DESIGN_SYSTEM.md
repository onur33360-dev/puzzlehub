# PuzzleHub Design System

> **Version:** 1.0 — July 2026
> **Status:** Foundational specification. Every future game, screen, and component is built against this document rather than inventing its own visual language.
> **Scope:** This document defines PuzzleHub's visual, motion, material, and interaction identity. It is stack-agnostic in intent but stack-honest in execution — see [Implementation Constraints](#implementation-constraints) for where ambition was deliberately bounded by our actual technology.

---

## 1. Design Philosophy

**"Luminous calm, tactile precision."**

PuzzleHub is not a bright, cartoonish hyper-casual toy, and it is not a sterile, corporate utility. It sits deliberately between: a dark, confident, jewel-toned world where color and light do the emotional work, and every material — glass, liquid, soft plastic — feels like it would respond if you touched it.

Three words govern every visual decision:

- **Premium** — nothing looks like a placeholder, a default browser control, or an unstyled fallback. If it ships, it looks intentional.
- **Calm** — the interface doesn't compete with the player for attention. Chrome recedes; gameplay content is what glows, moves, and demands the eye.
- **Confident** — restraint is a feature. A system that uses one excellent animation per moment reads as more premium than one that animates everything at once.

Every screen should feel alive *before* the player interacts with it — ambient light, subtle motion, and material depth are not decoration added after the fact, they are the baseline a screen must have to ship.

---

## 2. Core Principles

These are the rules derived from the philosophy above — the things to check a design against before it's considered "on-brand."

1. **Dark is a canvas, not an absence.** The background is a deep violet-void, not a neutral gray or true black. It exists to make color glow, not to save on default styling.
2. **One light source per screen.** Every elevated surface implies the same top-left key light. Highlights and shadows are never arbitrary.
3. **Materials before decoration.** A surface is glass, liquid, or soft-solid — never "flat div with a shadow slapped on." If it doesn't fit one of the three material archetypes (§13), it isn't finished.
4. **Motion always has causality.** If A causes B, the animation visually connects them. Nothing simply disappears here and reappears there.
5. **Restraint is the premium signal.** One hero animation per moment. Celebration moments are the exception, not the rule — see §16.
6. **One system, every game.** A new game reaches first for existing tokens and components. A new token is added to this document, not invented inline in a game file.
7. **Performance is a design constraint, not an engineering afterthought.** A beautiful animation that drops frames on a mid-range Android phone is a design failure, not just a technical one.

---

## 3. Color System

### 3.1 Background layers

| Token | Value | Use |
|---|---|---|
| `--ph-bg-0` | `#110820` | Root void — app background, matches existing brand `background_color` |
| `--ph-bg-1` | `#1a1030` | Elevation 1 surfaces — resting cards, panels |
| `--ph-bg-2` | `#241640` | Elevation 2 surfaces — raised/interactive panels |
| `--ph-bg-glass` | `rgba(255,255,255,.04)` | Frosted glass tint, layered over blur (see §13) |

### 3.2 Text

| Token | Value | Use |
|---|---|---|
| `--ph-text-primary` | `#f0f0f5` | Headlines, primary body text |
| `--ph-text-secondary` | `rgba(240,240,245,.6)` | Supporting text, descriptions |
| `--ph-text-tertiary` | `rgba(240,240,245,.35)` | Metadata, timestamps, disabled-adjacent |
| `--ph-text-disabled` | `rgba(240,240,245,.2)` | Truly disabled controls |

Never pure `#fff` — it reads cold against the violet-black base. `--ph-text-primary` is deliberately warm-tinted.

### 3.3 Brand accent

| Token | Value | Use |
|---|---|---|
| `--ph-accent` | `#a855f7` | Primary brand color — CTAs, active states, brand chrome |
| `--ph-accent-light` | `#c084fc` | Hover/highlight variant |
| `--ph-accent-dark` | `#7c3aed` | Pressed/shadow variant |

This is the existing PuzzleHub violet (already used for the PLUS badge, primary buttons, undo controls). It is the **only** accent used for platform chrome — it must never be reused as a semantic color (success/error) or diluted by other "brand-ish" purples appearing elsewhere.

### 3.4 Semantic colors

| Token | Value | Meaning |
|---|---|---|
| `--ph-success` | `#fbbf24` (gold) | Reward, success, currency — matches existing diamond/star iconography |
| `--ph-success-glow` | `rgba(251,191,36,.4)` | Glow companion |
| `--ph-error` | `#ef4444` | Invalid action, failure |
| `--ph-error-glow` | `rgba(239,68,68,.4)` | Glow companion |
| `--ph-info` | `#22d3ee` | Neutral informational accents |

**Rule:** gold is reserved for reward/success exclusively. It must never be used decoratively — its scarcity is what makes it mean something when it appears.

### 3.5 Gameplay palette — the "jewel tone" system

Every piece of gameplay content (liquid, tiles, cards, orbs — whatever the genre) draws from a fixed 8-hue palette, and **every hue is a 3-stop token**, never a flat color. This is what makes content read as lit material instead of a flat swatch.

| # | Name | Highlight | Base | Shadow | Glow |
|---|---|---|---|---|---|
| 1 | Violet | `#c084fc` | `#a855f7` | `#7c3aed` | `rgba(168,85,247,.4)` |
| 2 | Cyan | `#67e8f9` | `#22d3ee` | `#0891b2` | `rgba(34,211,238,.4)` |
| 3 | Coral | `#f87171` | `#ef4444` | `#b91c1c` | `rgba(239,68,68,.4)` |
| 4 | Emerald | `#4ade80` | `#22c55e` | `#15803d` | `rgba(34,197,94,.4)` |
| 5 | Gold | `#fcd34d` | `#fbbf24` | `#d97706` | `rgba(251,191,36,.4)` |
| 6 | Azure | `#60a5fa` | `#3b82f6` | `#1d4ed8` | `rgba(59,130,246,.4)` |
| 7 | Tangerine | `#fb923c` | `#f97316` | `#c2410c` | `rgba(249,115,22,.4)` |
| 8 | Rose | `#f472b6` | `#ec4899` | `#be185d` | `rgba(236,72,153,.4)` |

This extends (rather than replaces) the hues already in use across `screwPuzzle` and `blockPuzzle` — new games should draw from this table rather than inventing new hues, so the whole catalog reads as one palette.

**Accessibility note:** at 8 simultaneous hues, Tangerine/Gold and Violet/Rose are close enough to be genuinely difficult for colorblind players to distinguish at a glance. See §18.

---

## 4. Lighting Model

- **Single key light, top-left, every surface.** No element invents its own shadow direction. This is what makes a screen feel like one coherent object rather than a pile of independently-styled divs.
- **Ambient glow is how color speaks.** Gameplay content and accent elements bleed soft colored light into their surroundings via blurred, tinted `box-shadow`. Structural chrome (bars, buttons, cards) does not glow — glow is reserved for things the eye should be drawn to.
- **Three light temperatures:**
  - *Neutral* (white/cool) — structural UI: cards, borders, dividers.
  - *Warm gold* — reward/success only (§3.4).
  - *Content color* — whatever hue the gameplay object itself is (§3.5).
- **Light implies material.** A glass surface's highlight is a soft diagonal sheen near the top edge. A liquid's highlight is a specular arc near its surface. A solid control's highlight is a flat top-edge catch-light. These are distinct, not interchangeable (§13).

---

## 5. Elevation System

A 5-level model. Every surface in the app belongs to exactly one level, which determines its shadow token (§6), its fixed z-index, and how "reachable" it feels.

| Level | Name | Examples | Shadow | z-index |
|---|---|---|---|---|
| 0 | Base | App background | none | `0` |
| 1 | Resting | Cards, tube bodies, list rows | `--ph-shadow-1` | `1` |
| 2 | Interactive | Buttons, chips, tappable controls | `--ph-shadow-2` | `2` |
| 3 | Floating | Selected/active/dragged elements | `--ph-shadow-3` + glow | `3` |
| 4 | Overlay | Modals, celebrations, in-game "level complete" | `--ph-shadow-4` + scrim + blur | `4` |

Deliberately **fixed single values, not ranges.** An earlier draft of this table used z-index *bands* (`1–9`, `10–19`, etc.) to leave room for sub-ordering within a level — nothing in this system actually needs that; every real case is one element per level per screen, and DOM order already resolves ties if two same-level elements ever overlap. A band is complexity with no corresponding benefit — if genuine intra-level stacking is ever needed, add a documented `+1` exception at that point, not preemptively.

**Ceiling — this band does not own the top of the stack.** The existing app shell already reserves high z-index values for its own chrome: `.toast` is `9999`, `.ad-overlay` (rewarded-ad modal) is `10000`. Every value in this table (`0`–`4`) stays far below that on purpose — in-game content, including a game's own Level-4 celebration overlay, must never be able to outrank app-shell chrome. This system governs z-index *inside a single game's container* only; it does not touch or renumber the app shell's existing values.

**Rule:** an element only moves up a level in direct response to player action (selection, drag, completion) — elevation changes are earned, not decorative.

---

## 6. Shadow System

Two families, both parameterized as tokens rather than invented per-component.

**Neutral (structural depth):**

| Token | Value |
|---|---|
| `--ph-shadow-1` | `0 2px 8px rgba(0,0,0,.25)` |
| `--ph-shadow-2` | `0 6px 16px rgba(0,0,0,.35)` |
| `--ph-shadow-3` | `0 12px 28px rgba(0,0,0,.45)` |
| `--ph-shadow-4` | `0 20px 50px rgba(0,0,0,.55)` |

**Glow (colored, for accents/gameplay content):** a fixed two-size scale, always paired with a color from §3.4/§3.5 — never an arbitrary size or an arbitrary color:

| Token | Value | Use |
|---|---|---|
| `--ph-glow-sm` | `12px` | Selection rings, small badges |
| `--ph-glow-md` | `24px` | Celebration wash, large emphasis |

Applied as `box-shadow: 0 0 var(--ph-glow-sm) <color>-glow-token`. This is a named, fixed recipe — not a formula every game reinvents with its own blur radius — so a "glow" looks and behaves identically everywhere it appears. Never combine more than one glow color on a single element.

**Inset (concave surfaces — tube interiors, wells):** `inset 0 2px 4px rgba(255,255,255,.15), inset 0 -3px 6px rgba(0,0,0,.35)` — consistent light-catches-top / shadow-pools-bottom recipe, matching the single key light rule.

---

## 7. Border Radius Tokens

| Token | Value | Use |
|---|---|---|
| `--ph-radius-xs` | 6px | Chips, small badges |
| `--ph-radius-sm` | 10px | Buttons, small controls |
| `--ph-radius-md` | 16px | Cards, containers, tubes |
| `--ph-radius-lg` | 24px | Modals, large panels |
| `--ph-radius-full` | 999px | Pills, avatars, circular controls |

PuzzleHub leans rounded throughout — sharper corners read as "serious utility," which is not the brand. Every game should pick from this fixed set rather than inventing intermediate values (the current inconsistency — `12px`/`14px`/`18px`/`20px` scattered across existing games — is exactly what this table replaces).

---

## 8. Typography Hierarchy

Both typefaces are already loaded platform-wide (Outfit 600–900, Inter 400–900 via the existing Google Fonts link) — this section assigns them fixed roles rather than requiring any new font loading.

| Role | Font | Size | Weight | Line-height | Tracking | Use |
|---|---|---|---|---|---|---|
| Display | Outfit | 30px | 900 | 1.2 | 0 | Celebration moments, hero numbers |
| Title | Outfit | 21px | 800 | 1.3 | 0 | Screen/game titles |
| Heading | Inter | 15px | 800 | 1.4 | 0 | Section headers, card titles |
| Body | Inter | 14px | 600 | 1.5 | 0 | Standard UI text |
| Caption | Inter | 12px | 700 | 1.4 | +0.3px | Labels, badges, metadata |
| Numeral | Outfit | varies | 900 | 1 | 0 | **All numbers** — score, level, counters |

**Numerals get their own role deliberately.** Scores and levels are the emotional core of a casual game's feedback loop; they're rendered in Outfit 900 with `font-variant-numeric: tabular-nums` wherever the browser supports it, so digit changes during count-up animations don't shift surrounding layout.

---

## 9. Spacing System

A 4px base unit, matching the border-radius table's discipline:

| Token | Value |
|---|---|
| `--ph-space-1` | 4px |
| `--ph-space-2` | 8px |
| `--ph-space-3` | 12px |
| `--ph-space-4` | 16px |
| `--ph-space-5` | 20px |
| `--ph-space-6` | 24px |
| `--ph-space-8` | 32px |
| `--ph-space-10` | 40px |
| `--ph-space-12` | 48px |

Every margin, padding, and gap value in new work should resolve to one of these. Arbitrary values (`7px`, `13px`, `18px` — all of which exist in the current codebase) are legacy debt this table exists to stop reproducing.

---

## 10. Motion Philosophy

1. **Feedback within one frame.** A tap must visibly register immediately, even if the "full" animation continues afterward.
2. **Nothing teleports.** State changes animate — briefly, but they animate.
3. **Spring for anything alive, ease for anything structural.** Liquid, celebrations, and rewards get overshoot/bounce. Panels, screens, and layout changes get clean deceleration.
4. **Motion shows causality.** A pour visibly flows from source to destination. A card that's dismissed visibly goes somewhere, it doesn't vanish.
5. **One hero animation per moment.** When several things could animate at once, one leads and the rest support it quietly (or don't move at all).
6. **Compositor-friendly, always.** Animate `transform` and `opacity`. Anything animating `width`, `height`, `box-shadow` spread, or `filter` blur radius needs a specific performance justification (see §19).
7. **State is authoritative; rendering and animation are downstream of it.**

   > The game state is the single source of truth. The rendered view may animate toward that state, but correctness must never depend on animation completion. Rendering is an implementation detail; animation is a visual representation of state, never a prerequisite for it.

   The invariant: state is authoritative, rendering reflects state, animation decorates rendering, and animation must never feed back into state or become part of gameplay correctness. A player should be able to disable every animation (`prefers-reduced-motion`, §22), interrupt one mid-flight, or run at very low frame rate, and the game must behave identically in every case — in principle, the entire game should be playable to completion with every animation disabled and every outcome identical.

   This is deliberately **renderer-agnostic**: it constrains the relationship between state and animation, not the rendering technology used to express it. Today that's plain DOM/CSS; nothing in this rule should have to change if a future game — or a future version of this one — renders via FLIP-style transforms, the View Transitions API, Canvas, or anything else. It is fine to briefly debounce input while an animation plays (an `animating`-style flag, purely for feel — already used in the shipped Water Sort implementation to prevent double-taps during the level-complete transition); it is never acceptable for correctness itself to depend on an animation's completion callback. This rule governs every phase that adds animation on top of Water Sort's already-verified gameplay logic, and every future game built against this system.

---

## 11. Motion Timing & Easing Tokens

| Token | Duration | Easing | Use |
|---|---|---|---|
| `--ph-duration-micro` | 100ms | `ease-out` | Button press, immediate tap feedback |
| `--ph-duration-fast` | 180ms | `--ph-ease-standard` | Selection, small state changes |
| `--ph-duration-medium` | 380ms | `--ph-ease-spring` or `--ph-ease-decel` | Pours, transitions, reveals |
| `--ph-duration-celebratory` | 600ms | `--ph-ease-spring` | Level-complete entrance, big reveals |
| `--ph-duration-ambient` | 3000ms | `ease-in-out`, infinite | Background particle drift, idle glow pulse |

| Easing token | Value | Character |
|---|---|---|
| `--ph-ease-standard` | `cubic-bezier(.4,0,.2,1)` | Clean, neutral — structural transitions |
| `--ph-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Overshoot/bounce — anything alive or celebratory |
| `--ph-ease-decel` | `cubic-bezier(.22,1,.36,1)` | Smooth deceleration, no bounce — reveals that shouldn't feel bouncy |

**Rule:** no blocking transition the player is waiting on exceeds ~700ms. Ambient loops are exempt since they're non-blocking background motion.

---

## 12. Glass Material Language

"Glass" is a defined recipe, not a vibe:

```
background: var(--ph-bg-glass);
backdrop-filter: blur(10px);
border: 1px solid rgba(255,255,255,.1);
box-shadow: var(--ph-shadow-1),
            inset 0 1px 0 rgba(255,255,255,.08);
border-radius: var(--ph-radius-md);
```

The inset top highlight is what sells "glass" rather than "translucent rectangle." Glass is used for **containers**: cards, panels, modals, tube walls, tray backgrounds. It is never used for gameplay content itself (§13) or for small controls (§14) — mixing materials arbitrarily is exactly the inconsistency this system exists to prevent.

Performance note: `backdrop-filter` is one of the more expensive CSS properties on mid-range Android. See §19 for budget limits.

---

## 13. Gameplay Material Language

Gameplay *content* — the thing the player is actually manipulating — is never rendered as flat UI. It belongs to one of these archetypes:

- **Liquid** — a vertical gradient (lighter top → richer bottom), a specular highlight arc near the surface, a soft rounded meniscus at the top edge, glow bleeding into whatever contains it. Used for: potions, gauges, any "fill" content.
- **Solid block / tile** — a flat-topped 3D-ish surface: light top face, darker side/bottom bevel implying thickness, soft drop shadow beneath. Used for: block-puzzle pieces, match-tile content.
- **Card** — a rounded rectangle with a subtle paper-like top highlight and a crisp edge, distinct from glass (opaque, not translucent) and from solid blocks (thinner, no bevel). Used for: card-game content.
- **Orb / gem** — radial highlight offset toward the key light corner, saturated core color, soft outer glow. Used for: match-3 style gameplay pieces, collectible content.
- **Stone / engraving** — an **opaque, matte, textured** surface, the deliberate opposite of glass (translucent) and crystal (faceted, sharp specular). Light does not reflect off stone in a sharp highlight — it *grazes* a rough surface diffusely, so premium here comes from **carved depth and fine mineral grain**, not shine. Three defining traits: (1) a subtle **surface grain** — generated with a self-contained SVG `feTurbulence` data-URI (`--ph-stone-grain`), no image asset and no build step — blended low-opacity over the base so it reads as rock, not a flat fill; (2) **beveled carved edges** that catch the single top-left key light on their upper lip and pool shadow in the recess (§4/§6 inset), giving a chiseled — not drawn — division of the surface; (3) two content sub-forms that are materially distinct: **intaglio** (engraved / debossed) content is *cut into* the stone — cool, dim, matte, permanent, part of the material itself (used for given/static symbols), while **inscribed light** content *ignites* — an emissive, warm glyph seated in a carved socket, and it is the one saturated, high-contrast element the eye is drawn to (used for player-placed symbols). Used for: rune/tablet grids, carved-symbol content, ancient/temple genres. **Currently unused — reserved for the planned "Gölge Tapınak" dark theme.** Sudoku was built on this material and then moved off it (see *Parchment* below and `docs/GAMES/SUDOKU.md`); the tokens (`--ph-stone-*`) are kept rather than deleted so the recipe is ready when the dark variant ships. **If it is revived, the intaglio color must be darkened first:** as shipped, `--ph-engrave-cool` measured **1.05:1** against the stone surface (AA large-text threshold is 3.0) — the given digits were carried entirely by their 1px bevel shadow and were effectively unreadable in bright light. That failure is the single strongest argument in this document for measuring contrast rather than trusting that a material "reads."

- **Parchment / inscription** — a warm, opaque, **light** surface: aged paper or vellum, lit by the same top-left key light but *reflecting* it softly and diffusely rather than pooling it in carved recesses. Where stone divides its surface by *cutting into* it, parchment divides by **drawing on** it — hairline gold rules between cells, heavier gold rules between regions — so the sheet stays visually continuous, like a real page. It reuses the same material-neutral grain data-URI as stone (`--ph-stone-grain`, greyscale noise that becomes whatever fiber the surface needs: mineral in stone, paper in parchment). Two content sub-forms: **printed** content is dark ink, permanent, part of the page (given/static symbols), while **inscribed** content is warm gold-brown — visibly added by the player, but at the *same* legibility as the printed layer, never dimmer. Used for: page/tablet grids, written-symbol content, arcane/scholarly genres. This is **Sudoku's material** — its "different state of matter" in the shared universe: where Water Sort is flowing **liquid** in glass and Block Puzzle is kinetic **crystal**, Sudoku is a still, luminous **page**. Same night sky, same key-light direction — different matter. The lesson stone taught is baked into this archetype: **the reference information the player scans constantly must be the most readable thing on screen**, not the most atmospheric. Sudoku's given digits now measure 10.99:1 and player digits 4.93:1 against the page.

- **Conduit / energy channel** — a **linear** material: light *travelling through* a thin glass channel. Every other archetype in this list is a discrete object occupying an area; this one is a *path*, and that is exactly why it needed its own entry rather than being stretched onto Orb (radial by definition) or Solid block (opaque, area-filling). Built as four concentric strokes on one shared path, outermost to innermost: **glow** (very wide, very transparent — light bleeding into the surrounding air), **casing** (dark and narrow — the boundary that keeps two adjacent conduits from merging into one blob), **core** (deep hue — the glass wall), **filament** (bright and very thin — the energy actually flowing). The dark casing is load-bearing, not decorative: without it, a dense board of parallel channels reads as a single lit mass. **No SVG blur filter** — at ~19 simultaneous conduits, per-element `feGaussianBlur` violates §19's rule against `filter` on many elements; a wide transparent stroke buys the same read for free. Used for: arrow/flow/pipe content, anything where the gameplay object *is* a route. This is **Arrow's material**; its second consumer is the planned `flowConnect`, which is the same content type. Same night, same key light — but where Water Sort's liquid *sits* in a vessel and Sudoku's page *holds* a mark, a conduit *carries* something through itself.

Every future game picks the archetype matching its content type rather than inventing an eighth. This section is deliberately forward-looking past Water Sort — it's what keeps the eventual ~100-game catalog visually coherent.

**A light surface inside a dark app is allowed.** Parchment was the first archetype to break the platform's dark-everywhere assumption, and it works because only the *material* went light — the sky underneath it did not. The game screen is still `.ph-scene` with `phAtmosphere()` over it; the app-shell header still sits on night. What changed is the thing the player manipulates. That is the general rule: **a game may light up its own matter, never the shared universe around it.**

---

## 14. UI Component Language

| Component | Material | Radius | Elevation |
|---|---|---|---|
| Primary button | Soft-solid | `--ph-radius-sm` or `-full` (pill) | 2 |
| Secondary/icon button | Soft-solid, lower contrast | `--ph-radius-sm` | 2 |
| Card / panel | Glass | `--ph-radius-md` | 1 |
| Chip / badge | Soft-solid, small | `--ph-radius-xs` or `-full` | 1 |
| Modal / overlay | Glass (heavier blur) + scrim | `--ph-radius-lg` | 4 |
| Progress / gauge track | Glass (inset) | `--ph-radius-full` | — (inset, not elevated) |
| Progress / gauge fill | Liquid or gradient soft-solid | `--ph-radius-full` | — |

"Soft-solid" (used for buttons/chips, not defined yet above): a subtle top-to-bottom light gradient (top edge lighter by ~8–10%), `--ph-shadow-2`, and a scale-to-0.94 on `:active`. This is a third material, distinct from glass and gameplay content — reserved specifically for controls the player presses.

---

## 15. Interaction Language

A fixed vocabulary, reused by every future game rather than reinvented per-title:

- **Selection:** lift (`translateY(-10px` to `-14px)`) + accent-color glow ring + scale to `1.03`. `--ph-duration-fast`, `--ph-ease-standard`.
- **Valid-target hint:** once something is selected, everything it could legally act upon gets a gentle pulsing neutral-glow ring (`--ph-duration-ambient`, low amplitude). Teaches the interaction without text.
- **Press/tap:** immediate scale-to-`0.94` on `pointerdown`, spring back on release. `--ph-duration-micro`.
- **Denied/invalid:** short horizontal shake (±6px, 2–3 cycles, `--ph-duration-fast`) + brief `--ph-error-glow` flash + a short low tone. Implemented once as `phShake()` (§20.3) — a game never re-tunes this timing itself.
- **Undo:** motion reverses along the same path the forward action took, at `--ph-duration-fast` rather than the forward action's `--ph-duration-medium` — undo should read as brisk/corrective, not a replay. Must be visually distinct from a fresh forward action, never the same animation with different framing.

---

## 16. Success / Error Language

- **Success (small, e.g. a single correct move):** brief gold flash + a floating `+N` numeral rising and fading (`--ph-duration-medium`) + a short rising tone.
- **Success (large, e.g. level/game complete):** the one moment the system is deliberately loud. Scale-in with pronounced spring overshoot, a short particle burst (§17), a gold wash across the completing element, a fanfare tone. `--ph-duration-celebratory`.
- **Error:** the shake + flash + tone pattern from §15, always the same recipe regardless of game — a player should recognize "that was wrong" identically in every game on the platform.

---

## 17. Particle Philosophy

Particles exist to punctuate the few moments that deserve emphasis (§16's large-success case, milestone moments) — never as ambient decoration competing with gameplay, and never on every minor interaction.

- **Default technique: DOM + CSS**, matching the one existing precedent in the codebase (`screwPuzzle`'s particle burst). Each particle is an absolutely-positioned div animating `transform`/`opacity` only, self-removing after its animation completes.
- **Two-tier budget.** A single cap turned out to be the wrong shape once a game had a genuine hero moment (Block Puzzle's line clear). The tiers are:
  - **Ambient / micro — hard cap 12–16 per burst.** Unchanged, and it is the default. Covers success pings, contact feedback, transfer dots — anything that fires *often*. Block Puzzle's placement contact sparks sit here (capped at 14, max 3 per contact edge).
  - **Hero — hard cap ~48 elements per effect family, and only for a moment that is (a) rare, (b) the emotional peak of the loop, and (c) not repeatable within ~1s.** A line clear qualifies; a piece placement does not. The point of the tier is *layering*, not volume: Block Puzzle's clear spends its budget across shards / stardust / glyphs / a sweep / a flash — five things that each say something different — rather than 48 identical dots. **"More layers, not more particles" is the rule the tier exists to enable.**
- **Caps apply to the total, not per source cell.** A 4-line clear covers 32 cells; a per-cell allowance would quadruple the real cost. Block Puzzle distributes its cap across cells (`SHARD_CAP / cellCount`, clamped 1–5).
- **Measured, not assumed.** The hero tier was validated before being written down: 26 placements / 6 line clears in Block Puzzle peaked at **68 simultaneous effect elements** (40 shards + 22 stardust + glyphs/sweep/flash, including overlap between consecutive clears) with **zero long tasks (>50ms)** recorded by `PerformanceObserver`. Re-measure before raising these numbers again; this budget is a measurement, not a preference.
- Keep particle glow cheap regardless of tier — small blur radius, or omit glow on individual particles and rely on one shared glow behind the whole burst.
- **Ambient background motion** (e.g. drifting light motes behind a game's play area) uses a small, fixed particle count (8–12), long duration (`--ph-duration-ambient` or slower), low opacity — atmosphere, not spectacle.
- **Escalation path:** if a future game's effects genuinely can't be achieved with DOM particles at acceptable frame rates (e.g., hundreds of particles, a full-screen effect), Canvas 2D is available as a native, zero-dependency escape hatch — but it is not the default, and adopting it for a specific game is a deliberate decision to make explicitly, not a default reached for casually.

---

## 18. Audio Philosophy

Audio is 100% synthesized via the existing `GameAudio` Web Audio engine — there are no recorded/sampled audio assets in this app, and this system does not propose adding any (see §20).

- **Every semantic interaction (§15/§16) gets a consistent sound identity reused across all games** — the same "denied" tone means the same thing everywhere, the same "win" fanfare means the same thing everywhere. A new game reaches for the existing SFX palette (`tap`, `pour`, `match`, `error`, `win`, `star`, etc.) before proposing a new synthesized sound.
- **Haptics are part of the audio language, not a separate afterthought** — every meaningful sound event pairs with a haptic pattern from the existing `HAPTIC_PATTERNS` table where the target device supports vibration.
- **Honest ceiling:** fully synthesized oscillator/noise audio has a real richness ceiling compared to sampled instruments — it will never sound like a licensed music bed or a recorded foley library. The system leans into this rather than fighting it: sounds are clean, minimal, and precise (matching "tactile precision") rather than attempting lush/orchestral, which synthesis can't deliver convincingly.

---

## 19. Performance Guidelines

Performance is treated as a design constraint (§2.7), enforced concretely:

- **Animate `transform` and `opacity` only**, by default. Anything else (`width`, `height`, `box-shadow` spread/blur, `filter`) must be justified per-use, not looped or applied to many simultaneous elements.
- **`backdrop-filter` budget: at most 1–2 simultaneous instances on screen.** It is one of the more expensive properties on mid-range Android GPUs. Keep blur radius ≤ 12px. Always have a solid-color fallback for browsers/devices where it's disabled or degraded.
- **Particle hard caps** as defined in §17.
- **DOM-update discipline:** interactions that affect only part of a screen (a single pour, a single tap) patch only the affected DOM nodes — not a full-container `innerHTML` rebuild. Full rebuilds are reserved for coarse-grained transitions (level load, screen change), matching the pattern already established in `waterSort`'s pour handling.
- **No animation loop should run indefinitely once its purpose is served** — ambient loops pause when their screen isn't visible/active (matching the existing Discover feed's pause-on-scroll-away lifecycle already implemented via `IntersectionObserver`).
- **Test target: mid-range Android** (not just the developer's desktop Chrome or a high-end iPhone). If it isn't smooth there, it isn't done.

---

## 20. CSS & JS Architecture Strategy

Tokens alone don't make a system reusable — they make *values* reusable. Getting *components and behavior* reused (not just colors and durations) requires two more layers, both new relative to the first draft of this document:

### 20.1 Tokens — `core/design-tokens.css`

All tokens in this document are implemented as CSS custom properties on `:root`, defined once in **`core/design-tokens.css`**, loaded via a `<link>` tag in `index.html` before `style.css`. Plain CSS, no build step, no preprocessor.

### 20.2 Shared components — `core/components.css`

A second, separate global stylesheet holding the **actual implementations** of §12–§14's recipes as reusable classes — `.ph-glass-card`, `.ph-btn-primary`, `.ph-btn-secondary`, `.ph-chip`, `.ph-modal`, `.ph-liquid-fill` — each built once, referencing the tokens from §20.1. A game uses `<div class="ph-glass-card">`, it does not paste the glass recipe into its own `injectStyle` block. This is what actually prevents 50 games from each hand-rolling a slightly-different button.

Loaded via its own `<link>` tag, after `design-tokens.css` and before `style.css` (component classes reference tokens; nothing in `style.css` or a game's own CSS should need to override them, only extend with game-local classes alongside).

### 20.3 Shared behavior — JS utilities

Several patterns in §15–§17 are inherently behavioral, not just visual: a particle burst has to generate and clean up DOM nodes; a deny-shake has to be triggered and reset; a celebration sequence has to sequence audio, particles, and an overlay together. Left undocumented, every game reimplements these independently — which has already happened once (`screwPuzzle`'s `particles()`/`floatText()`/`screenShake()` and `waterSort`'s separately-written `denyFeedback()` are the same idea, built twice).

A small shared module — extending the existing shared-helpers area of `games.js` (where `injectStyle`/`addEv`/`clearEvs` already live) or a new `core/ui-kit.js` loaded alongside it — exposes the reusable primitives:

| Function | Replaces | Used by |
|---|---|---|
| `phShake(el)` | screwPuzzle's `denyScrew`, waterSort's `denyFeedback` | Any invalid-action feedback (§15) |
| `phParticleBurst(container, x, y, colorToken, count)` | screwPuzzle's `particles()` | Any success moment (§16), capped per §17 |
| `phFloatText(container, text, x, y, colorToken)` | screwPuzzle's `floatText()` | Score deltas, `+N` feedback |
| `phTransfer(fromEl, toEl, opts)` | *(new — nothing like this exists yet)* | Any "object moves from A to B" motion — Water Sort's pour, a future merge game's orb, a future card game's deal |
| `phStaggerIn(elements, delayStep)` | *(new)* | Any grid/list entrance animation |
| `phShowCelebration({ title, subtitle, sfx })` | *(new — currently spec'd inline in WATER_SORT.md §14)* | Every game's level/session-complete moment |

**What qualifies for `core/ui-kit.js`:**

> A shared primitive should exist only when it represents a capability that is genuinely reusable across multiple games, not because one game happens to need it. Water Sort can be the first consumer of a new primitive, but every shared utility must be designed with at least one other plausible future use case in mind.

The six functions above pass this test — each is either already duplicated (`phShake` replaces two independent implementations) or has a concrete second consumer in mind (`phTransfer` is Water Sort's pour today, a future merge game's orb-to-orb motion or a card game's deal tomorrow; `phParticleBurst`/`phFloatText`/`phShowCelebration` are needed by *any* game's success moment, not specifically Water Sort's; `phStaggerIn` is needed by any grid/list entrance).

**What stays game-local**, even living right next to these primitives in a game's own code: Water Sort's glass tube rendering, its liquid meniscus rendering, any tube-specific visual effect, any Water-Sort-specific CSS recipe, and generally any helper whose behavior is tightly coupled to one game's particular mechanics. `screwPuzzle`'s `screenShake`/`isCovered`/board-layout helpers stay exactly where they are — nothing about them is reusable, only coincidentally similar-sounding.

The goal is for `core/ui-kit.js` to be a genuine platform layer that would still make sense if Water Sort didn't exist — not a collection of Water Sort helpers that happen to carry a `ph` prefix. If a proposed addition can't name a second plausible consumer, it belongs in the game's own file, not here.

### 20.4 Token governance

Tokens are **additive by default** — a new game needing a value not yet in §3–§11's tables adds it there (with the same review scrutiny as any shared change), it doesn't invent an inline one-off value in its own CSS. Changing an *existing* token's value is a platform-wide visual decision (it touches every game already using it) and should be treated as one, not made casually while working on a single game.

---

## 21. Naming Conventions

- **Design tokens:** `--ph-<category>-<name>`, e.g. `--ph-radius-md`, `--ph-shadow-2`, `--ph-ease-spring`. `ph` matches the existing `ph_` prefix convention already used for localStorage keys (`ph_screw_level`) — one consistent platform prefix across CSS variables, storage keys, and (going forward) any other shared identifier.
- **Shared component classes** (§20.2, `core/components.css`) use the `ph-` prefix — `.ph-glass-card`, `.ph-btn-primary` — signaling "this is platform infrastructure, not this game's own markup."
- **Game-local component classes** stay **game-scoped**, using each game's existing short prefix convention (`sp2-`, `bp-`, `wsrt-`, etc.) — this doesn't change for anything genuinely specific to one game. The rule that matters: **reading a class name should tell you whether it's shared or local without opening the CSS file.** A class with no `ph-` prefix and no recognizable game prefix is a naming bug, not a style choice.
- **Shared JS utilities** (§20.3) use a `ph`-camelCase prefix (`phShake`, `phParticleBurst`) for the same reason — visually distinct from a game's own private closure functions.
- **Keyframe animations:** remain **game-prefixed** (`spPulse`, `wsrtDeny`, etc.) even though `@keyframes` names are global in CSS — this is already the existing convention and prevents cross-game keyframe name collisions without needing any new tooling (CSS has no native namespacing).
- **New shared keyframes** (ones genuinely meant for reuse across games, e.g. a standard "shake" or "pop-in") are prefixed `ph-` instead of a game prefix, and defined once in `design-tokens.css` alongside the custom properties.

---

## 22. Accessibility Considerations

- **`prefers-reduced-motion` is honored platform-wide.** Non-essential motion (ambient particle drift, decorative glow pulses, large celebratory overshoot) is reduced or removed for players with this OS-level preference set; functional feedback (a pour happening, a selection changing) still occurs, just with shorter/simpler transitions rather than spring overshoot. This is a pure CSS media query — zero cost, zero new dependency, and should be treated as non-optional for every new component.
- **Colorblind consideration for the gameplay palette (§3.5):** at 8 simultaneous hues, some pairs (Tangerine/Gold, Violet/Rose) are hard to distinguish for common forms of color vision deficiency. For any game where color is the *sole* differentiator of gameplay state (Water Sort included), an optional secondary cue — a subtle icon, pattern, or shape per color — should be considered, not just a prettier palette. This is flagged as a real gap, not solved by this document alone.
- **Touch targets:** minimum 44×44px for any tappable element, per standard mobile HIG guidance — relevant wherever content scales down at higher difficulty/density (e.g., many small tubes or tiles on screen at once).
- **Contrast:** `--ph-text-primary` and `--ph-text-secondary` against `--ph-bg-0`/`--ph-bg-1` meet WCAG AA for body text. Gameplay content colors are not held to text-contrast standards themselves, but any text rendered *on top of* gameplay content color must be checked individually.

---

## 23. Responsive Scaling Rules

PuzzleHub is mobile-first and portrait-oriented, but the same screens are also viewed on tablets and desktop browsers during development/testing — the system should degrade gracefully rather than just clipping at a fixed max-width.

- **Fluid sizing via `clamp()`** for anything that should scale smoothly across the phone width range (roughly 360px–480px) rather than jumping between fixed breakpoints — zero dependency, well-supported, matches the "no build step" constraint.
- **A single content max-width** (currently `380px`, matching existing game containers) caps growth on tablet/desktop rather than letting gameplay content stretch to fill unrealistic widths.
- **Density-adaptive layout**, not fixed-size content: when a game's content count varies by difficulty (more tubes, more tiles), the *container* adapts (via `clamp()` sizing and wrap behavior) rather than the individual pieces staying a fixed size and producing awkward overflow/wrapping, which is a concrete gap in the current Water Sort implementation this system is meant to close.

---

## 24. Building a New Game Against This System

A short checklist, meant to keep the per-game specification documents (`docs/GAMES/*.md`) short — a new game's doc should describe what's genuinely novel about it, not restate the platform system. Before writing a game-specific recipe for anything, check in this order:

1. **Is there a token for this value?** (§3–§11) Use it. Don't invent a nearby number.
2. **Is there a shared component for this element?** (§20.2 — buttons, cards, chips, modals) Use it. Don't rebuild the recipe in the game's own `injectStyle`.
3. **Is there a shared JS utility for this behavior?** (§20.3 — shake, particles, transfer, stagger, celebration) Call it. Don't reimplement it.
4. **Only if none of the above cover it** — this is genuinely game-specific, and belongs in that game's own `docs/GAMES/<NAME>.md`, scoped to *only* the novel part. A per-game doc should be able to say "buttons use the standard §14 primary button, unmodified" in one line rather than re-describing what a button looks like.

---

## Implementation Constraints

This section exists because ambition without an honest stack check produces a document nobody can actually build from. Our stack is vanilla JavaScript, HTML, and CSS, no build step, no frameworks, no external rendering engines, and no new dependencies without an explicit decision. Everything in this document above is written to be achievable within that constraint. Specifically:

- **No animation library.** Every motion token (§11) is implemented as CSS transitions/`@keyframes` or minimal hand-rolled `requestAnimationFrame` loops (already the existing pattern for `screwPuzzle`'s screen-shake) — never a dependency like GSAP or Framer Motion.
- **No Lottie/After-Effects pipeline.** Celebratory animations (§16) are built from CSS transforms, gradients, and DOM-based particles (§17) — not exported motion-graphics assets, which would require a runtime player library we don't have and aren't adding.
- **No canvas-by-default.** Canvas 2D is native to the browser and technically permissible under "no external rendering engines," but it introduces a genuinely new rendering paradigm (manual redraw loops, DPI handling) not used anywhere in the current codebase. It's named in §17 as an escalation option, not adopted as a default — introducing it for a specific game should be its own explicit decision, the same way any new pattern is.
- **Sampled audio is allowed, but conditionally — this constraint was relaxed deliberately.** It originally read "no sampled audio," and §18 is still written around the synthesized `GameAudio` engine's real ceiling. That engine remains **the default for lightweight UI feedback** (taps, toggles, navigation, toasts): zero bytes, zero latency, zero licensing risk. Licensed external assets are permitted for **gameplay sounds, rewards, ambience, and special effects** where they provide a *measurable* quality improvement — not merely a plausible one. Every asset must be CC0/Public-Domain-equivalent, free of attribution requirements, documented in `AUDIO_DESIGN.md`, and approved before it enters the repo. Full policy: `CLAUDE.md` §6. This remains a no-dependency, no-build-step decision — audio files are plain assets fetched at runtime, not a library.
- **`backdrop-filter` is used sparingly and budgeted (§19),** not applied liberally, because it's a known performance risk on the actual target hardware (mid-range Android), not just a desktop-Chrome-tested nicety.
- **All tokens are plain CSS custom properties (§20.1)** — no CSS-in-JS, no preprocessor (Sass/Less), no PostCSS pipeline. This matches "no build step" exactly.
- **The shared component/utility layers (§20.2–20.3) are two more plain `.css`/`.js` files**, loaded the same way `style.css`/`games.js` already are — a `<link>` and a `<script src>` added to `index.html`'s existing chain. No module bundler, no dependency graph beyond what `loadScript` already does.

Nothing in this document requires a new npm dependency, a bundler, or a build step to implement.

# Water Sort — Design System Application

> **Status:** Built, and the code has since moved ahead of this document in the places listed under "Divergences" below. Where the two disagree, **the code is correct and this document is stale** — read those first.
> **Purpose:** Defines how Water Sort applies the platform system.

This document assumes familiarity with `docs/DESIGN_SYSTEM.md` and references its tokens (`--ph-*`) throughout rather than restating their values.

---

## 0. Divergences from this spec (read first)

These were deliberate decisions made while building, not oversights. Don't "restore" the spec's version without re-deciding.

- **Visual theme (§4, §5, §6, §7).** The spec's violet-glassmorphism-on-dark language went through a warm "night corner" phase (parchment/wood/copper + a per-level window scene) and now lands on **"magical night"**, then a **"wow" pass** built directly against a user-supplied reference mockup. Current state: full-bleed starry night sky (deep blue → violet), a crescent **moon** top-left, distant **mountain silhouettes** at the horizon behind the dais, soft light beams, drifting motes, and warm **fireflies** filling the lower "ground" zone. Tubes were enlarged ~18% (taller aspect), the glass made thicker/brighter (heavier rim, crystalline top highlight), and the liquid given a **gel/glow** treatment (side speculars + top gloss + volume shadow per layer, plus `saturate/brightness` on the whole column and a stronger colored base-glow bleeding onto the dais). The level label is a centered glass capsule. Rationale: the background must read as a *stage* while the tubes stay the only high-saturation, high-contrast thing on screen — the atmosphere fills the composition without competing.
- **Pour animation (§11).** The spec mandates the shared `phTransfer` droplet primitive. The code does **not** use it, and this is load-bearing: tilting a tube in place cannot produce a pour. Every tube sits on the same baseline, so rotating one about its bottom edge swings its mouth sideways *and down* — below the destination's rim (measured: mouth y=353 vs destination rim y=323). Liquid does not flow uphill. The tube therefore **lifts and travels over the destination** before tilting, and the mouth's landing point is *solved for* rather than measured — which also removes the whole class of bugs that came from calling `getBoundingClientRect()` on a mid-transition rotated element. The falling liquid is a bespoke tapered stream, not a generic A→B dot. See the comments above `pourTransform()`.
- **Liquid is a counter-rotated body; tilt is 45°.** *(Supersedes the earlier "tilt is capped at 32° because liquid layers rotate with the tube" note — that cap was never a design choice, it was the largest angle at which the broken physics stayed unnoticeable.)* The chamber (`.wsrt-tube-inner`) is now **only a clip mask** and still rotates with the tube; the liquid lives in `.wsrt-body`, which applies `rotate(-θ)` and so cancels the tube's rotation entirely. Net effect: **the liquid surface stays horizontal in world space at any tilt**, and what you see is that level body clipped by the tilted glass — which is what liquid in a tilted vessel actually is. Measured at 45°: tube +45.00°, body −45.00°, surface 0.000°.
  - **Cost of the counter-rotation:** a counter-rotated rectangle leaves the chamber's corners uncovered, so the body overhangs sideways by `--wsrt-spill-k` (3.4 × chamber width, sized for 45°) and is clipped back. Because the body is therefore ~7.8× the chamber's width, every percentage-based decoration inside it (side specular, meniscus ellipse, sheen) is rescaled to chamber space through `--wsrt-body-r`. **The two variables must change together.** At rest this is pixel-identical to the pre-change rendering — verified: the specular's remapped stops resolve to exactly 0/24/76/100% of the chamber.
  - **Volume conservation:** `scaleY(cos θ)` on the body. Without it, holding the fill height constant while levelling the surface makes a half-full tube look *fuller* when tilted — liquid appearing from nowhere, which reads as weightlessness. The bottom-most layer also bleeds 64px downward (`box-shadow`) to fill the low corner that drops below the body's baseline when the chamber tilts.
- **The falling stream lands on the destination's liquid surface, and its duration comes from that distance.** It used to stop at a fixed depth — 14% of the destination tube's height — regardless of how full that tube was, so pouring into an empty tube cut the stream off ~235px short and the liquid read as hanging at the mouth rather than falling. The end point is now solved from state (`chamber.bottom − preFill × 25% × chamber.height`) using the *pre-pour* fill, because `applyPourDOM` hasn't run yet and the destination still shows its old level. Three coupled corrections came with it, all serving the same "it isn't flowing" complaint:
  - **Duration is derived, not constant.** Fall distance ranges ~108px (destination 3/4 full) to ~306px (empty); a fixed 170ms made the stream crawl on one and dart on the other. Constant *speed* (`STREAM_PX_PER_MS`) is the correct model. The tail reuses the same speed for the same reason — a fixed tail duration meant two different gravities inside one pour.
  - **The leading edge accelerates.** It was on `--ph-ease-decel`, i.e. slowing down as it fell — the inverse of gravity, which made it read as stretching rubber rather than falling liquid.
  - **Width 15px → 26px.** `clip-path` cuts the funnel, so the *visible* stream was only 7.8px tapering to 3.6px — 14% down to 6% of the tube's width. Invisible as a tail once the fall got long.
- **Weight comes from a deliberate timing mismatch, not from a physics sim.** The body's rotation transitions on a *different* curve and duration than the tube's, so the surface lags the glass and settles with a small overshoot. This is the whole of the "liquid has mass" cue. The curve is **per leg**, and that matters: the tube travels on `--ph-ease-decel` (fast start) but returns on `--ph-ease-standard` (slow start), so a single shared spring made the body *outrun* the tube on the return and the surface deviated up to 27° — reintroducing the exact bug being fixed, on the way back. Measured peak surface deviation is now 3.6° outbound, 5.4° on return, 0.00° for the whole duration of the actual pour, with a 1.9° settle overshoot.
- **Combo (§ not specified).** "Streak" counts **consecutive tube completions**, not pours inside a time window. A puzzle must never punish thinking; tempo comes from sound/animation/atmosphere instead. Resets only on undo.
- **Liquid segment fills use a base color + gel lighting, not the 3-stop jewel gradient (§6).** A per-unit *color* gradient made each unit read as a separate block, so the base stays flat `currentColor`; the gel look comes instead from lighting that's uniform across the column — side speculars, an inset top gloss and bottom volume-shadow per layer, plus a column-wide `saturate/brightness` on `.wsrt-tube-inner`. Same principle as before (stacked units must read as one body), now with the glow the "wow" pass needed.

---

## 1. Overall Layout

The play screen is composed of three layers, back to front:

1. **Atmosphere layer** — full-bleed behind everything (§4).
2. **Platform layer** — the floating glass dais holding the tubes (§3).
3. **Content layer** — tubes, control bar, overlays.

Vertically, the composition is **centered**, not top-anchored the way the current implementation is. The tube tray sits in the visual middle of the available game area, with the control bar (level label, undo, restart) directly above it as part of the same visual "module" — not a disconnected strip pinned to the top of an otherwise-empty screen. There is no large dead zone below the tubes; the platform and atmosphere fill the remaining vertical space so the screen reads as composed, not sparse.

---

## 2. Adaptive Tube Sizing

Tube width and gap are **not fixed** — they respond to how many tubes the current level has, using `clamp()` (§DESIGN_SYSTEM §23) rather than a single hardcoded `44px`:

- Tube width: `clamp(38px, calc((100% - (tubeCount - 1) * gap) / min(tubeCount, 6)), 56px)` — conceptually: tubes size themselves to fill the available tray width assuming at most ~6 comfortably fit per row, clamped to a sensible min/max so they never become illegibly thin or comically oversized.
- At low tube counts (3–5, early levels), tubes are large and generously spaced — the tray never looks sparse because the tubes themselves grow to fill it, rather than staying small in a mostly-empty container.
- At high tube counts (9–10, later levels), the tray wraps to two rows, but the two rows are **centered as a balanced group** (via `justify-content: center` on each row and equal-width row containers), not left-shifted with a short second row — the current implementation's specific flaw.
- Tube height stays proportional to width (a fixed aspect ratio, not an independent fixed pixel height) so tubes never look squat or overly elongated at either extreme.

---

## 3. Floating Platform

The tube tray sits on a **glass dais** — this is the shared `.ph-glass-card` component (§DESIGN_SYSTEM §20.2), not a new material invented for Water Sort: `--ph-radius-lg`, elevation 1, sized to the tray's bounding box with some breathing room. The only Water-Sort-specific addition is a soft ambient glow bleeding outward in the violet accent color at low opacity — layered on top of the shared component via a game-local class, not baked into the shared recipe itself (a glow that specific belongs to this game, not to every card on the platform). This is what gives the tubes something to visually "stand on" rather than floating disconnected against the raw app background — it's the single biggest structural fix versus the current flat layout.

---

## 4. Background Atmosphere

Behind the platform, a continuation of the existing Discover-demo language, evolved rather than discarded:

- A subtle radial gradient wash (violet, very low opacity) centered behind the platform, giving the screen depth.
- 8–12 slow-drifting light motes (§DESIGN_SYSTEM §17, ambient particle budget), using the existing `_wsFloat`-style keyframe from the Discover demo as a starting point, tuned to `--ph-duration-ambient` timing and low opacity so they read as atmosphere, not foreground content.
- This layer is present **before the player does anything** — it's what makes the first frame feel alive, per the design philosophy's explicit requirement.
- Atmosphere pauses (via the same visibility-driven pattern already used by the Discover feed's `IntersectionObserver` lifecycle) if the tab/screen isn't active, so it never burns battery/CPU off-screen.

---

## 5. Glass Rendering (tube walls)

Each tube follows the Glass material recipe (§DESIGN_SYSTEM §12) adapted for a tall, narrow, open-topped container:

- Visible wall thickness via a double-layer approach: an outer rounded-rect (the tube body, glass recipe) and an inner rounded-rect inset by ~3px (transparent, revealing the liquid), rather than the current single flat div with a border.
- A vertical gloss highlight strip along one edge (kept from the current implementation — it's the one piece of the existing tube rendering that already works) — but now paired with a matching, fainter highlight on the opposite edge to imply cylindrical roundness rather than a flat panel.
- A soft rim highlight at the open top lip of the tube.
- Tube glass tint uses `--ph-bg-glass` at a slightly higher opacity than standard UI glass (tubes need to read as containers holding something, not as content themselves).

---

## 6. Liquid Rendering

Each color segment follows the Liquid material recipe (§DESIGN_SYSTEM §13):

- Vertical gradient using the 3-stop jewel-tone token (highlight → base → shadow, §DESIGN_SYSTEM §3.5) instead of the current flat 2-stop `color`/`color+cc`.
- The **topmost segment in a tube** (the exposed surface) gets a soft rounded meniscus — a subtle concave-curve highlight at its top edge — so it reads as the surface of a fluid rather than the top of a stacked block. Segments beneath it stay flat-topped (they're not exposed to "air").
- A soft glow (using the segment's own glow token) bleeds faintly into the tube glass immediately around the liquid — this is what sells "the glass is lit by what's inside it," tying directly to the Lighting Model's ambient-glow rule.
- Segment boundaries within a tube remain distinct (players need to read color groupings at a glance) but get a very subtle horizontal highlight line at each boundary rather than a hard flat edge, implying a slight surface tension between layers.

---

## 7. Lighting

Single key light, top-left, applied consistently:

- Tube glass highlight strip sits on the top-left-facing edge.
- Liquid specular highlight arcs are biased toward the same corner.
- The platform's ambient glow is strongest near its top edge, fading toward the bottom, implying the same light source is what's illuminating the whole module.
- The control bar buttons (soft-solid material, §DESIGN_SYSTEM §14) get their standard top-edge catch-light, consistent with every other button on the platform.

---

## 8. Particles

Two distinct particle uses, both within the §DESIGN_SYSTEM §17 hard cap:

- **Ambient atmosphere** (§4 above) — continuous, low-count, low-opacity, paused off-screen. This is a continuous loop, not a one-shot burst, so it stays game-local rather than going through the shared burst utility below — genuinely different lifecycle, not a case of skipping reuse for no reason.
- **Event-triggered bursts** — calls the shared `phParticleBurst(container, x, y, colorToken, count)` utility (§DESIGN_SYSTEM §20.3), not a bespoke implementation: 10–14 particles tinted to the relevant liquid's jewel-tone token at the moment a tube becomes fully solved (mid-level micro-celebration, §14 below), and the full 12–16-particle cap at level completion. Water Sort supplies the container/position/color; the burst mechanics themselves are shared with every other game that has a success moment.

---

## 9. Tube Selection

Matches the Interaction Language (§DESIGN_SYSTEM §15) exactly:

- On tap: lift `translateY(-12px)`, scale to `1.03`, accent-color (`--ph-accent`) glow ring appears around the tube's base. `--ph-duration-fast`, `--ph-ease-standard`.
- On deselect (tapping the same tube again): reverse the same transition.
- This replaces the current implementation's flat lift-with-no-glow — the glow ring is new and is what visually confirms "this is the active selection," not just its position.

---

## 10. Valid Target Indication

**New behavior, not present in the current implementation**, directly required by the Interaction Language's valid-target-hint rule (§DESIGN_SYSTEM §15):

- The instant a tube is selected, every other tube that is a **legal pour destination** gets a gentle pulsing neutral-glow ring (soft white/cyan, low amplitude, `--ph-duration-ambient` loop) around its base.
- Tubes that are *not* legal targets stay visually quiet — no ring, no glow — so the set of good options is obvious without any text or tutorial.
- This recalculates on every selection change (cheap: it's a small loop over already-known tube state, not a DOM-heavy operation).

---

## 11. Pouring Animation

This is the hero motion of the whole game and the largest single change from the current implementation (which has no pour animation at all).

**Revised from the original draft of this spec**, which described a curved liquid "ribbon" hand-shaped to arc between the source tube's mouth and the destination tube's rim. That's a real geometry problem once tube positions are adaptive (§2) and can wrap across rows (§DESIGN_SYSTEM §16 flagged this as underspecified hidden complexity) — a shape that has to look right whether the two tubes are adjacent or on opposite ends of a wrapped 10-tube layout is a meaningfully harder, more fragile thing to build than the rest of this spec, for a payoff that a simpler technique achieves almost as well.

The revised sequence uses the shared `phTransfer(fromEl, toEl, opts)` primitive (§DESIGN_SYSTEM §20.3) instead:

1. **Tilt** (`--ph-duration-fast`): the source tube rotates a few degrees toward the destination around its base, `transform-origin: bottom center`. Direction (left/right lean) is a simple sign check on the two tubes' horizontal position — no path geometry involved.
2. **Transfer**: `phTransfer` reads both tubes' positions **once**, via `getBoundingClientRect()`, and animates a small liquid-colored droplet element by a `transform: translate(dx, dy)` computed from that single delta — a straight interpolation, not a hand-shaped curve. This is correct and equally simple regardless of whether the two tubes are adjacent or across a row-wrap, because a translate delta doesn't care about the path in between. A slight vertical dip at the midpoint (one extra keyframe) is enough to read as "arcing" without needing real curve math.
3. **Fill + settle** (`--ph-duration-medium`, `--ph-ease-spring`): the destination tube's liquid level rises with a small overshoot-and-settle bounce, rather than snapping to its final height instantly.
4. **Tilt back**: the source tube returns to vertical, timed to finish roughly as the transfer completes.

Total sequence duration stays within `--ph-duration-medium`-to-`--ph-duration-celebratory` range (roughly 400–600ms). Every stage animates `transform`/`opacity` only, keeping the whole sequence compositor-friendly per §DESIGN_SYSTEM §19 — and because `phTransfer` is a shared primitive, this exact technique is what a future merge game's orb-to-orb motion or a card game's deal animation reuses too, rather than each building its own version of "make something fly from A to B."

If a pour moves more than one unit (multi-layer pour), the fill+settle stage's final height simply reflects the full moved amount — the transfer/tilt choreography doesn't repeat per-unit, it's one motion regardless of how many units transfer.

---

## 12. Undo Animation

Per the Interaction Language's rule that undo must feel distinct from a forward action (§DESIGN_SYSTEM §15):

- The exact reverse of the pour sequence (§11), played in reverse order: destination liquid recedes first, then `phTransfer` runs destination→source, then the source tube's level rises back to its prior state.
- Runs at `--ph-duration-fast` rather than the forward pour's `--ph-duration-medium` (this is the standard undo-timing rule from §DESIGN_SYSTEM §15, not a Water-Sort-specific ratio) — undo should feel brisk/corrective, not like replaying the same moment.
- No tilt on undo — the "rewind" reads through the reverse liquid motion alone, keeping it visually distinguishable from a forward pour rather than just "the same animation played backward."

---

## 13. Restart Animation

Restart is a bulk operation (many pours undone at once, per the existing `restartLevel` implementation), so it does **not** play the full per-move undo animation for every step — that would be slow and visually noisy for a multi-move restart. Instead:

- A brief, decisive **wipe**: all tubes fade toward transparent (`--ph-duration-fast`, opacity only) while their contents silently reset to the level's starting state, then fade back in together with a slight synchronized scale-up-from-0.96 (`--ph-ease-decel`).
- This is deliberately a different visual language from undo (gradual/reversing) — restart should feel final and immediate, not like watching history rewind.

---

## 14. Celebration Sequence

Two tiers, matching the Success Language (§DESIGN_SYSTEM §16):

**Micro (a single tube becomes solved, mid-level):** the completed tube gets a brief gold-tinted glow pulse and a small particle puff (§8) — acknowledges progress without interrupting play.

**Full (level complete):** calls the shared `phShowCelebration({ title, subtitle, sfx })` utility (§DESIGN_SYSTEM §20.3) with Water Sort's level number and bonus score — the sequencing itself (panel entrance, particle burst, hold, dismiss) is shared platform behavior, not reimplemented per game:

1. Screen holds briefly on the final pour's settle before `phShowCelebration` is invoked.
2. The shared celebration handles panel entrance (`--ph-duration-celebratory`, `--ph-ease-spring`, over a `.ph-modal` glass overlay + scrim), the gold particle burst (via `phParticleBurst`, capped per §17), and hold/dismiss timing.
3. Water Sort supplies: `title` = "Seviye N Tamam!", `subtitle` = the bonus score, `sfx` = the existing `win`/`star` `GameAudio` pattern.
4. Title/subtitle render in the Display/Numeral type roles (§DESIGN_SYSTEM §8) as part of the shared component — not something each game re-styles.
5. Total time from solve to next-level-ready stays under ~2s (a shared constant inside `phShowCelebration`, not a per-game tuning knob) so no game's loop feels padded relative to another's.

---

## 15. Level Transition

New levels don't simply appear via `innerHTML` replacement:

- Outgoing tubes fade + scale down slightly as the celebration panel takes over the screen.
- Incoming tubes for the new level **stagger in** via the shared `phStaggerIn(elements, delayStep)` utility (§DESIGN_SYSTEM §20.3) — each tube scales up from 0.9 with `--ph-ease-spring`, offset by a fixed per-element delay owned by the shared utility, not re-tuned per game. The tray "arrives" as a considered sequence rather than popping into existence all at once.
- This staggered entrance is also what plays on the very first level load / game open — it's the mechanism that makes the screen feel "alive before the player interacts," per the design philosophy, rather than a static initial render. Any future game with a grid/list of pieces reaches for the same `phStaggerIn` call rather than re-deriving stagger timing from scratch.

---

## 16. Responsive Behaviour

- Tube sizing follows §2's `clamp()`-based adaptive approach across the full supported phone width range.
- The glass platform (§3) and atmosphere layer (§4) scale proportionally with the content max-width (`380px` cap, §DESIGN_SYSTEM §23) rather than stretching edge-to-edge on wider viewports.
- Control bar buttons maintain the 44×44px minimum touch target (§DESIGN_SYSTEM §22) regardless of overall scale.
- `prefers-reduced-motion`: the pour sequence collapses to a fast cross-fade (no tilt/stream/overshoot), the celebration panel appears with a simple fade instead of spring overshoot, and ambient particles/atmosphere motion stop entirely — functional feedback remains, decorative motion doesn't.

---

## 17. Performance Considerations

- Pour, undo, and restart animations (§11–13) all animate `transform`/`opacity` exclusively — no layout-triggering properties in the hot path of gameplay interaction.
- The tilt+stream+settle pour sequence runs on a **single** tube pair at a time (pours are sequential, one player action each) — there is no scenario where many pours animate simultaneously, keeping worst-case concurrent animation cost bounded regardless of tube count.
- Particle bursts stay within the 12–16 hard cap (§8) even at the full-level celebration tier.
- The platform glass panel (§3) is the only `backdrop-filter` surface active during normal play; the celebration overlay's glass panel (§14) only appears after gameplay interaction has paused, so there is never more than one `backdrop-filter` layer animating at the same time — staying within the §DESIGN_SYSTEM §19 budget of 1–2 simultaneous instances.
- Adaptive tube sizing (§2) is computed via CSS (`clamp()`), not recalculated in JS on every render — sizing responds to viewport/content changes for free, without extra per-frame JS cost.

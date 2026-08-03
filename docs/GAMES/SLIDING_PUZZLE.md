# Resim Kaydır (`jigsawCard`) — Sliding Puzzle

Per-game specification. Only what is **genuinely novel** about this game is documented
here; everything else uses the platform systems unmodified (see `DESIGN_SYSTEM.md` §24).

Built in phases: **1** engine · **2** image + level system · **3** SlySwipe theme ·
**4** polish · **5** content & scale. Phases 1–2 are done.

---

## 1. Why the tiles are CSS, not canvas

The image is split with **`background-position` percentages**, never drawn to a canvas:

```
background-size     : (N*100)%          → image scales to exactly the board
background-position : c/(N-1)*100%      → percentage positioning aligns the image's
                      r/(N-1)*100%        X% point with the tile's X% point
```

The `N-1` divisor is the part that is easy to get wrong — it is **not** `N`. Percentage
background positioning maps *the image's X% point onto the container's X% point*, so the
last tile needs 100%, which means dividing by `N-1`.

Because every value is a percentage, alignment is exact at **any** pixel size: no
remeasuring on resize, no rounding seams, no broken edges, and retina sharpness comes free
(the browser scales a 1200 px source into a ≤460 px board — 2.6× oversampling).

Verified end-to-end: a 3×3 board solved via real taps reassembles the photograph
seamlessly.

## 2. Movement rule — stricter than a classic 15-puzzle

**Only tiles orthogonally adjacent to the blank move.** Classic sliding puzzles let you tap
a distant tile in the blank's row and shift the whole run; this game deliberately does not.
Tapping a non-adjacent tile is silently ignored. Tested: same-row-far, same-column-far,
diagonal, and edge-wrap are all rejected.

## 3. Solvability is structural, not checked

`shuffle()` starts from the solved board and applies only **legal moves**, so a solution
always exists by construction — the reverse of the shuffle. The parity approach was
deliberately not used: on even-width boards it must also account for the blank's row, and
getting it subtly wrong yields an unsolvable board with no visible symptom.

Verified two independent ways: 3000 shuffles (1000 per size) all pass an independent parity
check, and 300 random 3×3 boards were actually solved with A* (longest optimal solution 29
moves, against a theoretical maximum of 31).

## 4. Level system

`planFor(level) → { level, size, image }`. Board size is the only difficulty lever.

| Levels | Size |
|---|---|
| 1–10 | 3×3 |
| 11–30 | 3×3 → 4×4, **ramped** (4×4 probability rises 0 → 1 across the band) |
| 31–70 | 4×4 |
| 71+ | 5×5 |

**Image rotation.** The pool is reshuffled each *epoch* (one epoch = one pass through the
pool) and consumed in order, so an image never repeats until the pool is exhausted.
Epochs are **not** independent: the previous epoch's second half is pushed to the back of
the next one. Without that, the tail of one epoch lands at the head of the next — measured
at 174 early repeats in 400 levels, including one back-to-back.

A gap of a full pool length is **mathematically impossible** while the order varies: it
would require every image to hold the same position in every epoch, i.e. a fixed rotation.
The achievable guarantee is ~half the pool, and that is what is enforced and tested
(measured minimum gap: 8 levels with an 11-image pool; zero back-to-back).

Adjacent levels also never share a category, enforced by a de-clustering pass that reaches
across the epoch boundary.

## 5. Image policy — the part that needs a human

Images are data. Growing to 1000+ levels means adding rows to `IMAGE_POOL`, nothing else.

**Approved themes:** nature (forest, mountain, lake, waterfall, sunset), cityscapes,
anime-style illustration (clothed, safe), fantasy landscapes, cyberpunk cities, pixel art
scenes, Japanese streets, castles, space and galaxies, flowers, animals, digital art.

**Rejected outright:** photographs of **real people** — portraits, faces, or any shot where
an identifiable person is the subject; **nudity**; violence, blood, horror; low resolution;
visible text or watermarks; memes, adverts, collage-style images.

**Owner's standard on suggestiveness (revised):** mild suggestiveness in *illustrated*
characters is acceptable **provided there is no nudity**. Two practical consequences follow,
and both are the owner's call to accept:

1. **It changes the whole app's store rating, not just this game.** Google Play and the App
   Store rate suggestive content into a higher age band, and SlySwipe ships as one app —
   the Discover feed, daily rewards and streaks all target a broad casual audience. A single
   image in one game sets the rating for the hub.
2. **The three approved sources barely carry this material.** Unsplash, Pexels and Pixabay
   content policies largely exclude it. Sourcing it means art-sharing or image-board sites,
   whose licensing is unclear — which fails the commercial-safety bar in §5 regardless of
   how well the artwork fits the theme.

Illustrated/anime characters are permitted where a real person's photograph is not, but the
subject must be the **art and composition**, not the character's body. The real-person rule
is separate from the sexualisation rule and applies even to an entirely innocuous portrait:
a stock licence covers the photograph, not the depicted person's likeness, and a player's
puzzle is no place for a stranger's face. Incidental distant figures in a street or
landscape scene are fine; a person as *the subject* is not.

**Also rejected for puzzle reasons:** flat sky, plain walls, single-colour fields, empty
compositions. They have nothing to solve against.

### Every image must be approved by eye before it lands

URL health is **not** curation. Of the first 14 candidates, all 14 returned 200 with a
correct square crop at full resolution, and **three still had to be cut**:

| Photo | Labelled | Actually | Why cut |
|---|---|---|---|
| `1507003211169` | minimal | a man's face | a recognisable person's likeness |
| `1470071459604` | nature | almost entirely sky | no focal point |
| `1439405326854` | ocean | almost entirely sky | no focal point |

A 21% failure rate from URL-only vetting. The content rules above are *visual* criteria and
cannot be checked from a URL, a filename, or a search keyword — this matters most for the
anime/fantasy themes, where the cost of a wrong pick is not a boring puzzle.

**Workflow:** collect candidates → render them into a contact sheet (a grid of all
candidates at once, which is how the three above were caught) → a human approves → only
then add rows to `IMAGE_POOL`. This mirrors the audio policy in `CLAUDE.md` §6: assets are
approved *before* they enter the repository, never speculatively.

### Licensing

Unsplash, Pexels and Pixabay licences all permit commercial use with **no attribution
requirement** — the same bar the audio policy sets. Sources with unclear licensing
(art-sharing and image-board sites) are out, regardless of how well the artwork fits.

## 6. Not built yet

- **Theme** (Phase 3). The current CSS is deliberately bare — plain blue tiles, system
  font. Target look is the two owner-supplied mockups: dark faceted background, neon
  gradient board frame, rounded tiles with gaps, glass HUD capsule.
- **Registration is intentionally partial.** In `GAME_MAP` and `GAME_NAME_MAP` only.
  `PUZZLE_GAMES` (home) and `REEL_GAMES.playable` (Discover) open in Phase 3 — showing
  players an unstyled board is worse than not showing it.
- Phase 4: move animation, press feedback, audio, haptics, win animation, confetti,
  3-star screen. Phase 5: image packs, daily puzzle, event puzzles.
- **Offline.** Images are remote and runtime-cached by the service worker's media bucket.
  A cold start with no network falls back to numbered tiles — the game stays playable, but
  the image system has not been tested against a flaky connection.

# Roller-Coaster Movement — Design

**Date:** 2026-06-21
**Status:** Approved, ready for implementation plan

## Goal

Make travel through the corridor feel like a roller coaster instead of a flat,
gently-curving tunnel. Players should feel themselves climb hills, surge down
the far side, and get flung through periodic loops — starting with a "launch"
loop at the very beginning of every run.

## Background

All movement in the game derives from pure functions in `src/content/endless.ts`.
Today the only track-shape function is `pathOffsetX(distance)`, the lateral
meander. Everything else reads from it:

- **Corridor geometry** (`src/renderer/scene.ts`): `curveX(d, z)` bends the
  rungs, edges, and floor lines laterally; the camera banks (`rotation.z`) into
  turns.
- **Entities** (`src/game/session.ts`): `currentX(e)` offsets each obstacle by
  `pathOffsetX(e.baseZ) - pathOffsetX(distance)` so it rides the same path.
- **Speed** (`speedAt(distance)`): a gentle baseline ramp plus a free-floating
  `sin` surge, applied in `Session.update` as `BASE_SPEED * speedAt(d) * dt`.
- **Speed-line juice** (`src/main.ts`): reads `speedAt` to set the speed-line
  intensity.

The game is endless/distance-driven; "later levels" means deeper into a run,
where `difficultyAt(distance)` is higher.

There is currently **no vertical dimension** to the track and the camera never
pitches or rolls.

## Design decisions (from brainstorming)

- **Speed coupling:** asymmetric. Climbing stays at today's baseline speed;
  descending produces a real momentum surge proportional to steepness (clamped).
- **Loop behavior:** obstacle-free thrill interludes. No obstacles or gates
  during a loop. Implemented as a camera barrel-roll, *not* rebuilt geometry.
- **Hill intensity:** builds up over distance — gentle rolling terrain early,
  steep coaster hills deeper in.
- **Loop placement:** an intro "launch" loop at the very start of every run
  (before the level begins), then periodic loops thereafter for rhythm.

## Architecture

New work lives as **pure functions in `endless.ts`** (matching the existing
`difficultyAt` / `speedAt` / `pathOffsetX` style), then is wired into the
renderer and session. Three parts.

### Part 1 — Vertical track profile (the hills)

Add a pure function mirroring `pathOffsetX`:

```ts
// endless.ts
export function pathOffsetY(distance: number): number;
```

- Sum-of-sines shape (like `pathOffsetX`) whose **amplitude ramps with
  distance**: near 0 at the start (gentle), growing to steep hills deeper in.
  Output is in world units (the corridor spans `FLOOR_Y = -2.4` to
  `CEIL_Y = 5.6`, camera at `y = 1`), so amplitude on the order of ~0.5 units
  early rising to ~3 units late is a sane starting range, to be tuned.

Wiring:

- **Corridor geometry** (`scene.ts`): add `curveY(d, z) = pathOffsetY(d - z) -
  pathOffsetY(d)`, exactly parallel to the existing `curveX`. Apply it to the Y
  coordinate of the rungs, the four longitudinal edges, and the floor grid lines
  (longitudinal and lateral). The whole tube rises and dips ahead of the player.
- **Entities** (`session.ts`): add `currentY(e) = e.y + (pathOffsetY(e.baseZ) -
  pathOffsetY(distance))` and use it for the collider box Y in `colliders()`.
  Because the rendered mesh derives from the same collider box, aiming stays
  exact regardless of vertical offset.

### Part 2 — Camera pitch + speed momentum

- **Camera pitch** (`scene.ts`, in `setScroll`): set `camera.rotation.x` from
  the slope of the track just ahead, `pathOffsetY(d + 12) - pathOffsetY(d)`,
  scaled and clamped — the same technique as the existing bank that sets
  `rotation.z` from `pathOffsetX`. The player looks up while climbing and noses
  down over a crest. (Sign convention to be confirmed during implementation so
  "up the hill" tilts the view up.)

- **Speed momentum** (`endless.ts`, `speedAt`): replace the current
  free-floating `sin` surge with one **driven by the actual track slope**, so
  the surge aligns with what the player sees:
  - Compute local slope from `pathOffsetY` (e.g. a small finite difference).
  - Climbing (slope ≥ 0): return today's baseline ramp speed — no extra surge.
  - Descending (slope < 0): add a surge proportional to steepness, clamped to a
    thrilling-but-fair maximum.
  - The baseline distance ramp (`1 + distance / 4500`, capped at 1.4) is
    retained.
  - Side effect (desirable): the speed-line juice in `main.ts`, which already
    reads `speedAt`, intensifies automatically on descents.

### Part 3 — Loops (intro launch + periodic breaks)

A pure scheduler keeps renderer and session in sync with **no shared mutable
state**:

```ts
// endless.ts
export function loopPhase(distance: number): number | null;
// null  -> normal corridor
// 0..1  -> progress through a loop interlude
```

Schedule:

- **Intro loop** at distance `[0, LOOP_LENGTH)`: a barrel-roll "launch" that
  plays as the run begins, before any obstacles/gates exist.
- **Periodic loops** thereafter at a regular distance interval (every ~N
  meters), each spanning `LOOP_LENGTH` of clear corridor.

Wiring:

- **`session.ts`:** while `loopPhase(distance)` is non-null over a stretch,
  suppress entity and gate spawns in `generateAhead` for that z-range (a
  guaranteed clear corridor) and apply a speed surge. The intro loop occupies
  `[0, LOOP_LENGTH)`; normal generation resumes after it.
- **`scene.ts`:** when `loopPhase` is non-null, drive `camera.rotation.z`
  through a full 360° barrel roll across the loop's `0..1` progress (eased in and
  out), paired with a steep vertical swoop. The world spins around the player;
  because the stretch is obstacle-free there is nothing to aim at.
- **Audio:** a whoosh SFX on loop entry (reuse existing audio plumbing).

#### Why a barrel-roll and not a geometric loop

The corridor is a line-based **height-map**: each z has a single Y via
`pathOffsetY`. A true over-the-top vertical loop is multi-valued in z and would
require representing the track as a 3D spline and rebuilding the corridor mesh
generation — a much larger change. The camera barrel-roll reads as a loop
thrill, is obstacle-free so it can't break aiming, and is small and isolated.
True geometric loops can be revisited later if desired.

## Interactions / things to keep correct

- **Aiming under pitch:** throws are camera-relative (`createThrow` uses the
  camera). Both the camera ray and the entity colliders shift consistently with
  the vertical profile, so aiming at a visible obstacle still hits it.
- **Aiming during loops:** loops are obstacle-free, so the barrel roll cannot
  make targets unreachable.
- **Existing lateral curve and bank:** unchanged; the vertical work is additive
  and parallel to it.

## Testing

Pure functions get unit tests alongside the existing `endless` / `physics`
suites:

- `pathOffsetY`: amplitude grows with distance (later samples have larger
  swing than early ones).
- `speedAt`: no surge above baseline while climbing; surge present and bounded
  while descending; baseline ramp retained and capped.
- `loopPhase`: returns a valid `0..1` progress over `[0, LOOP_LENGTH)` (the
  intro loop); `null` between loops; cycles at the expected periodic interval.

Geometry, camera pitch/roll, and audio wiring are verified by running the game.

## Files touched

- `src/content/endless.ts` — add `pathOffsetY`, `loopPhase`; rework `speedAt`.
- `src/renderer/scene.ts` — `curveY`, camera pitch, loop barrel-roll.
- `src/game/session.ts` — `currentY` on colliders; suppress spawns during loops;
  loop speed surge.
- `src/main.ts` — only if loop entry needs to trigger the whoosh SFX.
- Test files for `endless` — new cases for the functions above.

Small, isolated, and consistent with the existing pure-function-plus-wiring
pattern.

## Out of scope (YAGNI)

- True geometric (multi-valued) vertical loops.
- Obstacles placed inside loops.
- Loops or hills affecting score/economy beyond the speed surge's indirect
  effect on pacing.

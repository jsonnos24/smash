# Roller-Coaster Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make corridor travel feel like a roller coaster — climb hills, surge down the far side, and get flung through periodic loops (starting with a launch loop at the very beginning of every run).

**Architecture:** All track shape lives as pure functions in `src/content/endless.ts` (like the existing `pathOffsetX`). Add a vertical profile `pathOffsetY`, a slope helper `trackSlope`, slope-coupled `speedAt`, and a `loopPhase` scheduler. The renderer (`scene.ts`) and session (`session.ts`) read these to bend geometry vertically, pitch/roll the camera, ride entities on the hills, surge speed downhill, and clear the corridor during loops.

**Tech Stack:** TypeScript, three.js (r160), Vite, Vitest.

## Global Constraints

- TypeScript strict; `npm run build` runs `tsc --noEmit && vite build` and must pass.
- No new runtime dependencies (only `three`).
- Track-shape logic stays as **pure functions** in `src/content/endless.ts`, matching the style of `difficultyAt` / `speedAt` / `pathOffsetX` (no shared mutable state).
- `pathOffsetX(0) === 0` and `pathOffsetY(0) === 0` (run starts centered/level).
- Loop constants: `LOOP_LENGTH = 60` (meters of clear corridor per loop), `LOOP_INTERVAL = 500` (meters between loop starts). Loop n starts at `n * LOOP_INTERVAL`; n=0 is the intro loop at distance 0.
- Test runner: `npx vitest run <file>` for a single file.

---

### Task 1: Vertical hill profile `pathOffsetY`

**Files:**
- Modify: `src/content/endless.ts` (add `pathOffsetY` after `pathOffsetX`)
- Test: `src/content/endless.test.ts` (add a `describe` block)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function pathOffsetY(distance: number): number` — vertical track height in world units; `pathOffsetY(0) === 0`; amplitude ramps from ~0.4 early toward ~3.0 by ~1800m; bounded by ~3.1.

- [ ] **Step 1: Write the failing test**

Add to `src/content/endless.test.ts` (also extend the import on line 2 to include `pathOffsetY`):

```ts
import { difficultyAt, speedAt, pathOffsetX, pathOffsetY } from "./endless";

describe("pathOffsetY", () => {
  it("is 0 at the start, stays bounded, and its amplitude grows with distance", () => {
    expect(pathOffsetY(0)).toBeCloseTo(0, 6);
    // bounded everywhere
    for (let d = 0; d <= 3000; d += 37) {
      expect(Math.abs(pathOffsetY(d))).toBeLessThanOrEqual(3.1);
    }
    // a full early cycle has a smaller peak than a full late cycle (hills build up)
    const peak = (lo: number, hi: number) => {
      let m = 0;
      for (let d = lo; d <= hi; d += 4) m = Math.max(m, Math.abs(pathOffsetY(d)));
      return m;
    };
    expect(peak(1600, 1920)).toBeGreaterThan(peak(0, 320));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/endless.test.ts`
Expected: FAIL — `pathOffsetY is not a function` / not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `src/content/endless.ts` (below `pathOffsetX`):

```ts
/** Vertical height of the track at path-distance s — rolling hills that grow steeper deeper in. */
export function pathOffsetY(distance: number): number {
  const d = Math.max(0, distance);
  const amp = 0.4 + Math.min(2.6, d / 700); // ramps 0.4 → 3.0 by ~1820m
  const shape = 0.7 * Math.sin(d * 0.02) + 0.3 * Math.sin(d * 0.047);
  return amp * shape;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/endless.test.ts`
Expected: PASS (all blocks, including the existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/content/endless.ts src/content/endless.test.ts
git commit -m "feat: add vertical hill profile pathOffsetY"
```

---

### Task 2: Slope helper + downhill speed surge

**Files:**
- Modify: `src/content/endless.ts` (add `trackSlope`, rework `speedAt`)
- Test: `src/content/endless.test.ts` (add `trackSlope` block, update `speedAt` block)

**Interfaces:**
- Consumes: `pathOffsetY` (Task 1).
- Produces:
  - `export function trackSlope(distance: number): number` — forward slope of the track (positive = climbing, negative = descending).
  - Reworked `export function speedAt(distance: number): number` — baseline ramp (`min(1.4, 1 + distance/4500)`) plus a downhill-only surge bounded to ≤ 0.45; no surge while climbing.

- [ ] **Step 1: Write the failing test**

In `src/content/endless.test.ts`, **replace** the existing `describe("speedAt", ...)` block with the two blocks below (and add `trackSlope` to the import on line 2):

```ts
import { difficultyAt, speedAt, pathOffsetX, pathOffsetY, trackSlope } from "./endless";

describe("trackSlope", () => {
  it("is positive while the track climbs and negative while it descends", () => {
    // find a clearly climbing sample and a clearly descending sample
    let climbed = false, descended = false;
    for (let d = 50; d < 1000; d += 5) {
      if (trackSlope(d) > 0.01) climbed = true;
      if (trackSlope(d) < -0.01) descended = true;
    }
    expect(climbed).toBe(true);
    expect(descended).toBe(true);
  });
});

describe("speedAt", () => {
  it("starts near 1 and the baseline rises with distance, capped", () => {
    expect(speedAt(0)).toBeGreaterThanOrEqual(1);
    expect(speedAt(0)).toBeLessThan(1.5);
    expect(speedAt(5000)).toBeGreaterThanOrEqual(1.4);
    expect(speedAt(5000)).toBeLessThanOrEqual(1.4 + 0.45 + 1e-9);
  });

  it("never surges above the baseline while climbing, but surges while descending", () => {
    const baseline = (d: number) => Math.min(1.4, 1 + d / 4500);
    let sawDescentSurge = false;
    for (let d = 50; d < 1500; d += 5) {
      if (trackSlope(d) >= 0) {
        // climbing or flat → no surge above baseline
        expect(speedAt(d)).toBeCloseTo(baseline(d), 6);
      } else {
        if (speedAt(d) > baseline(d) + 0.05) sawDescentSurge = true;
      }
    }
    expect(sawDescentSurge).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/endless.test.ts`
Expected: FAIL — `trackSlope is not a function`, and the climbing/descending assertions fail against the current `sin`-surge `speedAt`.

- [ ] **Step 3: Write minimal implementation**

In `src/content/endless.ts`, add `trackSlope` and **replace** the existing `speedAt`:

```ts
/** Forward slope of the vertical track (positive = climbing, negative = descending). */
export function trackSlope(distance: number): number {
  const h = 1.5;
  return (pathOffsetY(distance + h) - pathOffsetY(distance - h)) / (2 * h);
}

/**
 * Forward speed: a gentle baseline ramp (1.0 → 1.4 over ~1800m). Climbing adds
 * nothing (stays at baseline); descending adds a real momentum surge proportional
 * to steepness, clamped so it stays fair.
 */
export function speedAt(distance: number): number {
  const base = Math.min(1.4, 1 + distance / 4500);
  const descent = Math.max(0, -trackSlope(distance)); // only downhill contributes
  const surge = Math.min(0.45, 1.6 * descent);
  return base + surge;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/endless.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/endless.ts src/content/endless.test.ts
git commit -m "feat: couple forward speed to track slope (downhill surge)"
```

---

### Task 3: Entities ride the hills (`currentY` in session)

**Files:**
- Modify: `src/game/session.ts` (add `currentY`, use it in `colliders`, `resolveHit`, `fireWeapon`; import `pathOffsetY`)
- Test: `src/game/session.test.ts` (add a test)

**Interfaces:**
- Consumes: `pathOffsetY` (Task 1).
- Produces: collider box Y centers and shatter/weapon FX positions are offset vertically by `pathOffsetY(e.baseZ) - pathOffsetY(distance)`, parallel to the existing horizontal `currentX`.

- [ ] **Step 1: Write the failing test**

Add to `src/game/session.test.ts` (extend the import on line 5 to include `pathOffsetY`):

```ts
import { START_BALLS, CHECKPOINT_SPACING, pathOffsetY } from "../content/endless";

it("entities ride the vertical hills as the player advances", () => {
  const s = new Session(ROOMS, "casual", cam(), 1, {}, 1500); // hilly distance
  const c0 = s.colliders().find((c) => c.kind === "obstacle");
  expect(c0).toBeDefined();
  const id = c0!.id;
  const z0 = c0!.box.getCenter(new Vector3()).z;
  const d0 = s.state.distance;
  const y0 = c0!.box.getCenter(new Vector3()).y;

  s.update(0.05); // small step: same entity still active, distance advanced

  const c1 = s.colliders().find((c) => c.id === id);
  expect(c1).toBeDefined();
  const d1 = s.state.distance;
  const y1 = c1!.box.getCenter(new Vector3()).y;

  const baseZ = d0 - z0; // worldZ = distance - baseZ  ⇒  baseZ = distance - worldZ (constant)
  const expectedDelta =
    (pathOffsetY(baseZ) - pathOffsetY(d1)) - (pathOffsetY(baseZ) - pathOffsetY(d0));
  expect(y1 - y0).toBeCloseTo(expectedDelta, 4);
  // and the hill actually moved it (non-trivial delta at this distance)
  expect(Math.abs(y1 - y0)).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/session.test.ts`
Expected: FAIL — `y1 - y0` is 0 (entities don't move vertically yet), so the `toBeCloseTo` / `toBeGreaterThan(0)` assertion fails.

- [ ] **Step 3: Write minimal implementation**

In `src/game/session.ts`:

1. Extend the import from `../content/endless` (line 8) to include `pathOffsetY`:

```ts
import { difficultyAt, speedAt, START_BALLS, MAX_BALLS, CHECKPOINT_SPACING, LOOKAHEAD, DOOR_HITS, GATE_GAP, pathOffsetX, pathOffsetY } from "../content/endless";
```

2. Add `currentY` next to `currentX` (after the `currentX` method, ~line 150):

```ts
private currentY(e: WorldEntity): number {
  return e.y + (pathOffsetY(e.baseZ) - pathOffsetY(this._state.distance));
}
```

3. In `colliders()`, replace the box construction so Y uses `currentY`. Change:

```ts
const ex = this.currentX(e);
const h = e.size;
out.push({
  id: e.id,
  kind: e.kind,
  box: new Box3(new Vector3(ex - h, e.y - h, z - h), new Vector3(ex + h, e.y + h, z + h)),
```

to:

```ts
const ex = this.currentX(e);
const ey = this.currentY(e);
const h = e.size;
out.push({
  id: e.id,
  kind: e.kind,
  box: new Box3(new Vector3(ex - h, ey - h, z - h), new Vector3(ex + h, ey + h, z + h)),
```

4. In `resolveHit`, change the `at` vector (line ~238) from `e.y` to `this.currentY(e)`:

```ts
const at = new Vector3(this.currentX(e), this.currentY(e), this.worldZ(e.baseZ));
```

5. In `fireWeapon`, change the `at` vector (line ~286) from `e.y` to `this.currentY(e)`:

```ts
const at = new Vector3(this.currentX(e), this.currentY(e), this.worldZ(e.baseZ));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/session.test.ts`
Expected: PASS (all blocks).

- [ ] **Step 5: Commit**

```bash
git add src/game/session.ts src/game/session.test.ts
git commit -m "feat: entities ride the vertical hill profile"
```

---

### Task 4: Corridor geometry bends vertically + camera pitch

**Files:**
- Modify: `src/renderer/scene.ts` (add `curveY`, apply to geometry Y, set `camera.rotation.x`; import `pathOffsetY`)

**Interfaces:**
- Consumes: `pathOffsetY` (Task 1).
- Produces: the rendered corridor (rungs, edges, floor) rises and dips with the hills, and the camera pitches toward the upcoming slope. No new exported symbols.

> No unit test: `scene.ts` is renderer/three.js code with no existing test coverage (verified by build + running the game), consistent with the codebase.

- [ ] **Step 1: Import `pathOffsetY`**

In `src/renderer/scene.ts`, extend the import on line 9:

```ts
import { pathOffsetX, pathOffsetY } from "../content/endless";
```

- [ ] **Step 2: Add a `curveY` helper**

Directly below the existing `curveX` method (~line 74):

```ts
/** Vertical offset of the corridor at corridor-local z, given player distance d. */
private curveY(d: number, z: number): number {
  return pathOffsetY(d - z) - pathOffsetY(d);
}
```

- [ ] **Step 3: Apply `curveY` to the rungs**

In `setScroll`, in the rung loop, after `const cx = this.curveX(d, z);` add `const cy = this.curveY(d, z);`, then add `+ cy` to the Y assignment. The loop becomes:

```ts
for (let i = 0; i < RUNGS; i++) {
  const z = ((d + i * SPACING) % CORRIDOR_DEPTH) - CORRIDOR_DEPTH;
  const cx = this.curveX(d, z);
  const cy = this.curveY(d, z);
  const base = i * 8 * 3;
  for (let v = 0; v < 8; v++) {
    this.corridorRungPositions[base + v * 3 + 0] = rungXSign[v] * w + cx;
    this.corridorRungPositions[base + v * 3 + 1] = (rungYIsCeil[v] ? CEIL_Y : FLOOR_Y) + cy;
    this.corridorRungPositions[base + v * 3 + 2] = z;
  }
}
```

- [ ] **Step 4: Apply `curveY` to the longitudinal edges**

In the edge loop, add a `cy0`/`cy1` per segment and add them to the two Y writes:

```ts
for (let s = 0; s < EDGE_SEGS; s++) {
  const z0 = NEAR_Z - s * EDGE_SEG_LEN;
  const z1 = NEAR_Z - (s + 1) * EDGE_SEG_LEN;
  const cx0 = this.curveX(d, z0);
  const cx1 = this.curveX(d, z1);
  const cy0 = this.curveY(d, z0);
  const cy1 = this.curveY(d, z1);
  const off = edgeOffset + s * 2 * 3;
  this.corridorEdgePositions[off + 0] = xSign * w + cx0;
  this.corridorEdgePositions[off + 1] = baseY + cy0;
  this.corridorEdgePositions[off + 2] = z0;
  this.corridorEdgePositions[off + 3] = xSign * w + cx1;
  this.corridorEdgePositions[off + 4] = baseY + cy1;
  this.corridorEdgePositions[off + 5] = z1;
}
```

- [ ] **Step 5: Apply `curveY` to the floor grid (longitudinal + lateral)**

In the floor longitudinal loop, add `cy0`/`cy1` to the `FLOOR_Y` writes:

```ts
for (let s = 0; s < EDGE_SEGS; s++) {
  const z0 = NEAR_Z - s * EDGE_SEG_LEN;
  const z1 = NEAR_Z - (s + 1) * EDGE_SEG_LEN;
  const cx0 = this.curveX(d, z0);
  const cx1 = this.curveX(d, z1);
  const cy0 = this.curveY(d, z0);
  const cy1 = this.curveY(d, z1);
  const off = lineOff + s * 2 * 3;
  this.corridorFloorPositions[off + 0] = baseX + cx0;
  this.corridorFloorPositions[off + 1] = FLOOR_Y + cy0;
  this.corridorFloorPositions[off + 2] = z0;
  this.corridorFloorPositions[off + 3] = baseX + cx1;
  this.corridorFloorPositions[off + 4] = FLOOR_Y + cy1;
  this.corridorFloorPositions[off + 5] = z1;
}
```

And in the lateral floor loop, add `cy`:

```ts
for (let i = 0; i < RUNGS; i++) {
  const z = this.corridorFloorLateralZ[i];
  const cx = this.curveX(d, z);
  const cy = this.curveY(d, z);
  const off = latBase + i * 2 * 3;
  this.corridorFloorPositions[off + 0] = -w + cx;
  this.corridorFloorPositions[off + 1] = FLOOR_Y + cy;
  this.corridorFloorPositions[off + 2] = z;
  this.corridorFloorPositions[off + 3] =  w + cx;
  this.corridorFloorPositions[off + 4] = FLOOR_Y + cy;
  this.corridorFloorPositions[off + 5] = z;
}
```

- [ ] **Step 6: Pitch the camera toward the upcoming slope**

Right after the existing bank line (`this.camera.rotation.z = Math.max(-0.22, ...)`, ~line 233), add:

```ts
// Camera noses up climbing a hill and down over a crest.
const slopeAhead = pathOffsetY(d + 12) - pathOffsetY(d);
this.camera.rotation.x = Math.max(-0.3, Math.min(0.3, slopeAhead * 0.03));
```

- [ ] **Step 7: Typecheck + build**

Run: `npm run build`
Expected: PASS (no TypeScript errors; Vite build completes).

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open the printed local URL, start a run.
Expected: the corridor visibly rolls up and down like hills (more pronounced the deeper you go) and the camera tilts up approaching a rise. If the camera tilts the *wrong* way (down when climbing), negate the coefficient in Step 6 (`-slopeAhead * 0.03`). Confirm obstacles sit on the undulating floor, not floating.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/scene.ts
git commit -m "feat: corridor bends vertically over hills with camera pitch"
```

---

### Task 5: Loop scheduler `loopPhase`

**Files:**
- Modify: `src/content/endless.ts` (add `LOOP_LENGTH`, `LOOP_INTERVAL`, `loopPhase`)
- Test: `src/content/endless.test.ts` (add a `describe` block)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const LOOP_LENGTH = 60;`
  - `export const LOOP_INTERVAL = 500;`
  - `export function loopPhase(distance: number): number | null` — returns `0..1` progress while inside a loop stretch (the intro loop occupies `[0, LOOP_LENGTH)`; subsequent loops occupy `[n*LOOP_INTERVAL, n*LOOP_INTERVAL + LOOP_LENGTH)`), otherwise `null`.

- [ ] **Step 1: Write the failing test**

Add to `src/content/endless.test.ts` (extend the import to include `loopPhase`, `LOOP_LENGTH`, `LOOP_INTERVAL`):

```ts
import {
  difficultyAt, speedAt, pathOffsetX, pathOffsetY, trackSlope,
  loopPhase, LOOP_LENGTH, LOOP_INTERVAL,
} from "./endless";

describe("loopPhase", () => {
  it("plays an intro loop at the start of the run", () => {
    expect(loopPhase(0)).toBeCloseTo(0, 6);
    expect(loopPhase(LOOP_LENGTH / 2)).toBeCloseTo(0.5, 6);
    expect(loopPhase(LOOP_LENGTH - 0.001)).toBeGreaterThan(0.99);
  });

  it("returns null between loops", () => {
    expect(loopPhase(LOOP_LENGTH + 1)).toBeNull();
    expect(loopPhase(LOOP_INTERVAL - 1)).toBeNull();
  });

  it("plays a periodic loop at each interval", () => {
    expect(loopPhase(LOOP_INTERVAL)).toBeCloseTo(0, 6);
    expect(loopPhase(LOOP_INTERVAL + LOOP_LENGTH / 2)).toBeCloseTo(0.5, 6);
    expect(loopPhase(LOOP_INTERVAL + LOOP_LENGTH + 1)).toBeNull();
    expect(loopPhase(2 * LOOP_INTERVAL)).toBeCloseTo(0, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/endless.test.ts`
Expected: FAIL — `loopPhase is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/content/endless.ts`:

```ts
/** A loop occupies LOOP_LENGTH meters; one starts every LOOP_INTERVAL meters (n=0 is the intro loop at 0). */
export const LOOP_LENGTH = 60;
export const LOOP_INTERVAL = 500;

/** Progress (0..1) through a loop interlude at this distance, or null if not in a loop. */
export function loopPhase(distance: number): number | null {
  if (distance < 0) return null;
  const start = Math.floor(distance / LOOP_INTERVAL) * LOOP_INTERVAL;
  const into = distance - start;
  return into < LOOP_LENGTH ? into / LOOP_LENGTH : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/endless.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/endless.ts src/content/endless.test.ts
git commit -m "feat: add loopPhase scheduler (intro + periodic loops)"
```

---

### Task 6: Loops clear the corridor (spawn suppression)

**Files:**
- Modify: `src/game/session.ts` (skip spawns inside loop stretches in `generateAhead`; import loop symbols)
- Test: `src/game/session.test.ts` (add a test; update the construction test that assumed obstacles at distance 0)

**Interfaces:**
- Consumes: `loopPhase`, `LOOP_LENGTH`, `LOOP_INTERVAL` (Task 5).
- Produces: no entities or gates are generated inside any loop stretch; in particular the intro loop `[0, LOOP_LENGTH)` is a clear corridor at run start.

- [ ] **Step 1: Write the failing test + fix the assumption in the existing test**

In `src/game/session.test.ts`:

(a) Extend the import to include the loop symbols:

```ts
import { START_BALLS, CHECKPOINT_SPACING, pathOffsetY, LOOP_LENGTH } from "../content/endless";
```

(b) **Update** the existing first test ("generates rooms ahead on construction and starts playing"). At distance 0 the intro loop now clears the corridor, so advance past it before asserting obstacles exist. Replace that test body with:

```ts
it("generates rooms ahead and starts playing", () => {
  const s = new Session(ROOMS, "casual", cam(), 1);
  expect(s.state.status).toBe("playing");
  expect(s.state.balls).toBe(START_BALLS);
  expect(s.liveBalls.length).toBe(0);
  // intro loop clears the very start; advance past it, then content appears
  for (let i = 0; i < 200 && s.state.distance < LOOP_LENGTH + 20; i++) s.update(0.1);
  expect(s.colliders().length).toBeGreaterThan(0);
});
```

(c) Add a new test asserting the intro loop is clear:

```ts
it("keeps the intro loop stretch free of obstacles and gates", () => {
  const s = new Session(ROOMS, "casual", cam(), 1);
  // at distance 0 the active window covers the intro loop; nothing should be there
  expect(s.colliders().length).toBe(0);
  // advancing into the loop stays clear until past LOOP_LENGTH
  for (let i = 0; i < 5; i++) {
    s.update(0.1);
    if (s.state.distance < LOOP_LENGTH - 5) {
      expect(s.colliders().length).toBe(0);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/session.test.ts`
Expected: FAIL — the new "intro loop clear" test fails because rooms currently spawn from distance 0 (`colliders().length` is > 0).

- [ ] **Step 3: Write minimal implementation**

In `src/game/session.ts`:

1. Extend the `../content/endless` import (line 8) to include the loop symbols:

```ts
import { difficultyAt, speedAt, START_BALLS, MAX_BALLS, CHECKPOINT_SPACING, LOOKAHEAD, DOOR_HITS, GATE_GAP, pathOffsetX, pathOffsetY, loopPhase, LOOP_LENGTH, LOOP_INTERVAL } from "../content/endless";
```

2. In `generateAhead`, skip past any loop stretch before placing a room. Replace the `while` body's top:

```ts
private generateAhead(): void {
  while (this.frontZ < this._state.distance + LOOKAHEAD) {
    if (loopPhase(this.frontZ) !== null) {
      // Clear corridor through the loop: jump to its end, no entities, no gate.
      const start = Math.floor(this.frontZ / LOOP_INTERVAL) * LOOP_INTERVAL;
      this.frontZ = start + LOOP_LENGTH;
      continue;
    }
    const tmpl = pickRoom(this.rooms, difficultyAt(this.frontZ), this.rng);
    for (const e of tmpl.entities) {
      this.entities.push({
        id: this.nextEntityId++,
        kind: e.kind,
        baseZ: this.frontZ + e.z,
        x: e.x,
        y: e.y,
        size: e.size,
        hits: 1,
        consumed: false,
        motion: e.motion,
      });
    }
    this.frontZ += tmpl.length;
    this.pushGate(this.frontZ);
    this.frontZ += GATE_GAP;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/session.test.ts`
Expected: PASS (all blocks, including the updated construction test and the existing checkpoint/door tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/session.ts src/game/session.test.ts
git commit -m "feat: loops clear the corridor of obstacles and gates"
```

---

### Task 7: Loop barrel-roll + whoosh SFX

**Files:**
- Modify: `src/renderer/scene.ts` (drive `camera.rotation.z` roll during loops; import `loopPhase`)
- Modify: `src/audio/audio.ts` (add `"loop"` to the `Sfx` union)
- Modify: `src/audio/webaudio.ts` (play a beefier whoosh for `"loop"`)
- Modify: `src/game/session.ts` (add `onLoopStart` event, fire on loop entry)
- Modify: `src/main.ts` (wire `onLoopStart` → `audio.playSfx("loop")`)
- Test: `src/game/session.test.ts` (assert `onLoopStart` fires; the intro loop fires it immediately)

**Interfaces:**
- Consumes: `loopPhase` (Task 5).
- Produces:
  - `Sfx` union includes `"loop"`.
  - `SessionEvents.onLoopStart?: () => void` — fired once each time the run enters a loop stretch (including the intro loop on the first update).

- [ ] **Step 1: Write the failing test (session loop event)**

Add to `src/game/session.test.ts`:

```ts
it("fires onLoopStart when entering a loop (intro loop fires immediately)", () => {
  let starts = 0;
  const s = new Session(ROOMS, "casual", cam(), 1, { onLoopStart: () => { starts++; } });
  s.update(0.1); // already inside the intro loop at distance ~0
  expect(starts).toBe(1);
  // run until we leave the intro loop and hit the next periodic loop; it fires again
  for (let i = 0; i < 20000 && starts < 2; i++) s.update(0.05);
  expect(starts).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/session.test.ts`
Expected: FAIL — `onLoopStart` is not part of `SessionEvents` (type error) / never called.

- [ ] **Step 3: Add the `onLoopStart` event and fire it on loop entry**

In `src/game/session.ts`:

1. Add to the `SessionEvents` interface (~line 27):

```ts
onLoopStart?: () => void;
```

2. Add a tracking field next to the other private fields (~line 57):

```ts
private _inLoop = false;
```

3. In `update`, after `this._state = { ...this._state, distance: newDistance };` and before `this.generateAhead();`, detect loop entry:

```ts
const inLoop = loopPhase(newDistance) !== null;
if (inLoop && !this._inLoop) this.events.onLoopStart?.();
this._inLoop = inLoop;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `"loop"` SFX (failing test first)**

In `src/audio/audio.test.ts`, add:

```ts
it("plays the loop whoosh after unlock", () => {
  const play = vi.fn();
  const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
  am.unlock();
  am.playSfx("loop");
  expect(play).toHaveBeenCalledWith("loop");
});
```

Run: `npx vitest run src/audio/audio.test.ts`
Expected: FAIL — `"loop"` is not assignable to `Sfx`.

- [ ] **Step 6: Extend the `Sfx` union and synth**

In `src/audio/audio.ts`, line 4, add `"loop"`:

```ts
export type Sfx = "throw" | "shatterGlass" | "shatterCrystal" | "crash" | "powerup" | "checkpoint" | "loop";
```

In `src/audio/webaudio.ts`, add a longer/deeper whoosh method (below the existing `whoosh`, ~line 56):

```ts
private loopWhoosh(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer(ctx, 0.7);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
  bp.frequency.exponentialRampToValueAtTime(300, t + 0.65);
  bp.Q.value = 1.0;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
  src.connect(bp); bp.connect(g); g.connect(this.master!);
  src.start(t); src.stop(t + 0.72);
}
```

And add a case in `play` (~line 128):

```ts
case "loop": this.loopWhoosh(ctx, t); break;
```

Run: `npx vitest run src/audio/audio.test.ts`
Expected: PASS.

- [ ] **Step 7: Drive the barrel-roll in the renderer**

In `src/renderer/scene.ts`:

1. Extend the import on line 9 to include `loopPhase`:

```ts
import { pathOffsetX, pathOffsetY, loopPhase } from "../content/endless";
```

2. In `setScroll`, **replace** the existing bank line (~line 233) so the loop roll overrides the bank while in a loop:

```ts
// Camera banks into turns — but a loop overrides it with a full barrel roll.
const lp = loopPhase(d);
if (lp !== null) {
  const e = lp * lp * (3 - 2 * lp); // smoothstep: ease in/out through the roll
  this.camera.rotation.z = e * Math.PI * 2;
} else {
  const aheadOff = pathOffsetX(d + 12) - pathOffsetX(d);
  this.camera.rotation.z = Math.max(-0.22, Math.min(0.22, -aheadOff * 0.05));
}
```

- [ ] **Step 8: Wire the SFX in main.ts**

In `src/main.ts`, add `onLoopStart` to the `SessionEvents` object passed to `new Session(...)` (alongside `onShatter`, `onCheckpoint`, etc., ~line 146):

```ts
onLoopStart: () => { audio.playSfx("loop"); },
```

- [ ] **Step 9: Typecheck, build, full test run**

Run: `npm run build && npx vitest run`
Expected: PASS — TypeScript clean, Vite build completes, all tests green.

- [ ] **Step 10: Manual verification**

Run: `npm run dev`, start a run.
Expected: the run opens with a full 360° barrel roll and a whoosh while the corridor ahead is clear of obstacles; normal play begins right after. Around every 500m another clear barrel-roll loop plays. Hills and downhill speed surges continue between loops.

- [ ] **Step 11: Commit**

```bash
git add src/renderer/scene.ts src/audio/audio.ts src/audio/webaudio.ts src/game/session.ts src/game/session.test.ts src/audio/audio.test.ts src/main.ts
git commit -m "feat: loop barrel-roll camera + whoosh SFX"
```

---

## Self-Review

**Spec coverage:**
- Vertical hill profile `pathOffsetY` → Task 1. ✓
- Amplitude builds with distance → Task 1 (amp ramp) + test. ✓
- Corridor geometry bends vertically → Task 4. ✓
- Entities ride the hills → Task 3. ✓
- Camera pitch from slope → Task 4 (Step 6). ✓
- Asymmetric speed (baseline uphill, surge downhill) → Task 2. ✓
- Speed-line juice intensifies on descent → automatic via reworked `speedAt` read in `main.ts` (existing line 84); no change needed. ✓
- `loopPhase` scheduler (intro at 0 + periodic) → Task 5. ✓
- Loops suppress spawns / clear corridor → Task 6. ✓
- Loop barrel-roll camera → Task 7 (Step 7). ✓
- Whoosh SFX on loop entry → Task 7 (Steps 5–8). ✓
- Aiming stays correct under pitch/offset → guaranteed because collider boxes and rendered meshes share `currentX`/`currentY`; loops are obstacle-free. ✓
- Tests for pure functions → Tasks 1, 2, 5; behavioral tests → Tasks 3, 6, 7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. The only conditional is the camera-pitch sign note in Task 4 Step 8, which gives the exact fix (negate the coefficient) — not a placeholder. ✓

**Type consistency:** `pathOffsetY`, `trackSlope`, `loopPhase`, `LOOP_LENGTH`, `LOOP_INTERVAL` are defined in Tasks 1/2/5 and imported with the same names in `session.ts` and `scene.ts`. `currentY` matches the existing `currentX` shape. `onLoopStart` is defined on `SessionEvents` (Task 7 Step 3) and consumed in `main.ts` (Step 8) with the same signature. `"loop"` added to `Sfx` (Task 7 Step 6) and used in `playSfx("loop")`. ✓

**Out of scope (honored):** no geometric multi-valued loops, no obstacles inside loops, no economy/score changes. ✓

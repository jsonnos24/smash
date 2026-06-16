# Smash Hit Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based, *Smash Hit*-inspired on-rails game where the player taps/clicks to throw balls and shatter glass, with 6 steadily-harder levels and a no-fail Casual mode.

**Architecture:** Single-page app, no backend. A pure, headless-testable gameplay core (state, economy, scoring, level generation, physics math) drives a Three.js rendering layer and a DOM/CSS HUD via one-directional data flow (state is the single source of truth; renderer/UI only read it). Custom arcade physics (ballistic balls + ray-vs-AABB hit tests + cosmetic shatter) instead of a physics engine.

**Tech Stack:** TypeScript, Three.js (rendering + math), Vite (bundler/dev server), Vitest + jsdom (tests).

## Global Constraints

- **Original assets only.** No *Smash Hit* soundtrack, art, or assets. All audio/visual content is original or royalty-free. (Spec §1 Legal note)
- **No backend, no accounts.** All persistence is browser `localStorage`. (Spec §1, §2)
- **Identical controls on desktop + mobile.** One input model: tap/click to throw at the pointed-at screen point. (Spec §2)
- **Game logic never imports rendering.** `game/`, `content/`, `generator/` must not import from `renderer/`, `ui/`, or Three.js `WebGLRenderer`. Three.js *math* classes (`Vector3`, `Box3`, `Ray`, `PerspectiveCamera`) are allowed in core because they run headlessly. (Spec §3)
- **Cosmetic shatter only.** No persistent rigid bodies; shatter is a capped, short-lived particle burst. (Spec §2, §7)
- **Default world theme:** Crystal Cavern — deep teal `#21424a` / mint `#7ffcd9` / amber `#ffd278`. (Spec §2)
- **Difficulty must increase very steadily:** level bands overlap (each level starts ≤ previous level's peak); speed/cost scale on a shallow roughly-linear curve. This is asserted by tests, not eyeballed. (Spec §5)
- **TDD throughout:** write the failing test, watch it fail, implement minimally, watch it pass, commit. DRY, YAGNI.

---

### Task 1: Project scaffold & toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` (Vitest, jsdom env) and `npm run dev` (Vite). All later tasks rely on these scripts.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "smash-hit-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: { outDir: "dist" },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Smash Hit Web</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #16252a; }
      #app { position: fixed; inset: 0; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.ts` (placeholder bootstrap, replaced in Task 17)**

```ts
const app = document.getElementById("app");
if (app) app.textContent = "Smash Hit Web — bootstrapping…";
```

- [ ] **Step 7: Write the smoke test `src/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Install and run the test to verify the toolchain**

Run: `npm install && npm test`
Expected: PASS — 1 passed (`toolchain > runs vitest`).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/main.ts src/smoke.test.ts
git commit -m "chore: scaffold Vite + TypeScript + Vitest + Three.js"
```

---

### Task 2: Run state model (`game/state.ts`)

**Files:**
- Create: `src/game/state.ts`
- Test: `src/game/state.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Mode = "normal" | "casual"`
  - `type RunStatus = "playing" | "ended" | "complete"`
  - `interface RunState { mode: Mode; balls: number; score: number; streak: number; hitChain: number; distance: number; roomIndex: number; status: RunStatus; }`
  - `function createRunState(mode: Mode, startBalls: number): RunState`
  - `function streakMultiplier(hitChain: number): number` — `1 + floor(hitChain / 5)`, capped at 5.

- [ ] **Step 1: Write the failing test `src/game/state.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createRunState, streakMultiplier } from "./state";

describe("createRunState", () => {
  it("initializes a playing run with the given mode and ball count", () => {
    const s = createRunState("normal", 25);
    expect(s).toEqual({
      mode: "normal",
      balls: 25,
      score: 0,
      streak: 1,
      hitChain: 0,
      distance: 0,
      roomIndex: 0,
      status: "playing",
    });
  });
});

describe("streakMultiplier", () => {
  it("starts at 1 and rises every 5 chained hits, capped at 5", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(4)).toBe(1);
    expect(streakMultiplier(5)).toBe(2);
    expect(streakMultiplier(14)).toBe(3);
    expect(streakMultiplier(100)).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/state.test.ts`
Expected: FAIL — cannot find module `./state`.

- [ ] **Step 3: Write `src/game/state.ts`**

```ts
export type Mode = "normal" | "casual";
export type RunStatus = "playing" | "ended" | "complete";

export interface RunState {
  mode: Mode;
  balls: number;
  score: number;
  streak: number;
  hitChain: number;
  distance: number;
  roomIndex: number;
  status: RunStatus;
}

export function streakMultiplier(hitChain: number): number {
  return Math.min(5, 1 + Math.floor(hitChain / 5));
}

export function createRunState(mode: Mode, startBalls: number): RunState {
  return {
    mode,
    balls: startBalls,
    score: 0,
    streak: 1,
    hitChain: 0,
    distance: 0,
    roomIndex: 0,
    status: "playing",
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/state.test.ts`
Expected: PASS — 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/state.ts src/game/state.test.ts
git commit -m "feat: add run state model and streak multiplier"
```

---

### Task 3: Level definitions (`content/types.ts`, `content/levels.ts`)

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/levels.ts`
- Test: `src/content/levels.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Generosity = "lean" | "medium" | "high" | "veryHigh"`
  - `type Theme = "crystalCavern" | "neonTunnel" | "glassChapel"`
  - `interface LevelDef { id: number; band: [number, number]; length: number; startBalls: number; speed: number; crystalGenerosity: Generosity; }`
  - `const LEVELS: LevelDef[]` — the 6 levels from spec §5.

- [ ] **Step 1: Write the failing test `src/content/levels.test.ts`**

This test encodes the spec §5 "very steady" guarantee.

```ts
import { describe, it, expect } from "vitest";
import { LEVELS } from "./levels";

describe("LEVELS", () => {
  it("has exactly 6 levels numbered 1..6", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("each band is low < high and within 1..10", () => {
    for (const l of LEVELS) {
      expect(l.band[0]).toBeLessThan(l.band[1]);
      expect(l.band[0]).toBeGreaterThanOrEqual(1);
      expect(l.band[1]).toBeLessThanOrEqual(10);
    }
  });

  it("bands overlap: each level starts no harder than the previous level's peak", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].band[0]).toBeLessThanOrEqual(LEVELS[i - 1].band[1]);
    }
  });

  it("difficulty rises monotonically (both band edges non-decreasing)", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].band[0]).toBeGreaterThanOrEqual(LEVELS[i - 1].band[0]);
      expect(LEVELS[i].band[1]).toBeGreaterThanOrEqual(LEVELS[i - 1].band[1]);
    }
  });

  it("speed rises on a shallow curve (each step <= 0.12x increase)", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const step = LEVELS[i].speed - LEVELS[i - 1].speed;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(0.12 + 1e-9);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/levels.test.ts`
Expected: FAIL — cannot find module `./levels`.

- [ ] **Step 3: Write `src/content/types.ts`**

```ts
export type Generosity = "lean" | "medium" | "high" | "veryHigh";
export type Theme = "crystalCavern" | "neonTunnel" | "glassChapel";

export interface LevelDef {
  id: number;
  band: [number, number];
  length: number;
  startBalls: number;
  speed: number;
  crystalGenerosity: Generosity;
}
```

- [ ] **Step 4: Write `src/content/levels.ts` (values from spec §5)**

```ts
import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [
  { id: 1, band: [1.0, 2.0], length: 300, startBalls: 25, speed: 1.0, crystalGenerosity: "veryHigh" },
  { id: 2, band: [1.8, 3.0], length: 320, startBalls: 25, speed: 1.06, crystalGenerosity: "high" },
  { id: 3, band: [2.8, 4.2], length: 340, startBalls: 22, speed: 1.12, crystalGenerosity: "high" },
  { id: 4, band: [4.0, 5.5], length: 360, startBalls: 22, speed: 1.2, crystalGenerosity: "medium" },
  { id: 5, band: [5.2, 7.0], length: 380, startBalls: 20, speed: 1.28, crystalGenerosity: "medium" },
  { id: 6, band: [6.8, 8.5], length: 400, startBalls: 20, speed: 1.38, crystalGenerosity: "lean" },
];
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/content/levels.test.ts`
Expected: PASS — 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/content/types.ts src/content/levels.ts src/content/levels.test.ts
git commit -m "feat: add level definitions with steady-curve invariants"
```

---

### Task 4: Economy & scoring (`game/economy.ts`)

**Files:**
- Create: `src/game/economy.ts`
- Test: `src/game/economy.test.ts`

**Interfaces:**
- Consumes: `RunState`, `streakMultiplier` from `game/state.ts`; `LevelDef`, `Generosity` from `content/types.ts`.
- Produces:
  - `function obstacleCost(level: LevelDef): number`
  - `function crystalRefill(level: LevelDef): number`
  - `function applyObstacleHit(state: RunState, level: LevelDef): RunState`
  - `function applyCrystalHit(state: RunState, level: LevelDef): RunState`
  - `function applyMiss(state: RunState): RunState`
  - Scoring constants `OBSTACLE_POINTS = 50`, `CRYSTAL_POINTS = 100`.

Behavior (spec §2, §6):
- Obstacle hit: clears an obstacle. `score += OBSTACLE_POINTS * streak`; `hitChain += 1`; `streak = streakMultiplier(hitChain)`; `balls -= obstacleCost(level)`. Normal: if `balls <= 0` → `balls = 0`, `status = "ended"`. Casual: `balls = max(1, balls)`.
- Crystal hit: `score += CRYSTAL_POINTS * streak`; `hitChain += 1`; `streak = streakMultiplier(hitChain)`; `balls += crystalRefill(level)` (Casual adds +1 to refill).
- Miss: Normal resets chain to 0 (`streak = 1`); Casual softens — `hitChain = max(0, hitChain - 3)`, `streak = streakMultiplier(hitChain)`. No ball change.

- [ ] **Step 1: Write the failing test `src/game/economy.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createRunState } from "./state";
import {
  obstacleCost,
  crystalRefill,
  applyObstacleHit,
  applyCrystalHit,
  applyMiss,
  OBSTACLE_POINTS,
  CRYSTAL_POINTS,
} from "./economy";
import { LEVELS } from "../content/levels";

const L1 = LEVELS[0]; // band [1,2], veryHigh
const L6 = LEVELS[5]; // band [6.8,8.5], lean

describe("cost & refill scaling", () => {
  it("obstacle cost is gentle early, higher late", () => {
    expect(obstacleCost(L1)).toBe(1); // round(2/2)=1
    expect(obstacleCost(L6)).toBe(4); // round(8.5/2)=4
  });
  it("crystal refill scales with generosity", () => {
    expect(crystalRefill(L1)).toBe(5); // veryHigh
    expect(crystalRefill(L6)).toBe(2); // lean
  });
});

describe("applyObstacleHit", () => {
  it("scores, builds streak, and spends balls", () => {
    const s = applyObstacleHit(createRunState("normal", 25), L1);
    expect(s.score).toBe(OBSTACLE_POINTS * 1);
    expect(s.hitChain).toBe(1);
    expect(s.balls).toBe(24);
    expect(s.status).toBe("playing");
  });

  it("ends the run in Normal mode when balls reach zero", () => {
    const low = { ...createRunState("normal", 3), balls: 3 };
    const s = applyObstacleHit(low, L6); // cost 4
    expect(s.balls).toBe(0);
    expect(s.status).toBe("ended");
  });

  it("clamps to 1 ball and never ends in Casual mode", () => {
    const low = { ...createRunState("casual", 3), balls: 3 };
    const s = applyObstacleHit(low, L6); // cost 4
    expect(s.balls).toBe(1);
    expect(s.status).toBe("playing");
  });
});

describe("applyCrystalHit", () => {
  it("scores and refills in Normal", () => {
    const s = applyCrystalHit(createRunState("normal", 10), L1);
    expect(s.score).toBe(CRYSTAL_POINTS * 1);
    expect(s.balls).toBe(15); // +5
    expect(s.hitChain).toBe(1);
  });
  it("refills one extra ball in Casual", () => {
    const s = applyCrystalHit(createRunState("casual", 10), L1);
    expect(s.balls).toBe(16); // +5 +1
  });
});

describe("applyMiss", () => {
  it("resets the streak in Normal", () => {
    let s = createRunState("normal", 25);
    s = applyObstacleHit(s, L1);
    s = applyObstacleHit(s, L1); // hitChain 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(0);
    expect(s.streak).toBe(1);
  });
  it("softens the streak in Casual (subtracts 3 from chain)", () => {
    let s = createRunState("casual", 25);
    for (let i = 0; i < 6; i++) s = applyObstacleHit(s, L1); // hitChain 6, streak 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(3);
    expect(s.streak).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/economy.test.ts`
Expected: FAIL — cannot find module `./economy`.

- [ ] **Step 3: Write `src/game/economy.ts`**

```ts
import { type RunState, streakMultiplier } from "./state";
import type { Generosity, LevelDef } from "../content/types";

export const OBSTACLE_POINTS = 50;
export const CRYSTAL_POINTS = 100;

const REFILL_BY_GENEROSITY: Record<Generosity, number> = {
  veryHigh: 5,
  high: 4,
  medium: 3,
  lean: 2,
};

export function obstacleCost(level: LevelDef): number {
  return Math.max(1, Math.round(level.band[1] / 2));
}

export function crystalRefill(level: LevelDef): number {
  return REFILL_BY_GENEROSITY[level.crystalGenerosity];
}

function scoreHit(state: RunState, points: number): Pick<RunState, "score" | "hitChain" | "streak"> {
  const hitChain = state.hitChain + 1;
  return {
    score: state.score + points * state.streak,
    hitChain,
    streak: streakMultiplier(hitChain),
  };
}

export function applyObstacleHit(state: RunState, level: LevelDef): RunState {
  const scored = scoreHit(state, OBSTACLE_POINTS);
  let balls = state.balls - obstacleCost(level);
  let status = state.status;
  if (state.mode === "casual") {
    balls = Math.max(1, balls);
  } else if (balls <= 0) {
    balls = 0;
    status = "ended";
  }
  return { ...state, ...scored, balls, status };
}

export function applyCrystalHit(state: RunState, level: LevelDef): RunState {
  const scored = scoreHit(state, CRYSTAL_POINTS);
  const refill = crystalRefill(level) + (state.mode === "casual" ? 1 : 0);
  return { ...state, ...scored, balls: state.balls + refill };
}

export function applyMiss(state: RunState): RunState {
  const hitChain = state.mode === "casual" ? Math.max(0, state.hitChain - 3) : 0;
  return { ...state, hitChain, streak: streakMultiplier(hitChain) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/economy.test.ts`
Expected: PASS — all economy tests green.

- [ ] **Step 5: Commit**

```bash
git add src/game/economy.ts src/game/economy.test.ts
git commit -m "feat: add ball economy and scoring rules for Normal and Casual"
```

---

### Task 5: Room templates (`content/rooms/`)

**Files:**
- Create: `src/content/rooms/types.ts`
- Create: `src/content/rooms/library.ts`
- Create: `src/content/rooms/index.ts`
- Test: `src/content/rooms/library.test.ts`

**Interfaces:**
- Consumes: `Theme` from `content/types.ts`.
- Produces:
  - `interface Placement { x: number; y: number; z: number; }` — local coords within a room (z is forward offset).
  - `type EntityKind = "obstacle" | "crystal"`
  - `interface RoomEntity extends Placement { kind: EntityKind; size: number; }`
  - `interface RoomTemplate { id: string; theme: Theme; difficulty: number; length: number; entities: RoomEntity[]; }`
  - `const ROOMS: RoomTemplate[]` — at least 10 rooms spanning difficulty 1..9 across 3 themes.

- [ ] **Step 1: Write the failing test `src/content/rooms/library.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { ROOMS } from "./library";

describe("ROOMS library", () => {
  it("has at least 10 templates with unique ids", () => {
    expect(ROOMS.length).toBeGreaterThanOrEqual(10);
    const ids = ROOMS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each room has difficulty 1..10, positive length, and entities", () => {
    for (const r of ROOMS) {
      expect(r.difficulty).toBeGreaterThanOrEqual(1);
      expect(r.difficulty).toBeLessThanOrEqual(10);
      expect(r.length).toBeGreaterThan(0);
      expect(r.entities.length).toBeGreaterThan(0);
    }
  });

  it("covers the full difficulty range and all 3 themes", () => {
    const diffs = ROOMS.map((r) => r.difficulty);
    expect(Math.min(...diffs)).toBeLessThanOrEqual(2);
    expect(Math.max(...diffs)).toBeGreaterThanOrEqual(8);
    const themes = new Set(ROOMS.map((r) => r.theme));
    expect(themes.has("crystalCavern")).toBe(true);
    expect(themes.has("neonTunnel")).toBe(true);
    expect(themes.has("glassChapel")).toBe(true);
  });

  it("entity z-offsets stay within the room length", () => {
    for (const r of ROOMS) {
      for (const e of r.entities) {
        expect(e.z).toBeGreaterThanOrEqual(0);
        expect(e.z).toBeLessThanOrEqual(r.length);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/rooms/library.test.ts`
Expected: FAIL — cannot find module `./library`.

- [ ] **Step 3: Write `src/content/rooms/types.ts`**

```ts
import type { Theme } from "../types";

export interface Placement {
  x: number;
  y: number;
  z: number;
}

export type EntityKind = "obstacle" | "crystal";

export interface RoomEntity extends Placement {
  kind: EntityKind;
  size: number;
}

export interface RoomTemplate {
  id: string;
  theme: Theme;
  difficulty: number;
  length: number;
  entities: RoomEntity[];
}
```

- [ ] **Step 4: Write `src/content/rooms/library.ts`**

Hand-authored templates. `x` is lateral (−2..2), `y` vertical (0..3), `z` forward within the room. Easy rooms = sparse obstacles + generous crystals; hard rooms = dense + few crystals.

```ts
import type { RoomTemplate } from "./types";

const obstacle = (x: number, y: number, z: number, size = 1) =>
  ({ kind: "obstacle" as const, x, y, z, size });
const crystal = (x: number, y: number, z: number, size = 0.6) =>
  ({ kind: "crystal" as const, x, y, z, size });

export const ROOMS: RoomTemplate[] = [
  // ---- Crystal Cavern (easy → hard) ----
  { id: "cc-easy-1", theme: "crystalCavern", difficulty: 1, length: 60,
    entities: [obstacle(0, 1, 30), crystal(-1.5, 1, 20), crystal(1.5, 1, 45)] },
  { id: "cc-easy-2", theme: "crystalCavern", difficulty: 2, length: 60,
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 40), crystal(0, 1.5, 50)] },
  { id: "cc-mid-1", theme: "crystalCavern", difficulty: 4, length: 70,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 1.5, 45), crystal(0, 0.5, 60)] },
  { id: "cc-hard-1", theme: "crystalCavern", difficulty: 7, length: 80,
    entities: [obstacle(-1.5, 1, 15), obstacle(0, 1, 15), obstacle(1.5, 1, 15),
               obstacle(-1, 1.5, 40), obstacle(1, 1.5, 40), obstacle(0, 1, 60), crystal(0, 2, 70)] },

  // ---- Neon Tunnel (mid → hard) ----
  { id: "nt-mid-1", theme: "neonTunnel", difficulty: 3, length: 65,
    entities: [obstacle(0, 1, 30), obstacle(-1.5, 1.5, 50), crystal(1.5, 1, 20), crystal(0, 0.5, 60)] },
  { id: "nt-mid-2", theme: "neonTunnel", difficulty: 5, length: 70,
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 25), obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), crystal(-1.5, 2, 60)] },
  { id: "nt-hard-1", theme: "neonTunnel", difficulty: 8, length: 85,
    entities: [obstacle(-1.5, 1, 15), obstacle(-0.5, 1, 15), obstacle(0.5, 1, 15), obstacle(1.5, 1, 15),
               obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), obstacle(-1, 1, 65), obstacle(1, 1, 65)] },

  // ---- Glass Chapel (easy → very hard) ----
  { id: "gc-easy-1", theme: "glassChapel", difficulty: 2, length: 60,
    entities: [obstacle(0, 1.5, 35), crystal(-1.5, 1, 15), crystal(1.5, 1, 50)] },
  { id: "gc-mid-1", theme: "glassChapel", difficulty: 6, length: 75,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 2, 40), obstacle(0, 1, 55), crystal(-1.5, 0.5, 65)] },
  { id: "gc-hard-1", theme: "glassChapel", difficulty: 9, length: 90,
    entities: [obstacle(-1.5, 1, 12), obstacle(0, 1, 12), obstacle(1.5, 1, 12),
               obstacle(-1, 1.5, 35), obstacle(1, 1.5, 35), obstacle(0, 0.5, 35),
               obstacle(-1.5, 1, 60), obstacle(0, 1, 60), obstacle(1.5, 1, 60), crystal(0, 2.5, 80)] },
];
```

- [ ] **Step 5: Write `src/content/rooms/index.ts`**

```ts
export * from "./types";
export { ROOMS } from "./library";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/content/rooms/library.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 7: Commit**

```bash
git add src/content/rooms
git commit -m "feat: add hand-authored room template library across 3 themes"
```

---

### Task 6: Level builder (`generator/levelBuilder.ts`)

**Files:**
- Create: `src/generator/rng.ts`
- Create: `src/generator/levelBuilder.ts`
- Test: `src/generator/levelBuilder.test.ts`

**Interfaces:**
- Consumes: `LevelDef` (`content/types.ts`), `RoomTemplate` (`content/rooms`).
- Produces:
  - `function makeRng(seed: number): () => number` — deterministic [0,1) PRNG (mulberry32).
  - `interface PlacedRoom { template: RoomTemplate; startZ: number; }`
  - `interface BuiltLevel { level: LevelDef; rooms: PlacedRoom[]; totalLength: number; }`
  - `function buildLevel(level: LevelDef, rooms: RoomTemplate[], rng: () => number): BuiltLevel`

Algorithm: filter rooms whose `difficulty` is within `level.band`. Sort the pool by difficulty. Walk forward, at each step choosing a room whose difficulty matches the *current target* (eased linearly from `band[0]` to `band[1]` across `level.length`), picking the nearest-difficulty candidates and breaking ties with `rng`. Accumulate `startZ` by room length until `totalLength >= level.length`.

- [ ] **Step 1: Write the failing test `src/generator/levelBuilder.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { makeRng, buildLevel } from "./levelBuilder";
import { LEVELS } from "../content/levels";
import { ROOMS } from "../content/rooms";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("buildLevel", () => {
  it("only uses rooms within the level's difficulty band", () => {
    for (const level of LEVELS) {
      const built = buildLevel(level, ROOMS, makeRng(1));
      for (const pr of built.rooms) {
        expect(pr.template.difficulty).toBeGreaterThanOrEqual(level.band[0] - 1e-9);
        expect(pr.template.difficulty).toBeLessThanOrEqual(level.band[1] + 1e-9);
      }
    }
  });

  it("reaches at least the level's target length", () => {
    const built = buildLevel(LEVELS[0], ROOMS, makeRng(7));
    expect(built.totalLength).toBeGreaterThanOrEqual(LEVELS[0].length);
  });

  it("ramps difficulty low→high within a level (last room >= first room)", () => {
    const built = buildLevel(LEVELS[3], ROOMS, makeRng(3));
    const first = built.rooms[0].template.difficulty;
    const last = built.rooms[built.rooms.length - 1].template.difficulty;
    expect(last).toBeGreaterThanOrEqual(first);
  });

  it("assigns non-overlapping forward startZ offsets", () => {
    const built = buildLevel(LEVELS[2], ROOMS, makeRng(9));
    for (let i = 1; i < built.rooms.length; i++) {
      const prev = built.rooms[i - 1];
      expect(built.rooms[i].startZ).toBeCloseTo(prev.startZ + prev.template.length, 6);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildLevel(LEVELS[4], ROOMS, makeRng(5)).rooms.map((r) => r.template.id);
    const b = buildLevel(LEVELS[4], ROOMS, makeRng(5)).rooms.map((r) => r.template.id);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/generator/levelBuilder.test.ts`
Expected: FAIL — cannot find module `./levelBuilder`.

- [ ] **Step 3: Write `src/generator/rng.ts`**

```ts
// mulberry32 — small, fast, deterministic PRNG
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Write `src/generator/levelBuilder.ts`**

```ts
import type { LevelDef } from "../content/types";
import type { RoomTemplate } from "../content/rooms";

export { makeRng } from "./rng";

export interface PlacedRoom {
  template: RoomTemplate;
  startZ: number;
}

export interface BuiltLevel {
  level: LevelDef;
  rooms: PlacedRoom[];
  totalLength: number;
}

export function buildLevel(
  level: LevelDef,
  rooms: RoomTemplate[],
  rng: () => number,
): BuiltLevel {
  const [low, high] = level.band;
  const pool = rooms.filter((r) => r.difficulty >= low && r.difficulty <= high);
  if (pool.length === 0) {
    throw new Error(`No rooms available for level ${level.id} band [${low}, ${high}]`);
  }

  const placed: PlacedRoom[] = [];
  let z = 0;
  while (z < level.length) {
    const progress = Math.min(1, z / level.length);
    const target = low + (high - low) * progress;
    // candidates sorted by closeness to target difficulty
    const sorted = [...pool].sort(
      (a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target),
    );
    // take the closest cluster (within 1.0 of the best) and pick one via rng
    const best = Math.abs(sorted[0].difficulty - target);
    const cluster = sorted.filter((r) => Math.abs(r.difficulty - target) <= best + 1.0);
    const choice = cluster[Math.floor(rng() * cluster.length)];
    placed.push({ template: choice, startZ: z });
    z += choice.length;
  }

  return { level, rooms: placed, totalLength: z };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/generator/levelBuilder.test.ts`
Expected: PASS — all builder tests green.

> Note: if the "ramp low→high" test is flaky for a seed because the pool is small, widen the room library (Task 5) rather than weakening the assertion — the steady ramp is a hard requirement.

- [ ] **Step 6: Commit**

```bash
git add src/generator
git commit -m "feat: add seeded level builder that stitches rooms by difficulty"
```

---

### Task 7: Arcade physics (`engine/physics.ts`)

**Files:**
- Create: `src/engine/physics.ts`
- Test: `src/engine/physics.test.ts`

**Interfaces:**
- Consumes: Three.js math (`Vector3`, `Box3`).
- Produces:
  - `const GRAVITY = -9.8`
  - `interface Ball { id: number; pos: Vector3; vel: Vector3; alive: boolean; }`
  - `interface Collider { id: number; kind: "obstacle" | "crystal"; box: Box3; }`
  - `function stepBall(ball: Ball, dt: number): void` — mutates pos/vel under gravity.
  - `interface Hit { ballId: number; collider: Collider; }`
  - `function detectHit(prevPos: Vector3, ball: Ball, colliders: Collider[]): Hit | null` — segment from `prevPos` to `ball.pos` against collider boxes; nearest wins.

- [ ] **Step 1: Write the failing test `src/engine/physics.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Vector3, Box3 } from "three";
import { stepBall, detectHit, GRAVITY, type Ball, type Collider } from "./physics";

const makeBall = (pos: Vector3, vel: Vector3): Ball => ({ id: 1, pos, vel, alive: true });

describe("stepBall", () => {
  it("advances position by velocity and applies gravity to vertical velocity", () => {
    const b = makeBall(new Vector3(0, 0, 0), new Vector3(0, 0, -10));
    stepBall(b, 0.5);
    expect(b.pos.z).toBeCloseTo(-5, 6);
    expect(b.vel.y).toBeCloseTo(GRAVITY * 0.5, 6);
  });
});

describe("detectHit", () => {
  const box = new Box3(new Vector3(-1, -1, -11), new Vector3(1, 1, -9));
  const colliders: Collider[] = [{ id: 100, kind: "obstacle", box }];

  it("detects a hit when the segment passes through a collider box", () => {
    const prev = new Vector3(0, 0, -8);
    const ball = makeBall(new Vector3(0, 0, -12), new Vector3(0, 0, -10));
    const hit = detectHit(prev, ball, colliders);
    expect(hit?.collider.id).toBe(100);
  });

  it("returns null when the segment misses all colliders", () => {
    const prev = new Vector3(3, 0, -8);
    const ball = makeBall(new Vector3(3, 0, -12), new Vector3(0, 0, -10));
    expect(detectHit(prev, ball, colliders)).toBeNull();
  });

  it("returns the nearest collider when several intersect", () => {
    const near = new Box3(new Vector3(-1, -1, -10), new Vector3(1, 1, -9));
    const far = new Box3(new Vector3(-1, -1, -20), new Vector3(1, 1, -19));
    const cs: Collider[] = [
      { id: 2, kind: "obstacle", box: far },
      { id: 1, kind: "obstacle", box: near },
    ];
    const prev = new Vector3(0, 0, -5);
    const ball = makeBall(new Vector3(0, 0, -25), new Vector3(0, 0, -10));
    expect(detectHit(prev, ball, cs)?.collider.id).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/physics.test.ts`
Expected: FAIL — cannot find module `./physics`.

- [ ] **Step 3: Write `src/engine/physics.ts`**

```ts
import { Vector3, Box3, Ray } from "three";

export const GRAVITY = -9.8;

export interface Ball {
  id: number;
  pos: Vector3;
  vel: Vector3;
  alive: boolean;
}

export interface Collider {
  id: number;
  kind: "obstacle" | "crystal";
  box: Box3;
}

export function stepBall(ball: Ball, dt: number): void {
  ball.vel.y += GRAVITY * dt;
  ball.pos.addScaledVector(ball.vel, dt);
}

export interface Hit {
  ballId: number;
  collider: Collider;
}

export function detectHit(
  prevPos: Vector3,
  ball: Ball,
  colliders: Collider[],
): Hit | null {
  const dir = new Vector3().subVectors(ball.pos, prevPos);
  const segLen = dir.length();
  if (segLen === 0) return null;
  dir.normalize();
  const ray = new Ray(prevPos.clone(), dir);
  const target = new Vector3();

  let nearest: Collider | null = null;
  let nearestDist = Infinity;
  for (const c of colliders) {
    const point = ray.intersectBox(c.box, target);
    if (point) {
      const dist = point.distanceTo(prevPos);
      if (dist <= segLen && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }
  }
  return nearest ? { ballId: ball.id, collider: nearest } : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/physics.test.ts`
Expected: PASS — all physics tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics.ts src/engine/physics.test.ts
git commit -m "feat: add ballistic ball stepping and ray-vs-box hit detection"
```

---

### Task 8: Throw model (`game/throw.ts`)

**Files:**
- Create: `src/game/throw.ts`
- Test: `src/game/throw.test.ts`

**Interfaces:**
- Consumes: Three.js `PerspectiveCamera`, `Vector3`; `Ball` from `engine/physics.ts`.
- Produces:
  - `interface ScreenPoint { nx: number; ny: number; }` — normalized device coords in [−1, 1].
  - `function createThrow(id: number, point: ScreenPoint, camera: PerspectiveCamera, speed: number): Ball` — ball starts at camera position, velocity aimed through the unprojected screen point.

- [ ] **Step 1: Write the failing test `src/game/throw.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { createThrow } from "./throw";

function makeCamera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(60, 1, 0.1, 1000);
  cam.position.set(0, 1, 0);
  cam.lookAt(new Vector3(0, 1, -10)); // looking down -Z
  cam.updateMatrixWorld();
  return cam;
}

describe("createThrow", () => {
  it("spawns the ball at the camera position", () => {
    const ball = createThrow(1, { nx: 0, ny: 0 }, makeCamera(), 30);
    expect(ball.pos.x).toBeCloseTo(0, 5);
    expect(ball.pos.y).toBeCloseTo(1, 5);
    expect(ball.pos.z).toBeCloseTo(0, 5);
    expect(ball.alive).toBe(true);
  });

  it("a center tap fires roughly straight forward (-Z)", () => {
    const ball = createThrow(1, { nx: 0, ny: 0 }, makeCamera(), 30);
    const v = ball.vel.clone().normalize();
    expect(v.z).toBeLessThan(-0.9);
    expect(Math.abs(v.x)).toBeLessThan(0.05);
  });

  it("a right-side tap fires to the +X side", () => {
    const ball = createThrow(1, { nx: 0.5, ny: 0 }, makeCamera(), 30);
    expect(ball.vel.x).toBeGreaterThan(0);
  });

  it("velocity magnitude equals the requested speed", () => {
    const ball = createThrow(1, { nx: 0.2, ny: -0.3 }, makeCamera(), 30);
    expect(ball.vel.length()).toBeCloseTo(30, 4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/throw.test.ts`
Expected: FAIL — cannot find module `./throw`.

- [ ] **Step 3: Write `src/game/throw.ts`**

```ts
import { PerspectiveCamera, Vector3 } from "three";
import type { Ball } from "../engine/physics";

export interface ScreenPoint {
  nx: number; // normalized device X in [-1, 1]
  ny: number; // normalized device Y in [-1, 1]
}

export function createThrow(
  id: number,
  point: ScreenPoint,
  camera: PerspectiveCamera,
  speed: number,
): Ball {
  const target = new Vector3(point.nx, point.ny, 0.5).unproject(camera);
  const origin = camera.position.clone();
  const vel = target.sub(origin).normalize().multiplyScalar(speed);
  return { id, pos: origin, vel, alive: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/throw.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/throw.ts src/game/throw.test.ts
git commit -m "feat: convert tapped screen point into an aimed ball throw"
```

---

### Task 9: Input normalization (`game/input.ts`)

**Files:**
- Create: `src/game/input.ts`
- Test: `src/game/input.test.ts`

**Interfaces:**
- Consumes: `ScreenPoint` from `game/throw.ts`.
- Produces:
  - `function toScreenPoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): ScreenPoint`
  - `class InputController` with `constructor(target: HTMLElement)`, `onThrow(cb: (p: ScreenPoint) => void): void`, `dispose(): void`. Listens to `pointerdown` (covers mouse + touch identically) and emits a normalized `ScreenPoint`.

- [ ] **Step 1: Write the failing test `src/game/input.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { toScreenPoint, InputController } from "./input";

const rect = { left: 0, top: 0, width: 200, height: 100 };

describe("toScreenPoint", () => {
  it("maps the center to (0,0)", () => {
    expect(toScreenPoint(100, 50, rect)).toEqual({ nx: 0, ny: 0 });
  });
  it("maps top-left to (-1, 1) and bottom-right to (1, -1)", () => {
    expect(toScreenPoint(0, 0, rect)).toEqual({ nx: -1, ny: 1 });
    expect(toScreenPoint(200, 100, rect)).toEqual({ nx: 1, ny: -1 });
  });
});

describe("InputController", () => {
  it("emits a normalized screen point on pointerdown", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
    const ctrl = new InputController(el);
    const cb = vi.fn();
    ctrl.onThrow(cb);

    const ev = new Event("pointerdown") as any;
    ev.clientX = 100;
    ev.clientY = 50;
    el.dispatchEvent(ev);

    expect(cb).toHaveBeenCalledWith({ nx: 0, ny: 0 });
    ctrl.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/input.test.ts`
Expected: FAIL — cannot find module `./input`.

- [ ] **Step 3: Write `src/game/input.ts`**

```ts
import type { ScreenPoint } from "./throw";

export function toScreenPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): ScreenPoint {
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  return { nx, ny };
}

export class InputController {
  private cb: ((p: ScreenPoint) => void) | null = null;
  private handler: (e: PointerEvent) => void;

  constructor(private target: HTMLElement) {
    this.handler = (e: PointerEvent) => {
      const rect = this.target.getBoundingClientRect();
      this.cb?.(toScreenPoint(e.clientX, e.clientY, rect));
    };
    this.target.addEventListener("pointerdown", this.handler);
  }

  onThrow(cb: (p: ScreenPoint) => void): void {
    this.cb = cb;
  }

  dispose(): void {
    this.target.removeEventListener("pointerdown", this.handler);
    this.cb = null;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/input.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/input.ts src/game/input.test.ts
git commit -m "feat: add unified pointer input that emits normalized screen points"
```

---

### Task 10: Local persistence (`persistence/save.ts`)

**Files:**
- Create: `src/persistence/save.ts`
- Test: `src/persistence/save.test.ts`

**Interfaces:**
- Consumes: `Mode` from `game/state.ts`.
- Produces:
  - `interface SaveData { version: 1; mode: Mode; muted: boolean; quality: "auto" | "low" | "high"; bestScores: Record<number, number>; unlockedLevel: number; }`
  - `function defaultSave(): SaveData`
  - `function loadSave(storage?: Storage): SaveData` — validates shape; returns defaults on missing/corrupt.
  - `function saveSave(data: SaveData, storage?: Storage): void`
  - `function recordScore(data: SaveData, levelId: number, score: number): SaveData` — keeps the max and unlocks the next level.

- [ ] **Step 1: Write the failing test `src/persistence/save.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { defaultSave, loadSave, saveSave, recordScore } from "./save";

beforeEach(() => localStorage.clear());

describe("loadSave", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults when stored JSON is corrupt", () => {
    localStorage.setItem("smashhit.save", "{not json");
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults when the shape is wrong", () => {
    localStorage.setItem("smashhit.save", JSON.stringify({ version: 99 }));
    expect(loadSave()).toEqual(defaultSave());
  });
  it("round-trips a valid save", () => {
    const data = { ...defaultSave(), mode: "casual" as const, muted: true };
    saveSave(data);
    expect(loadSave()).toEqual(data);
  });
});

describe("recordScore", () => {
  it("keeps the maximum score per level and unlocks the next level", () => {
    let d = defaultSave();
    d = recordScore(d, 1, 500);
    d = recordScore(d, 1, 300); // lower, ignored
    expect(d.bestScores[1]).toBe(500);
    expect(d.unlockedLevel).toBe(2);
  });
  it("never lowers the unlocked level", () => {
    let d = { ...defaultSave(), unlockedLevel: 4 };
    d = recordScore(d, 1, 100);
    expect(d.unlockedLevel).toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/persistence/save.test.ts`
Expected: FAIL — cannot find module `./save`.

- [ ] **Step 3: Write `src/persistence/save.ts`**

```ts
import type { Mode } from "../game/state";

const KEY = "smashhit.save";

export interface SaveData {
  version: 1;
  mode: Mode;
  muted: boolean;
  quality: "auto" | "low" | "high";
  bestScores: Record<number, number>;
  unlockedLevel: number;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    mode: "normal",
    muted: false,
    quality: "auto",
    bestScores: {},
    unlockedLevel: 1,
  };
}

function isValid(d: unknown): d is SaveData {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return (
    o.version === 1 &&
    (o.mode === "normal" || o.mode === "casual") &&
    typeof o.muted === "boolean" &&
    (o.quality === "auto" || o.quality === "low" || o.quality === "high") &&
    typeof o.bestScores === "object" &&
    o.bestScores !== null &&
    typeof o.unlockedLevel === "number"
  );
}

export function loadSave(storage: Storage = localStorage): SaveData {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function saveSave(data: SaveData, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(data));
}

export function recordScore(data: SaveData, levelId: number, score: number): SaveData {
  const prev = data.bestScores[levelId] ?? 0;
  return {
    ...data,
    bestScores: { ...data.bestScores, [levelId]: Math.max(prev, score) },
    unlockedLevel: Math.max(data.unlockedLevel, levelId + 1),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/persistence/save.test.ts`
Expected: PASS — all save tests green.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/save.ts src/persistence/save.test.ts
git commit -m "feat: add validated localStorage persistence with score/unlocks"
```

---

### Task 11: Session orchestrator (`game/session.ts`)

This is the headless heart that ties world advance + physics + economy + state together, with no rendering. It is what makes the core loop testable end-to-end.

**Files:**
- Create: `src/game/session.ts`
- Test: `src/game/session.test.ts`

**Interfaces:**
- Consumes: `RunState`, `createRunState`, `Mode` (`game/state.ts`); economy fns (`game/economy.ts`); `Ball`, `Collider`, `stepBall`, `detectHit` (`engine/physics.ts`); `BuiltLevel`, `buildLevel`, `makeRng` (`generator/levelBuilder.ts`); `LevelDef` (`content/types.ts`); `RoomTemplate` (`content/rooms`); Three `Vector3`, `Box3`, `PerspectiveCamera`; `createThrow`, `ScreenPoint` (`game/throw.ts`).
- Produces:
  - `interface SessionEvents { onShatter?: (kind: "obstacle" | "crystal", at: Vector3) => void; }`
  - `class Session` with:
    - `constructor(level: LevelDef, rooms: RoomTemplate[], mode: Mode, camera: PerspectiveCamera, seed: number, events?: SessionEvents)`
    - `readonly state: RunState` (getter)
    - `readonly built: BuiltLevel` (getter)
    - `colliders(): Collider[]` — active obstacle/crystal boxes in world space at the current distance.
    - `throwBall(p: ScreenPoint): void`
    - `update(dt: number): void` — advances distance (`speed` m/s baseline 30 × level.speed), steps balls, resolves hits via economy, expires balls/colliders, sets `status = "complete"` at level end.

World mapping: player sits at z=0 looking −Z; the world scrolls toward +Z over time. An entity's world z = `(roomStartZ + entity.z) - distance` mapped to negative-forward as `-(roomStartZ + entity.z) + distance`. Use a simple convention: `worldZ = distance - (room.startZ + entity.z)` so entities ahead are negative and approach 0; a collider is "active" when `-60 < worldZ < 5`.

- [ ] **Step 1: Write the failing test `src/game/session.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { Session } from "./session";
import { LEVELS } from "../content/levels";
import { ROOMS } from "../content/rooms";

function cam(): PerspectiveCamera {
  const c = new PerspectiveCamera(60, 1, 0.1, 1000);
  c.position.set(0, 1, 0);
  c.lookAt(new Vector3(0, 1, -10));
  c.updateMatrixWorld();
  return c;
}

describe("Session", () => {
  it("builds a level on construction", () => {
    const s = new Session(LEVELS[0], ROOMS, "normal", cam(), 1);
    expect(s.built.rooms.length).toBeGreaterThan(0);
    expect(s.state.status).toBe("playing");
  });

  it("advances distance over time", () => {
    const s = new Session(LEVELS[0], ROOMS, "normal", cam(), 1);
    s.update(1);
    expect(s.state.distance).toBeGreaterThan(0);
  });

  it("marks the run complete at the end of the level", () => {
    const s = new Session(LEVELS[0], ROOMS, "casual", cam(), 1);
    for (let i = 0; i < 2000 && s.state.status === "playing"; i++) s.update(0.1);
    expect(s.state.status).toBe("complete");
  });

  it("a center throw that hits an obstacle changes balls and score", () => {
    const s = new Session(LEVELS[0], ROOMS, "normal", cam(), 1);
    const before = { balls: s.state.balls, score: s.state.score };
    // advance until at least one obstacle collider is active
    for (let i = 0; i < 200 && s.colliders().length === 0; i++) s.update(0.05);
    s.throwBall({ nx: 0, ny: 0 });
    for (let i = 0; i < 60; i++) s.update(1 / 60);
    const changed = s.state.balls !== before.balls || s.state.score !== before.score;
    expect(changed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/session.test.ts`
Expected: FAIL — cannot find module `./session`.

- [ ] **Step 3: Write `src/game/session.ts`**

```ts
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { createRunState, type Mode, type RunState } from "./state";
import { applyObstacleHit, applyCrystalHit, applyMiss } from "./economy";
import { createThrow, type ScreenPoint } from "./throw";
import { stepBall, detectHit, type Ball, type Collider } from "../engine/physics";
import { buildLevel, makeRng, type BuiltLevel } from "../generator/levelBuilder";
import type { LevelDef } from "../content/types";
import type { RoomTemplate } from "../content/rooms";

const BASE_SPEED = 30; // meters/sec at level.speed = 1
const THROW_SPEED = 45;
const ACTIVE_NEAR = 5;
const ACTIVE_FAR = -60;

export interface SessionEvents {
  onShatter?: (kind: "obstacle" | "crystal", at: Vector3) => void;
}

interface WorldEntity {
  id: number;
  kind: "obstacle" | "crystal";
  baseZ: number; // room.startZ + entity.z
  x: number;
  y: number;
  size: number;
  consumed: boolean;
}

export class Session {
  private _state: RunState;
  private _built: BuiltLevel;
  private entities: WorldEntity[];
  private balls: Ball[] = [];
  private nextId = 1;

  constructor(
    level: LevelDef,
    rooms: RoomTemplate[],
    mode: Mode,
    private camera: PerspectiveCamera,
    seed: number,
    private events: SessionEvents = {},
  ) {
    this._built = buildLevel(level, rooms, makeRng(seed));
    this._state = createRunState(mode, level.startBalls);
    let eid = 1;
    this.entities = this._built.rooms.flatMap((pr) =>
      pr.template.entities.map((e) => ({
        id: eid++,
        kind: e.kind,
        baseZ: pr.startZ + e.z,
        x: e.x,
        y: e.y,
        size: e.size,
        consumed: false,
      })),
    );
  }

  get state(): RunState {
    return this._state;
  }
  get built(): BuiltLevel {
    return this._built;
  }

  private worldZ(baseZ: number): number {
    return this._state.distance - baseZ; // negative = ahead, approaches 0
  }

  colliders(): Collider[] {
    const out: Collider[] = [];
    for (const e of this.entities) {
      if (e.consumed) continue;
      const z = this.worldZ(e.baseZ);
      if (z < ACTIVE_FAR || z > ACTIVE_NEAR) continue;
      const h = e.size;
      out.push({
        id: e.id,
        kind: e.kind,
        box: new Box3(
          new Vector3(e.x - h, e.y - h, z - h),
          new Vector3(e.x + h, e.y + h, z + h),
        ),
      });
    }
    return out;
  }

  throwBall(p: ScreenPoint): void {
    if (this._state.status !== "playing") return;
    this.balls.push(createThrow(this.nextId++, p, this.camera, THROW_SPEED));
  }

  update(dt: number): void {
    if (this._state.status !== "playing") return;

    // advance world
    this._state = { ...this._state, distance: this._state.distance + BASE_SPEED * this.level().speed * dt };

    // step balls and resolve hits
    const colliders = this.colliders();
    const surviving: Ball[] = [];
    for (const ball of this.balls) {
      const prev = ball.pos.clone();
      stepBall(ball, dt);
      const hit = detectHit(prev, ball, colliders);
      if (hit) {
        this.resolveHit(hit.collider);
        ball.alive = false;
      } else if (ball.pos.z > 5 || ball.pos.y < -5) {
        // flew past the player or fell out: a miss
        this._state = applyMiss(this._state);
        ball.alive = false;
      }
      if (ball.alive) surviving.push(ball);
    }
    this.balls = surviving;

    // complete the level
    if (this._state.distance >= this._built.totalLength) {
      this._state = { ...this._state, status: "complete" };
    }
  }

  private resolveHit(collider: Collider): void {
    const e = this.entities.find((x) => x.id === collider.id);
    if (!e || e.consumed) return;
    e.consumed = true;
    const at = new Vector3(e.x, e.y, this.worldZ(e.baseZ));
    if (collider.kind === "obstacle") {
      this._state = applyObstacleHit(this._state, this.level());
    } else {
      this._state = applyCrystalHit(this._state, this.level());
    }
    this.events.onShatter?.(collider.kind, at);
  }

  private level(): LevelDef {
    return this._built.level;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/session.test.ts`
Expected: PASS — all session tests green.

- [ ] **Step 5: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add src/game/session.ts src/game/session.test.ts
git commit -m "feat: add headless session orchestrating physics, economy, and state"
```

---

### Task 12: Fixed-timestep game loop (`engine/loop.ts`)

**Files:**
- Create: `src/engine/loop.ts`
- Test: `src/engine/loop.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface LoopCallbacks { update: (dt: number) => void; render: (alpha: number) => void; }`
  - `class GameLoop` with `constructor(cb: LoopCallbacks, step?: number)`, `tick(nowMs: number): void` (accumulator-based fixed step, default `step = 1/60`, max 5 sub-steps to avoid spiral-of-death), `start(): void`, `stop(): void`, `pause(): void`, `resume(): void`, `get running(): boolean`. `start/stop` use `requestAnimationFrame`; `tick` is exposed for testing.

- [ ] **Step 1: Write the failing test `src/engine/loop.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { GameLoop } from "./loop";

describe("GameLoop fixed timestep", () => {
  it("runs one update per fixed step elapsed", () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop({ update, render }, 1 / 60);
    loop.tick(0);
    loop.tick(1000 / 60); // exactly one step
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(1 / 60);
  });

  it("clamps to at most 5 sub-steps on a long frame", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} }, 1 / 60);
    loop.tick(0);
    loop.tick(10000); // 10s — would be 600 steps unclamped
    expect(update.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("does not update while paused", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} }, 1 / 60);
    loop.pause();
    loop.tick(0);
    loop.tick(1000);
    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/loop.test.ts`
Expected: FAIL — cannot find module `./loop`.

- [ ] **Step 3: Write `src/engine/loop.ts`**

```ts
export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

const MAX_SUBSTEPS = 5;

export class GameLoop {
  private accumulator = 0;
  private lastMs: number | null = null;
  private paused = false;
  private rafId: number | null = null;

  constructor(private cb: LoopCallbacks, private step = 1 / 60) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  tick(nowMs: number): void {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return;
    }
    const frame = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    if (this.paused) return;

    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= this.step && steps < MAX_SUBSTEPS) {
      this.cb.update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0; // shed backlog
    this.cb.render(this.accumulator / this.step);
  }

  start(): void {
    if (this.rafId !== null) return;
    const frame = (t: number) => {
      this.tick(t);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastMs = null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastMs = null; // avoid a giant catch-up frame
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/loop.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loop.ts src/engine/loop.test.ts
git commit -m "feat: add fixed-timestep game loop with substep clamping and pause"
```

---

### Task 13: Renderer & theme materials (`renderer/`)

This task is mostly visual; tests cover the headless-constructible factories (scene graph objects), and feel is verified manually in Task 18.

**Files:**
- Create: `src/renderer/themes.ts`
- Create: `src/renderer/scene.ts`
- Create: `src/renderer/shatter.ts`
- Test: `src/renderer/themes.test.ts`

**Interfaces:**
- Consumes: Three.js; `Theme` (`content/types.ts`); `BuiltLevel` (`generator/levelBuilder.ts`); `Vector3`.
- Produces:
  - `const THEME_COLORS: Record<Theme, { fog: number; glass: number; crystal: number; accent: number }>`
  - `class SceneManager` — `constructor(canvas: HTMLCanvasElement)`, `camera: PerspectiveCamera`, `resize(w, h): void`, `syncEntities(session-provided render list): void`, `render(): void`, `dispose(): void`.
  - `class ShatterField` — `burst(at: Vector3, color: number): void`, `update(dt): void`, capped particle pool (cosmetic only).

> The renderer reads a lightweight render list (positions + kinds) computed from the `Session`; it never mutates game state (Global Constraint: one-directional data flow).

- [ ] **Step 1: Write the failing test `src/renderer/themes.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { THEME_COLORS } from "./themes";

describe("THEME_COLORS", () => {
  it("defines colors for all three themes", () => {
    expect(THEME_COLORS.crystalCavern).toBeDefined();
    expect(THEME_COLORS.neonTunnel).toBeDefined();
    expect(THEME_COLORS.glassChapel).toBeDefined();
  });
  it("crystal cavern uses the spec mint accent 0x7ffcd9", () => {
    expect(THEME_COLORS.crystalCavern.crystal).toBe(0x7ffcd9);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/renderer/themes.test.ts`
Expected: FAIL — cannot find module `./themes`.

- [ ] **Step 3: Write `src/renderer/themes.ts`**

```ts
import type { Theme } from "../content/types";

export const THEME_COLORS: Record<Theme, { fog: number; glass: number; crystal: number; accent: number }> = {
  crystalCavern: { fog: 0x21424a, glass: 0x4fb3a3, crystal: 0x7ffcd9, accent: 0xffd278 },
  neonTunnel: { fog: 0x140a2e, glass: 0x18e0ff, crystal: 0x18e0ff, accent: 0xff3df0 },
  glassChapel: { fog: 0xdfeafc, glass: 0xbcd4f5, crystal: 0xffffff, accent: 0xa9cfff },
};
```

- [ ] **Step 4: Write `src/renderer/scene.ts`**

```ts
import {
  Scene, PerspectiveCamera, WebGLRenderer, Fog, AmbientLight, DirectionalLight,
  Mesh, BoxGeometry, OctahedronGeometry, SphereGeometry, MeshStandardMaterial,
  Vector3, Color,
} from "three";
import { THEME_COLORS } from "./themes";
import type { Theme } from "../content/types";

export interface RenderItem {
  id: number;
  kind: "obstacle" | "crystal" | "ball";
  pos: Vector3;
  size: number;
}

export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private meshes = new Map<number, Mesh>();
  private theme: Theme = "crystalCavern";

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera = new PerspectiveCamera(65, 1, 0.1, 200);
    this.camera.position.set(0, 1, 0);
    this.camera.lookAt(new Vector3(0, 1, -10));
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 1);
    this.scene.add(dir);
    this.setTheme("crystalCavern");
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    const c = THEME_COLORS[theme];
    this.scene.fog = new Fog(c.fog, 10, 90);
    this.scene.background = new Color(c.fog);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private makeMesh(item: RenderItem): Mesh {
    const c = THEME_COLORS[this.theme];
    if (item.kind === "crystal") {
      return new Mesh(
        new OctahedronGeometry(item.size),
        new MeshStandardMaterial({ color: c.crystal, emissive: c.crystal, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }),
      );
    }
    if (item.kind === "ball") {
      return new Mesh(
        new SphereGeometry(item.size, 16, 16),
        new MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 }),
      );
    }
    return new Mesh(
      new BoxGeometry(item.size * 2, item.size * 2, 0.2),
      new MeshStandardMaterial({ color: c.glass, transparent: true, opacity: 0.4, metalness: 0.1, roughness: 0.05 }),
    );
  }

  sync(items: RenderItem[]): void {
    const seen = new Set<number>();
    for (const item of items) {
      seen.add(item.id);
      let mesh = this.meshes.get(item.id);
      if (!mesh) {
        mesh = this.makeMesh(item);
        this.meshes.set(item.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.copy(item.pos);
    }
    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as MeshStandardMaterial).dispose();
        this.meshes.delete(id);
      }
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
```

- [ ] **Step 5: Write `src/renderer/shatter.ts`**

```ts
import {
  Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, Scene, Vector3,
} from "three";

const MAX_PARTICLES = 600;
const LIFETIME = 0.6;

export class ShatterField {
  private positions = new Float32Array(MAX_PARTICLES * 3);
  private velocities = new Float32Array(MAX_PARTICLES * 3);
  private ages = new Float32Array(MAX_PARTICLES).fill(LIFETIME + 1);
  private geom = new BufferGeometry();
  private points: Points;

  constructor(scene: Scene) {
    this.geom.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    this.points = new Points(this.geom, new PointsMaterial({ size: 0.15, transparent: true, opacity: 0.9 }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(at: Vector3, color: number): void {
    (this.points.material as PointsMaterial).color.setHex(color);
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < 24; i++) {
      if (this.ages[i] <= LIFETIME) continue;
      this.ages[i] = 0;
      this.positions[i * 3] = at.x;
      this.positions[i * 3 + 1] = at.y;
      this.positions[i * 3 + 2] = at.z;
      this.velocities[i * 3] = (Math.random() - 0.5) * 6;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 6;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
      spawned++;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.ages[i] > LIFETIME) continue;
      this.ages[i] += dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    (this.geom.getAttribute("position") as Float32BufferAttribute).copyArray(this.positions);
    this.geom.getAttribute("position").needsUpdate = true;
  }
}
```

- [ ] **Step 6: Run the theme test to verify it passes**

Run: `npx vitest run src/renderer/themes.test.ts`
Expected: PASS — 2 passed.

> `scene.ts` and `shatter.ts` use `WebGLRenderer`/`window` and are exercised manually in Task 18, not unit-tested (they require a real GPU context).

- [ ] **Step 7: Commit**

```bash
git add src/renderer
git commit -m "feat: add Three.js scene manager, theme palettes, and cosmetic shatter"
```

---

### Task 14: HUD overlay (`ui/hud.ts`)

**Files:**
- Create: `src/ui/hud.ts`
- Create: `src/ui/styles.css`
- Test: `src/ui/hud.test.ts`

**Interfaces:**
- Consumes: `RunState` (`game/state.ts`); `LevelDef` (`content/types.ts`).
- Produces:
  - `class Hud` — `constructor(root: HTMLElement)`, `update(state: RunState, level: LevelDef, roomCount: number): void`, `dispose(): void`. Renders ball count + reserve bar, score, `×N streak`, mode badge, and `Room k · Nm` (spec §2 Informative HUD).

- [ ] **Step 1: Write the failing test `src/ui/hud.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hud } from "./hud";
import { createRunState } from "../game/state";
import { LEVELS } from "../content/levels";

describe("Hud", () => {
  it("renders ball count, score, streak, mode badge, and distance", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const state = { ...createRunState("casual", 18), score: 12480, streak: 3, distance: 340, roomIndex: 3 };
    hud.update(state, LEVELS[0], 8);

    expect(root.querySelector("[data-hud=balls]")?.textContent).toContain("18");
    expect(root.querySelector("[data-hud=score]")?.textContent).toContain("12,480");
    expect(root.querySelector("[data-hud=streak]")?.textContent).toContain("3");
    expect(root.querySelector("[data-hud=mode]")?.textContent?.toUpperCase()).toContain("CASUAL");
    expect(root.querySelector("[data-hud=distance]")?.textContent).toContain("340");
  });

  it("scales the reserve bar relative to the level's start balls", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const state = { ...createRunState("normal", 25), balls: 5 };
    hud.update(state, LEVELS[0], 8); // startBalls 25 → 20%
    const bar = root.querySelector("[data-hud=reserve]") as HTMLElement;
    expect(bar.style.width).toBe("20%");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/hud.test.ts`
Expected: FAIL — cannot find module `./hud`.

- [ ] **Step 3: Write `src/ui/styles.css`**

```css
.hud { position: absolute; inset: 0; pointer-events: none; font-family: system-ui, sans-serif; color: #dffff5; text-shadow: 0 1px 4px #000; }
.hud-balls { position: absolute; top: 12px; left: 14px; font-size: 24px; font-weight: 700; }
.hud-reserve-track { width: 90px; height: 6px; background: rgba(255,255,255,.2); border-radius: 3px; margin-top: 4px; }
.hud-reserve-fill { height: 100%; background: #7ffcd9; border-radius: 3px; transition: width .15s; }
.hud-score { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); text-align: center; }
.hud-score-value { font-size: 20px; font-weight: 700; }
.hud-streak { font-size: 12px; color: #ffd278; }
.hud-mode { position: absolute; top: 12px; right: 14px; font-size: 12px; background: rgba(127,252,217,.18); border: 1px solid #7ffcd9; border-radius: 10px; padding: 2px 8px; }
.hud-distance { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 12px; opacity: .8; }
.crosshair { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border: 1px solid #fff; border-radius: 50%; opacity: .6; }
```

- [ ] **Step 4: Write `src/ui/hud.ts`**

```ts
import type { RunState } from "../game/state";
import type { LevelDef } from "../content/types";

export class Hud {
  private el: HTMLDivElement;

  constructor(private root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "hud";
    this.el.innerHTML = `
      <div class="hud-balls"><span data-hud="balls">◍ 0</span>
        <div class="hud-reserve-track"><div class="hud-reserve-fill" data-hud="reserve"></div></div>
      </div>
      <div class="hud-score">
        <div class="hud-score-value" data-hud="score">0</div>
        <div class="hud-streak" data-hud="streak">×1 streak</div>
      </div>
      <div class="hud-mode" data-hud="mode">NORMAL</div>
      <div class="hud-distance" data-hud="distance">Room 1 · 0m</div>
      <div class="crosshair"></div>`;
    this.root.appendChild(this.el);
  }

  update(state: RunState, level: LevelDef, roomCount: number): void {
    const q = (s: string) => this.el.querySelector(`[data-hud=${s}]`) as HTMLElement;
    q("balls").textContent = `◍ ${state.balls}`;
    q("reserve").style.width = `${Math.max(0, Math.min(100, (state.balls / level.startBalls) * 100))}%`;
    q("score").textContent = state.score.toLocaleString("en-US");
    q("streak").textContent = `×${state.streak} streak`;
    q("mode").textContent = state.mode.toUpperCase();
    q("distance").textContent = `Room ${Math.min(roomCount, state.roomIndex + 1)} · ${Math.round(state.distance)}m`;
  }

  dispose(): void {
    this.el.remove();
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/ui/hud.test.ts`
Expected: PASS — 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/ui/hud.ts src/ui/styles.css src/ui/hud.test.ts
git commit -m "feat: add informative HUD overlay (reserve, score, streak, mode, distance)"
```

---

### Task 15: Menus — main, mode toggle, pause, results (`ui/menus.ts`)

**Files:**
- Create: `src/ui/menus.ts`
- Test: `src/ui/menus.test.ts`

**Interfaces:**
- Consumes: `Mode` (`game/state.ts`); `SaveData`, `loadSave`, `saveSave` (`persistence/save.ts`); `LEVELS` (`content/levels.ts`).
- Produces:
  - `interface MenuCallbacks { onStart: (levelId: number, mode: Mode) => void; onResume: () => void; onRetry: () => void; onMenu: () => void; }`
  - `class Menus` — `constructor(root: HTMLElement, save: SaveData, cb: MenuCallbacks)`, `showMain(): void`, `showPause(): void`, `showResults(opts: { score: number; best: number; completed: boolean }): void`, `hide(): void`, `get mode(): Mode`, `toggleMode(): Mode` (persists via `saveSave`).

- [ ] **Step 1: Write the failing test `src/ui/menus.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Menus } from "./menus";
import { defaultSave } from "../persistence/save";

beforeEach(() => localStorage.clear());

const cbs = () => ({ onStart: vi.fn(), onResume: vi.fn(), onRetry: vi.fn(), onMenu: vi.fn() });

describe("Menus", () => {
  it("toggles mode between normal and casual and persists it", () => {
    const root = document.createElement("div");
    const m = new Menus(root, defaultSave(), cbs());
    expect(m.mode).toBe("normal");
    expect(m.toggleMode()).toBe("casual");
    expect(JSON.parse(localStorage.getItem("smashhit.save")!).mode).toBe("casual");
  });

  it("showMain lists only unlocked levels and starts the chosen one", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const save = { ...defaultSave(), unlockedLevel: 2 };
    const m = new Menus(root, save, cb);
    m.showMain();
    const buttons = root.querySelectorAll("[data-level]");
    expect(buttons.length).toBe(2); // levels 1 and 2 unlocked
    (buttons[0] as HTMLButtonElement).click();
    expect(cb.onStart).toHaveBeenCalledWith(1, "normal");
  });

  it("results screen shows the score and a retry button", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const m = new Menus(root, defaultSave(), cb);
    m.showResults({ score: 4200, best: 5000, completed: true });
    expect(root.textContent).toContain("4,200");
    (root.querySelector("[data-action=retry]") as HTMLButtonElement).click();
    expect(cb.onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/menus.test.ts`
Expected: FAIL — cannot find module `./menus`.

- [ ] **Step 3: Write `src/ui/menus.ts`**

```ts
import type { Mode } from "../game/state";
import { type SaveData, saveSave } from "../persistence/save";
import { LEVELS } from "../content/levels";

export interface MenuCallbacks {
  onStart: (levelId: number, mode: Mode) => void;
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export class Menus {
  private overlay: HTMLDivElement;
  private _mode: Mode;

  constructor(private root: HTMLElement, private save: SaveData, private cb: MenuCallbacks) {
    this._mode = save.mode;
    this.overlay = document.createElement("div");
    this.overlay.className = "menu-overlay";
    this.overlay.style.cssText =
      "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(15,30,34,.82);color:#dffff5;font-family:system-ui,sans-serif;text-align:center;";
    this.root.appendChild(this.overlay);
  }

  get mode(): Mode {
    return this._mode;
  }

  toggleMode(): Mode {
    this._mode = this._mode === "normal" ? "casual" : "normal";
    this.save = { ...this.save, mode: this._mode };
    saveSave(this.save);
    return this._mode;
  }

  private button(label: string, onClick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "pointer-events:auto;font-size:16px;padding:10px 22px;border-radius:10px;border:1px solid #7ffcd9;background:rgba(127,252,217,.14);color:#dffff5;cursor:pointer;";
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    b.addEventListener("click", onClick);
    return b;
  }

  showMain(): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const title = document.createElement("h1");
    title.textContent = "SMASH";
    this.overlay.appendChild(title);

    const modeBtn = this.button(`Mode: ${this._mode.toUpperCase()}`, () => {
      this.toggleMode();
      modeBtn.textContent = `Mode: ${this._mode.toUpperCase()}`;
    });
    this.overlay.appendChild(modeBtn);

    for (const lvl of LEVELS) {
      if (lvl.id > this.save.unlockedLevel) continue;
      const best = this.save.bestScores[lvl.id];
      const label = best ? `Level ${lvl.id} — best ${best.toLocaleString("en-US")}` : `Level ${lvl.id}`;
      this.overlay.appendChild(this.button(label, () => this.cb.onStart(lvl.id, this._mode), { "data-level": String(lvl.id) }));
    }
  }

  showPause(): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const h = document.createElement("h2");
    h.textContent = "Paused";
    this.overlay.appendChild(h);
    this.overlay.appendChild(this.button("Resume", () => this.cb.onResume(), { "data-action": "resume" }));
    this.overlay.appendChild(this.button("Main Menu", () => this.cb.onMenu(), { "data-action": "menu" }));
  }

  showResults(opts: { score: number; best: number; completed: boolean }): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const h = document.createElement("h2");
    h.textContent = opts.completed ? "Level Complete!" : "Run Over";
    this.overlay.appendChild(h);
    const score = document.createElement("p");
    score.textContent = `Score: ${opts.score.toLocaleString("en-US")} · Best: ${opts.best.toLocaleString("en-US")}`;
    this.overlay.appendChild(score);
    this.overlay.appendChild(this.button("Retry", () => this.cb.onRetry(), { "data-action": "retry" }));
    this.overlay.appendChild(this.button("Main Menu", () => this.cb.onMenu(), { "data-action": "menu" }));
  }

  hide(): void {
    this.overlay.style.display = "none";
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/menus.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/menus.ts src/ui/menus.test.ts
git commit -m "feat: add main/pause/results menus with persisted mode toggle"
```

---

### Task 16: Audio manager (`audio/audio.ts`)

**Files:**
- Create: `src/audio/audio.ts`
- Test: `src/audio/audio.test.ts`

**Interfaces:**
- Consumes: `Theme` (`content/types.ts`).
- Produces:
  - `type Sfx = "throw" | "shatterGlass" | "shatterCrystal"`
  - `class AudioManager` — `constructor(opts?: { muted?: boolean })`, `unlock(): void` (called on first user gesture; flips an internal `unlocked` flag), `get unlocked(): boolean`, `playSfx(s: Sfx): void`, `playMusic(theme: Theme): void`, `setMuted(m: boolean): void`, `get muted(): boolean`. Uses an injectable sound backend so it is testable without real audio.

> Asset note (Global Constraint): ship original/royalty-free `.mp3`/`.ogg` files under `src/audio/assets/`. The manager references them by key; if a file is absent it no-ops rather than throwing. Sourcing/creating the audio files is a content task done outside this plan; the code degrades gracefully without them.

- [ ] **Step 1: Write the failing test `src/audio/audio.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { AudioManager } from "./audio";

describe("AudioManager", () => {
  it("does not play sfx before being unlocked by a user gesture", () => {
    const play = vi.fn();
    const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.playSfx("throw");
    expect(play).not.toHaveBeenCalled();
  });

  it("plays sfx after unlock", () => {
    const play = vi.fn();
    const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.unlock();
    am.playSfx("throw");
    expect(play).toHaveBeenCalledWith("throw");
  });

  it("suppresses audio when muted and reports muted state", () => {
    const play = vi.fn();
    const am = new AudioManager({ muted: true, backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.unlock();
    am.playSfx("throw");
    expect(play).not.toHaveBeenCalled();
    expect(am.muted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/audio/audio.test.ts`
Expected: FAIL — cannot find module `./audio`.

- [ ] **Step 3: Write `src/audio/audio.ts`**

```ts
import type { Theme } from "../content/types";

export type Sfx = "throw" | "shatterGlass" | "shatterCrystal";

export interface AudioBackend {
  play(s: Sfx): void;
  music(theme: Theme): void;
  setVolume(v: number): void;
}

// Default backend lazily creates HTMLAudioElements; missing files no-op.
class HtmlAudioBackend implements AudioBackend {
  private cache = new Map<string, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;

  private get(src: string): HTMLAudioElement {
    let a = this.cache.get(src);
    if (!a) {
      a = new Audio(src);
      a.addEventListener("error", () => {}); // missing asset: ignore
      this.cache.set(src, a);
    }
    return a;
  }

  play(s: Sfx): void {
    const a = this.get(`/src/audio/assets/${s}.mp3`).cloneNode() as HTMLAudioElement;
    void a.play().catch(() => {});
  }

  music(theme: Theme): void {
    this.current?.pause();
    const a = this.get(`/src/audio/assets/music-${theme}.mp3`);
    a.loop = true;
    void a.play().catch(() => {});
    this.current = a;
  }

  setVolume(v: number): void {
    if (this.current) this.current.volume = v;
  }
}

export class AudioManager {
  private _muted: boolean;
  private _unlocked = false;
  private backend: AudioBackend;

  constructor(opts: { muted?: boolean; backend?: AudioBackend } = {}) {
    this._muted = opts.muted ?? false;
    this.backend = opts.backend ?? new HtmlAudioBackend();
  }

  get unlocked(): boolean {
    return this._unlocked;
  }
  get muted(): boolean {
    return this._muted;
  }

  unlock(): void {
    this._unlocked = true;
  }

  setMuted(m: boolean): void {
    this._muted = m;
    this.backend.setVolume(m ? 0 : 1);
  }

  playSfx(s: Sfx): void {
    if (!this._unlocked || this._muted) return;
    this.backend.play(s);
  }

  playMusic(theme: Theme): void {
    if (!this._unlocked || this._muted) return;
    this.backend.music(theme);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/audio/audio.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audio/audio.ts src/audio/audio.test.ts
git commit -m "feat: add audio manager with autoplay unlock and mute (injectable backend)"
```

---

### Task 17: Bootstrap & WebGL fallback (`main.ts`, `engine/perf.ts`)

Wires everything into a playable app: canvas, scene, loop, session, HUD, menus, input, audio, persistence, performance auto-scaling, and a WebGL fallback.

**Files:**
- Create: `src/engine/perf.ts`
- Test: `src/engine/perf.test.ts`
- Modify: `src/main.ts` (replace the Task 1 placeholder)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `function detectWebGL(): boolean`
  - `function recommendedQuality(sampleFrameMs: number): "low" | "high"` — `>22ms → "low"`, else `"high"`.

- [ ] **Step 1: Write the failing test `src/engine/perf.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { recommendedQuality } from "./perf";

describe("recommendedQuality", () => {
  it("recommends low quality on slow frames", () => {
    expect(recommendedQuality(30)).toBe("low");
  });
  it("recommends high quality on fast frames", () => {
    expect(recommendedQuality(12)).toBe("high");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/perf.test.ts`
Expected: FAIL — cannot find module `./perf`.

- [ ] **Step 3: Write `src/engine/perf.ts`**

```ts
export function recommendedQuality(sampleFrameMs: number): "low" | "high" {
  return sampleFrameMs > 22 ? "low" : "high";
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/perf.test.ts`
Expected: PASS — 2 passed.

- [ ] **Step 5: Replace `src/main.ts` with the full bootstrap**

```ts
import "./ui/styles.css";
import { Vector3 } from "three";
import { SceneManager, type RenderItem } from "./renderer/scene";
import { ShatterField } from "./renderer/shatter";
import { GameLoop } from "./engine/loop";
import { Session } from "./game/session";
import { Hud } from "./ui/hud";
import { Menus } from "./ui/menus";
import { InputController } from "./game/input";
import { AudioManager } from "./audio/audio";
import { loadSave, recordScore, saveSave } from "./persistence/save";
import { detectWebGL } from "./engine/perf";
import { LEVELS } from "./content/levels";
import { ROOMS } from "./content/rooms";
import type { Mode } from "./game/state";

const app = document.getElementById("app")!;

if (!detectWebGL()) {
  app.innerHTML =
    '<div style="color:#dffff5;font-family:system-ui;display:flex;height:100%;align-items:center;justify-content:center;text-align:center;padding:24px">' +
    "Your browser doesn’t support WebGL, which this game needs. Try a recent Chrome, Safari, Firefox, or Edge.</div>";
} else {
  bootstrap();
}

function bootstrap(): void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  app.appendChild(canvas);

  const scene = new SceneManager(canvas);
  const shatter = new ShatterField(scene.scene);
  const hud = new Hud(app);
  const audio = new AudioManager({ muted: loadSave().muted });
  const input = new InputController(canvas);

  let session: Session | null = null;
  let save = loadSave();

  const resize = () => scene.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  const renderItems = (): RenderItem[] => {
    if (!session) return [];
    return session.colliders().map((c) => ({
      id: c.id,
      kind: c.kind,
      pos: c.box.getCenter(new Vector3()),
      size: (c.box.max.x - c.box.min.x) / 2,
    }));
  };

  const loop = new GameLoop({
    update: (dt) => {
      session?.update(dt);
      shatter.update(dt);
      if (session) {
        scene.sync(renderItems());
        hud.update(session.state, session.built.level, session.built.rooms.length);
        if (session.state.status !== "playing") endRun();
      }
    },
    render: () => scene.render(),
  });

  const menus = new Menus(app, save, {
    onStart: (levelId, mode) => startLevel(levelId, mode),
    onResume: () => {
      menus.hide();
      loop.resume();
    },
    onRetry: () => {
      if (session) startLevel(session.built.level.id, session.state.mode);
    },
    onMenu: () => {
      session = null;
      menus.showMain();
      loop.pause();
    },
  });

  function startLevel(levelId: number, mode: Mode): void {
    audio.unlock();
    const level = LEVELS.find((l) => l.id === levelId)!;
    const theme = ROOMS[0].theme;
    scene.setTheme(theme);
    audio.playMusic(theme);
    session = new Session(level, ROOMS, mode, scene.camera, Date.now() & 0xffff, {
      onShatter: (kind, at) => {
        shatter.burst(at, kind === "crystal" ? 0x7ffcd9 : 0x4fb3a3);
        audio.playSfx(kind === "crystal" ? "shatterCrystal" : "shatterGlass");
      },
    });
    menus.hide();
    loop.resume();
    if (!loop.running) loop.start();
  }

  function endRun(): void {
    if (!session) return;
    const completed = session.state.status === "complete";
    save = recordScore(save, session.built.level.id, session.state.score);
    saveSave(save);
    loop.pause();
    menus.showResults({
      score: session.state.score,
      best: save.bestScores[session.built.level.id] ?? session.state.score,
      completed,
    });
  }

  input.onThrow((p) => {
    if (session && session.state.status === "playing") {
      audio.playSfx("throw");
      session.throwBall(p);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) loop.pause();
  });

  menus.showMain();
  loop.start();
  loop.pause();
}
```

- [ ] **Step 6: Type-check and build**

Run: `npm run build`
Expected: PASS — `tsc --noEmit` reports no errors and Vite produces `dist/`.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 8: Commit**

```bash
git add src/engine/perf.ts src/engine/perf.test.ts src/main.ts
git commit -m "feat: wire bootstrap with loop, session, HUD, menus, audio, WebGL fallback"
```

---

### Task 18: Manual playtest & tuning pass

No new production code unless a defect is found; this task validates *feel* (the thing tests can't measure) and confirms the cross-device requirement.

**Files:**
- Create: `docs/superpowers/playtest-checklist.md`

- [ ] **Step 1: Write the checklist `docs/superpowers/playtest-checklist.md`**

```markdown
# Smash Hit Web — Manual Playtest Checklist

Run `npm run dev` and open the printed URL.

## Cross-device controls (Global Constraint)
- [ ] Desktop: clicking aims and throws toward the cursor.
- [ ] Mobile (or devtools touch emulation): tapping throws toward the tap point.
- [ ] Both feel identical; no mode switch needed.

## Core loop
- [ ] Balls fly with a slight arc and shatter obstacles on contact.
- [ ] Smashing crystals visibly refills the reserve bar and bumps score.
- [ ] Streak multiplier climbs on chained hits and the HUD updates live.
- [ ] Shatter bursts appear and fade (cosmetic, no leftover debris).

## Modes (Spec §6)
- [ ] Normal: reserve can hit zero → "Run Over" results screen.
- [ ] Casual: reserve never drops below 1; run always reaches "Level Complete".
- [ ] Mode toggle on the main menu persists across reloads.

## Difficulty curve (Spec §5)
- [ ] Level 1 feels gentle; each subsequent level feels only slightly harder.
- [ ] No sudden spikes between levels.

## Robustness (Spec §7)
- [ ] Backgrounding the tab pauses the game.
- [ ] Reloading keeps unlocked levels and best scores.
- [ ] Muting persists; audio starts only after the first tap/click.
- [ ] On a throttled CPU (devtools 6× slowdown) the game stays responsive.

## Tuning notes
- Record any level that feels too hard/easy; adjust `LEVELS` constants or room
  difficulty ratings, re-run `npm test` (curve invariants must still pass), and re-playtest.
```

- [ ] **Step 2: Run the dev server and work through the checklist**

Run: `npm run dev`
Expected: the game loads to the main menu; every checklist item passes. File any failures as defects and fix via the relevant task's TDD cycle (write a failing test first where the defect is in testable logic).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/playtest-checklist.md
git commit -m "docs: add manual playtest and tuning checklist"
```

---

## Self-Review

**Spec coverage:**
- §1 goals (forward motion, aiming, shatter, ammo tension) → Tasks 7, 8, 11, 13. ✓
- §1 non-goals respected: cosmetic shatter (13), no backend (10), no music-reactive gen (16 keeps audio independent), no Journey mode (not built). ✓
- §1 legal / Global Constraint original assets → noted in Task 16 asset note. ✓
- §2 stylized 3D (13), tap-to-throw (8, 9), hybrid rooms (5, 6), themed rooms (5, 13), faithful economy (4), Normal+Casual (4, 11), 6 levels (3), music+SFX (16), Lean MVP local save (10), Three.js + custom physics (7, 13), Crystal Cavern theme (13), informative HUD (14). ✓
- §3 one-directional data flow → enforced; renderer/UI read a render list, never mutate (Tasks 11, 13, 17). ✓
- §4 game loop & data flow → Tasks 11, 12, 17. ✓
- §5 difficulty curve + "very steady" invariants → Tasks 3 (level-def overlap/monotonic/shallow-speed tests) and 6 (band containment + low→high ramp tests). ✓
- §6 modes & economy detail (costs, refills, streak, casual softening) → Task 4. ✓
- §7 error handling (WebGL fallback, perf scaling, audio gating, corrupt save, pause on blur) → Tasks 10, 16, 17; performance budget (pooling/cosmetic shatter) → Tasks 11, 13. testing strategy (unit + integration + manual) → Tasks 2–16 unit, 11 integration, 18 manual. ✓
- §8 futures → intentionally not built. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases" left; every code step contains complete code. The audio *asset files* are explicitly out-of-code-scope with graceful degradation (not a code placeholder).

**Type consistency:** `RunState`, `Mode`, `LevelDef`, `RoomTemplate`, `Ball`, `Collider`, `ScreenPoint`, `BuiltLevel`, `SaveData`, `RenderItem` are each defined once and consumed with matching signatures across tasks. `Session` exposes `state`, `built`, `colliders()`, `throwBall()`, `update()` exactly as `main.ts` consumes them. `buildLevel`/`makeRng` signatures match between Tasks 6 and 11. `Hud.update(state, level, roomCount)` matches its call site in Task 17.

No gaps found.

import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { Session, slideX } from "./session";
import { ROOMS } from "../content/rooms";
import { START_BALLS, CHECKPOINT_SPACING, pathOffsetY, LOOP_LENGTH } from "../content/endless";

function cam(): PerspectiveCamera {
  const c = new PerspectiveCamera(60, 1, 0.1, 1000);
  c.position.set(0, 1, 0);
  c.lookAt(new Vector3(0, 1, -10));
  c.updateMatrixWorld();
  return c;
}

describe("Session (endless)", () => {
  it("generates rooms ahead and starts playing", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    expect(s.state.status).toBe("playing");
    expect(s.state.balls).toBe(START_BALLS);
    expect(s.liveBalls.length).toBe(0);
    // intro loop clears the very start; advance past it, then content appears
    for (let i = 0; i < 200 && s.state.distance < LOOP_LENGTH + 20; i++) s.update(0.1);
    expect(s.colliders().length).toBeGreaterThan(0);
  });

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

  it("advances distance over time", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    s.update(1);
    expect(s.state.distance).toBeGreaterThan(0);
  });

  it("keeps generating content far into the run (casual)", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    for (let i = 0; i < 1500; i++) s.update(0.1);
    expect(s.state.distance).toBeGreaterThan(500);
    expect(s.colliders().length).toBeGreaterThan(0);
  });

  it("advances the checkpoint every CHECKPOINT_SPACING meters (casual)", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    for (let i = 0; i < 4000 && s.state.distance < CHECKPOINT_SPACING + 10; i++) s.update(0.1);
    expect(s.checkpoint).toBe(CHECKPOINT_SPACING);
  });

  it("Casual never dies and the reserve never drops below 1", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    for (let i = 0; i < 2000; i++) s.update(0.1);
    expect(s.state.status).toBe("playing");
    expect(s.state.balls).toBeGreaterThanOrEqual(1);
  });

  it("crashing into unbroken objects drains the reserve (casual)", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    for (let i = 0; i < 600 && s.state.balls > 1; i++) s.update(0.1);
    expect(s.state.balls).toBeLessThan(START_BALLS);
  });

  it("Normal ends the run when the reserve is emptied", () => {
    const s = new Session(ROOMS, "normal", cam(), 1);
    for (let i = 0; i < START_BALLS + 2; i++) s.throwBall({ nx: 0, ny: 0 });
    expect(s.state.status).toBe("ended");
  });

  it("throwing costs one ball in Normal", () => {
    const s = new Session(ROOMS, "normal", cam(), 1);
    const before = s.state.balls;
    s.throwBall({ nx: 0, ny: 0 });
    expect(s.state.balls).toBe(before - 1);
    expect(s.liveBalls.length).toBe(1);
  });

  it("exposes live thrown balls and advances them", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    s.throwBall({ nx: 0, ny: 0 });
    const startZ = s.liveBalls[0].pos.z;
    s.update(0.1);
    expect(s.liveBalls[0]?.pos.z ?? Infinity).toBeLessThan(startZ);
  });

  it("crossing a checkpoint grants bonus balls", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    let jumped = false;
    for (let i = 0; i < 6000 && !jumped; i++) {
      const cpBefore = s.checkpoint;
      const ballsBefore = s.state.balls;
      s.update(0.1);
      if (s.checkpoint > cpBefore) {
        // +3 bonus, minus at most one crash that same frame
        expect(s.state.balls).toBeGreaterThanOrEqual(ballsBefore + 2);
        jumped = true;
      }
    }
    expect(jumped).toBe(true);
  });

  it("inserts door gates between rooms", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    let sawDoor = false;
    for (let i = 0; i < 2000 && !sawDoor; i++) {
      s.update(0.1);
      if (s.colliders().some((c) => c.kind === "door")) sawDoor = true;
    }
    expect(sawDoor).toBe(true);
  });

  it("can start at a given distance for testing", () => {
    const s = new Session(ROOMS, "casual", cam(), 1, {}, 800);
    expect(s.state.distance).toBe(800);
    expect(s.checkpoint).toBe(800);
    expect(s.colliders().length).toBeGreaterThan(0); // content generated around the start point
  });
});

describe("Session rogue mode", () => {
  it("rogue: chooseUpgrade grants the weapon", () => {
    const s = new Session(ROOMS, "rogue", cam(), 1);
    s.chooseUpgrade("sword");
    expect(s.state.weapons).toContain("sword");
  });
});

describe("slideX", () => {
  it("oscillates around the base x", () => {
    expect(slideX(0, 0, 0, 2, 1.6)).toBeCloseTo(0, 6); // sin(0)=0
    const v = slideX(1, 0, Math.PI / (2 * 1.6), 2, 1.6); // sin(pi/2)=1 → 1 + 2
    expect(v).toBeCloseTo(3, 5);
  });
});

it("fires onLoopStart when entering a loop (intro loop fires immediately)", () => {
  let starts = 0;
  const s = new Session(ROOMS, "casual", cam(), 1, { onLoopStart: () => { starts++; } });
  s.update(0.1); // already inside the intro loop at distance ~0
  expect(starts).toBe(1);
  // run until we leave the intro loop and hit the next periodic loop; it fires again
  for (let i = 0; i < 20000 && starts < 2; i++) s.update(0.05);
  expect(starts).toBe(2);
});

it("entities ride the vertical hills as the player advances", () => {
  const s = new Session(ROOMS, "casual", cam(), 1, {}, 1570); // hilly distance, past loop at [1500,1560)
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

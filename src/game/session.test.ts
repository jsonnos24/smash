import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { Session } from "./session";
import { ROOMS } from "../content/rooms";
import { START_BALLS, CHECKPOINT_SPACING } from "../content/endless";

function cam(): PerspectiveCamera {
  const c = new PerspectiveCamera(60, 1, 0.1, 1000);
  c.position.set(0, 1, 0);
  c.lookAt(new Vector3(0, 1, -10));
  c.updateMatrixWorld();
  return c;
}

describe("Session (endless)", () => {
  it("generates rooms ahead on construction and starts playing", () => {
    const s = new Session(ROOMS, "casual", cam(), 1);
    expect(s.state.status).toBe("playing");
    expect(s.state.balls).toBe(START_BALLS);
    expect(s.liveBalls.length).toBe(0);
    expect(s.colliders().length).toBeGreaterThan(0);
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

  it("Normal respawns at the last checkpoint with a refilled reserve when out of balls", () => {
    const s = new Session(ROOMS, "normal", cam(), 1);
    for (let i = 0; i < START_BALLS + 2; i++) s.throwBall({ nx: 0, ny: 0 });
    expect(s.state.balls).toBe(0);
    s.update(0.016);
    expect(s.state.balls).toBe(START_BALLS);
    expect(s.state.distance).toBe(s.checkpoint);
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
});

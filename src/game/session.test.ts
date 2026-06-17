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

  it("advances roomIndex as the player progresses through the level", () => {
    const s = new Session(LEVELS[0], ROOMS, "casual", cam(), 1);
    expect(s.state.roomIndex).toBe(0);
    // advance roughly to the start of the second room
    const secondRoomStart = s.built.rooms[1].startZ;
    while (s.state.distance < secondRoomStart + 1 && s.state.status === "playing") {
      s.update(0.1);
    }
    expect(s.state.roomIndex).toBeGreaterThanOrEqual(1);
    // roomIndex must never exceed the last room's index
    expect(s.state.roomIndex).toBeLessThanOrEqual(s.built.rooms.length - 1);
  });

  it("exposes live thrown balls and advances them for rendering", () => {
    const s = new Session(LEVELS[0], ROOMS, "casual", cam(), 1);
    expect(s.liveBalls.length).toBe(0);
    s.throwBall({ nx: 0, ny: 0 });
    expect(s.liveBalls.length).toBe(1);
    const startZ = s.liveBalls[0].pos.z;
    s.update(0.1);
    expect(s.liveBalls.length).toBe(1);
    // a center throw flies forward (−Z), so z decreases from its spawn point
    expect(s.liveBalls[0].pos.z).toBeLessThan(startZ);
  });
});

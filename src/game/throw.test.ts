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

import { describe, it, expect } from "vitest";
import { Vector3, Box3 } from "three";
import { stepBall, detectHit, reflectBounds, GRAVITY, type Ball, type Collider } from "./physics";

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

describe("reflectBounds", () => {
  it("reflects off the right wall (x) inward", () => {
    const b = { id: 1, pos: new Vector3(4, 1, -5), vel: new Vector3(3, 0, -10), alive: true };
    reflectBounds(b, 3.5, -2, 5);
    expect(b.pos.x).toBe(3.5);
    expect(b.vel.x).toBeLessThan(0);
  });
  it("reflects off the floor (y) upward", () => {
    const b = { id: 1, pos: new Vector3(0, -3, -5), vel: new Vector3(0, -4, -10), alive: true };
    reflectBounds(b, 3.5, -2, 5);
    expect(b.pos.y).toBe(-2);
    expect(b.vel.y).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { difficultyAt, speedAt, pathOffsetX } from "./endless";

describe("difficultyAt", () => {
  it("starts at 1, rises monotonically, and caps at 10", () => {
    expect(difficultyAt(0)).toBeCloseTo(1, 6);
    expect(difficultyAt(900)).toBeGreaterThan(difficultyAt(300));
    expect(difficultyAt(100000)).toBe(10);
  });
});

describe("speedAt", () => {
  it("starts near 1 and the baseline rises with distance, capped", () => {
    expect(speedAt(0)).toBeGreaterThanOrEqual(1);
    expect(speedAt(0)).toBeLessThan(1.5);
    // far out, baseline alone is higher than the start baseline
    expect(speedAt(5000)).toBeGreaterThan(1.6);
    expect(speedAt(5000)).toBeLessThanOrEqual(1.7 + 0.4 + 1e-9);
  });
});

describe("pathOffsetX", () => {
  it("is 0 at the start and varies smoothly with distance", () => {
    expect(pathOffsetX(0)).toBeCloseTo(0, 6);
    expect(pathOffsetX(100)).not.toBeCloseTo(pathOffsetX(300), 2); // it moves
    expect(Math.abs(pathOffsetX(500))).toBeLessThanOrEqual(2.6); // bounded by amplitudes
  });
});

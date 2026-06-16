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

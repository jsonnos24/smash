import { describe, it, expect } from "vitest";
import { difficultyAt, speedAt, pathOffsetX, pathOffsetY, trackSlope, loopPhase, LOOP_LENGTH, LOOP_INTERVAL } from "./endless";

describe("difficultyAt", () => {
  it("starts at 1, rises monotonically, and caps at 9", () => {
    expect(difficultyAt(0)).toBeCloseTo(1, 6);
    expect(difficultyAt(900)).toBeGreaterThan(difficultyAt(300));
    expect(difficultyAt(100000)).toBe(9);
  });
});

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

describe("pathOffsetX", () => {
  it("is 0 at the start and varies smoothly with distance", () => {
    expect(pathOffsetX(0)).toBeCloseTo(0, 6);
    expect(pathOffsetX(100)).not.toBeCloseTo(pathOffsetX(300), 2); // it moves
    expect(Math.abs(pathOffsetX(500))).toBeLessThanOrEqual(2.6); // bounded by amplitudes
  });
});

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

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

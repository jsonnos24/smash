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
      powerupT: 0,
      blueDiamonds: 0,
      weapons: [],
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

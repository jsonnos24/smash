import { describe, it, expect } from "vitest";
import { createRunState } from "./state";
import {
  obstacleCost,
  crystalRefill,
  applyObstacleHit,
  applyCrystalHit,
  applyMiss,
  applyObstacleCollision,
  OBSTACLE_POINTS,
  CRYSTAL_POINTS,
} from "./economy";
import { LEVELS } from "../content/levels";

const L1 = LEVELS[0]; // band [1,2], veryHigh
const L6 = LEVELS[5]; // band [6.8,8.5], lean

describe("cost & refill scaling", () => {
  it("obstacle cost is gentle early, higher late", () => {
    expect(obstacleCost(L1)).toBe(1); // round(2/2)=1
    expect(obstacleCost(L6)).toBe(4); // round(8.5/2)=4
  });
  it("crystal refill scales with generosity", () => {
    expect(crystalRefill(L1)).toBe(5); // veryHigh
    expect(crystalRefill(L6)).toBe(2); // lean
  });
});

describe("applyObstacleHit", () => {
  it("scores, builds streak, and spends balls", () => {
    const s = applyObstacleHit(createRunState("normal", 25), L1);
    expect(s.score).toBe(OBSTACLE_POINTS * 1);
    expect(s.hitChain).toBe(1);
    expect(s.balls).toBe(24);
    expect(s.status).toBe("playing");
  });

  it("ends the run in Normal mode when balls reach zero", () => {
    const low = { ...createRunState("normal", 3), balls: 3 };
    const s = applyObstacleHit(low, L6); // cost 4
    expect(s.balls).toBe(0);
    expect(s.status).toBe("ended");
  });

  it("clamps to 1 ball and never ends in Casual mode", () => {
    const low = { ...createRunState("casual", 3), balls: 3 };
    const s = applyObstacleHit(low, L6); // cost 4
    expect(s.balls).toBe(1);
    expect(s.status).toBe("playing");
  });
});

describe("applyCrystalHit", () => {
  it("scores and refills in Normal", () => {
    const s = applyCrystalHit(createRunState("normal", 10), L1);
    expect(s.score).toBe(CRYSTAL_POINTS * 1);
    expect(s.balls).toBe(15); // +5
    expect(s.hitChain).toBe(1);
  });
  it("refills one extra ball in Casual", () => {
    const s = applyCrystalHit(createRunState("casual", 10), L1);
    expect(s.balls).toBe(16); // +5 +1
  });
});

describe("applyObstacleCollision", () => {
  it("costs balls and resets the streak in Normal, no score", () => {
    let s = createRunState("normal", 10);
    s = applyObstacleHit(s, L1); // earn some score + streak first
    const beforeBalls = s.balls;
    const beforeScore = s.score;
    s = applyObstacleCollision(s, L1);
    expect(s.balls).toBe(beforeBalls - obstacleCost(L1));
    expect(s.score).toBe(beforeScore); // a crash scores nothing
    expect(s.hitChain).toBe(0);
    expect(s.streak).toBe(1);
    expect(s.status).toBe("playing");
  });
  it("ends the run in Normal when a crash empties the reserve", () => {
    const low = { ...createRunState("normal", 1), balls: 1 };
    const s = applyObstacleCollision(low, L6); // cost 4
    expect(s.balls).toBe(0);
    expect(s.status).toBe("ended");
  });
  it("clamps to 1 and never ends in Casual", () => {
    const low = { ...createRunState("casual", 1), balls: 1 };
    const s = applyObstacleCollision(low, L6);
    expect(s.balls).toBe(1);
    expect(s.status).toBe("playing");
  });
});

describe("applyMiss", () => {
  it("resets the streak in Normal", () => {
    let s = createRunState("normal", 25);
    s = applyObstacleHit(s, L1);
    s = applyObstacleHit(s, L1); // hitChain 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(0);
    expect(s.streak).toBe(1);
  });
  it("softens the streak in Casual (subtracts 3 from chain)", () => {
    let s = createRunState("casual", 25);
    for (let i = 0; i < 6; i++) s = applyObstacleHit(s, L1); // hitChain 6, streak 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(3);
    expect(s.streak).toBe(1);
  });
});

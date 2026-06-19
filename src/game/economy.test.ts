import { describe, it, expect } from "vitest";
import { createRunState } from "./state";
import {
  applyObstacleHit,
  applyCrystalHit,
  applyMiss,
  applyCrash,
  applyDoorHit,
  OBSTACLE_POINTS,
  CRYSTAL_POINTS,
} from "./economy";

describe("applyObstacleHit", () => {
  it("scores, builds streak, and refunds the thrown ball (+1)", () => {
    const s = applyObstacleHit(createRunState("normal", 25));
    expect(s.score).toBe(OBSTACLE_POINTS * 1);
    expect(s.hitChain).toBe(1);
    expect(s.balls).toBe(26);
    expect(s.status).toBe("playing");
  });

  it("the smash refund never exceeds the cap", () => {
    const s = { ...createRunState("normal", 40), balls: 40 };
    expect(applyObstacleHit(s).balls).toBe(40);
  });
});

describe("applyCrystalHit", () => {
  it("scores and refills in Normal", () => {
    const s = applyCrystalHit(createRunState("normal", 10));
    expect(s.score).toBe(CRYSTAL_POINTS * 1);
    expect(s.balls).toBe(13); // +3
    expect(s.hitChain).toBe(1);
  });
  it("refills flat 3 in Casual", () => {
    const s = applyCrystalHit(createRunState("casual", 10));
    expect(s.balls).toBe(13); // +3
  });
  it("crystal gain never exceeds the cap", () => {
    const s = { ...createRunState("normal", 39), balls: 39 };
    expect(applyCrystalHit(s).balls).toBe(40);
  });
});

describe("applyCrash", () => {
  it("costs 1 ball and resets the streak in Normal, no score", () => {
    let s = createRunState("normal", 10);
    s = applyObstacleHit(s); // earn score + streak first
    const beforeBalls = s.balls;
    const beforeScore = s.score;
    s = applyCrash(s);
    expect(s.balls).toBe(beforeBalls - 1);
    expect(s.score).toBe(beforeScore);
    expect(s.hitChain).toBe(0);
    expect(s.streak).toBe(1);
    expect(s.status).toBe("playing");
  });
  it("ends the run in Normal when a crash empties the reserve", () => {
    const low = { ...createRunState("normal", 1), balls: 1 };
    const s = applyCrash(low);
    expect(s.balls).toBe(0);
    expect(s.status).toBe("ended");
  });
  it("clamps to 1 and never ends in Casual", () => {
    const low = { ...createRunState("casual", 1), balls: 1 };
    const s = applyCrash(low);
    expect(s.balls).toBe(1);
    expect(s.status).toBe("playing");
  });
});

describe("applyDoorHit", () => {
  it("a non-breaking hit refunds the ball but does not score", () => {
    const s = applyDoorHit(createRunState("normal", 20), false);
    expect(s.balls).toBe(21);
    expect(s.score).toBe(0);
    expect(s.hitChain).toBe(0);
  });
  it("the breaking hit refunds the ball and scores", () => {
    const s = applyDoorHit(createRunState("normal", 20), true);
    expect(s.balls).toBe(21);
    expect(s.score).toBe(80);
    expect(s.hitChain).toBe(1);
  });
  it("door refund never exceeds the cap", () => {
    const s = applyDoorHit({ ...createRunState("normal", 40), balls: 40 }, false);
    expect(s.balls).toBe(40);
  });
});

describe("applyMiss", () => {
  it("resets the streak in Normal", () => {
    let s = createRunState("normal", 25);
    s = applyObstacleHit(s);
    s = applyObstacleHit(s); // hitChain 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(0);
    expect(s.streak).toBe(1);
  });
  it("softens the streak in Casual (subtracts 3 from chain)", () => {
    let s = createRunState("casual", 25);
    for (let i = 0; i < 6; i++) s = applyObstacleHit(s); // hitChain 6, streak 2
    s = applyMiss(s);
    expect(s.hitChain).toBe(3);
    expect(s.streak).toBe(1);
  });
});

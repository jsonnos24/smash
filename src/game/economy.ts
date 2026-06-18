import { type RunState, streakMultiplier } from "./state";
import type { Generosity, LevelDef } from "../content/types";

export const OBSTACLE_POINTS = 50;
export const CRYSTAL_POINTS = 100;

const REFILL_BY_GENEROSITY: Record<Generosity, number> = {
  veryHigh: 5,
  high: 4,
  medium: 3,
  lean: 2,
};

export function obstacleCost(level: LevelDef): number {
  return Math.max(1, Math.round(level.band[1] / 2));
}

export function crystalRefill(level: LevelDef): number {
  return REFILL_BY_GENEROSITY[level.crystalGenerosity];
}

function scoreHit(state: RunState, points: number): Pick<RunState, "score" | "hitChain" | "streak"> {
  const hitChain = state.hitChain + 1;
  return {
    score: state.score + points * state.streak,
    hitChain,
    streak: streakMultiplier(hitChain),
  };
}

export function applyObstacleHit(state: RunState, level: LevelDef): RunState {
  const scored = scoreHit(state, OBSTACLE_POINTS);
  let balls = state.balls - obstacleCost(level);
  let status = state.status;
  if (state.mode === "casual") {
    balls = Math.max(1, balls);
  } else if (balls <= 0) {
    balls = 0;
    status = "ended";
  }
  return { ...state, ...scored, balls, status };
}

export function applyCrystalHit(state: RunState, level: LevelDef): RunState {
  const scored = scoreHit(state, CRYSTAL_POINTS);
  const refill = crystalRefill(level) + (state.mode === "casual" ? 1 : 0);
  return { ...state, ...scored, balls: state.balls + refill };
}

export function applyObstacleCollision(state: RunState, level: LevelDef): RunState {
  // Crashing into an unbroken obstacle: lose balls, break the streak, no score.
  let balls = state.balls - obstacleCost(level);
  let status = state.status;
  if (state.mode === "casual") {
    balls = Math.max(1, balls);
  } else if (balls <= 0) {
    balls = 0;
    status = "ended";
  }
  return { ...state, balls, hitChain: 0, streak: streakMultiplier(0), status };
}

export function applyMiss(state: RunState): RunState {
  const hitChain = state.mode === "casual" ? Math.max(0, state.hitChain - 3) : 0;
  return { ...state, hitChain, streak: streakMultiplier(hitChain) };
}

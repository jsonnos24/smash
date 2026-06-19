import { type RunState, streakMultiplier } from "./state";
import { MAX_BALLS } from "../content/endless";

export const OBSTACLE_POINTS = 50;
export const CRYSTAL_POINTS = 100;

export const COLLISION_COST = 1;

function scoreHit(state: RunState, points: number): Pick<RunState, "score" | "hitChain" | "streak"> {
  const hitChain = state.hitChain + 1;
  return {
    score: state.score + points * state.streak,
    hitChain,
    streak: streakMultiplier(hitChain),
  };
}

export function applyObstacleHit(state: RunState): RunState {
  return { ...state, ...scoreHit(state, OBSTACLE_POINTS) };
}

export function applyCrystalHit(state: RunState): RunState {
  return { ...state, ...scoreHit(state, CRYSTAL_POINTS), balls: Math.min(MAX_BALLS, state.balls + 2) };
}

/** Crashing into any unbroken object: lose a ball, break the streak, no score. */
export function applyCrash(state: RunState): RunState {
  let balls = state.balls - COLLISION_COST;
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

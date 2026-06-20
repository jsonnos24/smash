import type { WeaponId } from "./upgrades";

export type Mode = "normal" | "casual" | "rogue";
export type RunStatus = "playing" | "ended" | "complete";

export interface RunState {
  mode: Mode;
  balls: number;
  score: number;
  streak: number;
  hitChain: number;
  distance: number;
  roomIndex: number;
  status: RunStatus;
  powerupT: number;
  blueDiamonds: number;
  weapons: WeaponId[];
}

export function streakMultiplier(hitChain: number): number {
  return Math.min(5, 1 + Math.floor(hitChain / 5));
}

export function createRunState(mode: Mode, startBalls: number): RunState {
  return {
    mode,
    balls: startBalls,
    score: 0,
    streak: 1,
    hitChain: 0,
    distance: 0,
    roomIndex: 0,
    status: "playing",
    powerupT: 0,
    blueDiamonds: 0,
    weapons: [],
  };
}

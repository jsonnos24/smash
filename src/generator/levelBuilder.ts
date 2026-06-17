import type { LevelDef } from "../content/types";
import type { RoomTemplate } from "../content/rooms";

export { makeRng } from "./rng";

export interface PlacedRoom {
  template: RoomTemplate;
  startZ: number;
}

export interface BuiltLevel {
  level: LevelDef;
  rooms: PlacedRoom[];
  totalLength: number;
}

export function buildLevel(
  level: LevelDef,
  rooms: RoomTemplate[],
  rng: () => number,
): BuiltLevel {
  const [low, high] = level.band;
  const pool = rooms.filter((r) => r.difficulty >= low && r.difficulty <= high);
  if (pool.length === 0) {
    throw new Error(`No rooms available for level ${level.id} band [${low}, ${high}]`);
  }

  const placed: PlacedRoom[] = [];
  let z = 0;
  let lastDifficulty = -Infinity;
  while (z < level.length) {
    const progress = Math.min(1, z / level.length);
    const target = low + (high - low) * progress;
    // Only rooms at or above the last placed room's difficulty keep the ramp
    // non-decreasing. The pool's hardest rooms always satisfy this, so the
    // eligible set is never empty while the pool is non-empty.
    const eligible = pool.filter((r) => r.difficulty >= lastDifficulty);
    // Among eligible rooms, take those nearest the target difficulty; rng only
    // breaks ties between rooms whose difficulty is equally close to the target.
    const best = Math.min(...eligible.map((r) => Math.abs(r.difficulty - target)));
    const cluster = eligible.filter((r) => Math.abs(r.difficulty - target) <= best + 1e-9);
    const choice = cluster[Math.floor(rng() * cluster.length)];
    placed.push({ template: choice, startZ: z });
    z += choice.length;
    lastDifficulty = choice.difficulty;
  }

  return { level, rooms: placed, totalLength: z };
}

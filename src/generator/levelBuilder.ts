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

/** Pick the room nearest the target difficulty; rng breaks ties among equally-near rooms. */
export function pickRoom(
  rooms: RoomTemplate[],
  targetDifficulty: number,
  rng: () => number,
): RoomTemplate {
  if (rooms.length === 0) throw new Error("pickRoom: empty room list");
  const sorted = [...rooms].sort(
    (a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty),
  );
  const best = Math.abs(sorted[0].difficulty - targetDifficulty);
  const cluster = sorted.filter((r) => Math.abs(r.difficulty - targetDifficulty) <= best + 1e-9);
  return cluster[Math.floor(rng() * cluster.length)];
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
    const choice = pickRoom(eligible, target, rng);
    placed.push({ template: choice, startZ: z });
    z += choice.length;
    lastDifficulty = choice.difficulty;
  }

  return { level, rooms: placed, totalLength: z };
}

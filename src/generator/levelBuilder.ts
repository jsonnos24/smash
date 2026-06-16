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
  while (z < level.length) {
    const progress = Math.min(1, z / level.length);
    const target = low + (high - low) * progress;
    // candidates sorted by closeness to target difficulty
    const sorted = [...pool].sort(
      (a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target),
    );
    // take the closest cluster (within 1.0 of the best) and pick one via rng
    const best = Math.abs(sorted[0].difficulty - target);
    const cluster = sorted.filter((r) => Math.abs(r.difficulty - target) <= best + 1.0);
    const choice = cluster[Math.floor(rng() * cluster.length)];
    placed.push({ template: choice, startZ: z });
    z += choice.length;
  }

  return { level, rooms: placed, totalLength: z };
}

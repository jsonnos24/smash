import type { Theme } from "./types";

export const START_BALLS = 20;
export const MAX_BALLS = 40;
export const CHECKPOINT_SPACING = 400;
export const LOOKAHEAD = 130;
export const DOOR_HITS = 2;
export const GATE_GAP = 12; // forward space a gate occupies before the next room

const THEMES: Theme[] = ["crystalCavern", "neonTunnel", "glassChapel"];

/** Steeper difficulty ramp: reaches max (10) around ~1600m. */
export function difficultyAt(distance: number): number {
  return Math.min(10, Math.max(1, 1 + distance / 180));
}

/**
 * Forward speed: a gradual baseline ramp with distance (1.0 → 1.7 over ~1500m)
 * plus brief eased surges on top. Smooth thanks to the variable-timestep loop.
 */
export function speedAt(distance: number): number {
  const base = Math.min(1.7, 1 + distance / 2200);
  const s = Math.max(0, Math.sin(distance * 0.04));
  return base + 0.4 * s * s * s;
}

/** Theme cycles per checkpoint so variety returns without discrete levels. */
export function themeAt(checkpointIndex: number): Theme {
  const n = THEMES.length;
  return THEMES[((checkpointIndex % n) + n) % n];
}

/** Lateral position of the track at path-distance s — a smooth meander (curves/turns). */
export function pathOffsetX(distance: number): number {
  return 1.7 * Math.sin(distance * 0.016) + 0.9 * Math.sin(distance * 0.039);
}

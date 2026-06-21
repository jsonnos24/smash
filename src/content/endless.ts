import type { Theme } from "./types";

export const START_BALLS = 20;
export const MAX_BALLS = 40;
export const CHECKPOINT_SPACING = 400;
export const LOOKAHEAD = 130;
export const DOOR_HITS = 2;
export const GATE_GAP = 12; // forward space a gate occupies before the next room

const THEMES: Theme[] = ["crystalCavern", "neonTunnel", "glassChapel"];

/** Difficulty ramp: rises steadily, reaching max (9) around ~2400m. */
export function difficultyAt(distance: number): number {
  return Math.min(9, Math.max(1, 1 + distance / 300));
}

/**
 * Forward speed: a gentle baseline ramp with distance (1.0 → 1.4 over ~1800m)
 * plus brief eased surges on top. Smooth thanks to the variable-timestep loop.
 */
export function speedAt(distance: number): number {
  const base = Math.min(1.4, 1 + distance / 4500);
  const s = Math.max(0, Math.sin(distance * 0.04));
  return base + 0.3 * s * s * s;
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

/** Vertical height of the track at path-distance s — rolling hills that grow steeper deeper in. */
export function pathOffsetY(distance: number): number {
  const d = Math.max(0, distance);
  const amp = 0.4 + Math.min(2.6, d / 700); // ramps 0.4 → 3.0 by ~1820m
  const shape = 0.7 * Math.sin(d * 0.02) + 0.3 * Math.sin(d * 0.047);
  return amp * shape;
}

import type { Theme } from "./types";

export const START_BALLS = 20;
export const MAX_BALLS = 40;
export const CHECKPOINT_SPACING = 400;
export const LOOKAHEAD = 130;
export const DOOR_HITS = 2;
export const GATE_GAP = 12; // forward space a gate occupies before the next room

const THEMES: Theme[] = ["crystalCavern", "neonTunnel", "glassChapel"];

/** Smooth difficulty ramp with distance, capped at 9 (reached ~2800m). */
export function difficultyAt(distance: number): number {
  return Math.min(9, Math.max(1, 1 + distance / 350));
}

/**
 * Forward speed: a steady baseline with brief, smoothly-eased surges for
 * tension. Smooth on any display thanks to the variable-timestep loop.
 */
export function speedAt(distance: number): number {
  const s = Math.max(0, Math.sin(distance * 0.04));
  return 1 + 0.45 * s * s * s; // mostly ~1.0, brief peaks to ~1.45
}

/** Theme cycles per checkpoint so variety returns without discrete levels. */
export function themeAt(checkpointIndex: number): Theme {
  const n = THEMES.length;
  return THEMES[((checkpointIndex % n) + n) % n];
}

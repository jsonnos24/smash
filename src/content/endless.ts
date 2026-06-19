import type { Theme } from "./types";

export const START_BALLS = 20;
export const MAX_BALLS = 40;
export const CHECKPOINT_SPACING = 400;
export const LOOKAHEAD = 130;

const THEMES: Theme[] = ["crystalCavern", "neonTunnel", "glassChapel"];

/** Smooth difficulty ramp with distance, capped at 9 (reached ~2800m). */
export function difficultyAt(distance: number): number {
  return Math.min(9, Math.max(1, 1 + distance / 350));
}

/** Gentle forward-speed multiplier ramp, capped. */
export function speedAt(distance: number): number {
  return Math.min(1.6, 1 + distance / 5000);
}

/** Theme cycles per checkpoint so variety returns without discrete levels. */
export function themeAt(checkpointIndex: number): Theme {
  const n = THEMES.length;
  return THEMES[((checkpointIndex % n) + n) % n];
}

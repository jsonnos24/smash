import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [
  { id: 1, band: [1.0, 2.0], length: 300, startBalls: 25, speed: 1.0, crystalGenerosity: "veryHigh" },
  { id: 2, band: [1.8, 3.0], length: 320, startBalls: 25, speed: 1.06, crystalGenerosity: "high" },
  { id: 3, band: [2.8, 4.2], length: 340, startBalls: 22, speed: 1.12, crystalGenerosity: "high" },
  { id: 4, band: [4.0, 5.5], length: 360, startBalls: 22, speed: 1.2, crystalGenerosity: "medium" },
  { id: 5, band: [5.2, 7.0], length: 380, startBalls: 20, speed: 1.28, crystalGenerosity: "medium" },
  { id: 6, band: [6.8, 8.5], length: 400, startBalls: 20, speed: 1.38, crystalGenerosity: "lean" },
];

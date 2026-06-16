export type Generosity = "lean" | "medium" | "high" | "veryHigh";
export type Theme = "crystalCavern" | "neonTunnel" | "glassChapel";

export interface LevelDef {
  id: number;
  band: [number, number];
  length: number;
  startBalls: number;
  speed: number;
  crystalGenerosity: Generosity;
}

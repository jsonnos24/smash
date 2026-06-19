import type { Theme } from "../types";

export interface Placement {
  x: number;
  y: number;
  z: number;
}

export type EntityKind = "obstacle" | "crystal" | "powerup";

export interface RoomEntity extends Placement {
  kind: EntityKind;
  size: number;
  motion?: "slide" | "spin";
}

export interface RoomTemplate {
  id: string;
  theme: Theme;
  difficulty: number;
  length: number;
  entities: RoomEntity[];
}

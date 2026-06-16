import type { RoomTemplate } from "./types";

const obstacle = (x: number, y: number, z: number, size = 1) =>
  ({ kind: "obstacle" as const, x, y, z, size });
const crystal = (x: number, y: number, z: number, size = 0.6) =>
  ({ kind: "crystal" as const, x, y, z, size });

export const ROOMS: RoomTemplate[] = [
  // ---- Crystal Cavern (easy → hard) ----
  { id: "cc-easy-1", theme: "crystalCavern", difficulty: 1, length: 60,
    entities: [obstacle(0, 1, 30), crystal(-1.5, 1, 20), crystal(1.5, 1, 45)] },
  { id: "cc-easy-2", theme: "crystalCavern", difficulty: 2, length: 60,
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 40), crystal(0, 1.5, 50)] },
  { id: "cc-mid-1", theme: "crystalCavern", difficulty: 4, length: 70,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 1.5, 45), crystal(0, 0.5, 60)] },
  { id: "cc-hard-1", theme: "crystalCavern", difficulty: 7, length: 80,
    entities: [obstacle(-1.5, 1, 15), obstacle(0, 1, 15), obstacle(1.5, 1, 15),
               obstacle(-1, 1.5, 40), obstacle(1, 1.5, 40), obstacle(0, 1, 60), crystal(0, 2, 70)] },

  // ---- Neon Tunnel (mid → hard) ----
  { id: "nt-mid-1", theme: "neonTunnel", difficulty: 3, length: 65,
    entities: [obstacle(0, 1, 30), obstacle(-1.5, 1.5, 50), crystal(1.5, 1, 20), crystal(0, 0.5, 60)] },
  { id: "nt-mid-2", theme: "neonTunnel", difficulty: 5, length: 70,
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 25), obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), crystal(-1.5, 2, 60)] },
  { id: "nt-hard-1", theme: "neonTunnel", difficulty: 8, length: 85,
    entities: [obstacle(-1.5, 1, 15), obstacle(-0.5, 1, 15), obstacle(0.5, 1, 15), obstacle(1.5, 1, 15),
               obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), obstacle(-1, 1, 65), obstacle(1, 1, 65)] },

  // ---- Glass Chapel (easy → very hard) ----
  { id: "gc-easy-1", theme: "glassChapel", difficulty: 2, length: 60,
    entities: [obstacle(0, 1.5, 35), crystal(-1.5, 1, 15), crystal(1.5, 1, 50)] },
  { id: "gc-mid-1", theme: "glassChapel", difficulty: 6, length: 75,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 2, 40), obstacle(0, 1, 55), crystal(-1.5, 0.5, 65)] },
  { id: "gc-hard-1", theme: "glassChapel", difficulty: 9, length: 90,
    entities: [obstacle(-1.5, 1, 12), obstacle(0, 1, 12), obstacle(1.5, 1, 12),
               obstacle(-1, 1.5, 35), obstacle(1, 1.5, 35), obstacle(0, 0.5, 35),
               obstacle(-1.5, 1, 60), obstacle(0, 1, 60), obstacle(1.5, 1, 60), crystal(0, 2.5, 80)] },
];

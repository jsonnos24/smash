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
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 40), crystal(0, 1.5, 50), crystal(0, 0.5, 10)] },
  { id: "cc-mid-1", theme: "crystalCavern", difficulty: 4, length: 70,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 1.5, 45), crystal(0, 0.5, 60), crystal(-1.5, 1.5, 35)] },
  { id: "cc-hard-1", theme: "crystalCavern", difficulty: 7, length: 80,
    entities: [obstacle(-1.5, 1, 15), obstacle(0, 1, 15), obstacle(1.5, 1, 15),
               obstacle(-1, 1.5, 40), obstacle(1, 1.5, 40), obstacle(0, 1, 60), crystal(0, 2, 70),
               crystal(-1.5, 0.5, 30), crystal(1.5, 0.5, 50)] },

  // ---- Neon Tunnel (mid → hard) ----
  { id: "nt-mid-1", theme: "neonTunnel", difficulty: 3, length: 65,
    entities: [obstacle(0, 1, 30), obstacle(-1.5, 1.5, 50), crystal(1.5, 1, 20), crystal(0, 0.5, 60)] },
  { id: "nt-mid-2", theme: "neonTunnel", difficulty: 5, length: 70,
    entities: [obstacle(-1, 1, 25), obstacle(1, 1, 25), obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), crystal(-1.5, 2, 60), crystal(1.5, 0.5, 10)] },
  { id: "nt-hard-1", theme: "neonTunnel", difficulty: 8, length: 85,
    entities: [obstacle(-1.5, 1, 15), obstacle(-0.5, 1, 15), obstacle(0.5, 1, 15), obstacle(1.5, 1, 15),
               obstacle(0, 1.5, 45), obstacle(0, 0.5, 45), obstacle(-1, 1, 65), obstacle(1, 1, 65),
               crystal(0, 2.2, 78), crystal(-1.5, 0.5, 30), crystal(1.5, 0.5, 55), crystal(0, 1.5, 5)] },

  // ---- Glass Chapel (easy → very hard) ----
  { id: "gc-easy-1", theme: "glassChapel", difficulty: 2, length: 60,
    entities: [obstacle(0, 1.5, 35), crystal(-1.5, 1, 15), crystal(1.5, 1, 50)] },
  { id: "gc-mid-1", theme: "glassChapel", difficulty: 6, length: 75,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20), obstacle(0, 2, 40), obstacle(0, 1, 55), crystal(-1.5, 0.5, 65), crystal(1.5, 1.5, 10)] },
  { id: "gc-hard-1", theme: "glassChapel", difficulty: 9, length: 90,
    entities: [obstacle(-1.5, 1, 12), obstacle(0, 1, 12), obstacle(1.5, 1, 12),
               obstacle(-1, 1.5, 35), obstacle(1, 1.5, 35), obstacle(0, 0.5, 35),
               obstacle(-1.5, 1, 60), obstacle(0, 1, 60), obstacle(1.5, 1, 60), crystal(0, 2.5, 80),
               crystal(-1.5, 0.5, 5), crystal(1.5, 0.5, 5), crystal(-1.5, 2, 48), crystal(1.5, 2, 48)] },

  // ---- Symmetric layouts (mirrored across the center line) ----
  // Every off-center piece has a matched pair; centered pieces sit on x=0.
  { id: "cc-sym-1", theme: "crystalCavern", difficulty: 2, length: 60,
    entities: [obstacle(0, 1, 30),
               crystal(-1.5, 1, 20), crystal(1.5, 1, 20),
               crystal(0, 2, 48)] },
  { id: "nt-sym-1", theme: "neonTunnel", difficulty: 4, length: 70,
    entities: [obstacle(-1.2, 1, 24), obstacle(1.2, 1, 24),
               obstacle(0, 1.6, 46),
               crystal(-1.8, 0.6, 60), crystal(1.8, 0.6, 60)] },
  { id: "gc-sym-1", theme: "glassChapel", difficulty: 5, length: 72,
    entities: [obstacle(-1, 1, 20), obstacle(1, 1, 20),
               obstacle(-1, 2.2, 44), obstacle(1, 2.2, 44),
               crystal(0, 1, 62), crystal(0, 0.5, 10)] },
  { id: "cc-sym-2", theme: "crystalCavern", difficulty: 7, length: 82,
    entities: [obstacle(-1.6, 1, 18), obstacle(0, 1, 18), obstacle(1.6, 1, 18),
               obstacle(-1.6, 2, 46), obstacle(0, 2, 46), obstacle(1.6, 2, 46),
               crystal(0, 0.6, 70), crystal(-1.5, 0.5, 30), crystal(1.5, 0.5, 60)] },
];

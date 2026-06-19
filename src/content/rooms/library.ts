import type { RoomTemplate } from "./types";

const obstacle = (x: number, y: number, z: number, size = 1) =>
  ({ kind: "obstacle" as const, x, y, z, size });
const crystal = (x: number, y: number, z: number, size = 0.6) =>
  ({ kind: "crystal" as const, x, y, z, size });

export const ROOMS: RoomTemplate[] = [
  // ---- Crystal Cavern (easy → hard) ----
  { id: "cc-easy-1", theme: "crystalCavern", difficulty: 1, length: 60,
    entities: [obstacle(0, 3.8, 30), crystal(-2.4, 0.5, 20), crystal(2.2, 3.2, 45)] },
  { id: "cc-easy-2", theme: "crystalCavern", difficulty: 2, length: 60,
    entities: [obstacle(-2.2, 0.7, 25), obstacle(2.0, 3.5, 40), crystal(0, 1.8, 50), crystal(0, 0.4, 10)] },
  { id: "cc-mid-1", theme: "crystalCavern", difficulty: 4, length: 70,
    entities: [obstacle(-2.4, 0.6, 20), obstacle(2.3, 3.6, 20), obstacle(0, 1.8, 45), crystal(0, 0.4, 60), crystal(-2.0, 4.0, 35)] },
  { id: "cc-hard-1", theme: "crystalCavern", difficulty: 7, length: 80,
    entities: [obstacle(-2.4, 0.5, 15), obstacle(0, 3.8, 15), obstacle(2.4, 0.5, 15),
               obstacle(-1.8, 4.0, 40), obstacle(1.8, 1.6, 40), obstacle(0, 0.7, 60), crystal(0, 3.8, 70),
               crystal(-2.5, 0.4, 30), crystal(2.5, 4.0, 50)] },

  // ---- Neon Tunnel (mid → hard) ----
  { id: "nt-mid-1", theme: "neonTunnel", difficulty: 3, length: 65,
    entities: [obstacle(0, 4.0, 30), obstacle(-2.4, 0.6, 50), crystal(2.4, 0.5, 20), crystal(0, 3.8, 60)] },
  { id: "nt-mid-2", theme: "neonTunnel", difficulty: 5, length: 70,
    entities: [obstacle(-2.2, 0.5, 25), obstacle(2.2, 3.6, 25), obstacle(0, 1.8, 45), obstacle(0, 0.5, 45), crystal(-2.4, 3.8, 60), crystal(2.4, 0.4, 10)] },
  { id: "nt-hard-1", theme: "neonTunnel", difficulty: 8, length: 85,
    entities: [obstacle(-2.4, 0.5, 15), obstacle(-0.8, 3.8, 15), obstacle(0.8, 0.6, 15), obstacle(2.4, 3.8, 15),
               obstacle(0, 4.0, 45), obstacle(0, 0.5, 45), obstacle(-2.2, 1.7, 65), obstacle(2.2, 1.7, 65),
               crystal(0, 3.9, 78), crystal(-2.5, 0.4, 30), crystal(2.5, 3.8, 55), crystal(0, 1.6, 5)] },

  // ---- Glass Chapel (easy → very hard) ----
  { id: "gc-easy-1", theme: "glassChapel", difficulty: 2, length: 60,
    entities: [obstacle(0, 4.0, 35), crystal(-2.4, 0.5, 15), crystal(2.3, 3.8, 50)] },
  { id: "gc-mid-1", theme: "glassChapel", difficulty: 6, length: 75,
    entities: [obstacle(-2.3, 0.6, 20), obstacle(2.3, 3.8, 20), obstacle(0, 3.8, 40), obstacle(0, 0.5, 55), crystal(-2.5, 0.4, 65), crystal(2.4, 4.0, 10)] },
  { id: "gc-hard-1", theme: "glassChapel", difficulty: 9, length: 90,
    entities: [obstacle(-2.4, 0.5, 12), obstacle(0, 3.8, 12), obstacle(2.4, 0.5, 12),
               obstacle(-2.0, 4.0, 35), obstacle(2.0, 0.5, 35), obstacle(0, 1.8, 35),
               obstacle(-2.4, 0.6, 60), obstacle(0, 3.8, 60), obstacle(2.4, 0.6, 60), crystal(0, 3.8, 80),
               crystal(-2.5, 0.4, 5), crystal(2.5, 0.4, 5), crystal(-2.0, 4.0, 48), crystal(2.0, 4.0, 48)] },

  // ---- Symmetric layouts (mirrored across the center line) ----
  // Every off-center piece has a matched pair; centered pieces sit on x=0.
  { id: "cc-sym-1", theme: "crystalCavern", difficulty: 2, length: 60,
    entities: [obstacle(0, 3.8, 30),
               crystal(-2.2, 0.5, 20), crystal(2.2, 0.5, 20),
               crystal(0, 4.0, 48)] },
  { id: "nt-sym-1", theme: "neonTunnel", difficulty: 4, length: 70,
    entities: [obstacle(-2.0, 0.6, 24), obstacle(2.0, 0.6, 24),
               obstacle(0, 3.8, 46),
               crystal(-2.4, 3.8, 60), crystal(2.4, 3.8, 60)] },
  { id: "gc-sym-1", theme: "glassChapel", difficulty: 5, length: 72,
    entities: [obstacle(-2.0, 0.5, 20), obstacle(2.0, 0.5, 20),
               obstacle(-2.0, 4.0, 44), obstacle(2.0, 4.0, 44),
               crystal(0, 1.8, 62), crystal(0, 0.5, 10)] },
  { id: "cc-sym-2", theme: "crystalCavern", difficulty: 7, length: 82,
    entities: [obstacle(-2.4, 0.5, 18), obstacle(0, 3.8, 18), obstacle(2.4, 0.5, 18),
               obstacle(-2.4, 4.0, 46), obstacle(0, 1.7, 46), obstacle(2.4, 4.0, 46),
               crystal(0, 0.5, 70), crystal(-2.2, 3.8, 30), crystal(2.2, 3.8, 30)] },
];

import { describe, it, expect } from "vitest";
import { ROOMS } from "./library";

describe("ROOMS library", () => {
  it("has at least 10 templates with unique ids", () => {
    expect(ROOMS.length).toBeGreaterThanOrEqual(10);
    const ids = ROOMS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each room has difficulty 1..10, positive length, and entities", () => {
    for (const r of ROOMS) {
      expect(r.difficulty).toBeGreaterThanOrEqual(1);
      expect(r.difficulty).toBeLessThanOrEqual(10);
      expect(r.length).toBeGreaterThan(0);
      expect(r.entities.length).toBeGreaterThan(0);
    }
  });

  it("covers the full difficulty range and all 3 themes", () => {
    const diffs = ROOMS.map((r) => r.difficulty);
    expect(Math.min(...diffs)).toBeLessThanOrEqual(2);
    expect(Math.max(...diffs)).toBeGreaterThanOrEqual(8);
    const themes = new Set(ROOMS.map((r) => r.theme));
    expect(themes.has("crystalCavern")).toBe(true);
    expect(themes.has("neonTunnel")).toBe(true);
    expect(themes.has("glassChapel")).toBe(true);
  });

  it("entity z-offsets stay within the room length", () => {
    for (const r of ROOMS) {
      for (const e of r.entities) {
        expect(e.z).toBeGreaterThanOrEqual(0);
        expect(e.z).toBeLessThanOrEqual(r.length);
      }
    }
  });
});

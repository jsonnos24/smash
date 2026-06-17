import { describe, it, expect } from "vitest";
import { THEME_COLORS } from "./themes";

describe("THEME_COLORS", () => {
  it("defines colors for all three themes", () => {
    expect(THEME_COLORS.crystalCavern).toBeDefined();
    expect(THEME_COLORS.neonTunnel).toBeDefined();
    expect(THEME_COLORS.glassChapel).toBeDefined();
  });
  it("crystal cavern uses the spec mint accent 0x7ffcd9", () => {
    expect(THEME_COLORS.crystalCavern.crystal).toBe(0x7ffcd9);
  });
});

import { describe, it, expect } from "vitest";
import { upgradeOptionsAt, weaponTargets, TIER1, TIER2 } from "./upgrades";

describe("upgradeOptionsAt", () => {
  it("offers tier 1 at 10 and tier 2 at 20, nothing otherwise", () => {
    expect(upgradeOptionsAt(10)).toEqual(TIER1);
    expect(upgradeOptionsAt(20)).toEqual(TIER2);
    expect(upgradeOptionsAt(9)).toBeNull();
    expect(upgradeOptionsAt(11)).toBeNull();
    expect(upgradeOptionsAt(0)).toBeNull();
  });
});

describe("weaponTargets", () => {
  const obs = [
    { id: 1, worldZ: -4, x: 0 },
    { id: 2, worldZ: -15, x: 0.5 },
    { id: 3, worldZ: -40, x: 2.2 },
    { id: 4, worldZ: -120, x: 0 },
  ];
  const rng = () => 0;
  it("sword hits only very close obstacles", () => {
    expect(weaponTargets("sword", obs, rng)).toEqual([1]);
  });
  it("forceBlast clears a central lane far ahead (excludes off-lane)", () => {
    expect(weaponTargets("forceBlast", obs, rng)).toEqual([1, 2]); // id3 off-lane (x 2.2), id4 too far (-120 < -70)
  });
  it("shock picks up to 3 from in-range", () => {
    expect(weaponTargets("shock", obs, rng).length).toBeLessThanOrEqual(3);
  });
});

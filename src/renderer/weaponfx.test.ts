import { describe, it, expect } from "vitest";
import { Scene, PerspectiveCamera, Vector3 } from "three";
import { WeaponFx } from "./weaponfx";

describe("WeaponFx", () => {
  it("spawns a transient effect on fire and cleans it up after its lifetime", () => {
    const cam = new PerspectiveCamera();
    const fx = new WeaponFx(new Scene(), cam);
    cam.updateMatrixWorld();
    fx.fire("shock", [new Vector3(1, 1, -5)]);
    expect(fx.activeCount).toBeGreaterThan(0);
    fx.update(0.05);
    expect(fx.activeCount).toBeGreaterThan(0);
    fx.update(1.0); // past the ~0.22s life
    expect(fx.activeCount).toBe(0);
  });
  it("ringFire is persistent (no transient effect on fire) and setOwned doesn't throw", () => {
    const fx = new WeaponFx(new Scene(), new PerspectiveCamera());
    fx.setOwned(["ringFire"]);
    fx.fire("ringFire", []);
    expect(fx.activeCount).toBe(0);
    fx.update(0.1);
  });
});

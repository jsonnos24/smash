import { describe, it, expect } from "vitest";
import { Hud } from "./hud";
import { createRunState } from "../game/state";

describe("Hud", () => {
  it("renders balls, score, streak, mode, distance and checkpoint", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const state = { ...createRunState("casual", 18), score: 12480, streak: 3, distance: 340 };
    hud.update(state, 20, 400);
    expect(root.querySelector("[data-hud=balls]")?.textContent).toContain("18");
    expect(root.querySelector("[data-hud=score]")?.textContent).toContain("12,480");
    expect(root.querySelector("[data-hud=streak]")?.textContent).toContain("3");
    expect(root.querySelector("[data-hud=mode]")?.textContent?.toUpperCase()).toContain("CASUAL");
    expect(root.querySelector("[data-hud=distance]")?.textContent).toContain("340");
    expect(root.querySelector("[data-hud=distance]")?.textContent).toContain("400");
  });
  it("scales the reserve bar against start balls", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    hud.update({ ...createRunState("normal", 20), balls: 5 }, 20, 0);
    expect((root.querySelector("[data-hud=reserve]") as HTMLElement).style.width).toBe("25%");
  });
  it("shows MULTIBALL timer when powerupT > 0", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    hud.update({ ...createRunState("normal", 20), powerupT: 3 }, 20, 0);
    expect(root.querySelector("[data-hud=powerup]")?.textContent).toContain("MULTIBALL");
  });
  it("hides MULTIBALL indicator when powerupT is 0", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    hud.update({ ...createRunState("normal", 20), powerupT: 0 }, 20, 0);
    expect(root.querySelector("[data-hud=powerup]")?.textContent).toBe("");
  });
  it("pulses the streak element when the streak increases", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    hud.update({ ...createRunState("normal", 20), streak: 1 }, 20, 0);
    hud.update({ ...createRunState("normal", 20), streak: 2 }, 20, 0);
    const el = root.querySelector("[data-hud=streak]") as HTMLElement;
    expect(el.style.transform).toContain("scale(1.6)");
  });
});

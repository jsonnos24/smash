import { describe, it, expect } from "vitest";
import { Hud } from "./hud";
import { createRunState } from "../game/state";
import { LEVELS } from "../content/levels";

describe("Hud", () => {
  it("renders ball count, score, streak, mode badge, and distance", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const state = { ...createRunState("casual", 18), score: 12480, streak: 3, distance: 340, roomIndex: 3 };
    hud.update(state, LEVELS[0], 8);

    expect(root.querySelector("[data-hud=balls]")?.textContent).toContain("18");
    expect(root.querySelector("[data-hud=score]")?.textContent).toContain("12,480");
    expect(root.querySelector("[data-hud=streak]")?.textContent).toContain("3");
    expect(root.querySelector("[data-hud=mode]")?.textContent?.toUpperCase()).toContain("CASUAL");
    expect(root.querySelector("[data-hud=distance]")?.textContent).toContain("340");
  });

  it("scales the reserve bar relative to the level's start balls", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const state = { ...createRunState("normal", 25), balls: 5 };
    hud.update(state, LEVELS[0], 8); // startBalls 25 → 20%
    const bar = root.querySelector("[data-hud=reserve]") as HTMLElement;
    expect(bar.style.width).toBe("20%");
  });
});

import { describe, it, expect } from "vitest";
import { Juice } from "./juice";

describe("Juice", () => {
  it("creates a popup element and removes it after its lifetime", () => {
    const root = document.createElement("div");
    const j = new Juice(root);
    j.popup("+100", 50, 50);
    expect(root.querySelectorAll(".juice-popup").length).toBe(1);
    j.update(1.0); // > 0.85s life
    expect(root.querySelectorAll(".juice-popup").length).toBe(0);
  });
  it("flash raises the flash overlay opacity then decays it to 0", () => {
    const root = document.createElement("div");
    const j = new Juice(root);
    j.flash();
    j.update(0.01);
    const flash = root.querySelector(".juice-flash") as HTMLElement;
    expect(Number(flash.style.opacity)).toBeGreaterThan(0);
    j.update(1);
    expect(Number(flash.style.opacity)).toBe(0);
  });
});

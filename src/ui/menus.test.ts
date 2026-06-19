import { describe, it, expect, vi, beforeEach } from "vitest";
import { Menus } from "./menus";
import { defaultSave } from "../persistence/save";

beforeEach(() => localStorage.clear());
const cbs = () => ({ onStart: vi.fn(), onResume: vi.fn(), onRetry: vi.fn(), onMenu: vi.fn() });

describe("Menus", () => {
  it("toggles mode and persists it", () => {
    const m = new Menus(document.createElement("div"), defaultSave(), cbs());
    expect(m.mode).toBe("normal");
    expect(m.toggleMode()).toBe("casual");
    expect(JSON.parse(localStorage.getItem("smashhit.save")!).mode).toBe("casual");
  });
  it("Play starts a run in the current mode", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const m = new Menus(root, defaultSave(), cb);
    m.showMain();
    (root.querySelector("[data-action=play]") as HTMLButtonElement).click();
    expect(cb.onStart).toHaveBeenCalledWith("normal");
  });
  it("shows best distance on the main menu", () => {
    const root = document.createElement("div");
    const m = new Menus(root, { ...defaultSave(), bestDistance: 1234 }, cbs());
    m.showMain();
    expect(root.textContent).toContain("1,234");
  });
  it("results screen shows distance and best and Play Again retries", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const m = new Menus(root, defaultSave(), cb);
    m.showResults({ distance: 1500, best: 2000 });
    expect(root.textContent).toContain("1,500");
    expect(root.textContent).toContain("2,000");
    (root.querySelector("[data-action=retry]") as HTMLButtonElement).click();
    expect(cb.onRetry).toHaveBeenCalled();
  });
});

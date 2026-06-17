import { describe, it, expect, vi, beforeEach } from "vitest";
import { Menus } from "./menus";
import { defaultSave } from "../persistence/save";

beforeEach(() => localStorage.clear());

const cbs = () => ({ onStart: vi.fn(), onResume: vi.fn(), onRetry: vi.fn(), onMenu: vi.fn() });

describe("Menus", () => {
  it("toggles mode between normal and casual and persists it", () => {
    const root = document.createElement("div");
    const m = new Menus(root, defaultSave(), cbs());
    expect(m.mode).toBe("normal");
    expect(m.toggleMode()).toBe("casual");
    expect(JSON.parse(localStorage.getItem("smashhit.save")!).mode).toBe("casual");
  });

  it("showMain lists only unlocked levels and starts the chosen one", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const save = { ...defaultSave(), unlockedLevel: 2 };
    const m = new Menus(root, save, cb);
    m.showMain();
    const buttons = root.querySelectorAll("[data-level]");
    expect(buttons.length).toBe(2); // levels 1 and 2 unlocked
    (buttons[0] as HTMLButtonElement).click();
    expect(cb.onStart).toHaveBeenCalledWith(1, "normal");
  });

  it("results screen shows the score and a retry button", () => {
    const root = document.createElement("div");
    const cb = cbs();
    const m = new Menus(root, defaultSave(), cb);
    m.showResults({ score: 4200, best: 5000, completed: true });
    expect(root.textContent).toContain("4,200");
    (root.querySelector("[data-action=retry]") as HTMLButtonElement).click();
    expect(cb.onRetry).toHaveBeenCalled();
  });
});

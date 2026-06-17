import { describe, it, expect, beforeEach } from "vitest";
import { defaultSave, loadSave, saveSave, recordScore } from "./save";

beforeEach(() => localStorage.clear());

describe("loadSave", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults when stored JSON is corrupt", () => {
    localStorage.setItem("smashhit.save", "{not json");
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults when the shape is wrong", () => {
    localStorage.setItem("smashhit.save", JSON.stringify({ version: 99 }));
    expect(loadSave()).toEqual(defaultSave());
  });
  it("round-trips a valid save", () => {
    const data = { ...defaultSave(), mode: "casual" as const, muted: true };
    saveSave(data);
    expect(loadSave()).toEqual(data);
  });
});

describe("recordScore", () => {
  it("keeps the maximum score per level and unlocks the next level", () => {
    let d = defaultSave();
    d = recordScore(d, 1, 500);
    d = recordScore(d, 1, 300); // lower, ignored
    expect(d.bestScores[1]).toBe(500);
    expect(d.unlockedLevel).toBe(2);
  });
  it("never lowers the unlocked level", () => {
    let d = { ...defaultSave(), unlockedLevel: 4 };
    d = recordScore(d, 1, 100);
    expect(d.unlockedLevel).toBe(4);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { defaultSave, loadSave, saveSave, recordRun } from "./save";

beforeEach(() => localStorage.clear());

describe("loadSave", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults when stored JSON is corrupt", () => {
    localStorage.setItem("smashhit.save", "{not json");
    expect(loadSave()).toEqual(defaultSave());
  });
  it("returns defaults for an old/wrong shape", () => {
    localStorage.setItem("smashhit.save", JSON.stringify({ version: 1, bestScores: {} }));
    expect(loadSave()).toEqual(defaultSave());
  });
  it("round-trips a valid save", () => {
    const d = { ...defaultSave(), mode: "casual" as const, muted: true, bestDistance: 1234, bestScore: 5678 };
    saveSave(d);
    expect(loadSave()).toEqual(d);
  });
});

describe("recordRun", () => {
  it("keeps the maximum distance and score", () => {
    let d = defaultSave();
    d = recordRun(d, 500, 1000);
    d = recordRun(d, 300, 2000);
    expect(d.bestDistance).toBe(500);
    expect(d.bestScore).toBe(2000);
  });
});

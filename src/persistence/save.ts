import type { Mode } from "../game/state";

const KEY = "smashhit.save";

export interface SaveData {
  version: 2;
  mode: Mode;
  muted: boolean;
  quality: "auto" | "low" | "high";
  bestDistance: number;
  bestScore: number;
}

export function defaultSave(): SaveData {
  return { version: 2, mode: "normal", muted: false, quality: "auto", bestDistance: 0, bestScore: 0 };
}

function isValid(d: unknown): d is SaveData {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return (
    o.version === 2 &&
    (o.mode === "normal" || o.mode === "casual") &&
    typeof o.muted === "boolean" &&
    (o.quality === "auto" || o.quality === "low" || o.quality === "high") &&
    typeof o.bestDistance === "number" &&
    typeof o.bestScore === "number"
  );
}

export function loadSave(storage: Storage = localStorage): SaveData {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function saveSave(data: SaveData, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(data));
}

export function recordRun(data: SaveData, distance: number, score: number): SaveData {
  return {
    ...data,
    bestDistance: Math.max(data.bestDistance, Math.round(distance)),
    bestScore: Math.max(data.bestScore, score),
  };
}

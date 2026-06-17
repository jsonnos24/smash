import type { Mode } from "../game/state";

const KEY = "smashhit.save";

export interface SaveData {
  version: 1;
  mode: Mode;
  muted: boolean;
  quality: "auto" | "low" | "high";
  bestScores: Record<number, number>;
  unlockedLevel: number;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    mode: "normal",
    muted: false,
    quality: "auto",
    bestScores: {},
    unlockedLevel: 1,
  };
}

function isValid(d: unknown): d is SaveData {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return (
    o.version === 1 &&
    (o.mode === "normal" || o.mode === "casual") &&
    typeof o.muted === "boolean" &&
    (o.quality === "auto" || o.quality === "low" || o.quality === "high") &&
    typeof o.bestScores === "object" &&
    o.bestScores !== null &&
    typeof o.unlockedLevel === "number"
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

export function recordScore(data: SaveData, levelId: number, score: number): SaveData {
  const prev = data.bestScores[levelId] ?? 0;
  return {
    ...data,
    bestScores: { ...data.bestScores, [levelId]: Math.max(prev, score) },
    unlockedLevel: Math.max(data.unlockedLevel, levelId + 1),
  };
}

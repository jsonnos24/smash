import { describe, it, expect, vi } from "vitest";
import { AudioManager } from "./audio";

describe("AudioManager", () => {
  it("does not play sfx before being unlocked by a user gesture", () => {
    const play = vi.fn();
    const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.playSfx("throw");
    expect(play).not.toHaveBeenCalled();
  });

  it("plays sfx after unlock", () => {
    const play = vi.fn();
    const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.unlock();
    am.playSfx("throw");
    expect(play).toHaveBeenCalledWith("throw");
  });

  it("plays the loop whoosh after unlock", () => {
    const play = vi.fn();
    const am = new AudioManager({ backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.unlock();
    am.playSfx("loop");
    expect(play).toHaveBeenCalledWith("loop");
  });

  it("suppresses audio when muted and reports muted state", () => {
    const play = vi.fn();
    const am = new AudioManager({ muted: true, backend: { play, music: vi.fn(), setVolume: vi.fn() } });
    am.unlock();
    am.playSfx("throw");
    expect(play).not.toHaveBeenCalled();
    expect(am.muted).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import { GameLoop } from "./loop";

describe("GameLoop fixed timestep", () => {
  it("runs one update per fixed step elapsed", () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop({ update, render }, 1 / 60);
    loop.tick(0);
    loop.tick(1000 / 60); // exactly one step
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(1 / 60);
  });

  it("clamps to at most 5 sub-steps on a long frame", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} }, 1 / 60);
    loop.tick(0);
    loop.tick(10000); // 10s — would be 600 steps unclamped
    expect(update.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("does not update while paused", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} }, 1 / 60);
    loop.pause();
    loop.tick(0);
    loop.tick(1000);
    expect(update).not.toHaveBeenCalled();
  });
});

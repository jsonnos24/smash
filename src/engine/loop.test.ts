import { describe, it, expect, vi } from "vitest";
import { GameLoop } from "./loop";

describe("GameLoop variable timestep", () => {
  it("first tick only establishes the baseline (no update)", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} });
    loop.tick(0);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates with the elapsed frame delta in seconds", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} });
    loop.tick(0);
    loop.tick(1000 / 60);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBeCloseTo(1 / 60, 4);
  });

  it("clamps a very long frame to MAX_DT", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} });
    loop.tick(0);
    loop.tick(10000);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBeLessThanOrEqual(1 / 30 + 1e-9);
  });

  it("does not update while paused", () => {
    const update = vi.fn();
    const loop = new GameLoop({ update, render: () => {} });
    loop.pause();
    loop.tick(0);
    loop.tick(1000);
    expect(update).not.toHaveBeenCalled();
  });
});

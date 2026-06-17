import { describe, it, expect, vi } from "vitest";
import { toScreenPoint, InputController } from "./input";

const rect = { left: 0, top: 0, width: 200, height: 100 };

describe("toScreenPoint", () => {
  it("maps the center to (0,0)", () => {
    expect(toScreenPoint(100, 50, rect)).toEqual({ nx: 0, ny: 0 });
  });
  it("maps top-left to (-1, 1) and bottom-right to (1, -1)", () => {
    expect(toScreenPoint(0, 0, rect)).toEqual({ nx: -1, ny: 1 });
    expect(toScreenPoint(200, 100, rect)).toEqual({ nx: 1, ny: -1 });
  });
});

describe("InputController", () => {
  it("emits a normalized screen point on pointerdown", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
    const ctrl = new InputController(el);
    const cb = vi.fn();
    ctrl.onThrow(cb);

    const ev = new Event("pointerdown") as any;
    ev.clientX = 100;
    ev.clientY = 50;
    el.dispatchEvent(ev);

    expect(cb).toHaveBeenCalledWith({ nx: 0, ny: 0 });
    ctrl.dispose();
  });
});

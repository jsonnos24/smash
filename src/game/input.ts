import type { ScreenPoint } from "./throw";

export function toScreenPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): ScreenPoint {
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  return { nx: nx || 0, ny: ny || 0 };
}

export class InputController {
  private cb: ((p: ScreenPoint) => void) | null = null;
  private handler: (e: PointerEvent) => void;

  constructor(private target: HTMLElement) {
    this.handler = (e: PointerEvent) => {
      const rect = this.target.getBoundingClientRect();
      this.cb?.(toScreenPoint(e.clientX, e.clientY, rect));
    };
    this.target.addEventListener("pointerdown", this.handler);
  }

  onThrow(cb: (p: ScreenPoint) => void): void {
    this.cb = cb;
  }

  dispose(): void {
    this.target.removeEventListener("pointerdown", this.handler);
    this.cb = null;
  }
}

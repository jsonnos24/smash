export interface LoopCallbacks {
  update: (dt: number) => void;
  render: () => void;
}

// Clamp very long frames (tab stalls, GC) so a single step can't jump the
// world so far that collisions tunnel. ~33ms = 30fps floor for the sim step.
const MAX_DT = 1 / 30;

export class GameLoop {
  private lastMs: number | null = null;
  private paused = false;
  private rafId: number | null = null;

  constructor(private cb: LoopCallbacks) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  tick(nowMs: number): void {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return;
    }
    let dt = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    if (this.paused) return;
    if (dt > MAX_DT) dt = MAX_DT;
    if (dt > 0) this.cb.update(dt);
    this.cb.render();
  }

  start(): void {
    if (this.rafId !== null) return;
    const frame = (t: number) => {
      this.tick(t);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastMs = null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastMs = null;
  }
}

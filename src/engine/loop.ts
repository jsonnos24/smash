export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

const MAX_SUBSTEPS = 5;

export class GameLoop {
  private accumulator = 0;
  private lastMs: number | null = null;
  private paused = false;
  private rafId: number | null = null;

  constructor(private cb: LoopCallbacks, private step = 1 / 60) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  tick(nowMs: number): void {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return;
    }
    const frame = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    if (this.paused) return;

    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= this.step && steps < MAX_SUBSTEPS) {
      this.cb.update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0; // shed backlog
    this.cb.render(this.accumulator / this.step);
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
    this.lastMs = null; // avoid a giant catch-up frame
  }
}

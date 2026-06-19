/** Lightweight DOM "juice" overlay: floating score popups, a screen flash, and speed-line vignette. */
export class Juice {
  private layer: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private speedEl: HTMLDivElement;
  private flashT = 0;
  private popups: { el: HTMLDivElement; age: number; life: number }[] = [];

  constructor(root: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "juice-layer";
    this.speedEl = document.createElement("div");
    this.speedEl.className = "juice-speed";
    this.flashEl = document.createElement("div");
    this.flashEl.className = "juice-flash";
    this.layer.appendChild(this.speedEl);
    this.layer.appendChild(this.flashEl);
    root.appendChild(this.layer);
  }

  popup(text: string, x: number, y: number): void {
    const el = document.createElement("div");
    el.className = "juice-popup";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.layer.appendChild(el);
    this.popups.push({ el, age: 0, life: 0.85 });
  }

  flash(): void {
    this.flashT = 0.4;
  }

  speed(intensity: number): void {
    this.speedEl.style.opacity = String(Math.max(0, Math.min(1, intensity)));
  }

  update(dt: number): void {
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 1.8);
      this.flashEl.style.opacity = String(this.flashT);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        p.el.remove();
        this.popups.splice(i, 1);
        continue;
      }
      p.el.style.transform = `translate(-50%, ${-k * 46}px)`;
      p.el.style.opacity = String(1 - k);
    }
  }
}

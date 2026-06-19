import type { Mode } from "../game/state";
import { type SaveData, saveSave } from "../persistence/save";
import { themeAt, difficultyAt, CHECKPOINT_SPACING } from "../content/endless";

export interface MenuCallbacks {
  onStart: (mode: Mode, startDistance?: number) => void;
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export class Menus {
  private overlay: HTMLDivElement;
  private _mode: Mode;

  constructor(private root: HTMLElement, private save: SaveData, private cb: MenuCallbacks) {
    this._mode = save.mode;
    this.overlay = document.createElement("div");
    this.overlay.className = "menu-overlay";
    this.overlay.style.cssText =
      "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(15,30,34,.82);color:#dffff5;font-family:system-ui,sans-serif;text-align:center;";
    this.root.appendChild(this.overlay);
  }

  get mode(): Mode {
    return this._mode;
  }

  toggleMode(): Mode {
    this._mode = this._mode === "normal" ? "casual" : "normal";
    this.save = { ...this.save, mode: this._mode };
    saveSave(this.save);
    return this._mode;
  }

  setSave(s: SaveData): void {
    this.save = s;
  }

  private button(label: string, onClick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "pointer-events:auto;font-size:16px;padding:10px 22px;border-radius:10px;border:1px solid #7ffcd9;background:rgba(127,252,217,.14);color:#dffff5;cursor:pointer;";
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    b.addEventListener("click", onClick);
    return b;
  }

  showMain(): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const title = document.createElement("h1");
    title.textContent = "SMASH";
    this.overlay.appendChild(title);

    const modeBtn = this.button(`Mode: ${this._mode.toUpperCase()}`, () => {
      this.toggleMode();
      modeBtn.textContent = `Mode: ${this._mode.toUpperCase()}`;
    });
    this.overlay.appendChild(modeBtn);

    this.overlay.appendChild(this.button("Play", () => this.cb.onStart(this._mode), { "data-action": "play" }));
    this.overlay.appendChild(this.button("Test Levels (dev)", () => this.showLevels(), { "data-action": "testlevels" }));

    const best = document.createElement("p");
    best.textContent = `Best: ${this.save.bestDistance.toLocaleString("en-US")}m`;
    this.overlay.appendChild(best);
  }

  showPause(): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const h = document.createElement("h2");
    h.textContent = "Paused";
    this.overlay.appendChild(h);
    this.overlay.appendChild(this.button("Resume", () => this.cb.onResume(), { "data-action": "resume" }));
    this.overlay.appendChild(this.button("Main Menu", () => this.cb.onMenu(), { "data-action": "menu" }));
  }

  showResults(opts: { distance: number; best: number }): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const h = document.createElement("h2");
    h.textContent = "Run Over";
    this.overlay.appendChild(h);
    const p = document.createElement("p");
    p.textContent = `Distance: ${opts.distance.toLocaleString("en-US")}m · Best: ${opts.best.toLocaleString("en-US")}m`;
    this.overlay.appendChild(p);
    this.overlay.appendChild(this.button("Play Again", () => this.cb.onRetry(), { "data-action": "retry" }));
    this.overlay.appendChild(this.button("Main Menu", () => this.cb.onMenu(), { "data-action": "menu" }));
  }

  private prettyTheme(t: string): string {
    if (t === "crystalCavern") return "Crystal Cavern";
    if (t === "neonTunnel") return "Neon Tunnel";
    return "Glass Chapel";
  }

  showLevels(): void {
    this.overlay.replaceChildren();
    this.overlay.style.display = "flex";
    const h = document.createElement("h2");
    h.textContent = "Test Levels (dev)";
    this.overlay.appendChild(h);
    const dists = [0, 420, 820, 1220, 1640, 2040, 2440, 2840, 3240];
    for (const d of dists) {
      const cp = Math.floor(d / CHECKPOINT_SPACING);
      const label = `${this.prettyTheme(themeAt(cp))} · diff ${Math.round(difficultyAt(d))}/9 · ${d}m`;
      this.overlay.appendChild(
        this.button(label, () => this.cb.onStart(this._mode, d), { "data-test": String(d) }),
      );
    }
    this.overlay.appendChild(this.button("Back", () => this.showMain()));
  }

  hide(): void {
    this.overlay.style.display = "none";
  }
}

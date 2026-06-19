import type { RunState } from "../game/state";

export class Hud {
  private el: HTMLDivElement;

  constructor(private root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "hud";
    this.el.innerHTML = `
      <div class="hud-balls"><span data-hud="balls">◍ 0</span>
        <div class="hud-reserve-track"><div class="hud-reserve-fill" data-hud="reserve"></div></div>
      </div>
      <div class="hud-score">
        <div class="hud-score-value" data-hud="score">0</div>
        <div class="hud-streak" data-hud="streak">×1 streak</div>
      </div>
      <div class="hud-powerup" data-hud="powerup"></div>
      <div class="hud-mode" data-hud="mode">NORMAL</div>
      <div class="hud-distance" data-hud="distance">0m · CP 0m</div>
      `;
    this.root.appendChild(this.el);
  }

  update(state: RunState, startBalls: number, checkpoint: number): void {
    const q = (s: string) => this.el.querySelector(`[data-hud=${s}]`) as HTMLElement;
    q("balls").textContent = `◍ ${state.balls}`;
    q("reserve").style.width = `${Math.max(0, Math.min(100, (state.balls / startBalls) * 100))}%`;
    q("score").textContent = state.score.toLocaleString("en-US");
    q("streak").textContent = `×${state.streak} streak`;
    q("powerup").textContent = state.powerupT > 0 ? `MULTIBALL ${Math.ceil(state.powerupT)}s` : "";
    q("mode").textContent = state.mode.toUpperCase();
    q("distance").textContent = `${Math.round(state.distance)}m · CP ${checkpoint}m`;
  }

  dispose(): void {
    this.el.remove();
  }
}

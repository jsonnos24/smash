import type { RunState } from "../game/state";
import type { LevelDef } from "../content/types";

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
      <div class="hud-mode" data-hud="mode">NORMAL</div>
      <div class="hud-distance" data-hud="distance">Room 1 · 0m</div>
      <div class="crosshair"></div>`;
    this.root.appendChild(this.el);
  }

  update(state: RunState, level: LevelDef, roomCount: number): void {
    const q = (s: string) => this.el.querySelector(`[data-hud=${s}]`) as HTMLElement;
    q("balls").textContent = `◍ ${state.balls}`;
    q("reserve").style.width = `${Math.max(0, Math.min(100, (state.balls / level.startBalls) * 100))}%`;
    q("score").textContent = state.score.toLocaleString("en-US");
    q("streak").textContent = `×${state.streak} streak`;
    q("mode").textContent = state.mode.toUpperCase();
    q("distance").textContent = `Room ${Math.min(roomCount, state.roomIndex + 1)} · ${Math.round(state.distance)}m`;
  }

  dispose(): void {
    this.el.remove();
  }
}

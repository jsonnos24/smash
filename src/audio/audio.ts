import type { Theme } from "../content/types";
import { WebAudioBackend } from "./webaudio";

export type Sfx = "throw" | "shatterGlass" | "shatterCrystal" | "crash" | "powerup" | "checkpoint";

export interface AudioBackend {
  play(s: Sfx): void;
  music(theme: Theme): void;
  setVolume(v: number): void;
}

export class AudioManager {
  private _muted: boolean;
  private _unlocked = false;
  private backend: AudioBackend;

  constructor(opts: { muted?: boolean; backend?: AudioBackend } = {}) {
    this._muted = opts.muted ?? false;
    this.backend = opts.backend ?? new WebAudioBackend();
  }

  get unlocked(): boolean {
    return this._unlocked;
  }
  get muted(): boolean {
    return this._muted;
  }

  unlock(): void {
    this._unlocked = true;
  }

  setMuted(m: boolean): void {
    this._muted = m;
    this.backend.setVolume(m ? 0 : 1);
  }

  playSfx(s: Sfx): void {
    if (!this._unlocked || this._muted) return;
    this.backend.play(s);
  }

  playMusic(theme: Theme): void {
    if (!this._unlocked || this._muted) return;
    this.backend.music(theme);
  }
}

import type { Theme } from "../content/types";

export type Sfx = "throw" | "shatterGlass" | "shatterCrystal";

export interface AudioBackend {
  play(s: Sfx): void;
  music(theme: Theme): void;
  setVolume(v: number): void;
}

// Default backend lazily creates HTMLAudioElements; missing files no-op.
class HtmlAudioBackend implements AudioBackend {
  private cache = new Map<string, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;

  private get(src: string): HTMLAudioElement {
    let a = this.cache.get(src);
    if (!a) {
      a = new Audio(src);
      a.addEventListener("error", () => {}); // missing asset: ignore
      this.cache.set(src, a);
    }
    return a;
  }

  play(s: Sfx): void {
    const a = this.get(`/src/audio/assets/${s}.mp3`).cloneNode() as HTMLAudioElement;
    void a.play().catch(() => {});
  }

  music(theme: Theme): void {
    this.current?.pause();
    const a = this.get(`/src/audio/assets/music-${theme}.mp3`);
    a.loop = true;
    void a.play().catch(() => {});
    this.current = a;
  }

  setVolume(v: number): void {
    if (this.current) this.current.volume = v;
  }
}

export class AudioManager {
  private _muted: boolean;
  private _unlocked = false;
  private backend: AudioBackend;

  constructor(opts: { muted?: boolean; backend?: AudioBackend } = {}) {
    this._muted = opts.muted ?? false;
    this.backend = opts.backend ?? new HtmlAudioBackend();
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

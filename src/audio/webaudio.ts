import type { Theme } from "../content/types";
import type { AudioBackend, Sfx } from "./audio";

const MUSIC_CHORDS: Record<Theme, number[]> = {
  crystalCavern: [130.81, 196.0, 261.63],
  neonTunnel: [110.0, 164.81, 220.0],
  glassChapel: [146.83, 220.0, 293.66],
};

/** Procedural, file-free audio: all SFX + ambient pads synthesized at runtime. */
export class WebAudioBackend implements AudioBackend {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: AudioScheduledSourceNode[] = [];
  private volume = 1;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private noiseBuffer(ctx: AudioContext, dur: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private whoosh(ctx: AudioContext, t: number): void {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.26);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1300, t);
    bp.frequency.exponentialRampToValueAtTime(320, t + 0.22);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    src.connect(bp); bp.connect(g); g.connect(this.master!);
    src.start(t); src.stop(t + 0.27);
  }

  private glass(ctx: AudioContext, t: number): void {
    // sharp initial crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer(ctx, 0.06);
    const chp = ctx.createBiquadFilter();
    chp.type = "highpass";
    chp.frequency.value = 2500;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.6, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    crack.connect(chp); chp.connect(cg); cg.connect(this.master!);
    crack.start(t); crack.stop(t + 0.06);
    // cascade of tinkling shard partials, varied pitch/onset/decay
    for (let i = 0; i < 7; i++) {
      const f = 2200 + Math.random() * 5000;
      const start = t + Math.random() * 0.07;
      const dur = 0.08 + Math.random() * 0.16;
      const o = ctx.createOscillator();
      o.type = Math.random() < 0.5 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.06, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(this.master!);
      o.start(start); o.stop(start + dur + 0.02);
    }
  }

  private chime(ctx: AudioContext, t: number, partials: number[]): void {
    partials.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain();
      const start = t + i * 0.045;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      o.connect(g); g.connect(this.master!);
      o.start(start); o.stop(start + 0.55);
    });
  }

  private thud(ctx: AudioContext, t: number): void {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(this.master!);
    o.start(t); o.stop(t + 0.27);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.12);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(lp); lp.connect(ng); ng.connect(this.master!);
    src.start(t); src.stop(t + 0.12);
  }

  play(s: Sfx): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    switch (s) {
      case "throw": this.whoosh(ctx, t); break;
      case "shatterGlass": this.glass(ctx, t); break;
      case "shatterCrystal": this.chime(ctx, t, [880, 1320, 1760]); break;
      case "crash": this.thud(ctx, t); break;
      case "powerup": this.chime(ctx, t, [523, 659, 784, 1047]); break;
      case "checkpoint": this.chime(ctx, t, [659, 988]); break;
    }
  }

  private stopMusic(): void {
    for (const n of this.musicNodes) {
      try { n.stop(); } catch { /* already stopped */ }
    }
    this.musicNodes = [];
  }

  music(theme: Theme): void {
    const ctx = this.ensure();
    this.stopMusic();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 600; filter.Q.value = 0.7;
    filter.connect(this.musicGain!);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 240;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start(); this.musicNodes.push(lfo);
    for (const f of MUSIC_CHORDS[theme]) {
      const o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = f * 1.005;
      const g = ctx.createGain(); g.gain.value = 0.15;
      o1.connect(g); o2.connect(g); g.connect(filter);
      o1.start(); o2.start();
      this.musicNodes.push(o1, o2);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
}

import type { AudioCue, ToneSpec } from "../registry";

/**
 * Live playback of audio cues in the studio. File cues use <audio> elements;
 * tone cues are synthesized with the Web Audio API to match the renderer's
 * offline synth closely enough for previewing.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private files = new Map<string, HTMLAudioElement>();
  private active = new Map<string, { stop: () => void }>();
  private playing = false;
  private fps = 30;
  private muted = false;

  setMuted(m: boolean) {
    this.muted = m;
    for (const el of this.files.values()) el.muted = m;
    if (m) this.stopAll();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  play(fps: number) {
    this.fps = fps;
    this.playing = true;
    this.ensureCtx();
  }

  pause() {
    this.playing = false;
    this.stopAll();
  }

  seek() {
    this.stopAll();
  }

  private stopAll() {
    for (const a of this.active.values()) a.stop();
    this.active.clear();
  }

  /** Called every playback tick with the current frame and the cue list. */
  tick(frame: number, cues: AudioCue[]) {
    if (!this.playing || this.muted) return;
    const fps = this.fps;
    const liveIds = new Set<string>();
    for (const cue of cues) {
      if (frame < cue.startFrame || frame >= cue.endFrame) continue;
      liveIds.add(cue.id);
      if (this.active.has(cue.id)) {
        // drift correction for files
        const el = this.files.get(cue.id);
        if (el && cue.kind === "file") {
          const expected = (cue.trimStart ?? 0) + ((frame - cue.startFrame) / fps) * (cue.playbackRate ?? 1);
          if (Math.abs(el.currentTime - expected) > 0.2) el.currentTime = expected;
        }
        continue;
      }
      const startOffsetSec = (frame - cue.startFrame) / fps;
      if (cue.kind === "file" && cue.src) this.startFile(cue, startOffsetSec);
      else if (cue.kind === "tone" && cue.tone) this.startTone(cue, startOffsetSec);
    }
    for (const [id, a] of this.active) {
      if (!liveIds.has(id)) {
        a.stop();
        this.active.delete(id);
      }
    }
  }

  private startFile(cue: AudioCue, offsetSec: number) {
    let el = this.files.get(cue.id);
    if (!el) {
      el = new window.Audio(cue.src);
      el.preload = "auto";
      this.files.set(cue.id, el);
    }
    el.muted = this.muted;
    el.loop = !!cue.loop;
    el.playbackRate = cue.playbackRate ?? 1;
    el.volume = Math.min(1, cue.volume);
    el.currentTime = (cue.trimStart ?? 0) + offsetSec * (cue.playbackRate ?? 1);
    void el.play().catch(() => {});
    this.active.set(cue.id, { stop: () => el!.pause() });
  }

  private startTone(cue: AudioCue, offsetSec: number) {
    const ctx = this.ensureCtx();
    const spec = cue.tone!;
    const total = (cue.endFrame - cue.startFrame) / this.fps;
    const remaining = total - offsetSec;
    if (remaining <= 0) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    const master = cue.volume * 0.6;
    // ADSR from the *cue* start, shifted by offsetSec.
    const env = adsrAt(spec, total, offsetSec);
    gain.gain.setValueAtTime(env * master, now);
    // schedule the rest of the envelope coarsely
    const step = 0.02;
    for (let t = step; t < remaining; t += step) {
      gain.gain.linearRampToValueAtTime(adsrAt(spec, total, offsetSec + t) * master, now + t);
    }
    gain.gain.linearRampToValueAtTime(0, now + remaining);

    if (spec.wave === "noise") {
      const len = Math.ceil(ctx.sampleRate * remaining) + 1;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 4294967296) * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 1.2;
      const f0 = spec.freq + ((spec.freqEnd ?? spec.freq) - spec.freq) * (offsetSec / total);
      filter.frequency.setValueAtTime(f0, now);
      filter.frequency.linearRampToValueAtTime(spec.freqEnd ?? spec.freq, now + remaining);
      src.connect(filter).connect(gain);
      src.start(now);
      src.stop(now + remaining);
      nodes.push(src);
    } else {
      const partials: [number, number][] = [[1, 1], ...(spec.partials ?? [])];
      for (const [ratio, g] of partials) {
        const osc = ctx.createOscillator();
        osc.type = spec.wave === "pluck" ? "triangle" : spec.wave === "epiano" ? "sine" : spec.wave;
        const f0 = spec.freq + ((spec.freqEnd ?? spec.freq) - spec.freq) * (offsetSec / total);
        osc.frequency.setValueAtTime(f0 * ratio, now);
        if (spec.freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(spec.freqEnd * ratio, now + remaining);
        const pg = ctx.createGain();
        pg.gain.value = g;
        osc.connect(pg).connect(gain);
        osc.start(now);
        osc.stop(now + remaining);
        nodes.push(osc);
      }
    }
    this.active.set(cue.id, {
      stop: () => {
        try {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
          for (const n of nodes) n.stop(ctx.currentTime + 0.05);
        } catch {
          /* already stopped */
        }
      },
    });
  }
}

/** ADSR envelope level at time t (seconds from cue start) for a cue of `total` seconds. */
export function adsrAt(spec: ToneSpec, total: number, t: number): number {
  const { attack, decay, sustain, release } = spec;
  const relStart = Math.max(0, total - release);
  let level: number;
  if (t < attack) level = attack > 0 ? t / attack : 1;
  else if (t < attack + decay) level = 1 - (1 - sustain) * ((t - attack) / decay);
  else level = sustain;
  if (t >= relStart) {
    const rel = release > 0 ? 1 - (t - relStart) / release : 0;
    level = level * Math.max(0, Math.min(1, rel));
  }
  return Math.max(0, level);
}

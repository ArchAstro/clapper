import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

/** System ffmpeg if present, otherwise the ffmpeg-static binary. */
export function resolveFfmpeg(): string {
  if (process.env.AGENTICVIDS_FFMPEG) return process.env.AGENTICVIDS_FFMPEG;
  const sys = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (sys.status === 0 && /libx264/.test(sys.stdout + sys.stderr)) return "ffmpeg";
  try {
    const p = require("ffmpeg-static") as string | null;
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* fallthrough */
  }
  throw new Error("No ffmpeg found. Install ffmpeg on PATH, or run `pnpm rebuild ffmpeg-static` to fetch the bundled binary.");
}

export function runFfmpeg(args: string[], opts: { stdin?: NodeJS.ReadableStream | null; quiet?: boolean } = {}): Promise<void> & { child: ReturnType<typeof spawn> } {
  const bin = resolveFfmpeg();
  const child = spawn(bin, ["-hide_banner", "-loglevel", opts.quiet === false ? "info" : "error", ...args], { stdio: [opts.stdin === undefined ? "ignore" : "pipe", "inherit", "inherit"] });
  const p = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  }) as Promise<void> & { child: typeof child };
  p.child = child;
  return p;
}

export interface VideoEncodeOptions {
  fps: number;
  width: number;
  height: number;
  out: string;
  codec?: "h264" | "h265" | "vp9" | "prores";
  crf?: number;
  preset?: string;
  /** Pixel format; yuv420p for compatibility. */
  pixFmt?: string;
  imageFormat?: "png" | "jpeg";
}

/** Spawn an ffmpeg that consumes PNG frames on stdin and writes a video file. */
export function startFrameEncoder(o: VideoEncodeOptions) {
  const codec = o.codec ?? "h264";
  const vcodec = codec === "h264" ? ["-c:v", "libx264", "-preset", o.preset ?? "medium", "-crf", String(o.crf ?? 17), "-profile:v", "high", "-movflags", "+faststart"]
    : codec === "h265" ? ["-c:v", "libx265", "-preset", o.preset ?? "medium", "-crf", String(o.crf ?? 20), "-tag:v", "hvc1", "-movflags", "+faststart"]
    : codec === "vp9" ? ["-c:v", "libvpx-vp9", "-crf", String(o.crf ?? 30), "-b:v", "0", "-row-mt", "1"]
    : ["-c:v", "prores_ks", "-profile:v", "3"];
  const args = [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(o.fps),
    "-vcodec", o.imageFormat === "jpeg" ? "mjpeg" : "png",
    "-i", "pipe:0",
    ...vcodec,
    "-pix_fmt", o.pixFmt ?? (codec === "prores" ? "yuv422p10le" : "yuv420p"),
    "-r", String(o.fps),
    "-an",
    o.out,
  ];
  return runFfmpeg(args, { stdin: null });
}

/* ------------------------------ audio mixing ------------------------------- */

import type { AudioCue, ToneSpec } from "@agenticvids/core";

export interface MixOptions {
  cues: AudioCue[];
  fps: number;
  durationInFrames: number;
  /** Where `staticFile()` paths resolve. */
  publicDir: string;
  workDir: string;
  out: string;
  sampleRate?: number;
}

/** Mix all cues into one audio file (wav). Returns null if there is nothing to mix. */
export async function mixAudio(o: MixOptions): Promise<string | null> {
  const sr = o.sampleRate ?? 48000;
  const inputs: string[] = [];
  const filters: string[] = [];
  const total = o.durationInFrames / o.fps;
  let idx = 0;

  // All synthesized tones are summed offline into a single track first, so a
  // composition with hundreds of clicks still costs ffmpeg exactly one input.
  const toneCues = o.cues.filter((c) => c.kind === "tone" && c.tone);
  const busCues = o.cues.filter((c) => c.kind === "bus" && c.automation?.volume);
  const busExpr = busCues.length ? busGainExpr(busCues, o.fps) : null;
  if (toneCues.length) {
    const [tl, tr] = renderToneTrack(toneCues, o.fps, o.durationInFrames, sr, busCues);
    const src = path.join(o.workDir, "tones.wav");
    fs.writeFileSync(src, encodeWav(tl, sr, tr));
    inputs.push("-i", src);
    filters.push(`[${idx}:a]aformat=sample_fmts=fltp:sample_rates=${sr}:channel_layouts=stereo[a${idx}]`);
    idx++;
  }

  for (const cue of o.cues) {
    if (cue.kind !== "file" || !cue.src) continue;
    const startSec = cue.startFrame / o.fps;
    const lenSec = Math.max(0, Math.min(cue.endFrame, o.durationInFrames) - cue.startFrame) / o.fps;
    if (lenSec <= 0 || startSec >= total) continue;
    const src = resolveSrc(cue.src, o.publicDir);
    if (!/^https?:/.test(src) && !fs.existsSync(src)) {
      console.warn(`[agenticvids] audio file not found, skipping: ${src}`);
      continue;
    }
    const i = idx++;
    const loopArgs = cue.loop ? ["-stream_loop", "-1"] : [];
    inputs.push(...loopArgs, "-i", src);
    const chain: string[] = [];
    const trim = cue.trimStart ?? 0;
    const rate = cue.playbackRate ?? 1;
    if (rate !== 1) chain.push(`atempo=${clampTempo(rate)}`);
    chain.push(`atrim=start=${trim.toFixed(4)}:end=${(trim + lenSec).toFixed(4)}`, "asetpts=PTS-STARTPTS");
    chain.push(`aformat=sample_fmts=fltp:sample_rates=${sr}:channel_layouts=stereo`);
    chain.push(`volume=${cue.volume.toFixed(4)}`);
    if (cue.fadeInFrames > 0) chain.push(`afade=t=in:st=0:d=${(cue.fadeInFrames / o.fps).toFixed(4)}`);
    if (cue.fadeOutFrames > 0) chain.push(`afade=t=out:st=${Math.max(0, lenSec - cue.fadeOutFrames / o.fps).toFixed(4)}:d=${(cue.fadeOutFrames / o.fps).toFixed(4)}`);
    const delayMs = Math.round(startSec * 1000);
    chain.push(`adelay=${delayMs}|${delayMs}`);
    if (busExpr) chain.push(`volume='${busExpr}':eval=frame`);
    filters.push(`[${i}:a]${chain.join(",")}[a${i}]`);
  }
  if (idx === 0) return null;
  const mixIn = Array.from({ length: idx }, (_, i) => `[a${i}]`).join("");
  const tail = idx === 1 ? `${mixIn}atrim=end=${total.toFixed(4)},apad=whole_dur=${total.toFixed(4)}[out]` : `${mixIn}amix=inputs=${idx}:normalize=0:dropout_transition=0,atrim=end=${total.toFixed(4)},apad=whole_dur=${total.toFixed(4)}[out]`;
  filters.push(tail);
  const args = [...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-ar", String(sr), "-y", o.out];
  await runFfmpeg(args);
  return o.out;
}

/** Combined gain of every bus (duck) cue at an absolute frame. */
export function busGainAt(bus: AudioCue[], frame: number): number {
  let g = 1;
  for (const c of bus) {
    if (frame < c.startFrame || frame >= c.endFrame || !c.automation?.volume) continue;
    g *= envelopeAt(c.automation.volume, frame - c.startFrame);
  }
  return g;
}

/** ffmpeg `volume` expression (in seconds `t`) equal to the combined bus gain: piecewise linear between every breakpoint. */
export function busGainExpr(bus: AudioCue[], fps: number): string {
  const frames = new Set<number>();
  for (const c of bus) for (const [f] of c.automation?.volume ?? []) frames.add(c.startFrame + f);
  const pts = [...frames].sort((a, b) => a - b).map((f) => [f / fps, busGainAt(bus, f)] as const);
  if (pts.length === 0) return "1";
  // Sample just inside each breakpoint too, so a hard step (two points at one frame) survives.
  let expr = pts[pts.length - 1][1].toFixed(4);
  for (let i = pts.length - 2; i >= 0; i--) {
    const [t0, g0] = pts[i];
    const [t1, g1] = pts[i + 1];
    const seg = t1 > t0 ? `${g0.toFixed(4)}+(${(g1 - g0).toFixed(4)})*(t-${t0.toFixed(4)})/${(t1 - t0).toFixed(4)}` : g0.toFixed(4);
    expr = `if(lt(t,${t1.toFixed(4)}),${seg},${expr})`;
  }
  return `if(lt(t,${pts[0][0].toFixed(4)}),${pts[0][1].toFixed(4)},${expr})`;
}

function clampTempo(rate: number): number {
  return Math.min(100, Math.max(0.5, rate));
}

function resolveSrc(src: string, publicDir: string): string {
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("file://")) return decodeURIComponent(src.slice(7));
  const rel = src.replace(/^\//, "");
  const inPublic = path.join(publicDir, rel);
  if (fs.existsSync(inPublic)) return inPublic;
  if (path.isAbsolute(src) && fs.existsSync(src)) return src;
  return inPublic;
}

/** Mux a silent video with an audio track. */
export async function muxAudio(video: string, audio: string, out: string, opts: { audioBitrate?: string; codec?: string; loudnorm?: boolean | number } = {}) {
  const ext = path.extname(out).toLowerCase();
  const acodec = opts.codec ?? (ext === ".webm" ? "libopus" : "aac");
  // Normalise to a streaming-friendly integrated loudness (default -16 LUFS);
  // LRA 16 keeps the quiet scenes quiet.
  const lufs = opts.loudnorm === false ? null : typeof opts.loudnorm === "number" ? opts.loudnorm : -16;
  const af = lufs === null ? [] : ["-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=16`];
  await runFfmpeg(["-y", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", ...af, "-ar", "48000", "-c:a", acodec, "-b:a", opts.audioBitrate ?? "192k", "-shortest", "-movflags", "+faststart", out]);
}

/**
 * Sum every tone cue into one STEREO track of the full duration (volume, fades,
 * pan and reverb send applied), then run the reverb bus and soft-limit.
 */
export function renderToneTrack(cues: AudioCue[], fps: number, durationInFrames: number, sr: number, bus: AudioCue[] = []): [Float32Array, Float32Array] {
  const n = Math.ceil((durationInFrames / fps) * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const wetL = new Float32Array(n);
  const wetR = new Float32Array(n);
  let anyWet = false;
  for (const cue of cues) {
    const startSec = cue.startFrame / fps;
    const lenSec = Math.max(0, Math.min(cue.endFrame, durationInFrames) - cue.startFrame) / fps;
    if (lenSec <= 0 || startSec >= durationInFrames / fps) continue;
    const spec = cue.tone!;
    const [mL, mR] = renderToneStereo(cue, lenSec, sr, fps);
    const offset = Math.round(startSec * sr);
    const fadeIn = (cue.fadeInFrames / fps) * sr;
    const fadeOut = (cue.fadeOutFrames / fps) * sr;
    const send = spec.reverb ?? 0;
    if (send > 0) anyWet = true;
    const volEnv = spec.automation?.volume;
    for (let i = 0; i < mL.length && offset + i < n; i++) {
      let g = cue.volume;
      if (fadeIn > 0 && i < fadeIn) g *= i / fadeIn;
      if (fadeOut > 0 && i > mL.length - fadeOut) g *= Math.max(0, (mL.length - i) / fadeOut);
      if (volEnv) g *= envelopeAt(volEnv, (i / sr) * fps);
      L[offset + i] += mL[i] * g;
      R[offset + i] += mR[i] * g;
      if (send > 0) {
        wetL[offset + i] += mL[i] * g * send;
        wetR[offset + i] += mR[i] * g * send;
      }
    }
  }
  if (anyWet) {
    const rl = reverb(wetL, sr, 0);
    const rr = reverb(wetR, sr, 1);
    for (let i = 0; i < n; i++) {
      L[i] += rl[i];
      R[i] += rr[i];
    }
  }
  if (bus.length) {
    // bus gain is smooth at frame resolution: evaluate per 1 ms block
    const block = Math.max(1, Math.round(sr / 1000));
    for (let i = 0; i < n; i += block) {
      const g = busGainAt(bus, (i / sr) * fps);
      if (g === 1) continue;
      const end = Math.min(n, i + block);
      for (let j = i; j < end; j++) {
        L[j] *= g;
        R[j] *= g;
      }
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (peak > 0.98) {
    const k = 0.98 / peak;
    for (let i = 0; i < n; i++) {
      L[i] *= k;
      R[i] *= k;
    }
  }
  return [L, R];
}

/** Schroeder reverb: 4 parallel combs + 2 series allpasses. `variant` decorrelates L/R. */
function reverb(input: Float32Array, sr: number, variant: 0 | 1): Float32Array {
  const n = input.length;
  const out = new Float32Array(n);
  const combMs = variant === 0 ? [29.7, 37.1, 41.1, 43.7] : [30.9, 36.1, 42.3, 44.9];
  const fb = 0.84;
  const combs = combMs.map((ms) => ({ buf: new Float32Array(Math.round((ms * sr) / 1000)), i: 0, lp: 0 }));
  const apMs = [5.0, 1.7];
  const aps = apMs.map((ms) => ({ buf: new Float32Array(Math.round((ms * sr) / 1000)), i: 0 }));
  for (let t = 0; t < n; t++) {
    const x = input[t];
    let y = 0;
    for (const c of combs) {
      const d = c.buf[c.i];
      // damped feedback (one-pole lowpass in the loop) for a warm tail
      c.lp = c.lp * 0.35 + d * 0.65;
      c.buf[c.i] = x + c.lp * fb;
      c.i = (c.i + 1) % c.buf.length;
      y += d;
    }
    y *= 0.25;
    for (const a of aps) {
      const d = a.buf[a.i];
      const v = y + d * -0.7;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      y = d + v * 0.7;
    }
    out[t] = y * 0.6;
  }
  return out;
}

/** Offline tone synthesis to a 16-bit stereo WAV buffer. */
export function renderToneWav(cue: AudioCue, lenSec: number, sr: number): Buffer {
  const [l, r] = renderToneStereo(cue, lenSec, sr);
  return encodeWav(l, sr, r);
}

/** Mono synthesis (legacy helper): left channel of the stereo render. */
export function renderToneSamples(cue: AudioCue, lenSec: number, sr: number): Float32Array {
  return renderToneStereo(cue, lenSec, sr)[0];
}

/** Synthesize one cue as a stereo pair (no cue volume applied). */
export function renderToneStereo(cue: AudioCue, lenSec: number, sr: number, fps = 30): [Float32Array, Float32Array] {
  const spec = cue.tone!;
  const n = Math.ceil(lenSec * sr);
  const det = Math.pow(2, (spec.detune ?? 0) / 1200);
  const mono = renderVoice(spec, n, sr, det, 12345, fps);
  let L = mono;
  let R = mono;
  if ((spec.spread ?? 0) > 0 && spec.wave !== "noise") {
    const cents = 4 + 10 * spec.spread!;
    const v2 = renderVoice(spec, n, sr, det * Math.pow(2, cents / 1200), 777, fps);
    const v3 = renderVoice(spec, n, sr, det * Math.pow(2, -cents / 1200), 999, fps);
    L = new Float32Array(n);
    R = new Float32Array(n);
    const w = spec.spread!;
    for (let i = 0; i < n; i++) {
      L[i] = (mono[i] + v2[i] * w) / (1 + w);
      R[i] = (mono[i] + v3[i] * w) / (1 + w);
    }
  } else if ((spec.wave === "noise" || spec.wave === "breath") && (spec.spread ?? 0) > 0) {
    R = renderVoice(spec, n, sr, det, 4242, fps);
  }
  // constant-power pan
  const pan = Math.max(-1, Math.min(1, spec.pan ?? 0));
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    outL[i] = L[i] * gl * 1.2;
    outR[i] = R[i] * gr * 1.2;
  }
  return [outL, outR];
}

/** Piecewise-linear breakpoint envelope: [frame, value][] evaluated at a (fractional) frame. */
export function envelopeAt(points: [number, number][], frame: number): number {
  if (points.length === 0) return 1;
  if (frame <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [f0, v0] = points[i - 1];
    const [f1, v1] = points[i];
    if (frame <= f1) return f1 === f0 ? v1 : v0 + ((v1 - v0) * (frame - f0)) / (f1 - f0);
  }
  return points[points.length - 1][1];
}

function adsr(spec: ToneSpec, t: number, lenSec: number): number {
  const { attack, decay, sustain, release } = spec;
  const relStart = Math.max(0, lenSec - release);
  let env: number;
  if (t < attack) env = attack > 0 ? t / attack : 1;
  else if (t < attack + decay) env = 1 - (1 - sustain) * ((t - attack) / decay);
  else env = sustain;
  if (t >= relStart) env *= release > 0 ? Math.max(0, 1 - (t - relStart) / release) : 0;
  return env;
}

function renderVoice(spec: ToneSpec, n: number, sr: number, detune: number, seed0: number, fps = 30): Float32Array {
  const out = new Float32Array(n);
  const lenSec = n / sr;
  const f0 = spec.freq * detune;
  const f1 = (spec.freqEnd ?? spec.freq) * detune;
  const ring = spec.ring ?? 1.2;
  let seed = seed0 >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (spec.wave === "pluck") {
    // Karplus–Strong: noise burst through a delay loop with a damped averaging filter.
    const period = Math.max(2, Math.round(sr / f0));
    const buf = new Float32Array(period);
    const bright = spec.brightness ?? 0.6;
    let lp = 0;
    for (let i = 0; i < period; i++) {
      const w = rnd() * 2 - 1;
      lp += (w - lp) * (0.15 + 0.85 * bright); // darker = more pre-filtering
      buf[i] = lp;
    }
    const g = Math.pow(10, -3 / (f0 * Math.max(0.05, ring))); // -60 dB at `ring` seconds
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const cur = buf[idx];
      const nxt = buf[(idx + 1) % period];
      const y = (cur + nxt) * 0.5 * g;
      buf[idx] = y;
      idx = (idx + 1) % period;
      out[i] = cur * adsr(spec, i / sr, lenSec);
    }
  } else if (spec.wave === "epiano") {
    // 2-operator FM, Rhodes-like: bell partial decays fast, body rings.
    let ph = 0;
    let phm = 0;
    let phb = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const f = f0 + (f1 - f0) * (t / lenSec);
      ph += (2 * Math.PI * f) / sr;
      phm += (2 * Math.PI * f * 14) / sr;
      phb += (2 * Math.PI * f) / sr;
      const bell = Math.exp(-t / 0.12) * 1.6;
      const body = Math.exp(-t / Math.max(0.2, ring / 3)) * 0.9 + 0.15;
      const amp = Math.exp((-6.9 * t) / Math.max(0.05, ring));
      const v = Math.sin(ph + bell * Math.sin(phm)) * 0.7 + Math.sin(phb * 1.0 + body * Math.sin(phb * 1.0)) * 0.4 + Math.sin(ph * 2) * 0.06;
      out[i] = v * amp * adsr(spec, t, lenSec);
    }
  } else if (spec.wave === "breath") {
    // Filtered noise whose 2-pole lowpass and level swell with a slow breathing LFO.
    let seed = (seed0 >>> 0) || 1;
    const rate = spec.lfo?.rate ?? 0.14;
    const depth = spec.lfo?.depth ?? 0.4;
    const base = spec.cutoff ?? 700;
    let lp1 = 0, lp2 = 0, hp = 0;
    const hpk = 1 - Math.exp((-2 * Math.PI * 120) / sr);
    for (let i = 0; i < n; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed / 2147483648 - 1;
      const t = i / sr;
      const sw = 0.5 - 0.5 * Math.cos(2 * Math.PI * rate * t);
      const hz = base * (1 - depth + 1.4 * depth * sw);
      const k = 1 - Math.exp((-2 * Math.PI * hz) / sr);
      lp1 += k * (x - lp1);
      lp2 += k * (lp1 - lp2);
      hp += hpk * (lp2 - hp);
      out[i] = (lp2 - hp) * (1 - depth + depth * sw) * 4;
    }
  } else if (spec.wave === "noise") {
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const f = f0 + (f1 - f0) * (t / lenSec);
      const white = rnd() * 2 - 1;
      const rc = 1 / (2 * Math.PI * Math.max(20, f));
      const a = 1 / sr / (rc + 1 / sr);
      lp += a * (white - lp);
      lp2 += a * (lp - lp2);
      out[i] = lp2 * 3 * adsr(spec, t, lenSec);
    }
  } else {
    const partials: [number, number][] = [[1, 1], ...(spec.partials ?? [])];
    const phase = partials.map(() => 0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const f = f0 + (f1 - f0) * (t / lenSec);
      let v = 0;
      for (let p = 0; p < partials.length; p++) {
        const [ratio, g] = partials[p];
        phase[p] += (2 * Math.PI * f * ratio) / sr;
        const ph = phase[p];
        let w: number;
        switch (spec.wave) {
          case "sine":
            w = Math.sin(ph);
            break;
          case "triangle":
            w = (2 / Math.PI) * Math.asin(Math.sin(ph));
            break;
          case "square":
            w = Math.sin(ph) >= 0 ? 1 : -1;
            break;
          default:
            w = ((ph / Math.PI) % 2) - 1;
        }
        v += w * g;
      }
      out[i] = v * adsr(spec, t, lenSec) * 0.6;
    }
  }
  // post: lowpass (optionally automated) and tremolo
  const cutEnv = spec.automation?.cutoff;
  if ((spec.cutoff || cutEnv) && spec.wave !== "breath") {
    let lp = 0;
    let a = 0;
    let lastHz = -1;
    for (let i = 0; i < n; i++) {
      const hz = cutEnv ? envelopeAt(cutEnv, (i / sr) * fps) : spec.cutoff!;
      if (hz !== lastHz) {
        const rc = 1 / (2 * Math.PI * Math.max(20, hz));
        a = 1 / sr / (rc + 1 / sr);
        lastHz = hz;
      }
      lp += a * (out[i] - lp);
      out[i] = lp;
    }
  }
  if (spec.lfo && spec.lfo.depth > 0) {
    const { rate, depth } = spec.lfo;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] *= 1 - depth * 0.5 * (1 - Math.cos(2 * Math.PI * rate * t));
    }
  }
  return out;
}

function encodeWav(left: Float32Array, sr: number, right?: Float32Array): Buffer {
  const channels = 2;
  const bytesPerSample = 2;
  const dataLen = left.length * channels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * channels * bytesPerSample, 28);
  buf.writeUInt16LE(channels * bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLen, 40);
  const r = right ?? left;
  let o = 44;
  for (let i = 0; i < left.length; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), o);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), o + 2);
    o += 4;
  }
  return buf;
}

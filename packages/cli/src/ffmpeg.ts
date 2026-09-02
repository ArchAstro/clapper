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

import type { AudioCue } from "@agenticvids/core";

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
  if (toneCues.length) {
    const track = renderToneTrack(toneCues, o.fps, o.durationInFrames, sr);
    const src = path.join(o.workDir, "tones.wav");
    fs.writeFileSync(src, encodeWav(track, sr));
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

/** Sum every tone cue into one mono float track of the full duration (with volume + fades applied). */
export function renderToneTrack(cues: AudioCue[], fps: number, durationInFrames: number, sr: number): Float32Array {
  const n = Math.ceil((durationInFrames / fps) * sr);
  const track = new Float32Array(n);
  let peak = 0;
  for (const cue of cues) {
    const startSec = cue.startFrame / fps;
    const lenSec = Math.max(0, Math.min(cue.endFrame, durationInFrames) - cue.startFrame) / fps;
    if (lenSec <= 0 || startSec >= durationInFrames / fps) continue;
    const mono = renderToneSamples(cue, lenSec, sr);
    const offset = Math.round(startSec * sr);
    const fadeIn = (cue.fadeInFrames / fps) * sr;
    const fadeOut = (cue.fadeOutFrames / fps) * sr;
    for (let i = 0; i < mono.length && offset + i < n; i++) {
      let g = cue.volume;
      if (fadeIn > 0 && i < fadeIn) g *= i / fadeIn;
      if (fadeOut > 0 && i > mono.length - fadeOut) g *= Math.max(0, (mono.length - i) / fadeOut);
      track[offset + i] += mono[i] * g;
    }
  }
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(track[i]));
  // Soft-limit so a loud stack never clips.
  if (peak > 0.98) for (let i = 0; i < n; i++) track[i] *= 0.98 / peak;
  return track;
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
  // Normalise to a streaming-friendly integrated loudness (default -16 LUFS) so
  // quiet synthesized mixes come out at a sane level.
  const lufs = opts.loudnorm === false ? null : typeof opts.loudnorm === "number" ? opts.loudnorm : -16;
  const af = lufs === null ? [] : ["-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=11`];
  await runFfmpeg(["-y", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", ...af, "-ar", "48000", "-c:a", acodec, "-b:a", opts.audioBitrate ?? "192k", "-shortest", "-movflags", "+faststart", out]);
}

/* -------------------------------- synth ------------------------------------ */

/** Offline tone synthesis to a 16-bit stereo WAV buffer. Matches the studio's AudioEngine. */
export function renderToneWav(cue: AudioCue, lenSec: number, sr: number): Buffer {
  return encodeWav(renderToneSamples(cue, lenSec, sr), sr);
}

/** Offline tone synthesis: mono float samples (no cue volume applied). */
export function renderToneSamples(cue: AudioCue, lenSec: number, sr: number): Float32Array {
  const spec = cue.tone!;
  const n = Math.ceil(lenSec * sr);
  const samples = new Float32Array(n);
  const { attack, decay, sustain, release } = spec;
  const relStart = Math.max(0, lenSec - release);
  const partials: [number, number][] = spec.wave === "noise" ? [] : [[1, 1], ...(spec.partials ?? [])];
  let phase = partials.map(() => 0);
  // noise state
  let seed = 12345;
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let env: number;
    if (t < attack) env = attack > 0 ? t / attack : 1;
    else if (t < attack + decay) env = 1 - (1 - sustain) * ((t - attack) / decay);
    else env = sustain;
    if (t >= relStart) env *= release > 0 ? Math.max(0, 1 - (t - relStart) / release) : 0;
    const f = spec.freq + ((spec.freqEnd ?? spec.freq) - spec.freq) * (t / lenSec);
    let v = 0;
    if (spec.wave === "noise") {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 4294967296) * 2 - 1;
      // two-pole lowpass with cutoff f
      const rc = 1 / (2 * Math.PI * Math.max(20, f));
      const a = (1 / sr) / (rc + 1 / sr);
      lp += a * (white - lp);
      lp2 += a * (lp - lp2);
      v = lp2 * 3;
    } else {
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
    }
    samples[i] = v * env * 0.6;
  }
  return samples;
}

function encodeWav(mono: Float32Array, sr: number): Buffer {
  const channels = 2;
  const bytesPerSample = 2;
  const dataLen = mono.length * channels * bytesPerSample;
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
  let o = 44;
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    const v = Math.round(s * 32767);
    buf.writeInt16LE(v, o);
    buf.writeInt16LE(v, o + 2);
    o += 4;
  }
  return buf;
}

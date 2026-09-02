import type { AudioCue } from "../registry";

export type Selection = { kind: "track"; id: string } | { kind: "cue"; id: string } | null;

export function timecode(frame: number, fps: number): string {
  const s = Math.floor(frame / fps);
  const f = frame - s * fps;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

export const CATEGORY_ORDER = ["file", "bus", "pluck", "epiano", "sine", "triangle", "sawtooth", "square", "noise", "breath"];

export function cueCategory(c: AudioCue): string {
  return c.kind === "file" ? "file" : c.kind === "bus" ? "bus" : (c.tone?.wave ?? "sine");
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function noteName(hz: number): string {
  if (!(hz > 0)) return "";
  const n = Math.round(12 * Math.log2(hz / 440)) + 69;
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

/** The cue's own name (last id segment), else something descriptive. */
export function cueName(c: AudioCue): string {
  const parts = c.id.split("|");
  const name = parts.length > 1 ? parts[parts.length - 1] : "";
  if (name) return name;
  if (c.kind === "file") return c.src?.split("/").pop() ?? "file";
  if (c.kind === "bus") return "duck";
  return `${c.tone?.wave ?? "tone"} ${Math.round(c.tone?.freq ?? 0)}Hz`;
}

export function cueLabel(c: AudioCue): string {
  if (c.kind === "tone" && c.tone) {
    const n = noteName(c.tone.freq);
    return c.tone.wave === "noise" || c.tone.wave === "breath" ? cueName(c) : `${cueName(c)} ${n}`;
  }
  if (c.kind === "bus") {
    const depth = Math.min(...(c.automation?.volume ?? [[0, 1]]).map(([, g]) => g));
    return `duck ×${depth.toFixed(2)}`;
  }
  return cueName(c);
}

/** Gain over the cue as [relative frame, gain] points, including fades and volume automation. */
export function volumeEnvelope(c: AudioCue): [number, number][] {
  const dur = Math.max(1, c.endFrame - c.startFrame);
  const v = c.volume;
  const pts: [number, number][] = [];
  if (c.kind === "bus") return c.automation?.volume ?? [[0, 1], [dur, 1]];
  const auto = c.tone?.automation?.volume;
  const base = (f: number) => {
    let g = v;
    if (c.fadeInFrames > 0 && f < c.fadeInFrames) g *= f / c.fadeInFrames;
    if (c.fadeOutFrames > 0 && f > dur - c.fadeOutFrames) g *= Math.max(0, (dur - f) / c.fadeOutFrames);
    if (auto) g *= envAt(auto, f);
    return g;
  };
  const marks = new Set<number>([0, dur]);
  if (c.fadeInFrames > 0) marks.add(Math.min(dur, c.fadeInFrames));
  if (c.fadeOutFrames > 0) marks.add(Math.max(0, dur - c.fadeOutFrames));
  for (const [f] of auto ?? []) marks.add(Math.max(0, Math.min(dur, f)));
  for (const f of [...marks].sort((a, b) => a - b)) pts.push([f, base(f)]);
  return pts;
}

export function envAt(points: [number, number][], frame: number): number {
  if (points.length === 0) return 1;
  if (frame <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [f0, v0] = points[i - 1];
    const [f1, v1] = points[i];
    if (frame <= f1) return f1 === f0 ? v1 : v0 + ((v1 - v0) * (frame - f0)) / (f1 - f0);
  }
  return points[points.length - 1][1];
}

/** First-fit packing of overlapping intervals into rows. */
export function packRows<T extends { start: number; end: number }>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (const it of [...items].sort((a, b) => a.start - b.start || b.end - a.end)) {
    let row = rows.find((r) => r.every((x) => it.start >= x.end || it.end <= x.start));
    if (!row) {
      row = [];
      rows.push(row);
    }
    row.push(it);
  }
  return rows;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

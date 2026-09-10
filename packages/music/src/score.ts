import type { Clip, CompiledNote, CompiledScore, Note, Pitch, Score, Track } from "./types.js";
export const PPQ = 960;
export const whole = 4,
  half = 2,
  quarter = 1,
  eighth = 0.5,
  sixteenth = 0.25;
export const bars = (n: number, meter: [number, number] = [4, 4]) => (n * meter[0] * 4) / meter[1];
/** One-based bar position, for a constant-meter passage. */
export const bar = (n: number, meter: [number, number] = [4, 4]) => bars(n - 1, meter);
export const note = (pitch: Pitch, at: number, duration: number, velocity = 80): Note => ({
  pitch,
  at,
  duration,
  velocity,
});
export const chord = (
  pitches: Pitch[],
  options: { at?: number; duration: number; velocity?: number; strum?: number },
): Note[] =>
  pitches.map((p, i) =>
    note(p, (options.at ?? 0) + i * (options.strum ?? 0), options.duration, options.velocity),
  );
export function phrase(text: string, options: { duration?: number; velocity?: number } = {}): Note[] {
  const duration = options.duration ?? quarter;
  const out: Note[] = [];
  let at = 0;
  let previous: Note[] = [];
  for (const token of text.trim().split(/\s+/)) {
    if (token === "|") continue;
    if (token === "-") {
      if (!previous.length) throw new Error("A tie must follow a note or chord");
      for (const n of previous) n.duration += duration;
    } else if (token !== ".") {
      const pitches = token.replace(/^\[|\]$/g, "").split(",");
      previous = pitches.map((p) => note(p, at, duration, options.velocity));
      out.push(...previous);
    } else previous = [];
    at += duration;
  }
  return out;
}
export const clip = (value: Clip) => value;
export const track = (id: string, value: Omit<Track, "id">): Track => ({ id, ...value });
export function drumPattern(pattern: string, pitch: number, step = 0.25, velocity = 80): Note[] {
  return [...pattern].flatMap((x, i) =>
    x === "x" || x === "X"
      ? [note(pitch, i * step, Math.min(step, 0.2), x === "X" ? Math.min(127, velocity + 16) : velocity)]
      : [],
  );
}
export function pitchToMidi(pitch: Pitch): number {
  if (typeof pitch === "number") {
    if (Number.isInteger(pitch) && pitch >= 0 && pitch <= 127) return pitch;
    throw new Error(`MIDI pitch out of range: ${pitch}`);
  }
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(pitch);
  if (!m) throw new Error(`Invalid note: ${pitch}`);
  const n =
    (Number(m[3]) + 1) * 12 +
    ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()] ?? 0) +
    (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return pitchToMidi(n);
}
function finite(n: number, name: string, min = 0, max = Infinity) {
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}`);
}
function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function ticksToSeconds(tick: number, tempos: CompiledScore["tempos"], ppq = PPQ): number {
  let seconds = 0;
  for (let i = 0; i < tempos.length; i++) {
    const t = tempos[i];
    if (tick <= t.tick) break;
    seconds += ((Math.min(tick, tempos[i + 1]?.tick ?? tick) - t.tick) * 60) / (t.bpm * ppq);
  }
  return seconds;
}
export function secondsToBeat(seconds: number, score: CompiledScore): number {
  finite(seconds, "seconds");
  let remaining = seconds;
  for (let i = 0; i < score.tempos.length; i++) {
    const t = score.tempos[i];
    const beats = ((score.tempos[i + 1]?.tick ?? Infinity) - t.tick) / score.ppq;
    const duration = (beats * 60) / t.bpm;
    if (remaining <= duration) return t.tick / score.ppq + (remaining * t.bpm) / 60;
    remaining -= duration;
  }
  return 0;
}
export function defineScore(value: Score): Score {
  compileScore(value);
  return value;
}
export function compileScore(score: Score): CompiledScore {
  if (!score || !Array.isArray(score.tracks) || !score.title)
    throw new Error("Score requires a title and tracks");
  const tick = (b: number) => {
    finite(b, "beat");
    return Math.round(b * PPQ);
  };
  const tempos = (typeof score.tempo === "number" ? [{ at: 0, bpm: score.tempo }] : score.tempo)
    .map((t) => {
      finite(t.bpm, "tempo", 1, 1000);
      return { tick: tick(t.at), bpm: t.bpm };
    })
    .sort((a, b) => a.tick - b.tick);
  if (tempos[0]?.tick !== 0 || tempos.some((t, i) => i > 0 && t.tick === tempos[i - 1].tick))
    throw new Error("Tempo map must start at beat zero and have unique positions");
  const meter = score.meter ?? [4, 4];
  const meterList =
    typeof meter[0] === "number"
      ? [{ at: 0, meter: meter as [number, number] }]
      : (meter as { at: number; meter: [number, number] }[]);
  const meters = meterList
    .map((m) => {
      const [n, d] = m.meter;
      if (!Number.isInteger(n) || n < 1 || ![1, 2, 4, 8, 16, 32].includes(d))
        throw new Error("Invalid meter");
      return { tick: tick(m.at), numerator: n, denominator: d };
    })
    .sort((a, b) => a.tick - b.tick);
  if (meters[0]?.tick !== 0 || meters.some((m, i) => i > 0 && m.tick === meters[i - 1].tick))
    throw new Error("Meter map must start at zero and have unique positions");
  const ids = new Set<string>();
  let end = 0,
    channel = 0;
  const solo = score.tracks.some((t) => t.solo);
  const random = rng(score.seed ?? 0);
  const tracks = score.tracks.map((t) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(t.id) || ids.has(t.id))
      throw new Error(`Invalid or duplicate track id: ${t.id}`);
    ids.add(t.id);
    if (!t.instrument) throw new Error(`Missing instrument for ${t.id}`);
    finite(t.gain ?? 1, "gain", 0, 4);
    finite(t.pan ?? 0, "pan", -1, 1);
    finite(t.reverb ?? 0, "reverb", 0, 1);
    finite(t.swing ?? 0, "swing", 0, 1);
    finite(t.drive ?? 1, "drive", 1, 12);
    finite(t.preampDb ?? 0, "preampDb", -24, 48);
    finite(t.humanize?.timing ?? 0, "timing humanize", 0, 0.25);
    finite(t.humanize?.velocity ?? 0, "velocity humanize", 0, 30);
    if (channel === 9) channel++;
    const ch = t.drums ? 9 : channel++;
    finite(t.program ?? 0, "program", 0, 127);
    if (!Number.isInteger(t.program ?? 0)) throw new Error("Program must be integer");
    for (const c of t.controls ?? []) {
      end = Math.max(end, tick(c.at));
      finite(c.cc, "controller", 0, 127);
      finite(c.value, "controller value", 0, 127);
      if (!Number.isInteger(c.cc) || !Number.isInteger(c.value))
        throw new Error("Controller/value must be integer");
    }
    for (const b of t.bends ?? []) {
      end = Math.max(end, tick(b.at));
      finite(b.value, "pitch bend", -1, 1);
    }
    const points = new Set<number>();
    for (const a of t.gainAutomation ?? []) {
      const p = tick(a.at);
      end = Math.max(end, p);
      finite(a.value, "automation gain", 0, 4);
      if (points.has(p)) throw new Error("Duplicate gain automation position");
      points.add(p);
    }
    const notes: CompiledNote[] = [];
    for (const c of t.clips) {
      const length = c.length ?? Math.max(0, ...c.notes.map((n) => n.at + n.duration));
      const repeat = c.repeat ?? 1;
      finite(length, "clip length", 0);
      if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10000) throw new Error("Invalid repeat count");
      end = Math.max(end, tick((c.at ?? 0) + length * repeat));
      for (let r = 0; r < repeat; r++)
        for (const n of c.notes) {
          finite(n.at, "note position");
          finite(n.duration, "note duration", 1 / PPQ);
          finite(n.velocity ?? 80, "velocity", 1, 127);
          const midi = pitchToMidi(pitchToMidi(n.pitch) + (c.transpose ?? 0));
          let at = (c.at ?? 0) + r * length + n.at;
          if (Math.round(at * 2) % 2 === 1) at += (t.swing ?? 0) / 6;
          at = Math.max(0, at + (random() * 2 - 1) * (t.humanize?.timing ?? 0));
          const start = tick(at),
            durationTicks = Math.max(1, tick(n.duration));
          end = Math.max(end, start + durationTicks);
          notes.push({
            tick: start,
            durationTicks,
            midi,
            velocity: Math.round(
              Math.max(
                1,
                Math.min(127, (n.velocity ?? 80) + (random() * 2 - 1) * (t.humanize?.velocity ?? 0)),
              ),
            ),
            seconds: ticksToSeconds(start, tempos),
            durationSeconds: ticksToSeconds(start + durationTicks, tempos) - ticksToSeconds(start, tempos),
          });
        }
    }
    const { clips, ...rest } = t;
    return {
      ...rest,
      channel: ch,
      mute: t.mute || (solo && !t.solo),
      notes: notes.sort((a, b) => a.tick - b.tick || a.midi - b.midi),
    };
  });
  const lengthTicks = score.length === undefined ? end : tick(score.length);
  if (lengthTicks < end) throw new Error("Score length truncates notes or clips");
  finite(score.tail ?? 2, "tail", 0, 30);
  const musicSeconds = ticksToSeconds(lengthTicks, tempos);
  return {
    schema: 1,
    title: score.title,
    ppq: PPQ,
    seed: score.seed ?? 0,
    tempos,
    meters,
    tracks,
    lengthTicks,
    musicSeconds,
    durationSeconds: musicSeconds + (score.tail ?? 2),
    markers: (score.markers ?? []).map((m) => ({
      name: m.name,
      tick: tick(m.at),
      seconds: ticksToSeconds(tick(m.at), tempos),
    })),
  };
}
/** Stable public asset identity; renderer cache additionally hashes engine/samples. */
export function scoreId(score: Score): string {
  const s = JSON.stringify(compileScore(score));
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ s.charCodeAt(i);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}
export const scoreAsset = (score: Score) => `/.clapper-music/${scoreId(score)}.wav`;

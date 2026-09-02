import { useEffect } from "react";
import { getRegistry, type AudioCue, type ToneSpec } from "./registry";
import { useTimeline, useVideoConfig } from "./timeline";

/**
 * Audio is declared like everything else: as React elements positioned on the
 * timeline. Audio components render nothing; they register *cues* which the
 * renderer mixes with ffmpeg and the studio plays back live.
 *
 * A cue's start is the enclosing Sequence's start plus `at` (local frames).
 */

interface CommonAudioProps {
  /** Local frame at which the sound starts. Default 0. */
  at?: number;
  /** Length in frames. Default: until the enclosing sequence ends. */
  durationInFrames?: number;
  /** 0..1 (values above 1 boost). Default 1. */
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** Extra id salt if you place two identical cues at one spot. */
  name?: string;
}

function useCueRange({ at = 0, durationInFrames }: CommonAudioProps) {
  const tl = useTimeline();
  const startFrame = tl.offset + at;
  const endFrame = durationInFrames !== undefined ? startFrame + durationInFrames : tl.offset + tl.durationInFrames;
  return { startFrame, endFrame, path: tl.path };
}

function useRegisterCue(cue: AudioCue) {
  const r = getRegistry();
  // Register synchronously so a single-frame render still captures the cue.
  const prev = r.audio.get(cue.id);
  if (!prev || JSON.stringify(prev) !== JSON.stringify(cue)) r.audio.set(cue.id, cue);
  useEffect(() => {
    getRegistry().audio.set(cue.id, cue);
  });
}

export interface AudioProps extends CommonAudioProps {
  /** URL from staticFile(), an http(s) URL, or an absolute path. */
  src: string;
  /** Seconds to skip into the source file. */
  startFrom?: number;
  playbackRate?: number;
  loop?: boolean;
}

/** A sound file on the timeline. */
export function Audio(props: AudioProps) {
  const { src, startFrom = 0, playbackRate = 1, loop = false, volume = 1, fadeIn = 0, fadeOut = 0, name, at = 0 } = props;
  const { startFrame, endFrame, path } = useCueRange(props);
  useRegisterCue({
    id: `${path.join("/")}|audio|${src}|${at}|${name ?? ""}`,
    kind: "file",
    src,
    startFrame,
    endFrame,
    volume,
    fadeInFrames: fadeIn,
    fadeOutFrames: fadeOut,
    trimStart: startFrom,
    playbackRate,
    loop,
  });
  return null;
}

export interface ToneProps extends CommonAudioProps {
  /** Frequency in Hz (or note name like "C5"). */
  freq: number | string;
  /** Glide target frequency. */
  glide?: number | string;
  wave?: ToneSpec["wave"];
  /** ADSR in seconds. */
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  partials?: [number, number][];
}

/** A synthesized tone: no asset files needed. */
export function Tone(props: ToneProps) {
  const { freq, glide, wave = "sine", attack = 0.005, decay = 0.08, sustain = 0.6, release = 0.2, partials, volume = 0.5, fadeIn = 0, fadeOut = 0, name, at = 0 } = props;
  const { startFrame, endFrame, path } = useCueRange(props);
  const f = noteToHz(freq);
  const g = glide === undefined ? undefined : noteToHz(glide);
  useRegisterCue({
    id: `${path.join("/")}|tone|${f}|${wave}|${at}|${name ?? ""}`,
    kind: "tone",
    startFrame,
    endFrame,
    volume,
    fadeInFrames: fadeIn,
    fadeOutFrames: fadeOut,
    tone: { wave, freq: f, freqEnd: g, attack, decay, sustain, release, partials },
  });
  return null;
}

/** A short arpeggiated chime. `notes` in Hz or note names, `spacing` in frames. */
export function Chime({ notes = ["C5", "E5", "G5"], spacing = 2, length, volume = 0.35, at = 0, wave = "sine", name }: { notes?: (number | string)[]; spacing?: number; length?: number; volume?: number; at?: number; wave?: ToneSpec["wave"]; name?: string }) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.round(fps * 0.6);
  return (
    <>
      {notes.map((n, i) => (
        <Tone key={i} at={at + i * spacing} durationInFrames={len} freq={n} wave={wave} volume={volume} attack={0.004} decay={0.12} sustain={0.35} release={0.35} partials={[[2, 0.18], [3, 0.06]]} name={`${name ?? "chime"}-${i}`} />
      ))}
    </>
  );
}

/** A filtered-noise whoosh. */
export function Whoosh({ at = 0, durationInFrames, volume = 0.25, from = 300, to = 3000, name }: { at?: number; durationInFrames?: number; volume?: number; from?: number; to?: number; name?: string }) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 0.45);
  return <Tone at={at} durationInFrames={len} freq={from} glide={to} wave="noise" attack={0.08} decay={0.15} sustain={0.5} release={0.18} volume={volume} name={name ?? "whoosh"} />;
}

/** A tiny click / tick, e.g. for typewriter effects. */
export function Click({ at = 0, volume = 0.18, freq = 2400, name }: { at?: number; volume?: number; freq?: number; name?: string }) {
  return <Tone at={at} durationInFrames={2} freq={freq} wave="noise" attack={0.001} decay={0.02} sustain={0} release={0.02} volume={volume} name={name ?? "click"} />;
}

/** A sustained low pad chord (bed music without assets). */
export function Pad({ notes = ["C3", "G3", "E4"], at = 0, durationInFrames, volume = 0.08, fadeIn = 30, fadeOut = 30, wave = "triangle", name }: { notes?: (number | string)[]; at?: number; durationInFrames?: number; volume?: number; fadeIn?: number; fadeOut?: number; wave?: ToneSpec["wave"]; name?: string }) {
  return (
    <>
      {notes.map((n, i) => (
        <Tone key={i} at={at} durationInFrames={durationInFrames} freq={n} wave={wave} attack={0.5} decay={0.5} sustain={1} release={0.8} volume={volume} fadeIn={fadeIn} fadeOut={fadeOut} partials={[[2, 0.1], [0.5, 0.25]]} name={`${name ?? "pad"}-${i}`} />
      ))}
    </>
  );
}

/** A sub-bass hit: sine gliding down, fast decay. Great on hard cuts. */
export function Thump({ at = 0, volume = 0.6, from = 140, to = 42, durationInFrames, name }: { at?: number; volume?: number; from?: number; to?: number; durationInFrames?: number; name?: string }) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 0.5);
  return (
    <>
      <Tone at={at} durationInFrames={len} freq={from} glide={to} wave="sine" attack={0.002} decay={0.18} sustain={0.25} release={0.25} volume={volume} name={name ?? "thump"} />
      <Tone at={at} durationInFrames={3} freq={3000} wave="noise" attack={0.001} decay={0.03} sustain={0} release={0.02} volume={volume * 0.25} name={`${name ?? "thump"}-tick`} />
    </>
  );
}

/** A riser: noise + tone sweeping up into a hit at the end. Place so it ENDS on the cut. */
export function Riser({ at = 0, durationInFrames, volume = 0.22, from = 200, to = 2400, name }: { at?: number; durationInFrames?: number; volume?: number; from?: number; to?: number; name?: string }) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 1.2);
  return (
    <>
      <Tone at={at} durationInFrames={len} freq={from} glide={to} wave="noise" attack={len / fps * 0.7} decay={0.05} sustain={1} release={0.08} volume={volume} name={name ?? "riser"} />
      <Tone at={at} durationInFrames={len} freq={from / 2} glide={to / 2} wave="sawtooth" attack={len / fps * 0.8} decay={0.05} sustain={1} release={0.06} volume={volume * 0.25} name={`${name ?? "riser"}-saw`} />
    </>
  );
}

/** A short bright pop with a pitch drop (UI "bloop"). */
export function Pop({ at = 0, volume = 0.3, freq = 900, name }: { at?: number; volume?: number; freq?: number; name?: string }) {
  return <Tone at={at} durationInFrames={5} freq={freq * 1.6} glide={freq} wave="sine" attack={0.002} decay={0.06} sustain={0.2} release={0.05} volume={volume} partials={[[2, 0.15]]} name={name ?? "pop"} />;
}

/**
 * A note sequence: `notes` played every `step` frames (repeating `repeat` times).
 * Use for arpeggios and simple melodic beds.
 */
export function Arp({ notes, at = 0, step = 4, length, repeat = 1, volume = 0.18, wave = "triangle", decay = 0.12, sustain = 0.15, release = 0.2, name }: { notes: (number | string)[]; at?: number; step?: number; length?: number; repeat?: number; volume?: number; wave?: ToneSpec["wave"]; decay?: number; sustain?: number; release?: number; name?: string }) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.max(step, Math.round(fps * 0.35));
  const items: { f: number; n: number | string; i: number }[] = [];
  for (let r = 0; r < repeat; r++) for (let i = 0; i < notes.length; i++) items.push({ f: at + (r * notes.length + i) * step, n: notes[i], i: r * notes.length + i });
  return (
    <>
      {items.map(({ f, n, i }) => (
        <Tone key={i} at={f} durationInFrames={len} freq={n} wave={wave} attack={0.004} decay={decay} sustain={sustain} release={release} volume={volume} partials={[[2, 0.12], [3, 0.04]]} name={`${name ?? "arp"}-${i}`} />
      ))}
    </>
  );
}

/** A two-tone alert. */
export function Alert({ at = 0, volume = 0.25, name }: { at?: number; volume?: number; name?: string }) {
  return (
    <>
      <Tone at={at} durationInFrames={5} freq={880} wave="square" attack={0.002} decay={0.05} sustain={0.5} release={0.05} volume={volume * 0.5} name={`${name ?? "alert"}-a`} />
      <Tone at={at + 6} durationInFrames={7} freq={660} wave="square" attack={0.002} decay={0.05} sustain={0.5} release={0.08} volume={volume * 0.5} name={`${name ?? "alert"}-b`} />
    </>
  );
}

const NOTE_INDEX: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

/** "A4" -> 440. Numbers pass through. */
export function noteToHz(n: number | string): number {
  if (typeof n === "number") return n;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n.trim());
  if (!m) throw new Error(`Bad note name: ${n}`);
  const semis = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12; // C-1 = 0
  return 440 * Math.pow(2, (semis - 69) / 12);
}

export function collectAudioCues(): AudioCue[] {
  return [...getRegistry().audio.values()].sort((a, b) => a.startFrame - b.startFrame);
}

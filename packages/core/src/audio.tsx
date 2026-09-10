import { useEffect, useMemo } from "react";
import { type Frames, resolveFrames } from "./frames";
import { type AudioCue, getRegistry, type ToneSpec, type Wave } from "./registry";
import { typedLength } from "./text";
import { useTimeline, useVideoConfig } from "./timeline";

/**
 * Audio is declared like everything else: as React elements positioned on the
 * timeline. Audio components render nothing; they register *cues* which the
 * renderer mixes with ffmpeg and the studio plays back live.
 *
 * A cue's start is the enclosing Sequence's start plus `at` (local frames).
 */

interface CommonAudioProps {
  /** Local frame (or "1.2s") at which the sound starts. Default 0. */
  at?: Frames;
  /** Length in frames or "0.5s". Default: until the enclosing sequence ends. */
  durationInFrames?: Frames;
  /** Alias of durationInFrames. */
  duration?: Frames;
  /** 0..1 (values above 1 boost). Default 1. */
  volume?: number;
  fadeIn?: Frames;
  fadeOut?: Frames;
  /** Extra id salt if you place two identical cues at one spot. */
  name?: string;
}

function useCueRange({ at = 0, durationInFrames, duration }: CommonAudioProps) {
  const tl = useTimeline();
  const { fps } = useVideoConfig();
  const atF = resolveFrames(at, fps);
  const durF = resolveFrames(durationInFrames ?? duration, fps);
  const startFrame = tl.offset + atF;
  const endFrame = durF !== undefined ? startFrame + durF : tl.offset + tl.durationInFrames;
  return { startFrame, endFrame, path: tl.path, atF, fps };
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
  const {
    src,
    startFrom = 0,
    playbackRate = 1,
    loop = false,
    volume = 1,
    fadeIn = 0,
    fadeOut = 0,
    name,
  } = props;
  const { startFrame, endFrame, path, atF, fps } = useCueRange(props);
  useRegisterCue({
    id: `${path.join("/")}|audio|${src}|${atF}|${name ?? ""}`,
    kind: "file",
    src,
    startFrame,
    endFrame,
    volume,
    fadeInFrames: resolveFrames(fadeIn, fps),
    fadeOutFrames: resolveFrames(fadeOut, fps),
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
  wave?: Wave;
  /** ADSR in seconds. */
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  partials?: [number, number][];
  ring?: number;
  brightness?: number;
  cutoff?: number;
  pan?: number;
  spread?: number;
  reverb?: number;
  lfo?: { rate: number; depth: number };
  detune?: number;
  automation?: ToneSpec["automation"];
}

/** A synthesized tone: no asset files needed. */
export function Tone(props: ToneProps) {
  const {
    freq,
    glide,
    wave = "sine",
    attack = 0.005,
    decay = 0.08,
    sustain = 0.6,
    release = 0.2,
    partials,
    ring,
    brightness,
    cutoff,
    pan,
    spread,
    reverb,
    lfo,
    detune,
    automation,
    volume = 0.5,
    fadeIn = 0,
    fadeOut = 0,
    name,
  } = props;
  const { startFrame, endFrame, path, atF, fps } = useCueRange(props);
  const f = noteToHz(freq);
  const g = glide === undefined ? undefined : noteToHz(glide);
  useRegisterCue({
    id: `${path.join("/")}|tone|${f}|${wave}|${atF}|${name ?? ""}`,
    kind: "tone",
    startFrame,
    endFrame,
    volume,
    fadeInFrames: resolveFrames(fadeIn, fps),
    fadeOutFrames: resolveFrames(fadeOut, fps),
    tone: {
      wave,
      freq: f,
      freqEnd: g,
      attack,
      decay,
      sustain,
      release,
      partials,
      ring,
      brightness,
      cutoff,
      pan,
      spread,
      reverb,
      lfo,
      detune,
      automation,
    },
  });
  return null;
}

/* ------------------------------ instruments ------------------------------ */

/** A plucked string / felt-piano note (Karplus–Strong). */
export function Pluck({
  note,
  at = 0,
  length,
  ring = 1.4,
  brightness = 0.55,
  volume = 0.3,
  pan = 0,
  reverb = 0.3,
  detune = 0,
  name,
}: {
  note: number | string;
  at?: number;
  length?: number;
  ring?: number;
  brightness?: number;
  volume?: number;
  pan?: number;
  reverb?: number;
  detune?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.ceil(ring * fps) + 2;
  return (
    <Tone
      at={at}
      durationInFrames={len}
      freq={note}
      wave="pluck"
      attack={0.001}
      decay={0.01}
      sustain={1}
      release={0.05}
      ring={ring}
      brightness={brightness}
      volume={volume}
      pan={pan}
      reverb={reverb}
      detune={detune}
      name={name ?? "pluck"}
    />
  );
}

/** An electric-piano note (2-op FM). */
export function EPiano({
  note,
  at = 0,
  length,
  ring = 2.2,
  volume = 0.28,
  pan = 0,
  reverb = 0.35,
  spread = 0.3,
  detune = 0,
  name,
}: {
  note: number | string;
  at?: number;
  length?: number;
  ring?: number;
  volume?: number;
  pan?: number;
  reverb?: number;
  spread?: number;
  detune?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.ceil(ring * fps) + 2;
  return (
    <Tone
      at={at}
      durationInFrames={len}
      freq={note}
      wave="epiano"
      attack={0.002}
      decay={0.01}
      sustain={1}
      release={0.08}
      ring={ring}
      volume={volume}
      pan={pan}
      reverb={reverb}
      spread={spread}
      detune={detune}
      name={name ?? "epiano"}
    />
  );
}

/** A dark, rounded acoustic-piano model with a soft hammer and natural modal decay. */
export function FeltPiano({
  note,
  at = 0,
  length,
  ring = 2.4,
  volume = 0.2,
  pan = 0,
  reverb = 0.46,
  spread = 0.12,
  detune = 0,
  name,
}: {
  note: number | string;
  at?: number;
  length?: number;
  ring?: number;
  volume?: number;
  pan?: number;
  reverb?: number;
  spread?: number;
  detune?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.ceil((ring + 0.45) * fps);
  return (
    <Tone
      at={at}
      durationInFrames={len}
      freq={note}
      wave="feltpiano"
      attack={0.009}
      decay={0.12}
      sustain={1}
      release={0.42}
      ring={ring}
      brightness={0.34}
      cutoff={4200}
      volume={volume}
      pan={pan}
      spread={spread}
      reverb={reverb}
      detune={detune}
      name={name ?? "felt-piano"}
    />
  );
}

/** A quiet fingertip/wood desk tap for physical beats, without a noise transient. */
export function DeskTap({
  at = 0,
  volume = 0.16,
  pitch = 150,
  pan = 0,
  name,
}: {
  at?: number;
  volume?: number;
  pitch?: number;
  pan?: number;
  name?: string;
}) {
  const n = name ?? "desk-tap";
  return (
    <>
      <Tone
        at={at}
        durationInFrames={5}
        freq={pitch}
        wave="pluck"
        attack={0.002}
        decay={0.03}
        sustain={0.65}
        release={0.06}
        ring={0.16}
        brightness={0.06}
        cutoff={850}
        volume={volume * 0.72}
        pan={pan}
        reverb={0.08}
        name={`${n}-wood`}
      />
      <Tone
        at={at}
        durationInFrames={6}
        freq={pitch * 0.72}
        glide={pitch * 0.52}
        wave="sine"
        attack={0.003}
        decay={0.09}
        sustain={0}
        release={0.08}
        cutoff={500}
        volume={volume * 0.28}
        pan={pan}
        name={`${n}-body`}
      />
    </>
  );
}

/** Tuned wooden percussion with inharmonic modes and no noise transient. */
export function Mallet({
  note,
  at = 0,
  length,
  ring = 1.25,
  volume = 0.18,
  pan = 0,
  reverb = 0.32,
  spread = 0.08,
  detune = 0,
  name,
}: {
  note: number | string;
  at?: number;
  length?: number;
  ring?: number;
  volume?: number;
  pan?: number;
  reverb?: number;
  spread?: number;
  detune?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.ceil((ring + 0.18) * fps);
  return (
    <Tone
      at={at}
      durationInFrames={len}
      freq={note}
      wave="mallet"
      attack={0.006}
      decay={0.08}
      sustain={1}
      release={0.18}
      ring={ring}
      brightness={0.4}
      cutoff={5200}
      volume={volume}
      pan={pan}
      spread={spread}
      reverb={reverb}
      detune={detune}
      name={name ?? "mallet"}
    />
  );
}

/** Warm bowed-string layer for a sustained bed that does not read as a synth pad. */
export function BowedString({
  note,
  at = 0,
  durationInFrames,
  volume = 0.05,
  attack = 0.8,
  release = 1.2,
  pan = 0,
  spread = 0.14,
  reverb = 0.42,
  name,
}: {
  note: number | string;
  at?: Frames;
  durationInFrames?: Frames;
  volume?: number;
  attack?: number;
  release?: number;
  pan?: number;
  spread?: number;
  reverb?: number;
  name?: string;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={durationInFrames}
      freq={note}
      wave="bowed"
      attack={attack}
      decay={0.4}
      sustain={0.82}
      release={release}
      cutoff={4800}
      lfo={{ rate: 0.17, depth: 0.08 }}
      volume={volume}
      pan={pan}
      spread={spread}
      reverb={reverb}
      name={name ?? "bowed"}
    />
  );
}

/** A chord: several notes at once (optionally strummed by `strum` frames each). */
export function Chord({
  notes,
  at = 0,
  wave = "epiano",
  strum = 0,
  volume = 0.22,
  ring = 2.4,
  reverb = 0.4,
  spread = 0.4,
  width = 0.5,
  name,
}: {
  notes: (number | string)[];
  at?: number;
  wave?: "epiano" | "pluck";
  strum?: number;
  volume?: number;
  ring?: number;
  reverb?: number;
  spread?: number /** stereo width: notes are panned from -width to +width */;
  width?: number;
  name?: string;
}) {
  return (
    <>
      {notes.map((n, i) => {
        const pan = notes.length > 1 ? -width + (2 * width * i) / (notes.length - 1) : 0;
        return wave === "pluck" ? (
          <Pluck
            key={i}
            note={n}
            at={at + i * strum}
            ring={ring}
            volume={volume}
            pan={pan}
            reverb={reverb}
            name={`${name ?? "chord"}-${i}`}
          />
        ) : (
          <EPiano
            key={i}
            note={n}
            at={at + i * strum}
            ring={ring}
            volume={volume}
            pan={pan}
            reverb={reverb}
            spread={spread}
            name={`${name ?? "chord"}-${i}`}
          />
        );
      })}
    </>
  );
}

/**
 * A step sequencer. `steps` is a space-separated pattern: note names or Hz play,
 * "." rests, "-" ties (extends the previous note). `step` is the step length in
 * beats at `bpm`. Velocity accents with "!" (louder) or "?" (softer).
 *   <Pattern bpm={84} step={0.5} steps="D3 . A3 . F4! - E4 ." wave="pluck" repeat={4} />
 */
export function Pattern({
  steps,
  bpm = 90,
  step = 0.5,
  at = 0,
  repeat = 1,
  wave = "pluck",
  volume = 0.26,
  ring,
  brightness,
  reverb = 0.3,
  pan = 0,
  width = 0.35,
  humanize = 0.12,
  swing = 0,
  octave = 0,
  name,
}: {
  steps: string;
  bpm?: number;
  step?: number;
  at?: number;
  repeat?: number;
  wave?: "pluck" | "epiano" | "sine" | "triangle";
  volume?: number;
  ring?: number;
  brightness?: number;
  reverb?: number;
  pan?: number /** random pan spread per note */;
  width?: number /** 0..1 velocity/detune randomness (deterministic) */;
  humanize?: number /** 0..1 delays every other step */;
  swing?: number;
  octave?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const seqLen = useTimeline().durationInFrames;
  const framesPerStep = (60 / bpm) * step * fps;
  const tokens = steps.trim().split(/\s+/);
  const items: { f: number; n: number; vol: number; pan: number; det: number; len: number }[] = [];
  for (let r = 0; r < repeat; r++) {
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === "." || tok === "-") continue;
      const accent = tok.endsWith("!") ? 1.35 : tok.endsWith("?") ? 0.6 : 1;
      const noteTok = tok.replace(/[!?]$/, "");
      const hz = noteToHz(noteTok) * Math.pow(2, octave);
      // tie length: count following "-" tokens
      let ties = 0;
      while (tokens[i + 1 + ties] === "-") ties++;
      const idx = r * tokens.length + i;
      const h = hash(idx * 31 + hz);
      const vol = volume * accent * (1 - humanize * 0.5 + humanize * h);
      const det = (hash(idx * 7 + 3) - 0.5) * 2 * humanize * 12;
      const p = pan + (hash(idx * 13 + 5) - 0.5) * 2 * width;
      const sw = i % 2 === 1 ? swing * framesPerStep * 0.5 : 0;
      const f = at + Math.round(idx * framesPerStep + sw);
      if (f >= seqLen) continue; // patterns stop at the end of their scene
      const len = Math.max(2, Math.round(framesPerStep * (1 + ties)));
      items.push({ f, n: hz, vol, pan: Math.max(-1, Math.min(1, p)), det, len });
    }
  }
  return (
    <>
      {items.map((it, k) => {
        const r = ring ?? Math.max(0.35, (it.len / fps) * 1.6);
        if (wave === "pluck")
          return (
            <Pluck
              key={k}
              note={it.n}
              at={it.f}
              ring={r}
              brightness={brightness}
              volume={it.vol}
              pan={it.pan}
              reverb={reverb}
              detune={it.det}
              name={`${name ?? "pat"}-${k}`}
            />
          );
        if (wave === "epiano")
          return (
            <EPiano
              key={k}
              note={it.n}
              at={it.f}
              ring={r}
              volume={it.vol}
              pan={it.pan}
              reverb={reverb}
              detune={it.det}
              name={`${name ?? "pat"}-${k}`}
            />
          );
        return (
          <Tone
            key={k}
            at={it.f}
            durationInFrames={it.len}
            freq={it.n}
            wave={wave}
            attack={0.01}
            decay={0.1}
            sustain={0.5}
            release={0.15}
            volume={it.vol}
            pan={it.pan}
            reverb={reverb}
            detune={it.det}
            name={`${name ?? "pat"}-${k}`}
          />
        );
      })}
    </>
  );
}

/** A slowly breathing drone: filtered saw/triangle with tremolo and width. Less "synthy" than a bare sine pad. */
export function Drone({
  notes = ["D2", "A2"],
  at = 0,
  durationInFrames,
  volume = 0.05,
  fadeIn = 30,
  fadeOut = 30,
  cutoff = 420,
  lfo = { rate: 0.18, depth: 0.35 },
  spread = 0.6,
  reverb = 0.35,
  wave = "sawtooth",
  automation,
  name,
}: {
  notes?: (number | string)[];
  at?: Frames;
  durationInFrames?: Frames;
  volume?: number;
  fadeIn?: Frames;
  fadeOut?: Frames;
  cutoff?: number;
  lfo?: { rate: number; depth: number };
  spread?: number;
  reverb?: number;
  wave?: Wave;
  automation?: ToneSpec["automation"];
  name?: string;
}) {
  return (
    <>
      {notes.map((n, i) => (
        <Tone
          key={i}
          at={at}
          durationInFrames={durationInFrames}
          freq={n}
          wave={wave}
          attack={0.8}
          decay={0.5}
          sustain={1}
          release={1}
          volume={volume}
          fadeIn={fadeIn}
          fadeOut={fadeOut}
          cutoff={cutoff}
          lfo={{ rate: lfo.rate * (1 + i * 0.13), depth: lfo.depth }}
          spread={spread}
          reverb={reverb}
          pan={(i - (notes.length - 1) / 2) * 0.3}
          automation={automation}
          name={`${name ?? "drone"}-${i}`}
        />
      ))}
    </>
  );
}

/** Very quiet, slowly moving air. `breath` avoids the static quality of a continuous white-noise bed. */
export function RoomTone({
  at = 0,
  durationInFrames,
  volume = 0.012,
  cutoff = 380,
  fadeIn = 30,
  fadeOut = 30,
  name,
}: {
  at?: Frames;
  durationInFrames?: Frames;
  volume?: number;
  cutoff?: number;
  fadeIn?: Frames;
  fadeOut?: Frames;
  name?: string;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={durationInFrames}
      freq={cutoff}
      wave="breath"
      attack={1.2}
      decay={0.4}
      sustain={1}
      release={1.2}
      volume={volume}
      fadeIn={fadeIn}
      fadeOut={fadeOut}
      cutoff={cutoff}
      lfo={{ rate: 0.09, depth: 0.65 }}
      spread={0.7}
      name={name ?? "room"}
    />
  );
}

/**
 * One soft mechanical keystroke: a felt/wood transient and a low "thock"
 * body, with deterministic variation from `seed`.
 */
export function Keystroke({
  at = 0,
  volume = 0.22,
  seed = 0,
  space = false,
  pan = 0,
  name,
}: {
  at?: number;
  volume?: number;
  seed?: number;
  space?: boolean;
  pan?: number;
  name?: string;
}) {
  const h1 = hash(seed * 17 + 1);
  const h2 = hash(seed * 29 + 2);
  const v = volume * (0.8 + 0.4 * h1);
  const body = (space ? 130 : 200) * (0.86 + 0.28 * h2);
  const top = (space ? 520 : 760) * (0.9 + 0.2 * h1);
  const n = name ?? "key";
  return (
    <>
      <Tone
        at={at}
        durationInFrames={3}
        freq={top}
        wave="pluck"
        attack={0.001}
        decay={0.02}
        sustain={0.8}
        release={0.025}
        ring={space ? 0.13 : 0.085}
        brightness={0.18}
        cutoff={1800}
        volume={v * 0.44}
        pan={pan}
        reverb={0.06}
        name={`${n}-felt`}
      />
      <Tone
        at={at}
        durationInFrames={4}
        freq={body}
        glide={body * 0.72}
        wave="sine"
        attack={0.002}
        decay={space ? 0.07 : 0.045}
        sustain={0}
        release={0.025}
        volume={v * (space ? 0.58 : 0.42)}
        partials={[
          [2.1, 0.16],
          [3.8, 0.035],
        ]}
        cutoff={1300}
        pan={pan}
        name={`${n}-body`}
      />
    </>
  );
}

/** Keystrokes synced to a <Typewriter> with the same text/at/cps/duration. */
export function Typing({
  text,
  at = 0,
  cps = 30,
  duration,
  jitter = 0.35,
  every = 1,
  volume = 0.2,
  pan = 0,
  name,
}: {
  text: string;
  at?: number;
  cps?: number;
  duration?: number;
  jitter?: number;
  every?: number;
  volume?: number;
  pan?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const keys = useMemo(() => {
    const total = duration ?? Math.ceil((text.length / cps) * fps);
    const out: { f: number; i: number; space: boolean }[] = [];
    let prev = 0;
    for (let f = at; f <= at + total + 1; f++) {
      const n = typedLength({ text, frame: f, fps, at, cps, duration, jitter });
      if (n > prev) {
        for (let c = prev; c < n; c++) if (c % every === 0) out.push({ f, i: c, space: text[c] === " " });
        prev = n;
      }
    }
    return out;
  }, [text, at, cps, duration, jitter, every, fps]);
  return (
    <>
      {keys.map((k) => (
        <Keystroke
          key={k.i}
          at={k.f}
          seed={k.i + text.length}
          space={k.space}
          volume={volume}
          pan={pan}
          name={`${name ?? "typing"}-${k.i}`}
        />
      ))}
    </>
  );
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A short arpeggiated chime. `notes` in Hz or note names, `spacing` in frames. */
export function Chime({
  notes = ["C5", "E5", "G5"],
  spacing = 2,
  length,
  volume = 0.35,
  at = 0,
  wave = "sine",
  name,
}: {
  notes?: (number | string)[];
  spacing?: number;
  length?: number;
  volume?: number;
  at?: number;
  wave?: ToneSpec["wave"];
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.round(fps * 0.6);
  return (
    <>
      {notes.map((n, i) => (
        <Tone
          key={i}
          at={at + i * spacing}
          durationInFrames={len}
          freq={n}
          wave={wave}
          volume={volume}
          attack={0.004}
          decay={0.12}
          sustain={0.35}
          release={0.35}
          partials={[
            [2, 0.18],
            [3, 0.06],
          ]}
          name={`${name ?? "chime"}-${i}`}
        />
      ))}
    </>
  );
}

/** A filtered-noise whoosh. */
export function Whoosh({
  at = 0,
  durationInFrames,
  volume = 0.25,
  from = 300,
  to = 3000,
  name,
}: {
  at?: number;
  durationInFrames?: number;
  volume?: number;
  from?: number;
  to?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 0.45);
  return (
    <Tone
      at={at}
      durationInFrames={len}
      freq={from}
      glide={to}
      wave="noise"
      attack={0.08}
      decay={0.15}
      sustain={0.5}
      release={0.18}
      volume={volume}
      name={name ?? "whoosh"}
    />
  );
}

/** A tiny felt/wood tick, e.g. for UI and paper movement. */
export function Click({
  at = 0,
  volume = 0.18,
  freq = 2400,
  name,
}: {
  at?: number;
  volume?: number;
  freq?: number;
  name?: string;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={3}
      freq={Math.max(180, freq * 0.42)}
      wave="pluck"
      attack={0.001}
      decay={0.018}
      sustain={0.75}
      release={0.025}
      ring={0.09}
      brightness={0.16}
      cutoff={1900}
      volume={volume * 0.62}
      reverb={0.04}
      name={name ?? "click"}
    />
  );
}

/** A sustained low pad chord (bed music without assets). */
export function Pad({
  notes = ["C3", "G3", "E4"],
  at = 0,
  durationInFrames,
  volume = 0.08,
  fadeIn = 30,
  fadeOut = 30,
  wave = "triangle",
  name,
}: {
  notes?: (number | string)[];
  at?: Frames;
  durationInFrames?: Frames;
  volume?: number;
  fadeIn?: Frames;
  fadeOut?: Frames;
  wave?: ToneSpec["wave"];
  name?: string;
}) {
  return (
    <>
      {notes.map((n, i) => (
        <Tone
          key={i}
          at={at}
          durationInFrames={durationInFrames}
          freq={n}
          wave={wave}
          attack={0.5}
          decay={0.5}
          sustain={1}
          release={0.8}
          volume={volume}
          fadeIn={fadeIn}
          fadeOut={fadeOut}
          partials={[
            [2, 0.1],
            [0.5, 0.25],
          ]}
          name={`${name ?? "pad"}-${i}`}
        />
      ))}
    </>
  );
}

/** A sub-bass hit: sine gliding down, fast decay. Great on hard cuts. */
export function Thump({
  at = 0,
  volume = 0.6,
  from = 140,
  to = 42,
  durationInFrames,
  name,
}: {
  at?: number;
  volume?: number;
  from?: number;
  to?: number;
  durationInFrames?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 0.5);
  return (
    <>
      <Tone
        at={at}
        durationInFrames={len}
        freq={from}
        glide={to}
        wave="sine"
        attack={0.002}
        decay={0.18}
        sustain={0.25}
        release={0.25}
        volume={volume}
        name={name ?? "thump"}
      />
      <Tone
        at={at}
        durationInFrames={3}
        freq={3000}
        wave="noise"
        attack={0.001}
        decay={0.03}
        sustain={0}
        release={0.02}
        volume={volume * 0.25}
        name={`${name ?? "thump"}-tick`}
      />
    </>
  );
}

/** A riser: noise + tone sweeping up into a hit at the end. Place so it ENDS on the cut. */
export function Riser({
  at = 0,
  durationInFrames,
  volume = 0.22,
  from = 200,
  to = 2400,
  name,
}: {
  at?: number;
  durationInFrames?: number;
  volume?: number;
  from?: number;
  to?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = durationInFrames ?? Math.round(fps * 1.2);
  return (
    <>
      <Tone
        at={at}
        durationInFrames={len}
        freq={from}
        glide={to}
        wave="noise"
        attack={(len / fps) * 0.7}
        decay={0.05}
        sustain={1}
        release={0.08}
        volume={volume}
        name={name ?? "riser"}
      />
      <Tone
        at={at}
        durationInFrames={len}
        freq={from / 2}
        glide={to / 2}
        wave="sawtooth"
        attack={(len / fps) * 0.8}
        decay={0.05}
        sustain={1}
        release={0.06}
        volume={volume * 0.25}
        name={`${name ?? "riser"}-saw`}
      />
    </>
  );
}

/** A short bright pop with a pitch drop (UI "bloop"). */
export function Pop({
  at = 0,
  volume = 0.3,
  freq = 900,
  name,
}: {
  at?: number;
  volume?: number;
  freq?: number;
  name?: string;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={5}
      freq={freq * 1.6}
      glide={freq}
      wave="sine"
      attack={0.002}
      decay={0.06}
      sustain={0.2}
      release={0.05}
      volume={volume}
      partials={[[2, 0.15]]}
      name={name ?? "pop"}
    />
  );
}

/**
 * A note sequence: `notes` played every `step` frames (repeating `repeat` times).
 * Use for arpeggios and simple melodic beds.
 */
export function Arp({
  notes,
  at = 0,
  step = 4,
  length,
  repeat = 1,
  volume = 0.18,
  wave = "triangle",
  decay = 0.12,
  sustain = 0.15,
  release = 0.2,
  reverb = 0,
  name,
}: {
  notes: (number | string)[];
  at?: number;
  step?: number;
  length?: number;
  repeat?: number;
  volume?: number;
  wave?: Wave;
  decay?: number;
  sustain?: number;
  release?: number;
  reverb?: number;
  name?: string;
}) {
  const { fps } = useVideoConfig();
  const len = length ?? Math.max(step, Math.round(fps * 0.35));
  const items: { f: number; n: number | string; i: number }[] = [];
  for (let r = 0; r < repeat; r++)
    for (let i = 0; i < notes.length; i++)
      items.push({ f: at + (r * notes.length + i) * step, n: notes[i], i: r * notes.length + i });
  return (
    <>
      {items.map(({ f, n, i }) => (
        <Tone
          key={i}
          at={f}
          durationInFrames={len}
          freq={n}
          wave={wave}
          attack={0.004}
          decay={decay}
          sustain={wave === "pluck" || wave === "epiano" ? 1 : sustain}
          release={release}
          volume={volume}
          partials={
            wave === "pluck" || wave === "epiano"
              ? undefined
              : [
                  [2, 0.12],
                  [3, 0.04],
                ]
          }
          reverb={reverb}
          ring={wave === "pluck" || wave === "epiano" ? Math.max(0.3, (len / fps) * 1.5) : undefined}
          name={`${name ?? "arp"}-${i}`}
        />
      ))}
    </>
  );
}

/** A mellow two-note notification; intentionally musical rather than buzzy. */
export function Alert({ at = 0, volume = 0.25, name }: { at?: number; volume?: number; name?: string }) {
  return (
    <>
      <Tone
        at={at}
        durationInFrames={10}
        freq="E5"
        wave="epiano"
        attack={0.004}
        decay={0.04}
        sustain={0.8}
        release={0.12}
        ring={0.45}
        cutoff={2600}
        volume={volume * 0.34}
        pan={-0.08}
        reverb={0.22}
        name={`${name ?? "alert"}-a`}
      />
      <Tone
        at={at + 5}
        durationInFrames={12}
        freq="C5"
        wave="epiano"
        attack={0.004}
        decay={0.04}
        sustain={0.8}
        release={0.16}
        ring={0.55}
        cutoff={2300}
        volume={volume * 0.3}
        pan={0.08}
        reverb={0.26}
        name={`${name ?? "alert"}-b`}
      />
    </>
  );
}

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

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

/**
 * Scene-level ducking: multiplies the whole mix (tones and files) by `depth`
 * between `at` and the end, with linear attack/release ramps outside that
 * window. Several <Duck>s multiply. Use it to make a "silence" scene actually
 * quiet or to pull the bed under a voice-over.
 */
export function Duck({
  at = 0,
  durationInFrames,
  duration,
  depth = 0.35,
  attack = 6,
  release = 24,
  name,
}: {
  at?: Frames;
  durationInFrames?: Frames;
  duration?: Frames;
  depth?: number;
  attack?: Frames;
  release?: Frames;
  name?: string;
}) {
  const { startFrame, endFrame, path, atF } = useCueRange({ at, durationInFrames, duration });
  const { fps } = useVideoConfig();
  const a = resolveFrames(attack, fps);
  const r = resolveFrames(release, fps);
  const hold = endFrame - startFrame;
  useRegisterCue({
    id: `${path.join("/")}|duck|${atF}|${name ?? ""}`,
    kind: "bus",
    startFrame: startFrame - a,
    endFrame: endFrame + r,
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    automation: {
      volume: [
        [0, 1],
        [a, depth],
        [a + hold, depth],
        [a + hold + r, 1],
      ],
    },
  });
  return null;
}

/** Filtered-noise pad that swells like breathing: a bed that is texture, not a chord. */
export function Breath({
  at = 0,
  durationInFrames,
  duration,
  volume = 0.05,
  cutoff = 700,
  rate = 0.14,
  depth = 0.4,
  spread = 0.8,
  reverb = 0.5,
  fadeIn = 30,
  fadeOut = 30,
  pan = 0,
  name,
}: {
  at?: Frames;
  durationInFrames?: Frames;
  duration?: Frames;
  volume?: number /** Centre of the filter sweep in Hz. */;
  cutoff?: number /** Breaths per second. */;
  rate?: number;
  depth?: number;
  spread?: number;
  reverb?: number;
  fadeIn?: Frames;
  fadeOut?: Frames;
  pan?: number;
  name?: string;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={durationInFrames ?? duration}
      freq={cutoff}
      wave="breath"
      attack={1.5}
      decay={1}
      sustain={1}
      release={2}
      volume={volume}
      cutoff={cutoff}
      lfo={{ rate, depth }}
      spread={spread}
      reverb={reverb}
      fadeIn={fadeIn}
      fadeOut={fadeOut}
      pan={pan}
      name={name ?? "breath"}
    />
  );
}

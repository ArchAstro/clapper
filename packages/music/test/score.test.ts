import MidiModule from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import {
  chord,
  compileScore,
  defineScore,
  note,
  phrase,
  type Score,
  secondsToBeat,
  ticksToSeconds,
} from "../src/index.js";
import { exportMidi, importMidi } from "../src/midi.js";

const sample = (): Score => ({
  title: "test",
  tempo: [
    { at: 0, bpm: 120 },
    { at: 4, bpm: 60 },
  ],
  meter: [3, 4],
  tail: 2,
  tracks: [
    {
      id: "piano",
      instrument: "vsupright1",
      clips: [{ notes: [note("C4", 3, 2, 80)] }],
      controls: [
        { at: 2, cc: 64, value: 127 },
        { at: 6, cc: 64, value: 0 },
      ],
      bends: [{ at: 4, value: 0.2 }],
    },
  ],
});
describe("musical clock", () => {
  it("integrates note durations across tempo changes without frame quantization", () => {
    const c = compileScore(sample());
    expect(c.tracks[0].notes[0].seconds).toBe(1.5);
    expect(c.tracks[0].notes[0].durationSeconds).toBe(1.5);
    expect(secondsToBeat(3, c)).toBe(5);
    expect(ticksToSeconds(6 * c.ppq, c.tempos)).toBe(4);
  });
  it("retains subframe timing", () => {
    const s = sample();
    s.tracks[0].clips = [{ notes: [note("C4", 1 / 960, 1 / 960)] }];
    expect(compileScore(s).tracks[0].notes[0].seconds).toBeCloseTo(1 / 1920);
  });
  it("is reproducible with seeded expression", () => {
    const s = sample();
    s.seed = 31;
    s.tracks[0].humanize = { timing: 0.015, velocity: 8 };
    expect(compileScore(s)).toEqual(compileScore(s));
    expect(compileScore({ ...s, seed: 32 }).tracks[0].notes).not.toEqual(compileScore(s).tracks[0].notes);
  });
  it("preserves musical events through MIDI", () => {
    const c = compileScore(sample()),
      read = importMidi(exportMidi(c)),
      r = compileScore(read.score);
    expect(r.tempos).toEqual(c.tempos);
    expect(r.meters).toEqual(c.meters);
    expect(r.tracks[0].notes).toEqual(c.tracks[0].notes);
    expect(r.tracks[0].controls).toEqual(c.tracks[0].controls);
    expect(r.tracks[0].bends![0].value).toBeCloseTo(0.2, 3);
    expect(read.warnings.length).toBeGreaterThan(0);
  });
  it("imports standard defaults before late tempo and meter changes", () => {
    const m = new MidiModule.Midi(exportMidi(compileScore(sample())));
    m.header.tempos = [{ ticks: 3840, bpm: 90 }];
    m.header.timeSignatures = [{ ticks: 3840, timeSignature: [3, 4] }];
    m.header.update();
    const c = compileScore(importMidi(m.toArray()).score);
    expect(c.tempos[0]).toEqual({ tick: 0, bpm: 120 });
    expect(c.meters[0]).toEqual({ tick: 0, numerator: 4, denominator: 4 });
  });
  it("allows large internal scores but rejects unrepresentable single-port MIDI", () => {
    const s = sample();
    s.tracks = Array.from({ length: 20 }, (_, i) => ({ ...s.tracks[0], id: `t${i}` }));
    const c = compileScore(s);
    expect(c.tracks).toHaveLength(20);
    expect(() => exportMidi(c)).toThrow("MIDI port");
    expect(exportMidi(c, "t19").length).toBeGreaterThan(20);
  });
});
describe("DSL validation", () => {
  it("expands phrases, ties, chords and transposition", () => {
    expect(phrase("C4 - . E4", { duration: 0.5 })).toEqual([note("C4", 0, 1), note("E4", 1.5, 0.5)]);
    expect(chord(["C4", "E4"], { at: 2, duration: 1, strum: 0.1 })[1].at).toBe(2.1);
  });
  it("ties a whole chord and rejects ties across rests", () => {
    expect(phrase("[C4,E4,G4] -").map((n) => n.duration)).toEqual([2, 2, 2]);
    expect(() => phrase("C4 . -")).toThrow("tie");
  });
  it.each([0, NaN, -10])("rejects invalid tempo %s", (tempo) =>
    expect(() => defineScore({ ...sample(), tempo })).toThrow(),
  );
  it("rejects truncation, bad pitches and duplicate tracks", () => {
    expect(() => defineScore({ ...sample(), length: 1 })).toThrow("truncates");
    const s = sample();
    s.tracks[0].clips = [{ notes: [note("H4", 0, 1)] }];
    expect(() => defineScore(s)).toThrow("Invalid note");
    const s2 = sample();
    s2.tracks.push(s2.tracks[0]);
    expect(() => defineScore(s2)).toThrow("duplicate track");
  });
  it("includes late sustain release in score extent", () =>
    expect(compileScore(sample()).lengthTicks).toBe(6 * 960));
  it("validates instrument drive without changing a clean score", () => {
    const s = sample();
    s.tracks[0].drive = 5.5;
    expect(compileScore(s).tracks[0].drive).toBe(5.5);
    s.tracks[0].drive = 20;
    expect(() => compileScore(s)).toThrow("drive");
  });
});

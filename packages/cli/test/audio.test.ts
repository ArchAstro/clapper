import { describe, expect, it } from "vitest";
import { renderToneSamples, renderToneStereo, renderToneTrack } from "../src/ffmpeg.ts";
import type { AudioCue } from "@agenticvids/core";

const tone = (over: Partial<AudioCue> = {}): AudioCue => ({
  id: "t",
  kind: "tone",
  startFrame: 0,
  endFrame: 30,
  volume: 0.5,
  fadeInFrames: 0,
  fadeOutFrames: 0,
  tone: { wave: "sine", freq: 440, attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.1 },
  ...over,
});

describe("tone synthesis", () => {
  it("produces a bounded signal of the right length", () => {
    const s = renderToneSamples(tone(), 1, 8000);
    expect(s.length).toBe(8000);
    let max = 0;
    for (const v of s) max = Math.max(max, Math.abs(v));
    expect(max).toBeGreaterThan(0.2);
    expect(max).toBeLessThanOrEqual(1);
    expect(Math.abs(s[s.length - 1])).toBeLessThan(0.02); // released
  });
  it("noise wave is non-periodic and non-silent", () => {
    const s = renderToneSamples(tone({ tone: { wave: "noise", freq: 2000, attack: 0, decay: 0, sustain: 1, release: 0 } }), 0.1, 8000);
    const energy = s.reduce((a, v) => a + v * v, 0) / s.length;
    expect(energy).toBeGreaterThan(0.0001);
  });
  it("track places cues at their start frame and applies volume", () => {
    const cues = [tone({ id: "a", startFrame: 30, endFrame: 45, volume: 0.25 })];
    const [track, right] = renderToneTrack(cues, 30, 90, 8000);
    expect(track.length).toBe(24000);
    expect(right.length).toBe(24000);
    const before = track.slice(0, 7900).some((v) => v !== 0);
    const during = track.slice(8000, 12000).some((v) => v !== 0);
    expect(before).toBe(false);
    expect(during).toBe(true);
  });
  it("track never clips", () => {
    const cues = Array.from({ length: 20 }, (_, i) => tone({ id: `c${i}`, volume: 2 }));
    const [l, r] = renderToneTrack(cues, 30, 30, 8000);
    let max = 0;
    for (const v of l) max = Math.max(max, Math.abs(v));
    for (const v of r) max = Math.max(max, Math.abs(v));
    expect(max).toBeLessThanOrEqual(0.981);
  });
  it("pluck and epiano ring down and pan", () => {
    const pluck = tone({ id: "p", endFrame: 60, tone: { wave: "pluck", freq: 220, attack: 0.001, decay: 0.01, sustain: 1, release: 0.05, ring: 0.8, pan: -1 } });
    const [l, r] = renderToneStereo(pluck, 2, 8000);
    const rms = (a: Float32Array, from: number, to: number) => Math.sqrt(a.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
    expect(rms(l, 0, 800)).toBeGreaterThan(rms(l, 8000, 8800) * 3); // decays
    expect(rms(r, 0, 800)).toBeLessThan(0.01); // hard-left pan
    const ep = tone({ id: "e", endFrame: 60, tone: { wave: "epiano", freq: 330, attack: 0.002, decay: 0.01, sustain: 1, release: 0.05, ring: 1.5, reverb: 0.5 } });
    const [el] = renderToneStereo(ep, 2, 8000);
    expect(rms(el, 0, 800)).toBeGreaterThan(0.05);
  });
});

import { busGainAt, busGainExpr } from "../src/ffmpeg.ts";

function rmsOf(a: Float32Array, from: number, to: number) {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

it("bus (duck) cues scale the tone track and produce a volume expression", () => {
  const fps = 30, sr = 8000;
  const tone: AudioCue = { id: "t", kind: "tone", startFrame: 0, endFrame: 90, volume: 0.5, fadeInFrames: 0, fadeOutFrames: 0, tone: { wave: "sine", freq: 220, attack: 0, decay: 0, sustain: 1, release: 0 } };
  const duck: AudioCue = { id: "d", kind: "bus", startFrame: 30, endFrame: 66, volume: 1, fadeInFrames: 0, fadeOutFrames: 0, automation: { volume: [[0, 1], [6, 0.25], [30, 0.25], [36, 1]] } };
  expect(busGainAt([duck], 10)).toBe(1);
  expect(busGainAt([duck], 45)).toBeCloseTo(0.25, 5);
  expect(busGainAt([duck, duck], 45)).toBeCloseTo(0.0625, 5);
  const [L] = renderToneTrack([tone], fps, 90, sr, [duck]);
  const loud = rmsOf(L, 0, sr * 0.9);
  const quiet = rmsOf(L, sr * 1.3, sr * 1.9);
  expect(quiet / loud).toBeCloseTo(0.25, 1);
  const expr = busGainExpr([duck], fps);
  expect(expr).toMatch(/^if\(lt\(t,1\.0000\),1\.0000,/);
  expect(expr).toContain("0.2500");
});

it("breath wave renders a non-silent, band-limited swell", () => {
  const cue: AudioCue = { id: "b", kind: "tone", startFrame: 0, endFrame: 60, volume: 0.3, fadeInFrames: 0, fadeOutFrames: 0, tone: { wave: "breath", freq: 700, attack: 0.05, decay: 0, sustain: 1, release: 0.05, cutoff: 700, lfo: { rate: 1, depth: 0.6 } } };
  const [L, R] = renderToneStereo(cue, 2, 8000, 30);
  expect(rmsOf(L, 0, L.length)).toBeGreaterThan(0.005);
  expect(rmsOf(R, 0, R.length)).toBeGreaterThan(0.005);
  // one breath per second at rate 1: the trough at t≈0 is quieter than the peak at t≈0.5 s
  expect(rmsOf(L, 3600, 4400)).toBeGreaterThan(rmsOf(L, 200, 1000) * 1.2);
});

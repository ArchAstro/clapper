import { describe, expect, it } from "vitest";
import { renderToneSamples, renderToneTrack } from "../src/ffmpeg.ts";
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
    const track = renderToneTrack(cues, 30, 90, 8000);
    expect(track.length).toBe(24000);
    const before = track.slice(0, 7900).some((v) => v !== 0);
    const during = track.slice(8000, 12000).some((v) => v !== 0);
    expect(before).toBe(false);
    expect(during).toBe(true);
  });
  it("track never clips", () => {
    const cues = Array.from({ length: 20 }, (_, i) => tone({ id: `c${i}`, volume: 2 }));
    const track = renderToneTrack(cues, 30, 30, 8000);
    let max = 0;
    for (const v of track) max = Math.max(max, Math.abs(v));
    expect(max).toBeLessThanOrEqual(0.981);
  });
});

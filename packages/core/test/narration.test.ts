import { describe, expect, it } from "vitest";
import { compileNarration, defineNarration, narrationAsset } from "../src/narration";

const script = () =>
  defineNarration({
    title: "Story",
    narrators: { host: { voice: "af_heart" } },
    cues: [
      { id: "intro", narrator: "host", text: "Hello.", at: 0, duration: 3 },
      { id: "end", narrator: "host", text: "Goodbye.", at: 5, duration: 3 },
    ],
  });
describe("narration domain", () => {
  it("shares a single normalized narrator across scene cues", () => {
    const compiled = compileNarration(script());
    expect(compiled.narrators.host).toEqual({ voice: "af_heart", speed: 1 });
    expect(compiled.durationSeconds).toBe(8);
  });
  it("rejects unknown narrators, duplicate ids, overlap and invalid windows", () => {
    const unknown = script();
    unknown.cues[1].narrator = "missing";
    expect(() => compileNarration(unknown)).toThrow("Unknown narrator");
    const duplicate = script();
    duplicate.cues[1].id = "intro";
    expect(() => compileNarration(duplicate)).toThrow("duplicate");
    const overlap = script();
    overlap.cues[1].at = 2;
    expect(() => compileNarration(overlap)).toThrow("overlap");
    for (const duration of [NaN, Infinity, 0, -1]) {
      const invalid = script();
      invalid.cues[0].duration = duration;
      expect(() => compileNarration(invalid)).toThrow("timing");
    }
  });
  it("rejects cue-level voice or speed overrides even from JSON", () => {
    const value = script();
    Object.assign(value.cues[0], { voice: "am_michael" });
    expect(() => compileNarration(value)).toThrow("voices and delivery belong to narrators");
  });
  it("invalidates assets when text, timing or the cast changes", () => {
    const original = narrationAsset(script());
    const text = script();
    text.cues[0].text = "Different text";
    const cast = script();
    cast.narrators.host.voice = "am_michael";
    const timing = script();
    timing.cues[1].at = 6;
    for (const value of [text, cast, timing]) expect(narrationAsset(value)).not.toBe(original);
    const equivalent = script();
    equivalent.narrators.host = { voice: "af_heart", speed: 1 };
    expect(narrationAsset(equivalent)).toBe(original);
  });
});

import { describe, expect, it } from "vitest";
import { Easing, interpolate, progress, spring, springSettleFrames, stagger } from "../src/interpolate";
import { evalKeyframes, toStyle } from "../src/animate";
import { evalCamera, cameraTransform } from "../src/camera";
import { typedLength } from "../src/text";
import { createRandom, noise1d, random } from "../src/random";
import { noteToHz } from "../src/audio";

describe("interpolate", () => {
  it("maps linearly and clamps by default", () => {
    expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
    expect(interpolate(-5, [0, 10], [0, 100])).toBe(0);
    expect(interpolate(15, [0, 10], [0, 100])).toBe(100);
  });
  it("extends when asked", () => {
    expect(interpolate(15, [0, 10], [0, 100], { extrapolateRight: "extend" })).toBe(150);
  });
  it("supports multi-stop ranges", () => {
    expect(interpolate(15, [0, 10, 20], [0, 100, 0])).toBe(50);
  });
  it("applies easing per segment", () => {
    const mid = interpolate(5, [0, 10], [0, 1], { easing: Easing.outExpo });
    expect(mid).toBeGreaterThan(0.8);
    expect(interpolate(0, [0, 10], [0, 1], { easing: Easing.outExpo })).toBe(0);
    expect(interpolate(10, [0, 10], [0, 1], { easing: Easing.outExpo })).toBe(1);
  });
  it("easing endpoints are exact", () => {
    for (const e of [Easing.ease, Easing.in, Easing.out, Easing.inOut, Easing.outBack, Easing.outElastic, Easing.outBounce]) {
      expect(e(0)).toBeCloseTo(0, 6);
      expect(e(1)).toBeCloseTo(1, 6);
    }
  });
});

describe("progress / stagger", () => {
  it("progress is 0 before, 1 after", () => {
    expect(progress(0, 10, 20)).toBe(0);
    expect(progress(20, 10, 20)).toBe(0.5);
    expect(progress(40, 10, 20)).toBe(1);
  });
  it("stagger from center", () => {
    expect(stagger(2, 3, { from: "center", total: 5 })).toBe(0);
    expect(stagger(0, 3, { from: "center", total: 5 })).toBe(6);
  });
});

describe("spring", () => {
  it("starts at from and settles at to", () => {
    expect(spring({ frame: 0, fps: 30 })).toBe(0);
    expect(spring({ frame: 300, fps: 30 })).toBeCloseTo(1, 3);
  });
  it("is deterministic", () => {
    const a = spring({ frame: 7, fps: 30, config: { stiffness: 180, damping: 12 } });
    const b = spring({ frame: 7, fps: 30, config: { stiffness: 180, damping: 12 } });
    expect(a).toBe(b);
  });
  it("respects delay and durationInFrames", () => {
    expect(spring({ frame: 5, fps: 30, delay: 10 })).toBe(0);
    const settle = springSettleFrames({ fps: 30 });
    expect(settle).toBeGreaterThan(5);
    const v = spring({ frame: 20, fps: 30, durationInFrames: 20, config: { stiffness: 170, damping: 26 } });
    expect(v).toBeCloseTo(1, 2);
  });
  it("overshoots with low damping", () => {
    const vals = Array.from({ length: 60 }, (_, f) => spring({ frame: f, fps: 60, config: { stiffness: 180, damping: 6 } }));
    expect(Math.max(...vals)).toBeGreaterThan(1.05);
  });
});

describe("keyframes", () => {
  const kf = [
    { frame: 0, opacity: 0, x: 0 },
    { frame: 10, opacity: 1, easing: Easing.linear },
    { frame: 20, x: 100, easing: Easing.linear },
  ];
  it("interpolates each prop independently across its own stops", () => {
    expect(evalKeyframes(kf, 5)).toEqual({ opacity: 0.5, x: 25 });
    expect(evalKeyframes(kf, 15)).toEqual({ opacity: 1, x: 75 });
    expect(evalKeyframes(kf, 99)).toEqual({ opacity: 1, x: 100 });
  });
  it("builds transform/filter strings", () => {
    const s = toStyle({ x: 10, y: 5, scale: 2, rotate: 45, blur: 3, opacity: 0.5 });
    expect(s.transform).toBe("translateX(10px) translateY(5px) scale(2) rotate(45deg)");
    expect(s.filter).toBe("blur(3px)");
    expect(s.opacity).toBe(0.5);
  });
});

describe("camera", () => {
  it("defaults to center at zoom 1", () => {
    expect(evalCamera([], 0, 1920, 1080)).toEqual({ x: 960, y: 540, zoom: 1, rotate: 0 });
  });
  it("inherits unspecified values from the previous keyframe", () => {
    const kf = [{ frame: 0, zoom: 1 }, { frame: 10, x: 100, y: 50, zoom: 2 }, { frame: 20, zoom: 1 }];
    expect(evalCamera(kf, 20, 1920, 1080)).toEqual({ x: 100, y: 50, zoom: 1, rotate: 0 });
    const mid = evalCamera(kf, 5, 1920, 1080);
    expect(mid.zoom).toBeGreaterThan(1);
    expect(mid.zoom).toBeLessThan(2);
  });
  it("transform keeps the point of interest centered", () => {
    expect(cameraTransform({ x: 100, y: 50, zoom: 2, rotate: 0 }, 1920, 1080)).toBe("translate(960px, 540px) rotate(0deg) scale(2) translate(-100px, -50px)");
  });
});

describe("typewriter", () => {
  it("types nothing before `at` and everything after the duration", () => {
    expect(typedLength({ text: "hello world", frame: 0, fps: 30, at: 10, cps: 10 })).toBe(0);
    expect(typedLength({ text: "hello world", frame: 100, fps: 30, at: 10, cps: 10 })).toBe(11);
  });
  it("is monotonic", () => {
    let prev = 0;
    for (let f = 0; f < 80; f++) {
      const n = typedLength({ text: "the quick brown fox.", frame: f, fps: 30, at: 5, cps: 20 });
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});

describe("random / notes", () => {
  it("random is deterministic per seed", () => {
    expect(random("a")).toBe(random("a"));
    expect(random("a")).not.toBe(random("b"));
    const r = createRandom(42);
    const v = r();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
  it("noise is continuous", () => {
    expect(Math.abs(noise1d(1.5) - noise1d(1.501))).toBeLessThan(0.01);
  });
  it("note names map to Hz", () => {
    expect(noteToHz("A4")).toBeCloseTo(440);
    expect(noteToHz("C5")).toBeCloseTo(523.25, 1);
    expect(noteToHz(100)).toBe(100);
  });
});

import { resolveFrames } from "../src/frames";
import { defineScenes } from "../src/scenes";
import { ik2 } from "../src/rig";

it("resolveFrames: frames pass through, seconds and ms round to frames", () => {
  expect(resolveFrames(12, 30)).toBe(12);
  expect(resolveFrames("1.2s", 30)).toBe(36);
  expect(resolveFrames("500ms", 30)).toBe(15);
  expect(resolveFrames("-0.5s", 24)).toBe(-12);
  expect(resolveFrames(undefined, 30)).toBeUndefined();
  expect(() => resolveFrames("abc" as never, 30)).toThrow(/Bad time/);
});

it("defineScenes: hard cuts add up, transitions overlap, lookups agree", () => {
  const plan = defineScenes({ open: { seconds: 2 }, plan: { frames: 45 }, end: { seconds: 1, transition: { type: "fade", duration: "0.5s" } } }, { fps: 30 });
  expect(plan.names).toEqual(["open", "plan", "end"]);
  expect(plan.start("plan")).toBe(60);
  expect(plan.start("end")).toBe(60 + 45 - 15);
  expect(plan.total).toBe(60 + 45 - 15 + 30);
  expect(plan.cuts()).toEqual([60, 90]);
  expect(plan.local("plan", 72)).toBe(12);
  expect(plan.at(95)?.name).toBe("end"); // overlap: the incoming scene wins
  expect(plan.at(5)?.name).toBe("open");
  expect(() => plan.start("nope" as never)).toThrow(/Unknown scene/);
  expect(() => defineScenes({ a: {} }, { fps: 30 })).toThrow(/needs seconds or frames/);
});

it("ik2: reachable target keeps the segment lengths; elbow bends outward", () => {
  const [ex, ey] = ik2(46, -150, 104, -16, 82, 78, 1);
  expect(Math.hypot(ex - 46, ey + 150)).toBeCloseTo(82, 5);
  expect(Math.hypot(104 - ex, -16 - ey)).toBeCloseTo(78, 5);
  expect(ex).toBeGreaterThan(46);
  const [lx] = ik2(-46, -150, -104, -16, 82, 78, -1);
  expect(lx).toBeLessThan(-46);
});

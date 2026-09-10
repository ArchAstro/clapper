/**
 * Pure numeric helpers. All animation in clapper is a function of frame,
 * so these are the atoms every tween is built from.
 */
export type EasingFn = (t: number) => number;

const bezier = (x1: number, y1: number, x2: number, y2: number): EasingFn => {
  // Cubic bezier easing, same semantics as CSS cubic-bezier().
  const A = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const B = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const C = (a1: number) => 3 * a1;
  const calc = (t: number, a1: number, a2: number) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const slope = (t: number, a1: number, a2: number) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
};

export const Easing = {
  linear: ((t) => t) as EasingFn,
  ease: bezier(0.25, 0.1, 0.25, 1),
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0, 0, 0.58, 1),
  inOut: bezier(0.42, 0, 0.58, 1),
  /** The landing page's own ease: cubic-bezier(0.23, 1, 0.32, 1) */
  outExpo: bezier(0.23, 1, 0.32, 1),
  outQuint: bezier(0.22, 1, 0.36, 1),
  outCubic: bezier(0.33, 1, 0.68, 1),
  inCubic: bezier(0.32, 0, 0.67, 0),
  inOutCubic: bezier(0.65, 0, 0.35, 1),
  inOutQuint: bezier(0.83, 0, 0.17, 1),
  outBack: bezier(0.34, 1.56, 0.64, 1),
  inBack: bezier(0.36, 0, 0.66, -0.56),
  inOutBack: bezier(0.68, -0.6, 0.32, 1.6),
  outElastic: ((t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }) as EasingFn,
  outBounce: ((t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }) as EasingFn,
  bezier,
  /** Step function with n steps. */
  steps:
    (n: number): EasingFn =>
    (t) =>
      Math.min(1, Math.floor(t * n) / n),
};

export type Extrapolate = "clamp" | "extend" | "identity";

export interface InterpolateOptions {
  easing?: EasingFn;
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
}

/**
 * Map `input` from an input range to an output range with easing per segment.
 * `interpolate(frame, [0, 30], [0, 1], { easing: Easing.outExpo })`
 */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error("interpolate: inputRange and outputRange must have the same length");
  }
  if (inputRange.length < 2) throw new Error("interpolate: ranges need at least 2 stops");
  const { easing = Easing.linear, extrapolateLeft = "clamp", extrapolateRight = "clamp" } = options;
  const first = inputRange[0];
  const last = inputRange[inputRange.length - 1];

  if (input < first) {
    if (extrapolateLeft === "clamp") return outputRange[0];
    if (extrapolateLeft === "identity") return input;
  }
  if (input > last) {
    if (extrapolateRight === "clamp") return outputRange[outputRange.length - 1];
    if (extrapolateRight === "identity") return input;
  }
  let i = 0;
  while (i < inputRange.length - 2 && input >= inputRange[i + 1]) i++;
  const inA = inputRange[i];
  const inB = inputRange[i + 1];
  const outA = outputRange[i];
  const outB = outputRange[i + 1];
  if (inB === inA) return outB;
  let t = (input - inA) / (inB - inA);
  if (t >= 0 && t <= 1) t = easing(t);
  return outA + (outB - outA) * t;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = lerp;

/** Progress 0..1 of `frame` through [start, start+duration), eased. Clamped. */
export function progress(
  frame: number,
  start: number,
  duration: number,
  easing: EasingFn = Easing.linear,
): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return easing(clamp((frame - start) / duration, 0, 1));
}

/* ---------------------------------- spring --------------------------------- */

export interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
  /** Initial velocity in units/second */
  velocity?: number;
  /** Stop the simulation when displacement+velocity are below this. */
  restThreshold?: number;
}

export const SpringPresets = {
  default: { mass: 1, stiffness: 100, damping: 10 },
  gentle: { mass: 1, stiffness: 120, damping: 14 },
  wobbly: { mass: 1, stiffness: 180, damping: 12 },
  stiff: { mass: 1, stiffness: 210, damping: 20 },
  slow: { mass: 1, stiffness: 280, damping: 60 },
  snappy: { mass: 1, stiffness: 400, damping: 30 },
  /** Critically damped, no overshoot. */
  smooth: { mass: 1, stiffness: 170, damping: 26 },
} satisfies Record<string, SpringConfig>;

/**
 * Deterministic damped spring evaluated at a frame. Returns a value from
 * `from` to `to`; overshoot is possible with low damping.
 * Simulated with fixed substeps so results are identical for every render.
 */
export function spring({
  frame,
  fps,
  from = 0,
  to = 1,
  config = SpringPresets.default,
  delay = 0,
  durationInFrames,
}: {
  frame: number;
  fps: number;
  from?: number;
  to?: number;
  config?: SpringConfig;
  delay?: number;
  /** If given, time-stretches the spring so it settles by this many frames. */
  durationInFrames?: number;
}): number {
  const f = frame - delay;
  if (f <= 0) return from;
  const { mass = 1, stiffness = 100, damping = 10, velocity: v0 = 0 } = config;
  let scale = 1;
  if (durationInFrames && durationInFrames > 0) {
    const natural = springSettleFrames({ fps, config });
    scale = natural / durationInFrames;
  }
  const t = (f / fps) * scale;
  const dt = 1 / 240; // 240Hz substeps
  const steps = Math.ceil(t / dt);
  let x = 0; // displacement from target, normalized (starts at -1)
  let v = v0;
  x = -1;
  const h = t / steps;
  for (let i = 0; i < steps; i++) {
    const a = (-stiffness * x - damping * v) / mass;
    v += a * h;
    x += v * h;
  }
  return from + (to - from) * (1 + x);
}

/** Frames until a spring with this config is within 0.5% of rest. Cached. */
const settleCache = new Map<string, number>();
export function springSettleFrames({
  fps,
  config = SpringPresets.default,
}: {
  fps: number;
  config?: SpringConfig;
}): number {
  const key = `${fps}:${config.mass ?? 1}:${config.stiffness ?? 100}:${config.damping ?? 10}:${config.velocity ?? 0}`;
  const cached = settleCache.get(key);
  if (cached !== undefined) return cached;
  const { mass = 1, stiffness = 100, damping = 10, velocity: v0 = 0 } = config;
  const dt = 1 / 240;
  let x = -1;
  let v = v0;
  let t = 0;
  let quiet = 0;
  while (t < 20) {
    const a = (-stiffness * x - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    if (Math.abs(x) < 0.005 && Math.abs(v) < 0.05) {
      quiet += dt;
      if (quiet > 0.05) break;
    } else quiet = 0;
  }
  const frames = Math.max(1, Math.ceil(t * fps));
  settleCache.set(key, frames);
  return frames;
}

/* ------------------------------- helpers ---------------------------------- */

/** Stagger helper: delay for item i of n, in frames. */
export function stagger(
  index: number,
  each: number,
  opts: { from?: "start" | "end" | "center"; total?: number } = {},
): number {
  const { from = "start", total } = opts;
  if (from === "start" || total === undefined) return index * each;
  if (from === "end") return (total - 1 - index) * each;
  const mid = (total - 1) / 2;
  return Math.abs(index - mid) * each;
}

/** Smoothly map a value through [a,b] -> [0,1] with smoothstep. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Triangle wave 0..1..0 over [start, end]: useful for pulses. */
export function pulse(frame: number, start: number, end: number, easing: EasingFn = Easing.inOut): number {
  if (frame <= start || frame >= end) return 0;
  const t = (frame - start) / (end - start);
  return easing(t < 0.5 ? t * 2 : (1 - t) * 2);
}

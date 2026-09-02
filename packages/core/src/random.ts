import { useMemo } from "react";
import { useTimeline } from "./timeline";

/** mulberry32: a tiny deterministic PRNG. */
export function createRandom(seed: number | string): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A single deterministic number in [0,1) for this seed. */
export function random(seed: number | string): number {
  return createRandom(seed)();
}

/** Stable random values for a component; same seed => same numbers across frames and renders. */
export function useRandom(seed: number | string, count = 1): number[] {
  const { path } = useTimeline();
  return useMemo(() => {
    const r = createRandom(`${path.join("/")}:${seed}`);
    return Array.from({ length: count }, () => r());
  }, [seed, count, path]);
}

/** 1D value noise in [-1,1], smooth in x. */
export function noise1d(x: number, seed: number | string = 0): number {
  const s = typeof seed === "number" ? seed : hashString(seed);
  const i0 = Math.floor(x);
  const i1 = i0 + 1;
  const t = x - i0;
  const f = t * t * (3 - 2 * t);
  const g = (i: number) => random(i * 7919 + s) * 2 - 1;
  return g(i0) * (1 - f) + g(i1) * f;
}

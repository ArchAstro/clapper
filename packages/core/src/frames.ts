/**
 * Timing values. Frames are the canonical unit; anywhere a component takes a
 * frame count you may also pass "1.2s" or "300ms".
 */
export type Frames = number | `${number}s` | `${number}ms`;

export function resolveFrames(value: Frames, fps: number): number;
export function resolveFrames(value: Frames | undefined, fps: number): number | undefined;
export function resolveFrames(value: Frames | undefined, fps: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  const m = /^(-?\d*\.?\d+)\s*(s|ms)$/.exec(value.trim());
  if (!m) throw new Error(`Bad time "${value}": use frames, "1.2s" or "300ms"`);
  const n = parseFloat(m[1]);
  return Math.round(m[2] === "s" ? n * fps : (n / 1000) * fps);
}

/** Seconds → frames without rounding (for math). */
export const secondsToFrames = (seconds: number, fps: number) => seconds * fps;

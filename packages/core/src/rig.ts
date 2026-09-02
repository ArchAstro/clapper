import { useMemo } from "react";
import { Easing, type EasingFn } from "./interpolate";
import { evalKeyframes } from "./animate";
import { useFps, useFrame } from "./timeline";
import { resolveFrames, type Frames } from "./frames";

/**
 * Character rig helpers. A pose is a flat record of numeric channels; scenes
 * list keys that name poses, and the same keyframe evaluator used for CSS
 * tweens blends them per frame.
 */

/** Declare a typed set of named poses. */
export function definePoses<P extends Record<keyof P, number>, N extends string>(poses: Record<N, P>): Record<N, P> {
  return poses;
}

export interface PoseKey<P extends Record<keyof P, number>, N extends string> {
  /** Frames or "1.2s" (local). */
  at: Frames;
  /** A named pose, or an inline pose (usually `{ ...POSES.x, channel: value }`). */
  pose: N | P;
  ease?: EasingFn | "linear" | "outBack" | "inOutCubic" | "outExpo" | "outQuint";
  /**
   * Lift in pixels for an automatic midpoint on the arc channels (hand targets):
   * travel between poses curves instead of moving in a straight line.
   */
  arc?: number;
}

const EASES: Record<string, EasingFn> = { linear: Easing.linear, outBack: Easing.outBack, inOutCubic: Easing.inOutCubic, outExpo: Easing.outExpo, outQuint: Easing.outQuint };

export interface PoseOptions<P> {
  /** [x, y] channel pairs that get a lifted midpoint when a key sets `arc`. */
  arcChannels?: [keyof P & string, keyof P & string][];
  offset?: Frames;
}

/** Pure pose blend at a local frame (what usePose returns). */
export function evalPose<P extends Record<keyof P, number>, N extends string>(poses: Record<N, P>, keys: PoseKey<P, N>[], frame: number, fps: number, options: PoseOptions<P> = {}): P {
  const resolved = keys.map((k) => ({
    frame: resolveFrames(k.at, fps),
    pose: (typeof k.pose === "string" ? poses[k.pose as N] : k.pose) as unknown as Record<string, number>,
    easing: typeof k.ease === "string" ? EASES[k.ease] : k.ease ?? Easing.inOutCubic,
    arc: k.arc ?? 0,
  }));
  const kf: any[] = [];
  resolved.forEach((k, i) => {
    if (k.arc && i > 0) {
      const prev = resolved[i - 1];
      const mid: Record<string, number> = {};
      for (const ch of Object.keys(k.pose)) mid[ch] = (prev.pose[ch] + k.pose[ch]) / 2;
      for (const [, yCh] of options.arcChannels ?? []) if (yCh in mid) mid[yCh] -= k.arc;
      kf.push({ frame: Math.round((prev.frame + k.frame) / 2), easing: Easing.inOutCubic, ...mid });
    }
    kf.push({ frame: k.frame, easing: k.easing, ...k.pose });
  });
  return evalKeyframes(kf, frame - resolveFrames(options.offset ?? 0, fps), fps) as unknown as P;
}

/** Blend pose keys at the local frame (see evalPose). */
export function usePose<P extends Record<keyof P, number>, N extends string>(poses: Record<N, P>, keys: PoseKey<P, N>[], options: PoseOptions<P> = {}): P {
  const frame = useFrame();
  const fps = useFps();
  return useMemo(() => evalPose(poses, keys, frame, fps, options), [poses, keys, frame, fps, options.arcChannels, options.offset]);
}

/** Two-bone IK: returns the elbow for shoulder (sx,sy) reaching target (tx,ty); the elbow bends outward from centre (side ±1). */
export function ik2(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number, side: 1 | -1): [number, number] {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 2;
  const min = Math.abs(l1 - l2) + 2;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  } else if (d < min) {
    if (d === 0) {
      dx = min * side;
      dy = 0;
    } else {
      dx *= min / d;
      dy *= min / d;
    }
    d = min;
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx);
  const c1: [number, number] = [sx + Math.cos(base + a) * l1, sy + Math.sin(base + a) * l1];
  const c2: [number, number] = [sx + Math.cos(base - a) * l1, sy + Math.sin(base - a) * l1];
  if (c1[0] * side > c2[0] * side + 0.01) return c1;
  if (c2[0] * side > c1[0] * side + 0.01) return c2;
  return c1[1] > c2[1] ? c1 : c2;
}

/** Deterministic blink amount 0..1 (1 = closed) with a period in frames. */
export function useEyeBlink({ period = 92, length = 5, offset = 37 }: { period?: number; length?: number; offset?: number } = {}): number {
  const frame = useFrame();
  const t = (frame + offset) % period;
  return t < length ? 1 - Math.abs(t - length / 2.5) / (length / 2) : 0;
}

/** Slow breathing oscillation in pixels. */
export function useBreath(amplitude = 1.6, periodFrames = 88): number {
  const frame = useFrame();
  return Math.sin((frame / periodFrames) * Math.PI * 2) * amplitude;
}

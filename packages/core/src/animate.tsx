import { type CSSProperties, type ReactNode, useMemo } from "react";
import { type Frames, resolveFrames } from "./frames";
import {
  Easing,
  type EasingFn,
  interpolate,
  progress,
  type SpringConfig,
  SpringPresets,
  spring,
} from "./interpolate";
import { useFps, useFrame } from "./timeline";

/* ------------------------------- useProgress ------------------------------- */

/** Eased 0..1 progress for a window [start, start+duration) of local frames. */
export function useProgress(start: Frames, duration: Frames, easing: EasingFn = Easing.outExpo): number {
  const frame = useFrame();
  const fps = useFps();
  return progress(frame, resolveFrames(start, fps), resolveFrames(duration, fps), easing);
}

/** Deterministic spring driven by the local frame. */
export function useSpring(
  opts: {
    delay?: number;
    from?: number;
    to?: number;
    config?: SpringConfig | keyof typeof SpringPresets;
    durationInFrames?: number;
  } = {},
): number {
  const frame = useFrame();
  const fps = useFps();
  const config = typeof opts.config === "string" ? SpringPresets[opts.config] : opts.config;
  return spring({ frame, fps, ...opts, config });
}

/* ------------------------------- keyframes --------------------------------- */

export type StyleValue = number | string;
export interface Keyframe {
  frame: Frames;
  easing?: EasingFn;
  /** Any numeric CSS-ish props: opacity, x, y, scale, rotate, blur, plus arbitrary numbers. */
  [prop: string]: StyleValue | EasingFn | undefined;
}

/**
 * Evaluate a keyframe list at a frame. Numeric props are interpolated with the
 * easing of the *target* keyframe. Non-numeric props snap.
 */
export function evalKeyframes(frames: Keyframe[], frame: number, fps = 30): Record<string, StyleValue> {
  const out: Record<string, StyleValue> = {};
  if (frames.length === 0) return out;
  type Resolved = Keyframe & { frame: number };
  const sorted: Resolved[] = frames
    .map((k) => ({ ...k, frame: resolveFrames(k.frame, fps) }) as Resolved)
    .sort((a, b) => a.frame - b.frame);
  const props = new Set<string>();
  for (const k of sorted) for (const p of Object.keys(k)) if (p !== "frame" && p !== "easing") props.add(p);
  for (const p of props) {
    const stops = sorted.filter((k) => k[p] !== undefined);
    if (stops.length === 0) continue;
    if (frame <= stops[0].frame) {
      out[p] = stops[0][p] as StyleValue;
      continue;
    }
    if (frame >= stops[stops.length - 1].frame) {
      out[p] = stops[stops.length - 1][p] as StyleValue;
      continue;
    }
    let i = 0;
    while (i < stops.length - 2 && frame >= stops[i + 1].frame) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const va = a[p] as StyleValue;
    const vb = b[p] as StyleValue;
    if (typeof va === "number" && typeof vb === "number") {
      const ease: EasingFn = b.easing ?? Easing.outExpo;
      out[p] = interpolate(frame, [a.frame, b.frame], [va, vb], { easing: ease });
    } else {
      out[p] = va;
    }
  }
  return out;
}

const TRANSFORM_KEYS = [
  "x",
  "y",
  "z",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "skewX",
  "skewY",
] as const;
const FILTER_KEYS = ["blur", "brightness", "contrast", "saturate", "grayscale"] as const;

/** Convert evaluated keyframe values into a CSS style object. */
export function toStyle(values: Record<string, StyleValue>): CSSProperties {
  const style: Record<string, StyleValue> = {};
  const transforms: string[] = [];
  const filters: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if ((TRANSFORM_KEYS as readonly string[]).includes(k)) {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      switch (k) {
        case "x":
          transforms.push(`translateX(${num}px)`);
          break;
        case "y":
          transforms.push(`translateY(${num}px)`);
          break;
        case "z":
          transforms.push(`translateZ(${num}px)`);
          break;
        case "scale":
        case "scaleX":
        case "scaleY":
          transforms.push(`${k}(${num})`);
          break;
        default:
          transforms.push(`${k}(${num}deg)`);
      }
    } else if ((FILTER_KEYS as readonly string[]).includes(k)) {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      filters.push(k === "blur" ? `blur(${num}px)` : `${k}(${num})`);
    } else {
      style[k] = v;
    }
  }
  if (transforms.length) style.transform = transforms.join(" ");
  if (filters.length) style.filter = filters.join(" ");
  return style as CSSProperties;
}

/** Hook: evaluate keyframes at the local frame and return a style object. */
export function useKeyframes(frames: Keyframe[], offset: Frames = 0): CSSProperties {
  const frame = useFrame();
  const fps = useFps();
  return useMemo(
    () => toStyle(evalKeyframes(frames, frame - resolveFrames(offset, fps), fps)),
    [frames, frame, offset, fps],
  );
}

/* -------------------------------- <Animate> -------------------------------- */

export interface AnimateProps {
  /** Keyframes in local frames. */
  keyframes?: Keyframe[];
  /** Shorthand: animate from these values … */
  from?: Record<string, StyleValue>;
  /** … to these values (default: identity: opacity 1, x/y 0, scale 1) */
  to?: Record<string, StyleValue>;
  /** Frame (or "0.4s") at which the from→to tween starts (local). */
  at?: Frames;
  /** Duration of the from→to tween: frames or "0.8s". */
  duration?: Frames;
  easing?: EasingFn;
  /** Use a spring instead of easing for the from→to tween. */
  spring?: SpringConfig | keyof typeof SpringPresets;
  /** Exit animation: values to tween *to* starting at `exitAt`. */
  exit?: Record<string, StyleValue>;
  exitAt?: Frames;
  exitDuration?: Frames;
  exitEasing?: EasingFn;
  as?: keyof React.JSX.IntrinsicElements;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  /** Unmount before `at` (default false). */
  mountAtStart?: boolean;
}

/**
 * Declarative tween wrapper.
 *   <Animate from={{ opacity: 0, y: 24 }} at={10} duration={20}>…</Animate>
 *   <Animate keyframes={[{frame:0, scale:0.8},{frame:20, scale:1, easing:Easing.outBack}]}>…</Animate>
 */
export function Animate({
  keyframes,
  from,
  to,
  at: atProp = 0,
  duration: durProp = 20,
  easing = Easing.outExpo,
  spring: springCfg,
  exit,
  exitAt: exitAtProp,
  exitDuration: exitDurProp = 15,
  exitEasing = Easing.inCubic,
  as: Tag = "div",
  style,
  className,
  children,
  mountAtStart = false,
}: AnimateProps) {
  const frame = useFrame();
  const fps = useFps();
  const at = resolveFrames(atProp, fps);
  const duration = resolveFrames(durProp, fps);
  const exitAt = resolveFrames(exitAtProp, fps);
  const exitDuration = resolveFrames(exitDurProp, fps);
  const computed = useMemo(() => {
    let values: Record<string, StyleValue> = {};
    if (keyframes) values = evalKeyframes(keyframes, frame, fps);
    if (from) {
      const target: Record<string, StyleValue> = { ...identityFor(from), ...(to ?? {}) };
      let t: number;
      if (springCfg) {
        const cfg = typeof springCfg === "string" ? SpringPresets[springCfg] : springCfg;
        t = spring({ frame, fps, delay: at, config: cfg, durationInFrames: duration });
      } else t = progress(frame, at, duration, easing);
      for (const k of Object.keys(target)) {
        const a = from[k];
        const b = target[k];
        values[k] = typeof a === "number" && typeof b === "number" ? a + (b - a) * t : t < 1 ? a : b;
      }
    }
    if (exit && exitAt !== undefined && frame >= exitAt) {
      const t = progress(frame, exitAt, exitDuration, exitEasing);
      for (const [k, b] of Object.entries(exit)) {
        const a = values[k] ?? identityFor({ [k]: b })[k];
        values[k] = typeof a === "number" && typeof b === "number" ? a + (b - a) * t : t >= 1 ? b : a;
      }
    }
    return toStyle(values);
  }, [
    keyframes,
    from,
    to,
    at,
    duration,
    easing,
    springCfg,
    exit,
    exitAt,
    exitDuration,
    exitEasing,
    frame,
    fps,
  ]);

  if (mountAtStart && frame < at) return null;
  const Comp = Tag as any;
  const merged: CSSProperties = { ...style, ...computed };
  if (style?.transform && computed.transform) merged.transform = `${style.transform} ${computed.transform}`;
  return (
    <Comp className={className} style={merged}>
      {children}
    </Comp>
  );
}

function identityFor(from: Record<string, StyleValue>): Record<string, StyleValue> {
  const out: Record<string, StyleValue> = {};
  for (const k of Object.keys(from)) {
    if (
      k === "opacity" ||
      k === "scale" ||
      k === "scaleX" ||
      k === "scaleY" ||
      k === "brightness" ||
      k === "contrast" ||
      k === "saturate"
    )
      out[k] = 1;
    else if (typeof from[k] === "number") out[k] = 0;
    else out[k] = from[k];
  }
  return out;
}

/* -------------------------------- <Stagger> -------------------------------- */

/**
 * Wraps each child in an <Animate> with an increasing delay.
 * <Stagger each={4} from={{opacity:0, y:16}}>{items.map(...)}</Stagger>
 */
export function Stagger({
  children,
  each = 4,
  at = 0,
  duration = 18,
  from = { opacity: 0, y: 16 },
  to,
  easing,
  spring: springCfg,
  as,
  itemStyle,
  itemClassName,
}: {
  children: ReactNode;
  each?: Frames;
  at?: Frames;
  duration?: Frames;
  from?: Record<string, StyleValue>;
  to?: Record<string, StyleValue>;
  easing?: EasingFn;
  spring?: AnimateProps["spring"];
  as?: AnimateProps["as"];
  itemStyle?: CSSProperties;
  itemClassName?: string;
}) {
  const items = (Array.isArray(children) ? children : [children]).flat();
  const fps = useFps();
  const atF = resolveFrames(at, fps);
  const eachF = resolveFrames(each, fps);
  return (
    <>
      {items.map((child, i) => (
        <Animate
          key={i}
          from={from}
          to={to}
          at={atF + i * eachF}
          duration={duration}
          easing={easing}
          spring={springCfg}
          as={as}
          style={itemStyle}
          className={itemClassName}
        >
          {child}
        </Animate>
      ))}
    </>
  );
}

import {
  type CSSProperties,
  type ReactNode,
  type SVGProps,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animate, type StyleValue } from "./animate";
import { Easing, type EasingFn, interpolate, progress } from "./interpolate";
import { useFps, useFrame } from "./timeline";

/* ------------------------------- Typewriter -------------------------------- */

export interface TypewriterProps {
  text: string;
  /** Local frame to start typing. */
  at?: number;
  /** Characters per second (ignored if `duration` given). */
  cps?: number;
  /** Total frames to type the whole string. */
  duration?: number;
  /** Show a blinking caret. */
  cursor?: boolean | ReactNode;
  /** Keep the caret after typing finishes (default true). */
  cursorAfter?: boolean;
  style?: CSSProperties;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  /** Per-frame jitter so typing feels human (0 = metronomic). */
  jitter?: number;
}

/** Deterministic typewriter. Use `typedLength()` to sync sounds. */
export function Typewriter({
  text,
  at = 0,
  cps = 30,
  duration,
  cursor = true,
  cursorAfter = true,
  style,
  className,
  as: Tag = "span",
  jitter = 0.35,
}: TypewriterProps) {
  const frame = useFrame();
  const fps = useFps();
  const n = typedLength({ text, frame, fps, at, cps, duration, jitter });
  const done = n >= text.length;
  const showCursor = cursor && (!done || cursorAfter) && Math.floor(((frame - at) / fps) * 2.2) % 2 === 0;
  const Comp = Tag as any;
  return (
    <Comp className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      {cursor && (
        <span
          aria-hidden
          style={{
            opacity: showCursor ? 1 : 0,
            display: "inline-block",
            width: "0.55em",
            marginLeft: "0.08em",
            borderBottom: "0.12em solid currentColor",
            verticalAlign: "-0.04em",
            height: "0.9em",
          }}
        >
          {typeof cursor === "boolean" ? null : cursor}
        </span>
      )}
    </Comp>
  );
}

/** How many characters of `text` are typed at `frame`. Pure. */
export function typedLength({
  text,
  frame,
  fps,
  at = 0,
  cps = 30,
  duration,
  jitter = 0.35,
}: {
  text: string;
  frame: number;
  fps: number;
  at?: number;
  cps?: number;
  duration?: number;
  jitter?: number;
}): number {
  const total = duration ?? Math.ceil((text.length / cps) * fps);
  if (frame < at) return 0;
  if (frame >= at + total) return text.length;
  // Per-character timing with deterministic jitter, normalised to `total`.
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    const h = Math.sin(i * 12.9898 + text.charCodeAt(i) * 78.233) * 43758.5453;
    const r = h - Math.floor(h);
    const w = 1 + (r - 0.5) * 2 * jitter + (text[i] === " " ? 0.5 : 0) + (".,!?".includes(text[i]) ? 1.5 : 0);
    weights.push(w);
    sum += w;
  }
  const elapsed = ((frame - at) / total) * sum;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (acc > elapsed) return i;
  }
  return text.length;
}

/* -------------------------------- SplitText -------------------------------- */

export interface SplitTextProps {
  text: string;
  by?: "word" | "char" | "line";
  at?: number;
  /** Frames between each unit. */
  each?: number;
  duration?: number;
  from?: Record<string, StyleValue>;
  to?: Record<string, StyleValue>;
  easing?: EasingFn;
  spring?: any;
  style?: CSSProperties;
  className?: string;
  unitStyle?: CSSProperties;
  /** Exit animation applied to all units starting at exitAt (local frame). */
  exit?: Record<string, StyleValue>;
  exitAt?: number;
  exitDuration?: number;
}

/** Splits text into words/chars/lines and staggers an animation across them. */
export function SplitText({
  text,
  by = "word",
  at = 0,
  each = 3,
  duration = 18,
  from = { opacity: 0, y: 18 },
  to,
  easing = Easing.outExpo,
  spring,
  style,
  className,
  unitStyle,
  exit,
  exitAt,
  exitDuration,
}: SplitTextProps) {
  const units = useMemo(() => {
    if (by === "line") return text.split("\n");
    if (by === "char") return [...text];
    return text.split(/(\s+)/).filter((s) => s.length > 0);
  }, [text, by]);
  return (
    <span className={className} style={{ display: "inline-block", ...style }}>
      {units.map((u, i) => {
        const isSpace = /^\s+$/.test(u);
        if (isSpace && by === "word") return u.includes("\n") ? <br key={i} /> : <span key={i}>{u}</span>;
        return (
          <Animate
            key={i}
            as="span"
            from={from}
            to={to}
            at={at + i * each}
            duration={duration}
            easing={easing}
            spring={spring}
            exit={exit}
            exitAt={exitAt}
            exitDuration={exitDuration}
            style={{ display: "inline-block", whiteSpace: "pre", ...unitStyle }}
          >
            {u}
            {by === "line" && i < units.length - 1 ? <br /> : null}
          </Animate>
        );
      })}
    </span>
  );
}

/* --------------------------------- Counter --------------------------------- */

export function Counter({
  from = 0,
  to,
  at = 0,
  duration = 30,
  easing = Easing.outExpo,
  format,
  decimals = 0,
  style,
  className,
}: {
  from?: number;
  to: number;
  at?: number;
  duration?: number;
  easing?: EasingFn;
  format?: (n: number) => string;
  decimals?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const frame = useFrame();
  const v = interpolate(frame, [at, at + duration], [from, to], { easing });
  const text = format ? format(v) : v.toFixed(decimals);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {text}
    </span>
  );
}

/* ---------------------------------- Draw ----------------------------------- */

/**
 * Wrap SVG content; every path/line/polyline/circle/rect/ellipse inside is
 * drawn on with a stroke-dashoffset reveal, staggered by `each` frames.
 */
export function Draw({
  at = 0,
  duration = 30,
  each = 0,
  easing = Easing.inOutCubic,
  children,
  ...rest
}: {
  at?: number;
  duration?: number;
  each?: number;
  easing?: EasingFn;
  children: ReactNode;
} & SVGProps<SVGGElement>) {
  const ref = useRef<SVGGElement>(null);
  const frame = useFrame();
  const [lengths, setLengths] = useState<number[]>([]);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const shapes = g.querySelectorAll<SVGGeometryElement>("path,line,polyline,polygon,circle,rect,ellipse");
    const ls = [...shapes].map((s) => (typeof s.getTotalLength === "function" ? s.getTotalLength() : 0));
    setLengths((prev) =>
      prev.length === ls.length && prev.every((v, i) => Math.abs(v - ls[i]) < 0.01) ? prev : ls,
    );
  }, [children]);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const shapes = g.querySelectorAll<SVGGeometryElement>("path,line,polyline,polygon,circle,rect,ellipse");
    shapes.forEach((s, i) => {
      const len = lengths[i] ?? 0;
      const p = progress(frame, at + i * each, duration, easing);
      if (len <= 0) return;
      s.style.strokeDasharray = `${len}`;
      s.style.strokeDashoffset = `${len * (1 - p)}`;
    });
  }, [frame, lengths, at, each, duration, easing]);
  return (
    <g ref={ref} {...rest}>
      {children}
    </g>
  );
}

/* ---------------------------------- Blink ---------------------------------- */

/** Deterministic on/off blink (e.g. a status dot). Returns 0..1 opacity. */
export function useBlink(period = 1, duty = 0.5): number {
  const frame = useFrame();
  const fps = useFps();
  const t = ((frame / fps) % period) / period;
  return t < duty ? 1 : 0;
}

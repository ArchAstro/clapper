import type { CSSProperties, ReactNode } from "react";
import { Easing, progress, type EasingFn } from "./interpolate";
import { useFps, useFrame } from "./timeline";
import { resolveFrames, type Frames } from "./frames";

/**
 * Text and layout primitives every spot needs. They carry `data-copy` /
 * `data-eyebrow` attributes so `clapper review --lint` can check safe
 * margins and overlaps on the real DOM.
 */

/** Masked line reveal: the child slides up from under an invisible mask. One per line of type. */
export function Reveal({ at = 0, duration = 26, delay = 0, from = "bottom", skew = 0, easing = Easing.outQuint, exitAt, exitDuration = 16, children, style, as: Tag = "div", className }: { at?: Frames; duration?: Frames; delay?: Frames; from?: "bottom" | "top" | "left" | "right"; skew?: number; easing?: EasingFn; exitAt?: Frames; exitDuration?: Frames; children: ReactNode; style?: CSSProperties; as?: "div" | "span" | "h1" | "h2" | "p"; className?: string }) {
  const frame = useFrame();
  const fps = useFps();
  const atF = resolveFrames(at, fps) + resolveFrames(delay, fps);
  const p = progress(frame, atF, resolveFrames(duration, fps), easing);
  const exitAtF = resolveFrames(exitAt, fps);
  const out = exitAtF !== undefined && frame >= exitAtF ? progress(frame, exitAtF, resolveFrames(exitDuration, fps), Easing.inCubic) : 0;
  const axis = from === "bottom" || from === "top" ? "Y" : "X";
  const sign = from === "bottom" || from === "right" ? 1 : -1;
  const offset = (1 - p) * 110 * sign - out * 110 * sign;
  const Comp = Tag as any;
  return (
    <Comp className={className} data-copy="" style={{ overflow: "hidden", display: Tag === "span" ? "inline-block" : "block", verticalAlign: "bottom", padding: "0.08em 0.06em", margin: "-0.08em -0.06em", ...style }}>
      <span style={{ display: "block", transform: `translate${axis}(${offset}%) skewY(${skew * (1 - p)}deg)`, transformOrigin: "left bottom", willChange: "transform" }}>{children}</span>
    </Comp>
  );
}

/** A rule that draws itself. */
export function Rule({ at = 0, duration = 30, length = "100%", thickness = 2, color = "currentColor", vertical = false, easing = Easing.outExpo, style }: { at?: Frames; duration?: Frames; length?: number | string; thickness?: number; color?: string; vertical?: boolean; easing?: EasingFn; style?: CSSProperties }) {
  const frame = useFrame();
  const fps = useFps();
  const p = progress(frame, resolveFrames(at, fps), resolveFrames(duration, fps), easing);
  return <div style={{ width: vertical ? thickness : length, height: vertical ? length : thickness, background: color, transform: vertical ? `scaleY(${p})` : `scaleX(${p})`, transformOrigin: vertical ? "top" : "left", ...style }} />;
}

/** Tracked-out small caps label. */
export function Eyebrow({ children, color, style, mono = true, size = 20 }: { children: ReactNode; color?: string; style?: CSSProperties; mono?: boolean; size?: number }) {
  return (
    <div data-eyebrow="" className={mono ? "mono" : undefined} style={{ fontSize: size, letterSpacing: "0.22em", textTransform: "uppercase", color, fontWeight: 500, ...style }}>
      {children}
    </div>
  );
}

export interface CopyProps {
  children: ReactNode;
  at?: Frames;
  duration?: Frames;
  exitAt?: Frames;
  /** Position in composition pixels. Defaults to the lower-left safe area. */
  x?: number;
  y?: number;
  /** Anchor the box to its right edge at `x`. */
  align?: "left" | "right" | "center";
  size?: number;
  color?: string;
  /** Dark backing plate for copy over busy frames. */
  plate?: string | boolean;
  className?: string;
  style?: CSSProperties;
  z?: number;
  as?: "div" | "h1" | "h2" | "p";
  easing?: EasingFn;
}

/** Positioned display copy with an optional plate; one line per element. */
export function Copy({ children, at = 0, duration = 26, exitAt, x = 120, y = 820, align = "left", size = 56, color, plate = false, className = "display", style, z, as = "div", easing }: CopyProps) {
  const plateBg = plate === true ? "rgba(0,0,0,0.6)" : plate || undefined;
  const pos: CSSProperties = align === "right" ? { right: x } : align === "center" ? { left: x, transform: "translateX(-50%)" } : { left: x };
  return (
    <Reveal at={at} duration={duration} exitAt={exitAt} easing={easing} as={as} className={className} style={{ position: "absolute", top: y, fontSize: size, color, zIndex: z, ...pos, ...style }}>
      {plateBg ? <span style={{ display: "inline-block", padding: "6px 20px", background: plateBg, borderRadius: 10 }}>{children}</span> : children}
    </Reveal>
  );
}

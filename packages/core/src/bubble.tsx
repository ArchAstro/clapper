import type { CSSProperties, ReactNode } from "react";
import { type Frames, resolveFrames } from "./frames";
import { Easing, progress } from "./interpolate";
import { useFps, useFrame } from "./timeline";

/**
 * Speech / thought bubble for character scenes. Pops in from its tail with an
 * overshoot, holds, and shrinks away at `exitAt`. Position is the tail tip.
 */
export interface BubbleProps {
  x: number;
  y: number;
  kind?: "speech" | "thought";
  /** Which way the tail points from the bubble body. */
  tail?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  at?: Frames;
  duration?: Frames;
  exitAt?: Frames;
  exitDuration?: Frames;
  width?: number;
  background?: string;
  color?: string;
  border?: string;
  fontSize?: number;
  padding?: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  z?: number;
  children: ReactNode;
}

export function Bubble({
  x,
  y,
  kind = "speech",
  tail = "bottom-left",
  at = 0,
  duration = 14,
  exitAt,
  exitDuration = 10,
  width = 260,
  background = "#f4f1e8",
  color = "#1a1a1a",
  border,
  fontSize = 22,
  padding = "14px 18px",
  radius = 18,
  className,
  style,
  z,
  children,
}: BubbleProps) {
  const frame = useFrame();
  const fps = useFps();
  const pIn = progress(frame, resolveFrames(at, fps), resolveFrames(duration, fps), Easing.outBack);
  const exitF = resolveFrames(exitAt, fps);
  const pOut =
    exitF !== undefined ? progress(frame, exitF, resolveFrames(exitDuration, fps), Easing.inCubic) : 0;
  if (pIn <= 0 || pOut >= 1) return null;
  const scale = pIn * (1 - 0.25 * pOut);
  const opacity = Math.min(1, pIn * 1.5) * (1 - pOut);
  const left = tail.endsWith("left");
  const bottom = tail.startsWith("bottom");
  const gap = kind === "thought" ? 44 : 22;
  // body sits diagonally away from the tail tip
  const bodyStyle: CSSProperties = {
    position: "absolute",
    width,
    boxSizing: "border-box",
    background,
    color,
    border: border ?? `2px solid ${color}`,
    borderRadius: kind === "thought" ? 32 : radius,
    padding,
    fontSize,
    lineHeight: 1.25,
    [left ? "left" : "right"]: 0,
    [bottom ? "bottom" : "top"]: gap,
  };
  return (
    <div
      className={className}
      data-copy=""
      style={{
        position: "absolute",
        left: left ? x : undefined,
        right: left ? undefined : `calc(100% - ${x}px)`,
        top: bottom ? undefined : y,
        bottom: bottom ? `calc(100% - ${y}px)` : undefined,
        zIndex: z,
        transform: `scale(${scale})`,
        transformOrigin: `${left ? "left" : "right"} ${bottom ? "bottom" : "top"}`,
        opacity,
        ...style,
      }}
    >
      <div style={bodyStyle}>{children}</div>
      {kind === "speech" ? (
        <div
          style={{
            position: "absolute",
            [left ? "left" : "right"]: 18,
            [bottom ? "bottom" : "top"]: gap - 9,
            width: 18,
            height: 18,
            background,
            borderRight: border ?? `2px solid ${color}`,
            borderBottom: border ?? `2px solid ${color}`,
            transform: `rotate(${bottom ? (left ? 60 : 30) : left ? 240 : 210}deg) skewX(${left ? -20 : 20}deg)`,
          }}
        />
      ) : (
        [14, 8, 4].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: d,
              height: d,
              borderRadius: "50%",
              background,
              border: border ?? `2px solid ${color}`,
              [left ? "left" : "right"]: 6 + i * 4,
              [bottom ? "bottom" : "top"]: gap - 14 - i * 12,
            }}
          />
        ))
      )}
    </div>
  );
}

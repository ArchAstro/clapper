import { type CSSProperties, type ReactNode, useMemo } from "react";
import { type Frames, resolveFrames } from "./frames";
import { Easing, type EasingFn, interpolate } from "./interpolate";
import { useFrame, useVideoConfig } from "./timeline";

export interface CameraKeyframe {
  /** Local frame, or "1.2s". */
  frame: Frames;
  /** Point of interest in composition pixels (what the camera looks at). Default center. */
  x?: number;
  y?: number;
  /** Zoom factor (1 = whole composition visible). */
  zoom?: number;
  /** Rotation in degrees. */
  rotate?: number;
  /** Easing used to arrive at this keyframe. */
  easing?: EasingFn;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotate: number;
}

export function evalCamera(
  keyframes: CameraKeyframe[],
  frame: number,
  width: number,
  height: number,
  fps = 30,
): CameraState {
  const defaults: CameraState = { x: width / 2, y: height / 2, zoom: 1, rotate: 0 };
  if (keyframes.length === 0) return defaults;
  const sorted = keyframes
    .map((k) => ({ ...k, frame: resolveFrames(k.frame, fps) as number }))
    .sort((a, b) => a.frame - b.frame);
  const filled: (CameraState & { frame: number; easing?: EasingFn })[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev: CameraState = i === 0 ? defaults : filled[i - 1];
    filled.push({ ...prev, ...stripUndefined(sorted[i]), frame: sorted[i].frame, easing: sorted[i].easing });
  }
  if (frame <= filled[0].frame) return pick(filled[0]);
  if (frame >= filled[filled.length - 1].frame) return pick(filled[filled.length - 1]);
  let i = 0;
  while (i < filled.length - 2 && frame >= filled[i + 1].frame) i++;
  const a = filled[i];
  const b = filled[i + 1];
  const easing = b.easing ?? Easing.inOutCubic;
  const t = interpolate(frame, [a.frame, b.frame], [0, 1], { easing });
  // Interpolate zoom in log space so zooms feel uniform.
  const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    zoom,
    rotate: a.rotate + (b.rotate - a.rotate) * t,
  };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o))
    if (v !== undefined && k !== "frame" && k !== "easing") (out as any)[k] = v;
  return out;
}
function pick(s: CameraState & { frame?: number; easing?: unknown }): CameraState {
  return { x: s.x, y: s.y, zoom: s.zoom, rotate: s.rotate };
}

/** CSS transform that frames `state` in a width×height viewport. */
export function cameraTransform(state: CameraState, width: number, height: number): string {
  const cx = width / 2;
  const cy = height / 2;
  return `translate(${cx}px, ${cy}px) rotate(${-state.rotate}deg) scale(${state.zoom}) translate(${-state.x}px, ${-state.y}px)`;
}

/**
 * A virtual camera. Children are laid out in composition space; the camera
 * pans/zooms/rotates over them following keyframes:
 *
 *   <Camera keyframes={[{frame:0, zoom:1}, {frame:40, x:600, y:300, zoom:2.5}]}>…</Camera>
 */
export function Camera({
  keyframes,
  style,
  children,
}: {
  keyframes: CameraKeyframe[];
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const frame = useFrame();
  const { width, height, fps } = useVideoConfig();
  const state = useMemo(
    () => evalCamera(keyframes, frame, width, height, fps),
    [keyframes, frame, width, height, fps],
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: cameraTransform(state, width, height),
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function useCamera(keyframes: CameraKeyframe[]): CameraState {
  const frame = useFrame();
  const { width, height, fps } = useVideoConfig();
  return useMemo(
    () => evalCamera(keyframes, frame, width, height, fps),
    [keyframes, frame, width, height, fps],
  );
}

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type Frames, resolveFrames } from "./frames";

/**
 * Everything in clapper is a pure function of `frame`.
 * The timeline context carries the composition's frame clock; sequences shift it.
 */
export interface VideoConfig {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Format variant name when rendering a <Composition formats> variant. */
  format?: string;
}

export interface TimelineState {
  /** Local frame (relative to the nearest enclosing Sequence). */
  frame: number;
  /** Absolute composition frame. */
  absoluteFrame: number;
  /** Frame at which the enclosing sequence started (absolute). */
  offset: number;
  /** Length of the enclosing sequence, or of the composition at the root. */
  durationInFrames: number;
  /** Sequence path for track naming / stable ids. */
  path: string[];
}

export const VideoConfigContext = createContext<VideoConfig | null>(null);
export const TimelineContext = createContext<TimelineState | null>(null);

/** Render mode: "render" (headless harness), "preview" (studio), "static". */
export type RenderMode = "render" | "preview" | "static";
export const RenderModeContext = createContext<RenderMode>("static");

export function useVideoConfig(): VideoConfig {
  const cfg = useContext(VideoConfigContext);
  if (!cfg) throw new Error("useVideoConfig() must be used inside a <Composition>");
  return cfg;
}

export function useTimeline(): TimelineState {
  const t = useContext(TimelineContext);
  if (!t) throw new Error("useTimeline() must be used inside a <Composition>");
  return t;
}

/** Local frame number (0-based, relative to enclosing Sequence). */
export function useFrame(): number {
  return useTimeline().frame;
}

/** Local time in seconds. */
export function useTime(): number {
  const { frame } = useTimeline();
  const { fps } = useVideoConfig();
  return frame / fps;
}

export function useFps(): number {
  return useVideoConfig().fps;
}

export function useRenderMode(): RenderMode {
  return useContext(RenderModeContext);
}

/**
 * Convert seconds to frames for the current composition.
 * `const s = useSeconds(); <Sequence from={s(1.5)} durationInFrames={s(3)}>`
 */
export function useSeconds(): (seconds: number) => number {
  const fps = useFps();
  return useMemo(() => (seconds: number) => Math.round(seconds * fps), [fps]);
}

export interface FormatInfo {
  /** "default" for the base composition, else the variant name ("9:16"). */
  name: string;
  width: number;
  height: number;
  aspect: number;
  portrait: boolean;
  square: boolean;
  /** Pick a value per format: `pick({ "9:16": 48, default: 64 })`. */
  pick<T>(map: Record<string, T> & { default: T }): T;
}

/** Which size variant is rendering, for restaging layouts (see <Composition formats>). */
export function useFormat(): FormatInfo {
  const { width, height, format } = useVideoConfig();
  return useMemo(() => {
    const name = format ?? "default";
    return {
      name,
      width,
      height,
      aspect: width / height,
      portrait: height > width,
      square: Math.abs(width - height) < 2,
      pick: (map) => (name in map ? map[name] : map.default),
    };
  }, [width, height, format]);
}

/** Resolve a frames-or-"1.2s" value against the composition fps. */
export function useFrames(): (value: Frames) => number {
  const fps = useFps();
  return useMemo(() => (value: Frames) => resolveFrames(value, fps), [fps]);
}

/** Local progress 0..1 across the enclosing sequence (or composition). */
export function useSequenceProgress(): number {
  const { frame, durationInFrames } = useTimeline();
  if (durationInFrames <= 1) return 1;
  return Math.min(1, Math.max(0, frame / (durationInFrames - 1)));
}

export function TimelineProvider({
  config,
  frame,
  mode,
  children,
}: {
  config: VideoConfig;
  frame: number;
  mode: RenderMode;
  children?: ReactNode;
}) {
  const state = useMemo<TimelineState>(
    () => ({
      frame,
      absoluteFrame: frame,
      offset: 0,
      durationInFrames: config.durationInFrames,
      path: [config.id],
    }),
    [frame, config.durationInFrames, config.id],
  );
  return (
    <RenderModeContext.Provider value={mode}>
      <VideoConfigContext.Provider value={config}>
        <TimelineContext.Provider value={state}>{children}</TimelineContext.Provider>
      </VideoConfigContext.Provider>
    </RenderModeContext.Provider>
  );
}

import {
  Children,
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { type Frames, resolveFrames } from "./frames";
import { getRegistry, notifyRegistry } from "./registry";
import { TimelineContext, type TimelineState, useFps, useTimeline, useVideoConfig } from "./timeline";

export interface SequenceProps {
  /** Start relative to the parent sequence: frames or "1.2s". Default 0. */
  from?: Frames;
  /** Length: frames or "3s". Default: until the parent ends. */
  durationInFrames?: Frames;
  /** Alias of durationInFrames. */
  duration?: Frames;
  /** Name shown in the studio timeline. */
  name?: string;
  /**
   * Keep children mounted (and receive negative/overflowing frames) outside
   * the range instead of unmounting them. Default false.
   */
  keepMounted?: boolean;
  /** Wrap in an absolutely-positioned full-size div (default true). */
  layout?: "absolute-fill" | "none";
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

/**
 * Shifts the frame clock: inside a <Sequence from={30}>, `useFrame()` returns
 * 0 at absolute frame 30. Children are unmounted outside [from, from+duration).
 */
export function Sequence({
  from: fromProp = 0,
  durationInFrames: durProp,
  duration: durAlias,
  name,
  keepMounted = false,
  layout = "absolute-fill",
  style,
  className,
  children,
}: SequenceProps) {
  const parent = useTimeline();
  const fps = useFps();
  const from = resolveFrames(fromProp, fps);
  const explicit = resolveFrames(durProp ?? durAlias, fps);
  const duration = explicit ?? Math.max(0, parent.durationInFrames - from);
  const localFrame = parent.frame - from;
  const absStart = parent.offset + from;
  const id = useMemo(() => `${parent.path.join("/")}/${name ?? `seq@${from}`}`, [parent.path, name, from]);

  const state = useMemo<TimelineState>(
    () => ({
      frame: localFrame,
      absoluteFrame: parent.absoluteFrame,
      offset: absStart,
      durationInFrames: duration,
      path: [...parent.path, name ?? `seq@${from}`],
    }),
    [localFrame, parent.absoluteFrame, absStart, duration, parent.path, name, from],
  );

  // Register as a track for the studio timeline.
  useEffect(() => {
    if (!name) return;
    const r = getRegistry();
    const existing = r.tracks.get(id);
    const info = {
      id,
      name,
      path: state.path,
      startFrame: absStart,
      endFrame: absStart + duration,
      depth: parent.path.length - 1,
    };
    if (!existing || existing.startFrame !== info.startFrame || existing.endFrame !== info.endFrame) {
      r.tracks.set(id, info);
      notifyRegistry();
    }
  }, [id, name, absStart, duration, parent.path.length, state.path]);

  const inRange = localFrame >= 0 && localFrame < duration;
  if (!inRange && !keepMounted) return null;

  const content =
    layout === "absolute-fill" ? (
      <div className={className} style={{ ...absoluteFill, ...style }} data-sequence={name}>
        {children}
      </div>
    ) : (
      children
    );
  return <TimelineContext.Provider value={state}>{content}</TimelineContext.Provider>;
}

export const absoluteFill: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/** A div that fills the composition. */
export function AbsoluteFill({
  style,
  children,
  ...rest
}: { style?: CSSProperties; children?: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} style={{ ...absoluteFill, ...style }}>
      {children}
    </div>
  );
}

/* --------------------------------- Series ---------------------------------- */

export interface SeriesItemProps {
  durationInFrames: Frames;
  /** Negative to overlap with the previous item, positive to add a gap. */
  offset?: Frames;
  name?: string;
  children?: ReactNode;
}

function SeriesItem(_props: SeriesItemProps): ReactElement | null {
  return null;
}

/**
 * Lays out children one after another:
 * <Series>
 *   <Series.Item durationInFrames={60}>…</Series.Item>
 *   <Series.Item durationInFrames={90} offset={-10}>…</Series.Item>
 * </Series>
 */
export function Series({ children }: { children: ReactNode }) {
  const fps = useFps();
  let cursor = 0;
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<SeriesItemProps>[];
  return (
    <>
      {items.map((item, i) => {
        const { name, children: c } = item.props;
        const durationInFrames = resolveFrames(item.props.durationInFrames, fps);
        const offset = resolveFrames(item.props.offset ?? 0, fps);
        const from = cursor + offset;
        cursor = from + durationInFrames;
        return (
          <Sequence
            key={item.key ?? i}
            from={from}
            durationInFrames={durationInFrames}
            name={name ?? `item ${i + 1}`}
          >
            {c}
          </Sequence>
        );
      })}
    </>
  );
}
Series.Item = SeriesItem;

/* ---------------------------------- Loop ----------------------------------- */

/** Repeats its children every `durationInFrames`, `times` times (default forever). */
export function Loop({
  durationInFrames: durProp,
  times = Infinity,
  name,
  children,
}: {
  durationInFrames: Frames;
  times?: number;
  name?: string;
  children?: ReactNode;
}) {
  const { frame } = useTimeline();
  const durationInFrames = resolveFrames(durProp, useFps());
  const iteration = Math.floor(frame / durationInFrames);
  if (frame < 0 || iteration >= times) return null;
  return (
    <Sequence
      from={iteration * durationInFrames}
      durationInFrames={durationInFrames}
      name={name ? `${name} #${iteration + 1}` : undefined}
    >
      {children}
    </Sequence>
  );
}

/** Holds children at a fixed local frame. */
export function Freeze({ frame, children }: { frame: number; children?: ReactNode }) {
  const parent = useTimeline();
  const state = useMemo<TimelineState>(() => ({ ...parent, frame }), [parent, frame]);
  return <TimelineContext.Provider value={state}>{children}</TimelineContext.Provider>;
}

/** Utility: absolute frame at which this sequence's local frame 0 occurs. */
export function useAbsoluteOffset(): number {
  const t = useContext(TimelineContext);
  return t?.offset ?? 0;
}

/** Frames remaining in the enclosing sequence. */
export function useRemainingFrames(): number {
  const { frame, durationInFrames } = useTimeline();
  return Math.max(0, durationInFrames - frame);
}

export function useCompositionDuration(): number {
  return useVideoConfig().durationInFrames;
}

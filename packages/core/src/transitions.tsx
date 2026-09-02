import { Children, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Easing, progress, type EasingFn } from "./interpolate";
import { Sequence, absoluteFill } from "./sequence";
import { useFps, useTimeline, useVideoConfig } from "./timeline";
import { resolveFrames, type Frames } from "./frames";

export type TransitionType = "fade" | "slide" | "wipe" | "zoom" | "blur" | "none";
export type Direction = "left" | "right" | "up" | "down";

export interface TransitionSpec {
  type: TransitionType;
  /** Overlap in frames or "0.5s". */
  duration: Frames;
  direction?: Direction;
  easing?: EasingFn;
}

export interface TransitionItemProps {
  durationInFrames: Frames;
  /** Transition used to enter this item (overrides the series default). */
  transition?: TransitionSpec;
  name?: string;
  children?: ReactNode;
}

function Item(_p: TransitionItemProps): ReactElement | null {
  return null;
}

/**
 * Sequential scenes with overlapping transitions:
 * <TransitionSeries transition={{ type: "fade", duration: 15 }}>
 *   <TransitionSeries.Item durationInFrames={90}>…</TransitionSeries.Item>
 * </TransitionSeries>
 */
export function TransitionSeries({ transition = { type: "fade", duration: 15 }, children }: { transition?: TransitionSpec; children: ReactNode }) {
  const fps = useFps();
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<TransitionItemProps>[];
  let cursor = 0;
  const layout = items.map((item, i) => {
    const tIn = i === 0 ? null : (item.props.transition ?? transition);
    const from = i === 0 ? 0 : cursor - (tIn ? resolveFrames(tIn.duration, fps) : 0);
    const dur = resolveFrames(item.props.durationInFrames, fps);
    cursor = from + dur;
    return { item, from, dur, tIn };
  });
  return (
    <>
      {layout.map(({ item, from, dur, tIn }, i) => {
        const next = layout[i + 1];
        const tOut = next?.tIn ?? null;
        return (
          <Sequence key={item.key ?? i} from={from} durationInFrames={dur} name={item.props.name ?? `scene ${i + 1}`}>
            <TransitionFrame enter={tIn} exit={tOut} zIndex={i}>
              {item.props.children}
            </TransitionFrame>
          </Sequence>
        );
      })}
    </>
  );
}
TransitionSeries.Item = Item;

function TransitionFrame({ enter, exit, zIndex, children }: { enter: TransitionSpec | null; exit: TransitionSpec | null; zIndex: number; children?: ReactNode }) {
  const { frame, durationInFrames } = useTimeline();
  const { width, height, fps } = useVideoConfig();
  let style: CSSProperties = { ...absoluteFill, zIndex };
  const enterD = enter ? resolveFrames(enter.duration, fps) : 0;
  const exitD = exit ? resolveFrames(exit.duration, fps) : 0;
  if (enter && frame < enterD) {
    const p = progress(frame, 0, enterD, enter.easing ?? Easing.inOutCubic);
    style = { ...style, ...transitionStyle(enter, p, "enter", width, height) };
  }
  if (exit && frame >= durationInFrames - exitD) {
    const p = progress(frame, durationInFrames - exitD, exitD, exit.easing ?? Easing.inOutCubic);
    style = { ...style, ...transitionStyle(exit, p, "exit", width, height) };
  }
  return <div style={style}>{children}</div>;
}

function transitionStyle(spec: TransitionSpec, p: number, phase: "enter" | "exit", w: number, h: number): CSSProperties {
  const dir = spec.direction ?? "left";
  const sign = dir === "left" || dir === "up" ? 1 : -1;
  const horizontal = dir === "left" || dir === "right";
  switch (spec.type) {
    case "fade":
      return { opacity: phase === "enter" ? p : 1 - p };
    case "blur":
      return phase === "enter" ? { opacity: p, filter: `blur(${(1 - p) * 24}px)` } : { opacity: 1 - p, filter: `blur(${p * 24}px)` };
    case "zoom":
      return phase === "enter" ? { opacity: p, transform: `scale(${0.92 + 0.08 * p})` } : { opacity: 1 - p, transform: `scale(${1 + 0.06 * p})` };
    case "slide": {
      const dist = horizontal ? w : h;
      const off = phase === "enter" ? (1 - p) * dist * sign : -p * dist * sign;
      return { transform: horizontal ? `translateX(${off}px)` : `translateY(${off}px)` };
    }
    case "wipe": {
      const q = phase === "enter" ? p : 1;
      const r = phase === "exit" ? p : 0;
      if (horizontal) {
        const a = sign === 1 ? `${(1 - q) * 100}%` : "0%";
        const b = sign === 1 ? "0%" : `${(1 - q) * 100}%`;
        const ea = sign === 1 ? "0%" : `${r * 100}%`;
        const eb = sign === 1 ? `${r * 100}%` : "0%";
        return { clipPath: phase === "enter" ? `inset(0 ${b} 0 ${a})` : `inset(0 ${eb} 0 ${ea})` };
      }
      const a = sign === 1 ? `${(1 - q) * 100}%` : "0%";
      const b = sign === 1 ? "0%" : `${(1 - q) * 100}%`;
      return { clipPath: phase === "enter" ? `inset(${a} 0 ${b} 0)` : `inset(${sign === 1 ? 0 : r * 100}% 0 ${sign === 1 ? r * 100 : 0}% 0)` };
    }
    default:
      return {};
  }
}

/**
 * Total length of a TransitionSeries: item durations minus every overlap.
 * Use it for the Composition's durationInFrames so no blank tail frames appear.
 *   const SCENES = [{ durationInFrames: 90 }, { durationInFrames: 120, transition: { type: "wipe", duration: 16 } }];
 *   durationInFrames={transitionSeriesLength(SCENES, { type: "fade", duration: 12 })}
 */
export function transitionSeriesLength(items: { durationInFrames: Frames; transition?: Pick<TransitionSpec, "duration"> }[], defaultTransition: Pick<TransitionSpec, "duration"> = { duration: 0 }, fps = 30): number {
  let total = 0;
  items.forEach((item, i) => {
    total += resolveFrames(item.durationInFrames, fps);
    if (i > 0) total -= resolveFrames((item.transition ?? defaultTransition).duration, fps);
  });
  return total;
}

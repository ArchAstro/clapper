import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { type Frames, resolveFrames } from "./frames";
import { TransitionSeries, type TransitionSpec } from "./transitions";

/**
 * Scenes as first-class objects. One plan owns durations, transitions and the
 * absolute start of every scene, so sound, copy, the studio, the review kit
 * and the CLI all agree on where the cuts are.
 *
 *   const scenes = defineScenes({ open: { seconds: 3.3 }, plan: { seconds: 7 } }, { fps: 30 });
 *   <Composition durationInFrames={scenes.total} scenes={scenes} … />
 *   <Scenes plan={scenes}><Scenes.Scene name="open"><Open/></Scenes.Scene>…</Scenes>
 *   scenes.start("plan")  // absolute frame
 */
export interface SceneDef {
  seconds?: number;
  frames?: Frames;
  /** Transition INTO this scene. "hard" (default) is a cut. */
  transition?: TransitionSpec | "hard";
}

export interface SceneInfo {
  name: string;
  start: number;
  end: number;
  duration: number;
  transition: TransitionSpec | null;
}

export interface ScenePlan<K extends string = string> {
  fps: number;
  names: K[];
  total: number;
  start(name: K): number;
  end(name: K): number;
  duration(name: K): number;
  /** Local frame of `absFrame` inside `name` (may be negative or past the end). */
  local(name: K, absFrame: number): number;
  /** The scene that contains an absolute frame (the latest-starting one when transitions overlap). */
  at(absFrame: number): SceneInfo | null;
  list(): SceneInfo[];
  /** Absolute frames where a new scene begins (excluding 0): the cuts. */
  cuts(): number[];
}

export function defineScenes<K extends string>(
  defs: Record<K, SceneDef>,
  opts: { fps: number; defaultTransition?: TransitionSpec | "hard" },
): ScenePlan<K> {
  const fps = opts.fps;
  const names = Object.keys(defs) as K[];
  const infos: SceneInfo[] = [];
  let cursor = 0;
  names.forEach((name, i) => {
    const d = defs[name];
    const duration =
      d.frames !== undefined ? resolveFrames(d.frames, fps) : Math.round((d.seconds ?? 0) * fps);
    if (!duration || duration <= 0) throw new Error(`Scene "${name}" needs seconds or frames`);
    const t = i === 0 ? null : (d.transition ?? opts.defaultTransition ?? "hard");
    const transition = t === "hard" || t === null ? null : t;
    const overlap = transition ? resolveFrames(transition.duration, fps) : 0;
    const start = i === 0 ? 0 : cursor - overlap;
    infos.push({ name, start, end: start + duration, duration, transition });
    cursor = start + duration;
  });
  const byName = new Map(infos.map((s) => [s.name, s]));
  const get = (name: K) => {
    const s = byName.get(name);
    if (!s) throw new Error(`Unknown scene "${name}"`);
    return s;
  };
  return {
    fps,
    names,
    total: cursor,
    start: (n) => get(n).start,
    end: (n) => get(n).end,
    duration: (n) => get(n).duration,
    local: (n, f) => f - get(n).start,
    at: (f) => {
      let best: SceneInfo | null = null;
      for (const s of infos) if (f >= s.start && f < s.end && (!best || s.start >= best.start)) best = s;
      return best;
    },
    list: () => infos.map((s) => ({ ...s })),
    cuts: () => infos.slice(1).map((s) => s.start),
  };
}

export interface SceneProps {
  name: string;
  children?: ReactNode;
}
function Scene(_p: SceneProps): ReactElement | null {
  return null;
}

/** Renders the plan's scenes in order as a TransitionSeries. Children are <Scenes.Scene name=…>. */
export function Scenes({ plan, children }: { plan: ScenePlan<any>; children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<SceneProps>[];
  const byName = new Map(items.map((el) => [el.props.name, el]));
  const missing = plan.names.filter((n: string) => !byName.has(n));
  if (missing.length) throw new Error(`<Scenes> is missing scene(s): ${missing.join(", ")}`);
  return (
    <TransitionSeries transition={{ type: "none", duration: 0 }}>
      {plan.list().map((s) => (
        <TransitionSeries.Item
          key={s.name}
          durationInFrames={s.duration}
          name={s.name}
          transition={s.transition ?? { type: "none", duration: 0 }}
        >
          {byName.get(s.name)!.props.children}
        </TransitionSeries.Item>
      ))}
    </TransitionSeries>
  );
}
Scenes.Scene = Scene;

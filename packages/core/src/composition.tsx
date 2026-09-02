import { createElement, useEffect, type ComponentType, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { getRegistry, notifyRegistry, type CompositionEntry, type CompositionMeta } from "./registry";
import type { ScenePlan } from "./scenes";

export interface CompositionProps<P extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  component: ComponentType<P>;
  width: number;
  height: number;
  fps: number;
  /** Either durationInFrames or durationInSeconds. */
  durationInFrames?: number;
  durationInSeconds?: number;
  defaultProps?: P;
  /** A defineScenes() plan: supplies the duration and exposes the scene map to the CLI. */
  scenes?: ScenePlan<any>;
  /**
   * Extra size variants, registered as `<id>@<name>` (e.g. "promo@9:16"). The same component renders
   * them; branch on `useFormat()` for restaging. `{ "9:16": { width: 1080, height: 1920 } }`.
   */
  formats?: Record<string, { width: number; height: number }>;
}

/**
 * Declares a renderable composition. Place inside the component you pass to
 * `registerRoot()`. Renders nothing; it only registers metadata.
 */
export function Composition<P extends Record<string, unknown>>(props: CompositionProps<P>) {
  registerComposition(props);
  useEffect(() => {
    registerComposition(props);
  });
  return null;
}

export function registerComposition<P extends Record<string, unknown>>(props: CompositionProps<P>) {
  const duration =
    props.durationInFrames ?? (props.durationInSeconds !== undefined ? Math.round(props.durationInSeconds * props.fps) : props.scenes?.total);
  if (!duration || duration <= 0) throw new Error(`Composition "${props.id}" needs durationInFrames or durationInSeconds`);
  const entry: CompositionEntry = {
    id: props.id,
    component: props.component as ComponentType<any>,
    width: props.width,
    height: props.height,
    fps: props.fps,
    durationInFrames: duration,
    defaultProps: props.defaultProps as Record<string, unknown> | undefined,
    scenes: props.scenes?.list().map((s) => ({ name: s.name, start: s.start, end: s.end })),
  };
  const r = getRegistry();
  const prev = r.compositions.get(props.id);
  r.compositions.set(props.id, entry);
  for (const [name, size] of Object.entries(props.formats ?? {})) {
    r.compositions.set(`${props.id}@${name}`, { ...entry, id: `${props.id}@${name}`, width: size.width, height: size.height, format: name, baseId: props.id });
  }
  if (!prev || prev.component !== entry.component || prev.durationInFrames !== entry.durationInFrames) notifyRegistry();
}

/** Group compositions (purely organisational). */
export function Folder({ children }: { name: string; children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Entry point of a video project: `registerRoot(Root)` where Root renders
 * one or more <Composition>s. Both the studio and the renderer import your
 * entry file, which must call this exactly once.
 */
export function registerRoot(root: ComponentType) {
  const r = getRegistry();
  r.root = root;
  notifyRegistry();
}

/**
 * <Composition> registers itself when rendered, so the root must be mounted
 * once (hidden) before compositions can be listed. Idempotent.
 */
export function ensureRootMounted() {
  const r = getRegistry();
  if (r.rootMounted || !r.root || typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("data-clapper-root", "");
  host.style.display = "none";
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => root.render(createElement(r.root!)));
  r.rootMounted = true;
}

export function listCompositions(): CompositionMeta[] {
  ensureRootMounted();
  return [...getRegistry().compositions.values()].map(({ component: _c, ...meta }) => meta);
}

export function getComposition(id: string): CompositionEntry | undefined {
  return getRegistry().compositions.get(id);
}

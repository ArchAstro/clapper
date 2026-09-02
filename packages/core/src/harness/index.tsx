/**
 * The render harness: mounted in headless Chromium by the CLI. It exposes
 * `window.__agenticvids` so the renderer can select a composition, seek to a
 * frame, wait until the frame is stable, and then take a screenshot.
 *
 * Determinism tools installed here:
 *  - a virtual clock (performance.now / Date.now / requestAnimationFrame)
 *    advanced only when the frame advances, so rAF-driven libraries step
 *    exactly once per frame;
 *  - Web Animations / CSS animations are paused and seeked to the frame time;
 *  - delayRender() handles, fonts and images are awaited before capture.
 */
import { createElement, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { ensureRootMounted, getComposition, listCompositions } from "../composition";
import { collectAudioCues } from "../audio";
import { getRegistry, pendingDelays, type AudioCue, type CompositionMeta, type TrackInfo } from "../registry";
import { TimelineProvider } from "../timeline";

export interface HarnessApi {
  ready: boolean;
  listCompositions(): CompositionMeta[];
  select(id: string, props?: Record<string, unknown>): CompositionMeta;
  setFrame(frame: number): Promise<void>;
  collectAudio(): AudioCue[];
  getTracks(): TrackInfo[];
  pendingDelays(): string[];
  errors: string[];
}

declare global {
  interface Window {
    __agenticvids?: HarnessApi;
  }
}

/* ------------------------------ virtual clock ------------------------------ */

interface Clock {
  set(ms: number): void;
  flushRaf(): void;
  nativeRaf: (cb: FrameRequestCallback) => number;
}

function installVirtualClock(): Clock {
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const epoch = 1_700_000_000_000;
  let vt = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  performance.now = () => vt;
  Date.now = () => epoch + vt;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id: number) => {
    queue.delete(id);
  };
  return {
    nativeRaf,
    set(ms) {
      vt = ms;
    },
    flushRaf() {
      const q = queue;
      queue = new Map();
      for (const cb of q.values()) {
        try {
          cb(vt);
        } catch (e) {
          console.error(e);
        }
      }
    },
  };
}

/* ------------------------------ animation sync ----------------------------- */

const seenAnimations = new WeakMap<Animation, number>();
function syncAnimations(ms: number) {
  if (typeof document.getAnimations !== "function") return;
  for (const a of document.getAnimations()) {
    let start = seenAnimations.get(a);
    if (start === undefined) {
      start = ms;
      seenAnimations.set(a, start);
    }
    try {
      a.pause();
      a.currentTime = Math.max(0, ms - start);
    } catch {
      /* some animations (e.g. finished, removed) refuse seeking */
    }
  }
}

/* --------------------------------- settle ---------------------------------- */

async function settle(clock: Clock, timeoutMs = 30_000) {
  const t0 = Date.now === undefined ? 0 : new Date().getTime();
  const realNow = () => new Date().getTime();
  // 1) delayRender handles
  while (pendingDelays().length > 0) {
    if (realNow() - t0 > timeoutMs) throw new Error(`Frame did not settle within ${timeoutMs}ms; pending: ${pendingDelays().join(", ")}`);
    await new Promise((r) => setTimeout(r, 5));
  }
  // 2) fonts
  if (document.fonts?.status === "loading") await document.fonts.ready;
  // 3) images that are still loading
  const imgs = [...document.images].filter((i) => !i.complete);
  if (imgs.length) {
    await Promise.all(
      imgs.map(
        (i) =>
          new Promise<void>((res) => {
            i.addEventListener("load", () => res(), { once: true });
            i.addEventListener("error", () => res(), { once: true });
          }),
      ),
    );
  }
  // 4) two real frames so layout + paint are committed
  await new Promise<void>((r) => clock.nativeRaf(() => clock.nativeRaf(() => r())));
}

/* ---------------------------------- mount ---------------------------------- */

export function mountHarness(options: { virtualClock?: boolean; syncAnimations?: boolean } = {}) {
  const { virtualClock = true, syncAnimations: doSync = true } = options;
  ensureRootMounted();
  const container = document.getElementById("root") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "root" }));
  const clock: Clock = virtualClock
    ? installVirtualClock()
    : { set() {}, flushRaf() {}, nativeRaf: window.requestAnimationFrame.bind(window) };

  let root: Root | null = null;
  let current: ReturnType<typeof getComposition> | null = null;
  let props: Record<string, unknown> = {};
  let frame = 0;
  const errors: string[] = [];
  window.addEventListener("error", (e) => errors.push(String(e.error ?? e.message)));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

  function element(): ReactElement {
    if (!current) throw new Error("No composition selected");
    const { component: Comp, ...meta } = current;
    return createElement(
      TimelineProvider,
      { config: meta, frame, mode: "render" },
      createElement(
        "div",
        { style: { position: "absolute", left: 0, top: 0, width: meta.width, height: meta.height, overflow: "hidden", background: "transparent" } },
        createElement(Comp, { ...(meta.defaultProps ?? {}), ...props }),
      ),
    );
  }

  /** " in scene X (local frame n)" for the deepest named sequence containing an absolute frame. */
  function whereIs(n: number): string {
    let best: { name: string; startFrame: number; depth: number } | null = null;
    for (const t of getRegistry().tracks.values()) {
      if (n < t.startFrame || n >= t.endFrame) continue;
      if (!best || t.depth > best.depth) best = t;
    }
    const scene = current?.scenes?.find((s) => n >= s.start && n < s.end);
    const parts: string[] = [];
    if (scene) parts.push(`scene "${scene.name}" (local frame ${n - scene.start})`);
    if (best && best.name !== scene?.name) parts.push(`sequence "${best.name}" (local frame ${n - best.startFrame})`);
    return parts.length ? ` in ${parts.join(", ")}` : "";
  }

  function render() {
    if (!root) root = createRoot(container);
    flushSync(() => root!.render(element()));
  }

  const api: HarnessApi = {
    ready: true,
    errors,
    listCompositions,
    select(id, p) {
      const comp = getComposition(id);
      if (!comp) throw new Error(`Unknown composition "${id}". Known: ${listCompositions().map((c) => c.id).join(", ") || "(none)"}`);
      current = comp;
      props = p ?? {};
      frame = 0;
      getRegistry().audio.clear();
      document.documentElement.style.cssText = `width:${comp.width}px;height:${comp.height}px;overflow:hidden;margin:0;background:transparent`;
      document.body.style.cssText = `width:${comp.width}px;height:${comp.height}px;overflow:hidden;margin:0;position:relative;background:transparent`;
      container.style.cssText = `position:absolute;left:0;top:0;width:${comp.width}px;height:${comp.height}px;overflow:hidden`;
      if (root) {
        root.unmount();
        root = null;
      }
      render();
      const { component: _c, ...meta } = comp;
      return meta;
    },
    async setFrame(n) {
      if (!current) throw new Error("select() a composition first");
      frame = n;
      clock.set((n / current.fps) * 1000);
      const errorsBefore = errors.length;
      render();
      if (errors.length > errorsBefore) throw new Error(`Composition threw while rendering frame ${n}${whereIs(n)}:\n${errors.slice(errorsBefore).join("\n")}`);
      clock.flushRaf();
      if (doSync) syncAnimations((n / current.fps) * 1000);
      await settle(clock);
      if (doSync) syncAnimations((n / current.fps) * 1000);
    },
    collectAudio: collectAudioCues,
    getTracks: () => [...getRegistry().tracks.values()],
    pendingDelays,
  };
  window.__agenticvids = api;
  return api;
}

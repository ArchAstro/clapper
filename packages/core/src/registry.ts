/**
 * Global registries. They live on `globalThis` so that the harness (bundled
 * with the user's code) and the CLI (talking over Playwright) agree on one
 * store even if modules are duplicated.
 */
import type { ComponentType } from "react";

export interface CompositionMeta {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps?: Record<string, unknown>;
}

export interface CompositionEntry extends CompositionMeta {
  component: ComponentType<any>;
}

export interface ToneSpec {
  wave: "sine" | "triangle" | "square" | "sawtooth" | "noise";
  /** Hz. For noise: the lowpass cutoff. */
  freq: number;
  /** Optional glide target in Hz (linear over the cue). */
  freqEnd?: number;
  /** ADSR in seconds. */
  attack: number;
  decay: number;
  sustain: number; // level 0..1
  release: number;
  /** Extra partials for a richer tone: [ratio, gain][] */
  partials?: [number, number][];
}

export interface AudioCue {
  /** Stable id (sequence path + source + start). Used to dedupe across frames. */
  id: string;
  kind: "file" | "tone";
  /** Absolute start frame in the composition. */
  startFrame: number;
  /** Absolute end frame (exclusive). */
  endFrame: number;
  /** Volume 0..1 (may exceed 1). */
  volume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  /** File cues */
  src?: string;
  /** Seconds to skip into the source file. */
  trimStart?: number;
  playbackRate?: number;
  loop?: boolean;
  /** Tone cues */
  tone?: ToneSpec;
}

export interface TrackInfo {
  id: string;
  name: string;
  path: string[];
  startFrame: number;
  endFrame: number;
  depth: number;
}

export interface Registry {
  compositions: Map<string, CompositionEntry>;
  root: ComponentType | null;
  rootMounted: boolean;
  audio: Map<string, AudioCue>;
  tracks: Map<string, TrackInfo>;
  delayHandles: Map<number, string>;
  nextHandle: number;
  listeners: Set<() => void>;
}

const KEY = "__agenticvidsRegistry" as const;

export function getRegistry(): Registry {
  const g = globalThis as unknown as Record<string, Registry | undefined>;
  if (!g[KEY]) {
    g[KEY] = {
      compositions: new Map(),
      root: null,
      rootMounted: false,
      audio: new Map(),
      tracks: new Map(),
      delayHandles: new Map(),
      nextHandle: 1,
      listeners: new Set(),
    };
  }
  return g[KEY]!;
}

export function notifyRegistry() {
  for (const l of getRegistry().listeners) l();
}

export function subscribeRegistry(fn: () => void): () => void {
  const r = getRegistry();
  r.listeners.add(fn);
  return () => {
    r.listeners.delete(fn);
  };
}

/* ------------------------------ delayRender -------------------------------- */

/**
 * Tell the renderer to wait before capturing this frame. Returns a handle that
 * must be released with `continueRender(handle)`. Used by <Img>, <Video>,
 * fonts, or any component fetching data.
 */
export function delayRender(label = "delayRender"): number {
  const r = getRegistry();
  const h = r.nextHandle++;
  r.delayHandles.set(h, label);
  return h;
}

export function continueRender(handle: number) {
  getRegistry().delayHandles.delete(handle);
}

export function pendingDelays(): string[] {
  return [...getRegistry().delayHandles.values()];
}

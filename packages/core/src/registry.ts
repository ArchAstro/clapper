/**
 * Global registries. They live on `globalThis` so that the harness (bundled
 * with the user's code) and the CLI (talking over Playwright) agree on one
 * store even if modules are duplicated.
 */
import type { ComponentType } from "react";

export interface SceneMeta {
  name: string;
  start: number;
  end: number;
}

export interface CompositionMeta {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps?: Record<string, unknown>;
  /** Scene map from defineScenes(), when the composition declares one. */
  scenes?: SceneMeta[];
  /** Format variant name ("9:16") when registered through <Composition formats>; undefined for the base. */
  format?: string;
  /** Id of the base composition a format variant was derived from. */
  baseId?: string;
}

export interface CompositionEntry extends CompositionMeta {
  component: ComponentType<any>;
}

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise" | "pluck" | "epiano" | "feltpiano" | "mallet" | "bowed" | "breath";

export interface ToneSpec {
  /**
   * sine/triangle/square/sawtooth: classic oscillators. noise: filtered noise.
   * pluck: Karplus–Strong string. epiano: 2-op FM Rhodes-like.
   * feltpiano: damped, slightly inharmonic piano-string modes with a soft hammer.
   * mallet: tuned wooden modal percussion. bowed: sustained, gently moving string partials.
   */
  wave: Wave;
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
  /** pluck/epiano/feltpiano: seconds to ring down to -60 dB. Default 1.2. */
  ring?: number;
  /** pluck: 0 (felt, dark) .. 1 (bright, metallic). Default 0.6. */
  brightness?: number;
  /** One-pole lowpass applied after synthesis, in Hz. */
  cutoff?: number;
  /** Stereo position -1..1. Default 0. */
  pan?: number;
  /** Detuned second voice, 0..1 (width). Default 0. */
  spread?: number;
  /** Reverb send 0..1. Default 0. */
  reverb?: number;
  /** Amplitude tremolo. */
  lfo?: { rate: number; depth: number };
  /** Cent offset for the whole cue (humanization). */
  detune?: number;
  /**
   * Envelopes relative to the cue start, as [frame, value] breakpoints
   * (piecewise linear). `volume` multiplies the cue; `cutoff` overrides the lowpass in Hz.
   */
  automation?: { volume?: [number, number][]; cutoff?: [number, number][] };
}

export interface AudioCue {
  /** Stable id (sequence path + source + start). Used to dedupe across frames. */
  id: string;
  /** file: an asset; tone: offline-synthesized; bus: a gain envelope applied to everything (ducking). */
  kind: "file" | "tone" | "bus";
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
  /** Bus cues: gain breakpoints [frame relative to startFrame, gain]; all bus cues multiply. */
  automation?: { volume: [number, number][] };
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

const KEY = "__clapperRegistry" as const;

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

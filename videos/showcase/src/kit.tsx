import { Easing, interpolate, noise1d, progress, useFrame, useVideoConfig, type EasingFn } from "@agenticvids/core";
import type { CSSProperties, ReactNode } from "react";

/* ---------- shared motion vocabulary for the showcase videos ---------- */

export const EXPO = Easing.outExpo;
export const QUINT = Easing.outQuint;
export const INOUT = Easing.inOutQuint;

/**
 * Masked line reveal, the studio staple: the child slides up from under an
 * invisible mask. Use one per line of type.
 */
export function Reveal({ at = 0, duration = 26, delay = 0, from = "bottom", skew = 0, easing = QUINT, exitAt, exitDuration = 16, children, style, as: Tag = "div", className }: { at?: number; duration?: number; delay?: number; from?: "bottom" | "top" | "left" | "right"; skew?: number; easing?: EasingFn; exitAt?: number; exitDuration?: number; children: ReactNode; style?: CSSProperties; as?: "div" | "span" | "h1" | "h2" | "p"; className?: string }) {
  const frame = useFrame();
  let p = progress(frame, at + delay, duration, easing);
  let out = 0;
  if (exitAt !== undefined && frame >= exitAt) out = progress(frame, exitAt, exitDuration, Easing.inCubic);
  const axis = from === "bottom" || from === "top" ? "Y" : "X";
  const sign = from === "bottom" || from === "right" ? 1 : -1;
  const offset = (1 - p) * 110 * sign - out * 110 * sign;
  const Comp = Tag as any;
  return (
    <Comp className={className} style={{ overflow: "hidden", display: Tag === "span" ? "inline-block" : "block", verticalAlign: "bottom", padding: "0.08em 0.06em", margin: "-0.08em -0.06em", ...style }}>
      <span style={{ display: "block", transform: `translate${axis}(${offset}%) skewY(${skew * (1 - p)}deg)`, transformOrigin: "left bottom", willChange: "transform" }}>{children}</span>
    </Comp>
  );
}

/** A rule that draws itself. */
export function Rule({ at = 0, duration = 30, length = "100%", thickness = 2, color = "currentColor", vertical = false, easing = EXPO, style }: { at?: number; duration?: number; length?: number | string; thickness?: number; color?: string; vertical?: boolean; easing?: EasingFn; style?: CSSProperties }) {
  const frame = useFrame();
  const p = progress(frame, at, duration, easing);
  return <div style={{ width: vertical ? thickness : length, height: vertical ? length : thickness, background: color, transform: vertical ? `scaleY(${p})` : `scaleX(${p})`, transformOrigin: vertical ? "top" : "left", ...style }} />;
}

/**
 * Animated film grain. The noise is rasterised once per seed on a small tile
 * (data-URI SVG feTurbulence) and tiled across the frame; the tile cycles
 * through `seeds` seeds and drifts each frame so it flickers like stock.
 * ~10x cheaper than a full-frame feTurbulence per frame.
 */
const grainTiles = new Map<string, string>();
function grainTile(seed: number, size: number, freq: number): string {
  const key = `${seed}:${size}:${freq}`;
  let uri = grainTiles.get(key);
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
    uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    grainTiles.set(key, uri);
  }
  return uri;
}

export function Grain({ opacity = 0.08, blend = "multiply", scale = 1, seeds = 6, tile = 320 }: { opacity?: number; blend?: CSSProperties["mixBlendMode"]; scale?: number; seeds?: number; tile?: number }) {
  const frame = useFrame();
  const seed = 11 + (frame % seeds) * 17;
  const ox = ((frame * 37) % tile) - tile;
  const oy = ((frame * 23) % tile) - tile;
  return <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: blend, opacity, backgroundImage: grainTile(seed, tile, 0.9 / scale), backgroundSize: `${tile}px ${tile}px`, backgroundPosition: `${ox}px ${oy}px` }} />;
}

export function Vignette({ strength = 0.5, color = "#000" }: { strength?: number; color?: string }) {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, ${color} 140%)`, opacity: strength }} />;
}

/** Subtle handheld shake driven by noise; returns a transform string. Amount in px. */
export function useShake(amount = 0, seed = 1, speed = 0.15): string {
  const frame = useFrame();
  if (!amount) return "none";
  const x = noise1d(frame * speed, seed) * amount;
  const y = noise1d(frame * speed + 100, seed + 7) * amount;
  const r = noise1d(frame * speed + 200, seed + 13) * amount * 0.02;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
}

/** Impact: a quick scale punch decaying after `at` (for hard cuts synced to a Thump). */
export function useImpact(at: number, amount = 0.04, length = 14): number {
  const frame = useFrame();
  if (frame < at || frame > at + length) return 1;
  const t = (frame - at) / length;
  return 1 + amount * (1 - t) * Math.cos(t * Math.PI * 2.5);
}

/** Tracked-out small caps label. */
export function Eyebrow({ children, color, style, mono = true }: { children: ReactNode; color?: string; style?: CSSProperties; mono?: boolean }) {
  return <div className={mono ? "mono" : undefined} style={{ fontSize: 20, letterSpacing: "0.22em", textTransform: "uppercase", color, fontWeight: 500, ...style }}>{children}</div>;
}

/* ------------------------------- paths ------------------------------- */

export type Pt = [number, number];

/** Smooth cubic path through points (Catmull-Rom → Bezier). */
export function smoothPath(points: Pt[], tension = 0.5): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Point along the polyline at t∈[0,1] (by x-progress, good for charts). */
export function pointAt(points: Pt[], t: number): Pt {
  const n = points.length - 1;
  const f = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(f);
  const u = f - i;
  const a = points[i];
  const b = points[i + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

/** Deterministic pseudo-random series (for charts) */
export function series(n: number, seed = 1, drift = 0.6): number[] {
  const out: number[] = [];
  let v = 0.4;
  for (let i = 0; i < n; i++) {
    const r = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    v += ((r - Math.floor(r)) - 0.5) * 0.18 + (drift / n) * 0.8;
    v = Math.max(0.05, Math.min(0.98, v));
    out.push(v);
  }
  return out;
}

export function fmtMoney(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export const between = (frame: number, a: number, b: number) => frame >= a && frame < b;
export { interpolate };

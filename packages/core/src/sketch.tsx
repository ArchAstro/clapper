import { useId, useMemo, type CSSProperties, type ReactNode, type SVGProps } from "react";
import { useFrame } from "./timeline";

/**
 * Hand-drawn primitives. Lines are re-jittered from a seed that changes a few
 * times a second ("boil"), the classic look of pencil animation, while motion
 * itself stays at full frame rate.
 */
export type SketchPt = [number, number];

/** A seed that steps every `every` frames. Feed it to the rough* helpers. */
export function useBoil(every = 4, offset = 0): number {
  const frame = useFrame();
  return Math.floor((frame + offset) / every);
}

export function sketchHash(seed: number, i: number): number {
  let h = (Math.imul(seed | 0, 374761393) + Math.imul(i | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const jit = (seed: number, i: number, amp: number) => (sketchHash(seed, i) - 0.5) * 2 * amp;

function smooth(out: SketchPt[]): string {
  if (out.length === 0) return "";
  if (out.length === 1) return `M${out[0][0].toFixed(1)} ${out[0][1].toFixed(1)}`;
  let d = `M${out[0][0].toFixed(1)} ${out[0][1].toFixed(1)}`;
  for (let i = 1; i < out.length - 1; i++) {
    const mx = (out[i][0] + out[i + 1][0]) / 2;
    const my = (out[i][1] + out[i + 1][1]) / 2;
    d += ` Q${out[i][0].toFixed(1)} ${out[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const e = out[out.length - 1];
  d += ` L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
  return d;
}

/** A wobbly polyline through `points` (closed if `close`). `amp` is the jitter in px. */
export function roughPath(points: SketchPt[], seed: number, amp = 1.5, close = false, step = 16): string {
  if (points.length < 2) return "";
  const pts = close ? [...points, points[0]] : points;
  const out: SketchPt[] = [];
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const endW = j === 0 ? 0.45 : 1; // corners stay put so shapes still close
      out.push([x0 + (x1 - x0) * t + jit(seed, k++, amp) * endW, y0 + (y1 - y0) * t + jit(seed, k++, amp) * endW]);
    }
  }
  const last = pts[pts.length - 1];
  out.push([last[0] + jit(seed, k++, amp * 0.45), last[1] + jit(seed, k++, amp * 0.45)]);
  return smooth(out);
}

export function roughRect(x: number, y: number, w: number, h: number, seed: number, amp = 1.5): string {
  return roughPath([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], seed, amp, true);
}

/** A circle drawn in one nervous stroke that overshoots its start, like a pen would. */
export function roughEllipse(cx: number, cy: number, rx: number, ry: number, seed: number, amp = 1.5, n = 26): string {
  const out: SketchPt[] = [];
  const start = sketchHash(seed, 999) * Math.PI * 2;
  for (let i = 0; i <= n + 2; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const r = 1 + jit(seed, i, amp) / Math.max(rx, ry);
    out.push([cx + Math.cos(a) * rx * r + jit(seed, 100 + i, amp * 0.4), cy + Math.sin(a) * ry * r + jit(seed, 200 + i, amp * 0.4)]);
  }
  return smooth(out);
}

/** Diagonal hatch segments covering a rectangle (clip them to the shape you fill). */
export function hatchLines(x: number, y: number, w: number, h: number, spacing = 10, seed = 0, angle = -45, amp = 0.8): SketchPt[][] {
  const out: SketchPt[][] = [];
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const nx = -dy;
  const ny = dx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const half = Math.hypot(w, h) / 2;
  let k = 0;
  for (let o = -half; o <= half; o += spacing) {
    const ox = cx + nx * o + jit(seed, k++, amp);
    const oy = cy + ny * o + jit(seed, k++, amp);
    out.push([
      [ox - dx * half, oy - dy * half],
      [ox + dx * half, oy + dy * half],
    ]);
  }
  return out;
}

/** A scribbled "line of text": a zigzag of the given length, for windows full of words nobody reads. */
export function scribble(x: number, y: number, length: number, seed: number, amp = 2.2, pitch = 7): string {
  const pts: SketchPt[] = [];
  const n = Math.max(2, Math.round(length / pitch));
  for (let i = 0; i <= n; i++) pts.push([x + (i / n) * length, y + (i % 2 ? amp : -amp) + jit(seed, i, amp * 0.6)]);
  return roughPath(pts, seed + 1, 0.6, false, 6);
}

export interface RoughProps extends Omit<SVGProps<SVGGElement>, "points" | "fill"> {
  /** Polyline points; or use `d` for a prebuilt path. */
  points?: SketchPt[];
  d?: string;
  close?: boolean;
  seed: number;
  amp?: number;
  stroke?: string;
  width?: number;
  /** Second, lighter pass offset from the first, the way a marker doubles a line. */
  passes?: 1 | 2;
  /** Solid fill colour, or `hatch` for pencil hatching (uses `fillColor` for the lines). */
  fill?: string;
  hatch?: boolean;
  hatchSpacing?: number;
  hatchAngle?: number;
  fillColor?: string;
  opacity?: number;
  linecap?: "round" | "butt" | "square";
}

/** One hand-drawn shape: optional fill (solid or hatched, clipped to the shape), then 1–2 wobbly strokes. */
export function Rough({ points, d, close = false, seed, amp = 1.5, stroke = "currentColor", width = 3, passes = 2, fill, hatch = false, hatchSpacing = 9, hatchAngle = -45, fillColor, opacity, linecap = "round", style, ...rest }: RoughProps) {
  const id = useId();
  const path = d ?? (points ? roughPath(points, seed, amp, close) : "");
  const hatched = useMemo(() => {
    if (!hatch || !points) return null;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return hatchLines(x, y, Math.max(...xs) - x, Math.max(...ys) - y, hatchSpacing, seed + 3, hatchAngle).map((l) => roughPath(l, seed + 5, 0.6));
  }, [hatch, points, hatchSpacing, hatchAngle, seed]);
  const second = passes === 2 && (points || d) ? (points ? roughPath(points, seed + 11, amp * 0.9, close) : d) : null;
  return (
    <g opacity={opacity} style={style} {...rest}>
      {(fill || hatched) && (
        <>
          <clipPath id={id}>
            <path d={points ? roughPath(points, seed + 7, amp * 0.6, true) : path} />
          </clipPath>
          {fill && <path d={points ? roughPath(points, seed + 7, amp * 0.6, true) : path} fill={fill} stroke="none" />}
          {hatched && (
            <g clipPath={`url(#${id})`} stroke={fillColor ?? stroke} strokeWidth={Math.max(1, width * 0.45)} fill="none" strokeLinecap={linecap}>
              {hatched.map((h, i) => (
                <path key={i} d={h} />
              ))}
            </g>
          )}
        </>
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap={linecap} strokeLinejoin="round" />
      {second && <path d={second} fill="none" stroke={stroke} strokeWidth={width * 0.7} strokeLinecap={linecap} strokeLinejoin="round" opacity={0.55} />}
    </g>
  );
}

/** Wobbly rectangle. */
export function RoughRect({ x, y, w, h, ...rest }: { x: number; y: number; w: number; h: number } & Omit<RoughProps, "points" | "d" | "close">) {
  return <Rough points={[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]} close {...rest} />;
}

/** Wobbly ellipse (or circle). */
export function RoughEllipse({ cx, cy, rx, ry, seed, amp = 1.5, fill, ...rest }: { cx: number; cy: number; rx: number; ry?: number } & Omit<RoughProps, "points" | "d" | "close">) {
  const r2 = ry ?? rx;
  const d = roughEllipse(cx, cy, rx, r2, seed, amp);
  const pts: SketchPt[] = [];
  for (let i = 0; i < 24; i++) pts.push([cx + Math.cos((i / 24) * Math.PI * 2) * rx, cy + Math.sin((i / 24) * Math.PI * 2) * r2]);
  return <Rough d={d} points={fill || rest.hatch ? pts : undefined} close seed={seed} amp={amp} fill={fill} {...rest} />;
}

/** Wobbly line. */
export function RoughLine({ x1, y1, x2, y2, ...rest }: { x1: number; y1: number; x2: number; y2: number } & Omit<RoughProps, "points" | "d" | "close">) {
  return <Rough points={[[x1, y1], [x2, y2]]} {...rest} />;
}

/** Comic-panel border: a paper sheet with a hand-drawn frame. Children are laid out inside the frame. */
export function Panel({ inset = 80, width = 1920, height = 1080, seed, ink = "#151515", stroke = 5, paper = "#f5f3ee", children, style }: { inset?: number; width?: number; height?: number; seed: number; ink?: string; stroke?: number; paper?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: paper, ...style }}>
      <div style={{ position: "absolute", left: inset, top: inset, width: width - inset * 2, height: height - inset * 2, overflow: "hidden" }}>{children}</div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <RoughRect x={inset} y={inset} w={width - inset * 2} h={height - inset * 2} seed={seed} amp={2.2} stroke={ink} width={stroke} />
      </svg>
    </div>
  );
}

import { Latex } from "@archastro/clapper-core/latex";
import type { CSSProperties, ReactNode } from "react";
import { ITEMS, ROC } from "./data";
export const C = {
  bg: "#f4f1e8",
  paper: "#fffefa",
  ink: "#193239",
  muted: "#3d5156",
  faint: "#8a9894",
  line: "#d6ddd6",
  pos: "#006657",
  posSoft: "#d9ede6",
  neg: "#a3402b",
  negSoft: "#f5ded5",
  gold: "#8a5a00",
  goldSoft: "#f6e7c4",
  blue: "#24558e",
  blueSoft: "#e0e9f4",
  purple: "#624776",
};
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  const p = clamp(x);
  return p * p * (3 - 2 * p);
};
export const easeOut = (x: number) => 1 - (1 - clamp(x)) ** 3;
/** Eased 0→1 from frame `at` over `dur` frames. */
export const appear = (f: number, at: number, dur = 14) => easeOut((f - at) / dur);
/** Fractional tick labels without vulgar-fraction glyphs (not in the house fonts). */
export const fracLabel = (v: number) =>
  v === 0
    ? "0"
    : v === 1
      ? "1"
      : Math.abs(v - 1 / 3) < 1e-9
        ? "1/3"
        : Math.abs(v - 2 / 3) < 1e-9
          ? "2/3"
          : String(v);

/** Fade + rise wrapper for SVG groups. */
export function In({
  f,
  at,
  dur = 14,
  dy = 10,
  children,
}: {
  f: number;
  at: number;
  dur?: number;
  dy?: number;
  children: ReactNode;
}) {
  const p = appear(f, at, dur);
  return (
    <g opacity={p} transform={`translate(0 ${(1 - p) * dy})`}>
      {children}
    </g>
  );
}
/** Same, for HTML overlays. */
export function HIn({
  f,
  at,
  dur = 14,
  style,
  children,
}: {
  f: number;
  at: number;
  dur?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const p = appear(f, at, dur);
  return <div style={{ ...style, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>{children}</div>;
}
export function Text({
  x,
  y,
  children,
  size = 24,
  color = C.ink,
  anchor = "start",
  weight = 560,
  mono = false,
  opacity,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  mono?: boolean;
  opacity?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={Math.max(size, 20)}
      fontWeight={weight}
      textAnchor={anchor}
      dominantBaseline="middle"
      opacity={opacity}
      fontFamily={mono ? "Fragment Mono, monospace" : undefined}
    >
      {children}
    </text>
  );
}
export function Card({
  x,
  y,
  w = 300,
  h = 115,
  title,
  sub,
  color = C.pos,
  fill = C.paper,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: ReactNode;
  sub?: ReactNode;
  color?: string;
  fill?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="14" fill={fill} stroke={C.line} />
      <rect x={x} y={y + 16} width="4" height={h - 32} rx="2" fill={color} />
      <Text x={x + 22} y={y + 32} size={24} weight={680}>
        {title}
      </Text>
      {sub && (
        <foreignObject x={x + 22} y={y + 52} width={w - 40} height={Math.max(40, h - 58)}>
          <div data-copy style={{ fontSize: 20, fontWeight: 520, lineHeight: 1.2, color: C.muted }}>
            {sub}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = C.muted,
  p = 1,
  width = 2.5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  p?: number;
  width?: number;
}) {
  if (p <= 0) return null;
  const ex = x1 + (x2 - x1) * p,
    ey = y1 + (y2 - y1) * p;
  const a = Math.atan2(y2 - y1, x2 - x1),
    s = 11;
  return (
    <g stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x1},${y1}L${ex},${ey}`} />
      <path
        d={`M${ex - s * Math.cos(a - 0.5)},${ey - s * Math.sin(a - 0.5)}L${ex},${ey}L${ex - s * Math.cos(a + 0.5)},${ey - s * Math.sin(a + 0.5)}`}
      />
    </g>
  );
}
export function Eq({
  x = 90,
  y = 350,
  w = 1100,
  tex,
  size = 30,
  p = 1,
  color = C.ink,
}: {
  x?: number;
  y?: number;
  w?: number;
  tex: string;
  size?: number;
  p?: number;
  color?: string;
}) {
  if (p <= 0) return null;
  return (
    <div
      className="equation"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        textAlign: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        color,
      }}
    >
      <Latex display fontSize={size}>
        {tex}
      </Latex>
    </div>
  );
}
export function SVG({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 1280 490"
      width="1280"
      height="490"
      style={{ overflow: "visible", position: "absolute", inset: 0 }}
    >
      {children}
    </svg>
  );
}
/** One payment chip. */
export function Chip({
  item,
  x,
  y,
  w = 150,
  h = 104,
  value,
  truth = 1,
  flagged = 0,
  dim = 0,
  label = true,
}: {
  item: (typeof ITEMS)[number];
  x: number;
  y: number;
  w?: number;
  h?: number;
  value?: number;
  truth?: number;
  flagged?: number;
  dim?: number;
  label?: boolean;
}) {
  const c = item.positive ? C.pos : C.neg,
    soft = item.positive ? C.posSoft : C.negSoft;
  return (
    <g opacity={1 - dim * 0.65}>
      <rect x={x} y={y} width={w} height={h} rx="12" fill={C.paper} stroke={C.line} strokeWidth={1} />
      <rect x={x} y={y} width={w} height={h} rx="12" fill={soft} opacity={flagged * 0.9} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="12"
        fill="none"
        stroke={c}
        strokeWidth={3}
        opacity={Math.max(truth * 0.35, flagged)}
      />
      {label && (
        <>
          <Text x={x + 16} y={y + 25} color={C.ink} size={22} weight={700}>
            {item.id}
          </Text>
          <Text x={x + w - 16} y={y + 25} anchor="end" color={c} size={24} weight={700} opacity={truth}>
            {item.positive ? "+ fraud" : "− legit"}
          </Text>
        </>
      )}
      <Text x={x + w / 2} y={y + h * 0.66} size={34} anchor="middle" weight={620}>
        {(value ?? item.score).toFixed(2)}
      </Text>
    </g>
  );
}
/** The six payments in rank order. */
export function Scores({
  x = 76,
  y = 40,
  gap = 186,
  w = 160,
  squared = false,
  truth = 1,
  flagged = () => 0,
  dim = () => 0,
}: {
  x?: number;
  y?: number;
  gap?: number;
  w?: number;
  squared?: boolean;
  truth?: number;
  flagged?: (i: number) => number;
  dim?: (i: number) => number;
}) {
  return (
    <g>
      {ITEMS.map((item, i) => (
        <Chip
          key={item.id}
          item={item}
          x={x + i * gap}
          y={y}
          w={w}
          value={squared ? item.score ** 2 : item.score}
          truth={truth}
          flagged={flagged(i)}
          dim={dim(i)}
        />
      ))}
    </g>
  );
}
/** Path through points, revealed up to a fractional vertex index. */
export function partialPath(
  pts: [number, number][],
  upto: number,
  px: (v: number) => number,
  py: (v: number) => number,
) {
  if (upto <= 0 || pts.length === 0) return { d: "", end: pts[0] ?? [0, 0] };
  const n = Math.min(Math.floor(upto), pts.length - 1),
    frac = upto - n;
  const shown = pts.slice(0, n + 1).map((p) => [...p] as [number, number]);
  if (frac > 0 && n + 1 < pts.length) {
    const a = pts[n],
      b = pts[n + 1];
    shown.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
  }
  return {
    d: shown.map(([a, b], i) => `${i ? "L" : "M"}${px(a)} ${py(b)}`).join(" "),
    end: shown.at(-1)!,
  };
}
export function Plot({
  x = 96,
  y = 46,
  w = 440,
  h = 290,
  points = ROC,
  upto = points.length - 1,
  color = C.pos,
  fill = 0,
  diagonal = 0,
  xLabel = "False-positive rate",
  yLabel = "True-positive rate",
  dot = true,
  ticks = [0, 1 / 3, 2 / 3, 1],
  axes = 1,
  children,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  points?: [number, number][];
  upto?: number;
  color?: string;
  fill?: number;
  diagonal?: number;
  xLabel?: string;
  yLabel?: string;
  dot?: boolean;
  ticks?: number[];
  axes?: number;
  children?: ReactNode;
}) {
  const px = (v: number) => x + v * w,
    py = (v: number) => y + (1 - v) * h,
    { d, end } = partialPath(points, upto, px, py);
  return (
    <g>
      <g opacity={axes}>
        <rect x={x} y={y} width={w} height={h} fill={C.paper} />
        {ticks.map((v) => (
          <g key={v}>
            <path d={`M${px(v)} ${y}V${y + h}M${x} ${py(v)}H${x + w}`} stroke={C.line} strokeWidth="1" />
            <Text x={px(v)} y={y + h + 20} size={20} anchor="middle" color={C.muted} mono>
              {fracLabel(v)}
            </Text>
            <Text x={x - 12} y={py(v)} size={20} anchor="end" color={C.muted} mono>
              {fracLabel(v)}
            </Text>
          </g>
        ))}
        {yLabel && (
          <Text x={x} y={y - 22} size={21} color={C.muted} weight={600}>
            {yLabel} ↑
          </Text>
        )}
        {xLabel && (
          <Text x={x + w / 2} y={y + h + 50} size={21} anchor="middle" color={C.muted} weight={600}>
            {xLabel} →
          </Text>
        )}
      </g>
      {diagonal > 0 && (
        <path
          d={`M${x} ${y + h}L${x + w * diagonal} ${y + h - h * diagonal}`}
          stroke={C.faint}
          strokeDasharray="7 7"
          strokeWidth="2"
        />
      )}
      {fill > 0 && d && (
        <path d={`${d} L${px(end[0])} ${y + h}L${x} ${y + h}Z`} fill={color} opacity={0.15 * fill} />
      )}
      {children}
      {d && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {dot && d && (
        <circle cx={px(end[0])} cy={py(end[1])} r="8" fill={color} stroke={C.paper} strokeWidth="2.5" />
      )}
      <path d={`M${x} ${y}V${y + h}H${x + w}`} fill="none" stroke={C.ink} strokeWidth="2" opacity={axes} />
    </g>
  );
}
export function Caption({
  children,
  color = C.pos,
  p = 1,
}: {
  children: ReactNode;
  color?: string;
  p?: number;
}) {
  if (p <= 0) return null;
  return (
    <div
      className="caption"
      data-copy
      style={{ borderColor: color, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}
    >
      {children}
    </div>
  );
}

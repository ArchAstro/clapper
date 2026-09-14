import { useFrame } from "@archastro/clapper-core";
import type { ReactNode } from "react";
export const C = {
  ink: "#f0f0e7",
  muted: "#91a4b4",
  cyan: "#67e5d1",
  coral: "#ff8e82",
  gold: "#efc96b",
  blue: "#8badff",
  line: "#30424e",
  panel: "#122530",
  bg: "#081620",
};
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => {
  const t = clamp(v);
  return 1 - (1 - t) ** 3;
};
export function Appear({
  children,
  at = 0,
  duration = 25,
  y = 12,
}: {
  children: ReactNode;
  at?: number;
  duration?: number;
  y?: number;
}) {
  const f = useFrame(),
    p = ease((f - at) / duration);
  return (
    <g opacity={p} transform={`translate(0 ${y * (1 - p)})`}>
      {children}
    </g>
  );
}
export function Txt({
  x,
  y,
  children,
  size = 28,
  color = C.ink,
  anchor = "start",
  mono = false,
  weight = 500,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontWeight={weight}
      fontFamily={mono ? '"JetBrains Mono",monospace' : '"Space Grotesk",sans-serif'}
    >
      {children}
    </text>
  );
}
export function Box({
  x,
  y,
  w = 240,
  h = 100,
  label,
  sub,
  color = C.cyan,
  active = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  color?: string;
  active?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={18}
        fill={active ? `${color}24` : C.panel}
        stroke={active ? color : C.line}
        strokeWidth={active ? 3 : 1.5}
      />
      <Txt x={x + w / 2} y={y + h / 2 - (sub ? 12 : 0)} anchor="middle" size={30} color={color}>
        {label}
      </Txt>
      {sub && (
        <Txt x={x + w / 2} y={y + h / 2 + 25} anchor="middle" size={19} color={C.muted}>
          {sub}
        </Txt>
      )}
    </g>
  );
}
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = C.cyan,
  active = false,
  label,
  labelBackdrop = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  active?: boolean;
  label?: string;
  labelBackdrop?: boolean;
}) {
  const f = useFrame();
  const p = (f % 70) / 70;
  const angle = Math.atan2(y2 - y1, x2 - x1),
    dx = Math.cos(angle),
    dy = Math.sin(angle);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? color : C.line} strokeWidth={active ? 3 : 2} />
      <path
        d={`M${x2 - 14 * dx + 6 * dy},${y2 - 14 * dy - 6 * dx} L${x2},${y2} L${x2 - 14 * dx - 6 * dy},${y2 - 14 * dy + 6 * dx}`}
        fill="none"
        stroke={active ? color : C.line}
        strokeWidth={3}
      />
      {active && <circle cx={x1 + (x2 - x1) * p} cy={y1 + (y2 - y1) * p} r={5} fill={color} />}{" "}
      {label && labelBackdrop && (
        <rect
          x={(x1 + x2) / 2 - (label.length * 11.8 + 18) / 2}
          y={(y1 + y2) / 2 - 37}
          width={label.length * 11.8 + 18}
          height={34}
          rx={5}
          fill={C.bg}
        />
      )}
      {label && (
        <Txt x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 20} color={color} size={21} anchor="middle">
          {label}
        </Txt>
      )}
    </g>
  );
}
export function Matrix({
  x,
  y,
  values,
  label,
  color = C.cyan,
  cell = 84,
  highlight = -1,
  scale = 1,
}: {
  x: number;
  y: number;
  values: (number | string)[][];
  label?: string;
  color?: string;
  cell?: number;
  highlight?: number;
  scale?: number;
}) {
  const rows = values.length,
    cols = values[0].length;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {label && (
        <Txt x={(cols * cell) / 2} y={-38} anchor="middle" size={32} color={color} mono>
          {label}
        </Txt>
      )}
      <path
        d={`M-8,-5 H-18 V${rows * cell + 5} H-8 M${cols * cell + 8},-5 H${cols * cell + 18} V${rows * cell + 5} H${cols * cell + 8}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      {values.flatMap((row, r) =>
        row.map((value, c) => (
          <g key={`${r}-${c}`}>
            <rect
              x={c * cell + 3}
              y={r * cell + 3}
              width={cell - 6}
              height={cell - 6}
              rx={10}
              fill={highlight === r * cols + c ? `${color}45` : `${color}0d`}
              stroke={highlight === r * cols + c ? color : "transparent"}
            />
            <Txt
              x={(c + 0.5) * cell}
              y={(r + 0.5) * cell}
              anchor="middle"
              color={color}
              size={typeof value === "string" && value.length > 4 ? 23 : 34}
              mono
            >
              {value}
            </Txt>
          </g>
        )),
      )}
    </g>
  );
}
export function Equation({
  children,
  x = 860,
  y = 470,
  color = C.ink,
  size = 35,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  color?: string;
  size?: number;
}) {
  return (
    <Txt x={x} y={y} anchor="middle" size={size} color={color} mono>
      {children}
    </Txt>
  );
}
export function Canvas({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 1720 570" width="1720" height="570" style={{ overflow: "visible" }}>
      {children}
    </svg>
  );
}

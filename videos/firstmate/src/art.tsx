import { Img } from "@archastro/clapper-core";
import type { CSSProperties, ReactNode } from "react";

const mate = new URL("./assets/mate.png", import.meta.url).href;
const sea = new URL("./assets/sea.png", import.meta.url).href;

export const P = {
  navy: "#102b32",
  ink: "#183338",
  teal: "#32626a",
  paper: "#f1dfb6",
  gold: "#c9954d",
  rust: "#ab4e29",
  green: "#35664f",
};
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
export function Copy({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-copy=""
      style={{
        position: "relative",
        fontFamily: '"Schibsted Grotesk",sans-serif',
        fontSize: 35,
        lineHeight: 1.35,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function Head({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Copy
      style={{
        fontFamily: '"Instrument Serif",Georgia,serif',
        fontSize: 130,
        lineHeight: 1.03,
        letterSpacing: -2,
        ...style,
      }}
    >
      {children}
    </Copy>
  );
}
export function Tag({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Copy style={{ fontFamily: '"Fragment Mono",monospace', fontSize: 21, letterSpacing: 2, ...style }}>
      {children}
    </Copy>
  );
}
export function Anchor({
  x = 0,
  y = 0,
  size = 1,
  color = P.gold,
}: {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size})`}
      stroke={color}
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cy="-30" r="10" />
      <path d="M0 -20V50M-22 0H22M-46 24Q-37 49 0 50Q37 49 46 24M-46 24L-49 44M-46 24L-25 27M46 24L49 44M46 24L25 27" />
    </g>
  );
}
export function Compass({
  x = 1580,
  y = 760,
  r = 210,
  f = 0,
  dark = false,
}: {
  x?: number;
  y?: number;
  r?: number;
  f?: number;
  dark?: boolean;
}) {
  const color = dark ? P.ink : P.gold;
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <g transform={`translate(${x} ${y}) rotate(${f * 0.012})`} stroke={color} fill="none" opacity=".2">
        <circle r={r} />
        <circle r={r - 12} />
        {Array.from({ length: 32 }, (_, i) => (
          <path
            key={i}
            transform={`rotate(${i * 11.25})`}
            d={`M0 -${r - 4}V-${r - (i % 4 ? 15 : 34)}`}
            strokeWidth={i % 4 ? 1 : 2}
          />
        ))}
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path
              d={`M0 -${r * 0.8}L${r * 0.12} 0L0 ${r * 0.13}L-${r * 0.12} 0Z`}
              fill={a % 180 ? "none" : color}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
export function Paper() {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: P.paper }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="paper-grain" width="38" height="38" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="7" r=".8" fill={P.ink} opacity=".16" />
            <path d="M18 29h4" stroke={P.rust} opacity=".09" />
          </pattern>
        </defs>
        <rect width="1920" height="1080" fill="url(#paper-grain)" />
      </svg>
    </>
  );
}
export function Frame({ dark = false }: { dark?: boolean }) {
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <rect
        x="33"
        y="33"
        width="1854"
        height="1014"
        rx="4"
        fill="none"
        stroke={dark ? P.ink : P.gold}
        opacity=".45"
      />
      <path
        d="M33 91V33H91M1829 33H1887V91M1887 989V1047H1829M91 1047H33V989"
        fill="none"
        stroke={dark ? P.ink : P.gold}
        strokeWidth="3"
      />
    </svg>
  );
}
export function Sea({ f, dim = 0 }: { f: number; dim?: number }) {
  return (
    <>
      <Img
        src={sea}
        style={{
          position: "absolute",
          inset: -35,
          width: 1990,
          height: 1150,
          objectFit: "cover",
          transform: `scale(${1 + f * 0.00007}) translateX(${-f * 0.015}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg,rgba(9,32,39,${0.18 + dim}),rgba(9,32,39,${dim * 0.5}) 65%,transparent)`,
        }}
      />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((k) => {
          const y = 920 + k * 52;
          const d = Array.from(
            { length: 33 },
            (_, i) => `${i === 0 ? "M" : "L"}${i * 60} ${y + Math.sin(i * 0.55 + f * 0.035 - k) * 11}`,
          ).join(" ");
          return <path key={k} d={`${d}V1080H0Z`} fill={["#173c45", "#13333c", "#0b252d"][k]} opacity=".2" />;
        })}
      </svg>
    </>
  );
}
export function Mate({
  x = 1100,
  y = 210,
  width = 735,
  f = 0,
}: {
  x?: number;
  y?: number;
  width?: number;
  f?: number;
}) {
  return (
    <Img
      src={mate}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        filter: "drop-shadow(12px 15px 12px #071c2840)",
        transform: `translateY(${6 * Math.sin(f / 55)}px)`,
      }}
    />
  );
}
export function ShipIcon({
  x,
  y,
  s = 1,
  color = P.paper,
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinejoin="round"
    >
      <path d="M-53 20H60L42 45H-30Z" fill={color} fillOpacity=".17" />
      <path d="M0 -73V20M-35 4H-2V-58ZM7 -59L45 4H7Z" fill={color} fillOpacity=".7" />
      <path d="M-59 58q18 -9 37 0q18 9 37 0q18 -9 37 0" />
    </g>
  );
}

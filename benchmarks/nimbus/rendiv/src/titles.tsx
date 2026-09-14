import { Fill, spring, useFrame } from "@rendiv/core";
import type { CSSProperties, ReactNode } from "react";
import { CLOUD } from "../../shared/data.js";
import { BACK, EXPO, glow, INCUBIC, INOUT, INOUTCUBIC, QUINT, tween } from "./motion";

// A film-specific masked text treatment, composed with ordinary React styles.
export function Reveal({
  children,
  at = 0,
  duration = 26,
  className,
  style,
}: {
  children: ReactNode;
  at?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const p = tween(useFrame(), at, duration, QUINT);
  return (
    <div className={`reveal ${className ?? ""}`} style={style}>
      <span style={{ display: "block", transform: `translateY(${(1 - p) * 110}%)` }}>{children}</span>
    </div>
  );
}
export function Letters({
  at,
  each,
  duration,
  y,
  blur,
}: {
  at: number;
  each: number;
  duration: number;
  y: number;
  blur: number;
}) {
  const frame = useFrame();
  return (
    <span style={{ display: "inline-block" }}>
      {[..."NIMBUS"].map((ch, i) => {
        const p = tween(frame, at + i * each, duration, QUINT);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * y}px)`,
              filter: `blur(${(1 - p) * blur}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
export function Title() {
  const f = useFrame();
  const scan = -200 + 2300 * tween(f, 10, 60, INOUT);
  return (
    <Fill>
      <div className="title-center">
        <div
          className="display"
          style={{
            fontSize: 210,
            fontWeight: 800,
            ...glow("rgba(57,208,255,0.35)", 30),
          }}
        >
          <Letters at={8} each={4} duration={28} y={40} blur={14} />
        </div>
        <Reveal at={40}>
          <div className="eyebrow" style={{ fontSize: 24 }}>
            Edge observability · 41 regions
          </div>
        </Reveal>
      </div>
      <div className="scan" style={{ left: scan, ...glow("var(--cyan)", 12) }} />
      <div className="title-stats mono">
        {["12.4B req / day", "p99 · 88 ms", "0 blind spots"].map((s, i) => {
          const p = tween(f, 54 + i * 5, 20, EXPO);
          return (
            <span key={s} style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
              {s}
            </span>
          );
        })}
      </div>
    </Fill>
  );
}
export function End() {
  const f = useFrame();
  const pop = spring({
    frame: f - 4,
    fps: 30,
    config: { stiffness: 170, damping: 26 },
    durationInFrames: 30,
  });
  const edges = CLOUD.map((p, i) => [p, CLOUD[(i + 1) % CLOUD.length]]);
  edges.push([CLOUD[0], CLOUD[3]]);
  return (
    <Fill>
      <div className="end-center">
        <svg
          width={180}
          height={180}
          viewBox="0 0 100 100"
          style={{
            transform: `scale(${pop})`,
            ...glow("rgba(57,208,255,0.7)", 20),
          }}
        >
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - tween(f, 2 + i * 3, 36, INOUTCUBIC)}
              stroke="var(--cyan)"
              strokeWidth={2.5}
            />
          ))}
          {CLOUD.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={tween(f, 20 + i * 3, 14, BACK) * 4.5} fill="var(--cyan)" />
          ))}
        </svg>
        <div
          className="display"
          style={{
            fontSize: 150,
            fontWeight: 800,
            ...glow("rgba(57,208,255,0.3)", 26),
          }}
        >
          <Letters at={10} each={3} duration={26} y={30} blur={10} />
        </div>
        <Reveal at={30} duration={28} style={{ fontSize: 40, color: "var(--muted)" }}>
          See every request. Before your users do.
        </Reveal>
        <Reveal at={44} duration={24}>
          <div className="eyebrow" style={{ fontSize: 22 }}>
            nimbus.run · start free · 41 regions
          </div>
        </Reveal>
      </div>
      <Fill style={{ background: "#000", opacity: tween(f, 158, 22, INCUBIC) }} />
    </Fill>
  );
}

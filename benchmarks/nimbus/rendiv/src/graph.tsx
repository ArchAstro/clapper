import { Fill, useFrame } from "@rendiv/core";
import { EDGES, NODES } from "../../shared/data.js";
import { BACK, EXPO, glow, INOUT, tween } from "./motion";
import { Reveal } from "./titles";

export function Graph() {
  const frame = useFrame();
  const camera = tween(frame, 0, 195);
  const zoom = Math.pow(1.28, camera);
  return (
    <Fill>
      <div
        className="camera"
        style={{
          transform: `translate(960px,540px) scale(${zoom}) translate(${-960 - 20 * camera}px,${-540 + 20 * camera}px)`,
        }}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].p[0]}
              y1={NODES[a].p[1]}
              x2={NODES[b].p[0]}
              y2={NODES[b].p[1]}
              stroke="rgba(57,208,255,0.35)"
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - tween(frame, 4 + i * 3, 40, INOUT)}
            />
          ))}
          {EDGES.flatMap(([a, b], i) =>
            [0, 1].map((k) => {
              const speed = 0.011 + (i % 3) * 0.003;
              const t = (frame * speed + i * 0.37 + k * 0.5) % 1;
              const dir = (i + k) % 2 === 0 ? t : 1 - t;
              const color = k ? "var(--magenta)" : "var(--cyan)";
              return (
                <circle
                  key={`${i}-${k}`}
                  cx={NODES[a].p[0] + (NODES[b].p[0] - NODES[a].p[0]) * dir}
                  cy={NODES[a].p[1] + (NODES[b].p[1] - NODES[a].p[1]) * dir}
                  r={4}
                  fill={color}
                  opacity={tween(frame, 30 + i * 3, 10)}
                  style={glow(color, 8)}
                />
              );
            }),
          )}
          {NODES.map((n, i) => (
            <g
              key={n.id}
              transform={`translate(${n.p[0]} ${n.p[1]}) scale(${tween(frame, 10 + i * 4, 24, BACK)})`}
              style={glow("rgba(57,208,255,0.6)", 14)}
            >
              <circle r={n.hub ? 26 : 16} fill="var(--bg)" stroke="var(--cyan)" strokeWidth={n.hub ? 4 : 3} />
              <circle r={n.hub ? 9 : 5} fill="var(--cyan)" />
              {n.hub && (
                <circle
                  r={44}
                  fill="none"
                  stroke="var(--cyan)"
                  strokeWidth={1.5}
                  opacity={0.35 + 0.35 * Math.sin(frame / 6)}
                />
              )}
            </g>
          ))}
        </svg>
        {NODES.map((n, i) => {
          const p = tween(frame, 24 + i * 4, 16, EXPO);
          return (
            <div
              className="node-label mono"
              key={n.id}
              style={{
                left: n.p[0] + (n.hub ? 40 : 26),
                top: n.p[1] - 12,
                color: n.hub ? "var(--ink)" : "var(--muted)",
                opacity: p,
                transform: `translateY(${6 * (1 - p)}px)`,
              }}
            >
              {n.id}
              {n.hub && <span style={{ color: "var(--cyan)", marginLeft: 12 }}>hub</span>}
            </div>
          );
        })}
      </div>
      <div className="heading">
        <Reveal>
          <div className="eyebrow">Live topology</div>
        </Reveal>
        <Reveal at={6} duration={30} className="display headline">
          Every hop.
        </Reveal>
        <Reveal at={12} duration={30} className="display" style={{ fontSize: 64, color: "var(--muted)" }}>
          Every request.
        </Reveal>
      </div>
      <div className="graph-stats mono">
        {["req/s", "in flight", "errors"].map((label, i) => {
          const p = tween(frame, 48 + i * 6, 18, EXPO);
          const value = i === 0 ? 143820 * tween(frame, 48, 90, EXPO) : 2412 * tween(frame, 54, 80, EXPO);
          return (
            <div key={label} style={{ opacity: p, transform: `translateX(${(1 - p) * 12}px)` }}>
              {label}{" "}
              <span style={{ color: i === 2 ? "var(--green)" : "var(--ink)" }}>
                {i === 2 ? "0.01%" : Math.round(value).toLocaleString("en-US")}
              </span>
            </div>
          );
        })}
      </div>
    </Fill>
  );
}

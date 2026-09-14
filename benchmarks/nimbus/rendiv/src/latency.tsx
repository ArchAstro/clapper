import { Fill, interpolate, spring, useFrame } from "@rendiv/core";
import { EXPO, glow, INCUBIC, tween } from "./motion";
import { Reveal } from "./titles";

export function Latency() {
  const frame = useFrame();
  const alertAt = 58,
    fixAt = 100;
  const spike = interpolate(frame, [44, 58, 100, 126], [0, 1, 1, 0], {
    easing: EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const alertPop = spring({
    frame: frame - alertAt,
    fps: 30,
    config: { stiffness: 210, damping: 20 },
    durationInFrames: 14,
  });
  const exit = tween(frame, fixAt - 8, 15, INCUBIC);
  const recovery = spring({
    frame: frame - fixAt,
    fps: 30,
    config: { stiffness: 210, damping: 20 },
    durationInFrames: 16,
  });
  return (
    <Fill>
      <div className="heading">
        <Reveal>
          <div className="eyebrow">Latency · checkout · last 60 s</div>
        </Reveal>
        <Reveal at={6} duration={30} className="display headline">
          See it before they feel it.
        </Reveal>
      </div>
      <div className="latency-stats mono">
        {["p50", "p95", "p99"].map((label, i) => {
          const p = tween(frame, 10 + i * 5, 18, EXPO);
          return (
            <div key={label} style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
              <div className="metric-label">{label}</div>
              <div
                style={{
                  fontSize: 60,
                  color: i === 2 ? (spike > 0.5 ? "var(--magenta)" : "var(--green)") : "var(--ink)",
                }}
              >
                {Math.round(i === 2 ? 88 + spike * 236 : [41, 118][i] * tween(frame, 10 + i * 5, 60, EXPO))}
                <span style={{ fontSize: 24, color: "var(--muted)" }}> ms</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bars">
        {Array.from({ length: 28 }, (_, i) => {
          const base = 0.25 + 0.35 * Math.abs(Math.sin(i * 0.8 + 1.3));
          const hot = i >= 19 && i <= 24 ? spike * (0.5 + 0.1 * Math.sin(i)) : 0;
          const h = Math.min(1, base + hot) * tween(frame, 8 + i * 2, 24, EXPO);
          const isHot = hot > 0.15;
          return (
            <div
              key={i}
              className="bar"
              style={{
                height: `${h * 100}%`,
                background: isHot ? "var(--magenta)" : "var(--cyan)",
                opacity: isHot ? 0.95 : 0.55,
                ...(isHot ? glow("var(--magenta)", 14) : {}),
              }}
            />
          );
        })}
        <div className="slo" style={{ opacity: tween(frame, 30, 12) }}>
          <span className="mono">SLO · 250 ms</span>
        </div>
      </div>
      {frame >= alertAt && frame < 130 && (
        <div
          className="alert badge"
          style={{
            opacity: alertPop * (1 - exit),
            transform: `translateY(${16 * (1 - alertPop) - 10 * exit}px) scale(${0.9 + 0.1 * alertPop})`,
          }}
        >
          <span className="alert-dot" style={{ opacity: frame % 12 < 6 ? 1 : 0.3 }} />
          p99 breached SLO · us-east · checkout
        </div>
      )}
      {frame >= fixAt && (
        <div
          className="recovered badge"
          style={{
            opacity: recovery,
            transform: `translateY(${16 * (1 - recovery)}px) scale(${0.9 + 0.1 * recovery})`,
          }}
        >
          ↑ Auto-scaled +3 edge workers · recovered in 1.8 s
        </div>
      )}
    </Fill>
  );
}

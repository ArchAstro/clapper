import { Fill, useFrame } from "@rendiv/core";
import { LOG } from "../../shared/data.js";
import { EXPO, INOUT, tween } from "./motion";
import { Reveal } from "./titles";
import { Typed } from "./typewriter";

export function Trace() {
  const frame = useFrame();
  const zoomAt = 84;
  const camera = tween(frame, zoomAt, 30, INOUT);
  const push = tween(frame, zoomAt, 24, INOUT);
  const callout = tween(frame, zoomAt + 26, 16, EXPO);
  return (
    <Fill>
      <div
        className="camera"
        style={{
          transform: `translate(960px,540px) scale(${Math.pow(1.07, camera)}) translate(-960px,${-540 - 20 * camera}px)`,
        }}
      >
        <div className="heading">
          <Reveal>
            <div className="eyebrow">Request stream · us-east</div>
          </Reveal>
          <Reveal at={6} duration={30} className="display headline">
            Trace the one that hurt.
          </Reveal>
        </div>
        <div className="terminal">
          {LOG.map(([ts, code, path, ms, region], i) => {
            const highlight = i === 5;
            const error = code === "504";
            return (
              <div
                className="log-row mono"
                key={i}
                style={{
                  color: highlight ? "#fff" : "var(--muted)",
                  opacity: highlight ? 1 : 1 - 0.6 * push,
                  background: highlight ? `rgba(255,62,165,${0.12 + 0.14 * push})` : "transparent",
                  borderLeftColor: highlight ? "var(--magenta)" : "transparent",
                  textShadow: highlight ? `0 0 ${14 * push}px rgba(255,62,165,${0.6 * push})` : "none",
                  filter: highlight ? `brightness(${1 + 0.15 * push})` : "none",
                }}
              >
                <Typed text={ts} at={6 + i * 9} />
                <span
                  style={{
                    color: error || code === "trace" ? "var(--magenta)" : "var(--green)",
                  }}
                >
                  <Typed text={code} at={9 + i * 9} />
                </span>
                <span
                  style={{
                    color: highlight ? "var(--ink)" : undefined,
                    whiteSpace: "pre",
                  }}
                >
                  <Typed text={path} at={11 + i * 9} cursor={i === LOG.length - 1} />
                </span>
                <span
                  style={{
                    color: error ? "var(--magenta)" : undefined,
                    textAlign: "right",
                  }}
                >
                  <Typed text={ms} at={13 + i * 9} />
                </span>
                <span style={{ textAlign: "right" }}>
                  <Typed text={region} at={14 + i * 9} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="callout"
        style={{
          opacity: callout,
          transform: `translateY(${12 * (1 - callout)}px)`,
        }}
      >
        <span className="root-cause">root cause</span>
        <span>Cold start on fn:checkout. Pre-warm rule suggested.</span>
      </div>
    </Fill>
  );
}

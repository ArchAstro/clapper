import {
  AbsoluteFill,
  Alert,
  Animate,
  Arp,
  Camera,
  Chime,
  Counter,
  Draw,
  Easing,
  interpolate,
  Pad,
  Pop,
  progress,
  Riser,
  Sequence,
  SplitText,
  Stagger,
  Thump,
  TransitionSeries,
  Typewriter,
  useFrame,
  useSpring,
  Whoosh,
} from "@archastro/clapper-core";
import { EXPO, Eyebrow, Grain, INOUT, type Pt, QUINT, Reveal, Vignette } from "../kit";
import { TypeClicks } from "./typeclicks";

/**
 * NIMBUS — edge observability.
 * Dark grid, Unbounded display, glowing node graph with packets in flight,
 * latency histogram, terminal stream, arpeggiated synth bed. 26 s.
 */
const S1 = 105,
  S2 = 195,
  S3 = 150,
  S4 = 150,
  S5 = 180;
export const NIMBUS_LEN = S1 + S2 + S3 + S4 + S5 - 12 * 4;
const T = { type: "blur" as const, duration: 12, easing: INOUT };

export function Nimbus({ perf = {} }: { perf?: { grain?: boolean; vignette?: boolean; grid?: boolean } }) {
  const { grain = true, vignette = true, grid = true } = perf;
  return (
    <AbsoluteFill className="vid nimbus">
      {grid ? <GridBg /> : <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }} />}
      <Arp
        notes={["D3", "A3", "D4", "F4", "A4", "F4", "D4", "A3"]}
        step={5}
        repeat={Math.ceil(NIMBUS_LEN / 40)}
        volume={0.06}
        wave="triangle"
        decay={0.1}
        sustain={0.05}
        release={0.12}
      />
      <Pad
        notes={["D2", "A2"]}
        wave="sawtooth"
        at={0}
        durationInFrames={44}
        volume={0.014}
        fadeIn={20}
        fadeOut={8}
        name="pad-a"
      />
      <Pad
        notes={["D2", "A2"]}
        wave="sawtooth"
        at={40}
        durationInFrames={560}
        volume={0.03}
        fadeIn={12}
        fadeOut={24}
        name="pad-b"
      />
      <Pad
        notes={["D2", "A2"]}
        wave="sawtooth"
        at={596}
        volume={0.014}
        fadeIn={8}
        fadeOut={40}
        name="pad-c"
      />
      <TransitionSeries transition={T}>
        <TransitionSeries.Item durationInFrames={S1} name="1 · title">
          <Title />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S2} name="2 · graph">
          <Graph />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S3} name="3 · latency">
          <Latency />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S4} name="4 · trace">
          <Trace />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S5} name="5 · end">
          <End />
        </TransitionSeries.Item>
      </TransitionSeries>
      {vignette && <Vignette strength={0.7} color="#02030a" />}
      {grain && <Grain opacity={0.065} blend="screen" />}
    </AbsoluteFill>
  );
}

function GridBg() {
  const frame = useFrame();
  const drift = (frame * 0.25) % 60;
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }}>
      <div
        style={{
          position: "absolute",
          inset: -60,
          backgroundImage:
            "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          backgroundPosition: `${-drift}px ${-drift}px`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(60% 50% at 50% 40%, rgba(57,208,255,0.08), transparent 70%)",
        }}
      />
    </div>
  );
}

const glow = (c: string, s = 18) => ({ filter: `drop-shadow(0 0 ${s}px ${c})` });

/* ---------------------------------- 1 · title ---------------------------- */
function Title() {
  const frame = useFrame();
  const scan = interpolate(frame, [10, 70], [-200, 2100], { easing: INOUT });
  return (
    <AbsoluteFill>
      <Thump at={4} volume={0.5} from={90} to={35} />
      {[..."NIMBUS"].map((_, i) => (
        <Pop key={i} at={8 + i * 4} freq={1400 + i * 120} volume={0.12} name={`l${i}`} />
      ))}
      <Riser at={S1 - 36} durationInFrames={36} volume={0.16} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
        }}
      >
        <div
          className="display"
          style={{
            fontSize: 210,
            fontWeight: 800,
            color: "var(--ink)",
            ...glow("rgba(57,208,255,0.35)", 30),
          }}
        >
          <SplitText
            text="NIMBUS"
            by="char"
            each={4}
            at={8}
            duration={28}
            from={{ opacity: 0, y: 40, blur: 14 }}
            easing={QUINT}
          />
        </div>
        <Reveal at={40} duration={26}>
          <Eyebrow color="var(--cyan)" style={{ fontSize: 24 }}>
            Edge observability · 41 regions
          </Eyebrow>
        </Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: scan,
          width: 3,
          background: "linear-gradient(transparent, var(--cyan), transparent)",
          opacity: 0.9,
          ...glow("var(--cyan)", 12),
        }}
      />
      <div style={{ position: "absolute", left: 120, bottom: 90, display: "flex", gap: 60 }}>
        <Stagger each={5} at={54} duration={20} from={{ opacity: 0, y: 10 }}>
          {["12.4B req / day", "p99 · 88 ms", "0 blind spots"].map((s) => (
            <span key={s} className="mono" style={{ fontSize: 22, color: "var(--muted)" }}>
              {s}
            </span>
          ))}
        </Stagger>
      </div>
    </AbsoluteFill>
  );
}

/* ---------------------------------- 2 · graph ---------------------------- */
const NODES: { id: string; p: Pt; hub?: boolean }[] = [
  { id: "us-east", p: [960, 540], hub: true },
  { id: "us-west", p: [420, 380] },
  { id: "eu-west", p: [1380, 300] },
  { id: "eu-central", p: [1560, 620] },
  { id: "ap-south", p: [1240, 860] },
  { id: "sa-east", p: [560, 800] },
  { id: "ca-central", p: [820, 150] },
];
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [2, 6],
  [3, 4],
  [4, 5],
  [2, 3],
  [1, 5],
];

function Graph() {
  const frame = useFrame();
  return (
    <AbsoluteFill>
      <Whoosh at={0} volume={0.12} from={300} to={2200} />
      <Chime at={60} notes={["D5", "A5"]} spacing={4} volume={0.12} />
      <Camera
        keyframes={[
          { frame: 0, zoom: 1.0 },
          { frame: S2, x: 980, y: 520, zoom: 1.28, easing: Easing.linear },
        ]}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Draw at={4} duration={40} each={3} easing={INOUT}>
            {EDGES.map(([a, b], i) => (
              <line
                key={i}
                x1={NODES[a].p[0]}
                y1={NODES[a].p[1]}
                x2={NODES[b].p[0]}
                y2={NODES[b].p[1]}
                stroke="rgba(57,208,255,0.35)"
                strokeWidth={2}
              />
            ))}
          </Draw>
          {/* packets */}
          {EDGES.map(([a, b], i) =>
            [0, 1].map((k) => {
              const speed = 0.011 + (i % 3) * 0.003;
              const t = (frame * speed + i * 0.37 + k * 0.5) % 1;
              const dir = (i + k) % 2 === 0 ? t : 1 - t;
              const x = NODES[a].p[0] + (NODES[b].p[0] - NODES[a].p[0]) * dir;
              const y = NODES[a].p[1] + (NODES[b].p[1] - NODES[a].p[1]) * dir;
              const on = progress(frame, 30 + i * 3, 10);
              return (
                <circle
                  key={`${i}-${k}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={k ? "var(--magenta)" : "var(--cyan)"}
                  opacity={on}
                  style={glow(k ? "var(--magenta)" : "var(--cyan)", 8)}
                />
              );
            }),
          )}
          {NODES.map((n, i) => {
            const s = progress(frame, 10 + i * 4, 24, Easing.outBack);
            return (
              <g
                key={n.id}
                transform={`translate(${n.p[0]} ${n.p[1]}) scale(${s})`}
                style={glow("rgba(57,208,255,0.6)", 14)}
              >
                <circle
                  r={n.hub ? 26 : 16}
                  fill="var(--bg)"
                  stroke="var(--cyan)"
                  strokeWidth={n.hub ? 4 : 3}
                />
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
            );
          })}
        </svg>
        {NODES.map((n, i) => (
          <Animate
            key={n.id}
            from={{ opacity: 0, y: 6 }}
            at={24 + i * 4}
            duration={16}
            className="mono"
            style={{
              position: "absolute",
              left: n.p[0] + (n.hub ? 40 : 26),
              top: n.p[1] - 12,
              fontSize: 20,
              color: n.hub ? "var(--ink)" : "var(--muted)",
              letterSpacing: "0.06em",
            }}
          >
            {n.id}
            {n.hub && <span style={{ color: "var(--cyan)", marginLeft: 12 }}>hub</span>}
          </Animate>
        ))}
      </Camera>
      <div style={{ position: "absolute", left: 120, top: 100 }}>
        <Reveal at={0} duration={26}>
          <Eyebrow color="var(--cyan)">Live topology</Eyebrow>
        </Reveal>
        <Reveal at={6} duration={30} className="display" style={{ fontSize: 64, marginTop: 14 }}>
          Every hop.
        </Reveal>
        <Reveal at={12} duration={30} className="display" style={{ fontSize: 64, color: "var(--muted)" }}>
          Every request.
        </Reveal>
      </div>
      <div
        className="mono"
        style={{
          position: "absolute",
          right: 120,
          top: 100,
          textAlign: "right",
          fontSize: 22,
          color: "var(--muted)",
          lineHeight: 1.8,
        }}
      >
        <Stagger each={6} at={48} duration={18} from={{ opacity: 0, x: 12 }}>
          <div>
            req/s{" "}
            <span style={{ color: "var(--ink)" }}>
              <Counter to={143_820} at={48} duration={90} format={(n) => Math.round(n).toLocaleString()} />
            </span>
          </div>
          <div>
            in flight{" "}
            <span style={{ color: "var(--ink)" }}>
              <Counter to={2_412} at={54} duration={80} format={(n) => Math.round(n).toLocaleString()} />
            </span>
          </div>
          <div>
            errors <span style={{ color: "var(--green)" }}>0.01%</span>
          </div>
        </Stagger>
      </div>
    </AbsoluteFill>
  );
}

/* --------------------------------- 3 · latency --------------------------- */
const BARS = 28;
function Latency() {
  const frame = useFrame();
  const alertAt = 58,
    fixAt = 100;
  const spike = interpolate(frame, [alertAt - 14, alertAt, fixAt, fixAt + 26], [0, 1, 1, 0], {
    easing: EXPO,
  });
  return (
    <AbsoluteFill>
      <Whoosh at={0} volume={0.1} />
      <Alert at={alertAt} volume={0.28} />
      <Thump at={alertAt} volume={0.35} from={100} to={40} />
      <Pop at={fixAt} freq={900} volume={0.2} />
      <Whoosh at={fixAt - 8} durationInFrames={8} from={2000} to={400} volume={0.1} name="alert-out" />
      <Chime at={fixAt + 8} notes={["D5", "F#5", "A5"]} spacing={3} volume={0.16} />
      <div style={{ position: "absolute", left: 120, top: 100 }}>
        <Reveal at={0} duration={26}>
          <Eyebrow color="var(--cyan)">Latency · checkout · last 60 s</Eyebrow>
        </Reveal>
        <Reveal at={6} duration={30} className="display" style={{ fontSize: 64, marginTop: 14 }}>
          See it before they feel it.
        </Reveal>
      </div>
      <div
        className="mono"
        style={{ position: "absolute", right: 120, top: 100, display: "flex", gap: 64, textAlign: "right" }}
      >
        {(
          [
            ["p50", 41, "var(--ink)"],
            ["p95", 118, "var(--ink)"],
            ["p99", 0, "var(--magenta)"],
          ] as const
        ).map(([k, v, c], i) => (
          <Animate key={String(k)} from={{ opacity: 0, y: 8 }} at={10 + i * 5} duration={18}>
            <div style={{ fontSize: 20, color: "var(--muted)", letterSpacing: "0.1em" }}>{k}</div>
            <div
              style={{
                fontSize: 60,
                color: k === "p99" ? (spike > 0.5 ? "var(--magenta)" : "var(--green)") : c,
              }}
            >
              {k === "p99" ? (
                Math.round(88 + spike * 236)
              ) : (
                <Counter to={Number(v)} at={10 + i * 5} duration={60} />
              )}
              <span style={{ fontSize: 24, color: "var(--muted)" }}> ms</span>
            </div>
          </Animate>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 380,
          bottom: 230,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        {Array.from({ length: BARS }, (_, i) => {
          const base = 0.25 + 0.35 * Math.abs(Math.sin(i * 0.8 + 1.3));
          const hot = i >= BARS - 9 && i <= BARS - 4 ? spike * (0.5 + 0.1 * Math.sin(i)) : 0;
          const h = Math.min(1, base + hot) * progress(frame, 8 + i * 2, 24, EXPO);
          const isHot = hot > 0.15;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                borderRadius: 6,
                background: isHot ? "var(--magenta)" : "var(--cyan)",
                opacity: isHot ? 0.95 : 0.55,
                ...(isHot ? glow("var(--magenta)", 14) : {}),
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "38%",
            height: 1,
            borderTop: "2px dashed rgba(255,62,165,0.6)",
            opacity: progress(frame, 30, 12),
          }}
        >
          <span
            className="mono"
            style={{
              position: "absolute",
              right: 0,
              top: -30,
              fontSize: 18,
              color: "var(--magenta)",
              letterSpacing: "0.1em",
            }}
          >
            SLO · 250 ms
          </span>
        </div>
      </div>
      <Sequence from={alertAt} durationInFrames={fixAt - alertAt + 30} layout="none" name="alert">
        <Animate
          from={{ opacity: 0, y: 16, scale: 0.9 }}
          duration={14}
          spring="stiff"
          exit={{ opacity: 0, y: -10 }}
          exitAt={fixAt - alertAt - 8}
          style={{
            position: "absolute",
            left: 120,
            bottom: 90,
            background: "var(--magenta)",
            color: "#1a0410",
            padding: "18px 26px",
            borderRadius: 12,
            fontSize: 26,
            fontWeight: 700,
            display: "flex",
            gap: 16,
            alignItems: "center",
            ...glow("rgba(255,62,165,0.5)", 24),
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#1a0410",
              opacity: frame % 12 < 6 ? 1 : 0.3,
            }}
          />{" "}
          p99 breached SLO · us-east · checkout
        </Animate>
      </Sequence>
      <Sequence from={fixAt} layout="none" name="autoscale">
        <Animate
          from={{ opacity: 0, y: 16, scale: 0.9 }}
          duration={16}
          spring="stiff"
          style={{
            position: "absolute",
            right: 120,
            bottom: 90,
            background: "var(--green)",
            color: "#03150b",
            padding: "18px 26px",
            borderRadius: 12,
            fontSize: 26,
            fontWeight: 700,
            ...glow("rgba(61,255,154,0.45)", 24),
          }}
        >
          ↑ Auto-scaled +3 edge workers · recovered in 1.8 s
        </Animate>
      </Sequence>
    </AbsoluteFill>
  );
}

/* ---------------------------------- 4 · trace ---------------------------- */
const LOG = [
  ["11:42:07.114", "200", "GET  /api/cart            ", "41 ms", "us-east"],
  ["11:42:07.118", "200", "GET  /api/products?limit=24", "38 ms", "eu-west"],
  ["11:42:07.131", "201", "POST /api/checkout        ", "212 ms", "us-east"],
  ["11:42:07.133", "200", "GET  /api/session         ", "12 ms", "ap-south"],
  ["11:42:07.140", "504", "POST /api/checkout        ", "3,104 ms", "us-east"],
  ["11:42:07.141", "trace", "cold start detected · fn:checkout · 2.9 s", "", ""],
  ["11:42:07.160", "200", "GET  /api/cart            ", "44 ms", "us-west"],
  ["11:42:07.171", "200", "GET  /api/products?limit=24", "36 ms", "eu-central"],
];
function Trace() {
  const frame = useFrame();
  const hl = 5;
  const zoomAt = 84;
  return (
    <AbsoluteFill>
      <Whoosh at={0} volume={0.1} />
      <Whoosh at={zoomAt} volume={0.1} from={500} to={2600} />
      <Thump at={zoomAt + 4} volume={0.35} />
      {LOG.map((l, i) => (
        <TypeClicks key={i} text={l.join(" ")} at={6 + i * 9} cps={110} every={4} volume={0.05} />
      ))}
      <Camera
        keyframes={[
          { frame: 0, zoom: 1 },
          { frame: zoomAt, zoom: 1 },
          { frame: zoomAt + 30, x: 960, y: 560, zoom: 1.07, easing: INOUT },
        ]}
      >
        <div style={{ position: "absolute", left: 120, top: 100 }}>
          <Reveal at={0} duration={26}>
            <Eyebrow color="var(--cyan)">Request stream · us-east</Eyebrow>
          </Reveal>
          <Reveal at={6} duration={30} className="display" style={{ fontSize: 64, marginTop: 14 }}>
            Trace the one that hurt.
          </Reveal>
        </div>
        <div
          style={{
            position: "absolute",
            left: 200,
            right: 200,
            top: 300,
            borderRadius: 18,
            border: "1px solid rgba(57,208,255,0.18)",
            background: "rgba(10,15,28,0.85)",
            padding: "20px 0",
          }}
        >
          {LOG.map(([ts, code, path, ms, region], i) => {
            const isHl = i === hl;
            const isErr = code === "504";
            const push = progress(frame, zoomAt, 24, INOUT);
            const dim = isHl ? 1 : 1 - 0.6 * push;
            return (
              <div
                key={i}
                className="mono"
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 90px 1fr 160px 180px",
                  padding: "0 34px",
                  height: 62,
                  alignItems: "center",
                  fontSize: 24,
                  whiteSpace: "nowrap",
                  color: isHl ? "#ffffff" : "var(--muted)",
                  background: isHl ? `rgba(255,62,165,${0.12 + 0.14 * push})` : "transparent",
                  borderLeft: isHl ? "4px solid var(--magenta)" : "4px solid transparent",
                  opacity: dim,
                  textShadow: isHl ? `0 0 ${14 * push}px rgba(255,62,165,${0.6 * push})` : "none",
                  filter: isHl ? `brightness(${1 + 0.15 * push})` : "none",
                }}
              >
                <Typewriter text={ts} at={6 + i * 9} cps={110} cursor={false} />
                <span
                  style={{
                    color: isErr ? "var(--magenta)" : code === "trace" ? "var(--magenta)" : "var(--green)",
                  }}
                >
                  <Typewriter text={code} at={9 + i * 9} cps={110} cursor={false} />
                </span>
                <span style={{ color: isHl ? "var(--ink)" : undefined, whiteSpace: "pre" }}>
                  <Typewriter
                    text={path}
                    at={11 + i * 9}
                    cps={110}
                    cursor={i === LOG.length - 1}
                    cursorAfter
                  />
                </span>
                <span style={{ color: isErr ? "var(--magenta)" : undefined, textAlign: "right" }}>
                  <Typewriter text={ms} at={13 + i * 9} cps={110} cursor={false} />
                </span>
                <span style={{ textAlign: "right" }}>
                  <Typewriter text={region} at={14 + i * 9} cps={110} cursor={false} />
                </span>
              </div>
            );
          })}
        </div>
      </Camera>
      <Sequence from={zoomAt + 26} layout="none" name="callout">
        <Animate
          from={{ opacity: 0, y: 12 }}
          duration={16}
          style={{
            position: "absolute",
            left: 120,
            bottom: 90,
            display: "flex",
            gap: 18,
            alignItems: "center",
            fontSize: 26,
          }}
        >
          <span
            style={{
              background: "var(--magenta)",
              color: "#1a0410",
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            root cause
          </span>
          <span style={{ color: "var(--ink)" }}>Cold start on fn:checkout. Pre-warm rule suggested.</span>
        </Animate>
      </Sequence>
    </AbsoluteFill>
  );
}

/* ----------------------------------- 5 · end ----------------------------- */
const CLOUD: Pt[] = [
  [50, 62],
  [32, 52],
  [42, 34],
  [64, 30],
  [78, 46],
  [72, 62],
];
function End() {
  const frame = useFrame();
  const pop = useSpring({ delay: 4, config: "smooth", durationInFrames: 30 });
  const fade = progress(frame, S5 - 22, 22, Easing.inCubic);
  return (
    <AbsoluteFill>
      <Thump at={2} volume={0.5} from={100} to={36} />
      <Chime at={12} notes={["D4", "F#4", "A4", "D5", "F#5"]} spacing={3} volume={0.22} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
        }}
      >
        <svg
          width={180}
          height={180}
          viewBox="0 0 100 100"
          style={{ transform: `scale(${pop})`, ...glow("rgba(57,208,255,0.7)", 20) }}
        >
          <Draw at={2} duration={36} each={3}>
            {CLOUD.map((p, i) => {
              const q = CLOUD[(i + 1) % CLOUD.length];
              return (
                <line
                  key={i}
                  x1={p[0]}
                  y1={p[1]}
                  x2={q[0]}
                  y2={q[1]}
                  stroke="var(--cyan)"
                  strokeWidth={2.5}
                />
              );
            })}
            <line
              x1={CLOUD[0][0]}
              y1={CLOUD[0][1]}
              x2={CLOUD[3][0]}
              y2={CLOUD[3][1]}
              stroke="var(--cyan)"
              strokeWidth={2.5}
            />
          </Draw>
          {CLOUD.map((p, i) => (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={progress(frame, 20 + i * 3, 14, Easing.outBack) * 4.5}
              fill="var(--cyan)"
            />
          ))}
        </svg>
        <div
          className="display"
          style={{ fontSize: 150, fontWeight: 800, ...glow("rgba(57,208,255,0.3)", 26) }}
        >
          <SplitText
            text="NIMBUS"
            by="char"
            each={3}
            at={10}
            duration={26}
            from={{ opacity: 0, y: 30, blur: 10 }}
            easing={QUINT}
          />
        </div>
        <Reveal at={30} duration={28} style={{ fontSize: 40, color: "var(--muted)", fontWeight: 500 }}>
          See every request. Before your users do.
        </Reveal>
        <Reveal at={44} duration={24}>
          <Eyebrow color="var(--cyan)" style={{ fontSize: 22 }}>
            nimbus.run · start free · 41 regions
          </Eyebrow>
        </Reveal>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
}

import {
  AbsoluteFill,
  Animate,
  Camera,
  Chord,
  Counter,
  Draw,
  Drone,
  Easing,
  EPiano,
  Img,
  interpolate,
  noise1d,
  Pattern,
  Pluck,
  progress,
  Riser,
  RoomTone,
  Sequence,
  SpringPresets,
  spring,
  staticFile,
  Thump,
  Tone,
  TransitionSeries,
  Typewriter,
  Typing,
  transitionSeriesLength,
  useFps,
  useFrame,
  Whoosh,
} from "@clapper/core";
import type { ReactNode } from "react";
import { Eyebrow, Grain, INOUT, QUINT, Reveal, Vignette } from "../kit";
import { Archie, type ArchieState, Desk, Person, POSES, type Pose, usePose } from "./person";

/**
 * ARCHDEV — "One of you." A developer at a terminal, drowning in a 4,812-line
 * plan and twelve agents, until the overseer takes the run. 36 s.
 */
const S1 = 100,
  S2 = 220,
  S3 = 240,
  S4 = 150,
  S5 = 270,
  S6 = 100;
const HARD = { type: "none" as const, duration: 0 };
const T_BLUR = { type: "blur" as const, duration: 12, easing: INOUT };
export const ARCHDEV_LEN = transitionSeriesLength(
  [
    { durationInFrames: S1 },
    { durationInFrames: S2 },
    { durationInFrames: S3 },
    { durationInFrames: S4 },
    { durationInFrames: S5 },
    { durationInFrames: S6, transition: T_BLUR },
  ],
  HARD,
);

export function ArchDev() {
  return (
    <AbsoluteFill className="vid archdev">
      <TransitionSeries transition={HARD}>
        <TransitionSeries.Item durationInFrames={S1} name="1 · open">
          <Open />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S2} name="2 · the plan">
          <Plan />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S3} name="3 · the agents">
          <Agents />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S4} name="4 · the blank">
          <Blank />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S5} name="5 · archdev">
          <Overseer />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S6} name="6 · end" transition={T_BLUR}>
          <End />
        </TransitionSeries.Item>
      </TransitionSeries>
      <Grain opacity={0.05} blend="screen" />
    </AbsoluteFill>
  );
}

/* ------------------------------ furniture ------------------------------- */

export function Room({ children, dark = 0 }: { children?: ReactNode; dark?: number }) {
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(90% 70% at 50% 62%, #2a3237 0%, #1e2326 55%, #171b1e 100%)` }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(211,198,170,0.035) 0 1px, transparent 1px 4px)",
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 866,
          height: 1,
          background: "rgba(211,198,170,0.12)",
        }}
      />
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#0f1214",
          opacity: dark,
          pointerEvents: "none",
        }}
      />
      <Vignette strength={0.55} color="#0d1012" />
    </AbsoluteFill>
  );
}

export const DESK = { x: 960, y: 730, s: 1.45 };

/** Person + desk + laptop, all in one place so layering is right. */
export function Workstation({
  pose,
  typing = 0,
  screen,
  x = DESK.x,
  y = DESK.y,
  s = DESK.s,
  screenGlow = 1,
}: {
  pose: Pose;
  typing?: number;
  screen?: ReactNode;
  x?: number;
  y?: number;
  s?: number;
  screenGlow?: number;
}) {
  const sw = 172 * s,
    sh = 96 * s;
  const left = x - sw / 2,
    top = y - 104 * s;
  return (
    <>
      {/* screen light on the face */}
      <div
        style={{
          position: "absolute",
          left: x - 340,
          top: y - 640,
          width: 680,
          height: 620,
          background: "radial-gradient(closest-side, rgba(167,192,128,0.15), transparent)",
          opacity: screenGlow,
          pointerEvents: "none",
        }}
      />
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 6 }}
      >
        <Person pose={pose} x={x} y={y} scale={s} typing={typing} />
        <Desk x={x} y={y} scale={s} />
      </svg>
      {/* laptop base */}
      <div
        style={{
          position: "absolute",
          left: x - sw / 2 - 6 * s,
          top: y - 9 * s,
          width: sw + 12 * s,
          height: 9 * s,
          background: "#343f44",
          borderRadius: "0 0 6px 6px",
          borderTop: "1.5px solid rgba(211,198,170,0.5)",
          zIndex: 6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: sw,
          height: sh,
          background: "#232a2e",
          border: "2px solid #4f585e",
          borderRadius: 8,
          boxShadow: "0 0 0 3px #1a1f22, 0 18px 40px rgba(0,0,0,0.45)",
          padding: 8 * s,
          overflow: "hidden",
          fontSize: 8.4 * s,
          lineHeight: 1.45,
          color: "#d3c6aa",
          transform: "perspective(900px) rotateX(5deg)",
          transformOrigin: "bottom center",
          zIndex: 6,
        }}
      >
        {screen}
      </div>
    </>
  );
}

export function Copy({
  children,
  at,
  muted = false,
  accent = false,
  exitAt,
  size = 56,
  top = 820,
  plate = false,
  z,
}: {
  children: ReactNode;
  at: number;
  muted?: boolean;
  accent?: boolean;
  exitAt?: number;
  size?: number;
  top?: number;
  plate?: boolean;
  z?: number;
}) {
  const color = accent ? "var(--amber)" : muted ? "var(--muted)" : "var(--fg)";
  return (
    <Reveal
      at={at}
      duration={26}
      exitAt={exitAt}
      className="display"
      style={{ position: "absolute", left: plate ? 100 : 120, top, fontSize: size, color, zIndex: z }}
    >
      {plate ? (
        <span
          style={{
            display: "inline-block",
            padding: "6px 20px",
            background: "rgba(30,35,38,0.9)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          {children}
        </span>
      ) : (
        children
      )}
    </Reveal>
  );
}

export function Clock({ time, at = 0 }: { time: string; at?: number }) {
  return (
    <Animate
      from={{ opacity: 0 }}
      at={at}
      duration={10}
      className="mono"
      style={{
        position: "absolute",
        right: 120,
        top: 92,
        fontSize: 22,
        color: "var(--muted)",
        letterSpacing: "0.12em",
      }}
    >
      {time}
    </Animate>
  );
}

export const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

/* --------------------------------- 1 · open ------------------------------ */
export function Open({
  bed = true,
  zoom = 1,
  hook = false,
}: {
  bed?: boolean;
  zoom?: number;
  hook?: boolean;
}) {
  const frame = useFrame();
  const pose = usePose([
    { frame: 0, pose: POSES.typing },
    { frame: 30, pose: POSES.typing },
    {
      frame: 40,
      pose: { ...POSES.typing, headTurn: 0.45, headTilt: -4, pupilX: 0.9, pupilY: -0.5 },
      easing: Easing.outCubic,
    },
    { frame: 56, pose: { ...POSES.typing, headTurn: 0.45, headTilt: -4, pupilX: 0.9, pupilY: -0.5 } },
    { frame: 66, pose: POSES.typing, easing: Easing.inOutCubic },
    { frame: 80, pose: { ...POSES.typing, headTilt: 12, mouth: 0.6 }, easing: Easing.outBack },
    { frame: 92, pose: { ...POSES.typing, headTilt: 6, mouth: 0.45 } },
  ]);
  const cmd = "archdev run --agents 12";
  const typeAt = hook ? 2 : 16;
  const claimAt = hook ? 60 : 74;
  return (
    <Room>
      {bed && (
        <>
          <RoomTone volume={0.022} />
          <Drone notes={["D2"]} volume={0.03} cutoff={300} fadeIn={24} fadeOut={12} />
          <Pattern
            bpm={84}
            step={0.5}
            at={4}
            steps="D3 . A3 . D4 . F4 . E4 . A3 . D4 . C4 ."
            wave="pluck"
            brightness={0.35}
            volume={0.2}
            reverb={0.35}
            width={0.3}
          />
        </>
      )}
      <Typing text={cmd} at={typeAt} cps={26} volume={0.2} />
      <EPiano note="A4" at={claimAt} ring={1.6} volume={0.16} reverb={0.45} />
      <Camera keyframes={[{ frame: 0, x: 960, y: 560, zoom }]}>
        <Workstation
          pose={pose}
          typing={frame >= typeAt - 2 && frame < claimAt - 4 ? 1 : 0}
          screen={
            <div className="mono">
              <div style={{ color: "var(--muted)" }}>~/work/acme</div>
              <div>
                <span style={{ color: "var(--green)" }}>$ </span>
                <Typewriter text={cmd} at={typeAt} cps={26} cursorAfter={false} />
              </div>
              <Sequence from={claimAt} layout="none" name="claimed">
                <div style={{ color: "var(--green)" }}>✓ 12 agents claimed 12 tasks</div>
                <div style={{ color: "var(--muted)" }}>overseer attached · worktrees ready</div>
              </Sequence>
            </div>
          }
        />
      </Camera>
      <Animate
        from={{ opacity: 0 }}
        at={hook ? 0 : 4}
        duration={hook ? 4 : 12}
        style={{ position: "absolute", left: 120, top: 92 }}
      >
        <Eyebrow color="var(--muted)" style={hook ? { fontSize: 26 } : undefined}>
          {hook ? "22:47 · tonight" : "22:47 · one developer · twelve agents · one plan"}
        </Eyebrow>
      </Animate>
      {hook && (
        <>
          <Copy at={6} exitAt={78} size={60} z={8}>
            One developer. Twelve agents.
          </Copy>
        </>
      )}
      <Clock time={`22:47:${String(10 + Math.floor(frame / 30)).padStart(2, "0")}`} at={4} />
    </Room>
  );
}

/* ------------------------------- 2 · the plan ---------------------------- */
const PLAN_LINES = (() => {
  const out: { t: string; k: "h" | "li" | "todo" | "q" | "p" | "code" }[] = [];
  const topics = [
    "Migrations",
    "Auth rewrite",
    "Billing edge cases",
    "Search relevance",
    "Notifications",
    "Rollback plan",
    "Open questions",
    "Notes from Tuesday",
    "Notes from the other Tuesday",
  ];
  for (let i = 0; i < 160; i++) {
    const m = i % 9;
    if (m === 0)
      out.push({ t: `## ${Math.floor(i / 9) + 1}. ${topics[Math.floor(i / 9) % topics.length]}`, k: "h" });
    else if (m === 1)
      out.push({
        t: `- [ ] backfill ${["users", "orgs", "invoices", "sessions", "events"][i % 5]} (see notes ${40 + (i % 13)})`,
        k: "todo",
      });
    else if (m === 2)
      out.push({
        t: `- [x] ${["draft", "review", "revisit", "re-review"][i % 4]} the ${["schema", "flags", "queue", "retry policy"][i % 4]}`,
        k: "li",
      });
    else if (m === 3)
      out.push({
        t: `> decision 2026-08-${String(4 + (i % 24)).padStart(2, "0")}: keep both, decide later`,
        k: "q",
      });
    else if (m === 4)
      out.push({
        t: `see also: ${["PLAN-v2.md", "notes/47.md", "the thread", "Slack, somewhere"][i % 4]}`,
        k: "p",
      });
    else if (m === 5) out.push({ t: "```", k: "code" });
    else if (m === 6)
      out.push({
        t: `${["retry", "backoff", "claim", "release"][i % 4]}(task_${100 + i}) // TODO(${["ana", "sam", "me", "?"][i % 4]})`,
        k: "code",
      });
    else if (m === 7) out.push({ t: "```", k: "code" });
    else
      out.push({
        t: `- [ ] ${["ask", "confirm", "remember to", "did we"][i % 4]} ${["migrate", "unmigrate", "re-migrate", "document"][i % 4]} this`,
        k: "todo",
      });
  }
  return out;
})();

export function Sheet({ height, width = 340 }: { height: number; width?: number }) {
  const lineH = 19;
  const visible = Math.min(PLAN_LINES.length, Math.ceil(height / lineH));
  return (
    <div
      style={{
        position: "absolute",
        left: 520,
        bottom: 1080 - 600,
        width,
        height,
        background: "linear-gradient(180deg, #2d353b, #272e33)",
        border: "1px solid #4f585e",
        borderBottom: "none",
        borderRadius: "10px 10px 0 0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        overflow: "hidden",
        padding: "14px 18px",
        fontSize: 13,
        lineHeight: `${lineH}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        WebkitMaskImage: "linear-gradient(90deg, #000 82%, transparent 98%)",
        maskImage: "linear-gradient(90deg, #000 82%, transparent 98%)",
      }}
    >
      {PLAN_LINES.slice(0, visible).map((l, i) => (
        <div
          key={i}
          style={{
            whiteSpace: "nowrap",
            color:
              l.k === "h"
                ? "var(--green)"
                : l.k === "q"
                  ? "var(--muted)"
                  : l.k === "code"
                    ? "var(--blue)"
                    : l.k === "todo"
                      ? "var(--yellow)"
                      : "var(--fg)",
            opacity: l.k === "q" || l.k === "p" ? 0.7 : 0.92,
            fontWeight: l.k === "h" ? 700 : 400,
          }}
        >
          {l.t}
        </div>
      ))}
    </div>
  );
}

export function Plan({ bed = true, zoomStart = 1 }: { bed?: boolean; zoomStart?: number }) {
  const frame = useFrame();
  const pose = usePose([
    { frame: 0, pose: POSES.typing },
    { frame: 18, pose: POSES.reading },
    { frame: 34, pose: POSES.lookUp, easing: Easing.outBack },
    { frame: 80, pose: POSES.lookUpMore },
    { frame: 130, pose: POSES.lookUpMore },
    { frame: 156, pose: POSES.slumped, easing: Easing.inOutQuint },
  ]);
  const sheetH = interpolate(frame, [8, 60, 150], [0, 1400, 2600], { easing: Easing.inOutCubic });
  const ticks: number[] = [];
  for (let f = 12; f < 150; f += 3) ticks.push(f);
  return (
    <Room>
      {bed && (
        <>
          <Thump at={0} volume={0.3} from={90} to={30} />
          <RoomTone volume={0.02} />
          <Drone notes={["D2", "A2"]} volume={0.03} cutoff={260} fadeIn={0} fadeOut={20} />
          <Pattern
            bpm={84}
            step={0.5}
            at={6}
            steps="D4 . C4 . A3 . G3 . F3 . E3 . D3 . C3 . D3 . . . A2 . . ."
            wave="pluck"
            brightness={0.3}
            volume={0.2}
            reverb={0.4}
            width={0.3}
            repeat={2}
          />
        </>
      )}
      <Whoosh at={6} from={200} to={1400} volume={0.1} />
      <Riser at={40} durationInFrames={110} volume={0.11} from={150} to={2600} />
      {ticks.map((f, i) => (
        <Tone
          key={f}
          at={f}
          durationInFrames={2}
          freq={1100 + (i % 4) * 150}
          wave="noise"
          attack={0.001}
          decay={0.018}
          sustain={0}
          release={0.01}
          volume={0.02 + (i / ticks.length) * 0.025}
          pan={-0.35}
          name={`pl${f}`}
        />
      ))}
      <Thump at={156} volume={0.5} from={110} to={38} />
      <Pluck note="D2" at={156} ring={3} brightness={0.3} volume={0.34} reverb={0.5} />
      <Camera
        keyframes={[
          { frame: 0, x: 960, y: zoomStart === 1 ? 540 : 560, zoom: zoomStart },
          { frame: 24, x: 960, y: zoomStart === 1 ? 540 : 560, zoom: zoomStart },
          { frame: 120, x: 960, y: 470, zoom: 0.74, easing: INOUT },
        ]}
      >
        <div
          style={{
            position: "absolute",
            left: -700,
            right: -700,
            top: -1400,
            bottom: -300,
            background: "radial-gradient(60% 40% at 50% 60%, #262e33, #1e2326 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -700,
            right: -700,
            top: 866,
            height: 1,
            background: "rgba(211,198,170,0.12)",
          }}
        />
        <Sheet height={sheetH} />
        <Workstation
          pose={pose}
          typing={frame < 16 ? 1 : 0}
          screen={
            <div className="mono">
              <div style={{ color: "var(--muted)" }}>PLAN.md</div>
              <div style={{ color: "var(--green)" }}>## 1. Migrations</div>
              <div>- [ ] backfill users…</div>
            </div>
          }
        />
      </Camera>
      <Animate from={{ opacity: 0 }} at={0} duration={8} style={{ position: "absolute", left: 120, top: 92 }}>
        <Eyebrow color="var(--muted)">PLAN.md · 6 editors</Eyebrow>
      </Animate>
      <div className="mono" style={{ position: "absolute", right: 120, top: 92, textAlign: "right" }}>
        <div style={{ fontSize: 22, color: "var(--muted)", letterSpacing: "0.12em" }}>LINES</div>
        <div style={{ fontSize: 64, color: "var(--fg)", marginTop: 6 }}>
          <Counter
            to={4812}
            at={10}
            duration={140}
            easing={Easing.inOutCubic}
            format={(n) => Math.round(n).toLocaleString()}
          />
        </div>
      </div>
      <Copy at={150}>The plan was 4,812 lines.</Copy>
      <Copy at={186} muted size={40} top={890}>
        Nobody remembers line 3,000.
      </Copy>
    </Room>
  );
}

/* ------------------------------ 3 · the agents --------------------------- */
export const WIN: { x: number; y: number; id: number }[] = [
  { x: 150, y: 150, id: 1 },
  { x: 520, y: 120, id: 2 },
  { x: 1300, y: 130, id: 3 },
  { x: 1560, y: 300, id: 4 },
  { x: 120, y: 420, id: 5 },
  { x: 1540, y: 560, id: 6 },
  { x: 330, y: 640, id: 7 },
  { x: 1290, y: 400, id: 8 },
  { x: 720, y: 90, id: 9 },
  { x: 1000, y: 110, id: 10 },
  { x: 160, y: 760, id: 11 },
  { x: 1420, y: 780, id: 12 },
  { x: 300, y: 520, id: 13 },
  { x: 1550, y: 470, id: 14 },
  { x: 560, y: 600, id: 15 },
  { x: 1500, y: 690, id: 16 },
  { x: 460, y: 250, id: 17 },
  { x: 1360, y: 240, id: 18 },
  { x: 260, y: 300, id: 19 },
  { x: 1290, y: 620, id: 20 },
];
const LOGS = [
  ["claiming task_118", "running pnpm test …", "12/48 passing"],
  ["git worktree add", "npm install (2m 14s)", "waiting on lockfile"],
  ["lint: 3 warnings", "rebase onto main", "conflict: schema.prisma"],
  ["reading PLAN.md", "reading PLAN.md (2)", "asking: which auth?"],
  ["migrating users", "backfill 41%", "backfill 41%"],
  ["opened PR #409", "CI queued", "CI queued (4 min)"],
];
export function AgentWindow({
  i,
  at,
  state,
  jitter,
}: {
  i: number;
  at: number;
  state: ArchieState;
  jitter: number;
}) {
  const frame = useFrame();
  const fps = useFps();
  const w = WIN[i];
  const s = spring({ frame, fps, delay: at, config: { stiffness: 260, damping: 16 }, durationInFrames: 22 });
  if (frame < at) return null;
  const jx = noise1d(frame * 0.35 + i * 11, i) * jitter;
  const jy = noise1d(frame * 0.35 + i * 17, i + 50) * jitter;
  const logs = LOGS[i % LOGS.length];
  const err = state === "error";
  const wait = state === "waiting";
  const bg = err ? "rgba(230,126,128,0.16)" : wait ? "rgba(219,188,127,0.14)" : "rgba(39,46,51,0.94)";
  const border = err ? "var(--red)" : wait ? "var(--yellow)" : "#4f585e";
  const flash = err && frame % 14 < 7 ? 0.35 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: w.x + jx,
        top: w.y + jy,
        width: 300,
        height: 128,
        transform: `scale(${0.6 + 0.4 * Math.min(1.08, s)})`,
        opacity: Math.min(1, s * 1.5),
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 8,
        boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 0 ${flash * 6}px rgba(230,126,128,${flash})`,
        padding: "8px 12px",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--fg)",
        zIndex: i >= 12 ? 5 : 2,
      }}
      className="mono"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: err ? "var(--red)" : wait ? "var(--yellow)" : "var(--green)",
          marginBottom: 4,
          position: "relative",
          height: 20,
        }}
      >
        <Archie size={20} state={state} style={{ position: "relative" }} />
        <span>agent-{String(w.id).padStart(2, "0")}</span>
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>
          {err ? "✗ failed" : wait ? "waiting" : SPIN[(frame + i) % SPIN.length]}
        </span>
      </div>
      {logs.map((l, k) => (
        <div
          key={k}
          style={{
            color: k === 2 && (err || wait) ? (err ? "var(--red)" : "var(--yellow)") : "var(--fg)",
            opacity: k === 2 ? 1 : 0.7,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <Typewriter
            text={
              k === 2 && err
                ? "✗ tests failed · 3 errors"
                : k === 2 && wait
                  ? "needs approval to continue"
                  : l
            }
            at={at + 6 + k * 14 + (i % 3) * 4}
            cps={34 + (i % 4) * 6}
            cursor={k === 2}
            cursorAfter={!err && !wait}
          />
        </div>
      ))}
    </div>
  );
}

export function Agents({ bed = true, denseAlerts = true }: { bed?: boolean; denseAlerts?: boolean }) {
  const frame = useFrame();
  const arcL = { ...POSES.swivelL, lhx: -340, lhy: -300, headTurn: -0.5 }; // left hand mid-flight, biased up
  const arcLR = { ...POSES.typing, lhx: -330, lhy: -200, rhx: 270, rhy: -300, headTurn: 0, headTilt: -4 }; // both hands passing
  const pose = usePose([
    { frame: 0, pose: POSES.typing },
    { frame: 13, pose: arcL, easing: Easing.inOutCubic },
    { frame: 26, pose: POSES.swivelL, easing: Easing.outBack },
    { frame: 38, pose: arcLR, easing: Easing.inOutCubic },
    { frame: 50, pose: POSES.swivelR, easing: Easing.outBack },
    { frame: 61, pose: arcLR, easing: Easing.inOutCubic },
    { frame: 72, pose: POSES.swivelL, easing: Easing.outBack },
    { frame: 82, pose: arcLR, easing: Easing.inOutCubic },
    { frame: 92, pose: POSES.swivelR, easing: Easing.outBack },
    { frame: 101, pose: { ...POSES.reading, rhx: 260, rhy: -240 }, easing: Easing.inOutCubic },
    { frame: 110, pose: POSES.reading },
    { frame: 132, pose: POSES.flinch, easing: Easing.outExpo },
    { frame: 150, pose: POSES.flinch },
    { frame: 172, pose: POSES.overwhelmed, easing: Easing.inOutQuint },
  ]);
  const jitter = interpolate(frame, [90, 200], [0, 10]);
  const states = (i: number): ArchieState => {
    if (i === 2 && frame >= 132) return "error";
    if (i === 7 && frame >= 140) return "waiting";
    if (i === 13 && frame >= 148) return "error";
    if (i === 15 && frame >= 156) return "waiting";
    return "working";
  };
  const pops: number[] = [];
  for (let i = 0; i < 20; i++) pops.push(i < 12 ? 6 + i * 7 : 118 + (i - 12) * 6 + (i === 17 ? 2 : 0)); // keep pops off the alert frames
  return (
    <Room>
      {bed && (
        <>
          <Thump at={0} volume={0.45} from={120} to={40} />
          <RoomTone volume={0.02} />
          <Drone
            notes={["D2", "A2"]}
            volume={0.045}
            cutoff={420}
            lfo={{ rate: 0.6, depth: 0.4 }}
            fadeOut={16}
          />
          <Pattern
            bpm={84}
            step={0.5}
            at={2}
            steps="D3 F3 A3 C4 D4 C4 A3 F3"
            wave="pluck"
            brightness={0.55}
            volume={0.25}
            reverb={0.3}
            width={0.4}
            repeat={7}
            name="bass"
          />
          <Pattern
            bpm={84}
            step={0.25}
            at={44}
            steps="D5 F5 A5 C6 E6 C6 A5 F5"
            wave="pluck"
            brightness={0.8}
            volume={0.15}
            reverb={0.35}
            width={0.7}
            repeat={9}
            name="high"
          />
          <Pattern
            bpm={84}
            step={0.25}
            at={96}
            steps="D4 . . . F4 . . . A4 . . . Ab4! . . ."
            wave="epiano"
            volume={0.18}
            reverb={0.3}
            width={0.3}
            repeat={4}
            name="stabs"
          />
        </>
      )}
      {pops.map((f, i) => (
        <EPiano
          key={i}
          at={f}
          note={["D5", "F5", "A5", "C6", "E6"][i % 5]}
          ring={0.45}
          volume={0.11}
          reverb={0.35}
          pan={(WIN[i].x - 960) / 1200}
          name={`w${i}`}
        />
      ))}
      <Chord
        at={132}
        notes={["Eb5", "A5"]}
        wave="pluck"
        ring={0.7}
        volume={0.3}
        reverb={0.3}
        width={0.2}
        name="alert1"
      />
      {denseAlerts && (
        <Chord
          at={140}
          notes={["E5", "Bb5"]}
          wave="pluck"
          ring={0.7}
          volume={0.26}
          reverb={0.3}
          width={0.2}
          name="alert2"
        />
      )}
      <Chord
        at={148}
        notes={["F5", "B5"]}
        wave="pluck"
        ring={0.9}
        volume={0.3}
        reverb={0.3}
        width={0.2}
        name="alert3"
      />
      <Thump at={172} volume={0.55} from={140} to={42} />
      <Pluck note="D2" at={172} ring={2.5} brightness={0.25} volume={0.3} reverb={0.5} name="boom" />
      {bed && <Riser at={S3 - 40} durationInFrames={40} volume={0.14} />}
      <Workstation
        pose={pose}
        typing={frame < 22 ? 1 : 0}
        screen={
          <div className="mono">
            <div style={{ color: "var(--muted)" }}>overseer · 12 running</div>
            <div>{SPIN[frame % 10]} tail -f agents/*.log</div>
            <div style={{ color: "var(--muted)" }}>{Math.floor(frame * 7.3)} lines/s</div>
          </div>
        }
      />
      {WIN.map((_, i) => (
        <AgentWindow key={i} i={i} at={pops[i]} state={states(i)} jitter={jitter} />
      ))}
      <Animate
        from={{ opacity: 0 }}
        at={0}
        duration={6}
        style={{ position: "absolute", left: 120, top: 92, zIndex: 6 }}
      >
        <Eyebrow color="var(--muted)">
          23:58 · agents/*.log ·{" "}
          <span style={{ color: pops.filter((f) => frame >= f).length > 12 ? "var(--red)" : "var(--fg)" }}>
            {pops.filter((f) => frame >= f).length} running
          </span>
        </Eyebrow>
      </Animate>
      <div style={{ position: "absolute", inset: 0, zIndex: 7, pointerEvents: "none" }}>
        <Copy at={28} exitAt={116} plate>
          Twelve agents.
        </Copy>
        <Copy at={48} exitAt={116} top={890} size={56} plate>
          Twelve terminals.
        </Copy>
        <Copy at={124} accent size={72} plate>
          One of you.
        </Copy>
      </div>
    </Room>
  );
}

/* ------------------------------- 4 · the blank --------------------------- */
export function Blank({ bed = true }: { bed?: boolean }) {
  const frame = useFrame();
  const pose = usePose([
    { frame: 0, pose: POSES.hollow },
    { frame: 10, pose: POSES.hollow },
    {
      frame: 22,
      pose: {
        ...POSES.hollow,
        headTilt: 18,
        lhx: -24,
        lhy: -238,
        rhx: 24,
        rhy: -238,
        eyes: 0.12,
        brow: 0.9,
        mouth: -0.4,
      },
      easing: Easing.inOutCubic,
    },
    {
      frame: 38,
      pose: {
        ...POSES.hollow,
        headTilt: 18,
        lhx: -24,
        lhy: -238,
        rhx: 24,
        rhy: -238,
        eyes: 0.12,
        brow: 0.9,
        mouth: -0.4,
      },
    },
    {
      frame: 52,
      pose: { ...POSES.hollow, headTilt: -10, pupilY: -0.8, brow: 0.2 },
      easing: Easing.inOutCubic,
    },
    { frame: 120, pose: { ...POSES.hollow, headTilt: -8, pupilY: -0.8, brow: 0.2 } },
  ]);
  const bubble = spring({
    frame,
    fps: 30,
    delay: 46,
    config: { stiffness: 200, damping: 14 },
    durationInFrames: 26,
  });
  const thought = "…what was agent 7 doing?";
  return (
    <Room dark={0.35}>
      {bed && (
        <>
          <RoomTone volume={0.02} cutoff={380} />
          <Drone
            notes={["D1"]}
            wave="sine"
            volume={0.03}
            cutoff={140}
            lfo={{ rate: 0.12, depth: 0.5 }}
            spread={0}
            reverb={0.2}
            fadeIn={6}
            fadeOut={30}
          />
        </>
      )}
      <EPiano note="E6" at={34} ring={4.5} volume={0.04} reverb={0.7} pan={0.4} name="ring" />
      <Thump at={18} volume={0.28} from={80} to={36} name="hb1" />
      <Thump at={28} volume={0.17} from={70} to={34} name="hb2" />
      <Thump at={78} volume={0.28} from={80} to={36} name="hb3" />
      <Thump at={88} volume={0.17} from={70} to={34} name="hb4" />
      <Typing text={thought} at={62} cps={16} volume={0.07} />
      <Workstation
        pose={pose}
        screenGlow={0.6}
        screen={
          <div className="mono" style={{ color: "var(--muted)" }}>
            <div>
              <span style={{ color: "var(--green)" }}>$ </span>git log --oneline | head
            </div>
            {[
              "a41f2c wip",
              "9c0e11 wip (again)",
              "7d3b90 fix? maybe",
              "e2a7f4 agent-07: …",
              "b19c33 revert revert",
            ].map((l, i) => (
              <div key={i} style={{ opacity: 0.55 }}>
                {l}
              </div>
            ))}
          </div>
        }
      />
      {/* thought bubble */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g
          style={{
            transform: `translate(30px, -90px) scale(${bubble})`,
            transformOrigin: "1010px 470px",
            opacity: Math.min(1, bubble) * (1 - progress(frame, S4 - 14, 12)),
          }}
        >
          <circle cx={1020} cy={452} r={6} fill="none" stroke="#d3c6aa" strokeWidth={2} opacity={0.7} />
          <circle cx={1046} cy={418} r={10} fill="none" stroke="#d3c6aa" strokeWidth={2} opacity={0.8} />
          <path
            d="M1080 380 q-20 -60 40 -70 q20 -50 90 -40 q60 -40 110 10 q60 0 60 50 q30 50 -30 70 q-30 50 -90 30 q-60 30 -110 -10 q-70 10 -70 -40Z"
            fill="#232a2e"
            stroke="#d3c6aa"
            strokeWidth={2}
          />
        </g>
      </svg>
      <Sequence from={58} layout="none" name="thought">
        <div
          className="mono"
          style={{
            position: "absolute",
            left: 1132,
            top: 250,
            fontSize: 24,
            color: "var(--fg)",
            width: 300,
            lineHeight: 1.4,
            opacity: 1 - progress(frame, S4 - 14, 12),
          }}
        >
          <Typewriter text={thought} at={4} cps={16} cursorAfter />
        </div>
      </Sequence>
      <Clock time="02:13" />
      <Copy at={98} exitAt={S4 - 12} size={64}>
        <span style={{ color: "var(--red)" }}>Context:</span> lost.
      </Copy>
    </Room>
  );
}

/* -------------------------------- 5 · archdev ---------------------------- */
const DAG: { id: string; x: number; y: number; wave: number; state: ArchieState }[] = [
  { id: "T1", x: 0, y: 40, wave: 0, state: "done" },
  { id: "T2", x: 0, y: 120, wave: 0, state: "done" },
  { id: "T3", x: 150, y: 20, wave: 1, state: "done" },
  { id: "T4", x: 150, y: 140, wave: 1, state: "working" },
  { id: "T5", x: 300, y: 80, wave: 2, state: "working" },
  { id: "T6", x: 450, y: 80, wave: 3, state: "idle" },
];
const DAG_E: [number, number][] = [
  [0, 2],
  [1, 3],
  [0, 3],
  [2, 4],
  [3, 4],
  [4, 5],
];

function Overseer() {
  const frame = useFrame();
  const blankExit = { ...POSES.hollow, headTilt: -8, pupilY: -0.8, brow: 0.2 }; // exactly what the blank scene ends on
  const pose = usePose([
    { frame: 0, pose: blankExit },
    { frame: 14, pose: blankExit },
    { frame: 34, pose: POSES.exhale, easing: Easing.inOutCubic },
    { frame: 62, pose: POSES.calm, easing: Easing.inOutCubic },
    { frame: 200, pose: { ...POSES.calm, headTurn: 0.5, pupilX: 0.8, headTilt: 2 } },
  ]);
  const rows = [
    {
      at: 26,
      state: "done" as ArchieState,
      text: (
        <>
          <b style={{ color: "var(--fg)" }}>agent-07</b> crashed after push → overseer found the branch →
          reopened for <b style={{ color: "var(--fg)" }}>agent-09</b>
        </>
      ),
      tag: "recovered",
      tagColor: "var(--aqua)",
    },
    {
      at: 44,
      state: "done" as ArchieState,
      text: (
        <>
          3 pull requests ready for you · <span style={{ color: "var(--green)" }}>#412 low</span> ·{" "}
          <span style={{ color: "var(--green)" }}>#413 low</span> ·{" "}
          <span style={{ color: "var(--yellow)" }}>#414 medium</span>
        </>
      ),
      tag: "risk-graded",
      tagColor: "var(--green)",
    },
    {
      at: 62,
      state: "working" as ArchieState,
      text: <>12 agents · 12 worktrees · 0 checkout collisions · lint and tests green before review</>,
      tag: "running",
      tagColor: "var(--blue)",
    },
  ];
  const boardIn = spring({ frame, fps: 30, delay: 10, config: SpringPresets.smooth, durationInFrames: 34 });
  // continuous reframe from the blank scene: same desk, same pose, then the room brightens and the desk slides left
  const wx = interpolate(frame, [8, 44], [DESK.x, 500], { easing: INOUT });
  const wy = interpolate(frame, [8, 44], [DESK.y, 690], { easing: INOUT });
  const ws = interpolate(frame, [8, 44], [DESK.s, 1.15], { easing: INOUT });
  const dark = interpolate(frame, [0, 30], [0.35, 0]);
  return (
    <Room dark={dark}>
      <RoomTone volume={0.02} />
      <Drone notes={["D2"]} volume={0.03} cutoff={220} fadeIn={16} fadeOut={20} />
      <Whoosh at={0} from={300} to={1800} volume={0.12} />
      <Chord
        at={12}
        notes={["D3", "A3", "F#4", "C#5", "E5"]}
        wave="epiano"
        strum={2}
        ring={3.2}
        volume={0.11}
        reverb={0.5}
        width={0.6}
        name="dmaj9"
      />
      <Pattern
        bpm={84}
        step={0.5}
        at={40}
        steps="D4 A4 F#5 A4 E5 A4 F#5 A4"
        wave="pluck"
        brightness={0.5}
        volume={0.1}
        reverb={0.4}
        width={0.5}
        repeat={8}
        name="calm"
      />
      <Chord
        at={140}
        notes={["G3", "D4", "B4", "F#5"]}
        wave="epiano"
        strum={2}
        ring={3}
        volume={0.1}
        reverb={0.5}
        width={0.6}
        name="gmaj7"
      />
      <Chord
        at={226}
        notes={["D3", "A3", "F#4", "A4", "D5"]}
        wave="epiano"
        strum={2}
        ring={3.5}
        volume={0.11}
        reverb={0.5}
        width={0.6}
        name="d"
      />
      {rows.map((r, i) => (
        <EPiano
          key={i}
          at={r.at}
          note={["A5", "D6", "F#6"][i]}
          ring={1.2}
          volume={0.09}
          reverb={0.45}
          pan={0.4}
          name={`row${i}`}
        />
      ))}
      <Workstation
        pose={pose}
        x={wx}
        y={wy}
        s={ws}
        typing={frame > 90 ? 0.5 : 0}
        screen={
          <div className="mono">
            <div style={{ color: "var(--muted)" }}>archdev · overseer</div>
            <div style={{ color: "var(--green)" }}>✓ 12 running · 3 ready for review</div>
            <div style={{ color: "var(--muted)" }}>nothing needs you until 09:00</div>
          </div>
        }
      />
      {/* the chaos windows flying into the board */}
      {WIN.slice(0, 12).map((w, i) => {
        const p = progress(frame, 18 + i * 1.5, 26, INOUT);
        const fadeIn = progress(frame, 8 + i, 8);
        const tx = 1000,
          ty = 260 + (i % 3) * 120;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: w.x + (tx - w.x) * p,
              top: w.y + (ty - w.y) * p,
              width: 300 * (1 - 0.9 * p),
              height: 128 * (1 - 0.9 * p),
              border: "1.5px solid #4f585e",
              borderRadius: 8,
              opacity: 0.7 * fadeIn * (1 - p),
              background: "rgba(39,46,51,0.9)",
            }}
          />
        );
      })}
      {/* the board */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 150,
          width: 840,
          height: 760,
          transform: `translateX(${(1 - boardIn) * 420}px)`,
          opacity: boardIn,
          background: "rgba(39,46,51,0.92)",
          border: "1px solid #4f585e",
          borderRadius: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          padding: "28px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Img src={staticFile("archdev-mark.png")} style={{ width: 40, height: 40, borderRadius: 10 }} />
          <div>
            <div className="display" style={{ fontSize: 34, color: "var(--fg)" }}>
              Since you looked away
            </div>
            <div className="mono" style={{ fontSize: 18, color: "var(--muted)", marginTop: 2 }}>
              6 h 12 m · overseer report
            </div>
          </div>
        </div>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r, i) => (
            <Animate
              key={i}
              from={{ opacity: 0, y: 14 }}
              at={r.at}
              duration={22}
              easing={QUINT}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr auto",
                gap: 14,
                alignItems: "center",
                padding: "16px 18px",
                background: "rgba(45,53,59,0.9)",
                border: "1px solid #3d484d",
                borderRadius: 12,
              }}
            >
              <div style={{ position: "relative", width: 40, height: 40 }}>
                <Archie size={40} state={r.state} />
              </div>
              <div className="mono" style={{ fontSize: 19, lineHeight: 1.4, color: "var(--muted)" }}>
                {r.text}
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: r.tagColor,
                  border: `1px solid ${r.tagColor}`,
                  padding: "5px 10px",
                  borderRadius: 999,
                }}
              >
                {r.tag}
              </span>
            </Animate>
          ))}
        </div>
        {/* task graph */}
        <Animate
          from={{ opacity: 0, y: 10 }}
          at={84}
          duration={24}
          style={{
            marginTop: 26,
            padding: "16px 18px",
            border: "1px solid #3d484d",
            borderRadius: 12,
            background: "rgba(45,53,59,0.6)",
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 14,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Task graph · 6 tasks · 4 waves · 2 unblocked
          </div>
          <svg width={560} height={190} viewBox="-30 -10 560 190" style={{ display: "block", marginTop: 8 }}>
            <Draw at={90} duration={30} each={4}>
              {DAG_E.map(([a, b], i) => (
                <line
                  key={i}
                  x1={DAG[a].x + 20}
                  y1={DAG[a].y}
                  x2={DAG[b].x - 20}
                  y2={DAG[b].y}
                  stroke="#859289"
                  strokeWidth={2}
                />
              ))}
            </Draw>
            {DAG.map((n, i) => {
              const s = progress(frame, 94 + i * 5, 18, Easing.outBack);
              const c = n.state === "done" ? "#83c092" : n.state === "working" ? "#a7c080" : "#4f585e";
              return (
                <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${s})`}>
                  <circle r={18} fill="#272e33" stroke={c} strokeWidth={2.5} />
                  {n.state === "done" ? (
                    <path
                      d="M-7 0l5 5 9-10"
                      stroke={c}
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : n.state === "working" ? (
                    <circle r={5} fill={c} opacity={0.6 + 0.4 * Math.sin(frame / 5)} />
                  ) : (
                    <circle r={4} fill="#4f585e" />
                  )}
                  <text
                    y={38}
                    textAnchor="middle"
                    fontSize={13}
                    fill="#859289"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {n.id}
                  </text>
                </g>
              );
            })}
            <circle
              cx={450}
              cy={80}
              r={26}
              fill="none"
              stroke="#f0a04b"
              strokeWidth={2}
              opacity={progress(frame, 130, 14) * (0.5 + 0.5 * Math.abs(Math.sin(frame / 7)))}
            />
          </svg>
        </Animate>
      </div>
      <Copy at={60} size={54} top={905}>
        You write tasks. You approve reviews.
      </Copy>
      <Copy at={132} accent size={54} top={968}>
        ArchDev runs the agents.
      </Copy>
      <Clock time="09:00" at={4} />
    </Room>
  );
}

/* ----------------------------------- 6 · end ----------------------------- */
function End() {
  const frame = useFrame();
  const pop = spring({ frame, fps: 30, delay: 2, config: SpringPresets.smooth, durationInFrames: 26 });
  const fade = progress(frame, S6 - 18, 18, Easing.inCubic);
  return (
    <AbsoluteFill style={{ background: "#1e2326" }}>
      <RoomTone volume={0.02} fadeOut={40} />
      <Drone notes={["D2"]} volume={0.03} cutoff={220} fadeIn={6} fadeOut={50} />
      <Chord
        at={0}
        notes={["D3", "A3", "F#4", "A4", "D5", "F#5"]}
        wave="epiano"
        strum={3}
        ring={4}
        volume={0.13}
        reverb={0.55}
        width={0.7}
        name="final"
      />
      <Pattern
        bpm={84}
        step={0.25}
        at={8}
        steps="D5 F#5 A5 D6"
        wave="pluck"
        brightness={0.6}
        volume={0.13}
        reverb={0.5}
        width={0.4}
        name="flourish"
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            transform: `scale(${0.8 + 0.2 * pop})`,
            opacity: pop,
          }}
        >
          <Img
            src={staticFile("archdev-mark.png")}
            style={{ width: 150, height: 150, borderRadius: 34, boxShadow: "0 30px 70px rgba(0,0,0,0.5)" }}
          />
          <span className="display" style={{ fontSize: 132, color: "var(--fg)" }}>
            ArchDev
          </span>
        </div>
        <Reveal at={24} duration={28} className="display" style={{ fontSize: 48, color: "var(--muted)" }}>
          Stop managing every agent run.
        </Reveal>
        <Reveal
          at={40}
          duration={24}
          className="mono"
          style={{ fontSize: 24, color: "var(--amber)", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          archdev.ai · free for one private repository
        </Reveal>
      </div>
      <Sequence from={10} layout="none" name="cameo">
        <Animate from={{ opacity: 0, y: 20 }} duration={24} style={{ position: "absolute", inset: 0 }}>
          <Workstation
            pose={POSES.calm}
            x={300}
            y={960}
            s={0.5}
            typing={0.4}
            screenGlow={0.5}
            screen={
              <div className="mono" style={{ color: "var(--green)" }}>
                ✓ nothing needs you
              </div>
            }
          />
        </Animate>
      </Sequence>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
}

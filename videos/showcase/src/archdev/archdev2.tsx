import {
  AbsoluteFill,
  Animate,
  Chord,
  Draw,
  Drone,
  defineScenes,
  Easing,
  interpolate,
  Pattern,
  progress,
  Riser,
  RoomTone,
  Scenes,
  Sequence,
  spring,
  Thump,
  Tone,
  Typewriter,
  Typing,
  useFrame,
  Whoosh,
} from "@clapper/core";
import { Eyebrow, INOUT, Reveal } from "../kit";
import { Agents, Blank, Clock, Copy, DESK, Open, Plan, Room, Workstation } from "./archdev";
import { POSES, usePose } from "./person";

/**
 * ARCHDEV v2 — the problem film. Plan → agents → the 1,284-line PR → 2 AM → tease.
 * One continuous score (this file's <Score/>) instead of per-scene beds; hits only
 * where the story earns them. 36 s.
 */
/** One plan owns every start frame: the score, the copy, the CLI (--scene) and the review kit read it. Hard cuts. */
export const SCENES = defineScenes(
  {
    open: { frames: 100 },
    plan: { frames: 220 },
    agents: { frames: 240 },
    review: { frames: 210 },
    blank: { frames: 150 },
    tease: { frames: 125 },
  },
  { fps: 30 },
);
export const ARCHDEV2_LEN = SCENES.total;
const START = {
  open: SCENES.start("open"),
  plan: SCENES.start("plan"),
  agents: SCENES.start("agents"),
  review: SCENES.start("review"),
  blank: SCENES.start("blank"),
  tease: SCENES.start("tease"),
};

export function ArchDev2() {
  return (
    <AbsoluteFill className="vid archdev">
      <Score />
      <Scenes plan={SCENES}>
        <Scenes.Scene name="open">
          <Open bed={false} zoom={1.4} hook />
        </Scenes.Scene>
        <Scenes.Scene name="plan">
          <Plan bed={false} zoomStart={1.4} />
        </Scenes.Scene>
        <Scenes.Scene name="agents">
          <Agents bed={false} denseAlerts={false} />
        </Scenes.Scene>
        <Scenes.Scene name="review">
          <Review />
        </Scenes.Scene>
        <Scenes.Scene name="blank">
          <Blank bed={false} />
        </Scenes.Scene>
        <Scenes.Scene name="tease">
          <Tease />
        </Scenes.Scene>
      </Scenes>
    </AbsoluteFill>
  );
}

/* ---------------------------------- score -------------------------------- */
/** 8th-note grid at 84 bpm, absolute frames. */
const g8 = (k: number) => Math.round(4 + k * (60 / 84) * 0.5 * 30);

function Score() {
  return (
    <>
      <RoomTone volume={0.02} durationInFrames={ARCHDEV2_LEN} fadeIn={10} fadeOut={40} />
      {/* one bed for the whole problem half; intensity and colour automated across the cuts */}
      <Drone
        notes={["D2", "A2"]}
        at={0}
        durationInFrames={START.tease + 20}
        volume={0.042}
        fadeIn={20}
        fadeOut={24}
        lfo={{ rate: 0.2, depth: 0.3 }}
        automation={{
          volume: [
            [0, 0.7],
            [START.plan, 0.8],
            [START.agents - 20, 0.9],
            [START.agents, 1.1],
            [START.agents + 10, 1.15],
            [START.review, 1.05],
            [START.review + 40, 0.9],
            [START.blank - 25, 0.9],
            [START.blank + 5, 0.35],
            [START.blank + 20, 0.3],
            [START.tease - 20, 0.25],
            [START.tease + 20, 0],
          ],
          cutoff: [
            [0, 300],
            [START.plan, 260],
            [START.agents - 20, 300],
            [START.agents, 400],
            [START.agents + 120, 360],
            [START.agents + 132, 340],
            [START.agents + 177, 340],
            [START.agents + 200, 420],
            [START.review, 380],
            [START.blank, 140],
            [START.tease, 120],
          ],
        }}
        name="bed"
      />
      <Drone
        notes={["D1"]}
        wave="sine"
        at={START.blank - 10}
        durationInFrames={SCENES.duration("blank") + 30}
        volume={0.025}
        cutoff={140}
        lfo={{ rate: 0.12, depth: 0.5 }}
        spread={0}
        reverb={0.2}
        fadeIn={20}
        fadeOut={40}
        name="sub"
      />
      {/* motif */}
      <Pattern
        bpm={84}
        step={0.5}
        at={g8(0)}
        steps="D3 . A3 . D4 . F4 . E4 . A3 . D4 . C4 ."
        wave="pluck"
        brightness={0.35}
        volume={0.2}
        reverb={0.35}
        width={0.3}
        name="motif"
      />
      {/* the plan: a descending line whose last note rings across the cut */}
      <Pattern
        bpm={84}
        step={0.5}
        at={g8(16)}
        steps="D4 . C4 . A3 . G3 . F3 . E3 . D3 . C3"
        wave="pluck"
        brightness={0.3}
        volume={0.2}
        reverb={0.4}
        width={0.3}
        name="plan"
      />
      {/* the agents: ostinato + bright 16ths + dissonant stabs, all on the same grid */}
      <Pattern
        bpm={84}
        step={0.5}
        at={g8(30)}
        steps="D3 F3 A3 C4 D4 C4 A3 F3"
        wave="pluck"
        brightness={0.55}
        volume={0.25}
        reverb={0.3}
        width={0.4}
        repeat={2}
        name="bass"
      />
      <Pattern
        bpm={84}
        step={0.5}
        at={g8(48)}
        steps="D3 . A3 . C4 ."
        wave="pluck"
        brightness={0.5}
        volume={0.22}
        reverb={0.3}
        width={0.4}
        name="bass-coda"
      />
      <Pattern
        bpm={84}
        step={0.25}
        at={g8(34)}
        steps="D5 F5 A5 C6 E6 C6 A5 F5"
        wave="pluck"
        brightness={0.8}
        volume={0.15}
        reverb={0.35}
        width={0.7}
        repeat={4}
        name="high"
      />
      <Pattern
        bpm={84}
        step={0.25}
        at={g8(40)}
        steps="D4 . . . F4 . . . A4 . . . Ab4! . . ."
        wave="epiano"
        volume={0.18}
        reverb={0.3}
        width={0.3}
        name="stabs"
      />
      {/* the review: slow dark dyads */}
      <Pattern
        bpm={84}
        step={2}
        at={g8(52)}
        steps="D3 C3 Bb2 A2"
        wave="pluck"
        brightness={0.25}
        volume={0.24}
        reverb={0.45}
        width={0.2}
        pan={-0.2}
        name="review-low"
      />
      <Pattern
        bpm={84}
        step={2}
        at={g8(52)}
        steps="A3 G3 F3 E3"
        wave="pluck"
        brightness={0.3}
        volume={0.16}
        reverb={0.5}
        width={0.2}
        pan={0.3}
        name="review-high"
      />
      {/* tease: the first major chord in the film */}
      <Chord
        at={START.tease}
        notes={["D3", "A3", "F#4", "C#5", "E5"]}
        wave="epiano"
        strum={3}
        ring={3.2}
        volume={0.09}
        reverb={0.55}
        width={0.6}
        name="tease-chord"
      />
      <Pattern
        bpm={84}
        step={0.25}
        at={START.tease + 52}
        steps="D5 F#5 A5 D6"
        wave="pluck"
        brightness={0.6}
        volume={0.11}
        reverb={0.5}
        width={0.4}
        name="flourish"
      />
      <Chord
        at={START.tease + 92}
        notes={["D3", "A3", "F#4", "A4", "D5"]}
        wave="epiano"
        strum={3}
        ring={2.5}
        volume={0.08}
        reverb={0.55}
        width={0.6}
        name="tease-final"
      />
      {/* cut transitions: risers that land on the cut, hits only where the story slams */}
      <Riser
        at={START.agents - 38}
        durationInFrames={38}
        volume={0.14}
        from={150}
        to={2400}
        name="riser-agents"
      />
      <Thump at={START.agents} volume={0.5} from={120} to={40} name="hit-agents" />
      <Riser
        at={START.review - 32}
        durationInFrames={32}
        volume={0.1}
        from={200}
        to={2000}
        name="riser-review"
      />
      <Thump at={START.review} volume={0.32} from={100} to={36} name="hit-review" />
      <Whoosh
        at={START.blank - 12}
        durationInFrames={12}
        from={2200}
        to={180}
        volume={0.12}
        name="swell-out"
      />
      <Whoosh
        at={START.tease - 14}
        durationInFrames={14}
        from={300}
        to={1600}
        volume={0.08}
        name="swell-in"
      />
    </>
  );
}

/* ------------------------------- 4 · the review -------------------------- */
const FILES = [
  "src/billing/invoice.ts",
  "src/billing/tax.ts",
  "src/api/checkout.ts",
  "src/db/migrations/0412_backfill.ts",
  "src/lib/retry.ts",
  "src/queue/claims.ts",
];
const DIFF = (() => {
  const out: { t: string; k: "add" | "del" | "ctx" | "hunk" | "file" }[] = [];
  const words = [
    "invoice",
    "total",
    "taxRate",
    "claim",
    "retry",
    "cursor",
    "orgId",
    "session",
    "backfill",
    "ledger",
  ];
  for (let i = 0; i < 260; i++) {
    const m = i % 26;
    if (m === 0) out.push({ t: FILES[((i / 26) % FILES.length) | 0], k: "file" });
    else if (m === 1)
      out.push({
        t: `@@ -${300 + i * 3},7 +${310 + i * 3},${9 + (i % 4)} @@ function ${words[i % 10]}()`,
        k: "hunk",
      });
    else if (m % 7 === 3)
      out.push({
        t: `-  const ${words[i % 10]} = ${words[(i + 3) % 10]}.${words[(i + 5) % 10]}(${i % 5});`,
        k: "del",
      });
    else if (m % 7 === 4 || m % 7 === 5)
      out.push({
        t: `+  const ${words[i % 10]} = await ${words[(i + 2) % 10]}.${words[(i + 7) % 10]}({ ${words[(i + 1) % 10]}, retries: ${i % 4} });`,
        k: "add",
      });
    else if (m % 7 === 6)
      out.push({
        t: `+  if (!${words[i % 10]}) throw new Error("${words[(i + 4) % 10]} missing");`,
        k: "add",
      });
    else
      out.push({
        t: `   ${["return", "await", "const", "//", "}"][i % 5]} ${words[(i + 6) % 10]}${i % 5 === 3 ? " TODO(agent-07): verify" : ""}`,
        k: "ctx",
      });
  }
  return out;
})();
const LINE_H = 23;

export function Review() {
  const frame = useFrame();
  const pose = usePose([
    { frame: 0, pose: POSES.reading },
    { frame: 50, pose: { ...POSES.reading, headTilt: 14, eyes: 0.8, pupilY: 0.6 } },
    { frame: 110, pose: { ...POSES.reading, headTilt: 22, eyes: 0.45, pupilY: 0.7, brow: 0.2, mouth: -0.2 } },
    { frame: 124, pose: { ...POSES.reading, headTilt: 27, eyes: 0.18, pupilY: 0.7, brow: 0.1, mouth: -0.2 } },
    {
      frame: 132,
      pose: { ...POSES.reading, headTilt: 1, eyes: 1.15, pupilY: 0.2, brow: -0.5, mouthOpen: 0.3 },
      easing: Easing.outBack,
    },
    {
      frame: 144,
      pose: { ...POSES.reading, headTilt: 1, eyes: 1.15, pupilY: 0.2, brow: -0.5, mouthOpen: 0.3 },
    },
    { frame: 152, pose: POSES.typing },
    {
      frame: 174,
      pose: { ...POSES.reading, headTilt: 8, mouth: -0.35, brow: 0.4, pupilX: 0.6, headTurn: 0.3 },
    },
    {
      frame: 209,
      pose: { ...POSES.reading, headTilt: 10, mouth: -0.35, brow: 0.4, pupilX: 0.6, headTurn: 0.3 },
    },
  ]);
  const scroll = interpolate(frame, [0, 120, 132, 150], [0, 690, 690, 720]) + Math.max(0, frame - 150) * 1.2;
  const lineAt = Math.min(300, 268 + Math.round(Math.min(scroll, 690) / LINE_H));
  const approveAt = 176;
  const stamp = spring({
    frame,
    fps: 30,
    delay: approveAt,
    config: { stiffness: 300, damping: 18 },
    durationInFrames: 18,
  });
  const ticks: number[] = [];
  for (let f = 6; f < 122; f += 6) ticks.push(f);
  return (
    <Room>
      {ticks.map((f) => (
        <Tone
          key={f}
          at={f}
          durationInFrames={2}
          freq={900}
          wave="noise"
          attack={0.001}
          decay={0.014}
          sustain={0}
          release={0.006}
          volume={0.028}
          pan={0.45}
          name={`sc${f}`}
        />
      ))}
      <Typing text="LGTM" at={150} cps={11} volume={0.2} />
      <Chord
        at={approveAt}
        notes={["E5", "F5"]}
        wave="epiano"
        strum={0}
        ring={2.0}
        volume={0.13}
        reverb={0.5}
        width={0.2}
        name="approve"
      />
      <Workstation
        pose={pose}
        typing={frame >= 150 && frame < 166 ? 1 : 0}
        screen={
          <div className="mono">
            <div style={{ color: "var(--muted)" }}>PR #1284 · agent-07</div>
            <div>
              <span style={{ color: "var(--green)" }}>+1,284</span>{" "}
              <span style={{ color: "var(--red)" }}>−312</span> · 47 files
            </div>
            <div style={{ color: "var(--muted)" }}>line {lineAt.toLocaleString()} of 1,284</div>
          </div>
        }
      />
      {/* the diff, scrolling past for longer than anyone reads */}
      <div
        style={{
          position: "absolute",
          left: 1180,
          top: 130,
          width: 620,
          height: 580,
          background: "rgba(39,46,51,0.94)",
          border: "1px solid #4f585e",
          borderRadius: 12,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        className="mono"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #3d484d",
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <span>
            Files changed <b style={{ color: "var(--fg)" }}>47</b>
          </span>
          <span>
            <span style={{ color: "var(--green)" }}>+1,284</span>{" "}
            <span style={{ color: "var(--red)" }}>−312</span>
          </span>
          <span>
            line <b style={{ color: "var(--fg)" }}>{lineAt.toLocaleString()}</b> / 1,284
          </span>
        </div>
        <div style={{ position: "relative", height: 468, overflow: "hidden" }}>
          <div
            style={{
              transform: `translateY(${-scroll}px)`,
              fontSize: 14,
              lineHeight: `${LINE_H}px`,
              padding: "8px 0",
            }}
          >
            {DIFF.map((l, i) => (
              <div
                key={i}
                style={{
                  padding: "0 16px",
                  whiteSpace: "nowrap",
                  color:
                    l.k === "add"
                      ? "var(--green)"
                      : l.k === "del"
                        ? "var(--red)"
                        : l.k === "hunk"
                          ? "var(--blue)"
                          : l.k === "file"
                            ? "var(--fg)"
                            : "var(--muted)",
                  background:
                    l.k === "add"
                      ? "rgba(167,192,128,0.08)"
                      : l.k === "del"
                        ? "rgba(230,126,128,0.08)"
                        : l.k === "file"
                          ? "rgba(61,72,77,0.6)"
                          : "transparent",
                  fontWeight: l.k === "file" ? 700 : 400,
                }}
              >
                {l.k === "file" ? `▸ ${l.t}` : l.t}
              </div>
            ))}
          </div>
          {/* scrollbar: the thumb barely moves */}
          <div
            style={{
              position: "absolute",
              right: 4,
              top: 6,
              bottom: 6,
              width: 6,
              borderRadius: 3,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(scroll / (DIFF.length * LINE_H)) * 100}%`,
                height: 40,
                borderRadius: 3,
                background: "rgba(211,198,170,0.35)",
              }}
            />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 66,
            borderTop: "1px solid #3d484d",
            background: "#232a2e",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            fontSize: 14,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid #4f585e",
              borderRadius: 8,
              padding: "8px 12px",
              color: "var(--fg)",
              minHeight: 36,
            }}
          >
            <Sequence from={150} layout="none" name="lgtm">
              <Typewriter text="LGTM" at={0} cps={11} cursorAfter />
            </Sequence>
          </div>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: stamp > 0.5 ? "var(--green)" : "#3d484d",
              color: stamp > 0.5 ? "#1e2326" : "var(--muted)",
              fontWeight: 700,
              transform: `scale(${1 + 0.15 * Math.max(0, 1 - Math.abs(stamp - 1) * 2)})`,
            }}
          >
            {stamp > 0.5 ? "✓ Approved" : "Approve"}
          </div>
        </div>
      </div>
      <Sequence from={approveAt + 4} layout="none" name="stamp">
        <Animate
          from={{ opacity: 0, y: 8 }}
          duration={14}
          className="mono"
          style={{
            position: "absolute",
            right: 120,
            top: 722,
            fontSize: 15,
            color: "var(--green)",
            letterSpacing: "0.08em",
            zIndex: 8,
          }}
        >
          ✓ merged · 01:52 · 0 comments
        </Animate>
      </Sequence>
      <Animate from={{ opacity: 0 }} at={0} duration={6} style={{ position: "absolute", left: 120, top: 92 }}>
        <Eyebrow color="var(--muted)">
          01:4{Math.min(9, Math.floor(frame / 24))} · pull request #1284 · 47 files
        </Eyebrow>
      </Animate>
      <Clock time={frame < approveAt ? `01:4${Math.min(9, Math.floor(frame / 24))}` : "01:52"} />
      <Copy at={40} size={56} z={8}>
        The PR was 1,284 lines.
      </Copy>
      <Copy at={184} size={52} top={890} z={8}>
        Approved at 1:52. Read to line 300.
      </Copy>
    </Room>
  );
}

/* ----------------------------------- 6 · tease --------------------------- */
const NODES: [number, number][] = [
  [0, -92],
  [-54, -12],
  [54, -12],
  [-98, 76],
  [98, 76],
];
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [2, 4],
];

export function Tease() {
  const frame = useFrame();
  const blankExit = { ...POSES.hollow, headTilt: -8, pupilY: -0.8, brow: 0.2 };
  const pose = usePose([
    { frame: 0, pose: blankExit },
    {
      frame: 26,
      pose: { ...POSES.hollow, headTilt: -3, pupilY: -0.4, eyes: 0.85, brow: 0.1 },
      easing: Easing.inOutCubic,
    },
    {
      frame: 60,
      pose: {
        ...POSES.hollow,
        headTilt: -5,
        headTurn: 1,
        headRoll: 8,
        pupilX: 1,
        pupilY: -0.5,
        eyes: 0.95,
        brow: -0.2,
        slump: 0.6,
      },
      easing: Easing.inOutCubic,
    },
    {
      frame: 100,
      pose: {
        ...POSES.hollow,
        headTilt: -5,
        headTurn: 1,
        headRoll: 8,
        pupilX: 1,
        pupilY: -0.5,
        eyes: 0.95,
        brow: -0.3,
        mouth: 0.25,
        slump: 0.4,
      },
    },
  ]);
  const slide = progress(frame, 30, 30, INOUT);
  const wx = DESK.x + (560 - DESK.x) * slide;
  const wy = DESK.y + (750 - DESK.y) * slide;
  const ws = DESK.s + (1.25 - DESK.s) * slide;
  const markIn = progress(frame, 48, 26, INOUT);
  const glow = 0.5 + 0.5 * Math.abs(Math.sin(frame / 9));
  const fade = progress(frame, SCENES.duration("tease") - 10, 10, Easing.inCubic);
  return (
    <Room dark={0.35 - 0.15 * markIn}>
      <Typing text="archdev" at={30} cps={10} volume={0.1} />
      <Workstation
        pose={pose}
        x={wx}
        y={wy}
        s={ws}
        screenGlow={0.6 + 0.9 * markIn}
        screen={
          <div className="mono">
            <span style={{ color: "var(--green)" }}>$ </span>
            <Typewriter text="archdev" at={30} cps={10} cursorAfter />
          </div>
        }
      />
      {/* the light from the right that the character turns toward */}
      <div
        style={{
          position: "absolute",
          left: 830,
          top: 120,
          width: 700,
          height: 700,
          background: "radial-gradient(closest-side, rgba(240,160,75,0.14), transparent)",
          opacity: markIn,
          pointerEvents: "none",
        }}
      />
      <Copy at={10} size={60} top={150}>
        What if nothing needed you at 2 AM?
      </Copy>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, overflow: "visible", opacity: Math.min(1, markIn * 1.5) }}
      >
        <g
          transform="translate(1180 430)"
          style={{ filter: `drop-shadow(0 0 ${18 * glow}px rgba(240,160,75,0.45))` }}
        >
          <Draw at={48} duration={30} each={4} easing={INOUT}>
            {EDGES.map(([a, b], i) => (
              <line
                key={i}
                x1={NODES[a][0]}
                y1={NODES[a][1]}
                x2={NODES[b][0]}
                y2={NODES[b][1]}
                stroke="#e8dcc0"
                strokeWidth={9}
                strokeLinecap="round"
              />
            ))}
          </Draw>
          {NODES.map((p, i) => {
            const s = progress(frame, 54 + i * 4, 18, Easing.outBack);
            return (
              <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${s})`}>
                <circle
                  r={20}
                  fill={i === 0 ? "#f0a04b" : "#1e2326"}
                  stroke={i === 0 ? "#ffcf8a" : "#e8dcc0"}
                  strokeWidth={9}
                />
                {i === 0 && (
                  <circle r={30} fill="none" stroke="#f0a04b" strokeWidth={2} opacity={0.35 * glow} />
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 880, width: 600, top: 590, textAlign: "center" }}>
        <Reveal at={78} duration={24} className="display" style={{ fontSize: 76, color: "var(--fg)" }}>
          ArchDev
        </Reveal>
        <Reveal
          at={84}
          duration={20}
          className="mono"
          style={{
            fontSize: 24,
            color: "var(--amber)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginTop: 10,
          }}
        >
          early access · archdev.ai
        </Reveal>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade }} />
    </Room>
  );
}

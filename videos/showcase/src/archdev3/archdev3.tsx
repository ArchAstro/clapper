import {
  AbsoluteFill,
  Alert,
  Camera,
  Caption,
  Chord,
  Click,
  Counter,
  Draw,
  Duck,
  defineScenes,
  Easing,
  hatchLines,
  interpolate,
  Keystroke,
  Panel,
  Pattern,
  Pluck,
  progress,
  Reveal,
  RoomTone,
  roughEllipse,
  roughPath,
  roughRect,
  type ScenePlan,
  Scenes,
  PencilScratch as Scratch,
  PaperScroll as Scroll,
  Sequence,
  SfxWord as Sfx,
  SketchStamp as Stamp,
  scribble,
  SketchThought as Thought,
  Thump,
  Tone,
  Typewriter,
  Typing,
  useBoil,
  useFrame,
  Whoosh,
  SketchWindow as Win,
} from "@archastro/clapper-core";
import type { ReactNode } from "react";
import { Grain } from "../kit";
import { D } from "./data";
import { POSES, Scribble, usePose } from "./scribble";

/**
 * ARCHDEV v3 — the rage comic. Same story as v2 (plan → six agents → the
 * 1,284-line PR → 2 AM → tease), drawn in boiling ink on paper with one red
 * pencil. Panels are hard cuts with a paper flip. 31.3 s.
 */
export const SCENES = defineScenes(
  {
    open: { frames: 90 },
    plan: { frames: 175 },
    agents: { frames: 210 },
    review: { frames: 210 },
    blank: { frames: 135 },
    tease: { frames: 120 },
  },
  { fps: 30 },
);

export const INK = "var(--ink)";
export const PAPER = "var(--paper)";
export const RED = "var(--red)";
/** Figure placement inside the panel (panel inner box is 1760×920). */
export const FIG = { x: 880, y: 700 };

/* --------------------------------- scenes --------------------------------- */

export function Open() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([
    { at: 0, pose: "happy" },
    { at: 46, pose: "typing", ease: "inOutCubic" },
  ]);
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} typing={frame > 40 ? 0.55 : 0} />
      {/* poster frame: the caption is already drawn at frame 0, the terminal starts sketching at once */}
      <Caption at={-8} textDelay={2} w={260}>
        {D.time0}
      </Caption>
      <Win x={70} y={150} w={560} h={230} title="terminal" at={0} lines={3} seedOff={1}>
        <div className="hand" style={{ position: "absolute", left: 26, top: 164, fontSize: 32 }}>
          <span style={{ color: "var(--muted)" }}>› </span>
          <Typewriter text={D.prompt} at={34} cps={13} />
        </div>
        <Typing text={D.prompt} at={34} cps={13} volume={0.1} pan={-0.3} />
      </Win>
      <Thought at={9} x={990} y={400} w={340} h={110} exitAt={82}>
        {D.thought0}
      </Thought>
      <Scratch at={0} pan={-0.3} />
      <Scratch at={9} volume={0.08} pan={0.3} length={6} />
    </Panel>
  );
}

export function Plan() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([
    { at: 0, pose: "reading" },
    { at: 34, pose: "wide", ease: "outBack" },
    { at: 96, pose: { ...POSES.wide, tilt: 16, pupil: 1, hy: 14, hx: 30 } },
    {
      at: 150,
      pose: { ...POSES.wide, tilt: 4, pupil: 0.6, hy: 0, hx: 0, eyes: 1.5, open: 0.7 },
      ease: "outBack",
    },
  ]);
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} />
      <Win
        x={1130}
        y={60}
        w={560}
        h={230}
        title="PLAN.md"
        at={4}
        lines={4}
        seedOff={2}
        right={
          <span style={{ color: RED }}>
            <Counter
              from={12}
              to={D.planLines}
              at={30}
              duration={120}
              format={(n) => `${Math.round(n).toLocaleString()} lines`}
            />
          </span>
        }
      />
      <Scroll at={30} x={1172} y={290} w={476} maxH={660} foldAt={FIG.y - 290} />
      <Sfx at={40} x={960} y={330} rot={6} size={44} color="var(--muted)" exitAt={80}>
        hmm.
      </Sfx>
      <Sfx at={84} x={980} y={310} rot={-4} size={56} color="var(--muted)" exitAt={124}>
        wait.
      </Sfx>
      <Sfx at={128} x={960} y={280} rot={5} size={84} color={RED}>
        WAIT.
      </Sfx>
      <Caption at={100} w={640}>
        {D.planCaption}
      </Caption>
      <Scratch at={4} pan={0.3} />
      <Whoosh at={30} durationInFrames={64} from={1100} to={260} volume={0.11} name="unroll" />
      {Array.from({ length: 9 }).map((_, i) => (
        <Click key={i} at={34 + i * 11} volume={0.05} freq={1500 + i * 60} name="page" />
      ))}
      {frame >= 100 && <Scratch at={100} volume={0.09} />}
    </Panel>
  );
}

const WINS = [
  { x: 30, y: 160, w: 450, h: 200 },
  { x: 30, y: 390, w: 450, h: 200 },
  { x: 1280, y: 160, w: 450, h: 200 },
  { x: 1280, y: 390, w: 450, h: 200 },
  { x: 640, y: 22, w: 400, h: 170 },
  { x: 1060, y: 22, w: 400, h: 170 },
];
const PINGS = [80, 92, 102, 110, 116, 121, 140, 152, 164, 176, 188, 200];

export function Agents({ roundRage = false }: { roundRage?: boolean } = {}) {
  const seed = useBoil(4);
  const frame = useFrame();
  const FURY = 126;
  const fury = progress(frame, FURY, 8, Easing.outCubic);
  const roundShock = { ...POSES.wide, eyes: 1.5, brow: 0, mouth: -0.9, open: 0.12, pupil: 0.5 };
  const ragePose = roundRage
    ? { ...POSES.rage, eyes: 1.55, brow: 0, mouth: -1, open: 0.12, pupil: 0.5, tilt: 1, hy: -4 }
    : POSES.rage;
  // the windows get blown outward by the hammering: columns slide off the sides, the top row flies up
  const scatter = progress(frame, FURY, 16, Easing.outBack);
  const pose = usePose([
    { at: 0, pose: { ...POSES.wide, eyes: 1.5, open: 0.7, tilt: 4 } },
    { at: 14, pose: "swivelL", ease: "outBack", arc: 10 },
    { at: 42, pose: "swivelR", ease: "outBack", arc: 14 },
    { at: 68, pose: "swivelL", ease: "outBack", arc: 14 },
    { at: 92, pose: "swivelR", ease: "outBack", arc: 12 },
    { at: 112, pose: roundRage ? roundShock : "wide", ease: "outBack" },
    { at: FURY, pose: ragePose, ease: "outBack", arc: 22 },
    { at: 208, pose: ragePose },
  ]);
  return (
    <Camera
      keyframes={[
        { frame: 0, zoom: 1 },
        { frame: FURY - 2, zoom: 1 },
        { frame: FURY + 12, zoom: 1.24, x: 960, y: 620, easing: Easing.outBack },
        { frame: FURY + 46, zoom: 1.27, x: 960, y: 616 },
        { frame: FURY + 52, zoom: 1.34, x: 960, y: 612, easing: Easing.outBack },
        { frame: 209, zoom: 1.3, x: 960, y: 618, easing: Easing.inOutCubic },
      ]}
    >
      <Panel seed={seed}>
        {WINS.map((w, i) => (
          <Win
            key={i}
            {...w}
            title={D.agents[i]}
            at={i * 12}
            lines={3}
            seedOff={10 + i}
            shake={fury * 0.8}
            dx={i < 2 ? -scatter * 560 : i < 4 ? scatter * 560 : 0}
            dy={i >= 4 ? -scatter * 260 : 0}
          />
        ))}
        {WINS.map((w, i) => (
          <Sfx
            key={`p${i}`}
            at={2 + i * 12}
            x={w.x + w.w - 150}
            y={w.y - 26}
            rot={i % 2 ? 8 : -8}
            size={54}
            color={RED}
            exitAt={2 + i * 12 + 26}
          >
            PING!
          </Sfx>
        ))}
        {PINGS.filter((f) => f < FURY).map((f, i) => {
          const w = WINS[i % 6];
          return (
            <Sfx
              key={`q${i}`}
              at={f}
              x={w.x + (i % 6 < 2 ? 170 : 60) + (i % 3) * 30}
              y={w.y + 60 + (i % 2) * 40}
              rot={(i % 5) * 4 - 8}
              size={40 + (i % 3) * 8}
              color={RED}
              exitAt={f + 22}
            >
              {i % 3 === 0 ? "needs input" : i % 3 === 1 ? "PING!" : "?"}
            </Sfx>
          );
        })}
        <Scribble
          pose={pose}
          x={FIG.x}
          y={FIG.y}
          typing={frame >= FURY ? 1 : frame < 18 ? 0.5 : 0}
          fury={fury}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Sfx
            key={`t${i}`}
            at={FURY + 6 + i * 12}
            x={[600, 1080, 560, 1120, 640, 1060][i]}
            y={[500, 470, 560, 540, 420, 600][i]}
            rot={i % 2 ? 10 : -12}
            size={64 + (i % 3) * 14}
            exitAt={FURY + 6 + i * 12 + 36}
          >
            {i % 3 === 2 ? "TAPTAPTAP" : "TAP"}
          </Sfx>
        ))}
        <Caption at={0} textDelay={3} x={60} y={60} w={520} exitAt={FURY + 4}>
          {D.agentsCaption}
        </Caption>
        <Caption at={FURY + 8} x={210} y={175} w={660}>
          {D.agentsCaption2}
        </Caption>
        {/* sound: six pings on arrival, nags, then the hammering */}
        {WINS.map((_, i) => (
          <Alert key={`a${i}`} at={2 + i * 12} volume={0.1} name="ping" />
        ))}
        {WINS.map((_, i) => (
          <Scratch key={`s${i}`} at={i * 12} volume={0.08} pan={i < 2 ? -0.5 : i < 4 ? 0.5 : 0} />
        ))}
        {PINGS.filter((f) => f < FURY).map((f, i) => (
          <Alert key={`n${i}`} at={f} volume={0.07 + (i % 3) * 0.012} name="nag" />
        ))}
        <Thump at={FURY} volume={0.4} from={140} to={50} name="fury-hit" />
        <Thump at={FURY + 46} volume={0.28} from={120} to={48} name="fury-hit-2" />
        {Array.from({ length: 22 }).map((_, i) => (
          <Keystroke
            key={`k${i}`}
            at={FURY + 2 + i * 4 + (i % 3 === 0 ? 1 : 0)}
            volume={0.14 + (i % 4) * 0.018}
            seed={i}
            pan={i % 2 ? 0.2 : -0.2}
          />
        ))}
        <Whoosh at={FURY} durationInFrames={10} from={600} to={2400} volume={0.1} name="scatter" />
      </Panel>
    </Camera>
  );
}

const REVIEW_PILE = [
  ["agent review", "3 new comments"],
  ["security", "changes requested"],
  ["CI review", "8 new findings"],
  ["agent 4", "12 suggestions"],
  ["agent 5", "conflicts found"],
  ["agent 6", "reviewing again…"],
] as const;

export function Review({ pileup = false }: { pileup?: boolean } = {}) {
  const seed = useBoil(4);
  const frame = useFrame();
  const STAMP = 118;
  const pose = usePose(
    pileup
      ? [
          { at: 0, pose: "reading" },
          { at: 40, pose: "dead", ease: "inOutCubic" },
          { at: STAMP - 10, pose: { ...POSES.dead, rhx: 60, rhy: -34 }, ease: "outBack", arc: 16 },
          { at: STAMP + 2, pose: { ...POSES.dead, rhx: 60, rhy: -18 }, ease: "outExpo" },
          {
            at: STAMP + 15,
            pose: {
              ...POSES.wide,
              eyes: 1.75,
              brow: 0,
              open: 0.65,
              mouth: -0.55,
              sweat: 0.7,
              pupil: 0.35,
              tilt: -5,
            },
            ease: "outBack",
          },
          {
            at: STAMP + 48,
            pose: {
              ...POSES.wide,
              eyes: 1.8,
              brow: 0,
              open: 0.22,
              mouth: -1,
              sweat: 1,
              pupil: 0.55,
              tilt: 7,
              hy: -12,
              lhx: -82,
              lhy: -218,
              rhx: 82,
              rhy: -218,
            },
            ease: "outBack",
            arc: 18,
          },
          {
            at: STAMP + 88,
            pose: {
              ...POSES.wide,
              eyes: 1.65,
              brow: 0,
              open: 0.12,
              mouth: -1,
              sweat: 1,
              pupil: 0.75,
              tilt: -6,
              hy: -6,
              lhx: -88,
              lhy: -214,
              rhx: 88,
              rhy: -214,
            },
            ease: "inOutCubic",
          },
        ]
      : [
          { at: 0, pose: "reading" },
          { at: 40, pose: "dead", ease: "inOutCubic" },
          { at: STAMP - 10, pose: { ...POSES.dead, rhx: 60, rhy: -34 }, ease: "outBack", arc: 16 },
          { at: STAMP + 2, pose: { ...POSES.dead, rhx: 60, rhy: -18 }, ease: "outExpo" },
          { at: STAMP + 30, pose: { ...POSES.dead, mouth: 0.2 }, ease: "inOutCubic" },
          { at: STAMP + 70, pose: { ...POSES.dead, mouth: 0.2, tilt: 3, hy: 22 }, ease: "inOutCubic" },
        ],
  );
  const read = Math.min(
    D.readTo,
    Math.round(interpolate(frame, [12, 100], [0, D.readTo], { easing: Easing.linear })),
  );
  return (
    <Panel seed={seed}>
      {pileup &&
        REVIEW_PILE.map(([source, message], i) => {
          const at = STAMP + 12 + i * 12;
          if (frame < at) return null;
          const enter = progress(frame, at, 8, Easing.outBack);
          const left = [1390, 1080, 1430, 870, 1370, 1050][i];
          const top = [92, 185, 278, 382, 488, 590][i];
          return (
            <div
              key={source}
              style={{
                position: "absolute",
                left,
                top,
                width: 320,
                height: 104,
                transform: `translateX(${(1 - enter) * 180}px) rotate(${i % 2 ? 2 : -2}deg) scale(${0.86 + enter * 0.14})`,
                transformOrigin: "right center",
                zIndex: 2,
              }}
            >
              <svg width={320} height={104} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <path
                  d={roughRect(3, 3, 314, 98, seed + 500 + i, 1.8)}
                  fill={PAPER}
                  stroke={i === 1 || i === 4 ? RED : INK}
                  strokeWidth={3.5}
                />
              </svg>
              <div
                className="mono"
                style={{
                  position: "absolute",
                  left: 16,
                  top: 13,
                  width: 288,
                  color: RED,
                  fontSize: 18,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {source}
              </div>
              <div
                className="hand"
                style={{
                  position: "absolute",
                  left: 16,
                  top: 42,
                  width: 288,
                  color: INK,
                  fontSize: 29,
                  lineHeight: 1.05,
                }}
              >
                {message}
              </div>
            </div>
          );
        })}
      <Scribble
        pose={pose}
        x={FIG.x + 380}
        y={FIG.y}
        fury={pileup ? progress(frame, STAMP + 34, 16, Easing.outCubic) * 0.16 : 0}
      />
      <Win
        x={50}
        y={50}
        w={800}
        h={660}
        title={D.prTitle}
        at={2}
        lines={17}
        seedOff={3}
        right={<span style={{ color: RED }}>{D.prStat}</span>}
      >
        {/* a few red lines in the diff */}
        <svg width={800} height={660} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {[2, 5, 9, 13].map((i) => (
            <path
              key={i}
              d={scribble(24, 76 + i * 30 + 6, 260 + (i % 3) * 90, seed + 90 + i)}
              fill="none"
              stroke={RED}
              strokeWidth={2.4}
              opacity={0.75}
            />
          ))}
        </svg>
        <div
          className="hand"
          data-copy=""
          style={{ position: "absolute", right: 24, bottom: 14, fontSize: 30, color: "var(--muted)" }}
        >
          line {read.toLocaleString()} / {D.prLines.toLocaleString()}
        </div>
        <div style={{ position: "absolute", left: 24, bottom: 12, width: 190, height: 56 }}>
          <svg width={190} height={56} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              d={roughRect(3, 3, 184, 50, seed + 71, 1.6)}
              fill={frame >= STAMP ? "var(--light)" : PAPER}
              stroke={INK}
              strokeWidth={3.5}
            />
          </svg>
          <div
            className="hand"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            {pileup && frame >= STAMP ? "Accepted ✓" : "Approve"}
          </div>
        </div>
      </Win>
      <Sfx at={STAMP - 26} x={1120} y={300} rot={-6} size={56} color="var(--muted)" exitAt={STAMP + 6}>
        lgtm
      </Sfx>
      <Stamp at={STAMP} x={330} y={330} />
      <Caption at={4} w={620} exitAt={STAMP + 6}>
        {D.reviewCaption}
      </Caption>
      <Caption at={STAMP + 10} w={860}>
        {D.reviewCaption2}
      </Caption>
      <Scratch at={2} pan={-0.4} />
      {Array.from({ length: 7 }).map((_, i) => (
        <Click key={i} at={14 + i * 13} volume={0.04} freq={1300} name="scroll" />
      ))}
      <Click at={STAMP - 2} volume={0.2} freq={900} name="mouse" />
      <Thump at={STAMP} volume={0.55} from={180} to={60} name="stamp" />
      <Tone
        at={STAMP}
        durationInFrames={6}
        freq={2600}
        wave="noise"
        cutoff={2200}
        attack={0.002}
        decay={0.06}
        sustain={0}
        release={0.03}
        volume={0.16}
        name="stamp-slap"
      />
    </Panel>
  );
}

export function Blank() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([
    { at: 0, pose: "dead" },
    { at: 26, pose: "slump", ease: "inOutCubic", arc: 12 },
  ]);
  const hatch = hatchLines(0, 0, 1760, 920, 11, seed + 70, -42, 0.9);
  const cursorOn = Math.floor(frame / 16) % 2 === 0;
  return (
    <Panel seed={seed}>
      <svg width={1760} height={920} style={{ position: "absolute", inset: 0 }}>
        <g stroke={INK} strokeWidth={2.4} fill="none" opacity={0.62} strokeLinecap="round">
          {hatch.map((l, i) => (
            <path key={i} d={roughPath(l, seed + 200 + i, 0.8, false, 40)} />
          ))}
        </g>
      </svg>
      {/* the blank screen glows */}
      <div style={{ position: "absolute", left: 560, top: 100, width: 640, height: 420 }}>
        <svg width={640} height={420} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={roughRect(3, 3, 634, 414, seed + 81, 2)} fill={PAPER} stroke={INK} strokeWidth={4} />
          <path
            d={roughPath(
              [
                [3, 44],
                [637, 44],
              ],
              seed + 82,
              1.2,
            )}
            fill="none"
            stroke={INK}
            strokeWidth={3}
          />
          {cursorOn && <rect x={30} y={78} width={16} height={30} fill={INK} />}
        </svg>
        <div
          className="hand"
          style={{ position: "absolute", left: 24, top: 6, fontSize: 27, color: "var(--muted)" }}
        >
          untitled
        </div>
      </div>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} />
      <Caption at={0} textDelay={3} w={260}>
        {D.night}
      </Caption>
      <Thought at={22} x={990} y={410} w={200} h={90} size={64} exitAt={66}>
        {D.thought1}
      </Thought>
      <Thought at={72} x={990} y={410} w={420} h={110} size={40}>
        {D.thought2}
      </Thought>
      {/* the last tick lands after the duck has released, so it is pre-attenuated to match the ducked ones */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Click key={i} at={8 + i * 30} volume={i === 4 ? 0.04 : 0.16} freq={1700} name="tick" />
      ))}
    </Panel>
  );
}

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
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([
    { at: 0, pose: "dead" },
    { at: 18, pose: "spark", ease: "outBack" },
    { at: 60, pose: { ...POSES.spark, tilt: -4 } },
  ]);
  const MARK = 22;
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} blinkPeriod={52} />
      <svg width={1760} height={920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform="translate(880 240) scale(1.05)">
          <Draw at={MARK} duration={40} each={4} easing={Easing.inOutCubic}>
            {EDGES.map(([a, b], i) => (
              <path
                key={`e${i}`}
                d={roughPath([NODES[a], NODES[b]], seed + 300 + i, 1.6)}
                fill="none"
                stroke={INK}
                strokeWidth={5}
                strokeLinecap="round"
              />
            ))}
            {NODES.map(([nx, ny], i) => (
              <path
                key={`n${i}`}
                d={roughEllipse(nx, ny, 16, 16, seed + 320 + i, 1.2)}
                fill={frame >= MARK + 22 + i * 4 ? (i === 0 ? RED : PAPER) : "none"}
                stroke={INK}
                strokeWidth={4}
              />
            ))}
          </Draw>
        </g>
      </svg>
      <svg
        width={1760}
        height={920}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <g transform="translate(880 240) scale(1.05)">
          <Draw at={98} duration={12}>
            <path
              d={roughEllipse(NODES[0][0], NODES[0][1], 24, 24, seed + 340, 1.4)}
              fill="none"
              stroke={RED}
              strokeWidth={3.5}
            />
          </Draw>
        </g>
      </svg>
      <Caption at={66} w={560}>
        {D.teaseCaption}
      </Caption>
      <Reveal
        at={88}
        duration={22}
        className="script"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 34,
          textAlign: "center",
          fontSize: 64,
          color: RED,
        }}
      >
        {D.url}
      </Reveal>
      <Scratch at={MARK} volume={0.1} length={14} />
      <Scratch at={MARK + 14} volume={0.1} length={14} pan={0.2} />
      <Scratch at={MARK + 28} volume={0.1} length={12} pan={-0.2} />
      <Scratch at={66} volume={0.08} />
      {frame >= 88 && <Scratch at={88} volume={0.08} length={16} />}
      <Scratch at={98} volume={0.07} length={10} pan={0.1} />
    </Panel>
  );
}

/* --------------------------------- score --------------------------------- */

/**
 * The shared score for the comic story (open → plan → agents → review → blank), keyed off whichever
 * scene plan the film uses. Scenes the plan does not have are skipped. `tail` adds film-specific cues.
 */
export function Score({ plan, tail }: { plan: ScenePlan<any>; tail?: ReactNode }) {
  const S = plan;
  const has = (n: string) => (S.names as string[]).includes(n);
  return (
    <>
      <RoomTone volume={0.006} durationInFrames={S.total} fadeIn={30} fadeOut={45} />
      {has("open") && (
        <Sequence from={S.start("open")} durationInFrames={S.duration("open")} name="score-open">
          <Pattern
            bpm={104}
            step={0.25}
            at={4}
            steps="C4 . E4 . G4 . E4 . A4 . G4 . E4 . C4 ."
            wave="pluck"
            brightness={0.7}
            volume={0.12}
            reverb={0.25}
            repeat={2}
            humanize={0.02}
            name="motif"
          />
          <Pattern
            bpm={104}
            step={0.5}
            at={4}
            steps="C3 . G2 . A2 . G2 ."
            wave="pluck"
            brightness={0.4}
            volume={0.13}
            reverb={0.15}
            repeat={3}
            name="bass"
          />
          <Pluck note="C5" at={S.duration("open") - 8} volume={0.12} reverb={0.3} name="open-close" />
        </Sequence>
      )}
      {has("plan") && (
        <Sequence from={S.start("plan")} durationInFrames={S.duration("plan")} name="score-plan">
          <Pattern
            bpm={104}
            step={0.25}
            at={0}
            steps="C4 . E4 G4 . . A4 . B4 . . . C5 . . ."
            wave="pluck"
            brightness={0.7}
            volume={0.11}
            reverb={0.3}
            repeat={4}
            humanize={0.02}
            name="plan-motif"
          />
          <Pattern
            bpm={104}
            step={0.5}
            at={0}
            steps="C3 . G2 . F2 . G2 ."
            wave="pluck"
            brightness={0.4}
            volume={0.13}
            reverb={0.15}
            repeat={4}
            name="plan-bass"
          />
          <Pluck note="G4" at={S.duration("plan") - 8} volume={0.12} reverb={0.3} name="plan-close" />
        </Sequence>
      )}
      {has("agents") && (
        <Sequence from={S.start("agents")} durationInFrames={S.duration("agents")} name="score-agents">
          <Pattern
            bpm={116}
            step={0.25}
            at={0}
            steps="E4 . E4 . F4 . F4 . G4 . G4 . A4 . A4 ."
            wave="pluck"
            brightness={0.75}
            volume={0.11}
            reverb={0.3}
            repeat={3}
            humanize={0.02}
            name="agents-rise"
          />
          <Pattern
            bpm={116}
            step={0.5}
            at={0}
            steps="A2 . A2 . C3 . D3 ."
            wave="pluck"
            brightness={0.45}
            volume={0.14}
            reverb={0.15}
            repeat={5}
            name="agents-bass"
          />
          <Pattern
            bpm={116}
            step={0.25}
            at={126}
            steps="A4 . C5 A4 . A4 C5 . E5 . C5 A4"
            wave="pluck"
            brightness={0.42}
            volume={0.085}
            reverb={0.4}
            repeat={2}
            humanize={0.05}
            name="fury-tremolo"
          />
        </Sequence>
      )}
      {has("review") && (
        <Sequence from={S.start("review")} durationInFrames={S.duration("review")} name="score-review">
          <Pattern
            bpm={92}
            step={0.5}
            at={0}
            steps="A2 . . . C3 . . . E3 . . . D3 . . ."
            wave="pluck"
            brightness={0.4}
            volume={0.13}
            reverb={0.25}
            repeat={2}
            name="review-bass"
          />
          <Pattern
            bpm={92}
            step={0.25}
            at={0}
            steps="E4 . . . C4 . . . A3 . . . . . . ."
            wave="epiano"
            volume={0.08}
            reverb={0.4}
            repeat={3}
            name="review-sigh"
          />
        </Sequence>
      )}
      {/* starts after the paper flip so the whoosh is not swallowed; releases before the next flip */}
      {has("blank") && (
        <Duck
          at={S.start("blank") + 8}
          durationInFrames={S.duration("blank") - 24}
          depth={0.2}
          attack={8}
          release={12}
        />
      )}
      {has("tease") && (
        <Sequence from={S.start("tease")} durationInFrames={S.duration("tease")} name="score-tease">
          <Chord
            at={18}
            notes={["C3", "G3", "E4", "B4"]}
            wave="epiano"
            strum={3}
            ring={3}
            volume={0.09}
            reverb={0.5}
            width={0.5}
            name="tease-chord"
          />
          <Pattern
            bpm={104}
            step={0.25}
            at={66}
            steps="C5 . E5 . G5 ."
            wave="pluck"
            brightness={0.7}
            volume={0.1}
            reverb={0.45}
            name="tease-motif"
          />
          <Pluck note="C6" at={100} volume={0.14} reverb={0.5} name="ding" />
        </Sequence>
      )}
      {tail}
      {S.cuts().map((c) => (
        <Whoosh key={c} at={c - 4} durationInFrames={9} from={1250} to={280} volume={0.045} name="flip" />
      ))}
    </>
  );
}

export function ArchDev3() {
  return (
    <AbsoluteFill className="archdev3">
      <Score plan={SCENES} />
      <Scenes plan={SCENES}>
        <Scenes.Scene name="open">
          <Open />
        </Scenes.Scene>
        <Scenes.Scene name="plan">
          <Plan />
        </Scenes.Scene>
        <Scenes.Scene name="agents">
          <Agents />
        </Scenes.Scene>
        <Scenes.Scene name="review">
          <Review />
        </Scenes.Scene>
        <Scenes.Scene name="blank">
          <Blank />
        </Scenes.Scene>
        <Scenes.Scene name="tease">
          <Tease />
        </Scenes.Scene>
      </Scenes>
      <Grain opacity={0.05} blend="multiply" tile={280} />
    </AbsoluteFill>
  );
}

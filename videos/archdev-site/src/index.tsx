import {
  AbsoluteFill,
  Caption,
  Composition,
  Counter,
  Draw,
  Easing,
  hatchLines,
  interpolate,
  Panel,
  progress,
  Rough,
  registerRoot,
  roughEllipse,
  roughPath,
  roughRect,
  SfxWord as Sfx,
  SketchStamp as Stamp,
  scribble,
  sketchHash,
  SketchThought as Thought,
  useBoil,
  useFrame,
  SketchWindow as Win,
} from "@archastro/clapper-core";
import {
  SCRIBBLE_POSES as POSES,
  Scribble,
  type ScribblePose,
  useScribblePose as usePose,
} from "@archastro/clapper-core/rigs";
import type { ReactNode } from "react";
import { D } from "./data";
import "./fonts/fonts.css";
import "./theme.css";

/**
 * ArchDev site loops. Each composition is one seamless cycle of the rage-comic
 * paper world from the archdev3 teaser, paced slower for a page that sits
 * still. Every loop ends on a paper flip, so frame N-1 (blank sheet) hands off
 * to frame 0 (sketches drawing in) without a seam. No sound: the page is muted.
 */

const INK = "var(--ink)";
const PAPER = "var(--paper)";
const RED = "var(--red)";
const LIGHT = "var(--light)";
const BOIL = 5;

/* --------------------------------- helpers -------------------------------- */

/** A paper sheet sliding in from the right to blank the panel: the loop's reset beat. */
function Flip({ at, duration = 10, w, h }: { at: number; duration?: number; w: number; h: number }) {
  const frame = useFrame();
  const seed = useBoil(BOIL);
  if (frame < at) return null;
  const p = progress(frame, at, duration, Easing.inOutCubic);
  const x = (1 - p) * (w + 40);
  return (
    <svg
      width={w + 60}
      height={h}
      style={{ position: "absolute", left: x, top: 0, overflow: "visible", zIndex: 40 }}
    >
      <path
        d={roughPath(
          [
            [0, -10],
            [w + 60, -10],
            [w + 60, h + 10],
            [0, h + 10],
          ],
          seed + 501,
          3,
          true,
        )}
        fill={PAPER}
        stroke={INK}
        strokeWidth={4}
      />
      <path
        d={roughPath(
          [
            [10, -10],
            [10, h + 10],
          ],
          seed + 502,
          2,
        )}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        opacity={0.35}
      />
    </svg>
  );
}

/** The plan, unrolling off a window and folding over the desk edge. `h` is driven by the scene. */
function Scroll({
  x,
  y,
  w,
  h,
  maxH,
  foldAt,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  maxH: number;
  foldAt: number;
}) {
  const seed = useBoil(BOIL);
  if (h <= 4) return null;
  const n = Math.max(0, Math.floor((h - 26) / 26));
  const bend = 34;
  const off = (py: number) => (py > foldAt ? Math.min(1, (py - foldAt) / 60) * bend : 0);
  const outline: [number, number][] =
    h > foldAt
      ? [
          [2, 0],
          [w - 2, 0],
          [w - 2, foldAt],
          [w - 2 + bend, foldAt + 60],
          [w - 2 + bend, h],
          [2 + bend, h],
          [2 + bend, foldAt + 60],
          [2, foldAt],
        ]
      : [
          [2, 0],
          [w - 2, 0],
          [w - 2, h],
          [2, h],
        ];
  return (
    <svg
      width={w + 60}
      height={maxH + 40}
      style={{ position: "absolute", left: x, top: y, overflow: "visible", zIndex: 5 }}
    >
      <path d={roughPath(outline, seed + 31, 2, true)} fill={PAPER} stroke={INK} strokeWidth={4} />
      {h > foldAt && (
        <path
          d={roughPath(
            [
              [2, foldAt],
              [w - 2, foldAt],
            ],
            seed + 32,
            1.2,
          )}
          fill="none"
          stroke={INK}
          strokeWidth={2.5}
          opacity={0.55}
        />
      )}
      {Array.from({ length: n }).map((_, i) => {
        const py = 26 + i * 26;
        return (
          <path
            key={i}
            d={scribble(22 + off(py), py, (w - 56) * (0.35 + sketchHash(5, i) * 0.6), seed + 40 + i)}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            opacity={0.5}
          />
        );
      })}
      <path
        d={roughEllipse(w / 2 + off(h), h + 2, w / 2 - 2, 13, seed + 33, 1.5)}
        fill={LIGHT}
        stroke={INK}
        strokeWidth={4}
      />
    </svg>
  );
}

/** A big sketched push button with a marker label. `press` 0..1 squashes it. */
function Button({
  x,
  y,
  w,
  h,
  label,
  color = INK,
  press = 0,
  at = 0,
  drawDuration = 12,
  seedOff = 0,
  size = 34,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color?: string;
  press?: number;
  at?: number;
  drawDuration?: number;
  seedOff?: number;
  size?: number;
}) {
  const seed = useBoil(BOIL) + seedOff * 7;
  const frame = useFrame();
  if (frame < at) return null;
  const squash = 1 - 0.22 * press;
  const ink = progress(frame, at + drawDuration * 0.4, drawDuration * 0.6, Easing.outCubic);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `scaleY(${squash})`,
        transformOrigin: "center bottom",
        zIndex: 6,
      }}
    >
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Draw at={at} duration={drawDuration} each={2}>
          <path
            d={roughRect(6, h * 0.55, w - 12, h * 0.42, seed + 81, 1.6)}
            fill={LIGHT}
            stroke={color}
            strokeWidth={3.5}
          />
          <path
            d={roughEllipse(w / 2, h * 0.45, w / 2 - 4, h * 0.3, seed + 82, 1.8)}
            fill={press > 0.5 ? LIGHT : PAPER}
            stroke={color}
            strokeWidth={4}
          />
        </Draw>
      </svg>
      <div
        className="marker"
        data-copy=""
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h * 0.45 - size * 0.62,
          textAlign: "center",
          fontSize: size,
          color,
          lineHeight: 1,
          whiteSpace: "nowrap",
          opacity: ink,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/** Blinking terminal cursor inside a blank sketched window. */
function BlankWindow({
  x,
  y,
  w,
  h,
  title,
  period = 30,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  period?: number;
}) {
  const frame = useFrame();
  const seed = useBoil(BOIL);
  const on = Math.floor(frame / period) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={roughRect(3, 3, w - 6, h - 6, seed + 81, 2)} fill={PAPER} stroke={INK} strokeWidth={4} />
        <path
          d={roughPath(
            [
              [3, 44],
              [w - 3, 44],
            ],
            seed + 82,
            1.2,
          )}
          fill="none"
          stroke={INK}
          strokeWidth={3}
        />
        {on && <rect x={30} y={78} width={16} height={30} fill={INK} />}
      </svg>
      <div
        className="hand"
        style={{ position: "absolute", left: 24, top: 6, fontSize: 27, color: "var(--muted)" }}
      >
        {title}
      </div>
    </div>
  );
}

/** Pencil hatching over the whole sheet: the 2 AM room. */
function Night({ w, h }: { w: number; h: number }) {
  const seed = useBoil(BOIL);
  const hatch = hatchLines(0, 0, w, h, 11, seed + 70, -42, 0.9);
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      <g stroke={INK} strokeWidth={2.4} fill="none" opacity={0.6} strokeLinecap="round">
        {hatch.map((l, i) => (
          <path key={i} d={roughPath(l, seed + 200 + i, 0.8, false, 40)} />
        ))}
      </g>
    </svg>
  );
}

/** A red diff: a few red scribbled lines inside a PR window. */
function RedLines({ w, rows, seedOff = 0 }: { w: number; rows: number[]; seedOff?: number }) {
  const seed = useBoil(BOIL) + seedOff;
  return (
    <svg width={w} height={600} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {rows.map((i) => (
        <path
          key={i}
          d={scribble(24, 76 + i * 30 + 6, (w - 120) * (0.35 + (i % 3) * 0.2), seed + 90 + i)}
          fill="none"
          stroke={RED}
          strokeWidth={2.4}
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

/** Onomatopoeia and pings live above every window and scroll. */
function Top({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>{children}</div>;
}

type Sheet = { w: number; h: number; inset: number };
const HERO: Sheet = { w: 1600, h: 1200, inset: 50 };
const CARD: Sheet = { w: 1200, h: 900, inset: 44 };
const WIDE: Sheet = { w: 1600, h: 900, inset: 44 };
const OG: Sheet = { w: 2400, h: 1260, inset: 60 };
const inner = (s: Sheet) => ({ w: s.w - s.inset * 2, h: s.h - s.inset * 2 });

function Paper({ sheet, children }: { sheet: Sheet; children: ReactNode }) {
  const seed = useBoil(BOIL);
  return (
    <AbsoluteFill className="site">
      <Panel seed={seed} width={sheet.w} height={sheet.h} inset={sheet.inset} paper="#f5f3ee" ink="#161616">
        {children}
      </Panel>
    </AbsoluteFill>
  );
}

/* ---------------------------------- hero ---------------------------------- */
/**
 * 14 s. One small feature, then the plan unrolls, then the pull requests stack
 * up, then the pings. The figure goes happy → reading → wide → swivel → dead.
 */
export const HERO_LEN = 420;

function Hero() {
  const { w, h } = inner(HERO);
  const frame = useFrame();
  const FIG = { x: w / 2, y: 850 };
  const FLIP = HERO_LEN - 12;
  const pose = usePose([
    { at: 0, pose: "happy" },
    { at: 40, pose: "typing", ease: "inOutCubic" },
    { at: 90, pose: "reading", ease: "inOutCubic" },
    { at: 150, pose: "wide", ease: "outBack" },
    { at: 200, pose: { ...POSES.wide, tilt: 14, pupil: 1, hy: 12, hx: 26 }, ease: "inOutCubic" },
    { at: 240, pose: "swivelL", ease: "outBack", arc: 10 },
    { at: 280, pose: "swivelR", ease: "outBack", arc: 12 },
    { at: 316, pose: { ...POSES.wide, sweat: 1, eyes: 1.5, open: 0.6 }, ease: "outBack" },
    { at: 360, pose: { ...POSES.dead, sweat: 0.8 }, ease: "inOutCubic" },
    { at: FLIP + 10, pose: { ...POSES.dead, sweat: 0.8 } },
  ]);
  const scrollH = interpolate(frame, [110, 250], [0, 620], { easing: Easing.inOutCubic });
  const PRS = [
    { at: 205, x: 40, y: 80 },
    { at: 250, x: 84, y: 140 },
    { at: 292, x: 128, y: 200 },
  ];
  return (
    <Paper sheet={HERO}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} typing={frame > 36 && frame < 100 ? 0.5 : 0} />
      <Thought at={6} x={FIG.x + 110} y={530} w={360} h={112} size={38} exitAt={84}>
        {D.thoughtSmall}
      </Thought>

      {/* the plan */}
      <Win
        x={w - 500}
        y={64}
        w={460}
        h={200}
        title={D.planTitle}
        at={96}
        lines={4}
        seedOff={2}
        right={
          <span style={{ color: RED }}>
            <Counter
              from={12}
              to={D.planLines}
              at={112}
              duration={140}
              format={(n) => `${Math.round(n).toLocaleString()} lines`}
            />
          </span>
        }
      />
      <Scroll x={w - 460} y={264} w={380} h={scrollH} maxH={640} foldAt={FIG.y - 264} />
      <Top>
        <Sfx at={150} x={FIG.x + 150} y={420} rot={-5} size={52} color="var(--muted)" exitAt={200}>
          hmm.
        </Sfx>
        <Sfx at={214} x={FIG.x - 420} y={430} rot={-5} size={80} color={RED} exitAt={262}>
          WAIT.
        </Sfx>
      </Top>

      {/* the pull requests */}
      {PRS.map((p, i) => (
        <Win
          key={i}
          x={p.x}
          y={p.y}
          w={560}
          h={300}
          title={D.prs[i].title}
          at={p.at}
          lines={7}
          seedOff={10 + i}
          z={10 + i}
          right={<span style={{ color: RED }}>{D.prs[i].stat}</span>}
        >
          <RedLines w={560} rows={[1, 3, 5]} seedOff={i * 3} />
        </Win>
      ))}
      <Top>
        {PRS.map((p, i) => (
          <Sfx
            key={`p${i}`}
            at={p.at + 2}
            x={p.x + 420}
            y={p.y - 44}
            rot={i % 2 ? 8 : -8}
            size={54}
            color={RED}
            exitAt={p.at + 40}
          >
            PING!
          </Sfx>
        ))}
        {[330, 346, 362].map((f, i) => (
          <Sfx
            key={`n${i}`}
            at={f}
            x={[300, 120, 420][i]}
            y={[520, 600, 640][i]}
            rot={i % 2 ? 6 : -9}
            size={44}
            color={RED}
            exitAt={f + 36}
          >
            {i === 1 ? "needs input" : "?"}
          </Sfx>
        ))}
      </Top>
      <Thought at={372} x={FIG.x + 110} y={530} w={220} h={96} size={60} exitAt={FLIP + 4}>
        {D.thoughtDots}
      </Thought>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

/* ---------------------------------- plans --------------------------------- */
/** 9 s. The plan unrolls off the window and over the desk; it is 2,431 lines long. */
export const PLANS_LEN = 270;

function Plans() {
  const { w, h } = inner(CARD);
  const frame = useFrame();
  const FIG = { x: 400, y: 610 };
  const FLIP = PLANS_LEN - 12;
  const pose = usePose([
    { at: 0, pose: "reading" },
    { at: 60, pose: "wide", ease: "outBack" },
    { at: 130, pose: { ...POSES.wide, tilt: 16, pupil: 1, hy: 14, hx: 30 }, ease: "inOutCubic" },
    {
      at: 190,
      pose: { ...POSES.wide, tilt: 6, pupil: 0.7, eyes: 1.5, open: 0.7, sweat: 0.7 },
      ease: "outBack",
    },
    { at: FLIP + 10, pose: { ...POSES.wide, tilt: 6, pupil: 0.7, eyes: 1.5, open: 0.7, sweat: 0.7 } },
  ]);
  const scrollH = interpolate(frame, [30, 170], [0, 560], { easing: Easing.inOutCubic });
  return (
    <Paper sheet={CARD}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} scale={0.8} />
      <Win
        x={w - 470}
        y={40}
        w={430}
        h={190}
        title={D.planTitle}
        at={4}
        lines={4}
        seedOff={2}
        right={
          <span style={{ color: RED }}>
            <Counter
              from={12}
              to={D.planLines}
              at={30}
              duration={140}
              format={(n) => `${Math.round(n).toLocaleString()} lines`}
            />
          </span>
        }
      />
      <Scroll x={w - 434} y={230} w={356} h={scrollH} maxH={580} foldAt={FIG.y - 230} />
      <Top>
        <Sfx at={50} x={FIG.x + 150} y={300} rot={6} size={44} color="var(--muted)" exitAt={100}>
          hmm.
        </Sfx>
        <Sfx at={104} x={FIG.x + 160} y={280} rot={-4} size={54} color="var(--muted)" exitAt={150}>
          wait.
        </Sfx>
        <Sfx at={156} x={FIG.x - 330} y={280} rot={-5} size={82} color={RED} exitAt={FLIP + 6}>
          WAIT.
        </Sfx>
      </Top>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

/* ----------------------------------- prs ---------------------------------- */
/** 10 s. Read to line 300 of 1,284, stamp it, and two more land on top. */
export const PRS_LEN = 300;

function Prs() {
  const { w, h } = inner(CARD);
  const frame = useFrame();
  const FIG = { x: 860, y: 610 };
  const STAMP = 150;
  const FLIP = PRS_LEN - 12;
  const pose = usePose([
    { at: 0, pose: "reading" },
    { at: 60, pose: "dead", ease: "inOutCubic" },
    { at: STAMP - 12, pose: { ...POSES.dead, rhx: 60, rhy: -34 }, ease: "outBack", arc: 16 },
    { at: STAMP + 2, pose: { ...POSES.dead, rhx: 60, rhy: -18 }, ease: "outExpo" },
    { at: STAMP + 30, pose: { ...POSES.dead, mouth: 0.2 }, ease: "inOutCubic" },
    { at: 214, pose: { ...POSES.wide, sweat: 0.8, eyes: 1.5 }, ease: "outBack" },
    { at: 250, pose: { ...POSES.wide, sweat: 1, eyes: 1.5, open: 0.6, tilt: 8 }, ease: "inOutCubic" },
    { at: FLIP + 10, pose: { ...POSES.wide, sweat: 1, eyes: 1.5, open: 0.6, tilt: 8 } },
  ]);
  const read = Math.min(
    D.readTo,
    Math.round(interpolate(frame, [14, 120], [0, D.readTo], { easing: Easing.linear })),
  );
  const first = D.prs[0];
  return (
    <Paper sheet={CARD}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} scale={0.8} />
      <Win
        x={40}
        y={40}
        w={600}
        h={520}
        title={first.title}
        at={2}
        lines={13}
        seedOff={3}
        right={<span style={{ color: RED }}>{first.stat}</span>}
      >
        <RedLines w={600} rows={[2, 5, 9, 12]} />
        <div
          className="hand"
          data-copy=""
          style={{ position: "absolute", right: 24, bottom: 14, fontSize: 28, color: "var(--muted)" }}
        >
          line {read.toLocaleString()} / {first.lines.toLocaleString()}
        </div>
        <ApproveBox pressed={frame >= STAMP} />
      </Win>
      <Top>
        <Sfx
          at={STAMP - 30}
          x={FIG.x - 120}
          y={250}
          rot={-6}
          size={54}
          color="var(--muted)"
          exitAt={STAMP + 6}
        >
          lgtm
        </Sfx>
      </Top>
      <Stamp at={STAMP} x={180} y={250} />
      {/* two more land */}
      {[1, 2].map((i) => (
        <Win
          key={i}
          x={40 + i * 48}
          y={40 + i * 56}
          w={600}
          h={520}
          title={D.prs[i].title}
          at={208 + (i - 1) * 40}
          lines={13}
          seedOff={5 + i}
          z={10 + i}
          right={<span style={{ color: RED }}>{D.prs[i].stat}</span>}
        >
          <RedLines w={600} rows={[1, 4, 8, 11]} seedOff={i * 5} />
        </Win>
      ))}
      <Top>
        {[1, 2].map((i) => (
          <Sfx
            key={`p${i}`}
            at={210 + (i - 1) * 40}
            x={520 + i * 60}
            y={i * 56 - 30}
            rot={i % 2 ? 8 : -8}
            size={54}
            color={RED}
            exitAt={250 + (i - 1) * 40}
          >
            PING!
          </Sfx>
        ))}
      </Top>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

function ApproveBox({ pressed }: { pressed: boolean }) {
  const seed = useBoil(BOIL);
  return (
    <div style={{ position: "absolute", left: 24, bottom: 12, width: 170, height: 52 }}>
      <svg width={170} height={52} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={roughRect(3, 3, 164, 46, seed + 71, 1.6)}
          fill={pressed ? LIGHT : PAPER}
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
          fontSize: 28,
        }}
      >
        Approve
      </div>
    </div>
  );
}

/* --------------------------------- memory --------------------------------- */
/** 9 s. 2 AM, a blank window, and the question. */
export const MEMORY_LEN = 270;

function Memory() {
  const { w, h } = inner(CARD);
  const FIG = { x: w / 2, y: 610 };
  const FLIP = MEMORY_LEN - 12;
  const pose = usePose([
    { at: 0, pose: "dead" },
    { at: 40, pose: "slump", ease: "inOutCubic", arc: 12 },
    { at: 150, pose: { ...POSES.slump, tilt: 20, hy: 76 }, ease: "inOutCubic" },
    { at: FLIP + 10, pose: { ...POSES.slump, tilt: 20, hy: 76 } },
  ]);
  return (
    <Paper sheet={CARD}>
      <Night w={w} h={h} />
      <BlankWindow x={FIG.x - 260} y={40} w={520} h={300} title={D.untitled} period={32} />
      <Scribble pose={pose} x={FIG.x} y={FIG.y} scale={0.8} />
      <Caption at={-8} textDelay={2} w={210} size={36}>
        {D.night}
      </Caption>
      <Thought at={60} x={FIG.x + 90} y={330} w={160} h={80} size={56} exitAt={124}>
        {D.thoughtDots}
      </Thought>
      <Thought at={134} x={FIG.x + 90} y={330} w={400} h={100} size={38} exitAt={FLIP + 4}>
        {D.thoughtLost}
      </Thought>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

/* ---------------------------------- both ---------------------------------- */
/**
 * 11 s. The two-button meme in ink: QUALITY or SPEED, a sweating hand that
 * cannot choose, then a third button drawn in red pencil and slammed.
 */
export const BOTH_LEN = 330;

function Both({ sheet = CARD }: { sheet?: Sheet }) {
  const { w, h } = inner(sheet);
  const frame = useFrame();
  // the wide sheet has room for the figure at full size
  const S = sheet.w > 1300 ? 1 : 0.8;
  const FIG = { x: w / 2, y: sheet.w > 1300 ? 660 : 610 };
  const FLIP = BOTH_LEN - 12;
  const DRAW = 190;
  const SLAM = 222;
  // local figure space (desk-top centre origin) → panel space
  const P = (lx: number, ly: number) => ({ x: FIG.x + lx * S, y: FIG.y + ly * S });
  const L = P(-225, -82);
  const R = P(225, -82);
  const M = P(0, -34);
  const BW = 170 * S;
  const BH = 72 * S;
  const sweaty: ScribblePose = {
    ...POSES.wide,
    sweat: 0.6,
    eyes: 1.35,
    open: 0.2,
    mouth: -0.2,
    brow: 0.2,
    pupil: 0.9,
  };
  const pose = usePose([
    { at: 0, pose: sweaty },
    {
      at: 40,
      pose: { ...sweaty, rhx: -215, rhy: -104, hx: -16, tilt: -8, sweat: 0.7 },
      ease: "inOutCubic",
      arc: 28,
    },
    {
      at: 96,
      pose: { ...sweaty, rhx: 225, rhy: -104, hx: 16, tilt: 8, sweat: 0.85 },
      ease: "inOutCubic",
      arc: 34,
    },
    {
      at: 150,
      pose: { ...sweaty, rhx: 20, rhy: -120, hx: 0, tilt: 0, sweat: 1, eyes: 1.5, open: 0.5 },
      ease: "inOutCubic",
      arc: 20,
    },
    { at: DRAW + 6, pose: { ...sweaty, rhx: 20, rhy: -120, sweat: 1, eyes: 1.5, open: 0.5, pupil: 1 } },
    { at: SLAM - 14, pose: { ...POSES.spark, rhx: 30, rhy: -150, sweat: 0.4 }, ease: "outBack", arc: 12 },
    { at: SLAM, pose: { ...POSES.spark, rhx: 6, rhy: -46, sweat: 0 }, ease: "outExpo" },
    { at: SLAM + 40, pose: { ...POSES.spark, rhx: 6, rhy: -46, tilt: -4 }, ease: "inOutCubic" },
    { at: FLIP + 10, pose: { ...POSES.spark, rhx: 6, rhy: -46, tilt: -4 } },
  ]);
  const press = frame >= SLAM ? 1 - progress(frame, SLAM + 6, 14, Easing.outCubic) * 0.35 : 0;
  const hoverL = frame >= 46 && frame < 96;
  const hoverR = frame >= 100 && frame < 150;
  return (
    <Paper sheet={sheet}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} scale={S} />
      <Button
        x={L.x - BW / 2}
        y={L.y - BH / 2}
        w={BW}
        h={BH}
        label={D.quality}
        size={28}
        seedOff={1}
        press={hoverL ? 0.08 : 0}
      />
      <Button
        x={R.x - BW / 2}
        y={R.y - BH / 2}
        w={BW}
        h={BH}
        label={D.speed}
        size={28}
        seedOff={2}
        press={hoverR ? 0.08 : 0}
      />
      {frame >= DRAW && (
        <Button
          x={M.x - 90}
          y={M.y - 36}
          w={180}
          h={72}
          label={D.both}
          color={RED}
          size={38}
          seedOff={3}
          at={DRAW}
          drawDuration={18}
          press={press}
        />
      )}
      <Top>
        <Sfx at={54} x={L.x - 70} y={L.y - 140} rot={-6} size={40} color="var(--muted)" exitAt={92}>
          hmm.
        </Sfx>
        <Sfx at={108} x={R.x - 20} y={R.y - 140} rot={6} size={40} color="var(--muted)" exitAt={146}>
          hmm.
        </Sfx>
        <Sfx at={SLAM} x={M.x + 90} y={M.y - 130} rot={-10} size={78} color={RED} exitAt={SLAM + 60}>
          SLAM
        </Sfx>
      </Top>
      <Thought at={158} x={FIG.x + 90 * S} y={FIG.y - 340 * S} w={220} h={90} size={44} exitAt={DRAW + 4}>
        both?
      </Thought>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

function BothWide() {
  return <Both sheet={WIDE} />;
}

/* ---------------------------------- team ---------------------------------- */
/** 10 s. Three people, one desk, three different windows, three different questions. */
export const TEAM_LEN = 300;

type TeamKey = {
  at: number;
  pose: "swivelL" | "swivelR" | "wide" | "reading";
  ease?: "outBack" | "inOutCubic";
  arc?: number;
};

function teamKeys(first: "swivelL" | "swivelR", off: number, flip: number): TeamKey[] {
  return [
    { at: 0, pose: "reading" },
    { at: 70 + off, pose: first, ease: "outBack", arc: 8 },
    { at: 140 + off, pose: first === "swivelL" ? "swivelR" : "swivelL", ease: "outBack", arc: 8 },
    { at: 210, pose: "wide", ease: "outBack" },
    { at: flip + 10, pose: "wide" },
  ];
}

function Team() {
  const { w, h } = inner(CARD);
  const seed = useBoil(BOIL);
  const FLIP = TEAM_LEN - 12;
  const S = 0.5;
  const XS = [180, 556, 880];
  const Y = 640;
  const p0 = usePose(teamKeys("swivelR", 0, FLIP));
  const p1 = usePose(teamKeys("swivelL", 12, FLIP));
  const p2 = usePose(teamKeys("swivelL", 24, FLIP));
  const poses = [p0, p1, p2];
  return (
    <Paper sheet={CARD}>
      {/* one long shared desk */}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <Rough
          points={[
            [20, Y],
            [w - 20, Y],
            [w + 10, Y + 60],
            [-10, Y + 60],
          ]}
          close
          seed={seed + 12}
          amp={2}
          stroke={INK}
          width={4}
          fill="#cfcdc7"
        />
      </svg>
      {XS.map((x, i) => (
        <Scribble key={i} pose={poses[i]} x={x} y={Y} scale={S} desk={false} blinkPeriod={80 + i * 13} />
      ))}
      {XS.map((x, i) => (
        <Win
          key={`w${i}`}
          x={x - 150}
          y={40 + (i % 2) * 24}
          w={300}
          h={130}
          title={D.teamWins[i]}
          at={4 + i * 14}
          lines={2}
          seedOff={20 + i}
        />
      ))}
      {XS.map((x, i) => (
        <Thought
          key={`t${i}`}
          at={90 + i * 34}
          x={[x + 46, x + 46, x - 100][i]}
          y={i === 1 ? Y - 280 : Y - 190}
          w={[170, 210, 280][i]}
          h={80}
          size={26}
          exitAt={FLIP + 4}
        >
          {D.teamThoughts[i]}
        </Thought>
      ))}
      <Top>
        {[214, 232, 250].map((f, i) => (
          <Sfx
            key={`p${i}`}
            at={f}
            x={XS[i] + 60}
            y={30}
            rot={i % 2 ? 8 : -8}
            size={44}
            color={RED}
            exitAt={f + 40}
          >
            PING!
          </Sfx>
        ))}
      </Top>
      <Flip at={FLIP} w={w} h={h} />
    </Paper>
  );
}

/* ----------------------------------- og ----------------------------------- */
/** One frame: the social card. */
function Og() {
  const { w } = inner(OG);
  const FIG = { x: 1640, y: 900 };
  const pose = usePose([
    { at: 0, pose: { ...POSES.wide, sweat: 0.8, eyes: 1.5, open: 0.6, tilt: 8, hx: 20 } },
  ]);
  return (
    <Paper sheet={OG}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} scale={1.05} />
      <Win
        x={w - 520}
        y={70}
        w={470}
        h={200}
        title={D.planTitle}
        at={-20}
        lines={4}
        seedOff={2}
        right={<span style={{ color: RED }}>{D.planLines.toLocaleString()} lines</span>}
      />
      <Scroll x={w - 480} y={270} w={390} h={560} maxH={620} foldAt={FIG.y - 270} />
      {[0, 1].map((i) => (
        <Win
          key={i}
          x={1040 + i * 50}
          y={110 + i * 64}
          w={520}
          h={280}
          title={D.prs[i].title}
          at={-20}
          lines={6}
          seedOff={10 + i}
          z={10 + i}
          right={<span style={{ color: RED }}>{D.prs[i].stat}</span>}
        >
          <RedLines w={520} rows={[1, 3, 5]} seedOff={i * 3} />
        </Win>
      ))}
      <Sfx at={-20} x={1500} y={40} rot={-8} size={54} color={RED}>
        PING!
      </Sfx>
      <Sfx at={-20} x={1330} y={520} rot={5} size={80} color={RED}>
        WAIT.
      </Sfx>
      <div
        className="hand"
        style={{
          position: "absolute",
          left: 90,
          top: 200,
          fontSize: 132,
          lineHeight: 1.02,
          color: INK,
          width: 940,
        }}
      >
        {D.ogTitle.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="script" style={{ position: "absolute", left: 96, top: 760, fontSize: 84, color: RED }}>
        {D.ogUrl}
      </div>
    </Paper>
  );
}

/* ---------------------------------- root ---------------------------------- */

function Root() {
  return (
    <>
      <Composition
        id="hero"
        component={Hero}
        width={HERO.w}
        height={HERO.h}
        fps={30}
        durationInFrames={HERO_LEN}
      />
      <Composition
        id="plans"
        component={Plans}
        width={CARD.w}
        height={CARD.h}
        fps={30}
        durationInFrames={PLANS_LEN}
      />
      <Composition
        id="prs"
        component={Prs}
        width={CARD.w}
        height={CARD.h}
        fps={30}
        durationInFrames={PRS_LEN}
      />
      <Composition
        id="memory"
        component={Memory}
        width={CARD.w}
        height={CARD.h}
        fps={30}
        durationInFrames={MEMORY_LEN}
      />
      <Composition
        id="both"
        component={Both}
        width={CARD.w}
        height={CARD.h}
        fps={30}
        durationInFrames={BOTH_LEN}
      />
      <Composition
        id="both-wide"
        component={BothWide}
        width={WIDE.w}
        height={WIDE.h}
        fps={30}
        durationInFrames={BOTH_LEN}
      />
      <Composition
        id="team"
        component={Team}
        width={CARD.w}
        height={CARD.h}
        fps={30}
        durationInFrames={TEAM_LEN}
      />
      <Composition id="og" component={Og} width={OG.w} height={OG.h} fps={30} durationInFrames={1} />
    </>
  );
}
registerRoot(Root);

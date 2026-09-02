import { AbsoluteFill, Alert, Camera, Chord, Click, Counter, Draw, Duck, Easing, Keystroke, Panel, Pattern, Pluck, Reveal, RoomTone, Rough, RoughRect, Scenes, Sequence, Thump, Tone, Typewriter, Typing, Whoosh, defineScenes, hatchLines, interpolate, progress, roughEllipse, roughPath, roughRect, scribble, sketchHash, useBoil, useFrame, type Frames } from "@agenticvids/core";
import type { CSSProperties, ReactNode } from "react";
import { Grain } from "../kit";
import { D } from "./data";
import { POSES, Scribble, usePose } from "./scribble";

/**
 * ARCHDEV v3 — the rage comic. Same story as v2 (plan → six agents → the
 * 1,284-line PR → 2 AM → tease), drawn in boiling ink on paper with one red
 * pencil. Panels are hard cuts with a paper flip. 31.3 s.
 */
export const SCENES = defineScenes(
  { open: { frames: 90 }, plan: { frames: 175 }, agents: { frames: 210 }, review: { frames: 210 }, blank: { frames: 135 }, tease: { frames: 120 } },
  { fps: 30 },
);

const INK = "var(--ink)";
const PAPER = "var(--paper)";
const RED = "var(--red)";
/** Figure placement inside the panel (panel inner box is 1760×920). */
const FIG = { x: 880, y: 700 };

/* ------------------------------ ingredients ------------------------------ */

/** Pencil scratch: a short filtered-noise burst when something gets drawn. */
function Scratch({ at, volume = 0.13, length = 9, pan = 0 }: { at: Frames; volume?: number; length?: number; pan?: number }) {
  return <Tone at={at} durationInFrames={length} freq={2400} wave="noise" cutoff={3400} attack={0.01} decay={0.14} sustain={0.25} release={0.06} volume={volume} pan={pan} name="scratch" />;
}

/** Comic caption box, top-left by default. */
function Caption({ at, x = 28, y = 28, w, size = 40, exitAt, textDelay = 5, children }: { at: Frames; x?: number; y?: number; w: number; size?: number; exitAt?: Frames; textDelay?: number; children: ReactNode }) {
  const seed = useBoil(4);
  const frame = useFrame();
  const h = size * 1.35 + 22;
  const out = exitAt !== undefined ? progress(frame, exitAt as number, 6, Easing.inCubic) : 0;
  // the paper fill is not part of the pencil draw-in, so never mount the box before its cue
  if (frame < (at as number) || out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: 1 - out }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Draw at={at as number} duration={10}>
          <RoughRect x={3} y={3} w={w - 6} h={h - 6} seed={seed + 21} amp={1.6} stroke={INK} width={4} fill={PAPER} passes={1} />
        </Draw>
      </svg>
      <Reveal at={(at as number) + textDelay} duration={16} className="hand" style={{ position: "absolute", left: 18, top: 7, fontSize: size, lineHeight: 1.3, whiteSpace: "nowrap" }}>
        {children}
      </Reveal>
    </div>
  );
}

/** Onomatopoeia in marker: pops in with overshoot, wobbles, pops out. */
function Sfx({ at, x, y, rot = -6, size = 72, color = INK, exitAt, children }: { at: number; x: number; y: number; rot?: number; size?: number; color?: string; exitAt?: number; children: ReactNode }) {
  const frame = useFrame();
  const p = progress(frame, at, 9, Easing.outBack);
  const out = exitAt !== undefined ? progress(frame, exitAt, 7, Easing.inCubic) : 0;
  if (frame < at || out >= 1) return null;
  const wobble = Math.sin(frame * 0.8 + x) * 2;
  return (
    <div className="marker" data-copy="" style={{ position: "absolute", left: x, top: y, fontSize: size, color, transform: `rotate(${rot + wobble}deg) scale(${p * (1 - 0.35 * out)})`, transformOrigin: "center", opacity: 1 - out, whiteSpace: "nowrap", lineHeight: 1 }}>
      {children}
    </div>
  );
}

/** A sketched window: title bar, three buttons, scribbled lines. Sketches itself in. */
function Win({ x, y, w, h, title, at = 0, lines = 6, seedOff = 0, shake = 0, dx = 0, dy = 0, exitAt, z, right, children }: { x: number; y: number; w: number; h: number; title: string; at?: number; lines?: number; seedOff?: number; shake?: number; dx?: number; dy?: number; exitAt?: number; z?: number; right?: ReactNode; children?: ReactNode }) {
  const seed = useBoil(4) + seedOff * 13;
  const frame = useFrame();
  if (frame < at || (exitAt !== undefined && frame >= exitAt)) return null;
  const sx = shake ? Math.sin(frame * 4.1 + seedOff) * 4 * shake : 0;
  const sy = shake ? Math.cos(frame * 3.3 + seedOff * 2) * 3 * shake : 0;
  return (
    <div style={{ position: "absolute", left: x + sx + dx, top: y + sy + dy, width: w, height: h, zIndex: z }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Draw at={at} duration={12} each={1.5}>
          <RoughRect x={3} y={3} w={w - 6} h={h - 6} seed={seed + 1} amp={1.8} stroke={INK} width={4} fill={PAPER} />
          <Rough points={[[3, 44], [w - 3, 44]]} seed={seed + 2} amp={1.2} stroke={INK} width={3} passes={1} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={roughEllipse(24 + i * 24, 24, 7, 7, seed + 3 + i, 0.8)} fill={i === 0 ? RED : "none"} stroke={INK} strokeWidth={2.5} />
          ))}
          {Array.from({ length: lines }).map((_, i) => (
            <path key={`l${i}`} d={scribble(24, 76 + i * 30, (w - 64) * (0.4 + sketchHash(seedOff + 7, i) * 0.55), seed + 20 + i)} fill="none" stroke={INK} strokeWidth={2.2} opacity={0.5} />
          ))}
        </Draw>
      </svg>
      <div className="hand" style={{ position: "absolute", left: 96, top: 6, fontSize: 27, color: INK, whiteSpace: "nowrap" }}>{title}</div>
      {right && <div className="hand" style={{ position: "absolute", right: 18, top: 6, fontSize: 27, whiteSpace: "nowrap" }}>{right}</div>}
      {children}
    </div>
  );
}

/** Thought bubble drawn in ink; (x, y) is the small trailing puff near the head. */
function Thought({ at, x, y, w = 320, h = 110, size = 40, exitAt, children }: { at: number; x: number; y: number; w?: number; h?: number; size?: number; exitAt?: number; children: ReactNode }) {
  const frame = useFrame();
  const seed = useBoil(4);
  const p = progress(frame, at, 12, Easing.outBack);
  const out = exitAt !== undefined ? progress(frame, exitAt, 7, Easing.inCubic) : 0;
  if (frame < at || out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y - h - 70, width: w + 40, height: h + 80, transform: `scale(${p * (1 - 0.3 * out)})`, transformOrigin: "left bottom", opacity: 1 - out }}>
      <svg width={w + 40} height={h + 80} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={roughEllipse(w / 2 + 20, h / 2, w / 2, h / 2, seed + 61, 2.5, 32)} fill={PAPER} stroke={INK} strokeWidth={4} />
        <path d={roughEllipse(34, h + 24, 13, 10, seed + 62, 1)} fill={PAPER} stroke={INK} strokeWidth={3} />
        <path d={roughEllipse(16, h + 50, 7, 5, seed + 63, 1)} fill={PAPER} stroke={INK} strokeWidth={3} />
      </svg>
      <div className="hand" data-copy="" style={{ position: "absolute", left: 20, top: 0, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: size, lineHeight: 1.1 }}>
        {children}
      </div>
    </div>
  );
}

/** The plan, unrolling off the window and over the edge of the desk. */
function Scroll({ at, x, y, w, maxH, foldAt }: { at: number; x: number; y: number; w: number; maxH: number; /** local y of the desk edge: below it the paper folds over and hangs down the desk face */ foldAt: number }) {
  const frame = useFrame();
  const seed = useBoil(4);
  const h = interpolate(frame, [at, at + 90], [30, maxH], { easing: Easing.inOutCubic });
  const n = Math.max(0, Math.floor((h - 26) / 26));
  const bend = 34; // px the hanging part shifts toward the viewer
  const off = (py: number) => (py > foldAt ? (Math.min(1, (py - foldAt) / 60)) * bend : 0);
  const outline: [number, number][] = h > foldAt ? [[2, 0], [w - 2, 0], [w - 2, foldAt], [w - 2 + bend, foldAt + 60], [w - 2 + bend, h], [2 + bend, h], [2 + bend, foldAt + 60], [2, foldAt]] : [[2, 0], [w - 2, 0], [w - 2, h], [2, h]];
  return (
    <svg width={w} height={maxH + 30} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <path d={roughPath(outline, seed + 31, 2, true)} fill={PAPER} stroke={INK} strokeWidth={4} />
      {h > foldAt && <path d={roughPath([[2, foldAt], [w - 2, foldAt]], seed + 32, 1.2)} fill="none" stroke={INK} strokeWidth={2.5} opacity={0.55} />}
      {Array.from({ length: n }).map((_, i) => {
        const py = 26 + i * 26;
        return <path key={i} d={scribble(22 + off(py), py, (w - 56) * (0.35 + sketchHash(5, i) * 0.6), seed + 40 + i)} fill="none" stroke={INK} strokeWidth={2} opacity={0.5} />;
      })}
      <path d={roughEllipse(w / 2 + off(h), h + 2, w / 2 - 2, 13, seed + 33, 1.5)} fill="var(--light)" stroke={INK} strokeWidth={4} />
    </svg>
  );
}

/** Red rubber stamp slamming down. */
function Stamp({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useFrame();
  const seed = useBoil(4);
  const p = progress(frame, at, 7, Easing.outCubic);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 400, height: 124, transform: `rotate(-11deg) scale(${1.7 - 0.7 * p})`, opacity: Math.min(1, p * 1.4), transformOrigin: "center", zIndex: 9 }}>
      <svg width={400} height={124} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={roughRect(4, 4, 392, 116, seed + 51, 3)} fill="none" stroke={RED} strokeWidth={6} />
        <path d={roughRect(13, 13, 374, 98, seed + 52, 2)} fill="none" stroke={RED} strokeWidth={3} />
      </svg>
      <div className="marker" data-copy="" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 66, color: RED, letterSpacing: "0.04em" }}>
        APPROVED
      </div>
    </div>
  );
}

/* --------------------------------- scenes --------------------------------- */

function Open() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([{ at: 0, pose: "happy" }, { at: 46, pose: "typing", ease: "inOutCubic" }]);
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} typing={frame > 40 ? 0.55 : 0} />
      {/* poster frame: the caption is already drawn at frame 0, the terminal starts sketching at once */}
      <Caption at={-8} textDelay={8} w={260}>{D.time0}</Caption>
      <Win x={70} y={150} w={560} h={230} title="terminal" at={0} lines={3} seedOff={1}>
        <div className="hand" style={{ position: "absolute", left: 26, top: 164, fontSize: 32 }}>
          <span style={{ color: "var(--muted)" }}>› </span>
          <Typewriter text={D.prompt} at={34} cps={13} />
        </div>
        <Typing text={D.prompt} at={34} cps={13} volume={0.16} pan={-0.3} />
      </Win>
      <Thought at={9} x={990} y={400} w={340} h={110} exitAt={82}>{D.thought0}</Thought>
      <Scratch at={0} pan={-0.3} />
      <Scratch at={9} volume={0.08} pan={0.3} length={6} />
    </Panel>
  );
}

function Plan() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([
    { at: 0, pose: "reading" },
    { at: 34, pose: "wide", ease: "outBack" },
    { at: 96, pose: { ...POSES.wide, tilt: 16, pupil: 1, hy: 14, hx: 30 } },
    { at: 150, pose: { ...POSES.wide, tilt: 4, pupil: 0.6, hy: 0, hx: 0, eyes: 1.5, open: 0.7 }, ease: "outBack" },
  ]);
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} />
      <Win x={1130} y={60} w={560} h={230} title="PLAN.md" at={4} lines={4} seedOff={2} right={<span style={{ color: RED }}><Counter from={12} to={D.planLines} at={30} duration={120} format={(n) => `${Math.round(n).toLocaleString()} lines`} /></span>} />
      <Scroll at={30} x={1172} y={290} w={476} maxH={660} foldAt={FIG.y - 290} />
      <Sfx at={40} x={960} y={330} rot={6} size={44} color="var(--muted)" exitAt={80}>hmm.</Sfx>
      <Sfx at={84} x={980} y={310} rot={-4} size={56} color="var(--muted)" exitAt={124}>wait.</Sfx>
      <Sfx at={128} x={960} y={280} rot={5} size={84} color={RED}>WAIT.</Sfx>
      <Caption at={100} w={640}>{D.planCaption}</Caption>
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

function Agents() {
  const seed = useBoil(4);
  const frame = useFrame();
  const FURY = 126;
  const fury = progress(frame, FURY, 8, Easing.outCubic);
  // the windows get blown outward by the hammering: columns slide off the sides, the top row flies up
  const scatter = progress(frame, FURY, 16, Easing.outBack);
  const pose = usePose([
    { at: 0, pose: { ...POSES.wide, eyes: 1.5, open: 0.7, tilt: 4 } },
    { at: 14, pose: "swivelL", ease: "outBack", arc: 10 },
    { at: 42, pose: "swivelR", ease: "outBack", arc: 14 },
    { at: 68, pose: "swivelL", ease: "outBack", arc: 14 },
    { at: 92, pose: "swivelR", ease: "outBack", arc: 12 },
    { at: 112, pose: "wide", ease: "outBack" },
    { at: FURY, pose: "rage", ease: "outBack", arc: 22 },
    { at: 208, pose: "rage" },
  ]);
  return (
    <Camera keyframes={[{ frame: 0, zoom: 1 }, { frame: FURY - 2, zoom: 1 }, { frame: FURY + 12, zoom: 1.24, x: 960, y: 620, easing: Easing.outBack }]}>
      <Panel seed={seed}>
        {WINS.map((w, i) => (
          <Win key={i} {...w} title={D.agents[i]} at={i * 12} lines={3} seedOff={10 + i} shake={fury * 0.8} dx={i < 2 ? -scatter * 150 : i < 4 ? scatter * 150 : 0} dy={i >= 4 ? -scatter * 260 : 0} />
        ))}
        {WINS.map((w, i) => (
          <Sfx key={`p${i}`} at={2 + i * 12} x={w.x + w.w - 150} y={w.y - 26} rot={i % 2 ? 8 : -8} size={54} color={RED} exitAt={2 + i * 12 + 26}>
            PING!
          </Sfx>
        ))}
        {PINGS.map((f, i) => {
          // after the scatter only the side columns remain on screen; the nags ride along with them
          const wi = f >= FURY ? i % 4 : i % 6;
          const w = WINS[wi];
          const dx = f >= FURY ? (wi < 2 ? -150 : 150) : 0;
          return (
            <Sfx key={`q${i}`} at={f} x={w.x + dx + (f >= FURY ? (wi < 2 ? 330 : -90) : wi < 2 ? 170 : 60) + (i % 3) * 30} y={w.y + 60 + (i % 2) * 40} rot={(i % 5) * 4 - 8} size={40 + (i % 3) * 8} color={RED} exitAt={f + 22}>
              {i % 3 === 0 ? "needs input" : i % 3 === 1 ? "PING!" : "?"}
            </Sfx>
          );
        })}
        <Scribble pose={pose} x={FIG.x} y={FIG.y} typing={frame >= FURY ? 1 : frame < 18 ? 0.5 : 0} fury={fury} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Sfx key={`t${i}`} at={FURY + 6 + i * 12} x={[600, 1080, 560, 1120, 640, 1060][i]} y={[500, 470, 560, 540, 420, 600][i]} rot={i % 2 ? 10 : -12} size={64 + (i % 3) * 14} exitAt={FURY + 6 + i * 12 + 36}>
            {i % 3 === 2 ? "TAPTAPTAP" : "TAP"}
          </Sfx>
        ))}
        <Caption at={0} textDelay={3} x={60} y={60} w={520} exitAt={FURY + 4}>{D.agentsCaption}</Caption>
        <Caption at={FURY + 8} x={210} y={175} w={660}>{D.agentsCaption2}</Caption>
        {/* sound: six pings on arrival, nags, then the hammering */}
        {WINS.map((_, i) => (
          <Alert key={`a${i}`} at={2 + i * 12} volume={0.16} name="ping" />
        ))}
        {WINS.map((_, i) => (
          <Scratch key={`s${i}`} at={i * 12} volume={0.08} pan={i < 2 ? -0.5 : i < 4 ? 0.5 : 0} />
        ))}
        {PINGS.map((f, i) => (
          <Alert key={`n${i}`} at={f} volume={0.11 + (i % 3) * 0.02} name="nag" />
        ))}
        <Thump at={FURY} volume={0.4} from={140} to={50} name="fury-hit" />
        {Array.from({ length: 40 }).map((_, i) => (
          <Keystroke key={`k${i}`} at={FURY + 2 + i * 2 + (i % 3 === 0 ? 1 : 0)} volume={0.3 + (i % 4) * 0.05} seed={i} pan={i % 2 ? 0.25 : -0.25} />
        ))}
        <Whoosh at={FURY} durationInFrames={10} from={600} to={2400} volume={0.1} name="scatter" />
      </Panel>
    </Camera>
  );
}

function Review() {
  const seed = useBoil(4);
  const frame = useFrame();
  const STAMP = 118;
  const pose = usePose([
    { at: 0, pose: "reading" },
    { at: 40, pose: "dead", ease: "inOutCubic" },
    { at: STAMP - 10, pose: { ...POSES.dead, rhx: 60, rhy: -34 }, ease: "outBack", arc: 16 },
    { at: STAMP + 2, pose: { ...POSES.dead, rhx: 60, rhy: -18 }, ease: "outExpo" },
    { at: STAMP + 30, pose: { ...POSES.dead, mouth: 0.2 }, ease: "inOutCubic" },
    { at: STAMP + 70, pose: { ...POSES.dead, mouth: 0.2, tilt: 3, hy: 22 }, ease: "inOutCubic" },
  ]);
  const read = Math.min(D.readTo, Math.round(interpolate(frame, [12, 100], [0, D.readTo], { easing: Easing.linear })));
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x + 380} y={FIG.y} />
      <Win x={50} y={50} w={800} h={660} title={D.prTitle} at={2} lines={17} seedOff={3} right={<span style={{ color: RED }}>{D.prStat}</span>}>
        {/* a few red lines in the diff */}
        <svg width={800} height={660} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {[2, 5, 9, 13].map((i) => (
            <path key={i} d={scribble(24, 76 + i * 30 + 6, 260 + (i % 3) * 90, seed + 90 + i)} fill="none" stroke={RED} strokeWidth={2.4} opacity={0.75} />
          ))}
        </svg>
        <div className="hand" data-copy="" style={{ position: "absolute", right: 24, bottom: 14, fontSize: 30, color: "var(--muted)" }}>
          line {read.toLocaleString()} / {D.prLines.toLocaleString()}
        </div>
        <div style={{ position: "absolute", left: 24, bottom: 12, width: 190, height: 56 }}>
          <svg width={190} height={56} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path d={roughRect(3, 3, 184, 50, seed + 71, 1.6)} fill={frame >= STAMP ? "var(--light)" : PAPER} stroke={INK} strokeWidth={3.5} />
          </svg>
          <div className="hand" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>Approve</div>
        </div>
      </Win>
      <Sfx at={STAMP - 26} x={1120} y={300} rot={-6} size={56} color="var(--muted)" exitAt={STAMP + 6}>lgtm</Sfx>
      <Stamp at={STAMP} x={330} y={330} />
      <Caption at={4} w={620} exitAt={STAMP + 6}>{D.reviewCaption}</Caption>
      <Caption at={STAMP + 10} w={860}>{D.reviewCaption2}</Caption>
      <Scratch at={2} pan={-0.4} />
      {Array.from({ length: 7 }).map((_, i) => (
        <Click key={i} at={14 + i * 13} volume={0.04} freq={1300} name="scroll" />
      ))}
      <Click at={STAMP - 2} volume={0.2} freq={900} name="mouse" />
      <Thump at={STAMP} volume={0.55} from={180} to={60} name="stamp" />
      <Tone at={STAMP} durationInFrames={6} freq={2600} wave="noise" cutoff={2200} attack={0.002} decay={0.06} sustain={0} release={0.03} volume={0.16} name="stamp-slap" />
    </Panel>
  );
}

function Blank() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([{ at: 0, pose: "dead" }, { at: 26, pose: "slump", ease: "inOutCubic", arc: 12 }]);
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
          <path d={roughPath([[3, 44], [637, 44]], seed + 82, 1.2)} fill="none" stroke={INK} strokeWidth={3} />
          {cursorOn && <rect x={30} y={78} width={16} height={30} fill={INK} />}
        </svg>
        <div className="hand" style={{ position: "absolute", left: 24, top: 6, fontSize: 27, color: "var(--muted)" }}>untitled</div>
      </div>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} />
      <Caption at={0} textDelay={3} w={260}>{D.night}</Caption>
      <Thought at={22} x={990} y={410} w={200} h={90} size={64} exitAt={66}>{D.thought1}</Thought>
      <Thought at={72} x={990} y={410} w={420} h={110} size={40}>{D.thought2}</Thought>
      {[0, 1, 2, 3, 4].map((i) => (
        <Click key={i} at={8 + i * 30} volume={0.16} freq={1700} name="tick" />
      ))}
    </Panel>
  );
}

const NODES: [number, number][] = [[0, -92], [-54, -12], [54, -12], [-98, 76], [98, 76]];
const EDGES: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]];

function Tease() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([{ at: 0, pose: "dead" }, { at: 18, pose: "spark", ease: "outBack" }, { at: 60, pose: { ...POSES.spark, tilt: -4 } }]);
  const MARK = 22;
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} />
      <svg width={1760} height={920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform="translate(880 240) scale(1.05)">
          <Draw at={MARK} duration={40} each={4} easing={Easing.inOutCubic}>
            {EDGES.map(([a, b], i) => (
              <path key={`e${i}`} d={roughPath([NODES[a], NODES[b]], seed + 300 + i, 1.6)} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            ))}
            {NODES.map(([nx, ny], i) => (
              <path key={`n${i}`} d={roughEllipse(nx, ny, 16, 16, seed + 320 + i, 1.2)} fill={frame >= MARK + 22 + i * 4 ? (i === 0 ? RED : PAPER) : "none"} stroke={INK} strokeWidth={4} />
            ))}
          </Draw>
        </g>
      </svg>
      <svg width={1760} height={920} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
        <g transform="translate(880 240) scale(1.05)">
          <Draw at={98} duration={12}>
            <path d={roughEllipse(NODES[0][0], NODES[0][1], 24, 24, seed + 340, 1.4)} fill="none" stroke={RED} strokeWidth={3.5} />
          </Draw>
        </g>
      </svg>
      <Caption at={66} w={560}>{D.teaseCaption}</Caption>
      <Reveal at={88} duration={22} className="script" style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontSize: 64, color: RED }}>
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

function Score() {
  const S = SCENES;
  return (
    <>
      <RoomTone volume={0.016} durationInFrames={S.total} fadeIn={8} fadeOut={30} />
      <Sequence from={S.start("open")} durationInFrames={S.duration("open")} name="score-open">
        <Pattern bpm={104} step={0.25} at={4} steps="C4 . E4 . G4 . E4 . A4 . G4 . E4 . C4 ." wave="pluck" brightness={0.7} volume={0.12} reverb={0.25} repeat={2} humanize={0.02} name="motif" />
        <Pattern bpm={104} step={0.5} at={4} steps="C3 . G2 . A2 . G2 ." wave="pluck" brightness={0.4} volume={0.13} reverb={0.15} repeat={3} name="bass" />
        <Pluck note="C5" at={S.duration("open") - 8} volume={0.12} reverb={0.3} name="open-close" />
      </Sequence>
      <Sequence from={S.start("plan")} durationInFrames={S.duration("plan")} name="score-plan">
        <Pattern bpm={104} step={0.25} at={0} steps="C4 . E4 G4 . . A4 . B4 . . . C5 . . ." wave="pluck" brightness={0.7} volume={0.11} reverb={0.3} repeat={4} humanize={0.02} name="plan-motif" />
        <Pattern bpm={104} step={0.5} at={0} steps="C3 . G2 . F2 . G2 ." wave="pluck" brightness={0.4} volume={0.13} reverb={0.15} repeat={4} name="plan-bass" />
        <Pluck note="G4" at={S.duration("plan") - 8} volume={0.12} reverb={0.3} name="plan-close" />
      </Sequence>
      <Sequence from={S.start("agents")} durationInFrames={S.duration("agents")} name="score-agents">
        <Pattern bpm={116} step={0.25} at={0} steps="E4 . E4 . F4 . F4 . G4 . G4 . A4 . A4 ." wave="pluck" brightness={0.75} volume={0.11} reverb={0.3} repeat={3} humanize={0.02} name="agents-rise" />
        <Pattern bpm={116} step={0.5} at={0} steps="A2 . A2 . C3 . D3 ." wave="pluck" brightness={0.45} volume={0.14} reverb={0.15} repeat={5} name="agents-bass" />
        <Pattern bpm={116} step={0.125} at={126} steps="A4 A4 C5 A4 D5 A4 C5 A4 A4 A4 C5 A4 E5 A4 C5 A4" wave="pluck" brightness={0.8} volume={0.14} reverb={0.35} repeat={2} humanize={0.01} name="fury-tremolo" />
      </Sequence>
      <Sequence from={S.start("review")} durationInFrames={S.duration("review")} name="score-review">
        <Pattern bpm={92} step={0.5} at={0} steps="A2 . . . C3 . . . E3 . . . D3 . . ." wave="pluck" brightness={0.4} volume={0.13} reverb={0.25} repeat={2} name="review-bass" />
        <Pattern bpm={92} step={0.25} at={0} steps="E4 . . . C4 . . . A3 . . . . . . ." wave="epiano" volume={0.08} reverb={0.4} repeat={3} name="review-sigh" />
      </Sequence>
      {/* starts after the paper flip so the whoosh is not swallowed; releases before the next flip */}
      <Duck at={S.start("blank") + 8} durationInFrames={S.duration("blank") - 24} depth={0.2} attack={8} release={12} />
      <Sequence from={S.start("tease")} durationInFrames={S.duration("tease")} name="score-tease">
        <Chord at={18} notes={["C3", "G3", "E4", "B4"]} wave="epiano" strum={3} ring={3} volume={0.09} reverb={0.5} width={0.5} name="tease-chord" />
        <Pattern bpm={104} step={0.25} at={66} steps="C5 . E5 . G5 ." wave="pluck" brightness={0.7} volume={0.1} reverb={0.45} name="tease-motif" />
        <Pluck note="C6" at={100} volume={0.14} reverb={0.5} name="ding" />
      </Sequence>
      {S.cuts().map((c) => (
        <Whoosh key={c} at={c - 3} durationInFrames={7} from={2600} to={500} volume={0.13} name="flip" />
      ))}
    </>
  );
}

export function ArchDev3() {
  return (
    <AbsoluteFill className="archdev3">
      <Score />
      <Scenes plan={SCENES}>
        <Scenes.Scene name="open"><Open /></Scenes.Scene>
        <Scenes.Scene name="plan"><Plan /></Scenes.Scene>
        <Scenes.Scene name="agents"><Agents /></Scenes.Scene>
        <Scenes.Scene name="review"><Review /></Scenes.Scene>
        <Scenes.Scene name="blank"><Blank /></Scenes.Scene>
        <Scenes.Scene name="tease"><Tease /></Scenes.Scene>
      </Scenes>
      <Grain opacity={0.05} blend="multiply" tile={280} />
    </AbsoluteFill>
  );
}

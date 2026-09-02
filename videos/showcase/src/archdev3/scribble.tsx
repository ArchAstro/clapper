import { Rough, RoughEllipse, definePoses, ik2, roughPath, useBoil, useFrame, usePose as usePoseCore, type Frames, type SketchPt } from "@agenticvids/core";
import { useMemo, type CSSProperties } from "react";

/**
 * "Scribble": the rage-comic developer. A circle head on a hump of a body
 * behind a desk, drawn in boiling ink. Every line is a pure function of a
 * Pose, the frame and the boil seed.
 *
 * Coordinates: origin at the desk-top centre, y grows downward.
 */
export interface SPose {
  /** Head offset from its rest position. */
  hx: number;
  hy: number;
  /** Head tilt in degrees. */
  tilt: number;
  /** Shoulder lean in px (positive = toward the viewer's right / forward hunch). */
  lean: number;
  /** Hand targets. */
  lhx: number;
  lhy: number;
  rhx: number;
  rhy: number;
  /** 0 closed … 1 open … 1.6 wide. */
  eyes: number;
  /** -1 raised … 0 flat … 1 furious V. */
  brow: number;
  /** -1 frown … 1 smile. */
  mouth: number;
  /** 0 shut … 1 shouting. */
  open: number;
  /** 0..1 sweat drop. */
  sweat: number;
  /** 0..1 where the pupils look (0 = at us, 1 = at the screen/desk). */
  pupil: number;
}

const base: SPose = { hx: 0, hy: 0, tilt: 0, lean: 0, lhx: -92, lhy: -16, rhx: 92, rhy: -16, eyes: 1, brow: 0, mouth: 0.25, open: 0, sweat: 0, pupil: 0.5 };

export const POSES = definePoses({
  happy: { ...base, mouth: 1, brow: -0.25, eyes: 1.05 },
  typing: { ...base, tilt: 3, lean: 6, pupil: 0.8 },
  reading: { ...base, tilt: 7, lean: 10, eyes: 0.9, pupil: 0.9, mouth: 0 },
  wide: { ...base, eyes: 1.6, brow: -0.7, open: 0.55, mouth: -0.1, hy: -6, pupil: 0.9 },
  swivelL: { ...base, hx: -34, tilt: -12, lean: -16, eyes: 1.25, brow: 0.35, mouth: -0.2, pupil: 0.2 },
  swivelR: { ...base, hx: 34, tilt: 12, lean: 16, eyes: 1.25, brow: 0.35, mouth: -0.2, pupil: 0.8 },
  rage: { ...base, hy: 12, tilt: 5, lean: 30, eyes: 0.55, brow: 1, mouth: -0.5, open: 1, sweat: 1, lhx: -78, lhy: -8, rhx: 78, rhy: -8, pupil: 1 },
  dead: { ...base, eyes: 0.12, brow: 0.15, mouth: -0.15, hy: 16, lean: 4, pupil: 1 },
  slump: { ...base, hy: 70, tilt: 16, lean: 26, eyes: 0.3, brow: 0.1, mouth: -0.7, lhx: -170, lhy: 8, rhx: 170, rhy: 8, pupil: 0.6 },
  spark: { ...base, hy: -8, eyes: 1.35, brow: -0.55, mouth: 0.85, pupil: 0.3 },
});
export type PoseName = keyof typeof POSES;
export type SKey = { at: Frames; pose: PoseName | SPose; ease?: "linear" | "outBack" | "inOutCubic" | "outExpo" | "outQuint"; arc?: number };

export function usePose(keys: SKey[], offset: Frames = 0): SPose {
  return usePoseCore(POSES, keys, { arcChannels: [["lhx", "lhy"], ["rhx", "rhy"]], offset });
}

const INK = "#161616";
const PAPER = "#f5f3ee";
const GREY = "#cfcdc7";
const L1 = 90;
const L2 = 84;
const SHX = 66;
const SHY = -132;
const HEAD_R = 80;
const HEAD_Y = -246;

/** The figure, keyboard and desk. `typing` bobs the hands; `fury` adds ghost arms, motion strokes and a rattling keyboard. */
export function Scribble({ pose, x = 0, y = 0, scale = 1, typing = 0, fury = 0, desk = true, ink = INK, paper = PAPER, style }: { pose: SPose; x?: number; y?: number; scale?: number; typing?: number; fury?: number; desk?: boolean; ink?: string; paper?: string; style?: CSSProperties }) {
  const frame = useFrame();
  const seed = useBoil(4);
  const breath = Math.sin(frame / 13) * 1.4;
  const bobL = typing ? Math.sin(frame * 1.7) * 7 * typing : 0;
  const bobR = typing ? Math.sin(frame * 1.7 + Math.PI) * 7 * typing : 0;
  const rattle = fury ? (Math.sin(frame * 5.3) * 5 + Math.cos(frame * 7.1) * 3) * fury : 0;
  const lean = pose.lean;
  const lHand: SketchPt = [pose.lhx + lean * 0.15, pose.lhy + bobL];
  const rHand: SketchPt = [pose.rhx + lean * 0.15, pose.rhy + bobR];
  const lSh: SketchPt = [-SHX + lean * 0.5, SHY + breath];
  const rSh: SketchPt = [SHX + lean * 0.5, SHY + breath];
  const lEl = ik2(lSh[0], lSh[1], lHand[0], lHand[1], L1, L2, -1);
  const rEl = ik2(rSh[0], rSh[1], rHand[0], rHand[1], L1, L2, 1);
  const headC: SketchPt = [pose.hx + lean * 0.7, HEAD_Y + pose.hy + breath];
  const body = useMemo<SketchPt[]>(() => [[-92, 2], [-88, -80], [-74, -138], [-40, -172], [0, -180], [40, -172], [74, -138], [88, -80], [92, 2]].map(([px, py]) => [px + lean * (1 - (py + 180) / 182) * 0.6, py + breath * 0.5]) as SketchPt[], [lean, breath]);
  const keys = useMemo(() => {
    const out: SketchPt[][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10 - r; c++) {
      const kx = -128 + c * 26 + r * 12;
      const ky = -34 + r * 12;
      out.push([[kx, ky], [kx + 18, ky], [kx + 20, ky + 8], [kx + 2, ky + 8]]);
    }
    return out;
  }, []);
  const angry = pose.brow > 0.5;
  const eyeR = 4 + Math.max(0, pose.eyes - 1) * 9;
  const arm = (sh: SketchPt, el: [number, number], hand: SketchPt, side: 1 | -1, ghost = 0) => {
    const dx = ghost * 16 * side;
    const dy = ghost * -12;
    const pts: SketchPt[] = [sh, [el[0] + dx * 0.5, el[1] + dy * 0.5], [hand[0] + dx, hand[1] + dy]];
    return (
      <g key={`${side}-${ghost}`} opacity={ghost ? 0.32 : 1}>
        <Rough points={pts} seed={seed + 40 + side * 3 + ghost * 17} amp={2} stroke={ink} width={4} passes={ghost ? 1 : 2} />
        <RoughEllipse cx={hand[0] + dx} cy={hand[1] + dy} rx={13} ry={11} seed={seed + 60 + side + ghost * 5} amp={1.4} fill={paper} stroke={ink} width={3.5} passes={1} />
      </g>
    );
  };
  return (
    <svg viewBox="-720 -420 1440 560" width={1440 * scale} height={560 * scale} style={{ position: "absolute", left: x - 720 * scale, top: y - 420 * scale, overflow: "visible", ...style }}>
      {/* body hump (behind the desk) */}
      <Rough points={body} seed={seed + 1} amp={2.2} stroke={ink} width={4.5} fill={paper} />
      {/* arms */}
      {fury > 0.05 && [1, -1].map((g) => arm(lSh, lEl, lHand, -1, g * fury))}
      {fury > 0.05 && [1, -1].map((g) => arm(rSh, rEl, rHand, 1, g * fury))}
      {arm(lSh, lEl, lHand, -1)}
      {arm(rSh, rEl, rHand, 1)}
      {/* head */}
      <g transform={`rotate(${pose.tilt} ${headC[0]} ${headC[1]})`}>
        <RoughEllipse cx={headC[0]} cy={headC[1]} rx={HEAD_R} ry={HEAD_R} seed={seed + 2} amp={2.4} fill={paper} stroke={ink} width={5} />
        {/* eyes */}
        {pose.eyes < 0.3 ? (
          <>
            <Rough points={[[headC[0] - 38, headC[1] - 12], [headC[0] - 14, headC[1] - 10]]} seed={seed + 3} amp={1} stroke={ink} width={4} passes={1} />
            <Rough points={[[headC[0] + 14, headC[1] - 10], [headC[0] + 38, headC[1] - 12]]} seed={seed + 4} amp={1} stroke={ink} width={4} passes={1} />
          </>
        ) : angry ? (
          <>
            <Rough points={[[headC[0] - 42, headC[1] - 24], [headC[0] - 12, headC[1] - 8]]} seed={seed + 3} amp={1.2} stroke={ink} width={6} passes={1} linecap="round" />
            <Rough points={[[headC[0] + 12, headC[1] - 8], [headC[0] + 42, headC[1] - 24]]} seed={seed + 4} amp={1.2} stroke={ink} width={6} passes={1} linecap="round" />
          </>
        ) : (
          <>
            {pose.eyes > 1.2 && (
              <>
                <RoughEllipse cx={headC[0] - 26} cy={headC[1] - 14} rx={eyeR + 5} ry={eyeR + 6} seed={seed + 5} amp={1} fill={paper} stroke={ink} width={3} passes={1} />
                <RoughEllipse cx={headC[0] + 26} cy={headC[1] - 14} rx={eyeR + 5} ry={eyeR + 6} seed={seed + 6} amp={1} fill={paper} stroke={ink} width={3} passes={1} />
              </>
            )}
            <circle cx={headC[0] - 26 + (pose.pupil - 0.5) * 8} cy={headC[1] - 14 + Math.max(0, pose.pupil - 0.5) * 10} r={Math.max(2.5, 4.5 * Math.min(1, pose.eyes))} fill={ink} />
            <circle cx={headC[0] + 26 + (pose.pupil - 0.5) * 8} cy={headC[1] - 14 + Math.max(0, pose.pupil - 0.5) * 10} r={Math.max(2.5, 4.5 * Math.min(1, pose.eyes))} fill={ink} />
          </>
        )}
        {/* brows (the angry eye strokes already are the brows) */}
        {!angry && <Rough points={[[headC[0] - 46, headC[1] - 40 - pose.brow * -4], [headC[0] - 14, headC[1] - 40 + pose.brow * 16]]} seed={seed + 7} amp={1.2} stroke={ink} width={4} passes={1} />}
        {!angry && <Rough points={[[headC[0] + 14, headC[1] - 40 + pose.brow * 16], [headC[0] + 46, headC[1] - 40 - pose.brow * -4]]} seed={seed + 8} amp={1.2} stroke={ink} width={4} passes={1} />}
        {/* mouth */}
        {pose.open > 0.15 ? (
          <>
            <path d={roughPath([[headC[0] - 16 - 8 * pose.open, headC[1] + 26], [headC[0] - 6, headC[1] + 30 + 16 * pose.open], [headC[0] + 8, headC[1] + 30 + 16 * pose.open], [headC[0] + 16 + 8 * pose.open, headC[1] + 26]], seed + 9, 1.4, true)} fill={ink} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
            {pose.open > 0.6 && <rect x={headC[0] - 9} y={headC[1] + 27} width={18} height={4} fill={paper} />}
          </>
        ) : (
          <Rough points={[[headC[0] - 20, headC[1] + 28 - pose.mouth * 5], [headC[0], headC[1] + 28 + pose.mouth * 11], [headC[0] + 20, headC[1] + 28 - pose.mouth * 5]]} seed={seed + 9} amp={1} stroke={ink} width={4} passes={1} />
        )}
      </g>
      {/* sweat */}
      {pose.sweat > 0.05 && (
        <path d={roughPath([[headC[0] + 78, headC[1] - 44 + (frame % 18)], [headC[0] + 86, headC[1] - 30 + (frame % 18)], [headC[0] + 78, headC[1] - 22 + (frame % 18)], [headC[0] + 70, headC[1] - 30 + (frame % 18)]], seed + 10, 0.8, true)} fill={paper} stroke={ink} strokeWidth={3} opacity={pose.sweat} />
      )}
      {/* keyboard */}
      <g transform={`translate(${rattle} ${rattle * 0.4})`}>
        <Rough points={[[-150, -40], [150, -40], [172, 6], [-172, 6]]} close seed={seed + 11} amp={1.6} stroke={ink} width={4} fill="#e9e7e1" />
        {keys.map((k, i) => (
          <path key={i} d={roughPath(k, seed + 100 + i, 0.5, true)} fill="none" stroke={ink} strokeWidth={1.6} opacity={0.75} />
        ))}
      </g>
      {/* fury: motion strokes around the hands */}
      {fury > 0.05 &&
        [lHand, rHand].map((h, hi) =>
          [0, 1, 2].map((i) => {
            const a = -1.9 + i * 0.5 + hi * 0.3;
            const r0 = 30 + ((frame * 4 + i * 9) % 16);
            return <path key={`${hi}-${i}`} d={roughPath([[h[0] + Math.cos(a) * r0, h[1] + Math.sin(a) * r0], [h[0] + Math.cos(a) * (r0 + 34 + 16 * fury), h[1] + Math.sin(a) * (r0 + 34 + 16 * fury)]], seed + 200 + i + hi * 3, 1.2)} stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.9 * fury} />;
          }),
        )}
      {/* desk */}
      {desk && (
        <>
          <Rough points={[[-560, 0], [560, 0], [600, 96], [-600, 96]]} close seed={seed + 12} amp={2} stroke={ink} width={4.5} fill={GREY} />
          <Rough points={[[-560, 0], [560, 0]]} seed={seed + 13} amp={1.5} stroke={ink} width={5} passes={1} />
        </>
      )}
    </svg>
  );
}

export const SCRIBBLE_INK = INK;
export const SCRIBBLE_PAPER = PAPER;
export const SCRIBBLE_GREY = GREY;

import { Easing, evalKeyframes, useFrame, type EasingFn } from "@agenticvids/core";
import { useMemo, type CSSProperties } from "react";

/**
 * An abstract monoline character for the ArchDev film. Front view, seated
 * at a desk. Everything is a pure function of a `Pose`; poses are blended
 * per frame with the core keyframe evaluator, so acting is data.
 *
 * Coordinate space: origin at the desk-top centre, y grows downward.
 * Shoulders sit at (±46, -150), head centre at (0, -232).
 */
export interface Pose {
  /** -1..1: where the head is turned (features shift). */
  headTurn: number;
  /** degrees; + nods down, − looks up. */
  headTilt: number;
  /** degrees; side tilt. */
  headRoll: number;
  /** degrees; torso lean, + toward the desk. */
  lean: number;
  /** 0..1 collapse: lowers the torso and rounds the shoulders. */
  slump: number;
  /** 0..1 shoulder raise (tension). */
  shoulders: number;
  /** hand targets in character space */
  lhx: number;
  lhy: number;
  rhx: number;
  rhy: number;
  /** 0..1 eye openness (1.2 = wide). */
  eyes: number;
  pupilX: number;
  pupilY: number;
  /** -1 raised .. 1 furrowed */
  brow: number;
  /** -1 frown .. 1 smile */
  mouth: number;
  /** 0..1 */
  mouthOpen: number;
}

const base: Pose = { headTurn: 0, headTilt: 6, headRoll: 0, lean: 3, slump: 0, shoulders: 0, lhx: -104, lhy: -16, rhx: 104, rhy: -16, eyes: 0.95, pupilX: 0, pupilY: 0.3, brow: 0, mouth: 0.1, mouthOpen: 0 };

export const POSES = {
  typing: base,
  reading: { ...base, headTilt: 10, pupilY: 0.5, mouth: 0 },
  lookUp: { ...base, headTilt: -24, lean: -8, eyes: 1.1, pupilY: -0.9, brow: -0.7, mouth: 0, mouthOpen: 0.45 },
  lookUpMore: { ...base, headTilt: -34, lean: -14, eyes: 1.2, pupilY: -1, brow: -0.9, mouth: -0.1, mouthOpen: 0.6 },
  slumped: { ...base, headTilt: 30, lean: 10, slump: 1, shoulders: 0.6, lhx: -128, lhy: -10, rhx: 128, rhy: -10, eyes: 0.35, pupilY: 0.6, brow: 0.7, mouth: -0.6, mouthOpen: 0 },
  swivelL: { ...base, headTurn: -1, headTilt: -2, headRoll: -4, lhx: -560, lhy: -230, rhx: 104, rhy: -16, eyes: 1, pupilX: -1, pupilY: -0.2, brow: 0.3, mouth: -0.2 },
  swivelR: { ...base, headTurn: 1, headTilt: -4, headRoll: 4, lhx: -104, lhy: -16, rhx: 430, rhy: -300, eyes: 1, pupilX: 1, pupilY: -0.2, brow: 0.3, mouth: -0.2 },
  flinch: { ...base, headTilt: -8, lean: -16, shoulders: 0.9, lhx: -110, lhy: -180, rhx: 110, rhy: -180, eyes: 1.25, pupilY: -0.3, brow: -0.5, mouth: -0.4, mouthOpen: 0.8 },
  overwhelmed: { ...base, headTilt: 22, lean: 8, slump: 0.7, shoulders: 1, lhx: -38, lhy: -246, rhx: 38, rhy: -246, eyes: 0.45, pupilY: 0.5, brow: 1, mouth: -0.8, mouthOpen: 0.1 },
  hollow: { ...base, headTilt: 12, lean: 0, slump: 0.9, shoulders: 0.3, lhx: -132, lhy: -10, rhx: 132, rhy: -10, eyes: 0.6, pupilX: 0, pupilY: 0.1, brow: 0.5, mouth: -0.5, mouthOpen: 0 },
  calm: { ...base, headTilt: 4, lean: 0, slump: 0, shoulders: 0, eyes: 0.95, pupilY: 0.25, brow: 0, mouth: 0.8, mouthOpen: 0 },
  exhale: { ...base, headTilt: 2, lean: -4, slump: 0, shoulders: 0.5, eyes: 0.5, pupilY: 0.2, brow: -0.2, mouth: 0.3, mouthOpen: 0.35 },
} satisfies Record<string, Pose>;

export type PoseKey = { frame: number; pose: Pose; easing?: EasingFn };

/** Blend poses over local frames (numeric keyframes, eased per target key). */
export function usePose(keys: PoseKey[], offset = 0): Pose {
  const frame = useFrame();
  return useMemo(() => {
    const kf = keys.map((k) => ({ frame: k.frame, easing: k.easing ?? Easing.inOutCubic, ...k.pose }));
    return evalKeyframes(kf, frame - offset) as unknown as Pose;
  }, [keys, frame, offset]);
}

/* ------------------------------- geometry ------------------------------- */

const L1 = 82; // upper arm
const L2 = 78; // forearm
const SH = 46; // shoulder half-width
const SY = -150; // shoulder y

/** Two-bone IK with the elbow biased outward from the body centre. */
function ik(sx: number, sy: number, tx: number, ty: number, side: 1 | -1): [number, number] {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = L1 + L2 - 2;
  const min = Math.abs(L1 - L2) + 2;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  } else if (d < min) {
    dx = dx === 0 && dy === 0 ? min * side : (dx * min) / d;
    dy = dx === 0 && dy === 0 ? 0 : (dy * min) / d;
    d = min;
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const baseAng = Math.atan2(dy, dx);
  const c1 = [sx + Math.cos(baseAng + a) * L1, sy + Math.sin(baseAng + a) * L1];
  const c2 = [sx + Math.cos(baseAng - a) * L1, sy + Math.sin(baseAng - a) * L1];
  // outward = larger x*side, tie-break lower elbow
  const pick = c1[0] * side > c2[0] * side + 0.01 ? c1 : c2[0] * side > c1[0] * side + 0.01 ? c2 : c1[1] > c2[1] ? c1 : c2;
  return [pick[0], pick[1]];
}

/* -------------------------------- Person -------------------------------- */

export function Person({ pose, x = 0, y = 0, scale = 1, color = "#d3c6aa", accent = "#a7c080", weight = 3.2, glow = 0, typing = 0, breathe = true, style }: { pose: Pose; x?: number; y?: number; scale?: number; color?: string; accent?: string; weight?: number; glow?: number; /** 0..1 typing intensity: hands bob alternately */ typing?: number; breathe?: boolean; style?: CSSProperties }) {
  const frame = useFrame();
  // deterministic blink: every ~92 frames, 5 frames long, offset by a prime
  const blinkT = (frame + 37) % 92;
  const blink = blinkT < 5 ? 1 - Math.abs(blinkT - 2) / 2.5 : 0;
  const breath = breathe ? Math.sin(frame / 14) * 1.6 : 0;
  const eyesOpen = Math.max(0.06, pose.eyes * (1 - blink));

  const slumpY = pose.slump * 26;
  const shoulderY = SY + slumpY - pose.shoulders * 14 + breath * 0.4;
  const shoulderX = SH - pose.slump * 6 + pose.shoulders * 3;
  const headCx = pose.headTurn * 6;
  const headCy = -232 + slumpY * 1.15 + pose.slump * 10 + breath;
  const neckTop = headCy + 44;

  const typeL = typing ? Math.max(0, Math.sin(frame * 0.9)) * 5 * typing : 0;
  const typeR = typing ? Math.max(0, Math.sin(frame * 0.9 + Math.PI)) * 5 * typing : 0;
  const lHand: [number, number] = [pose.lhx, pose.lhy - typeL];
  const rHand: [number, number] = [pose.rhx, pose.rhy - typeR];
  const lElbow = ik(-shoulderX, shoulderY, lHand[0], lHand[1], -1);
  const rElbow = ik(shoulderX, shoulderY, rHand[0], rHand[1], 1);

  const feat = pose.headTurn * 17; // facial feature shift
  const eyeY = headCy - 4 + pose.headTilt * 0.35;
  const eyeRy = 6.5 * eyesOpen;
  const browY = eyeY - 16 - pose.brow * -3 + (pose.brow < 0 ? pose.brow * 6 : 0);
  const mouthY = headCy + 26 + pose.headTilt * 0.3;
  const mouthW = 15 - Math.abs(pose.headTurn) * 3;
  const smileCy = mouthY + pose.mouth * 11;
  const stroke = { stroke: color, strokeWidth: weight, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} style={{ ...style, filter: glow ? `drop-shadow(0 0 ${glow}px ${color}55)` : undefined }}>
      {/* chair back */}
      <path d={`M-92 ${shoulderY + 40} q0 -70 92 -76 q92 6 92 76`} {...stroke} strokeWidth={weight * 0.8} opacity={0.35} />
      {/* torso */}
      <g transform={`rotate(${pose.lean} 0 10)`}>
        <path d={`M${-shoulderX - 8} ${shoulderY + 6} Q${-shoulderX - 16} ${shoulderY - 14} ${-shoulderX + 10} ${shoulderY - 18} L${shoulderX - 10} ${shoulderY - 18} Q${shoulderX + 16} ${shoulderY - 14} ${shoulderX + 8} ${shoulderY + 6} L${shoulderX + 6} 14 L${-shoulderX - 6} 14 Z`} {...stroke} fill="#1e2326" />
        {/* hoodie neckline */}
        <path d={`M-22 ${shoulderY - 16} q22 26 44 0`} {...stroke} strokeWidth={weight * 0.75} />
        {/* neck */}
        <path d={`M-9 ${shoulderY - 16} L-9 ${neckTop} M9 ${shoulderY - 16} L9 ${neckTop}`} {...stroke} strokeWidth={weight * 0.75} />
      </g>
      {/* arms (drawn after torso so hands sit in front) */}
      <path d={`M${-shoulderX} ${shoulderY} L${lElbow[0]} ${lElbow[1]} L${lHand[0]} ${lHand[1]}`} {...stroke} strokeWidth={weight * 1.35} />
      <path d={`M${shoulderX} ${shoulderY} L${rElbow[0]} ${rElbow[1]} L${rHand[0]} ${rHand[1]}`} {...stroke} strokeWidth={weight * 1.35} />
      <circle cx={lHand[0]} cy={lHand[1]} r={6.5} fill={color} />
      <circle cx={rHand[0]} cy={rHand[1]} r={6.5} fill={color} />
      {/* head */}
      <g transform={`rotate(${pose.headRoll} ${headCx} ${headCy})`}>
        <ellipse cx={headCx} cy={headCy} rx={46 - Math.abs(pose.headTurn) * 4} ry={48} {...stroke} fill="#1e2326" />
        {/* hair: cap + fringe swept to one side */}
        <path d={`M${headCx - 44} ${headCy - 12} q6 -44 44 -46 q40 2 45 40 q-24 -20 -50 -12 q-20 4 -39 18Z`} fill={color} opacity={0.9} />
        {/* brows */}
        <path d={`M${headCx - 26 + feat} ${browY - pose.brow * 2} l16 ${pose.brow * 5}`} {...stroke} strokeWidth={weight * 0.9} />
        <path d={`M${headCx + 26 + feat} ${browY - pose.brow * 2} l-16 ${pose.brow * 5}`} {...stroke} strokeWidth={weight * 0.9} />
        {/* eyes */}
        <ellipse cx={headCx - 17 + feat} cy={eyeY} rx={5.5} ry={eyeRy} fill={color} />
        <ellipse cx={headCx + 17 + feat} cy={eyeY} rx={5.5} ry={eyeRy} fill={color} />
        {eyesOpen > 0.3 && (
          <>
            <circle cx={headCx - 17 + feat + pose.pupilX * 2.2} cy={eyeY + pose.pupilY * 2.4} r={2.2} fill="#1e2326" />
            <circle cx={headCx + 17 + feat + pose.pupilX * 2.2} cy={eyeY + pose.pupilY * 2.4} r={2.2} fill="#1e2326" />
          </>
        )}
        {/* mouth */}
        {pose.mouthOpen > 0.15 ? (
          <ellipse cx={headCx + feat} cy={mouthY + 2} rx={7 + pose.mouthOpen * 4} ry={3 + pose.mouthOpen * 8} fill={color} />
        ) : (
          <path d={`M${headCx - mouthW + feat} ${mouthY} Q${headCx + feat} ${smileCy} ${headCx + mouthW + feat} ${mouthY}`} {...stroke} strokeWidth={weight * 0.9} />
        )}
      </g>
      {/* accent: a small stripe on the hoodie sleeve for colour */}
      <circle cx={-shoulderX - 2} cy={shoulderY + 30} r={3.5} fill={accent} opacity={0.9} />
    </g>
  );
}

/* ------------------------------- Archie -------------------------------- */

export type ArchieState = "idle" | "working" | "waiting" | "error" | "done";

/** ArchDev's gantry-head mascot, used for the agents. */
export function Archie({ size = 48, state = "working", x = 0, y = 0, style }: { size?: number; state?: ArchieState; x?: number; y?: number; style?: CSSProperties }) {
  const frame = useFrame();
  const body = state === "error" ? "#e67e80" : state === "waiting" ? "#dbbc7f" : state === "done" ? "#83c092" : "#a7c080";
  const bob = state === "working" ? Math.sin(frame / 5) * 0.7 : 0;
  const scanY = 13 + ((frame * 0.7) % 6);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ position: "absolute", left: x, top: y, overflow: "visible", ...style }} aria-hidden>
      <g transform={`translate(0 ${bob})`}>
        <path d="M16 7V4.5" stroke={body} strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={16} cy={3.5} r={1.8} fill={state === "working" ? body : "#859289"} opacity={state === "working" ? 0.6 + 0.4 * Math.abs(Math.sin(frame / 6)) : 1} />
        <path d="M11 7h10a7 7 0 0 1 7 7v6a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7v-6a7 7 0 0 1 7-7Z" fill={body} />
        <rect x={7.5} y={11} width={17} height={9} rx={4.5} fill="#1e2326" />
        {state === "error" ? (
          <>
            <path d="M10.5 14l3.4 3M13.9 14l-3.4 3M18.1 14l3.4 3M21.5 14l-3.4 3" stroke="#e67e80" strokeWidth={1.4} strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={12.2} cy={15.5} r={1.6} fill="#d3c6aa" />
            <circle cx={19.8} cy={15.5} r={1.6} fill="#d3c6aa" />
          </>
        )}
        {state === "working" && <path d={`M9.5 ${scanY}h13`} stroke="#a7c080" strokeWidth={0.8} opacity={0.6} />}
        {state === "done" ? <path d="M12 23.5l2.6 2.4 5.4-5" stroke="#1e2326" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : state === "waiting" ? <path d="M12.2 24h7.6" stroke="#1e2326" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="1.5 2" /> : <path d="M12.2 23h7.6" stroke="#1e2326" strokeWidth={1.4} strokeLinecap="round" />}
      </g>
    </svg>
  );
}

/* -------------------------------- Desk ---------------------------------- */

/** Desk top + front panel; drawn *after* the person so it occludes the lap. */
export function Desk({ x = 0, y = 0, scale = 1, width = 640, color = "#d3c6aa" }: { x?: number; y?: number; scale?: number; width?: number; color?: string }) {
  const w = width / 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={`M${-w} 0 L${w} 0 L${w - 10} 16 L${-w + 10} 16 Z`} fill="#3d484d" />
      <rect x={-w + 10} y={16} width={w * 2 - 20} height={130} fill="#232a2e" />
      <line x1={-w} y1={0} x2={w} y2={0} stroke={color} strokeWidth={2.4} opacity={0.7} />
      <path d={`M${-w + 40} 146 v40 M${w - 40} 146 v40`} stroke={color} strokeWidth={2.4} opacity={0.35} strokeLinecap="round" />
    </g>
  );
}

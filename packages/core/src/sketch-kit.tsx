import type { ReactNode } from "react";
import { Tone } from "./audio";
import type { Frames } from "./frames";
import { Easing, interpolate, progress } from "./interpolate";
import { Reveal } from "./primitives";
import {
  Rough,
  RoughRect,
  roughEllipse,
  roughPath,
  roughRect,
  scribble,
  sketchHash,
  useBoil,
} from "./sketch";
import { Draw } from "./text";
import { useFrame } from "./timeline";

/**
 * Comic ingredients for hand-drawn films: caption boxes, onomatopoeia, sketched
 * windows, thought bubbles, an unrolling paper scroll, a rubber stamp and a
 * pencil-scratch sound. Colours and fonts read CSS variables with fallbacks, so
 * a theme class can set --ink / --paper / --red / --hand / --marker.
 */
const INK = "var(--ink, #161616)";
const PAPER = "var(--paper, #f5f3ee)";
const RED = "var(--red, #d2382c)";
const LIGHT = "var(--light, #e9e7e1)";
const HAND = 'var(--hand, "Patrick Hand", "Comic Sans MS", cursive)';
const MARKER = 'var(--marker, "Gochi Hand", "Patrick Hand", cursive)';

/** Pencil scratch: dark paper texture with rounded edges, not broadband hiss. */
export function PencilScratch({
  at,
  volume = 0.075,
  length = 9,
  pan = 0,
}: {
  at: Frames;
  volume?: number;
  length?: number;
  pan?: number;
}) {
  return (
    <Tone
      at={at}
      durationInFrames={length}
      freq={900}
      wave="noise"
      cutoff={1250}
      attack={0.025}
      decay={0.12}
      sustain={0.16}
      release={0.08}
      volume={volume}
      pan={pan}
      spread={0.18}
      name="scratch"
    />
  );
}

/** Comic caption box, top-left by default. */
export function Caption({
  at,
  x = 28,
  y = 28,
  w,
  size = 40,
  exitAt,
  textDelay = 5,
  children,
}: {
  at: Frames;
  x?: number;
  y?: number;
  w: number;
  size?: number;
  exitAt?: Frames;
  textDelay?: number;
  children: ReactNode;
}) {
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
          <RoughRect
            x={3}
            y={3}
            w={w - 6}
            h={h - 6}
            seed={seed + 21}
            amp={1.6}
            stroke={INK}
            width={4}
            fill={PAPER}
            passes={1}
          />
        </Draw>
      </svg>
      <Reveal
        at={(at as number) + textDelay}
        duration={16}
        style={{
          fontFamily: HAND,
          position: "absolute",
          left: 18,
          top: 7,
          fontSize: size,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Reveal>
    </div>
  );
}

/** Onomatopoeia in marker: pops in with overshoot, wobbles, pops out. */
export function SfxWord({
  at,
  x,
  y,
  rot = -6,
  size = 72,
  color = INK,
  exitAt,
  children,
}: {
  at: number;
  x: number;
  y: number;
  rot?: number;
  size?: number;
  color?: string;
  exitAt?: number;
  children: ReactNode;
}) {
  const frame = useFrame();
  const p = progress(frame, at, 9, Easing.outBack);
  const out = exitAt !== undefined ? progress(frame, exitAt, 7, Easing.inCubic) : 0;
  if (frame < at || out >= 1) return null;
  const wobble = Math.sin(frame * 0.8 + x) * 2;
  return (
    <div
      data-copy=""
      style={{
        fontFamily: MARKER,
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        color,
        transform: `rotate(${rot + wobble}deg) scale(${p * (1 - 0.35 * out)})`,
        transformOrigin: "center",
        opacity: 1 - out,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}

/** A sketched window: title bar, three buttons, scribbled lines. Sketches itself in. */
export function SketchWindow({
  x,
  y,
  w,
  h,
  title,
  at = 0,
  lines = 6,
  seedOff = 0,
  shake = 0,
  dx = 0,
  dy = 0,
  exitAt,
  z,
  right,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  at?: number;
  lines?: number;
  seedOff?: number;
  shake?: number;
  dx?: number;
  dy?: number;
  exitAt?: number;
  z?: number;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const seed = useBoil(4) + seedOff * 13;
  const frame = useFrame();
  if (frame < at || (exitAt !== undefined && frame >= exitAt)) return null;
  const sx = shake ? Math.sin(frame * 4.1 + seedOff) * 4 * shake : 0;
  const sy = shake ? Math.cos(frame * 3.3 + seedOff * 2) * 3 * shake : 0;
  return (
    <div
      style={{ position: "absolute", left: x + sx + dx, top: y + sy + dy, width: w, height: h, zIndex: z }}
    >
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Draw at={at} duration={12} each={1.5}>
          <RoughRect
            x={3}
            y={3}
            w={w - 6}
            h={h - 6}
            seed={seed + 1}
            amp={1.8}
            stroke={INK}
            width={4}
            fill={PAPER}
          />
          <Rough
            points={[
              [3, 44],
              [w - 3, 44],
            ]}
            seed={seed + 2}
            amp={1.2}
            stroke={INK}
            width={3}
            passes={1}
          />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={roughEllipse(24 + i * 24, 24, 7, 7, seed + 3 + i, 0.8)}
              fill={i === 0 ? RED : "none"}
              stroke={INK}
              strokeWidth={2.5}
            />
          ))}
          {Array.from({ length: lines }).map((_, i) => (
            <path
              key={`l${i}`}
              d={scribble(
                24,
                76 + i * 30,
                (w - 64) * (0.4 + sketchHash(seedOff + 7, i) * 0.55),
                seed + 20 + i,
              )}
              fill="none"
              stroke={INK}
              strokeWidth={2.2}
              opacity={0.5}
            />
          ))}
        </Draw>
      </svg>
      <div
        style={{
          fontFamily: HAND,
          position: "absolute",
          left: 96,
          top: 6,
          fontSize: 27,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      {right && (
        <div
          style={{
            fontFamily: HAND,
            position: "absolute",
            right: 18,
            top: 6,
            fontSize: 27,
            whiteSpace: "nowrap",
          }}
        >
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Thought bubble drawn in ink; (x, y) is the small trailing puff near the head. */
export function SketchThought({
  at,
  x,
  y,
  w = 320,
  h = 110,
  size = 40,
  exitAt,
  children,
}: {
  at: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  size?: number;
  exitAt?: number;
  children: ReactNode;
}) {
  const frame = useFrame();
  const seed = useBoil(4);
  const p = progress(frame, at, 12, Easing.outBack);
  const out = exitAt !== undefined ? progress(frame, exitAt, 7, Easing.inCubic) : 0;
  if (frame < at || out >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - h - 70,
        width: w + 40,
        height: h + 80,
        transform: `scale(${p * (1 - 0.3 * out)})`,
        transformOrigin: "left bottom",
        opacity: 1 - out,
      }}
    >
      <svg width={w + 40} height={h + 80} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={roughEllipse(w / 2 + 20, h / 2, w / 2, h / 2, seed + 61, 2.5, 32)}
          fill={PAPER}
          stroke={INK}
          strokeWidth={4}
        />
        <path d={roughEllipse(34, h + 24, 13, 10, seed + 62, 1)} fill={PAPER} stroke={INK} strokeWidth={3} />
        <path d={roughEllipse(16, h + 50, 7, 5, seed + 63, 1)} fill={PAPER} stroke={INK} strokeWidth={3} />
      </svg>
      <div
        data-copy=""
        style={{
          fontFamily: HAND,
          position: "absolute",
          left: 20,
          top: 0,
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: size,
          lineHeight: 1.1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The plan, unrolling off the window and over the edge of the desk. */
export function PaperScroll({
  at,
  x,
  y,
  w,
  maxH,
  foldAt,
}: {
  at: number;
  x: number;
  y: number;
  w: number;
  maxH: number /** local y of the desk edge: below it the paper folds over and hangs down the desk face */;
  foldAt: number;
}) {
  const frame = useFrame();
  const seed = useBoil(4);
  const h = interpolate(frame, [at, at + 90], [30, maxH], { easing: Easing.inOutCubic });
  const n = Math.max(0, Math.floor((h - 26) / 26));
  const bend = 34; // px the hanging part shifts toward the viewer
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
    <svg width={w} height={maxH + 30} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
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

/** Red rubber stamp slamming down. */
export function SketchStamp({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useFrame();
  const seed = useBoil(4);
  const p = progress(frame, at, 7, Easing.outCubic);
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 400,
        height: 124,
        transform: `rotate(-11deg) scale(${1.7 - 0.7 * p})`,
        opacity: Math.min(1, p * 1.4),
        transformOrigin: "center",
        zIndex: 9,
      }}
    >
      <svg width={400} height={124} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={roughRect(4, 4, 392, 116, seed + 51, 3)} fill="none" stroke={RED} strokeWidth={6} />
        <path d={roughRect(13, 13, 374, 98, seed + 52, 2)} fill="none" stroke={RED} strokeWidth={3} />
      </svg>
      <div
        data-copy=""
        style={{
          fontFamily: MARKER,
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 66,
          color: RED,
          letterSpacing: "0.04em",
        }}
      >
        APPROVED
      </div>
    </div>
  );
}

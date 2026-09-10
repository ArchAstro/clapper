import type { CSSProperties } from "react";

type P = [number, number];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const blend = (a: P, b: P, t: number): P => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
function limb(a: P, b: P, c: P, width: number, fill: string) {
  return (
    <>
      <path
        d={`M${a} Q${b} ${c}`}
        fill="none"
        stroke="#d5bfa3"
        strokeWidth={width + 5}
        strokeLinecap="round"
      />
      <path d={`M${a} Q${b} ${c}`} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

/** Hand-authored feline ballet rig. Every joint is driven by musical position. */
export function Cat({ beat, frame }: { beat: number; frame: number }) {
  const opening = beat < 6,
    turning = beat >= 30 && beat < 54,
    leaping = beat >= 54 && beat < 66,
    bowing = beat >= 69;
  const phase = (((beat % 3) + 3) % 3) / 3;
  const turnWeight = ease((beat - 29.5) / 0.8) * (1 - ease((beat - 53.5) / 0.8));
  const arabesque =
    ease((beat - 12) / 0.7) * (1 - ease((beat - 15) / 1)) +
    ease((beat - 20) / 0.7) * (1 - ease((beat - 23) / 1));
  const flight = leaping ? Math.sin(Math.PI * clamp((phase - 0.16) / 0.68)) : 0;
  const lift = bowing ? 0 : leaping ? flight * 133 : mix(Math.sin(phase * Math.PI) * 13, 18, turnWeight);
  const heldTravel =
    beat >= 12 && beat < 24
      ? mix(160, -160, ease((beat - 16) / 4))
      : Math.sin(((beat - 6) * Math.PI) / 12) * 160;
  const x =
    960 +
    (opening
      ? mix(-80, 0, ease(beat / 6))
      : turning
        ? Math.sin(((beat - 30) * Math.PI) / 12) * 155
        : leaping
          ? Math.sin(((beat - 54) * Math.PI) / 6) * 250
          : beat >= 66
            ? 0
            : heldTravel);
  const bow = ease((beat - 69) / 2.5);
  const y = 699 - lift + (bowing ? bow * 14 : 0);
  const turn = turning ? ((beat - 30) * Math.PI) / 3 : 0;
  const facing = Math.cos(turn),
    side = turning ? 0.45 + 0.55 * Math.abs(facing) : 1;
  const faceOpacity = turning ? ease((facing + 0.25) / 0.65) : 1;
  const style: CSSProperties = { transformOrigin: "0px -90px" };
  const cream = "url(#cat-fur)";
  const overhead = turnWeight + (opening ? ease((beat - 2) / 3) * (1 - ease((beat - 5) / 1)) * 0.7 : 0);
  const reach = leaping ? flight : 0;
  const leftHand: P = blend(
    blend(
      [mix(-134, -57, overhead) - reach * 35, mix(-135, -278, overhead) - reach * 30],
      [-182, -208],
      arabesque,
    ),
    [-117, -25],
    bow,
  );
  const rightHand: P = blend(
    blend(
      [mix(138, 57, overhead) + reach * 35, mix(-125, -278, overhead) - reach * 45],
      [166, -100],
      arabesque,
    ),
    [117, -25],
    bow,
  );
  const leftFoot: P = bowing
    ? [-38, 170 - bow * 14]
    : leaping
      ? [-45 - flight * 133, 163 - flight * 85]
      : blend(
          blend([-38 - Math.sin(phase * Math.PI * 2) * 22, 170 + lift], [-14, 170 + lift], arabesque),
          [-9, 172],
          turnWeight,
        );
  const rightFoot: P = bowing
    ? [38, 170 - bow * 14]
    : leaping
      ? [45 + flight * 133, 163 - flight * 85]
      : blend(
          blend(
            [
              37 + Math.sin(phase * Math.PI * 2) * 22,
              170 + lift - Math.max(0, Math.sin(phase * Math.PI * 2)) * 19,
            ],
            [157, 78],
            arabesque,
          ),
          [84, 76],
          turnWeight,
        );
  const lean = bowing
    ? bow * 3
    : leaping
      ? Math.sin(phase * Math.PI * 2) * 8
      : Math.sin((beat * Math.PI) / 6) * 3 - arabesque * 7;
  const eyesClosed = bowing || frame % 151 > 144;
  return (
    <>
      <ellipse
        cx={x}
        cy={879}
        rx={100 - flight * 28}
        ry={16 - flight * 4}
        fill="#0d1418"
        opacity={0.33 - flight * 0.17}
        filter="url(#shadow)"
      />
      <g transform={`translate(${x} ${y}) scale(${side} 1)`}>
        <path
          d={`M35 -15 C${150 + Math.sin(beat * 1.3) * 20} 65 ${180 + Math.sin(beat) * 30} -100 ${110 + Math.sin(beat * 0.7) * 40} -113`}
          fill="none"
          stroke="#d9c3a4"
          strokeWidth="33"
          strokeLinecap="round"
        />
        <path
          d={`M35 -15 C${150 + Math.sin(beat * 1.3) * 20} 65 ${180 + Math.sin(beat) * 30} -100 ${110 + Math.sin(beat * 0.7) * 40} -113`}
          fill="none"
          stroke="#f4e5c9"
          strokeWidth="25"
          strokeLinecap="round"
        />
        {limb([-26, 4], [-42 - flight * 85 - bow * 18, 94 - flight * 26], leftFoot, 26, cream)}
        {limb(
          [25, 4],
          [
            mix(45 + flight * 80, 74, turnWeight) + arabesque * 47 + bow * 18,
            mix(94 - flight * 25, 28, turnWeight) - arabesque * 55,
          ],
          rightFoot,
          26,
          cream,
        )}
        {[leftFoot, rightFoot].map((p, i) => (
          <g key={i} transform={`translate(${p}) rotate(${leaping ? (i ? -55 : 55) : i ? -9 : 9})`}>
            <path
              d="M-14 -15 Q0 -23 14 -13 L11 21 Q0 30 -10 19 Z"
              fill="#c9858c"
              stroke="#905861"
              strokeWidth="2"
            />
            <path d="M-13 -30 L12 0 M13 -29 L-11 1" stroke="#d8999b" strokeWidth="5" fill="none" />
          </g>
        ))}
        <g transform={`rotate(${lean} 0 -35) scale(1 ${1 - bow * 0.09})`} style={style}>
          {limb([-42, -131], [-126 - overhead * 2, -175 - overhead * 75], leftHand, 25, cream)}
          {limb([42, -131], [125 + overhead * 5, -167 - overhead * 80], rightHand, 25, cream)}
          {[leftHand, rightHand].map((p, i) => (
            <g key={i} transform={`translate(${p}) rotate(${i ? 35 : -35})`}>
              <ellipse rx="19" ry="24" fill="#f6ead1" stroke="#d3bb9c" strokeWidth="2" />
              <path
                d="M-7 -12L-6 -2M1 -15L1 -4M9 -11L8 -1"
                stroke="#d4b89a"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}
          <path
            d="M-45 -141 Q-56 -100 -35 -51 L-40 7 Q0 43 40 7 L34 -51 Q55 -102 45 -141 Q0 -165 -45 -141Z"
            fill={cream}
            stroke="#d2bb9b"
            strokeWidth="3"
          />
          <path d="M-44 -138 Q-22 -106 0 -132 Q22 -106 44 -138 L34 -40 Q0 -19 -35 -40Z" fill="url(#bodice)" />
          <path d="M-42 -138Q0 -167 42 -138L34 -40Q0 -19 -35 -40Z" fill="#ad7285" opacity={1 - faceOpacity} />
          <path d="M-34 -116 Q0 -82 34 -116" fill="none" stroke="#f4ccbb" strokeWidth="2" opacity=".65" />
          <g transform={`rotate(${-lean * 0.7})`}>
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M-34 ${-44 + i * 9} Q-69 ${-28 + i * 9} -131 ${1 + i * 8} Q-98 ${34 + i * 8} -57 ${26 + i * 8} Q0 ${59 + i * 7} 59 ${26 + i * 8} Q104 ${35 + i * 7} 133 ${2 + i * 8} Q75 ${-29 + i * 9} 34 ${-44 + i * 9}Z`}
                fill={i === 0 ? "#e8aaa7" : i === 1 ? "#efc0b4" : "#f4d4c4"}
                stroke="#f9dfcd"
                strokeWidth="2"
                opacity=".94"
              />
            ))}
            {Array.from({ length: 11 }, (_, i) => {
              const a = (i - 5) * 20;
              return (
                <path
                  key={i}
                  d={`M${a * 0.25} -26 Q${a * 0.7} 14 ${a} 37`}
                  fill="none"
                  stroke="#bd7d86"
                  strokeWidth="1.5"
                  opacity=".27"
                />
              );
            })}
            <path d="M-36 -43 Q0 -25 36 -43" fill="none" stroke="#c4808c" strokeWidth="9" />
            <circle cy="-34" r="6" fill="#f7d78b" />
          </g>
          <g
            transform={`translate(0 ${-210 + bow * 27}) rotate(${bowing ? 0 : Math.sin(beat * 0.9) * 4}) scale(1 ${1 - bow * 0.12})`}
          >
            <path
              d="M-66 -22 L-66 -115 Q-38 -107 -21 -78 L28 -78 Q50 -111 68 -112 L68 -16Z"
              fill={cream}
              stroke="#d2bb9b"
              strokeWidth="3"
            />
            <path d="M-56 -49L-57 -99Q-37 -93 -27 -71Z M36 -70Q52 -97 58 -99L59 -47Z" fill="#dda29c" />
            <ellipse cy="-14" rx="77" ry="72" fill={cream} stroke="#d2bb9b" strokeWidth="3" />
            <g opacity={faceOpacity} transform={`translate(${Math.sin(turn) * 14} 0)`}>
              <ellipse cx="-32" cy="5" rx="20" ry="12" fill="#e3b0a2" opacity=".48" />
              <ellipse cx="32" cy="5" rx="20" ry="12" fill="#e3b0a2" opacity=".48" />
              {[-29, 29].map((e, i) => (
                <g key={i} transform={`translate(${e} -20)`}>
                  {eyesClosed ? (
                    <path
                      d="M-10 0Q0 9 10 0"
                      fill="none"
                      stroke="#3c393b"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <ellipse rx="9" ry="13" fill="#424748" />
                      <ellipse cx="2" cy="-3" rx="3" ry="4" fill="#fff9dd" />
                    </>
                  )}
                </g>
              ))}
              <path d="M-7 6Q0 0 7 6L0 13Z" fill="#a87678" />
              <path
                d="M0 13L0 19M0 19Q-7 25 -13 20M0 19Q7 25 13 20"
                fill="none"
                stroke="#89625d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {[-1, 1].map((s) => (
                <g key={s} stroke="#a79078" strokeWidth="1.6" opacity=".8">
                  <path d={`M${s * 39} 8L${s * 94} 0M${s * 40} 17L${s * 97} 22M${s * 37} 25L${s * 85} 39`} />
                </g>
              ))}
            </g>
            <g transform="translate(46 -78) rotate(24)">
              <path d="M0 0Q-30 -32 -37 -8Q-30 11 0 0Q28 -26 32 -5Q24 14 0 0" fill="#b87687" />
              <circle r="7" fill="#efc998" />
            </g>
          </g>
        </g>
      </g>
    </>
  );
}

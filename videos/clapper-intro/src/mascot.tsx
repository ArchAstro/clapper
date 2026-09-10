export const C = { paper: "#fff4dc", ink: "#202928", lime: "#d9fc63", orange: "#ff6848", purple: "#b7a0f5" };
export const bounce = (frame: number) => -Math.abs(Math.sin(frame / 6)) * 28;
export function Mascot({
  frame = 0,
  x = 0,
  y = 0,
  scale = 1,
  tilt = 0,
  party = true,
  height = 28,
  lid,
  beat,
  energy = 1,
}: {
  frame?: number;
  x?: number;
  y?: number;
  scale?: number;
  tilt?: number;
  party?: boolean;
  height?: number;
  lid?: number;
  beat?: number;
  energy?: number;
}) {
  const phase = beat === undefined ? frame / 6 : beat * Math.PI;
  const motion = party ? energy : 0;
  const hop = -Math.abs(Math.sin(phase)) * height * motion,
    step = Math.sin(phase) * motion,
    clap =
      lid ??
      12 +
        ((beat === undefined
          ? Math.max(0, Math.sin(frame / 7)) * 22
          : Math.max(0, Math.sin(beat * Math.PI * 2)) * 22) -
          12) *
          motion;
  return (
    <g
      transform={`translate(${x} ${y + hop}) rotate(${tilt + (party ? step * 4 : 0)}) scale(${scale})`}
      stroke={C.ink}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g fill="none">
        <path d={`M-85 122Q-98 ${167 + step * 8} -135 170L-157 167`} />
        <path d={`M85 122Q95 ${166 - step * 8} 130 170L154 165`} />
        <path d={`M-154 30Q-216 ${55 - 80 * motion + step * 24} -220 8`} />
        <path d={`M154 30Q211 ${55 - 95 * motion - step * 24} 229 -7`} />
      </g>
      <path d="M-161 161L-113 164L-113 179L-165 179Z" fill={C.ink} />
      <path d="M110 163L157 158L165 176L110 180Z" fill={C.ink} />
      <rect x="-160" y="-68" width="320" height="196" rx="24" fill={C.orange} />
      <path d="M-145 -45H143M-145 107H145" strokeWidth="3" opacity=".28" />
      <g transform={`translate(-153 -67) rotate(${-clap})`}>
        <rect x="-7" y="-55" width="320" height="57" rx="10" fill={C.paper} />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${13 + i * 62} -53L${43 + i * 62} -53L${9 + i * 62} 0L${-7 + i * 62} 0V-21Z`}
            fill={C.ink}
            stroke="none"
          />
        ))}
        <circle r="10" fill={C.purple} />
      </g>
      <ellipse cx="-52" cy="13" rx="31" ry="37" fill={C.paper} />
      <ellipse cx="52" cy="13" rx="31" ry="37" fill={C.paper} />
      <ellipse cx={-48 + step * 3} cy="18" rx="10" ry="16" fill={C.ink} stroke="none" />
      <ellipse cx={56 + step * 3} cy="18" rx="10" ry="16" fill={C.ink} stroke="none" />
      <path d="M-28 69Q0 98 28 69" fill="none" strokeWidth="6" />
      <path d="M-119 48L-94 53M96 53L121 48" stroke="#c2392a" strokeWidth="8" />
    </g>
  );
}
export function Star({
  x,
  y,
  r = 55,
  color = C.lime,
  rotate = 0,
}: {
  x: number;
  y: number;
  r?: number;
  color?: string;
  rotate?: number;
}) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    return `${Math.cos(a) * (i % 2 ? r * 0.56 : r)},${Math.sin(a) * (i % 2 ? r * 0.56 : r)}`;
  }).join(" ");
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <polygon points={points} fill={color} stroke={C.ink} strokeWidth="5" />
      <path
        d="M-16 -4V5M16 -4V5M-10 18Q0 25 10 18"
        fill="none"
        stroke={C.ink}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

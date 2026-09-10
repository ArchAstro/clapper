type P = [number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const blend = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const FUR = { fox: ["#d98043", "#f3dfb7"], raccoon: ["#a8a4a0", "#e2dccc"], bear: ["#80583d", "#b38b61"] };
function Arm({ a, b, c, color }: { a: P; b: P; c: P; color: string }) {
  return (
    <>
      <path d={`M${a}Q${b} ${c}`} fill="none" stroke="#20252a" strokeWidth="33" strokeLinecap="round" />
      <path d={`M${a}Q${b} ${c}`} fill="none" stroke={color} strokeWidth="25" strokeLinecap="round" />
      <ellipse cx={c[0]} cy={c[1]} rx="17" ry="20" fill={color} stroke="#24272a" strokeWidth="3" />
    </>
  );
}

function Head({ animal, nod, blink }: { animal: keyof typeof FUR; nod: number; blink: boolean }) {
  const [color, cream] = FUR[animal],
    fox = animal === "fox",
    bear = animal === "bear";
  return (
    <g transform={`translate(0 -125) rotate(${nod})`}>
      {bear ? (
        [-50, 50].map((x) => (
          <g key={x}>
            <circle cx={x} cy="-55" r="28" fill={color} stroke="#23282b" strokeWidth="4" />
            <circle cx={x} cy="-55" r="15" fill="#c4936e" />
          </g>
        ))
      ) : (
        <path
          d="M-58 -11L-68 -93Q-37 -96 -15 -53L21 -53Q41 -90 68 -92L57 -8Z"
          fill={color}
          stroke="#23282b"
          strokeWidth="4"
        />
      )}
      <path
        d={
          fox
            ? "M-68 -27Q-76 -70 -26 -75Q41 -88 68 -42Q82 -6 48 31L0 60L-49 28Z"
            : "M-67 -33Q-58 -87 0 -78Q69 -86 70 -27Q76 45 0 54Q-71 46 -67 -33Z"
        }
        fill={color}
        stroke="#23282b"
        strokeWidth="4"
      />
      {fox ? (
        <path d="M-61 -10Q-22 -9 0 24Q25 -8 64 -10Q45 39 0 53Q-44 36 -61 -10Z" fill={cream} />
      ) : (
        <ellipse cy="21" rx="41" ry="30" fill={cream} />
      )}
      {animal === "raccoon" && (
        <path d="M-66 -22Q-23 -40 0 -14Q28 -40 67 -21L58 5Q22 20 0 -3Q-30 19 -61 3Z" fill="#353b3e" />
      )}
      {[-28, 28].map((x, i) => (
        <g key={x}>
          {blink ? (
            <path d={`M${x - 9} -13Q${x} -7 ${x + 9} -13`} stroke="#22272a" strokeWidth="5" fill="none" />
          ) : (
            <>
              <ellipse cx={x} cy="-13" rx="8" ry="11" fill={animal === "raccoon" ? "#e9d79f" : "#20282a"} />
              {animal !== "raccoon" && <circle cx={x + 2} cy="-16" r="2.5" fill="#fff0c8" />}
            </>
          )}
        </g>
      ))}
      <path d="M-11 19Q0 11 11 19L0 29Z" fill="#23282b" />
      <path d="M0 29Q6 43 19 35" fill="none" stroke="#4c3931" strokeWidth="3" strokeLinecap="round" />
      {fox && (
        <>
          <path d="M-64 -26Q0 -58 66 -23" fill="none" stroke="#3a3332" strokeWidth="14" />
          <path d="M-3 -38L2 -24" stroke="#dbb16d" strokeWidth="7" />
          <path d="M57 -22L94 -1L77 -1L94 24" fill="none" stroke="#c06551" strokeWidth="10" />
        </>
      )}
      {bear && (
        <>
          <path d="M-68 -36Q0 -110 68 -36" fill="none" stroke="#1b2429" strokeWidth="12" />
          <rect
            x="-79"
            y="-44"
            width="21"
            height="43"
            rx="8"
            fill="#d2a249"
            stroke="#282e30"
            strokeWidth="4"
          />
          <rect
            x="59"
            y="-44"
            width="21"
            height="43"
            rx="8"
            fill="#d2a249"
            stroke="#282e30"
            strokeWidth="4"
          />
        </>
      )}
    </g>
  );
}

function Guitar({ bass = false }: { bass?: boolean }) {
  return (
    <g transform="translate(-7 82) rotate(-28)">
      <path
        d="M-42 -67Q-14 -78 3 -45Q23 -54 34 -34L45 37Q55 65 17 78Q-7 53 -32 73Q-69 66 -72 38Q-87 6 -61 -10Q-51 -19 -59 -39Q-64 -57 -42 -67Z"
        fill={bass ? "#619895" : "#dc9c47"}
        stroke="#24272b"
        strokeWidth="5"
      />
      <path d="M-45 -37Q-10 -52 16 -24L24 35Q8 42 -12 21Q-23 7 -45 18Z" fill={bass ? "#c1cfb6" : "#49372d"} />
      <rect
        x="3"
        y="-14"
        width={bass ? "205" : "182"}
        height="29"
        rx="3"
        fill="#815b3b"
        stroke="#262b2d"
        strokeWidth="4"
      />
      <path
        d={bass ? "M197 -19L245 -24L253 -5L204 16Z" : "M176 -19L218 -25L230 -5L187 18Z"}
        fill="#bb935e"
        stroke="#272b2c"
        strokeWidth="4"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${14 + i * 13} -13V14`} stroke="#d5c194" strokeWidth="2" />
      ))}
      {Array.from({ length: bass ? 4 : 6 }, (_, i) => (
        <path
          key={i}
          d={`M-46 ${-7 + i * (bass ? 5 : 3)}L${bass ? 239 : 215} ${-7 + i * (bass ? 5 : 3)}`}
          stroke="#ebe3c0"
          strokeWidth=".8"
          opacity=".7"
        />
      ))}
      <rect x="-47" y="-16" width="10" height="35" fill="#bbb5a4" />
      <circle cx="3" cy="54" r="7" fill="#e8d8a5" stroke="#2d3131" strokeWidth="2" />
      <circle cx="-21" cy="56" r="6" fill="#e8d8a5" />
      <path d="M-40 72Q-58 120 -108 176" fill="none" stroke="#20272b" strokeWidth="5" />
    </g>
  );
}

export function Player({
  animal,
  x,
  y,
  beat,
  hit,
  pitch,
  solo = false,
  frame,
}: {
  animal: "fox" | "raccoon";
  x: number;
  y: number;
  beat: number;
  hit: number;
  pitch: number;
  solo?: boolean;
  frame: number;
}) {
  const bass = animal === "raccoon",
    mirror = bass ? -1 : 1,
    color = FUR[animal][0];
  const bounce = Math.sin(beat * Math.PI * 2) * 5 + hit * 4,
    lean = Math.sin((beat * Math.PI) / 4) * (solo ? 8 : 3);
  const fret = Math.max(45, Math.min(148, 145 - (pitch - (bass ? 40 : 52)) * 4));
  return (
    <g transform={`translate(${x} ${y + bounce}) scale(${mirror} 1) rotate(${lean})`}>
      <path
        d={
          bass
            ? "M43 91Q169 49 145 -39Q104 -80 91 -25Q131 23 53 38"
            : "M-42 74Q-156 114 -196 27Q-145 19 -137 -37Q-75 -15 -83 31Z"
        }
        fill={bass ? "#858f8e" : "#c27742"}
        stroke="#20272a"
        strokeWidth="5"
      />
      {bass &&
        [0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${105 + i * 8} ${55 - i * 29}Q166 ${36 - i * 27} ${138 - i * 5} ${14 - i * 26}`}
            stroke="#3a4547"
            strokeWidth="18"
            fill="none"
          />
        ))}
      {!bass && <path d="M-196 27Q-165 22 -154 1Q-139 32 -126 38Q-147 83 -178 58Z" fill="#ead8b6" />}
      <path
        d="M-37 90L-53 224L-89 243L-30 244L-4 128L22 231L9 244L71 244L53 219L38 88Z"
        fill="#34434b"
        stroke="#1e282e"
        strokeWidth="5"
      />
      <path
        d="M-90 240L-89 256L-26 256L-24 240M7 240L8 257L73 257L70 240"
        fill="#ddd3b4"
        stroke="#242c2f"
        strokeWidth="4"
      />
      <path
        d="M-49 -67Q-72 -23 -54 104Q0 134 56 103Q71 -23 48 -67Z"
        fill={bass ? "#9d635e" : "#274951"}
        stroke="#222b2d"
        strokeWidth="5"
      />
      <path d="M-45 -54L-24 92L16 118L-13 -69Z" fill="#dcaa65" stroke="#2d302c" strokeWidth="3" />
      {!bass && <path d="M22 -26L29 -7L49 -7L33 5L39 26L22 14L5 26L12 5L-4 -7L16 -7Z" fill="#d6cba4" />}
      <Head
        animal={animal}
        nod={Math.sin(beat * Math.PI) * (solo ? 10 : 5) - hit * 5}
        blink={frame % 173 > 167}
      />
      <Guitar bass={bass} />
      <Arm a={[-47, -43]} b={[-72, 64]} c={[fret, 82 - fret * 0.53]} color={color} />
      <Arm a={[49, -40]} b={[91, 32]} c={[-12, 80 + hit * 22]} color={color} />
      {hit > 0.2 &&
        [0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${-39 - i * 7} ${87 + i * 9}L${-48 - i * 9} ${101 + i * 10}`}
            stroke="#f6cb75"
            strokeWidth="2"
            opacity={hit * 0.7}
          />
        ))}
    </g>
  );
}

export function Drummer({
  beat,
  kick,
  snare,
  hat,
  crash,
  tomHigh,
  tomLow,
  frame,
}: {
  beat: number;
  kick: number;
  snare: number;
  hat: number;
  crash: number;
  tomHigh: number;
  tomLow: number;
  frame: number;
}) {
  const relax = clamp((beat - 74) / 1.5),
    shake = Math.sin(Math.min(beat, 74) * Math.PI * 2) * 3 * (1 - relax);
  const crashMove = clamp(crash * 2),
    tomMove = clamp(Math.max(tomHigh, tomLow) * 1.8);
  const target = crashMove > 0.1 ? "crash" : tomMove > 0.1 ? "tom" : "snare",
    amount = target === "crash" ? crashMove : target === "tom" ? tomMove : snare;
  const tomX = tomHigh >= tomLow ? 67 : -79;
  const rHandTarget: P = target === "crash" ? [160, -110] : target === "tom" ? [tomX + 40, -35] : [-102, 19];
  const rTipTarget: P = target === "crash" ? [225, -91] : target === "tom" ? [tomX, 34] : [-153, 94];
  const rh = blend(blend([30, -105], rHandTarget, amount), [100, 62], relax),
    rt = blend(blend([60, -187], rTipTarget, amount), [131, 134], relax);
  // A simultaneous final crash/snare uses the other hand; kick is foot-driven.
  const cross = target === "crash" ? snare : 0;
  const lh = blend(blend([-140, -133 + hat * 62], [-110, 20], cross), [-95, 62], relax),
    lt = blend(blend([-216, -150 + hat * 102], [-153, 94], cross), [-126, 135], relax);
  return (
    <g transform={`translate(960 ${548 + shake})`}>
      <path d="M-59 -65Q-88 12 -58 139H64Q86 17 60 -65Z" fill="#525945" stroke="#222a2c" strokeWidth="5" />
      <Head animal="bear" nod={-5 + kick * 7} blink={frame % 199 > 193} />
      <Arm a={[-60, -31]} b={[-116, -30 + cross * 45 + relax * 50]} c={lh} color="#886044" />
      <Arm a={[59, -31]} b={[97 - snare * 45, -28 + snare * 75 + relax * 50]} c={rh} color="#886044" />
      <path d={`M${lh}L${lt}M${rh}L${rt}`} stroke="#e9c88b" strokeWidth="8" strokeLinecap="round" />
      <g stroke="#6c7774" strokeWidth="5" fill="none">
        <path d="M-216 -39V282M-216 227L-255 282M-216 227L-180 282M225 -82V275M225 216L184 275M225 216L259 275" />
      </g>
      <g transform={`translate(-216 -48) rotate(${hat * 5})`}>
        <ellipse rx="79" ry="13" fill="#c6a25b" stroke="#6a5a3f" strokeWidth="3" />
        <ellipse cy="-5" rx="22" ry="8" fill="#e4c681" />
      </g>
      <g transform={`translate(225 -91) rotate(${Math.sin(frame * 1.2) * crash * 7})`}>
        <ellipse rx="102" ry="17" fill="#d3ad61" stroke="#75603a" strokeWidth="3" />
        <ellipse cy="-8" rx="23" ry="10" fill="#ecd499" />
        <path d="M-75 1Q0 17 75 1" stroke="#f4d487" fill="none" />
      </g>
      {[-79, 67].map((x, i) => (
        <g key={x} transform={`translate(${x} 34) rotate(${i ? 12 : -12})`}>
          <rect
            x="-58"
            y="-8"
            width="116"
            height="86"
            rx="10"
            fill="#9b5b43"
            stroke="#252e30"
            strokeWidth="5"
          />
          <ellipse rx="59" ry="25" fill="#e7dbbd" stroke="#8c9690" strokeWidth="6" />
          <path d="M-46 10V66M46 10V66" stroke="#b9b7a3" strokeWidth="7" />
        </g>
      ))}
      <g transform={`translate(0 163) scale(${1 + kick * 0.025})`}>
        <circle r="105" fill="#a86449" stroke="#243033" strokeWidth="9" />
        <circle r="91" fill="#263f44" stroke="#b1b4a1" strokeWidth="5" />
        <circle r="79" fill="none" stroke="#75908d" strokeWidth="2" opacity=".4" />
        <path d="M-29 -7L0 -47L29 -7L0 12Z M-25 13L0 45L25 13" fill="#ddb570" />
        <circle cx="47" cy="52" r="20" fill="#182c32" />
        <path d="M-80 72L-113 131M80 72L113 131" stroke="#697d7b" strokeWidth="7" />
      </g>
      <g transform={`translate(-153 ${94 - snare * 4})`}>
        <path d="M-59 0V42Q0 65 59 42V0" fill="#657d7e" stroke="#273333" strokeWidth="4" />
        <ellipse rx="61" ry="19" fill="#e8dec6" stroke="#b6b5a4" strokeWidth="5" />
        <path d="M0 48V187M0 150L-32 190M0 150L32 190" stroke="#8d9994" strokeWidth="5" />
      </g>
    </g>
  );
}

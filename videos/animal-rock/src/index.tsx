import { Composition, defineScenes, registerRoot, useFrame } from "@archastro/clapper-core";
import { ScoreAudio } from "@archastro/clapper-core/music";
import { compileScore, secondsToBeat } from "@archastro/clapper-music";
import { Drummer, Player } from "./band";
import { score } from "./score";

const compiled = compileScore(score),
  fps = 30,
  at = (b: number) => Math.round(((b * 60) / 112) * fps);
const scenes = defineScenes(
  {
    count: { frames: at(4) },
    riff: { frames: at(20) - at(4) },
    chorus: { frames: at(36) - at(20) },
    solo: { frames: at(52) - at(36) },
    break: { frames: at(60) - at(52) },
    last: { frames: Math.ceil(compiled.durationSeconds * fps) - at(60) },
  },
  { fps },
);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
function Film() {
  const frame = useFrame(),
    seconds = frame / fps,
    beat = secondsToBeat(seconds, compiled),
    ended = beat >= 72;
  const hit = (id: string, keys?: number[]) =>
    Math.max(
      0,
      ...compiled.tracks
        .find((t) => t.id === id)!
        .notes.filter(
          (n) => (!keys || keys.includes(n.midi)) && seconds >= n.seconds && seconds - n.seconds < 0.22,
        )
        .map((n) => (Math.exp(-(seconds - n.seconds) * 18) * n.velocity) / 127),
    );
  const pitch = (id: string) =>
    [...compiled.tracks.find((t) => t.id === id)!.notes].reverse().find((n) => n.seconds <= seconds)?.midi ??
    52;
  const kick = hit("drums", [36]),
    snare = hit("drums", [38]),
    hat = hit("drums", [42, 46]),
    crash = hit("drums", [49]),
    tomHigh = hit("drums", [47]),
    tomLow = hit("drums", [45]);
  const solo = beat >= 36 && beat < 52,
    breakdown = beat >= 52 && beat < 60;
  const soloMix = ease((beat - 35.5) / 1) * (1 - ease((beat - 51.5) / 1));
  const fade = 1 - clamp((seconds - compiled.durationSeconds + 1.4) / 1.4) * 0.38;
  const camera = 1 + 0.014 * Math.sin(Math.min(1, beat / 76) * Math.PI) + soloMix * 0.035;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#101b23", overflow: "hidden" }}>
      <ScoreAudio score={score} />
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, opacity: fade }}
      >
        <defs>
          <linearGradient id="wall" x2="0" y2="1">
            <stop stopColor="#172d37" />
            <stop offset="1" stopColor="#314248" />
          </linearGradient>
          <linearGradient id="wood" x2="0" y2="1">
            <stop stopColor="#9a7552" />
            <stop offset="1" stopColor="#493e35" />
          </linearGradient>
          <radialGradient id="amber">
            <stop stopColor="#f8b849" stopOpacity=".35" />
            <stop offset="1" stopColor="#e19040" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cyan">
            <stop stopColor="#7ed6ce" stopOpacity=".3" />
            <stop offset="1" stopColor="#55a9ad" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="shade">
            <stop offset=".48" stopColor="#0c1820" stopOpacity="0" />
            <stop offset="1" stopColor="#07121a" stopOpacity=".7" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#wall)" />
        {Array.from({ length: 12 }, (_, r) => (
          <g key={r} stroke="#0c2028" opacity=".27" strokeWidth="4">
            <path d={`M0 ${r * 68}H1920`} />
            {Array.from({ length: 12 }, (_, c) => (
              <path key={c} d={`M${c * 190 + (r % 2 ? 95 : 0)} ${r * 68}V${r * 68 + 68}`} />
            ))}
          </g>
        ))}
        <rect
          x="356"
          y="80"
          width="1208"
          height="200"
          rx="9"
          fill="#112832"
          stroke="#57736e"
          strokeWidth="5"
        />
        <rect x="378" y="101" width="1164" height="158" rx="3" fill="none" stroke="#c39158" strokeWidth="2" />
        <text
          x="960"
          y="181"
          textAnchor="middle"
          fontFamily="Georgia,serif"
          fontSize="70"
          fontWeight="bold"
          letterSpacing="9"
          fill="#e8bd7c"
        >
          THE WILD HOURS
        </text>
        <text
          x="960"
          y="229"
          textAnchor="middle"
          fontFamily="Arial,sans-serif"
          fontSize="17"
          letterSpacing="7"
          fill="#8fb9b2"
        >
          AFTER CLOSING · LIVE SESSION 02
        </text>
        <g opacity={breakdown ? 0.18 : 0.7}>
          <path d="M290 42L111 872L950 872L418 42Z" fill="url(#amber)" />
          <path d="M1600 40L975 874L1838 874L1710 40Z" fill="url(#cyan)" />
          <ellipse
            cx={960 - soloMix * 480}
            cy="540"
            rx="610"
            ry="580"
            fill="url(#amber)"
            opacity={0.5 + kick * 0.25}
          />
        </g>
        <path d="M0 795Q960 759 1920 795V1080H0Z" fill="url(#wood)" />
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={`M${i * 140 - 160} 780L${i * 225 - 620} 1080`}
            stroke="#241f21"
            strokeWidth="3"
            opacity=".32"
          />
        ))}
        <path d="M0 871H1920M0 967H1920" stroke="#c69d6e" strokeWidth="3" opacity=".15" />
        <g transform="translate(655 763)">
          <path d="M0 0L80 -62H544L620 0V55H0Z" fill="#463d35" stroke="#252d2e" strokeWidth="5" />
          <path d="M0 6H620" stroke="#c1955e" strokeWidth="3" />
        </g>
        {[120, 1655].map((x) => (
          <g key={x} transform={`translate(${x} 575)`}>
            <rect width="170" height="243" rx="8" fill="#1b292e" stroke="#9c8660" strokeWidth="5" />
            <rect x="13" y="40" width="144" height="185" fill="#3c4542" />
            <path d="M20 80H149M20 121H149M20 162H149M20 201H149" stroke="#252f30" strokeWidth="6" />
            <circle cx="126" cy="21" r="6" fill="#d7a665" />
            <circle cx="96" cy="21" r="5" fill="#baab87" />
            <text x="27" y="26" fontFamily="Arial" fontSize="11" letterSpacing="2" fill="#c5b99e">
              HOWL
            </text>
          </g>
        ))}
        <g transform={`translate(960 830) scale(${camera}) translate(-960 -830)`}>
          <Drummer
            beat={beat}
            kick={kick}
            snare={Math.min(1, snare * 1.6)}
            hat={Math.min(1, hat * 2.5)}
            crash={crash}
            tomHigh={tomHigh}
            tomLow={tomLow}
            frame={frame}
          />
          <ellipse cx="480" cy="925" rx="161" ry="20" fill="#151e22" opacity=".3" />
          <ellipse cx="1440" cy="925" rx="155" ry="20" fill="#151e22" opacity=".3" />
          <Player
            animal="fox"
            x={480}
            y={657}
            beat={Math.min(beat, 74)}
            hit={hit("guitar")}
            pitch={pitch("guitar")}
            solo={solo}
            frame={frame}
          />
          <Player
            animal="raccoon"
            x={1440}
            y={657}
            beat={Math.min(beat, 74)}
            hit={hit("bass")}
            pitch={pitch("bass")}
            frame={frame}
          />
        </g>
        <g stroke="#526765" strokeWidth="6" fill="none">
          <path d="M356 547V950M356 899L312 965M356 899L401 965M356 547L414 511" />
          <path d="M414 511Q348 581 356 923Q650 1014 980 966" stroke="#17282c" strokeWidth="4" />
        </g>
        <rect
          x="387"
          y="497"
          width="54"
          height="22"
          rx="11"
          fill="#8e9690"
          stroke="#28383d"
          strokeWidth="4"
          transform="rotate(-20 414 508)"
        />
        <path d="M0 42Q500 105 960 35Q1450 105 1920 42" stroke="#1a262b" strokeWidth="6" fill="none" />
        {Array.from({ length: 15 }, (_, i) => (
          <g key={i}>
            <circle
              cx={30 + i * 133}
              cy={49 + 25 * Math.sin(i * 0.5)}
              r="13"
              fill="#e8be73"
              opacity=".45"
              filter="url(#glow)"
            />
            <circle cx={30 + i * 133} cy={49 + 25 * Math.sin(i * 0.5)} r="5" fill="#ffe2a6" />
          </g>
        ))}
        <rect width="1920" height="1080" fill="url(#shade)" />
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 120,
          right: 120,
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          fontFamily: "Arial,sans-serif",
          color: "#e2c697",
        }}
      >
        <div data-copy="" style={{ fontSize: 14, letterSpacing: 3, opacity: 0.85 }}>
          FOX · GUITAR&nbsp;&nbsp; / &nbsp;&nbsp;BEAR · DRUMS&nbsp;&nbsp; / &nbsp;&nbsp;RACCOON · BASS
        </div>
        <div
          data-copy=""
          style={{
            fontFamily: "Georgia,serif",
            fontSize: ended ? 30 : 21,
            fontStyle: "italic",
            opacity: 0.8,
          }}
        >
          {ended
            ? "one more?"
            : solo
              ? "let the fox cook."
              : breakdown
                ? "hold that thought…"
                : "an original midnight jam"}
        </div>
      </div>
    </div>
  );
}
registerRoot(() => (
  <Composition id="animal-rock" component={Film} width={1920} height={1080} fps={fps} scenes={scenes} />
));

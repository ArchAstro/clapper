import { Composition, defineScenes, registerRoot, useFrame } from "@archastro/clapper-core";
import { ScoreAudio } from "@archastro/clapper-core/music";
import { compileScore, secondsToBeat, ticksToSeconds } from "@archastro/clapper-music";
import { Cat } from "./cat";
import { score } from "./score";

const compiled = compileScore(score),
  fps = 30;
const frameAt = (beat: number) => Math.round(ticksToSeconds(beat * compiled.ppq, compiled.tempos) * fps);
const PLAN = defineScenes(
  {
    curtain: { frames: frameAt(6) },
    pas: { frames: frameAt(30) - frameAt(6) },
    pirouette: { frames: frameAt(54) - frameAt(30) },
    flight: { frames: frameAt(69) - frameAt(54) },
    reverence: { frames: Math.ceil(compiled.durationSeconds * fps) - frameAt(69) },
  },
  { fps },
);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
function Film() {
  const frame = useFrame(),
    seconds = frame / fps,
    beat = Math.min(73, secondsToBeat(seconds, compiled));
  const curtain = clamp(beat / 5),
    intro = 1 - clamp((beat - 5) / 3),
    end = clamp((beat - 69) / 2);
  const zoom = 1 + 0.035 * Math.sin(Math.min(1, beat / 73) * Math.PI);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#142a32", overflow: "hidden" }}>
      <ScoreAudio score={score} />
      <svg viewBox="0 0 1920 1080" width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="backdrop" x2="0" y2="1">
            <stop stopColor="#122732" />
            <stop offset=".7" stopColor="#30484b" />
            <stop offset="1" stopColor="#8f8870" />
          </linearGradient>
          <radialGradient id="spotlight">
            <stop stopColor="#ffe6b5" stopOpacity=".3" />
            <stop offset="1" stopColor="#e5bc74" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="floor" x2="0" y2="1">
            <stop stopColor="#af997b" />
            <stop offset="1" stopColor="#756754" />
          </linearGradient>
          <linearGradient id="velvet">
            <stop stopColor="#2e263b" />
            <stop offset=".45" stopColor="#644251" />
            <stop offset=".75" stopColor="#412e43" />
            <stop offset="1" stopColor="#251f31" />
          </linearGradient>
          <linearGradient id="cat-fur" x1="0" x2="1" y2=".4">
            <stop stopColor="#e2ccaa" />
            <stop offset=".45" stopColor="#fff1d6" />
            <stop offset="1" stopColor="#eddabc" />
          </linearGradient>
          <linearGradient id="bodice" x2="1" y2="1">
            <stop stopColor="#d79da6" />
            <stop offset="1" stopColor="#a56177" />
          </linearGradient>
          <filter id="shadow">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <radialGradient id="vignette">
            <stop offset=".5" stopColor="#051018" stopOpacity="0" />
            <stop offset="1" stopColor="#07151d" stopOpacity=".65" />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#backdrop)" />
        <path d="M500 -30L80 930L1610 930L1050 -30Z" fill="url(#spotlight)" />
        <ellipse cx="960" cy="565" rx="740" ry="580" fill="url(#spotlight)" />
        <g opacity=".14" fill="none" stroke="#ead3a0" strokeWidth="2">
          <path d="M420 840V350Q420 95 960 95Q1500 95 1500 350V840" />
          <path d="M444 840V358Q444 123 960 123Q1476 123 1476 358V840" />
          <path d="M610 825V413Q610 226 960 226Q1310 226 1310 413V825" />
          <path d="M940 112L960 83L980 112L960 141Z" />
        </g>
        {Array.from({ length: 35 }, (_, i) => (
          <circle
            key={i}
            cx={330 + ((i * 173) % 1300) + Math.sin(seconds * 0.25 + i) * 10}
            cy={160 + ((i * 83) % 615) - Math.sin(seconds * 0.4 + i) * 13}
            r={i % 3 === 0 ? 2 : 1}
            fill="#ffe7ba"
            opacity={0.12 + 0.16 * (0.5 + 0.5 * Math.sin(seconds + i))}
          />
        ))}
        <path d="M0 842Q960 793 1920 842V1080H0Z" fill="url(#floor)" />
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={`M${960 + (i - 8) * 95} 817L${960 + (i - 8) * 230} 1080`}
            stroke="#473d36"
            strokeWidth="2"
            opacity=".17"
          />
        ))}
        <path
          d="M0 923Q960 875 1920 923M0 1005Q960 961 1920 1005"
          fill="none"
          stroke="#d5bd99"
          opacity=".18"
        />
        <ellipse cx="960" cy="880" rx="520" ry="70" fill="#f4dcb1" opacity=".13" />
        <g transform={`translate(960 850) scale(${zoom}) translate(-960 -850)`}>
          <Cat beat={beat} frame={frame} />
        </g>
        {[0, 1].map((side) => (
          <g key={side} transform={side ? "translate(1920 0) scale(-1 1)" : ""}>
            <path
              d={`M0 0H${270 + (1 - curtain) * 310}Q${350 + (1 - curtain) * 310} 290 200 630Q142 807 140 966L0 1050Z`}
              fill="url(#velvet)"
            />
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={`M${36 + i * 49} 0Q${67 + i * 62} 350 ${37 + i * 25} 913`}
                fill="none"
                stroke={i % 2 ? "#906072" : "#171c2b"}
                strokeWidth={i % 2 ? 7 : 14}
                opacity=".3"
              />
            ))}
            <path d="M14 643Q80 698 179 626" fill="none" stroke="#c5a56a" strokeWidth="9" />
            <path d="M168 638Q183 700 156 726" fill="none" stroke="#c5a56a" strokeWidth="5" />
          </g>
        ))}
        <path d="M0 0H1920V61Q1590 211 1270 69Q960 190 650 69Q350 211 0 61Z" fill="url(#velvet)" />
        <path
          d="M0 61Q350 211 650 69Q960 190 1270 69Q1590 211 1920 61"
          fill="none"
          stroke="#bc9c67"
          strokeWidth="5"
        />
        <rect width="1920" height="1080" fill="url(#vignette)" pointerEvents="none" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 205,
          top: 175,
          color: "#f2dec0",
          opacity: intro,
          fontFamily: "Georgia,serif",
        }}
      >
        <div
          data-copy=""
          style={{
            fontFamily: "Arial,sans-serif",
            fontSize: 16,
            letterSpacing: 5,
            marginBottom: 23,
            color: "#c6ac86",
          }}
        >
          CLAPPER BALLET · ÉTUDE 01
        </div>
        <div data-copy="" style={{ fontSize: 76, letterSpacing: -2 }}>
          Pas de Chat
        </div>
        <div data-copy="" style={{ fontStyle: "italic", fontSize: 24, marginTop: 18, color: "#cbbca2" }}>
          a waltz for small paws
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 55,
          textAlign: "center",
          color: "#f1dec0",
          fontFamily: "Georgia,serif",
          opacity: end,
        }}
      >
        <div data-copy="" style={{ fontSize: 31, letterSpacing: 10 }}>
          F I N
        </div>
        <div data-copy="" style={{ fontSize: 15, letterSpacing: 2, marginTop: 12, color: "#cdbb9c" }}>
          ORIGINAL SCORE & CHOREOGRAPHY · COMPOSED IN CODE
        </div>
      </div>
    </div>
  );
}
registerRoot(() => (
  <Composition id="cat-ballet" component={Film} width={1920} height={1080} fps={fps} scenes={PLAN} />
));

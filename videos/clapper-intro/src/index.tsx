import { Composition, defineScenes, registerRoot, useFrame } from "@archastro/clapper-core";
import { ScoreAudio } from "@archastro/clapper-core/music";
import { compileScore } from "@archastro/clapper-music";
import type { CSSProperties, ReactNode } from "react";
import { bounce, C, Mascot, Star } from "./mascot";
import { phrases, score } from "./score";
import "../../intern-promo/src/fonts/fonts.css";

const PLAN = defineScenes(
  {
    hello: { seconds: 4 },
    code: { seconds: 6 },
    music: { seconds: 6 },
    scrub: { seconds: 4 },
    crew: { seconds: 5 },
  },
  { fps: 30 },
);
const compiled = compileScore(score);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
const css: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  fontFamily: '"Schibsted Grotesk",Arial,sans-serif',
  color: C.ink,
  background: C.paper,
};
function Label({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-copy=""
      style={{ fontFamily: '"Fragment Mono",monospace', fontSize: 23, letterSpacing: 2, ...style }}
    >
      {children}
    </div>
  );
}
function Title({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-copy=""
      style={{ fontWeight: 800, fontSize: 108, letterSpacing: -6, lineHeight: 1.04, ...style }}
    >
      {children}
    </div>
  );
}
function Paper() {
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: 0.17 }}>
      <defs>
        <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.15" fill="#756c50" />
        </pattern>
      </defs>
      <rect width="1920" height="1080" fill="url(#dots)" />
    </svg>
  );
}
function Badge({
  text,
  x,
  y,
  color = C.lime,
  rotate = -5,
}: {
  text: string;
  x: number;
  y: number;
  color?: string;
  rotate?: number;
}) {
  return (
    <div
      data-copy=""
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rotate}deg)`,
        background: color,
        border: `3px solid ${C.ink}`,
        borderRadius: 40,
        padding: "15px 28px",
        fontSize: 24,
        fontWeight: 700,
        boxShadow: `5px 6px 0 ${C.ink}`,
      }}
    >
      {text}
    </div>
  );
}
function SceneTag({ n, text }: { n: string; text: string }) {
  return (
    <Label style={{ position: "absolute", left: 108, top: 69 }}>
      CLAPPER / {n} <span style={{ marginLeft: 24, opacity: 0.58 }}>{text}</span>
    </Label>
  );
}
function Cast({
  f,
  x = 1300,
  y = 660,
  s = 0.9,
  height = 28,
}: {
  f: number;
  x?: number;
  y?: number;
  s?: number;
  height?: number;
}) {
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
      <ellipse cx={x} cy={y + 165 * s} rx={240 * s} ry={22 * s} fill={C.ink} opacity=".12" />
      <Mascot x={x} y={y} scale={s} frame={f} height={height} />
      <Star x={x - 300 * s} y={y + 60 + bounce(f + 9)} r={75 * s} rotate={Math.sin(f / 17) * 12} />
      <g transform={`translate(${x + 270 * s} ${y + 70 + bounce(f + 16)}) rotate(${Math.sin(f / 17) * 9})`}>
        <rect
          x={-65 * s}
          y={-65 * s}
          width={130 * s}
          height={130 * s}
          rx={28 * s}
          fill={C.purple}
          stroke={C.ink}
          strokeWidth="5"
        />
        <path
          d={`M${-22 * s} -10v16M${22 * s} -10v16M${-15 * s} 27q${15 * s} 13 ${30 * s} 0`}
          stroke={C.ink}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
function Hello({ f }: { f: number }) {
  const pop = ease(f / 17);
  const escape = ease((f - 15) / 33);
  const bow = f < 30 ? 0 : f < 47 ? ease((f - 30) / 17) * 18 : 18 * (1 - ease((f - 47) / 25));
  const lid = f < 15 ? 65 * (1 - ease(f / 15)) : f < 27 ? 0 : 12 * ease((f - 27) / 12);
  return (
    <>
      <div style={{ position: "absolute", left: 104, top: 80 }}>
        <Label>A TINY STUDIO. A BIG PERSONALITY.</Label>
        <Title style={{ fontSize: 234, letterSpacing: -14, marginTop: 30 }}>
          Clapper<span style={{ color: C.orange }}>.</span>
        </Title>
        <Title style={{ fontSize: 78, letterSpacing: -4, marginTop: 32 }}>
          Give your code
          <br />a little character.
        </Title>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path d="M1010 760Q1160 920 1770 790" stroke={C.ink} strokeWidth="4" fill="none" />
        <ellipse cx="1410" cy="849" rx="226" ry="32" fill={C.ink} opacity=".13" />
        <g transform={`translate(1410 ${616 - 55 * (1 - pop)}) scale(${0.8 + 0.35 * pop})`}>
          <Mascot
            frame={f}
            tilt={-8 + bow}
            lid={f < 72 ? lid : undefined}
            party={f >= 72}
            energy={ease((f - 72) / 18)}
          />
        </g>
        <g opacity={clamp((f - 15) / 4)}>
          <Star
            x={1410 + (1735 - 1410) * escape}
            y={616 + (313 - 616) * escape - 130 * Math.sin(escape * Math.PI)}
            r={92}
            color={C.lime}
            rotate={(1 - escape) * -160 + f * 0.2}
          />
          <Star
            x={1410 + (1115 - 1410) * escape}
            y={616 + (810 - 616) * escape - 130 * Math.sin(escape * Math.PI)}
            r={52}
            color={C.purple}
            rotate={(1 - escape) * 200 - f * 0.2}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${1230 + i * 103} ${260 + (i % 3) * 24}l${12 + i * 2} -30`}
              stroke={i % 2 ? C.orange : C.ink}
              strokeWidth="6"
              transform={`rotate(${Math.sin(f / 12 + i) * 13} ${1230 + i * 103} 260)`}
            />
          ))}
        </g>
      </svg>
      <Badge text="100% made in Clapper" x={110} y={876} />
    </>
  );
}
const codeLines = [
  "const frame = useFrame();",
  "",
  "const y = -Math.abs(",
  "  Math.sin(frame / 6)",
  ") * 28;",
  "",
  "<Mascot y={y} />",
];
function Code({ f }: { f: number }) {
  return (
    <>
      <SceneTag n="01" text="REACT → MOTION" />
      <Title style={{ position: "absolute", left: 108, top: 140 }}>Write the move.</Title>
      <div
        style={{
          position: "absolute",
          left: 108,
          top: 340,
          width: 790,
          height: 515,
          background: C.ink,
          borderRadius: 25,
          boxShadow: "10px 12px 0 #b7a0f5",
          padding: "28px 30px",
        }}
      >
        <Label style={{ color: C.paper, fontSize: 20, opacity: 0.62 }}>scene.tsx</Label>
        <div
          style={{ fontFamily: '"Fragment Mono",monospace', fontSize: 29, lineHeight: 1.66, marginTop: 27 }}
        >
          {codeLines.map((line, i) => (
            <div
              key={i}
              data-copy={line ? "" : undefined}
              style={{
                color: i === 3 ? C.lime : C.paper,
                whiteSpace: "pre",
                background: i === 3 ? "#d9fc6317" : "transparent",
                borderRadius: 7,
              }}
            >
              <span style={{ color: "#82908a", display: "inline-block", width: 42, fontSize: 20 }}>
                {i + 1}
              </span>
              {line || " "}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 993,
          top: 340,
          width: 819,
          height: 575,
          border: `4px solid ${C.ink}`,
          borderRadius: 30,
          background: C.lime,
          boxShadow: `9px 11px 0 ${C.ink}`,
        }}
      >
        <Label style={{ position: "absolute", left: 28, top: 25, fontSize: 20 }}>
          LIVE FRAME <b>{String(f + 120).padStart(3, "0")}</b>
        </Label>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 70,
            borderTop: `3px solid ${C.ink}`,
            opacity: 0.2,
          }}
        />
      </div>
      <Cast f={f + 120} x={1400} y={680} s={0.86} />
      <Badge text="Every frame is a function." x={132} y={925} color={C.paper} rotate={-2} />
      <div style={{ position: "absolute", left: 914, top: 576, fontSize: 66, fontWeight: 600 }}>→</div>
    </>
  );
}
function Music({ f }: { f: number }) {
  const global = f + 300,
    beat = global / 15,
    notes = compiled.tracks
      .find((t) => t.id === "marimba")!
      .notes.filter((n) => n.seconds >= 10 && n.seconds < 16);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.purple }} />
      <SceneTag n="02" text="NOTES → A SOUNDTRACK" />
      <Title style={{ position: "absolute", left: 108, top: 140 }}>Compose the groove.</Title>
      <div
        style={{
          position: "absolute",
          left: 108,
          top: 344,
          width: 1110,
          height: 374,
          background: C.ink,
          borderRadius: 26,
          padding: "27px 32px",
          boxShadow: `8px 10px 0 ${C.paper}`,
        }}
      >
        <Label style={{ color: C.paper, fontSize: 22 }}>ORIGINAL SCORE / 120 BPM / C MINOR</Label>
        <div
          style={{
            position: "relative",
            height: 238,
            marginTop: 25,
            background:
              "repeating-linear-gradient(0deg,transparent 0px,transparent 38px,#ffffff17 39px,#ffffff17 40px),repeating-linear-gradient(90deg,transparent 0px,transparent 85px,#ffffff17 86px,#ffffff17 87px)",
          }}
        >
          {notes.map((n, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: ((n.seconds - 10) / 6) * 1046,
                top: 190 - (n.midi - 67) * 11,
                width: Math.max(20, (n.durationSeconds / 6) * 1046),
                height: 25,
                borderRadius: 8,
                background:
                  global / 30 >= n.seconds && global / 30 < n.seconds + n.durationSeconds ? C.orange : C.lime,
                boxShadow:
                  global / 30 >= n.seconds && global / 30 < n.seconds + 0.15
                    ? `0 0 24px ${C.lime}`
                    : undefined,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: clamp(f / 180) * 1046,
              top: 0,
              bottom: 0,
              width: 4,
              background: C.paper,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 112,
          top: 770,
          fontFamily: '"Fragment Mono",monospace',
          fontSize: 30,
          lineHeight: 1.4,
        }}
      >
        <Label style={{ fontSize: 19, marginBottom: 14 }}>
          score.ts / BAR {Math.floor(beat / 4) + 1} / PLAYING NOW
        </Label>
        <div data-copy="">phrase("{phrases[Math.floor(beat / 4)]}",</div>
        <div data-copy="" style={{ paddingLeft: 40 }}>
          {"{ duration: 0.5 })"}
        </div>
        <div data-copy="" style={{ paddingLeft: 40 }}>
          .map(staccato)
        </div>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx="1533" cy="836" rx="210" ry="31" fill={C.ink} opacity=".13" />
        <Mascot x={1533} y={619} scale={1.05} frame={global} beat={beat} />
        <Star x={1745} y={340 + Math.sin(beat * Math.PI) * 16} r={70} color={C.paper} rotate={f * 0.3} />
      </svg>
      <Badge text="Real instruments. Your notes." x={1295} y={912} color={C.paper} rotate={-3} />
    </>
  );
}
function Scrub({ f }: { f: number }) {
  const play = f < 45 ? f / 45 : f < 78 ? 1 - ((f - 45) / 33) * 0.72 : 0.28 + ((f - 78) / 42) * 0.72;
  const demoFrame = Math.round(play * 90);
  const height = 28 + 68 * ease((f - 60) / 8);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.lime }} />
      <SceneTag n="03" text="PREVIEW → REFINE → RENDER" />
      <Title style={{ position: "absolute", left: 108, top: 162, fontSize: 106 }}>
        Scrub.
        <br />
        Tweak.
        <br />
        <span style={{ color: "#df492e" }}>Nailed it.</span>
      </Title>
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 585,
          width: 478,
          padding: "24px 28px",
          border: `3px solid ${C.ink}`,
          borderRadius: 20,
          background: C.paper,
          boxShadow: `6px 7px 0 ${C.ink}`,
        }}
      >
        <Label style={{ fontSize: 20, marginBottom: 13 }}>BOUNCE HEIGHT</Label>
        <div data-copy="" style={{ fontFamily: '"Fragment Mono",monospace', fontSize: 48 }}>
          28 <span style={{ color: f >= 60 ? "#df492e" : C.ink }}>→ {Math.round(height)}</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 747,
          top: 168,
          width: 1065,
          height: 610,
          background: C.paper,
          border: `4px solid ${C.ink}`,
          borderRadius: 30,
          boxShadow: `10px 11px 0 ${C.ink}`,
        }}
      >
        <Label style={{ position: "absolute", left: 29, top: 25 }}>FRAME-ACCURATE PREVIEW</Label>
      </div>
      <Cast f={demoFrame} x={1280} y={518} s={0.91} height={height} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <path
          d="M0 0L0 42L11 31L20 50L31 44L22 27L39 25Z"
          transform={`translate(${f < 60 ? 620 - (f / 60) * 185 : 435} ${f < 60 ? 810 - (f / 60) * 128 : 682})`}
          fill={C.ink}
          stroke={C.paper}
          strokeWidth="3"
        />
      </svg>
      <div style={{ position: "absolute", left: 800, top: 823, width: 953, height: 120 }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["SCENE", "MUSIC", "EXPORT"].map((label, i) => (
            <div
              key={label}
              style={{
                height: 64,
                flex: i === 0 ? 2 : 1,
                background: [C.orange, C.purple, C.paper][i],
                border: `3px solid ${C.ink}`,
                borderRadius: 10,
                padding: 15,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: play * 948,
            top: -20,
            height: 110,
            width: 4,
            background: C.ink,
          }}
        >
          <div
            style={{ width: 20, height: 20, background: C.ink, transform: "translateX(-8px) rotate(45deg)" }}
          />
        </div>
        <Label style={{ fontSize: 18, marginTop: 19 }}>
          00:{String(Math.floor(demoFrame / 30)).padStart(2, "0")}:{String(demoFrame % 30).padStart(2, "0")}{" "}
          <span style={{ float: "right" }}>PICTURE + MUSIC, IN SYNC</span>
        </Label>
      </div>
    </>
  );
}
function Crew({ f }: { f: number }) {
  return (
    <>
      <Title style={{ position: "absolute", left: 108, top: 108, fontSize: 192, letterSpacing: -11 }}>
        Clapper<span style={{ color: C.orange }}>.</span>
      </Title>
      <Title style={{ position: "absolute", left: 115, top: 360, fontSize: 76, letterSpacing: -4 }}>
        Your agent.
        <br />A whole production crew.
      </Title>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <Mascot
          x={1490}
          y={398}
          scale={0.82}
          frame={f + 600}
          beat={(f + 600) / 15}
          energy={1 - ease((f - 68) / 24)}
        />
        <Star x={1220} y={565 + bounce(f) * 0.5} r={58} rotate={Math.sin(f / 18) * 10} />
        <Star x={1736} y={210 + bounce(f + 8) * 0.5} r={63} color={C.purple} rotate={-f * 0.1} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 698,
          width: 1694,
          background: C.ink,
          color: C.paper,
          borderRadius: 24,
          padding: "30px 37px",
          boxShadow: `9px 10px 0 ${C.orange}`,
          fontFamily: '"Fragment Mono",monospace',
          fontSize: 35,
          lineHeight: 1.6,
        }}
      >
        <div data-copy="">
          <span style={{ color: C.lime }}>$</span> npx skills add ArchAstro/clapper {"\\"}
        </div>
        <div data-copy="" style={{ paddingLeft: 42, color: C.lime }}>
          --skill clapper --global
        </div>
      </div>
      <Label style={{ position: "absolute", left: 115, top: 950, fontSize: 23 }}>
        INSTALL THE SKILL. LET YOUR AGENT HANDLE THE REST.
      </Label>
    </>
  );
}
function Film() {
  const frame = useFrame(),
    scene = PLAN.at(frame)!;
  return (
    <div className="clapper-intro" style={css}>
      <style>{".clapper-intro, .clapper-intro * {box-sizing: border-box;}"}</style>
      <ScoreAudio score={score} />
      <Paper />
      {scene.name === "hello" ? (
        <Hello f={frame} />
      ) : scene.name === "code" ? (
        <Code f={frame - scene.start} />
      ) : scene.name === "music" ? (
        <Music f={frame - scene.start} />
      ) : scene.name === "scrub" ? (
        <Scrub f={frame - scene.start} />
      ) : (
        <Crew f={frame - scene.start} />
      )}
    </div>
  );
}
registerRoot(() => (
  <Composition id="clapper-intro" component={Film} width={1920} height={1080} fps={30} scenes={PLAN} />
));

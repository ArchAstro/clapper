import { Composition, defineScenes, registerRoot, useFrame } from "@archastro/clapper-core";
import { ScoreAudio } from "@archastro/clapper-core/music";
import type { CSSProperties } from "react";
import { Anchor, Compass, Copy, clamp, ease, Frame, Head, Mate, P, Paper, Sea, ShipIcon, Tag } from "./art";
import { score } from "./score";
import "../../intern-promo/src/fonts/fonts.css";

const PLAN = defineScenes(
  {
    storm: { seconds: 4.5 },
    order: { seconds: 6 },
    crew: { seconds: 7.5 },
    decision: { seconds: 6 },
    relay: { seconds: 6 },
    horizon: { seconds: 6 },
  },
  { fps: 30 },
);
const panel: CSSProperties = {
  position: "absolute",
  border: `2px solid ${P.gold}`,
  background: P.paper,
  color: P.ink,
  boxShadow: "9px 12px 0 #061b2433",
  borderRadius: 4,
};
function Storm({ f }: { f: number }) {
  return (
    <>
      <Sea f={f} dim={0.6} />
      <Head style={{ position: "absolute", left: 120, top: 247, fontSize: 145 }}>
        Too many agents.
        <br />
        Not enough <i style={{ color: P.gold }}>you.</i>
      </Head>
      <Copy
        style={{ position: "absolute", left: 126, top: 614, fontSize: 35, color: "#d2cfb8", maxWidth: 730 }}
      >
        One person holding it all together.
      </Copy>
      {[
        { x: 1100, y: 240, t: "SIGN-IN FIX", body: "Waiting for direction…", a: -7 },
        { x: 1170, y: 459, t: "PRICING PAGE", body: "Which session had the brief?", a: 4 },
        { x: 1045, y: 685, t: "CI INVESTIGATION", body: "One more terminal to check.", a: -3 },
      ].map((c, i) => (
        <div
          key={c.t}
          style={{
            ...panel,
            left: c.x + Math.sin(f / 11 + i) * 13,
            top: c.y + Math.sin(f / 13 + i * 2) * 14,
            width: 640,
            height: 170,
            background: "#173a42",
            color: P.paper,
            transform: `rotate(${c.a + Math.sin(f / 22 + i) * 1.8}deg)`,
            padding: "23px 28px",
          }}
        >
          <Tag style={{ fontSize: 22, color: P.gold, marginBottom: 20 }}>{c.t}</Tag>
          <Copy style={{ fontSize: 30 }}>{c.body}</Copy>
          <div
            style={{
              position: "absolute",
              right: 25,
              top: 26,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: P.rust,
            }}
          />
        </div>
      ))}
      <Compass x={740} y={835} r={110} f={f} />
    </>
  );
}
function Order({ f }: { f: number }) {
  return (
    <>
      <Paper />
      <Compass f={f} x={1510} y={430} r={335} dark />
      <Head style={{ position: "absolute", left: 120, top: 205, fontSize: 174 }}>One order.</Head>
      <Head style={{ position: "absolute", left: 126, top: 414, fontSize: 85, lineHeight: 1.09 }}>
        A first mate who owns
        <br />
        the follow-through.
      </Head>
      <Mate x={1065 + 80 * (1 - ease(f / 26))} y={185} width={760} f={f} />
      <div
        style={{
          ...panel,
          left: 125,
          top: 680,
          width: 925,
          height: 190,
          padding: "24px 30px",
          borderColor: P.rust,
          transform: `translateY(${20 * (1 - ease(f / 20))}px)`,
        }}
      >
        <Tag style={{ color: P.rust, marginBottom: 16 }}>YOU</Tag>
        <Copy style={{ fontSize: 33 }}>
          Repair sign-in. Refresh pricing.
          <br />
          Find the CI failure.
        </Copy>
      </div>
    </>
  );
}
function Crew({ f }: { f: number }) {
  const jobs = [
    { name: "Repair sign-in", kind: "SHIP TASK", out: "Change ready for review" },
    { name: "Refresh pricing", kind: "SHIP TASK", out: "Change ready for review" },
    { name: "Investigate CI", kind: "SCOUT TASK", out: "Findings ready" },
  ];
  return (
    <>
      <Paper />
      <Head style={{ position: "absolute", left: 120, top: 157, fontSize: 118 }}>A crew, not more tabs.</Head>
      <Compass x={340} y={600} r={213} f={f} dark />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <circle cx="420" cy="586" r="94" fill={P.navy} />
        <Anchor x={420} y={581} size={1.15} />
        {jobs.map((j, i) => {
          const y = 398 + i * 182,
            t = clamp((f - 12 - i * 12) / 75),
            x = 514 + 346 * t,
            py = 586 + (y - 586) * ease(t);
          return (
            <g key={j.name}>
              <path
                d={`M514 586C650 586 666 ${y} 860 ${y}`}
                fill="none"
                stroke={P.rust}
                strokeWidth="3"
                strokeDasharray="9 9"
                opacity=".55"
              />
              {t > 0 && t < 1 && <circle cx={x} cy={py} r="9" fill={P.rust} />}
            </g>
          );
        })}
      </svg>
      <Tag style={{ position: "absolute", left: 285, top: 709, fontSize: 27, fontWeight: 700 }}>
        FIRST MATE
      </Tag>
      {jobs.map((j, i) => {
        const progress = clamp((f - 30 - i * 16) / 115),
          done = progress >= 1;
        return (
          <div
            key={j.name}
            style={{
              ...panel,
              left: 855,
              top: 320 + i * 182,
              width: 920,
              height: 153,
              padding: "22px 28px",
              borderColor: "#af9d72",
              background: "#f7e9c9",
            }}
          >
            <Tag style={{ fontSize: 18, color: P.rust, marginBottom: 9 }}>WORKTREE {i + 1}</Tag>
            <Copy style={{ fontSize: 35, fontWeight: 600 }}>{j.name}</Copy>
            <div
              style={{
                position: "absolute",
                left: 29,
                right: 29,
                bottom: 20,
                height: 4,
                background: "#ddcda6",
              }}
            >
              <div style={{ width: `${progress * 100}%`, height: 4, background: done ? P.green : P.rust }} />
            </div>
            <Tag
              style={{
                position: "absolute",
                right: 29,
                top: 65,
                fontSize: 18,
                color: done ? P.green : "#687366",
              }}
            >
              {done ? "READY" : "UNDER WAY"}
            </Tag>
          </div>
        );
      })}
      <Copy style={{ position: "absolute", left: 125, top: 915, fontSize: 30 }}>
        Separate worktrees. One first mate.
      </Copy>
    </>
  );
}
function Decision({ f }: { f: number }) {
  const approved = f >= 108;
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 80% 60%,#29505a,#102b32 65%)",
        }}
      />
      <Head style={{ position: "absolute", left: 120, top: 166, fontSize: 115 }}>
        The work moves.
        <br />
        <i style={{ color: P.gold }}>The decision is yours.</i>
      </Head>
      <Mate x={1125} y={242} width={685} f={f} />
      <div style={{ ...panel, left: 127, top: 492, width: 937, height: 343, padding: "26px 34px" }}>
        <Tag style={{ color: P.rust, marginBottom: 23 }}>READY FOR REVIEW</Tag>
        {["Sign-in + pricing ready", "CI investigation delivered"].map((s) => (
          <Copy key={s} style={{ fontSize: 33, marginBottom: 17 }}>
            <span style={{ color: P.green, marginRight: 17 }}>✓</span>
            {s}
          </Copy>
        ))}
        <div
          style={{
            borderTop: "1px solid #bcaa83",
            marginTop: 20,
            paddingTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Copy style={{ fontSize: 27 }}>Your call</Copy>
          <div
            data-copy=""
            style={{
              fontSize: 25,
              padding: "10px 20px",
              border: `1px solid ${P.green}`,
              background: approved ? P.green : "transparent",
              color: approved ? P.paper : P.green,
            }}
          >
            {approved ? "APPROVED → MERGED" : "AWAITING YOUR WORD"}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 130, top: 871, opacity: ease((f - 75) / 12) }}>
        <Copy style={{ fontSize: 34, color: P.gold }}>You: “Merge it.”</Copy>
      </div>
    </>
  );
}
function Relay({ f }: { f: number }) {
  return (
    <>
      <Paper />
      <Compass x={1590} y={375} r={265} f={f} dark />
      <Head style={{ position: "absolute", left: 120, top: 167, fontSize: 120 }}>
        Step away.
        <br />
        Stay in command.
      </Head>
      <div
        style={{
          ...panel,
          left: 145,
          top: 465,
          width: 845,
          height: 207,
          padding: "25px 32px",
          background: "#faedcf",
          borderColor: "#bba77c",
        }}
      >
        <Tag style={{ fontSize: 22, color: P.rust, marginBottom: 17 }}>YOU</Tag>
        <Copy style={{ fontSize: 44 }}>
          <span style={{ color: P.teal }}>@myfirstmate</span>
          <br />
          How's the release?
        </Copy>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M1004 531Q1350 531 1310 670"
          fill="none"
          stroke={P.rust}
          strokeWidth="3"
          strokeDasharray="9 9"
        />
        <ShipIcon
          x={1150 + 100 * ease(f / 45)}
          y={548 + 30 * Math.sin(clamp(f / 45) * Math.PI)}
          s={0.45}
          color={P.rust}
        />
      </svg>
      <div
        style={{
          ...panel,
          left: 695,
          top: 697,
          width: 1080,
          height: 208,
          padding: "24px 34px",
          background: P.navy,
          color: P.paper,
          transform: `translateY(${24 * (1 - ease((f - 25) / 20))}px)`,
          opacity: ease((f - 25) / 20),
        }}
      >
        <Tag style={{ color: P.gold, fontSize: 20, marginBottom: 15 }}>FIRSTMATE</Tag>
        <Copy style={{ fontSize: 39 }}>Ready for your review, captain.</Copy>
        <Copy style={{ fontSize: 20, color: "#bdc3b0", marginTop: 13 }}>Example exchange</Copy>
      </div>
      <Copy style={{ position: "absolute", left: 147, top: 933, fontSize: 28 }}>
        Optional X / Discord relay · Linked owners only.
      </Copy>
    </>
  );
}
function Horizon({ f }: { f: number }) {
  return (
    <>
      <Sea f={f} dim={0.17} />
      <Head style={{ position: "absolute", left: 116, top: 185, fontSize: 187, color: P.paper }}>
        firstmate<span style={{ color: P.gold }}>.</span>
      </Head>
      <Head style={{ position: "absolute", left: 125, top: 420, fontSize: 92, lineHeight: 1.11 }}>
        Talk to one agent.
        <br />
        Ship with a crew.
      </Head>
      <div
        style={{
          position: "absolute",
          left: 127,
          top: 711,
          width: 974,
          padding: "25px 27px",
          borderTop: `2px solid ${P.gold}`,
          borderBottom: `2px solid ${P.gold}`,
          background: "#0b252ce0",
        }}
      >
        <Copy style={{ fontFamily: '"Fragment Mono",monospace', fontSize: 32, color: P.paper }}>
          github.com/kunchenguid/firstmate
        </Copy>
      </div>
      <Copy style={{ position: "absolute", left: 130, top: 846, fontSize: 30, color: "#e2d9bc" }}>
        Clone the repo. Launch your coding agent inside it.
      </Copy>
    </>
  );
}
function Film() {
  const frame = useFrame(),
    scene = PLAN.at(frame)!,
    f = frame - scene.start,
    dark = ["order", "crew", "relay"].includes(scene.name);
  return (
    <div
      className="firstmate-film"
      style={{
        position: "absolute",
        inset: 0,
        background: P.navy,
        color: dark ? P.ink : P.paper,
        overflow: "hidden",
      }}
    >
      <style>{".firstmate-film,.firstmate-film *{box-sizing:border-box;}"}</style>
      <ScoreAudio score={score} />
      {scene.name === "storm" ? (
        <Storm f={f} />
      ) : scene.name === "order" ? (
        <Order f={f} />
      ) : scene.name === "crew" ? (
        <Crew f={f} />
      ) : scene.name === "decision" ? (
        <Decision f={f} />
      ) : scene.name === "relay" ? (
        <Relay f={f} />
      ) : (
        <Horizon f={f} />
      )}
      <Frame dark={dark} />
    </div>
  );
}
registerRoot(() => (
  <Composition id="firstmate" component={Film} width={1920} height={1080} fps={30} scenes={PLAN} />
));

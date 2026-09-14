import { useFrame } from "@archastro/clapper-core";
import { Appear, Arrow, Box, C, Canvas, clamp, ease, Txt } from "./visuals";

function Key({ x, y, opacity = 1 }: { x: number; y: number; opacity?: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={opacity}
      stroke={C.gold}
      strokeWidth={7}
      fill="none"
      strokeLinecap="round"
    >
      <circle cx={0} cy={0} r={17} />
      <path d="M17 0 H64 M47 0 V17 M60 0 V13" />
    </g>
  );
}
export function Intro({ duration }: { duration: number }) {
  const f = useFrame(),
    p = clamp(f / duration);
  const one = ease((p - 0.04) / 0.2),
    two = ease((p - 0.29) / 0.22);
  const x = one < 1 ? 410 + 490 * one : 900 + 490 * two;
  return (
    <div className="intro-scene">
      <div className="intro-tag">RECURRENT TRANSFORMERS · AN INTUITIVE EXPLAINER</div>
      <h1 className="intro-title" data-copy="">
        Why give a model
        <br />
        another pass?
      </h1>
      <div className="intro-stage">
        <Canvas>
          <Box x={100} y={100} w={380} h={170} label="LEA" sub="hands over a key" color={C.blue} />
          <Box x={670} y={100} w={380} h={170} label="OMAR" sub="puts it away" color={C.blue} />
          <Box x={1240} y={100} w={380} h={170} label="DRAWER" sub="a final location" color={C.gold} />
          <Arrow x1={485} y1={185} x2={660} y2={185} active={p < 0.28} color={C.gold} />
          <Arrow x1={1055} y1={185} x2={1230} y2={185} active={p >= 0.28 && p < 0.58} color={C.gold} />
          <Key x={x - 100} y={323} />
          <Appear at={duration * 0.53}>
            <Txt x={860} y={455} size={51} anchor="middle" color={C.gold}>
              Where is the key?
            </Txt>
          </Appear>
        </Canvas>
      </div>
      <div className="intro-bottom" data-copy="">
        Join two facts. Then answer one question.
      </div>
    </div>
  );
}
export function Journey({ duration, ending = false }: { duration: number; ending?: boolean }) {
  const f = useFrame(),
    p = clamp(f / duration),
    stage = Math.min(3, Math.floor(f / 80));
  return (
    <Canvas>
      <Box x={55} y={145} w={390} h={190} label="READ THE STORY" sub="key → Omar → drawer" color={C.gold} />
      <Arrow x1={450} y1={240} x2={635} y2={240} active />
      <Box
        x={640}
        y={135}
        w={440}
        h={210}
        label="REFINE MEANING"
        sub="revise the internal representation"
        active
      />
      <path d="M1030 127 V55 H690 V127" fill="none" stroke={C.cyan} strokeWidth={2.5} />
      <Txt x={860} y={27} anchor="middle" color={C.cyan} size={25}>
        same processing rule, another pass
      </Txt>
      <Arrow x1={1085} y1={240} x2={1270} y2={240} active={p > 0.2} />
      <Box
        x={1275}
        y={145}
        w={390}
        h={190}
        label={p > 0.28 || ending ? "“drawer”" : "ANSWER"}
        sub="produce an output token"
        color={C.gold}
        active={p > 0.28}
      />
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={780 + i * 80} cy={390} r={12} fill={stage > i ? C.cyan : C.line} />
            <Txt x={780 + i * 80} y={437} anchor="middle" size={20} color={C.muted}>
              {i + 1}
            </Txt>
          </g>
        ))}
      </g>
      <Appear at={45}>
        <Txt x={860} y={525} size={31} anchor="middle" color={C.ink}>
          {ending
            ? "The whole journey is still: input → refinement → prediction."
            : "The model revises vectors, not a visible draft answer."}
        </Txt>
      </Appear>
    </Canvas>
  );
}
export function Refine({ duration }: { duration: number }) {
  const f = useFrame(),
    p = clamp(f / duration);
  return (
    <Canvas>
      <Txt x={860} y={45} anchor="middle" size={29} color={C.muted}>
        One possible mental picture of combining information
      </Txt>
      {[
        [310, "KEY"],
        [860, "OMAR"],
        [1410, "DRAWER"],
      ].map(([x, label]) => (
        <Box
          key={label}
          x={Number(x) - 170}
          y={145}
          w={340}
          h={165}
          label={String(label)}
          color={label === "KEY" ? C.gold : C.cyan}
          active
        />
      ))}
      <Appear at={duration * 0.23}>
        <Arrow x1={485} y1={225} x2={685} y2={225} active label="handoff" labelBackdrop />
      </Appear>
      <Appear at={duration * 0.43}>
        <Arrow x1={1035} y1={225} x2={1235} y2={225} active label="placement" labelBackdrop />
      </Appear>
      <Appear at={duration * 0.62}>
        <path d="M310 320 V398 H1410 V320" fill="none" stroke={C.gold} strokeWidth={3} />
        <Txt x={860} y={443} anchor="middle" color={C.gold} size={39}>
          key → final location: drawer
        </Txt>
      </Appear>
      <Txt x={860} y={535} anchor="middle" size={24} color={C.muted}>
        {p < 0.62
          ? "Entities → relations → connected evidence"
          : "This is an illustration, not a measured hidden-state trace."}
      </Txt>
    </Canvas>
  );
}

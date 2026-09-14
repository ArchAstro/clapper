import { useFrame } from "@archastro/clapper-core";
import { Appear, Arrow, Box, C, Canvas, clamp, Matrix, Txt } from "./visuals";
export function Architecture({ id, duration }: { id: string; duration: number }) {
  const f = useFrame(),
    p = clamp(f / duration);
  if (id === "architecture" || id === "return")
    return (
      <Canvas>
        <Box x={35} y={100} w={270} h={110} label="STORY" sub="input tokens" color={C.gold} />
        <Box x={465} y={100} w={255} h={110} label="EMBED" sub="tokens → vectors" />
        <Box x={880} y={100} w={300} h={110} label="ENCODER" sub="refine the input state" active />
        <Box x={1380} y={100} w={300} h={110} label="INPUT MEANING" sub="final encoder states" />
        <Arrow x1={310} y1={155} x2={455} y2={155} active />
        <Arrow x1={725} y1={155} x2={870} y2={155} active />
        <Arrow x1={1185} y1={155} x2={1370} y2={155} active />
        <path d="M1130 92 V35 H930 V92" stroke={C.cyan} fill="none" strokeWidth={2} />
        <Txt x={1030} y={10} anchor="middle" size={22} color={C.cyan}>
          repeat
        </Txt>
        <Appear at={id === "return" ? 0 : duration * 0.22}>
          <Box x={35} y={390} w={270} h={110} label="PREFIX" sub="The key is in the" color={C.gold} />
          <Box x={465} y={390} w={255} h={110} label="EMBED" sub="available output tokens" />
          <Box
            x={880}
            y={390}
            w={300}
            h={110}
            label="DECODER"
            sub="masked + cross-attention"
            color={C.blue}
            active
          />
          <Box
            x={1380}
            y={390}
            w={300}
            h={110}
            label="“drawer”"
            sub="select from output probabilities"
            color={C.gold}
          />
          <Arrow x1={310} y1={445} x2={455} y2={445} active />
          <Arrow x1={725} y1={445} x2={870} y2={445} active />
          <Arrow
            x1={1185}
            y1={445}
            x2={1370}
            y2={445}
            active
            color={C.gold}
            label="project + softmax"
            labelBackdrop
          />
          <Arrow
            x1={1530}
            y1={215}
            x2={1130}
            y2={380}
            active
            color={C.blue}
            label="consult the input"
            labelBackdrop
          />
          <path d="M1530 505 V550" stroke={C.gold} fill="none" strokeWidth={2} />
          <Arrow
            x1={1530}
            y1={550}
            x2={170}
            y2={550}
            color={C.gold}
            active
            label="append selected token → run the decoder again"
            labelBackdrop
          />
          <Arrow x1={170} y1={550} x2={170} y2={505} color={C.gold} active />
          <path d="M930 382 V327 H1100 V382" stroke={C.blue} fill="none" strokeWidth={2} />
          <Txt x={1010} y={299} anchor="middle" size={21} color={C.blue}>
            repeat internally
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "axes") {
    const row = Math.min(2, Math.floor(f / 110));
    return (
      <Canvas>
        <Txt x={900} y={20} size={28} anchor="middle" color={C.gold}>
          TOKEN POSITIONS →
        </Txt>
        {["Lea", "gave", "Omar", "key"].map((word, i) => (
          <Txt key={word} x={570 + i * 270} y={75} anchor="middle" size={29}>
            {word}
          </Txt>
        ))}
        {[0, 1, 2].map((t) => (
          <g key={t}>
            <Txt x={55} y={168 + t * 140} size={29} color={C.cyan}>
              revision {t + 1}
            </Txt>
            {[0, 1, 2, 3].map((i) => (
              <Box
                key={i}
                x={455 + i * 270}
                y={115 + t * 140}
                w={230}
                h={95}
                label={`state ${i + 1}`}
                sub={t === row ? "all positions update" : "revised representation"}
                active={t === row}
              />
            ))}
          </g>
        ))}
        <Txt x={860} y={555} anchor="middle" size={26} color={C.muted}>
          Depth recurrence ≠ generating the next output token
        </Txt>
      </Canvas>
    );
  }
  if (id === "step")
    return (
      <Canvas>
        <Box x={10} y={180} w={220} h={135} label="STATE" sub="position + depth added" />
        <Box x={345} y={180} w={210} h={135} label="ATTENTION" sub="mix token states" active />
        <Box x={670} y={180} w={210} h={135} label="ADD + NORM" sub="residual + normalize" />
        <Box x={995} y={180} w={210} h={135} label="TRANSITION" sub="update each position" active />
        <Box x={1320} y={180} w={210} h={135} label="ADD + NORM" sub="next state" />
        {[230, 555, 880, 1205].map((x) => (
          <Arrow key={x} x1={x + 5} y1={247} x2={x + 105} y2={247} active />
        ))}
        <path
          d="M120 170 V80 H775 V170 M775 327 V412 H1425 V327"
          stroke={C.blue}
          fill="none"
          strokeWidth={2.5}
        />
        <Txt x={420} y={47} anchor="middle" color={C.blue} size={25}>
          retain the incoming representation
        </Txt>
        <Txt x={1120} y={455} anchor="middle" color={C.blue} size={25}>
          retain the attention result
        </Txt>
        <Appear at={duration * 0.45}>
          <Txt x={860} y={535} anchor="middle" size={32}>
            The next revision receives this revised state.
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "attention") {
    const phase = Math.min(3, Math.floor(p * 5));
    return (
      <Canvas>
        <Box x={45} y={190} w={300} h={135} label="CURRENT STATES" sub="one vector per position" />
        <Arrow x1={350} y1={257} x2={505} y2={117} active />
        <Arrow x1={350} y1={257} x2={505} y2={277} active />
        <Arrow x1={350} y1={257} x2={505} y2={437} active />
        {["QUERIES", "KEYS", "VALUES"].map((label, i) => (
          <Box
            key={label}
            x={510}
            y={60 + i * 160}
            w={280}
            h={115}
            label={label}
            sub={["what to match", "how to be matched", "what to contribute"][i]}
            active={phase >= i}
          />
        ))}
        <Box
          x={990}
          y={105}
          w={290}
          h={130}
          label="SOFTMAX"
          sub="normalize Q–K match scores"
          active={phase > 0}
        />
        <Arrow x1={795} y1={116} x2={980} y2={150} active labelBackdrop />
        <Arrow x1={795} y1={276} x2={980} y2={190} active />
        <Box
          x={1340}
          y={305}
          w={330}
          h={145}
          label="WEIGHTED MIX"
          sub="new context for each position"
          active={phase > 1}
        />
        <Arrow x1={1135} y1={240} x2={1450} y2={298} active label="weights" labelBackdrop />
        <Arrow x1={795} y1={435} x2={1330} y2={385} active label="values" labelBackdrop />
        <Txt x={860} y={545} anchor="middle" size={29} color={C.muted}>
          Several heads repeat this exchange in parallel.
        </Txt>
      </Canvas>
    );
  }
  if (id === "transition")
    return (
      <Canvas>
        <Matrix x={75} y={200} values={[[0.4], [-0.8], [0.6]]} cell={73} label="one token state" />
        <Arrow x1={220} y1={310} x2={335} y2={310} active />
        <Box x={340} y={245} w={290} h={125} label="PROJECTION" sub="mix coordinates" active />
        <Arrow x1={635} y1={310} x2={785} y2={310} active />
        <Box x={790} y={245} w={260} h={125} label="ReLU" sub="zero negative inputs" color={C.gold} active />
        <Arrow x1={1055} y1={310} x2={1205} y2={310} active />
        <Box x={1210} y={245} w={350} h={125} label="PROJECTION" sub="return to the state dimension" active />
        <Txt x={860} y={90} anchor="middle" size={37}>
          Same weights at each position and each depth.
        </Txt>
        <Appear at={duration * 0.5}>
          <Txt x={860} y={500} anchor="middle" size={32} color={C.gold}>
            New state + new depth signal → a different result
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "halting")
    return (
      <Canvas>
        {["position A", "position B", "position C"].map((label, i) => (
          <g key={label}>
            <Txt x={70} y={120 + i * 160} size={30}>
              {label}
            </Txt>
            {[0, 1, 2, 3].map((t) => (
              <g key={t}>
                <circle
                  cx={440 + t * 300}
                  cy={120 + i * 160}
                  r={35}
                  fill={t <= [1, 3, 2][i] ? C.cyan : C.line}
                  opacity={t <= [1, 3, 2][i] ? 1 : 0.35}
                />
                {t < 3 && (
                  <line
                    x1={480 + t * 300}
                    y1={120 + i * 160}
                    x2={700 + t * 300}
                    y2={120 + i * 160}
                    stroke={C.line}
                    strokeWidth={2}
                  />
                )}
              </g>
            ))}
            <Txt x={1510} y={120 + i * 160} anchor="middle" size={25} color={C.gold}>
              stop after {[2, 4, 3][i]}
            </Txt>
          </g>
        ))}
        <Txt x={860} y={545} anchor="middle" size={29} color={C.muted}>
          Optional adaptive halting. The next section uses fixed depth.
        </Txt>
      </Canvas>
    );
  return null;
}

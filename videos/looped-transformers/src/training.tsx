import { useFrame } from "@archastro/clapper-core";
import { Appear, Arrow, Box, C, Canvas, clamp, Equation, Matrix, Txt } from "./visuals";
export function Training({ id, duration }: { id: string; duration: number }) {
  const f = useFrame(),
    p = clamp(f / duration);
  if (id === "train")
    return (
      <Canvas>
        <Box x={70} y={100} w={340} h={150} label="PREDICT" sub="distribution over output tokens" active />
        <Arrow x1={415} y1={175} x2={655} y2={175} active />
        <Box
          x={660}
          y={100}
          w={360}
          h={150}
          label="COMPARE"
          sub="probability of target: drawer"
          color={C.gold}
        />
        <Arrow x1={1025} y1={175} x2={1265} y2={175} active color={C.coral} />
        <Box
          x={1270}
          y={100}
          w={370}
          h={150}
          label="LOSS"
          sub="penalize low target probability"
          color={C.coral}
        />
        <Appear at={duration * 0.3}>
          <Arrow x1={1455} y1={255} x2={1455} y2={385} active color={C.coral} />
          <Box
            x={1180}
            y={390}
            w={460}
            h={140}
            label="BACKPROPAGATE"
            sub="decoder → encoder sensitivities"
            color={C.coral}
            active
          />
          <Arrow
            x1={1175}
            y1={460}
            x2={575}
            y2={460}
            active
            color={C.coral}
            label="gradients"
            labelBackdrop
          />
          <Box
            x={70}
            y={390}
            w={500}
            h={140}
            label="OPTIMIZER UPDATE"
            sub="adjust weights, then train again"
            color={C.coral}
            active
          />
          <Arrow x1={240} y1={385} x2={240} y2={255} active color={C.cyan} />
        </Appear>
      </Canvas>
    );
  if (id === "unroll")
    return (
      <Canvas>
        <Txt x={860} y={55} anchor="middle" size={30} color={C.muted}>
          Isolate one recurrent block inside that learning loop.
        </Txt>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Box
              x={150 + i * 550}
              y={155}
              w={320}
              h={130}
              label={`USE ${i + 1}`}
              sub="same shared weights θ"
              active
            />
            {i < 2 && (
              <Arrow
                x1={475 + i * 550}
                y1={220}
                x2={690 + i * 550}
                y2={220}
                active
                label={`state ${i + 1}`}
                labelBackdrop
              />
            )}
          </g>
        ))}
        <Appear at={duration * 0.3}>
          <Arrow x1={1240} y1={370} x2={1030} y2={370} active color={C.coral} />
          <Arrow x1={690} y1={370} x2={480} y2={370} active color={C.coral} />
          <Txt x={1460} y={370} color={C.coral} anchor="middle" size={28}>
            feedback from loss
          </Txt>
        </Appear>
        <Appear at={duration * 0.52}>
          <path d="M310 295 V460 H1410 V295 M860 295 V460" fill="none" stroke={C.coral} strokeWidth={2} />
          <Txt x={860} y={515} anchor="middle" size={32} color={C.coral}>
            each use contributes to one shared parameter update
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "nudge")
    return (
      <Canvas>
        <Box x={65} y={125} w={280} h={135} label="INPUT: 3" sub="held fixed" />
        <Arrow x1={350} y1={192} x2={650} y2={192} active label="weight: 0.5" labelBackdrop />
        <Box x={655} y={125} w={335} h={135} label="OUTPUT: 1.5" sub="3 × 0.5" />
        <Arrow x1={995} y1={192} x2={1310} y2={192} active color={C.coral} />
        <Box
          x={1315}
          y={125}
          w={340}
          h={135}
          label="TARGET: 1"
          sub="half squared error = 0.125"
          color={C.gold}
        />
        <Appear at={duration * 0.3}>
          <Equation y={345} color={C.coral}>
            output gradient = 1.5 − 1 = 0.5
          </Equation>
        </Appear>
        <Appear at={duration * 0.58}>
          <Equation y={445} color={C.coral} size={43}>
            weight gradient = 0.5 × 3 = 1.5
          </Equation>
          <Txt x={860} y={527} anchor="middle" size={29} color={C.muted}>
            loss sensitivity × local input multiplier
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "projection")
    return (
      <Canvas>
        <Matrix
          x={180}
          y={170}
          values={[
            [1, 2],
            [-1, 1],
          ]}
          label="W"
          cell={100}
          highlight={Math.min(3, Math.floor(p * 5))}
        />
        <Txt x={490} y={270} size={42}>
          ×
        </Txt>
        <Matrix x={610} y={170} values={[[3], [1]]} label="x" cell={100} />
        <Txt x={850} y={270} size={42}>
          =
        </Txt>
        <Matrix x={980} y={170} values={[[5], [-2]]} label="y" cell={100} />
        <Box x={1280} y={190} w={320} h={140} label="REST OF MODEL" sub="produces a loss" color={C.coral} />
        <Arrow x1={1090} y1={260} x2={1270} y2={260} active />
        <Appear at={duration * 0.55}>
          <Arrow
            x1={1440}
            y1={420}
            x2={1030}
            y2={420}
            color={C.coral}
            active
            label="incoming gradient g = [1, −2]ᵀ"
            labelBackdrop
          />
          <Txt x={860} y={535} anchor="middle" size={29} color={C.muted}>
            A local teaching example, not the complete Transformer.
          </Txt>
        </Appear>
      </Canvas>
    );
  if (id === "matrix") {
    const phase = p < 0.55 ? 0 : 1;
    return (
      <Canvas>
        <Txt x={860} y={35} size={28} anchor="middle" color={C.muted}>
          Toy projection: x = [3, 1]ᵀ and incoming g = [1, −2]ᵀ
        </Txt>
        <Matrix x={150} y={130} values={[[1], [-2]]} label="g" cell={82} color={C.coral} />
        <Txt x={315} y={210} size={36}>
          ×
        </Txt>
        <Matrix x={420} y={171} values={[[3, 1]]} label="xᵀ" cell={82} />
        <Txt x={660} y={210} size={36}>
          =
        </Txt>
        <Matrix
          x={780}
          y={130}
          values={[
            [3, 1],
            [-6, -2],
          ]}
          label="weight gradient"
          cell={82}
          color={C.coral}
          highlight={Math.min(3, Math.floor(p * 6))}
        />
        <Box
          x={1160}
          y={143}
          w={480}
          h={120}
          label="∇W L = g xᵀ"
          sub="output gradient × input value"
          color={C.coral}
          active={phase === 0}
        />
        <Appear at={duration * 0.48}>
          <Matrix
            x={220}
            y={390}
            values={[
              [1, -1],
              [2, 1],
            ]}
            label="Wᵀ"
            cell={70}
          />
          <Txt x={475} y={458} size={36}>
            ×
          </Txt>
          <Matrix x={570} y={390} values={[[1], [-2]]} label="g" cell={70} color={C.coral} />
          <Txt x={730} y={458} size={36}>
            =
          </Txt>
          <Matrix x={850} y={390} values={[[3], [0]]} label="input gradient" cell={70} color={C.coral} />
          <Box
            x={1160}
            y={400}
            w={480}
            h={120}
            label="∇x L = Wᵀ g"
            sub="sum feedback through the connections"
            color={C.coral}
            active={phase === 1}
          />
        </Appear>
      </Canvas>
    );
  }
  if (id === "calculus")
    return (
      <Canvas>
        <Equation y={80} color={C.cyan} size={44}>
          dy = (dW)x + W(dx)
        </Equation>
        <Txt x={860} y={155} anchor="middle" size={26} color={C.muted}>
          weight change × current input + current weights × input change
        </Txt>
        <Appear at={duration * 0.3}>
          <Equation y={270} size={40}>
            dL = gᵀ(dW)x + gᵀW(dx)
          </Equation>
        </Appear>
        <Appear at={duration * 0.53}>
          <Arrow x1={680} y1={305} x2={450} y2={400} color={C.coral} active />
          <Arrow x1={1030} y1={305} x2={1280} y2={400} color={C.coral} active />
          <Box
            x={95}
            y={405}
            w={710}
            h={125}
            label="coefficient of dW: g xᵀ"
            sub="the gradient for the weights"
            color={C.coral}
            active
          />
          <Box
            x={915}
            y={405}
            w={710}
            h={125}
            label="coefficient of dx: Wᵀ g"
            sub="the gradient passed to the previous state"
            color={C.coral}
            active
          />
        </Appear>
      </Canvas>
    );
  if (id === "sum")
    return (
      <Canvas>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Box x={150 + i * 550} y={45} w={330} h={105} label={`USE ${i + 1} OF Fθ`} active />
            <Arrow
              x1={315 + i * 550}
              y1={155}
              x2={860}
              y2={285}
              color={C.coral}
              active={p > i * 0.12}
              label={`contribution ${i + 1}`}
              labelBackdrop
            />
          </g>
        ))}
        <Box x={610} y={290} w={500} h={105} label="ADD → UPDATE θ" color={C.coral} active />
        <Appear at={duration * 0.3}>
          <Equation y={450} color={C.coral} size={32}>
            gₜ = Jₜᵀ gₜ₊₁
          </Equation>
        </Appear>
        <Appear at={duration * 0.6}>
          <Equation y={535} color={C.coral} size={31}>
            ∇θ L = Σₜ (∂Fθ(xₜ)/∂θ)ᵀ gₜ₊₁
          </Equation>
        </Appear>
      </Canvas>
    );
  return null;
}

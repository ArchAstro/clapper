import { AbsoluteFill, Camera, Composition, registerRoot, Scenes, useFrame } from "@archastro/clapper-core";
import { NarrationAudio } from "@archastro/clapper-core/narration";
import { Architecture } from "./architecture";
import { BEATS } from "./beats";
import { Intro, Journey, Refine } from "./intuition";
import narration from "./narration";
import { FPS, SCENES } from "./plan";
import { Training } from "./training";
import { clamp, ease } from "./visuals";
import "./theme.css";

const NOTES: Record<string, string> = {
  whole:
    "INTUITION  ·  Internal representations are revised before prediction. The story is an illustration.",
  refine: "ILLUSTRATION  ·  These labeled steps are a mental picture, not measured internal thoughts.",
  architecture:
    "SOURCE  ·  Universal Transformers, §2.1 / Figure 2 · Encoder and decoder have separate parameter sets.",
  axes: "DEPTH  ·  Weights are shared across refinement steps within each recurrent block.",
  step: "SOURCE  ·  Universal Transformers, Equations 4–7 · Dropout omitted from this diagram.",
  attention:
    "ATTENTION  ·  Q, K and V are learned projections of states. Heads are concatenated and projected.",
  transition:
    "TRANSITION  ·  The feed-forward variant uses affine → ReLU → affine; residual/norm surround the block.",
  return:
    "GENERATION  ·  Encode the input once, then produce output tokens autoregressively with the decoder.",
  halting: "SCOPE  ·  Optional per-position halting; the following derivation uses fixed depth, not ACT.",
  train:
    "TRAINING  ·  Teacher forcing supplies the shifted target prefix; gradients pass through probabilities.",
  unroll:
    "PARAMETER SHARING  ·  Repeated uses are one computation graph, with one shared set of block weights.",
  nudge: "TOY EXAMPLE  ·  y = wx; L = ½(y − 1)²; derivative evaluated at x = 3, w = 0.5.",
  projection: "LOCAL PROJECTION  ·  Column-vector notation; W = [[1, 2], [−1, 1]], x = [3, 1]ᵀ.",
  matrix: "SHAPES  ·  g xᵀ matches W; Wᵀ g matches x. A transpose routes feedback; it is not an inverse.",
  calculus:
    "DIFFERENTIALS  ·  dW and dx are independent perturbations. The matrix coefficient uses an entrywise inner product.",
  sum: "ASSUMPTIONS  ·  θ: one recurrent block; x₀ independent of θ. Local ∂F/∂θ holds xₜ fixed; depth signals implicit.",
  end: "PRIMARY PAPER  ·  Dehghani et al. · Universal Transformers · ICLR 2019 · arxiv.org/abs/1807.03819",
};
function Shot({ index }: { index: number }) {
  const beat = BEATS[index],
    f = useFrame(),
    duration = SCENES.duration(beat.id),
    enter = ease(f / 22);
  const architecture = [
    "architecture",
    "axes",
    "step",
    "attention",
    "transition",
    "return",
    "halting",
  ].includes(beat.id);
  const zoom = ["step", "attention", "nudge", "projection"].includes(beat.id);
  if (beat.id === "intro") return <Intro duration={duration} />;
  return (
    <AbsoluteFill>
      <div className="eyebrow">{beat.chapter}</div>
      <div className="brand">UNIVERSAL TRANSFORMERS</div>
      <h1
        className="title"
        data-copy=""
        style={{ transform: `translateY(${8 * (1 - enter)}px)`, fontSize: beat.title.length > 56 ? 57 : 66 }}
      >
        {beat.title}
      </h1>
      <p className="subtitle" data-copy="">
        {beat.subtitle}
      </p>
      <Camera
        keyframes={
          zoom
            ? [
                { frame: 0, zoom: 0.76 },
                { frame: 55, zoom: 1 },
              ]
            : []
        }
      >
        <div className="diagram">
          {beat.id === "whole" || beat.id === "end" ? (
            <Journey duration={duration} ending={beat.id === "end"} />
          ) : beat.id === "refine" ? (
            <Refine duration={duration} />
          ) : architecture ? (
            <Architecture id={beat.id} duration={duration} />
          ) : (
            <Training id={beat.id} duration={duration} />
          )}
        </div>
      </Camera>
      <div className="note" data-copy="">
        {NOTES[beat.id]}
      </div>
      <div className="counter">
        {String(index + 1).padStart(2, "0")} / {BEATS.length}
      </div>
      <div className="footer">
        <div style={{ width: `${(100 * (index + clamp(f / duration))) / BEATS.length}%` }} />
      </div>
    </AbsoluteFill>
  );
}
function Film() {
  return (
    <div className="film">
      <NarrationAudio script={narration} />
      <Scenes plan={SCENES}>
        {BEATS.map((b, i) => (
          <Scenes.Scene name={b.id} key={b.id}>
            <Shot index={i} />
          </Scenes.Scene>
        ))}
      </Scenes>
    </div>
  );
}
registerRoot(() => (
  <Composition
    id="looped-transformers"
    component={Film}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={SCENES.total}
    scenes={SCENES}
  />
));

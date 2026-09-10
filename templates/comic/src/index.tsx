import {
  AbsoluteFill,
  Composition,
  Copy,
  defineScenes,
  Eyebrow,
  Pluck,
  registerRoot,
  Scenes,
  SketchWindow,
  useFrame,
} from "@clapper/core";
import { SCRIBBLE_POSES, Scribble } from "@clapper/core/rigs";
import { DATA } from "./data";
import "./theme.css";

const SCENES = defineScenes(
  { intro: { seconds: 3 }, work: { seconds: 4 }, end: { seconds: 3 } },
  { fps: 30 },
);

function Intro() {
  return (
    <AbsoluteFill className="comic">
      <Eyebrow style={{ position: "absolute", left: 120, top: 90 }}>{DATA.product}</Eyebrow>
      <Copy x={120} y={200} size={76}>
        {DATA.tagline}
      </Copy>
    </AbsoluteFill>
  );
}
function Work() {
  const frame = useFrame();
  return (
    <AbsoluteFill className="comic">
      <Eyebrow style={{ position: "absolute", left: 120, top: 90 }}>One clear next step.</Eyebrow>
      <Scribble pose={SCRIBBLE_POSES.typing} x={550} y={430} typing={frame < 65 ? 1 : 0} />
      <SketchWindow x={1040} y={320} w={650} h={330} title="Your story" lines={4} />
      <Copy x={120} y={880} size={48}>
        {DATA.proof}
      </Copy>
    </AbsoluteFill>
  );
}
function End() {
  return (
    <AbsoluteFill className="comic">
      <Eyebrow style={{ position: "absolute", left: 120, top: 90 }}>{DATA.product}</Eyebrow>
      <Copy x={120} y={400} size={90}>
        {DATA.url}
      </Copy>
    </AbsoluteFill>
  );
}
function Spot() {
  return (
    <>
      <Pluck note="D4" at={0} volume={0.1} />
      <Pluck note="A4" at={SCENES.start("work")} volume={0.1} />
      <Pluck note="D5" at={SCENES.start("end")} volume={0.1} />
      <Scenes plan={SCENES}>
        <Scenes.Scene name="intro">
          <Intro />
        </Scenes.Scene>
        <Scenes.Scene name="work">
          <Work />
        </Scenes.Scene>
        <Scenes.Scene name="end">
          <End />
        </Scenes.Scene>
      </Scenes>
    </>
  );
}
registerRoot(() => (
  <Composition id="spot" component={Spot} scenes={SCENES} width={1920} height={1080} fps={30} />
));

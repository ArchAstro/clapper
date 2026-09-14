import { Audio, Composition, Fill, setRootComponent, staticFile } from "@rendiv/core";
import { TransitionSeries } from "@rendiv/transitions";
import { SCENES, TOTAL } from "../../shared/data.js";
import { Atmosphere, Grid } from "./atmosphere";
import { Graph } from "./graph";
import { Latency } from "./latency";
import { INOUT } from "./motion";
import { End, Title } from "./titles";
import { Trace } from "./trace";
import "./style.css";

const scenes = [Title, Graph, Latency, Trace];
// Rendiv supports custom transition presentations; Nimbus uses a 12-frame blur crossfade.
const blur = {
  style: (p: number) => ({
    entering: { opacity: p, filter: `blur(${(1 - p) * 24}px)` },
    exiting: { opacity: 1 - p, filter: `blur(${p * 24}px)` },
  }),
};
const timing = {
  durationInFrames: 12,
  progress: (frame: number) => INOUT(Math.min(1, Math.max(0, frame / 12))),
};
export function Nimbus() {
  return (
    <Fill className="vid nimbus">
      <Audio src={staticFile("assets/soundtrack.wav")} endAt={TOTAL} />
      <Grid />
      <TransitionSeries>
        {scenes.flatMap((Scene, i) => [
          <TransitionSeries.Sequence
            key={SCENES[i].name}
            durationInFrames={SCENES[i].frames}
            name={SCENES[i].name}
          >
            <Scene />
          </TransitionSeries.Sequence>,
          <TransitionSeries.Transition key={`cut-${i}`} timing={timing} presentation={blur} />,
        ])}
        <TransitionSeries.Sequence durationInFrames={180} name="end">
          <End />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Atmosphere />
    </Fill>
  );
}
function Root() {
  return (
    <Composition
      id="Nimbus"
      component={Nimbus}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
setRootComponent(Root);

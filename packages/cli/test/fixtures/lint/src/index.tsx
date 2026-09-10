import {
  AbsoluteFill,
  Composition,
  Copy,
  defineScenes,
  registerRoot,
  Scenes,
  useFrame,
} from "@archastro/clapper-core";

/** Deliberately broken: overlapping copy, copy off the safe area, a blank frame after the cut, Math.random in a frame. */
const SCENES = defineScenes({ a: { seconds: 1 }, b: { seconds: 1 } }, { fps: 30 });

function A() {
  return (
    <AbsoluteFill style={{ background: "#dddddd" }}>
      <Copy at={0} x={60} y={100} size={40}>
        First line of copy
      </Copy>
      <Copy at={0} x={80} y={110} size={40}>
        Second line lands on the first
      </Copy>
      <Copy at={0} x={2} y={330} size={24}>
        Hugging the bottom-left corner
      </Copy>
    </AbsoluteFill>
  );
}
function B() {
  const frame = useFrame();
  const jitter = Math.random() * 0; // clapper-lint should flag this
  return <AbsoluteFill style={{ background: frame < 2 ? "#000" : "#cccccc", opacity: 1 + jitter }} />;
}
function Root() {
  return (
    <Composition
      id="lint"
      width={640}
      height={360}
      fps={30}
      scenes={SCENES}
      component={() => (
        <Scenes plan={SCENES}>
          <Scenes.Scene name="a">
            <A />
          </Scenes.Scene>
          <Scenes.Scene name="b">
            <B />
          </Scenes.Scene>
        </Scenes>
      )}
    />
  );
}
registerRoot(Root);

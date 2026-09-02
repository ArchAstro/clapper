import { AbsoluteFill, Panel, useBoil, useFrame } from "@agenticvids/core";
import { POSES, Scribble, usePose } from "./scribble";

/** Pose sheet for eyeballing the rig: three figures, three moods, boiling lines. */
export function ScribbleSheet() {
  const seed = useBoil(4);
  const frame = useFrame();
  const a = usePose([{ at: 0, pose: "happy" }, { at: 40, pose: "wide", ease: "outBack" }]);
  const b = usePose([{ at: 0, pose: "typing" }, { at: 30, pose: "rage", ease: "outBack", arc: 20 }]);
  const c = usePose([{ at: 0, pose: "reading" }, { at: 50, pose: "slump", ease: "inOutCubic" }]);
  return (
    <AbsoluteFill className="archdev3">
      <Panel seed={seed}>
        <Scribble pose={a} x={330} y={640} scale={0.55} typing={0.6} />
        <Scribble pose={b} x={880} y={640} scale={0.55} typing={1} fury={frame > 30 ? 1 : 0} />
        <Scribble pose={c} x={1430} y={640} scale={0.55} />
        <div className="marker" style={{ position: "absolute", left: 60, top: 40, fontSize: 64 }}>TAP TAP TAP TAP</div>
        <div className="hand" style={{ position: "absolute", left: 60, top: 130, fontSize: 40 }}>The PR was 1,284 lines. Approved at 1:52.</div>
        <div className="script" style={{ position: "absolute", left: 60, top: 190, fontSize: 48, color: "var(--red)" }}>archdev.ai · soon</div>
      </Panel>
    </AbsoluteFill>
  );
}

import { AbsoluteFill, Breath, Composition, Copy, Drone, Duck, Eyebrow, Pattern, Reveal, Rule, Scenes, Thump, defineScenes, registerRoot, useFormat, useFrame, useProgress } from "@clapper/core";
import { DATA } from "./data";
import "./theme.css";

/**
 * Starter spot. Three scenes, one root-level score, seconds-based timing.
 *
 *   pnpm preview            studio (scrub, [ ] jump between scenes)
 *   pnpm still -- --scene hook   first/middle/last frame of a scene
 *   pnpm review             out/review/spot: contact sheet, cut strips, loudness, lint, brief.md
 *   pnpm render             out/spot.mp4
 */
const SCENES = defineScenes(
  {
    hook: { seconds: 2.5 },
    proof: { seconds: 4, transition: { type: "fade", duration: "0.4s" } },
    end: { seconds: 3 },
  },
  { fps: 30 },
);

function Hook() {
  return (
    <AbsoluteFill className="spot" style={{ padding: 120 }}>
      <Eyebrow color="var(--accent)">{DATA.product}</Eyebrow>
      <Reveal at="0.2s" as="h1" className="display" style={{ fontSize: 120, margin: "24px 0 0" }}>
        {DATA.tagline}
      </Reveal>
      <Rule at="0.6s" color="var(--accent)" length={320} style={{ marginTop: 32 }} />
    </AbsoluteFill>
  );
}

function Proof() {
  const fmt = useFormat();
  const p = useProgress("0.3s", "1.2s");
  const frame = useFrame();
  return (
    <AbsoluteFill className="spot">
      <div style={{ position: "absolute", left: fmt.pick({ "9:16": 80, default: 120 }), top: fmt.pick({ "9:16": 400, default: 300 }), width: fmt.width - 240, height: 8, background: "var(--muted)", opacity: 0.3 }} />
      <div style={{ position: "absolute", left: fmt.pick({ "9:16": 80, default: 120 }), top: fmt.pick({ "9:16": 400, default: 300 }), width: (fmt.width - 240) * p, height: 8, background: "var(--accent)" }} />
      <Copy at="0.6s" x={120} y={fmt.pick({ "9:16": 460, default: 340 })} size={56} className="display mono">
        {DATA.proof}
      </Copy>
      <div className="mono" style={{ position: "absolute", right: 120, top: 120, color: "var(--muted)", fontSize: 20 }}>
        frame {frame}
      </div>
    </AbsoluteFill>
  );
}

function End() {
  return (
    <AbsoluteFill className="spot" style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column" }}>
      {/* instant anchor: something is on screen at local frame 0 so the hard cut never lands on an empty frame */}
      <Eyebrow color="var(--muted)" style={{ position: "absolute", top: 120, left: 120 }}>
        {DATA.url}
      </Eyebrow>
      <Reveal at={0} as="h1" className="display" style={{ fontSize: 96, margin: 0 }}>
        {DATA.product}
      </Reveal>
      <Reveal at="0.4s" className="mono" style={{ fontSize: 28, color: "var(--muted)", marginTop: 16 }}>
        {DATA.url}
      </Reveal>
    </AbsoluteFill>
  );
}

/** One continuous bed with a hit on each cut and a duck under the end card. */
function Score() {
  return (
    <>
      <Drone notes={["D2", "A2"]} volume={0.06} fadeIn={20} fadeOut={40} durationInFrames={SCENES.total} />
      <Breath at={SCENES.start("proof")} durationInFrames={SCENES.total - SCENES.start("proof")} volume={0.04} cutoff={600} />
      <Pattern bpm={92} step={0.5} at={SCENES.start("proof")} steps="D4 . A4 . F#4 . A4 ." wave="pluck" volume={0.1} reverb={0.4} repeat={2} />
      <Thump at={SCENES.start("proof")} volume={0.3} />
      <Duck at={SCENES.start("end")} depth={0.4} attack="0.2s" release="1s" />
    </>
  );
}

export function Spot() {
  return (
    <AbsoluteFill className="spot">
      <Score />
      <Scenes plan={SCENES}>
        <Scenes.Scene name="hook"><Hook /></Scenes.Scene>
        <Scenes.Scene name="proof"><Proof /></Scenes.Scene>
        <Scenes.Scene name="end"><End /></Scenes.Scene>
      </Scenes>
    </AbsoluteFill>
  );
}

function Root() {
  return <Composition id="spot" component={Spot} width={1920} height={1080} fps={30} scenes={SCENES} formats={{ "9:16": { width: 1080, height: 1920 } }} />;
}
registerRoot(Root);

import { AbsoluteFill, Camera, Chord, Easing, Panel, Pluck, Reveal, Scenes, Sequence, Thump, Typewriter, Typing, Whoosh, defineScenes, progress, roughEllipse, roughRect, useBoil, useFrame } from "@clapper/core";
import { Caption, PencilScratch as Scratch, SfxWord as Sfx } from "@clapper/core";
import { Grain } from "../kit";
import { Agents, Blank, FIG, INK, Open, PAPER, Plan, RED, Review, Score } from "../archdev3/archdev3";
import { POSES, Scribble, usePose } from "../archdev3/scribble";
import { D4 } from "./data";

/**
 * ARCHDEV v4 — the rage comic with a new door in and a new door out.
 * In: a close-up on the sketched laptop while "Agentic Engineers be like..."
 * is typed, then the camera pulls back into the story. Out: the website's
 * chaos framing, then an invitation and an email. No logo. 37.7 s.
 */
export const SCENES = defineScenes(
  { intro: { frames: 110 }, open: { frames: 90 }, plan: { frames: 175 }, agents: { frames: 210 }, review: { frames: 210 }, blank: { frames: 135 }, outro: { frames: 200 } },
  { fps: 30 },
);

/** Close-up on the machine: the back of a sketched laptop lid, the figure peeking over it, the line typing itself on the paper above. */
function Intro() {
  const seed = useBoil(4);
  const frame = useFrame();
  const pose = usePose([{ at: 0, pose: { ...POSES.typing, pupil: 1, tilt: 4, hy: 6 } }, { at: 80, pose: "typing", ease: "inOutCubic" }]);
  const PULL = 78;
  const lid = { x: FIG.x - 260, y: FIG.y - 222, w: 520, h: 184 };
  return (
    <Camera keyframes={[{ frame: 0, zoom: 2, x: 960, y: 600 }, { frame: PULL, zoom: 2, x: 960, y: 600 }, { frame: 110, zoom: 1, x: 960, y: 540, easing: Easing.inOutCubic }]}>
      <Panel seed={seed}>
        <Scribble pose={pose} x={FIG.x} y={FIG.y} typing={frame < PULL + 10 ? 0.9 : 0.4} fury={frame >= 12 && frame < PULL ? 0.22 : 0} />
        <svg width={1760} height={920} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
          <path d={roughRect(lid.x, lid.y, lid.w, lid.h, seed + 401, 2.2)} fill={PAPER} stroke={INK} strokeWidth={4.5} />
          <path d={roughRect(lid.x + 14, lid.y + 14, lid.w - 28, lid.h - 28, seed + 402, 1.4)} fill="none" stroke={INK} strokeWidth={2} opacity={0.35} />
          <path d={roughEllipse(lid.x + lid.w / 2, lid.y + lid.h / 2, 14, 14, seed + 403, 1)} fill="none" stroke={INK} strokeWidth={3} opacity={0.5} />
        </svg>
        <div className="marker" data-copy="" style={{ position: "absolute", left: 420, top: 262, width: 920, fontSize: 58, lineHeight: 1.1, color: INK, whiteSpace: "nowrap" }}>
          <Typewriter text={D4.intro} at={12} cps={13} cursor={false} />
        </div>
        <Typing text={D4.intro} at={12} cps={13} volume={0.24} />
        <Scratch at={0} volume={0.09} length={12} />
        <Whoosh at={PULL} durationInFrames={26} from={420} to={1400} volume={0.09} name="pull-out" />
        <Pluck note="C4" at={PULL + 4} volume={0.12} reverb={0.35} name="intro-pluck" />
      </Panel>
    </Camera>
  );
}

/** The website's chaos framing, then the invitation. The figure turns to face us. */
function Outro() {
  const seed = useBoil(4);
  const frame = useFrame();
  const CHAOS = 58;
  const TALK = 104;
  const pose = usePose([
    { at: 0, pose: "dead" },
    { at: CHAOS, pose: { ...POSES.dead, hy: 8, tilt: 4 }, ease: "outBack" },
    { at: TALK - 6, pose: { ...POSES.happy, pupil: 0, mouth: 0.45, brow: -0.15, eyes: 1.05 }, ease: "outBack" },
    { at: TALK + 60, pose: { ...POSES.happy, pupil: 0, mouth: 0.55, brow: -0.2, eyes: 1.05, tilt: -3 }, ease: "inOutCubic" },
  ]);
  const chaosIn = progress(frame, CHAOS, 10, Easing.outBack);
  return (
    <Panel seed={seed}>
      <Scribble pose={pose} x={FIG.x} y={FIG.y} blinkPeriod={70} />
      <Caption at={4} w={1010} size={38}>{D4.outroCaption}</Caption>
      {frame >= CHAOS && (
        <div className="marker" data-copy="" style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", fontSize: 128, lineHeight: 1, color: RED, transform: `rotate(-2deg) scale(${chaosIn})`, transformOrigin: "center", whiteSpace: "nowrap" }}>
          {D4.chaos}
        </div>
      )}
      <Reveal at={TALK} duration={22} className="hand" style={{ position: "absolute", left: 0, right: 0, top: 796, textAlign: "center", fontSize: 50, color: INK }}>
        {D4.talk}
      </Reveal>
      <Reveal at={TALK + 34} duration={24} className="script" style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center", fontSize: 64, color: RED }}>
        {D4.email}
      </Reveal>
      <Scratch at={4} volume={0.09} />
      <Thump at={CHAOS} volume={0.42} from={150} to={52} name="chaos-hit" />
      <Scratch at={CHAOS} volume={0.12} length={12} />
      <Scratch at={TALK} volume={0.08} length={14} />
      <Scratch at={TALK + 34} volume={0.09} length={16} pan={0.15} />
    </Panel>
  );
}

export function ArchDev4() {
  const S = SCENES;
  return (
    <AbsoluteFill className="archdev3">
      <Score
        plan={S}
        tail={
          <Sequence from={S.start("outro")} durationInFrames={S.duration("outro")} name="score-outro">
            <Chord at={10} notes={["C3", "G3", "E4", "B4"]} wave="epiano" strum={3} ring={3} volume={0.09} reverb={0.5} width={0.5} name="outro-chord" />
            <Chord at={100} notes={["A2", "E3", "C4", "G4"]} wave="epiano" strum={4} ring={3.5} volume={0.08} reverb={0.55} width={0.6} name="talk-chord" />
            <Pluck note="C6" at={140} volume={0.14} reverb={0.5} name="email-ding" />
          </Sequence>
        }
      />
      <Scenes plan={S}>
        <Scenes.Scene name="intro"><Intro /></Scenes.Scene>
        <Scenes.Scene name="open"><Open /></Scenes.Scene>
        <Scenes.Scene name="plan"><Plan /></Scenes.Scene>
        <Scenes.Scene name="agents"><Agents /></Scenes.Scene>
        <Scenes.Scene name="review"><Review /></Scenes.Scene>
        <Scenes.Scene name="blank"><Blank /></Scenes.Scene>
        <Scenes.Scene name="outro"><Outro /></Scenes.Scene>
      </Scenes>
      <Grain opacity={0.05} blend="multiply" tile={280} />
    </AbsoluteFill>
  );
}

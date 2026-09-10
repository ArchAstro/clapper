import { AbsoluteFill, DeskTap, FeltPiano, Scenes, Sequence } from "@archastro/clapper-core";
import { Agents, Blank, Open, Plan, Review } from "../archdev3/archdev3";
import { Intro, Outro, SCENES } from "../archdev4/archdev4";
import { Grain } from "../kit";

export { SCENES };

/** One recurring idea, played with a loose hand and overlapping pedal. */
function FeltPhrase({
  at,
  notes,
  step = 16,
  volume = 0.12,
  ring = 2.7,
  length,
  name,
}: {
  at: number;
  notes: string[];
  step?: number;
  volume?: number;
  ring?: number;
  length?: number;
  name: string;
}) {
  const timing = [0, 1, -1, 2];
  const velocity = [0.82, 1, 0.91, 0.74];
  return (
    <>
      {notes.map((note, i) => (
        <FeltPiano
          key={`${note}-${i}`}
          note={note}
          at={at + i * step + timing[i % 4]}
          length={length}
          ring={ring + i * 0.08}
          volume={volume * velocity[i % 4]}
          pan={-0.16 + (0.32 * i) / Math.max(1, notes.length - 1)}
          spread={0.08}
          reverb={0.5}
          detune={[-1.5, 0.8, -0.4, 1.1][i % 4]}
          name={`${name}-${i}`}
        />
      ))}
    </>
  );
}

const SCORE_CHORDS = [
  [36, 48, 55, 59, 60, 64, 67, 71, 76, 79, 83, 88], // Cmaj7
  [45, 52, 55, 60, 64, 67, 69, 72, 76, 81, 84, 88], // Am7
  [41, 48, 52, 57, 60, 64, 69, 72, 76, 81, 84, 88], // Fmaj7
  [43, 50, 52, 59, 62, 67, 71, 74, 79, 83, 86, 88], // G6
];
const SCORE_CONTOUR = [0, 0.34, 0.16, 0.56, 0.3, 0.72, 0.46, 0.88, 0.62, 1];

/** One uninterrupted performance: tempo and playable register open continuously toward 2 AM. */
function EscalatingPiano({ end }: { end: number }) {
  const events: { at: number; midi: number; volume: number; ring: number; length: number; pan: number }[] =
    [];
  const start = 10;
  let at = start;
  let i = 0;
  while (at < end - 3) {
    const p = (at - start) / (end - start);
    const spacing = Math.max(4, Math.round(21 - 17 * Math.pow(p, 1.18)));
    const low = Math.max(0, 4 - Math.floor(p * 5));
    const high = Math.min(11, 7 + Math.floor(p * 5));
    const chord = SCORE_CHORDS[Math.floor(i / 16) % SCORE_CHORDS.length];
    const slot = Math.round(SCORE_CONTOUR[i % SCORE_CONTOUR.length] * (high - low));
    const midi = chord[low + slot];
    const maxLength = Math.max(3, end - at);
    const length = Math.min(maxLength, Math.max(18, Math.round(88 - p * 55)));
    const accent = i % 8 === 0 ? 1 : i % 4 === 2 ? 0.86 : 0.72;
    events.push({
      at,
      midi,
      volume: (0.09 - p * 0.018) * accent,
      ring: 2.7 - p * 1.55,
      length,
      pan: Math.max(-0.28, Math.min(0.28, ((midi - 60) / 28) * 0.28)),
    });
    at += spacing + [0, 1, -1, 0][i % 4];
    i++;
  }
  return (
    <>
      {events.map((event, index) => (
        <FeltPiano
          key={index}
          note={440 * Math.pow(2, (event.midi - 69) / 12)}
          at={event.at}
          length={event.length}
          ring={event.ring}
          volume={event.volume}
          pan={event.pan}
          spread={0.07}
          reverb={0.48}
          detune={[-1.1, 0.6, -0.3, 0.9][index % 4]}
          name={`continuous-${index}`}
        />
      ))}
    </>
  );
}

/**
 * Indie animated-short score: one felt-piano motif, quiet desk percussion and
 * real negative space. Foley stays attached to physical actions in the scenes.
 */
function IndieScore() {
  const S = SCENES;
  return (
    <>
      <EscalatingPiano end={S.start("blank")} />

      <Sequence from={S.start("blank")} durationInFrames={S.duration("blank")} name="v5-blank-score">
        <FeltPhrase
          at={16}
          notes={["C4", "G4", "E4", "D4"]}
          step={27}
          volume={0.026}
          ring={3.4}
          length={34}
          name="two-am-lullaby"
        />
      </Sequence>

      <Sequence from={S.start("outro")} durationInFrames={S.duration("outro")} name="v5-outro-score">
        <FeltPhrase at={10} notes={["C4", "E4", "G4", "B4"]} step={8} volume={0.11} name="return-home" />
        <DeskTap at={58} volume={0.18} pitch={125} name="chaos-word" />
        <FeltPhrase at={104} notes={["F3", "C4", "E4", "A4"]} step={5} volume={0.14} name="invitation" />
        <FeltPiano note="C6" at={140} ring={2.8} volume={0.12} pan={0.16} reverb={0.58} name="email" />
      </Sequence>
    </>
  );
}

export function ArchDev5() {
  const S = SCENES;
  return (
    <AbsoluteFill className="archdev3">
      <IndieScore />
      <Scenes plan={S}>
        <Scenes.Scene name="intro">
          <Intro showLaptop={false} />
        </Scenes.Scene>
        <Scenes.Scene name="open">
          <Open />
        </Scenes.Scene>
        <Scenes.Scene name="plan">
          <Plan />
        </Scenes.Scene>
        <Scenes.Scene name="agents">
          <Agents roundRage />
        </Scenes.Scene>
        <Scenes.Scene name="review">
          <Review pileup />
        </Scenes.Scene>
        <Scenes.Scene name="blank">
          <Blank />
        </Scenes.Scene>
        <Scenes.Scene name="outro">
          <Outro />
        </Scenes.Scene>
      </Scenes>
      <Grain opacity={0.05} blend="multiply" tile={280} />
    </AbsoluteFill>
  );
}

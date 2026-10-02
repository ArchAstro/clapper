import { Composition, Easing, interpolate, registerRoot, Scenes, useFrame } from "@archastro/clapper-core";
import { ScoreAudio } from "@archastro/clapper-core/music";
import { NarrationAudio } from "@archastro/clapper-core/narration";
import beats from "./beats.json";
import { Bookends } from "./bookends";
import { Contexts } from "./contexts";
import narration from "./narration";
import { FPS, lineStarts, SCENES } from "./plan";
import { RocScenes } from "./roc";
import score from "./score";
import "./theme.css";

type Beat = { id: string; chapter?: string; title?: string; sub?: string; text?: string };
const BEATS = beats as Beat[];
const PARTS = ["Idea", "Build ROC", "Ranking math", "Precision–recall", "Other contexts", "Use it"];
const partOf = (b: Beat) => (b.chapter ? Number(b.chapter.slice(0, 2)) - 1 : -1);
// Rail segments are proportional to each part's running time.
const PART_SPANS = PARTS.map((_, p) => {
  const ids = BEATS.filter((b) => partOf(b) === p).map((b) => b.id);
  const start = Math.min(...ids.map((id) => SCENES.start(id))),
    end = Math.max(...ids.map((id) => SCENES.start(id) + SCENES.duration(id)));
  return { start, end };
});

function Rail({ index }: { index: number }) {
  const f = useFrame(),
    global = SCENES.start(BEATS[index].id) + f,
    part = partOf(BEATS[index]);
  return (
    <div className="rail">
      {PARTS.map((name, p) => {
        const s = PART_SPANS[p],
          fill = Math.max(0, Math.min(1, (global - s.start) / (s.end - s.start)));
        return (
          <div key={name} className={`seg${p === part ? " active" : ""}`} style={{ flex: s.end - s.start }}>
            <div className="fill" style={{ width: `${fill * 100}%` }} />
            {name}
          </div>
        );
      })}
    </div>
  );
}

function Shot({ index }: { index: number }) {
  const f = useFrame(),
    b = BEATS[index],
    d = SCENES.duration(b.id),
    L = lineStarts(b.id);
  // Soft scene transitions: the header settles in, the canvas rises; everything eases out at the cut.
  const enter = interpolate(f, [0, 16], [0, 1], { easing: Easing.outCubic }),
    exit = interpolate(f, [d - 10, d], [1, 0], { easing: Easing.inCubic }),
    headIn = interpolate(f, [0, 18], [14, 0], { easing: Easing.outCubic });
  if (!b.chapter) return <Bookends id={b.id} f={f} duration={d} />;
  return (
    <div className="stage" style={{ opacity: exit }}>
      <div className="chapter" style={{ opacity: enter }}>
        {b.chapter}
      </div>
      <h1
        className="title"
        data-copy
        style={{
          fontSize: (b.title?.length ?? 0) > 52 ? 37 : 42,
          opacity: enter,
          transform: `translateY(${headIn}px)`,
        }}
      >
        {b.title}
      </h1>
      <p
        className="subtitle"
        data-copy
        style={{ opacity: interpolate(f, [6, 24], [0, 1]), transform: `translateY(${headIn * 0.6}px)` }}
      >
        {b.sub}
      </p>
      <div className="canvas" style={{ opacity: enter, transform: `translateY(${headIn * 0.8}px)` }}>
        {b.id in ROC_IDS ? (
          <RocScenes id={b.id} f={f} duration={d} L={L} />
        ) : (
          <Contexts id={b.id} f={f} duration={d} L={L} />
        )}
      </div>
      <Rail index={index} />
    </div>
  );
}
const ROC_IDS: Record<string, true> = Object.fromEntries(
  [
    "intro",
    "map",
    "scores",
    "threshold",
    "rates",
    "sweep",
    "area",
    "pairs",
    "bridge",
    "rigor",
    "ties",
    "baselines",
    "calibration",
  ].map((id) => [id, true]),
);
function Film() {
  return (
    <div className="film">
      <ScoreAudio score={score} volume={0.32} />
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
    id="auc-ml"
    component={Film}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={SCENES.total}
    scenes={SCENES}
  />
));

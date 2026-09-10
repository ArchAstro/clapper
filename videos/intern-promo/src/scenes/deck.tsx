import { Animate, interpolate, Pad, Sequence, SplitText, useFrame, Whoosh } from "@archastro/clapper-core";
import { Dark, Kicker } from "../ui";

export const DECK_LEN = 130;

const FILES = [
  { name: "Q3_review_v7_FINAL.pptx", meta: "41 slides · shared in #exec", rot: -6, x: 1040, y: 300 },
  { name: "Q3_review_v7_FINAL_final.pptx", meta: "43 slides · 'use this one'", rot: 4, x: 1180, y: 430 },
  { name: "oncall-rotation (2).xlsx", meta: "last edited 6 weeks ago", rot: -3, x: 1000, y: 570 },
  { name: "launch-brief-v12.docx", meta: "14 comments, 0 resolved", rot: 5, x: 1230, y: 700 },
];

/** Scene 1: the problem. A pile of decks and docs nobody reopens. */
export function DeckScene() {
  const frame = useFrame();
  const drift = interpolate(frame, [0, DECK_LEN], [0, -18]);
  return (
    <Dark>
      <Pad notes={["A2", "E3", "C4"]} volume={0.06} fadeIn={20} fadeOut={24} />
      <Whoosh at={4} from={200} to={1800} volume={0.18} />
      <div style={{ position: "absolute", left: 140, top: 300, width: 800 }}>
        <Animate from={{ opacity: 0, y: 10 }} at={6} duration={20}>
          <Kicker color="var(--dark-muted)">Every week</Kicker>
        </Animate>
        <h1
          className="display"
          style={{ margin: "22px 0 0", fontSize: 96, lineHeight: 1.02, color: "var(--dark-ink)" }}
        >
          <SplitText
            text={"Another deck.\nAnother doc\nnobody reopens."}
            by="word"
            each={4}
            at={14}
            duration={26}
            from={{ opacity: 0, y: 34, blur: 6 }}
          />
        </h1>
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${drift}px)` }}>
        {FILES.map((f, i) => (
          <Animate
            key={f.name}
            at={10 + i * 7}
            duration={30}
            spring="gentle"
            from={{ opacity: 0, y: 220, rotate: f.rot * 3 }}
            to={{ rotate: f.rot }}
            style={{ position: "absolute", left: f.x, top: f.y, width: 560 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "22px 26px",
                borderRadius: 14,
                background: "#1f1b12",
                border: "1px solid var(--dark-line)",
                boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 66,
                  borderRadius: 6,
                  background: "#2b2820",
                  border: "1px solid #3a362b",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--dark-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                {f.name.split(".").pop()?.toUpperCase()}
              </div>
              <div>
                <div className="mono" style={{ fontSize: 24, color: "var(--dark-ink)" }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 20, color: "var(--dark-muted)", marginTop: 6 }}>{f.meta}</div>
              </div>
            </div>
          </Animate>
        ))}
      </div>
      <Sequence from={95} name="strike">
        <Animate
          from={{ opacity: 0 }}
          duration={12}
          style={{ position: "absolute", left: 140, top: 700, fontSize: 30, color: "var(--dark-muted)" }}
        >
          Slide 12 of 43. Version seven. Final, final.
        </Animate>
      </Sequence>
    </Dark>
  );
}

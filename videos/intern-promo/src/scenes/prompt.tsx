import {
  Animate,
  Camera,
  Chime,
  Easing,
  Pad,
  Sequence,
  Typewriter,
  useFrame,
  Whoosh,
} from "@archastro/clapper-core";
import { Dot, Paper, Rise, TypeClicks } from "../ui";

export const PROMPT_LEN = 280;
const PROMPT =
  "Make us an on-call page: who has the pager, how to escalate, the next four weeks of rotation.";
const TYPE_AT = 22;
const TYPE_CPS = 40;
const REPLY_AT = 128;
const ZOOM_AT = 196;

/** Scene 3: ask the agent you already have. It replies with a URL. */
export function PromptScene() {
  const frame = useFrame();
  const cardLeft = 340;
  const cardTop = 150;
  return (
    <Paper>
      <Pad notes={["C3", "G3", "E4"]} volume={0.05} fadeIn={0} fadeOut={20} />
      <TypeClicks text={PROMPT} at={TYPE_AT} cps={TYPE_CPS} volume={0.09} />
      <Chime at={REPLY_AT} notes={["G5", "C6"]} spacing={4} volume={0.28} />
      <Whoosh at={ZOOM_AT} from={400} to={2400} volume={0.12} />
      <Camera
        keyframes={[
          { frame: 0, zoom: 1 },
          { frame: ZOOM_AT, zoom: 1 },
          { frame: ZOOM_AT + 55, x: cardLeft + 330, y: cardTop + 372, zoom: 2.0, easing: Easing.inOutCubic },
        ]}
      >
        <Rise
          at={0}
          duration={26}
          y={40}
          style={{ position: "absolute", left: cardLeft, top: cardTop, width: 1240 }}
        >
          <div
            style={{
              borderRadius: 24,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              boxShadow: "0 30px 80px rgba(27,24,17,0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "22px 32px",
                borderBottom: "1px solid var(--line)",
                background: "var(--paper-high)",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--ink)",
                  color: "var(--dark-ink)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 20,
                }}
              >
                C
              </span>
              <span style={{ fontSize: 26, fontWeight: 600 }}>Claude</span>
              <span
                style={{
                  fontSize: 20,
                  color: "var(--muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginLeft: 6,
                }}
              >
                <Dot size={10} pulse={false} /> connected to Intern
              </span>
            </div>
            <div
              style={{
                padding: "34px 32px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 28,
                minHeight: 520,
              }}
            >
              {/* user bubble */}
              <Rise at={12} duration={20} style={{ alignSelf: "flex-end", maxWidth: 900 }}>
                <div
                  style={{
                    background: "var(--ink)",
                    color: "var(--dark-ink)",
                    borderRadius: "22px 22px 6px 22px",
                    padding: "22px 30px",
                    fontSize: 30,
                    lineHeight: 1.4,
                  }}
                >
                  <Typewriter text={PROMPT} at={TYPE_AT} cps={TYPE_CPS} cursorAfter={false} />
                </div>
              </Rise>
              {/* thinking */}
              <Sequence
                from={TYPE_AT + 70}
                durationInFrames={REPLY_AT - (TYPE_AT + 70)}
                layout="none"
                name="thinking"
              >
                <Animate
                  from={{ opacity: 0 }}
                  duration={10}
                  style={{ display: "flex", gap: 10, padding: "12px 4px" }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background: "var(--muted)",
                        opacity: 0.35 + 0.65 * Math.max(0, Math.sin(((frame - i * 5) / 30) * Math.PI * 2)),
                      }}
                    />
                  ))}
                </Animate>
              </Sequence>
              {/* reply */}
              <Sequence from={REPLY_AT} layout="none" name="reply">
                <Rise at={0} duration={26} y={24} style={{ maxWidth: 940 }}>
                  <div style={{ fontSize: 30, lineHeight: 1.4, color: "var(--ink)" }}>
                    Built it, published it, and locked it to your company.
                  </div>
                  <div
                    style={{
                      marginTop: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "20px 28px",
                      borderRadius: 16,
                      border: "1px solid var(--line)",
                      background: "var(--paper-high)",
                    }}
                  >
                    <Dot />
                    <span className="mono" style={{ fontSize: 30, color: "var(--accent-deep)" }}>
                      oncall.acme.tryintern.dev
                    </span>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 24, color: "var(--muted)" }}>
                    Company sign-in, a database, and a git repo included.
                  </div>
                </Rise>
              </Sequence>
            </div>
          </div>
        </Rise>
      </Camera>
    </Paper>
  );
}

import {
  Animate,
  Chime,
  Click,
  Pad,
  Sequence,
  SplitText,
  Stagger,
  Typewriter,
} from "@archastro/clapper-core";
import { Chip, Kicker, Paper, Rise, TypeClicks } from "../ui";

export const CONNECT_LEN = 240;
const AGENTS = ["Claude", "ChatGPT", "Cowork", "Grok", "Codex", "Cursor"];
const CMD = "claude mcp add --transport http --scope user intern https://tryintern.dev/mcp";
const CMD_AT = 100;
const CMD_CPS = 36;
const DONE_AT = 180;

/** Scene 6: connect the agent you already have. One command. */
export function ConnectScene() {
  return (
    <Paper>
      <Pad notes={["G3", "D4", "B4"]} volume={0.045} fadeIn={10} fadeOut={20} />
      {AGENTS.map((_, i) => (
        <Click key={i} at={36 + i * 5} volume={0.1} freq={1100 + i * 90} name={`chip${i}`} />
      ))}
      <TypeClicks text={CMD} at={CMD_AT} cps={CMD_CPS} volume={0.08} />
      <Chime at={DONE_AT} notes={["C5", "G5"]} spacing={4} volume={0.26} />
      <div style={{ position: "absolute", left: 120, top: 120, width: 1680 }}>
        <Rise at={0} duration={20}>
          <Kicker>Connect your agent</Kicker>
        </Rise>
        <h2 className="display" style={{ margin: "18px 0 0", fontSize: 96, lineHeight: 1.02 }}>
          <SplitText
            text={"Works with the agent\nyou already have."}
            by="word"
            each={4}
            at={6}
            duration={26}
            from={{ opacity: 0, y: 40 }}
          />
        </h2>
        <div style={{ marginTop: 44, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Stagger each={5} at={36} duration={26} spring="wobbly" from={{ opacity: 0, y: 26, scale: 0.7 }}>
            {AGENTS.map((a) => (
              <Chip key={a}>{a}</Chip>
            ))}
          </Stagger>
        </div>
      </div>
      <Animate
        from={{ opacity: 0, y: 60 }}
        at={84}
        duration={28}
        style={{ position: "absolute", left: 120, top: 640, width: 1680 }}
      >
        <div
          style={{
            borderRadius: 20,
            background: "var(--dark)",
            color: "var(--dark-ink)",
            padding: "34px 40px",
            boxShadow: "0 30px 70px rgba(27,24,17,0.25)",
            minHeight: 300,
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span
                key={c}
                style={{ width: 14, height: 14, borderRadius: 999, background: c, opacity: 0.9 }}
              />
            ))}
            <span className="mono" style={{ marginLeft: 12, fontSize: 18, color: "var(--dark-muted)" }}>
              terminal
            </span>
          </div>
          <div className="mono" style={{ fontSize: 34, lineHeight: 1.5 }}>
            <span style={{ color: "var(--dark-muted)" }}>$ </span>
            <Typewriter text={CMD} at={CMD_AT} cps={CMD_CPS} cursorAfter={false} />
          </div>
          <Sequence from={DONE_AT} layout="none" name="connected">
            <Animate
              from={{ opacity: 0, y: 8 }}
              duration={14}
              className="mono"
              style={{ marginTop: 22, fontSize: 30, color: "#7fb894" }}
            >
              ✓ Connected to Intern. Ask for a site.
            </Animate>
          </Sequence>
        </div>
      </Animate>
    </Paper>
  );
}

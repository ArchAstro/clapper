import { Animate, Click, interpolate, Pad, SplitText, Stagger, useFrame } from "@clapper/core";
import { Chip, Dot, Kicker, Paper, Rise, SiteFrame } from "../ui";

export const SITE_LEN = 280;

const ROWS = [
  ["Aug 17", "Alex Rivera", "Sam Chen", true],
  ["Aug 24", "Priya Patel", "Marcus Webb", false],
  ["Aug 31", "Sam Chen", "Alex Rivera", false],
  ["Sep 7", "Marcus Webb", "Priya Patel", false],
  ["Sep 14", "Alex Rivera", "Jo Lin", false],
] as const;

const CHECKS = ["Company sign-in", "A database that saves", "A git repo you own", "Private by default"];
const ROWS_AT = 46;

/** Scene 4: the site itself assembling, plus what every site ships with. */
export function SiteScene() {
  const frame = useFrame();
  const push = interpolate(frame, [0, SITE_LEN], [1, 1.04]);
  return (
    <Paper>
      <Pad notes={["F3", "A3", "C4"]} volume={0.05} fadeIn={10} fadeOut={20} />
      {ROWS.map((_, i) => (
        <Click key={i} at={ROWS_AT + i * 6} volume={0.08} freq={1500} name={`row${i}`} />
      ))}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 110,
          transform: `scale(${push})`,
          transformOrigin: "50% 50%",
        }}
      >
        <Animate from={{ opacity: 0, y: 90, scale: 0.96 }} at={0} duration={34} spring="smooth">
          <SiteFrame url="oncall.acme.tryintern.dev" width={1100} bodyStyle={{ minHeight: 760 }}>
            <Rise
              at={8}
              duration={20}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 22,
                color: "var(--muted)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <Dot /> On duty
            </Rise>
            <Rise
              at={16}
              duration={24}
              className="display"
              style={{ fontSize: 68, lineHeight: 1.05, marginTop: 18 }}
            >
              Alex Rivera has the pager.
            </Rise>
            <Rise
              at={28}
              duration={22}
              className="mono"
              style={{
                marginTop: 20,
                fontSize: 24,
                color: "var(--muted)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <code
                style={{
                  background: "var(--paper-high)",
                  border: "1px solid var(--line)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  color: "var(--ink)",
                }}
              >
                /oncall page primary
              </code>
              <span>in</span>
              <code
                style={{
                  background: "var(--paper-high)",
                  border: "1px solid var(--line)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  color: "var(--ink)",
                }}
              >
                #incidents
              </code>
            </Rise>
            <div style={{ marginTop: 34, borderTop: "1px solid var(--line)" }}>
              {ROWS.map(([date, primary, secondary, current], i) => (
                <Animate
                  key={date}
                  from={{ opacity: 0, x: -24 }}
                  at={ROWS_AT + i * 6}
                  duration={22}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 1fr",
                    padding: "18px 0",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 26,
                    background: current
                      ? "linear-gradient(90deg, rgba(46,92,70,0.08), transparent)"
                      : undefined,
                    color: current ? "var(--accent-deep)" : "var(--ink)",
                    fontWeight: current ? 600 : 400,
                  }}
                >
                  <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{date}</span>
                  <span>{primary}</span>
                  <span style={{ color: "var(--muted)" }}>{secondary}</span>
                </Animate>
              ))}
            </div>
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <Stagger each={5} at={88} from={{ opacity: 0, y: 14 }}>
                {["API 5xx spike", "Queue backlog", "DB failover"].map((r) => (
                  <span
                    key={r}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: "1px solid var(--line)",
                      background: "var(--paper-high)",
                      fontSize: 22,
                      color: "var(--muted)",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </Stagger>
            </div>
          </SiteFrame>
        </Animate>
      </div>
      <div style={{ position: "absolute", left: 1310, top: 250, width: 520 }}>
        <Rise at={54} duration={22}>
          <Kicker>What you get</Kicker>
        </Rise>
        <h2 className="display" style={{ margin: "20px 0 0", fontSize: 72, lineHeight: 1.04 }}>
          <SplitText
            text={"A real site,\nready from the\nfirst click."}
            by="word"
            each={4}
            at={62}
            duration={26}
            from={{ opacity: 0, y: 30 }}
          />
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "36px 0 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Stagger each={7} at={118} from={{ opacity: 0, x: 24 }}>
            {CHECKS.map((c) => (
              <li key={c} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                {c}
              </li>
            ))}
          </Stagger>
        </ul>
        <Rise at={160} duration={22} style={{ marginTop: 40 }}>
          <Chip>🔒&nbsp; Private to Acme</Chip>
        </Rise>
      </div>
    </Paper>
  );
}

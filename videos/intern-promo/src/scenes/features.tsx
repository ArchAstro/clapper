import {
  Animate,
  Camera,
  Chime,
  Counter,
  Easing,
  interpolate,
  Pad,
  Sequence,
  useFrame,
  useKeyframes,
  useSpring,
  Whoosh,
} from "@archastro/clapper-core";
import type { ReactNode } from "react";
import { Kicker, LockGlyph, Paper, Rise } from "../ui";

const PANEL = 130;
export const FEATURES_LEN = PANEL * 3;
const PANEL_W = 820;
const GAP = 240;
const X0 = 160;
const centers = [0, 1, 2].map((i) => X0 + i * (PANEL_W + GAP) + PANEL_W / 2);

/** Scene 5: three features; the camera pans across three panels. */
export function FeaturesScene() {
  return (
    <Paper>
      <Pad notes={["D3", "A3", "F#4"]} volume={0.05} fadeIn={10} fadeOut={20} />
      <Whoosh at={PANEL - 18} from={300} to={1600} volume={0.1} />
      <Whoosh at={PANEL * 2 - 18} from={300} to={1600} volume={0.1} />
      <Camera
        keyframes={[
          { frame: 0, x: centers[0], y: 560, zoom: 1.25 },
          { frame: PANEL - 22, x: centers[0], y: 560, zoom: 1.25 },
          { frame: PANEL, x: centers[1], y: 560, zoom: 1.25, easing: Easing.inOutQuint },
          { frame: PANEL * 2 - 22, x: centers[1], y: 560, zoom: 1.25 },
          { frame: PANEL * 2, x: centers[2], y: 560, zoom: 1.25, easing: Easing.inOutQuint },
        ]}
      >
        <Panel index={0} kicker="Forms and dashboards" title="Forms save. Dashboards update.">
          <Dashboard />
        </Panel>
        <Panel index={1} kicker="Shared Markdown" title="People and agents edit the same page.">
          <CoEdit />
        </Panel>
        <Panel index={2} kicker="Privacy" title="Private by default. Share when you choose.">
          <Privacy />
        </Panel>
      </Camera>
    </Paper>
  );
}

function Panel({
  index,
  kicker,
  title,
  children,
}: {
  index: number;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  const left = X0 + index * (PANEL_W + GAP);
  return (
    <Sequence from={index * PANEL} keepMounted layout="none" name={`panel ${index + 1}`}>
      <div style={{ position: "absolute", left, top: 230, width: PANEL_W }}>
        <Rise at={4} duration={20}>
          <Kicker>{kicker}</Kicker>
        </Rise>
        <Rise
          at={10}
          duration={24}
          className="display"
          style={{ fontSize: 60, lineHeight: 1.06, margin: "16px 0 0", minHeight: 130 }}
        >
          {title}
        </Rise>
        <Rise at={18} duration={26} y={40} style={{ marginTop: 30 }}>
          <div
            style={{
              borderRadius: 20,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              boxShadow: "0 24px 60px rgba(27,24,17,0.12)",
              padding: 34,
              minHeight: 440,
            }}
          >
            {children}
          </div>
        </Rise>
      </div>
    </Sequence>
  );
}

/* ------------------------------ panel 1 ----------------------------------- */

function Dashboard() {
  const frame = useFrame();
  const bars = [
    ["Jul", 0.54],
    ["Aug", 0.71],
    ["Sep", 0.88],
  ] as const;
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Headcount plan
      </p>
      <p className="display" style={{ margin: "10px 0 0", fontSize: 72, lineHeight: 1 }}>
        <Counter to={142} at={30} duration={50} />
        <span style={{ fontSize: 26, color: "var(--muted)", marginLeft: 14, fontFamily: "var(--font-body)" }}>
          requests tracked this quarter
        </span>
      </p>
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
        {bars.map(([m, w], i) => {
          const p = interpolate(frame, [36 + i * 8, 76 + i * 8], [0, 1], { easing: Easing.outExpo });
          return (
            <div
              key={m}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr",
                alignItems: "center",
                gap: 16,
                fontSize: 22,
                color: "var(--muted)",
              }}
            >
              <span>{m}</span>
              <span style={{ height: 22, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${w * 100}%`,
                    background: "var(--accent)",
                    transform: `scaleX(${p})`,
                    transformOrigin: "left",
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 30, borderTop: "1px solid var(--line)", fontSize: 22 }}>
        {[
          ["Team", "Role", "Start", true],
          ["Support", "Escalations lead", "Oct 6", false],
          ["Platform", "Storage engineer", "Nov 3", false],
        ].map(([a, b, c, head], i) => (
          <Animate
            key={String(a)}
            from={{ opacity: 0, x: -14 }}
            at={70 + i * 7}
            duration={18}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 0.8fr",
              padding: "12px 0",
              borderBottom: "1px solid var(--line)",
              color: head ? "var(--muted)" : "var(--ink)",
              fontWeight: head ? 600 : 400,
            }}
          >
            <span>{a}</span>
            <span>{b}</span>
            <span>{c}</span>
          </Animate>
        ))}
      </div>
      <Sequence from={95} layout="none" name="form saved">
        <Animate
          from={{ opacity: 0, y: 10 }}
          duration={14}
          style={{
            marginTop: 18,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 20,
            color: "var(--accent-deep)",
            fontWeight: 600,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--accent-soft)" }} /> Form
          submitted · total updated
        </Animate>
        <Chime notes={["E5"]} volume={0.18} />
      </Sequence>
    </div>
  );
}

/* ------------------------------ panel 2 ----------------------------------- */

function Cursor({
  name,
  color,
  keyframes,
}: {
  name: string;
  color: string;
  keyframes: { frame: number; x: number; y: number }[];
}) {
  const style = useKeyframes(
    keyframes.map((k) => ({ frame: k.frame, x: k.x, y: k.y, easing: Easing.inOutCubic })),
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, ...style, pointerEvents: "none" }}>
      <svg
        width="22"
        height="26"
        viewBox="0 0 22 26"
        style={{ display: "block", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}
      >
        <path d="M2 2 L20 13 L11.5 14.5 L7 24 Z" fill={color} stroke="#fff" strokeWidth="1.5" />
      </svg>
      <span
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          background: color,
          color: "#fff",
          fontSize: 16,
          fontWeight: 600,
          padding: "3px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </div>
  );
}

function CoEdit() {
  const frame = useFrame();
  const updated = frame >= 78;
  const hl = interpolate(frame, [78, 100], [0, 1], { easing: Easing.outExpo });
  return (
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 250px", gap: 24 }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            color: "var(--muted)",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <span>Markdown</span>
          <span style={{ color: "var(--accent)" }}>Saved</span>
        </div>
        <h3 className="display" style={{ margin: "14px 0 8px", fontSize: 40, lineHeight: 1.05 }}>
          Q4 launch brief
        </h3>
        <p style={{ margin: 0, fontSize: 20, color: "var(--muted)", lineHeight: 1.45 }}>
          What we need to publish, who it is for, and what must be ready before launch.
        </p>
        <h4 style={{ margin: "22px 0 6px", fontSize: 22 }}>Audience</h4>
        <p style={{ margin: 0, fontSize: 20, color: "var(--muted)", lineHeight: 1.45 }}>
          Product, design, and operations teams already using agents.
        </p>
        <h4 style={{ margin: "22px 0 6px", fontSize: 22 }}>Launch security checklist</h4>
        <p
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.45,
            padding: "4px 6px",
            marginLeft: -6,
            borderRadius: 6,
            background: `rgba(169,203,182,${hl * 0.55})`,
            color: updated ? "var(--ink)" : "var(--muted)",
          }}
        >
          {updated
            ? "Limit access to the launch team and keep a record of changes."
            : "Restrict who can edit before launch."}
        </p>
      </div>
      <aside style={{ borderLeft: "1px solid var(--line)", paddingLeft: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600 }}>
          Live activity{" "}
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent-soft)" }} />
        </div>
        <Rise
          at={40}
          duration={20}
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            background: "var(--paper-high)",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--ink)",
                color: "var(--dark-ink)",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
              }}
            >
              A
            </span>
            Alex’s agent
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 17, color: "var(--muted)", lineHeight: 1.4 }}>
            Updating the launch security checklist
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 17,
              fontWeight: 600,
              color: updated ? "var(--accent)" : "var(--muted)",
            }}
          >
            {updated ? "✓ Updated" : "Working…"}
          </p>
        </Rise>
      </aside>
      <Cursor
        name="Alice"
        color="#a23c2a"
        keyframes={[
          { frame: 20, x: 120, y: 300 },
          { frame: 60, x: 260, y: 214 },
          { frame: 100, x: 200, y: 236 },
          { frame: 130, x: 300, y: 250 },
        ]}
      />
      <Cursor
        name="Bob"
        color="#2e5c46"
        keyframes={[
          { frame: 30, x: 420, y: 120 },
          { frame: 70, x: 340, y: 160 },
          { frame: 110, x: 400, y: 100 },
        ]}
      />
      <Sequence from={78} layout="none" name="agent updated">
        <Chime notes={["D5", "A5"]} spacing={3} volume={0.2} />
      </Sequence>
    </div>
  );
}

/* ------------------------------ panel 3 ----------------------------------- */

function Privacy() {
  const frame = useFrame();
  const on = frame >= 60;
  const knob = useSpring({ delay: 60, config: "snappy", durationInFrames: 18 });
  const lockPop = useSpring({ delay: 24, config: "wobbly", durationInFrames: 30 });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            display: "grid",
            placeItems: "center",
            transform: `scale(${lockPop})`,
          }}
        >
          <LockGlyph size={44} />
        </span>
        <div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Every site starts inside your company.</p>
          <p style={{ margin: "6px 0 0", fontSize: 20, color: "var(--muted)" }}>
            Coworkers sign in. Nobody else can open it.
          </p>
        </div>
      </div>
      <Rise
        at={40}
        duration={22}
        style={{
          marginTop: 34,
          padding: "22px 24px",
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "var(--paper-high)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Share with another team</p>
          <p style={{ margin: "4px 0 0", fontSize: 18, color: "var(--muted)" }}>
            {on ? "Globex can open this site." : "Only Acme can open this site."}
          </p>
        </div>
        <span
          style={{
            width: 84,
            height: 46,
            borderRadius: 999,
            background: on ? "var(--accent)" : "#d8d8d0",
            position: "relative",
            transition: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 5,
              left: 5 + knob * 38,
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          />
        </span>
      </Rise>
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, fontSize: 22 }}>
        <span
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--dark-ink)",
          }}
        >
          Acme
        </span>
        <Animate
          from={{ opacity: 0, x: -10 }}
          at={68}
          duration={16}
          style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          <span style={{ color: "var(--muted)" }}>→</span>
          <span
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "2px solid var(--accent)",
              color: "var(--accent-deep)",
            }}
          >
            Globex
          </span>
        </Animate>
      </div>
      <Rise
        at={90}
        duration={20}
        style={{ marginTop: 26, fontSize: 20, color: "var(--muted)", lineHeight: 1.45 }}
      >
        Point your own domain at it, add two DNS records, and the certificate is handled for you.
      </Rise>
      <Sequence from={60} layout="none" name="toggle">
        <Chime notes={["A4", "E5"]} spacing={2} volume={0.16} />
      </Sequence>
    </div>
  );
}

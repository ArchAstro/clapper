import { Animate, Chime, Pad, SplitText, Stagger } from "@archastro/clapper-core";
import { Kicker, Paper, Rise } from "../ui";

export const PRICING_LEN = 190;

const PLANS = [
  ["Starter", "$19", "unlimited sites, unlimited coworkers"],
  ["Pro", "$49", "custom domains, more traffic"],
  ["Enterprise", "Custom", "SSO, SLAs, security review"],
];

/** Scene 7: one price for the whole company. */
export function PricingScene() {
  return (
    <Paper>
      <Pad notes={["C3", "G3", "E4"]} volume={0.05} fadeIn={10} fadeOut={20} />
      <Chime at={38} notes={["G5"]} volume={0.22} />
      <div style={{ position: "absolute", left: 120, top: 150, width: 1000 }}>
        <Rise at={0} duration={20}>
          <Kicker>Pricing</Kicker>
        </Rise>
        <h2 className="display" style={{ margin: "18px 0 0", fontSize: 92, lineHeight: 1.02 }}>
          <SplitText
            text={"Unlimited sites.\nUnlimited users."}
            by="word"
            each={4}
            at={6}
            duration={26}
            from={{ opacity: 0, y: 40 }}
          />
        </h2>
        <div style={{ marginTop: 56, display: "flex", alignItems: "baseline", gap: 22 }}>
          <Animate
            from={{ opacity: 0, scale: 0.55, y: 30 }}
            at={36}
            duration={34}
            spring="wobbly"
            className="display"
            style={{ fontSize: 210, lineHeight: 0.9, letterSpacing: "-0.03em", color: "var(--accent)" }}
          >
            $19
          </Animate>
          <Rise at={52} duration={22} style={{ fontSize: 40, color: "var(--muted)", lineHeight: 1.2 }}>
            /month
            <br />
            <span style={{ color: "var(--ink)" }}>for the whole company</span>
          </Rise>
        </div>
        <Rise
          at={86}
          duration={24}
          style={{ marginTop: 40, fontSize: 34, lineHeight: 1.4, color: "var(--muted)", maxWidth: 900 }}
        >
          No per-seat fee, no per-site fee. Pro is free for your first 14 days.
        </Rise>
      </div>
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 260,
          width: 560,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <Stagger each={8} at={100} duration={24} from={{ opacity: 0, x: 40 }}>
          {PLANS.map(([name, price, blurb]) => (
            <div
              key={name}
              style={{
                padding: "24px 28px",
                borderRadius: 18,
                border: `1px solid ${name === "Pro" ? "var(--accent)" : "var(--line)"}`,
                background: "var(--paper)",
                boxShadow: "0 16px 40px rgba(27,24,17,0.08)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                rowGap: 6,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 600 }}>
                {name}
                {name === "Pro" && (
                  <span
                    style={{
                      marginLeft: 12,
                      fontSize: 16,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      verticalAlign: "middle",
                    }}
                  >
                    Most popular
                  </span>
                )}
              </span>
              <span className="display" style={{ fontSize: 40 }}>
                {price}
              </span>
              <span style={{ gridColumn: "1 / -1", fontSize: 20, color: "var(--muted)" }}>{blurb}</span>
            </div>
          ))}
        </Stagger>
      </div>
    </Paper>
  );
}

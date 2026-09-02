import { Animate, Chime, Img, Pad, Sequence, staticFile, useSpring } from "@agenticvids/core";
import { Dark, Rise } from "../ui";

export const END_LEN = 170;

/** Scene 8: end card. */
export function EndScene() {
  const pop = useSpring({ delay: 8, config: "wobbly", durationInFrames: 34 });
  return (
    <Dark>
      <Pad notes={["F3", "A3", "C4", "E4"]} volume={0.06} fadeIn={16} fadeOut={50} />
      <Chime at={12} notes={["C5", "E5", "G5", "C6"]} spacing={3} volume={0.3} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${pop})`, opacity: Math.min(1, pop * 2) }}>
          <Img src={staticFile("intern-icon.svg")} style={{ width: 150, height: 150, borderRadius: 34, boxShadow: "0 30px 70px rgba(0,0,0,0.5)" }} />
          <span style={{ fontSize: 116, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--dark-ink)" }}>Intern</span>
        </div>
        <Rise at={40} duration={24} className="mono" style={{ fontSize: 46, color: "#7fb894" }}>
          tryintern.dev
        </Rise>
        <Rise at={62} duration={26} className="display" style={{ fontSize: 60, fontStyle: "italic", color: "var(--dark-muted)" }}>
          Send a site, not a deck.
        </Rise>
        <Rise at={90} duration={22} style={{ marginTop: 20, fontSize: 24, color: "var(--dark-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Pro free for 14 days · by ArchAstro
        </Rise>
      </div>
      <Sequence from={END_LEN - 24} layout="none" name="fade out">
        <Animate from={{ opacity: 0 }} duration={24} style={{ position: "absolute", inset: 0, background: "#000" }} />
      </Sequence>
    </Dark>
  );
}

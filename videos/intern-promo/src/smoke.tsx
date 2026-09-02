import { AbsoluteFill, Animate, Camera, Chime, Counter, Draw, Easing, Img, Sequence, SplitText, Stagger, Tone, Typewriter, interpolate, staticFile, useFrame, useSpring, useVideoConfig } from "@agenticvids/core";
import { Latex } from "@agenticvids/core/latex";

/** A 3s kitchen-sink composition used to validate the pipeline end-to-end. */
export function Smoke() {
  const frame = useFrame();
  const { fps, width, height } = useVideoConfig();
  const pop = useSpring({ delay: 5, config: "wobbly", durationInFrames: 25 });
  const rot = interpolate(frame, [0, fps * 3], [0, 360]);
  return (
    <AbsoluteFill className="promo" style={{ background: "linear-gradient(135deg,#fafaf8,#e9e9e4)", overflow: "hidden" }}>
      <Camera keyframes={[{ frame: 0, zoom: 1 }, { frame: 45, x: width * 0.3, y: height * 0.4, zoom: 1.8, easing: Easing.inOutCubic }, { frame: 80, zoom: 1 }]}>
        <div style={{ position: "absolute", left: 80, top: 60 }}>
          <SplitText text="Smoke test: sequences, springs, LaTeX, SVG, sound" by="word" each={2} style={{ fontSize: 44 }} className="display" />
        </div>
        <div style={{ position: "absolute", left: 80, top: 140, transform: `scale(${pop})`, transformOrigin: "left center", fontSize: 28 }} className="mono">
          <Typewriter text="$ claude mcp add --transport http intern https://tryintern.dev/mcp" cps={40} />
        </div>
        <div style={{ position: "absolute", left: 80, top: 220, fontSize: 40 }}>
          <Latex display>{String.raw`\int_0^1 x^2\,dx = \tfrac{1}{3}\qquad e^{i\pi}+1=0`}</Latex>
        </div>
        <svg width={420} height={300} style={{ position: "absolute", left: 760, top: 80 }} viewBox="0 0 420 300">
          <Draw at={10} duration={40} each={6}>
            <path d="M20 250 C 120 40, 300 40, 400 250" fill="none" stroke="#2e5c46" strokeWidth={6} strokeLinecap="round" />
            <circle cx={210} cy={150} r={60} fill="none" stroke="#a23c2a" strokeWidth={6} />
            <rect x={40} y={40} width={80} height={60} rx={10} fill="none" stroke="#1b1811" strokeWidth={4} />
          </Draw>
        </svg>
        <div style={{ position: "absolute", left: 80, top: 330, display: "flex", gap: 16 }}>
          <Stagger each={4} at={20} from={{ opacity: 0, y: 30, scale: 0.8 }} spring="wobbly">
            {["Claude", "ChatGPT", "Cowork", "Grok", "Codex"].map((n) => (
              <span key={n} style={{ padding: "10px 18px", borderRadius: 999, background: "#1b1811", color: "#f0ece0", fontSize: 22 }}>
                {n}
              </span>
            ))}
          </Stagger>
        </div>
        <div style={{ position: "absolute", left: 80, top: 420, fontSize: 96 }} className="display">
          $<Counter to={4.2} decimals={1} at={30} duration={40} />M
        </div>
        <Img src={staticFile("intern-icon.svg")} style={{ position: "absolute", right: 80, bottom: 60, width: 120, height: 120, transform: `rotate(${rot}deg)` }} />
        <Sequence from={40} durationInFrames={50} name="badge">
          <Animate from={{ opacity: 0, x: 60 }} duration={15} style={{ position: "absolute", right: 80, top: 60, background: "#2e5c46", color: "#eef4ef", padding: "12px 20px", borderRadius: 12, fontSize: 24 }}>
            Published to oncall.acme.tryintern.dev
          </Animate>
          <Chime notes={["C5", "E5", "G5"]} spacing={3} />
        </Sequence>
        {/* CSS-animated element: harness should freeze it to the frame clock */}
        <div style={{ position: "absolute", left: 600, bottom: 60, width: 40, height: 40, borderRadius: 8, background: "#3e8763", animation: "spin 2s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </Camera>
      <Tone at={0} freq="C3" durationInFrames={fps * 3} wave="triangle" volume={0.12} attack={0.3} sustain={1} release={0.5} fadeOut={20} />
    </AbsoluteFill>
  );
}

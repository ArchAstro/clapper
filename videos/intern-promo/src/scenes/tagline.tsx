import {
  Animate,
  Chime,
  Img,
  interpolate,
  Pad,
  SplitText,
  staticFile,
  useFrame,
} from "@archastro/clapper-core";
import { Paper, Rise, Wordmark } from "../ui";

export const TAGLINE_LEN = 140;

/** Scene 2: the promise. The landing page's own headline, in its own type. */
export function TaglineScene() {
  const frame = useFrame();
  const kb = interpolate(frame, [0, TAGLINE_LEN], [1.06, 1]);
  return (
    <Paper>
      <Pad notes={["C3", "G3", "E4"]} volume={0.055} fadeIn={16} fadeOut={20} />
      <Chime at={10} notes={["C5", "E5", "G5"]} spacing={3} volume={0.3} />
      <Rise at={0} duration={22} style={{ position: "absolute", left: 120, top: 84 }}>
        <Wordmark size={48} />
      </Rise>
      <Animate
        from={{ opacity: 0, x: 60 }}
        at={8}
        duration={34}
        style={{ position: "absolute", right: 0, top: 0, width: 760, height: 1080, overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            inset: "90px 120px 90px 0",
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 40px 90px rgba(27,24,17,0.22)",
          }}
        >
          <Img
            src={staticFile("cascade-range.webp")}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})` }}
          />
        </div>
      </Animate>
      <div style={{ position: "absolute", left: 120, top: 330, width: 1000 }}>
        <h1
          className="display"
          style={{ margin: 0, fontSize: 168, lineHeight: 0.98, letterSpacing: "-0.02em" }}
        >
          <SplitText
            text="Send a site,"
            by="word"
            each={5}
            at={12}
            duration={30}
            from={{ opacity: 0, y: 60 }}
          />
          <br />
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
            <SplitText
              text="not a deck"
              by="word"
              each={5}
              at={30}
              duration={30}
              from={{ opacity: 0, y: 60 }}
            />
          </em>
        </h1>
        <Rise
          at={60}
          duration={28}
          style={{ marginTop: 36, fontSize: 38, lineHeight: 1.35, color: "var(--muted)", maxWidth: 880 }}
        >
          Useful sites your agents build and publish for your team.
        </Rise>
      </div>
    </Paper>
  );
}

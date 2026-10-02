import { AP_STEPS, ROC } from "./data";
import { appear, C, ease, Plot, SVG, Text } from "./visuals";

/** Title card and end card: the film's identity, outside the lesson chrome. */
export function Bookends({ id, f, duration }: { id: string; f: number; duration: number }) {
  const out = id === "end" ? 1 - ease((f - (duration - 30)) / 30) : 1 - ease((f - (duration - 14)) / 14);
  if (id === "title") {
    const draw = ease((f - 10) / 75) * 6,
      word = appear(f, 34, 22),
      line = appear(f, 58, 18),
      sub = appear(f, 76, 18);
    return (
      <div className="stage" style={{ opacity: out }}>
        <div
          className="mono"
          style={{
            position: "absolute",
            left: 96,
            top: 168,
            fontSize: 19,
            letterSpacing: 2.4,
            color: C.pos,
            textTransform: "uppercase",
            opacity: line,
          }}
        >
          A visual lesson · machine learning metrics
        </div>
        <div
          className="serif"
          data-copy
          style={{
            position: "absolute",
            left: 88,
            top: 186,
            fontSize: 210,
            lineHeight: 1,
            letterSpacing: -4,
            color: C.ink,
            opacity: word,
            transform: `translateY(${(1 - word) * 24}px)`,
          }}
        >
          AUC
        </div>
        <div
          data-copy
          style={{
            position: "absolute",
            left: 96,
            top: 408,
            fontSize: 40,
            fontWeight: 650,
            letterSpacing: -0.8,
            opacity: line,
            transform: `translateY(${(1 - line) * 12}px)`,
          }}
        >
          Area under the curve
        </div>
        <div
          data-copy
          style={{
            position: "absolute",
            left: 97,
            top: 464,
            width: 560,
            fontSize: 23,
            lineHeight: 1.3,
            color: C.muted,
            opacity: sub,
          }}
        >
          What it measures, how to compute it by hand, and when the same letters mean something else.
        </div>
        <div style={{ position: "absolute", left: 0, top: 120, width: 1280, height: 490 }}>
          <SVG>
            <Plot
              x={760}
              y={40}
              w={400}
              h={360}
              points={ROC}
              upto={draw}
              fill={appear(f, 70, 30)}
              dot={draw < 6}
            />
          </SVG>
        </div>
      </div>
    );
  }
  // End card.
  // The two curves from the recap stay on screen across the cut as the anchor.
  const a = appear(f, 4, 18),
    b = appear(f, 24, 18),
    c = 1,
    d = appear(f, 70, 18);
  return (
    // A slow push-in keeps the closing hold alive.
    <div
      className="stage"
      style={{
        opacity: Math.min(out, 1),
        // Scale about the frame centre (the stage's own origin is its top-left corner).
        transform: (() => {
          const s = 1.5 * (1 + 0.025 * ease(f / duration));
          return `translate(${960 - 640 * s}px, ${540 - 360 * s}px) scale(${s})`;
        })(),
      }}
    >
      <div
        className="serif"
        data-copy
        style={{
          position: "absolute",
          left: 88,
          top: 70,
          fontSize: 150,
          lineHeight: 1,
          letterSpacing: -3,
          opacity: a,
          transform: `translateY(${(1 - a) * 18}px)`,
        }}
      >
        AUC
      </div>
      <div
        data-copy
        style={{
          position: "absolute",
          left: 96,
          top: 238,
          fontSize: 38,
          fontWeight: 650,
          letterSpacing: -0.6,
          opacity: b,
        }}
      >
        is a question, not just a number.
      </div>
      <div style={{ position: "absolute", left: 0, top: 60, width: 1280, height: 490, opacity: c }}>
        <SVG>
          <Plot
            x={740}
            y={30}
            w={180}
            h={160}
            points={ROC}
            fill={1}
            dot={false}
            xLabel="FPR"
            yLabel="TPR"
            ticks={[0, 1]}
          />
          <Text x={830} y={284} anchor="middle" size={30} color={C.pos} weight={700}>
            ROC area 7/9
          </Text>
          <Plot
            x={1000}
            y={30}
            w={180}
            h={160}
            points={AP_STEPS}
            color={C.blue}
            fill={1}
            dot={false}
            xLabel="Recall"
            yLabel="Precision"
            ticks={[0, 1]}
          />
          <Text x={1090} y={284} anchor="middle" size={30} color={C.blue} weight={700}>
            AP 29/36
          </Text>
        </SVG>
      </div>
      <div
        className="mono"
        data-copy
        style={{
          position: "absolute",
          left: 96,
          top: 392,
          fontSize: 19,
          letterSpacing: 0.6,
          color: C.ink,
          opacity: c,
          display: "flex",
          gap: 22,
        }}
      >
        {["Which curve?", "Which positive?", "Which population?", "Which range?", "Which average?"].map(
          (q) => (
            <span key={q}>{q}</span>
          ),
        )}
      </div>
      <div
        data-copy
        style={{
          position: "absolute",
          left: 96,
          top: 520,
          width: 1090,
          fontSize: 19,
          lineHeight: 1.45,
          color: C.ink,
          opacity: d,
          borderTop: `1px solid ${C.line}`,
          paddingTop: 12,
        }}
      >
        Synthetic six-payment example; illustrative numbers, not measured model performance. Narration:
        synthetic voice (Kokoro, af_heart). Sources: Fawcett 2006; Davis &amp; Goadrich 2006; scikit-learn,
        COCO and scikit-survival documentation. Made with Clapper.
      </div>
    </div>
  );
}

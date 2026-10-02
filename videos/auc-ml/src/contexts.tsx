import { AP_STEPS, PR, ROC, STATES } from "./data";
import type { LineAt } from "./roc";
import { Arrow, appear, C, Caption, Card, clamp, Eq, ease, In, Plot, SVG, Text } from "./visuals";

type SceneProps = { id: string; f: number; duration: number; L: LineAt };

/** A population as a dot field: positives first, flagged dots solid. */
function Field({
  x,
  y,
  cols,
  pos,
  neg,
  tp,
  fp,
  r,
  gap,
  flag,
}: {
  x: number;
  y: number;
  cols: number;
  pos: number;
  neg: number;
  tp: number;
  fp: number;
  r: number;
  gap: number;
  flag: number;
}) {
  const dots = [];
  for (let i = 0; i < pos + neg; i++) {
    const isPos = i < pos,
      flagged = isPos ? i < tp : i - pos < fp,
      cx = x + (i % cols) * gap,
      cy = y + Math.floor(i / cols) * gap,
      on = flagged ? flag : 0;
    dots.push(
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill={isPos ? (on > 0.5 ? C.pos : "#9fcbbd") : on > 0.5 ? C.neg : "#ddd5c8"}
      />,
    );
  }
  return <g>{dots}</g>;
}

export function Contexts({ id, f, L }: SceneProps) {
  const at = (k: number, o = 0, fr = 0) => L(k, o, fr);
  const A = (k: number, o = 0, dur = 14) => appear(f, at(k, o), dur);

  if (id === "imbalance") {
    const panels = [
      {
        x: 70,
        k: 1,
        title: "100 frauds + 100 legitimate",
        pos: 100,
        neg: 100,
        tp: 80,
        fp: 10,
        cols: 20,
        r: 6,
        gap: 17,
        pct: "88.9%",
      },
      {
        x: 650,
        k: 2,
        title: "10 frauds + 990 legitimate",
        pos: 10,
        neg: 990,
        tp: 8,
        fp: 99,
        cols: 50,
        r: 3.4,
        gap: 10.6,
        pct: "7.5%",
      },
    ];
    return (
      <>
        <SVG>
          <In f={f} at={at(0, 0.3)}>
            <Text x={640} y={6} size={25} anchor="middle" weight={680}>
              Same detector: catches 80% of frauds, flags 10% of legitimate
            </Text>
          </In>
          {panels.map((v) => {
            const show = 0.22 * A(0, 0.6) + 0.78 * A(v.k, 0.2),
              flag = A(v.k === 1 ? 1 : 3, v.k === 1 ? 1.8 : 0.6, 12),
              res = appear(f, v.k === 1 ? at(1, 0, 0.75) : at(3, 0, 0.75), 14); // lands as the percentage is spoken
            const prec = v.tp / (v.tp + v.fp);
            return (
              <g key={v.x} opacity={show}>
                <Text x={v.x} y={48} size={24} weight={680}>
                  {v.title}
                </Text>
                <Field
                  x={v.x + 8}
                  y={86}
                  cols={v.cols}
                  pos={v.pos}
                  neg={v.neg}
                  tp={v.tp}
                  fp={v.fp}
                  r={v.r}
                  gap={v.gap}
                  flag={flag}
                />
                <g opacity={res}>
                  <Text x={v.x} y={300} size={23} color={C.muted}>
                    flagged pile:
                  </Text>
                  <Text x={v.x + 150} y={300} size={23} color={C.pos} weight={700}>
                    {v.tp} fraud
                  </Text>
                  <Text x={v.x + 280} y={300} size={23} color={C.neg} weight={700}>
                    + {v.fp} legitimate
                  </Text>
                  <rect x={v.x} y={322} width={520} height={20} rx="4" fill={C.negSoft} />
                  <rect x={v.x} y={322} width={520 * prec * res} height={20} rx="4" fill={C.pos} />
                  <Text x={v.x} y={378} size={32} weight={720}>
                    precision {v.pct}
                  </Text>
                </g>
              </g>
            );
          })}
          <In f={f} at={at(4, 0.2)}>
            <rect x={950} y={350} width={250} height={56} rx="10" fill={C.goldSoft} />
            <Text x={1075} y={378} size={22} anchor="middle" color={C.gold} weight={700}>
              ROC point unchanged
            </Text>
          </In>
        </SVG>
        <Eq
          x={60}
          y={420}
          w={760}
          size={26}
          p={A(5, 1.6)}
          tex={String.raw`\text{precision}=\frac{\pi\,\mathrm{TPR}}{\pi\,\mathrm{TPR}+(1-\pi)\,\mathrm{FPR}},\quad \pi=\text{prevalence}`}
        />
      </>
    );
  }

  if (id === "pr") {
    const k = clamp((f - at(3, 1.4)) / (at(5, 0) - at(3, 1.4))) * 6,
      n = Math.floor(k + 1e-6),
      s = STATES[n];
    const pts = PR.slice(1);
    const startConv = A(5, 0.6);
    return (
      <>
        <SVG>
          <In f={f} at={at(0, 0.2)}>
            <Text x={90} y={10} size={24} weight={680}>
              Flag the top n payments
            </Text>
          </In>
          {STATES.slice(1).map((v, i) => (
            <g key={i} opacity={A(0, 0.4 + i * 0.12)}>
              <rect
                x={85}
                y={36 + i * 50}
                width="520"
                height="42"
                rx="8"
                fill={v.n === n ? C.blueSoft : C.paper}
                stroke={C.line}
              />
              <Text x={106} y={57 + i * 50} size={22} weight={650}>
                top {v.n}
              </Text>
              <Text x={250} y={57 + i * 50} size={22} color={C.pos} opacity={A(1, 0.4)}>
                recall {v.tp}/3
              </Text>
              <Text x={430} y={57 + i * 50} size={22} color={C.blue} opacity={A(2, 1.4)}>
                precision {v.tp}/{v.n}
              </Text>
            </g>
          ))}
          <Plot
            x={760}
            y={40}
            w={400}
            h={310}
            points={pts}
            upto={Math.max(0, n - 2 + ease(clamp((k - n) / 0.35)))}
            color={C.blue}
            xLabel="Recall"
            yLabel="Precision"
            dot={k >= 1}
            axes={A(3, 0)}
          >
            <g opacity={startConv}>
              <path d={`M760 40L${760 + 400 / 3} 40`} stroke={C.blue} strokeDasharray="6 6" strokeWidth="3" />
              <circle cx={760} cy={40} r="8" fill={C.paper} stroke={C.blue} strokeWidth="3" />
              <Text x={905} y={64} size={20} color={C.blue}>
                plotting convention
              </Text>
            </g>
          </Plot>
          <Text x={90} y={372} size={24} color={C.blue} weight={680} opacity={A(3, 1.4)}>
            {n
              ? `recall ${(s.tpr).toFixed(2)} · precision ${(s.precision).toFixed(2)}`
              : "nothing flagged yet"}
          </Text>
        </SVG>
        <Caption color={C.blue} p={A(4, 0.2) * (1 - A(5, 0))}>
          A fraud found raises recall. A legitimate payment flagged lowers precision.
        </Caption>
        <Caption color={C.blue} p={A(5, 0.4)}>
          With nothing flagged, precision is undefined; the curve's start at 1 is a convention.
        </Caption>
      </>
    );
  }

  if (id === "ap") {
    const ranks = [
      { r: "1", p: "1/1", v: 1 },
      { r: "3", p: "2/3", v: 2 / 3 },
      { r: "4", p: "3/4", v: 3 / 4 },
    ];
    return (
      <>
        <SVG>
          <Plot
            x={110}
            y={40}
            w={430}
            h={300}
            points={AP_STEPS}
            color={C.blue}
            xLabel="Recall"
            yLabel="Precision"
            dot={false}
          >
            {ranks.map((v, i) => {
              const p = appear(f, at(2, 0, [0.38, 0.62, 0.85][i]), 16);
              return (
                <g key={v.r}>
                  <rect
                    x={110 + (i * 430) / 3}
                    y={40 + (1 - v.v) * 300}
                    width={430 / 3}
                    height={v.v * 300}
                    fill={C.blue}
                    opacity={0.2 * p}
                    stroke={C.paper}
                    strokeWidth="2"
                  />
                  <g opacity={A(1, 0.4 + i * 0.4)}>
                    <Text
                      x={110 + ((i + 0.5) * 430) / 3}
                      y={318}
                      anchor="middle"
                      size={21}
                      color={C.blue}
                      weight={700}
                    >
                      +1/3
                    </Text>
                  </g>
                </g>
              );
            })}
          </Plot>
          <In f={f} at={at(1, 0)}>
            <Text x={680} y={30} size={24} weight={680}>
              New fraud found at rank…
            </Text>
          </In>
          {ranks.map((v, i) => (
            <In key={v.r} f={f} at={at(2, 0, [0.38, 0.62, 0.85][i])}>
              <rect x={680} y={60 + i * 70} width={470} height={58} rx="10" fill={C.paper} stroke={C.line} />
              <Text x={700} y={89 + i * 70} size={24} weight={650}>
                rank {v.r}
              </Text>
              <Text x={840} y={89 + i * 70} size={24} color={C.blue} weight={650}>
                precision {v.p}
              </Text>
              <Text x={1130} y={89 + i * 70} size={22} anchor="end" color={C.muted} opacity={A(3, 0.2)}>
                × 1/3
              </Text>
            </In>
          ))}
        </SVG>
        <Eq
          x={640}
          y={280}
          w={560}
          size={30}
          p={A(4, 0)}
          color={C.blue}
          tex={String.raw`\mathrm{AP}=\tfrac13\!\left(1+\tfrac23+\tfrac34\right)=\tfrac{29}{36}\approx0.806`}
        />
        <Caption color={C.ink} p={A(5, 0.3)}>
          Same predictions: ROC area 7/9 ≈ 0.778, AP 29/36 ≈ 0.806. Different questions.
        </Caption>
      </>
    );
  }

  if (id === "conventions") {
    const env: [number, number][] = [
      [0, 1],
      [1 / 3, 1],
      [1 / 3, 3 / 4],
      [1, 3 / 4],
    ];
    const prPts = PR as [number, number][];
    return (
      <>
        <SVG>
          <g opacity={A(0, 0)}>
            <Text x={110} y={6} size={24} color={C.blue} weight={700}>
              Average precision (steps)
            </Text>
            <Plot
              x={120}
              y={66}
              w={400}
              h={234}
              points={AP_STEPS}
              fill={1}
              color={C.blue}
              xLabel="Recall"
              yLabel="Precision"
              dot={false}
            >
              <g opacity={A(3, 0.3)}>
                <path
                  d={env
                    .map(([a, b], i) => `${i ? "L" : "M"}${120 + a * 400} ${66 + (1 - b) * 234}`)
                    .join(" ")}
                  stroke={C.gold}
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  fill="none"
                />
                <Text x={514} y={104} size={20} color={C.gold} anchor="end" weight={650}>
                  interpolated envelope
                </Text>
              </g>
              <g opacity={A(5, 0.3)}>
                <path d={`M120 ${66 + 117}H520`} stroke={C.neg} strokeWidth="2.5" strokeDasharray="3 5" />
                <rect x={196} y={66 + 117 + 8} width={322} height={26} rx="4" fill={C.paper} opacity={0.9} />
                <Text x={516} y={66 + 117 + 21} size={20} color={C.neg} anchor="end">
                  random baseline = prevalence (1/2 here)
                </Text>
              </g>
            </Plot>
            <Text x={320} y={390} anchor="middle" size={34} color={C.blue} weight={700}>
              29/36 ≈ 0.806
            </Text>
          </g>
          <g opacity={A(1, 0)}>
            <Text x={760} y={6} size={24} color={C.purple} weight={700}>
              Trapezoids (straight lines)
            </Text>
            <Plot
              x={770}
              y={66}
              w={400}
              h={234}
              points={prPts}
              fill={1}
              color={C.purple}
              xLabel="Recall"
              yLabel="Precision"
              dot={false}
            />
            <Text x={970} y={390} anchor="middle" size={34} color={C.purple} weight={700}>
              55/72 ≈ 0.764
            </Text>
            <g opacity={A(2, 0.4)}>
              <rect
                x={900}
                y={200}
                width={250}
                height={44}
                rx="8"
                fill={C.paper}
                stroke={C.neg}
                strokeWidth="2"
              />
              <Text x={1025} y={222} size={20} anchor="middle" color={C.neg} weight={700}>
                ✗ not valid in PR space
              </Text>
            </g>
          </g>
        </SVG>
        <Caption p={A(6, 0.2)} color={C.ink}>
          Same points, different conventions. Always name the one behind the number.
        </Caption>
      </>
    );
  }

  if (id === "partial") {
    const X = 100,
      Y = 40,
      W = 480,
      H = 320,
      band = 0.1;
    return (
      <>
        <SVG>
          <Plot x={X} y={Y} w={W} h={H} points={ROC} fill={0.6}>
            <g opacity={A(1, 0.3)}>
              <rect x={X} y={Y} width={W * band} height={H} fill={C.gold} opacity={0.12} />
              <path
                d={`M${X + W * band} ${Y}V${Y + H}`}
                stroke={C.gold}
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />
              <Text x={X + W * band + 10} y={Y + 18} color={C.gold} size={21} weight={700}>
                FPR ≤ 0.1
              </Text>
            </g>
            <g opacity={A(2, 0.3)}>
              <rect x={X} y={Y + (H * 2) / 3} width={W * band} height={H / 3} fill={C.gold} opacity={0.8} />
              <rect x={X} y={Y} width={W * band} height={H} fill="none" stroke={C.gold} strokeWidth="2" />
            </g>
          </Plot>
          <In f={f} at={at(2, 0.3)}>
            <Text x={700} y={50} size={26} weight={680}>
              raw partial area
            </Text>
            <Text x={700} y={100} size={40} color={C.gold} weight={720}>
              1/30 ≈ 0.033
            </Text>
            <Text x={700} y={150} size={23} color={C.muted}>
              out of a possible 0.1 (the outlined band)
            </Text>
          </In>
          <In f={f} at={at(3, 0.3)}>
            <Text x={700} y={222} size={24} weight={680}>
              scikit-learn max_fpr=0.1 (McClish):
            </Text>
          </In>
        </SVG>
        <Eq
          x={640}
          y={252}
          w={600}
          size={30}
          p={A(3, 1)}
          tex={String.raw`\tfrac12\!\left(1+\frac{\tfrac1{30}-0.005}{0.1-0.005}\right)\approx 0.649`}
        />
        <Caption color={C.gold} p={A(4, 0.2)}>
          Report the FPR range and whether the area was standardized.
        </Caption>
      </>
    );
  }

  if (id === "multiclass") {
    const classes = [
      { c: "Card theft", auc: 0.95, support: 80, col: C.pos },
      { c: "Account takeover", auc: 0.8, support: 15, col: C.blue },
      { c: "Refund abuse", auc: 0.6, support: 5, col: C.purple },
    ];
    const macroFocus = A(2, 0) * (1 - 0.65 * A(3, 0));
    return (
      <>
        <SVG>
          {classes.map((v, i) => (
            <In key={v.c} f={f} at={at(0, 0.6) + i * 8}>
              <Card
                x={80 + i * 380}
                y={10}
                w={340}
                h={140}
                title={v.c}
                sub={`${v.support} examples`}
                color={v.col}
              />
              <g opacity={A(1, 1.2)}>
                <Text x={80 + i * 380 + 318} y={110} anchor="end" size={30} weight={700} color={v.col}>
                  {`vs rest: AUC ${v.auc.toFixed(2)}`}
                </Text>
              </g>
            </In>
          ))}
          <g opacity={macroFocus}>
            <Text x={330} y={196} size={24} anchor="middle" color={C.blue} weight={700}>
              macro: equal weight
            </Text>
          </g>
          <g opacity={A(3, 0)}>
            <Text x={950} y={196} size={24} anchor="middle" color={C.pos} weight={700}>
              weighted: by class size
            </Text>
          </g>
          <In f={f} at={at(5, 0.3)}>
            <rect x={80} y={330} width={1100} height={80} rx="12" fill={C.blueSoft} />
            <Text x={104} y={356} size={23} weight={700} color={C.blue}>
              Multilabel · micro average
            </Text>
            <Text x={104} y={388} size={21} color={C.ink}>
              pools every (example, label) score into one curve, which is not an average of per-label areas
            </Text>
          </In>
        </SVG>
        <Eq
          x={70}
          y={222}
          w={520}
          size={32}
          p={macroFocus}
          tex={String.raw`\tfrac13(.95+.80+.60)\approx.783`}
        />
        <Eq x={620} y={222} w={640} size={32} p={A(3, 0)} tex={String.raw`.80(.95)+.15(.80)+.05(.60)=.910`} />
      </>
    );
  }

  if (id === "letters") {
    const P = [
      {
        k: 1,
        x: 70,
        y: 20,
        title: "Search & recommendations",
        sub: "AP per query; mAP averages queries",
        c: C.blue,
      },
      { k: 3, x: 660, y: 20, title: "Object detection", sub: "match boxes by IoU, then PR", c: C.gold },
      { k: 6, x: 70, y: 218, title: "Survival / time-to-event", sub: "an AUC at each horizon t", c: C.pos },
      { k: 8, x: 660, y: 218, title: "Learning curves", sub: "performance across a budget", c: C.purple },
    ];
    const w = 550,
      h = 186;
    return (
      <SVG>
        {P.map((p) => (
          <g key={p.title} opacity={0.22 * A(0, 0.4) + 0.78 * A(p.k, 0.2)}>
            <rect x={p.x} y={p.y} width={w} height={h} rx="14" fill={C.paper} stroke={C.line} />
            <rect x={p.x} y={p.y + 16} width="4" height={h - 32} rx="2" fill={p.c} />
            <Text x={p.x + 22} y={p.y + 30} size={24} weight={700}>
              {p.title}
            </Text>
            <Text x={p.x + 22} y={p.y + 62} size={20} color={C.muted}>
              {p.sub}
            </Text>
          </g>
        ))}
        {/* Retrieval: ranks 1, 3, 4 relevant — the AP example again. */}
        <g opacity={A(1, 0.6)}>
          {[1, 0, 1, 1, 0, 0].map((v, i) => (
            <g key={i}>
              <rect
                x={92 + i * 52}
                y={104}
                width={44}
                height={50}
                rx="8"
                fill={v ? C.posSoft : "#eee7dc"}
                stroke={C.line}
              />
              <Text
                x={114 + i * 52}
                y={130}
                anchor="middle"
                size={22}
                weight={700}
                color={v ? C.pos : C.faint}
              >
                {i + 1}
              </Text>
            </g>
          ))}
        </g>
        <In f={f} at={at(2, 0, 0.75)}>
          <Text x={420} y={130} size={30} color={C.blue} weight={720}>
            AP 29/36
          </Text>
        </In>
        {/* Detection: two 100×100 boxes, offset 20 → IoU 2/3. */}
        <g opacity={A(3, 0, 0.7)}>
          <rect x={690} y={96} width={80} height={80} fill={C.posSoft} stroke={C.pos} strokeWidth="3" />
          <rect
            x={706}
            y={96}
            width={80}
            height={80}
            fill={C.goldSoft}
            fillOpacity={0.6}
            stroke={C.gold}
            strokeWidth="3"
          />
          <g opacity={A(4, 0.2)}>
            <Text x={812} y={116} size={22} weight={700}>
              IoU = 2/3
            </Text>
          </g>
          <g opacity={appear(f, at(4, 0, 0.5), 14)}>
            <Text x={812} y={150} size={20} color={C.muted}>
              match at 0.5 · not at 0.75
            </Text>
          </g>
        </g>
        {/* Survival: horizon line; a censored machine is unknown. */}
        <g opacity={A(6, 0.8)}>
          <path d="M380 300V392" stroke={C.gold} strokeWidth="2.5" strokeDasharray="5 5" />
          <Text x={394} y={300} size={20} color={C.gold} weight={700}>
            t
          </Text>
          {[
            { e: 150, ev: true, l: "case", c: C.pos },
            { e: 260, ev: false, l: "unknown", c: C.gold },
            { e: 470, ev: false, l: "control", c: C.blue },
          ].map((m, i) => (
            <g key={i} opacity={appear(f, at(7, 0, [0.12, 0.72, 0.42][i]), 12)}>
              <path d={`M100 ${318 + i * 32}H${m.e}`} stroke={m.c} strokeWidth="4" />
              <circle
                cx={m.e}
                cy={318 + i * 32}
                r="7"
                fill={m.ev ? m.c : C.paper}
                stroke={m.c}
                strokeWidth="3"
              />
              <Text x={m.e + 14} y={318 + i * 32} size={19} color={m.c} weight={650}>
                {m.l}
              </Text>
            </g>
          ))}
        </g>
        {/* Learning curve: area across a budget axis. */}
        <g opacity={A(8, 0.8)}>
          {(() => {
            const x0 = 700,
              y0 = 392,
              ww = 300,
              hh = 92;
            const pts = Array.from({ length: 31 }, (_, i) => [i / 30, 0.25 + 0.7 * (1 - Math.exp(-i / 8))]);
            const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${x0 + a * ww} ${y0 - b * hh}`).join(" ");
            return (
              <>
                <path d={`${d}L${x0 + ww} ${y0}H${x0}Z`} fill={C.purple} opacity={0.14} />
                <path d={d} stroke={C.purple} strokeWidth="3.5" fill="none" />
                <path d={`M${x0} ${y0 - hh}V${y0}H${x0 + ww}`} stroke={C.ink} strokeWidth="2" fill="none" />
                <Text x={x0 + ww + 14} y={y0 - 8} size={19} color={C.muted}>
                  budget →
                </Text>
              </>
            );
          })()}
        </g>
      </SVG>
    );
  }

  if (id === "practice") {
    const steps = [
      { t: "Scores", s: "not hard labels; larger = more positive", c: C.ink },
      { t: "Held-out data", s: "uncertainty that matches your sampling", c: C.blue },
      { t: "The whole curve", s: "and important subgroups", c: C.pos },
      { t: "A threshold", s: "from costs and prevalence", c: C.gold },
    ];
    return (
      <>
        <SVG>
          {steps.map((v, i) => (
            <g key={v.t}>
              <In f={f} at={at(i, 0.3)}>
                <Card x={67 + i * 293} y={96} w={262} h={170} title={v.t} sub={v.s} color={v.c} />
              </In>
              {i < 3 && <Arrow x1={333 + i * 293} y1={181} x2={356 + i * 293} y2={181} p={A(i + 1, 0, 10)} />}
            </g>
          ))}
          <In f={f} at={at(4, 0.2)}>
            <Text x={640} y={350} anchor="middle" size={32} weight={700}>
              No kind of AUC chooses the threshold for you.
            </Text>
          </In>
        </SVG>
      </>
    );
  }

  if (id === "recap") {
    const qs = ["Which curve?", "Which positive?", "Which population?", "Which range?", "Which average?"];
    return (
      <SVG>
        <g opacity={A(0, 0.3)}>
          <Plot
            x={215}
            y={30}
            w={230}
            h={180}
            points={ROC}
            fill={1}
            dot={false}
            xLabel="FPR"
            yLabel="TPR"
            ticks={[0, 1]}
          />
          <Text x={330} y={300} anchor="middle" size={38} color={C.pos} weight={720}>
            7/9
          </Text>
          <Plot
            x={835}
            y={30}
            w={230}
            h={180}
            points={AP_STEPS}
            color={C.blue}
            fill={1}
            dot={false}
            xLabel="Recall"
            yLabel="Precision"
            ticks={[0, 1]}
          />
          <Text x={950} y={300} anchor="middle" size={38} color={C.blue} weight={720}>
            29/36
          </Text>
        </g>
        <In f={f} at={at(1, 0.2)}>
          <Text x={640} y={130} anchor="middle" size={26} color={C.muted} weight={650}>
            neither is wrong
          </Text>
        </In>
        <In f={f} at={at(2, 0.4)}>
          <Text x={330} y={344} anchor="middle" size={23} color={C.pos} weight={650}>
            Do frauds outrank legitimate payments?
          </Text>
        </In>
        <In f={f} at={at(3, 0.4)}>
          <Text x={950} y={344} anchor="middle" size={23} color={C.blue} weight={650}>
            How clean is the flagged pile as recall grows?
          </Text>
        </In>
        {qs.map((q, i) => {
          const p = appear(f, at(4, 1.4) + i * 21, 12);
          return (
            <g key={q} opacity={p} transform={`translate(0 ${(1 - p) * 8})`}>
              <rect
                x={76 + i * 228}
                y={384}
                width={214}
                height={46}
                rx="23"
                fill={C.paper}
                stroke={C.pos}
                strokeWidth="2"
              />
              <Text x={76 + i * 228 + 107} y={407} anchor="middle" size={21} weight={680}>
                {q}
              </Text>
            </g>
          );
        })}
      </SVG>
    );
  }
  return null;
}

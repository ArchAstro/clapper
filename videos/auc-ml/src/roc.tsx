import { ITEMS, NEG, POS, ROC, STATES } from "./data";
import {
  Arrow,
  appear,
  C,
  Caption,
  Card,
  Chip,
  clamp,
  Eq,
  ease,
  In,
  Plot,
  Scores,
  SVG,
  Text,
} from "./visuals";

export type LineAt = (k: number, offsetSeconds?: number, fraction?: number) => number;
type SceneProps = { id: string; f: number; duration: number; L: LineAt };
const slot = (i: number) => 76 + i * 186; // chip x for rank i

/** Fraud × legitimate pair grid. `shown(i, j)` is 0..1 mark visibility, `hi(j)` highlights a column. */
export function Pairs({
  x = 770,
  y = 92,
  cell = 84,
  cellsIn = () => 1,
  shown = () => 1,
  hi = () => 0,
  headers = 1,
}: {
  x?: number;
  y?: number;
  cell?: number;
  cellsIn?: (i: number, j: number) => number;
  shown?: (i: number, j: number) => number;
  hi?: (j: number) => number;
  headers?: number;
}) {
  const g = cell + 8;
  return (
    <g>
      <g opacity={headers}>
        <Text x={x + g * 1.5 - 4} y={y - 64} size={20} color={C.neg} anchor="middle" weight={650}>
          legitimate payment (−)
        </Text>
        {NEG.map((n, j) => (
          <Text
            key={n.id}
            x={x + j * g + cell / 2}
            y={y - 28}
            size={22}
            anchor="middle"
            color={C.neg}
            weight={650}
          >
            {n.id} {n.score.toFixed(1)}
          </Text>
        ))}
        {POS.map((p, i) => (
          <Text
            key={p.id}
            x={x - 16}
            y={y + i * g + cell / 2}
            anchor="end"
            color={C.pos}
            size={22}
            weight={650}
          >
            {p.id} {p.score.toFixed(1)}
          </Text>
        ))}
      </g>
      {POS.map((p, i) =>
        NEG.map((n, j) => {
          const win = p.score > n.score,
            s = shown(i, j),
            h = hi(j),
            inP = cellsIn(i, j);
          return (
            <g key={`${i}${j}`} opacity={inP}>
              <rect
                x={x + j * g}
                y={y + i * g}
                width={cell}
                height={cell}
                rx="10"
                fill={C.paper}
                stroke={h > 0 ? C.gold : C.line}
                strokeWidth={1 + h * 2.5}
              />
              <rect
                x={x + j * g}
                y={y + i * g}
                width={cell}
                height={cell}
                rx="10"
                fill={win ? C.posSoft : C.negSoft}
                opacity={s}
              />
              <Text
                x={x + j * g + cell / 2}
                y={y + i * g + cell / 2 + 2}
                anchor="middle"
                color={win ? C.pos : C.neg}
                size={36}
                weight={700}
                opacity={s}
              >
                {win ? "✓" : "✗"}
              </Text>
            </g>
          );
        }),
      )}
    </g>
  );
}

export function RocScenes({ id, f, L }: SceneProps) {
  const at = (k: number, o = 0, fr = 0) => L(k, o, fr);
  const A = (k: number, o = 0, dur = 14) => appear(f, at(k, o), dur);

  if (id === "intro") {
    // Unsorted arrival → sorted queue → truth revealed → the one-number promise.
    const order = [3, 5, 0, 4, 1, 2]; // display slot of rank i before sorting
    const sort = ease((f - at(1, 1.2)) / 40),
      drop = 150 * (1 - ease((f - at(3, 0)) / 26)); // queue sits centred until the AUC row arrives
    return (
      <>
        <SVG>
          <g transform={`translate(0 ${drop})`}>
            <In f={f} at={at(1, 1.2)}>
              <Text x={76} y={14} size={20} color={C.muted} mono>
                REVIEW FIRST
              </Text>
              <Text x={1206} y={14} size={20} color={C.muted} anchor="end" mono>
                REVIEW LAST
              </Text>
              <Arrow x1={260} y1={14} x2={1020} y2={14} p={sort} />
            </In>
            {ITEMS.map((item, i) => {
              const p = appear(f, 8 + order[i] * 5, 16);
              const xx = slot(order[i]) + (slot(i) - slot(order[i])) * sort,
                // Chips moving right arc up, chips moving left arc down, so crossing scores stay legible.
                lift = Math.sin(Math.PI * sort) * Math.sign(slot(order[i]) - slot(i)) * 64;
              return (
                <g key={item.id} opacity={p} transform={`translate(0 ${(1 - p) * 12 + lift})`}>
                  <Chip item={item} x={xx} y={48} w={160} truth={appear(f, at(2, 1.4) + i * 5, 16)} />
                </g>
              );
            })}
            <In f={f} at={at(2, 2.4)}>
              <Text x={640} y={196} anchor="middle" size={26} color={C.neg}>
                B is legitimate, yet it ranks above two frauds.
              </Text>
            </In>
          </g>
          <In f={f} at={at(3, 0, 0.45)} dy={14}>
            <text x={76} y={330} fontFamily="Instrument Serif, serif" fontSize={110} fill={C.ink}>
              AUC
            </text>
            <Text x={300} y={300} size={30} weight={650}>
              area under the curve
            </Text>
            <Text x={300} y={338} size={22} color={C.muted}>
              one number for the quality of the whole ordering
            </Text>
          </In>
          <Plot
            x={1000}
            y={240}
            w={170}
            h={150}
            points={ROC}
            upto={ease((f - at(3, 0.3, 0.45)) / 50) * 6}
            fill={appear(f, at(3, 1.3, 0.45), 20)}
            axes={appear(f, at(3, 0, 0.45), 14)}
            dot={false}
            xLabel=""
            yLabel=""
            ticks={[0, 1]}
          />
        </SVG>
        <Caption p={A(4, 0.4)}>You'll compute it by hand from these six payments.</Caption>
      </>
    );
  }

  if (id === "map") {
    const cards = [
      { t: "Scores", s: "A .90 · B .80 · …", c: C.ink },
      { t: "Threshold", s: "flag if score ≥ t", c: C.gold },
      { t: "Curve", s: "one point per threshold", c: C.pos },
      { t: "Area", s: "one number for the curve", c: C.pos },
    ];
    return (
      <SVG>
        {cards.map((v, i) => (
          <g key={v.t}>
            <g opacity={0.22 + 0.78 * A(i + 1, 0.2)}>
              <g opacity={A(0, 0, 10)} transform={`translate(0 ${(1 - A(i + 1, 0.2)) * 8})`}>
                <Card x={72 + i * 298} y={100} w={250} h={150} title={v.t} sub={v.s} color={v.c} />
              </g>
            </g>
            {i < 3 && <Arrow x1={330 + i * 298} y1={175} x2={362 + i * 298} y2={175} p={A(i + 2, 0, 12)} />}
          </g>
        ))}
        <In f={f} at={at(5, 0.3)}>
          <Text x={640} y={322} size={30} anchor="middle" weight={650}>
            Same six payments, two kinds of curve
          </Text>
          <Text x={500} y={378} size={26} anchor="middle" color={C.pos} weight={650}>
            ROC curve
          </Text>
          <Text x={780} y={378} size={26} anchor="middle" color={C.blue} weight={650}>
            precision–recall curve
          </Text>
        </In>
      </SVG>
    );
  }

  if (id === "scores") {
    const focus = A(3, 0.6, 18);
    return (
      <SVG>
        {ITEMS.map((item, i) => (
          <g key={item.id} opacity={appear(f, at(0, 0.4) + i * 4, 14)}>
            <Chip
              item={item}
              x={slot(i)}
              y={40}
              w={160}
              truth={appear(f, at(1, 0.2) + i * 4, 12)}
              dim={item.id === "B" || item.id === "C" || item.id === "D" ? 0 : focus}
            />
          </g>
        ))}
        <g opacity={1 - focus}>
          <In f={f} at={at(2, 0.2)}>
            <Arrow x1={140} y1={180} x2={1140} y2={180} />
            <Text x={140} y={212} size={21} color={C.muted}>
              higher score = more suspicious
            </Text>
            <Text x={1140} y={212} size={21} color={C.muted} anchor="end">
              order matters; the numbers need not be probabilities
            </Text>
          </In>
        </g>
        <g opacity={focus}>
          <path
            d={`M${slot(1) + 80} 150 C ${slot(1) + 80} 270, ${slot(2) + 80} 270, ${slot(2) + 80} 150`}
            stroke={C.neg}
            strokeWidth="3"
            fill="none"
          />
          <path
            d={`M${slot(1) + 80} 150 C ${slot(1) + 80} 320, ${slot(3) + 80} 320, ${slot(3) + 80} 150`}
            stroke={C.neg}
            strokeWidth="3"
            fill="none"
          />
          <Text x={slot(2) + 80} y={300} anchor="middle" color={C.neg} size={26} weight={650}>
            B outranks C and D
          </Text>
        </g>
        <In f={f} at={at(5, 0.2)}>
          <rect
            x={slot(1) - 8}
            y={32}
            width={176}
            height={120}
            rx="16"
            fill="none"
            stroke={C.gold}
            strokeWidth="4"
          />
          <Text x={640} y={380} anchor="middle" color={C.gold} size={28} weight={700}>
            → this mistake becomes missing area
          </Text>
        </In>
      </SVG>
    );
  }

  if (id === "threshold") {
    const cutX = slot(3) - 13;
    const cells = [
      { k: 2, label: "TP", who: "A, C", n: 2, col: 0, row: 0, c: C.pos },
      { k: 3, label: "FP", who: "B", n: 1, col: 0, row: 1, c: C.neg },
      { k: 4, label: "FN", who: "D", n: 1, col: 1, row: 0, c: C.pos },
      { k: 5, label: "TN", who: "E, F", n: 2, col: 1, row: 1, c: C.neg },
    ];
    const gx = 520,
      gy = 240,
      cw = 260,
      ch = 82;
    return (
      <>
        <SVG>
          <Scores y={24} flagged={(i) => (i < 3 ? appear(f, at(1, 0.3) + i * 6, 10) : 0)} />
          <g opacity={A(0, 0.3)}>
            <path
              d={`M${cutX} ${8 + (1 - A(0, 0.3, 20)) * -30}V${148}`}
              stroke={C.gold}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <Text x={cutX} y={166} anchor="middle" color={C.gold} size={22} weight={700}>
              threshold 0.65
            </Text>
          </g>
          <In f={f} at={at(2, 0)}>
            <Text x={gx + cw / 2} y={gy - 22} anchor="middle" size={20} color={C.muted} weight={650}>
              flagged
            </Text>
            <Text x={gx + cw * 1.5 + 10} y={gy - 22} anchor="middle" size={20} color={C.muted} weight={650}>
              not flagged
            </Text>
            <Text x={gx - 16} y={gy + ch / 2} anchor="end" size={21} color={C.pos} weight={650}>
              actual fraud +
            </Text>
            <Text x={gx - 16} y={gy + ch * 1.5 + 10} anchor="end" size={21} color={C.neg} weight={650}>
              actually legit −
            </Text>
          </In>
          {cells.map((v) => {
            const p = A(v.k, 0.4),
              x = gx + v.col * (cw + 10),
              y = gy + v.row * (ch + 10);
            return (
              <g key={v.label}>
                <rect
                  x={x}
                  y={y}
                  width={cw}
                  height={ch}
                  rx="12"
                  fill={C.paper}
                  stroke={C.line}
                  opacity={A(2, 0)}
                />
                <g opacity={p}>
                  <rect
                    x={x}
                    y={y}
                    width={cw}
                    height={ch}
                    rx="12"
                    fill={v.row === v.col ? C.posSoft : C.negSoft}
                    opacity={0.6}
                  />
                  <Text x={x + 18} y={y + 30} color={v.c} size={24} weight={700}>
                    {v.label}
                  </Text>
                  <Text x={x + 18} y={y + 58} color={C.muted} size={21}>
                    {v.who}
                  </Text>
                  <Text x={x + cw - 24} y={y + ch / 2} anchor="end" size={46} weight={700}>
                    {v.n}
                  </Text>
                </g>
              </g>
            );
          })}
        </SVG>
        <Caption p={A(6, 0.3)}>One threshold → one confusion matrix. Not yet a curve.</Caption>
      </>
    );
  }

  if (id === "rates") {
    const dots = (list: typeof ITEMS, hit: (id: string) => boolean, x: number, y: number, p: number) =>
      list.map((it, i) => (
        <g key={it.id} opacity={p}>
          <circle
            cx={x + i * 54}
            cy={y}
            r="19"
            fill={hit(it.id) ? (it.positive ? C.pos : C.neg) : C.paper}
            stroke={it.positive ? C.pos : C.neg}
            strokeWidth="3"
          />
          <Text
            x={x + i * 54}
            y={y + 1}
            anchor="middle"
            size={20}
            weight={700}
            color={hit(it.id) ? C.paper : C.ink}
          >
            {it.id}
          </Text>
        </g>
      ));
    const pt = A(5, 0.3, 18);
    return (
      <>
        <SVG>
          <In f={f} at={at(0, 0.2)}>
            <Text x={88} y={24} color={C.pos} size={26} weight={650}>
              Of the actual frauds, how many did we catch?
            </Text>
          </In>
          {dots(POS, (i) => i !== "D", 108, 80, A(0, 1.4))}
          <In f={f} at={at(2, 0.2)}>
            <Text x={88} y={194} color={C.neg} size={26} weight={650}>
              Of the legitimate payments, how many did we flag?
            </Text>
          </In>
          {dots(NEG, (i) => i === "B", 108, 250, A(2, 1.6))}
          <Plot
            x={850}
            y={50}
            w={310}
            h={300}
            points={[[1 / 3, 2 / 3]]}
            upto={0}
            dot={false}
            axes={A(4, 1.2, 20)}
          />
          <g opacity={pt}>
            <path
              d={`M850 ${50 + 300 / 3}H${850 + 310 / 3}V350`}
              stroke={C.gold}
              strokeDasharray="5 5"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx={850 + 310 / 3}
              cy={50 + 300 / 3}
              r={6 + 6 * pt}
              fill={C.gold}
              stroke={C.paper}
              strokeWidth="2"
            />
            <Text x={850 + 310 / 3 + 18} y={50 + 300 / 3 - 22} size={24} color={C.gold} weight={700}>
              (1/3, 2/3)
            </Text>
          </g>
        </SVG>
        <Eq
          x={260}
          y={56}
          w={460}
          tex={String.raw`\mathrm{TPR}=\frac{TP}{TP+FN}=\frac{2}{3}`}
          size={32}
          p={A(1, 0)}
          color={C.pos}
        />
        <Eq
          x={260}
          y={226}
          w={460}
          tex={String.raw`\mathrm{FPR}=\frac{FP}{FP+TN}=\frac{1}{3}`}
          size={32}
          p={A(3, 0)}
          color={C.neg}
        />
        <Caption p={A(4, 0.2)} color={C.ink}>
          ROC = receiver operating characteristic: FPR across, TPR up.
        </Caption>
      </>
    );
  }

  if (id === "sweep") {
    // The walk spans the two sentences that explain it, finishing on "At the bottom".
    const k = clamp((f - at(2, 0.2)) / (at(3, 0.6) - at(2, 0.2))) * 6.3,
      n = Math.min(6, Math.floor(k + 1e-6)),
      step = n === 0 ? 0 : n - 1 + ease(clamp((k - n) / 0.3)),
      s = STATES[n],
      rowY = (i: number) => 52 + i * 52,
      lineY = rowY(0) - 4 + step * 52; // rests in the gap below the last flagged row
    return (
      <>
        <SVG>
          <Plot x={110} y={40} w={420} h={312} points={ROC} upto={step} />
          <In f={f} at={at(4, 0.2)}>
            <Text x={330} y={150} size={26} color={C.pos} weight={700}>
              ROC curve
            </Text>
          </In>
          {ITEMS.map((item, i) => (
            <g key={item.id}>
              <rect
                x={690}
                y={rowY(i)}
                width="420"
                height="44"
                rx="9"
                fill={i < n ? (item.positive ? C.posSoft : C.negSoft) : C.paper}
                stroke={C.line}
              />
              <Text x={712} y={rowY(i) + 23} size={23} color={item.positive ? C.pos : C.neg} weight={650}>
                {item.id} {item.positive ? "+" : "−"} {item.score.toFixed(2)}
              </Text>
              <Text x={1092} y={rowY(i) + 23} size={21} anchor="end" color={i < n ? C.ink : C.faint}>
                {i < n ? (item.positive ? "↑ up 1/3" : "→ right 1/3") : "not flagged"}
              </Text>
            </g>
          ))}
          <g opacity={A(0, 0.2)}>
            <path d={`M682 ${lineY}H1118`} stroke={C.gold} strokeWidth="4" strokeLinecap="round" />
            <Text x={664} y={lineY} anchor="end" size={20} color={C.gold} weight={700}>
              threshold
            </Text>
          </g>
          <Text x={690} y={400} size={25} weight={650}>
            {`TPR ${s.tp}/3   ·   FPR ${s.fp}/3`}
          </Text>
          <Text x={1110} y={22} size={20} anchor="end" color={C.gold} mono>
            {n === 0
              ? "above 0.90"
              : n === 6
                ? "below 0.10"
                : `between ${ITEMS[n - 1].score.toFixed(2)} and ${ITEMS[n].score.toFixed(2)}`}
          </Text>
        </SVG>
        <Caption p={A(2, 0.4)}>Fraud (+): up 1/3. Legitimate (−): right 1/3. Both rates finish at 1.</Caption>
      </>
    );
  }

  if (id === "area" || id === "bridge") {
    const bridge = id === "bridge",
      W = bridge ? 400 : 460,
      H = bridge ? 230 : 300,
      X = 100,
      Y = 50;
    const heights = [1 / 3, 1, 1];
    const fillOf = (j: number) => (bridge ? 1 : appear(f, at(2, 0.2) + j * 30, 18));
    const hiOf = (j: number) => (bridge ? (j === 0 ? A(1, 0.3) * (1 - A(3, 0)) : A(3, 0.4)) : 0);
    return (
      <>
        <SVG>
          <Plot x={X} y={Y} w={W} h={H} fill={bridge ? 0 : A(0, 0.4, 20)} dot={false}>
            {heights.map((h, j) => (
              <g key={j}>
                <rect
                  x={X + (j * W) / 3}
                  y={Y + H - h * H}
                  width={W / 3}
                  height={h * H}
                  fill={C.pos}
                  opacity={0.2 * fillOf(j) * (bridge ? 0.6 : 1)}
                  stroke={C.paper}
                  strokeWidth="2"
                />
                <rect
                  x={X + (j * W) / 3 + 1.5}
                  y={Y + H - h * H + 1.5}
                  width={W / 3 - 3}
                  height={h * H - 3}
                  fill={C.goldSoft}
                  stroke={C.gold}
                  strokeWidth="3"
                  opacity={hiOf(j)}
                />
                <rect
                  x={X + (j * W) / 3}
                  y={Y}
                  width={W / 3}
                  height={H}
                  fill="none"
                  stroke={C.ink}
                  strokeDasharray="4 6"
                  opacity={bridge ? 0 : 0.5 * A(1, 0.2) * (1 - A(3, 0))}
                />
              </g>
            ))}
            {!bridge && (
              <g opacity={A(4, 0.2)}>
                <rect x={X} y={Y} width={W / 3} height={(H * 2) / 3} fill={C.gold} opacity={0.22} />
                <rect
                  x={X}
                  y={Y}
                  width={W / 3}
                  height={(H * 2) / 3}
                  fill="none"
                  stroke={C.gold}
                  strokeWidth="3"
                />
                <Text x={X + W / 6} y={Y + H / 3 - 14} anchor="middle" size={24} color={C.gold} weight={700}>
                  B's mistake
                </Text>
                <Text x={X + W / 6} y={Y + H / 3 + 18} anchor="middle" size={21} color={C.gold}>
                  2/9 missing
                </Text>
              </g>
            )}
          </Plot>
          {bridge ? (
            <>
              <Pairs x={780} y={96} cell={80} hi={(j) => (j === 0 ? A(1, 0.3) * (1 - A(3, 0)) : A(3, 0.4))} />
              <g opacity={A(2, 0.4) * (1 - A(3, 0))}>
                <Text
                  x={X + W / 6}
                  y={Y + H - H / 3 - 22}
                  anchor="middle"
                  size={22}
                  color={C.gold}
                  weight={700}
                >
                  1/3 tall
                </Text>
                <Text x={1012} y={392} anchor="middle" size={23} color={C.gold} weight={650}>
                  column B: 1 win of 3
                </Text>
              </g>
              <g opacity={A(3, 0.6)}>
                <Text x={1012} y={392} anchor="middle" size={23} color={C.gold} weight={650}>
                  columns E, F: 3 wins of 3
                </Text>
              </g>
            </>
          ) : (
            <>
              {["1/3 × 1/3 = 1/9", "1/3 × 1 = 1/3", "1/3 × 1 = 1/3"].map((t, j) => (
                <In key={t} f={f} at={at(2, 0.4) + j * 30}>
                  <Text x={680} y={80 + j * 58} size={30} weight={620}>
                    {t}
                  </Text>
                  <Text x={1010} y={80 + j * 58} size={20} color={C.muted}>
                    {["strip B", "strip E", "strip F"][j]}
                  </Text>
                </In>
              ))}
              <In f={f} at={at(3, 0, 0.6)}>
                <path d="M680 254H990" stroke={C.ink} strokeWidth="2" />
                <Text x={680} y={300} size={48} color={C.pos} weight={720}>
                  = 7/9 ≈ 0.778
                </Text>
              </In>
              <In f={f} at={at(1, 0.6)}>
                <path d={`M${X} ${Y + H + 76}H${X + W / 3}`} stroke={C.ink} strokeWidth="2" />
                <Text x={X + W / 6} y={Y + H + 94} size={20} anchor="middle" color={C.muted}>
                  width 1/3
                </Text>
              </In>
            </>
          )}
        </SVG>
        {bridge && (
          <Eq
            x={40}
            y={378}
            w={560}
            size={28}
            p={A(4, 0.2)}
            tex={String.raw`\tfrac13\Big(\tfrac13+1+1\Big)=\tfrac79=\tfrac{\text{wins}}{\text{pairs}}`}
          />
        )}
        <Caption p={bridge ? A(5, 0.2) : A(5, 0.2)}>
          {bridge
            ? "Strip height = fraction of frauds that outrank that legitimate payment."
            : "AUC is this area, not the accuracy at any one threshold. Both axes are fractions, so it is unitless."}
        </Caption>
      </>
    );
  }

  if (id === "pairs") {
    const wins = POS.reduce(
      (a, p, i) => a + NEG.reduce((b, n, j) => b + (p.score > n.score ? (markP(i, j) > 0.5 ? 1 : 0) : 0), 0),
      0,
    );
    function markP(i: number, j: number) {
      return i === 0 ? appear(f, at(3, 0.2) + j * 6, 10) : appear(f, at(4, 0.2) + (i - 1) * 14 + j * 5, 10);
    }
    return (
      <>
        <SVG>
          <In f={f} at={at(2, 0.2)}>
            <Text x={77} y={92} size={26}>
              3 frauds
            </Text>
            <Text x={77} y={138} size={26}>
              × 3 legitimate
            </Text>
            <Text x={77} y={194} size={36} weight={720}>
              = 9 pairs
            </Text>
          </In>
          <Pairs
            x={500}
            y={100}
            cell={88}
            headers={A(0, 0.4)}
            // The empty grid is on screen from the first sentence; cells firm up as the pairs are counted.
            cellsIn={(i, j) => Math.max(0.35 * A(0, 0.6), appear(f, at(2, 0.4) + (i * 3 + j) * 3, 10))}
            shown={markP}
            hi={(j) => (j === 0 ? A(4, 1.8) : 0)}
          />
          <In f={f} at={at(3, 0)}>
            <Text x={940} y={110} size={60} color={C.pos} weight={720}>
              {wins} {wins === 1 ? "win" : "wins"}
            </Text>
          </In>
          <In f={f} at={at(4, 1.8)}>
            <Text x={500 + 44} y={404} size={22} color={C.gold} anchor="middle" weight={700}>
              ↑ both losses: B
            </Text>
          </In>
          <In f={f} at={at(5, 0.2)}>
            <Text x={940} y={220} size={30} weight={650}>
              7 / 9 pairs
            </Text>
            <Text x={940} y={280} size={36} color={C.pos} weight={720}>
              = ROC area 7/9
            </Text>
          </In>
        </SVG>
      </>
    );
  }

  if (id === "rigor") {
    const focus = (k: number) => A(k, 0) * (1 - 0.6 * A(k + 1, 0));
    return (
      <>
        <SVG>
          <In f={f} at={at(1, 0.2)}>
            <Chip item={ITEMS[2]} x={300} y={8} w={190} h={92} truth={1} label />
            <Text x={640} y={58} size={40} anchor="middle" color={C.gold} weight={700}>
              &gt; ?
            </Text>
            <Chip item={ITEMS[4]} x={790} y={8} w={190} h={92} truth={1} label />
            <Text x={395} y={120} size={20} anchor="middle" color={C.muted}>
              random fraud
            </Text>
            <Text x={885} y={120} size={20} anchor="middle" color={C.muted}>
              random legitimate
            </Text>
          </In>
        </SVG>
        <Eq y={150} size={38} p={focus(2)} tex={String.raw`\mathrm{AUC}=P(S_+>S_-)+\tfrac12\,P(S_+=S_-)`} />
        <Eq
          y={232}
          size={34}
          p={focus(3)}
          tex={String.raw`\widehat{\mathrm{AUC}}=\frac{\#\text{wins}+\tfrac12\#\text{ties}}{n_+\,n_-}=\frac{7}{9}`}
        />
        <Eq
          y={330}
          size={36}
          p={A(4, 0)}
          tex={String.raw`\mathrm{AUC}=\int_0^1 \mathrm{TPR}\;d(\mathrm{FPR})`}
        />
      </>
    );
  }

  if (id === "ties") {
    const draw = ease((f - at(2, 1.2)) / 40);
    return (
      <>
        <SVG>
          <In f={f} at={at(1, 0.4)}>
            <Card x={86} y={60} w={290} h={100} title="Fraud +" sub="score 0.50" />
            <Card x={86} y={200} w={290} h={100} title="Legitimate −" sub="score 0.50" color={C.neg} />
          </In>
          <In f={f} at={at(3, 0, 0.65)}>
            <Text x={560} y={170} anchor="middle" size={84} color={C.gold} weight={700}>
              1/2
            </Text>
            <Text x={560} y={236} anchor="middle" size={23}>
              credit for the tied pair
            </Text>
          </In>
          <Plot
            x={830}
            y={40}
            w={320}
            h={300}
            points={[
              [0, 0],
              [1, 1],
            ]}
            upto={draw}
            color={C.gold}
            fill={A(3, 0.2)}
            dot={draw < 1}
            axes={A(2, 0)}
            ticks={[0, 0.5, 1]}
          />
          <In f={f} at={at(3, 0.2)}>
            <Text x={1060} y={290} size={26} anchor="middle" color={C.gold} weight={700}>
              area 1/2
            </Text>
          </In>
        </SVG>
        <Caption color={C.gold} p={A(4, 0.2)}>
          All scores tied → AUC = 1/2 (when both classes are present).
        </Caption>
      </>
    );
  }

  if (id === "baselines") {
    const panels = [
      {
        name: "Perfect ranking",
        a: "AUC = 1",
        points: [
          [0, 0],
          [0, 1],
          [1, 1],
        ],
        c: C.pos,
      },
      {
        name: "Random order",
        a: "expected AUC = 0.5",
        points: [
          [0, 0],
          [1, 1],
        ],
        c: C.gold,
      },
      {
        name: "Reversed ranking",
        a: "AUC = 0",
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        c: C.neg,
      },
    ];
    return (
      <>
        <SVG>
          {panels.map((v, i) => {
            const p = A(i, 0.2),
              d = ease((f - at(i, 0.4)) / 40) * (v.points.length - 1);
            return (
              <g key={v.name} opacity={p}>
                <Text x={100 + i * 403} y={14} size={25} color={v.c} weight={700}>
                  {v.name}
                </Text>
                <Plot
                  x={110 + i * 403}
                  y={70}
                  w={270}
                  h={220}
                  points={v.points as [number, number][]}
                  upto={d}
                  color={v.c}
                  fill={appear(f, at(i, 1.6), 16)}
                  xLabel="FPR"
                  yLabel="TPR"
                  dot={false}
                  ticks={[0, 1]}
                />
                <Text x={245 + i * 403} y={384} anchor="middle" size={26} weight={650}>
                  {v.a}
                </Text>
              </g>
            );
          })}
        </SVG>
        <Caption p={A(3, 0.2) * (1 - A(4, 0))} color={C.neg}>
          Below 0.5 may mean a flipped score; don't flip a model because of the test set.
        </Caption>
        <Caption p={A(4, 0.2)} color={C.ink}>
          AUC 0.8 ≠ “80% of predictions are correct.”
        </Caption>
      </>
    );
  }

  if (id === "calibration") {
    const cutX = slot(3) - 13,
      cut = A(3, 0.2);
    return (
      <>
        <SVG>
          <Scores y={14} />
          <In f={f} at={at(0, 0.4)}>
            <g opacity={1 - cut}>
              {ITEMS.map((_, i) => (
                <Arrow key={i} x1={slot(i) + 80} y1={124} x2={slot(i) + 80} y2={176} color={C.gold} />
              ))}
            </g>
            <Text x={1206} y={150} anchor="end" color={C.gold} size={24} weight={700}>
              s → s²
            </Text>
            <Scores squared y={184} />
          </In>
          <In f={f} at={at(1, 1.2)}>
            <Text x={640} y={376} anchor="middle" size={30} color={C.pos} weight={700}>
              Same order → same ROC curve → AUC still 7/9
            </Text>
          </In>
          <g opacity={cut}>
            <path d={`M${cutX} 6V132`} stroke={C.gold} strokeWidth="4" />
            <path d={`M${cutX} 168V298`} stroke={C.gold} strokeWidth="4" />
            <rect x={cutX - 190} y={132} width={380} height={36} rx="8" fill={C.goldSoft} />
            <Text x={cutX} y={150} anchor="middle" size={21} color={C.gold} weight={700}>
              cutoff 0.65 → 0.65² = 0.4225
            </Text>
          </g>
        </SVG>
        <Caption p={A(4, 0.2)}>
          Check calibration separately; choose the threshold from the costs of mistakes.
        </Caption>
      </>
    );
  }
  return null;
}

import { AbsoluteFill, Animate, Chime, Click, Counter, Draw, Easing, Pad, Riser, Sequence, SplitText, Stagger, Thump, TransitionSeries, Whoosh, interpolate, progress, useFrame, useSpring } from "@clapper/core";
import { Eyebrow, Grain, Reveal, Rule, EXPO, INOUT, QUINT, fmtMoney, pointAt, series, smoothPath, useImpact, type Pt } from "../kit";

/**
 * LEDGER — treasury & close for finance teams.
 * Editorial: Fraunces display on bone paper, JetBrains Mono for numbers, one vermilion.
 * Hard cuts on sub-bass hits. 26 s.
 */
const S1 = 105, S2 = 150, S3 = 165, S4 = 150, S5 = 140, S6 = 90;
const WIPE_IN = 16, WIPE_CLOSE = 14;
export const LEDGER_LEN = S1 + S2 + S3 + S4 + S5 + S6 - WIPE_IN - WIPE_CLOSE;

export function Ledger() {
  return (
    <AbsoluteFill className="vid ledger">
      <TransitionSeries transition={{ type: "none", duration: 0 }}>
        <TransitionSeries.Item durationInFrames={S1} name="1 · title"><Title /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S2} name="2 · every dollar" transition={{ type: "wipe", duration: WIPE_IN, direction: "up", easing: INOUT }}><EveryDollar /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S3} name="3 · runway"><Runway /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S4} name="4 · reconcile"><Reconcile /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S5} name="5 · close" transition={{ type: "wipe", duration: WIPE_CLOSE, direction: "left", easing: INOUT }}><Close /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S6} name="6 · end"><End /></TransitionSeries.Item>
      </TransitionSeries>
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
}

const Ink = ({ children }: { children: React.ReactNode }) => <AbsoluteFill style={{ background: "var(--ink)", color: "var(--bone)" }}>{children}</AbsoluteFill>;
const Bone = ({ children }: { children: React.ReactNode }) => <AbsoluteFill style={{ background: "var(--bone)", color: "var(--ink)" }}>{children}</AbsoluteFill>;

/* ----------------------------- 1 · title ----------------------------- */
function Title() {
  const punch = useImpact(6, 0.03);
  return (
    <Ink>
      <Thump at={6} volume={0.7} />
      <Pad notes={["A1", "E2"]} wave="sine" volume={0.09} fadeIn={20} fadeOut={10} />
      <Riser at={S1 - 40} durationInFrames={40} volume={0.2} />
      <div style={{ position: "absolute", left: 120, top: 300, transform: `scale(${punch})`, transformOrigin: "left center" }}>
        <div className="display" style={{ fontSize: 300, display: "flex" }}>
          {[..."LEDGER"].map((ch, i) => (
            <Reveal key={i} at={4 + i * 3} duration={34} skew={6} as="span">
              {ch}
            </Reveal>
          ))}
        </div>
        <Rule at={30} duration={40} length={1180} thickness={3} color="var(--accent)" style={{ marginTop: 26 }} />
        <div style={{ display: "flex", justifyContent: "space-between", width: 1180, marginTop: 22 }}>
          <Reveal at={46} duration={24}><Eyebrow color="var(--muted)">Treasury · Spend · Close</Eyebrow></Reveal>
          <Reveal at={52} duration={24}><Eyebrow color="var(--muted)">Est. 2026 — N° 01</Eyebrow></Reveal>
        </div>
      </div>
    </Ink>
  );
}

/* --------------------------- 2 · every dollar ------------------------- */
function EveryDollar() {
  const frame = useFrame();
  const target = 12_480_913.22;
  const v = interpolate(frame, [14, 84], [11_204_650.08, target], { easing: EXPO });
  const ticks = [];
  for (let f = 14; f < 80; f += 2) ticks.push(f);
  return (
    <Bone>
      <Thump at={0} volume={0.55} from={110} to={40} />
      <Pad notes={["A2", "E3"]} wave="triangle" volume={0.04} fadeIn={20} fadeOut={20} />
      {ticks.map((f) => <Click key={f} at={f} volume={0.035} freq={4200} name={`t${f}`} />)}
      <Chime at={84} notes={["E5"]} volume={0.12} />
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <Reveal at={6} duration={34} className="display" style={{ fontSize: 210 }}>Every dollar,</Reveal>
        <Reveal at={16} duration={34} className="display display-i" style={{ fontSize: 210, color: "var(--accent)" }}>accounted for.</Reveal>
      </div>
      <div style={{ position: "absolute", right: 120, top: 178, width: 560 }}>
        <Reveal at={22} duration={24}><Eyebrow color="var(--muted)">Today · all entities</Eyebrow></Reveal>
        <div className="mono" style={{ marginTop: 18, fontSize: 30 }}>
          {[["Inflows", "+1,204,110.00", "#2f7a4a"], ["Outflows", "−683,914.52", "var(--ink)"], ["Net", "+520,195.48", "var(--accent)"]].map(([k, v, c], i) => (
            <Reveal key={k} at={28 + i * 6} duration={24}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span style={{ color: c }}>{v}</span>
              </div>
            </Reveal>
          ))}
          <Rule at={48} duration={20} color="var(--line)" thickness={1} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 700, width: 1680 }}>
        <Rule at={30} duration={36} color="var(--ink)" thickness={2} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30 }}>
          <div>
            <Reveal at={36} duration={24}><Eyebrow color="var(--muted)">Cash position · live</Eyebrow></Reveal>
            <Reveal at={42} duration={30} className="mono" style={{ fontSize: 112, letterSpacing: "-0.03em", marginTop: 14, fontWeight: 500 }}>
              ${fmtMoney(v)}
            </Reveal>
          </div>
          <div style={{ display: "flex", gap: 80 }}>
            {[["Accounts", "14"], ["Entities", "6"], ["Currencies", "3"]].map(([k, val], i) => (
              <Reveal key={k} at={50 + i * 5} duration={26}>
                <Eyebrow color="var(--muted)">{k}</Eyebrow>
                <div className="mono" style={{ fontSize: 56, marginTop: 8 }}>{val}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Bone>
  );
}

/* ------------------------------ 3 · runway ---------------------------- */
const DATA = series(40, 3, 0.9);
const CHART_W = 1680, CHART_H = 400, CX = 120, CY = 250;
const PTS: Pt[] = DATA.map((v, i) => [CX + (i / (DATA.length - 1)) * CHART_W, CY + CHART_H - v * CHART_H]);

function Runway() {
  const frame = useFrame();
  const draw = progress(frame, 0, 84, INOUT);
  const [mx, my] = pointAt(PTS, draw);
  const fill = progress(frame, 40, 50, EXPO);
  const path = smoothPath(PTS, 0.6);
  return (
    <Bone>
      <Whoosh at={0} volume={0.14} from={200} to={1500} />
      <Chime at={88} notes={["A4", "C#5", "E5"]} spacing={3} volume={0.2} />
      <Pad notes={["A2", "E3"]} wave="triangle" volume={0.04} fadeIn={20} fadeOut={20} />
      <div style={{ position: "absolute", left: 120, top: 120, display: "flex", justifyContent: "space-between", width: 1680 }}>
        <Animate from={{ opacity: 0 }} at={0} duration={6}><Eyebrow color="var(--muted)">Cash runway · projected</Eyebrow></Animate>
        <Animate from={{ opacity: 0 }} at={0} duration={6}><Eyebrow color="var(--muted)">FY26 → FY28</Eyebrow></Animate>
      </div>
      <Rule at={0} duration={20} length={1680} thickness={2} color="var(--ink)" style={{ position: "absolute", left: 120, top: 164 }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="lg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff4a1c" stopOpacity={0.22} />
            <stop offset="1" stopColor="#ff4a1c" stopOpacity={0} />
          </linearGradient>
          <clipPath id="lg-clip"><rect x={CX} y={0} width={(mx - CX)} height={1080} /></clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={CX} x2={CX + CHART_W} y1={CY + CHART_H * g} y2={CY + CHART_H * g} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 6" opacity={progress(frame, 0, 4)} />
        ))}
        <path d={`${path} L${PTS[PTS.length - 1][0]},${CY + CHART_H} L${CX},${CY + CHART_H} Z`} fill="url(#lg-fill)" clipPath="url(#lg-clip)" opacity={fill} />
        <Draw at={0} duration={84} easing={INOUT}>
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </Draw>
        <line x1={mx} x2={mx} y1={CY - 20} y2={CY + CHART_H} stroke="var(--accent)" strokeWidth={1.5} />
        <circle cx={mx} cy={my} r={11} fill="var(--accent)" />
        <circle cx={mx} cy={my} r={22} fill="none" stroke="var(--accent)" strokeWidth={2} opacity={0.5} />
      </svg>
      <div className="mono" style={{ position: "absolute", left: 120, top: CY + CHART_H + 24, width: CHART_W, display: "flex", justifyContent: "space-between", fontSize: 18, color: "var(--muted)", letterSpacing: "0.1em" }}>
        {["JAN 26", "JUL 26", "JAN 27", "JUL 27", "JAN 28"].map((l, i) => (
          <Animate key={l} from={{ opacity: 0 }} at={2 + i * 3} duration={12}>{l}</Animate>
        ))}
      </div>
      <div style={{ position: "absolute", right: 120, bottom: 110, textAlign: "right" }}>
        <Reveal at={86} duration={30} className="display" style={{ fontSize: 168 }}>
          31 <span className="display-i" style={{ color: "var(--accent)" }}>months</span>
        </Reveal>
        <Reveal at={94} duration={26}><Eyebrow color="var(--muted)">of runway at current burn</Eyebrow></Reveal>
      </div>
    </Bone>
  );
}

/* ----------------------------- 4 · reconcile -------------------------- */
const ROWS = [
  ["Stripe payout", "Operating · USD", "+482,110.00"],
  ["AWS", "Infrastructure", "−31,004.18"],
  ["Payroll · Sep", "Rippling", "−612,900.00"],
  ["Deel contractors", "EUR → USD", "−48,210.44"],
  ["Interest · MMF", "Treasury", "+18,332.09"],
  ["Mercury sweep", "Internal", "0.00"],
];

function Reconcile() {
  const frame = useFrame();
  const stampAt = 74;
  const stamp = useSpring({ delay: stampAt, config: { stiffness: 320, damping: 18 }, durationInFrames: 18 });
  const punch = useImpact(stampAt, 0.02);
  return (
    <Ink>
      <Thump at={0} volume={0.5} />
      {ROWS.map((_, i) => <Click key={i} at={i * 6} volume={0.09} freq={1800} name={`row${i}`} />)}
      <Thump at={stampAt} volume={0.75} from={160} to={48} />
      <Pad notes={["A1", "E2"]} wave="sine" volume={0.08} fadeIn={10} fadeOut={10} />
      <div style={{ position: "absolute", left: 120, top: 110, width: 1680, transform: `scale(${punch})` }}>
        <Rule at={0} duration={16} color="var(--accent)" thickness={3} style={{ marginBottom: 26 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {/* instant anchor: the eyebrows are half-on at local frame 0 so the hard cut never lands on a flat frame */}
          <Animate from={{ opacity: 0.45 }} at={0} duration={6}><Eyebrow color="var(--muted)">September close · 1,284 transactions</Eyebrow></Animate>
          <Animate from={{ opacity: 0.45 }} at={0} duration={6}><Eyebrow color="var(--muted)">Matched automatically · 99.2%</Eyebrow></Animate>
        </div>
        <div className="mono" style={{ marginTop: 34, fontSize: 30 }}>
          {ROWS.map(([a, b, c], i) => (
            <Animate key={a} from={{ opacity: 0, y: 18 }} at={i * 6} duration={20} easing={QUINT} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", padding: "26px 0", borderTop: "1px solid rgba(239,234,224,0.18)" }}>
              <span>{a}</span>
              <span style={{ color: "var(--muted)" }}>{b}</span>
              <span style={{ color: c.startsWith("+") ? "#8fe3a2" : c === "0.00" ? "var(--muted)" : "var(--bone)" }}>{c}</span>
            </Animate>
          ))}
          <Animate from={{ opacity: 0 }} at={ROWS.length * 6} duration={12} style={{ borderTop: "1px solid rgba(239,234,224,0.18)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 120, bottom: 120, display: "flex", gap: 90 }}>
        {[["Exceptions", "0 of 1,284"], ["Entities closed", "6 / 6"], ["Variance", "$0.00"]].map(([k, v], i) => (
          <Reveal key={k} at={44 + i * 6} duration={24}>
            <Eyebrow color="var(--muted)">{k}</Eyebrow>
            <div className="mono" style={{ fontSize: 40, marginTop: 10, color: "var(--bone)" }}>{v}</div>
          </Reveal>
        ))}
      </div>
      <div style={{ position: "absolute", right: 200, bottom: 120, transform: `rotate(-9deg) scale(${1.9 - 0.9 * stamp})`, opacity: stamp, transformOrigin: "center" }}>
        <div className="display" style={{ fontSize: 96, color: "var(--accent)", border: "6px solid var(--accent)", padding: "14px 40px 20px", letterSpacing: "0.02em", fontVariationSettings: '"opsz" 144, "wght" 600', lineHeight: 1 }}>
          RECONCILED
        </div>
      </div>
      <div style={{ position: "absolute", right: 200, bottom: 120, width: 700, height: 300, background: "var(--accent)", opacity: frame >= stampAt && frame < stampAt + 3 ? 0.18 : 0, filter: "blur(80px)" }} />
    </Ink>
  );
}

/* -------------------------------- 5 · close ---------------------------- */
function Close() {
  const frame = useFrame();
  const rollAt = 62; // "days" is fully formed by 40, struck through by 60, then rolls
  const roll = progress(frame, rollAt, 26, INOUT);
  const UNIT = 400; // line box tall enough for Fraunces descenders at 300px
  return (
    <Bone>
      <Thump at={0} volume={0.5} />
      <Pad notes={["A2", "E3"]} wave="triangle" volume={0.04} fadeIn={20} fadeOut={20} />
      <Thump at={rollAt + 12} volume={0.6} from={120} to={45} />
      <Chime at={rollAt + 14} notes={["A4", "E5"]} spacing={3} volume={0.16} />
      <div style={{ position: "absolute", left: 120, top: 170 }}>
        <Reveal at={4} duration={30} className="display" style={{ fontSize: 132, color: "var(--muted)" }}>Close the books in</Reveal>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40, marginTop: 10 }}>
          <Reveal at={12} duration={34} className="display" style={{ fontSize: 460 }}>3</Reveal>
          <div style={{ overflow: "hidden", height: UNIT, position: "relative", width: 900, marginBottom: -46, WebkitMaskImage: "linear-gradient(transparent 0, #000 5%, #000 95%, transparent 100%)", maskImage: "linear-gradient(transparent 0, #000 5%, #000 95%, transparent 100%)" }}>
            <div style={{ transform: `translateY(${-roll * UNIT}px)` }}>
              <div style={{ height: UNIT, lineHeight: `${UNIT}px` }}>
                <Reveal at={16} duration={24} as="span" className="display" style={{ fontSize: 300, lineHeight: `${UNIT}px` }}>
                  <span style={{ position: "relative", display: "inline-block" }}>
                    days
                    <span style={{ position: "absolute", left: "-2%", right: "-2%", top: "50%", height: 12, background: "var(--accent)", transform: `scaleX(${progress(frame, rollAt - 18, 14, EXPO)})`, transformOrigin: "left" }} />
                  </span>
                </Reveal>
              </div>
              <div className="display display-i" style={{ fontSize: 300, height: UNIT, lineHeight: `${UNIT}px`, color: "var(--accent)" }}>hours.</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 120, bottom: 110, width: 1680 }}>
        <Rule at={20} duration={40} color="var(--ink)" />
        <div style={{ display: "flex", gap: 120, marginTop: 28 }}>
          <Stagger each={6} at={28} duration={24} from={{ opacity: 0, y: 14 }}>
            {[["Bank feeds", "live"], ["Accruals", "auto"], ["Journal entries", "reviewed"], ["Board pack", "Tuesday"]].map(([k, v]) => (
              <div key={k}>
                <Eyebrow color="var(--muted)">{k}</Eyebrow>
                <div className="mono" style={{ fontSize: 30, marginTop: 8 }}>{v}</div>
              </div>
            ))}
          </Stagger>
        </div>
      </div>
    </Bone>
  );
}

/* --------------------------------- 6 · end ----------------------------- */
function End() {
  const frame = useFrame();
  const pop = useSpring({ delay: 0, config: "smooth", durationInFrames: 24 });
  const fade = progress(frame, S6 - 18, 18, Easing.inCubic);
  return (
    <Ink>
      <Thump at={0} volume={0.6} />
      <Chime at={10} notes={["A3", "C#4", "E4", "G#4", "B4"]} spacing={3} volume={0.24} wave="sine" />
      <Pad notes={["A1", "E2", "C#3"]} wave="sine" volume={0.1} fadeIn={8} fadeOut={30} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
        <svg width={170} height={170} viewBox="0 0 100 100" style={{ transform: `scale(${0.7 + 0.3 * pop})` }}>
          {/* instant anchor: a ghost of the mark is on screen at local frame 0; Draw inks over it */}
          <path d="M22 14 V86 H84" fill="none" stroke="var(--accent)" strokeWidth={12} strokeLinecap="square" opacity={0.22} />
          <Draw at={0} duration={26} each={6}>
            <path d="M22 14 V86 H84" fill="none" stroke="var(--accent)" strokeWidth={12} strokeLinecap="square" />
            <circle cx={78} cy={22} r={8} fill="none" stroke="var(--bone)" strokeWidth={6} />
          </Draw>
        </svg>
        <Reveal at={6} duration={32} className="display" style={{ fontSize: 160 }}>Ledger</Reveal>
        <Reveal at={24} duration={30} className="display display-i" style={{ fontSize: 48, color: "var(--muted)" }}>Every dollar, accounted for.</Reveal>
        <Reveal at={34} duration={26}><Eyebrow color="var(--accent)">ledger.finance</Eyebrow></Reveal>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade }} />
    </Ink>
  );
}

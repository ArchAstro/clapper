import { AbsoluteFill, Animate, Chime, Draw, Easing, Pad, Pop, Sequence, Stagger, Thump, TransitionSeries, Whoosh, interpolate, progress, spring, transitionSeriesLength, useFps, useFrame, useSpring } from "@clapper/core";
import { Grain, Reveal, EXPO, INOUT, QUINT } from "../kit";
import { noise1d } from "@clapper/core";

/**
 * ORBIT — meetings that find their own time.
 * Bold color blocks, Bricolage Grotesque, spring physics, slide wipes. 24 s.
 */
const S1 = 90, S2 = 180, S3 = 150, S4 = 150, S5 = 150;
const T = { type: "slide" as const, duration: 14, easing: INOUT };
/** The button into the end card is longer and snappier than the three working cuts. */
const T_END = { type: "slide" as const, duration: 20, direction: "left" as const, easing: EXPO };
export const ORBIT_LEN = transitionSeriesLength([{ durationInFrames: S1 }, { durationInFrames: S2 }, { durationInFrames: S3 }, { durationInFrames: S4 }, { durationInFrames: S5, transition: T_END }], T);

export function Orbit() {
  return (
    <AbsoluteFill className="vid orbit" style={{ background: "var(--black)" }}>
      <TransitionSeries transition={T}>
        <TransitionSeries.Item durationInFrames={S1} name="1 · orbit"><Logo /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S2} name="2 · calendar" transition={{ ...T, direction: "up" }}><Calendar /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S3} name="3 · free at" transition={{ ...T, direction: "left" }}><FreeAt /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S4} name="4 · async" transition={{ ...T, direction: "up" }}><Async /></TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={S5} name="5 · end" transition={T_END}><End /></TransitionSeries.Item>
      </TransitionSeries>
      <Grain opacity={0.05} blend="overlay" />
    </AbsoluteFill>
  );
}

function Block({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return <AbsoluteFill style={{ background: bg, color }}>{children}</AbsoluteFill>;
}

/** The ring + planet that orbit the "o". */
function Ring({ size = 320, at = 0, color = "currentColor", planet = "var(--cream)", speed = 5 }: { size?: number; at?: number; color?: string; planet?: string; speed?: number }) {
  const frame = useFrame();
  const a = ((frame - at) * speed * Math.PI) / 180;
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
      <Draw at={at} duration={36} easing={EXPO}>
        <circle cx={r} cy={r} r={r - 8} fill="none" stroke={color} strokeWidth={size * 0.045} transform={`rotate(-90 ${r} ${r})`} />
      </Draw>
      <circle cx={r + Math.cos(a) * (r - 8)} cy={r + Math.sin(a) * (r - 8)} r={size * 0.075} fill={planet} stroke={color} strokeWidth={size * 0.03} opacity={progress(frame, at + 10, 10)} />
    </svg>
  );
}

/* --------------------------------- 1 · logo ---------------------------- */
function Logo() {
  return (
    <Block bg="var(--coral)" color="var(--black)">
      <Thump at={0} volume={0.5} from={200} to={60} />
      <Pop at={12} freq={700} volume={0.3} />
      <Chime at={26} notes={["C5", "G5"]} spacing={4} volume={0.18} wave="triangle" />
      <Pad notes={["C3", "G3"]} wave="triangle" volume={0.05} fadeIn={10} fadeOut={10} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="display" style={{ fontSize: 380, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ marginRight: 12, marginTop: 30 }}>
            <Ring size={300} at={4} color="var(--black)" planet="var(--cream)" />
          </div>
          {[..."rbit"].map((ch, i) => (
            <Reveal key={i} at={10 + i * 5} duration={30} as="span" easing={QUINT}>{ch}</Reveal>
          ))}
        </div>
      </div>
      <Reveal at={40} duration={24} style={{ position: "absolute", left: 120, bottom: 120, fontSize: 30, fontWeight: 500, letterSpacing: "0.02em" }}>Team scheduling, reinvented.</Reveal>
      <Reveal at={44} duration={24} style={{ position: "absolute", right: 120, bottom: 120, fontSize: 30, fontWeight: 500 }}>orbit.team</Reveal>
    </Block>
  );
}

/* ------------------------------- 2 · calendar -------------------------- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const COLS = 5, ROWS = 8;
const GX = 120, GY = 240, GW = 1680, GH = 720;
const CW = GW / COLS, RH = GH / ROWS;
// [col, row, span, color, label, conflictMoveTo?]
const EVENTS: [number, number, number, string, string, [number, number]?][] = [
  [0, 1, 2, "var(--blue)", "Design crit"],
  [1, 0, 1, "var(--black)", "Standup"],
  [1, 3, 2, "var(--mint)", "1:1 Ana"],
  [2, 2, 2, "var(--lilac)", "Roadmap"],
  [3, 1, 1, "var(--black)", "Standup"],
  [3, 4, 3, "var(--blue)", "Sprint review"],
  [4, 2, 2, "var(--coral)", "Hiring loop"],
  [2, 2, 1, "var(--yellow)", "Dentist", [4, 6]], // conflict: overlaps Roadmap, moves
];

function Calendar() {
  const frame = useFrame();
  const fps = useFps();
  const moveAt = 96;
  return (
    <Block bg="var(--cream)" color="var(--black)">
      <Whoosh at={0} volume={0.14} />
      {EVENTS.map((_, i) => <Pop key={i} at={14 + i * 6 + 8} freq={520 + i * 60} volume={0.22} name={`drop${i}`} />)}
      <Pop at={moveAt + 6} freq={1100} volume={0.25} name="fix" />
      <Chime at={moveAt + 24} notes={["E5", "G5", "C6"]} spacing={3} volume={0.18} wave="triangle" />
      <Pad notes={["C3", "G3", "E4"]} wave="triangle" volume={0.04} fadeIn={10} fadeOut={10} />
      <div style={{ position: "absolute", left: 120, top: 90, display: "flex", justifyContent: "space-between", width: 1680, alignItems: "baseline" }}>
        <Reveal at={0} duration={26} className="display" style={{ fontSize: 88 }}>This week</Reveal>
        <Reveal at={6} duration={26} style={{ fontSize: 26, fontWeight: 500, opacity: 0.6 }}>Sep 7 – 11 · 5 people · 2 time zones</Reveal>
      </div>
      {/* grid */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: COLS + 1 }, (_, i) => (
          <line key={`c${i}`} x1={GX + i * CW} x2={GX + i * CW} y1={GY} y2={GY + GH} stroke="rgba(20,20,24,0.18)" strokeWidth={1.5} opacity={progress(frame, 4 + i * 2, 12)} />
        ))}
        {Array.from({ length: ROWS + 1 }, (_, i) => (
          <line key={`r${i}`} x1={GX} x2={GX + GW} y1={GY + i * RH} y2={GY + i * RH} stroke="rgba(20,20,24,0.12)" strokeWidth={1} opacity={progress(frame, 6 + i * 1.5, 12)} />
        ))}
      </svg>
      {DAYS.map((d, i) => (
        <Animate key={d} from={{ opacity: 0, y: -10 }} at={8 + i * 2} duration={16} style={{ position: "absolute", left: GX + i * CW + 18, top: GY - 44, fontSize: 24, fontWeight: 700, letterSpacing: "0.04em" }}>
          {d.toUpperCase()}
        </Animate>
      ))}
      {EVENTS.map(([c, r, span, bg, label, moveTo], i) => {
        const dropAt = 14 + i * 6;
        const s = spring({ frame, fps, delay: dropAt, config: { stiffness: 230, damping: 15 }, durationInFrames: 30 });
        let cx = c, cy = r;
        let ring = 0;
        let lift = 0; // 0..1 while the block is airborne
        if (moveTo) {
          const m = spring({ frame, fps, delay: moveAt, config: { stiffness: 170, damping: 16 }, durationInFrames: 28 });
          cx = c + (moveTo[0] - c) * m;
          cy = r + (moveTo[1] - r) * m;
          lift = frame >= moveAt && frame < moveAt + 34 ? Math.sin(Math.min(1, Math.max(0, m)) * Math.PI) : 0;
          ring = interpolate(frame, [moveAt - 30, moveAt - 24, moveAt - 18, moveAt - 12, moveAt - 6, moveAt], [0, 1, 0, 1, 0, 1]);
          if (frame > moveAt + 4) ring = 0;
        }
        const light = bg === "var(--mint)" || bg === "var(--lilac)" || bg === "var(--yellow)";
        return (
          <div key={i} style={{ position: "absolute", left: GX + cx * CW + 8, top: GY + cy * RH + 6 - (1 - s) * 500 - lift * 36, width: CW - 16, height: span * RH - 12, background: bg, color: light ? "var(--black)" : "var(--cream)", borderRadius: 14, padding: "14px 18px", fontSize: 24, fontWeight: 700, opacity: Math.min(1, s * 2), boxShadow: `0 0 0 ${ring * 6}px var(--coral), 0 ${24 * lift}px ${48 * lift}px rgba(20,20,24,${0.35 * lift})`, transform: `scale(${1 + 0.05 * lift})`, zIndex: moveTo ? 10 : 1 }}>
            {label}
            <div style={{ fontSize: 18, fontWeight: 500, opacity: 0.7, marginTop: 4 }}>{9 + r}:00</div>
          </div>
        );
      })}
      <Sequence from={moveAt} layout="none" name="headline">
        <div style={{ position: "absolute", left: 120, top: 700, zIndex: 5 }}>
          <div style={{ background: "var(--black)", color: "var(--cream)", display: "inline-block", padding: "26px 36px", borderRadius: 22, boxShadow: "0 30px 60px rgba(20,20,24,0.25)" }}>
            <Reveal at={0} duration={20} className="display" style={{ fontSize: 64 }}>Conflicts fix themselves.</Reveal>
          </div>
        </div>
      </Sequence>
    </Block>
  );
}

/* -------------------------------- 3 · free at -------------------------- */
const PEOPLE = [["AK", "var(--coral)"], ["MJ", "var(--yellow)"], ["RS", "var(--mint)"], ["TL", "var(--lilac)"], ["DP", "var(--cream)"]];
function FreeAt() {
  const frame = useFrame();
  const hand = useSpring({ delay: 4, config: { stiffness: 60, damping: 9 }, durationInFrames: 60 });
  const angle = 90 - (1 - hand) * 1080; // minute hand: three turns, lands pointing down (:30)
  const hour = -15 - (1 - hand) * 720; // hour hand lands between 2 and 3
  return (
    <Block bg="var(--blue)" color="var(--cream)">
      <Whoosh at={0} volume={0.14} />
      <Pop at={4} freq={600} volume={0.2} />
      <Chime at={46} notes={["G5", "C6"]} spacing={5} volume={0.2} wave="triangle" />
      {PEOPLE.map((_, i) => <Pop key={i} at={56 + i * 5} freq={800 + i * 120} volume={0.18} name={`p${i}`} />)}
      <Pad notes={["G2", "D3", "B3"]} wave="triangle" volume={0.045} fadeIn={10} fadeOut={10} />
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <Reveal at={2} duration={28} className="display-light" style={{ fontSize: 72 }}>Everyone's free at</Reveal>
        <Reveal at={40} duration={32} className="display" style={{ fontSize: 400, marginTop: 10 }}>2:30</Reveal>
        <Reveal at={50} duration={26} style={{ fontSize: 30, fontWeight: 500, opacity: 0.85, marginTop: 8 }}>Thursday · 25 min · everyone's working hours</Reveal>
      </div>
      <svg width={640} height={640} style={{ position: "absolute", right: 140, top: 120 }} viewBox="0 0 640 640">
        <circle cx={320} cy={320} r={300} fill="none" stroke="var(--cream)" strokeWidth={10} opacity={progress(frame, 0, 20)} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={320 + Math.cos((i / 12) * Math.PI * 2) * 262} y1={320 + Math.sin((i / 12) * Math.PI * 2) * 262} x2={320 + Math.cos((i / 12) * Math.PI * 2) * 284} y2={320 + Math.sin((i / 12) * Math.PI * 2) * 284} stroke="var(--cream)" strokeWidth={i % 3 === 0 ? 10 : 5} strokeLinecap="round" opacity={progress(frame, 6 + i, 8)} />
        ))}
        <line x1={320} y1={320} x2={320 + Math.cos((hour * Math.PI) / 180) * 150} y2={320 + Math.sin((hour * Math.PI) / 180) * 150} stroke="var(--cream)" strokeWidth={18} strokeLinecap="round" />
        <line x1={320} y1={320} x2={320 + Math.cos((angle * Math.PI) / 180) * 230} y2={320 + Math.sin((angle * Math.PI) / 180) * 230} stroke="var(--coral)" strokeWidth={12} strokeLinecap="round" />
        <circle cx={320} cy={320} r={18} fill="var(--cream)" />
      </svg>
      <div style={{ position: "absolute", right: 140, top: 820, display: "flex" }}>
        <Stagger each={5} at={56} duration={24} spring="wobbly" from={{ opacity: 0, scale: 0.4, y: 20 }}>
          {PEOPLE.map(([ini, bg], i) => (
            <div key={ini} style={{ width: 120, height: 120, borderRadius: 999, background: bg, color: "var(--black)", display: "grid", placeItems: "center", fontSize: 36, fontWeight: 700, border: "6px solid var(--blue)", marginLeft: i ? -26 : 0 }}>
              {ini}
            </div>
          ))}
        </Stagger>
      </div>
    </Block>
  );
}

/* --------------------------------- 4 · async --------------------------- */
function Async() {
  const frame = useFrame();
  const play = progress(frame, 24, 110, Easing.linear);
  return (
    <Block bg="var(--yellow)" color="var(--black)">
      <Whoosh at={0} volume={0.14} />
      <Pop at={20} freq={520} volume={0.22} />
      <Chime at={104} notes={["C5", "E5"]} spacing={4} volume={0.16} wave="triangle" />
      <Pad notes={["F2", "C3", "A3"]} wave="triangle" volume={0.04} fadeIn={10} fadeOut={10} />
      <div style={{ position: "absolute", left: 120, top: 130, width: 900 }}>
        <Reveal at={2} duration={30} className="display" style={{ fontSize: 150 }}>Async</Reveal>
        <Reveal at={8} duration={30} className="display" style={{ fontSize: 150 }}>by default.</Reveal>
        <Reveal at={26} duration={26} style={{ fontSize: 30, fontWeight: 500, marginTop: 34, lineHeight: 1.4, maxWidth: 700 }}>
          Record a four-minute update instead of booking forty minutes of everyone's afternoon.
        </Reveal>
      </div>
      <Animate from={{ opacity: 0, y: 60, rotate: -3 }} at={14} duration={30} spring="smooth" style={{ position: "absolute", right: 120, top: 220, width: 760, background: "var(--black)", color: "var(--cream)", borderRadius: 32, padding: 40, boxShadow: "0 30px 60px rgba(20,20,24,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--coral)", color: "var(--black)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 24 }}>AK</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>Ana · Roadmap update</div>
            <div style={{ fontSize: 20, opacity: 0.6 }}>Recorded 9:12 · 4 min</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, marginTop: 40 }}>
          {Array.from({ length: 40 }, (_, i) => {
            const h = 22 + 74 * Math.abs(noise1d(i * 0.55, 7) * 0.7 + noise1d(i * 2.1, 3) * 0.3);
            const active = i / 40 < play;
            const bounce = active && Math.abs(i / 40 - play) < 0.08 ? 1.25 : 1;
            return <div key={i} style={{ flex: 1, height: `${h * bounce}%`, borderRadius: 6, background: active ? "var(--coral)" : "rgba(244,239,230,0.25)", transition: "none" }} />;
          })}
        </div>
        <div style={{ marginTop: 26, height: 8, borderRadius: 4, background: "rgba(244,239,230,0.2)", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${play * 100}%`, background: "var(--cream)", borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
          <Stagger each={6} at={40} duration={20} from={{ opacity: 0, y: 10 }}>
            {["Transcript", "3 listened", "1 reply"].map((c) => (
              <span key={c} style={{ padding: "10px 18px", borderRadius: 999, border: "1.5px solid rgba(244,239,230,0.35)", fontSize: 20, fontWeight: 500 }}>{c}</span>
            ))}
          </Stagger>
        </div>
      </Animate>
      <Sequence from={104} layout="none" name="watched">
        <Animate from={{ opacity: 0, scale: 0.6 }} duration={18} spring="wobbly" style={{ position: "absolute", right: 80, top: 170, background: "var(--mint)", color: "var(--black)", padding: "16px 26px", borderRadius: 999, fontSize: 26, fontWeight: 700, transform: "rotate(6deg)" }}>
          ✓ Everyone's caught up
        </Animate>
      </Sequence>
    </Block>
  );
}

/* --------------------------------- 5 · end ----------------------------- */
function End() {
  const frame = useFrame();
  const fade = progress(frame, S5 - 18, 18, Easing.inCubic);
  return (
    <Block bg="var(--black)" color="var(--cream)">
      <Whoosh at={0} volume={0.14} />
      <Thump at={8} volume={0.45} from={180} to={55} />
      <Chime at={14} notes={["C5", "E5", "G5", "C6"]} spacing={4} volume={0.22} wave="triangle" />
      <Pad notes={["C3", "G3", "E4"]} wave="triangle" volume={0.05} fadeIn={10} fadeOut={30} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div className="display" style={{ fontSize: 260, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ marginTop: 22, marginRight: 8 }}>
            <Ring size={206} at={6} color="var(--cream)" planet="var(--coral)" speed={4} />
          </div>
          {[..."rbit"].map((ch, i) => (
            <Reveal key={i} at={12 + i * 5} duration={30} as="span">{ch}</Reveal>
          ))}
        </div>
        <Reveal at={30} duration={28} className="display-light" style={{ fontSize: 52, opacity: 0.9 }}>Meetings that find their own time.</Reveal>
        <Reveal at={44} duration={24} style={{ fontSize: 26, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, marginTop: 18 }}>orbit.team · free for teams of five</Reveal>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade }} />
    </Block>
  );
}

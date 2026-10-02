import { defineScore, type Note, note } from "@archastro/clapper-music";
import beats from "./beats.json";
import timing from "./timing.json";

// A quiet bed for a narrated lesson. 60 BPM, so one beat is one second and every
// position below reads directly in film seconds. Music rises in the title card,
// the breaths between chapters and the end card, and sits well under speech.
type Timing = Record<string, { seconds: number; lines: { at: number; dur: number }[] }>;
type Beat = { id: string; chapter?: string };
const T = timing as Timing;
const B = beats as Beat[];
const scenes: { id: string; part: number; start: number; seconds: number; speech?: [number, number] }[] = [];
{
  let t = 0,
    part = 0;
  for (const b of B) {
    const s = T[b.id] ?? { seconds: 8, lines: [] };
    if (b.chapter) part = Number(b.chapter.slice(0, 2)) - 1;
    const first = s.lines[0],
      last = s.lines.at(-1);
    scenes.push({
      id: b.id,
      part,
      start: t,
      seconds: s.seconds,
      speech: first && last ? [t + first.at, t + last.at + last.dur] : undefined,
    });
    t += s.seconds;
  }
}
const TOTAL = scenes.reduce((a, s) => a + s.seconds, 0);
const sceneAt = (t: number) => [...scenes].reverse().find((s) => s.start <= t) ?? scenes[0];
const startOf = (id: string) => scenes.find((s) => s.id === id)?.start ?? 0;

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midi = (p: string) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(p)!;
  return NAMES.indexOf(m[1]) + 12 * (Number(m[2]) + 1);
};

// Dmaj9 → Bm11 → Gmaj7(#11) → Asus: slow and open, no strong cadence until the end card.
const HARMONY = [
  { bass: "D2", pad: ["A3", "D4", "F#4"], top: ["E5", "F#5", "A5"] },
  { bass: "B2", pad: ["F#3", "D4", "E4"], top: ["D5", "F#5", "A5"] },
  { bass: "G2", pad: ["B3", "D4", "F#4"], top: ["C#5", "F#5", "B5"] },
  { bass: "A2", pad: ["E3", "A3", "D4"], top: ["B4", "E5", "A5"] },
];
const BAR = 8; // beats (= seconds) per chord
// Part 4 (precision–recall) lifts a whole step: a new curve, a new colour.
const shift = (t: number) => (sceneAt(t).part === 3 ? 2 : 0);
const END = startOf("end");
const LOOP_END = END - 4; // then an explicit A → D cadence on the end card

const piano: Note[] = [],
  strings: Note[] = [],
  bass: Note[] = [],
  harp: Note[] = [];
// The piano figure changes with each part of the lesson instead of every bar: [offset, top index, length].
const FIGURES = [
  [
    [0, 0, 3],
    [1.5, 1, 2.5],
    [3, 2, 4],
  ], // intuition: rising broken chord
  [
    [0, 2, 3],
    [2, 1, 3],
    [4, 0, 3.5],
  ], // build ROC: the same notes, falling
  [
    [0, 0, 3],
    [3, 2, 4],
  ], // ranking math: sparser, leaves room for formulas
  [
    [0, 1, 2],
    [1, 2, 2],
    [2.5, 0, 3],
  ], // precision–recall: a new shape in the new key
  [[0, 2, 4]], // other contexts: one bell-like note per chord
  [
    [0, 0, 3],
    [1.5, 1, 2.5],
    [3, 2, 4],
  ], // use it: the opening figure returns
];
for (let i = 0; i * BAR < LOOP_END; i++) {
  const h = HARMONY[i % 4],
    at = i * BAR,
    len = Math.min(BAR, LOOP_END - at),
    s = shift(at),
    scene = sceneAt(at),
    // Softer under the opening hook and the one-note "bells" of the survey part.
    v = 36 + (i % 2) * 4 - (scene.part === 0 ? 5 : scene.part === 4 ? 8 : 0),
    p = (name: string) => midi(name) + s;
  for (const [dt, idx, d] of FIGURES[scene.part])
    if (dt < len) piano.push(note(p(h.top[idx]), at + dt, Math.min(d, len - dt), v - idx * 2));
  if (i % 2 && scene.part !== 2 && len > 5)
    piano.push(note(p(h.pad[2]), at + 5, Math.min(3, len - 5), v - 8));
  // Strings rest under the dense survey of other curves, then return.
  // Rest only for bars wholly inside it, so the pad is back as soon as the next scene starts.
  if (scene.id !== "letters" || sceneAt(at + len - 0.01).id !== "letters")
    strings.push(...h.pad.map((n) => note(p(n), at, len, 44)));
  bass.push(note(p(h.bass), at, len, 40));
}
// Cadence: A (with its third) for four seconds, resolving to D as the end card lands.
strings.push(...["E3", "A3", "C#4"].map((n) => note(n, LOOP_END, 4, 46)));
bass.push(note("A2", LOOP_END, 4, 42));
piano.push(note("C#5", LOOP_END + 0.5, 3, 34), note("E5", LOOP_END + 2, 2, 32));
strings.push(...["D3", "A3", "F#4"].map((n) => note(n, END, 9, 48)));
bass.push(note("D2", END, 9, 44));
piano.push(...["D4", "F#4", "A4", "D5"].map((n, k) => note(n, END + 0.1 + k * 0.05, 6, 44 - k * 2)));
harp.push(...["D4", "A4", "D5", "F#5", "A5"].map((n, k) => note(n, END + 0.3 + k * 0.22, 6, 54 - k * 3)));

// Title card: a rising figure that lands on the wordmark.
const title = startOf("title");
["D5", "F#5", "A5", "C#6", "E6"].forEach((n, k) =>
  harp.push(note(n, title + 0.4 + k * 0.32, 3.5, 58 - k * 3)),
);
// Each new part gets one soft harp glint on its first cut, taken from the chord sounding then.
B.forEach((b, i) => {
  if (i === 0 || !b.chapter || b.chapter.slice(0, 2) === B[i - 1].chapter?.slice(0, 2)) return;
  const t = startOf(b.id),
    h = HARMONY[Math.floor(t / BAR) % 4];
  harp.push(note(midi(h.top[2]) + shift(t), t, 4, 46));
});

// Ducking: full on the title and end cards, a breath between chapters, low under speech.
const DUCK = 0.3,
  GAP = 0.6,
  CARD = 1.4,
  RAMP = 0.7;
const auto: { at: number; value: number }[] = [
  { at: 0, value: 0 },
  { at: 0.6, value: GAP },
];
for (const s of scenes) {
  if (!s.speech) {
    auto.push(
      { at: s.start + 0.3, value: CARD },
      { at: s.start + s.seconds - (s.id === "end" ? 4 : 1.2), value: CARD },
    );
    continue;
  }
  const [a, b] = s.speech;
  auto.push({ at: Math.max(a - RAMP, auto.at(-1)!.at + 0.05), value: GAP });
  auto.push({ at: a, value: DUCK });
  auto.push({ at: b + 0.2, value: DUCK });
  auto.push({ at: b + 0.2 + RAMP * 1.5, value: GAP });
}
auto.push({ at: TOTAL - 0.05, value: 0 });
// Deduplicate positions that collide when one scene's speech follows closely after another's.
const gain = auto.sort((x, y) => x.at - y.at).filter((p, i, a) => i === 0 || p.at - a[i - 1].at > 0.04);

export default defineScore({
  title: "AUC — study bed",
  tempo: 60,
  meter: [4, 4],
  seed: 7,
  length: TOTAL + 6,
  tail: 4,
  tracks: [
    {
      id: "piano",
      instrument: "vsupright1",
      gain: 0.75,
      reverb: 0.45,
      pan: -0.12,
      clips: [{ notes: piano }],
      humanize: { timing: 0.012, velocity: 4 },
      gainAutomation: gain,
    },
    {
      id: "strings",
      instrument: "viola-ens-sus-vib-quiet",
      gain: 0.17,
      reverb: 0.5,
      pan: 0.15,
      clips: [{ notes: strings }],
      gainAutomation: gain,
    },
    {
      id: "bass",
      instrument: "cello-ens-sus-vib-quiet",
      gain: 0.12,
      reverb: 0.35,
      clips: [{ notes: bass }],
      gainAutomation: gain,
    },
    {
      id: "harp",
      instrument: "harp",
      gain: 0.6,
      reverb: 0.55,
      pan: 0.1,
      clips: [{ notes: harp }],
      gainAutomation: gain,
    },
  ],
});

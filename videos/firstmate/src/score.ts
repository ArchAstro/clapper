import { chord, defineScore, type Note, note } from "@archastro/clapper-music";

// THE CAPTAIN'S SHARE — original instrumental sea shanty, 6/8.
// Quarter=120, dotted-quarter=80: two broad deck-stomps to each bar.
export const BPM = 120;
const fiddle: Note[] = [],
  flute: Note[] = [],
  bass: Note[] = [],
  guitar: Note[] = [],
  organ: Note[] = [],
  drums: Note[] = [];
const roots = [38, 38, 45, 38, 36, 34, 45, 38, 41, 36, 34, 45, 38, 38, 34, 45, 38, 36, 34, 45, 38, 45, 38];
const chords: Record<number, number[]> = {
  38: [62, 65, 69],
  36: [60, 64, 67],
  34: [58, 62, 65],
  45: [61, 64, 67, 69],
  41: [60, 65, 69],
};
const phrases = [
  [
    [69, 0, 0.45],
    [74, 0.5, 0.9],
    [77, 1.5, 0.45],
    [76, 2, 0.45],
    [74, 2.5, 0.45],
  ],
  [
    [72, 0, 0.9],
    [76, 1, 0.45],
    [79, 1.5, 0.9],
    [76, 2.5, 0.45],
  ],
  [
    [77, 0, 0.9],
    [74, 1, 0.45],
    [70, 1.5, 0.9],
    [74, 2.5, 0.45],
  ],
  [
    [73, 0, 0.45],
    [76, 0.5, 0.45],
    [79, 1, 0.45],
    [76, 1.5, 0.45],
    [73, 2, 0.45],
    [69, 2.5, 0.45],
  ],
  [
    [74, 0, 1.35],
    [77, 1.5, 0.45],
    [81, 2, 0.9],
  ],
  [
    [79, 0, 0.9],
    [77, 1, 0.45],
    [76, 1.5, 0.9],
    [72, 2.5, 0.45],
  ],
  [
    [77, 0, 0.45],
    [74, 0.5, 0.45],
    [70, 1, 0.45],
    [74, 1.5, 0.9],
    [77, 2.5, 0.45],
  ],
  [
    [76, 0, 0.45],
    [73, 0.5, 0.45],
    [69, 1, 0.45],
    [73, 1.5, 0.9],
    [76, 2.5, 0.45],
  ],
];
function drum(p: number, at: number, v: number, d = 0.18) {
  drums.push(note(p, at, d, v));
}
for (let bar = 0; bar < 23; bar++) {
  const at = bar * 3,
    r = roots[bar],
    intro = bar < 3,
    quiet = bar >= 12 && bar < 14,
    ending = bar === 22;
  if (ending) {
    bass.push(note(38, at, 2.5, 86));
    organ.push(...chord([50, 57, 62, 65], { at, duration: 2.5, velocity: 57 }));
    guitar.push(...chord([50, 57, 62, 65, 69], { at, duration: 2.3, velocity: 83, strum: 0.02 }));
    fiddle.push(note(74, at, 1.85, 79));
    flute.push(note(74, at, 2.25, 65));
    drum(36, at, 95);
    drum(49, at, 42, 1.6);
    continue;
  }
  bass.push(note(r, at, 0.8, intro ? 70 : 91), note(r + 7, at + 1.5, 0.8, intro ? 61 : 80));
  if (!quiet)
    for (const off of [0.5, 1, 2, 2.5])
      guitar.push(
        ...chord(chords[r], { at: at + off, duration: 0.33, velocity: intro ? 42 : 65, strum: 0.012 }),
      );
  organ.push(
    ...chord(
      chords[r].map((p) => p - 12),
      { at, duration: 2.85, velocity: intro ? 30 : quiet ? 42 : 47 },
    ),
  );
  drum(36, at, intro ? 52 : quiet ? 60 : 88);
  drum(45, at + 1.5, intro ? 43 : quiet ? 50 : 74);
  if (!intro && !quiet) {
    for (const off of [0.5, 1, 2, 2.5]) drum(42, at + off, off % 1 ? 28 : 39);
    drum(38, at + 1.5, 50);
    if ([6, 11, 15, 19, 21].includes(bar)) {
      drum(45, at + 2, 62);
      drum(47, at + 2.5, 75);
    }
  }
  if (intro) {
    if (bar === 2) flute.push(note(69, at + 2, 0.4, 53), note(73, at + 2.5, 0.4, 59));
    continue;
  }
  const idx = bar >= 20 ? (bar === 20 ? 4 : 7) : (bar - 3) % 8;
  const melody = phrases[idx];
  // Align question/response with the actual chord, rather than a blind transposition.
  const selected =
    r === 45
      ? phrases[3]
      : r === 36
        ? phrases[1]
        : r === 34
          ? phrases[2]
          : r === 41
            ? [
                [77, 0, 0.9],
                [81, 1, 0.45],
                [84, 1.5, 0.9],
                [81, 2.5, 0.45],
              ]
            : melody;
  for (const [p, t, d] of selected) {
    const target = bar % 4 < 2 ? fiddle : flute;
    target.push(note(p, at + t, d, quiet ? 62 : bar >= 20 ? 89 : 79 + (t === 0 ? 7 : 0)));
    if (bar >= 7 && !quiet && bar % 4 === 0) flute.push(note(p - 12, at + t, Math.min(0.7, d), 52));
  }
}
export const score = defineScore({
  title: "The Captain's Share",
  tempo: BPM,
  meter: [6, 8],
  length: 69,
  tail: 1.5,
  seed: 1729,
  markers: [
    { name: "too many orders", at: 0 },
    { name: "one first mate", at: 9 },
    { name: "crew under way", at: 21 },
    { name: "captain decides", at: 36 },
    { name: "relay", at: 48 },
    { name: "take the helm", at: 60 },
  ],
  tracks: [
    {
      id: "fiddle",
      instrument: "sviolin-spic",
      clips: [{ notes: fiddle }],
      gain: 0.6,
      pan: -0.15,
      reverb: 0.2,
      humanize: { timing: 0.006, velocity: 3 },
    },
    {
      id: "flute",
      instrument: "flute-sus-nv",
      clips: [{ notes: flute }],
      gain: 0.4,
      pan: 0.15,
      reverb: 0.18,
      humanize: { timing: 0.004, velocity: 2 },
    },
    {
      id: "guitar",
      instrument: "green-guitar",
      clips: [{ notes: guitar }],
      gain: 0.45,
      preampDb: 15,
      drive: 1,
      pan: -0.3,
      reverb: 0.11,
      humanize: { timing: 0.003, velocity: 2 },
    },
    { id: "bass", instrument: "contrabass-pizz", clips: [{ notes: bass }], gain: 0.73, pan: 0, reverb: 0.1 },
    {
      id: "harmonium-colour",
      instrument: "organ-quiet",
      clips: [{ notes: organ }],
      gain: 0.17,
      pan: 0.22,
      reverb: 0.22,
    },
    {
      id: "deck-pulse",
      instrument: "club-drums",
      clips: [{ notes: drums }],
      gain: 0.57,
      drums: true,
      reverb: 0.09,
    },
  ],
});
export default score;

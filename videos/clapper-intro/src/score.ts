import { chord, defineScore, type Note, note, phrase } from "@archastro/clapper-music";

// LITTLE CODE, BIG PERSONALITY — original C-minor pocket with dorian colour, 120 BPM.
// A four-note cell grows into a response, takes a breath, then lands together.
export const motif = phrase("C5 Eb5 G5 A5", { duration: 0.5, velocity: 88 });
const mallets: Note[] = [],
  bass: Note[] = [],
  drums: Note[] = [],
  piano: Note[] = [],
  brass: Note[] = [];
const roots = [36, 36, 41, 43, 36, 41, 44, 43, 36, 43, 41, 36];
const voicings = [
  [60, 63, 67, 70],
  [60, 63, 67, 70],
  [60, 65, 69, 72],
  [59, 62, 65, 68],
  [60, 63, 67, 70],
  [60, 65, 69, 72],
  [60, 63, 68, 72],
  [59, 62, 65, 68],
  [60, 63, 67, 70],
  [59, 62, 65, 68],
  [60, 65, 69, 72],
  [60, 63, 67, 74],
];
const lead = [
  [72, 75, 79, 81],
  [79, 75, 72, 70],
  [77, 81, 84, 81],
  [74, 71, 68, 67],
  [72, 75, 79, 81],
  [84, 81, 77, 75],
  [80, 79, 75, 72],
  [74, 71, 68, 67],
  [72, 0, 0, 0],
  [67, 68, 71, 74],
  [77, 79, 81, 84],
  [79, 75, 72, 0],
];
const pitchName = (midi: number) =>
  `${["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"][midi % 12]}${Math.floor(midi / 12) - 1}`;
export const phrases = lead.map((row) => row.map((p) => (p ? pitchName(p) : ".")).join(" "));
export const staccato = (n: Note, i: number): Note => ({
  ...n,
  duration: i === 3 ? 0.6 : 0.3,
  velocity: 82 + i * 3,
});
const hit = (pitch: number, at: number, velocity: number, duration = 0.12) =>
  drums.push(note(pitch, at, duration, velocity));
for (let bar = 0; bar < 12; bar++) {
  const at = bar * 4,
    root = roots[bar],
    quiet = bar === 8,
    end = bar === 11;
  if (end) {
    bass.push(note(36, at, 3.6, 88));
    piano.push(...chord(voicings[bar], { at, duration: 3.5, velocity: 74, strum: 0.015 }));
    mallets.push(note(79, at, 0.55, 85), note(75, at + 0.5, 0.55, 79), note(72, at + 1, 2.3, 85));
    hit(36, at, 105);
    hit(49, at, 65, 2);
    continue;
  }
  for (const [offset, interval, duration] of [
    [0, 0, 0.38],
    [0.75, 0, 0.18],
    [1.5, 7, 0.3],
    [2, 12, 0.3],
    [2.75, 10, 0.2],
    [3.5, 7, 0.2],
  ])
    if (!quiet || offset === 0 || offset === 2)
      bass.push(note(root + interval, at + offset, duration, offset === 0 ? 97 : 80));
  for (const offset of quiet ? [0] : [0.5, 1.75, 3])
    piano.push(
      ...chord(voicings[bar], { at: at + offset, duration: 0.22, velocity: bar < 2 ? 53 : 66, strum: 0.008 }),
    );
  if (bar === 0 || bar === 4) mallets.push(...motif.map((n) => ({ ...n, at: n.at + at })));
  else
    mallets.push(
      ...phrase(phrases[bar], { duration: 0.5 })
        .map(staccato)
        .map((n) => ({ ...n, at: n.at + at + (bar % 2 ? 0.25 : 0) })),
    );
  if ([2, 5, 6, 9, 10].includes(bar))
    brass.push(note(voicings[bar][2], at + 2.5, 0.22, 70), note(voicings[bar][3], at + 3.25, 0.32, 80));
  if (!quiet) {
    for (let i = 0; i < 8; i++) hit(42, at + i * 0.5, i % 2 ? 39 : 56);
    hit(36, at, 105);
    hit(36, at + 2, 97);
    if (bar % 2) hit(36, at + 2.75, 75);
    hit(38, at + 1, 87);
    hit(38, at + 3, 96);
    if ([3, 7, 9].includes(bar)) {
      hit(38, at + 3.5, 55);
      hit(47, at + 3.75, 71);
    }
  } else {
    hit(36, at, 96);
    hit(42, at + 3, 35);
    hit(42, at + 3.5, 55);
  }
}
export const score = defineScore({
  title: "Little code. Big personality.",
  tempo: 120,
  meter: [4, 4],
  length: 48,
  tail: 1,
  seed: 43,
  markers: [
    { name: "clap", at: 0 },
    { name: "write the move", at: 8 },
    { name: "compose the groove", at: 20 },
    { name: "scrub", at: 32 },
    { name: "crew", at: 40 },
    { name: "button", at: 44 },
  ],
  tracks: [
    {
      id: "marimba",
      instrument: "marimba",
      clips: [{ notes: mallets }],
      gain: 0.78,
      pan: -0.16,
      reverb: 0.17,
      humanize: { timing: 0.004, velocity: 2 },
    },
    {
      id: "piano",
      instrument: "upright-piano",
      clips: [{ notes: piano }],
      gain: 0.48,
      pan: 0.2,
      reverb: 0.17,
      humanize: { timing: 0.003, velocity: 2 },
    },
    { id: "bass", instrument: "little-bass", clips: [{ notes: bass }], gain: 0.8, pan: 0, reverb: 0.025 },
    {
      id: "drums",
      instrument: "club-drums",
      clips: [{ notes: drums }],
      gain: 0.63,
      drums: true,
      reverb: 0.06,
    },
    {
      id: "brass",
      instrument: "trumpet-stac",
      clips: [{ notes: brass }],
      gain: 0.24,
      pan: 0.28,
      reverb: 0.2,
    },
  ],
});
export default score;

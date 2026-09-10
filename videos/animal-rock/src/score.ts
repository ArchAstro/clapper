import { chord, defineScore, type Note, note } from "@archastro/clapper-music";

// AFTER CLOSING — an original E-minor garage-rock jam for a three-piece band.
// One guitar alternates riffing, power chords and a melodic solo: no phantom overdub.
const guitar: Note[] = [],
  bass: Note[] = [],
  drums: Note[] = [];
const hit = (pitch: number, at: number, velocity = 90) =>
  drums.push(note(pitch, at, pitch === 49 ? 1.8 : pitch === 46 ? 0.8 : 0.15, velocity));
for (let beat = 0; beat < 4; beat++) hit(42, beat, 50 + beat * 5);
guitar.push(note(52, 3.5, 0.22, 67), note(55, 3.75, 0.21, 79));

const roots = [40, 40, 45, 40, 43, 45, 40, 47, 40, 45, 43, 47, 40, 40, 45, 47, 40];
const riff = [
  [0, 0, 0.4],
  [0, 0.75, 0.18],
  [3, 1, 0.28],
  [5, 1.5, 0.38],
  [0, 2, 0.42],
  [10, 2.75, 0.2],
  [7, 3, 0.26],
  [3, 3.5, 0.23],
];
const solos = [
  [
    [64, 0, 0.7],
    [67, 0.75, 0.2],
    [69, 1, 0.45],
    [71, 1.5, 0.75],
    [69, 2.5, 0.3],
    [67, 3, 0.3],
    [64, 3.5, 0.4],
  ],
  [
    [69, 0, 0.45],
    [72, 0.5, 0.22],
    [74, 0.75, 0.45],
    [72, 1.5, 0.25],
    [69, 2, 0.7],
    [67, 3, 0.35],
    [64, 3.5, 0.35],
  ],
  [
    [67, 0, 0.3],
    [69, 0.5, 0.3],
    [70, 1, 0.2],
    [71, 1.25, 0.55],
    [74, 2, 0.35],
    [71, 2.5, 0.35],
    [69, 3, 0.25],
    [67, 3.5, 0.25],
  ],
  [
    [66, 0, 0.3],
    [67, 0.5, 0.3],
    [69, 1, 0.3],
    [71, 1.5, 0.6],
    [69, 2.5, 0.3],
    [67, 3, 0.2],
    [64, 3.5, 0.35],
  ],
];
for (let b = 0; b < 17; b++) {
  const at = 4 + b * 4,
    root = roots[b],
    solo = b >= 8 && b < 12,
    breakdown = b === 12,
    build = b === 13;
  if (solo) for (const [p, t, d] of solos[b - 8]) guitar.push(note(p, at + t, d, 83 + Math.round(t * 2)));
  else if (breakdown) guitar.push(...chord([52, 59], { at, duration: 0.35, velocity: 80 }));
  else
    for (const [interval, t, d] of riff) {
      const p = root + 12 + interval;
      guitar.push(note(p, at + t, d, build ? 70 : 88 + (t % 1 === 0 ? 8 : -8)));
      if (t === 0 || t === 2) guitar.push(note(p + 7, at + t + 0.012, d * 0.96, build ? 58 : 73));
    }
  const bassLine = breakdown
    ? [
        [0, 0, 0.5],
        [7, 2, 0.45],
      ]
    : [
        [0, 0, 0.4],
        [0, 0.5, 0.32],
        [7, 1, 0.34],
        [0, 1.75, 0.2],
        [0, 2, 0.4],
        [10, 2.5, 0.25],
        [7, 3, 0.3],
        [3, 3.5, 0.25],
      ];
  for (const [i, t, d] of bassLine) bass.push(note(root + i, at + t, d, 84 + (t % 1 === 0 ? 7 : -4)));
  if (!breakdown) {
    for (let i = 0; i < 8; i++) hit(i === 7 && b % 4 === 3 ? 46 : 42, at + i * 0.5, i % 2 === 0 ? 68 : 48);
    for (const t of [0, 1.75, 2, 3.5]) hit(36, at + t, t === 0 ? 113 : 98);
    for (const t of [1, 3]) hit(38, at + t, build ? 96 : 112);
    if (b % 4 === 3) {
      hit(38, at + 3.25, 72);
      hit(47, at + 3.5, 96);
      hit(45, at + 3.75, 108);
    }
    if ([0, 4, 8, 14, 16].includes(b)) hit(49, at, 100);
  } else {
    hit(36, at, 112);
    hit(38, at + 2, 95);
    hit(42, at + 3, 45);
    hit(42, at + 3.5, 63);
  }
}
guitar.push(...chord([40, 47, 52, 59, 64], { at: 72, duration: 2.8, velocity: 91, strum: 0.018 }));
bass.push(note(40, 72, 2.9, 94));
hit(36, 72, 117);
hit(38, 72, 110);
hit(49, 72, 113);

export const score = defineScore({
  title: "After Closing — The Wild Hours",
  tempo: 112,
  meter: [4, 4],
  seed: 808,
  length: 76,
  tail: 2.5,
  markers: [
    { name: "count-in", at: 0 },
    { name: "the riff", at: 4 },
    { name: "open it up", at: 20 },
    { name: "fox solo", at: 36 },
    { name: "lights down", at: 52 },
    { name: "last call", at: 60 },
    { name: "the hit", at: 72 },
  ],
  tracks: [
    {
      id: "guitar",
      instrument: "green-guitar",
      clips: [{ notes: guitar }],
      gain: 0.23,
      drive: 5.5,
      preampDb: 24,
      pan: -0.22,
      reverb: 0.18,
      humanize: { timing: 0.003, velocity: 2 },
      program: 29,
      bends: [
        { at: 38, value: 0.4 },
        { at: 38.45, value: 0 },
        { at: 46, value: 0.35 },
        { at: 46.4, value: 0 },
      ],
    },
    {
      id: "bass",
      instrument: "little-bass",
      clips: [{ notes: bass }],
      gain: 0.85,
      drive: 1.8,
      pan: 0.12,
      reverb: 0.04,
      humanize: { timing: 0.002, velocity: 2 },
      program: 33,
    },
    {
      id: "drums",
      instrument: "club-drums",
      clips: [{ notes: drums }],
      gain: 0.9,
      pan: 0,
      reverb: 0.12,
      drums: true,
    },
  ],
});
export default score;

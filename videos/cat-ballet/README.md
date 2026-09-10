# Pas de Chat

A 43-second miniature ballet: a cream cat, rose tutu, plum curtains and a warm chamber waltz in D major. The original score has 24 bars in 3/4, a B-minor middle passage, a brighter reprise and a final ritardando. Piano, pizzicato violin/cello, flute and glockenspiel use CC0 VSCO 2 CE samples.

```fish
pnpm install
node scripts/build-sfizz.mjs
pnpm --dir videos/cat-ballet preview
pnpm --dir videos/cat-ballet score
pnpm --dir videos/cat-ballet exec clapper render --loudnorm off --crf 18 -o out/pas-de-chat.mp4
pnpm --dir videos/cat-ballet review
```

`src/score.ts` is the complete original composition. `src/cat.tsx` is the feline ballet rig; `src/index.tsx` stages it and maps musical time to choreography. Instruments download on first use; no sample recordings are committed here. Full pipeline documentation: [docs/music.md](../../docs/music.md).

Final outputs: `out/pas-de-chat.mp4`, `out/score-final/master.wav`, `out/score-final/score.mid`, instrument stems and `out/review/final/`.

Review corrections: raised pizzicato out of unmapped F#3; resolved bell suspensions; shaped flute breathing/dynamics; reused Schroeder stereo reverb; added held arabesques; smoothed the fifth-position transitions; removed the recentering snap; made the final bow forward and stable. Review passed for sampled-frame visuals and score/measurement-based audio, with no claim of listening audition.

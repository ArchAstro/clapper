# After Closing — The Wild Hours

An original 43-second E-minor garage-rock jam at 112 BPM. Fox plays guitar, raccoon plays bass, and bear plays drums in a miniature after-hours club. The score moves through a count-in, riff, open section, guitar solo, breakdown, return and a final unified hit. There is no backing recording or invisible guitar overdub.

```fish
pnpm --dir videos/animal-rock score
pnpm --dir videos/animal-rock preview
pnpm --dir videos/animal-rock render
pnpm --dir videos/animal-rock review
```

`src/score.ts` contains the full original jam; `src/band.tsx` contains the three animal rigs; `src/index.tsx` stages the band and drives picking, fretting and drum gestures from actual note onsets. The studio Music tab exposes the score and source code.

Final outputs: `out/after-closing.mp4`, `out/score/master.wav`, `out/score/score.mid`, and individual stems/MIDI parts. Output media and downloaded samples are ignored by Git and reproduced by the commands above.

## Instruments and provenance

All samples are CC0. The curated patches keep original sample files and recorded upstream Git hashes, with small generated SFZ adaptations:

1. **Green guitar:** Karoryfer Black and Green Guitars, revision `b3b3249d37dc977a1a297bd2dc053e6d9b6b805c`; medium layer, two round robins, keys 40–76. Nearest-sample zones close the original C4 hole while preserving the written pitch.
2. **Little bass:** Karoryfer Big Little Bass, revision `4e92bdf54dcd2d6cfad968cc90542d5461c9b9fc`; plucked two-round-robin adaptation, keys 35–60.
3. **Club drums:** Virtuosity Drums, revision `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc`; overhead mic, original velocity/round-robin maps, GM keys 36/38/42/46/45/47/49, hat choking and one-shot decays.

Regenerate catalog definitions with `node scripts/build-rock-catalog.mjs`. Original mapping files and license files download alongside the samples. These adaptations do not claim to implement the upstream Sforzando GUI, feedback controls or every articulation.

## Review fixes

The first review found seven silent C4 guitar notes; the patch now maps every advertised melodic key, with a regression test. Amp input/output calibration brought the solo from roughly 11dB below the bass to roughly 3dB above it in stem RMS. The bear now targets toms and crash explicitly, shares a simultaneous crash/snare across both hands, and lowers the sticks after the final hit. The fox's microphone was moved off the eye line.

Review is sampled-frame, score and signal based; the agent environment cannot listen to playback.

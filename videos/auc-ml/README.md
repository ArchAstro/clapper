# AUC in machine learning

An intuition-first narrated explanation, 12:23.5 at 1920×1080 / 30 fps. One synthetic
six-payment example connects thresholds, ROC geometry, pairwise ranking and average
precision, then returns for the closing comparison (7/9 vs 29/36). A short survey covers
partial and multiclass AUC and other curves that share the letters.

- Composition: `auc-ml`; entry: `src/index.tsx`. Title card after the cold-open hook; end card closes.
- Narration: Kokoro `af_heart`, speed 1, locked in `clapper-voices.lock.json`. One cue **per sentence**,
  placed from measured takes, so each diagram step lands on the sentence that explains it
  (`lineStarts()` in `src/plan.ts`).
- Score: `src/score.ts`, a quiet 60 BPM piano/viola/cello bed with harp glints at part changes.
  It dips under speech by automation derived from the same timing.
- Type: Schibsted Grotesk / Fragment Mono / Instrument Serif (`src/fonts`, full Latin coverage).
- [Research and conventions](SOURCES.md) · [full transcript](transcript.md).
- `python3 videos/auc-ml/verify_math.py` checks every on-screen number with exact fractions.

## Retiming after a script edit

```fish
node prepare-timing.mjs probe                      # src/probe.json, one cue per sentence
pnpm exec clapper narration render src/probe.json -o out/probe-lines
node prepare-timing.mjs                            # src/timing.json, chapters, transcript
```

Unchanged sentences reuse cached takes. Scenes, narration and score all read `src/timing.json`.

- Preview: `pnpm --dir videos/auc-ml preview`.
- Render: `pnpm --dir videos/auc-ml render` (adds native MP4 chapter metadata → `out/auc-ml.mp4`).

## Chapters

| Start | Chapter |
| --- | --- |
| 00:00 | Who should be reviewed first? |
| 00:34 | Scores → thresholds → curve → area |
| 01:05 | A score gives an ordering |
| 01:36 | One threshold gives one decision |
| 02:06 | Two rates, two different denominators |
| 02:38 | Lower the threshold. Trace the tradeoff. |
| 03:05 | Width × height, added across the curve |
| 03:37 | Area is also a ranking game |
| 04:06 | Each strip is one column of comparisons |
| 04:36 | The probability behind ROC-AUC |
| 05:08 | Equal scores mean no ranking preference |
| 05:40 | 1 is perfect. 0.5 is the chance reference. |
| 06:10 | Same ordering. Same AUC. Different numbers. |
| 06:40 | A small false-positive rate can mean many alarms |
| 07:21 | Precision asks about the flagged pile |
| 07:58 | Reward precision when a new positive is found |
| 08:30 | PR-AUC and AP are not interchangeable labels |
| 09:09 | Partial AUC: only the region you operate in |
| 09:40 | Multiclass AUC needs a decomposition and an average |
| 10:26 | Same letters, different curves |
| 11:14 | Keep the curve, the data, and the decision separate |
| 11:43 | Ask five questions when someone says “AUC” |

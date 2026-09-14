# Universal Transformers — intuition first

Confirmed primary source: **Universal Transformers**, Dehghani et al. (2018 / ICLR2019).
https://arxiv.org/abs/1807.03819

This replaces the rejected programmable-computer film. Its source/artifact is archived
under `.clapper/rejected-computer-film`; it is not the subject of this explainer.

## Teaching order

1. Dedicated intro: Lea gives Omar a key; Omar puts it in a drawer.
2. Intuition: the full read → refine → answer journey, then a conceptual refinement example.
3. Architecture: complete UT encoder–decoder, depth vs token positions, one whole recurrent step.
4. Pieces: attention and transition, then the complete model again; optional per-position halting.
5. Learning: full predict → compare probabilities → backpropagate → update cycle.
6. Local math: scalar connection → matrix projection → gradients → differentials → recurrent accumulation.
7. Return to the same high-level input-to-answer journey.

## Run

```fish
pnpm --dir videos/looped-transformers preview
pnpm --dir videos/looped-transformers render
```

Target: `out/universal-transformers.mp4`, 1920×1080, 30 fps, 7:23.
Composition ID remains `looped-transformers`. Local Kokoro narration uses one locked
voice; the model/runtime remain optional downloads via `clapper voices install`.

## Evidence

- [Primary-source notes](research/sources.md)
- [Narration transcript](research/transcript.md)
- [Top-down storyboard](research/revision-storyboard.md)
- [Pre-render adversary](research/revision-script-review.md)
- [Math checks](research/math-verification.txt)
- Current export review and source fingerprint: `out/review-universal/`.

The numerical states and story stages are explicitly teaching illustrations, not
measured activations from a trained UT. Math uses a fixed-depth block; optional ACT
is identified separately. Listening coverage is reported separately from measurements.

Latest review: source fit, teaching order, content/math and visual checks **pass**.
See `out/review-universal/issue-ledger.md` for exact artifact hash and role reports.
Audio is measured; listening remains unverified.

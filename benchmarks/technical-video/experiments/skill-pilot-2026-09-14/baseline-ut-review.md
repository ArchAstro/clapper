# Universal Transformers — independent diagnostic review

Diagnostic only; not final approval.

## Artifact and coverage

- Reviewed export: `/private/tmp/clapper-skill-optimization/baseline-v1/runs/D01-0/work/out/complete-film.mp4`.
- SHA-256: `f74e94fbf328600a24ad6388c0af1ccf0dc207fc2189425fbc8b6b2029dcc016`.
- Actual-file FFmpeg inspection: 296.000 seconds, 1280 × 720, 30 fps, H.264 video and stereo 48 kHz AAC audio. This matches the dimensions/duration in `out/media-metadata.json`; that JSON does not identify its target filename. No README or final-export manifest was present in the enumerated output files. Selection of `complete-film.mp4` follows the supplied latest-complete-copy instruction, independently checked against its container.
- Read only supplied brief, curator source notes, transcript, and allowed output artifacts. Did not read authored source, author logs, prior review text, skills, or other runs; did not execute authored source.
- Read complete transcript and scene/narration timing metadata. Visually inspected the exported contact sheet and five full-resolution final PNGs (frames 1439, 2790, 4570, 6360, 8879). Inspected eight preliminary MP4-derived samples plus ten exact MP4 frames at 00:07, 00:40, 01:35, 02:05, 02:30, 03:05, 03:25, 03:55, 04:20, and 04:50. Together these cover every scene. This is sampled visual coverage, not continuous playback or frame-complete validation.
- Exact extracted evidence: `/private/tmp/clapper-skill-optimization/ut-review-scratch/exact-01.png` through `exact-10.png`, in the timestamp order above. Extraction used the requested installed FFmpeg and source-frame selection, with `showinfo` confirming timestamps.
- **No audio was listened to.** Audio-stream presence and narration text were checked; voice intelligibility, pronunciation, mix, and audiovisual synchronization receive no verdict.

## Consequential defects

1. **02:05 — the “one complete revision” view names residual additions without showing their operands or paths.** `exact-04.png` shows only States H → + signals → Attention → Transition → Next H, with two floating “residual addition + normalization” labels. The sole return arrow is explicitly the next-depth loop. A novice cannot trace which earlier state is added around each sublayer, or distinguish these within-revision skip connections from the large recurrence arrow. The source notes require residual connections and normalization for attention and transition; the transcript says earlier states are added back, but the diagram never makes that operation inspectable. Draw the two local bypasses and explicit add/normalization junctions. This is incomplete mechanism teaching, not evidence that the narration claims an architecture without residuals.

2. **02:30 — the causal-mask example has three positions while its displayed prefix has two.** `exact-05.png` displays prefix states “〈start〉 Le” alongside an unlabeled 3 × 3 lower-triangular mask under “WHO CAN EACH POSITION READ?”. The same mismatch is visible in exported frame 4570 (02:32.333). It makes the running example hard to reconcile: the viewer cannot identify the third query/key position, and neither mask axis is labeled. Use a 2 × 2 mask with start/Le on both axes, or explicitly introduce a three-position prefix and label its rows and columns. The masking rule itself is correctly stated; the defect is the state-to-diagram mapping.

## What the evidence supports

The film fits the supplied original-UT notes: separate encoder and decoder parameter sets; shared refinement across depth; parallel position updates; projection/softmax and outer appending; decoder cross-attention; fixed-depth shared-gradient accumulation; and ACT explicitly marked optional without claiming its gradients are derived. It consistently marks example states as illustrations. No substitution of a later looped model was observed.

Top-down order is successful in the inspected evidence: intuition, a completed translation (exported frame 1439), whole encoder–decoder architecture, refinement details, complete training loop, attention detail, gradients, optional ACT, recap. Training precedes its gradient detail. Three depth revisions retain three source positions, training prefix/target shifts align, attention weights sum to one, and halted rows remain halted in the inspected ACT states.

Main text and diagrams are readable at native 1280 × 720 in inspected frames, without observed clipping or overlaps. Small ancillary metadata is less prominent, but no consequential legibility defect was established. I found two defensible defects and have not filled the five-item limit with stylistic preferences or unverified audio claims.

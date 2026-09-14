# Verification — 2026-09-14

Both examples were rendered through their native CLIs and played in their native
studios using an isolated browser. The studios were then opened in the main Chrome
profile for handoff.

| Check | Rendiv | HyperFrames |
| --- | --- | --- |
| Native render | Pass | Pass |
| Encoded dimensions | 1920 × 1080 | 1920 × 1080 |
| Frame count / rate | 732 / 30 fps | 732 / 30 fps |
| Duration | 24.4 s | 24.4 s |
| Audio correlation to reference, mono 12 kHz | 0.999693 | 0.999528 |
| Audio gain difference | −0.030 dB | −0.041 dB |
| Native studio loads and plays | Pass | Pass |
| TypeScript | Pass | JavaScript modules |
| HyperFrames composition lint | — | 0 errors, 0 warnings |
| Repository Biome checks | Pass | Pass |

`verify.mjs` also generated 28 aligned comparison frames covering all scenes and
all four cuts. Independent visual review additionally inspected consecutive
30 fps frame sequences. The alert-exit easing mismatch found in that pass was
corrected to match the reference's 15-frame ease-in exit.

The shared WAV is the reference's decoded PCM, not a newly composed score.
Independent stereo measurements confirmed zero detected audio offset and complete
24.4-second audio streams. **Audio was measured, not auditioned.** These checks
establish soundtrack portability; they are not a fresh creative music/mix approval.

Native font localization and spring/easing differences are described in the
[comparison README](README.md). The source count after the repository's formatter:
Rendiv **830 lines across 9 visual files**, HyperFrames **857 lines across 8**.
Shared assets, setup, and verification are excluded; this is not a ranking.

## Original reviewed artifacts

- Clapper: `d72dfa7c810bca55ce0a6c0b5b1fab4c0e059671c3556cfb36998c12f60ecae7`
- Rendiv: `2b14d0bb4bb65cedcfccee185665abcee7f78e4a8aa253a4ce58e49629e96900`
- HyperFrames: `a1782d5dd62accac0b6193839889805c85a3a4b7ea39283a08a60a59b5d2b926`

Generated MP4s and detailed review artifacts live in ignored `out/` directories:
[measurements](out/verification/report.json),
[visual report](out/verification/visual-review.md),
[audio report](out/verification/audio-review.md), and
[source hashes](out/verification/source-manifest.json).
Rerun the documented commands to regenerate them; this note records the verified
local run rather than promising future dependency or platform behavior.

## Benchmark-directory verification

After relocation to `benchmarks/nimbus/`, asset preparation, Rendiv typechecking,
HyperFrames lint, and both native renders passed. `verify.mjs` checked all three
exports: 1920×1080, 732 frames at30fps, 24.4 seconds, and aligned audio.
The graph comparison frame was inspected after regeneration. This is a relocation
regression check; the independent creative/studio reviews above describe the
original run.

Latest rendered artifacts:

- clapper: `d72dfa7c810bca55ce0a6c0b5b1fab4c0e059671c3556cfb36998c12f60ecae7`
- rendiv: `f70a602b592c8fc9cf9ba8cb70309031a0c0e0577db47f26fde98aa83a682de4`
- hyperframes: `ce3c6d1bcb46dff45955c2119f0253c33bd8a601e36dce13d89fe6a62a6dd571`

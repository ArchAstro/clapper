# Nimbus cross-framework benchmark

The same five-scene Nimbus demo implemented in Clapper, Rendiv, and HyperFrames.
These examples are for **comparing readable source code and authoring models**.
They are not a renderer speed benchmark or a claim of pixel-identical output.
See [the recorded verification results](VALIDATION.md).

## Start with the graph scene

| Version                          | Graph implementation                                                                             | Whole-film entry                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Clapper reference                | [`Graph()` in nimbus.tsx](../../videos/showcase/src/nimbus/nimbus.tsx)                           | [showcase registration](../../videos/showcase/src/index.tsx) |
| Rendiv 0.2.6                     | [`rendiv/src/graph.tsx`](rendiv/src/graph.tsx)                                                   | [`rendiv/src/index.tsx`](rendiv/src/index.tsx)               |
| HyperFrames 0.8.40 + GSAP 3.15.0 | [`hyperframes/scenes/graph.js`](hyperframes/scenes/graph.js) plus [HTML](hyperframes/index.html) | [`hyperframes/timeline.js`](hyperframes/timeline.js)         |

The Rendiv example uses `useFrame`, `interpolate`, `spring`, `Audio`, and a custom
`TransitionSeries` presentation. The HyperFrames example uses ordinary HTML/CSS,
GSAP child timelines, SVG elements, and a registered `window.__timelines.nimbus`.
Procedural packets and chart values derive from GSAP's seekable clock.
Neither port imports Clapper's renderer, animation components, or scene runtime.

## Other scenes

| Scene                         | Rendiv                                                                         | HyperFrames                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Title and end card            | [titles.tsx](rendiv/src/titles.tsx)                                            | [titles.js](hyperframes/scenes/titles.js) + [HTML](hyperframes/index.html)   |
| Latency spike and recovery    | [latency.tsx](rendiv/src/latency.tsx)                                          | [latency.js](hyperframes/scenes/latency.js) + [HTML](hyperframes/index.html) |
| Request stream and root cause | [trace.tsx](rendiv/src/trace.tsx), [typewriter.tsx](rendiv/src/typewriter.tsx) | [trace.js](hyperframes/scenes/trace.js) + [HTML](hyperframes/index.html)     |
| Grid, grain, vignette         | [atmosphere.tsx](rendiv/src/atmosphere.tsx)                                    | [timeline.js](hyperframes/timeline.js), [CSS](hyperframes/style.css)         |
| Motion helpers                | [motion.ts](rendiv/src/motion.ts)                                              | [motion.js](hyperframes/motion.js)                                           |
| Layout                        | [style.css](rendiv/src/style.css)                                              | [style.css](hyperframes/style.css)                                           |

## Run

Run these commands from the **repository root**. The example packages have their
own npm lockfiles and are intentionally outside the pnpm workspace, so installing
another renderer does not change Clapper's dependency graph.

```fish
# Rendiv: install its packages and matching browser, then open the studio.
npm ci --prefix benchmarks/nimbus/rendiv
npm exec --prefix benchmarks/nimbus/rendiv -- playwright install chromium
npm run preview --prefix benchmarks/nimbus/rendiv -- --port 4331

# HyperFrames: install, then open its studio in another terminal.
npm ci --prefix benchmarks/nimbus/hyperframes
npm run preview --prefix benchmarks/nimbus/hyperframes -- --port 4332
```

Node 24+ matches this repo's development environment. Each preview/render command
runs `prepare.mjs` to copy the shared content and existing showcase font files into
that framework's normal static asset directory. HyperFrames also receives local,
pinned GSAP scripts; no CDN script is needed.

Render either example through its own CLI:

```fish
npm run render --prefix benchmarks/nimbus/rendiv
npm run render --prefix benchmarks/nimbus/hyperframes
```

Outputs are `rendiv/out/nimbus.mp4` and `hyperframes/out/nimbus.mp4` under this directory.
Both are 1920×1080, 30 fps, 732 frames / 24.4 seconds. Rendiv's audio explicitly
sets `endAt={TOTAL}`; without an end, this version can pass `Infinity` to FFmpeg.
The player is an explicit dependency because Rendiv Studio imports it.

If your npm configuration blocks dependency install scripts, Rendiv's `ffmpeg-static`
package may need its normal installer run once:

```fish
cd benchmarks/nimbus/rendiv
node node_modules/ffmpeg-static/install.js
```

## What is held constant

1. **Content:** all five scenes, copy, region positions, 11 edges with two packets
   each, 28 histogram bars, eight log rows, and the closing cloud mark.
2. **Timeline:** scene starts at frames **0, 93, 276, 414, 552**; durations
   **105, 195, 150, 150, 180** with four 12-frame blur overlaps.
3. **Design:** the existing Nimbus tokens and font declarations; the same grid,
   grain seeds, glow colors, camera targets, alert/recovery timing, and typing jitter.
4. **Audio:** one shared WAV decoded from the current Clapper reference render.
   The reference generates its 212 cues in code; the ports play the resulting asset.
   **This compares visual authoring, not equivalent sound-synthesis implementations.**
   WAV avoids the codec-priming offset observed when HyperFrames re-encoded the AAC source.

## Differences to account for

- Rendiv's spring solver and GSAP's back/power easing produce slightly different
  badge/cloud entrances. The narrative beats and durations stay the same.
- GSAP's sampled custom easing can give slightly different intermediate counter values.
- HyperFrames localizes fonts during compilation. The reference's font declarations
  contain restricted Unicode ranges, so fallback typography can differ between
  the native engines, browsers, and operating systems.
- Chrome versions, GPU modes, image capture, and encoding defaults differ. Wall-clock
  observations from these development runs are not controlled performance results.
- Helpers and CSS count as source. Run `node benchmarks/nimbus/count-source.mjs` to
  count all authored visual files in each port. Do not compare only their entry files
  or equate shorter source with better maintainability.

## Verify and regenerate the reference

With Clapper's workspace dependencies installed, plus `ffmpeg` and `ffprobe` on PATH:

```fish
pnpm --dir videos/showcase exec clapper render src/index.tsx -c nimbus --out ../../benchmarks/nimbus/out/clapper.mp4 --crf 21
npm run typecheck --prefix benchmarks/nimbus/rendiv
npm run lint --prefix benchmarks/nimbus/hyperframes
node benchmarks/nimbus/verify.mjs
```

`verify.mjs` requires both example installs and all three MP4s. It checks dimensions,
frame count, frame rate, duration, and audio signal alignment; writes hashes and
measurements to `out/verification/report.json`; and extracts matching comparison
frames across scenes and every transition. Signal analysis is not an audio audition.

To intentionally refresh the shared soundtrack after changing the reference:

```fish
ffmpeg -y -i benchmarks/nimbus/out/clapper.mp4 -vn -c:a pcm_s16le benchmarks/nimbus/shared/soundtrack.wav
```

Rerender both ports afterward. Keep audio generation separate when comparing native
rendering times.

## Licenses

The example source is covered by this repository's [MIT license](../../LICENSE).
Rendiv and HyperFrames are Apache-2.0; GSAP retains its own license. Existing fonts
retain their SIL OFL notices in [third-party/fonts](../../third-party/fonts).
The soundtrack comes from Clapper's original code-generated Nimbus example.
See the repository [NOTICE](../../NOTICE.md) for other dependency and trademark notices.

# agenticvids

Write videos in React. Render them to MP4.

Every frame is a pure function of `frame`. You compose scenes with ordinary React
(hooks, context, CSS, SVG, third-party libraries, KaTeX…), a timeline of
`<Sequence>`s positions them in time, and a headless-Chromium harness renders
each frame deterministically and pipes it into ffmpeg. Sounds are React
elements too: they register cues that get mixed into the final file.

```
videos/intern-promo/src/index.tsx     packages/cli (Node)                    output
┌──────────────────────────┐   ┌───────────────────────────────────────┐   ┌──────────┐
│ registerRoot(Root)       │   │ vite build ─► serve ─► Playwright     │   │  .mp4    │
│  <Composition id=… />    │──►│  per frame: setFrame(n) → screenshot  │──►│  h264 +  │
│   <Sequence>/<Camera>/…  │   │  PNG stream ─► ffmpeg (libx264)       │   │  aac     │
│   <Tone>/<Audio> cues    │   │  cues ─► offline synth + amix ─► mux  │   │          │
└──────────────────────────┘   └───────────────────────────────────────┘   └──────────┘
          ▲
   `agenticvids preview` mounts the same entry in the studio: scrub, play, tracks, live audio
```

## Layout

| Path | What |
| --- | --- |
| `packages/core` | `@agenticvids/core` — the React runtime (timeline, sequences, tweens, springs, camera, audio, text effects, transitions, LaTeX, media). Browser code only. |
| `packages/cli` | `@agenticvids/cli` — `agenticvids render / still / preview / compositions`. Vite bundling, Playwright frame capture, ffmpeg encoding, audio synthesis and mixing. |
| `videos/intern-promo` | The tryintern.dev promo built with it (`pnpm render`, `pnpm preview`). |
| `videos/showcase` | Three agency-style spots for made-up SaaS products (Ledger, Orbit, Nimbus) with synthesized sound, each iterated against a creative-director review loop. `src/kit.tsx` is the reusable motion vocabulary. |

## Quick start

```bash
pnpm install                       # allowBuilds in pnpm-workspace.yaml lets ffmpeg-static + esbuild run their installs
cd packages/cli && pnpm exec playwright install chromium

cd videos/intern-promo
pnpm preview                       # studio at http://127.0.0.1:4321 — space play, ←/→ frame, shift ×10, l loop, m mute
pnpm render                        # → out/intern-promo.mp4 (~57s, 1080p30, AAC)
pnpm exec agenticvids still src/index.tsx -c intern-promo --frame 100,226,392 --out out/stills
pnpm exec agenticvids compositions src/index.tsx
```

A video project is any folder with a `package.json`, a `public/` for assets
(`staticFile("x.png")`) and an entry that calls `registerRoot`:

```tsx
import { Composition, registerRoot } from "@agenticvids/core";
import { Promo } from "./promo";

function Root() {
  return <Composition id="promo" component={Promo} width={1920} height={1080} fps={30} durationInSeconds={57} />;
}
registerRoot(Root);
```

## The model

1. **Frame clock.** `useFrame()` is the local frame, `useTime()` seconds, `useVideoConfig()` `{width,height,fps,durationInFrames}`.
   Never read wall-clock time. The render harness also virtualises `performance.now`, `Date.now` and
   `requestAnimationFrame`, and pauses+seeks every CSS/Web animation to the frame, so most rAF-driven
   libraries step exactly once per frame.
   **Time is frames, written either way.** Every `at`, `from`, `duration`, keyframe `frame` and audio start takes a frame
   count or a string: `at="1.2s"`, `duration="300ms"`. One `resolveFrames(value, fps)` does the conversion; `useFrames()`
   gives you the resolver inside a component.
2. **Scenes own the arithmetic.** `defineScenes({ open: { seconds: 3.3 }, plan: { frames: 220, transition: { type: "fade", duration: "0.5s" } } }, { fps: 30 })`
   returns a plan with `total`, `start(name)`, `end`, `duration`, `local(name, absFrame)`, `at(absFrame)`, `cuts()`. Pass it
   to `<Composition scenes={plan}>` (length comes from it, and the scene map reaches the CLI, studio and review kit) and
   render with `<Scenes plan={plan}><Scenes.Scene name="open">…</Scenes.Scene></Scenes>`. A root-level score, copy timings
   and the reviewer's brief all read the same starts, so a scene can change length without hunting for numbers.
   Underneath: `<Sequence from={30} durationInFrames={90} name="intro">` makes `useFrame()` return 0 at absolute frame 30
   and unmounts children outside its range (`keepMounted` to keep them). `<Series>`, `<Loop>`, `<Freeze>` and
   `<TransitionSeries transition={{type:"fade"|"slide"|"wipe"|"zoom"|"blur"|"none", duration}}>` build on it. Named
   sequences show up as tracks in the studio. On a hard cut, make sure the incoming scene has something on screen at its
   local frame 0 (a rule, an eyebrow, a static frame); masked reveals that start at 0 leave the first 4–8 frames empty
   (`agenticvids review` flags near-black frames after a cut).
3. **Everything is a tween of the frame.**
   - `interpolate(frame, [0,30], [0,1], { easing: Easing.outExpo })`, `progress()`, `spring({frame,fps,config})`,
     `Easing.*` (CSS-equivalent beziers + elastic/bounce/steps), `SpringPresets`.
   - `<Animate from={{opacity:0, y:24}} at={10} duration={20} spring="wobbly" exit={{opacity:0}} exitAt={80}>` —
     numeric keys `x y z scale rotate skew blur brightness …` become transforms/filters, anything else is CSS.
   - `<Animate keyframes={[{frame:0, scale:.8}, {frame:20, scale:1, easing:Easing.outBack}]}>`, `useKeyframes()`, `<Stagger each={4}>`.
4. **Camera.** `<Camera keyframes={[{frame:0, zoom:1}, {frame:40, x:600, y:300, zoom:2.5}]}>` pans/zooms/rotates over
   children laid out in composition space; zoom interpolates in log space; unspecified values inherit.
5. **Sound.** `<Audio src startFrom volume fadeIn fadeOut loop playbackRate/>` for files; `<Tone freq="C5" wave attack decay sustain release glide/>`,
   `<Chime notes/>`, `<Whoosh/>`, `<Click/>`, `<Pad notes/>`, `<Thump/>`, `<Riser/>`, `<Pop/>`, `<Arp notes step/>`, `<Alert/>` synthesized with no assets.
   Music and foley: `<Pluck>` (Karplus–Strong), `<EPiano>` (FM), `<Chord strum>`, `<Pattern steps bpm>` (step sequencer), `<Drone>`, `<RoomTone>`,
   `<Keystroke>` and `<Typing text>` (layered mechanical keys synced to a Typewriter). Every tone takes `pan`, `spread`, `reverb`, `cutoff`, `lfo`, `detune`;
   the offline mixer is stereo with a reverb bus. `automation={{ volume: [[frame, gain]…], cutoff: [[frame, hz]…] }}` automates a
   long cue across scene cuts (put beds in a root-level `<Score/>` so they never restart at a cut). `<Duck at depth attack release>` is a
   bus cue: it multiplies the whole mix (tones and files) so a quiet scene is actually quiet; several ducks multiply. `<Breath cutoff rate>`
   is a filtered-noise pad that swells like breathing (wave `"breath"`). `agenticvids cues <entry> -c <id>`
   prints the cue inventory; `agenticvids review` writes short-term loudness around every cut. A cue starts at the enclosing
   sequence's start + `at`. The studio plays cues live (Web Audio); the renderer synthesizes tones offline in Node,
   sums them into one track, and mixes file cues with ffmpeg (`adelay`/`afade`/`amix`).
6. **Text & SVG.** `<Typewriter/>` (+ `typedLength()` to sync clicks), `<SplitText by="word|char|line"/>`, `<Counter/>`,
   `<Draw>` (stroke-dashoffset reveal of every shape inside), `useBlink()`. `<Latex>` from `@agenticvids/core/latex` (KaTeX).
   Display-copy primitives: `<Reveal at from skew exitAt>` (masked line reveal), `<Copy x y align size plate>` (positioned
   line with an optional backing plate), `<Eyebrow>`, `<Rule>`. They tag the DOM with `data-copy`, which is what the review
   lint measures for safe-area and overlap.
6b. **Characters.** `definePoses({ typing: {...}, lookUp: {...} })` for typed named poses; `usePose(POSES, [{ at: 0, pose: "typing" },
   { at: "0.8s", pose: "lookUp", ease: "outBack", arc: 24 }], { arcChannels: [["lhx","lhy"],["rhx","rhy"]] })` blends channels
   per frame and, when a key sets `arc`, lifts the hand targets through a midpoint so travel curves instead of sliding.
   `ik2()` is two-bone inverse kinematics with an outward elbow; `useEyeBlink()` / `useBreath()` are deterministic idle motion.
   `<Bubble x y kind="speech"|"thought" tail at exitAt>` pops a bubble from its tail tip. `evalPose()` is the pure blend behind `usePose()`.
   Two characters ship in `@agenticvids/core/rigs`: `<Person pose>` (the monoline developer, with `PERSON_POSES`, `usePersonPose`,
   `<Archie>` and `<Desk>`) and `<Scribble pose typing fury>` (the rage-comic developer, `SCRIBBLE_POSES`, `useScribblePose`).
   Both are pure functions of a pose record, the frame and, for Scribble, the boil seed; ArchDev v1–v3 use them as-is.
7. **Media & readiness.** `<Img/>`, `<Video/>` (currentTime driven by the frame; its soundtrack is mixed into the render unless
   `audio={false}`, with `volume`/`fadeIn`/`fadeOut`), `useFont()`, and `delayRender()/continueRender()`
   for anything async: the harness waits for all handles, fonts and images before capturing a frame.
8. **Determinism helpers.** `useRandom(seed)`, `random()`, `noise1d()`.
9. **Hand-drawn.** `useBoil(4)` returns a seed that steps every 4 frames; feed it to `roughPath`, `roughRect`, `roughEllipse`,
   `scribble` (a zigzag "line of text") and `hatchLines` for pencil-animation lines that boil while motion stays at full frame rate.
   `<Rough points seed amp fill hatch>` draws one shape with an optional solid or hatched fill and a doubled marker stroke;
   `<RoughRect>`, `<RoughEllipse>`, `<RoughLine>` wrap it; `<Panel seed>` is a paper sheet with a hand-drawn comic frame.
   Comic ingredients on top: `<Caption>` (boxed caption that pencils itself in), `<SfxWord>` (onomatopoeia that pops with
   overshoot), `<SketchWindow title lines>` (a sketched window with scribbled text), `<SketchThought>`, `<PaperScroll foldAt>`
   (unrolls and folds over an edge), `<SketchStamp>` and `<PencilScratch at>` (the sound of drawing). They read `--ink`,
   `--paper`, `--red`, `--hand`, `--marker` from your theme with sensible fallbacks; the fonts themselves are yours to ship.
   `videos/showcase/src/archdev3` is the reference rage-comic film built on them.
10. **Formats.** `<Composition id="spot" formats={{ "9:16": { width: 1080, height: 1920 } }}>` also registers `spot@9:16` with the same
   component and scene map. Inside, `useFormat()` gives `{ name, width, height, aspect, portrait, square, pick({ "9:16": 48, default: 64 }) }`
   for restaging; render with `-c spot@9:16`.

## Renderer

`agenticvids render <entry> -c <id> -o out.mp4 [--scene plan] [--draft] [--concurrency 4] [--scale 2] [--range 0-90] [--codec h264|h265|vp9|prores] [--crf 17] [--image-format png|jpeg] [--mute] [--props '{"title":"x"}']`

- `--scene <name>` renders one scene of a `defineScenes` plan; `--draft` is half resolution, CRF 28, veryfast, for iteration.
- `agenticvids still <entry> -c <id> --scene review` writes the first, middle and last frame of the scene; `--frame 12,40` is
  scene-local when `--scene` is given; `--every 30` samples across the scene or `--range`.
- `agenticvids compositions <entry> [--json]` lists compositions with their scene maps.
- `agenticvids doctor [<entry|dir>]` checks Node, Chromium, ffmpeg (libx264, aac, the filters the review kit needs) and React/core resolution.
- A composition that throws names the scene and local frame: `Composition threw while rendering frame 406 in scene "review" (local frame 2)`.

- Bundles `.agenticvids/harness/` with Vite (React plugin, `public/` served, KaTeX/CSS/fonts handled), serves it, opens N
  Chromium tabs, each takes a contiguous frame chunk, calls `window.__agenticvids.setFrame(n)`, screenshots, and an ordered
  writer streams PNGs into `ffmpeg -f image2pipe … libx264 -pix_fmt yuv420p`. Audio is mixed after, then muxed (AAC).
- A composition that throws makes the render fail with the error, not produce blank frames.
- Uses system `ffmpeg` if it has libx264, otherwise the `ffmpeg-static` binary. `AGENTICVIDS_FFMPEG` overrides.
- Speed: 15–25 fps at 1080p with 4 workers on an M-series laptop. Frames are captured as JPEG q96 by default; `--image-format png` is lossless but PNG-encoding grainy frames is ~5x slower (the screenshot encode, not the page, is the bottleneck).

## Review

`agenticvids review <entry> -c <id> [--video existing.mp4] [--draft] [--no-lint] [-o dir]` renders (or takes an existing MP4) and writes
`out/review/<id>/`: `contact-sheet.png` (every Nth frame, reading order = time), `cut-NNNN.png` (9 tiles around every scene cut),
`opening-2s.png`, `spectrogram.png`, `waveform.png`, `audio-cuts.txt` (short-term RMS ±1.2 s around each cut, integrated LUFS per
scene), `scenes.json`, `lint.json` and `brief.md` (scene table + a reviewer prompt you can hand to a subagent). Scene cuts come
from the composition's `scenes` plan, or from the top-level named sequences when there is no plan.

Lint rules (exit code 1 on errors): `blank-after-cut` (near-black frame right after a cut while the scene is not), `flat-after-cut`
(only the background is on screen right after a cut: the scene has no instant anchor at local frame 0), `overlap`
(two `data-copy` ink boxes intersect), `safe-area` (copy crosses the 5 % margin), `determinism` (`Math.random`, `Date.now`,
`performance.now`, timers or rAF in the video's sources; append `// agenticvids-ok` to a line to allow it).
The DOM rules sample three frames per scene where that scene is on screen alone, measure glyph ranges of the innermost
copy elements, and only judge boxes that hold still for three frames, so entrances, exits and wipes are not "collisions".
They only see elements tagged `data-copy` (the core `Copy`, `Reveal`, `Eyebrow` and `Bubble` set it); add `data-copy=""` to your
own headline elements to opt in. The brief says so when a composition has none.

## Studio

`agenticvids preview <entry>` runs a Vite dev server with HMR. Left: compositions. Center: the composition scaled to fit.
Bottom: scrubber with second ticks and scene markers from the composition's plan (`[` / `]` jump to the previous / next scene),
sequence tracks (blue), audio cues (amber files, purple tones), play/loop/mute. URL keeps `?composition=&frame=`.
Bus ducking is applied by the offline mixer only; the studio preview plays cues at their own volume.

## Starting a video

Copy `videos/_template` to `videos/<name>`: `data.ts` for every number and string, `defineScenes()` for timing, one `<Score/>`,
a theme class with tokens, and scripts for preview / still / review / render. It registers a `9:16` format variant as an example.

## Extending

It is all React: publish a package of components/hooks that use `useFrame()`/`useTimeline()` and it works in any video.
`@agenticvids/core/latex` is the reference "extension" (kept as a subpath so KaTeX loads only when imported).
Things that need to block a frame until ready use `delayRender()`. Things that make sound register through
`getRegistry().audio` (see `audio.tsx`).

## Tests

`pnpm test` — unit tests for interpolation, springs, keyframes, camera, typewriter timing, PRNG, frames/scenes/IK, and the offline synth.
`node packages/cli/test/review-check.mjs` renders `packages/cli/test/fixtures/lint` (four planted defects) and asserts the review lint reports all of them.
`videos/intern-promo`'s `smoke` composition exercises the whole pipeline (fonts, KaTeX, SVG draw, camera, springs, audio):
`pnpm exec agenticvids render src/index.tsx -c smoke`.

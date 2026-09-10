# Clapper

Write videos in React. Render them to MP4. Review them like a studio would.

**Music as code:** [`@archastro/clapper-music`](docs/music.md) adds typed scores, tempo maps, MIDI interchange and native SFZ rendering with 75 catalogued CC0 presets. See [`videos/cat-ballet`](videos/cat-ballet/README.md) for an original chamber waltz synchronized to a cat's ballet choreography.

**Animal rock band:** [`After Closing`](videos/animal-rock/README.md) adds an original three-piece jam, note-driven performers and three curated CC0 guitar/bass/drum presets (78 presets total).

**Standalone distribution:** the native launcher now supports `clapper new`, `clapper add`, and project-local `preview`, `render`, and `review` with a managed Node/Chromium/ffmpeg runtime. See [building and testing the standalone package](docs/standalone.md). Release artifacts are built locally; creating them does not publish a release.

**npm distribution:** [the npm/npx package](docs/npm.md) uses that same launcher and runtime. `node scripts/pack-npm.mjs` creates publishable CLI, platform-launcher, music, and core tarballs; `node scripts/test-npm.mjs` verifies the actual npm installation. No npm publication is performed by these commands.

Every frame is a pure function of `useFrame()`. You compose scenes with ordinary React (hooks, context, CSS, SVG, any
library, KaTeX), a scene plan positions them in time, sounds are React elements that register cues, and a headless
Chromium harness renders each frame deterministically into ffmpeg. The same entry opens in a browser editor for scrubbing,
and one command turns a render into a critique kit a reviewer (human or agent) can judge frame by frame.

```
videos/<name>/src/index.tsx            packages/cli (Node)                        output
┌──────────────────────────┐   ┌───────────────────────────────────────────┐   ┌──────────┐
│ registerRoot(Root)       │   │ vite build ─► serve ─► Playwright         │   │  .mp4    │
│  <Composition scenes=…/> │──►│  per frame: setFrame(n) → screenshot      │──►│  h264 +  │
│   <Scenes>/<Camera>/…    │   │  JPEG stream ─► ffmpeg (libx264)          │   │  aac     │
│   <Tone>/<Pattern>/<Duck>│   │  cues ─► offline stereo synth ─► mix ─► mux│   │          │
└──────────────────────────┘   └───────────────────────────────────────────┘   └──────────┘
          ▲                                     │
   `clapper preview` = the studio               └─► `clapper review` = contact sheet, cut strips, loudness, lint, brief.md
```

## What is in the box

1. **`@archastro/clapper-core`** — the React runtime: timeline and scenes, tweens and springs, camera, text effects, transitions,
   LaTeX, media, an audio DSL synthesized offline (tones, plucks, FM piano, patterns, drones, keystrokes, ducking),
   hand-drawn "boiling ink" primitives, and two character rigs. Browser code only.
2. **`@archastro/clapper`** — `clapper render · still · preview · compositions · cues · review · doctor`. Vite bundling,
   Playwright frame capture, ffmpeg encoding, audio synthesis and mixing. Runs its TypeScript natively on Node 24+.
3. **The studio** — a browser editor: live thumbnails, viewport overlays, an NLE timeline with lanes per audio kind,
   an inspector with cue preview, and a scratch panel that compiles TSX in the browser.
4. **The review loop** — `clapper review` writes the kit and a brief with a reviewer prompt; the lint catches blank or flat
   frames after cuts, copy collisions, copy outside the safe area, and non-determinism in sources.
5. **Reference projects** — `videos/showcase` (six agency-style spots incl. the ArchDev character films), `videos/intern-promo`,
   `videos/archdev-site` (product pages), and `videos/_template` to start from.

## Install

For a published release, use the [npm/standalone installation guide](docs/npm.md). Until release assets and packages are published, build from source:

```sh
git clone https://github.com/ArchAstro/clapper.git
cd clapper
pnpm install --frozen-lockfile                 # Node 24+, pnpm 11.7.0
pnpm --dir packages/cli exec playwright install chromium
node scripts/build-ffmpeg.mjs                  # or use system FFmpeg with libx264
pnpm --dir videos/_template exec clapper doctor src/index.tsx
pnpm check && pnpm typecheck && pnpm test
```

The source tree is a pnpm workspace. Video projects use `workspace:*`; generated public packages and standalone projects do not. See [CONTRIBUTING.md](CONTRIBUTING.md) for build prerequisites and [docs/releasing.md](docs/releasing.md) for exact publishing commands. Original code is [MIT licensed](LICENSE); third-party assets retain the licenses listed in [NOTICE.md](NOTICE.md).

## Your first video in ten minutes

```bash
mkdir videos/hello
cp videos/_template/package.json videos/_template/tsconfig.json videos/hello/
cp -R videos/_template/src videos/hello/
cd videos/hello                                # then set "name" in package.json
pnpm install
pnpm preview                                   # studio at http://127.0.0.1:4321
```

Open `src/index.tsx`. The template demonstrates the complete pattern:

1. **`defineScenes`** owns time. `{ hook: { seconds: 2.5 }, proof: { seconds: 4, transition: { type: "fade", duration: "0.4s" } } }`
   gives `scenes.total`, `scenes.start("proof")`, `scenes.cuts()`. Pass it to `<Composition scenes={…}>` and render with
   `<Scenes plan>`. Never hand-sum starts; every timing prop takes frames or `"1.2s"`.
2. **Scenes are components.** `useFrame()` inside a scene is local. Anything on screen is a function of it.
3. **One `<Score/>`** at the root holds the sound: a `<Drone>` bed, a `<Pattern>` motif on the scene's start frame, a
   `<Thump>` on the cut, a `<Duck>` under the end card. Cues are elements, so they live next to what they score.
4. **`data.ts`** holds every number and string the copy uses. **`theme.css`** holds tokens on a root class.

Then iterate:

```bash
pnpm still -- --scene hook                     # first, middle, last frame of a scene → out/stills
pnpm exec clapper still src/index.tsx -c spot --scene proof --every 10
pnpm review                                    # out/review/spot/: contact-sheet.png, cut-*.png, spectrogram, lint, brief.md
pnpm render                                    # out/spot.mp4
pnpm exec clapper render src/index.tsx -c spot@9:16   # the template registers a 9:16 variant; useFormat() restages
```

Read `out/review/spot/brief.md`: it has the scene table, what each file shows, the lint results, and a reviewer prompt.
Hand that folder to a reviewer (a subagent works well: creative director, audio director, feed strategist), apply the
frame-referenced fixes, re-render, repeat. Two or three rounds is typical for showcase-grade work.

## Rules that keep renders deterministic

- Everything on screen is a pure function of `useFrame()`. No wall-clock time, timers or `Math.random` (use `useRandom`,
  `noise1d`). The lint flags violations.
- A composition that throws fails the render, and the error names the scene and local frame.
- Give every hard-cut scene something on screen at local frame 0 (an eyebrow, a rule, a caption box). The lint flags
  blank and flat first frames.
- Sounds register while their sequence is mounted; the renderer visits every frame, so that is fine.

## Layout

| Path | What |
| --- | --- |
| `packages/core` | `@archastro/clapper-core`: runtime, audio DSL, sketch primitives, `@archastro/clapper-core/rigs` (Person, Scribble), `/latex`, `/player` (studio), `/harness`. |
| `packages/cli` | `@archastro/clapper`: the `clapper` command, renderer, offline synth and mixer, review kit and lint, doctor. `test/` has the unit tests, `review-check.mjs` (lint fixture), `studio-check.mjs`, `dom-probe.mjs`. |
| `videos/_template` | Starter project: scenes, score, data, theme, scripts, a 9:16 variant. |
| `videos/showcase` | Ledger, Orbit, Nimbus (agency spots), ArchDev v1/v2 (character film with a continuous score), ArchDev v3 (rage-comic cut). `README.md` has the review scores per round. |
| `videos/intern-promo` | The tryintern.dev promo (57 s). |
| `videos/archdev-site` | ArchDev product-page compositions (hero, plans, prs). |
| `docs/` | `friction-log.md` (what hurt and what was built for it), `archdev-audio-audit.md` (measured before/after of the audio engine). |
| `CLAUDE.md` | The working rules for agents in this repo. |

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
   (`clapper review` flags near-black frames after a cut).
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
   is a filtered-noise pad that swells like breathing (wave `"breath"`). `clapper cues <entry> -c <id>`
   prints the cue inventory; `clapper review` writes short-term loudness around every cut. A cue starts at the enclosing
   sequence's start + `at`. The studio plays cues live (Web Audio); the renderer synthesizes tones offline in Node,
   sums them into one track, and mixes file cues with ffmpeg (`adelay`/`afade`/`amix`).
6. **Text & SVG.** `<Typewriter/>` (+ `typedLength()` to sync clicks), `<SplitText by="word|char|line"/>`, `<Counter/>`,
   `<Draw>` (stroke-dashoffset reveal of every shape inside), `useBlink()`. `<Latex>` from `@archastro/clapper-core/latex` (KaTeX).
   Display-copy primitives: `<Reveal at from skew exitAt>` (masked line reveal), `<Copy x y align size plate>` (positioned
   line with an optional backing plate), `<Eyebrow>`, `<Rule>`. They tag the DOM with `data-copy`, which is what the review
   lint measures for safe-area and overlap.
6b. **Characters.** `definePoses({ typing: {...}, lookUp: {...} })` for typed named poses; `usePose(POSES, [{ at: 0, pose: "typing" },
   { at: "0.8s", pose: "lookUp", ease: "outBack", arc: 24 }], { arcChannels: [["lhx","lhy"],["rhx","rhy"]] })` blends channels
   per frame and, when a key sets `arc`, lifts the hand targets through a midpoint so travel curves instead of sliding.
   `ik2()` is two-bone inverse kinematics with an outward elbow; `useEyeBlink()` / `useBreath()` are deterministic idle motion.
   `<Bubble x y kind="speech"|"thought" tail at exitAt>` pops a bubble from its tail tip. `evalPose()` is the pure blend behind `usePose()`.
   Two characters ship in `@archastro/clapper-core/rigs`: `<Person pose>` (the monoline developer, with `PERSON_POSES`, `usePersonPose`,
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

`clapper render <entry> -c <id> -o out.mp4 [--scene plan] [--draft] [--concurrency 4] [--scale 2] [--range 0-90] [--codec h264|h265|vp9|prores] [--crf 17] [--image-format png|jpeg] [--transparent] [--mute] [--props '{"title":"x"}']`

- `clapper render <entry> -c <id> --transparent -o out/overlay.mov` preserves transparency using ProRes 4444.
  With no `-o`, the output defaults to `out/<id>.mov`. This automatically selects PNG capture and ProRes;
  explicit JPEG, other codecs, or non-MOV outputs are rejected. Leave the composition background transparent:
  this preserves existing alpha, including partial opacity, but does not remove painted backgrounds.
  Audio is preserved. Ordinary renders retain their existing settings.
  Verify the full capture/encode/mux path with `node --test packages/cli/test/transparent-check.mjs`
  (requires Chromium, FFmpeg, and ffprobe).
- `--scene <name>` renders one scene of a `defineScenes` plan; `--draft` is half resolution, CRF 28, veryfast, for iteration.
- `clapper still <entry> -c <id> --scene review` writes the first, middle and last frame of the scene; `--frame 12,40` is
  scene-local when `--scene` is given; `--every 30` samples across the scene or `--range`.
- `clapper compositions <entry> [--json]` lists compositions with their scene maps.
- `clapper doctor [<entry|dir>]` checks Node, Chromium, ffmpeg (libx264, aac, the filters the review kit needs) and React/core resolution.
- A composition that throws names the scene and local frame: `Composition threw while rendering frame 406 in scene "review" (local frame 2)`.

- Bundles `.clapper/harness/` with Vite (React plugin, `public/` served, KaTeX/CSS/fonts handled), serves it, opens N
  Chromium tabs, each takes a contiguous frame chunk, calls `window.__clapper.setFrame(n)`, screenshots, and an ordered
  writer streams PNGs into `ffmpeg -f image2pipe … libx264 -pix_fmt yuv420p`. Audio is mixed after, then muxed (AAC).
- A composition that throws makes the render fail with the error, not produce blank frames.
- Uses the managed/source-built FFmpeg or a system encoder with libx264. `CLAPPER_FFMPEG` overrides. Release bundles exclude nonfree builds and include corresponding encoder sources; see [release details](docs/releasing.md).
- Speed: 15–25 fps at 1080p with 4 workers on an M-series laptop. Frames are captured as JPEG q96 by default; `--image-format png` is lossless but PNG-encoding grainy frames is ~5x slower (the screenshot encode, not the page, is the bottleneck).

## Review

`clapper review <entry> -c <id> [--video existing.mp4] [--draft] [--no-lint] [-o dir]` renders (or takes an existing MP4) and writes
`out/review/<id>/`: `contact-sheet.png` (every Nth frame, reading order = time), `cut-NNNN.png` (9 tiles around every scene cut),
`opening-2s.png`, `spectrogram.png`, `waveform.png`, `audio-cuts.txt` (short-term RMS ±1.2 s around each cut, integrated LUFS per
scene), `scenes.json`, `lint.json` and `brief.md` (scene table + a reviewer prompt you can hand to a subagent). Scene cuts come
from the composition's `scenes` plan, or from the top-level named sequences when there is no plan.

Lint rules (exit code 1 on errors): `blank-after-cut` (near-black frame right after a cut while the scene is not), `flat-after-cut`
(only the background is on screen right after a cut: the scene has no instant anchor at local frame 0), `overlap`
(two `data-copy` ink boxes intersect), `safe-area` (copy crosses the 5 % margin), `determinism` (`Math.random`, `Date.now`,
`performance.now`, timers or rAF in the video's sources; append `// clapper-ok` to a line to allow it).
The DOM rules sample three frames per scene where that scene is on screen alone, measure glyph ranges of the innermost
copy elements, and only judge boxes that hold still for three frames, so entrances, exits and wipes are not "collisions".
They only see elements tagged `data-copy` (the core `Copy`, `Reveal`, `Eyebrow` and `Bubble` set it); add `data-copy=""` to your
own headline elements to opt in. The brief says so when a composition has none.

## Studio

`clapper preview <entry>` runs a Vite dev server with HMR and opens an editor:

- **Project** (left): every composition with a live thumbnail, plus the scenes of the selected one (click to jump, double-click to loop).
- **Viewport** (centre): the composition at fit / 25–200 %, with a HUD (timecode, frame, scene + local frame) and overlays:
  safe area and title-safe (`s`), thirds (`g`), and the measured boxes of every `data-copy` element (`c`), the same boxes the
  review lint judges.
- **Timeline** (bottom): a ruler with timecode, a scenes lane from the composition's plan, sequence lanes by nesting depth, and
  one lane per audio kind (files, bus ducks, pluck, epiano, sine, noise…) with each cue's gain envelope drawn inside its block.
  Drag anywhere to scrub (snaps to cuts; hold ⌥ to disable), click a block to select and jump, double-click to loop it,
  ⌘/Ctrl + wheel to zoom around the cursor, `-` `=` `0` to zoom and fit. The playhead stays in view while playing.
- **Inspector** (right): the selected sequence or cue (timing, pitch as a note name, ADSR, space, colour, gain and cutoff charts,
  spec JSON, a ▶ preview button that plays the cue through Web Audio); the **cues** tab lists every cue; the **scratch** tab is a
  TSX editor compiled in the browser with Babel: `⌘/Ctrl + Enter` registers the exported `Scratch` component (and optional
  `meta`) as a composition named `scratch`, so you can write a snippet and scrub it without touching the project.
- **Transport**: play / pause (`space`), shuttle (`j` reverse, `k` pause, rate menu), frame step (`←` `→` or `,` `.`, `⇧` ×10),
  cuts (`[` `]`), in / out / clear range (`i` `o` `x`), loop (`l`), mute (`m`), a frame field and timecode.
  Cue previews and playback use the studio's Web Audio approximation of the offline synth; ducks apply in the render only.

`packages/cli/test/studio-check.mjs` drives the studio headlessly (screenshots, playback, overlays, a scratch compile) against
`clapper preview … --port 4399`.

## Extending

It is all React: publish a package of components/hooks that use `useFrame()`/`useTimeline()` and it works in any video.
`@archastro/clapper-core/latex` is the reference "extension" (kept as a subpath so KaTeX loads only when imported).
Things that need to block a frame until ready use `delayRender()`. Things that make sound register through
`getRegistry().audio` (see `audio.tsx`).

## Tests

`pnpm test` — unit tests for interpolation, springs, keyframes, camera, typewriter timing, PRNG, frames/scenes/IK, and the offline synth.
`node packages/cli/test/review-check.mjs` renders `packages/cli/test/fixtures/lint` (four planted defects) and asserts the review lint reports all of them.
`videos/intern-promo`'s `smoke` composition exercises the whole pipeline (fonts, KaTeX, SVG draw, camera, springs, audio):
`pnpm exec clapper render src/index.tsx -c smoke`.

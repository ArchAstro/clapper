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
2. **Sequences shift the clock.** `<Sequence from={30} durationInFrames={90} name="intro">` makes `useFrame()` return 0 at
   absolute frame 30 and unmounts children outside its range (`keepMounted` to keep them). `<Series>`, `<Loop>`, `<Freeze>`,
   and `<TransitionSeries transition={{type:"fade"|"slide"|"wipe"|"zoom"|"blur", duration}}>` build on it. Named sequences
   show up as tracks in the studio. Transitions overlap, so size the composition with `transitionSeriesLength(items, default)`
   or you get blank tail frames. On a hard cut (`type:"none"`), make sure the incoming scene has something on screen at its
   local frame 0 (a rule, an eyebrow, a static frame); masked reveals that start at 0 leave the first 4–8 frames empty.
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
   long cue across scene cuts (put beds in a root-level `<Score/>` so they never restart at a cut). `agenticvids cues <entry> -c <id>`
   prints the cue inventory; `videos/showcase/scripts/audio-cuts.mjs` prints short-term loudness around cuts. A cue starts at the enclosing
   sequence's start + `at`. The studio plays cues live (Web Audio); the renderer synthesizes tones offline in Node,
   sums them into one track, and mixes file cues with ffmpeg (`adelay`/`afade`/`amix`).
6. **Text & SVG.** `<Typewriter/>` (+ `typedLength()` to sync clicks), `<SplitText by="word|char|line"/>`, `<Counter/>`,
   `<Draw>` (stroke-dashoffset reveal of every shape inside), `useBlink()`. `<Latex>` from `@agenticvids/core/latex` (KaTeX).
7. **Media & readiness.** `<Img/>`, `<Video/>` (currentTime driven by the frame), `useFont()`, and `delayRender()/continueRender()`
   for anything async: the harness waits for all handles, fonts and images before capturing a frame.
8. **Determinism helpers.** `useRandom(seed)`, `random()`, `noise1d()`.

## Renderer

`agenticvids render <entry> -c <id> -o out.mp4 [--concurrency 4] [--scale 2] [--range 0-90] [--codec h264|h265|vp9|prores] [--crf 17] [--image-format png|jpeg] [--mute] [--props '{"title":"x"}']`

- Bundles `.agenticvids/harness/` with Vite (React plugin, `public/` served, KaTeX/CSS/fonts handled), serves it, opens N
  Chromium tabs, each takes a contiguous frame chunk, calls `window.__agenticvids.setFrame(n)`, screenshots, and an ordered
  writer streams PNGs into `ffmpeg -f image2pipe … libx264 -pix_fmt yuv420p`. Audio is mixed after, then muxed (AAC).
- A composition that throws makes the render fail with the error, not produce blank frames.
- Uses system `ffmpeg` if it has libx264, otherwise the `ffmpeg-static` binary. `AGENTICVIDS_FFMPEG` overrides.
- Speed: 15–25 fps at 1080p with 4 workers on an M-series laptop. Frames are captured as JPEG q96 by default; `--image-format png` is lossless but PNG-encoding grainy frames is ~5x slower (the screenshot encode, not the page, is the bottleneck).

## Studio

`agenticvids preview <entry>` runs a Vite dev server with HMR. Left: compositions. Center: the composition scaled to fit.
Bottom: scrubber with second ticks, sequence tracks (blue), audio cues (amber files, purple tones), play/loop/mute.
URL keeps `?composition=&frame=`.

## Extending

It is all React: publish a package of components/hooks that use `useFrame()`/`useTimeline()` and it works in any video.
`@agenticvids/core/latex` is the reference "extension" (kept as a subpath so KaTeX loads only when imported).
Things that need to block a frame until ready use `delayRender()`. Things that make sound register through
`getRegistry().audio` (see `audio.tsx`).

## Tests

`pnpm test` — unit tests for interpolation, springs, keyframes, camera, typewriter timing, PRNG, and the offline synth.
`videos/intern-promo`'s `smoke` composition exercises the whole pipeline (fonts, KaTeX, SVG draw, camera, springs, audio):
`pnpm exec agenticvids render src/index.tsx -c smoke`.

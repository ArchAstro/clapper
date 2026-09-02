# clapper — friction log and improvement backlog

Written 2026-09-02 at the end of the session that built the framework, the tryintern.dev promo, and four showcase spots.
Frank, terse, for whoever picks this up next. Goal: make building the next video markedly easier than building the last one.

## 1. What was built

1. `packages/core` (`@clapper/core`): frame-deterministic React runtime. Timeline (`useFrame`, `Sequence`, `Series`, `Loop`, `TransitionSeries`), tweens (`interpolate`, `spring`, `Animate`, keyframes, `Stagger`), `Camera`, synthesized sound as React elements (`Tone`, `Chime`, `Whoosh`, `Click`, `Pad`, `Thump`, `Riser`, `Pop`, `Arp`, `Alert`, `Audio`), text/SVG effects (`Typewriter`, `SplitText`, `Counter`, `Draw`), `Latex`, media readiness (`Img`, `Video`, `delayRender`), a render harness (virtual clock, animation sync) and a studio.
2. `packages/cli` (`clapper render | still | preview | compositions`): Vite bundle, Playwright frame capture (JPEG q96), ffmpeg-static encode, offline tone synthesis, mix, loudnorm mux.
3. Videos: `videos/intern-promo` (57 s tryintern.dev promo) and `videos/showcase` (Ledger, Orbit, Nimbus, ArchDev; 22–36 s each; ArchDev is a character film on a monoline rig).
4. Review loop: `videos/showcase/scripts/review-kit.mjs` (contact sheet, cut strips, spectrogram, waveform) + a reviewer subagent briefed as a studio creative director. 2–3 rounds per spot; all five spots ended at SHIP 8–9/10.
5. Numbers: 1080p render at 15–30 fps of output (4 tabs, JPEG capture); a 36 s film renders in ~35 s; 25 unit tests; ~10k lines including videos.

## 2. Friction log

Each entry: what happened → root cause → workaround → durable fix (DONE or PROPOSED).

### 2.1 Compositions were invisible to the renderer
- What: first `render` failed with `Unknown composition "smoke". Known: (none)`.
- Cause: `<Composition>` registers itself when rendered; `registerRoot(Root)` only stored the component. Nothing ever rendered `Root`.
- Workaround: none needed once found.
- Fix DONE: `ensureRootMounted()` mounts `Root` into a hidden div with `flushSync` before listing. Called by the harness and the studio.
- Lesson: registration-by-render is fragile. PROPOSED: `defineComposition({...})` as a plain export plus `registerRoot` accepting an array, so listing needs no React at all.

### 2.2 TransitionSeries overlaps shrank the timeline; compositions ended on blank frames
- What: Ledger was sized to the sum of its scenes (780) but the series ran 750 frames; 30 bone-colored empty tail frames. The reviewer read it as a "dead dark hole".
- Cause: each transition subtracts its overlap from the total; nobody computed that.
- Workaround: hand arithmetic, then `transitionSeriesLength()` (DONE).
- Fix PROPOSED: `<Composition durationInFrames="auto">` when the root child is a `TransitionSeries`/`Series`, or a `useScenes()` helper that owns the arithmetic (see §3, P0-1). Also: warn in the studio when the last N frames render nothing but the background.

### 2.3 Hard cuts landed on masked (empty) type
- What: after a cut, the incoming scene showed 4–8 blank frames because every element used a masked `Reveal` starting at local 0.
- Cause: the DSL makes "everything animates in" the default; nothing forces an anchor at frame 0.
- Workaround: instant anchors (rules, eyebrows, grid) fading over 6 frames; masked reveals for the second beat.
- Fix PROPOSED: `<Scene anchor>` slot rendered without entrance animation, and a lint in the review kit: flag any frame within 8 frames after a cut whose non-background pixel ratio is < 2 %.

### 2.4 PNG capture was the render bottleneck (5x)
- What: Nimbus rendered at 3.3 fps; suspected the SVG glow filters.
- Cause: PNG-encoding a grainy 1080p frame in Chromium costs ~250 ms; JPEG q96 ~40 ms. The page itself was cheap.
- Workaround: measured with `--range` + `--image-format jpeg`.
- Fix DONE: JPEG q96 is the default capture; `--image-format png` remains.
- Follow-up bug: changing the capture default without changing the ffmpeg input decoder (`-vcodec png`) broke every render with `Invalid data found when processing input`. Fix DONE: one `fmt` variable feeds both. PROPOSED: a unit test that encodes two frames end to end for each format.

### 2.5 Grain at CRF 17 cost 30 Mbps
- What: Nimbus came out at 93 MB / 30 Mbps; the other spots at 2 MB.
- Cause: animated noise over near-black defeats x264 at low CRF.
- Fix DONE: per-video CRF in `render:all` (Nimbus 21, ArchDev 20); tiled grain (one 320 px noise tile, reseeded per frame) instead of full-frame `feTurbulence`.
- PROPOSED: `--crf auto` that measures a 2 s probe and picks CRF by bitrate; document "grain → CRF 20–22" in the README (done) and in the CLI help.

### 2.6 pnpm 11 silently skipped postinstall scripts
- What: `ffmpeg-static` exported a path to a binary that did not exist; `[ERR_PNPM_IGNORED_BUILDS]` after every install.
- Cause: pnpm 11 ignores build scripts unless allowed; neither `package.json#pnpm.onlyBuiltDependencies` nor `pnpm-workspace.yaml onlyBuiltDependencies` worked.
- Fix DONE: `allowBuilds: { esbuild: true, ffmpeg-static: true }` in `pnpm-workspace.yaml`. Posted to the team room.

### 2.7 Shell cwd persistence and `cd` prompts
- What: files "vanished" (a `cd dir && cat > file` chain skipped the first file because `cd` failed after the cwd had already persisted there); later a `cd /repo && python3 …` hung for 120 s on a permission prompt.
- Cause: the Bash tool keeps cwd between calls; a `cd` outside the tool's cwd can trigger a permission prompt that blocks.
- Workaround: absolute paths everywhere; never chain the first write behind `cd &&`.
- Fix PROPOSED (workflow): a `videos/*/Makefile` or pnpm scripts for every routine command so nothing needs a `cd`.

### 2.8 review-kit could not resolve ffmpeg from a workspace package
- What: `node scripts/review-kit.mjs` threw `ERR_MODULE_NOT_FOUND` for `ffmpeg-static` (it is a dependency of `packages/cli`, not of the video project).
- Fix DONE: resolve via `createRequire(require.resolve("@clapper/cli/package.json"))("ffmpeg-static")`.
- Fix PROPOSED: make the kit a CLI command (`clapper review-kit`), which owns ffmpeg (see §3, P0-4).

### 2.9 `still` took one frame per bundle
- What: reviewing a scene meant a rebundle + browser launch per frame (~2 s each).
- Fix DONE: `--frame 10,20,30 --out dir` renders many frames in one session; `--image-format jpeg`.
- PROPOSED: `clapper still --every 12` and `--scene <name>` (needs scene registry, §3 P0-1).

### 2.10 Camera evaluator TDZ bug
- What: `Cannot access 'filled' before initialization` on every frame that used `<Camera>`; the render "succeeded" with blank frames.
- Cause: a `map` callback referenced the array it was building.
- Fix DONE: loop instead of `map`; and the harness now throws on the first page error so a render fails loudly instead of producing blank frames.

### 2.11 Scene start arithmetic was wrong in every brief
- What: I told reviewers scene 4 started at 420 when it started at 404; the review-kit cut strips were built at the wrong frames until corrected by hand (three times across four videos).
- Cause: starts are implicit (durations minus overlaps); nothing exports them.
- Fix PROPOSED: `useScenes()` / `scenes.json` emitted by the harness (`window.__clapper.getTracks()` already has named `Sequence` ranges; expose them via `clapper compositions --json`). The review kit should read cuts from there, not from a hard-coded map.

### 2.12 Reviewers found collisions that my stills did not
- What: examples: a relocating calendar block sliding *through* another; a graph edge bisecting a headline for 4 s; a camera push cropping the log panel, then (after the fix) the headline; the "days→hours" roll clipping glyphs; the 12-vs-20-windows inconsistency; the character hidden behind agent windows during the key beat.
- Cause: I looked at 6–12 settled frames per video; the reviewers looked at contact sheets (every 12 frames), 9-tile strips around cuts, and mid-motion frames they chose themselves.
- Fix DONE (workflow): the review kit + reviewer brief. PROPOSED: automate the geometric checks (bounding-box overlap between text elements and other elements; elements crossing the safe margin) in the harness as `clapper lint`.

### 2.13 Audio: mono, synthetic, flat
- Measured on ArchDev before the audio pass: integrated −15.9 LUFS, LRA 4.5 LU, side channel −64 dB (effectively mono), the "blank" scene only 1.5 LU quieter than the chaos scene, all timbres are raw sine/triangle/square/noise with ADSR.
- Cause: the synth is one oscillator + ADSR per cue, summed to mono, no reverb, no stereo placement, no filters, no music layer; "Click" is a 2-frame noise burst.
- Fix PROPOSED (in progress in the parent session): stereo bus, reverb send, Karplus–Strong pluck and 2-op FM piano waves, lowpass + LFO per cue, layered keystrokes, a pattern sequencer for music, per-scene ducking. See §3, P0-3.

### 2.14 Smaller items
| item | what | fix |
| --- | --- | --- |
| Studio track leakage | tracks and cues from other compositions showed in the timeline | DONE: filtered by composition id |
| loudnorm upsampled audio to 96 kHz | `loudnorm` runs at 192 kHz internally and left the output at 96 kHz | DONE: `-ar 48000` after the filter |
| Spring preset strings | `useSpring({config:"wobbly"})` was a type error while `<Animate spring="wobbly">` worked | DONE: `useSpring` accepts preset names |
| `SplitText` and `\n` | newline whitespace collapsed | DONE: renders `<br>` for whitespace containing `\n` |
| Katex in `optimizeDeps.include` | dev server warned it could not resolve `katex` from the video project | DONE: removed from include |
| Contact sheet grid | 8×9 tiles only covered 864 frames; the ArchDev end card was missing from the sheet | DONE: 8×12 |
| `TypeClicks` duplicated per project | the keystroke-per-character helper lives in `intern-promo/src/ui.tsx` and `showcase/src/nimbus/typeclicks.tsx` | PROPOSED: `<Typing>` in core |
| `Copy`/`Reveal`/`Eyebrow` rewritten per project | three copies with drift (plate variant, exit variant) | PROPOSED: core `text` primitives (§3 P1-1) |
| Camera + `Sequence` anchors | keyframe inheritance (unspecified x/y carry over) surprised me once (smoke test) | keep, but document with a diagram |
| Nimbus stats flagged by a reviewer | "p99 · 38 ms" vs 88 ms baseline six seconds later | keep facts in one `data.ts` per video |

### 2.15 Harness limitations worth knowing
- CSS/Web Animations sync: the harness pauses every animation and seeks it to `t - firstSeen`. Workers render contiguous frame chunks, so an animation that started before a chunk boundary gets the wrong offset on that worker. Use `useFrame()` for anything that matters; CSS animations are decoration only. PROPOSED: warm-up seek (render the 30 frames before a chunk without capturing) when `document.getAnimations().length > 0`.
- The virtual clock patches `performance.now`, `Date.now`, `requestAnimationFrame` only. `setTimeout`/`setInterval` still run on wall time; libraries driven by them are non-deterministic.
- `flushSync` render then `settle()` waits for `delayRender` handles, `document.fonts`, images, then two real rAFs. There is no wait for `<video>` decode beyond the `seeked` event.
- Page errors are captured per worker and thrown on the next `setFrame`, so a throw in scene 5 surfaces only when a worker reaches it. Fine for correctness; confusing for progress output.

### 2.16 CLI runs TypeScript natively
- Node 24+ type stripping runs `packages/cli/src/*.ts` directly (no build). Constraints: relative imports need `.ts` extensions, no enums/namespaces/parameter properties, and `import type` only from `@clapper/core` (browser code). This saved a build step but will surprise anyone who adds an enum.

### 2.17 Brand sourcing was manual
- For tryintern.dev and ArchDev I grepped the monorepo for tokens (`--ink`, Everforest hexes), fonts (`next/font` names), logo SVG/PNG, and copy strings, then downloaded Google Fonts CSS and localized the woff2 files with a one-off script.
- PROPOSED: `clapper brand <url-or-dir>` that emits `theme.css` (tokens), `fonts/` (localized), `public/` (logo, OG image), and `copy.json`; even a half-automated version removes 20 minutes per video.

### 2.18 Audio measurements (ArchDev, before the audio pass)
| metric | value | comment |
| --- | --- | --- |
| integrated loudness | −15.9 LUFS | fine (target −16) |
| loudness range (LRA) | 4.5 LU | flat; a film with a silent scene should sit at 8–12 LU |
| true peak | −1.3 dBTP | fine |
| side-channel RMS | −64 dB | mono in a stereo container |
| open / plan / agents / blank / archdev / end | −16.0 / −14.8 / −15.7 / −17.5 / −17.3 / −15.6 LUFS | the "blank" scene is only 1.5 LU under the chaos scene |
| cue inventory | 8 Thump, 6 Pad, 4 Arp, 3 Pop, 3 Chime, 3 Alert, 2 Whoosh, 2 Riser, 2 TypeClicks, 1 Tone, 1 Click | raw sine/triangle/square/noise only |
| keystrokes | 2-frame noise burst through a one-pole lowpass at 1.3–2.4 kHz | reads as "tick", not a key |

### 2.19 Pencil draw-ins only animate strokes (ArchDev v3)
- `<Draw>` animates stroke-dashoffset; a shape's **fill** appears the moment the element mounts. Two captions sharing a position hid each other's text because the second caption's paper fill was on screen from frame 0 while its stroke waited for its cue.
- Fix: components that own a filled shape return `null` before their cue (`Win`, `Caption` in `archdev3.tsx`). Lesson for core: `<Draw>` should hide fills until each shape's stroke starts (proposed: `fill="draw"` option or `hideFillUntilDrawn`).
- How it was found: `packages/cli/test/dom-probe.mjs <entry> <id> <frame>` prints every `data-copy` box with rect/opacity/font at a frame. The text was in the DOM at full opacity, so something above it was painting: that narrowed it to fills in two minutes.

### 2.20 Scene arithmetic, this time
- `defineScenes` paid off immediately: trimming plan (195→175) and agents (255→210) and lengthening review (180→210) between rounds touched one object; captions, the score's per-scene `<Sequence>` wrappers, the review kit's cuts and the reviewers' frame maps all followed.
- Still manual: the stills I asked for after the trim were computed by hand once (1060 > 975). `clapper still --scene tease --every 30` avoids that; use it.

### 2.21 Reviewer subagents, round 2
- Three fresh reviewers (creative director, audio director, X strategist) converged on the same three defects independently (empty first half-second, dead air at one cut, an over-ducked scene), which is the signal to fix rather than debate. The audio director found a real timing bug (duck attack swallowing a paper flip) by measuring peaks per cut, not by listening.
- Give reviewers the scene map and the exact still command; they render 10–60 frames each and cite them. Fresh agents for round 2 avoid anchoring on their own round-1 notes.

## 3. DSL / API improvement backlog

Priorities: P0 = removes a class of bugs or a recurring hour; P1 = makes the next video faster; P2 = nice.

### P0-1 Scenes as first-class objects — DONE (`defineScenes`, `<Scenes>`, `<Composition scenes>`, `compositions --json`, `render/still --scene`)
Owns durations, overlaps, absolute starts, names, and exposes them to sound, copy, review kits, and the CLI.
```tsx
const scenes = defineScenes({
  open:   { seconds: 3.3 },
  plan:   { seconds: 7.3, transition: "hard" },
  agents: { seconds: 8,   transition: "hard" },
  blank:  { seconds: 5,   transition: "hard" },
  archdev:{ seconds: 9,   transition: { type: "reframe" } },
  end:    { seconds: 3.3, transition: { type: "blur", seconds: 0.4 } },
}, { fps: 30 });
// scenes.total, scenes.start("agents"), scenes.local("agents", absFrame), scenes.list()
<Composition id="archdev" durationInFrames={scenes.total} …/>
<Scenes of={scenes}>
  <Scenes.Scene name="open"><Open/></Scenes.Scene>
  …
</Scenes>
```
- `clapper compositions --json` prints `{ id, scenes: [{name, start, end}] }`; the review kit reads cuts from it.
- `render --scene agents` and `still --scene agents --every 6`.

### P0-2 Seconds everywhere, frames underneath — DONE (`Frames` type + `resolveFrames`; Sequence/Series/Loop/Animate/Stagger/keyframes/Camera/Transition/audio/Reveal/Copy)
Every `at`, `duration`, `from` accepts `number` (frames) or `"1.2s"`; `useSeconds()` exists but nobody used it because props did not accept it.
```tsx
<Animate at="0.4s" duration="0.8s" />   <Tone at="1.2s" duration="0.5s" />   <Sequence from="3s" />
```
Implementation: `resolveFrames(value, fps)` in one place; keep frames as the canonical unit.

### P0-3 Music and sound bus (audio v2) — DONE (engine v2; `<Duck>` bus gain applied to tones and files; `breath` wave + `<Breath>`)
- Stereo tone track with `pan`, a reverb send (`space: 0..1`), per-cue `lowpass`, `lfo`.
- New waves: `pluck` (Karplus–Strong), `epiano` (2-op FM), `breath` (filtered noise pad). Retire raw `square` for UI sounds.
- `<Keystroke>` = three layers (click 3–6 kHz, thock 150–400 Hz, tail) with deterministic variation; `<Typing text at cps>` emits them from `typedLength`.
- `<Pattern bpm="84" steps="D3 . A3 . | D4 F4 . A4" wave="pluck" repeat={4} humanize={0.02} />`, `<Chord>`, `<Drone>`.
- `<Duck>`: scene-level gain automation so a "silence" scene is actually 8–10 LU quieter.
- Targets to check in the kit: integrated −16 LUFS, LRA ≥ 8 LU, side channel ≥ −30 dB.

### P0-4 `clapper review` — DONE (kit + brief + lint; `packages/cli/src/review.ts`, fixture test `review-check.mjs`)
One command that renders, builds the kit (contact sheet every N frames, 9-tile strips at every scene cut from P0-1, spectrogram, waveform, loudness table), and writes `review/brief.md` with the scene map so the reviewer prompt is generated, not hand-typed. Optional `--lint`: text-vs-element overlap, safe-margin violations, blank frames after cuts.

### P0-5 Fail loud, name the scene — DONE for render errors (scene + local frame, deepest sequence); delayRender labels still open
Harness errors already fail the render; add the scene name and local frame from the track registry: `Composition threw at frame 406 (scene "4 · reconcile", local 2): …`. Same for `delayRender` timeouts (print the labels).

### P1-1 Core text primitives — DONE (`Reveal`, `Copy`, `Eyebrow`, `Rule` in core with `data-copy` tags; showcase kit re-exports)
`Reveal` (masked line reveal with `from`, `skew`, `exitAt`), `Copy` (positioned display copy with optional plate), `Eyebrow`, `Rule`. All three projects re-implemented them; the plate-before-text bug came from a project copy.

### P1-2 Character toolkit in core — DONE (`definePoses`, `usePose`/`evalPose` with `arc`, `ik2`, `useEyeBlink`, `useBreath`, `<Bubble>`; two shipped rigs in `@clapper/core/rigs`: `Person` and `Scribble`; comic kit in core)
Move `person.tsx` ideas into a generic rig: `definePose()`, typed `Pose` with named poses, `usePose(keys)` with arc-biased midpoints (`arc: 20`), two-bone `ik()`, blink/breath/idle generators, `<Bubble>` (thought/speech). Ship the monoline developer as the first rig.

### P1-3 Studio upgrades — DONE as an editor (project thumbnails, viewport overlays incl. copy boxes, NLE timeline with lanes per depth and per audio kind, gain envelopes, loop range, snapping, inspector with cue preview, cues table, Babel scratch compositions); pose scrubber still open
Cue colors by kind (file/tone/keystroke/music); click a cue to see its spec; markers from P0-1 as a ruler; `M` to jump to the next marker; a pose scrubber (channel sliders) for rig scenes; a "blank frame" indicator on the scrubber.

### P1-4 Render ergonomics — DONE (`--scene`, `--every`, `--draft`); frame cache not done
`--scenes a,b`, `--every N` for stills, `--crf auto`, `--preview-quality` (half-res draft at CRF 28 for iteration), a `.clapper/cache` for unchanged frames (hash of frame DOM is hard; skip until needed).

### P1-5 Determinism docs — DONE (lint rule `determinism` in `clapper review`; README)
Document `useRandom(seed)`/`noise1d` and the virtual clock; add a lint that flags `Math.random`, `Date.now`, `performance.now` in video sources.

### P1-6 Typed poses and named keys — DONE (`PoseKey.at` takes "0.8s", `pose` takes a name, `arc` lifts hand targets)
```tsx
const P = definePoses({ typing: {...}, lookUp: {...} });      // typed keys
usePose([{ at: 0, pose: "typing" }, { at: "0.8s", pose: "lookUp", ease: "outBack", arc: 24 }]);
```
`arc` inserts a biased midpoint for hand targets automatically (the round-2 Orbit and ArchDev notes were both "straight-line travel reads mechanical").

### P1-7 Data files per video — DONE as a convention in `videos/_template/src/data.ts`
`data.ts` with every number and string used in copy and UI (prices, latencies, agent counts). The Nimbus "38 ms vs 88 ms" and Ledger "31 months" reuse came from literals scattered across scenes.

### P1-8 Review-kit lint (geometry) — DONE (`overlap`, `safe-area` on `data-copy` boxes at three frames per scene)
The harness can expose `document.elementsFromPoint` sampling or bounding boxes for elements tagged `data-copy` / `data-hero`. Report: text overlapping another element's box, text outside the 120 px safe area, and elements whose box straddles the canvas edge. This catches 4 of the 12 round-1 findings mechanically.

### P2 Others — format variants (`<Composition formats>` + `useFormat()`), `clapper doctor` and `videos/_template` DONE; `<Video>` audio extraction open
- `<Video>` audio extraction into the mix (today `<Video>` is silent unless paired with `<Audio>`).
- Vertical/square variants: `<Composition formats={["16:9","9:16"]}>` with `useFormat()`; the intern promo would need it first.
- `clapper doctor`: checks Chromium, ffmpeg (libx264/aac), fonts, node version.
- A `videos/_template` project with fonts, theme, kit, review script wired.

## 4. Workflow lessons (driving agents)

1. Reviewer brief that worked: role (studio CD), the kit paths with a legend (tile cadence, strip layout), a scene map with absolute frames, the `still` command they may run, a numbered criteria list, and a strict output format (VERDICT with score, FIX CHECK per prior item, ISSUES as `[scene · frames] problem → exact fix with values`, KEEP). Under 800 words. "SHIP only if you would put your studio's name on it."
2. Round 2+ briefs must list every prior fix so the reviewer verifies instead of re-discovering.
3. Contact sheet every 12 frames + 9-tile strips at cuts is what makes motion reviewable from stills; a settled-frame gallery alone misses overlaps, dead frames, and mechanical arm travel.
4. Never edit the video source while a reviewer is rendering stills; batch fixes between rounds. Rendering more stills yourself is fine.
5. Cadence that converged: my own still pass → round 1 (finds 6–12 issues) → fix → round 2 (SHIP or 1–3 nits) → round 3 only when a transition or beat changed.
6. Things only the image review caught: elements drawn over the character, text clipped by a fixed line box, a headline cropped by a camera push, twelve-vs-twenty copy inconsistency, alert and recovery badges both fully visible, a stat that contradicted itself across scenes.
7. Things the reviewer got wrong: a "asymmetric margins" claim that was symmetric; a "one-frame gap" that was the house style. Verify with math before applying.
8. Post lessons to the team room as they land; three of this session's gotchas (pnpm allowBuilds, PNG capture cost, TransitionSeries overlaps) were worth more than the videos.

9. Review-round history (score per round): Ledger 6 → 6 → 9; Orbit 7 → 8; Nimbus 6 → 6 → 9; ArchDev 6 → 8 → 9. Round 2 usually still fails when round-1 fixes moved a problem instead of removing it (Nimbus camera push: side crop → top crop; Ledger roll: hard clip → soft clip).
10. Give reviewers the ability to render their own frames. Every round they rendered 12–34 extra frames and the decisive findings came from those, not from the kit.
11. Keep the reviewer's frame references: they map straight onto `still --frame` for verification after the fix.
12. Post the "keep" list back into the next brief; it prevents regressions the reviewer would otherwise re-flag as new issues.

## 5. Open questions for the user

1. Commit rendered MP4s (≈30 MB) or keep `out/` ignored and attach renders elsewhere?
2. Is music from real audio files acceptable (licensed loops), or must everything stay synthesized and asset-free?
3. Should the intern promo get a 9:16 variant (needs P2 formats)?
4. Which of P0-1..P0-5 first? Recommendation: P0-1 (scenes) then P0-3 (audio v2), since both feed `clapper review`.

## 6. Checklists (copy into the next video's README)

### 6.1 Before the first render
1. Composition length comes from `transitionSeriesLength()` (or `defineScenes` once P0-1 lands).
2. Every hard-cut scene has a visible anchor at local frame 0.
3. Every cut has a sound hit within ±1 frame; every riser ends on a cut.
4. Copy holds ≥ 1.2 s after its reveal settles; nothing important within 8 frames of a cut.
5. Numbers and names live in one `data.ts`.
6. Text never crosses the 120 px safe area; check the widest string, not the average.

### 6.2 Before calling it done
1. `clapper still --frame <every 12>` and look at the contact sheet yourself first.
2. Review kit + reviewer brief with the corrected scene map; batch fixes between rounds.
3. Measure audio: `ebur128` integrated (−16 ± 1 LUFS), LRA (≥ 8 LU if the story has a quiet beat), side channel (≥ −30 dB), no cue louder than −1.5 dBTP.
4. Encode: CRF 17 for flat art, 20–22 with grain; confirm bitrate < 8 Mbps.
5. Re-render the final and re-run the kit; the last render must be the one reviewed.

### 6.3 Reviewer brief skeleton
```
Role · product · length · style intent · "review only"
Round-N: list of prior fixes to verify (FIXED/PARTIAL/NOT FIXED)
Kit: contact-sheet (every 12 f, 8 cols), cut-XXXX strips (9 tiles, every 3rd frame from cut−10), spectrogram, waveform
Scene map: name · absolute start–end · key beats
Command to render more frames (2 s each) · do not run a full render
Criteria list (type, composition, color, motion, pacing, polish, sound, story)
Output format: VERDICT X/10 · FIX CHECK · ISSUES "[scene · frames] problem → exact fix with values" · KEEP
```

# Sound: one musical arc, concrete mix evidence

For full composition, first read [music.md](music.md). It covers the score DSL, instrument selection, musical timing, animation sync, and studio Music/Code views. ScoreAudio uses the same prepared WAV for studio and export; `render --loudnorm off` preserves its mastered gain. This file covers mix review and synthesized foley.

## Compose an arc before adding cues

1. Define the opening texture, recurring motif, escalation, quiet beat and resolution. Sound should express the story. A larger cue inventory is not a better score.
2. Keep continuous music/air in a root-level `Score()`. Use the scene plan for absolute starts and a shared musical grid. Let phrases and tails bridge ordinary cuts; use hits only where the story calls for impact. Local foley belongs to its action.
3. When reusing scenes, inspect their existing music, alerts and hits. Disable old beds through an existing prop or narrowly refactor before layering a new score; otherwise two scores stack invisibly.
4. Use `Pattern`, `Pluck`, `EPiano`, `Chord`, filtered `Drone` or `Breath` as appropriate. For less synthetic texture, favor a coherent instrument family, restrained reverb, controlled pan and deterministic timing/velocity variation. Check current exports before using newer voices such as `FeltPiano` or `DeskTap`.
5. `Typing`/`Keystroke` provide layered click/body/release; synchronize to the same text, start and speed as the Typewriter. Avoid an identical loud noise click on every glyph. File-backed `Audio` is also valid when suitable rights-cleared assets are available; don't silently acquire paid music or imply synthesis is mandatory.

## Timing and gain traps

1. Cue start = enclosing sequence start + `at`. Automation frames are relative to the cue start; use absolute scene frames directly only when the cue itself starts at absolute zero. Check the current types: audio ADSR/ring parameters may be seconds even though timeline `at`/`duration` numbers are frames.
2. Check pre-laps, tails and risers on the exported mix. A riser should end at its intended impact. No hit is needed at a deliberately continuous cut.
3. `Duck` is a **whole-mix bus gain**, not a selective music sidechain. It affects tones and files, including voice-over/foley. For music-under-voice, automate the music cues themselves. Overlapping ducks multiply.
4. Duck attack begins **before** `at`; the hold ends at the cue's duration/end, then release follows. A long attack can swallow the preceding paper flip. Set explicit duration for a bounded quiet section and inspect both boundaries.
5. An alert stack can mask the punchline even if each cue is quiet individually. Check overlapping chords, bass, percussion, foley and reverb tails together. Preserve a foreground priority.
6. Normalization cannot repair an inverted emotional arc or missing transitions. Compare scenes on the same unaltered export; separately normalizing each scene destroys the comparison.

### Selectively duck music under speech

Current `Tone` and `Drone` expose recorded automation; `Audio`, `Pluck`, `EPiano`, and `FeltPiano` wrappers do not. For an appropriate sustained synth bed, use a cue-local gain envelope:

```tsx
// Root-level cue at absolute 0, 30 fps: ease down before speech at 2s,
// hold through 5s, recover by 5.4s. Gains multiply the base volume.
<Tone freq="D3" wave="sine" at={0} durationInFrames={240}
  volume={0.06} attack={0.1} sustain={1} release={0.3}
  automation={{ volume: [[0, 1], [54, 1], [60, 0.25], [150, 0.25], [162, 1]] }} />
```

Preserve the intended instrument: for a wrapper, mirror its `Tone` parameters and add automation, or adjust discrete note velocities when that suffices. Do not replace a piano score with a sine drone just to use the example. For file-backed music, make a separately gain-processed music asset (preserving start, duration and source alignment) and keep speech separate; an API extension is a larger change to assess explicitly. Do not fake automation with `volume={gain(useFrame())}`: registration stores cue values, not a sampled per-frame gain curve, so offline results can depend on collection order. Remove or retarget the offending whole-mix duck and verify the final export leaves speech intact.

## Audit the exported file

Use `clapper cues` to inspect intent; use the MP4 to inspect what actually reached the listener. Run these serially with other harness commands for that project:

```fish
pnpm --dir "$clapper_project" exec clapper cues src/index.tsx -c "$clapper_id" -o out/cues.json
pnpm --dir "$clapper_project" exec clapper review src/index.tsx -c "$clapper_id" --video out/final.mp4 -o out/review/final
```

Read `audio-cuts.txt`, `waveform.png`, and `spectrogram.png`. Cut analysis samples around scene boundaries; also measure intra-scene trouble spots such as an alert/approval pile-up.

For deeper measurement, resolve Clapper's actual ffmpeg (Fish, `clapper_repo` and `clapper_project` from the entrypoint):

```fish
set -l clapper_ffmpeg (node --input-type=module -e 'import {pathToFileURL} from "node:url"; const m = await import(pathToFileURL(process.argv[1]).href); console.log(m.resolveFfmpeg());' "$clapper_repo/packages/cli/src/ffmpeg.ts")

# Integrated loudness, LRA and decoded true peak.
"$clapper_ffmpeg" -hide_banner -i "$clapper_project/out/final.mp4" -vn -af 'ebur128=peak=true' -f null -
# Stereo side energy; interpret relative to the mid/overall mix, not in isolation.
"$clapper_ffmpeg" -hide_banner -i "$clapper_project/out/final.mp4" -vn -af 'pan=mono|c0=0.5*c0-0.5*c1,astats=metadata=0:reset=0' -f null -
# Mono compatibility: write a listening copy, never replace the final.
"$clapper_ffmpeg" -hide_banner -i "$clapper_project/out/final.mp4" -vn -ac 1 "$clapper_project/out/mono-check.wav"
```

Use a unique mono filename if one already exists. For short problem windows, insert `-ss <start-seconds> -t <duration-seconds>` as input options before `-i`; derive times from the current scene map. Very short-window LUFS/LRA can be misleading; use RMS/peaks plus listening for transients. Check ffmpeg exit status, not merely whether a log was emitted.

| Question | Evidence and interpretation |
| --- | --- |
| Did the final retain its audio? | Decode audio successfully; check duration/channel/sample-rate metadata and listen to opening/middle/end |
| Is overall gain appropriate? | Current local renderer defaults to −17 LUFS, but normalization/limiting/AAC can change the measured result; destination brief wins |
| Is the quiet beat actually quiet? | Relative levels before/after, waveform and listening; earlier fixes achieved about 5.5 LU contrast, not an arbitrary universal minimum |
| Does the climax dominate as intended? | Compare scene values and chord tails; the former tease was accidentally louder than the climax |
| Is it truly stereo and mono-compatible? | Side energy, stereo listening, mono fold-down; a two-channel container alone proves nothing |
| Are impacts clean? | True peak on decoded final, waveform and audition; keep headroom and verify after AAC, not just before encoding |
| Does it sound natural? | Actual audition of timbre, masking, transitions, rhythm and fatigue; plots alone cannot establish this |

Historical goals like −16 LUFS, LRA ≥8 LU, side RMS ≥−30 dB or bitrate <8 Mbps were project suggestions, not quality laws. Use the narrative and delivery brief. Never widen a deliberately intimate mono sound or flatten intentional silence merely to hit a number.

`render --loudnorm <number|off>` exists in the current local CLI. Inspect `--help` before using it elsewhere. The `review` command does not forward every render option; when mix/encoding settings matter, render explicitly then pass `--video` to review. Synthesized Tone cue previews are approximations; ScoreAudio plays the actual prepared WAV. Final combined mix gain can still differ, so audition the exported MP4 for the final judgment. If this session cannot hear audio, report **measured only; listening unverified**, and do not issue unconditional audio SHIP.

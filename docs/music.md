# Scores as code

`@clapper/music` compiles typed musical scores into a deterministic event timeline. The CLI renders each instrument with native sfizz, mixes stems, masters the result to −18 LUFS, and uses that same prepared WAV in the studio and final export. Musical time is quarter-note beats at 960 PPQ, independent of video frames.

## A complete first score

```ts
import { defineScore, phrase, chord, track } from "@clapper/music";

export default defineScore({
  title: "A small waltz",
  tempo: [{ at: 0, bpm: 108 }, { at: 12, bpm: 96 }],
  meter: [3, 4], seed: 17, tail: 3,
  tracks: [
    track("piano", {
      instrument: "vsupright1", gain: 0.6, reverb: 0.4,
      clips: [{ notes: phrase("D5 F#5 A5 F#5 E5 D5", { duration: 0.5 }), length: 3, repeat: 4 }],
      humanize: { timing: 0.006, velocity: 3 },
    }),
    track("strings", {
      instrument: "violin-ens-pizz", pan: 0.25, gain: 0.3,
      clips: [{ at: 3, notes: chord(["D4", "F#4", "A4"], { duration: 1 }), length: 3, repeat: 3 }],
    }),
  ],
});
```

`note(pitch, at, duration, velocity)` uses MIDI pitches 0–127 or note names (`C4` = MIDI 60), with velocity 1–127. `phrase` accepts whitespace-separated notes, `.` rests, `-` ties, and `[C4,E4,G4]` chords; ties extend every member of a chord. `bar(1, [3,4])` is beat zero; `bars(n, meter)` converts constant-meter passages. For meter-changing scores, specify explicit absolute beats in the meter map. Clips support offsets, length, repeats and transposition. `drumPattern` maps `x`/`X` hits to a MIDI drum key at a specified step length.

Tracks support sustain and other MIDI CC events (`controls: [{at, cc, value}]`, 0–127), normalized pitch bends (`bends: [{at, value}]`, −1…1), pan, gain, gain automation, stereo reverb, solo/mute, and seeded timing/velocity variation. The default pitch-bend range is the instrument/engine's range; use appropriate MIDI RPN controllers when changing it. Expressive articulations such as pizzicato or spiccato select distinct SFZ presets; do not assume a patch implements unlisted articulations.

## Commands

```fish
clapper instruments list --family strings --json
clapper instruments install violin-ens-pizz
clapper instruments audition glockenspiel -o out/audition
clapper score validate src/score.ts
clapper score render src/score.ts -o out/score --stems
clapper score export src/score.ts -o out/score.mid
clapper score import existing.mid -o src/imported-score.json
```

In the checkout, prefix with `pnpm --dir videos/<project> exec`, or use `node packages/cli/bin/clapper.mjs` from the repo root. Build prerequisites once: `pnpm install`, then `node scripts/build-sfizz.mjs` (CMake and C++ compiler required only on the build machine). Standalone/npm runtime releases include the native renderer and compiled music package; users do not need CMake or a compiler.

The catalog indexes **75 VSCO 2 CE presets**, pinned to upstream revision `28092772094b2d9f1148d84cea97f4545b8c687d`: strings, woodwinds, brass, keys and tuned/untuned percussion. Downloads are per instrument, with original SFZ/sample filenames, pinned Git content hashes, and the upstream CC0 license. The catalog reports mapped pitch ranges, size and keyswitch presets. The renderer rejects pitches outside the mapped range. Keyswitch patches need their switch notes; the explicit single-articulation presets are easiest for agents. All 75 are catalogued; the showcase exercises piano, violin pizzicato, cello pizzicato, flute and glockenspiel. This is not a claim of individually auditioning every preset.

Samples live under `~/.cache/clapper/instruments`, override with `CLAPPER_INSTRUMENTS`. First use downloads the selected samples; subsequent rendering works offline. `CLAPPER_SFIZZ` can select a compatible renderer for development. The native build is sfizz 1.2.3 with a recorded Clang 21 syntax compatibility patch and correct AArch64 configuration. Its source archive/checksum and patch description travel with standalone releases.

## Attach music to a video

The catalog also includes three curated CC0 rock presets, for **78 total**: `green-guitar`, `little-bass`, and `club-drums`. See `videos/animal-rock/README.md` for pinned sources, adaptation details and a complete original band jam. Tracks can set `preampDb` (−24…48 dB) and `drive` (1…12) for a filtered soft-clipping amp stage; `gain` controls output trim. Unlike a volume boost after mixing, input gain determines how much the samples saturate. Audition/measure the actual source level when setting it.

The studio's **Music** tab displays the configured score beside the film. **Score** shows instrument tracks, a piano roll, the current tempo/meter/beat and a playhead; click a note or section marker to seek the video. **Code** shows the exact source file, read-only. Editing that file rebuilds the audio and refreshes the view. Seeking accounts for the ScoreAudio cue's timeline offset; compositions that do not mount the configured score show that explicitly.

Add `"score": "src/score.ts"` to `clapper.json`, alongside `runtime`, `entry` and `composition`. Then:

```tsx
import { ScoreAudio } from "@clapper/core/music";
import score from "./score";

function Film() {
  return <><ScoreAudio score={score} />{/* scenes */}</>;
}
```

`preview`, `render`, `still` and `review` prepare the score before bundling. Editing source while preview is open rebuilds the score first and reloads the studio after its WAV is ready. Score-edit preparation is serialized. Missing prepared assets fail visibly rather than silently creating a mute film. The generated `.clapper-music` WAVs and `.clapper` caches are ignored by Git and reproducible from source.

Use `compileScore(score)`, `ticksToSeconds`, `secondsToBeat` and markers to align animation or scene plans with music. Place ScoreAudio at the composition root for continuous phrases across scenes. The showcase derives its choreography directly from musical beats, including the final ritardando. For a soundtrack already mastered by this pipeline, use `clapper render --loudnorm off` to preserve that master in the final movie; otherwise Clapper's final mix normalization may change its overall gain.

## Outputs, guarantees and current boundaries

1. `master.wav`, individual track WAVs and MIDI parts, `score.mid` when representable, compiled `score.json`, and a hash/provenance `manifest.json`. WAV stems have track gain/pan/reverb applied but are not individually loudness-normalized. Only the master is mastered.
2. Cache keys include the compiled performance, renderer revision, sfizz executable hash and pinned sample-pack version. Cache hits verify output hashes. Use `--force` to render afresh. On the tested Apple Silicon build, fresh sampled renders are byte-identical, including sustain and reverb; different CPU/engine builds may differ in floating-point output.
3. Internal rendering supports more than 15 melodic tracks by rendering each as a separate SFZ part. A single-port MIDI export supports 15 melodic channels plus percussion. Larger scores emit separate MIDI parts and omit the combined file instead of silently wrapping channels.
4. MIDI interchange preserves notes, tempos, meters, controllers, bends and marker events. Track names carry SFZ IDs when exported by Clapper. Imported external MIDI needs instrument mapping; effects/routing/gain automation are not recovered, and the CLI reports those limitations. The Node MIDI adapter is available separately at `@clapper/music/midi`; the browser-safe composition entrypoint avoids loading the MIDI file parser.
5. This milestone provides per-track mixing and master processing, not a general DAW bus graph, arbitrary plugin hosting, MIDI 2.0/MPE, notation engraving, or a piano-roll editor. Additional SFZ libraries need a catalog/provenance entry; arbitrary external library import is not yet automated.

## Verification and showcase

`pnpm test` covers tick/tempo integration, sub-frame timing, seeded variation, MIDI round-trips, late tempo defaults, chord ties, invalid score rejection and large-score MIDI boundaries. `node scripts/test-music.mjs` checks real sampled rendering, byte repeatability, cache reuse, 16 independent parts and live preview score rebuild.

See `videos/cat-ballet`: **Pas de Chat**, an original 24-bar chamber waltz and a deterministic cat-ballet film. Music and animation are source code, with no stock soundtrack or pre-rendered character video. The final output is `out/pas-de-chat.mp4`; WAV/MIDI/stems are in `out/score-final/`. Independent reviews covered animation frames, musical structure, instrument ranges and audio measurements. Audio audition is not available to the agent environment, so this is not represented as a human listening sign-off.

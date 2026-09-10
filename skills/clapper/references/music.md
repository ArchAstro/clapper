# Original music as code

Compose a musical idea that fits the requested scene or genre, then use the actual rendered performance as the timing source for animation. The score is editable TypeScript, not a stock music file or unstructured pile of sound cues.

## 1. Establish the arrangement

1. Pick a tonal center, meter, tempo, a short motif/riff, phrase length and an arc (entrance → development → contrast → return → cadence). Make repeats develop: vary voicing, register, orchestration, rhythm or dynamics. Don't randomize notes to imitate composition.
2. Choose functional parts: melody/lead, harmonic support, bass, groove, and optional accents. Leave space between parts; more instruments does not automatically improve the music. For an existing video, preserve its timing unless retiming was requested.
3. Discover real instruments with `clapper instruments list --json` (optionally `--family strings`). Read mapped pitch range, articulation, keyswitch status, license and download size. Use exact IDs from the catalog; do not invent guitar/brass voices that are not installed.
4. Prefer explicit single-articulation patches to keyswitch collections. Download/audition only the relevant instruments. An audition command produces audio; it does not establish that the agent can hear it. If the requested instrument is absent, add a verified, appropriately licensed catalog entry or explain the gap; don't silently substitute an unrelated timbre.

## 2. Author the score

```ts
import { defineScore, note, phrase, chord, track } from "@clapper/music";

export default defineScore({
  title: "Small steps", tempo: 108, meter: [3, 4], seed: 17, tail: 3,
  tracks: [
    track("piano", {
      instrument: "vsupright1", gain: 0.6, reverb: 0.4,
      clips: [{ notes: phrase("D5 F#5 A5 F#5 E5 D5", { duration: 0.5 }), length: 3, repeat: 4 }],
      humanize: { timing: 0.006, velocity: 3 },
    }),
    track("pizzicato", {
      instrument: "violin-ens-pizz", gain: 0.3, pan: 0.25,
      clips: [{ at: 3, notes: chord(["D4", "F#4", "A4"], { duration: 0.4 }), length: 3, repeat: 3 }],
    }),
  ],
});
```

1. **Two clocks:** score positions/durations are quarter-note beats (960 PPQ), not video frames. `note("C4", at, duration, velocity)` uses MIDI 60 for C4 and velocity 1–127. `tempo` can be `[{at:0,bpm:108}, …]`; meter can change at explicit beats. Do not round notes to frames.
2. **Phrases:** `.` rests, `-` ties, `[C4,E4,G4]` chords. Ties extend the whole preceding chord and cannot cross a rest. Clips supply offsets, explicit repeat length, repeat count and transposition. `bar`/`bars` helpers assume the meter passed to them; they do not infer later meter changes.
3. **Expression:** use velocity contours and real rests/breaths. `controls: [{at,cc,value}]` supports sustain (64), expression (11) and other controllers, with values 0–127. Pitch bends use −1…1, subject to the patch's bend range. Humanization is seeded and modest, not a substitute for phrasing.
4. **Mix:** tracks support gain, pan, reverb, solo/mute and `gainAutomation: [{at,value}]`. Score automation positions are absolute musical beats; this differs from synthesized Tone's cue-relative frame envelopes. Music-only automation is preferable to whole-mix `Duck` under dialogue.
   For a guitar/bass amp sound, `preampDb` sets input gain and `drive` controls soft clipping; track `gain` trims the output. Measure the source level first: a large drive number on a quiet sample can still produce a clean, buried solo. The rock showcase uses calibrated input boost with a lower output gain. Validate actual key coverage, not just a preset's lowest/highest note—its first guitar mapping had a missing C4 between otherwise valid neighbors.
5. **Bounds:** ensure score length covers notes, clips and controller releases; add an explicit audio tail. Check every transposed note against the chosen instrument. The cat-ballet review found 14 silent violin notes below the patch's lowest key—raising the part one octave fixed both audibility and register separation.

## 3. Render and connect to picture

Commands run in the video project; in a checkout use `pnpm exec clapper` or the CLI's absolute path.

```fish
clapper instruments audition glockenspiel -o out/audition
clapper score validate src/score.ts
clapper score render src/score.ts -o out/score --stems
clapper score export src/score.ts -o out/score.mid
clapper score import existing.mid -o src/imported-score.json
```

Add `"score": "src/score.ts"` to the existing `clapper.json`, preserving its runtime, entry and composition. Import the score in React and mount `<ScoreAudio score={score}/>` from `@clapper/core/music` at the root of the composition. `preview`, `render`, `still` and `review` then prepare its audio automatically. A bare `score render` writes its output directory; it does not itself attach the WAV to the film.

Use `compileScore(score)`, `ticksToSeconds`, `secondsToBeat` and score markers to derive scene lengths, choreography, strums or drum strikes. Instrument performance should drive visible action: animate the drummer from actual drum onsets, not a generic wiggle. Account for ScoreAudio's offset when converting between score and film time.

Render outputs include mastered `master.wav`, processed but individually unnormalized track stems, MIDI parts, compiled JSON and a provenance/hash manifest. The default music master is −18 LUFS. Use `clapper render --loudnorm off` when preserving this already-mastered score; when adding speech/foley, judge the final combined mix and choose final normalization deliberately.

## 4. Use the studio's Music tab

1. Run `clapper preview` and open its URL in the user's main Chrome profile for handoff. `?panel=music` opens the Music inspector directly.
2. **Score:** select a track, inspect the piano roll, tempo/meter/current beat, note velocities and instrument. Click a note or marker to seek the video. The playhead follows the video and accounts for the score cue's offset.
3. **Code:** view and copy the exact configured source. It is read-only; edit the local file to change the composition. Preview rebuilds audio before reloading, and the Music tab stays selected.
4. If no score is configured, fix `clapper.json`. If the configured score is not mounted in the selected composition, mount ScoreAudio or select the right composition; don't treat disabled seeking as a broken renderer.

## 5. Review like music, not just audio plumbing

Use the specialist loop in [review.md](review.md), with both musical and signal evidence:

1. Inspect motif development, harmonic movement, bass/chord/lead agreement, voicing/register separation, rhythmic pocket, phrase lengths and the ending. A note in the wrong register may be silent; a decorative bell can clash with a chord even when the meter reads clean.
2. Inspect stems around transitions, repeated notes, sustain releases, changes in instrumentation and final tails. Confirm the mastered/exported file has audio and appropriate headroom. Don't normalize each section separately to compare dynamics.
3. Actually audition when audio input/playback assessment is available. Otherwise state **score-based and measured review; listening unverified**. A waveform or successful `audition` command is not a listening verdict.
4. Verify fixes on the final exported movie and musical assets. Preserve the final source/manifest and return the MP4, WAV, MIDI and score source links. Scores above one MIDI port's capacity render as independent parts; don't claim the combined `.mid` contains unlimited tracks.

References: `videos/cat-ballet/src/score.ts` for chamber orchestration and beat-driven choreography; `videos/animal-rock/src/score.ts` for an original three-piece riff/solo/breakdown arrangement and note-driven playing gestures. For complete current API details, read `docs/music.md` when the checkout is available. This guide remains usable without that checkout. The sampled renderer currently uses catalogued SFZ presets; arbitrary plugin hosting, MIDI 2.0/MPE, notation engraving and live note editing are not implied capabilities.

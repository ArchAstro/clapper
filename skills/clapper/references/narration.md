# Local voice narration

Clapper uses an optional Kokoro 82M v1.0 quantized CPU model. Model weights and the
inference runtime are **not bundled or downloaded during normal installation**.
`clapper voices install` installs them in a separate user cache (roughly 500 MB
installed, including the 88 MiB model). No API key or Python environment is needed.
Inference is offline after installation. The initial supported presets are English
US/UK voices; this backend does not clone voices.

## Choose and lock the cast

```fish
clapper voices list --json
clapper voices install
clapper voices audition af_heart -o out/voices/heart
clapper voices audition am_michael -o out/voices/michael
```

Listen to `master.wav` in each audition directory before choosing. Define every
narrator once in a central script. Scenes reference narrator IDs, never independent
voice prompts or per-cue voice/speed settings.

```ts
// src/narration.ts
import { defineNarration } from "@archastro/clapper-core/narration/models";

export default defineNarration({
  title: "A connected story",
  narrators: {
    host: { voice: "af_heart", speed: 1 },
    guest: { voice: "am_michael", speed: 1 },
  },
  cues: [
    { id: "opening", narrator: "host", text: "Every scene tells part of the story.", at: 0, duration: 5 },
    { id: "reply", narrator: "guest", text: "And every character has a voice.", at: 5, duration: 5 },
    { id: "closing", narrator: "host", text: "Together, they bring the story to life.", at: 10, duration: 5 },
  ],
});
```

`at` and `duration` are **seconds**, independent of score beats and video frames.
Use `SCENES.start("name") / FPS` when aligning to a shared scene plan. `duration` is
the available speech window; silence pads shorter speech. Windows cannot overlap.
Split long copy into sentences. Exceptionally long sentences that exceed the
model's phoneme token limit fail before synthesis rather than silently losing text.

```fish
clapper narration validate src/narration.ts
clapper narration lock src/narration.ts
clapper narration render src/narration.ts -o out/narration
```

Commit `clapper-voices.lock.json` alongside the script. This records the model
revision, quantization/backend identity, pinned npm dependency lock, voice embedding
checksums, narrator mapping, and speaking speed. Preview/render refuse a missing or
changed lock. Changing text or timing needs no relock. To intentionally change the
cast or delivery, audition it, edit the central narrator definition, run `narration
lock` explicitly, and review all scenes using that narrator. Never automatically
relock to work around a mismatch. `--force` regenerates takes but cannot bypass the
cast lock.

## Put speech in scenes

Add `"narration": "src/narration.ts"` to `clapper.json` (alongside `score`, if used).
The CLI prepares narration before preview, render, still, review and cue inspection;
preview rebuilds prepared audio on source changes.

```tsx
import { NarrationAudio } from "@archastro/clapper-core/narration";
import narration from "./narration";

// At the composition root: plays the complete script on its declared timeline.
<NarrationAudio script={narration} volume={0.9} />

// Alternatively, inside an individual scene: plays only this cue at scene-local zero.
<NarrationAudio script={narration} cue="reply" at={0} volume={0.9} />
```

Choose one placement approach; don't play both the root script and scene cues.
The enclosing scene/composition must contain the whole selected window. A take
that exceeds its window fails with the measured duration: shorten the copy or
extend the window and scene plan. The CLI never truncates speech or changes speed
automatically to fit. Inspect `out/narration/manifest.json` for actual take durations.

## Consistency and review

1. Every scene uses the same pinned voice embedding and speed for a narrator.
2. Unchanged text/cast reuses the exact cached PCM take, even after timing edits.
   Corrupt audio is detected by checksum and regenerated. Takes live under
   `.clapper/narration/takes`; prepared public WAVs are ignored by Git.
3. Model/tokenizer downloads use immutable revisions and verified checksums;
   inference disables remote model access. The optional runtime uses a shipped npm
   lock with package integrity hashes and installs with dependency scripts disabled.
4. These controls prevent configuration drift. They do **not** guarantee identical
   perceived prosody across different text or bit-identical regeneration on every
   CPU/Node version. Listen to the narrator's opening, return, and closing lines
   together; revise punctuation/copy consistently and avoid repeated random retakes.
5. Audition the exported mix for pronunciation, missing words, cadence, scene joins,
   and intelligibility over music. Numeric duration/peak checks cannot prove speech
   quality or completeness. Keep score volume below dialogue; there is no automatic
   music ducking in this release.

`CLAPPER_VOICES` overrides the optional runtime/model cache root. A clean machine
needs `clapper voices install` before rendering a locked script. Missing/corrupt
model assets produce an explicit setup error; there is no system-voice or cloud
fallback. Use the same script and committed lock on every machine. JSON scripts
are also supported; TypeScript scripts export default or named `narration`.

Model: [Kokoro ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX).
Engine and voice embeddings: [Kokoro.js](https://github.com/hexgrad/kokoro/tree/main/kokoro.js).
Both are Apache-2.0; installed packages retain their licenses. See the catalog and
runtime lock under `packages/cli/assets` for the exact pinned artifacts.

Development verification: `pnpm test:narration` runs the real optional install,
two-voice synthesis, cache/lock/error checks, and a scene-local MP4 export with
non-silent audio assertions. It retains artifacts under `.clapper/narration-test-*`.
The initial live verification was on macOS Apple Silicon; other hosts are not
covered by that run.

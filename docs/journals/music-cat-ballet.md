# Music as code + cat ballet

## Objective and settled design
Ship a reusable typed score API, SFZ/sfizz sampled-instrument renderer, MIDI interchange, agent instrument discovery/audition and cached stems integrated with Clapper. Prove it with an original, polished cat ballet film and musical score.

Use existing scene plans, Audio file playback, ffmpeg mixing, native runtime packaging, and the Clapper visual/audio review loop. Music owns ticks/beats independent of video frames. CC0 samples only for the bundled starter. No alternate ad-hoc synthesizer, invented licenses, hidden music downloads or claims of listening without audio evidence. Do not publish, push or modify unrelated projects.

## Work units
- [x] T1: pin native sfizz and 75 CC0 presets; render/measure five representative patches (audio audition unavailable).
- [x] T2: typed score DSL/compiler, tempo/meter/controls/seeded expression, MIDI interchange and 13 musical-clock/validation tests.
- [x] T3: instrument CLI, verified per-instrument installs, score/stems/cache, native and npm package integration, shared preview/export audio and live rebuild proof.
- [x] T4: original 24-bar waltz and cat rig; final 1920x1080 film rendered.
- [x] T5: independent visual and score/measurement-based audio reviews pass; final MP4/MIDI/WAV/stems and docs delivered. Listening audition is explicitly unverified because the environment cannot receive audio.

## Gates and pacing
Complete one bounded work unit at a time; journal evidence here after each. Work continuously, no arbitrary sleeps. Tests must cover tempo mapping, note lifetimes, deterministic humanization, MIDI roundtrip, file/render errors and actual sfizz output. Final export must match reviewed source/score and include intact stereo audio. Scope review to the agreed feature and film; distinguish listening limitations from measured evidence. Preserve existing APIs. Clean up owned preview processes. Stop only when all deliverables/gates are satisfied or a concrete external dependency prevents further progress after safe alternatives.

## Progress
- Follow-up: added a Music inspector tab with per-track piano roll, note/marker seeking, tempo/meter/beat readout, and read-only source. Read-only endpoint exposes only the configured score; no request-controlled file paths. Browser tests cover source display, seeking, refresh after TS edits, and unsupported POST. Isolated Vite caches now live under each project's .clapper directory, so projects sharing dependency links cannot invalidate one another's optimized dependencies.
- Started: clean worktree at 36695ea. Existing Pattern rounds to video frames; new musical compiler will not. No sfizz/cmake installed; checking a pinned native build. Planned film: a warm miniature theatre, cream cat, original chamber waltz, expressive poses and music-linked steps.
- Native renderer: sfizz 1.2.3 source SHA256 a9339eac7620d7f0f6b44bdfe860680fab73e66efad4b5f15b21198dd9436822. Native ARM64 build fixed by selecting AArch64 spelling (avoids ARM32 flags) and correcting four non-template atomic_queue calls rejected by Clang 21. Build recipe records these changes.
- Catalog: VSCO 2 CE revision 28092772094b2d9f1148d84cea97f4545b8c687d, 75 SFZ presets, original CC0 license and sample Git hashes. Selected five patches total about 243 MiB; not every preset individually auditioned.
- API review fixed: whole-chord ties; initial default tempo/meter on imported MIDI; more than 15 melodic parts render independently; source edits rebuild audio before preview reload. Pitch bend encode/decode boundary corrected and tested.
- Real rendering proof: byte-identical independent sfizz+reverb/master renders, cache integrity and 16 instrument parts pass. Live browser score-edit/reload proof passes. Browser-safe score entrypoint split from Node MIDI adapter to avoid CJS module interop failure.
- Musical review corrected 14 below-range violin notes, three bell clashes, flute phrasing and reverb. Final score has 440 in-range notes. Encoded soundtrack: −18.0 LUFS, −4.4 dBTP, LRA 3.0 LU. Agent cannot hear audio; score/measurement review only.
- Visual review: final centering/pose transitions/arabesques/turn orientation/forward bow pass. Remaining stylistic limits: flat illustrative turns and simplified footwork. Reviewer inspected 47 independently selected final frames.
- Final film: videos/cat-ballet/out/pas-de-chat.mp4; source score and cached final WAV/stems/MIDI in out/score-final. Final review lint: zero errors/warnings, 18 copy boxes across 15 sampled frames. Packaging verification and final handoff remain.
- Packaging verified: v0.3.1-dev.1 Apple Silicon standalone, actual npm global install and npx tarballs pass. Installed launcher discovers all 75 presets and renders a TS score with fresh glockenspiel samples. Runtime manifests rewrite internal workspace dependencies to versions, while the project uses portable file dependencies.
- Final SHA256: MP4 a0aeaf605a8ca22eeba9f774074dab7e79b8b05732c209129744c3563224e4f6; mastered WAV dfd79f9776fbf9291c5822f13143cb4318175aa9d34457e65cbc299e8f07e67e. Workspace typechecks and 56 JS tests pass; Go race tests pass. No publication or push performed.
- Final preview correction: full-reload replaces Vite's usual HMR handling, so the module graph must be invalidated before reload. The stronger TS-edit test asserts the browser registry references the new audio asset, not only that the page loaded. Three consecutive TS edit/reload runs pass. Final MP4 opened in the user's main Chrome profile. No background preview servers retained.

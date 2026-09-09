# Provenance and superseded advice

This skill was distilled on 2026-09-09 from local Claude Code records, checked against the current Clapper source. The repository began as `agenticvids`; searching only a `clapper` session directory misses its history. Raw transcripts stay local and are not bundled into the skill.

## Primary records

1. Main session `eb7a0f0d-0892-49fc-8ffd-46e64552b083`, stored under `~/.claude/projects/-Users-calvin-projects-agenticvids/`. Relevant messages run 2026-09-02 through 2026-09-03 UTC. It records the original framework, showcase critique/fix rounds, audio audit, v2/v3, rename and move, then the v4 recut.
2. Reviewer `agent-a7e7f88408d6c3bda`, in that session's `subagents/`: 2026-09-03 v4 intro/outro brief, independently rendered frames and final critique.
3. Repository corroboration: `docs/friction-log.md`, `videos/showcase/README.md`, `videos/showcase/docs/archdev-audio-audit.md`, actual example source and CLI/runtime implementations.

## Findings retained

| Record | Evidence | Skill consequence |
| --- | --- | --- |
| Sept 2, 04:31–05:36 | Ledger 6→6→9; Orbit 7→8; Nimbus 6→6→9; author accepted results | Self-chosen reviewer frames, cut strips, re-review after fixes; second-round fixes can move a crop rather than remove it |
| Sept 2, 13:14–13:32 | Windows/paper hid the main acting beats; desk jumped across a wipe | Inspect occlusion and spatial continuity through motion |
| Sept 2, 15:18–15:32 | User liked picture but requested better keyboard/music; audit found nearly mono, bass-heavy, flat mix | Improve timbre and narrative dynamics using measurements plus audition, not just more cues |
| Sept 2, 15:38–16:07 | User called transitions clunky; per-scene beds produced a −54 dB hole then −9 dB slam; root score resolved it | Continuous score, shared timing, pre-laps/tails, selective hits |
| Sept 2, 15:55 review reports | Audio critic measured tease louder than climax and stacked alerts; visual critic praised the same ending | Separate domain expertise, verify claims, don't treat majority or a score as proof |
| Sept 2 v3, corroborated by friction log §2.21 | Fresh reviewers converged on opening dead time, cut dead air and over-ducking; duck attack swallowed paper flip | Measure both sides of duck boundaries and preserve prior fixes in later rounds |
| Sept 3, 20:35–20:49 | V4 reviewer found email touching bottom border; parent fixed it, but disproved missing-whoosh claim | Inspect final held frame; independently validate reviewer diagnoses |

## What was deliberately not promoted to a rule

1. Old backlog examples include speculative APIs (`Scenes of`, `useScenes`, proposed CLI flags). Current template and exported types are authoritative.
2. Old checklists said every cut needs a hit. Later successful sound design kept only motivated hits and let music span other cuts.
3. −16 LUFS, ≥8 LU LRA, ≥−30 dB side RMS and <8 Mbps were historical project targets. The shipped audit itself reports worthwhile improvements without meeting every target; they are not universal quality gates.
4. A reviewer score does not prove awards or virality, and an author's final summary is not proof that all final changes received independent review. The skill closes that gap with artifact provenance and final checks.
5. Current CLI defaults to −17 LUFS and exposes `--loudnorm`; these differ from older README language. Local `archdev5`/audio modifications were already dirty at authoring time, so they are optional current examples, not session-proven releases.
6. Source inspection adds one operational safeguard: `bundle.ts` uses a fixed per-project build directory and CLI commands remove it. Parallel reviewer rendering needs isolation or serialization even though historical reviewers ran in parallel.
